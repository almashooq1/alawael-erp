# 10 — Gap Analysis | تحليل الفجوات

> مقارنة الحالة الراهنة (2026-04-16) مع الحالة المستهدفة، مُقيَّمة لكل Bounded Context

---

## 1. منهجية التقييم

**Score Scale (0-5):**

- **0** — غير موجود
- **1** — بداية بدائية
- **2** — موجود لكن ناقص أو مبعثر
- **3** — شغّال لكن غير موحَّد
- **4** — قوي مع فجوات صغيرة
- **5** — ناضج ومُستقر

**Target:** كل bounded context → 4 على الأقل بنهاية P2

---

## 2. الجدول التنفيذي

| BC    | سياق                   | Current | Target | Gap                                                  | Priority |
| ----- | ---------------------- | ------- | ------ | ---------------------------------------------------- | -------- |
| BC-01 | Identity & Access      | 3       | 5      | ABAC، MFA universal                                  | P1       |
| BC-02 | Multi-Branch Gov       | 4       | 5      | Cross-branch delegation، regional grouping           | P1       |
| BC-03 | Clinical Core (EMR)    | 3       | 5      | ICF full، FHIR readiness، consent mgmt               | P1       |
| BC-04 | Rehab Service Delivery | 4       | 5      | AI assistance، outcome reports standardization       | P2-P3    |
| BC-05 | Scheduling & Ops       | 3       | 4      | Optimization v2، fleet integration                   | P3       |
| BC-06 | Finance & Accounting   | 3       | 5      | Chain of custody ZATCA، IFRS reporting               | P1       |
| BC-07 | HR                     | 3       | 4      | Credential enforcement، HRDF integration             | P1-P2    |
| BC-08 | Quality & Compliance   | 2       | 5      | CBAHI evidence library، PDPL program، CAPA lifecycle | P1       |
| BC-09 | CRM                    | 3       | 4      | NPS dashboard، campaign tooling                      | P2       |
| BC-10 | Document Mgmt          | 3       | 5      | Nafath e-sign، OCR، retention automation             | P1-P2    |
| BC-11 | Communications         | 3       | 4      | Unified prefs، WA migration to Meta                  | P2       |
| BC-12 | Gov Integrations       | 2       | 5      | Nafath/Absher/Yakeen/Wasel/Madaa                     | **P1**   |
| BC-13 | Analytics & BI         | 2       | 5      | KPI framework، executive dashboard، data lake        | P1-P3    |
| BC-14 | Supply/Assets/Fleet    | 3       | 4      | IoT integration، preventive mainten.                 | P2-P3    |

**Overall maturity:** Current **3.0** → Target **4.6**

---

## 3. Detailed Gap per BC

### BC-01: Identity & Access Management

#### ✅ موجود (Current 3)

- 19 roles canonical (`config/constants/roles.constants.js`)
- JWT + session management
- RBAC middleware (`middleware/rbac.js`)
- Role aliases + resolution
- Cross-branch roles defined
- MFA for admins (partial)

#### ⚠️ Gaps

| Gap                                | Severity | Phase |
| ---------------------------------- | -------- | ----- |
| ABAC engine                        | High     | P1    |
| MFA universal (all clinical)       | High     | P1    |
| Break-glass workflow               | Medium   | P1    |
| SSO via Nafath                     | Medium   | P1    |
| API keys / service accounts module | Low      | P2    |
| Fine-grained permission editor UI  | Low      | P2    |
| Password policy enforcement UI     | Low      | P1    |
| Account lockout / brute force adv. | Medium   | P1    |

---

### BC-02: Multi-Branch Governance

#### ✅ موجود (Current 4)

- `branchId` canonical field
- `branchScope.middleware` + `multi-tenant-isolator`
- HEAD_OFFICE_ADMIN role added (commit 47d17268)
- Branch registry (12 branches + HQ)
- Cross-branch dashboard endpoint

#### ⚠️ Gaps

