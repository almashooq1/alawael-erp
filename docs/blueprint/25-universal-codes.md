# Universal Codes (Barcode / QR) — Runbook

**Status:** Live as of 2026-05-15
**Backend commit:** `c2d2a734` + `7c1e6c2a` (backfill)
**Web-admin commits:** `360866f` + `e4fc906` + `28a305e`

## What it is

A single canonical scannable-code system across every entity in the project.

**Format:** `RH-<TYPE>-<6CHARS>` (e.g. `RH-BNF-A1B2C3`).

| Type | Entity          | Mongoose model              |
| ---- | --------------- | --------------------------- |
| BNF  | Beneficiary     | `Beneficiary`               |
| EMP  | Employee        | `Employee` (HR/Employee.js) |
| INV  | Invoice         | `Invoice`                   |
| AST  | FixedAsset      | `FixedAsset`                |
| DOC  | Document        | `Document`                  |
| SES  | Therapy Session | `TherapySession`            |
| APT  | Appointment     | `Appointment`               |
| VEH  | Vehicle         | `Vehicle`                   |
| ITM  | Inventory Item  | `InventoryItem`             |

The `RH` prefix is overridable via the `UNIVERSAL_CODE_PREFIX` env var.

The 6-char short ID is Crockford-base32 (no 0/O/1/I confusion) derived from the entity's `_id` tail bytes — deterministic, so the same entity always gets the same code.

## How it works

1. **Auto-issuance.** Each entity's mongoose schema calls `schema.plugin(universalCodePlugin, { entityType, labelFrom })`. Every `post('save')` triggers an idempotent `svc.generate()` that issues a code on first save and is a no-op on subsequent saves.
2. **Catalog model** (`models/UniversalCode.js`) holds `{ code, entityType, entityId, status, scanCount, lastScannedAt, lastScannedBy, entityLabel }`. Unique compound index on `(entityType, entityId)` enforces 1:1 mapping.
3. **HTTP endpoints** under `/api/v1/codes/*` for generate / resolve / scan / revoke / render-PNG.
4. **Web-admin UI** at `/scan` (camera) and `/scan/print` (bulk badge printing). Detail pages for all 9 entity types show the QR badge inline via `<EntityCodeBadge>`.

## HTTP endpoints

All require `authenticate` middleware. `/admin/backfill` additionally requires `role === 'admin' | 'super_admin'`.

| Method | Path                             | Purpose                                                                  |
| ------ | -------------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| POST   | `/api/v1/codes/generate`         | Issue (or fetch existing) code for an entity. Idempotent.                |
| GET    | `/api/v1/codes/resolve/:code`    | Look up entity info. No scan-log.                                        |
| POST   | `/api/v1/codes/scan/:code`       | Log a scan + return entity. Increments `scanCount`.                      |
| POST   | `/api/v1/codes/revoke/:code`     | Soft-revoke (status → `revoked`).                                        |
| GET    | `/api/v1/codes/render/:code.png` | Render PNG. Query: `?type=qr                                             | barcode&width=N&scale=N`. |
| POST   | `/api/v1/codes/admin/backfill`   | Backfill for existing entities. `{ entityTypes?, dryRun? }`. Admin only. |

**Status codes:**

- `200` OK / `400` malformed code / `404` not found / `410` revoked / `403` admin-only on `/admin/backfill`.

## Backfill — running on production

After the first deploy of `c2d2a734`, existing records (those created BEFORE the plugin was wired) don't have codes yet. The plugin only fires on `post('save')`, so historical rows are invisible until updated.

Three ways to backfill:

### 1. SSH + CLI (recommended for first-time run)

```bash
ssh root@alaweal.org
cd /var/www/alawael-erp/backend
sudo -u alawael node scripts/backfill-universal-codes.js --dry-run    # preview counts
sudo -u alawael node scripts/backfill-universal-codes.js              # actually issue
```

Flags:

- `--dry-run` — no writes, just counts
- `--types=BNF,EMP` — restrict to specific entity types
- `--uri=mongodb://...` — override MongoDB URI (defaults to env)
- `--help` — usage

Output:

```
=== Backfill complete in 12.3s ===
Totals: { scanned: 1547, issued: 1547, skipped: 0 }

By type:
  BNF: scanned=423, issued=423, skipped=0
  EMP: scanned=89, issued=89, skipped=0
  INV: scanned=312, issued=312, skipped=0
  ...
```

### 2. Admin HTTP endpoint

