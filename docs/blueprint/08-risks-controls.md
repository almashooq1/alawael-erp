# 08 — Risks & Controls | سجل المخاطر والضوابط

> سجل مخاطر تشغيلية + تقنية + امتثال، مع الضوابط المُقترحة

---

## 1. Risk Rating Framework

**Probability:** Low (1) / Medium (2) / High (3)
**Impact:** Low (1) / Medium (2) / High (3) / Critical (4)
**Inherent Risk** = Probability × Impact

| Rating       | Range | Action                                  |
| ------------ | ----- | --------------------------------------- |
| **Low**      | 1-3   | Accept + monitor                        |
| **Medium**   | 4-6   | Mitigate + quarterly review             |
| **High**     | 7-9   | Mitigate urgently + monthly review      |
| **Critical** | 10-12 | Executive escalation + immediate action |

---

## 2. Data & Privacy Risks

### R-01: PDPL Non-Compliance

- **Description:** عدم الامتثال لنظام حماية البيانات الشخصية السعودي
- **Probability:** High (3)
- **Impact:** Critical (4)
- **Inherent Risk:** 12 (Critical)
- **Controls:**
  - C-01.1: DPO (Data Protection Officer) مُعيَّن
  - C-01.2: Consent management in BC-03 (photo, research, directory)
  - C-01.3: Data subject rights workflow (access, rectification, deletion)
  - C-01.4: Data classification enforcement (§8 في 04-data-domains)
  - C-01.5: PII encryption at-rest (field-level AES-256 for nationalId, bankAccount)
  - C-01.6: Annual PDPL audit + staff training
  - C-01.7: Breach notification procedure (72h to authority)
- **Residual Risk:** Medium (4)
- **Owner:** CQO + DPO

### R-02: PHI Data Breach

- **Description:** تسريب بيانات طبية/تأهيلية للمستفيدين
- **Probability:** Medium (2)
- **Impact:** Critical (4)
- **Inherent Risk:** 8 (High)
- **Controls:**
  - C-02.1: MFA إلزامي لكل الأدوار الإكلينيكية (L4+)
  - C-02.2: ABAC للـ caseload-only access
  - C-02.3: Every read of clinical data audited
  - C-02.4: Encryption in-transit (TLS 1.3) + at-rest
  - C-02.5: Backup encryption
  - C-02.6: Network segmentation (clinical VPC)
  - C-02.7: DLP (Data Loss Prevention) على الـ exports
  - C-02.8: Penetration testing سنوياً + bug bounty
- **Residual Risk:** Low (3)
- **Owner:** CISO

### R-03: Multi-Tenant Isolation Leak

- **Description:** مستخدم في فرع يرى بيانات فرع آخر
- **Probability:** Medium (2)
- **Impact:** High (3)
- **Inherent Risk:** 6 (Medium)
- **Controls:**
  - C-03.1: `branchScope.middleware` على كل route
  - C-03.2: Mongoose plugin `branchPlugin` (auto-filter queries)
  - C-03.3: Automated tests للعزل عبر الفروع (integration suite)
  - C-03.4: Static analysis للـ models missing branchId
  - C-03.5: Canary requests في production (test tenant cannot see real tenant data)
- **Residual Risk:** Low (2)
- **Owner:** Platform Security

### R-04: Unauthorized Document Access

- **Description:** وثيقة حساسة تُسحب/تُشارك خارج الصلاحية
- **Probability:** Medium (2)
- **Impact:** High (3)
- **Inherent Risk:** 6 (Medium)
- **Controls:**
  - C-04.1: ACL على مستوى الوثيقة في DMS
  - C-04.2: Document watermarking (user name + timestamp على كل صفحة)
  - C-04.3: Download events audited
  - C-04.4: Time-limited download links (signed URLs)
  - C-04.5: DRM على الوثائق شديدة الحساسية (optional)
- **Residual Risk:** Low (3)
- **Owner:** Platform Services

---

## 3. Financial & Regulatory Risks

### R-05: ZATCA Non-Compliance

- **Description:** فواتير غير متوافقة مع Phase 2 → غرامات
- **Probability:** Medium (2)
- **Impact:** High (3)
- **Inherent Risk:** 6 (Medium)
- **Controls:**
  - C-05.1: Automated ZATCA validation pre-submission
  - C-05.2: Chain integrity check (no gaps)
  - C-05.3: Daily reconciliation between accounting + ZATCA status
  - C-05.4: Alert CFO on rejected invoices
  - C-05.5: Retention 10 سنوات
- **Residual Risk:** Low (2)
- **Owner:** CFO

