# 19-Jenkins: Complete Enterprise Implementation & Theory

## 1. Deep Theory: Jenkins Declarative Pipelines
Jenkins is an automation server. The modern way to use Jenkins is "Pipeline as Code" via the `Jenkinsfile`.
- **Agent:** Where the job runs (e.g., an EC2 instance, or a dynamic Kubernetes Pod).
- **Stages:** Logical groupings of tasks (Build, Test, Deploy).
- **Steps:** The actual commands executed (sh, git, docker).

## 2. Advanced `Jenkinsfile` (Docker + ECR + Kubernetes)
Here is a "crazy" detailed, real-world Jenkinsfile that checks out code, runs Node.js tests, builds a Docker image, logs into AWS ECR, pushes the image, and deploys it to a Kubernetes cluster using dynamically generated tags.

```groovy
pipeline {
    // Run this pipeline on any available Jenkins worker node
    agent any

    // Define environment variables used throughout the pipeline
    environment {
        AWS_REGION     = 'us-east-1'
        ECR_REGISTRY   = '123456789.dkr.ecr.us-east-1.amazonaws.com'
        APP_NAME       = 'frontend-service'
        // Create a unique image tag using the Git commit hash and build number
        IMAGE_TAG      = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
    }

    stages {
        stage('Checkout Code') {
            steps {
                // Checkout the code from GitHub
                checkout scm
                echo "Building commit: ${env.GIT_COMMIT}"
            }
        }

        stage('Install & Test') {
            steps {
                // Run Node.js unit tests locally on the Jenkins worker
                sh '''
                    npm ci
                    npm run test
                '''
            }
            post {
                always {
                    // Archive JUnit test results so they appear in the Jenkins UI
                    junit 'test-results/**/*.xml'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                // Build the Docker image
                sh "docker build -t ${ECR_REGISTRY}/${APP_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Push to AWS ECR') {
            steps {
                // Securely authenticate with AWS using Jenkins Credentials
                withCredentials([
                    string(credentialsId: 'AWS_ACCESS_KEY_ID', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh '''
                        # Login to ECR
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                        
                        # Push the image
                        docker push ${ECR_REGISTRY}/${APP_NAME}:${IMAGE_TAG}
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                // Update the Kubernetes deployment to use the newly pushed image
                sh '''
                    aws eks update-kubeconfig --region ${AWS_REGION} --name my-eks-cluster
                    
                    # Update the deployment manifest dynamically using sed
                    sed -i "s|IMAGE_PLACEHOLDER|${ECR_REGISTRY}/${APP_NAME}:${IMAGE_TAG}|g" k8s/deployment.yaml
                    
                    kubectl apply -f k8s/deployment.yaml
                    kubectl rollout status deployment/${APP_NAME}
                '''
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded! The new version is live."
            // In a real setup, you would add a Slack notification step here
        }
        failure {
            echo "Pipeline FAILED. Check the logs."
        }
        always {
            // Clean up the local Docker image to save disk space on the Jenkins worker
            sh "docker rmi ${ECR_REGISTRY}/${APP_NAME}:${IMAGE_TAG} || true"
        }
    }
}
```

## 3. Implementation Steps
1. Push this `Jenkinsfile` to your Git repository's root directory.
2. In Jenkins, create a new "Multibranch Pipeline" job.
3. Point Jenkins to your Git repository URL.
4. Ensure Jenkins has the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` stored securely in its Credentials Manager.
5. Click **Build Now**. Jenkins will automatically execute every step, streaming the logs live!
