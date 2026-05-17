# 32 — Cognitive Load Reduction Framework (Wave 24)

> **القاعدة الحاكمة**: أي عنصر لا يساعد قراراً أو إجراءً يجب أن يُراجع أو يُخفّف أو يُنقل إلى مستوى أدنى.
>
> **Governing rule**: Any element that doesn't support a decision or an action must be reviewed, reduced, or moved to a lower tier.

This wave isn't about new features. It's about an **enforceable contract** on what gets rendered, where, and why — so dashboards stay scannable as the platform grows.

---

## 1. The 9 principles as enforceable mechanics

| #   | Principle                        | How we enforce it                                                                                                                                                                                   |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Progressive disclosure**       | Every element has a `tier` (1 / 2 / 3). Tier 3 is hidden by default; revealed only via interaction.                                                                                                 |
| 2   | **One-screen priority model**    | Each dashboard declares an `aboveTheFold` element budget per density (LOW: 6 / MED: 12 / HIGH: 18). The registry FAILS validation if exceeded.                                                      |
| 3   | **Minimal scrolling**            | Tier-1 + tier-2 elements together must fit within 2 viewport heights at the dashboard's declared density.                                                                                           |
| 4   | **Task-oriented grouping**       | Elements live inside `sections`. Each section has a `taskAr/En` (the operator task it serves). Sections without a task are rejected at validate-time.                                               |
| 5   | **Visual hierarchy**             | Tier-1 elements render larger and earlier than tier-2 (the UI component library reads the tier and applies the preset).                                                                             |
| 6   | **Smart defaults**               | Per role × dashboard: pre-applied filters (date range, branch scope, status). `GET /me/dashboard` returns these so the UI never opens "empty".                                                      |
| 7   | **Auto-save where relevant**     | Forms register an `autoSave` profile: `draftMs` (debounce for local draft), `commitTrigger` (blur / submit / interval). Filters auto-save by default.                                               |
| 8   | **Critical signals first**       | The first section of every dashboard is the exception/alert section (`tier: 1`, `aboveTheFold: true`). The validator rejects any layout that doesn't have a tier-1 exception section in position 0. |
| 9   | **Secondary behind interaction** | Tier-2 elements are visible but de-emphasized; tier-3 elements live behind drawers/hover/drill. The UI component library reads `revealOn` (`always / hover / click / drill`).                       |

---

## 2. The scoring contract (the enforcement engine)

Every element registered in the layout policy is scored against this contract at boot:

```
SCORE PASS ⇔
  element.intentAr is non-empty
  AND element.intentEn is non-empty
  AND element.tier ∈ {1, 2, 3}
  AND (tier == 1 ⇒ aboveTheFold == true)
  AND (tier == 3 ⇒ revealOn ∈ {hover, click, drill, drawer})
  AND element.kind ∈ {kpi, alert-stream, chart, list, action-tile, microcopy, status-pill}
  AND element refers to a KPI/alert/action that exists in its source registry
```

A boot-time validator runs `scoreElement()` on every registered element. If any element fails, the dashboard's `validation` flag is `failed` and a CI test (`__tests__/layout-policy-validation.test.js`) fails the build.

Result: **no element ships without a stated `intent` and a `tier`.** The governing rule becomes mechanical.

---

## 3. Tier semantics

```
TIER 1  must-show — the user makes daily decisions from this directly.
        Always above the fold. Largest visual weight. Critical signals,
        primary KPIs, exception lists.

TIER 2  should-show — the user looks at this regularly. Below the fold
        or in a secondary card. Drives less-frequent decisions.

TIER 3  could-show — the user looks at this occasionally. Hidden by
        default; revealed via interaction (hover, click, drawer, drill).
        Historical trends, deep diagnostics, edge-case detail.
```

If a designer can't decide between tier 2 and tier 3, the rule says: **default to tier 3**. Surface less. Promote later if the operator complains.

---

## 4. Above-the-fold element budgets

Density-driven, role-derived from the [[role-profiles-2026-05-17]] layer:

| Density                        | Tier-1 budget (above the fold) | Tier-1+2 budget (within 2 viewports) |
| ------------------------------ | ------------------------------ | ------------------------------------ |
| `low` (executive)              | 6 elements                     | 12 elements                          |
| `medium` (head office)         | 8 elements                     | 18 elements                          |
| `medium-high` (branch manager) | 10 elements                    | 24 elements                          |
| `high` (therapist, reception)  | 12 elements                    | 28 elements                          |

Exceeding these budgets fails validation. The fix is always one of: demote elements to tier 3; split the dashboard; remove elements that lack `intent`.

---

## 5. Section ordering (visual hierarchy)

Every dashboard MUST be ordered:

```
Position 0    CRITICAL_SIGNALS    Exception/alert stream — tier 1
Position 1    OPERATIONAL_PULSE   Primary KPIs — tier 1
Position 2+   TASK_GROUPS         Role-specific work — tier 1/2
Position last DEEP_DIVE           Tier-3 / analytical content
```

The validator enforces position 0 is a `critical-signals` section. Without it, the dashboard fails to register.

---

## 6. Auto-save profiles

A form (filter set, edit form, draft) registers an `autoSave` profile:

```js
autoSave: {
  draftMs:        500 | 1000 | 2000 | null,   // debounce ms for local draft persist
  commitTrigger:  'blur' | 'submit' | 'interval' | 'never',
  commitIntervalMs: number | null,            // only if commitTrigger == 'interval'
  scope:          'session' | 'user' | 'role-default',
}
```

