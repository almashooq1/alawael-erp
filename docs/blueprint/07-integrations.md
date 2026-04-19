# 07 — Integration Map | خريطة التكاملات

> كل التكاملات الحكومية السعودية + الخدمات الخارجية + أنماط التكامل

---

## 1. مبدأ التكامل

> **"Anti-Corruption Layer (ACL) بين الخارج والـ Core"**

كل نظام خارجي يُخاطَب عبر طبقة ACL في `BC-12 Government Integrations` (أو modules مخصصة في BC-11 للاتصالات). الـ Core لا يعرف شيئاً عن schemas الخارج.

```
┌────────────────┐      ┌──────────────────┐      ┌────────────────┐
│  Internal Core │─────▶│ ACL Adapter     │─────▶│  External API  │
│  (clean model) │◀─────│ (translate +    │◀─────│  (Gov/3rd party)│
│                │      │  retry + queue) │      │                │
└────────────────┘      └──────────────────┘      └────────────────┘
```

---

## 2. التكاملات الحكومية السعودية

### 2.1 ZATCA — هيئة الزكاة والضريبة والجمارك

**الغرض:** الفوترة الإلكترونية (E-Invoicing Phase 2)

**الوضع:** ✅ موجود جزئياً (`zatca-phase2.routes.js`)

**Flow:**

```
Invoice issued in BC-06
   │
   ▼
Serialize to ZATCA XML (UBL 2.1)
   │
   ▼
Sign with CSID (Cryptographic Stamp Identifier)
   │
   ▼
POST to ZATCA FATOORA API (sandbox/production)
   │
   ├── Accepted → Store UUID + QR + hash
   │
   └── Rejected → Flag invoice + alert + manual retry
```

**Required Data:**

- Seller VAT number
- Buyer info (for B2B)
- Line items with VAT breakdown (15%)
- Previous invoice hash (for Chain)
- Timestamp + counter
- QR code (for simplified invoices)

**Outstanding:**

- Chain verification — ensure no gaps in invoice sequence
- Batch retry mechanism for ZATCA outages
- Admin panel to inspect rejected invoices

---

### 2.2 GOSI — المؤسسة العامة للتأمينات الاجتماعية

**الغرض:** تأمين الموظفين اجتماعياً

**الوضع:** ✅ موجود (`gosi.routes.js`)

**Interactions:**
| Action | Flow |
|--------|------|
| Enroll new employee | Employee hired event → GOSI SOAP/REST → confirmation |
| Monthly contribution | Payroll run → GOSI contribution file (per employee) → GOSI portal |
| Salary change | Employee record update → GOSI notification |
| Termination | Employee terminated event → GOSI exit record |

**Outstanding:** salary calculation rules for Saudi vs non-Saudi vary (need verification).

---

### 2.3 Qiwa — منصة العمل

**الغرض:** عقود العمل، WPS (حماية الأجور)، إدارة العمالة

**الوضع:** ✅ موجود (`qiwa.routes.js`)

**Interactions:**
| Action | Flow |
|--------|------|
| New employee contract | Submit contract to Qiwa → employee signs via Absher |
| Salary protection (WPS) | Payroll disbursement → Qiwa WPS report |
| Contract amendment | Amendment submitted → approval flow in Qiwa |

**Outstanding:** auto-reconcile WPS with payroll actuals.

---

### 2.4 Nafath — التوقيع الرقمي الوطني

**الغرض:** توقيع رقمي للمواطنين والمقيمين عبر بطاقة الهوية الرقمية

**الوضع:** ❌ غير مبني — P1

**Use Cases:**

- توقيع ولي الأمر على IRP + contracts
- توقيع عقود الموظفين
- توقيع على السياسات والإجراءات
- أي وثيقة قانونية

**Flow:**

