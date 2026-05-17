# 35 — Enterprise Authorization Constitution · دستور الصلاحيات المؤسسي

> هذا الدستور هو **المرجع الأعلى** لكل قرار وصول داخل ALAWAEL. أي تضارب بين هذه الوثيقة وأي كود/إعدادات يُحلّ لصالح الدستور — ثم يُحدَّث الكود.
>
> This Constitution is the **supreme reference** for every access decision inside ALAWAEL. Any conflict between this document and code/config is resolved in favor of the Constitution — code is then updated.

**القاعدة الذهبية · The Golden Rule:**

> الإدارة العامة فقط لها GLOBAL. كل فرع معزول تمامًا. لا وصول أفقي بين الفروع. لا اعتماد على الواجهة في المنع. كل قرار قابل للتفسير والتدقيق.

---

## 1 · Authorization Vision · رؤية الصلاحيات

### 1.1 فلسفة النظام · System philosophy

ALAWAEL ليست منظومة بيانات — هي **مسؤولية قانونية وسريرية ومالية**. كل وصول إلى سجل سريري يخضع لـPDPL Art.13. كل قرار مالي يخضع لمتطلبات الزكاة والدخل (ZATCA) ومحاسبة المؤسسات. كل إخفاق رقابي = خسارة ترخيص CBAHI.

The platform is not a data system — it's a legal, clinical, and financial responsibility. Every clinical access is PDPL Art.13. Every financial decision is ZATCA + enterprise audit. Every regulatory failure = lost CBAHI license.

### 1.2 ما الذي نحميه · What we protect

| Layer       | Asset                                                          | Failure cost                                    |
| ----------- | -------------------------------------------------------------- | ----------------------------------------------- |
| Clinical    | PHI of beneficiaries (diagnoses, assessments, treatment notes) | PDPL fine + clinical liability + family lawsuit |
| Financial   | Payroll, invoices, claims data, vendor contracts               | ZATCA penalty + embezzlement risk               |
| HR          | Salaries, performance reviews, terminations                    | Saudization compliance + labor lawsuits         |
| Operational | Branch-level metrics, incident reports                         | CBAHI license + brand reputation                |
| Personal    | National IDs, phone numbers, addresses                         | PDPL Art.13 + identity theft                    |
| Strategic   | Acquisition pricing, vendor terms, board minutes               | Competitive disadvantage                        |

### 1.3 لماذا Branch Isolation أساسي · Why branch isolation is foundational

كل فرع كيان قانوني مستقل تقريبًا. مدير فرع A لا يحتاج (ولا يجب أن يستطيع) رؤية مستفيدي فرع B. هذا ليس قيدًا تقنيًا اخترعناه — هو متطلب CBAHI + PDPL: **"الوصول إلى بيانات المستفيد محصور بمن لديه علاقة رعاية مباشرة معه."**

Each branch is a near-independent legal entity. Branch A's manager doesn't need (and must not) see Branch B's beneficiaries. This isn't an invented constraint — it's a CBAHI + PDPL requirement: _"Beneficiary data access is limited to those with a direct care relationship."_

### 1.4 لماذا Default Deny · Why default-deny

النظام يحوي 22 كيانًا × 16 إجراءً × 9 أدوار = ~3,168 تركيبة قرار. كتابتها كقائمة "مسموح" أكثر أمانًا — أي شيء غير مذكور = ممنوع. عكس ذلك (كتابة "ممنوع") يترك ثغرات في كل تركيبة جديدة لم نتذكرها.

22 entities × 16 actions × 9 roles = ~3,168 decision combinations. Writing them as an allow-list is safer — anything unlisted = denied. The opposite (deny-list) leaves a hole in every combo we forgot.

### 1.5 التوازن أمن مقابل تشغيل · Security vs operability balance

| Tension                                               | Resolution                                                                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Mandatory MFA slows logins                            | MFA required only for privileged actions (step-up); regular sessions ride on the original auth                       |
| Strict branch isolation breaks cross-branch reporting | HQ-only roles get cross-branch; aggregations to branches are pre-aggregated and hide raw IDs                         |
| Approvals block urgent care                           | Emergency break-glass with post-hoc review (not pre-approval) for clinical emergencies                               |
| Audit-everything is expensive                         | Audit "decisions that matter": writes, exports, PHI reads, financial reads, governance changes. Skip routine SELECTs |
| Frequent re-certification creates fatigue             | Quarterly for privileged roles, annual for routine roles, automated reminders + bulk-attest UI                       |

---

## 2 · Access Control Model · نموذج التحكم بالوصول

### 2.1 The 5-layer decision

Every access decision passes through 5 layers, evaluated in order. **ALL must allow → access granted. ANY denies → access denied.**

```
  ┌───────────────────────────────────────────────────────┐
  │ Layer 1 — IDENTITY                                    │
  │   Is the request authenticated? Is the session valid? │
  │   Has the user been suspended? Is the IP allowed?     │
  ├───────────────────────────────────────────────────────┤
  │ Layer 2 — RBAC                                        │
  │   Does the user's role grant the permission code?     │
  │   (`finance.invoices.approve`, etc — Wave 26 registry)│
  ├───────────────────────────────────────────────────────┤
  │ Layer 3 — SCOPE                                       │
  │   Is the resource within the user's effective scope?  │
  │   (GLOBAL ⊃ REGION ⊃ BRANCH ⊃ DEPARTMENT ⊃ OWN)       │
  ├───────────────────────────────────────────────────────┤
  │ Layer 4 — POLICY (ABAC)                               │
  │   Resource attribute checks: sensitivity, status,     │
  │   approval stage, time window, assignment, etc.       │
  ├───────────────────────────────────────────────────────┤
  │ Layer 5 — SoD / TEMPORAL                              │
  │   Separation of duties: actor didn't perform a        │
  │   conflicting prior action (e.g. created this record).│
  │   Time bounds: emergency access still active?         │
  └───────────────────────────────────────────────────────┘
```

### 2.2 The decision signature

```
decide({
  actor:    { userId, roles[], branchId, regionBranchIds[], mfaLevel,
              sessionAgeMin, emergencyAccess: { active, expiresAt, reason }, riskScore },
  action:   string  // e.g. 'finance.invoices.approve'
  resource: { type, id, branchId, departmentId, ownerId, assignedTo, status,
              sensitivity, createdBy, lastModifiedBy, approvalStage },
  context:  { ip, userAgent, sessionId, requestId, requestAt }
}) → {
  allow:        boolean,
  reason:       string,             // explainable: e.g. 'BRANCH_SCOPE_MISMATCH'
  appliedLayer: 1|2|3|4|5,
  scope:        string,             // resolved effective scope (BRANCH, OWN, etc)
  sodHit:       null | { rule, conflictingActorAction },
  audit:        { required, action, severity }
}
```

**Every denial is explainable** — `reason` is machine-readable, surfaces in audit log, and operators see a localized human form.

### 2.3 Five model components

| Component               | What it captures                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **RBAC**                | Roles hold permission codes (40+ codes today, growing per domain). One actor can hold multiple roles; their effective set is the union. |
| **Scope-based**         | Each role has a _default scope_ (e.g. `branch_manager → BRANCH`). The scope walks the hierarchy (§3).                                   |
| **ABAC/Policy**         | Attribute conditions: `resource.sensitivity = clinical_phi AND actor.role NOT IN [clinical_supervisor, therapist, dpo]` → deny.         |
| **Privileged controls** | Some actions require _step-up_ (fresh MFA), or _just-in-time_ elevation (request → approve → 1h window).                                |
| **Emergency override**  | Break-glass: explicit reason + auto-expire + post-hoc review (§13).                                                                     |

---

## 3 · Scope Hierarchy · هرمية النطاقات

### 3.1 The 7-level ladder

```
GLOBAL          — all branches + HQ administrative data
   │
   ▼
REGION          — a set of branches (geographic / business unit)
   │             [optional; only used for regional_director roles]
   ▼
BRANCH          — one branch's operational data
   │
   ▼
DEPARTMENT      — one department within a branch (Care, HR, Finance, ...)
   │
   ▼
TEAM            — a team within a department (e.g. Care.Therapist-Team-A)
   │
   ▼
OWN             — records created by, assigned to, or owned by the actor
   │
   ▼
ASSIGNED        — records explicitly assigned to the actor (subset of OWN)

(orthogonal)
TEMP_ELEVATED   — actor was granted a higher scope for a bounded time
                  (combines with one of the above, never replaces it)
```

### 3.2 Inheritance + boundaries

