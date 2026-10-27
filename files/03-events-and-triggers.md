# 03 — Events and Triggers

The `on:` key in a workflow file controls **when** it runs. This is one of the richest parts of GitHub Actions syntax, because nearly anything that happens in a repository (or on a clock) can be a trigger.

## The three broad categories of trigger

| Category | Examples | Typical use |
|----------|----------|--------------|
| **Event triggers** | `push`, `pull_request`, `release`, `issues`, `fork` | React to something that happened in the repo |
| **Schedule triggers** | `schedule` (cron syntax) | Run on a recurring timer, independent of repo activity |
| **Manual triggers** | `workflow_dispatch`, `repository_dispatch` | Run on demand, by a person or an external system |

## `push` — runs when commits are pushed

```yaml
on:
  push:
    branches:
      - main
      - 'release/**'      # wildcard: matches release/1.0, release/2.0, etc.
    tags:
      - 'v*'               # only run for tags starting with "v"
    paths:
      - 'src/**'           # only run if files under src/ changed
      - 'package.json'
```

- Without filters, `push:` (with no sub-keys) runs on every push to every branch.
- `branches` and `branches-ignore` are mutually exclusive (use one or the other, not both, for the same event).
- `paths` and `paths-ignore` let you skip running a workflow when only irrelevant files changed (e.g., skip a build workflow when only `README.md` was edited).

## `pull_request` — runs on pull request activity

```yaml
on:
  pull_request:
    branches: [main]            # only PRs targeting main
    types: [opened, synchronize, reopened]   # default types if omitted
```

Common `types` values: `opened`, `closed`, `reopened`, `synchronize` (new commits pushed to the PR), `edited`, `labeled`, `unlabeled`, `ready_for_review`.

**Important security note:** workflows triggered by `pull_request` from a fork run with **read-only** permissions and **cannot access repository secrets** by default. This is a deliberate security boundary — it stops a malicious fork from stealing your secrets through a crafted pull request. If you genuinely need secrets available during PR checks (e.g., to post a coverage report back to the PR), the conventional pattern is `pull_request_target` combined with extreme caution about never checking out and executing the PR's own code in that context. Get this wrong and you can leak secrets to an attacker — treat `pull_request_target` + secrets + untrusted checkout as a combination to avoid entirely unless you fully understand the risk.

## `schedule` — cron-based, time-driven triggers

```yaml
on:
  schedule:
    - cron: '30 0 * * *'     # every day at 00:30 UTC
    - cron: '0 9 * * 1'      # every Monday at 09:00 UTC
```

Cron syntax has five fields, always in this order:

```
┌───────────── minute (0–59)
│ ┌───────────── hour (0–23)
│ │ ┌───────────── day of month (1–31)
│ │ │ ┌───────────── month (1–12)
│ │ │ │ ┌───────────── day of week (0–6, Sunday=0)
│ │ │ │ │
* * * * *
```

Key facts about `schedule`:

- All schedule times are in **UTC**, regardless of where you or your runners are located — convert your local time accordingly.
- Scheduled workflows only run on the **default branch** of the repository.
- GitHub may delay scheduled runs during periods of high load — a `schedule` trigger is "approximately" on time, not millisecond-precise.
- Scheduled workflows are automatically disabled if the repository has had no activity for 60 days, to avoid wasting compute on abandoned repos.

## `workflow_dispatch` — manual trigger from the UI or API

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
      debug:
        description: 'Enable debug logging'
        type: boolean
        default: false
```

This adds a **"Run workflow"** button in the Actions tab, optionally with a form for input parameters. Inputs are then available inside the workflow as `${{ github.event.inputs.environment }}` (or `${{ inputs.environment }}` for reusable workflows — see file 09). This is the standard way to let a human kick off deployments, releases, or one-off maintenance jobs on demand.

## `workflow_call` — makes a workflow reusable by other workflows

```yaml
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      deploy_token:
        required: true
```

This turns a workflow into something other workflows can call like a function. Fully covered in file 09.

## `release` — runs when a release is published

```yaml
on:
  release:
    types: [published]
```

Useful for triggering "publish to package registry" or "build release binaries" pipelines exactly when a GitHub Release is created.

## `repository_dispatch` — triggered by an external system via API

```yaml
on:
  repository_dispatch:
    types: [deploy-requested]
```

This lets an outside system (another CI tool, a webhook receiver, a custom script) start your workflow by calling the GitHub REST API, useful for cross-repository or cross-system orchestration.

## Other commonly used event triggers

| Event | Fires when... |
|-------|----------------|
| `issues` | An issue is opened, edited, closed, labeled, etc. |
| `issue_comment` | A comment is added to an issue or PR |
| `fork` | Someone forks the repository |
| `create` / `delete` | A branch or tag is created/deleted |
| `watch` | Someone stars the repository |
| `discussion` | Activity on a GitHub Discussion |
| `check_run` / `check_suite` | A check run/suite is created or updated (used heavily by external CI integrations) |
| `deployment_status` | A deployment's status changes |
| `page_build` | A GitHub Pages build occurs |

## Combining multiple triggers

A single workflow can respond to several different event types at once:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
```

This workflow runs on pushes to `main`, on pull requests targeting `main`, *and* can additionally be triggered manually — all three triggers feed into the same set of jobs below.

## Conditional execution layered on top of triggers

Triggers decide *whether the workflow starts at all*. Once it has started, you can further restrict whether a specific **job** or **step** runs using the `if:` key — this is a separate, complementary mechanism covered fully in file 04 and file 10. A common combined pattern:

```yaml
on:
  pull_request:
    branches: [master]
    paths:
      - 'src/**'
      - 'package.json'

jobs:
  build:
    runs-on: ubuntu-latest
    if: github.actor == 'shrinidhink21'   # only run for this specific user's PRs
    steps:
      - uses: actions/checkout@v6
      - run: npm ci && npm run build
```

Here, the `paths` filter on the trigger means the workflow won't even start unless `src/**` or `package.json` changed, and the job-level `if:` further restricts execution to PRs authored by a specific user.

## Disabling a workflow temporarily

Sometimes you need to stop a workflow from running without deleting it. There are four ways to do this:

1. **From the repository UI:** go to the **Actions** tab → select the workflow → click the **"..."** (three dots) menu → **Disable workflow**. It stays disabled until manually re-enabled, the same way.
2. **Repository Settings:** Settings → Actions → General lets you control Actions permissions at the repository level (including disabling Actions entirely for the repo).
3. **Delete the workflow file** from `.github/workflows/` — the most permanent option.
4. **Skip an individual run via commit message:** including `[skip ci]`, `[skip actions]`, or `[no ci]` in a commit message tells GitHub to skip that specific push's CI run (this only suppresses `push`/`pull_request`-triggered runs for that one commit, not a permanent disable).

```yaml
name: Disable Workflow Demo
on:
  push:
    branches: [main]

jobs:
  disable:
    runs-on: ubuntu-latest
    steps:
      - name: Example
        run: echo "This workflow can be disabled from the Actions tab menu"
```

The next file, `04-jobs-steps-runners.md`, goes inside the `jobs:` block in detail — dependencies between jobs, conditionals, outputs, timeouts, and runner selection.
