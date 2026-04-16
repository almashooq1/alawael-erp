/**
 * Privacy REST routes — Consent + Data Subject Requests (DSR).
 *
 * Mount under `/api/privacy` from the main route registry.
 *
 * These routes intentionally do NOT include auth/RBAC middleware; the
 * expectation is that the mounting layer wraps the router with
 * `authenticateToken` and (optionally) ABAC enforcement.
 *
 * Each route is thin: validation + model calls. Business logic that
 * spans contexts goes into a privacy service (to be added when needed).
 */

'use strict';

const express = require('express');

function buildRouter({ Consent, DataSubjectRequest, audit }) {
  if (!Consent || !DataSubjectRequest) {
    throw new Error('privacy.routes: Consent + DataSubjectRequest models required');
  }
  const router = express.Router();

  // ────────────────────────────────
  // CONSENT
  // ────────────────────────────────

  router.post('/consent', async (req, res, next) => {
    try {
      const {
        subjectType,
        subjectId,
        purpose,
        legalBasis,
        noticeVersion,
        noticeHash,
        channel,
        expiresAt,
      } = req.body || {};
      if (
        !subjectType ||
        !subjectId ||
        !purpose ||
        !legalBasis ||
        !noticeVersion ||
        !noticeHash ||
        !channel
      ) {
        return res.status(400).json({ error: 'missing_required_fields' });
      }
      const doc = await Consent.model.create({
        subjectType,
        subjectId,
        purpose,
        legalBasis,
        noticeVersion,
        noticeHash,
        channel,
        expiresAt,
        collectedBy: req.user && req.user.id,
        branchId: (req.user && req.user.defaultBranchId) || undefined,
        evidence: { ipAddress: req.ip, userAgent: req.get('User-Agent') },
      });
      if (audit) audit(req, { action: 'consent.granted', resourceId: doc._id });
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.get('/consent/latest', async (req, res, next) => {
    try {
      const { subjectType, subjectId, purpose } = req.query || {};
      if (!subjectType || !subjectId || !purpose) {
        return res.status(400).json({ error: 'missing_required_query' });
      }
      const doc = await Consent.model.latestFor(subjectType, subjectId, purpose);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.post('/consent/:id/withdraw', async (req, res, next) => {
    try {
      const { withdrawalReason } = req.body || {};
      const doc = await Consent.model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      if (doc.state !== 'granted') return res.status(409).json({ error: `already_${doc.state}` });
      doc.state = 'withdrawn';
      doc.withdrawnAt = new Date();
      doc.withdrawalReason = withdrawalReason || 'subject_request';
      await doc.save();
      if (audit) audit(req, { action: 'consent.withdrawn', resourceId: doc._id });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  // ────────────────────────────────
  // DATA SUBJECT REQUESTS (DSR)
  // ────────────────────────────────

  router.post('/dsr', async (req, res, next) => {
    try {
      const { requestType, subjectType, subjectId, description } = req.body || {};
      if (!requestType || !subjectType || !subjectId || !description) {
        return res.status(400).json({ error: 'missing_required_fields' });
      }
      if (!DataSubjectRequest.REQUEST_TYPES.includes(requestType)) {
        return res.status(400).json({ error: 'invalid_request_type' });
      }
      const doc = await DataSubjectRequest.model.create({
        requestType,
        subjectType,
        subjectId,
        description,
        requestedBy: req.user && req.user.id,
        branchId: (req.user && req.user.defaultBranchId) || undefined,
      });
      if (audit) audit(req, { action: 'dsr.opened', resourceId: doc._id });
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.get('/dsr', async (req, res, next) => {
    try {
      const { status, requestType, overdueOnly } = req.query || {};
      const q = {};
      if (status) q.status = status;
      if (requestType) q.requestType = requestType;
      if (overdueOnly === 'true') {
        q.slaDeadline = { $lt: new Date() };
        q.status = { $nin: ['fulfilled', 'rejected', 'withdrawn'] };
      }
      const list = await DataSubjectRequest.model.find(q).sort({ createdAt: -1 }).limit(100);
      res.json(list);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/dsr/:id/status', async (req, res, next) => {
    try {
      const { status, resolutionNote } = req.body || {};
      if (!DataSubjectRequest.STATUSES.includes(status)) {
        return res.status(400).json({ error: 'invalid_status' });
      }
      const doc = await DataSubjectRequest.model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      doc.status = status;
      if (status === 'fulfilled' || status === 'rejected' || status === 'withdrawn') {
        doc.resolvedAt = new Date();
        if (resolutionNote) doc.resolutionNote = resolutionNote;
      }
      if (
        doc.slaDeadline.getTime() < Date.now() &&
        !['fulfilled', 'rejected', 'withdrawn'].includes(doc.status)
      ) {
        doc.breachedSla = true;
      }
      await doc.save();
      if (audit)
        audit(req, { action: 'dsr.status_changed', resourceId: doc._id, meta: { status } });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { buildRouter };
