'use strict';

/**
 * Legacy /api/v1/purchasing/* adapter — delegates PR workflow to Phase-16 ops.
 * W773: purchase requests → purchaseRequest.service.
 * W780: vendors → Vendor model; orders → InventoryModulePurchaseOrder.
 */

function getVendorModel() {
  return require('../models/Vendor');
}

function getPoModel() {
  try {
    const boot = require('../startup/operationsBootstrap');
    const wired = boot._getPurchaseRequestService?.();
    if (wired && wired._deps?.poModel) return wired._deps.poModel;
  } catch {
    /* fall through */
  }
  return require('../models/inventory/PurchaseOrder');
}

function getPrService() {
  try {
    const boot = require('../startup/operationsBootstrap');
    const wired = boot._getPurchaseRequestService?.();
    if (wired) return wired;
  } catch {
    /* fall through */
  }
  const { createPurchaseRequestService } = require('./operations/purchaseRequest.service');
  const PR = require('../models/operations/PurchaseRequest.model');
  const PO = getPoModel();
  return createPurchaseRequestService({ prModel: PR, poModel: PO });
}

const PO_STATUS_TO_LEGACY = {
  draft: 'draft',
  pending_approval: 'pending',
  approved: 'approved',
  sent: 'ordered',
  partial: 'ordered',
  received: 'received',
  cancelled: 'cancelled',
  closed: 'received',
};

function legacyPoStatus(status) {
  return PO_STATUS_TO_LEGACY[status] || status;
}

function mapVendorToLegacy(doc) {
  if (!doc) return doc;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const idStr = String(o._id);
  return {
    ...o,
    _id: o._id,
    vendorNumber: o.vendorNumber || `VND-${idStr.slice(-6).toUpperCase()}`,
    name: o.name,
    type: o.type || o.category || 'company',
    email: o.email || '',
    phone: o.phone || '',
    city: o.city || o.address || '',
    rating: o.rating ?? 0,
    isActive: o.isActive ?? o.status === 'active',
    paymentTerms: o.paymentTerms || 'net30',
    creditLimit: o.creditLimit ?? 0,
    totalOrders: o.totalOrders ?? 0,
    totalAmount: o.totalAmount ?? 0,
  };
}

function mapPoToLegacy(doc) {
  if (!doc) return doc;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const orderDate = o.order_date ? new Date(o.order_date) : new Date();
  const delivery = o.expected_delivery_date ? new Date(o.expected_delivery_date) : null;
  return {
    ...o,
    _id: o._id,
    orderNumber: o.orderNumber || o.po_number || String(o._id),
    vendor: o.vendor || o.supplier_name || '',
    date: orderDate.toISOString().slice(0, 10),
    deliveryDate: delivery ? delivery.toISOString().slice(0, 10) : '',
    items: Array.isArray(o.items) ? o.items.length : o.items || 0,
    totalAmount: o.totalAmount ?? o.total_amount ?? 0,
    status: legacyPoStatus(o.status),
    department: o.department || '',
  };
}

function mapPrToLegacyRequest(doc) {
  if (!doc) return doc;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const firstItem = Array.isArray(o.items) && o.items[0];
  return {
    ...o,
    _id: o._id,
    status: o.status,
    requestNumber: o.requestNumber || o._id,
    title:
      o.title ||
      o.justification ||
      (firstItem && firstItem.itemName) ||
      o.department ||
      'Purchase request',
  };
}

async function listVendors(query = {}) {
  const Vendor = getVendorModel();
  const filter = { isDeleted: { $ne: true } };
  if (query.status) filter.status = query.status;
  const rows = await Vendor.find(filter)
    .sort({ name: 1 })
    .limit(query.limit ? Number(query.limit) : 200)
    .lean();
  return rows.map(mapVendorToLegacy);
}

async function getVendor(id) {
  const Vendor = getVendorModel();
  const doc = await Vendor.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) {
    const err = new Error('vendor_not_found');
    err.status = 404;
    throw err;
  }
  return mapVendorToLegacy(doc);
}

async function createVendor(body) {
  const Vendor = getVendorModel();
  const count = await Vendor.countDocuments();
  const doc = await Vendor.create({
    name: body.name,
    category: body.type || body.category,
    contactPerson: body.contactPerson,
    phone: body.phone,
    email: body.email,
    address: body.city || body.address,
    paymentTerms: body.paymentTerms,
    rating: body.rating ?? 0,
    status: body.isActive === false ? 'inactive' : 'active',
    notes: body.creditLimit ? `creditLimit:${body.creditLimit}` : undefined,
  });
  const legacy = mapVendorToLegacy(doc);
  legacy.vendorNumber = `VND-${String(count + 1).padStart(3, '0')}`;
  return legacy;
}

