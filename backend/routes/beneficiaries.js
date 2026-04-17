/**
 * Beneficiaries Admin Routes — مسارات إدارة المستفيدين
 *
 * Full CRUD + statistics + search + bulk operations for admin/staff.
 * Mounted at /api/beneficiaries
 *
 * @version 1.0.0
 * @date 2026-03-22
 */

const express = require('express');
const router = express.Router();
const Beneficiary = require('../models/Beneficiary');
const BeneficiaryProgress = require('../models/BeneficiaryProgress');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const { escapeRegex } = require('../utils/sanitize');
const validateObjectId = require('../middleware/validateObjectId');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');
// All beneficiary routes require authentication + branch scope
router.use(authenticate);
router.use(requireBranchAccess);

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  physical: 'حركية',
  mental: 'ذهنية',
  sensory: 'حسية',
  multiple: 'متعددة',
  learning: 'تعلم',
  speech: 'نطق',
  other: 'أخرى',
};

const STATUS_LABELS = {
  active: 'نشط',
  inactive: 'غير نشط',
  pending: 'قيد الانتظار',
  transferred: 'محوّل',
  graduated: 'متخرج',
};

/**
 * GET /api/beneficiaries
 * List beneficiaries with filtering, search, pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      status,
      category,
      gender,
      city,
      minAge,
      maxAge,
      sort = '-createdAt',
      archived,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build query — apply branch scope filter for multi-tenant isolation
    const filter = { ...branchFilter(req) };
    if (archived === 'true') {
      filter.isArchived = true;
    } else {
      filter.isArchived = { $ne: true };
    }
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (gender && gender !== 'all') filter.gender = gender;
    if (city) filter['address.city'] = new RegExp(escapeRegex(city), 'i');

    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { firstName: new RegExp(safe, 'i') },
        { lastName: new RegExp(safe, 'i') },
        { firstName_ar: new RegExp(safe, 'i') },
        { lastName_ar: new RegExp(safe, 'i') },
        { name: new RegExp(safe, 'i') },
        { fullNameArabic: new RegExp(safe, 'i') },
        { nationalId: new RegExp(safe, 'i') },
        { email: new RegExp(safe, 'i') },
        { mrn: new RegExp(safe, 'i') },
      ];
    }

    if (minAge || maxAge) {
      const now = new Date();
      if (maxAge) {
        const minDate = new Date(
          now.getFullYear() - parseInt(maxAge, 10) - 1,
          now.getMonth(),
          now.getDate()
        );
        filter.dateOfBirth = { $gte: minDate };
      }
      if (minAge) {
        const maxDate = new Date(
          now.getFullYear() - parseInt(minAge, 10),
          now.getMonth(),
          now.getDate()
        );
        filter.dateOfBirth = { ...filter.dateOfBirth, $lte: maxDate };
      }
    }

    // Parse sort
    const sortObj = {};
    const sortParts = sort.split(',');
    sortParts.forEach(s => {
      if (s.startsWith('-')) {
        sortObj[s.slice(1)] = -1;
      } else {
        sortObj[s] = 1;
      }
    });

    const [data, total] = await Promise.all([
      Beneficiary.find(filter)
        .select('-password -twoFactorSecret -accountVerificationCode')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Beneficiary.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Beneficiaries list error:', error);
    res
      .status(500)
      .json({ success: false, message: 'فشل في تحميل المستفيدين', error: safeError(error) });
  }
});

/**
 * GET /api/beneficiaries/statistics
 * Dashboard statistics — aggregated from DB
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await Beneficiary.getStatistics();

    // Monthly registrations (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyReg = await Beneficiary.aggregate([
      { $match: { isArchived: { $ne: true }, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          registrations: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const months = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];
    const monthlyData = monthlyReg.map(r => ({
      month: months[r._id.month - 1],
      registrations: r.registrations,
      active: r.active,
    }));

    // Age distribution
    const ageDist = await Beneficiary.aggregate([
      { $match: { isArchived: { $ne: true }, dateOfBirth: { $exists: true, $ne: null } } },
      {
        $project: {
          age: {
            $divide: [{ $subtract: [new Date(), '$dateOfBirth'] }, 365.25 * 24 * 60 * 60 * 1000],
          },
        },
      },
      {
        $bucket: {
          groupBy: '$age',
          boundaries: [0, 7, 13, 19, 26, 100],
          default: 'unknown',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const ageLabels = {
      0: '3-6 سنوات',
      7: '7-12 سنة',
      13: '13-18 سنة',
      19: '19-25 سنة',
      26: '25+ سنة',
    };
    const ageDistFormatted = ageDist
      .filter(a => a._id !== 'unknown')
      .map(a => ({ range: ageLabels[a._id] || `${a._id}+`, count: a.count }));

    // Progress distribution
    const progDist = await Beneficiary.aggregate([
      { $match: { isArchived: { $ne: true } } },
      {
        $bucket: {
          groupBy: { $ifNull: ['$progress', 0] },
          boundaries: [0, 21, 41, 61, 81, 101],
          default: 0,
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const progLabels = { 0: '0-20%', 21: '21-40%', 41: '41-60%', 61: '61-80%', 81: '81-100%' };
    const progressDistFormatted = progDist.map(p => ({
      range: progLabels[p._id] || '0-20%',
      count: p.count,
    }));

    res.json({
      success: true,
      data: {
        ...stats,
        monthlyRegistrations: monthlyData,
        ageDistribution: ageDistFormatted,
        progressDistribution: progressDistFormatted,
      },
    });
  } catch (error) {
    logger.error('Beneficiaries statistics error:', error);
    res
      .status(500)
      .json({ success: false, message: 'فشل في تحميل الإحصائيات', error: safeError(error) });
  }
});

/**
 * GET /api/beneficiaries/at-risk
 * Get beneficiaries at risk (low attendance, low progress, many absences)
 */
