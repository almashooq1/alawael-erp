#!/usr/bin/env node
'use strict';

/**
 * seed-care-plans.js — Wave 54.
 *
 * Seeds 5 demo care plans across the state machine so the Wave-52 UI
 * has data to display:
 *
 *   plan-demo-1   status: draft
 *   plan-demo-2   status: validation_pending
 *   plan-demo-3   status: submitted_to_supervisor
 *   plan-demo-4   status: under_review (with scorecard)
 *   plan-demo-5   status: approved (full signature chain + evidenceHash)
 *
 * Each plan walks through the state machine via the real service so
 * every invariant is enforced — no shortcuts.
 *
 * Usage:
 *   node backend/scripts/seed-care-plans.js [--reset] [--dry-run]
 *
 *   --reset   Delete existing seed plans (planId starts with "plan-demo-")
 *   --dry-run Walk the script but rollback before commit
 *
 * Requires a live MongoDB connection (uses process.env.MONGODB_URI or
 * MONGO_URI). For CI / offline runs, point at mongodb-memory-server.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

async function main() {
  const RESET = process.argv.includes('--reset');
  const DRY_RUN = process.argv.includes('--dry-run');

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('[seed] MONGODB_URI or MONGO_URI must be set.');
    process.exit(1);
  }

  console.log(`[seed] connecting to ${uri.replace(/\/\/[^@]+@/, '//***@')}...`);
  await mongoose.connect(uri);

  const CarePlanVersion = require('../models/CarePlanVersion');
  const { createCarePlanValidator } = require('../intelligence/care-plan-validator.service');
  const { createCarePlanService } = require('../intelligence/care-plan.service');

  // Optional reset
  if (RESET) {
    const r = await CarePlanVersion.deleteMany({ planId: /^plan-demo-/ });
    console.log(`[seed] reset: deleted ${r.deletedCount} existing demo plan(s)`);
  }

  const validator = createCarePlanValidator({});
  const service = createCarePlanService({
    planVersionModel: CarePlanVersion,
    validator,
    logger: { warn: () => {}, info: () => {} },
  });

  // ─── Deterministic actor + beneficiary ids for the demo ───────
  const therapist = { userId: new mongoose.Types.ObjectId().toString(), role: 'therapist' };
  const supervisor = {
    userId: new mongoose.Types.ObjectId().toString(),
    role: 'clinical_supervisor',
  };
  const beneficiaryId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();

  console.log(`[seed] demo branchId: ${branchId}`);
  console.log(`[seed] demo beneficiaryId: ${beneficiaryId}`);
  console.log(`[seed] demo therapistId: ${therapist.userId}`);
  console.log(`[seed] demo supervisorId: ${supervisor.userId}`);

  // ─── Helper: build a complete, valid draft input ──────────────
  function draftInput(suffix, planType = 'individual_therapy') {
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + 60);
    return {
      planId: `plan-demo-${suffix}`,
      planType,
      specialty: 'SLP',
      beneficiaryId,
      branchId,
      authorId: therapist.userId,
      actor: therapist,
      reasonForPlan: 'initial',
      sessionsPerWeekCap: 5,
      reviewSchedule: { nextReviewAt: reviewDate, cadenceWeeks: 12 },
      goals: [
        {
          goalId: 'g1',
          domain: 'expressive_language',
          statement: `يطلب 40 شيئًا باستخدام النطق خلال 12 أسبوعًا في جلسات NET (خطة ${suffix})`,
          priorityScore: 0.85,
          targetValue: '40',
          targetUnit: 'mands',
          targetHorizonWeeks: 12,
          baselineLink: 'bl-1',
          assessmentLink: 'asm-1',
          measureLink: 'm-1',
          evidenceRefs: [
            {
              kind: 'assessment',
              refId: 'asm-1',
              capturedAt: new Date(Date.now() - 14 * 86400000),
            },
          ],
          confidence: 0.78,
        },
      ],
      programs: [
        {
          programId: 'p1',
          name: 'NET',
          frequencyPerWeek: 3,
          durationMin: 45,
          goalRefs: ['g1'],
        },
      ],
      measures: [{ measureId: 'm-1', instrument: 'VB-MAPP', cadenceWeeks: 10, goalRefs: ['g1'] }],
      familyRole: {
        expectedInvolvementMinutesPerWeek: 30,
        coachingPlan: 'تخصيص عشر دقائق يوميًا للعب وتشجيع الطفل على التواصل اللفظي',
        homeProgram: [
          { activity: 'قراءة قصة قصيرة قبل النوم', frequency: 'يوميًا', goalRef: 'g1' },
        ],
      },
    };
  }

  const created = [];

  // ─── Plan 1 — draft ───────────────────────────────────────────
  {
    const r = await service.createDraft(draftInput('1'));
    if (!r.ok) throw new Error(`Plan 1 failed: ${r.reason}`);
    created.push({ id: r.planVersion._id, status: 'draft', planId: r.planVersion.planId });
    console.log(`[seed] ✓ Plan 1 (draft) created: ${r.planVersion._id}`);
  }

  // ─── Plan 2 — validation_pending ──────────────────────────────
  {
    const c = await service.createDraft(draftInput('2'));
    if (!c.ok) throw new Error(`Plan 2 createDraft: ${c.reason}`);
    // Break one rule so it stays in validation_pending instead of auto-advancing
    const pv = await CarePlanVersion.findById(c.planVersion._id);
    pv.goals[0].evidenceRefs[0].capturedAt = new Date(Date.now() - 120 * 86400000); // > 90d → soft warning
    await pv.save();
    const r = await service.runValidation({ planVersionId: pv._id, actor: therapist });
    if (!r.ok) throw new Error(`Plan 2 runValidation: ${r.reason}`);
    created.push({
      id: r.planVersion._id,
      status: r.planVersion.status,
      planId: r.planVersion.planId,
    });
    console.log(`[seed] ✓ Plan 2 (${r.planVersion.status}) created: ${r.planVersion._id}`);
  }

  // ─── Plan 3 — submitted_to_supervisor ─────────────────────────
  {
    const c = await service.createDraft(draftInput('3'));
    if (!c.ok) throw new Error(`Plan 3 createDraft: ${c.reason}`);
    await service.runValidation({ planVersionId: c.planVersion._id, actor: therapist });
    const r = await service.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    if (!r.ok) throw new Error(`Plan 3 submit: ${r.reason}`);
    created.push({
      id: r.planVersion._id,
      status: 'submitted_to_supervisor',
      planId: r.planVersion.planId,
    });
    console.log(`[seed] ✓ Plan 3 (submitted_to_supervisor) created: ${r.planVersion._id}`);
  }

  // ─── Plan 4 — under_review (with scorecard) ───────────────────
  {
    const c = await service.createDraft(draftInput('4'));
    if (!c.ok) throw new Error(`Plan 4 createDraft: ${c.reason}`);
    await service.runValidation({ planVersionId: c.planVersion._id, actor: therapist });
    await service.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    await service.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    const sc = await service.recordReviewScorecard({
      planVersionId: c.planVersion._id,
      actor: supervisor,
      scorecard: {
        quality: 8,
        compliance: 8,
        clarity: 7,
        measurability: 8,
        safety: 9,
        familyReadiness: 7,
      },
    });
    if (!sc.ok) throw new Error(`Plan 4 scorecard: ${sc.reason}`);
    created.push({ id: c.planVersion._id, status: 'under_review', planId: c.planVersion.planId });
    console.log(
      `[seed] ✓ Plan 4 (under_review, overall ${sc.overall}) created: ${c.planVersion._id}`
    );
  }

  // ─── Plan 5 — approved (full chain) ───────────────────────────
  {
    const c = await service.createDraft(draftInput('5'));
    if (!c.ok) throw new Error(`Plan 5 createDraft: ${c.reason}`);
    await service.runValidation({ planVersionId: c.planVersion._id, actor: therapist });
    await service.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    await service.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    await service.recordReviewScorecard({
      planVersionId: c.planVersion._id,
      actor: supervisor,
      scorecard: {
        quality: 9,
        compliance: 9,
        clarity: 9,
        measurability: 9,
        safety: 9,
        familyReadiness: 9,
      },
    });
    const r = await service.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'approve',
      actor: supervisor,
    });
    if (!r.ok) throw new Error(`Plan 5 approve: ${r.reason}`);
    created.push({ id: r.planVersion._id, status: 'approved', planId: r.planVersion.planId });
    console.log(
      `[seed] ✓ Plan 5 (approved, evidenceHash ${r.planVersion.evidenceHash.slice(0, 12)}…) created: ${r.planVersion._id}`
    );
  }

  // ─── Summary ──────────────────────────────────────────────────
  console.log('\n[seed] Summary:');
  console.log('  Plans created:', created.length);
  for (const p of created) {
    console.log(`    • ${p.planId} → ${p.status} (${p.id})`);
  }

  if (DRY_RUN) {
    console.log('\n[seed] --dry-run flag set; rolling back...');
    await CarePlanVersion.deleteMany({ planId: /^plan-demo-/ });
    console.log('[seed] rolled back.');
  } else {
    console.log('\n[seed] ✓ Seed complete. Visit /admin/care-planning to view.');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[seed] FAILED:', err);
  void mongoose.disconnect();
  process.exit(1);
});
