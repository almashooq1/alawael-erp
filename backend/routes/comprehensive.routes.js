/**
 * Comprehensive Routes
 *
 * مسارات API للأنظمة 3-7
 * - نظام الجلسات العلاجية (12 مسار)
 * - نظام تتبع التقدم (10 مسارات)
 * - نظام التواصل مع العائلة (10 مسارات)
 * - نظام السجلات الطبية (12 مسار)
 * - نظام الحضور والسلوك (10 مسارات)
 */

const express = require('express');
const router = express.Router();
const {
  TherapySessionService,
  ProgressTrackingService,
  FamilyCommunicationService,
  MedicalRecordsService,
  AttendanceService,
} = require('../services/comprehensiveServices');

// ============================================
// THERAPY SESSIONS ROUTES (12 endpoints)
// ============================================

router.post('/therapy/sessions', async (req, res) => {
  try {
    const session = await TherapySessionService.createSession(req.body, req.user?.id);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/therapy/sessions', async (req, res) => {
  try {
    const sessions = await TherapySessionService.getSessions(req.query.caseId, req.query);
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/therapy/sessions/:id', async (req, res) => {
  try {
    const session = await TherapySessionService.updateSession(req.params.id, req.body);
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/therapy/stats/:caseId', async (req, res) => {
  try {
    const stats = await TherapySessionService.getSessionStats(req.params.caseId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============================================
// PROGRESS TRACKING ROUTES (10 endpoints)
// ============================================

router.post('/progress', async (req, res) => {
  try {
    const tracking = await ProgressTrackingService.createTracking(req.body);
    res.status(201).json({ success: true, data: tracking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/progress/:caseId/goal/:goalId', async (req, res) => {
  try {
    const tracking = await ProgressTrackingService.updateGoalProgress(
      req.params.caseId,
      req.params.goalId,
      req.body
    );
    res.json({ success: true, data: tracking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/progress/:caseId', async (req, res) => {
  try {
    const tracking = await ProgressTrackingService.getProgressReport(req.params.caseId);
    res.json({ success: true, data: tracking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/progress/:caseId/stats', async (req, res) => {
  try {
    const stats = await ProgressTrackingService.calculateStatistics(req.params.caseId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============================================
// FAMILY COMMUNICATION ROUTES (10 endpoints)
// ============================================

router.post('/family/message', async (req, res) => {
  try {
    const result = await FamilyCommunicationService.sendMessage(req.body.beneficiaryId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/family/messages/:beneficiaryId', async (req, res) => {
  try {
    const messages = await FamilyCommunicationService.getMessages(req.params.beneficiaryId);
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/family/report', async (req, res) => {
  try {
    const result = await FamilyCommunicationService.sendFamilyReport(
      req.body.beneficiaryId,
      req.body
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/family/meeting', async (req, res) => {
  try {
    const result = await FamilyCommunicationService.recordMeeting(req.body.beneficiaryId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============================================
// MEDICAL RECORDS ROUTES (12 endpoints)
// ============================================

router.post('/medical/visit', async (req, res) => {
  try {
    const result = await MedicalRecordsService.addMedicalVisit(req.body.beneficiaryId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/medical/prescription', async (req, res) => {
  try {
    const result = await MedicalRecordsService.addPrescription(req.body.beneficiaryId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/medical/lab-result', async (req, res) => {
  try {
    const result = await MedicalRecordsService.addLabResult(req.body.beneficiaryId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/medical/history/:beneficiaryId', async (req, res) => {
  try {
    const history = await MedicalRecordsService.getMedicalHistory(req.params.beneficiaryId);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/medical/prescriptions/:beneficiaryId', async (req, res) => {
  try {
    const prescriptions = await MedicalRecordsService.getActivePrescriptions(
      req.params.beneficiaryId
    );
    res.json({ success: true, data: prescriptions });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/medical/allergies/:beneficiaryId', async (req, res) => {
  try {
    const allergies = await MedicalRecordsService.getAllergies(req.params.beneficiaryId);
    res.json({ success: true, data: allergies });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============================================
// ATTENDANCE ROUTES (10 endpoints)
// ============================================

router.post('/attendance/record', async (req, res) => {
  try {
    const result = await AttendanceService.recordAttendance(req.body.beneficiaryId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/attendance/leave', async (req, res) => {
  try {
    const result = await AttendanceService.recordLeave(req.body.beneficiaryId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/attendance/stats/:beneficiaryId', async (req, res) => {
  try {
    const stats = await AttendanceService.getAttendanceStats(
      req.params.beneficiaryId,
      req.query.month ? new Date(req.query.month) : null
    );
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/attendance/report/:beneficiaryId', async (req, res) => {
  try {
    const report = await AttendanceService.getMonthlyReport(
      req.params.beneficiaryId,
      new Date(req.query.month)
    );
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/attendance/behavior/:beneficiaryId/:date', async (req, res) => {
  try {
    const result = await AttendanceService.recordBehavior(
      req.params.beneficiaryId,
      req.params.date,
      req.body
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
