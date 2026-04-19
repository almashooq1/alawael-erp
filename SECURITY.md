# Security Policy

## Reporting a vulnerability

**Do NOT open a public GitHub issue.** Report security findings privately so we can fix them before the details become public.

| Channel      | Address                                                                         |
| ------------ | ------------------------------------------------------------------------------- |
| Email        | `security@alawael-erp.com`                                                      |
| security.txt | [/.well-known/security.txt](backend/public/.well-known/security.txt) (RFC 9116) |
| GitHub       | "Report a vulnerability" button on the Security tab (private advisory)          |

Preferred languages: Arabic (ar) and English (en).

## What to expect

- **Acknowledgement** within 48 hours (Riyadh business hours).
- **Initial triage** with a severity assessment and a resolution-timeline estimate within 5 business days.
- **Patch + release** prioritized by severity:
  - Critical (data exfiltration, auth bypass, RCE) → patched + released within 7 days.
  - High → within 14 days.
  - Medium / Low → within the next planned release.
- **Public disclosure** coordinated with the reporter — credit given unless anonymity is requested.

## Scope

In scope:

- Backend API at `backend/` (any `/api/*` route, especially admin surfaces under `/api/admin/*`).
- Frontend at `frontend/` (XSS, CSRF, sensitive-data leaks in the bundled JS).
- Mobile app build artifacts.
- Government adapters (`backend/services/*Adapter.js`) — credential handling, request/response logging.
- PDPL audit trail (`backend/models/AdapterAudit.js` + DSAR workflow).
- CI/CD (`.github/workflows/`) — secret leakage, workflow-permissions abuse.

Out of scope:

- Findings against `_archived/` directories — that code is no longer deployed.
- Stale dependency advisories with no exploitable code path in this repo (we triage but they're not vulnerability reports).
- Findings against third-party gov adapters (NPHIES, SCFHS, GOSI, etc.) — report those directly to the providers.
- DoS via legitimate authenticated traffic (we have rate limits but a determined admin could still hammer their own admin surface).

## Compliance posture

This system handles Saudi PII under PDPL. Relevant controls:

- **730-day retention** on the audit trail (configurable via `PDPL_AUDIT_TTL_DAYS`).
- **PII hashed** in audit rows — raw national IDs, license numbers, and member IDs are never stored; only SHA-256 hashes salted with `JWT_SECRET`.
- **DSAR workflow** documented in [docs/runbooks/dsar-adapter-audit.md](docs/runbooks/dsar-adapter-audit.md) — 30-day legal clock with a 20-minute operator flow.
- **Cascaded-call disclosure** via the `correlationId` field on every adapter audit row — supports the PDPL "right to know who saw your data" requirement.

If your finding involves PII handling or audit-trail integrity, please flag it explicitly so we can route the response through the DPO.

## Security-relevant CI gates

- `sprint-tests.yml` runs the [`admin-routes-auth-wiring`](backend/__tests__/admin-routes-auth-wiring.test.js) drift check on every push — every admin handler must be wrapped in `authenticateToken` and a role-restricting middleware. A copy-paste regression that bypasses either fails the build before merge.
- `preflight.js` deploy gate refuses to start the app if any `*_MODE=live` adapter is missing required env vars.
- The audit-trail TTL guard ([`adapter-audit-ttl-guard.test.js`](backend/__tests__/adapter-audit-ttl-guard.test.js)) prevents accidentally lowering retention below 730 days.

## What "responsible disclosure" means here

- Don't access data that isn't yours. If you can prove a vulnerability with synthetic data, do that.
- Don't deplete shared resources (rate limits, gov-adapter credit budget, etc.).
- Give us a reasonable window to fix before publishing — see the timelines above.
- We won't pursue legal action against good-faith research that respects the above.

---

If you're not sure whether something is in scope, email `security@alawael-erp.com` and ask. We'd rather hear about a benign finding than miss a real one.
