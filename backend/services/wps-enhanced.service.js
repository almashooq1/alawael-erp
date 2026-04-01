/**
 * WpsEnhancedService — خدمة حماية الأجور المحسّنة (WPS / مُدد)
 *
 * يشمل:
 * - توليد ملف SIF (Salary Information File)
 * - التحقق من الامتثال مع عقود قوى
 * - رفع البيانات لمنصة مُدد
 * - تقارير الامتثال
 *
 * @module services/wps-enhanced
 */
'use strict';

const { WpsRecord } = require('../models/nitaqat.models');
const logger = require('../utils/logger');

class WpsEnhancedService {
  // =========================================================================
  // توليد ملف SIF
  // =========================================================================

  /**
   * إنشاء سجل WPS وملف SIF من بيانات الرواتب
   * @param {Object} organization   - بيانات المنشأة
   * @param {string} period         - الفترة YYYY-MM
   * @param {Array}  payrollItems   - بنود مسير الرواتب
   * @param {string} generatedBy    - معرّف المستخدم
   * @returns {Promise<{record, fileContent, fileName}>}
   */
  async generateSalaryFile(organization, period, payrollItems, generatedBy) {
    const totalEmployees = payrollItems.length;
    const paidItems = payrollItems.filter(i => Number(i.netSalary) > 0);
    const unpaidItems = payrollItems.filter(i => Number(i.netSalary) === 0);
    const totalAmount = payrollItems.reduce((s, i) => s + Number(i.netSalary || 0), 0);

    // بناء ملف SIF
    const { fileContent, fileName } = this._buildSifContent(organization, period, payrollItems);

    // حفظ / تحديث السجل
    const record = await WpsRecord.findOneAndUpdate(
      { organization: organization._id, period },
      {
        organization: organization._id,
        period,
        totalEmployees,
        paidEmployees: paidItems.length,
        unpaidEmployees: unpaidItems.length,
        totalAmount,
        paidAmount: paidItems.reduce((s, i) => s + Number(i.netSalary || 0), 0),
        bankFileReference: fileName,
        sifFileContent: fileContent,
        status: 'file_generated',
        generatedBy,
      },
      { upsert: true, new: true }
    );

    logger.info(
      `[WPS] SIF generated for org=${organization._id} period=${period} employees=${totalEmployees}`
    );

    return { record, fileContent, fileName };
  }

  // =========================================================================
  // التحقق من الامتثال مع WPS
  // =========================================================================

  /**
   * التحقق من امتثال بنود الرواتب مع متطلبات WPS وعقود قوى
   * @param {Array}  payrollItems - بنود مسير الرواتب (يجب أن تحتوي على employee+contract)
   * @returns {{isCompliant, totalEmployees, discrepancyCount, discrepancies}}
   */
  validateCompliance(payrollItems) {
    const discrepancies = [];

    for (const item of payrollItems) {
      const emp = item.employee || item;
      const contract = emp.activeContract || emp.contract;

      // لا يوجد عقد موثق
      if (!contract) {
        discrepancies.push({
          employeeId: emp._id || emp.id,
          employeeName: emp.fullNameAr || emp.name || '',
          type: 'no_contract',
          description: 'لا يوجد عقد عمل موثق في منصة قوى',
          severity: 'high',
        });
        continue;
      }

      // تباين الراتب الأساسي
      const payBasic = Number(item.basicSalary || 0);
      const contractBasic = Number(contract.basicSalary || 0);
      if (Math.abs(payBasic - contractBasic) > 1) {
        discrepancies.push({
          employeeId: emp._id || emp.id,
          employeeName: emp.fullNameAr || emp.name || '',
          type: 'salary_mismatch',
          description: `الراتب الأساسي في المسير (${payBasic.toFixed(2)}) يختلف عن العقد (${contractBasic.toFixed(2)})`,
          severity: 'medium',
        });
      }

      // لا يوجد IBAN
      if (!emp.iban && !emp.bankAccount) {
        discrepancies.push({
          employeeId: emp._id || emp.id,
          employeeName: emp.fullNameAr || emp.name || '',
          type: 'no_bank_account',
          description: 'لا يوجد رقم IBAN مسجل للموظف',
          severity: 'high',
        });
      }

      // راتب صافي أقل من الحد الأدنى (مثال: 4000 للسعوديين)
      const netSalary = Number(item.netSalary || 0);
      const isSaudi = (emp.nationalityCode || emp.nationality || '') === 'SA';
      if (isSaudi && netSalary > 0 && netSalary < 4000) {
        discrepancies.push({
          employeeId: emp._id || emp.id,
          employeeName: emp.fullNameAr || emp.name || '',
          type: 'below_minimum_wage',
          description: `الراتب الصافي (${netSalary.toFixed(2)}) أقل من 4,000 ريال للموظف السعودي`,
          severity: 'low',
        });
      }
    }

    const compliancePercentage =
      payrollItems.length > 0
        ? ((payrollItems.length - discrepancies.length) / payrollItems.length) * 100
        : 100;

    return {
      isCompliant: discrepancies.length === 0,
      totalEmployees: payrollItems.length,
      discrepancyCount: discrepancies.length,
      compliancePercentage: Math.round(compliancePercentage * 100) / 100,
      discrepancies,
    };
  }

