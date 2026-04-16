/**
 * Smart Insurance Routes — System 40
 * نظام التأمين الذكي: NPHIES, أهلية التأمين, المطالبات, الموافقات المسبقة
 *
 * Endpoints:
 *   GET    /api/smart-insurance/stats                        — إحصائيات
 *   GET    /api/smart-insurance/companies                    — شركات التأمين
 *   POST   /api/smart-insurance/companies                    — إضافة شركة تأمين
 *   PUT    /api/smart-insurance/companies/:id                — تعديل شركة تأمين
 *   GET    /api/smart-insurance/policies                     — قائمة الوثائق
 *   POST   /api/smart-insurance/policies                     — إضافة وثيقة
 *   GET    /api/smart-insurance/policies/:id                 — تفاصيل وثيقة
 *   PUT    /api/smart-insurance/policies/:id                 — تعديل وثيقة
 *   DELETE /api/smart-insurance/policies/:id                 — حذف وثيقة
 *   POST   /api/smart-insurance/policies/:id/check-eligibility — فحص الأهلية
 *   POST   /api/smart-insurance/policies/:id/calculate-copay   — حساب حصة المريض
 *   GET    /api/smart-insurance/policies/expiring            — وثائق تنتهي قريباً
 *   GET    /api/smart-insurance/claims                       — قائمة المطالبات
 *   POST   /api/smart-insurance/claims                       — تقديم مطالبة
 *   GET    /api/smart-insurance/claims/:id                   — تفاصيل مطالبة
 *   PATCH  /api/smart-insurance/claims/:id/adjudicate        — تسوية مطالبة
 *   GET    /api/smart-insurance/claims/rejection-analytics   — تحليلات الرفض
 *   GET    /api/smart-insurance/prior-auth                   — الموافقات المسبقة
 *   POST   /api/smart-insurance/prior-auth                   — طلب موافقة مسبقة
 *   GET    /api/smart-insurance/prior-auth/:id               — تفاصيل موافقة مسبقة
 *   GET    /api/smart-insurance/eligibility-checks           — سجل فحوصات الأهلية
 */

'use strict';

const router = require('express').Router();
const smartInsuranceService = require('../services/smartInsurance.service');
const InsuranceCompany = require('../models/InsuranceCompany');
const InsurancePolicy = require('../models/InsurancePolicy');
const InsuranceClaim = require('../models/InsuranceClaim');
const PriorAuthorization = require('../models/PriorAuthorization');
const InsuranceEligibilityCheck = require('../models/InsuranceEligibilityCheck');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const escapeRegex = require('../utils/escapeRegex');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Auth على جميع المسارات ────────────────────────────────────────────────────
router.use(authenticate);
router.use(requireBranchAccess);
// ══════════════════════════════════════════════════════════════════════════════
// STATS — الإحصائيات
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /stats
 * إحصائيات لوحة تحكم التأمين
 */
router.get(
  '/stats',
  authorize(['admin', 'finance', 'manager', 'insurance_officer']),
  wrap(async (req, res) => {
    const branchId = req.query.branch_id || req.user.branchId;
    const data = await smartInsuranceService.getStats(branchId);
    res.json({ success: true, data });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE COMPANIES — شركات التأمين
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /companies
 * قائمة شركات التأمين
 */
router.get(
  '/companies',
  wrap(async (req, res) => {
    const query = { deletedAt: null };
    if (req.query.active === 'true') query.isActive = true;
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(escapeRegex(req.query.search), 'i') },
        { nameAr: new RegExp(escapeRegex(req.query.search), 'i') },
        { code: new RegExp(escapeRegex(req.query.search), 'i') },
      ];
    }
    const companies = await InsuranceCompany.find(query).sort({ nameAr: 1 }).lean();
    res.json({ success: true, data: companies });
  })
);

/**
 * POST /companies
 * إضافة شركة تأمين جديدة
 */
router.post(
  '/companies',
  authorize(['admin']),
  wrap(async (req, res) => {
    const company = await InsuranceCompany.create({
      ...req.body,
      branchId: req.user.branchId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: company });
  })
);

/**
 * PUT /companies/:id
 * تعديل شركة تأمين
 */
