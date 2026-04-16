# 02 — Bounded Contexts | السياقات المحدودة

> تقسيم المنصة إلى 14 سياق محدود (DDD Bounded Contexts) مع Context Map

---

## 1. مبدأ التقسيم

**السياق المحدود (Bounded Context)** = تجمّع متماسك من النماذج والقواعد واللغة المشتركة، له **مالك واحد** (team ownership) و**مصدر بيانات منطقي واحد** (logical schema).

كل سياق:

- يملك **Aggregate Roots** الخاصة به.
- ينشر **Domain Events** عبر الـ Integration Bus.
- يتفاعل مع السياقات الأخرى عبر **APIs أو Events فقط** (لا وصول مباشر لقاعدة بيانات سياق آخر).
- له **Ubiquitous Language** خاص (مصطلحات متسقة بين الكود والأعمال).

---

## 2. الـ 14 Bounded Contexts

### BC-01 — Identity & Access Management (IAM)

**المالك:** Platform Security Team
**الهدف:** توحيد الهوية، المصادقة، الصلاحيات عبر المنصة.

**Aggregates:**

- `User` (الهوية المركزية)
- `Role` (الدور)
- `Permission` (الصلاحية)
- `Session` (الجلسة)
- `ApiKey` (مفاتيح API)
- `MfaDevice` (أجهزة MFA)

**Domain Events:**

- `UserCreated`, `UserSuspended`, `UserDeleted`
- `RoleAssigned`, `PermissionGranted`, `PermissionRevoked`
- `LoginSucceeded`, `LoginFailed`, `PasswordReset`
- `MfaEnrolled`, `MfaChallengeSucceeded`

**External:**

- يستهلك من: Nafath (national digital identity)
- ينشر إلى: كل السياقات (عبر JWT)

---

### BC-02 — Multi-Branch Governance

**المالك:** Platform Operations Team
**الهدف:** تعريف الفروع + هرمية التنظيم + قواعد العزل + التفويض عبر الفروع.

**Aggregates:**

- `Branch` (الفرع)
- `Department` (القسم داخل الفرع)
- `Region` (المنطقة: رياض/جدة/شرقية...)
- `OrgStructure` (الهيكل التنظيمي)
- `BranchLicense` (ترخيص الفرع)
- `CrossBranchDelegation` (تفويض عبر الفروع)

**Domain Events:**

- `BranchCreated`, `BranchActivated`, `BranchDeactivated`
- `DepartmentCreated`, `DepartmentMerged`
- `LicenseIssued`, `LicenseRenewed`, `LicenseExpired`

**قواعد العزل:**

- `branchId` إلزامي على كل aggregate غير-عالمي.
- أدوار cross-branch: `SUPER_ADMIN`, `HEAD_OFFICE_ADMIN`, `ADMIN`.
- Audit trail لكل وصول cross-branch.

---

### BC-03 — Clinical Core (EMR)

**المالك:** Clinical Informatics Team
**الهدف:** السجل الإكلينيكي للمستفيد + التاريخ الطبي + التقييمات.

**Aggregates:**

- `Beneficiary` (المستفيد — Aggregate Root)
- `MedicalHistory` (التاريخ الطبي)
- `Diagnosis` (التشخيصات — ICD-10)
- `Allergy`
- `Medication`
- `Assessment` (تقييم: ICF, Bayley, Vineland, GMFCS, ...)
- `ClinicalNote` (ملاحظات إكلينيكية)
- `LabResult` (نتائج مختبر)
- `Referral` (إحالة داخلية/خارجية)
- `CarePlan` (خطة رعاية طبية — مختلفة عن IRP)

**Domain Events:**

- `BeneficiaryRegistered`, `BeneficiaryDischarged`
- `DiagnosisAdded`, `DiagnosisUpdated`
- `AssessmentCompleted`, `AssessmentReviewed`
- `ReferralCreated`, `ReferralAccepted`, `ReferralRejected`

**Clinical Standards:**

- ICF (International Classification of Functioning)
- ICD-10 للتشخيص
- SNOMED-CT (اختياري للتوسع)
- FHIR R4 (للتكامل المستقبلي مع MoH)

---

### BC-04 — Rehab Service Delivery

