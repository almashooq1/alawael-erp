/**
 * CRM Enhanced Routes — مسارات CRM المتكاملة (البرومبت 30)
 * Leads, Partners, Campaigns, Segments, Surveys, Referral Commissions
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { stripUpdateMeta } = require('../utils/sanitize');

// ── Models ─────────────────────────────────────────────────────────────────
const CrmLead = require('../models/CrmLead');
const CrmPartner = require('../models/CrmPartner');
const CrmCampaign = require('../models/CrmCampaign');
const CrmSegment = require('../models/CrmSegment');
const CrmSurvey = require('../models/CrmSurvey');
const CrmReferralCommission = require('../models/CrmReferralCommission');
const escapeRegex = require('../utils/escapeRegex');

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════
// ── LEADS ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/crm-enhanced/leads — list leads with filters */
router.get('/leads', async (req, res) => {
  try {
    const {
      search,
      status,
      source,
      assignedTo,
      isVip,
      dateFrom,
      dateTo,
      page = 1,
      limit = 15,
      branchId,
    } = req.query;

    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;

    if (search) {
      filter.$or = [
        { firstName: { $regex: escapeRegex(search), $options: 'i' } },
        { lastName: { $regex: escapeRegex(search), $options: 'i' } },
        { phone: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (isVip === 'true') filter.isVip = true;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      CrmLead.find(filter)
        .populate('assignedTo', 'name email')
        .populate('partnerId', 'name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CrmLead.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('CRM leads list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب العملاء المحتملين' });
  }
});

/** GET /api/crm-enhanced/leads/stats — dashboard stats */
router.get('/leads/stats', async (req, res) => {
  try {
    const { branchId } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;

    const [total, newToday, dueFollowup, enrolledMonth, byStatus, bySource] = await Promise.all([
      CrmLead.countDocuments(filter),
      CrmLead.countDocuments({
        ...filter,
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      CrmLead.countDocuments({
        ...filter,
        nextFollowupAt: { $lte: new Date() },
        status: { $nin: ['enrolled', 'lost'] },
      }),
      CrmLead.countDocuments({
        ...filter,
        status: 'enrolled',
        enrolledAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
      CrmLead.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      CrmLead.aggregate([{ $match: filter }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
    ]);

    // Conversion rate
    const closedTotal = await CrmLead.countDocuments({
      ...filter,
      status: { $in: ['enrolled', 'lost'] },
    });
    const enrolled = await CrmLead.countDocuments({ ...filter, status: 'enrolled' });
    const conversionRate = closedTotal > 0 ? Math.round((enrolled / closedTotal) * 1000) / 10 : 0;

    res.json({
      success: true,
      data: {
        total,
        newToday,
        dueFollowup,
        enrolledMonth,
        conversionRate,
        byStatus,
        bySource,
      },
    });
  } catch (err) {
    logger.error('CRM leads stats error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الإحصائيات' });
  }
});

/** GET /api/crm-enhanced/leads/pipeline — pipeline view */
router.get('/leads/pipeline', async (req, res) => {
  try {
    const { branchId } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;

    const stages = ['new', 'contacted', 'qualified', 'assessment_scheduled', 'enrolled'];
    const pipeline = await Promise.all(
      stages.map(async stage => {
        const leads = await CrmLead.find({ ...filter, status: stage })
          .select('firstName lastName phone email estimatedValue leadScore assignedTo isVip')
          .populate('assignedTo', 'name')
          .limit(50)
          .lean();
        return { stage, count: leads.length, leads };
      })
    );

    res.json({ success: true, data: pipeline });
  } catch (err) {
    logger.error('CRM pipeline error:', err);
    res.status(500).json({ success: false, message: 'خطأ في عرض pipeline' });
  }
});

/** GET /api/crm-enhanced/leads/form-options */
router.get('/leads/form-options', async (req, res) => {
  try {
    const { branchId } = req.query;
    const branchFilter = branchId ? { branchId, deletedAt: null } : { deletedAt: null };

    const [partners, users] = await Promise.all([
      CrmPartner.find({ ...branchFilter, status: 'active' })
        .select('name type')
        .lean(),
      require('../models/User')
        ? require('../models/User').find(branchFilter).select('name email').lean()
        : [],
    ]);

    res.json({
      success: true,
      data: {
        statuses: [
          { value: 'new', label: 'جديد' },
          { value: 'contacted', label: 'تم التواصل' },
          { value: 'qualified', label: 'مؤهّل' },
          { value: 'assessment_scheduled', label: 'موعد تقييم' },
          { value: 'enrolled', label: 'مسجّل' },
          { value: 'lost', label: 'خسارة' },
          { value: 'inactive', label: 'غير نشط' },
        ],
        sources: [
          { value: 'website', label: 'موقع إلكتروني' },
          { value: 'phone', label: 'هاتف' },
          { value: 'referral', label: 'إحالة' },
          { value: 'social_media', label: 'وسائل التواصل' },
          { value: 'walk_in', label: 'زيارة مباشرة' },
          { value: 'b2b_partner', label: 'شريك تجاري' },
          { value: 'advertisement', label: 'إعلان' },
          { value: 'other', label: 'أخرى' },
        ],
        partners,
        users,
      },
    });
  } catch (err) {
    logger.error('CRM form options error:', err);
    res.status(500).json({ success: false, message: 'خطأ في خيارات النموذج' });
  }
});

/** GET /api/crm-enhanced/leads/:id */
router.get('/leads/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const lead = await CrmLead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('partnerId', 'name type commissionRate')
      .populate('referralId', 'firstName lastName phone')
      .lean();

    if (!lead) return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    res.json({ success: true, data: lead });
  } catch (err) {
    logger.error('CRM lead detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب العميل' });
  }
});

/** POST /api/crm-enhanced/leads — create lead */
router.post('/leads', async (req, res) => {
  try {
    const data = stripUpdateMeta(req.body);
    if (!data.firstName || !data.lastName)
      return res.status(400).json({ success: false, message: 'الاسم الأول والأخير مطلوبان' });
    if (!data.source) return res.status(400).json({ success: false, message: 'مصدر العميل مطلوب' });

    data.leadScore = CrmLead.calculateScore(data);
    data.createdBy = req.user?._id || req.userId;

    const lead = new CrmLead(data);
    await lead.save();

    // Add initial activity
    lead.activities.push({
      branchId: lead.branchId,
      leadId: lead._id,
      type: 'note',
      subject: 'إنشاء عميل محتمل جديد',
      body: `تم إنشاء السجل عبر ${data.source || 'النظام'}`,
      createdBy: req.user?._id || req.userId,
    });
    await lead.save();

    res.status(201).json({ success: true, data: lead, message: 'تم إنشاء العميل المحتمل بنجاح' });
  } catch (err) {
    logger.error('CRM lead create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء العميل' });
  }
});

/** PUT /api/crm-enhanced/leads/:id — update lead */
router.put('/leads/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const lead = await CrmLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

    const oldStatus = lead.status;
    const updateData = { ...stripUpdateMeta(req.body), updatedBy: req.user?._id || req.userId };
    delete updateData.activities;

    Object.assign(lead, updateData);

    // Handle status transitions
    if (req.body.status && req.body.status !== oldStatus) {
      if (req.body.status === 'enrolled') lead.enrolledAt = new Date();
      if (req.body.status === 'lost') lead.lostAt = new Date();
      if (req.body.status === 'qualified') lead.qualifiedAt = new Date();

      lead.activities.push({
        branchId: lead.branchId,
        leadId: lead._id,
        type: 'status_change',
        subject: 'تغيير الحالة',
        oldStatus,
        newStatus: req.body.status,
        createdBy: req.user?._id || req.userId,
      });
    }

    await lead.save();
    res.json({ success: true, data: lead, message: 'تم تحديث العميل بنجاح' });
  } catch (err) {
    logger.error('CRM lead update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث العميل' });
  }
});

/** DELETE /api/crm-enhanced/leads/:id */
router.delete('/leads/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const lead = await CrmLead.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!lead) return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    res.json({ success: true, message: 'تم حذف العميل بنجاح' });
  } catch (err) {
    logger.error('CRM lead delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الحذف' });
  }
});