### R-06: Fraudulent Transactions

- **Description:** سرقة/تلاعب مالي (cash skimming, fake invoices)
- **Probability:** Medium (2)
- **Impact:** High (3)
- **Inherent Risk:** 6 (Medium)
- **Controls:**
  - C-06.1: Segregation of duties (nadie إنشاء + اعتماد)
  - C-06.2: Approval workflows من §5 في 05-role-matrix
  - C-06.3: Bank reconciliation يومية/أسبوعية
  - C-06.4: Anomaly detection (invoices > X SD from norm)
  - C-06.5: Whistleblower channel (anonymized)
  - C-06.6: Internal audit دوري (BC-08)
- **Residual Risk:** Low (3)
- **Owner:** CFO + Internal Audit

### R-07: Payroll Errors

- **Description:** أخطاء في حساب الراتب، GOSI، Qiwa
- **Probability:** Medium (2)
- **Impact:** Medium (2)
- **Inherent Risk:** 4 (Medium)
- **Controls:**
  - C-07.1: Parallel calculation (HR system + manual spot checks)
  - C-07.2: Preview slips قبل disbursement
  - C-07.3: Sign-off from employee + manager
  - C-07.4: Automated GOSI reconciliation
- **Residual Risk:** Low (2)
- **Owner:** CHRO

---

## 4. Clinical & Operational Risks

### R-08: Clinical Incident (Beneficiary Harm)

- **Description:** إصابة/سوء فهم/تشخيص خاطئ
- **Probability:** Medium (2)
- **Impact:** Critical (4)
- **Inherent Risk:** 8 (High)
- **Controls:**
  - C-08.1: Standardized protocols per therapy type
  - C-08.2: Therapist credentialing verified
  - C-08.3: Peer review on high-risk IRPs
  - C-08.4: Incident reporting mandatory + blame-free
  - C-08.5: CBAHI-aligned safety culture
  - C-08.6: Root Cause Analysis + CAPA for all major incidents
- **Residual Risk:** Medium (4)
- **Owner:** CMO + CQO

### R-09: Therapist Shortage / Turnover

- **Description:** مغادرة معالجين → caseload مكتظ → جودة تنخفض
- **Probability:** High (3)
- **Impact:** High (3)
- **Inherent Risk:** 9 (High)
- **Controls:**
  - C-09.1: Competitive compensation + growth paths
  - C-09.2: Workload balancing (auto-alert on > X caseload)
  - C-09.3: Succession planning
  - C-09.4: Pipeline: internships + universities
  - C-09.5: Cross-training (بعض الأدوار متبادلة)
- **Residual Risk:** Medium (6)
- **Owner:** CHRO

### R-10: Credential Expiry (Unnoticed)

- **Description:** معالج يعمل برخصة منتهية → illegal + liability
- **Probability:** Medium (2)
- **Impact:** High (3)
- **Inherent Risk:** 6 (Medium)
- **Controls:**
  - C-10.1: Credential registry (§M-07.7)
  - C-10.2: Auto-alerts 60d / 30d / 7d قبل الانتهاء
  - C-10.3: System block: cannot schedule session with expired therapist
  - C-10.4: Monthly credential audit report to branch manager
- **Residual Risk:** Low (2)
- **Owner:** HR + Clinical Supervisors

### R-11: Schedule Conflicts / Resource Double-Booking

- **Description:** نفس الغرفة/المعالج/المركبة مُحجوز مرتين
- **Probability:** Medium (2)
- **Impact:** Medium (2)
- **Inherent Risk:** 4 (Medium)
- **Controls:**
  - C-11.1: Optimistic locking في scheduling
  - C-11.2: Conflict detection real-time في UI
  - C-11.3: Auto-swap recommendations
- **Residual Risk:** Low (2)
- **Owner:** Operations

---

## 5. Technical / Platform Risks

### R-12: System Downtime

- **Description:** Service unavailability (infrastructure, deploy, DB)
- **Probability:** Medium (2)
- **Impact:** High (3)
- **Inherent Risk:** 6 (Medium)
- **Controls:**
  - C-12.1: 99.9% SLA target (8.76h/year max)
  - C-12.2: Multi-region deploy / failover
  - C-12.3: MongoDB replica set + daily backups
  - C-12.4: Blue-green deployments
  - C-12.5: Health checks + auto-rollback on failure
  - C-12.6: Incident response runbook
  - C-12.7: Chaos engineering quarterly
- **Residual Risk:** Low (3)
- **Owner:** Platform Team

### R-13: Data Loss

