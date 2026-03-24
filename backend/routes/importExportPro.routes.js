/**
 * ImportExport Pro Routes
 * ========================
 * مسارات نظام الاستيراد والتصدير الاحترافي
 * Professional import/export REST API routes
 *
 * Base path: /api/import-export-pro
 *
 * @module routes/importExportPro.routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');

// Multer configuration for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
      'application/json',
      'application/xml',
      'text/xml',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    ];
    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.json', '.xml', '.docx'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `نوع الملف غير مدعوم: ${file.mimetype}. الأنواع المدعومة: xlsx, xls, csv, json, xml`
        )
      );
    }
  },
});

// Auth middleware
const { authenticateToken } = require('../middleware/auth');

// Controller
const controller = require('../controllers/importExportPro.controller');

// Apply auth to all routes
router.use(authenticateToken);

// ─────────────────────────────────────────────────
// INFO
// ─────────────────────────────────────────────────
router.get('/info', controller.getInfo);

// ─────────────────────────────────────────────────
// EXPORT ROUTES
// ─────────────────────────────────────────────────
router.post('/export', controller.createExport);
router.post('/export/preview', controller.previewExport);
router.post('/export/bulk', controller.bulkExport);

// ─────────────────────────────────────────────────
// IMPORT ROUTES
// ─────────────────────────────────────────────────
router.post('/import/parse', upload.single('file'), controller.parseImportFile);
router.post('/import/execute', upload.single('file'), controller.executeImport);
router.post('/import/validate', upload.single('file'), controller.validateImport);
router.post('/import/quality-report', upload.single('file'), controller.generateQualityReport);

// ─────────────────────────────────────────────────
// SCHEDULED EXPORTS
// ─────────────────────────────────────────────────
router.post('/schedule', controller.createScheduledExport);
router.get('/schedule', controller.listScheduledExports);
router.post('/schedule/execute', controller.executeScheduledExports);
router.put('/schedule/:id/toggle', controller.toggleScheduledExport);

// ─────────────────────────────────────────────────
// DATA TRANSFORMS
// ─────────────────────────────────────────────────
router.get('/transforms', controller.listTransformRules);

// ─────────────────────────────────────────────────
// TEMPLATE ROUTES
// ─────────────────────────────────────────────────
router.get('/templates', controller.listTemplates);
router.get('/templates/:id', controller.getTemplate);
router.post('/templates', controller.createTemplate);
router.put('/templates/:id', controller.updateTemplate);
router.delete('/templates/:id', controller.deleteTemplate);
router.get('/templates/download/:module', controller.downloadTemplate);

// ─────────────────────────────────────────────────
// JOB MANAGEMENT ROUTES
// ─────────────────────────────────────────────────
router.get('/jobs', controller.listJobs);
router.get('/jobs/:id', controller.getJob);
router.post('/jobs/:id/cancel', controller.cancelJob);
router.post('/jobs/:id/retry', controller.retryJob);
router.delete('/jobs/:id', controller.deleteJob);

// ─────────────────────────────────────────────────
// MODULE & FIELD ROUTES
// ─────────────────────────────────────────────────
router.get('/modules', controller.listModules);
router.get('/modules/:module/fields', controller.getModuleFields);

// ─────────────────────────────────────────────────
// STATISTICS
// ─────────────────────────────────────────────────
router.get('/statistics', controller.getStatistics);

// ─────────────────────────────────────────────────
// FILE DOWNLOAD
// ─────────────────────────────────────────────────
router.get('/download/:jobId', controller.downloadFile);

// ─────────────────────────────────────────────────
// SSE — Live Progress Streaming
// ─────────────────────────────────────────────────
router.get('/progress/:jobId', controller.streamProgress);

module.exports = router;
