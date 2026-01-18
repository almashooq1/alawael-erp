const express = require('express');
const router = express.Router();
const SmartSchoolService = require('../services/smartSchool.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/school-smart/grant-access
 * @desc Create a portal link for a teacher
 */
router.post('/grant-access', authorizeRole(['PARENT', 'ADMIN']), async (req, res) => {
  try {
    const result = await SmartSchoolService.generateTeacherAccess(req.body.studentId, req.body.teacherEmail);
    res.json({ success: true, invitation: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/school-smart/sync-iep/:studentId
 * @desc Get Clinical goals translated for School IEP
 */
router.get('/sync-iep/:studentId', authorizeRole(['THERAPIST', 'DOCTOR']), async (req, res) => {
  try {
    const result = await SmartSchoolService.syncGoalsWithIEP(req.params.studentId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/school-smart/teacher-observation
 * @desc Endpoint for Teachers to submit data (via Portal)
 */
router.post('/teacher-observation', async (req, res) => {
  try {
    // In real world, this would use the Teacher Token for auth
    const result = await SmartSchoolService.receiveTeacherObservation(req.body.studentId, req.body.observation);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
