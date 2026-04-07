/**
 * Therapy Program Routes — مسارات البرامج العلاجية
 * CRUD for therapy program definitions
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const TherapyProgram = require('../models/TherapyProgram');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { escapeRegex } = require('../utils/sanitize');

/** GET /api/therapy-programs — list programs */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { department, isActive, search, page = 1, limit = 25 } = req.query;
    const filter = {};
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
    logger.error('therapyProgram list error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/therapy-programs/departments — list distinct departments */
router.get('/departments', requireAuth, async (req, res) => {
  try {
    const departments = await TherapyProgram.distinct('department', { isActive: true });
    res.json({ success: true, data: departments.filter(Boolean).sort() });
  } catch (err) {
    logger.error('therapyProgram departments error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/therapy-programs/:id — get single program */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const program = await TherapyProgram.findById(req.params.id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: program });
  } catch (err) {
    logger.error('therapyProgram get error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/therapy-programs — create program */
router.post('/', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const program = await TherapyProgram.create(req.body);
    res.status(201).json({ success: true, data: program });
  } catch (err) {
    logger.error('therapyProgram create error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/therapy-programs/:id — update program */
router.put('/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const program = await TherapyProgram.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: program });
  } catch (err) {
    logger.error('therapyProgram update error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** DELETE /api/therapy-programs/:id — delete program (admin) */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const program = await TherapyProgram.findByIdAndDelete(req.params.id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, message: 'Program deleted' });
  } catch (err) {
    logger.error('therapyProgram delete error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** PATCH /api/therapy-programs/:id/toggle-active — toggle active status */
router.patch(
  '/:id/toggle-active',
  requireAuth,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const program = await TherapyProgram.findById(req.params.id);
      if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
      program.isActive = !program.isActive;
      await program.save();
      res.json({ success: true, data: program });
    } catch (err) {
      logger.error('therapyProgram toggle error:', err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

module.exports = router;
