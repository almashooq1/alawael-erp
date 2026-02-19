/**
 * Validation Routes
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getViolations,
  getViolation,
  resolveViolation,
  generateReport,
  getReport,
  getViolationsReport,
  bulkUpdateViolations
} = require('../controllers/validationController');

// Get violations with filtering
router.get('/violations', protect, getViolations);

// Get violations report/stats
router.get('/violations-report', protect, getViolationsReport);

// Get single violation
router.get('/violations/:id', protect, getViolation);

// Resolve violation
router.post('/violations/:id/resolve', protect, authorize('auditor', 'manager'), resolveViolation);

// Bulk update violations
router.post('/violations/bulk-update', protect, authorize('manager', 'director'), bulkUpdateViolations);

// Generate validation report
router.post('/reports/generate', protect, authorize('auditor', 'manager'), generateReport);

// Get report
router.get('/reports/:id', protect, getReport);

module.exports = router;
