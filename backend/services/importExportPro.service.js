/**
 * ImportExport Pro Service
 * ========================
 * خدمة الاستيراد والتصدير الاحترافية الشاملة
 * Professional comprehensive import/export service
 *
 * Features:
 * - Multi-format export (Excel, CSV, JSON, PDF, XML, ZIP)
 * - Multi-format import with validation & preview
 * - Column mapping & data transformation
 * - Progress tracking & batch processing
 * - Template management
 * - Scheduled exports
 * - Data validation engine
 * - Audit logging
 *
 * @module services/importExportPro.service
 */

const ExcelJS = require('exceljs');
const { parse: csvParse } = require('csv-parse/sync');
const { stringify: csvStringify } = require('csv-stringify/sync');
const mongoose = require('mongoose');
const _crypto = require('crypto');
const path = require('path');
const _fs = require('fs');
const archiver = require('archiver');
const logger = require('../utils/logger');

const ImportExportJob = require('../models/ImportExportJob');
const ImportExportTemplate = require('../models/ImportExportTemplate');
const { escapeRegex } = require('../utils/sanitize');

// ──────────────────────────────────────────────────────
// Module Registry + System Templates — extracted to ./importExport/
// (2026-05-23) Pure-data constants moved out to shrink the service file.
// ──────────────────────────────────────────────────────
const { MODULE_REGISTRY } = require('./importExport/module-registry');
const { SYSTEM_TEMPLATES } = require('./importExport/system-templates');
const formatters = require('./importExport/formatters');
const parsers = require('./importExport/parsers');
const dataQuality = require('./importExport/data-quality');

class ImportExportProService {
  // ─────────────────────────────────────────────────
  // EXPORT OPERATIONS
  // ─────────────────────────────────────────────────

