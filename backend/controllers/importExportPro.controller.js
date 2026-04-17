/**
 * ImportExport Pro Controller
 * ============================
 * وحدة تحكم الاستيراد والتصدير الاحترافية
 * Professional import/export controller with full CRUD
 *
 * @module controllers/importExportPro.controller
 */

const importExportService = require('../services/importExportPro.service');
const ImportExportJob = require('../models/ImportExportJob');
const ImportExportTemplate = require('../models/ImportExportTemplate');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// ─────────────────────────────────────────────────
// EXPORT ENDPOINTS
// ─────────────────────────────────────────────────

/**
 * POST /export
 * Create and execute an export job
 */
const createExport = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { module, format, fields, query, sort, dateRange, options, jobName } = req.body;

    if (!module) {
      return res.status(400).json({ success: false, message: 'الوحدة (module) مطلوبة' });
    }

    const result = await importExportService.createExport({
      module,
      format,
      fields,
      query,
      sort,
      dateRange,
      options,
      userId,
      jobName,
    });

    // Set download headers
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`
    );
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('X-Job-Id', result.job.jobId);

    return res.send(result.buffer);
  } catch (error) {
    safeError(res, error, '[ImportExport] Export error');
  }
};

/**
 * POST /export/preview
 * Preview export data without downloading
 */
const previewExport = async (req, res) => {
  try {
    const _userId = req.user?.userId || req.user?._id || req.user?.id;
    const { module, fields, query, dateRange } = req.body;

    if (!module) {
      return res.status(400).json({ success: false, message: 'الوحدة (module) مطلوبة' });
    }

    const modules = importExportService.getAvailableModules();
    const moduleInfo = modules.find(m => m.key === module);

    // Use internal method to fetch data
    const data = await importExportService._fetchModuleData(module, query, fields, null, dateRange);
    const preview = data.slice(0, 50);
    const moduleFields = await importExportService.getModuleFields(module);

    return res.json({
      success: true,
      data: {
        module: moduleInfo || { key: module },
        totalRecords: data.length,
        preview,
        fields: moduleFields,
        availableFormats: ['xlsx', 'csv', 'json', 'pdf', 'xml'],
      },
    });
  } catch (error) {
    safeError(res, error, '[ImportExport] Preview error');
  }
};

/**
 * POST /export/bulk
 * Export multiple modules as ZIP
 */
const bulkExport = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { modules, format, options } = req.body;

    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({ success: false, message: 'قائمة الوحدات مطلوبة' });
    }

    const result = await importExportService.bulkExport({ modules, format, options, userId });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`
    );
    res.setHeader('Content-Length', result.buffer.length);

    return res.send(result.buffer);
  } catch (error) {
    safeError(res, error, '[ImportExport] Bulk export error');
  }
};

// ─────────────────────────────────────────────────
// IMPORT ENDPOINTS
// ─────────────────────────────────────────────────

/**
 * POST /import/parse
 * Parse uploaded file and return preview + validation
 */
const parseImportFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'الملف مطلوب' });
    }

    const { module } = req.body;
    if (!module) {
      return res.status(400).json({ success: false, message: 'الوحدة (module) مطلوبة' });
    }

    let parsedOpts = {};
    try {
      if (req.body.options) parsedOpts = JSON.parse(req.body.options);
    } catch {
      /* ignore */
    }

    const result = await importExportService.parseImportFile({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      module,
      options: parsedOpts,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, '[ImportExport] Parse error');
  }
};

/**
 * POST /import/execute
 * Execute import with validated data and mappings
 */
const executeImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'الملف مطلوب' });
    }

    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { module, columnMappings, options, jobName } = req.body;

    if (!module) {
      return res.status(400).json({ success: false, message: 'الوحدة (module) مطلوبة' });
    }

    const parsedMappings = columnMappings ? JSON.parse(columnMappings) : [];
    const parsedOptions = options ? JSON.parse(options) : {};

    const result = await importExportService.executeImport({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      module,
      columnMappings: parsedMappings,
      options: parsedOptions,
      userId,
      jobName,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, '[ImportExport] Execute import error');
  }
};

/**
 * POST /import/validate
 * Validate import without executing (dry run)
 */
const validateImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'الملف مطلوب' });
    }

    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { module, columnMappings } = req.body;

    if (!module) {
      return res.status(400).json({ success: false, message: 'الوحدة (module) مطلوبة' });
    }

    const parsedMappings = columnMappings ? JSON.parse(columnMappings) : [];

    const result = await importExportService.executeImport({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      module,
      columnMappings: parsedMappings,
      options: { validateOnly: true },
      userId,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    safeError(res, error, '[ImportExport] Validation error');
  }
};

