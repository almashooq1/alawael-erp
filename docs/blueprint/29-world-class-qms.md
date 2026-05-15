# Phase 29 — World-Class QMS

Status: **in progress**. Tracks the multi-pillar push to lift the existing QMS (~82% mature, see [docs/blueprint/12-qms-compliance-phase-13.md]) to a world-class level comparable to MasterControl, Veeva QualityOne, Qualio, and ETQ Reliance.

## Scope

Four pillars, each delivered as full vertical slices (model + service + routes + tests + UI + docs):

### Pillar 1 — Advanced Quality-Analysis Tooling

| Slice                                                     | Status     | Standard                                                            |
| --------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| 1.1 — FMEA / HFMEA worksheets                             | ✅ shipped | AIAG-VDA 2019 / VA NCPS HFMEA / IEC 60812 / JCAHO PR.5              |
| 1.2 — Structured RCA (Ishikawa + 5-Whys)                  | ✅ shipped | ASQ / IHI / TJC Sentinel-Event taxonomy                             |
| 1.3 — SPC charts (X-bar / R / p / c / capability indices) | ✅ shipped | AIAG SPC 2nd ed. / ISO 7870 / Western Electric rules / Nelson rules |
| 1.4 — Pareto auto-generation + A3 templates               | ✅ shipped | Pareto Principle (1896) / Toyota A3 / Lean PDCA                     |

### Pillar 2 — International-Standards Compliance

| Slice                                                | Status     | Standard                                   |
| ---------------------------------------------------- | ---------- | ------------------------------------------ |
| 2.1 — ISO 9001:2015 clause-by-clause traceability    | ✅ shipped | ISO 9001:2015                              |
| 2.2 — JCI + CBAHI standards matrix                   | ✅ shipped | JCI 7th ed. / CBAHI HC 4th ed.             |
| 2.3 — 21 CFR Part 11 e-signatures + Document Control | ✅ shipped | FDA 21 CFR §11.10, §11.50, §11.70, §11.200 |

### Pillar 3 — Professional Operations

| Slice                                      | Status     | Standard                             |
| ------------------------------------------ | ---------- | ------------------------------------ |
| 3.1 — Supplier Quality (SCAR + scorecards) | ✅ shipped | ISO 9001 §8.4                        |
| 3.2 — Calibration management               | ✅ shipped | ISO/IEC 17025 / ISO 9001 §7.1.5      |
| 3.3 — Change Control workflow              | ✅ shipped | ISO 9001 §8.5.6 / FDA 21 CFR §820.30 |
| 3.4 — Internal-audit auto-scheduler        | ✅ shipped | ISO 19011                            |
| 3.5 — Cost of Quality (CoQ) tracking       | ✅ shipped | ASQ PAF model                        |

### Pillar 4 — Analytical Intelligence

| Slice                                  | Status     |
| -------------------------------------- | ---------- |
| 4.1 — Predictive risk analytics        | ✅ shipped |
| 4.2 — Trend forecasting on QIs         | ✅ shipped |
| 4.3 — LLM-generated quality narratives | ✅ shipped |
| 4.4 — Mobile inspector PWA             | ✅ shipped |
| 4.5 — Benchmark dashboards             | ✅ shipped |

---

## Pillar 1.1 — FMEA / HFMEA (shipped)

### Files

| Concern      | Path                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------- |
| Registry     | `backend/config/fmea.registry.js`                                                            |
| Model        | `backend/models/quality/FmeaWorksheet.model.js`                                              |
| Service      | `backend/services/quality/fmea.service.js`                                                   |
| Routes       | `backend/routes/fmea.routes.js` (mounted at `/api/fmea` + `/api/v1/fmea` via `_registry.js`) |
| Tests        | `backend/__tests__/fmea-service.test.js` (15 tests, all green)                               |
| Frontend API | `apps/web-admin/src/lib/api.ts` (`fmeaApi`)                                                  |
| List page    | `apps/web-admin/src/app/(dashboard)/quality/fmea/page.tsx`                                   |
| New page     | `apps/web-admin/src/app/(dashboard)/quality/fmea/new/page.tsx`                               |
| Detail page  | `apps/web-admin/src/app/(dashboard)/quality/fmea/[id]/page.tsx`                              |
| Sidebar      | `apps/web-admin/src/components/layout/sidebar.tsx`                                           |

### Capabilities

