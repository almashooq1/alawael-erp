# 33 — Premium Services & Productivity Features (Wave 25)

> هدف هذا الـ wave: لمسات فخامة احترافية تجعل النظام يشعر بأنه أداة قرار يومية للمسؤول، لا مجرد لوحة عرض. كل ميزة هنا تخلق _عادة استخدام_ — لحظة محددة في يوم المسؤول يفتح فيها المنصة.
>
> The goal of this wave: premium, professional touches that make the platform feel like a daily decision instrument — not a passive dashboard. Each feature creates a _habit moment_ — a specific time of day the operator opens it.

---

## 1. Feature catalog × value × placement

### 1.1 Morning Briefing — ملخص الصباح

| Field         | Value                                                                                                                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | One-shot bilingual digest the operator reads in 2 minutes at 8 am. Surfaces overnight critical alerts, today's expected anomalies, blocker decisions waiting on the operator. Replaces "scrolling through 6 dashboards to figure out where to start." |
| **Trigger**   | Auto-generated nightly at 06:00 KSA; delivered via in-app banner + email + WhatsApp (configurable).                                                                                                                                                   |
| **Placement** | Pinned card at the top of the role's landing dashboard, dismissible after read. Persists as a printable summary at `/briefings/morning/:date`.                                                                                                        |
| **Roles**     | All decision-makers (executive_leadership, head_office, branch_manager, clinical_supervisor, finance, hr, quality_compliance). Therapists see a personal variant ("today's high-risk cases").                                                         |
| **Status**    | **Foundation exists** ([[9-wave-command-center-2026-05-16]] — Wave 7 LLM briefing). Wave 25 extends with delivery + retention.                                                                                                                        |

### 1.2 End-of-Day Wrap-up — ملخص نهاية اليوم

| Field         | Value                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value**     | At 5 pm: what was achieved today, what was deferred, what alerts are still open, what the operator should sign off on before leaving. A clean-desk ritual that ends the day with closure instead of anxiety. |
| **Trigger**   | Auto-generated at 16:30 KSA; persists at `/briefings/eod/:date`.                                                                                                                                             |
| **Placement** | Tile in the role's landing dashboard after 16:00. Email sent at 17:00 with summary + outstanding items.                                                                                                      |
| **Roles**     | Branch manager, clinical supervisor, therapist, finance, reception.                                                                                                                                          |
| **Status**    | **NEW** — Wave 25 ships the generator.                                                                                                                                                                       |

### 1.3 Weekly Executive Digest — ملخص تنفيذي أسبوعي

| Field         | Value                                                                                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | Monday morning: last week vs. previous week across the 6 strategic KPIs. Insight-grade explanations (not raw deltas). Pre-rendered into a printable 1-pager + a `.docx` board pack. |
| **Trigger**   | Auto-generated every Monday 07:00 for the prior calendar week.                                                                                                                      |
| **Placement** | First tile on the executive dashboard on Mondays/Tuesdays. Email to CEO + board chair. Archived at `/briefings/weekly/:weekNumber`.                                                 |
| **Roles**     | executive_leadership, head_office.                                                                                                                                                  |
| **Status**    | **NEW** — Wave 25 ships the generator.                                                                                                                                              |

### 1.4 Saved Views — العروض المحفوظة

| Field         | Value                                                                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | A user filters a dashboard (e.g. "ER admissions last 7 days, branch Riyadh, severity ≥ medium"), saves it under a name, returns to it with one click. Killer feature for repeat queries. Sharable URL works too. |
| **Trigger**   | "Save view" button on every dashboard's filter bar.                                                                                                                                                              |
| **Placement** | "My views" dropdown in the dashboard header. Shared views appear under "Team views" when the owner toggles `shareWithRole=true`.                                                                                 |
| **Roles**     | All.                                                                                                                                                                                                             |
| **Status**    | **Foundation exists** (Phase 18 bookmarks). Wave 25 unifies the API.                                                                                                                                             |