**المالك:** Clinical Operations Team
**الهدف:** تقديم خدمات التأهيل — IRP، أهداف، جلسات، قياس.

**Aggregates:**

- `IndividualizedRehabilitationPlan (IRP)` (Aggregate Root)
- `RehabGoal` (SMART Goal)
- `Objective` (هدف فرعي قابل للقياس)
- `TherapySession` (جلسة)
- `SessionNote` (ملاحظة جلسة)
- `ProgressMeasurement` (قياس تقدم)
- `TherapyProgram` (برنامج: ABA، PT، OT، Speech، Art، Music...)
- `Intervention` (تدخل)
- `OutcomeReport` (تقرير مخرجات)

**Domain Events:**

- `IRPCreated`, `IRPApproved`, `IRPReviewed`, `IRPCompleted`
- `GoalAdded`, `GoalProgressed`, `GoalAchieved`, `GoalDiscontinued`
- `SessionScheduled`, `SessionCompleted`, `SessionCancelled`, `NoShow`
- `ProgressMeasured`, `OutcomeReportGenerated`

**Integration:**

- يستهلك: `Beneficiary` من BC-03
- ينشر إلى: BC-05 (Scheduling), BC-06 (Finance — billing per session), BC-11 (Notifications)

---

### BC-05 — Scheduling & Operations

**المالك:** Operations Team
**الهدف:** المواعيد، غرف العلاج، النقل، إدارة وقت الموظف.

**Aggregates:**

- `Appointment` (موعد)
- `Room` (غرفة علاج)
- `Resource` (معدات، أدوات)
- `TherapistSchedule` (جدول معالج)
- `ShiftRoster` (خطة المناوبات)
- `TransportTrip` (رحلة نقل)
- `Vehicle` (مركبة)

**Domain Events:**

- `AppointmentBooked`, `AppointmentRescheduled`, `AppointmentCancelled`
- `RoomAllocated`, `ResourceReserved`
- `TripScheduled`, `TripStarted`, `TripCompleted`, `TripIncident`

**Algorithms:**

- Smart Scheduling (greedy + constraints)
- Conflict Detection
- Room optimization

---

### BC-06 — Finance & Accounting

**المالك:** Finance Team
**الهدف:** الفوترة، المقبوضات، المدفوعات، الميزانية، المحاسبة العامة.

**Aggregates:**

- `Invoice` (فاتورة)
- `Payment` (دفعة)
- `CreditNote` / `DebitNote`
- `Receipt` (إيصال)
- `Contract` (عقد مع مستفيد)
- `PricingPlan` (خطة تسعير)
- `Budget` (ميزانية)
- `Expense` (مصروف)
- `ChartOfAccount` (دليل حسابات)
- `JournalEntry` (قيد يومية)
- `InsuranceClaim` (مطالبة تأمين)

**Domain Events:**

- `InvoiceIssued`, `InvoicePaid`, `InvoiceOverdue`, `InvoiceCancelled`
- `PaymentReceived`, `PaymentRefunded`, `PaymentFailed`
- `ZatcaSubmitted`, `ZatcaAccepted`, `ZatcaRejected`
- `ClaimSubmitted`, `ClaimApproved`, `ClaimRejected`

**Integration:**

- يستهلك: `TherapySession` events من BC-04 (per-session billing)
- ينشر إلى: ZATCA (X1), Insurance (X17), Banks (X16)

---

### BC-07 — Human Resources

**المالك:** HR Team
**الهدف:** الموظف، التوظيف، الرواتب، الحضور، التدريب، الأداء.

**Aggregates:**

- `Employee` (موظف)
- `EmploymentContract` (عقد عمل)
- `Position` (المسمى الوظيفي)
- `Credential` (شهادة/رخصة مهنية)
- `Attendance` (حضور)
- `LeaveRequest` (طلب إجازة)
- `Payroll` (راتب)
- `PerformanceReview` (تقييم أداء)
- `Training` (تدريب)
- `JobApplication` (طلب توظيف)
- `Onboarding` (تعيين)

**Domain Events:**

- `EmployeeHired`, `EmployeeTerminated`, `EmployeeTransferred`
- `AttendanceRecorded`, `LeaveApproved`, `LeaveRejected`
- `PayrollProcessed`, `PayrollDisbursed`
- `CredentialRenewed`, `CredentialExpired`, `CredentialExpiring`
- `PerformanceReviewCompleted`

