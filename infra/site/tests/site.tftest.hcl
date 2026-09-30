# AWS에 요청하지 않는다(mock provider). 실행: terraform -chdir=infra/site test
# apply도 가짜 값으로만 돌아서, 계산된 값(ARN·주소)까지 확인할 수 있다.

mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }

  mock_resource "aws_s3_bucket" {
    defaults = {
      arn                         = "arn:aws:s3:::portfolio-site-123456789012"
      bucket_regional_domain_name = "portfolio-site-123456789012.s3.ap-northeast-2.amazonaws.com"
    }
  }

  mock_resource "aws_cloudfront_function" {
    defaults = {
      arn = "arn:aws:cloudfront::123456789012:function/portfolio-rewrite"
    }
  }

  mock_resource "aws_cloudfront_distribution" {
    defaults = {
      id             = "E2EXAMPLE"
      arn            = "arn:aws:cloudfront::123456789012:distribution/E2EXAMPLE"
      domain_name    = "d111111abcdef8.cloudfront.net"
      hosted_zone_id = "Z2FDTNDATAQYW2"
    }
  }

  mock_data "aws_route53_zone" {
    defaults = {
      zone_id = "Z0EXAMPLE"
    }
  }
}

# CloudFront용 인증서는 us-east-1 provider로 만든다.
mock_provider "aws" {
  alias = "us_east_1"

  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/0000-example"
      domain_validation_options = [
        {
          domain_name           = "example.dev"
          resource_record_name  = "_a.example.dev."
          resource_record_type  = "CNAME"
          resource_record_value = "_a.acm-validations.aws."
        },
        {
          domain_name           = "www.example.dev"
          resource_record_name  = "_b.www.example.dev."
          resource_record_type  = "CNAME"
          resource_record_value = "_b.acm-validations.aws."
        },
      ]
    }
  }
}

run "private_bucket" {
  command = apply

  assert {
    condition     = aws_s3_bucket.site.bucket == "portfolio-site-123456789012"
    error_message = "사이트 버킷 이름은 portfolio-site-<계정ID>여야 한다"
  }

  assert {
    condition = alltrue([
      aws_s3_bucket_public_access_block.site.block_public_acls,
      aws_s3_bucket_public_access_block.site.block_public_policy,
      aws_s3_bucket_public_access_block.site.ignore_public_acls,
      aws_s3_bucket_public_access_block.site.restrict_public_buckets,
    ])
    error_message = "사이트 버킷은 퍼블릭 액세스를 모두 막아야 한다"
  }

  assert {
    condition     = one(aws_s3_bucket_ownership_controls.site.rule).object_ownership == "BucketOwnerEnforced"
    error_message = "ACL 없이 버킷 소유자가 모든 객체를 가져야 한다"
  }
}

run "only_this_distribution_reads_the_bucket" {
  command = apply

  assert {
    condition     = length(jsondecode(aws_s3_bucket_policy.site.policy).Statement) == 1
    error_message = "버킷 정책에는 CloudFront 읽기 허용 한 줄만 있어야 한다"
  }

  assert {
    condition     = jsondecode(aws_s3_bucket_policy.site.policy).Statement[0].Action == "s3:GetObject"
    error_message = "CloudFront에는 GetObject만 준다(ListBucket을 주면 없는 키가 404로 바뀐다)"
  }

  assert {
    condition     = jsondecode(aws_s3_bucket_policy.site.policy).Statement[0].Principal.Service == "cloudfront.amazonaws.com"
    error_message = "읽기 주체는 CloudFront 서비스여야 한다"
  }

  assert {
    condition     = jsondecode(aws_s3_bucket_policy.site.policy).Statement[0].Condition.StringEquals["AWS:SourceArn"] == aws_cloudfront_distribution.site.arn
    error_message = "이 배포에서 온 요청만 허용해야 한다"
  }
}

run "distribution" {
  command = apply

  assert {
    condition     = aws_cloudfront_origin_access_control.site.signing_behavior == "always" && aws_cloudfront_origin_access_control.site.signing_protocol == "sigv4"
    error_message = "OAC는 모든 요청에 SigV4로 서명해야 한다"
  }

  assert {
    condition     = one(aws_cloudfront_distribution.site.origin).origin_access_control_id == aws_cloudfront_origin_access_control.site.id
    error_message = "오리진은 OAC로 버킷에 접근해야 한다"
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_cache_behavior[0].viewer_protocol_policy == "redirect-to-https"
    error_message = "HTTP는 HTTPS로 리다이렉트해야 한다"
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_cache_behavior[0].cache_policy_id == "658327ea-f89d-4fab-a63d-7e88639e58f6"
    error_message = "관리형 CachingOptimized 정책을 써야 한다"
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_cache_behavior[0].response_headers_policy_id == "67f7725c-6f97-4210-82d7-5512b31e9d03"
    error_message = "관리형 SecurityHeadersPolicy를 붙여야 한다"
  }

  assert {
    condition = anytrue([
      for f in aws_cloudfront_distribution.site.default_cache_behavior[0].function_association :
      f.event_type == "viewer-request" && f.function_arn == aws_cloudfront_function.rewrite.arn
    ])
    error_message = "기본 동작에는 주소 변환 함수가 viewer-request로 붙어야 한다"
  }

  assert {
    condition     = aws_cloudfront_distribution.site.ordered_cache_behavior[0].path_pattern == "/_astro/*" && length(aws_cloudfront_distribution.site.ordered_cache_behavior[0].function_association) == 0
    error_message = "/_astro/*는 함수를 거치지 않는 별도 동작이어야 한다"
  }

  assert {
    condition = alltrue([
      for code in [403, 404] : anytrue([
        for r in aws_cloudfront_distribution.site.custom_error_response :
        r.error_code == code && r.response_code == 404 && r.response_page_path == "/404.html"
      ])
    ])
    error_message = "403과 404는 모두 /404.html을 상태 404로 응답해야 한다"
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_root_object == "index.html" && aws_cloudfront_distribution.site.price_class == "PriceClass_200"
    error_message = "루트는 index.html, 가격 등급은 한국 엣지를 포함하는 PriceClass_200이어야 한다"
  }

  assert {
    condition     = aws_cloudfront_function.rewrite.runtime == "cloudfront-js-2.0" && aws_cloudfront_function.rewrite.publish
    error_message = "주소 변환 함수는 JS 2.0 런타임으로 게시돼야 한다"
  }
}

