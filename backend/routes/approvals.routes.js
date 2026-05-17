/**
 * Approvals Routes — /api/v1/approvals/*
 * Approval requests, chains, inbox, approve/reject/cancel/escalate
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, st) => res.status(st || 200).json({ success: true, data });

router.get('/chains', (req, res) => ok(res, []));
router.get('/inbox', (req, res) => ok(res, []));
router.get('/', (req, res) => ok(res, []));
router.post('/', (req, res) => ok(res, { _id: 'new', ...req.body, status: 'pending' }, 201));
router.get('/:id', (req, res) => ok(res, { _id: req.params.id }));
router.post('/:id/approve', (req, res) =>
  ok(res, { _id: req.params.id, status: 'approved', note: req.body.note })
);
router.post('/:id/reject', (req, res) =>
  ok(res, { _id: req.params.id, status: 'rejected', note: req.body.note })
);
router.post('/:id/cancel', (req, res) =>
  ok(res, { _id: req.params.id, status: 'cancelled', note: req.body.note })
);
router.post('/:id/escalate', (req, res) =>
  ok(res, { _id: req.params.id, status: 'escalated', note: req.body.note })
);

module.exports = router;
