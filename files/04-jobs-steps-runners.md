# 04 — Jobs, Steps, and Runners in Depth

## Jobs: the unit of parallel execution

Every job runs in its own fresh runner instance, completely isolated from every other job — they don't share filesystem, memory, or installed tools unless you explicitly pass data between them (via artifacts, outputs, or caching).

### Default behavior: parallel, independent jobs

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Linting..."

  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Testing..."
```

Both `lint` and `test` start at roughly the same time and run independently. Neither waits for the other.

### Making jobs run in sequence with `needs`

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Building..."

  deploy:
    needs: build              # deploy waits for build to succeed first
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying..."
```

- `needs:` accepts a single job ID or a list: `needs: [build, test]`.
- If a needed job fails, dependent jobs are skipped by default (you can override this with `if: always()` or `if: failure()`, covered below).
- `needs:` is how you build a DAG (directed acyclic graph) of jobs — e.g., `build` → `test` → `deploy`, where `deploy` only runs after both upstream jobs succeed.

### Passing data between jobs with `outputs`

Because each job is a separate runner, you can't just set a shell variable in one job and read it in another — you must explicitly declare **job outputs**.

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.get_version.outputs.value }}
    steps:
      - id: get_version
        run: echo "value=1.2.3" >> "$GITHUB_OUTPUT"

  build:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - run: echo "Building version ${{ needs.setup.outputs.version }}"
```

This two-step pattern — a step sets an output via `$GITHUB_OUTPUT`, the job exposes it under `outputs:`, then a downstream job reads it via `needs.<job_id>.outputs.<name>` — is the standard way to share small pieces of data (version numbers, computed flags, file lists) across jobs.

## Step-level syntax

A step is either a **command** or an **action call**:

```yaml
steps:
  - name: Run a shell command           # "run" style
    run: echo "Hello"

  - name: Call a reusable action        # "uses" style
    uses: actions/checkout@v6
    with:
      fetch-depth: 0                    # inputs passed to the action

  - name: Give this step an ID so later steps can reference its output
    id: my_step
    run: echo "result=42" >> "$GITHUB_OUTPUT"

  - name: Use the previous step's output
    run: echo "Got ${{ steps.my_step.outputs.result }}"
```

### Multi-line commands

```yaml
- name: Multiple commands
  run: |
    echo "Step 1"
    echo "Step 2"
    npm test
```

### Choosing a shell explicitly

```yaml
- name: Run PowerShell on a Windows runner
  shell: pwsh
  run: Write-Output "Hello from PowerShell"
```

Default shells: `bash` on Linux/macOS, `pwsh` (PowerShell) on Windows — but every step can override this with `shell:`.

### `working-directory`

```yaml
- name: Run npm install from a subfolder
  working-directory: frontend
  run: npm install
```

Or set it once for every step in a job using `defaults`:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - run: npm install     # automatically runs inside ./frontend
      - run: npm run build
```

### `continue-on-error`

```yaml
- name: A flaky step that shouldn't block the pipeline
  run: ./run-flaky-script.sh
  continue-on-error: true
```

The job is still reported as successful even if this step fails — useful for optional/experimental checks you don't want to be blocking.

### `timeout-minutes`

Applies at the job level or the step level:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15        # whole job is killed if it exceeds 15 minutes
    steps:
      - name: A single long step
        timeout-minutes: 5     # this step alone is killed if it exceeds 5 minutes
        run: ./long-task.sh
```

Always set a sensible job-level `timeout-minutes` in production workflows — without one, a hung job can run (and burn billable minutes) for up to GitHub's default maximum (several hours) before being force-stopped.

## Conditional execution with `if:`

`if:` can appear on a **job** or a **step**, and accepts any valid GitHub Actions expression.

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main'      # only deploy from main
    runs-on: ubuntu-latest
    steps:
      - name: Only run on Linux runners
        if: runner.os == 'Linux'
        run: echo "Linux-specific step"

      - name: Always run, even if a previous step failed
        if: always()
        run: echo "Cleanup"

      - name: Only run if a previous step failed
        if: failure()
        run: echo "Notify failure"

      - name: Only run if everything before succeeded (this is also the implicit default)
        if: success()
        run: echo "All good"
```

