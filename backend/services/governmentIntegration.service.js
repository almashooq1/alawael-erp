/**
 * Government Integration Service — خدمة التكامل الحكومي الموحّد
 *
 * Unified bridge between Employee Affairs and Saudi government entities:
 * ─── التأمينات الاجتماعية (GOSI) — Social Insurance
 * ─── وزارة العمل (MOL) — Ministry of Labor
 * ─── قوى (Qiwa) — Contract & Compliance Platform
 *
 * Reads / writes the employee model's gosi, mol, qiwa, sponsorship sub-docs
 * and delegates to the existing service singletons for API calls.
 *
 * @version 1.0.0
 */

const logger = require('../utils/logger');

// ─── Lazy loaders (test-safe) ────────────────────────────────────────────────
let Employee;
const getEmployee = () => {
  if (!Employee) Employee = require('../models/employee.model');
  return Employee;
};

let gosiAdvanced, qiwaService;
const getGosiAdvanced = () => {
  if (!gosiAdvanced) gosiAdvanced = require('./gosi-advanced.service');
  return gosiAdvanced;
};
const getQiwa = () => {
  if (!qiwaService) qiwaService = require('./qiwa.service');
  return qiwaService;
};

class GovernmentIntegrationService {
  // ═══════════════════════════════════════════════════════════════════════════
  //  التأمينات الاجتماعية — GOSI
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تسجيل موظف في التأمينات الاجتماعية
   */
  async registerEmployeeGOSI(employeeId) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    if (employee.gosi?.status === 'active' || employee.gosi?.status === 'مسجل') {
      throw new Error('الموظف مسجل بالفعل في التأمينات');
    }

    const isSaudi =
      (employee.nationality || '').includes('سعودي') || employee.nationality === 'Saudi';
    const basicSalary = employee.salary?.base || 0;

    const result = await getGosiAdvanced().registerEmployee({
      nationalId: employee.nationalId,
      niqamaNumber: employee.iqamaNumber,
      fullNameArabic: `${employee.firstName} ${employee.lastName}`,
      fullNameEnglish: `${employee.firstName} ${employee.lastName}`,
      dateOfBirth: employee.dateOfBirth,
      nationality: employee.nationality,
      basicSalary,
      startDate: employee.hireDate || new Date(),
      jobTitle: employee.position,
      isSaudi,
    });

    // Persist GOSI data to employee model
    const contributions = getGosiAdvanced().calculateGOSIContributions(basicSalary, 0, isSaudi);
    employee.gosi = {
      subscriptionNumber:
        result.gosiNumber || result.gosiSubscriptionNumber || `GOSI-${Date.now()}`,
      registrationDate: new Date(),
      status: 'active',
      wage: contributions.subscriberWage,
      employeeShare: contributions.employeeContribution,
      employerShare: contributions.employerContribution,
      lastContributionDate: new Date(),
      totalContributionMonths: 0,
      annuities: isSaudi,
      occupationalHazards: true,
    };
    await employee.save();