| Gap                                      | Severity | Phase |
| ---------------------------------------- | -------- | ----- |
| Cross-branch delegation module           | Medium   | P1    |
| Regional grouping (beyond single branch) | Low      | P2    |
| Branch license tracking + expiry alerts  | Medium   | P1    |
| Capacity planning per branch             | Medium   | P2    |
| Cross-branch transfer saga               | Medium   | P1    |

---

### BC-03: Clinical Core (EMR)

#### ✅ موجود (Current 3)

- Beneficiary model + BeneficiaryManagement sub-dir
- Assessment framework (ICF, Bayley-ready)
- Clinical notes
- Referrals partial
- CarePlan + TherapeuticPlan (ازدواج)

#### ⚠️ Gaps

| Gap                                                  | Severity | Phase |
| ---------------------------------------------------- | -------- | ----- |
| Deduplicate CarePlan/TherapeuticPlan/MedicalCarePlan | High     | P1    |
| ICF full taxonomy (b/d/e/s codes)                    | High     | P1    |
| FHIR R4 readiness (for MoH interop)                  | Medium   | P3    |
| Consent management (PDPL + clinical)                 | Critical | P1    |
| Allergies + Medications first-class                  | Medium   | P2    |
| Lab results module (structured)                      | Low      | P3    |
| Diagnosis ICD-10/SNOMED coding                       | Medium   | P2    |
| MDT Meeting module                                   | Medium   | P2    |

---

### BC-04: Rehab Service Delivery

#### ✅ موجود (Current 4 — قوي)

- IRP model + builder
- SMART Goals + Goal Bank (49KB service)
- 76+ therapy protocol services
- Progress metrics (48KB service)
- AI assessment service (19KB — exists!)
- Session + SessionNote models
- Tele-rehab service

#### ⚠️ Gaps

| Gap                                   | Severity | Phase |
| ------------------------------------- | -------- | ----- |
| Outcome reports standardization       | Medium   | P2    |
| MDT review workflow formalized        | Medium   | P2    |
| AI goal recommendations UI            | Medium   | P3    |
| AI session note drafting              | Medium   | P3    |
| Group session model (1:3, 1:6 ratios) | Medium   | P2    |
| Session amendment audit               | High     | P1    |

---

### BC-05: Scheduling & Operations

#### ✅ موجود (Current 3)

- Appointment model
- Smart scheduling service
- Room model
- Basic scheduler

#### ⚠️ Gaps

| Gap                                 | Severity | Phase |
| ----------------------------------- | -------- | ----- |
| Constraint-based optimizer (CP-SAT) | Medium   | P3    |
| Room/resource allocation UI richer  | Low      | P2    |
| Transport fleet integration         | Medium   | P2    |
| Driver app (mobile)                 | Medium   | P2    |
| Auto-buffer between sessions        | Low      | P1    |

---

### BC-06: Finance & Accounting

#### ✅ موجود (Current 3)

- Invoice, Payment, ZATCA Phase 2 partial
- Chart of accounts, Journal entries
- GOSI, Qiwa routes
- Multiple payment gateways in deps

#### ⚠️ Gaps

| Gap                                                    | Severity | Phase |
| ------------------------------------------------------ | -------- | ----- |
| ZATCA chain integrity check                            | Critical | P1    |
| Contract lifecycle (draft → signed → active → expired) | Medium   | P1    |
| Insurance claims full flow (Wasel)                     | High     | P1    |
| IFRS compliant reporting                               | Medium   | P2    |
| Budget vs actual dashboard                             | Medium   | P2    |
| AR aging + collections                                 | Medium   | P1    |
| Multi-currency (for international)                     | Low      | P3    |
| Cash flow forecasting                                  | Medium   | P2    |

---

### BC-07: Human Resources

#### ✅ موجود (Current 3)

- Employee model
- Attendance + biometric route
- Payroll route
- Credential fields on Employee
- Performance reviews

#### ⚠️ Gaps

| Gap                              | Severity | Phase |
| -------------------------------- | -------- | ----- |
| Credential expiry → system block | High     | P1    |
| HRDF integration                 | Medium   | P2    |
| MoHRSD reporting                 | Medium   | P2    |
| Recruitment ATS                  | Low      | P3    |
| Succession planning tooling      | Low      | P3    |
| Saudization ratio tracking       | Medium   | P2    |
| Training matrix per role         | Medium   | P2    |

