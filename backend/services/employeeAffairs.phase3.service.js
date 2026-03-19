/**
 * Employee Affairs Phase 3 Service — خدمات شؤون الموظفين المرحلة الثالثة
 *
 * Features:
 * 1. إدارة العقود (Contracts)
 * 2. تسوية الإجازات (Vacation Settlement)
 * 3. الإنذارات والمخالفات (Warnings)
 * 4. إخلاء الطرف (Clearance/Offboarding)
 * 5. تأشيرات الخروج والعودة (Exit/Re-Entry Visas)
 * 6. المزايا والبدلات (Benefits & Allowances)
 */
// Lazy model loaders
let EmployeeContract,
  VacationSettlement,
  EmployeeWarning,
  EmployeeClearance,
  ExitReentryVisa,
  BenefitPackage,
  EmployeeBenefit;

const getContract = () => {
  if (!EmployeeContract) EmployeeContract = require('../models/HR/EmployeeContract');
  return EmployeeContract;
};
const getSettlement = () => {
  if (!VacationSettlement) VacationSettlement = require('../models/HR/VacationSettlement');
  return VacationSettlement;
};
const getWarning = () => {
  if (!EmployeeWarning) EmployeeWarning = require('../models/HR/EmployeeWarning');
  return EmployeeWarning;
};
const getClearance = () => {
  if (!EmployeeClearance) EmployeeClearance = require('../models/HR/EmployeeClearance');
  return EmployeeClearance;
};
const getVisa = () => {
  if (!ExitReentryVisa) ExitReentryVisa = require('../models/HR/ExitReentryVisa');
  return ExitReentryVisa;
};
const getBenefitModels = () => {
  if (!BenefitPackage) {
    const m = require('../models/HR/EmployeeBenefit');
    BenefitPackage = m.BenefitPackage;
    EmployeeBenefit = m.EmployeeBenefit;
  }
  return { BenefitPackage, EmployeeBenefit };
};

class EmployeeAffairsPhase3Service {
  // ════════════════════════════════════════════════════════════════════
  //  1. CONTRACTS — إدارة العقود
  // ════════════════════════════════════════════════════════════════════
  async createContract(data) {
    return getContract().create(data);
  }

  async listContracts(query = {}) {
    const { status, contractType, employeeId, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;
    if (contractType) filter.contractType = contractType;
    if (employeeId) filter.employeeId = employeeId;

    const [contracts, total] = await Promise.all([
      getContract()
        .find(filter)
        .populate('employeeId', 'firstName lastName employeeNumber department')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      getContract().countDocuments(filter),
    ]);
    return { contracts, total, page: Number(page), limit: Number(limit) };
  }

  async getContractById(id) {
    return getContract()
      .findById(id)
      .populate('employeeId', 'firstName lastName employeeNumber department')
      .populate('createdBy', 'firstName lastName');
  }

  async renewContract(id, data) {
    const contract = await getContract().findById(id);
    if (!contract) throw new Error('العقد غير موجود');
    contract.renewalHistory.push({
      previousEndDate: contract.endDate,
      newEndDate: data.newEndDate,
      renewedBy: data.renewedBy,
      notes: data.notes,
    });
    contract.endDate = data.newEndDate;
    contract.status = 'ساري';
    return contract.save();
  }

  async addContractAmendment(id, amendment) {
    const contract = await getContract().findById(id);
    if (!contract) throw new Error('العقد غير موجود');
    amendment.amendmentNumber = `AMD-${Date.now()}`;
    contract.amendments.push(amendment);
    return contract.save();
  }

  async terminateContract(id, data) {
    const contract = await getContract().findById(id);
    if (!contract) throw new Error('العقد غير موجود');
    contract.terminationDetails = {
      terminated: true,
      terminationDate: data.terminationDate || new Date(),
      terminationReason: data.reason,
      lastWorkingDay: data.lastWorkingDay,
      exitInterviewDone: data.exitInterviewDone || false,
      settlementAmount: data.settlementAmount,
    };
    contract.status = 'ملغي';
    return contract.save();
  }

  async getExpiringContracts(days = 60) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return getContract()
      .find({
        endDate: { $lte: futureDate, $gte: new Date() },
        status: 'ساري',
        isOpenEnded: false,
      })
      .populate('employeeId', 'firstName lastName employeeNumber department')
      .sort({ endDate: 1 });
  }