/** POST /api/crm-enhanced/leads/:id/activity — log activity */
router.post('/leads/:id/activity', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const lead = await CrmLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

    const { type, subject, body, direction, outcome, durationMinutes, nextFollowupAt } = req.body;
    if (!type) return res.status(400).json({ success: false, message: 'نوع النشاط مطلوب' });

    lead.activities.push({
      branchId: lead.branchId,
      leadId: lead._id,
      type,
      subject,
      body,
      direction: direction || 'outbound',
      outcome,
      durationMinutes,
      nextFollowupAt: nextFollowupAt ? new Date(nextFollowupAt) : undefined,
      completedAt: new Date(),
      createdBy: req.user?._id || req.userId,
    });

    lead.lastContactAt = new Date();
    if (nextFollowupAt) lead.nextFollowupAt = new Date(nextFollowupAt);
    await lead.save();

    res.json({
      success: true,
      data: lead.activities.slice(-1)[0],
      message: 'تم تسجيل النشاط بنجاح',
    });
  } catch (err) {
    logger.error('CRM activity log error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل النشاط' });
  }
});

/** POST /api/crm-enhanced/leads/:id/enroll — enroll lead */
router.post('/leads/:id/enroll', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const lead = await CrmLead.findByIdAndUpdate(
      req.params.id,
      { status: 'enrolled', enrolledAt: new Date(), updatedBy: req.user?._id || req.userId },
      { new: true }
    );
    if (!lead) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

    res.json({ success: true, data: lead, message: 'تم تسجيل العميل بنجاح' });
  } catch (err) {
    logger.error('CRM enroll error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل العميل' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ── PARTNERS ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/crm-enhanced/partners */
router.get('/partners', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 15, branchId } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      CrmPartner.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      CrmPartner.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('CRM partners list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الشركاء' });
  }
});

