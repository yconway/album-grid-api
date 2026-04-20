# album-grid-api

Backend API for **Album Grid** — a web app where users curate grids of album artwork. Search MusicBrainz/Last.fm for albums, arrange them into a personal grid, and get recommendations based on aggregate user behavior.

## Tech stack

- **TypeScript 5** on **Node.js 24**, compiled to CommonJS (`tsc`, no bundler).
- **AWS Lambda** per endpoint, fronted by **API Gateway v2** (HTTP API). No HTTP framework — each handler is a standalone Lambda function.
- **DynamoDB** for user grids and precomputed recommendations. **S3** for user-uploaded cover art.
- **Cognito + Google OAuth** for auth; API Gateway's native JWT authorizer validates tokens.
- **AWS SAM** for infrastructure-as-code; nothing is configured by hand in the console.
- **GitHub Actions** deploys on push to `master` via OIDC (no long-lived AWS keys).

## Orientation

- **[FRAMEWORK.md](documentation/FRAMEWORK.md)** — architectural decisions and the reasoning behind them. Start here if you're trying to understand _why_ the project looks the way it does.
- **[PROJECT_STRUCTURE.md](documentation/PROJECT_STRUCTURE.md)** — folder layout, naming conventions, model/handler patterns. Start here if you're trying to figure out _where_ code goes.
- **[DEVELOPMENT.md](documentation/DEVELOPMENT.md)** — prerequisites, setup, commands, testing approach.
- **[DEPLOYMENT.md](documentation/DEPLOYMENT.md)** — how deploys work, manual deploy, rollback, one-time OIDC bootstrap.

## Quick start

```bash
nvm use
yarn
yarn typecheck && yarn test
```

See [DEVELOPMENT.md](documentation/DEVELOPMENT.md) for the full command list.
