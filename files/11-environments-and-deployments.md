# 11 — Environments and Deployments

## What a GitHub "Environment" is

A GitHub **Environment** (Settings → Environments) is a named deployment target — `staging`, `production`, `qa`, etc. — that you can attach rules and secrets to. It exists specifically to add safety and visibility around deployment jobs, on top of everything covered in earlier files.

Without environments, a `deploy` job is just a job like any other. With environments, you get:

- **Environment-scoped secrets and variables** — a `production` environment can have a different `DEPLOY_TOKEN` than `staging`, even though both live in the same repository.
- **Protection rules** — require manual approval, restrict which branches can deploy, or add a wait timer before a deployment proceeds.
- **Deployment history** — a dedicated view of every deployment to that environment, with status and the commit deployed.

## Declaring an environment in a workflow

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://myapp.example.com   # optional, shown as a clickable link on the run summary
    steps:
      - name: Deploy
        env:
          TOKEN: ${{ secrets.DEPLOY_TOKEN }}   # resolved from the "production" environment's secrets
        run: ./deploy.sh
```

The first time a workflow references an environment name that doesn't exist yet, GitHub creates it automatically (with no protection rules) — though for anything beyond a hobby project, you'll want to configure protection rules explicitly ahead of time.

## Protection rules

Configured in **Settings → Environments → [environment name]**:

### Required reviewers

```
Required reviewers: @release-managers, @jane-doe
```

When a job targets this environment, it **pauses** before running and waits for one of the listed reviewers to manually approve it from the Actions UI. This is the standard way to add a human gate before production deployments, without needing a separate approval tool.

### Wait timer

A configurable delay (e.g., 10 minutes) before the deployment job is allowed to proceed — useful as a "cool-down" window where someone could still cancel a deploy after merging, before it actually goes live.

### Deployment branch/tag restrictions

Restricts which branches (or tags) are allowed to deploy to this environment at all — e.g., only `main` can deploy to `production`, while any branch can deploy to a `preview` environment. A job that tries to use a restricted environment from a disallowed branch fails immediately with a clear error, rather than silently deploying from the wrong branch.

## A realistic two-stage deployment pipeline

```yaml
name: Deploy Pipeline
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: build/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: build/
      - env:
          TOKEN: ${{ secrets.STAGING_DEPLOY_TOKEN }}
        run: ./deploy.sh staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production           # configured with required reviewers
      url: https://example.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: build/
      - env:
          TOKEN: ${{ secrets.PRODUCTION_DEPLOY_TOKEN }}
        run: ./deploy.sh production
```

Here, `deploy-production` will pause and wait for manual approval (because the `production` environment has required reviewers configured), while `deploy-staging` runs automatically the moment `build` finishes. The same artifact (built once) flows through both stages — you never rebuild between staging and production, which guarantees you're deploying the exact same bits you tested in staging.

## Viewing deployment history

Every job that targets an environment shows up under **repository → Environments → [environment name]**, with a chronological list of deployments, their status, who approved them (if required reviewers were configured), and a link back to the workflow run and commit. This gives you an audit trail independent of digging through Actions logs — particularly valuable for compliance or incident investigation ("what was actually deployed to production last Tuesday, and who approved it?").

## Environments vs. plain job-level `if:` branch checks

A common beginner question: "why use an Environment instead of just `if: github.ref == 'refs/heads/main'`?" They solve different problems:

- `if:` conditions are **logic** — they decide whether a job runs at all, evaluated entirely within the workflow file.
- **Environments** add **governance** — secrets scoping, required human approval, and audit history — independent of (and in addition to) whatever `if:` logic you've written. A production deploy job typically uses both: an `if:` to make sure it doesn't even attempt to run from the wrong branch, *and* an `environment:` to add the approval gate and environment-scoped credentials.

The next file, `12-security-best-practices.md`, covers hardening your workflows against the most common real-world attack patterns.
