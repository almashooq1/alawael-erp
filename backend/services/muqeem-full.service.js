/**
 * MuqeemFullService — خدمة مقيم الكاملة
 *
 * التكامل الكامل مع نظام مقيم (المديرية العامة للجوازات)
 * يشمل: إدارة الإقامات، التأشيرات، نقل الخدمات، نظام التنبيهات
 *
 * @module services/muqeem-full.service
 * @version 1.0.0
 */
'use strict';

const axios = require('axios');
const logger = require('../utils/logger');
const {
  EmployeeResidency,
  VisaRequest,
  MuqeemTransaction,
  TransferRequest,
} = require('../models/muqeem.models');

// ── إعدادات API مقيم ──────────────────────────────────────────────────────
const MUQEEM_BASE_URL = process.env.MUQEEM_API_URL || 'https://api.muqeem.sa/api/v1';
const MUQEEM_USERNAME = process.env.MUQEEM_USERNAME || '';
const MUQEEM_PASSWORD = process.env.MUQEEM_PASSWORD || '';
const MUQEEM_ESTABLISHMENT_NUMBER =
  process.env.MUQEEM_ESTABLISHMENT_NUMBER || process.env.MUQEEM_ESTABLISHMENT_ID || '';
const MOCK_MODE = process.env.MUQEEM_MOCK === 'true' || !MUQEEM_USERNAME;

// ── نسب التنبيه (أيام قبل الانتهاء) ─────────────────────────────────────
const IQAMA_ALERT_THRESHOLDS = [
  { days: 90, level: 'info' },
  { days: 60, level: 'warning' },
  { days: 30, level: 'urgent' },
  { days: 14, level: 'critical' },
  { days: 7, level: 'critical' },
  { days: 0, level: 'expired' },
];

const PASSPORT_ALERT_THRESHOLDS = [
  { days: 180, level: 'info' },
  { days: 90, level: 'warning' },
  { days: 30, level: 'critical' },
];

// ── دالة مساعدة: تحديد مستوى التنبيه ────────────────────────────────────
function resolveAlertLevel(daysLeft, thresholds) {
  let level = 'none';
  for (const t of [...thresholds].reverse()) {
    if (daysLeft <= t.days) {
      level = t.level;
      break;
    }
  }
  return level;
}

// ── دالة مساعدة: تحديد نوع المعاملة من الـ endpoint ────────────────────
function resolveTransactionType(endpoint, method) {
  if (endpoint.includes('/iqama/issue')) return 'iqama_issue';
  if (endpoint.includes('/iqama/renew')) return 'iqama_renew';
  if (endpoint.includes('/iqama/')) return 'iqama_query';
  if (endpoint.includes('/visa/exit-reentry') && endpoint.includes('extend')) return 'visa_extend';
  if (endpoint.includes('/visa/exit-reentry')) return 'visa_exit_reentry';
  if (endpoint.includes('/visa/final-exit')) return 'visa_final_exit';
  if (endpoint.includes('/visa/') && method === 'delete') return 'visa_cancel';
  if (endpoint.includes('/transfer/request')) return 'transfer_request';
  if (endpoint.includes('/transfer/release')) return 'transfer_release';
  if (endpoint.includes('/transfer/')) return 'transfer_query';
  if (endpoint.includes('/worker/change-occupation')) return 'occupation_change';
  if (endpoint.includes('/employee') || endpoint.includes('/workers')) return 'employee_query';
  if (endpoint.includes('/reports/')) return 'report_query';
  return 'employee_query';
}