- Six FMEA flavours: HFMEA (healthcare), PFMEA (process), DFMEA (design), SFMEA (software/system), EFMEA (equipment), UFMEA (user-experience).
- Two scoring scales:
  - `hfmea_5` — VA NCPS 1-5 severity × 1-4 probability → hazard score; auto-actionable when ≥ 8, decision-tree gated 4-7.
  - `aiag_10` — AIAG-VDA 1-10 S/O/D → RPN + 3-axis Action Priority (severity-dominant, replaces deprecated single RPN cut-off).
- Full state machine: `draft → in_review → team_signed → actions_open → actions_completed → verified → archived` (+ `cancelled`).
- HFMEA quorum + multi-role signature check (six required roles).
- Pre/post-action re-rating (Step 8) so the team can verify effectiveness numerically.
- Cross-links to incidents, risks, and CAPA items.
- Event bus emissions on every state change (`quality.fmea.*`) — `high_priority_detected` fires automatically when a new row lands in band H.

### API surface

```
GET    /api/v1/fmea/reference
GET    /api/v1/fmea/dashboard?branchId=
GET    /api/v1/fmea?status=&type=&scale=&limit=&skip=
GET    /api/v1/fmea/:id
POST   /api/v1/fmea
POST   /api/v1/fmea/:id/rows
PATCH  /api/v1/fmea/:id/rows/:rowId
DELETE /api/v1/fmea/:id/rows/:rowId
POST   /api/v1/fmea/:id/rows/:rowId/actions
PATCH  /api/v1/fmea/:id/rows/:rowId/actions/:actionId/status
POST   /api/v1/fmea/:id/rows/:rowId/rerate
POST   /api/v1/fmea/:id/submit
POST   /api/v1/fmea/:id/sign
POST   /api/v1/fmea/:id/verify
POST   /api/v1/fmea/:id/archive
POST   /api/v1/fmea/:id/cancel
```

### Test summary

`npx jest backend/__tests__/fmea-service.test.js` — 15 tests, ~1.7 s. Coverage: registry math (action priority, hazard score, decision tree, rating validation, team-composition validation), create + invalid-input rejection, row authoring + derived ratings for both scales, full lifecycle happy path, verify-blocked-on-missing-re-rating, cancel-locks-edits, dashboard aggregation.

### Worked example

```js
const ws = await fmeaApi.create({
  type: 'hfmea',
  scale: 'hfmea_5',
  title: 'تحليل مخاطر إعطاء الأدوية في القسم الداخلي',
  scope: 'من سحب الجرعة من الصيدلية إلى توثيق الإعطاء في الملف',
});

await fmeaApi.addRow(ws._id, {
  functionAr: 'التحقق من هوية المستفيد بالقياسات الحيوية',
  failureMode: 'تخطي خطوة التحقق',
  failureEffect: 'إعطاء الدواء لمستفيد خاطئ',
  severity: 4, // catastrophic
  probability: 3, // occasional → hazard score 12, auto-band H
});
```

The service emits `quality.fmea.high_priority_detected`; any subscriber on `quality.fmea.*` (e.g. the CAPA auto-link pipeline) can pick it up and open a corrective-action chain.

---

## Pillar 1.2 — Structured RCA (shipped)

### Files

| Concern      | Path                                                                                   |
| ------------ | -------------------------------------------------------------------------------------- |
| Registry     | `backend/config/rca.registry.js`                                                       |
| Model        | `backend/models/quality/RcaInvestigation.model.js`                                     |
| Service      | `backend/services/quality/rca.service.js`                                              |
| Routes       | `backend/routes/rca.routes.js` (`/api/v1/rca`)                                         |
| Tests        | `backend/__tests__/rca-service.test.js` (15 tests, green)                              |
| Frontend API | `apps/web-admin/src/lib/api.ts` (`rcaApi`)                                             |
| Pages        | `apps/web-admin/src/app/(dashboard)/quality/rca/{page.tsx,new/page.tsx,[id]/page.tsx}` |
| Sidebar      | `apps/web-admin/src/components/layout/sidebar.tsx`                                     |

### Capabilities

