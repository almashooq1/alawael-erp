# 05 — Role Matrix (RBAC + ABAC) | مصفوفة الصلاحيات

> 6 مستويات صلاحيات + قواعد ABAC تكميلية

---

## 1. المستويات الستة (Role Hierarchy)

```
                        ┌─────────────────────────────────┐
  L1  SUPER_ADMIN       │ المنصة كاملة + إعدادات تقنية  │   Platform level
                        └────────────────┬────────────────┘
                                         │
                        ┌────────────────▼────────────────┐
  L2  HEAD_OFFICE_ADMIN │ كل الفروع — إشراف واستراتيجية │   Group level
      HEAD_OFFICE_*     │ (CFO, CQO, CHRO, CMO, ...)     │
                        └────────────────┬────────────────┘
                                         │
                        ┌────────────────▼────────────────┐
  L3  BRANCH_MANAGER    │ فرع واحد كامل                  │   Branch level
      BRANCH_ADMIN      │ (عمليات + تقارير + موظفون)     │
                        └────────────────┬────────────────┘
                                         │
                        ┌────────────────▼────────────────┐
  L4  CLINICAL_SUPER-   │ قسم إكلينيكي داخل فرع         │   Department level
      VISOR             │ (فريق معالجين، IRPs، جودة)    │
                        └────────────────┬────────────────┘
                                         │
                        ┌────────────────▼────────────────┐
  L5  THERAPIST         │ حالات مُسندة (caseload)        │   Professional level
      SPECIALIST        │ + زملاء الفريق + الموارد      │
      (+ support)       │                                 │
                        └────────────────┬────────────────┘
                                         │
                        ┌────────────────▼────────────────┐
  L6  PARENT            │ بيانات شخصية فقط (portal)     │   Self-service level
      GUARDIAN          │ (مستفيدهم أو أنفسهم)          │
      STUDENT           │                                 │
                        └─────────────────────────────────┘
```

---

## 2. التعريف التفصيلي لكل دور

### L1 — SUPER_ADMIN (مدير المنصة)

**المسؤولية:** مسؤول تقني مطلق. إعدادات المنصة، تكاملات، مخازن البيانات، المفاتيح، الصيانة.

**الأنشطة الجوهرية:**

- إدارة الفروع (إنشاء، تعطيل)
- إدارة التكاملات الحكومية (ZATCA certs, Nafath keys)
- Backup & Restore
- Feature flags
- إدارة المستخدمين الإداريين (L2)

**القيود:**

- لا يدخل بيانات PHI تشغيلية بدون تفعيل "Emergency Clinical Access" (مع audit مكثّف).
- كل أفعاله مُسجَّلة بـ MFA + audit trail.

### L2 — HEAD*OFFICE_ADMIN + HEAD_OFFICE*\* (إدارة المقر الرئيسي)

أنماط دقيقة:
| الدور | المسؤولية |
|------|-----------|
| `head_office_admin` | إدارة عامة إشرافية |
| `head_office_ceo` | تنفيذي أول — رؤية كاملة استراتيجية |
| `head_office_cfo` | مالية مجمّعة |
| `head_office_cqo` | جودة وامتثال |
| `head_office_chro` | موارد بشرية |
| `head_office_cmo` | طبي/إكلينيكي مجمّع |

**الأنشطة:**

- لوحة قيادة تنفيذية عبر الفروع
- تقارير مجمّعة (مالية، إكلينيكية، جودة)
- الموافقة على قرارات cross-branch
- اعتماد السياسات
- إدارة مديري الفروع (L3)

**القيود:**

- القراءة مسموحة عبر الفروع، الكتابة تحتاج "مبرر" + audit.

### L3 — BRANCH_MANAGER + BRANCH_ADMIN (إدارة الفرع)

**المسؤولية:** فرع واحد من الألف للياء.

**الأنشطة:**

- إدارة طاقم الفرع (L4, L5)
- الموافقة على خطط التأهيل قبل التنفيذ
- تقارير الفرع الشهرية/الربعية
- ميزانية الفرع
- حل الشكاوى المُصعَّدة

### L4 — CLINICAL_SUPERVISOR (مشرف إكلينيكي)

**المسؤولية:** قسم إكلينيكي (مثلاً: قسم النطق، قسم ABA).

**الأنشطة:**

- Caseload assignment للمعالجين
- مراجعة واعتماد IRPs
- Peer review للسجلات الإكلينيكية
- KPIs القسم
- التدريب والتطوير المهني للفريق