- **Description:** فقدان بيانات إكلينيكية أو مالية
- **Probability:** Low (1)
- **Impact:** Critical (4)
- **Inherent Risk:** 4 (Medium)
- **Controls:**
  - C-13.1: RPO ≤ 15 minutes
  - C-13.2: Hourly incremental backups + daily full
  - C-13.3: Cross-region backup replication
  - C-13.4: Backup restore testing quarterly
  - C-13.5: Soft delete (no hard delete for operational data)
  - C-13.6: Point-in-time recovery (MongoDB Atlas)
  - C-13.7: Offline backup (monthly to cold storage)
- **Residual Risk:** Very Low (2)
- **Owner:** Platform Team + CTO

### R-14: Third-Party Outage (Gov Integrations)

- **Description:** ZATCA / GOSI / Nafath down → operations blocked
- **Probability:** Medium (2)
- **Impact:** Medium (2)
- **Inherent Risk:** 4 (Medium)
- **Controls:**
  - C-14.1: Graceful degradation (queue + retry)
  - C-14.2: Circuit breakers
  - C-14.3: Status dashboard شامل (per integration)
  - C-14.4: Communicate with business about known outages
- **Residual Risk:** Low (2)
- **Owner:** Integrations Team

### R-15: Scalability Bottleneck

- **Description:** Platform fails to scale as users/data grow
- **Probability:** Medium (2)
- **Impact:** High (3)
- **Inherent Risk:** 6 (Medium)
- **Controls:**
  - C-15.1: Load testing quarterly
  - C-15.2: Horizontal scaling (Kubernetes)
  - C-15.3: Caching strategy (Redis for hot data)
  - C-15.4: Read replicas for reporting
  - C-15.5: Archive old data to cheaper storage
  - C-15.6: Event-driven architecture (non-blocking)
- **Residual Risk:** Low (3)
- **Owner:** Platform Team

### R-16: Security Vulnerability (OWASP Top 10)

- **Description:** SQL/NoSQL injection, XSS, CSRF, IDOR, ...
- **Probability:** Medium (2)
- **Impact:** Critical (4)
- **Inherent Risk:** 8 (High)
- **Controls:**
  - C-16.1: Secure coding standards + training
  - C-16.2: Dependency scanning (Snyk/Dependabot)
  - C-16.3: SAST في CI (SonarQube)
  - C-16.4: DAST periodically
  - C-16.5: Pen testing annually
  - C-16.6: Bug bounty program
  - C-16.7: WAF (AWS / Cloudflare)
  - C-16.8: Rate limiting + CAPTCHA on public endpoints
- **Residual Risk:** Medium (4)
- **Owner:** CISO

---

## 6. Compliance & Legal Risks

### R-17: CBAHI Accreditation Loss

- **Description:** فشل الحصول على اعتماد CBAHI أو فقدانه
- **Probability:** Low (1)
- **Impact:** Critical (4)
- **Inherent Risk:** 4 (Medium)
- **Controls:**
  - C-17.1: Compliance register (M-08.5)
  - C-17.2: Self-assessments ربع سنوية
  - C-17.3: Evidence library مُنظّم
  - C-17.4: Mock audits
  - C-17.5: CAPA متابعة مغلقة
- **Residual Risk:** Low (2)
- **Owner:** CQO

### R-18: Legal Liability (Malpractice Claims)

- **Description:** دعاوى قضائية ضد المركز أو المعالجين
- **Probability:** Low (1)
- **Impact:** High (3)
- **Inherent Risk:** 3 (Low)
- **Controls:**
  - C-18.1: Professional liability insurance
  - C-18.2: Documented consent workflow
  - C-18.3: Incident investigation rigor
  - C-18.4: Signed IRPs (Nafath)
- **Residual Risk:** Low (2)
- **Owner:** Legal

### R-19: Labor Law Violations

- **Description:** انتهاكات Qiwa, GOSI, contract rules
- **Probability:** Low (1)
- **Impact:** High (3)
- **Inherent Risk:** 3 (Low)
- **Controls:**
  - C-19.1: HR compliance audits
  - C-19.2: Automated checks (WPS, contract renewals)
  - C-19.3: Legal counsel retainer
- **Residual Risk:** Low (1)
- **Owner:** CHRO + Legal

---

## 7. Supply Chain & Financial Operational

### R-20: Cash Flow Disruption

- **Description:** انقطاع cash flow بسبب تأخر الدفعات (تأمين، عملاء)
- **Probability:** Medium (2)
- **Impact:** High (3)
- **Inherent Risk:** 6 (Medium)
- **Controls:**
  - C-20.1: 60-day cash reserve minimum
  - C-20.2: AR aging reports + active collections
  - C-20.3: Revenue diversification (multiple payer types)
  - C-20.4: Credit line with bank
