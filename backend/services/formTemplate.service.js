/* eslint-disable no-unused-vars */
/**
 * Form Template Service — خدمة النماذج الجاهزة
 * Business logic for professional form template management
 * with design, versioning, submissions, and PDF generation.
 *
 * @module services/formTemplate.service
 * @created 2026-03-14
 */

const mongoose = require('mongoose');
const FormTemplate = require('../models/FormTemplate');
const FormSubmission = require('../models/FormSubmission');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// 📂 CATEGORIES METADATA
// ═══════════════════════════════════════════════════════════════

const CATEGORIES = [
  { id: 'all', label: 'جميع النماذج', labelEn: 'All Forms', icon: '📋', color: '#455A64' },
  {
    id: 'beneficiary',
    label: 'شؤون المستفيدين',
    labelEn: 'Beneficiary Affairs',
    icon: '🧑‍🦽',
    color: '#1565C0',
  },
  { id: 'hr', label: 'شؤون الموظفين', labelEn: 'Human Resources', icon: '👥', color: '#D32F2F' },
  {
    id: 'administration',
    label: 'الشؤون الإدارية',
    labelEn: 'Administration',
    icon: '🏛️',
    color: '#6D4C41',
  },
  { id: 'finance', label: 'الشؤون المالية', labelEn: 'Finance', icon: '💰', color: '#2E7D32' },
  { id: 'general', label: 'عامة', labelEn: 'General', icon: '📁', color: '#757575' },
  { id: 'medical', label: 'الشؤون الطبية', labelEn: 'Medical', icon: '🏥', color: '#00838F' },
  { id: 'therapy', label: 'العلاج التأهيلي', labelEn: 'Therapy', icon: '🧠', color: '#7B1FA2' },
  { id: 'legal', label: 'الشؤون القانونية', labelEn: 'Legal', icon: '⚖️', color: '#4E342E' },
  { id: 'reports', label: 'التقارير', labelEn: 'Reports', icon: '📊', color: '#0277BD' },
  { id: 'custom', label: 'مخصصة', labelEn: 'Custom', icon: '🎨', color: '#E65100' },
];

// ═══════════════════════════════════════════════════════════════
// 🔧 TEMPLATE CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * List templates with filters, search, pagination
 */
