#!/usr/bin/env node
'use strict';

/**
 * smoke-clinical-spine.js — W1285.
 *
 * LIVE smoke of the CLINICAL VALUE LOOP — the golden-thread + intelligence
 * spine built across W1090→W1219 / W1204 / W1206 / W1214 — against the real
 * database. Complements smoke-launch-spine (W1268, the data-ENTRY spine:
 * register/session/form); THIS proves the data-OUTCOME spine actually closes
 * end-to-end for one beneficiary journey:
 *
 *   1. SCAFFOLD  — Beneficiary + active EpisodeOfCare persist.
 *   2. GOAL      — a TherapeuticGoal is created R3-COMPLIANT: an objective
 *      carries a PRIMARY measureLink to a REAL measures_library instrument
 *      (proves the W1090/W235 goal↔measure edge + the W1204 "no goal without
 *      a measure" shape are satisfiable against live data).
 *   3. THREAD    — goldenThread.traceByBeneficiary SEES the goal and classifies
 *      its thread stage (the W1156/W1158 read layer works on real persistence).
 *   4. NBA       — nextBestAction.computeForBeneficiary LIGHTS UP with at least
 *      one ranked action carrying the goal as evidence (the W1206 §4.2 fusion
 *      fires; CAPTURE_BASELINE is expected — measure linked, no baseline yet).
 *   5. ROLLUP    — outcomesRollup.rollupForBeneficiary reflects the goal
 *      (W1214 §6.4 tier-1 counts it).
 *
 * Safe-by-design: every created doc id is collected and deleted in `finally`;
 * read-only against everything else. If the measures_library is empty the
 * GOAL step is reported SKIPPED (not failed) — refuse-to-fabricate.
 *
 * Usage:  npm run smoke:clinical-spine   (or node scripts/smoke-clinical-spine.js)
 * Exit:   0 all executed steps passed · 1 otherwise
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_e) {
  /* optional */
}

const mongoose = require('mongoose');

const steps = [];
function step(name, ok, detail) {
  steps.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}