```
User requests signature → Platform redirects to Nafath
                                      │
                                      ▼
                          User approves via Absher app
                                      │
                                      ▼
                          Nafath callback → signed JWT
                                      │
                                      ▼
                          Platform stores signature + hash
```

**Outstanding:** build adapter + UI + store signed PDFs in PAdES format.

---

### 2.5 Absher — أبشر (خدمات المواطنين والمقيمين)

**الغرض:** التحقق من هوية المواطن/المقيم

**الوضع:** ❌ غير مبني — P1

**Use Cases:**

- تحقق من هوية ولي الأمر عند التسجيل
- تحقق من موظف جديد

**Flow:** OAuth-like redirect عبر بوابة Absher الحكومية.

---

### 2.6 Yakeen — يقين

**الغرض:** تحقق بيانات السجل المدني

**الوضع:** ❌ غير مبني — P1

**Use Cases:**

- verify nationalId + DOB + nationality
- verify guardianship claim (father-child relationship)

**Flow:**

```
Platform → Yakeen API (nationalId + date of birth)
                                      │
                                      ▼
                          Returns: name, nationality, gender,
                                   family info (if requested)
                                      │
                                      ▼
                          Platform stores verification result
```

---

### 2.7 Etimad — اعتماد

**الغرض:** توثيق واعتماد الوثائق الحكومية (للاستخدامات المناقصات/العقود الحكومية)

**الوضع:** ❌ غير مبني — P2

**Use Cases:** إذا كانت المجموعة تبرم عقوداً مع جهات حكومية.

---

### 2.8 Wasel / CHI — مجلس الضمان الصحي

**الغرض:** التأمين الصحي الإلزامي

**الوضع:** ❌ غير مبني — P1

**Use Cases:**

- التحقق من بوليصة ولي الأمر
- تقديم مطالبات تأمين للعلاجات المؤهلة
- استعلام عن التغطية

**Flow:**

```
Beneficiary arrives → Check insurance coverage
                                │
                                ▼
                Service delivered → Create claim
                                │
                                ▼
                      Submit to Wasel → insurer
                                │
                          ┌─────┼─────┐
                          │     │     │
                        Approved Rejected Pending
                          │     │     │
                          ▼     ▼     ▼
                    Payment  Appeal  Query
```

---

### 2.9 Madaa — بطاقة الراتب

**الغرض:** تحويل الرواتب للموظفين (خاصة غير السعوديين)

**الوضع:** ❌ غير مبني — P1

**Flow:** Payroll run → Madaa SFTP file → salary cards loaded.

---

### 2.10 HRDF / هدف — صندوق تنمية الموارد البشرية

**الغرض:** دعم توظيف السعوديين (رواتب جزئية من الصندوق)

**الوضع:** ❌ غير مبني — P2

**Use Cases:** subscription للموظفين السعوديين الجُدد + claim monthly subsidies.

---

### 2.11 MoHRSD — وزارة الموارد البشرية والتنمية الاجتماعية

**الغرض:** التقارير الدورية، نسب السعودة، التراخيص

**الوضع:** ❌ غير مبني — P2

**Use Cases:** report quarterly به Saudization ratios per branch.

---

### 2.12 CBAHI — الهيئة السعودية لاعتماد المنشآت الصحية

**الغرض:** الاعتماد الصحي للمنشآت التأهيلية

**الوضع:** ✅ موجود جزئياً

**Use Cases:** تقديم evidence + self-assessments + response to findings.

---

### 2.12.1 SCFHS — الهيئة السعودية للتخصصات الصحية

**الغرض:** ترخيص الممارسين الصحيين + تتبع ساعات التعليم الطبي المستمر (CPE)

**الوضع:** ✅ موجود (`scfhsAdapter.js` للتحقق من الترخيص + `cpeService.js` + `cpe-admin.routes.js` لساعات التعليم)

**Interactions:**

