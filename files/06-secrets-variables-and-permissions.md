# 06 — Secrets, Variables, and Permissions

## Why secrets exist

Workflows often need sensitive values — API keys, deployment tokens, database passwords, cloud credentials. You never want these typed directly into a YAML file (which is plain text, visible in your repository's history forever). **Secrets** solve this: they are encrypted values stored by GitHub, made available to workflows at runtime, but never visible in the GitHub UI or in logs once set.

## Where secrets can be created

| Level | Visible to | Use case |
|-------|------------|----------|
| **Repository secrets** | All workflows in that one repository | The default choice for most projects |
| **Environment secrets** | Only workflows targeting a specific named Environment (e.g., "production") | Different credentials per deployment stage |
| **Organization secrets** | Selected (or all) repositories in an organization | Shared credentials across many repos, managed centrally |

Creating a secret (repository level): **Settings → Secrets and variables → Actions → New repository secret.**

## Using a secret in a workflow

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy using a secret API key
        env:
          API_KEY: ${{ secrets.MY_API_KEY }}
        run: ./deploy.sh
```

Key behaviors:

- Secrets are automatically **redacted from logs** — if a secret's value accidentally gets printed, GitHub replaces it with `***` in the log output (note: this redaction works on exact string matches, so transformed/encoded versions of a secret can still leak — never deliberately echo a secret).
- Secrets are **not passed to workflows triggered from forked repositories** by default (see file 03's note on `pull_request` vs `pull_request_target`).
- Secrets cannot be read back through the API or UI once saved — only updated or deleted. There's no "view secret value" button, by design.

## Configuration variables (`vars`) — for non-sensitive config

Introduced as a companion to secrets, **variables** work the same way structurally (repository, environment, or organization level) but are meant for values that are *not* sensitive — things like a default region name, a feature flag, or a build target — and which therefore don't need encryption or log redaction.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Use a configuration variable
        run: echo "Deploying to region ${{ vars.DEPLOY_REGION }}"
```

Created the same way as secrets: **Settings → Secrets and variables → Actions → Variables tab.**

Rule of thumb: if leaking the value in a log or screenshot would be a security incident, it's a **secret**. If it's just configuration that happens to live outside your code, it's a **variable**.

## `GITHUB_TOKEN` — the automatic, built-in secret

Every workflow run automatically gets a special, short-lived token called `GITHUB_TOKEN`, injected without any setup on your part:

```yaml
steps:
  - name: Use the automatic token to call the GitHub API
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    run: gh issue list
```

Facts about `GITHUB_TOKEN`:

- It is scoped only to the repository the workflow runs in.
- It expires automatically when the job finishes.
- Its permissions are configurable per-workflow or per-job via the `permissions:` key (see below) — and following the principle of least privilege, you should restrict it to only what each specific job actually needs.
- Many official actions (like `actions/checkout`) use it automatically behind the scenes for routine operations like checking out code or commenting on a PR, so you often don't need to reference it explicitly at all.

## The `permissions` key — least-privilege access control

By default, `GITHUB_TOKEN` may be granted fairly broad permissions (the exact default depends on repository/organization settings). Best practice is to explicitly declare the minimum permissions a workflow or job actually needs:

```yaml
permissions:
  contents: read           # only needs to read repo contents
  pull-requests: write      # needs to comment on / label PRs
  issues: write
```

This can be set at the **workflow level** (applies to every job, unless a job overrides it) or **job level** (applies only to that job):

```yaml
jobs:
  comment-on-pr:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write    # this job specifically needs to write PR comments
      contents: read
    steps:
      - run: echo "Commenting on the PR..."
```

Common permission scopes include `contents`, `pull-requests`, `issues`, `actions`, `checks`, `deployments`, `packages`, `id-token` (needed for OIDC — see file 12), `pages`, and `statuses`. You can also set blanket access with `permissions: read-all` or lock everything down with `permissions: {}` and then opt specific jobs back in as needed.

> **Why this matters:** if a malicious or compromised third-party action runs inside your workflow, it inherits whatever permissions `GITHUB_TOKEN` has for that job. A token scoped to `contents: read` only can't do nearly as much damage as one with broad write access across the repository.

## Secrets and variables inside reusable/composite workflows

When calling a reusable workflow (file 09 covers this fully), secrets are **not inherited automatically** — you must either pass them explicitly or use the shorthand `secrets: inherit`:

```yaml
jobs:
  call-deploy:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: production
    secrets: inherit          # passes all of this caller's secrets through
    # — or, more precisely —
    secrets:
      DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

## Quick reference: secrets vs variables vs `GITHUB_TOKEN`

| | Secrets | Variables | `GITHUB_TOKEN` |
|---|---------|-----------|-----------------|
| Sensitive? | Yes — encrypted, redacted in logs | No — plain config | Yes — auto-managed |
| Set by you? | Yes, manually | Yes, manually | No — automatic, every run |
| Scope options | Repo / Environment / Org | Repo / Environment / Org | Always repo-scoped |
| Expires? | No (until you rotate/delete) | No | Yes, at end of job |
| Access syntax | `${{ secrets.NAME }}` | `${{ vars.NAME }}` | `${{ secrets.GITHUB_TOKEN }}` |

The next file, `07-artifacts-and-caching.md`, covers how to pass build outputs between jobs and speed up repeated runs by caching dependencies.