router.get('/at-risk', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const riskFilter = {
      ...branchFilter(req),
      isArchived: { $ne: true },
      status: 'active',
      $or: [
        { attendanceRate: { $lt: 75 } },
        { progress: { $lt: 30 } },
        { academicScore: { $lt: 50 } },
        { behaviorRating: { $lt: 3 } },
      ],
    };

    const data = await Beneficiary.find(riskFilter)
      .select(
        'firstName lastName firstName_ar lastName_ar name nationalId category status progress attendanceRate academicScore behaviorRating contactInfo phone sessions createdAt'
      )
      .sort({ attendanceRate: 1, progress: 1 })
      .limit(parseInt(limit, 10))
      .lean({ virtuals: true });

    const riskData = data.map(b => {
      const reasons = [];
      if ((b.attendanceRate || 100) < 75) reasons.push('حضور منخفض');
      if ((b.progress || 0) < 30) reasons.push('تقدم ضعيف');
      if ((b.academicScore || 100) < 50) reasons.push('درجات منخفضة');
      if ((b.behaviorRating || 5) < 3) reasons.push('سلوك يحتاج تحسين');
      return {
        ...b,
        riskReasons: reasons,
        riskLevel: reasons.length >= 3 ? 'high' : reasons.length >= 2 ? 'medium' : 'low',
      };
    });

    res.json({ success: true, data: riskData, total: riskData.length });
  } catch (error) {
    safeError(res, error, 'Beneficiaries at-risk error');
  }
});

/**
 * GET /api/beneficiaries/cities
 * Get distinct cities for filter dropdown
 */
router.get('/cities', async (req, res) => {
  try {
    const cities = await Beneficiary.distinct('address.city', {
      ...branchFilter(req),
      isArchived: { $ne: true },
      'address.city': { $exists: true, $nin: [null, ''] },
    });
    res.json({ success: true, data: cities.filter(Boolean).sort() });
  } catch (error) {
    safeError(res, error, 'Beneficiaries cities error');
  }
});