class MuqeemFullService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.client = axios.create({
      baseURL: MUQEEM_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  // =========================================================================
  // المصادقة
  // =========================================================================

  /**
   * الحصول على token المصادقة مع التخزين المؤقت
   */
  async authenticate() {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    if (MOCK_MODE) {
      this.token = 'MOCK_TOKEN';
      this.tokenExpiry = Date.now() + 55 * 60 * 1000;
      return this.token;
    }

    try {
      const response = await this.client.post('/auth/login', {
        username: MUQEEM_USERNAME,
        password: MUQEEM_PASSWORD,
        establishment_number: MUQEEM_ESTABLISHMENT_NUMBER,
      });

      this.token = response.data?.access_token || response.data?.token;
      if (!this.token) throw new Error('لم يتم استلام token من مقيم');

      // التوكن صالح 55 دقيقة
      this.tokenExpiry = Date.now() + 55 * 60 * 1000;
      logger.info('[Muqeem] Authentication successful');
      return this.token;
    } catch (err) {
      logger.error('[Muqeem] Authentication failed:', err.message);
      throw new Error('فشل المصادقة مع مقيم: ' + err.message);
    }
  }

  /**
   * رؤوس الطلب مع Authorization
   */
  async _buildHeaders() {
    const token = await this.authenticate();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'ar',
      'X-Establishment-Number': MUQEEM_ESTABLISHMENT_NUMBER,
    };
  }

  // =========================================================================
  // المعاملة الأساسية مع التسجيل التلقائي
  // =========================================================================

  /**
   * إرسال طلب لـ API مقيم مع تسجيل المعاملة تلقائياً
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - بيانات الطلب
   * @param {string|null} employeeId - معرف الموظف
   * @param {Object} context - سياق إضافي (userId, ip)
   */
  async _makeRequest(method, endpoint, data = {}, employeeId = null, context = {}) {
    const transactionType = resolveTransactionType(endpoint, method);
    const startTime = Date.now();

    // إنشاء سجل المعاملة
    let transaction = null;
    try {
      transaction = await MuqeemTransaction.create({
        employee: employeeId,
        transactionType,
        requestData: data,
        status: 'pending',
        initiatedBy: context.userId || null,
        ipAddress: context.ip || null,
      });
    } catch (dbErr) {
      logger.warn('[Muqeem] Failed to create transaction record:', dbErr.message);
    }

    try {
      if (MOCK_MODE) {
        const mockResponse = this._generateMockResponse(endpoint, method, data);
        if (transaction) {
          await MuqeemTransaction.findByIdAndUpdate(transaction._id, {
            responseData: mockResponse,
            httpStatusCode: 200,
            status: 'success',
            referenceNumber: mockResponse.reference_number,
            processingTimeMs: Date.now() - startTime,
          });
        }
        return mockResponse;
      }

      const headers = await this._buildHeaders();
      let response;

      const url = MUQEEM_BASE_URL + endpoint;
      if (method === 'get') {
        response = await this.client.get(url, { headers, params: data });
      } else if (method === 'delete') {
        response = await this.client.delete(url, { headers, data });
      } else {
        response = await this.client[method](url, data, { headers });
      }

      if (transaction) {
        await MuqeemTransaction.findByIdAndUpdate(transaction._id, {
          responseData: response.data,
          httpStatusCode: response.status,
          status: 'success',
          referenceNumber: response.data?.reference_number,
          processingTimeMs: Date.now() - startTime,
        });
      }

      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      if (transaction) {
        await MuqeemTransaction.findByIdAndUpdate(transaction._id, {
          status: err.code === 'ECONNABORTED' ? 'timeout' : 'failed',
          errorMessage: errMsg,
          httpStatusCode: err.response?.status,
          processingTimeMs: Date.now() - startTime,
        });
      }
      logger.error(`[Muqeem] Request failed [${method.toUpperCase()} ${endpoint}]:`, errMsg);
      throw new Error('خطأ من مقيم: ' + errMsg);
    }
  }

  // =========================================================================
  // خدمات الإقامة
  // =========================================================================

  /**
   * استعلام عن إقامة وتحديث البيانات المحلية
   * @param {string} iqamaNumber - رقم الإقامة
   * @param {Object} context
   */
  async queryIqama(iqamaNumber, context = {}) {
    const response = await this._makeRequest('get', `/iqama/${iqamaNumber}`, {}, null, context);

    // تحديث البيانات المحلية
    const residency = await EmployeeResidency.findOne({ iqamaNumber });
    if (residency) {
      const updates = {
        muqeemData: response,
        updatedBy: context.userId,
      };
      if (response.expiry_date) updates.iqamaExpiryDate = new Date(response.expiry_date);
      if (response.occupation_code) updates.occupationCode = response.occupation_code;
      if (typeof response.is_inside_kingdom === 'boolean')
        updates.isInsideKingdom = response.is_inside_kingdom;
      if (response.status) updates.status = this._mapIqamaStatus(response.status);
      await EmployeeResidency.findByIdAndUpdate(residency._id, updates);
    }

    return response;
  }

  /**
   * إصدار إقامة جديدة لموظف
   * @param {string} employeeId
   * @param {Object} data - بيانات الإصدار
   * @param {Object} context
   */
  async issueIqama(employeeId, data, context = {}) {
    const requestData = {
      border_number: data.borderNumber,
      passport_number: data.passportNumber,
      passport_country: data.passportCountryCode,
      occupation_code: data.occupationCode,
      duration_years: data.durationYears || 1,
    };

    const response = await this._makeRequest(
      'post',
      '/iqama/issue',
      requestData,
      employeeId,
      context
    );

    // حفظ الإقامة في قاعدة البيانات
    const residency = await EmployeeResidency.create({
      employee: employeeId,
      organization: context.organizationId,
      iqamaNumber: response.iqama_number,
      borderNumber: data.borderNumber,
      passportNumber: data.passportNumber,
      passportCountryCode: data.passportCountryCode,
      passportIssueDate: data.passportIssueDate ? new Date(data.passportIssueDate) : undefined,
      passportExpiryDate: data.passportExpiryDate ? new Date(data.passportExpiryDate) : undefined,
      iqamaIssueDate: new Date(response.issue_date || Date.now()),
      iqamaExpiryDate: new Date(response.expiry_date),
      occupationCode: data.occupationCode,
      occupationNameAr: response.occupation_name_ar,
      sponsorId: MUQEEM_ESTABLISHMENT_NUMBER,
      status: 'active',
      renewalFee: response.fee,
      muqeemData: response,
      createdBy: context.userId,
    });

    logger.info(`[Muqeem] Iqama issued for employee ${employeeId}: ${response.iqama_number}`);
    return residency;
  }

  /**
   * تجديد إقامة
   * @param {string} iqamaNumber - رقم الإقامة
   * @param {number} durationYears - مدة التجديد بالسنوات
   * @param {Object} context
   */
  async renewIqama(iqamaNumber, durationYears = 1, context = {}) {
    const residency = await EmployeeResidency.findOne({ iqamaNumber });
    if (!residency) throw new Error(`لم يتم العثور على إقامة برقم: ${iqamaNumber}`);

    const response = await this._makeRequest(
      'post',
      '/iqama/renew',
      { iqama_number: iqamaNumber, duration_years: durationYears },
      residency.employee.toString(),
      context
    );

    // تحديث الإقامة المحلية
    await EmployeeResidency.findByIdAndUpdate(residency._id, {
      iqamaExpiryDate: new Date(response.new_expiry_date),
      status: 'active',
      renewalFee: response.fee,
      muqeemData: { ...residency.muqeemData, lastRenewal: response },
      alertLevel: 'none',
      lastAlertSent: null,
      updatedBy: context.userId,
    });

    // تسجيل رقم سداد إن وجد
    if (response.sadad_number) {
      await MuqeemTransaction.findOneAndUpdate(
        { employee: residency.employee, transactionType: 'iqama_renew', status: 'success' },
        { $set: { sadadNumber: response.sadad_number, feeAmount: response.fee } },
        { sort: { createdAt: -1 } }
      );
    }

    logger.info(`[Muqeem] Iqama renewed: ${iqamaNumber}, new expiry: ${response.new_expiry_date}`);
    return await EmployeeResidency.findById(residency._id);
  }

  /**
   * الاستعلام عن الإقامات المنتهية قريباً من مقيم
   * @param {number} withinDays
   * @param {Object} context
   */
  async getExpiringFromMuqeem(withinDays = 90, context = {}) {
    return this._makeRequest(
      'get',
      '/reports/iqama-expiry',
      { within_days: withinDays },
      null,
      context
    );
  }

  // =========================================================================
  // خدمات التأشيرات
  // =========================================================================

  /**
   * إصدار تأشيرة خروج وعودة
   * @param {string} employeeId
   * @param {Object} visaData - { type: 'single'|'multiple', durationDays, destination, purpose }
   * @param {Object} context
   */
  async issueExitReentryVisa(employeeId, visaData, context = {}) {
    const residency = await EmployeeResidency.findOne({
      employee: employeeId,
      status: 'active',
    });

    if (!residency) throw new Error('لا يوجد إقامة سارية لهذا الموظف');

    // إنشاء طلب التأشيرة في قاعدة البيانات
    const visaRequest = await VisaRequest.create({
      employee: employeeId,
      residency: residency._id,
      organization: context.organizationId,
      visaType: visaData.type === 'multiple' ? 'exit_reentry_multiple' : 'exit_reentry_single',
      requestDate: new Date(),
      durationDays: visaData.durationDays,
      destinationCountry: visaData.destination,
      purpose: visaData.purpose,
      status: 'pending',
      requestedBy: context.userId,
    });

    try {
      const response = await this._makeRequest(
        'post',
        '/visa/exit-reentry',
        {
          iqama_number: residency.iqamaNumber,
          visa_type: visaData.type,
          duration_days: visaData.durationDays || 90,
        },
        employeeId,
        context
      );

      await VisaRequest.findByIdAndUpdate(visaRequest._id, {
        visaNumber: response.visa_number,
        visaStartDate: response.start_date ? new Date(response.start_date) : undefined,
        visaEndDate: response.end_date ? new Date(response.end_date) : undefined,
        visaFee: response.fee,
        status: 'issued',
        muqeemRequestId: response.reference_number,
        muqeemResponse: response,
      });

      logger.info(
        `[Muqeem] Exit-reentry visa issued for employee ${employeeId}: ${response.visa_number}`
      );
      return await VisaRequest.findById(visaRequest._id);
    } catch (err) {
      await VisaRequest.findByIdAndUpdate(visaRequest._id, {
        status: 'rejected',
        rejectionReason: err.message,
      });
      throw err;
    }
  }

  /**
   * إصدار تأشيرة خروج نهائي
   * @param {string} employeeId
   * @param {string|null} reason
   * @param {Object} context
   */
  async issueFinalExitVisa(employeeId, reason = null, context = {}) {
    const residency = await EmployeeResidency.findOne({
      employee: employeeId,
      status: 'active',
    });

    if (!residency) throw new Error('لا يوجد إقامة سارية لهذا الموظف');

    const visaRequest = await VisaRequest.create({
      employee: employeeId,
      residency: residency._id,
      organization: context.organizationId,
      visaType: 'final_exit',
      requestDate: new Date(),
      purpose: reason,
      status: 'pending',
      requestedBy: context.userId,
    });

    try {
      const response = await this._makeRequest(
        'post',
        '/visa/final-exit',
        {
          iqama_number: residency.iqamaNumber,
          reason: reason,
        },
        employeeId,
        context
      );

      await VisaRequest.findByIdAndUpdate(visaRequest._id, {
        visaNumber: response.visa_number,
        visaStartDate: response.start_date ? new Date(response.start_date) : undefined,
        visaEndDate: response.end_date ? new Date(response.end_date) : undefined,
        status: 'issued',
        muqeemResponse: response,
      });

      // تحديث حالة الإقامة
      await EmployeeResidency.findByIdAndUpdate(residency._id, {
        status: 'final_exit',
        lastExitDate: new Date(),
        updatedBy: context.userId,
      });

      logger.info(`[Muqeem] Final exit visa issued for employee ${employeeId}`);
      return await VisaRequest.findById(visaRequest._id);
    } catch (err) {
      await VisaRequest.findByIdAndUpdate(visaRequest._id, {
        status: 'rejected',
        rejectionReason: err.message,
      });
      throw err;
    }
  }

  /**
   * إلغاء تأشيرة
   * @param {string} visaRequestId - معرف طلب التأشيرة
   * @param {Object} context
   */
  async cancelVisa(visaRequestId, context = {}) {
    const visa = await VisaRequest.findById(visaRequestId);
    if (!visa) throw new Error('التأشيرة غير موجودة');

    if (!['issued', 'approved'].includes(visa.status)) {
      throw new Error(`لا يمكن إلغاء تأشيرة بحالة: ${visa.status}`);
    }

    const response = await this._makeRequest(
      'delete',
      `/visa/${visa.visaNumber}/cancel`,
      {},
      visa.employee.toString(),
      context
    );

    await VisaRequest.findByIdAndUpdate(visaRequestId, {
      status: 'cancelled',
      muqeemResponse: response,
    });

    return await VisaRequest.findById(visaRequestId);
  }

  /**
   * تمديد تأشيرة خروج وعودة
   * @param {string} visaNumber
   * @param {number} additionalDays
   * @param {Object} context
   */
  async extendVisa(visaNumber, additionalDays, context = {}) {
    const visa = await VisaRequest.findOne({ visaNumber, status: 'issued' });
    if (!visa) throw new Error(`التأشيرة ${visaNumber} غير موجودة أو ليست سارية`);

    const response = await this._makeRequest(
      'post',
      '/visa/exit-reentry/extend',
      { visa_number: visaNumber, additional_days: additionalDays },
      visa.employee.toString(),
      context
    );

    await VisaRequest.findByIdAndUpdate(visa._id, {
      visaEndDate: response.new_end_date ? new Date(response.new_end_date) : visa.visaEndDate,
      muqeemResponse: response,
    });

    return await VisaRequest.findById(visa._id);
  }

  // =========================================================================
  // نقل الخدمات (الكفالة)
  // =========================================================================

  /**
   * طلب نقل خدمات (استقدام موظف من منشأة أخرى)
   * @param {string} employeeId
   * @param {string} fromEstablishment - رقم المنشأة المحوِّلة
   * @param {Object} context
   */
  async requestTransfer(employeeId, fromEstablishment, context = {}) {
    const residency = await EmployeeResidency.findOne({
      employee: employeeId,
      status: { $in: ['active', 'pending_transfer'] },
    });

    if (!residency) throw new Error('لا يوجد إقامة سارية لهذا الموظف');

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 15);

    const transfer = await TransferRequest.create({
      employee: employeeId,
      residency: residency._id,
      organization: context.organizationId,
      direction: 'incoming',
      fromEstablishment,
      toEstablishment: MUQEEM_ESTABLISHMENT_NUMBER,
      requestDate: new Date(),
      responseDeadline: deadline,
      status: 'pending_request',
      requestedBy: context.userId,
    });

    const response = await this._makeRequest(
      'post',
      '/transfer/request',
      {
        iqama_number: residency.iqamaNumber,
        from_establishment: fromEstablishment,
      },
      employeeId,
      context
    );

    await TransferRequest.findByIdAndUpdate(transfer._id, {
      muqeemRequestId: response.request_id,
      status: 'pending_approval',
      muqeemResponse: response,
    });

    // تحديث حالة الإقامة
    await EmployeeResidency.findByIdAndUpdate(residency._id, {
      status: 'pending_transfer',
    });

    logger.info(`[Muqeem] Transfer request created for employee ${employeeId}`);
    return await TransferRequest.findById(transfer._id);
  }

  /**
   * قبول نقل خدمات (تنازل عن موظف)
   * @param {string} transferId - معرف طلب النقل
   * @param {Object} context
   */
  async approveTransfer(transferId, context = {}) {
    const transfer = await TransferRequest.findById(transferId).populate('residency');
    if (!transfer) throw new Error('طلب النقل غير موجود');

    const response = await this._makeRequest(
      'post',
      '/transfer/release',
      {
        request_id: transfer.muqeemRequestId,
        action: 'approve',
      },
      transfer.employee.toString(),
      context
    );

    await TransferRequest.findByIdAndUpdate(transferId, {
      status: 'approved',
      approvedBy: context.userId,
      approvedAt: new Date(),
      muqeemResponse: response,
    });

    // تحديث حالة الإقامة
    await EmployeeResidency.findByIdAndUpdate(transfer.residency._id, {
      status: 'transferred',
    });

    logger.info(`[Muqeem] Transfer approved: ${transferId}`);
    return await TransferRequest.findById(transferId);
  }

  /**
   * رفض طلب نقل خدمات
   * @param {string} transferId
   * @param {string} reason
   * @param {Object} context
   */
  async rejectTransfer(transferId, reason, context = {}) {
    const transfer = await TransferRequest.findById(transferId).populate('residency');
    if (!transfer) throw new Error('طلب النقل غير موجود');

    const response = await this._makeRequest(
      'post',
      '/transfer/release',
      {
        request_id: transfer.muqeemRequestId,
        action: 'reject',
        reason,
      },
      transfer.employee.toString(),
      context
    );

    await TransferRequest.findByIdAndUpdate(transferId, {
      status: 'rejected',
      rejectionReason: reason,
      muqeemResponse: response,
    });

    // إعادة حالة الإقامة لـ active
    await EmployeeResidency.findByIdAndUpdate(transfer.residency._id, {
      status: 'active',
    });

    return await TransferRequest.findById(transferId);
  }

  /**
   * حالة طلب نقل
   * @param {string} muqeemRequestId
   * @param {Object} context
   */
  async getTransferStatus(muqeemRequestId, context = {}) {
    return this._makeRequest('get', `/transfer/status/${muqeemRequestId}`, {}, null, context);
  }

  // =========================================================================
  // الاستعلامات
  // =========================================================================

  /**
   * استعلام عن موظف بالجواز
   * @param {string} passportNumber
   * @param {Object} context
   */
  async queryByPassport(passportNumber, context = {}) {
    return this._makeRequest('get', `/passport/${passportNumber}`, {}, null, context);
  }

  /**
   * قائمة طلبات النقل المعلقة
   * @param {Object} context
   */
  async getPendingTransfers(context = {}) {
    return this._makeRequest('get', '/transfer/pending', {}, null, context);
  }

  /**
   * تقرير حالة التأشيرات
   * @param {Object} context
   */
  async getVisaStatusReport(context = {}) {
    return this._makeRequest('get', '/reports/visa-status', {}, null, context);
  }

  // =========================================================================
  // نظام التنبيهات الذكي
  // =========================================================================

  /**
   * فحص وإنشاء تنبيهات انتهاء الصلاحيات
   * يُنفَّذ يومياً عبر Cron Job
   * @returns {Object} - إحصائيات التنبيهات
   */
  async checkAndSendExpiryAlerts() {
    const stats = {
      iqamaAlerts: 0,
      passportAlerts: 0,
      visaAlerts: 0,
      errors: 0,
      details: [],
    };

    // ─── 1. تنبيهات انتهاء الإقامة ───────────────────────────────────────
    const expiringResidencies = await EmployeeResidency.find({
      status: 'active',
      iqamaExpiryDate: { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    }).populate('employee', 'name email phone nationalId iqamaNumber');

    for (const residency of expiringResidencies) {
      try {
        const daysLeft = Math.ceil(
          (residency.iqamaExpiryDate - new Date()) / (1000 * 60 * 60 * 24)
        );
        const level = resolveAlertLevel(daysLeft, IQAMA_ALERT_THRESHOLDS);

        if (level === 'none') continue;

        // تجنب إرسال نفس مستوى التنبيه أكثر من مرة في 24 ساعة
        const lastAlertAge = residency.lastAlertSent
          ? (Date.now() - residency.lastAlertSent) / (1000 * 60 * 60)
          : Infinity;

        const shouldSend =
          residency.alertLevel !== level ||
          (daysLeft <= 7 && lastAlertAge > 24) ||
          (daysLeft <= 30 && lastAlertAge > 48) ||
          lastAlertAge > 72;

        if (!shouldSend) continue;

        // تحديث مستوى التنبيه
        await EmployeeResidency.findByIdAndUpdate(residency._id, {
          alertLevel: level,
          lastAlertSent: new Date(),
        });

        const alertInfo = {
          type: 'iqama_expiry',
          level,
          employeeId: residency.employee?._id,
          employeeName: residency.employee?.name,
          iqamaNumber: residency.iqamaNumber,
          expiryDate: residency.iqamaExpiryDate,
          daysLeft: Math.max(0, daysLeft),
        };

        stats.details.push(alertInfo);
        stats.iqamaAlerts++;

        logger.info(
          `[Muqeem] Iqama expiry alert [${level}]: ${residency.iqamaNumber} (${daysLeft} days)`
        );
      } catch (err) {
        stats.errors++;
        logger.error('[Muqeem] Error processing iqama alert:', err.message);
      }
    }

    // ─── 2. تنبيهات انتهاء الجواز ────────────────────────────────────────
    const expiringPassports = await EmployeeResidency.find({
      status: 'active',
      passportExpiryDate: { $lte: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
    }).populate('employee', 'name email phone');

    for (const residency of expiringPassports) {
      try {
        const daysLeft = Math.ceil(
          (residency.passportExpiryDate - new Date()) / (1000 * 60 * 60 * 24)
        );
        const level = resolveAlertLevel(daysLeft, PASSPORT_ALERT_THRESHOLDS);

        if (level === 'none') continue;

        const alertInfo = {
          type: 'passport_expiry',
          level,
          employeeId: residency.employee?._id,
          employeeName: residency.employee?.name,
          passportNumber: residency.passportNumber,
          expiryDate: residency.passportExpiryDate,
          daysLeft: Math.max(0, daysLeft),
        };

        stats.details.push(alertInfo);
        stats.passportAlerts++;
      } catch (err) {
        stats.errors++;
        logger.error('[Muqeem] Error processing passport alert:', err.message);
      }
    }

    // ─── 3. تنبيهات التأشيرات المنتهية ──────────────────────────────────
    const expiringVisas = await VisaRequest.find({
      status: 'issued',
      visaEndDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    }).populate('employee', 'name email');

    for (const visa of expiringVisas) {
      try {
        const daysLeft = Math.ceil((visa.visaEndDate - new Date()) / (1000 * 60 * 60 * 24));
        const level = daysLeft <= 7 ? 'critical' : 'warning';

        const alertInfo = {
          type: 'visa_expiry',
          level,
          employeeId: visa.employee?._id,
          employeeName: visa.employee?.name,
          visaNumber: visa.visaNumber,
          visaType: visa.visaType,
          expiryDate: visa.visaEndDate,
          daysLeft: Math.max(0, daysLeft),
        };

        stats.details.push(alertInfo);
        stats.visaAlerts++;

        // تحديث حالة التأشيرات المنتهية
        if (daysLeft <= 0) {
          await VisaRequest.findByIdAndUpdate(visa._id, { status: 'expired' });
        }
      } catch (err) {
        stats.errors++;
        logger.error('[Muqeem] Error processing visa alert:', err.message);
      }
    }

    logger.info(
      `[Muqeem] Expiry alerts check completed: ${stats.iqamaAlerts} iqama, ` +
        `${stats.passportAlerts} passport, ${stats.visaAlerts} visa alerts`
    );

    return stats;
  }

  // =========================================================================
  // الاستعلامات المحلية (من قاعدة البيانات)
  // =========================================================================

  /**
   * قائمة الإقامات مع الفلاتر
   * @param {Object} filters
   */
  async getLocalResidencies(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.employeeId) query.employee = filters.employeeId;
    if (filters.organizationId) query.organization = filters.organizationId;
    if (filters.expiringDays) {
      query.iqamaExpiryDate = {
        $lte: new Date(Date.now() + filters.expiringDays * 24 * 60 * 60 * 1000),
      };
    }

    return EmployeeResidency.find(query)
      .populate('employee', 'name email nationalId iqamaNumber')
      .sort({ iqamaExpiryDate: 1 })
      .limit(filters.limit || 100)
      .skip(filters.skip || 0);
  }

  /**
   * تاريخ معاملات موظف مع مقيم
   * @param {string} employeeId
   */
  async getEmployeeTransactions(employeeId) {
    return MuqeemTransaction.find({ employee: employeeId }).sort({ createdAt: -1 }).limit(50);
  }

  /**
   * إحصائيات لوحة التحكم
   */
  async getDashboardStats(organizationId = null) {
    const baseQuery = organizationId ? { organization: organizationId } : {};

    const [
      totalResidencies,
      activeResidencies,
      expiredResidencies,
      expiringIn30,
      expiringIn90,
      pendingTransfers,
      activeVisas,
    ] = await Promise.all([
      EmployeeResidency.countDocuments(baseQuery),
      EmployeeResidency.countDocuments({ ...baseQuery, status: 'active' }),
      EmployeeResidency.countDocuments({ ...baseQuery, status: 'expired' }),
      EmployeeResidency.countDocuments({
        ...baseQuery,
        status: 'active',
        iqamaExpiryDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      EmployeeResidency.countDocuments({
        ...baseQuery,
        status: 'active',
        iqamaExpiryDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      }),
      TransferRequest.countDocuments({
        ...baseQuery,
        status: { $in: ['pending_request', 'pending_approval'] },
      }),
      VisaRequest.countDocuments({ ...baseQuery, status: 'issued' }),
    ]);

    return {
      totalResidencies,
      activeResidencies,
      expiredResidencies,
      expiringIn30,
      expiringIn90,
      pendingTransfers,
      activeVisas,
      complianceRate:
        totalResidencies > 0 ? Math.round((activeResidencies / totalResidencies) * 100) : 100,
    };
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  _mapIqamaStatus(muqeemStatus) {
    const map = {
      valid: 'active',
      active: 'active',
      expired: 'expired',
      cancelled: 'cancelled',
      transferred: 'transferred',
    };
    return map[muqeemStatus?.toLowerCase()] || 'active';
  }

  /**
   * توليد بيانات وهمية في وضع Mock
   */
  _generateMockResponse(endpoint, method, data) {
    const id = `MOCK-${Date.now()}`;
    const baseDate = new Date();

    if (endpoint.includes('/iqama/issue')) {
      return {
        success: true,
        iqama_number: `2${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        issue_date: baseDate.toISOString().split('T')[0],
        expiry_date: new Date(baseDate.setFullYear(baseDate.getFullYear() + 1))
          .toISOString()
          .split('T')[0],
        occupation_name_ar: 'مدير مشروع',
        fee: 650,
        sadad_number: `SADAD-${Date.now()}`,
        reference_number: id,
      };
    }

    if (endpoint.includes('/iqama/renew')) {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      return {
        success: true,
        new_expiry_date: expiry.toISOString().split('T')[0],
        fee: 650,
        sadad_number: `SADAD-${Date.now()}`,
        reference_number: id,
      };
    }

    if (endpoint.includes('/visa/final-exit')) {
      const end = new Date();
      end.setDate(end.getDate() + 30);
      return {
        success: true,
        visa_number: `FX-${Date.now()}`,
        start_date: new Date().toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        reference_number: id,
      };
    }

    if (endpoint.includes('/visa/exit-reentry')) {
      const end = new Date();
      end.setDate(end.getDate() + (data.duration_days || 90));
      return {
        success: true,
        visa_number: `ER-${Date.now()}`,
        start_date: new Date().toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        fee: 200,
        reference_number: id,
      };
    }

    if (endpoint.includes('/transfer/request')) {
      return {
        success: true,
        request_id: `TR-${Date.now()}`,
        reference_number: id,
        status: 'pending',
      };
    }

    if (endpoint.includes('/transfer/release')) {
      return { success: true, reference_number: id, status: 'approved' };
    }

    if (endpoint.includes('/iqama/')) {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      return {
        success: true,
        iqama_number: endpoint.split('/').pop(),
        status: 'valid',
        expiry_date: expiry.toISOString().split('T')[0],
        is_inside_kingdom: true,
        reference_number: id,
      };
    }

    return { success: true, reference_number: id, data: {} };
  }
}

module.exports = new MuqeemFullService();
