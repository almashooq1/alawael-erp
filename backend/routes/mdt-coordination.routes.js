/**
 * Multidisciplinary Team Coordination Routes
 * مسارات نظام التنسيق متعدد التخصصات
 *
 * Module 1: اجتماعات الفريق متعدد التخصصات (MDT Meetings)              — 15+ endpoints
 * Module 2: خطط التأهيل الموحدة (Unified Rehabilitation Plans)         — 20+ endpoints
 * Module 3: تذاكر الإحالة الداخلية (Internal Referral Tickets)         — 15+ endpoints
 * Module 4: لوحة المتابعة المشتركة (Shared Beneficiary Dashboard)      — 5+ endpoints
 * Module 5: محاضر الاجتماعات والقرارات (Meeting Minutes & Decisions)   — 10+ endpoints
 *
 * Total: 65+ endpoints
 */
const express = require('express');
const router = express.Router();
const { body, _param, _query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const { MDTMeeting, UnifiedRehabPlan, ReferralTicket } = require('../models/MDTCoordination');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 1: MDT Meetings — اجتماعات الفريق متعدد التخصصات
// ═══════════════════════════════════════════════════════════════════════════════

// ─── List MDT Meetings ───────────────────────────────────────────────────────
router.get('/meetings', async (req, res) => {
  try {
    const { status, type, department, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (department) filter.department = department;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      MDTMeeting.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(+limit)
        .populate('organizer', 'name email')
        .populate('attendees.user', 'name email')
        .lean(),
      MDTMeeting.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) },
      message: 'قائمة اجتماعات الفريق متعدد التخصصات',
    });
  } catch (error) {
    safeError(res, error, 'fetching MDT meetings');
  }
});

// ─── Get Single MDT Meeting ──────────────────────────────────────────────────
router.get('/meetings/:id', async (req, res) => {
  try {
    const meeting = await MDTMeeting.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('attendees.user', 'name email')
      .populate('cases.beneficiary', 'name mrn')
      .populate('cases.presentedBy', 'name')
      .lean();
    if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });
    res.json({ success: true, data: meeting, message: 'بيانات الاجتماع' });
  } catch (error) {
    safeError(res, error, 'fetching MDT meeting');
  }
});

