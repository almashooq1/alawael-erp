# 29 — Drill-Down Architecture (Wave 21)

> **القاعدة الحاكمة**: لا توجد لوحة مغلقة. كل KPI / chart / alert يجب أن يقود إلى:
> `explanation → breakdown → owner → next action → related records`.
>
> **Governing rule**: No dashboard is a dead end. Every KPI / chart / alert must lead to:
> `explanation → breakdown → owner → next action → related records`.

---

## 1. The Five-Level Drill Hierarchy

```text
┌─────────────────────────────────────────────────────────────────────┐
│  LEVEL 0 — Executive (org-wide)                                     │
│  /dashboards/executive                                              │
│  • Aggregated KPIs across all branches                              │
│  • Click any KPI → branch breakdown                                 │
├─────────────────────────────────────────────────────────────────────┤
│  LEVEL 1 — Branch                                                   │
│  /dashboards/branch/:branchId                                       │
│  • Same KPI, filtered to one branch                                 │
│  • Adds: branch-specific owners, branch alerts                      │
│  • Click KPI → unit/department breakdown                            │
├─────────────────────────────────────────────────────────────────────┤
│  LEVEL 2 — Unit / Department                                        │
│  /dashboards/branch/:branchId/units/:unitId                         │
│  • KPI by care unit / HR dept / finance section                     │
│  • Click KPI → list of entities driving the number                  │
├─────────────────────────────────────────────────────────────────────┤
│  LEVEL 3 — Entity (filtered list)                                   │
│  /beneficiaries?branch=:branchId&unit=:unitId&filter=:reason        │
│  /employees?branch=:branchId&dept=:unitId                           │
│  /invoices?branch=:branchId&status=overdue                          │
│  • The named entities contributing to the metric                    │
│  • Click row → single record view                                   │
├─────────────────────────────────────────────────────────────────────┤
│  LEVEL 4 — Record (single entity, full context)                     │
│  /care/360/:beneficiaryId                                           │
│  /hr/employees/:id                                                  │
│  /finance/invoices/:id                                              │
│  • Full timeline + alerts + insights + actions for ONE record       │
│  • Terminal level — beyond this is editing or exporting             │
└─────────────────────────────────────────────────────────────────────┘
```

**Why five levels and not three or seven?**
Five matches the operational reality of Al-Awael: org → branch → care/HR/finance unit → entity → record. Fewer collapses semantically distinct levels; more invents transitions nobody asks for.

---

## 2. The Four Orthogonal Slices (per KPI/alert)

Every drillable item has FOUR complementary slices, surfaced as tabs or sections in the detail panel:

| Slice               | Question it answers                  | UI surface                                              |
| ------------------- | ------------------------------------ | ------------------------------------------------------- |
| **Explanation**     | "Why is this number what it is?"     | Insight feed scoped to this KPI + root-cause breadcrumb |
| **Breakdown**       | "What components make it up?"        | Sub-metrics + drivers chart + delta from baseline       |
| **Owner**           | "Who is responsible right now?"      | Resolved owner card (role → user → fallback chain)      |
| **Next Action**     | "What can I do about it?"            | Suggested action list (linked deep-link + estimatedMin) |
| **Related Records** | "Show me the entities driving this." | Filtered entity list (Level 3)                          |

These are NOT five different pages. They are five lenses on the same KPI in the same drill-down panel.

---

## 3. Drill-Down Map (visual)

```text
                          ┌─────────────────────┐
                          │  Executive Summary  │
                          │  (Level 0)          │
                          └──────────┬──────────┘
                                     │ click KPI
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
            Branch A             Branch B          Branch C
            (Level 1)           (Level 1)         (Level 1)
                  │
       ┌──────────┼──────────┬──────────┐
       │          │          │          │
   Care Unit  HR Dept   Finance    Quality
   (Level 2) (Level 2) (Level 2)  (Level 2)
       │
       │ click "12 stalled goals"
       ▼
   ┌─────────────────────────────────────┐
   │  Filtered list (Level 3)            │
   │  /beneficiaries?filter=goals_stalled│
   │  • Ahmed (file 1024) — 3 stalled    │
   │  • Sara  (file 1041) — 2 stalled    │
   │  • Khalid(file 1066) — 1 stalled    │
   └─────────────────┬───────────────────┘
                     │ click row
                     ▼
            ┌────────────────────┐
            │ Single record      │
            │ (Level 4)          │
            │ /care/360/:id      │
            │                    │
            │ Tabs:              │
            │  • Explanation     │
            │  • Breakdown       │
            │  • Owner           │
            │  • Next Action     │
            │  • Related Records │
            └────────────────────┘
```