---

### BC-08: Quality & Compliance

#### ⚠️ موجود ضعيف (Current 2)

- Incident routes partial
- Audit logs exist
- Approval requests model

#### ⚠️ Gaps (كثيرة)

| Gap                                      | Severity     | Phase |
| ---------------------------------------- | ------------ | ----- |
| PDPL program (consent, rights, DPO)      | **Critical** | P1    |
| CBAHI evidence library + mapping         | High         | P1    |
| CAPA lifecycle management                | High         | P1    |
| Risk register digital                    | High         | P1    |
| Policy library + acknowledgment tracking | Medium       | P1    |
| Internal audit workflow                  | Medium       | P2    |
| Quality KPI dashboard                    | Medium       | P1    |
| Regulatory reporting automation          | Medium       | P2    |
| Near-miss reporting encouraged           | Medium       | P2    |

---

### BC-09: CRM & Beneficiary Relations

#### ✅ موجود (Current 3)

- Complaints routes
- Feedback service
- Communication history
- Some campaigns

#### ⚠️ Gaps

| Gap                                 | Severity | Phase |
| ----------------------------------- | -------- | ----- |
| Complaint SLA tracking + escalation | High     | P1    |
| NPS structured tracking             | Medium   | P2    |
| Survey builder + distribution       | Medium   | P2    |
| Complaints analytics + trends       | Medium   | P2    |
| Root cause tagging on complaints    | Medium   | P2    |
| Customer 360 view                   | Medium   | P2    |

---

### BC-10: Document Management

#### ✅ موجود (Current 3)

- Document routes
- E-signature route infrastructure
- S3 integration
- PDF generation
- Archive directory

#### ⚠️ Gaps

| Gap                                           | Severity | Phase |
| --------------------------------------------- | -------- | ----- |
| Nafath e-signature                            | Critical | P1    |
| Retention policy engine (auto-archive)        | High     | P1    |
| OCR + full-text search                        | Medium   | P2    |
| Document watermarking                         | Medium   | P2    |
| Multi-signer workflow (parallel + sequential) | High     | P1    |
| Access control per document UI                | Medium   | P2    |
| Version diff viewer                           | Low      | P3    |

---

### BC-11: Communications & Notifications

#### ✅ موجود (Current 3)

- Email (SendGrid + SMTP)
- SMS (Twilio)
- WhatsApp (Twilio)
- In-app (Socket.IO)
- Admin communications + directives routes
- Notification triggers partial

#### ⚠️ Gaps

| Gap                                       | Severity | Phase |
| ----------------------------------------- | -------- | ----- |
| Unified preference center                 | High     | P2    |
| Template manager (bilingual) UI           | Medium   | P2    |
| Delivery receipt tracking unified         | Medium   | P2    |
| WhatsApp migration (Twilio → Meta direct) | Medium   | P2    |
| Push notification infra (FCM/APNs)        | Medium   | P1    |
| Opt-in tracking per PDPL                  | High     | P1    |

---

### BC-12: Government Integrations

#### ⚠️ موجود ضعيف (Current 2)

- ZATCA Phase 2 partial
- GOSI
- Qiwa
- Disability Authority partial

#### 🔴 Gaps (الأكبر)

| Gap                           | Severity     | Phase  |
| ----------------------------- | ------------ | ------ |
| Nafath (e-sign)               | **Critical** | **P1** |
| Absher (ID verification)      | **Critical** | **P1** |
| Yakeen (civil registry)       | **Critical** | **P1** |
| Wasel/CHI (insurance)         | **Critical** | **P1** |
| Madaa (salary cards)          | High         | P1     |
| Etimad (document attestation) | Low          | P2     |
| HRDF (Hadaf)                  | Medium       | P2     |
| MoHRSD reporting              | Medium       | P2     |
| MoH FHIR interop              | Low          | P3     |
| Saudi Post national address   | Medium       | P2     |
| ZATCA chain integrity         | **Critical** | **P1** |

