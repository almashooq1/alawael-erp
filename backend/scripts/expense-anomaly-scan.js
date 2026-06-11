#!/usr/bin/env node
'use strict';

/**
 * expense-anomaly-scan.js — READ-ONLY financial expense anomaly audit (W1218).
 * ════════════════════════════════════════════════════════════════════════════
 * Runs the Tier-3 isolation-forest engine (services/financeAnomaly.service) over
 * a branch's recent expenses and prints the anomalous ones — expenses whose
 * COMBINATION of [amount, day-of-week, cash, round-thousand] is unusual vs the
 * population. Surfaces audit/fraud-review candidates that a flat amount threshold
 * misses. A single read-only aggregation; mutates nothing. Safe against prod.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node scripts/expense-anomaly-scan.js --branch=<id>
 *   MONGODB_URI=mongodb://... node scripts/expense-anomaly-scan.js --branch=<id> --days=180 --json
 *
 * Exit codes: 0 = scan ran · 2 = usage/connection error.
 */

const { detectExpenseAnomalies } = require('../services/financeAnomaly.service');

const JSON_OUT = process.argv.includes('--json');
const BRANCH_ARG = (process.argv.find(a => a.startsWith('--branch=')) || '').split('=')[1] || null;
const DAYS_ARG = parseInt((process.argv.find(a => a.startsWith('--days=')) || '').split('=')[1], 10);
const SINCE_DAYS = Number.isFinite(DAYS_ARG) && DAYS_ARG > 0 ? DAYS_ARG : 90;

function log(...a) {
  if (!JSON_OUT) console.log(...a);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);

  let Expense;
  try {
    Expense = require('../models/Expense');
  } catch {
    console.error('Error: Expense model could not be loaded.');
    await mongoose.disconnect();
    process.exit(2);
  }

  const since = new Date();
  since.setDate(since.getDate() - SINCE_DAYS);
  const query = { isDeleted: { $ne: true }, date: { $gte: since } };
  if (BRANCH_ARG && mongoose.isValidObjectId(BRANCH_ARG)) {
    query.branchId = new mongoose.Types.ObjectId(BRANCH_ARG);
  }

  const expenses = await Expense.find(query)
    .select('amount date category paymentMethod vendor branchId')
    .lean();

  const result = detectExpenseAnomalies({ expenses });

  if (JSON_OUT) {
    console.log(JSON.stringify({ branch: BRANCH_ARG || 'all', windowDays: SINCE_DAYS, ...result }, null, 2));
  } else {
    log('');
    log(`Expense anomaly scan (READ-ONLY)${BRANCH_ARG ? ` — branch ${BRANCH_ARG}` : ''}, window ${SINCE_DAYS}d`);
    log('──────────────────────────────────────────────────────────────────');
    if (!result.eligible) {
      log(`  Not eligible: ${result.reason} (need ≥8 expenses for a population).`);
    } else {
      log(`  Scanned ${result.scanned} expense(s) · threshold ${result.threshold} · ${result.anomalies.length} anomalous`);
      log('');
      for (const a of result.anomalies) {
        log(
          `  ⚠ score ${a.score}  amount ${a.amount}  ${a.category || '—'}  ${a.paymentMethod || '—'}` +
            `${a.signals.length ? `  [${a.signals.join(', ')}]` : ''}${a.vendor ? `  ${a.vendor}` : ''}`
        );
      }
      if (result.anomalies.length === 0) log('  ✓ No anomalous expenses.');
    }
    log('');
    log('  Read-only audit. Flags review candidates by multivariate pattern, not');
    log('  a flat amount threshold — verify flagged expenses against documentation.');
    log('');
  }

  await mongoose.disconnect();
  process.exit(0);
}

module.exports = { detectExpenseAnomalies };

if (require.main === module) {
  main().catch(err => {
    console.error('expense-anomaly-scan failed:', err.message);
    process.exit(2);
  });
}