- **Residual Risk:** Low (3)
- **Owner:** CFO

### R-21: Vendor Dependency

- **Description:** اعتماد على vendor واحد (AWS, Twilio, etc.)
- **Probability:** Low (1)
- **Impact:** Medium (2)
- **Inherent Risk:** 2 (Low)
- **Controls:**
  - C-21.1: Multi-cloud option documented
  - C-21.2: Fallback providers for critical services
  - C-21.3: Contract SLAs + penalties
- **Residual Risk:** Low (2)
- **Owner:** CTO

---

## 8. Reputation & CX

### R-22: Poor Customer Experience

- **Description:** شكاوى، NPS منخفض، انتقال لمركز آخر
- **Probability:** Medium (2)
- **Impact:** Medium (2)
- **Inherent Risk:** 4 (Medium)
- **Controls:**
  - C-22.1: NPS survey quarterly
  - C-22.2: Complaint SLA monitoring
  - C-22.3: CX dashboard at branch + HQ level
  - C-22.4: Parent advisory council
- **Residual Risk:** Low (2)
- **Owner:** CX Lead

### R-23: Negative Social Media Press

- **Description:** شكوى علنية، ملف تحقيقي إعلامي
- **Probability:** Low (1)
- **Impact:** High (3)
- **Inherent Risk:** 3 (Low)
- **Controls:**
  - C-23.1: Social listening
  - C-23.2: Crisis communication plan
  - C-23.3: Media spokesperson trained
- **Residual Risk:** Low (2)
- **Owner:** PR + Legal

---

## 9. Risk Summary Dashboard

```
Critical (10-12):  R-01 (PDPL)
High (7-9):        R-02 (PHI breach), R-08 (Clinical harm), R-09 (Therapist turnover),
                    R-16 (Security vulns)
Medium (4-6):      R-03, R-04, R-05, R-06, R-07, R-10, R-11, R-12, R-13, R-14, R-15,
                    R-17, R-20, R-22
Low (1-3):         R-18, R-19, R-21, R-23
```

---

## 10. Controls Framework Mapping

| Framework             | Coverage                    |
| --------------------- | --------------------------- |
| **ISO 27001**         | 🟡 جزئي (security controls) |
| **ISO 9001**          | 🟡 جزئي (quality)           |
| **CBAHI Standards**   | ✅ مطبّق                    |
| **NIST CSF**          | 🟡 mapping needed           |
| **PDPL (Saudi)**      | 🟡 في التنفيذ (P1)          |
| **OWASP Top 10**      | ✅ مطبّق                    |
| **HIPAA** (reference) | 🟡 as best practice         |

---

## 11. Key Controls Implementation Status

### Strong (معتمد + تنفيذ جيد)

- ✅ RBAC baseline
- ✅ Audit logging
- ✅ Helmet + mongo-sanitize + XSS protection
- ✅ Rate limiting
- ✅ JWT authentication
- ✅ CSRF protection
- ✅ Branch isolation (branchScope)
- ✅ Backup system

### Medium (موجود لكن يحتاج تقوية)

- 🟡 Approval workflows (generic → 10 specific paths needed)
- 🟡 Credential expiry alerts (exists → needs system block on expired)
- 🟡 DMS access control (exists → needs finer ACL)
- 🟡 Incident investigation workflow
- 🟡 MFA (enabled for admins → needs mandatory for all clinical)

### Gap (لم يُبنى بعد)

- ❌ ABAC engine (P1)
- ❌ Break-glass workflow (P1)
- ❌ Field-level encryption for nationalId/bankAccount (P1)
- ❌ DLP / export monitoring
- ❌ Consent management per PDPL
- ❌ Data subject rights workflow
- ❌ Watermarking on PDFs
- ❌ Bug bounty program
- ❌ Chaos engineering

---

## 12. Risk Review Cadence

| Review                    | Frequency          | Attendees            |
| ------------------------- | ------------------ | -------------------- |
| Risk Register update      | Monthly            | Risk Owners          |
| Compliance snapshot       | Quarterly          | CQO + DPO + Auditors |
| Executive Risk Committee  | Quarterly          | C-Suite              |
| Annual Risk Reset         | Yearly             | Board + Auditors     |
| Incident-triggered review | Per major incident | Crisis team          |

---

## 13. التالي

- **[09-roadmap.md](09-roadmap.md)** — كيف نعالج الفجوات على جدول زمني واضح.
