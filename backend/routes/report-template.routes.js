/**
 * report-template.routes.js — Report Template Routes
 * ═══════════════════════════════════════════════════
 * Real controller-backed template CRUD and versioning.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const reportTemplate = require('../controllers/reportTemplate.controller');
const validator = require('../validators/reportTemplate.validator');

router.get('/', authenticate, validate(validator.getTemplates), reportTemplate.getTemplates);
router.post('/', authenticate, validate(validator.createTemplate), reportTemplate.createTemplate);
router.get('/:id', authenticate, validate(validator.getTemplate), reportTemplate.getTemplate);
router.put('/:id', authenticate, validate(validator.updateTemplate), reportTemplate.updateTemplate);
router.delete('/:id', authenticate, validate(validator.deleteTemplate), reportTemplate.deleteTemplate);
router.post('/:id/clone', authenticate, validate(validator.cloneTemplate), reportTemplate.cloneTemplate);
router.get('/:id/versions', authenticate, validate(validator.getTemplate), reportTemplate.getTemplateVersions);

module.exports = router;
