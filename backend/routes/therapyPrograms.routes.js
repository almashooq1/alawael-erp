/**
 * Therapy Program Routes — مسارات البرامج العلاجية
 * CRUD for therapy program definitions
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const TherapyProgram = require('../models/TherapyProgram');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');

/** GET /api/therapy-programs — list programs */
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { department, isActive, search, page = 1, limit = 25 } = req.query;
    const filter = { ...branchFilter(req) };
    if (department) filter.department = { $regex: escapeRegex(String(department)), $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search)
      filter.$or = [
        { name: { $regex: escapeRegex(String(search)), $options: 'i' } },
        { code: { $regex: escapeRegex(String(search)), $options: 'i' } },
        { description: { $regex: escapeRegex(String(search)), $options: 'i' } },
      ];

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      TherapyProgram.find(filter)
        .sort({ department: 1, name: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TherapyProgram.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    safeError(res, err, 'therapyProgram list error');
  }
});

/** GET /api/therapy-programs/departments — list distinct departments */
router.get('/departments', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const departments = await TherapyProgram.distinct('department', { isActive: true });
    res.json({ success: true, data: departments.filter(Boolean).sort() });
  } catch (err) {
    safeError(res, err, 'therapyProgram departments error');
  }
});

/** GET /api/therapy-programs/:id — get single program */
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const program = await TherapyProgram.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: program });
  } catch (err) {
    safeError(res, err, 'therapyProgram get error');
  }
});

/** POST /api/therapy-programs — create program */
router.post(
  '/',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const body = stripUpdateMeta(req.body);
      if (req.branchScope && req.branchScope.branchId) {
        body.branchId = req.branchScope.branchId;
      }
      const program = await TherapyProgram.create(body);
      res.status(201).json({ success: true, data: program });
    } catch (err) {
      logger.error('therapyProgram create error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** PUT /api/therapy-programs/:id — update program */
router.put(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const program = await TherapyProgram.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        stripUpdateMeta(req.body),
        {
          new: true,
          runValidators: true,
        }
      );
      if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
      res.json({ success: true, data: program });
    } catch (err) {
      logger.error('therapyProgram update error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** DELETE /api/therapy-programs/:id — delete program (admin) */
router.delete(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const program = await TherapyProgram.findOneAndDelete({
        _id: req.params.id,
        ...branchFilter(req),
      });
      if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
      res.json({ success: true, message: 'Program deleted' });
    } catch (err) {
      safeError(res, err, 'therapyProgram delete error');
    }
  }
);

/** PATCH /api/therapy-programs/:id/toggle-active — toggle active status */
router.patch(
  '/:id/toggle-active',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const program = await TherapyProgram.findOne({ _id: req.params.id, ...branchFilter(req) });
      if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
      program.isActive = !program.isActive;
      await program.save();
      res.json({ success: true, data: program });
    } catch (err) {
      safeError(res, err, 'therapyProgram toggle error');
    }
  }
);

module.exports = router;