| Action               | Flow                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| License verification | Employee form → SCFHS adapter → `scfhs_verification` subdoc on Employee (status / classification / expiry) |
| CPE credit tracking  | HR enters activity → `CpeRecord` → service rolls up per category (50/30/20 + 100 total per 5-yr cycle)     |
| Compliance digest    | Cron → `npm run cpe:attention` → exit 0/1/2 → HR Slack channel for therapists in 6-month window            |
| SCFHS audit export   | `/api/admin/hr/cpe/export.csv` → UTF-8-BOM CSV with hydrated employee names                                |

**Critical compliance points:**

- **Renewal blocker:** Below-minimum CPE = license cannot renew = therapist legally cannot see patients = revenue hit. The cron-driven attention digest exists to catch the 6-month-out window before it becomes a crisis.
- **Audit-on-demand:** SCFHS can request the credit sheet at any time. The CSV export hydrates employee name + license number per row so the sheet stands alone — auditor doesn't need DB access.
- **PDPL note:** CPE records are linked to employeeId, not nationalId, so the standard adapter-audit hashing isn't needed; the data is already pseudonymized at the model level.

**Cross-reference:** [HR_COMPLIANCE_GUIDE.md](../HR_COMPLIANCE_GUIDE.md) — daily/weekly/monthly playbook tying GOSI + SCFHS license + CPE into one HR workflow.

---

### 2.13 Authority of Persons with Disabilities — هيئة رعاية الأشخاص ذوي الإعاقة

**الغرض:** التسجيل في سجل ذوي الإعاقة + الدعم الحكومي

**الوضع:** ✅ موجود جزئياً (`disabilityAuthority.routes.js`)

**Use Cases:**

- Register new beneficiary in national registry
- Submit quarterly reports
- Access beneficiary disability support subsidies

---

### 2.14 MoH — وزارة الصحة

**الغرض:** تراخيص المنشأة، تقارير الصحة العامة، تكامل مع منصة صحتي

**الوضع:** 🟡 محدود

**Use Cases:** تراخيص المنشآت + reporting certain clinical data + potential FHIR interop.

---

### 2.15 SIMAH / SAMA (Banking Cooperation)

**الغرض:** للمطابقة البنكية وعمليات الشيكات

**الوضع:** ❌ P3 (اختياري)

---

### 2.16 Saudi Post / SPL

**الغرض:** التحقق من العنوان الوطني

**الوضع:** ❌ P2

**Use Cases:** validate national address of beneficiary + guardian.

---

## 3. تكاملات المدفوعات

### 3.1 Mada — البطاقة الوطنية

- **الوضع:** 🟡 يتطلب bank integration
- **Gateway:** HyperPay / Payfort
- **Use Cases:** قبول مدفوعات from guardians

### 3.2 HyperPay / Payfort

- **الوضع:** متاح عبر الدعم التجاري
- **Features:** Mada + credit cards + installments

### 3.3 STC Pay

- **الوضع:** متاح
- **Use Cases:** دفع حضوري عبر QR

### 3.4 Stripe

- **الوضع:** موجود في dependencies (مالم يُفعَّل بعد)
- **Use Cases:** مدفوعات دولية (للعملاء الأجانب)

### 3.5 Tabby / Tamara (Buy-Now-Pay-Later)

- **الوضع:** ❌ اختياري
- **Use Cases:** تقسيط رسوم خدمات طويلة

### 3.6 Apple Pay / Google Pay

- **الوضع:** متاح عبر HyperPay
- **Use Cases:** mobile app checkout

---

## 4. تكاملات التأمين

### 4.1 Bupa Arabia

### 4.2 Tawuniya

### 4.3 MedGulf

### 4.4 Saudi Re

### 4.5 Najm (للتأمين على المركبات)

**Common Pattern:**

- Coverage verification API
- Pre-authorization workflow
- Claims submission
- Status polling / webhooks
- Reconciliation monthly

---

## 5. تكاملات الاتصالات

### 5.1 Email