Every back-arrow returns to the previous level with the same filter context (the "بايرديكرومب" breadcrumb is reconstructible from the URL alone).

---

## 4. Root-Cause Path (the "why" chain)

When the user clicks **"شرح هذا الرقم / Explain this number"** on any KPI or alert, the system returns an ordered chain of "because" steps:

```text
Example: "Attendance is down 12% at Branch A"

  KPI: kpi.attendance.daily_rate
  Current: 78% (baseline: 90%, σ=2.4 → anomaly fired)
  ↓ because
  Driver: kpi.attendance.no_show_count (up 24)
  ↓ because
  Driver: kpi.transport.late_pickup_rate (up 18%)
  ↓ because
  Driver: kpi.transport.vehicle_availability (down 2 buses since Mon)
  ↓ root cause
  Event: vehicle_maintenance_overdue (2 vehicles flagged in CMMS)

  Owner of root-cause: fleet_supervisor (Branch A)
  Next action: "Open Vehicle Maintenance Queue" → /transport/maintenance?branch=A
```

This chain is **stored**, not regenerated each time. It's built by:

1. The `anomaly.v1` generator detecting the KPI breach (Wave 19).
2. The `trend-deviation.v1` generator detecting the slow shift (Wave 19).
3. A **new** `root-cause-chain` generator (Wave 22) that walks the `drivers` graph in the drill registry, ordering by which driver moved most.

The chain length is capped at 5 hops to avoid speculation; if no clear root cause is found in 5 hops, the chain ends with "السبب الجذري غير محدد / Root cause undetermined" and the owner of the original KPI is shown.

---

## 5. Navigation Handoff Rules

### 5.1 URL contract

Every drill-down link follows this shape:

```text
/dashboards/<level>/<id>?from=<source>&kpiId=<kpiId>&filter=<filterId>&t=<timestamp>
```

Where:

- `level` ∈ {executive, branch, unit, entity-list, record}
- `id` is the level-specific identifier (branchId, unitId, beneficiaryId)
- `from` is the originating widget/page (so back-button knows where to return)
- `kpiId` is the KPI being drilled into (used to re-scope the detail panel)
- `filter` is the predicate that brought us here (e.g. `goals_stalled`, `overdue_invoices`)
- `t` is the timestamp at which the parent metric was evaluated (so the drill matches what the user saw)

### 5.2 Breadcrumb reconstruction

The breadcrumb is built **from the URL alone** — no client-side state. This means refreshing the page or sharing the URL gives the same view.

Example:

```text
URL:        /care/360/65f12c?from=branch_dashboard&kpiId=goals_stalled&filter=stalled_30d
Breadcrumb: Executive › Branch A › Care › Goals stalled (3) › Ahmed (file 1024)
```

### 5.3 Back-button contract

- **Soft back** (in-app arrow): pops one drill level, preserves the `filter` and `t` params.
- **Hard back** (browser back): standard history pop.

If the user landed on a deep link without going through the chain (e.g. from a Slack message), the in-app arrow falls back to the level-0 executive dashboard. The breadcrumb still reconstructs from the URL.

### 5.4 Cross-domain handoffs

When a drill jumps domains (e.g. care KPI → transport root cause), the URL prefix changes but the `from` param preserves the origin:

```text
/transport/maintenance?from=care_360_attendance_drill&kpiId=kpi.attendance.daily_rate
```

This lets us track cross-domain navigation in analytics + restore the parent context on back-button.

---

## 6. KPI → Detail Mapping (canonical table)

Every KPI in `backend/config/kpi.registry.js` MUST also appear in `backend/intelligence/drilldown.registry.js` with these fields:

| Field                 | Type               | Purpose                                                        |
| --------------------- | ------------------ | -------------------------------------------------------------- |
| `kpiId`               | string             | Canonical identifier (matches kpi.registry.js)                 |
| `titleAr` / `titleEn` | string             | Display labels                                                 |
| `category`            | enum               | clinical / financial / hr / operational / quality / compliance |
| `levels`              | array              | Drill paths (Level 0 → Level 4)                                |
| `drivers`             | string[]           | Upstream KPIs that feed this one (for root-cause chain)        |
| `owner`               | { role, fallback } | Role-resolved ownership chain                                  |
| `actions`             | array              | Suggested next actions with deepLink + estimatedMin            |
| `relatedGeneratorIds` | string[]           | Insight generators that produce explanations                   |
| `slice`               | enum               | Which slice does this drill into by default?                   |
| `terminalLevel`       | enum               | Deepest level this KPI drills to (some KPIs stop at unit)      |

### 6.1 Worked example

```javascript
'kpi.goals.stalled_count': {
  titleAr: 'الأهداف المتعثرة',
  titleEn: 'Stalled goals',
  category: 'clinical',
  terminalLevel: 'record',
  slice: 'breakdown',
  levels: [
    { level: 'executive', path: '/dashboards/executive', filterKey: null },
    { level: 'branch', path: '/dashboards/branch/:branchId', filterKey: 'branchId' },
    { level: 'unit', path: '/dashboards/branch/:branchId/care', filterKey: 'unitId' },
    { level: 'entity-list', path: '/beneficiaries?filter=goals_stalled', filterKey: 'filter' },
    { level: 'record', path: '/care/360/:beneficiaryId', filterKey: 'beneficiaryId' },
  ],
  drivers: [
    'kpi.attendance.daily_rate',        // bad attendance → goal progress stalls
    'kpi.therapy_sessions.completion',  // missed sessions → no progress logged
    'kpi.therapist.caseload',           // overloaded therapist → underservicing
  ],
  owner: { role: 'care_manager', fallback: 'branch_manager' },
  actions: [
    { id: 'review-goal',    titleAr: 'راجع الهدف', titleEn: 'Review goal',
      deepLink: '/smart-goals/:goalId', estimatedMin: 15, severity: 'should' },
    { id: 'reschedule',     titleAr: 'أعد جدولة',  titleEn: 'Reschedule intervention',
      deepLink: '/appointments/new?beneficiary=:beneficiaryId', estimatedMin: 10, severity: 'should' },
    { id: 'escalate-care',  titleAr: 'تصعيد لمدير الرعاية', titleEn: 'Escalate to care manager',
      deepLink: '/care/escalations/new?subject=goal&id=:goalId', estimatedMin: 5, severity: 'may' },
  ],
  relatedGeneratorIds: ['care-gap.v1', 'anomaly.v1'],
},
```

### 6.2 Coverage commitment

All 39 KPIs in the registry MUST have a drill entry by Wave 23.
Initial 12 priority KPIs (Wave 21):

1. `kpi.beneficiary.active_count`
2. `kpi.beneficiary.admissions_monthly`
3. `kpi.beneficiary.discharges_monthly`
4. `kpi.attendance.daily_rate`
5. `kpi.goals.stalled_count`
6. `kpi.care_plans.review_overdue`
7. `kpi.therapy_sessions.completion`
8. `kpi.therapist.utilization`
9. `kpi.invoices.overdue_count`
10. `kpi.complaints.open_count`
11. `kpi.incidents.critical_open`
12. `kpi.documents.expiring_30d`

A drift test will fail CI if a KPI is added to `kpi.registry.js` without a matching `drilldown.registry.js` entry.

---

## 7. Owner Resolution (the "who" chain)

When the UI asks "who owns this KPI right now?", we resolve through this chain:

```text
1. Direct assignee on the originating alert/insight (alert.ownership.assignedTo)
2. Branch-scoped role holder (e.g. branch_manager of :branchId)
3. Domain-scoped role holder (e.g. medical_director, finance_director)
4. Fallback role (e.g. ceo, super_admin)
```