/**
 * GET /api/beneficiaries/recent
 * Get recently registered beneficiaries
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const data = await Beneficiary.find({ ...branchFilter(req), isArchived: { $ne: true } })
      .select(
        'firstName lastName firstName_ar lastName_ar name category status progress sessions createdAt joinDate disability'
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean({ virtuals: true });

    res.json({ success: true, data });
  } catch (error) {
    safeError(res, error, 'Beneficiaries recent error');
  }
});

/**
 * GET /api/beneficiaries/export
 * Export beneficiaries as CSV
 */
router.get('/export', async (req, res) => {
  try {
    const { status, category, format = 'csv' } = req.query;
    const filter = { ...branchFilter(req), isArchived: { $ne: true } };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const data = await Beneficiary.find(filter)
      .select('-password -twoFactorSecret -accountVerificationCode')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    if (format === 'csv') {
      let csv = 'الاسم,الحالة,نوع الإعاقة,الجنس,الهاتف,البريد,المدينة,تاريخ التسجيل,التقدم\n';
      data.forEach(b => {
        const name = b.fullName || b.name || `${b.firstName || ''} ${b.lastName || ''}`;
        const phone = b.contactInfo?.primaryPhone || b.phone || '';
        csv += `"${name}","${STATUS_LABELS[b.status] || b.status}","${CATEGORY_LABELS[b.category] || b.category || ''}","${b.gender || ''}","${phone}","${b.email || ''}","${b.address?.city || ''}","${(b.registrationDate || b.createdAt || '').toString().slice(0, 10)}","${b.progress || 0}%"\n`;
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=beneficiaries-export.csv');
      // BOM for Excel Arabic support
      return res.send('\uFEFF' + csv);
    }

    res.json({ success: true, data });
  } catch (error) {
    safeError(res, error, 'Beneficiaries export error');
  }
});

/**
 * GET /api/beneficiaries/:id
 * Get single beneficiary detail
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id)
      .select('-password -twoFactorSecret -accountVerificationCode')
      .populate('guardians', 'firstName_ar lastName_ar email phone')
      .populate('programs', 'name description status')
      .lean({ virtuals: true });

    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }

    // Get latest progress
    const latestProgress = await BeneficiaryProgress.findOne({ beneficiaryId: req.params.id })
      .sort({ month: -1 })
      .lean();

    // Get progress history (last 12 months)
    const progressHistory = await BeneficiaryProgress.find({ beneficiaryId: req.params.id })
      .sort({ month: -1 })
      .limit(12)
      .lean();

    res.json({
      success: true,
      data: {
        ...beneficiary,
        latestProgress,
        progressHistory,
      },
    });
  } catch (error) {
    safeError(res, error, 'Beneficiary detail error');
  }
});

/**
 * POST /api/beneficiaries
 * Create new beneficiary
 */
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      firstName_ar,
      lastName_ar,
      firstName_en,
      lastName_en,
      dateOfBirth,
      gender,
      nationalId,
      mrn,
      email,
      phone,
      address,
      disability,
      category,
      medicalInfo,
      educationInfo,
      familyMembers,
      emergencyContacts,
      status,
      tags,
      generalNotes,
    } = req.body;

    // Validate required fields
    if (!firstName && !firstName_ar) {
      return res.status(400).json({ success: false, message: 'الاسم الأول مطلوب' });
    }
    if (!lastName && !lastName_ar) {
      return res.status(400).json({ success: false, message: 'اسم العائلة مطلوب' });
    }

    // Check for duplicate nationalId
    if (nationalId) {
      const existing = await Beneficiary.findOne({ nationalId });
      if (existing) {
        return res.status(409).json({ success: false, message: 'رقم الهوية مسجل مسبقاً' });
      }
    }

    // Check for duplicate MRN
    if (mrn) {
      const existing = await Beneficiary.findOne({ mrn });
      if (existing) {
        return res.status(409).json({ success: false, message: 'رقم الملف الطبي مسجل مسبقاً' });
      }
    }

    const beneficiary = new Beneficiary({
      firstName: firstName || firstName_ar,
      middleName,
      lastName: lastName || lastName_ar,
      firstName_ar,
      lastName_ar,
      firstName_en,
      lastName_en,
      dateOfBirth,
      gender,
      nationalId,
      mrn,
      email,
      phone,
      contactInfo: { primaryPhone: phone, email },
      address,
      disability,
      category: category || disability?.type,
      medicalInfo,
      educationInfo,
      familyMembers,
      emergencyContacts,
      status: status || 'active',
      tags,
      generalNotes,
      registrationDate: new Date(),
      createdBy: req.user?._id,
    });

    await beneficiary.save();

    logger.info(`Beneficiary created: ${beneficiary._id} — ${beneficiary.fullName}`);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستفيد بنجاح',
      data: beneficiary,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ success: false, message: `القيمة مكررة: ${field}` });
    }
    logger.error('Beneficiary create error:', error);
    res
      .status(500)
      .json({ success: false, message: 'فشل في إنشاء المستفيد', error: safeError(error) });
  }
});