| Scope      | Sees                                                                                  | Does NOT see                                                     |
| ---------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| GLOBAL     | Everything across all branches + HQ data                                              | (no exclusions; held only by `super_admin`, `head_office_admin`) |
| REGION     | All branches in `actor.regionBranchIds`                                               | Branches outside the region; HQ-only data                        |
| BRANCH     | All data in `actor.branchId`                                                          | Other branches; HQ-only data                                     |
| DEPARTMENT | All records in `actor.departmentId` within `actor.branchId`                           | Other departments; other branches                                |
| TEAM       | Records owned by `actor.teamId`                                                       | Other teams' records                                             |
| OWN        | Records where `record.createdBy = actor.userId` OR `record.assignedTo = actor.userId` | Anything else, EVEN within the same branch                       |
| ASSIGNED   | Records where `record.assignedTo = actor.userId` (strictest)                          | Records the actor _created_ but isn't _assigned to_              |

**Inheritance rule:** a higher scope NEVER automatically grants lower-scope permissions. A `branch_manager` (BRANCH scope) doesn't automatically have `OWN` permissions on records they created — they have BRANCH access which subsumes OWN by _value_, but the permission CODE must still be granted.

### 3.3 TEMP_ELEVATED — the orthogonal axis

A user temporarily elevated to BRANCH from OWN keeps their identity, base role, base scope, AND adds an elevation:

```
actor.baseScope:        OWN
actor.elevation: {
  toScope: BRANCH,
  branchId: 'B-1',
  expiresAt: '2026-05-17T18:00:00Z',  // hard cap, typically 1-8h
  reason: 'Covering for branch manager during sick leave',
  approvedBy: 'u-hq-admin-1',
  grantedAt: '2026-05-17T10:00:00Z',
}
```

When evaluating scope, use `max(baseScope, elevation)` _only if_ `now < elevation.expiresAt`. The elevation is **always logged** — every action under it has `audit.metadata.viaElevation = true`.

### 3.4 Scope is computed, never declared

Frontend NEVER tells backend "I'm acting at BRANCH scope." Backend computes from `actor.userId → roles → role.defaultScope → resolved branch/dept assignments`. Frontend cannot escalate by mutating client state.

---

## 4 · Role Architecture · معمارية الأدوار

### 4.1 Role Catalog (18 roles)

For each role: **mission · default scope · business boundaries · allowed (high-level) · forbidden (high-level) · approval dependencies · audit sensitivity**.

#### 4.1.1 HQ Super Admin · مدير عام رئيسي

| Field                 | Value                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Mission               | Final escalation authority; platform owner                                                                                           |
| Default scope         | GLOBAL                                                                                                                               |
| Boundaries            | Cannot grant themselves new privileges in isolation (requires 2nd approver)                                                          |
| Allowed               | Read/write across all branches, role grants, audit log full read                                                                     |
| Forbidden             | Cannot delete audit log entries; cannot modify their own role; cannot single-handedly approve role-elevation requests for themselves |
| Approval dependencies | Their own role changes require a 2nd `super_admin` to approve                                                                        |
| Audit sensitivity     | **CRITICAL** — every action logged with IP, MFA assertion, session ID                                                                |

#### 4.1.2 HQ Admin · مدير الإدارة الرئيسية

| Field                 | Value                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Mission               | Day-to-day platform admin; routine config, user management                                                                             |
| Default scope         | GLOBAL (operational), but excluded from `super_admin`-only actions                                                                     |
| Boundaries            | Cannot grant `super_admin` or `dpo` roles; cannot read DSAR contents                                                                   |
| Allowed               | Create/edit users, assign branch roles, manage business config                                                                         |
| Forbidden             | Direct PHI reads on individual beneficiaries (must use exec dashboards which mask); modifying audit log; approving their own elevation |
| Approval dependencies | `super_admin` approval for role schema changes                                                                                         |
| Audit sensitivity     | HIGH                                                                                                                                   |

#### 4.1.3 HQ Clinical Director · المدير السريري الرئيسي

| Field                 | Value                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Mission               | Org-wide clinical standards, care plan oversight, clinical KPIs                                                |
| Default scope         | GLOBAL (clinical domain only)                                                                                  |
| Boundaries            | Cannot edit financial/HR records; PHI access is for governance not direct care                                 |
| Allowed               | Read all clinical KPIs cross-branch, approve clinical policies, override care plan locks for governance review |
| Forbidden             | Financial approval; HR terminations; granting roles                                                            |
| Approval dependencies | Care plan policy changes need `quality_director` co-sign                                                       |
| Audit sensitivity     | HIGH (PHI access auto-logged)                                                                                  |

#### 4.1.4 HQ HR Director · مدير الموارد البشرية الرئيسي

| Field                 | Value                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Mission               | Org-wide HR strategy, compensation policy, Saudization compliance                                         |
| Default scope         | GLOBAL (HR + compensation domain)                                                                         |
| Boundaries            | Cannot access clinical PHI; cannot approve finance                                                        |
| Allowed               | View/edit all employees, approve compensation policy, Saudization reporting, executive performance review |
| Forbidden             | Clinical record access; financial close; granting non-HR roles                                            |
| Approval dependencies | Comp band changes need `head_office_admin` + audit                                                        |
| Audit sensitivity     | HIGH (compensation = sensitive_PII)                                                                       |

#### 4.1.5 HQ Finance Director · المدير المالي الرئيسي

| Field                 | Value                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Mission               | Org financial oversight; ZATCA + audit compliance                                              |
| Default scope         | GLOBAL (financial domain)                                                                      |
| Boundaries            | Cannot approve own expense claims; cannot modify audit-log financial events                    |
| Allowed               | Approve large invoices (> threshold), ZATCA reconciliation, financial close, audit cooperation |
| Forbidden             | Clinical PHI; HR comp modification; direct payroll execution (SoD with HR)                     |
| Approval dependencies | Spends above `LARGE_SPEND` threshold need `super_admin` co-sign                                |
| Audit sensitivity     | CRITICAL (any approval logged + amount captured)                                               |

#### 4.1.6 HQ Auditor · المدقق الرئيسي

| Field                 | Value                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Mission               | Internal audit; read-only across all domains                                               |
| Default scope         | GLOBAL (read-only)                                                                         |
| Boundaries            | **Zero write permissions anywhere**; cannot grant roles; cannot mutate audit log           |
| Allowed               | Read everything (including audit log), export audit findings                               |
| Forbidden             | Any `*.approve`, `*.create`, `*.modify`, `*.delete`, role grants                           |
| Approval dependencies | None (read-only)                                                                           |
| Audit sensitivity     | MEDIUM — every read is logged (auditor reads are themselves audited to prove independence) |

#### 4.1.7 HQ Read-only Executive · تنفيذي قراءة فقط

| Field                 | Value                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| Mission               | Board members, investors, advisors — high-level read access without operational power |
| Default scope         | GLOBAL (read-only, dashboards-only)                                                   |
| Boundaries            | No raw record access; only aggregated KPIs + executive digests                        |
| Allowed               | Executive dashboard, weekly digest, branch comparison (PII-masked)                    |
| Forbidden             | Individual records; PII; exports; any write                                           |
| Approval dependencies | None                                                                                  |
| Audit sensitivity     | LOW (only dashboard hits)                                                             |

#### 4.1.8 Branch Manager · مدير الفرع

| Field                 | Value                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Mission               | Single-branch operational owner                                                                    |
| Default scope         | BRANCH (own branch only)                                                                           |
| Boundaries            | Zero visibility into other branches                                                                |
| Allowed               | Read everything in their branch, approve branch-scoped workflows, manage branch staff schedules    |
| Forbidden             | Other branches' data; financial approvals above branch threshold; granting `super_admin`           |
| Approval dependencies | Large invoices escalate to `finance_director`; clinical policy needs `clinical_supervisor` co-sign |
| Audit sensitivity     | HIGH (PHI access within branch is audited)                                                         |

#### 4.1.9 Branch Clinical Supervisor · المشرف السريري بالفرع

| Field                 | Value                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| Mission               | Clinical quality + care plan approvals at branch level                       |
| Default scope         | BRANCH + DEPARTMENT=Care                                                     |
| Boundaries            | Clinical domain only; no finance/HR write                                    |
| Allowed               | Approve care plans, sign assessments, supervise therapists, review red flags |
| Forbidden             | Financial operations; HR terminations; other branches                        |
| Approval dependencies | Care plan approval is itself a SoD checkpoint — cannot approve own creations |
| Audit sensitivity     | CRITICAL (clinical decisions = legal record)                                 |

#### 4.1.10 Branch Receptionist · موظف استقبال الفرع

