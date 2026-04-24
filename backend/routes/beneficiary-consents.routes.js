/**
 * beneficiary-consents.routes.js — Beneficiary-360 Commit 22.
 *
 * HTTP surface for the Consent collection built in Commit 19.
 * The model has existed but had no API; without one, nothing
 * actually writes records and both CRITICAL consent flags stay
 * dormant. This file is what makes those flags useful in
 * production.
 *
 * Mount like:
 *
 *   app.use('/api/v1/beneficiaries', authenticate,
 *     createConsentRouter({ consentModel, beneficiaryModel }));
 *
 * Endpoints (all scoped to :beneficiaryId):
 *
 *   GET  /:beneficiaryId/consents
 *     List consent records (most recent first). No pagination —
 *     consent count per beneficiary is small.
 *
 *   POST /:beneficiaryId/consents
 *     Create a new consent grant. Body: { type, grantedBy?,
 *     expiresAt?, signatureRef?, documentRef?, grantedAt? }.
 *     Validates type against CONSENT_TYPES.
 *
 *   POST /:beneficiaryId/consents/:consentId/revoke
 *     Mark an active consent as revoked. Body: { reason? }.
 *     Never deletes — append-only audit trail.
 *
 *   PATCH /:beneficiaryId/consent-tracking
 *     Toggle the opt-in gate. Body: { enabled: boolean }.
 *     Until this is true, the CRITICAL consent flags stay quiet
 *     for this beneficiary.
 *
 * Design decisions:
 *
 *   1. **Factory pattern**, matching the red-flag router — no
 *      module-level singletons, models injected at construction
 *      for testability.
 *
 *   2. **Validation at the service layer, not Mongoose**, so a
 *      malformed request returns 400 with a structured error body
 *      rather than a 500 + schema dump.
 *
 *   3. **Never deletes.** Revoke sets `revokedAt` + `revokedReason`;
 *      a hypothetical "oops" rollback would mean creating a new
 *      grant, not undoing the revoke row.
 *
 *   4. **Consistent envelope** (`{ data }` on success, `{ error }`
 *      on failure) — same shape the red-flag router uses so UI
 *      clients don't learn two different schemas.
 */

'use strict';

const express = require('express');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function toConsentRecord(doc) {
  if (doc == null) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(plain._id),
    beneficiaryId: String(plain.beneficiaryId),
    type: plain.type,
    grantedBy: plain.grantedBy ? String(plain.grantedBy) : null,
    grantedAt: plain.grantedAt ? new Date(plain.grantedAt).toISOString() : null,
    expiresAt: plain.expiresAt ? new Date(plain.expiresAt).toISOString() : null,
    revokedAt: plain.revokedAt ? new Date(plain.revokedAt).toISOString() : null,
    revokedReason: plain.revokedReason || null,
    signatureRef: plain.signatureRef || null,
    documentRef: plain.documentRef || null,
    isActive:
      plain.revokedAt == null &&
      (plain.expiresAt == null || new Date(plain.expiresAt) > new Date()),
  };
}