- Two methods bundled in one investigation: **Ishikawa fishbone** + **5 Whys** chain.
- Ishikawa categories pickable per investigation: `6m` (classic Man/Machine/Material/Method/Measurement/Environment) or `healthcare` (People/Process/Environment/Equipment/Policy/Communication/Patient-factors per IHI/TJC).
- 5-Whys chain enforces depth bounds (min 3, max 7 per ASQ guidance) and rejects empty answers.
- Per-cause "promote to root cause" — preserves the source linkage (`five_whys`/`ishikawa`) and the category if applicable.
- Severity scored 1-6 using the TJC sentinel-event taxonomy (`no_harm` → `death`).
- Action tracking with effectiveness verification: an investigation cannot be verified until _every_ identified root cause has at least one completed action linked back to it.
- Lessons-learned narrative captured on closure for cross-org sharing.
- Lifecycle: `draft → data_collection → analysis → root_cause_identified → actions_open → actions_completed → verified → archived` (+ `cancelled`).

### API surface

```
GET    /api/v1/rca/reference
GET    /api/v1/rca/dashboard?branchId=
GET    /api/v1/rca?status=&severity=&limit=&skip=
GET    /api/v1/rca/:id
POST   /api/v1/rca
POST   /api/v1/rca/:id/ishikawa/:category
DELETE /api/v1/rca/:id/ishikawa/:category/:causeId
PUT    /api/v1/rca/:id/five-whys
POST   /api/v1/rca/:id/root-causes
POST   /api/v1/rca/:id/promote
POST   /api/v1/rca/:id/actions
PATCH  /api/v1/rca/:id/actions/:actionId/status
POST   /api/v1/rca/:id/transition
POST   /api/v1/rca/:id/verify
POST   /api/v1/rca/:id/cancel
```

### Test summary

`npx jest backend/__tests__/rca-service.test.js` — 15 tests, ~2.5 s. Coverage: chain validation, fishbone CRUD with unknown-category rejection, full 5-Whys workflow, promote-from-either-source semantics, full lifecycle to verified, verify-blocked-on-unaddressed-root-cause, cancel-locks-edits, dashboard aggregation.

---

## Pillar 1.3 — SPC charts (shipped)

### Files

| Concern         | Path                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Math + registry | `backend/config/spc.registry.js` (AIAG constants + chart calcs + Western Electric/Nelson rules)            |
| Model           | `backend/models/quality/SpcChart.model.js`                                                                 |
| Service         | `backend/services/quality/spc.service.js`                                                                  |
| Routes          | `backend/routes/spc.routes.js` (`/api/v1/spc`)                                                             |
| Tests           | `backend/__tests__/spc-registry.test.js` (17) + `backend/__tests__/spc-service.test.js` (8) = **25 green** |
| Frontend API    | `apps/web-admin/src/lib/api.ts` (`spcApi`)                                                                 |
| Pages           | `apps/web-admin/src/app/(dashboard)/quality/spc/{page.tsx,new/page.tsx,[id]/page.tsx}`                     |

### Capabilities

- Seven chart types: `xbar_r`, `xbar_s`, `imr`, `p`, `np`, `c`, `u` — every standard chart taught in the AIAG SPC manual.
- AIAG constants table covers subgroup sizes 2-25; sizes outside the table snap to the nearest tabulated row.
- Process-capability indices Cp, Cpk, Pp, Ppk plus a 4-band grade (`inadequate` → `marginal` → `capable` → `world_class`) — computed automatically when USL/LSL are set.
- Variable-sample-size aware: p-chart and u-chart redraw UCL/LCL _per point_ (the textbook approach).
- All eight Western Electric / Nelson rules (3σ breach, 9-run, 6-trend, 14-alternating, 2-of-3 beyond 2σ, 4-of-5 beyond 1σ, 15-hugging, 8-mixture). Rule-firing on the newest measurement emits `quality.spc.special_cause_detected` on the quality event bus so downstream auto-CAPA / notifier subscribers can act.
- Inline SVG control chart in the detail page (no external charting library needed) with UCL/CL/LCL dashed lines and special-cause points highlighted red.

### API surface

```
GET    /api/v1/spc/reference
GET    /api/v1/spc/dashboard?branchId=
GET    /api/v1/spc?status=&chartType=&limit=&skip=
GET    /api/v1/spc/:id           # returns { chart, analysis }
POST   /api/v1/spc
POST   /api/v1/spc/:id/measurements
POST   /api/v1/spc/:id/pause
POST   /api/v1/spc/:id/resume
POST   /api/v1/spc/:id/archive
```

### Test summary

