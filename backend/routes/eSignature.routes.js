/**
 * E-Signature Routes — Enhanced
 * مسارات التوقيع الإلكتروني — محسّنة
 *
 * Endpoints:
 *   GET  /stats                 Dashboard statistics
 *   GET  /templates/list        Template list (from DB)
 *   POST /templates             Create template
 *   PUT  /templates/:id         Update template
 *   GET  /                      List requests (filter/paginate)
 *   POST /                      Create request
 *   GET  /:id                   Get single request
 *   POST /:id/sign              Sign a document
 *   POST /:id/reject            Reject
 *   GET  /:id/verify            Verify document
 *   GET  /:id/audit             Audit trail
 *   POST /:id/delegate          Delegate signing
 *   POST /:id/remind            Send reminder
 *   POST /:id/cancel            Cancel request
 *   POST /:id/comment           Add comment
 *   POST /batch                 Batch send
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const ESignature = require('../models/ESignature');
const ESignatureTemplate = require('../models/ESignatureTemplate');
const { escapeRegex } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
/* ═══════════════════════════════════════════════════════════════════════════
   Dashboard Statistics
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      total,
      pending,
      inProgress,
      completed,
      rejected,
      expired,
      cancelled,
      thisMonth,
      lastMonth,
      templates,
    ] = await Promise.all([
      ESignature.countDocuments(),
      ESignature.countDocuments({ status: 'pending' }),
      ESignature.countDocuments({ status: 'in_progress' }),
      ESignature.countDocuments({ status: 'completed' }),
      ESignature.countDocuments({ status: 'rejected' }),
      ESignature.countDocuments({ status: 'expired' }),
      ESignature.countDocuments({ status: 'cancelled' }),
      ESignature.countDocuments({ createdAt: { $gte: startOfMonth } }),
      ESignature.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } }),
      ESignatureTemplate.countDocuments({ isActive: true }),
    ]);

    // Type breakdown
    const byType = await ESignature.aggregate([
      { $group: { _id: '$documentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyTrend = await ESignature.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Recent activity
    const recent = await ESignature.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('requestId documentTitle status priority updatedAt createdByName')
      .lean();

    // Average completion time (completed docs)
    const avgTime = await ESignature.aggregate([
      { $match: { status: 'completed', completedAt: { $exists: true } } },
      {
        $project: {
          duration: { $subtract: ['$completedAt', '$createdAt'] },
        },
      },
      { $group: { _id: null, avgMs: { $avg: '$duration' } } },
    ]);
    const avgCompletionHours =
      avgTime.length > 0 ? Math.round((avgTime[0].avgMs / 3600000) * 10) / 10 : 0;

    res.json({
      success: true,
      data: {
        counts: { total, pending, inProgress, completed, rejected, expired, cancelled },
        thisMonth,
        lastMonth,
        templates,
        byType,
        monthlyTrend,
        recent,
        avgCompletionHours,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      message: 'إحصائيات التوقيع الإلكتروني',
    });
  } catch (error) {
    safeError(res, error, 'fetching e-signature stats');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Templates — CRUD
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/templates/list', async (req, res) => {
  try {
    const { category, active } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';
    else filter.isActive = true;

    const data = await ESignatureTemplate.find(filter)
      .sort({ usageCount: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data, message: 'قوالب المستندات' });
  } catch (error) {
    safeError(res, error, 'fetching templates');
  }
});

router.post('/templates', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const tpl = await ESignatureTemplate.create({
      ...req.body,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: tpl, message: 'تم إنشاء القالب بنجاح' });
  } catch (error) {
    logger.error('Error creating template:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'كود القالب مستخدم بالفعل' });
    }
    safeError(res, error, 'eSignature');
  }
});

router.put('/templates/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const tpl = await ESignatureTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, version: undefined },
      { new: true, runValidators: true }
    );
    if (!tpl) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    tpl.version += 1;
    await tpl.save();
    res.json({ success: true, data: tpl, message: 'تم تحديث القالب' });
  } catch (error) {
    safeError(res, error, 'updating template');
  }
});

router.delete('/templates/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const tpl = await ESignatureTemplate.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!tpl) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, message: 'تم حذف القالب' });
  } catch (error) {
    safeError(res, error, 'deleting template');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   List Signature Requests
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const { status, priority, documentType, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (documentType) filter.documentType = documentType;
    if (search) {
      filter.$or = [
        { documentTitle: { $regex: escapeRegex(search), $options: 'i' } },
        { requestId: { $regex: escapeRegex(search), $options: 'i' } },
        { 'signers.name': { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      ESignature.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      ESignature.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) },
      message: 'قائمة طلبات التوقيع',
    });
  } catch (error) {
    safeError(res, error, 'fetching signature requests');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Get Single Request (with populated audit trail)
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'طلب التوقيع غير موجود' });
    res.json({ success: true, data: doc, message: 'بيانات طلب التوقيع' });
  } catch (error) {
    safeError(res, error, 'fetching signature request');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Create Signature Request
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/', authorize(['admin', 'manager', 'super_admin']), async (req, res) => {
  try {
    const {
      documentTitle,
      documentType,
      description,
      department,
      signers,
      priority,
      expiresAt,
      workflow,
      templateId,
      templateCode,
      fieldValues,
      tags,
    } = req.body;

    if (!documentTitle || !signers || signers.length === 0) {
      return res.status(400).json({ success: false, message: 'العنوان والموقعين مطلوبان' });
    }

    const requestId = await ESignature.generateRequestId();

    const doc = new ESignature({
      requestId,
      documentTitle,
      documentType: documentType || 'contract',
      description,
      department,
      signers: signers.map((s, i) => ({
        ...s,
        order: s.order || i + 1,
        status: 'pending',
        role: s.role || 'signer',
      })),
      priority: priority || 'medium',
      expiresAt,
      workflow: workflow || { sequential: true, requireAllSigners: true },
      templateId,
      templateCode,
      fieldValues,
      tags,
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.fullName || 'Unknown',
      status: 'pending',
      sentAt: new Date(),
    });

    doc.generateVerificationCode();
    doc.generateDocumentHash();
    doc.addAuditEntry(
      'created',
      req.user.id,
      req.user.name,
      'تم إنشاء طلب التوقيع',
      req.ip,
      req.get('user-agent')
    );
    doc.addAuditEntry(
      'sent',
      req.user.id,
      req.user.name,
      'تم إرسال الطلب للموقعين',
      req.ip,
      req.get('user-agent')
    );

    await doc.save();

    // Increment template usage if applicable
    if (templateId) {
      await ESignatureTemplate.findByIdAndUpdate(templateId, { $inc: { usageCount: 1 } });
    }

    res.status(201).json({ success: true, data: doc, message: 'تم إنشاء طلب التوقيع بنجاح' });
  } catch (error) {
    safeError(res, error, 'creating signature request');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Sign Document — Enhanced with signature types
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/sign', async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'طلب التوقيع غير موجود' });
    if (['completed', 'cancelled', 'expired'].includes(doc.status)) {
      return res.status(400).json({ success: false, message: 'لا يمكن التوقيع على هذا المستند' });
    }

    const { signatureType, signatureImage, signatureText, signatureFont } = req.body;

    // Find the signer — either by userId or by the first pending signer in sequential mode
    let signer = doc.signers.find(
      s => s.userId?.toString() === req.user.id && s.status === 'pending'
    );
    if (!signer && doc.workflow?.sequential) {
      signer = doc.signers.find(
        s => s.status === 'pending' && s.order === doc.workflow.currentStep
      );
    }
    if (!signer) {
      return res
        .status(403)
        .json({ success: false, message: 'غير مصرح لك بالتوقيع أو تم التوقيع مسبقاً' });
    }

    // Record signature
    signer.status = 'signed';
    signer.signedAt = new Date();
    signer.signatureType = signatureType || 'draw';
    signer.signatureImage = signatureImage;
    signer.signatureText = signatureText;
    signer.signatureFont = signatureFont;
    signer.ipAddress = req.ip;
    signer.userAgent = req.get('user-agent');

    // Generate hash for the signature
    const crypto = require('crypto');
    const sigData = `${doc._id}-${signer._id}-${signer.signedAt.toISOString()}`;
    signer.signatureHash = crypto.createHash('sha256').update(sigData).digest('hex');

    // Audit entry
    doc.addAuditEntry(
      'signed',
      req.user.id,
      signer.name,
      `وقّع ${signer.name} على المستند (${signatureType || 'draw'})`,
      req.ip,
      req.get('user-agent')
    );

    // Progress check
    const allActionable = doc.signers.filter(s => s.role !== 'cc');
    const allSigned = allActionable.every(s => s.status === 'signed');

    if (allSigned) {
      doc.status = 'completed';
      doc.completedAt = new Date();
      doc.addAuditEntry('created', null, 'النظام', 'اكتمل التوقيع على المستند');
    } else {
      doc.status = 'in_progress';
      if (doc.workflow?.sequential) {
        doc.workflow.currentStep = (doc.workflow.currentStep || 1) + 1;
      }
    }

    await doc.save();
    res.json({ success: true, data: doc, message: 'تم التوقيع بنجاح' });
  } catch (error) {
    safeError(res, error, 'signing document');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Reject Signature — Enhanced
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/reject', async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'طلب التوقيع غير موجود' });

    const signer = doc.signers.find(
      s => s.userId?.toString() === req.user.id && s.status === 'pending'
    );
    if (signer) {
      signer.status = 'rejected';
      signer.rejectedAt = new Date();
      signer.rejectionReason = req.body.reason || '';
    }

    doc.status = 'rejected';
    doc.addAuditEntry(
      'rejected',
      req.user.id,
      signer?.name || req.user.name,
      `رفض التوقيع: ${req.body.reason || 'بدون سبب'}`,
      req.ip,
      req.get('user-agent')
    );

    await doc.save();
    res.json({ success: true, data: doc, message: 'تم رفض التوقيع' });
  } catch (error) {
    safeError(res, error, 'rejecting signature');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Verify Signature — Enhanced
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/:id/verify', async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    const allActionable = doc.signers.filter(s => s.role !== 'cc');
    const isValid = doc.status === 'completed' && allActionable.every(s => s.status === 'signed');

    res.json({
      success: true,
      data: {
        isValid,
        requestId: doc.requestId,
        documentTitle: doc.documentTitle,
        documentType: doc.documentType,
        status: doc.status,
        verificationCode: doc.verificationCode,
        documentHash: doc.documentHash,
        createdAt: doc.createdAt,
        completedAt: doc.completedAt,
        createdByName: doc.createdByName,
        signersStatus: doc.signers.map(s => ({
          name: s.name,
          role: s.role,
          status: s.status,
          signedAt: s.signedAt,
          signatureType: s.signatureType,
          signatureHash: s.signatureHash,
        })),
        auditTrail: doc.auditTrail,
      },
      message: isValid ? 'المستند موثق بالكامل' : 'المستند لم يكتمل توثيقه',
    });
  } catch (error) {
    safeError(res, error, 'verifying signature');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Verify by Code (public-ish, still behind auth)
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/verify-code/:code', async (req, res) => {
  try {
    const doc = await ESignature.findOne({ verificationCode: req.params.code }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'رمز التحقق غير صالح' });

    const isValid = doc.status === 'completed';
    res.json({
      success: true,
      data: {
        isValid,
        requestId: doc.requestId,
        documentTitle: doc.documentTitle,
        status: doc.status,
        completedAt: doc.completedAt,
        signersCount: doc.signers.length,
        signedCount: doc.signers.filter(s => s.status === 'signed').length,
      },
      message: isValid ? 'المستند موثق' : 'المستند غير مكتمل',
    });
  } catch (error) {
    safeError(res, error, 'verifying by code');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Audit Trail
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/:id/audit', async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id)
      .select('requestId documentTitle auditTrail status')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    res.json({
      success: true,
      data: {
        requestId: doc.requestId,
        documentTitle: doc.documentTitle,
        status: doc.status,
        trail: doc.auditTrail.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      },
      message: 'سجل التدقيق',
    });
  } catch (error) {
    safeError(res, error, 'fetching audit trail');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Delegate Signing
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/delegate', async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (!doc.workflow?.allowDelegation) {
      return res.status(400).json({ success: false, message: 'التفويض غير مسموح لهذا المستند' });
    }

    const { delegateToId, delegateToName, reason } = req.body;
    const signer = doc.signers.find(
      s => s.userId?.toString() === req.user.id && s.status === 'pending'
    );
    if (!signer) return res.status(403).json({ success: false, message: 'لا يمكنك تفويض التوقيع' });

    signer.status = 'delegated';
    signer.delegatedTo = delegateToId;
    signer.delegatedToName = delegateToName;
    signer.delegatedAt = new Date();
    signer.delegationReason = reason;

    // Add new signer entry for the delegate
    doc.signers.push({
      userId: delegateToId,
      name: delegateToName,
      email: req.body.delegateEmail || '',
      role: signer.role,
      order: signer.order,
      status: 'pending',
    });

    doc.addAuditEntry(
      'delegated',
      req.user.id,
      signer.name,
      `تم تفويض التوقيع إلى ${delegateToName}: ${reason || ''}`,
      req.ip,
      req.get('user-agent')
    );

    await doc.save();
    res.json({ success: true, data: doc, message: 'تم تفويض التوقيع بنجاح' });
  } catch (error) {
    safeError(res, error, 'delegating signature');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Send Reminder
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/remind', authorize(['admin', 'manager', 'super_admin']), async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    const pendingSigners = doc.signers.filter(s => s.status === 'pending');
    if (pendingSigners.length === 0) {
      return res.status(400).json({ success: false, message: 'لا يوجد موقعون معلقون' });
    }

    pendingSigners.forEach(s => {
      s.remindersSent = (s.remindersSent || 0) + 1;
      s.lastReminderAt = new Date();
    });

    doc.addAuditEntry(
      'reminded',
      req.user.id,
      req.user.name,
      `تم إرسال تذكير لـ ${pendingSigners.length} موقعين`,
      req.ip,
      req.get('user-agent')
    );

    await doc.save();
    res.json({
      success: true,
      data: { remindedCount: pendingSigners.length },
      message: `تم إرسال تذكير لـ ${pendingSigners.length} موقعين`,
    });
  } catch (error) {
    safeError(res, error, 'sending reminder');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Cancel Request
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/cancel', authorize(['admin', 'manager', 'super_admin']), async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (['completed', 'cancelled'].includes(doc.status)) {
      return res.status(400).json({ success: false, message: 'لا يمكن إلغاء هذا الطلب' });
    }

    doc.status = 'cancelled';
    doc.cancelledAt = new Date();
    doc.addAuditEntry(
      'cancelled',
      req.user.id,
      req.user.name,
      `تم إلغاء الطلب: ${req.body.reason || ''}`,
      req.ip,
      req.get('user-agent')
    );

    await doc.save();
    res.json({ success: true, data: doc, message: 'تم إلغاء الطلب' });
  } catch (error) {
    safeError(res, error, 'cancelling request');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Add Comment
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/:id/comment', async (req, res) => {
  try {
    const doc = await ESignature.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'نص التعليق مطلوب' });

    doc.comments.push({
      userId: req.user.id,
      userName: req.user.name || req.user.fullName,
      text,
    });

    doc.addAuditEntry(
      'comment_added',
      req.user.id,
      req.user.name,
      `تعليق: ${text.slice(0, 100)}`,
      req.ip,
      req.get('user-agent')
    );

    await doc.save();
    res.json({ success: true, data: doc.comments, message: 'تم إضافة التعليق' });
  } catch (error) {
    safeError(res, error, 'adding comment');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Batch Create — Send same doc to multiple groups
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/batch', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const { documentTitle, documentType, signerGroups, priority, expiresAt, workflow } = req.body;
    if (!documentTitle || !signerGroups || signerGroups.length === 0) {
      return res.status(400).json({ success: false, message: 'البيانات المطلوبة ناقصة' });
    }

    const crypto = require('crypto');
    const batchId = `BATCH-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const results = [];

    for (const group of signerGroups) {
      const requestId = await ESignature.generateRequestId();
      const doc = new ESignature({
        requestId,
        documentTitle,
        documentType: documentType || 'contract',
        signers: group.map((s, i) => ({ ...s, order: i + 1, status: 'pending' })),
        priority: priority || 'medium',
        expiresAt,
        workflow,
        batchId,
        createdBy: req.user.id,
        createdByName: req.user.name,
        status: 'pending',
        sentAt: new Date(),
      });
      doc.generateVerificationCode();
      doc.generateDocumentHash();
      doc.addAuditEntry('created', req.user.id, req.user.name, 'تم إنشاء طلب دفعة');
      await doc.save();
      results.push(doc);
    }

    res.status(201).json({
      success: true,
      data: { batchId, count: results.length, requests: results },
      message: `تم إنشاء ${results.length} طلبات توقيع`,
    });
  } catch (error) {
    safeError(res, error, 'creating batch');
  }
});

module.exports = router;
