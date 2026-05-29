# Money Migration — Phase 2 Cutover Runbook (audit #5)

Phase 1 (EXPAND) is **complete and on PR #167**: all 35 finance/payroll/statutory
models dual-write integer-`*_halalas` siblings from their float fields on every
`.save()`, the floats remain the source of truth, and reads are unchanged. The
canonical helpers live in `backend/intelligence/money.lib.js`
(`toHalalas`/`toSar`/`formatSar`/`sumHalalas`/`applyPercent`/`deriveHalalas`),
and `backend/__tests__/no-float-money-fields-finance-wave579.test.js` ratchets
the float-money field count down.

This runbook covers everything **after** EXPAND. It is operational — it touches
production data and changes what the UI displays — so it is deliberately NOT
automated by the agent. Run it yourself, per environment, with verification gates.

## Prerequisites

1. **Merge PR #167** (EXPAND) to `main` and deploy it. From this point every NEW
   write already populates `*_halalas` — only pre-existing rows need backfilling.
2. Confirm the dual-write is live: create/update one invoice in each environment
   and check `total_amount_halalas === round(total_amount * 100)`.

## Sequence (per model, never skip a gate)

### Step 1 — BACKFILL existing rows

`backend/scripts/backfill-invoice-halalas.js` is the template (idempotent,
chunked, **dry-run by default**). For each model, clone it (swap the model +
`*_MONEY_FIELDS` list) or generalize it to take a model name.

```bash
# 1. DRY RUN first — prints would-update counts, writes nothing
node backend/scripts/backfill-invoice-halalas.js                 # on a TEST DB
# 2. Inspect the sample diffs + count. Then apply on TEST:
node backend/scripts/backfill-invoice-halalas.js --apply --batch=1000
# 3. Reconcile (below). Only then run --apply against PROD, in a maintenance window.
```

**Reconciliation gate (must pass before cutover):**

```js
// For a sample (and ideally all) rows of the model:
assert(doc[`${f}_halalas`] === toHalalas(doc[f])); // for every money field f
// Aggregate check: SUM(float)*100 ≈ SUM(halalas) within ±(row count) halalas
```

Add this as a one-off script or a CI fixture test. Do not proceed while any row
mismatches.

### Step 2 — READ CUTOVER (behaviour change — highest risk)

Switch readers to the integer field and convert at the display/API boundary:

- **Display:** `formatSar(doc.total_amount_halalas)` instead of `doc.total_amount`.
- **Aggregations:** `$sum: '$total_amount_halalas'` (exact) instead of the float.
- **External payloads (ZATCA XML, Mudad WPS, payment gateways):** send decimal
  SAR via `formatSar(...)` — NEVER raw halalas.
- Find read sites: `grep -rn "\.total_amount\b" backend services` etc., plus the
  web-admin surfaces and `importExportPro`/PDF exporters.

Run BOTH representations in parallel for a soak period and log any divergence
(> 0 halalas) before flipping each surface. Cut over one model/surface at a time.

### Step 3 — CONTRACT (destructive — last, after a soak)

Only after Step 2 is fully live and reconciled for a model:

- Stop writing the float field (drop it from the schema / writers).
- Drop the float column/field from stored docs (a final migration). **Irreversible
  — take a backup first.**
- Update the drift-guard baseline: remove the now-gone float field (the guard's
  stale-baseline assertion forces this), ratcheting the 163-count down.

## Model order (lowest blast radius first)

1. Low-volume, low-risk: `Cheque`, `RecurringTransaction`, `TaxCalendar`,
   `BankAccount`.
2. Core billing (highest correctness value, do carefully): `Invoice`,
   `Payment`, `CreditNote`, `EInvoice`, `PaymentTransaction`.
3. Ledger + tax: `JournalEntry`, `ChartOfAccount`, `InsuranceClaim`, `VATReturn`,
   `WithholdingTax`, `TaxFiling`.
4. Payroll/statutory: `payroll`, `mudad`, `nitaqat`, `gosi`, `gratuity`,
   `compensation`, `taqat`.
5. Nested/aggregate: `CostCenter`, `CashFlow`, `FinancialTransaction`,
   `ExpenseApprovalChain`, `Budget`, `CashFlow` flows.

## Residual EXPAND debt (finish during/before its model's cutover)

Two definitional spots were deliberately left in Phase 1 (shorthand-typed,
deeply-nested, low-value):

- `compensation.model.js` — `compensationStructure` allowance/deduction **template**
  arrays (`ranges[]`/`fixedAllowances[]`/`variableAllowances[].amount`, shorthand
  `amount: Number`).
- `gratuity.model.js` — `calculation.{additions,deductions}.items[].amount` +
  `calculation.baseGratuity.details.yearsBreakdown[].amount` (intermediate calc
  detail).
  Migrate these with the per-element array pattern (see `ExpenseApprovalChain`) if
  their cutover requires exact components; otherwise they can stay float since their
  totals are already integer.

## Rollback

- Steps 1–2 are non-destructive (additive field + read switch) — revert the read
  change to roll back instantly; the floats are untouched.
- Step 3 is the only irreversible step — gate it on a verified backup + a green
  reconciliation, and do it per-model so blast radius is one collection.

## Verification checklist per model

- [ ] Dual-write confirmed on a fresh write (post-EXPAND deploy)
- [ ] Backfill dry-run reviewed → applied on TEST → reconciled
- [ ] Backfill applied on PROD (maintenance window) → reconciled
- [ ] Read sites switched (display/agg/external) + soak with parallel logging
- [ ] No divergence over the soak window
- [ ] Backup taken → float field dropped → guard baseline ratcheted down
