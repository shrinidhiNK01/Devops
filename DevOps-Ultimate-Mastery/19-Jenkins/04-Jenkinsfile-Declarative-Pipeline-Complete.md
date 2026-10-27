# Complete Guide: Writing the Master Jenkinsfile

Here is the exact code for a complete, end-to-end Declarative Pipeline.

Create a file named `Jenkinsfile` in the root of your GitHub repository:

```groovy
pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "my-enterprise-app"
        // Use the Jenkins build number to uniquely tag images
        TAG = "1.0.${env.BUILD_ID}" 
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                // Pulls the code from the Git repository linked to this job
                checkout scm
                echo "Code checkout successful."
            }
        }

        stage('2. Run Security Scan (SAST)') {
            steps {
                // Example: Running SonarQube or Trivy scanner
                echo "Running security scanner..."
                sh 'trivy fs --exit-code 1 --severity CRITICAL .'
            }
        }

        stage('3. Build Docker Image') {
            steps {
                echo "Building image: ${DOCKER_IMAGE}:${TAG}"
                sh 'docker build -t ${DOCKER_IMAGE}:${TAG} .'
            }
        }

        stage('4. Push to AWS ECR') {
            steps {
                // Uses the Credentials we configured in the UI!
                withCredentials([
                    string(credentialsId: 'AWS_ACCESS_KEY_ID', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh '''
                        aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
                        
                        docker tag ${DOCKER_IMAGE}:${TAG} 123456789.dkr.ecr.us-east-1.amazonaws.com/${DOCKER_IMAGE}:${TAG}
                        
                        docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/${DOCKER_IMAGE}:${TAG}
                    '''
                }
            }
        }
    }
    
    post {
        always {
            // Clean up the Jenkins server hard drive to prevent disk space issues
            sh 'docker system prune -f'
        }
        failure {
            echo "Pipeline Failed! Sending Slack alert..."
        }
    }
}
```
