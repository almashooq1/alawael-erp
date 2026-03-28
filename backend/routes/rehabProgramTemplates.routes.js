/**
 * Rehab Program Templates Routes — مسارات قوالب برامج التأهيل
 *
 * Templates:
 * GET    /                              — List templates (filterable)
 * GET    /categories                    — Categories with counts
 * GET    /by-disability/:type           — Templates for a disability
 * GET    /:id                           — Single template detail
 * POST   /                              — Create template
 * PUT    /:id                           — Update template
 * DELETE /:id                           — Soft-delete
 *
 * Enrollments:
 * GET    /enrollments                   — List enrollments
 * GET    /enrollments/stats             — Statistics
 * GET    /enrollments/beneficiary/:id   — Beneficiary enrollments
 * GET    /enrollments/:id               — Single enrollment detail
 * POST   /enrollments                   — Enroll beneficiary
 * PUT    /enrollments/:id               — Update enrollment
 * PUT    /enrollments/:id/status        — Change status
 * POST   /enrollments/:id/sessions      — Log session
 * POST   /enrollments/:id/goals         — Add goal
 * PUT    /enrollments/:eid/goals/:gid   — Update goal progress
 * POST   /enrollments/:id/discharge     — Discharge
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { RehabProgramTemplate, ProgramEnrollment } = require('../models/RehabProgramTemplate');
const { escapeRegex } = require('../utils/sanitize');

// ── Auth guard ──────────────────────────────────────────────
router.use(authenticate);

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  TEMPLATES (القوالب)
 * ═══════════════════════════════════════════════════════════════════════════ */

// GET / — list
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, category, disability, search, active } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (disability) filter.targetDisabilities = disability;
    if (active !== undefined) filter.isActive = active === 'true';
    else filter.isActive = true;
    if (search) {
      filter.$or = [
        { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
        { nameEn: { $regex: escapeRegex(search), $options: 'i' } },
        { programCode: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      RehabProgramTemplate.find(filter)
        .sort({ category: 1, nameAr: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      RehabProgramTemplate.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// GET /categories
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await RehabProgramTemplate.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          programs: { $push: { id: '$_id', nameAr: '$nameAr', programCode: '$programCode' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const labels = {
      early_intervention: 'التدخل المبكر',
      aba_therapy: 'تحليل السلوك التطبيقي ABA',
      sensory_integration: 'التكامل الحسي',
      speech_language: 'التأهيل النطقي واللغوي',
      physical_therapy: 'العلاج الطبيعي المكثف',
      occupational_therapy: 'العلاج الوظيفي',
      cognitive_rehab: 'التأهيل المعرفي',
      vocational_rehab: 'التأهيل المهني',
      life_skills: 'المهارات الحياتية',
      social_skills: 'المهارات الاجتماعية',
      family_training: 'تدريب الأسرة',
      community_integration: 'الدمج المجتمعي',
      assistive_technology: 'التقنيات المساعدة',
      transition_planning: 'التخطيط الانتقالي',
      behavioral_support: 'الدعم السلوكي',
    };

    res.json({
      success: true,
      data: categories.map(c => ({
        key: c._id,
        nameAr: labels[c._id] || c._id,
        count: c.count,
        programs: c.programs,
      })),
    });
  })
);

// GET /by-disability/:type
router.get(
  '/by-disability/:type',
  asyncHandler(async (req, res) => {
    const data = await RehabProgramTemplate.find({
      targetDisabilities: req.params.type,
      isActive: true,
    })
      .sort({ category: 1 })
      .lean();
    res.json({ success: true, data });
  })
);

// GET /:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const template = await RehabProgramTemplate.findById(req.params.id).lean();
    if (!template) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    res.json({ success: true, data: template });
  })
);

// POST /
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const template = await RehabProgramTemplate.create({
      ...req.body,
      createdBy: req.user?.id,
      isBuiltIn: false,
    });
    res.status(201).json({ success: true, data: template, message: 'تم إنشاء البرنامج بنجاح' });
  })
);

// PUT /:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const template = await RehabProgramTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    res.json({ success: true, data: template, message: 'تم تحديث البرنامج بنجاح' });
  })
);

