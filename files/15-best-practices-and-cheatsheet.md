# 15 — Best Practices and Cheat Sheet

## Organizational conventions worth adopting

- **One concern per workflow file.** Prefer `test.yml`, `build.yml`, `deploy.yml` over one giant `ci.yml` that tries to do everything — smaller files are easier to read, easier to trigger selectively, and easier to disable independently if needed.
- **Name jobs and steps descriptively.** `name: Run unit tests` in the Actions UI is far more useful at a glance than an unnamed step that just shows its raw `run:` command truncated.
- **Keep secrets/variables consistently named.** A convention like `STAGING_DEPLOY_TOKEN` / `PRODUCTION_DEPLOY_TOKEN` makes it obvious at a glance which environment a credential belongs to.
- **Put complex shell logic in a script file, not inline YAML.** A 40-line `run: |` block is harder to lint, test, and read than a `./scripts/deploy.sh` file checked into the repo and simply invoked from the workflow.
- **Comment non-obvious choices**, especially `if:` conditions, concurrency groups, and any SHA-pinned action (note what version the SHA corresponds to).
- **Version-control your workflow files like any other code** — review changes to `.github/workflows/` in pull requests with the same scrutiny as application code, since they can execute with real credentials.

## Performance and cost tuning checklist

1. **Use caching aggressively** for dependency installs (file 07) — this is usually the single biggest speed win for a typical build.
2. **Run jobs in parallel wherever there's no real dependency** between them — don't add `needs:` out of habit if two jobs genuinely don't depend on each other.
3. **Use `paths:` filters** on `push`/`pull_request` triggers so unrelated changes (docs, unrelated subfolders in a monorepo) don't trigger expensive pipelines.
4. **Set `concurrency` with `cancel-in-progress: true`** on CI workflows tied to a PR/branch, so superseded commits don't keep burning minutes on stale runs.
5. **Pick the cheapest runner that satisfies your needs.** Linux is dramatically cheaper than Windows or macOS per minute — don't default to macOS unless you actually need to test macOS-specific behavior.
6. **Set `timeout-minutes`** everywhere, so a hang fails fast instead of running (and billing) for hours.
7. **Avoid uploading unnecessarily large artifacts**, and set a sensible `retention-days` rather than relying on a long default, to control storage costs.
8. **Use matrix `fail-fast: true`** (the default) unless you specifically need every combination's result — it stops wasting compute the moment one combination already proves there's a problem.

## A one-page syntax cheat sheet

### Minimal skeleton

```yaml
name: My Workflow
on:
  push:
    branches: [main]
jobs:
  my-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: echo "hello"
```

### Triggers

```yaml
on:
  push:
    branches: [main]
    paths: ['src/**']
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:
    inputs:
      env:
        type: choice
        options: [staging, production]
  workflow_call:
    inputs:
      env: { type: string, required: true }
  release:
    types: [published]
```

### Jobs

```yaml
jobs:
  job-id:
    name: Display Name
    runs-on: ubuntu-latest          # or windows-latest, macos-latest, [self-hosted, ...]
    needs: [other-job]
    if: github.ref == 'refs/heads/main'
    timeout-minutes: 15
    permissions:
      contents: read
    environment:
      name: production
      url: https://example.com
    env:
      KEY: value
    outputs:
      out-name: ${{ steps.step-id.outputs.value }}
    strategy:
      fail-fast: false
      max-parallel: 2
      matrix:
        node: [18, 20]
        include: [{ os: macos-latest, node: 22 }]
        exclude: [{ node: 18, os: windows-latest }]
    defaults:
      run:
        working-directory: app
    concurrency:
      group: deploy
      cancel-in-progress: true
```

### Steps

```yaml
steps:
  - name: Display name
    id: step-id
    uses: owner/repo@v1
    with:
      input-key: value
    env:
      KEY: value
    if: success()
    continue-on-error: true
    timeout-minutes: 5
    working-directory: subfolder
    shell: bash

  - run: |
      multi
      line
      script
```

### Contexts quick reference

```
${{ github.actor }}            ${{ env.MY_VAR }}
${{ github.ref }}               ${{ vars.MY_VAR }}
${{ github.sha }}               ${{ secrets.MY_SECRET }}
${{ github.event_name }}        ${{ job.status }}
${{ runner.os }}                ${{ steps.id.outputs.x }}
${{ runner.temp }}               ${{ needs.job-id.outputs.x }}
${{ matrix.node }}               ${{ inputs.x }}
```

### Persisting data between steps/jobs

```bash
# Inside a step, to create an output another step/job can read:
echo "name=value" >> "$GITHUB_OUTPUT"

# Inside a step, to create an env var later steps in the SAME job can read:
echo "NAME=value" >> "$GITHUB_ENV"

# Inside a step, to add to PATH for later steps in the SAME job:
echo "/some/dir" >> "$GITHUB_PATH"
```

```yaml
# Job-level: declare an output so OTHER jobs can read it via needs.<job>.outputs
jobs:
  a:
    outputs:
      version: ${{ steps.v.outputs.value }}
    steps:
      - id: v
        run: echo "value=1.0" >> "$GITHUB_OUTPUT"
  b:
    needs: a
    steps:
      - run: echo "${{ needs.a.outputs.version }}"
```

### Useful built-in functions

```
contains(a, b)      startsWith(a, b)     endsWith(a, b)
format('{0}', x)    join(array, sep)     hashFiles(pattern)
toJSON(x)           fromJSON(x)
success()  failure()  cancelled()  always()
```

### Status badge for a README

```markdown
![CI](https://github.com/<owner>/<repo>/actions/workflows/<workflow-file>.yml/badge.svg)
```

## Where to go from here

This documentation set (files 01–15) covers the practical core of GitHub Actions end to end — from your very first `hello.yml` through production deployment pipelines with approval gates and OIDC-based cloud authentication. The official GitHub Actions documentation is the right place to check for anything that's evolved since these files were written (exact pricing tiers, brand-new event types, newly released official actions) — everything *structural* described here (the workflow → job → step model, triggers, contexts, environments, security patterns) is foundational and changes far more slowly than individual feature details.
