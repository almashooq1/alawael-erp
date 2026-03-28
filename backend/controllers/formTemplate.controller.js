/* eslint-disable no-unused-vars */
/**
 * Form Template Controller — وحدة تحكم النماذج الجاهزة
 * Handles HTTP request/response for form templates & submissions.
 *
 * @module controllers/formTemplate.controller
 * @created 2026-03-14
 */

const formTemplateService = require('../services/formTemplate.service');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
// ═══════════════════════════════════════════════════════════════
// 📋 TEMPLATE CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/form-templates
 * List all templates with optional filters
 */
const listTemplates = async (req, res) => {
  try {
    const result = await formTemplateService.listTemplates(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('[FormTemplates] listTemplates error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب النماذج' });
  }
};

/**
 * GET /api/form-templates/categories
 * Get template categories with counts
 */
const getCategories = async (req, res) => {
  try {
    const categories = await formTemplateService.getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    logger.error('[FormTemplates] getCategories error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التصنيفات' });
  }
};

/**
 * GET /api/form-templates/stats
 * Get submission statistics
 */
const getStats = async (req, res) => {
  try {
    const result = await formTemplateService.getStats();
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('[FormTemplates] getStats error:', error);
    // Return safe defaults
    res.json({
      success: true,
      stats: {
        totalTemplates: 0,
        totalSubmissions: 0,
        pendingSubmissions: 0,
        approvedSubmissions: 0,
        rejectedSubmissions: 0,
      },
      recentSubmissions: [],
    });
  }
};

/**
 * GET /api/form-templates/:id
 * Get a single template by templateId or ObjectId
 */
const getTemplate = async (req, res) => {
  try {
    const template = await formTemplateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'النموذج غير موجود' });
    }
    res.json({ success: true, template });
  } catch (error) {
    logger.error('[FormTemplates] getTemplate error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في جلب النموذج' });
  }
};

/**
 * POST /api/form-templates
 * Create a new custom template
 */
const createTemplate = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name, tenantId: req.tenantId };
    const template = await formTemplateService.createTemplate(req.body, user);
    res.status(201).json({ success: true, template, message: 'تم إنشاء النموذج بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] createTemplate error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في إنشاء النموذج' });
  }
};

/**
 * PUT /api/form-templates/:id
 * Update an existing template
 */
const updateTemplate = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const template = await formTemplateService.updateTemplate(req.params.id, req.body, user);
    res.json({ success: true, template, message: 'تم تحديث النموذج بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] updateTemplate error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في تحديث النموذج' });
  }
};

/**
 * DELETE /api/form-templates/:id
 * Soft delete a template
 */
const deleteTemplate = async (req, res) => {
  try {
    await formTemplateService.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'تم حذف النموذج بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] deleteTemplate error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في حذف النموذج' });
  }
};

/**
 * POST /api/form-templates/:id/clone
 * Clone a template
 */
const cloneTemplate = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name, tenantId: req.tenantId };
    const template = await formTemplateService.cloneTemplate(req.params.id, req.body.name, user);
    res.status(201).json({ success: true, template, message: 'تم نسخ النموذج بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] cloneTemplate error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في نسخ النموذج' });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🎨 DESIGN ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * PUT /api/form-templates/:id/design
 * Update full design settings
 */
const updateDesign = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const template = await formTemplateService.updateDesign(req.params.id, req.body, user);
    res.json({ success: true, template, message: 'تم تحديث التصميم بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] updateDesign error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في تحديث التصميم' });
  }
};

/**
 * PUT /api/form-templates/:id/logo
 * Upload / set main logo
 */
const setLogo = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const template = await formTemplateService.setLogo(req.params.id, req.body, user);
    res.json({ success: true, template, message: 'تم تحديث الشعار بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] setLogo error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في تحديث الشعار' });
  }
};

/**
 * PUT /api/form-templates/:id/secondary-logo
 * Upload / set secondary logo
 */
const setSecondaryLogo = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const template = await formTemplateService.setSecondaryLogo(req.params.id, req.body, user);
    res.json({ success: true, template, message: 'تم تحديث الشعار الثانوي بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] setSecondaryLogo error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في تحديث الشعار الثانوي' });
  }
};

/**
 * PUT /api/form-templates/:id/header
 * Update header design
 */
const updateHeader = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const template = await formTemplateService.updateHeader(req.params.id, req.body, user);
    res.json({ success: true, template, message: 'تم تحديث رأس النموذج بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] updateHeader error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في تحديث رأس النموذج' });
  }
};

