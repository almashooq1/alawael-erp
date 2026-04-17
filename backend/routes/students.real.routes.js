const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
// GET /:id/dashboard
router.get('/:id/dashboard', async (req, res) => {
  try {
    const Beneficiary = require('../models/Beneficiary');
    const student = await Beneficiary.findById(req.params.id).lean();
    if (!student) return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
    res.json({
      success: true,
      data: { student, stats: { attendance: 0, assignments: 0, grades: 0 } },
    });
  } catch (err) {
    safeError(res, err, 'Student dashboard error');
  }
});

// GET /:id/schedule
router.get('/:id/schedule', async (req, res) => {
  try {
    const Schedule = require('../models/Schedule');
    const data = await Schedule.find({ studentId: req.params.id }).sort({ date: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Student schedule error');
  }
});

// GET /:id/grades
router.get('/:id/grades', async (req, res) => {
  try {
    const BenMgmt = require('../models/BeneficiaryManagement');
    const data = await BenMgmt.AcademicRecord.find({ beneficiaryId: req.params.id }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Student grades error');
  }
});

// GET /:id/attendance
router.get('/:id/attendance', async (req, res) => {
  try {
    const BenMgmt = require('../models/BeneficiaryManagement');
    const data = await BenMgmt.AttendanceRecord.find({ beneficiaryId: req.params.id })
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Student attendance error');
  }
});

// GET /:id/assignments
router.get('/:id/assignments', async (req, res) => {
  try {
    const HomeAssignment = require('../models/HomeAssignment');
    const data = await HomeAssignment.find({ beneficiary: req.params.id })
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Student assignments error');
  }
});

// GET /:id/announcements
router.get('/:id/announcements', async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const data = await Notification.find({ type: 'announcement' })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Student announcements error');
  }
});

// POST /:id/assignments/:assignmentId/submit — تسليم واجب
router.post('/:id/assignments/:assignmentId/submit', async (req, res) => {
  try {
    const HomeAssignment = require('../models/HomeAssignment');
    const assignment = await HomeAssignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'الواجب غير موجود' });
    }
    assignment.status = 'مكتمل';
    assignment.submittedAt = new Date();
    assignment.submissionNotes = req.body.notes || '';
    await assignment.save();
    res.json({ success: true, data: assignment, message: 'تم تسليم الواجب بنجاح' });
  } catch (err) {
    safeError(res, err, 'Student assignment submit error');
  }
});

module.exports = router;
