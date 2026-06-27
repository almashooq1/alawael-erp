/**
 * Clinical Routes — مسارات التكامل السريري
 * Combines Clinical Dashboard, Integrated Reports, and Session-ICF linking
 */
const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const clinicalDashboard = require('../services/clinicalDashboard.service');
const integratedReport = require('../services/integratedReport.service');
const sessionICF = require('../services/sessionICFLinker.service');

// ═══════════════════════════════════════════════════════════════════
//  Clinical Dashboard
// ═══════════════════════════════════════════════════════════════════

// Get unified clinical dashboard for a beneficiary
router.get('/dashboard/:beneficiaryId',
  auth,
  async (req, res) => {
    try {
      const { beneficiaryId } = req.params;
      const result = await clinicalDashboard.getClinicalDashboard(beneficiaryId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('[ClinicalRoutes] Dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching clinical dashboard',
        error: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  Integrated Reports
// ═══════════════════════════════════════════════════════════════════

// Generate integrated report for a beneficiary
router.post('/reports/:beneficiaryId',
  auth,
  checkRole(['therapist', 'doctor', 'admin', 'clinical_director']),
  async (req, res) => {
    try {
      const { beneficiaryId } = req.params;
      const { startDate, endDate, sections, format } = req.body;

      const result = await integratedReport.generateIntegratedReport(beneficiaryId, {
        startDate,
        endDate,
        sections,
        format: format || 'json',
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      // If HTML format, return as text/html
      if (format === 'html' && result.html) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(result.html);
      }

      res.json(result);
    } catch (error) {
      console.error('[ClinicalRoutes] Report generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating report',
        error: error.message,
      });
    }
  }
);

// Preview report (same as generate but always returns JSON with HTML)
router.get('/reports/:beneficiaryId/preview',
  auth,
  async (req, res) => {
    try {
      const { beneficiaryId } = req.params;
      const { startDate, endDate, sections } = req.query;

      const result = await integratedReport.generateIntegratedReport(beneficiaryId, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        sections: sections ? sections.split(',') : undefined,
        format: 'html',
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        html: result.html,
        report: result.report,
      });
    } catch (error) {
      console.error('[ClinicalRoutes] Report preview error:', error);
      res.status(500).json({
        success: false,
        message: 'Error previewing report',
        error: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
//  Session-ICF Linking
// ═══════════════════════════════════════════════════════════════════

// Get ICF targets for a session
router.get('/sessions/:sessionId/icf-targets',
  auth,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = await sessionICF.getSessionICFTargets(sessionId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('[ClinicalRoutes] Session ICF targets error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching session ICF targets',
        error: error.message,
      });
    }
  }
);

// Record ICF progress during a session
router.post('/sessions/:sessionId/icf-progress',
  auth,
  checkRole(['therapist', 'doctor', 'admin']),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { progressData } = req.body;

      const result = await sessionICF.recordSessionICFProgress(sessionId, progressData);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('[ClinicalRoutes] Record ICF progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Error recording ICF progress',
        error: error.message,
      });
    }
  }
);

// Get ICF progress history for a goal
router.get('/goals/:goalId/icf-progress',
  auth,
  async (req, res) => {
    try {
      const { goalId } = req.params;
      const { timeRange } = req.query;

      const result = await sessionICF.getICFProgressForGoal(goalId, timeRange || '3months');

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('[ClinicalRoutes] Goal ICF progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching goal ICF progress',
        error: error.message,
      });
    }
  }
);

// Auto-link session to ICF goals
router.post('/sessions/:sessionId/auto-link-icf',
  auth,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = await sessionICF.autoLinkSessionToICF(sessionId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('[ClinicalRoutes] Auto-link ICF error:', error);
      res.status(500).json({
        success: false,
        message: 'Error auto-linking session to ICF',
        error: error.message,
      });
    }
  }
);

module.exports = router;