router.put(
  '/companies/:id',
  authorize(['admin']),
  wrap(async (req, res) => {
    const company = await InsuranceCompany.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!company)
      return res.status(404).json({ success: false, message: 'شركة التأمين غير موجودة' });
    res.json({ success: true, data: company });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE POLICIES — وثائق التأمين
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /policies/expiring
 * وثائق التأمين التي تنتهي قريباً
 */
router.get(
  '/policies/expiring',
  authorize(['admin', 'finance', 'manager', 'insurance_officer']),
  wrap(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const branchId = req.query.branch_id || req.user.branchId;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const policies = await InsurancePolicy.find({
      branchId,
      status: 'active',
      endDate: { $gte: new Date(), $lte: cutoff },
      deletedAt: null,
    })
      .populate('beneficiaryId', 'name nationalId phone')
      .populate('insuranceCompanyId', 'nameAr code')
      .sort({ endDate: 1 })
      .lean();

    res.json({ success: true, data: policies, count: policies.length });
  })
);

/**
 * GET /policies
 * قائمة وثائق التأمين
 */
router.get(
  '/policies',
  authorize(['admin', 'finance', 'manager', 'insurance_officer', 'therapist']),
  wrap(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 15;
    const query = { deletedAt: null };

    if (req.query.branch_id) query.branchId = req.query.branch_id;
    else if (req.user.branchId) query.branchId = req.user.branchId;

    if (req.query.status) query.status = req.query.status;
    if (req.query.beneficiary_id) query.beneficiaryId = req.query.beneficiary_id;
    if (req.query.company_id) query.insuranceCompanyId = req.query.company_id;
    if (req.query.search) {
      query.$or = [
        { policyNumber: new RegExp(escapeRegex(req.query.search), 'i') },
        { memberId: new RegExp(escapeRegex(req.query.search), 'i') },
      ];
    }

    const [docs, total] = await Promise.all([
      InsurancePolicy.find(query)
        .populate('beneficiaryId', 'name nationalId')
        .populate('insuranceCompanyId', 'nameAr code')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InsurancePolicy.countDocuments(query),
    ]);
    res.json({ success: true, docs, total, page, pages: Math.ceil(total / limit) });
  })
);

/**
 * POST /policies
 * إضافة وثيقة تأمين جديدة
 */
router.post(
  '/policies',
  authorize(['admin', 'finance', 'insurance_officer']),
  wrap(async (req, res) => {
    const { beneficiary_id, insurance_company_id, policy_number, member_id, ...rest } = req.body;

    if (!beneficiary_id || !insurance_company_id || !policy_number || !member_id) {
      return res.status(400).json({
        success: false,
        message: 'beneficiary_id و insurance_company_id و policy_number و member_id مطلوبة',
      });
    }

    const policy = await InsurancePolicy.create({
      beneficiaryId: beneficiary_id,
      insuranceCompanyId: insurance_company_id,
      policyNumber: policy_number,
      memberId: member_id,
      ...rest,
      branchId: req.user.branchId,
      createdBy: req.user._id,
      policyUuid: require('crypto').randomUUID(),
    });
    res.status(201).json({ success: true, data: policy });
  })
);

/**
 * GET /policies/:id
 * تفاصيل وثيقة تأمين
 */
router.get(
  '/policies/:id',
  wrap(async (req, res) => {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, deletedAt: null })
      .populate('beneficiaryId', 'name nationalId phone birthDate')
      .populate('insuranceCompanyId')
      .lean();
    if (!policy) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });
    res.json({ success: true, data: policy });
  })
);

/**
 * PUT /policies/:id
 * تعديل وثيقة تأمين
 */
router.put(
  '/policies/:id',
  authorize(['admin', 'finance', 'insurance_officer']),
  wrap(async (req, res) => {
    const policy = await InsurancePolicy.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ success: false, message: 'الوثيقة غير موجودة' });
    res.json({ success: true, data: policy });
  })
);

/**
 * DELETE /policies/:id
 * حذف وثيقة تأمين (soft delete)
 */
router.delete(
  '/policies/:id',
  authorize(['admin']),
  wrap(async (req, res) => {
    await InsurancePolicy.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
      status: 'cancelled',
      updatedBy: req.user._id,
    });
    res.json({ success: true, message: 'تم حذف الوثيقة بنجاح' });
  })
);

/**
 * POST /policies/:id/check-eligibility
 * فحص أهلية التأمين عبر NPHIES
 */