  // =========================================================================
  // تسجيل رفع الملف لمُدد
  // =========================================================================
  async markAsUploaded(organizationId, period, uploadedBy, mudadNotes) {
    return WpsRecord.findOneAndUpdate(
      { organization: organizationId, period },
      {
        status: 'uploaded',
        uploadDate: new Date(),
        uploadedBy,
        mudadNotes,
      },
      { new: true }
    );
  }

  // =========================================================================
  // تسجيل نتيجة التطابق
  // =========================================================================
  async recordComplianceResult(organizationId, period, complianceData) {
    const status = complianceData.isCompliant ? 'compliant' : 'non_compliant';
    return WpsRecord.findOneAndUpdate(
      { organization: organizationId, period },
      {
        status,
        compliancePercentage: complianceData.compliancePercentage,
        discrepancies: complianceData.discrepancies,
        bankTransferDate: complianceData.bankTransferDate || null,
      },
      { new: true }
    );
  }

  // =========================================================================
  // جلب سجلات WPS للمنشأة
  // =========================================================================
  async getRecords(organizationId, filters = {}) {
    const query = { organization: organizationId };
    if (filters.status) query.status = filters.status;
    if (filters.year) query.period = { $regex: `^${filters.year}` };

    return WpsRecord.find(query).sort({ period: -1 }).lean();
  }

  async getRecord(organizationId, period) {
    return WpsRecord.findOne({ organization: organizationId, period }).lean();
  }

  // =========================================================================
  // لوحة التحكم — إحصاءات WPS
  // =========================================================================
  async getDashboardStats(organizationId) {
    const records = await WpsRecord.find({ organization: organizationId })
      .sort({ period: -1 })
      .limit(12)
      .lean();

    const compliant = records.filter(r => r.status === 'compliant').length;
    const total = records.length;

    return {
      totalRecords: total,
      compliantCount: compliant,
      nonCompliantCount: records.filter(r => r.status === 'non_compliant').length,
      pendingCount: records.filter(r => ['pending', 'file_generated'].includes(r.status)).length,
      overallComplianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0,
      recentRecords: records.slice(0, 6),
    };
  }

  // =========================================================================
  // دوال داخلية
  // =========================================================================

  /**
   * بناء محتوى ملف SIF بتنسيق CSV
   */
  _buildSifContent(organization, period, payrollItems) {
    const lines = [];

    // رأس الملف
    lines.push(
      [
        'EstablishmentNumber',
        'Period',
        'EmployeeId',
        'EmployeeName',
        'IdType',
        'IdNumber',
        'BankCode',
        'IBAN',
        'BasicSalary',
        'HousingAllowance',
        'TransportAllowance',
        'OtherAllowances',
        'TotalDeductions',
        'NetSalary',
        'PaymentDate',
        'Notes',
      ].join(',')
    );

    for (const item of payrollItems) {
      const emp = item.employee || item;
      const isSaudi = (emp.nationalityCode || emp.nationality || '') === 'SA';
      const idType = isSaudi ? 'NID' : 'IQA';
      const idNumber = isSaudi ? emp.nationalId || '' : emp.iqamaNumber || '';
      const name = (emp.fullNameAr || emp.name || '').replace(/"/g, '""');

      lines.push(
        [
          organization.establishmentNumber || '',
          period,
          emp._id || emp.id || '',
          `"${name}"`,
          idType,
          idNumber,
          emp.bankCode || '',
          emp.iban || emp.bankAccount || '',
          Number(item.basicSalary || 0).toFixed(2),
          Number(item.housingAllowance || 0).toFixed(2),
          Number(item.transportAllowance || 0).toFixed(2),
          Number(item.otherAllowances || 0).toFixed(2),
          Number(item.totalDeductions || 0).toFixed(2),
          Number(item.netSalary || 0).toFixed(2),
          item.paymentDate ? new Date(item.paymentDate).toISOString().split('T')[0] : '',
          item.notes || '',
        ].join(',')
      );
    }

    const fileContent = lines.join('\n');
    const estNum = organization.establishmentNumber || 'ORG';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `wps_${estNum}_${period}_${dateStr}.csv`;

    return { fileContent, fileName };
  }
}

module.exports = new WpsEnhancedService();
