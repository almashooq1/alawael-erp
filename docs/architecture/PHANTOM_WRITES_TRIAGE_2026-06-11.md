# Phantom Schema Writes — Triage Dossier

**Date:** 2026-06-11 · **Tool:** `npm run check:phantom-writes` (W1189) · **Baseline:** 127 findings (was 131; W1189 fixed 2, W1193 fixed 4 + 2 runtime bugs)

## Context

The W1189 audit scans every `Model.create({...})` literal in `routes/` + `services/`
against the bound model's declared schema paths. A key the schema never declares is
**silently dropped** by Mongoose strict mode. First triage pass (this doc) shows the
finding set is NOT mostly "benign missing fields" — several clusters are routes written
against **imagined schemas** (the W1179 disease) whose `create()` calls **throw
ValidationError at runtime** because the real model has different *required* fields.

## Classification taxonomy

| Class | Meaning | Fix path |
|---|---|---|
| **A — alien model** | Writer's vocabulary matches NO registered model; real model has different required fields → create() always throws | Per-domain design: map to canonical vocabulary, bind to the right model, or build the missing model |
| **B — semantic mismatch** | Canonical field exists under another name (`beneficiaryId` vs `beneficiary`) — W324 class | Fix the WRITER, never add a parallel field |
| **C — missing benign field** | Write is intended, field simply never declared | Additive schema declaration (the W1186/`submittedAt` recipe) |
| **D — tooling gap** | Finding is an artifact of static-analysis limits (re-export shims, multi-registration) | Improve the script, re-baseline |

## Fixed already

| Wave | Fix |
|---|---|
| W1186 | FormTemplate `approvalSteps` persistence + FormSubmission `reviewedAt`/`reviewedBy` |
| W1189 | FormSubmission `submittedAt` (class C) |
| W1193 | `Communication` pre-save called **undeclared `next()`** → ReferenceError on every save (file had `eslint-disable no-undef` masking it) — a 3rd W978-variant no current guard catches |
| W1193 | `PriorAuthorization.uuid` + `InsuranceEligibilityCheck.uuid`: **required with no default and no caller ever set them** → `checkEligibility()` and `requestPriorAuth()` threw on every call. Schema-side `crypto.randomUUID()` default fixes all callers |
| W1193 | Class-C declares: `PriorAuthorization.{insuranceCompanyId, estimatedStartDate, estimatedEndDate}`, `InsuranceEligibilityCheck.requestedService` |

## Open clusters (priority order)

### P1 — live user-facing surfaces, hard-broken (class A)

1. **smartInsurance claims** (`services/smartInsurance.service.js`, 10 keys —
   `claimUuid, policyId, insuranceCompanyId, serviceSessionId, billedAmount,
   diagnosisCodes, procedureCodes, lineItems, priorAuthId, createdBy`).
   `submitClaim()` writes a policy-based vocabulary matching **no** registered model.
   It binds (via the `models/InsuranceClaim.js` re-export shim) to
   `insuranceClaim.model.js` whose schema is contract-based with REQUIRED
   `beneficiary/contract/visitDate/totalGross/totalNet` → **create throws every time**.
   Even `models/nphies/InsuranceClaim.js` (`NphiesInsuranceClaim`) doesn't match
   (`insurancePolicyId`, no `claimUuid`). **Decision needed:** map the service onto the
   canonical contract-based schema, or give smart-insurance its own claim model
   (then reconcile under ADR-021 patterns — there are already FOUR InsuranceClaim files).

