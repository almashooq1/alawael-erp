# ADR-020 Decision Brief — Student vs Beneficiary Consolidation

**Type**: Research output (Cycle 5 from OPEN_ISSUES_INVENTORY.md)
**Date**: 2026-05-25
**Audience**: Clinical director + admissions lead + smart-attendance owner (the 3 deciders named in ADR-020)
**Purpose**: Apply ADR-020's A/B/C framework with live codebase data so the meeting decides quickly

This brief complements [020-student-vs-beneficiary-consolidation.md](020-student-vs-beneficiary-consolidation.md). The ADR describes the 3 approaches; this brief adds **caller surface counts** + **frontend impact** + **stakeholder meeting agenda** + **decision template**.

---

## 1. Live codebase facts (correcting ADR estimates)

### Caller count: 16 active (not 21 as ADR-020 originally stated)

| Domain                                             | Files  | Caller pattern                                                        |
| -------------------------------------------------- | :----: | --------------------------------------------------------------------- |
| **smart-attendance** (biometric + camera + alerts) | **11** | `ref: 'Student'` on `studentId` field                                 |
| **transport**                                      |   2    | `ref: 'Student'` on `studentId` field                                 |
| **montessori** (educational program)               |   1    | Direct `mongoose.model('Student', schema)` registration + inline refs |
| **taqat** (vocational program)                     |   1    | `ref: 'Student'` on `studentId` field                                 |
| **students** (own service)                         |   1    | `mongoose.model('Student', schema)` + reporting                       |
| **Total active**                                   | **16** |                                                                       |

**ADR-020 said 21**. The drop from 21 → 16 likely reflects cleanups in W333+ (Student refs got fixed/consolidated incrementally without an ADR sign-off). Consolidation cost has dropped accordingly.

### Distribution insight: smart-attendance + transport = 81% of callers

| Domain                                                         |    Caller %     | Stakeholder owner                                       |
| -------------------------------------------------------------- | :-------------: | ------------------------------------------------------- |
| smart-attendance + transport                                   | **13/16 = 81%** | Smart-attendance + transport owner (single stakeholder) |
| Educational/vocational (montessori + taqat + students-service) |   3/16 = 19%    | Admissions / educational lead                           |

**Implication**: if smart-attendance owner alone agrees, 81% of consolidation work unblocks immediately. The remaining 19% (educational) can ship in a follow-up wave.

### Frontend impact: minimal

- **Web-admin dashboard** (`alawael-rehab-platform/apps/web-admin/src/app/(dashboard)/`) has **NO `/students/` page**.
- Only `montessori/page.tsx` references "students" in its UI.
- No `StudentApi` client. No `/api/students` consumed in frontend code.

**Implication**: Approach A (consolidate) does NOT break the web-admin URL surface meaningfully. Only montessori page may need a label update from "students" → "beneficiaries / participants". Trivial.

### Student schema unique fields (what would migrate to Beneficiary in Approach A)

Per `backend/students/student-schema.js`:

- `enrollmentNumber` — educational track ID
- `personal.firstNameAr/lastNameAr/firstNameEn/lastNameEn` — duplicates Beneficiary names (already on Beneficiary)
- `personal.nationalId` — duplicates Beneficiary.nationalId (with `unique: true`)
- `medical.severity` — `studentConfig.severityLevels` enum (overlap with Beneficiary disability severity)
- `program.programType` — `studentConfig.programs` enum (Montessori/taqat/etc.)
- `program.enrollmentDate` — when child joined educational track
- `program.classRoom` / parents school contact fields — educational-context only

**Implication**: ~70% of Student fields DUPLICATE Beneficiary. Only ~30% are educational-context (enrollmentNumber, programType, classRoom, enrollmentDate). Approach A's "Beneficiary.education subdoc" cost is small.

---

## 2. Risk matrix per approach × 5 dimensions

| Risk dimension                       | A (consolidate)                                        | B (formalize link)                          | C (gradual deprecate)                |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------------- | ------------------------------------ |
| **Migration scope**                  | ⚠ 16 refs + 1 collection migration                    | ✓ None (parallel collections stay)          | ⚠ Per-domain timeline               |
| **Frontend impact**                  | ✓ Minimal (1 montessori page label update)             | ✓ None                                      | ✓ None initially                     |
| **Smart-attendance disruption**      | ⚠ 11 model files updated; need attendance-test re-run | ✓ None                                      | ✓ None                               |
| **PDPL audit unification**           | ✓ Single audit trail                                   | ⚠ Cross-collection union required          | ⚠ Same as B during transition       |
| **Beneficiary 360 doctrine clarity** | ✓ Trivially unified                                    | ⚠ Doctrine documents 2-entity relationship | ⚠ Same as B                         |
| **Long-term tech debt**              | ✓ Eliminated                                           | ⚠ Permanent                                | ⚠ Depends on migration completion   |
| **Total effort**                     | ~3-5 days (corrected; ADR said ~1 week)                | ~2 days                                     | ~1 day setup + indeterminate cleanup |