/**
 * PUT /api/form-templates/:id/footer
 * Update footer design
 */
const updateFooter = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const template = await formTemplateService.updateFooter(req.params.id, req.body, user);
    res.json({ success: true, template, message: 'تم تحديث تذييل النموذج بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] updateFooter error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في تحديث تذييل النموذج' });
  }
};

// ═══════════════════════════════════════════════════════════════
// 📜 VERSION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/form-templates/:id/versions
 * Get version history
 */
const getVersionHistory = async (req, res) => {
  try {
    const result = await formTemplateService.getVersionHistory(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('[FormTemplates] getVersionHistory error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في جلب سجل الإصدارات' });
  }
};

/**
 * POST /api/form-templates/:id/versions/:version/restore
 * Restore a previous version
 */
const restoreVersion = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const template = await formTemplateService.restoreVersion(
      req.params.id,
      parseInt(req.params.version),
      user
    );
    res.json({
      success: true,
      template,
      message: `تم استعادة الإصدار ${req.params.version} بنجاح`,
    });
  } catch (error) {
    logger.error('[FormTemplates] restoreVersion error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في استعادة الإصدار' });
  }
};

// ═══════════════════════════════════════════════════════════════
// 📝 SUBMISSION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/form-templates/:id/submit
 * Submit a filled form
 */
const submitForm = async (req, res) => {
  try {
    const user = {
      id: req.user?.id,
      name: req.user?.name,
      email: req.user?.email,
      role: req.user?.role,
      phone: req.user?.phone,
      tenantId: req.tenantId,
    };
    const options = {
      notes: req.body.notes,
      submitterName: req.body.submitterName,
      department: req.body.department,
      isDraft: req.body.isDraft,
      priority: req.body.priority,
      dueDate: req.body.dueDate,
    };

    const submission = await formTemplateService.submitForm(
      req.params.id,
      req.body.data,
      user,
      options
    );

    res.status(201).json({
      success: true,
      submission: {
        id: submission._id,
        submissionNumber: submission.submissionNumber,
        status: submission.status,
        templateName: submission.templateName,
      },
      message:
        submission.status === 'approved'
          ? 'تم إرسال النموذج والموافقة عليه تلقائياً'
          : submission.status === 'draft'
            ? 'تم حفظ المسودة بنجاح'
            : 'تم إرسال النموذج بنجاح وهو بانتظار المراجعة',
    });
  } catch (error) {
    logger.error('[FormTemplates] submitForm error:', error);
    const response = { success: false, message: safeError(error) || 'خطأ في إرسال النموذج' };
    if (error.validationErrors) response.errors = error.validationErrors;
    res.status(error.status || 500).json(response);
  }
};

/**
 * GET /api/form-templates/submissions/my
 * Get current user's submissions
 */
const getMySubmissions = async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await formTemplateService.getUserSubmissions(userId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('[FormTemplates] getMySubmissions error:', error);
    res.json({ success: true, submissions: [], pagination: { page: 1, limit: 20, total: 0 } });
  }
};

/**
 * GET /api/form-templates/submissions/pending
 * Get pending submissions for approval
 */
const getPendingSubmissions = async (req, res) => {
  try {
    const result = await formTemplateService.getPendingSubmissions({
      role: req.user?.role,
      ...req.query,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('[FormTemplates] getPendingSubmissions error:', error);
    res.json({ success: true, submissions: [], pagination: { page: 1, limit: 50, total: 0 } });
  }
};

/**
 * GET /api/form-templates/submissions/:submissionId
 * Get a single submission
 */
const getSubmission = async (req, res) => {
  try {
    const submission = await formTemplateService.getSubmissionById(req.params.submissionId);
    res.json({ success: true, submission });
  } catch (error) {
    logger.error('[FormTemplates] getSubmission error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في جلب الطلب' });
  }
};

/**
 * PUT /api/form-templates/submissions/:submissionId/approve
 * Approve a submission
 */
const approveSubmission = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const submission = await formTemplateService.approveSubmission(
      req.params.submissionId,
      user,
      req.body.comment
    );
    res.json({ success: true, submission, message: 'تم اعتماد الطلب بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] approveSubmission error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في اعتماد الطلب' });
  }
};

/**
 * PUT /api/form-templates/submissions/:submissionId/reject
 * Reject a submission
 */
