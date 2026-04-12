'use strict';
/**
 * PatientPortal Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddPatientPortal.js
 */

const {
  DDDPortalAccount,
  DDDSecureMessage,
  DDDSharedDocument,
  DDDPatientPreference,
  PORTAL_ACCOUNT_STATUSES,
  MESSAGE_CATEGORIES,
  NOTIFICATION_CHANNELS,
  DOCUMENT_TYPES,
  PREFERENCE_CATEGORIES,
  ACCESS_FEATURES,
  BUILTIN_PORTAL_CONFIGS,
} = require('../models/DddPatientPortal');

const BaseCrudService = require('./base/BaseCrudService');

class PatientPortal extends BaseCrudService {
  constructor() {
    super('PatientPortal', {}, {
      portalAccounts: DDDPortalAccount,
      secureMessages: DDDSecureMessage,
      sharedDocuments: DDDSharedDocument,
      patientPreferences: DDDPatientPreference,
    });
  }

  async createAccount(data) { return this._create(DDDPortalAccount, data); }
  async listAccounts(filter = {}, page = 1, limit = 20) { return this._list(DDDPortalAccount, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async getAccountById(id) { return this._getById(DDDPortalAccount, id); }
  async updateAccount(id, data) { return this._update(DDDPortalAccount, id, data); }

  async sendMessage(data) { return this._create(DDDSecureMessage, data); }
  async listMessages(filter = {}, page = 1, limit = 20) { return this._list(DDDSecureMessage, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async shareDocument(data) { return this._create(DDDSharedDocument, data); }
  async listDocuments(filter = {}, page = 1, limit = 20) { return this._list(DDDSharedDocument, filter, { page: page, limit: limit, sort: { sharedAt: -1 } }); }

  async setPreference(data) {
    return DDDPatientPreference.findOneAndUpdate(
      { portalAccountId: data.portalAccountId, category: data.category, key: data.key },
      data,
      { upsert: true, new: true }
    ).lean();
  }
  async getPreferences(portalAccountId) {
    return DDDPatientPreference.find({ portalAccountId }).lean();
  }

  async getPortalStats() {
    const [total, active, messages, documents] = await Promise.all([
      DDDPortalAccount.countDocuments(),
      DDDPortalAccount.countDocuments({ status: 'active' }),
      DDDSecureMessage.countDocuments(),
      DDDSharedDocument.countDocuments(),
    ]);
    return { total, active, messages, documents };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new PatientPortal();
