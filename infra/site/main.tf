data "aws_caller_identity" "current" {}

locals {
  bucket_name = "${var.project}-site-${data.aws_caller_identity.current.account_id}"
  origin_id   = "site-s3"

  # AWS 관리형 정책 ID. 모든 계정에서 같다.
  # CachingOptimized(최소 1초·기본 1일·최대 1년, 오리진 Cache-Control을 따름):
  # https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
  caching_optimized_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  # SecurityHeadersPolicy(HSTS 1년, nosniff, SAMEORIGIN, Referrer-Policy. CSP는 없음):
  # https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-response-headers-policies.html
  security_headers_policy_id = "67f7725c-6f97-4210-82d7-5512b31e9d03"
}

# ---- 사이트 버킷(비공개) ----

resource "aws_s3_bucket" "site" {
  bucket = local.bucket_name
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront(이 배포)만 객체를 읽을 수 있다. ListBucket을 주지 않아 없는 키는 403이 되고,
# 배포의 오류 응답이 403·404를 모두 /404.html로 바꾼다.
resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.site.arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.site.arn } }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.site]
}

# ---- CloudFront ----

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.project}-site"
  description                       = "Signed requests from CloudFront to the private site bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "rewrite" {
  name    = "${var.project}-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Append index.html to folder paths and redirect paths without a trailing slash"
  publish = true
  code    = file("${path.module}/functions/rewrite.js")
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  comment             = "${var.project} static site"
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  aliases             = local.site_names

  origin {
    origin_id                = local.origin_id
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id           = local.origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = local.caching_optimized_policy_id
    response_headers_policy_id = local.security_headers_policy_id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  # 파일명에 해시가 붙은 빌드 결과물. 주소를 바꿀 일이 없어 함수를 거치지 않는다.
  ordered_cache_behavior {
    path_pattern               = "/_astro/*"
    target_origin_id           = local.origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = local.caching_optimized_policy_id
    response_headers_policy_id = local.security_headers_policy_id
  }

  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # 도메인이 있으면 검증된 ACM 인증서(domain.tf), 없으면 CloudFront 기본 인증서를 쓴다.
  viewer_certificate {
    cloudfront_default_certificate = !local.has_domain
    acm_certificate_arn            = one(aws_acm_certificate_validation.site[*].certificate_arn)
    ssl_support_method             = local.has_domain ? "sni-only" : null
    minimum_protocol_version       = local.has_domain ? "TLSv1.2_2021" : "TLSv1"
  }
}