| Provider           | Use                    | Status         |
| ------------------ | ---------------------- | -------------- |
| **SendGrid**       | Transactional          | ✅             |
| **AWS SES**        | High-volume / fallback | 🟡 Alternative |
| **SMTP** (generic) | Fallback               | ✅             |

**Pattern:**

- Primary provider → fallback provider on failure.
- DKIM/SPF/DMARC configured per domain.
- Suppression list management (bounces, complaints).

### 5.2 SMS

| Provider        | Use                      | Status      |
| --------------- | ------------------------ | ----------- |
| **Twilio**      | International + Saudi    | ✅          |
| **Unifonic**    | Saudi-local (lower cost) | 🟡          |
| **Jawwy / STC** | Enterprise SMS Saudi     | ❌ Optional |

### 5.3 WhatsApp

| Provider                    | Use                       | Status                   |
| --------------------------- | ------------------------- | ------------------------ |
| **Twilio WA**               | Existing                  | ✅                       |
| **Meta WhatsApp Cloud API** | Direct (cheaper at scale) | 🟡 Recommended migration |

### 5.4 Push Notifications

| Provider           | Use           | Status |
| ------------------ | ------------- | ------ |
| **FCM (Firebase)** | Android + iOS | ✅     |
| **APNs (direct)**  | iOS only      | Alt    |

### 5.5 Voice / IVR

- **Status:** ❌ Optional P3
- **Providers:** Twilio Voice, Genesys Cloud

---

## 6. البنية التحتية الخارجية

### 6.1 Object Storage

- **AWS S3** — documents, media, backups
- **S3 Replication** — cross-region for DR
- **Bucket Policies** — encrypted, versioned, MFA-delete for sensitive

### 6.2 CDN

- **CloudFront / Akamai** — frontend assets, video (tele-rehab)

### 6.3 Email Deliverability

- **Postmaster tools:** Google Postmaster, Microsoft SNDS

### 6.4 DNS

- **Route53 / Cloudflare DNS**

### 6.5 Monitoring

- **Prometheus + Grafana** — ✅ existing
- **Sentry** — error tracking
- **Datadog / New Relic** — optional APM

### 6.6 Security

- **Cloudflare / AWS WAF** — DDoS + WAF
- **Snyk / Dependabot** — vulnerability scanning
- **SIEM:** Splunk / Elastic Security

---

## 7. AI / ML Services

### 7.1 Anthropic Claude

- **Use:** clinical summarization, report generation, Arabic content generation
- **Status:** 🟡 planned

### 7.2 OpenAI

- **Use:** fallback, translation, embeddings
- **Status:** 🟡 planned

### 7.3 Custom ML Models

- **Use:**
  - Progress prediction (regression)
  - Risk scoring (classification)
  - Schedule optimization (constrained)
  - No-show prediction
- **Hosting:** local training, served via internal FastAPI endpoint

---

## 8. تكاملات تربوية / تعليمية (اختيارية)

### 8.1 Ministry of Education — وزارة التعليم

- **Use:** لمستفيدي التعليم الخاص المدمجين في المدارس النظامية
- **Status:** ❌ P3

### 8.2 Madrasati — منصة مدرستي

- **Use:** مشاركة تقارير مع المدرسة الأم
- **Status:** ❌ P3

---

## 9. أنماط التكامل المُعتمدة

### 9.1 Synchronous REST

- للـ verifications السريعة (Yakeen, Absher).
- Timeout: 10s.
- Retry: exponential backoff، max 3 retries.

### 9.2 Asynchronous Queue

- للـ ZATCA submissions, bulk notifications, file uploads.
- Queue: Redis/NATS.
- Dead letter queue للفاشل.

### 9.3 Webhook Receivers

- لـ ZATCA callbacks, payment gateway webhooks, WhatsApp incoming.
- Endpoint: `/webhooks/:provider`.
- Verification: HMAC signature per provider.
- Idempotency: store webhook IDs، reject duplicates.

