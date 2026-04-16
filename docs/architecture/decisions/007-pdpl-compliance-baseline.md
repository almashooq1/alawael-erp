# 7. PDPL Compliance Baseline

Date: 2026-04-16

## Status

✅ Accepted (plan) — implementation in P1

## Context

Saudi **Personal Data Protection Law (PDPL)** regulates processing of personal data of residents in the Kingdom, effective September 2024 (fully enforced 2025). Violations carry administrative fines up to SAR 5,000,000 and/or criminal liability.

Our platform processes extensive personal and sensitive data:

- PII (names, national IDs, addresses, phone numbers)
- Minors' data (the majority of beneficiaries)
- Health data (diagnoses, assessments, medications) — highest sensitivity
- Financial data (invoices, bank accounts)
- Employee data (salaries, performance)

PDPL imposes requirements on lawful basis, consent, data subject rights, breach notification, cross-border transfer, data minimization, and retention.

## Decision

We commit to a **PDPL-by-design** posture with the following baseline (all items in P1 scope unless noted):

### 1. Lawful Basis

- **Consent** (explicit, granular, revocable) for: photos, research use, directory listing, marketing.
- **Contract** for: processing needed to deliver rehab services (clinical records, invoicing).
- **Legal obligation** for: ZATCA, GOSI, Qiwa, CBAHI reporting.
- **Vital interest** for: emergency medical situations.
- **Legitimate interest** (with balancing test) for: internal quality audits, anti-fraud.

### 2. Data Subject Rights Workflow (BC-08 module)

- **Right to access** — 30-day SLA; export in structured format.
- **Right to rectification** — with audit of change + approval for identity fields.
- **Right to erasure** — subject to legal retention requirements; soft-delete + compliance override.
- **Right to restrict processing** — status flag + system-wide enforcement.
- **Right to object** — for consent-based processing.
- **Right to data portability** — structured JSON export.

### 3. Consent Management

- Consent records are versioned entities with: subject, purpose, channel, timestamp, text hash, granted/withdrawn, expiry.
- Every data use checks `ConsentCheck(subject, purpose)` at runtime.
- Re-consent campaign when purpose expands.

### 4. Data Classification (see [blueprint/04-data-domains.md § 8](../../blueprint/04-data-domains.md))

- PHI, PII, Financial, Public, Internal, Restricted.
- Field-level encryption for highest-sensitivity fields (`nationalId`, `bankAccount`, `salary`) — AES-256, keys in AWS KMS.
- Masking rules for exports and lists.

### 5. Breach Notification

- 72-hour notification to SDAIA (Saudi Data & AI Authority) for breaches likely to cause significant harm.
- Notification to affected data subjects when high risk.
- Breach runbook + quarterly tabletop exercises.

### 6. Data Retention

- Clinical: 15 years (per MoH).
- Financial: 10 years (ZATCA).
- HR: 7 years post-termination.
- Marketing consents: 3 years then re-solicit.
- Audit logs: 7 years.
- Automated archival/deletion engine enforcing these.

### 7. Data Protection Officer (DPO)

- Appointed DPO (L2 level), registered with SDAIA.
- Independent reporting line to board.
- Oversees DPIAs (Data Protection Impact Assessments) for all new features touching personal data.

### 8. Cross-Border Transfer

- Default: data stays within KSA.
- Approvals required for transfers to vendors (e.g., Anthropic/OpenAI if used for AI) — require Adequate Protection Level and signed Data Transfer Agreement.
- Pseudonymization before cross-border where feasible.

### 9. Vendor / Processor Management

- Every processor signs PDPL-compliant Data Processing Agreement (DPA).
- Register of processors with data categories and legal basis.
- Annual re-evaluation.

### 10. Training & Culture

- Annual mandatory PDPL training for all staff.
- Role-specific deep dives (clinical, HR, IT).
- Onboarding module for new hires.

### 11. Records of Processing Activities (RoPA)

- Living register: purpose, categories, recipients, retention, transfers.
- Reviewed quarterly, presented annually to board.

### 12. Privacy by Design

- Every new feature's DPIA includes: necessity, proportionality, safeguards.
- Default privacy posture: minimum data, restricted visibility.

## Consequences

### Positive

- Legal protection.
- Trust signal to families, partners, regulators.
- Foundation for international expansion (GDPR, HIPAA alignment partial).

### Negative

- Engineering overhead (consent checks, encryption, export workflows).
- Additional FTE (DPO, compliance).
- Increased onboarding friction for new features.

### Risks

- Partial implementation is worse than none (gives false assurance). Mitigation: phased rollout with clear acceptance criteria each phase.
- See R-01 in [blueprint/08-risks-controls.md](../../blueprint/08-risks-controls.md).

## References

- Saudi PDPL (سياسة حماية البيانات الشخصية): <https://sdaia.gov.sa/en/SDAIA/about/Pages/PersonalDataProtection.aspx>
- [docs/blueprint/08-risks-controls.md § R-01](../../blueprint/08-risks-controls.md)
- [docs/blueprint/04-data-domains.md § 8](../../blueprint/04-data-domains.md)
