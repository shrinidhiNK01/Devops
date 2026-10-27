# Production Webapp Deployment Lab

This workspace demonstrates how to package, build, provision, and deploy a real-world multi-replica web application connecting to a PostgreSQL database on AWS.

## 📂 Project Structure

- **`app/`** — Express web service with structured database pools, health probes (`/health`), and custom UI render pages.
- **`terraform/`** — Infrastructure scripts provisioning virtual VPC networking tunnels and security gateway filters.
- **`k8s/`** — Declarative deployment and load balancing service models using readiness/liveness checks.
- **`.github/workflows/`** — Action flows automatically building images, sending payloads to ECR repositories, and applying EKS setups.

## 🛠️ How to run it locally on Ubuntu:

```bash
# 1. Install Docker and Docker Compose
sudo apt update && sudo apt install docker.io docker-compose -y

# 2. Build and run locally with a Postgres DB
docker-compose up --build
```
