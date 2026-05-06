terraform {
  required_version = "~> 1"

  backend "s3" {
    bucket       = "bbox-terraform"
    key          = "peleteiro/pixlink/tofu.tfstate"
    region       = "us-east-2"
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
}

provider "aws" {
  region = "us-east-2"
}

provider "cloudflare" {}
