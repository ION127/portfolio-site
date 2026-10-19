# 집 PC에서 도는 앱(블랙잭 학습 데모)을 https://<subdomain>.<domain>으로 연다.
# 방문자 ─HTTPS→ CloudFront(ACM 인증서) ─HTTP:origin_port→ 공유기 포트포워딩 → PC의 앱
# PC가 꺼져 있으면 CloudFront는 502/504를 돌려준다.

locals {
  app_name    = "${var.subdomain}.${var.domain_name}"
  origin_name = "origin-${var.subdomain}.${var.domain_name}"
  origin_id   = "home-${var.subdomain}"

  # AWS 관리형 정책 ID. 모든 계정에서 같다.
  # https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
  caching_disabled_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  # 헤더 · 쿠키 · 쿼리를 모두 넘기되 Host는 오리진 이름으로 바꾼다.
  # https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
  all_viewer_except_host_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  # SecurityHeadersPolicy(HSTS 1년, nosniff, SAMEORIGIN, Referrer-Policy)
  security_headers_policy_id = "67f7725c-6f97-4210-82d7-5512b31e9d03"
}

data "aws_route53_zone" "main" {
  name = var.domain_name
}

# CloudFront 오리진은 IP가 아니라 이름이어야 해서 집 공인 IP에 이름을 붙인다.
# 가정용 IP는 바뀔 수 있으니 TTL을 짧게 두고, 바뀌면 origin_ip만 바꿔 다시 apply한다.
resource "aws_route53_record" "origin" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.origin_name
  type    = "A"
  ttl     = 60
  records = [var.origin_ip]
}

resource "aws_acm_certificate" "app" {
  provider = aws.us_east_1

  domain_name       = local.app_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = one(aws_acm_certificate.app.domain_validation_options).resource_record_name
  type            = one(aws_acm_certificate.app.domain_validation_options).resource_record_type
  records         = [one(aws_acm_certificate.app.domain_validation_options).resource_record_value]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "app" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.app.arn
  validation_record_fqdns = [aws_route53_record.cert_validation.fqdn]
}

resource "aws_cloudfront_distribution" "app" {
  enabled         = true
  comment         = "${var.project} ${var.subdomain} (home server)"
  price_class     = "PriceClass_200"
  http_version    = "http2and3"
  is_ipv6_enabled = true
  aliases         = [local.app_name]

  origin {
    origin_id   = local.origin_id
    domain_name = aws_route53_record.origin.name

    custom_origin_config {
      http_port              = var.origin_port
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      # uvicorn은 쉬는 연결을 5초 뒤 닫는다. 그보다 먼저 놓아야 이미 닫힌 연결을 다시 써 502가 나지 않는다.
      origin_keepalive_timeout = 4
      origin_read_timeout      = 30
    }
  }

  # 게임 상태 · 로그인 API는 사람마다 다르므로 캐시하지 않고 요청을 그대로 넘긴다.
  default_cache_behavior {
    target_origin_id           = local.origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = local.caching_disabled_policy_id
    origin_request_policy_id   = local.all_viewer_except_host_policy_id
    response_headers_policy_id = local.security_headers_policy_id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.app.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

resource "aws_route53_record" "app" {
  for_each = toset(["A", "AAAA"])

  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.app_name
  type    = each.key

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}
