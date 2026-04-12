'use strict';
/**
 * DocumentCollaboration Routes
 * Auto-extracted from services/dddDocumentCollaboration.js
 * 12 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getDocumentCollabDashboard, createDocument, updateDocument, lockDocument, unlockDocument, getDocumentComments, addComment, resolveComment, submitForReview, submitReview, getDocumentVersions } = require('../services/dddDocumentCollaboration');
const { DDDCollabDocument } = require('../models/DddDocumentCollaboration');
const { validate } = require('../middleware/validate');
const v = require('../validations/document-collaboration.validation');

  router.get('/document-collaboration', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await getDocumentCollabDashboard() });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.get('/document-collaboration/documents', authenticate, async (req, res) => {
    try {
    const query = { isActive: true };
    if (req.query.type) query.type = req.query.type;
    if (req.query.reviewStatus) query.reviewStatus = req.query.reviewStatus;
    const docs = await DDDCollabDocument.find(query)
    .sort({ updatedAt: -1 })
    .limit(parseInt(req.query.limit) || 50)
    .lean();
    res.json({ success: true, data: docs });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.post('/document-collaboration/documents', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await createDocument(req.body) });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.put('/document-collaboration/documents/:documentId', authenticate, async (req, res) => {
    try {
    const { userId, content, changeDescription } = req.body;
    res.json({
    success: true,
    data: await updateDocument(req.params.documentId, userId, content, changeDescription),
    });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.post('/document-collaboration/documents/:documentId/lock', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await lockDocument(req.params.documentId, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.post('/document-collaboration/documents/:documentId/unlock', authenticate, async (req, res) => {
    try {
    res.json({
    success: true,
    data: await unlockDocument(req.params.documentId, req.body.userId),
    });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.get('/document-collaboration/documents/:documentId/comments', authenticate, async (req, res) => {
    try {
    res.json({
    success: true,
    data: await getDocumentComments(req.params.documentId, req.query),
    });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.post('/document-collaboration/documents/:documentId/comments', authenticate, validate(v.createComment), async (req, res) => {
    try {
    const { authorId, content, ...opts } = req.body;
    res.json({
    success: true,
    data: await addComment(req.params.documentId, authorId, content, opts),
    });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.post('/document-collaboration/comments/:commentId/resolve', authenticate, async (req, res) => {
    try {
    res.json({
    success: true,
    data: await resolveComment(req.params.commentId, req.body.userId),
    });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.post('/document-collaboration/documents/:documentId/review/submit', authenticate, async (req, res) => {
    try {
    res.json({
    success: true,
    data: await submitForReview(req.params.documentId, req.body.reviewerIds),
    });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.post('/document-collaboration/documents/:documentId/review/respond', authenticate, async (req, res) => {
    try {
    const { userId, status, feedback } = req.body;
    res.json({
    success: true,
    data: await submitReview(req.params.documentId, userId, status, feedback),
    });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

  router.get('/document-collaboration/documents/:documentId/versions', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await getDocumentVersions(req.params.documentId) });
    } catch (e) {
      safeError(res, e, 'document-collaboration');
    }
  });

module.exports = router;
