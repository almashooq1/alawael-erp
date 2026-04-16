# 11 — Advanced IAM & Authorization Model | نموذج الصلاحيات المتقدم

> الامتداد الرسمي لـ [05-role-matrix.md](05-role-matrix.md) — تفاصيل multi-tenant branch-aware authorization للمنصة السعودية للتأهيل.

---

## 1. المبادئ الحاكمة

| #   | المبدأ                       | التفصيل                                                            |
| --- | ---------------------------- | ------------------------------------------------------------------ |
| 1   | **Least Privilege**          | لا صلاحية بدون حاجة موثّقة + زمن انتهاء إن أمكن                    |
| 2   | **Deny-by-Default**          | كل قرار غير مُصرَّح صراحة = رفض                                    |
| 3   | **Defense in Depth**         | RBAC (baseline) + ABAC (context) + Record-level (ownership)        |
| 4   | **Branch Isolation**         | عزل إلزامي — لا تسرُّب عبر الفروع إلا لأدوار cross-branch مُدقَّقة |
| 5   | **Segregation of Duties**    | لا يُعِدّ من يوافِق، لا يدقق من ينفذ                               |
| 6   | **Break-glass is auditable** | كل تجاوز طارئ = alert + co-sign خلال 24h                           |
| 7   | **Immutable Audit**          | كل قرار وصول مُسجَّل في AuditLog append-only                       |
| 8   | **PDPL-first**               | كل قراءة لبيانات حساسة تحتاج غرض موثّق                             |

---

## 2. Roles Catalog (سجل الأدوار)

### 2.1 البنية الهرمية (6 مستويات × 3 أبعاد)

```
Level  ─── Scope ──────────────── Example Roles ─────────────────────
 L1    Platform                   super_admin
 L2    Group (HQ)                 head_office_admin, hq_cfo, hq_cmo, hq_cqo, hq_chro, hq_ceo, dpo
 L3    Branch                     branch_manager, branch_admin, branch_accountant, branch_hr_mgr
 L4    Department                 clinical_supervisor, finance_supervisor, hr_supervisor, quality_officer
 L5    Professional               therapist, doctor, nurse, teacher, psychologist, social_worker,
                                  receptionist, accountant, data_entry, hr_officer, procurement_officer
 L6    Self-Service               parent_guardian, student, family_support, viewer, guest
```

### 2.2 Role Types (أنماط)

| Type            | مثال                                         | الخصائص                                    |
| --------------- | -------------------------------------------- | ------------------------------------------ |
| **Permanent**   | `therapist`, `branch_manager`                | تعاقد دائم، مستوى ثابت                     |
| **Delegated**   | `acting_branch_manager` (لفترة)              | ينتهي تلقائياً، يرث صلاحيات المُفوِّض      |
| **Committee**   | `accreditation_committee_member`             | صلاحية أثناء اجتماع لجنة محدّد             |
| **Break-glass** | `emergency_clinical_access`                  | 4 ساعات max، يتطلب justification + co-sign |
| **External**    | `auditor`, `inspector`, `vendor_portal_user` | محدود بحسب نطاق محدَّد، معرفات قصيرة الأمد |
| **System**      | `integration_service_account`                | API key، لا جلسات، صلاحيات صارمة           |

### 2.3 Role Catalog — الأدوار الـ35 المعتمدة

