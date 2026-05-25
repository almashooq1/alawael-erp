'use strict';

/**
 * clinicalSweepersBootstrap.js — Wave 364.
 *
 * Unified bootstrap for cron sweepers across the W356-W363 clinical
 * series. Each sweeper is independently env-gated so ops can roll them
 * one at a time. All share `node-cron` (loaded once + reused) +
 * Asia/Riyadh timezone.
 *
 * Sweepers (default: all disabled — opt-in per flag):
 *   • ENABLE_SAFEGUARDING_SLA_SWEEPER       — daily 08:00, critical-severity 1h SLA breach detector
 *   • ENABLE_DEVICE_LOAN_SWEEPER            — daily 09:00, overdue assistive-device loans
 *   • ENABLE_DEVICE_MAINTENANCE_SWEEPER     — daily 09:30, devices past nextMaintenanceDue
 *   • ENABLE_RESPITE_NOSHOW_SWEEPER         — daily 02:00, auto-mark no_show for past startAt approved/confirmed
 *   • ENABLE_TRANSITION_OVERDUE_SWEEPER     — daily 10:00, in_progress transition plans past plannedTransitionDate
 *   • ENABLE_CBAHI_REASSESSMENT_SWEEPER     — weekly Mon 06:00, attestations past nextReassessmentDue
 *   • ENABLE_AAC_REASSESSMENT_SWEEPER       — weekly Mon 06:30, active AAC profiles past nextReassessmentDue
 *
 * Six of seven sweepers ONLY query + log (no state mutation). The
 * exception is RESPITE_NOSHOW which auto-flips status approved/confirmed
 * → no_show when the booking startAt is more than 24h in the past with
 * no check-in — operationally safer than leaving the slot blocked.
 *
 * Pattern matches W286 (multi-sweeper bootstrap) + W338 (env-gated cron
 * per-feature) + W286 / W282b / W284c / W283 / W288 cadence.
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireClinicalSweepers(app, deps = {}) {
  const { logger } = deps;
  if (!logger) {
    throw new Error('clinicalSweepersBootstrap.wireClinicalSweepers: logger required');
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn('[startup] node-cron not available; clinical sweepers not scheduled');
    return;
  }

  const mongoose = require('mongoose');
  const TZ = { timezone: 'Asia/Riyadh' };

  function safeModel(name) {
    try {
      return mongoose.model(name);
    } catch {
      return null;
    }
  }

  let scheduledCount = 0;

  // ── 1) Safeguarding critical-severity 1h SLA breach ─────────────────
  if (process.env.ENABLE_SAFEGUARDING_SLA_SWEEPER === 'true') {
    cron.schedule(
      '0 8 * * *',
      async () => {
        try {
          const Concern = safeModel('SafeguardingConcern');
          if (!Concern) return;
          const slaCutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
          const breaches = await Concern.find({
            severity: 'critical',
            $or: [
              { supervisorNotifiedAt: null },
              { reportedAt: { $lt: slaCutoff }, supervisorNotifiedAt: null },
            ],
            status: { $nin: ['closed', 'unsubstantiated'] },
          })
            .select('_id branchId reportedAt supervisorNotifiedAt category')
            .limit(500)
            .lean();
          logger.info(`[safeguarding] SLA sweep: ${breaches.length} critical concerns with breach`);
          for (const b of breaches.slice(0, 20)) {
            logger.warn(
              `[safeguarding] SLA breach concern=${b._id} branch=${b.branchId} category=${b.category} reportedAt=${b.reportedAt}`
            );
          }
        } catch (err) {
          logger.error('[safeguarding] SLA sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info('[startup] W357 safeguarding SLA sweeper scheduled (daily 08:00 Asia/Riyadh)');
  }

  // ── 2) AssistiveDevice overdue-loan reminder ───────────────────────
  if (process.env.ENABLE_DEVICE_LOAN_SWEEPER === 'true') {
    cron.schedule(
      '0 9 * * *',
      async () => {
        try {
          const Device = safeModel('AssistiveDevice');
          if (!Device) return;
          const now = new Date();
          const overdue = await Device.find({
            availability: 'loaned',
            currentLoanExpectedReturnAt: { $ne: null, $lt: now },
          })
            .select('_id assetTag branchId currentLoaneeId currentLoanExpectedReturnAt')
            .limit(500)
            .lean();
          logger.info(`[assistive-device] overdue-loan sweep: ${overdue.length} devices overdue`);
          for (const d of overdue.slice(0, 20)) {
            logger.warn(
              `[assistive-device] overdue device=${d._id} tag=${d.assetTag} loanee=${d.currentLoaneeId} expected=${d.currentLoanExpectedReturnAt}`
            );
          }
        } catch (err) {
          logger.error('[assistive-device] overdue-loan sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info(
      '[startup] W359 assistive-device overdue-loan sweeper scheduled (daily 09:00 Asia/Riyadh)'
    );
  }

  // ── 3) AssistiveDevice due-maintenance flagger ─────────────────────
  if (process.env.ENABLE_DEVICE_MAINTENANCE_SWEEPER === 'true') {
    cron.schedule(
      '30 9 * * *',
      async () => {
        try {
          const Device = safeModel('AssistiveDevice');
          if (!Device) return;
          const now = new Date();
          const due = await Device.find({
            availability: { $ne: 'retired' },
            nextMaintenanceDue: { $ne: null, $lt: now },
          })
            .select('_id assetTag branchId nextMaintenanceDue maintenanceIntervalDays')
            .limit(500)
            .lean();
          logger.info(
            `[assistive-device] due-maintenance sweep: ${due.length} devices past nextMaintenanceDue`
          );
          for (const d of due.slice(0, 20)) {
            logger.warn(
              `[assistive-device] maintenance due device=${d._id} tag=${d.assetTag} due=${d.nextMaintenanceDue}`
            );
          }
        } catch (err) {
          logger.error('[assistive-device] due-maintenance sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info(
      '[startup] W359 assistive-device maintenance sweeper scheduled (daily 09:30 Asia/Riyadh)'
    );
  }

  // ── 4) Respite no-show auto-mark (MUTATING) ────────────────────────
  if (process.env.ENABLE_RESPITE_NOSHOW_SWEEPER === 'true') {
    cron.schedule(
      '0 2 * * *',
      async () => {
        try {
          const Booking = safeModel('RespiteBooking');
          if (!Booking) return;
          const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const candidates = await Booking.find({
            status: { $in: ['approved', 'confirmed'] },
            startAt: { $lt: cutoff },
            checkedInAt: null,
          }).limit(500);
          let flipped = 0;
          let errors = 0;
          for (const c of candidates) {
            try {
              c.status = 'no_show';
              c.notes =
                (c.notes || '') + `\n[auto no-show by W364 sweeper ${new Date().toISOString()}]`;
              await c.save();
              flipped++;
            } catch (err) {
              errors++;
              logger.warn(`[respite] auto no-show save failed booking=${c._id}`, err);
            }
          }
          logger.info(
            `[respite] no-show auto-mark sweep: scanned=${candidates.length} flipped=${flipped} errors=${errors}`
          );
        } catch (err) {
          logger.error('[respite] no-show sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info('[startup] W363 respite no-show sweeper scheduled (daily 02:00 Asia/Riyadh)');
  }

  // ── 5) TransitionPlan overdue flagger ──────────────────────────────
  if (process.env.ENABLE_TRANSITION_OVERDUE_SWEEPER === 'true') {
    cron.schedule(
      '0 10 * * *',
      async () => {
        try {
          const Plan = safeModel('TransitionPlan');
          if (!Plan) return;
          const now = new Date();
          const overdue = await Plan.find({
            status: 'in_progress',
            plannedTransitionDate: { $ne: null, $lt: now },
          })
            .select('_id beneficiaryId branchId transitionType plannedTransitionDate')
            .limit(500)
            .lean();
          logger.info(`[transition-plan] overdue sweep: ${overdue.length} plans past planned date`);
          for (const p of overdue.slice(0, 20)) {
            logger.warn(
              `[transition-plan] overdue plan=${p._id} type=${p.transitionType} beneficiary=${p.beneficiaryId} planned=${p.plannedTransitionDate}`
            );
          }
        } catch (err) {
          logger.error('[transition-plan] overdue sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info(
      '[startup] W361 transition-plan overdue sweeper scheduled (daily 10:00 Asia/Riyadh)'
    );
  }

  // ── 6) CBAHI due-reassessment (weekly) ─────────────────────────────
  if (process.env.ENABLE_CBAHI_REASSESSMENT_SWEEPER === 'true') {
    cron.schedule(
      '0 6 * * 1',
      async () => {
        try {
          const Attestation = safeModel('CbahiAttestation');
          if (!Attestation) return;
          const now = new Date();
          const due = await Attestation.find({
            nextReassessmentDue: { $ne: null, $lt: now },
          })
            .select('_id branchId standardKey status nextReassessmentDue')
            .limit(500)
            .lean();
          logger.info(`[cbahi] weekly reassessment sweep: ${due.length} attestations due`);
          for (const a of due.slice(0, 20)) {
            logger.warn(
              `[cbahi] reassessment due attestation=${a._id} standard=${a.standardKey} branch=${a.branchId} due=${a.nextReassessmentDue}`
            );
          }
        } catch (err) {
          logger.error('[cbahi] reassessment sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info(
      '[startup] W360 CBAHI reassessment sweeper scheduled (weekly Mon 06:00 Asia/Riyadh)'
    );
  }

  // ── 7) AAC due-reassessment (weekly) ──────────────────────────────
  if (process.env.ENABLE_AAC_REASSESSMENT_SWEEPER === 'true') {
    cron.schedule(
      '30 6 * * 1',
      async () => {
        try {
          const Profile = safeModel('CommunicationAidProfile');
          if (!Profile) return;
          const now = new Date();
          const due = await Profile.find({
            lifecycleStatus: 'active',
            nextReassessmentDue: { $ne: null, $lt: now },
          })
            .select('_id beneficiaryId branchId nextReassessmentDue assessedByDiscipline')
            .limit(500)
            .lean();
          logger.info(`[aac] weekly reassessment sweep: ${due.length} profiles due`);
          for (const p of due.slice(0, 20)) {
            logger.warn(
              `[aac] reassessment due profile=${p._id} beneficiary=${p.beneficiaryId} discipline=${p.assessedByDiscipline} due=${p.nextReassessmentDue}`
            );
          }
        } catch (err) {
          logger.error('[aac] reassessment sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info('[startup] W358 AAC reassessment sweeper scheduled (weekly Mon 06:30 Asia/Riyadh)');
  }

  // ══════════════════════════════════════════════════════════════════
  // W370 additions (2026-05-25) — 4 sweepers for W368 + W369 modules.
  // Brings the total from 7 → 11 env-gated stanzas in this bootstrap.
  // ══════════════════════════════════════════════════════════════════

  // ── 8) Diet prescription due-review (weekly) ──────────────────────
  if (process.env.ENABLE_DIET_REVIEW_SWEEPER === 'true') {
    cron.schedule(
      '0 7 * * 1',
      async () => {
        try {
          const Rx = safeModel('BeneficiaryDietPrescription');
          if (!Rx) return;
          const now = new Date();
          const due = await Rx.find({
            status: 'active',
            nextReviewDue: { $ne: null, $lt: now },
          })
            .select(
              '_id beneficiaryId branchId nextReviewDue prescriberDiscipline npo enteralFeeding.active'
            )
            .limit(500)
            .lean();
          logger.info(`[diet-rx] weekly review sweep: ${due.length} prescriptions due`);
          for (const r of due.slice(0, 20)) {
            const flags = [];
            if (r.npo) flags.push('NPO');
            if (r.enteralFeeding && r.enteralFeeding.active) flags.push('enteral');
            logger.warn(
              `[diet-rx] review due rx=${r._id} beneficiary=${r.beneficiaryId} discipline=${r.prescriberDiscipline} ${flags.length ? '[' + flags.join('+') + '] ' : ''}due=${r.nextReviewDue}`
            );
          }
        } catch (err) {
          logger.error('[diet-rx] review sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info(
      '[startup] W368 diet prescription review sweeper scheduled (weekly Mon 07:00 Asia/Riyadh)'
    );
  }

  // ── 9) FacilityAsset due-inspection ───────────────────────────────
  if (process.env.ENABLE_FACILITY_INSPECTION_SWEEPER === 'true') {
    cron.schedule(
      '0 5 * * *',
      async () => {
        try {
          const Asset = safeModel('FacilityAsset');
          if (!Asset) return;
          const now = new Date();
          const due = await Asset.find({
            status: { $ne: 'retired' },
            nextInspectionDue: { $ne: null, $lt: now },
          })
            .select('_id assetTag branchId category criticality nextInspectionDue')
            .limit(500)
            .lean();
          // Surface life_safety items first
          due.sort((a, b) =>
            a.criticality === 'life_safety' && b.criticality !== 'life_safety'
              ? -1
              : b.criticality === 'life_safety' && a.criticality !== 'life_safety'
                ? 1
                : 0
          );
          const lifeSafetyCount = due.filter(a => a.criticality === 'life_safety').length;
          logger.info(
            `[facility] daily inspection sweep: ${due.length} assets due (life_safety=${lifeSafetyCount})`
          );
          for (const a of due.slice(0, 20)) {
            logger.warn(
              `[facility] inspection due asset=${a._id} tag=${a.assetTag} category=${a.category} criticality=${a.criticality} due=${a.nextInspectionDue}`
            );
          }
        } catch (err) {
          logger.error('[facility] inspection sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info('[startup] W369 facility inspection sweeper scheduled (daily 05:00 Asia/Riyadh)');
  }

  // ── 10) FacilityAsset due-maintenance ─────────────────────────────
  if (process.env.ENABLE_FACILITY_MAINTENANCE_SWEEPER === 'true') {
    cron.schedule(
      '30 5 * * *',
      async () => {
        try {
          const Asset = safeModel('FacilityAsset');
          if (!Asset) return;
          const now = new Date();
          const due = await Asset.find({
            status: { $ne: 'retired' },
            nextMaintenanceDue: { $ne: null, $lt: now },
          })
            .select('_id assetTag branchId category criticality nextMaintenanceDue')
            .limit(500)
            .lean();
          logger.info(`[facility] daily maintenance sweep: ${due.length} assets due`);
          for (const a of due.slice(0, 20)) {
            logger.warn(
              `[facility] maintenance due asset=${a._id} tag=${a.assetTag} category=${a.category} due=${a.nextMaintenanceDue}`
            );
          }
        } catch (err) {
          logger.error('[facility] maintenance sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info('[startup] W369 facility maintenance sweeper scheduled (daily 05:30 Asia/Riyadh)');
  }

  // ── 11) FacilityAsset expired-certificate ─────────────────────────
  if (process.env.ENABLE_FACILITY_CERT_SWEEPER === 'true') {
    cron.schedule(
      '0 6 * * *',
      async () => {
        try {
          const Asset = safeModel('FacilityAsset');
          if (!Asset) return;
          const now = new Date();
          const withExpired = await Asset.find({
            status: { $ne: 'retired' },
            'certificates.expiresAt': { $lt: now },
          })
            .select('_id assetTag branchId criticality certificates')
            .limit(500)
            .lean();
          let totalExpired = 0;
          let lifeSafetyExpired = 0;
          for (const a of withExpired) {
            const expired = (a.certificates || []).filter(
              c => c.expiresAt && new Date(c.expiresAt).getTime() < now.getTime()
            );
            totalExpired += expired.length;
            if (a.criticality === 'life_safety' && expired.length > 0) lifeSafetyExpired++;
          }
          logger.info(
            `[facility] daily certificate sweep: ${withExpired.length} assets with ${totalExpired} expired certs (life_safety=${lifeSafetyExpired})`
          );
          for (const a of withExpired.slice(0, 20)) {
            const expired = (a.certificates || []).filter(
              c => c.expiresAt && new Date(c.expiresAt).getTime() < now.getTime()
            );
            for (const c of expired) {
              logger.warn(
                `[facility] cert expired asset=${a._id} tag=${a.assetTag} criticality=${a.criticality} cert=${c.number || c.name || '?'} authority=${c.issuingAuthority} expired=${c.expiresAt}`
              );
            }
          }
        } catch (err) {
          logger.error('[facility] certificate sweeper failed', err);
        }
      },
      TZ
    );
    scheduledCount++;
    logger.info('[startup] W369 facility certificate sweeper scheduled (daily 06:00 Asia/Riyadh)');
  }

  if (scheduledCount === 0) {
    logger.info('[startup] clinical sweepers: all 11 disabled (no ENABLE_*_SWEEPER=true)');
  } else {
    logger.info(`[startup] clinical sweepers wired: ${scheduledCount}/11 enabled`);
  }
}

module.exports = { wireClinicalSweepers };
