terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.66"
    }
  }

  # 상태 버킷은 이 묶음이 만든다. 처음 한 번은 backend_override.tf(local 백엔드)로 적용하고,
  # 버킷이 생기면 -migrate-state로 옮긴다(infra/README.md).
  backend "s3" {
    key          = "bootstrap/terraform.tfstate"
    region       = "ap-northeast-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
