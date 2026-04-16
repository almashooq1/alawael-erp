# 06 — Workflow Map | خريطة التدفقات

> رحلات end-to-end للمستفيد + Approval Workflows الأساسية

---

## 1. رحلة المستفيد End-to-End (Beneficiary Journey)

### المراحل السبع

```
  [1]            [2]             [3]              [4]              [5]              [6]              [7]
 إحالة   ───▶   قبول   ───▶   تقييم   ───▶   خطة IRP   ───▶   جلسات   ───▶   مراجعة   ───▶   إنهاء
Referral      Intake      Assessment        Plan          Delivery        Review       Discharge
                                                          (cyclic)        (cyclic)
```

### 1.1 المرحلة 1 — الإحالة (Referral)

**Actors:** External physician / Self / External org / Internal branch

**Steps:**

1. تقديم إحالة عبر إحدى القنوات:
   - نموذج عام (public form) على `public.alawael.sa/intake`
   - إحالة مباشرة من طبيب عبر API/portal
   - مكالمة واردة → receptionist يدخلها
2. إنشاء `Referral` record (status: `pending`)
3. نظام إشعار auto → مدير الفرع + clinical supervisor
4. تحقق أولي من الاستحقاق (branch accepts this disability type? capacity?)

**Exit criteria:** قبول/رفض/تحويل

**Events:** `ReferralCreated`

**Timeline SLA:** استجابة خلال 48 ساعة

### 1.2 المرحلة 2 — القبول (Intake/Admission)

**Actors:** Receptionist, Branch Manager, Social Worker, Clinical Supervisor

**Steps:**

1. موعد تعريفي مع ولي الأمر (in-person أو virtual)
2. جمع المستندات:
   - هوية المستفيد + ولي الأمر (مع Yakeen verification)
   - تقرير طبي
   - تقارير تأهيل سابقة
   - بوليصة تأمين (إن وُجدت)
3. توقيع ولي الأمر على:
   - عقد الخدمة
   - نموذج الموافقات (علاجي، تصوير، بحثي، ...)
   - إخلاء طرف
4. إنشاء `Beneficiary` + `Guardian` records
5. إنشاء portal account لولي الأمر
6. إنشاء `Contract` + `PricingPlan` selection

**Exit criteria:** `admissionStatus = 'active'`

**Events:** `BeneficiaryRegistered`, `ContractSigned`

**Integrations:** Yakeen (identity), Nafath (e-sign), Wasel (insurance)

**Timeline SLA:** 5 أيام عمل من الإحالة المقبولة

### 1.3 المرحلة 3 — التقييم (Assessment)

**Actors:** Clinical Supervisor, Assigned Therapists

**Steps:**

1. Clinical Supervisor يختار:
   - Battery of assessments مناسب للعمر والإعاقة
   - الفريق الذي سيُجري التقييمات
2. جلسات تقييم مجدولة (قد تستغرق 2-4 أسابيع)
3. لكل تقييم:
   - إدخال النتائج الخام
   - الحصول على standardized scores + percentiles
   - تفسير الأخصائي
4. اجتماع متعدد التخصصات (MDT Meeting):
   - مراجعة كل التقييمات
   - الاتفاق على ملخص "Strengths & Needs"
   - توقيع كل الأخصائيين

**Exit criteria:** MDT summary finalized

**Events:** `AssessmentCompleted` (per each), `MDTMeetingHeld`

**Timeline SLA:** 3 أسابيع

### 1.4 المرحلة 4 — خطة التأهيل الفردية (IRP)

**Actors:** Clinical Supervisor (lead), Therapists, Guardian

**Steps:**

1. Clinical Supervisor يبني IRP draft في IRP Wizard:
   - Import من assessments
   - اختيار Domains للعمل (motor, communication, social, ...)
   - صياغة SMART Goals (أو اختيار من Goal Bank)
   - تحديد Programs المناسبة
   - تعيين Team members + hours/week
   - جدول نقاط المراجعة (monthly/quarterly)