### L5 — THERAPIST / SPECIALIST / SUPPORT

أنماط:
| الدور | نطاق |
|------|------|
| `therapist` | معالج (ABA, PT, OT, Speech...) |
| `doctor` | طبيب — يوقّع على التشخيصات والأدوية |
| `teacher` | معلم تربية خاصة |
| `nurse` | ممرض/ة |
| `social_worker` | أخصائي اجتماعي |
| `psychologist` | أخصائي نفسي |
| `receptionist` | استقبال — جدولة + دفع |
| `data_entry` | إدخال بيانات |
| `hr` | موارد بشرية تنفيذي |
| `accountant` | محاسب — فاتورة + قبض |

**الأنشطة:**

- رؤية حالاته فقط (caseload)
- توثيق الجلسات
- إضافة قياسات التقدم
- التواصل مع أولياء الأمور عبر البوابة

### L6 — PARENT / GUARDIAN / STUDENT / SUPPORT

**المسؤولية:** بوابات self-service.

**الأنشطة:**

- عرض تقدم المستفيد
- جدولة/إلغاء مواعيد
- دفع الفواتير
- محادثة مع الفريق
- رفع وثائق
- تقييم الخدمة (استطلاعات)

**القيود:**

- بياناتهم فقط.
- لا قراءة بيانات مستفيدين آخرين.
- لا تعديل بيانات إكلينيكية.

---

## 3. مصفوفة RBAC (موارد × أدوار × أفعال)

**الرموز:** ✅ كامل | 🟡 مشروط (ABAC) | 👁 قراءة فقط | 📝 كتابة مع approval | ❌ ممنوع

### Resource: Beneficiary

| Action          | L1  | L2  | L3              | L4            | L5                          | L6              |
| --------------- | --- | --- | --------------- | ------------- | --------------------------- | --------------- |
| List (branch)   | ✅  | ✅  | ✅ (own branch) | ✅ (own dept) | 🟡 (caseload only)          | ❌              |
| Read profile    | ✅  | ✅  | ✅              | ✅            | 🟡 (caseload only)          | 🟡 (own record) |
| Create          | ❌  | 📝  | ✅              | ✅            | ❌                          | ❌              |
| Update personal | ❌  | 📝  | ✅              | ❌            | ❌                          | ❌              |
| Update clinical | ❌  | ❌  | 🟡              | ✅            | 🟡 (caseload, no diagnosis) | ❌              |
| Discharge       | ❌  | 📝  | 📝              | 📝            | ❌                          | ❌              |
| Transfer branch | ❌  | ✅  | 📝              | ❌            | ❌                          | ❌              |
| Hard Delete     | ❌  | ❌  | ❌              | ❌            | ❌                          | ❌              |

### Resource: Assessment

| Action          | L1  | L2  | L3  | L4  | L5                 | L6       |
| --------------- | --- | --- | --- | --- | ------------------ | -------- |
| List            | ✅  | ✅  | ✅  | ✅  | 🟡 (caseload)      | 👁 (own) |
| Create          | ❌  | ❌  | ❌  | ✅  | ✅                 | ❌       |
| Sign & finalize | ❌  | ❌  | ❌  | ✅  | ✅ (own performer) | ❌       |
| Amend           | ❌  | ❌  | ❌  | 📝  | 📝 (own + <24h)    | ❌       |
| Read            | ✅  | ✅  | ✅  | ✅  | 🟡 (caseload)      | 👁 (own) |

### Resource: IRP

