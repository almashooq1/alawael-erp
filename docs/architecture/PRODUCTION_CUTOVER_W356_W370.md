# Production Cutover — W356–W370 Clinical Services Series (W384 follow-up)

Date: 2026-05-25 (W391 follow-up patch)
Authors: AlMashooq + Claude Opus 4.7
Scope: 15 waves (W356–W370) + W384 (CaregiverSupportProgram graduation) + W390 (aggregator polish), ~22 commits, ~14,500 LOC, ~580 drift assertions

**W391 update**: W384 added an 11th module (`CaregiverSupportProgram`, 18 endpoints, +55 drift assertions) and W390 extended the W381 clinical-services aggregator. Everything below applies to the combined surface.

This document is the ops-facing checklist for activating the W356–W370
modules in a production environment. It exists because the work was
shipped behind feature flags + defensive guards; nothing is auto-enabled
on deploy. Each section below maps a build artifact to the env-flag,
database, dependency, or stakeholder step needed to actually use it.

If you are an engineer joining mid-cutover, read this top-to-bottom — the
sections are ordered by deployment dependency, not alphabetically.

---

## 0. Pre-flight: what's NOT in this series

Out of scope for W356–W370; not blocking deployment of the new modules
but worth noting up front:

- **Frontend pages** in `alawael-rehab-platform/apps/web-admin`: not
  built. 10 surfaces still need Next.js 15 pages with RTL Arabic +
  bilingual labels. API contracts are stable + documented per route file.
- **Bootstrap cron schedulers** are wired into `app.js` but
  default-disabled. See section 4 below for activation.
- **Stakeholder-blocked decisions**: ADR-026 (IEP/IFSP), ADR-020
  (Student/Beneficiary), ADR-022/023/024 (Pattern D renames). None of
  these gate W356–W370; they can be resolved on a separate timeline.

---

## 1. Mongoose model registrations (auto on `app.js` load)

The following models are registered when `app.js` boots, by virtue of
their route files being required in `features.registry.js`:

| Wave | Model                         | Collection                       | Singleton per beneficiary?    |
| ---- | ----------------------------- | -------------------------------- | ----------------------------- |
| W356 | `SeizureEvent`                | `seizure_events`                 | No (event log)                |
| W357 | `SafeguardingConcern`         | `safeguarding_concerns`          | No (event log)                |
| W358 | `CommunicationAidProfile`     | `communication_aid_profiles`     | **YES** (unique index)        |
| W359 | `AssistiveDevice`             | `assistive_devices`              | No (asset catalog)            |
| W360 | `CbahiAttestation`            | `cbahi_attestations`             | No (per-branch + standard)    |
| W361 | `TransitionPlan`              | `transition_plans`               | No (multiple per lifetime)    |
| W362 | `AdaptiveSportsProgram`       | `adaptive_sports_programs`       | No (multiple per beneficiary) |
| W363 | `RespiteBooking`              | `respite_bookings`               | No (event log)                |
| W368 | `BeneficiaryDietPrescription` | `beneficiary_diet_prescriptions` | **YES** (unique index)        |
| W369 | `FacilityAsset`               | `facility_assets`                | No (asset catalog)            |
| W384 | `CaregiverSupportProgram`     | `caregiver_support_programs`     | No (multiple per beneficiary) |

**MongoDB index creation**: Mongoose auto-creates indexes on first model
use. For prod, run `db.runCommand({listIndexes: <collection>})` after
deploy to verify the compound + unique indexes are present. The unique
ones (W358 + W368 + W359 assetTag+branchId + W360 branchId+standardKey)
are the ones that gate dup-record prevention.

**No data migrations required** — every model defaults to safe initial
state. Existing data is untouched.

---

## 2. HTTP routes mounted via `features.registry.js`

All under dual mount: `/api/<path>` AND `/api/v1/<path>`.

| Wave | Path                 | Endpoints | Auth?               |
| ---- | -------------------- | --------- | ------------------- |
| W356 | `/seizure-log`       | 11        | `authenticateToken` |
| W357 | `/safeguarding`      | 13        | `authenticateToken` |
| W358 | `/communication-aid` | 12        | `authenticateToken` |
| W359 | `/assistive-device`  | 20        | `authenticateToken` |
| W360 | `/cbahi`             | 16        | `authenticateToken` |
| W361 | `/transition-plan`   | 15        | `authenticateToken` |
| W362 | `/adaptive-sports`   | 17        | `authenticateToken` |
| W363 | `/respite`           | 17        | `authenticateToken` |
| W368 | `/diet-prescription` | 17        | `authenticateToken` |
| W369 | `/facility-asset`    | 19        | `authenticateToken` |
| W384 | `/caregiver-support` | 18        | `authenticateToken` |

