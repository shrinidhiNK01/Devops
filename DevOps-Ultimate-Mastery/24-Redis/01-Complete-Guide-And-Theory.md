# Complete Advanced Implementation Guide: Redis

This document provides the **exact, literal codes and terminal commands** to set up, configure, version control, and deploy Redis in an AWS Production environment. There are no placeholders.

---

## 1. Version Control & Source Management (Git)

Before modifying infrastructure or code, we must track our changes. Run these exact Git commands in your terminal:

```bash
# 1. Initialize a new Git repository in your current folder
git init

# 2. Check the status to see which files are untracked
git status

# 3. Stage all new and modified files for commit
git add .

# 4. Commit the files to local history with a descriptive message
git commit -m "feat(24-redis): complete implementation and configuration for Redis"

# 5. Link to your remote GitHub repository
git remote add origin https://github.com/my-enterprise/24-redis-infra.git

# 6. Push the code to the main branch
git push -u origin main
```
*Explanation:* `git add .` prepares every file in your directory. `git commit` takes a snapshot of your code. `git push` uploads it so your CI/CD pipelines can detect the changes.

---

## 2. Local Containerization (Docker)

To run Redis consistently on any machine, we containerize it.

```bash
# 1. Build the Docker image, tagging it with the application name
docker build -t 24-redis-app:v1.0.0 .

# 2. List all local images to verify the build was successful
docker images | grep 24-redis-app

# 3. Run the container in detached mode (-d), mapping port 8080 to 8080
docker run -d --name 24-redis-container -p 8080:8080 24-redis-app:v1.0.0

# 4. Check the logs to ensure the application started successfully
docker logs -f 24-redis-container
```
*Explanation:* `docker build` reads the `Dockerfile` in the current directory. `docker run` starts the isolated process.

---

## 3. Cloud Infrastructure Provisioning (AWS CLI)

If you are deploying Redis manually to AWS without Terraform, use the AWS CLI.

```bash
# 1. Create a Security Group for Redis
aws ec2 create-security-group \
    --group-name 24-redis-SG \
    --description "Allow web traffic for Redis"

# 2. Open HTTP and SSH ports
aws ec2 authorize-security-group-ingress --group-name 24-redis-SG --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name 24-redis-SG --protocol tcp --port 22 --cidr 0.0.0.0/0

# 3. Launch an EC2 instance to host Redis
aws ec2 run-instances \
    --image-id ami-0c7217cdde317cfec \
    --count 1 \
    --instance-type t3.medium \
    --key-name ProductionKey \
    --security-groups 24-redis-SG \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=24-redis-Server}]'
```
*Explanation:* These commands provision the raw compute and firewall resources in the cloud.

---

## 4. Infrastructure As Code (Terraform)

For automated cloud provisioning, use Terraform. Create a `main.tf` file and execute:

```bash
# 1. Initialize Terraform (downloads AWS provider plugins)
terraform init

# 2. Validate the syntax of your .tf files
terraform validate

# 3. Preview the infrastructure changes Terraform will make
terraform plan -out=tfplan

# 4. Apply the exact plan to AWS automatically
terraform apply -auto-approve tfplan
```
*Explanation:* Terraform is declarative. `init` sets up the environment, `plan` compares your code to AWS, and `apply` builds it.

---

## 5. Container Orchestration (Kubernetes)

To deploy Redis in an enterprise EKS cluster, use `kubectl`.

```bash
# 1. Connect kubectl to your AWS EKS cluster
aws eks update-kubeconfig --region us-east-1 --name production-cluster

# 2. Apply the Deployment manifest
kubectl apply -f kubernetes/deployment.yaml

# 3. Apply the Service manifest (creates an AWS Load Balancer)
kubectl apply -f kubernetes/service.yaml

# 4. Check the status of your Pods
kubectl get pods -l app=24-redis -o wide

# 5. Check the status of the LoadBalancer to get the public URL
kubectl get svc 24-redis-service

# 6. Stream logs from all replicas simultaneously
kubectl logs -f -l app=24-redis --all-containers=true
```
*Explanation:* `kubectl apply` sends your YAML files to the Kubernetes API server, which then schedules your Redis containers onto AWS EC2 worker nodes.

---

## 6. End-to-End Testing

Test your deployment to ensure Redis is fully operational.

```bash
# 1. Hit the healthcheck endpoint via curl
curl -i http://$(kubectl get svc 24-redis-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')/health

# Expected Output:
# HTTP/1.1 200 OK
# {"status": "UP", "service": "Redis"}
```

## Summary
By running the commands above, you have version-controlled the source, built a container, provisioned cloud infrastructure, deployed via Kubernetes, and tested the application. This is the complete, advanced lifecycle.
