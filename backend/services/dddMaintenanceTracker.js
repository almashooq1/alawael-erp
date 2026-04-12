'use strict';
/**
 * MaintenanceTracker Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddMaintenanceTracker.js
 */

const {
  DDDWorkOrder,
  DDDPreventiveSchedule,
  DDDServiceRecord,
  DDDMaintenanceAsset,
  WORK_ORDER_TYPES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_PRIORITIES,
  PM_FREQUENCIES,
  SERVICE_CATEGORIES,
  ASSET_CONDITIONS,
  BUILTIN_ASSETS,
} = require('../models/DddMaintenanceTracker');

const BaseCrudService = require('./base/BaseCrudService');

class MaintenanceTracker extends BaseCrudService {
  constructor() {
    super('MaintenanceTracker', {
      description: 'Work orders, preventive maintenance & equipment service tracking',
      version: '1.0.0',
    }, {
      workOrders: DDDWorkOrder,
      preventiveSchedules: DDDPreventiveSchedule,
      serviceRecords: DDDServiceRecord,
      maintenanceAssets: DDDMaintenanceAsset,
    })
  }

  async initialize() {
    await this._seedAssets();
    this.log('Maintenance Tracker initialised ✓');
    return true;
  }

  async _seedAssets() {
    for (const a of BUILTIN_ASSETS) {
      const exists = await DDDMaintenanceAsset.findOne({ code: a.code }).lean();
      if (!exists) await DDDMaintenanceAsset.create({ ...a, isActive: true });
    }
  }

  /* ── Work Orders ── */
  async listWorkOrders(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    if (filters.type) q.type = filters.type;
    if (filters.buildingId) q.buildingId = filters.buildingId;
    if (filters.assignedTo) q.assignedTo = filters.assignedTo;
    return DDDWorkOrder.find(q).sort({ priority: -1, createdAt: -1 }).lean();
  }
  async getWorkOrder(id) { return this._getById(DDDWorkOrder, id); }

  async createWorkOrder(data) {
    if (!data.workOrderCode) data.workOrderCode = `WO-${Date.now()}`;
    return DDDWorkOrder.create(data);
  }
  async updateWorkOrder(id, data) { return this._update(DDDWorkOrder, id, data, { runValidators: true }); }
  async assignWorkOrder(id, userId, team) {
    return DDDWorkOrder.findByIdAndUpdate(
      id,
      {
        status: 'assigned',
        assignedTo: userId,
        assignedTeam: team,
      },
      { new: true }
    ).lean();
  }
  async startWorkOrder(id) {
    return DDDWorkOrder.findByIdAndUpdate(id, { status: 'in_progress' }, { new: true }).lean();
  }
  async completeWorkOrder(id, data = {}) {
    return DDDWorkOrder.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        completedDate: new Date(),
        actualHours: data.actualHours,
        actualCost: data.actualCost,
      },
      { new: true }
    ).lean();
  }
  async closeWorkOrder(id) {
    return DDDWorkOrder.findByIdAndUpdate(id, { status: 'closed' }, { new: true }).lean();
  }

  /* ── Preventive Schedules ── */
  async listPreventiveSchedules(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    if (filters.frequency) q.frequency = filters.frequency;
    return DDDPreventiveSchedule.find(q).sort({ nextDueDate: 1 }).lean();
  }
  async createPreventiveSchedule(data) {
    if (!data.code) data.code = `PM-${Date.now()}`;
    return DDDPreventiveSchedule.create(data);
  }
  async updatePreventiveSchedule(id, data) { return this._update(DDDPreventiveSchedule, id, data, { runValidators: true }); }
  async getOverdueSchedules() {
    return DDDPreventiveSchedule.find({
      isActive: true,
      nextDueDate: { $lt: new Date() },
    })
      .sort({ nextDueDate: 1 })
      .lean();
  }

  /* ── Service Records ── */
  async listServiceRecords(filters = {}) {
    const q = {};
    if (filters.assetId) q.assetId = filters.assetId;
    if (filters.category) q.category = filters.category;
    if (filters.workOrderId) q.workOrderId = filters.workOrderId;
    return DDDServiceRecord.find(q).sort({ datePerformed: -1 }).lean();
  }
  async createServiceRecord(data) {
    if (!data.recordCode) data.recordCode = `SVC-${Date.now()}`;
    return DDDServiceRecord.create(data);
  }

  /* ── Assets ── */
  async listAssets(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.condition) q.condition = filters.condition;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    if (filters.buildingId) q.buildingId = filters.buildingId;
    return DDDMaintenanceAsset.find(q).sort({ name: 1 }).lean();
  }
  async getAsset(id) { return this._getById(DDDMaintenanceAsset, id); }
  async createAsset(data) { return this._create(DDDMaintenanceAsset, data); }
  async updateAsset(id, data) { return this._update(DDDMaintenanceAsset, id, data, { runValidators: true }); }

  /* ── Analytics ── */
  async getMaintenanceAnalytics() {
    const [workOrders, schedules, records, assets] = await Promise.all([
      DDDWorkOrder.countDocuments(),
      DDDPreventiveSchedule.countDocuments(),
      DDDServiceRecord.countDocuments(),
      DDDMaintenanceAsset.countDocuments(),
    ]);
    const openWorkOrders = await DDDWorkOrder.countDocuments({
      status: { $in: ['submitted', 'triaged', 'assigned', 'in_progress'] },
    });
    const overdueSchedules = await DDDPreventiveSchedule.countDocuments({
      isActive: true,
      nextDueDate: { $lt: new Date() },
    });
    const criticalAssets = await DDDMaintenanceAsset.countDocuments({
      condition: { $in: ['critical', 'non_functional'] },
    });
    return {
      workOrders,
      openWorkOrders,
      schedules,
      overdueSchedules,
      records,
      assets,
      criticalAssets,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new MaintenanceTracker();
