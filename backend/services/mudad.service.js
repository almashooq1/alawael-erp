/**
 * خدمة منصة مُدد - نظام حماية الأجور
 * Mudad Platform Service - Wage Protection System (WPS)
 *
 * يوفر التكامل الكامل مع منصة مُدد لحماية الأجور
 */

const logger = require('../utils/logger');
const {
  MudadSalaryRecord,
  MudadBatch,
  MudadConfig,
  MudadComplianceReport,
} = require('../models/mudad.models');

class MudadService {
  constructor() {
    this.WPS_FILE_VERSION = '1.0';
    this.BANK_CODES = {
      SABB: '45',
      ALRAJHI: '80',
      SNB: '10',
      ALINMA: '05',
      ALBILAD: '15',
      ALAHLI: '10',
      RIYAD: '20',
      BSF: '55',
      SIB: '65',
      JAZIRA: '60',
    };
  }

  // ============================================================
  // إدارة الإعدادات — Configuration Management
  // ============================================================

  /**
   * الحصول على إعدادات مُدد للمنشأة
   */
  async getConfig(organizationId) {
    try {
      let config = await MudadConfig.findOne({ organizationId, isActive: true });
      if (!config) {
        return {
          exists: false,
          message: 'لم يتم إعداد تكامل مُدد بعد',
        };
      }
      return { exists: true, config };
    } catch (error) {
      logger.error('Error fetching Mudad config:', error);
      throw error;
    }
  }

  /**
   * حفظ أو تحديث إعدادات مُدد
   */
  async saveConfig(organizationId, configData, userId) {
    try {
      const config = await MudadConfig.findOneAndUpdate(
        { organizationId },
        {
          ...configData,
          organizationId,
          updatedBy: userId,
        },
        { upsert: true, new: true, runValidators: true }
      );
      logger.info(`Mudad config saved for org: ${organizationId}`);
      return config;
    } catch (error) {
      logger.error('Error saving Mudad config:', error);
      throw error;
    }
  }

  // ============================================================
  // إعداد سجلات الرواتب — Salary Records Preparation
  // ============================================================

  /**
   * توليد سجلات الرواتب من بيانات الرواتب الشهرية
   */
  async generateSalaryRecords(salaryMonth, establishmentId, userId) {
    try {
      const Payroll = require('mongoose').model('Payroll');
      const Employee = require('mongoose').model('Employee');

      // جلب بيانات الرواتب للشهر
      const payrollRecords = await Payroll.find({
        month: salaryMonth,
        status: { $in: ['approved', 'processed'] },
      }).populate('employee');

      if (!payrollRecords.length) {
        return { success: false, message: 'لا توجد سجلات رواتب معتمدة لهذا الشهر' };
      }

      const records = [];
      const errors = [];

      for (const payroll of payrollRecords) {
        try {
          const employee = payroll.employee || (await Employee.findById(payroll.employeeId));
          if (!employee) {
            errors.push({ employeeId: payroll.employeeId, message: 'الموظف غير موجود' });
            continue;
          }

          // التحقق من وجود IBAN
          if (!employee.bankIban && !employee.iban) {
            errors.push({
              employeeId: employee._id,
              message: `الموظف ${employee.name?.ar || employee.fullName} ليس لديه IBAN`,
            });
            continue;
          }

          const record = await MudadSalaryRecord.findOneAndUpdate(
            { employee: employee._id, salaryMonth },
            {
              employee: employee._id,
              employeeNationalId: employee.nationalId || employee.idNumber || '',
              employeeName: {
                ar: employee.name?.ar || employee.fullName || '',
                en: employee.name?.en || employee.fullNameEn || '',
              },
              salaryMonth,
              basicSalary: payroll.basicSalary || 0,
              housingAllowance: payroll.housingAllowance || 0,
              transportAllowance: payroll.transportAllowance || 0,
              otherAllowances: payroll.otherAllowances || 0,
              totalSalary: payroll.totalSalary || payroll.grossSalary || 0,
              deductions: payroll.totalDeductions || 0,
              netSalary: payroll.netSalary || 0,
              bankCode: employee.bankCode || '',
              bankName: employee.bankName || '',
              iban: employee.bankIban || employee.iban || '',
              establishmentId,
              branch: employee.branch,
              createdBy: userId,
              $push: {
                auditLog: {
                  action: 'generated',
                  performedBy: userId,
                  details: { source: 'payroll_sync' },
                },
              },
            },
            { upsert: true, new: true }
          );

          records.push(record);
        } catch (err) {
          errors.push({ employeeId: payroll.employeeId, message: err.message });
        }
      }

      logger.info(
        `Generated ${records.length} Mudad salary records for ${salaryMonth}, ${errors.length} errors`
      );

      return {
        success: true,
        generated: records.length,
        errors: errors.length,
        errorDetails: errors,
      };
    } catch (error) {
      logger.error('Error generating Mudad salary records:', error);
      throw error;
    }
  }

