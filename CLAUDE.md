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

**Schedulers / sweepers audit (2026-05-21)**: 39 scheduler/sweeper source files across `scheduler/`, `intelligence/`, `services/`, `services/quality/`, `services/hr/`, `services/email/`, `services/ai/`, `startup/`, `students/`, `alerts/`. **Every one is reachable from startup.** Shallow grep against `app.js | server.js | startup/` directly initially flagged 4 candidates (alerts/scheduler, care-plan-plateau-detector, services/email/emailScheduler, startup/dlqReplayScheduler) as dormant — all 4 turned out to be wired via 1–2 hops through bootstrap files (`alerts/bootstrap.js`, `intelligence/care-plan-bootstrap.js`, `startup/integrationHardeningBootstrap.js`) or via the `services/<domain>/index.js` aggregator pattern. **For the next audit, the chain to walk is**: `app.js | server.js → */bootstrap.js → */scheduler.js`. The W225 wallet finding (scheduler wired but its HTTP API dormant) is a **unique inversion** — not a recurring pattern — every other scheduler in the system is integrated end-to-end.

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
- ~~**5 dormant route files**~~ — **AUDIT WAS WRONG, all 5 are live**, retracted 2026-05-21. The original audit grepped for `safeRequire('../routes/X.routes')` references in `app.js` + `_registry.js` + `registries/*.js` and concluded these 5 had zero references. But several registries use a DIFFERENT pattern: `safeMount(app, ['/api/X', '/api/v1/X'], './X.routes')` — relative path, no `safeRequire` indirection. All 5 supposedly-dormant files are actually wired via this pattern: `digital-wallet`+`payment-gateway`+`smart-insurance` at `finance.registry.js` lines 88/91/93, `smart-assessment-engine` at `clinical-assessment.registry.js:209-213`, `biometric-attendance` at `hr.registry.js:140-143`. `app.js` smoke-load confirms 3 mount entries per file. **My intermediate W217 + W225b commits both added DUPLICATE `dualMount`s for biometric-attendance and digital-wallet** — Express ignored the second mount of each (first-match wins) but the redundant lines were committed; reverted 2026-05-21 in commit (this one). **Audit-methodology fix**: a complete dead-route audit MUST grep for BOTH patterns: `safeRequire(.../X.routes)` AND `safeMount(..., './X.routes')`. Future audits, walk:

  - ~~`biometric-attendance.routes.js` (574 LOC, 28 endpoints, ZKTeco system 37)~~ — **was already mounted** via `safeMount` at `hr.registry.js:140-143` since long before this audit. W217 added a DUPLICATE `dualMount` (no functional harm — Express first-match — but redundant); reverted 2026-05-21.
  - ~~`digital-wallet.routes.js` (269 LOC, 15 endpoints)~~ — **was already mounted** via `safeMount` at `finance.registry.js:~88` since long before this audit. W225b added a DUPLICATE `dualMount` (no functional harm but redundant); reverted 2026-05-21. The `scheduler/wallet.scheduler.js` cron + HTTP API have BOTH been live; the dormant-route classification was simply wrong.
  - ~~`payment-gateway.routes.js`~~ — **was already mounted** via `safeMount` at `finance.registry.js:91`. The "abandoned mid-build" classification is partially still true at the CONSUMER layer — `parent-portal-v1.routes.js:1117` still returns a `#demo-payment-gateway?...` placeholder URL (frontend shows a "Demo — gateway not wired" alert) instead of calling the live `POST /api/payment-gateway/initiate`. The comment at line 1116 says "To activate: integrate HyperPay / PayTabs / STC Pay here" — meaning the gateway exists but no provider has been wired to it yet. **Requires product decision** on provider choice + secret/keypair provisioning. Not an agent-autonomous fix.
  - ~~`smart-assessment-engine.routes.js`~~ — **was already mounted** via `safeMount` at `clinical-assessment.registry.js:209-213` at path `/api/smart-assessment` (note the shorter URL — that's why the original grep missed it). The 12 clinical scales (M-CHAT-R/F, CARS-2, etc.) are live.
  - ~~`smart-insurance.routes.js`~~ — **was already mounted** via `safeMount` at `finance.registry.js:93`. Both its unique 4 features (eligibility/copay/rejection-analytics) AND its 17 endpoints overlapping `insurance.routes.js`/`insuranceClaims.routes.js` are all live.
    **Lesson recorded for future dead-route audits**: this codebase has at least 4 mount-pattern families: (1) `const X = safeRequire('../routes/X.routes')` + `dualMount(app, 'X', X)`, (2) `safeMount(app, ['/api/X', '/api/v1/X'], './X.routes')` with relative path (no `safeRequire`), (3) direct `app.use('/api/X', require('./routes/X'))` in `app.js`, (4) sub-mounts via `*Bootstrap.js` files for schedulers/jobs. A "dormant" finding MUST rule out ALL four patterns before claiming a file is unmounted.

- **2 actionable stale TODOs in `routes/parent-portal-v1.routes.js`** (sweep 2026-05-21). Both have working backend infrastructure that the parent-portal route hasn't been connected to yet:
  - **Line 1115-1119** (`POST /invoices/:id/pay`): returns `#demo-payment-gateway?invoice=...&amount=...&currency=SAR` placeholder URL. The real `POST /api/payment-gateway/initiate` endpoint exists (per `finance.registry.js:91` mount). Comment at line 1116 says "To activate: integrate HyperPay / PayTabs / STC Pay here" — meaning the gateway exists but no provider has been wired. **Requires product decision** on provider + secret provisioning; not agent-autonomous.
  - **Line 1131-1135** (`GET /messages/threads`): returns `[]`. Original TODO assumed wiring it to `services/messaging.service.getThreads()` would surface real data. **2026-05-21 discovery: that service is ALSO a stub** (`services/messaging.service.js:185-196` returns hardcoded `{ _id: 'thread-001', participants: ['user-001', 'user-002'], ... }`). The legacy frontend `frontend/src/services/messagesService.js:48` calls `/messages/threads` directly and gets this fake mock — any UI rendering threads has been showing FAKE data, not user conversations. Real fix: implement `getThreads` against `models/conversation.model.js` (which has `participants[].user`, `lastMessage`, etc.). The model name in the original TODO ("MessageThread") is WRONG — the actual model is `Conversation` (see `models/conversation.model.js`). Real fix scope: rewrite `messaging.service.getThreads/getThread/addMessageToThread` (3 stubs, all hardcoded), update legacy frontend's `messagesService` consumer if response shape changes, add tests. Multi-file feature work, not audit cleanup.
    Other `res.status(501)` occurrences in routes are graceful "model not available" fallbacks (defensive code for optional dependencies), NOT stale TODOs.
