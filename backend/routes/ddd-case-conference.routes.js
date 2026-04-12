'use strict';
/**
 * CaseConference Routes
 * Auto-extracted from services/dddCaseConference.js
 * 9 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getCaseConferenceDashboard, scheduleConference, getConferencesByBeneficiary, addDecision, addActionItem, completeConference, seedTemplates } = require('../services/dddCaseConference');
const { DDDCaseConference, DDDConferenceTemplate } = require('../models/DddCaseConference');
const { validate } = require('../middleware/validate');
const v = require('../validations/case-conference.validation');

  router.get('/case-conferences', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await getCaseConferenceDashboard() });
    } catch (e) {
      safeError(res, e, 'case-conference');
    }
  });

  router.get('/case-conferences/list', authenticate, async (req, res) => {
    try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    const conferences = await DDDCaseConference.find(query)
    .sort({ scheduledAt: -1 })
    .limit(parseInt(req.query.limit) || 50)
    .lean();
    res.json({ success: true, data: conferences });
    } catch (e) {
      safeError(res, e, 'case-conference');
    }
  });

  router.post('/case-conferences', authenticate, validate(v.createCaseConference), async (req, res) => {
    try {
    res.json({ success: true, data: await scheduleConference(req.body) });
    } catch (e) {
      safeError(res, e, 'case-conference');
    }
  });

  router.get('/case-conferences/beneficiary/:beneficiaryId', authenticate, async (req, res) => {
    try {
    res.json({
    success: true,
    data: await getConferencesByBeneficiary(req.params.beneficiaryId, req.query),
    });
    } catch (e) {
      safeError(res, e, 'case-conference');
    }
  });

  router.post('/case-conferences/:conferenceId/decisions', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await addDecision(req.params.conferenceId, req.body) });
    } catch (e) {
      safeError(res, e, 'case-conference');
    }
  });

  router.post('/case-conferences/:conferenceId/actions', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await addActionItem(req.params.conferenceId, req.body) });
    } catch (e) {
      safeError(res, e, 'case-conference');
    }
  });

  router.post('/case-conferences/:conferenceId/complete', authenticate, async (req, res) => {
    try {
    res.json({
    success: true,
    data: await completeConference(
    req.params.conferenceId,
    req.body.summary,
    req.body.summaryAr
    ),
    });
    } catch (e) {
      safeError(res, e, 'case-conference');
    }
  });

  router.get('/case-conferences/templates', authenticate, async (_req, res) => {
    try {
    const templates = await DDDConferenceTemplate.find({ isActive: true }).lean();
    res.json({
    success: true,
    data: templates,
    builtin: BUILTIN_TEMPLATES,
    types: CONFERENCE_TYPES,
    });
    } catch (e) {
      safeError(res, e, 'case-conference');
    }
  });

  router.post('/case-conferences/seed', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await seedTemplates() });
    } catch (e) {
      safeError(res, e, 'case-conference');
    }
  });

module.exports = router;
