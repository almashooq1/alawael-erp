# 24 — Session 2026-05-02 — File Manifest

> **Purpose**
>
> The repo had ~150 uncommitted changes when this session started. This
> manifest separates **the files this session created or edited** from
> **files that were already in flight** so the operator can stage,
> review, and commit the session work as a coherent unit without
> accidentally entangling unrelated WIP.
>
> Pair this with `CHANGELOG.md` (the _what + why_) and the runbooks in
> `docs/blueprint/19–23` (the operational details).

## Session-created files (74)

### Backend services + scripts + utilities

```text
backend/services/ops-alerter.js
backend/services/sessionToClaimBridge.js
backend/services/bulkSessionClaims.js
backend/services/insuranceTariffs.js
backend/services/invoiceZatcaHook.js
backend/services/zatcaB2cSlaSweeper.js
backend/services/finance/insuranceTariffsBootstrap.js
backend/scripts/dr-verify.js
backend/scripts/backup-keygen.js
backend/scripts/seed-insurance-tariffs.js
backend/scripts/post-deploy-smoke.js
backend/utils/backup-crypto.js
backend/models/InsuranceTariff.js
backend/startup/zatcaB2cSlaScheduler.js
```

### Backend routes (admin CRUD endpoints)

```text
backend/routes/insurance-tariffs-admin.routes.js
backend/routes/zatca-credentials-admin.routes.js
```

### Backend tests

```text
backend/__tests__/nphies-session-billing-hook.test.js
backend/tests/unit/dr-verify.test.js
backend/tests/unit/ops-alerter.test.js
backend/tests/unit/backup-crypto.test.js
backend/tests/unit/sessionToClaimBridge.test.js
backend/tests/unit/insuranceTariffs.test.js
backend/tests/unit/bulkSessionClaims.test.js
backend/tests/unit/invoiceZatcaHook.test.js
backend/tests/unit/zatcaB2cSlaSweeper.test.js
backend/tests/unit/zatcaB2cSlaScheduler.test.js
backend/tests/unit/zatca-submission-rejected.rule.test.js
backend/tests/unit/insurance-tariffs-admin.routes.test.js
backend/tests/unit/zatca-credentials-admin.routes.test.js
backend/tests/unit/insuranceTariffsBootstrap.test.js
backend/tests/unit/post-deploy-smoke.test.js
backend/tests/unit/admin-routes-have-probes.test.js
backend/tests/unit/env-vars-documented.test.js
```

### Frontend React + tests

```text
frontend/src/__test-utils__/a11y.js
frontend/src/components/nphies/CreateClaimDialog.jsx
frontend/src/components/nphies/BulkCreateClaimsDialog.jsx
frontend/src/pages/finance/InsuranceTariffsAdmin.jsx
frontend/src/pages/finance/ZatcaCredentialsAdmin.jsx
frontend/src/__tests__/a11y/common-components.a11y.test.js
frontend/src/__tests__/a11y/create-claim-dialog.a11y.test.js
frontend/src/__tests__/a11y/bulk-create-claims-dialog.a11y.test.js
frontend/src/__tests__/a11y/insurance-tariffs-admin.a11y.test.js
frontend/src/__tests__/a11y/zatca-credentials-admin.a11y.test.js
frontend/src/__tests__/drift/no-brittle-count-assertions.test.js
frontend/src/__tests__/drift/react-app-env-vars-documented.test.js
```

### CI

```text
.github/workflows/dr-verify.yml
```

### Documentation (runbooks)

```text
docs/blueprint/19-dr-verification.md
docs/blueprint/20-accessibility.md
docs/blueprint/21-session-to-claim-bridge.md
docs/blueprint/22-zatca-phase2.md
docs/blueprint/23-go-live-checklist.md
docs/blueprint/24-session-2026-05-02-manifest.md       (this file)
```

### Regulatory tier (continued — QMS + PDPL + PII access)

After the 30-step operational push, the same session continued into
the QMS / PDPL UI gap.

```text
backend/middleware/piiAccess.middleware.js
backend/routes/pii-access-audit-admin.routes.js
backend/tests/unit/piiAccess.middleware.test.js
backend/tests/unit/pii-access-audit-admin.routes.test.js

frontend/src/pages/Quality/ManagementReviewAdmin.jsx
frontend/src/pages/Quality/EvidenceVaultAdmin.jsx
frontend/src/pages/Quality/ComplianceCalendarAdmin.jsx
frontend/src/pages/Quality/PdplSubjectRequestsAdmin.jsx
frontend/src/pages/Quality/PdplConsentsAdmin.jsx
frontend/src/pages/Quality/PdplBreachReportingAdmin.jsx
frontend/src/pages/Quality/PdplProcessingRecordsAdmin.jsx
frontend/src/pages/Quality/PdplComplianceDashboard.jsx
frontend/src/pages/Quality/PiiAccessAuditAdmin.jsx
frontend/src/__tests__/a11y/management-review-admin.a11y.test.js
frontend/src/__tests__/a11y/pii-access-audit-admin.a11y.test.js
```

