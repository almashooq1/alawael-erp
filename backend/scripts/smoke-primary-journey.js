#!/usr/bin/env node
'use strict';

/**
 * smoke-primary-journey.js — Primary business-journey smoke.
 *
 * Exercises the live database end-to-end across the canonical care flow:
 *
 *   1. BENEFICIARY  — register a beneficiary.
 *   2. EPISODE      — open an active episode of care.
 *   3. SESSION      — schedule a clinical session via SessionsService.
 *   4. ATTENDANCE   — record session attendance (present).
 *   5. INVOICE      — issue an invoice for the beneficiary.
 *   6. REPORT       — query the beneficiary's invoice + attendance summary.
 *
 * Safe-by-design: every created document carries a unique smoke tag and is
 * deleted in `finally`. Read-only against everything else.
 *
 * Usage:  node scripts/smoke-primary-journey.js
 * Exit:   0 all steps passed · 1 otherwise
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_e) {
  /* optional */
}

const mongoose = require('mongoose');

const SMOKE_TAG = `smoke-primary-journey-${Date.now()}`;
const steps = [];

function step(name, ok, detail) {
  steps.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await mongoose.connect(uri);

  const Beneficiary = require('../models/Beneficiary');
  const { EpisodeOfCare } = require('../domains/episodes/models/EpisodeOfCare');
  require('../domains/sessions/models/ClinicalSession');
  const SessionAttendance = require('../models/SessionAttendance');
  const Invoice = require('../models/Invoice');
  const TherapySession = (() => {
    try {
      return require('../models/TherapySession');
    } catch (_e) {
      return mongoose.model('TherapySession');
    }
  })();

  const { sessionsService } = (() => {
    try {
      return require('../domains/sessions/services/SessionsService');
    } catch (_e) {
      return {};
    }
  })();

  const created = [];
  try {
    // ── 1. BENEFICIARY ───────────────────────────────────────────────
    const ben = await Beneficiary.create({
      firstName: 'دخان',
      lastName: 'رحلة',
      fullName: 'دخان رحلة — يُحذف تلقائياً',
      gender: 'male',
      dateOfBirth: new Date('2019-01-01'),
      nationalId: `SMK${Date.now()}`,
      category: 'mental',
      disability: { type: 'mental' },
      tags: [SMOKE_TAG],
    });
    created.push({ model: Beneficiary, id: ben._id });
    step('register beneficiary', !!ben._id, String(ben._id));

    // ── 2. EPISODE ───────────────────────────────────────────────────
    const ep = await EpisodeOfCare.create({
      beneficiaryId: ben._id,
      status: 'active',
      currentPhase: 'initial_assessment',
      startDate: new Date(),
      tags: [SMOKE_TAG],
    });
    created.push({ model: EpisodeOfCare, id: ep._id });
    step('open active episode of care', !!ep._id, String(ep._id));

    // ── 3. SESSION ───────────────────────────────────────────────────
    if (!sessionsService || typeof sessionsService.scheduleSession !== 'function') {
      step('SessionsService.scheduleSession available', false);
      return;
    }
    const session = await sessionsService.scheduleSession({
      beneficiaryId: ben._id,
      episodeId: ep._id,
      therapistId: new mongoose.Types.ObjectId(),
      scheduledDate: new Date(),
      sessionType: 'speech_therapy',
      specialty: 'speech_therapy',
      durationMinutes: 30,
      tags: [SMOKE_TAG],
    });
    created.push({ model: mongoose.model('ClinicalSession'), id: session._id });
    step('schedule clinical session', !!session._id, String(session._id));

    // ── 4. ATTENDANCE ────────────────────────────────────────────────
    const attendance = await SessionAttendance.create({
      sessionId: session._id,
      beneficiaryId: ben._id,
      therapistId: new mongoose.Types.ObjectId(),
      scheduledDate: session.scheduledDate || new Date(),
      status: 'present',
      checkInTime: new Date(),
      billable: true,
      notes: SMOKE_TAG,
    });
    created.push({ model: SessionAttendance, id: attendance._id });
    step('record session attendance (present)', !!attendance._id, String(attendance._id));

    // ── 5. INVOICE ───────────────────────────────────────────────────
    const invoice = await Invoice.create({
      invoiceNumber: `INV-SMOKE-${Date.now()}`,
      beneficiary: ben._id,
      issuer: new mongoose.Types.ObjectId(),
      issueDate: new Date(),
      status: 'ISSUED',
      paymentMethod: 'CASH',
      items: [
        {
          description: 'جلسة علاجية — دخان رحلة',
          quantity: 1,
          unitPrice: 250,
          total: 250,
        },
      ],
      subTotal: 250,
      totalAmount: 250,
      notes: SMOKE_TAG,
    });
    created.push({ model: Invoice, id: invoice._id });
    step('issue invoice for beneficiary', !!invoice._id, invoice.invoiceNumber);

    // ── 6. REPORT ────────────────────────────────────────────────────
    const [attendanceCount, invoiceCount, invoiceTotal] = await Promise.all([
      SessionAttendance.countDocuments({ beneficiaryId: ben._id }),
      Invoice.countDocuments({ beneficiary: ben._id }),
      Invoice.aggregate([
        { $match: { beneficiary: ben._id, status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).then(r => r[0]?.total || 0),
    ]);
    const reportOk = attendanceCount === 1 && invoiceCount === 1 && invoiceTotal === 250;
    step(
      'generate beneficiary invoice + attendance report',
      reportOk,
      `attendance=${attendanceCount} invoices=${invoiceCount} total=${invoiceTotal}`
    );

    // ── 7. W1240 projection sanity ───────────────────────────────────
    const projected = await TherapySession.findOne({
      sourceClinicalSessionId: session._id,
    }).lean();
    if (projected) created.push({ model: TherapySession, id: projected._id });
    step(
      'W1240 projection: TherapySession sees the clinical session',
      !!projected,
      projected ? String(projected._id) : 'NO projection row'
    );
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
    if (failed.length) {
      console.error(`\n❌ ${failed.length} step(s) failed`);
      process.exit(1);
    }
    console.log('\n✅ Primary journey smoke passed');
  })
  .catch(err => {
    console.error('\n❌ Primary journey smoke error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
