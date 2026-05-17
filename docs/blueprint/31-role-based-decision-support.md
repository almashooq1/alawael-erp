# 31 — Role-Based Decision Support (Wave 23)

> **القاعدة الحاكمة**: تجربة مشتركة في الأسلوب، مخصّصة في المحتوى والقرارات. كل دور يبدأ على لوحة مصمّمة لقراراته اليومية — لا لوحة موحّدة للجميع.
>
> **Governing rule**: Shared style, customized substance. Every role lands on a dashboard tuned to _their_ decisions — not a one-size-fits-all view.

---

## 1. Shared style vs. customized substance

| Layer           | Shared (one design system)                                      | Customized (per role)                                 |
| --------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Visual language | Same component library, palette, RTL grid, typography           | Density preset (low/medium/high)                      |
| Interaction     | Same drill-down chain, same alert workflow, same quality badges | Which KPIs/alerts surface, what default filters apply |
| Data            | Same source-of-truth services, same intelligence layer          | Restricted projections per role's permissions         |
| Mental model    | Five-level drill (executive → branch → unit → entity → record)  | Default landing level varies per role                 |

A branch manager and a therapist see the SAME card component for "Stalled goals" — but the branch manager sees the count across their branch; the therapist sees only their own caseload.

---

## 2. Density presets

```
LOW       4–6 KPI tiles per fold, large numerals, big spacing,
          headline-first. For executives.
MEDIUM    8–12 tiles, mixed chart sizes, breadcrumbs visible.
          For managers / supervisors.
HIGH      worklist-first, condensed tables, tight chips,
          per-row actions. For frontline operators.
```

The same component renders differently based on the consuming dashboard's `density` config — no per-role component duplication.

---

## 3. The Nine Role Profiles

### 3.1 الإدارة العليا · Executive Leadership

| Field                | Value                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Canonical roles      | `super_admin`                                                                               |
| Primary goals        | Strategic direction · Financial trajectory · Regulatory standing · Growth                   |
| Decisions supported  | Capital allocation · Branch openings · Executive hiring · Board reporting                   |
| Default landing      | `/dashboards/executive`                                                                     |
| Layout density       | LOW                                                                                         |
| KPIs                 | revenue_trend · occupancy · org_satisfaction · regulatory_score · growth_rate · cash_runway |
| Alerts surface       | `executive` (critical-only, masked PII)                                                     |
| Quick actions        | Generate board pack · Branch comparison · 12-month forecast                                 |
| Restricted data      | No individual records (aggregates only); PII redacted everywhere                            |
| Drill terminal level | `branch` (rarely drills to entities)                                                        |

### 3.2 الإدارة الرئيسية · Head Office

| Field                | Value                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Canonical roles      | `head_office_admin`, `admin`                                                                         |
| Primary goals        | Operational excellence across branches · SLA compliance · Cross-branch consistency                   |
| Decisions supported  | Resource rebalancing · Branch performance management · Process standardization                       |
| Default landing      | `/dashboards/head-office`                                                                            |
| Layout density       | MEDIUM                                                                                               |
| KPIs                 | sla_compliance · cross_branch_consistency · escalations_open · capacity_utilization · branch_ranking |
| Alerts surface       | `executive` + own SLA breaches                                                                       |
| Quick actions        | Branch ranking · Escalations queue · Cross-branch SOP audit                                          |
| Restricted data      | PII masked under PDPL Art.13; branch-level operational visible                                       |
| Drill terminal level | `entity-list`                                                                                        |

### 3.3 مدير الفرع · Branch Manager

| Field                | Value                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Canonical roles      | `manager` (with branchId in scope)                                                                      |
| Primary goals        | Branch performance · Beneficiary outcomes · Staff well-being                                            |
| Decisions supported  | Daily ops · Staff assignments · Escalations · Capacity planning                                         |
| Default landing      | `/dashboards/branch/:branchId`                                                                          |
| Layout density       | MEDIUM-HIGH                                                                                             |
| KPIs                 | active_beneficiaries · attendance_rate · satisfaction · staff_utilization · open_alerts · goals_stalled |
| Alerts surface       | `branch` (all severities, scoped to own branch)                                                         |
| Quick actions        | Today's worklist · Staff schedule · Open complaints · Branch audit pack                                 |
| Restricted data      | Own branch only; nothing from sibling branches                                                          |
| Drill terminal level | `record`                                                                                                |

### 3.4 المشرف السريري · Clinical Supervisor

| Field                | Value                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Canonical roles      | `supervisor`, `nursing_supervisor`, `head_nurse`                                                        |
| Primary goals        | Clinical outcomes · Care plan quality · Therapist development                                           |
| Decisions supported  | Care plan approvals · Intervention adjustments · Coaching · Caseload rebalancing                        |
| Default landing      | `/dashboards/branch/:branchId/care`                                                                     |
| Layout density       | HIGH                                                                                                    |
| KPIs                 | goal_progress_rate · plan_review_compliance · session_completion · outcome_scores · therapist_caseloads |
| Alerts surface       | `clinical` (red-flags, care gaps, incidents, missed reviews)                                            |
| Quick actions        | Review care plans · Approve assessments · Open Care 360 · Schedule case conference                      |
| Restricted data      | Clinical PHI visible (every read audited under PDPL Art.13); finance hidden                             |
| Drill terminal level | `record`                                                                                                |