/** GET /api/crm-enhanced/partners/stats */
router.get('/partners/stats', async (req, res) => {
  try {
    const { branchId } = req.query;
    const filter = branchId ? { branchId, deletedAt: null } : { deletedAt: null };

    const [total, active, byType] = await Promise.all([
      CrmPartner.countDocuments(filter),
      CrmPartner.countDocuments({ ...filter, status: 'active' }),
      CrmPartner.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 }, totalRevenue: { $sum: '$totalRevenue' } } },
      ]),
    ]);

    res.json({ success: true, data: { total, active, byType } });
  } catch (err) {
    logger.error('CRM partners stats error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الإحصائيات' });
  }
});

/** GET /api/crm-enhanced/partners/:id */
router.get('/partners/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const partner = await CrmPartner.findById(req.params.id).lean();
    if (!partner) return res.status(404).json({ success: false, message: 'الشريك غير موجود' });
    res.json({ success: true, data: partner });
  } catch (err) {
    logger.error('CRM partner detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الشريك' });
  }
});

/** POST /api/crm-enhanced/partners */
router.post('/partners', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    if (!req.body.name)
      return res.status(400).json({ success: false, message: 'اسم الشريك مطلوب' });
    const partner = await CrmPartner.create({
      ...stripUpdateMeta(req.body),
      createdBy: req.user?._id || req.userId,
    });
    res.status(201).json({ success: true, data: partner, message: 'تم إنشاء الشريك بنجاح' });
  } catch (err) {
    logger.error('CRM partner create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الشريك' });
  }
});

/** PUT /api/crm-enhanced/partners/:id */
router.put('/partners/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const partner = await CrmPartner.findByIdAndUpdate(
      req.params.id,
      { ...stripUpdateMeta(req.body), updatedBy: req.user?._id || req.userId },
      { new: true, runValidators: true }
    );
    if (!partner) return res.status(404).json({ success: false, message: 'الشريك غير موجود' });
    res.json({ success: true, data: partner, message: 'تم تحديث الشريك بنجاح' });
  } catch (err) {
    logger.error('CRM partner update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الشريك' });
  }
});

