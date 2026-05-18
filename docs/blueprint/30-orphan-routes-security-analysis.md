# Orphan-Route Security Analysis — Wave 83 (2026-05-18)

## Executive summary

| Stat                                                                                | Count   |
| ----------------------------------------------------------------------------------- | ------- |
| Total `backend/routes/*.js` files                                                   | 506     |
| Routes referenced anywhere (mounted, required, archived in tests)                   | 376     |
| **Truly orphan** (not mounted, not required, not in tests)                          | **130** |
| Orphan files **landed during this session** (Waves 9-15, kept tracked deliberately) | ~110    |
| Orphan files **pre-existing** before this session                                   | ~20     |

**Verdict:** the orphan list isn't a security incident — it's an
inventory of _staged-but-deferred_ feature work. Every file is
tracked, every file lives next to its sibling routes/, and every
mount decision will go through the same `_registry.js` gate.

The risk is **not** that these routes leak (they don't run). The
risk is **policy drift**: as new orphans accumulate, the bar for
"what should be live in production" gets harder to read.

This document categorizes the 130 orphans, ranks them by mount
priority, and lists the security work each one needs _before_ it
goes live.

---

## How "orphan" is detected

```sh
# Routes that exist on disk
ls backend/routes/*.js | xargs -n1 basename | sed 's/\.js$//' \
  > /tmp/all-routes.txt

# Routes referenced anywhere in backend/* (mounted, required, tested)
grep -rE "require\(['\"][^'\"]*routes/[a-zA-Z0-9_.-]+['\"]\)" \
  backend/ --include="*.js" | grep -v _archived | grep -v .jest-cache \
  | sed -E "s/.*routes\/([a-zA-Z0-9_.-]+).*/\1/" | sort -u \
  > /tmp/all-referenced.txt

# Truly orphan = on disk + referenced nowhere
comm -23 /tmp/all-routes.txt /tmp/all-referenced.txt > /tmp/true-orphans.txt
```

`_archived/` and `.jest-cache/` are excluded — those are dead-code
graveyards by design.

---

## Category breakdown

| Category                 | Count | Mount priority   | Risk if mounted naively                                                                                                       |
| ------------------------ | ----- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Fleet / Transport**    | 39    | Medium           | Vehicle PII (plates, drivers) — needs PDPL gate                                                                               |
| **QMS (quality)**        | 21    | High (CBAHI)     | Controlled docs / capa already mostly mounted via care registry — these are tiles + admin views; need quality_compliance gate |
| **Education / Student**  | 13    | Medium           | Student PII + minor-data — needs PDPL Art.13 banner                                                                           |
| **Dashboards / Reports** | 13    | Low              | Aggregated views — mostly safe; risk is _exposing internal KPI to wrong role_                                                 |
| **Clinical extensions**  | 11    | High             | rehab licenses, ICF assessments, ar-rehab — PHI gate required                                                                 |
| **Comms**                | 9     | High             | admin messaging, AI assistants, WhatsApp — outbound channels need rate limits + audit                                         |
| **Infrastructure**       | 9     | High             | integrations, licenses, org branding — touch tenant config                                                                    |
| **HR**                   | 4     | **Critical**     | Payroll-adjacent, deep PII — needs HR compensation gate + MFA tier-2 minimum                                                  |
| **Finance**              | 4     | **Critical**     | Cheques + statements + approvals — needs finance.approver gate + MFA tier-3                                                   |
| **Security**             | 3     | **Critical**     | `rbac.admin`, `mfa`, `break-glass` — needs ciso/dpo gate + audit anchor                                                       |
| **Public-facing**        | 1     | Special          | `blockchain-public` — explicitly auth-free; review for cert disclosure                                                        |
| **Misc**                 | 3     | Per-route triage | ai.recommendations, beneficiaryPortal, purchasing                                                                             |

---

## Critical-tier orphans (mount blockers)

These 11 routes touch the most sensitive surfaces and **MUST NOT** be
mounted until they pass per-route security review.

| Route                          | Category | Required permission                              | MFA tier | Audit               | Notes                                                            |
| ------------------------------ | -------- | ------------------------------------------------ | -------- | ------------------- | ---------------------------------------------------------------- |
| `rbac.admin.routes`            | Sec      | `governance.permissions.write` (new)             | 3        | anchor              | Role-matrix editor — single highest-risk surface                 |
| `mfa`                          | Sec      | already gated upstream                           | 2        | yes                 | Step-up MFA admin UI — needs `requirePerm('security.mfa.admin')` |
| `break-glass.routes`           | Sec      | `security.break-glass.invoke` (new)              | 3        | anchor + Slack page | Emergency access — every invocation must page CISO               |
| `finance-cheques.routes`       | Fin      | `finance.cheques.issue` (new)                    | 3        | yes                 | Cheque issue/cancel — touches treasury                           |
| `finance-statements.routes`    | Fin      | `finance.statements.read`                        | 2        | yes                 | Bank-statement reconciliation views                              |
| `finance-approvals.routes`     | Fin      | `finance.invoices.approve` (already in registry) | 2        | yes                 | Wire to existing perm before mount                               |
| `accounting-operations.routes` | Fin      | `finance.accounting.ops` (new)                   | 3        | yes                 | GL adjustments                                                   |
| `hr-smart.routes`              | HR       | `hr.intelligent.read` (new)                      | 2        | yes                 | AI-driven HR insights — compensation-adjacent                    |
| `hrAdvanced.routes`            | HR       | `hr.compensation.modify` (existing)              | 2        | yes                 | Compensation modify surface                                      |
| `hrUnified.routes`             | HR       | per-action gate                                  | 2        | yes                 | Mega-router — split before mount                                 |
| `employeeProfile`              | HR       | `hr.employees.view` (existing)                   | 1        | yes                 | Profile viewer — at minimum needs PDPL banner                    |

**Recommendation:** Wave 84+ should pick ONE per session, add the
permission code to `governance.registry`, write the mount block
in `app.js` (graceful boot pattern from Waves 40/72/74), add
unit + integration tests, then ship.

---

## High-tier orphans (clinical PHI)

11 routes touching PHI. Each needs PDPL Art.13 audit banner +
clinical-role permission gate.

| Route                                           | Surface                                            |
| ----------------------------------------------- | -------------------------------------------------- |
| `rehab.routes` · `rehab-licenses.routes`        | Discipline catalog + licensing                     |
| `disability-assessment.routes`                  | Disability scoring                                 |
| `icf-assessments.routes`                        | ICF profile editor                                 |
| `smart-attendance.routes`                       | Attendance with biometric                          |
| `therapy-sessions-analytics.routes`             | Session analytics — could expose PHI in aggregates |
| `therapist-extended.routes`                     | Therapist mega-router                              |
| `document-center.routes`                        | Document workflow                                  |
| `electronic-directives.routes`                  | Advance directives — DNR-equivalent                |
| `ar-rehab.routes`                               | Arabic-rehab — region-specific clinical patterns   |
| `beneficiary-core.routes` · `beneficiaryPortal` | Core beneficiary CRUD (alt path)                   |

---

## QMS-tier orphans (CBAHI / 21 CFR Part 11)

21 routes spanning the quality module. Several are admin tiles for
already-mounted services (capa-admin, quality-narrative). These can
mount safely under `quality_compliance` group with read/write split.

```
quality{CommandCenter,Controls,HealthScore,Narrative}.routes
managementReview.routes · capa-admin.routes
controlledDocument.routes (21 CFR Part 11 — needs e-sig binding)
fmea.routes · rca.routes · spc.routes · paretoA3.routes
benchmark.routes · trendForecast.routes · predictiveRisk.routes
calibration.routes · changeControl.routes · coq.routes
complianceCalendar.routes · standardsTraceability.routes
supplierQuality.routes · evidence.routes
```

**Recommendation:** Wave 85 candidate — mount the QMS bundle behind
`requirePerm('quality.audit.read')` (existing) for read, splitting
write perms per-route.

---

## Medium-tier orphans (Fleet 39)

Largest single category — the entire fleet/transport vertical. These
were shipped as a coherent set in commits 9-15 of the chunked rescue
session (2026-05-17), tracked but deliberately not mounted pending
operational sign-off from the transport team.

Recommendation: keep as orphan until the transport team owns a
launch plan. Mounting partial fleet ≠ mounting the whole.

---

## Medium-tier orphans (Education 13 + Dashboards 13)

```
EDU (13): student-{certificates,complaints,elearning,events,
          health-tracker,management,rewards-store} · cms ·
          elearning · montessoriAuth · communityAwarenessRoutes ·
          tasks.routes · guardianPortal.routes

DASH (13): alerts · approvals · archive · audit-logs ·
           auditScheduler · dashboard.routes.unified ·
           dashboard.stats · executive-dashboard ·
           executive-dashboard-enhanced · report-{builder,center} ·
           search · hq-reports
```

**Education** needs PDPL Art.13 banner because minors-data
collection is involved. Recommend mounting under `/api/v1/students`
with role gate `student.records.access`.

**Dashboards** — `executive-dashboard` and `executive-dashboard-enhanced`
are likely **stale** (Wave 18 Dashboard Platform supersedes them).
Recommend: confirm with stakeholder, then either mount under
`executive_leadership` group OR move to `_archived/`.

---

## Public-facing (1)

`blockchain-public.routes` — explicit no-auth surface for external
certificate verification. **Mount risk:** none, by design — but
must verify the route doesn't accidentally return PHI alongside
the cert proof. Recommend Wave 84 audit + then mount.

---

## Recommendations summary

1. **Don't bulk-mount.** Each route needs the same gate + audit +
   test treatment as a new feature. Cron host can't add routes;
   only PRs through `_registry.js` or `app.js`.
2. **Critical tier (11 routes)** — one per future wave, with full
   permission code + MFA gating + audit anchor.
3. **High-tier clinical (11 routes)** — bundle as Wave-86 candidate
   under `clinical.routes-bundle` with PDPL Art.13 banner.
4. **QMS-tier (21 routes)** — Wave-85 candidate, single mount block
   under the existing `quality_compliance` group.
5. **Fleet (39 routes)** — defer until transport team launch plan.
6. **Education (13)** — Wave-87 candidate, mount under `/api/v1/students`.
7. **Dashboards (13)** — audit for staleness first; some likely
   superseded by Wave 18 Dashboard Platform.
8. **Stale candidates for `_archived/`** — at minimum:
   `executive-dashboard.js`, `executive-dashboard-enhanced.js`
   (superseded), `dashboard.routes.unified.js` (likely superseded
   by `routes/dashboards-platform.routes.js`).

---

## Appendix — full orphan list

The complete 130-entry list lives at
`docs/blueprint/30-orphan-routes-security-analysis.appendix.txt`
(generated by the detection script above; not committed to keep
this doc readable). Re-run the detector with:

```sh
ls backend/routes/*.js | xargs -n1 basename | sed 's/\.js$//' | sort -u > /tmp/all-routes.txt
grep -rE "require\(['\"][^'\"]*routes/[a-zA-Z0-9_.-]+['\"]\)" backend/ --include="*.js" \
  | grep -v _archived | grep -v .jest-cache \
  | sed -E "s/.*routes\/([a-zA-Z0-9_.-]+).*/\1/" | sort -u > /tmp/all-referenced.txt
comm -23 /tmp/all-routes.txt /tmp/all-referenced.txt
```

---

## Out of scope

- Per-action SoD analysis (Wave 31 Authorization Constitution
  already covers this at decide() time)
- UI route coverage (web-admin nav-coverage script already gates this)
- API documentation coverage (separate concern — OpenAPI specs
  cover only mounted routes by definition)