**Integration:**

- يستهلك: `UserCreated` من BC-01 (كل موظف = user)
- ينشر إلى: GOSI (X2), Qiwa (X3), HRDF (X13), Madaa (X9)

---

### BC-08 — Quality & Compliance

**المالك:** Quality Assurance + Compliance Team
**الهدف:** إدارة الجودة، الحوادث، المخاطر، الامتثال الداخلي والخارجي.

**Aggregates:**

- `Incident` (حادثة/بلاغ)
- `Risk` (خطر)
- `CAPA` (إجراء تصحيحي/وقائي — Corrective/Preventive Action)
- `Audit` (تدقيق داخلي)
- `ComplianceAssessment` (تقييم امتثال — CBAHI, PDPL, ...)
- `QualityMetric` (مؤشر جودة)
- `Policy` (سياسة)
- `SOP` (إجراء تشغيلي قياسي)

**Domain Events:**

- `IncidentReported`, `IncidentInvestigated`, `IncidentClosed`
- `RiskIdentified`, `RiskMitigated`, `RiskAccepted`
- `CAPAOpened`, `CAPAClosed`
- `AuditStarted`, `AuditFinding`, `AuditClosed`

**Standards:**

- CBAHI (Saudi Central Board for Accreditation)
- ISO 9001 (اختياري)
- JCI (اختياري)

---

### BC-09 — CRM & Beneficiary Relations

**المالك:** Customer Experience Team
**الهدف:** علاقات المستفيدين وأولياء الأمور، الشكاوى، الاستطلاعات، الحملات.

**Aggregates:**

- `ComplaintTicket` (تذكرة شكوى)
- `Survey` (استطلاع)
- `SurveyResponse`
- `Campaign` (حملة)
- `InteractionLog` (سجل تفاعل)
- `SatisfactionScore` (NPS, CSAT)
- `Lead` (عميل محتمل — للاستقطاب)

**Domain Events:**

- `ComplaintOpened`, `ComplaintEscalated`, `ComplaintResolved`
- `SurveyLaunched`, `SurveyResponseReceived`
- `CampaignStarted`, `CampaignCompleted`

---

### BC-10 — Document Management (DMS)

**المالك:** Platform Services Team
**الهدف:** إدارة كل الوثائق (رفع، فهرسة، بحث، توقيع، أرشفة).

**Aggregates:**

- `Document` (وثيقة)
- `DocumentVersion` (نسخة)
- `FolderStructure`
- `SignatureRequest` (طلب توقيع)
- `SignedDocument` (وثيقة موقّعة)
- `RetentionPolicy` (سياسة احتفاظ)
- `AccessControlEntry` (صلاحية وصول للوثيقة)

**Domain Events:**

- `DocumentUploaded`, `DocumentVersioned`, `DocumentArchived`, `DocumentDeleted`
- `SignatureRequested`, `SignatureCompleted`, `SignatureRejected`

**Standards:**

- Nafath للتوقيع الرقمي (مواطنين/مقيمين)
- XAdES / PAdES للتوقيع الرقمي الدولي
- PDF/A للأرشفة طويلة الأمد

---

### BC-11 — Communications & Notifications

**المالك:** Platform Services Team
**الهدف:** توحيد قناة الإخراج (Email, SMS, WhatsApp, Push, In-app).

**Aggregates:**

- `NotificationTemplate` (قالب)
- `NotificationRequest` (طلب إشعار)
- `DeliveryReceipt` (إيصال تسليم)
- `Campaign` (حملة جماعية)
- `OptInPreference` (تفضيلات المستخدم)
- `Channel` (قناة — email/sms/wa/push)

**Domain Events:**

- `NotificationQueued`, `NotificationSent`, `NotificationDelivered`, `NotificationFailed`, `NotificationRead`

**Policy:**

- Fan-out للـ events من كل السياقات (subscriber pattern).
- احترام OptIn/OptOut.
- Dead-letter queue للرسائل الفاشلة.

---

### BC-12 — Government Integrations

**المالك:** Integrations Team
**الهدف:** Anti-Corruption Layer بين المنصة والأنظمة الحكومية.

