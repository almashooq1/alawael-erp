# Saudi National Address (وَصِل / SPL) — Platform-wide Rollout

**Date:** 2026-05-15
**Status:** Slices 1–4 shipped. Strict mandatory-verification policy applied to all entities that carry a postal address.
**Reference adapter:** `backend/services/waselAdapter.js` (mock + live).
**Single source of truth (schema):** `backend/models/_shared/nationalAddress.subschema.js`.

## Why

Before this wave, only `Branch.wasel_short_code` + `Branch.wasel_verification` existed in code and the `/api/v1/wasel/address/verify-short-code` route was wired but consumed by nothing. Every other entity that captured an address used a free-text string (Vendor, Driver) or an ad-hoc structured object (Beneficiary, Customer, Guardian, Employee). PDPL, CBAHI, and the رؤية 2030 e-Government targets require a verified national address on the records that touch real beneficiaries and payments.

The user's directive ("جعل المشروع بالكامل يدعم العنوان الوطني السعودي") was scoped as a full bundle in one wave, with the strict policy: every entity that ships an address MUST present a Wasel-verified short code before save.

## What landed

### Slice 1 — Backend foundation

- `models/_shared/nationalAddress.subschema.js` — reusable Mongoose subdocument:
  - Fields: `shortCode`, `buildingNumber`, `additionalNumber`, `postalCode`, `street`, `district`, `city`, `region`, `country`, `fullAddress`, `geo {lat,lng}`, `isDeliverable`.
  - `verification: { verified, status, mode, verifiedAt, verifiedBy, message }`.
  - `attachNationalAddressGuard(schema, opts)` — modern mongoose 9 `pre('validate')` hook that throws when an address is present but unverified, malformed, or (when `required: true`) missing.
- `services/nationalAddressService.js`:
  - `coerceFromPayload(input)` — normalizes legacy keys (`short_code`, `postal_code`, etc.) to the canonical shape.
  - `verifyAndStamp(addr, { actorId, nationalId })` — hits the adapter and produces a stamped subdocument ready for storage.
  - `requireVerified(addr, label)` — HTTP-friendly assertion (throws 400/422 with codes `NATIONAL_ADDRESS_REQUIRED`, `NATIONAL_ADDRESS_INVALID_FORMAT`, `NATIONAL_ADDRESS_UNVERIFIED`).
- `models/Beneficiary.js` — adds `nationalAddress` field + strict guard.
- Tests (`__tests__/national-address-subschema.test.js`, `national-address-service.test.js`, `beneficiary-national-address-guard.test.js`): **37/37 ✅**.

### Slice 2 — Sweep across remaining domain models

Same field + guard added to:

