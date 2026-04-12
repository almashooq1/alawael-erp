'use strict';
/**
 * DocumentVault Routes
 * Auto-extracted from services/dddDocumentVault.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddDocumentVault');
const { validate } = require('../middleware/validate');
const v = require('../validations/document-vault.validation');


  // Service imported as singleton above;

  /* Documents */
  router.get('/vault/documents', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDocuments(req.query) });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });
  router.get('/vault/documents/search', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.searchDocuments(req.query.q || '') });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });
  router.get('/vault/documents/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getDocument(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });
  router.post('/vault/documents', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.uploadDocument(req.body) });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });
  router.put('/vault/documents/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateDocument(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });
  router.delete('/vault/documents/:id', authenticate, async (req, res) => {
    try {
      await svc.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });

  /* Folders */
  router.get('/vault/folders', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFolders(req.query.parentId || null) });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });
  router.post('/vault/folders', authenticate, validate(v.createFolder), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFolder(req.body) });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });

  /* Tags */
  router.get('/vault/tags', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listTags() });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });

  /* Access */
  router.get('/vault/access/:documentId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAccess(req.params.documentId) });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });
  router.post('/vault/access', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.grantAccess(req.body) });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });

  /* Analytics & Health */
  router.get('/vault/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getVaultAnalytics() });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });
  router.get('/vault/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'document-vault');
    }
  });


module.exports = router;
