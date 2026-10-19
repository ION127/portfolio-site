output "url" {
  description = "앱 주소"
  value       = "https://${local.app_name}"
}

output "distribution_id" {
  description = "CloudFront 배포 ID"
  value       = aws_cloudfront_distribution.app.id
}

output "origin_name" {
  description = "CloudFront가 붙는 집 서버 이름(공인 IP를 가리킨다)"
  value       = local.origin_name
}