2. **communication message-log writers** (13 keys; `email-v2`, `guardianPortal`,
   `student-complaints`). Writers want a **message log** (`channel, direction, body,
   recipient, cc, bcc, sentAt, senderId…`); `models/Communication.js` is a
   **correspondence-management** model (required `title, subject, sender.name,
   receiver.name, sentDate, type enum incoming/outgoing/internal, createdBy.userId`)
   → create throws. **Fix = rebind each writer**, not extend the correspondence model.
   - ✅ **guardianPortal — FIXED W1199**: whole messages section (inbox / send /
     detail / reply) rebound to the purpose-built `PortalMessage` model (participant-
     keyed tenancy, isRead/readAt on open, proper reply chain via
     isReply/repliedToId/replies[]). Also fixed a 4th sibling phantom READ
     (`/children/:id/sessions` used `beneficiaryId` + lowercase `'completed'`).
   - ⏳ **email-v2** → candidate sink: an email-log model (locate the W340-listed
     `EmailLog` registration — not at models/ root) or `models/communication/*`.
   - ⏳ **student-complaints** → rebind to `models/Complaint.js` (subject/description/
     category/submittedBy match; check `source`/`category` enums first).

3. ~~**guardianPortal appointment booking** (4 keys)~~ — **FIXED W1197**: writer
   realigned to canonical vocabulary (`beneficiary` ref, Arabic `type` enum with
   slug map, UPPERCASE `status`, required `startTime` derived from requestedDate,
   `bookedBy`/`bookedByName`); the READ filter also queried phantom `beneficiaryId`
   → guardians always saw an empty list — fixed to `beneficiary`.

4. **BeneficiaryService** (5 keys — `branch, fileNumber, disabilityType,
   disabilitySeverity, referralSource`). Core entity; W926 already showed the
   canonical shape is `category`/`disability.type` (nested). Verify the service's
   liveness (check:dormant-modules) then realign writer or declare flat fields per
   the W926 normalizer-bridge precedent.

### P2 — staff-facing, likely throwing or lossy

5. **studentactivity** (7 keys; `student-elearning`, `student-events`,
   `student-rewards-store`). Model is a gamified TASK (`titleAr`, `dueAt` REQUIRED);
   writers log point-events (`studentId, activityType, points, reason, recordedBy,
   date`) → throws. Either bind to a new `StudentActivityLog` model or map onto the
   task vocabulary.

6. **document cluster** (12 keys; `electronic-directives`, `student-certificates`,
   `documents.smart`). Directives/certificates piggyback on `Document` with fields it
   lacks (`directiveType, requiredSigners, signatureStatus, verificationCode…`).
   Needs per-surface decision (dedicated models vs Document.metadata).

7. **guardian** (8 flat contact keys) — **RECLASSIFIED W1198: DORMANT ROUTE, defer to
   ADR-030 (wire-vs-delete).** `routes/guardians.routes.js` is referenced by NO mount
   pattern (checked all 4 families: safeRequire+dualMount, safeMount, direct app.use,
   bootstrap) and prod `guardians` collection has **0 documents**. Do NOT repair before
   the wiring decision. Notes for whoever revives it: model requires
   `firstName_en`/`lastName_en`/`email`/`userId` (unique NON-sparse index in prod —
   staff-side registration without a portal account needs `userId` optional + a sparse
   index migration); class-B maps: `phone2→alternatePhone`, `employer→company`,
   `city→address.city`, `preferredLanguage→language`; class-C declares needed:
   `preferredContactMethod`, `canPickup`. Baseline ids stay (ratchet fires if revived).

8. **leaverequest** (6), **user** (`name, status, branch` in admin/user-management),
   **documentversion** (2), **documentaccesslog** (1).

### P3 — low traffic / analytics-only

9. **riskassessment** (5), **budget** (3 — model uses `amount`), **beneficiarytransfer**
   (3), **notification/smartnotification `sentBy`** (2), **contract.model `value`** (1),
   **insuranceeligibilitycheck — remaining**: none.

## Burn-down protocol

Pick ONE cluster per wave: read writer + model → classify (A/B/C/D) → apply the class
fix → remove the ids from `KNOWN_PHANTOM_WRITES` in the same commit → re-run
`npm run check:phantom-writes` + the affected domain guards. Never blanket-declare
class-B keys (creates W324-style duplicate semantics).

## Tooling follow-ups (v2 candidates)

- Follow pure re-export shims (`module.exports = require('./x').Y`) when indexing.
- Flag **missing required keys** at create sites (catches the `uuid` class statically).
- Extend W978-family guards to catch `next()` *called but never declared* in async
  hooks (the W1193 Communication bug shape).
