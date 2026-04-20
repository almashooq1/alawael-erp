#!/usr/bin/env node
/**
 * outcomes-digest.js — CLI snapshot of clinical outcome trends.
 *
 * Walks ClinicalAssessment records + buckets beneficiaries by trend
 * verdict (improving / steady / declining / insufficient). Designed
 * for weekly clinical-director review + CBAHI evidence.
 *
 * Exit codes:
 *   0 — no beneficiaries declining
 *   1 — at least one declining beneficiary needs clinical review
 *   2 — internal error (DB unreachable)
 *
 * Usage:
 *   node scripts/outcomes-digest.js           # colorized table
 *   node scripts/outcomes-digest.js --json    # machine-readable JSON
 *   node scripts/outcomes-digest.js --quiet   # exit code only
 *   node scripts/outcomes-digest.js --help    # this message
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'outcomes-digest — Clinical outcome trend digest',
      '',
      'Groups beneficiaries by trend verdict over the last 365 days',
      'and reports any whose trajectory is declining.',
      '',
      'Exit codes:',
      '  0  no declining beneficiaries',
      '  1  at least one declining beneficiary',
      '  2  internal error (DB unreachable)',
      '',
      'Usage:',
      '  node scripts/outcomes-digest.js           colorized table',
      '  node scripts/outcomes-digest.js --json    JSON',
      '  node scripts/outcomes-digest.js --quiet   exit-code only',
      '',
      'Env:',
      '  MONGODB_URI                     (default localhost/alawael-erp)',
      '  OUTCOME_STEADY_BAND             score delta within this = steady',
      '  OUTCOME_MIN_FOR_TREND           min assessments for a trend verdict',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = args.has('--json');
const QUIET = args.has('--quiet');

const useColor = !JSON_MODE && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
  gray: useColor ? '\x1b[90m' : '',
};

async function main() {
  const mongoose = require('mongoose');
  const ClinicalAssessment = require('../models/ClinicalAssessment');
  const Beneficiary = require('../models/Beneficiary');
  const outcome = require('../services/outcomeService');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });

  const oneYear = new Date(Date.now() - 365 * 86400000);
  const records = await ClinicalAssessment.find({ assessmentDate: { $gte: oneYear } }).lean();

  const byBenef = new Map();
  for (const r of records) {
    const id = String(r.beneficiary || '');
    if (!byBenef.has(id)) byBenef.set(id, []);
    byBenef.get(id).push(r);
  }

  const trendCounts = { improving: 0, steady: 0, declining: 0, insufficient: 0 };
  const declining = [];
  for (const [beneficiaryId, items] of byBenef) {
    const series = outcome.trajectory(items);
    const trend = outcome.trendDirection(series);
    trendCounts[trend] = (trendCounts[trend] || 0) + 1;
    if (trend === 'declining') {
      const cmp = outcome.compareToBaseline(series);
      declining.push({
        beneficiaryId,
        delta: cmp?.delta,
        latestScore: series[series.length - 1]?.score,
        assessments: series.length,
      });
    }
  }

  const ids = declining.map(d => d.beneficiaryId).filter(id => mongoose.isValidObjectId(id));
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const benefMap = new Map(benefs.map(b => [String(b._id), b]));
  const hydrated = declining
    .map(d => ({
      ...d,
      name:
        [benefMap.get(d.beneficiaryId)?.firstName_ar, benefMap.get(d.beneficiaryId)?.lastName_ar]
          .filter(Boolean)
          .join(' ') || '—',
      beneficiaryNumber: benefMap.get(d.beneficiaryId)?.beneficiaryNumber || null,
    }))
    .sort((a, b) => (a.delta || 0) - (b.delta || 0));

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          windowDays: 365,
          totalBeneficiaries: byBenef.size,
          trendCounts,
          declining: hydrated,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Clinical outcome digest${c.reset}  ${c.dim}${new Date().toISOString().slice(0, 10)}${c.reset}\n`
    );
    console.log(
      `  ${c.dim}Last 365d: ${byBenef.size} beneficiaries · ` +
        `${c.green}${trendCounts.improving} improving${c.dim} · ` +
        `${c.cyan}${trendCounts.steady} steady${c.dim} · ` +
        `${c.red}${trendCounts.declining} declining${c.dim} · ` +
        `${c.yellow}${trendCounts.insufficient} insufficient${c.reset}\n`
    );
    if (hydrated.length > 0) {
      console.log(`  ${c.bold}${c.red}Declining beneficiaries (review priority):${c.reset}`);
      for (const r of hydrated) {
        console.log(
          `    ${c.cyan}${r.name}${c.reset} ${c.gray}(${r.beneficiaryNumber || '—'})${c.reset}` +
            `  ${c.red}Δ${r.delta}${c.reset}` +
            `  ${c.dim}latest: ${r.latestScore} · assessments: ${r.assessments}${c.reset}`
        );
      }
      console.log();
    } else {
      console.log(`  ${c.green}No declining beneficiaries — keep it up.${c.reset}\n`);
    }
  }

  return hydrated.length > 0 ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) {
      console.error(`${c.red}outcomes-digest failed:${c.reset} ${err.message}`);
      if (!QUIET) console.error(`${c.dim}Run with --help for usage.${c.reset}`);
    } else {
      process.stdout.write(
        JSON.stringify({ error: err.message, checkedAt: new Date().toISOString() }) + '\n'
      );
    }
    process.exit(2);
  });
