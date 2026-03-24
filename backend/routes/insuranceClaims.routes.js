/**
 * Insurance Claims Routes — مسارات مطالبات التأمين الطبي
 *
 * Endpoints:
 *   /api/insurance-claims/contracts       — Insurance contracts CRUD
 *   /api/insurance-claims/pre-auth        — Pre-authorization management
 *   /api/insurance-claims/claims          — Claims CRUD & workflow
 *   /api/insurance-claims/claim-items     — Claim line items
 *   /api/insurance-claims/dashboard       — Claims dashboard
 */

const express = require('express');
const router = express.Router();
const {
  InsuranceContract,
  PreAuthorization,
  InsuranceClaim,
  ClaimItem,
} = require('../models/insuranceClaim.model');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════
// INSURANCE CONTRACTS — عقود التأمين
// ═══════════════════════════════════════════════════════════════════════════

router.get('/contracts', async (req, res) => {
  try {
    const { status, type, classType, search, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (classType) filter.classType = classType;
    if (search) {
      filter.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { 'name.ar': { $regex: search, $options: 'i' } },
        { 'name.en': { $regex: search, $options: 'i' } },
        { 'insuranceCompany.name.ar': { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [contracts, total] = await Promise.all([
      InsuranceContract.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip),
      InsuranceContract.countDocuments(filter),
    ]);
    res.json({ success: true, data: contracts, total });
  } catch (error) {
    logger.error('[InsuranceClaims] List contracts error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في جلب العقود', error: error.message });
  }
});

router.get('/contracts/:id', async (req, res) => {
  try {
    const contract = await InsuranceContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, data: contract });
  } catch (error) {
    logger.error('[InsuranceClaims] Get contract error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في جلب العقد', error: error.message });
  }
});

router.post('/contracts', async (req, res) => {
  try {
    const contract = new InsuranceContract({ ...req.body, createdBy: req.user?.id });
    await contract.save();
    logger.info(`[InsuranceClaims] Contract created: ${contract.contractNumber}`);
    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    logger.error('[InsuranceClaims] Create contract error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في إنشاء العقد', error: error.message });
  }
});

router.put('/contracts/:id', async (req, res) => {
  try {
    const contract = await InsuranceContract.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, data: contract });
  } catch (error) {
    logger.error('[InsuranceClaims] Update contract error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في تحديث العقد', error: error.message });
  }
});

router.delete('/contracts/:id', async (req, res) => {
  try {
    await InsuranceContract.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'تم حذف العقد بنجاح' });
  } catch (error) {
    logger.error('[InsuranceClaims] Delete contract error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في حذف العقد', error: error.message });
  }
});

// Expiring contracts alert
router.get('/contracts-expiring', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiring = await InsuranceContract.find({
      status: 'active',
      endDate: { $gte: now, $lte: thirtyDays },
      isDeleted: { $ne: true },
    }).sort({ endDate: 1 });
    res.json({ success: true, data: expiring, count: expiring.length });
  } catch (error) {
    logger.error('[InsuranceClaims] Expiring contracts error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب العقود المنتهية', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PRE-AUTHORIZATION — الموافقة المسبقة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/pre-auth', async (req, res) => {
  try {
    const { beneficiary, contract, status, urgency, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (contract) filter.contract = contract;
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [preAuths, total] = await Promise.all([
      PreAuthorization.find(filter)
        .populate('beneficiary', 'name')
        .populate('contract', 'contractNumber name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      PreAuthorization.countDocuments(filter),
    ]);
    res.json({ success: true, data: preAuths, total });
  } catch (error) {
    logger.error('[InsuranceClaims] List pre-auth error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الموافقات المسبقة', error: error.message });
  }
});

router.get('/pre-auth/:id', async (req, res) => {
  try {
    const preAuth = await PreAuthorization.findById(req.params.id)
      .populate('beneficiary', 'name')
      .populate('contract', 'contractNumber name');
    if (!preAuth)
      return res.status(404).json({ success: false, message: 'الموافقة المسبقة غير موجودة' });
    res.json({ success: true, data: preAuth });
  } catch (error) {
    logger.error('[InsuranceClaims] Get pre-auth error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الموافقة المسبقة', error: error.message });
  }
});

router.post('/pre-auth', async (req, res) => {
  try {
    const preAuth = new PreAuthorization({ ...req.body, requestedBy: req.user?.id });
    await preAuth.save();
    logger.info(`[InsuranceClaims] Pre-auth created: ${preAuth.preAuthNumber}`);
    res.status(201).json({ success: true, data: preAuth });
  } catch (error) {
    logger.error('[InsuranceClaims] Create pre-auth error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إنشاء الموافقة المسبقة', error: error.message });
  }
});

