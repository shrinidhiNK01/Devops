# Complete Guide: Jenkins UI Setup & Essential Plugins

After unlocking Jenkins with the `initialAdminPassword`, you must configure the UI and install the plugins required for modern DevOps workflows.

## Step 1: Install Suggested Plugins
On the "Customize Jenkins" screen, click **Install suggested plugins**. This will automatically download:
- Git plugin (for cloning repos)
- Pipeline plugin (for Jenkinsfiles)
- Credentials Binding plugin (for secure secrets)

*Wait ~5 minutes for these to install.*

## Step 2: Create First Admin User
Do not skip this! Create a dedicated admin account:
- **Username:** `admin_devops`
- **Password:** `<secure-password>`
- **Full Name:** `DevOps Administrator`
- **Email:** `admin@enterprise.com`

Save and Continue.

## Step 3: Install Advanced Plugins (Step-by-Step)
For Docker and AWS integration, we need specific plugins.
1. Click **Manage Jenkins** -> **Plugins** -> **Available plugins**.
2. Search for and check the boxes for:
   - `Docker Pipeline` (Allows Jenkinsfiles to run inside Docker containers)
   - `Amazon Web Services SDK` (For AWS authentication)
   - `Blue Ocean` (Modern UI for visualizing pipelines)
3. Click **Install without restart**.

## Step 4: Add Global Credentials
We need to give Jenkins our AWS keys so it can push to ECR and S3.
1. Click **Manage Jenkins** -> **Credentials** -> **System** -> **Global credentials (unrestricted)**.
2. Click **Add Credentials**.
3. **Kind:** Secret text
4. **Secret:** Paste your AWS Access Key ID.
5. **ID:** `AWS_ACCESS_KEY_ID`
6. Click **Create**.
7. Repeat this process for `AWS_SECRET_ACCESS_KEY`.
