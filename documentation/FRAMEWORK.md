# API Framework

Architectural decisions for the album-grid-api backend — the shape of the system and the reasoning behind each choice. Update this doc when a decision changes, not after.

---

## Runtime: AWS Lambda + Node.js 24

Each endpoint is an independent Lambda function. No HTTP server or web framework — API Gateway routes requests directly to handlers typed with `APIGatewayProxyHandlerV2` from `@types/aws-lambda`.

Node version is pinned in three places: `.nvmrc`, SAM template `Runtime:`, and the GitHub Actions `setup-node` step. Keep them in sync.

**Why:** Serverless keeps infrastructure overhead minimal at this scale. Lambda per endpoint gives clean isolation, no routing layer to maintain, scales to zero when idle.

## Language: TypeScript 5

Compiled with `tsc` to `dist/`. No bundler — plain CommonJS output is sufficient for Lambda.

**Why:** Type safety across the API boundary (request/response shapes) is worth the compile step. Avoiding webpack/esbuild reduces tooling surface area.

## Project Layout

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the full folder layout and conventions.

Top-level shape:

```
album-grid-api/
├── src/                   # handlers, framework, models, domain, integrations
├── test/                  # vitest unit + contract tests
├── template.yaml          # SAM infrastructure template (single source of truth)
├── tasks/                 # in-flight work tickets
└── documentation/         # this doc + PROJECT_STRUCTURE.md + supplementary notes
```

Handlers stay thin — business logic lives in `domain/` and `integrations/` so it's testable without the Lambda runtime.

---

## Infrastructure as Code: AWS SAM

All infrastructure (Lambda functions, API Gateway, IAM, CloudFront, DynamoDB, S3, alarms, dashboards, domain mapping) is defined in `template.yaml` and deployed via `sam deploy`. Nothing is clicked in the AWS console.

**Why:** SAM is a thin extension of CloudFormation with first-class Lambda/API Gateway support. More portable than CDK (no toolchain dependency beyond the AWS CLI), less ceremony than raw CloudFormation. Generates valid CloudFormation under the hood.

## API Gateway: HTTP API v2

Not REST API v1.

**Why:** Native JWT authorizer points directly at the Cognito user pool (no Lambda authorizer needed), ~70% cheaper per million requests, lower latency, simpler CORS config. We give up API keys/usage plans and in-gateway request transforms — neither of which we need. WAF attaches to CloudFront in front, so we don't lose that protection layer.

## AWS Account Strategy: single account

All projects live in one AWS account.

**Why:** Account separation only pays off at scale that justifies its ongoing costs (cross-account DNS delegation, per-account ACM/KMS/SSO config, consolidated billing setup). At portfolio scale the ops overhead outweighs blast-radius benefits. If any individual project becomes commercial, AWS Organizations makes a later split possible.

## Environments: single production

No dev environment. Deploys go straight to prod. Local testing (vitest + `sam local start-api`) fills the role a dev environment would otherwise play.

**Why:** A dev environment is infrastructure to maintain and keep drift-free with prod. At this scale, local dev + careful prod deploys are sufficient. Revisit only if real users ever depend on zero-downtime releases.

## Custom Domain: `albums.yoconway.com`

The API is reachable at `albums.yoconway.com` via CloudFront → API Gateway. ACM certificate in `us-east-1` (required for CloudFront), Route 53 alias record.

**Why:** Project-specific subdomain, not generic `api.`. With multiple small projects in one account, per-project subdomains (`albums.`, etc.) avoid path-based routing collisions and leave `api.` free for something that actually wants to be _the_ API.

## API Versioning: none

No URL versioning (`/v1/...`). The API has one consumer (the frontend); breaking changes are coordinated with the frontend directly. Additive changes ship without ceremony.

**Why:** URL versioning is overhead with no payoff when you control every consumer. Revisit if the API is ever exposed to third parties.

## Error Response Shape

All error responses use a consistent envelope:

```json
{
	"error": {
		"code": "UPSTREAM_UNAVAILABLE",
		"message": "MusicBrainz request failed",
		"requestId": "abc-123-def"
	}
}
```

- `code` is machine-readable (`INVALID_QUERY`, `NOT_FOUND`, `UPSTREAM_UNAVAILABLE`, `UNAUTHORIZED`, `INTERNAL`).
- `message` is human-readable; safe to show in UI.
- `requestId` matches the CloudWatch log `requestId` for cross-reference.

Success responses are bare (no envelope) — the resource shape is the response body.

---

## Authentication: Cognito User Pool + Google OAuth

Cognito hosted UI with Google as identity provider. API Gateway v2's native JWT authorizer validates tokens against the user pool — no Lambda authorizer code.

Handlers receive `event.requestContext.authorizer.jwt.claims`. The `sub` claim is the canonical `userId` used throughout the system (grids, uploads, future user records).

