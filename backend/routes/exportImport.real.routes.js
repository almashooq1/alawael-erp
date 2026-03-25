/**
 * Export/Import Legacy Routes — Delegates to ImportExport Pro
 * ============================================================
 * Legacy compatibility layer that proxies to the Pro service
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const importExportService = require('../services/importExportPro.service');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /export/excel — Dynamic model Excel export
router.get('/export/excel', async (req, res) => {
  try {
    const { model, filters } = req.query;
    if (!model) {
      return res.status(400).json({ success: false, message: 'model query parameter is required' });
    }

    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const result = await importExportService.createExport({
      module: model,
      format: 'xlsx',
      query: filters ? JSON.parse(filters) : {},
      userId,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`
    );
    res.setHeader('Content-Length', result.buffer.length);
    return res.send(result.buffer);
  } catch (err) {
    logger.error('Export excel error:', err);
    res.status(500).json({ success: false, message: 'خطأ في التصدير' });
  }
});

// GET /export/pdf/:id — Export single record as PDF
router.get('/export/pdf/:id', async (req, res) => {
  try {
    const { model } = req.query;
    if (!model) {
      return res.status(400).json({ success: false, message: 'model query parameter is required' });
    }

    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const result = await importExportService.createExport({
      module: model,
      format: 'pdf',
      query: { _id: req.params.id },
      userId,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`
    );
    res.setHeader('Content-Length', result.buffer.length);
    return res.send(result.buffer);
  } catch (err) {
    logger.error('Export PDF error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تصدير PDF' });
  }
});

// POST /import/template — Generate import template
router.post('/import/template', async (req, res) => {
  try {
    const { model, format } = req.body;
    if (!model) {
      return res.status(400).json({ success: false, message: 'model field is required' });
    }

    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const result = await importExportService.generateImportTemplate({
      module: model,
      format: format || 'xlsx',
      userId,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`
    );
    res.setHeader('Content-Length', result.buffer.length);
    return res.send(result.buffer);
  } catch (err) {
    logger.error('Import template error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء القالب' });
  }
});

// POST /import/excel — Import from Excel (requires multer middleware upstream)
router.post('/import/excel', async (req, res) => {
  try {
    const { model } = req.body;
    if (!model) {
      return res.status(400).json({ success: false, message: 'model field is required' });
    }
    if (!req.file && !req.files?.file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }

    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const fileBuffer = req.file?.buffer || req.files?.file?.data;
    const fileName = req.file?.originalname || req.files?.file?.name || 'import.xlsx';

    const result = await importExportService.executeImport({
      fileBuffer,
      fileName,
      module: model,
      columnMappings: [],
      options: {},
      userId,
    });

    return res.json({ success: true, data: result, message: 'تم استيراد البيانات' });
  } catch (err) {
    logger.error('Import excel error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الاستيراد' });
  }
});

module.exports = router;
