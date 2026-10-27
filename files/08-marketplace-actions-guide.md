# 08 — The GitHub Marketplace and Popular Actions

## What the Marketplace is

The **GitHub Marketplace** (Actions tab of github.com) is a public catalog of reusable actions that anyone can publish and anyone can use. Instead of writing automation logic from scratch, you reference someone else's packaged action with `uses:`. This is the single biggest reason GitHub Actions workflows tend to be short and readable — most common tasks ("check out my code," "set up a language runtime," "build a Docker image," "deploy to AWS") are already solved by a well-maintained existing action.

You can browse the Marketplace directly while editing a workflow in GitHub's UI: when setting up a workflow, GitHub suggests relevant actions (e.g., it recognizes a Node.js/React/Next.js project and suggests the right setup action), or you can search the Marketplace manually for a task ("deploy to S3", "slack notification", "docker build push").

## Anatomy of a `uses:` reference

```yaml
uses: actions/checkout@v6
#     └──┬──┘ └───┬────┘
#      owner/repo   version (tag, branch, or commit SHA)
```

- `actions/checkout` — `actions` is the GitHub organization (owner), `checkout` is the repository name.
- `@v6` — the version to use. This can be:
  - A **major version tag** like `@v6` (recommended for most cases — automatically gets compatible bug/security fixes as the maintainer updates the `v6` tag, without breaking changes)
  - A **specific tag** like `@v6.0.2` (more stable, but you must manually bump it to get fixes)
  - A **branch name** like `@main` (gets the latest code, including unreleased/unstable changes — generally discouraged for anything beyond personal experimentation)
  - A **full commit SHA** like `@a12b3c4...` (maximum security and reproducibility — see file 12 for why this matters)

## Three categories of action you'll encounter

| Type | How it's implemented | How you'd know |
|------|------------------------|------------------|
| **JavaScript action** | Runs directly via Node.js on the runner | Fast to start, most common type, e.g. `actions/checkout` |
| **Docker container action** | Runs inside a Docker container defined by the action | Slightly slower to start (image pull/build), but environment is fully controlled |
| **Composite action** | A YAML file that bundles several existing steps into one reusable unit | Looks/behaves just like a normal action from the outside |

File 09 covers building your own action of each type.

## Popular, widely-used actions worth knowing by name

| Action | Purpose |
|--------|---------|
| `actions/checkout` | Checks out your repository's code so later steps can access it. Used in almost every workflow. |
| `actions/setup-node` | Installs a specific Node.js version, with optional npm/yarn/pnpm caching |
| `actions/setup-python` | Installs a specific Python version, with optional pip caching |
| `actions/setup-java` | Installs a JDK distribution (Temurin, Corretto, etc.) |
| `actions/setup-go` | Installs a specific Go version |
| `actions/upload-artifact` / `actions/download-artifact` | Persist and share files between jobs/runs (file 07) |
| `actions/cache` | Manual dependency/build caching (file 07) |
| `docker/setup-buildx-action` | Sets up Docker Buildx for multi-platform image builds |
| `docker/build-push-action` | Builds a Docker image and pushes it to a registry |
| `docker/login-action` | Authenticates to a container registry (Docker Hub, GHCR, ECR, etc.) |
| `aws-actions/configure-aws-credentials` | Sets up AWS credentials, including OIDC-based short-lived auth (file 12) |
| `azure/login` | Authenticates to Azure |
| `google-github-actions/auth` | Authenticates to Google Cloud |
| `peaceiris/actions-gh-pages` | Deploys a static site build to GitHub Pages |
| `softprops/action-gh-release` | Creates a GitHub Release and attaches build artifacts to it |
| `actions/github-script` | Run arbitrary JavaScript with an authenticated GitHub API client baked in — great for custom bot-like behavior |
| `codecov/codecov-action` | Uploads test coverage reports to Codecov |
| `slackapi/slack-github-action` | Sends a notification to a Slack channel |

> Action names and exact major-version numbers shown throughout this documentation reflect what was current at the time of writing. Marketplace actions release new major versions periodically (often to bump their underlying Node.js runtime, as GitHub deprecates old Node versions for actions). Always check an action's own Marketplace/README page for its current latest tag before pinning it.

## How to evaluate a third-party action before trusting it

Since an action you `uses:` runs arbitrary code on your runner — with access to whatever secrets/permissions you've granted that job — treat adding a new third-party action with the same scrutiny you'd give a new project dependency:

1. **Who publishes it?** Actions published by `actions/*` (GitHub's own org) or well-known platform vendors (`docker/*`, `aws-actions/*`, `azure/*`) are generally lower risk than an action from an unknown individual account.
2. **Check the "Verified creator" badge.** GitHub manually verifies certain official partner organizations on the Marketplace.
3. **Look at stars, recent activity, and open issues.** An action with no commits in years and a pile of unanswered security issues is a yellow flag.
4. **Read what permissions/inputs it asks for.** An action that asks for broad `secrets` access to do something simple (like formatting text) deserves a second look.
5. **Pin to a SHA for anything sensitive**, not just a mutable tag (see file 12) — this guarantees the exact code that runs can't silently change underneath you if the upstream repository is compromised or the tag is moved.

## Using an action with inputs and reading its outputs

```yaml
- name: Setup Node.js with specific configuration
  id: setup
  uses: actions/setup-node@v6
  with:
    node-version: '24'
    cache: npm

- name: Use an output from the action
  run: echo "Node version installed: ${{ steps.setup.outputs.node-version }}"
```

Every action documents its own `inputs` (passed via `with:`) and `outputs` (read via `steps.<id>.outputs.<name>`) in its README/`action.yml` — always check the specific action's Marketplace page for the exact input/output names it supports, since they vary action to action.

## A complete example: building a React app using Marketplace actions

```yaml
name: Build My React App

on:
  push:
    branches:
      - master

jobs:
  build-react-app:
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: frontend     # if your React app lives in a subfolder

    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm install

      - name: Build React app
        run: npm run build
```

Three Marketplace actions (`checkout`, `setup-node`, and implicitly npm itself via the runner's shell) are doing almost all the heavy lifting here — the workflow author only had to wire them together and supply project-specific commands.

The next file, `09-reusable-workflows-and-custom-actions.md`, covers the flip side of this: building your *own* reusable action or workflow, instead of only consuming others'.
