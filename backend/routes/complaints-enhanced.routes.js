/**
 * Complaints Enhanced Routes — مسارات الشكاوى والملاحظات المحسّنة (البرومبت 31)
 * ComplaintV2, ComplaintCategory, ComplaintSlaConfig, CrmFeedback
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const {
  ComplaintV2,
  ComplaintCategory,
  ComplaintSlaConfig,
  CrmFeedback,
} = require('../models/ComplaintEnhanced');
const escapeRegex = require('../utils/escapeRegex');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════
// ── COMPLAINTS V2 ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/complaints-enhanced — list complaints */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      status,
      priority,
      category,
      assignedTo,
      slaBreached,
      dateFrom,
      dateTo,
      branchId,
      page = 1,
      limit = 15,
    } = req.query;

    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (slaBreached !== undefined) filter.slaBreached = slaBreached === 'true';
    if (search) {
      filter.$or = [
        { subject: { $regex: escapeRegex(search), $options: 'i' } },
        { complaintNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { complainantName: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      ComplaintV2.find(filter)
        .populate('assignedTo', 'name email')
        .populate('departmentId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-workflowSteps')
        .lean(),
      ComplaintV2.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'Complaints list error');
  }
});

/** GET /api/complaints-enhanced/stats — dashboard stats */
router.get('/stats', async (req, res) => {
  try {
    const { branchId } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    const closedStatuses = ['resolved', 'closed', 'rejected'];

    const [total, open, slaBreached, resolvedToday, byStatus, byPriority, byCategory, bySentiment] =
      await Promise.all([
        ComplaintV2.countDocuments(filter),
        ComplaintV2.countDocuments({ ...filter, status: { $nin: closedStatuses } }),
        ComplaintV2.countDocuments({
          ...filter,
          slaBreached: true,
          status: { $nin: closedStatuses },
        }),
        ComplaintV2.countDocuments({
          ...filter,
          status: 'resolved',
          resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
        ComplaintV2.aggregate([
          { $match: filter },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        ComplaintV2.aggregate([
          { $match: filter },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
        ComplaintV2.aggregate([
          { $match: { ...filter, category: { $ne: null } } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        ComplaintV2.aggregate([
          { $match: { ...filter, sentiment: { $ne: null } } },
          { $group: { _id: '$sentiment', count: { $sum: 1 } } },
        ]),
      ]);

    // Average resolution time
    const avgResolution = await ComplaintV2.aggregate([
      { $match: { ...filter, status: 'resolved', resolvedAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgHours: {
            $avg: {
              $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000],
            },
          },
        },
      },
    ]);

    const satisfactionAvg = await ComplaintV2.aggregate([
      { $match: { ...filter, satisfactionRating: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$satisfactionRating' } } },
    ]);

    res.json({
      success: true,
      data: {
        total,
        open,
        slaBreached,
        resolvedToday,
        avgResolutionHours: Math.round((avgResolution[0]?.avgHours || 0) * 10) / 10,
        satisfactionAvg: Math.round((satisfactionAvg[0]?.avg || 0) * 10) / 10,
        byStatus,
        byPriority,
        byCategory,
        bySentiment,
      },
    });
  } catch (err) {
    safeError(res, err, 'Complaints stats error');
  }
});

/** GET /api/complaints-enhanced/analytics — detailed analytics report */
router.get('/analytics', async (req, res) => {
  try {
    const { branchId, dateFrom, dateTo } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59');
    }

    const [byStatus, byPriority, byCategory, byChannel, bySentiment, dailyTrend, slaCompliance] =
      await Promise.all([
        ComplaintV2.aggregate([
          { $match: filter },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        ComplaintV2.aggregate([
          { $match: filter },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
        ComplaintV2.aggregate([
          { $match: filter },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        ComplaintV2.aggregate([
          { $match: filter },
          { $group: { _id: '$channel', count: { $sum: 1 } } },
        ]),
        ComplaintV2.aggregate([
          { $match: filter },
          { $group: { _id: '$sentiment', count: { $sum: 1 } } },
        ]),
        ComplaintV2.aggregate([
          { $match: filter },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        {
          total: await ComplaintV2.countDocuments(filter),
          breached: await ComplaintV2.countDocuments({ ...filter, slaBreached: true }),
          onTime: await ComplaintV2.countDocuments({
            ...filter,
            slaBreached: false,
            status: { $in: ['resolved', 'closed'] },
          }),
        },
      ]);

    res.json({
      success: true,
      data: { byStatus, byPriority, byCategory, byChannel, bySentiment, dailyTrend, slaCompliance },
    });
  } catch (err) {
    safeError(res, err, 'Complaints analytics error');
  }
});

/** GET /api/complaints-enhanced/form-options */
router.get('/form-options', async (req, res) => {
  try {
    const { branchId } = req.query;
    const branchFilter = branchId ? { branchId, deletedAt: null } : { deletedAt: null };

    const categories = await ComplaintCategory.find({ ...branchFilter, isActive: true })
      .select('name nameAr parentId slaHours defaultPriority')
      .sort({ sortOrder: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        statuses: [
          { value: 'submitted', label: 'مُقدَّمة' },
          { value: 'acknowledged', label: 'مُستلَمة' },
          { value: 'under_review', label: 'قيد المراجعة' },
          { value: 'escalated', label: 'مُصعَّدة' },
          { value: 'resolved', label: 'محلولة' },
          { value: 'closed', label: 'مغلقة' },
          { value: 'rejected', label: 'مرفوضة' },
        ],
        priorities: [
          { value: 'low', label: 'منخفضة' },
          { value: 'medium', label: 'متوسطة' },
          { value: 'high', label: 'عالية' },
          { value: 'critical', label: 'حرجة' },
        ],
        channels: [
          { value: 'web', label: 'موقع إلكتروني' },
          { value: 'phone', label: 'هاتف' },
          { value: 'email', label: 'بريد إلكتروني' },
          { value: 'walk_in', label: 'زيارة مباشرة' },
          { value: 'whatsapp', label: 'واتساب' },
          { value: 'social_media', label: 'وسائل التواصل' },
          { value: 'postal', label: 'بريد عادي' },
        ],
        complainantTypes: [
          { value: 'patient', label: 'مريض / مستفيد' },
          { value: 'guardian', label: 'ولي الأمر' },
          { value: 'visitor', label: 'زائر' },
          { value: 'employee', label: 'موظف' },
          { value: 'anonymous', label: 'مجهول الهوية' },
          { value: 'other', label: 'أخرى' },
        ],
        categories,
      },
    });
  } catch (err) {
    safeError(res, err, 'Complaints form-options error');
  }
});

/** GET /api/complaints-enhanced/public-form — public complaint portal */
router.get('/public-form', async (req, res) => {
  try {
    const { branchId } = req.query;
    const branchFilter = branchId ? { branchId, deletedAt: null } : { deletedAt: null };
    const categories = await ComplaintCategory.find({ ...branchFilter, isActive: true })
      .select('name nameAr')
      .sort({ sortOrder: 1 })
      .lean();
    res.json({ success: true, data: { categories } });
  } catch (err) {
    safeError(res, err, 'Public form error');
  }
});

/** POST /api/complaints-enhanced/public-submit — public portal submission */
router.post('/public-submit', async (req, res) => {
  try {
    const { complainantName, complainantPhone, subject, description, channel } = req.body;
    if (!complainantName || !subject || !description)
      return res.status(400).json({
        success: false,
        message: 'الاسم والموضوع والوصف مطلوبون',
      });

    const branchId = req.headers['x-branch-id'] || req.body.branchId;
    if (!branchId) return res.status(400).json({ success: false, message: 'معرّف الفرع مطلوب' });

    const complaintNumber = await ComplaintV2.generateNumber(branchId);
    const aiResult = ComplaintV2.classifyWithAI(description, subject);

    // Get SLA config
    const slaConfig = await ComplaintSlaConfig.findOne({
      branchId,
      priority: aiResult?.priority || 'medium',
      isActive: true,
    });
    const slaHours = slaConfig?.resolutionHours || 72;
    const slaDueAt = new Date(Date.now() + slaHours * 3600000);

    const complaint = new ComplaintV2({
      branchId,
      complaintNumber,
      complainantName,
      complainantPhone,
      complainantType: req.body.complainantType || 'patient',
      channel: channel || 'web',
      subject,
      description,
      priority: aiResult?.priority || 'medium',
      category: aiResult?.category || null,
      sentiment: aiResult?.sentiment || null,
      sentimentScore: aiResult?.score || null,
      aiClassification: aiResult,
      slaDueAt,
    });

    complaint.workflowSteps.push({
      branchId,
      complaintId: complaint._id,
      action: 'submitted',
      notes: `تم تقديم الشكوى عبر ${channel || 'web'}`,
      performedAt: new Date(),
    });

    await complaint.save();

    res.status(201).json({
      success: true,
      message: `تم استلام شكواك بنجاح. رقم الشكوى: ${complaintNumber}`,
      complaintNumber,
    });
  } catch (err) {
    safeError(res, err, 'Public submit error');
  }
});

/** GET /api/complaints-enhanced/:id */
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const complaint = await ComplaintV2.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('departmentId', 'name')
      .populate('patientId', 'name fileNumber')
      .populate('escalatedTo', 'name email')
      .lean();
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, data: complaint });
  } catch (err) {
    safeError(res, err, 'Complaint detail error');
  }
});

/** POST /api/complaints-enhanced — create complaint */
router.post('/', async (req, res) => {
  try {
    const { complainantName, subject, description, channel, branchId } = req.body;
    if (!complainantName || !subject || !description)
      return res.status(400).json({ success: false, message: 'الاسم والموضوع والوصف مطلوبون' });

    const effectiveBranchId = branchId || req.user?.branchId;
    const complaintNumber = await ComplaintV2.generateNumber(effectiveBranchId);
    const aiResult = ComplaintV2.classifyWithAI(description, subject);

    const slaConfig = await ComplaintSlaConfig.findOne({
      branchId: effectiveBranchId,
      priority: req.body.priority || aiResult?.priority || 'medium',
      isActive: true,
    });
    const slaHours = slaConfig?.resolutionHours || 72;

    const complaint = new ComplaintV2({
      ...req.body,
      branchId: effectiveBranchId,
      complaintNumber,
      priority: req.body.priority || aiResult?.priority || 'medium',
      category: req.body.category || aiResult?.category || null,
      sentiment: aiResult?.sentiment || null,
      sentimentScore: aiResult?.score || null,
      aiClassification: aiResult,
      slaDueAt: new Date(Date.now() + slaHours * 3600000),
      createdBy: req.user?._id || req.userId,
    });

    complaint.workflowSteps.push({
      branchId: effectiveBranchId,
      complaintId: complaint._id,
      action: 'submitted',
      notes: `تم تقديم الشكوى عبر ${channel || 'النظام'}`,
      performedAt: new Date(),
      createdBy: req.user?._id || req.userId,
    });

    await complaint.save();
    res.status(201).json({ success: true, data: complaint, message: 'تم تسجيل الشكوى بنجاح' });
  } catch (err) {
    safeError(res, err, 'Complaint create error');
  }
});

/** PUT /api/complaints-enhanced/:id — update complaint */
router.put(
  '/:id',
  authorize(['admin', 'super_admin', 'manager', 'complaints_agent']),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
      const complaint = await ComplaintV2.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user?._id || req.userId },
        { new: true, runValidators: true }
      );
      if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      res.json({ success: true, data: complaint, message: 'تم تحديث الشكوى بنجاح' });
    } catch (err) {
      safeError(res, err, 'Complaint update error');
    }
  }
);

/** POST /api/complaints-enhanced/:id/status — change status */
router.post(
  '/:id/status',
  authorize(['admin', 'super_admin', 'manager', 'complaints_agent']),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

      const { status, notes, resolutionNotes, isInternal } = req.body;
      if (!status) return res.status(400).json({ success: false, message: 'الحالة مطلوبة' });

      const validStatuses = ['acknowledged', 'under_review', 'resolved', 'closed', 'rejected'];
      if (!validStatuses.includes(status))
        return res.status(400).json({ success: false, message: 'حالة غير صالحة' });

      const complaint = await ComplaintV2.findById(req.params.id);
      if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });

      const oldStatus = complaint.status;
      const updateData = { status, updatedBy: req.user?._id || req.userId };

      if (status === 'acknowledged') updateData.acknowledgedAt = new Date();
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
        if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
      }
      if (status === 'closed') updateData.closedAt = new Date();

      complaint.workflowSteps.push({
        branchId: complaint.branchId,
        complaintId: complaint._id,
        action: status,
        notes: notes || null,
        fromStatus: oldStatus,
        toStatus: status,
        isInternal: isInternal || false,
        performedBy: req.user?._id || req.userId,
        performedAt: new Date(),
        createdBy: req.user?._id || req.userId,
      });

      Object.assign(complaint, stripUpdateMeta(updateData));
      await complaint.save();

      res.json({ success: true, data: complaint, message: 'تم تحديث الحالة بنجاح' });
    } catch (err) {
      safeError(res, err, 'Complaint status change error');
    }
  }
);

/** POST /api/complaints-enhanced/:id/escalate — escalate complaint */
router.post('/:id/escalate', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const complaint = await ComplaintV2.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });

    const newLevel = req.body.level || complaint.escalationLevel + 1;
    if (newLevel > 3)
      return res.status(422).json({ success: false, message: 'تجاوز الحد الأقصى للتصعيد' });

    // Get escalation user from SLA config
    const slaConfig = await ComplaintSlaConfig.findOne({
      branchId: complaint.branchId,
      priority: complaint.priority,
      isActive: true,
    });

    const escalationUserField = `level${newLevel}EscalationUser`;
    const escalatedTo = slaConfig?.[escalationUserField] || null;

    complaint.status = 'escalated';
    complaint.escalationLevel = newLevel;
    complaint.escalatedAt = new Date();
    complaint.escalatedTo = escalatedTo;
    complaint.updatedBy = req.user?._id || req.userId;

    complaint.workflowSteps.push({
      branchId: complaint.branchId,
      complaintId: complaint._id,
      action: 'escalated',
      notes: req.body.reason || `تصعيد تلقائي إلى المستوى ${newLevel}`,
      fromStatus: complaint.status,
      toStatus: 'escalated',
      performedBy: req.user?._id || req.userId,
      performedAt: new Date(),
      createdBy: req.user?._id || req.userId,
    });

    await complaint.save();
    res.json({ success: true, data: complaint, message: 'تم تصعيد الشكوى بنجاح' });
  } catch (err) {
    safeError(res, err, 'Complaint escalate error');
  }
});