`npx jest backend/__tests__/spc-*.test.js` — 25/25 tests in ~3 s. Covers AIAG constants, computeXbarR/S/Imr, computeP/Np/C/U, computeCapability happy + off-centre + bad-input cases, all 8 special-cause rules, end-to-end service workflow with capability + special-cause emission + lifecycle.

---

## Pillar 1.4 — Pareto + A3 (shipped)

### Files

| Concern      | Path                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry     | `backend/config/pareto-a3.registry.js` (A3 sections + Pareto math + Gini coefficient)                                                               |
| Model        | `backend/models/quality/A3Report.model.js`                                                                                                          |
| Service      | `backend/services/quality/paretoA3.service.js`                                                                                                      |
| Routes       | `backend/routes/paretoA3.routes.js` (`/api/v1/pareto-a3`)                                                                                           |
| Tests        | `backend/__tests__/pareto-a3.test.js` (13 tests, green)                                                                                             |
| Frontend API | `apps/web-admin/src/lib/api.ts` (`paretoA3Api`)                                                                                                     |
| Pages        | `apps/web-admin/src/app/(dashboard)/quality/pareto/page.tsx`, `apps/web-admin/src/app/(dashboard)/quality/a3/{page.tsx,new/page.tsx,[id]/page.tsx}` |

### Capabilities

- **Pareto**: takes a flat item list OR auto-pulls from `incidents` / `complaints` collections (grouped by any field). Returns sorted distribution, cumulative %, "vital few" classification at a tunable threshold (default 80%), Gini inequality coefficient (0=uniform, 1=fully concentrated), and a `isParetoFit` boolean that's true when the distribution is lopsided enough to act on (Gini ≥ 0.4 OR vital share ≤ 25%).
- **Inline SVG Pareto chart** in the UI: red bars for vital-few categories, blue for trivial-many, green cumulative line, dashed 80% reference.
- **A3 reports**: 8-section Toyota template (Background, Current State, Goal, Root-Cause, Countermeasures, Implementation, Follow-up, Lessons-Learned) stored as `Map<sectionCode, body>` so unfilled sections don't bloat the doc.
- Lifecycle: `draft → in_review → approved → in_execution → follow_up → closed` (+ `cancelled`).
- Cross-links to incidents, RCA investigations, and FMEA worksheets so an A3 inherits prior analysis.
- Per-section save (dirty-tracking in the UI) — collaborators can co-author concurrently.

### API surface

```
GET    /api/v1/pareto-a3/reference
POST   /api/v1/pareto-a3/pareto/compute
GET    /api/v1/pareto-a3/pareto/incidents?branchId=&fromDate=&toDate=&groupBy=&threshold=
GET    /api/v1/pareto-a3/pareto/complaints?...
GET    /api/v1/pareto-a3/a3/dashboard
GET    /api/v1/pareto-a3/a3
GET    /api/v1/pareto-a3/a3/:id
POST   /api/v1/pareto-a3/a3
PUT    /api/v1/pareto-a3/a3/:id/sections/:section
POST   /api/v1/pareto-a3/a3/:id/actions
PATCH  /api/v1/pareto-a3/a3/:id/actions/:actionId/status
POST   /api/v1/pareto-a3/a3/:id/transition
POST   /api/v1/pareto-a3/a3/:id/cancel
```

### Test summary

`npx jest backend/__tests__/pareto-a3.test.js` — 13 tests in ~1.5 s. Covers classic 80/20, pre-aggregated counts, uniform distributions (no Pareto fit), empty input, threshold tuning, A3 lifecycle (full happy path + illegal transition + closed-lock + actions).

---

**Pillar 1 status: 4/4 slices shipped.** Total backend tests added so far: **15 (FMEA) + 15 (RCA) + 25 (SPC) + 13 (Pareto/A3) = 68**.

---

## Pillar 2.1 + 2.2 — Standards traceability (shipped)

### Files

