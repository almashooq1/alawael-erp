# Phase 13 — QMS & Regulatory Compliance (Enterprise)

**Status:** In progress (Commit 1 — ManagementReview — landing first)
**Version target:** 4.0.55 → 4.0.66
**Regulatory scope:** CBAHI (Saudi accreditation) · JCI · MOH licensing · ISO 9001:2015 §9.3 · ISO 27001 Annex A · SFDA medical-device compliance · HRSD labor · PDPL privacy · NCAAA educational-quality (where relevant to rehab day-care)

## 1. Goal

Close the quality & compliance readiness gap from the 2026-04-23 audit
(~58% → target ≥ 95%) before the next CBAHI re-certification cycle.
Audit results are captured in
`memory/project_qms_compliance_audit_2026-04-23.md`.

## 2. Seven Quality Domains

| #   | Domain                | Owner              | Primary artifacts                                   |
| --- | --------------------- | ------------------ | --------------------------------------------------- |
| D1  | **Governance**        | Quality Director   | Policy, Procedure, ManagementReview                 |
| D2  | **Process Control**   | Department Heads   | Form, Checklist, SOP, Template                      |
| D3  | **Assurance**         | Internal Audit     | InternalAudit, NCR, CAPA, ImprovementProject        |
| D4  | **Voice-of-Customer** | CX Lead            | Complaint, SatisfactionSurvey, NPS                  |
| D5  | **Safety & Risk**     | HSE Officer        | Incident, Risk, RCA                                 |
| D6  | **Performance**       | Quality Analyst    | KPI, KpiScorecard, Benchmarks                       |
| D7  | **Compliance**        | Compliance Officer | ComplianceControl, EvidenceItem, ComplianceCalendar |

## 3. Compliance Framework (4 Layers)

```
L1 · Regulations Registry    — standards + clauses (CBAHI/JCI/MOH/ISO/PDPL/SFDA)
  │
L2 · Control Library         — one control = one testable assertion
  │                           Control { id, regs[], modules[], owner,
  │                                     test_method, evidence_schema,
  │                                     frequency, criticality }
  │
L3 · Implementation          — how each control is satisfied today
  │                           (Policy · Checklist · Config · Training ·
  │                            AuditRun · SOP · Metric)
  │
L4 · Evidence & Attestation  — EvidenceItem (hashed + signed + retention-aware)
                              PeriodicReview (management review output)
```

## 4. Commit Plan (C1 → C12)

| #      | Deliverable                                                         | Outputs                                                                    | Tier            |
| ------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------- |
| **C1** | ManagementReview vertical slice                                     | model + registry + service + routes + tests + boot + UI-ready API          | **landing now** |
| C2     | EvidenceItem vault (hash + sign + retention)                        | model + service + upload API + indexer                                     | A               |
| C3     | ComplianceCalendar aggregator                                       | model + unified calendar (docs + credentials + audits + licenses) + alerts | A               |
| C4     | Control Library registry (~60 controls)                             | `backend/config/control-library.registry.js` + control-test service        | A               |
| C5     | QualityEventBus + cross-module adapters                             | clinical/HR/maintenance/transport/procurement/finance hooks                | A               |
| C6     | CAPA scheduler (aging + escalation + effectiveness-check)           | service + registerShutdownHook                                             | A               |
| C7     | NCR auto-link (Incident → NCR → CAPA → Training chain)              | pipeline + tests                                                           | B               |
| C8     | Risk re-assessment scheduler (quarterly)                            | service + SLA                                                              | B               |
| C9     | `/api/v1/quality/health-score` aggregator                           | executive dashboard endpoint                                               | A               |
| C10    | web-admin UI (reviews · evidence · calendar · controls · scorecard) | 5 Next.js pages in alawael-rehab-platform                                  | B               |
| C11    | Full boot wiring (quality + capa + risk + evidence schedulers)      | server.js / startup/schedulers.js                                          | A               |
| C12    | Runbook + CHANGELOG 4.0.66 + drift tests                            | docs                                                                       | A               |

## 5. ManagementReview — ISO 9001 §9.3 (C1 Design)

### 5.1 Required inputs (standard 9.3.2)

1. Status of previous management review actions
2. Changes in internal & external issues
3. Info on the performance of the QMS:
   - Customer satisfaction & feedback
   - Quality objectives achievement
   - Process performance & product/service conformity
   - Non-conformities & corrective actions
   - Monitoring & measurement results
   - Audit results
   - Performance of external providers
4. Adequacy of resources
5. Effectiveness of risk & opportunity actions
6. Opportunities for improvement

### 5.2 Required outputs (standard 9.3.3)

1. Improvement opportunities decided
2. QMS changes needed
3. Resource needs identified

### 5.3 State machine

```
 scheduled ──► agenda_set ──► in_progress ──► decisions_recorded
                                                     │
                                                     ▼
                                  closed ◄── actions_assigned
                                                     │
                                                     ▼
                                          next_review_scheduled
```

### 5.4 Minimum frequency

Twice per year (CBAHI requirement), quarterly preferred for rehab
day-care centers. Scheduler in C11 auto-creates a new
`scheduled` review 6 months after the previous `closed`.

## 6. Acceptance criteria (Phase 13)

- Compliance Health Score aggregator returns weighted score per branch
- All 60 controls in the Control Library have at least one linked Evidence or Checklist
- ManagementReview has ≥ 2 completed cycles per branch per year (once data accumulates)
- No expired document/credential older than 7 days without explicit waiver
- CAPA overdue > 30d auto-escalates to Quality Director
- Every branch has a signed Risk Register reviewed within the last 90 days

## 7. Out of scope for Phase 13

- External regulator API submissions (separate initiative)
- Public-facing patient complaint portal (covered by CRM BC)
- GRC tool vendor integration