router.patch('/pre-auth/:id/approve', async (req, res) => {
  try {
    const preAuth = await PreAuthorization.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvalDetails: {
          ...req.body,
          approvedDate: new Date(),
        },
      },
      { new: true }
    );
    if (!preAuth)
      return res.status(404).json({ success: false, message: 'الموافقة المسبقة غير موجودة' });
    logger.info(`[InsuranceClaims] Pre-auth approved: ${preAuth.preAuthNumber}`);
    res.json({ success: true, data: preAuth, message: 'تمت الموافقة بنجاح' });
  } catch (error) {
    logger.error('[InsuranceClaims] Approve pre-auth error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في الموافقة', error: error.message });
  }
});

router.patch('/pre-auth/:id/deny', async (req, res) => {
  try {
    const preAuth = await PreAuthorization.findByIdAndUpdate(
      req.params.id,
      { status: 'denied', denialReason: req.body.reason },
      { new: true }
    );
    if (!preAuth)
      return res.status(404).json({ success: false, message: 'الموافقة المسبقة غير موجودة' });
    logger.info(`[InsuranceClaims] Pre-auth denied: ${preAuth.preAuthNumber}`);
    res.json({ success: true, data: preAuth });
  } catch (error) {
    logger.error('[InsuranceClaims] Deny pre-auth error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في الرفض', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CLAIMS — المطالبات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/claims', async (req, res) => {
  try {
    const {
      beneficiary,
      contract,
      status,
      claimType,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (contract) filter.contract = contract;
    if (status) filter.status = status;
    if (claimType) filter.claimType = claimType;
    if (search) {
      filter.$or = [{ claimNumber: { $regex: search, $options: 'i' } }];
    }
    if (dateFrom || dateTo) {
      filter.visitDate = {};
      if (dateFrom) filter.visitDate.$gte = new Date(dateFrom);
      if (dateTo) filter.visitDate.$lte = new Date(dateTo);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [claims, total] = await Promise.all([
      InsuranceClaim.find(filter)
        .populate('beneficiary', 'name')
        .populate('contract', 'contractNumber name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      InsuranceClaim.countDocuments(filter),
    ]);
    res.json({ success: true, data: claims, total });
  } catch (error) {
    logger.error('[InsuranceClaims] List claims error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في جلب المطالبات', error: error.message });
  }
});

router.get('/claims/:id', async (req, res) => {
  try {
    const claim = await InsuranceClaim.findById(req.params.id)
      .populate('beneficiary', 'name')
      .populate('contract', 'contractNumber name insuranceCompany')
      .populate('preAuthorization', 'preAuthNumber status');
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });

    const items = await ClaimItem.find({ claim: claim._id, isDeleted: { $ne: true } }).sort({
      sequence: 1,
    });
    res.json({ success: true, data: { ...claim.toObject(), items } });
  } catch (error) {
    logger.error('[InsuranceClaims] Get claim error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في جلب المطالبة', error: error.message });
  }
});

router.post('/claims', async (req, res) => {
  try {
    const { items, ...claimData } = req.body;
    const claim = new InsuranceClaim({ ...claimData, createdBy: req.user?.id });
    await claim.save();

    // Create claim items if provided
    if (items && items.length > 0) {
      const claimItems = items.map((item, idx) => ({
        ...item,
        claim: claim._id,
        sequence: idx + 1,
        totalNet:
          item.totalNet ||
          item.unitPrice * item.quantity * (item.factor || 1) - (item.discount || 0),
      }));
      await ClaimItem.insertMany(claimItems);
    }

    logger.info(`[InsuranceClaims] Claim created: ${claim.claimNumber}`);
    res.status(201).json({ success: true, data: claim });
  } catch (error) {
    logger.error('[InsuranceClaims] Create claim error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إنشاء المطالبة', error: error.message });
  }
});

router.put('/claims/:id', async (req, res) => {
  try {
    const claim = await InsuranceClaim.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });
    res.json({ success: true, data: claim });
  } catch (error) {
    logger.error('[InsuranceClaims] Update claim error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث المطالبة', error: error.message });
  }
});

// Submit claim
router.patch('/claims/:id/submit', async (req, res) => {
  try {
    const claim = await InsuranceClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });
    if (claim.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'المطالبة مرسلة مسبقاً' });
    }

    // Validate claim has items
    const itemCount = await ClaimItem.countDocuments({
      claim: claim._id,
      isDeleted: { $ne: true },
    });
    if (itemCount === 0) {
      return res.status(400).json({ success: false, message: 'المطالبة لا تحتوي على بنود' });
    }

    claim.status = 'submitted';
    claim.submissionDate = new Date();
    claim.submissionMethod = req.body.method || 'manual';
    await claim.save();

    logger.info(`[InsuranceClaims] Claim submitted: ${claim.claimNumber}`);
    res.json({ success: true, data: claim, message: 'تم إرسال المطالبة بنجاح' });
  } catch (error) {
    logger.error('[InsuranceClaims] Submit claim error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إرسال المطالبة', error: error.message });
  }
});

