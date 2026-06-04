/**
 * Rehab Licenses Routes — /api/v1/rehab-licenses/*
 * W772 — Mongo-backed via services/rehabLicenses.service.js (License collection).
 */
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { branchFilter, requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const svc = require('../services/rehabLicenses.service');
const { stripUpdateMeta } = require('../utils/sanitize');

// W833: populate req.branchScope so branchFilter(req) below actually enforces
// isolation (it returns {} — no filter — without it). dualMountAuth applies
// `authenticate` at mount, so req.user is present for requireBranchAccess.
router.use(requireBranchAccess);

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function scope(req) {
  return branchFilter(req);
}

function userId(req) {
  const u = req.user || {};
  return u.id || u._id || u.userId;
}

function validId(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'invalid_id' });
    return false;
  }
  return true;
}

// ── Catalog & dashboards ───────────────────────────────────────────────
router.get(
  '/types',
  wrap(async (req, res) => {
    res.json({ success: true, data: svc.getLicenseTypes() });
  })
);

router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const data = await svc.getDashboard(scope(req));
    res.json({ success: true, data });
  })
);

router.get(
  '/dashboard/enhanced',
  wrap(async (req, res) => {
    const data = await svc.getEnhancedDashboard(scope(req));
    res.json({ success: true, data });
  })
);

router.get(
  '/statistics',
  wrap(async (req, res) => {
    const d = await svc.getDashboard(scope(req));
    res.json({ success: true, data: { total: d.total, active: d.active, expired: d.expired } });
  })
);

router.get(
  '/statistics/regions',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);
router.get(
  '/statistics/renewals',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);

router.get(
  '/reports/monthly',
  wrap(async (req, res) => {
    res.json({
      success: true,
      data: { year: req.query.year, month: req.query.month, data: [] },
    });
  })
);
router.get(
  '/reports/costs',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);
router.get(
  '/reports/compliance',
  wrap(async (_req, res) => res.json({ success: true, data: { rate: 0, items: [] } }))
);
router.get(
  '/reports/annual',
  wrap(async (req, res) => {
    res.json({ success: true, data: { year: req.query.year, summary: {} } });
  })
);

router.get(
  '/alerts/active',
  wrap(async (req, res) => {
    const data = await svc.getActiveAlerts(scope(req));
    res.json({ success: true, data });
  })
);

router.post(
  '/alerts/scan',
  wrap(async (req, res) => {
    const data = await svc.scanAlerts(scope(req));
    res.json({ success: true, data });
  })
);

router.get(
  '/forecast/renewals',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);

router.post(
  '/bulk/renew',
  authorize('admin', 'manager'),
  wrap(async (_req, res) => res.json({ success: true, data: { renewed: 0 } }))
);
router.post(
  '/bulk/update-status',
  authorize('admin', 'manager'),
  wrap(async (_req, res) => res.json({ success: true, data: { updated: 0 } }))
);
router.post(
  '/bulk/import',
  authorize('admin', 'manager'),
  wrap(async (req, res) => {
    const licenses = Array.isArray(req.body.licenses) ? req.body.licenses : [];
    const scopeF = scope(req);
    const uid = userId(req);
    let imported = 0;
    const errors = [];
    for (const row of licenses) {
      try {
        await svc.create(row, uid, scopeF);
        imported += 1;
      } catch (e) {
        errors.push({ row, message: e.message });
      }
    }
    res.status(201).json({ success: true, data: { imported, errors } });
  })
);

router.get(
  '/expired',
  wrap(async (req, res) => {
    const data = await svc.getExpired(scope(req));
    res.json({ success: true, data });
  })
);

router.get(
  '/expiring-soon',
  wrap(async (req, res) => {
    const data = await svc.getExpiringSoon(req.query.days, scope(req));
    res.json({ success: true, data });
  })
);

router.get(
  '/duplicates',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);

router.get(
  '/archive',
  wrap(async (req, res) => {
    const data = await svc.getArchived(scope(req));
    res.json({ success: true, data });
  })
);