// ─── Create MDT Meeting ──────────────────────────────────────────────────────
router.post(
  '/meetings',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  validate([
    body('title').trim().notEmpty().withMessage('عنوان الاجتماع مطلوب'),
    body('date').notEmpty().withMessage('التاريخ مطلوب').isISO8601().withMessage('تاريخ غير صالح'),
    body('startTime').notEmpty().withMessage('وقت البداية مطلوب'),
    body('type')
      .optional()
      .isIn([
        'REGULAR',
        'EMERGENCY',
        'CASE_REVIEW',
        'CARE_PLANNING',
        'DISCHARGE_PLANNING',
        'PROGRESS_REVIEW',
        'INITIAL_ASSESSMENT',
      ])
      .withMessage('نوع الاجتماع غير صالح'),
  ]),
  async (req, res) => {
    try {
      const count = await MDTMeeting.countDocuments();
      const meetingNumber = `MDT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const meeting = await MDTMeeting.create({
        ...req.body,
        meetingNumber,
        organizer: req.user.id,
        createdBy: req.user.id,
      });

      res
        .status(201)
        .json({ success: true, data: meeting, message: 'تم إنشاء اجتماع الفريق بنجاح' });
    } catch (error) {
      safeError(res, error, 'creating MDT meeting');
    }
  }
);

// ─── Update MDT Meeting ──────────────────────────────────────────────────────
router.put('/meetings/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const meeting = await MDTMeeting.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    }).lean();
    if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });
    res.json({ success: true, data: meeting, message: 'تم تحديث الاجتماع بنجاح' });
  } catch (error) {
    safeError(res, error, 'updating MDT meeting');
  }
});

// ─── Delete MDT Meeting ──────────────────────────────────────────────────────
router.delete('/meetings/:id', authorize(['admin']), async (req, res) => {
  try {
    const meeting = await MDTMeeting.findByIdAndDelete(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });
    res.json({ success: true, message: 'تم حذف الاجتماع بنجاح' });
  } catch (error) {
    safeError(res, error, 'deleting MDT meeting');
  }
});

// ─── Add Attendee to Meeting ─────────────────────────────────────────────────
router.post(
  '/meetings/:id/attendees',
  authorize(['admin', 'manager']),
  validate([
    body('name').trim().notEmpty().withMessage('اسم الحاضر مطلوب'),
    body('role').trim().notEmpty().withMessage('الدور مطلوب'),
  ]),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      meeting.attendees.push(req.body);
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تمت إضافة الحاضر بنجاح' });
    } catch (error) {
      safeError(res, error, 'adding attendee');
    }
  }
);

// ─── Update Attendee Attendance ──────────────────────────────────────────────
router.patch(
  '/meetings/:id/attendees/:attendeeId/attendance',
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      const attendee = meeting.attendees.id(req.params.attendeeId);
      if (!attendee) return res.status(404).json({ success: false, message: 'الحاضر غير موجود' });

      attendee.attendance = req.body.attendance || 'PRESENT';
      attendee.contributionNotes = req.body.contributionNotes || attendee.contributionNotes;
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تم تحديث حضور العضو' });
    } catch (error) {
      safeError(res, error, 'updating attendance');
    }
  }
);

// ─── Add Case to Meeting ─────────────────────────────────────────────────────
router.post(
  '/meetings/:id/cases',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  validate([body('beneficiary').notEmpty().withMessage('المستفيد مطلوب')]),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      meeting.cases.push({
        ...req.body,
        presentedBy: req.user.id,
      });
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تمت إضافة الحالة للاجتماع' });
    } catch (error) {
      safeError(res, error, 'adding case to meeting');
    }
  }
);

// ─── Update Case Discussion ──────────────────────────────────────────────────
router.patch(
  '/meetings/:id/cases/:caseId',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      const caseItem = meeting.cases.id(req.params.caseId);
      if (!caseItem) return res.status(404).json({ success: false, message: 'الحالة غير موجودة' });

      Object.assign(caseItem, stripUpdateMeta(req.body));
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تم تحديث بيانات الحالة' });
    } catch (error) {
      safeError(res, error, 'updating case');
    }
  }
);

// ─── Add Decision to Case ────────────────────────────────────────────────────
router.post(
  '/meetings/:id/cases/:caseId/decisions',
  authorize(['admin', 'manager', 'doctor']),
  validate([body('title').trim().notEmpty().withMessage('عنوان القرار مطلوب')]),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      const caseItem = meeting.cases.id(req.params.caseId);
      if (!caseItem) return res.status(404).json({ success: false, message: 'الحالة غير موجودة' });

      caseItem.decisions.push({
        ...req.body,
        madeBy: req.user.id,
      });
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تم إضافة القرار بنجاح' });
    } catch (error) {
      safeError(res, error, 'adding decision');
    }
  }
);

// ─── Add Agenda Item ─────────────────────────────────────────────────────────
router.post(
  '/meetings/:id/agenda',
  authorize(['admin', 'manager']),
  validate([body('topic').trim().notEmpty().withMessage('موضوع جدول الأعمال مطلوب')]),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      const order = meeting.agenda.length + 1;
      meeting.agenda.push({ ...req.body, order });
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تمت إضافة بند جدول الأعمال' });
    } catch (error) {
      safeError(res, error, 'adding agenda item');
    }
  }
);

// ─── Meeting Statistics ──────────────────────────────────────────────────────
router.get('/meetings-stats', async (req, res) => {
  try {
    const { year, month } = req.query;
    const dateFilter = {};
    if (year) {
      const start = new Date(+year, month ? +month - 1 : 0, 1);
      const end = month
        ? new Date(+year, +month, 0, 23, 59, 59)
        : new Date(+year, 11, 31, 23, 59, 59);
      dateFilter.date = { $gte: start, $lte: end };
    }

    const [totalMeetings, statusCounts, typeCounts, avgAttendees] = await Promise.all([
      MDTMeeting.countDocuments(dateFilter),
      MDTMeeting.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $limit: 1000 },
      ]),
      MDTMeeting.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $limit: 1000 },
      ]),
      MDTMeeting.aggregate([
        { $match: dateFilter },
        {
          $project: { attendeeCount: { $size: { $ifNull: ['$attendees', []] } } },
        },
        { $group: { _id: null, avg: { $avg: '$attendeeCount' } } },
        { $limit: 1000 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalMeetings,
        byStatus: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byType: typeCounts.reduce((acc, t) => ({ ...acc, [t._id]: t.count }), {}),
        averageAttendees: avgAttendees[0]?.avg || 0,
      },
      message: 'إحصائيات الاجتماعات',
    });
  } catch (error) {
    safeError(res, error, 'fetching meeting stats');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 2: Unified Rehabilitation Plans — خطط التأهيل الموحدة
// ═══════════════════════════════════════════════════════════════════════════════

// ─── List Unified Rehab Plans ────────────────────────────────────────────────
router.get('/plans', async (req, res) => {
  try {
    const { status, beneficiary, leadTherapist, reviewDue, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (beneficiary) filter.beneficiary = beneficiary;
    if (leadTherapist) filter.leadTherapist = leadTherapist;
    if (reviewDue === 'true') {
      filter.reviewDate = { $lte: new Date() };
      filter.status = { $in: ['ACTIVE', 'PENDING_APPROVAL'] };
    }
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      UnifiedRehabPlan.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(+limit)
        .populate('beneficiary', 'name mrn')
        .populate('leadTherapist', 'name email')
        .populate('teamMembers.therapist', 'name email')
        .lean(),
      UnifiedRehabPlan.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) },
      message: 'قائمة خطط التأهيل الموحدة',
    });
  } catch (error) {
    safeError(res, error, 'fetching unified plans');
  }
});

// ─── Get Single Plan ─────────────────────────────────────────────────────────
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = await UnifiedRehabPlan.findById(req.params.id)
      .populate('beneficiary', 'name mrn status')
      .populate('leadTherapist', 'name email')
      .populate('teamMembers.therapist', 'name email')
      .populate('goals.responsibleTherapist', 'name')
      .populate('linkedMeetings')
      .lean();
    if (!plan) return res.status(404).json({ success: false, message: 'خطة التأهيل غير موجودة' });
    res.json({ success: true, data: plan, message: 'بيانات خطة التأهيل' });
  } catch (error) {
    safeError(res, error, 'fetching unified plan');
  }
});

// ─── Create Unified Rehab Plan ───────────────────────────────────────────────
router.post(
  '/plans',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  validate([
    body('title').trim().notEmpty().withMessage('عنوان الخطة مطلوب'),
    body('beneficiary').notEmpty().withMessage('المستفيد مطلوب'),
    body('startDate')
      .notEmpty()
      .withMessage('تاريخ البداية مطلوب')
      .isISO8601()
      .withMessage('تاريخ غير صالح'),
  ]),
  async (req, res) => {
    try {
      const count = await UnifiedRehabPlan.countDocuments();
      const planNumber = `URP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const plan = await UnifiedRehabPlan.create({
        ...req.body,
        planNumber,
        createdBy: req.user.id,
        leadTherapist: req.body.leadTherapist || req.user.id,
      });

      res
        .status(201)
        .json({ success: true, data: plan, message: 'تم إنشاء خطة التأهيل الموحدة بنجاح' });
    } catch (error) {
      safeError(res, error, 'creating unified plan');
    }
  }
);

