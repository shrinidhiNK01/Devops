# 17-Terraform: Complete Enterprise Implementation & Theory

## 1. Deep Theory: Infrastructure as Code & State
Terraform uses a declarative language (HCL) to define infrastructure.
- **State File (`terraform.tfstate`):** Terraform's source of truth. It maps the resources defined in your `.tf` files to the actual resources in AWS.
- **Remote State & Locking:** In enterprise teams, state must be stored remotely (e.g., S3) and locked (e.g., DynamoDB) to prevent two engineers from applying changes simultaneously and corrupting infrastructure.

## 2. Advanced Terraform Code: AWS VPC & EKS Cluster
Here is the exact code to build an enterprise AWS VPC with public/private subnets and an EKS cluster.

### `backend.tf` (Remote State)
```hcl
terraform {
  backend "s3" {
    bucket         = "my-enterprise-tf-state-bucket"
    key            = "prod/eks-cluster/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

### `main.tf` (VPC and EKS)
```hcl
provider "aws" {
  region = "us-east-1"
}

# 1. Build a Custom VPC
resource "aws_vpc" "prod_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name = "Production-VPC"
  }
}

# 2. Build Public Subnets (For Load Balancers)
resource "aws_subnet" "public_subnet_a" {
  vpc_id                  = aws_vpc.prod_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
  tags = {
    Name                     = "Public-Subnet-A"
    "kubernetes.io/role/elb" = "1" # Required for EKS Public LoadBalancers
  }
}

# 3. Build Private Subnets (For EKS Worker Nodes - Security Best Practice)
resource "aws_subnet" "private_subnet_a" {
  vpc_id            = aws_vpc.prod_vpc.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"
  tags = {
    Name                              = "Private-Subnet-A"
    "kubernetes.io/role/internal-elb" = "1" # Required for EKS Internal LoadBalancers
  }
}

# 4. IAM Role for EKS Cluster
resource "aws_iam_role" "eks_cluster_role" {
  name = "prod-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

# 5. Build the EKS Cluster
resource "aws_eks_cluster" "prod_cluster" {
  name     = "enterprise-prod-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.public_subnet_a.id,
      aws_subnet.private_subnet_a.id
    ]
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]
}
```

## 3. Complete Implementation Commands
```bash
# 1. Initialize Terraform, downloading the AWS provider and configuring the S3 backend
terraform init

# 2. Format your HCL code to standard conventions
terraform fmt -recursive

# 3. Validate the code for syntax errors
terraform validate

# 4. Generate an execution plan, outputting it to a secure file
terraform plan -out=production.tfplan

# 5. Execute the exact plan against AWS (Takes ~15 minutes for EKS)
terraform apply -auto-approve production.tfplan

# 6. Once built, fetch the Kubernetes configuration to your local machine to connect
aws eks update-kubeconfig --region us-east-1 --name enterprise-prod-cluster
```
