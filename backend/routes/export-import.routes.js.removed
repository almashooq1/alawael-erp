/**
 * Export/Import Routes
 * API endpoints for export and import operations
 */

const express = require('express');
const router = express.Router();
const exportImportController = require('../controllers/export-import.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// Export to Excel
router.get(
  '/export/excel',
  exportImportController.exportToExcel
);

// Export program to PDF
router.get('/export/pdf/:id', exportImportController.exportProgramToPDF);

// Import from Excel
router.post(
  '/import/excel',
  exportImportController.importFromExcel
);

// Download import template
router.get(
  '/import/template',
  exportImportController.downloadImportTemplate
);

// Info endpoint
router.get('/info', exportImportController.getInfo);

module.exports = router;