/** DELETE /api/crm-enhanced/partners/:id */
router.delete('/partners/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const partner = await CrmPartner.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!partner) return res.status(404).json({ success: false, message: 'الشريك غير موجود' });
    res.json({ success: true, message: 'تم حذف الشريك بنجاح' });
  } catch (err) {
    logger.error('CRM partner delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الحذف' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ── CAMPAIGNS ──────────────────────────────────────────────────════════════
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/crm-enhanced/campaigns */
router.get('/campaigns', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 15, branchId } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      CrmCampaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      CrmCampaign.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('CRM campaigns list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحملات' });
  }
});

/** GET /api/crm-enhanced/campaigns/stats */
router.get('/campaigns/stats', async (req, res) => {
  try {
    const { branchId } = req.query;
    const filter = branchId ? { branchId, deletedAt: null } : { deletedAt: null };
    const [total, running, completed, scheduled, byType] = await Promise.all([
      CrmCampaign.countDocuments(filter),
      CrmCampaign.countDocuments({ ...filter, status: 'running' }),
      CrmCampaign.countDocuments({ ...filter, status: 'completed' }),
      CrmCampaign.countDocuments({ ...filter, status: 'scheduled' }),
      CrmCampaign.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalSent: { $sum: '$sentCount' },
            totalOpened: { $sum: '$openedCount' },
          },
        },
      ]),
    ]);
    res.json({ success: true, data: { total, running, completed, scheduled, byType } });
  } catch (err) {
    logger.error('CRM campaigns stats error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الإحصائيات' });
  }
});

/** GET /api/crm-enhanced/campaigns/:id */
router.get('/campaigns/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const campaign = await CrmCampaign.findById(req.params.id).lean();
    if (!campaign) return res.status(404).json({ success: false, message: 'الحملة غير موجودة' });
    res.json({ success: true, data: campaign });
  } catch (err) {
    logger.error('CRM campaign detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحملة' });
  }
});

/** POST /api/crm-enhanced/campaigns */
router.post('/campaigns', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    if (!req.body.name || !req.body.contentAr)
      return res.status(400).json({ success: false, message: 'اسم الحملة والمحتوى مطلوبان' });
    const campaign = await CrmCampaign.create({
      ...stripUpdateMeta(req.body),
      createdBy: req.user?._id || req.userId,
    });
    res.status(201).json({ success: true, data: campaign, message: 'تم إنشاء الحملة بنجاح' });
  } catch (err) {
    logger.error('CRM campaign create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الحملة' });
  }
});

/** PUT /api/crm-enhanced/campaigns/:id */
router.put('/campaigns/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const campaign = await CrmCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'الحملة غير موجودة' });
    if (campaign.status === 'running')
      return res.status(422).json({ success: false, message: 'لا يمكن تعديل حملة جارية' });

    Object.assign(campaign, stripUpdateMeta(req.body));
    campaign.updatedBy = req.user?._id || req.userId;
    await campaign.save();
    res.json({ success: true, data: campaign, message: 'تم تحديث الحملة بنجاح' });
  } catch (err) {
    logger.error('CRM campaign update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الحملة' });
  }
});

/** POST /api/crm-enhanced/campaigns/:id/launch — launch campaign */
router.post(
  '/campaigns/:id/launch',
  authorize(['admin', 'super_admin', 'manager']),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
      const campaign = await CrmCampaign.findById(req.params.id);
      if (!campaign) return res.status(404).json({ success: false, message: 'الحملة غير موجودة' });
      if (!['draft', 'scheduled'].includes(campaign.status))
        return res
          .status(422)
          .json({ success: false, message: 'الحملة ليست في حالة مناسبة للإطلاق' });

      campaign.status = 'running';
      campaign.startedAt = new Date();
      await campaign.save();

      res.json({ success: true, data: campaign, message: 'تم إطلاق الحملة بنجاح' });
    } catch (err) {
      logger.error('CRM campaign launch error:', err);
      res.status(500).json({ success: false, message: 'خطأ في إطلاق الحملة' });
    }
  }
);