| Code                  | Level    | Ar                    | Scope            | Notes                             |
| --------------------- | -------- | --------------------- | ---------------- | --------------------------------- |
| `super_admin`         | L1       | مدير المنصة           | Platform         | تقني — break-glass للوصول السريري |
| `head_office_admin`   | L2       | إداري المقر الرئيسي   | Group            | إشراف عبر الفروع                  |
| `hq_ceo`              | L2       | الرئيس التنفيذي       | Group            | Executive BI + strategic          |
| `hq_cfo`              | L2       | المدير المالي         | Group            | اعتماد مالي ≥ 100k SAR            |
| `hq_cmo`              | L2       | المدير الطبي          | Group            | يوقّع IRPs معقدة + peer review    |
| `hq_cqo`              | L2       | مدير الجودة والامتثال | Group            | CBAHI + PDPL oversight            |
| `hq_chro`             | L2       | مدير الموارد البشرية  | Group            | اعتماد تعيين/إنهاء L3             |
| `dpo`                 | L2       | مسؤول حماية البيانات  | Group            | PDPL DSRs + breach response       |
| `compliance_officer`  | L2       | مسؤول الامتثال        | Group            | سياسات + audits                   |
| `branch_manager`      | L3       | مدير الفرع            | Branch           | عمليات محلية                      |
| `branch_admin`        | L3       | إداري الفرع           | Branch           | استقبال + توثيق                   |
| `branch_accountant`   | L3       | محاسب الفرع           | Branch           | فواتير + قبض                      |
| `branch_hr_manager`   | L3       | HR الفرع              | Branch           | حضور + رواتب                      |
| `clinical_supervisor` | L4       | مشرف إكلينيكي         | Department       | يعتمد IRPs                        |
| `finance_supervisor`  | L4       | مشرف مالي             | Department       | يراجع PO + expenses               |
| `hr_supervisor`       | L4       | مشرف HR               | Department       | يراجع leave + performance         |
| `quality_officer`     | L4       | موظف جودة             | Department       | incident RCA + CAPA               |
| `therapist`           | L5       | معالج                 | Caseload         | ABA/PT/OT/Speech/...              |
| `doctor`              | L5       | طبيب                  | Caseload         | تشخيص + وصفات                     |
| `nurse`               | L5       | ممرض/ة                | Caseload         | إجراءات تمريضية                   |
| `teacher`             | L5       | معلم تربية خاصة       | Caseload         | تعليم فردي                        |
| `psychologist`        | L5       | أخصائي نفسي           | Caseload         | جلسات نفسية + تقييم               |
| `social_worker`       | L5       | أخصائي اجتماعي        | Caseload         | social cases + aid                |
| `receptionist`        | L5       | استقبال               | Branch ops       | مواعيد + دفع حضوري                |
| `accountant`          | L5       | محاسب                 | Branch finance   | فواتير + قيود                     |
| `data_entry`          | L5       | إدخال بيانات          | Branch admin     | CRUD محدود                        |
| `hr_officer`          | L5       | موظف HR               | Branch HR        | يحدّث ملفات موظفين                |
| `procurement_officer` | L5       | موظف مشتريات          | Branch           | PO drafts                         |
| `fleet_coordinator`   | L5       | منسق نقل              | Branch ops       | trips + vehicles                  |
| `parent_guardian`     | L6       | ولي الأمر             | Self (own child) | portal access                     |
| `student`             | L6       | المستفيد              | Self             | portal (accessible)               |
| `family_support`      | L6       | داعم عائلي            | Read-only (ward) | portal view                       |
| `viewer`              | L6       | قارئ                  | Read-only        | تعليمي/تدريبي                     |
| `auditor_external`    | External | مدقق خارجي            | Read-only + DPIA | CBAHI/PDPL inspector              |
| `vendor_portal_user`  | External | مورد                  | Supplier portal  | POs + delivery                    |

---

## 3. Permissions Matrix (موارد × أدوار)

**الرموز:** ✅ كامل · 🟡 مشروط (ABAC) · 👁 قراءة فقط · 📝 مع approval · ❌

> المصفوفة مختصرة هنا؛ التفصيل الكامل في [05-role-matrix.md § 3](05-role-matrix.md).

### Beneficiary (resource)

