# ADR-042 — Consolidate the duplicate `therapist-extended` route implementations (🟡 Proposed)

**Date**: 2026-06-10
**Type**: ADR (duplicate-route / canonical-implementation — same shadow class as ADR-038)
**Mode**: 🤝 Claude can execute the retire + re-point once the canonical choice is signed off + the survivor's scoping is verified; 👤 stakeholder owns the canonical-implementation choice and confirming no client depends on the retired path
**Decider**: Backend owner (route canonicalization) + clinical lead (therapist-portal surface)
**Effort**: retire one file + redirect/alias + guard ≈ 0.5–1 day once Q1–Q3 answered; **blocked** until then
**Related**: ADR-038 (ICF assessment-model duplication — identical shadow/first-match-wins class), `docs/architecture/SECURITY-mass-assignment-sweep-2026-06-10.md` (surfaced this during W1119)

## Context

**Two different files implement the same therapist-extended API**, with the same
logical surface (`/treatment-plans`, `/assessments`, `/prescriptions`,
`/professional-dev`, `/analytics`, `/consultations`):

|               | File                                                                                          | Implementation                                            | Auth                                                             | Mount                                                                                                                                                                                | Hardened this session?                                      |
| ------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **kebab**     | [`routes/therapist-extended.routes.js`](../../../backend/routes/therapist-extended.routes.js) | Direct Mongoose model access (lazy `mongoose.model(...)`) | `dualMountAuth` (`authenticate`) at `_registry.js:661`           | `/api/(v1/)?therapist-extended` only                                                                                                                                                 | ✅ **W1119 + W1112** (W269 branch-gating + stripUpdateMeta) |
| **camelCase** | [`routes/therapistExtended.routes.js`](../../../backend/routes/therapistExtended.routes.js)   | Service layer (`services/therapistPortal.service`)        | internal `router.use(authenticateToken)` + `requireBranchAccess` | plain `dualMount` via `phases.registry.js:803` → `clinical-therapy.registry.js:44` at **both** `/api/therapist` (co-mounted, line 37-41) **and** `/api/therapist-extended` (line 44) | ❌                                                          |

### What actually serves traffic (Express first-match-wins)

- **`/api/therapist-extended/*`** → the **kebab** file wins (mounted at `_registry:661`, _before_ `phases.registry` at `_registry:803`). So this session's W269 + mass-assignment hardening is **LIVE** on this path. The camelCase file is **shadowed / dead** here.
- **`/api/therapist/*`** → only the **camelCase** file is mounted (the kebab file is not co-mounted at `/api/therapist`). So the _same_ treatment-plan / prescription functionality is **also reachable, unhardened-by-this-session**, via `/api/therapist/treatment-plans` etc. — relying entirely on `therapistPortal.service` for its scoping.

**Net effect:** the same therapist-extended _surface_ exposed at two paths by two
implementations over **two different plan models** — the kebab uses `CarePlan`; the
camelCase/service uses **`TherapeuticPlan`** (`therapistPortal.service`). So this is
model-level fragmentation (ADR-026 / ADR-040 family), not a pure route duplicate.

**Q1 AUDITED (2026-06-10) — the service path is NOT an unhardened IDOR.** Every
`therapistPortal.service` read + write scopes by therapist caseload:
`getPlanById` / `getTherapeuticPlans` / `updateTreatmentPlan` / `updateGoalProgress`
all filter `{ _id?, assignedTherapists: therapistId }` — _stronger_ than the kebab's
branch-scope (caseload ⊃ branch, per the W269 doctrine). So the `/api/therapist`
path is safe; the earlier "split security posture" worry is **downgraded** — both
paths are scoped, just differently (caseload vs branch) and over different models.

## Decision drivers

1. **One canonical implementation** — duplicate route files with first-match-wins
   shadowing are exactly the stranded-code class ADR-038 documents.
2. **No split security posture** — the same data must not be reachable via a
   hardened path AND a separately-scoped path; whichever survives must carry the
   W269 + mass-assignment guarantees.
3. **Service layer vs direct-model** — the camelCase/service implementation is the
   more maintainable long-term shape (scoping + audit centralised in
   `therapistPortal.service`); the kebab is direct-model but is what's currently
   hardened + winning at `/therapist-extended`.

## Options

- **A — Status quo.** Two files, two paths, split hardening. ❌ Fragile; the
  `/api/therapist` path silently bypasses this session's route-layer hardening.
- **B — Canonical = camelCase/service; retire the kebab.** Verify
  `therapistPortal.service` enforces the same branch/ownership scope the kebab now
  has (W1119), then redirect `/api/therapist-extended` to the camelCase router and
  delete the kebab. ✅ Cleanest long-term (one service-backed impl, one scoping
  path). ❌ Requires auditing the service's queries first (don't retire the
  hardened file until the survivor is proven equivalent).
- **C — Canonical = kebab; retire the camelCase overlap.** Keep the hardened kebab
  at `/therapist-extended`, and remove the camelCase's overlapping routes from the
  `/api/therapist` co-mount. ✅ Preserves this session's hardening as-is. ❌ Loses
  the service-layer abstraction; must confirm nothing depends on
  `/api/therapist/treatment-plans` etc.

## Recommendation

**Option B (canonical = service/camelCase), gated on a scope audit.** The
service-backed implementation is the better long-term shape, BUT it must inherit
the W1119 guarantees first: audit `therapistPortal.service` (`getTreatmentPlanDetail`
/ `updateTreatmentPlan` / prescriptions / professional-dev) for branch + ownership
scoping, bring it to parity, THEN redirect `/api/therapist-extended` to it and
retire the kebab. Until that audit passes, **the kebab stays** (it is the
currently-hardened, winning implementation) — do not retire it prematurely.

## Open questions (stakeholder)

- **Q1. ANSWERED (2026-06-10): yes — caseload-scoped.** `therapistPortal.service`
  filters every treatment-plan read + write by `{ assignedTherapists: therapistId }`
  (stronger than branch). Option B is safe on the scoping axis; the open part is the
  model question (Q3).
- **Q2.** Do any clients call `/api/therapist/treatment-plans` (camelCase path) vs
  `/api/therapist-extended/treatment-plans` (kebab)? (Determines what can be retired.)
- **Q3.** Is the service-backed (B) or direct-model (C) implementation the intended
  canonical shape for the therapist portal?

## Consequences

- **Positive:** one therapist-extended implementation, one scoping path, no split
  security posture, no stranded duplicate.
- **Negative / interim:** two plan models (`CarePlan` vs `TherapeuticPlan`) back the
  same surface, so consolidation is a model decision (ADR-026/040 family) larger
  than a route-retire. No live IDOR — both paths are scoped (Q1 audited).
- **Follow-on:** mirrors ADR-038; consider a drift guard forbidding a third
  therapist-extended route file.

> **Status: 🟡 Proposed.** Blocked on Q1–Q3. No code ships from this ADR until then;
> the W1119/W1112 hardening on the kebab file stays as-is (it is the live winner at
> `/api/therapist-extended`).
