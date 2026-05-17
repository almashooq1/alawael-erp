/**
 * 🚌 Transport Overview Routes — النقل (لوحة القيادة والتحليلات)
 * /api/v1/transport/*
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data) => res.json({ success: true, data });

router.get('/dashboard', (req, res) =>
  ok(res, {
    activeVehicles: 0,
    ongoingTrips: 0,
    driversOnDuty: 0,
    delayedRoutes: 0,
    fuelAlerts: 0,
    maintenanceDue: 0,
    todayTrips: [],
    liveMap: [],
  })
);

router.get('/analytics/monthly', (req, res) =>
  ok(res, {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    totalTrips: 0,
    totalKm: 0,
    fuelConsumed: 0,
    onTimeRate: 0,
    incidentCount: 0,
    costPerKm: 0,
    weekly: [],
  })
);

router.get('/analytics/summary', (req, res) =>
  ok(res, { period: req.query.period || 'month', data: [] })
);

module.exports = router;
