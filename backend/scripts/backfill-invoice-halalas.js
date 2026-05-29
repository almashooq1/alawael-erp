'use strict';

/**
 * Backfill integer-halalas siblings on existing FinanceInvoice docs
 * (audit #5, Money-Type Migration — Phase 1 BACKFILL step).
 *
 * Idempotent + chunked + dry-run by default. Derives each `<field>_halalas`
 * from the existing float field; does NOT touch the float fields. Safe to
 * re-run. New writes already dual-write via the model's pre('save') hook — this
 * only covers rows written before the EXPAND deploy.
 *
 * Usage:
 *   node scripts/backfill-invoice-halalas.js            # DRY RUN (no writes)
 *   node scripts/backfill-invoice-halalas.js --apply    # perform updates
 *   node scripts/backfill-invoice-halalas.js --apply --batch=1000
 *
 * Env: MONGODB_URI (required in real use).
 *
 * NOTE: This script is intentionally NOT run by the agent. Run it yourself
 * against a TEST database first, verify reconciliation, then prod in a window.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { toHalalas } = require('../intelligence/money.lib');
const { INVOICE_MONEY_FIELDS } = require('../intelligence/invoice-money.lib');

const APPLY = process.argv.includes('--apply');
const BATCH = Number((process.argv.find(a => a.startsWith('--batch=')) || '').split('=')[1]) || 500;
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_erp';

async function main() {
  await mongoose.connect(URI);
  const Invoice = require('../models/finance/Invoice');

  const filter = {}; // all docs; re-runnable since derivation is deterministic
  const total = await Invoice.countDocuments(filter);
  console.log(
    `[backfill-invoice-halalas] ${APPLY ? 'APPLY' : 'DRY RUN'} — ${total} invoice(s), batch=${BATCH}`
  );

  let processed = 0;
  let updated = 0;
  let mismatchSample = 0;
  const cursor = Invoice.find(filter).lean().cursor();

  let ops = [];
  for (let doc = await cursor.next(); doc; doc = await cursor.next()) {
    processed += 1;
    const set = {};
    let changed = false;
    for (const f of INVOICE_MONEY_FIELDS) {
      const want = doc[f] === undefined || doc[f] === null ? 0 : toHalalas(doc[f]);
      if (doc[`${f}_halalas`] !== want) {
        set[`${f}_halalas`] = want;
        changed = true;
      }
    }
    if (changed) {
      updated += 1;
      if (!APPLY && mismatchSample < 5) {
        console.log(`  would update ${doc.invoice_number || doc._id}:`, set);
        mismatchSample += 1;
      }
      if (APPLY) {
        ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
        if (ops.length >= BATCH) {
          await Invoice.bulkWrite(ops, { ordered: false });
          ops = [];
        }
      }
    }
    if (processed % 1000 === 0) console.log(`  …${processed}/${total}`);
  }
  if (APPLY && ops.length) await Invoice.bulkWrite(ops, { ordered: false });

  console.log(
    `[backfill-invoice-halalas] done — processed=${processed} ${APPLY ? 'updated' : 'would-update'}=${updated}`
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('[backfill-invoice-halalas] FATAL:', err.message);
  process.exit(1);
});