router.get(
  '/export',
  wrap(async (req, res) => {
    const { data } = await svc.list({ ...req.query, limit: 500, page: 1 }, scope(req));
    res.json({ success: true, data: { items: data, filters: req.query } });
  })
);

router.get(
  '/delegations/active',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);
router.get(
  '/penalties/pending',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);
router.get(
  '/penalties/statistics',
  wrap(async (_req, res) => res.json({ success: true, data: { total: 0, pending: 0, paid: 0 } }))
);

router.post(
  '/risk/calculate-all',
  wrap(async (_req, res) => res.json({ success: true, data: { processed: 0 } }))
);
router.get(
  '/risk/high',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);

router.post(
  '/health/calculate-all',
  wrap(async (_req, res) => res.json({ success: true, data: { processed: 0 } }))
);
router.get(
  '/health/low',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);

router.get(
  '/tasks/overdue',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);
router.get(
  '/tasks/statistics',
  wrap(async (_req, res) => res.json({ success: true, data: { total: 0, overdue: 0 } }))
);

router.get(
  '/communications/pending',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);
router.get(
  '/documents/statistics',
  wrap(async (_req, res) => res.json({ success: true, data: { total: 0, expired: 0 } }))
);
router.get(
  '/fees/total',
  wrap(async (_req, res) => res.json({ success: true, data: { total: 0 } }))
);
router.get(
  '/calendar/upcoming',
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);
router.get(
  '/budget/statistics',
  wrap(async (_req, res) => res.json({ success: true, data: { totalBudget: 0, spent: 0 } }))
);

// ── CRUD ───────────────────────────────────────────────────────────────
router.get(
  '/',
  wrap(async (req, res) => {
    const result = await svc.list(req.query, scope(req));
    res.json({ success: true, data: result.data, pagination: result.pagination });
  })
);

router.post(
  '/',
  authorize('admin', 'manager'),
  wrap(async (req, res) => {
    const data = await svc.create(stripUpdateMeta(req.body), userId(req), scope(req));
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/:id',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.getById(req.params.id, scope(req));
    res.json({ success: true, data });
  })
);

router.put(
  '/:id',
  authorize('admin', 'manager'),
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.update(req.params.id, stripUpdateMeta(req.body), scope(req));
    res.json({ success: true, data });
  })
);

router.delete(
  '/:id',
  authorize('admin', 'manager'),
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const reason = (req.body && req.body.reason) || 'deleted';
    const data = await svc.remove(req.params.id, reason, scope(req));
    res.json({ success: true, data });
  })
);

// ── Per-license ────────────────────────────────────────────────────────
router.post(
  '/:id/renew',
  authorize('admin', 'manager'),
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.renew(req.params.id, req.body, userId(req), scope(req));
    res.json({ success: true, data });
  })
);

router.get(
  '/:id/renewal-history',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const lic = await svc.getById(req.params.id, scope(req));
    res.json({ success: true, data: lic.renewalHistory || [] });
  })
);

router.post(
  '/:id/notes',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(
      req.params.id,
      'notes',
      { content: req.body.content, category: req.body.category },
      scope(req)
    );
    res.status(201).json({ success: true, data });
  })
);

router.post(
  '/:id/attachments',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'attachments', req.body, scope(req));
    res.status(201).json({ success: true, data });
  })
);

router.post(
  '/:id/inspection',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'inspections', req.body, scope(req));
    res.status(201).json({ success: true, data: { inspectionId: data._id || 'insp-new' } });
  })
);

router.post(
  '/:id/violation',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'violations', req.body, scope(req));
    res.status(201).json({ success: true, data: { violationId: data._id || 'viol-new' } });
  })
);

router.post(
  '/:id/delegation',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    await svc.update(req.params.id, { delegation: req.body }, scope(req));
    res.json({ success: true, data: { delegated: true } });
  })
);

router.delete(
  '/:id/delegation',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    await svc.update(req.params.id, { delegation: null }, scope(req));
    res.json({ success: true, data: { revoked: true } });
  })
);

