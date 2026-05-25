# 21 — Session → NPHIES Claim Bridge

> **Why this exists**
>
> The NPHIES integration was complete on every layer except the one that
> matters most to operators: there was no entry-point that turned a
> finished therapy session into a claim. Billing staff had to hand-fill
> the claim form from the session record. This bridge closes that gap.

## What it does

`backend/services/sessionToClaimBridge.js` exposes one function:

```js
const { buildClaimFromSession } = require('./sessionToClaimBridge');

const result = await buildClaimFromSession(sessionId, {
  unitPrice: 250,
  diagnosis: [{ code: 'F84.0', description: 'Childhood autism' }],
  // optional:
  cptOverride: { code: '97110', description: 'Therapeutic Exercises', specialty: 'PT' },
  dryRun: false,
});
// → { ok, claim, errors, warnings, dryRun }
```

It:

1. Loads the `TherapySession` and its populated `Beneficiary`.
2. Validates that the session is billable and that the beneficiary has a
   non-expired insurance policy on file.
3. Maps `session.sessionType` (Arabic enum like `'علاج طبيعي'`) to a
   NPHIES-compatible CPT code via `SESSION_TYPE_TO_CPT`.
4. Builds a draft `NphiesClaim` document with diagnosis, CPT-coded service,
   pricing, and insurance fields populated from the beneficiary.
5. Persists it (unless `dryRun: true`) with `nphies.submission.status = NOT_SUBMITTED`.

The caller then submits via the existing
`POST /api/admin/nphies-claims/:id/submit` endpoint, which has
idempotency, rate-limiting, the circuit breaker, and the dual mock/live
adapter.

## Errors vs warnings

The contract distinguishes the two on purpose:

| Type       | Behavior                       | Examples                                                                                                                                     |
| ---------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `errors`   | Block creation. Return 422.    | `no_insurance_on_file`, `insurance_coverage_expired`, `session_not_billable:NO_SHOW`, `beneficiary_missing`                                  |
| `warnings` | Surface to UI. Allow creation. | `session_not_completed:SCHEDULED`, `unit_price_missing_or_zero`, `diagnosis_missing`, `session_already_billed`, `unmapped_session_type:أخرى` |

Rationale: a billing user may legitimately want to draft a claim before
the session technically reaches `COMPLETED` (e.g. mid-week batch run), but
the user must NEVER try to bill an insurance that doesn't exist.

## CPT mapping

Source of truth: `SESSION_TYPE_TO_CPT` in the bridge module.

| Arabic session type | CPT code | Description               | Specialty |
| ------------------- | -------- | ------------------------- | --------- |
| علاج طبيعي          | 97110    | Therapeutic Exercises     | PT        |
| علاج وظيفي          | 97530    | Therapeutic Activities    | OT        |
| نطق وتخاطب          | 92507    | Speech Therapy Individual | SLP       |
| علاج سلوكي          | 97153    | ABA Treatment by Protocol | BA        |
| علاج نفسي           | 96130    | Psychological Testing     | PSY       |

Codes mirror `REHAB_CPT_CODES` in
`backend/services/nphies.service.js:44` so the FHIR bundle builder
recognizes them downstream. A session with `sessionType = 'أخرى'` (or any
unmapped value) gets the fallback CPT `99999` and a
`unmapped_session_type` warning so the UI can prompt for an override.

## HTTP

Mounted on the existing therapy-sessions admin router:

```text
POST /api/admin/therapy-sessions/:id/create-claim
```

Body (all optional):

```json
{
  "unitPrice": 250,
  "diagnosis": [{ "code": "F84.0", "description": "Childhood autism" }],
  "cptOverride": { "code": "97110", "description": "...", "specialty": "PT" },
  "dryRun": false
}
```

Responses:

