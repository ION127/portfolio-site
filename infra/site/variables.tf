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

variable "domain_name" {
  description = "사이트 도메인(예: jjcloud.dev). Route 53에 호스팅 영역이 있어야 한다. 비우면 CloudFront 기본 주소를 쓴다. CI는 저장소 변수 SITE_DOMAIN을 TF_VAR_domain_name으로 넘긴다"
  type        = string
  default     = ""

  validation {
    condition     = var.domain_name == "" || (can(regex("^([a-z0-9-]+\\.)+[a-z]{2,}$", var.domain_name)) && !startswith(var.domain_name, "www."))
    error_message = "domain_name은 https://와 www. 없이 소문자 도메인만 쓴다(예: example.dev)."
  }
}