  /**
   * Create and execute an export job
   */
  async createExport(params) {
    const {
      module,
      format = 'xlsx',
      fields,
      query = {},
      sort = { createdAt: -1 },
      dateRange,
      options = {},
      userId,
      jobName,
    } = params;

    // Create job record
    const job = new ImportExportJob({
      jobName: jobName || `تصدير ${MODULE_REGISTRY[module]?.label || module}`,
      jobNameAr: `تصدير ${MODULE_REGISTRY[module]?.label || module}`,
      type: 'export',
      format,
      dataSource: { module, model: MODULE_REGISTRY[module]?.model, query, fields, sort, dateRange },
      exportOptions: { ...options },
      status: 'processing',
      createdBy: userId,
      processingDetails: { startedAt: new Date() },
    });
    await job.save();

    try {
      // Fetch data
      const data = await this._fetchModuleData(module, query, fields, sort, dateRange);

      job.progress.total = data.length;

      // Generate file based on format
      let result;
      switch (format) {
        case 'xlsx':
          result = await formatters.exportToExcel(data, fields, module, options);
          break;
        case 'csv':
          result = await formatters.exportToCSV(data, fields, module, options);
          break;
        case 'json':
          result = await formatters.exportToJSON(data, fields, module, options);
          break;
        case 'pdf':
          result = await formatters.exportToPDF(data, fields, module, options);
          break;
        case 'xml':
          result = await formatters.exportToXML(data, fields, module, options);
          break;
        case 'docx':
          result = await formatters.exportToDOCX(data, fields, module, options);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Update job
      job.status = 'completed';
      job.progress.processed = data.length;
      job.progress.successful = data.length;
      job.progress.percentage = 100;

      // Persist buffer to disk so /download/:jobId can serve it later
      const fs = require('fs');
      const exportsDir = path.join(__dirname, '../exports');
      if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
      const storedName = `${job.jobId}_${result.fileName}`;
      const filePath = path.join(exportsDir, storedName);
      fs.writeFileSync(filePath, result.buffer);

      job.file = {
        originalName: result.fileName,
        storedName,
        path: filePath,
        size: result.size,
        mimeType: result.mimeType,
        downloadUrl: `/api/import-export-pro/download/${job.jobId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      };
      job.processingDetails.completedAt = new Date();
      job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
      await job.save();

      return {
        job: job.toObject(),
        buffer: result.buffer,
        fileName: result.fileName,
        mimeType: result.mimeType,
      };
    } catch (error) {
      job.status = 'failed';
      job.processingDetails.errorMessage = error.message;
      job.processingDetails.completedAt = new Date();
      job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
      await job.save();
      throw error;
    }
  }

  // ─────────────────────────────────────────────────
  // IMPORT OPERATIONS
  // ─────────────────────────────────────────────────

  /**
   * Parse uploaded file and return preview + validation
   */
  async parseImportFile(params) {
    const { fileBuffer, fileName, module, options = {} } = params;

    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    let rawData;

    switch (ext) {
      case 'xlsx':
      case 'xls':
        rawData = await parsers.parseExcel(fileBuffer, options);
        break;
      case 'csv':
        rawData = parsers.parseCSV(fileBuffer, options);
        break;
      case 'json':
        rawData = parsers.parseJSON(fileBuffer);
        break;
      default:
        throw new Error(`Unsupported import format: ${ext}`);
    }

    // Detect columns
    const detectedColumns = rawData.length > 0 ? Object.keys(rawData[0]) : [];

    // Auto-suggest column mappings
    const suggestedMappings = parsers.suggestColumnMappings(detectedColumns, module);

    // Preview data (first 20 rows)
    const preview = rawData.slice(0, 20);

    // Basic validation
    const validation = parsers.validateImportData(rawData, suggestedMappings, module);

    return {
      totalRows: rawData.length,
      detectedColumns,
      suggestedMappings,
      preview,
      validation,
      format: ext,
    };
  }

  /**
   * Execute import with validated data
   */
  async executeImport(params) {
    const { fileBuffer, fileName, module, columnMappings, options = {}, userId, jobName } = params;

    const ext = path.extname(fileName).toLowerCase().replace('.', '');

    // Parse file
    let rawData;
    switch (ext) {
      case 'xlsx':
      case 'xls':
        rawData = await parsers.parseExcel(fileBuffer, options);
        break;
      case 'csv':
        rawData = parsers.parseCSV(fileBuffer, options);
        break;
      case 'json':
        rawData = parsers.parseJSON(fileBuffer);
        break;
      default:
        throw new Error(`Unsupported import format: ${ext}`);
    }

    // Create job
    const job = new ImportExportJob({
      jobName: jobName || `استيراد ${MODULE_REGISTRY[module]?.label || module}`,
      jobNameAr: `استيراد ${MODULE_REGISTRY[module]?.label || module}`,
      type: 'import',
      format: ext === 'xls' ? 'xlsx' : ext,
      dataSource: { module, model: MODULE_REGISTRY[module]?.model },
      columnMappings: columnMappings || [],
      importOptions: { ...options },
      status: 'processing',
      progress: { total: rawData.length },
      createdBy: userId,
      file: { originalName: fileName, size: fileBuffer.length },
      processingDetails: { startedAt: new Date() },
    });
    await job.save();

    try {
      // Transform data using column mappings
      const transformedData = parsers.transformImportData(rawData, columnMappings);

      // Validate
      if (options.validateOnly) {
        const validation = parsers.validateImportData(transformedData, columnMappings, module);
        job.status = 'completed';
        job.validation = validation;
        job.progress.processed = rawData.length;
        job.progress.percentage = 100;
        job.processingDetails.completedAt = new Date();
        job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
        await job.save();
        return { job: job.toObject(), validation, dryRun: true };
      }

      // Get the model
      const Model = this._getModel(module);
      if (!Model) {
        throw new Error(`نموذج البيانات غير موجود للوحدة: ${module}`);
      }

      // Clean & enrich data if enabled
      const processedData =
        options.autoClean !== false
          ? dataQuality.cleanAndEnrichData(transformedData, module, {
              normalizeSpaces: true,
              removeEmpty: false,
            })
          : transformedData;

      // Batch insert/update with bulkWrite optimization
      const batchSize = options.batchSize || 200;
      const results = { inserted: [], updated: [], failed: [], skipped: [] };
      const useBulkWrite = options.mode === 'insert' || !options.duplicateCheckField;

      for (let i = 0; i < processedData.length; i += batchSize) {
        const batch = processedData.slice(i, i + batchSize);

        if (useBulkWrite && options.mode !== 'update') {
          // Fast path: use bulkWrite for pure inserts
          try {
            const ops = batch.map(record => ({
              insertOne: { document: record },
            }));
            const bulkResult = await Model.bulkWrite(ops, { ordered: false });
            const insertedCount = bulkResult.insertedCount || 0;

            for (let j = 0; j < insertedCount; j++) {
              results.inserted.push(i + j);
              job.progress.successful++;
            }

            // Handle write errors
            if (bulkResult.hasWriteErrors?.()) {
              for (const writeErr of bulkResult.getWriteErrors()) {
                const globalIdx = i + writeErr.index;
                if (writeErr.code === 11000 && options.skipDuplicates) {
                  results.skipped.push(globalIdx);
                  job.progress.skipped++;
                } else {
                  results.failed.push({ row: globalIdx + 1, error: writeErr.errmsg });
                  job.progress.failed++;
                }
              }
            }
          } catch (bulkErr) {
            // If bulkWrite itself throws, process individually
            if (bulkErr.writeErrors) {
              const successCount = batch.length - bulkErr.writeErrors.length;
              for (let j = 0; j < successCount; j++) {
                results.inserted.push(i + j);
                job.progress.successful++;
              }
              for (const writeErr of bulkErr.writeErrors) {
                const globalIdx = i + writeErr.index;
                if (writeErr.code === 11000 && options.skipDuplicates) {
                  results.skipped.push(globalIdx);
                  job.progress.skipped++;
                } else {
                  results.failed.push({
                    row: globalIdx + 1,
                    error: writeErr.errmsg || writeErr.message,
                  });
                  job.progress.failed++;
                }
              }
            } else {
              // Complete batch failure - fall back to one-by-one
              for (const [batchIdx, record] of batch.entries()) {
                const globalIdx = i + batchIdx;
                try {
                  const doc = new Model(record);
                  await doc.save();
                  results.inserted.push(doc._id);
                  job.progress.successful++;
                } catch (err) {
                  results.failed.push({ row: globalIdx + 1, error: err.message });
                  job.progress.failed++;
                }
              }
            }
          }
          job.progress.processed = Math.min(i + batch.length, processedData.length);
          job.progress.percentage = Math.round(
            (job.progress.processed / processedData.length) * 100
          );
        } else {
          // Upsert/update mode — process individually with duplicate checking
          for (const [batchIdx, record] of batch.entries()) {
            const globalIdx = i + batchIdx;
            try {
              if (options.mode === 'upsert' && options.duplicateCheckField) {
                const filter = {
                  [options.duplicateCheckField]: record[options.duplicateCheckField],
                };
                const existing = await Model.findOne(filter);
                if (existing) {
                  if (options.skipDuplicates) {
                    results.skipped.push(globalIdx);
                    job.progress.skipped++;
                  } else {
                    await Model.findOneAndUpdate(filter, record, { new: true });
                    results.updated.push(globalIdx);
                    job.progress.successful++;
                  }
                } else {
                  const doc = new Model(record);
                  await doc.save();
                  results.inserted.push(doc._id);
                  job.progress.successful++;
                }
              } else if (options.mode === 'update' && options.duplicateCheckField) {
                const filter = {
                  [options.duplicateCheckField]: record[options.duplicateCheckField],
                };
                const updated = await Model.findOneAndUpdate(filter, record, { new: true });
                if (updated) {
                  results.updated.push(updated._id);
                  job.progress.successful++;
                } else {
                  results.skipped.push(globalIdx);
                  job.progress.skipped++;
                }
              } else {
                const doc = new Model(record);
                await doc.save();
                results.inserted.push(doc._id);
                job.progress.successful++;
              }
            } catch (err) {
              results.failed.push({ row: globalIdx + 1, error: err.message });
              job.progress.failed++;
            }

            job.progress.processed = globalIdx + 1;
            job.progress.percentage = Math.round(((globalIdx + 1) / processedData.length) * 100);
          }
        }

        // Save progress periodically
        if (i % (batchSize * 3) === 0) {
          await job.save();
        }
      }

      // Finalize job
      job.status = job.progress.failed > 0 ? 'partial' : 'completed';
      job.results = {
        insertedIds: results.inserted,
        updatedIds: results.updated,
        failedRows: results.failed.map(f => f.row),
        summary: {
          inserted: results.inserted.length,
          updated: results.updated.length,
          failed: results.failed.length,
          skipped: results.skipped.length,
          errors: results.failed,
        },
      };
      job.processingDetails.completedAt = new Date();
      job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
      job.progress.percentage = 100;
      await job.save();

      return { job: job.toObject(), results: job.results.summary };
    } catch (error) {
      job.status = 'failed';
      job.processingDetails.errorMessage = error.message;
      job.processingDetails.completedAt = new Date();
      job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
      await job.save();
      throw error;
    }
  }

  // ─────────────────────────────────────────────────
  // TEMPLATE OPERATIONS
  // ─────────────────────────────────────────────────

  /**
   * Generate downloadable import template
   */
  async generateImportTemplate(params) {
    const { module, format = 'xlsx', templateId, userId } = params;

    let fields;

    if (templateId) {
      const template = await ImportExportTemplate.findById(templateId);
      if (!template) throw new Error('القالب غير موجود');
      fields = template.fields;
      template.usageCount++;
      template.lastUsedAt = new Date();
      template.lastUsedBy = userId;
      await template.save();
    } else {
      fields = SYSTEM_TEMPLATES[module] || this._generateDefaultFields(module);
    }

    if (format === 'xlsx') {
      return this._generateExcelTemplate(fields, module);
    } else if (format === 'csv') {
      return this._generateCSVTemplate(fields, module);
    }
    throw new Error(`Template format not supported: ${format}`);
  }

  /**
   * Generate Excel import template with validation and instructions
   */
  async _generateExcelTemplate(fields, module) {
    const workbook = new ExcelJS.Workbook();
    const moduleInfo = MODULE_REGISTRY[module] || { label: module, labelEn: module };

    // --- Instructions Sheet ---
    const instrSheet = workbook.addWorksheet('تعليمات - Instructions', {
      properties: { tabColor: { argb: 'FF4CAF50' } },
    });

    instrSheet.mergeCells('A1:F1');
    const instrTitle = instrSheet.getCell('A1');
    instrTitle.value = `تعليمات استيراد ${moduleInfo.label} — ${moduleInfo.labelEn} Import Instructions`;
    instrTitle.font = { size: 16, bold: true, color: { argb: 'FF1565C0' } };
    instrTitle.alignment = { horizontal: 'center' };
    instrSheet.getRow(1).height = 35;

    const instructions = [
      ['', '', '', '', '', ''],
      ['#', 'الحقل', 'Field', 'النوع', 'مطلوب؟', 'ملاحظات'],
    ];

    fields.forEach((f, i) => {
      instructions.push([
        i + 1,
        f.nameAr || f.name,
        f.name,
        f.dataType,
        f.required ? '✅ نعم' : '❌ لا',
        f.description || f.example || '',
      ]);
    });

    instructions.push(['', '', '', '', '', '']);
    instructions.push(['⚠️', 'لا تحذف صف العناوين', 'Do not delete the header row', '', '', '']);
    instructions.push(['⚠️', 'ابدأ البيانات من الصف 2', 'Start data from row 2', '', '', '']);
    instructions.push(['⚠️', 'حفظ بصيغة .xlsx', 'Save as .xlsx format', '', '', '']);

    instructions.forEach((row, i) => {
      const excelRow = instrSheet.getRow(i + 1);
      row.forEach((val, j) => {
        excelRow.getCell(j + 1).value = val;
      });
    });

    // Style header
    const instrHeader = instrSheet.getRow(3);
    instrHeader.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    });

    instrSheet.columns = [
      { width: 5 },
      { width: 25 },
      { width: 25 },
      { width: 12 },
      { width: 12 },
      { width: 30 },
    ];

    // --- Data Sheet ---
    const dataSheet = workbook.addWorksheet('البيانات - Data', {
      properties: { tabColor: { argb: 'FF2196F3' } },
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Header row
    const headerRow = dataSheet.getRow(1);
    fields.forEach((f, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = f.nameAr ? `${f.nameAr}\n${f.name}` : f.name;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: f.required ? 'FFD32F2F' : 'FF1976D2' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 40;

    // Set column widths
    fields.forEach((f, i) => {
      dataSheet.getColumn(i + 1).width = Math.max(15, (f.nameAr || f.name || '').length + 5);
    });

    // Add data validation for select fields
    fields.forEach((f, i) => {
      if (f.dataType === 'select' && f.options && f.options.length > 0) {
        for (let row = 2; row <= 1001; row++) {
          dataSheet.getCell(row, i + 1).dataValidation = {
            type: 'list',
            allowBlank: !f.required,
            formulae: [`"${f.options.join(',')}"`],
            showErrorMessage: true,
            errorTitle: 'قيمة غير صالحة',
            error: `الرجاء اختيار من: ${f.options.join(', ')}`,
          };
        }
      }
    });

    // Example row
    const exampleRow = dataSheet.getRow(2);
    fields.forEach((f, i) => {
      const cell = exampleRow.getCell(i + 1);
      cell.value = f.example || this._getExampleValue(f);
      cell.font = { italic: true, color: { argb: 'FF9E9E9E' } };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${module}_import_template_${Date.now()}.xlsx`;

    return {
      buffer: Buffer.from(buffer),
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.byteLength,
    };
  }

  /**
   * Generate CSV import template
   */
  async _generateCSVTemplate(fields, module) {
    const headers = fields.map(f => (f.nameAr ? `${f.nameAr} (${f.name})` : f.name));
    const example = fields.map(f => f.example || this._getExampleValue(f));

    const csvContent = csvStringify([headers, example], { bom: true });
    const buffer = Buffer.from(csvContent, 'utf-8');

    return {
      buffer,
      fileName: `${module}_import_template_${Date.now()}.csv`,
      mimeType: 'text/csv; charset=utf-8',
      size: buffer.length,
    };
  }

  /**
   * Create a custom template
   */
  async createTemplate(params) {
    const { name, nameAr, description, module, type, fields, options, userId } = params;

    const template = new ImportExportTemplate({
      name,
      nameAr,
      description,
      module,
      type: type || 'both',
      fields,
      defaultExportOptions: options?.export || {},
      defaultImportOptions: options?.import || {},
      createdBy: userId,
    });

    await template.save();
    return template;
  }

  /**
   * List templates for a module
   */
  async listTemplates(params) {
    const { module, type, userId, page = 1, limit = 20 } = params;
    const query = { isActive: true, isDeleted: false };

    if (module) query.module = module;
    if (type) query.type = { $in: [type, 'both'] };
    if (userId) {
      query.$or = [{ isPublic: true }, { isSystem: true }, { createdBy: userId }];
    }

    const [templates, total] = await Promise.all([
      ImportExportTemplate.find(query)
        .sort({ isSystem: -1, usageCount: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ImportExportTemplate.countDocuments(query),
    ]);

    return { templates, total, page, pages: Math.ceil(total / limit) };
  }

  // ─────────────────────────────────────────────────
  // JOB MANAGEMENT
  // ─────────────────────────────────────────────────

  /**
   * Get job list with filters
   */
  async getJobs(params) {
    const { type, status, module, userId, page = 1, limit = 20, search, dateRange } = params;
    const query = { isDeleted: false };

    if (type) query.type = type;
    if (status) query.status = status;
    if (module) query['dataSource.module'] = module;
    if (userId) query.createdBy = userId;
    if (search) {
      query.$or = [
        { jobName: { $regex: escapeRegex(search), $options: 'i' } },
        { jobNameAr: { $regex: escapeRegex(search), $options: 'i' } },
        { jobId: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (dateRange) {
      query.createdAt = {};
      if (dateRange.from) query.createdAt.$gte = new Date(dateRange.from);
      if (dateRange.to) query.createdAt.$lte = new Date(dateRange.to);
    }

    const [jobs, total] = await Promise.all([
      ImportExportJob.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name email')
        .lean(),
      ImportExportJob.countDocuments(query),
    ]);

    return { jobs, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Get single job details
   */
  async getJob(jobId) {
    const job = await ImportExportJob.findOne({
      $or: [{ _id: jobId }, { jobId: jobId }],
      isDeleted: false,
    })
      .populate('createdBy', 'name email')
      .populate('template', 'name nameAr module')
      .lean();

    if (!job) throw new Error('المهمة غير موجودة');
    return job;
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId, userId) {
    const job = await ImportExportJob.findOne({
      $or: [{ _id: jobId }, { jobId: jobId }],
      status: { $in: ['pending', 'processing', 'queued'] },
    });

    if (!job) throw new Error('المهمة غير موجودة أو لا يمكن إلغاؤها');

    job.status = 'cancelled';
    job.updatedBy = userId;
    job.processingDetails.completedAt = new Date();
    await job.save();

    return job;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId, userId) {
    const original = await ImportExportJob.findOne({
      $or: [{ _id: jobId }, { jobId: jobId }],
      status: 'failed',
    }).lean();

    if (!original) throw new Error('المهمة غير موجودة أو لم تفشل');

    // Create a new retry job
    const retryJob = new ImportExportJob({
      ...original,
      _id: undefined,
      jobId: undefined,
      status: 'pending',
      progress: { total: 0, processed: 0, successful: 0, failed: 0, skipped: 0, percentage: 0 },
      processingDetails: { retryCount: (original.processingDetails?.retryCount || 0) + 1 },
      createdBy: userId,
      createdAt: undefined,
      updatedAt: undefined,
    });
    await retryJob.save();

    return retryJob;
  }

  /**
   * Delete a job (soft delete)
   */
  async deleteJob(jobId, userId) {
    const job = await ImportExportJob.findOne({
      $or: [{ _id: jobId }, { jobId: jobId }],
    });

    if (!job) throw new Error('المهمة غير موجودة');

    job.isDeleted = true;
    job.deletedAt = new Date();
    job.deletedBy = userId;
    await job.save();

    return { success: true };
  }

  // ─────────────────────────────────────────────────
  // STATISTICS & ANALYTICS
  // ─────────────────────────────────────────────────

  /**
   * Get comprehensive dashboard statistics
   */
  async getStatistics(params = {}) {
    const { userId, dateRange } = params;
    const match = { isDeleted: false };

    if (userId) match.createdBy = new mongoose.Types.ObjectId(userId);
    if (dateRange) {
      match.createdAt = {};
      if (dateRange.from) match.createdAt.$gte = new Date(dateRange.from);
      if (dateRange.to) match.createdAt.$lte = new Date(dateRange.to);
    }

    const [stats] = await ImportExportJob.aggregate([
      { $match: match },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalJobs: { $sum: 1 },
                totalExports: { $sum: { $cond: [{ $eq: ['$type', 'export'] }, 1, 0] } },
                totalImports: { $sum: { $cond: [{ $eq: ['$type', 'import'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                totalRowsProcessed: { $sum: '$progress.processed' },
                avgDuration: { $avg: '$processingDetails.duration' },
                totalFileSize: { $sum: '$file.size' },
              },
            },
          ],
          byFormat: [{ $group: { _id: '$format', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          byModule: [
            { $group: { _id: '$dataSource.module', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          dailyTrend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: -1 } },
            { $limit: 30 },
          ],
          recentJobs: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                jobId: 1,
                jobName: 1,
                type: 1,
                format: 1,
                status: 1,
                progress: 1,
                createdAt: 1,
                'dataSource.module': 1,
              },
            },
          ],
          topModules: [
            {
              $group: {
                _id: '$dataSource.module',
                exports: { $sum: { $cond: [{ $eq: ['$type', 'export'] }, 1, 0] } },
                imports: { $sum: { $cond: [{ $eq: ['$type', 'import'] }, 1, 0] } },
                total: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    return {
      overview: stats.overview[0] || {
        totalJobs: 0,
        totalExports: 0,
        totalImports: 0,
        completed: 0,
        failed: 0,
        totalRowsProcessed: 0,
        avgDuration: 0,
        totalFileSize: 0,
      },
      byFormat: stats.byFormat,
      byModule: stats.byModule,
      byStatus: stats.byStatus,
      dailyTrend: stats.dailyTrend,
      recentJobs: stats.recentJobs,
      topModules: stats.topModules,
    };
  }

  // ─────────────────────────────────────────────────
  // MODULE OPERATIONS
  // ─────────────────────────────────────────────────

  /**
   * Get available modules for import/export
   */
  getAvailableModules() {
    return Object.entries(MODULE_REGISTRY).map(([key, info]) => ({
      key,
      label: info.label,
      labelEn: info.labelEn,
      model: info.model,
      hasTemplate: !!SYSTEM_TEMPLATES[key],
    }));
  }

  /**
   * Get fields for a module
   */
  async getModuleFields(module) {
    // Try system templates first
    if (SYSTEM_TEMPLATES[module]) {
      return SYSTEM_TEMPLATES[module];
    }

    // Try to introspect model
    const Model = this._getModel(module);
    if (Model && Model.schema) {
      const fields = [];
      const paths = Model.schema.paths;
      for (const [key, schemaType] of Object.entries(paths)) {
        if (key.startsWith('_') || key === '__v') continue;
        fields.push({
          key,
          name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          nameAr: key,
          dataType: this._mongooseTypeToDataType(schemaType.instance),
          required: !!schemaType.isRequired,
        });
      }
      return fields;
    }

    return [];
  }

  // ─────────────────────────────────────────────────
  // BULK EXPORT (ZIP)
  // ─────────────────────────────────────────────────

  /**
   * Export multiple modules as a ZIP bundle
   */
  async bulkExport(params) {
    const { modules, format = 'xlsx', options = {}, userId } = params;

    const job = new ImportExportJob({
      jobName: `تصدير شامل - ${modules.length} وحدات`,
      type: 'export',
      format: 'zip',
      dataSource: { module: 'bulk', query: { modules } },
      status: 'processing',
      createdBy: userId,
      processingDetails: { startedAt: new Date() },
    });
    await job.save();

    try {
      const buffers = [];

      for (const mod of modules) {
        try {
          const result = await this.createExport({
            module: mod,
            format,
            options,
            userId,
            jobName: `تصدير ${MODULE_REGISTRY[mod]?.label || mod}`,
          });
          buffers.push({ name: result.fileName, buffer: result.buffer });
        } catch (err) {
          logger.error(`Bulk export: Failed to export ${mod}:`, err.message);
        }
      }

      // Create ZIP
      const zipBuffer = await this._createZip(buffers);
      const fileName = `bulk_export_${Date.now()}.zip`;

      job.status = 'completed';
      job.progress = {
        total: modules.length,
        processed: buffers.length,
        successful: buffers.length,
        percentage: 100,
      };
      job.file = {
        originalName: fileName,
        size: zipBuffer.length,
        mimeType: 'application/zip',
        downloadUrl: `/api/import-export-pro/download/${job.jobId}`,
      };
      job.processingDetails.completedAt = new Date();
      job.processingDetails.duration = Date.now() - job.processingDetails.startedAt.getTime();
      await job.save();

      return { job: job.toObject(), buffer: zipBuffer, fileName, mimeType: 'application/zip' };
    } catch (error) {
      job.status = 'failed';
      job.processingDetails.errorMessage = error.message;
      await job.save();
      throw error;
    }
  }

  // ─────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────

  /**
   * Fetch data from a module
   */
  async _fetchModuleData(module, query = {}, fields, sort, dateRange) {
    const Model = this._getModel(module);

    if (!Model) {
      // Warn instead of silently returning empty — helps diagnose missing model issues
      logger.warn(
        `[ImportExportPro] Module "${module}" has no active Mongoose model — returning empty data`
      );
      return [];
    }

    const mongoQuery = { ...query };

    // Apply date range
    if (dateRange && dateRange.field) {
      mongoQuery[dateRange.field] = {};
      if (dateRange.from) mongoQuery[dateRange.field].$gte = new Date(dateRange.from);
      if (dateRange.to) mongoQuery[dateRange.field].$lte = new Date(dateRange.to);
    }

    // Build projection
    const projection = {};
    if (fields && fields.length > 0) {
      fields.forEach(f => {
        projection[f] = 1;
      });
    }

    const data = await Model.find(mongoQuery)
      .select(Object.keys(projection).length > 0 ? projection : undefined)
      .sort(sort || { createdAt: -1 })
      .limit(50000)
      .lean();

    return data;
  }

  /**
   * Get Mongoose model safely
   */
  _getModel(module) {
    try {
      const modelName = MODULE_REGISTRY[module]?.model;
      if (!modelName) return null;
      return mongoose.model(modelName);
    } catch {
      return null;
    }
  }

  /**
   * Map Mongoose type to our data type
   */
  _mongooseTypeToDataType(instance) {
    const map = {
      String: 'string',
      Number: 'number',
      Date: 'date',
      Boolean: 'boolean',
      ObjectID: 'string',
      Mixed: 'string',
    };
    return map[instance] || 'string';
  }

  /**
   * Get example value for template field
   */
  _getExampleValue(field) {
    switch (field.dataType) {
      case 'string':
        return 'مثال / Example';
      case 'number':
        return '100';
      case 'date':
        return '2026-01-01';
      case 'boolean':
        return 'true';
      case 'email':
        return 'example@domain.com';
      case 'phone':
        return '966501234567';
      case 'currency':
        return '5000.00';
      case 'select':
        return (field.options && field.options[0]) || '';
      default:
        return '';
    }
  }

  /**
   * Generate default fields from model introspection
   */
  _generateDefaultFields(module) {
    const Model = this._getModel(module);
    if (!Model || !Model.schema) return [];

    return Object.entries(Model.schema.paths)
      .filter(([key]) => !key.startsWith('_') && key !== '__v')
      .slice(0, 20)
      .map(([key, schemaType]) => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        nameAr: key,
        dataType: this._mongooseTypeToDataType(schemaType.instance),
        required: !!schemaType.isRequired,
      }));
  }

  // ─────────────────────────────────────────────────
  // SCHEDULED EXPORTS
  // ─────────────────────────────────────────────────

  /**
   * Create a scheduled export job
   */
  async createScheduledExport(params) {
    const {
      module,
      format = 'xlsx',
      fields,
      query,
      options = {},
      schedule,
      userId,
      jobName,
    } = params;

    if (!schedule || !schedule.frequency) {
      throw new Error('جدول التصدير مطلوب (frequency)');
    }

    const moduleInfo = MODULE_REGISTRY[module];
    if (!moduleInfo) throw new Error(`وحدة غير معروفة: ${module}`);

    const job = new ImportExportJob({
      jobName: jobName || `تصدير مجدول - ${moduleInfo.label}`,
      jobNameAr: `تصدير مجدول - ${moduleInfo.label}`,
      type: 'export',
      format,
      dataSource: { module, model: moduleInfo.model, query, fields },
      exportOptions: { ...options },
      schedule: {
        enabled: true,
        frequency: schedule.frequency,
        cronExpression: this._frequencyToCron(schedule.frequency, schedule.time || '06:00'),
        timezone: schedule.timezone || 'Asia/Riyadh',
        nextRunAt: this._getNextRunDate(schedule.frequency, schedule.time || '06:00'),
        maxRuns: schedule.maxRuns || 0,
      },
      status: 'scheduled',
      createdBy: userId,
    });

    await job.save();
    return job.toObject();
  }

  /**
   * List scheduled export jobs
   */
  async listScheduledExports(params = {}) {
    const { userId, page = 1, limit = 20 } = params;
    const query = { 'schedule.enabled': true, isDeleted: false };
    if (userId) query.createdBy = userId;

    const [jobs, total] = await Promise.all([
      ImportExportJob.find(query)
        .sort({ 'schedule.nextRunAt': 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ImportExportJob.countDocuments(query),
    ]);

    return { jobs, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Execute all due scheduled exports
   */
  async executeScheduledExports() {
    const now = new Date();
    const dueJobs = await ImportExportJob.find({
      'schedule.enabled': true,
      'schedule.nextRunAt': { $lte: now },
      status: { $in: ['scheduled', 'completed', 'partial'] },
      isDeleted: false,
    });

    const results = [];
    for (const job of dueJobs) {
      try {
        // Check max runs
        if (job.schedule.maxRuns > 0 && (job.schedule.runCount || 0) >= job.schedule.maxRuns) {
          job.schedule.enabled = false;
          job.status = 'completed';
          await job.save();
          continue;
        }

        // Execute the export
        const _exportResult = await this.createExport({
          module: job.dataSource.module,
          format: job.format,
          fields: job.dataSource.fields,
          query: job.dataSource.query,
          options: job.exportOptions || {},
          userId: job.createdBy,
          jobName: `${job.jobName} (تشغيل #${(job.schedule.runCount || 0) + 1})`,
        });

        // Update schedule
        job.schedule.lastRunAt = now;
        job.schedule.runCount = (job.schedule.runCount || 0) + 1;
        job.schedule.nextRunAt = this._getNextRunDate(job.schedule.frequency, null, now);
        job.status = 'scheduled';
        await job.save();

        results.push({ jobId: job.jobId, status: 'success', module: job.dataSource.module });
      } catch (error) {
        job.schedule.lastRunAt = now;
        job.schedule.nextRunAt = this._getNextRunDate(job.schedule.frequency, null, now);
        await job.save();
        results.push({ jobId: job.jobId, status: 'failed', error: error.message });
      }
    }

    return { executed: results.length, results };
  }

  /**
   * Toggle scheduled export on/off
   */
  async toggleScheduledExport(jobId, enabled, userId) {
    const job = await ImportExportJob.findOne({
      $or: [{ _id: jobId }, { jobId: jobId }],
      isDeleted: false,
    });
    if (!job) throw new Error('المهمة المجدولة غير موجودة');
    job.schedule.enabled = enabled;
    if (enabled) {
      job.schedule.nextRunAt = this._getNextRunDate(job.schedule.frequency);
      job.status = 'scheduled';
    } else {
      job.status = 'cancelled';
    }
    job.updatedBy = userId;
    await job.save();
    return job.toObject();
  }

  /**
   * Convert frequency to cron expression
   */
  _frequencyToCron(frequency, time = '06:00') {
    const [hours, minutes] = time.split(':').map(Number);
    switch (frequency) {
      case 'hourly':
        return `0 * * * *`;
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        return `${minutes} ${hours} * * 0`; // Sunday
      case 'monthly':
        return `${minutes} ${hours} 1 * *`; // 1st of month
      case 'quarterly':
        return `${minutes} ${hours} 1 */3 *`;
      default:
        return `${minutes} ${hours} * * *`;
    }
  }

  /**
   * Calculate next run date from frequency
   */
  _getNextRunDate(frequency, time, fromDate) {
    const now = fromDate || new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'hourly':
        next.setHours(next.getHours() + 1, 0, 0, 0);
        break;
      case 'daily':
        next.setDate(next.getDate() + 1);
        if (time) {
          const [h, m] = time.split(':').map(Number);
          next.setHours(h, m, 0, 0);
        }
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        if (time) {
          const [h, m] = time.split(':').map(Number);
          next.setHours(h, m, 0, 0);
        }
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1, 1);
        if (time) {
          const [h, m] = time.split(':').map(Number);
          next.setHours(h, m, 0, 0);
        }
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3, 1);
        if (time) {
          const [h, m] = time.split(':').map(Number);
          next.setHours(h, m, 0, 0);
        }
        break;
      default:
        next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Create ZIP from file buffers
   */
  _createZip(files) {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks = [];

      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      files.forEach(file => {
        archive.append(file.buffer, { name: file.name });
      });

      archive.finalize();
    });
  }
}

module.exports = new ImportExportProService();
