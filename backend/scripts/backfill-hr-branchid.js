#!/usr/bin/env node
'use strict';

/**
 * backfill-hr-branchid.js — W1133 companion (HR branch-isolation denormalization).
 * ════════════════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing employee-private HR docs from the record's
 * employee (`Employee.branch_id`), so the W1133 fail-closed route gates don't 403
 * legitimate pre-W1133 rows that were written before the hrBranchScope plugin
 * existed. Dry-run unless `--commit`; only SETS a missing branchId, never
 * overwrites; idempotent (re-running after a full pass is a no-op).
 *
 * Mirrors the established backfill-*-branchid.js convention (see
 * backfill-careplan-branchid.js), generalized over the 7 W1133 models.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/backfill-hr-branchid.js                       # dry-run, all 7
 *   MONGODB_URI=... node scripts/backfill-hr-branchid.js --commit              # apply
 *   MONGODB_URI=... node scripts/backfill-hr-branchid.js --collection=loans    # one model
 *   ... --json
 */

// The 7 employee-private HR models carrying the W1133 hrBranchScope plugin, each
// with the employee FK the branch is derived from.
const MODELS = [
  { key: 'loans', modelPath: '../models/HR/Loan', fk: 'employeeId' },
  { key: 'travel', modelPath: '../models/HR/TravelRequest', fk: 'employeeId' },
  { key: 'health-insurance', modelPath: '../models/HR/HealthInsurance', fk: 'employeeId' },
  { key: 'assets', modelPath: '../models/HR/AssetAssignment', fk: 'employeeId' },
  { key: 'onboarding', modelPath: '../models/HR/OnboardingChecklist', fk: 'employeeId' },
  { key: 'visas', modelPath: '../models/HR/VisaRequest', fk: 'employeeId' },
  { key: 'shift-swaps', modelPath: '../models/HR/ShiftSwap', fk: 'requesterId' },
];

/**
 * Backfill a single model. Resolves each missing-branchId doc's employee FK to
 * Employee.branch_id (cached), updating only with `commit`. Pure of process/CLI.
 * @returns {{ key: string, missing: number, resolved: number, skipped: number, updated: number }}
 */
async function backfillModel(model, Employee, { commit } = {}) {
  const Model = require(model.modelPath);
  const docs = await Model.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
    [model.fk]: { $ne: null },
  })
    .select(`_id ${model.fk}`)
    .lean();

  const cache = new Map(); // employeeId(str) -> branch_id | null
  let resolved = 0;
  let skipped = 0;
  let updated = 0;
  for (const doc of docs) {
    const empId = doc[model.fk];
    if (!empId) {
      skipped++;
      continue;
    }
    const key = String(empId);
    let branchId = cache.get(key);
    if (branchId === undefined) {
      const emp = Employee
        ? await Employee.findById(empId).select('branch_id branchId').lean()
        : null;
      branchId = (emp && (emp.branch_id || emp.branchId)) || null;
      cache.set(key, branchId);
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    resolved++;
    if (commit) {
      await Model.updateOne({ _id: doc._id }, { $set: { branchId } });
      updated++;
    }
  }
  return { key: model.key, missing: docs.length, resolved, skipped, updated };
}

/**
 * Run the backfill across the selected models. Connects to Mongo, loads Employee
 * + each model, returns the per-model + total summary.
 */
async function run({ commit = false, only = null } = {}) {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  let Employee = null;
  try {
    Employee = require('../models/HR/Employee');
  } catch {
    Employee = null;
  }
  const selected = only ? MODELS.filter(m => m.key === only) : MODELS;
  const results = [];
  for (const model of selected) {
    try {
      results.push(await backfillModel(model, Employee, { commit }));
    } catch (err) {
      results.push({ key: model.key, error: err.message });
    }
  }
  return {
    mode: commit ? 'commit' : 'dry-run',
    employeeModelAvailable: !!Employee,
    results,
    totals: {
      missing: results.reduce((s, r) => s + (r.missing || 0), 0),
      resolved: results.reduce((s, r) => s + (r.resolved || 0), 0),
      updated: results.reduce((s, r) => s + (r.updated || 0), 0),
    },
  };
}

if (require.main === module) {
  const commit = process.argv.includes('--commit');
  const jsonOut = process.argv.includes('--json');
  const onlyArg = process.argv.find(a => a.startsWith('--collection='));
  const only = onlyArg ? onlyArg.split('=')[1] : null;

  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }

  run({ commit, only })
    .then(async summary => {
      if (jsonOut) {
        console.log(JSON.stringify(summary, null, 2));
      } else {
        console.log('');
        console.log(`W1133 HR.branchId backfill — ${summary.mode}`);
        console.log('───────────────────────────────────────────────');
        for (const r of summary.results) {
          if (r.error) {
            console.log(`  ${r.key.padEnd(18)} ERROR: ${r.error}`);
          } else {
            console.log(
              `  ${r.key.padEnd(18)} missing=${r.missing} → resolved=${r.resolved} skipped=${r.skipped}` +
                `${commit ? ` updated=${r.updated}` : ''}`
            );
          }
        }
        console.log('───────────────────────────────────────────────');
        console.log(
          `Total: missing=${summary.totals.missing} ${commit ? 'updated' : 'wouldUpdate'}=${
            commit ? summary.totals.updated : summary.totals.resolved
          }`
        );
        if (!commit && summary.totals.resolved > 0) console.log('Re-run with --commit to apply.');
        console.log('');
      }
      const mongoose = require('mongoose');
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(err => {
      console.error('backfill-hr-branchid failed:', err.message);
      process.exit(2);
    });
}

module.exports = { MODELS, backfillModel, run };
