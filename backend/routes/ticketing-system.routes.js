/**
 * Ticketing System Routes — نظام التذاكر والدعم الفني الشامل
 * البرومبت 22: Tickets + SLA + Escalation + Comments + Dashboard
 *
 * Endpoints:
 *   GET    /                       قائمة التذاكر (فلترة متقدمة)
 *   POST   /                       إنشاء تذكرة جديدة
 *   GET    /dashboard              لوحة إحصائيات التذاكر
 *   GET    /sla-configs            إعدادات SLA
 *   POST   /sla-configs            إنشاء إعداد SLA
 *   PUT    /sla-configs/:id        تحديث إعداد SLA
 *   GET    /escalation-rules       قواعد التصعيد
 *   POST   /escalation-rules       إنشاء قاعدة تصعيد
 *   PUT    /escalation-rules/:id   تحديث قاعدة تصعيد
 *   GET    /auto-assignments       قواعد التعيين التلقائي
 *   POST   /auto-assignments       إنشاء قاعدة تعيين
 *   GET    /:id                    تفاصيل تذكرة
 *   PUT    /:id/status             تغيير حالة التذكرة
 *   PUT    /:id/assign             تعيين التذكرة لمستخدم
 *   POST   /:id/comments           إضافة تعليق
 *   GET    /:id/comments           قائمة التعليقات
 *   POST   /:id/rate               تقييم التذكرة
 *   POST   /check-sla              فحص وتصعيد التذاكر المتأخرة (Cron job)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Models
const {
  TicketEnhanced,
  TicketComment,
  TicketSlaConfig,
  TicketEscalationRule,
  TicketAutoAssignment,
} = require('../models/TicketEnhanced');
const escapeRegex = require('../utils/escapeRegex');

router.use(authenticate);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPEN_STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'waiting_info',
  'waiting_vendor',
  'reopened',
];
const CLOSED_STATUSES = ['resolved', 'closed', 'cancelled'];

const TYPE_LABELS = {
  technical_issue: 'مشكلة تقنية',
  maintenance: 'طلب صيانة',
  equipment_request: 'طلب أجهزة',
  complaint: 'شكوى',
  suggestion: 'اقتراح',
  training_request: 'طلب تدريب',
  access_request: 'طلب صلاحيات',
  data_request: 'طلب بيانات',
  other: 'أخرى',
};

const STATUS_LABELS = {
  open: 'مفتوحة',
  assigned: 'مُعينة',
  in_progress: 'قيد العمل',
  waiting_info: 'بانتظار معلومات',
  waiting_vendor: 'بانتظار مورد',
  resolved: 'محلولة',
  closed: 'مغلقة',
  reopened: 'أُعيد فتحها',
  cancelled: 'ملغاة',
};

/**
 * حساب ساعات العمل الفعلية
 * تُضاف ساعات العمل فقط من الأحد إلى الخميس 8:00-17:00
 */
function addBusinessHours(startDate, hours) {
  const WORK_START = 8;
  const WORK_END = 17;
  const WEEKEND = [5, 6]; // الجمعة والسبت

  let current = new Date(startDate);
  let remaining = hours;

  while (remaining > 0) {
    const dayOfWeek = current.getDay();

    if (WEEKEND.includes(dayOfWeek)) {
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START, 0, 0, 0);
      continue;
    }

    if (current.getHours() < WORK_START) {
      current.setHours(WORK_START, 0, 0, 0);
    }

    if (current.getHours() >= WORK_END) {
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START, 0, 0, 0);
      continue;
    }

    const availableToday = WORK_END - current.getHours();

    if (remaining <= availableToday) {
      current.setHours(current.getHours() + remaining);
      remaining = 0;
    } else {
      remaining -= availableToday;
      current.setDate(current.getDate() + 1);
      current.setHours(WORK_START, 0, 0, 0);
    }
  }

  return current;
}

/**
 * حساب SLA لتذكرة
 */
async function calculateSla(ticket) {
  const slaConfig = await TicketSlaConfig.findOne({
    priority: ticket.priority,
    isActive: true,
    $or: [{ type: ticket.type }, { type: null }],
  }).sort({ type: -1 }); // الأخص أولاً

  if (!slaConfig) return;

  const now = new Date();
  const responseDeadline = slaConfig.businessHoursOnly
    ? addBusinessHours(now, slaConfig.responseTimeHours)
    : new Date(now.getTime() + slaConfig.responseTimeHours * 3600000);

  const resolutionDeadline = slaConfig.businessHoursOnly
    ? addBusinessHours(now, slaConfig.resolutionTimeHours)
    : new Date(now.getTime() + slaConfig.resolutionTimeHours * 3600000);

  ticket.slaResponseDeadline = responseDeadline;
  ticket.slaResolutionDeadline = resolutionDeadline;
  await ticket.save();
}

