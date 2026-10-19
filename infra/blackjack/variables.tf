variable "project" {
  description = "리소스 태그에 쓰는 이름"
  type        = string
  default     = "portfolio"
}

variable "region" {
  description = "Route 53 레코드를 다루는 기본 리전(CloudFront 인증서는 us-east-1)"
  type        = string
  default     = "ap-northeast-2"
}

variable "domain_name" {
  description = "Route 53 호스팅 영역이 있는 도메인(예: jjcloud.dev)"
  type        = string

  validation {
    condition     = can(regex("^([a-z0-9-]+\\.)+[a-z]{2,}$", var.domain_name))
    error_message = "domain_name은 example.dev 같은 소문자 도메인이어야 합니다."
  }
}

variable "subdomain" {
  description = "앱을 붙일 서브도메인 이름"
  type        = string
  default     = "blackjack"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.subdomain))
    error_message = "subdomain은 소문자 · 숫자 · 하이픈만 쓸 수 있습니다."
  }
}

variable "origin_ip" {
  description = "앱이 도는 PC의 공인 IPv4 주소. 저장소에 넣지 않고 실행할 때 넘긴다(-var 또는 git에 안 올라가는 terraform.tfvars)."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{1,3}([.][0-9]{1,3}){3}$", var.origin_ip)) && can(cidrhost("${var.origin_ip}/32", 0))
    error_message = "origin_ip는 IPv4 주소여야 합니다(CloudFront 오리진 이름이 이 주소를 가리킵니다)."
  }
}

variable "origin_port" {
  description = "공유기에서 PC로 포워딩된 앱 포트(HTTP)"
  type        = number
  default     = 8000

  validation {
    condition     = var.origin_port == 80 || (var.origin_port >= 1024 && var.origin_port <= 65535)
    error_message = "CloudFront 오리진 HTTP 포트는 80 또는 1024~65535여야 합니다."
  }
}
