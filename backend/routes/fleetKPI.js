'use strict';
/**
 * Fleet KPI Routes — مسارات مؤشرات الأداء الرئيسية للأسطول
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const FleetKPI = require('../models/Fleet/FleetKPI');
    const { page = 1, limit = 20, period, vehicleId } = req.query;
    const filter = {};
    if (period) filter.period = period;
    if (vehicleId) filter.vehicleId = vehicleId;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetKPI.find(filter).sort({ recordedAt: -1 }).skip(skip).limit(+limit).lean(),
      FleetKPI.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetKPI = require('../models/Fleet/FleetKPI');
    const kpi = await FleetKPI.create({
      ...req.body,
      recordedBy: req.user._id,
      recordedAt: new Date(),
    });
    res.status(201).json({ success: true, data: kpi });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/current', async (req, res) => {
  try {
    const FleetFuel = require('../models/Fleet/FleetFuel');
    const Trip = require('../models/Fleet/Trip');
    const FleetCost = require('../models/Fleet/FleetCost');
    const FleetSafety = require('../models/Fleet/FleetSafety');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [fuelCost, tripCount, maintenanceCost, incidentCount] = await Promise.all([
      FleetFuel.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$cost' } } },
      ]),
      Trip.countDocuments({ createdAt: { $gte: monthStart } }),
      FleetCost.aggregate([
        { $match: { date: { $gte: monthStart }, category: 'maintenance' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      FleetSafety.countDocuments({ incidentDate: { $gte: monthStart } }),
    ]);
    res.json({
      success: true,
      data: {
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        fuelCostMTD: (fuelCost[0] || { total: 0 }).total,
        tripsMTD: tripCount,
        maintenanceCostMTD: (maintenanceCost[0] || { total: 0 }).total,
        incidentsMTD: incidentCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/trends', async (req, res) => {
  try {
    const FleetKPI = require('../models/Fleet/FleetKPI');
    const { months = 6 } = req.query;
    const from = new Date();
    from.setMonth(from.getMonth() - +months);
    const data = await FleetKPI.find({ recordedAt: { $gte: from } })
      .sort({ recordedAt: 1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