| Action                         | L1      | L2       | L3  | L4  | L5 (therapist) | L5 (reception) | L6     |
| ------------------------------ | ------- | -------- | --- | --- | -------------- | -------------- | ------ |
| List (branch)                  | ✅      | ✅       | ✅  | ✅  | 🟡 caseload    | ✅             | ❌     |
| Read profile (PHI)             | 📝 (BG) | 🟡 audit | ✅  | ✅  | 🟡 caseload    | 👁 basic       | 👁 own |
| Create                         | ❌      | 📝       | ✅  | ✅  | ❌             | ✅             | ❌     |
| Update personal (non-clinical) | ❌      | 📝       | ✅  | ❌  | ❌             | ✅             | ❌     |
| Update clinical                | ❌      | ❌       | 🟡  | ✅  | 🟡 caseload    | ❌             | ❌     |
| Discharge                      | ❌      | 📝       | 📝  | 📝  | ❌             | ❌             | ❌     |
| Transfer branch                | ❌      | ✅       | 📝  | ❌  | ❌             | ❌             | ❌     |
| Hard Delete                    | ❌      | ❌       | ❌  | ❌  | ❌             | ❌             | ❌     |

### IRP (Individualized Rehab Plan)

| Action              | L1  | L2     | L3               | L4        | L5                    | L6            |
| ------------------- | --- | ------ | ---------------- | --------- | --------------------- | ------------- |
| Draft               | ❌  | ❌     | ❌               | ✅        | ✅ own                | ❌            |
| Submit for approval | ❌  | ❌     | ❌               | ✅        | ✅ own                | ❌            |
| Approve (clinical)  | ❌  | 🟡 cmo | 🟡 (BM on small) | ✅ (lead) | ❌                    | ❌            |
| Sign (guardian)     | ❌  | ❌     | ❌               | ❌        | ❌                    | ✅ via Nafath |
| Amend active        | ❌  | ❌     | ❌               | ✅        | 📝 (within 24h + own) | ❌            |
| Terminate           | ❌  | 📝     | 📝               | ✅        | ❌                    | ❌            |
| View                | ✅  | ✅     | ✅ (branch)      | ✅ (dept) | 🟡 caseload           | 👁 own child  |

### Invoice + Payment

| Action               | L1  | L2 (CFO) | L3            | L4 (finance_sup) | L5 (accountant) | L6     |
| -------------------- | --- | -------- | ------------- | ---------------- | --------------- | ------ |
| Draft invoice        | ❌  | ❌       | ✅            | ✅               | ✅              | ❌     |
| Issue (ZATCA submit) | ❌  | ❌       | ✅            | ✅               | ✅              | ❌     |
| Edit post-issue      | ❌  | 📝 ≥10k  | ❌            | ❌               | ❌              | ❌     |
| Cancel               | ❌  | 📝 ≥10k  | 📝 <10k       | 📝 <1k           | ❌              | ❌     |
| Pay                  | ❌  | ❌       | ✅            | ❌               | ✅              | ✅ own |
| Approve refund       | ❌  | ✅       | ✅ ≤10k       | ❌               | ❌              | ❌     |
| View (group)         | ✅  | ✅       | 👁 own branch | 👁 dept          | 👁 branch       | 👁 own |

### Purchase Order (PO)

| Action         | L1  | L2     | L3          | L4 (finance_sup) | L5 (procurement) | Vendor      |
| -------------- | --- | ------ | ----------- | ---------------- | ---------------- | ----------- |
| Draft          | ❌  | ❌     | ❌          | ❌               | ✅               | ❌          |
| Submit         | ❌  | ❌     | ❌          | ❌               | ✅ own           | ❌          |
| Approve <5k    | ❌  | ❌     | ❌          | ✅               | ❌               | ❌          |
| Approve 5k–50k | ❌  | ❌     | ✅          | 📝               | ❌               | ❌          |
| Approve >50k   | ❌  | ✅ CFO | 📝          | ❌               | ❌               | ❌          |
| View           | ✅  | ✅     | ✅ (branch) | ✅ (dept)        | ✅ own           | 👁 accepted |

### HR (Employee + Payroll)

