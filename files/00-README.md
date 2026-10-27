# GitHub Actions — Complete Documentation (Beginner to Advanced)

A self-contained reference for learning and using GitHub Actions, organized as a set of standalone modules. Read them in order if you are starting from zero, or jump straight to the topic you need — each file is written to make sense on its own.

## How this documentation is organized

| # | File | What you'll learn |
|---|------|--------------------|
| 01 | `01-introduction-and-fundamentals.md` | What CI/CD is, what GitHub Actions is, why it exists, how it compares to other CI/CD tools, billing basics |
| 02 | `02-core-concepts.md` | Workflows, events, jobs, steps, runners, actions — the building-block vocabulary and how they fit together |
| 03 | `03-events-and-triggers.md` | Every way a workflow can start: push, pull_request, schedule, workflow_dispatch, release, and more |
| 04 | `04-jobs-steps-runners.md` | Job-level and step-level syntax in depth: `needs`, conditionals, timeouts, GitHub-hosted vs self-hosted runners |
| 05 | `05-environment-variables-and-contexts.md` | Environment variables, default variables, contexts (`github`, `env`, `secrets`, `matrix`...), expressions and functions |
| 06 | `06-secrets-variables-and-permissions.md` | Encrypted secrets, configuration variables, `GITHUB_TOKEN`, the `permissions` key |
| 07 | `07-artifacts-and-caching.md` | Uploading/downloading build artifacts, caching dependencies, retention policy |
| 08 | `08-marketplace-actions-guide.md` | Using actions from the Marketplace safely, popular actions explained, version pinning |
| 09 | `09-reusable-workflows-and-custom-actions.md` | `workflow_call`, composite actions, Docker actions, JavaScript actions — building your own reusable pieces |
| 10 | `10-matrix-builds-and-advanced-control.md` | Matrix strategy, `fail-fast`, `include`/`exclude`, concurrency groups, advanced `if` conditions |
| 11 | `11-environments-and-deployments.md` | GitHub Environments, protection rules, required reviewers, deployment history |
| 12 | `12-security-best-practices.md` | OpenID Connect (OIDC) cloud auth, least-privilege permissions, SHA pinning, supply-chain risks |
| 13 | `13-real-world-pipelines.md` | Full working pipelines: React, Node.js with tests, Docker build & push, deploy to GitHub Pages/cloud |
| 14 | `14-debugging-and-troubleshooting.md` | Reading logs, debug logging, re-running jobs, common errors and fixes, testing locally |
| 15 | `15-best-practices-and-cheatsheet.md` | Organization tips, naming conventions, performance/cost tuning, and a one-page syntax cheat sheet |

## Suggested learning path

**If you are completely new to CI/CD and GitHub Actions:**
Read 01 → 02 → 03 → 04 in order. By the end of file 04 you can write and trigger a basic working workflow.

**If you already know the basics and want to build real pipelines:**
Read 05 → 06 → 07 → 08, then go straight to 13 for full working examples.

**If you want to go deep / production-grade:**
Read 09 → 10 → 11 → 12, then 14 and 15 to round things out.

## Conventions used throughout these files

- All YAML examples are complete and runnable — copy them into `.github/workflows/<name>.yml` in your repository and they will work as shown (adjust branch names, secrets, and app-specific commands to match your project).
- `# comment` lines inside YAML blocks are explanations, not something GitHub Actions requires.
- Wherever a feature has changed or been renamed over time, the current recommended syntax is shown, with a short note about older equivalents you may still see in tutorials or legacy workflows.
- Action versions (like `actions/checkout@v6`) reflect the latest major versions available at the time of writing. Marketplace actions update independently of GitHub itself, so always check the action's Marketplace page for the newest tag before pinning it in a production workflow.

## Quick mental model (one paragraph)

A **repository event** (someone pushes code, opens a pull request, a clock ticks) **triggers** a **workflow** — a YAML file living in `.github/workflows/`. A workflow is made of one or more **jobs**, which by default run in parallel on separate **runners** (fresh virtual machines). Each job is a sequence of **steps**, run one after another on the same runner, and a step either runs a shell command (`run:`) or calls a reusable **action** (`uses:`). That's the entire mental model — everything else in this documentation is detail on top of that one sentence.
