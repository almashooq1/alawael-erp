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
# Backend dev / test  (jest is not in backend/node_modules — use --config flag)
cd backend && npm run dev                                   # nodemon API
cd backend && npx jest --config=jest.config.js <pattern>    # run specific test
cd backend && npm run test:sprint                           # main test gate (103 files, ~12 min)
cd backend && npm run lint:duplication                      # CI guard (Wave 93)
cd backend && npm run preflight                             # deploy gate
cd backend && npm run gov:status                            # 10 Saudi provider health

# Web-admin (other repo)
cd ../../alawael-rehab-platform/apps/web-admin && npm run typecheck
cd ../../alawael-rehab-platform/apps/web-admin && npm run lint
cd ../../alawael-rehab-platform/apps/web-admin && npm run dev
```

## Test surface map (as of 2026-05-19)

- `backend/__tests__/` — 523 .test.js files. Sprint enumeration covers 103 of these.
- `backend/tests/` — 26 .test.js files. Included via `roots:['__tests__','tests']` in jest.config.
- `backend/tests/unit/` — 1,384 .test.js files. Auto-generated model/route/service smoke tests.
- `frontend/src/__tests__/` — 1,303 .test.js files. ~11,094 tests. CI gates on full suite in both `ci.yml` (push) and `pr-checks.yml::frontend-tests` (PR).
- `alawael-rehab-platform/` — zero tests. Health = `npm run typecheck` + `npm run lint` only.

**Skipped-tests audit (2026-05-21)**: full-tree sweep for `describe.skip` / `it.skip` / `test.skip` / `xdescribe` / `xit` / `xtest` patterns. Backend has **zero** real skips (W209 closed the last 13 in eStamp + eSignaturePdf). Frontend has **one** legitimately skipped suite (`frontend/tests/tests/DocumentList.component.test.js`) with a documented TODO — assertions target the pre-refactor inline-table component; new orchestrator-shape rewrite required, not a quick win. Mobile + web-admin have zero skips. **Heuristic**: when searching for `.skip(` patterns, anchor with `\b` or use `(describe|it|test)\.skip\(` — bare `xit\(` regex generates false positives from every `process.exit(` in the codebase.

## Drift guards in **tests**/ (catch silent regressions)

- `no-broken-requires.test.js` — every relative `require()` resolves. Supports per-(file,target) allow-list for legitimate optional loads.
- `no-utf8-bom.test.js` — no source file starts with EF BB BF (BOM bytes broke regex-based meta-tests).
- `no-it-only-or-skip.test.js` — sprint files don't ship with `.only` or `.skip` leaks.
- `wave-tests-in-sprint.test.js` — any `__tests__/*-waveNN*.test.js` that calls `jest.unmock('mongoose')` must be in `test:sprint` (else CI silently misses it; see the 2026-05-19 561-test rescue thread).
- `sprint-test-files-exist.test.js` — every sprint enumeration entry resolves to a real file.
- `test-script-dedupe.test.js` — no duplicate entries in `test:sprint`.

## Critical conventions

- **Wave numbering**: features ship in numbered "Waves" (currently at W147). Numbers are assigned at commit time — parallel sessions sometimes collide. Use `git log --oneline -20` to see the latest before claiming a number.
- **Atomic commit pattern**: stage + commit in ONE Bash call (`git add files && git commit -m "..."`) — separate `git add` then `git commit` calls have lost work to cross-agent races (Waves 131+134 absorbed into other sessions). See memory entries for W137/138/139 for the proven recipe.
- **Wave-18 invariants**: every new Mongoose model must declare cross-field invariants via virtual paths (see `backend/intelligence/hash-chain.lib.js` callers for examples).
- **TTL fields**: all PII-touching collections use 30-day TTL minimum (aligns PDPL). Patterns at `LlmTelemetryCall`, `LlmAnomalySnapshot`, `HikvisionJobRun`.
- **Reason codes**: use the canonical `intelligence/reason-codes.registry.js` (Wave 89). 20 UPPER_SNAKE codes + Arabic labels + alias map. Don't invent new codes — add to registry.
- **Don't duplicate intelligence/ libs**: `lint:duplication` will fail CI on copy-paste of hash-chain, SoD, sensitivity-grade, evidence-snapshot, reviewer-queue, workflow primitives.

## Don'ts (from prior incidents)

- **alawael-rehab-platform DOES have a remote** (private `github.com/almashooq1/alawael-rehab-platform`, created 2026-05-19) — `git push` works. Periodic bundles to `_backups/*.bundle` still exist as a redundancy.
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

- ~~documentWorkflow / documentTemplates engine skips~~ — **resolved 2026-05-19** in commits `8fe0b2264` + `4e509eec2`. The 4 stale skips (escalateOverdue + 3 `new X(...)` blocks) are now all green. Pattern recap: prefer lazy `mongoose.model('X')` lookup at constructor sites instead of capturing the model reference at module load, so unit tests can intercept via `mongoose.model.mockImplementation`.
- ~~15 `describe.skip` blocks in `backend/tests/eStamp.test.js` + `eSignaturePdf.test.js`~~ — **resolved 2026-05-20** (W205-followup). Re-running the suites today, the routes actually return 200/400/404 — not the 503 the original 2026-05-19 investigation predicted. Something in the middleware/route stack between then and now made the unsigned routes responsive under USE_MOCK_DB. Fix was just: widen the status allow-lists to include 503 (defensive) and `s/describe.skip/describe/`. 46/46 tests now pass. The CLAUDE.md note that `npx jest` requires `--config=jest.config.js` still stands.
- ~~`database/migration-runner.js` rollback~~ — **false alarm in original audit, verified 2026-05-19**. Runner is fully implemented (rollback + lock + status + hooks + dry-run) and passes 8/8 unit tests. The TODOs the audit picked up live inside the _generated migration file template_ (the placeholder dev fills in when adding a new migration), not in the runner itself.
- ~~`integrations/nafath/index.js` stubs~~ — **deleted 2026-05-19**. 3 functions threw "not implemented (P1)" but `createSignatureRequest` + `verifySignature` were already redundant with the live `services/nafathSigningService.js` + `services/nafathAdapter.js` (34/34 tests passing), and the file had zero importers across the codebase. The sibling `signingClient.js` + `jwsVerifier.js` (which DO have importers) remain. Genuine open gap: SSO OAuth code exchange — if needed, add to a new `services/nafathSso.service.js` rather than to a magnet-stub file.
- 4 monolithic backend files (verified 2026-05-19): `app.js` 3,733 LOC · `services/importExportPro.service.js` 3,882 · `students/student-service.js` 3,545 · `routes/workflowEnhanced.routes.js` 3,112. Genuine refactor candidates; each needs a dedicated session. (Audit also listed a 5th `routes/rehabilitation-routes.js` — that file does not exist; ignore.)
- **5 dormant route files** identified 2026-05-20 by dead-route audit, **re-classified 2026-05-20** after side-by-side endpoint review. Real Express routers (574-1500 LOC, 8-45 endpoints each), referenced ONLY from their own auto-generated `tests/unit/*.routes.test.js` — never `require()`-d by `app.js`, `routes/_registry.js`, or any `routes/registries/*.js`. Last human change to each was 3 weeks ago (only lint sweeps since). Per-file verdict:
  - ~~`biometric-attendance.routes.js` (574 LOC, 28 endpoints, ZKTeco system 37)~~ — **mounted 2026-05-20** in `routes/registries/hr.registry.js` Attendance Engine block (W217). Self-protecting (`router.use(authenticate + requireBranchAccess)` at file head → plain `dualMount`, not `dualMountAuth`). All 5 dependencies (ZktecoDevice, AttendanceLog, WorkShift, zktecoSdk.service, attendanceProcessing.service) verified present. 8/8 existing unit tests pass post-mount.
  - `digital-wallet.routes.js` (269 LOC, 15 endpoints — `/stats`, `/coupons`, `/:id/{topup,debit,transfer,statement,block,unblock,apply-coupon,redeem-loyalty,loyalty-history}`) — **NOT superseded**. Zero alternatives found anywhere. Self-protecting (auth + branchScope + per-wallet ownership guard via `requireWalletAccess`). Full service layer (`services/digitalWallet.service.js`) + models (`DigitalWallet`, `WalletTransaction`, `LoyaltyPointsTransaction`) + tests all present. **Strong abandonment signal**: `scheduler/wallet.scheduler.js` IS registered in `server.js:196` — a background cron is maintaining wallet data, but the HTTP layer that lets users interact with it was never mounted. Likely-missing mount in `finance.registry.js`.
  - `payment-gateway.routes.js` (133 LOC, 8 endpoints — `/transactions{,/:id}`, `/:id/refund`, `/initiate`, `/reconciliation`, `/retry-failed`, `/stats`, `/webhook/:gateway`) — **partial overlap with mounted `payments.routes.js`**, but different layer. `payments.routes.js` handles per-provider records (`/paypal`, `/stripe`, `/installment`, `/subscriptions/create`); `payment-gateway.routes.js` is a gateway-agnostic abstraction with `/initiate`, gateway-side `/webhook/:gateway` receiver, and ops endpoints (`/reconciliation`, `/retry-failed`). **Real evidence of abandonment mid-build**: `routes/parent-portal-v1.routes.js:1117` returns a literal `#demo-payment-gateway?...` placeholder URL, with code comment "When the gateway lands, replace the paymentUrl". The gateway never landed. The `/webhook/:gateway` endpoint in particular is a real gap — incoming gateway webhooks have nowhere to land today.
  - `smart-assessment-engine.routes.js` (1500 LOC, 45 endpoints, 12 raw clinical scales — M-CHAT-R/F, CARS-2, Sensory Profile, BRIEF-2, SRS-2, Portage, ABC functional analysis, Family Needs, QoL, ...) — **NOT superseded by W206**. W206 is a meta-engine (assessment → goals/programs); smart-assessment-engine is raw scale data entry + auto-scoring. **Zero alternatives mounted** for any of the 12 scales. Likely abandoned mid-build.
  - `smart-insurance.routes.js` (584 LOC, 21 endpoints) — **partial overlap** with mounted `insurance.routes.js` (companies/policies/claims) + `insuranceClaims.routes.js` (pre-auth/claims/contracts), but has **4 unique features no other route covers**: `check-eligibility`, `calculate-copay`, `rejection-analytics`, `eligibility-checks`. Likely abandoned mid-build, not deliberately superseded.
    **DO NOT auto-mount any of them** — clinical (12 scales) + financial (wallet/gateway/insurance) + biometric surfaces. The correct path is per-file: clinical/financial domain review → either wire mount with security review, OR move to `_archived/`. Treat the same as W205/W205b cases that turned out to be real (mount), but the abandoned-mid-build evidence makes "wire it" the higher-prior outcome — these are LIKELY missing infrastructure, not deliberately-removed code.
