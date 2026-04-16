/**
 * Missing Models Routes — مسارات النماذج الناقصة
 * يشمل: MedicalHistory, BeneficiaryTransfer, EmergencyContact,
 *        LeaveBalance, EmploymentContract, ChartOfAccounts, AssessmentComparison
 *
 * Based on: prompt_02 — database schema §5.2, §5.3, §5.5, §5.6
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth.middleware');
const requireAuth = authenticateToken;
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');

// Local helper — some legacy models use 'branch' not 'branchId'
const branchFilterFor = (req, field = 'branchId') => {
  if (!req.branchScope || req.branchScope.allBranches) return {};
  return { [field]: req.branchScope.branchId };
};

const MedicalHistory = require('../models/MedicalHistory');
const BeneficiaryTransfer = require('../models/BeneficiaryTransfer');
const EmergencyContact = require('../models/EmergencyContact');
const LeaveBalance = require('../models/LeaveBalance');
const EmploymentContract = require('../models/EmploymentContract');
const ChartOfAccounts = require('../models/ChartOfAccounts');
const AssessmentComparison = require('../models/AssessmentComparison');
const safeError = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

// ─── Helper: standard response ───────────────────────────────────────────────
const ok = (res, data, meta = {}) => res.json({ success: true, ...meta, data });
const fail = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });
const serverError = (res, err) => {
  logger.error(err.message, { stack: err.stack });
  return safeError(res, err);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MEDICAL HISTORY — التاريخ الطبي
// ═══════════════════════════════════════════════════════════════════════════════

// GET /medical-history/:beneficiaryId
router.get(
  '/medical-history/:beneficiaryId',
  requireAuth,
  requireBranchAccess,
  async (req, res) => {
    try {
      const record = await MedicalHistory.findOne({
        beneficiary: req.params.beneficiaryId,
        ...branchFilter(req),
      })
        .populate('beneficiary', 'fileNumber firstNameAr lastNameAr')
        .populate('recordedBy', 'nameAr');
      if (!record) return fail(res, 'لا يوجد تاريخ طبي مسجل لهذا المستفيد', 404);
      ok(res, record);
    } catch (err) {
      serverError(res, err);
    }
  }
);

// POST /medical-history — إنشاء أو تحديث (upsert)
router.post('/medical-history', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { beneficiaryId, ...rest } = req.body;
    if (!beneficiaryId) return fail(res, 'beneficiaryId مطلوب');
    rest.recordedBy = req.user?._id || req.user?.id;
    if (req.branchScope && req.branchScope.branchId) {
      rest.branchId = req.branchScope.branchId;
    }
    const record = await MedicalHistory.findOneAndUpdate(
      { beneficiary: beneficiaryId, ...branchFilter(req) },
      { ...rest, beneficiary: beneficiaryId },
      { upsert: true, new: true, runValidators: true }
    );
    ok(res, record, { message: 'تم حفظ التاريخ الطبي' });
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /medical-history/:beneficiaryId — تحديث جزئي
router.patch(
  '/medical-history/:beneficiaryId',
  requireAuth,
  requireBranchAccess,
  async (req, res) => {
    try {
      // ── Mass-assignment protection: whitelist allowed fields ──
      const allowedFields = [
        'diagnoses',
        'chronicConditions',
        'allergies',
        'medications',
        'surgeries',
        'familyHistory',
        'immunizations',
        'bloodType',
        'disabilities',
        'notes',
        'lastCheckupDate',
        'nextCheckupDate',
        'currentTreatmentPlan',
        'emergencyMedicalInfo',
      ];
      const updates = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      updates.recordedBy = req.user?._id || req.user?.id;

      const record = await MedicalHistory.findOneAndUpdate(
        { beneficiary: req.params.beneficiaryId, ...branchFilter(req) },
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (!record) return fail(res, 'السجل غير موجود', 404);
      ok(res, record, { message: 'تم التحديث' });
    } catch (err) {
      serverError(res, err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. BENEFICIARY TRANSFERS — نقل المستفيدين
// ═══════════════════════════════════════════════════════════════════════════════

// GET /beneficiary-transfers — قائمة الطلبات (scoped: user sees transfers involving their branch)
router.get('/beneficiary-transfers', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { status, fromBranch, toBranch, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (fromBranch) filter.fromBranch = fromBranch;
    if (toBranch) filter.toBranch = toBranch;

    // Branch isolation: user sees transfers involving their branch (from or to)
    if (req.branchScope && !req.branchScope.allBranches && req.branchScope.branchId) {
      const bid = req.branchScope.branchId;
      filter.$or = [{ fromBranch: bid }, { toBranch: bid }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      BeneficiaryTransfer.find(filter)
        .populate('beneficiary', 'fileNumber firstNameAr lastNameAr')
        .populate('fromBranch', 'nameAr code')
        .populate('toBranch', 'nameAr code')
        .populate('requestedBy', 'nameAr')
        .populate('approvedBy', 'nameAr')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BeneficiaryTransfer.countDocuments(filter),
    ]);
    ok(res, data, { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    serverError(res, err);
  }
});

// GET /beneficiary-transfers/:id
router.get('/beneficiary-transfers/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const record = await BeneficiaryTransfer.findById(req.params.id)
      .populate('beneficiary', 'fileNumber firstNameAr lastNameAr')
      .populate('fromBranch', 'nameAr code')
      .populate('toBranch', 'nameAr code')
      .populate('requestedBy', 'nameAr')
      .populate('approvedBy', 'nameAr');
    if (!record) return fail(res, 'الطلب غير موجود', 404);
    // Verify branch access for non-cross-branch users
    if (req.branchScope && !req.branchScope.allBranches && req.branchScope.branchId) {
      const bid = String(req.branchScope.branchId);
      if (
        String(record.fromBranch?._id || record.fromBranch) !== bid &&
        String(record.toBranch?._id || record.toBranch) !== bid
      ) {
        return fail(res, 'الطلب غير موجود', 404);
      }
    }
    ok(res, record);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /beneficiary-transfers — طلب نقل جديد
router.post('/beneficiary-transfers', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const body = { ...req.body, requestedBy: req.user?._id || req.user?.id };
    // Auto-set fromBranch if not provided
    if (!body.fromBranch && req.branchScope && req.branchScope.branchId) {
      body.fromBranch = req.branchScope.branchId;
    }
    const record = await BeneficiaryTransfer.create(body);
    ok(res, record, { message: 'تم إنشاء طلب النقل' });
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /beneficiary-transfers/:id/approve — الموافقة
router.patch(
  '/beneficiary-transfers/:id/approve',
  requireAuth,
  requireBranchAccess,
  async (req, res) => {
    try {
      const record = await BeneficiaryTransfer.findByIdAndUpdate(
        req.params.id,
        {
          status: 'approved',
          approvedBy: req.user?._id || req.user?.id,
          approvedAt: new Date(),
          transferDate: req.body.transferDate || new Date(),
        },
        { new: true }
      );
      if (!record) return fail(res, 'الطلب غير موجود', 404);
      ok(res, record, { message: 'تمت الموافقة على الطلب' });
    } catch (err) {
      serverError(res, err);
    }
  }
);

// PATCH /beneficiary-transfers/:id/reject — الرفض
router.patch(
  '/beneficiary-transfers/:id/reject',
  requireAuth,
  requireBranchAccess,
  async (req, res) => {
    try {
      const record = await BeneficiaryTransfer.findByIdAndUpdate(
        req.params.id,
        {
          status: 'rejected',
          rejectionReason: req.body.rejectionReason || 'لم يُذكر سبب',
        },
        { new: true }
      );
      if (!record) return fail(res, 'الطلب غير موجود', 404);
      ok(res, record, { message: 'تم رفض الطلب' });
    } catch (err) {
      serverError(res, err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. EMERGENCY CONTACTS — جهات الاتصال الطارئة
// ═══════════════════════════════════════════════════════════════════════════════

// GET /emergency-contacts/:beneficiaryId
router.get(
  '/emergency-contacts/:beneficiaryId',
  requireAuth,
  requireBranchAccess,
  async (req, res) => {
    try {
      const contacts = await EmergencyContact.find({
        beneficiary: req.params.beneficiaryId,
        ...branchFilter(req),
      }).sort({ priority: 1 });
      ok(res, contacts, { total: contacts.length });
    } catch (err) {
      serverError(res, err);
    }
  }
);

// POST /emergency-contacts
router.post('/emergency-contacts', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const body = { ...stripUpdateMeta(req.body) };
    if (req.branchScope && req.branchScope.branchId) {
      body.branchId = req.branchScope.branchId;
    }
    const contact = await EmergencyContact.create(body);
    ok(res, contact, { message: 'تمت إضافة جهة الاتصال' });
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /emergency-contacts/:id
router.patch('/emergency-contacts/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripUpdateMeta(req.body),
      { new: true, runValidators: true }
    );
    if (!contact) return fail(res, 'جهة الاتصال غير موجودة', 404);
    ok(res, contact, { message: 'تم التحديث' });
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /emergency-contacts/:id
router.delete('/emergency-contacts/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!contact) return fail(res, 'جهة الاتصال غير موجودة', 404);
    ok(res, null, { message: 'تم الحذف' });
  } catch (err) {
    serverError(res, err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. LEAVE BALANCES — أرصدة الإجازات
// ═══════════════════════════════════════════════════════════════════════════════

// GET /leave-balances/:employeeId — أرصدة موظف محدد
router.get('/leave-balances/:employeeId', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear().toString();
    const balances = await LeaveBalance.find({
      employee: req.params.employeeId,
      year,
      ...branchFilterFor(req, 'branch'),
    }).populate('employee', 'nameAr employeeNumber');
    ok(res, balances, { year, total: balances.length });
  } catch (err) {
    serverError(res, err);
  }
});

// GET /leave-balances — قائمة عامة
router.get('/leave-balances', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const {
      year = new Date().getFullYear().toString(),
      branch,
      leaveType,
      page = 1,
      limit = 50,
    } = req.query;
    const filter = { year, ...branchFilterFor(req, 'branch') };
    if (leaveType) filter.leaveType = leaveType;
    if (branch) filter.branch = branch; // explicit override if admin

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      LeaveBalance.find(filter)
        .populate('employee', 'nameAr employeeNumber department')
        .sort({ 'employee.nameAr': 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LeaveBalance.countDocuments(filter),
    ]);
    ok(res, data, { total, page: parseInt(page), year });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /leave-balances — إنشاء/تحديث رصيد
router.post('/leave-balances', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { employee, year, leaveType, ...rest } = req.body;
    if (req.branchScope && req.branchScope.branchId && !rest.branch) {
      rest.branch = req.branchScope.branchId;
    }
    const balance = await LeaveBalance.findOneAndUpdate(
      { employee, year, leaveType },
      { employee, year, leaveType, ...rest },
      { upsert: true, new: true, runValidators: true }
    );
    ok(res, balance, { message: 'تم حفظ الرصيد' });
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /leave-balances/:id/deduct — خصم أيام
router.patch('/leave-balances/:id/deduct', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || days <= 0) return fail(res, 'عدد الأيام يجب أن يكون موجباً');
    const balance = await LeaveBalance.findOne({
      _id: req.params.id,
      ...branchFilterFor(req, 'branch'),
    });
    if (!balance) return fail(res, 'السجل غير موجود', 404);
    if (balance.remainingDays < days) return fail(res, 'الرصيد غير كافٍ');
    balance.usedDays += days;
    await balance.save();
    ok(res, balance, { message: `تم خصم ${days} يوم` });
  } catch (err) {
    serverError(res, err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. EMPLOYMENT CONTRACTS — عقود العمل
// ═══════════════════════════════════════════════════════════════════════════════

// GET /employment-contracts
router.get('/employment-contracts', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { status, branch, contractType, page = 1, limit = 20 } = req.query;
    const filter = { ...branchFilterFor(req, 'branch') };
    if (status) filter.status = status;
    if (branch) filter.branch = branch; // explicit override if admin
    if (contractType) filter.contractType = contractType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      EmploymentContract.find(filter)
        .populate('employee', 'nameAr employeeNumber jobTitleAr')
        .populate('branch', 'nameAr code')
        .populate('approvedBy', 'nameAr')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      EmploymentContract.countDocuments(filter),
    ]);
    ok(res, data, { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    serverError(res, err);
  }
});

// GET /employment-contracts/employee/:employeeId
router.get(
  '/employment-contracts/employee/:employeeId',
  requireAuth,
  requireBranchAccess,
  async (req, res) => {
    try {
      const contracts = await EmploymentContract.find({
        employee: req.params.employeeId,
        ...branchFilterFor(req, 'branch'),
      })
        .populate('branch', 'nameAr code')
        .sort({ startDate: -1 });
      ok(res, contracts, { total: contracts.length });
    } catch (err) {
      serverError(res, err);
    }
  }
);

// GET /employment-contracts/expiring — عقود قاربت الانتهاء
router.get('/employment-contracts/expiring', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const contracts = await EmploymentContract.find({
      status: 'active',
      endDate: { $ne: null, $lte: future, $gte: now },
      ...branchFilterFor(req, 'branch'),
    })
      .populate('employee', 'nameAr employeeNumber phone')
      .populate('branch', 'nameAr code')
      .sort({ endDate: 1 });
    ok(res, contracts, { total: contracts.length, daysAhead: days });
  } catch (err) {
    serverError(res, err);
  }
});

// GET /employment-contracts/:id
router.get('/employment-contracts/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const contract = await EmploymentContract.findOne({
      _id: req.params.id,
      ...branchFilterFor(req, 'branch'),
    })
      .populate('employee', 'nameAr employeeNumber jobTitleAr phone')
      .populate('branch', 'nameAr code')
      .populate('preparedBy', 'nameAr')
      .populate('approvedBy', 'nameAr')
      .populate('previousContract');
    if (!contract) return fail(res, 'العقد غير موجود', 404);
    ok(res, contract);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /employment-contracts
router.post('/employment-contracts', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const body = { ...req.body, preparedBy: req.user?._id || req.user?.id };
    if (req.branchScope && req.branchScope.branchId && !body.branch) {
      body.branch = req.branchScope.branchId;
    }
    const contract = await EmploymentContract.create(body);
    ok(res, contract, { message: 'تم إنشاء العقد' });
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /employment-contracts/:id
router.patch('/employment-contracts/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const contract = await EmploymentContract.findOneAndUpdate(
      { _id: req.params.id, ...branchFilterFor(req, 'branch') },
      stripUpdateMeta(req.body),
      { new: true, runValidators: true }
    );
    if (!contract) return fail(res, 'العقد غير موجود', 404);
    ok(res, contract, { message: 'تم التحديث' });
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /employment-contracts/:id/approve
router.patch(
  '/employment-contracts/:id/approve',
  requireAuth,
  requireBranchAccess,
  async (req, res) => {
    try {
      const contract = await EmploymentContract.findOneAndUpdate(
        { _id: req.params.id, ...branchFilterFor(req, 'branch') },
        {
          status: 'active',
          approvedBy: req.user?._id || req.user?.id,
          approvedAt: new Date(),
        },
        { new: true }
      );
      if (!contract) return fail(res, 'العقد غير موجود', 404);
      ok(res, contract, { message: 'تم اعتماد العقد' });
    } catch (err) {
      serverError(res, err);
    }
  }
);

// DELETE /employment-contracts/:id (soft: set to terminated)
router.delete('/employment-contracts/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const contract = await EmploymentContract.findOneAndUpdate(
      { _id: req.params.id, ...branchFilterFor(req, 'branch') },
      { status: 'terminated' },
      { new: true }
    );
    if (!contract) return fail(res, 'العقد غير موجود', 404);
    ok(res, null, { message: 'تم إنهاء العقد' });
  } catch (err) {
    serverError(res, err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CHART OF ACCOUNTS — دليل الحسابات
// ═══════════════════════════════════════════════════════════════════════════════

// GET /chart-of-accounts — شجرة الحسابات
router.get('/chart-of-accounts', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { type, isActive = 'true', branch } = req.query;
    const filter = { ...branchFilterFor(req, 'branch') };
    if (type) filter.type = type;
    if (branch) filter.branch = branch; // explicit override if admin
    if (isActive !== 'all') filter.isActive = isActive === 'true';

    const accounts = await ChartOfAccounts.find(filter)
      .populate('parent', 'code nameAr')
      .sort({ code: 1 });
    ok(res, accounts, { total: accounts.length });
  } catch (err) {
    serverError(res, err);
  }
});

// GET /chart-of-accounts/tree — شجرة هرمية
router.get('/chart-of-accounts/tree', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const branch = req.query.branch;
    const filter = { parent: null, isActive: true, ...branchFilterFor(req, 'branch') };
    if (branch) filter.branch = branch;

    const scopeFilter = branchFilterFor(req, 'branch');
    const buildTree = async parentId => {
      const children = await ChartOfAccounts.find({
        parent: parentId,
        isActive: true,
        ...scopeFilter,
      }).sort({ code: 1 });
      return Promise.all(
        children.map(async node => ({
          _id: node._id,
          code: node.code,
          nameAr: node.nameAr,
          nameEn: node.nameEn,
          type: node.type,
          nature: node.nature,
          currentBalance: node.currentBalance,
          isParent: node.isParent,
          children: await buildTree(node._id),
        }))
      );
    };

    const rootAccounts = await ChartOfAccounts.find(filter).sort({ code: 1 });
    const tree = await Promise.all(
      rootAccounts.map(async root => ({
        _id: root._id,
        code: root.code,
        nameAr: root.nameAr,
        nameEn: root.nameEn,
        type: root.type,
        nature: root.nature,
        currentBalance: root.currentBalance,
        isParent: root.isParent,
        children: await buildTree(root._id),
      }))
    );
    ok(res, tree);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /chart-of-accounts/:id
router.get('/chart-of-accounts/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const account = await ChartOfAccounts.findOne({
      _id: req.params.id,
      ...branchFilterFor(req, 'branch'),
    }).populate('parent', 'code nameAr');
    if (!account) return fail(res, 'الحساب غير موجود', 404);
    ok(res, account);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /chart-of-accounts
router.post('/chart-of-accounts', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const body = { ...stripUpdateMeta(req.body) };
    if (req.branchScope && req.branchScope.branchId && !body.branch) {
      body.branch = req.branchScope.branchId;
    }
    const account = await ChartOfAccounts.create(body);
    // إذا كان له أب، تحديث isParent للأب
    if (account.parent) {
      await ChartOfAccounts.findByIdAndUpdate(account.parent, { isParent: true });
    }
    ok(res, account, { message: 'تم إنشاء الحساب' });
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /chart-of-accounts/:id
router.patch('/chart-of-accounts/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const account = await ChartOfAccounts.findOneAndUpdate(
      { _id: req.params.id, ...branchFilterFor(req, 'branch') },
      stripUpdateMeta(req.body),
      { new: true, runValidators: true }
    );
    if (!account) return fail(res, 'الحساب غير موجود', 404);
    ok(res, account, { message: 'تم التحديث' });
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /chart-of-accounts/:id (soft delete)
router.delete('/chart-of-accounts/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const account = await ChartOfAccounts.findOne({
      _id: req.params.id,
      ...branchFilterFor(req, 'branch'),
    });
    if (!account) return fail(res, 'الحساب غير موجود', 404);
    if (account.isSystem) return fail(res, 'لا يمكن حذف الحسابات النظامية', 403);
    // فحص وجود أبناء
    const childCount = await ChartOfAccounts.countDocuments({ parent: req.params.id });
    if (childCount > 0) return fail(res, 'لا يمكن حذف حساب له حسابات فرعية', 400);
    account.isActive = false;
    await account.save();
    ok(res, null, { message: 'تم إلغاء تفعيل الحساب' });
  } catch (err) {
    serverError(res, err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ASSESSMENT COMPARISONS — مقارنة التقييمات
// ═══════════════════════════════════════════════════════════════════════════════

// GET /assessment-comparisons/beneficiary/:beneficiaryId
router.get(
  '/assessment-comparisons/beneficiary/:beneficiaryId',
  requireAuth,
  requireBranchAccess,
  async (req, res) => {
    try {
      const comparisons = await AssessmentComparison.find({
        beneficiary: req.params.beneficiaryId,
        ...branchFilterFor(req, 'branch'),
      })
        .populate('baselineAssessment', 'assessmentNumber assessmentDate totalScore')
        .populate('currentAssessment', 'assessmentNumber assessmentDate totalScore')
        .populate('generatedBy', 'nameAr')
        .sort({ createdAt: -1 });
      ok(res, comparisons, { total: comparisons.length });
    } catch (err) {
      serverError(res, err);
    }
  }
);

// GET /assessment-comparisons/:id
router.get('/assessment-comparisons/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const comparison = await AssessmentComparison.findOne({
      _id: req.params.id,
      ...branchFilterFor(req, 'branch'),
    })
      .populate('beneficiary', 'fileNumber firstNameAr lastNameAr')
      .populate('baselineAssessment')
      .populate('currentAssessment')
      .populate('generatedBy', 'nameAr');
    if (!comparison) return fail(res, 'المقارنة غير موجودة', 404);
    ok(res, comparison);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /assessment-comparisons — إنشاء مقارنة جديدة
router.post('/assessment-comparisons', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const body = { ...req.body, generatedBy: req.user?._id || req.user?.id };
    if (req.branchScope && req.branchScope.branchId) {
      body.branch = req.branchScope.branchId;
    }

    // حساب نسبة التحسن الإجمالية تلقائياً إذا لم تُرسَل
    if (!body.improvementPercentage && body.comparisonData?.length) {
      const improved = body.comparisonData.filter(d => d.trend === 'improved').length;
      body.improvementPercentage = Math.round((improved / body.comparisonData.length) * 100);
    }

    // حساب الفترة الزمنية إذا لم تُرسَل
    if (!body.intervalDays && body.baselineAssessment && body.currentAssessment) {
      const Assessment = require('../models/Assessment');
      const [base, current] = await Promise.all([
        Assessment.findById(body.baselineAssessment, 'assessmentDate'),
        Assessment.findById(body.currentAssessment, 'assessmentDate'),
      ]);
      if (base?.assessmentDate && current?.assessmentDate) {
        body.intervalDays = Math.round(
          (new Date(current.assessmentDate) - new Date(base.assessmentDate)) / (1000 * 60 * 60 * 24)
        );
      }
    }

    const comparison = await AssessmentComparison.create(body);
    ok(res, comparison, { message: 'تم إنشاء المقارنة' });
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /assessment-comparisons/:id
router.delete('/assessment-comparisons/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const comparison = await AssessmentComparison.findOneAndDelete({
      _id: req.params.id,
      ...branchFilterFor(req, 'branch'),
    });
    if (!comparison) return fail(res, 'المقارنة غير موجودة', 404);
    ok(res, null, { message: 'تم الحذف' });
  } catch (err) {
    serverError(res, err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS — إحصاءات شاملة
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/missing-models/stats', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const scope = branchFilter(req);
    const branchScope = branchFilterFor(req, 'branch');
    const [
      medicalHistories,
      pendingTransfers,
      expiredContracts,
      activeContracts,
      totalAccounts,
      comparisons,
    ] = await Promise.all([
      MedicalHistory.countDocuments(scope),
      BeneficiaryTransfer.countDocuments({ status: 'pending' }),
      EmploymentContract.countDocuments({
        status: 'active',
        endDate: { $lte: new Date() },
        ...branchScope,
      }),
      EmploymentContract.countDocuments({ status: 'active', ...branchScope }),
      ChartOfAccounts.countDocuments({ isActive: true, ...branchScope }),
      AssessmentComparison.countDocuments(branchScope),
    ]);
    ok(res, {
      medicalHistories,
      pendingTransfers,
      expiredContracts,
      activeContracts,
      totalAccounts,
      comparisons,
    });
  } catch (err) {
    serverError(res, err);
  }
});

module.exports = router;
