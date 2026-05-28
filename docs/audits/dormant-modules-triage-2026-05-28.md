# Dormant Modules Triage — 2026-05-28 (W522 follow-up)

Source: `npm run check:dormant-modules` (`backend/scripts/check-dormant-modules.js`).
Method: token-index over every `.js` in `backend/` (excluding tests, archived,
scripts). A candidate `routes/*.routes.js` or `services/**/*.js` is **dormant**
when its filename token appears in **no other production file**.

## How the count narrowed (35 → 29)

The v1 run flagged 35. A reference-classification pass found 6 false positives
caused by two detector blind spots, both fixed in this commit:

| Blind spot                                                | Example                                                                  | Fix                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| Bare-form caller (`require('./x')` without `.service`)    | `rehabilitation.service.js` referenced via `require('./rehabilitation')` | Layer 3: suffix-stripped fallback lookup |
| With-extension JSDoc cross-ref (`// see chainAuditor.js`) | `chainAuditor.js` named in `hash-chain.lib.js` comment                   | Layer 2: with-extension base lookup      |

After the fix the detector reports **29** true candidates, all baselined in
`KNOWN_DORMANT_BASELINE` for ratchet-DOWN tracking.

## Classification

### CLI_TOOL (5) — not a defect; baseline + leave as-is

Referenced **only** from an admin-invoked seed/migration script (+ its own
test). Not auto-loaded at runtime _by design_. Decision needed only if the
business wants them to run on a schedule (wrap in a `*Bootstrap.js` cron).

| Module                                          | Invoked by                          | Recommendation                                                     |
| ----------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `services/finance/insuranceTariffsBootstrap.js` | `scripts/seed-insurance-tariffs.js` | Keep CLI-only (one-time tariff seed)                               |
| `services/hr/hrAdaptiveRetentionService.js`     | `scripts/hr-audit-retention.js`     | Keep CLI-only OR schedule via cron if retention should run nightly |
| `services/hr/hrAuditRetentionService.js`        | `scripts/hr-audit-retention.js`     | Keep CLI-only OR schedule via cron                                 |
| `services/hr/hrCredentialStatusSync.js`         | `scripts/hr-credential-sync.js`     | Candidate for a scheduled sync (SCFHS credential expiry)           |
| `services/rehabSeedPlanner.js`                  | `scripts/rehab-seed-planner.js`     | Keep CLI-only (seed planner)                                       |

### TEST_ONLY (24) — real dormancy; wire-up OR delete decision

Built + unit-tested but referenced by **no production code path**. Each needs
an explicit decision. Grouped by domain for batch handling.

**Documents (7)** — a near-complete document-services suite that was never
mounted. Likely a single feature build that stalled before wiring. Recommend
investigating whether a `documents` route/bootstrap was meant to consume these
as a group before deciding wire-vs-delete:

- `services/documentAuditService.js`
- `services/documentComparisonService.js`
- `services/documentExportService.js`
- `services/documentFavoritesService.js`
- `services/documentQRService.js`
- `services/documentWatermarkService.js`
- `routes/hr/hr-webhooks.routes.js` (HR webhooks route, never mounted — verify against the live `hr.registry.js` mounts)

**Rehabilitation (3)**:

- `services/rehabilitation/RehabService.js`
- `services/rehabilitation/rehabilitationCalculations.service.js`
- `services/rehabilitation/rehabProgressCalculations.service.js`

**Finance (2)**:

- `services/finance/servicePricing.service.js`
- `services/finance/zatcaCalculation.service.js` (⚠ ZATCA — verify it isn't the live ZATCA path before deleting; the live one may be elsewhere)

**HR (1)**:

- `services/hr/saudiLaborCalculations.service.js`

**Clinical / AI / policy (4)**:

- `services/clinical/clinicalProgress.service.js`
- `services/crisisOrchestrator.service.js` (⚠ built in W458 Lifecycle-v3 Phase A; was meant to be wired — likely a genuine "build landed, wire-up missed" gap)
- `services/isolationForest.service.js`
- `services/policyEngine.service.js`
- `services/ruleBuilder.service.js`

**Transport / GPS (3)**:

- `services/gpsSecurityService.js`
- `services/smartFleetDashboard.service.js`
- `services/smartGPSWebSocket.service.js`

**Scheduling (1)**:

- `services/scheduling/waitlistPriority.service.js`

**Reporting (1)**:

- `services/reporting/webhookHandler.js`

**Base class (1)**:

- `services/base/BaseCrudService.js` (a base class designed for `extends` but no production subclass — either adopt it across CRUD services or delete)

## Recommended next actions (not auto-applied — need domain sign-off)

1. **Highest priority — `crisisOrchestrator.service.js`**: per memory, this was
   built in W458 as part of Lifecycle-v3 Phase A and _expected_ to be wired. This
   is the clearest "build landed, wire-up missed" gap. Confirm intended trigger
   (cron sweep? event subscriber?) and wire it, or formally defer.
2. **Document-services suite (7)**: investigate as a group — was a `documents`
   feature abandoned mid-build? If yes, either finish the wire-up (one route +
   bootstrap) or retire the whole suite in one commit.
3. **`zatcaCalculation.service.js`**: verify the live ZATCA path (the active one
   may be `services/zatca*` elsewhere) before any delete — tax-calc is
   compliance-critical.
4. **Everything else**: lower urgency. Ratchet-DOWN one domain per cleanup wave.

## Ratchet-DOWN protocol

When a module is wired-up or deleted, remove it from
`KNOWN_DORMANT_BASELINE` in `backend/scripts/check-dormant-modules.js`
**in the same commit**, and decrement the size assertion in
`backend/__tests__/check-dormant-modules-script.test.js`. The detector fails CI
on either a NEW dormant (not in baseline) or a STALE baseline entry (now wired),
forcing the baseline to stay equal to source truth.

## Disposition log

### W524 — crisisOrchestrator WIRED (1)

`services/crisisOrchestrator.service.js` → mounted at `/api/clinical-crisis`
(`routes/clinical-crisis.routes.js`) per [ADR-033](../architecture/decisions/033-crisis-subsystem-boundary.md).
Unique clinical value (W356/W357 integration) — NOT a duplicate.

### W526 — 6 dead document duplicates DELETED

`services/document{Audit,Comparison,Export,Favorites,QR,Watermark}Service.js`
— superseded by the wired `services/documents/documentX.service.js` suite
(live replacement exists → safe delete). ~1497 LOC + 6 tests removed.

### W527 — 10 bulk-import orphans DELETED

These were NOT duplicates (no live sibling) — they were code dumped by the
two mega-restructuring commits (`b759a656c` 2026-03-19 / `20c3461ad`
2026-04-04), never wired, **0 production referrers**, dead 2+ months, with
only their own auto-generated `tests/unit/*.test.js` smoke tests (none in
`sprint-tests.txt`, none a wave drift-guard). Deleted under the ADR-030
"dormant module disposition" framework (abandoned import → retire):

| Deleted service                                                 | Origin commit |
| --------------------------------------------------------------- | ------------- |
| `services/policyEngine.service.js`                              | b759a656c     |
| `services/ruleBuilder.service.js`                               | b759a656c     |
| `services/smartFleetDashboard.service.js`                       | b759a656c     |
| `services/smartGPSWebSocket.service.js`                         | b759a656c     |
| `services/finance/servicePricing.service.js`                    | 20c3461ad     |
| `services/hr/saudiLaborCalculations.service.js`                 | 20c3461ad     |
| `services/clinical/clinicalProgress.service.js`                 | 20c3461ad     |
| `services/rehabilitation/rehabilitationCalculations.service.js` | 20c3461ad     |
| `services/rehabilitation/rehabProgressCalculations.service.js`  | 20c3461ad     |
| `services/scheduling/waitlistPriority.service.js`               | 20c3461ad     |

**Restore recipe** (if a capability is ever wanted): `git show <W527-commit>^:backend/services/<path>` or `git checkout <W527-commit>^ -- backend/services/<path>`.

### Still HELD (7 TEST_ONLY + 5 CLI_TOOL = baseline 12)

Deliberately NOT auto-disposed — each needs individual or stakeholder review:

- `services/finance/zatcaCalculation.service.js` — ⚠ ZATCA tax compliance; verify against the live ZATCA path before any delete.
- `services/gpsSecurityService.js` — entangled with the **W440** security drift-guard (`verifyAPIKey` timing-safe assertion); deleting needs editing that test.
- `services/base/BaseCrudService.js` — base class; adopt across CRUD services OR delete.
- `services/isolationForest.service.js` — anomaly-ML, shipped in the deliberate Phase 16-18 commit; wire OR delete.
- `services/rehabilitation/RehabService.js` — deliberate module add; the rehab subsystem is fragmented (candidate for a future consolidation ADR).
- `services/reporting/webhookHandler.js` — Phase 10 "delivered/read receipts end-to-end"; the wire-up was likely missed (wire candidate).
- `routes/hr/hr-webhooks.routes.js` — deliberate Phase 16-18 ship; verify the intended mount.
- 5 CLI_TOOL (insuranceTariffsBootstrap / hrAdaptiveRetentionService / hrAuditRetentionService / hrCredentialStatusSync / rehabSeedPlanner) — admin-script-invoked by design; keep unless a scheduled cron is wanted.

**Net: dormant 35 → 12 across W522-W527 (−66%).**