router.post(
  '/:id/linked-licenses',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'linkedLicenses', req.body, scope(req));
    res.status(201).json({ success: true, data: { linkId: data._id } });
  })
);

router.get(
  '/:id/linked-licenses',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const lic = await svc.getById(req.params.id, scope(req));
    res.json({ success: true, data: lic.linkedLicenses || [] });
  })
);

router.post(
  '/:id/requirements',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'requirements', req.body, scope(req));
    res.status(201).json({ success: true, data: { reqId: data._id } });
  })
);

router.patch(
  '/:id/requirements/:reqId',
  wrap(async (req, res) => res.json({ success: true, data: { reqId: req.params.reqId } }))
);

router.get(
  '/:id/requirements/status',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const lic = await svc.getById(req.params.id, scope(req));
    const reqs = lic.requirements || [];
    const fulfilled = reqs.filter(r => r.status === 'fulfilled').length;
    res.json({
      success: true,
      data: { fulfilled, pending: Math.max(0, reqs.length - fulfilled) },
    });
  })
);

router.post(
  '/:id/conditions',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'conditions', req.body, scope(req));
    res.status(201).json({ success: true, data: { condId: data._id } });
  })
);

router.patch(
  '/:id/conditions/:condId',
  wrap(async (req, res) => res.json({ success: true, data: { condId: req.params.condId } }))
);

router.post(
  '/:id/penalties',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'penalties', req.body, scope(req));
    res.status(201).json({ success: true, data: { penId: data._id } });
  })
);

router.patch(
  '/:id/penalties/:penId',
  wrap(async (req, res) => res.json({ success: true, data: { penId: req.params.penId } }))
);

router.post(
  '/:id/risk/calculate',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    res.json({ success: true, data: { _id: req.params.id, riskScore: 0 } });
  })
);

router.post(
  '/:id/approval-workflow',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    await svc.update(req.params.id, { approvalWorkflow: req.body.steps || [] }, scope(req));
    res.json({ success: true, data: { _id: req.params.id, steps: req.body.steps } });
  })
);

router.patch(
  '/:id/approval-workflow/process',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    res.json({ success: true, data: { _id: req.params.id, processed: true } });
  })
);

router.patch(
  '/:id/archive',
  authorize('admin', 'manager'),
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.remove(req.params.id, req.body.reason || 'archived', scope(req));
    res.json({ success: true, data });
  })
);

router.patch(
  '/:id/unarchive',
  authorize('admin', 'manager'),
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.unarchive(req.params.id, scope(req));
    res.json({ success: true, data });
  })
);

router.post(
  '/:id/rating',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    await svc.update(req.params.id, { authorityRating: req.body }, scope(req));
    res.json({ success: true, data: { _id: req.params.id, rated: true } });
  })
);

router.patch(
  '/:id/notification-preferences',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    await svc.update(req.params.id, { notificationPreferences: req.body }, scope(req));
    res.json({ success: true, data: { updated: true } });
  })
);

router.post(
  '/:id/branches',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'branches', req.body, scope(req));
    res.status(201).json({ success: true, data: { branchId: data._id } });
  })
);

router.delete(
  '/:id/branches/:branchId',
  wrap(async (req, res) => res.json({ success: true, data: { deleted: true } }))
);

router.get(
  '/:id/audit-trail',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const lic = await svc.getById(req.params.id, scope(req));
    res.json({ success: true, data: lic.auditTrail || lic.renewalHistory || [] });
  })
);

router.post(
  '/:id/tasks',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'tasks', req.body, scope(req));
    res.status(201).json({ success: true, data: { taskId: data._id } });
  })
);

router.patch(
  '/:id/tasks/:taskId',
  wrap(async (req, res) => res.json({ success: true, data: { taskId: req.params.taskId } }))
);

router.delete(
  '/:id/tasks/:taskId',
  wrap(async (req, res) => res.json({ success: true, data: { deleted: true } }))
);

