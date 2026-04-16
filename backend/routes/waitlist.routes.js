/**
 * waitlist.routes.js — مسارات قائمة الانتظار
 * Waitlist Management Routes
 *
 * سير العمل الكامل:
 *   pending → contacted → assessment_scheduled → approved → enrolled
 *   pending/contacted → rejected | cancelled
 *
 * المسارات:
 *  GET    /api/waitlist              — قائمة الانتظار (مع فلترة وترتيب ذكي)
 *  GET    /api/waitlist/stats        — إحصائيات قائمة الانتظار
 *  GET    /api/waitlist/smart        — القائمة الذكية مرتبةً بالأولوية
 *  GET    /api/waitlist/:id          — تفاصيل طلب واحد
 *  POST   /api/waitlist              — تسجيل طلب جديد
 *  PUT    /api/waitlist/:id          — تحديث بيانات الطلب
 *  POST   /api/waitlist/:id/contact        — تسجيل التواصل مع المتقدم
 *  POST   /api/waitlist/:id/schedule-assessment — جدولة تقييم
 *  POST   /api/waitlist/:id/approve        — الموافقة على الطلب
 *  POST   /api/waitlist/:id/enroll         — تسجيل المتقدم كمستفيد فعلي
 *  POST   /api/waitlist/:id/reject         — رفض الطلب
 *  POST   /api/waitlist/:id/cancel         — إلغاء الطلب
 *
 * @module routes/waitlist.routes
 */

'use strict';

const express = require('express');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const router = express.Router();
const mongoose = require('mongoose');

const WaitlistEntry = require('../models/WaitlistEntry');
const Beneficiary = require('../models/Beneficiary');
const beneficiaryService = require('../services/BeneficiaryService');
const { authenticateToken } = require('../middleware/auth.middleware');
const { WAITLIST_STATUSES } = require('../constants/beneficiary.constants');
const { escapeRegex } = require('../utils/sanitize');

// ─── دوال مساعدة ──────────────────────────────────────────────────────────────
const ok = (res, data, meta = {}) => res.json({ success: true, ...meta, data });
const fail = (res, msg, status = 400, extra = {}) =>
  res.status(status).json({ success: false, message: msg, ...extra });

const isValidId = id => mongoose.Types.ObjectId.isValid(id);

const validateId = (req, res, next) => {
  if (!isValidId(req.params.id)) return fail(res, 'معرّف غير صحيح', 400);
  next();
};

// ─── جميع المسارات تتطلب مصادقة ───────────────────────────────────────────────
router.use(authenticateToken);
router.use(requireBranchAccess);
// ══════════════════════════════════════════════════════════════════════════════
// GET /api/waitlist/stats — إحصائيات قائمة الانتظار
// ══════════════════════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const { branchId } = req.query;
    const stats = await WaitlistEntry.getStats(branchId || null);
    return ok(res, stats);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/waitlist/smart — القائمة الذكية
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @query {string}  branchId  معرّف الفرع (مطلوب)
 * @query {number}  [limit=50]
 */
