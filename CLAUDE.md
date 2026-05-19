# Al-Awael Rehab Platform — Agent Onboarding

Saudi rehabilitation / day-care center platform. Two coexisting monorepos. Read this file at the start of every session — it overrides defaults.

## Two repos, not one

| Repo                      | Path                                                | Stack                                                                                                                   | Purpose                                                               |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `66666/` (this dir)       | `c:/Users/x-be/OneDrive/المستندات/04-10-2025/66666` | Node.js + Express + Mongo. JS with `jsconfig.json` (strict + checkJs via JSDoc). Jest.                                  | Backend API, legacy React frontend, mobile app, ops scripts, all docs |
| `alawael-rehab-platform/` | `c:/Users/x-be/alawael-rehab-platform`              | TypeScript monorepo (pnpm workspaces). Next.js 15 (web-admin, strict TS). Packages: `auth`, `i18n`, `ui`, `validators`. | New admin UI (web-admin), shared packages                             |

Both are independent git repos under `almashooq1` on GitHub:

- `66666/` → `alawael-erp` (public, branch `main`, heavy pre-push)
- `alawael-rehab-platform/` → `alawael-rehab-platform` (**private**, branch `master`, remote created 2026-05-19)

Periodic bundles also live in `OneDrive/المستندات/04-10-2025/_backups/*.bundle` as a redundant backup. When asked to "ship a feature" verify which repo the change belongs in before editing.

## Top-level layout (66666/)

```
backend/      Express API, Mongoose models, services, routes, tests
  intelligence/   Shared cross-domain libs (hash-chain, sod, sensitivity-grade, etc.) — canonical, do NOT duplicate
  scripts/        CLI tools (digesters, seeders, preflight, anti-duplication-check)
  tests/          Jest unit + integration
frontend/     Legacy React 18 + MUI 5 (being superseded by alawael-rehab-platform/web-admin)
mobile/       React Native app
supply-chain-management/  Separate sub-module (own backend+frontend)
contracts/    Solidity (CertificateRegistry for blockchain certs)
docs/         Blueprints, ADRs (001-016), runbooks, sprint records, dashboards
ops/          K8s, Docker, monitoring config
scripts/      Repo-wide deploy + digest scripts
```

## Commands you'll need

```bash
# Backend dev / test
cd backend && npm run dev                  # nodemon API
cd backend && npx jest <path-or-pattern>   # run specific test
cd backend && npm run test:sprint          # main test gate
cd backend && npm run lint:duplication     # CI guard (Wave 93)
cd backend && npm run preflight            # deploy gate

# Web-admin (other repo)
cd ../../alawael-rehab-platform/apps/web-admin && npm run typecheck
cd ../../alawael-rehab-platform/apps/web-admin && npm run lint
cd ../../alawael-rehab-platform/apps/web-admin && npm run dev
```

## Critical conventions

- **Wave numbering**: features ship in numbered "Waves" (currently at W147). Numbers are assigned at commit time — parallel sessions sometimes collide. Use `git log --oneline -20` to see the latest before claiming a number.
- **Atomic commit pattern**: stage + commit in ONE Bash call (`git add files && git commit -m "..."`) — separate `git add` then `git commit` calls have lost work to cross-agent races (Waves 131+134 absorbed into other sessions). See memory entries for W137/138/139 for the proven recipe.
- **Wave-18 invariants**: every new Mongoose model must declare cross-field invariants via virtual paths (see `backend/intelligence/hash-chain.lib.js` callers for examples).
- **TTL fields**: all PII-touching collections use 30-day TTL minimum (aligns PDPL). Patterns at `LlmTelemetryCall`, `LlmAnomalySnapshot`, `HikvisionJobRun`.
- **Reason codes**: use the canonical `intelligence/reason-codes.registry.js` (Wave 89). 20 UPPER_SNAKE codes + Arabic labels + alias map. Don't invent new codes — add to registry.
- **Don't duplicate intelligence/ libs**: `lint:duplication` will fail CI on copy-paste of hash-chain, SoD, sensitivity-grade, evidence-snapshot, reviewer-queue, workflow primitives.

## Don'ts (from prior incidents)

- **Don't push to alawael-rehab-platform** — no remote. Commit + bundle to `_backups/` instead.
- **Don't claim "improvements" without running** `npm run typecheck` + `npx jest` for the affected area. Test counts in commit messages are verifiable.
- **Don't add `enforceMfa: false`** outside the service factory default — `lint:duplication` catches this. Wave 95 wired tier enforcement; bypassing it = security regression.
- **Don't bypass `loadMfaActor` middleware** on routes that touch beneficiary lifecycle, care-plan transitions, access-review attestations, or payroll override.
- **Don't mock the database** in integration tests when the test path runs against MongoDB in dev — silent divergence is the biggest risk. Mongoose `findById` mock thenable that returns thenable instances will hang Jest silently (Wave 96 gotcha).
- **Don't use `Set-Content` / `Out-File` in PowerShell for UTF-8 with Arabic text** — defaults vary. Prefer the `Write` tool.
- **Lazy-read `process.env`** in CCTV/Hikvision modules. Top-level reads break under Dynatrace (Phase 27 gotcha).

## Where the truth lives

- **Architecture**: `docs/blueprint/00-master-architecture.md` (canonical reference covering W11-26)
- **Module map**: `docs/MODULES.md` (127 backend modules, 80+ frontend pages)
- **Phase 3 tracker**: `docs/PHASE3_PLAN.md` (Intelligence & Automation — all 6 deliverables now closed)
- **ADRs**: `docs/architecture/decisions/` (001-016)
- **Per-wave detail**: agent memory at `~/.claude/projects/c--Users-x-be-OneDrive-----------04-10-2025-66666/memory/` — `MEMORY.md` is the one-line index, each `project_wave*.md` is the deep detail.

## Open known issues (as of 2026-05-19)

- `backend/services/documents/documentWorkflow.engine.js` — test at `tests/unit/documentWorkflow.engine.test.js:233` is `.skip`'d citing `ReferenceError: escalatedTo`. Source now references `workflow.sla.escalatedTo` correctly across 4 sites — the bug may already be fixed; the skip should be retried.
- 15 `describe.skip` blocks in `backend/tests/eStamp.test.js` + `eSignaturePdf.test.js` — original skip comment blames `safeMount` swallowing route-load failures; investigated 2026-05-19 and found that claim is **wrong** (safeMount logs at error level, routes ARE mounted). Real blocker: tests don't authenticate, so responses come back 401 instead of the asserted `[200, 404, 500]`. Fix path: add a test JWT to the supertest request OR widen the status allow-list. Separately, `npx jest` doesn't auto-discover `backend/jest.config.js` from CWD on this machine — must pass `--config=jest.config.js` explicitly OR install jest into `backend/node_modules` (`devDependencies` declares it but it's not installed locally).
- `database/migration-runner.js` — both apply and rollback are TODO. No safe path to revert a migration.
- `integrations/nafath/index.js` — Nafath endpoint not wired to production. The signing flow at `nafath-esignature.service.js` (v4.0.95) is separate and IS live.
- 5 monolithic route files (>100KB each): `rehabilitation-routes.js`, `workflowEnhanced.routes.js`, `importExportPro.service.js`, `students/student-service.js`, `app.js`. Refactor candidates.