| Field                 | Value                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| Mission               | Beneficiary intake, daily check-in, complaint capture, transport coordination    |
| Default scope         | BRANCH + limited entity types                                                    |
| Boundaries            | Non-clinical, non-financial; no PHI beyond name + file number + guardian contact |
| Allowed               | Create intake records, log complaints, schedule visits, check in attendance      |
| Forbidden             | Clinical notes, financial records, HR compensation, exports of beneficiary lists |
| Approval dependencies | Beneficiary admission goes to `branch_manager` for approval                      |
| Audit sensitivity     | MEDIUM                                                                           |

#### 4.1.11 Branch Therapist · المعالج بالفرع

| Field                 | Value                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Mission               | Direct care delivery — sessions, progress, documentation                                                            |
| Default scope         | OWN (assigned beneficiaries only) — STRICTEST default                                                               |
| Boundaries            | Cannot see other therapists' caseloads; no finance, no HR                                                           |
| Allowed               | View + log sessions for assigned beneficiaries, update SmartGoals they own, create assessments, view their schedule |
| Forbidden             | Other therapists' beneficiaries; cross-branch data; financial; HR comp                                              |
| Approval dependencies | Assessments need `clinical_supervisor` sign-off; care plan edits need supervisor approval                           |
| Audit sensitivity     | HIGH (clinical documentation = legal)                                                                               |

#### 4.1.12 Branch HR · موظف الموارد البشرية بالفرع

| Field                 | Value                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| Mission               | Branch-level HR operations — attendance, leave, training                              |
| Default scope         | BRANCH + DEPARTMENT=HR                                                                |
| Boundaries            | Cannot view comp data; cannot terminate without HQ approval                           |
| Allowed               | View employees in branch, log attendance, schedule training, onboard new hires        |
| Forbidden             | Compensation modification, terminations, payroll execution, other branches            |
| Approval dependencies | Salary changes → `hr_director`; terminations → branch_manager + `hr_director` co-sign |
| Audit sensitivity     | MEDIUM                                                                                |

#### 4.1.13 Branch Finance · موظف المالية بالفرع

| Field                 | Value                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Mission               | Branch financial ops — invoice issuance, daily reconciliation                                                |
| Default scope         | BRANCH + DEPARTMENT=Finance                                                                                  |
| Boundaries            | Cannot approve invoices above `BRANCH_FINANCE_THRESHOLD`; cannot view other branches                         |
| Allowed               | Create invoices, log payments, daily reconciliation, ZATCA submission for branch invoices                    |
| Forbidden             | Approve own invoices, cross-branch reconciliation, payroll execution, HR comp                                |
| Approval dependencies | Invoices above threshold → `finance_director`; refunds/cancellations → `branch_manager` + `finance_director` |
| Audit sensitivity     | HIGH                                                                                                         |

#### 4.1.14 Branch Quality Officer · موظف الجودة بالفرع

| Field                 | Value                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Mission               | Incident + complaint + audit-readiness at branch level                                                 |
| Default scope         | BRANCH (cross-department within branch)                                                                |
| Boundaries            | Read-broad within branch; write only on quality records                                                |
| Allowed               | Create incidents, manage CAPA at branch, run audits within branch, read most domains for investigation |
| Forbidden             | Cross-branch investigations (need `quality_director` elevation); approve clinical; approve finance     |
| Approval dependencies | Cross-branch investigation = JIT elevation request to HQ                                               |
| Audit sensitivity     | HIGH                                                                                                   |

#### 4.1.15 Driver · السائق

| Field                 | Value                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Mission               | Transport route execution + check-in/out                                                          |
| Default scope         | OWN (assigned routes/trips only)                                                                  |
| Boundaries            | Strictly limited — no beneficiary records beyond pick-up info                                     |
| Allowed               | View today's route, log pickup/dropoff, report incidents                                          |
| Forbidden             | Any clinical data, financial data, beneficiary file beyond name + pickup address + guardian phone |
| Approval dependencies | Schedule changes → operations                                                                     |
| Audit sensitivity     | LOW                                                                                               |

#### 4.1.16 Family Portal User (Parent/Guardian) · ولي الأمر

| Field                 | Value                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| Mission               | View progress + sign consent + communicate for their child                       |
| Default scope         | OWN (their assigned beneficiaries only)                                          |
| Boundaries            | **Family-portal API surface only** — separate route namespace                    |
| Allowed               | View progress reports, sign consent (Nafath), submit complaints, view bills      |
| Forbidden             | Any admin API; staff data; other children; financial details beyond own invoices |
| Approval dependencies | Consent signing uses Nafath e-signature                                          |
| Audit sensitivity     | MEDIUM (PHI access on their own child is logged for completeness)                |

#### 4.1.17 Temporary Reviewer (Auditor/Consultant) · مراجع مؤقت

| Field                 | Value                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| Mission               | External auditor / consultant with time-bound read access                             |
| Default scope         | TEMP_ELEVATED to GLOBAL read-only, expiring within N days                             |
| Boundaries            | Hard expiry; no extensions without re-onboarding                                      |
| Allowed               | Read whatever was granted in the engagement scope (specific entity types/domains)     |
| Forbidden             | Any write; exports only if explicitly granted                                         |
| Approval dependencies | `super_admin` + `dpo` co-grant; DPO ensures PDPL-compliant data agreement is in place |
| Audit sensitivity     | CRITICAL (all reads logged, banner displayed)                                         |

#### 4.1.18 Integration Service Account · حساب خدمة للتكامل

| Field                 | Value                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| Mission               | Machine-to-machine integration (NPHIES, ZATCA, ZKTeco, WhatsApp)                |
| Default scope         | Per-integration, narrowest possible                                             |
| Boundaries            | Not a human; cannot log in interactively; bound to allow-listed IPs + endpoints |
| Allowed               | Only the explicit endpoints in the integration contract                         |
| Forbidden             | Any general API; admin APIs; cross-integration access                           |
| Approval dependencies | New service account → `super_admin` + IT                                        |
| Audit sensitivity     | CRITICAL (every call logged, signed token, replay protection)                   |

### 4.2 Role catalog rules

1. **Adding a new role requires a Constitution amendment** — not a code-only change.
2. **Every role's `defaultScope`, `allowedActions`, `forbiddenActions` go into a registry**, enforced by code.
3. **No "ad hoc" permissions** — if it's not in a role, it's a JIT elevation request (auditable).
4. **No two HQ roles share the same superset** — each has a specific mission. Overlap is a red flag for role explosion (§18).

---

## 5 · Separation of Duties Model · فصل المهام (SoD)

### 5.1 Core principle

> No single human can perform a full toxic sequence alone. Critical actions require 2-of-N humans, where N is the qualified set.

### 5.2 Toxic permission combinations

These combos, held by ONE actor, are **forbidden** (validated at role-grant time + reasserted at access decision time):

| #   | Combination                                                                          | Why toxic                                    |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| 1   | `finance.invoices.create` + `finance.invoices.approve` for the SAME invoice          | Self-approval — embezzlement vector          |
| 2   | `hr.employees.terminate` + `finance.payroll.approve` (same payroll cycle)            | Ghost-employee / unfair termination cover-up |
| 3   | `clinical.assessments.create` + `clinical.assessments.sign` for the SAME assessment  | Self-attestation of clinical findings        |
| 4   | `governance.permissions.grant` + `governance.permissions.read-audit` for OWN account | Self-elevation hiding                        |
| 5   | `audit-log.modify` (forbidden universally)                                           | Audit integrity destruction                  |
| 6   | `compliance.dsar.respond` + `compliance.dsar.create` for SAME DSAR                   | Faking a satisfied request                   |
| 7   | `branch-data.export` + `branch-data.delete`                                          | Exfiltration + cover-up                      |
| 8   | `quality.incident.create` + `quality.incident.close` for SAME incident               | Sweeping under the rug                       |
| 9   | `pricing.modify` + `pricing.approve`                                                 | Price manipulation                           |
| 10  | `role.elevate.request` + `role.elevate.approve` for OWN request                      | Self-elevation                               |

### 5.3 SoD enforcement rules

The decision layer (`decide()` in §2) enforces these at runtime:

```
SoD_RULES = [
  {
    id: 'invoice-self-approval',
    onAction: 'finance.invoices.approve',
    prohibitedIf: actor.userId == resource.createdBy,
    severity: 'critical',
    overridePolicy: 'never',
  },
  {
    id: 'assessment-self-sign',
    onAction: 'clinical.assessments.sign',
    prohibitedIf: actor.userId == resource.createdBy,
    severity: 'critical',
    overridePolicy: 'never',
  },
  {
    id: 'role-self-elevation',
    onAction: 'governance.role-elevation.approve',
    prohibitedIf: actor.userId == resource.requestedBy,
    severity: 'critical',
    overridePolicy: 'never',
  },
  // ... 7 more
]
```

