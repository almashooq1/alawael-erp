#!/usr/bin/env node
'use strict';

/**
 * goal-model-consolidation-readiness.js — READ-ONLY data-readiness audit.
 * ════════════════════════════════════════════════════════════════════
 * The goal/measure/plan consolidation ADRs (040, 041, 042 + the 026
 * CarePlan/TherapeuticPlan family) are all blocked on ONE class of unknown:
 * **which model actually holds production data.** This script answers that
 * — it counts the candidate collections and prints a per-ADR readiness verdict,
 * turning "I need a data fact" into "here are the data facts."
 *
 * It does NOT migrate or mutate anything — only `estimatedDocumentCount()` /
 * `countDocuments()`. Safe to run against production. The owner runs it, reads
 * the verdicts, then signs off the canonical-model choice in each ADR.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node scripts/goal-model-consolidation-readiness.js
 *   MONGODB_URI=mongodb://... node scripts/goal-model-consolidation-readiness.js --json
 *
 * Exit codes: 0 = audit ran · 2 = usage/connection error.
 */

const JSON_OUT = process.argv.includes('--json');

function log(...a) {
  if (!JSON_OUT) console.log(...a);
}

// label + canonical mongoose model name + candidate require paths (the model
// must be loaded against a live connection before it can be counted).
const TARGETS = [
  {
    name: 'SmartGoal',
    label: 'SmartGoal — ADR-040 retire candidate',
    paths: ['../models/SmartGoal'],
  },
  {
    name: 'TherapeuticGoal',
    label: 'TherapeuticGoal — ADR-040 canonical',
    paths: ['../domains/goals/models/TherapeuticGoal'],
  },
  { name: 'Goal', label: 'Goal (IEP) — ADR-040 bridge source', paths: ['../models/Goal'] },
  {
    name: 'CarePlan',
    label: 'CarePlan — ADR-042/026',
    paths: ['../domains/care-plans/models/CarePlan', '../models/CarePlan'],
  },
  {
    name: 'TherapeuticPlan',
    label: 'TherapeuticPlan — ADR-042/026',
    paths: ['../domains/care-plans/models/TherapeuticPlan', '../models/TherapeuticPlan'],
  },
  {
    name: 'Measure',
    label: 'Measure — ADR-041 canonical',
    paths: ['../domains/goals/models/Measure'],
  },
  {
    name: 'MeasurementMaster',
    label: 'MeasurementMaster — ADR-041 minor/parallel',
    paths: ['../models/measurement/MeasurementMaster.model'],
  },
  {
    name: 'MeasurementResult',
    label: 'MeasurementResult — context',
    paths: ['../models/measurement/MeasurementResult.model'],
  },
];

const n = v => (typeof v === 'number' ? String(v) : '?');

/**
 * PURE — given a {modelName: count|null} map, produce per-ADR readiness
 * verdicts. No DB / no I/O, so it's unit-testable in isolation.
 * @param {Record<string, number|null>} c
 * @returns {Array<{adr: string, finding: string}>}
 */
function buildVerdicts(c) {
  const v = [];

  if (typeof c.SmartGoal === 'number') {
    v.push({
      adr: 'ADR-040',
      finding:
        c.SmartGoal === 0
          ? 'SmartGoal is EMPTY (0 docs) → retire is trivial; NO data migration needed. Safe to deprecate + remove writes.'
          : `SmartGoal has ${c.SmartGoal} doc(s) → migrate to TherapeuticGoal (${n(c.TherapeuticGoal)}) before retiring. Canonical = TherapeuticGoal.`,
    });
  }

  if (typeof c.Measure === 'number' || typeof c.MeasurementMaster === 'number') {
    const measure = c.Measure;
    const master = c.MeasurementMaster;
    let hint = 'lower MeasurementMaster usage supports "Measure canonical".';
    if (typeof master === 'number' && master === 0) {
      hint = 'MeasurementMaster is EMPTY → fence/retire is trivial; Measure is canonical.';
    } else if (typeof measure === 'number' && typeof master === 'number' && master > measure) {
      hint =
        'MeasurementMaster has MORE data than Measure → re-examine the ADR-041 canonical choice.';
    }
    v.push({
      adr: 'ADR-041',
      finding: `Measure=${n(measure)} vs MeasurementMaster=${n(master)} (results=${n(c.MeasurementResult)}) — ${hint}`,
    });
  }

  if (typeof c.CarePlan === 'number' || typeof c.TherapeuticPlan === 'number') {
    v.push({
      adr: 'ADR-042/026',
      finding: `CarePlan=${n(c.CarePlan)} vs TherapeuticPlan=${n(c.TherapeuticPlan)} — the model carrying production data is the migration TARGET; pick it as canonical.`,
    });
  }

  return v;
}

function resolveModel(mongoose, name, paths) {
  try {
    return mongoose.model(name);
  } catch {
    /* not registered yet */
  }
  for (const p of paths) {
    try {
      require(p);
      return mongoose.model(name);
    } catch {
      /* try next path */
    }
  }
  return null;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);

  const rows = [];
  const counts = {};
  for (const t of TARGETS) {
    const M = resolveModel(mongoose, t.name, t.paths);
    if (!M) {
      rows.push({ name: t.name, label: t.label, resolved: false, count: null });
      counts[t.name] = null;
      continue;
    }
    let count = null;
    try {
      count = await M.estimatedDocumentCount();
    } catch (e) {
      count = `err: ${e.message}`;
    }
    counts[t.name] = typeof count === 'number' ? count : null;
    rows.push({ name: t.name, label: t.label, resolved: true, count });
  }

  const verdicts = buildVerdicts(counts);

  if (JSON_OUT) {
    console.log(JSON.stringify({ counts, rows, verdicts }, null, 2));
  } else {
    log('');
    log('Goal/Measure/Plan consolidation — data-readiness audit (READ-ONLY)');
    log('──────────────────────────────────────────────────────────────────');
    for (const r of rows) {
      log(`  ${r.resolved ? '✓' : '✗ (model not resolved)'}  ${r.label}: ${n(r.count)}`);
    }
    log('');
    log('Per-ADR readiness:');
    for (const vd of verdicts) log(`  • [${vd.adr}] ${vd.finding}`);
    log('');
    log('This audit is read-only. Use the counts to sign off the canonical-model');
    log('choice in each ADR, then run the (separate) migration with its own --execute.');
    log('');
  }

  await mongoose.disconnect();
  process.exit(0);
}

// Export the pure helper for unit tests; only run the CLI when invoked directly.
module.exports = { buildVerdicts };

if (require.main === module) {
  main().catch(err => {
    console.error('goal-model-consolidation-readiness failed:', err.message);
    process.exit(2);
  });
}
