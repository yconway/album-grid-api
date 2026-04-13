# album-grid-api

TypeScript AWS Lambda API for Album Grid. Architectural decisions live in [documentation/FRAMEWORK.md](documentation/FRAMEWORK.md) — read that before making structural changes.

## Prerequisites

- Node 24 (`nvm use`)
- Yarn
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) with credentials configured (`aws configure`)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

## Setup

```bash
nvm use
yarn
```

## Development

```bash
yarn typecheck      # type-check src/
yarn test           # run vitest
yarn lint           # eslint
yarn format         # prettier --write
```

## Deploy

Automated deploys run on push to `master` via GitHub Actions (see [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). For a manual deploy from your machine:

```bash
yarn deploy
```

This runs `tsc` → `sam build` → `sam deploy`. Stack name and region are pinned in [`samconfig.toml`](samconfig.toml) (`album-grid-api`, `us-east-1`).

First deploy prompts for changeset confirmation; subsequent deploys from CI pass `--no-confirm-changeset`.

## Infrastructure

All AWS resources are defined in [`template.yaml`](template.yaml) (AWS SAM). Nothing is clicked in the console. To sanity-check the template:

```bash
yarn sam:validate
```

## GitHub Actions OIDC bootstrap

The `deploy` workflow authenticates to AWS via OIDC (no long-lived access keys). A one-time IAM setup is required in the AWS account before the workflow can succeed:

1. Create a GitHub OIDC identity provider in IAM (`token.actions.githubusercontent.com`). AWS only needs one per account.
2. Create an IAM role (e.g. `GitHubActions-album-grid-api-deploy`) with:
   - **Trust policy**: the GitHub OIDC provider, conditioned on `repo:<owner>/album-grid-api:ref:refs/heads/master`.
   - **Permissions**: CloudFormation, Lambda, API Gateway, IAM (for role creation), S3 (for the SAM artifacts bucket), CloudWatch Logs. `AdministratorAccess` works to start; scope down later.
3. Set a GitHub **repository variable** `AWS_DEPLOY_ROLE_ARN` to the role's ARN.

Once those three steps are done, pushes to `master` deploy automatically.

## Project layout

```
src/
  handlers/       # one file per Lambda entry point
  lib/            # shared modules (future)
  types/          # shared TypeScript types (future)
test/             # vitest unit + contract tests
template.yaml     # SAM infrastructure
samconfig.toml    # SAM CLI config
documentation/    # architecture notes (FRAMEWORK.md etc.)
tasks/            # in-flight tickets (gitignored)
```