| Action              | L1  | L2 (CHRO) | L3 (BM) | L4 (hr_sup) | L5 (hr_officer) |
| ------------------- | --- | --------- | ------- | ----------- | --------------- |
| Create employee     | ❌  | ✅        | 📝      | ❌          | ✅              |
| Terminate           | ❌  | 📝        | 📝      | ❌          | 📝              |
| Edit salary         | ❌  | ✅        | 📝      | ❌          | 📝              |
| Approve leave (<5d) | ❌  | ❌        | ❌      | ✅          | ❌              |
| Approve leave (≥5d) | ❌  | ✅        | ✅      | 📝          | ❌              |
| Run payroll         | ❌  | ✅        | ✅      | 📝          | ❌              |
| Disburse payroll    | ❌  | ✅        | 📝      | ❌          | ❌              |

### Document + Report

| Action            | L1    | L2       | L3       | L4  | L5          | L6                |
| ----------------- | ----- | -------- | -------- | --- | ----------- | ----------------- |
| Upload (clinical) | ❌    | ❌       | ✅       | ✅  | ✅ caseload | 🟡 own record     |
| Sign (Nafath)     | ❌    | ✅       | ✅       | ✅  | ✅ own      | ✅ own (guardian) |
| Approve report    | ❌    | ✅       | ✅       | ✅  | ❌          | ❌                |
| Export PHI        | 📝 BG | 🟡 audit | 🟡 audit | ❌  | ❌          | 👁 own            |
| Delete            | ❌    | ❌       | ❌       | ❌  | ❌          | ❌                |

---

## 4. Data Scoping Rules (قواعد النطاق)

### 4.1 قواعد مشتركة

1. **Every operational entity carries `branchId`.** Exceptions listed in `TENANT_EXCLUDED_MODELS` (Users, Branches, System).
2. **Every clinical entity carries `confidentialityLevel`** ∈ `{normal, sensitive, restricted}`. Sensitive writes require MFA. Restricted writes require DPO approval.
3. **Every financial entity carries `materialityTier`** ∈ `{<1k, 1k-10k, 10k-50k, 50k-100k, >100k}` to route approval chains.

### 4.2 Visibility Rules by Level

| Level           | Default Visibility                                                         |
| --------------- | -------------------------------------------------------------------------- |
| **L1**          | All branches (emergency context) — reads audited, writes break-glass       |
| **L2**          | All branches, read-everything, write with justification + audit            |
| **L3**          | Single branch — full read, write constrained by department scope           |
| **L4**          | Department within branch — full read/write on own dept                     |
| **L5 clinical** | Caseload (resource.caseTeam ∋ user.id OR assignedTherapistId=user.id)      |
| **L5 support**  | Branch (receptionist sees all beneficiaries; accountant sees all invoices) |
| **L6**          | Own record (ownerId/beneficiaryId ∈ user.linkedBeneficiaries)              |

### 4.3 Special-Case Visibility

| Case                   | Rule                                                                            |
| ---------------------- | ------------------------------------------------------------------------------- |
| Sensitive flag         | MFA-verified + trusted-device required — see `sensitive-clinical-access` policy |
| Sealed record (legal)  | Visible only to `super_admin` + `compliance_officer` + L2 explicit grant        |
| Discharged beneficiary | Visible with `scope:historical` permission; PHI masked unless justified         |
| Beneficiary under 14   | Guardian consent required for secondary uses (research/marketing)               |
| Employee disciplinary  | Visible only to CHRO + branch_manager, not peers                                |

### 4.4 View-Only Paths (قراءة فقط)

- External auditors → read-only snapshot + redacted export.
- External inspectors → time-boxed read via special short-lived token.
- Family support (L6) → read-only on ward's progress summary + schedule.

---

## 5. Approval Chains (سلاسل الاعتماد)

### 5.1 Engine شروط

- Each approvable resource declares its chain (stored or derived from materiality tier).
- Chain consists of ordered steps: `{ role, branchScope, dueHours, canDelegate }`.
- A step approves when any one user matching the role approves within `dueHours`.
- Auto-escalate on breach → upper level + compliance notification.
- Reject at any step returns to the previous step (or initiator).

### 5.2 معايير الاعتماد الثمانية

