# Complete Terraform Implementation for Bash Scripting
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  tags = {
    Name = "07-Bash-Scripting-production-server"
    Environment = "Production"
  }
}