router.get('/smart', async (req, res) => {
  try {
    const { branchId, limit = 50 } = req.query;
    if (!branchId || !isValidId(branchId)) {
      return fail(res, 'معرّف الفرع مطلوب وصحيح', 422);
    }

    const entries = await beneficiaryService.getSmartWaitlist(branchId, {
      limit: Math.min(parseInt(limit, 10), 200),
    });

    return ok(res, entries, { total: entries.length });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/waitlist — قائمة الانتظار
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @query {string}  [branchId]        تصفية بالفرع
 * @query {string}  [status]          تصفية بالحالة
 * @query {string}  [priorityLevel]   تصفية بالأولوية
 * @query {string}  [disabilityType]  تصفية بنوع الإعاقة
 * @query {string}  [search]          بحث بالاسم أو الجوال أو الهوية
 * @query {number}  [page=1]
 * @query {number}  [limit=25]
 * @query {string}  [sort=createdAt]
 * @query {string}  [direction=desc]
 */
router.get('/', async (req, res) => {
  try {
    const {
      branchId,
      status,
      priorityLevel,
      disabilityType,
      search,
      page = 1,
      limit = 25,
      sort = 'createdAt',
      direction = 'desc',
    } = req.query;

    const filter = {};

    // تصفية بالفرع: إذا لم يكن super-admin، يرى فرعه فقط
    if (branchId && isValidId(branchId)) {
      filter.branch = branchId;
    } else if (req.user?.branch && !req.user?.isSuperAdmin) {
      filter.branch = req.user.branch;
    }

    if (status) filter.status = status;
    if (priorityLevel) filter.priorityLevel = priorityLevel;
    if (disabilityType) filter.disabilityType = disabilityType;

    if (search && search.trim()) {
      const s = escapeRegex(search.trim());
      filter.$or = [
        { applicantName: new RegExp(s, 'i') },
        { applicantPhone: new RegExp(s) },
        { applicantNationalId: new RegExp(s) },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;
    const sortObj = { [sort]: direction === 'asc' ? 1 : -1 };

    const [entries, total] = await Promise.all([
      WaitlistEntry.find(filter)
        .populate('branch', 'nameAr code')
        .populate('beneficiary', 'fileNumber')
        .populate('createdBy', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      WaitlistEntry.countDocuments(filter),
    ]);

    return ok(res, entries, {
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/waitlist/:id — تفاصيل طلب
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id', validateId, async (req, res) => {
  try {
    const entry = await WaitlistEntry.findById(req.params.id)
      .populate('branch', 'nameAr code')
      .populate('beneficiary', 'fileNumber firstName_ar lastName_ar status')
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .lean({ virtuals: true });

    if (!entry) return fail(res, 'الطلب غير موجود', 404);
    return ok(res, entry);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/waitlist — تسجيل طلب جديد
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const {
      branch,
      applicantName,
      applicantPhone,
      applicantEmail,
      applicantNationalId,
      disabilityType,
      disabilitySeverity,
      gender,
      age,
      requestedServices,
      preferredSchedule,
      priorityLevel,
      priorityReason,
      distanceKm,
      referralSource,
      notes,
    } = req.body;

    // التحقق من الحقول المطلوبة
    if (!branch || !isValidId(branch)) return fail(res, 'الفرع مطلوب', 422);
    if (!applicantName) return fail(res, 'اسم المتقدم مطلوب', 422);
    if (!applicantPhone) return fail(res, 'رقم الجوال مطلوب', 422);
    if (!disabilityType) return fail(res, 'نوع الإعاقة مطلوب', 422);
    if (!disabilitySeverity) return fail(res, 'شدة الإعاقة مطلوبة', 422);

    // التحقق من تكرار الطلب برقم الجوال في نفس الفرع
    if (applicantPhone) {
      const duplicate = await WaitlistEntry.findOne({
        branch,
        applicantPhone: applicantPhone.trim(),
        status: {
          $nin: [
            WAITLIST_STATUSES.ENROLLED,
            WAITLIST_STATUSES.CANCELLED,
            WAITLIST_STATUSES.REJECTED,
          ],
        },
      }).lean();

      if (duplicate) {
        return fail(res, 'يوجد طلب نشط مسبق بنفس رقم الجوال لهذا الفرع', 422, {
          existingId: duplicate._id,
          existingStatus: duplicate.status,
        });
      }
    }

    const entry = await WaitlistEntry.create({
      branch,
      applicantName: applicantName.trim(),
      applicantPhone: applicantPhone.trim(),
      applicantEmail: applicantEmail?.trim()?.toLowerCase(),
      applicantNationalId: applicantNationalId?.trim(),
      disabilityType,
      disabilitySeverity,
      gender,
      age,
      requestedServices: requestedServices || [],
      preferredSchedule,
      priorityLevel: priorityLevel || 'normal',
      priorityReason,
      distanceKm,
      referralSource,
      notes,
      createdBy: req.user?._id,
      statusHistory: [
        {
          status: WAITLIST_STATUSES.PENDING,
          changedAt: new Date(),
          changedBy: req.user?._id,
          note: 'تسجيل طلب جديد',
        },
      ],
    });

    return res.status(201).json({ success: true, data: entry });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return fail(res, messages.join(', '), 422);
    }
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/waitlist/:id — تحديث بيانات الطلب
// ══════════════════════════════════════════════════════════════════════════════
router.put('/:id', validateId, async (req, res) => {
  try {
    const allowedFields = [
      'applicantName',
      'applicantPhone',
      'applicantEmail',
      'applicantNationalId',
      'disabilityType',
      'disabilitySeverity',
      'gender',
      'age',
      'requestedServices',
      'preferredSchedule',
      'priorityLevel',
      'priorityReason',
      'distanceKm',
      'referralSource',
      'notes',
      'assignedTo',
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) return fail(res, 'لا توجد بيانات للتحديث', 400);

    // لا يمكن تحديث طلب مغلق
    const entry = await WaitlistEntry.findById(req.params.id);
    if (!entry) return fail(res, 'الطلب غير موجود', 404);

    if (
      [
        WAITLIST_STATUSES.ENROLLED,
        WAITLIST_STATUSES.CANCELLED,
        WAITLIST_STATUSES.REJECTED,
      ].includes(entry.status)
    ) {
      return fail(res, 'لا يمكن تعديل طلب مغلق', 422);
    }

    Object.assign(entry, updates);
    await entry.save();

    return ok(res, entry.toObject({ virtuals: true }));
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/waitlist/:id/contact — تسجيل التواصل
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/contact', validateId, async (req, res) => {
  try {
    const { note } = req.body;
    const entry = await WaitlistEntry.findById(req.params.id);
    if (!entry) return fail(res, 'الطلب غير موجود', 404);

    if (entry.status !== WAITLIST_STATUSES.PENDING) {
      return fail(res, `لا يمكن تسجيل التواصل على طلب بحالة "${entry.status}"`, 422);
    }

    await entry.markContacted(note);
    entry.statusHistory.push({
      status: WAITLIST_STATUSES.CONTACTED,
      changedAt: new Date(),
      changedBy: req.user?._id,
      note: note || 'تم التواصل مع المتقدم',
    });
    await entry.save();

    return ok(res, entry.toObject({ virtuals: true }), {
      message: 'تم تسجيل التواصل بنجاح',
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/waitlist/:id/schedule-assessment — جدولة تقييم
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/schedule-assessment', validateId, async (req, res) => {
  try {
    const { assessmentDate, note } = req.body;

    if (!assessmentDate) return fail(res, 'تاريخ التقييم مطلوب', 422);

    const parsedDate = new Date(assessmentDate);
    if (isNaN(parsedDate.getTime())) return fail(res, 'تاريخ التقييم غير صحيح', 422);

    const entry = await WaitlistEntry.findById(req.params.id);
    if (!entry) return fail(res, 'الطلب غير موجود', 404);

    if (![WAITLIST_STATUSES.PENDING, WAITLIST_STATUSES.CONTACTED].includes(entry.status)) {
      return fail(res, `لا يمكن جدولة تقييم لطلب بحالة "${entry.status}"`, 422);
    }

    await entry.scheduleAssessment(parsedDate, note);
    entry.statusHistory.push({
      status: WAITLIST_STATUSES.ASSESSMENT_SCHEDULED,
      changedAt: new Date(),
      changedBy: req.user?._id,
      note: note || `تم جدولة تقييم بتاريخ ${parsedDate.toLocaleDateString('ar-SA')}`,
    });
    await entry.save();

    return ok(res, entry.toObject({ virtuals: true }), {
      message: 'تم جدولة التقييم بنجاح',
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/waitlist/:id/approve — الموافقة على الطلب
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/approve', validateId, async (req, res) => {
  try {
    const { note } = req.body;
    const entry = await WaitlistEntry.findById(req.params.id);
    if (!entry) return fail(res, 'الطلب غير موجود', 404);

    const validStatuses = [
      WAITLIST_STATUSES.CONTACTED,
      WAITLIST_STATUSES.ASSESSMENT_SCHEDULED,
      WAITLIST_STATUSES.PENDING,
    ];

    if (!validStatuses.includes(entry.status)) {
      return fail(res, `لا يمكن الموافقة على طلب بحالة "${entry.status}"`, 422);
    }

    await entry.approve(note);
    entry.statusHistory.push({
      status: WAITLIST_STATUSES.APPROVED,
      changedAt: new Date(),
      changedBy: req.user?._id,
      note: note || 'تمت الموافقة على الطلب',
    });
    await entry.save();

    return ok(res, entry.toObject({ virtuals: true }), {
      message: 'تمت الموافقة على الطلب بنجاح',
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/waitlist/:id/enroll — تسجيل كمستفيد فعلي
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/enroll', validateId, async (req, res) => {
  try {
    const { beneficiaryId, branchId } = req.body;

    const entry = await WaitlistEntry.findById(req.params.id).populate('branch', 'code');
    if (!entry) return fail(res, 'الطلب غير موجود', 404);

    // التحقق من الحالة
    if (
      ![
        WAITLIST_STATUSES.APPROVED,
        WAITLIST_STATUSES.CONTACTED,
        WAITLIST_STATUSES.PENDING,
      ].includes(entry.status)
    ) {
      return fail(res, `لا يمكن تسجيل طلب بحالة "${entry.status}"`, 422);
    }

    let finalBeneficiaryId = beneficiaryId;

    // إذا لم يكن المستفيد موجوداً، أنشئه تلقائياً
    if (!finalBeneficiaryId) {
      const targetBranch = branchId || entry.branch?._id || entry.branch;

      // التحقق من السعة
      await beneficiaryService.checkBranchCapacity(targetBranch);

      // توليد رقم ملف
      const branchCode = entry.branch?.code;
      const fileNumber = await beneficiaryService.generateFileNumber(targetBranch, branchCode);

      const newBeneficiary = await Beneficiary.create({
        branch: targetBranch,
        fileNumber,
        firstName_ar: entry.applicantName.split(' ')[0] || entry.applicantName,
        lastName_ar: entry.applicantName.split(' ').slice(-1)[0] || entry.applicantName,
        phone: entry.applicantPhone,
        email: entry.applicantEmail,
        nationalId: entry.applicantNationalId,
        disabilityType: entry.disabilityType,
        disabilitySeverity: entry.disabilitySeverity,
        gender: entry.gender,
        status: 'active',
        enrollmentDate: new Date(),
        referralSource: entry.referralSource,
        createdBy: req.user?._id,
      });

      finalBeneficiaryId = newBeneficiary._id;
    }

    await entry.enroll(finalBeneficiaryId);
    entry.statusHistory.push({
      status: WAITLIST_STATUSES.ENROLLED,
      changedAt: new Date(),
      changedBy: req.user?._id,
      note: 'تم تسجيل المتقدم كمستفيد',
    });
    await entry.save();

    return ok(
      res,
      { entry: entry.toObject({ virtuals: true }), beneficiaryId: finalBeneficiaryId },
      { message: 'تم تسجيل المتقدم كمستفيد بنجاح' }
    );
  } catch (err) {
    if (err.code === 'BRANCH_CAPACITY_EXCEEDED') {
      return fail(res, err.message, 422, { code: err.code });
    }
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/waitlist/:id/reject — رفض الطلب
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/reject', validateId, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) return fail(res, 'سبب الرفض مطلوب', 422);

    const entry = await WaitlistEntry.findById(req.params.id);
    if (!entry) return fail(res, 'الطلب غير موجود', 404);

    if (
      [
        WAITLIST_STATUSES.ENROLLED,
        WAITLIST_STATUSES.CANCELLED,
        WAITLIST_STATUSES.REJECTED,
      ].includes(entry.status)
    ) {
      return fail(res, 'الطلب مغلق مسبقاً', 422);
    }

    await entry.reject(reason);
    entry.statusHistory.push({
      status: WAITLIST_STATUSES.REJECTED,
      changedAt: new Date(),
      changedBy: req.user?._id,
      note: reason,
    });
    await entry.save();

    return ok(res, entry.toObject({ virtuals: true }), {
      message: 'تم رفض الطلب',
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/waitlist/:id/cancel — إلغاء الطلب
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/cancel', validateId, async (req, res) => {
  try {
    const { reason } = req.body;

    const entry = await WaitlistEntry.findById(req.params.id);
    if (!entry) return fail(res, 'الطلب غير موجود', 404);

    if (
      [
        WAITLIST_STATUSES.ENROLLED,
        WAITLIST_STATUSES.CANCELLED,
        WAITLIST_STATUSES.REJECTED,
      ].includes(entry.status)
    ) {
      return fail(res, 'الطلب مغلق مسبقاً ولا يمكن إلغاؤه', 422);
    }

    await entry.cancel(reason);
    entry.statusHistory.push({
      status: WAITLIST_STATUSES.CANCELLED,
      changedAt: new Date(),
      changedBy: req.user?._id,
      note: reason || 'إلغاء من قِبل المتقدم',
    });
    await entry.save();

    return ok(res, entry.toObject({ virtuals: true }), {
      message: 'تم إلغاء الطلب',
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;
