# Complete Guide: Installing Jenkins on Ubuntu 22.04

To set up Jenkins from scratch on a raw Ubuntu server, you cannot just run `apt install jenkins`. Jenkins is a Java application, so you must install the JDK, add the Jenkins repository keys, and configure the firewall.

## Step 1: Install Java (OpenJDK 17)
Jenkins requires Java to run. 

```bash
# Update the package index
sudo apt update -y

# Install OpenJDK 17
sudo apt install fontconfig openjdk-17-jre -y

# Verify Java is installed correctly
java -version
# Expected Output: openjdk version "17.0..."
```

## Step 2: Add the Jenkins Repository
Ubuntu's default repositories do not have the latest Jenkins version. We must add the official Jenkins repository.

```bash
# Download the Jenkins GPG key securely
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key

# Add the Jenkins repository to your APT sources list
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null
```

## Step 3: Install and Start Jenkins

```bash
# Update APT again so it sees the new Jenkins repository
sudo apt update -y

# Install Jenkins
sudo apt install jenkins -y

# Enable Jenkins to start automatically when the server boots
sudo systemctl enable jenkins

# Start the Jenkins service immediately
sudo systemctl start jenkins

# Check the status to ensure it is "active (running)"
sudo systemctl status jenkins
```

## Step 4: Configure the Firewall
Jenkins runs on port 8080 by default. If you are using UFW (Uncomplicated Firewall), open the port.

```bash
sudo ufw allow 8080
sudo ufw status
```

## Step 5: Get the Initial Admin Password
When Jenkins starts for the first time, it generates a secure password that you must use to unlock the web UI.

```bash
# View the initial password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
# Copy this 32-character string.
```

**Next Step:** Go to `http://<your-server-ip>:8080` in your web browser and paste this password to begin the UI setup.