**Total: 175 endpoints** added across this series (157 W356-W370 + 18 W384).
All use the existing `safeError` utility + `requireRole` middleware. No new
auth/MFA infrastructure required.

**Role definitions referenced** (some may need adding to the canonical
role list if absent):

- `safeguarding_lead` (W357) — narrow READ/INVESTIGATE set
- `dietitian` (W368) — clinical prescriber
- `speech_language_pathologist` (W368) — clinical prescriber
- `physician` (W368) — clinical prescriber
- `facility_manager` (W369) — write+approve
- `maintenance` (W369) — write
- `safety_officer` (W369) — write
- `compliance` (W369, W360) — read
- `inventory` (W359) — write+approve
- `coach` (W362) — write
- `social_worker` (W361, W363, W384) — write
- `kitchen` (W368) — read
- `psychologist` (W384) — clinical write
- `counselor` (W384) — clinical write
- `family_coordinator` (W384) — write

If any of these are missing from your auth-provider role list, add them
before activating the matching module's UI. Backend won't reject them
silently — the routes will accept any of the listed roles + the
canonical admin/manager/supervisor set.

---

## 3. Canonical schema registry (auto on `intelligence/canonical/` load)

All 10 entities registered in `intelligence/canonical/index.js` ENTRIES.
Available via:

```js
const { canonical, canonicalEntry } = require('./intelligence/canonical');
const parsed = canonical.SeizureEvent.safeParse(payload);
const entry = canonicalEntry('SeizureEvent');
// entry = { name, modulePath, mongooseModelName, schema }
```

Use these from validator middleware (e.g. `validateBody(canonical.X)`)
to centralize input validation against the canonical contract.

Registry total grew **11 → 22 entries** (21 W356-W369 + W384 caregiver-support).
Drift-detection lib (`mongoose-drift.lib.js`) can now compare any Mongoose
schema against its canonical Zod equivalent.

---

## 4. Bootstrap cron sweepers — 11 ENV flags

All default-disabled. To activate, set `ENABLE_<FLAG>=true` in the
environment + restart. Each is independent — turn them on one at a time
and watch the logs.

| ENV flag                              | Wave | Schedule (Asia/Riyadh) | Mutates state?                                                          |
| ------------------------------------- | ---- | ---------------------- | ----------------------------------------------------------------------- |
| `ENABLE_SAFEGUARDING_SLA_SWEEPER`     | W357 | Daily 08:00            | No (read+log)                                                           |
| `ENABLE_DEVICE_LOAN_SWEEPER`          | W359 | Daily 09:00            | No                                                                      |
| `ENABLE_DEVICE_MAINTENANCE_SWEEPER`   | W359 | Daily 09:30            | No                                                                      |
| `ENABLE_RESPITE_NOSHOW_SWEEPER`       | W363 | Daily 02:00            | **YES** (auto-flips approved/confirmed → no_show after 24h+no check-in) |
| `ENABLE_TRANSITION_OVERDUE_SWEEPER`   | W361 | Daily 10:00            | No                                                                      |
| `ENABLE_CBAHI_REASSESSMENT_SWEEPER`   | W360 | Weekly Mon 06:00       | No                                                                      |
| `ENABLE_AAC_REASSESSMENT_SWEEPER`     | W358 | Weekly Mon 06:30       | No                                                                      |
| `ENABLE_DIET_REVIEW_SWEEPER`          | W368 | Weekly Mon 07:00       | No                                                                      |
| `ENABLE_FACILITY_INSPECTION_SWEEPER`  | W369 | Daily 05:00            | No                                                                      |
| `ENABLE_FACILITY_MAINTENANCE_SWEEPER` | W369 | Daily 05:30            | No                                                                      |
| `ENABLE_FACILITY_CERT_SWEEPER`        | W369 | Daily 06:00            | No                                                                      |

**Drift-guard contract**: the W364 + W370 drift guards assert exactly
**one** `.save()` call across the entire bootstrap (the respite no-show
mutation). If you add a second mutating sweeper, you must update the
W364 baseline + document why; otherwise CI fails. This is by design.

**Recommended activation order** (safest first, riskiest last):

