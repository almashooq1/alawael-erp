'use strict';

/**
 * care/crm.routes.js — Phase 17 Commit 1 (4.0.83).
 *
 * HTTP surface for the CRM lead funnel + inquiry lifecycle.
 *
 * Mounted by `_registry.js` at:
 *   /api/care/crm       and   /api/v1/care/crm
 *
 * Endpoints:
 *   GET  /reference                            — registry snapshot
 *   GET  /funnel-stats                         — conversion KPIs
 *
 *   Inquiries:
 *     GET  /inquiries                          — list (filters)
 *     GET  /inquiries/:id                      — detail
 *     POST /inquiries                          — create (activates SLA)
 *     POST /inquiries/:id/acknowledge
 *     POST /inquiries/:id/route
 *     POST /inquiries/:id/close
 *     POST /inquiries/:id/mark-spam
 *     POST /inquiries/:id/promote              — create a Lead from this inquiry
 *
 *   Leads:
 *     GET  /leads                              — list (filters)
 *     GET  /leads/:id                          — detail
 *     POST /leads                              — direct create
 *     POST /leads/:id/activity                 — append activity log
 *     POST /leads/:id/transition               — state-machine transition
 *     POST /leads/:id/convert                  — terminal → converted
 *     POST /leads/:id/mark-lost
 *     POST /leads/:id/cancel
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/care/crm.registry');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function mapError(err, res) {
  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, error: err.message });
  }
  if (err.code === 'ILLEGAL_TRANSITION') {
    return res.status(409).json({
      success: false,
      error: err.message,
      from: err.from,
      to: err.to,
    });
  }
  if (err.code === 'MISSING_FIELD') {
    return res.status(422).json({ success: false, error: err.message, fields: err.fields });
  }
  if (err.code === 'CONFLICT') {
    return res.status(409).json({ success: false, error: err.message });
  }
  return safeError(res, err);
}

function getService() {
  return require('../../startup/careBootstrap')._getLeadFunnelService?.() || _fallback();
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const { createLeadFunnelService } = require('../../services/care/leadFunnel.service');
  _fb = createLeadFunnelService({
    inquiryModel: require('../../models/care/Inquiry.model'),
    leadModel: require('../../models/care/Lead.model'),
  });
  return _fb;
}

// ── reference + stats ──────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        inquiryStatuses: registry.INQUIRY_STATUSES,
        inquiryTerminalStatuses: registry.INQUIRY_TERMINAL_STATUSES,
        inquiryTransitions: registry.INQUIRY_TRANSITIONS,
        inquiryChannels: registry.INQUIRY_CHANNELS,
        leadStatuses: registry.LEAD_STATUSES,
        leadTerminalStatuses: registry.LEAD_TERMINAL_STATUSES,
        leadPauseStatuses: registry.LEAD_PAUSE_STATUSES,
        leadTransitions: registry.LEAD_TRANSITIONS,
        referralSources: registry.REFERRAL_SOURCES,
        lostReasons: registry.LOST_REASONS,
      },
    });
  })
);

router.get(
  '/funnel-stats',
  authenticate,
  [
    query('branchId').optional().isMongoId(),
    query('windowDays').optional().isInt({ min: 1, max: 365 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const stats = await getService().getFunnelStats({
        branchId: req.query.branchId,
        windowDays: req.query.windowDays ? Number(req.query.windowDays) : 30,
      });
      res.json({ success: true, data: stats });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── Inquiries ──────────────────────────────────────────────────────

router.get(
  '/inquiries',
  authenticate,
  [
    query('status').optional().isIn(registry.INQUIRY_STATUSES),
    query('channel').optional().isIn(registry.INQUIRY_CHANNELS),
    query('branchId').optional().isMongoId(),
    query('ownerUserId').optional().isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listInquiries({
        status: req.query.status,
        channel: req.query.channel,
        branchId: req.query.branchId,
        ownerUserId: req.query.ownerUserId,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        skip: req.query.skip ? Number(req.query.skip) : 0,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/inquiries/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findInquiryById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Inquiry not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inquiries',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager', 'receptionist']),
  [
    body('channel').isIn(registry.INQUIRY_CHANNELS),
    body('contactName').isString().notEmpty(),
    body('subject').isString().notEmpty(),
    body('referralSource').optional().isIn(registry.REFERRAL_SOURCES),
    body('branchId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().createInquiry(req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inquiries/:id/acknowledge',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager', 'receptionist']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().acknowledgeInquiry(req.params.id, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inquiries/:id/route',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager']),
  [param('id').isMongoId(), body('ownerUserId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().routeInquiry(req.params.id, {
        ownerUserId: req.body.ownerUserId,
        ownerNameSnapshot: req.body.ownerNameSnapshot,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inquiries/:id/close',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager']),
  [param('id').isMongoId(), body('closureReason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().closeInquiry(req.params.id, {
        closureReason: req.body.closureReason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inquiries/:id/mark-spam',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().markInquirySpam(req.params.id, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/inquiries/:id/promote',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const result = await getService().promoteInquiry(req.params.id, req.body || {}, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── Leads ──────────────────────────────────────────────────────────

router.get(
  '/leads',
  authenticate,
  [
    query('status').optional().isIn(registry.LEAD_STATUSES),
    query('branchId').optional().isMongoId(),
    query('ownerUserId').optional().isMongoId(),
    query('referralSource').optional().isIn(registry.REFERRAL_SOURCES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listLeads({
        status: req.query.status,
        branchId: req.query.branchId,
        ownerUserId: req.query.ownerUserId,
        referralSource: req.query.referralSource,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        skip: req.query.skip ? Number(req.query.skip) : 0,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/leads/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findLeadById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Lead not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/leads',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager']),
  [
    body('guardianName').isString().notEmpty(),
    body('guardianPhone').isString().notEmpty(),
    body('beneficiaryName').isString().notEmpty(),
    body('referralSource').optional().isIn(registry.REFERRAL_SOURCES),
    body('preferredBranchId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().createLead(req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/leads/:id/activity',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager']),
  [
    param('id').isMongoId(),
    body('kind').isIn(['call', 'email', 'sms', 'whatsapp', 'meeting', 'note', 'system']),
    body('summary').isString().notEmpty(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().logActivity(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/leads/:id/transition',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager']),
  [
    param('id').isMongoId(),
    body('toStatus').isIn(registry.LEAD_STATUSES),
    body('notes').optional().isString(),
    body('patch').optional().isObject(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().transitionLead(req.params.id, req.body.toStatus, {
        actorId: req.user?._id,
        notes: req.body.notes,
        patch: req.body.patch || {},
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/leads/:id/convert',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager']),
  [param('id').isMongoId(), body('beneficiaryId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().convertLead(req.params.id, {
        beneficiaryId: req.body.beneficiaryId,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/leads/:id/mark-lost',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager']),
  [param('id').isMongoId(), body('lostReason').isIn(registry.LOST_REASONS)],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().markLost(req.params.id, {
        lostReason: req.body.lostReason,
        lostDetail: req.body.lostDetail,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/leads/:id/cancel',
  authenticate,
  authorize(['admin', 'crm_coordinator', 'crm_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().cancelLead(req.params.id, {
        notes: req.body?.notes,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;
