/**
 * Recruitment Routes — System 43
 * نظام التوظيف الداخلي
 *
 * Endpoints:
 *   GET    /api/recruitment/stats
 *   GET    /api/recruitment/postings
 *   POST   /api/recruitment/postings
 *   GET    /api/recruitment/postings/:id
 *   PUT    /api/recruitment/postings/:id
 *   DELETE /api/recruitment/postings/:id
 *   POST   /api/recruitment/postings/:id/publish
 *   POST   /api/recruitment/postings/:id/close
 *   POST   /api/recruitment/postings/:id/apply
 *   GET    /api/recruitment/applications
 *   GET    /api/recruitment/applications/:id
 *   PATCH  /api/recruitment/applications/:id/status
 *   POST   /api/recruitment/applications/:id/interview
 *   POST   /api/recruitment/applications/:id/offer
 *   GET    /api/recruitment/interviews
 *   PATCH  /api/recruitment/interviews/:id/complete
 *   GET    /api/recruitment/offers
 *   POST   /api/recruitment/offers/:id/send
 *   PATCH  /api/recruitment/offers/:id/respond
 *   GET    /api/recruitment/onboarding
 *   PATCH  /api/recruitment/onboarding/:id/task
 *   GET    /api/recruitment/talent-pool
 *   POST   /api/recruitment/talent-pool
 *   GET    /api/recruitment/reports/nitaqat
 *   GET    /api/recruitment/reports/cost
 */

'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const escapeRegex = require('../utils/escapeRegex');
const { stripUpdateMeta } = require('../utils/sanitize');

// 🔒 All recruitment routes require authentication
router.use(authenticate);
router.use(requireBranchAccess);
// Models
const JobPosting = require('../models/JobPosting');
const JobApplication = require('../models/JobApplication');
const RecruitmentInterview = require('../models/RecruitmentInterview');
const JobOffer = require('../models/JobOffer');
const OnboardingChecklist = require('../models/OnboardingChecklist');
const TalentPool = require('../models/TalentPool');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const fail = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });

const paginate = (page, limit) => ({
  skip: (parseInt(page) - 1) * parseInt(limit),
  limit: parseInt(limit),
});