| Concern                | Path                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| ISO 9001 registry      | `backend/config/standards/iso-9001-2015.registry.js` (sections 4-10, 36 clauses)                                         |
| JCI 7th ed. registry   | `backend/config/standards/jci-7th-ed.registry.js` (16 chapters + key IPSG/ACC/COP/MMU/QPS/GLD/FMS/SQE/MOI/PCI standards) |
| CBAHI 4th ed. registry | `backend/config/standards/cbahi-hc-4th-ed.registry.js` (LD/QM/PR/AC/AS/MM/IC/FS/HR/IM/ESR chapters + key standards)      |
| Standards index        | `backend/config/standards/index.js` (pluggable lookup)                                                                   |
| Model                  | `backend/models/quality/StandardsTraceability.model.js` (one record per standard+clause+branch tuple)                    |
| Service                | `backend/services/quality/standardsTraceability.service.js`                                                              |
| Routes                 | `backend/routes/standardsTraceability.routes.js` (`/api/v1/standards`)                                                   |
| Tests                  | `backend/__tests__/standards-traceability.test.js` (21 tests)                                                            |
| Frontend API           | `apps/web-admin/src/lib/api.ts` (`standardsApi`)                                                                         |
| Pages                  | `apps/web-admin/src/app/(dashboard)/quality/standards/{page.tsx,[code]/page.tsx}`                                        |

### Capabilities

- **Generic matrix engine** — one model + service + UI handles every standard. Plug-in registry pattern means adding a new standard (e.g. ISO 13485, ISO 14971) is purely a data exercise.
- **Six clause statuses**: `not_started → in_progress → evidence_attached → audit_passed` (plus `lapsed` and `not_applicable` with reason).
- **Evidence linking**: each clause can carry typed evidence links (SOP, training record, internal audit, CAPA, FMEA, RCA, management review, etc.) — first link auto-promotes status to `evidence_attached`; removing the last link drops back to `in_progress`.
- **Review history** — every status change is recorded with reviewer + timestamp + optional note.
- **Coverage % per standard** + per-branch + global rollup dashboard.
- **Gap list** — clauses that are required but still `not_started`/`lapsed`/`in_progress` are surfaced first to focus auditor attention.
- **Idempotent initialisation** — clicking "Initialise all clauses" creates one record per evidence-required clause for the current branch; re-running is a no-op.

### API surface

```
GET    /api/v1/standards
GET    /api/v1/standards/dashboard?branchId=
GET    /api/v1/standards/:code/reference
GET    /api/v1/standards/:code/matrix?branchId=
POST   /api/v1/standards/:code/initialise
PUT    /api/v1/standards/:code/clauses/:clauseCode/status
POST   /api/v1/standards/:code/clauses/:clauseCode/evidence
DELETE /api/v1/standards/:code/clauses/:clauseCode/evidence/:linkId
```

### Test summary

`npx jest backend/__tests__/standards-traceability.test.js` — 21 tests in ~1.5 s. Covers all three registries (clause count, unique codes, parent integrity, IPSG completeness, CBAHI chapter headers, bilingual labels), standards index lookup, initialise-idempotence, status transitions with event-bus emissions, attach/remove evidence + auto-status-promotion, gap reporting, and dashboard aggregation across all three standards.

---

## Pillar 2.3 — Controlled documents with 21 CFR Part 11 e-signatures (shipped)

### Files

| Concern      | Path                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| Registry     | `backend/config/controlled-document.registry.js`                                                                  |
| Model        | `backend/models/quality/ControlledDocument.model.js` (with `computeContentHash` + `computeSignatureHash` helpers) |
| Service      | `backend/services/quality/controlledDocument.service.js`                                                          |
| Routes       | `backend/routes/controlledDocument.routes.js` (`/api/v1/controlled-documents`)                                    |
| Tests        | `backend/__tests__/controlled-document-service.test.js` (13 tests, green)                                         |
| Frontend API | `apps/web-admin/src/lib/api.ts` (`controlledDocApi`)                                                              |
| Pages        | `apps/web-admin/src/app/(dashboard)/quality/documents/{page.tsx,new/page.tsx,[id]/page.tsx}`                      |

### 21 CFR Part 11 conformance checklist

| §        | Requirement             | How we comply                                                                                                                                                                    |
| -------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.10(a) | Validation              | Documented release lifecycle (`draft → in_review → approved → effective → superseded → retired`) plus tamper-evident audit trail.                                                |
| 11.10(c) | Protection              | Each signature stores its _meaning_ (authored / reviewed / approved / witnessed / acknowledged) and is bound to a specific `versionNumber`.                                      |
| 11.10(e) | Audit trails            | `auditTrail[]` is append-only at the API layer; revoking a signature does NOT delete it — it appends a forward-pointing revocation entry.                                        |
| 11.50    | Signature manifestation | Every signature carries `printedName`, `signedAt`, `meaning`, `role`, `ipAddress`, `userAgent`.                                                                                  |
| 11.70    | Linking                 | Cryptographic hash chain (`prevHash → currentHash`) bound to the version's `contentHash`. Tampering any field breaks the chain — `verifyIntegrity(doc)` reports the first break. |
| 11.200   | Non-biometric e-sig     | Service requires `reAuthConfirmed: true`; the route layer is responsible for verifying the user re-entered credentials before calling sign.                                      |

