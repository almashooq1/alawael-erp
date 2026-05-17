/**
 * 📋 Form Templates Routes — النماذج الجاهزة
 * /api/v1/form-templates/*
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// ── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => ok(res, { total: 0, published: 0, drafts: 0, submissions: 0 }));

// ── Submissions ───────────────────────────────────────────────────────────
router.get('/submissions/my', (req, res) => ok(res, []));
router.get('/submissions/pending', (req, res) => ok(res, []));
router.put('/submissions/:id', (req, res) => ok(res, { _id: req.params.id, ...req.body }));

// ── Templates CRUD ────────────────────────────────────────────────────────
router.get('/', (req, res) => ok(res, []));
router.get('/:id', (req, res) => ok(res, { _id: req.params.id }));
router.post('/', (req, res) => ok(res, { _id: 'new', status: 'draft', ...req.body }, 201));
router.put('/:id', (req, res) => ok(res, { _id: req.params.id, ...req.body }));
router.delete('/:id', (req, res) => ok(res, { deleted: true, _id: req.params.id }));

// ── Submit ────────────────────────────────────────────────────────────────
router.post('/:templateId/submit', (req, res) =>
  ok(res, { submissionId: 'new', templateId: req.params.templateId, status: 'pending' }, 201)
);

module.exports = router;
