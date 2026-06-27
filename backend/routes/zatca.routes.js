/**
 * zatca.routes.js — ZATCA E-Invoicing Routes
 * ═══════════════════════════════════════════
 * Real controller-backed invoice CRUD and ZATCA operations.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const zatca = require('../controllers/zatca.controller');
const validator = require('../validators/zatca.validator');

router.get('/', authenticate, validate(validator.getInvoices), zatca.getInvoices);
router.post('/', authenticate, validate(validator.createInvoice), zatca.createInvoice);
router.get('/:id', authenticate, validate(validator.getInvoice), zatca.getInvoice);
router.put('/:id', authenticate, validate(validator.updateInvoice), zatca.updateInvoice);
router.delete('/:id', authenticate, validate(validator.deleteInvoice), zatca.deleteInvoice);
router.get('/:id/status', authenticate, validate(validator.getInvoiceStatus), zatca.getInvoiceStatus);
router.post('/:id/clear', authenticate, validate(validator.clearInvoice), zatca.clearInvoice);
router.post('/:id/report', authenticate, validate(validator.reportInvoice), zatca.reportInvoice);

module.exports = router;