// DELETE /:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const template = await RehabProgramTemplate.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user?.id },
      { new: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    res.json({ success: true, message: 'تم تعطيل البرنامج' });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  ENROLLMENTS (التسجيل في البرامج)
 * ═══════════════════════════════════════════════════════════════════════════ */

// GET /enrollments
router.get(
  '/enrollments',
  asyncHandler(async (req, res) => {
    // Ensure this isn't caught by /:id
    const { page = 1, limit = 20, status, program, therapist, beneficiary } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (program) filter.programTemplate = program;
    if (therapist) filter.primaryTherapist = therapist;
    if (beneficiary) filter.beneficiary = beneficiary;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      ProgramEnrollment.find(filter)
        .populate('programTemplate', 'nameAr programCode category')
        .populate('beneficiary', 'name fileNumber')
        .populate('primaryTherapist', 'name')
        .sort({ enrollmentDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ProgramEnrollment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// GET /enrollments/stats
router.get(
  '/enrollments/stats',
  asyncHandler(async (_req, res) => {
    const [totalEnrollments, byStatus, byProgram, avgProgress, recentEnrollments] =
      await Promise.all([
        ProgramEnrollment.countDocuments(),
        ProgramEnrollment.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        ProgramEnrollment.aggregate([
          {
            $lookup: {
              from: 'rehabprogramtemplates',
              localField: 'programTemplate',
              foreignField: '_id',
              as: 'programInfo',
            },
          },
          { $unwind: '$programInfo' },
          {
            $group: {
              _id: '$programInfo.category',
              count: { $sum: 1 },
              activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
              avgProgress: { $avg: '$overallProgress.overallPercentage' },
            },
          },
          { $sort: { count: -1 } },
        ]),
        ProgramEnrollment.aggregate([
          { $match: { status: 'active' } },
          {
            $group: {
              _id: null,
              avg: { $avg: '$overallProgress.overallPercentage' },
              avgAttendance: { $avg: '$overallProgress.attendanceRate' },
            },
          },
        ]),
        ProgramEnrollment.find()
          .populate('programTemplate', 'nameAr programCode')
          .populate('beneficiary', 'name')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

    res.json({
      success: true,
      data: {
        totalEnrollments,
        byStatus,
        byProgram,
        averageProgress: avgProgress[0]?.avg || 0,
        averageAttendance: avgProgress[0]?.avgAttendance || 0,
        recentEnrollments,
      },
    });
  })
);

// GET /enrollments/beneficiary/:id
router.get(
  '/enrollments/beneficiary/:id',
  asyncHandler(async (req, res) => {
    const data = await ProgramEnrollment.find({ beneficiary: req.params.id })
      .populate('programTemplate', 'nameAr programCode category totalDurationWeeks')
      .populate('primaryTherapist', 'name')
      .sort({ enrollmentDate: -1 })
      .lean();
    res.json({ success: true, data });
  })
);

// GET /enrollments/:id
router.get(
  '/enrollments/:id',
  asyncHandler(async (req, res) => {
    const enrollment = await ProgramEnrollment.findById(req.params.id)
      .populate('programTemplate')
      .populate('beneficiary', 'name fileNumber dateOfBirth')
      .populate('primaryTherapist', 'name')
      .populate('teamMembers.member', 'name')
      .populate('enrolledBy', 'name')
      .lean();
    if (!enrollment) return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });
    res.json({ success: true, data: enrollment });
  })
);

// POST /enrollments — enroll
router.post(
  '/enrollments',
  asyncHandler(async (req, res) => {
    const template = await RehabProgramTemplate.findById(req.body.programTemplate).lean();
    if (!template) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });

    const enrollment = await ProgramEnrollment.create({
      ...req.body,
      programCode: template.programCode,
      expectedEndDate:
        req.body.expectedEndDate ||
        new Date(Date.now() + template.totalDurationWeeks * 7 * 24 * 60 * 60 * 1000),
      enrolledBy: req.user?.id,
      overallProgress: {
        totalGoals: req.body.individualGoals?.length || 0,
        totalSessionsScheduled: template.totalDurationWeeks * template.sessionsPerWeek,
      },
    });

    res
      .status(201)
      .json({ success: true, data: enrollment, message: 'تم تسجيل المستفيد في البرنامج بنجاح' });
  })
);

// PUT /enrollments/:id
router.put(
  '/enrollments/:id',
  asyncHandler(async (req, res) => {
    const enrollment = await ProgramEnrollment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!enrollment) return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });
    res.json({ success: true, data: enrollment, message: 'تم تحديث التسجيل' });
  })
);

// PUT /enrollments/:id/status
router.put(
  '/enrollments/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const update = { status, lastUpdatedBy: req.user?.id };
    if (status === 'completed' || status === 'graduated' || status === 'withdrawn') {
      update.actualEndDate = new Date();
    }

    const enrollment = await ProgramEnrollment.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!enrollment) return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });
    res.json({ success: true, data: enrollment, message: 'تم تحديث حالة التسجيل' });
  })
);