  /**
   * الحصول على سجلات الرواتب لشهر معين
   */
  async getSalaryRecords(salaryMonth, establishmentId, filters = {}) {
    try {
      const query = { salaryMonth, establishmentId, isDeleted: false };
      if (filters.status) query.paymentStatus = filters.status;
      if (filters.mudadStatus) query.mudadStatus = filters.mudadStatus;
      if (filters.branch) query.branch = filters.branch;

      const records = await MudadSalaryRecord.find(query)
        .populate('employee', 'name fullName nationalId idNumber department')
        .populate('branch', 'name code')
        .sort({ employeeName: 1 });

      const summary = {
        total: records.length,
        totalAmount: records.reduce((sum, r) => sum + r.netSalary, 0),
        byStatus: {},
        byMudadStatus: {},
      };

      records.forEach(r => {
        summary.byStatus[r.paymentStatus] = (summary.byStatus[r.paymentStatus] || 0) + 1;
        summary.byMudadStatus[r.mudadStatus] = (summary.byMudadStatus[r.mudadStatus] || 0) + 1;
      });

      return { records, summary };
    } catch (error) {
      logger.error('Error fetching Mudad salary records:', error);
      throw error;
    }
  }

  // ============================================================
  // إدارة الدفعات — Batch Management
  // ============================================================

  /**
   * إنشاء دفعة جديدة للرفع لمُدد
   */
  async createBatch(salaryMonth, establishmentId, userId) {
    try {
      // جلب السجلات الجاهزة
      const records = await MudadSalaryRecord.find({
        salaryMonth,
        establishmentId,
        mudadStatus: 'draft',
        paymentStatus: 'pending',
        isDeleted: false,
      });

      if (!records.length) {
        return { success: false, message: 'لا توجد سجلات جاهزة للرفع' };
      }

      // إنشاء رقم دفعة فريد
      const batchNumber = `MDD-${establishmentId}-${salaryMonth}-${Date.now().toString(36).toUpperCase()}`;

      const batch = await MudadBatch.create({
        batchNumber,
        salaryMonth,
        establishmentId,
        totalEmployees: records.length,
        totalAmount: records.reduce((sum, r) => sum + r.netSalary, 0),
        pendingCount: records.length,
        status: 'draft',
        fileFormat: 'WPS',
        deadline: this._calculateDeadline(salaryMonth),
        createdBy: userId,
        auditLog: [
          {
            action: 'created',
            performedBy: userId,
            details: { employeeCount: records.length },
          },
        ],
      });

      // ربط السجلات بالدفعة
      await MudadSalaryRecord.updateMany(
        { _id: { $in: records.map(r => r._id) } },
        { mudadBatchId: batch.batchNumber }
      );

      return { success: true, batch };
    } catch (error) {
      logger.error('Error creating Mudad batch:', error);
      throw error;
    }
  }

  /**
   * توليد ملف WPS
   */
  async generateWPSFile(batchId) {
    try {
      const batch = await MudadBatch.findById(batchId);
      if (!batch) throw new Error('الدفعة غير موجودة');

      const records = await MudadSalaryRecord.find({
        mudadBatchId: batch.batchNumber,
        isDeleted: false,
      });

      // بناء ملف WPS (Salary Information File)
      const header = this._buildSIFHeader(batch, records);
      const body = records.map(r => this._buildSIFRecord(r));
      const fileContent = [header, ...body].join('\n');

      batch.status = 'generated';
      batch.generatedAt = new Date();
      batch.fileSize = Buffer.byteLength(fileContent, 'utf-8');
      batch.auditLog.push({ action: 'file_generated', performedAt: new Date() });
      await batch.save();

      return { success: true, fileContent, batch };
    } catch (error) {
      logger.error('Error generating WPS file:', error);
      throw error;
    }
  }