Smart defaults:

- **Dashboard filters** → `{ draftMs: 500, commitTrigger: 'interval', commitIntervalMs: 10_000, scope: 'user' }` so a manager's filter selections survive a refresh.
- **Worklist toggles** (collapse/expand, density override) → `{ draftMs: 0, commitTrigger: 'blur', scope: 'user' }`.
- **Edit forms** (e.g. care-plan note draft) → `{ draftMs: 1000, commitTrigger: 'interval', commitIntervalMs: 30_000, scope: 'user' }` — auto-draft every 30s; explicit submit still required.
- **Sensitive forms** (finance approval, manual rate override) → `{ draftMs: null, commitTrigger: 'submit', scope: 'session' }` — NEVER auto-save; explicit confirm.

The "never auto-save" rule applies to clinical signatures, financial approvals, and DSAR responses — anywhere a wrong silent save is more dangerous than a lost draft.

---

## 7. Smart defaults per role × dashboard

Each role × dashboard combination has pre-applied filters:

```
executive    /dashboards/executive          dateRange=last_30d  branchScope=all
head_office  /dashboards/head-office        dateRange=last_7d   branchScope=all
branch_mgr   /dashboards/branch/:id         dateRange=last_7d   branchScope=:id
clinical     /dashboards/branch/:id/care    dateRange=today     branchScope=:id  status=active
therapist    /me                            dateRange=today     assignee=me
finance      /dashboards/finance            dateRange=this_month status=open
hr           /dashboards/hr                 dateRange=this_quarter
quality      /dashboards/quality            dateRange=last_30d  status=open
reception    /dashboards/reception          dateRange=today     scope=branch
```

The dashboard never opens "empty" — the operator's most-recent decision context is pre-loaded.

---

## 8. Progressive disclosure surfaces

Where does tier-3 content live?

| Reveal mechanism               | When to use                        | Example                               |
| ------------------------------ | ---------------------------------- | ------------------------------------- |
| **Hover tooltip**              | Single fact, ≤1 line               | KPI delta calculation                 |
| **Inline drawer (right-side)** | Bundle of facts about ONE record   | Drill-down panel from Wave 21         |
| **Modal**                      | Multi-step action that needs focus | Add CAPA, sign Nafath                 |
| **Separate page**              | Long-form analytical view          | Anomaly history, generator scoreboard |
| **Tab-in-place**               | Alternate view of the same data    | Daily vs. weekly attendance           |

Rule: **never use modals for read-only content** — they steal focus for no decision. Read-only goes into drawers or hover tooltips.

---

## 9. Element kinds (visual vocabulary)

The component library exposes exactly these kinds. New kinds require a Wave 25+ vote.

| Kind           | Use case                                                              |
| -------------- | --------------------------------------------------------------------- |
| `kpi`          | Single numeric metric + delta + trust badge                           |
| `alert-stream` | Vertical list of alerts (severity badge + title + time-ago)           |
| `chart`        | Time-series, distribution, ranked bar                                 |
| `list`         | Worklist of records with per-row actions                              |
| `action-tile`  | Single high-emphasis button for a decision (e.g. "Approve payroll")   |
| `microcopy`    | Short paragraph or message (e.g. "All caught up — 0 critical alerts") |
| `status-pill`  | One-word status (active / paused / breached)                          |

Anything else is forbidden in the layout registry. This forces the team to use the existing library and not invent one-off components.

---

## 10. Wave 24 deliverables (this PR)

- [x] Design doc (this file)
- [ ] `backend/intelligence/layout-policy.registry.js` — per-dashboard layout: sections + elements (with `intent`, `tier`, `kind`, `revealOn`), auto-save profiles, smart defaults
- [ ] `backend/intelligence/layout-policy.service.js`:
  - `getLayout(dashboardKey)` → full layout
  - `getLayoutForRole(dashboardKey, roleGroupKey, ctx)` → layout with role-specific filtering + smart defaults substituted
  - `scoreElement(element)` → pass/fail with reason
  - `validateDashboard(dashboardKey)` → full report
- [ ] `backend/routes/layout-policy.routes.js`:
  - `GET /api/v1/layout-policy` — list all dashboards
  - `GET /api/v1/layout-policy/:dashboardKey` — full layout
  - `GET /api/v1/layout-policy/:dashboardKey/for-role/:roleGroupKey` — role-adjusted
  - `GET /api/v1/layout-policy/:dashboardKey/validation` — scoring report
- [ ] Tests covering: registry shape, scoring contract, role overrides, smart defaults substitution, validation guards, routes
- [ ] Wire into `app.js` (always-on)

Wave 25 will pair this registry with a CI test that fails the build when an above-the-fold budget is exceeded — completing the enforcement loop.

---

## 11. Drift guards

1. **Every element references an existing KPI / alert surface / action.**
2. **Every section position-0 has `kind: critical-signals` (or contains an `alert-stream` element at tier 1).**
3. **Every tier-1 element has `aboveTheFold: true`.**
4. **Every tier-3 element has a `revealOn` value.**
5. **Above-the-fold element count ≤ density budget.**
6. **Every form's `autoSave.commitTrigger` is set (no implicit defaults — be explicit).**

If you add a card to a dashboard without setting `intent`, validation fails. If you exceed the budget, validation fails. The framework doesn't ask designers to remember the rule — it makes the rule unfailable.
