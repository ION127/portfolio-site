output "state_bucket" {
  description = "Terraform 상태 버킷. 두 묶음의 -backend-config=\"bucket=...\"에 쓴다"
  value       = aws_s3_bucket.state.bucket
}

output "github_variables" {
  description = "GitHub 저장소 변수(Settings → Secrets and variables → Actions → Variables)로 등록할 값"
  value = {
    AWS_REGION          = var.region
    AWS_PLAN_ROLE_ARN   = aws_iam_role.github["plan"].arn
    AWS_DEPLOY_ROLE_ARN = aws_iam_role.github["deploy"].arn
    TF_STATE_BUCKET     = aws_s3_bucket.state.bucket
  }
}
