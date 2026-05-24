# 20. Student vs Beneficiary — Consolidation Decision

Date: 2026-05-24

## Status

🟡 **Proposed — needs clinical director + admissions lead + smart-attendance owner sign-off before implementation.**

This ADR is a proposal, not an accepted decision. The discovery was made during
the test-run of `.github/prompts/04-programs-sessions-progress-engine.prompt.md`
(2026-05-24); the choice between consolidation and explicit separation depends
on operational context this agent cannot resolve alone.

## Context

The W324–W329 ref-cleanup series established `Beneficiary` (registered at
[`backend/models/Beneficiary.js:690`](../../../backend/models/Beneficiary.js))
as the canonical entity for "the disabled person being served by the rehab
center." `mongooseModelName: 'Beneficiary'` is declared in the canonical
contract at
[`backend/intelligence/canonical/schemas/beneficiary.canonical.js`](../../../backend/intelligence/canonical/schemas/beneficiary.canonical.js).

During the W325 P3 / W332 audit cycle, a SEPARATE Mongoose model was found:
**`Student`**, registered at:

- [`backend/models/montessori.js:145`](../../../backend/models/montessori.js)
  (`Student: mongoose.models.Student || mongoose.model('Student', StudentSchema)`)
- [`backend/students/student-service.js:40`](../../../backend/students/student-service.js)
  (`this.Student = mongoose.model('Student', StudentSchema)`)
- [`backend/students/student-schema.js`](../../../backend/students/student-schema.js)
  (schema definition, extracted in W275c)

`Student` has **~21 callers via `ref: 'Student'`** distributed across:

- `backend/models/smart-attendance/` — 11 models (FingerprintData, FaceRecognitionData, BiometricDevice, BiometricEnrollment, CameraDevice, AttendanceViaCamera, SmartAttendanceRecord, AttendanceSummaryReport, AttendanceAppeal, AttendanceAnomalyAlert, AttendanceBehaviorPattern, ParentNotificationPreferences)
- `backend/models/transport/` — 3 models (BusRoute × 2, StudentTransport)
- `backend/models/montessori.js` — 5 inline refs
- `backend/models/taqat.models.js` — 1 ref

**Status of the divergence**: Both models are LEGITIMATELY registered. The
universal phantom-ref guard (W325c) does not flag these refs as bugs because
`Student` resolves to a real model. The W324+W329 semantic-mismatch guard
does not flag them because the field name is `studentId` / `student` (not
`beneficiaryId` / `beneficiary` / `participantId`).

But conceptually: in a rehabilitation / disability center serving children
and youth, **the student IS the beneficiary**. The platform's canonical
documentation (Beneficiary 360 prompt, CarePlan engine, Measures engine)
all treat Beneficiary as the single longitudinal entity. The fact that
smart-attendance and transport maintain a parallel `Student` reference
creates several risks:

1. **Cross-collection joins are awkward.** Looking up "this beneficiary's
   biometric attendance history" requires joining `Beneficiary` → some
   id-mapping → `Student` → `SmartAttendanceRecord`. If the mapping isn't
   maintained, attendance data orphans from the beneficiary's longitudinal
   timeline.

2. **The Beneficiary 360 master file may be incomplete.** Per
   `01-beneficiary-360-master.prompt.md`, the 360 file is "the single source
   of truth for the beneficiary," anchoring all attendance + transport data.
   But if attendance refs Student and not Beneficiary, surfacing that data in
   the 360 requires a join the doctrine does not document.

3. **PDPL audit logging is fragmented.** Reads on `Student.X` may be logged
   to a different audit path than reads on `Beneficiary.Y`, defeating the
   single-audit-trail invariant from ADR-009.

4. **Future drift guards become harder.** Adding `studentId` to W324+W329's
   `TARGETED_FIELD_NAMES` would FAIL on 21 legitimate refs unless we ALSO
   allowlist them — making the guard noisier.

## The actual question

**Is `Student` a separate domain entity, or a contextual label for `Beneficiary`?**

Possibilities:

- **A.** `Student` predates `Beneficiary` (older code, never migrated). The
  modern canonical is `Beneficiary`; the 21 refs are tech debt.
- **B.** `Student` represents a SUBSET — beneficiaries enrolled in
  educational tracks (Montessori, taqat, school-attached programs). Adults
  in vocational programs would be `Beneficiary` but not `Student`.
