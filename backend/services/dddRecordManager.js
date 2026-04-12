'use strict';
/**
 * RecordManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddRecordManager.js
 */

const {
  DDDClinicalRecord,
  DDDRecordCategory,
  DDDRecordRetention,
  DDDRecordAuditLog,
  RECORD_TYPES,
  RECORD_STATUSES,
  RETENTION_PERIODS,
  RECORD_SOURCES,
  AUDIT_ACTION_TYPES,
  SENSITIVITY_LEVELS,
  BUILTIN_RECORD_CATEGORIES,
} = require('../models/DddRecordManager');

const BaseCrudService = require('./base/BaseCrudService');

class RecordManager extends BaseCrudService {
  constructor() {
    super('RecordManager', {
      description: 'Clinical & administrative record lifecycle management',
      version: '1.0.0',
    }, {
      clinicalRecords: DDDClinicalRecord,
      recordCategorys: DDDRecordCategory,
      recordRetentions: DDDRecordRetention,
      recordAuditLogs: DDDRecordAuditLog,
    })
  }

  async initialize() {
    await this._seedCategories();
    this.log('Record Manager initialised ✓');
    return true;
  }

  async _seedCategories() {
    for (const c of BUILTIN_RECORD_CATEGORIES) {
      const exists = await DDDRecordCategory.findOne({ code: c.code }).lean();
      if (!exists) await DDDRecordCategory.create(c);
    }
  }

  /* ── Records ── */
  async listRecords(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.categoryId) q.categoryId = filters.categoryId;
    return DDDClinicalRecord.find(q).sort({ createdAt: -1 }).limit(100).lean();
  }
  async getRecord(id) { return this._getById(DDDClinicalRecord, id); }
  async createRecord(data) {
    if (!data.recordCode) data.recordCode = `REC-${Date.now()}`;
    return DDDClinicalRecord.create(data);
  }
  async updateRecord(id, data) { return this._update(DDDClinicalRecord, id, data, { runValidators: true }); }
  async amendRecord(id, amendment) {
    const record = await DDDClinicalRecord.findById(id);
    if (!record) return null;
    record.amendments.push({ ...amendment, version: record.version + 1 });
    record.version += 1;
    record.status = 'amended';
    return record.save();
  }
  async lockRecord(id, userId) {
    return DDDClinicalRecord.findByIdAndUpdate(
      id,
      { status: 'locked', lockedAt: new Date(), lockedBy: userId },
      { new: true }
    ).lean();
  }
  async searchRecords(query) {
    return DDDClinicalRecord.find({ title: { $regex: query, $options: 'i' } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }

  /* ── Categories ── */
  async listCategories() { return this._list(DDDRecordCategory, { isActive: true }, { sort: { name: 1 } }); }
  async createCategory(data) { return this._create(DDDRecordCategory, data); }

  /* ── Retention ── */
  async listRetentions() {
    return DDDRecordRetention.find({ isActive: true }).lean();
  }
  async createRetention(data) {
    if (!data.retentionCode) data.retentionCode = `RET-${Date.now()}`;
    return DDDRecordRetention.create(data);
  }
  async updateRetention(id, data) { return this._update(DDDRecordRetention, id, data); }

  /* ── Audit Log ── */
  async listAuditLogs(recordId) {
    return DDDRecordAuditLog.find({ recordId }).sort({ createdAt: -1 }).lean();
  }
  async logAudit(data) { return this._create(DDDRecordAuditLog, data); }

  /* ── Analytics ── */
  async getRecordAnalytics() {
    const [records, categories, retentions, auditLogs] = await Promise.all([
      DDDClinicalRecord.countDocuments(),
      DDDRecordCategory.countDocuments(),
      DDDRecordRetention.countDocuments(),
      DDDRecordAuditLog.countDocuments(),
    ]);
    return { records, categories, retentions, auditLogs };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new RecordManager();