async function updateVendor(id, body) {
  const Vendor = getVendorModel();
  const patch = {};
  if (body.name != null) patch.name = body.name;
  if (body.email != null) patch.email = body.email;
  if (body.phone != null) patch.phone = body.phone;
  if (body.city != null || body.address != null) patch.address = body.city || body.address;
  if (body.type != null || body.category != null) patch.category = body.type || body.category;
  if (body.paymentTerms != null) patch.paymentTerms = body.paymentTerms;
  if (body.rating != null) patch.rating = body.rating;
  if (body.isActive != null) patch.status = body.isActive ? 'active' : 'inactive';
  const doc = await Vendor.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, patch, {
    new: true,
  });
  if (!doc) {
    const err = new Error('vendor_not_found');
    err.status = 404;
    throw err;
  }
  return mapVendorToLegacy(doc);
}

async function deleteVendor(id) {
  const Vendor = getVendorModel();
  const doc = await Vendor.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    { isDeleted: true, status: 'inactive' },
    { new: true }
  );
  if (!doc) {
    const err = new Error('vendor_not_found');
    err.status = 404;
    throw err;
  }
  return { deleted: true, _id: doc._id };
}

async function listRequests(query = {}) {
  const rows = await getPrService().list({
    branchId: query.branchId,
    status: query.status,
    priority: query.priority,
    limit: query.limit ? Number(query.limit) : 100,
    skip: query.skip ? Number(query.skip) : 0,
  });
  return (rows || []).map(mapPrToLegacyRequest);
}

async function getRequest(id) {
  const doc = await getPrService().findById(id);
  if (!doc) {
    const err = new Error('request_not_found');
    err.status = 404;
    throw err;
  }
  return mapPrToLegacyRequest(doc);
}

async function updateRequest(id, body, actorId) {
  const PR = require('../models/operations/PurchaseRequest.model');
  const pr = await PR.findById(id);
  if (!pr) {
    const err = new Error('request_not_found');
    err.status = 404;
    throw err;
  }
  if (pr.status !== 'draft') {
    const err = new Error('only_draft_requests_editable');
    err.code = 'CONFLICT';
    throw err;
  }
  if (body.requiredDate != null) pr.requiredDate = body.requiredDate;
  if (body.neededBy != null) pr.requiredDate = body.neededBy;
  if (body.priority != null) pr.priority = body.priority;
  if (body.department != null) pr.department = body.department;
  if (body.branchId != null) pr.branchId = body.branchId;
  if (body.justification != null) pr.justification = body.justification;
  if (body.notes != null) pr.justification = body.notes;
  if (body.title != null) pr.justification = body.title;
  if (body.purchaseMethod != null) pr.purchaseMethod = body.purchaseMethod;
  if (Array.isArray(body.items) && body.items.length) {
    pr.items = body.items.map(it => ({
      itemName: it.itemName || it.name || 'Item',
      itemCode: it.itemCode,
      quantity: it.quantity ?? 1,
      unit: it.unit || 'ea',
      estimatedUnitPrice: it.estimatedUnitPrice ?? it.estimatedUnitCost ?? it.unitCost ?? 0,
      notes: it.notes,
    }));
  }
  if (actorId) pr.updatedBy = actorId;
  await pr.save();
  return mapPrToLegacyRequest(pr);
}

async function createRequest(body, actorId) {
  const requiredDate =
    body.requiredDate ||
    body.neededBy ||
    body.deliveryDate ||
    new Date(Date.now() + 7 * 86400000).toISOString();
  const items = Array.isArray(body.items)
    ? body.items
    : [
        {
          itemName: body.itemName || body.description || body.title || 'Requested item',
          quantity: body.quantity || 1,
          unit: body.unit || 'ea',
          estimatedUnitPrice:
            body.estimatedUnitPrice ?? body.estimatedUnitCost ?? body.unitCost ?? 0,
        },
      ];
  const draft = await getPrService().createDraft(
    {
      requiredDate,
      items,
      priority: body.priority || 'normal',
      purchaseMethod: body.purchaseMethod,
      branchId: body.branchId,
      department: body.department,
      justification: body.justification || body.notes || body.description,
      title: body.title,
    },
    { actorId }
  );
  return mapPrToLegacyRequest(draft);
}

async function approveRequest(id, { approverId, approverName, role }) {
  const doc = await getPrService().approveStep(id, {
    approverId,
    approverName,
    role: role || 'procurement_manager',
    comments: null,
  });
  return mapPrToLegacyRequest(doc);
}

async function rejectRequest(id, { approverId, reason }) {
  const doc = await getPrService().reject(id, {
    approverId,
    reason: reason || 'rejected',
  });
  return mapPrToLegacyRequest(doc);
}

