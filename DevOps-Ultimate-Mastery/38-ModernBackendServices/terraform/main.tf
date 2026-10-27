# Complete Terraform Implementation for ModernBackendServices
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  tags = {
    Name = "38-ModernBackendServices-production-server"
    Environment = "Production"
  }
}
