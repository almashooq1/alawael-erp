/**
 * administration.routes.js — نظام الإدارة
 * Unified routes for decisions/memos, correspondence, and delegations.
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../errors/errorHandler');
const { AppError } = require('../errors/AppError');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { escapeRegex } = require('../utils/sanitize');
const validateObjectId = require('../middleware/validateObjectId');

/* ━━━ Models ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
let AdminDecision, Correspondence, Delegation;
try {
  AdminDecision = require('../models/AdminDecision');
} catch {
  AdminDecision = null;
}
try {
  Correspondence = require('../models/Correspondence');
} catch {
  Correspondence = null;
}
try {
  Delegation = require('../models/Delegation');
} catch {
  Delegation = null;
}

/* ━━━ Helper ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const uid = req => req.user?._id || req.user?.id || 'system';
const uname = req => req.user?.name || req.user?.fullName || 'المستخدم';

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  DASHBOARD / STATS                                                        *
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const [
      totalDecisions,
      publishedDecisions,
      draftDecisions,
      pendingDecisions,
      totalCorr,
      incomingCorr,
      outgoingCorr,
      pendingCorr,
      totalDelegations,
      activeDelegations,
      expiredDelegations,
    ] = await Promise.all([
      AdminDecision ? AdminDecision.countDocuments() : 0,
      AdminDecision ? AdminDecision.countDocuments({ status: 'published' }) : 0,
      AdminDecision ? AdminDecision.countDocuments({ status: 'draft' }) : 0,
      AdminDecision ? AdminDecision.countDocuments({ status: 'pending_approval' }) : 0,
      Correspondence ? Correspondence.countDocuments() : 0,
      Correspondence ? Correspondence.countDocuments({ direction: 'incoming' }) : 0,
      Correspondence ? Correspondence.countDocuments({ direction: 'outgoing' }) : 0,
      Correspondence
        ? Correspondence.countDocuments({
            status: { $in: ['received', 'under_processing', 'pending_reply'] },
          })
        : 0,
      Delegation ? Delegation.countDocuments() : 0,
      Delegation ? Delegation.countDocuments({ status: 'active' }) : 0,
      Delegation ? Delegation.countDocuments({ status: 'expired' }) : 0,
    ]);

    // Overdue correspondence
    const overdueCorr = Correspondence
      ? await Correspondence.countDocuments({
          dueDate: { $lt: new Date() },
          status: { $nin: ['completed', 'archived'] },
        })
      : 0;

    // Recent items
    const recentDecisions = AdminDecision
      ? await AdminDecision.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('decisionNumber documentType title status createdAt priority')
      : [];

    const recentCorrespondence = Correspondence
      ? await Correspondence.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('referenceNumber direction correspondenceType subject status createdAt priority')
      : [];

    res.json({
      success: true,
      data: {
        decisions: {
          total: totalDecisions,
          published: publishedDecisions,
          draft: draftDecisions,
          pendingApproval: pendingDecisions,
        },
        correspondence: {
          total: totalCorr,
          incoming: incomingCorr,
          outgoing: outgoingCorr,
          pending: pendingCorr,
          overdue: overdueCorr,
        },
        delegations: {
          total: totalDelegations,
          active: activeDelegations,
          expired: expiredDelegations,
        },
        recentDecisions,
        recentCorrespondence,
      },
    });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  DECISIONS / MEMOS / CIRCULARS                                            *
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ─── List ────────────────────────────────────────────────────────────────── */
router.get(
  '/decisions',
  asyncHandler(async (req, res) => {
    if (!AdminDecision) return res.json({ success: true, data: [], total: 0 });
    const {
      status,
      documentType,
      category,
      priority,
      department,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (documentType) filter.documentType = documentType;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;
    if (search)
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { subject: { $regex: escapeRegex(search), $options: 'i' } },
        { decisionNumber: { $regex: escapeRegex(search), $options: 'i' } },
      ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      AdminDecision.find(filter)
        .select('-body -auditTrail -comments')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      AdminDecision.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: items,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  })
);

/* ─── Create ──────────────────────────────────────────────────────────────── */
router.post(
  '/decisions',
  validate([
    body('title').trim().notEmpty().withMessage('عنوان القرار مطلوب'),
    body('subject').trim().notEmpty().withMessage('موضوع القرار مطلوب'),
    body('body').trim().notEmpty().withMessage('نص القرار مطلوب'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('أولوية غير صالحة'),
  ]),
  asyncHandler(async (req, res) => {
    if (!AdminDecision) throw new AppError('Model unavailable', 503);
    const decisionNumber = await AdminDecision.generateDecisionNumber(
      req.body.documentType || 'decision'
    );
    const doc = new AdminDecision({
      ...req.body,
      decisionNumber,
      createdBy: uid(req),
      createdByName: uname(req),
    });
    doc.addAuditEntry('created', uid(req), uname(req), `تم إنشاء ${doc.documentType}`);
    await doc.save();
    res.status(201).json({ success: true, data: doc });
  })
);

/* ─── Get one ─────────────────────────────────────────────────────────────── */
router.get(
  '/decisions/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    if (!AdminDecision) throw new AppError('Model unavailable', 503);
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    res.json({ success: true, data: doc });
  })
);

