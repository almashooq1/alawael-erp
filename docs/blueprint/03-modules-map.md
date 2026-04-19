# 03 — Modules Map | خريطة الوحدات

> كل Bounded Context مقسّم إلى وحدات (Modules) مع APIs + UI + Owner

---

## الاصطلاح

كل وحدة تُوصف بـ:

- **Name** — الاسم الكنسي
- **BC** — السياق المحدود
- **Responsibility** — المسؤولية الأساسية
- **APIs** — الأطراف التي تُعرضها
- **UI** — الواجهات المرتبطة
- **Consumes** — events/APIs تستهلكها
- **Produces** — events تنتجها

---

## BC-01: Identity & Access Management

### M-01.1 — Authentication Module

- **Responsibility:** تسجيل الدخول، MFA، OAuth2/OIDC، password reset
- **APIs:** `/api/auth/login`, `/api/auth/refresh`, `/api/auth/mfa`, `/api/auth/sso/nafath`
- **UI:** Login Page, MFA Setup, SSO Redirect
- **Consumes:** Nafath OIDC
- **Produces:** `LoginSucceeded`, `LoginFailed`, `MfaChallengeSucceeded`

### M-01.2 — User Management

- **Responsibility:** CRUD للمستخدمين + التفعيل/التعليق
- **APIs:** `/api/users`, `/api/users/:id/reset-password`, `/api/users/:id/suspend`
- **UI:** User Admin Panel
- **Consumes:** —
- **Produces:** `UserCreated`, `UserUpdated`, `UserSuspended`

### M-01.3 — RBAC Module

- **Responsibility:** إدارة الأدوار والصلاحيات
- **APIs:** `/api/rbac/roles`, `/api/rbac/permissions`, `/api/rbac/assign`
- **UI:** Role Manager, Permission Matrix
- **Produces:** `RoleAssigned`, `PermissionGranted`

### M-01.4 — ABAC Policy Engine _(P1 — To Build)_

- **Responsibility:** تقييم قواعد ABAC (subject, resource, action, environment)
- **APIs:** `/api/abac/evaluate` (internal), `/api/abac/policies`
- **UI:** Policy Editor

### M-01.5 — API Keys & Service Accounts

- **Responsibility:** مفاتيح للتكاملات الخارجية
- **APIs:** `/api/api-keys`
- **UI:** API Keys Admin

### M-01.6 — Audit Log Viewer

- **Responsibility:** عرض وبحث سجل المصادقة
- **APIs:** `/api/audit/auth-logs`
- **UI:** Audit Trail Page

---

## BC-02: Multi-Branch Governance

### M-02.1 — Branch Registry

- **APIs:** `/api/branches`
- **UI:** Branch Admin (HQ only)
- **Produces:** `BranchCreated`, `BranchActivated`

### M-02.2 — Department Management

- **APIs:** `/api/branches/:id/departments`
- **UI:** Department Tree View

### M-02.3 — Org Structure

- **APIs:** `/api/org-structure`
- **UI:** Org Chart

### M-02.4 — Branch License Management

- **APIs:** `/api/branches/:id/licenses`
- **UI:** License Dashboard (MoH, CBAHI)
- **Produces:** `LicenseExpiring` (30d, 7d)

### M-02.5 — Cross-Branch Delegation _(P1)_

- **Responsibility:** منح صلاحيات مؤقتة عبر فروع
- **APIs:** `/api/delegations`
- **UI:** Delegation Wizard

---

## BC-03: Clinical Core (EMR)

### M-03.1 — Beneficiary Registry

- **APIs:** `/api/beneficiaries` (CRUD + search + merge)
- **UI:** Beneficiary 360 Page (profile + history timeline)
- **Produces:** `BeneficiaryRegistered`

### M-03.2 — Intake / Admission

- **APIs:** `/api/intake`, `/api/intake/:id/accept`, `/api/intake/:id/reject`
- **UI:** Intake Form (public + internal variants)
- **Consumes:** Yakeen verification
- **Produces:** `IntakeSubmitted`, `IntakeAccepted`

### M-03.3 — Medical History & Diagnoses

- **APIs:** `/api/beneficiaries/:id/medical-history`, `/api/diagnoses`
- **UI:** Medical History Timeline

### M-03.4 — Assessment Engine

- **Subjects:** ICF, Bayley, Vineland, GMFCS, Peabody, M-CHAT, CARS-2, Conners
- **APIs:** `/api/assessments/templates`, `/api/assessments` (CRUD + scoring)
- **UI:** Assessment Forms (per type)
- **Produces:** `AssessmentCompleted`

