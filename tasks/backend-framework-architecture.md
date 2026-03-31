# Backend Framework & Architecture

**Priority:** MVP

## Goal

Documented decisions on the key architectural questions for the API. Output is a short ADR (Architecture Decision Record) committed to the repo, plus a skeleton project structure that reflects those decisions.

## Scope

Decide and document:

- **IaC tool** — AWS CDK vs SAM vs Serverless Framework (consider local dev experience, TypeScript support, and team familiarity)
- **Lambda structure** — single handler vs per-route lambdas; bundling approach (esbuild via CDK/SAM, or manual)
- **DynamoDB access** — raw `@aws-sdk/client-dynamodb`, `DynamoDBDocumentClient`, or a thin abstraction
- **S3 usage** — what is stored (album art cache? exported images?), and access pattern
- **Local dev** — how to run/test lambdas locally (SAM local, LocalStack, or mock layer)

Deliverable: `docs/architecture.md` in the repo + skeleton folder structure scaffolded out.
