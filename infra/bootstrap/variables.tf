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

variable "github_repo" {
  description = "배포를 허용할 GitHub 저장소(소유자/이름)"
  type        = string
  default     = "ION127/portfolio-site"
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