router.post(
  '/policies/:id/check-eligibility',
  wrap(async (req, res) => {
    const result = await smartInsuranceService.checkEligibility(req.params.id, {
      checkType: req.body.service_type || 'general',
      serviceCode: req.body.service_code,
      branchId: req.user.branchId,
      userId: req.user._id,
    });
    res.json({ success: true, data: result });
  })
);

/**
 * POST /policies/:id/calculate-copay
 * حساب حصة المريض (المشاركة والخصم)
 */
router.post(
  '/policies/:id/calculate-copay',
  wrap(async (req, res) => {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: 'amount مطلوب ويجب أن يكون أكبر من 0' });
    }
    const result = await smartInsuranceService.calculateCopay(req.params.id, parseFloat(amount));
    res.json({ success: true, data: result });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE CLAIMS — المطالبات التأمينية
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /claims/rejection-analytics
 * تحليلات أسباب رفض المطالبات
 */
router.get(
  '/claims/rejection-analytics',
  authorize(['admin', 'finance', 'manager', 'insurance_officer']),
  wrap(async (req, res) => {
    const { date_from, date_to, branch_id } = req.query;
    if (!date_from || !date_to) {
      return res.status(400).json({ success: false, message: 'date_from و date_to مطلوبان' });
    }
    const branchId = branch_id || req.user.branchId;
    const data = await smartInsuranceService.getRejectionAnalytics(branchId, date_from, date_to);
    res.json({ success: true, data });
  })
);

/**
 * GET /claims
 * قائمة المطالبات التأمينية
 */
router.get(
  '/claims',
  authorize(['admin', 'finance', 'manager', 'insurance_officer']),
  wrap(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 15;
    const query = { deletedAt: null };

    if (req.query.branch_id) query.branchId = req.query.branch_id;
    else if (req.user.branchId) query.branchId = req.user.branchId;

    if (req.query.status) query.status = req.query.status;
    if (req.query.policy_id) query.policyId = req.query.policy_id;
    if (req.query.beneficiary_id) query.beneficiaryId = req.query.beneficiary_id;
    if (req.query.date_from || req.query.date_to) {
      query.createdAt = {};
      if (req.query.date_from) query.createdAt.$gte = new Date(req.query.date_from);
      if (req.query.date_to) query.createdAt.$lte = new Date(req.query.date_to + 'T23:59:59');
    }

    const [docs, total] = await Promise.all([
      InsuranceClaim.find(query)
        .populate('policyId', 'policyNumber memberId')
        .populate('beneficiaryId', 'name nationalId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InsuranceClaim.countDocuments(query),
    ]);
    res.json({ success: true, docs, total, page, pages: Math.ceil(total / limit) });
  })
);

/**
 * POST /claims
 * تقديم مطالبة تأمينية عبر NPHIES
 */
router.post(
  '/claims',
  authorize(['admin', 'finance', 'insurance_officer']),
  wrap(async (req, res) => {
    const { policy_id, billed_amount, claim_type, diagnosis_codes, line_items } = req.body;

    if (!policy_id || !billed_amount || !claim_type || !diagnosis_codes || !line_items) {
      return res.status(400).json({
        success: false,
        message: 'policy_id, billed_amount, claim_type, diagnosis_codes, line_items مطلوبة',
      });
    }

    const claim = await smartInsuranceService.submitClaim({
      policyId: policy_id,
      billedAmount: parseFloat(billed_amount),
      claimType: claim_type,
      diagnosisCodes: diagnosis_codes,
      procedureCodes: req.body.procedure_codes || [],
      lineItems: line_items,
      serviceSessionId: req.body.service_session_id || null,
      priorAuthId: req.body.prior_auth_id || null,
      notes: req.body.notes || '',
      branchId: req.user.branchId,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data: claim, message: 'تم تقديم المطالبة بنجاح' });
  })
);

/**
 * GET /claims/:id
 * تفاصيل مطالبة
 */
router.get(
  '/claims/:id',
  wrap(async (req, res) => {
    const claim = await InsuranceClaim.findOne({ _id: req.params.id, deletedAt: null })
      .populate('policyId')
      .populate('beneficiaryId', 'name nationalId phone')
      .populate('priorAuthId', 'authNumber status validFrom validUntil')
      .lean();
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });
    res.json({ success: true, data: claim });
  })
);

/**
 * PATCH /claims/:id/adjudicate
 * تسوية مطالبة (تحديث نتيجة القرار)
 */
