/**
 * scheduled-report.routes.js — Scheduled Report Routes
 * ═══════════════════════════════════════════════════
 * Real controller-backed schedule CRUD and execution.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const scheduledReport = require('../controllers/scheduledReport.controller');
const validator = require('../validators/scheduledReport.validator');

router.get('/', authenticate, validate(validator.getSchedules), scheduledReport.getSchedules);
router.post('/', authenticate, validate(validator.createSchedule), scheduledReport.createSchedule);
router.get('/:id', authenticate, validate(validator.getSchedule), scheduledReport.getSchedule);
router.put('/:id', authenticate, validate(validator.updateSchedule), scheduledReport.updateSchedule);
router.delete('/:id', authenticate, validate(validator.deleteSchedule), scheduledReport.deleteSchedule);
router.post('/:id/run', authenticate, validate(validator.runSchedule), scheduledReport.runSchedule);
router.post('/:id/pause', authenticate, validate(validator.runSchedule), scheduledReport.pauseSchedule);
router.post('/:id/resume', authenticate, validate(validator.runSchedule), scheduledReport.resumeSchedule);

module.exports = router;