### M-03.5 — Clinical Notes

- **APIs:** `/api/clinical-notes`
- **UI:** Rich text editor + templates

### M-03.6 — Referrals

- **APIs:** `/api/referrals` (internal + external)
- **UI:** Referral Form + Inbox
- **Produces:** `ReferralCreated`, `ReferralAccepted`

### M-03.7 — Care Plan (Medical)

- **Note:** مختلف عن IRP — هذا للرعاية الطبية (أدوية، متابعة طبية)
- **APIs:** `/api/care-plans`
- **UI:** Care Plan Builder

---

## BC-04: Rehab Service Delivery

### M-04.1 — IRP Builder

- **Responsibility:** إنشاء خطة تأهيل فردية متكاملة
- **APIs:** `/api/irp`, `/api/irp/:id/approve`, `/api/irp/:id/review`
- **UI:** IRP Wizard (multi-step: assessment → domains → goals → services → team)
- **Consumes:** `AssessmentCompleted` from BC-03
- **Produces:** `IRPCreated`, `IRPApproved`, `IRPCompleted`

### M-04.2 — Goal Bank & SMART Goals

- **APIs:** `/api/goal-bank` (pre-built), `/api/irp/:id/goals`
- **UI:** Goal Picker + Custom Goal Editor
- **Produces:** `GoalAdded`, `GoalAchieved`

### M-04.3 — Therapy Programs Catalog

- **Subjects:** ABA, PT, OT, Speech, Art, Music, Cognitive, Early Intervention, Vocational
- **APIs:** `/api/programs`
- **UI:** Program Catalog

### M-04.4 — Session Management

- **APIs:** `/api/sessions` (schedule, start, complete, cancel), `/api/sessions/:id/notes`
- **UI:** Session Scheduler + Session Capture (therapist)
- **Produces:** `SessionScheduled`, `SessionCompleted`, `NoShow`

### M-04.5 — Progress Measurement

- **APIs:** `/api/progress-measurements`, `/api/irp/:id/progress-summary`
- **UI:** Progress Charts (trend), Measurement Forms
- **Produces:** `ProgressMeasured`

### M-04.6 — Outcome Reports

- **APIs:** `/api/outcome-reports` (auto-generated from IRP + sessions)
- **UI:** PDF preview + customization

### M-04.7 — Tele-Rehab (Virtual Sessions)

- **APIs:** `/api/tele-sessions`, Zoom/Meet integration
- **UI:** Virtual Session Room + recording

### M-04.8 — AI Assessment Assistant _(P2)_

- **Responsibility:** توصيات AI للخطط والأهداف
- **APIs:** `/api/ai/assessment-suggestions`, `/api/ai/goal-recommendations`
- **UI:** AI Suggestion Panel (in IRP Wizard)

---

## BC-05: Scheduling & Operations

### M-05.1 — Appointment Scheduler

- **APIs:** `/api/appointments`
- **UI:** Calendar (day/week/month) + resource view
- **Consumes:** `IRPApproved` → auto-schedule initial sessions

### M-05.2 — Room & Resource Allocation

- **APIs:** `/api/rooms`, `/api/resources`
- **UI:** Room Map + Resource Booking

### M-05.3 — Therapist Schedule

- **APIs:** `/api/therapists/:id/schedule`
- **UI:** Therapist Weekly View + availability settings

### M-05.4 — Shift Roster

- **APIs:** `/api/shifts/rosters`
- **UI:** Shift Planner (drag-drop)

### M-05.5 — Smart Scheduling Engine

- **Responsibility:** optimization (greedy + constraints)
- **APIs:** `/api/scheduling/optimize`
- **UI:** Run Optimizer button + diff view

### M-05.6 — Transportation (Fleet Ops)

- **APIs:** `/api/transport/trips`, `/api/vehicles`
- **UI:** Trip Planner + Driver App (mobile)

---

## BC-06: Finance & Accounting

### M-06.1 — Invoicing

- **APIs:** `/api/invoices`, `/api/invoices/:id/zatca-submit`
- **UI:** Invoice Builder + List
- **Produces:** `InvoiceIssued`

### M-06.2 — Payments

- **APIs:** `/api/payments`, `/api/payment-gateways/webhook`
- **UI:** Payment Capture (cash/card/transfer)
- **Integration:** Mada, HyperPay, STC Pay, Stripe

