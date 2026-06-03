'use strict';

/**
 * Legacy /api/v1/purchasing/* adapter — delegates PR workflow to Phase-16 ops.
 * W773: purchase requests → purchaseRequest.service.
 * W780: vendors → Vendor model; orders → InventoryModulePurchaseOrder.
 * W781: receipts → PurchaseReceipt; contracts → VendorSupplyContract.
 * W784: PO receive ↔ GRN sync on InventoryModulePurchaseOrder.
 * W795: optional body.items on receiveOrder for partial GRN shipments.
 * W799: read-only cross-tier PO counts (legacy + InventoryStock) for ADR-039 reporting.
 * W785: list receipts by PO + dashboard receipt count.
 * W786: stock receipt when PO lines include item_id (InventoryModuleItem).
 * W787: legacy stats field aliases for PurchasingManagement.js tiles.
 * W789: PR itemId normalization (legacy product/estimatedPrice → itemName/itemId).
 * W790: lineItems + itemsSummary on PO/GRN/PR legacy payloads for branch UI.
 */

const { applyStockReceiptForPoLines } = require('./purchasingStockReceive.lib');

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
  partial: 'partial',
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

function mapPoLineToLegacy(it) {
  if (!it) return null;
  const rawId = it.item_id || it.itemId;
  return {
    itemId: rawId || null,
    itemName: it.item_name_ar || it.itemName || it.item_name || 'Item',
    itemCode: it.item_code || it.itemCode,
    quantity: it.quantity_ordered ?? it.quantity ?? 0,
    quantityReceived: it.quantity_received ?? 0,
    unitCost: it.unit_cost ?? it.unitCost ?? 0,
    totalCost: it.total_cost ?? it.totalCost ?? 0,
    unit: it.unit_of_measure || it.unit || 'ea',
  };
}

function mapReceiptLineToLegacy(it) {
  if (!it) return null;
  return {
    itemName: it.item_name || it.itemName || 'Item',
    quantityOrdered: it.quantity_ordered ?? 0,
    quantityReceived: it.quantity_received ?? 0,
    unitCost: it.unit_cost ?? 0,
  };
}

function buildItemsSummary(lines, mapFn, { max = 2, qtyKey = 'quantity' } = {}) {
  if (!Array.isArray(lines) || !lines.length) return '';
  const mapped = lines.map(mapFn).filter(Boolean);
  const parts = mapped.slice(0, max).map(l => `${l.itemName} (×${l[qtyKey] ?? 0})`);
  if (mapped.length > max) parts.push(`+${mapped.length - max}`);
  return parts.join('، ');
}

function mapPoToLegacy(doc) {
  if (!doc) return doc;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const orderDate = o.order_date ? new Date(o.order_date) : new Date();
  const delivery = o.expected_delivery_date ? new Date(o.expected_delivery_date) : null;
  const rawLines = Array.isArray(o.items) ? o.items : [];
  const lineItems = rawLines.map(mapPoLineToLegacy).filter(Boolean);
  const itemsCount = rawLines.length;
  return {
    ...o,
    _id: o._id,
    orderNumber: o.orderNumber || o.po_number || String(o._id),
    vendor: o.vendor || o.supplier_name || '',
    date: orderDate.toISOString().slice(0, 10),
    deliveryDate: delivery ? delivery.toISOString().slice(0, 10) : '',
    items: itemsCount,
    itemsCount,
    lineItems,
    itemsSummary: buildItemsSummary(rawLines, mapPoLineToLegacy),
    linkedItemCount: lineItems.filter(l => l.itemId).length,
    totalAmount: o.totalAmount ?? o.total_amount ?? 0,
    status: legacyPoStatus(o.status),
    department: o.department || '',
  };
}

