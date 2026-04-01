/**
 * ContractService — خدمة إدارة عقود العمل الإلكترونية (منصة قوى)
 *
 * يشمل:
 * - إنشاء عقود العمل وحفظها
 * - رفع العقود لمنصة قوى للتوثيق
 * - إدارة حالة العقد (مسودة → انتظار → نشط → منتهي)
 * - توليد رقم عقد فريد
 *
 * @module services/contract
 */
'use strict';

const { EmploymentContract } = require('../models/nitaqat.models');
const axios = require('axios');
const logger = require('../utils/logger');

const QIWA_BASE_URL = process.env.QIWA_API_URL || 'https://api.qiwa.sa/api/v1';
const QIWA_CLIENT_ID = process.env.QIWA_CLIENT_ID || '';
const QIWA_CLIENT_SECRET = process.env.QIWA_CLIENT_SECRET || '';

// مدة التذكرة (ثانية) - 58 دقيقة
const TOKEN_TTL_SECONDS = 3480;
let _qiwaTokenCache = { token: null, expiry: 0 };

class ContractService {
  // =========================================================================
  // إنشاء عقد
  // =========================================================================

  /**
   * إنشاء عقد عمل جديد (مسودة)
   * @param {string} employeeId    - معرّف الموظف
   * @param {string} organizationId
   * @param {Object} data          - بيانات العقد
   * @param {string} createdBy
   * @returns {Promise<EmploymentContract>}
   */
  async createContract(employeeId, organizationId, data, createdBy) {
    const contractNumber = await this._generateContractNumber(organizationId);

    // فترة التجربة: 90 يوماً من تاريخ البدء
    const startDate = new Date(data.startDate);
    const probationEndDate = new Date(startDate);
    probationEndDate.setDate(probationEndDate.getDate() + 90);

    const totalSalary =
      Number(data.basicSalary || 0) +
      Number(data.housingAllowance || 0) +
      Number(data.transportAllowance || 0) +
      Number(data.otherAllowances || 0);

    const contract = await EmploymentContract.create({
      employee: employeeId,
      organization: organizationId,
      contractNumber,
      contractType: data.contractType || 'indefinite',
      startDate,
      endDate: data.endDate ? new Date(data.endDate) : null,
      probationEndDate,
      jobTitleAr: data.jobTitleAr || data.jobTitle,
      jobTitleEn: data.jobTitleEn,
      occupationCode: data.occupationCode,
      basicSalary: Number(data.basicSalary),
      housingAllowance: Number(data.housingAllowance || 0),
      transportAllowance: Number(data.transportAllowance || 0),
      otherAllowances: Number(data.otherAllowances || 0),
      totalSalary,
      workingHoursPerWeek: Number(data.workingHours || 48),
      annualLeaveDays: Number(data.annualLeave || 21),
      workLocation: data.workLocation,
      additionalTerms: data.additionalTerms,
      status: 'draft',
      createdBy,
    });

    logger.info(`[Contract] Created contract ${contractNumber} for employee ${employeeId}`);
    return contract;
  }

  // =========================================================================
  // رفع العقد لمنصة قوى
  // =========================================================================