  /**
   * التحقق من صحة الدفعة قبل الرفع
   */
  async validateBatch(batchId) {
    try {
      const batch = await MudadBatch.findById(batchId);
      if (!batch) throw new Error('الدفعة غير موجودة');

      const records = await MudadSalaryRecord.find({
        mudadBatchId: batch.batchNumber,
        isDeleted: false,
      });

      const errors = [];
      const warnings = [];

      for (const record of records) {
        // تحقق من IBAN
        if (!record.iban || !/^SA\d{22}$/.test(record.iban)) {
          errors.push({
            employeeId: record.employeeNationalId,
            field: 'iban',
            message: 'رقم IBAN غير صحيح',
            severity: 'error',
          });
        }

        // تحقق من الهوية
        if (!record.employeeNationalId) {
          errors.push({
            employeeId: record.employee?.toString(),
            field: 'nationalId',
            message: 'رقم الهوية مفقود',
            severity: 'error',
          });
        }

        // تحقق من الراتب
        if (record.netSalary <= 0) {
          warnings.push({
            employeeId: record.employeeNationalId,
            field: 'netSalary',
            message: 'صافي الراتب صفر أو سالب',
            severity: 'warning',
          });
        }

        // تحقق من رمز البنك
        if (!record.bankCode) {
          errors.push({
            employeeId: record.employeeNationalId,
            field: 'bankCode',
            message: 'رمز البنك مفقود',
            severity: 'error',
          });
        }
      }

      batch.validationErrors = [...errors, ...warnings];
      batch.status = errors.length === 0 ? 'validated' : 'draft';
      batch.auditLog.push({
        action: 'validated',
        performedAt: new Date(),
        details: { errors: errors.length, warnings: warnings.length },
      });
      await batch.save();

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        totalRecords: records.length,
      };
    } catch (error) {
      logger.error('Error validating Mudad batch:', error);
      throw error;
    }
  }

  /**
   * رفع الدفعة لمُدد (محاكاة API)
   */
  async uploadBatch(batchId, userId) {
    try {
      const batch = await MudadBatch.findById(batchId);
      if (!batch) throw new Error('الدفعة غير موجودة');
      if (batch.status !== 'validated' && batch.status !== 'generated') {
        throw new Error('الدفعة يجب أن تكون تم التحقق منها قبل الرفع');
      }

      // محاكاة الرفع (في الإنتاج يتم الربط مع API مُدد الفعلي)
      batch.status = 'uploaded';
      batch.uploadedAt = new Date();
      batch.approvedBy = userId;
      batch.approvedAt = new Date();
      batch.auditLog.push({
        action: 'uploaded',
        performedBy: userId,
        performedAt: new Date(),
      });
      await batch.save();

      // تحديث حالة السجلات
      await MudadSalaryRecord.updateMany(
        { mudadBatchId: batch.batchNumber },
        {
          mudadStatus: 'uploaded',
          paymentStatus: 'submitted',
          $push: {
            auditLog: {
              action: 'uploaded_to_mudad',
              performedBy: userId,
              performedAt: new Date(),
            },
          },
        }
      );

      return { success: true, batch };
    } catch (error) {
      logger.error('Error uploading Mudad batch:', error);
      throw error;
    }
  }

  /**
   * الحصول على قائمة الدفعات
   */
  async getBatches(establishmentId, filters = {}) {
    try {
      const query = { establishmentId, isDeleted: false };
      if (filters.status) query.status = filters.status;
      if (filters.salaryMonth) query.salaryMonth = filters.salaryMonth;

      const batches = await MudadBatch.find(query)
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 });

      return batches;
    } catch (error) {
      logger.error('Error fetching Mudad batches:', error);
      throw error;
    }
  }

  // ============================================================
  // تقارير الامتثال — Compliance Reports
  // ============================================================

  /**
   * توليد تقرير امتثال شهري
   */
  async generateComplianceReport(reportMonth, establishmentId, userId) {
    try {
      const records = await MudadSalaryRecord.find({
        salaryMonth: reportMonth,
        establishmentId,
        isDeleted: false,
      });

      if (!records.length) {
        return { success: false, message: 'لا توجد سجلات لهذا الشهر' };
      }

      const totalEmployees = records.length;
      const paidOnTime = records.filter(r => r.paymentStatus === 'paid' && r.paymentDate).length;
      const paidLate =
        records.filter(r => r.paymentStatus === 'paid' && r.mudadStatus === 'accepted').length -
        paidOnTime;
      const unpaid = records.filter(
        r => r.paymentStatus === 'pending' || r.paymentStatus === 'rejected'
      ).length;
      const partiallyPaid = records.filter(r => r.paymentStatus === 'returned').length;

      const complianceRate =
        totalEmployees > 0 ? ((paidOnTime + Math.max(0, paidLate)) / totalEmployees) * 100 : 0;
      const onTimePaymentRate = totalEmployees > 0 ? (paidOnTime / totalEmployees) * 100 : 0;

      // تحديد المخالفات
      const violations = [];
      for (const record of records) {
        if (record.paymentStatus === 'pending') {
          violations.push({
            type: 'missing_payment',
            employeeId: record.employee,
            employeeName: record.employeeName?.ar || '',
            details: `لم يتم دفع راتب ${record.salaryMonth}`,
            severity: 'high',
          });
        }
        if (record.paymentStatus === 'rejected') {
          violations.push({
            type: 'incorrect_amount',
            employeeId: record.employee,
            employeeName: record.employeeName?.ar || '',
            details: record.mudadRejectionReason || 'مرفوض',
            severity: 'critical',
          });
        }
      }

      const overallRisk =
        complianceRate >= 95
          ? 'low'
          : complianceRate >= 80
            ? 'medium'
            : complianceRate >= 60
              ? 'high'
              : 'critical';

      const report = await MudadComplianceReport.findOneAndUpdate(
        { reportMonth, establishmentId },
        {
          reportMonth,
          establishmentId,
          complianceRate: Math.round(complianceRate * 100) / 100,
          onTimePaymentRate: Math.round(onTimePaymentRate * 100) / 100,
          fullPaymentRate: complianceRate,
          totalEmployees,
          paidOnTime: Math.max(0, paidOnTime),
          paidLate: Math.max(0, paidLate),
          unpaid,
          partiallyPaid,
          violations,
          status: 'generated',
          overallRisk,
          generatedBy: userId,
          generatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      return { success: true, report };
    } catch (error) {
      logger.error('Error generating Mudad compliance report:', error);
      throw error;
    }
  }

  /**
   * الحصول على تقارير الامتثال
   */
  async getComplianceReports(establishmentId, filters = {}) {
    try {
      const query = { establishmentId };
      if (filters.year) {
        query.reportMonth = { $regex: `^${filters.year}` };
      }

      const reports = await MudadComplianceReport.find(query)
        .populate('generatedBy', 'name email')
        .sort({ reportMonth: -1 });

      return reports;
    } catch (error) {
      logger.error('Error fetching compliance reports:', error);
      throw error;
    }
  }

  /**
   * إحصائيات لوحة التحكم
   */
  async getDashboardStats(establishmentId) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);

      const [currentRecords, lastRecords, latestBatch, latestCompliance] = await Promise.all([
        MudadSalaryRecord.find({ establishmentId, salaryMonth: currentMonth, isDeleted: false }),
        MudadSalaryRecord.find({ establishmentId, salaryMonth: lastMonth, isDeleted: false }),
        MudadBatch.findOne({ establishmentId, isDeleted: false }).sort({ createdAt: -1 }),
        MudadComplianceReport.findOne({ establishmentId }).sort({ reportMonth: -1 }),
      ]);

      return {
        currentMonth: {
          month: currentMonth,
          totalEmployees: currentRecords.length,
          totalAmount: currentRecords.reduce((s, r) => s + r.netSalary, 0),
          paid: currentRecords.filter(r => r.paymentStatus === 'paid').length,
          pending: currentRecords.filter(r => r.paymentStatus === 'pending').length,
          rejected: currentRecords.filter(r => r.paymentStatus === 'rejected').length,
        },
        lastMonth: {
          month: lastMonth,
          totalEmployees: lastRecords.length,
          totalAmount: lastRecords.reduce((s, r) => s + r.netSalary, 0),
        },
        latestBatch: latestBatch
          ? {
              batchNumber: latestBatch.batchNumber,
              status: latestBatch.status,
              date: latestBatch.createdAt,
            }
          : null,
        compliance: latestCompliance
          ? {
              rate: latestCompliance.complianceRate,
              risk: latestCompliance.overallRisk,
              month: latestCompliance.reportMonth,
            }
          : null,
      };
    } catch (error) {
      logger.error('Error fetching Mudad dashboard stats:', error);
      throw error;
    }
  }

  // ============================================================
  // أدوات مساعدة — Utility Methods
  // ============================================================

  _buildSIFHeader(batch, records) {
    const totalAmount = records.reduce((s, r) => s + r.netSalary, 0);
    return [
      'HDR',
      batch.establishmentId.padEnd(15),
      batch.salaryMonth.replace('-', ''),
      records.length.toString().padStart(6, '0'),
      totalAmount.toFixed(2).padStart(15, '0'),
      new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      this.WPS_FILE_VERSION,
    ].join('|');
  }

  _buildSIFRecord(record) {
    return [
      'REC',
      (record.employeeNationalId || '').padEnd(15),
      (record.iban || '').padEnd(24),
      record.basicSalary.toFixed(2).padStart(12, '0'),
      record.housingAllowance.toFixed(2).padStart(12, '0'),
      record.otherAllowances.toFixed(2).padStart(12, '0'),
      record.deductions.toFixed(2).padStart(12, '0'),
      record.netSalary.toFixed(2).padStart(12, '0'),
    ].join('|');
  }

  _calculateDeadline(salaryMonth) {
    const [year, month] = salaryMonth.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return new Date(nextYear, nextMonth - 1, 3); // اليوم الثالث من الشهر التالي
  }
}

module.exports = new MudadService();