### 3.5 المعالج · Therapist

| Field                | Value                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Canonical roles      | `therapist`, `doctor`, `teacher`, `nurse`                                                                 |
| Primary goals        | Patient progress · Session quality · Timely documentation                                                 |
| Decisions supported  | Session activities · Goal updates · Daily prioritization · Documentation completion                       |
| Default landing      | `/me` (personal worklist)                                                                                 |
| Layout density       | HIGH (work-focused)                                                                                       |
| KPIs                 | my_caseload · todays_sessions · my_goal_completion_rate · my_documentation_compliance · my_outcome_scores |
| Alerts surface       | `me` (only alerts assigned-to-me or red-flags on my beneficiaries)                                        |
| Quick actions        | Start session · Log progress · Open assessment · View my schedule                                         |
| Restricted data      | Only assigned beneficiaries; no finance; no other therapists' caseloads                                   |
| Drill terminal level | `record` (but only their own records)                                                                     |

### 3.6 المالية · Finance

| Field                | Value                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Canonical roles      | `finance`, `accountant`                                                                       |
| Primary goals        | Revenue collection · AP management · Audit readiness · ZATCA compliance                       |
| Decisions supported  | Approve payments · Escalate overdue · Reconcile · Budget adjustments                          |
| Default landing      | `/dashboards/branch/:branchId/finance` (CFO sees org-wide)                                    |
| Layout density       | HIGH                                                                                          |
| KPIs                 | cash_position · ar_aging · ap_aging · invoice_cycle · claim_status · zatca_status · payer_mix |
| Alerts surface       | `finance` (overdue invoices, claim denials, ZATCA failures, payment exceptions)               |
| Quick actions        | Approve invoice · Send reminder · Open audit log · ZATCA queue                                |
| Restricted data      | Full financial visibility; clinical context masked except billable diagnosis codes            |
| Drill terminal level | `record` (invoice/payment/journal)                                                            |

### 3.7 الموارد البشرية · HR

| Field                | Value                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Canonical roles      | `hr`, `hr_manager`                                                                                                 |
| Primary goals        | Workforce planning · Saudi compliance (Saudization, GOSI) · Retention                                              |
| Decisions supported  | Hiring · Terminations · Salary adjustments · Training plans · Onboarding                                           |
| Default landing      | `/dashboards/hr`                                                                                                   |
| Layout density       | MEDIUM                                                                                                             |
| KPIs                 | saudization_rate · attrition · training_hours · enps · open_positions · attendance_anomalies · contract_expiry_30d |
| Alerts surface       | `hr` (contract expiry, credential expiry, attendance anomalies, payroll exceptions)                                |
| Quick actions        | Open employee · Schedule training · View onboarding · Run payroll preview                                          |
| Restricted data      | Full employee data with audit; clinical PHI hidden; finance summary only                                           |
| Drill terminal level | `record` (employee)                                                                                                |

### 3.8 الجودة والامتثال · Quality & Compliance

| Field                | Value                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Canonical roles      | `dpo`, `crm_supervisor` (closest existing — `compliance_officer`/`quality_manager` to be added in Wave 24)                   |
| Primary goals        | Regulatory compliance (CBAHI · ISO 9001 · PDPL) · Incident reduction · Audit prep                                            |
| Decisions supported  | CAPA initiation · Audit prioritization · Policy updates · Subject access response                                            |
| Default landing      | `/dashboards/quality`                                                                                                        |
| Layout density       | MEDIUM-HIGH                                                                                                                  |
| KPIs                 | open_incidents · capa_cycle · audit_pass_rate · compliance_score · documents_expiring · pdpl_dsar_count · noncompliance_open |
| Alerts surface       | `quality` + `dpo` (incidents, CAPA breaches, audit-due, DSAR SLA breaches)                                                   |
| Quick actions        | Open incident · Start RCA · CAPA queue · DSAR queue · Open audit                                                             |
| Restricted data      | Cross-branch visibility for audit purposes; PII surfaced only when explicitly required for an investigation (audit-logged)   |
| Drill terminal level | `record` (incident/CAPA/document/DSAR)                                                                                       |

### 3.9 الاستقبال / خدمة المستفيدين · Reception / Beneficiary Service

