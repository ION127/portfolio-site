# 도메인 연결. domain_name이 비어 있으면 아무것도 만들지 않는다.

locals {
  has_domain = var.domain_name != ""
  site_names = local.has_domain ? [var.domain_name, "www.${var.domain_name}"] : []

  # 인증서의 이름별 검증 레코드. 인증서가 없으면 빈 맵이다.
  validation = {
    for o in flatten([for c in aws_acm_certificate.site : c.domain_validation_options]) : o.domain_name => o
  }
}

# Route 53에서 도메인을 사면 같은 이름의 호스팅 영역이 자동으로 생긴다.
data "aws_route53_zone" "site" {
  count = local.has_domain ? 1 : 0
  name  = var.domain_name
}

resource "aws_acm_certificate" "site" {
  count    = local.has_domain ? 1 : 0
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# 키는 설정에서 이미 아는 이름(기본 도메인·www)으로 잡고, 레코드 값만 인증서에서 가져온다.
# 인증서 값은 apply 때 정해져도 되므로 plan 단계에서 for_each 키가 흔들리지 않는다.
resource "aws_route53_record" "cert_validation" {
  for_each = toset(local.site_names)

  zone_id         = data.aws_route53_zone.site[0].zone_id
  name            = local.validation[each.key].resource_record_name
  type            = local.validation[each.key].resource_record_type
  records         = [local.validation[each.key].resource_record_value]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  count    = local.has_domain ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# 기본 도메인과 www 모두 CloudFront를 가리킨다. www는 주소 변환 함수가 기본 도메인으로 301을 준다.
resource "aws_route53_record" "site" {
  for_each = {
    for pair in setproduct(local.site_names, ["A", "AAAA"]) : "${pair[0]} ${pair[1]}" => {
      name = pair[0]
      type = pair[1]
    }
  }

  zone_id = data.aws_route53_zone.site[0].zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