// ─── Update Plan ─────────────────────────────────────────────────────────────
router.put('/plans/:id', authorize(['admin', 'manager', 'therapist']), async (req, res) => {
  try {
    const plan = await UnifiedRehabPlan.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    }).lean();
    if (!plan) return res.status(404).json({ success: false, message: 'خطة التأهيل غير موجودة' });
    res.json({ success: true, data: plan, message: 'تم تحديث خطة التأهيل بنجاح' });
  } catch (error) {
    safeError(res, error, 'updating unified plan');
  }
});

// ─── Delete Plan ─────────────────────────────────────────────────────────────
router.delete('/plans/:id', authorize(['admin']), async (req, res) => {
  try {
    const plan = await UnifiedRehabPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'خطة التأهيل غير موجودة' });
    res.json({ success: true, message: 'تم حذف خطة التأهيل بنجاح' });
  } catch (error) {
    safeError(res, error, 'deleting unified plan');
  }
});

// ─── Add Team Member to Plan ─────────────────────────────────────────────────
router.post(
  '/plans/:id/team-members',
  authorize(['admin', 'manager', 'therapist']),
  validate([
    body('therapist').notEmpty().withMessage('المعالج مطلوب'),
    body('specialty').notEmpty().withMessage('التخصص مطلوب'),
  ]),
  async (req, res) => {
    try {
      const plan = await UnifiedRehabPlan.findById(req.params.id).lean();
      if (!plan) return res.status(404).json({ success: false, message: 'خطة التأهيل غير موجودة' });

      const exists = plan.teamMembers.some(m => m.therapist?.toString() === req.body.therapist);
      if (exists) {
        return res.status(400).json({ success: false, message: 'المعالج مضاف مسبقاً في الفريق' });
      }

      plan.teamMembers.push(req.body);
      await plan.save();
      res.json({ success: true, data: plan, message: 'تمت إضافة عضو الفريق بنجاح' });
    } catch (error) {
      safeError(res, error, 'adding team member');
    }
  }
);

// ─── Remove Team Member ──────────────────────────────────────────────────────
router.delete(
  '/plans/:id/team-members/:memberId',
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const plan = await UnifiedRehabPlan.findById(req.params.id).lean();
      if (!plan) return res.status(404).json({ success: false, message: 'خطة التأهيل غير موجودة' });

      plan.teamMembers.pull({ _id: req.params.memberId });
      await plan.save();
      res.json({ success: true, data: plan, message: 'تم إزالة عضو الفريق' });
    } catch (error) {
      safeError(res, error, 'removing team member');
    }
  }
);

// ─── Add Goal to Plan ────────────────────────────────────────────────────────
router.post(
  '/plans/:id/goals',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  validate([
    body('title').trim().notEmpty().withMessage('عنوان الهدف مطلوب'),
    body('domain').notEmpty().withMessage('مجال الهدف مطلوب'),
  ]),
  async (req, res) => {
    try {
      const plan = await UnifiedRehabPlan.findById(req.params.id).lean();
      if (!plan) return res.status(404).json({ success: false, message: 'خطة التأهيل غير موجودة' });

      plan.goals.push({
        ...req.body,
        responsibleTherapist: req.body.responsibleTherapist || req.user.id,
      });
      await plan.save();
      res.json({ success: true, data: plan, message: 'تمت إضافة الهدف بنجاح' });
    } catch (error) {
      safeError(res, error, 'adding goal');
    }
  }
);

// ─── Update Goal Progress ────────────────────────────────────────────────────
router.patch(
  '/plans/:id/goals/:goalId/progress',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  validate([
    body('progress').isInt({ min: 0, max: 100 }).withMessage('التقدم يجب أن يكون بين 0 و 100'),
  ]),
  async (req, res) => {
    try {
      const plan = await UnifiedRehabPlan.findById(req.params.id).lean();
      if (!plan) return res.status(404).json({ success: false, message: 'خطة التأهيل غير موجودة' });

      const goal = plan.goals.id(req.params.goalId);
      if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });

      goal.progress = req.body.progress;
      if (req.body.status) goal.status = req.body.status;
      if (req.body.progress >= 100 && !goal.achievedDate) {
        goal.status = 'ACHIEVED';
        goal.achievedDate = new Date();
      }
      goal.progressNotes.push({
        note: req.body.note || `تحديث التقدم إلى ${req.body.progress}%`,
        progress: req.body.progress,
        recordedBy: req.user.id,
      });

      await plan.save();
      res.json({ success: true, data: plan, message: 'تم تحديث تقدم الهدف' });
    } catch (error) {
      safeError(res, error, 'updating goal progress');
    }
  }
);

