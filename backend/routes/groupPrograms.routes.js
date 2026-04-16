/**
 * Group Program Routes — مسارات البرامج الجماعية
 * CRUD for group therapy programs (Social, Vocational, Behavioral, Recreational)
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const GroupProgram = require('../models/GroupProgram');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

/** GET /api/group-programs — list programs */
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { type, status, supervisor, page = 1, limit = 25 } = req.query;
    const filter = { ...branchFilter(req) };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (supervisor) filter.supervisor = supervisor;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      GroupProgram.find(filter)
        .populate('supervisor', 'name email')
        .populate('students', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      GroupProgram.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    safeError(res, err, 'groupProgram list error');
  }
});

/** GET /api/group-programs/:id — get single program */
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const program = await GroupProgram.findOne({ _id: req.params.id, ...branchFilter(req) })
      .populate('supervisor', 'name email')
      .populate('students', 'name email')
      .populate('sessions.facilitator', 'name')
      .populate('sessions.attendance.student', 'name');
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: program });
  } catch (err) {
    safeError(res, err, 'groupProgram get error');
  }
});

/** POST /api/group-programs — create program */
router.post(
  '/',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor', 'therapist']),
  async (req, res) => {
    try {
      const body = { ...stripUpdateMeta(req.body) };
      if (req.branchScope && req.branchScope.branchId) {
        body.branchId = req.branchScope.branchId;
      }
      const program = await GroupProgram.create(body);
      res.status(201).json({ success: true, data: program });
    } catch (err) {
      logger.error('groupProgram create error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** PUT /api/group-programs/:id — update program */
router.put(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor', 'therapist']),
  async (req, res) => {
    try {
      const program = await GroupProgram.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        stripUpdateMeta(req.body),
        { new: true, runValidators: true }
      );
      if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
      res.json({ success: true, data: program });
    } catch (err) {
      logger.error('groupProgram update error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** DELETE /api/group-programs/:id — delete program (admin) */
router.delete(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const program = await GroupProgram.findOneAndDelete({
        _id: req.params.id,
        ...branchFilter(req),
      });
      if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
      res.json({ success: true, message: 'Program deleted' });
    } catch (err) {
      safeError(res, err, 'groupProgram delete error');
    }
  }
);

// ── Students Management ──────────────────────────────────────────

/** POST /api/group-programs/:id/students — add students to program */
router.post(
  '/:id/students',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor', 'therapist']),
  async (req, res) => {
    try {
      const { studentIds } = req.body;
      if (!Array.isArray(studentIds))
        return res.status(400).json({ success: false, message: 'studentIds array required' });
      const program = await GroupProgram.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        { $addToSet: { students: { $each: studentIds } } },
        { new: true }
      ).populate('students', 'name');
      if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
      res.json({ success: true, data: program });
    } catch (err) {
      logger.error('groupProgram addStudents error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** DELETE /api/group-programs/:id/students/:studentId — remove student */
router.delete(
  '/:id/students/:studentId',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const program = await GroupProgram.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        { $pull: { students: req.params.studentId } },
        { new: true }
      );
      if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
      res.json({ success: true, data: program });
    } catch (err) {
      safeError(res, err, 'groupProgram removeStudent error');
    }
  }
);

// ── Session Logs ─────────────────────────────────────────────────

/** POST /api/group-programs/:id/sessions — log a group session */
router.post('/:id/sessions', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const program = await GroupProgram.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      { $push: { sessions: { $each: [req.body], $slice: -200 } } },
      { new: true }
    );
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    res.status(201).json({ success: true, data: program.sessions[program.sessions.length - 1] });
  } catch (err) {
    logger.error('groupProgram addSession error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/group-programs/:id/sessions — list session logs */
router.get('/:id/sessions', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const program = await GroupProgram.findOne({ _id: req.params.id, ...branchFilter(req) })
      .select('sessions name')
      .populate('sessions.facilitator', 'name')
      .populate('sessions.attendance.student', 'name');
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: program.sessions, total: program.sessions.length });
  } catch (err) {
    safeError(res, err, 'groupProgram sessions error');
  }
});

module.exports = router;
