'use strict';

/**
 * Seed the atomic-numbering counters from existing document maxima (W1463).
 *
 * The W1463 wave replaced racy `countDocuments()+1` numbering with the atomic
 * `database/utils/counter.js nextSequence()`. Each counter's `seq` must be initialized
 * to the CURRENT MAXIMUM existing number, otherwise nextSequence() would start at 1 and
 * collide with already-issued numbers (E11000 / duplicates).
 *
 * ⚠️ RUN THIS (with --commit) BEFORE deploying the W1463 code. Until then the counters
 * are unseeded and the new code would clash with existing data.
 *
 * Usage:
 *   node scripts/seed-numbering-counters.js              # DRY RUN (default) — prints plan
 *   node scripts/seed-numbering-counters.js --commit     # apply
 *   node scripts/seed-numbering-counters.js --json        # machine-readable dry-run
 *
 * Idempotent: it SETS each counter seq to max(existing), so re-running yields the same
 * result. For yearly counters it seeds every year found (key `name:YYYY`).
 */

const mongoose = require('mongoose');
const { Counter, COUNTER_DEFINITIONS } = require('../database/utils/counter');

// counter → { how to find the source docs + parse the numeric sequence }
const SOURCES = [
  { counter: 'journal_entry', path: '../models/JournalEntry', model: 'JournalEntry', field: 'entryNumber', re: /^JE-0*(\d+)$/, yearly: false },
  { counter: 'helpdesk_ticket', path: '../models/HelpDesk', key: 'HelpDeskTicket', model: 'HelpDeskTicket', field: 'ticketNumber', re: /^HD-0*(\d+)$/, yearly: false },
  { counter: 'insurance_claim', path: '../models/finance/InsuranceClaim', model: 'FinanceInsuranceClaim', field: 'claim_number', re: /^CLM-(\d{4})-0*(\d+)$/, yearly: true },
  { counter: 'finance_invoice', path: '../models/finance/Invoice', model: 'FinanceInvoice', field: 'invoice_number', re: /^INV-(\d{4})-0*(\d+)$/, yearly: true },
  { counter: 'inv_purchase_order', path: '../models/InventoryStock', key: 'PurchaseOrder', model: 'PurchaseOrder', field: 'poNumber', re: /^PO-(\d{4})-0*(\d+)$/, yearly: true },
  { counter: 'inv_stock_count', path: '../models/InventoryStock', key: 'StockCount', model: 'StockCount', field: 'countNumber', re: /^SC-(\d{4})-0*(\d+)$/, yearly: true },
  { counter: 'inv_item', path: '../models/InventoryItem', key: 'InventoryItem', model: 'InventoryItem', field: 'sku', re: /^ITM-0*(\d+)$/, yearly: false },
  { counter: 'inv_supplier', path: '../models/InventoryStock', key: 'Supplier', model: 'Supplier', field: 'code', re: /^SUP-0*(\d+)$/, yearly: false },
];

function resolveModel(src) {
  let mod;
  try {
    mod = require(src.path);
  } catch (e) {
    return { error: `require failed: ${e.message}` };
  }
  let Model = null;
  if (src.key && mod && mod[src.key]) Model = mod[src.key];
  else if (mod && typeof mod === 'function' && mod.modelName) Model = mod;
  if (!Model) {
    try {
      Model = mongoose.model(src.model);
    } catch {
      /* not registered */
    }
  }
  return Model ? { Model } : { error: `model "${src.model}" not resolvable` };
}

/** Group existing numbers → max sequence (per year for yearly counters). */
function computeMaxima(values, src) {
  const maxByYear = {}; // year(or '*') → max seq
  for (const v of values) {
    if (typeof v !== 'string') continue;
    const m = src.re.exec(v);
    if (!m) continue;
    const year = src.yearly ? m[1] : '*';
    const seq = parseInt(src.yearly ? m[2] : m[1], 10);
    if (!Number.isFinite(seq)) continue;
    if (!(year in maxByYear) || seq > maxByYear[year]) maxByYear[year] = seq;
  }
  return maxByYear;
}

async function main() {
  const commit = process.argv.includes('--commit');
  const asJson = process.argv.includes('--json');
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('[seed-numbering-counters] MONGODB_URI/MONGO_URI is required');
    process.exit(1);
  }
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });

  const plan = [];
  for (const src of SOURCES) {
    if (!COUNTER_DEFINITIONS[src.counter]) {
      plan.push({ counter: src.counter, skipped: 'no counter definition' });
      continue;
    }
    const resolved = resolveModel(src);
    if (resolved.error) {
      plan.push({ counter: src.counter, skipped: resolved.error });
      continue;
    }
    const docs = await resolved.Model.find({ [src.field]: { $type: 'string' } }, { [src.field]: 1 })
      .lean()
      .catch(() => []);
    const values = docs.map(d => d[src.field]).filter(Boolean);
    const maxByYear = computeMaxima(values, src);
    const entries = Object.entries(maxByYear);
    if (entries.length === 0) {
      plan.push({ counter: src.counter, scanned: values.length, note: 'no existing numbers — counter left at definition startAt' });
      continue;
    }
    for (const [year, maxSeq] of entries) {
      const key = src.yearly ? `${src.counter}:${year}` : src.counter;
      plan.push({ counter: src.counter, key, scanned: values.length, maxSeq, willSet: `seq=${maxSeq}` });
      if (commit) {
        await Counter.updateOne(
          { _id: key },
          {
            $set: { seq: maxSeq, updatedAt: new Date() },
            $setOnInsert: {
              prefix: COUNTER_DEFINITIONS[src.counter].prefix || '',
              padding: COUNTER_DEFINITIONS[src.counter].padding || 6,
              resetOn: COUNTER_DEFINITIONS[src.counter].resetOn || 'never',
              description: COUNTER_DEFINITIONS[src.counter].description || src.counter,
            },
          },
          { upsert: true }
        );
      }
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ mode: commit ? 'commit' : 'dry-run', plan }, null, 2));
  } else {
    console.log(`[seed-numbering-counters] ${commit ? 'COMMITTED' : 'DRY RUN (use --commit to apply)'}`);
    for (const p of plan) console.log('  ', JSON.stringify(p));
  }

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async err => {
    console.error('[seed-numbering-counters] failed:', err);
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
}

module.exports = { main, computeMaxima, resolveModel, SOURCES };