The drill registry only specifies the **role**; resolving role → user happens at request time via the existing `_resolveUsersForRole` callback (already wired for the Alert engine's tier notifier — same pattern, reused).

If no user resolves at any step, the owner card shows the role name + "(غير معيّن — assign now)" with a click-to-assign action.

---

## 8. Insight Bridge (the "explanation" tab)

The Explanation tab in the drill detail panel renders the **latest active Insight** whose `relatedEntities` contains the entity being viewed AND whose `kind` is in `relatedGeneratorIds` for the KPI.

Query:

```text
GET /api/v1/insights?
  branchId=<branchId>&
  relatedEntityId=<beneficiaryId>&
  generatorId=care-gap.v1,anomaly.v1
  &state=active,confirmed
  &limit=5
```

If no active insight matches:

- Show the latest **resolved** insight from the past 7 days (with timestamp).
- Or "لا يوجد تفسير متاح / No explanation available" + manual "Generate explanation" button (calls `POST /api/v1/insights/generate` with `kpiId` and `entityId` — this is a Wave 22 endpoint that re-runs the relevant generator on-demand).

---

## 9. Action Routing (the "next action" tab)

Each action in the registry has:

- `deepLink` with `:param` placeholders
- `estimatedMin` (so the user knows the time cost)
- `severity`: `must` (red), `should` (amber), `may` (gray)

When the user clicks an action:

1. Params are substituted from the current drill context (`beneficiaryId` from URL, etc.)
2. The click is logged to `AuditLog` (action="action.invoke", metadata={kpiId, actionId})
3. The user is navigated to the target.

This gives us a measurable funnel: "how often does the user actually act on a drill-down?" — which feeds the [[intelligence-layer-2026-05-17]] generator scoreboard ("trust score").

---

## 10. Surface Bindings (where the drill chain shows up)

| Surface                   | Trigger                  | Behavior                                           |
| ------------------------- | ------------------------ | -------------------------------------------------- |
| KPI card on any dashboard | Click on the number      | Open Level-N+1 drill panel                         |
| KPI card                  | Right-click / menu       | Show all 5 slices in a drawer                      |
| Alert card                | Click "تفاصيل / Details" | Open Level-3 entity list filtered to alert.subject |
| Alert card                | Click action button      | Direct route to the action's deepLink              |
| Insight card              | Click "اشرح / Explain"   | Insight detail with root-cause chain               |
| Chart point               | Click on a data point    | Drill to the entities behind that point            |
| Sidebar nav               | Click "Care"             | Level-2 care unit dashboard (current branch)       |

---

## 11. Drift Guards

Three CI-gated guarantees:

1. **Every KPI in `kpi.registry.js` has a `drilldown.registry.js` entry.**
   Drift test: `__tests__/drilldown-kpi-coverage.test.js`.

2. **Every action's `deepLink` resolves to a real frontend route.**
   Drift test: `__tests__/drilldown-action-links.test.js` cross-checks against `apps/web-admin/src/app/**` directory.

3. **Every `relatedGeneratorIds` reference matches an actual generator.**
   Drift test: `__tests__/drilldown-generator-refs.test.js` cross-checks against `backend/intelligence/generators/*.generator.js`.

These guards make the registry self-policing — a developer can't add a KPI without wiring its drill, and can't reference a non-existent action or generator.

---

## 12. Wave 21 deliverables (this PR)

- [x] Design doc (this file)
- [ ] `backend/intelligence/drilldown.registry.js` with **12 priority KPIs** seeded
- [ ] `backend/intelligence/drilldown.service.js` (resolve next level, get owner, get drivers, get actions)
- [ ] `backend/routes/drilldown.routes.js`:
  - `GET /api/v1/drilldown/:kpiId` — full metadata
  - `GET /api/v1/drilldown/:kpiId/next?fromLevel=&toLevel=&...params` — resolve next deep-link
  - `GET /api/v1/drilldown/:kpiId/owner` — owner resolution
  - `GET /api/v1/drilldown/:kpiId/root-cause` — root-cause chain (stub until Wave 22 generator)
  - `POST /api/v1/drilldown/:kpiId/actions/:actionId/invoke` — log action click
- [ ] Tests: registry shape, service paths, route status codes
- [ ] Wire into `app.js` (always-on)

Wave 22 will add the `root-cause-chain` generator and the remaining KPI coverage.