### 1.5 Personalized Dashboard Presets — إعدادات اللوحة الشخصية

| Field         | Value                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | A user fine-tunes their dashboard (density, which sections collapsed, default date range). The preset persists. Each user gets a "my dashboard" experience without forking the layout. |
| **Trigger**   | Settings menu in the dashboard header.                                                                                                                                                 |
| **Placement** | Right-side panel; overrides the role-default density from Wave 23.                                                                                                                     |
| **Roles**     | All.                                                                                                                                                                                   |
| **Status**    | **NEW** — Wave 25 ships the preference store.                                                                                                                                          |

### 1.6 Favorites / Pinned Widgets — المفضلة والمؤشرات المثبتة

| Field         | Value                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | A clinical supervisor pins "stalled goals at Branch Riyadh" to their landing dashboard. The pin survives navigation + session. Builds a personal command center over time. |
| **Trigger**   | Pin icon on every widget header.                                                                                                                                           |
| **Placement** | "Pinned" section appears just below the morning briefing on the landing dashboard. Max 6 pins (UI enforces — no clutter).                                                  |
| **Roles**     | All.                                                                                                                                                                       |
| **Status**    | **NEW** — Wave 25 ships the preference store.                                                                                                                              |

### 1.7 Quick Action Center — مركز الإجراءات السريعة

| Field         | Value                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | A `Ctrl+K` palette that lists every quick action the role can take, fuzzy-searchable. "Schedule training" / "Approve invoice" / "Open complaint #1024" — one keystroke, no navigation. |
| **Trigger**   | `Ctrl+K` keyboard shortcut globally; "Quick Actions" button in the top nav.                                                                                                            |
| **Placement** | Modal palette overlaying any page. Returns to caller on close.                                                                                                                         |
| **Roles**     | All.                                                                                                                                                                                   |
| **Status**    | **Foundation exists** ([[role-profiles-2026-05-17]] — Wave 23 quickActions). Wave 25 wires the palette.                                                                                |

### 1.8 Internal Comments / Annotations on KPIs — تعليقات داخلية على المؤشرات

| Field         | Value                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | A branch manager spots a spike, types "investigating with transport team — back tomorrow." Other viewers of the KPI see the note immediately. Replaces "tribal knowledge in WhatsApp." |
| **Trigger**   | Comment icon on every KPI card.                                                                                                                                                        |
| **Placement** | Right-side drawer next to the KPI value. Comments thread chronologically. AuditLog captures every comment.                                                                             |
| **Roles**     | All authenticated. Visibility scoped to the KPI's intended viewers (e.g. financial annotations are hidden from reception).                                                             |
| **Status**    | **NEW** — Wave 25 ships the model + API.                                                                                                                                               |

### 1.9 Handoff Notes Between Teams — ملاحظات التسليم بين الفرق

| Field         | Value                                                                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | Therapist leaves a note for the morning-shift colleague: "Ahmed (file 1024) had a tough session today, watch transition." Note auto-routes to the right inbox. Replaces the "I forgot to mention" gap at shift change. |
| **Trigger**   | "Handoff" button on the beneficiary record + a dedicated `/handoffs` page.                                                                                                                                             |
| **Placement** | Appears in the recipient's morning briefing under "Handoffs for you". Notification on shift start.                                                                                                                     |
| **Roles**     | Operational roles primarily (therapist, nurse, reception, clinical_supervisor).                                                                                                                                        |
| **Status**    | **NEW** — Wave 25 ships the model + API.                                                                                                                                                                               |

### 1.10 Printable Executive Summaries — تقارير قابلة للطباعة

