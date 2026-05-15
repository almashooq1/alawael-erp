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

| Slice                                                | Status | Standard                       |
| ---------------------------------------------------- | ------ | ------------------------------ |
| 2.1 — ISO 9001:2015 clause-by-clause traceability    | ⏳     | ISO 9001:2015                  |
| 2.2 — JCI + CBAHI standards matrix                   | ⏳     | JCI 7th ed. / CBAHI HC 4th ed. |
| 2.3 — 21 CFR Part 11 e-signatures + Document Control | ⏳     | FDA 21 CFR §11.10              |

### Pillar 3 — Professional Operations

| Slice                                      | Status | Standard                             |
| ------------------------------------------ | ------ | ------------------------------------ |
| 3.1 — Supplier Quality (SCAR + scorecards) | ⏳     | ISO 9001 §8.4                        |
| 3.2 — Calibration management               | ⏳     | ISO/IEC 17025 / ISO 9001 §7.1.5      |
| 3.3 — Change Control workflow              | ⏳     | ISO 9001 §8.5.6 / FDA 21 CFR §820.30 |
| 3.4 — Internal-audit auto-scheduler        | ⏳     | ISO 19011                            |
| 3.5 — Cost of Quality (CoQ) tracking       | ⏳     | ASQ PAF model                        |

### Pillar 4 — Analytical Intelligence

| Slice                                  | Status |
| -------------------------------------- | ------ |
| 4.1 — Predictive risk analytics        | ⏳     |
| 4.2 — Trend forecasting on QIs         | ⏳     |
| 4.3 — LLM-generated quality narratives | ⏳     |
| 4.4 — Mobile inspector PWA             | ⏳     |
| 4.5 — Benchmark dashboards             | ⏳     |

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

## Pillar 2.1-2.3, 3.1-3.5, 4.1-4.5

Each slice will land as a self-contained section appended to this document.