---

## 3. Stakeholder meeting agenda (30 minutes)

### Attendees

- Clinical director (decides: is the Beneficiary 360 single-source-of-truth doctrine binding?)
- Admissions lead (decides: are educational-track + vocational-track entries treated as same person?)
- Smart-attendance owner (decides: any external SIS integration locks the `Student` API surface?)
- Tech lead (note-taker)

### Agenda

**0:00-0:05 — Context recap** (tech lead)

- Show §1 caller distribution table
- Frontend has zero `/students/` page → no UI break risk
- 81% of callers are attendance/transport (one domain owner)

**0:05-0:15 — 3 discovery questions** (each stakeholder answers their relevant ones)

1. **Admissions lead**:

   - "When an adult enters the vocational training program, do they have a Student record? Or only a Beneficiary record?"
     → Answers whether Student is a subset or a synonym
   - "Are educational-track minors recorded as both Student + Beneficiary, or only one?"

2. **Smart-attendance owner**:

   - "Why does the smart-attendance system ref Student instead of Beneficiary? Is it tied to the school's external SIS, or is it internal-only?"
     → Answers whether there's a hard external constraint
   - "Would changing 11 `ref: 'Student'` → `ref: 'Beneficiary'` impact any existing data?"

3. **Clinical director**:
   - "If Beneficiary 360 includes attendance + transport data via the Student model, is the current 2-collection setup acceptable, or should it be unified?"
     → Confirms whether the single-source-of-truth doctrine is binding

**0:15-0:25 — Approach selection**

Mapping (from ADR-020):

- "Every Student is also a Beneficiary, with extras" → **Approach A** (consolidate)
- "Different operational contexts; both legitimate" → **Approach B** (formalize link)
- "Same person but external SIS locks API surface" → **Approach C** (gradual deprecation)

**0:25-0:30 — Close**

- Stakeholders agree on A/B/C
- If A: schedule W4XX migration wave (~3-5 days)
- If B: schedule small wave for the link model + audit-log enrichment (~2 days)
- If C: ship the deprecation marker + lint guard (~1 day)

---

## 4. Decision template

```text
ADR-020 — RESOLVED 2026-MM-DD

Approach selected: [ ] A consolidate  [ ] B formalize  [ ] C deprecate

Approver signatures:
  Clinical director:        __________________________
  Admissions lead:          __________________________
  Smart-attendance owner:   __________________________
  Tech lead (note-taker):   __________________________

Key constraints recorded:
  - External SIS dependency: [yes — locks Student API | no — internal only]
  - Educational-only entries: [exist | do not exist | unknown]
  - Beneficiary 360 single-source-of-truth doctrine: [binding | aspirational]

If Approach A — migration timing: [now | after pilot | post-Q3]
If Approach B — link model name: [BeneficiaryStudentLink | Student.beneficiaryId]
If Approach C — sunset target: [3 months | 6 months | 12 months]

Next agent action:
  - Update ADR-020 status: 🟡 Proposed → ✅ Accepted with Approach [A/B/C]
  - Open W4XX wave per chosen approach
  - Update CLAUDE.md "Canonical entity refs — bug-class taxonomy" section
    to reflect Student decision
```

---

## 5. Updated effort estimates

| Approach        | ADR original          | Corrected (this brief) | Reason                                                                                          |
| --------------- | --------------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| A — Consolidate | ~1 week               | **~3-5 days**          | Caller count is 16 not 21; frontend impact minimal; 70% of Student fields duplicate Beneficiary |
| B — Formalize   | ~2 days               | ~2 days                | Confirmed                                                                                       |
| C — Deprecate   | ~1 day setup + indef. | ~1 day + indef.        | Confirmed; risk is unchanged                                                                    |

---

## 6. Related

- [ADR-020 itself](020-student-vs-beneficiary-consolidation.md) — the proposal
- [ADR-026](026-iep-ifsp-care-plan-fragmentation.md) — sister fragmentation (3-way for plans)
- [ADR-021 DECISION-BRIEF](021-DECISION-BRIEF.md) — sibling brief (5 ADRs unblocked)
- [CALLER_AUDIT_TIER1.md](CALLER_AUDIT_TIER1.md) — no-regrets caller audits shipped alongside this brief
- W324+W329 canonical Beneficiary ref enforcement
- W325c universal phantom-ref drift guard (currently EMPTY baseline ✅)
- [OPEN_ISSUES_INVENTORY.md](../../OPEN_ISSUES_INVENTORY.md) — this is Cycle 5 from §1
