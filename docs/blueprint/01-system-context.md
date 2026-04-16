# 01 — System Context Diagram | مخطط السياق العام

> النظام كعلبة سوداء واحدة + من يتفاعل معه + كيف

---

## 1. System Context Diagram (C4 Level 1)

```
                                  ┌──────────────────────────────────┐
                                  │   أنظمة حكومية سعودية            │
                                  │  ZATCA   │ GOSI    │ Qiwa        │
                                  │  Absher  │ Nafath  │ Yakeen      │
                                  │  Etimad  │ Wasel   │ Madaa       │
                                  │  MoH     │ CBAHI   │ HRDF/MoHRSD │
                                  └──────────────┬───────────────────┘
                                                 │ REST/SOAP/XML
                                                 │ E-invoice XML
                                                 │ JWT-signed tokens
                                                 ▼
┌──────────────────┐               ┌─────────────────────────────────┐              ┌────────────────────┐
│  المستفيدون      │               │                                 │              │  بنوك / بوابات    │
│  ولي الأمر       │  Web/Mobile   │                                 │  APIs        │  دفع / تأمين      │
│  (Portal L6)     │ ──────────▶   │   ███████████████████████████   │  ◀─────────▶ │  Mada / HyperPay  │
└──────────────────┘               │   █                         █   │              │  STC Pay / Stripe │
                                   │   █   Al-Awael Unified     █   │              │  CHI / التأمين    │
┌──────────────────┐               │   █       Platform         █   │              │                    │
│  المعالجون       │               │   █   ERP + EMR + CRM      █   │              └────────────────────┘
│  أخصائيون (L5)   │ ──Web/App───▶│   █   + Rehab Platform     █   │
└──────────────────┘               │   █                         █   │              ┌────────────────────┐
                                   │   ███████████████████████████   │              │  اتصالات           │
┌──────────────────┐               │                                 │              │  SendGrid / SMTP   │
│ مشرف إكلينيكي   │ ──────────▶   │                                 │ ──────────▶  │  Twilio (SMS/WA)   │
│  (L4)            │               │                                 │              │  FCM / APNs        │
└──────────────────┘               │                                 │              └────────────────────┘
                                   │                                 │
┌──────────────────┐               │                                 │              ┌────────────────────┐
│  مدير فرع (L3)  │ ──Web──────▶  │                                 │ ──────────▶  │  Cloud Storage     │
└──────────────────┘               │                                 │              │  AWS S3 / Media    │
                                   │                                 │              └────────────────────┘
┌──────────────────┐               │                                 │
│ إدارة رئيسية   │ ──Web──────▶  │                                 │              ┌────────────────────┐
│ HEAD_OFFICE (L2) │               │                                 │ ──────────▶  │  Observability     │
└──────────────────┘               │                                 │              │  Prometheus/Grafana│
                                   │                                 │              │  Sentry (errors)   │
┌──────────────────┐               └─────────────────────────────────┘              └────────────────────┘
│ SUPER_ADMIN (L1) │ ──Web/CLI──▶
└──────────────────┘                                                                 ┌────────────────────┐
                                                                                      │  AI/ML Services    │
┌──────────────────┐                                                                  │  OpenAI / Claude   │
│  Auditors        │ ──API only──▶                                                    │  Custom ML Models  │
│  (external)      │                                                                  └────────────────────┘
└──────────────────┘
```

---

## 2. Actors (من يتفاعل مع النظام؟)

### 2.1 المستخدمون الداخليون (Internal Actors)

| #   | Actor                          | Level | الوصف                                  | Primary Interface               |
| --- | ------------------------------ | ----- | -------------------------------------- | ------------------------------- |
| A1  | **Super Admin**                | L1    | مسؤول المنصة التقني والقانوني          | Web + CLI                       |
| A2  | **Head Office Executive**      | L2    | CEO، CFO، CQO، CHRO على مستوى المجموعة | Executive BI Portal             |
| A3  | **Head Office Admin**          | L2    | مدير إداري في المقر الرئيسي            | Web (full branches view)        |
| A4  | **Compliance Officer**         | L2    | مسؤول الامتثال على مستوى المجموعة      | Compliance Portal               |
| A5  | **Branch Manager**             | L3    | مدير فرع — عمليات محلية                | Web (branch-scoped)             |
| A6  | **Branch Admin**               | L3    | إداري فرع (استقبال، توثيق)             | Web                             |
| A7  | **Clinical Supervisor**        | L4    | مشرف إكلينيكي على فريق معالجين         | Web + Therapist Elite Dashboard |
| A8  | **Therapist**                  | L5    | معالج نفسي/وظيفي/نطق/حركي              | Web + Mobile (Therapist App)    |
| A9  | **Special Educator**           | L5    | معلم تربية خاصة                        | Web                             |
| A10 | **Physician / Doctor**         | L5    | طبيب أطفال / تأهيلي                    | EMR Portal                      |
| A11 | **Nurse**                      | L5    | ممرضة إكلينيكية                        | Web                             |
| A12 | **HR Officer**                 | L3/L4 | موظف موارد بشرية                       | HR Module                       |
| A13 | **Accountant**                 | L3/L4 | محاسب فرع / مجموعة                     | Finance Module                  |
| A14 | **Receptionist**               | L5    | موظف استقبال                           | Front Desk Module               |
| A15 | **Transportation Coordinator** | L5    | منسق نقل                               | Fleet Module                    |
| A16 | **Social Worker**              | L5    | أخصائي اجتماعي                         | Social Work Module              |
| A17 | **Psychologist**               | L5    | أخصائي نفسي                            | Psych Support Module            |