### 5.4 Override policy

For SoD-violating combinations:

| Severity | Override allowed?                | If yes, how?                                                         |
| -------- | -------------------------------- | -------------------------------------------------------------------- |
| Critical | Never                            | Hard deny — system refuses even with `super_admin` override flag     |
| High     | Only via 2-actor approval ladder | Requires `compensating_actor` who signs off                          |
| Medium   | Yes, with reason + logged        | Single super_admin can override with auto-flag for next audit review |

### 5.5 Compensating controls (when separation is impractical)

For small branches (1 finance staffer, no separate creator/approver):

| Compensating control                   | Implementation                                                                           |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| Daily reconciliation by branch manager | Branch manager receives daily AP summary; their attestation = the compensating signature |
| Sampled audit                          | Quality officer samples 10% of approved invoices weekly                                  |
| Threshold splits                       | Invoices < SAR 5,000 = single-approver allowed; > 5,000 = forced co-approval             |
| Time-delayed posting                   | High-value approvals have 24h cool-off window before becoming irreversible               |

---

## 6 · Entity Permission Matrix · مصفوفة صلاحيات الكيانات

22 entity types × 16 actions. **`✓` = allowed by default for that role; `✗` = forbidden; `~` = conditional (requires policy condition in §7); empty = N/A.**

Abbreviations: SA=super_admin · HA=hq_admin · BM=branch_manager · CS=clinical_supervisor · T=therapist · F=finance · HR=hr · QC=quality · R=reception · DR=driver · FP=family_portal · AU=auditor

### 6.1 Action vocabulary (16 actions)

`view · list · create · edit · delete · approve · reject · assign · export · archive · restore · transfer · comment · override · impersonate · bulk`

### 6.2 Matrix highlights (full detail in `backend/intelligence/authz.registry.js`)

| Entity            | SA                           | HA                       | BM                                   | CS                             | T                         | F                                    | HR                           | QC                                | R                       | DR                 | FP                  | AU                 |
| ----------------- | ---------------------------- | ------------------------ | ------------------------------------ | ------------------------------ | ------------------------- | ------------------------------------ | ---------------------------- | --------------------------------- | ----------------------- | ------------------ | ------------------- | ------------------ |
| **branches**      | view/edit/create/delete/list | view/list/edit           | view (own)                           | view (own)                     | view (own)                | view (own)                           | view (own)                   | view (own)                        | view (own)              | view (own)         | —                   | view/list          |
| **beneficiaries** | full                         | full                     | full (branch)                        | view/list/edit                 | view/edit (OWN)           | view (financial fields only)         | view (HR-relevant fields)    | view/list (branch)                | view/list/create        | view (pickup only) | view (own child)    | view/list          |
| **employees**     | full                         | view/list/edit/create    | view/list (branch)                   | view (branch, care dept)       | —                         | —                                    | full (branch)                | view (branch)                     | —                       | —                  | —                   | view/list          |
| **appointments**  | full                         | view/list                | view/list/edit (branch)              | view/list/edit (branch.care)   | view/list/edit (OWN)      | —                                    | —                            | view (branch)                     | view/create/edit        | view (own routes)  | view (own child)    | view/list          |
| **assessments**   | full                         | view/list                | view/list (branch)                   | view/list/approve              | view/create/edit (OWN)    | —                                    | —                            | view (branch)                     | —                       | —                  | view summary        | view/list          |
| **care-plans**    | full                         | view/list                | view/list (branch)                   | full (branch.care)             | view (OWN) + edit-pending | —                                    | —                            | view (branch)                     | —                       | —                  | view summary        | view/list          |
| **sessions**      | full                         | view/list                | view/list (branch)                   | view/list/approve              | full (OWN)                | —                                    | —                            | view (branch)                     | —                       | —                  | view summary        | view/list          |
| **attendance**    | full                         | view/list                | view/list/edit (branch)              | view (branch.care)             | view (OWN)                | —                                    | view/list/edit (branch)      | view (branch)                     | view/create/edit        | —                  | view (own child)    | view/list          |
| **payroll**       | full                         | view (no edit)           | view summary (no individual amounts) | —                              | —                         | full (branch < threshold)            | view (HR-relevant)           | view (branch)                     | —                       | —                  | —                   | view/list          |
| **invoices**      | full                         | view (no approve)        | view/list/create                     | —                              | —                         | view/list/create/approve(<threshold) | —                            | view (branch)                     | view/list (status only) | —                  | view (own family)   | view/list          |
| **expenses**      | full                         | view/list                | view/list/create                     | —                              | —                         | view/list/create/approve(<threshold) | —                            | view (branch)                     | —                       | —                  | —                   | view/list          |
| **documents**     | full                         | full                     | view/list (branch)                   | view/list (clinical)           | view (OWN beneficiary)    | view (finance only)                  | view (HR only)               | view (branch)                     | view/create (intake)    | —                  | view (own consents) | view/list          |
| **reports**       | full                         | view/list/create         | view/list (branch)                   | view (branch.care)             | view (OWN)                | view (branch.finance)                | view (branch.HR)             | view (branch.quality)             | view (branch.ops)       | —                  | view (own family)   | view/list          |
| **dashboards**    | full                         | view (exec)              | view (branch)                        | view (branch.care)             | view (me)                 | view (branch.finance)                | view (branch.HR)             | view (branch.quality)             | view (branch.reception) | —                  | view (family)       | view (audit)       |
| **settings**      | full                         | view/list/edit           | view (branch settings only)          | —                              | —                         | —                                    | —                            | —                                 | —                       | —                  | —                   | view/list          |
| **users**         | full                         | view/list/edit/create    | view/list (branch)                   | —                              | —                         | —                                    | view (branch.HR)             | view (branch)                     | —                       | —                  | view (self)         | view/list          |
| **roles**         | view/edit                    | view/list (no edit)      | —                                    | —                              | —                         | —                                    | —                            | —                                 | —                       | —                  | —                   | view/list          |
| **permissions**   | view/edit                    | view/list                | —                                    | —                              | —                         | —                                    | —                            | —                                 | —                       | —                  | —                   | view/list          |
| **audit-logs**    | view (no delete EVER)        | view (filtered)          | view (branch)                        | view (own action)              | view (own action)         | view (own action)                    | view (own action)            | view (branch)                     | view (own action)       | view (own)         | view (own)          | full read + export |
| **exports**       | full                         | view/list/create         | view/list/create (branch)            | view/list/create (branch.care) | view (OWN)                | view/list/create (branch.finance)    | view/list/create (branch.HR) | view/list/create (branch.quality) | —                       | —                  | view (own family)   | view/list/create   |
| **integrations**  | full                         | view/list/edit           | —                                    | —                              | —                         | —                                    | —                            | —                                 | —                       | —                  | —                   | view/list          |
| **impersonation** | request only, 2-approver     | request only, 2-approver | —                                    | —                              | —                         | —                                    | —                            | —                                 | —                       | —                  | —                   | view (logs only)   |

### 6.3 Bulk action rules

For all roles: **bulk export of > 100 records ALWAYS requires step-up MFA + recorded reason.** Bulk delete is forbidden for non-admin roles; for admin roles requires 2-approver.

### 6.4 Override action

`override` (e.g. unlocking a care plan, force-approving past SLA) is a separate permission code held only by directors (HQ + branch). Every use creates a high-severity audit entry + automatic notification to the chain of command.

### 6.5 Impersonation

**Forbidden by default.** Even `super_admin` cannot impersonate a regular user without:

1. A 2-approver request (super_admin + dpo).
2. Time-bound (max 4 hours).
3. Continuous banner on impersonated session.
4. Every action under impersonation tagged with `audit.viaImpersonation = true`.
5. Cannot impersonate other admin-tier roles ever.

---

## 7 · Policy Rule Layer · طبقة السياسات

### 7.1 The composite decision

```
allow ⇔
  rbac.role.holdsPermission(action)            (Layer 2)
  AND scope.entity ⊆ scope.actor                (Layer 3)
  AND policy(actor, action, resource, context) (Layer 4)
  AND ¬sod.violates(actor, action, resource)   (Layer 5)
```

### 7.2 Policy rule structure

```
{
  id:        string,
  appliesTo: { actions[] OR allActions },
  conditions: [
    // each is a predicate over (actor, resource, context)
    'actor.branchId == resource.branchId',
    'resource.sensitivity != "business_secret" OR actor.role IN ["executive_leadership"]',
    'now() < resource.approvalState.expiresAt',
    'actor.mfaLevel >= REQUIRED_MFA_FOR(action)',
  ],
  effect:   'allow' | 'deny',
  severity: 'critical' | 'high' | 'medium',
  reason:   string  // template — substituted into the decision reason
}
```