/** DELETE /api/crm-enhanced/campaigns/:id */
router.delete('/campaigns/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const campaign = await CrmCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'الحملة غير موجودة' });
    if (campaign.status === 'running')
      return res.status(422).json({ success: false, message: 'لا يمكن حذف حملة جارية' });
    await campaign.updateOne({ deletedAt: new Date() });
    res.json({ success: true, message: 'تم حذف الحملة بنجاح' });
  } catch (err) {
    logger.error('CRM campaign delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الحذف' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ── SEGMENTS ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/crm-enhanced/segments */
router.get('/segments', async (req, res) => {
  try {
    const { isActive, branchId } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const data = await CrmSegment.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('CRM segments list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الشرائح' });
  }
});

/** GET /api/crm-enhanced/segments/:id */
router.get('/segments/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const segment = await CrmSegment.findById(req.params.id).lean();
    if (!segment) return res.status(404).json({ success: false, message: 'الشريحة غير موجودة' });
    res.json({ success: true, data: segment });
  } catch (err) {
    logger.error('CRM segment detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الشريحة' });
  }
});

/** POST /api/crm-enhanced/segments */
router.post('/segments', async (req, res) => {
  try {
    if (!req.body.name)
      return res.status(400).json({ success: false, message: 'اسم الشريحة مطلوب' });
    const segment = await CrmSegment.create({
      ...stripUpdateMeta(req.body),
      createdBy: req.user?._id || req.userId,
    });
    res.status(201).json({ success: true, data: segment, message: 'تم إنشاء الشريحة بنجاح' });
  } catch (err) {
    logger.error('CRM segment create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الشريحة' });
  }
});

/** PUT /api/crm-enhanced/segments/:id */
router.put('/segments/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const segment = await CrmSegment.findByIdAndUpdate(
      req.params.id,
      { ...stripUpdateMeta(req.body), updatedBy: req.user?._id || req.userId },
      { new: true, runValidators: true }
    );
    if (!segment) return res.status(404).json({ success: false, message: 'الشريحة غير موجودة' });
    res.json({ success: true, data: segment, message: 'تم تحديث الشريحة بنجاح' });
  } catch (err) {
    logger.error('CRM segment update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الشريحة' });
  }
});

/** DELETE /api/crm-enhanced/segments/:id */
router.delete('/segments/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    await CrmSegment.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true, message: 'تم حذف الشريحة بنجاح' });
  } catch (err) {
    logger.error('CRM segment delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الحذف' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ── SURVEYS ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/crm-enhanced/surveys */
router.get('/surveys', async (req, res) => {
  try {
    const { isActive, type, branchId } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (type) filter.type = type;
    const data = await CrmSurvey.find(filter).select('-responses').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('CRM surveys list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الاستطلاعات' });
  }
});

/** GET /api/crm-enhanced/surveys/:id */
router.get('/surveys/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const survey = await CrmSurvey.findById(req.params.id).lean();
    if (!survey) return res.status(404).json({ success: false, message: 'الاستطلاع غير موجود' });
    res.json({ success: true, data: survey });
  } catch (err) {
    logger.error('CRM survey detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الاستطلاع' });
  }
});

/** POST /api/crm-enhanced/surveys */
router.post('/surveys', async (req, res) => {
  try {
    if (!req.body.title)
      return res.status(400).json({ success: false, message: 'عنوان الاستطلاع مطلوب' });
    const survey = await CrmSurvey.create({
      ...stripUpdateMeta(req.body),
      createdBy: req.user?._id || req.userId,
    });
    res.status(201).json({ success: true, data: survey, message: 'تم إنشاء الاستطلاع بنجاح' });
  } catch (err) {
    logger.error('CRM survey create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الاستطلاع' });
  }
});