### M-06.3 — Contracts & Pricing

- **APIs:** `/api/contracts`, `/api/pricing-plans`
- **UI:** Contract Wizard + Pricing Matrix

### M-06.4 — Insurance Claims

- **APIs:** `/api/insurance-claims`
- **UI:** Claim Builder + Status Tracker
- **Integration:** CHI (Wasel) + providers

### M-06.5 — Chart of Accounts & Journal

- **APIs:** `/api/accounts`, `/api/journal-entries`
- **UI:** GL Explorer + Trial Balance

### M-06.6 — Budgeting

- **APIs:** `/api/budgets`
- **UI:** Budget Setup + Variance Dashboard

### M-06.7 — ZATCA E-Invoicing

- **APIs:** `/api/zatca/submit`, `/api/zatca/logs`
- **UI:** ZATCA Monitor + Manual Retry

### M-06.8 — Payroll Interface _(shared with BC-07)_

- **APIs:** `/api/payroll/disburse` → bank/Madaa

### M-06.9 — Financial Reports

- **APIs:** `/api/finance/reports/pl`, `/api/finance/reports/bs`, `/api/finance/reports/cashflow`
- **UI:** P&L, Balance Sheet, Cash Flow (per branch + consolidated)

---

## BC-07: Human Resources

### M-07.1 — Employee Registry

- **APIs:** `/api/employees`
- **UI:** Employee 360 Page

### M-07.2 — Recruitment & Onboarding

- **APIs:** `/api/recruitment/jobs`, `/api/recruitment/applications`, `/api/onboarding`
- **UI:** Job Postings + Applicant Tracker + Onboarding Checklist

### M-07.3 — Attendance & Biometric

- **APIs:** `/api/attendance/check-in`, `/api/attendance/report`
- **UI:** Attendance Dashboard, Biometric Kiosk integration
- **Produces:** `AttendanceRecorded`

### M-07.4 — Leave Management

- **APIs:** `/api/leave-requests`
- **UI:** Leave Request Form + Balances + Approval

### M-07.5 — Payroll Processing

- **APIs:** `/api/payroll/runs`, `/api/payroll/slips`
- **UI:** Payroll Run + Slip Review + Approval Chain
- **Integration:** GOSI + Qiwa + Madaa

### M-07.6 — Performance Reviews

- **APIs:** `/api/performance-reviews`
- **UI:** Review Forms (self + manager + 360°)

### M-07.7 — Credentials & Licensing

- **APIs:** `/api/credentials`
- **UI:** Credentials Register + Expiry Alerts
- **Produces:** `CredentialExpiring`

### M-07.8 — Training & Development

- **APIs:** `/api/training/programs`, `/api/training/enrollments`
- **UI:** Training Catalog + Progress

### M-07.9 — HR Analytics

- **APIs:** `/api/hr/analytics`
- **UI:** Turnover, Headcount, Diversity dashboards

---

## BC-08: Quality & Compliance

### M-08.1 — Incident Management

- **APIs:** `/api/incidents`
- **UI:** Incident Form + Investigation Board (Kanban)
- **Produces:** `IncidentReported`

### M-08.2 — Risk Register

- **APIs:** `/api/risks`
- **UI:** Risk Matrix (heat map)

### M-08.3 — CAPA

- **APIs:** `/api/capa`
- **UI:** CAPA Tracker

### M-08.4 — Internal Audits

- **APIs:** `/api/audits/internal`
- **UI:** Audit Planner + Findings + Closure

### M-08.5 — Compliance Register (CBAHI, PDPL, MoH)

- **APIs:** `/api/compliance/standards`, `/api/compliance/evidence`
- **UI:** Standard Mapping (checkboxes) + Evidence Uploads

### M-08.6 — Policies & SOPs

- **APIs:** `/api/policies`, `/api/sops`
- **UI:** Policy Library + Acknowledgment Tracking

### M-08.7 — Quality KPIs

- **APIs:** `/api/quality/kpis`
- **UI:** Quality Dashboard

---

## BC-09: CRM & Beneficiary Relations

### M-09.1 — Complaint Management

- **APIs:** `/api/complaints`
- **UI:** Complaint Ticket System (Kanban + SLA)
- **Produces:** `ComplaintEscalated` (if SLA breach)

### M-09.2 — Satisfaction Surveys

- **APIs:** `/api/surveys`, `/api/surveys/:id/responses`
- **UI:** Survey Builder + Distribution (email/WA) + Results