- `201` — `{ ok: true, claim, warnings, dryRun: false }`
- `200` (dry-run) — `{ ok: true, claim, warnings, dryRun: true }`
- `422` — `{ ok: false, errors, warnings }` (validation failed)
- `400` — invalid session id format
- `500` — server error (uses the project's `safeError` formatter)

RBAC: `WRITE_ROLES` (admin / superadmin / manager / clinical_supervisor /
therapist / receptionist) — same set that can edit the session itself.

## Pricing — automatic tariff lookup

Pricing resolves in three priority tiers (first one that wins):

1. **Caller override** — if `options.unitPrice` is a positive number, use it.
   The UI passes this when the billing user wants to override the tariff
   (special-case discount, manual correction, dry-run preview).
2. **Tariff lookup** — `services/insuranceTariffs.lookupPrice()` resolves
   `(provider, providerId, cptCode, date) → unitPrice`. This is the
   default path: the negotiated rate for the insurer + CPT effective on
   the session date. See `backend/models/InsuranceTariff.js` for shape.
3. **Warning** — if neither yielded a price, the claim is built with
   `unitPrice: 0` and a `unit_price_missing_or_zero` warning. The UI
   should refuse to submit such a claim until a price is set.

The response now includes `priceSource`:

- `'override'` — caller passed `unitPrice`
- `'tariff:providerId'` — matched on the canonical NPHIES insurer id
- `'tariff:provider'` — matched on the human-readable insurer name
- `null` — neither matched (the warning fires)

Pass `useTariff: false` to skip the lookup entirely (e.g. for tests,
dry-runs, or scenarios where you explicitly do not trust the tariff
table).

### Tariff data shape

```text
provider:        'Bupa Arabia'         // human-readable, case-insensitive match
providerId:      'BUPA-001'            // optional canonical NPHIES insurer id
cptCode:         '97110'               // CPT code (mirror REHAB_CPT_CODES)
unitPrice:       175                   // SAR (or whatever currency)
currency:        'SAR'                 // default
effectiveFrom:   2026-01-01            // required
effectiveTo:     null                  // null = indefinite
isActive:        true                  // soft-disable without deleting
```

### Lookup rules (deterministic)

1. Try canonical `providerId` exact match first.
2. Else case-insensitive `provider` name match.
3. Filter to rows with `effectiveFrom <= date AND (effectiveTo IS NULL OR effectiveTo >= date) AND isActive`.
4. Of those, pick the **most recent `effectiveFrom`**.
5. If two active rows tie on `effectiveFrom`, the service throws
   `ambiguous` — silently picking one would let the same input return
   different prices on different calls. Treat as a data-quality bug.

### Tariff seed (day-1 deploy)

A starter dataset with 25 rows (5 major Saudi insurers × 5 mapped CPTs)
ships in `backend/services/finance/insuranceTariffsBootstrap.js`.
The CLI wrapper:

```bash
# Apply (idempotent — safe to re-run)
node backend/scripts/seed-insurance-tariffs.js

# Preview without writing
node backend/scripts/seed-insurance-tariffs.js --dry-run

# Machine-readable output
node backend/scripts/seed-insurance-tariffs.js --json
```

Output schema: `{ inserted, updated, skipped, total, dryRun }`.

Idempotency rules:

- Keyed on `(provider, providerId, cptCode, effectiveFrom)`. Re-runs
  update `unitPrice` + `notes` only when the in-DB price has drifted.
- Existing rows are **never deleted** by the seed.
- **Soft-disabled rows are NOT auto-restored.** If an operator
  intentionally disabled a row, the seed leaves it disabled. To
  re-enable, use the admin UI's "Restore" button.

⚠️ **Pricing is starter-only.** The numbers are derived from CCHI
average tariff bulletins 2024–2026 and must be replaced per
negotiated contract before go-live. The notes field on every seeded
row carries the same warning.

Insurers covered (all participate in NPHIES):

- Bupa Arabia
- Tawuniya
- MedGulf
- AlRajhi Takaful
- Walaa

CPT codes covered (mirror `SESSION_TYPE_TO_CPT`):

- 97110 (PT — Therapeutic Exercises)
- 97530 (OT — Therapeutic Activities)
- 92507 (SLP — Speech Therapy)
- 97153 (BA — ABA Treatment by Protocol)
- 96130 (PSY — Psychological Testing)

Tests: `backend/tests/unit/insuranceTariffsBootstrap.test.js` (12
tests covering dataset shape + idempotency + drift handling +
soft-disable preservation + dry-run).

### Tariff admin CRUD

Tariffs are managed via the admin route + UI:

- **Route:** `/api/admin/insurance-tariffs` (mounted via `_registry.dualMount`)
  - `GET /` — list (filters: provider, cptCode, isActive, free-text q)
  - `GET /:id` — single
  - `POST /` — create (required: provider, cptCode, unitPrice ≥ 0)
  - `PATCH /:id` — update (allow-list of fields; ad-hoc fields are dropped)
  - `DELETE /:id` — **soft-disable** (sets `isActive: false`; row is kept
    so historical claims with `priceSource = tariff:<id>` retain their
    audit trail)
  - `POST /:id/restore` — re-enable a soft-disabled row
- **RBAC:** finance / insurance_officer / admin / superadmin / manager
- **Frontend page:** `frontend/src/pages/finance/InsuranceTariffsAdmin.jsx`
  - Filter row (provider search + CPT code + active/inactive toggle)
  - Table with inline edit / disable / restore actions
  - Edit/create dialog with date-range guard (effectiveTo ≥ effectiveFrom)
- **Tests:** `backend/tests/unit/insurance-tariffs-admin.routes.test.js`
  (CRUD + validation + soft-delete + allow-list) +
  `frontend/src/__tests__/a11y/insurance-tariffs-admin.a11y.test.js`

## Frontend UI

`frontend/src/components/nphies/CreateClaimDialog.jsx` — MUI dialog that
posts to the create-claim route. Mounted in
`frontend/src/pages/rehab/TherapySessionAdmin.js` as a button on the
session detail dialog ("إنشاء مطالبة تأمينية").

Form fields:

- **Unit price** (required) — the negotiated price per unit for the CPT.
- **Diagnosis rows** (optional, dynamic add/remove) — ICD-10 code +
  description.
- **Dry-run toggle** — preview the claim without persisting.

UX behavior:

- Backend `errors` block; the alert region (with `aria-live="polite"`)
  shows them as red chips.
- Backend `warnings` are surfaced as orange chips and do not prevent the
  user from re-submitting.
- On success (non-dryRun), the parent page snackbar shows the claim
  number and `onCreated` callback fires so callers can refresh lists.
- The dialog cannot be closed mid-request — close button is disabled
  while loading.

a11y coverage: `frontend/src/__tests__/a11y/create-claim-dialog.a11y.test.js`
adds 3 audits (open / closed / no-meta) to the gated suite. All pass at
0/0/0/0.

## Bulk driver — month-end batch

`backend/services/bulkSessionClaims.js` exposes `runBulk()` for the
month-end use case: turn 100+ completed-but-unbilled sessions into
NPHIES claim drafts in one call.

```text
POST /api/admin/therapy-sessions/bulk-create-claims
body: { from: '2026-04-01', to: '2026-04-30', dryRun?, maxBatch? }
```

Response (201 on success, 200 on dry-run):

```json
{
  "ok": true,
  "candidateCount": 142,
  "created": [
    {
      "sessionId": "...",
      "claimId": "...",
      "claimNumber": "CLM-202604-A1B2C3",
      "total": 175,
      "priceSource": "tariff:provider",
      "warnings": []
    }
  ],
  "skipped": [
    { "sessionId": "...", "reason": "already_claimed" },
    { "sessionId": "...", "reason": "no_insurance_on_file", "errors": ["no_insurance_on_file"] }
  ],
  "failed": [{ "sessionId": "...", "error": "..." }],
  "dryRun": false,
  "durationMs": 4321
}
```

Key invariants:

- **Atomic per-session.** A failure on any single session (network blip,
  schema mismatch) NEVER stops the rest of the batch.
- **Idempotent.** Sessions that already have a NphiesClaim row are
  skipped with `reason: 'already_claimed'`. Re-running the same window
  is safe.
- **Partition-honest.** Every candidate session ends up in _exactly_ one
  of `created`, `skipped`, `failed`. The sum of their lengths equals
  `candidateCount`.
- **Skipped vs failed.** Business-rule rejections (no insurance,
  expired coverage, …) → `skipped`. Thrown exceptions (DB error,
  programmer mistake) → `failed`. The two arrays let the UI alert on
  `failed` while showing `skipped` as informational.
- **Capped.** `maxBatch` is hard-capped at 500. Use multiple windows for
  larger ranges (don't tune this number — split the call instead).
- **Branch-scoped.** Non-HQ users only see sessions for beneficiaries
  in their branch (same logic as the rest of the admin router).

## Bulk frontend UI

`frontend/src/components/nphies/BulkCreateClaimsDialog.jsx` is the
billing-officer UI for the bulk endpoint. Mounted on
`TherapySessionAdmin.js` as a "مطالبات مجمّعة" header button.

Behavior:

- Defaults to **this month** (1st → today) — the typical end-of-month flow.
- **Dry-run is on by default.** The user previews the report, then flips
  the switch off and re-runs to commit. This protects against creating
  hundreds of bad claims because of a wrong date or stale tariff.
- The report renders three collapsible sections (created / skipped /
  failed) each with a count chip + sample of items. Each section is
  keyboard-toggleable (Enter or Space) and exposes `aria-expanded`.
- When `candidateCount === 500` (the server hard cap), an inline alert
  tells the user that more sessions may exist and recommends splitting
  the date window. We do not raise the cap silently — it exists to keep
  a single call's latency bounded.
- The submit button is `color="warning"` (orange) when dry-run is OFF,
  to make the destructive nature visually obvious.
- A11y coverage in `__tests__/a11y/bulk-create-claims-dialog.a11y.test.js`
  (open + closed audits, both 0/0/0/0).

## Lifecycle: session.isBilled lock

When a NPHIES claim transitions **into** `APPROVED` (via webhook OR
via the reconciliation sweeper), `nphiesReconciliationService.applyClaimUpdate`
fires a side-effect that sets `session.isBilled = true` and
`session.invoiceId = claim._id` on the linked TherapySession.

This closes the lifecycle: once a session is billed and reimbursed, the
`session.isBilled` flag prevents accidental re-billing through any of
the create-claim paths (single, bulk, manual). The bridge already warns
when `session.isBilled` is true, so the cycle is:

```text
session COMPLETED        → bridge creates draft claim   (warns, doesn't block)
draft submitted to NPHIES → status=PENDING_REVIEW
NPHIES approves          → recon service flips:
                              claim.status = PAID
                              claim.nphies.submission.status = APPROVED
                              session.isBilled = true       ← the new lock
session COMPLETED again  → bridge warns "session_already_billed"
```

Idempotency + safety guarantees:

- The hook fires only on **transitions into** APPROVED (`previousStatus !== 'APPROVED'`).
  Re-receiving the same APPROVED webhook does not re-touch the session.
- The hook uses `updateOne({ _id, isBilled: { $ne: true } })` so a session
  that was already billed by some other path is never double-touched —
  the `modifiedCount: 0` is reported back as `sessionUpdated: false`.
- Claims with no linked session (e.g. ad-hoc claims created outside the
  bridge) are unaffected — the hook short-circuits when `claim.session`
  is null.
- The hook is **best-effort**: any exception in `SM.updateOne` is caught,
  logged, and surfaced as `sessionUpdated: false`. The claim mutation is
  the source of truth and is never rolled back over a billing-flag
  failure. Manual reconciliation can recover.
- Status aliases (`ACCEPTED` → `APPROVED`, etc.) are mapped before the
  transition check, so the hook fires correctly regardless of how
  NPHIES spells the status.

Test coverage: `backend/__tests__/nphies-session-billing-hook.test.js`
(8 scenarios) — first transition, no-session claims, idempotent re-runs,
REJECTED, already-billed sessions, model throws, null model, status aliases.

## Tests

```text
backend/tests/unit/sessionToClaimBridge.test.js                  # 26 tests (22 + 4 tariff)
backend/tests/unit/insuranceTariffs.test.js                      # 12 tests
backend/tests/unit/bulkSessionClaims.test.js                     # 12 tests (selection + idempotency + partition + dryRun)
backend/__tests__/nphies-session-billing-hook.test.js            #  8 tests (lifecycle: session.isBilled lock)
backend/tests/unit/insurance-tariffs-admin.routes.test.js        # 16 tests (CRUD + validation + soft-delete)
backend/tests/unit/insuranceTariffsBootstrap.test.js             # 12 tests (seed dataset + idempotency)
frontend/src/__tests__/a11y/create-claim-dialog.a11y.test.js     #  3 a11y tests
frontend/src/__tests__/a11y/bulk-create-claims-dialog.a11y.test.js #  2 a11y tests
frontend/src/__tests__/a11y/insurance-tariffs-admin.a11y.test.js #  1 a11y test
```

Coverage:

- Static CPT map + non-billable status set
- `generateClaimNumber()` format + uniqueness
- `mapSessionTypeToCpt()` known + fallback paths
- Input validation (invalid id, missing session, missing beneficiary)
- Insurance gating (no insurance, no policy number, expired coverage)
- Status gating (cancelled, no-show, scheduled, already-billed)
- Happy-path build with mapped CPT, pricing, copay, insurance fields
- Warnings without errors (missing price, missing diagnosis, unmapped type)
- `cptOverride` precedence
- `dryRun` mode skips persistence

Run: `npx jest tests/unit/sessionToClaimBridge.test.js --no-coverage`