function createConsentRouter(deps = {}) {
  const Consent = deps.consentModel;
  const Beneficiary = deps.beneficiaryModel;
  const consentTypes = Array.isArray(deps.consentTypes)
    ? deps.consentTypes
    : ['treatment', 'photography', 'data_sharing', 'trip', 'research'];

  if (Consent == null || typeof Consent.find !== 'function') {
    throw new Error('createConsentRouter: consentModel with Mongoose API is required');
  }
  if (Beneficiary == null || typeof Beneficiary.findByIdAndUpdate !== 'function') {
    throw new Error('createConsentRouter: beneficiaryModel with Mongoose API is required');
  }

  const router = express.Router({ mergeParams: true });
  router.use(express.json());

  // ─── GET /:beneficiaryId/consents ──────────────────────────────
  router.get(
    '/:beneficiaryId/consents',
    asyncHandler(async (req, res) => {
      const { beneficiaryId } = req.params;
      if (!beneficiaryId) {
        return res.status(400).json({
          error: { code: 'BENEFICIARY_ID_REQUIRED', message: 'beneficiaryId is required' },
        });
      }
      const docs = await Consent.find({ beneficiaryId }).sort({ grantedAt: -1 }).lean();
      return res.status(200).json({ data: docs.map(toConsentRecord) });
    })
  );

  // ─── POST /:beneficiaryId/consents ─────────────────────────────
  router.post(
    '/:beneficiaryId/consents',
    asyncHandler(async (req, res) => {
      const { beneficiaryId } = req.params;
      if (!beneficiaryId) {
        return res.status(400).json({
          error: { code: 'BENEFICIARY_ID_REQUIRED', message: 'beneficiaryId is required' },
        });
      }
      const body = req.body || {};
      if (!consentTypes.includes(body.type)) {
        return res.status(400).json({
          error: {
            code: 'CONSENT_TYPE_INVALID',
            message: `type must be one of: ${consentTypes.join(', ')}`,
          },
        });
      }
      const payload = {
        beneficiaryId,
        type: body.type,
        grantedAt: body.grantedAt ? new Date(body.grantedAt) : new Date(),
      };
      if (body.grantedBy) payload.grantedBy = body.grantedBy;
      if (body.expiresAt) payload.expiresAt = new Date(body.expiresAt);
      if (body.signatureRef) payload.signatureRef = body.signatureRef;
      if (body.documentRef) payload.documentRef = body.documentRef;
      try {
        const doc = await Consent.create(payload);
        return res.status(201).json({ data: toConsentRecord(doc) });
      } catch (err) {
        return res.status(400).json({
          error: {
            code: 'CONSENT_VALIDATION_FAILED',
            message: err.message || 'consent validation failed',
          },
        });
      }
    })
  );

  // ─── POST /:beneficiaryId/consents/:consentId/revoke ──────────
  router.post(
    '/:beneficiaryId/consents/:consentId/revoke',
    asyncHandler(async (req, res) => {
      const { beneficiaryId, consentId } = req.params;
      if (!beneficiaryId || !consentId) {
        return res.status(400).json({
          error: {
            code: 'REQUIRED_PARAMS_MISSING',
            message: 'beneficiaryId and consentId are required',
          },
        });
      }
      const body = req.body || {};
      const doc = await Consent.findOne({ _id: consentId, beneficiaryId });
      if (!doc) {
        return res.status(404).json({
          error: {
            code: 'CONSENT_NOT_FOUND',
            message: `No consent '${consentId}' for beneficiary '${beneficiaryId}'`,
          },
        });
      }
      if (doc.revokedAt != null) {
        return res.status(409).json({
          error: {
            code: 'CONSENT_ALREADY_REVOKED',
            message: 'consent already revoked',
          },
        });
      }
      doc.revokedAt = new Date();
      if (body.reason) doc.revokedReason = String(body.reason);
      await doc.save();
      return res.status(200).json({ data: toConsentRecord(doc) });
    })
  );

  // ─── GET /:beneficiaryId/consent-tracking ──────────────────────
  router.get(
    '/:beneficiaryId/consent-tracking',
    asyncHandler(async (req, res) => {
      const { beneficiaryId } = req.params;
      if (!beneficiaryId) {
        return res.status(400).json({
          error: { code: 'BENEFICIARY_ID_REQUIRED', message: 'beneficiaryId is required' },
        });
      }
      const doc = await Beneficiary.findById(beneficiaryId, 'consentTrackingEnabled').lean();
      if (!doc) {
        return res.status(404).json({
          error: {
            code: 'BENEFICIARY_NOT_FOUND',
            message: `Beneficiary '${beneficiaryId}' not found`,
          },
        });
      }
      return res.status(200).json({
        data: {
          beneficiaryId,
          consentTrackingEnabled: doc.consentTrackingEnabled === true,
        },
      });
    })
  );

  // ─── PATCH /:beneficiaryId/consent-tracking ────────────────────
  router.patch(
    '/:beneficiaryId/consent-tracking',
    asyncHandler(async (req, res) => {
      const { beneficiaryId } = req.params;
      if (!beneficiaryId) {
        return res.status(400).json({
          error: { code: 'BENEFICIARY_ID_REQUIRED', message: 'beneficiaryId is required' },
        });
      }
      const { enabled } = req.body || {};
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          error: {
            code: 'ENABLED_REQUIRED',
            message: 'body.enabled must be a boolean',
          },
        });
      }
      const updated = await Beneficiary.findByIdAndUpdate(
        beneficiaryId,
        { $set: { consentTrackingEnabled: enabled } },
        { new: true, runValidators: true, lean: true }
      );
      if (!updated) {
        return res.status(404).json({
          error: {
            code: 'BENEFICIARY_NOT_FOUND',
            message: `Beneficiary '${beneficiaryId}' not found`,
          },
        });
      }
      return res.status(200).json({
        data: {
          beneficiaryId,
          consentTrackingEnabled: updated.consentTrackingEnabled === true,
        },
      });
    })
  );

  router.use((err, _req, res, _next) => {
    return res.status(500).json({
      error: {
        code: 'CONSENT_ROUTER_ERROR',
        message: err && err.message ? err.message : 'internal error',
      },
    });
  });

  return router;
}

module.exports = { createConsentRouter };
