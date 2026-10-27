# 10-AWS: Complete Enterprise Implementation & Theory

## 1. Deep Theory: AWS Architecture & IAM
AWS uses a highly decentralized service model, protected entirely by IAM (Identity and Access Management). Every API call to AWS must be signed by an IAM credential.
- **Regions:** Geographically distinct data centers (e.g., `us-east-1` N. Virginia).
- **Availability Zones (AZs):** Distinct data centers within a region, connected by low-latency fiber. If an entire AZ floods or loses power, the other AZs remain online.

## 2. Advanced IAM Policy & S3 Bucket Configuration
Here is an incredibly detailed, highly secure AWS CLI implementation to create an S3 bucket with versioning, encryption, and a strict bucket policy forcing HTTPS.

```bash
#!/bin/bash

# Define variables
BUCKET_NAME="enterprise-secure-finance-data-2026"
REGION="us-east-1"

# 1. Create the S3 Bucket
aws s3api create-bucket     --bucket $BUCKET_NAME     --region $REGION

# 2. Enable Bucket Versioning (Protects against accidental deletion/overwrites)
aws s3api put-bucket-versioning     --bucket $BUCKET_NAME     --versioning-configuration Status=Enabled

# 3. Enable Default Encryption (SSE-S3 with AES256)
# Every file uploaded will be automatically encrypted at rest
aws s3api put-bucket-encryption     --bucket $BUCKET_NAME     --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'

# 4. Block ALL Public Access (Crucial Security Step)
aws s3api put-public-access-block     --bucket $BUCKET_NAME     --public-access-block-configuration '{
        "BlockPublicAcls": true,
        "IgnorePublicAcls": true,
        "BlockPublicPolicy": true,
        "RestrictPublicBuckets": true
    }'

# 5. Apply a Bucket Policy that strictly DENIES any non-HTTPS requests
cat << 'EOF' > enforce-https-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceHTTPSOnly",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::enterprise-secure-finance-data-2026",
        "arn:aws:s3:::enterprise-secure-finance-data-2026/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-policy     --bucket $BUCKET_NAME     --policy file://enforce-https-policy.json

echo "Secure S3 Bucket $BUCKET_NAME successfully provisioned!"
```

## 3. Running the Implementation
Copy the bash script above into a file named `secure_s3.sh`.

```bash
# 1. Make the script executable
chmod +x secure_s3.sh

# 2. Run the script
./secure_s3.sh

# 3. Test the security (Try to upload a file without encryption over standard HTTP - It will fail!)
aws s3 cp my_secret.txt s3://enterprise-secure-finance-data-2026/ --endpoint-url http://s3.amazonaws.com
# Expected output: AccessDenied (Because our policy requires HTTPS aws:SecureTransport=true)
```
