/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Procurement Engine — Phase 18 · Supply Chain & Inventory Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Vendor / supplier management, purchase orders, requisitions, RFQs,
 * procurement workflows, and supplier performance evaluation.
 *
 * Aggregates
 *   DDDSupplier          — vendor / supplier master
 *   DDDPurchaseOrder     — purchase order lifecycle
 *   DDDRequisition       — internal purchase requisitions
 *   DDDSupplierEvaluation — periodic supplier rating
 *
 * Canonical links
 *   itemId       → DDDInventoryItem (dddInventoryManager)
 *   approvedBy   → User
 *   departmentId → Organisation unit
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const SUPPLIER_CATEGORIES = [
  'medical_equipment',
  'rehabilitation_supplies',
  'pharmaceuticals',
  'assistive_technology',
  'orthotics_prosthetics',
  'it_services',
  'facility_maintenance',
  'office_supplies',
  'laboratory',
  'cleaning_services',
  'food_services',
  'consulting',
  'training_services',
  'logistics',
];

const SUPPLIER_STATUSES = [
  'active',
  'inactive',
  'pending_approval',
  'suspended',
  'blacklisted',
  'probation',
  'preferred',
  'archived',
  'under_review',
];

const PO_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'sent_to_supplier',
  'partially_received',
  'fully_received',
  'invoiced',
  'closed',
  'cancelled',
  'on_hold',
  'disputed',
];

const REQUISITION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'converted_to_po',
  'cancelled',
  'partially_fulfilled',
  'fulfilled',
];

const PAYMENT_TERMS = [
  'net_15',
  'net_30',
  'net_45',
  'net_60',
  'net_90',
  'cod',
  'prepaid',
  'installment',
  'on_delivery',
  'end_of_month',
  'custom',
];

const EVALUATION_CRITERIA = [
  'quality',
  'delivery_timeliness',
  'pricing_competitiveness',
  'communication',
  'documentation',
  'after_sales_support',
  'compliance',
  'flexibility',
  'innovation',
  'financial_stability',
  'sustainability',
];

/* ── Built-in suppliers ─────────────────────────────────────────────────── */
const BUILTIN_SUPPLIERS = [
  {
    code: 'SUP-MEDDEV01',
    name: 'Al-Shifa Medical Devices',
    nameAr: 'الشفاء للأجهزة الطبية',
    category: 'medical_equipment',
    status: 'preferred',
  },
  {
    code: 'SUP-REHAB01',
    name: 'Gulf Rehabilitation Supplies',
    nameAr: 'مستلزمات التأهيل الخليجية',
    category: 'rehabilitation_supplies',
    status: 'preferred',
  },
  {
    code: 'SUP-PHARMA01',
    name: 'Saudi Pharma Co',
    nameAr: 'الشركة السعودية للأدوية',
    category: 'pharmaceuticals',
    status: 'active',
  },
  {
    code: 'SUP-ASSIST01',
    name: 'TechAbility Solutions',
    nameAr: 'حلول القدرة التقنية',
    category: 'assistive_technology',
    status: 'active',
  },
  {
    code: 'SUP-ORTHO01',
    name: 'Precision Orthotics',
    nameAr: 'الأجهزة التعويضية الدقيقة',
    category: 'orthotics_prosthetics',
    status: 'active',
  },
  {
    code: 'SUP-IT01',
    name: 'MedTech IT Services',
    nameAr: 'خدمات تقنية المعلومات الطبية',
    category: 'it_services',
    status: 'active',
  },
  {
    code: 'SUP-FACIL01',
    name: 'CleanCare Facility Services',
    nameAr: 'خدمات المرافق نظيفة',
    category: 'facility_maintenance',
    status: 'active',
  },
  {
    code: 'SUP-LAB01',
    name: 'Diagnostic Labs Supplies',
    nameAr: 'مستلزمات المختبرات التشخيصية',
    category: 'laboratory',
    status: 'active',
  },
  {
    code: 'SUP-TRAIN01',
    name: 'HealthEd Training Corp',
    nameAr: 'شركة التدريب الصحي',
    category: 'training_services',
    status: 'active',
  },
  {
    code: 'SUP-LOGIS01',
    name: 'MedLogistics Arabia',
    nameAr: 'اللوجستيات الطبية العربية',
    category: 'logistics',
    status: 'active',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Supplier ──────────────────────────────────────────────────────────── */
const supplierSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: SUPPLIER_CATEGORIES, required: true },
    status: { type: String, enum: SUPPLIER_STATUSES, default: 'active' },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    taxId: { type: String },
    paymentTerms: { type: String, enum: PAYMENT_TERMS, default: 'net_30' },
    currency: { type: String, default: 'SAR' },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    certifications: [{ name: String, expiryDate: Date }],
    bankDetails: {
      bankName: String,
      accountNumber: String,
      iban: String,
      swiftCode: String,
    },
    contractStartDate: { type: Date },
    contractEndDate: { type: Date },
    tags: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

supplierSchema.index({ category: 1, status: 1 });
supplierSchema.index({ code: 1 });

const DDDSupplier = mongoose.models.DDDSupplier || mongoose.model('DDDSupplier', supplierSchema);

/* ── Purchase Order ────────────────────────────────────────────────────── */
const purchaseOrderSchema = new Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'DDDSupplier', required: true },
    status: { type: String, enum: PO_STATUSES, default: 'draft' },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId },
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number },
        receivedQty: { type: Number, default: 0 },
        uom: { type: String },
      },
    ],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    paymentTerms: { type: String, enum: PAYMENT_TERMS },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    shippingAddress: { type: String },
    notes: { type: String },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    requisitionId: { type: Schema.Types.ObjectId, ref: 'DDDRequisition' },
    attachments: [{ name: String, url: String, type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ supplierId: 1, status: 1 });