```bash
TOKEN=$(curl -sX POST https://alaweal.org/api/v1/auth/login \
  -d '{"username":"admin","password":"..."}' \
  -H 'Content-Type: application/json' | jq -r .token)

# Dry-run first
curl -X POST https://alaweal.org/api/v1/codes/admin/backfill \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"dryRun":true}'

# Then real
curl -X POST https://alaweal.org/api/v1/codes/admin/backfill \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 3. Programmatic (from a service)

```js
const { runBackfill } = require('./services/universalCode/backfill');
const summary = await runBackfill({ entityTypes: ['BNF', 'EMP'], dryRun: false });
```

**Idempotency.** Re-running the backfill is safe — already-issued codes show up under `skipped`, not `issued`. No duplicates can be created (unique index on `(entityType, entityId)`).

## Adding a new entity type

1. Add to `ENTITY_TYPES` in `backend/models/UniversalCode.js`:
   ```js
   XYZ: { label: 'NewThing', collection: 'newthings' },
   ```
2. In the mongoose schema file, install the plugin:
   ```js
   const universalCodePlugin = require('../services/universalCode/plugin');
   mySchema.plugin(universalCodePlugin, {
     entityType: 'XYZ',
     labelFrom: doc => doc.name, // optional cached display name
   });
   ```
3. Add to `TYPE_TO_MODEL` in `backend/services/universalCode/backfill.js` so the CLI knows where to look.
4. Add `XYZ: '...'` to `ENTITY_TYPE_LABELS_AR` in `apps/web-admin/src/lib/types/universal-code.ts`.
5. Add `<EntityCodeBadge entityType="XYZ" entityId={...} />` to the detail page in web-admin.

## Coexistence with existing barcode/QR infrastructure

The Universal Code system is the **internal canonical scheme**. It does NOT replace:

| System                                      | Stays | Why                                                    |
| ------------------------------------------- | ----- | ------------------------------------------------------ |
| `barcode` field on inventory items / assets | ✓     | Vendor-printed barcodes on packaging — external scheme |
| `qrCode` on Invoice (ZATCA TLV)             | ✓     | Saudi e-invoicing mandate, fixed payload format        |
| DocumentQR service (per-section signatures) | ✓     | Different semantics (signing) vs. lookup               |
| BlockchainPdfService QR                     | ✓     | Tamper-evidence anchor, not a lookup code              |

When the same physical artifact carries multiple QR codes (e.g. an invoice has ZATCA QR for tax + Universal Code QR for AR), they're rendered side-by-side in the print layout.

## Test surface

| File                                        | Suite              | Tests  |
| ------------------------------------------- | ------------------ | ------ |
| `__tests__/universal-code-service.test.js`  | service unit       | 16     |
| `__tests__/universal-code-routes.test.js`   | routes integration | 8      |
| `__tests__/universal-code-plugin.test.js`   | plugin auto-issue  | 4      |
| `__tests__/universal-code-backfill.test.js` | backfill           | 5      |
| **Total**                                   |                    | **33** |

Run them via:

```bash
npx jest __tests__/universal-code --no-coverage
```

## Troubleshooting

**Q: A new beneficiary saved but no code appears in the UI.**
A: The plugin call is wrapped in `try/catch` and logs a warning on failure. Check `logger` output for `[UniversalCode] auto-issue failed`. Usually means the service module wasn't loadable at schema-init time (e.g. missing dep). Re-deploy.

**Q: An old beneficiary has no code.**
A: Run the backfill — the plugin only fires on save, not on existing records.

**Q: Two beneficiaries got the same short ID.**
A: Mathematically possible (6 chars = 32^6 ≈ 1 billion) but the unique index on `code` would reject the second one. If it happens in practice the second `generate()` throws and you should pick a longer short_id via `shortFromObjectId` (currently 6 chars, can be 7 or 8).

**Q: I revoked a code but the QR still scans on a physical badge.**
A: That's the point of revoke — the physical media isn't recallable. The system rejects scans with HTTP 410. Reprint the badge with a freshly-generated code after revoke (you'll need to delete the UniversalCode row first to mint a new one).

## References

- Backend service: `backend/services/universalCode/`
- Backend routes: `backend/routes/universal-codes.routes.js`
- Backend tests: `backend/__tests__/universal-code-*.test.js`
- Web-admin: `apps/web-admin/src/components/universal-code/` + `src/app/(dashboard)/scan/`
- Memory: `memory/project_barcode_unified_2026-05-15.md`