/** POST /api/complaints-enhanced/:id/rate — rate resolution satisfaction */
router.post('/:id/rate', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, message: 'التقييم يجب أن يكون بين 1 و 5' });

    const complaint = await ComplaintV2.findByIdAndUpdate(
      req.params.id,
      { satisfactionRating: rating, satisfactionComment: comment || null },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, message: 'شكرًا على تقييمك' });
  } catch (err) {
    safeError(res, err, 'Complaint rate error');
  }
});

/** DELETE /api/complaints-enhanced/:id */
router.delete('/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    await ComplaintV2.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true, message: 'تم حذف الشكوى بنجاح' });
  } catch (err) {
    safeError(res, err, 'Complaint delete error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ── COMPLAINT CATEGORIES ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/complaints-enhanced/categories */
router.get('/categories', async (req, res) => {
  try {
    const { branchId } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    const data = await ComplaintCategory.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Complaint categories error');
  }
});

/** POST /api/complaints-enhanced/categories */
router.post('/categories', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    if (!req.body.name || !req.body.nameAr)
      return res.status(400).json({ success: false, message: 'الاسم (عربي وإنجليزي) مطلوب' });
    const category = await ComplaintCategory.create({
      ...req.body,
      createdBy: req.user?._id || req.userId,
    });
    res.status(201).json({ success: true, data: category, message: 'تم إنشاء التصنيف بنجاح' });
  } catch (err) {
    safeError(res, err, 'Complaint category create error');
  }
});