| Action       | L1  | L2  | L3  | L4  | L5               | L6               |
| ------------ | --- | --- | --- | --- | ---------------- | ---------------- |
| Create draft | ❌  | ❌  | ❌  | ✅  | ✅ (then submit) | ❌               |
| Approve      | ❌  | ❌  | 🟡  | ✅  | ❌               | ❌               |
| Amend active | ❌  | ❌  | ❌  | ✅  | 📝               | ❌               |
| Terminate    | ❌  | 📝  | 📝  | ✅  | ❌               | ❌               |
| View         | ✅  | ✅  | ✅  | ✅  | 🟡               | 👁 (own's child) |

### Resource: Session

| Action         | L1  | L2  | L3  | L4  | L5                              | L6                           |
| -------------- | --- | --- | --- | --- | ------------------------------- | ---------------------------- |
| Schedule       | ❌  | ❌  | ✅  | ✅  | ✅ (own)                        | 🟡 (reschedule within rules) |
| Cancel         | ❌  | ❌  | ✅  | ✅  | 🟡 (own, >24h)                  | 🟡 (>24h)                    |
| Start/Complete | ❌  | ❌  | ❌  | ❌  | ✅ (assigned)                   | ❌                           |
| Add notes      | ❌  | ❌  | ❌  | ✅  | ✅ (assigned)                   | ❌                           |
| View notes     | ✅  | ✅  | 🟡  | ✅  | 🟡 (own or colleague w/ reason) | ❌                           |

### Resource: Invoice

| Action             | L1  | L2  | L3  | L4  | L5 (accountant) | L6       |
| ------------------ | --- | --- | --- | --- | --------------- | -------- |
| Create             | ❌  | 📝  | ✅  | ❌  | ✅              | ❌       |
| Issue (final)      | ❌  | 📝  | ✅  | ❌  | ✅              | ❌       |
| Edit post-issue    | ❌  | 📝  | ❌  | ❌  | ❌              | ❌       |
| Cancel/Credit note | ❌  | 📝  | 📝  | ❌  | 📝              | ❌       |
| Pay                | ❌  | ❌  | ✅  | ❌  | ✅              | ✅ (own) |
| View               | ✅  | ✅  | ✅  | ❌  | ✅ (branch)     | 👁 (own) |

### Resource: Employee

| Action          | L1  | L2 (CHRO) | L3              | L4            | L5 (HR)     | L6                    |
| --------------- | --- | --------- | --------------- | ------------- | ----------- | --------------------- |
| List            | ✅  | ✅        | ✅ (own branch) | 👁 (own dept) | ✅ (branch) | ❌                    |
| Create          | ✅  | ✅        | 📝              | ❌            | ✅          | ❌                    |
| Terminate       | ❌  | 📝        | 📝              | ❌            | 📝          | ❌                    |
| Edit salary     | ❌  | ✅        | 📝              | ❌            | 📝          | ❌                    |
| View own record | —   | —         | —               | —             | —           | ✅ (via self-service) |

### Resource: CPE Record (SCFHS credit hours)

| Action                   | L1  | L2 (CHRO) | L3          | L4 (clinical sup.) | L5 (HR) | L6  |
| ------------------------ | --- | --------- | ----------- | ------------------ | ------- | --- |
| List / filter            | ✅  | ✅        | ✅ (branch) | 👁 (peer review)   | ✅      | ❌  |
| View own summary         | —   | —         | —           | ✅ (own)           | ✅      | ❌  |
| Create                   | ✅  | ✅        | ❌          | ❌                 | ✅      | ❌  |
| Patch (fix typos)        | ✅  | ✅        | ❌          | ❌                 | ✅      | ❌  |
| Verify (flip `verified`) | ✅  | ✅        | ❌          | ❌                 | ✅      | ❌  |
| Delete                   | ✅  | ✅        | ❌          | ❌                 | ✅      | ❌  |
| Overview + soon-expiring | ✅  | ✅        | ✅ (branch) | 👁 (own team)      | ✅      | ❌  |
| CSV export for audit     | ✅  | ✅        | 📝          | 📝                 | ✅      | ❌  |

- Verify is intentionally HR-only — credits only count toward
  SCFHS renewal once HR has reviewed the proof. Clinical supervisors
  can see what's pending but cannot self-certify credits for staff they
  supervise (conflict of interest).
- PATCH strips `verified` / `verifiedBy` / `verifiedAt` server-side so
  the audit trail on verification stays honest even with write access.
- L4 peer-review access is read-only (`👁`) — used for case reviews
  where supervisors reference the therapist's CPE history.

### Resource: Attendance (Employee self)

| Action       | L5       | L6                     |
| ------------ | -------- | ---------------------- |
| Check-in/out | ✅ (own) | ❌                     |
| View own     | ✅       | ✅ (guardian sees own) |

### Resource: Branch

| Action    | L1  | L2  | L3           | L4       | L5       | L6  |
| --------- | --- | --- | ------------ | -------- | -------- | --- |
| Create    | ✅  | 📝  | ❌           | ❌       | ❌       | ❌  |
| Configure | ✅  | ✅  | 🟡 (limited) | ❌       | ❌       | ❌  |
| View list | ✅  | ✅  | 👁 (own)     | 👁 (own) | 👁 (own) | ❌  |

### Resource: Report (Executive)

| Action               | L1  | L2       | L3  | L4  | L5  | L6  |
| -------------------- | --- | -------- | --- | --- | --- | --- |
| Group-wide financial | ✅  | ✅ (CFO) | ❌  | ❌  | ❌  | ❌  |
| Group-wide clinical  | ✅  | ✅ (CMO) | ❌  | ❌  | ❌  | ❌  |
| Branch KPIs          | ✅  | ✅       | ✅  | 🟡  | ❌  | ❌  |
| Department KPIs      | ✅  | ✅       | ✅  | ✅  | ❌  | ❌  |
| Own performance      | —   | —        | —   | —   | ✅  | 🟡  |

### Resource: Incident

| Action      | L1  | L2                   | L3          | L4        | L5            | L6                                   |
| ----------- | --- | -------------------- | ----------- | --------- | ------------- | ------------------------------------ |
| Report      | ✅  | ✅                   | ✅          | ✅        | ✅            | 🟡 (guardian reports against branch) |
| Investigate | ❌  | 🟡 (group incidents) | ✅          | ✅        | ❌            | ❌                                   |
| Close       | ❌  | ✅                   | ✅          | 🟡        | ❌            | ❌                                   |
| View        | ✅  | ✅                   | ✅ (branch) | ✅ (dept) | 👁 (involved) | ❌                                   |

### Resource: Complaint

| Action   | L1  | L2  | L3  | L4  | L5            | L6  |
| -------- | --- | --- | --- | --- | ------------- | --- |
| File     | ✅  | ✅  | ✅  | ✅  | ✅            | ✅  |
| Assign   | ❌  | ✅  | ✅  | ✅  | ❌            | ❌  |
| Resolve  | ❌  | ✅  | ✅  | ✅  | ✅ (assigned) | ❌  |
| Escalate | ❌  | ✅  | ✅  | ✅  | ✅            | ✅  |

### Resource: Document (Clinical)

| Action          | L1  | L2  | L3  | L4  | L5            | L6              |
| --------------- | --- | --- | --- | --- | ------------- | --------------- |
| Upload          | ❌  | ❌  | ❌  | ✅  | ✅ (caseload) | 🟡 (own record) |
| Read            | ✅  | ✅  | ✅  | ✅  | 🟡 (caseload) | 👁 (own)        |
| Sign (clinical) | ❌  | ❌  | ❌  | ✅  | ✅ (own)      | ❌              |
| Sign (consent)  | ❌  | ❌  | ❌  | ❌  | ❌            | ✅ (guardian)   |

---

## 4. ABAC — الشروط السياقية

عند عدم كفاية RBAC وحدها، نضيف قواعد ABAC (Attribute-Based Access Control):

### خصائص الموضوع (Subject Attributes)

- `user.roles[]`
- `user.defaultBranchId`
- `user.accessibleBranches[]`
- `user.department`
- `user.employmentStatus`
- `user.mfaVerified`
- `user.lastLoginAt`

### خصائص المورد (Resource Attributes)

- `resource.branchId`
- `resource.ownerId`
- `resource.assignedTherapistId`
- `resource.caseTeam[]`
- `resource.confidentialityLevel` (e.g., 'normal', 'sensitive', 'restricted')
- `resource.status`
- `resource.createdAt` (age)

### خصائص العمل (Action Attributes)

- `action.type`
- `action.purpose` (e.g., 'treatment', 'billing', 'audit')

### خصائص البيئة (Environment)

- `env.time` (business hours, emergency)
- `env.ipAddress` (internal vs external)
- `env.deviceTrust` (corp-managed vs BYOD)

### قواعد ABAC مُقترحة

```yaml
# Rule 1: Caseload Access
rule: "therapist-caseload-read"
when:
  subject.role includes "therapist"
  action.type == "read"
  resource.type in ["Beneficiary", "IRP", "Session"]
then:
  allow only if: resource.assignedTherapistId == subject.userId
               OR subject.userId in resource.caseTeam[]

# Rule 2: Cross-branch supervision
rule: "head-office-cross-branch"
when:
  subject.role includes "head_office_*"
  action.type == "read"
then:
  allow across branches
  audit: always

# Rule 3: Session amendment time window
rule: "session-amendment-window"
when:
  action.type == "update"
  resource.type == "SessionNote"
  resource.status == "finalized"
then:
  allow only if: (env.time - resource.signedAt) < 24h
                AND subject.userId == resource.signedBy
                AND reason provided
  else: requires supervisor approval

# Rule 4: Sensitive clinical access
rule: "sensitive-clinical"
when:
  resource.confidentialityLevel == "sensitive"
then:
  require: subject.mfaVerified
  require: env.deviceTrust in ["corp-managed"]
  require: action.purpose provided
  audit: always + notify compliance

# Rule 5: Guardian reads own child only
rule: "guardian-own-child"
when:
  subject.role == "parent"
  resource.type == "Beneficiary"
then:
  allow only if: resource.id in subject.linkedBeneficiaries[]

# Rule 6: Emergency override
rule: "emergency-access"
when:
  subject.role in [L1, L2] AND
  emergency_flag == true
then:
  allow wider scope
  require: reason + supervisor co-signs within 24h
  alert: immediate email to compliance + CISO
```

---

## 5. Approval Workflow Matrix

| Action                           | Requester                | Approver               | Optional Second              |
| -------------------------------- | ------------------------ | ---------------------- | ---------------------------- |
| Beneficiary transfer branch      | L3/L4                    | L2 (head office admin) | L3 (receiving branch)        |
| IRP approval                     | L4 (clinical supervisor) | L3 (branch manager)    | L2 (CMO — for complex cases) |
| Contract > 100k SAR              | L3 (accountant)          | L2 (CFO)               | —                            |
| Invoice cancellation post-issue  | L3/L5 (accountant)       | L3 (branch manager)    | L2 (CFO if > 10k)            |
| Employee termination             | L5 (HR)                  | L3                     | L2 (CHRO)                    |
| Employee salary change           | L5 (HR)                  | L2 (CHRO)              | —                            |
| Policy publication               | L2                       | L1 (platform)          | Legal review                 |
| Cross-branch delegation          | L3 (receiving)           | L2 (head office)       | —                            |
| Audit access to sensitive record | Any                      | L1 (super admin)       | Compliance officer           |

---

## 6. Temporary Elevation (Break-Glass)

بعض المواقف الحرجة تستدعي صلاحيات مؤقتة:

```yaml
break-glass:
  trigger: user requests "emergency access" with reason
  duration: 4 hours max
  required:
    - MFA challenge
    - Written justification
    - Manager auto-notification
    - Compliance officer auto-notification
  post-use:
    - All actions audited separately
    - Post-incident review within 48h
    - Auto-expire
```

---

## 7. ABAC Engine Implementation Outline

```
┌─────────────────────────┐
│ Policy Store (YAML)     │  مصدر الحقيقة
│ /config/abac-policies/  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Policy Compiler         │  تحويل YAML → optimized rules
│ (startup time)          │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Policy Decision Point   │  evaluate(subject, action, resource, env)
│ (PDP)                   │
│ - cache hot rules       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Policy Enforcement      │  middleware hook
│ Points (PEP)            │
│ - on route entry        │
│ - on query filter       │
│ - on field access       │
└─────────────────────────┘
```

**هل نبني أم نشتري؟**

- الأبسط: قواعد مخصصة باستخدام JSON + مقيم بسيط.
- الأقوى: [Open Policy Agent (OPA)](https://www.openpolicyagent.org/) مع Rego.
- **توصية:** ابدأ بالقواعد المخصصة (إنجاز أسرع)، ثم هاجر لـ OPA في P3 إذا تعقدت القواعد.

---

## 8. التنفيذ الحالي مقابل المستهدف

| البند              | الحالي                                | المستهدف              | فجوة                    |
| ------------------ | ------------------------------------- | --------------------- | ----------------------- |
| Roles              | 19 dispersed (config/constants/roles) | 6 مستويات + sub-roles | تصنيف مُعاد + hierarchy |
| Permissions        | 8 categories, 50+ perms               | 100+ perms مصنّفة     | تفصيل أكثر + API-level  |
| ABAC               | غير موجود                             | مطلوب بالكامل         | P1 build                |
| Approval Workflows | موجودة جزئياً                         | 10 approval paths     | اكمال المصفوفة          |
| Break-Glass        | غير موجود                             | مطلوب                 | P1 build                |
| Audit per access   | جزئي                                  | كل access حساس        | تحسين coverage          |

---

## 9. التالي

- **[06-workflows.md](06-workflows.md)** — تدفقات العمل المنهجية.
- **[08-risks-controls.md](08-risks-controls.md)** — كيف نضبط المخاطر.
