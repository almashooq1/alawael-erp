/**
 * WhatsApp Appointment Reminder routes (W1525)
 *
 * Mounted at /api/(v1/)whatsapp-reminders. Distinct from whatsapp.routes.js to
 * avoid touching that hot file. Admin/manager surface to enqueue reminders for
 * an appointment, trigger a manual dispatch, and read delivery stats. The
 * background sweeper (whatsappReminderBootstrap, env-gated default OFF) is the
 * normal driver; these endpoints are for ops / integration / dashboards.
 *
 * @module routes/whatsapp-reminders.routes
 */

'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { enforceBeneficiaryBranch } = require('../middleware/assertBranchMatch');

const router = express.Router();
router.use(authenticate);
router.use(requireBranchAccess); // W833: populate req.branchScope before branch-scope helpers

const WRITE_ROLES = ['admin', 'super_admin', 'manager', 'branch_manager'];

function svc() {
  return require('../services/whatsapp/whatsappAppointmentReminder.service');
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Map a service httpError (statusCode) or a branch-guard error (status) to a
// clean JSON response.
function handleServiceError(res, err) {
  const code = err && (err.statusCode || err.status);
  if (code && code >= 400 && code < 500) {
    return res.status(code).json({ success: false, message: err.message });
  }
  throw err;
}

/** POST /enqueue — queue WhatsApp reminders for one appointment (idempotent). */
router.post(
  '/enqueue',
  authorize(WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const { appointmentId, beneficiaryId, recipientPhone, when, types } = req.body || {};
    try {
      // Branch isolation (W441): a restricted caller may only enqueue reminders
      // for a beneficiary in their own branch. No-op for cross-branch roles.
      if (beneficiaryId) await enforceBeneficiaryBranch(req, beneficiaryId);
      const result = await svc().enqueueReminders({
        appointmentId,
        beneficiaryId,
        recipientPhone,
        when,
        ...(Array.isArray(types) ? { types } : {}),
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      handleServiceError(res, err);
    }
  })
);

/** POST /dispatch — manually run the due-reminder sweep (ops trigger). */
router.post(
  '/dispatch',
  authorize(WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const result = await svc().dispatchDueReminders({ deps: { logger: req.log } });
    res.json({ success: true, data: result });
  })
);

/** GET /stats — WhatsApp reminder counts by status. */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const data = await svc().getReminderStats({});
    res.json({ success: true, data });
  })
);

module.exports = router;