/**
 * PUT /api/beneficiaries/:id
 * Update beneficiary
 */
router.put('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const updateData = { ...stripUpdateMeta(req.body) };

    // Don't allow password update via this route
    delete updateData.password;
    delete updateData.twoFactorSecret;
    delete updateData.accountVerificationCode;

    // Track who modified
    updateData.lastModifiedBy = req.user?._id;

    // Sync category from disability
    if (updateData.disability?.type && !updateData.category) {
      updateData.category = updateData.disability.type;
    }

    // Sync name field
    if (updateData.firstName_ar && updateData.lastName_ar && !updateData.name) {
      updateData.name = `${updateData.firstName_ar} ${updateData.lastName_ar}`;
    }

    const beneficiary = await Beneficiary.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password -twoFactorSecret -accountVerificationCode');

    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }

    logger.info(`Beneficiary updated: ${beneficiary._id}`);

    res.json({
      success: true,
      message: 'تم تحديث بيانات المستفيد بنجاح',
      data: beneficiary,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ success: false, message: `القيمة مكررة: ${field}` });
    }
    logger.error('Beneficiary update error:', error);
    res
      .status(500)
      .json({ success: false, message: 'فشل في تحديث بيانات المستفيد', error: safeError(error) });
  }
});

/**
 * DELETE /api/beneficiaries/:id
 * Soft-delete (archive) beneficiary
 */
router.delete('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const { reason } = req.body;

    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }

    await beneficiary.archive(reason || 'تم الحذف من قبل المشرف');

    logger.info(`Beneficiary archived: ${beneficiary._id} — reason: ${reason}`);

    res.json({
      success: true,
      message: 'تم أرشفة المستفيد بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'Beneficiary delete error');
  }
});

/**
 * PATCH /api/beneficiaries/:id/restore
 * Restore archived beneficiary
 */
router.patch('/:id/restore', validateObjectId('id'), async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }

    await beneficiary.unarchive();

    res.json({
      success: true,
      message: 'تم استعادة المستفيد بنجاح',
      data: beneficiary,
    });
  } catch (error) {
    safeError(res, error, 'Beneficiary restore error');
  }
});

/**
 * PATCH /api/beneficiaries/:id/status
 * Update beneficiary status
 */
router.patch('/:id/status', validateObjectId('id'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'الحالة مطلوبة' });
    }

    const beneficiary = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      { status, lastModifiedBy: req.user?._id },
      { new: true }
    );

    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }

    res.json({
      success: true,
      message: 'تم تحديث حالة المستفيد',
      data: { id: beneficiary._id, status: beneficiary.status },
    });
  } catch (error) {
    safeError(res, error, 'Beneficiary status update error');
  }
});

/**
 * POST /api/beneficiaries/bulk-action
 * Perform bulk operations
 */