/** PUT /api/complaints-enhanced/categories/:id */
router.put('/categories/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const category = await ComplaintCategory.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id || req.userId },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'التصنيف غير موجود' });
    res.json({ success: true, data: category, message: 'تم تحديث التصنيف بنجاح' });
  } catch (err) {
    safeError(res, err, 'Complaint category update error');
  }
});

/** DELETE /api/complaints-enhanced/categories/:id */
router.delete('/categories/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    await ComplaintCategory.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true, message: 'تم حذف التصنيف بنجاح' });
  } catch (err) {
    safeError(res, err, 'Complaint category delete error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ── SLA CONFIGS ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/complaints-enhanced/sla-configs */
router.get('/sla-configs', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    const { branchId } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    const data = await ComplaintSlaConfig.find(filter).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'SLA configs list error');
  }
});

/** POST /api/complaints-enhanced/sla-configs */
router.post('/sla-configs', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const config = await ComplaintSlaConfig.create({
      ...req.body,
      createdBy: req.user?._id || req.userId,
    });
    res.status(201).json({ success: true, data: config, message: 'تم إنشاء إعداد SLA بنجاح' });
  } catch (err) {
    safeError(res, err, 'SLA config create error');
  }
});

/** PUT /api/complaints-enhanced/sla-configs/:id */
router.put('/sla-configs/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const config = await ComplaintSlaConfig.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id || req.userId },
      { new: true, runValidators: true }
    );
    if (!config) return res.status(404).json({ success: false, message: 'الإعداد غير موجود' });
    res.json({ success: true, data: config, message: 'تم تحديث إعداد SLA بنجاح' });
  } catch (err) {
    safeError(res, err, 'SLA config update error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ── CRM FEEDBACK ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/complaints-enhanced/feedback — list feedback */
router.get('/feedback', async (req, res) => {
  try {
    const { type, status, sentiment, search, branchId, page = 1, limit = 15 } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (sentiment) filter.sentiment = sentiment;
    if (search) {
      filter.$or = [
        { subject: { $regex: escapeRegex(search), $options: 'i' } },
        { content: { $regex: escapeRegex(search), $options: 'i' } },
        { submitterName: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      CrmFeedback.find(filter)
        .populate('respondedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CrmFeedback.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'Feedback list error');
  }
});

/** GET /api/complaints-enhanced/feedback/stats */
router.get('/feedback/stats', async (req, res) => {
  try {
    const { branchId } = req.query;
    const filter = branchId ? { branchId, deletedAt: null } : { deletedAt: null };
    const [total, newUnreviewed, positive, negative, byType] = await Promise.all([
      CrmFeedback.countDocuments(filter),
      CrmFeedback.countDocuments({ ...filter, status: 'new' }),
      CrmFeedback.countDocuments({ ...filter, sentiment: 'positive' }),
      CrmFeedback.countDocuments({ ...filter, sentiment: 'negative' }),
      CrmFeedback.aggregate([{ $match: filter }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, data: { total, newUnreviewed, positive, negative, byType } });
  } catch (err) {
    safeError(res, err, 'Feedback stats error');
  }
});

/** GET /api/complaints-enhanced/feedback/:id */
router.get('/feedback/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const feedback = await CrmFeedback.findById(req.params.id)
      .populate('respondedBy', 'name email')
      .lean();
    if (!feedback) return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    res.json({ success: true, data: feedback });
  } catch (err) {
    safeError(res, err, 'Feedback detail error');
  }
});

/** POST /api/complaints-enhanced/feedback — create feedback */
router.post('/feedback', async (req, res) => {
  try {
    if (!req.body.content || !req.body.type || !req.body.channel)
      return res.status(400).json({ success: false, message: 'المحتوى والنوع والقناة مطلوبون' });

    // Analyze sentiment
    const sentimentScore = ComplaintV2.schema.statics?.analyzeSentiment
      ? ComplaintV2.analyzeSentiment(req.body.content)
      : 0.5;
    const sentiment =
      sentimentScore >= 0.6 ? 'positive' : sentimentScore >= 0.3 ? 'neutral' : 'negative';

    const feedback = await CrmFeedback.create({
      ...req.body,
      sentiment,
      sentimentScore,
      createdBy: req.user?._id || req.userId,
    });

    res.status(201).json({ success: true, data: feedback, message: 'شكرًا على ملاحظتك القيّمة' });
  } catch (err) {
    safeError(res, err, 'Feedback create error');
  }
});

/** POST /api/complaints-enhanced/feedback/:id/respond — respond to feedback */
router.post(
  '/feedback/:id/respond',
  authorize(['admin', 'super_admin', 'manager', 'complaints_agent']),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
      if (!req.body.response)
        return res.status(400).json({ success: false, message: 'نص الرد مطلوب' });

      const feedback = await CrmFeedback.findByIdAndUpdate(
        req.params.id,
        {
          response: req.body.response,
          respondedAt: new Date(),
          respondedBy: req.user?._id || req.userId,
          status: 'reviewed',
          updatedBy: req.user?._id || req.userId,
        },
        { new: true }
      );
      if (!feedback)
        return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
      res.json({ success: true, data: feedback, message: 'تم الرد بنجاح' });
    } catch (err) {
      safeError(res, err, 'Feedback respond error');
    }
  }
);

/** PUT /api/complaints-enhanced/feedback/:id */
router.put('/feedback/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const feedback = await CrmFeedback.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id || req.userId },
      { new: true, runValidators: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: 'الملاحظة غير موجودة' });
    res.json({ success: true, data: feedback, message: 'تم التحديث بنجاح' });
  } catch (err) {
    safeError(res, err, 'Feedback update error');
  }
});

/** DELETE /api/complaints-enhanced/feedback/:id */
router.delete('/feedback/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    await CrmFeedback.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true, message: 'تم حذف الملاحظة بنجاح' });
  } catch (err) {
    safeError(res, err, 'Feedback delete error');
  }
});

module.exports = router;