async function submitRequest(id, { actorId, notes }) {
  const doc = await getPrService().submit(id, { actorId, notes });
  return mapPrToLegacyRequest(doc);
}

async function convertRequestToPo(id, { actorId, supplierId, supplierName }) {
  const { purchaseRequest, purchaseOrder } = await getPrService().convertToPo(id, {
    actorId,
    supplierId,
    supplierName,
  });
  return {
    request: mapPrToLegacyRequest(purchaseRequest),
    order: mapPoToLegacy(purchaseOrder),
  };
}

async function listOrders(query = {}) {
  const Po = getPoModel();
  const filter = { deleted_at: null };
  if (query.branchId) filter.branch_id = query.branchId;
  if (query.status) {
    const inv = Object.entries(PO_STATUS_TO_LEGACY).find(([, leg]) => leg === query.status);
    if (inv) filter.status = inv[0];
    else filter.status = query.status;
  }
  const rows = await Po.find(filter)
    .sort({ order_date: -1 })
    .limit(query.limit ? Number(query.limit) : 200)
    .lean();
  return rows.map(mapPoToLegacy);
}

async function getOrder(id) {
  const Po = getPoModel();
  const doc = await Po.findOne({ _id: id, deleted_at: null });
  if (!doc) {
    const err = new Error('order_not_found');
    err.status = 404;
    throw err;
  }
  return mapPoToLegacy(doc);
}

async function createOrder(body, actorId) {
  const Po = getPoModel();
  const items = (body.items || []).map(it => ({
    item_name_ar: it.itemName || it.item_name_ar || it.name || 'Item',
    item_code: it.itemCode || it.item_code,
    quantity_ordered: it.quantity || it.quantity_ordered || 1,
    unit_cost: it.unitCost || it.unit_cost || it.price || 0,
    unit_of_measure: it.unit || it.unit_of_measure || 'ea',
  }));
  if (!items.length) {
    items.push({
      item_name_ar: body.description || 'General purchase',
      quantity_ordered: 1,
      unit_cost: body.totalAmount || 0,
    });
  }
  const doc = await Po.create({
    supplier_id: body.supplierId || body.vendorId,
    supplier_name: body.supplierName || body.vendor,
    status: 'draft',
    items,
    branch_id: body.branchId,
    expected_delivery_date: body.deliveryDate || body.expected_delivery_date,
    payment_terms: body.paymentTerms,
    notes: body.notes,
    created_by: actorId,
    updated_by: actorId,
  });
  return mapPoToLegacy(doc);
}

async function approveOrder(id, actorId) {
  const Po = getPoModel();
  const doc = await Po.findOneAndUpdate(
    { _id: id, deleted_at: null, status: { $in: ['draft', 'pending_approval'] } },
    {
      status: 'approved',
      approved_by: actorId,
      approved_at: new Date(),
      updated_by: actorId,
    },
    { new: true }
  );
  if (!doc) {
    const err = new Error('order_not_found');
    err.status = 404;
    throw err;
  }
  return mapPoToLegacy(doc);
}

async function receiveOrder(id, actorId) {
  const Po = getPoModel();
  const doc = await Po.findOneAndUpdate(
    { _id: id, deleted_at: null },
    {
      status: 'received',
      actual_delivery_date: new Date(),
      updated_by: actorId,
    },
    { new: true }
  );
  if (!doc) {
    const err = new Error('order_not_found');
    err.status = 404;
    throw err;
  }
  return mapPoToLegacy(doc);
}

async function getStats() {
  const Vendor = getVendorModel();
  const Po = getPoModel();
  const rows = await listRequests({ limit: 500 });
  const pendingStatuses = new Set([
    'draft',
    'submitted',
    'under_review',
    'returned_for_clarification',
  ]);
  const pendingRequests = rows.filter(r => pendingStatuses.has(r.status)).length;
  const [totalVendors, activeOrders, spendAgg] = await Promise.all([
    Vendor.countDocuments({ isDeleted: { $ne: true }, status: 'active' }),
    Po.countDocuments({
      deleted_at: null,
      status: { $in: ['approved', 'sent', 'partial', 'received', 'closed'] },
    }),
    Po.aggregate([
      { $match: { deleted_at: null, status: { $in: ['received', 'closed', 'approved', 'sent'] } } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ]),
  ]);
  const totalSpend = spendAgg[0]?.total || 0;
  return {
    totalVendors,
    activeOrders,
    pendingRequests,
    totalSpend,
    monthlyBudget: 0,
    savingsAchieved: 0,
  };
}

module.exports = {
  listVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  listRequests,
  getRequest,
  updateRequest,
  createRequest,
  approveRequest,
  rejectRequest,
  submitRequest,
  convertRequestToPo,
  listOrders,
  getOrder,
  createOrder,
  approveOrder,
  receiveOrder,
  getStats,
};
