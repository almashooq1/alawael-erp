# ADR-045 — Canonical clinical session model: `ClinicalSession` writes, `TherapySession` reads/schedules, others deprecated (🟡 PROPOSED)

> **🟡 PROPOSAL (2026-06-21, repair-all-defects discovery)** — `ClinicalSession` (`domains/sessions/models/ClinicalSession.js`) is the canonical write-model for a clinical/therapy session. `TherapySession` (`models/TherapySession.js`) is the read/scheduling projection derived from it. All other `*Session` models are either read-projections, legacy, or domain-specific and should be deprecated or bridged to `ClinicalSession`.
>
> **Net:** stop the proliferation of session-like models and the resulting `ref: 'Session'` confusion. The CQRS split between `ClinicalSession` (clinical source of truth) and `TherapySession` (scheduling/analytics read model) is legitimate; duplication beyond that is not.

**Date**: 2026-06-21  
**Type**: ADR (model consolidation / canonical-entity)  
**Mode**: 👤 stakeholder must sign off on the keep/bridge/deprecate list; Claude can implement the `ref: 'Session'` guard + bridge fields once dispositions are decided  
**Decider**: Clinical lead (session workflow owner) + backend owner (model canonicalization)  
**Effort:** guard + deprecation markers + ref fixes ≈ 1–2 days; full consolidation ≈ 2–4 weeks  
**Related**: ADR-040 (goal-model consolidation), ADR-044 (IEP model boundary), repair-all-defects P1-1/P2-1

## Context

The backend registers many session-like models:

| Model                    | Registered / file                                                                                 | Role (as observed)                                  | Relationship to canonical |
| ------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------- |
| **`ClinicalSession`**    | [`domains/sessions/models/ClinicalSession.js`](../../../backend/domains/sessions/models/ClinicalSession.js) | Canonical write model for therapy/clinical sessions | canonical                 |
| **`TherapySession`**     | [`models/TherapySession.js`](../../../backend/models/TherapySession.js)                           | Scheduling + analytics read projection                | read-projection of ClinicalSession (`sourceClinicalSessionId`) |
| **`Session`**            | [`models/Session.js`](../../../backend/models/Session.js)                                         | **User auth session tracker**                         | unrelated — must never be referenced by clinical models |
| `DisabilitySession`      | `models/DisabilitySession.js`                                                                     | Unknown / legacy                                    | TBD                       |
| `RehabSession`           | `models/rehabilitation/RehabSession.js`                                                           | Rehabilitation-specific session                     | TBD                       |
| `RehabGroupSession`      | `models/rehabilitation/RehabSession.js`                                                           | Group rehab session                                 | TBD                       |
| `ProgramSession`         | `domains/rehab-program/ProgramSession.model.js`                                                   | Program-specific session                            | TBD                       |
| `GroupSession`           | `domains/group-therapy/models/GroupSession.js`                                                    | Group therapy session                               | TBD                       |
| `TeleSession`            | `domains/tele-rehab/models/TeleSession.js`                                                        | Tele-rehab session                                  | TBD                       |
| `ARVRSession`            | `domains/ar-vr/models/ARVRSession.js`                                                             | AR/VR session                                       | TBD                       |
| `DttSession`             | `models/DttSession.js`                                                                            | DTT session                                         | TBD                       |
| `AdjunctTherapySession`  | `models/AdjunctTherapySession.js`                                                                 | Adjunct therapy session                             | TBD                       |
| `CreativeArtsTherapySession` | `models/CreativeArtsTherapySession.js`                                                        | Creative arts session                               | TBD                       |
| `FamilyCounsellingSession` | `models/FamilyCounsellingSession.js`                                                          | Family counselling session                          | TBD                       |

The repair run found 5 clinical/insurance models referencing `ref: 'Session'` because there was no clear canonical session model. That has been fixed to `ClinicalSession` / `TherapySession`, but the underlying fragmentation remains.

## Decision drivers

1. **Single source of truth** for the clinical session (CLAUDE.md tenet).
2. **CQRS is legitimate** — `TherapySession` is already explicitly a projection (`sourceClinicalSessionId: ref: 'ClinicalSession'`).
3. **Don't strand scheduling UI** — `TherapySession` is the shape the calendar/scheduling surfaces expect.
4. **Avoid the `Session` auth-model collision** — the auth `Session` model must never be referenced by clinical fields.

## Options

| Option | Description | Pros | Cons | Verdict |
| ------ | ----------- | ---- | ---- | ------- |
| **A — Merge everything into ClinicalSession** | One model for all session types. | Ultimate simplicity. | Massive breaking change; `TherapySession` scheduling shape and specialty-specific fields would be forced into one schema. | ❌ REJECTED — too disruptive |
| **B — ClinicalSession canonical + TherapySession projection + deprecate/bridge others** | `ClinicalSession` is the write model; `TherapySession` is the read/scheduling projection; other `*Session` models either become sub-types of `ClinicalSession` or gain a `clinicalSessionId` bridge and are deprecated. | Preserves CQRS; minimal breaking change; clear canonical entity. | Still multiple collections during transition; requires per-model disposition. | 🟡 PROPOSED |
| **C — Keep status quo** | Leave all models as-is. | No migration. | Continued confusion; new models will keep appearing; more `ref: 'Session'` bugs likely. | ❌ REJECTED — contradicts canonical-entity doctrine |

## Proposal (Option B)

1. **`ClinicalSession` is canonical** for any clinical/therapy encounter. New session-like concepts must either extend it or reference it.
2. **`TherapySession` remains the read/scheduling projection**. It already has `sourceClinicalSessionId: ref: 'ClinicalSession'`. New scheduling features build on it.
3. **Disposition matrix for other `*Session` models:**
   - `GroupSession`, `TeleSession`, `ARVRSession` → add `clinicalSessionId: ref: 'ClinicalSession'` bridge; deprecate duplicated fields.
   - `RehabSession`, `ProgramSession`, `DisabilitySession` → audit callers; likely bridge + deprecate.
   - `DttSession`, `AdjunctTherapySession`, `CreativeArtsTherapySession`, `FamilyCounsellingSession` → evaluate whether they are sub-types of `ClinicalSession` or separate encounter records.
4. **All new clinical fields** must reference `ClinicalSession` or `TherapySession`, never `Session`.
5. **Drift guard** `__tests__/clinical-session-ref-drift-wave1424.test.js` already exists; extend it to fail on any new `*Session` model registration that does not declare a `clinicalSessionId` bridge or explicit ADR exemption.

## Open questions (blockers)

- Q1: Which of the non-canonical `*Session` models have live production data?
- Q2: Which UI routes populate or depend on each model?
- Q3: Should `GroupSession`, `TeleSession`, `ARVRSession` be sub-documents of `ClinicalSession` or independent bridged models?
- Q4: Is `TherapySession` the right read model, or should scheduling migrate to `ClinicalSession` directly?

## Consequences

- **Good:** clear canonical model; prevents future `ref: 'Session'` confusion; scheduling UI remains intact.
- **Bad:** a long tail of specialty session models remains until each is dispositioned.
- **Guard:** extend W1424 guard to assert every non-auth `*Session` model either (a) is `ClinicalSession`/`TherapySession` or (b) declares `clinicalSessionId: ref: 'ClinicalSession'`.
