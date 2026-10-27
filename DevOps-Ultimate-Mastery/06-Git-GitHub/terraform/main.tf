# Complete Terraform Implementation for Git GitHub
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  tags = {
    Name = "06-Git-GitHub-production-server"
    Environment = "Production"
  }
}