---

### BC-13: Analytics & Executive BI

#### ⚠️ موجود ضعيف (Current 2)

- Multiple dashboards (CEO, Admin, Branch, Analytics, BI, Branch Analytics)
- Analytics services
- Some KPIs

#### 🔴 Gaps

| Gap                                                  | Severity | Phase |
| ---------------------------------------------------- | -------- | ----- |
| KPI framework canonical (50 KPIs)                    | Critical | P1    |
| Dashboard unification (6 disparate → 1 configurable) | High     | P2    |
| Data lake / warehouse                                | Medium   | P3    |
| Real-time analytics                                  | Medium   | P3    |
| Ad-hoc query builder                                 | Medium   | P3    |
| Power BI / Tableau integration                       | Low      | P3    |
| Predictive analytics (beyond AI assessment)          | Medium   | P3    |
| Alerts on KPI deviations                             | High     | P1-P2 |

---

### BC-14: Supply, Assets, Fleet

#### ✅ موجود (Current 3)

- Inventory routes
- Asset, Maintenance models
- Vehicle + fleet routes
- PurchaseOrder

#### ⚠️ Gaps

| Gap                             | Severity | Phase |
| ------------------------------- | -------- | ----- |
| Preventive maintenance schedule | Medium   | P2    |
| CMMS full workflow              | Medium   | P2    |
| IoT sensors for equipment       | Low      | P3    |
| Vendor portal                   | Low      | P3    |
| Fleet live tracking             | Medium   | P2    |
| Fuel consumption analytics      | Low      | P3    |

---

## 4. ملاحظات عبر الوحدات (Cross-Cutting)

### 4.1 Code Quality Debt

| البند                          | الحالة                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| Test suite                     | 20,179 pass, 536 phantom → P0                              |
| ESLint warnings                | 545 (frontend) → fix via `--fix`                           |
| Duplicate models               | CarePlan × TherapeuticPlan × MedicalCarePlan → consolidate |
| Archived routes still mounted? | Verify + clean                                             |
| Redis degradation path         | ✅ exists                                                  |

### 4.2 Documentation

| البند                       | الحالة                               |
| --------------------------- | ------------------------------------ |
| API documentation (Swagger) | Partial — needs complete OpenAPI 3.0 |
| Runbooks for ops            | Partial — needs per-service          |
| Architecture diagrams       | Partial — this blueprint fills gap   |
| Developer onboarding        | Partial — needs 2-day tutorial       |

### 4.3 Observability

| البند                  | الحالة             |
| ---------------------- | ------------------ |
| Logs (Winston)         | ✅ Structured      |
| Metrics (Prometheus)   | ✅ Basic           |
| Traces (OpenTelemetry) | Partial            |
| Business metrics       | ❌ Need definition |
| SLI/SLO/SLA formal     | ❌ P1              |

### 4.4 Testing

| البند            | الحالة                        |
| ---------------- | ----------------------------- |
| Unit (Jest)      | Strong                        |
| Integration      | Medium                        |
| E2E (Cypress)    | Basic                         |
| Load testing     | Scripts exist                 |
| Security testing | Manual — needs auto SAST/DAST |
| Accessibility    | ❌ P2                         |

---

## 5. Priority Matrix (Impact × Effort)

```
    High Impact
         │
  ┌──────┼──────┐
  │      │      │
  │  Q4  │  Q1  │
  │ High │ Do   │
  │Effort│ First│
  │      │      │
  ├──────┼──────┤
  │      │      │
  │  Q3  │  Q2  │
  │ Low  │ Do   │
  │Effort│Second│
  │      │      │
  └──────┴──────┘
         │
    Low Impact
    │
    Low Effort  ──────▶  High Effort
```

### Q1 — Do First (High Impact, Low-Medium Effort)

- ✅ Nafath integration
- ✅ ABAC 5 core rules
- ✅ ZATCA chain integrity
- ✅ Credential expiry block
- ✅ Archive phantom tests

### Q2 — Do Second (High Impact, High Effort)