| Field         | Value                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | The CEO needs a 1-pager for the board meeting in 30 min. They click "Print summary" on the executive dashboard, get a polished PDF (Arabic-first, RTL, with the company logo) in 5 seconds. |
| **Trigger**   | "Print" button on every dashboard.                                                                                                                                                          |
| **Placement** | Modal preview before printing. PDF mirrors the dashboard's tier-1 + tier-2 content (tier-3 stays in the app).                                                                               |
| **Roles**     | executive_leadership, head_office, branch_manager.                                                                                                                                          |
| **Status**    | **Partial** — Wave 25 specifies the contract; UI library implementation lives in Wave 26.                                                                                                   |

### 1.11 Operational Follow-up Queue — قائمة المتابعة التشغيلية

| Field         | Value                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value**     | Every alert/insight the operator confirmed but hasn't resolved sits in a personal queue. "Things I said I'd do" — sorted by promised-by date. The queue is the operator's accountability ledger. |
| **Trigger**   | When the user clicks "Confirm" on an insight or "Acknowledge" on an alert, a follow-up entry is created with `dueBy` (defaults to 24h, configurable).                                            |
| **Placement** | `/me/follow-ups` page + a counter chip in the top nav ("3 follow-ups due today").                                                                                                                |
| **Roles**     | All operational roles (everyone who acknowledges/confirms).                                                                                                                                      |
| **Status**    | **NEW** — Wave 25 ships the model + API + auto-creation hook.                                                                                                                                    |

### 1.12 Watchlists — قوائم المراقبة

| Field         | Value                                                                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | A clinical supervisor watches 12 specific beneficiaries (the high-risk caseload). The watchlist gets its own briefing block: "1 of your watched beneficiaries had a critical incident." Replaces "I have to remember to check on these cases." |
| **Trigger**   | "Add to watchlist" button on any entity (beneficiary, employee, invoice).                                                                                                                                                                      |
| **Placement** | "My watchlists" page; each watchlist has a dashboard view. Watchlist signals surface in the morning briefing.                                                                                                                                  |
| **Roles**     | All. Watchlists are personal (not team-shared by default).                                                                                                                                                                                     |
| **Status**    | **NEW** — Wave 25 ships the model + API.                                                                                                                                                                                                       |

### 1.13 Branch Scorecards — بطاقات أداء الفروع

| Field         | Value                                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | One-page per-branch scorecard rolling up the 12 priority KPIs into a single score + tier (green/amber/red). Used in monthly head-office reviews. Replaces "everyone's PowerPoint is different." |
| **Trigger**   | `/scorecards/branches` page; head-office picks a branch, gets the scorecard.                                                                                                                    |
| **Placement** | Page-per-branch with a tabular comparison view across branches. Printable.                                                                                                                      |
| **Roles**     | executive_leadership, head_office, branch_manager (own branch only).                                                                                                                            |
| **Status**    | **Foundation exists** (Phase 16 — Ops Control Tower). Wave 25 adds the printable + comparison views.                                                                                            |

### 1.14 Exception Review Center — مركز مراجعة الاستثناءات

| Field         | Value                                                                                                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**     | A weekly meeting hub. Every critical alert + every dismissed insight + every escalated complaint from the past week, laid out for review. The operator confirms each is closed (or re-opens it). Replaces "did we ever finish that one?" |
| **Trigger**   | `/exceptions/review-center` page. Weekly review fires every Sunday for the prior week.                                                                                                                                                   |
| **Placement** | Dedicated page. Filterable by category (clinical/finance/HR/quality).                                                                                                                                                                    |
| **Roles**     | branch_manager, clinical_supervisor, quality_compliance.                                                                                                                                                                                 |
| **Status**    | **NEW** — Wave 25 ships the aggregator + page contract.                                                                                                                                                                                  |

---

## 2. Placement summary

