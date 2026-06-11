# Phantom Schema Writes — Triage Dossier

**Date:** 2026-06-11 · **Tool:** `npm run check:phantom-writes` (W1189) · **Baseline:**
**75** (was 131 — burned down across 10 waves W1189→W1210; every LIVE cluster fixed).
**Everything remaining is DORMANT** (PHANTOM-de-mounted routes awaiting ADR-030
wire-vs-delete: guardians, email-v2, electronic-directives, student-* ×5 — note the
PHANTOM markers date from W775 when those FILES DID NOT EXIST yet; they were created
later against imagined schemas and never wired). guardianPortal was repaired
(W1197/W1199) and WIRED (W1211).

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

## ⚠ Liveness correction (W1200)

The first liveness sweep counted COMMENTED registry lines as mounts. Re-verified with
actual line inspection: `guardianPortal`, `email-v2`, `electronic-directives`, and ALL
five `student-*` route files are **DORMANT** — their only registry references are
`// PHANTOM:` / `// PHANTOM-FIX:` commented-out mounts (the W775-era stub-surface
de-mounting). The W1197/W1199 guardianPortal repairs are therefore correct code on an
UNMOUNTED surface — harmless, and ready if ADR-030 wires it, but they were not live
user fixes. **LIVE writers confirmed by real mount lines**: `documents.smart`
(_registry:783), `employeePortal` (×3 incl. app.js direct), `riskAssessment`
(phases.registry), `budgetManagement` (finance.registry), `smartInsurance.service`
(consumed by mounted smart-insurance.routes — the W1193 repairs WERE live fixes),
`notifications-module`, `smartNotificationCenter`, `admin.routes`, `user-management`,
`contracts`, `waitlist`. **Methodology rule: a liveness grep MUST exclude `//`-commented
lines and show the matched text.**

## Open clusters (priority order)

### P1 — live user-facing surfaces, hard-broken (class A)

1. ~~**smartInsurance claims** (10 keys)~~ — **DECIDED + FIXED W1210** (W337
   build-the-canonical precedent + ADR-021 Pattern D): built
   `models/SmartInsuranceClaim.js` (DISTINCT registered name — 3 other InsuranceClaim
   files exist) as the exact union of every field the service/routes read or write
   (halalas dual-write, claimUuid required-WITH-default per the W1193 lesson, Mixed
   lineItems so payer-variant shapes can't be strict-dropped, full adjudication +
   NPHIES surface, soft delete). Service + routes rebound; rejection analytics
   realigned (`submittedAt` + `branchId` — the old match mixed contract-model
   `submissionDate` with a phantom `branch` key). 31-assertion drift guard in sprint.
   `submitClaim()` works for the first time since System 40 shipped.

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

6. **document cluster** (12 keys) — split by liveness:
   - ✅ **documents.smart — FIXED W1201** (LIVE, `_registry:783`): the whole file was
     written against an imagined schema (`branchId`/`isDeleted`/`beneficiaryId`/
     English `status:'active'`/`shares`/`currentVersion`/`accessedAt`/`fileUrl`+
     `changeNote` on versions) — every create threw, every read matched nothing.
     Realigned to the real models mirroring documents.routes' W933 mapping: Arabic
     category/status maps, W933 `entityType:'Beneficiary'`+`entityId` linkage,
     visibility via owner/isPublic/sharedWith (manage roles see all), versions carry
     the REQUIRED filePath/fileName/fileSize/fileHash (URL-hash fallback documented),
     access log keyed by timestamps.
   - 💤 `electronic-directives` + `student-certificates` — DORMANT (PHANTOM de-mounts);
     defer to ADR-030 with the dossier notes.

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

8. ~~**leaverequest** (6)~~ — **FIXED W1200** (LIVE surface, employeePortal mounted ×3):
   POST /leaves never set REQUIRED `branchId` → threw since shipping; keyed employeeId
   by USER id (model refs Employee); wrote 6 phantom fields. Realigned: employee
   resolved via userId → `employeeId: employee._id`, `daysCount`, half-day → notes +
   hoursCount, leaveType validated against the enum. Sibling phantom READS fixed too:
   balance aggregation summed phantom `$totalDays` (always-zero balances) and list/
   balance matched phantom `employee` key.
9. ~~**user**~~ — **FIXED W1203**: admin create wrote phantom `name`/`status` while
   `fullName` is REQUIRED → user-create threw since shipping; the UPDATE path silently
   dropped name/activation edits. Realigned to `fullName`/`isActive`. The
   user-management `branch` write was a VERIFIED FALSE POSITIVE — it is the official
   `User.branchId` alias; the audit script now parses `alias:` declarations (class D
   tooling fix). documentversion/documentaccesslog cleared in W1201.

### P3 — low traffic / analytics-only

9. ~~**riskassessment** (5)~~ + ~~**notification/smartnotification `sentBy`** (2)~~ —
   **FIXED W1207/W1207b**: risk create missed REQUIRED organizationId (singleton-Org
   resolution added) + phantom title/description/flat-1-5 scores → riskName/
   riskDescription/assessment.{probability,impact} 0..1; risk UPDATE was silently
   dropping every field. notifications-module send/bulk-send missed REQUIRED
   recipientId+message + hyphenated channel enum violated + phantom sentBy/branchId;
   /stats and **/inbox** filtered by phantom branchId (always zero/empty).
   smartNotificationCenter defaults violated BOTH enums (type 'custom', category
   'system') → threw on minimal payloads; sender field realigned.
10. **budget** (3 — model uses `amount`), **beneficiarytransfer** (3), **waitlist
    beneficiary** (5), **contract.model `value`** (1), **BeneficiaryService** (3,
    callers unchecked) — remaining LIVE candidates.

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