router.post('/bulk-action', async (req, res) => {
  try {
    const { action, ids, data } = req.body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
    }

    let result;
    switch (action) {
      case 'delete':
        result = await Beneficiary.updateMany(
          { _id: { $in: ids } },
          {
            isArchived: true,
            archivedDate: new Date(),
            archivedReason: data?.reason || 'حذف جماعي',
            status: 'inactive',
          }
        );
        break;
      case 'activate':
        result = await Beneficiary.updateMany({ _id: { $in: ids } }, { status: 'active' });
        break;
      case 'deactivate':
        result = await Beneficiary.updateMany({ _id: { $in: ids } }, { status: 'inactive' });
        break;
      case 'update-status':
        result = await Beneficiary.updateMany(
          { _id: { $in: ids } },
          { status: data?.status || 'active' }
        );
        break;
      default:
        return res.status(400).json({ success: false, message: `عملية غير معروفة: ${action}` });
    }

    res.json({
      success: true,
      message: `تم تنفيذ العملية على ${result.modifiedCount} مستفيد`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    safeError(res, error, 'Beneficiary bulk action error');
  }
});

/**
 * POST /api/beneficiaries/:id/progress
 * Add progress record for beneficiary
 */
router.post('/:id/progress', validateObjectId('id'), async (req, res) => {
  try {
    const beneficiaryId = req.params.id;
    const {
      month,
      academicScore,
      attendanceRate,
      behaviorRating,
      participationLevel,
      completedActivities,
      totalActivities,
      absenceDays,
      lateDays,
      strengths,
      areasOfImprovement,
      recommendations,
      teacherNotes,
    } = req.body;

    if (
      !month ||
      academicScore === undefined ||
      attendanceRate === undefined ||
      behaviorRating === undefined
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'بيانات ناقصة: الشهر والدرجة والحضور والسلوك مطلوبة' });
    }

    // Check beneficiary exists
    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }

    // Get previous month for improvement calc
    const prevProgress = await BeneficiaryProgress.findOne({ beneficiaryId }).sort({ month: -1 });
    const previousMonthScore = prevProgress?.academicScore || 0;
    const scoreImprovement = academicScore - previousMonthScore;
    const activityCompletionRate =
      totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

    // Determine performance
    let overallPerformance = 'needs_improvement';
    if (academicScore >= 80 && attendanceRate >= 85) overallPerformance = 'excellent';
    else if (academicScore >= 70 && attendanceRate >= 75) overallPerformance = 'good';
    else if (academicScore >= 60) overallPerformance = 'satisfactory';

    // Upsert progress
    const progress = await BeneficiaryProgress.findOneAndUpdate(
      { beneficiaryId, month },
      {
        beneficiaryId,
        month,
        academicScore,
        previousMonthScore,
        scoreImprovement,
        attendanceRate,
        behaviorRating,
        participationLevel: participationLevel || 'average',
        completedActivities: completedActivities || 0,
        totalActivities: totalActivities || 0,
        activityCompletionRate,
        absenceDays: absenceDays || 0,
        lateDays: lateDays || 0,
        strengths: strengths || [],
        areasOfImprovement: areasOfImprovement || [],
        recommendations: recommendations || [],
        teacherNotes,
        overallPerformance,
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Update beneficiary academic fields
    await Beneficiary.findByIdAndUpdate(beneficiaryId, {
      academicScore,
      attendanceRate,
      behaviorRating,
      progress: activityCompletionRate,
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل تقدم المستفيد بنجاح',
      data: progress,
    });
  } catch (error) {
    safeError(res, error, 'Beneficiary progress error');
  }
});

/**
 * GET /api/beneficiaries/:id/progress
 * Get progress history for beneficiary
 */
router.get('/:id/progress', validateObjectId('id'), async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const data = await BeneficiaryProgress.find({ beneficiaryId: req.params.id })
      .sort({ month: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    res.json({ success: true, data });
  } catch (error) {
    safeError(res, error, 'Beneficiary progress list error');
  }
});

module.exports = router;
