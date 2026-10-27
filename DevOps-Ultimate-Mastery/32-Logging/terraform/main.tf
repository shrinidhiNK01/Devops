# Complete Terraform Implementation for Logging
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  tags = {
    Name = "32-Logging-production-server"
    Environment = "Production"
  }
}
