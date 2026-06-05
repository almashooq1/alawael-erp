'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { assertBeneficiaryInScope } = require('../utils/beneficiaryBranchGate');

const Beneficiary = require('../models/Beneficiary');
const ClinicalPathwayPlan = require('../models/ClinicalPathwayPlan');

const router = express.Router();

const READ_ROLES = ['admin', 'manager', 'clinical_supervisor', 'therapist', 'social_worker'];
const WRITE_ROLES = ['admin', 'manager', 'clinical_supervisor', 'therapist'];

router.use(authenticateToken);
router.use(requireBranchAccess);

const isValidId = id => mongoose.isValidObjectId(id);
const actorId = req => req.user?.id || req.user?._id || null;
const scopedById = (req, id) => ({ _id: id, ...branchFilter(req) });

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function nextStageCode(stages) {
  const next = [...stages]
    .sort((a, b) => a.order - b.order)
    .find(s => s.status !== 'COMPLETED' && s.status !== 'SKIPPED');
  return next ? next.code : null;
}

function calculateProgress(stages) {
  const total = stages.length;
  const completed = stages.filter(s => s.status === 'COMPLETED').length;
  return {
    totalStages: total,
    completedStages: completed,
    completionPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

async function loadPathwayOr404(req, res, id = req.params.id) {
  if (!isValidId(id)) {
    badRequest(res, 'معرف غير صالح');
    return null;
  }
  const doc = await ClinicalPathwayPlan.findOne(scopedById(req, id));
  if (!doc) {
    res.status(404).json({ success: false, message: 'المسار العلاجي غير موجود' });
    return null;
  }
  return doc;
}

router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { beneficiaryId, pathwayType, startDate, targetEndDate, stages } = req.body || {};
    if (!beneficiaryId || !isValidId(beneficiaryId)) {
      return badRequest(res, 'beneficiaryId مطلوب وصالح');
    }
    if (!pathwayType || typeof pathwayType !== 'string') {
      return badRequest(res, 'pathwayType مطلوب');
    }
    if (!startDate || Number.isNaN(Date.parse(startDate))) {
      return badRequest(res, 'startDate مطلوب ويجب أن يكون تاريخًا صالحًا');
    }
    if (targetEndDate && Number.isNaN(Date.parse(targetEndDate))) {
      return badRequest(res, 'targetEndDate غير صالح');
    }
    if (!Array.isArray(stages) || stages.length === 0) {
      return badRequest(res, 'stages مطلوبة ويجب أن تحتوي مرحلة واحدة على الأقل');
    }

    const denied = await assertBeneficiaryInScope(req, beneficiaryId, res);
    if (denied) return;

    const beneficiary = await Beneficiary.findById(beneficiaryId).select('branchId').lean();
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }

    const normalizedStages = stages.map((s, idx) => ({
      code: String(s.code || `STAGE_${idx + 1}`),
      title: String(s.title || '').trim(),
      order: Number(s.order) > 0 ? Number(s.order) : idx + 1,
      targetDays: Number.isFinite(Number(s.targetDays)) ? Number(s.targetDays) : 14,
    }));

    const doc = await ClinicalPathwayPlan.create({
      beneficiaryId,
      branchId: beneficiary.branchId,
      pathwayType,
      status: 'ACTIVE',
      startDate: new Date(startDate),
      ...(targetEndDate ? { targetEndDate: new Date(targetEndDate) } : {}),
      stages: normalizedStages,
      currentStageCode: nextStageCode(normalizedStages.map(s => ({ ...s, status: 'NOT_STARTED' }))),
      createdBy: actorId(req),
      updatedBy: actorId(req),
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/beneficiary/:beneficiaryId', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!isValidId(beneficiaryId)) return badRequest(res, 'معرف مستفيد غير صالح');

    const denied = await assertBeneficiaryInScope(req, beneficiaryId, res);
    if (denied) return;

    const filter = { ...branchFilter(req), beneficiaryId };
    if (req.query.includeInactive !== 'true') {
      filter.status = { $in: ['ACTIVE', 'PAUSED'] };
    }

    const data = await ClinicalPathwayPlan.find(filter)
      .sort({ createdAt: -1 })
      .select(
        'beneficiaryId pathwayType status startDate targetEndDate currentStageCode stages createdAt'
      )
      .lean();
    return res.json({ success: true, data, total: data.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    const doc = await loadPathwayOr404(req, res);
    if (!doc) return;
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/stages/:stageId/start', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await loadPathwayOr404(req, res);
    if (!doc) return;
    const stage = doc.stages.id(req.params.stageId);
    if (!stage) {
      return res.status(404).json({ success: false, message: 'المرحلة غير موجودة' });
    }
    if (stage.status === 'NOT_STARTED') {
      stage.status = 'IN_PROGRESS';
      doc.currentStageCode = stage.code;
      doc.updatedBy = actorId(req);
      await doc.save();
    }
    return res.json({ success: true, data: stage });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/stages/:stageId/complete', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await loadPathwayOr404(req, res);
    if (!doc) return;
    const stage = doc.stages.id(req.params.stageId);
    if (!stage) {
      return res.status(404).json({ success: false, message: 'المرحلة غير موجودة' });
    }
    stage.status = 'COMPLETED';
    stage.completedAt = req.body?.completedAt ? new Date(req.body.completedAt) : new Date();
    if (typeof req.body?.notes === 'string') stage.notes = req.body.notes.slice(0, 1000);

    const next = nextStageCode(doc.stages);
    doc.currentStageCode = next;
    const progress = calculateProgress(doc.stages);
    if (progress.completionPercent === 100) {
      doc.status = 'COMPLETED';
    }
    doc.updatedBy = actorId(req);
    await doc.save();

    return res.json({
      success: true,
      data: {
        stageId: stage._id,
        currentStageCode: doc.currentStageCode,
        pathwayStatus: doc.status,
        progress,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/progress', requireRole(READ_ROLES), async (req, res) => {
  try {
    const doc = await loadPathwayOr404(req, res);
    if (!doc) return;
    const progress = calculateProgress(doc.stages);
    return res.json({
      success: true,
      data: {
        pathwayId: doc._id,
        pathwayType: doc.pathwayType,
        status: doc.status,
        currentStageCode: doc.currentStageCode,
        ...progress,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
