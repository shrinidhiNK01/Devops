# Complete Guide: Integrating Docker with Jenkins

Jenkins needs Docker installed on its host machine to build container images. Furthermore, the `jenkins` Linux user needs permission to run Docker commands without typing `sudo`.

## Step 1: Install Docker on the Jenkins Server

```bash
# Install Docker
sudo apt install docker.io -y

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker
```

## Step 2: Grant Jenkins Docker Permissions
By default, only `root` can run Docker commands. If a Jenkins pipeline runs `docker build`, it will fail with a "Permission Denied" error.

```bash
# Add the 'jenkins' user to the 'docker' group
sudo usermod -aG docker jenkins

# VERY IMPORTANT: You must restart Jenkins for this group change to take effect!
sudo systemctl restart jenkins
```

## Step 3: Verify the Integration
Create a simple Freestyle project in Jenkins to test it:
1. Click **New Item** -> **Freestyle project** -> Name it `Docker-Test`.
2. Scroll down to **Build Steps** -> Add **Execute shell**.
3. Paste:
```bash
docker --version
docker ps
```
4. Save and click **Build Now**.
5. Check the Console Output. If it prints the Docker version without errors, your Jenkins server is now Docker-ready!