**Aggregates (جميعها واجهات/adapters — ليست بيانات):**

- `ZatcaClient` + `ZatcaSubmissionLog`
- `GosiClient` + `GosiEnrollment`
- `QiwaClient` + `QiwaContract`
- `NafathClient` + `NafathSignature`
- `AbsherClient` + `AbsherVerification`
- `YakeenClient`
- `EtimadClient`
- `WaselClient` (CHI)
- `MadaaClient`
- `HRDFClient`
- `CBAHIClient`
- `MoHClient`

**Pattern:**

- Anti-Corruption Layer (ACL) لكل نظام خارجي.
- Circuit Breaker + Retry Policy.
- Offline/queue mode عند انقطاع النظام الحكومي.

---

### BC-13 — Analytics & Executive BI

**المالك:** Data Team
**الهدف:** تجميع البيانات، لوحات القيادة التنفيذية، التقارير، تحليلات تنبؤية.

**Aggregates:**

- `KpiDefinition` (تعريف مؤشر)
- `KpiValue` (قيمة مؤشر مُحسوبة)
- `Dashboard` (لوحة)
- `Widget`
- `Report` (تقرير معرّف)
- `DataSource` (مصدر بيانات)
- `Alert` (تنبيه ذكي)

**Data Pipeline:**

```
Operational DBs ──▶ Event Stream ──▶ Data Lake (S3)
                                      │
                                      ▼
                                 ETL/dbt ──▶ Analytics DB (MongoDB + Materialized Views)
                                      │
                                      ▼
                                 Dashboards / Reports / Alerts
```

**Domain Events:**

- `KpiComputed`, `AlertTriggered`, `ReportGenerated`, `ReportScheduled`

---

### BC-14 — Supply, Assets & Fleet

**المالك:** Operations + Facilities Team
**الهدف:** المخزون، الأصول، الصيانة، الأسطول (المركبات).

**Aggregates:**

- `InventoryItem` (صنف مخزون)
- `Warehouse` (مستودع)
- `PurchaseOrder` (أمر شراء)
- `Supplier` (مورد)
- `Asset` (أصل ثابت)
- `MaintenanceTask` (مهمة صيانة)
- `Vehicle` (مركبة — يتقاطع مع BC-05)
- `FleetDriver`
- `FuelLog`

**Domain Events:**

- `StockReceived`, `StockIssued`, `StockLow`, `StockExpired`
- `PODrafted`, `POApproved`, `POFulfilled`
- `AssetAcquired`, `AssetDisposed`, `AssetMaintained`
- `VehicleServiceDue`, `VehicleIncident`

---

## 3. Context Map (العلاقات بين السياقات)

```
                    ┌───────────────┐
                    │  BC-01 IAM    │◀────────┐
                    └──────┬────────┘         │ (JWT validation)
                           │                   │
                           │ (user/role)       │
           ┌───────────────┼───────────────────┼───────────────┐
           │               │                   │               │
           ▼               ▼                   │               ▼
    ┌──────────┐    ┌────────────┐             │        ┌─────────────┐
    │ BC-02    │    │ BC-03      │             │        │ BC-07 HR    │
    │ Multi-   │◀──▶│ Clinical   │             │        │             │
    │ Branch   │    │ Core (EMR) │             └────────│             │
    └────┬─────┘    └─────┬──────┘                      └──────┬──────┘
         │                │                                     │
         │ (branchId)     │ (beneficiaryId)                     │
         │                ▼                                     │
         │         ┌────────────┐                               │
         │         │ BC-04      │                               │
         │         │ Rehab Svc  │                               │
         │         │ Delivery   │                               │
         │         └──┬──┬──────┘                               │
         │            │  │                                      │
         │            ▼  ▼                                      │
         │     ┌─────────┐ ┌──────────┐                         │
         │     │ BC-05   │ │ BC-06    │◀───────────────────────┤
         │     │ Sched   │ │ Finance  │  (employee payroll)    │
         │     └─────────┘ └────┬─────┘                         │
         │                       │                              │
         │                       │ (invoice events)             │
         │                       ▼                              │
         │              ┌────────────┐                          │
         │              │ BC-12 Gov  │──▶ ZATCA, GOSI, Qiwa ◀──┘
         │              │ Integr.    │
         │              └────────────┘
         │
         ▼
   ┌──────────┐    ┌───────────────┐
   │ BC-08    │    │ BC-09 CRM     │
   │ Quality  │    │               │
   │ Compl.   │    │               │
   └────┬─────┘    └───────┬───────┘
        │                   │
        └─────┬─────────────┘
              │
              ▼
     ┌────────────────┐
     │ BC-10 DMS      │
     └────────┬───────┘
              │
              ▼
     ┌────────────────┐         ┌──────────────────┐
     │ BC-11 Comms &  │◀───────▶│ BC-13 Analytics  │
     │ Notifications  │  events │ & Executive BI   │
     └────────────────┘         └──────────────────┘
                                          │
                                          │ (KPIs)
                                          ▼
                                 Executive Dashboards

    ┌──────────────────┐
    │ BC-14 Supply,    │
    │ Assets, Fleet    │
    └──────────────────┘
```

