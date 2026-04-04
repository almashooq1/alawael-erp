/**
 * Contract Management Routes — مسارات إدارة العقود والاتفاقيات
 * النظام 35: إدارة العقود والاتفاقيات
 *
 * Base: /api/contract-management
 * ─── Templates         /templates
 * ─── Contracts         /contracts
 * ─── Parties           /contracts/:id/parties
 * ─── Approvals         /contracts/:id/approvals
 * ─── Amendments        /contracts/:id/amendments
 * ─── Negotiations      /contracts/:id/negotiations
 * ─── Actions           sign / renew / terminate / submit-approval
 * ─── Dashboard         /dashboard
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// Models
const ContractTemplate = require('../models/ContractTemplate');
const Contract = require('../models/Contract.model');
const ContractParty = require('../models/ContractParty');
const ContractApproval = require('../models/ContractApproval');
const ContractAmendment = require('../models/ContractAmendment');
const ContractNegotiation = require('../models/ContractNegotiation');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MAX_LIMIT = 100;
const clamp = v => Math.max(1, Math.min(parseInt(v, 10) || 20, MAX_LIMIT));
const validId = (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'معرف غير صالح' });
    return false;
  }
  return true;
};
const genContractNumber = () => {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const rnd = crypto.randomInt(1000, 9999);
  return `CNT-${year}-${ts}${rnd}`;
};
const genAmendmentNumber = () => {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  return `AMD-${year}-${ts}`;
};

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/templates', async (req, res) => {
  try {
    const { type, isActive, page = 1, limit: rawLimit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const limit = clamp(rawLimit);
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      ContractTemplate.find(filter).sort({ nameAr: 1 }).skip(skip).limit(limit).lean(),
      ContractTemplate.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit, total } });
  } catch (err) {
    logger.error('templates list error', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب القوالب' });
  }
});

router.get('/templates/:id', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const tmpl = await ContractTemplate.findById(req.params.id).lean();
    if (!tmpl) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, data: tmpl });
  } catch (err) {
    logger.error('template get error', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب القالب' });
  }
});

router.post('/templates', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { nameAr, code, type, bodyAr } = req.body;
    if (!nameAr || !code || !type || !bodyAr)
      return res.status(400).json({ success: false, message: 'الاسم، الكود، النوع، والنص مطلوبة' });
    const tmpl = await ContractTemplate.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: tmpl, message: 'تم إنشاء القالب' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'الكود مستخدم مسبقاً' });
    logger.error('template create error', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء القالب' });
  }
});

router.put('/templates/:id', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const tmpl = await ContractTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    ).lean();
    if (!tmpl) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, data: tmpl, message: 'تم تحديث القالب' });
  } catch (err) {
    logger.error('template update error', err);
    res.status(500).json({ success: false, message: 'خطأ في التحديث' });
  }
});

router.delete('/templates/:id', authorize(['admin']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const tmpl = await ContractTemplate.findByIdAndDelete(req.params.id);
    if (!tmpl) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, message: 'تم حذف القالب' });
  } catch (err) {
    logger.error('template delete error', err);
    res.status(500).json({ success: false, message: 'خطأ في الحذف' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/contracts/stats', async (req, res) => {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 864e5);
    const [total, byStatus, expiringSoon, autoRenewal] = await Promise.all([
      Contract.countDocuments(),
      Contract.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Contract.countDocuments({ status: 'ACTIVE', endDate: { $gte: now, $lte: soon } }),
      Contract.countDocuments({ 'renewalTerms.isAutoRenewal': true, status: 'ACTIVE' }),
    ]);
    const stats = { total, byStatus: {}, expiringSoon, autoRenewal };
    byStatus.forEach(s => {
      stats.byStatus[s._id || 'unknown'] = s.count;
    });
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error('contracts stats error', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

router.get('/contracts', async (req, res) => {
  try {
    const { search, status, type, expiringSoon, page = 1, limit: rawLimit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (type) filter.contractType = type.toUpperCase();
    if (expiringSoon === 'true') {
      const now = new Date();
      filter.endDate = { $gte: now, $lte: new Date(now.getTime() + 30 * 864e5) };
      filter.status = 'ACTIVE';
    }
    if (search) {
      filter.$or = [
        { contractTitle: { $regex: search, $options: 'i' } },
        { contractNumber: { $regex: search, $options: 'i' } },
        { 'supplier.supplierName': { $regex: search, $options: 'i' } },
      ];
    }
    const limit = clamp(rawLimit);
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      Contract.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Contract.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit, total } });
  } catch (err) {
    logger.error('contracts list error', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب العقود' });
  }
});

router.post('/contracts', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { contractTitle, contractType, startDate, endDate } = req.body;
    if (!contractTitle || !contractType || !startDate || !endDate)
      return res
        .status(400)
        .json({ success: false, message: 'العنوان، النوع، وتاريخ البدء والانتهاء مطلوبة' });
    const contractNumber = genContractNumber();
    const contract = await Contract.create({
      ...req.body,
      contractNumber,
      status: 'DRAFT',
      createdBy: req.user?.id,
    });
    // Create parties if provided
    if (Array.isArray(req.body.parties) && req.body.parties.length > 0) {
      const partyDocs = req.body.parties.map((p, i) => ({
        ...p,
        contractId: contract._id,
        sortOrder: i,
        branchId: req.body.branchId,
        createdBy: req.user?.id,
      }));
      await ContractParty.insertMany(partyDocs);
    }
    res.status(201).json({ success: true, data: contract, message: 'تم إنشاء العقد' });
  } catch (err) {
    logger.error('contracts create error', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء العقد' });
  }
});

router.get('/contracts/:id', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const contract = await Contract.findById(req.params.id).lean();
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    const [parties, approvals, amendments, negotiations] = await Promise.all([
      ContractParty.find({ contractId: req.params.id }).sort({ sortOrder: 1 }).lean(),
      ContractApproval.find({ contractId: req.params.id }).sort({ stepOrder: 1 }).lean(),
      ContractAmendment.find({ contractId: req.params.id }).sort({ effectiveDate: -1 }).lean(),
      ContractNegotiation.find({ contractId: req.params.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);
    res.json({
      success: true,
      data: { ...contract, parties, approvals, amendments, negotiations },
    });
  } catch (err) {
    logger.error('contract get error', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب العقد' });
  }
});

router.put('/contracts/:id', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const existing = await Contract.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    if (!['DRAFT', 'SUSPENDED'].includes(existing.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل عقد في هذه الحالة' });
    }
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?.id, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    res.json({ success: true, data: contract, message: 'تم تحديث العقد' });
  } catch (err) {
    logger.error('contract update error', err);
    res.status(500).json({ success: false, message: 'خطأ في التحديث' });
  }
});

router.delete('/contracts/:id', authorize(['admin']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    if (contract.status !== 'DRAFT')
      return res.status(409).json({ success: false, message: 'لا يمكن حذف إلا المسودات' });
    await contract.deleteOne();
    res.json({ success: true, message: 'تم حذف العقد' });
  } catch (err) {
    logger.error('contract delete error', err);
    res.status(500).json({ success: false, message: 'خطأ في الحذف' });
  }
});

// ─── Submit for approval ──────────────────────────────────────────────────────
router.post('/contracts/:id/submit-approval', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    if (contract.status !== 'DRAFT')
      return res.status(409).json({ success: false, message: 'يمكن رفع المسودات فقط' });
    contract.status = 'ACTIVE'; // using ACTIVE as under_review (simplified)
    await contract.save();
    await ContractApproval.create({
      contractId: contract._id,
      branchId: contract.branchId,
      stepOrder: 1,
      stepName: 'مراجعة أولية',
      status: 'pending',
      createdBy: req.user?.id,
    });
    res.json({ success: true, data: contract, message: 'تم رفع العقد للاعتماد' });
  } catch (err) {
    logger.error('submit approval error', err);
    res.status(500).json({ success: false, message: 'خطأ في رفع العقد' });
  }
});

// ─── Process approval decision ────────────────────────────────────────────────
router.post(
  '/contracts/:id/approvals/:approvalId/process',
  authorize(['admin', 'manager']),
  async (req, res) => {
    if (!validId(req, res)) return;
    try {
      const { decision, comments } = req.body;
      if (!decision || !['approved', 'rejected', 'return_for_revision'].includes(decision))
        return res.status(400).json({ success: false, message: 'القرار غير صالح' });
      const approval = await ContractApproval.findByIdAndUpdate(
        req.params.approvalId,
        {
          decision,
          comments,
          status: decision === 'approved' ? 'approved' : 'rejected',
          reviewedAt: new Date(),
          approverId: req.user?.id,
        },
        { new: true }
      ).lean();
      if (!approval)
        return res.status(404).json({ success: false, message: 'سجل الاعتماد غير موجود' });
      // Update contract status based on decision
      if (decision === 'rejected') {
        await Contract.findByIdAndUpdate(req.params.id, { status: 'DRAFT' });
      }
      res.json({ success: true, data: approval, message: 'تم تسجيل القرار' });
    } catch (err) {
      logger.error('process approval error', err);
      res.status(500).json({ success: false, message: 'خطأ في تسجيل القرار' });
    }
  }
);

// ─── Sign contract ────────────────────────────────────────────────────────────
router.post('/contracts/:id/sign', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const { partyId, signatureMethod, signatureData } = req.body;
    if (!partyId || !signatureMethod)
      return res.status(400).json({ success: false, message: 'بيانات التوقيع ناقصة' });
    const party = await ContractParty.findByIdAndUpdate(
      partyId,
      {
        signatureStatus: 'signed',
        signatureMethod,
        signatureDetails: signatureData,
        signedAt: new Date(),
        ipAddress: req.ip,
      },
      { new: true }
    ).lean();
    if (!party) return res.status(404).json({ success: false, message: 'الطرف غير موجود' });
    // Check if all parties signed
    const unsigned = await ContractParty.countDocuments({
      contractId: req.params.id,
      signatureStatus: { $ne: 'signed' },
    });
    if (unsigned === 0) {
      await Contract.findByIdAndUpdate(req.params.id, {
        status: 'ACTIVE',
        executionDate: new Date(),
      });
    }
    res.json({ success: true, data: party, message: 'تم التوقيع' });
  } catch (err) {
    logger.error('sign contract error', err);
    res.status(500).json({ success: false, message: 'خطأ في التوقيع' });
  }
});

// ─── Renew contract ───────────────────────────────────────────────────────────
router.post('/contracts/:id/renew', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    const months =
      req.body.months || contract.renewalTerms?.renewalPeriod?.replace(/[^0-9]/g, '') || 12;
    const newEnd = new Date(contract.endDate);
    newEnd.setMonth(newEnd.getMonth() + +months);
    contract.startDate = contract.endDate;
    contract.endDate = newEnd;
    contract.status = 'ACTIVE';
    contract.updatedBy = req.user?.id;
    await contract.save();
    res.json({ success: true, data: contract, message: 'تم تجديد العقد' });
  } catch (err) {
    logger.error('renew contract error', err);
    res.status(500).json({ success: false, message: 'خطأ في تجديد العقد' });
  }
});

// ─── Terminate contract ───────────────────────────────────────────────────────
router.post('/contracts/:id/terminate', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'سبب الإنهاء مطلوب' });
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { status: 'TERMINATED', notes: reason, updatedBy: req.user?.id },
      { new: true }
    ).lean();
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, data: contract, message: 'تم إنهاء العقد' });
  } catch (err) {
    logger.error('terminate contract error', err);
    res.status(500).json({ success: false, message: 'خطأ في إنهاء العقد' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT PARTIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/contracts/:id/parties', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const parties = await ContractParty.find({ contractId: req.params.id })
      .sort({ sortOrder: 1 })
      .lean();
    res.json({ success: true, data: parties });
  } catch (err) {
    logger.error('parties list error', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الأطراف' });
  }
});

router.post('/contracts/:id/parties', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const { nameAr, role, partyType } = req.body;
    if (!nameAr || !role || !partyType)
      return res.status(400).json({ success: false, message: 'الاسم، الدور، والنوع مطلوبة' });
    const party = await ContractParty.create({
      ...req.body,
      contractId: req.params.id,
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: party, message: 'تم إضافة الطرف' });
  } catch (err) {
    logger.error('party create error', err);
    res.status(500).json({ success: false, message: 'خطأ في إضافة الطرف' });
  }
});

router.delete(
  '/contracts/:id/parties/:partyId',
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const party = await ContractParty.findByIdAndDelete(req.params.partyId);
      if (!party) return res.status(404).json({ success: false, message: 'الطرف غير موجود' });
      res.json({ success: true, message: 'تم حذف الطرف' });
    } catch (err) {
      logger.error('party delete error', err);
      res.status(500).json({ success: false, message: 'خطأ في الحذف' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT AMENDMENTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/contracts/:id/amendments', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const amendments = await ContractAmendment.find({ contractId: req.params.id })
      .sort({ effectiveDate: -1 })
      .lean();
    res.json({ success: true, data: amendments });
  } catch (err) {
    logger.error('amendments list error', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الملاحق' });
  }
});

router.post('/contracts/:id/amendments', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const { title, type, description, effectiveDate } = req.body;
    if (!title || !type || !description || !effectiveDate)
      return res.status(400).json({ success: false, message: 'البيانات الأساسية مطلوبة' });
    const amendmentNumber = genAmendmentNumber();
    const amendment = await ContractAmendment.create({
      ...req.body,
      amendmentNumber,
      contractId: req.params.id,
      createdBy: req.user?.id,
    });
    // If extension — update contract endDate
    if (type === 'extension' && req.body.newEndDate) {
      await Contract.findByIdAndUpdate(req.params.id, { endDate: req.body.newEndDate });
    }
    res.status(201).json({ success: true, data: amendment, message: 'تم إضافة الملحق' });
  } catch (err) {
    logger.error('amendment create error', err);
    res.status(500).json({ success: false, message: 'خطأ في إضافة الملحق' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT NEGOTIATIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/contracts/:id/negotiations', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const { status, page = 1, limit: rawLimit = 20 } = req.query;
    const filter = { contractId: req.params.id };
    if (status) filter.status = status;
    const limit = clamp(rawLimit);
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      ContractNegotiation.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContractNegotiation.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit, total } });
  } catch (err) {
    logger.error('negotiations list error', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب سجل التفاوض' });
  }
});

router.post('/contracts/:id/negotiations', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const { action, content } = req.body;
    if (!action || !content)
      return res.status(400).json({ success: false, message: 'الإجراء والمحتوى مطلوبان' });
    const negotiation = await ContractNegotiation.create({
      ...req.body,
      contractId: req.params.id,
      userId: req.user?.id,
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: negotiation, message: 'تم تسجيل الملاحظة' });
  } catch (err) {
    logger.error('negotiation create error', err);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل الملاحظة' });
  }
});

router.patch(
  '/contracts/:id/negotiations/:negId/resolve',
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const neg = await ContractNegotiation.findByIdAndUpdate(
        req.params.negId,
        { status: 'resolved', resolvedBy: req.user?.id, resolvedAt: new Date() },
        { new: true }
      ).lean();
      if (!neg) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, data: neg, message: 'تم حل النقطة التفاوضية' });
    } catch (err) {
      logger.error('negotiation resolve error', err);
      res.status(500).json({ success: false, message: 'خطأ في تحديث السجل' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const soon30 = new Date(now.getTime() + 30 * 864e5);
    const soon7 = new Date(now.getTime() + 7 * 864e5);
    const [
      totalContracts,
      activeContracts,
      draftContracts,
      expiredContracts,
      expiringSoon30,
      expiringSoon7,
      pendingApprovals,
      pendingSignatures,
    ] = await Promise.all([
      Contract.countDocuments(),
      Contract.countDocuments({ status: 'ACTIVE' }),
      Contract.countDocuments({ status: 'DRAFT' }),
      Contract.countDocuments({ status: 'EXPIRED' }),
      Contract.countDocuments({ status: 'ACTIVE', endDate: { $gte: now, $lte: soon30 } }),
      Contract.countDocuments({ status: 'ACTIVE', endDate: { $gte: now, $lte: soon7 } }),
      ContractApproval.countDocuments({ status: 'pending' }),
      ContractParty.countDocuments({ signatureStatus: 'pending' }),
    ]);
    const recentByType = await Contract.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: '$contractType', count: { $sum: 1 } } },
    ]);
    res.json({
      success: true,
      data: {
        totalContracts,
        activeContracts,
        draftContracts,
        expiredContracts,
        expiringSoon30,
        expiringSoon7,
        pendingApprovals,
        pendingSignatures,
        byType: recentByType.reduce((acc, cur) => {
          acc[cur._id || 'unknown'] = cur.count;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    logger.error('dashboard error', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب لوحة التحكم' });
  }
});

// ─── Expiring soon list ───────────────────────────────────────────────────────
router.get('/expiring-soon', async (req, res) => {
  try {
    const days = Math.max(1, Math.min(parseInt(req.query.days) || 30, 365));
    const now = new Date();
    const future = new Date(now.getTime() + days * 864e5);
    const contracts = await Contract.find({
      status: 'ACTIVE',
      endDate: { $gte: now, $lte: future },
    })
      .sort({ endDate: 1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: contracts, count: contracts.length });
  } catch (err) {
    logger.error('expiring soon error', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب العقود المنتهية قريباً' });
  }
});

module.exports = router;
