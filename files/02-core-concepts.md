# 02 — Core Concepts

GitHub Actions has six core building blocks. Every workflow, no matter how complex, is built from just these six things.

## The six building blocks

| Term | Definition |
|------|------------|
| **Workflow** | The entire automated pipeline, defined as a single `.yml` file. The complete unit of automation. |
| **Event** | The trigger that causes a workflow to start running (a push, a pull request, a schedule, a manual click...). |
| **Job** | A set of steps that execute on the same runner. A workflow can have one or many jobs. |
| **Step** | A single task inside a job — either a shell command or a call to a reusable action. Steps in a job run in order. |
| **Runner** | The actual machine (virtual or physical) that executes a job. |
| **Action** | A reusable, packaged unit of automation logic (e.g. "check out my code," "set up Node.js") that you plug into a step. |

## How they relate to each other (hierarchy)

```
Workflow (.yml file)
 └── triggered by an Event
      └── contains one or more Jobs (run in parallel by default)
           └── runs on a Runner
                └── contains Steps (run sequentially)
                     └── each Step runs a shell command, OR
                     └── each Step uses an Action
```

## Execution flow, end to end

```
Event occurs
   ↓
Workflow starts
   ↓
Job(s) execute — in parallel by default, unless dependencies are declared
   ↓
Inside each job: Steps execute sequentially, top to bottom
   ↓
All steps in a job complete → job is marked success/failure
   ↓
All jobs complete → workflow finishes
```

This default behavior — jobs in parallel, steps in sequence — is one of the most important things to internalize early. If Job B genuinely needs Job A to finish first (e.g., Job B deploys what Job A built), you must say so explicitly using `needs:` (covered in file 04).

## Anatomy of a workflow file, line by line

```yaml
name: Build My React App        # (1) Human-readable name, shown in the Actions tab

on:                              # (2) Event(s) that trigger this workflow
  push:
    branches: [main]

jobs:                            # (3) One or more jobs
  build:                         #     Job ID — your own internal name for this job
    runs-on: ubuntu-latest       # (4) Which runner/OS this job executes on
    steps:                       # (5) Ordered list of steps inside the job
      - name: Checkout Repository
        uses: actions/checkout@v6    # (6) Step that calls a reusable Action

      - name: Install Dependencies
        run: npm install             # (6) Step that runs a shell command

      - name: Build
        run: npm run build
```

1. **`name`** — optional, but recommended. Shows up as the workflow's display name in GitHub's UI. If omitted, GitHub uses the workflow file's path instead.
2. **`on`** — required. Defines what triggers the workflow (see file 03 for the full list of triggers).
3. **`jobs`** — required. A workflow needs at least one job. Each key under `jobs:` (here, `build`) is a **job ID** you choose; it must be unique within the workflow and is used later if other jobs need to reference it (e.g. in `needs:` or to read its outputs).
4. **`runs-on`** — required per job. Specifies the runner type: `ubuntu-latest`, `windows-latest`, `macos-latest`, a specific version like `ubuntu-22.04`, or a custom label for self-hosted runners.
5. **`steps`** — required per job. An ordered, sequentially-executed list.
6. Each step is either:
   - **`run:`** — executes a shell command (or multi-line script) directly on the runner.
   - **`uses:`** — calls a pre-built **action**, optionally passing it configuration via `with:`.

## Workflow, Job, and Step names vs IDs

It's worth being precise about naming, since beginners often conflate these:

- A **workflow** has a `name:` (display only) and is identified internally by its file path.
- A **job** has a **job ID** (the YAML key under `jobs:`, e.g. `build`) and an optional `name:` field for display purposes. The job ID is what you use programmatically (in `needs:`, in `${{ needs.build.outputs.* }}`, etc.).
- A **step** has an optional `name:` for display, and an optional `id:` if you need to reference its outputs later in the job.

## YAML basics you must know for GitHub Actions

GitHub Actions workflows are plain YAML, so ordinary YAML rules apply:

- **Indentation defines structure.** Use spaces, not tabs. Two spaces per level is the convention.
- **Lists** are written with a leading dash:
  ```yaml
  branches:
    - main
    - develop
  ```
  or the equivalent inline shorthand:
  ```yaml
  branches: [main, develop]
  ```
- **Key: value pairs** are simple `key: value`. Strings usually don't need quotes, but quote them when the value could be misread (e.g., a value that starts with a special character, or `on: "5 4 * * *"` for cron expressions).
- **Multi-line strings** use the pipe `|` to preserve line breaks — extremely common for multi-command `run:` steps:
  ```yaml
  run: |
    echo "Step 1"
    echo "Step 2"
  ```
- **Comments** start with `#` and are ignored entirely by the YAML parser.

## What exactly is an "Action"?

This is the single most confusing naming overlap for beginners: "GitHub Actions" (the product/platform) versus "an action" (a specific reusable unit you call with `uses:`).

An **action** is a packaged, reusable piece of automation, similar in spirit to a function or library you import. Actions are published to the **GitHub Marketplace** and can be written in three different ways:

1. **JavaScript actions** — run directly on the runner using Node.js.
2. **Docker container actions** — run inside a Docker container, useful when you need a very specific environment.
3. **Composite actions** — bundle multiple existing steps/actions into one reusable action, written in YAML.

You reference any action by `owner/repo@version`, for example `actions/checkout@v6` refers to the `checkout` repository owned by the `actions` organization, pinned to its `v6` release. File 09 covers how to author your own custom actions of each type.

## What exactly is a "Runner"?

A runner is the actual compute that executes your job — think of it as a temporary, disposable computer that:

1. Spins up fresh (for GitHub-hosted runners, every single job gets a brand-new virtual machine).
2. Checks out your code (if you tell it to, via the checkout action).
3. Executes your steps in order.
4. Reports results back to GitHub.
5. Is destroyed at the end of the job (GitHub-hosted runners are never reused between jobs).

There are two flavors:

- **GitHub-hosted runners** — fully managed by GitHub, no setup required, billed per minute (free tier varies by plan).
- **Self-hosted runners** — a machine (cloud VM, on-prem server, even your laptop) that you register and maintain yourself. Useful for special hardware, internal network access, or to avoid GitHub-hosted billing.

File 04 covers runner selection, labels, and self-hosted setup in depth.

## Putting it all together: the smallest meaningful example, annotated

```yaml
name: Shrinidhi N K          # Workflow display name
on:
  push:
    branches: [main]         # Event: trigger on push to main
jobs:
  demo:                      # Job ID: "demo"
    runs-on: ubuntu-latest   # Runner: GitHub-hosted Ubuntu VM
    steps:
      - name: Greetings      # Step name (display only)
        run: echo "Hello from James"   # Step body: a shell command
```

This workflow has exactly one event, one job, and one step — but it already demonstrates the complete shape every GitHub Actions workflow follows, no matter how large it eventually grows.