### M-09.3 — NPS / CSAT

- **APIs:** `/api/nps`
- **UI:** NPS Dashboard

### M-09.4 — Interaction History

- **APIs:** `/api/interactions`
- **UI:** Unified Timeline per Beneficiary

### M-09.5 — Marketing Campaigns _(P2)_

- **APIs:** `/api/campaigns`
- **UI:** Campaign Builder + Analytics

### M-09.6 — Lead Management _(P2 — optional)_

- للاستقطاب (مستفيدين محتملين)

---

## BC-10: Document Management

### M-10.1 — Document Repository

- **APIs:** `/api/documents`
- **UI:** DMS Explorer (folder tree + search)

### M-10.2 — Versioning

- **APIs:** `/api/documents/:id/versions`
- **UI:** Version History

### M-10.3 — E-Signature

- **APIs:** `/api/signatures/request`, `/api/signatures/:id/sign`
- **UI:** Signature Pad + Multi-signer Flow
- **Integration:** Nafath for Saudi nationals

### M-10.4 — Retention & Archival

- **APIs:** `/api/retention-policies`
- **UI:** Retention Manager (15y clinical, 10y financial)

### M-10.5 — Document Search (OCR + Full-text)

- **APIs:** `/api/documents/search`
- **UI:** Advanced Search UI

---

## BC-11: Communications & Notifications

### M-11.1 — Notification Dispatcher

- **APIs:** `/api/notifications` (internal, triggered by events)
- **UI:** Notification Center (bell icon)

### M-11.2 — Email Service

- **Integration:** SendGrid / SMTP
- **Templates:** AR + EN

### M-11.3 — SMS Gateway

- **Integration:** Twilio / Unifonic

### M-11.4 — WhatsApp Business

- **Integration:** Twilio / Meta WA Cloud
- **UI:** WhatsApp Conversation Panel (customer service)

### M-11.5 — Push Notifications

- **Integration:** FCM (Android) + APNs (iOS)

### M-11.6 — In-App Notifications (real-time)

- **Integration:** Socket.IO

### M-11.7 — Template Manager

- **APIs:** `/api/notification-templates`
- **UI:** Template Editor (with variables)

### M-11.8 — Preferences Center

- **APIs:** `/api/users/:id/notification-preferences`
- **UI:** Opt-in/out UI + channel preferences

---

## BC-12: Government Integrations

### M-12.1 — ZATCA Adapter _(exists)_

### M-12.2 — GOSI Adapter _(exists)_

### M-12.3 — Qiwa Adapter _(exists)_

### M-12.4 — Nafath Adapter _(P1 — to build)_

### M-12.5 — Absher Adapter _(P1 — to build)_

### M-12.6 — Yakeen Adapter _(P1 — to build)_

### M-12.7 — Etimad Adapter _(P2)_

### M-12.8 — Wasel/CHI Adapter _(P1)_

### M-12.9 — Madaa Adapter _(P1)_

### M-12.10 — HRDF Adapter _(P2)_

### M-12.11 — MoHRSD Adapter _(P2)_

### M-12.12 — CBAHI Reports _(exists partial)_

### M-12.13 — MoH/Disability Authority Adapter _(exists partial)_

### M-12.14 — SCFHS Adapter + CPE Tracking _(exists — shipped 4.0.10)_

Healthcare-practitioner licensing + continuing education. Two
connected surfaces:

- **License verification** — `scfhsAdapter.js` returns status /
  classification / specialty / expiryDate → Employee.scfhs_verification.
- **CPE credits** — `CpeRecord` model + `cpeService.js` pure-math
  summary + `cpe-admin.routes.js` 9 endpoints mounted at
  `/api/admin/hr/cpe`. 5-year rolling cycle, 50/30/20 per-category
  minimums + 100 total, env-tunable via `SCFHS_CPE_MIN_*`.

Cron: `npm run cpe:attention` (exit 0/1/2 contract) for daily HR
digest. CSV export for SCFHS audit requests. Cross-reference:
[HR_COMPLIANCE_GUIDE.md](../HR_COMPLIANCE_GUIDE.md).

**Common Pattern لكل adapter:**

- Config (endpoint, credentials, certs)
- Client (HTTP wrapper with retry + circuit breaker)
- Mapper (internal → external schema)
- Log (every request/response for audit)
- Fallback/queue (when external is down)

---

## BC-13: Analytics & Executive BI