| #        | Scenario                   | Chain                                                                                      |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| **A-01** | IRP activation             | therapist → clinical_supervisor → branch_manager → (CMO if complex case) → guardian_nafath |
| **A-02** | IRP termination (early)    | clinical_supervisor → branch_manager → hq_cmo                                              |
| **A-03** | Clinical report release    | therapist_author → clinical_supervisor → (guardian via portal ack)                         |
| **A-04** | Beneficiary discharge      | clinical_supervisor → branch_manager → (HO if disputed)                                    |
| **A-05** | Cross-branch transfer      | receiving branch_manager → sending branch_manager → head_office_admin                      |
| **A-06** | Leave request              | <5d: hr_supervisor · 5-14d: + branch_manager · >14d: + hq_chro                             |
| **A-07** | Invoice cancellation       | <1k: accountant own-sign · 1k-10k: branch_manager · >10k: hq_cfo                           |
| **A-08** | Purchase order             | <5k: finance_supervisor · 5k-50k: branch_manager · >50k: hq_cfo                            |
| **A-09** | Contract (vendor)          | procurement_officer → branch_manager → (hq_cfo >100k) → (legal)                            |
| **A-10** | Employee termination       | hr_officer → branch_hr_manager → branch_manager → hq_chro                                  |
| **A-11** | Salary change              | hr_officer → branch_hr_manager → hq_chro                                                   |
| **A-12** | Policy publication         | compliance_officer → hq_cqo → legal → publish                                              |
| **A-13** | Data subject request (DSR) | received → dpo verifies identity → department gathers data → dpo fulfills                  |
| **A-14** | Expense reimbursement      | employee → manager → finance_supervisor → accountant pays                                  |
| **A-15** | CAPA closure               | owner → quality_officer → hq_cqo                                                           |

### 5.3 Delegation Rules

- A role X may delegate its step to role Y if `canDelegate: true` AND Y.level ≤ X.level.
- Delegation stored with effective period + original approver.
- Audit both the delegation grant and each use.

### 5.4 Timeouts / SLA

| Tier     | SLA | On breach                                      |
| -------- | --- | ---------------------------------------------- |
| Routine  | 72h | Reminder + escalate to next level              |
| Urgent   | 24h | Auto-alert + Slack/SMS                         |
| Critical | 4h  | Auto-alert + page on-call + break-glass option |

---

## 6. Segregation of Duties (SoD)

### 6.1 Core SoD Rules

The platform enforces that no single user performs two conflicting duties on the same resource or transaction.

| Pair                                             | Rule             |
| ------------------------------------------------ | ---------------- |
| Invoice creator ≠ Invoice approver               | Finance          |
| PO drafter ≠ PO approver                         | Finance          |
| Payroll runner ≠ Payroll disburser               | Finance + HR     |
| Session delivered ≠ Session billed (same person) | Clinical/Finance |
| IRP author ≠ IRP approver                        | Clinical         |
| Incident reporter ≠ Incident closer              | Quality          |
| Audit log reader ≠ Audit log writer              | Compliance       |
| Recruiter ≠ Onboarding approver of same hire     | HR               |
| Procurement officer ≠ Goods receipt confirmer    | Finance          |

### 6.2 Segregation Across Domains

| Domain            | Principle                                                                          |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Finance**       | Create, approve, pay, reconcile — all distinct users for material amounts          |
| **HR**            | Recruit, hire, manage, terminate, pay — separated                                  |
| **Clinical**      | Assess, plan, deliver, review — separated when possible; peer review for high-risk |
| **Quality**       | Report, investigate, decide CAPA, verify closure — separated                       |
| **IT / Platform** | System admin ≠ data access admin; both audited                                     |

### 6.3 Enforcement

- A `sodRegistry` declares forbidden `(action, resource)` pairs per user per transaction.
- ABAC policy `segregation-of-duties` checks at decision time.
- Escalation request required to override (with audit + compliance notify).

---

## 7. Emergency Access / Break-Glass Policy

### 7.1 When allowed