| Model           | File                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Customer`      | `models/Customer.js`                                                                                                                     |
| `Vendor`        | `models/Vendor.js`                                                                                                                       |
| `Driver`        | `models/Driver.js`                                                                                                                       |
| `Guardian`      | `models/Guardian.js`                                                                                                                     |
| `Employee`      | `models/HR/Employee.js` (legacy `models/Employee.js` re-exports)                                                                         |
| `ContractParty` | `models/ContractParty.js`                                                                                                                |
| `Branch`        | `models/Branch.js` — keeps legacy `wasel_short_code` + `wasel_verification` for backward compat; new writes go through `nationalAddress` |

Smoke test `__tests__/national-address-models-sweep.test.js` asserts every model exposes the field AND rejects an unverified address AND accepts a Wasel-stamped one: **24/24 ✅**.

### Slice 3 — HTTP surface + UI components

- `POST /api/v1/wasel/address/verify-and-stamp` (new) — one-shot endpoint that calls the adapter + returns the canonical subdocument shape the frontend can put directly on the entity. Idempotent via the existing `idempotency.middleware`. **9/9 ✅** including this endpoint's contract.
- **Next.js web-admin** (`alawael-rehab-platform/apps/web-admin`):
  - Types: `src/lib/types/national-address.ts`.
  - API helper: `nationalAddressApi.verifyAndStamp` + `searchByNationalId` in `src/lib/api.ts`.
  - Component: `src/components/ui/national-address-field.tsx` — short-code input + تحقق button + automatic field population + verification badge.
  - Wired into Beneficiary form (`components/beneficiary/beneficiary-form.tsx`) with strict client-side guard that refuses submit when `verification.verified !== true`.
  - **TypeScript: zero errors.**
- **Legacy React frontend** (`frontend/src/components/NationalAddressField.jsx`) — equivalent drop-in using the shared `apiClient` (axios) for forms that still live under `frontend/src/pages/Admin`.
- **Mobile RN** (`mobile/src/services/modules/nationalAddress.ts`) — typed service client ready for any RN screen that captures an address. UI screen not built yet (no current RN screen captures postal addresses).

### Slice 4 — Prisma model coverage

`alawael-rehab-platform/packages/db/prisma/schema.prisma` adds a `nationalAddress Json?` column on `Branch`, `Beneficiary`, `Guardian`, and `Employee`. Migration: `20260515120000_add_national_address/migration.sql`. The JSON column accepts the same shape produced by `/verify-and-stamp`; downstream services use the existing `NationalAddress` TS type.

## Operating modes

```text
WASEL_MODE=mock   (default — used for local dev + CI; sentinel ...00 → not_found, ...99 → invalid)
WASEL_MODE=live   (requires WASEL_BASE_URL + WASEL_API_KEY)
```

Production switch is the same env flip used by the existing adapter — no other config touched.

## Strict-verification policy

- A model with the guard attached accepts records with **no** `nationalAddress` (preserves existing data).
- Once a record provides ANY of `shortCode / buildingNumber / city / street / district / fullAddress`, the guard requires `shortCode` to be a valid Wasel short-code AND `verification.verified === true`.
- Frontend forms refuse to submit when an address is half-filled but unverified.

To require addresses on a per-entity basis (e.g. for the Beneficiary admission workflow), pass `{ required: true }` to `attachNationalAddressGuard`. The current rollout leaves `required: false` everywhere so existing data is preserved.

## Tests at a glance

| Suite                                        | Tests  |
| -------------------------------------------- | ------ |
| `national-address-subschema.test.js`         | 12     |
| `national-address-service.test.js`           | 13     |
| `beneficiary-national-address-guard.test.js` | 5      |
| `national-address-models-sweep.test.js`      | 24     |
| `wasel-address-routes.test.js`               | 9      |
| **Total new + extended**                     | **63** |

Run with:

```text
npx jest __tests__/national-address-*.test.js __tests__/wasel-address-routes.test.js --no-coverage --forceExit
```

## Follow-ups (deliberately out of scope)

- Real Wasel sandbox creds — currently CI runs `mock`. Live integration test is gated on receiving the production OAuth client.
- Per-entity `required: true` flips — should land alongside the workflow redesign so we don't block historical record edits.

## Operational scripts

### Backfill legacy Branch records

```text
# preview only (recommended first run)
npm run wasel:backfill:dry --prefix backend

# real run — idempotent, safe to re-run
npm run wasel:backfill --prefix backend
```

Source: `backend/scripts/backfill-branch-national-address.js`. Walks every `Branch` whose `wasel_short_code` is set AND `nationalAddress` is empty, projects the legacy shape into the unified subdocument, and writes back via `$set`. Leaves legacy fields in place for future-proofing. Unit-tested at `__tests__/backfill-branch-national-address.test.js` (7 tests).

### Pre-flip live mode smoke

Before flipping production to `WASEL_MODE=live`, run from a bastion or CI step:

```text
WASEL_MODE=live \
WASEL_BASE_URL=https://api.address.gov.sa \
WASEL_API_KEY=*** \
WASEL_TEST_CODE=RFYA1234 \
  npm run wasel:smoke --prefix backend
```

Exit code 0 means every adapter path returned cleanly (live connection health + verify a known good code + verify-and-stamp end to end + invalid-format handling). Exit code 1 or 2 means DO NOT flip yet — investigate.

## Production flip checklist

1. Get sandbox creds from وَصِل / SPL provider.
2. Run `wasel:smoke` against the sandbox URL until 5/5 ✅.
3. Set `WASEL_MODE=live`, `WASEL_BASE_URL`, `WASEL_API_KEY` in the production environment (pm2 + Docker `.env`).
4. Restart the API process — watch `/api/v1/wasel/address/health` for `mode=live`.
5. Run `wasel:backfill:dry` first, then `wasel:backfill` once results look right.
6. Spot-check a known-good real short code via the admin UI to confirm the round-trip.