// ─── Update Goal ─────────────────────────────────────────────────────────────
router.put(
  '/plans/:id/goals/:goalId',
  authorize(['admin', 'manager', 'therapist']),
  async (req, res) => {
    try {
      const plan = await UnifiedRehabPlan.findById(req.params.id).lean();
      if (!plan) return res.status(404).json({ success: false, message: 'خطة التأهيل غير موجودة' });

      const goal = plan.goals.id(req.params.goalId);
      if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });

      Object.assign(goal, stripUpdateMeta(req.body));
      await plan.save();
      res.json({ success: true, data: plan, message: 'تم تحديث الهدف بنجاح' });
    } catch (error) {
      safeError(res, error, 'updating goal');
    }
  }
);

// ─── Add Plan Review ─────────────────────────────────────────────────────────
router.post(
  '/plans/:id/reviews',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  validate([body('summary').trim().notEmpty().withMessage('ملخص المراجعة مطلوب')]),
  async (req, res) => {
    try {
      const plan = await UnifiedRehabPlan.findById(req.params.id).lean();
      if (!plan) return res.status(404).json({ success: false, message: 'خطة التأهيل غير موجودة' });

      plan.reviews.push({
        ...req.body,
        reviewedBy: req.user.id,
        overallProgress: plan.overallProgress,
      });

      if (req.body.nextReviewDate) {
        plan.reviewDate = new Date(req.body.nextReviewDate);
      }
      await plan.save();
      res.json({ success: true, data: plan, message: 'تمت إضافة المراجعة بنجاح' });
    } catch (error) {
      safeError(res, error, 'adding review');
    }
  }
);

// ─── Approve Plan ────────────────────────────────────────────────────────────
router.post('/plans/:id/approve', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const plan = await UnifiedRehabPlan.findById(req.params.id).lean();
    if (!plan) return res.status(404).json({ success: false, message: 'خطة التأهيل غير موجودة' });

    plan.approvals.push({
      approvedBy: req.user.id,
      role: req.user.role,
      comment: req.body.comment,
    });
    plan.status = 'ACTIVE';
    await plan.save();
    res.json({ success: true, data: plan, message: 'تم اعتماد خطة التأهيل' });
  } catch (error) {
    safeError(res, error, 'approving plan');
  }
});

// ─── Plans Statistics ────────────────────────────────────────────────────────
router.get('/plans-stats', async (req, res) => {
  try {
    const [total, statusCounts, avgProgress, avgGoals, overdueReviews] = await Promise.all([
      UnifiedRehabPlan.countDocuments(),
      UnifiedRehabPlan.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $limit: 1000 },
      ]),
      UnifiedRehabPlan.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: null, avg: { $avg: '$overallProgress' } } },
        { $limit: 1000 },
      ]),
      UnifiedRehabPlan.aggregate([
        { $project: { goalCount: { $size: { $ifNull: ['$goals', []] } } } },
        { $group: { _id: null, avg: { $avg: '$goalCount' } } },
        { $limit: 1000 },
      ]),
      UnifiedRehabPlan.countDocuments({
        reviewDate: { $lte: new Date() },
        status: { $in: ['ACTIVE', 'PENDING_APPROVAL'] },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        averageProgress: Math.round(avgProgress[0]?.avg || 0),
        averageGoalsPerPlan: Math.round(avgGoals[0]?.avg || 0),
        overdueReviews,
      },
      message: 'إحصائيات خطط التأهيل',
    });
  } catch (error) {
    safeError(res, error, 'fetching plan stats');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 3: Internal Referral Tickets — تذاكر الإحالة الداخلية
// ═══════════════════════════════════════════════════════════════════════════════

// ─── List Referral Tickets ───────────────────────────────────────────────────
router.get('/referrals', async (req, res) => {
  try {
    const {
      status,
      priority,
      fromDepartment,
      toDepartment,
      beneficiary,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (fromDepartment) filter.fromDepartment = fromDepartment;
    if (toDepartment) filter.toDepartment = toDepartment;
    if (beneficiary) filter.beneficiary = beneficiary;

    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      ReferralTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(+limit)
        .populate('beneficiary', 'name mrn')
        .populate('referredBy', 'name email')
        .populate('toSpecialist', 'name email')
        .lean(),
      ReferralTicket.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) },
      message: 'قائمة تذاكر الإحالة الداخلية',
    });
  } catch (error) {
    safeError(res, error, 'fetching referral tickets');
  }
});

// ─── Get Single Referral Ticket ──────────────────────────────────────────────
router.get('/referrals/:id', async (req, res) => {
  try {
    const ticket = await ReferralTicket.findById(req.params.id)
      .populate('beneficiary', 'name mrn status')
      .populate('referredBy', 'name email')
      .populate('toSpecialist', 'name email')
      .populate('response.respondedBy', 'name')
      .populate('outcome.completedBy', 'name')
      .populate('history.performedBy', 'name')
      .lean();
    if (!ticket)
      return res.status(404).json({ success: false, message: 'تذكرة الإحالة غير موجودة' });
    res.json({ success: true, data: ticket, message: 'بيانات تذكرة الإحالة' });
  } catch (error) {
    safeError(res, error, 'fetching referral ticket');
  }
});