1. Read-only weekly sweepers first: CBAHI + AAC + diet review. Run for
   1 week; verify the logger output matches what the dashboard shows.
2. Read-only daily sweepers: facility inspection / maintenance / cert,
   safeguarding SLA, device loan / maintenance, transition overdue.
3. **LAST**: `ENABLE_RESPITE_NOSHOW_SWEEPER` — this mutates state. Run
   only after operational team has confirmed the 24h-no-check-in rule
   matches their policy. The sweeper appends a marker to `notes` so
   auto-flipped bookings are traceable in audit.

---

## 5. CBAHI standards registry (W360 + W367)

45 starter standards across 8 chapters. Each standard cross-links to
existing models where applicable (e.g. `PSG_SEIZURE_RESPONSE` →
`SeizureEvent`; `EOC_MEDICAL_EQUIPMENT_PPM` → `AssistiveDevice` +
`FacilityAsset`).

**To use**:

1. `GET /api/cbahi/standards` — see the full catalog
2. `POST /api/cbahi/attestations` per (branch, standardKey) to seed a
   draft attestation. Recommended: pre-seed all 45 × N-branches at deploy
   via a one-shot script (~200 lines of seeder; not included in this
   series — write per your data conventions).
3. Per-attestation: gather evidence + flip status to met/partially_met/
   not_met/not_applicable via `POST /attestations/:id/attest`.
4. Dashboard: `GET /api/cbahi/attestations/dashboard?branchId=X`
   surfaces compliance% (formula: `(met + 0.5*partial) / (total - na)`).