    logger.info(`[GovIntegration] GOSI registration completed for employee ${employeeId}`);
    return { success: true, employee: employee.toObject(), gosiResult: result };
  }

  /**
   * الحصول على حالة التأمينات لموظف
   */
  async getEmployeeGOSIStatus(employeeId) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).lean();
    if (!employee) throw new Error('الموظف غير موجود');

    const gosiData = employee.gosi || {};
    let liveStatus = null;

    if (gosiData.subscriptionNumber) {
      try {
        liveStatus = await getGosiAdvanced().getSubscriptionStatus(gosiData.subscriptionNumber);
      } catch (err) {
        logger.warn(`[GovIntegration] Could not fetch live GOSI status: ${err.message}`);
      }
    }

    return {
      employeeId: employee.employeeId,
      fullName: `${employee.firstName} ${employee.lastName}`,
      nationalId: employee.nationalId,
      gosi: gosiData,
      liveStatus,
    };
  }

  /**
   * تحديث أجر موظف في التأمينات
   */
  async updateEmployeeGOSIWage(employeeId, newSalary) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');
    if (!employee.gosi?.subscriptionNumber) throw new Error('الموظف غير مسجل في التأمينات');

    const isSaudi =
      (employee.nationality || '').includes('سعودي') || employee.nationality === 'Saudi';
    const result = await getGosiAdvanced().updateEmployeeWage(
      employee.gosi.subscriptionNumber,
      newSalary
    );

    const contributions = getGosiAdvanced().calculateGOSIContributions(newSalary, 0, isSaudi);
    employee.gosi.wage = contributions.subscriberWage;
    employee.gosi.employeeShare = contributions.employeeContribution;
    employee.gosi.employerShare = contributions.employerContribution;
    await employee.save();

    return { success: true, employee: employee.toObject(), gosiResult: result };
  }

  /**
   * حساب اشتراكات التأمينات لموظف
   */
  calculateGOSIContributions(basicSalary, housingAllowance = 0, isSaudi = true) {
    return getGosiAdvanced().calculateGOSIContributions(basicSalary, housingAllowance, isSaudi);
  }

  /**
   * إلغاء اشتراك موظف (إنهاء خدمات)
   */
  async cancelEmployeeGOSI(employeeId, reason) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');
    if (!employee.gosi?.subscriptionNumber) throw new Error('الموظف غير مسجل في التأمينات');

    const result = await getGosiAdvanced().cancelSubscription(
      employee.gosi.subscriptionNumber,
      reason
    );

    employee.gosi.status = 'cancelled';
    await employee.save();

    return { success: true, employee: employee.toObject(), gosiResult: result };
  }

  /**
   * إصدار شهادة تأمينات
   */
  async generateGOSICertificate(employeeId, certificateType = 'standard') {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).lean();
    if (!employee) throw new Error('الموظف غير موجود');
    if (!employee.gosi?.subscriptionNumber) throw new Error('الموظف غير مسجل في التأمينات');

    return getGosiAdvanced().generateCertificate(employee.gosi.subscriptionNumber, certificateType);
  }

  /**
   * تقرير الامتثال للتأمينات
   */
  async getGOSIComplianceReport(filters = {}) {
    return getGosiAdvanced().getComplianceReport(filters);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  قوى / وزارة العمل — Qiwa / MOL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تسجيل عقد عمل في منصة قوى
   */
  async registerEmployeeQiwaContract(employeeId, contractData = {}) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    const payload = {
      employeeId: employee.employeeId,
      iqamaNumber: employee.iqamaNumber || employee.nationalId,
      nationalId: employee.nationalId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      position: employee.position,
      department: employee.department,
      salary: employee.salary?.base || 0,
      startDate: employee.contract?.startDate || employee.hireDate,
      endDate: employee.contract?.endDate,
      contractType: employee.contract?.contractType || 'unlimited',
      ...contractData,
    };

    const result = await getQiwa().registerContract(payload);

    employee.qiwa = {
      contractId: result.contractId || result.data?.contractId || `QW-${Date.now()}`,
      contractStatus: 'active',
      contractAuthDate: new Date(),
      wageProtectionStatus: 'pending',
      lastWageSubmission: null,
      nitaqatCategory: null,
      saudizationPoints: null,
    };
    if (!employee.contract) employee.contract = {};
    employee.contract.qiwaContractId = employee.qiwa.contractId;
    await employee.save();

    logger.info(`[GovIntegration] Qiwa contract registered for employee ${employeeId}`);
    return { success: true, employee: employee.toObject(), qiwaResult: result };
  }

  /**
   * التحقق من موظف عبر قوى
   */
  async verifyEmployeeInQiwa(employeeId) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).lean();
    if (!employee) throw new Error('الموظف غير موجود');

    const identifier = employee.iqamaNumber || employee.nationalId;
    if (!identifier) throw new Error('لا يوجد رقم هوية أو إقامة');

    let verification;
    if (employee.iqamaNumber) {
      verification = await getQiwa().verifyEmployeeByIqama(employee.iqamaNumber);
    } else {
      verification = await getQiwa().verifyEmployeeByNationalId(employee.nationalId);
    }

    return {
      employeeId: employee.employeeId,
      fullName: `${employee.firstName} ${employee.lastName}`,
      verification,
    };
  }

  /**
   * الحصول على حالة العقد في قوى
   */
  async getEmployeeQiwaStatus(employeeId) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).lean();
    if (!employee) throw new Error('الموظف غير موجود');

    let contractDetails = null;
    if (employee.qiwa?.contractId) {
      try {
        contractDetails = await getQiwa().getContract(employee.qiwa.contractId);
      } catch (err) {
        logger.warn(`[GovIntegration] Could not fetch Qiwa contract: ${err.message}`);
      }
    }

    return {
      employeeId: employee.employeeId,
      fullName: `${employee.firstName} ${employee.lastName}`,
      qiwa: employee.qiwa || {},
      contractDetails,
    };
  }

  /**
   * تحديث أجر موظف في حماية الأجور
   */
  async updateEmployeeWageInQiwa(employeeId, wageData) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    const identifier = employee.iqamaNumber || employee.nationalId;
    if (!identifier) throw new Error('لا يوجد رقم هوية أو إقامة');

    const result = await getQiwa().updateEmployeeWage(identifier, {
      basicSalary: wageData.basicSalary || employee.salary?.base,
      housingAllowance: wageData.housingAllowance || 0,
      transportAllowance: wageData.transportAllowance || 0,
      effectiveDate: wageData.effectiveDate || new Date(),
      ...wageData,
    });

    if (employee.qiwa) {
      employee.qiwa.wageProtectionStatus = 'compliant';
      employee.qiwa.lastWageSubmission = new Date();
    }
    await employee.save();

    return { success: true, employee: employee.toObject(), qiwaResult: result };
  }

  /**
   * إرسال كشف رواتب لنظام حماية الأجور
   */
  async submitPayrollToWPS(payrollData) {
    return getQiwa().submitPayrollToWPS(payrollData);
  }

  /**
   * الحصول على حالة نطاقات المنشأة
   */
  async getNitaqatStatus() {
    return getQiwa().getNitaqatStatus();
  }

  /**
   * تقرير الامتثال — نطاقات
   */
  async getNitaqatCompliance() {
    return getQiwa().getNitaqatCompliance();
  }

  /**
   * الحصول على السجل العمالي لموظف
   */
  async getEmployeeLaborRecord(employeeId) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).lean();
    if (!employee) throw new Error('الموظف غير موجود');

    const identifier = employee.iqamaNumber || employee.nationalId;
    if (!identifier) throw new Error('لا يوجد رقم هوية أو إقامة');

    return getQiwa().getEmployeeLaborRecord(identifier);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  التكامل الموحّد — Unified Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * لوحة التكامل الحكومي الشاملة
   */
  async getGovernmentComplianceDashboard() {
    const Emp = getEmployee();
    const employees = await Emp.find({ status: 'active' }).lean();

    const totalEmployees = employees.length;
    const saudiEmployees = employees.filter(
      e => (e.nationality || '').includes('سعودي') || e.nationality === 'Saudi'
    ).length;
    const foreignEmployees = totalEmployees - saudiEmployees;

    // GOSI stats
    const gosiRegistered = employees.filter(
      e => e.gosi?.status === 'active' || e.gosi?.status === 'مسجل'
    ).length;
    const gosiPending = employees.filter(e => e.gosi?.status === 'pending').length;
    const gosiUnregistered = totalEmployees - gosiRegistered - gosiPending;

    // Qiwa stats
    const qiwaActive = employees.filter(
      e => e.qiwa?.contractStatus === 'active' || e.qiwa?.contractStatus === 'نشط'
    ).length;
    const qiwaPending = employees.filter(e => e.qiwa?.contractStatus === 'pending').length;

    // WPS stats
    const wpsCompliant = employees.filter(
      e => e.qiwa?.wageProtectionStatus === 'compliant' || e.qiwa?.wageProtectionStatus === 'ملتزم'
    ).length;

    // Saudization rate
    const saudizationRate =
      totalEmployees > 0 ? Math.round((saudiEmployees / totalEmployees) * 10000) / 100 : 0;

    // Expiring documents
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringWorkPermits = employees.filter(
      e =>
        e.mol?.workPermitExpiry &&
        new Date(e.mol.workPermitExpiry) <= thirtyDaysFromNow &&
        new Date(e.mol.workPermitExpiry) >= now
    ).length;
    const expiringIqamas = employees.filter(
      e =>
        e.sponsorship?.visaExpiry &&
        new Date(e.sponsorship.visaExpiry) <= thirtyDaysFromNow &&
        new Date(e.sponsorship.visaExpiry) >= now
    ).length;
    const expiringPassports = employees.filter(
      e =>
        e.sponsorship?.passportExpiry &&
        new Date(e.sponsorship.passportExpiry) <= thirtyDaysFromNow &&
        new Date(e.sponsorship.passportExpiry) >= now
    ).length;
    const expiringContracts = employees.filter(
      e =>
        e.contract?.endDate &&
        new Date(e.contract.endDate) <= thirtyDaysFromNow &&
        new Date(e.contract.endDate) >= now
    ).length;

    // GOSI total contributions
    const totalGOSIEmployeeShare = employees.reduce((s, e) => s + (e.gosi?.employeeShare || 0), 0);
    const totalGOSIEmployerShare = employees.reduce((s, e) => s + (e.gosi?.employerShare || 0), 0);

    // Compliance score
    const gosiComplianceScore =
      totalEmployees > 0 ? Math.round((gosiRegistered / totalEmployees) * 100) : 0;
    const qiwaComplianceScore =
      totalEmployees > 0 ? Math.round((qiwaActive / totalEmployees) * 100) : 0;
    const wpsComplianceScore =
      totalEmployees > 0 ? Math.round((wpsCompliant / totalEmployees) * 100) : 0;
    const overallScore = Math.round(
      (gosiComplianceScore + qiwaComplianceScore + wpsComplianceScore) / 3
    );

    let nitaqatStatus = null;
    try {
      nitaqatStatus = await getQiwa().getNitaqatStatus();
    } catch (err) {
      logger.warn(`[GovIntegration] Nitaqat status unavailable: ${err.message}`);
    }

    return {
      summary: {
        totalEmployees,
        saudiEmployees,
        foreignEmployees,
        saudizationRate,
      },
      gosi: {
        registered: gosiRegistered,
        pending: gosiPending,
        unregistered: gosiUnregistered,
        complianceScore: gosiComplianceScore,
        totalEmployeeShare: Math.round(totalGOSIEmployeeShare * 100) / 100,
        totalEmployerShare: Math.round(totalGOSIEmployerShare * 100) / 100,
      },
      qiwa: {
        activeContracts: qiwaActive,
        pendingContracts: qiwaPending,
        complianceScore: qiwaComplianceScore,
      },
      wps: {
        compliant: wpsCompliant,
        nonCompliant: totalEmployees - wpsCompliant,
        complianceScore: wpsComplianceScore,
      },
      nitaqat: nitaqatStatus,
      expiringDocuments: {
        workPermits: expiringWorkPermits,
        iqamas: expiringIqamas,
        passports: expiringPassports,
        contracts: expiringContracts,
        total: expiringWorkPermits + expiringIqamas + expiringPassports + expiringContracts,
      },
      overallComplianceScore: overallScore,
      generatedAt: new Date(),
    };
  }

  /**
   * التسجيل الشامل لموظف جديد في جميع الجهات
   */
  async fullGovernmentRegistration(employeeId) {
    const results = { gosi: null, qiwa: null, errors: [] };

    try {
      results.gosi = await this.registerEmployeeGOSI(employeeId);
    } catch (err) {
      results.errors.push({ service: 'GOSI', error: err.message });
      logger.error(`[GovIntegration] GOSI registration failed: ${err.message}`);
    }

    try {
      results.qiwa = await this.registerEmployeeQiwaContract(employeeId);
    } catch (err) {
      results.errors.push({ service: 'Qiwa', error: err.message });
      logger.error(`[GovIntegration] Qiwa registration failed: ${err.message}`);
    }

    return {
      success: results.errors.length === 0,
      ...results,
    };
  }

  /**
   * المزامنة الجماعية — تسجيل جميع الموظفين غير المسجلين
   */
  async bulkSyncGovernmentRegistrations() {
    const Emp = getEmployee();
    const unregistered = await Emp.find({
      status: 'active',
      $or: [{ 'gosi.status': { $in: ['pending', null] } }, { 'gosi.status': { $exists: false } }],
    });

    const results = { total: unregistered.length, succeeded: 0, failed: 0, details: [] };

    for (const emp of unregistered) {
      try {
        await this.fullGovernmentRegistration(emp._id);
        results.succeeded++;
        results.details.push({ employeeId: emp.employeeId, status: 'success' });
      } catch (err) {
        results.failed++;
        results.details.push({ employeeId: emp.employeeId, status: 'failed', error: err.message });
      }
    }

    logger.info(
      `[GovIntegration] Bulk sync completed: ${results.succeeded}/${results.total} succeeded`
    );
    return results;
  }

  /**
   * حالة التكامل الحكومي لموظف واحد
   */
  async getEmployeeGovernmentStatus(employeeId) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).lean();
    if (!employee) throw new Error('الموظف غير موجود');

    const isSaudi =
      (employee.nationality || '').includes('سعودي') || employee.nationality === 'Saudi';

    return {
      employeeId: employee.employeeId,
      fullName: `${employee.firstName} ${employee.lastName}`,
      nationality: employee.nationality,
      isSaudi,
      nationalId: employee.nationalId,
      iqamaNumber: employee.iqamaNumber,
      gosi: {
        ...(employee.gosi || {}),
        isRegistered: ['active', 'مسجل'].includes(employee.gosi?.status),
      },
      mol: employee.mol || {},
      qiwa: {
        ...(employee.qiwa || {}),
        hasActiveContract: ['active', 'نشط'].includes(employee.qiwa?.contractStatus),
      },
      sponsorship: employee.sponsorship || {},
      alerts: this._generateAlerts(employee),
    };
  }

  /**
   * إنهاء خدمة موظف — إلغاء جميع الاشتراكات
   */
  async terminateEmployeeGovernment(employeeId, reason = 'إنهاء خدمات') {
    const results = { gosi: null, qiwa: null, errors: [] };

    try {
      results.gosi = await this.cancelEmployeeGOSI(employeeId, reason);
    } catch (err) {
      results.errors.push({ service: 'GOSI', error: err.message });
    }

    // Update employee status
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (employee) {
      if (employee.qiwa) employee.qiwa.contractStatus = 'terminated';
      employee.status = 'terminated';
      await employee.save();
    }

    return { success: results.errors.length === 0, ...results };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  مساعدات داخلية
  // ═══════════════════════════════════════════════════════════════════════════

  _generateAlerts(employee) {
    const alerts = [];
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    // GOSI alerts
    if (!employee.gosi || !['active', 'مسجل'].includes(employee.gosi.status)) {
      alerts.push({
        type: 'danger',
        category: 'gosi',
        message: 'الموظف غير مسجل في التأمينات الاجتماعية',
      });
    }

    // Qiwa alerts
    if (!employee.qiwa || !['active', 'نشط'].includes(employee.qiwa.contractStatus)) {
      alerts.push({ type: 'warning', category: 'qiwa', message: 'لا يوجد عقد نشط في منصة قوى' });
    }

    // WPS alerts
    if (
      employee.qiwa?.wageProtectionStatus === 'non-compliant' ||
      employee.qiwa?.wageProtectionStatus === 'غير ملتزم'
    ) {
      alerts.push({ type: 'danger', category: 'wps', message: 'عدم الالتزام بنظام حماية الأجور' });
    }

    // Work permit expiry
    if (
      employee.mol?.workPermitExpiry &&
      new Date(employee.mol.workPermitExpiry) - now < thirtyDays
    ) {
      alerts.push({ type: 'warning', category: 'mol', message: 'تصريح العمل ينتهي قريباً' });
    }

    // Visa expiry
    if (
      employee.sponsorship?.visaExpiry &&
      new Date(employee.sponsorship.visaExpiry) - now < thirtyDays
    ) {
      alerts.push({ type: 'warning', category: 'sponsorship', message: 'التأشيرة تنتهي قريباً' });
    }

    // Passport expiry
    if (
      employee.sponsorship?.passportExpiry &&
      new Date(employee.sponsorship.passportExpiry) - now < thirtyDays
    ) {
      alerts.push({ type: 'warning', category: 'sponsorship', message: 'جواز السفر ينتهي قريباً' });
    }

    // Contract expiry
    if (employee.contract?.endDate && new Date(employee.contract.endDate) - now < thirtyDays) {
      alerts.push({ type: 'warning', category: 'contract', message: 'العقد ينتهي قريباً' });
    }

    return alerts;
  }
}

module.exports = new GovernmentIntegrationService();