### Lifecycle

- `draft → in_review`: triggered automatically on first non-acknowledgement signature.
- `in_review → approved`: triggered when all three required meanings (authored + reviewed + approved) are present.
- `approved → effective`: explicit transition; service refuses if required signatures are missing. Activating a new version automatically supersedes any other effective version.
- `effective → superseded`: implicit when a new version is activated.
- `effective → retired`: explicit (e.g. policy decommissioned).
- Cancellation is available from any non-terminal state with a reason.

### API surface

```
GET    /api/v1/controlled-documents/reference
GET    /api/v1/controlled-documents/dashboard?branchId=
GET    /api/v1/controlled-documents?branchId=&type=&q=
GET    /api/v1/controlled-documents/:id            # also returns { meta: { integrity } }
POST   /api/v1/controlled-documents
POST   /api/v1/controlled-documents/:id/versions
POST   /api/v1/controlled-documents/:id/versions/:vn/sign
POST   /api/v1/controlled-documents/:id/versions/:vn/revoke-signature/:sigId
POST   /api/v1/controlled-documents/:id/versions/:vn/transition
POST   /api/v1/controlled-documents/:id/versions/:vn/acknowledge
```

### Test summary

`npx jest backend/__tests__/controlled-document-service.test.js` — 13 tests in ~1.9 s. Covers create + version increment + content-hash; signing happy path + re-auth refusal + role/meaning enforcement; auto-advance through draft → in_review → approved; transition guard against missing signatures; supersede-on-activate; **tampered hash detection**; read-acknowledge gating + idempotence; revocation appends counter-entry.

---

**Pillar 2 status: 3/3 slices shipped.** Aggregate Pillar 1-2 backend tests: **68 + 21 + 13 = 102**.

---

## Pillar 3 — Professional Operations (shipped)

### 3.1 Supplier Quality — `backend/{config,models/quality,services/quality,routes,__tests__}/*supplier*`

SCAR full lifecycle (open → acknowledged → in_progress → response_received → verifying → verified → closed). 5-dimension weighted scorecard (on-time delivery, quality acceptance, SCAR performance, responsiveness, commercial) with re-normalisation when dimensions are missing. Grade bands preferred/approved/conditional/probation/disqualified. **11 tests.**

### 3.2 Calibration — `backend/{config/calibration,models/quality/CalibrationAsset,services/quality/calibration,routes/calibration}.{js,routes.js}`

Equipment registry with traceability to national standards, calibration records with pass / pass-with-adjustment / fail outcomes, scheduled sweep that flags overdue assets, 6 lifecycle statuses, support for days/weeks/months/years frequency. **10 tests.**

### 3.3 Change Control — `backend/{config/change-control,models/quality/ChangeRequest,services/quality/changeControl,routes/changeControl}.{js,routes.js}`

ISO §8.5.6 + FDA §820.30 workflow: draft → submitted → impact_assessment → cab_review → approved → in_implementation → verification → closed. CAB voting with simple majority + vote-replacement semantics. Risk-based CAB gating (low risk skips CAB). Implementation steps with status tracking. Verification outcome decides closure vs return-to-implementation. **8 tests.**

### 3.4 Internal Audit Scheduler — `backend/{config/audit-schedule,models/quality/AuditScope,models/quality/AuditOccurrence,services/quality/auditScheduler,routes/auditScheduler}.{js,routes.js}`

ISO 19011-compliant generator. Audit-scope registry with risk levels; cycle frequency derived from risk (critical=3mo, high=6mo, medium=12mo, low=24mo). Idempotent generator (`generateUpcoming`) creates planned occurrences. Findings classified per ISO (major_nc / minor_nc / OFI / observation / commendation). Overall outcome auto-computed at close. **8 tests.**

### 3.5 Cost of Quality — `backend/{config/coq,models/quality/CoqEntry,services/quality/coq,routes/coq}.{js,routes.js}`

