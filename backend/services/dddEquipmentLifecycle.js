'use strict';
/**
 * EquipmentLifecycle Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddEquipmentLifecycle.js
 */

const {
  DDDEquipmentAsset,
  DDDMaintenanceRecord,
  DDDCalibrationLog,
  DDDDisposalRecord,
  EQUIPMENT_CATEGORIES,
  LIFECYCLE_STAGES,
  MAINTENANCE_TYPES,
  CONDITION_RATINGS,
  WARRANTY_TYPES,
  COMPLIANCE_STANDARDS,
  BUILTIN_EQUIPMENT_TEMPLATES,
} = require('../models/DddEquipmentLifecycle');

const BaseCrudService = require('./base/BaseCrudService');

class EquipmentLifecycle extends BaseCrudService {
  constructor() {
    super('EquipmentLifecycle', {}, {
      equipmentAssets: DDDEquipmentAsset,
      maintenanceRecords: DDDMaintenanceRecord,
      calibrationLogs: DDDCalibrationLog,
      disposalRecords: DDDDisposalRecord,
    });
  }

  async createAsset(data) { return this._create(DDDEquipmentAsset, data); }
  async listAssets(filter = {}, page = 1, limit = 20) { return this._list(DDDEquipmentAsset, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateAsset(id, data) { return this._update(DDDEquipmentAsset, id, data); }

  async createMaintenance(data) { return this._create(DDDMaintenanceRecord, data); }
  async listMaintenance(filter = {}, page = 1, limit = 20) { return this._list(DDDMaintenanceRecord, filter, { page: page, limit: limit, sort: { scheduledDate: -1 } }); }

  async createCalibration(data) { return this._create(DDDCalibrationLog, data); }
  async listCalibrations(filter = {}, page = 1, limit = 20) { return this._list(DDDCalibrationLog, filter, { page: page, limit: limit, sort: { calibrationDate: -1 } }); }

  async createDisposal(data) { return this._create(DDDDisposalRecord, data); }
  async listDisposals(filter = {}, page = 1, limit = 20) { return this._list(DDDDisposalRecord, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async getLifecycleStats() {
    const [assets, overdue, calibrations, disposals] = await Promise.all([
      DDDEquipmentAsset.countDocuments({ lifecycleStage: 'in_service' }),
      DDDMaintenanceRecord.countDocuments({ status: 'overdue' }),
      DDDCalibrationLog.countDocuments({ result: 'pass' }),
      DDDDisposalRecord.countDocuments(),
    ]);
    return {
      activeAssets: assets,
      overdueMaintenance: overdue,
      passedCalibrations: calibrations,
      totalDisposals: disposals,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new EquipmentLifecycle();