purchaseOrderSchema.index({ poNumber: 1 });

const DDDPurchaseOrder =
  mongoose.models.DDDPurchaseOrder || mongoose.model('DDDPurchaseOrder', purchaseOrderSchema);

/* ── Requisition ───────────────────────────────────────────────────────── */
const requisitionSchema = new Schema(
  {
    reqNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    status: { type: String, enum: REQUISITION_STATUSES, default: 'draft' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        estimatedCost: { type: Number },
        suggestedSupplierId: { type: Schema.Types.ObjectId, ref: 'DDDSupplier' },
        notes: { type: String },
      },
    ],
    justification: { type: String },
    estimatedTotal: { type: Number, default: 0 },
    departmentId: { type: Schema.Types.ObjectId },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'DDDPurchaseOrder' },
    neededByDate: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

requisitionSchema.index({ status: 1, createdAt: -1 });

const DDDRequisition =
  mongoose.models.DDDRequisition || mongoose.model('DDDRequisition', requisitionSchema);

/* ── Supplier Evaluation ───────────────────────────────────────────────── */
const supplierEvaluationSchema = new Schema(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'DDDSupplier', required: true },
    period: { type: String, required: true },
    evaluatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scores: [
      {
        criterion: { type: String, enum: EVALUATION_CRITERIA },
        score: { type: Number, min: 1, max: 5 },
        weight: { type: Number, default: 1 },
        comments: { type: String },
      },
    ],
    overallScore: { type: Number, min: 0, max: 5 },
    recommendation: {
      type: String,
      enum: ['continue', 'probation', 'terminate', 'upgrade_to_preferred'],
    },
    strengths: [{ type: String }],
    improvements: [{ type: String }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

supplierEvaluationSchema.index({ supplierId: 1, period: 1 });

const DDDSupplierEvaluation =
  mongoose.models.DDDSupplierEvaluation ||
  mongoose.model('DDDSupplierEvaluation', supplierEvaluationSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class ProcurementEngine extends BaseDomainModule {
  constructor() {
    super('ProcurementEngine', {
      description: 'Vendor management, purchase orders & procurement workflows',
      version: '1.0.0',
    });
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
  async getSupplier(id) {
    return DDDSupplier.findById(id).lean();
  }
  async createSupplier(data) {
    return DDDSupplier.create(data);
  }
  async updateSupplier(id, data) {
    return DDDSupplier.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Purchase Orders ── */
  async listPurchaseOrders(filters = {}) {
    const q = {};
    if (filters.supplierId) q.supplierId = filters.supplierId;
    if (filters.status) q.status = filters.status;
    return DDDPurchaseOrder.find(q).sort({ createdAt: -1 }).lean();
  }
  async getPurchaseOrder(id) {
    return DDDPurchaseOrder.findById(id).lean();
  }

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
    );
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
    );
  }

  /* ── Requisitions ── */
  async listRequisitions(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.requestedBy) q.requestedBy = filters.requestedBy;
    if (filters.priority) q.priority = filters.priority;
    return DDDRequisition.find(q).sort({ createdAt: -1 }).lean();
  }
  async getRequisition(id) {
    return DDDRequisition.findById(id).lean();
  }

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
    );
  }
  async rejectRequisition(id, reason) {
    return DDDRequisition.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    );
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

  async healthCheck() {
    const [suppliers, pos, reqs] = await Promise.all([
      DDDSupplier.countDocuments(),
      DDDPurchaseOrder.countDocuments(),
      DDDRequisition.countDocuments(),
    ]);
    return { status: 'healthy', suppliers, purchaseOrders: pos, requisitions: reqs };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createProcurementEngineRouter() {
  const router = Router();
  const svc = new ProcurementEngine();

  /* Suppliers */
  router.get('/procurement/suppliers', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSuppliers(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/procurement/suppliers/:id', async (req, res) => {
    try {
      const d = await svc.getSupplier(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/procurement/suppliers', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSupplier(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/procurement/suppliers/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateSupplier(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Purchase Orders */
  router.get('/procurement/purchase-orders', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPurchaseOrders(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/procurement/purchase-orders/:id', async (req, res) => {
    try {
      const d = await svc.getPurchaseOrder(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/procurement/purchase-orders', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPurchaseOrder(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/procurement/purchase-orders/:id/approve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approvePurchaseOrder(req.params.id, req.body.userId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/procurement/purchase-orders/:id/receive', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.receivePurchaseOrder(req.params.id, req.body.items),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/procurement/purchase-orders/:id/cancel', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.cancelPurchaseOrder(req.params.id, req.body.reason),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Requisitions */
  router.get('/procurement/requisitions', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequisitions(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/procurement/requisitions/:id', async (req, res) => {
    try {
      const d = await svc.getRequisition(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/procurement/requisitions', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequisition(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/procurement/requisitions/:id/approve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveRequisition(req.params.id, req.body.userId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/procurement/requisitions/:id/reject', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.rejectRequisition(req.params.id, req.body.reason),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/procurement/requisitions/:id/convert-to-po', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.convertRequisitionToPO(req.params.id, req.body.supplierId, req.body.userId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Evaluations */
  router.get('/procurement/suppliers/:id/evaluations', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEvaluations(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/procurement/evaluations', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createEvaluation(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/procurement/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getProcurementAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/procurement/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  ProcurementEngine,
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
  createProcurementEngineRouter,
};
