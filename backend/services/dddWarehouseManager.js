'use strict';
/**
 * WarehouseManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddWarehouseManager.js
 */

const {
  DDDWarehouse,
  DDDStorageBin,
  DDDPickList,
  DDDCycleCount,
  WAREHOUSE_TYPES,
  WAREHOUSE_STATUSES,
  BIN_TYPES,
  PICK_LIST_STATUSES,
  CYCLE_COUNT_STATUSES,
  ZONE_TYPES,
  BUILTIN_WAREHOUSES,
} = require('../models/DddWarehouseManager');

const BaseCrudService = require('./base/BaseCrudService');

class WarehouseManager extends BaseCrudService {
  constructor() {
    super('WarehouseManager', {
      description: 'Warehouse & storage facility management, picking & counting',
      version: '1.0.0',
    }, {
      warehouses: DDDWarehouse,
      storageBins: DDDStorageBin,
      pickLists: DDDPickList,
      cycleCounts: DDDCycleCount,
    })
  }

  async initialize() {
    await this._seedWarehouses();
    this.log('Warehouse Manager initialised ✓');
    return true;
  }

  async _seedWarehouses() {
    for (const w of BUILTIN_WAREHOUSES) {
      const exists = await DDDWarehouse.findOne({ code: w.code }).lean();
      if (!exists) await DDDWarehouse.create({ ...w, status: 'active' });
    }
  }

  /* ── Warehouses CRUD ── */
  async listWarehouses(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDWarehouse.find(q).sort({ name: 1 }).lean();
  }
  async getWarehouse(id) { return this._getById(DDDWarehouse, id); }
  async createWarehouse(data) { return this._create(DDDWarehouse, data); }
  async updateWarehouse(id, data) { return this._update(DDDWarehouse, id, data, { runValidators: true }); }

  /* ── Storage Bins ── */
  async listBins(warehouseId, filters = {}) {
    const q = { warehouseId };
    if (filters.type) q.type = filters.type;
    if (filters.zone) q.zone = filters.zone;
    if (filters.isOccupied !== undefined) q.isOccupied = filters.isOccupied;
    return DDDStorageBin.find(q).sort({ binCode: 1 }).lean();
  }
  async getBin(id) { return this._getById(DDDStorageBin, id); }
  async createBin(data) { return this._create(DDDStorageBin, data); }
  async updateBin(id, data) { return this._update(DDDStorageBin, id, data, { runValidators: true }); }

  async assignItemToBin(binId, itemId, quantity, lotNumber) {
    const bin = await DDDStorageBin.findById(binId);
    if (!bin) throw new Error('Bin not found');
    const existing = bin.assignedItems.find(
      a => String(a.itemId) === String(itemId) && (a.lotNumber || '') === (lotNumber || '')
    );
    if (existing) existing.quantity += quantity;
    else bin.assignedItems.push({ itemId, quantity, lotNumber });
    bin.isOccupied = bin.assignedItems.length > 0;
    bin.usedCapacity = bin.assignedItems.reduce((s, a) => s + a.quantity, 0);
    await bin.save();
    return bin;
  }

  /* ── Pick Lists ── */
  async listPickLists(warehouseId, filters = {}) {
    const q = { warehouseId };
    if (filters.status) q.status = filters.status;
    if (filters.assignedTo) q.assignedTo = filters.assignedTo;
    return DDDPickList.find(q).sort({ createdAt: -1 }).lean();
  }
  async getPickList(id) { return this._getById(DDDPickList, id); }

  async createPickList(data) {
    if (!data.pickNumber) data.pickNumber = `PK-${Date.now()}`;
    return DDDPickList.create(data);
  }

  async updatePickItem(pickListId, itemIndex, pickedQty) {
    const pl = await DDDPickList.findById(pickListId);
    if (!pl || !pl.items[itemIndex]) throw new Error('Pick list or item not found');
    pl.items[itemIndex].pickedQty = pickedQty;
    pl.items[itemIndex].status = pickedQty >= pl.items[itemIndex].requestedQty ? 'picked' : 'short';
    const allDone = pl.items.every(
      i => i.status === 'picked' || i.status === 'short' || i.status === 'substituted'
    );
    if (allDone) {
      pl.status = 'picked';
      pl.completedAt = new Date();
    } else if (!pl.startedAt) {
      pl.startedAt = new Date();
      pl.status = 'in_progress';
    }
    await pl.save();
    return pl;
  }

  /* ── Cycle Counts ── */
  async listCycleCounts(warehouseId, filters = {}) {
    const q = { warehouseId };
    if (filters.status) q.status = filters.status;
    return DDDCycleCount.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async getCycleCount(id) { return this._getById(DDDCycleCount, id); }

  async createCycleCount(data) {
    if (!data.countNumber) data.countNumber = `CC-${Date.now()}`;
    data.totalItems = (data.items || []).length;
    return DDDCycleCount.create(data);
  }

  async recordCount(countId, itemIndex, countedQty) {
    const cc = await DDDCycleCount.findById(countId);
    if (!cc || !cc.items[itemIndex]) throw new Error('Cycle count or item not found');
    cc.items[itemIndex].countedQty = countedQty;
    cc.items[itemIndex].variance = countedQty - (cc.items[itemIndex].systemQty || 0);
    const counted = cc.items.filter(i => i.countedQty !== null && i.countedQty !== undefined);
    cc.totalVariances = counted.filter(i => i.variance !== 0).length;
    cc.varianceRate = counted.length > 0 ? (cc.totalVariances / counted.length) * 100 : 0;
    if (counted.length === cc.items.length) cc.status = 'review';
    else cc.status = 'counting';
    await cc.save();
    return cc;
  }

  async approveCycleCount(countId, userId) {
    return DDDCycleCount.findByIdAndUpdate(
      countId,
      { status: 'approved', approvedBy: userId, completedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Analytics ── */
  async getWarehouseAnalytics() {
    const [warehouses, bins, pickLists, cycleCounts] = await Promise.all([
      DDDWarehouse.countDocuments(),
      DDDStorageBin.countDocuments(),
      DDDPickList.countDocuments(),
      DDDCycleCount.countDocuments(),
    ]);
    const active = await DDDWarehouse.countDocuments({ status: 'active' });
    const occupiedBins = await DDDStorageBin.countDocuments({ isOccupied: true });
    const openPicks = await DDDPickList.countDocuments({
      status: { $in: ['created', 'assigned', 'in_progress'] },
    });
    return {
      warehouses,
      activeWarehouses: active,
      bins,
      occupiedBins,
      pickLists,
      openPicks,
      cycleCounts,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new WarehouseManager();
