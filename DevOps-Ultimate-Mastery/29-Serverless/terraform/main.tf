# Complete Terraform Implementation for Serverless
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  tags = {
    Name = "29-Serverless-production-server"
    Environment = "Production"
  }
}