// ─── Create Referral Ticket ──────────────────────────────────────────────────
router.post(
  '/referrals',
  authorize(['admin', 'manager', 'therapist', 'doctor', 'nurse']),
  validate([
    body('beneficiary').notEmpty().withMessage('المستفيد مطلوب'),
    body('fromDepartment').trim().notEmpty().withMessage('القسم المُحيل مطلوب'),
    body('toDepartment').trim().notEmpty().withMessage('القسم المُحال إليه مطلوب'),
    body('reason').trim().notEmpty().withMessage('سبب الإحالة مطلوب'),
  ]),
  async (req, res) => {
    try {
      const count = await ReferralTicket.countDocuments();
      const ticketNumber = `REF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const ticket = await ReferralTicket.create({
        ...req.body,
        ticketNumber,
        referredBy: req.user.id,
        createdBy: req.user.id,
        history: [
          {
            action: 'CREATED',
            performedBy: req.user.id,
            fromStatus: null,
            toStatus: 'PENDING',
            note: 'تم إنشاء تذكرة الإحالة',
          },
        ],
      });

      res
        .status(201)
        .json({ success: true, data: ticket, message: 'تم إنشاء تذكرة الإحالة بنجاح' });
    } catch (error) {
      safeError(res, error, 'creating referral ticket');
    }
  }
);

// ─── Update Referral Ticket ──────────────────────────────────────────────────
router.put('/referrals/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const ticket = await ReferralTicket.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    }).lean();
    if (!ticket)
      return res.status(404).json({ success: false, message: 'تذكرة الإحالة غير موجودة' });
    res.json({ success: true, data: ticket, message: 'تم تحديث تذكرة الإحالة بنجاح' });
  } catch (error) {
    safeError(res, error, 'updating referral ticket');
  }
});

// ─── Accept Referral ─────────────────────────────────────────────────────────
router.post(
  '/referrals/:id/accept',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  async (req, res) => {
    try {
      const ticket = await ReferralTicket.findById(req.params.id).lean();
      if (!ticket)
        return res.status(404).json({ success: false, message: 'تذكرة الإحالة غير موجودة' });

      const prevStatus = ticket.status;
      ticket.status = 'ACCEPTED';
      ticket.response = {
        respondedBy: req.user.id,
        respondedAt: new Date(),
        acceptanceNote: req.body.acceptanceNote,
        estimatedStartDate: req.body.estimatedStartDate,
      };
      ticket.history.push({
        action: 'ACCEPTED',
        performedBy: req.user.id,
        fromStatus: prevStatus,
        toStatus: 'ACCEPTED',
        note: req.body.acceptanceNote || 'تم قبول الإحالة',
      });
      await ticket.save();
      res.json({ success: true, data: ticket, message: 'تم قبول الإحالة بنجاح' });
    } catch (error) {
      safeError(res, error, 'accepting referral');
    }
  }
);

// ─── Reject Referral ─────────────────────────────────────────────────────────
router.post(
  '/referrals/:id/reject',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  validate([body('rejectionReason').trim().notEmpty().withMessage('سبب الرفض مطلوب')]),
  async (req, res) => {
    try {
      const ticket = await ReferralTicket.findById(req.params.id).lean();
      if (!ticket)
        return res.status(404).json({ success: false, message: 'تذكرة الإحالة غير موجودة' });

      const prevStatus = ticket.status;
      ticket.status = 'REJECTED';
      ticket.response = {
        respondedBy: req.user.id,
        respondedAt: new Date(),
        rejectionReason: req.body.rejectionReason,
        recommendations: req.body.recommendations || [],
      };
      ticket.history.push({
        action: 'REJECTED',
        performedBy: req.user.id,
        fromStatus: prevStatus,
        toStatus: 'REJECTED',
        note: req.body.rejectionReason,
      });
      await ticket.save();
      res.json({ success: true, data: ticket, message: 'تم رفض الإحالة' });
    } catch (error) {
      safeError(res, error, 'rejecting referral');
    }
  }
);

// ─── Complete Referral ───────────────────────────────────────────────────────
router.post(
  '/referrals/:id/complete',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  validate([body('summary').trim().notEmpty().withMessage('ملخص النتائج مطلوب')]),
  async (req, res) => {
    try {
      const ticket = await ReferralTicket.findById(req.params.id).lean();
      if (!ticket)
        return res.status(404).json({ success: false, message: 'تذكرة الإحالة غير موجودة' });

      const prevStatus = ticket.status;
      ticket.status = 'COMPLETED';
      ticket.outcome = {
        summary: req.body.summary,
        findings: req.body.findings,
        recommendations: req.body.recommendations || [],
        followUpNeeded: req.body.followUpNeeded || false,
        followUpDate: req.body.followUpDate,
        completedBy: req.user.id,
        completedAt: new Date(),
      };
      ticket.history.push({
        action: 'COMPLETED',
        performedBy: req.user.id,
        fromStatus: prevStatus,
        toStatus: 'COMPLETED',
        note: 'تم إكمال الإحالة',
      });
      await ticket.save();
      res.json({ success: true, data: ticket, message: 'تم إكمال الإحالة بنجاح' });
    } catch (error) {
      safeError(res, error, 'completing referral');
    }
  }
);

// ─── Delete Referral ─────────────────────────────────────────────────────────
router.delete('/referrals/:id', authorize(['admin']), async (req, res) => {
  try {
    const ticket = await ReferralTicket.findByIdAndDelete(req.params.id);
    if (!ticket)
      return res.status(404).json({ success: false, message: 'تذكرة الإحالة غير موجودة' });
    res.json({ success: true, message: 'تم حذف تذكرة الإحالة' });
  } catch (error) {
    safeError(res, error, 'deleting referral');
  }
});

// ─── Referral Statistics ─────────────────────────────────────────────────────
router.get('/referrals-stats', async (req, res) => {
  try {
    const [total, statusCounts, priorityCounts, departmentStats, avgResponseTime] =
      await Promise.all([
        ReferralTicket.countDocuments(),
        ReferralTicket.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $limit: 1000 },
        ]),
        ReferralTicket.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $limit: 1000 },
        ]),
        ReferralTicket.aggregate([
          { $group: { _id: '$toDepartment', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        ReferralTicket.aggregate([
          { $match: { 'response.respondedAt': { $exists: true } } },
          {
            $project: {
              responseTime: {
                $subtract: ['$response.respondedAt', '$createdAt'],
              },
            },
          },
          { $group: { _id: null, avg: { $avg: '$responseTime' } } },
          { $limit: 1000 },
        ]),
      ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byPriority: priorityCounts.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {}),
        topDepartments: departmentStats,
        averageResponseTimeHours: avgResponseTime[0]
          ? Math.round(avgResponseTime[0].avg / 3600000)
          : 0,
      },
      message: 'إحصائيات تذاكر الإحالة',
    });
  } catch (error) {
    safeError(res, error, 'fetching referral stats');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 4: Shared Beneficiary Dashboard — لوحة المتابعة المشتركة
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Beneficiary Coordination Overview ───────────────────────────────────────
router.get('/dashboard/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;

    const [plans, referrals, meetings, activePlanGoals] = await Promise.all([
      UnifiedRehabPlan.find({ beneficiary: beneficiaryId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('leadTherapist', 'name')
        .lean(),
      ReferralTicket.find({ beneficiary: beneficiaryId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('referredBy', 'name')
        .populate('toSpecialist', 'name')
        .lean(),
      MDTMeeting.find({ 'cases.beneficiary': beneficiaryId })
        .sort({ date: -1 })
        .limit(5)
        .select('meetingNumber title date status type')
        .lean(),
      UnifiedRehabPlan.aggregate([
        {
          $match: {
            beneficiary: new (require('mongoose').Types.ObjectId)(beneficiaryId),
            status: 'ACTIVE',
          },
        },
        { $unwind: '$goals' },
        {
          $group: {
            _id: '$goals.domain',
            totalGoals: { $sum: 1 },
            avgProgress: { $avg: '$goals.progress' },
            achieved: {
              $sum: { $cond: [{ $eq: ['$goals.status', 'ACHIEVED'] }, 1, 0] },
            },
          },
        },
        { $limit: 1000 },
      ]),
    ]);

    const activePlan = plans.find(p => p.status === 'ACTIVE') || null;
    const pendingReferrals = referrals.filter(r =>
      ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status)
    );

    res.json({
      success: true,
      data: {
        activePlan: activePlan || null,
        allPlans: plans,
        recentReferrals: referrals,
        pendingReferrals: pendingReferrals.length,
        relatedMeetings: meetings,
        goalsByDomain: activePlanGoals,
        overallProgress: activePlan?.overallProgress || 0,
        teamSize: activePlan?.teamMembers?.length || 0,
        nextReviewDate: activePlan?.reviewDate || null,
      },
      message: 'لوحة المتابعة المشتركة للمستفيد',
    });
  } catch (error) {
    safeError(res, error, 'fetching beneficiary dashboard');
  }
});

// ─── Team Workload Dashboard ─────────────────────────────────────────────────
router.get('/dashboard/team-workload', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const [activePlans, pendingReferrals, upcomingMeetings, teamLoad] = await Promise.all([
      UnifiedRehabPlan.countDocuments({ status: 'ACTIVE' }),
      ReferralTicket.countDocuments({ status: { $in: ['PENDING', 'ACCEPTED'] } }),
      MDTMeeting.countDocuments({
        date: { $gte: new Date() },
        status: 'SCHEDULED',
      }),
      UnifiedRehabPlan.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $unwind: '$teamMembers' },
        {
          $group: {
            _id: '$teamMembers.therapist',
            specialty: { $first: '$teamMembers.specialty' },
            name: { $first: '$teamMembers.therapistName' },
            caseCount: { $sum: 1 },
          },
        },
        { $sort: { caseCount: -1 } },
        { $limit: 1000 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        activePlans,
        pendingReferrals,
        upcomingMeetings,
        teamWorkload: teamLoad,
      },
      message: 'لوحة متابعة عبء العمل',
    });
  } catch (error) {
    safeError(res, error, 'fetching team workload');
  }
});

// ─── Department Coordination Dashboard ───────────────────────────────────────
router.get(
  '/dashboard/department/:department',
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const { department } = req.params;

      const [incomingReferrals, outgoingReferrals, departmentMeetings] = await Promise.all([
        ReferralTicket.find({ toDepartment: department, status: { $in: ['PENDING', 'ACCEPTED'] } })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('beneficiary', 'name mrn')
          .lean(),
        ReferralTicket.find({
          fromDepartment: department,
          status: { $in: ['PENDING', 'ACCEPTED'] },
        })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('beneficiary', 'name mrn')
          .lean(),
        MDTMeeting.find({
          department,
          date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        })
          .sort({ date: -1 })
          .lean(),
      ]);

      res.json({
        success: true,
        data: {
          incomingReferrals,
          outgoingReferrals,
          departmentMeetings,
          stats: {
            pendingIncoming: incomingReferrals.length,
            pendingOutgoing: outgoingReferrals.length,
            meetingsThisMonth: departmentMeetings.length,
          },
        },
        message: `لوحة متابعة قسم ${department}`,
      });
    } catch (error) {
      safeError(res, error, 'fetching department dashboard');
    }
  }
);

// ─── Overdue Items Dashboard ─────────────────────────────────────────────────
router.get('/dashboard/overdue', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const now = new Date();
    const [overdueReviews, overdueReferrals, overdueActions] = await Promise.all([
      UnifiedRehabPlan.find({
        reviewDate: { $lt: now },
        status: 'ACTIVE',
      })
        .select('planNumber beneficiaryName reviewDate overallProgress')
        .populate('beneficiary', 'name mrn')
        .lean(),
      ReferralTicket.find({
        responseDeadline: { $lt: now },
        status: 'PENDING',
      })
        .select(
          'ticketNumber beneficiaryName priority fromDepartment toDepartment responseDeadline'
        )
        .lean(),
      MDTMeeting.aggregate([
        { $unwind: '$generalActionItems' },
        {
          $match: {
            'generalActionItems.dueDate': { $lt: now },
            'generalActionItems.status': 'PENDING',
          },
        },
        {
          $project: {
            meetingNumber: 1,
            actionItem: '$generalActionItems',
          },
        },
        { $limit: 1000 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        overdueReviews,
        overdueReferrals,
        overdueActions,
        totals: {
          reviews: overdueReviews.length,
          referrals: overdueReferrals.length,
          actions: overdueActions.length,
        },
      },
      message: 'العناصر المتأخرة',
    });
  } catch (error) {
    safeError(res, error, 'fetching overdue items');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 5: Meeting Minutes & Decisions — محاضر الاجتماعات والقرارات
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Add/Update Meeting Minutes ──────────────────────────────────────────────
router.post(
  '/meetings/:id/minutes',
  authorize(['admin', 'manager', 'therapist']),
  validate([body('content').trim().notEmpty().withMessage('محتوى المحضر مطلوب')]),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      meeting.minutes = {
        content: req.body.content,
        recordedBy: req.user.id,
        recordedAt: new Date(),
        approved: false,
      };
      if (meeting.status === 'SCHEDULED') meeting.status = 'IN_PROGRESS';
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تم إضافة محضر الاجتماع' });
    } catch (error) {
      safeError(res, error, 'adding minutes');
    }
  }
);

// ─── Approve Meeting Minutes ─────────────────────────────────────────────────
router.post('/meetings/:id/minutes/approve', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const meeting = await MDTMeeting.findById(req.params.id).lean();
    if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

    if (!meeting.minutes?.content) {
      return res.status(400).json({ success: false, message: 'لا يوجد محضر للاعتماد' });
    }

    meeting.minutes.approved = true;
    meeting.minutes.approvedBy = req.user.id;
    meeting.minutes.approvedAt = new Date();
    meeting.status = 'COMPLETED';
    await meeting.save();
    res.json({ success: true, data: meeting, message: 'تم اعتماد محضر الاجتماع' });
  } catch (error) {
    safeError(res, error, 'approving minutes');
  }
});

// ─── Add General Decision to Meeting ─────────────────────────────────────────
router.post(
  '/meetings/:id/decisions',
  authorize(['admin', 'manager', 'doctor']),
  validate([body('title').trim().notEmpty().withMessage('عنوان القرار مطلوب')]),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      meeting.generalDecisions.push({
        ...req.body,
        madeBy: req.user.id,
      });
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تم إضافة القرار بنجاح' });
    } catch (error) {
      safeError(res, error, 'adding decision');
    }
  }
);

// ─── Update Decision Status ──────────────────────────────────────────────────
router.patch(
  '/meetings/:id/decisions/:decisionId/status',
  authorize(['admin', 'manager']),
  validate([
    body('status')
      .isIn(['PROPOSED', 'APPROVED', 'REJECTED', 'IMPLEMENTED'])
      .withMessage('حالة غير صالحة'),
  ]),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      const decision = meeting.generalDecisions.id(req.params.decisionId);
      if (!decision) return res.status(404).json({ success: false, message: 'القرار غير موجود' });

      decision.status = req.body.status;
      if (req.body.status === 'IMPLEMENTED') decision.implementedAt = new Date();
      if (req.body.status === 'APPROVED') decision.approvedBy.push(req.user.id);
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تم تحديث حالة القرار' });
    } catch (error) {
      safeError(res, error, 'updating decision status');
    }
  }
);

// ─── Add General Action Item ─────────────────────────────────────────────────
router.post(
  '/meetings/:id/action-items',
  authorize(['admin', 'manager']),
  validate([body('description').trim().notEmpty().withMessage('وصف المهمة مطلوب')]),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      meeting.generalActionItems.push({
        ...req.body,
        assignedTo: req.body.assignedTo || req.user.id,
      });
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تمت إضافة المهمة بنجاح' });
    } catch (error) {
      safeError(res, error, 'adding action item');
    }
  }
);

// ─── Update Action Item Status ───────────────────────────────────────────────
router.patch(
  '/meetings/:id/action-items/:itemId/status',
  authorize(['admin', 'manager', 'therapist']),
  validate([
    body('status')
      .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      .withMessage('حالة غير صالحة'),
  ]),
  async (req, res) => {
    try {
      const meeting = await MDTMeeting.findById(req.params.id).lean();
      if (!meeting) return res.status(404).json({ success: false, message: 'الاجتماع غير موجود' });

      const item = meeting.generalActionItems.id(req.params.itemId);
      if (!item) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });

      item.status = req.body.status;
      if (req.body.status === 'COMPLETED') item.completedAt = new Date();
      if (req.body.notes) item.notes = req.body.notes;
      await meeting.save();
      res.json({ success: true, data: meeting, message: 'تم تحديث حالة المهمة' });
    } catch (error) {
      safeError(res, error, 'updating action item');
    }
  }
);

// ─── Decisions Tracker (cross-meeting) ───────────────────────────────────────
router.get('/decisions-tracker', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const matchStage = {};
    if (status) matchStage['generalDecisions.status'] = status;
    if (category) matchStage['generalDecisions.category'] = category;

    const decisions = await MDTMeeting.aggregate([
      { $unwind: '$generalDecisions' },
      ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
      { $sort: { 'generalDecisions._id': -1 } },
      { $skip: (Math.max(1, +page) - 1) * +limit },
      { $limit: +limit },
      {
        $project: {
          meetingNumber: 1,
          meetingTitle: '$title',
          meetingDate: '$date',
          decision: '$generalDecisions',
        },
      },
    ]);

    res.json({
      success: true,
      data: decisions,
      pagination: { page: +page, limit: +limit },
      message: 'متتبع القرارات',
    });
  } catch (error) {
    safeError(res, error, 'fetching decisions tracker');
  }
});

// ─── Action Items Tracker (cross-meeting) ────────────────────────────────────
router.get('/action-items-tracker', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { status, assignedTo, page = 1, limit = 20 } = req.query;
    const matchStage = {};
    if (status) matchStage['generalActionItems.status'] = status;
    if (assignedTo) {
      matchStage['generalActionItems.assignedTo'] = new (require('mongoose').Types.ObjectId)(
        assignedTo
      );
    }

    const items = await MDTMeeting.aggregate([
      { $unwind: '$generalActionItems' },
      ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
      { $sort: { 'generalActionItems.dueDate': 1 } },
      { $skip: (Math.max(1, +page) - 1) * +limit },
      { $limit: +limit },
      {
        $project: {
          meetingNumber: 1,
          meetingTitle: '$title',
          meetingDate: '$date',
          actionItem: '$generalActionItems',
        },
      },
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page: +page, limit: +limit },
      message: 'متتبع المهام',
    });
  } catch (error) {
    safeError(res, error, 'fetching action items tracker');
  }
});

// ─── Dashboard Overview (KPI summary) ────────────────────────────────────────
router.get('/dashboard/overview', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalMeetings,
      completedMeetings,
      upcomingMeetings,
      totalPlans,
      activePlans,
      avgProgress,
      totalReferrals,
      pendingReferrals,
      overdueReviews,
      overdueReferrals,
      recentActivity,
      monthlyMeetings,
      monthlyReferrals,
    ] = await Promise.all([
      MDTMeeting.countDocuments(),
      MDTMeeting.countDocuments({ status: 'COMPLETED' }),
      MDTMeeting.find({ date: { $gte: now, $lte: sevenDaysAhead }, status: 'SCHEDULED' })
        .sort({ date: 1 })
        .limit(5)
        .select('title date startTime type attendees')
        .lean(),
      UnifiedRehabPlan.countDocuments(),
      UnifiedRehabPlan.countDocuments({ status: 'ACTIVE' }),
      UnifiedRehabPlan.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: null, avg: { $avg: '$overallProgress' } } },
        { $limit: 1000 },
      ]),
      ReferralTicket.countDocuments(),
      ReferralTicket.countDocuments({ status: 'PENDING' }),
      UnifiedRehabPlan.countDocuments({ reviewDate: { $lt: now }, status: 'ACTIVE' }),
      ReferralTicket.countDocuments({ responseDeadline: { $lt: now }, status: 'PENDING' }),
      MDTMeeting.find({ date: { $gte: thirtyDaysAgo } })
        .sort({ date: -1 })
        .limit(5)
        .select('meetingNumber title date status type')
        .lean(),
      MDTMeeting.countDocuments({ date: { $gte: thirtyDaysAgo } }),
      ReferralTicket.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    const completionRate =
      totalMeetings > 0 ? Math.round((completedMeetings / totalMeetings) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalMeetings,
        completedMeetings,
        completionRate,
        totalPlans,
        activePlans,
        averageProgress: Math.round(avgProgress[0]?.avg || 0),
        totalReferrals,
        pendingReferrals,
        overdueItems: overdueReviews + overdueReferrals,
        overdueReviews,
        overdueReferrals,
        upcomingMeetings,
        recentActivity,
        monthlyMeetings,
        monthlyReferrals,
      },
      message: 'لوحة المتابعة الشاملة',
    });
  } catch (error) {
    safeError(res, error, 'fetching dashboard overview');
  }
});

// ─── Comprehensive Coordination Stats ────────────────────────────────────────
router.get('/stats', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const [
      totalMeetings,
      totalPlans,
      totalReferrals,
      activePlans,
      pendingReferrals,
      completedMeetings,
      recentDecisions,
    ] = await Promise.all([
      MDTMeeting.countDocuments(),
      UnifiedRehabPlan.countDocuments(),
      ReferralTicket.countDocuments(),
      UnifiedRehabPlan.countDocuments({ status: 'ACTIVE' }),
      ReferralTicket.countDocuments({ status: 'PENDING' }),
      MDTMeeting.countDocuments({ status: 'COMPLETED' }),
      MDTMeeting.aggregate([
        { $unwind: '$generalDecisions' },
        { $count: 'total' },
        { $limit: 1000 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        meetings: { total: totalMeetings, completed: completedMeetings },
        plans: { total: totalPlans, active: activePlans },
        referrals: { total: totalReferrals, pending: pendingReferrals },
        decisions: recentDecisions[0]?.total || 0,
      },
      message: 'إحصائيات نظام التنسيق الشاملة',
    });
  } catch (error) {
    safeError(res, error, 'fetching coordination stats');
  }
});

module.exports = router;