// ─────────────────────────────────────────────────
// TEMPLATE ENDPOINTS
// ─────────────────────────────────────────────────

/**
 * GET /templates
 * List all templates
 */
const listTemplates = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { module, type, page, limit } = req.query;

    const result = await importExportService.listTemplates({
      module,
      type,
      userId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * GET /templates/:id
 * Get template details
 */
const getTemplate = async (req, res) => {
  try {
    const template = await ImportExportTemplate.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    }

    return res.json({ success: true, data: template });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * POST /templates
 * Create a new template
 */
const createTemplate = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const template = await importExportService.createTemplate({ ...req.body, userId });

    return res.status(201).json({ success: true, data: template });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * PUT /templates/:id
 * Update a template
 */
const updateTemplate = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const template = await ImportExportTemplate.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { ...req.body, updatedBy: userId },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    }

    return res.json({ success: true, data: template });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * DELETE /templates/:id
 * Soft delete a template
 */
const deleteTemplate = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const template = await ImportExportTemplate.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, isActive: false, deletedAt: new Date(), updatedBy: userId },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    }

    return res.json({ success: true, message: 'تم حذف القالب بنجاح' });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * GET /templates/download/:module
 * Download import template file for a module
 */
const downloadTemplate = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { module } = req.params;
    const { format, templateId } = req.query;

    const result = await importExportService.generateImportTemplate({
      module,
      format: format || 'xlsx',
      templateId,
      userId,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`
    );
    res.setHeader('Content-Length', result.buffer.length);

    return res.send(result.buffer);
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

// ─────────────────────────────────────────────────
// JOB MANAGEMENT ENDPOINTS
// ─────────────────────────────────────────────────

/**
 * GET /jobs
 * List jobs with filters
 */
const listJobs = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { type, status, module, page, limit, search, from, to } = req.query;

    const result = await importExportService.getJobs({
      type,
      status,
      module,
      userId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      dateRange: from || to ? { from, to } : undefined,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * GET /jobs/:id
 * Get job details
 */
const getJob = async (req, res) => {
  try {
    const job = await importExportService.getJob(req.params.id);
    return res.json({ success: true, data: job });
  } catch (error) {
    return res.status(404).json({ success: false, message: safeError(error) });
  }
};

/**
 * POST /jobs/:id/cancel
 * Cancel a running job
 */
const cancelJob = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const job = await importExportService.cancelJob(req.params.id, userId);
    return res.json({ success: true, data: job, message: 'تم إلغاء المهمة' });
  } catch (error) {
    return res.status(400).json({ success: false, message: safeError(error) });
  }
};

/**
 * POST /jobs/:id/retry
 * Retry a failed job
 */
const retryJob = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const job = await importExportService.retryJob(req.params.id, userId);
    return res.json({ success: true, data: job, message: 'تم إنشاء مهمة إعادة المحاولة' });
  } catch (error) {
    return res.status(400).json({ success: false, message: safeError(error) });
  }
};

/**
 * DELETE /jobs/:id
 * Delete a job
 */
const deleteJob = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    await importExportService.deleteJob(req.params.id, userId);
    return res.json({ success: true, message: 'تم حذف المهمة' });
  } catch (error) {
    return res.status(400).json({ success: false, message: safeError(error) });
  }
};

// ─────────────────────────────────────────────────
// MODULES & FIELDS ENDPOINTS
// ─────────────────────────────────────────────────

/**
 * GET /modules
 * List available modules
 */
const listModules = async (req, res) => {
  try {
    const modules = importExportService.getAvailableModules();
    return res.json({ success: true, data: modules, count: modules.length });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * GET /modules/:module/fields
 * Get fields for a module
 */
const getModuleFields = async (req, res) => {
  try {
    const fields = await importExportService.getModuleFields(req.params.module);
    return res.json({ success: true, data: fields, count: fields.length });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

// ─────────────────────────────────────────────────
// STATISTICS ENDPOINT
// ─────────────────────────────────────────────────

/**
 * GET /statistics
 * Get import/export dashboard statistics
 */
const getStatistics = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { from, to } = req.query;

    const stats = await importExportService.getStatistics({
      userId,
      dateRange: from || to ? { from, to } : undefined,
    });

    return res.json({ success: true, data: stats });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * GET /download/:jobId
 * Download a previously exported file
 */
const downloadFile = async (req, res) => {
  try {
    const job = await ImportExportJob.findOne({
      jobId: req.params.jobId,
      type: 'export',
      status: 'completed',
    });

    if (!job || !job.file?.path) {
      return res.status(404).json({ success: false, message: 'الملف غير متاح' });
    }

    // Check expiry
    if (job.file.expiresAt && new Date() > job.file.expiresAt) {
      return res.status(410).json({ success: false, message: 'انتهت صلاحية الملف' });
    }

    res.setHeader('Content-Type', job.file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(job.file.originalName)}"`
    );

    // If file is stored on disk
    const fs = require('fs');
    if (fs.existsSync(job.file.path)) {
      return fs.createReadStream(job.file.path).pipe(res);
    }

    return res.status(404).json({ success: false, message: 'الملف غير موجود على الخادم' });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * GET /info
 * API info endpoint
 */
const getInfo = async (req, res) => {
  return res.json({
    success: true,
    data: {
      name: 'نظام الاستيراد والتصدير الاحترافي',
      nameEn: 'Professional Import/Export System',
      version: '2.0.0',
      features: [
        'تصدير متعدد الصيغ (Excel, CSV, JSON, PDF, XML, DOCX)',
        'استيراد مع المعاينة والتحقق',
        'ربط الأعمدة تلقائياً',
        'قوالب قابلة لإعادة الاستخدام',
        'تتبع المهام والتقدم',
        'تصدير شامل (ZIP)',
        'إحصائيات ولوحة معلومات',
        'بث التقدم المباشر (SSE)',
      ],
      featuresEn: [
        'Multi-format Export (Excel, CSV, JSON, PDF, XML, DOCX)',
        'Import with Preview & Validation',
        'Auto Column Mapping',
        'Reusable Templates',
        'Job Tracking & Progress',
        'Bulk Export (ZIP)',
        'Statistics & Dashboard',
        'Live Progress Streaming (SSE)',
      ],
      supportedFormats: {
        export: ['xlsx', 'csv', 'json', 'pdf', 'xml', 'docx', 'zip'],
        import: ['xlsx', 'xls', 'csv', 'json'],
      },
      endpoints: {
        export: 'POST /api/import-export-pro/export',
        preview: 'POST /api/import-export-pro/export/preview',
        bulkExport: 'POST /api/import-export-pro/export/bulk',
        parse: 'POST /api/import-export-pro/import/parse',
        execute: 'POST /api/import-export-pro/import/execute',
        validate: 'POST /api/import-export-pro/import/validate',
        templates: 'GET /api/import-export-pro/templates',
        jobs: 'GET /api/import-export-pro/jobs',
        modules: 'GET /api/import-export-pro/modules',
        statistics: 'GET /api/import-export-pro/statistics',
      },
    },
  });
};

// ─────────────────────────────────────────────────
// SCHEDULED EXPORTS ENDPOINTS
// ─────────────────────────────────────────────────

/**
 * POST /schedule
 * Create a scheduled export
 */
const createScheduledExport = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { module, format, fields, query, options, schedule, jobName } = req.body;

    if (!module || !schedule?.frequency) {
      return res.status(400).json({ success: false, message: 'الوحدة وتردد الجدول مطلوبان' });
    }

    const result = await importExportService.createScheduledExport({
      module,
      format,
      fields,
      query,
      options,
      schedule,
      userId,
      jobName,
    });

    return res
      .status(201)
      .json({ success: true, data: result, message: 'تم إنشاء التصدير المجدول' });
  } catch (error) {
    return res.status(400).json({ success: false, message: safeError(error) });
  }
};