/** POST /api/crm-enhanced/surveys/:id/respond — submit a survey response */
router.post('/surveys/:id/respond', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });

    const survey = await CrmSurvey.findById(req.params.id);
    if (!survey) return res.status(404).json({ success: false, message: 'الاستطلاع غير موجود' });
    if (!survey.isActive)
      return res.status(422).json({ success: false, message: 'الاستطلاع غير نشط' });

    const { npsScore, answers, comment, respondentName, channel, leadId, patientId } = req.body;

    // Determine sentiment
    let sentiment = 'neutral';
    if (npsScore >= 9) sentiment = 'positive';
    else if (npsScore <= 6) sentiment = 'negative';

    survey.responses.push({
      branchId: survey.branchId,
      surveyId: survey._id,
      leadId: leadId || null,
      patientId: patientId || null,
      npsScore,
      answers,
      comment,
      respondentName,
      channel: channel || 'web',
      sentiment,
      submittedAt: new Date(),
    });

    // Update aggregates
    survey.responseCount = survey.responses.length;
    const npsScores = survey.responses.filter(r => r.npsScore != null).map(r => r.npsScore);
    survey.averageScore =
      npsScores.length > 0
        ? Math.round((npsScores.reduce((a, b) => a + b, 0) / npsScores.length) * 10) / 10
        : 0;

    await survey.save();
    res.json({ success: true, message: 'شكرًا على مشاركتك' });
  } catch (err) {
    logger.error('CRM survey respond error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل الرد' });
  }
});

/** DELETE /api/crm-enhanced/surveys/:id */
router.delete('/surveys/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    await CrmSurvey.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true, message: 'تم حذف الاستطلاع بنجاح' });
  } catch (err) {
    logger.error('CRM survey delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الحذف' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ── REFERRAL COMMISSIONS ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/** GET /api/crm-enhanced/commissions */
router.get('/commissions', async (req, res) => {
  try {
    const { status, partnerId, page = 1, limit = 15, branchId } = req.query;
    const filter = { deletedAt: null };
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (partnerId && mongoose.isValidObjectId(partnerId)) filter.partnerId = partnerId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      CrmReferralCommission.find(filter)
        .populate('partnerId', 'name type')
        .populate('leadId', 'firstName lastName phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CrmReferralCommission.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('CRM commissions list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب العمولات' });
  }
});

/** POST /api/crm-enhanced/commissions */
router.post(
  '/commissions',
  authorize(['admin', 'super_admin', 'manager', 'finance']),
  async (req, res) => {
    try {
      const { partnerId, leadId, amount } = req.body;
      if (!partnerId || !leadId || amount == null)
        return res.status(400).json({ success: false, message: 'الشريك والعميل والمبلغ مطلوبون' });

      const commission = await CrmReferralCommission.create({
        ...stripUpdateMeta(req.body),
        createdBy: req.user?._id || req.userId,
      });
      res.status(201).json({ success: true, data: commission, message: 'تم إنشاء العمولة بنجاح' });
    } catch (err) {
      logger.error('CRM commission create error:', err);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء العمولة' });
    }
  }
);

/** PUT /api/crm-enhanced/commissions/:id */
router.put(
  '/commissions/:id',
  authorize(['admin', 'super_admin', 'manager', 'finance']),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
      const commission = await CrmReferralCommission.findByIdAndUpdate(
        req.params.id,
        { ...stripUpdateMeta(req.body), updatedBy: req.user?._id || req.userId },
        { new: true, runValidators: true }
      );
      if (!commission)
        return res.status(404).json({ success: false, message: 'العمولة غير موجودة' });
      res.json({ success: true, data: commission, message: 'تم تحديث العمولة بنجاح' });
    } catch (err) {
      logger.error('CRM commission update error:', err);
      res.status(500).json({ success: false, message: 'خطأ في تحديث العمولة' });
    }
  }
);

module.exports = router;
