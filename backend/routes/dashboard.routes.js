/**
 * dashboard.routes.js — Dashboard V2 Routes
 * ═══════════════════════════════════════════
 * Real controller-backed dashboard for analytics, KPIs, and widgets.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const dashboard = require('../controllers/dashboard.controller');
const validator = require('../validators/dashboard.validator');

router.get('/', authenticate, validate(validator.getStats), dashboard.getStats);
router.get('/stats', authenticate, validate(validator.getStats), dashboard.getStats);
router.post('/stats/refresh', authenticate, validate(validator.refreshStats), dashboard.refreshStats);
router.get('/kpis', authenticate, validate(validator.getKPIs), dashboard.getKPIs);
router.get('/activity', authenticate, validate(validator.getActivity), dashboard.getActivity);
router.get('/widgets', authenticate, dashboard.getWidgets);
router.post('/widgets', authenticate, validate(validator.createWidget), dashboard.createWidget);
router.put('/widgets/:id', authenticate, validate(validator.updateWidget), dashboard.updateWidget);
router.delete('/widgets/:id', authenticate, validate(validator.deleteWidget), dashboard.deleteWidget);

module.exports = router;
