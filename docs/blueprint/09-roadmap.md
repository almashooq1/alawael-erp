# 09 — Phased Roadmap | خارطة الطريق المرحلية

> 6 مراحل تنفيذية + KPIs + معايير الخروج من كل مرحلة

---

## 1. النظرة العامة

```
Phase P0 — Stabilize                        (0–4 أسابيع)
         │
         ▼
Phase P1 — Foundation Hardening             (4–12 أسبوع)
         │
         ▼
Phase P2 — Unified Portals & Experience     (2–3 أشهر بعد P1)
         │
         ▼
Phase P3 — Intelligence & Automation        (3–4 أشهر بعد P2)
         │
         ▼
Phase P4 — Scale & Decoupling (optional)    (4–6 أشهر بعد P3)
         │
         ▼
Phase P5 — Continuous Improvement           (دائم)
```

**Total estimated:** 12-18 شهراً للوصول لمنصة ناضجة.

---

## 2. Phase P0 — Stabilize (التثبيت)

### 2.1 الهدف

تنظيف الدَّين التقني المتراكم + توثيق الأساس قبل البناء.

### 2.2 المدة

0–4 أسابيع.

### 2.3 Deliverables

#### P0.1 — تنظيف الاختبارات (Phantom Tests)

- **Scope:** أرشفة 536 اختبار يتيم (الخدمات المحذوفة)
- **Owner:** Platform Team
- **Effort:** 3 أيام
- **Reference:** [docs/audits/phantom-tests-2026-04-16.md](../audits/phantom-tests-2026-04-16.md)
- **Exit:** Test suite fails go from 485 → < 50

#### P0.2 — Canonical Data Model Document

- **Scope:** مراجعة [04-data-domains.md](04-data-domains.md) مع clinical + business
- **Owner:** Enterprise Architect + Clinical Lead + CFO
- **Effort:** 2 أسابيع
- **Exit:** Signed-off canonical model

#### P0.3 — Architecture Decision Records (ADRs)

**ADRs to write:**

- ADR-004: Multi-Tenant Isolation Strategy
- ADR-005: Canonical Role System (6-level hierarchy)
- ADR-006: Event-Driven Integration Bus
- ADR-007: PDPL Compliance Baseline
- ADR-008: E-Signature Strategy (Nafath)
- ADR-009: Audit Trail Standard
- **Owner:** Enterprise Architect
- **Effort:** 2 أسابيع (parallel)
- **Exit:** All ADRs in `docs/architecture/decisions/`

#### P0.4 — Audit Trail Hardening

- **Scope:** أكّد أن كل endpoint حساس مُدرَج في audit
- **Owner:** Platform Security
- **Effort:** 1 أسبوع
- **Exit:** Coverage report: 100% of write endpoints audited

#### P0.5 — Gap Analysis Approval

- **Scope:** مراجعة [10-gap-analysis.md](10-gap-analysis.md) مع stakeholders
- **Owner:** CTO + CMO + CQO
- **Effort:** 3 أيام workshop
- **Exit:** Prioritized backlog approved

### 2.4 KPIs for P0

| KPI                                    | Target        |
| -------------------------------------- | ------------- |
| Test suite failure rate                | < 3%          |
| ADR count                              | ≥ 9 total     |
| Endpoints with audit coverage          | 100% (writes) |
| Documentation completeness (blueprint) | 100%          |

### 2.5 Exit Criteria

- [x] Blueprint documents published
- [ ] 536 phantom tests archived
- [ ] 6 ADRs written + reviewed
- [ ] Gap analysis approved by leadership
- [ ] Backlog prioritized

---

## 3. Phase P1 — Foundation Hardening (تقوية الأساس)

### 3.1 الهدف

بناء كل الركائز الأساسية (ABAC, PDPL, Gov Integrations الحرجة, KPI Framework).

### 3.2 المدة

12 أسبوع (3 أشهر).

### 3.3 Deliverables

#### P1.1 — ABAC Policy Engine

