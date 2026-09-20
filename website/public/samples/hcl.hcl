# Showcase: HCL — Terraform-style blocks and expressions.
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "demo-state"
    key    = "app/terraform.tfstate"
    region = "us-east-1"
  }
}

variable "workers" {
  description = "Highlight worker count"
  type        = number
  default     = 4

  validation {
    condition     = var.workers > 0 && var.workers <= 32
    error_message = "workers must be 1..32"
  }
}

locals {
  name   = "highlight-demo"
  tags   = { app = local.name, env = var.env }
  ports  = [for p in [80, 443] : "${p}/tcp"]
  merged = merge(local.tags, { team = "dx" })
}

resource "aws_instance" "app" {
  count         = var.workers > 1 ? 2 : 1
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.small"

  tags = local.tags

  provisioner "local-exec" {
    command = "echo ${self.private_ip} >> ips.txt"
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [tags["env"]]
  }
}

output "ips" {
  value       = aws_instance.app[*].private_ip
  description = "Private IPs"
  sensitive   = false
}
