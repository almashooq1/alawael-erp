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
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const {
  assertBeneficiaryInScope,
  fetchScopedByBeneficiary,
} = require('../utils/beneficiaryBranchGate');
const Beneficiary = require('../models/Beneficiary');
const logger = require('../utils/logger');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const { body, param, validationResult } = require('express-validator');
const safeError = require('../utils/safeError');

/** Reusable validation-error handler */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
  }
  next();
};

// ── Shared validators ────────────────────────────────────────────────────
const mongoId = field => param(field).isMongoId().withMessage(`${field} غير صالح`);
const reqMongoId = field => body(field).isMongoId().withMessage(`${field} مطلوب وصالح`);
const reqString = (field, label) => body(field).trim().notEmpty().withMessage(`${label} مطلوب`);
const _optNumber = (field, label) =>
  body(field).optional().isNumeric().withMessage(`${label} يجب أن يكون رقماً`);

async function beneficiaryIdsInScope(req) {
  const scope = branchFilter(req);
  if (!Object.keys(scope).length) return null;
  const rows = await Beneficiary.find(scope).select('_id').lean();
  return rows.map(r => r._id);
}

async function applyBeneficiaryListScope(req, filter) {
  const ids = await beneficiaryIdsInScope(req);
  if (!ids) return filter;
  if (filter.beneficiary) {
    const bid = String(filter.beneficiary);
    if (!ids.some(id => String(id) === bid)) return { ...filter, beneficiary: { $in: [] } };
    return filter;
  }
  return { ...filter, beneficiary: { $in: ids } };
}

function normalizeCategory(category) {
  const map = {
    therapy: 'therapy_session',
    consultation: 'consultation',
    diagnostic: 'diagnostic',
    laboratory: 'laboratory',
    radiology: 'radiology',
    pharmacy: 'pharmacy',
    procedure: 'surgical',
  };
  return map[category] || category || 'other';
}

function computeClaimPrecheck({ claim, items, contract, preAuth, now = new Date() }) {
  const blockers = [];
  const warnings = [];

  if (!Array.isArray(items) || items.length === 0) {
    blockers.push({
      code: 'CLAIM_NO_ITEMS',
      severity: 'critical',
      message: 'المطالبة لا تحتوي على بنود',
    });
  }

  const totalFromItems = (items || []).reduce((sum, i) => sum + (Number(i.totalNet) || 0), 0);
  const totalNet = Number(claim.totalNet) || 0;
  if (Math.abs(totalFromItems - totalNet) > 1) {
    warnings.push({
      code: 'CLAIM_TOTAL_MISMATCH',
      severity: 'warning',
      message: 'إجمالي البنود لا يطابق إجمالي المطالبة',
      details: { claimTotalNet: totalNet, itemsTotalNet: totalFromItems },
    });
  }

  const principalDx = (claim.diagnosis || []).some(d => d?.type === 'principal' && d?.code);
  if (!principalDx) {
    blockers.push({
      code: 'CLAIM_MISSING_PRINCIPAL_DIAGNOSIS',
      severity: 'critical',
      message: 'التشخيص الرئيسي (principal diagnosis) مطلوب قبل الإرسال',
    });
  }

  const missingCodes = (items || []).filter(i => !i?.serviceCode);
  if (missingCodes.length > 0) {
    blockers.push({
      code: 'CLAIM_ITEMS_MISSING_SERVICE_CODE',
      severity: 'critical',
      message: 'بعض البنود لا تحتوي على رمز خدمة',
      details: { count: missingCodes.length },
    });
  }

  if (!claim.membershipNumber) {
    warnings.push({
      code: 'CLAIM_MEMBERSHIP_NUMBER_MISSING',
      severity: 'warning',
      message: 'رقم عضوية التأمين غير مضاف',
    });
  }

  if (!contract || contract.isDeleted) {
    blockers.push({
      code: 'CLAIM_CONTRACT_NOT_FOUND',
      severity: 'critical',
      message: 'عقد التأمين غير موجود أو محذوف',
    });
  } else {
    if (contract.status !== 'active') {
      blockers.push({
        code: 'CLAIM_CONTRACT_NOT_ACTIVE',
        severity: 'critical',
        message: 'عقد التأمين غير نشط',
      });
    }
    if (
      contract.startDate &&
      claim.visitDate &&
      new Date(claim.visitDate) < new Date(contract.startDate)
    ) {
      blockers.push({
        code: 'CLAIM_VISIT_BEFORE_CONTRACT',
        severity: 'critical',
        message: 'تاريخ الخدمة قبل بداية العقد',
      });
    }
    if (
      contract.endDate &&
      claim.visitDate &&
      new Date(claim.visitDate) > new Date(contract.endDate)
    ) {
      blockers.push({
        code: 'CLAIM_VISIT_AFTER_CONTRACT',
        severity: 'critical',
        message: 'تاريخ الخدمة بعد انتهاء العقد',
      });
    }
  }

  const requiredPreAuth = new Set(
    (contract?.coveredServices || [])
      .filter(s => s?.requiresPreAuth)
      .map(s => s?.serviceCategory)
      .filter(Boolean)
  );
  const itemCategories = new Set((items || []).map(i => normalizeCategory(i?.category)));
  const requiresPreAuthForClaim = Array.from(itemCategories).some(c => requiredPreAuth.has(c));
  if (requiresPreAuthForClaim) {
    if (!preAuth) {
      blockers.push({
        code: 'CLAIM_PREAUTH_REQUIRED',
        severity: 'critical',
        message: 'هذه المطالبة تتطلب موافقة مسبقة معتمدة',
      });
    } else {
      const statusOk = ['approved', 'partially_approved'].includes(preAuth.status);
      if (!statusOk) {
        blockers.push({
          code: 'CLAIM_PREAUTH_NOT_APPROVED',
          severity: 'critical',
          message: 'الموافقة المسبقة غير معتمدة',
        });
      }
      if (preAuth.approvalDetails?.validTo && new Date(preAuth.approvalDetails.validTo) < now) {
        blockers.push({
          code: 'CLAIM_PREAUTH_EXPIRED',
          severity: 'critical',
          message: 'الموافقة المسبقة منتهية',
        });
      }
    }
  }

  return {
    readyToSubmit: blockers.length === 0,
    blockers,
    warnings,
    riskScore: blockers.length * 30 + warnings.length * 10,
  };
}

