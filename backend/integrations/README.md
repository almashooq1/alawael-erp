# Saudi Government & External Integrations

> ACL (Anti-Corruption Layer) between the platform core and external systems. See [docs/blueprint/07-integrations.md](../../docs/blueprint/07-integrations.md) and [ADR-008](../../docs/architecture/decisions/008-nafath-e-signature.md).

## Directory Layout

```
backend/integrations/
├── README.md
├── _common/
│   ├── acl-client.js           # base HTTP client (retry + timeout + circuit breaker)
│   ├── integration-log.js      # request/response audit log
│   └── signatures.js           # HMAC helpers for webhooks
├── nafath/                     # e-signature + SSO
├── absher/                     # citizen/resident identity
├── yakeen/                     # civil registry lookups
├── wasel/                      # CHI health insurance
└── madaa/                      # salary card disbursement
```

Each adapter folder contains:

- `config.js` — endpoints, timeouts, credentials reference (never embeds secrets)
- `client.js` — the HTTP/SOAP/SFTP client
- `mapper.js` — translates between external schema and our canonical domain
- `index.js` — public API for the rest of the codebase
- `__tests__/` — contract tests (against stored fixtures + sandbox)

## Rules

1. **Core never imports adapter internals** — only `require('integrations/<name>')`.
2. **All external calls go through `acl-client.js`** to ensure uniform retry, timeout, circuit-breaker, and `IntegrationLog` writes.
3. **Secrets via `process.env` + a named vault reference**; never in code or env files committed to git.
4. **Sandbox-first**; a feature flag toggles sandbox vs production.
5. **Idempotent writes** — external calls use idempotency keys so retries are safe.
6. **Webhook receivers** verify HMAC + replay windows; they are rate-limited.

## Current Status

| Adapter     | Status                | Priority |
| ----------- | --------------------- | -------- |
| Nafath      | Scaffold              | P1       |
| Absher      | Scaffold              | P1       |
| Yakeen      | Scaffold              | P1       |
| Wasel (CHI) | Scaffold              | P1       |
| Madaa       | Scaffold              | P1       |
| ZATCA       | Production (existing) | Maintain |
| GOSI        | Production (existing) | Maintain |
| Qiwa        | Production (existing) | Maintain |

"Scaffold" means directory + config + client stubs + tests harness are in place, but the real endpoints and production secrets are not yet wired. See the roadmap in `docs/blueprint/09-roadmap.md` § P1.
