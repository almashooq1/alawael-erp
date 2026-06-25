/**
 * WhatsApp Automation routes (W1517) — admin CRUD for event→message bindings.
 *
 * Mounted at /api/(v1/)whatsapp-automation. Distinct from whatsapp.routes.js to
 * avoid touching that hot file. Branch-isolated; writes require an admin/manager
 * role. The bindings drive whatsappEventBindingDispatcher (env-gated, default OFF).
 *
 * @module routes/whatsapp-automation.routes
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');

const router = express.Router();
router.use(authenticate);

const WRITE_ROLES = ['admin', 'super_admin', 'manager', 'branch_manager'];

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getBindingModel() {
  try {
    return mongoose.model('WhatsAppEventBinding');
  } catch {
    return require('../models/WhatsAppEventBinding');
  }
}

/** GET /bindings/events — the catalogue of bindable producer events */
router.get(
  '/bindings/events',
  asyncHandler(async (req, res) => {
    const Binding = getBindingModel();
    res.json({ success: true, data: Binding.BINDABLE_EVENTS || [] });
  })
);

/** GET /bindings — list (branch-scoped, optional ?event) */
router.get(
  '/bindings',
  asyncHandler(async (req, res) => {
    const Binding = getBindingModel();
    const data = await Binding.find(Binding.listFilter(effectiveBranchScope(req), { event: req.query.event }))
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();
    res.json({ success: true, data, total: data.length });
  })
);

/** POST /bindings — create (admin/manager). Explicit fields; no mass-assignment. */
router.post(
  '/bindings',
  authorize(WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const Binding = getBindingModel();
    const { name, event, title, body, enabled } = req.body || {};
    if (!name || !event || !title || !body) {
      return res.status(400).json({ success: false, message: 'name, event, title, body are required' });
    }
    if (!(Binding.BINDABLE_EVENTS || []).includes(event)) {
      return res.status(400).json({ success: false, message: 'event is not a bindable producer' });
    }
    const doc = await Binding.create({
      name: String(name).slice(0, 200),
      event,
      title: String(title).slice(0, 100),
      body: String(body).slice(0, 1024),
      enabled: enabled !== false,
      branchId: effectiveBranchScope(req) || undefined,
      createdBy: req.user?._id || req.user?.id || undefined,
    });
    res.status(201).json({ success: true, data: doc.toObject() });
  })
);

/** PATCH /bindings/:id — update enabled / title / body / name (admin/manager) */
router.patch(
  '/bindings/:id',
  authorize(WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const Binding = getBindingModel();
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const set = {};
    if (typeof req.body?.enabled === 'boolean') set.enabled = req.body.enabled;
    if (req.body?.name) set.name = String(req.body.name).slice(0, 200);
    if (req.body?.title) set.title = String(req.body.title).slice(0, 100);
    if (req.body?.body) set.body = String(req.body.body).slice(0, 1024);
    if (Object.keys(set).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields' });
    }
    const data = await Binding.findOneAndUpdate(
      Binding.scopedFilter(req.params.id, effectiveBranchScope(req)),
      { $set: set },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  })
);

/** DELETE /bindings/:id — soft delete (admin/manager) */
router.delete(
  '/bindings/:id',
  authorize(WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const Binding = getBindingModel();
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const data = await Binding.findOneAndUpdate(
      Binding.scopedFilter(req.params.id, effectiveBranchScope(req)),
      { $set: { isDeleted: true } },
      { returnDocument: 'after', projection: { _id: 1, isDeleted: 1 } }
    ).lean();
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { id: String(data._id), deleted: true } });
  })
);

module.exports = router;
