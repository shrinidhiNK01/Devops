# 17-Terraform - Terraform Variables and Outputs

Welcome to this comprehensive guide on **Terraform Variables and Outputs**. This module is designed to take you from a complete beginner to a staff platform engineer.

---

## 1. Theory
Terraform is an infrastructure as code tool to build, change, and version cloud infrastructure safely and efficiently.

---

## 2. Architecture
Terraform parses configuration files, determines dependencies, constructs a dependency graph, and applies changes via provider APIs.

---

## 3. Diagrams
```
[Terraform Code] ---> [Terraform Init/Plan] ---> [State Database] ---> [Cloud APIs]
```

---

## 4. Source Code Configuration
```yaml
# main.tf Terraform script
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_instance" "app" {
  ami           = "ami-0123456789"
  instance_type = "t3.micro"
  tags = {
    Name = "TF-Managed-Instance"
  }
}
```

---

## 5. YAML & Dockerfiles
```yaml
# variables.tf
variable "aws_region" {
  type    = string
  default = "us-east-1"
}
```

---

## 6. Best Practices
Store state files in remote buckets (S3/GCS) with state locking enabled (DynamoDB).

---

## 7. Interview Questions
- **Q1:** What is terraform.tfstate file used for?
  *Answer:* It maps your configuration variables to real resources in the cloud and tracks metadata state.

---

## 8. Exercises
- **Exercise 1:** Install and configure a local Terraform Variables and Outputs worker node.
- **Exercise 2:** Debug container termination alerts or slow database transaction speeds.

---

## 9. Solutions
- **Solution 1:** Set configuration key/values inside standard environment parameters.
- **Solution 2:** Inspect container log files or add database indexing parameters.

---

## 10. Troubleshooting Guides
- **Issue:** State lock error.
  *Resolution:* Force unlock using terraform force-unlock <lock-id> if run crashed unexpectedly.

---

## 11. Runbooks
- **Alert:** Container resource saturation.
  *Action:* Check CPU usage, run autoscaler metrics, and scale replicas up.

---

## 12. Summary
In this chapter, we studied Terraform Variables and Outputs, reviewing platform infrastructure patterns, deployments, and troubleshooting runbooks.