router.patch(
  '/claims/:id/adjudicate',
  authorize(['admin', 'finance', 'insurance_officer']),
  wrap(async (req, res) => {
    const {
      approved_amount,
      patient_share,
      insurance_share,
      status,
      rejection_reason,
      rejection_code,
    } = req.body;

    const claim = await InsuranceClaim.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      {
        approvedAmount: approved_amount || 0,
        patientShare: patient_share || 0,
        insuranceShare: insurance_share || 0,
        status: status || 'approved',
        rejectionReason: rejection_reason || null,
        rejectionCode: rejection_code || null,
        adjudicatedAt: new Date(),
        updatedBy: req.user._id,
      },
      { new: true }
    );
    if (!claim) return res.status(404).json({ success: false, message: 'المطالبة غير موجودة' });
    res.json({ success: true, data: claim, message: 'تم تحديث حالة المطالبة' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// PRIOR AUTHORIZATIONS — الموافقات المسبقة
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /prior-auth
 * قائمة طلبات الموافقة المسبقة
 */
router.get(
  '/prior-auth',
  authorize(['admin', 'finance', 'manager', 'insurance_officer', 'therapist']),
  wrap(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 15;
    const query = { deletedAt: null };

    if (req.query.branch_id) query.branchId = req.query.branch_id;
    else if (req.user.branchId) query.branchId = req.user.branchId;

    if (req.query.status) query.status = req.query.status;
    if (req.query.policy_id) query.policyId = req.query.policy_id;

    const [docs, total] = await Promise.all([
      PriorAuthorization.find(query)
        .populate('policyId', 'policyNumber memberId')
        .populate('beneficiaryId', 'name nationalId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PriorAuthorization.countDocuments(query),
    ]);
    res.json({ success: true, docs, total, page, pages: Math.ceil(total / limit) });
  })
);

/**
 * POST /prior-auth
 * تقديم طلب موافقة مسبقة عبر NPHIES
 */
router.post(
  '/prior-auth',
  authorize(['admin', 'finance', 'insurance_officer', 'therapist']),
  wrap(async (req, res) => {
    const { policy_id, service_type, clinical_justification, requested_services } = req.body;

    if (!policy_id || !service_type || !clinical_justification || !requested_services) {
      return res.status(400).json({
        success: false,
        message: 'policy_id, service_type, clinical_justification, requested_services مطلوبة',
      });
    }
    if (clinical_justification.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'المبرر السريري يجب أن يكون 20 حرف على الأقل',
      });
    }

    const pa = await smartInsuranceService.submitPriorAuthorization({
      policyId: policy_id,
      serviceType: service_type,
      clinicalJustification: clinical_justification,
      requestedServices: requested_services,
      branchId: req.user.branchId,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data: pa, message: 'تم إرسال طلب الموافقة المسبقة' });
  })
);

/**
 * GET /prior-auth/:id
 * تفاصيل موافقة مسبقة
 */
router.get(
  '/prior-auth/:id',
  wrap(async (req, res) => {
    const pa = await PriorAuthorization.findOne({ _id: req.params.id, deletedAt: null })
      .populate('policyId')
      .populate('beneficiaryId', 'name nationalId phone')
      .lean();
    if (!pa) return res.status(404).json({ success: false, message: 'طلب الموافقة غير موجود' });
    res.json({ success: true, data: pa });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// ELIGIBILITY CHECKS — سجل فحوصات الأهلية
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /eligibility-checks
 * سجل فحوصات الأهلية التأمينية
 */
router.get(
  '/eligibility-checks',
  authorize(['admin', 'finance', 'manager', 'insurance_officer']),
  wrap(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 20;
    const query = { deletedAt: null };

    if (req.query.policy_id) query.policyId = req.query.policy_id;
    if (req.query.beneficiary_id) query.beneficiaryId = req.query.beneficiary_id;
    if (req.query.is_eligible !== undefined) query.isEligible = req.query.is_eligible === 'true';

    const [docs, total] = await Promise.all([
      InsuranceEligibilityCheck.find(query)
        .populate('policyId', 'policyNumber memberId')
        .populate('beneficiaryId', 'name nationalId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InsuranceEligibilityCheck.countDocuments(query),
    ]);
    res.json({ success: true, docs, total, page, pages: Math.ceil(total / limit) });
  })
);

module.exports = router;
