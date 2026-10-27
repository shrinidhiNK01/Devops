# 13 — Real-World, Complete Pipelines

This file collects full, working pipelines for common scenarios, combining concepts from every previous file. Copy any of these into `.github/workflows/` and adjust the project-specific details (paths, branch names, registry/account names) to fit your repository.

## 1. Node.js app: lint, test, and build on every push and PR

```yaml
name: Node CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: [20, 24]
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-node-${{ matrix.node-version }}
          path: coverage/
```

## 2. React app: build and deploy to GitHub Pages

```yaml
name: Deploy React App to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm

      - run: npm ci
      - run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: build/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 3. Build and push a Docker image to GitHub Container Registry

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]
    tags: ['v*']

permissions:
  contents: read
  packages: write

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata for tags/labels
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

This pipeline pushes a tagged image every time `main` is updated or a `v*` tag is pushed, and uses GitHub Actions' own cache backend (`type=gha`) to speed up Docker layer caching between runs.

## 4. Python project: test across multiple versions, then publish to PyPI on release

```yaml
name: Python CI and Publish

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  release:
    types: [published]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12', '3.13']
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: pip

      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: pytest

  publish:
    needs: test
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    environment: pypi
    permissions:
      id-token: write     # required for PyPI's trusted publishing via OIDC
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - run: pip install build
      - run: python -m build
      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
```

## 5. Full build → test → staging → production pipeline with manual approval

```yaml
name: Full Deployment Pipeline

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist/ }
      - env:
          TOKEN: ${{ secrets.STAGING_TOKEN }}
        run: ./scripts/deploy.sh staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production            # configured in repo settings with required reviewers
      url: https://example.com
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist/ }
      - env:
          TOKEN: ${{ secrets.PRODUCTION_TOKEN }}
        run: ./scripts/deploy.sh production

  notify:
    needs: [test, build, deploy-staging, deploy-production]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Report pipeline result
        run: echo "Pipeline finished — check the Actions tab for per-job status"
```

This is essentially the synthesis of files 02 through 11: parallel-by-default jobs forced into sequence with `needs`, a build artifact shared between stages, an environment-gated production deploy requiring manual approval, a concurrency group preventing overlapping deploys of the same branch, and an `always()` notification step at the end regardless of outcome.

The next file, `14-debugging-and-troubleshooting.md`, covers what to do when any of these pipelines doesn't behave the way you expect.
