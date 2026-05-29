# Deploy & Review Checklist — Security Audit + Money Migration (2026-05-29)

Companion to `PROJECT_AUDIT_2026-05-29.md`. Covers the 6 merged PRs, the 1
pending PR (#165), and the production steps that remain. Tick each box per
environment (staging → prod).

## 1. What merged (already on `main` / `master`)

| PR               | Area                                                                                                                                                                                | Verify after deploy                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **#162**         | Supply-chain `server-clean.js`: auth on all 15 mutations + register role clamp + mass-assignment fix + double-hash fix + `User.email`; SCM frontend forms now send the Bearer token | SCM create/edit/delete works **logged-in**; a write **without** a token returns 401            |
| **#163**         | `reset-password.js` hardened (no hardcoded creds, refuses in prod) + `Checklist.branchId` index                                                                                     | `node backend/reset-password.js` with no args prints usage; refuses when `NODE_ENV=production` |
| **#164**         | Mobile auth-flow: navigator reads Redux `auth.isAuthenticated` + `checkAuth()` at boot                                                                                              | Mobile build: login navigates immediately; expired token → login screen                        |
| **#166**         | Docs (audit report, money plan, cutover runbook)                                                                                                                                    | n/a                                                                                            |
| **#167**         | Money migration EXPAND — 35 models dual-write integer-`*_halalas`                                                                                                                   | App boots; create an invoice → `total_amount_halalas === round(total_amount*100)`              |
| **web-admin #1** | Refresh-token rotation across 14 API clients + basePath logout                                                                                                                      | Stay logged in across multiple silent refreshes (no surprise logout)                           |
| _(follow-up)_    | `exceljs` dep added → SCM frontend builds again                                                                                                                                     | `cd supply-chain-management/frontend && CI=true npm run build` compiles                        |

## 2. ⛔ BLOCKING — before merging #165 (crypto keys)

#165 routes `DB_HASH_KEY` / `INTEGRATION_SECRET` / `QR_SECRET` through
`config/secrets.js`, which **throws in production if they are unset**. Set them
in the prod environment FIRST:

- [ ] `DB_HASH_KEY` set — use `default-hash-key` to preserve existing searchable
      hashes, OR a strong value **+ run a re-hash migration** (search by encrypted
      fields breaks until re-hashed)
- [ ] `INTEGRATION_SECRET` set — `integration-default-key-32chars!!` to preserve,
      or strong + re-encrypt existing integration creds
- [ ] `QR_SECRET` set — `doc-qr-secret` to preserve, or strong + re-issue QR codes
- [ ] Confirm staging boots with the vars set, no `[SECURITY] Missing required env var` throw
- [ ] → then merge #165

**Fastest safe path:** set all three to their legacy default values = zero
migration, identical behavior, just removes the "silent default in prod" hole.

## 3. Money backfill (after #167 is deployed)

New writes already dual-write; existing rows need `*_halalas` populated:

- [ ] Point `MONGODB_URI` at a **test copy** of prod
- [ ] `node backend/scripts/backfill-money-halalas.js` (DRY RUN) — review counts/samples
- [ ] `node backend/scripts/backfill-money-halalas.js --apply` on the test copy
- [ ] Reconcile: `*_halalas === round(float*100)` for a sample of each model
- [ ] Repeat `--apply` against **prod** in a maintenance window; reconcile again
- [ ] (optional) scope a single model first: `--model=FinanceInvoice`

## 4. Phase 2 — read cutover + contract (later, deliberate, per-model)

Follow `MONEY_MIGRATION_PHASE2_CUTOVER_RUNBOOK.md`. Do NOT start until §3 reconciles.

- [ ] Switch reads to `*_halalas` at display/aggregation/external-payload boundaries
      (use `formatSar()` for ZATCA/WPS/gateway payloads — never raw halalas)
- [ ] Soak with parallel float-vs-halalas logging; confirm zero divergence
- [ ] Backup → drop the float columns → ratchet the drift-guard baseline down
- [ ] One model at a time (low-volume first; finance-core carefully)

## 5. General deploy hygiene

- [ ] `main` is green (CI) before deploying — main has **no branch protection**, so
      check `gh run list --branch main` rather than relying on a blocked merge
- [ ] Production deploy of `66666` is gated/manual (not auto on push) — confirm the
      deploy step runs `npm run preflight`
- [ ] Smoke-test login + one write in each subsystem post-deploy

---

### Immediate next action

**Set the three env vars (§2) in production**, confirm staging boots, then the
final PR (#165) can merge — that closes the audit end-to-end.
