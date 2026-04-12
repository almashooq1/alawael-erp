'use strict';
/**
 * DigitalSignature Routes
 * Auto-extracted from services/dddDigitalSignature.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddDigitalSignature');
const { validate } = require('../middleware/validate');
const v = require('../validations/digital-signature.validation');


  // Service imported as singleton above;

  /* Requests */
  router.get('/signatures/requests', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequests(req.query) });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });
  router.get('/signatures/requests/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRequest(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });
  router.post('/signatures/requests', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequest(req.body) });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });
  router.post('/signatures/requests/:id/sign', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.signDocument(req.params.id, req.body.signerId, req.body.signatureData),
      });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });
  router.post('/signatures/requests/:id/decline', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.declineSignature(req.params.id, req.body.signerId, req.body.reason),
      });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });

  /* Templates */
  router.get('/signatures/templates', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listTemplates() });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });
  router.post('/signatures/templates', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTemplate(req.body) });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });

  /* Certificates */
  router.get('/signatures/certificates', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCertificates(req.query) });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });
  router.post('/signatures/certificates', authenticate, validate(v.createCertificate), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.issueCertificate(req.body) });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });
  router.post('/signatures/certificates/:id/revoke', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.revokeCertificate(req.params.id, req.body.reason),
      });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });

  /* Audit */
  router.get('/signatures/audit/:requestId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAudit(req.params.requestId) });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });

  /* Analytics & Health */
  router.get('/signatures/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSignatureAnalytics() });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });
  router.get('/signatures/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'digital-signature');
    }
  });


module.exports = router;
