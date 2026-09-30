variable "region" {
  description = "상태 버킷을 둘 리전. site 묶음과 같아야 한다"
  type        = string
  default     = "ap-northeast-2"
}

variable "project" {
  description = "리소스 이름 앞에 붙이는 이름. site 묶음과 같아야 한다"
  type        = string
  default     = "portfolio"
}

variable "github_subject_prefix" {
  description = "역할을 넘겨줄 GitHub 저장소의 OIDC 토큰 sub 앞부분. 저장소 설정에 따라 형식이 달라서 GitHub가 알려 주는 값을 그대로 쓴다: gh api repos/<소유자>/<이름>/actions/oidc/customization/sub --jq .sub_claim_prefix"
  type        = string
  default     = "repo:ION127@125182378/portfolio-site@1396946780"

  validation {
    condition     = can(regex("^repo:[^:]+$", var.github_subject_prefix))
    error_message = "github_subject_prefix는 repo:로 시작하는 sub 앞부분이어야 한다(:pull_request 같은 뒷부분은 빼고)."
  }
}

variable "budget_email" {
  description = "월 예산 알림을 받을 이메일. 공개 저장소라 커밋하지 않고 terraform.tfvars나 -var로 넣는다"
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.budget_email))
    error_message = "budget_email은 이메일 주소여야 한다."
  }
}

variable "monthly_budget_usd" {
  description = "월 예산(USD). 실제 비용이 80%·100%를 넘으면 알린다"
  type        = number
  default     = 5
}
