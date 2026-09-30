output "site_bucket" {
  description = "사이트 파일을 올리는 S3 버킷"
  value       = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  description = "캐시 무효화에 쓰는 CloudFront 배포 ID"
  value       = aws_cloudfront_distribution.site.id
}

output "site_url" {
  description = "사이트 주소. 빌드할 때 SITE_URL로 쓴다"
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}
