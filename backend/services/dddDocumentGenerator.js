'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Document Generator — Phase 15 (4/4)
 *  Report templates, PDF output, clinical documents, mail merge
 * ═══════════════════════════════════════════════════════════════
 */
const mongoose = require('mongoose');
const { Router } = require('express');

/* ── helpers ── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};
const oid = v => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return v;
  }
};
const safe = fn => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    next(e);
  }
};

/* ══════════════════════════════════════════════════════════════
   1) CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const DOCUMENT_TYPES = [
  'clinical_report',
  'progress_report',
  'discharge_summary',
  'assessment_report',
  'treatment_plan',
  'referral_letter',
  'certificate',
  'invoice',
  'receipt',
  'consent_document',
  'family_report',
  'quality_report',
  'custom',
];

const OUTPUT_FORMATS = ['pdf', 'html', 'docx', 'xlsx', 'csv', 'json'];

const TEMPLATE_ENGINES = ['handlebars', 'mustache', 'ejs', 'html_native'];

const PLACEHOLDER_CATEGORIES = [
  'beneficiary',
  'episode',
  'therapist',
  'facility',
  'session',
  'assessment',
  'dates',
  'scores',
  'custom',
];

const BUILTIN_DOC_TEMPLATES = [
  {
    code: 'DOC-PROGRESS-MONTHLY',
    name: 'Monthly Progress Report',
    nameAr: 'تقرير التقدم الشهري',
    type: 'progress_report',
    format: 'pdf',
  },
  {
    code: 'DOC-DISCHARGE',
    name: 'Discharge Summary',
    nameAr: 'ملخص الخروج',
    type: 'discharge_summary',
    format: 'pdf',
  },
  {
    code: 'DOC-ASSESS-INIT',
    name: 'Initial Assessment Report',
    nameAr: 'تقرير التقييم الأولي',
    type: 'assessment_report',
    format: 'pdf',
  },
  {
    code: 'DOC-TREAT-PLAN',
    name: 'Treatment Plan Document',
    nameAr: 'وثيقة خطة العلاج',
    type: 'treatment_plan',
    format: 'pdf',
  },
  {
    code: 'DOC-REFERRAL',
    name: 'Referral Letter',
    nameAr: 'خطاب الإحالة',
    type: 'referral_letter',
    format: 'pdf',
  },
  {
    code: 'DOC-CERT-ATTEND',
    name: 'Attendance Certificate',
    nameAr: 'شهادة حضور',
    type: 'certificate',
    format: 'pdf',
  },
  {
    code: 'DOC-INVOICE',
    name: 'Service Invoice',
    nameAr: 'فاتورة الخدمة',
    type: 'invoice',
    format: 'pdf',
  },
  {
    code: 'DOC-CONSENT',
    name: 'Treatment Consent',
    nameAr: 'وثيقة الموافقة',
    type: 'consent_document',
    format: 'pdf',
  },
  {
    code: 'DOC-FAMILY',
    name: 'Family Progress Report',
    nameAr: 'تقرير التقدم للأسرة',
    type: 'family_report',
    format: 'pdf',
  },
  {
    code: 'DOC-QUALITY-Q',
    name: 'Quarterly Quality Report',
    nameAr: 'تقرير الجودة الربعي',
    type: 'quality_report',
    format: 'pdf',
  },
  {
    code: 'DOC-SESSIONS-CSV',
    name: 'Sessions Export',
    nameAr: 'تصدير الجلسات',
    type: 'custom',
    format: 'csv',
  },
  {
    code: 'DOC-DATA-XLSX',
    name: 'Data Export Sheet',
    nameAr: 'ورقة تصدير البيانات',
    type: 'custom',
    format: 'xlsx',
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Document Template Schema ── */
const documentTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    type: { type: String, enum: DOCUMENT_TYPES, required: true, index: true },
    format: { type: String, enum: OUTPUT_FORMATS, default: 'pdf' },
    engine: { type: String, enum: TEMPLATE_ENGINES, default: 'handlebars' },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'published', 'deprecated'],
      default: 'draft',
      index: true,
    },

    /* Template Content */
    headerHtml: String,
    bodyHtml: { type: String, required: true },
    footerHtml: String,
    stylesCss: String,

    /* Layout */
    pageSize: { type: String, enum: ['A4', 'A3', 'letter', 'legal'], default: 'A4' },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    margins: {
      top: { type: Number, default: 20 },
      right: { type: Number, default: 15 },
      bottom: { type: Number, default: 20 },
      left: { type: Number, default: 15 },
    },

    /* Placeholders */
    placeholders: [
      {
        key: { type: String, required: true },
        label: String,
        labelAr: String,
        category: { type: String, enum: PLACEHOLDER_CATEGORIES },
        dataPath: String, // e.g., 'beneficiary.name'
        format: String, // e.g., 'date:YYYY-MM-DD'
        defaultValue: String,
      },
    ],

    /* Branding */
    logoUrl: String,
    brandColor: String,
    facilityName: String,
    facilityNameAr: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [String],
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDDocumentTemplate =
  model('DDDDocumentTemplate') || mongoose.model('DDDDocumentTemplate', documentTemplateSchema);

