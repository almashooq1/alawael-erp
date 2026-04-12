'use strict';
/**
 * InventoryManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddInventoryManager.js
 */

const {
  DDDInventoryItem,
  DDDStockLevel,
  DDDStockTransaction,
  DDDReorderRule,
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  STOCK_TRANSACTION_TYPES,
  UNIT_OF_MEASURES,
  STORAGE_CONDITIONS,
  VALUATION_METHODS,
  BUILTIN_ITEMS,
} = require('../models/DddInventoryManager');

const BaseCrudService = require('./base/BaseCrudService');

class InventoryManager extends BaseCrudService {
  constructor() {
    super('InventoryManager', {
      description: 'Medical supplies & equipment inventory management',
      version: '1.0.0',
    }, {
      inventoryItems: DDDInventoryItem,
      stockLevels: DDDStockLevel,
      stockTransactions: DDDStockTransaction,
      reorderRules: DDDReorderRule,
    })
  }

  async initialize() {
    await this._seedItems();
    this.log('Inventory Manager initialised ✓');
    return true;
  }

  async _seedItems() {
    for (const it of BUILTIN_ITEMS) {
      const exists = await DDDInventoryItem.findOne({ sku: it.sku }).lean();
      if (!exists) await DDDInventoryItem.create({ ...it, status: 'active' });
    }
  }

  /* ── Items CRUD ── */
  async listItems(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.status) q.status = filters.status;
    if (filters.search)
      q.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } },
      ];
    return DDDInventoryItem.find(q).sort({ name: 1 }).lean();
  }
  async getItem(id) { return this._getById(DDDInventoryItem, id); }
  async getItemBySku(sku) {
    return DDDInventoryItem.findOne({ sku: sku.toUpperCase() }).lean();
  }
  async createItem(data) { return this._create(DDDInventoryItem, data); }
  async updateItem(id, data) { return this._update(DDDInventoryItem, id, data, { runValidators: true }); }

  /* ── Stock Levels ── */
  async getStockLevels(itemId, locationId) {
    const q = { itemId };
    if (locationId) q.locationId = locationId;
    return DDDStockLevel.find(q).lean();
  }

  async adjustStock(itemId, locationId, quantityDelta, userId, reason) {
    let stock = await DDDStockLevel.findOne({ itemId, locationId });
    if (!stock)
      stock = await DDDStockLevel.create({
        itemId,
        locationId,
        quantityOnHand: 0,
        quantityAvailable: 0,
      });

    stock.quantityOnHand += quantityDelta;
    stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
    await stock.save();

    const txnType = quantityDelta >= 0 ? 'adjustment_increase' : 'adjustment_decrease';
    await DDDStockTransaction.create({
      transactionNumber: `TXN-${Date.now()}`,
      itemId,
      locationId,
      type: txnType,
      quantity: Math.abs(quantityDelta),
      performedBy: userId,
      reason,
    });

    return stock;
  }

  async receiveStock(itemId, locationId, quantity, unitCost, userId, opts = {}) {
    let stock = await DDDStockLevel.findOne({ itemId, locationId });
    if (!stock)
      stock = await DDDStockLevel.create({
        itemId,
        locationId,
        quantityOnHand: 0,
        quantityAvailable: 0,
      });

    stock.quantityOnHand += quantity;
    stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
    if (opts.lotNumber) stock.lotNumber = opts.lotNumber;
    if (opts.expiryDate) stock.expiryDate = opts.expiryDate;
    if (opts.binLocation) stock.binLocation = opts.binLocation;
    await stock.save();

    await DDDStockTransaction.create({
      transactionNumber: `TXN-${Date.now()}`,
      itemId,
      locationId,
      type: 'receipt',
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      performedBy: userId,
      lotNumber: opts.lotNumber,
      expiryDate: opts.expiryDate,
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
    });

    return stock;
  }

  async issueStock(itemId, locationId, quantity, userId, opts = {}) {
    const stock = await DDDStockLevel.findOne({ itemId, locationId });
    if (!stock || stock.quantityAvailable < quantity) throw new Error('Insufficient stock');

    stock.quantityOnHand -= quantity;
    stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
    await stock.save();

    await DDDStockTransaction.create({
      transactionNumber: `TXN-${Date.now()}`,
      itemId,
      locationId,
      type: 'issue',
      quantity,
      performedBy: userId,
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
      reason: opts.reason,
    });

    return stock;
  }

  async transferStock(itemId, fromLocationId, toLocationId, quantity, userId) {
    await this.issueStock(itemId, fromLocationId, quantity, userId, { reason: 'Transfer out' });
    return this.receiveStock(itemId, toLocationId, quantity, 0, userId, {
      referenceType: 'transfer',
    });
  }

  /* ── Transactions ── */
  async listTransactions(filters = {}) {
    const q = {};
    if (filters.itemId) q.itemId = filters.itemId;
    if (filters.locationId) q.locationId = filters.locationId;
    if (filters.type) q.type = filters.type;
    if (filters.startDate || filters.endDate) {
      q.createdAt = {};
      if (filters.startDate) q.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) q.createdAt.$lte = new Date(filters.endDate);
    }
    return DDDStockTransaction.find(q).sort({ createdAt: -1 }).lean();
  }

  /* ── Reorder Rules ── */
  async listReorderRules(filters = {}) {
    const q = {};
    if (filters.itemId) q.itemId = filters.itemId;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDReorderRule.find(q).lean();
  }
  async createReorderRule(data) { return this._create(DDDReorderRule, data); }
  async updateReorderRule(id, data) { return this._update(DDDReorderRule, id, data, { runValidators: true }); }

  async checkReorderAlerts() {
    const rules = await DDDReorderRule.find({ isActive: true }).lean();
    const alerts = [];
    for (const rule of rules) {
      const stocks = await DDDStockLevel.find({
        itemId: rule.itemId,
        ...(rule.locationId ? { locationId: rule.locationId } : {}),
      }).lean();
      const totalOnHand = stocks.reduce((s, st) => s + st.quantityOnHand, 0);
      if (totalOnHand <= rule.reorderPoint) {
        const item = await DDDInventoryItem.findById(rule.itemId).lean();
        alerts.push({
          rule,
          item,
          currentStock: totalOnHand,
          deficit: rule.reorderPoint - totalOnHand,
        });
      }
    }
    return alerts;
  }

  /* ── Expiry tracking ── */
  async getExpiringItems(daysBefore = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysBefore);
    return DDDStockLevel.find({ expiryDate: { $lte: cutoff, $gte: new Date() } })
      .populate('itemId')
      .lean();
  }

  /* ── Analytics ── */
  async getInventoryAnalytics() {
    const [totalItems, activeItems, outOfStock, transactions] = await Promise.all([
      DDDInventoryItem.countDocuments(),
      DDDInventoryItem.countDocuments({ status: 'active' }),
      DDDInventoryItem.countDocuments({ status: 'out_of_stock' }),
      DDDStockTransaction.countDocuments(),
    ]);
    const totalStockValue = await DDDStockLevel.aggregate([
      {
        $lookup: {
          from: 'dddinventoryitems',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$quantityOnHand', { $ifNull: ['$item.unitCost', 0] }] } },
        },
      },
    ]);
    return {
      totalItems,
      activeItems,
      outOfStock,
      transactions,
      totalStockValue: totalStockValue[0]?.total || 0,
    };
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new InventoryManager();