// POST /enrollments/:id/sessions — log session
router.post(
  '/enrollments/:id/sessions',
  asyncHandler(async (req, res) => {
    const enrollment = await ProgramEnrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });

    const sessionNumber = (enrollment.sessionLogs?.length || 0) + 1;
    enrollment.sessionLogs.push({
      ...req.body,
      sessionNumber,
      therapist: req.body.therapist || req.user?.id,
    });

    // Update attendance stats
    const attended = enrollment.sessionLogs.filter(
      s => s.attendance === 'present' || s.attendance === 'late'
    ).length;
    enrollment.overallProgress.sessionsAttended = attended;
    enrollment.overallProgress.attendanceRate = Math.round(
      (attended / enrollment.sessionLogs.length) * 100
    );
    enrollment.overallProgress.lastUpdateDate = new Date();

    await enrollment.save();
    res.status(201).json({ success: true, data: enrollment, message: 'تم تسجيل الجلسة بنجاح' });
  })
);

// POST /enrollments/:id/goals — add goal
router.post(
  '/enrollments/:id/goals',
  asyncHandler(async (req, res) => {
    const enrollment = await ProgramEnrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });

    enrollment.individualGoals.push(req.body);
    enrollment.overallProgress.totalGoals = enrollment.individualGoals.length;
    await enrollment.save();

    res.status(201).json({ success: true, data: enrollment, message: 'تم إضافة الهدف بنجاح' });
  })
);

// PUT /enrollments/:eid/goals/:gid — update goal progress
router.put(
  '/enrollments/:eid/goals/:gid',
  asyncHandler(async (req, res) => {
    const enrollment = await ProgramEnrollment.findById(req.params.eid);
    if (!enrollment) return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });

    const goal = enrollment.individualGoals.id(req.params.gid);
    if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });

    if (req.body.current != null) goal.current = req.body.current;
    if (req.body.status) goal.status = req.body.status;
    if (req.body.note) {
      goal.progressNotes.push({
        value: req.body.current,
        note: req.body.note,
        recordedBy: req.user?.id,
      });
    }

    // Recompute goals achieved
    enrollment.overallProgress.goalsAchieved = enrollment.individualGoals.filter(
      g => g.status === 'achieved'
    ).length;
    enrollment.overallProgress.overallPercentage = enrollment.overallProgress.totalGoals
      ? Math.round(
          (enrollment.overallProgress.goalsAchieved / enrollment.overallProgress.totalGoals) * 100
        )
      : 0;
    enrollment.overallProgress.lastUpdateDate = new Date();

    await enrollment.save();
    res.json({ success: true, data: enrollment, message: 'تم تحديث تقدم الهدف' });
  })
);

// POST /enrollments/:id/discharge — discharge
router.post(
  '/enrollments/:id/discharge',
  asyncHandler(async (req, res) => {
    const enrollment = await ProgramEnrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });

    enrollment.status = req.body.status || 'completed';
    enrollment.actualEndDate = new Date();
    enrollment.dischargeSummary = {
      dischargeDate: new Date(),
      ...req.body,
    };
    enrollment.lastUpdatedBy = req.user?.id;

    await enrollment.save();
    res.json({ success: true, data: enrollment, message: 'تم تسريح المستفيد من البرنامج' });
  })
);

module.exports = router;