2. Peer Review (optional — clinical lead من فرع آخر)
3. اجتماع IRP مع ولي الأمر:
   - عرض الخطة
   - مناقشة التوقعات
   - جمع الموافقة (signature)
4. Branch Manager approval
5. IRP → status: `active`
6. Auto-generate initial session schedule

**Exit criteria:** `IRP.status = 'active'`, signatures collected

**Events:** `IRPDraftCreated`, `IRPReviewedByPeer`, `IRPApprovedByBranch`, `IRPActivated`

**Timeline SLA:** 2 أسابيع من انتهاء التقييم

### 1.5 المرحلة 5 — تقديم الجلسات (Service Delivery — Cyclic)

**Actors:** Therapists, Receptionist, Guardians

**Daily Cycle:**

```
08:00 — موظف الاستقبال يؤكد مواعيد اليوم
       (SMS/WA تذكير لأولياء الأمور أُرسل البارحة)
       │
       ▼
09:00 — وصول مستفيد + check-in (QR code أو manual)
       │
       ▼
       Therapist يستقبل المستفيد في غرفة العلاج
       │
       ▼
       Session يبدأ (status: in_progress)
       │
       ▼
       خلال الجلسة: activities حسب goals
       │
       ▼
       انتهاء الجلسة:
       - Therapist يدخل session note
       - Progress measurements (لكل goal مُستهدف)
       - Status → completed
       │
       ▼
       Auto-trigger:
       - إنشاء invoice line item
       - تحديث progress على IRP
       - إشعار ولي الأمر (WhatsApp/App): "تمت الجلسة ✅"
       - Update BC-13 KPIs
       │
       ▼
       المستفيد → check-out → نقل/ولي أمر
```

**Events:** `AppointmentConfirmed`, `SessionStarted`, `SessionCompleted`, `ProgressMeasured`

**Exception Flows:**

- **No-show:** status = no_show → late fee policy applied → 2 no-shows في 30 يوم → alert supervisor
- **Cancellation:** ≥ 24h = مجاناً، أقل = 50% charge (per pricing plan)
- **Emergency:** clinical emergency → psych support activated + guardian contacted

### 1.6 المرحلة 6 — المراجعة الدورية (Periodic Review)

**Actors:** Clinical Supervisor + Team + Guardian

**Frequency:** الشهرية (quick) + الربعية (comprehensive) + النصف سنوية (formal MDT)

**Steps:**

1. Quick Monthly:
   - مراجعة progress measurements
   - adjust session frequency/goals if needed (minor)
2. Quarterly Comprehensive:
   - re-score الأدوات التقييمية المختارة
   - تقييم goal attainment
   - مناقشة مع ولي الأمر
   - إصدار تقرير مكتوب (PDF) → Parent Portal
3. Semi-Annual Formal MDT:
   - اجتماع فريق كامل
   - قرارات major: extend, modify, discharge, transfer
   - IRP v2, v3, ... (versioning)

**Events:** `IRPReviewed`, `ProgressReportGenerated`

### 1.7 المرحلة 7 — الإنهاء / النقل (Discharge/Transfer)

**Possible Outcomes:**

| Outcome                      | Trigger                               | Action                                              |
| ---------------------------- | ------------------------------------- | --------------------------------------------------- |
| **Discharge: Goals Met**     | أغلب الـ goals achieved               | تقرير إنهاء + توصيات متابعة + شهادة                 |
| **Discharge: Transition**    | الانتقال لسن مختلف أو نظام تعليمي عام | تقرير انتقالي + إحالة للمدرسة                       |
| **Transfer to Branch**       | طلب ولي الأمر أو سعة                  | Cross-branch transfer workflow                      |
| **Transfer External**        | حالة متخصصة خارج نطاقنا               | Referral out + handover summary                     |
| **Hold (Pause)**             | سفر، مرض طويل                         | Status: `on_hold` + preserved caseload              |
| **Termination: Non-payment** | عدم سداد > 90 يوم                     | Collections process → termination                   |
| **Termination: Behavioral**  | مخالفة شروط العقد                     | Committee review → termination                      |
| **Deceased**                 | رحمه الله                             | Dignified closure + condolences + records preserved |