  async getContractStats() {
    const Contract = getContract();
    const [total, byStatus, byType, expiringSoon] = await Promise.all([
      Contract.countDocuments(),
      Contract.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Contract.aggregate([{ $group: { _id: '$contractType', count: { $sum: 1 } } }]),
      Contract.countDocuments({
        endDate: { $lte: new Date(Date.now() + 60 * 86400000), $gte: new Date() },
        status: 'ساري',
        isOpenEnded: false,
      }),
    ]);
    return { total, byStatus, byType, expiringSoon };
  }

  // ════════════════════════════════════════════════════════════════════
  //  2. VACATION SETTLEMENT — تسوية الإجازات
  // ════════════════════════════════════════════════════════════════════
  async createSettlement(data) {
    return getSettlement().create(data);
  }

  async listSettlements(query = {}) {
    const { status, type, employeeId, year, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (employeeId) filter.employeeId = employeeId;
    if (year) filter.settlementYear = Number(year);

    const [settlements, total] = await Promise.all([
      getSettlement()
        .find(filter)
        .populate('employeeId', 'firstName lastName employeeNumber department')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      getSettlement().countDocuments(filter),
    ]);
    return { settlements, total, page: Number(page), limit: Number(limit) };
  }

  async getSettlementById(id) {
    return getSettlement()
      .findById(id)
      .populate('employeeId', 'firstName lastName employeeNumber department')
      .populate('approvals.managerApproval.approvedBy', 'firstName lastName')
      .populate('approvals.financeApproval.approvedBy', 'firstName lastName');
  }

  async approveSettlement(id, data) {
    const settlement = await getSettlement().findById(id);
    if (!settlement) throw new Error('التسوية غير موجودة');

    if (data.role === 'manager') {
      settlement.approvals.managerApproval = {
        approved: data.approved,
        approvedBy: data.userId,
        date: new Date(),
        notes: data.notes,
      };
      settlement.status = data.approved ? 'معتمدة من المدير' : 'مرفوضة';
    } else if (data.role === 'finance') {
      settlement.approvals.financeApproval = {
        approved: data.approved,
        approvedBy: data.userId,
        date: new Date(),
        notes: data.notes,
      };
      settlement.status = data.approved ? 'معتمدة من المالية' : 'مرفوضة';
    }
    return settlement.save();
  }

  async disburseSettlement(id, paymentData) {
    const settlement = await getSettlement().findById(id);
    if (!settlement) throw new Error('التسوية غير موجودة');
    settlement.payment = {
      method: paymentData.method,
      reference: paymentData.reference,
      paidDate: new Date(),
      paidBy: paymentData.paidBy,
    };
    settlement.status = 'صرفت';
    return settlement.save();
  }

  async getSettlementStats() {
    const Settlement = getSettlement();
    const [total, byStatus, byType, totalAmount] = await Promise.all([
      Settlement.countDocuments(),
      Settlement.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Settlement.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Settlement.aggregate([
        { $match: { status: 'صرفت' } },
        { $group: { _id: null, total: { $sum: '$calculation.netAmount' } } },
      ]),
    ]);
    return { total, byStatus, byType, totalDisbursed: totalAmount[0]?.total || 0 };
  }

  // ════════════════════════════════════════════════════════════════════
  //  3. WARNINGS — الإنذارات والمخالفات
  // ════════════════════════════════════════════════════════════════════
  async createWarning(data) {
    // Auto count occurrences
    const Warning = getWarning();
    const prevCount = await Warning.countDocuments({
      employeeId: data.employeeId,
      violationType: data.violationType,
      status: { $in: ['صدر', 'مُبلّغ', 'نُفّذ'] },
    });
    data.occurrenceNumber = prevCount + 1;
    return Warning.create(data);
  }

  async listWarnings(query = {}) {
    const { status, warningLevel, violationType, employeeId, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;
    if (warningLevel) filter.warningLevel = warningLevel;
    if (violationType) filter.violationType = violationType;
    if (employeeId) filter.employeeId = employeeId;

    const [warnings, total] = await Promise.all([
      getWarning()
        .find(filter)
        .populate('employeeId', 'firstName lastName employeeNumber department')
        .populate('issuedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      getWarning().countDocuments(filter),
    ]);
    return { warnings, total, page: Number(page), limit: Number(limit) };
  }

  async getWarningById(id) {
    return getWarning()
      .findById(id)
      .populate('employeeId', 'firstName lastName employeeNumber department')
      .populate('issuedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');
  }

  async issueWarning(id) {
    const warning = await getWarning().findById(id);
    if (!warning) throw new Error('الإنذار غير موجود');
    warning.status = 'صدر';
    return warning.save();
  }

  async acknowledgeWarning(id, data) {
    const warning = await getWarning().findById(id);
    if (!warning) throw new Error('الإنذار غير موجود');
    warning.employeeAcknowledged = true;
    warning.acknowledgedDate = new Date();
    warning.status = 'مُبلّغ';
    if (data?.refusedToSign) {
      warning.refusedToSign = true;
      warning.witnessForRefusal = data.witness;
    }
    return warning.save();
  }

  async appealWarning(id, appealData) {
    const warning = await getWarning().findById(id);
    if (!warning) throw new Error('الإنذار غير موجود');
    warning.appeal = {
      appealText: appealData.text,
      submittedBy: appealData.submittedBy,
      decision: 'قيد المراجعة',
    };
    warning.status = 'معترض عليه';
    return warning.save();
  }

  async getEmployeeWarningHistory(employeeId) {
    return getWarning()
      .find({ employeeId })
      .sort({ violationDate: -1 })
      .populate('issuedBy', 'firstName lastName');
  }

  async getWarningStats() {
    const Warning = getWarning();
    const [total, byLevel, byType, byStatus] = await Promise.all([
      Warning.countDocuments(),
      Warning.aggregate([{ $group: { _id: '$warningLevel', count: { $sum: 1 } } }]),
      Warning.aggregate([{ $group: { _id: '$violationType', count: { $sum: 1 } } }]),
      Warning.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    return { total, byLevel, byType, byStatus };
  }

  // ════════════════════════════════════════════════════════════════════
  //  4. CLEARANCE/OFFBOARDING — إخلاء الطرف
  // ════════════════════════════════════════════════════════════════════
  async initiateClearance(data) {
    // Create with standard department items
    const defaultItems = [
      { department: 'الموارد البشرية', label: 'تسوية الإجازات والرواتب' },
      { department: 'تقنية المعلومات', label: 'استلام الأجهزة وإلغاء الصلاحيات' },
      { department: 'المالية', label: 'تسوية السلف والمستحقات' },
      { department: 'الشؤون الإدارية', label: 'استلام مفاتيح ومعدات' },
      { department: 'العهد والممتلكات', label: 'استلام جميع العهد' },
      { department: 'السكن', label: 'إخلاء السكن' },
      { department: 'أمن المنشأة', label: 'استلام بطاقات الدخول' },
      { department: 'القسم المباشر', label: 'تسليم المهام والملفات' },
    ];
    data.items = defaultItems.map(item => ({ ...item, status: 'معلّق' }));
    return getClearance().create(data);
  }

  async listClearances(query = {}) {
    const { status, departureType, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;
    if (departureType) filter.departureType = departureType;

    const [clearances, total] = await Promise.all([
      getClearance()
        .find(filter)
        .populate('employeeId', 'firstName lastName employeeNumber department')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      getClearance().countDocuments(filter),
    ]);
    return { clearances, total, page: Number(page), limit: Number(limit) };
  }

  async getClearanceById(id) {
    return getClearance()
      .findById(id)
      .populate('employeeId', 'firstName lastName employeeNumber department')
      .populate('items.clearedBy', 'firstName lastName')
      .populate('initiatedBy', 'firstName lastName');
  }

  async updateClearanceItem(clearanceId, itemId, data) {
    const clearance = await getClearance().findById(clearanceId);
    if (!clearance) throw new Error('إخلاء الطرف غير موجود');
    const item = clearance.items.id(itemId);
    if (!item) throw new Error('البند غير موجود');
    item.status = data.status;
    item.clearedBy = data.clearedBy;
    item.clearedDate = data.status === 'مُخلى' ? new Date() : undefined;
    item.notes = data.notes;
    item.pendingItems = data.pendingItems || [];
    return clearance.save();
  }

  async calculateFinalSettlement(clearanceId, data) {
    const clearance = await getClearance().findById(clearanceId);
    if (!clearance) throw new Error('إخلاء الطرف غير موجود');
    clearance.finalSettlement = {
      ...data,
      calculatedBy: data.calculatedBy,
      calculationDate: new Date(),
    };
    return clearance.save();
  }

  async conductExitInterview(clearanceId, data) {
    const clearance = await getClearance().findById(clearanceId);
    if (!clearance) throw new Error('إخلاء الطرف غير موجود');
    clearance.exitInterview = { ...data, conducted: true, date: new Date() };
    return clearance.save();
  }

  async getClearanceStats() {
    const Clearance = getClearance();
    const [total, byStatus, byType, avgProgress] = await Promise.all([
      Clearance.countDocuments(),
      Clearance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Clearance.aggregate([{ $group: { _id: '$departureType', count: { $sum: 1 } } }]),
      Clearance.aggregate([{ $group: { _id: null, avg: { $avg: '$overallProgress' } } }]),
    ]);
    return { total, byStatus, byType, avgProgress: Math.round(avgProgress[0]?.avg || 0) };
  }

  // ════════════════════════════════════════════════════════════════════
  //  5. EXIT/RE-ENTRY VISAS — تأشيرات الخروج والعودة
  // ════════════════════════════════════════════════════════════════════
  async createVisaRequest(data) {
    return getVisa().create(data);
  }

  async listVisaRequests(query = {}) {
    const { status, visaType, employeeId, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;
    if (visaType) filter.visaType = visaType;
    if (employeeId) filter.employeeId = employeeId;

    const [visas, total] = await Promise.all([
      getVisa()
        .find(filter)
        .populate('employeeId', 'firstName lastName employeeNumber department nationality')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      getVisa().countDocuments(filter),
    ]);
    return { visas, total, page: Number(page), limit: Number(limit) };
  }

  async getVisaRequestById(id) {
    return getVisa()
      .findById(id)
      .populate('employeeId', 'firstName lastName employeeNumber department nationality')
      .populate('requestedBy', 'firstName lastName');
  }

  async approveVisaRequest(id, data) {
    const visa = await getVisa().findById(id);
    if (!visa) throw new Error('الطلب غير موجود');

    if (data.level === 'manager') {
      visa.managerApproval = {
        status: data.approved ? 'معتمد' : 'مرفوض',
        approvedBy: data.userId,
        date: new Date(),
        notes: data.notes,
      };
    } else if (data.level === 'hr') {
      visa.hrApproval = {
        status: data.approved ? 'معتمد' : 'مرفوض',
        approvedBy: data.userId,
        date: new Date(),
        notes: data.notes,
      };
    }

    // If both approved
    if (visa.managerApproval?.status === 'معتمد' && visa.hrApproval?.status === 'معتمد') {
      visa.status = 'معتمد';
    } else if (data.approved === false) {
      visa.status = 'ملغي';
    } else {
      visa.status = 'قيد الموافقة';
    }
    return visa.save();
  }

  async issueVisa(id, visaDetails) {
    const visa = await getVisa().findById(id);
    if (!visa) throw new Error('الطلب غير موجود');
    visa.visaNumber = visaDetails.visaNumber;
    visa.issueDate = visaDetails.issueDate || new Date();
    visa.expiryDate = visaDetails.expiryDate;
    visa.muqeemReference = visaDetails.muqeemReference;
    visa.status = 'صادر';
    return visa.save();
  }

  async recordTravel(id, travelData) {
    const visa = await getVisa().findById(id);
    if (!visa) throw new Error('الطلب غير موجود');
    visa.travelRecords.push(travelData);
    visa.status = 'مستخدم';
    if (travelData.departureDate) {
      visa.returnTracking.expectedReturnDate = travelData.expectedReturnDate;
      visa.returnTracking.returnStatus = 'مسافر';
    }
    return visa.save();
  }

  async recordReturn(id) {
    const visa = await getVisa().findById(id);
    if (!visa) throw new Error('الطلب غير موجود');
    const lastTravel = visa.travelRecords[visa.travelRecords.length - 1];
    if (lastTravel) {
      lastTravel.actualReturnDate = new Date();
      lastTravel.status = 'عاد';
    }
    visa.returnTracking.actualReturnDate = new Date();
    visa.returnTracking.returnStatus = 'عاد في الموعد';
    return visa.save();
  }

  async getExpiringVisas(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return getVisa()
      .find({
        expiryDate: { $lte: futureDate, $gte: new Date() },
        status: { $in: ['صادر', 'مستخدم'] },
      })
      .populate('employeeId', 'firstName lastName employeeNumber')
      .sort({ expiryDate: 1 });
  }

  async getVisaStats() {
    const Visa = getVisa();
    const [total, byStatus, byType, totalFees] = await Promise.all([
      Visa.countDocuments(),
      Visa.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Visa.aggregate([{ $group: { _id: '$visaType', count: { $sum: 1 } } }]),
      Visa.aggregate([{ $group: { _id: null, total: { $sum: '$fees.totalFee' } } }]),
    ]);
    return { total, byStatus, byType, totalFees: totalFees[0]?.total || 0 };
  }

  // ════════════════════════════════════════════════════════════════════
  //  6. BENEFITS & ALLOWANCES — المزايا والبدلات
  // ════════════════════════════════════════════════════════════════════
  async createBenefitPackage(data) {
    const { BenefitPackage: BP } = getBenefitModels();
    return BP.create(data);
  }

  async listBenefitPackages() {
    const { BenefitPackage: BP } = getBenefitModels();
    return BP.find({ isActive: true }).sort({ grade: 1 });
  }

  async assignBenefit(data) {
    const { EmployeeBenefit: EB } = getBenefitModels();
    return EB.create(data);
  }

  async listEmployeeBenefits(query = {}) {
    const { status, employeeId, packageId, page = 1, limit = 20 } = query;
    const { EmployeeBenefit: EB } = getBenefitModels();
    const filter = {};
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;
    if (packageId) filter.packageId = packageId;

    const [benefits, total] = await Promise.all([
      EB.find(filter)
        .populate('employeeId', 'firstName lastName employeeNumber department')
        .populate('packageId', 'name packageCode grade')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      EB.countDocuments(filter),
    ]);
    return { benefits, total, page: Number(page), limit: Number(limit) };
  }

  async getEmployeeBenefitById(id) {
    const { EmployeeBenefit: EB } = getBenefitModels();
    return EB.findById(id)
      .populate('employeeId', 'firstName lastName employeeNumber department')
      .populate('packageId');
  }

  async adjustBenefitAllowance(id, adjustment) {
    const { EmployeeBenefit: EB } = getBenefitModels();
    const benefit = await EB.findById(id);
    if (!benefit) throw new Error('المزايا غير موجودة');
    benefit.adjustmentHistory.push({
      type: 'تعديل',
      field: adjustment.field,
      previousValue: benefit.allowances?.[adjustment.field],
      newValue: adjustment.newValue,
      reason: adjustment.reason,
      adjustedBy: adjustment.adjustedBy,
    });
    if (benefit.allowances) {
      benefit.allowances[adjustment.field] = adjustment.newValue;
    }
    return benefit.save();
  }

  async claimAirTicket(benefitId, claimData) {
    const { EmployeeBenefit: EB } = getBenefitModels();
    const benefit = await EB.findById(benefitId);
    if (!benefit) throw new Error('المزايا غير موجودة');
    const year = new Date().getFullYear();
    let yearRecord = benefit.airTicketUsage.find(u => u.year === year);
    if (!yearRecord) {
      benefit.airTicketUsage.push({ year, usedTickets: 0, remainingTickets: 1, claims: [] });
      yearRecord = benefit.airTicketUsage[benefit.airTicketUsage.length - 1];
    }
    yearRecord.claims.push({ ...claimData, status: 'مقدم' });
    return benefit.save();
  }

  async getBenefitStats() {
    const { EmployeeBenefit: EB, BenefitPackage: BP } = getBenefitModels();
    const [totalBenefits, totalPackages, byStatus, totalAllowances] = await Promise.all([
      EB.countDocuments(),
      BP.countDocuments({ isActive: true }),
      EB.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      EB.aggregate([
        { $match: { status: 'نشط' } },
        { $group: { _id: null, total: { $sum: '$allowances.totalMonthlyAllowances' } } },
      ]),
    ]);
    return {
      totalBenefits,
      totalPackages,
      byStatus,
      totalMonthlyAllowances: totalAllowances[0]?.total || 0,
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  DASHBOARD
  // ════════════════════════════════════════════════════════════════════
  async getPhase3Dashboard() {
    const [contracts, settlements, warnings, clearances, visas, benefits] = await Promise.all([
      this.getContractStats(),
      this.getSettlementStats(),
      this.getWarningStats(),
      this.getClearanceStats(),
      this.getVisaStats(),
      this.getBenefitStats(),
    ]);
    return { contracts, settlements, warnings, clearances, visas, benefits };
  }
}

module.exports = new EmployeeAffairsPhase3Service();
