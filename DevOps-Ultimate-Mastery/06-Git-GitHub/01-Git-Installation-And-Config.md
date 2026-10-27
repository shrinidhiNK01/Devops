# Complete Guide: Git Setup & SSH Keys

## Step 1: Install Git
```bash
sudo apt update
sudo apt install git -y
```

## Step 2: Configure Global Identity
Every commit must be attributed to an author.
```bash
git config --global user.name "John Doe"
git config --global user.email "john@enterprise.com"
git config --global init.defaultBranch main
```

## Step 3: Generate SSH Keys for GitHub Authentication
Never use passwords for GitHub. Use SSH keys.
```bash
# Generate a new Ed25519 SSH key (the most secure modern algorithm)
ssh-keygen -t ed25519 -C "john@enterprise.com"

# Press Enter to save to the default location (/home/user/.ssh/id_ed25519)
# Press Enter to skip the passphrase (or enter one for extra security)

# Start the SSH agent in the background
eval "$(ssh-agent -s)"

# Add your private key to the agent
ssh-add ~/.ssh/id_ed25519

# View your PUBLIC key. Copy this entire output.
cat ~/.ssh/id_ed25519.pub
```

## Step 4: Add Key to GitHub
1. Go to GitHub.com -> Settings -> SSH and GPG keys.
2. Click **New SSH key**.
3. Paste the output from the `cat` command above.
4. Click Add SSH key.

## Step 5: Test the Connection
```bash
ssh -T git@github.com
# Expected output: "Hi John Doe! You've successfully authenticated..."
```
