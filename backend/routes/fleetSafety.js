'use strict';
/**
 * Fleet Safety Routes — مسارات السلامة والحوادث
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
const safeError = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

router.use(authenticate);
router.use(requireBranchAccess);

// W1607 — the FleetSafety model is strict:false (accepts any field), so create/update must not
// pass the raw body: these fields are server-controlled (tenant branch, lifecycle, closure,
// reporter). branchId is stamped from the caller's scope; status/closure move via the dedicated
// endpoints. `requireBranchAccess` does NOT auto-filter — branchFilter(req) scopes every query.
const FLEET_SAFETY_STRIP = ['branchId', 'reportedBy', 'status', 'closedAt', 'closedBy', 'resolution'];
const stripFleetSafety = body => {
  const b = stripUpdateMeta(body || {});
  for (const k of FLEET_SAFETY_STRIP) delete b[k];
  return b;
};

router.get('/', async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    const { page = 1, limit = 20, vehicleId, driverId, severity, status } = req.query;
    const filter = { ...branchFilter(req) }; // W1607 — restricted → own branch only
    if (vehicleId) filter.vehicleId = vehicleId;
    if (driverId) filter.driverId = driverId;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetSafety.find(filter).sort({ incidentDate: -1 }).skip(skip).limit(+limit).lean(),
      FleetSafety.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetSafety');
  }
});

router.post('/', async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    const scope = effectiveBranchScope(req); // W1607 — restricted → own branch; HQ → body-supplied
    const incident = await FleetSafety.create({
      ...stripFleetSafety(req.body),
      branchId: scope || req.body.branchId || null,
      reportedBy: req.user._id,
      status: 'open',
    });
    res.status(201).json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    // W1607 — scoped lookup: a foreign-branch incident reads as not-found (no cross-branch IDOR).
    const incident = await FleetSafety.findOne({ _id: req.params.id, ...branchFilter(req) }).lean();
    if (!incident)
      return res.status(404).json({ success: false, message: 'Safety incident not found' });
    res.json({ success: true, data: incident });
  } catch (err) {
    return safeError(res, err, 'fleetSafety');
  }
});

router.put('/:id', authorize('admin', 'manager', 'safety_officer'), async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    // W1607 — scoped update (foreign branch → not-found) + strip server-controlled fields.
    const incident = await FleetSafety.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripFleetSafety(req.body),
      { returnDocument: 'after', runValidators: true }
    );
    if (!incident)
      return res.status(404).json({ success: false, message: 'Safety incident not found' });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/close', authorize('admin', 'manager', 'safety_officer'), async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    const { resolution } = req.body;
    // W1607 — scoped close: no cross-branch state change.
    const incident = await FleetSafety.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      { status: 'closed', resolution, closedAt: new Date(), closedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!incident)
      return res.status(404).json({ success: false, message: 'Safety incident not found' });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/by-severity', async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    // W1607 — scope the aggregate to the caller's branch (ObjectId cast for $match).
    const scope = effectiveBranchScope(req);
    const match = scope ? { branchId: new mongoose.Types.ObjectId(String(scope)) } : {};
    const data = await FleetSafety.aggregate([
      { $match: match },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'fleetSafety');
  }
});

module.exports = router;