Specific Cognito settings (token expiry, refresh strategy, scopes) are decided during `auth-integration` implementation.

**Why:** Cognito + JWT authorizer is the native AWS-serverless auth path. No passwords, no sessions, no refresh logic in handler code. Google as IdP keeps signup friction low.

---

## Data Sources

- **MusicBrainz** — primary metadata source. Free, CC0-licensed, stable `MBID` identifiers used as cross-reference keys across the entire system. Rate limit: 1 req/sec per IP anonymous. `User-Agent` header required for good citizenship (`album-grid/0.1 (contact@yoconway.com)`).
- **Last.fm** — popularity signal for search ranking (listener counts, play counts). Free with API key, 5 req/sec.
- **Cover Art Archive** — primary cover image source (same foundation as MusicBrainz).

Decision validated by `data-source-spike` before `search-endpoint` commits downstream.

## Search Strategy

Search at the **release-group level**, not release level. A release group is the abstract album ("Thriller"); a release is a specific pressing ("Thriller, 1982 US vinyl"). Release-level search returns 20+ noisy duplicates for any famous album.

Results are ranked by a blend of MusicBrainz text relevance and Last.fm listener count, so common/famous albums rank above obscure reissues. Blend weights tuned during `data-source-spike`.

## Cover Art Strategy

Three-tier fallback:

1. **Cover Art Archive** — primary.
2. **Last.fm image** — fallback when CAA has no image.
3. **User upload** — "not seeing your album? upload the cover yourself" escape hatch. Stored in S3, scoped to the user's grid item.

No Google Images integration. Pushing the user out of the app to search Google breaks flow and they end up back at the upload step anyway.

User uploads are **never** auto-contributed to CAA — CAA expects real cover art, not arbitrary user images. A user-driven contribution feature is a possible post-MVP project requiring the user's own MusicBrainz account.

---

## Caching Strategy: tiered

Start cheap. Add layers only when observability signals say we need them.

- **Tier 1 (MVP): thin proxy + CloudFront.** Lambda hits upstream on cache miss. CloudFront caches GET responses by query string with sensible TTLs. Cost: ~$0 beyond Lambda invocations.
- **Tier 2: DynamoDB-with-TTL cache layer.** Added when the `UpstreamRateLimitExceeded` CloudWatch alarm crosses threshold. Lambda checks DynamoDB first, falls back to upstream, writes back with TTL.
- **Tier 3: self-hosted MusicBrainz dump + own search index (Meilisearch, not OpenSearch).** Only if traffic justifies the ops commitment. Not on the roadmap.

**No Redis.** ElastiCache means VPC (cold start hit), persistent connections don't fit Lambda's execution model, and there's baseline cluster cost even when idle. DynamoDB-with-TTL is the AWS-native serverless cache. If Redis semantics are ever genuinely needed, Momento (serverless, Redis-compatible, no VPC) is the right escape — not ElastiCache.

---

## Database: DynamoDB

One table per concern — no single-table-design ceremony at this scale.

- **`Grids` table** — user grids. PK `userId`, SK `gridId`, attribute `items` (ordered list of `{ mbid, userImageS3Key? }`).
- **`Recommendations` table** — precomputed co-occurrence. PK `mbid`, attribute `related` (top-N `{ relatedMbid, score }`).
- **Cache tables** (when Tier 2 is triggered) — pay-per-request with TTL.

**MBID is the cross-reference key throughout.** Grids store MBIDs only — no denormalized metadata snapshots. Metadata hydrates from the MB cache at read time, so a MusicBrainz correction propagates automatically to every grid.

**Why DynamoDB over Postgres:** no VPC, no baseline cluster cost, pay-per-request scales with actual use, simple keyed access patterns match the workload. Postgres would make the recommendation co-occurrence query natural, but we precompute that into a flat table, so the aggregate-SQL advantage doesn't apply.

## Recommendation Engine

Album-to-album similarity is a co-occurrence aggregate across all users' grids. DynamoDB is bad at aggregation — so we precompute.

Nightly scheduled Lambda scans `Grids`, computes MBID-pair co-occurrence counts, writes top-N per MBID to `Recommendations`. Runtime lookup = single `GetItem`. Blended score grows to include shared genre/label/era and Last.fm similar-artist overlap as the batch job matures.

Cold-start problem: until there are enough grids for useful behavioral signal, fall back to metadata similarity (same artist, shared genre tags, same era). Lookup endpoint shape doesn't change — only the batch job's weighting.

---

## Secrets Management: SSM Parameter Store

Secrets (Last.fm API key, Cognito client secret, etc.) live in SSM Parameter Store as `SecureString` parameters. Lambda functions get IAM permission to read their specific parameters; values resolve into environment variables at deploy time via SAM's parameter references.