```
Top of every role's landing dashboard:
  [Morning briefing card]       (1.1)
  [Pinned widgets — max 6]      (1.6)
  [Follow-ups due chip in nav]  (1.11)
  [Quick action (Ctrl+K)]       (1.7)

Inline on every KPI / chart:
  [Comment icon]                (1.8)
  [Pin icon]                    (1.6)
  [Save view button]            (1.4)
  [Add to watchlist button]     (1.12)

Late afternoon (after 16:00):
  [End-of-day wrap-up card]     (1.2)

Monday mornings (executives):
  [Weekly digest card]          (1.3)

Dedicated pages:
  /briefings/(morning|eod|weekly)/:date
  /me/follow-ups
  /me/watchlists
  /handoffs
  /scorecards/branches[/:branchId]
  /exceptions/review-center
```

---

## 3. Data model

### 3.1 Annotation (per-KPI comments)

```
{
  _id, kpiId, branchId?, byUserId, byRole,
  textAr | textEn, at,
  visibility: 'authenticated' | 'role-restricted',
  visibilityRoles: [roleGroupKey],   // when role-restricted
  resolvedAt: Date | null,
}
```

### 3.2 HandoffNote

```
{
  _id, byUserId, byRole, branchId,
  subjectType: 'Beneficiary'|'Employee'|'Shift'|'Other',
  subjectId,
  toRoleGroup, toUserId?,
  textAr | textEn,
  priority: 'must-read' | 'fyi',
  at, expiresAt,
  readBy: [userId],
  acknowledgedAt: Date | null,
}
```

### 3.3 FollowUp (operational queue)

```
{
  _id, ownerUserId, ownerRole, branchId?,
  sourceType: 'insight'|'alert'|'manual',
  sourceId,
  titleAr | titleEn,
  dueBy: Date,
  status: 'open' | 'done' | 'cancelled',
  createdAt, doneAt: Date | null,
  notes: [{ at, byUserId, textAr|textEn }],
}
```

### 3.4 Watchlist (user-owned list)

```
{
  _id, ownerUserId, ownerRole,
  nameAr | nameEn,
  entityType: 'Beneficiary'|'Employee'|'Invoice'|'Complaint'|'Incident',
  entityIds: [string],
  createdAt, updatedAt,
}
```

### 3.5 UserPreferences (presets + pins + saved views)

```
{
  userId,
  dashboardPresets: {
    [dashboardKey]: { density, collapsedSections: [], dateRangeDefault }
  },
  pinnedWidgets: [
    { dashboardKey, elementId, pinnedAt, order }
  ],
  savedViews: [
    { viewId, dashboardKey, nameAr|En, filters, createdAt, shareWithRole: boolean }
  ],
}
```

---

## 4. Wave 25 deliverables (this PR)

- [x] Design doc (this file)
- [ ] `backend/intelligence/productivity-features.registry.js` — feature catalog with metadata (status, trigger, placement, roles)
- [ ] `backend/intelligence/productivity-features.service.js`:
  - Annotations (create/list/resolve)
  - HandoffNotes (create/list-for-me/mark-read/acknowledge)
  - FollowUps (create/list/complete/snooze)
  - Watchlists (CRUD)
  - UserPreferences (get/upsert pin/save view/preset)
  - Generators bridge: `morningBriefing`, `endOfDay`, `executiveDigest`, `exceptionReview`
- [ ] `backend/intelligence/generators/end-of-day.generator.js` — emits an EOD wrap-up Insight per role
- [ ] `backend/intelligence/generators/executive-digest.generator.js` — emits a weekly digest Insight
- [ ] `backend/routes/productivity-features.routes.js` — 14 endpoints
- [ ] Tests covering: catalog shape, each CRUD, both generators, routes
- [ ] Wire into `app.js` (always-on)

---

## 5. Drift guards

1. Every feature in the catalog declares `status` ∈ {ready, partial, planned}.
2. Every `roles` field references valid role groups from [[role-profiles-2026-05-17]].
3. Every `triggerType` is one of the documented kinds.
4. The two new generators register the same `kind` they declare in the catalog.

The catalog itself becomes the contract — when Wave 26 adds the UI components, they read the catalog metadata for placement rather than hard-coding.
