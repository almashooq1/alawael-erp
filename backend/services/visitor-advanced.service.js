/**
 * 🏢 خدمة سجل الزوار المتقدمة — Advanced Visitor Registry Service
 * AlAwael ERP — Full Database-Backed Visitor Management
 * Covers: Registration, Check-in/out, Blacklist, Analytics, History, Export
 */
const mongoose = require('mongoose');
const Visitor = require('../models/Visitor');
const logger = require('../utils/logger');

// ─── Blacklist Schema ────────────────────────────────────────────────────────
const blacklistSchema = new mongoose.Schema(
  {
    nationalId: { type: String },
    fullName: { type: String, required: true },
    phone: { type: String },
    reason: { type: String, required: true },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockedByName: { type: String },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);
blacklistSchema.index({ nationalId: 1 });
blacklistSchema.index({ phone: 1 });
blacklistSchema.index({ isActive: 1 });

const VisitorBlacklist =
  mongoose.models.VisitorBlacklist || mongoose.model('VisitorBlacklist', blacklistSchema);

// ─── Visitor Log (audit) Schema ──────────────────────────────────────────────
const visitorLogSchema = new mongoose.Schema(
  {
    visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor', index: true },
    action: {
      type: String,
      enum: [
        'pre_registered',
        'checked_in',
        'checked_out',
        'cancelled',
        'updated',
        'blacklisted',
        'badge_assigned',
      ],
      required: true,
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedByName: { type: String },
    details: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);
visitorLogSchema.index({ createdAt: -1 });

const VisitorLog = mongoose.models.VisitorLog || mongoose.model('VisitorLog', visitorLogSchema);

// ─── Helper: Log action ─────────────────────────────────────────────────────
async function logAction(visitorId, action, userId, userName, details, metadata) {
  try {
    await VisitorLog.create({
      visitor: visitorId,
      action,
      performedBy: userId,
      performedByName: userName || 'النظام',
      details,
      metadata,
    });
  } catch (e) {
    logger.warn('Visitor log error:', e.message);
  }
}

// ─── Helper: Generate visitor ID ─────────────────────────────────────────────
async function generateVisitorId() {
  const year = new Date().getFullYear();
  const count = await Visitor.countDocuments();
  return `VIS-${year}-${String(count + 1).padStart(5, '0')}`;
}

// ─── Helper: Check blacklist ─────────────────────────────────────────────────
async function checkBlacklist(visitor) {
  const conditions = [];
  if (visitor.nationalId) conditions.push({ nationalId: visitor.nationalId });
  if (visitor.phone) conditions.push({ phone: visitor.phone });
  if (conditions.length === 0) return null;

  const blocked = await VisitorBlacklist.findOne({
    $and: [
      { $or: conditions },
      { isActive: true },
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
    ],
  });
  return blocked;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════
class VisitorAdvancedService {
  // ─── List visitors (paginated, filterable, searchable) ───────────────
  async getVisitors(query = {}) {
    const {
      page = 1,
      limit = 25,
      status,
      purpose,
      search,
      branch,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = {};
    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;
    if (branch) filter.branch = branch;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { visitorId: { $regex: search, $options: 'i' } },
        { hostName: { $regex: search, $options: 'i' } },
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      Visitor.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Visitor.countDocuments(filter),
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

  // ─── Get single visitor with full details ────────────────────────────
  async getVisitorById(id) {
    const visitor = await Visitor.findById(id).lean();
    if (!visitor) throw new Error('الزائر غير موجود');

    const [logs, visitHistory] = await Promise.all([
      VisitorLog.find({ visitor: id }).sort({ createdAt: -1 }).limit(50).lean(),
      // Find previous visits by same person
      visitor.nationalId
        ? Visitor.find({
            nationalId: visitor.nationalId,
            _id: { $ne: id },
          })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()
        : Promise.resolve([]),
    ]);

    return { ...visitor, logs, visitHistory, totalPreviousVisits: visitHistory.length };
  }

  // ─── Pre-register a new visitor ──────────────────────────────────────
  async registerVisitor(data, userId, userName) {
    // Check blacklist
    const blocked = await checkBlacklist(data);
    if (blocked) {
      throw new Error(`هذا الزائر محظور: ${blocked.reason}`);
    }

    const visitorId = await generateVisitorId();
    const visitor = await Visitor.create({
      ...data,
      visitorId,
      status: 'pre_registered',
      registeredBy: userId,
    });

    await logAction(
      visitor._id,
      'pre_registered',
      userId,
      userName,
      `تم تسجيل الزائر مسبقاً: ${visitor.fullName}`
    );

    return visitor;
  }

  // ─── Update visitor data ─────────────────────────────────────────────
  async updateVisitor(id, data, userId, userName) {
    // Don't allow changing status through update
    delete data.status;
    delete data.checkInTime;
    delete data.checkOutTime;

    const visitor = await Visitor.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!visitor) throw new Error('الزائر غير موجود');

    await logAction(
      visitor._id,
      'updated',
      userId,
      userName,
      `تم تحديث بيانات الزائر: ${visitor.fullName}`
    );

    return visitor;
  }

  // ─── Check in visitor ────────────────────────────────────────────────
  async checkIn(id, data = {}, userId, userName) {
    const visitor = await Visitor.findById(id);
    if (!visitor) throw new Error('الزائر غير موجود');
    if (visitor.status === 'checked_in') throw new Error('الزائر مسجل دخوله بالفعل');
    if (visitor.status === 'checked_out') throw new Error('الزائر غادر بالفعل');

    // Check blacklist before check-in
    const blocked = await checkBlacklist(visitor);
    if (blocked) {
      throw new Error(`هذا الزائر محظور: ${blocked.reason}`);
    }

    visitor.status = 'checked_in';
    visitor.checkInTime = new Date();
    visitor.badgeNumber =
      data.badgeNumber || `B-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    if (data.vehiclePlate) visitor.vehiclePlate = data.vehiclePlate;
    if (data.belongings) visitor.belongings = data.belongings;
    if (data.notes) visitor.notes = data.notes;
    await visitor.save();

    await logAction(
      visitor._id,
      'checked_in',
      userId,
      userName,
      `دخول الزائر: ${visitor.fullName} - بطاقة: ${visitor.badgeNumber}`
    );

    return visitor;
  }

  // ─── Check out visitor ───────────────────────────────────────────────
  async checkOut(id, data = {}, userId, userName) {
    const visitor = await Visitor.findById(id);
    if (!visitor) throw new Error('الزائر غير موجود');
    if (visitor.status !== 'checked_in') throw new Error('الزائر غير مسجل دخوله');

    visitor.status = 'checked_out';
    visitor.checkOutTime = new Date();
    if (data.notes) visitor.notes = (visitor.notes || '') + '\n' + data.notes;
    await visitor.save();

    // Calculate visit duration
    const duration = visitor.checkInTime
      ? Math.round((visitor.checkOutTime - visitor.checkInTime) / 60000)
      : 0;

    await logAction(
      visitor._id,
      'checked_out',
      userId,
      userName,
      `خروج الزائر: ${visitor.fullName} - مدة الزيارة: ${duration} دقيقة`,
      { durationMinutes: duration }
    );

    return { ...visitor.toObject(), durationMinutes: duration };
  }

  // ─── Cancel visitor registration ─────────────────────────────────────
  async cancelVisit(id, reason, userId, userName) {
    const visitor = await Visitor.findById(id);
    if (!visitor) throw new Error('الزائر غير موجود');
    if (visitor.status === 'checked_out') throw new Error('لا يمكن إلغاء زيارة مكتملة');

    visitor.status = 'cancelled';
    visitor.notes = (visitor.notes || '') + `\nسبب الإلغاء: ${reason || 'غير محدد'}`;
    await visitor.save();

    await logAction(
      visitor._id,
      'cancelled',
      userId,
      userName,
      `تم إلغاء زيارة: ${visitor.fullName} - السبب: ${reason || 'غير محدد'}`
    );

    return visitor;
  }

  // ─── Mark as no-show ─────────────────────────────────────────────────
  async markNoShow(id, userId, userName) {
    const visitor = await Visitor.findById(id);
    if (!visitor) throw new Error('الزائر غير موجود');
    if (visitor.status !== 'pre_registered')
      throw new Error('يمكن تعليم "لم يحضر" فقط للمسجلين مسبقاً');

    visitor.status = 'no_show';
    await visitor.save();

    await logAction(
      visitor._id,
      'cancelled',
      userId,
      userName,
      `الزائر لم يحضر: ${visitor.fullName}`
    );

    return visitor;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STATISTICS & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════

  // ─── Today's stats ───────────────────────────────────────────────────
  async getTodayStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const filter = { createdAt: { $gte: startOfDay, $lte: endOfDay } };

    const [total, checkedIn, checkedOut, cancelled, noShow] = await Promise.all([
      Visitor.countDocuments(filter),
      Visitor.countDocuments({ ...filter, status: 'checked_in' }),
      Visitor.countDocuments({ ...filter, status: 'checked_out' }),
      Visitor.countDocuments({ ...filter, status: 'cancelled' }),
      Visitor.countDocuments({ ...filter, status: 'no_show' }),
    ]);

    const preRegistered = total - checkedIn - checkedOut - cancelled - noShow;

    // Current inside the building
    const currentlyInside = await Visitor.countDocuments({ status: 'checked_in' });

    return {
      total,
      checkedIn,
      checkedOut,
      preRegistered: Math.max(0, preRegistered),
      cancelled,
      noShow,
      currentlyInside,
    };
  }

  // ─── Advanced analytics ──────────────────────────────────────────────
  async getAnalytics(query = {}) {
    const { period = '30d' } = query;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dateFilter = { createdAt: { $gte: startDate } };

    const [
      totalVisitors,
      byPurpose,
      byStatus,
      byDepartment,
      dailyTrend,
      avgDuration,
      topHosts,
      peakHours,
      frequentVisitors,
    ] = await Promise.all([
      // Total
      Visitor.countDocuments(dateFilter),

      // By purpose
      Visitor.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$purpose', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // By status
      Visitor.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // By department
      Visitor.aggregate([
        { $match: { ...dateFilter, hostDepartment: { $ne: null } } },
        { $group: { _id: '$hostDepartment', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Daily trend
      Visitor.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            checkedIn: {
              $sum: { $cond: [{ $in: ['$status', ['checked_in', 'checked_out']] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Average visit duration (for checked-out visitors)
      Visitor.aggregate([
        {
          $match: {
            ...dateFilter,
            status: 'checked_out',
            checkInTime: { $ne: null },
            checkOutTime: { $ne: null },
          },
        },
        {
          $project: {
            duration: { $subtract: ['$checkOutTime', '$checkInTime'] },
          },
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' },
            minDuration: { $min: '$duration' },
            maxDuration: { $max: '$duration' },
            totalVisits: { $sum: 1 },
          },
        },
      ]),

      // Top hosts
      Visitor.aggregate([
        { $match: { ...dateFilter, hostName: { $ne: null } } },
        {
          $group: {
            _id: '$hostName',
            count: { $sum: 1 },
            department: { $first: '$hostDepartment' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Peak hours
      Visitor.aggregate([
        { $match: { ...dateFilter, checkInTime: { $ne: null } } },
        { $group: { _id: { $hour: '$checkInTime' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Frequent visitors
      Visitor.aggregate([
        { $match: { ...dateFilter, nationalId: { $nin: [null, ''] } } },
        {
          $group: {
            _id: '$nationalId',
            name: { $last: '$fullName' },
            company: { $last: '$company' },
            visitCount: { $sum: 1 },
            lastVisit: { $max: '$createdAt' },
          },
        },
        { $match: { visitCount: { $gte: 2 } } },
        { $sort: { visitCount: -1 } },
        { $limit: 15 },
      ]),
    ]);

    // Process average duration
    const durationInfo = avgDuration[0] || {};
    const avgMinutes = durationInfo.avgDuration ? Math.round(durationInfo.avgDuration / 60000) : 0;

    const purposeLabels = {
      meeting: 'اجتماع',
      delivery: 'توصيل',
      maintenance: 'صيانة',
      interview: 'مقابلة',
      inspection: 'تفتيش',
      personal: 'شخصي',
      other: 'أخرى',
    };

    const statusLabels = {
      pre_registered: 'مسجل مسبقاً',
      checked_in: 'داخل المبنى',
      checked_out: 'غادر',
      cancelled: 'ملغي',
      no_show: 'لم يحضر',
    };

    return {
      summary: {
        totalVisitors,
        avgDailyVisitors: days > 0 ? Math.round(totalVisitors / days) : 0,
        avgVisitDuration: avgMinutes,
        totalCompletedVisits: durationInfo.totalVisits || 0,
      },
      byPurpose: byPurpose.map(p => ({
        purpose: purposeLabels[p._id] || p._id || 'غير محدد',
        key: p._id,
        count: p.count,
      })),
      byStatus: byStatus.map(s => ({
        status: statusLabels[s._id] || s._id || 'غير محدد',
        key: s._id,
        count: s.count,
      })),
      byDepartment: byDepartment.map(d => ({
        department: d._id || 'غير محدد',
        count: d.count,
      })),
      dailyTrend: dailyTrend.map(d => ({
        date: d._id,
        total: d.count,
        actual: d.checkedIn,
      })),
      topHosts: topHosts.map(h => ({
        name: h._id,
        department: h.department || '',
        count: h.count,
      })),
      peakHours: peakHours.map(h => ({
        hour: h._id,
        label: `${String(h._id).padStart(2, '0')}:00`,
        count: h.count,
      })),
      frequentVisitors,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BLACKLIST
  // ═══════════════════════════════════════════════════════════════════════

  async getBlacklist(query = {}) {
    const { page = 1, limit = 20, search, activeOnly = true } = query;
    const filter = {};
    if (activeOnly === true || activeOnly === 'true') filter.isActive = true;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      VisitorBlacklist.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      VisitorBlacklist.countDocuments(filter),
    ]);

    return { data, pagination: { page: Number(page), limit: Number(limit), total } };
  }

  async addToBlacklist(data, userId, userName) {
    if (!data.fullName || !data.reason) {
      throw new Error('الاسم والسبب مطلوبان');
    }

    const entry = await VisitorBlacklist.create({
      ...data,
      blockedBy: userId,
      blockedByName: userName,
      isActive: true,
    });

    return entry;
  }

  async removeFromBlacklist(id, _userId, _userName) {
    const entry = await VisitorBlacklist.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!entry) throw new Error('السجل غير موجود');
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VISITOR LOGS / AUDIT
  // ═══════════════════════════════════════════════════════════════════════

  async getVisitorLogs(visitorId, query = {}) {
    const { limit = 50 } = query;
    return VisitorLog.find({ visitor: visitorId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
  }

  async getRecentLogs(query = {}) {
    const { limit = 50 } = query;
    return VisitorLog.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('visitor', 'fullName visitorId')
      .lean();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CURRENTLY INSIDE
  // ═══════════════════════════════════════════════════════════════════════

  async getCurrentlyInside() {
    return Visitor.find({ status: 'checked_in' }).sort({ checkInTime: -1 }).lean();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EXPECTED TODAY (pre-registered)
  // ═══════════════════════════════════════════════════════════════════════

  async getExpectedToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return Visitor.find({
      status: 'pre_registered',
      $or: [
        { expectedArrival: { $gte: startOfDay, $lte: endOfDay } },
        { createdAt: { $gte: startOfDay, $lte: endOfDay }, expectedArrival: null },
      ],
    })
      .sort({ expectedArrival: 1, createdAt: 1 })
      .lean();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SEED DEMO DATA
  // ═══════════════════════════════════════════════════════════════════════

  async seedDemoData() {
    const names = [
      'عبدالله محمد العتيبي',
      'فاطمة علي الشمري',
      'خالد سعيد القرني',
      'نورة عبدالرحمن الحربي',
      'سلطان فهد الدوسري',
      'ريم أحمد المالكي',
      'عمر حسن الزهراني',
      'سارة ناصر الغامدي',
      'بندر عبدالله البلوي',
      'لمى محمد الراشد',
      'يوسف سالم العنزي',
      'مها خالد السبيعي',
      'أحمد عبدالعزيز الرشيدي',
      'هند عبدالله الهاجري',
      'تركي ناصر المطيري',
      'وفاء حمد الشهري',
      'فيصل سعود الحربي',
      'أمل عبدالله القحطاني',
      'عبدالرحمن خالد العمري',
      'نوف فهد الجهني',
    ];

    const companies = [
      'شركة التقنية المتقدمة',
      'مؤسسة البناء الحديث',
      'شركة الرياض للصيانة',
      'مجموعة المستقبل',
      'شركة الأوائل',
      '',
      'مؤسسة الخدمات المتكاملة',
      'شركة سلامتك للحراسة',
      '',
      'شركة طيف للتوريد',
    ];

    const purposes = [
      'meeting',
      'delivery',
      'maintenance',
      'interview',
      'inspection',
      'personal',
      'other',
    ];
    const departments = [
      'الإدارة',
      'تقنية المعلومات',
      'الموارد البشرية',
      'المالية',
      'التأهيل',
      'الطبي',
      'المشتريات',
      'العلاقات العامة',
    ];
    const hosts = [
      'م. أحمد السالم',
      'د. سارة الخالد',
      'أ. محمد الفيصل',
      'م. فهد التركي',
      'أ. نورة الحمد',
      'م. عبدالله الراشد',
      'د. خالد السعيد',
      'أ. ريم البكر',
    ];

    const statuses = ['pre_registered', 'checked_in', 'checked_out', 'checked_out', 'checked_out'];
    const visitors = [];

    for (let i = 0; i < 20; i++) {
      const status = statuses[i % statuses.length];
      const now = new Date();
      const daysAgo = Math.floor(Math.random() * 14);
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - daysAgo);
      createdAt.setHours(7 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60));

      const checkInTime =
        status !== 'pre_registered'
          ? new Date(createdAt.getTime() + Math.random() * 3600000)
          : null;
      const checkOutTime =
        status === 'checked_out' && checkInTime
          ? new Date(checkInTime.getTime() + (30 + Math.random() * 180) * 60000)
          : null;

      const year = new Date().getFullYear();
      const visitorId = `VIS-${year}-${String(i + 1).padStart(5, '0')}`;

      visitors.push({
        visitorId,
        fullName: names[i],
        nationalId: `10${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        phone: `05${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        company: companies[i % companies.length],
        purpose: purposes[Math.floor(Math.random() * purposes.length)],
        hostName: hosts[Math.floor(Math.random() * hosts.length)],
        hostDepartment: departments[Math.floor(Math.random() * departments.length)],
        status,
        checkInTime,
        checkOutTime,
        badgeNumber: checkInTime ? `B-${String(i + 1).padStart(3, '0')}` : null,
        expectedArrival: status === 'pre_registered' ? new Date() : null,
        vehiclePlate:
          Math.random() > 0.5 ? `أ ب ت ${1000 + Math.floor(Math.random() * 9000)}` : null,
        createdAt,
      });
    }

    await Visitor.deleteMany({});
    await VisitorLog.deleteMany({});
    await Visitor.insertMany(visitors);

    logger.info(`Seeded ${visitors.length} demo visitors`);
    return { message: `تم إنشاء ${visitors.length} زائر تجريبي`, count: visitors.length };
  }
}

const visitorAdvancedService = new VisitorAdvancedService();

module.exports = {
  VisitorAdvancedService,
  visitorAdvancedService,
  VisitorBlacklist,
  VisitorLog,
};
