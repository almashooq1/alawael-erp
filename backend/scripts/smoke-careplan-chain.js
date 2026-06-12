#!/usr/bin/env node
'use strict';

/**
 * smoke-careplan-chain.js — W1263.
 *
 * LIVE end-to-end smoke of the ADR-040 (b) care-plan chain against the real
 * database (not MMS): create → activate (signature + evidence seal + family
 * version) → W50 overdue scan sees it → W45 family-retry serves it → audit
 * trail verifies integrity. Built for the GO-LIVE runbook: run it after any
 * deploy touching the care-plan chain.
 *
 * Safe-by-design:
 *   • Every doc it creates carries tags: ['smoke-w1263'] and is DELETED at
 *     the end (always, via finally) — nothing persists.
 *   • Read-only against everything else; no notifications are dispatched
 *     (worker runs with a capture-only handler).
 *
 * Usage:
 *   node scripts/smoke-careplan-chain.js          run + cleanup
 *   node scripts/smoke-careplan-chain.js --json   machine-readable output
 *
 * Env: MONGODB_URI (falls back to backend/.env)
 * Exit: 0 = every step passed · 1 = a step failed (details printed)
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_e) {
  /* optional */
}

const mongoose = require('mongoose');

const JSON_OUT = process.argv.includes('--json');
const SMOKE_TAG = 'smoke-w1263';

const steps = [];
function step(name, ok, detail) {
  steps.push({ name, ok, detail: detail || null });
  if (!JSON_OUT) console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await mongoose.connect(uri);

  const { UnifiedCarePlan } = require('../domains/care-plans/models/UnifiedCarePlan');
  const { carePlansService } = require('../domains/care-plans/services/CarePlansService');
  const {
    createOverdueReviewScanner,
  } = require('../intelligence/care-plan-overdue-review.scanner');
  const { createFamilyRetryWorker } = require('../intelligence/care-plan-family-retry.worker');
  const { HANDLER_NAMES } = require('../intelligence/care-plan-side-effects.service');
  const { buildUnifiedAuditTrail } = require('../intelligence/care-plan-audit-trail.service');

  const benId = new mongoose.Types.ObjectId();
  const actorId = new mongoose.Types.ObjectId();
  let planId = null;

  try {
    // 1 — create a UI-shaped plan (overdue review date so the scanner fires)
    const plan = await UnifiedCarePlan.create({
      beneficiaryId: benId,
      episodeId: new mongoose.Types.ObjectId(),
      startDate: new Date(),
      status: 'pending_approval',
      reviewCycle: 'monthly',
      nextReviewDate: new Date(Date.now() - 5 * 86400000),
      title_ar: 'خطة دخان تجريبية — تُحذف تلقائياً',
      globalGoals: [
        { title: 'يطلب حاجته بجملة قصيرة', type: 'communication', priority: 'high' },
        { title: 'يلبس قميصه بنفسه', type: 'life_skill', priority: 'medium' },
      ],
      familyComponent: { homeProgram: 'تمرين تسمية الصور خمس دقائق كل مساء' },
      tags: [SMOKE_TAG],
    });
    planId = plan._id;
    step('create UI plan', true, String(planId));

    // 2 — activate with an actor → signature + evidence + family version
    await carePlansService.activatePlan(String(planId), {
      actor: { id: actorId, role: 'clinical_lead' },
    });
    const activated = await UnifiedCarePlan.findById(planId);
    step('activate flips status', activated.status === 'active', activated.status);
    step(
      'signature chain recorded + verifies',
      activated.signatureChain.length === 1 && activated.verifySignatureChain().ok,
      `${activated.signatureChain.length} entry`
    );
    step(
      'evidence sealed + verifies',
      /^[a-f0-9]{64}$/.test(activated.evidenceHash || '') && activated.verifyEvidence().ok
    );
    step(
      'family version generated (safety floor passed)',
      !!(activated.familyVersion && activated.familyVersion.body),
      activated.familyVersion && activated.familyVersion.readabilityGrade != null
        ? `grade ${activated.familyVersion.readabilityGrade}`
        : 'NOT generated'
    );

    // 3 — W50 scanner sees the overdue UI plan (capture-only notifier)
    const scanSink = [];
    const scanner = createOverdueReviewScanner({
      planVersionModel: { find: () => [] }, // legacy side not under test here
      unifiedPlanModel: UnifiedCarePlan,
      notifier: { send: async m => scanSink.push(m) },
    });
    const scan = await scanner.runOnce({});
    const mine = scanSink.find(m => m.payload.planVersionId === String(planId));
    step(
      'W50 scanner flags the live plan',
      !!mine && mine.payload.source === 'unified',
      mine ? `severity=${mine.payload.severity}` : `overdue=${scan.overdue}`
    );

    // 4 — W45 retry worker serves a failed family attempt on the live plan
    activated.familyNotifications.push({
      attemptId: `${SMOKE_TAG}-AT1`,
      channel: 'sms',
      attemptedAt: new Date(Date.now() - 6 * 3600000),
      status: 'failed',
      retries: 0,
    });
    await activated.save();
    const retryCalls = [];
    const worker = createFamilyRetryWorker({
      planVersionModel: { find: () => [] },
      unifiedPlanModel: UnifiedCarePlan,
      sideEffectHandlers: {
        [HANDLER_NAMES.NOTIFY_FAMILY]: async args => (retryCalls.push(args), { ok: true }),
      },
    });
    await worker.runOnce({});
    const afterRetry = await UnifiedCarePlan.findById(planId).lean();
    const myAttempt = afterRetry.familyNotifications.find(n => n.attemptId === `${SMOKE_TAG}-AT1`);
    step(
      'W45 retry serves + PERSISTS on the live DB',
      retryCalls.length === 1 && myAttempt.status === 'sent' && myAttempt.retries === 1,
      `status=${myAttempt.status} retries=${myAttempt.retries}`
    );

    // 5 — audit trail aggregates it all with verified integrity
    const trail = buildUnifiedAuditTrail(await UnifiedCarePlan.findById(planId));
    step(
      'audit trail: chronological + integrity ok',
      trail.ok && trail.integrity.signatureChainOk && trail.counts.signatures === 1,
      `${trail.events.length} events`
    );
  } finally {
    // Cleanup — ALWAYS remove smoke docs
    if (planId) {
      const res = await mongoose.model('UnifiedCarePlan').deleteMany({ tags: SMOKE_TAG });
      step('cleanup (smoke docs deleted)', true, `${res.deletedCount} doc(s)`);
    }
    await mongoose.disconnect();
  }
}

main()
  .then(() => {
    const failed = steps.filter(s => !s.ok);
    if (JSON_OUT) console.log(JSON.stringify({ ok: failed.length === 0, steps }, null, 2));
    else
      console.log(
        failed.length === 0
          ? `\n✅ care-plan chain LIVE smoke: ${steps.length}/${steps.length} steps passed`
          : `\n❌ ${failed.length} step(s) failed`
      );
    process.exit(failed.length === 0 ? 0 : 1);
  })
  .catch(err => {
    console.error(`✗ smoke aborted: ${err.message}`);
    process.exit(1);
  });
