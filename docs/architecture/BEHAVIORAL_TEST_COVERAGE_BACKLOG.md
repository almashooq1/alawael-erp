# Behavioral Test Coverage Backlog

**Generated**: 2026-05-26 (during W356-W384 behavioral-pair sweep)
**Pattern**: see [CLAUDE.md "Critical conventions"](../../CLAUDE.md) bullet "Pair every static drift guard with a behavioral counterpart" + memory file `feedback_pair_static_with_behavioral_tests.md`
**Template**: `backend/__tests__/caregiver-support-program-behavioral-wave384.test.js`

## Why this doc exists

The W356-W384 behavioral sweep (2026-05-26) proved that paired behavioral tests catch a class of bugs static drift guards cannot — typo'd enum values in fixtures, missing required field on referenced models, unreachable conditional paths. Two real bugs caught at test-write time during the 11-module sweep (W357 `reportedBy` required, W358 `'speech_natural'` not in MODALITIES enum).

This doc surfaces the **remaining Wave-18 models** in the codebase that lack a behavioral counterpart. Future sessions (or future `متابعه` turns) can pick from this backlog.

## Audit query (run to regenerate)

```bash
cd backend
find models -name "*.js" -exec grep -l "path('__invariants').validate\|path(\"__invariants\").validate" {} \; | while read model; do
  base=$(basename "$model" .js)
  test_refs=$(grep -lE "require\(['\"].*models/(.*/)?$base['\"]\)|models/$base" __tests__/*.test.js 2>/dev/null | wc -l)
  behav=$(grep -lE "require\(['\"].*models/(.*/)?$base['\"]\)|models/$base" __tests__/*behavioral*wave*.test.js 2>/dev/null | wc -l)
  echo "$base $test_refs $behav"
done | awk '$2 > 0 && $3 == 0 {print}'
```

## High-priority gaps (HAS static test, MISSING behavioral)

These are the most valuable next-up targets — the static infrastructure already exists, just need to add the MongoMemoryServer-based behavioral counterpart following the W384 template.

| Model                            | Static refs | Behavioral | Estimated effort | Why high-value                                                                                                   |
| -------------------------------- | ----------: | ---------: | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `CarePlanVersion`                |           3 |          0 | M (~1 hr)        | Canonical care plan (W41); 30+ caller ecosystem; lifecycle invariants critical to W41-W60 chain                  |
| `BeneficiaryLifecycleTransition` |           1 |          0 | M (~1 hr)        | Beneficiary lifecycle (W39); MFA-tier-enforced state machine; fail-closed semantics need behavioral verification |
| `AccessReviewAttestation`        |           1 |          0 | M (~1 hr)        | Access review (W38, W95 MFA wiring); compliance-critical attestations                                            |

**Estimated total: ~3 hours for 3 modules, expected ~60-90 behavioral assertions added.**

Same pattern as W356-W384: each behavioral test should cover (1) Wave-18 invariants actually fire via `await expect(p.save()).rejects.toThrow(/field/)`, (2) virtuals compute on persisted docs, (3) defaults on round-trip, (4) compound indexes present, (5) one end-to-end lifecycle happy-path.

## Lower-priority gaps (no static test references found either)

These ~50 models have `path('__invariants').validate(...)` declared but no test file currently references them. They likely have auto-generated `tests/unit/<model>.model.test.js` smoke tests but no Wave-18-specific assertions. Adding STATIC drift guards first (then behavioral) would be the right order.

Categories (from the `__invariants` model audit):

**Attendance suite** (24 models): `AttendanceAuditChain` / `AttendanceConfidenceReview` / `AttendanceCorrectionRequest` / `AttendanceEventOutbox` / `AttendanceException` / `AttendanceImportBatch` / `AttendanceImportSource` / `AttendanceKioskDevice` / `AttendanceNfcCard` / `AttendanceNfcReader` / `AttendancePayrollOverride` / `AttendanceReconciliationCase` / `AttendanceRetentionPolicy` / `AttendanceShift` / `AttendanceShiftAssignment` / `AttendanceSourceEvent` / `BeneficiaryDayAttendance` / `BranchGeofence` / `ClinicalAttendanceDiscrepancy` / `DailyAttendanceRecord` / `EmployeeAttendanceBaseline` / `EmployeeCredential` / `MorningHealthCheck` / `DailyCommunicationLog`.