- **Scope:** PDP/PEP pattern، 5-10 قواعد ABAC أساسية (caseload, cross-branch, sensitive access)
- **Owner:** Platform Security
- **Effort:** 4 أسابيع
- **Reference:** [05-role-matrix.md §7](05-role-matrix.md#7-abac-engine-implementation-outline)
- **Exit:** ABAC engine online, 10 rules running, test coverage 90%+

#### P1.2 — PDPL Compliance Program

- **Scope:**
  - Consent management (consent record + versioning)
  - Data subject rights workflow (access, rectify, delete, restrict)
  - DPO appointment + charter
  - Privacy notice (AR + EN)
  - Breach notification procedure
- **Owner:** DPO + Legal
- **Effort:** 6 أسابيع
- **Exit:** PDPL self-assessment score ≥ 90%

#### P1.3 — Nafath Integration (توقيع رقمي)

- **Scope:** ACL + UI + multi-signer flow
- **Owner:** Integrations
- **Effort:** 4 أسابيع
- **Exit:** Sign IRPs, contracts, policies via Nafath

#### P1.4 — Absher + Yakeen Integration

- **Scope:** identity verification للـ intake
- **Owner:** Integrations
- **Effort:** 3 أسابيع
- **Exit:** Automatic identity verification on intake

#### P1.5 — Wasel/CHI Insurance

- **Scope:** coverage check + claims submission
- **Owner:** Integrations + Finance
- **Effort:** 5 أسابيع
- **Exit:** Claims submitted + tracked automatically

#### P1.6 — Madaa (Salary Disbursement)

- **Scope:** SFTP file generation + upload
- **Owner:** Integrations + HR
- **Effort:** 2 أسابيع
- **Exit:** Payroll disbursed via Madaa

#### P1.7 — KPI Framework

- **Scope:** تعريف 50 KPI كنسي (clinical, financial, operational, quality, HR)، compute engine، dashboard
- **Owner:** Data Team + C-Suite
- **Effort:** 4 أسابيع
- **Exit:** Executive dashboard live with 50 KPIs per branch + consolidated

#### P1.8 — Credential Expiry Enforcement

- **Scope:** system block على expired credentials + alert chain
- **Owner:** HR + Platform
- **Effort:** 1 أسبوع
- **Exit:** Cannot schedule session with expired therapist

#### P1.9 — Field-Level Encryption

- **Scope:** nationalId, bankAccount, salary encrypted at-rest
- **Owner:** Platform Security
- **Effort:** 2 أسابيع
- **Exit:** Sensitive fields encrypted + audit of access

#### P1.10 — Approval Workflow Engine

- **Scope:** generic workflow engine + 10 specific paths (IRP, invoice cancel, termination, salary change, transfer, ...)
- **Owner:** Platform Services
- **Effort:** 5 أسابيع
- **Exit:** 10 approval paths configured + tested

### 3.4 KPIs for P1

| KPI                        | Target               |
| -------------------------- | -------------------- |
| PDPL self-assessment       | ≥ 90%                |
| Nafath signed documents    | ≥ 100 in first month |
| ABAC rules coverage        | ≥ 10 running         |
| Payroll on Madaa           | 100%                 |
| KPIs defined               | 50                   |
| Executive dashboard live   | Yes                  |
| Encrypted sensitive fields | 100%                 |

### 3.5 Exit Criteria

- [ ] ABAC engine live
- [ ] PDPL program certified by DPO
- [ ] Nafath integration live
- [ ] Absher + Yakeen live
- [ ] Wasel/CHI live
- [ ] Madaa live
- [ ] Executive BI v1 live
- [ ] Approval workflows live
- [ ] Encryption live

---

## 4. Phase P2 — Unified Portals & Experience (2-3 أشهر)

### 4.1 الهدف

توحيد الـ 6 portals مع UX متسق + Arabic-first + accessibility + mobile experience محسّن.

### 4.2 Deliverables

#### P2.1 — Design System Unified

- **Scope:** component library موحّد (shadcn-style)، tokens، RTL native، accessibility (WCAG 2.1 AA)
- **Owner:** Frontend + UX
- **Effort:** 4 أسابيع
- **Exit:** Design system published + adopted in new screens

#### P2.2 — Parent Portal Mobile App

- **Scope:** React Native app (iOS + Android) with: progress view, schedule, payment, chat with team
- **Owner:** Mobile Team
- **Effort:** 8 أسابيع
- **Exit:** App in App Store + Play Store, 50% guardian adoption

#### P2.3 — Therapist Elite Dashboard (mobile-first)

- **Scope:** Session capture on tablet + offline sync
- **Owner:** Mobile + Clinical Team
- **Effort:** 6 أسابيع
- **Exit:** All therapists using tablet app by end of phase

#### P2.4 — Executive BI v2

- **Scope:** Deep-dive capabilities + ad-hoc reporting + export to Power BI
- **Owner:** Data Team
- **Effort:** 4 أسابيع
- **Exit:** C-Suite regularly using dashboards

#### P2.5 — Accessibility Audit

- **Scope:** WCAG 2.1 AA audit + fixes for key journeys
- **Owner:** UX + QA
- **Effort:** 3 أسابيع
- **Exit:** AA compliance for 5 critical user journeys

#### P2.6 — Unified Notification Preferences Center

- **Scope:** Every user can manage channel preferences (email/SMS/WA/push/in-app) per notification type
- **Owner:** Platform Services
- **Effort:** 2 أسابيع
- **Exit:** UI live, all notifications respect preferences

---

## 5. Phase P3 — Intelligence & Automation (3-4 أشهر)

### 5.1 الهدف

إدخال AI + Automation لرفع الإنتاجية + تقليل الأخطاء + تخصيص الرعاية.

### 5.2 Deliverables

#### P3.1 — Smart Alerts Engine

- **Scope:** Rule builder + 30 pre-configured alerts (clinical, financial, operational, compliance)
- **Owner:** Data Team
- **Effort:** 6 أسابيع
- **Reference:** [06-workflows.md §5](06-workflows.md#5-smart-alerts-تنبيهات-ذكية)
- **Exit:** 30 alerts active + monitored

#### P3.2 — AI Assessment Assistant

- **Scope:** Claude/OpenAI integration for:
  - Suggesting goals based on assessment
  - Drafting session notes (review + edit)
  - Translating between AR/EN
  - Generating progress summaries
- **Owner:** AI Team + Clinical
- **Effort:** 8 أسابيع
- **Exit:** Clinicians saving ≥ 30% time on documentation

#### P3.3 — Progress Prediction Model

- **Scope:** ML model predicting goal achievement likelihood
- **Owner:** Data Science
- **Effort:** 6 أسابيع
- **Exit:** Model deployed with ≥ 75% accuracy on historical data

#### P3.4 — No-Show Prediction

- **Scope:** Model + proactive interventions (extra reminders to likely no-shows)
- **Owner:** Data Science
- **Effort:** 3 أسابيع
- **Exit:** No-show rate reduced ≥ 20%

#### P3.5 — Schedule Optimization v2

- **Scope:** Constrained optimization (CP-SAT solver)
- **Owner:** Operations Eng
- **Effort:** 5 أسابيع
- **Exit:** Utilization improved ≥ 10%

#### P3.6 — Chatbot (Parent Inquiries)

- **Scope:** LLM-powered chatbot for common questions (hours, invoices, progress)
- **Owner:** AI + CX
- **Effort:** 4 أسابيع
- **Exit:** 40% of parent inquiries handled without human

---

## 6. Phase P4 — Scale & Decoupling (optional, 4-6 أشهر)

### 6.1 الهدف

إذا احتاج النمو scale أعمق — split selected bounded contexts as microservices.

### 6.2 Deliverables (اختيارية)

#### P4.1 — Event Sourcing for BC-06 (Finance)

- **Scope:** Full ledger as append-only events + materialized views
- **Exit:** Financial forensics + replay + audit superior

#### P4.2 — BC-13 Data Platform Dedicated

- **Scope:** Separate analytics DB + ETL + data lake
- **Exit:** Reports do not impact operational performance

#### P4.3 — BC-12 Gov Integrations as Microservice

- **Scope:** Split out for independent deploy + scale + team
- **Exit:** Gov integration team owns deploy cadence

#### P4.4 — API Gateway + Service Mesh

- **Scope:** Istio/Linkerd + gateway
- **Exit:** Better observability + policy enforcement

#### P4.5 — Multi-Region DR

- **Scope:** Active-passive across Saudi regions
- **Exit:** RTO < 1h verified

---

## 7. Phase P5 — Continuous Improvement (دائم)

### 7.1 الأنشطة المستدامة

- Security patches + vuln response (ongoing)
- Monthly performance tuning
- Quarterly risk review
- Annual architecture review
- Customer feedback loops (NPS → roadmap)
- Regulatory updates monitoring
- New Saudi gov integrations as announced
- Team skill development

### 7.2 Cadence

| Activity                | Frequency         |
| ----------------------- | ----------------- |
| Patch Tuesday           | Monthly           |
| Release cycle           | Bi-weekly (agile) |
| Security audit          | Quarterly         |
| Compliance audit        | Semi-annual       |
| Architecture review     | Annual            |
| Disaster Recovery drill | Annual            |
| Penetration test        | Annual            |
| Chaos engineering       | Quarterly         |

---

## 8. Prioritized Backlog (P0 First)

### 🔴 P0 (Must do now)

1. Archive 536 phantom tests
2. Write 6 ADRs
3. Publish canonical data model
4. Hardening audit trail coverage

### 🟠 P1 (Foundation — this quarter)

5. ABAC engine
6. PDPL compliance program
7. Nafath integration
8. Absher + Yakeen
9. Wasel/CHI
10. Madaa
11. KPI framework + Executive BI v1
12. Credential expiry enforcement
13. Field-level encryption
14. 10 approval workflow paths

### 🟡 P2 (Experience — next quarter)

15. Unified design system
16. Parent mobile app
17. Therapist tablet app
18. Executive BI v2
19. Accessibility audit
20. Notification preferences

### 🟢 P3 (Intelligence — 6+ months)

21. Smart alerts engine
22. AI assessment assistant
23. Progress prediction
24. No-show prediction
25. Schedule optimization v2
26. Chatbot

### 🔵 P4 (Scale — 12+ months, optional)

27. Event sourcing (finance)
28. Data platform
29. Microservices split
30. Service mesh
31. Multi-region DR

---

## 9. Resource Plan

### 9.1 Core Team (Needed)

| Role                 | FTEs                         |
| -------------------- | ---------------------------- |
| Enterprise Architect | 1                            |
| Tech Leads           | 3 (clinical, platform, data) |
| Backend Engineers    | 8                            |
| Frontend Engineers   | 5                            |
| Mobile Engineers     | 3                            |
| DevOps / SRE         | 3                            |
| QA Engineers         | 4                            |
| Security Engineer    | 1                            |
| Data Engineer        | 2                            |
| Data Scientist       | 1                            |
| UX Designer          | 2                            |
| Product Manager      | 2 (per domain)               |

### 9.2 Clinical & Operations

| Role                   | FTEs         |
| ---------------------- | ------------ |
| CMO                    | 1 (advisory) |
| Clinical Informaticist | 1            |
| Quality Lead (CBAHI)   | 1            |
| DPO                    | 1 (PDPL)     |
| CISO                   | 1            |

---

## 10. Budget Heat-map (نسبي)

```
P0 Stabilize       █ (low — internal effort)
P1 Foundation      ████████ (high — integrations + ABAC + PDPL)
P2 Portals         ██████ (medium-high — mobile dev)
P3 Intelligence    ██████ (medium-high — AI + ML)
P4 Scale           ████████████ (highest if chosen — microservices + infra)
P5 Continuous      ████ (medium — ongoing)
```

---

## 11. Risks to Roadmap

| Risk                             | Mitigation                            |
| -------------------------------- | ------------------------------------- |
| Vendor delays (gov integrations) | Start sandbox early + parallel tracks |
| Team capacity                    | Hire plan, outsource non-core         |
| Scope creep                      | Strict PR review + roadmap adherence  |
| Stakeholder alignment            | Monthly steering committee            |
| Regulatory changes               | Legal watch + flex backlog            |

---

## 12. Success Metrics (معايير النجاح)

### 12.1 Technical

- Deploy frequency: ≥ daily
- Change failure rate: < 5%
- MTTR: < 2 hours
- Test coverage: > 80% (new code)
- p95 API latency: < 300ms

### 12.2 Business

- Beneficiary growth: +30% YoY
- Branch utilization: > 85%
- NPS: > 50
- Therapist retention: > 90%
- Revenue growth: +25% YoY
- Operating margin: +5pp

### 12.3 Compliance

- CBAHI accreditation: maintained
- PDPL: 100% compliant
- ZATCA: 100% accepted
- Audit findings: 0 critical, < 3 major/year

---

## 13. التالي

- **[10-gap-analysis.md](10-gap-analysis.md)** — تفاصيل الفجوات Current vs Target.
- **[README.md](README.md)** — الفهرس الرئيسي.
