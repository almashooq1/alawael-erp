const express = require('express');
const router = express.Router();
const SmartAcademicService = require('../services/smartAcademic.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/academic-smart/intern-progress/:internId
 * @desc Get real-time progress of a University Intern
 */
router.get('/intern-progress/:internId', authorizeRole(['ADMIN', 'CLINICAL_SUPERVISOR', 'HR']), async (req, res) => {
  try {
    const progress = await SmartAcademicService.trackInternProgress(req.params.internId);
    res.json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/academic-smart/case-study/:patientId
 * @desc Generate an anonymized case study draft
 */
router.get('/case-study/:patientId', authorizeRole(['DOCTOR', 'THERAPIST']), async (req, res) => {
  try {
    const draft = await SmartAcademicService.generateCaseStudy(req.params.patientId);
    res.json({ success: true, caseStudy: draft });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
