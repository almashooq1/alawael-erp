#!/usr/bin/env node
'use strict';

/**
 * golden-thread-integrity.js — READ-ONLY golden-thread health audit.
 * ════════════════════════════════════════════════════════════════════
 * The platform's core value loop (the "golden thread") is:
 *
 *     registration → assessment → GOAL → MEASURE → baseline → OUTCOME
 *
 * It is built on `TherapeuticGoal`: a goal carries `objectives[].measureLinks[]`
 * (the goal→measure link), a `baseline.value` (so change/MCID is computable),
 * and `progressHistory[]` (the closed outcome loop). A beneficiary only truly
 * *benefits* when their goals complete that thread. When a goal has no measure
 * link, or a link but no baseline, or a baseline but no progress, the thread is
 * BROKEN — outcomes can't be computed and the beneficiary's progress is invisible.
 *
 * This script classifies every (non-deleted) TherapeuticGoal by the stage at
 * which its thread breaks, and prints a health grade + per-stage findings. It
 * turns "is the system actually helping beneficiaries?" into a measurable number.
 *
 * It does NOT mutate anything — a single read-only aggregation. Safe against prod.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node scripts/golden-thread-integrity.js
 *   MONGODB_URI=mongodb://... node scripts/golden-thread-integrity.js --json
 *   MONGODB_URI=mongodb://... node scripts/golden-thread-integrity.js --branch=<branchId>
 *
 * Exit codes: 0 = audit ran · 2 = usage/connection error.
 */

const JSON_OUT = process.argv.includes('--json');
const BRANCH_ARG = (process.argv.find(a => a.startsWith('--branch=')) || '').split('=')[1] || null;

function log(...a) {
  if (!JSON_OUT) console.log(...a);
}

// The break-stages of the thread, in order. A goal is classified at the FIRST
// stage where it fails — so the histogram reads as "where do goals fall off."
const STAGES = Object.freeze([
  'no_measure_link', // goal exists but no measure linked → thread breaks at goal→measure
  'linked_no_baseline', // measure linked but no baseline → change/MCID uncomputable
  'linked_no_outcome', // linked + baselined but no progress entries → outcome loop open
  'complete', // full thread: goal→measure→baseline→outcome
]);

const STAGE_LABELS = Object.freeze({
  no_measure_link: 'goals with NO measure link (thread breaks at goal→measure)',
  linked_no_baseline: 'measure-linked but NO baseline (change/MCID uncomputable)',
  linked_no_outcome: 'linked + baselined but NO progress entries (outcome loop open)',
  complete: 'FULL thread (goal→measure→baseline→outcome)',
});

/**
 * PURE — given { total, byStage } aggregate counts, produce a structured
 * golden-thread health report. No DB / no I/O, so it is unit-testable in
 * isolation.
 * @param {{ total?: number, byStage?: Record<string, number> }} stats
 * @returns {{ total:number, counts:Record<string,number>, percentages:Record<string,number>, grade:string, findings:string[] }}
 */
function summarizeThread(stats = {}) {
  const total = typeof stats.total === 'number' ? stats.total : 0;
  const byStage = stats.byStage || {};
  const counts = {};
  for (const s of STAGES) counts[s] = byStage[s] || 0;

  const pct = s => (total > 0 ? Math.round((counts[s] / total) * 1000) / 10 : 0);
  const percentages = {};
  for (const s of STAGES) percentages[s] = pct(s);

  const completePct = percentages.complete;
  let grade;
  if (total === 0) grade = 'NO_DATA';
  else if (completePct >= 80) grade = 'HEALTHY';
  else if (completePct >= 50) grade = 'PARTIAL';
  else grade = 'FRAGMENTED';

  const findings = [];
  if (total === 0) {
    findings.push('No TherapeuticGoal documents — the golden thread has no goals to measure yet.');
  } else {
    findings.push(
      `${completePct}% of ${total} goal(s) have the FULL thread (goal→measure→baseline→outcome). Grade: ${grade}.`
    );
    if (counts.no_measure_link > 0) {
      findings.push(
        `${counts.no_measure_link} goal(s) (${percentages.no_measure_link}%) have NO measure link — outcomes cannot be computed for them. Highest-leverage fix: link a PRIMARY measure.`
      );
    }
    if (counts.linked_no_baseline > 0) {
      findings.push(
        `${counts.linked_no_baseline} goal(s) (${percentages.linked_no_baseline}%) are measure-linked but have NO baseline — capture a baseline result so change/MCID becomes computable.`
      );
    }
    if (counts.linked_no_outcome > 0) {
      findings.push(
        `${counts.linked_no_outcome} goal(s) (${percentages.linked_no_outcome}%) are linked + baselined but have NO progress entries — the outcome loop is open; record session progress.`
      );
    }
  }

  return { total, counts, percentages, grade, findings };
}

