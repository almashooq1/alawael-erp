/**
 * Social Media Routes — إدارة وسائل التواصل الاجتماعي
 * /api/v1/social-media/*
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, status) => res.status(status || 200).json({ success: true, data });

router.get('/overview', (_req, res) =>
  ok(res, { totalFollowers: 0, totalPosts: 0, engagement: 0, reach: 0, platforms: [] })
);
router.get('/engagement-trend', (_req, res) => ok(res, { labels: [], values: [] }));
router.get('/follower-growth', (_req, res) => ok(res, { labels: [], values: [] }));
router.get('/posts', (_req, res) => ok(res, { data: [], total: 0, page: 1 }));
router.post('/posts', (req, res) => ok(res, { _id: 'new', ...req.body }, 201));
router.put('/posts/:id', (req, res) => ok(res, { _id: req.params.id, ...req.body }));
router.delete('/posts/:id', (req, res) => ok(res, { deleted: true }));
router.get('/campaigns', (_req, res) => ok(res, []));
router.get('/hashtags', (_req, res) => ok(res, []));
router.get('/audience', (_req, res) => ok(res, { demographics: [], topCountries: [] }));
router.get('/best-times', (_req, res) => ok(res, { slots: [] }));
router.get('/team-activity', (_req, res) => ok(res, []));
router.get('/export', (_req, res) => ok(res, { url: null, message: 'Export not configured' }));

module.exports = router;
