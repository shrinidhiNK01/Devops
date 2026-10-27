# Production Security Hardening: AWS, Linux, Docker, Kubernetes, CI/CD, Secrets, Network, And Incident Response

## Phase 1: What Are We Building?

We are building a security baseline for production systems:

1. AWS account security.
2. IAM least privilege.
3. Linux server hardening.
4. Docker image hardening.
5. Kubernetes hardening.
6. Secrets management.
7. CI/CD security.
8. Network security.
9. Logging and audit.
10. Incident response.

## Phase 2: Why Does It Exist?

Security prevents accidental leaks, unauthorized access, privilege escalation, data theft, and outages caused by compromised systems.

## Phase 3: Real World Use Case

A company stores user profiles, orders, payments, and access tokens. Engineers must protect infrastructure from public exposure, leaked secrets, vulnerable containers, excessive permissions, and weak deployment controls.

## Phase 4: Architecture Diagram

```mermaid
flowchart TD
    User["Human User with MFA"] --> SSO["SSO / IAM Identity Center"]
    SSO --> Role["Least Privilege IAM Role"]
    Role --> AWS["AWS Resources"]
    CI["CI/CD"] --> Registry["Scanned Container Registry"]
    Registry --> K8s["Hardened Kubernetes"]
    Secrets["Secrets Manager"] --> K8s
    K8s --> PrivateDB["Private Database"]
    Logs["Audit Logs"] --> SIEM["Security Monitoring"]
```

## Phase 5: Prerequisites

You need:

1. AWS account.
2. GitHub account.
3. Docker.
4. Kubernetes.
5. Terraform.

## Phase 6: AWS Account Hardening

### Root User

Console steps:

1. Open `https://console.aws.amazon.com`.
2. Sign in as root.
3. Click account name.
4. Click `Security credentials`.
5. Confirm MFA is assigned.
6. Delete root access keys if any exist.
7. Sign out.
8. Use IAM Identity Center or IAM admin user for daily work.

### IAM Password Policy

AWS CLI:

```bash
aws iam update-account-password-policy \
  --minimum-password-length 14 \
  --require-symbols \
  --require-numbers \
  --require-uppercase-characters \
  --require-lowercase-characters \
  --allow-users-to-change-password \
  --max-password-age 90 \
  --password-reuse-prevention 12 \
  --profile learning-admin
```

Purpose:
Enforces strong passwords for IAM users.

Common error:

```text
AccessDenied
```

Fix:
Use an admin role or user with IAM permissions.

## Phase 7: IAM Least Privilege

Bad policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}
```

Why bad:
It allows every action on every resource.

Better read-only S3 policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::company-reports"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::company-reports/*"
    }
  ]
}
```

Validate identity:

```bash
aws sts get-caller-identity --profile learning-admin
```

## Phase 8: Secrets Management

Never store this in Git:

```text
DATABASE_PASSWORD=supersecret
STRIPE_SECRET_KEY=sk_live_xxx
AWS_SECRET_ACCESS_KEY=xxx
```

Use AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name dev/orders-api/database-url \
  --secret-string "postgresql+psycopg://orders:strong-password@host:5432/orders" \
  --profile learning-admin
```

Read secret:

```bash
aws secretsmanager get-secret-value \
  --secret-id dev/orders-api/database-url \
  --profile learning-admin
```

Production Kubernetes pattern:

1. Store secret in AWS Secrets Manager.
2. Install External Secrets Operator.
3. Create ExternalSecret.
4. Pod reads Kubernetes Secret created by operator.

ExternalSecret example:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: orders-api-secrets
  namespace: orders
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: ClusterSecretStore
  target:
    name: orders-api-secrets
  data:
    - secretKey: database-url
      remoteRef:
        key: dev/orders-api/database-url
```

## Phase 9: Docker Hardening

Bad Dockerfile:

```dockerfile
FROM python:latest
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
```

Problems:

1. Uses `latest`.
2. Copies everything.
3. Runs as root.
4. No dependency pinning.

Better Dockerfile:

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN adduser --disabled-password --gecos "" appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Scan:

```bash
docker scout cves orders-api:1.0
```

## Phase 10: Kubernetes Hardening

Secure Deployment example:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: secure-api
  template:
    metadata:
      labels:
        app: secure-api
    spec:
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: orders-api:1.0
          securityContext:
            runAsUser: 1000
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: orders-api-allow-ingress
  namespace: orders
