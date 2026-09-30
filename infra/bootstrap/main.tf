data "aws_caller_identity" "current" {}

locals {
  account_id   = data.aws_caller_identity.current.account_id
  state_bucket = "${var.project}-tfstate-${local.account_id}"
  site_bucket  = "${var.project}-site-${local.account_id}"
  oidc_host    = "token.actions.githubusercontent.com"

  # 역할별로 토큰의 sub가 이 값일 때만 역할을 넘겨준다.
  # 이 저장소는 변경 불가 sub(이름 뒤에 숫자 ID)를 써서, 같은 이름으로 다시 만든 저장소는 역할을 받을 수 없다.
  github_subjects = {
    plan   = "${var.github_subject_prefix}:pull_request"
    deploy = "${var.github_subject_prefix}:ref:refs/heads/main"
  }
}

# ---- Terraform 상태 버킷 ----

resource "aws_s3_bucket" "state" {
  bucket = local.state_bucket
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.state]
}

# ---- GitHub Actions OIDC와 역할 ----

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://${local.oidc_host}"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "github" {
  for_each = local.github_subjects

  name        = "${var.project}-gha-${each.key}"
  description = "GitHub Actions (${each.value})"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_host}:aud" = "sts.amazonaws.com"
          "${local.oidc_host}:sub" = each.value
        }
      }
    }]
  })
}

# PR에서 plan만 한다. 상태는 읽기만 하고(plan -lock=false), 리소스는 조회만 한다.
resource "aws_iam_role_policy" "plan" {
  name = "terraform-plan"
  role = aws_iam_role.github["plan"].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "StateList"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.state.arn
      },
      {
        Sid      = "StateRead"
        Effect   = "Allow"
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.state.arn}/site/*"
      },
      {
        Sid      = "SiteBucketRead"
        Effect   = "Allow"
        Action   = ["s3:Get*", "s3:List*"]
        Resource = ["arn:aws:s3:::${local.site_bucket}", "arn:aws:s3:::${local.site_bucket}/*"]
      },
      {
        Sid      = "CloudFrontRead"
        Effect   = "Allow"
        Action   = ["cloudfront:Get*", "cloudfront:List*", "cloudfront:DescribeFunction"]
        Resource = "*"
      },
      {
        Sid    = "DomainRead"
        Effect = "Allow"
        Action = [
          "acm:DescribeCertificate",
          "acm:GetCertificate",
          "acm:ListCertificates",
          "acm:ListTagsForCertificate",
          "route53:GetChange",
          "route53:GetHostedZone",
          "route53:ListHostedZones",
          "route53:ListHostedZonesByName",
          "route53:ListResourceRecordSets",
          "route53:ListTagsForResource",
        ]
        Resource = "*"
      },
    ]
  })
}

# main에서 site 묶음을 apply하고 사이트를 올린다. IAM 권한은 없다(IAM은 이 bootstrap에서만 바뀐다).
# CloudFront 리소스는 만들 때 ARN을 미리 알 수 없어 리소스 종류별 동작 이름으로 좁힌다.
resource "aws_iam_role_policy" "deploy" {
  name = "terraform-apply-and-publish"
  role = aws_iam_role.github["deploy"].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "StateList"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.state.arn
      },
      {
        Sid      = "StateReadWrite"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.state.arn}/site/*"
      },
      {
        Sid      = "SiteBucket"
        Effect   = "Allow"
        Action   = "s3:*"
        Resource = ["arn:aws:s3:::${local.site_bucket}", "arn:aws:s3:::${local.site_bucket}/*"]
      },
      {
        Sid    = "CloudFront"
        Effect = "Allow"
        Action = [
          "cloudfront:*Distribution*",
          "cloudfront:*OriginAccessControl*",
          "cloudfront:*Function*",
          "cloudfront:*Invalidation*",
          "cloudfront:Get*",
          "cloudfront:List*",
          "cloudfront:TagResource",
          "cloudfront:UntagResource",
        ]
        Resource = "*"
      },
      {
        # CloudFront용 인증서(us-east-1). 요청 전에는 ARN을 알 수 없다.
        Sid    = "Certificate"
        Effect = "Allow"
        Action = [
          "acm:AddTagsToCertificate",
          "acm:DeleteCertificate",
          "acm:DescribeCertificate",
          "acm:GetCertificate",
          "acm:ListCertificates",
          "acm:ListTagsForCertificate",
          "acm:RemoveTagsFromCertificate",
          "acm:RequestCertificate",
        ]
        Resource = "*"
      },
      {
        Sid      = "DnsRecordChanges"
        Effect   = "Allow"
        Action   = "route53:ChangeResourceRecordSets"
        Resource = "arn:aws:route53:::hostedzone/*"
      },
      {
        Sid    = "DnsRead"
        Effect = "Allow"
        Action = [
          "route53:GetChange",
          "route53:GetHostedZone",
          "route53:ListHostedZones",
          "route53:ListHostedZonesByName",
          "route53:ListResourceRecordSets",
          "route53:ListTagsForResource",
        ]
        Resource = "*"
      },
    ]
  })
}

# ---- 비용 알림 ----

resource "aws_budgets_budget" "monthly" {
  name         = "${var.project}-monthly"
  budget_type  = "COST"
  limit_amount = format("%.1f", var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  dynamic "notification" {
    for_each = [80, 100]

    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_email]
    }
  }
}