async function runClaimPrecheck(claim, now = new Date()) {
  const [items, contract, preAuth] = await Promise.all([
    ClaimItem.find({ claim: claim._id, isDeleted: { $ne: true } }).lean(),
    InsuranceContract.findById(claim.contract).lean(),
    claim.preAuthorization ? PreAuthorization.findById(claim.preAuthorization).lean() : null,
  ]);
  return computeClaimPrecheck({ claim, items, contract, preAuth, now });
}

// ── Auth: all insurance routes require authentication ────────────────────
router.use(authenticate);
router.use(requireBranchAccess);
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
        { contractNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { 'name.ar': { $regex: escapeRegex(search), $options: 'i' } },
        { 'name.en': { $regex: escapeRegex(search), $options: 'i' } },
        { 'insuranceCompany.name.ar': { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [contracts, total] = await Promise.all([
      InsuranceContract.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip),
      InsuranceContract.countDocuments(filter),
    ]);
    res.json({ success: true, data: contracts, total });
  } catch (error) {
    safeError(res, error, '[InsuranceClaims] List contracts error');
  }
});

router.get('/contracts/:id', [mongoId('id'), validate], async (req, res) => {
  try {
    const contract = await InsuranceContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, data: contract });
  } catch (error) {
    safeError(res, error, '[InsuranceClaims] Get contract error');
  }
});

router.post(
  '/contracts',
  [
    reqString('type', 'نوع العقد'),
    body('startDate').isISO8601().withMessage('تاريخ البداية مطلوب'),
    body('endDate').isISO8601().withMessage('تاريخ الانتهاء مطلوب'),
    validate,
  ],
  async (req, res) => {
    try {
      const contract = new InsuranceContract({ ...req.body, createdBy: req.user?.id });
      await contract.save();
      logger.info(`[InsuranceClaims] Contract created: ${contract.contractNumber}`);
      res.status(201).json({ success: true, data: contract });
    } catch (error) {
      logger.error('[InsuranceClaims] Create contract error:', { message: error.message });
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إنشاء العقد', error: safeError(error) });
    }
  }
);

router.put('/contracts/:id', [mongoId('id'), validate], async (req, res) => {
  try {
    const contract = await InsuranceContract.findByIdAndUpdate(
      req.params.id,
      stripUpdateMeta(req.body),
      { returnDocument: 'after', runValidators: true }
    );
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, data: contract });
  } catch (error) {
    logger.error('[InsuranceClaims] Update contract error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث العقد', error: safeError(error) });
  }
});

