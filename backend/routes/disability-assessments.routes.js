/**
 * disability-assessments.routes.js — مسارات تقييمات الإعاقة
 * Disability Assessment Routes
 *
 * المسارات:
 *  GET    /api/disability-assessments                  — قائمة التقييمات
 *  GET    /api/disability-assessments/:id             — تفاصيل تقييم
 *  POST   /api/disability-assessments                  — إنشاء تقييم جديد
 *  PUT    /api/disability-assessments/:id             — تحديث تقييم
 *  POST   /api/disability-assessments/:id/approve     — اعتماد التقييم
 *  DELETE /api/disability-assessments/:id             — حذف تقييم (draft فقط)
 *
 *  — مسارات مُدمجة مع المستفيد:
 *  GET    /api/beneficiaries/:beneficiaryId/assessments
 *  POST   /api/beneficiaries/:beneficiaryId/assessments
 *
 * @module routes/disability-assessments.routes
 */

'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true }); // لدعم /beneficiaries/:beneficiaryId/assessments
const mongoose = require('mongoose');

const { authenticateToken } = require('../middleware/auth.middleware');
const {
  ASSESSMENT_TYPES,
  DISABILITY_TYPES,
  DISABILITY_SEVERITIES,
  FUNCTIONAL_LEVELS,
} = require('../constants/beneficiary.constants');

// ─── تحميل النموذج المناسب ─────────────────────────────────────────────────────
let DisabilityAssessment;
try {
  DisabilityAssessment = require('../models/disability-assessment.model');
} catch {
  DisabilityAssessment = null;
}

// ─── دوال مساعدة ──────────────────────────────────────────────────────────────
const ok = (res, data, meta = {}) => res.json({ success: true, ...meta, data });
const fail = (res, msg, status = 400, extra = {}) =>
  res.status(status).json({ success: false, message: msg, ...extra });

const isValidId = id => mongoose.Types.ObjectId.isValid(id);

const validateId = (req, res, next) => {
  if (!isValidId(req.params.id)) return fail(res, 'معرّف غير صحيح', 400);
  next();
};

// ─── التحقق من النموذج ─────────────────────────────────────────────────────────
const checkModel = (req, res, next) => {
  if (!DisabilityAssessment) {
    return fail(res, 'نموذج تقييم الإعاقة غير متاح', 503);
  }
  next();
};

// ─── جميع المسارات تتطلب مصادقة ───────────────────────────────────────────────
router.use(authenticateToken);
router.use(checkModel);

// ══════════════════════════════════════════════════════════════════════════════
// GET / — قائمة التقييمات
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @query {string}  [beneficiaryId]    تصفية بالمستفيد
 * @query {string}  [assessmentType]   تصفية بنوع التقييم
 * @query {string}  [status]           draft | completed | approved
 * @query {string}  [assessorId]       المُقيِّم
 * @query {number}  [page=1]
 * @query {number}  [limit=25]
 */