**Why SSM not Secrets Manager:** Secrets Manager costs $0.40/secret/month + $0.05 per 10K API calls and adds rotation machinery. For static third-party API keys that don't rotate on a schedule, SSM's $0.05 per 10K reads with no per-parameter cost is the right call.

**Secret vs config:** API keys, OAuth client secrets, and any third-party credentials are secrets. Hostnames, table names, and feature flags are plain environment variables set directly in the SAM template.

---

## Logging

Custom wrapper over `console` in `src/framework/logger.ts`. `requestId` is injected automatically from `AsyncLocalStorage` context — callers never pass it explicitly.

```ts
import { logger } from "../framework/logger"

logger.debug("musicbrainz", "fetching release group", { mbid })
logger.info("handlers", "search request", { query })
logger.warn("rate limit hit", { source: "musicbrainz" })
logger.error(new Error("fetch failed")) // serializes name/message/stack
logger.error("unexpected state", { gridId }) // plain string also accepted
```

`debug` and `info` require a typed namespace — add values to the union in `src/framework/logger.type.ts` as modules grow. `warn` and `error` always emit regardless of configuration.

### Filtering: `LOG_NAMESPACES`

Controls which namespaces emit. Accepts a comma-separated list or `*` for all.

| Value                    | Effect                                   |
| ------------------------ | ---------------------------------------- |
| `""` (empty, default)    | Only `warn` and `error` emit             |
| `"musicbrainz"`          | `musicbrainz` namespace + `warn`/`error` |
| `"musicbrainz,handlers"` | Both namespaces + `warn`/`error`         |
| `"*"`                    | Everything                               |

**Local** — set in `.env` or shell:

```sh
LOG_NAMESPACES=*
```

**Deployed (per-Lambda)** — set in `template.yaml`:

```yaml
Environment:
  Variables:
    LOG_NAMESPACES: musicbrainz
```

## Request Context and AsyncLocalStorage

`requestId` (and eventually `userId`) needs to be present on every log line without threading it through every function call.

This is solved with Node.js's built-in `AsyncLocalStorage` (`src/framework/context.ts`). Here is how it works:

`AsyncLocalStorage` maintains a value scoped to an async execution tree. When you call `storage.run(value, fn)`, every `await` inside `fn` — and every function called from `fn`, no matter how deeply nested — can read that same value via `storage.getStore()`. The value does not leak to other concurrent executions.

In Lambda terms: `wrapHandler` calls `runWithContext({ requestId }, () => handler(event))` at the start of each invocation. For the lifetime of that invocation, any code that calls `getContext()` gets back `{ requestId }` without being passed it explicitly. When the invocation ends, the context goes away. The next invocation gets a fresh context — no warm-start leakage.

The logger reads from `getContext()` automatically on every call. Callers never think about it.

## Observability

CloudWatch alarms, all defined in the SAM template:

- **`UpstreamRateLimitExceeded`** custom metric, dimensioned by source. Alarm triggers the Tier 1 → Tier 2 cache decision.
- **Lambda error rate** > 1% over 5 minutes.
- **p95 latency** > 2s over 5 minutes.

Alarms deliver to an SNS topic with email subscription (email is a deploy-time parameter). A CloudWatch dashboard shows request count, error rate, p95/p99 latency, upstream 429 count, and cover-art-miss rate.

X-Ray tracing is not wired up initially. Revisit if inter-service call patterns become complex enough that CloudWatch log correlation stops cutting it.

---

## CI/CD: GitHub Actions

Deploys triggered by push to `master`. Workflow: checkout → setup-node → install → typecheck → test → `sam build` → `sam deploy`.

**Rollback:** redeploy the previous commit. SAM/CloudFormation rolls back failed deploys automatically. Lambda versions/aliases are not used — at this scale, redeploy is simpler and fast enough.

**Why GitHub Actions:** free at this scale (unlimited minutes for public repos; 2,000 Linux minutes/month for private on GitHub Free — far more than this project needs). Manual `sam deploy` friction adds up; automated deploys from `master` are cheap to set up and pay for themselves in saved keystrokes within a week.

## Local Development

- **`vitest` for unit and contract tests.** Direct handler invocation with constructed `APIGatewayProxyEventV2` objects. No Docker, no HTTP. Fastest feedback loop — most tests live here.
- **`sam local start-api --warm-containers LAZY` for smoke tests and interactive local curl-ing.** Real Lambda RIE in Docker, real API Gateway event shape. Used sparingly, primarily to validate the SAM template itself rather than handler logic.

No custom local HTTP adapter. An in-house runner would drift from real API Gateway behavior and become its own maintenance burden.

---

## Dependency philosophy

- Minimize runtime dependencies. Lambda cold start scales with bundle size.
- Dev dependencies (types, prettier, tsc, vitest) are free — they don't ship.
- Before adding a runtime dependency, consider whether the stdlib or a small inline implementation is sufficient.