- Medical emergency (beneficiary in distress, caseload absent)
- Legal order requiring immediate disclosure
- Forensic investigation of suspected fraud
- System recovery requiring data inspection by Platform team

### 7.2 Activation Flow

```
User clicks "Emergency Access" → fills form (justification + subject + duration)
    ↓
System grants elevated scope for ≤ 4 hours
    ↓
Auto-notifies: user's manager + compliance_officer + dpo (if PHI) + super_admin
    ↓
All actions under break-glass flagged in AuditLog with severity:critical
    ↓
Within 24h: secondary approver (L2+) must co-sign a justification form
    ↓
If co-sign not received → incident raised + user's next break-glass blocked until reviewed
```

### 7.3 Scope of Elevation

- **Clinical BG** — read any beneficiary in branch, no writes.
- **Financial BG** — no writes; only read + export journal entries.
- **Platform BG** — root access to one specific collection/resource.

### 7.4 Controls

- Rate-limit: 3 break-glass uses per user per month max.
- After 3 uses, auto-escalate to compliance review.
- All break-glass actions in a separate retention tier (10 years).
- Quarterly review of all break-glass events by DPO + CQO.

---

## 8. Audit Logging & Monitoring

### 8.1 What to log

Per ADR-009, every:

- Authentication + MFA challenge
- Authorization decision (permit/deny, denying policy, matched policies)
- Read of PHI / sensitive data
- Every write (create/update/delete)
- Every export
- Role assignment + permission change
- Approval chain step (submit/approve/reject/delegate)
- Break-glass activation + expiry
- Cross-branch read by bypass roles

### 8.2 Monitoring Signals

| Signal                                     | Severity | Action                     |
| ------------------------------------------ | -------- | -------------------------- |
| Failed login > 5 in 10min from same IP     | warning  | Rate-limit IP              |
| Failed login > 5 in 10min same user        | warning  | Lock account + notify user |
| Break-glass without co-sign after 24h      | critical | Compliance review          |
| Cross-branch read > N standard dev by user | warning  | Manager review             |
| PHI export by non-clinical user            | warning  | Compliance review          |
| Role assignment outside business hours     | info     | Log only                   |
| DSR overdue                                | warning  | DPO alert                  |
| SoD violation attempt                      | critical | Deny + alert               |

### 8.3 Retention

- Auth + ABAC decision logs: 7 years
- PHI access logs: 15 years (MoH)
- Break-glass logs: 10 years
- Backup & tamper-evident chain check daily

---

## 9. Edge Cases (حالات حدية بين الفروع والـ HQ)

| #        | Case                                                 | Resolution                                                                              |
| -------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **E-01** | Beneficiary seen at 2 branches simultaneously        | Primary branch owns record; secondary creates "referral" + shared read, no parallel IRP |
| **E-02** | Employee transferred mid-month                       | Payroll pro-rated by branch; HR file transfers on effective date                        |
| **E-03** | Therapist covers another branch for a week           | Temporary branch delegation record + audit; caseload reads scoped via delegation        |
| **E-04** | Incident involves staff from 2 branches              | Dual-branch incident; both branch_managers + hq_cqo on investigation                    |
| **E-05** | HQ policy conflicts with branch-local SOP            | HQ prevails; branch may request exception via approval chain                            |
| **E-06** | Duplicate national IDs across branches               | System-wide unique key prevents; merge workflow available                               |
| **E-07** | Branch license expired mid-session                   | Block new sessions at that branch; active sessions complete + relocate for future       |
| **E-08** | Cross-branch bulk report requested                   | Requires L2 role; report generated with per-branch breakdown + masking                  |
| **E-09** | User role changes mid-approval                       | Current step proceeds with snapshotted role; audit notes change                         |
| **E-10** | Guardian disputes release of IRP to school           | Legal hold flag → freeze reads until resolved; dpo + compliance manage                  |
| **E-11** | Night shift receptionist needs limited clinical view | Time-based role: `night_receptionist_clinical_view` active 22:00–06:00 only             |
| **E-12** | Vendor portal user needs temporary elevated view     | Short-lived token (48h) + scope-limited                                                 |

