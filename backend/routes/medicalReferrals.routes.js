/**
 * Medical Referrals Routes — مسارات الإحالات الطبية
 *
 * Endpoints:
 *   /api/medical-referrals/           — Referrals CRUD & workflow
 *   /api/medical-referrals/follow-ups — Follow-up tracking
 *   /api/medical-referrals/dashboard  — Referrals dashboard
 */

const express = require('express');
const router = express.Router();
const { MedicalReferral, ReferralFollowUp } = require('../models/medicalReferral.model');
const logger = require('../utils/logger');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const { authenticate } = require('../middleware/auth');
const { safeError } = require('../utils/safeError');

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════
// REFERRALS — الإحالات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', async (req, res) => {
  try {
    const {
      beneficiary,
      status,
      referralType,
      priority,
      specialty,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (status) filter.status = status;
    if (referralType) filter.referralType = referralType;
    if (priority) filter.priority = priority;
    if (specialty) filter['referredTo.specialty'] = specialty;
    if (search) {
      filter.$or = [
        { referralNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { 'clinicalInfo.reasonForReferral.ar': { $regex: escapeRegex(search), $options: 'i' } },
        { 'clinicalInfo.reasonForReferral.en': { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [referrals, total] = await Promise.all([
      MedicalReferral.find(filter)
        .populate('beneficiary', 'name')
        .populate('referringProvider.practitioner', 'name')
        .populate('referredTo.practitioner', 'name')
        .populate('referredTo.department', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      MedicalReferral.countDocuments(filter),
    ]);
    res.json({ success: true, data: referrals, total });
  } catch (error) {
    logger.error('[Referrals] List referrals error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحالات', error: safeError(error) });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const referral = await MedicalReferral.findById(req.params.id)
      .populate('beneficiary', 'name')
      .populate('referringProvider.practitioner', 'name')
      .populate('referredTo.practitioner', 'name')
      .populate('referredTo.department', 'name')
      .populate('statusHistory.changedBy', 'name')
      .populate('communicationLog.by', 'name');
    if (!referral) return res.status(404).json({ success: false, message: 'الإحالة غير موجودة' });

    const followUps = await ReferralFollowUp.find({
      referral: referral._id,
      isDeleted: { $ne: true },
    })
      .populate('performedBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, data: { ...referral.toObject(), followUps } });
  } catch (error) {
    logger.error('[Referrals] Get referral error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحالة', error: safeError(error) });
  }
});

router.post('/', async (req, res) => {
  try {
    const referral = new MedicalReferral({
      ...req.body,
      createdBy: req.user?.id,
      statusHistory: [{ status: 'draft', changedBy: req.user?.id, reason: 'إنشاء الإحالة' }],
    });
    await referral.save();
    logger.info(`[Referrals] Referral created: ${referral.referralNumber}`);
    res.status(201).json({ success: true, data: referral });
  } catch (error) {
    logger.error('[Referrals] Create referral error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الإحالة', error: safeError(error) });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const referral = await MedicalReferral.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!referral) return res.status(404).json({ success: false, message: 'الإحالة غير موجودة' });
    res.json({ success: true, data: referral });
  } catch (error) {
    logger.error('[Referrals] Update referral error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في تحديث الإحالة', error: safeError(error) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await MedicalReferral.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'تم حذف الإحالة بنجاح' });
  } catch (error) {
    logger.error('[Referrals] Delete referral error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في حذف الإحالة', error: safeError(error) });
  }
});

// ─── Status transitions ────────────────────────────────────────────────
router.patch('/:id/approve', async (req, res) => {
  try {
    const referral = await MedicalReferral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: 'الإحالة غير موجودة' });
    referral.status = 'approved';
    referral.statusHistory.push({
      status: 'approved',
      changedBy: req.user?.id,
      reason: req.body.reason || 'تمت الموافقة',
    });
    await referral.save();
    logger.info(`[Referrals] Referral approved: ${referral.referralNumber}`);
    res.json({ success: true, data: referral, message: 'تمت الموافقة على الإحالة' });
  } catch (error) {
    logger.error('[Referrals] Approve referral error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في الموافقة على الإحالة', error: safeError(error) });
  }
});

router.patch('/:id/reject', async (req, res) => {
  try {
    const referral = await MedicalReferral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: 'الإحالة غير موجودة' });
    referral.status = 'rejected';
    referral.statusHistory.push({
      status: 'rejected',
      changedBy: req.user?.id,
      reason: req.body.reason || 'تم الرفض',
    });
    await referral.save();
    logger.info(`[Referrals] Referral rejected: ${referral.referralNumber}`);
    res.json({ success: true, data: referral });
  } catch (error) {
    logger.error('[Referrals] Reject referral error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في رفض الإحالة', error: safeError(error) });
  }
});

