/**
 * 🤝 خدمة إدارة علاقات العملاء المتقدمة — Advanced CRM Service
 * AlAwael ERP — Full Database-Backed CRM
 *
 * Features:
 * - جهات الاتصال / Contacts CRUD
 * - العملاء المحتملين / Leads CRUD + Pipeline
 * - الصفقات / Deals CRUD + Pipeline
 * - المتابعات / Follow-ups CRUD
 * - التقارير / Reports & Analytics
 * - لوحة التحكم / Dashboard Stats
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

// ════════════════════════════════════════════════════════════════
// 1. SCHEMAS — النماذج
// ════════════════════════════════════════════════════════════════

// ─── Contact Schema (جهة اتصال) ─────────────────────────────
const ContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    contactPerson: { type: String },
    type: {
      type: String,
      enum: ['شركة', 'فرد', 'جهة حكومية', 'مؤسسة تعليمية', 'منظمة غير ربحية'],
      default: 'شركة',
    },
    sector: {
      type: String,
      enum: ['التعليم', 'الصحة', 'التقنية', 'البناء', 'المالية', 'التجارة', 'الصناعة', 'أخرى'],
      default: 'أخرى',
    },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String },
    city: { type: String },
    region: { type: String },
    address: { type: String },
    website: { type: String },
    status: {
      type: String,
      enum: ['نشط', 'غير نشط', 'معلق', 'محذوف'],
      default: 'نشط',
      index: true,
    },
    tier: {
      type: String,
      enum: ['بلاتيني', 'ذهبي', 'فضي', 'برونزي', 'عادي'],
      default: 'عادي',
    },
    totalDeals: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    lastContact: { type: Date },
    notes: { type: String },
    tags: [{ type: String }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    socialMedia: {
      linkedin: String,
      twitter: String,
      instagram: String,
    },
    // سجل التفاعلات
    interactions: [
      {
        type: { type: String, enum: ['اتصال', 'بريد', 'زيارة', 'اجتماع', 'ملاحظة'] },
        content: String,
        date: { type: Date, default: Date.now },
        by: String,
      },
    ],
  },
  { timestamps: true, collection: 'crm_contacts' }
);

ContactSchema.index({ email: 1 });
ContactSchema.index({ status: 1, lastContact: -1 });
ContactSchema.index({ tier: 1 });
ContactSchema.index({ '$**': 'text' });

// ─── Deal Schema (صفقة) ──────────────────────────────────────
const DealSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmContact' },
    contactName: { type: String },
    value: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    stage: {
      type: String,
      enum: [
        'جديد',
        'اتصال أولي',
        'عرض مقدم',
        'تفاوض',
        'مراجعة العقد',
        'مغلق - ربح',
        'مغلق - خسارة',
      ],
      default: 'جديد',
      index: true,
    },
    priority: {
      type: String,
      enum: ['عالية', 'متوسطة', 'منخفضة'],
      default: 'متوسطة',
    },
    probability: { type: Number, default: 0, min: 0, max: 100 },
    expectedCloseDate: { type: Date },
    actualCloseDate: { type: Date },
    source: {
      type: String,
      enum: ['موقع إلكتروني', 'إحالة', 'معرض', 'إعلان', 'شبكات اجتماعية', 'اتصال مباشر'],
      default: 'اتصال مباشر',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedToName: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    tags: [{ type: String }],
    products: [{ name: String, quantity: Number, price: Number }],
    // سجل مراحل الصفقة
    stageHistory: [
      {
        from: String,
        to: String,
        date: { type: Date, default: Date.now },
        by: String,
        notes: String,
      },
    ],
    // مرفقات
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    lossReason: { type: String },
  },
  { timestamps: true, collection: 'crm_deals' }
);

DealSchema.index({ stage: 1, value: -1 });
DealSchema.index({ contact: 1 });
DealSchema.index({ expectedCloseDate: 1 });
DealSchema.index({ assignedTo: 1 });

// ─── Follow-Up Schema (متابعة) ────────────────────────────────
const FollowUpSchema = new mongoose.Schema(
  {
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmContact' },
    contactName: { type: String },
    deal: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmDeal' },
    type: {
      type: String,
      enum: ['اتصال هاتفي', 'بريد إلكتروني', 'زيارة', 'اجتماع', 'عرض تقديمي'],
      default: 'اتصال هاتفي',
    },
    subject: { type: String, required: true },
    scheduledDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['مجدول', 'مكتمل', 'ملغي', 'متأخر'],
      default: 'مجدول',
      index: true,
    },
    priority: {
      type: String,
      enum: ['عالية', 'متوسطة', 'منخفضة'],
      default: 'متوسطة',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedToName: { type: String },
    notes: { type: String },
    completedAt: { type: Date },
    result: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'crm_follow_ups' }
);

FollowUpSchema.index({ scheduledDate: 1, status: 1 });
FollowUpSchema.index({ contact: 1 });

// ─── Activity Log Schema (سجل الأنشطة) ─────────────────────
const ActivitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'deal_won',
        'deal_lost',
        'new_lead',
        'new_contact',
        'follow_up',
        'contact_update',
        'deal_update',
        'stage_change',
        'note_added',
        'email_sent',
        'call_made',
        'meeting_held',
      ],
      required: true,
    },
    text: { type: String, required: true },
    entityType: { type: String, enum: ['contact', 'deal', 'follow_up'] },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: mongoose.Schema.Types.Mixed },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
  },
  { timestamps: true, collection: 'crm_activities' }
);

ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ type: 1 });

// ════════════════════════════════════════════════════════════════
// 2. MODELS — النماذج
// ════════════════════════════════════════════════════════════════

const CrmContact = mongoose.model('CrmContact', ContactSchema);
const CrmDeal = mongoose.model('CrmDeal', DealSchema);
const CrmFollowUp = mongoose.model('CrmFollowUp', FollowUpSchema);
const CrmActivity = mongoose.model('CrmActivity', ActivitySchema);

// ════════════════════════════════════════════════════════════════
// 3. SERVICE — الخدمة
// ════════════════════════════════════════════════════════════════

class CRMAdvancedService {
  // ─── Helper: Log Activity ───────────────────────────────────
  async _logActivity(type, text, entityType, entityId, userId, userName, metadata) {
    try {
      await CrmActivity.create({ type, text, entityType, entityId, userId, userName, metadata });
    } catch (e) {
      logger.warn('CRM activity log failed:', e.message);
    }
  }

  // ═══════════════════════════════════════════════
  // CONTACTS — جهات الاتصال
  // ═══════════════════════════════════════════════

  async getContacts(query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      sector,
      tier,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      city,
    } = query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (sector) filter.sector = sector;
    if (tier) filter.tier = tier;
    if (city) filter.city = city;
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { contactPerson: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
        { phone: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      CrmContact.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      CrmContact.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async getContactById(id) {
    const contact = await CrmContact.findById(id).lean();
    if (!contact) throw new Error('جهة الاتصال غير موجودة');

    // Get related deals and follow-ups
    const [deals, followUps, recentActivity] = await Promise.all([
      CrmDeal.find({ contact: id }).sort({ createdAt: -1 }).limit(10).lean(),
      CrmFollowUp.find({ contact: id }).sort({ scheduledDate: -1 }).limit(10).lean(),
      CrmActivity.find({ entityId: id, entityType: 'contact' })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return { ...contact, deals, followUps, recentActivity };
  }

  async createContact(data, userId, userName) {
    const contact = await CrmContact.create({ ...data, createdBy: userId });
    await this._logActivity(
      'new_contact',
      `تم إضافة جهة اتصال جديدة: ${contact.name}`,
      'contact',
      contact._id,
      userId,
      userName
    );
    return contact;
  }

  async updateContact(id, data, userId, userName) {
    const contact = await CrmContact.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!contact) throw new Error('جهة الاتصال غير موجودة');
    await this._logActivity(
      'contact_update',
      `تم تحديث جهة الاتصال: ${contact.name}`,
      'contact',
      contact._id,
      userId,
      userName
    );
    return contact;
  }

  async deleteContact(id, userId, userName) {
    const contact = await CrmContact.findById(id);
    if (!contact) throw new Error('جهة الاتصال غير موجودة');
    // Soft delete
    contact.status = 'محذوف';
    await contact.save();
    await this._logActivity(
      'contact_update',
      `تم حذف جهة الاتصال: ${contact.name}`,
      'contact',
      contact._id,
      userId,
      userName
    );
    return { message: 'تم حذف جهة الاتصال بنجاح' };
  }

  async getContactStats() {
    const [total, active, inactive, byType, bySector, byTier, byCity, recentContacts] =
      await Promise.all([
        CrmContact.countDocuments({ status: { $ne: 'محذوف' } }),
        CrmContact.countDocuments({ status: 'نشط' }),
        CrmContact.countDocuments({ status: 'غير نشط' }),
        CrmContact.aggregate([
          { $match: { status: { $ne: 'محذوف' } } },
          { $group: { _id: '$type', count: { $sum: 1 } } }, { $limit: 1000 }
        ]),
        CrmContact.aggregate([
          { $match: { status: { $ne: 'محذوف' } } },
          { $group: { _id: '$sector', count: { $sum: 1 } } }, { $limit: 1000 }
        ]),
        CrmContact.aggregate([
          { $match: { status: { $ne: 'محذوف' } } },
          { $group: { _id: '$tier', count: { $sum: 1 } } }, { $limit: 1000 }
        ]),
        CrmContact.aggregate([
          { $match: { status: { $ne: 'محذوف' } } },
          { $group: { _id: '$city', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        CrmContact.find({ status: { $ne: 'محذوف' } })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    return {
      total,
      active,
      inactive,
      suspended: total - active - inactive,
      byType: byType.map(i => ({ type: i._id || 'غير محدد', count: i.count })),
      bySector: bySector.map(i => ({ sector: i._id || 'غير محدد', count: i.count })),
      byTier: byTier.map(i => ({ tier: i._id || 'غير محدد', count: i.count })),
      byCity: byCity.map(i => ({ city: i._id || 'غير محدد', count: i.count })),
      recentContacts,
    };
  }

  async addInteraction(contactId, interaction, userId, userName) {
    const contact = await CrmContact.findById(contactId);
    if (!contact) throw new Error('جهة الاتصال غير موجودة');
    contact.interactions.push({ ...interaction, by: userName, date: new Date() });
    contact.lastContact = new Date();
    await contact.save();
    await this._logActivity(
      'note_added',
      `تم إضافة تفاعل مع: ${contact.name}`,
      'contact',
      contact._id,
      userId,
      userName
    );
    return contact;
  }

  // ═══════════════════════════════════════════════
  // DEALS — الصفقات
  // ═══════════════════════════════════════════════

  async getDeals(query = {}) {
    const {
      page = 1,
      limit = 20,
      stage,
      priority,
      source,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      contactId,
      assignedTo,
      minValue,
      maxValue,
    } = query;

    const filter = {};
    if (stage) filter.stage = stage;
    if (priority) filter.priority = priority;
    if (source) filter.source = source;
    if (contactId) filter.contact = contactId;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (minValue || maxValue) {
      filter.value = {};
      if (minValue) filter.value.$gte = Number(minValue);
      if (maxValue) filter.value.$lte = Number(maxValue);
    }
    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { contactName: { $regex: escapeRegex(search), $options: 'i' } },
        { notes: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      CrmDeal.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      CrmDeal.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async getDealById(id) {
    const deal = await CrmDeal.findById(id).lean();
    if (!deal) throw new Error('الصفقة غير موجودة');

    const [contact, followUps, activities] = await Promise.all([
      deal.contact ? CrmContact.findById(deal.contact).lean() : null,
      CrmFollowUp.find({ deal: id }).sort({ scheduledDate: -1 }).lean(),
      CrmActivity.find({ entityId: id, entityType: 'deal' })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return { ...deal, contactDetails: contact, followUps, activities };
  }

  async createDeal(data, userId, userName) {
    const deal = await CrmDeal.create({
      ...data,
      createdBy: userId,
      stageHistory: [{ from: null, to: data.stage || 'جديد', by: userName, date: new Date() }],
    });

    // Update contact stats
    if (deal.contact) {
      await CrmContact.findByIdAndUpdate(deal.contact, {
        $inc: { totalDeals: 1 },
        $set: { lastContact: new Date() },
      });
    }

    await this._logActivity(
      'new_lead',
      `صفقة جديدة: ${deal.title} بقيمة ${deal.value} ر.س`,
      'deal',
      deal._id,
      userId,
      userName
    );
    return deal;
  }

  async updateDeal(id, data, userId, userName) {
    const existing = await CrmDeal.findById(id);
    if (!existing) throw new Error('الصفقة غير موجودة');

    // Track stage change
    if (data.stage && data.stage !== existing.stage) {
      existing.stageHistory.push({
        from: existing.stage,
        to: data.stage,
        by: userName,
        date: new Date(),
        notes: data.stageChangeNotes || '',
      });

      // Handle deal won/lost
      if (data.stage === 'مغلق - ربح') {
        data.actualCloseDate = new Date();
        if (existing.contact) {
          await CrmContact.findByIdAndUpdate(existing.contact, {
            $inc: { totalRevenue: existing.value },
          });
        }
        await this._logActivity(
          'deal_won',
          `تم كسب الصفقة: ${existing.title} بقيمة ${existing.value} ر.س`,
          'deal',
          id,
          userId,
          userName
        );
      } else if (data.stage === 'مغلق - خسارة') {
        data.actualCloseDate = new Date();
        await this._logActivity(
          'deal_lost',
          `تم خسارة الصفقة: ${existing.title}`,
          'deal',
          id,
          userId,
          userName
        );
      } else {
        await this._logActivity(
          'stage_change',
          `تم تغيير مرحلة الصفقة "${existing.title}" من "${existing.stage}" إلى "${data.stage}"`,
          'deal',
          id,
          userId,
          userName
        );
      }
    }

    Object.assign(existing, data);
    await existing.save();
    return existing;
  }

  async deleteDeal(id, userId, userName) {
    const deal = await CrmDeal.findByIdAndDelete(id);
    if (!deal) throw new Error('الصفقة غير موجودة');

    // Update contact stats
    if (deal.contact) {
      await CrmContact.findByIdAndUpdate(deal.contact, { $inc: { totalDeals: -1 } });
    }

    await this._logActivity(
      'deal_update',
      `تم حذف الصفقة: ${deal.title}`,
      'deal',
      id,
      userId,
      userName
    );
    return { message: 'تم حذف الصفقة بنجاح' };
  }

  async updateDealStage(id, stage, userId, userName) {
    return this.updateDeal(id, { stage }, userId, userName);
  }

  async getPipeline() {
    const stages = [
      'جديد',
      'اتصال أولي',
      'عرض مقدم',
      'تفاوض',
      'مراجعة العقد',
      'مغلق - ربح',
      'مغلق - خسارة',
    ];
    const pipeline = await CrmDeal.aggregate([
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          avgProbability: { $avg: '$probability' },
          deals: {
            $push: {
              _id: '$_id',
              title: '$title',
              contactName: '$contactName',
              value: '$value',
              probability: '$probability',
              expectedCloseDate: '$expectedCloseDate',
              priority: '$priority',
            },
          },
        },
      }, { $limit: 1000 }
    ]);

    const pipelineMap = {};
    pipeline.forEach(p => {
      pipelineMap[p._id] = p;
    });

    return stages.map(stage => ({
      stage,
      count: pipelineMap[stage]?.count || 0,
      totalValue: pipelineMap[stage]?.totalValue || 0,
      avgProbability: Math.round(pipelineMap[stage]?.avgProbability || 0),
      deals: (pipelineMap[stage]?.deals || []).slice(0, 10),
    }));
  }

  // ═══════════════════════════════════════════════
  // FOLLOW-UPS — المتابعات
  // ═══════════════════════════════════════════════

  async getFollowUps(query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      priority,
      contactId,
      sortBy = 'scheduledDate',
      sortOrder = 'asc',
    } = query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (contactId) filter.contact = contactId;

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      CrmFollowUp.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      CrmFollowUp.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async createFollowUp(data, userId, userName) {
    const followUp = await CrmFollowUp.create({
      ...data,
      createdBy: userId,
      assignedToName: data.assignedToName || userName,
    });
    await this._logActivity(
      'follow_up',
      `متابعة جديدة: ${followUp.subject}`,
      'follow_up',
      followUp._id,
      userId,
      userName
    );
    return followUp;
  }

  async updateFollowUp(id, data, _userId, _userName) {
    const followUp = await CrmFollowUp.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!followUp) throw new Error('المتابعة غير موجودة');
    return followUp;
  }

  async completeFollowUp(id, notes, result, userId, userName) {
    const followUp = await CrmFollowUp.findById(id);
    if (!followUp) throw new Error('المتابعة غير موجودة');
    followUp.status = 'مكتمل';
    followUp.completedAt = new Date();
    followUp.result = result || 'مكتمل';
    if (notes) followUp.notes = (followUp.notes || '') + '\n' + notes;
    await followUp.save();
    await this._logActivity(
      'follow_up',
      `تم إكمال المتابعة: ${followUp.subject}`,
      'follow_up',
      followUp._id,
      userId,
      userName
    );
    return followUp;
  }

  async getUpcomingFollowUps(days = 7) {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return CrmFollowUp.find({
      status: 'مجدول',
      scheduledDate: { $gte: now, $lte: future },
    })
      .sort({ scheduledDate: 1 })
      .limit(20)
      .lean();
  }

  async getOverdueFollowUps() {
    return CrmFollowUp.find({
      status: 'مجدول',
      scheduledDate: { $lt: new Date() },
    })
      .sort({ scheduledDate: 1 })
      .lean();
  }

  // ═══════════════════════════════════════════════
  // DASHBOARD — لوحة التحكم
  // ═══════════════════════════════════════════════

  async getDashboardStats() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalContacts,
      activeContacts,
      totalDeals,
      wonDeals,
      lostDeals,
      openDeals,
      revenueAgg,
      monthlyTrend,
      pipelineDistribution,
      sourceDistribution,
      topPerformers,
      recentActivities,
      upcomingFollowUps,
      overdueFollowUps,
      thisMonthNewContacts,
      thisMonthNewDeals,
    ] = await Promise.all([
      CrmContact.countDocuments({ status: { $ne: 'محذوف' } }),
      CrmContact.countDocuments({ status: 'نشط' }),
      CrmDeal.countDocuments(),
      CrmDeal.countDocuments({ stage: 'مغلق - ربح' }),
      CrmDeal.countDocuments({ stage: 'مغلق - خسارة' }),
      CrmDeal.countDocuments({ stage: { $nin: ['مغلق - ربح', 'مغلق - خسارة'] } }),
      CrmDeal.aggregate([
        { $match: { stage: 'مغلق - ربح' } },
        { $group: { _id: null, total: { $sum: '$value' }, avg: { $avg: '$value' } } }, { $limit: 1000 }
      ]),
      // Monthly trend (last 6 months)
      CrmDeal.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            leads: { $sum: 1 },
            won: { $sum: { $cond: [{ $eq: ['$stage', 'مغلق - ربح'] }, 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ['$stage', 'مغلق - خسارة'] }, 1, 0] } },
            revenue: { $sum: { $cond: [{ $eq: ['$stage', 'مغلق - ربح'] }, '$value', 0] } },
          },
        },
        { $sort: { _id: 1 } }, { $limit: 1000 }
      ]),
      // Pipeline distribution
      CrmDeal.aggregate([
        { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } }, { $limit: 1000 }
      ]),
      // Source distribution
      CrmDeal.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 1000 }
      ]),
      // Top performers
      CrmDeal.aggregate([
        { $match: { stage: 'مغلق - ربح', assignedToName: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$assignedToName',
            deals: { $sum: 1 },
            revenue: { $sum: '$value' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      // Recent activities
      CrmActivity.find().sort({ createdAt: -1 }).limit(10).lean(),
      // Upcoming follow-ups
      CrmFollowUp.find({
        status: 'مجدول',
        scheduledDate: { $gte: now },
      })
        .sort({ scheduledDate: 1 })
        .limit(5)
        .lean(),
      // Overdue follow-ups
      CrmFollowUp.countDocuments({ status: 'مجدول', scheduledDate: { $lt: now } }),
      // This month new
      CrmContact.countDocuments({ createdAt: { $gte: startOfMonth }, status: { $ne: 'محذوف' } }),
      CrmDeal.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const avgDealSize = revenueAgg[0]?.avg || 0;
    const conversionRate = totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(1) : 0;

    // Arabic month names
    const monthNames = {
      '01': 'يناير',
      '02': 'فبراير',
      '03': 'مارس',
      '04': 'أبريل',
      '05': 'مايو',
      '06': 'يونيو',
      '07': 'يوليو',
      '08': 'أغسطس',
      '09': 'سبتمبر',
      10: 'أكتوبر',
      11: 'نوفمبر',
      12: 'ديسمبر',
    };

    return {
      totalContacts,
      activeContacts,
      totalLeads: totalDeals,
      wonDeals,
      lostDeals,
      openDeals,
      totalRevenue,
      conversionRate: Number(conversionRate),
      avgDealSize: Math.round(avgDealSize),
      thisMonthNewContacts,
      thisMonthNewDeals,
      overdueFollowUps,
      monthlyTrend: monthlyTrend.map(m => ({
        month: monthNames[m._id.split('-')[1]] || m._id,
        leads: m.leads,
        won: m.won,
        lost: m.lost,
        revenue: m.revenue,
      })),
      pipelineDistribution: pipelineDistribution.map(p => ({
        stage: p._id || 'غير محدد',
        count: p.count,
        value: p.value,
      })),
      sourceDistribution: sourceDistribution.map(s => ({
        source: s._id || 'غير محدد',
        count: s.count,
      })),
      topPerformers: topPerformers.map(t => ({
        name: t._id,
        deals: t.deals,
        revenue: t.revenue,
      })),
      recentActivities: recentActivities.map(a => ({
        type: a.type,
        text: a.text,
        time: _timeAgo(a.createdAt),
      })),
      upcomingFollowUps,
    };
  }

  // ═══════════════════════════════════════════════
  // REPORTS — التقارير
  // ═══════════════════════════════════════════════

  async getConversionReport(params = {}) {
    const { startDate, endDate } = params;
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [overall, bySource, byMonth] = await Promise.all([
      CrmDeal.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ['$stage', 'مغلق - ربح'] }, 1, 0] } },
          },
        }, { $limit: 1000 }
      ]),
      CrmDeal.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$source',
            total: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ['$stage', 'مغلق - ربح'] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } }, { $limit: 1000 }
      ]),
      CrmDeal.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            total: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ['$stage', 'مغلق - ربح'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } }, { $limit: 1000 }
      ]),
    ]);

    const ov = overall[0] || { total: 0, converted: 0 };
    const monthNames = {
      '01': 'يناير',
      '02': 'فبراير',
      '03': 'مارس',
      '04': 'أبريل',
      '05': 'مايو',
      '06': 'يونيو',
      '07': 'يوليو',
      '08': 'أغسطس',
      '09': 'سبتمبر',
      10: 'أكتوبر',
      11: 'نوفمبر',
      12: 'ديسمبر',
    };

    // Avg time to convert
    const converted = await CrmDeal.find({
      stage: 'مغلق - ربح',
      actualCloseDate: { $exists: true },
    })
      .select('createdAt actualCloseDate')
      .lean();
    let avgDays = 0;
    if (converted.length > 0) {
      const totalDays = converted.reduce((sum, d) => {
        return sum + (new Date(d.actualCloseDate) - new Date(d.createdAt)) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDays = Math.round(totalDays / converted.length);
    }

    return {
      overall: {
        total: ov.total,
        converted: ov.converted,
        rate: ov.total > 0 ? Number(((ov.converted / ov.total) * 100).toFixed(1)) : 0,
      },
      bySource: bySource.map(s => ({
        source: s._id || 'غير محدد',
        total: s.total,
        converted: s.converted,
        rate: s.total > 0 ? Number(((s.converted / s.total) * 100).toFixed(1)) : 0,
      })),
      byMonth: byMonth.map(m => ({
        month: monthNames[m._id.split('-')[1]] || m._id,
        total: m.total,
        converted: m.converted,
        rate: m.total > 0 ? Number(((m.converted / m.total) * 100).toFixed(1)) : 0,
      })),
      avgTimeToConvert: `${avgDays} يوم`,
    };
  }

  async getActivityReport(params = {}) {
    const { startDate, endDate, limit: lim = 50 } = params;
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [byType, timeline, total] = await Promise.all([
      CrmActivity.aggregate([
        { $match: match },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 1000 }
      ]),
      CrmActivity.find(match).sort({ createdAt: -1 }).limit(Number(lim)).lean(),
      CrmActivity.countDocuments(match),
    ]);

    return {
      total,
      byType: byType.map(t => ({ type: t._id, count: t.count })),
      timeline: timeline.map(a => ({
        type: a.type,
        text: a.text,
        date: a.createdAt,
        user: a.userName,
      })),
    };
  }

  async getRevenueReport(params = {}) {
    const { startDate, endDate } = params;
    const match = { stage: 'مغلق - ربح' };
    if (startDate || endDate) {
      match.actualCloseDate = {};
      if (startDate) match.actualCloseDate.$gte = new Date(startDate);
      if (endDate) match.actualCloseDate.$lte = new Date(endDate);
    }

    const [byMonth, bySource, byAssignee, totals] = await Promise.all([
      CrmDeal.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: { $ifNull: ['$actualCloseDate', '$createdAt'] },
              },
            },
            revenue: { $sum: '$value' },
            deals: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } }, { $limit: 1000 }
      ]),
      CrmDeal.aggregate([
        { $match: match },
        { $group: { _id: '$source', revenue: { $sum: '$value' }, deals: { $sum: 1 } } },
        { $sort: { revenue: -1 } }, { $limit: 1000 }
      ]),
      CrmDeal.aggregate([
        { $match: { ...match, assignedToName: { $exists: true } } },
        { $group: { _id: '$assignedToName', revenue: { $sum: '$value' }, deals: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
      CrmDeal.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: '$value' },
            count: { $sum: 1 },
            avg: { $avg: '$value' },
            max: { $max: '$value' },
          },
        }, { $limit: 1000 }
      ]),
    ]);

    const monthNames = {
      '01': 'يناير',
      '02': 'فبراير',
      '03': 'مارس',
      '04': 'أبريل',
      '05': 'مايو',
      '06': 'يونيو',
      '07': 'يوليو',
      '08': 'أغسطس',
      '09': 'سبتمبر',
      10: 'أكتوبر',
      11: 'نوفمبر',
      12: 'ديسمبر',
    };

    const t = totals[0] || { total: 0, count: 0, avg: 0, max: 0 };

    return {
      totalRevenue: t.total,
      totalDeals: t.count,
      avgDealSize: Math.round(t.avg),
      maxDeal: t.max,
      byMonth: byMonth.map(m => ({
        month: monthNames[m._id?.split('-')[1]] || m._id,
        revenue: m.revenue,
        deals: m.deals,
      })),
      bySource: bySource.map(s => ({
        source: s._id || 'غير محدد',
        revenue: s.revenue,
        deals: s.deals,
      })),
      byAssignee: byAssignee.map(a => ({
        name: a._id,
        revenue: a.revenue,
        deals: a.deals,
      })),
    };
  }

  // ═══════════════════════════════════════════════
  // LEADS (Legacy Model Support) — العملاء المحتملين
  // ═══════════════════════════════════════════════

  async getLeads(query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      source,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (search) {
      filter.$or = [
        { firstName: { $regex: escapeRegex(search), $options: 'i' } },
        { lastName: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
        { phone: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const Lead = mongoose.model('Lead');
    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      Lead.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Lead.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async createLead(data, userId) {
    const Lead = mongoose.model('Lead');
    return Lead.create({ ...data, assignedTo: data.assignedTo || userId });
  }

  async updateLead(id, data) {
    const Lead = mongoose.model('Lead');
    const lead = await Lead.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!lead) throw new Error('العميل المحتمل غير موجود');
    return lead;
  }

  async deleteLead(id) {
    const Lead = mongoose.model('Lead');
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) throw new Error('العميل المحتمل غير موجود');
    return { message: 'تم حذف العميل المحتمل بنجاح' };
  }

  async updateLeadStage(id, stage) {
    const Lead = mongoose.model('Lead');
    const lead = await Lead.findByIdAndUpdate(id, { $set: { status: stage } }, { new: true });
    if (!lead) throw new Error('العميل المحتمل غير موجود');
    return lead;
  }

  async convertLeadToContact(leadId, userId, userName) {
    const Lead = mongoose.model('Lead');
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error('العميل المحتمل غير موجود');

    // Create contact from lead
    const contact = await CrmContact.create({
      name: `${lead.firstName} ${lead.lastName}`,
      contactPerson: `${lead.firstName} ${lead.lastName}`,
      type: 'فرد',
      email: lead.email,
      phone: lead.phone,
      status: 'نشط',
      notes: lead.notes?.map(n => n.body).join('\n') || '',
      createdBy: userId,
    });

    // Update lead status
    lead.status = 'CONVERTED';
    await lead.save();

    await this._logActivity(
      'new_contact',
      `تم تحويل العميل المحتمل "${lead.firstName} ${lead.lastName}" إلى جهة اتصال`,
      'contact',
      contact._id,
      userId,
      userName
    );
    return { contact, lead };
  }

  async getLeadsPipeline() {
    const Lead = mongoose.model('Lead');
    const stages = ['NEW', 'CONTACTED', 'ASSESSMENT_BOOKED', 'CONVERTED', 'LOST'];
    const pipeline = await Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $limit: 1000 }]);

    const map = {};
    pipeline.forEach(p => {
      map[p._id] = p.count;
    });

    return stages.map(s => ({ stage: s, count: map[s] || 0 }));
  }

  // ═══════════════════════════════════════════════
  // ACTIVITIES — الأنشطة
  // ═══════════════════════════════════════════════

  async getActivities(query = {}) {
    const { page = 1, limit = 30, type } = query;
    const filter = {};
    if (type) filter.type = type;
    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      CrmActivity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      CrmActivity.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  // ═══════════════════════════════════════════════
  // SEED — بيانات تجريبية
  // ═══════════════════════════════════════════════

  async seedDemoData() {
    const existingContacts = await CrmContact.countDocuments();
    if (existingContacts > 0) {
      return { message: 'البيانات التجريبية موجودة بالفعل', contacts: existingContacts };
    }

    const names = [
      'شركة النخبة للتقنية',
      'مؤسسة الابتكار التعليمية',
      'شركة المستقبل للبرمجيات',
      'مجموعة الريادة',
      'شركة الأفق للاستشارات',
      'مؤسسة الأمانة الطبية',
      'شركة السلام للمقاولات',
      'مجموعة الإنجاز المالية',
      'شركة الوفاء للتجارة',
      'مؤسسة التميز للتدريب',
      'شركة الفجر للتقنية',
      'مؤسسة البناء الحديثة',
      'شركة التواصل الذكي',
      'مجموعة النجاح للخدمات',
      'شركة الأمل للتطوير',
    ];
    const people = [
      'أحمد محمد الغامدي',
      'فاطمة علي العتيبي',
      'خالد إبراهيم الشهري',
      'نورة سعد القحطاني',
      'محمد عبدالله الدوسري',
      'سارة يوسف الحربي',
      'عبدالرحمن خالد المطيري',
      'ريم فهد الزهراني',
      'يوسف أحمد العنزي',
      'هدى سلطان البلوي',
    ];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const types = ['شركة', 'فرد', 'جهة حكومية', 'مؤسسة تعليمية', 'منظمة غير ربحية'];
    const sectors = ['التعليم', 'الصحة', 'التقنية', 'البناء', 'المالية', 'التجارة', 'الصناعة'];
    const cities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'أبها', 'تبوك'];
    const tiers = ['بلاتيني', 'ذهبي', 'فضي', 'برونزي', 'عادي'];
    const stages = [
      'جديد',
      'اتصال أولي',
      'عرض مقدم',
      'تفاوض',
      'مراجعة العقد',
      'مغلق - ربح',
      'مغلق - خسارة',
    ];
    const sources = ['موقع إلكتروني', 'إحالة', 'معرض', 'إعلان', 'شبكات اجتماعية', 'اتصال مباشر'];
    const priorities = ['عالية', 'متوسطة', 'منخفضة'];

    // Create contacts
    const contacts = [];
    for (let i = 0; i < 30; i++) {
      contacts.push({
        name: names[i % names.length],
        contactPerson: people[i % people.length],
        type: pick(types),
        sector: pick(sectors),
        email: `info@company${i + 1}.sa`,
        phone: `05${rand(10000000, 99999999)}`,
        city: pick(cities),
        status: pick(['نشط', 'نشط', 'نشط', 'غير نشط', 'معلق']),
        tier: pick(tiers),
        totalDeals: rand(0, 15),
        totalRevenue: rand(50000, 2000000),
        lastContact: new Date(2026, rand(0, 2), rand(1, 28)),
        notes: 'عميل تجريبي — بيانات ديمو',
      });
    }
    const createdContacts = await CrmContact.insertMany(contacts);

    // Create deals
    const deals = [];
    for (let i = 0; i < 40; i++) {
      const c = createdContacts[i % createdContacts.length];
      const stage = pick(stages);
      deals.push({
        title: `صفقة ${c.name} - ${i + 1}`,
        contact: c._id,
        contactName: c.name,
        value: rand(10000, 500000),
        stage,
        priority: pick(priorities),
        probability: stage === 'مغلق - ربح' ? 100 : stage === 'مغلق - خسارة' ? 0 : rand(10, 90),
        source: pick(sources),
        assignedToName: pick(people),
        expectedCloseDate: new Date(2026, rand(2, 8), rand(1, 28)),
        actualCloseDate: stage.includes('مغلق') ? new Date(2026, rand(0, 2), rand(1, 28)) : null,
        createdAt: new Date(2026, rand(0, 2), rand(1, 28)),
        notes: 'صفقة تجريبية',
      });
    }
    await CrmDeal.insertMany(deals);

    // Create follow-ups
    const followUps = [];
    const fuTypes = ['اتصال هاتفي', 'بريد إلكتروني', 'زيارة', 'اجتماع', 'عرض تقديمي'];
    for (let i = 0; i < 20; i++) {
      const c = createdContacts[i % createdContacts.length];
      followUps.push({
        contact: c._id,
        contactName: c.name,
        type: pick(fuTypes),
        subject: `متابعة ${pick(['عرض سعر', 'عقد', 'استفسار', 'شكوى', 'طلب خدمة'])}`,
        scheduledDate: new Date(2026, rand(2, 5), rand(1, 28)),
        status: pick(['مجدول', 'مجدول', 'مكتمل', 'ملغي']),
        priority: pick(priorities),
        assignedToName: pick(people),
        notes: 'متابعة تجريبية',
      });
    }
    await CrmFollowUp.insertMany(followUps);

    // Create activities
    const activities = [];
    const actTypes = [
      'deal_won',
      'deal_lost',
      'new_lead',
      'new_contact',
      'follow_up',
      'stage_change',
    ];
    for (let i = 0; i < 30; i++) {
      activities.push({
        type: pick(actTypes),
        text: `نشاط تجريبي ${i + 1}: ${pick(['إضافة عميل', 'كسب صفقة', 'خسارة صفقة', 'متابعة مكتملة', 'تغيير مرحلة'])}`,
        userName: pick(people),
        createdAt: new Date(2026, rand(0, 2), rand(1, 28)),
      });
    }
    await CrmActivity.insertMany(activities);

    return {
      message: 'تم إنشاء البيانات التجريبية بنجاح',
      contacts: createdContacts.length,
      deals: deals.length,
      followUps: followUps.length,
      activities: activities.length,
    };
  }
}

// ─── Time Ago Helper ──────────────────────────────────────────
function _timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'الآن';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ساعة`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} يوم`;
  return `${Math.floor(seconds / 604800)} أسبوع`;
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

const crmAdvancedService = new CRMAdvancedService();

module.exports = {
  CRMAdvancedService,
  crmAdvancedService,
  CrmContact,
  CrmDeal,
  CrmFollowUp,
  CrmActivity,
};