  /**
   * رفع العقد لمنصة قوى للتوثيق
   * @param {string} contractId
   * @param {Object} employeeData   - بيانات الموظف (رقم الهوية/الإقامة)
   * @param {Object} organizationData - بيانات المنشأة (رقم المنشأة)
   * @returns {Promise<EmploymentContract>}
   */
  async submitToQiwa(contractId, employeeData, organizationData) {
    const contract = await EmploymentContract.findById(contractId);
    if (!contract) throw new Error('العقد غير موجود');

    if (contract.status !== 'draft') {
      throw new Error(`لا يمكن رفع عقد بحالة: ${contract.status}`);
    }

    try {
      const token = await this._getQiwaToken();

      const idNumber =
        employeeData.nationalId || employeeData.iqamaNumber || employeeData.nationalIdNumber;

      const payload = {
        employee_id_number: idNumber,
        establishment_number: organizationData.establishmentNumber,
        contract_type: contract.contractType,
        start_date: contract.startDate.toISOString().split('T')[0],
        end_date: contract.endDate ? contract.endDate.toISOString().split('T')[0] : null,
        job_title: contract.jobTitleAr,
        job_title_en: contract.jobTitleEn,
        occupation_code: contract.occupationCode,
        basic_salary: contract.basicSalary,
        housing_allowance: contract.housingAllowance,
        transport_allowance: contract.transportAllowance,
        other_allowances: contract.otherAllowances,
        working_hours: contract.workingHoursPerWeek,
        annual_leave: contract.annualLeaveDays,
        work_location: contract.workLocation,
        additional_terms: contract.additionalTerms,
      };

      const response = await axios.post(`${QIWA_BASE_URL}/contracts`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const qiwaContractId = response.data?.contract_id || response.data?.id;

      await contract.updateOne({
        qiwaContractId,
        status: 'pending_employee',
        employerSignedDate: new Date(),
        updatedBy: employeeData.updatedBy,
      });

      logger.info(
        `[Contract] Submitted to Qiwa: contractId=${contractId}, qiwaId=${qiwaContractId}`
      );
      return contract.toObject();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      logger.error(`[Contract] Qiwa submission failed: ${errMsg}`);

      // في بيئة التطوير نُحاكي النجاح
      if (process.env.NODE_ENV !== 'production') {
        const mockQiwaId = `QIWA-MOCK-${Date.now()}`;
        await contract.updateOne({
          qiwaContractId: mockQiwaId,
          status: 'pending_employee',
          employerSignedDate: new Date(),
        });
        logger.warn(`[Contract] Mock Qiwa submission: ${mockQiwaId}`);
        return contract.toObject();
      }

      throw new Error(`فشل رفع العقد لقوى: ${errMsg}`);
    }
  }

  // =========================================================================
  // تحديث حالة العقد
  // =========================================================================
  async updateStatus(contractId, status, updatedBy) {
    const allowed = [
      'draft',
      'pending_employee',
      'pending_employer',
      'active',
      'expired',
      'terminated',
      'cancelled',
      'pending_qiwa',
      'authenticated',
    ];
    if (!allowed.includes(status)) throw new Error('حالة عقد غير صالحة');

    const update = { status, updatedBy };
    if (status === 'authenticated') update.qiwaAuthenticationDate = new Date();
    if (status === 'active') update.employeeSignedDate = new Date();

    return EmploymentContract.findByIdAndUpdate(contractId, update, { new: true });
  }

  // =========================================================================
  // جلب العقود
  // =========================================================================
  async getContracts(organizationId, filters = {}) {
    const query = { organization: organizationId };
    if (filters.status) query.status = filters.status;
    if (filters.employeeId) query.employee = filters.employeeId;
    if (filters.contractType) query.contractType = filters.contractType;

    return EmploymentContract.find(query)
      .sort({ createdAt: -1 })
      .populate('employee', 'fullNameAr nationalId iqamaNumber')
      .lean();
  }

  async getContract(contractId) {
    return EmploymentContract.findById(contractId)
      .populate('employee', 'fullNameAr nationalId iqamaNumber phone')
      .lean();
  }

  async getEmployeeActiveContract(employeeId) {
    return EmploymentContract.findOne({
      employee: employeeId,
      status: { $in: ['active', 'authenticated', 'pending_employee'] },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  // =========================================================================
  // إحصاءات العقود
  // =========================================================================
  async getStats(organizationId) {
    const [total, byStatus] = await Promise.all([
      EmploymentContract.countDocuments({ organization: organizationId }),
      EmploymentContract.aggregate([
        {
          $match: {
            organization: require('mongoose').Types.ObjectId.createFromHexString
              ? organizationId
              : organizationId,
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    // العقود المنتهية قريباً (خلال 30 يوم)
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiringSoon = await EmploymentContract.countDocuments({
      organization: organizationId,
      status: 'active',
      contractType: 'definite',
      endDate: { $lte: soon, $gte: new Date() },
    });

    return { total, byStatus, expiringSoon };
  }

  // =========================================================================
  // دوال داخلية
  // =========================================================================

  async _generateContractNumber(organizationId) {
    const year = new Date().getFullYear();
    const count = await EmploymentContract.countDocuments({
      organization: organizationId,
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`),
      },
    });
    const seq = String(count + 1).padStart(6, '0');
    return `CTR-${year}-${seq}`;
  }

  async _getQiwaToken() {
    const now = Date.now() / 1000;
    if (_qiwaTokenCache.token && _qiwaTokenCache.expiry > now) {
      return _qiwaTokenCache.token;
    }

    const response = await axios.post(
      `${QIWA_BASE_URL}/auth/token`,
      { client_id: QIWA_CLIENT_ID, client_secret: QIWA_CLIENT_SECRET },
      { timeout: 10000 }
    );

    const token = response.data?.access_token;
    _qiwaTokenCache = { token, expiry: now + TOKEN_TTL_SECONDS };
    return token;
  }
}

module.exports = new ContractService();
