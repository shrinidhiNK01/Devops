# 01 — Introduction and Fundamentals

## What is CI/CD?

CI/CD stands for **Continuous Integration** and **Continuous Delivery/Deployment**. It is a set of practices that automate the steps between writing code and getting it safely into production.

- **Continuous Integration (CI):** every time someone pushes code, it is automatically built and tested. This catches bugs and conflicts early, instead of discovering them weeks later when several people's changes collide.
- **Continuous Delivery (CD):** every change that passes CI is automatically packaged into a release that is *ready* to be deployed, often requiring a manual approval click to actually go live.
- **Continuous Deployment (also CD):** the same as delivery, but with no manual approval step — passing all checks automatically means it ships to production.

Before CI/CD became common, teams would manually build, test, and deploy code, often only right before a release. This was slow, error-prone, and made it hard to know which change broke something. CI/CD turns that manual ritual into an automated, repeatable pipeline that runs the same way every single time.

## What is GitHub Actions?

GitHub Actions is GitHub's built-in automation and CI/CD platform. It lets you define workflows that automatically run in response to events in your repository — a push, a pull request, a new issue, a tag, a schedule, or a manual button click.

It works like a **virtual assistant for developers**: you describe *what* should happen and *when*, and GitHub provides the compute (or you provide your own) to actually do it.

Typical things teams automate with GitHub Actions:

- Running automated tests on every push or pull request
- Linting and formatting checks
- Building applications (React, Node.js, Java, Python, Go, etc.)
- Building and pushing Docker images
- Deploying to servers, cloud platforms, or GitHub Pages
- Auto-labeling issues and pull requests
- Sending notifications to Slack/Discord/email
- Running scheduled jobs (database backups, report generation, dependency checks)
- Automatically creating releases and changelogs

## Why GitHub Actions exists / why teams adopt it

- **It lives where your code already lives.** No separate CI server to provision, patch, or maintain — workflows are just files in your repository.
- **Improves code quality.** Automated tests and checks run on every change, so broken code is caught before it merges.
- **Auto deployment.** Once configured, code can flow from commit to production with no manual steps.
- **Scalable and secure.** GitHub provides fresh, isolated virtual machines for every run, and you can also bring your own infrastructure (self-hosted runners) when you need to.
- **Event-driven by design.** Anything that happens in the repository (or on a clock) can trigger automation — there is no need to poll or manually kick off a build.
- **Huge ecosystem.** The GitHub Marketplace has thousands of pre-built, reusable "actions" so you rarely write automation from scratch.

## How GitHub Actions compares to other CI/CD tools

| Tool | Where it lives | Config format | Notes |
|------|----------------|----------------|-------|
| **GitHub Actions** | Built into GitHub | YAML in `.github/workflows/` | Tightest integration if your code is already on GitHub; huge Marketplace |
| **Jenkins** | Self-hosted server | `Jenkinsfile` (Groovy-based) | Extremely flexible and plugin-driven, but you must host/maintain the server yourself |
| **GitLab CI/CD** | Built into GitLab | `.gitlab-ci.yml` | Same "integrated" philosophy as GitHub Actions, but for GitLab repositories |
| **CircleCI** | Hosted SaaS, connects to GitHub/GitLab/Bitbucket | `.circleci/config.yml` | Popular for advanced caching/parallelism; separate platform from your git host |
| **Travis CI** | Hosted SaaS | `.travis.yml` | One of the earliest hosted CI tools; less dominant today than it once was |
| **Azure Pipelines** | Microsoft Azure DevOps | YAML or classic UI | Strong choice if you're already deep in the Azure/Microsoft ecosystem |

The biggest practical reason teams pick GitHub Actions is simply that if your code is already hosted on GitHub, there is zero extra infrastructure to set up — automation is "just there" as soon as you add a YAML file.

## Where workflow files live

Every GitHub Actions workflow is a `.yml` (or `.yaml`) file stored in a fixed location in your repository:

```
your-repo/
└── .github/
    └── workflows/
        ├── build.yml
        ├── test.yml
        └── deploy.yml
```

You can have as many workflow files as you want in that folder. Each file is an independent workflow with its own name, triggers, and jobs. GitHub automatically detects any `.yml`/`.yaml` file placed in `.github/workflows/` — there is no separate registration step.

> **Why is it called YAML?** YAML is a recursive backronym for "YAML Ain't Markup Language." It's a human-readable data format built around indentation, used because it's far less noisy than XML or JSON for configuration files. The most important rule to remember: **indentation is meaningful** — two spaces (never tabs) is the conventional indent size in GitHub Actions workflows, and inconsistent indentation is the single most common source of "my workflow won't even start" bugs.

## Operating systems and platforms supported

GitHub-hosted runners are available for:

- **Linux** (Ubuntu — the default and cheapest choice for most jobs)
- **Windows**
- **macOS**

You choose the operating system per job using the `runs-on` key, which means a single workflow can run different jobs on different operating systems simultaneously (useful for testing cross-platform software).

## Billing and usage basics

GitHub Actions minutes and storage are billed differently depending on your plan and whether your repository is public or private:

- **Public repositories** generally get GitHub-hosted runner minutes at no cost.
- **Private repositories** on Free, Pro, Team, and Enterprise plans include a monthly allotment of free minutes, with usage beyond that allotment billed per minute. Minute costs also vary by operating system — Linux runners are the cheapest, Windows costs more, and macOS costs the most per minute, because Apple hardware is more expensive to provision.
- **Self-hosted runners** (machines you provide yourself) do not consume GitHub-hosted runner minutes at all — you only pay for your own infrastructure.

Because exact free-tier minute allotments, per-OS multipliers, and pricing tiers are updated by GitHub periodically, treat any specific number you read elsewhere as a snapshot in time and check GitHub's official Billing documentation/pricing page for the current numbers before budgeting a production pipeline around them.

## A first complete workflow

This is the simplest possible "hello world" workflow — useful as a sanity check that Actions is enabled and working on your repository:

```yaml
name: Hello World

on:
  push:
    branches: [main]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: Say hello
        run: echo "Hello from GitHub Actions!"
```

How to add it:

1. In your repository, go to the **Actions** tab.
2. Click **"set up a workflow yourself"** (or create the file manually).
3. Save it as `.github/workflows/hello.yml` with the content above.
4. Commit the change.
5. Push to the `main` branch — the workflow runs automatically, and you can watch its progress live under the **Actions** tab.

The next file, `02-core-concepts.md`, breaks down exactly what each line in this file means and introduces the full vocabulary you'll use for everything else in this documentation.
