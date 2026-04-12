'use strict';
/**
 * SmartScheduler Routes
 * Auto-extracted from services/dddSmartScheduler.js
 * 7 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { generateRecommendations, analyzeWorkload, detectConflicts, model, getUtilizationDashboard } = require('../services/dddSmartScheduler');
const { DDDSchedulingRecommendation } = require('../models/DddSmartScheduler');

  router.post('/smart-scheduler/recommend/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const recommendations = await generateRecommendations(req.params.beneficiaryId);
    res.json({ success: true, recommendations });
    } catch (e) {
      safeError(res, e, 'smart-scheduler');
    }
  });

  router.get('/smart-scheduler/workload', authenticate, async (req, res) => {
    try {
    const workload = await analyzeWorkload(
    req.query.branchId,
    parseInt(req.query.weekOffset, 10) || 0
    );
    res.json({ success: true, workload });
    } catch (e) {
      safeError(res, e, 'smart-scheduler');
    }
  });

  router.get('/smart-scheduler/conflicts', authenticate, async (req, res) => {
    try {
    const { therapistId, date, startTime, endTime } = req.query;
    if (!therapistId || !date || !startTime) {
    return res
    .status(400)
    .json({ success: false, error: 'therapistId, date, startTime required' });
    }
    const conflicts = await detectConflicts(therapistId, date, startTime, endTime);
    res.json({ success: true, conflicts, hasConflict: conflicts.length > 0 });
    } catch (e) {
      safeError(res, e, 'smart-scheduler');
    }
  });

  router.get('/smart-scheduler/no-show-prediction/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const sessions =
    (await model('ClinicalSession')
    ?.find({ beneficiaryId: req.params.beneficiaryId })
    .sort({ scheduledDate: -1 })
    .limit(20)
    .lean()) || [];
    const prediction = predictNoShow(sessions);
    prediction.mitigationStrategy = suggestMitigationStrategy(
    prediction.probability,
    prediction.factors
    );
    res.json({ success: true, ...prediction });
    } catch (e) {
      safeError(res, e, 'smart-scheduler');
    }
  });

  router.get('/smart-scheduler/utilization', authenticate, async (req, res) => {
    try {
    const dashboard = await getUtilizationDashboard(req.query.branchId);
    res.json({ success: true, dashboard });
    } catch (e) {
      safeError(res, e, 'smart-scheduler');
    }
  });

  router.get('/smart-scheduler/recommendations/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const recs = await DDDSchedulingRecommendation.find({
    beneficiaryId: req.params.beneficiaryId,
    status: 'pending',
    isDeleted: { $ne: true },
    })
    .sort({ evaluatedAt: -1 })
    .lean();
    res.json({ success: true, recommendations: recs });
    } catch (e) {
      safeError(res, e, 'smart-scheduler');
    }
  });

  router.post('/smart-scheduler/recommendations/:id/respond', authenticate, async (req, res) => {
    try {
    const rec = await DDDSchedulingRecommendation.findById(req.params.id);
    if (!rec) return res.status(404).json({ success: false, error: 'Not found' });
    rec.status = req.body.accept ? 'accepted' : 'rejected';
    rec.respondedAt = new Date();
    rec.respondedBy = req.body.userId;
    await rec.save();
    res.json({ success: true, recommendation: rec.toObject() });
    } catch (e) {
      safeError(res, e, 'smart-scheduler');
    }
  });

module.exports = router;