function skip(name, detail) {
  steps.push({ name, ok: true, skipped: true });
  console.log(`⊘ ${name} — SKIPPED${detail ? `: ${detail}` : ''}`);
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);

  // Register all models the spine reads, lazily + tolerant (W340 doctrine).
  const Beneficiary = require('../models/Beneficiary');
  const { EpisodeOfCare } = require('../domains/episodes/models/EpisodeOfCare');
  const { TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal');
  require('../domains/sessions/models/ClinicalSession');
  require('../domains/goals/models/MeasureAlert');
  require('../models/RiskSnapshot');
  const Measure = (() => {
    try {
      return require('../domains/goals/models/Measure').Measure;
    } catch (_e) {
      return mongoose.model('Measure');
    }
  })();

  const goldenThread = require('../services/goldenThread.service');
  const nba = require('../services/nextBestAction.service');
  const rollup = require('../services/outcomesRollup.service');

  const created = []; // [{ model, id }]
  try {
    // ── 1. SCAFFOLD ──────────────────────────────────────────────────
    const branchId = new mongoose.Types.ObjectId();
    const ben = await Beneficiary.create({
      firstName: 'دخان',
      lastName: 'سريري',
      fullName: 'دخان سريري — يُحذف تلقائياً',
      gender: 'male',
      dateOfBirth: new Date('2019-01-01'),
      nationalId: `CLN${Date.now()}`,
      category: 'mental',
      disability: { type: 'mental' },
      branchId,
    });
    created.push({ model: Beneficiary, id: ben._id });

    const ep = await EpisodeOfCare.create({
      beneficiaryId: ben._id,
      branchId,
      status: 'active',
      currentPhase: 'initial_assessment',
      startDate: new Date(),
    });
    created.push({ model: EpisodeOfCare, id: ep._id });
    step('scaffold beneficiary + active episode', !!ben._id && !!ep._id, String(ben._id));

    // ── 2. GOAL with a PRIMARY measure link (R3-compliant) ───────────
    const measure = await Measure.findOne({ status: 'active' })
      .select('_id code name')
      .lean();
    let goalId = null;
    if (!measure) {
      skip('R3 goal↔measure edge', 'measures_library has no active instrument (run seed:measures)');
    } else {
      const goal = await TherapeuticGoal.create({
        beneficiaryId: ben._id,
        episodeId: ep._id,
        branchId,
        title: 'دخان: هدف سريري موصول بمقياس — يُحذف تلقائياً',
        type: 'short_term',
        status: 'active',
        startDate: new Date(),
        target: { value: 100 },
        objectives: [
          {
            title: 'هدف فرعي تجريبي',
            measureLinks: [
              {
                measureId: measure._id,
                measureCode: measure.code,
                linkType: 'PRIMARY',
                weight: 1,
                linkRationale: 'سموك العمود الفقري السريري W1285 — تحقق حلقة القيمة',
                interventionRefs: ['smoke:clinical-spine'],
              },
            ],
          },
        ],
        tags: ['smoke', 'clinical-spine'],
      });
      created.push({ model: TherapeuticGoal, id: goal._id });
      goalId = goal._id;
      const link = goal.objectives[0].measureLinks[0];
      step(
        'R3 goal↔measure edge (PRIMARY link to a real instrument)',
        link && link.linkType === 'PRIMARY' && String(link.measureId) === String(measure._id),
        `measure=${measure.code}`
      );
    }

    // ── 3. GOLDEN-THREAD trace SEES the goal ─────────────────────────
    const trace = await goldenThread.traceByBeneficiary(ben._id);
    const threadHasGoal = goalId
      ? Array.isArray(trace.threads) && trace.threads.some((t) => String(t.goalId) === String(goalId))
      : Array.isArray(trace.threads);
    step(
      'golden-thread trace sees the beneficiary journey',
      threadHasGoal,
      `threads=${(trace.threads || []).length} summary=${JSON.stringify(trace.summary || {})}`
    );

    // ── 4. NBA fusion lights up ──────────────────────────────────────
    const result = await nba.computeForBeneficiary(ben._id);
    const degraded = (result.summary && result.summary.degradedSources) || [];
    const nbaOk = goalId ? Array.isArray(result.actions) && result.actions.length >= 1 : true;
    step(
      'NBA engine fuses signals into ranked actions',
      nbaOk && degraded.length === 0,
      `actions=${result.actions.length}` +
        (result.actions[0] ? ` top=${result.actions[0].code}` : '') +
        (degraded.length ? ` DEGRADED=${degraded.join(',')}` : '')
    );

    // ── 5. ROLLUP reflects the goal ──────────────────────────────────
    const r1 = await rollup.rollupForBeneficiary(ben._id);
    const rollupOk = goalId ? r1.total >= 1 : r1.total >= 0;
    step(
      'outcomes roll-up (tier-1) reflects the goal',
      rollupOk,
      `tier=${r1.tier} total=${r1.total} active=${r1.activeCount}`
    );
  } finally {
    // ── cleanup (reverse order; never throw out of cleanup) ──────────
    let deleted = 0;
    for (const { model, id } of created.reverse()) {
      try {
        await model.deleteOne({ _id: id });
        deleted += 1;
      } catch (_e) {
        /* best-effort */
      }
    }
    step('cleanup (smoke docs deleted)', deleted === created.length, `${deleted} doc(s)`);
    await mongoose.disconnect().catch(() => null);
  }

  const failed = steps.filter((s) => !s.ok);
  console.log('');
  if (failed.length === 0) {
    console.log(`✅ clinical value-loop spine: ${steps.length}/${steps.length} steps passed`);
    process.exit(0);
  }
  console.log(`❌ clinical spine: ${failed.length} step(s) failed: ${failed.map((s) => s.name).join(', ')}`);
  process.exit(1);
}

main().catch((err) => {
  console.error('smoke-clinical-spine fatal:', err.message);
  process.exit(1);
});
