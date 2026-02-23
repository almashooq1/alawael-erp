/**
 * AL-AWAEL ERP - LEARNING & DEVELOPMENT ROUTES
 * Phase 23 - Learning & Development API Endpoints
 */

const express = require('express');
const LearningDevelopmentService = require('../services/learning-development.service');

const router = express.Router();
const learningService = new LearningDevelopmentService();

/**
 * LEARNING PROGRAMS ENDPOINTS
 */

// Create learning program
router.post('/programs', async (req, res) => {
  try {
    const program = learningService.createLearningProgram(req.body);
    res.status(201).json({ success: true, data: program });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get program by ID
router.get('/programs/:id', async (req, res) => {
  try {
    const program = learningService.getProgram(req.params.id);
    res.json({ success: true, data: program });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Update program
router.put('/programs/:id', async (req, res) => {
  try {
    const program = learningService.updateProgram(req.params.id, req.body);
    res.json({ success: true, data: program });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// List programs
router.get('/programs', async (req, res) => {
  try {
    const programs = learningService.listPrograms(req.query);
    res.json({ success: true, data: programs });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Archive program
router.post('/programs/:id/archive', async (req, res) => {
  try {
    const program = learningService.archiveProgram(req.params.id);
    res.json({ success: true, data: program });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete program
router.delete('/programs/:id', async (req, res) => {
  try {
    res.json({ success: true, message: 'Program deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * ENROLLMENT ENDPOINTS
 */

// Enroll employee
router.post('/enrollments', async (req, res) => {
  try {
    const enrollment = learningService.enrollEmployee(req.body);
    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get enrollment by ID
router.get('/enrollments/:id', async (req, res) => {
  try {
    const enrollment = learningService.getEnrollment(req.params.id);
    res.json({ success: true, data: enrollment });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Update enrollment status
router.put('/enrollments/:id/status', async (req, res) => {
  try {
    const enrollment = learningService.updateEnrollmentStatus(
      req.params.id,
      req.body.status,
      req.body
    );
    res.json({ success: true, data: enrollment });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Track mandatory training
router.get('/enrollments/employee/:empId/mandatory', async (req, res) => {
  try {
    const tracking = learningService.trackMandatoryTraining(req.params.empId);
    res.json({ success: true, data: tracking });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get employee enrollments
router.get('/enrollments/employee/:empId', async (req, res) => {
  try {
    const enrollments = learningService.enrollments.filter(
      e => e.employeeId === req.params.empId
    );
    res.json({ success: true, data: enrollments });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update enrollment progress
router.put('/enrollments/:id/progress', async (req, res) => {
  try {
    const enrollment = learningService.updateEnrollmentStatus(
      req.params.id,
      'in-progress',
      { progress: req.body.progress }
    );
    res.json({ success: true, data: enrollment });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Complete enrollment
router.post('/enrollments/:id/complete', async (req, res) => {
  try {
    const enrollment = learningService.updateEnrollmentStatus(
      req.params.id,
      'completed',
      req.body
    );
    res.json({ success: true, data: enrollment });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * LEARNING ANALYTICS ENDPOINTS
 */

// Get completion rates
router.get('/analytics/completion-rates', async (req, res) => {
  try {
    const rates = learningService.getCompletionRates(req.query);
    res.json({ success: true, data: rates });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get assessment scores
router.get('/analytics/assessment-scores/:empId', async (req, res) => {
  try {
    const scores = learningService.getAssessmentScores(req.params.empId);
    res.json({ success: true, data: scores });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Track skill improvement
router.get('/analytics/skill-improvement/:empId', async (req, res) => {
  try {
    const improvement = learningService.trackSkillImprovement(req.params.empId);
    res.json({ success: true, data: improvement });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Measure learning ROI
router.get('/analytics/roi/:programId', async (req, res) => {
  try {
    const roi = learningService.measureLearningROI(req.params.programId);
    res.json({ success: true, data: roi });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Generate learning report
router.get('/analytics/report', async (req, res) => {
  try {
    const report = learningService.generateLearningReport(req.query);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * CERTIFICATION ENDPOINTS
 */

// Define certification path
router.post('/certifications', async (req, res) => {
  try {
    const cert = learningService.defineCertificationPath(req.body);
    res.status(201).json({ success: true, data: cert });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Track exam status
router.post('/certifications/:certId/exams', async (req, res) => {
  try {
    const exam = learningService.trackExamStatus(
      req.body.employeeId,
      req.params.certId,
      req.body
    );
    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Manage license renewal
router.post('/certifications/:certId/renewal', async (req, res) => {
  try {
    const renewal = learningService.manageLicenseRenewal(
      req.body.employeeId,
      req.params.certId,
      req.body
    );
    res.status(201).json({ success: true, data: renewal });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get certifications
router.get('/certifications', async (req, res) => {
  try {
    res.json({ success: true, data: learningService.certifications });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * EXTERNAL INTEGRATION ENDPOINTS
 */

// Integrate third-party platform
router.post('/integrations', async (req, res) => {
  try {
    const integration = learningService.integrateThirdPartyPlatform(req.body);
    res.status(201).json({ success: true, data: integration });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Sync learning content
router.post('/integrations/:id/sync', async (req, res) => {
  try {
    const result = learningService.syncLearningContent(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get integrations
router.get('/integrations', async (req, res) => {
  try {
    res.json({ success: true, data: learningService.externalIntegrations });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DASHBOARD ENDPOINTS
 */

// Learning dashboard
router.get('/dashboard/:empId', async (req, res) => {
  try {
    const enrollments = learningService.enrollments.filter(
      e => e.employeeId === req.params.empId
    );
    const scores = learningService.getAssessmentScores(req.params.empId);
    const completion = learningService.getCompletionRates();
    const improvement = learningService.trackSkillImprovement(req.params.empId);

    res.json({
      success: true,
      data: {
        enrollments,
        assessmentScores: scores,
        completionRates: completion,
        skillImprovement: improvement,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Organization learning dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const totalPrograms = learningService.learningPrograms.length;
    const totalEnrollments = learningService.enrollments.length;
    const completionRates = learningService.getCompletionRates();

    res.json({
      success: true,
      data: {
        totalPrograms,
        totalEnrollments,
        completionRates,
        integrations: learningService.externalIntegrations.length,
        certifications: learningService.certifications.length,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