async function listTemplates(query = {}) {
  const { category, search, tags, isBuiltIn, isPublished, page = 1, limit = 50, sort } = query;
  const filter = { isActive: true };

  if (category && category !== 'all') filter.category = category;
  if (typeof isBuiltIn === 'boolean') filter.isBuiltIn = isBuiltIn;
  if (typeof isPublished === 'boolean') filter.isPublished = isPublished;
  if (tags && tags.length) filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { nameEn: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOrder =
    sort === 'name'
      ? { name: 1 }
      : sort === 'newest'
        ? { createdAt: -1 }
        : { category: 1, name: 1 };

  const [templates, total] = await Promise.all([
    FormTemplate.find(filter).sort(sortOrder).skip(skip).limit(parseInt(limit)).lean(),
    FormTemplate.countDocuments(filter),
  ]);

  return {
    templates,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
}

/**
 * Get a single template by templateId or ObjectId
 */
async function getTemplateById(id) {
  const conditions = [{ templateId: id }];
  if (mongoose.isValidObjectId(id)) conditions.push({ _id: id });

  const template = await FormTemplate.findOne({ $or: conditions, isActive: true }).lean();
  if (!template) return null;

  // Increment usage count in background
  if (template._id) {
    FormTemplate.updateOne(
      { _id: template._id },
      { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
    ).catch(() => {});
  }

  return template;
}

/**
 * Create a new custom template
 */
async function createTemplate(data, user = {}) {
  const {
    name,
    nameEn,
    description,
    descriptionEn,
    category,
    subcategory,
    icon,
    color,
    thumbnail,
    fields,
    sections,
    design,
    tags,
    requiresApproval,
    approvalSteps,
    outputFormat,
    allowDraft,
    allowAttachments,
    maxAttachments,
    allowedAttachmentTypes,
    notifyOnSubmission,
    notifyEmails,
    permissions,
  } = data;

  if (!name || !category) {
    throw Object.assign(new Error('اسم النموذج والتصنيف مطلوبان'), { status: 400 });
  }

  const templateId = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const template = await FormTemplate.create({
    templateId,
    name,
    nameEn,
    description,
    descriptionEn,
    category,
    subcategory,
    icon: icon || '📄',
    color: color || '#1976d2',
    thumbnail,
    fields: fields || [],
    sections: sections || [],
    design: design || {},
    tags: tags || [],
    requiresApproval: requiresApproval ?? true,
    approvalSteps: approvalSteps || [],
    outputFormat: outputFormat || 'pdf',
    allowDraft: allowDraft ?? true,
    allowAttachments: allowAttachments ?? true,
    maxAttachments: maxAttachments || 5,
    allowedAttachmentTypes: allowedAttachmentTypes || [],
    notifyOnSubmission: notifyOnSubmission ?? true,
    notifyEmails: notifyEmails || [],
    permissions: permissions || {},
    isBuiltIn: false,
    isPublished: false,
    createdBy: user.id,
    createdByName: user.name,
    tenantId: user.tenantId,
  });

  return template;
}

/**
 * Update an existing template (with optional versioning)
 */
async function updateTemplate(id, data, user = {}) {
  const conditions = [{ templateId: id }];
  if (mongoose.isValidObjectId(id)) conditions.push({ _id: id });

  const template = await FormTemplate.findOne({ $or: conditions, isActive: true });
  if (!template) {
    throw Object.assign(new Error('النموذج غير موجود'), { status: 404 });
  }

  // Auto-save version if fields or design changed
  const hasStructuralChange =
    (data.fields && JSON.stringify(data.fields) !== JSON.stringify(template.fields)) ||
    (data.design && JSON.stringify(data.design) !== JSON.stringify(template.design)) ||
    (data.sections && JSON.stringify(data.sections) !== JSON.stringify(template.sections));

  if (hasStructuralChange) {
    template.saveVersion(user.id, user.name, data._versionNotes || 'تحديث تلقائي');
  }

  // Apply updates (whitelist allowed fields)
  const allowed = [
    'name',
    'nameEn',
    'description',
    'descriptionEn',
    'category',
    'subcategory',
    'icon',
    'color',
    'thumbnail',
    'fields',
    'sections',
    'design',
    'tags',
    'requiresApproval',
    'approvalSteps',
    'outputFormat',
    'allowDraft',
    'allowAttachments',
    'maxAttachments',
    'allowedAttachmentTypes',
    'notifyOnSubmission',
    'notifyEmails',
    'permissions',
    'isPublished',
  ];
  for (const key of allowed) {
    if (data[key] !== undefined) template[key] = data[key];
  }
  template.updatedBy = user.id;

  await template.save();
  return template;
}

/**
 * Soft-delete a template
 */
async function deleteTemplate(id) {
  const conditions = [{ templateId: id }];
  if (mongoose.isValidObjectId(id)) conditions.push({ _id: id });

  const template = await FormTemplate.findOneAndUpdate(
    { $or: conditions, isActive: true },
    { $set: { isActive: false } },
    { new: true }
  );
  if (!template) {
    throw Object.assign(new Error('النموذج غير موجود'), { status: 404 });
  }
  return template;
}

/**
 * Clone a template
 */
async function cloneTemplate(id, newName, user = {}) {
  const conditions = [{ templateId: id }];
  if (mongoose.isValidObjectId(id)) conditions.push({ _id: id });

  const original = await FormTemplate.findOne({ $or: conditions, isActive: true });
  if (!original) {
    throw Object.assign(new Error('النموذج غير موجود'), { status: 404 });
  }

  const cloned = original.cloneTemplate(newName, user.id);
  cloned.createdByName = user.name;
  cloned.tenantId = user.tenantId;

  const newTemplate = await FormTemplate.create(cloned);
  return newTemplate;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 DESIGN MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Update template design (logo, header, footer, theme...)
 */
async function updateDesign(id, designData, user = {}) {
  const conditions = [{ templateId: id }];
  if (mongoose.isValidObjectId(id)) conditions.push({ _id: id });

  const template = await FormTemplate.findOne({ $or: conditions, isActive: true });
  if (!template) {
    throw Object.assign(new Error('النموذج غير موجود'), { status: 404 });
  }

  // Save version before design change
  template.saveVersion(user.id, user.name, 'تحديث التصميم');

  // Merge design (deep merge)
  const current = template.design ? template.design.toObject() : {};
  const merged = deepMerge(current, designData);
  template.design = merged;
  template.updatedBy = user.id;

  await template.save();
  return template;
}

/**
 * Upload/set logo for a template
 */
async function setLogo(id, logoData, user = {}) {
  const conditions = [{ templateId: id }];
  if (mongoose.isValidObjectId(id)) conditions.push({ _id: id });

  const template = await FormTemplate.findOne({ $or: conditions, isActive: true });
  if (!template) {
    throw Object.assign(new Error('النموذج غير موجود'), { status: 404 });
  }

  if (!template.design) template.design = {};
  template.design.logo = {
    ...template.design.logo,
    ...logoData,
  };
  template.updatedBy = user.id;
  template.markModified('design');
  await template.save();
  return template;
}

/**
 * Set secondary logo
 */
async function setSecondaryLogo(id, logoData, user = {}) {
  const conditions = [{ templateId: id }];
  if (mongoose.isValidObjectId(id)) conditions.push({ _id: id });

  const template = await FormTemplate.findOne({ $or: conditions, isActive: true });
  if (!template) {
    throw Object.assign(new Error('النموذج غير موجود'), { status: 404 });
  }

  if (!template.design) template.design = {};
  template.design.secondaryLogo = {
    ...template.design.secondaryLogo,
    ...logoData,
  };
  template.updatedBy = user.id;
  template.markModified('design');
  await template.save();
  return template;
}

/**
 * Update header design
 */
async function updateHeader(id, headerData, user = {}) {
  return updateDesignSection(id, 'header', headerData, user);
}

/**
 * Update footer design
 */
async function updateFooter(id, footerData, user = {}) {
  return updateDesignSection(id, 'footer', footerData, user);
}

/**
 * Generic helper — update a specific design section
 */
async function updateDesignSection(id, section, data, user = {}) {
  const conditions = [{ templateId: id }];
  if (mongoose.isValidObjectId(id)) conditions.push({ _id: id });

  const template = await FormTemplate.findOne({ $or: conditions, isActive: true });
  if (!template) {
    throw Object.assign(new Error('النموذج غير موجود'), { status: 404 });
  }

  if (!template.design) template.design = {};
  template.design[section] = {
    ...(template.design[section] || {}),
    ...data,
  };
  template.updatedBy = user.id;
  template.markModified('design');
  await template.save();
  return template;
}

// ═══════════════════════════════════════════════════════════════
// 📜 VERSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get version history for a template
 */
async function getVersionHistory(id) {
  const conditions = [{ templateId: id }];
  if (mongoose.isValidObjectId(id)) conditions.push({ _id: id });

  const template = await FormTemplate.findOne({ $or: conditions })
    .select('templateId name version versions')
    .lean();

  if (!template) {
    throw Object.assign(new Error('النموذج غير موجود'), { status: 404 });
  }

  return {
    currentVersion: template.version,
    versions: (template.versions || []).map(v => ({
      version: v.version,
      notes: v.notes,
      changedBy: v.changedByName,
      createdAt: v.createdAt,
      fieldCount: (v.fields || []).length,
    })),
  };
}

/**
 * Restore a template to a previous version
 */
async function restoreVersion(id, versionNumber, user = {}) {
  const conditions = [{ templateId: id }];
  if (mongoose.isValidObjectId(id)) conditions.push({ _id: id });

  const template = await FormTemplate.findOne({ $or: conditions, isActive: true });
  if (!template) {
    throw Object.assign(new Error('النموذج غير موجود'), { status: 404 });
  }

  // Save current state before restore
  template.saveVersion(user.id, user.name, `قبل الاستعادة إلى الإصدار ${versionNumber}`);
  template.restoreVersion(versionNumber);
  template.updatedBy = user.id;

  await template.save();
  return template;
}

// ═══════════════════════════════════════════════════════════════
// 📝 SUBMISSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Submit a filled form
 */
async function submitForm(templateIdOrObj, data, user = {}, options = {}) {
  // Find template
  let template;
  if (typeof templateIdOrObj === 'string') {
    const conditions = [{ templateId: templateIdOrObj }];
    if (mongoose.isValidObjectId(templateIdOrObj)) conditions.push({ _id: templateIdOrObj });
    template = await FormTemplate.findOne({ $or: conditions, isActive: true }).lean();
  } else {
    template = templateIdOrObj; // Already resolved
  }

  if (!template) {
    throw Object.assign(new Error('النموذج غير موجود'), { status: 404 });
  }

  // Validate submission data against field definitions
  if (!options.skipValidation) {
    const templateDoc = template.validateSubmission
      ? template
      : await FormTemplate.findOne({ templateId: template.templateId });
    if (templateDoc && templateDoc.validateSubmission) {
      const errors = templateDoc.validateSubmission(data);
      if (errors.length > 0) {
        const err = new Error('بيانات النموذج غير صالحة');
        err.status = 400;
        err.validationErrors = errors;
        throw err;
      }
    }
  }

  // Build approval chain
  const approvals = (template.approvalSteps || []).map((step, idx) => ({
    step: idx,
    role: step.role,
    label: step.label,
    status: 'pending',
  }));

  const submission = await FormSubmission.create({
    templateId: template.templateId,
    templateName: template.name,
    templateVersion: template.version || 1,
    submittedBy: {
      userId: user.id,
      name: user.name || options.submitterName || 'مستخدم',
      email: user.email || '',
      department: options.department || '',
      role: user.role || '',
      phone: user.phone || '',
    },
    data,
    notes: options.notes,
    status: options.isDraft ? 'draft' : template.requiresApproval ? 'submitted' : 'approved',
    priority: options.priority || 'normal',
    approvals,
    dueDate: options.dueDate,
    tenantId: user.tenantId,
  });

  // Increment template usage count
  if (template._id) {
    FormTemplate.updateOne(
      { _id: template._id },
      { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
    ).catch(() => {});
  }

  return submission;
}

/**
 * Get user's submissions
 */
async function getUserSubmissions(userId, query = {}) {
  const { status, templateId, page = 1, limit = 20 } = query;
  const filter = {};
  if (userId) filter['submittedBy.userId'] = userId;
  if (status) filter.status = status;
  if (templateId) filter.templateId = templateId;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [submissions, total] = await Promise.all([
    FormSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    FormSubmission.countDocuments(filter),
  ]);

  return {
    submissions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
}

/**
 * Get pending submissions for approval
 */
async function getPendingSubmissions(query = {}) {
  const { role, page = 1, limit = 50 } = query;
  const filter = { status: { $in: ['submitted', 'under_review'] } };

  if (role) {
    filter['approvals'] = { $elemMatch: { role, status: 'pending' } };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [submissions, total] = await Promise.all([
    FormSubmission.find(filter)
      .sort({ priority: -1, createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    FormSubmission.countDocuments(filter),
  ]);

  return {
    submissions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
}

/**
 * Get a single submission by ID
 */
async function getSubmissionById(submissionId) {
  const submission = await FormSubmission.findById(submissionId).lean();
  if (!submission) {
    throw Object.assign(new Error('الطلب غير موجود'), { status: 404 });
  }
  return submission;
}

/**
 * Approve a submission step
 */
async function approveSubmission(submissionId, user = {}, comment) {
  const submission = await FormSubmission.findById(submissionId);
  if (!submission) {
    throw Object.assign(new Error('الطلب غير موجود'), { status: 404 });
  }

  submission.approveCurrentStep(user.id, user.name || 'مسؤول', comment);
  await submission.save();
  return submission;
}

/**
 * Reject a submission
 */
async function rejectSubmission(submissionId, user = {}, comment) {
  const submission = await FormSubmission.findById(submissionId);
  if (!submission) {
    throw Object.assign(new Error('الطلب غير موجود'), { status: 404 });
  }

  submission.reject(user.id, user.name || 'مسؤول', comment);
  await submission.save();
  return submission;
}

/**
 * Return a submission for revision
 */
async function returnSubmission(submissionId, user = {}, reason) {
  const submission = await FormSubmission.findById(submissionId);
  if (!submission) {
    throw Object.assign(new Error('الطلب غير موجود'), { status: 404 });
  }

  submission.returnForRevision(user.id, user.name, reason);
  await submission.save();
  return submission;
}

/**
 * Resubmit after revision
 */
async function resubmitForm(submissionId, newData, user = {}, reason) {
  const submission = await FormSubmission.findById(submissionId);
  if (!submission) {
    throw Object.assign(new Error('الطلب غير موجود'), { status: 404 });
  }
  if (!['returned', 'draft'].includes(submission.status)) {
    throw Object.assign(new Error('لا يمكن إعادة إرسال هذا الطلب'), { status: 400 });
  }

  submission.saveRevision(newData, user.id, user.name, reason || 'إعادة إرسال');
  submission.status = 'submitted';
  // Reset approvals
  submission.approvals.forEach(a => {
    a.status = 'pending';
    a.approvedBy = undefined;
    a.approverName = undefined;
    a.comment = undefined;
    a.date = undefined;
  });
  submission.currentApprovalStep = 0;

  await submission.save();
  return submission;
}

/**
 * Add a comment to a submission
 */
async function addComment(submissionId, user = {}, text, type = 'comment', isInternal = false) {
  const submission = await FormSubmission.findById(submissionId);
  if (!submission) {
    throw Object.assign(new Error('الطلب غير موجود'), { status: 404 });
  }

  submission.comments.push({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    text,
    type,
    isInternal,
  });

  await submission.save();
  return submission;
}

// ═══════════════════════════════════════════════════════════════
// 📊 STATISTICS & CATEGORIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get categories with counts
 */
async function getCategories() {
  const categories = [...CATEGORIES];

  try {
    const counts = await FormTemplate.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    let totalCount = 0;
    counts.forEach(c => {
      countMap[c._id] = c.count;
      totalCount += c.count;
    });
    categories.forEach(cat => {
      cat.count = cat.id === 'all' ? totalCount : countMap[cat.id] || 0;
    });
  } catch {
    categories.forEach(cat => {
      cat.count = 0;
    });
  }

  return categories;
}

/**
 * Get overall stats (templates + submissions)
 */
async function getStats(options = {}) {
  const [totalTemplates, totalSubmissions, pendingSubmissions, approvedSubmissions] =
    await Promise.all([
      FormTemplate.countDocuments({ isActive: true }).catch(() => 0),
      FormSubmission.countDocuments(options.filter || {}).catch(() => 0),
      FormSubmission.countDocuments({ status: { $in: ['submitted', 'under_review'] } }).catch(
        () => 0
      ),
      FormSubmission.countDocuments({ status: 'approved' }).catch(() => 0),
    ]);

  const recentSubmissions = await FormSubmission.find(options.filter || {})
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()
    .catch(() => []);

  // Category breakdown
  let categoryBreakdown = [];
  try {
    categoryBreakdown = await FormTemplate.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 }, avgUsage: { $avg: '$usageCount' } } },
      { $sort: { count: -1 } },
    ]);
  } catch {
    /* ignore */
  }

  // Monthly submissions trend
  let monthlyTrend = [];
  try {
    monthlyTrend = await FormSubmission.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  } catch {
    /* ignore */
  }

  return {
    stats: {
      totalTemplates,
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions: Math.max(0, totalSubmissions - pendingSubmissions - approvedSubmissions),
    },
    recentSubmissions,
    categoryBreakdown,
    monthlyTrend,
  };
}

// ═══════════════════════════════════════════════════════════════
// 🖨️ HTML RENDER / PDF PREVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Render a filled submission as HTML (for PDF generation or preview)
 */
function renderSubmissionHtml(template, submission, options = {}) {
  const design = template.design || {};
  const page = design.page || {};
  const theme = design.theme || {};
  const header = design.header || {};
  const footer = design.footer || {};
  const logo = design.logo || {};
  const secondaryLogo = design.secondaryLogo || {};
  const watermark = design.watermark || {};
  const direction = page.direction || 'rtl';
  const fontFamily = theme.fontFamily || 'Cairo, Segoe UI, Tahoma, sans-serif';

  let html = `<!DOCTYPE html>
<html lang="ar" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <title>${template.name || 'نموذج'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${fontFamily};
      font-size: ${theme.fontSize || 14}px;
      color: #333;
      direction: ${direction};
      background: ${theme.backgroundColor || '#fff'};
    }
    @page {
      size: ${page.size || 'A4'} ${page.orientation || 'portrait'};
      margin: ${page.margins?.top || 20}mm ${page.margins?.right || 20}mm ${page.margins?.bottom || 20}mm ${page.margins?.left || 20}mm;
    }
    .page-container { max-width: 210mm; margin: 0 auto; padding: 20px; position: relative; }

    /* Watermark */
    ${
      watermark.enabled
        ? `.watermark {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(${watermark.rotation || -30}deg);
      font-size: ${watermark.fontSize || 60}px;
      color: rgba(0,0,0,${watermark.opacity || 0.08});
      pointer-events: none; z-index: 0; white-space: nowrap;
    }`
        : ''
    }

    /* Header */
    .form-header {
      background: ${header.backgroundColor || '#1976d2'};
      color: ${header.textColor || '#fff'};
      padding: 20px; text-align: center;
      border-radius: ${theme.borderRadius || 8}px ${theme.borderRadius || 8}px 0 0;
      margin-bottom: 0;
    }
    .form-header .title { font-size: ${header.fontSize || 18}px; font-weight: 700; margin: 8px 0; }
    .form-header .subtitle { font-size: ${(header.fontSize || 18) - 4}px; opacity: 0.9; }
    .form-header .meta { font-size: 12px; opacity: 0.8; margin-top: 8px; }
    .logo-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .logo-container img { object-fit: contain; }

    /* Body */
    .form-body {
      border: 1px solid ${theme.borderColor || '#e0e0e0'};
      border-top: none; padding: 24px;
      border-radius: 0 0 ${theme.borderRadius || 8}px ${theme.borderRadius || 8}px;
    }
    .section-title {
      font-size: 16px; font-weight: 700; color: ${theme.primaryColor || '#1976d2'};
      border-bottom: 2px solid ${theme.primaryColor || '#1976d2'};
      padding-bottom: 8px; margin: 24px 0 16px;
    }
    .field-row { display: flex; flex-wrap: wrap; gap: ${theme.fieldSpacing || 16}px; margin-bottom: ${theme.fieldSpacing || 16}px; }
    .field-item { flex: 1; min-width: 200px; }
    .field-label { font-weight: 600; font-size: 13px; color: #555; margin-bottom: 4px; }
    .field-value {
      padding: 10px 12px; background: #f9f9f9;
      border: 1px solid ${theme.borderColor || '#e0e0e0'};
      border-radius: ${(theme.borderRadius || 8) / 2}px;
      min-height: 40px; font-size: 14px;
    }

    /* Footer */
    .form-footer {
      background: ${footer.backgroundColor || '#f5f5f5'};
      color: ${footer.textColor || '#666'};
      padding: 16px 20px; margin-top: 24px;
      border-radius: ${theme.borderRadius || 8}px;
      font-size: 12px; text-align: center;
    }
    .signature-area { display: flex; justify-content: space-around; margin-top: 40px; padding-top: 20px; }
    .signature-block { text-align: center; min-width: 150px; }
    .signature-line { border-top: 1px solid #999; width: 180px; margin: 40px auto 8px; }
    .signature-label { font-size: 12px; color: #666; }

    /* Stamps */
    .stamp { position: absolute; padding: 8px 16px; border: 3px solid; border-radius: 8px;
      font-weight: 700; font-size: 18px; transform: rotate(-15deg); opacity: 0.7; }
    .stamp.top-right { top: 60px; right: 30px; }
    .stamp.top-left { top: 60px; left: 30px; }
    .stamp.bottom-right { bottom: 60px; right: 30px; }
    .stamp.bottom-left { bottom: 60px; left: 30px; }
    .stamp.center { top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); }

    ${design.customCss || ''}
  </style>
</head>
<body>
<div class="page-container">`;

  // Watermark
  if (watermark.enabled && watermark.text) {
    html += `\n  <div class="watermark">${escapeHtml(watermark.text)}</div>`;
  }

  // Stamps
  if (design.stamps && design.stamps.length > 0) {
    for (const stamp of design.stamps) {
      html += `\n  <div class="stamp ${stamp.position || 'top-right'}" style="border-color:${stamp.color || '#4CAF50'};color:${stamp.color || '#4CAF50'}">${escapeHtml(stamp.label)}</div>`;
    }
  }

  // Header
  if (header.enabled !== false) {
    html += `\n  <div class="form-header">`;
    // Logos
    const hasLogo = logo.url || logo.base64;
    const hasSecondary = secondaryLogo.url || secondaryLogo.base64;
    if (hasLogo || hasSecondary) {
      html += `\n    <div class="logo-container">`;
      if (hasSecondary) {
        html += `<img src="${secondaryLogo.url || secondaryLogo.base64}" width="${secondaryLogo.width || 80}" height="${secondaryLogo.height || 40}" alt="logo2">`;
      } else {
        html += `<span></span>`;
      }
      if (hasLogo) {
        html += `<img src="${logo.url || logo.base64}" width="${logo.width || 120}" height="${logo.height || 60}" alt="logo">`;
      }
      if (hasSecondary) {
        html += `<span></span>`;
      }
      html += `\n    </div>`;
    }
    if (header.customHtml) {
      html += header.customHtml;
    } else {
      html += `\n    <div class="title">${escapeHtml(direction === 'rtl' ? header.title || template.name : header.titleEn || header.title || template.nameEn || template.name)}</div>`;
      if (header.subtitle || header.subtitleEn) {
        html += `\n    <div class="subtitle">${escapeHtml(direction === 'rtl' ? header.subtitle || '' : header.subtitleEn || header.subtitle || '')}</div>`;
      }
      const metaParts = [];
      if (header.showReferenceNumber !== false && submission?.submissionNumber) {
        metaParts.push(`رقم المرجع: ${submission.submissionNumber}`);
      }
      if (header.showDate !== false) {
        metaParts.push(`التاريخ: ${new Date().toLocaleDateString('ar-SA')}`);
      }
      if (metaParts.length) {
        html += `\n    <div class="meta">${metaParts.join(' | ')}</div>`;
      }
    }
    html += `\n  </div>`;
  }

  // Body — render fields
  html += `\n  <div class="form-body">`;
  const fields = template.fields || [];
  const sections = template.sections || [];
  const data = (submission && submission.data) || {};

  if (sections.length > 0) {
    // Render by sections
    for (const section of sections.sort((a, b) => (a.order || 0) - (b.order || 0))) {
      html += `\n    <div class="section-title">${escapeHtml(section.title)}</div>`;
      const sectionFields = fields
        .filter(f => f.section === section.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      html += renderFieldsHtml(sectionFields, data, theme);
    }
    // Render un-sectioned fields
    const unsectioned = fields
      .filter(f => !f.section)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    if (unsectioned.length) {
      html += renderFieldsHtml(unsectioned, data, theme);
    }
  } else {
    html += renderFieldsHtml(
      fields.sort((a, b) => (a.order || 0) - (b.order || 0)),
      data,
      theme
    );
  }

  // Notes
  if (submission?.notes) {
    html += `\n    <div class="section-title">ملاحظات</div>`;
    html += `\n    <div class="field-value">${escapeHtml(submission.notes)}</div>`;
  }

  html += `\n  </div>`;

  // Footer
  if (footer.enabled !== false) {
    html += `\n  <div class="form-footer">`;
    if (footer.customHtml) {
      html += footer.customHtml;
    } else {
      if (footer.text) {
        html += `<p>${escapeHtml(footer.text)}</p>`;
      }
      if (footer.contactInfo) {
        html += `<p>${escapeHtml(footer.contactInfo)}</p>`;
      }
    }

    // Signature fields
    if (footer.showSignatureFields && footer.signatureFields && footer.signatureFields.length) {
      html += `\n    <div class="signature-area">`;
      for (const sig of footer.signatureFields) {
        html += `\n      <div class="signature-block"><div class="signature-line"></div><div class="signature-label">${escapeHtml(sig.label || '')}${sig.role ? ` (${escapeHtml(sig.role)})` : ''}</div></div>`;
      }
      html += `\n    </div>`;
    }

    if (footer.showPageNumbers) {
      html += `\n    <p style="margin-top:8px;font-size:11px">صفحة 1 من 1</p>`;
    }
    html += `\n  </div>`;
  }

  html += `\n</div>\n</body>\n</html>`;
  return html;
}

/**
 * Render a grid of fields as HTML
 */
function renderFieldsHtml(fields, data, theme) {
  let html = '\n    <div class="field-row" style="flex-wrap:wrap">';
  for (const field of fields) {
    if (['header', 'divider', 'paragraph', 'spacer'].includes(field.type)) {
      if (field.type === 'header') {
        html += `</div><h3 style="margin:16px 0 8px;color:${theme.primaryColor || '#1976d2'}">${escapeHtml(field.label)}</h3><div class="field-row" style="flex-wrap:wrap">`;
      } else if (field.type === 'divider') {
        html += `</div><hr style="border:none;border-top:1px solid ${theme.borderColor || '#e0e0e0'};margin:16px 0"><div class="field-row" style="flex-wrap:wrap">`;
      } else if (field.type === 'paragraph') {
        html += `</div><p style="margin:8px 0;color:#666">${escapeHtml(field.label)}</p><div class="field-row" style="flex-wrap:wrap">`;
      }
      continue;
    }

    const gridCols = field.gridSize || 12;
    const widthPct = Math.round((gridCols / 12) * 100) - 2;
    const value = data[field.name];
    let displayValue = '';

    if (value === undefined || value === null || value === '') {
      displayValue = '<span style="color:#bbb">—</span>';
    } else if (field.type === 'checkbox' || field.type === 'toggle') {
      displayValue = value ? '✅ نعم' : '❌ لا';
    } else if (field.type === 'select' || field.type === 'radio') {
      const opt = (field.options || []).find(o => o.value === value);
      displayValue = escapeHtml(opt ? opt.label : String(value));
    } else if (field.type === 'date') {
      displayValue = value ? new Date(value).toLocaleDateString('ar-SA') : '';
    } else if (field.type === 'rating') {
      displayValue = '⭐'.repeat(Math.min(Number(value) || 0, field.maxRating || 5));
    } else if (field.type === 'file') {
      displayValue = `📎 ${escapeHtml(typeof value === 'string' ? value : 'مرفق')}`;
    } else if (field.type === 'signature') {
      displayValue = value
        ? '<img src="' + value + '" style="max-width:200px;max-height:60px" alt="توقيع">'
        : '—';
    } else {
      displayValue = escapeHtml(String(value));
    }

    html += `\n      <div class="field-item" style="flex:0 0 ${widthPct}%;max-width:${widthPct}%">
        <div class="field-label">${escapeHtml(field.label)}</div>
        <div class="field-value">${displayValue}</div>
      </div>`;
  }
  html += '\n    </div>';
  return html;
}

// ═══════════════════════════════════════════════════════════════
// 🌱 SEEDING
// ═══════════════════════════════════════════════════════════════

/**
 * Seed built-in templates from the data file
 * @param {Array} templates — Array of template objects to seed
 */
async function seedBuiltInTemplates(templates) {
  if (!templates || !templates.length) return 0;
  let count = 0;
  for (const tpl of templates) {
    try {
      await FormTemplate.findOneAndUpdate(
        { templateId: tpl.templateId },
        { $setOnInsert: { ...tpl, isBuiltIn: true, isActive: true } },
        { upsert: true, new: true }
      );
      count++;
    } catch (err) {
      logger.warn(`[FormTemplates] Failed to seed ${tpl.templateId}: ${err.message}`);
    }
  }
  logger.info(`[FormTemplates] Seeded ${count} built-in templates`);
  return count;
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════════

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Constants
  CATEGORIES,

  // Template CRUD
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,

  // Design
  updateDesign,
  setLogo,
  setSecondaryLogo,
  updateHeader,
  updateFooter,

  // Versioning
  getVersionHistory,
  restoreVersion,

  // Submissions
  submitForm,
  getUserSubmissions,
  getPendingSubmissions,
  getSubmissionById,
  approveSubmission,
  rejectSubmission,
  returnSubmission,
  resubmitForm,
  addComment,

  // Stats
  getCategories,
  getStats,

  // Rendering
  renderSubmissionHtml,

  // Seeding
  seedBuiltInTemplates,
};
