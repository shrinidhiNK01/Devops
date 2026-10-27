#!/bin/bash
# Complete Git Workflow Automation
git init
git add .
git commit -m "Initial production commit"
git branch -M main
git remote add origin https://github.com/enterprise/repo.git
git push -u origin main
