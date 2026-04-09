/**
 * Document Import/Export Service — خدمة استيراد وتصدير المستندات
 * ──────────────────────────────────────────────────────────────
 * استيراد/تصدير دفعي، تحويل الصيغ، حزم المستندات،
 * تصدير مع البيانات الوصفية، استيراد من أنظمة خارجية
 *
 * @module documentImportExport.service
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── Import/Export Job Model ────────────────────────────────── */
const importExportJobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['import', 'export'],
      required: true,
    },
    format: {
      type: String,
      enum: ['json', 'csv', 'xml', 'zip', 'xlsx', 'pdf_bundle'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    source: {
      type: {
        type: String,
        enum: ['file', 'url', 'system', 'api'],
      },
      path: String,
      systemName: String,
    },
    options: {
      includeMetadata: { type: Boolean, default: true },
      includeVersions: { type: Boolean, default: false },
      includeAttachments: { type: Boolean, default: true },
      includeComments: { type: Boolean, default: false },
      includeAuditTrail: { type: Boolean, default: false },
      preserveIds: { type: Boolean, default: false },
      overwriteExisting: { type: Boolean, default: false },
      mapping: { type: mongoose.Schema.Types.Mixed },
      filters: { type: mongoose.Schema.Types.Mixed },
      encryption: { type: Boolean, default: false },
      password: String,
    },
    progress: {
      total: { type: Number, default: 0 },
      processed: { type: Number, default: 0 },
      succeeded: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
    errors: [
      {
        index: Number,
        documentId: String,
        error: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    result: {
      fileUrl: String,
      fileSize: Number,
      documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
      summary: mongoose.Schema.Types.Mixed,
    },
    startedAt: Date,
    completedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'import_export_jobs' }
);

importExportJobSchema.index({ type: 1, status: 1 });
importExportJobSchema.index({ createdBy: 1, createdAt: -1 });

const ImportExportJob =
  mongoose.models.ImportExportJob || mongoose.model('ImportExportJob', importExportJobSchema);

/* ─── Field Mapping Template Model ───────────────────────────── */
const fieldMappingSchema = new mongoose.Schema(
  {
    name: String,
    nameAr: String,
    sourceSystem: String,
    mappings: [
      {
        sourceField: String,
        targetField: String,
        transform: {
          type: String,
          enum: [
            'none',
            'uppercase',
            'lowercase',
            'trim',
            'date_format',
            'number',
            'lookup',
            'concat',
            'split',
          ],
          default: 'none',
        },
        transformConfig: mongoose.Schema.Types.Mixed,
        required: { type: Boolean, default: false },
        defaultValue: String,
      },
    ],
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'field_mappings' }
);

const FieldMapping =
  mongoose.models.FieldMapping || mongoose.model('FieldMapping', fieldMappingSchema);

/* ─── Default Mappings ───────────────────────────────────────── */
const DEFAULT_MAPPINGS = [
  {
    name: 'Standard CSV',
    nameAr: 'CSV قياسي',
    sourceSystem: 'csv',
    mappings: [
      { sourceField: 'title', targetField: 'title', transform: 'trim', required: true },
      { sourceField: 'description', targetField: 'description', transform: 'trim' },
      { sourceField: 'category', targetField: 'category', transform: 'lowercase' },
      { sourceField: 'type', targetField: 'documentType', transform: 'lowercase' },
      { sourceField: 'date', targetField: 'createdAt', transform: 'date_format' },
      {
        sourceField: 'tags',
        targetField: 'tags',
        transform: 'split',
        transformConfig: { separator: ',' },
      },
      { sourceField: 'department', targetField: 'department', transform: 'trim' },
    ],
    isDefault: true,
  },
  {
    name: 'SharePoint Import',
    nameAr: 'استيراد من شيربوينت',
    sourceSystem: 'sharepoint',
    mappings: [
      { sourceField: 'Name', targetField: 'title', transform: 'trim', required: true },
      { sourceField: 'FileLeafRef', targetField: 'fileName', transform: 'none' },
      { sourceField: 'ContentType', targetField: 'documentType', transform: 'lowercase' },
      { sourceField: 'Created', targetField: 'createdAt', transform: 'date_format' },
      { sourceField: 'Modified', targetField: 'updatedAt', transform: 'date_format' },
      { sourceField: 'Author', targetField: 'createdByName', transform: 'trim' },
    ],
    isDefault: true,
  },
];

/* ─── Service ────────────────────────────────────────────────── */
class DocumentImportExportService {
  constructor() {
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    for (const m of DEFAULT_MAPPINGS) {
      await FieldMapping.findOneAndUpdate(
        { name: m.name, isDefault: true },
        { $setOnInsert: m },
        { upsert: true }
      );
    }
    this._initialized = true;
  }

  /* ─── Export Documents ────────────────────────────────────── */
  async exportDocuments(options = {}) {
    const {
      documentIds,
      filters,
      format = 'json',
      includeMetadata = true,
      includeVersions = false,
      includeAttachments = true,
      userId,
    } = options;

    const job = new ImportExportJob({
      type: 'export',
      format,
      status: 'processing',
      options: { includeMetadata, includeVersions, includeAttachments, filters },
      startedAt: new Date(),
      createdBy: userId,
    });
    await job.save();

    try {
      const Document = mongoose.models.Document || mongoose.model('Document');
      const query = documentIds?.length ? { _id: { $in: documentIds } } : filters || {};
      const docs = await Document.find(query).lean();

      job.progress.total = docs.length;

      const exportData = [];
      for (const doc of docs) {
        try {
          const exported = this._prepareExportDoc(doc, {
            includeMetadata,
            includeVersions,
            includeAttachments,
          });
          exportData.push(exported);
          job.progress.succeeded++;
        } catch (err) {
          job.progress.failed++;
          job.errors.push({
            documentId: doc._id?.toString(),
            error: err.message,
          });
        }
        job.progress.processed++;
      }

      let output;
      switch (format) {
        case 'csv':
          output = this._toCSV(exportData);
          break;
        case 'xml':
          output = this._toXML(exportData);
          break;
        default:
          output = exportData;
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.result = {
        documentIds: docs.map(d => d._id),
        summary: {
          total: docs.length,
          exported: exportData.length,
          format,
        },
      };
      await job.save();

      return {
        success: true,
        jobId: job._id,
        data: output,
        format,
        count: exportData.length,
      };
    } catch (err) {
      job.status = 'failed';
      job.errors.push({ error: err.message });
      await job.save();
      return { success: false, error: err.message, jobId: job._id };
    }
  }

  _prepareExportDoc(doc, opts) {
    const exported = {
      title: doc.title,
      description: doc.description,
      category: doc.category,
      documentType: doc.documentType,
      status: doc.status,
      tags: doc.tags,
      department: doc.department,
    };
    if (opts.includeMetadata) {
      exported.metadata = {
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        version: doc.version,
      };
    }
    return exported;
  }

  _toCSV(data) {
    if (!data.length) return '';
    const headers = Object.keys(this._flattenObject(data[0]));
    const rows = data.map(d => {
      const flat = this._flattenObject(d);
      return headers
        .map(h => {
          const v = flat[h];
          if (v === undefined || v === null) return '';
          const str = String(v);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }

  _toXML(data) {
    const escapeXml = s =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<documents>\n';
    for (const doc of data) {
      xml += '  <document>\n';
      for (const [key, val] of Object.entries(doc)) {
        if (typeof val === 'object' && val !== null) {
          xml += `    <${key}>\n`;
          for (const [k, v] of Object.entries(val)) {
            xml += `      <${k}>${escapeXml(v)}</${k}>\n`;
          }
          xml += `    </${key}>\n`;
        } else {
          xml += `    <${key}>${escapeXml(val)}</${key}>\n`;
        }
      }
      xml += '  </document>\n';
    }
    xml += '</documents>';
    return xml;
  }

  _flattenObject(obj, prefix = '') {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        Object.assign(result, this._flattenObject(val, newKey));
      } else if (Array.isArray(val)) {
        result[newKey] = val.join('; ');
      } else {
        result[newKey] = val;
      }
    }
    return result;
  }

  /* ─── Import Documents ────────────────────────────────────── */
  async importDocuments(options = {}) {
    const { data, format = 'json', mappingId, overwriteExisting = false, userId } = options;
    await this.init();

    const job = new ImportExportJob({
      type: 'import',
      format,
      status: 'processing',
      options: { overwriteExisting },
      startedAt: new Date(),
      createdBy: userId,
    });
    await job.save();

    try {
      let records;
      switch (format) {
        case 'csv':
          records = this._parseCSV(data);
          break;
        case 'xml':
          records = this._parseSimpleXML(data);
          break;
        default:
          records = Array.isArray(data) ? data : [data];
      }

      // Apply mapping
      let mapping = null;
      if (mappingId) {
        mapping = await FieldMapping.findById(mappingId).lean();
      }

      job.progress.total = records.length;
      const Document = mongoose.models.Document || mongoose.model('Document');
      const importedIds = [];

      for (let i = 0; i < records.length; i++) {
        try {
          let record = records[i];
          if (mapping) {
            record = this._applyMapping(record, mapping.mappings);
          }

          if (!record.title) {
            job.progress.skipped++;
            job.errors.push({ index: i, error: 'عنوان المستند مطلوب' });
            continue;
          }

          if (overwriteExisting) {
            const existing = await Document.findOne({ title: record.title });
            if (existing) {
              await Document.findByIdAndUpdate(existing._id, { $set: record });
              importedIds.push(existing._id);
              job.progress.succeeded++;
              job.progress.processed++;
              continue;
            }
          }

          const doc = new Document({ ...record, createdBy: userId });
          await doc.save();
          importedIds.push(doc._id);
          job.progress.succeeded++;
        } catch (err) {
          job.progress.failed++;
          job.errors.push({ index: i, error: err.message });
        }
        job.progress.processed++;
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.result = {
        documentIds: importedIds,
        summary: { total: records.length, imported: importedIds.length },
      };
      await job.save();

      return {
        success: true,
        jobId: job._id,
        imported: importedIds.length,
        total: records.length,
        errors: job.errors,
      };
    } catch (err) {
      job.status = 'failed';
      job.errors.push({ error: err.message });
      await job.save();
      return { success: false, error: err.message, jobId: job._id };
    }
  }

  _parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const record = {};
      headers.forEach((h, i) => {
        record[h] = values[i] || '';
      });
      return record;
    });
  }

  _parseSimpleXML(xmlText) {
    // Simple XML parser for document elements
    const docs = [];
    const docMatches = xmlText.match(/<document>([\s\S]*?)<\/document>/g) || [];
    for (const dm of docMatches) {
      const doc = {};
      const fieldMatches = dm.match(/<(\w+)>([\s\S]*?)<\/\1>/g) || [];
      for (const fm of fieldMatches) {
        const m = fm.match(/<(\w+)>([\s\S]*?)<\/\1>/);
        if (m && m[1] !== 'document') doc[m[1]] = m[2].trim();
      }
      docs.push(doc);
    }
    return docs;
  }

  _applyMapping(record, mappings) {
    const result = {};
    for (const m of mappings) {
      let value = record[m.sourceField];
      if (value === undefined && m.defaultValue !== undefined) value = m.defaultValue;
      if (value === undefined) continue;
      if (m.required && !value) continue;

      switch (m.transform) {
        case 'uppercase':
          value = String(value).toUpperCase();
          break;
        case 'lowercase':
          value = String(value).toLowerCase();
          break;
        case 'trim':
          value = String(value).trim();
          break;
        case 'number':
          value = Number(value) || 0;
          break;
        case 'date_format':
          value = new Date(value);
          break;
        case 'split':
          value = String(value)
            .split(m.transformConfig?.separator || ',')
            .map(s => s.trim());
          break;
        case 'concat':
          value = (m.transformConfig?.fields || [])
            .map(f => record[f] || '')
            .join(m.transformConfig?.separator || ' ');
          break;
      }
      result[m.targetField] = value;
    }
    return result;
  }

  /* ─── Job Management ──────────────────────────────────────── */
  async getJobs(options = {}) {
    const { type, status, page = 1, limit = 20, userId } = options;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (userId) filter.createdBy = userId;

    const [jobs, total] = await Promise.all([
      ImportExportJob.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ImportExportJob.countDocuments(filter),
    ]);

    return { success: true, jobs, total, page, limit };
  }

  async getJob(jobId) {
    const job = await ImportExportJob.findById(jobId).lean();
    if (!job) return { success: false, error: 'المهمة غير موجودة' };
    return { success: true, job };
  }

  async cancelJob(jobId) {
    const job = await ImportExportJob.findOneAndUpdate(
      { _id: jobId, status: { $in: ['pending', 'processing'] } },
      { $set: { status: 'cancelled' } },
      { new: true }
    );
    if (!job) return { success: false, error: 'المهمة غير قابلة للإلغاء' };
    return { success: true };
  }

  /* ─── Mappings CRUD ───────────────────────────────────────── */
  async getMappings(options = {}) {
    await this.init();
    const mappings = await FieldMapping.find(
      options.sourceSystem ? { sourceSystem: options.sourceSystem } : {}
    )
      .sort({ isDefault: -1 })
      .lean();
    return { success: true, mappings };
  }

  async createMapping(data) {
    const mapping = new FieldMapping({ ...data, isDefault: false });
    await mapping.save();
    return { success: true, mapping };
  }

  async updateMapping(mappingId, updates) {
    const mapping = await FieldMapping.findByIdAndUpdate(
      mappingId,
      { $set: updates },
      { new: true }
    ).lean();
    if (!mapping) return { success: false, error: 'القالب غير موجود' };
    return { success: true, mapping };
  }

  async deleteMapping(mappingId) {
    const mapping = await FieldMapping.findById(mappingId);
    if (!mapping) return { success: false, error: 'القالب غير موجود' };
    if (mapping.isDefault) return { success: false, error: 'لا يمكن حذف قالب افتراضي' };
    await mapping.deleteOne();
    return { success: true };
  }

  /* ─── Stats ───────────────────────────────────────────────── */
  async getStats() {
    const [totalJobs, byType, byStatus, byFormat] = await Promise.all([
      ImportExportJob.countDocuments(),
      ImportExportJob.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      ImportExportJob.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ImportExportJob.aggregate([{ $group: { _id: '$format', count: { $sum: 1 } } }]),
    ]);

    return {
      success: true,
      stats: {
        totalJobs,
        byType: byType.reduce((a, t) => ({ ...a, [t._id]: t.count }), {}),
        byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
        byFormat: byFormat.reduce((a, f) => ({ ...a, [f._id]: f.count }), {}),
      },
    };
  }
}

module.exports = new DocumentImportExportService();