spec:
  podSelector:
    matchLabels:
      app: orders-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8000
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: database
      ports:
        - protocol: TCP
          port: 5432
```

## Phase 11: CI/CD Security

Pipeline requirements:

1. Pull request required.
2. Branch protection enabled.
3. Tests required.
4. Secrets stored in CI credential manager.
5. Container scan required.
6. Deploy role has limited permissions.
7. Production deploy requires approval.

GitHub branch protection steps:

1. Open repository.
2. Click `Settings`.
3. Click `Branches`.
4. Click `Add branch protection rule`.
5. Branch name pattern: `main`.
6. Enable `Require a pull request before merging`.
7. Enable `Require status checks to pass`.
8. Select CI checks.
9. Enable `Do not allow bypassing`.
10. Click `Create`.

## Phase 12: Network Security

Rules:

1. Public subnets contain load balancers and NAT gateways.
2. Private subnets contain app nodes.
3. Isolated/private subnets contain databases.
4. Databases do not allow `0.0.0.0/0`.
5. Redis is never public.
6. Security groups allow only required ports.

Bad security group:

```text
Port 5432 open to 0.0.0.0/0
```

Fix:
Allow PostgreSQL only from app security group.

## Phase 13: Audit Logging

AWS:

```bash
aws cloudtrail describe-trails --profile learning-admin
aws cloudtrail get-trail-status --name account-audit-trail --profile learning-admin
```

Kubernetes:

```bash
kubectl auth can-i create pods
kubectl auth can-i delete secrets --as system:serviceaccount:orders:orders-api
```

GitHub:

1. Open organization.
2. Open `Settings`.
3. Open `Audit log`.
4. Search for repository, user, or action.

## Phase 14: Incident Response

If a secret leaks:

1. Revoke secret immediately.
2. Rotate credential.
3. Search logs for usage.
4. Check CloudTrail for suspicious calls.
5. Remove secret from Git history if required.
6. Add secret scanning.
7. Write incident timeline.
8. Add prevention control.

AWS key leak commands:

```bash
aws iam update-access-key \
  --user-name USERNAME \
  --access-key-id ACCESS_KEY_ID \
  --status Inactive \
  --profile learning-admin
```

Then delete after confirming replacement:

```bash
aws iam delete-access-key \
  --user-name USERNAME \
  --access-key-id ACCESS_KEY_ID \
  --profile learning-admin
```

## Monitoring

Security monitoring alerts:

1. Root login.
2. IAM policy changed.
3. Security group opened to world.
4. CloudTrail stopped.
5. Failed login spike.
6. Secret accessed unusually.
7. Container running as root.

## Debugging

Access denied:

```bash
aws sts get-caller-identity
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/admin-cli \
  --action-names s3:ListBucket \
  --resource-arns arn:aws:s3:::example-bucket
```

Kubernetes forbidden:

```bash
kubectl auth can-i get pods --namespace orders
kubectl auth can-i get secrets --namespace orders
```

## Scaling

Security must scale through:

1. SSO.
2. Groups, not individual permissions.
3. Policy as code.
4. Automated scanning.
5. Centralized logs.
6. Standard modules.

## Cost Optimization

1. Retain security logs long enough for compliance.
2. Use lifecycle rules for old logs.
3. Avoid sending noisy debug logs to expensive storage.
4. Use managed security services only where they reduce operational risk.

## Enterprise Architecture

Enterprise security includes:

1. Separate AWS accounts.
2. Organization SCPs.
3. Central audit account.
4. Central logging account.
5. SSO.
6. CloudTrail organization trails.
7. GuardDuty.
8. Security Hub.
9. Vulnerability scanning.
10. Incident response process.

## Interview Questions

1. What is least privilege?
2. Why should databases be private?
3. Why is base64 not real secret encryption?
4. Why avoid root containers?
5. What is a NetworkPolicy?
6. What should you do after a secret leaks?

## Exercises

1. Enable root MFA.
2. Create a least privilege policy.
3. Harden a Dockerfile.
4. Add Kubernetes securityContext.
5. Add a NetworkPolicy.
6. Store a secret in AWS Secrets Manager.

## Solutions

Security baseline is working when:

```bash
aws sts get-caller-identity --profile learning-admin
aws cloudtrail describe-trails --profile learning-admin
docker scout cves orders-api:1.0
kubectl auth can-i get pods --namespace orders
kubectl apply -f network-policy.yaml
```

