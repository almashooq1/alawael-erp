# 10. Sensitivity-Grade Library

Date: 2026-05-18

## Status

✅ Accepted (Wave 90)

## Context

Before Wave 90, every domain that needed to gate operations on data sensitivity
(MFA tier requirements, freshness windows, ledger anchoring, Nafath signing,
retention windows, PDPL Art. 13 banners) duplicated its own LEVEL→guarantees
mapping. Five domains (beneficiary lifecycle, care-plan transitions,
access-review, hr-change-request, qms.management-review) each had a different
flavor of the same lookup. PDPL Art. 13 banner derivation drifted across
domains — same data classification produced different banner text.

The drift was a real risk: a HIGH-sensitivity action in beneficiary lifecycle
might require MFA tier 2 + 15-min freshness + 7-year retention + Art. 13
banner, but the same classification in care-plan might silently require only
MFA tier 1 because the lookup was duplicated and one copy hadn't been updated.

## Decision

Adopt a single canonical library `backend/intelligence/sensitivity-grade.lib.js`
that owns the LEVEL→guarantees mapping for the entire system:

- **LOW**: MFA tier 1, no freshness req, no ledger, no Nafath, 1y retention, no banner
- **MEDIUM**: MFA tier 1, no freshness, no ledger, no Nafath, 3y retention, no banner
- **HIGH**: MFA tier 2, 15-min freshness, ledger anchor required, no Nafath, 7y retention, Art. 13 banner
- **CRITICAL**: MFA tier 3, 5-min freshness, ledger required, **Nafath required**, 10y retention, Art. 13 banner

API: `sensitivityGrade(level, overrides?)` returns frozen grade object;
`gradeForSeverity(severity)` (case-insensitive); `gradeForLifecycleTransition(transition)`
adapter for Wave 39 lifecycle state machine.

Wave-86 beneficiary-lifecycle MFA enforcement reads `SENSITIVITY_GRADES.HIGH.mfaFreshnessMs`
directly — single source of truth.

## Consequences

**Easier:**

- A new domain that needs sensitivity-aware behavior calls `sensitivityGrade(level)`
  and gets the canonical guarantees — no duplication.
- PDPL Art. 13 banner copy is enforced consistently across the system.
- Tuning a guarantee (e.g. tightening MFA freshness for HIGH from 15 → 10 min)
  changes one constant and propagates everywhere.
- New severity classifications added in the lib propagate without per-domain
  changes.

**Harder:**

- Domains with legitimate exceptions (e.g. care-plan needs slightly different
  retention from beneficiary-lifecycle for HIGH) must pass an `overrides` map
  rather than diverging silently. The lib validates override shape (mfaTier ∈
  {1,2,3}, banner ∈ {Art13, Art20, null}, etc.) and BLOCKS level overrides —
  a domain can change the guarantees for HIGH but not redefine what HIGH means.
- Initial migration touched 5 domains' service code; Wave 90 had to verify
  167/167 tests still pass after consolidation.

**Tradeoffs:**

- Single source of truth (good) vs. domain-specific tuning (constrained to
  overrides). The constraint is the point — drift was the original problem.

## References

- Wave 90 ([`project_wave90_sensitivity_grade_2026-05-18`](../../README.md))
- Anti-Duplication detector (Wave 93) protects this lib from re-inlining.