// Adjudicate claim
router.patch('/claims/:id/adjudicate', async (req, res) => {
  try {
    const { approvedAmount, deniedAmount, adjustmentAmount, denialReasons } = req.body;
    const claim = await InsuranceClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });

    claim.adjudication = {
      processDate: new Date(),
      adjudicatedBy: req.user?.name || 'System',
      approvedAmount: approvedAmount || 0,
      deniedAmount: deniedAmount || 0,
      adjustmentAmount: adjustmentAmount || 0,
      paymentAmount: approvedAmount || 0,
      denialReasons: denialReasons || [],
    };

    if (approvedAmount >= claim.totalNet) {
      claim.status = 'approved';
    } else if (approvedAmount > 0) {
      claim.status = 'partially_approved';
    } else {
      claim.status = 'denied';
    }
    await claim.save();

    logger.info(`[InsuranceClaims] Claim adjudicated: ${claim.claimNumber} → ${claim.status}`);
    res.json({ success: true, data: claim });
  } catch (error) {
    logger.error('[InsuranceClaims] Adjudicate claim error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في معالجة المطالبة', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CLAIM ITEMS — بنود المطالبة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/claim-items/:claimId', async (req, res) => {
  try {
    const items = await ClaimItem.find({
      claim: req.params.claimId,
      isDeleted: { $ne: true },
    }).sort({ sequence: 1 });
    res.json({ success: true, data: items });
  } catch (error) {
    logger.error('[InsuranceClaims] List claim items error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب بنود المطالبة', error: error.message });
  }
});

router.post('/claim-items', async (req, res) => {
  try {
    const count = await ClaimItem.countDocuments({ claim: req.body.claim });
    const item = new ClaimItem({
      ...req.body,
      sequence: count + 1,
      totalNet:
        req.body.totalNet ||
        req.body.unitPrice * (req.body.quantity || 1) * (req.body.factor || 1) -
          (req.body.discount || 0),
    });
    await item.save();

    // Update claim totals
    const allItems = await ClaimItem.find({ claim: req.body.claim, isDeleted: { $ne: true } });
    const totalNet = allItems.reduce((sum, i) => sum + (i.totalNet || 0), 0);
    const totalDiscount = allItems.reduce((sum, i) => sum + (i.discount || 0), 0);
    await InsuranceClaim.findByIdAndUpdate(req.body.claim, {
      totalGross: totalNet + totalDiscount,
      totalNet,
      totalDiscount,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error('[InsuranceClaims] Create claim item error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في إضافة البند', error: error.message });
  }
});

router.delete('/claim-items/:id', async (req, res) => {
  try {
    const item = await ClaimItem.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'البند غير موجود' });
    res.json({ success: true, message: 'تم حذف البند بنجاح' });
  } catch (error) {
    logger.error('[InsuranceClaims] Delete claim item error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في حذف البند', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم المطالبات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalClaims,
      draftClaims,
      submittedClaims,
      approvedClaims,
      deniedClaims,
      paidClaims,
      pendingPreAuths,
      activeContracts,
    ] = await Promise.all([
      InsuranceClaim.countDocuments({ isDeleted: { $ne: true } }),
      InsuranceClaim.countDocuments({ status: 'draft', isDeleted: { $ne: true } }),
      InsuranceClaim.countDocuments({ status: 'submitted', isDeleted: { $ne: true } }),
      InsuranceClaim.countDocuments({
        status: { $in: ['approved', 'partially_approved'] },
        isDeleted: { $ne: true },
      }),
      InsuranceClaim.countDocuments({ status: 'denied', isDeleted: { $ne: true } }),
      InsuranceClaim.countDocuments({
        status: { $in: ['paid', 'partially_paid'] },
        isDeleted: { $ne: true },
      }),
      PreAuthorization.countDocuments({ status: 'pending', isDeleted: { $ne: true } }),
      InsuranceContract.countDocuments({ status: 'active', isDeleted: { $ne: true } }),
    ]);

    // Aggregate financials
    const financials = await InsuranceClaim.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          status: { $in: ['approved', 'partially_approved', 'paid', 'partially_paid'] },
        },
      },
      {
        $group: {
          _id: null,
          totalSubmitted: { $sum: '$totalNet' },
          totalApproved: { $sum: '$adjudication.approvedAmount' },
          totalPaid: { $sum: '$payment.amount' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        claims: {
          total: totalClaims,
          draft: draftClaims,
          submitted: submittedClaims,
          approved: approvedClaims,
          denied: deniedClaims,
          paid: paidClaims,
        },
        preAuth: { pending: pendingPreAuths },
        contracts: { active: activeContracts },
        financials: financials[0] || { totalSubmitted: 0, totalApproved: 0, totalPaid: 0 },
      },
    });
  } catch (error) {
    logger.error('[InsuranceClaims] Dashboard error:', { message: error.message });
    res.status(500).json({ success: false, message: 'خطأ في لوحة التحكم', error: error.message });
  }
});

module.exports = router;