router.delete('/contracts/:id', [mongoId('id'), validate], async (req, res) => {
  try {
    await InsuranceContract.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'تم حذف العقد بنجاح' });
  } catch (error) {
    safeError(res, error, '[InsuranceClaims] Delete contract error');
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
      .json({ success: false, message: 'خطأ في جلب العقود المنتهية', error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PRE-AUTHORIZATION — الموافقة المسبقة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/pre-auth', async (req, res) => {
  try {
    const { beneficiary, contract, status, urgency, page = 1, limit = 20 } = req.query;
    let filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (contract) filter.contract = contract;
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    filter = await applyBeneficiaryListScope(req, filter);
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
      .json({ success: false, message: 'خطأ في جلب الموافقات المسبقة', error: safeError(error) });
  }
});

router.get('/pre-auth/:id', async (req, res) => {
  try {
    const { doc: preAuth, denied } = await fetchScopedByBeneficiary(
      PreAuthorization,
      req.params.id,
      req,
      res,
      {
        populate: [
          { path: 'beneficiary', select: 'name' },
          { path: 'contract', select: 'contractNumber name' },
        ],
      }
    );
    if (denied) return;
    res.json({ success: true, data: preAuth });
  } catch (error) {
    logger.error('[InsuranceClaims] Get pre-auth error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الموافقة المسبقة', error: safeError(error) });
  }
});

router.post(
  '/pre-auth',
  [
    reqMongoId('beneficiary'),
    reqMongoId('contract'),
    reqString('urgency', 'درجة الاستعجال'),
    validate,
  ],
  async (req, res) => {
    try {
      const denied = await assertBeneficiaryInScope(req, req.body?.beneficiary, res);
      if (denied) return;
      const preAuth = new PreAuthorization({ ...req.body, requestedBy: req.user?.id });
      await preAuth.save();
      logger.info(`[InsuranceClaims] Pre-auth created: ${preAuth.preAuthNumber}`);
      res.status(201).json({ success: true, data: preAuth });
    } catch (error) {
      safeError(res, error, '[InsuranceClaims] Create pre-auth error');
    }
  }
);

router.patch('/pre-auth/:id/approve', [mongoId('id'), validate], async (req, res) => {
  try {
    const { doc: scoped, denied } = await fetchScopedByBeneficiary(
      PreAuthorization,
      req.params.id,
      req,
      res,
      { select: 'beneficiary', lean: true }
    );
    if (denied) return;
    const preAuth = await PreAuthorization.findByIdAndUpdate(
      scoped._id,
      {
        status: 'approved',
        approvalDetails: {
          ...req.body,
          approvedDate: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    if (!preAuth)
      return res.status(404).json({ success: false, message: 'الموافقة المسبقة غير موجودة' });
    logger.info(`[InsuranceClaims] Pre-auth approved: ${preAuth.preAuthNumber}`);
    res.json({ success: true, data: preAuth, message: 'تمت الموافقة بنجاح' });
  } catch (error) {
    safeError(res, error, '[InsuranceClaims] Approve pre-auth error');
  }
});

router.patch(
  '/pre-auth/:id/deny',
  [mongoId('id'), reqString('reason', 'سبب الرفض'), validate],
  async (req, res) => {
    try {
      const { doc: scoped, denied } = await fetchScopedByBeneficiary(
        PreAuthorization,
        req.params.id,
        req,
        res,
        { select: 'beneficiary', lean: true }
      );
      if (denied) return;
      const preAuth = await PreAuthorization.findByIdAndUpdate(
        scoped._id,
        { status: 'denied', denialReason: req.body.reason },
        { returnDocument: 'after' }
      );
      if (!preAuth)
        return res.status(404).json({ success: false, message: 'الموافقة المسبقة غير موجودة' });
      logger.info(`[InsuranceClaims] Pre-auth denied: ${preAuth.preAuthNumber}`);
      res.json({ success: true, data: preAuth });
    } catch (error) {
      safeError(res, error, '[InsuranceClaims] Deny pre-auth error');
    }
  }
);

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
    let filter = { isDeleted: { $ne: true } };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (contract) filter.contract = contract;
    if (status) filter.status = status;
    if (claimType) filter.claimType = claimType;
    if (search) {
      filter.$or = [{ claimNumber: { $regex: escapeRegex(search), $options: 'i' } }];
    }
    if (dateFrom || dateTo) {
      filter.visitDate = {};
      if (dateFrom) filter.visitDate.$gte = new Date(dateFrom);
      if (dateTo) filter.visitDate.$lte = new Date(dateTo);
    }
    filter = await applyBeneficiaryListScope(req, filter);
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
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب المطالبات', error: safeError(error) });
  }
});

