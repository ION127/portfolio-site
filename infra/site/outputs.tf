output "site_bucket" {
  description = "사이트 파일을 올리는 S3 버킷"
  value       = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  description = "캐시 무효화에 쓰는 CloudFront 배포 ID"
  value       = aws_cloudfront_distribution.site.id
}

output "site_url" {
  description = "사이트 주소(도메인이 있으면 도메인, 없으면 CloudFront 주소). 빌드할 때 SITE_URL로 쓴다"
  value       = local.has_domain ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.site.domain_name}"
}