const rejectSubmission = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const submission = await formTemplateService.rejectSubmission(
      req.params.submissionId,
      user,
      req.body.comment
    );
    res.json({ success: true, submission, message: 'تم رفض الطلب' });
  } catch (error) {
    logger.error('[FormTemplates] rejectSubmission error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في رفض الطلب' });
  }
};

/**
 * PUT /api/form-templates/submissions/:submissionId/return
 * Return a submission for revision
 */
const returnSubmission = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const submission = await formTemplateService.returnSubmission(
      req.params.submissionId,
      user,
      req.body.reason || req.body.comment
    );
    res.json({ success: true, submission, message: 'تم إرجاع الطلب للتعديل' });
  } catch (error) {
    logger.error('[FormTemplates] returnSubmission error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في إرجاع الطلب' });
  }
};

/**
 * PUT /api/form-templates/submissions/:submissionId/resubmit
 * Resubmit after revision
 */
const resubmitForm = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name };
    const submission = await formTemplateService.resubmitForm(
      req.params.submissionId,
      req.body.data,
      user,
      req.body.reason
    );
    res.json({ success: true, submission, message: 'تم إعادة إرسال الطلب بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] resubmitForm error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في إعادة الإرسال' });
  }
};

/**
 * POST /api/form-templates/submissions/:submissionId/comments
 * Add a comment to a submission
 */
const addComment = async (req, res) => {
  try {
    const user = { id: req.user?.id, name: req.user?.name, role: req.user?.role };
    const submission = await formTemplateService.addComment(
      req.params.submissionId,
      user,
      req.body.text,
      req.body.type,
      req.body.isInternal
    );
    res.json({ success: true, submission, message: 'تم إضافة التعليق بنجاح' });
  } catch (error) {
    logger.error('[FormTemplates] addComment error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في إضافة التعليق' });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🖨️ RENDER / PREVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/form-templates/:id/preview
 * Preview template with sample data (HTML)
 */
const previewTemplate = async (req, res) => {
  try {
    const template = await formTemplateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'النموذج غير موجود' });
    }

    // Generate sample data
    const sampleData = {};
    for (const field of template.fields || []) {
      if (['header', 'divider', 'paragraph', 'spacer'].includes(field.type)) continue;
      if (field.defaultValue !== undefined) {
        sampleData[field.name] = field.defaultValue;
      } else if (field.type === 'text' || field.type === 'textarea') {
        sampleData[field.name] = `[${field.label}]`;
      } else if (field.type === 'number') {
        sampleData[field.name] = 0;
      } else if (field.type === 'date') {
        sampleData[field.name] = new Date().toISOString().split('T')[0];
      } else if (field.type === 'select' || field.type === 'radio') {
        sampleData[field.name] = field.options?.[0]?.value || '';
      } else if (field.type === 'checkbox' || field.type === 'toggle') {
        sampleData[field.name] = false;
      } else if (field.type === 'rating') {
        sampleData[field.name] = 3;
      }
    }

    const html = formTemplateService.renderSubmissionHtml(template, {
      data: sampleData,
      submissionNumber: 'PREVIEW-001',
    });

    if (req.query.format === 'json') {
      return res.json({
        success: true,
        html,
        template: { name: template.name, design: template.design },
      });
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    logger.error('[FormTemplates] previewTemplate error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في معاينة النموذج' });
  }
};

/**
 * GET /api/form-templates/submissions/:submissionId/render
 * Render a submission as HTML
 */
const renderSubmission = async (req, res) => {
  try {
    const submission = await formTemplateService.getSubmissionById(req.params.submissionId);
    const template = await formTemplateService.getTemplateById(submission.templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'النموذج غير موجود' });
    }

    const html = formTemplateService.renderSubmissionHtml(template, submission);

    if (req.query.format === 'json') {
      return res.json({ success: true, html });
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    logger.error('[FormTemplates] renderSubmission error:', error);
    res
      .status(error.status || 500)
      .json({ success: false, message: safeError(error) || 'خطأ في عرض الطلب' });
  }
};

// ═══════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Template CRUD
  listTemplates,
  getCategories,
  getStats,
  getTemplate,
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
  getMySubmissions,
  getPendingSubmissions,
  getSubmission,
  approveSubmission,
  rejectSubmission,
  returnSubmission,
  resubmitForm,
  addComment,

  // Rendering
  previewTemplate,
  renderSubmission,
};