### M-13.1 — KPI Definitions Registry

- **APIs:** `/api/kpis`
- **UI:** KPI Catalog + Formula Editor

### M-13.2 — Metrics Computation Engine

- **APIs:** internal (scheduled jobs)
- **Storage:** Materialized Views + caches

### M-13.3 — Executive Dashboard (C-Suite)

- **UI:** CEO/CFO/COO/CHRO/CQO dashboards
- **Refresh:** hourly

### M-13.4 — Branch Performance Dashboard

- **UI:** per-branch deep dive

### M-13.5 — Clinical Outcomes Analytics

- **UI:** IRP success rate, goal achievement rate, discharge outcomes

### M-13.6 — Financial Analytics

- **UI:** Revenue, AR aging, payer mix, profitability per branch/program

### M-13.7 — Smart Alerts Engine _(P2)_

- **APIs:** `/api/alerts` (rules + triggers)
- **UI:** Alert Rule Builder + Active Alerts Feed

### M-13.8 — Scheduled Reports

- **APIs:** `/api/reports/scheduled`
- **UI:** Report Scheduler (daily/weekly/monthly)

### M-13.9 — Data Export API _(for BI tools)_

- **APIs:** `/api/data/export/:dataset` (for Power BI / Tableau / Metabase)

---

## BC-14: Supply, Assets, Fleet

### M-14.1 — Inventory Management

- **APIs:** `/api/inventory`, `/api/inventory/items`
- **UI:** Inventory Dashboard + Stock Movements

### M-14.2 — Warehouse Management

- **APIs:** `/api/warehouses`
- **UI:** Warehouse Map

### M-14.3 — Procurement

- **APIs:** `/api/purchase-orders`, `/api/suppliers`
- **UI:** PO Builder + Approval Chain + Vendor Portal

### M-14.4 — Asset Register

- **APIs:** `/api/assets`
- **UI:** Asset List + Depreciation Schedule

### M-14.5 — Maintenance Management (CMMS)

- **APIs:** `/api/maintenance/tasks`, `/api/maintenance/preventive-plans`
- **UI:** Maintenance Calendar + Work Orders

### M-14.6 — Fleet Management

- **APIs:** `/api/fleet/vehicles`, `/api/fleet/drivers`, `/api/fleet/fuel-logs`
- **UI:** Fleet Dashboard + Driver App (mobile)

### M-14.7 — IoT & Sensors _(P3)_

- **APIs:** `/api/iot/sensors`
- **UI:** IoT Dashboard (temperature, door sensors, wearables)

---

## Portals (واجهات المستخدم حسب الدور)

| Portal                              | Audience | Primary Modules                                      |
| ----------------------------------- | -------- | ---------------------------------------------------- |
| **Admin Console** (web)             | L1-L3    | كل الوحدات                                           |
| **Executive Portal**                | L2       | BC-13 (Dashboards) + strategic reports               |
| **Branch Manager Portal**           | L3       | Branch-scoped view of all BCs                        |
| **Clinical Supervisor Workbench**   | L4       | BC-03, BC-04, BC-08                                  |
| **Therapist App** (web + mobile)    | L5       | Session delivery, note-taking, progress              |
| **Receptionist Desk**               | L5       | BC-05 (scheduling), BC-03 (intake), BC-06 (payments) |
| **HR Self-Service**                 | L3-L5    | BC-07 (attendance, leave, slips)                     |
| **Parent/Guardian App** (mobile)    | L6       | View progress, schedule, pay invoice, chat           |
| **Beneficiary Portal (accessible)** | L6       | Own assessments + schedule (adaptive UI)             |
| **Vendor Portal**                   | external | BC-14 (PO acceptance, delivery confirmation)         |
| **Driver App**                      | L5       | BC-05 (trips) + BC-14 (fleet)                        |
| **Public Intake Form**              | E4       | BC-03 intake (tokenized, no login)                   |

---

## مطابقة مع الحالة الراهنة

- ✅ **موجود**: BC-01..BC-14 موجودة بدرجات نضج مختلفة.
- ⚠️ **ضعيف**: BC-12 (نصف التكاملات)، BC-13 (KPIs غير موحدة)، BC-01 M-01.4 (لا ABAC).
- 🆕 **مُقترح**: M-04.8 (AI Assessment)، M-13.7 (Smart Alerts)، M-14.7 (IoT).

راجع [10-gap-analysis.md](10-gap-analysis.md) للفجوات التفصيلية.
