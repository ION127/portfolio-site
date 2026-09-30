variable "region" {
  description = "사이트 버킷을 둘 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "project" {
  description = "리소스 이름 앞에 붙이는 이름"
  type        = string
  default     = "portfolio"
}
