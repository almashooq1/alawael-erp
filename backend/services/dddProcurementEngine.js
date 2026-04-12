'use strict';
/**
 * ProcurementEngine Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddProcurementEngine.js
 */

const {
  DDDSupplier,
  DDDPurchaseOrder,
  DDDRequisition,
  DDDSupplierEvaluation,
  SUPPLIER_CATEGORIES,
  SUPPLIER_STATUSES,
  PO_STATUSES,
  REQUISITION_STATUSES,
  PAYMENT_TERMS,
  EVALUATION_CRITERIA,
  BUILTIN_SUPPLIERS,
} = require('../models/DddProcurementEngine');

const BaseCrudService = require('./base/BaseCrudService');

class ProcurementEngine extends BaseCrudService {
  constructor() {
    super('ProcurementEngine', {
      description: 'Vendor management, purchase orders & procurement workflows',
      version: '1.0.0',
    }, {
      suppliers: DDDSupplier,
      purchaseOrders: DDDPurchaseOrder,
      requisitions: DDDRequisition,
      supplierEvaluations: DDDSupplierEvaluation,
    })
  }

  async initialize() {
    await this._seedSuppliers();
    this.log('Procurement Engine initialised ✓');
    return true;
  }

  async _seedSuppliers() {
    for (const s of BUILTIN_SUPPLIERS) {
      const exists = await DDDSupplier.findOne({ code: s.code }).lean();
      if (!exists) await DDDSupplier.create(s);
    }
  }

  /* ── Supplier CRUD ── */
  async listSuppliers(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.status) q.status = filters.status;
    if (filters.search)
      q.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
      ];
    return DDDSupplier.find(q).sort({ name: 1 }).lean();
  }
  async getSupplier(id) { return this._getById(DDDSupplier, id); }
  async createSupplier(data) { return this._create(DDDSupplier, data); }
  async updateSupplier(id, data) { return this._update(DDDSupplier, id, data, { runValidators: true }); }

  /* ── Purchase Orders ── */
  async listPurchaseOrders(filters = {}) {
    const q = {};
    if (filters.supplierId) q.supplierId = filters.supplierId;
    if (filters.status) q.status = filters.status;
    return DDDPurchaseOrder.find(q).sort({ createdAt: -1 }).lean();
  }
  async getPurchaseOrder(id) { return this._getById(DDDPurchaseOrder, id); }

  async createPurchaseOrder(data) {
    if (!data.poNumber) data.poNumber = `PO-${Date.now()}`;
    for (const item of data.items || []) {
      item.totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
    }
    data.subtotal = (data.items || []).reduce((s, i) => s + (i.totalPrice || 0), 0);
    data.totalAmount = data.subtotal + (data.taxAmount || 0) - (data.discount || 0);
    return DDDPurchaseOrder.create(data);
  }

  async approvePurchaseOrder(id, userId) {
    return DDDPurchaseOrder.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
      },
      { new: true }
    ).lean();
  }

  async receivePurchaseOrder(id, receivedItems) {
    const po = await DDDPurchaseOrder.findById(id);
    if (!po) throw new Error('PO not found');
    for (const ri of receivedItems) {
      const item = po.items.id(ri.lineId) || po.items.find(i => String(i.itemId) === ri.itemId);
      if (item) item.receivedQty = (item.receivedQty || 0) + ri.quantity;
    }
    const allReceived = po.items.every(i => i.receivedQty >= i.quantity);
    po.status = allReceived ? 'fully_received' : 'partially_received';
    if (allReceived) po.actualDeliveryDate = new Date();
    await po.save();
    return po;
  }

  async cancelPurchaseOrder(id, reason) {
    return DDDPurchaseOrder.findByIdAndUpdate(
      id,
      { status: 'cancelled', notes: reason },
      { new: true }
    ).lean();
  }

  /* ── Requisitions ── */
  async listRequisitions(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.requestedBy) q.requestedBy = filters.requestedBy;
    if (filters.priority) q.priority = filters.priority;
    return DDDRequisition.find(q).sort({ createdAt: -1 }).lean();
  }
  async getRequisition(id) { return this._getById(DDDRequisition, id); }

  async createRequisition(data) {
    if (!data.reqNumber) data.reqNumber = `REQ-${Date.now()}`;
    data.estimatedTotal = (data.items || []).reduce(
      (s, i) => s + (i.estimatedCost || 0) * (i.quantity || 1),
      0
    );
    return DDDRequisition.create(data);
  }

  async approveRequisition(id, userId) {
    return DDDRequisition.findByIdAndUpdate(
      id,
      { status: 'approved', approvedBy: userId, approvedAt: new Date() },
      { new: true }
    ).lean();
  }
  async rejectRequisition(id, reason) {
    return DDDRequisition.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    ).lean();
  }
  async convertRequisitionToPO(reqId, supplierId, userId) {
    const req = await DDDRequisition.findById(reqId);
    if (!req) throw new Error('Requisition not found');
    const poData = {
      supplierId,
      requestedBy: userId,
      requisitionId: reqId,
      items: req.items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.estimatedCost || 0,
        totalPrice: (i.estimatedCost || 0) * i.quantity,
      })),
    };
    const po = await this.createPurchaseOrder(poData);
    req.status = 'converted_to_po';
    req.purchaseOrderId = po._id;
    await req.save();
    return po;
  }

  /* ── Evaluations ── */
  async listEvaluations(supplierId) {
    return DDDSupplierEvaluation.find({ supplierId }).sort({ period: -1 }).lean();
  }

  async createEvaluation(data) {
    if (data.scores && data.scores.length) {
      const totalWeight = data.scores.reduce((s, sc) => s + (sc.weight || 1), 0);
      data.overallScore =
        data.scores.reduce((s, sc) => s + sc.score * (sc.weight || 1), 0) / totalWeight;
    }
    const ev = await DDDSupplierEvaluation.create(data);
    if (ev.overallScore) {
      await DDDSupplier.findByIdAndUpdate(data.supplierId, {
        rating: Math.round(ev.overallScore * 10) / 10,
      });
    }
    return ev;
  }

  /* ── Analytics ── */
  async getProcurementAnalytics() {
    const [suppliers, pos, reqs, evals] = await Promise.all([
      DDDSupplier.countDocuments(),
      DDDPurchaseOrder.countDocuments(),
      DDDRequisition.countDocuments(),
      DDDSupplierEvaluation.countDocuments(),
    ]);
    const openPOs = await DDDPurchaseOrder.countDocuments({
      status: { $in: ['draft', 'submitted', 'approved', 'sent_to_supplier'] },
    });
    const pendingReqs = await DDDRequisition.countDocuments({
      status: { $in: ['submitted', 'under_review'] },
    });
    const poValue = await DDDPurchaseOrder.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    return {
      suppliers,
      purchaseOrders: pos,
      openPOs,
      requisitions: reqs,
      pendingReqs,
      evaluations: evals,
      totalPOValue: poValue[0]?.total || 0,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new ProcurementEngine();
