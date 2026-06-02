'use strict';

/**
 * Legacy /api/v1/purchasing/* adapter — delegates PR workflow to Phase-16 ops.
 * Frontend: procurement.service.js + operationsService.js (legacy React).
 * Canonical ops surface: /api/v1/ops/purchase-requests.
 */

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
  const PO = require('../models/inventory/PurchaseOrder');
  return createPurchaseRequestService({ prModel: PR, poModel: PO });
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
          estimatedUnitCost: body.estimatedUnitCost || body.unitCost || 0,
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

async function getStats() {
  const rows = await listRequests({ limit: 500 });
  const pendingStatuses = new Set([
    'draft',
    'submitted',
    'under_review',
    'returned_for_clarification',
  ]);
  const pendingRequests = rows.filter(r => pendingStatuses.has(r.status)).length;
  const approved = rows.filter(
    r => r.status === 'approved' || r.status === 'converted_to_po'
  ).length;
  return {
    totalVendors: 0,
    activeOrders: approved,
    pendingRequests,
    totalSpend: 0,
    monthlyBudget: 0,
    savingsAchieved: 0,
  };
}

async function listOrders() {
  const rows = await listRequests({ limit: 500 });
  return rows.filter(r => r.status === 'converted_to_po' || r.status === 'approved');
}

module.exports = {
  listRequests,
  getRequest,
  createRequest,
  approveRequest,
  rejectRequest,
  getStats,
  listOrders,
};