### 2.2 المستخدمون الخارجيون (External Actors)

| #   | Actor                     | Level | الوصف                         | Primary Interface                |
| --- | ------------------------- | ----- | ----------------------------- | -------------------------------- |
| E1  | **Beneficiary (Student)** | L6    | المستفيد نفسه (إن كان قادراً) | Mobile App / Web (accessible)    |
| E2  | **Parent / Guardian**     | L6    | ولي الأمر                     | Mobile App (primary) + Web       |
| E3  | **Family Support**        | L6    | أخ/أخت/مقدم رعاية ثانوي       | Mobile (read-only)               |
| E4  | **External Referrer**     | —     | طبيب/جهة خارجية تحيل المستفيد | Public Referral Form (tokenized) |
| E5  | **External Auditor**      | —     | مدقق خارجي (CBAHI, PDPL)      | Read-only audit API              |
| E6  | **Government Inspector**  | —     | مفتش من جهة حكومية            | On-demand export + read API      |

### 2.3 الأنظمة الخارجية (External Systems)

| #   | System                                     | الغرض                                | Direction                        | Protocol         |
| --- | ------------------------------------------ | ------------------------------------ | -------------------------------- | ---------------- |
| X1  | **ZATCA**                                  | الفوترة الإلكترونية + القيمة المضافة | Out (invoices) + In (validation) | XML/JSON REST    |
| X2  | **GOSI**                                   | التأمينات الاجتماعية                 | Bi-directional                   | SOAP/REST        |
| X3  | **Qiwa**                                   | منصة العمل (عقود، رواتب)             | Bi-directional                   | REST             |
| X4  | **Absher**                                 | تحقق هوية المواطن/المقيم             | Out (queries)                    | REST OAuth2      |
| X5  | **Nafath**                                 | التوقيع الرقمي الوطني                | Bi-directional                   | SAML/OIDC        |
| X6  | **Yakeen**                                 | تحقق بيانات سكانية                   | Out                              | REST             |
| X7  | **Etimad**                                 | توثيق/اعتماد الوثائق                 | Out                              | REST             |
| X8  | **Wasel (CHI)**                            | التأمين الصحي                        | Bi-directional                   | REST             |
| X9  | **Madaa**                                  | بطاقة الراتب                         | Out (transfers)                  | SFTP/REST        |
| X10 | **CBAHI**                                  | هيئة الاعتماد الصحي                  | Reports out                      | REST/Export      |
| X11 | **MoH (وزارة الصحة)**                      | تراخيص، تقارير وبائية                | Bi-directional                   | REST/Portal      |
| X12 | **MoHRSD**                                 | الموارد البشرية والتنمية الاجتماعية  | Out (reports)                    | Portal           |
| X13 | **HRDF (هدف)**                             | دعم توظيف السعوديين                  | Out                              | Portal/REST      |
| X14 | **Authority of Persons with Disabilities** | هيئة رعاية الأشخاص ذوي الإعاقة       | Bi-directional                   | REST             |
| X15 | **Payment Gateways**                       | Mada, HyperPay, STC Pay, Stripe      | Out (charges) + In (webhooks)    | REST + Webhooks  |
| X16 | **Banks (SAMA APIs)**                      | مطابقة حسابات، تحويلات رواتب         | Bi-directional                   | Open Banking API |
| X17 | **Insurance Providers**                    | Bupa, Tawuniya, MedGulf...           | Bi-directional                   | REST             |
| X18 | **Email Provider**                         | SendGrid / SES / SMTP                | Out                              | SMTP/REST        |
| X19 | **SMS Gateway**                            | Twilio / Unifonic                    | Out                              | REST             |
| X20 | **WhatsApp Business API**                  | Twilio/Meta WA Cloud                 | Out + Webhooks                   | REST             |
| X21 | **Push Notifications**                     | FCM (Android) + APNs (iOS)           | Out                              | REST             |
| X22 | **Object Storage**                         | AWS S3 (documents, media)            | Bi-directional                   | S3 API           |
| X23 | **AI Services**                            | Claude API / OpenAI / custom ML      | Out                              | REST             |
| X24 | **Observability**                          | Prometheus, Grafana, Sentry          | Out (metrics/errors)             | Prometheus/HTTP  |