**Common Steps:**

1. Discharge decision → MDT meeting + formal documentation
2. Final outcome report (signed)
3. Handover package:
   - كل التقارير
   - توصيات المتابعة
   - جهات الإحالة المُقترحة
4. Final invoice + settle balances
5. Beneficiary record → `admissionStatus = 'discharged'` (لا يُحذف)
6. Data retention policy applies (15 سنة)
7. تقييم ولي الأمر النهائي (exit survey)

**Events:** `BeneficiaryDischarged`, `FinalReportGenerated`, `ExitSurveyCompleted`

---

## 2. Approval Workflows (تدفقات الاعتماد)

### 2.1 IRP Approval Workflow

```
Therapist drafts IRP ──▶ Clinical Supervisor Review
                               │
                               ├── Approved → Branch Manager
                               │                 │
                               │                 ├── Approved → Guardian Signature
                               │                 │                  │
                               │                 │                  ├── Signed → ACTIVATED
                               │                 │                  └── Rejected → Return to Supervisor
                               │                 │
                               │                 └── Rejected → Back to Supervisor
                               │
                               └── Revisions Needed → Back to Therapist
```

### 2.2 Invoice Cancellation Workflow

```
Accountant requests cancellation ──▶ Branch Manager
                                          │
                                          ├── < 1,000 SAR → Auto-approve
                                          │
                                          ├── 1,000 - 10,000 SAR → BM approves
                                          │                          │
                                          │                          ▼
                                          │                    Cancelled + Credit Note
                                          │
                                          └── > 10,000 SAR → CFO (L2) approves
                                                                │
                                                                ▼
                                                          Cancelled + Audit Flag
```

### 2.3 Employee Onboarding Workflow

```
Recruitment → Offer Accepted → Onboarding Checklist
                                      │
   ┌──────────┬──────────┬─────────┬──┴──────┬──────────┐
   │          │          │         │         │          │
   ▼          ▼          ▼         ▼         ▼          ▼
Contract  GOSI enroll  Qiwa   Bank acct   Credentials  IT Setup
          (integration)      setup      verification   (user,
                                        (SCHS)         email, etc)
   │          │          │         │         │          │
   └──────────┴──────────┴─────────┴──┬──────┴──────────┘
                                      ▼
                              Orientation (1 week)
                                      │
                                      ▼
                            Probation (3 months)
                                      │
                                      ▼
                              Confirm / Extend / Terminate
```

### 2.4 Incident Investigation Workflow

```
Incident Reported (any user)
         │
         ▼
Auto-classify severity
         │
    ┌────┼────┐
    │    │    │
Minor │ Moderate │ Major/Catastrophic
    │    │    │
    ▼    ▼    ▼
   L4   L3   L2
 invest. invest. notify + invest.
    │    │    │
    └────┼────┘
         ▼
   Root Cause Analysis
         │
         ▼
   CAPA created
         │
         ▼
   Implementation
         │
         ▼
   Effectiveness Check
         │
         ▼
     Closure
         │
         ▼ (if regulatory)
   Report to CBAHI / MoH
```

### 2.5 Complaint Resolution Workflow

```
Complaint received
     │
     ▼
Auto-acknowledgment (SLA starts)
     │
     ▼
Triage by BC-09 module
     │
  ┌──┴──────────────────┐
  │ Priority: Critical  │ → Escalate to L3 + L2 immediately
  │                      │   SLA: 4h response, 24h resolution
  └──┬──────────────────┘
     │
     ▼
Assignment to handler
     │
     ▼
Investigation (contact complainant, gather facts)
     │
     ▼
Resolution proposal
     │
     ├── Accepted by complainant → Resolved
     │
     └── Rejected → Re-escalation → L3 → L2 → ...
                                         │
                                         ▼
                                  External Ombudsman (final)
```