router.get('/', async (req, res) => {
  try {
    const { beneficiaryId, assessmentType, status, assessorId, page = 1, limit = 25 } = req.query;

    const filter = {};

    // إذا جاء من مسار مُدمج: /beneficiaries/:beneficiaryId/assessments
    if (req.params.beneficiaryId && isValidId(req.params.beneficiaryId)) {
      filter.beneficiary = req.params.beneficiaryId;
    } else if (beneficiaryId && isValidId(beneficiaryId)) {
      filter.beneficiary = beneficiaryId;
    }

    if (assessmentType) filter.assessmentType = assessmentType;
    if (status) filter.status = status;
    if (assessorId && isValidId(assessorId)) filter.assessorId = assessorId;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [assessments, total] = await Promise.all([
      DisabilityAssessment.find(filter)
        .populate('beneficiary', 'fileNumber firstName_ar lastName_ar')
        .populate('assessorId', 'name')
        .populate('approvedBy', 'name')
        .sort({ assessmentDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DisabilityAssessment.countDocuments(filter),
    ]);

    return ok(res, assessments, {
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /:id — تفاصيل تقييم
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id', validateId, async (req, res) => {
  try {
    const assessment = await DisabilityAssessment.findById(req.params.id)
      .populate('beneficiary', 'fileNumber firstName_ar lastName_ar dateOfBirth disabilityType')
      .populate('assessorId', 'name email')
      .populate('approvedBy', 'name')
      .lean();

    if (!assessment) return fail(res, 'التقييم غير موجود', 404);
    return ok(res, assessment);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST / — إنشاء تقييم جديد
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const {
      beneficiaryId,
      assessmentDate,
      assessmentType,
      disabilityType,
      disabilitySeverity,
      functionalLevel,
      communicationLevel,
      mobilityLevel,
      selfCareLevel,
      cognitiveLevel,
      socialLevel,
      behavioralNotes,
      recommendations,
      nextAssessmentDate,
      attachments,
    } = req.body;

    // الحصول على beneficiaryId من المسار المُدمج أو من الجسم
    const finalBeneficiaryId = req.params.beneficiaryId || beneficiaryId;

    if (!finalBeneficiaryId || !isValidId(finalBeneficiaryId)) {
      return fail(res, 'معرّف المستفيد مطلوب', 422);
    }
    if (!assessmentDate) return fail(res, 'تاريخ التقييم مطلوب', 422);
    if (!assessmentType) return fail(res, 'نوع التقييم مطلوب', 422);
    if (!disabilityType) return fail(res, 'نوع الإعاقة مطلوب', 422);
    if (!disabilitySeverity) return fail(res, 'شدة الإعاقة مطلوبة', 422);
    if (!functionalLevel) return fail(res, 'المستوى الوظيفي مطلوب', 422);

    // التحقق من القيم المسموحة
    if (!Object.values(ASSESSMENT_TYPES).includes(assessmentType)) {
      return fail(res, 'نوع التقييم غير صحيح', 422);
    }
    if (!Object.values(DISABILITY_TYPES).includes(disabilityType)) {
      return fail(res, 'نوع الإعاقة غير صحيح', 422);
    }
    if (!Object.values(DISABILITY_SEVERITIES).includes(disabilitySeverity)) {
      return fail(res, 'شدة الإعاقة غير صحيحة', 422);
    }
    if (!FUNCTIONAL_LEVELS.includes(functionalLevel)) {
      return fail(res, 'المستوى الوظيفي غير صحيح', 422);
    }

    const assessmentData = {
      beneficiary: finalBeneficiaryId,
      assessmentDate: new Date(assessmentDate),
      assessorId: req.user?._id,
      assessmentType,
      disabilityType,
      disabilitySeverity,
      functionalLevel,
      communicationLevel,
      mobilityLevel,
      selfCareLevel,
      cognitiveLevel,
      socialLevel,
      behavioralNotes,
      recommendations,
      nextAssessmentDate: nextAssessmentDate ? new Date(nextAssessmentDate) : undefined,
      attachments,
      status: 'draft',
    };

    const assessment = await DisabilityAssessment.create(assessmentData);

    return res.status(201).json({ success: true, data: assessment });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return fail(res, messages.join(', '), 422);
    }
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /:id — تحديث تقييم
// ══════════════════════════════════════════════════════════════════════════════
router.put('/:id', validateId, async (req, res) => {
  try {
    const assessment = await DisabilityAssessment.findById(req.params.id);
    if (!assessment) return fail(res, 'التقييم غير موجود', 404);

    // لا يمكن تعديل تقييم مُعتمد
    if (assessment.status === 'approved') {
      return fail(res, 'لا يمكن تعديل تقييم مُعتمد', 422);
    }

    const allowedFields = [
      'assessmentDate',
      'assessmentType',
      'disabilityType',
      'disabilitySeverity',
      'functionalLevel',
      'communicationLevel',
      'mobilityLevel',
      'selfCareLevel',
      'cognitiveLevel',
      'socialLevel',
      'behavioralNotes',
      'recommendations',
      'nextAssessmentDate',
      'attachments',
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // إذا كان مكتملاً من قبل، أعده إلى draft بعد التعديل
    if (assessment.status === 'completed') {
      updates.status = 'draft';
    }

    Object.assign(assessment, updates);
    await assessment.save();

    return ok(res, assessment.toObject ? assessment.toObject() : assessment);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/submit — رفع التقييم للاعتماد
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/submit', validateId, async (req, res) => {
  try {
    const assessment = await DisabilityAssessment.findById(req.params.id);
    if (!assessment) return fail(res, 'التقييم غير موجود', 404);

    if (assessment.status !== 'draft') {
      return fail(res, `التقييم بحالة "${assessment.status}" ولا يمكن تقديمه`, 422);
    }

    assessment.status = 'completed';
    await assessment.save();

    return ok(res, assessment, { message: 'تم رفع التقييم للاعتماد' });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/approve — اعتماد التقييم
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/approve', validateId, async (req, res) => {
  try {
    const assessment = await DisabilityAssessment.findById(req.params.id);
    if (!assessment) return fail(res, 'التقييم غير موجود', 404);

    if (assessment.status !== 'completed') {
      return fail(res, 'يجب أن يكون التقييم مكتملاً قبل الاعتماد', 422);
    }

    // لا يمكن للمُقيِّم نفسه أن يعتمد تقييمه
    if (assessment.assessorId?.toString() === req.user?._id?.toString()) {
      return fail(res, 'لا يمكن للمُقيِّم اعتماد تقييمه الخاص', 403);
    }

    assessment.status = 'approved';
    assessment.approvedBy = req.user?._id;
    assessment.approvedAt = new Date();
    await assessment.save();

    return ok(res, assessment, { message: 'تم اعتماد التقييم بنجاح' });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /:id — حذف تقييم (draft فقط)
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', validateId, async (req, res) => {
  try {
    const assessment = await DisabilityAssessment.findById(req.params.id);
    if (!assessment) return fail(res, 'التقييم غير موجود', 404);

    if (assessment.status !== 'draft') {
      return fail(res, 'يمكن حذف التقييمات المسودّة فقط', 422);
    }

    await DisabilityAssessment.findByIdAndDelete(req.params.id);

    return ok(res, { deleted: true, id: req.params.id });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;
