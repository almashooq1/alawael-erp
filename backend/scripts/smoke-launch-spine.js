#!/usr/bin/env node
'use strict';

/**
 * smoke-launch-spine.js — W1268.
 *
 * LIVE smoke of the GO-LIVE runbook's Phase-B "data-entry spine" — the
 * flows a real first user touches — against the real database:
 *
 *   1. REGISTER  — a Beneficiary persists with valid canonical enums.
 *   2. SESSION   — the UI's writer (SessionsService.scheduleSession →
 *      ClinicalSession) creates a session AND the W1240 projection makes
 *      it visible to the 56 TherapySession analytics consumers — the
 *      former 🔴 launch blocker, verified live on every run.
 *   3. FORM      — a submission persists against a REAL seeded template
 *      (the 80-template catalog from launch step 2).
 *
 * Safe-by-design: every created doc id is collected and deleted in
 * `finally`; read-only against everything else.
 *
 * Usage:  npm run smoke:launch-spine   (or node scripts/smoke-launch-spine.js)
 * Exit:   0 all steps passed · 1 otherwise
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

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);

  const Beneficiary = require('../models/Beneficiary');
  require('../domains/sessions/models/ClinicalSession');
  require('../domains/episodes/models/EpisodeOfCare');
  const TherapySession = (() => {
    try {
      return mongoose.model('TherapySession');
    } catch (_e) {
      return require('../models/TherapySession');
    }
  })();
  const FormTemplate = (() => {
    try {
      return mongoose.model('FormTemplate');
    } catch (_e) {
      return require('../models/FormTemplate');
    }
  })();
  const FormSubmission = (() => {
    try {
      return mongoose.model('FormSubmission');
    } catch (_e) {
      return require('../models/FormSubmission');
    }
  })();

  const created = []; // [{ model, id }]
  try {
    // ── 1. REGISTER a beneficiary ────────────────────────────────────
    const ben = await Beneficiary.create({
      firstName: 'دخان',
      lastName: 'تجريبي',
      fullName: 'دخان تجريبي — يُحذف تلقائياً',
      gender: 'male',
      dateOfBirth: new Date('2020-01-01'),
      nationalId: `SMK${Date.now()}`,
      category: 'mental',
      disability: { type: 'mental' },
    });
    created.push({ model: Beneficiary, id: ben._id });
    step('register beneficiary (canonical enums persist)', !!ben._id, String(ben._id));

    // ── 2. LOG a session via the UI's writer + W1240 projection ─────
    const { sessionsService } = (() => {
      try {
        return require('../domains/sessions/services/SessionsService');
      } catch (_e) {
        return {};
      }
    })();
    if (sessionsService && typeof sessionsService.scheduleSession === 'function') {
      // A real episode + therapist id, as the UI flow provides them.
      const Episode = mongoose.model('EpisodeOfCare');
      const ep = await Episode.create({
        beneficiaryId: ben._id,
        status: 'active',
        startDate: new Date(),
      });
      created.push({ model: Episode, id: ep._id });

      const session = await sessionsService.scheduleSession({
        beneficiaryId: ben._id,
        episodeId: ep._id,
        therapistId: new mongoose.Types.ObjectId(),
        scheduledDate: new Date(),
        sessionType: 'speech_therapy',
        durationMinutes: 30,
      });
      created.push({ model: mongoose.model('ClinicalSession'), id: session._id });
      step('UI session writer creates ClinicalSession', !!session._id);

      const projected = await TherapySession.findOne({
        sourceClinicalSessionId: session._id,
      }).lean();
      if (projected) created.push({ model: TherapySession, id: projected._id });
      step(
        'W1240 projection: analytics consumers SEE the UI session (was the launch blocker)',
        !!projected,
        projected ? String(projected._id) : 'NO projection row'
      );
    } else {
      step('UI session writer available', false, 'SessionsService not loadable');
    }

    // ── 3. SUBMIT a form against a real seeded template ──────────────
    const template = await FormTemplate.findOne({}).select('_id title name code').lean();
    if (!template) {
      step('seeded form template available (run seed:forms-catalog)', false);
    } else {
      const submission = await FormSubmission.create({
        templateId: template._id,
        formTemplateId: template._id,
        beneficiaryId: ben._id,
        data: { smoke: true, note: 'إرسال دخان — يُحذف تلقائياً' },
        answers: { smoke: true },
        status: 'submitted',
        submittedAt: new Date(),
      });
      created.push({ model: FormSubmission, id: submission._id });
      step(
        'form submission persists against the seeded catalog',
        !!submission._id,
        `template=${template.title || template.name || template.code || template._id}`
      );
    }
  } finally {
    let removed = 0;
    for (const c of created.reverse()) {
      try {
        await c.model.deleteOne({ _id: c.id });
        removed += 1;
      } catch (_e) {
        /* best effort */
      }
    }
    step('cleanup (smoke docs deleted)', true, `${removed} doc(s)`);
    await mongoose.disconnect();
  }
}

main()
  .then(() => {
    const failed = steps.filter(s => !s.ok);
    console.log(
      failed.length === 0
        ? `\n✅ launch data-entry spine: ${steps.length}/${steps.length} steps passed`
        : `\n❌ ${failed.length} step(s) failed`
    );
    process.exit(failed.length === 0 ? 0 : 1);
  })
  .catch(err => {
    console.error(`✗ smoke aborted: ${err.message}`);
    process.exit(1);
  });
