# 10 — Matrix Builds and Advanced Job Control

## The problem matrix strategy solves

Imagine you need to test your application against Node.js 18, 20, and 24, on both Ubuntu and Windows. Without a matrix, that's six nearly-identical copy-pasted jobs. With a matrix, you define the *variations* once, and GitHub Actions automatically generates one job per combination.

## Basic matrix syntax

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [18, 20, 24]
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

This generates **6 jobs** (2 OS values × 3 Node versions): every combination of `os` and `node-version` runs as its own independent job, all in parallel by default, each showing up separately in the Actions UI (e.g. `test (ubuntu-latest, 18)`, `test (ubuntu-latest, 20)`, etc.).

## `include` — adding extra, specific combinations

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node-version: [18, 20]
    include:
      - os: macos-latest
        node-version: 22
        experimental: true
```

`include` adds one-off combinations on top of the cartesian product, and can also add an *extra variable* (like `experimental` here) only to specific matrix entries.

## `exclude` — removing specific combinations

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [18, 20, 24]
    exclude:
      - os: windows-latest
        node-version: 18    # skip this one specific combination
```

## `fail-fast` — stop everything on first failure, or don't

```yaml
strategy:
  fail-fast: false     # default is true
  matrix:
    node-version: [18, 20, 24]
```

- `fail-fast: true` (the default): the moment **any** matrix job fails, GitHub cancels all the other still-running matrix jobs immediately — saves compute time, but you won't see results from every combination.
- `fail-fast: false`: every matrix combination runs to completion regardless of others failing — useful when you specifically want to see *which* combinations pass/fail, not just "something failed."

## `max-parallel` — throttling concurrency

```yaml
strategy:
  max-parallel: 2
  matrix:
    node-version: [18, 20, 24, 26]
```

Limits how many matrix jobs run simultaneously — useful when you have a limited number of self-hosted runners, or want to avoid overwhelming a shared external resource (like a rate-limited API or a shared staging database) that all matrix jobs might hit.

## Dynamically generating a matrix from JSON

For very dynamic pipelines (e.g., the list of things to build is itself computed, not hardcoded), you can generate the matrix at runtime:

```yaml
jobs:
  generate-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - id: set-matrix
        run: echo "matrix=[\"app-a\", \"app-b\", \"app-c\"]" >> "$GITHUB_OUTPUT"

  build:
    needs: generate-matrix
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: ${{ fromJSON(needs.generate-matrix.outputs.matrix) }}
    steps:
      - run: echo "Building ${{ matrix.app }}"
```

This pattern (one job computes a list, a second job's matrix consumes it via `fromJSON`) is common in monorepos, where the set of things to build/test/deploy can change from run to run.

## Concurrency groups — preventing overlapping runs

Separate from matrix strategy, **concurrency** controls how many *workflow runs* (not matrix jobs) of the same kind can be active at once. This is essential for deployment workflows, where you never want two deploys racing each other.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    concurrency:
      group: deploy-production
      cancel-in-progress: true     # if a new run starts, cancel any older one still running
    steps:
      - run: echo "Deploying..."
```

`concurrency` can also be set at the **workflow level**, often using a dynamic group name based on the branch or PR number — a very common pattern for cancelling stale CI runs when new commits are pushed to the same PR:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

This means: "if commit B is pushed to a branch while commit A's workflow is still running on that same branch, cancel A's run — only B's matters now." It saves compute minutes and avoids confusing, out-of-order CI results on a fast-moving PR.

## Advanced `if:` patterns

Combining everything from files 03–05, here are patterns that come up constantly in real pipelines:

```yaml
# Run only on the default branch
if: github.ref == github.event.repository.default_branch

# Run only for tags matching a release pattern
if: startsWith(github.ref, 'refs/tags/v')

# Skip a job entirely for draft pull requests
if: github.event.pull_request.draft == false

# Run a step only when the previous step actually changed something
if: steps.check-changes.outputs.changed == 'true'

# Combine matrix value with a condition
if: matrix.os == 'ubuntu-latest' && matrix.node-version == 24

# Only deploy on manual trigger, never automatically
if: github.event_name == 'workflow_dispatch'
```

## `continue-on-error` at the matrix level

```yaml
strategy:
  fail-fast: false
  matrix:
    node-version: [18, 20, 24]
    include:
      - node-version: 26
        experimental: true
jobs:
  test:
    runs-on: ubuntu-latest
    continue-on-error: ${{ matrix.experimental == true }}
    strategy:
      matrix:
        node-version: [18, 20, 24]
        include:
          - node-version: 26
            experimental: true
    steps:
      - run: echo "Testing on Node ${{ matrix.node-version }}"
```

This lets you test against an experimental/bleeding-edge version (Node 26 here) without that one combination's failure blocking the overall pipeline status — a common pattern for "canary" or "nightly" version testing.

The next file, `11-environments-and-deployments.md`, covers GitHub Environments — the feature purpose-built for controlling and tracking deployments specifically.