/**
 * GET /schedule
 * List scheduled exports
 */
const listScheduledExports = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const result = await importExportService.listScheduledExports({ userId, ...req.query });
    return res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * POST /schedule/execute
 * Manually trigger scheduled exports execution
 */
const executeScheduledExports = async (req, res) => {
  try {
    const result = await importExportService.executeScheduledExports();
    return res.json({
      success: true,
      data: result,
      message: `تم تنفيذ ${result.executed} مهمة مجدولة`,
    });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * PUT /schedule/:id/toggle
 * Enable/disable a scheduled export
 */
const toggleScheduledExport = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { enabled } = req.body;
    const result = await importExportService.toggleScheduledExport(req.params.id, enabled, userId);
    return res.json({
      success: true,
      data: result,
      message: enabled ? 'تم تفعيل الجدول' : 'تم إيقاف الجدول',
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: safeError(error) });
  }
};

// ─────────────────────────────────────────────────
// DATA QUALITY ENDPOINT
// ─────────────────────────────────────────────────

/**
 * POST /import/quality-report
 * Generate data quality report for uploaded file
 */
const generateQualityReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'يرجى رفع ملف' });
    }

    const { module } = req.body;
    if (!module) {
      return res.status(400).json({ success: false, message: 'الوحدة مطلوبة' });
    }

    // Parse the file once — reuse raw data for both parse result and quality analysis
    const ext = require('path').extname(req.file.originalname).toLowerCase().replace('.', '');
    let rawData;
    switch (ext) {
      case 'xlsx':
      case 'xls':
        rawData = await importExportService._parseExcel(req.file.buffer, {});
        break;
      case 'csv':
        rawData = importExportService._parseCSV(req.file.buffer, {});
        break;
      case 'json':
        rawData = importExportService._parseJSON(req.file.buffer);
        break;
      default:
        rawData = [];
    }

    // Build parse info from raw data
    const detectedColumns = rawData.length > 0 ? Object.keys(rawData[0]) : [];
    const suggestedMappings = importExportService._suggestColumnMappings
      ? importExportService._suggestColumnMappings(detectedColumns, module)
      : [];

    const report = importExportService.generateDataQualityReport(
      rawData,
      suggestedMappings,
      module
    );

    return res.json({
      success: true,
      data: {
        ...report,
        parseInfo: {
          totalRows: rawData.length,
          detectedColumns,
          format: ext,
        },
      },
    });
  } catch (error) {
    safeError(res, error, 'importExportPro');
  }
};