const DEFAULT_ONBOARDING_TASKS = [
  { taskId: 1, title: 'استلام الهوية الوظيفية', status: 'pending', responsible: 'hr' },
  { taskId: 2, title: 'توقيع عقد العمل', status: 'pending', responsible: 'hr' },
  { taskId: 3, title: 'إعداد بيانات الرواتب', status: 'pending', responsible: 'payroll' },
  { taskId: 4, title: 'إنشاء حساب النظام', status: 'pending', responsible: 'it' },
  { taskId: 5, title: 'جولة تعريفية بالمركز', status: 'pending', responsible: 'manager' },
  { taskId: 6, title: 'التدريب التعريفي', status: 'pending', responsible: 'hr' },
  { taskId: 7, title: 'مراجعة السياسات والإجراءات', status: 'pending', responsible: 'employee' },
  { taskId: 8, title: 'إتمام تدريب السلامة', status: 'pending', responsible: 'employee' },
];

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const branchId = req.query.branchId || req.headers['x-branch-id'];
    const filter = branchId ? { branchId } : {};
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [openJobs, newApps, weekInterviews, sentOffers] = await Promise.all([
      JobPosting.countDocuments({ ...filter, status: 'published' }),
      JobApplication.countDocuments({ ...filter, status: 'received' }),
      RecruitmentInterview.countDocuments({
        ...filter,
        scheduledAt: { $gte: weekStart, $lt: weekEnd },
        status: 'scheduled',
      }),
      JobOffer.countDocuments({ ...filter, status: 'sent' }),
    ]);

    ok(res, {
      data: {
        openJobs: { title: 'وظائف مفتوحة', value: openJobs, icon: 'briefcase' },
        applications: { title: 'طلبات جديدة', value: newApps, icon: 'document' },
        interviews: { title: 'مقابلات هذا الأسبوع', value: weekInterviews, icon: 'calendar' },
        offersent: { title: 'عروض مُرسلة', value: sentOffers, icon: 'mail' },
      },
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// JOB POSTINGS CRUD
// ─────────────────────────────────────────────
router.get('/postings', async (req, res) => {
  try {
    const {
      search,
      status,
      department,
      employmentType,
      branchId,
      page = 1,
      limit = 15,
    } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (department) filter.department = new RegExp(escapeRegex(String(department)), 'i');
    if (employmentType) filter.employmentType = employmentType;
    if (search) {
      const safe = escapeRegex(String(search));
      filter.$or = [{ title: new RegExp(safe, 'i') }, { titleAr: new RegExp(safe, 'i') }];
    }
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      JobPosting.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean(),
      JobPosting.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/postings', async (req, res) => {
  try {
    const required = [
      'title',
      'titleAr',
      'employmentType',
      'workLocation',
      'experienceLevel',
      'applicationDeadline',
    ];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);
    const doc = await JobPosting.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم إنشاء إعلان الوظيفة بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, err.code === 11000 ? 409 : 400);
  }
});

router.get('/postings/:id', async (req, res) => {
  try {
    const doc = await JobPosting.findById(req.params.id).lean();
    if (!doc) return fail(res, 'الوظيفة غير موجودة', 404);
    ok(res, { data: doc });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/postings/:id', async (req, res) => {
  try {
    const doc = await JobPosting.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) return fail(res, 'الوظيفة غير موجودة', 404);
    ok(res, { data: doc, message: 'تم التحديث بنجاح' });
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.delete('/postings/:id', async (req, res) => {
  try {
    const doc = await JobPosting.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    if (!doc) return fail(res, 'الوظيفة غير موجودة', 404);
    ok(res, { message: 'تم الحذف بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// نشر الوظيفة
router.post('/postings/:id/publish', async (req, res) => {
  try {
    const doc = await JobPosting.findByIdAndUpdate(
      req.params.id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
    if (!doc) return fail(res, 'الوظيفة غير موجودة', 404);
    // TODO: مزامنة مع منصات التوظيف (Jadarat, Taqat, LinkedIn)
    ok(res, { data: doc, message: 'تم نشر الوظيفة بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// إغلاق الوظيفة
router.post('/postings/:id/close', async (req, res) => {
  try {
    const doc = await JobPosting.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    );
    if (!doc) return fail(res, 'الوظيفة غير موجودة', 404);
    ok(res, { data: doc, message: 'تم إغلاق الوظيفة' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// تقديم طلب توظيف
router.post('/postings/:id/apply', async (req, res) => {
  try {
    const posting = await JobPosting.findById(req.params.id);
    if (!posting) return fail(res, 'الوظيفة غير موجودة', 404);
    if (posting.status !== 'published') return fail(res, 'هذه الوظيفة غير متاحة للتقديم');
    if (posting.applicationDeadline < new Date())
      return fail(res, 'انتهى موعد التقديم على هذه الوظيفة');

    const required = ['applicantName', 'applicantEmail', 'gender', 'yearsOfExperience'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);
    if (!req.body.consentObtained)
      return fail(res, 'يجب الموافقة على شروط وأحكام استخدام البيانات');

    const doc = await JobApplication.create({
      ...req.body,
      uuid: uuidv4(),
      jobPostingId: posting._id,
      branchId: posting.branchId,
      status: 'received',
    });

    // تحديث عداد الطلبات
    await JobPosting.findByIdAndUpdate(req.params.id, { $inc: { applicationsCount: 1 } });

    ok(res, { data: doc, message: 'تم استلام طلبك بنجاح، سيتم مراجعته وإبلاغك' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

// ─────────────────────────────────────────────
// APPLICATIONS
// ─────────────────────────────────────────────
router.get('/applications', async (req, res) => {
  try {
    const {
      status,
      jobPostingId,
      source,
      isSaudi,
      hasDisability,
      branchId,
      page = 1,
      limit = 15,
    } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (jobPostingId) filter.jobPostingId = jobPostingId;
    if (source) filter.source = source;
    if (isSaudi !== undefined) filter.isSaudi = isSaudi === 'true';
    if (hasDisability !== undefined) filter.hasDisability = hasDisability === 'true';
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      JobApplication.find(filter)
        .populate('jobPostingId', 'title titleAr department')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      JobApplication.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/applications/:id', async (req, res) => {
  try {
    const doc = await JobApplication.findById(req.params.id)
      .populate('jobPostingId', 'title titleAr department employmentType')
      .lean();
    if (!doc) return fail(res, 'الطلب غير موجود', 404);
    ok(res, { data: doc });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// تحديث حالة الطلب
router.patch('/applications/:id/status', async (req, res) => {
  try {
    const { status, rejectionReason, hrNotes } = req.body;
    const allowed = [
      'received',
      'screening',
      'shortlisted',
      'interview',
      'offer',
      'hired',
      'rejected',
      'withdrawn',
    ];
    if (!allowed.includes(status)) return fail(res, 'حالة غير صالحة');

    const updates = { status, hrNotes };
    if (status === 'shortlisted') updates.shortlistedAt = new Date();
    if (status === 'rejected') {
      updates.rejectedAt = new Date();
      updates.rejectionReason = rejectionReason;
    }
    if (status === 'hired') updates.hiredAt = new Date();

    const doc = await JobApplication.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return fail(res, 'الطلب غير موجود', 404);
    ok(res, { data: doc, message: 'تم تحديث حالة الطلب بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// جدولة مقابلة
router.post('/applications/:id/interview', async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);
    if (!application) return fail(res, 'الطلب غير موجود', 404);

    const required = ['interviewType', 'scheduledAt', 'interviewers'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);

    const interview = await RecruitmentInterview.create({
      ...req.body,
      uuid: uuidv4(),
      applicationId: application._id,
      branchId: application.branchId,
      status: 'scheduled',
    });

    await JobApplication.findByIdAndUpdate(req.params.id, { status: 'interview' });

    ok(res, { data: interview, message: 'تم جدولة المقابلة بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

// إنشاء عرض عمل
router.post('/applications/:id/offer', async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);
    if (!application) return fail(res, 'الطلب غير موجود', 404);
    if (application.status !== 'interview' && application.status !== 'shortlisted') {
      return fail(res, 'لا يمكن إنشاء عرض عمل إلا بعد المقابلة');
    }

    const required = ['offeredSalary', 'employmentType', 'offerExpiry', 'proposedStartDate'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);

    const offerNumber = `OFF-${Date.now().toString(36).toUpperCase()}`;
    const offer = await JobOffer.create({
      ...req.body,
      uuid: uuidv4(),
      offerNumber,
      applicationId: application._id,
      jobPostingId: application.jobPostingId,
      branchId: application.branchId,
      offerDate: new Date(),
      status: 'draft',
    });

    await JobApplication.findByIdAndUpdate(req.params.id, { status: 'offer' });

    ok(res, { data: offer, message: 'تم إنشاء عرض العمل بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, err.code === 11000 ? 409 : 400);
  }
});

// ─────────────────────────────────────────────
// INTERVIEWS
// ─────────────────────────────────────────────
router.get('/interviews', async (req, res) => {
  try {
    const { status, interviewType, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (interviewType) filter.interviewType = interviewType;
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      RecruitmentInterview.find(filter)
        .populate('applicationId', 'applicantName applicantEmail')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ scheduledAt: -1 })
        .lean(),
      RecruitmentInterview.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// إكمال المقابلة وتسجيل النتيجة
router.patch('/interviews/:id/complete', async (req, res) => {
  try {
    const { score, feedback, strengths, weaknesses, recommendation } = req.body;
    const doc = await RecruitmentInterview.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        completedAt: new Date(),
        score,
        feedback,
        strengths,
        weaknesses,
        recommendation,
      },
      { new: true }
    );
    if (!doc) return fail(res, 'المقابلة غير موجودة', 404);
    ok(res, { data: doc, message: 'تم تسجيل نتيجة المقابلة بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// OFFERS
// ─────────────────────────────────────────────
router.get('/offers', async (req, res) => {
  try {
    const { status, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      JobOffer.find(filter)
        .populate('applicationId', 'applicantName applicantEmail')
        .populate('jobPostingId', 'title titleAr')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      JobOffer.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// إرسال عرض العمل
router.post('/offers/:id/send', async (req, res) => {
  try {
    const offer = await JobOffer.findByIdAndUpdate(
      req.params.id,
      { status: 'sent', sentAt: new Date() },
      { new: true }
    );
    if (!offer) return fail(res, 'العرض غير موجود', 404);
    ok(res, { data: offer, message: 'تم إرسال عرض العمل بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// رد المتقدم على العرض (قبول/رفض)
router.patch('/offers/:id/respond', async (req, res) => {
  try {
    const { accepted, rejectionReason } = req.body;
    if (accepted === undefined) return fail(res, 'يجب تحديد accepted (true/false)');

    const offer = await JobOffer.findById(req.params.id);
    if (!offer) return fail(res, 'العرض غير موجود', 404);

    const updatedOffer = await JobOffer.findByIdAndUpdate(
      req.params.id,
      {
        status: accepted ? 'accepted' : 'rejected',
        respondedAt: new Date(),
        rejectionReason: accepted ? undefined : rejectionReason,
      },
      { new: true }
    );

    if (accepted) {
      // تحديث حالة الطلب
      await JobApplication.findByIdAndUpdate(offer.applicationId, {
        status: 'hired',
        hiredAt: new Date(),
      });
      // تحديث حالة الإعلان
      await JobPosting.findByIdAndUpdate(offer.jobPostingId, { status: 'filled' });

      // إنشاء قائمة الإعداد
      const onboarding = await OnboardingChecklist.create({
        uuid: uuidv4(),
        branchId: offer.branchId,
        applicationId: offer.applicationId,
        offerId: offer._id,
        status: 'pending',
        startDate: offer.proposedStartDate,
        targetCompletionDate: new Date(
          new Date(offer.proposedStartDate).setDate(
            new Date(offer.proposedStartDate).getDate() + 30
          )
        ),
        tasks: DEFAULT_ONBOARDING_TASKS,
        completionPercentage: 0,
      });

      ok(res, {
        data: updatedOffer,
        onboarding,
        message: 'تم قبول العرض وتفعيل سير عمل الإعداد',
      });
    } else {
      ok(res, { data: updatedOffer, message: 'تم تسجيل رفض العرض' });
    }
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────
router.get('/onboarding', async (req, res) => {
  try {
    const { status, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      OnboardingChecklist.find(filter)
        .populate('applicationId', 'applicantName applicantEmail')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ startDate: -1 })
        .lean(),
      OnboardingChecklist.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// تحديث مهمة إعداد
router.patch('/onboarding/:id/task', async (req, res) => {
  try {
    const { taskId, status: taskStatus, notes } = req.body;
    if (!taskId) return fail(res, 'taskId مطلوب');

    const checklist = await OnboardingChecklist.findById(req.params.id);
    if (!checklist) return fail(res, 'قائمة الإعداد غير موجودة', 404);

    const tasks = checklist.tasks.map(t => {
      if (t.taskId === taskId) {
        return {
          ...t,
          status: taskStatus || t.status,
          notes: notes || t.notes,
          completedAt: taskStatus === 'completed' ? new Date() : t.completedAt,
        };
      }
      return t;
    });

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const completionPercentage = Math.round((completedCount / tasks.length) * 100);
    const overallStatus =
      completionPercentage === 100
        ? 'completed'
        : completionPercentage > 0
          ? 'in_progress'
          : 'pending';

    const doc = await OnboardingChecklist.findByIdAndUpdate(
      req.params.id,
      {
        tasks,
        completionPercentage,
        status: overallStatus,
        actualCompletionDate: overallStatus === 'completed' ? new Date() : null,
      },
      { new: true }
    );

    ok(res, { data: doc, message: 'تم تحديث المهمة بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// TALENT POOL
// ─────────────────────────────────────────────
router.get('/talent-pool', async (req, res) => {
  try {
    const { status, isSaudi, skills, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (isSaudi !== undefined) filter.isSaudi = isSaudi === 'true';
    if (skills) filter.skills = { $in: skills.split(',') };
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      TalentPool.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean(),
      TalentPool.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/talent-pool', async (req, res) => {
  try {
    const required = ['fullName', 'email'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);
    const doc = await TalentPool.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم إضافة المرشح لبنك المواهب بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, err.code === 11000 ? 409 : 400);
  }
});

// ─────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────

// تقرير نطاقات والسعودة
router.get('/reports/nitaqat', async (req, res) => {
  try {
    const branchId = req.query.branchId || req.headers['x-branch-id'];
    const filter = { status: 'hired', ...(branchId ? { branchId } : {}) };

    const [total, saudis] = await Promise.all([
      JobApplication.countDocuments(filter),
      JobApplication.countDocuments({ ...filter, isSaudi: true }),
    ]);

    const saudiPercent = total > 0 ? Math.round((saudis / total) * 100 * 10) / 10 : 0;
    let nitaqatBand;
    if (saudiPercent >= 75) nitaqatBand = 'platinum';
    else if (saudiPercent >= 50) nitaqatBand = 'green';
    else if (saudiPercent >= 25) nitaqatBand = 'yellow';
    else nitaqatBand = 'red';

    ok(res, {
      data: {
        totalHired: total,
        saudiHired: saudis,
        nonSaudi: total - saudis,
        saudiPercent,
        nitaqatBand,
      },
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// تقرير تكاليف التوظيف
router.get('/reports/cost', async (req, res) => {
  try {
    const branchId = req.query.branchId || req.headers['x-branch-id'];
    const filter = branchId ? { branchId } : {};

    const [totalPostings, filledPostings, totalApplications, totalHired, hiredApps] =
      await Promise.all([
        JobPosting.countDocuments(filter),
        JobPosting.countDocuments({ ...filter, status: 'filled' }),
        JobApplication.countDocuments(filter),
        JobApplication.countDocuments({ ...filter, status: 'hired' }),
        JobApplication.find({ ...filter, status: 'hired', hiredAt: { $ne: null } })
          .select('createdAt hiredAt')
          .lean(),
      ]);

    const avgTimeToHire =
      hiredApps.length > 0
        ? Math.round(
            hiredApps.reduce((acc, a) => {
              const days = a.hiredAt
                ? Math.abs(new Date(a.hiredAt) - new Date(a.createdAt)) / 86400000
                : 0;
              return acc + days;
            }, 0) / hiredApps.length
          )
        : 0;

    ok(res, {
      data: {
        totalPostings,
        filledPostings,
        totalApplications,
        totalHired,
        avgTimeToHireDays: avgTimeToHire,
        fillRate: totalPostings > 0 ? Math.round((filledPostings / totalPostings) * 100) : 0,
      },
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

module.exports = router;
