'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { assertBeneficiaryInScope } = require('../utils/beneficiaryBranchGate');

const FamilyHomeProgram = require('../models/FamilyHomeProgram');
const Beneficiary = require('../models/Beneficiary');

const router = express.Router();

const READ_ROLES = ['admin', 'manager', 'therapist', 'social_worker', 'receptionist'];
const WRITE_ROLES = ['admin', 'manager', 'therapist', 'social_worker'];

router.use(authenticateToken);
router.use(requireBranchAccess);

const isValidId = id => mongoose.isValidObjectId(id);
const actorId = req => req.user?.id || req.user?._id || null;
const scopedById = (req, id) => ({ _id: id, ...branchFilter(req) });

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

async function loadProgramOr404(req, res, id = req.params.id) {
  if (!isValidId(id)) {
    badRequest(res, 'معرف غير صالح');
    return null;
  }
  const doc = await FamilyHomeProgram.findOne(scopedById(req, id));
  if (!doc) {
    res.status(404).json({ success: false, message: 'الخطة المنزلية غير موجودة' });
    return null;
  }
  return doc;
}

router.get('/beneficiary/:beneficiaryId', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!isValidId(beneficiaryId)) return badRequest(res, 'معرف مستفيد غير صالح');

    const denied = await assertBeneficiaryInScope(req, beneficiaryId, res);
    if (denied) return;

    const filter = {
      ...branchFilter(req),
      beneficiaryId,
    };
    if (req.query.includeInactive !== 'true') {
      filter.status = { $in: ['ACTIVE', 'PAUSED'] };
    }

    const data = await FamilyHomeProgram.find(filter)
      .sort({ createdAt: -1 })
      .select('beneficiaryId title status startDate endDate tasks createdAt')
      .lean();

    return res.json({ success: true, data, total: data.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    const doc = await loadProgramOr404(req, res);
    if (!doc) return;
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { beneficiaryId, title, startDate, endDate, tasks = [] } = req.body || {};
    if (!beneficiaryId || !isValidId(beneficiaryId)) {
      return badRequest(res, 'beneficiaryId مطلوب ويجب أن يكون معرفًا صالحًا');
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return badRequest(res, 'title مطلوب');
    }
    if (!startDate || Number.isNaN(Date.parse(startDate))) {
      return badRequest(res, 'startDate مطلوب ويجب أن يكون تاريخًا صالحًا');
    }
    if (endDate && Number.isNaN(Date.parse(endDate))) {
      return badRequest(res, 'endDate غير صالح');
    }
    if (!Array.isArray(tasks)) {
      return badRequest(res, 'tasks يجب أن تكون مصفوفة');
    }

    const denied = await assertBeneficiaryInScope(req, beneficiaryId, res);
    if (denied) return;

    const beneficiary = await Beneficiary.findById(beneficiaryId).select('branchId').lean();
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }

    const doc = await FamilyHomeProgram.create({
      beneficiaryId,
      branchId: beneficiary.branchId,
      title: title.trim(),
      startDate: new Date(startDate),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
      tasks: tasks.map(t => ({
        title: String(t.title || '').trim(),
        instructions: t.instructions,
        frequency: t.frequency,
        targetPerWeek: t.targetPerWeek,
      })),
      createdBy: actorId(req),
      updatedBy: actorId(req),
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/tasks', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { title, instructions, frequency, targetPerWeek } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return badRequest(res, 'title مطلوب');
    }

    const doc = await loadProgramOr404(req, res);
    if (!doc) return;

    doc.tasks.push({
      title: title.trim(),
      instructions,
      frequency,
      targetPerWeek,
    });
    doc.updatedBy = actorId(req);
    await doc.save();

    return res.status(201).json({ success: true, data: doc.tasks[doc.tasks.length - 1] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/tasks/:taskId/log', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await loadProgramOr404(req, res);
    if (!doc) return;

    const task = doc.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
    }

    task.logs.push({
      completedAt: req.body?.completedAt ? new Date(req.body.completedAt) : new Date(),
      notes: req.body?.notes,
      completedBy: actorId(req),
    });
    doc.updatedBy = actorId(req);
    await doc.save();

    return res.json({
      success: true,
      data: {
        taskId: task._id,
        logsCount: task.logs.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/progress', requireRole(READ_ROLES), async (req, res) => {
  try {
    const doc = await loadProgramOr404(req, res);
    if (!doc) return;

    const progress = doc.tasks.map(task => ({
      taskId: task._id,
      title: task.title,
      targetPerWeek: task.targetPerWeek,
      completions: task.logs.length,
      lastCompletionAt: task.logs.length ? task.logs[task.logs.length - 1].completedAt : null,
    }));

    return res.json({
      success: true,
      data: {
        programId: doc._id,
        status: doc.status,
        tasks: progress,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