function resolveTherapeuticGoal(mongoose) {
  try {
    return mongoose.model('TherapeuticGoal');
  } catch {
    /* not registered yet */
  }
  try {
    const mod = require('../domains/goals/models/TherapeuticGoal');
    return mod.TherapeuticGoal || mongoose.model('TherapeuticGoal');
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);

  const Goal = resolveTherapeuticGoal(mongoose);
  if (!Goal) {
    console.error('Error: TherapeuticGoal model could not be resolved.');
    await mongoose.disconnect();
    process.exit(2);
  }

  const match = { isDeleted: { $ne: true } };
  if (BRANCH_ARG && mongoose.isValidObjectId(BRANCH_ARG)) {
    match.branchId = new mongoose.Types.ObjectId(BRANCH_ARG);
  }

  // Single read-only pass: project the three thread booleans per goal, derive a
  // break-stage, then histogram the stages.
  const rows = await Goal.aggregate([
    { $match: match },
    {
      $project: {
        hasMeasureLink: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: {
                    $reduce: {
                      input: { $ifNull: ['$objectives', []] },
                      initialValue: [],
                      in: {
                        $concatArrays: ['$$value', { $ifNull: ['$$this.measureLinks', []] }],
                      },
                    },
                  },
                  as: 'l',
                  cond: { $ne: ['$$l.status', 'unlinked'] },
                },
              },
            },
            0,
          ],
        },
        hasBaseline: { $ne: [{ $ifNull: ['$baseline.value', null] }, null] },
        hasProgress: {
          $or: [
            { $gt: [{ $size: { $ifNull: ['$progressHistory', []] } }, 0] },
            { $gt: [{ $ifNull: ['$currentProgress', 0] }, 0] },
          ],
        },
      },
    },
    {
      $project: {
        stage: {
          $switch: {
            branches: [
              { case: { $not: ['$hasMeasureLink'] }, then: 'no_measure_link' },
              { case: { $not: ['$hasBaseline'] }, then: 'linked_no_baseline' },
              { case: { $not: ['$hasProgress'] }, then: 'linked_no_outcome' },
            ],
            default: 'complete',
          },
        },
      },
    },
    { $group: { _id: '$stage', count: { $sum: 1 } } },
  ]);

  const byStage = {};
  let total = 0;
  for (const r of rows) {
    byStage[r._id] = r.count;
    total += r.count;
  }

  const report = summarizeThread({ total, byStage });

  if (JSON_OUT) {
    console.log(JSON.stringify({ branch: BRANCH_ARG || 'all', ...report }, null, 2));
  } else {
    log('');
    log(`Golden-thread integrity audit (READ-ONLY)${BRANCH_ARG ? ` — branch ${BRANCH_ARG}` : ''}`);
    log('──────────────────────────────────────────────────────────────────');
    log(`  Goals analysed: ${report.total}    Health grade: ${report.grade}`);
    log('');
    for (const s of STAGES) {
      log(`  ${report.counts[s]} (${report.percentages[s]}%)  — ${STAGE_LABELS[s]}`);
    }
    log('');
    log('Findings:');
    for (const f of report.findings) log(`  • ${f}`);
    log('');
    log('This audit is read-only. Use the break-stage histogram to target the');
    log('highest-leverage fix (most goals stuck at the earliest broken stage).');
    log('');
  }

  await mongoose.disconnect();
  process.exit(0);
}

// Export the pure helper for unit tests; only run the CLI when invoked directly.
module.exports = { summarizeThread, STAGES, STAGE_LABELS };

if (require.main === module) {
  main().catch(err => {
    console.error('golden-thread-integrity failed:', err.message);
    process.exit(2);
  });
}
