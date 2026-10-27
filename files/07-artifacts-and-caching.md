# 07 — Artifacts and Caching

These two features solve two different problems that beginners often mix up:

- **Artifacts** = "I produced a file in this job and I want to keep it / hand it to another job or download it myself."
- **Caching** = "I want to skip redoing expensive, repeatable work (like installing dependencies) on the *next* workflow run."

## Artifacts: persisting and sharing job outputs

By default, anything a job creates dies with that job's runner — the virtual machine is destroyed the moment the job finishes. If you need a build output (a compiled binary, a test report, a built frontend bundle) to survive past the job, or to hand it to a *different* job, you upload it as an artifact.

### Uploading an artifact

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
      - run: npm ci
      - run: npm run build

      - name: Upload build output
        uses: actions/upload-artifact@v4
        with:
          name: build-output         # the name you'll use to download it later
          path: build/                # what to upload — a file or folder
          retention-days: 7           # optional, overrides the repo's default retention
```

### Downloading an artifact in a different job

```yaml
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

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download the artifact from the build job
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: ./downloaded-build

      - run: ls ./downloaded-build       # the build/ contents are now here
```

### Key facts about artifacts

- Artifacts are tied to a specific **workflow run** — visible and downloadable from that run's summary page in the Actions tab, as well as programmatically via `download-artifact`.
- They have a **retention period** (configurable per-upload, or defaulting to the repository/organization setting — commonly around 90 days, but check your repository's Settings → Actions → General for the actual current default), after which GitHub automatically deletes them to save storage.
- Artifact storage **counts against your plan's storage quota** and can incur cost beyond included limits, so avoid uploading huge or unnecessary files (e.g., don't upload your entire `node_modules` folder as an artifact — that's what caching is for).
- Multiple files/folders can be uploaded under one artifact name by listing several paths or using glob patterns in `path:`.

## Caching: speeding up repeated work

Caching solves a different problem: re-installing the exact same dependencies on every single run wastes time and minutes. The `actions/cache` action lets you save a folder (like `node_modules`, `~/.m2`, or a Python virtualenv) keyed to something that changes only when dependencies actually change (typically a hash of the lockfile) and restore it automatically on later runs.

### Manual caching with `actions/cache`

```yaml
steps:
  - uses: actions/checkout@v6

  - name: Cache node_modules
    uses: actions/cache@v4
    with:
      path: node_modules
      key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
      restore-keys: |
        ${{ runner.os }}-node-

  - run: npm install     # this is fast/skipped if the cache was restored
```

How the cache key works:

- If a cache **exactly matching `key`** exists from a previous run, it's restored, and `npm install` becomes nearly instant (it just verifies nothing changed).
- If no exact match exists but a `restore-keys` prefix matches an older cache, that older cache is restored as a starting point (a "partial hit") — still helpful, since most dependencies likely haven't changed.
- If nothing matches, the step is essentially a no-op, dependencies install normally, and a **new** cache is saved automatically at the end of the job for next time.
- Using `hashFiles('package-lock.json')` in the key means the cache automatically invalidates itself the moment the lockfile changes — exactly the behavior you want.

### Built-in caching shortcut in `setup-*` actions

Most of the official `setup-*` actions (Node.js, Python, Java, Go, Ruby...) have **built-in caching support**, which is simpler than wiring up `actions/cache` by hand:

```yaml
- uses: actions/setup-node@v6
  with:
    node-version: 24
    cache: npm                              # automatically caches the npm cache directory
    cache-dependency-path: package-lock.json
```

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.13'
    cache: pip
```

This is the recommended approach for common ecosystems — only reach for manual `actions/cache` when caching something the relevant `setup-*` action doesn't already handle (custom build directories, compiled artifacts, Docker layers, etc.).

## Combining both in a realistic build workflow

```yaml
name: React Build with Artifacts and Caching
on:
  push:
    branches: [master]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Setup Node.js with built-in npm caching
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build React app
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: build/
```

In this workflow: caching speeds up `npm ci` on the *next* run by reusing previously downloaded packages, while the uploaded artifact lets a separate `deploy` job (or a human) retrieve the exact `build/` output from *this* run.

## Cache scoping and limits worth knowing

- Caches are scoped to a branch by default — a cache created on a feature branch isn't visible to other branches until merged, though GitHub does allow falling back to the base branch's cache in some pull request scenarios.
- Each repository has a total cache storage limit (commonly several GB), and GitHub automatically evicts the least-recently-used caches once that limit is exceeded — you generally don't need to clean up caches manually, but very large or numerous caches can churn faster than expected.
- Caches are read-only at restore time — you cannot "append" to an existing cache; a new cache version is created and the old one becomes a candidate for eviction.

The next file, `08-marketplace-actions-guide.md`, covers how to safely find, evaluate, and pin third-party actions from the GitHub Marketplace.