router.get('/claims/:id', async (req, res) => {
  try {
    const { doc: claim, denied } = await fetchScopedByBeneficiary(
      InsuranceClaim,
      req.params.id,
      req,
      res,
      {
        populate: [
          { path: 'beneficiary', select: 'name' },
          { path: 'contract', select: 'contractNumber name insuranceCompany' },
          { path: 'preAuthorization', select: 'preAuthNumber status' },
        ],
      }
    );
    if (denied) return;

    const items = await ClaimItem.find({ claim: claim._id, isDeleted: { $ne: true } }).sort({
      sequence: 1,
    });
    res.json({ success: true, data: { ...claim.toObject(), items } });
  } catch (error) {
    logger.error('[InsuranceClaims] Get claim error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب المطالبة', error: safeError(error) });
  }
});

router.get('/claims/:id/denial-precheck', async (req, res) => {
  try {
    const { doc: claim, denied } = await fetchScopedByBeneficiary(
      InsuranceClaim,
      req.params.id,
      req,
      res
    );
    if (denied) return;

    const result = await runClaimPrecheck(claim);
    return res.json({ success: true, data: result });
  } catch (error) {
    return safeError(res, error, '[InsuranceClaims] denial-precheck error');
  }
});

router.post(
  '/claims',
  [
    reqMongoId('beneficiary'),
    reqMongoId('contract'),
    reqString('claimType', 'نوع المطالبة'),
    validate,
  ],
  async (req, res) => {
    try {
      const denied = await assertBeneficiaryInScope(req, req.body?.beneficiary, res);
      if (denied) return;
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
        .json({ success: false, message: 'خطأ في إنشاء المطالبة', error: safeError(error) });
    }
  }
);

// Fields a PUT may edit. Money (total*/share), lifecycle (status/submission*/
// adjudication/payment/resubmission/nphiesData) and identity (beneficiary/
// contract/claimNumber) are intentionally EXCLUDED — those move only through
// /submit, /adjudicate and item totals. stripUpdateMeta did NOT strip them, so
// the old PUT let any in-branch user forge status:'paid' + payment.amount
// (money fabrication + state-machine bypass).
const CLAIM_UPDATABLE = [
  'claimType',
  'priority',
  'membershipNumber',
  'visitDate',
  'admissionDate',
  'dischargeDate',
  'provider',
  'diagnosis',
  'procedures',
  'preAuthorization',
  'attachments',
  'notes',
];

router.put('/claims/:id', async (req, res) => {
  try {
    const { doc: scoped, denied } = await fetchScopedByBeneficiary(
      InsuranceClaim,
      req.params.id,
      req,
      res,
      { select: 'beneficiary', lean: true }
    );
    if (denied) return;
    const body = {};
    for (const k of CLAIM_UPDATABLE) if (k in req.body) body[k] = req.body[k];
    const claim = await InsuranceClaim.findByIdAndUpdate(scoped._id, body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });
    res.json({ success: true, data: claim });
  } catch (error) {
    logger.error('[InsuranceClaims] Update claim error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث المطالبة', error: safeError(error) });
  }
});