### Relationships (DDD Patterns)

| Upstream           | Downstream            | Pattern            | Reason                      |
| ------------------ | --------------------- | ------------------ | --------------------------- |
| BC-01 IAM          | كل السياقات           | Customer/Supplier  | هوية موحدة                  |
| BC-02 Multi-Branch | كل السياقات التشغيلية | Shared Kernel      | `branchId` حقل مشترك        |
| BC-03 Clinical     | BC-04 Rehab           | Customer/Supplier  | BC-04 يعتمد على Beneficiary |
| BC-04 Rehab        | BC-06 Finance         | Published Language | Session events → billing    |
| BC-04 Rehab        | BC-11 Notify          | Published Language | Progress events → parent    |
| BC-06 Finance      | BC-12 Gov             | ACL                | ZATCA/GOSI adapters         |
| BC-07 HR           | BC-12 Gov             | ACL                | Qiwa/GOSI adapters          |
| BC-03+BC-04        | BC-13 Analytics       | Conformist         | CDC stream للتحليلات        |
| BC-08 Quality      | BC-11 Notify          | Partnership        | incident → alert chain      |
| BC-10 DMS          | كل السياقات           | Shared Kernel      | attachments مشتركة          |

---

## 4. قواعد التفاعل بين السياقات

### قاعدة 1: لا وصول مباشر لقاعدة بيانات سياق آخر

- كل سياق يعرض **APIs** (REST) أو **Events**.
- استعلام `Beneficiary` من BC-04 يتم عبر `BeneficiaryReadModel` محلي مُحدَّث من events.

### قاعدة 2: Event-Driven للـ Cross-Context Updates

- `SessionCompleted` → BC-06 (يصدر فاتورة) + BC-11 (يشعر الأهل) + BC-13 (يحدث KPI).

### قاعدة 3: Anti-Corruption Layer للتكاملات الخارجية

- لا يدخل شكل بيانات ZATCA الخام للـ Core — يُترجم أولاً.

### قاعدة 4: Saga للعمليات متعددة السياقات

- مثال: قبول مستفيد = Saga تشمل:
  1. BC-01: إنشاء User
  2. BC-03: إنشاء Beneficiary + تحقق هوية (Yakeen)
  3. BC-10: رفع وثائق الأهل
  4. BC-06: إنشاء Contract + Pricing
  5. BC-11: إشعار ترحيب

### قاعدة 5: Eventually Consistent بين السياقات

- لا transactions موزّعة — events + saga + compensating actions.

---

## 5. Team Topology (Conway's Law)

| فريق                     | يملك         |
| ------------------------ | ------------ |
| Platform Security        | BC-01        |
| Platform Operations      | BC-02        |
| Clinical Informatics     | BC-03, BC-04 |
| Operations               | BC-05, BC-14 |
| Finance Eng              | BC-06        |
| HR Eng                   | BC-07        |
| Quality & Compliance Eng | BC-08        |
| CX Eng                   | BC-09        |
| Platform Services        | BC-10, BC-11 |
| Integrations             | BC-12        |
| Data Eng                 | BC-13        |

---

## 6. التالي

- **[03-modules-map.md](03-modules-map.md)** — كل سياق + وحداته + APIs.
- **[04-data-domains.md](04-data-domains.md)** — النماذج الكنسية داخل كل سياق.
