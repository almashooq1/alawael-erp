/**
 * Muqeem Service — خدمة مقيم (وزارة الداخلية)
 * الاستعلام عن بيانات الإقامة، تجديدها، إصدار تأشيرات الخروج والعودة
 */
'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

const MUQEEM_API_URL = process.env.MUQEEM_API_URL || 'https://api.muqeem.sa';
const MUQEEM_USERNAME = process.env.MUQEEM_USERNAME || '';
const MUQEEM_PASSWORD = process.env.MUQEEM_PASSWORD || '';
const MUQEEM_ESTABLISHMENT_ID = process.env.MUQEEM_ESTABLISHMENT_ID || '';

class MuqeemService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.client = axios.create({
      baseURL: MUQEEM_API_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  /** الحصول على توكن المصادقة */
  async authenticate() {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }
    try {
      const response = await this.client.post('/auth/token', {
        username: MUQEEM_USERNAME,
        password: MUQEEM_PASSWORD,
        establishmentId: MUQEEM_ESTABLISHMENT_ID,
      });
      this.token = response.data?.token || response.data?.access_token;
      // افتراض صلاحية التوكن 55 دقيقة
      this.tokenExpiry = Date.now() + 55 * 60 * 1000;
      return this.token;
    } catch (err) {
      logger.error('[Muqeem] Authentication failed:', err.message);
      throw new Error('Muqeem authentication failed: ' + err.message);
    }
  }

  /** رأس الطلب المصادق */
  async authHeaders() {
    const token = await this.authenticate();
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * استعلام عن بيانات إقامة موظف
   * @param {string} iqamaNumber - رقم الإقامة
   */
  async getResidenceInfo(iqamaNumber) {
    try {
      const headers = await this.authHeaders();
      const response = await this.client.get(`/residence/info/${iqamaNumber}`, { headers });
      return { success: true, data: response.data };
    } catch (err) {
      logger.error('[Muqeem] getResidenceInfo error:', err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  /**
   * الاستعلام عن قائمة موظفي المنشأة
   */
  async getEstablishmentWorkers(page = 1, limit = 50) {
    try {
      const headers = await this.authHeaders();
      const response = await this.client.get('/establishment/workers', {
        headers,
        params: { establishmentId: MUQEEM_ESTABLISHMENT_ID, page, limit },
      });
      return { success: true, data: response.data };
    } catch (err) {
      logger.error('[Muqeem] getEstablishmentWorkers error:', err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  /**
   * تجديد إقامة موظف
   * @param {string} iqamaNumber
   * @param {string} renewalPeriod - مدة التجديد (سنة، سنتين)
   */
  async renewResidence(iqamaNumber, renewalPeriod = '1year') {
    try {
      const headers = await this.authHeaders();
      const response = await this.client.post(
        '/residence/renew',
        {
          iqamaNumber,
          establishmentId: MUQEEM_ESTABLISHMENT_ID,
          renewalPeriod,
        },
        { headers }
      );
      return { success: true, data: response.data };
    } catch (err) {
      logger.error('[Muqeem] renewResidence error:', err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  /**
   * إصدار تأشيرة خروج وعودة
   * @param {string} iqamaNumber
   * @param {Object} visaDetails - تفاصيل التأشيرة
   */
  async issueExitReEntryVisa(iqamaNumber, visaDetails = {}) {
    try {
      const headers = await this.authHeaders();
      const response = await this.client.post(
        '/visa/exit-reentry',
        {
          iqamaNumber,
          establishmentId: MUQEEM_ESTABLISHMENT_ID,
          duration: visaDetails.duration || '90days',
          numberOfTrips: visaDetails.numberOfTrips || 'multiple',
          purpose: visaDetails.purpose || 'personal',
        },
        { headers }
      );
      return { success: true, data: response.data };
    } catch (err) {
      logger.error('[Muqeem] issueExitReEntryVisa error:', err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  /**
   * إصدار تأشيرة خروج نهائي
   * @param {string} iqamaNumber
   */
  async issueFinalExitVisa(iqamaNumber) {
    try {
      const headers = await this.authHeaders();
      const response = await this.client.post(
        '/visa/final-exit',
        {
          iqamaNumber,
          establishmentId: MUQEEM_ESTABLISHMENT_ID,
        },
        { headers }
      );
      return { success: true, data: response.data };
    } catch (err) {
      logger.error('[Muqeem] issueFinalExitVisa error:', err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  /**
   * الحصول على الموظفين الذين تنتهي إقاماتهم قريباً
   * @param {number} daysAhead - عدد الأيام للتنبيه المبكر
   */
  async getExpiringResidencies(daysAhead = 90) {
    try {
      const headers = await this.authHeaders();
      const response = await this.client.get('/residence/expiring', {
        headers,
        params: { establishmentId: MUQEEM_ESTABLISHMENT_ID, daysAhead },
      });
      return { success: true, data: response.data };
    } catch (err) {
      logger.error('[Muqeem] getExpiringResidencies error:', err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  /**
   * تغيير مهنة موظف
   * @param {string} iqamaNumber
   * @param {string} newOccupation - المهنة الجديدة
   */
  async changeOccupation(iqamaNumber, newOccupation) {
    try {
      const headers = await this.authHeaders();
      const response = await this.client.post(
        '/worker/change-occupation',
        {
          iqamaNumber,
          establishmentId: MUQEEM_ESTABLISHMENT_ID,
          newOccupation,
        },
        { headers }
      );
      return { success: true, data: response.data };
    } catch (err) {
      logger.error('[Muqeem] changeOccupation error:', err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }
}

module.exports = new MuqeemService();
