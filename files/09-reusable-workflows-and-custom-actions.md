# 09 — Reusable Workflows and Custom Actions

As your usage of GitHub Actions grows, you'll inevitably end up copy-pasting the same chunk of YAML across several workflows or repositories. GitHub Actions gives you two different mechanisms to avoid that duplication, and picking the right one matters:

| Mechanism | Reuses... | Called from... | Typical use case |
|-----------|-----------|------------------|-------------------|
| **Reusable workflow** (`workflow_call`) | An entire workflow (multiple jobs) | Another workflow's `jobs:` block | "Run our standard build+test+deploy pipeline" shared across many repos |
| **Composite action** | A sequence of steps | A single step (`uses:`) inside any job | "Set up our standard Node environment" — a few steps you reuse constantly |
| **Custom JavaScript/Docker action** | Arbitrary custom logic | A single step (`uses:`) inside any job | You need genuinely custom behavior no existing action provides |

## Reusable workflows

### Step 1: define the reusable workflow

```yaml
# .github/workflows/reusable-build.yml
name: Reusable Build Workflow

on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '24'
      environment:
        required: true
        type: string
    secrets:
      deploy_token:
        required: true
    outputs:
      build-version:
        description: "The version that was built"
        value: ${{ jobs.build.outputs.version }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.set-version.outputs.value }}
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci && npm run build
      - id: set-version
        run: echo "value=1.0.${{ github.run_number }}" >> "$GITHUB_OUTPUT"
      - name: Use the secret
        env:
          TOKEN: ${{ secrets.deploy_token }}
        run: echo "Deploying to ${{ inputs.environment }} using a token"
```

### Step 2: call it from another workflow

```yaml
# .github/workflows/main.yml
name: Main Pipeline
on:
  push:
    branches: [main]

jobs:
  call-build:
    uses: ./.github/workflows/reusable-build.yml      # local path reference
    with:
      node-version: '24'
      environment: production
    secrets:
      deploy_token: ${{ secrets.DEPLOY_TOKEN }}

  use-the-output:
    needs: call-build
    runs-on: ubuntu-latest
    steps:
      - run: echo "Built version ${{ needs.call-build.outputs.build-version }}"
```

You can also call a reusable workflow that lives in a **different repository**, as long as it's accessible to you:

```yaml
jobs:
  call-shared:
    uses: my-org/shared-workflows/.github/workflows/build.yml@main
    with:
      environment: production
    secrets: inherit
```

### Important rules for reusable workflows

- The reusable workflow's trigger must be `on: workflow_call` (it can also have other triggers alongside it, but `workflow_call` is what makes it callable).
- Inputs/secrets must be explicitly declared in the reusable workflow's `workflow_call:` block — you can't pass arbitrary undeclared values through.
- Secrets are **not** automatically inherited from the caller — you must pass them explicitly, or use `secrets: inherit` to forward everything.
- A caller job that uses `uses:` to call a reusable workflow cannot also have its own `steps:` — the entire job *is* the call.
- Reusable workflows can call other reusable workflows, but nesting depth is limited (a handful of levels) to prevent runaway recursion.

## Composite actions

A composite action bundles several steps into a single reusable unit, defined in its own `action.yml`.

### Folder structure

```
.github/
└── actions/
    └── setup-project/
        └── action.yml
```

### `action.yml` for a composite action

```yaml
# .github/actions/setup-project/action.yml
name: 'Setup Project'
description: 'Checks out code, sets up Node.js, and installs dependencies'

inputs:
  node-version:
    description: 'Node.js version to install'
    required: false
    default: '24'

outputs:
  cache-hit:
    description: 'Whether the dependency cache was restored'
    value: ${{ steps.cache.outputs.cache-hit }}

runs:
  using: 'composite'
  steps:
    - uses: actions/checkout@v6
      shell: bash

    - uses: actions/setup-node@v6
      with:
        node-version: ${{ inputs.node-version }}

    - id: cache
      uses: actions/cache@v4
      with:
        path: node_modules
        key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}

    - name: Install dependencies
      shell: bash
      run: npm ci
```

### Using the composite action

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Setup project
        uses: ./.github/actions/setup-project
        with:
          node-version: '24'

      - run: npm run build       # dependencies are already installed by the composite action above
```

Note: every `run:` step **inside** a composite action must explicitly specify `shell:` (unlike normal workflow steps, where it can be inferred) — this is one of the few syntax quirks specific to composite actions.

## Custom JavaScript actions

For genuinely custom logic — calling an internal API, doing complex conditional processing, generating a custom report — a JavaScript action gives you full programming power instead of stitching together shell commands.

### Folder structure

```
my-custom-action/
├── action.yml
├── index.js
└── package.json
```

### `action.yml`

```yaml
name: 'My Custom Action'
description: 'Does something custom'
inputs:
  who-to-greet:
    description: 'Who to greet'
    required: true
    default: 'World'
outputs:
  time:
    description: 'The time we greeted'
runs:
  using: 'node20'
  main: 'index.js'
```

### `index.js` (using the `@actions/core` toolkit)

```javascript
const core = require('@actions/core');

try {
  const name = core.getInput('who-to-greet');
  console.log(`Hello, ${name}!`);
  const time = new Date().toTimeString();
  core.setOutput('time', time);
} catch (error) {
  core.setFailed(error.message);
}
```

Once published (as a public repo, or referenced via a local/relative path), it's used exactly like any Marketplace action: `uses: your-org/my-custom-action@v1`.

## Docker container actions

When you need an exact, fully-controlled environment (a specific compiler version, a niche CLI tool, a particular Linux distribution), a Docker action packages your logic inside a container image.

### `action.yml`

```yaml
name: 'My Docker Action'
description: 'Runs inside a custom container'
inputs:
  who-to-greet:
    required: true
runs:
  using: 'docker'
  image: 'Dockerfile'           # built from a local Dockerfile, or use 'docker://some/image:tag'
  args:
    - ${{ inputs.who-to-greet }}
```

### `Dockerfile`

```dockerfile
FROM alpine:3.20
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

### `entrypoint.sh`

```bash
#!/bin/sh
echo "Hello, $1!"
```

## Choosing between the three custom action types

| If you need... | Use |
|-----------------|-----|
| To bundle a handful of existing steps/actions you keep repeating | **Composite action** |
| Real programming logic (conditionals, API calls, JSON parsing) | **JavaScript action** |
| A very specific OS/toolchain environment | **Docker container action** |
| To reuse an entire multi-job pipeline across workflows/repos | **Reusable workflow** (`workflow_call`) |

The next file, `10-matrix-builds-and-advanced-control.md`, covers running the same job across multiple configurations at once (matrix strategy) and more advanced job-control patterns.