Built-in status-check functions for `if:`:

| Function | True when... |
|----------|---------------|
| `success()` | No previous step/job has failed (this is the **default** condition if you omit `if:` entirely) |
| `failure()` | At least one previous step/job in the same job/workflow has failed |
| `cancelled()` | The workflow run was cancelled |
| `always()` | Unconditionally true — runs no matter what happened before |

A frequent beginner trap: once a step fails, GitHub Actions skips all subsequent steps in that job *unless* their `if:` explicitly includes `always()` or `failure()`. This is why cleanup/notification steps almost always need `if: always()`.

## Runners: GitHub-hosted vs self-hosted

### GitHub-hosted runners

```yaml
runs-on: ubuntu-latest      # most common, cheapest, fastest to start
runs-on: ubuntu-22.04       # pin to a specific OS version instead of "latest"
runs-on: windows-latest
runs-on: macos-latest
runs-on: ubuntu-latest-16-cores    # a larger, more powerful hosted runner (paid tier)
runs-on: ubuntu-24.04-arm          # Arm-architecture hosted runner
```

GitHub-hosted runners are fresh, ephemeral virtual machines:

- Provisioned on demand for every job, destroyed immediately after.
- Come pre-installed with a large set of common tools (Node.js, Python, Java, Docker, common CLIs) — but tool versions change over time, so pin a specific version with a `setup-*` action (e.g., `actions/setup-node`) rather than relying on whatever happens to be pre-installed.
- `-latest` labels (`ubuntu-latest`, `windows-latest`, `macos-latest`) point to whichever OS version GitHub currently considers the stable default — this can change over time, which is usually fine but can occasionally introduce surprises in very environment-sensitive builds. Pin an explicit version (e.g., `ubuntu-22.04`) if you need long-term stability.

### Self-hosted runners

```yaml
runs-on: [self-hosted, linux, x64]
runs-on: [self-hosted, gpu]
```

A self-hosted runner is any machine you register yourself (on-prem server, your own cloud VM, even a personal laptop for testing) by installing GitHub's runner agent and connecting it to your repository, organization, or enterprise.

Use self-hosted runners when you need:

- Specific hardware (GPUs, ARM devices, more RAM/CPU than hosted tiers offer)
- Access to an internal/private network that GitHub-hosted runners cannot reach
- To avoid GitHub-hosted per-minute billing for very heavy workloads
- Persistent caches/tools across runs without re-downloading every time

Self-hosted runners are matched to jobs via **labels** — the default label is the runner's own self-applied set (`self-hosted`, plus OS and architecture), but you can also add custom labels (like `gpu`, `prod-network`) when registering a runner, then target them in `runs-on:`.

For fleets of self-hosted runners that need to scale up/down automatically with demand, GitHub supports **runner scale sets** — a way to autoscale a pool of self-hosted runners on your own infrastructure (e.g., Kubernetes) rather than manually registering/deregistering individual machines.

> **Security note:** self-hosted runners attached to a public repository are a real attack surface — anyone who can open a pull request could potentially run arbitrary code on your self-hosted machine via a workflow. GitHub strongly recommends not using self-hosted runners on public repositories unless you've carefully restricted who can trigger workflows on them.

## A complete annotated example combining everything in this file

```yaml
name: Build, Test, Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v6
      - name: Run tests
        run: npm ci && npm test

  build:
    needs: test                       # only runs if test succeeds
    runs-on: ubuntu-latest
    outputs:
      artifact-name: build-${{ github.sha }}
    steps:
      - uses: actions/checkout@v6
      - run: npm ci && npm run build

  deploy:
    needs: build                      # only runs if build succeeds
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying ${{ needs.build.outputs.artifact-name }}"

  notify:
    needs: [test, build, deploy]
    if: always()                      # runs regardless of success/failure above
    runs-on: ubuntu-latest
    steps:
      - run: echo "Pipeline finished with status ${{ job.status }}"
```

The next file, `05-environment-variables-and-contexts.md`, covers how to pass and read configuration data (env vars, contexts, expressions) throughout a workflow like this one.