---

## 10. Implementation Pattern (Backend)

### 10.1 Layered Enforcement

```
┌────────────────────────────────────────────────┐
│ Route Middleware (per-route)                   │
│   authenticateToken → RBAC → ABAC (enforce)    │
└────────────┬───────────────────────────────────┘
             │
┌────────────▼───────────────────────────────────┐
│ Service Layer                                  │
│   Domain logic + sodCheck() + approvalState()  │
└────────────┬───────────────────────────────────┘
             │
┌────────────▼───────────────────────────────────┐
│ Data Layer                                     │
│   Mongoose plugin: branchScope auto-filter     │
│   + consentCheck() for consent-based purposes  │
└────────────────────────────────────────────────┘
```

### 10.2 Decision Flow (single request)

```
  Request
     │
     ▼
  Authenticate (JWT + MFA state)
     │
     ▼
  RBAC gate (permission in roles[].permissions)         ❌ → 403
     │ ✅
     ▼
  ABAC evaluate (all applicable policies, deny-overrides) ❌ → 403 + audit
     │ ✅
     ▼
  SoD check (this user not forbidden from this action on this resource) ❌ → 409 + audit
     │ ✅
     ▼
  Approval-chain state (for write actions that need approval)
     │
     ├── Requires approval & not pending → create approval request → 202
     ├── Approval already granted → proceed
     └── Step awaiting current user → record approval, proceed or forward
     ▼
  Data layer (branchScope plugin auto-scopes queries)
     │
     ▼
  Write audit log (success/failure, reason, decision details)
     │
     ▼
  Response
```

### 10.3 DB Pattern

- **User** — `{ id, roles[], defaultBranchId, accessibleBranches[], delegations[], notificationPrefs, mfaEnrolled }`
- **Role** — `{ id (canonical), level, permissions[] }` (stored in constants, not a collection yet)
- **Delegation** — `{ fromUser, toUser, roles[], branchIds[], effectiveFrom, effectiveTo, reason }`
- **ApprovalRequest** — `{ resourceType, resourceId, chain[], currentStep, decisions[], status }`
- **BreakGlassSession** — `{ userId, purpose, scope, startedAt, expiresAt, coSignRequiredBy, coSignedAt, coSignedBy }`
- **SodRule** — static registry; `{ id, forbiddenActions[], conflictingRoles[] }`
- **AuditLog** — per ADR-009

### 10.4 Policy Catalog (ABAC)

Currently implemented (see [backend/authorization/abac/policies/](../../backend/authorization/abac/policies/)):

- `caseload-access`
- `cross-branch-access`
- `guardian-own-child`
- `session-amendment-window`
- `sensitive-clinical-access`

**New policies (this design):**

- `record-ownership` — "user can edit a record only if they created it" (for drafts, within time window)
- `regional-scope` — L3 scoped to user's default branch unless explicit multi-branch assignment
- `sod-conflict` — deny if the current action is listed in SodRegistry as conflicting with a prior action by same user on same resource
- `approval-authority` — deny write if the action requires approval and caller isn't the current step's approver
- `break-glass-active` — permit elevated reads while a valid BreakGlassSession exists for this user
- `confidentiality-level` — deny writes to `restricted` records unless DPO approved

---

## 11. Security Risks Specific to IAM

| #         | Risk                                         | Control                                                          |
| --------- | -------------------------------------------- | ---------------------------------------------------------------- |
| **SR-01** | Privilege escalation via role assignment bug | Approval chain for role changes + audit every change             |
| **SR-02** | Compromised admin account                    | MFA mandatory L1-L2 + session time-boxed + break-glass audit     |
| **SR-03** | Cross-branch leak                            | Automated integration tests per new model + canary tests in prod |
| **SR-04** | SoD bypass via "just this once"              | Deny by default + manual override requires dual approval         |
| **SR-05** | Break-glass overuse                          | Rate limit + quarterly review                                    |
| **SR-06** | Stale delegations                            | Auto-expire + daily sweep cron                                   |
| **SR-07** | Orphan accounts (terminated employees)       | HR offboarding saga disables account + rotates keys              |
| **SR-08** | Vendor portal access persists post-contract  | Contract lifecycle → account disable                             |
| **SR-09** | External auditor tokens reused               | One-time tokens + IP pinning                                     |
| **SR-10** | Record-level bypass via direct Mongo access  | Lint rule forbids `collection.*` in services; mongoose-only      |

