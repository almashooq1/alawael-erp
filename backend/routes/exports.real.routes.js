/**
 * Generic Exports Route — Delegates to ImportExport Pro
 * =====================================================
 * Supports: GET /exports/:format?module=xxx
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const importExportService = require('../services/importExportPro.service');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
// GET /:format — Export a module in the given format
router.get('/:format', async (req, res) => {
  try {
    const format = req.params.format;
    const { module: mod, filters, fields } = req.query;

    // If no module specified, return available modules & formats
    if (!mod) {
      const modules = importExportService.getAvailableModules();
      return res.json({
        success: true,
        data: {
          availableFormats: ['xlsx', 'csv', 'json', 'pdf', 'xml', 'docx'],
          availableModules: modules,
        },
        message: 'حدد الوحدة (module) في query parameter',
      });
    }

    const userId = req.user?.userId || req.user?._id || req.user?.id;

    // Safely parse filters JSON
    let parsedFilters = {};
    if (filters) {
      try {
        parsedFilters = JSON.parse(filters);
      } catch {
        return res
          .status(400)
          .json({ success: false, message: 'صيغة الفلتر غير صالحة (JSON غير صحيح)' });
      }
    }

    const result = await importExportService.createExport({
      module: mod,
      format: format || 'xlsx',
      query: parsedFilters,
      fields: fields ? fields.split(',') : undefined,
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
    safeError(res, err, 'Export format error');
  }
});

module.exports = router;
