/**
 * visualization.routes.js — Data Visualization Routes
 * ═══════════════════════════════════════════════════
 * Real controller-backed chart CRUD, rendering, and export.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const visualization = require('../controllers/visualization.controller');
const validator = require('../validators/visualization.validator');

router.get('/', authenticate, validate(validator.getCharts), visualization.getCharts);
router.post('/', authenticate, validate(validator.createChart), visualization.createChart);
router.get('/:id', authenticate, validate(validator.getChart), visualization.getChart);
router.put('/:id', authenticate, validate(validator.updateChart), visualization.updateChart);
router.delete('/:id', authenticate, validate(validator.deleteChart), visualization.deleteChart);
router.post('/:id/render', authenticate, validate(validator.renderChart), visualization.renderChart);
router.get('/:id/export', authenticate, validate(validator.exportChart), visualization.exportChart);

module.exports = router;