---

## 3. Saga Patterns (Cross-Context Transactions)

### 3.1 "New Beneficiary" Saga

```
Step 1: BC-01 → Create User (portal account for guardian)
         ├── Success → Continue
         └── Failure → Compensate: none (not created yet), abort

Step 2: BC-12 → Verify Identity (Yakeen)
         ├── Verified → Continue
         └── Failed → Compensate: Delete User, notify intake team

Step 3: BC-03 → Create Beneficiary record
         ├── Success → Continue
         └── Failure → Compensate: Delete User

Step 4: BC-03 → Create Guardian record + link
         ├── Success → Continue
         └── Failure → Compensate: Delete Beneficiary + User

Step 5: BC-10 → Upload initial documents
         ├── Success → Continue
         └── Failure → Mark documents as "pending upload", continue

Step 6: BC-06 → Create Contract
         ├── Success → Continue
         └── Failure → Compensate: Mark Beneficiary as "pending-contract"

Step 7: BC-12 → Nafath Sign Contract
         ├── Signed → Continue
         └── Timeout (48h) → Remind, escalate to branch manager

Step 8: BC-11 → Welcome notification (email + WA)
         └── Best-effort, no compensation

COMPLETE: Beneficiary.admissionStatus = 'active'
```

**Characteristics:**

- كل خطوة تُعلن event على الـ event bus.
- Saga coordinator يراقب التقدّم.
- Compensating actions لكل خطوة فشلت بعد نجاح سابقتها.
- Idempotency keys في كل خطوة.

### 3.2 "Session → Invoice → Payment" Saga

```
Session completed (BC-04 event)
        │
        ▼
Generate invoice line item (BC-06)
        │
        ▼
If month-end: Close invoice, submit to ZATCA (BC-12)
        │
        ▼
Send invoice to guardian (BC-11)
        │
        ▼
Wait for payment (up to due date)
        │
    ┌───┴───┐
    │       │
  Paid    Overdue
    │       │
    ▼       ▼
 Mark    Reminder sent → Dunning → Collections
 paid    (auto at D+0, D+7, D+30, D+60)
```

---

## 4. State Machines لكيانات مختارة

### Beneficiary Admission Status

```
    applicant
       │
       ▼ (accept)
     active ─────(transfer)────▶ transferred
       │                              │
       ├──(hold)──▶ on_hold ─(resume)─┤
       │              │
       ▼              ▼ (discharge)
   discharged ◀────────
       │
       ▼ (reactivate — within 1 year)
     active
```

### Session Status

```
  scheduled ─────(cancel pre-24h)────▶ cancelled
      │
      ├─(reschedule)─▶ scheduled (new time)
      │
      ▼ (start)
  in_progress
      │
      ├─(abort)─▶ cancelled
      │
      ▼ (complete)
  completed ──(amend-within-24h)──▶ completed (amended)

  [If time passes without check-in]
  scheduled ──(no-show)──▶ no_show
```

### Invoice Status

```
  draft ──(issue)──▶ issued ──(send)──▶ sent
                        │                 │
                        │                 ├─(partial pay)──▶ partially_paid
                        │                 │                     │
                        │                 │                     └─(full pay)──▶ paid
                        │                 │
                        │                 └─(full pay)──▶ paid
                        │
                        ├─(cancel w/ approval)──▶ cancelled
                        │
                        ├─(dispute raised)──▶ disputed
                        │
                        └─(past due)──▶ overdue ──(pay)──▶ paid
                                           │
                                           └─(collections)──▶ written_off
```

### IRP Status

```
  draft ─(submit)─▶ pending_approval
                          │
                    ┌─────┼─────┐
                    │     │     │
                  reject approve revise
                    │     │     │
                    ▼     ▼     ▼
                  draft  active draft

  active ─(review cycle)─▶ active (v2)
     │
     ├─(hold)─▶ on_hold ─(resume)─▶ active
     │
     ├─(complete)─▶ completed
     │
     └─(terminate early)─▶ terminated
```

