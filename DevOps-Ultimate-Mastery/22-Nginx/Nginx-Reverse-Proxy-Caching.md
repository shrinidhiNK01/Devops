# 22-Nginx - Complete Nginx Reverse Proxy & Caching Implementation on AWS

This document provides the **exact, literal codes and commands** to set up, configure, deploy, and manage an Nginx Reverse Proxy with Caching on an AWS EC2 Ubuntu instance. 

There are no placeholders here. This is the exact step-by-step procedure you would run in your terminal.

---

## STEP 1: Launching the AWS EC2 Web Server (Terminal Commands)

First, we need a server. We will use the AWS CLI to launch an Ubuntu EC2 instance. Run these exact commands in your local terminal:

```bash
# 1. Create a Security Group to allow HTTP (80) and HTTPS (443) traffic
aws ec2 create-security-group \
    --group-name NginxProxySG \
    --description "Allow web traffic to Nginx"

# 2. Add inbound rules to the Security Group
aws ec2 authorize-security-group-ingress \
    --group-name NginxProxySG \
    --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name NginxProxySG \
    --protocol tcp --port 22 --cidr 0.0.0.0/0  # For SSH access

# 3. Launch an Ubuntu 22.04 EC2 instance
aws ec2 run-instances \
    --image-id ami-0c7217cdde317cfec \
    --count 1 \
    --instance-type t3.micro \
    --key-name MyProductionKey \
    --security-groups NginxProxySG \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Nginx-Reverse-Proxy}]'
```

*Explanation:*
* `aws ec2 create-security-group`: Provisions a firewall layer for your instance.
* `authorize-security-group-ingress`: Opens specific ports. Port 80 is required for web traffic.
* `run-instances`: Boots the virtual machine using an Ubuntu Amazon Machine Image (`ami-0c7217cdde317cfec`).

---

## STEP 2: Installing Nginx on Ubuntu

SSH into your new EC2 instance and run these exact terminal commands:

```bash
# 1. Update the APT package lists
sudo apt-update -y

# 2. Install the Nginx web server package
sudo apt-get install nginx -y

# 3. Enable Nginx to start automatically when the server boots up
sudo systemctl enable nginx

# 4. Start the Nginx service immediately
sudo systemctl start nginx

# 5. Create a directory to store the Nginx Cache files
sudo mkdir -p /var/cache/nginx
sudo chown -R www-data:www-data /var/cache/nginx
```

*Explanation:*
* `apt-get install nginx`: Downloads and installs the core Nginx binaries.
* `systemctl enable`: Creates a symlink so the OS initializes Nginx on boot.
* `mkdir -p /var/cache/nginx`: Creates the folder where cached HTML/JSON responses will be saved on the hard drive to speed up future requests.

---

## STEP 3: The Exact Nginx Configuration Code (`nginx.conf`)

Now, we write the exact source code for the Nginx Reverse Proxy. We will proxy traffic from Nginx to a backend Node.js application running on `localhost:3000`.

Run this command to edit the config file:
```bash
sudo nano /etc/nginx/nginx.conf
```

Delete everything and paste this **exact code**:

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    # Determines how many simultaneous connections one worker can handle
    worker_connections 1024;
}

http {
    # 1. Define the Cache Zone
    # - levels=1:2 creates a 2-level directory hierarchy for cache files (better performance)
    # - keys_zone=my_cache:10m allocates 10MB of RAM for cache keys (stores ~80,000 keys)
    # - max_size=1g limits the total hard drive cache size to 1 Gigabyte
    # - inactive=60m deletes cached files if they aren't accessed within 60 minutes
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;

    # Basic Settings
    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging Settings
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # The Server Block (Virtual Host)
    server {
        # Listen on standard HTTP port 80
        listen 80;
        server_name my-production-webapp.com www.my-production-webapp.com;

        location / {
            # 2. Reverse Proxy Settings
            # Forward the request to the internal backend app running on port 3000
            proxy_pass http://127.0.0.1:3000;
            
            # Pass original client IP to the backend
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            # 3. Enable Caching for this location
            proxy_cache my_cache;
            
            # Cache HTTP 200 (Success) and 302 (Redirect) responses for 10 minutes
            proxy_cache_valid 200 302 10m;
            
            # Cache HTTP 404 (Not Found) responses for 1 minute
            proxy_cache_valid 404 1m;

            # Add a custom header to tell us if the response was a cache HIT or MISS
            add_header X-Proxy-Cache $upstream_cache_status;
        }
    }
}
```

### Line-By-Line Explanation of the Code:
* `worker_processes auto;`: Tells Nginx to spawn exactly one worker process per CPU core.
* `proxy_cache_path /var/cache/nginx ...`: Initializes the caching engine. It tells Nginx where to save the files, how much RAM to use for the index (`10m`), and the max disk space (`1g`).
* `listen 80;`: Tells Nginx to accept standard web traffic.
* `proxy_pass http://127.0.0.1:3000;`: This is the core of the Reverse Proxy. When a user hits Nginx on port 80, Nginx grabs the data from the backend app on port 3000 and hands it back to the user.
* `proxy_set_header X-Real-IP ...`: By default, the backend app will think all traffic is coming from Nginx (127.0.0.1). This forwards the *actual* user's IP address so your backend code can log it or rate-limit it.
* `proxy_cache_valid 200 ... 10m;`: If the backend returns a successful page, Nginx saves it. For the next 10 minutes, if anyone else asks for that page, Nginx serves the saved copy instantly without waking up the backend.

---

## STEP 4: Validating and Applying the Configuration

After writing the file, you must validate and restart Nginx. Run these exact commands:

```bash
# 1. Test the configuration file for syntax errors
sudo nginx -t

# Example expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# 2. Reload Nginx without dropping active client connections
sudo systemctl reload nginx
```

---

## STEP 5: Version Controlling Infrastructure Code with Git

Now that you have written your `nginx.conf` and AWS scripts locally, you must save them to Git so your team can track the changes.

Run these exact Git commands in your local project folder:

```bash
# 1. Initialize an empty Git repository
git init

# 2. Check the status of your changed files
git status
# Output shows untracked files like nginx.conf and aws-launch.sh

# 3. Stage all the files to be committed
git add .

# 4. Commit the files with a detailed, descriptive message
git commit -m "feat(proxy): implement nginx reverse proxy with 10m memory cache zone"

# 5. Link your local repo to the remote GitHub repository
git remote add origin https://github.com/my-company/nginx-proxy-infra.git

# 6. Push the code to the main branch on GitHub
git push -u origin main
```

*Explanation:*
* `git init`: Sets up the `.git` tracking directory.
* `git add .`: Stages every single modified or new file.
* `git commit -m "..."`: Permanently saves a snapshot of these files in history with a human-readable tag.
* `git push`: Uploads your code to the cloud (GitHub) so CI/CD pipelines can detect it.

---

## STEP 6: Testing and Debugging

To verify that the cache is working, open your terminal and use `curl` to fetch your website:

```bash
# Make the first request
curl -I http://YOUR_EC2_PUBLIC_IP

# Expected Output Headers:
# HTTP/1.1 200 OK
# X-Proxy-Cache: MISS  <-- First time, Nginx had to fetch it from the backend

# Make the exact same request again immediately
curl -I http://YOUR_EC2_PUBLIC_IP

# Expected Output Headers:
# HTTP/1.1 200 OK
# X-Proxy-Cache: HIT   <-- Second time, Nginx served it instantly from RAM/Disk cache!
```

If it fails, view the exact error logs by running:
```bash
sudo tail -f /var/log/nginx/error.log
```