router.patch('/:id/send', async (req, res) => {
  try {
    const referral = await MedicalReferral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: 'الإحالة غير موجودة' });
    referral.status = 'sent';
    referral.statusHistory.push({
      status: 'sent',
      changedBy: req.user?.id,
      reason: 'تم إرسال الإحالة',
    });
    await referral.save();
    res.json({ success: true, data: referral, message: 'تم إرسال الإحالة' });
  } catch (error) {
    logger.error('[Referrals] Send referral error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في إرسال الإحالة', error: safeError(error) });
  }
});

router.patch('/:id/complete', async (req, res) => {
  try {
    const referral = await MedicalReferral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: 'الإحالة غير موجودة' });
    referral.status = 'completed';
    referral.consultationResponse = { ...req.body, receivedDate: new Date() };
    referral.statusHistory.push({
      status: 'completed',
      changedBy: req.user?.id,
      reason: 'اكتملت الإحالة',
    });
    await referral.save();
    logger.info(`[Referrals] Referral completed: ${referral.referralNumber}`);
    res.json({ success: true, data: referral, message: 'تم إكمال الإحالة' });
  } catch (error) {
    logger.error('[Referrals] Complete referral error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في إكمال الإحالة', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// FOLLOW-UPS — المتابعات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/follow-ups/pending', async (req, res) => {
  try {
    const referralsNeedingFollowUp = await MedicalReferral.find({
      status: { $in: ['sent', 'in_progress', 'scheduled'] },
      isDeleted: { $ne: true },
    })
      .populate('beneficiary', 'name')
      .populate('referredTo.practitioner', 'name')
      .sort({ createdAt: 1 })
      .limit(50);

    res.json({
      success: true,
      data: referralsNeedingFollowUp,
      count: referralsNeedingFollowUp.length,
    });
  } catch (error) {
    logger.error('[Referrals] Pending follow-ups error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب المتابعات المعلقة', error: safeError(error) });
  }
});

router.post('/follow-ups', async (req, res) => {
  try {
    const count = await ReferralFollowUp.countDocuments({ referral: req.body.referral });
    const followUp = new ReferralFollowUp({
      ...req.body,
      followUpNumber: count + 1,
      performedBy: req.body.performedBy || req.user?.id,
    });
    await followUp.save();

    // Add to referral communication log
    await MedicalReferral.findByIdAndUpdate(req.body.referral, {
      $push: {
        communicationLog: {
          type: req.body.contactedVia || 'phone',
          direction: 'outbound',
          summary: req.body.outcome?.ar || req.body.outcome?.en || 'متابعة',
          by: req.user?.id,
        },
      },
    });

    res.status(201).json({ success: true, data: followUp });
  } catch (error) {
    logger.error('[Referrals] Create follow-up error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إنشاء المتابعة', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة التحكم
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard/stats', async (req, res) => {
  try {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [
      totalReferrals,
      pendingApproval,
      sentReferrals,
      inProgressReferrals,
      completedReferrals,
      expiredReferrals,
      thisMonthCreated,
      byType,
      bySpecialty,
    ] = await Promise.all([
      MedicalReferral.countDocuments({ isDeleted: { $ne: true } }),
      MedicalReferral.countDocuments({ status: 'pending_approval', isDeleted: { $ne: true } }),
      MedicalReferral.countDocuments({ status: 'sent', isDeleted: { $ne: true } }),
      MedicalReferral.countDocuments({ status: 'in_progress', isDeleted: { $ne: true } }),
      MedicalReferral.countDocuments({ status: 'completed', isDeleted: { $ne: true } }),
      MedicalReferral.countDocuments({ status: 'expired', isDeleted: { $ne: true } }),
      MedicalReferral.countDocuments({ createdAt: { $gte: thisMonth }, isDeleted: { $ne: true } }),
      MedicalReferral.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$referralType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      MedicalReferral.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$referredTo.specialty', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalReferrals,
          pendingApproval,
          sent: sentReferrals,
          inProgress: inProgressReferrals,
          completed: completedReferrals,
          expired: expiredReferrals,
        },
        thisMonth: thisMonthCreated,
        byType,
        topSpecialties: bySpecialty,
      },
    });
  } catch (error) {
    logger.error('[Referrals] Dashboard error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في لوحة التحكم', error: safeError(error) });
  }
});

module.exports = router;
