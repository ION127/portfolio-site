# AWS에 요청하지 않는다(mock provider). 실행: terraform -chdir=infra/bootstrap test

mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }

  mock_resource "aws_s3_bucket" {
    defaults = {
      arn = "arn:aws:s3:::portfolio-tfstate-123456789012"
    }
  }

  mock_resource "aws_iam_openid_connect_provider" {
    defaults = {
      arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
    }
  }
}

override_resource {
  target = aws_iam_role.github["plan"]
  values = {
    arn = "arn:aws:iam::123456789012:role/portfolio-gha-plan"
  }
}

override_resource {
  target = aws_iam_role.github["deploy"]
  values = {
    arn = "arn:aws:iam::123456789012:role/portfolio-gha-deploy"
  }
}

variables {
  budget_email = "alerts@example.com"
}

run "state_bucket" {
  command = apply

  assert {
    condition     = aws_s3_bucket.state.bucket == "portfolio-tfstate-123456789012"
    error_message = "상태 버킷 이름은 portfolio-tfstate-<계정ID>여야 한다"
  }

  assert {
    condition     = one(aws_s3_bucket_versioning.state.versioning_configuration).status == "Enabled"
    error_message = "상태 버킷은 버전 관리를 켜야 한다(상태를 잃지 않도록)"
  }

  assert {
    condition = alltrue([
      aws_s3_bucket_public_access_block.state.block_public_acls,
      aws_s3_bucket_public_access_block.state.block_public_policy,
      aws_s3_bucket_public_access_block.state.ignore_public_acls,
      aws_s3_bucket_public_access_block.state.restrict_public_buckets,
    ])
    error_message = "상태 버킷은 퍼블릭 액세스를 모두 막아야 한다"
  }

  assert {
    condition = (
      jsondecode(aws_s3_bucket_policy.state.policy).Statement[0].Effect == "Deny" &&
      jsondecode(aws_s3_bucket_policy.state.policy).Statement[0].Condition.Bool["aws:SecureTransport"] == "false"
    )
    error_message = "상태 버킷은 TLS가 아닌 요청을 거부해야 한다"
  }
}

