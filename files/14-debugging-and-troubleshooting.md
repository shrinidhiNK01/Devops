# 14 — Debugging and Troubleshooting

## Reading workflow run logs

Every run lives under your repository's **Actions** tab. Click a run → click a job → each step expands to show its full log output. A few UI details that save time:

- A red ✕ marks the failed step — you rarely need to read every step's log, just expand the failed one.
- The log viewer supports searching within a step's output (useful for long test-suite logs).
- You can download the complete raw logs for a run as a `.zip` from the "..." menu on the run summary page — handy for sharing with a teammate or searching offline.
- The **"Re-run jobs"** button (top-right of a run) lets you re-run either the whole workflow or only the failed jobs, without needing a new commit — useful for transient/flaky failures.

## Enabling verbose debug logging

By default, GitHub Actions logs are reasonably terse. Two repository secrets turn on much more detailed logging for your next run:

| Secret name | Value | Effect |
|-------------|-------|--------|
| `ACTIONS_STEP_DEBUG` | `true` | Adds detailed debug-level output to every step |
| `ACTIONS_RUNNER_DEBUG` | `true` | Adds detailed diagnostic logging about the runner itself (environment setup, networking, etc.) |

Set these as regular repository secrets (Settings → Secrets and variables → Actions), then re-run the workflow — the extra log detail appears automatically. Remove the secrets again once you're done, since verbose logs are noisy for everyday use.

## Common errors and what they actually mean

| Symptom | Likely cause | Fix |
|---------|---------------|-----|
| Workflow doesn't trigger at all | Wrong branch name in `on.push.branches`, or file not actually inside `.github/workflows/` | Double-check the exact branch name and file path; YAML indentation errors can also cause GitHub to silently treat the whole file as invalid |
| `Error: Process completed with exit code 1` (no further detail) | A command in `run:` returned a non-zero exit code | Expand the failing step's full log — the actual error is almost always a few lines above this generic summary line |
| Secret shows up as empty string | Wrong secret name (case-sensitive), or workflow triggered by a forked PR (secrets withheld by design) | Verify exact spelling in both the secret definition and `${{ secrets.NAME }}`; check whether this run came from a fork |
| `needs.<job>.outputs.<name>` is empty in a downstream job | The output wasn't declared at the **job** level, only set inside a step | You must both write to `$GITHUB_OUTPUT` in a step *and* map it through `outputs:` on the job — see file 04 |
| Job runs but environment variable from `$GITHUB_ENV` isn't visible | Variable was set with a plain shell `export` instead of writing to `$GITHUB_ENV` | Each step is a new shell process; only `$GITHUB_ENV`/`$GITHUB_OUTPUT` persist across steps (see file 05) |
| `permission denied` calling the GitHub API with `GITHUB_TOKEN` | Default token permissions too restrictive for the action being attempted | Add the specific scope needed under `permissions:` (file 06) |
| Action fails with a Node.js version deprecation warning | The action hasn't been updated to a newer Node runtime that GitHub Actions still supports | Check the action's Marketplace page for a newer major version |
| Matrix job names are confusing/duplicated in the UI | Multiple matrix dimensions with similar values | Add a custom job `name:` using matrix values, e.g. `name: test (${{ matrix.os }}, node ${{ matrix.node-version }})` |
| Workflow seems "stuck" / never finishes | A step is waiting on interactive input it'll never receive, or a hung process with no timeout | Always set `timeout-minutes` on jobs (file 04) so this fails loudly instead of burning minutes silently |
| Cache never seems to "hit" | Cache key includes something that changes every run (like a timestamp or commit SHA) by mistake | Base the key on something that's actually stable between runs that *should* share a cache, like `hashFiles('package-lock.json')` (file 07) |
| `fatal: could not read Username for 'https://github.com'` during checkout | A later git command tries to authenticate after `persist-credentials: false`, or the wrong token was supplied | Default `actions/checkout` settings handle authentication for you in nearly all cases — avoid manually re-authenticating unless you have a specific reason |

## Testing workflows locally before pushing

Pushing a tiny YAML tweak just to see if it fixed a typo is slow. Two approaches reduce that round-trip:

1. **`act`** — a popular open-source tool that runs your GitHub Actions workflows locally inside Docker containers, simulating most of GitHub's behavior. It won't perfectly replicate every GitHub-hosted-runner detail, but it catches the vast majority of syntax and logic errors instantly, without consuming Actions minutes or waiting on queue time.
2. **`workflow_dispatch` with a scratch branch** — keep a disposable branch specifically for iterating on a workflow, trigger it manually via `workflow_dispatch`, and merge only once it behaves correctly. This avoids cluttering your main branch's commit history with "fix typo in workflow" commits.

## Validating YAML syntax before committing

Many editors (VS Code with the right extension, IntelliJ/WebStorm, etc.) can validate GitHub Actions YAML syntax and even autocomplete known keys as you type, catching indentation and structural errors before you ever push. GitHub itself will also reject a workflow file with invalid YAML at the point of trying to run it — the run will show as failed immediately, with a parsing error rather than any step output, which is a strong signal to check indentation first.

## Diagnosing "it works on my machine but not in Actions"

This almost always comes down to one of:

- **A tool version mismatch.** Your laptop has Node 24 installed globally; the runner, without an explicit `setup-node` step, might have a different default pre-installed. Always pin tool versions explicitly with the relevant `setup-*` action rather than assuming what's pre-installed.
- **A missing environment variable or secret** that exists in your local `.env` file but was never added to the repository's Actions secrets/variables.
- **A working-directory assumption.** Your local terminal might already be inside a subfolder when you run a command; the runner starts at the repository root unless you set `working-directory:` or `defaults.run.working-directory`.
- **File path casing.** GitHub-hosted Linux runners are case-sensitive; macOS (and often local development on macOS/Windows) is not — an import like `import Foo from './foo'` that resolves locally can fail on a Linux runner if the actual filename is `Foo.js`.

The final file, `15-best-practices-and-cheatsheet.md`, wraps up with organizational conventions and a single condensed syntax reference you can keep open while writing workflows.