---

## 3. Primary Data Flows

### 3.1 رحلة مستفيد جديد (High-Level)

```
External Referrer ──┐
Parent (self)       ├──▶ Public Intake Form ──▶ Platform (Intake BC)
Branch Reception    ──┘                         │
                                                ▼
                                   Identity Verification (Yakeen/Absher)
                                                │
                                                ▼
                                     Clinical Core (EMR) ──▶ Assessment
                                                │
                                                ▼
                                     Individualized Rehab Plan (IRP)
                                                │
                                                ▼
                              Sessions Loop ◀─── Service Delivery ──▶ Progress Tracking
                                                │
                                                ▼
                                     Reviews + Reports ──▶ Parent Portal (Notifications)
                                                │
                                                ▼
                                     Invoicing ──▶ ZATCA ──▶ Payment Gateway
```

### 3.2 تدفق تقديم خدمة يومية

```
Therapist App ──▶ Check-in (biometric/QR) ──▶ HR Attendance
                            │
                            ▼
                  Session Delivery ──▶ Session Notes
                            │
                            ▼
                  Progress Measurement ──▶ EMR Update
                            │
                            ▼
                  Parent Notification (WhatsApp/App) ──▶ Parent Portal
```

### 3.3 تدفق إداري تنفيذي

```
HQ Dashboard ──▶ Real-time KPIs (branch-level aggregations)
       │
       ▼
Drill-down into Branch ──▶ Drill-down into Department ──▶ Drill-down into Therapist/Beneficiary
       │
       ▼
Alert on deviation ──▶ Automated ticket ──▶ Branch Manager
```

---

## 4. خصائص غير وظيفية (Non-Functional)

| الخاصية                            | الهدف                                          |
| ---------------------------------- | ---------------------------------------------- |
| **Availability**                   | 99.9% (8.76h downtime/year max)                |
| **RTO** (Recovery Time Objective)  | ≤ 2 ساعة                                       |
| **RPO** (Recovery Point Objective) | ≤ 15 دقيقة                                     |
| **Response Time** (p95 APIs)       | < 300ms                                        |
| **Response Time** (p95 Reports)    | < 3s                                           |
| **Concurrent Users** (peak)        | 2,000+                                         |
| **Data Retention** (Clinical)      | 15 سنة (PDPL / MoH)                            |
| **Data Retention** (Financial)     | 10 سنوات (ZATCA)                               |
| **Encryption at Rest**             | AES-256                                        |
| **Encryption in Transit**          | TLS 1.3                                        |
| **Audit Log Retention**            | 7 سنوات                                        |
| **Accessibility**                  | WCAG 2.1 Level AA                              |
| **Languages**                      | AR (default) / EN                              |
| **Backup Frequency**               | Hourly incremental + daily full                |
| **Mobile Support**                 | iOS 14+, Android 9+                            |
| **Browser Support**                | Chrome/Edge/Safari/Firefox latest + 2 versions |

---

## 5. حدود المنصة (What's OUT of Scope)

لا تشمل المنصة:

- ❌ **Clinical Decision Support** لتشخيصات طبية حرجة (تُحال لأنظمة MoH المخصصة).
- ❌ **Radiology / PACS** (تتكامل مع أنظمة التصوير الطبي الخارجية).
- ❌ **Pharmacy dispensing** (تتكامل مع نظام صيدلية خارجي).
- ❌ **ERP مالي كامل تاريخي** (IFRS قابل للتكامل مع SAP/Oracle Financials إذا لزم).
- ❌ **Call Center Telephony** (يتكامل مع Genesys/Avaya إذا احتيج).

---

## 6. بوابات دخول النظام (Entry Points)

| Entry Point                        | Protocol   | Auth                  | الغرض                       |
| ---------------------------------- | ---------- | --------------------- | --------------------------- |
| `https://app.alawael.sa/`          | HTTPS      | Session + JWT         | تطبيق الويب الرئيسي         |
| `https://parent.alawael.sa/`       | HTTPS      | Session + OTP         | بوابة ولي الأمر             |
| `https://therapist.alawael.sa/`    | HTTPS      | Session + MFA         | بوابة المعالج               |
| `https://api.alawael.sa/v1/`       | HTTPS REST | Bearer JWT + API Key  | APIs خارجية                 |
| `https://webhooks.alawael.sa/`     | HTTPS POST | HMAC signature        | استقبال webhooks حكومية/دفع |
| Mobile App (iOS/Android)           | HTTPS      | OAuth2 + PKCE         | تطبيقات الجوال              |
| `https://public.alawael.sa/intake` | HTTPS      | reCAPTCHA + tokenized | نموذج إحالة عام             |

---

## 7. التالي

- **[02-bounded-contexts.md](02-bounded-contexts.md)** — تقسيم المنصة الداخلي إلى 14 سياق محدود.
- **[07-integrations.md](07-integrations.md)** — تفاصيل كل تكامل خارجي.
