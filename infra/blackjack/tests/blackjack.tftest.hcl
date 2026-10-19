# AWS에 요청하지 않는다(mock provider). 실행: scripts/tf.sh blackjack test

mock_provider "aws" {
  mock_resource "aws_cloudfront_distribution" {
    defaults = {
      id             = "E3EXAMPLE"
      arn            = "arn:aws:cloudfront::123456789012:distribution/E3EXAMPLE"
      domain_name    = "d222222abcdef8.cloudfront.net"
      hosted_zone_id = "Z2FDTNDATAQYW2"
    }
  }

  mock_data "aws_route53_zone" {
    defaults = {
      zone_id = "Z0EXAMPLE"
    }
  }
}

mock_provider "aws" {
  alias = "us_east_1"

  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/0000-blackjack"
      domain_validation_options = [
        {
          domain_name           = "blackjack.example.dev"
          resource_record_name  = "_c.blackjack.example.dev."
          resource_record_type  = "CNAME"
          resource_record_value = "_c.acm-validations.aws."
        },
      ]
    }
  }

  mock_resource "aws_acm_certificate_validation" {
    defaults = {
      certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/0000-blackjack"
    }
  }
}

variables {
  domain_name = "example.dev"
  origin_ip   = "203.0.113.10"
}

run "names_the_home_server_for_cloudfront" {
  command = apply

  assert {
    condition     = aws_route53_record.origin.name == "origin-blackjack.example.dev" && aws_route53_record.origin.type == "A"
    error_message = "CloudFront 오리진은 이름이어야 하므로 집 공인 IP에 A 레코드를 붙인다"
  }

  assert {
    condition     = aws_route53_record.origin.records == toset(["203.0.113.10"]) && aws_route53_record.origin.ttl == 60
    error_message = "오리진 레코드는 넘겨받은 IP를 짧은 TTL로 가리켜야 한다(IP가 바뀌면 빨리 반영)"
  }
}

run "serves_the_subdomain_over_https" {
  command = apply

  assert {
    condition     = aws_cloudfront_distribution.app.aliases == toset(["blackjack.example.dev"])
    error_message = "배포는 blackjack 서브도메인 하나만 받는다"
  }

  assert {
    condition     = aws_acm_certificate.app.domain_name == "blackjack.example.dev"
    error_message = "인증서는 서브도메인용이어야 한다"
  }

  assert {
    condition = (
      one(aws_cloudfront_distribution.app.viewer_certificate).ssl_support_method == "sni-only" &&
      one(aws_cloudfront_distribution.app.viewer_certificate).minimum_protocol_version == "TLSv1.2_2021"
    )
    error_message = "방문자 쪽은 SNI · TLS 1.2 이상으로만 받는다"
  }

  assert {
    condition     = one(aws_cloudfront_distribution.app.default_cache_behavior).viewer_protocol_policy == "redirect-to-https"
    error_message = "HTTP로 들어오면 HTTPS로 보낸다"
  }

  assert {
    condition     = toset([for r in aws_route53_record.app : r.type]) == toset(["A", "AAAA"])
    error_message = "서브도메인은 IPv4 · IPv6 모두 CloudFront를 가리킨다"
  }
}

run "passes_requests_through_to_the_home_server" {
  command = apply

  assert {
    condition = (
      one(aws_cloudfront_distribution.app.origin).domain_name == "origin-blackjack.example.dev" &&
      one(one(aws_cloudfront_distribution.app.origin).custom_origin_config).http_port == 8000 &&
      one(one(aws_cloudfront_distribution.app.origin).custom_origin_config).origin_protocol_policy == "http-only"
    )
    error_message = "오리진은 집 서버의 8000번에 HTTP로 붙는다"
  }

  assert {
    condition     = one(one(aws_cloudfront_distribution.app.origin).custom_origin_config).origin_keepalive_timeout < 5
    error_message = "uvicorn 기본 keep-alive(5초)보다 먼저 연결을 놓아야 끊긴 연결을 다시 쓰지 않는다"
  }

  assert {
    condition     = one(aws_cloudfront_distribution.app.default_cache_behavior).cache_policy_id == "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    error_message = "게임 상태 · API 응답은 캐시하지 않는다(CachingDisabled)"
  }

  assert {
    condition     = one(aws_cloudfront_distribution.app.default_cache_behavior).origin_request_policy_id == "b689b0a8-53d0-40ab-baf2-68738e2966ac"
    error_message = "헤더 · 쿠키 · 쿼리를 그대로 넘긴다(AllViewerExceptHostHeader)"
  }

  assert {
    condition     = toset(one(aws_cloudfront_distribution.app.default_cache_behavior).allowed_methods) == toset(["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"])
    error_message = "로그인 · 게임 API를 위해 모든 메서드를 받는다"
  }
}

run "rejects_an_origin_that_is_not_an_ipv4_address" {
  command = plan

  variables {
    origin_ip = "home.example.dev"
  }

  expect_failures = [var.origin_ip]
}

run "rejects_a_port_cloudfront_cannot_reach" {
  command = plan

  variables {
    origin_port = 8
  }

  expect_failures = [var.origin_port]
}