---

## 5. Smart Alerts (تنبيهات ذكية)

### 5.1 Clinical Alerts

| Trigger                             | Alert to                        | Urgency  |
| ----------------------------------- | ------------------------------- | -------- |
| Goal not progressing for 4 sessions | Therapist + Supervisor          | Medium   |
| No-show 2× في 30 يوم                | Supervisor + Guardian           | Medium   |
| Missed IRP review date              | Supervisor                      | High     |
| Credential expiring < 30 days       | Employee + HR                   | Medium   |
| Credential expired                  | Employee + HR + Blocks sessions | Critical |
| Incident severity = major           | Branch Manager + CQO (L2)       | Critical |
| IRP overdue for approval > 72h      | Branch Manager                  | High     |

### 5.2 Financial Alerts

| Trigger                   | Alert to              | Urgency  |
| ------------------------- | --------------------- | -------- |
| Invoice overdue > 30 days | Accountant + Guardian | Medium   |
| Invoice overdue > 60 days | Branch Manager        | High     |
| Invoice overdue > 90 days | CFO + Legal           | Critical |
| ZATCA submission rejected | Accountant + IT       | High     |
| Payment failed > 3×       | Accountant + Guardian | Medium   |
| Budget variance > 15%     | Branch Manager + CFO  | High     |

### 5.3 Operational Alerts

| Trigger                                      | Alert to               | Urgency  |
| -------------------------------------------- | ---------------------- | -------- |
| Therapist no check-in 30min post-shift start | Supervisor             | Medium   |
| Room double-booked                           | Scheduler + Supervisor | High     |
| Vehicle due for service                      | Fleet Manager          | Medium   |
| Branch capacity > 95%                        | Branch Manager + HQ    | Medium   |
| System health degraded                       | Platform Team          | Critical |

### 5.4 Compliance Alerts

| Trigger                                                  | Alert to                   | Urgency             |
| -------------------------------------------------------- | -------------------------- | ------------------- |
| CBAHI audit evidence missing                             | CQO                        | High                |
| PDPL: consent expired                                    | Compliance Officer         | High                |
| PDPL: data subject request received                      | Compliance Officer + Legal | High (24h response) |
| Regulatory report due                                    | CQO + Compliance           | Medium              |
| Policy acknowledgment rate < 90% (within 30d of publish) | CQO                        | Medium              |

---

## 6. Business Rules Examples

### 6.1 Therapist-Beneficiary Ratio

- One-on-one (1:1): ABA, Individual OT/PT/Speech
- Small group (1:3): Art Therapy, Social Skills Group
- Medium group (1:6): Life Skills, Vocational
- يُمنع تجاوز النسبة إلا بموافقة supervisor.

### 6.2 Session Scheduling Rules

- لا يوجد overlap في schedule therapist أو beneficiary
- buffer time بين جلسات: 10 دقائق min
- Guardian notification 24h قبل موعد
- Cancellation حرة ≥ 24h، 50% charge داخل 24h، 100% if no-show

### 6.3 Goal Progress Rules

- لكل goal minimum 1 measurement/week
- Goal achieved = 3 consecutive measurements ≥ target
- Goal not met = 12+ weeks بدون تقدم → MDT review

### 6.4 IRP Rules

- Maximum 2 weeks من قبول المستفيد لبدء التقييمات
- Maximum 4 weeks من اكتمال التقييم لاعتماد IRP
- IRP review كل 3 أشهر كحد أدنى
- IRP duration: 6-12 شهراً (قابلة للتمديد)

---

## 7. التالي

- **[07-integrations.md](07-integrations.md)** — كيف نتكامل مع الخارج.
- **[09-roadmap.md](09-roadmap.md)** — متى ننفذ ماذا.
