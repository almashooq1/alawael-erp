/**
 * Alerts Routes — /api/v1/alerts/*
 * Active alerts, acknowledge, snooze, rules
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, st) => res.status(st || 200).json({ success: true, data });

router.get('/active', (req, res) => ok(res, []));
router.get('/rules/list', (req, res) => ok(res, []));
router.get('/:id', (req, res) => ok(res, { _id: req.params.id }));
router.post('/:id/acknowledge', (req, res) =>
  ok(res, { _id: req.params.id, acknowledged: true, note: req.body.note })
);
router.post('/:id/snooze', (req, res) =>
  ok(res, {
    _id: req.params.id,
    snoozedUntil: new Date(Date.now() + (req.body.minutes || 60) * 60000),
  })
);

module.exports = router;
