terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.66"
    }
  }

  # 버킷 이름에는 계정 ID가 들어가서 코드에 쓰지 않는다.
  # init 때 -backend-config="bucket=<상태 버킷>"으로 넣는다.
  backend "s3" {
    key          = "site/terraform.tfstate"
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

# CloudFront에 붙이는 ACM 인증서는 us-east-1에만 만들 수 있다.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
