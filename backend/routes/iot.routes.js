/**
 * IoT Device Management Routes — إدارة أجهزة إنترنت الأشياء
 * /api/v1/iot/*
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, st) => res.status(st || 200).json({ success: true, data });

// Devices
router.get('/devices', (_req, res) => ok(res, []));
router.post('/devices', (req, res) =>
  ok(res, { _id: `dev_${Date.now()}`, status: 'registered', ...req.body }, 201)
);
router.get('/devices/:id', (req, res) => ok(res, { _id: req.params.id, status: 'online' }));
router.put('/devices/:id', (req, res) => ok(res, { _id: req.params.id, ...req.body }));
router.delete('/devices/:id', (req, res) => ok(res, { deleted: true }));
router.post('/devices/:id/command', (req, res) =>
  ok(res, { deviceId: req.params.id, command: req.body.command, queued: true })
);

// Telemetry & Readings
router.get('/devices/:id/readings', (req, res) => ok(res, []));
router.post('/devices/:id/readings', (req, res) => ok(res, { _id: `rdg_${Date.now()}` }, 201));
router.get('/devices/:id/latest', (req, res) =>
  ok(res, { deviceId: req.params.id, value: null, timestamp: null })
);

// Alerts
router.get('/alerts', (_req, res) => ok(res, []));
router.put('/alerts/:id/acknowledge', (req, res) =>
  ok(res, { _id: req.params.id, acknowledged: true })
);

// Dashboard
router.get('/dashboard', (_req, res) =>
  ok(res, { onlineDevices: 0, offlineDevices: 0, alertsCount: 0, devices: [] })
);

module.exports = router;