/* ─── Update ──────────────────────────────────────────────────────────────── */
router.put(
  '/decisions/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    if (!AdminDecision) throw new AppError('Model unavailable', 503);
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    const allowed = [
      'title',
      'title_en',
      'subject',
      'body',
      'summary',
      'category',
      'priority',
      'confidentiality',
      'department',
      'issuingAuthority',
      'referenceNumber',
      'effectiveDate',
      'expiryDate',
      'isExpirable',
      'recipients',
      'sendToAll',
      'targetDepartments',
      'tags',
      'keywords',
    ];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) doc[k] = req.body[k];
    });
    doc.addAuditEntry('updated', uid(req), uname(req), 'تم تحديث البيانات');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Submit for review ───────────────────────────────────────────────────── */
router.post(
  '/decisions/:id/submit',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'under_review';
    doc.addAuditEntry('submitted', uid(req), uname(req), 'تم التقديم للمراجعة');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Approve ─────────────────────────────────────────────────────────────── */
router.post(
  '/decisions/:id/approve',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'approved';
    doc.approvedBy = uid(req);
    doc.approverName = uname(req);
    doc.approvedAt = new Date();
    doc.addAuditEntry('approved', uid(req), uname(req), 'تم الاعتماد');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Reject ──────────────────────────────────────────────────────────────── */
router.post(
  '/decisions/:id/reject',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'draft';
    doc.rejectedBy = uid(req);
    doc.rejectorName = uname(req);
    doc.rejectedAt = new Date();
    doc.rejectionReason = req.body.reason || '';
    doc.addAuditEntry('rejected', uid(req), uname(req), req.body.reason || 'تم الرفض');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Publish ─────────────────────────────────────────────────────────────── */
router.post(
  '/decisions/:id/publish',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'published';
    doc.publishedAt = new Date();
    doc.publishedBy = uid(req);
    doc.publisherName = uname(req);
    doc.addAuditEntry('published', uid(req), uname(req), 'تم النشر');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Archive ─────────────────────────────────────────────────────────────── */
router.post(
  '/decisions/:id/archive',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'archived';
    doc.addAuditEntry('archived', uid(req), uname(req), 'تم الأرشفة');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Revoke ──────────────────────────────────────────────────────────────── */
router.post(
  '/decisions/:id/revoke',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'revoked';
    doc.revokedAt = new Date();
    doc.revokedBy = uid(req);
    doc.revokerName = uname(req);
    doc.revocationReason = req.body.reason || '';
    doc.addAuditEntry('revoked', uid(req), uname(req), req.body.reason || 'تم الإلغاء');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Acknowledge ─────────────────────────────────────────────────────────── */
router.post(
  '/decisions/:id/acknowledge',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    const userId = uid(req);
    const r = doc.recipients.find(r => r.userId?.toString() === userId.toString());
    if (r && !r.acknowledged) {
      r.acknowledged = true;
      r.acknowledgedAt = new Date();
      doc.acknowledgedCount = (doc.acknowledgedCount || 0) + 1;
      doc.addAuditEntry('acknowledged', userId, uname(req), 'تم العلم');
      await doc.save();
    }
    res.json({ success: true, data: doc });
  })
);

/* ─── Add Comment ─────────────────────────────────────────────────────────── */
router.post(
  '/decisions/:id/comments',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.comments.push({ userId: uid(req), userName: uname(req), text: req.body.text });
    doc.addAuditEntry('commented', uid(req), uname(req), 'تم إضافة تعليق');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Delete Decision ─────────────────────────────────────────────────────── */
router.delete(
  '/decisions/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await AdminDecision.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'archived';
    doc.addAuditEntry('archived', uid(req), uname(req), 'تم الحذف / الأرشفة');
    await doc.save();
    res.json({ success: true, message: 'تم الأرشفة بنجاح' });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  CORRESPONDENCE                                                           *
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ─── List ────────────────────────────────────────────────────────────────── */
router.get(
  '/correspondence',
  asyncHandler(async (req, res) => {
    if (!Correspondence) return res.json({ success: true, data: [], total: 0 });
    const {
      direction,
      status,
      correspondenceType,
      category,
      priority,
      department,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;
    const filter = {};
    if (direction) filter.direction = direction;
    if (status) filter.status = status;
    if (correspondenceType) filter.correspondenceType = correspondenceType;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;
    if (search)
      filter.$or = [
        { subject: { $regex: escapeRegex(search), $options: 'i' } },
        { referenceNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { senderName: { $regex: escapeRegex(search), $options: 'i' } },
        { receiverName: { $regex: escapeRegex(search), $options: 'i' } },
      ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Correspondence.find(filter)
        .select('-auditTrail -routingHistory')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Correspondence.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: items,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  })
);

/* ─── Create ──────────────────────────────────────────────────────────────── */
router.post(
  '/correspondence',
  validate([
    body('subject').trim().notEmpty().withMessage('موضوع المراسلة مطلوب'),
    body('body').trim().notEmpty().withMessage('نص المراسلة مطلوب'),
    body('direction').isIn(['incoming', 'outgoing']).withMessage('اتجاه المراسلة غير صالح'),
  ]),
  asyncHandler(async (req, res) => {
    if (!Correspondence) throw new AppError('Model unavailable', 503);
    const refNum = await Correspondence.generateRefNumber(req.body.direction || 'incoming');
    const doc = new Correspondence({
      ...req.body,
      referenceNumber: refNum,
      createdBy: uid(req),
      createdByName: uname(req),
      currentHandler: uid(req),
      currentHandlerName: uname(req),
    });
    doc.addAuditEntry(
      'created',
      uid(req),
      uname(req),
      `تم تسجيل مراسلة ${req.body.direction === 'incoming' ? 'واردة' : 'صادرة'}`
    );
    await doc.save();
    res.status(201).json({ success: true, data: doc });
  })
);

/* ─── Get one ─────────────────────────────────────────────────────────────── */
router.get(
  '/correspondence/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    if (!Correspondence) throw new AppError('Model unavailable', 503);
    const doc = await Correspondence.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    res.json({ success: true, data: doc });
  })
);

/* ─── Update ──────────────────────────────────────────────────────────────── */
router.put(
  '/correspondence/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Correspondence.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    const allowed = [
      'subject',
      'body',
      'summary',
      'category',
      'priority',
      'confidentiality',
      'senderName',
      'senderOrg',
      'senderDepartment',
      'senderContact',
      'receiverName',
      'receiverOrg',
      'receiverDepartment',
      'receiverContact',
      'dueDate',
      'department',
      'tags',
      'externalRefNumber',
    ];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) doc[k] = req.body[k];
    });
    doc.addAuditEntry('updated', uid(req), uname(req), 'تم تحديث البيانات');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Forward ─────────────────────────────────────────────────────────────── */
router.post(
  '/correspondence/:id/forward',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Correspondence.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    const { toUserId, toName, toDept, notes } = req.body;
    doc.routingHistory.push({
      fromUser: uid(req),
      fromName: uname(req),
      fromDept: doc.currentDepartment,
      toUser: toUserId,
      toName,
      toDept,
      action: 'forwarded',
      notes,
    });
    doc.currentHandler = toUserId;
    doc.currentHandlerName = toName;
    doc.currentDepartment = toDept;
    doc.status = 'forwarded';
    doc.addAuditEntry('forwarded', uid(req), uname(req), `تم التحويل إلى ${toName}`);
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Complete ────────────────────────────────────────────────────────────── */
router.post(
  '/correspondence/:id/complete',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Correspondence.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'completed';
    doc.completedDate = new Date();
    doc.addAuditEntry('completed', uid(req), uname(req), req.body.notes || 'تم الإنجاز');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Archive ─────────────────────────────────────────────────────────────── */
router.post(
  '/correspondence/:id/archive',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Correspondence.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'archived';
    doc.archivedDate = new Date();
    doc.addAuditEntry('archived', uid(req), uname(req), 'تم الأرشفة');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Add Follow-up ───────────────────────────────────────────────────────── */
router.post(
  '/correspondence/:id/follow-up',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Correspondence.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.followUps.push({ ...req.body, createdBy: uname(req) });
    doc.addAuditEntry('follow_up_added', uid(req), uname(req), 'تم إضافة متابعة');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Reply ───────────────────────────────────────────────────────────────── */
router.post(
  '/correspondence/:id/reply',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Correspondence.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'replied';
    doc.addAuditEntry('replied', uid(req), uname(req), req.body.notes || 'تم الرد');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Delete Correspondence ───────────────────────────────────────────────── */
router.delete(
  '/correspondence/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Correspondence.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'archived';
    doc.archivedDate = new Date();
    doc.addAuditEntry('archived', uid(req), uname(req), 'تم الحذف / الأرشفة');
    await doc.save();
    res.json({ success: true, message: 'تم الأرشفة' });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  DELEGATIONS                                                              *
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ─── List ────────────────────────────────────────────────────────────────── */
router.get(
  '/delegations',
  asyncHandler(async (req, res) => {
    if (!Delegation) return res.json({ success: true, data: [], total: 0 });
    const {
      status,
      delegationType,
      department,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (delegationType) filter.delegationType = delegationType;
    if (department) filter.department = department;
    if (search)
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { delegationNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { delegatorName: { $regex: escapeRegex(search), $options: 'i' } },
        { delegateeName: { $regex: escapeRegex(search), $options: 'i' } },
      ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Delegation.find(filter)
        .select('-auditTrail -usageLogs')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Delegation.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: items,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  })
);

/* ─── Create ──────────────────────────────────────────────────────────────── */
router.post(
  '/delegations',
  validate([
    body('title').trim().notEmpty().withMessage('عنوان التفويض مطلوب'),
    body('startDate').notEmpty().withMessage('تاريخ البداية مطلوب'),
    body('endDate').notEmpty().withMessage('تاريخ الانتهاء مطلوب'),
  ]),
  asyncHandler(async (req, res) => {
    if (!Delegation) throw new AppError('Model unavailable', 503);
    const delegationNumber = await Delegation.generateDelegationNumber();
    const doc = new Delegation({
      ...req.body,
      delegationNumber,
      createdBy: uid(req),
      createdByName: uname(req),
    });
    doc.addAuditEntry('created', uid(req), uname(req), 'تم إنشاء التفويض');
    await doc.save();
    res.status(201).json({ success: true, data: doc });
  })
);

/* ─── Get one ─────────────────────────────────────────────────────────────── */
router.get(
  '/delegations/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    if (!Delegation) throw new AppError('Model unavailable', 503);
    const doc = await Delegation.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    res.json({ success: true, data: doc });
  })
);

/* ─── Update ──────────────────────────────────────────────────────────────── */
router.put(
  '/delegations/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Delegation.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    const allowed = [
      'title',
      'description',
      'reason',
      'scope',
      'restrictions',
      'maxTransactionAmount',
      'startDate',
      'endDate',
      'autoRenew',
      'notifyBeforeExpiry',
      'notifyOnUsage',
      'department',
      'tags',
    ];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) doc[k] = req.body[k];
    });
    doc.addAuditEntry('updated', uid(req), uname(req), 'تم تحديث التفويض');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Activate ────────────────────────────────────────────────────────────── */
router.post(
  '/delegations/:id/activate',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Delegation.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'active';
    doc.approvedBy = uid(req);
    doc.approverName = uname(req);
    doc.approvedAt = new Date();
    doc.addAuditEntry('activated', uid(req), uname(req), 'تم تفعيل التفويض');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Suspend ─────────────────────────────────────────────────────────────── */
router.post(
  '/delegations/:id/suspend',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Delegation.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'suspended';
    doc.addAuditEntry('deactivated', uid(req), uname(req), req.body.reason || 'تم تعليق التفويض');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Revoke ──────────────────────────────────────────────────────────────── */
router.post(
  '/delegations/:id/revoke',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Delegation.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'revoked';
    doc.addAuditEntry('revoked', uid(req), uname(req), req.body.reason || 'تم إلغاء التفويض');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Extend ──────────────────────────────────────────────────────────────── */
router.post(
  '/delegations/:id/extend',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Delegation.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    if (!req.body.newEndDate) throw new AppError('أدخل تاريخ انتهاء جديد', 400);
    doc.endDate = new Date(req.body.newEndDate);
    doc.renewalCount = (doc.renewalCount || 0) + 1;
    if (doc.status === 'expired') doc.status = 'active';
    doc.addAuditEntry('extended', uid(req), uname(req), `تم التمديد حتى ${req.body.newEndDate}`);
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Log usage ───────────────────────────────────────────────────────────── */
router.post(
  '/delegations/:id/use',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Delegation.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    if (!doc.isActive || (typeof doc.isActive === 'function' && !doc.isActive())) {
      throw new AppError('التفويض غير مفعّل حالياً', 400);
    }
    doc.usageLogs.push({
      action: req.body.action || 'استخدام',
      description: req.body.description,
      documentRef: req.body.documentRef,
      usedBy: uid(req),
      usedByName: uname(req),
    });
    doc.usageCount = (doc.usageCount || 0) + 1;
    doc.lastUsedAt = new Date();
    doc.addAuditEntry('used', uid(req), uname(req), req.body.description || 'تم استخدام التفويض');
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/* ─── Delete Delegation ───────────────────────────────────────────────────── */
router.delete(
  '/delegations/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const doc = await Delegation.findById(req.params.id);
    if (!doc) throw new AppError('غير موجود', 404);
    doc.status = 'revoked';
    doc.addAuditEntry('revoked', uid(req), uname(req), 'تم الحذف / الإلغاء');
    await doc.save();
    res.json({ success: true, message: 'تم الإلغاء' });
  })
);

module.exports = router;
