/**
 * guardians.routes.js — مسارات إدارة أولياء الأمور
 * Guardian Management Routes
 *
 * المسارات:
 *  GET    /api/guardians            — قائمة أولياء الأمور مع بحث وفلترة
 *  GET    /api/guardians/search     — بحث سريع بالهوية أو الاسم أو الجوال
 *  GET    /api/guardians/:id        — تفاصيل ولي أمر واحد مع مستفيديه
 *  POST   /api/guardians            — إضافة ولي أمر جديد
 *  PUT    /api/guardians/:id        — تحديث بيانات ولي الأمر
 *  DELETE /api/guardians/:id        — حذف ولي أمر (ناعم)
 *  POST   /api/guardians/:id/link   — ربط ولي أمر بمستفيد
 *  DELETE /api/guardians/:id/unlink/:beneficiaryId — إلغاء الربط
 *
 * @module routes/guardians.routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Guardian = require('../models/Guardian');
const Beneficiary = require('../models/Beneficiary');
const { authenticateToken } = require('../middleware/auth.middleware');

// ─── دوال مساعدة ──────────────────────────────────────────────────────────────
const ok = (res, data, meta = {}) => res.json({ success: true, ...meta, data });
const fail = (res, msg, status = 400, extra = {}) =>
  res.status(status).json({ success: false, message: msg, ...extra });

const isValidId = id => mongoose.Types.ObjectId.isValid(id);

// ─── Middleware: التحقق من صحة ObjectId ───────────────────────────────────────
const validateId = (req, res, next) => {
  if (!isValidId(req.params.id)) return fail(res, 'معرّف غير صحيح', 400);
  next();
};

// ─── جميع المسارات تتطلب مصادقة ───────────────────────────────────────────────
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/guardians/search — بحث سريع
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @query {string} q   نص البحث (هوية، اسم، جوال)
 * @query {number} [limit=10] حد النتائج
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.trim().length < 2) return ok(res, []);

    const search = q.trim();
    const isDigits = /^\d+$/.test(search);

    const filter = isDigits
      ? { $or: [{ idNumber: new RegExp(search) }, { phone: new RegExp(search) }] }
      : {
          $or: [
            { firstName_ar: new RegExp(search, 'i') },
            { lastName_ar: new RegExp(search, 'i') },
            { name_ar: new RegExp(search, 'i') },
          ],
        };

    const guardians = await Guardian.find(filter)
      .select('_id firstName_ar lastName_ar name_ar phone idNumber relationship')
      .limit(Math.min(parseInt(limit, 10), 50))
      .lean();

    return ok(res, guardians);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/guardians — قائمة أولياء الأمور
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @query {string}  [search]    بحث بالاسم / الهوية / الجوال
 * @query {string}  [relationship] تصفية بصلة القرابة
 * @query {number}  [page=1]
 * @query {number}  [limit=25]
 * @query {string}  [sort=createdAt]
 * @query {string}  [direction=desc]
 */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      relationship,
      page = 1,
      limit = 25,
      sort = 'createdAt',
      direction = 'desc',
    } = req.query;

    const filter = {};

    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { name_ar: new RegExp(s, 'i') },
        { firstName_ar: new RegExp(s, 'i') },
        { idNumber: new RegExp(s) },
        { phone: new RegExp(s) },
      ];
    }

    if (relationship) filter.relationship = relationship;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = { [sort]: direction === 'asc' ? 1 : -1 };

    const [guardians, total] = await Promise.all([
      Guardian.find(filter)
        .select('-__v -idDocumentPath')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Guardian.countDocuments(filter),
    ]);

    return ok(res, guardians, {
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
// GET /api/guardians/:id — تفاصيل ولي أمر
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id', validateId, async (req, res) => {
  try {
    const guardian = await Guardian.findById(req.params.id).select('-__v').lean();
    if (!guardian) return fail(res, 'ولي الأمر غير موجود', 404);

    // جلب المستفيدين المرتبطين
    const beneficiaries = await Beneficiary.find({ 'guardians.guardian': req.params.id })
      .select('fileNumber firstName_ar lastName_ar status disabilityType branch')
      .populate('branch', 'nameAr code')
      .lean();

    return ok(res, { ...guardian, beneficiaries });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/guardians — إضافة ولي أمر جديد
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const {
      name_ar,
      firstName_ar,
      lastName_ar,
      name_en,
      firstName_en,
      lastName_en,
      phone,
      phone2,
      email,
      idNumber,
      relationship,
      occupation,
      employer,
      address,
      city,
      preferredContactMethod,
      preferredLanguage,
      canPickup,
    } = req.body;

    // التحقق من الحقول المطلوبة
    const nameValue =
      name_ar || (firstName_ar && lastName_ar ? `${firstName_ar} ${lastName_ar}` : null);
    if (!nameValue) return fail(res, 'اسم ولي الأمر بالعربية مطلوب', 422);
    if (!phone) return fail(res, 'رقم الجوال مطلوب', 422);
    if (!idNumber) return fail(res, 'رقم الهوية مطلوب', 422);
    if (!relationship) return fail(res, 'صلة القرابة مطلوبة', 422);

    // التحقق من تكرار الهوية
    const exists = await Guardian.findOne({ idNumber: idNumber.trim() }).lean();
    if (exists) {
      return fail(res, 'ولي الأمر مسجل مسبقاً بهذا الرقم', 422, { existingId: exists._id });
    }

    const guardian = await Guardian.create({
      name_ar: nameValue,
      firstName_ar,
      lastName_ar,
      name_en,
      firstName_en,
      lastName_en,
      phone: phone.trim(),
      phone2: phone2?.trim(),
      email: email?.trim()?.toLowerCase(),
      idNumber: idNumber.trim(),
      relationship,
      occupation,
      employer,
      address,
      city,
      preferredContactMethod: preferredContactMethod || 'whatsapp',
      preferredLanguage: preferredLanguage || 'ar',
      canPickup: canPickup !== undefined ? canPickup : true,
    });

    return res.status(201).json({ success: true, data: guardian });
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 'رقم الهوية مسجل مسبقاً', 422);
    }
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/guardians/:id — تحديث بيانات ولي الأمر
// ══════════════════════════════════════════════════════════════════════════════
router.put('/:id', validateId, async (req, res) => {
  try {
    // الحقول المسموح بتحديثها
    const allowedFields = [
      'name_ar',
      'firstName_ar',
      'lastName_ar',
      'name_en',
      'firstName_en',
      'lastName_en',
      'phone',
      'phone2',
      'email',
      'relationship',
      'occupation',
      'employer',
      'address',
      'city',
      'preferredContactMethod',
      'preferredLanguage',
      'canPickup',
      'isActive',
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return fail(res, 'لا توجد بيانات للتحديث', 400);
    }

    const guardian = await Guardian.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!guardian) return fail(res, 'ولي الأمر غير موجود', 404);

    return ok(res, guardian);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/guardians/:id — حذف ولي أمر
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', validateId, async (req, res) => {
  try {
    // التحقق من عدم وجود مستفيدين نشطين مرتبطين
    const activeBeneficiaries = await Beneficiary.countDocuments({
      'guardians.guardian': req.params.id,
      status: 'active',
    });

    if (activeBeneficiaries > 0) {
      return fail(
        res,
        `لا يمكن حذف ولي الأمر لأنه مرتبط بـ ${activeBeneficiaries} مستفيد نشط`,
        422
      );
    }

    // حذف ناعم إذا كان موجوداً في النموذج
    const guardian = await Guardian.findById(req.params.id);
    if (!guardian) return fail(res, 'ولي الأمر غير موجود', 404);

    if (typeof guardian.delete === 'function') {
      await guardian.delete();
    } else {
      await Guardian.findByIdAndUpdate(req.params.id, { isActive: false });
    }

    return ok(res, { deleted: true, id: req.params.id });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/guardians/:id/link — ربط ولي أمر بمستفيد
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/link', validateId, async (req, res) => {
  try {
    const { beneficiaryId, relationship, isPrimary = false, isEmergencyContact = true } = req.body;

    if (!beneficiaryId || !isValidId(beneficiaryId)) {
      return fail(res, 'معرّف المستفيد غير صحيح', 422);
    }

    const [guardian, beneficiary] = await Promise.all([
      Guardian.findById(req.params.id).lean(),
      Beneficiary.findById(beneficiaryId),
    ]);

    if (!guardian) return fail(res, 'ولي الأمر غير موجود', 404);
    if (!beneficiary) return fail(res, 'المستفيد غير موجود', 404);

    // إضافة الربط في مصفوفة الأولياء داخل المستفيد
    const alreadyLinked = beneficiary.guardians?.some(
      g => g.guardian?.toString() === req.params.id
    );

    if (alreadyLinked) {
      return fail(res, 'ولي الأمر مرتبط بالفعل بهذا المستفيد', 422);
    }

    if (!beneficiary.guardians) beneficiary.guardians = [];

    beneficiary.guardians.push({
      guardian: req.params.id,
      relationship: relationship || guardian.relationship,
      isPrimary,
      isEmergencyContact,
    });

    // إذا كان الأول، اجعله ولي الأمر الأساسي
    if (isPrimary || beneficiary.guardians.length === 1) {
      beneficiary.primaryGuardian = req.params.id;
    }

    await beneficiary.save();

    return ok(res, { linked: true, beneficiaryId, guardianId: req.params.id });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/guardians/:id/unlink/:beneficiaryId — إلغاء الربط
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/:id/unlink/:beneficiaryId', validateId, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!isValidId(beneficiaryId)) return fail(res, 'معرّف المستفيد غير صحيح', 400);

    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) return fail(res, 'المستفيد غير موجود', 404);

    const originalLen = beneficiary.guardians?.length || 0;
    beneficiary.guardians = (beneficiary.guardians || []).filter(
      g => g.guardian?.toString() !== req.params.id
    );

    if (beneficiary.guardians.length === originalLen) {
      return fail(res, 'الربط غير موجود', 404);
    }

    // إعادة تعيين ولي الأمر الأساسي إذا لزم
    if (beneficiary.primaryGuardian?.toString() === req.params.id) {
      const newPrimary = beneficiary.guardians.find(g => g.isPrimary) || beneficiary.guardians[0];
      beneficiary.primaryGuardian = newPrimary?.guardian || null;
    }

    await beneficiary.save();

    return ok(res, { unlinked: true });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;
