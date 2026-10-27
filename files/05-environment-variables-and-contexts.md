# 05 — Environment Variables, Contexts, and Expressions

## Environment variables: three scopes

You can set environment variables at three levels, and inner scopes can see (and override) outer ones.

```yaml
name: Env Var Scopes
on: workflow_dispatch

env:                                  # 1. Workflow-level: every job & step can see this
  GLOBAL_MESSAGE: "Set at workflow level"

jobs:
  demo:
    runs-on: ubuntu-latest
    env:                              # 2. Job-level: every step in this job can see this
      JOB_MESSAGE: "Set at job level"
    steps:
      - name: Step with its own variable
        env:                          # 3. Step-level: only this step can see this
          STEP_MESSAGE: "Set at step level"
        run: |
          echo "$GLOBAL_MESSAGE"
          echo "$JOB_MESSAGE"
          echo "$STEP_MESSAGE"
```

A practical, realistic example:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      APP_ENV: development
      API_URL: https://api.example.com
    steps:
      - uses: actions/checkout@v6
      - name: Use environment variables
        run: |
          echo "App Environment: $APP_ENV"
          echo "API URL: $API_URL"
```

## Setting environment variables dynamically at runtime

To create a variable inside a step that later steps in the *same job* can use, write to the special `$GITHUB_ENV` file rather than using a normal shell `export` (shell exports don't persist between steps, because each step runs in its own shell process):

```yaml
- name: Compute and export a value
  run: echo "BUILD_TIME=$(date +%s)" >> "$GITHUB_ENV"

- name: Use it in the next step
  run: echo "Build happened at $BUILD_TIME"
```

## Default environment variables GitHub provides automatically

GitHub injects a set of environment variables into every job without you doing anything:

| Variable | Contains |
|----------|----------|
| `GITHUB_REPOSITORY` | `owner/repo-name` |
| `GITHUB_REF` | The branch or tag ref that triggered the workflow (e.g., `refs/heads/main`) |
| `GITHUB_SHA` | The commit SHA being built |
| `GITHUB_ACTOR` | Username of whoever triggered the run |
| `GITHUB_WORKFLOW` | Name of the workflow |
| `GITHUB_JOB` | The current job's ID |
| `GITHUB_RUN_ID` | A unique ID for this specific workflow run |
| `GITHUB_RUN_NUMBER` | An incrementing run number, unique per workflow (resets per workflow, not globally) |
| `GITHUB_WORKSPACE` | The default working directory on the runner (where checkout puts your code) |
| `RUNNER_OS` | `Linux`, `Windows`, or `macOS` |
| `RUNNER_TEMP` | A temp directory unique to this job |

These are available as shell environment variables directly (`$GITHUB_SHA` in bash), and the equivalent data is also exposed through the `github` and `runner` **contexts** described below.

## Contexts: structured data you access with `${{ }}` syntax

A **context** is a way to access structured information about the current workflow run, available wherever you can write a GitHub Actions **expression** — inside `if:`, `env:`, `with:`, run command interpolation, and more. Contexts are referenced using double-curly-brace syntax: `${{ <context>.<property> }}`.

| Context | Holds information about... | Example |
|---------|------------------------------|---------|
| `github` | The event, repo, run, and actor that triggered this workflow | `${{ github.actor }}`, `${{ github.ref }}`, `${{ github.event_name }}` |
| `env` | Environment variables defined in the workflow | `${{ env.APP_ENV }}` |
| `vars` | Configuration variables defined in repo/org/environment settings | `${{ vars.DEPLOY_REGION }}` |
| `secrets` | Encrypted secrets (never printed to logs) | `${{ secrets.API_KEY }}` |
| `job` | Information about the currently running job | `${{ job.status }}` |
| `steps` | Outputs and outcomes of previous steps in the same job | `${{ steps.build.outputs.version }}` |
| `needs` | Outputs of jobs this job depends on | `${{ needs.setup.outputs.version }}` |
| `matrix` | The current combination of values in a matrix strategy | `${{ matrix.node-version }}` |
| `runner` | Information about the runner executing the job | `${{ runner.os }}`, `${{ runner.temp }}` |
| `inputs` | Inputs passed into a reusable workflow or `workflow_dispatch` | `${{ inputs.environment }}` |
| `strategy` | Information about the matrix/strategy configuration itself | `${{ strategy.job-index }}` |

### Example: combining several contexts in one workflow

```yaml
name: Context Demo
on:
  push:
    branches: [main]

jobs:
  demo:
    runs-on: ubuntu-latest
    steps:
      - name: Print event info
        run: |
          echo "Triggered by: ${{ github.actor }}"
          echo "Event: ${{ github.event_name }}"
          echo "Branch/ref: ${{ github.ref }}"
          echo "Commit SHA: ${{ github.sha }}"
          echo "Runner OS: ${{ runner.os }}"

      - name: Conditional step using the github context
        if: github.ref == 'refs/heads/main'
        run: echo "This only runs on main"
```

## Expressions and built-in functions

GitHub Actions expressions support comparisons, logical operators, and a small set of useful functions, all inside `${{ }}`.

| Function | Purpose |
|----------|---------|
| `contains(haystack, needle)` | True if a string/array contains a value |
| `startsWith(string, prefix)` | True if a string starts with the given prefix |
| `endsWith(string, suffix)` | True if a string ends with the given suffix |
| `format(template, values...)` | String formatting, like `format('Hello {0}', github.actor)` |
| `join(array, separator)` | Joins an array into a single string |
| `toJSON(value)` | Converts a value to a JSON string (handy for debugging contexts) |
| `fromJSON(value)` | Parses a JSON string back into an object/array, e.g., to build a matrix dynamically |
| `success()`, `failure()`, `cancelled()`, `always()` | Job/step status checks (see file 04) |
| `hashFiles(pattern)` | Returns a hash of matching files, commonly used as a cache key |

Examples:

```yaml
- name: Only run for pull requests targeting main
  if: github.event_name == 'pull_request' && github.base_ref == 'main'
  run: echo "PR targeting main"

- name: Debug-print the whole github context
  run: echo '${{ toJSON(github) }}'

- name: Generate a cache key from the lockfile contents
  run: echo "Cache key would be based on ${{ hashFiles('package-lock.json') }}"
```

## A note on quoting and escaping

Because `${{ }}` is evaluated by GitHub Actions *before* the shell ever sees the resulting string, untrusted values (like a pull request title, branch name, or issue body) interpolated directly into a `run:` script are a known script-injection risk — a malicious PR title containing shell metacharacters could execute arbitrary commands on the runner. The safer pattern is to pass untrusted context values through `env:` first, then reference the environment variable inside the script (the shell treats env var contents as data, not code, when referenced this way):

```yaml
# Risky: direct interpolation of untrusted input into the script
- run: echo "PR title: ${{ github.event.pull_request.title }}"

# Safer: pass through env first
- env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "PR title: $PR_TITLE"
```

The next file, `06-secrets-variables-and-permissions.md`, covers `secrets`, `vars`, the automatic `GITHUB_TOKEN`, and the `permissions` key in detail.