function mapPrToLegacyRequest(doc) {
  if (!doc) return doc;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const rawLines = Array.isArray(o.items) ? o.items : [];
  const lineItems = rawLines.map(it => ({
    itemId: it.itemId || null,
    itemName: it.itemName || 'Item',
    itemCode: it.itemCode,
    quantity: it.quantity ?? 0,
    unitCost: it.estimatedUnitPrice ?? 0,
    unit: it.unit || 'ea',
  }));
  const firstItem = rawLines[0];
  const itemsCount = rawLines.length;
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
    branch: o.branch || o.department || '',
    requestedBy: o.requestedBy || o.requester?.nameSnapshot || '',
    priority: o.priority || 'normal',
    estimatedValue: o.summary?.estimatedValue ?? o.estimatedValue ?? 0,
    items: itemsCount,
    itemsCount,
    lineItems,
    itemsSummary: buildItemsSummary(rawLines, it => ({
      itemName: it.itemName || 'Item',
      quantity: it.quantity ?? 0,
    })),
    linkedItemCount: lineItems.filter(l => l.itemId).length,
  };
}

/** Map BranchPurchasing.js line shape + API aliases → canonical PR item. */
function normalizePrItem(it) {
  const rawId = it.itemId || it.item_id || it.inventoryItemId;
  const row = {
    itemName: it.itemName || it.product || it.name || it.description || 'Item',
    itemCode: it.itemCode || it.item_code,
    quantity: it.quantity ?? 1,
    unit: it.unit || 'ea',
    estimatedUnitPrice:
      it.estimatedUnitPrice ?? it.estimatedUnitCost ?? it.estimatedPrice ?? it.unitCost ?? 0,
    notes: it.notes,
  };
  if (rawId) row.itemId = rawId;
  return row;
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
    pr.items = body.items.map(normalizePrItem);
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
    ? body.items.map(normalizePrItem)
    : [
        normalizePrItem({
          itemName: body.itemName || body.description || body.title || 'Requested item',
          itemId: body.itemId || body.item_id,
          quantity: body.quantity || 1,
          unit: body.unit || 'ea',
          estimatedUnitPrice:
            body.estimatedUnitPrice ?? body.estimatedUnitCost ?? body.unitCost ?? 0,
        }),
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
    item_id: it.itemId || it.item_id,
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

async function applyReceiptLinesToPo(po, receiptLines, actorId) {
  if (!po || !Array.isArray(po.items)) return po;
  const stockDeltas = [];
  receiptLines.forEach((line, idx) => {
    const poLine =
      po.items.find(i => i.item_name_ar && line.item_name && i.item_name_ar === line.item_name) ||
      po.items[idx];
    if (!poLine) return;
    const before = poLine.quantity_received || 0;
    const received = Number(line.quantity_received) || 0;
    poLine.quantity_received = Math.min(poLine.quantity_ordered || received, before + received);
    const delta = (poLine.quantity_received || 0) - before;
    if (poLine.item_id && delta > 0) {
      stockDeltas.push({
        item_id: poLine.item_id,
        quantity_delta: delta,
        unit_cost: poLine.unit_cost || 0,
      });
    }
  });
  const allReceived = po.items.every(i => (i.quantity_received || 0) >= (i.quantity_ordered || 0));
  po.status = allReceived ? 'received' : 'partial';
  if (allReceived) po.actual_delivery_date = new Date();
  if (actorId) po.updated_by = actorId;
  await po.save();
  if (stockDeltas.length) {
    await applyStockReceiptForPoLines({ po, deltas: stockDeltas, actorId });
  }
  return po;
}

function resolvePoLineForReceive(po, hint, index) {
  const items = po.items || [];
  if (hint.lineIndex != null && items[hint.lineIndex]) return items[hint.lineIndex];
  const itemId = hint.itemId || hint.item_id;
  if (itemId) {
    const id = String(itemId);
    return items.find(i => i.item_id && String(i.item_id) === id);
  }
  const name = hint.itemName || hint.item_name || hint.item_name_ar;
  if (name) {
    return items.find(i => i.item_name_ar === name || i.item_name === name);
  }
  if (index != null && items[index]) return items[index];
  return null;
}

/** @returns {Array|null} receipt lines for this shipment, or null → full receive */
function buildPartialReceiptLines(body, po) {
  const raw = body.items || body.lineItems;
  if (!Array.isArray(raw) || !raw.length) return null;

  const receiptLines = [];
  raw.forEach((hint, idx) => {
    const poLine = resolvePoLineForReceive(po, hint, idx);
    if (!poLine) return;
    const ordered = poLine.quantity_ordered || 0;
    const already = poLine.quantity_received || 0;
    const remaining = Math.max(0, ordered - already);
    const requested = Number(hint.quantityReceived ?? hint.quantity_received ?? hint.quantity ?? 0);
    if (requested <= 0) return;
    if (requested > remaining) {
      const err = new Error('over_receive');
      err.status = 400;
      err.code = 'OVER_RECEIVE';
      throw err;
    }
    receiptLines.push({
      item_name: poLine.item_name_ar || 'Item',
      quantity_ordered: ordered,
      quantity_received: requested,
      unit_cost: poLine.unit_cost || 0,
    });
  });

  if (!receiptLines.length) {
    const err = new Error('nothing_to_receive');
    err.status = 400;
    err.code = 'NOTHING_TO_RECEIVE';
    throw err;
  }
  return receiptLines;
}

async function receiveOrder(id, actorId, body = {}) {
  const Po = getPoModel();
  const Receipt = getReceiptModel();
  const po = await Po.findOne({ _id: id, deleted_at: null });
  if (!po) {
    const err = new Error('order_not_found');
    err.status = 404;
    throw err;
  }

  const partialLines = buildPartialReceiptLines(body, po);
  if (partialLines) {
    await Receipt.create({
      purchase_order_id: po._id,
      po_number: po.po_number,
      vendor_name: po.supplier_name,
      branch_id: po.branch_id,
      items: partialLines,
      received_by_name: body.receivedBy || body.received_by_name || null,
      quality_check: body.qualityCheck || body.quality_check || 'passed',
      notes: body.notes,
      created_by: actorId,
    });
    await applyReceiptLinesToPo(po, partialLines, actorId);
    const refreshed = await Po.findOne({ _id: id, deleted_at: null });
    return mapPoToLegacy(refreshed);
  }

  const existingGrn = await Receipt.findOne({ purchase_order_id: id, deleted_at: null });
  if (existingGrn) {
    return mapPoToLegacy(po);
  }

  const receiptLines = (po.items || []).map(it => ({
    item_name: it.item_name_ar || 'Item',
    quantity_ordered: it.quantity_ordered || 0,
    quantity_received: it.quantity_ordered || 0,
    unit_cost: it.unit_cost || 0,
  }));

  const stockDeltas = [];
  po.items.forEach(it => {
    const prev = it.quantity_received || 0;
    const next = it.quantity_ordered || 0;
    if (it.item_id && next > prev) {
      stockDeltas.push({
        item_id: it.item_id,
        quantity_delta: next - prev,
        unit_cost: it.unit_cost || 0,
      });
    }
    it.quantity_received = next;
  });
  po.status = 'received';
  po.actual_delivery_date = new Date();
  po.updated_by = actorId;
  await po.save();

  if (stockDeltas.length) {
    await applyStockReceiptForPoLines({ po, deltas: stockDeltas, actorId });
  }

  await Receipt.create({
    purchase_order_id: po._id,
    po_number: po.po_number,
    vendor_name: po.supplier_name,
    branch_id: po.branch_id,
    items: receiptLines,
    received_by_name: null,
    quality_check: 'passed',
    created_by: actorId,
  });

  return mapPoToLegacy(po);
}

function getReceiptModel() {
  return require('../models/inventory/PurchaseReceipt');
}

function getContractModel() {
  return require('../models/VendorSupplyContract');
}

function mapReceiptToLegacy(doc) {
  if (!doc) return doc;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const lines = o.items || [];
  const lineItems = lines.map(mapReceiptLineToLegacy).filter(Boolean);
  const ordered = lines.reduce((s, l) => s + (l.quantity_ordered || 0), 0);
  const received = lines.reduce((s, l) => s + (l.quantity_received || 0), 0);
  const d = o.receipt_date ? new Date(o.receipt_date) : new Date();
  return {
    ...o,
    _id: o._id,
    receiptNumber: o.receiptNumber || o.receipt_number,
    purchaseOrder: o.purchaseOrder || o.po_number || '',
    purchaseOrderId: o.purchaseOrderId || o.purchase_order_id || null,
    vendor: o.vendor || o.vendor_name || '',
    warehouse: o.warehouse || o.warehouse_name || '',
    branch: o.branch || (o.branch_id ? String(o.branch_id) : ''),
    date: d.toISOString().slice(0, 10),
    items: lines.length,
    itemsCount: lines.length,
    lineItems,
    itemsSummary: buildItemsSummary(lines, mapReceiptLineToLegacy, {
      qtyKey: 'quantityReceived',
    }),
    totalReceived: received,
    totalOrdered: ordered,
    totalAmount: o.totalAmount ?? o.total_amount ?? 0,
    status: o.status,
    receivedBy: o.receivedBy || o.received_by_name || '',
    qualityCheck: o.qualityCheck || o.quality_check || 'pending',
  };
}

function mapContractToLegacy(doc) {
  if (!doc) return doc;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const end = new Date(o.end_date || o.endDate);
  const now = Date.now();
  const daysLeft = (end.getTime() - now) / 86400000;
  let status = o.status === 'active' ? 'active' : o.status;
  if (o.status === 'active') {
    if (daysLeft <= 0) status = 'expired';
    else if (daysLeft <= 60) status = 'expiring_soon';
  }
  const start = o.start_date ? new Date(o.start_date) : null;
  return {
    ...o,
    _id: o._id,
    contractNumber: o.contractNumber || o.contract_number,
    vendor: o.vendor || o.vendor_name,
    type: o.type || o.contract_type || 'annual',
    startDate: start ? start.toISOString().slice(0, 10) : '',
    endDate: end.toISOString().slice(0, 10),
    value: o.value ?? o.contract_value ?? 0,
    category: o.category || '',
    autoRenew: o.autoRenew ?? o.auto_renew ?? false,
    status,
  };
}

async function listReceipts(query = {}) {
  const Receipt = getReceiptModel();
  const filter = { deleted_at: null };
  if (query.branchId) filter.branch_id = query.branchId;
  if (query.status) filter.status = query.status;
  const poId = query.purchaseOrderId || query.purchase_order_id;
  if (poId && require('mongoose').Types.ObjectId.isValid(poId)) {
    filter.purchase_order_id = poId;
  }
  const rows = await Receipt.find(filter)
    .sort({ receipt_date: -1 })
    .limit(query.limit ? Number(query.limit) : 200)
    .lean();
  return rows.map(mapReceiptToLegacy);
}

async function getReceipt(id) {
  const Receipt = getReceiptModel();
  const doc = await Receipt.findOne({ _id: id, deleted_at: null });
  if (!doc) {
    const err = new Error('receipt_not_found');
    err.status = 404;
    throw err;
  }
  return mapReceiptToLegacy(doc);
}

async function createReceipt(body, actorId) {
  const Receipt = getReceiptModel();
  const Po = getPoModel();
  const poId = body.purchaseOrderId || body.purchase_order_id;
  let poNumber = body.purchaseOrder || body.po_number;
  let vendorName = body.vendor || body.vendor_name;
  if (poId && require('mongoose').Types.ObjectId.isValid(poId)) {
    const po = await Po.findOne({ _id: poId, deleted_at: null }).lean();
    if (po) {
      poNumber = po.po_number || poNumber;
      vendorName = vendorName || po.supplier_name;
      if (!body.items || typeof body.items === 'number') {
        body.items = (po.items || []).map(it => ({
          item_name: it.item_name_ar,
          quantity_ordered: it.quantity_ordered,
          quantity_received:
            body.status === 'complete' ? it.quantity_ordered || it.quantity_received : 0,
          unit_cost: it.unit_cost,
        }));
      }
    }
  }
  const rawItems = Array.isArray(body.items)
    ? body.items
    : typeof body.items === 'number'
      ? Array.from({ length: body.items }, (_, i) => ({
          item_name: `Line ${i + 1}`,
          quantity_ordered: body.totalReceived || 1,
          quantity_received: body.totalReceived || 0,
          unit_cost: 0,
        }))
      : [];
  const items = rawItems.map(it => ({
    item_name: it.item_name || it.itemName || 'Item',
    quantity_ordered: it.quantity_ordered ?? it.quantityOrdered ?? it.quantity ?? 1,
    quantity_received:
      it.quantity_received ?? it.quantityReceived ?? (body.status === 'complete' ? it.quantity : 0),
    unit_cost: it.unit_cost ?? it.unitCost ?? 0,
  }));
  const doc = await Receipt.create({
    purchase_order_id: poId || null,
    po_number: poNumber,
    vendor_name: vendorName,
    warehouse_name: body.warehouse || body.warehouse_name,
    branch_id: body.branchId || body.branch_id,
    receipt_date: body.date || body.receipt_date,
    items,
    received_by_name: body.receivedBy || body.received_by_name,
    quality_check: body.qualityCheck || body.quality_check || 'pending',
    notes: body.notes,
    created_by: actorId,
  });

  if (poId && require('mongoose').Types.ObjectId.isValid(poId)) {
    const po = await Po.findOne({ _id: poId, deleted_at: null });
    if (po) await applyReceiptLinesToPo(po, items, actorId);
  }

  return mapReceiptToLegacy(doc);
}

async function listContracts(query = {}) {
  const Contract = getContractModel();
  const filter = { is_deleted: { $ne: true } };
  if (query.branchId) filter.branch_id = query.branchId;
  if (query.status) filter.status = query.status;
  const rows = await Contract.find(filter)
    .sort({ end_date: 1 })
    .limit(query.limit ? Number(query.limit) : 200)
    .lean();
  return rows.map(mapContractToLegacy);
}

async function listExpiringContracts(daysAhead = 60) {
  const Contract = getContractModel();
  const now = new Date();
  const horizon = new Date(now.getTime() + Number(daysAhead) * 86400000);
  const rows = await Contract.find({
    is_deleted: { $ne: true },
    status: 'active',
    end_date: { $gte: now, $lte: horizon },
  })
    .sort({ end_date: 1 })
    .lean();
  return rows.map(mapContractToLegacy);
}

async function createContract(body) {
  const Contract = getContractModel();
  const doc = await Contract.create({
    vendor_id: body.vendorId || body.vendor_id,
    vendor_name: body.vendor || body.vendor_name,
    contract_type: body.type || body.contract_type || 'annual',
    category: body.category,
    start_date: body.startDate || body.start_date || new Date(),
    end_date: body.endDate || body.end_date,
    contract_value: body.value ?? body.contract_value ?? 0,
    status: 'active',
    auto_renew: body.autoRenew ?? body.auto_renew ?? false,
    branch_id: body.branchId || body.branch_id,
    notes: body.notes,
  });
  return mapContractToLegacy(doc);
}

async function listReceiptsForOrder(orderId, query = {}) {
  if (!require('mongoose').Types.ObjectId.isValid(orderId)) {
    const err = new Error('invalid_order_id');
    err.status = 400;
    throw err;
  }
  return listReceipts({ ...query, purchaseOrderId: orderId });
}

async function getStats() {
  const Vendor = getVendorModel();
  const Po = getPoModel();
  const Receipt = getReceiptModel();
  const rows = await listRequests({ limit: 500 });
  const pendingStatuses = new Set([
    'draft',
    'submitted',
    'under_review',
    'returned_for_clarification',
  ]);
  const pendingRequests = rows.filter(r => pendingStatuses.has(r.status)).length;
  const [
    totalVendors,
    activeOrders,
    totalReceipts,
    totalOrders,
    delivered,
    pendingApproval,
    spendAgg,
  ] = await Promise.all([
    Vendor.countDocuments({ isDeleted: { $ne: true }, status: 'active' }),
    Po.countDocuments({
      deleted_at: null,
      status: { $in: ['approved', 'sent', 'partial', 'received', 'closed'] },
    }),
    Receipt.countDocuments({ deleted_at: null }),
    Po.countDocuments({ deleted_at: null }),
    Po.countDocuments({ deleted_at: null, status: { $in: ['received', 'closed'] } }),
    Po.countDocuments({
      deleted_at: null,
      status: { $in: ['draft', 'pending_approval'] },
    }),
    Po.aggregate([
      {
        $match: {
          deleted_at: null,
          status: { $in: ['received', 'closed', 'approved', 'sent', 'partial'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ]),
  ]);
  const totalSpend = spendAgg[0]?.total || 0;

  const deliveredPos = await Po.find({
    deleted_at: null,
    status: { $in: ['received', 'closed'] },
    actual_delivery_date: { $ne: null },
    order_date: { $ne: null },
  })
    .select('order_date actual_delivery_date')
    .lean();
  let avgDeliveryDays = 0;
  if (deliveredPos.length) {
    const sumDays = deliveredPos.reduce((acc, p) => {
      const days =
        (new Date(p.actual_delivery_date).getTime() - new Date(p.order_date).getTime()) / 86400000;
      return acc + Math.max(0, days);
    }, 0);
    avgDeliveryDays = Math.round(sumDays / deliveredPos.length);
  }

  return {
    totalVendors,
    activeOrders,
    totalReceipts,
    pendingRequests,
    totalSpend,
    monthlyBudget: 0,
    savingsAchieved: 0,
    totalOrders,
    totalAmount: totalSpend,
    pendingApproval,
    delivered,
    vendors: totalVendors,
    avgDeliveryDays,
  };
}

function tryGetInventoryStockPoModel() {
  try {
    const { PurchaseOrder } = require('../models/InventoryStock');
    return PurchaseOrder;
  } catch {
    return null;
  }
}

function buildBranchFilter(query, fieldName) {
  const branchId = query.branchId || query.branch_id;
  if (!branchId) return {};
  return { [fieldName]: branchId };
}

async function countLegacyPurchasingTierStats(query = {}) {
  const Po = getPoModel();
  const base = { deleted_at: null, ...buildBranchFilter(query, 'branch_id') };
  const [totalOrders, partialOrders, receivedOrders, pendingApproval, activeOrders] =
    await Promise.all([
      Po.countDocuments(base),
      Po.countDocuments({ ...base, status: 'partial' }),
      Po.countDocuments({ ...base, status: { $in: ['received', 'closed'] } }),
      Po.countDocuments({ ...base, status: { $in: ['draft', 'pending_approval'] } }),
      Po.countDocuments({
        ...base,
        status: { $in: ['approved', 'sent', 'partial'] },
      }),
    ]);
  return { totalOrders, partialOrders, receivedOrders, pendingApproval, activeOrders };
}

async function countInventoryStockTierStats(query = {}) {
  const StockPo = tryGetInventoryStockPoModel();
  if (!StockPo) {
    return {
      modelAvailable: false,
      totalOrders: 0,
      partiallyReceivedOrders: 0,
      receivedOrders: 0,
      pendingApproval: 0,
      activeOrders: 0,
    };
  }
  const base = { ...buildBranchFilter(query, 'branchId') };
  const [totalOrders, partiallyReceivedOrders, receivedOrders, pendingApproval, activeOrders] =
    await Promise.all([
      StockPo.countDocuments(base),
      StockPo.countDocuments({ ...base, status: 'partially_received' }),
      StockPo.countDocuments({ ...base, status: 'received' }),
      StockPo.countDocuments({ ...base, status: { $in: ['draft', 'pending_approval'] } }),
      StockPo.countDocuments({
        ...base,
        status: { $in: ['approved', 'ordered', 'partially_received'] },
      }),
    ]);
  return {
    modelAvailable: true,
    totalOrders,
    partiallyReceivedOrders,
    receivedOrders,
    pendingApproval,
    activeOrders,
  };
}

/** W799 — ADR-039 read-only federation; does not merge PO documents. */
async function getPlatformStats(query = {}) {
  const [legacyCounts, stockCounts] = await Promise.all([
    countLegacyPurchasingTierStats(query),
    countInventoryStockTierStats(query),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    adr: '039',
    note: 'Read-only per-tier counts; web-admin uses /api/v1/inventory, legacy React uses /api/v1/purchasing.',
    tiers: {
      legacyPurchasing: {
        tier: 'B',
        apiPath: '/api/v1/purchasing/orders',
        mongooseModel: 'InventoryModulePurchaseOrder',
        ...legacyCounts,
      },
      inventoryStock: {
        tier: 'A',
        apiPath: '/api/v1/inventory/purchase-orders',
        mongooseModel: 'PurchaseOrder',
        ...stockCounts,
      },
    },
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
  listReceipts,
  listReceiptsForOrder,
  getReceipt,
  createReceipt,
  listContracts,
  listExpiringContracts,
  createContract,
  getStats,
  getPlatformStats,
};
