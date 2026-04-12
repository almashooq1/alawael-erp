'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Document Generator — Phase 15 (4/4)
 *  Report templates, PDF output, clinical documents, mail merge
 * ═══════════════════════════════════════════════════════════════
 */

const { DOCUMENT_TYPES, OUTPUT_FORMATS, TEMPLATE_ENGINES, PLACEHOLDER_CATEGORIES, BUILTIN_DOC_TEMPLATES } = require('../models/DddDocumentGenerator');

const BaseCrudService = require('./base/BaseCrudService');

class DocumentGeneratorService extends BaseCrudService {
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
  async createTemplate(data) { return this._create(DDDDocumentTemplate, data); }
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

module.exports = new DocumentGeneratorService();
