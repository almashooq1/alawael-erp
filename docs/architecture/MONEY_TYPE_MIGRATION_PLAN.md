# Money-Type Migration Plan (audit #5)

Companion to `docs/architecture/PROJECT_AUDIT_2026-05-29.md`, finding #5
(MEDIUM): **57 monetary fields across 30 models are stored as `Number`
(IEEE-754 double).** Floats can't represent most decimal fractions exactly, so
sums, VAT, and reconciliation accrue sub-halala drift that compounds across
many rows. The riskiest cluster is the VAT chain
(`Invoice.vat_rate` / `taxable_amount` / `vat_amount`) — rounding error there
shows up directly in ZATCA-reported tax.

This is a **multi-phase migration**, not a single edit. It changes how money is
stored, read, computed, aggregated, and reported. The plan below is designed to
ship incrementally on a live system with **no downtime and no lost precision on
existing data**.

## 1. Representation decision

| Option                                  | Pros                                                                                                    | Cons                                                                                                                                                                | Verdict            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **Integer minor units (halalas, ×100)** | Exact; native JS integer arithmetic (`a + b`, `$sum` all exact); fast indexes/compares; no special type | Display layer must ÷100; every read/write/agg site touched; risk of "is this value halalas or SAR?" ambiguity                                                       | **Recommended**    |
| `mongoose.Decimal128`                   | Exact decimal; smaller schema-shape change                                                              | Not a JS number — every arithmetic/compare site must convert (`.toString()` → `Decimal`/`big.js`); aggregation + JSON serialization need care; ORM ergonomics rough | Viable alternative |
| Keep `Number`                           | No work                                                                                                 | The bug                                                                                                                                                             | ✗                  |

**Recommendation: integer halalas.** SAR has exactly 2 decimal places, so
`Math.round(sar * 100)` is lossless and integers are exact end-to-end. Pair it
with a naming convention so a field's unit is unambiguous: suffix integer-minor
fields `_halalas` (e.g. `total_amount_halalas`) OR document a hard rule that all
money fields are integer halalas. A tiny shared helper centralizes conversion:

```js
// backend/intelligence/money.lib.js (new, canonical — do NOT inline ÷100/×100)
const toHalalas = sar => Math.round(Number(sar) * 100);
const toSar = h => Number(h) / 100;
const formatSar = h => (Number(h) / 100).toFixed(2);
```

## 2. The safe rollout pattern (per field group)

Never rename-in-place on a live collection. Use expand → backfill → cutover →
contract:

1. **Expand** — add the new integer field alongside the old float
   (`total_amount` stays; add `total_amount_halalas`). Schema additive only.
2. **Dual-write** — every writer sets BOTH (`x_halalas = toHalalas(x)`).
   A pre-save hook can derive the new field from the old to cover stragglers.
3. **Backfill** — one-off idempotent job: `x_halalas = round(x*100)` for all
   existing rows (chunked, resumable, logged).
4. **Read cutover** — switch readers/aggregations/reports to the integer field;
   the display layer uses `toSar`/`formatSar`. Verify totals match the float
   field within ≤1 halala before flipping.
5. **Contract** — after a soak period, stop writing the float field and drop it
   (separate PR).

Each step is its own PR. Reconciliation reports run against BOTH representations
during steps 2–4 and must agree before contracting.

## 3. Phase order (by blast radius / value)

| Phase | Domain                  | Models (money-field count)                                                                                                                                                                                 | Why first/last                                                                           |
| ----- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **1** | Finance core            | `Invoice` (13) · `finance/Payment` (2) · `finance/InsuranceClaim` (3) · `finance/ChartOfAccount` (2) · `finance/JournalEntry` (2) · `CreditNote` · `EInvoice`                                              | Highest correctness value (VAT/ZATCA, ledger balance); most arithmetic concentrated here |
| **2** | Payroll / HR            | `compensation.model` · `EmploymentContract` · payroll runs                                                                                                                                                 | Mudad/WPS amounts; monthly, lower row-velocity                                           |
| **3** | Inventory / procurement | `inventory/PurchaseOrder` (6) · `InventoryItem` (2) · `InventoryTransaction` (2) · `BankReconciliation`                                                                                                    | Cost/price fields; mostly display + PO totals                                            |
| **4** | CRM / community / misc  | `CrmCampaign` · `CrmReferralCommission` · `CommunityDonation` · `DigitalWallet` · `ecommerce.models` · `WelfareApplication` · `FacilityAsset` · `AssistiveDevice` · `kitchen` · `IFSP` · `EnterpriseUltra` | Lower financial-correctness stakes                                                       |

Re-enumerate before each phase:
`grep -rnE "(amount|price|balance|total|salary|cost|fee|paid|refunded|subtotal|tax|discount|vat|net|gross|unitPrice|wage)\w*\s*:\s*\{[^}]*type:\s*Number" backend/models`

## 4. Per-phase verification

- Backfill job is idempotent + chunked + logs counts; dry-run mode first.
- Reconciliation test: for a sample (and in CI on fixtures), assert
  `toHalalas(floatField) === intField` for every migrated row.
- Round-trip: `toSar(toHalalas(x)) === x` for representative values incl.
  known float-trap values (0.1+0.2, 19.99, large sums).
- VAT recompute test: `Invoice` VAT chain recomputed in integer halalas equals
  the ZATCA-expected value to the halala.

## 5. Lock it in — drift guard (ship in Phase 1)

Add `backend/__tests__/no-float-money-fields-waveNNN.test.js` (static, follows
the W325c ratchet pattern):

- Scan `backend/models` for money-named fields typed `Number`.
- **Baseline** the current 57 as `KNOWN_FLOAT_MONEY_FIELDS`.
- Two assertions: (a) any NEW money-named `Number` field fails CI (forces new
  code to use integer halalas / the canonical helper); (b) stale baseline
  entries (now migrated) must be removed — ratchets the 57 down to 0 across the
  phases.

This guarantees the migration only moves in one direction and no new float-money
field is introduced while it's in flight.

## 6. Out of scope / watch-outs

- **External payloads** (ZATCA e-invoice XML, Mudad WPS, payment-gateway
  initiate/refund) expect SAR decimals — convert at the boundary with
  `formatSar`, never send raw halalas.
- **Existing reports / exporters** (`importExportPro`, PDF invoices) read the
  float fields today; they move in the Phase's read-cutover step.
- This plan does not change currency (single-currency SAR assumed). Multi-
  currency would need a separate `{ amount_minor, currency }` shape.