- ✅ PDPL full program
- ✅ KPI framework + dashboard
- ✅ Parent mobile app
- ✅ AI Assessment Assistant

### Q3 — Fill In (Low Impact, Low Effort)

- 📋 ESLint warnings
- 📋 OpenAPI docs
- 📋 Runbooks
- 📋 Accessibility quick wins

### Q4 — Defer (Low Impact, High Effort)

- ⏸️ Multi-region DR
- ⏸️ Full event sourcing
- ⏸️ FHIR readiness
- ⏸️ Microservices split

---

## 6. Build vs Buy

| البند          | Build | Buy                      | Hybrid            | توصية                                  |
| -------------- | ----- | ------------------------ | ----------------- | -------------------------------------- |
| ABAC engine    | ✅    | OPA                      |                   | Build first, migrate to OPA if complex |
| Nafath signer  |       | ✅ (Nafath)              |                   | Buy                                    |
| Observability  |       | ✅ (DataDog)             | Open-source combo | Hybrid (Prometheus + Sentry)           |
| E-mail         |       | ✅ (SendGrid)            |                   | Buy                                    |
| Chatbot LLM    |       | ✅ (Claude)              |                   | Buy API, build prompts                 |
| Payroll        | ✅    |                          |                   | Build (compliance-specific)            |
| CRM            | ✅    | Salesforce (too heavy)   |                   | Build (integrated)                     |
| DMS            | ✅    | M-Files (expensive)      |                   | Build (tighter integration)            |
| Data Warehouse |       | ✅ (Snowflake in future) |                   | Defer P4                               |

---

## 7. Decision Log (قرارات تحتاج اعتماد)

| #    | Decision                   | Options                                    | توصية                        |
| ---- | -------------------------- | ------------------------------------------ | ---------------------------- |
| D-01 | ABAC Engine                | Custom / OPA                               | Custom first                 |
| D-02 | E-Sign                     | Nafath only / DocuSign+Nafath              | Nafath only (Saudi-first)    |
| D-03 | BI Tool                    | Build / Power BI / Metabase                | Build v1, evaluate PBI at P3 |
| D-04 | Mobile stack               | React Native (existing) / Flutter / Native | Continue RN                  |
| D-05 | Microservices split timing | Now / P4 / Never                           | Defer to P4 (monolith works) |
| D-06 | Multi-region DR            | Active-passive / Active-active             | Active-passive P4            |
| D-07 | WhatsApp Provider          | Twilio / Meta Cloud                        | Migrate to Meta at P2        |
| D-08 | Chatbot Model              | Claude / GPT-4 / Both                      | Claude primary, GPT fallback |

---

## 8. Investment Required (نسبي)

| Area                  | Relative Spend           |
| --------------------- | ------------------------ |
| Gov Integrations (P1) | 🔥🔥🔥 (highest urgency) |
| PDPL + Compliance     | 🔥🔥🔥                   |
| ABAC + Security       | 🔥🔥                     |
| Mobile Apps           | 🔥🔥                     |
| AI Features           | 🔥🔥                     |
| BI Platform           | 🔥                       |
| DevEx / Quality       | 🔥                       |
| Microservices (P4)    | Deferred                 |

---

## 9. Roll-up View

**Maturity today: 3.0 / 5**
**Target (end of P2): 4.6 / 5**
**Target (end of P3): 4.8 / 5**
**Stretch (end of P4): 5.0 / 5**

Biggest gaps clustered in:

1. **Gov Integrations** (Nafath, Absher, Yakeen, Wasel, Madaa)
2. **Compliance** (PDPL, CBAHI evidence, CAPA)
3. **Analytics** (KPI framework, unified dashboard)

Biggest strengths:

1. **Rehab Service Delivery** (76+ services, AI-ready)
2. **Multi-Branch Governance** (unified recently)
3. **Security baseline** (RBAC, audit, helmet, ...)

---

## 10. التالي

- **[README.md](README.md)** — الفهرس الرئيسي.
- **Next step:** اعتماد الخطة من CTO + CMO + CQO + CFO، ثم بدء P0.
