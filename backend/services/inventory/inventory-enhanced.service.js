'use strict';

const mongoose = require('mongoose');
const {
  InventoryStock,
  InventoryTransaction,
  Supplier,
  PurchaseOrder,
  Asset,
  StockCount,
} = require('../../models/InventoryStock');
const { InventoryItem } = require('../../models/InventoryItem');
const logger = require('../../utils/logger');

/**
 * خدمة إدارة المخزون المحسّنة
 * Enhanced Inventory Service — Prompt 11
 */
class InventoryEnhancedService {
  // ============================================================
  // حركات المخزون
  // ============================================================

  /** استلام بضاعة */
  async receive(itemId, warehouseId, quantity, meta = {}, performedBy) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const stock = await InventoryStock.findOneAndUpdate(
        { itemId, warehouseId, batchNumber: meta.batchNumber || null },
        { $inc: { quantityOnHand: quantity } },
        { upsert: true, new: true, session }
      );

      const before = stock.quantityOnHand - quantity;
      const tx = await InventoryTransaction.create(
        [
          {
            itemId,
            warehouseId,
            transactionType: 'receive',
            referenceType: meta.referenceType || null,
            referenceId: meta.referenceId || null,
            quantity,
            quantityBefore: before,
            quantityAfter: stock.quantityOnHand,
            unitCost: meta.unitCost || null,
            totalCost: meta.unitCost ? meta.unitCost * quantity : null,
            batchNumber: meta.batchNumber || null,
            serialNumber: meta.serialNumber || null,
            reason: meta.reason || null,
            performedBy,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      logger.info(`[Inventory] استلام: ${quantity} وحدة من الصنف ${itemId}`);
      return tx[0];
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /** صرف من المخزون */
  async issue(itemId, warehouseId, quantity, meta = {}, performedBy) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const stock = await InventoryStock.findOne({ itemId, warehouseId }).session(session);
      if (!stock) throw new Error('الصنف غير موجود في المستودع');

      const available = stock.quantityOnHand - stock.quantityReserved;
      if (available < quantity) {
        throw new Error(`الكمية المتاحة (${available}) أقل من المطلوبة (${quantity})`);
      }

      const before = stock.quantityOnHand;
      stock.quantityOnHand -= quantity;
      await stock.save({ session });

      const tx = await InventoryTransaction.create(
        [
          {
            itemId,
            warehouseId,
            transactionType: 'issue',
            referenceType: meta.referenceType || null,
            referenceId: meta.referenceId || null,
            quantity: -quantity,
            quantityBefore: before,
            quantityAfter: stock.quantityOnHand,
            unitCost: meta.unitCost || null,
            reason: meta.reason || null,
            performedBy,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return tx[0];
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /** تحويل بين مستودعين */
  async transfer(itemId, fromWarehouseId, toWarehouseId, quantity, reason, performedBy) {
    const issueTx = await this.issue(
      itemId,
      fromWarehouseId,
      quantity,
      { reason: `تحويل: ${reason}`, referenceType: 'transfer' },
      performedBy
    );
    const receiveTx = await this.receive(
      itemId,
      toWarehouseId,
      quantity,
      { reason: `تحويل من مستودع: ${reason}` },
      performedBy
    );
    return { issueTx, receiveTx };
  }

  /** تعديل يدوي للمخزون */
  async adjust(itemId, warehouseId, newQuantity, reason, performedBy) {
    const stock = await InventoryStock.findOneAndUpdate(
      { itemId, warehouseId },
      { quantityOnHand: newQuantity },
      { upsert: true, new: true }
    );

    return InventoryTransaction.create({
      itemId,
      warehouseId,
      transactionType: 'adjust',
      quantity: newQuantity,
      quantityBefore: 0,
      quantityAfter: newQuantity,
      reason,
      performedBy,
    });
  }

  // ============================================================
  // مستويات المخزون
  // ============================================================

  async getStockLevels(itemId) {
    return InventoryStock.find({ itemId }).populate('warehouseId', 'nameAr code');
  }

  async getTotalStock(itemId) {
    const result = await InventoryStock.aggregate([
      { $match: { itemId: mongoose.Types.ObjectId(itemId) } },
      {
        $group: {
          _id: null,
          totalOnHand: { $sum: '$quantityOnHand' },
          totalReserved: { $sum: '$quantityReserved' },
        },
      },
    ]);
    return result[0] || { totalOnHand: 0, totalReserved: 0 };
  }

  // ============================================================
  // تنبيهات إعادة الطلب
  // ============================================================

  async getReorderAlerts() {
    const items = await InventoryItem.find({ isActive: true, reorderPoint: { $gt: 0 } });
    const alerts = [];

    for (const item of items) {
      const { totalOnHand } = await this.getTotalStock(item._id);
      if (totalOnHand <= item.reorderPoint) {
        alerts.push({
          itemId: item._id,
          sku: item.sku,
          name: item.nameAr,
          currentStock: totalOnHand,
          reorderPoint: item.reorderPoint,
          reorderQuantity: item.reorderQuantity,
          shortage: item.reorderPoint - totalOnHand,
        });
      }
    }

    return alerts;
  }

  async getExpiringItems(daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return InventoryStock.find({
      expiryDate: { $lte: cutoff, $gte: new Date() },
    })
      .populate('itemId', 'nameAr sku')
      .populate('warehouseId', 'nameAr code')
      .sort({ expiryDate: 1 });
  }

  // ============================================================
  // أوامر الشراء
  // ============================================================

  async createPurchaseOrder(data, requestedBy) {
    const year = new Date().getFullYear();
    const count = await PurchaseOrder.countDocuments({ poNumber: { $regex: `^PO-${year}` } });
    const poNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;

    // حساب الإجماليات
    let subtotal = 0;
    let vatAmount = 0;
    const items = (data.items || []).map(item => {
      const total = item.quantityOrdered * item.unitCost;
      const vat = (total * (item.vatRate || 15)) / 100;
      subtotal += total;
      vatAmount += vat;
      return { ...item, totalCost: total, vatAmount: vat };
    });

    const totalAmount = subtotal + vatAmount + (data.shippingCost || 0) - (data.discount || 0);

    return PurchaseOrder.create({
      ...data,
      poNumber,
      items,
      subtotal,
      vatAmount,
      totalAmount,
      requestedBy,
      orderDate: data.orderDate || new Date(),
    });
  }

  async approvePurchaseOrder(poId, approvedBy) {
    return PurchaseOrder.findByIdAndUpdate(poId, { status: 'approved', approvedBy }, { new: true });
  }

  async receiveGoodsFromPO(poId, receivedItems, performedBy) {
    const po = await PurchaseOrder.findById(poId);
    if (!po) throw new Error('أمر الشراء غير موجود');

    const txns = [];
    for (const received of receivedItems) {
      const poItem = po.items.find(i => i.itemId.toString() === received.itemId);
      if (!poItem) continue;

      const tx = await this.receive(
        received.itemId,
        po.warehouseId,
        received.quantity,
        {
          unitCost: poItem.unitCost,
          referenceType: 'PurchaseOrder',
          referenceId: poId,
          batchNumber: received.batchNumber,
          reason: `استلام أمر شراء ${po.poNumber}`,
        },
        performedBy
      );
      txns.push(tx);

      // تحديث الكمية المستلمة في البند
      poItem.quantityReceived = (poItem.quantityReceived || 0) + received.quantity;
    }

    // تحديث حالة أمر الشراء
    const allReceived = po.items.every(i => (i.quantityReceived || 0) >= i.quantityOrdered);
    await PurchaseOrder.findByIdAndUpdate(poId, {
      status: allReceived ? 'received' : 'partially_received',
      items: po.items,
      actualDeliveryDate: allReceived ? new Date() : undefined,
    });

    return txns;
  }

  // ============================================================
  // إهلاك الأصول الثابتة
  // ============================================================

  calculateDepreciation(asset) {
    const annualDep = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeYears;
    const monthlyDep = annualDep / 12;

    const now = new Date();
    const purchased = new Date(asset.purchaseDate);
    const monthsOwned =
      (now.getFullYear() - purchased.getFullYear()) * 12 + (now.getMonth() - purchased.getMonth());

    const totalDep = Math.min(monthlyDep * monthsOwned, asset.purchaseCost - asset.salvageValue);
    const currentValue = Math.max(asset.purchaseCost - totalDep, asset.salvageValue);

    return {
      annualDepreciation: Math.round(annualDep * 100) / 100,
      monthlyDepreciation: Math.round(monthlyDep * 100) / 100,
      monthsOwned,
      accumulatedDepreciation: Math.round(totalDep * 100) / 100,
      currentBookValue: Math.round(currentValue * 100) / 100,
      depreciationPercentage: Math.round((totalDep / asset.purchaseCost) * 100 * 10) / 10,
    };
  }

  async updateAssetDepreciation(assetId) {
    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error('الأصل غير موجود');
    const dep = this.calculateDepreciation(asset);
    return Asset.findByIdAndUpdate(
      assetId,
      {
        accumulatedDepreciation: dep.accumulatedDepreciation,
        currentValue: dep.currentBookValue,
      },
      { new: true }
    );
  }

  // ============================================================
  // الجرد الدوري
  // ============================================================

  async createStockCount(warehouseId, type, countDate, initiatedBy) {
    const year = new Date().getFullYear();
    const count = await StockCount.countDocuments();
    const countNumber = `SC-${year}-${String(count + 1).padStart(3, '0')}`;

    // جلب جميع أصناف المستودع
    const stocks = await InventoryStock.find({ warehouseId });
    const items = stocks.map(s => ({
      itemId: s.itemId,
      systemQuantity: s.quantityOnHand,
      countedQuantity: null,
      status: 'pending',
    }));

    return StockCount.create({
      warehouseId,
      initiatedBy,
      countNumber,
      type,
      countDate: countDate || new Date(),
      status: 'in_progress',
      items,
      totalItems: items.length,
    });
  }

  async recordItemCount(stockCountId, itemId, countedQuantity) {
    const stockCount = await StockCount.findById(stockCountId);
    if (!stockCount) throw new Error('سجل الجرد غير موجود');

    const item = stockCount.items.find(i => i.itemId.toString() === itemId);
    if (!item) throw new Error('الصنف غير موجود في سجل الجرد');

    item.countedQuantity = countedQuantity;
    item.status = 'counted';

    // تحديث إحصائيات
    const counted = stockCount.items.filter(i => i.status === 'counted');
    const discrepancies = counted.filter(
      i => i.countedQuantity !== null && i.countedQuantity !== i.systemQuantity
    );

    stockCount.matchedItems = counted.length - discrepancies.length;
    stockCount.discrepancyItems = discrepancies.length;

    return stockCount.save();
  }

  async approveStockCount(stockCountId, approvedBy) {
    const stockCount = await StockCount.findById(stockCountId);
    if (!stockCount) throw new Error('سجل الجرد غير موجود');

    // تطبيق التعديلات على المخزون الفعلي
    for (const item of stockCount.items) {
      if (item.countedQuantity !== null && item.countedQuantity !== item.systemQuantity) {
        await InventoryStock.findOneAndUpdate(
          { itemId: item.itemId, warehouseId: stockCount.warehouseId },
          { quantityOnHand: item.countedQuantity }
        );
      }
    }

    return StockCount.findByIdAndUpdate(
      stockCountId,
      { status: 'approved', approvedBy },
      { new: true }
    );
  }

  // ============================================================
  // CRUD الأساسي
  // ============================================================

  async createItem(data) {
    const { InventoryItem: Item, ItemCategory } = require('../../models/InventoryItem');
    const count = await Item.countDocuments();
    const sku = `ITM-${String(count + 1).padStart(4, '0')}`;
    return Item.create({ ...data, sku });
  }

  async getItems(filters = {}, page = 1, limit = 20) {
    const { InventoryItem: Item } = require('../../models/InventoryItem');
    const query = {};
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.type) query.type = filters.type;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { nameAr: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } },
        { barcode: filters.search },
      ];
    }

    const [items, total] = await Promise.all([
      Item.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ sku: 1 }),
      Item.countDocuments(query),
    ]);

    return { data: items, total, page, pages: Math.ceil(total / limit) };
  }

  async createWarehouse(data) {
    const { Warehouse } = require('../../models/Warehouse');
    return Warehouse.create(data);
  }

  async createSupplier(data) {
    const count = await Supplier.countDocuments();
    const code = `SUP-${String(count + 1).padStart(3, '0')}`;
    return Supplier.create({ ...data, code });
  }
}

module.exports = new InventoryEnhancedService();