/**
 * التعيين التلقائي
 */
async function autoAssign(ticket) {
  const rule = await TicketAutoAssignment.findOne({
    type: ticket.type,
    isActive: true,
    $or: [{ branchId: ticket.branchId }, { branchId: null }],
  }).sort({ branchId: -1 });

  if (!rule) return;

  if (rule.assignToUserId) {
    ticket.assignedTo = rule.assignToUserId;
    ticket.status = 'assigned';
    await ticket.save();
  }
}

function requireAdmin(req, res, next) {
  const adminRoles = ['admin', 'super_admin', 'manager', 'it_manager'];
  if (!adminRoles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'غير مصرح — يتطلب صلاحية مدير' });
  }
  next();
}

// ─── LIST TICKETS ─────────────────────────────────────────────────────────────

/**
 * GET / — قائمة التذاكر مع فلترة متقدمة
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      priority,
      type,
      assignedTo,
      branchId,
      search,
      overdue,
      myTickets,
      assignedToMe,
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = 1,
      perPage = 20,
    } = req.query;

    const filter = { deletedAt: null };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (branchId) filter.branchId = branchId;
    if (myTickets === 'true') filter.createdBy = req.user.id;
    if (assignedToMe === 'true') filter.assignedTo = req.user.id;

    if (overdue === 'true') {
      filter.status = { $in: OPEN_STATUSES };
      filter.$or = [{ slaResponseBreached: true }, { slaResolutionBreached: true }];
    }

    if (search) {
      filter.$or = [
        { ticketNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { subject: { $regex: escapeRegex(search), $options: 'i' } },
        { description: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(perPage);
    const TICKET_SAFE_SORTS = new Set(['createdAt', 'priority', 'status', 'ticketNumber', 'subject', 'updatedAt', 'type']);
    const safeSortBy = TICKET_SAFE_SORTS.has(sortBy) ? sortBy : 'createdAt';
    const sort = { [safeSortBy]: sortDir === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      TicketEnhanced.find(filter)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('branchId', 'name nameAr')
        .sort(sort)
        .skip(skip)
        .limit(Number(perPage))
        .lean(),
      TicketEnhanced.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        perPage: Number(perPage),
        total,
        pages: Math.ceil(total / Number(perPage)),
      },
    });
  } catch (err) {
    logger.error('[Ticketing] list error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

/**
 * GET /dashboard — لوحة إحصائيات التذاكر
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { branchId } = req.query;
    const branchFilter = branchId ? { branchId } : {};
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      totalOpen,
      totalOverdue,
      byPriority,
      byType,
      byStatus,
      avgResponseTime,
      avgResolutionTime,
      avgSatisfaction,
      slaBreached,
      slaTotal,
    ] = await Promise.all([
      TicketEnhanced.countDocuments({
        ...branchFilter,
        status: { $in: OPEN_STATUSES },
        deletedAt: null,
      }),
      TicketEnhanced.countDocuments({
        ...branchFilter,
        status: { $in: OPEN_STATUSES },
        $or: [{ slaResponseBreached: true }, { slaResolutionBreached: true }],
        deletedAt: null,
      }),
      TicketEnhanced.aggregate([
        { $match: { ...branchFilter, status: { $in: OPEN_STATUSES }, deletedAt: null } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      TicketEnhanced.aggregate([
        { $match: { ...branchFilter, status: { $in: OPEN_STATUSES }, deletedAt: null } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      TicketEnhanced.aggregate([
        { $match: { ...branchFilter, deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      TicketEnhanced.aggregate([
        {
          $match: {
            ...branchFilter,
            firstResponseAt: { $ne: null },
            createdAt: { $gte: monthStart },
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            avgMs: {
              $avg: { $subtract: ['$firstResponseAt', '$createdAt'] },
            },
          },
        },
      ]),
      TicketEnhanced.aggregate([
        {
          $match: {
            ...branchFilter,
            resolvedAt: { $ne: null },
            createdAt: { $gte: monthStart },
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            avgMs: {
              $avg: { $subtract: ['$resolvedAt', '$createdAt'] },
            },
          },
        },
      ]),
      TicketEnhanced.aggregate([
        {
          $match: {
            ...branchFilter,
            satisfactionRating: { $ne: null },
            createdAt: { $gte: monthStart },
            deletedAt: null,
          },
        },
        { $group: { _id: null, avg: { $avg: '$satisfactionRating' } } },
      ]),
      TicketEnhanced.countDocuments({
        ...branchFilter,
        slaResolutionDeadline: { $ne: null },
        slaResolutionBreached: true,
        createdAt: { $gte: monthStart },
        deletedAt: null,
      }),
      TicketEnhanced.countDocuments({
        ...branchFilter,
        slaResolutionDeadline: { $ne: null },
        createdAt: { $gte: monthStart },
        deletedAt: null,
      }),
    ]);

    const slaComplianceRate =
      slaTotal > 0 ? Math.round(((slaTotal - slaBreached) / slaTotal) * 100 * 10) / 10 : 100;

    return res.json({
      success: true,
      data: {
        totalOpen,
        totalOverdue,
        byPriority: byPriority.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byType: byType.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        avgResponseTimeHours: avgResponseTime[0]
          ? Math.round((avgResponseTime[0].avgMs / 3600000) * 10) / 10
          : 0,
        avgResolutionTimeHours: avgResolutionTime[0]
          ? Math.round((avgResolutionTime[0].avgMs / 3600000) * 10) / 10
          : 0,
        avgSatisfaction: avgSatisfaction[0] ? Math.round(avgSatisfaction[0].avg * 10) / 10 : 0,
        slaComplianceRate,
        period: 'current_month',
      },
    });
  } catch (err) {
    logger.error('[Ticketing] dashboard error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── CREATE TICKET ────────────────────────────────────────────────────────────

/**
 * POST / — إنشاء تذكرة جديدة
 */
