# Complete Guide: Enterprise Git Branching (GitFlow)

In an enterprise, you never push directly to `main`.

## Step 1: Branching
```bash
# Create and switch to a new feature branch
git checkout -b feature/user-authentication

# Make changes to your code...

# Stage all changes
git add .

# Commit with a descriptive conventional commit message
git commit -m "feat(auth): implement JWT token generation"
```

## Step 2: Rebasing (Keeping History Clean)
Before pushing, ensure your branch is up to date with `main`.
```bash
# Fetch the latest changes from remote
git fetch origin

# Rebase your feature branch onto main (applies your commits ON TOP of main's history)
git rebase origin/main

# If there are conflicts, fix the files manually, then run:
# git add .
# git rebase --continue
```

## Step 3: Pushing and Pull Requests
```bash
# Push your branch to GitHub
git push -u origin feature/user-authentication
```
Go to GitHub and click **Create Pull Request**.

## Step 4: Hotfixes
If production breaks, create a hotfix branch directly from `main`.
```bash
git checkout main
git pull origin main
git checkout -b hotfix/database-connection
# Fix the code
git commit -m "fix(db): resolve connection pool timeout"
git push -u origin hotfix/database-connection
```