| Field                | Value                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Canonical roles      | `receptionist`, `patient_relations_officer`                                                         |
| Primary goals        | Smooth intake · Complaint handling · Daily logistics                                                |
| Decisions supported  | Visit scheduling · Complaint routing · Transport coordination · Family communication                |
| Default landing      | `/dashboards/reception` (today view)                                                                |
| Layout density       | HIGH (action-oriented)                                                                              |
| KPIs                 | todays_visits · waitlist_size · open_complaints · transport_status · no_show_count · check_in_queue |
| Alerts surface       | `reception` (no-shows, late arrivals, new complaints — today-scoped only)                           |
| Quick actions        | Check-in · Log complaint · Schedule visit · Reschedule · Print attendance sheet                     |
| Restricted data      | Basic beneficiary info (name, file number, guardian contact); clinical/finance hidden               |
| Drill terminal level | `entity-list` (beneficiary list); record view limited to non-clinical tabs                          |

---

## 4. Cross-cutting rules

### 4.1 Restricted-data masking

A role's `restrictedData` array specifies which fields/sections to mask:

```
clinical_phi    — diagnosis, assessment scores, treatment notes
financial       — invoice amounts, payment details, claim data
hr_compensation — salary, allowances, bonuses
pii_identifiers — national ID, phone, full address
```

The mask is applied at the **query layer**, not the UI — a finance user calling `/api/v1/beneficiaries/:id` gets the clinical PHI fields stripped before they ever leave the server. UI receives the masked payload and renders "—".

### 4.2 Default landing

Every authenticated request to `/` resolves the user's role → role group → `defaultLanding`. A receptionist hitting the root URL lands on `/dashboards/reception`, not `/dashboards/executive`. Bookmarking deep URLs always works — but the _first_ visit each session sees the role-appropriate landing.

### 4.3 Quick actions

Quick actions are not navigation shortcuts — they are **decision triggers**. A branch manager's "Today's worklist" button doesn't open a page; it generates the day's prioritized list (combining alerts + insights + scheduled tasks) and opens it. The action ID maps to a backend handler that may run a generator, materialize a list, or open a wizard.

### 4.4 Drill terminal level

Different roles drill to different depths:

- Executive stops at `branch` — they don't need to see individual records.
- Branch manager / clinical / therapist drill to `record`.
- Quality drills to `record` (incident, CAPA, document) for investigation.
- HR drills to `record` (employee).
- Finance drills to `record` (invoice/payment).
- Reception drills to `entity-list` for routine work; opens `record` only for complaint handling.

This is enforced in the drill-down service: the `terminalLevel` filter on `resolveNextLevel()` stops the user from drilling past their role's allowed depth.

### 4.5 Density inheritance

The role profile sets the default density. Individual users may override per dashboard via a UI setting (persisted in `user.preferences.density`). The role default is the **starting point**, not a hard cap.

---

## 5. Alert surface mapping

The 8 dashboard alert surfaces from the [[alert-priority-engine-2026-05-16]] map to role groups:

| Alert surface | Default for role group                       |
| ------------- | -------------------------------------------- |
| `executive`   | executive_leadership, head_office            |
| `branch`      | branch_manager                               |
| `clinical`    | clinical_supervisor                          |
| `hr`          | hr                                           |
| `finance`     | finance                                      |
| `quality`     | quality_compliance                           |
| `dpo`         | quality_compliance (DPO-specific subset)     |
| `me`          | therapist, reception (assigned-to-me alerts) |

A role can have multiple alert surfaces in scope — e.g. `quality_compliance` sees both `quality` AND `dpo`.

---

## 6. Wave 23 deliverables (this PR)

- [x] Design doc (this file)
- [ ] `backend/intelligence/role-profiles.registry.js` — 9 role groups + 8 alert surfaces + canonical-role→group mapping
- [ ] `backend/intelligence/role-profiles.service.js`:
  - `resolveRoleGroup(canonicalRole)` → group key
  - `getProfile(groupKey)` → full profile (goals/decisions/KPIs/alerts/actions/restrictions/density/landing)
  - `resolveDashboardForUser(canonicalRole, ctx)` → bundle ready to render
  - `filterByRole(items, role, ctx)` → apply restricted-data masking
- [ ] `backend/routes/role-profiles.routes.js`:
  - `GET /api/v1/role-profiles` — list all role groups
  - `GET /api/v1/role-profiles/:groupKey` — one profile
  - `GET /api/v1/role-profiles/me/dashboard` — resolved dashboard for the requesting user
  - `GET /api/v1/role-profiles/by-role/:canonicalRole` — group + dashboard for a named canonical role
- [ ] Tests covering: every role profile shape, role→group resolution, dashboard resolution, masking
- [ ] Wire into `app.js` (always-on)

---

## 7. Drift guards

1. **Every canonical role in `roles.constants.js` maps to a role group.**
   Drift test: `__tests__/role-profiles-coverage.test.js` asserts no canonical role is orphaned.

2. **Every KPI referenced in a profile's `kpiIds` exists in `drilldown.registry.js`.**
   Drift test cross-checks.

3. **Every alert surface referenced is in the 8-surface set defined in [[alert-priority-engine-2026-05-16]].**

This makes the layer self-policing — a developer can't add a canonical role without assigning it a decision-support profile.
