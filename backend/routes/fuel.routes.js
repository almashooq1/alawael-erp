/**
 * ⛽ Fuel Management Routes — إدارة الوقود
 * /api/v1/fuel/*
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

router.get('/stats', (req, res) =>
  ok(res, { totalConsumption: 0, totalCost: 0, avgEfficiency: 0, vehicles: 0 })
);
router.get('/', (req, res) => ok(res, []));
router.get('/:id', (req, res) => ok(res, { _id: req.params.id }));
router.post('/', (req, res) => ok(res, { _id: 'new', ...req.body, createdAt: new Date() }, 201));
router.put('/:id', (req, res) => ok(res, { _id: req.params.id, ...req.body }));
router.delete('/:id', (req, res) => ok(res, { deleted: true, _id: req.params.id }));

module.exports = router;