/**
 * GET /transforms
 * List available data transformation rules
 */
const listTransformRules = async (req, res) => {
  return res.json({
    success: true,
    data: [
      { key: 'uppercase', label: 'تحويل لأحرف كبيرة', labelEn: 'Uppercase' },
      { key: 'lowercase', label: 'تحويل لأحرف صغيرة', labelEn: 'Lowercase' },
      { key: 'trim', label: 'إزالة المسافات', labelEn: 'Trim' },
      { key: 'capitalize', label: 'أحرف كبيرة في البداية', labelEn: 'Capitalize' },
      { key: 'titleCase', label: 'أحرف كبيرة لكل كلمة', labelEn: 'Title Case' },
      { key: 'normalizeSpaces', label: 'تنظيم المسافات', labelEn: 'Normalize Spaces' },
      { key: 'normalizeArabic', label: 'تنظيم الأحرف العربية', labelEn: 'Normalize Arabic' },
      { key: 'removeArabicDiacritics', label: 'إزالة التشكيل', labelEn: 'Remove Diacritics' },
      { key: 'saudiPhone', label: 'تنسيق هاتف سعودي (+966)', labelEn: 'Saudi Phone Format' },
      { key: 'cleanNumber', label: 'تنظيف الأرقام', labelEn: 'Clean Number' },
      { key: 'extractDigits', label: 'استخراج الأرقام فقط', labelEn: 'Extract Digits' },
      { key: 'currency_sar', label: 'تنسيق عملة (ريال)', labelEn: 'SAR Currency Format' },
      { key: 'booleanNormalize', label: 'تنظيم القيم المنطقية', labelEn: 'Normalize Boolean' },
      { key: 'dateFormat:ISO', label: 'تنسيق تاريخ ISO', labelEn: 'Date Format ISO' },
    ],
  });
};

/**
 * GET /progress/:jobId
 * Server-Sent Events (SSE) for live progress tracking
 */
const streamProgress = async (req, res) => {
  const { jobId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (eventName, data) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Poll job status every 1s
  let pollCount = 0;
  const maxPolls = 300; // 5 minutes max

  const interval = setInterval(async () => {
    try {
      pollCount++;
      const job = await ImportExportJob.findOne({ jobId }).lean();

      if (!job) {
        sendEvent('error', { message: 'المهمة غير موجودة' });
        clearInterval(interval);
        return res.end();
      }

      sendEvent('progress', {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        processingDetails: {
          startedAt: job.processingDetails?.startedAt,
          duration: job.processingDetails?.duration,
        },
      });

      // Done conditions
      if (['completed', 'failed', 'cancelled'].includes(job.status) || pollCount >= maxPolls) {
        sendEvent('done', {
          jobId: job.jobId,
          status: job.status,
          file: job.file
            ? {
                originalName: job.file.originalName,
                size: job.file.size,
                downloadUrl: job.file.downloadUrl,
              }
            : null,
          error: job.processingDetails?.errorMessage,
        });
        clearInterval(interval);
        return res.end();
      }
    } catch (error) {
      sendEvent('error', { message: error.message });
      clearInterval(interval);
      return res.end();
    }
  }, 1000);

  // Client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
};

module.exports = {
  createExport,
  previewExport,
  bulkExport,
  parseImportFile,
  executeImport,
  validateImport,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  downloadTemplate,
  listJobs,
  getJob,
  cancelJob,
  retryJob,
  deleteJob,
  listModules,
  getModuleFields,
  getStatistics,
  downloadFile,
  getInfo,
  // New endpoints
  createScheduledExport,
  listScheduledExports,
  executeScheduledExports,
  toggleScheduledExport,
  generateQualityReport,
  listTransformRules,
  streamProgress,
};