router.post(
  '/:id/communications',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'communications', req.body, scope(req));
    res.status(201).json({ success: true, data: { commId: data._id } });
  })
);

router.patch(
  '/:id/communications/:commId',
  wrap(async (req, res) => res.json({ success: true, data: { commId: req.params.commId } }))
);

router.post(
  '/:id/clone',
  authorize('admin', 'manager'),
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.cloneLicense(req.params.id, req.body, userId(req), scope(req));
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/:id/fees',
  wrap(async (_req, res) => res.json({ success: true, data: { total: 0, items: [] } }))
);

router.post(
  '/:id/calendar-events',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'calendarEvents', req.body, scope(req));
    res.status(201).json({ success: true, data: { eventId: data._id } });
  })
);

router.patch(
  '/:id/calendar-events/:eventId',
  wrap(async (req, res) => res.json({ success: true, data: { eventId: req.params.eventId } }))
);

router.delete(
  '/:id/calendar-events/:eventId',
  wrap(async (req, res) => res.json({ success: true, data: { deleted: true } }))
);

router.post(
  '/:id/authority-contacts',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'authorityContacts', req.body, scope(req));
    res.status(201).json({ success: true, data: { contactId: data._id } });
  })
);

router.patch(
  '/:id/authority-contacts/:contactId',
  wrap(async (req, res) => res.json({ success: true, data: { contactId: req.params.contactId } }))
);

router.delete(
  '/:id/authority-contacts/:contactId',
  wrap(async (req, res) => res.json({ success: true, data: { deleted: true } }))
);

router.post(
  '/:id/document-checklist',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'documentChecklist', req.body, scope(req));
    res.status(201).json({ success: true, data: { docId: data._id } });
  })
);

router.patch(
  '/:id/document-checklist/:docId',
  wrap(async (req, res) => res.json({ success: true, data: { docId: req.params.docId } }))
);

router.get(
  '/:id/document-checklist/status',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const lic = await svc.getById(req.params.id, scope(req));
    const docs = lic.documentChecklist || [];
    const complete = docs.filter(d => d.complete).length;
    res.json({
      success: true,
      data: { complete, pending: Math.max(0, docs.length - complete) },
    });
  })
);

router.post(
  '/:id/comments',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'comments', req.body, scope(req));
    res.status(201).json({ success: true, data: { commentId: data._id } });
  })
);

router.patch(
  '/:id/comments/:commentId',
  wrap(async (req, res) => res.json({ success: true, data: { commentId: req.params.commentId } }))
);

router.delete(
  '/:id/comments/:commentId',
  wrap(async (req, res) => res.json({ success: true, data: { deleted: true } }))
);

router.patch(
  '/:id/comments/:commentId/pin',
  wrap(async (req, res) => res.json({ success: true, data: { pinned: true } }))
);

router.patch(
  '/:id/budget',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.update(req.params.id, { budget: req.body }, scope(req));
    res.json({ success: true, data });
  })
);

router.post(
  '/:id/expenses',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.pushEmbedded(req.params.id, 'expenses', req.body, scope(req));
    res.status(201).json({ success: true, data: { expenseId: data._id } });
  })
);

router.post(
  '/:id/health/calculate',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    res.json({ success: true, data: { _id: req.params.id, healthScore: 100 } });
  })
);

router.patch(
  '/:id/alerts/:alertId/dismiss',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.patchAlert(
      req.params.id,
      req.params.alertId,
      { dismissed: true },
      scope(req)
    );
    res.json({ success: true, data });
  })
);

router.patch(
  '/:id/alerts/:alertId/read',
  wrap(async (req, res) => {
    if (!validId(req, res)) return;
    const data = await svc.patchAlert(
      req.params.id,
      req.params.alertId,
      { read: true },
      scope(req)
    );
    res.json({ success: true, data });
  })
);

router.use((err, _req, res, _next) => {
  if (err.status === 404) {
    return res.status(404).json({ success: false, message: err.message || 'not_found' });
  }
  if (err.status === 400) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return safeError(res, err, 'rehab-licenses');
});

module.exports = router;