run "github_oidc" {
  command = apply

  assert {
    condition = (
      aws_iam_openid_connect_provider.github.url == "https://token.actions.githubusercontent.com" &&
      toset(aws_iam_openid_connect_provider.github.client_id_list) == toset(["sts.amazonaws.com"])
    )
    error_message = "GitHub OIDC 공급자는 audience sts.amazonaws.com으로 등록해야 한다"
  }

  assert {
    condition     = aws_iam_role.github["plan"].name == "portfolio-gha-plan" && aws_iam_role.github["deploy"].name == "portfolio-gha-deploy"
    error_message = "역할 이름은 portfolio-gha-plan, portfolio-gha-deploy여야 한다"
  }

  assert {
    condition     = jsondecode(aws_iam_role.github["plan"].assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] == "repo:ION127/portfolio-site:pull_request"
    error_message = "plan 역할은 이 저장소의 PR에서만 쓸 수 있어야 한다"
  }

  assert {
    condition     = jsondecode(aws_iam_role.github["deploy"].assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] == "repo:ION127/portfolio-site:ref:refs/heads/main"
    error_message = "배포 역할은 이 저장소의 main 브랜치에서만 쓸 수 있어야 한다"
  }

  assert {
    condition = alltrue([
      for role in aws_iam_role.github :
      jsondecode(role.assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:aud"] == "sts.amazonaws.com"
    ])
    error_message = "두 역할 모두 audience를 sts.amazonaws.com으로 묶어야 한다"
  }
}

run "least_privilege" {
  command = apply

  assert {
    condition = alltrue(flatten([
      for s in jsondecode(aws_iam_role_policy.plan.policy).Statement : [
        for a in flatten([s.Action]) : can(regex("^(s3:(Get|List)|cloudfront:(Get|List|Describe)|acm:(Get|List|Describe)|route53:(Get|List))", a))
      ]
    ]))
    error_message = "plan 역할에는 읽기 권한(Get·List·Describe)만 있어야 한다"
  }

  assert {
    condition = alltrue(flatten([
      for s in jsondecode(aws_iam_role_policy.deploy.policy).Statement : [
        for a in flatten([s.Action]) : !startswith(a, "iam:")
      ]
    ]))
    error_message = "배포 역할에는 IAM 권한이 없어야 한다"
  }

  assert {
    condition = alltrue([
      for s in jsondecode(aws_iam_role_policy.deploy.policy).Statement :
      alltrue([for a in flatten([s.Action]) : can(regex("^(cloudfront:|acm:|route53:(Get|List))", a))])
      if contains(flatten([s.Resource]), "*")
    ])
    error_message = "리소스를 *로 여는 권한은 CloudFront·ACM과 Route 53 조회뿐이어야 한다"
  }

  assert {
    condition = (
      contains(flatten([for s in jsondecode(aws_iam_role_policy.deploy.policy).Statement : flatten([s.Action])]), "acm:RequestCertificate") &&
      anytrue([
        for s in jsondecode(aws_iam_role_policy.deploy.policy).Statement :
        contains(flatten([s.Action]), "route53:ChangeResourceRecordSets") && flatten([s.Resource]) == ["arn:aws:route53:::hostedzone/*"]
      ])
    )
    error_message = "배포 역할은 인증서를 요청하고, DNS 레코드는 호스팅 영역 안에서만 바꿀 수 있어야 한다"
  }

  assert {
    condition = alltrue([
      for a in ["acm:DescribeCertificate", "route53:GetHostedZone", "route53:ListHostedZones", "route53:ListResourceRecordSets"] :
      contains(flatten([for s in jsondecode(aws_iam_role_policy.plan.policy).Statement : flatten([s.Action])]), a)
    ])
    error_message = "plan 역할은 인증서와 호스팅 영역·레코드를 조회할 수 있어야 한다"
  }

  assert {
    condition = alltrue(flatten([
      for s in jsondecode(aws_iam_role_policy.deploy.policy).Statement : [
        for r in flatten([s.Resource]) : r == "*" || startswith(r, "arn:aws:route53:::hostedzone/") || contains([
          "arn:aws:s3:::portfolio-tfstate-123456789012",
          "arn:aws:s3:::portfolio-tfstate-123456789012/site/*",
          "arn:aws:s3:::portfolio-site-123456789012",
          "arn:aws:s3:::portfolio-site-123456789012/*",
        ], r)
      ]
    ]))
    error_message = "배포 역할의 S3 권한은 사이트 버킷과 상태 버킷의 site/ 아래로 좁혀야 한다"
  }
}

run "budget" {
  command = apply

  assert {
    condition = (
      aws_budgets_budget.monthly.limit_amount == "5.0" &&
      aws_budgets_budget.monthly.limit_unit == "USD" &&
      aws_budgets_budget.monthly.time_unit == "MONTHLY"
    )
    error_message = "월 $5 예산이어야 한다"
  }

  assert {
    condition     = toset([for n in aws_budgets_budget.monthly.notification : n.threshold]) == toset([80, 100])
    error_message = "실제 비용 80%와 100%에서 알려야 한다"
  }

  assert {
    condition     = alltrue([for n in aws_budgets_budget.monthly.notification : contains(n.subscriber_email_addresses, "alerts@example.com")])
    error_message = "알림은 budget_email로 가야 한다"
  }
}

run "outputs" {
  command = apply

  assert {
    condition = output.github_variables == {
      AWS_REGION          = "ap-northeast-2"
      AWS_PLAN_ROLE_ARN   = "arn:aws:iam::123456789012:role/portfolio-gha-plan"
      AWS_DEPLOY_ROLE_ARN = "arn:aws:iam::123456789012:role/portfolio-gha-deploy"
      TF_STATE_BUCKET     = "portfolio-tfstate-123456789012"
    }
    error_message = "GitHub 저장소 변수 4개를 그대로 내보내야 한다"
  }
}

run "rejects_a_bad_email" {
  command = plan

  variables {
    budget_email = "not-an-email"
  }

  expect_failures = [var.budget_email]
}