- **C.** `Student` represents the SAME PERSON but with a different operational
  view (school attendance, bus routes) where school-specific fields (grade,
  class, parents' school contact) need their own model.

The discovery agent cannot determine which is correct without input from
admissions + the smart-attendance owner.

## Three approaches under consideration

### Approach A — Consolidate: replace all `ref:'Student'` with `ref:'Beneficiary'`

**What ships:**

- Merge `Student` schema fields into `Beneficiary` schema (additive — preserve
  any educational fields like `gradeLevel`, `class`, `schoolName` as
  optional Beneficiary fields).
- Sweep all 21 callers + change `ref:'Student'` → `ref:'Beneficiary'`.
- Field renames (`studentId` → `beneficiaryId`) optional — follow W324+W326
  precedent of preserving field name + changing ref target only.
- Migrate data: any documents currently in the `students` collection move
  to `beneficiaries` (one-shot migration).
- Drop the `Student` model + `students` collection (after migration verified).
- Add a W333+ drift guard preventing `Student` from being re-registered.

**Cost:** ~1 week (migration + cross-collection joins update + reading the
smart-attendance code paths + comprehensive testing).

**Pros:** True single-source-of-truth. Beneficiary 360 trivially aggregates
attendance + transport. PDPL audit is unified. W324+W329 drift guard scope
extends naturally to `studentId`.

**Cons:** Big migration; risk of orphaning historical attendance data;
educational-specific fields bloat the canonical Beneficiary schema; loss of
domain-specific schema validation (school-required-fields may not be
required for vocational beneficiaries).

### Approach B — Document semantic distinction: `Student` is a contextual sub-entity

**What ships:**

- ADR-020 status flips to "Accepted with rationale: Student is the
  educational-context label for Beneficiary."
- A new `BeneficiaryToStudentLink` model (or `Student.beneficiaryId: ref:'Beneficiary'`)
  is added to formalize the 1:1 (or 1:many) mapping.
- Update Beneficiary 360 prompt's READ FIRST to reference Student as the
  attendance/transport view of the same person.
- Smart-attendance + transport keep their `ref:'Student'` — the W324+W329
  drift guard remains scoped to clinical fields only.
- Cross-references in audit log carry both IDs where applicable.

**Cost:** ~2 days (new link model + audit-log enrichment + doc updates).

**Pros:** Smallest blast radius. Preserves existing smart-attendance / transport
code. Educational fields stay on `Student`, clinical fields stay on `Beneficiary`.
Each domain owns its own schema validation.

**Cons:** Two parallel collections; cross-collection joins required for
"complete beneficiary picture"; audit-log union must be maintained; the
W324+W329 guard cannot trivially extend — a Student field is NOT a beneficiary
field semantically (it's a domain-specific projection).

### Approach C — Hybrid: deprecate Student gradually, with feature-flag

**What ships:**

- `Student` model stays but is marked `lifecycleStatus: 'DEPRECATED'` (mirror
  of W325 P1 measure deprecation pattern).
- New code MUST use `Beneficiary`; lint guard fails on `mongoose.model('Student')`
  in new files (allowlist for the existing 21 callers).
- Migration is opt-in per domain: smart-attendance team migrates when ready;
  transport team migrates when ready; etc.
- After all callers migrate, drop `Student`.

**Cost:** ~1 day setup + indeterminate cleanup timeline.

**Pros:** No big-bang risk. Allows domain teams to migrate at their own pace.
Drift guard prevents Student usage from growing.

**Cons:** Carries the divergence as long as any caller hasn't migrated; risk
that the migration never completes (W326 took 10 callers; the smart-attendance
domain has 11 alone). Tech debt is documented but not eliminated.

## Decision

**No decision yet. This ADR proposes the question.**

Recommended discovery before picking an approach:

1. **Interview admissions lead**: "When an adult enters the vocational
   training program, do they have a Student record? Or only a Beneficiary
   record?" This answers whether Student is a subset or a synonym.
2. **Interview smart-attendance owner**: "Why does the smart-attendance system
   ref Student instead of Beneficiary? Is it tied to the school's external
   SIS, or is it internal?" This answers whether there's an external integration
   constraint.
3. **Audit Student collection in production-like data**: "How many `Student`
   documents have a matching `Beneficiary` document? How many are orphans?
   How many `Beneficiary` documents lack a `Student` counterpart?" This
   answers cardinality assumptions for Approach A's migration.

Once those three questions are answered, the path forward is usually clear:

- If Student ⊆ Beneficiary (every Student is also a Beneficiary, with extras):
  → Approach A (consolidate).
- If Student ≠ Beneficiary semantically (different operational contexts):
  → Approach B (formalize the link).
- If Student ≈ Beneficiary but external SIS integration locks the API surface:
  → Approach C (gradual deprecation).

## Consequences

If **A is accepted**:

- Big migration wave (likely W333 or later). New canonical schema delta:
  `Beneficiary.education: { gradeLevel, class, schoolName, ... }`.
- W324+W329 drift guard extends `TARGETED_FIELD_NAMES` to include
  `studentId` + `student`.
- Smart-attendance + transport callers all updated in one sweep (~21 files).
- Migration script for the existing `students` collection.

If **B is accepted**:

- New `BeneficiaryToStudentLink` model or `Student.beneficiaryId` FK.
- ADR text updates Beneficiary 360 prompt's READ FIRST.
- Smart-attendance / transport code unchanged.
- W325c baseline note: "Student refs are deliberate domain projections; do
  not consolidate without ADR-020 revisit."

If **C is accepted**:

- `Student` model gets `lifecycleStatus: 'DEPRECATED'` field (mirror W325 P1).
- W333+ drift guard: any NEW model adding `ref:'Student'` fails.
- Allowlist captures the existing 21 callers for ratchet-down.
- Timeline ambiguous — migrate when each team is ready.

## Not in scope

- Renaming the field `studentId` → `beneficiaryId` in client-facing APIs.
  Whatever approach is picked, field-name churn is a separate downstream
  decision (W324+W326+W327+W328+W329 all preserved field names per precedent).
- Frontend impact analysis. The web-admin pages at
  `apps/web-admin/src/app/(dashboard)/beneficiaries/` already use the
  Beneficiary model directly; smart-attendance UI is not yet built in
  web-admin.

## References

- W324–W329 ref-cleanup commit chain: `2b916f8d0`, `ce2e2e7b4`, `1e8e1b9ee`,
  `23705d905`.
- Universal phantom-ref drift guard (W325c): `backend/__tests__/universal-model-ref-drift-wave325c.test.js`.
- Canonical beneficiary contract: `backend/intelligence/canonical/schemas/beneficiary.canonical.js`.
- Related precedent — ADR-018 (rehabilitation-protocol-entity) used the same
  "Proposed pending stakeholder input" pattern. Discovery → proposal → 3
  approaches → wait for stakeholder.
- The new `04-programs-sessions-progress-engine.prompt.md` notes the 3-clinical-session-model
  fragmentation in its READ FIRST — a sibling fragmentation that may merit a
  separate ADR (ADR-021?).