### 7.3 The 9 attribute axes evaluated

| Axis               | Source                                            | Example check                                                     |
| ------------------ | ------------------------------------------------- | ----------------------------------------------------------------- |
| 1. role            | `actor.roles[]` → governance.registry holders     | `actor holds 'finance.invoices.approve'`                          |
| 2. scope           | `actor.baseScope + actor.elevation`               | `resource.branchId ∈ actor.scopedBranchIds`                       |
| 3. branch          | `actor.branchId`, `resource.branchId`             | `actor.branchId == resource.branchId`                             |
| 4. department      | `actor.departmentId`, `resource.departmentId`     | `==` or actor.scope.includesDept                                  |
| 5. assignment      | `resource.assignedTo`, `resource.ownerId`         | `actor.userId == resource.assignedTo`                             |
| 6. sensitivity     | `resource.sensitivity` (fieldKindMap)             | `sensitivity != 'business_secret' OR actor.role == 'super_admin'` |
| 7. workflow status | `resource.status`, `resource.approvalState.stage` | `status != 'archived' OR action == 'restore'`                     |
| 8. time            | `context.now`, elevation expiry, approval expiry  | `now < elevation.expiresAt`                                       |
| 9. risk            | `actor.riskScore` (from §16 monitor)              | `riskScore < 0.8 OR mfa.recentlyAsserted`                         |

### 7.4 Decision composition example

Action: `finance.invoices.approve` on invoice `INV-2026-00123`.

```
Actor: { userId: U-7, roles: ['finance'], branchId: 'B-1', mfaLevel: 2, sessionAgeMin: 4 }
Resource: { type: 'Invoice', id: 'INV-...', branchId: 'B-1', amount: 50000,
            createdBy: 'U-7', status: 'pending-approval', sensitivity: 'financial' }

Layer 1 IDENTITY: session valid ✓
Layer 2 RBAC:     'finance' holds 'finance.invoices.approve' ✓
Layer 3 SCOPE:    actor.branchId == resource.branchId ✓
Layer 4 POLICY:   amount 50000 > BRANCH_THRESHOLD 10000 → require finance_director
                  → policy condition: actor.role IN ['finance_director', 'head_office'] ✗
                  → DENY with reason 'AMOUNT_EXCEEDS_BRANCH_THRESHOLD'
Layer 5 SoD:      (would fire — actor.userId == resource.createdBy → self-approval)
                  → DENY with reason 'SOD_INVOICE_SELF_APPROVAL'

Both layers 4+5 deny. Final: { allow: false, reason: 'AMOUNT_EXCEEDS_BRANCH_THRESHOLD',
appliedLayer: 4, sodHit: { rule: 'invoice-self-approval', ... } }
```

The system surfaces the FIRST denial reason but ALWAYS records the full evaluation in audit for later review.

---

## 8 · Branch Isolation Rules · قواعد عزل الفروع

### 8.1 The 9 inviolable rules

1. **Every API query is branch-filtered server-side.** The query layer (Mongoose middleware or raw filter) injects `branchId ∈ actor.scopedBranchIds` BEFORE the request leaves the route handler. Frontend cannot omit or override.

2. **Every search is branch-limited.** Full-text and autocomplete endpoints respect branch scope. Searching "Ahmed" doesn't return Ahmeds from other branches.

3. **Every export is branch-limited unless GLOBAL.** Export jobs declare their scope upfront; the engine rejects exports that would cross scope.

4. **Every report is branch-limited unless GLOBAL.** Report definitions include a `scope` field; running a "Cross-branch comparison" report requires GLOBAL.

5. **Every dashboard KPI is scope-aware.** A KPI's data resolver receives the actor's scope and filters accordingly. KPI tiles literally cannot show other branches' numbers to a branch user.