---

## 12. Recommended Enforcement Pattern

### 12.1 Per-route wiring (Node/Express example)

```js
const { enforce } = require('../authorization/abac');
const { rbac } = require('../middleware/rbac');
const { sodCheck } = require('../authorization/sod');
const { approvalGuard } = require('../authorization/approvals');

router.post('/irp/:id/approve',
  authenticateToken,
  rbac({ permission: 'irp:approve' }),                          // RBAC baseline
  enforce({ action: 'approve', resourceType: 'IRP', ... }),     // ABAC context
  sodCheck({ action: 'approve', resourceKey: (req) => req.params.id }),
  approvalGuard({ chain: 'A-01', step: 'clinical_supervisor' }),
  controllers.approveIrp,
);
```

### 12.2 Data-layer plugin

```js
// Mongoose schema plugin attached at boot for every tenanted model
schema.pre(/^find/, function () {
  const { branchId, role } = getAsyncContext();
  if (!TENANT_BYPASS_ROLES.includes(role)) {
    this.where({ branchId });
  }
});
```

### 12.3 Field-level masking (views)

```js
function maskPhi(record, user) {
  if (!hasLevel(user.roles, 4)) return { ...record, diagnosis: '***', medications: '***' };
  return record;
}
```

### 12.4 Audit wrapper

```js
withAudit('irp:approve', async req => {
  const irp = await service.approve(req.params.id, req.user);
  return { resourceType: 'IRP', resourceId: irp._id, scope: 'branch', severity: 'notice' };
});
```

---

## 13. Migration Plan

| Phase       | Deliverable                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ **Done** | 6-level role hierarchy + 5 ABAC policies + tenant isolation + audit baseline                                                          |
| **P1**      | 6 additional policies (record-ownership, regional-scope, sod-conflict, approval-authority, break-glass-active, confidentiality-level) |
| **P1**      | ApprovalChain engine + 15 configured chains                                                                                           |
| **P1**      | Break-glass module + rate limit + auto-expire                                                                                         |
| **P2**      | Delegation model + UI + auto-expire sweep                                                                                             |
| **P2**      | SoD registry + runtime check                                                                                                          |
| **P2**      | Audit dashboards per severity tier                                                                                                    |
| **P3**      | Anomaly detection (ML on access patterns)                                                                                             |

---

## 14. Acceptance Criteria

- [ ] 100% of operational models carry `branchId`
- [ ] 0 routes without `authenticateToken` + one of (RBAC, ABAC, or explicit `public:` tag)
- [ ] Break-glass used < 10 times/month system-wide
- [ ] Every approval chain step has an SLA + escalation path
- [ ] Quarterly SoD review with 0 unresolved conflicts
- [ ] PDPL DSR response SLA ≥ 95% within 30 days
- [ ] Audit log integrity check passes daily (hash chain)

---

## 15. References

- [05-role-matrix.md](05-role-matrix.md) — tabular RBAC base
- [ADR-004](../architecture/decisions/004-multi-tenant-isolation-strategy.md) — multi-tenant strategy
- [ADR-005](../architecture/decisions/005-canonical-role-hierarchy.md) — role hierarchy
- [ADR-007](../architecture/decisions/007-pdpl-compliance-baseline.md) — PDPL baseline
- [ADR-009](../architecture/decisions/009-audit-trail-standard.md) — audit trail
- [backend/authorization/abac/](../../backend/authorization/abac/) — ABAC engine + policies
- [backend/config/constants/roles.constants.js](../../backend/config/constants/roles.constants.js) — canonical roles