**Hikvision suite** (10 models): `HikvisionAnomalySnapshot` / `HikvisionBranchConfig` / `HikvisionCameraChannel` / `HikvisionDevice` / `HikvisionFaceLibrary` / `HikvisionFaceTemplateLink` / `HikvisionFraudFlag` / `HikvisionFraudScore` / `HikvisionJobRun` / `HikvisionProcessedEvent`.

**Clinical operations** (8 models): `BeneficiarySection` / `BeneficiarySubsidyEntry` / `DayRehabBusRoute` / `FamilyVisitRequest` / `FieldTrip` / `IncidentAuditChain` / `IndividualEducationPlan` (W200b) / `MedicationAdministrationRecord` (W191b) / `PickupAuthorization` / `RestraintSeclusionEvent` (W193b).

**LLM telemetry** (2 models): `LlmAnomalyAck` / `LlmAnomalySnapshot`.

**Productivity** (4 models): `Productivity/Annotation` / `Productivity/FollowUp` / `Productivity/HandoffNote` / `Productivity/Watchlist`.

**Other** (1): `PayrollPeriod`.

## Recipe (proven 11× in W356-W384 series)

1. Read the model file: identify `__invariants` validator's `if (this.X) { this.invalidate('Y', '...') }` conditions + enum fields + virtual paths + index declarations.
2. Copy `backend/__tests__/caregiver-support-program-behavioral-wave384.test.js` as template.
3. Replace `Program` / `CaregiverSupportProgram` with the new model name.
4. Update `baseDoc(overrides = {})` factory: include ALL `required: true` fields from the schema (not just the model under test — also referenced fields like `reportedBy` that caught W357).
5. For each `invalidate(...)` call in the `__invariants` validator: write 1 REJECTS test (condition triggers) + 1 SAVES test (condition met).
6. For each virtual: write 2-3 cases (gating, computed value, edge case).
7. For each compound index: assert via `Model.collection.indexes()`.
8. Optional: end-to-end lifecycle happy-path that persists + reloads.
9. Run via `npx jest __tests__/<module>-behavioral-waveNNN.test.js --runInBand --no-coverage`.
10. Add to `sprint-tests.txt` (one line, after the static guard).

## Performance benchmark

W356-W384 behavioral suite: **11 suites = 249 assertions in 3.8s** with `--runInBand` (MongoMemoryServer cold-starts first instance, ~1s; subsequent suites ~80-100ms each).

Per-module behavioral test adds ~20 assertions and ~250 LOC.

## Combined with static drift guards

| Layer                   | W356-W384 11 modules | Per-module avg |
| ----------------------- | -------------------: | -------------: |
| Static drift guards     |       401 assertions |      36/module |
| Behavioral counterparts |       249 assertions |      23/module |
| Combined                |   **650 assertions** |  **59/module** |

## When NOT to add a behavioral test

- Model is purely a value object with no `__invariants` virtual path (no conditional logic to test runtime).
- Model is an event/outbox/log with only frozen enum + required fields (validates trivially; static guard sufficient).
- Schema is already retired or deprecated (e.g., the W340 Pattern D rename candidates).

For everything else: PAIR THEM.

## References

- [CLAUDE.md](../../CLAUDE.md) — "Critical conventions" bullet
- `~/.claude/projects/<id>/memory/feedback_pair_static_with_behavioral_tests.md` — full recipe + 5-class bug taxonomy
- `backend/__tests__/caregiver-support-program-behavioral-wave384.test.js` — canonical template
- Commits `dba51569f` + `92bd16e37` + `05c482bd2` (absorbed batch 2) + `378363740` (doctrine) — the W356-W384 behavioral sweep arc