/* ── Generated Document Schema ── */
const generatedDocumentSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDDocumentTemplate',
      required: true,
      index: true,
    },
    templateCode: { type: String, index: true },
    code: { type: String, unique: true, sparse: true, index: true },
    title: { type: String, required: true },
    titleAr: String,
    type: { type: String, enum: DOCUMENT_TYPES, index: true },
    format: { type: String, enum: OUTPUT_FORMATS },

    /* Context */
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId },
    sessionId: { type: mongoose.Schema.Types.ObjectId },

    /* Content */
    renderedHtml: String,
    fileUrl: String,
    fileSize: Number,
    pageCount: Number,

    /* Data snapshot */
    dataSnapshot: { type: Map, of: mongoose.Schema.Types.Mixed },

    /* Status */
    status: {
      type: String,
      enum: ['generating', 'ready', 'error', 'archived'],
      default: 'generating',
      index: true,
    },
    errorMessage: String,
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    generatedAt: { type: Date, default: Date.now, index: true },

    /* Distribution */
    sentTo: [
      {
        recipientType: { type: String, enum: ['email', 'sms', 'portal', 'print'] },
        recipient: String,
        sentAt: Date,
        status: { type: String, enum: ['pending', 'sent', 'failed'] },
      },
    ],

    metadata: mongoose.Schema.Types.Mixed,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDGeneratedDocument =
  model('DDDGeneratedDocument') || mongoose.model('DDDGeneratedDocument', generatedDocumentSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE
   ══════════════════════════════════════════════════════════════ */

class DocumentGeneratorService {
  /* ── Templates CRUD ── */
  async listTemplates(filter = {}) {
    const q = { isActive: true };
    if (filter.type) q.type = filter.type;
    if (filter.format) q.format = filter.format;
    if (filter.status) q.status = filter.status;
    if (filter.tenant) q.tenant = filter.tenant;
    if (filter.search) {
      q.$or = [
        { name: new RegExp(filter.search, 'i') },
        { nameAr: new RegExp(filter.search, 'i') },
        { code: new RegExp(filter.search, 'i') },
      ];
    }
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDDocumentTemplate.find(q)
        .sort({ type: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDDocumentTemplate.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getTemplate(id) {
    return DDDDocumentTemplate.findById(oid(id)).lean();
  }
  async createTemplate(data) {
    return DDDDocumentTemplate.create(data);
  }
  async updateTemplate(id, data) {
    return DDDDocumentTemplate.findByIdAndUpdate(
      oid(id),
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }
  async publishTemplate(id) {
    return DDDDocumentTemplate.findByIdAndUpdate(
      oid(id),
      { $set: { status: 'published' }, $inc: { version: 1 } },
      { new: true }
    ).lean();
  }

  /* ── Generate Document ── */
  async generateDocument(templateId, contextData = {}, generatedBy) {
    const template = await DDDDocumentTemplate.findById(oid(templateId)).lean();
    if (!template) throw new Error('Template not found');
    if (template.status !== 'published') throw new Error('Template must be published');

    // Collect data
    const data = { ...contextData };

    // Resolve beneficiary data
    if (contextData.beneficiaryId) {
      const Beneficiary = model('Beneficiary');
      if (Beneficiary) {
        const ben = await Beneficiary.findById(oid(contextData.beneficiaryId)).lean();
        if (ben) data.beneficiary = ben;
      }
    }

    // Render template (simple placeholder replacement)
    let rendered = template.bodyHtml || '';
    for (const ph of template.placeholders || []) {
      const value = this._resolvePlaceholder(ph, data);
      rendered = rendered.replace(
        new RegExp(`\\{\\{${ph.key}\\}\\}`, 'g'),
        value || ph.defaultValue || ''
      );
    }

    // Wrap in full HTML
    const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><style>${template.stylesCss || ''}</style></head>
<body>
${template.headerHtml || ''}
${rendered}
${template.footerHtml || ''}
</body></html>`;

    const count = await DDDGeneratedDocument.countDocuments();
    const doc = await DDDGeneratedDocument.create({
      templateId: oid(templateId),
      templateCode: template.code,
      code: `GEN-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(5, '0')}`,
      title: `${template.name} - ${new Date().toISOString().split('T')[0]}`,
      titleAr: template.nameAr
        ? `${template.nameAr} - ${new Date().toLocaleDateString('ar-SA')}`
        : undefined,
      type: template.type,
      format: template.format,
      beneficiaryId: contextData.beneficiaryId ? oid(contextData.beneficiaryId) : undefined,
      episodeId: contextData.episodeId ? oid(contextData.episodeId) : undefined,
      sessionId: contextData.sessionId ? oid(contextData.sessionId) : undefined,
      renderedHtml: fullHtml,
      dataSnapshot: data,
      status: 'ready',
      generatedBy: generatedBy ? oid(generatedBy) : undefined,
      pageCount: Math.max(1, Math.ceil(fullHtml.length / 3000)),
      fileSize: Buffer.byteLength(fullHtml, 'utf8'),
      tenant: contextData.tenant || 'default',
    });

    return doc;
  }

  _resolvePlaceholder(ph, data) {
    if (!ph.dataPath) return data[ph.key];
    const parts = ph.dataPath.split('.');
    let val = data;
    for (const p of parts) {
      val = val?.[p];
    }
    if (val instanceof Date && ph.format?.startsWith('date:')) {
      return new Date(val).toISOString().split('T')[0];
    }
    return val !== undefined ? String(val) : undefined;
  }

  /* ── Generated Docs ── */
  async listGeneratedDocs(filter = {}) {
    const q = {};
    if (filter.templateId) q.templateId = oid(filter.templateId);
    if (filter.beneficiaryId) q.beneficiaryId = oid(filter.beneficiaryId);
    if (filter.type) q.type = filter.type;
    if (filter.status) q.status = filter.status;
    if (filter.generatedBy) q.generatedBy = oid(filter.generatedBy);
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDGeneratedDocument.find(q)
        .sort({ generatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('templateId', 'name code type')
        .lean(),
      DDDGeneratedDocument.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getGeneratedDoc(id) {
    return DDDGeneratedDocument.findById(oid(id))
      .populate('templateId', 'name code type placeholders')
      .populate('generatedBy', 'name email')
      .lean();
  }

  async getRenderedHtml(id) {
    const doc = await DDDGeneratedDocument.findById(oid(id)).lean();
    return doc?.renderedHtml || null;
  }

  /* ── Batch Generate ── */
  async batchGenerate(templateId, beneficiaryIds, generatedBy) {
    const results = [];
    for (const benId of beneficiaryIds) {
      try {
        const doc = await this.generateDocument(templateId, { beneficiaryId: benId }, generatedBy);
        results.push({ beneficiaryId: benId, status: 'success', documentId: doc._id });
      } catch (e) {
        results.push({ beneficiaryId: benId, status: 'error', error: e.message });
      }
    }
    return {
      total: beneficiaryIds.length,
      success: results.filter(r => r.status === 'success').length,
      results,
    };
  }

  /* ── Stats ── */
  async getStats(tenant = 'default') {
    const [templateCount, generatedCount, byType, byFormat] = await Promise.all([
      DDDDocumentTemplate.countDocuments({ isActive: true, tenant }),
      DDDGeneratedDocument.countDocuments({ tenant }),
      DDDGeneratedDocument.aggregate([
        { $match: { tenant } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      DDDGeneratedDocument.aggregate([
        { $match: { tenant } },
        { $group: { _id: '$format', count: { $sum: 1 } } },
      ]),
    ]);
    return {
      templateCount,
      generatedCount,
      byType: Object.fromEntries(byType.map(r => [r._id, r.count])),
      byFormat: Object.fromEntries(byFormat.map(r => [r._id, r.count])),
      builtinTemplates: BUILTIN_DOC_TEMPLATES.length,
    };
  }
}

const documentGeneratorService = new DocumentGeneratorService();

/* ══════════════════════════════════════════════════════════════
   4) ROUTER
   ══════════════════════════════════════════════════════════════ */

function createDocumentGeneratorRouter() {
  const r = Router();

  /* Templates */
  r.get(
    '/document-generator/templates',
    safe(async (req, res) => {
      res.json({ success: true, ...(await documentGeneratorService.listTemplates(req.query)) });
    })
  );
  r.get(
    '/document-generator/templates/:id',
    safe(async (req, res) => {
      const doc = await documentGeneratorService.getTemplate(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/document-generator/templates',
    safe(async (req, res) => {
      const doc = await documentGeneratorService.createTemplate(req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );
  r.put(
    '/document-generator/templates/:id',
    safe(async (req, res) => {
      const doc = await documentGeneratorService.updateTemplate(req.params.id, req.body);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/document-generator/templates/:id/publish',
    safe(async (req, res) => {
      const doc = await documentGeneratorService.publishTemplate(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  /* Generate */
  r.post(
    '/document-generator/generate',
    safe(async (req, res) => {
      const { templateId, data, generatedBy } = req.body;
      if (!templateId)
        return res.status(400).json({ success: false, error: 'templateId required' });
      const doc = await documentGeneratorService.generateDocument(
        templateId,
        data || {},
        generatedBy
      );
      res.status(201).json({ success: true, data: doc });
    })
  );

  r.post(
    '/document-generator/batch-generate',
    safe(async (req, res) => {
      const { templateId, beneficiaryIds, generatedBy } = req.body;
      if (!templateId || !beneficiaryIds?.length)
        return res
          .status(400)
          .json({ success: false, error: 'templateId & beneficiaryIds required' });
      const result = await documentGeneratorService.batchGenerate(
        templateId,
        beneficiaryIds,
        generatedBy
      );
      res.json({ success: true, data: result });
    })
  );

  /* Generated Documents */
  r.get(
    '/document-generator/documents',
    safe(async (req, res) => {
      res.json({ success: true, ...(await documentGeneratorService.listGeneratedDocs(req.query)) });
    })
  );
  r.get(
    '/document-generator/documents/:id',
    safe(async (req, res) => {
      const doc = await documentGeneratorService.getGeneratedDoc(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.get(
    '/document-generator/documents/:id/html',
    safe(async (req, res) => {
      const html = await documentGeneratorService.getRenderedHtml(req.params.id);
      if (!html) return res.status(404).json({ success: false, error: 'Not found' });
      res.type('html').send(html);
    })
  );

  /* Stats */
  r.get(
    '/document-generator/stats',
    safe(async (req, res) => {
      const data = await documentGeneratorService.getStats(req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* Meta */
  r.get('/document-generator/meta', (_req, res) => {
    res.json({
      success: true,
      documentTypes: DOCUMENT_TYPES,
      outputFormats: OUTPUT_FORMATS,
      templateEngines: TEMPLATE_ENGINES,
      placeholderCategories: PLACEHOLDER_CATEGORIES,
      builtinTemplates: BUILTIN_DOC_TEMPLATES,
    });
  });

  return r;
}

/* ══════════════════════════════════════════════════════════════
   5) EXPORTS
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDDocumentTemplate,
  DDDGeneratedDocument,
  DocumentGeneratorService,
  documentGeneratorService,
  createDocumentGeneratorRouter,
  DOCUMENT_TYPES,
  OUTPUT_FORMATS,
  TEMPLATE_ENGINES,
  PLACEHOLDER_CATEGORIES,
  BUILTIN_DOC_TEMPLATES,
};