**Expansion**: the registry is intentionally a starter set. Adding
standards is a code change (append to `STANDARDS` array + bump W360
drift guard's `length === 45` baseline). The ratchet-UP pattern is
documented in commit W367 (`ea2243d6f`). Future expansion should
involve a CBAHI accreditation specialist; 100+ standards is the realistic
end state.

---

## 6. Sprint suite gating (W365 + W370)

13 drift guards added to `backend/sprint-tests.txt` (12 W356-W370 + 1 W384):

```text
__tests__/seizure-log-wave356.test.js
__tests__/safeguarding-wave357.test.js
__tests__/communication-aid-wave358.test.js
__tests__/assistive-device-wave359.test.js
__tests__/cbahi-wave360.test.js
__tests__/transition-plan-wave361.test.js
__tests__/adaptive-sports-wave362.test.js
__tests__/respite-wave363.test.js
__tests__/clinical-sweepers-wave364.test.js
__tests__/canonical-schemas-wave366.test.js
__tests__/diet-prescription-wave368.test.js
__tests__/facility-asset-wave369.test.js
__tests__/caregiver-support-program-wave384.test.js
```

Run via `cd backend && npm run test:sprint` (the main CI gate, ~13 min
for the full ~225-file suite). The 13 guards together add **~580
assertions** (525 W356-W370 + 55 W384), all static-analysis (no
MongoMemoryServer required) — they execute in under 11 seconds total.

---

## 7. Frontend (alawael-rehab-platform repo) — DELIVERED W372-W376 + W384

All 11 surfaces shipped 2026-05-25 across `apps/web-admin/src/app/(dashboard)/`:

```text
apps/web-admin/src/app/(dashboard)/
  seizure-log/              ← W356 (list + [id] + new — W372/W374)
  safeguarding/             ← W357 (W373/W375/W376)
  communication-aid/        ← W358 (W373/W375/W376)
  assistive-devices/        ← W359 (W373/W375/W376)
  cbahi/                    ← W360 (+ W367 expansion — W373/W375/W376)
  transition-plans/         ← W361 (W373/W375/W376)
  adaptive-sports/          ← W362 (W373/W375/W376)
  respite/                  ← W363 (W373/W375/W376)
  diet-prescription/        ← W368 (W373/W375/W376)
  facility-assets/          ← W369 (W373/W375/W376)
  caregiver-support/        ← W384 (list + [id] + new — W384)
  clinical-services/[id]/   ← W381 cross-surface aggregator (8 cards as of W390)
```

Total: **33 new pages** (10 list + 10 detail + 10 new-event forms +
1 aggregator + 1 deep-link from BeneficiaryMasterFile — W382). All
use Arabic-first RTL + contextual lifecycle action buttons + Wave-18
client-side conditional required-field validation. The clinical
section of `components/layout/nav-items.v2.tsx` registers all 11
list-page links.

Pattern: `seizure-log` is the reference implementation for event-log
surfaces; the other 9 follow it line-for-line with field-name swaps.
`caregiver-support` adopted the same conventions in W384 — conditional
sections per programType (training shows totalModules; sibling_group
shows ageRange) + contextual action buttons + Zarit pre/post outcome
panel.

---

## 8. Monitoring + alerting

The sweepers emit `logger.info` (summary counts) + `logger.warn` (first
20 violator records). For production alerting:

- **Tier 1 (paging-worthy)**: `[respite] auto no-show save failed`,
  `[safeguarding] SLA breach` for critical severity, `[facility]
inspection due` for `criticality=life_safety` assets.
- **Tier 2 (daily digest)**: all other sweeper warnings.
- **Tier 3 (info-only)**: sweeper summary counts.

Route via your existing log aggregator (Loki / Datadog / CloudWatch
Logs) + alert rules keyed on the `[<module>]` prefix.

---

## 9. Stakeholder decisions awaiting external input

These do NOT block W356–W370 deployment but are referenced by them and
should be resolved on a separate timeline:

- **ADR-026** — IEP/IFSP/CarePlanVersion 3-way fragmentation. The W361
  TransitionPlan model cross-links to BOTH `CarePlanVersion` AND
  `IndividualEducationPlan` to stay neutral until the ADR is resolved.
- **ADR-020** — Student vs Beneficiary. The new models all ref
  `Beneficiary` (the canonical decision is implicit in the build), but
  legacy `Student`-based modules remain.
- **ADR-022/023/024** — Pattern D renames for ApprovalRequest /
  ReportTemplate / WorkflowInstance.

---

## Quick verification on cutover day

After deploy:

```bash
# 1. Verify routes registered
curl http://api/api/seizure-log/today          # → 401 (auth required) — correct, route exists
curl http://api/api/cbahi/standards            # → 401 — correct
curl http://api/api/facility-asset/life-safety # → 401 — correct

# 2. Verify canonical registry
node -e "console.log(require('./backend/intelligence/canonical').registry.list().length)"
# Expected: 22  (11 baseline + W356-W369 + W384)

# 3. Verify CBAHI catalog
node -e "console.log(require('./backend/intelligence/cbahi-standards.registry').STANDARDS.length)"
# Expected: 45

# 4. Run drift guards
cd backend && npx jest --config=jest.config.js \
  __tests__/seizure-log-wave356.test.js \
  __tests__/safeguarding-wave357.test.js \
  __tests__/communication-aid-wave358.test.js \
  __tests__/assistive-device-wave359.test.js \
  __tests__/cbahi-wave360.test.js \
  __tests__/transition-plan-wave361.test.js \
  __tests__/adaptive-sports-wave362.test.js \
  __tests__/respite-wave363.test.js \
  __tests__/clinical-sweepers-wave364.test.js \
  __tests__/canonical-schemas-wave366.test.js \
  __tests__/diet-prescription-wave368.test.js \
  __tests__/facility-asset-wave369.test.js \
  __tests__/caregiver-support-program-wave384.test.js \
  --no-coverage
# Expected: 13 suites pass, ~580 assertions in <11s
```

If any of the above returns differently than expected, do not enable the
sweepers — the build is in an inconsistent state and needs a diagnostic
pass before activation.

---

## References

- All 19 commits of the W356-W370 series are on `origin/main` between
  `2258c8176` (W356) and `e1c0788bc` (W370).
- W384 CaregiverSupportProgram backend at `74e37c814`; frontend trio at
  alawael-rehab-platform commit `20921e8`. W390 aggregator + docs at
  `4a3369de7` (backend) + `2c78c3b` (frontend).
- Memory: `~/.claude/projects/c--Users-x-be-OneDrive-----------04-10-2025-66666/memory/project_w356_w363_gap_close_series_2026-05-25.md`
- Original module audit: `MODULE_AUDIT_2026-05-25.md` (in this directory)
  — Caregiver/sibling support row marked CLOSED W384.
- ADR-026 (only stakeholder-blocked item touching this series):
  [decisions/026-iep-ifsp-care-plan-fragmentation.md](decisions/026-iep-ifsp-care-plan-fragmentation.md).
- CLAUDE.md "Wave numbers W356-W390 consumed" line documents the parallel
  agent collisions on W381/W383/W384/W390 (clinical-services series vs.
  event-bus bridge series; both attributions preserved).