ASQ PAF model. Categories: prevention / appraisal / internal_failure / external_failure. Monthly + yearly reports with shift-left detection (P+A > IF+EF). Grade bands world_class (≤4%) / acceptable (≤10%) / poor (≤20%) / critical. **9 tests.**

---

## Pillar 4 — Analytical Intelligence (shipped)

### 4.1 Predictive Risk Analytics — `backend/{config/predictive-risk,services/quality/predictiveRisk,routes/predictiveRisk}.{js,routes.js}`

Combines lagging (recent incidents, complaints, open + overdue CAPAs, critical SCARs) and leading (overdue audits, overdue calibrations, lapsed standards clauses) signals. Logistic-dampened weighted score (0-100) with bands low/moderate/high/critical. Tolerant of missing data sources. **9 tests.**

### 4.2 Trend Forecasting — `backend/{config/trend-forecast,services/quality/trendForecast,routes/trendForecast}.{js,routes.js}`

OLS linear regression + R² + Holt-Winters single-exponential smoothing + Page-1954 CUSUM level-shift detection. Forecast with 95% confidence band on residuals. Indicator history pull when QualityMeasurement model is wired. **13 tests.**

### 4.3 LLM Quality Narratives — `backend/{config/quality-narrative,services/quality/qualityNarrative,routes/qualityNarrative}.{js,routes.js}`

Dual-path generator: rule-based (deterministic + auditable) plus optional LLM client. **Mandatory PII redaction** on both paths covers Saudi national IDs, KSA phone numbers, emails, SA IBANs, and long numeric IDs. Six narrative kinds: executive_summary / monthly_report / incident_brief / audit_finding_summary / risk_outlook / capa_status. Falls back to rule-based when LLM fails. **14 tests.**

### 4.4 Mobile Inspector PWA — `backend/{models/quality/InspectionSubmission,services/quality/inspectionSubmission,routes/inspectionSubmission}.{js,routes.js}`

Offline-first ingestion. Client-generated UUID enables idempotent re-submission. Bulk endpoint accepts up to 200 queued submissions. Auto-scoring (pass / pass_with_actions / fail) from item answers with N/A exclusion. Tracks offline duration + device info for diagnostic. **8 tests.**

### 4.5 Benchmark Dashboards — `backend/{config/benchmark,services/quality/benchmark,routes/benchmark}.{js,routes.js}`

11 industry benchmarks (hand-hygiene, falls/1000, NPS, medication errors, CAPA on-time, incident response, training compliance, CoQ ratio, audit recurrence, calibration on-time, supplier OTD). Direction-aware classification (higher / lower is better) into world_class / top_quartile / industry_median / below_median bands. Bulk-compare endpoint for executive dashboards. **9 tests.**

---

## Aggregate metrics

| Pillar                      | Slices | Backend tests | Modules                                                                                |
| --------------------------- | ------ | ------------- | -------------------------------------------------------------------------------------- |
| 1 — Analysis tooling        | 4      | 68            | FMEA, RCA, SPC, Pareto/A3                                                              |
| 2 — Standards compliance    | 3      | 34            | Standards traceability (ISO 9001 + JCI + CBAHI), Controlled Documents (21 CFR Part 11) |
| 3 — Professional operations | 5      | 46            | Supplier, Calibration, Change Control, Audit Scheduler, CoQ                            |
| 4 — Analytical intelligence | 5      | 53            | Predictive risk, Trend forecast, LLM narratives, Mobile inspector, Benchmarks          |
| **Total**                   | **17** | **201**       | **17 backend modules + 19 routes + 19 services + many models**                         |

Standards now natively supported: AIAG-VDA 2019, VA NCPS HFMEA, IEC 60812, JCAHO PR.5, ASQ / IHI / TJC sentinel-event, AIAG SPC 2nd ed., ISO 7870, Western Electric + Nelson rules, Pareto Principle, Toyota A3 / Lean PDCA, ISO 9001:2015 §4-§10, JCI 7th ed. (IPSG / ACC / PCC / AOP / COP / MMU / PFE / QPS / PCI / GLD / FMS / SQE / MOI), CBAHI HC 4th ed. (LD / QM / PR / AC / AS / MM / IC / FS / HR / IM / ESR), FDA 21 CFR §11.10 / §11.50 / §11.70 / §11.200, ISO/IEC 17025, ISO 9001 §7.1.5 / §8.4 / §8.5.6, FDA 21 CFR §820.30, ISO 19011:2018, ASQ PAF model.
