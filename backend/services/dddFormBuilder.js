'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Form Builder — Phase 15 (2/4)
 *  Dynamic forms, templates, conditional logic, validation
 * ═══════════════════════════════════════════════════════════════
 */

const { FIELD_TYPES, FORM_CATEGORIES, VALIDATION_RULES, BUILTIN_FORM_TEMPLATES } = require('../models/DddFormBuilder');

const BaseCrudService = require('./base/BaseCrudService');

class FormBuilderService extends BaseCrudService {
  /* ── Templates CRUD ── */
  async listTemplates(filter = {}) {
    const q = { isActive: true };
    if (filter.category) q.category = filter.category;
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
      DDDFormTemplate.find(q)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDFormTemplate.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getTemplate(id) {
    return DDDFormTemplate.findById(oid(id)).lean();
  }

  async createTemplate(data) { return this._create(DDDFormTemplate, data); }

  async updateTemplate(id, data) {
    return DDDFormTemplate.findByIdAndUpdate(
      oid(id),
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }

  async publishTemplate(id) {
    return DDDFormTemplate.findByIdAndUpdate(
      oid(id),
      { $set: { status: 'published' }, $inc: { version: 1 } },
      { new: true }
    ).lean();
  }

  async cloneTemplate(id, newCode) {
    const original = await DDDFormTemplate.findById(oid(id)).lean();
    if (!original) throw new Error('Template not found');
    delete original._id;
    original.code = newCode || `${original.code}-COPY-${Date.now().toString(36)}`;
    original.name = `${original.name} (Copy)`;
    original.status = 'draft';
    original.version = 1;
    return DDDFormTemplate.create(original);
  }

  /* ── Submissions ── */
  async submitForm(templateId, data, context = {}) {
    const template = await DDDFormTemplate.findById(oid(templateId)).lean();
    if (!template) throw new Error('Template not found');

    // Validate required fields
    const errors = [];
    for (const field of template.fields || []) {
      if (field.required && !data[field.fieldId] && data[field.fieldId] !== 0) {
        errors.push({ fieldId: field.fieldId, message: `${field.label} is required` });
      }
      // Apply validation rules
      for (const rule of field.validation || []) {
        const val = data[field.fieldId];
        if (val === undefined || val === null) continue;
        switch (rule.rule) {
          case 'min_length':
            if (String(val).length < rule.value)
              errors.push({
                fieldId: field.fieldId,
                message: rule.message || `Min length: ${rule.value}`,
              });
            break;
          case 'max_length':
            if (String(val).length > rule.value)
              errors.push({
                fieldId: field.fieldId,
                message: rule.message || `Max length: ${rule.value}`,
              });
            break;
          case 'min_value':
            if (Number(val) < rule.value)
              errors.push({
                fieldId: field.fieldId,
                message: rule.message || `Min value: ${rule.value}`,
              });
            break;
          case 'max_value':
            if (Number(val) > rule.value)
              errors.push({
                fieldId: field.fieldId,
                message: rule.message || `Max value: ${rule.value}`,
              });
            break;
          case 'pattern':
            if (!new RegExp(rule.value).test(String(val)))
              errors.push({ fieldId: field.fieldId, message: rule.message || 'Invalid format' });
            break;
        }
      }
    }

    if (errors.length > 0) return { valid: false, errors };

    // Calculate score if enabled
    let score, scoreLabel;
    if (template.scoring?.enabled) {
      score = 0;
      for (const field of template.fields || []) {
        const val = Number(data[field.fieldId]) || 0;
        score += val;
      }
      if (template.scoring.method === 'average') {
        score =
          score /
          Math.max(
            1,
            template.fields.filter(f => !['section_header', 'calculated'].includes(f.type)).length
          );
      }
      const range = (template.scoring.ranges || []).find(r => score >= r.min && score <= r.max);
      scoreLabel = range?.label;
    }

    const submission = await DDDFormSubmission.create({
      templateId: oid(templateId),
      templateCode: template.code,
      beneficiaryId: context.beneficiaryId ? oid(context.beneficiaryId) : undefined,
      episodeId: context.episodeId ? oid(context.episodeId) : undefined,
      sessionId: context.sessionId ? oid(context.sessionId) : undefined,
      workflowInstanceId: context.workflowInstanceId ? oid(context.workflowInstanceId) : undefined,
      data,
      score,
      scoreLabel,
      submittedBy: context.submittedBy ? oid(context.submittedBy) : undefined,
      tenant: context.tenant || 'default',
    });

    return { valid: true, submission };
  }

  async listSubmissions(filter = {}) {
    const q = {};
    if (filter.templateId) q.templateId = oid(filter.templateId);
    if (filter.beneficiaryId) q.beneficiaryId = oid(filter.beneficiaryId);
    if (filter.status) q.status = filter.status;
    if (filter.submittedBy) q.submittedBy = oid(filter.submittedBy);
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDFormSubmission.find(q)
        .sort({ submittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('templateId', 'name code category')
        .lean(),
      DDDFormSubmission.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getSubmission(id) {
    return DDDFormSubmission.findById(oid(id))
      .populate('templateId', 'name code category fields scoring')
      .populate('submittedBy', 'name email')
      .lean();
  }

  async reviewSubmission(id, status, reviewedBy, notes) {
    return DDDFormSubmission.findByIdAndUpdate(
      oid(id),
      {
        $set: { status, reviewedBy: oid(reviewedBy), reviewedAt: new Date(), reviewNotes: notes },
      },
      { new: true }
    ).lean();
  }

  /* ── Stats ── */
  async getStats(tenant = 'default') {
    const [templateCount, submissionCount, byCategory] = await Promise.all([
      DDDFormTemplate.countDocuments({ isActive: true, tenant }),
      DDDFormSubmission.countDocuments({ tenant }),
      DDDFormTemplate.aggregate([
        { $match: { isActive: true, tenant } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    return {
      templateCount,
      submissionCount,
      byCategory: Object.fromEntries(byCategory.map(r => [r._id, r.count])),
      builtinTemplates: BUILTIN_FORM_TEMPLATES.length,
    };
  }
}

module.exports = new FormBuilderService();