// Submit claim
router.patch('/claims/:id/submit', async (req, res) => {
  try {
    const { doc: claim, denied } = await fetchScopedByBeneficiary(
      InsuranceClaim,
      req.params.id,
      req,
      res
    );
    if (denied) return;
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

    const precheck = await runClaimPrecheck(claim);
    if (!precheck.readyToSubmit) {
      return res.status(409).json({
        success: false,
        message: 'تعذر إرسال المطالبة بسبب أخطاء تمنع الإرسال',
        precheck,
      });
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
      .json({ success: false, message: 'خطأ في إرسال المطالبة', error: safeError(error) });
  }
});

// Adjudicate claim
router.patch(
  '/claims/:id/adjudicate',
  [
    mongoId('id'),
    body('approvedAmount').isFloat({ min: 0 }).withMessage('المبلغ المعتمد يجب أن يكون رقماً غير سالب'),
    body('deniedAmount').optional().isFloat({ min: 0 }),
    body('adjustmentAmount').optional().isFloat({ min: 0 }),
    validate,
  ],
  async (req, res) => {
    try {
      const { approvedAmount, deniedAmount, adjustmentAmount, denialReasons } = req.body;
      const { doc: claim, denied } = await fetchScopedByBeneficiary(
        InsuranceClaim,
        req.params.id,
        req,
        res
      );
      if (denied) return;

      // state-machine guard: only an in-flight claim may be adjudicated — block
      // adjudicating an un-submitted draft or RE-adjudicating a settled claim
      // (paid/cancelled/voided), which would overwrite a finalized adjudication
      // and corrupt reconciliation.
      const NON_ADJUDICABLE = ['draft', 'paid', 'partially_paid', 'cancelled', 'voided'];
      if (NON_ADJUDICABLE.includes(claim.status)) {
        return res
          .status(409)
          .json({ success: false, message: `لا يمكن تسوية مطالبة بحالة "${claim.status}"` });
      }
      // approved amount cannot exceed the claim's net (over-approval).
      if (Number(approvedAmount) > claim.totalNet) {
        return res.status(400).json({
          success: false,
          message: 'المبلغ المعتمد لا يمكن أن يتجاوز صافي المطالبة',
        });
      }

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
        .json({ success: false, message: 'خطأ في معالجة المطالبة', error: safeError(error) });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CLAIM ITEMS — بنود المطالبة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/claim-items/:claimId', async (req, res) => {
  try {
    const { denied } = await fetchScopedByBeneficiary(
      InsuranceClaim,
      req.params.claimId,
      req,
      res,
      { select: '_id', lean: true }
    );
    if (denied) return;
    const items = await ClaimItem.find({
      claim: req.params.claimId,
      isDeleted: { $ne: true },
    }).sort({ sequence: 1 });
    res.json({ success: true, data: items });
  } catch (error) {
    logger.error('[InsuranceClaims] List claim items error:', { message: error.message });
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب بنود المطالبة', error: safeError(error) });
  }
});

router.post(
  '/claim-items',
  [
    reqMongoId('claim'),
    body('unitPrice').isNumeric().withMessage('سعر الوحدة مطلوب'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('الكمية يجب أن تكون رقم صحيح'),
    validate,
  ],
  async (req, res) => {
    try {
      const { denied } = await fetchScopedByBeneficiary(InsuranceClaim, req.body.claim, req, res, {
        select: '_id',
        lean: true,
      });
      if (denied) return;
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
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إضافة البند', error: safeError(error) });
    }
  }
);

router.delete('/claim-items/:id', [mongoId('id'), validate], async (req, res) => {
  try {
    const item = await ClaimItem.findById(req.params.id).select('claim isDeleted');
    if (!item) return res.status(404).json({ success: false, message: 'البند غير موجود' });
    // a claim item has no branch — its tenant is the parent claim's beneficiary;
    // verify the caller may touch that beneficiary before mutating (was a
    // cross-tenant IDOR: any in-branch user could soft-delete another tenant's
    // claim line item by id, tampering with foreign claim totals/PHI).
    const claim = await InsuranceClaim.findById(item.claim).select('beneficiary');
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });
    const denied = await assertBeneficiaryInScope(req, claim.beneficiary, res);
    if (denied) return;

    item.isDeleted = true;
    await item.save();

    // keep the parent claim's totals consistent after removing a line item
    const allItems = await ClaimItem.find({ claim: item.claim, isDeleted: { $ne: true } });
    const totalNet = allItems.reduce((sum, i) => sum + (i.totalNet || 0), 0);
    const totalDiscount = allItems.reduce((sum, i) => sum + (i.discount || 0), 0);
    await InsuranceClaim.findByIdAndUpdate(item.claim, {
      totalGross: totalNet + totalDiscount,
      totalNet,
      totalDiscount,
    });

    res.json({ success: true, message: 'تم حذف البند بنجاح' });
  } catch (error) {
    safeError(res, error, '[InsuranceClaims] Delete claim item error');
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
    res
      .status(500)
      .json({ success: false, message: 'خطأ في لوحة التحكم', error: safeError(error) });
  }
});

module.exports = router;