router.post('/', async (req, res) => {
  try {
    const { type, category, priority, subject, description, affectedModule, tags, branchId } =
      req.body;

    const validTypes = Object.keys(TYPE_LABELS);
    const validPriorities = ['low', 'medium', 'high', 'critical'];

    if (!type || !validTypes.includes(type)) {
      return res.status(422).json({ success: false, message: 'نوع التذكرة غير صحيح' });
    }
    if (!priority || !validPriorities.includes(priority)) {
      return res.status(422).json({ success: false, message: 'الأولوية غير صحيحة' });
    }
    if (!subject || !description) {
      return res.status(422).json({ success: false, message: 'الموضوع والوصف مطلوبان' });
    }

    const ticket = await TicketEnhanced.create({
      createdBy: req.user.id,
      branchId: branchId || req.user.branchId || null,
      type,
      category: category || null,
      priority,
      subject,
      description,
      affectedModule: affectedModule || [],
      tags: tags || [],
    });

    // حساب SLA
    await calculateSla(ticket);

    // التعيين التلقائي
    await autoAssign(ticket);

    // تعليق نظام: تم إنشاء التذكرة
    await TicketComment.create({
      ticketId: ticket._id,
      userId: req.user.id,
      content: `تم إنشاء التذكرة بواسطة ${req.user.name || req.user.id}`,
      isSystem: true,
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء التذكرة بنجاح',
      data: ticket,
    });
  } catch (err) {
    logger.error('[Ticketing] create error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── TICKET DETAIL ────────────────────────────────────────────────────────────

/**
 * GET /:id — تفاصيل تذكرة
 */
router.get('/:id', async (req, res) => {
  try {
    const ticket = await TicketEnhanced.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('branchId', 'nameAr nameEn')
      .lean({ virtuals: true });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    // التعليقات (إخفاء الداخلية للمستخدم العادي)
    const isAdmin = ['admin', 'super_admin', 'manager', 'it_manager', 'it_support'].includes(
      req.user?.role
    );
    const commentsFilter = { ticketId: ticket._id };
    if (!isAdmin) commentsFilter.isInternal = false;

    const comments = await TicketComment.find(commentsFilter)
      .populate('userId', 'name')
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      data: { ...ticket, comments },
    });
  } catch (err) {
    logger.error('[Ticketing] show error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────

/**
 * PUT /:id/status — تحديث حالة التذكرة
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status, comment } = req.body;

    const validStatuses = Object.keys(STATUS_LABELS).filter(s => s !== 'open');
    if (!status || !validStatuses.includes(status)) {
      return res.status(422).json({ success: false, message: 'الحالة غير صحيحة' });
    }

    const ticket = await TicketEnhanced.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    // التحقق من الصلاحية
    const isAdmin = ['admin', 'super_admin', 'manager', 'it_manager'].includes(req.user?.role);
    const isCreator = ticket.createdBy.toString() === req.user.id;
    const isAssignee = ticket.assignedTo?.toString() === req.user.id;

    if (!isAdmin) {
      if (status === 'cancelled' && !isCreator) {
        return res.status(403).json({ success: false, message: 'فقط صاحب التذكرة يمكنه إلغاؤها' });
      }
      if (
        ['in_progress', 'waiting_info', 'waiting_vendor', 'resolved'].includes(status) &&
        !isAssignee
      ) {
        return res
          .status(403)
          .json({ success: false, message: 'فقط المُعين يمكنه تغيير هذه الحالة' });
      }
      if (status === 'reopened' && !isCreator) {
        return res
          .status(403)
          .json({ success: false, message: 'فقط صاحب التذكرة يمكنه إعادة فتحها' });
      }
      if (status === 'closed' && !isCreator) {
        return res.status(403).json({ success: false, message: 'فقط صاحب التذكرة يمكنه إغلاقها' });
      }
    }

    const oldStatus = ticket.status;
    ticket.status = status;

    if (status === 'in_progress' && !ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
    }
    if (status === 'resolved') ticket.resolvedAt = new Date();
    if (status === 'closed') ticket.closedAt = new Date();

    await ticket.save();

    // تعليق نظام
    await TicketComment.create({
      ticketId: ticket._id,
      userId: req.user.id,
      content:
        `تم تغيير الحالة من "${STATUS_LABELS[oldStatus]}" إلى "${STATUS_LABELS[status]}"` +
        (comment ? `\n\nملاحظة: ${comment}` : ''),
      isSystem: true,
    });

    return res.json({
      success: true,
      message: 'تم تحديث الحالة بنجاح',
      data: ticket,
    });
  } catch (err) {
    logger.error('[Ticketing] update status error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── ASSIGN TICKET ────────────────────────────────────────────────────────────

/**
 * PUT /:id/assign — تعيين التذكرة لمستخدم (للمدراء فقط)
 */
router.put('/:id/assign', requireAdmin, async (req, res) => {
  try {
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(422).json({ success: false, message: 'المُعين إليه مطلوب' });
    }

    const ticket = await TicketEnhanced.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    ticket.assignedTo = assignedTo;
    if (ticket.status === 'open') ticket.status = 'assigned';
    await ticket.save();

    // تعليق نظام
    await TicketComment.create({
      ticketId: ticket._id,
      userId: req.user.id,
      content: `تم تعيين التذكرة إلى: ${assignedTo}`,
      isSystem: true,
    });

    return res.json({
      success: true,
      message: 'تم تعيين التذكرة بنجاح',
      data: ticket,
    });
  } catch (err) {
    logger.error('[Ticketing] assign error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── COMMENTS ─────────────────────────────────────────────────────────────────

/**
 * GET /:id/comments — قائمة التعليقات
 */
router.get('/:id/comments', async (req, res) => {
  try {
    const ticket = await TicketEnhanced.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    const isAdmin = ['admin', 'super_admin', 'manager', 'it_manager', 'it_support'].includes(
      req.user?.role
    );
    const filter = { ticketId: req.params.id };
    if (!isAdmin) filter.isInternal = false;

    const comments = await TicketComment.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ success: true, data: comments, total: comments.length });
  } catch (err) {
    logger.error('[Ticketing] comments list error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /:id/comments — إضافة تعليق
 */
router.post('/:id/comments', async (req, res) => {
  try {
    const { content, isInternal } = req.body;

    if (!content) {
      return res.status(422).json({ success: false, message: 'محتوى التعليق مطلوب' });
    }

    const ticket = await TicketEnhanced.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    // فقط المدراء يمكنهم إضافة تعليقات داخلية
    const isAdmin = ['admin', 'super_admin', 'manager', 'it_manager', 'it_support'].includes(
      req.user?.role
    );
    const isInternalComment = isAdmin && (isInternal === true || isInternal === 'true');

    // تحديث وقت الاستجابة الأولى
    const isAssignee = ticket.assignedTo?.toString() === req.user.id;
    if (isAssignee && !ticket.firstResponseAt && !isInternalComment) {
      ticket.firstResponseAt = new Date();
      await ticket.save();
    }

    const comment = await TicketComment.create({
      ticketId: req.params.id,
      userId: req.user.id,
      content,
      isInternal: isInternalComment,
    });

    return res.status(201).json({
      success: true,
      message: 'تم إضافة التعليق',
      data: comment,
    });
  } catch (err) {
    logger.error('[Ticketing] add comment error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── RATE TICKET ──────────────────────────────────────────────────────────────

/**
 * POST /:id/rate — تقييم التذكرة بعد الحل
 */
router.post('/:id/rate', async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(422).json({ success: false, message: 'التقييم يجب أن يكون بين 1 و 5' });
    }

    const ticket = await TicketEnhanced.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    if (ticket.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    if (!['resolved', 'closed'].includes(ticket.status)) {
      return res
        .status(422)
        .json({ success: false, message: 'لا يمكن التقييم إلا بعد حل التذكرة' });
    }

    ticket.satisfactionRating = rating;
    ticket.satisfactionComment = comment || null;
    await ticket.save();

    return res.json({ success: true, message: 'شكراً لتقييمك' });
  } catch (err) {
    logger.error('[Ticketing] rate error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── SLA CONFIGS ──────────────────────────────────────────────────────────────

/**
 * GET /sla-configs — إعدادات SLA
 */
router.get('/sla-configs', requireAdmin, async (req, res) => {
  try {
    const configs = await TicketSlaConfig.find().sort({ priority: 1 }).lean();
    return res.json({ success: true, data: configs, total: configs.length });
  } catch (err) {
    logger.error('[Ticketing] sla configs error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /sla-configs — إنشاء إعداد SLA
 */
router.post('/sla-configs', requireAdmin, async (req, res) => {
  try {
    const {
      nameAr,
      nameEn,
      priority,
      type,
      responseTimeHours,
      resolutionTimeHours,
      businessHoursOnly,
    } = req.body;

    if (!nameAr || !priority || !responseTimeHours || !resolutionTimeHours) {
      return res
        .status(422)
        .json({ success: false, message: 'الاسم والأولوية ووقت الاستجابة والحل مطلوبة' });
    }

    const config = await TicketSlaConfig.create({
      nameAr,
      nameEn: nameEn || nameAr,
      priority,
      type: type || null,
      responseTimeHours,
      resolutionTimeHours,
      businessHoursOnly: businessHoursOnly !== false,
    });

    return res.status(201).json({ success: true, message: 'تم إنشاء إعداد SLA', data: config });
  } catch (err) {
    logger.error('[Ticketing] create sla config error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * PUT /sla-configs/:id — تحديث إعداد SLA
 */
router.put('/sla-configs/:id', requireAdmin, async (req, res) => {
  try {
    const config = await TicketSlaConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!config) return res.status(404).json({ success: false, message: 'الإعداد غير موجود' });
    return res.json({ success: true, message: 'تم تحديث إعداد SLA', data: config });
  } catch (err) {
    logger.error('[Ticketing] update sla config error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── ESCALATION RULES ─────────────────────────────────────────────────────────

/**
 * GET /escalation-rules — قواعد التصعيد
 */
router.get('/escalation-rules', requireAdmin, async (req, res) => {
  try {
    const rules = await TicketEscalationRule.find().sort({ level: 1 }).lean();
    return res.json({ success: true, data: rules, total: rules.length });
  } catch (err) {
    logger.error('[Ticketing] escalation rules error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /escalation-rules — إنشاء قاعدة تصعيد
 */
router.post('/escalation-rules', requireAdmin, async (req, res) => {
  try {
    const {
      level,
      triggerAfterHours,
      triggerType,
      notifyRoles,
      assignToUserId,
      sendEmail,
      sendSms,
    } = req.body;

    if (!level || !triggerAfterHours || !triggerType) {
      return res.status(422).json({ success: false, message: 'المستوى والمدة والنوع مطلوبة' });
    }

    const rule = await TicketEscalationRule.create({
      level,
      triggerAfterHours,
      triggerType,
      notifyRoles: notifyRoles || [],
      assignToUserId: assignToUserId || null,
      sendEmail: sendEmail !== false,
      sendSms: sendSms === true,
    });

    return res.status(201).json({ success: true, message: 'تم إنشاء قاعدة التصعيد', data: rule });
  } catch (err) {
    logger.error('[Ticketing] create escalation rule error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * PUT /escalation-rules/:id — تحديث قاعدة تصعيد
 */
router.put('/escalation-rules/:id', requireAdmin, async (req, res) => {
  try {
    const rule = await TicketEscalationRule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
    return res.json({ success: true, message: 'تم تحديث قاعدة التصعيد', data: rule });
  } catch (err) {
    logger.error('[Ticketing] update escalation rule error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── AUTO ASSIGNMENTS ─────────────────────────────────────────────────────────

/**
 * GET /auto-assignments — قواعد التعيين التلقائي
 */
router.get('/auto-assignments', requireAdmin, async (req, res) => {
  try {
    const rules = await TicketAutoAssignment.find().lean();
    return res.json({ success: true, data: rules, total: rules.length });
  } catch (err) {
    logger.error('[Ticketing] auto assignments error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

/**
 * POST /auto-assignments — إنشاء قاعدة تعيين تلقائي
 */
router.post('/auto-assignments', requireAdmin, async (req, res) => {
  try {
    const { type, category, branchId, assignToUserId, assignToRole, assignmentMethod } = req.body;

    if (!type) {
      return res.status(422).json({ success: false, message: 'نوع التذكرة مطلوب' });
    }

    const rule = await TicketAutoAssignment.create({
      type,
      category: category || null,
      branchId: branchId || null,
      assignToUserId: assignToUserId || null,
      assignToRole: assignToRole || null,
      assignmentMethod: assignmentMethod || 'direct',
    });

    return res.status(201).json({ success: true, message: 'تم إنشاء قاعدة التعيين', data: rule });
  } catch (err) {
    logger.error('[Ticketing] create auto assignment error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ─── CHECK SLA (Cron Job Trigger) ─────────────────────────────────────────────

/**
 * POST /check-sla — فحص وتصعيد التذاكر المتأخرة
 * يُستدعى من Cron Job كل 15 دقيقة
 */
router.post('/check-sla', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const escalated = [];

    // تذاكر تجاوزت SLA الاستجابة
    const responseBreached = await TicketEnhanced.find({
      status: { $in: OPEN_STATUSES },
      slaResponseBreached: false,
      slaResponseDeadline: { $ne: null, $lt: now },
      firstResponseAt: null,
      deletedAt: null,
    });

    for (const ticket of responseBreached) {
      ticket.slaResponseBreached = true;
      ticket.escalationLevel += 1;
      ticket.lastEscalatedAt = now;
      await ticket.save();

      await TicketComment.create({
        ticketId: ticket._id,
        userId: null,
        content: `⚠️ تم تجاوز وقت الاستجابة المحدد في SLA. تم تصعيد التذكرة للمستوى ${ticket.escalationLevel}`,
        isSystem: true,
        isInternal: true,
      });

      escalated.push({ ticketNumber: ticket.ticketNumber, reason: 'sla_response_breach' });
    }

    // تذاكر تجاوزت SLA الحل
    const resolutionBreached = await TicketEnhanced.find({
      status: { $in: OPEN_STATUSES },
      slaResolutionBreached: false,
      slaResolutionDeadline: { $ne: null, $lt: now },
      deletedAt: null,
    });

    for (const ticket of resolutionBreached) {
      ticket.slaResolutionBreached = true;
      ticket.escalationLevel = Math.max(ticket.escalationLevel, 1);
      ticket.lastEscalatedAt = now;
      await ticket.save();

      await TicketComment.create({
        ticketId: ticket._id,
        userId: null,
        content: `🚨 تم تجاوز وقت الحل المحدد في SLA. يرجى إيلاء هذه التذكرة الأولوية القصوى`,
        isSystem: true,
        isInternal: true,
      });

      escalated.push({ ticketNumber: ticket.ticketNumber, reason: 'sla_resolution_breach' });
    }

    logger.info(`[Ticketing] SLA check: ${escalated.length} tickets escalated`);

    return res.json({
      success: true,
      message: `تم فحص التذاكر. تم تصعيد ${escalated.length} تذكرة`,
      escalated,
    });
  } catch (err) {
    logger.error('[Ticketing] check-sla error', { error: err.message });
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