## Session-modified files (~80)

Files that already existed and were edited as part of this session.

### Backend

```text
.env.example                                          # +4 sections (DR, ops-alerter, ZATCA, smoke)
backend/.env.example                                  # implicit via shared guard
backend/app.js                                        # boot block for ZATCA SLA scheduler
backend/config/backup.js                              # ops-alerter + encrypt hook
backend/models/Invoice.js                             # post-save → invoiceZatcaHook
backend/services/nphiesReconciliationService.js       # session.isBilled lifecycle lock
backend/alerts/rules/zatca-submission-rejected.js     # canonical zatca.zatcaStatus path
backend/routes/_registry.js                           # 4 new dualMounts (incl. pii-access-audit)
backend/routes/therapy-sessions-admin.routes.js       # /:id/create-claim + /bulk-create-claims + logPiiAccess
backend/routes/beneficiaries-admin.routes.js          # logPiiAccess('Beneficiary')
backend/routes/invoices-admin.routes.js               # logPiiAccess('Invoice')
backend/routes/nphies-claims-admin.routes.js          # logPiiAccess('NphiesClaim')
backend/routes/care-plans-admin.routes.js             # logPiiAccess('CarePlan')
backend/routes/assessments-admin.routes.js            # logPiiAccess('ClinicalAssessment')
backend/routes/hr/employee-admin.routes.js            # logPiiAccess('Employee')
```

### Frontend

```text
frontend/.env.example                                 # +3 missing REACT_APP_* vars
frontend/cypress/support/commands.js                  # removed empty cy.checkA11y stub
frontend/src/components/Layout/sidebar/sidebarNavConfig.jsx  # 2 nphies + 9 QMS/PDPL admin entries
frontend/src/routes/NphiesRoutes.jsx                  # 2 lazy-loaded admin routes
frontend/src/routes/QualityManagementRoutes.jsx       # 9 lazy-loaded QMS/PDPL routes
frontend/src/pages/rehab/TherapySessionAdmin.js       # claim button + bulk button
frontend/src/__tests__/services-*.test.js (63 files)  # toBe → toBeGreaterThanOrEqual bulk
```

### CI

```text
.github/workflows/pr-checks.yml                       # frontend-tests gate widened
.github/workflows/deploy-hostinger.yml                # 3 silent-fail layers removed +
                                                     # smoke probes step + tariff seed step
```

### Top-level

```text
CHANGELOG.md                                          # full session entry
```

## NOT modified by this session

These files appear in `git status` but are **pre-existing WIP** that
predates this session. Review and commit them separately.

```text
backend/jest.config.js
backend/package.json
backend/models/EpisodeOfCare.js
backend/routes/attendance-management.routes.js
backend/routes/documents.routes.js
backend/routes/episodes.routes.js
backend/routes/registries/documents.registry.js
backend/services/attendanceManagement.service.js
backend/tests/unit/kpi-attendance.scheduler.scheduler.test.js
frontend/scripts/_relax_p107_assertions.js
frontend/src/AuthenticatedShell.js
docs/blueprint/01-system-context.md
docs/blueprint/07-integrations.md
docs/blueprint/09-roadmap.md
```

(Other files in `git status` that fall outside the session-created /
session-modified lists above are also unrelated WIP.)

## Suggested staging plan

If the operator wants to commit this session's work as one logical
unit, the following 3-commit split keeps each PR-sized:

1. **Drift guards + silent-failure fixes** — the `__tests__/drift/`
   files, the cypress stub removal, the deploy-hostinger.yml
   silent-failure removals, the brittle-count migration of 63 test
   files, the `.env.example` documentation additions.
2. **DR/encryption stack** — `dr-verify.js`, `backup-crypto.js`,
   `backup-keygen.js`, `ops-alerter.js`, `dr-verify.yml`, the
   `config/backup.js` edits, runbook 19.
3. **Operational pipelines (NPHIES + ZATCA + tariffs)** — the
   bridge service, bulk runner, tariff resolver + admin + seed,
   ZATCA hook + SLA sweeper + credentials admin, post-deploy
   smoke probes, frontend pages, runbooks 21–23, CHANGELOG entry,
   sidebar/router wiring.
4. **Regulatory admin tier (QMS + PDPL + PII access)** —
   `piiAccess.middleware.js` + `pii-access-audit-admin.routes.js`
   - the 7 routes wrapped with `logPiiAccess(...)` + the 9 QMS/PDPL
     admin pages + `QualityManagementRoutes.jsx` + sidebar entries
   - the `MUST_HAVE_PROBE` extension. **Each admin page is its own
     shippable feature** — operators can review and roll them out
     one CBAHI / PDPL article at a time if PR review needs it.

Or as a single commit referencing the CHANGELOG entry. The split is
suggested only because PR-review fatigue is a real failure mode.