run "no_domain_by_default" {
  command = apply

  assert {
    condition     = length(aws_cloudfront_distribution.site.aliases) == 0 && aws_cloudfront_distribution.site.viewer_certificate[0].cloudfront_default_certificate
    error_message = "도메인이 없으면 CloudFront 기본 주소와 기본 인증서를 써야 한다"
  }

  assert {
    condition     = length(aws_acm_certificate.site) == 0 && length(aws_route53_record.site) == 0 && length(aws_route53_record.cert_validation) == 0
    error_message = "도메인이 없으면 인증서와 DNS 레코드를 만들지 않아야 한다"
  }
}

run "custom_domain" {
  command = apply

  variables {
    domain_name = "example.dev"
  }

  assert {
    condition     = toset(aws_cloudfront_distribution.site.aliases) == toset(["example.dev", "www.example.dev"])
    error_message = "배포 별칭은 기본 도메인과 www여야 한다"
  }

  assert {
    condition = (
      aws_cloudfront_distribution.site.viewer_certificate[0].acm_certificate_arn == "arn:aws:acm:us-east-1:123456789012:certificate/0000-example" &&
      aws_cloudfront_distribution.site.viewer_certificate[0].ssl_support_method == "sni-only" &&
      aws_cloudfront_distribution.site.viewer_certificate[0].minimum_protocol_version == "TLSv1.2_2021" &&
      !aws_cloudfront_distribution.site.viewer_certificate[0].cloudfront_default_certificate
    )
    error_message = "도메인이 있으면 검증된 ACM 인증서(SNI, TLS 1.2 이상)를 써야 한다"
  }

  assert {
    condition = (
      aws_acm_certificate.site[0].domain_name == "example.dev" &&
      toset(aws_acm_certificate.site[0].subject_alternative_names) == toset(["www.example.dev"]) &&
      aws_acm_certificate.site[0].validation_method == "DNS"
    )
    error_message = "인증서는 기본 도메인과 www를 담고 DNS로 검증해야 한다"
  }

  assert {
    condition     = length(aws_route53_record.cert_validation) == 2 && alltrue([for r in aws_route53_record.cert_validation : r.zone_id == "Z0EXAMPLE" && r.type == "CNAME"])
    error_message = "인증서 검증 레코드 두 개를 도메인의 호스팅 영역에 만들어야 한다"
  }

  assert {
    condition = (
      toset(keys(aws_route53_record.site)) == toset(["example.dev A", "example.dev AAAA", "www.example.dev A", "www.example.dev AAAA"]) &&
      alltrue([for r in aws_route53_record.site : one(r.alias).name == "d111111abcdef8.cloudfront.net" && one(r.alias).zone_id == "Z2FDTNDATAQYW2"])
    )
    error_message = "기본 도메인과 www의 A/AAAA 레코드가 CloudFront를 가리켜야 한다"
  }

  assert {
    condition     = output.site_url == "https://example.dev"
    error_message = "도메인이 있으면 site_url은 https://<도메인>이어야 한다"
  }
}

# 저장소 변수에 주소를 통째로 넣거나 www를 붙이는 실수는 plan에서 막는다.
run "rejects_a_url_as_domain" {
  command = plan

  variables {
    domain_name = "https://example.dev"
  }

  expect_failures = [var.domain_name]
}

run "rejects_www_as_domain" {
  command = plan

  variables {
    domain_name = "www.example.dev"
  }

  expect_failures = [var.domain_name]
}

run "outputs" {
  command = apply

  assert {
    condition     = output.site_url == "https://d111111abcdef8.cloudfront.net"
    error_message = "site_url은 https://<CloudFront 주소>여야 한다"
  }

  assert {
    condition     = output.site_bucket == "portfolio-site-123456789012" && output.distribution_id == "E2EXAMPLE"
    error_message = "배포 파이프라인이 쓸 버킷 이름과 배포 ID를 내보내야 한다"
  }
}
