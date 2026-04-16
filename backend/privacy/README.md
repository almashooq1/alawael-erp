# Privacy (PDPL) Module

Scaffold for the Personal Data Protection Law compliance program.
See [ADR-007](../../docs/architecture/decisions/007-pdpl-compliance-baseline.md) and [blueprint/08-risks-controls.md § R-01](../../docs/blueprint/08-risks-controls.md).

## Contents

- `consent.model.js` — Mongoose schema for versioned consent records.
- `data-subject-request.model.js` — DSR (Data Subject Request) model.
- `consent-check.js` — `consentCheck(subject, purpose)` helper used before processing personal data for consent-based purposes.
- `retention-policy.js` — declarative retention policies by data category.

## Roadmap

| Phase | Deliverable                                                 |
| ----- | ----------------------------------------------------------- |
| P0    | Module scaffold + models + this README                      |
| P1    | Consent UI (guardian portal) + DSR workflow + DPO dashboard |
| P1    | Retention engine (cron) + automated archival                |
| P2    | Breach notification automation + tabletop drills            |

## Legal Bases (quick reference)

| Basis                 | Examples                                                        |
| --------------------- | --------------------------------------------------------------- |
| `consent`             | Photos, research, marketing, directory listing                  |
| `contract`            | Clinical records, invoicing, therapy delivery                   |
| `legal_obligation`    | ZATCA, GOSI, Qiwa, CBAHI reporting                              |
| `vital_interest`      | Emergency medical situations                                    |
| `legitimate_interest` | Internal quality audits, anti-fraud (balancing test documented) |
