#!/usr/bin/env node
/**
 * progress-validate.js — Wave 118 / P3.3.
 *
 * Operational sweeper for progressPrediction. Validates expired
 * `prediction_type=progress` predictions by reading the beneficiary's
 * current Goal progress and writing `actual_value` + `deviation` +
 * `validated_at` + `status='expired'`. Then refreshes the model
 * accuracy stored in AiModelConfig (model_name='progress_predictor').
 *
 * Exit codes:
 *   0  sweep ran
 *   1  internal error (DB unreachable, service threw)
 *
 * Usage:
 *   node scripts/progress-validate.js               colorized summary
 *   node scripts/progress-validate.js --json        machine-readable JSON
 *   node scripts/progress-validate.js --quiet       exit-code only
 *   node scripts/progress-validate.js --help        this message
 *
 * Env:
 *   MONGODB_URI                                    default mongodb://localhost:27017/alawael-erp
 */

'use strict';

const args = process.argv.slice(2);
const flag = name => args.includes(name);

if (flag('--help') || flag('-h')) {
  process.stdout.write(
    [
      'progress-validate — sweep expired progress predictions',
      '',
      'Looks up each active progress prediction whose target_date is',
      'in the past, reads beneficiary Goal progress, and writes',
      'actual_value. Then refreshes AiModelConfig accuracy score.',
      '',
      'Exit codes:',
      '  0  sweep ran',
      '  1  internal error',
      '',
      'Usage:',
      '  node scripts/progress-validate.js               colorized summary',
      '  node scripts/progress-validate.js --json        machine-readable JSON',
      '  node scripts/progress-validate.js --quiet       exit-code only',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = flag('--json');
const QUIET = flag('--quiet');

const useColor = !JSON_MODE && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  gray: useColor ? '\x1b[90m' : '',
};

async function main() {
  const mongoose = require('mongoose');
  const Beneficiary = require('../models/Beneficiary');
  // Goal model location varies — try the common paths in order.
  let Goal = null;
  for (const p of ['../models/Goal', '../models/CarePlanGoal', '../models/goal']) {
    try {
      Goal = require(p);
      if (Goal) break;
    } catch {
      /* continue */
    }
  }
  if (!Goal) {
    process.stderr.write(
      '[progress-validate] Goal model not found at standard paths; cannot validate\n'
    );
    return 1;
  }
  const svc = require('../services/ai/progressPrediction.service');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const startedAt = new Date();
  const validatedCount = await svc.validatePastPredictions(Beneficiary, Goal);
  const elapsedMs = new Date().getTime() - startedAt.getTime();

  // Read the refreshed accuracy score from AiModelConfig
  const AiModelConfig = require('../models/AiModelConfig');
  const cfg = await AiModelConfig.findOne({ model_name: 'progress_predictor' }).lean();
  const accuracy = cfg && Number.isFinite(cfg.accuracy_score) ? cfg.accuracy_score : null;
  const trainingDataCount = cfg ? cfg.training_data_count || 0 : 0;
  const lastEvaluatedAt = cfg ? cfg.last_evaluated_at : null;

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          ranAt: startedAt.toISOString(),
          elapsedMs,
          validatedCount,
          modelAccuracy: accuracy,
          trainingDataCount,
          lastEvaluatedAt,
        },
        null,
        2
      ) + '\n'
    );
    return 0;
  }

  if (QUIET) return 0;

  const now = new Date().toLocaleString('en-US', { hour12: false });
  console.log(
    `\n${c.bold}Al-Awael — Progress prediction validation${c.reset}  ${c.dim}${now}${c.reset}\n`
  );
  console.log(
    `  ${c.green}${validatedCount}${c.reset} predictions validated · ` +
      `${c.dim}elapsed ${elapsedMs}ms${c.reset}`
  );
  if (accuracy !== null) {
    const accStr = (accuracy * 100).toFixed(1);
    const color = accuracy >= 0.75 ? c.green : accuracy >= 0.5 ? c.yellow : c.red;
    console.log(
      `  ${c.bold}Model accuracy: ${color}${accStr}%${c.reset}  ` +
        `${c.dim}(n=${trainingDataCount})${c.reset}\n`
    );
  } else {
    console.log(
      `  ${c.dim}Model accuracy: n/a (need ≥10 validated predictions in last 90d)${c.reset}\n`
    );
  }
  return 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    process.stderr.write(`[progress-validate] ${err.stack || err.message}\n`);
    process.exit(1);
  });