6. **Every direct URL is checked.** Hitting `/api/v1/beneficiaries/B-5-12345` while in branch B-1 → 404 (not 403 — we don't even confirm the record exists in another branch).

7. **Every document/media URL is signed + scoped.** S3-style pre-signed URLs include the branch claim; the asset gateway re-checks at fetch time.

8. **No leakage through counts.** A branch user's "total beneficiaries" KPI shows only THEIR branch's count. Cross-branch totals are reserved for GLOBAL.

9. **No leakage through autocomplete or related-entity lookups.** Picking a "linked therapist" while creating an assessment shows only therapists in the same branch.

### 8.2 The "branch-context propagation" pattern

```
Request enters → middleware extracts actor from JWT
                ↓
                Loads actor.roles, actor.branchId, actor.regionBranchIds, actor.elevation
                ↓
                Computes actor.scopedBranchIds:
                  - GLOBAL → all branches (no filter)
                  - REGION → actor.regionBranchIds
                  - BRANCH → [actor.branchId]
                  - elevation in effect → union
                ↓
                Attaches to req.actor (read-only, frozen)
                ↓
Route handler  → calls service.list(req.actor, filters)
                ↓
Service        → calls repository.findWithScope(actor.scopedBranchIds, filters)
                ↓
Repository     → ALWAYS includes { branchId: { $in: actor.scopedBranchIds } }
                ↓
DB             → returns only scoped rows
```

The pattern is enforced by a single helper `withBranchScope(actor, filter)` used by every repository read. Bypassing it requires editing the helper — caught in code review and by drift tests.

### 8.3 Anti-IDOR (Insecure Direct Object Reference) defense

Even if a branch user knows another branch's record ID:

| Endpoint                        | Defense                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `GET /api/v1/beneficiaries/:id` | Service fetches, then asserts `resource.branchId ∈ actor.scopedBranchIds`, else 404 |
| `GET /api/v1/care-plans/:id`    | Same                                                                                |
| Document download URL           | Pre-signed URL embeds `branchId`, validated at gateway                              |
| Export job poll                 | Job's `requestedByBranchId` must match actor or be in scope                         |
| Audit log entry view            | Branch users see only audit events from their branch                                |

### 8.4 What CAN cross branches

- **Aggregated KPIs** (counts, percentages) at GLOBAL scope — but never raw IDs/names.
- **Org-level config** (role catalog, policy rules, system settings).
- **Audit log** — by definition cross-branch for HQ auditors, but each entry's payload still respects per-record sensitivity.
- **Integration events** — service accounts cross branches by design, with strict allow-list.

---

## 9 · Dashboard & Report Authorization · صلاحيات اللوحات والتقارير

### 9.1 The 8 dashboard surfaces (from Wave 15)

| Surface     | Cross-branch view?                          | Role groups                                   |
| ----------- | ------------------------------------------- | --------------------------------------------- |
| `executive` | Yes (GLOBAL)                                | executive_leadership, head_office, hq_auditor |
| `branch`    | No                                          | branch_manager                                |
| `clinical`  | No                                          | clinical_supervisor                           |
| `hr`        | No (branch HR), Yes (HR director)           | hr                                            |
| `finance`   | No (branch finance), Yes (finance director) | finance                                       |
| `quality`   | No (branch QC), Yes (quality director)      | quality_compliance                            |
| `dpo`       | Yes (DPO-only, cross-branch DSAR)           | quality_compliance (DPO subset)               |
| `me`        | OWN                                         | therapist, reception                          |
| `reception` | Branch                                      | reception                                     |

### 9.2 The cross-branch leakage rule

> A branch user looking at `executive` dashboard sees their branch ONLY. The dashboard's "Branch comparison" widget is rendered but populated with their branch + masked siblings ("Branch B - (hidden)" with no number).

### 9.3 Totals/trends rule

A branch user's "total attendance this month" widget shows their branch's total. If they're shown an "org-wide trend" line chart, it's stripped to their branch series only — siblings are removed BEFORE the response leaves the server.

### 9.4 Print / export rules

| Role          | Print same-screen dashboard | Export raw underlying data                       |
| ------------- | --------------------------- | ------------------------------------------------ |
| HQ roles      | ✓                           | ✓ (within their domain scope)                    |
| Branch roles  | ✓ (branch-scoped)           | ✓ (branch-scoped) + step-up MFA if > 100 records |
| Family portal | Their family's report only  | ✓ (own family invoices only)                     |
| Auditor       | ✓ everything                | ✓ everything (highest audit weight)              |

### 9.5 Saved views

A saved view is bound to the creator's scope at save time. If a `branch_manager` saves "High-severity alerts in Branch B-1," and is later transferred to B-2, the view returns **0 results** (because it filters on B-1 which is no longer in their scope) — never silently leaks B-1.

### 9.6 Scheduled reports

A scheduled report runs as the SCHEDULER service account, BUT uses the requester's scope frozen at schedule-creation time. If the requester is later off-boarded, the schedule is auto-cancelled (Wave 14 access-review will detect orphaned schedules).

---

## 10 · Frontend Authorization UX · واجهة الصلاحيات

### 10.1 Route guards

```jsx
<Route
  path="/finance/invoices/approve"
  element={
    <PermissionGate requires={['finance.invoices.approve']} fallback={<NoPermissionState reason="finance-approval-required" />}>
      <InvoiceApprovalPage />
    </PermissionGate>
  }
/>
```

A `PermissionGate` calls `GET /api/v1/governance/permissions/check?codes=...` at render time. Cache for 5 min. If revoked mid-session (rare), next call returns 403 and the gate hides the page.

### 10.2 Component guards

Inside a page, individual actions are gated:

```jsx
<PermissionedButton action="finance.invoices.approve" resource={invoice} onClick={handleApprove}>
  Approve
</PermissionedButton>
```

If the user lacks permission, the button is **hidden, not disabled**. Disabled buttons leak the existence of the action — hiding doesn't.

### 10.3 Hidden vs disabled

| Scenario                                                           | Treatment                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| No permission to see the FEATURE                                   | Hidden (no menu item, no button)                             |
| No permission for THIS resource (but has it for others)            | Disabled with tooltip "You don't have access to this branch" |
| Permission held but resource state forbids (e.g. already approved) | Disabled with tooltip "Already approved by X"                |
| Permission held but workflow step is wrong                         | Visible, error on click ("Action not allowed at this stage") |

### 10.4 No-permission vs no-data states

```
┌────────────────────────────┐    ┌────────────────────────────┐
│ 🔒 You don't have access to │    │ 📭 No invoices yet          │
│ this section.              │    │                            │
│                            │    │ Click + to create the first│
│ Request access from your   │    │ invoice for this branch.   │
│ branch manager.            │    │                            │
└────────────────────────────┘    └────────────────────────────┘
   no-permission state              no-data state
```

Critical distinction: a branch user seeing "0 invoices" in another branch is a SECURITY FAILURE (they shouldn't see the page at all). A branch user seeing "0 invoices" in their own empty-state branch is OK.

### 10.5 Branch-aware navigation

| Element         | Rule                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Branch switcher | Visible ONLY for roles with REGION or GLOBAL scope. Branch users see their branch as a static label. |
| Sidebar menu    | Items present only for actions the user can perform                                                  |
| Top-nav search  | Scope chip ("Searching in: Branch Riyadh") makes scope explicit                                      |
| Breadcrumb      | First crumb is always the current branch (or "Org-wide") for clarity                                 |

### 10.6 Sensitive action confirmation

Approving an invoice > SAR 10,000 triggers a confirmation modal:

```
┌─────────────────────────────────────────┐
│ ⚠ Confirm Invoice Approval             │
│                                          │
│ You're about to approve:                │
│   INV-2026-00123 — SAR 45,000          │
│   Vendor: ABC Medical Supplies          │
│                                          │
│ This action requires:                    │
│   ✓ Fresh MFA verification              │
│   ✓ Will be permanently audit-logged   │
│                                          │
│ Reason (required):                       │
│ ┌──────────────────────────────────┐    │
│ │ Pre-approved by SOP-2026-04       │    │
│ └──────────────────────────────────┘    │
│                                          │
│            [ Cancel ]   [ Approve ]      │
└─────────────────────────────────────────┘
```

### 10.7 Elevated access banner

When TEMP_ELEVATED is in effect:

```
🟠 ELEVATED ACCESS ACTIVE — Acting as Branch Manager for Branch Riyadh
   Expires in 47 min · All actions enhanced-audited · Reason: Branch manager on leave
                                                                       [ End Now ]
```

The banner is unmissable + clickable to view the full elevation record + click-to-revoke.

### 10.8 Scope badges

Inline on every list/card:

```
Invoice INV-2026-00123  [Branch: Riyadh]  [Status: pending]
```

Helps the user understand at a glance what they're looking at — and helps a manager who hops between branches.

---

## 11 · Backend Enforcement Blueprint · مخطط التنفيذ الخلفي

### 11.1 The 9 enforcement layers

```
1. JWT verification          (identity layer)
   ↓
2. Session validity check     (revocation, MFA freshness)
   ↓
3. Claims hydration           (load roles, branchId, regionBranchIds, elevation)
   ↓
4. Policy middleware          (route-level: does role hold the code at all?)
   ↓
5. Scope middleware           (req.actor.scopedBranchIds attached)
   ↓
6. Service-layer check        (calls authzService.decide() with resource)
   ↓
7. Repository scope injection (withBranchScope helper)
   ↓
8. Response masking            (Wave 26 maskForCompliance strips fields)
   ↓
9. Audit emit                  (writes AuditLog entry with full decision trace)
```

### 11.2 Identity claims (the JWT)

```js
{
  sub: 'u-7',
  roles: ['finance', 'branch_finance'],
  branchId: 'B-1',
  regionBranchIds: [],
  mfaLevel: 2,
  mfaAssertedAt: 1716123456,
  elevation: null,
  iss: 'alawael-auth',
  exp: 1716127056,
  jti: 'sess-abc123'
}
```

**Mandatory:** every claim is checked at every request. JWT signature alone is NOT enough — `mfaAssertedAt` freshness, `elevation.expiresAt`, and session revocation list are also consulted.

### 11.3 Branch context propagation

`req.actor` is set by the middleware and FROZEN (`Object.freeze`). Subsequent code can read but cannot mutate. Mutation attempts in development throw; in production they're a metric.

### 11.4 Service-layer check pattern

```js
async function approveInvoice({ invoiceId, actor }) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return { ok: false, reason: 'NOT_FOUND' };

  const decision = await authzService.decide({
    actor,
    action: 'finance.invoices.approve',
    resource: {
      type: 'Invoice',
      id: invoice._id,
      branchId: invoice.branchId,
      ownerId: invoice.createdBy,
      status: invoice.status,
      sensitivity: 'financial',
    },
  });

  if (!decision.allow) {
    await auditLog.write({ ... decision ... });
    return { ok: false, reason: decision.reason };
  }

  // ... proceed with approval ...
  await auditLog.write({ action: 'finance.invoices.approve', allow: true, ... });
}
```

### 11.5 Repository enforcement

```js
async function findInvoicesForActor(actor, filters) {
  return Invoice.find({
    ...filters,
    branchId: { $in: actor.scopedBranchIds }, // CANNOT BE BYPASSED
  });
}
```

`withBranchScope(actor, filter)` is the single funnel. Repository code that bypasses it is a CI failure (lint rule + grep gate in pre-commit).

### 11.6 Anti-IDOR

Every `GET /:id` endpoint:

1. Loads the resource.
2. Verifies `resource.branchId ∈ actor.scopedBranchIds`.
3. Returns 404 (not 403) if mismatch — never confirm existence.

### 11.7 Secure file access

Documents/media use signed URLs with embedded `branchId` claim. The asset gateway:

1. Verifies signature.
2. Checks `branchId ∈ requester.actor.scopedBranchIds`.
3. Logs the access (Wave 26 `recordAccess`).
4. Streams the file.

### 11.8 Background jobs + cron authorization

Every job declares:

```js
{
  jobId: 'kpi-recompute',
  runsAs: 'service:kpi-aggregator',
  scope: 'GLOBAL',
  allowedToWrite: ['KpiValue'],
  allowedToRead: ['KpiValue', 'Attendance', 'Sessions'],
}
```

The job runner enforces the `runsAs` actor identity throughout the job's lifetime. Jobs cannot escalate.

### 11.9 Integration token restrictions

```js
{
  tokenId: 'tok-zatca-prod',
  bindToIPs: ['10.0.0.5'],
  allowedEndpoints: ['POST /api/zatca/submit'],
  scope: 'NPHIES-specific',
  rotateEvery: 30,  // days
  emergencyKillSwitch: true,
}
```

A token used outside its allow-list → immediate denial + alert + auto-revoke if 3 hits in 60s.

---

## 12 · Privileged Access Management · إدارة الوصول المميّز

### 12.1 The privileged set

Privileged = any role/action that can:

- Modify roles or permissions
- Read raw audit log
- Approve transactions > threshold
- Grant elevations
- Access raw PHI in bulk
- Modify governance config

| Role                                                                                     | Privileged? |
| ---------------------------------------------------------------------------------------- | ----------- |
| super_admin, hq_admin, finance_director, hr_director, clinical_director, dpo, hq_auditor | Yes         |
| branch_manager, clinical_supervisor (for ack of red-flags only)                          | Partially   |
| All other branch roles                                                                   | No          |

### 12.2 MFA tiers

| Tier                                 | When required                                                             |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Tier 1 (password)                    | Standard login                                                            |
| Tier 2 (password + TOTP/SMS)         | Every privileged role's login; every export > 100 records                 |
| Tier 3 (password + TOTP + biometric) | Role grants, audit-log export, impersonation, emergency access activation |

MFA is **step-up**: the user logs in with Tier 1, and is prompted for Tier 2 only when they attempt a Tier 2+ action. The session tracks `mfaLevel` and `mfaAssertedAt`.

### 12.3 Time-bound privileged sessions

Privileged sessions auto-expire faster:

| Role               | Session max                        |
| ------------------ | ---------------------------------- |
| super_admin        | 4 hours                            |
| HQ directors       | 8 hours                            |
| Branch manager     | 12 hours                           |
| Other branch roles | 24 hours                           |
| Family portal      | 7 days (with longer re-auth grace) |
| Integration token  | 30 days (rotated)                  |

### 12.4 Admin approval ladder

| Change                      | Approver chain                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Grant role to user          | One admin → autoreview, plus the user's manager attestation                         |
| Grant privileged role       | Two admins, neither being the target user, neither being each other's direct report |
| Create new role             | Two super_admins + DPO if it involves PHI                                           |
| Modify SoD rules            | Three super_admins (one of whom is the DPO)                                         |
| Disable a critical SoD rule | NEVER allowed — only "exempt this specific case with compensating control"          |

### 12.5 Session recording (sensitive admin actions only)

Privileged session events are recorded as a _structured event stream_ (not raw screen capture — too expensive + privacy issues). Captured:

- Every page navigation
- Every API call (sanitized — payloads scrubbed of PII before logging)
- Every record modified (before/after diff)
- Every export

Stored separately from regular audit log, with longer retention (7 years per CBAHI).

### 12.6 Immutable logs

The audit log uses a hash-chain (Phase 8 audit-hash-chain-service). Every entry includes the hash of the previous entry. Tampering with any entry breaks the chain — detectable by a daily verification job. **Even super_admin cannot delete or modify** entries.

---

## 13 · Break-glass / Emergency Access · الوصول الطارئ

### 13.1 When emergency access is allowed

| Scenario                                       | Eligible roles                      |
| ---------------------------------------------- | ----------------------------------- |
| Clinical emergency requiring cross-team access | clinical_supervisor, branch_manager |
| Financial fraud investigation                  | finance_director, dpo, super_admin  |
| Regulatory inspection (CBAHI on-site audit)    | super_admin, dpo, hq_auditor        |
| System-down operator coverage                  | hq_admin, super_admin               |

### 13.2 The activation flow

```
1. User clicks "Request Emergency Access"
   ↓
2. Form: { reason (required, ≥ 50 chars), durationMin (max 4h), scope }
   ↓
3. System creates `EmergencyAccess` record:
      status: 'pending'
      expiresAt: now + min(requested, role-max)
      activatorUserId
      reason
      requestedScope
   ↓
4. Auto-notify chain of command (manager + dpo)
   ↓
5. If activator role is super_admin OR dpo: instant activate
   Otherwise: require 1 super_admin confirmation in ≤ 10 min
   ↓
6. On activation: banner appears, all actions tagged `viaEmergency=true`
   ↓
7. On expiry: hard auto-deactivate; user re-prompted at next request
```

### 13.3 During active emergency access

- Banner is unmissable, persistent, with countdown timer.
- Every action is HIGH-severity audited.
- Privileged actions still require Tier 3 MFA — emergency doesn't bypass MFA.
- Cannot perform DELETE on audit log, SoD-violating actions, or role grants — even in emergency.

### 13.4 Auto-expiry

Hard expiry. No "extend" — user must file a fresh request. This prevents indefinite emergency access (a top SoD failure mode in healthcare orgs).

### 13.5 Post-hoc review

Every emergency-access session triggers a mandatory review within 7 days:

```
Reviewer: super_admin (different from activator if possible)
Form:
  - Was the reason valid?
  - Were the actions taken consistent with the reason?
  - Should we change a process so this isn't needed next time?
  - Should we discipline / praise the activator?
Outcome:
  - approved (logged + closed)
  - flagged (escalate to executive)
  - misuse (HR action + permission review)
```

Until reviewed, the activator gets a non-blocking notification reminder. If unreviewed 14 days post-expiry, the user's privileged role grants are paused pending review.

### 13.6 Misuse investigation

If review flags misuse:

1. Activator's elevation rights are paused immediately.
2. All actions during the emergency are re-audited (HR + DPO present).
3. If confirmed misuse: HR action up to and including termination + permission revocation across the platform.
4. If false flag: activator is cleared + reviewer is themselves reviewed.

---

## 14 · Access Review & Recertification · مراجعة وإعادة اعتماد الوصول

### 14.1 Cadence

| Population                                        | Cadence     | Reviewer                                           |
| ------------------------------------------------- | ----------- | -------------------------------------------------- |
| Privileged roles (HQ directors, DPO, super_admin) | Quarterly   | super_admin + DPO co-sign                          |
| Branch managers + clinical supervisors            | Quarterly   | HQ admin or super_admin                            |
| All other branch staff                            | Semi-annual | Their branch manager                               |
| Family portal users                               | Annual      | Reception + auto-suspend if no child active in 90d |
| Service accounts                                  | Semi-annual | IT lead + super_admin co-sign                      |

### 14.2 Review checklist (per user)

```
☐ Still employed?
☐ Still in the same role?
☐ Still needs every permission they currently hold?
☐ Last login within 30 days?
☐ Any elevation requests in the last quarter? Were they appropriate?
☐ Any SoD-near-misses? Should compensating controls strengthen?
☐ Outstanding follow-ups (Wave 25) — overdue ones flag risk
☐ Confirm OR REVOKE
```

### 14.3 Bulk attestation UI

For branch managers reviewing 15-30 staff at once:

- Tabular view with permissions summary per row.
- Checkbox column.
- Default = "Keep all" (with bulk action to confirm-all).
- Exception column where reviewer notes anomalies.
- Submit → all confirmed users get a fresh `lastReviewedAt` timestamp.

### 14.4 Stale access detection

A daily job flags:

- Users who haven't logged in in 30 days → suspend at 60 days.
- Users with permissions never exercised in 90 days → suggest revocation.
- Service accounts with no calls in 30 days → manual review.

### 14.5 Dormant account review

Quarterly:

- Pulls accounts with `lastLoginAt < now - 60d`.
- Notifies the user's manager.
- 14 days to respond → auto-suspend.

### 14.6 Orphaned account review

When an employee is terminated (HR system → User model `status='terminated'`):

- Immediate revocation of all sessions.
- 24h grace to transfer their assigned records to a successor.
- Past 24h → account hard-disabled.
- All their saved views/exports are flagged for re-owner-assignment.

---

## 15 · Joiner-Mover-Leaver Workflow · دورة حياة الموظف

### 15.1 Joiner

```
1. HR creates Employee record (Wave 27 productivity employee model)
   ↓
2. Auto-create User account, status='pending-activation'
   ↓
3. HR assigns:
      - role(s) — from canonical role catalog
      - branchId
      - departmentId
      - direct manager
   ↓
4. Generate temp password + email/SMS activation link
   ↓
5. On first login: user MUST set strong password + enroll MFA + acknowledge
   the PDPL data-handling notice
   ↓
6. User can now log in; first session is heavily logged
```

### 15.2 Mover — internal role/branch change

```
1. HR (or branch manager via Wave 25 quick action) initiates change
   ↓
2. System computes diff of permissions: { granted, revoked }
   ↓
3. If revocation includes a privileged role: SoD check + 2-approver ladder
   ↓
4. Effective date queued (typically next day for clean cutover)
   ↓
5. On effective date:
      - Saved views: keep but flag if scope no longer matches
      - In-flight follow-ups: transfer to successor or escalate to manager
      - Scheduled reports: pause, prompt user to re-bind to new scope
      - Open emergency-access sessions: hard-revoke
   ↓
6. Audit log entry: "User U-7 moved from Therapist/B-1 to BranchManager/B-1"
```

### 15.3 Promotion/demotion

Demotion is more sensitive than promotion. On demotion:

- Outstanding approvals authored by the user are flagged for re-validation by a peer.
- Their pending follow-ups are re-assessed by their manager.

### 15.4 Transfer between branches

Treat as a leaver-rejoiner for branch isolation:

- Day N: still in branch A (full B-A access)
- Day N+1 midnight: hard cut — no more B-A access
- Day N+1: branch B onboarding (fresh data agreement re-attest)

This prevents data carryover.

### 15.5 Offboarding

```
HR initiates termination (or contract end auto-triggers)
   ↓
Immediate session revocation across all devices
   ↓
Re-assign ownership:
   - Their beneficiaries → handed off via mandatory handoff note (Wave 25)
   - Their care plans → ownership transferred to clinical supervisor
   - Their pending follow-ups → escalated to manager
   - Their saved views → archived
   - Their exports/reports → archived
   ↓
24h grace for data download (with their manager + DPO co-sign)
   ↓
Hard disable: account status='terminated'; cannot log in even if password leaks
   ↓
Audit log retention: 7 years (CBAHI)
```

### 15.6 Emergency suspension

Triggered by:

- Risk detector flagging > 0.9 score (Wave 16).
- HR action ("suspended pending investigation").
- DPO action ("data breach suspect").
- Manager flag ("misconduct under investigation").

Effect:

- All sessions terminated.
- Account locked (cannot log in).
- All elevations revoked.
- Outstanding follow-ups transferred to manager.
- Investigation workflow opens automatically.

### 15.7 Immediate revocation triggers

Auto-triggers (no human approval needed):

- 5 failed logins in 5 min → 15-min cooldown.
- Suspicious cross-branch probing (Wave 16) → suspend + notify DPO.
- Detected credential reuse from a leak database → password reset forced + alert.
- Geofence violation (login from un-allowed country) → suspend + notify.

---

## 16 · Risk Detection & Monitoring · رصد المخاطر

### 16.1 The 8 signals

| Signal                    | What it captures                                      | Threshold to alert                            |
| ------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| Unusual access            | User accesses an entity type they haven't in 30+ days | Single occurrence → audit; 3+ in a day → flag |
| Mass export attempt       | > 100 records exported in 5 min OR > 1000 in 1 hour   | Block + alert in real time                    |
| Repeated denials          | > 10 access denials in 10 min for one user            | Auto-elevate risk score → step-up MFA         |
| Cross-branch probing      | Branch user requesting another branch's records       | Single 404 = log; 5+ in 30 min = lockout      |
| Abnormal admin actions    | Admin acting outside normal hours OR from new IP/UA   | Step-up MFA before allowing                   |
| Privilege creep           | User's permission count grew > 50% in 90 days         | Quarterly review flag                         |
| Emergency-access patterns | User triggered emergency > 3 times in 90 days         | Manager attestation required                  |
| Audit-log access bursts   | Anyone reading > 500 audit entries in 1 hour          | DPO notification                              |

### 16.2 Risk score model

```
riskScore(user) = baseRisk(role)
                + 0.3 × hasUnusualAccessInLastHour
                + 0.2 × failedLoginsLast24h / 5
                + 0.4 × emergencyAccessLast30d / 3
                + 0.5 × deniedAccessLast24h / 10
                + 0.2 × isNewDevice
                clamp [0, 1]
```

When `riskScore >= 0.7`, the user is prompted for step-up MFA on the next privileged action.
When `riskScore >= 0.9`, the session is force-terminated + investigation workflow opens.

### 16.3 Monitoring dashboards

A `dpo` + `super_admin` only dashboard:

- Top-N users by risk score
- Recent emergency activations
- SoD near-misses (denials that came close)
- Failed login heatmap (geo + time)
- Audit-log access patterns (who reads the audit log most?)

### 16.4 Alerting integration

All Wave-16 risk signals fire through the [[alert-priority-engine-2026-05-16]] — they show up in DPO + super_admin alert streams with critical severity, escalate immediately to tier 3 SMS.

---

## 17 · Implementation Roadmap · خارطة التنفيذ

### Phase 1 — Foundation (Wave 31, this PR)

- Authz constitution doc (this file)
- Role catalog registry (extend Wave 23 with full 18-role catalog)
- Scope hierarchy enum + computation helper
- `authzService.decide()` skeleton with 5-layer evaluation
- Tests for core decision paths

### Phase 2 — Entity matrix + policy enforcement (Wave 32)

- Full entity-permission matrix encoded in registry
- Policy rule evaluator with the 9 attribute axes
- Per-route middleware adoption (start with highest-risk: finance, payroll, audit-log)
- Repository `withBranchScope` helper rollout

### Phase 3 — Frontend guards + dashboard scoping (Wave 33)

- `<PermissionGate>` + `<PermissionedButton>` component library
- Route guard middleware
- Dashboard scope-aware rendering (extend Wave 24 layout-policy)
- Branch switcher hiding for branch users

### Phase 4 — Audit + privileged access (Wave 34)

- Step-up MFA flow
- Privileged session timeouts
- Immutable log verification job
- Session recording for admin actions

### Phase 5 — SoD + reviews + recertification (Wave 35)

- 10 toxic-combination SoD rules enforced at decision time
- Quarterly access review workflow
- Bulk attestation UI
- Dormant/orphaned account jobs

### Phase 6 — Monitoring + risk analytics (Wave 36)

- 8 risk signals wired
- Risk score computation job
- DPO monitoring dashboard
- Auto-suspension flows

### Phase 7 — Joiner-Mover-Leaver workflows (Wave 37)

- Onboarding wizard
- Transfer flow
- Offboarding workflow with mandatory handoff
- Emergency suspension button

---

## 18 · Critical Risks to Avoid · المخاطر القاتلة

### 18.1 The 10 fatal mistakes

| #   | Mistake                                               | Why fatal                                                | Mitigation                                                                |
| --- | ----------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | **Role explosion** — 50+ roles, each used by 1 person | Maintenance nightmare; nobody understands the matrix     | Hard cap at 25 roles; require Constitution amendment to add               |
| 2   | **Missing scope enforcement** — relying on UI hiding  | Direct API calls bypass everything                       | Repository-level `withBranchScope` MANDATORY; CI gate forbids raw queries |
| 3   | **Frontend-only checks**                              | Bypassable in 30 seconds via curl                        | Every check duplicated server-side; frontend is UX, not security          |
| 4   | **Unreviewed privileged roles**                       | Permission creep accumulates silently                    | Quarterly recertification, hard-stop if not done                          |
| 5   | **Unrestricted exports**                              | Mass data exfil via "innocent" export                    | All exports are permissions + step-up MFA + audit                         |
| 6   | **Hidden but callable APIs**                          | "Internal" routes that are still reachable from internet | Network ACL + service-to-service mTLS for true internal-only              |
| 7   | **Absent SoD**                                        | Same person creates + approves invoice = embezzlement    | 10 toxic combinations encoded + enforced runtime                          |
| 8   | **No access reviews**                                 | Off-boarded users keep access for years                  | Quarterly cadence, auto-suspend at 60d dormant                            |
| 9   | **Permanent emergency access**                        | Emergency becomes "the way we work"                      | Hard expiry, post-hoc review mandatory, misuse → HR                       |
| 10  | **Dashboards leaking cross-branch aggregates**        | "Total org revenue" tile visible to branch users         | All KPIs scope-aware; branch users see only their slice                   |

### 18.2 The 3 cultural risks

Beyond mechanics:

| Risk                                 | Symptom                                     | Mitigation                                                                                                           |
| ------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **"Just give them access" attitude** | Managers grant blanket roles "for now"      | No "for now" — every grant is timed or reviewed                                                                      |
| **Audit fatigue**                    | Quarterly review becomes rubber-stamping    | Vary review focus (focus alerts; vary the sample)                                                                    |
| **Emergency normalization**          | Staff use emergency access for routine work | Track emergency usage per role; if a role's emergency usage > 5% of sessions, the role's normal scope needs widening |

### 18.3 Anti-patterns specifically forbidden

- `if (user.isAdmin) return true` — bypasses the policy layer
- `req.headers['x-branch-id'] = ...` — client-controlled branch claim
- `// TODO: add scope check` in production code
- A role named `super_user_temp_for_now`
- `auditLog.delete(...)` anywhere in the codebase
- `mongoose.find({})` (no filter) in routes the public can reach

---

## Closing · ختام

> هذا الدستور ليس وثيقة جامدة. يُراجع سنويًا، ويُعدَّل بعد كل حادثة تشغيلية ذات صلة بالصلاحيات، ويُعلَن تغييره في AuditLog كأي إجراء حساس آخر.
>
> This Constitution is not static. It's reviewed annually, amended after every authorization-related incident, and changes themselves are AuditLog-recorded as a privileged action.

**Authority chain:** any conflict with another doc → this Constitution wins. Any conflict between this Constitution and a regulator's instruction → the regulator's instruction wins (and this Constitution gets amended within 30 days).

**Implementation status:** Phase 1 ships in Wave 31 (this PR — authz service skeleton + tests). Phases 2-7 sequenced through Wave 37.
