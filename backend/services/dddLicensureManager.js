'use strict';
/**
 * LicensureManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddLicensureManager.js
 */

const {
  DDDInstitutionalLicense,
  DDDRenewalTracking,
  DDDRegulatoryReport,
  DDDLicenseAlert,
  LICENSE_TYPES,
  LICENSE_STATUSES,
  REGULATORY_BODIES,
  RENEWAL_STATUSES,
  REPORTING_FREQUENCIES,
  DOCUMENT_CATEGORIES,
  BUILTIN_LICENSE_TEMPLATES,
} = require('../models/DddLicensureManager');

const BaseCrudService = require('./base/BaseCrudService');

class LicensureManager extends BaseCrudService {
  constructor() {
    super('LicensureManager', {}, {
      institutionalLicenses: DDDInstitutionalLicense,
      renewalTrackings: DDDRenewalTracking,
      regulatoryReports: DDDRegulatoryReport,
      licenseAlerts: DDDLicenseAlert,
    });
  }

  /* ── Licenses ── */
  async createLicense(data) { return this._create(DDDInstitutionalLicense, data); }
  async listLicenses(filter = {}, page = 1, limit = 20) { return this._list(DDDInstitutionalLicense, filter, { page: page, limit: limit, sort: { expiryDate: 1 } }); }
  async getLicenseById(id) { return this._getById(DDDInstitutionalLicense, id); }
  async updateLicense(id, data) { return this._update(DDDInstitutionalLicense, id, data); }

  /* ── Renewals ── */
  async createRenewal(data) { return this._create(DDDRenewalTracking, data); }
  async listRenewals(filter = {}, page = 1, limit = 20) { return this._list(DDDRenewalTracking, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateRenewal(id, data) { return this._update(DDDRenewalTracking, id, data); }

  /* ── Reports ── */
  async createReport(data) { return this._create(DDDRegulatoryReport, data); }
  async listReports(filter = {}, page = 1, limit = 20) { return this._list(DDDRegulatoryReport, filter, { page: page, limit: limit, sort: { dueDate: -1 } }); }
  async updateReport(id, data) { return this._update(DDDRegulatoryReport, id, data); }

  /* ── Alerts ── */
  async createAlert(data) { return this._create(DDDLicenseAlert, data); }
  async listAlerts(filter = {}) { return this._list(DDDLicenseAlert, filter, { sort: { triggerDate: -1 } }); }
  async acknowledgeAlert(id, userId) {
    return DDDLicenseAlert.findByIdAndUpdate(
      id,
      { acknowledgedBy: userId, acknowledgedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Expiring Licenses ── */
  async getExpiringLicenses(daysAhead = 60) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return DDDInstitutionalLicense.find({ expiryDate: { $lte: cutoff }, status: 'active' })
      .sort({ expiryDate: 1 })
      .lean();
  }

  /* ── Analytics ── */
  async getLicenseSummary() {
    const [total, active, expired, pending] = await Promise.all([
      DDDInstitutionalLicense.countDocuments(),
      DDDInstitutionalLicense.countDocuments({ status: 'active' }),
      DDDInstitutionalLicense.countDocuments({ status: 'expired' }),
      DDDInstitutionalLicense.countDocuments({ status: 'pending_renewal' }),
    ]);
    return { total, active, expired, pendingRenewal: pending };
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new LicensureManager();