### 9.4 Scheduled Batch

- لـ GOSI monthly contributions, MoHRSD quarterly reports, Madaa salary disbursement.
- Cron jobs + manual trigger.

### 9.5 File-based (SFTP)

- لـ Madaa (salary files), banks (statements).
- SFTP key-auth + PGP encryption لحساسة.

### 9.6 SSO / OIDC

- لـ Nafath (single sign-on + signing).

---

## 10. Resilience Patterns

### 10.1 Circuit Breaker

- فتح الدائرة بعد 5 فشل متتالي (50% في 30s).
- نصف مفتوح للتجربة.
- إغلاق عند النجاح.

### 10.2 Retry with Backoff

- Exponential: 1s, 2s, 4s, 8s (max 16s).
- Jitter: ±20% للتوزيع.

### 10.3 Timeout Hierarchy

- External API: 10s
- Internal service: 5s
- Database: 3s

### 10.4 Graceful Degradation

- إذا فشل ZATCA: invoices تُحفظ في queue، تُرسل لاحقاً.
- إذا فشل WhatsApp: fallback إلى SMS.
- إذا فشل Yakeen: manual verification path (upload ID copy).

### 10.5 Observability for Integrations

- Metrics: request count, success rate, p95 latency per integration.
- Dashboard في Grafana per external system.
- Alerts: error rate > 5% → page on-call.

---

## 11. Security for Integrations

### 11.1 Credentials Management

- **Vault:** AWS Secrets Manager / HashiCorp Vault.
- **Rotation:** quarterly.
- **Never in code / env files.**

### 11.2 mTLS للاتصالات الحساسة

- ZATCA، Nafath، بعض البنوك.

### 11.3 IP Whitelisting

- بعض الـ APIs الحكومية تتطلب static egress IP.
- Use NAT Gateway / dedicated proxy.

### 11.4 Audit Trail

- كل request/response to external system مُسجَّل في `IntegrationLog`.
- احتفاظ 7 سنوات.
- Redact PII في logs.

### 11.5 Rate Limit Protection

- Client-side rate limiter لحماية من الحدود المفروضة من الجهة الخارجية.

---

## 12. Integration Test Strategy

| Level                | Strategy                                                               |
| -------------------- | ---------------------------------------------------------------------- |
| **Unit**             | Mock external API مع fixtures                                          |
| **Contract**         | Stored fixtures from real responses (Pact or WireMock)                 |
| **Sandbox**          | Government sandbox environments (ZATCA, GOSI, Nafath all have sandbox) |
| **Production Smoke** | Post-deploy: verify connectivity to each external (no business data)   |

---

## 13. Current Gap Summary

| Integration                   | Status          | Priority     |
| ----------------------------- | --------------- | ------------ |
| ZATCA                         | ✅              | Maintain     |
| GOSI                          | ✅              | Maintain     |
| Qiwa                          | ✅              | Maintain     |
| Disability Authority          | ✅ (partial)    | P1: complete |
| Nafath                        | ❌              | **P1**       |
| Absher                        | ❌              | **P1**       |
| Yakeen                        | ❌              | **P1**       |
| Wasel/CHI                     | ❌              | **P1**       |
| Madaa                         | ❌              | **P1**       |
| Etimad                        | ❌              | P2           |
| HRDF                          | ❌              | P2           |
| MoHRSD                        | ❌              | P2           |
| MoH FHIR                      | ❌              | P3           |
| Mada/HyperPay                 | 🟡 dependencies | P1           |
| Twilio WA → Meta WA migration | 🟡              | P2           |
| Saudi Post Address            | ❌              | P2           |

---

## 14. التالي

- **[08-risks-controls.md](08-risks-controls.md)** — كيف نؤمّن كل هذه التكاملات.
- **[09-roadmap.md](09-roadmap.md)** — متى ننفذ كل واحد.
