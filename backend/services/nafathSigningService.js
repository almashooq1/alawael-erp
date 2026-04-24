/**
 * Nafath Signing Service — orchestrates the lifecycle of a document
 * signature request against the Saudi Nafath identity service.
 *
 * Public operations:
 *   requestSignature(input)     — creates a NafathSignatureRequest row and
 *                                  asks Nafath to start a signing session.
 *                                  Returns randomNumber the user must match
 *                                  in the Nafath mobile app.
 *   pollSignature(requestId)    — checks the adapter, transitions state,
 *                                  verifies the returned JWS, and persists
 *                                  the signature evidence.
 *   cancelSignature(requestId)  — user-initiated cancel.
 *   verifySignature(requestId)  — re-verifies the persisted JWS against the
 *                                  stored document hash. Used by audit
 *                                  endpoints and the evidence package.
 *   buildEvidencePackage(reqId) — assembles an auditor-ready JSON envelope.
 *
 * Dependencies are injected so the service is easy to unit-test without a
 * live mongo + Nafath client.
 */

'use strict';

const crypto = require('crypto');
const DefaultModel = require('../models/NafathSignatureRequest.model');
const defaultClient = require('../integrations/nafath/signingClient');
const jwsVerifier = require('../integrations/nafath/jwsVerifier');

const FINGERPRINT_WINDOW_MS = 15 * 60 * 1000; // reuse same request within this window

function _fingerprint({ documentType, documentId, documentHash, signerNationalId, purpose }) {
  return crypto
    .createHash('sha256')
    .update([documentType, documentId, documentHash, signerNationalId, purpose || 'sign'].join('|'))
    .digest('hex');
}

function _hashIp(ip, salt = process.env.JWT_SECRET || 'pdpl-salt') {
  if (!ip) return null;
  return crypto.createHash('sha256').update(`${ip}:${salt}`).digest('hex').slice(0, 32);
}

function createService({
  model = DefaultModel,
  client = defaultClient,
  verifier = jwsVerifier,
  now = () => new Date(),
} = {}) {
  async function requestSignature({
    documentType,
    documentId,
    documentHash,
    purpose = 'sign',
    signerNationalId,
    signerRole = null,
    signerUserId = null,
    initiatedBy = null,
    ip = null,
    userAgent = null,
  }) {
    if (!documentType || !documentId) {
      throw Object.assign(new Error('documentType و documentId مطلوبان'), {
        code: 'INVALID_INPUT',
      });
    }
    if (!documentHash) {
      throw Object.assign(new Error('documentHash مطلوب'), { code: 'INVALID_INPUT' });
    }
    if (!client.validateNationalId(signerNationalId)) {
      throw Object.assign(new Error('رقم الهوية الوطنية غير صالح'), { code: 'INVALID_ID' });
    }

    // Reuse an in-flight request with the same fingerprint within a 15-min
    // window, so a user double-tapping "Sign" doesn't trigger two Nafath
    // pushes to their phone.
    const fp = _fingerprint({ documentType, documentId, documentHash, signerNationalId, purpose });
    const since = new Date(Date.now() - FINGERPRINT_WINDOW_MS);
    const existing = await model.findOne({
      requestFingerprint: fp,
      status: { $in: ['REQUESTED', 'PENDING'] },
      createdAt: { $gte: since },
    });
    if (existing) {
      return {
        reused: true,
        requestId: String(existing._id),
        transactionId: existing.transactionId,
        randomNumber: existing.randomNumber,
        expiresAt: existing.expiresAt,
        status: existing.status,
        mode: existing.mode,
      };
    }

    const adapterResponse = await client.requestSignature({
      documentHash,
      signerNationalId,
      purpose,
    });

    const doc = await model.create({
      documentType,
      documentId: String(documentId),
      documentHash,
      purpose,
      signerNationalId,
      signerRole,
      signerUserId,
      transactionId: adapterResponse.transactionId,
      randomNumber: adapterResponse.randomNumber,
      status: 'PENDING',
      mode: adapterResponse.mode,
      expiresAt: new Date(adapterResponse.expiresAt),
      initiatedBy,
      ipHash: _hashIp(ip),
      userAgent,
      requestFingerprint: fp,
    });

    return {
      reused: false,
      requestId: String(doc._id),
      transactionId: doc.transactionId,
      randomNumber: doc.randomNumber,
      expiresAt: doc.expiresAt,
      status: doc.status,
      mode: doc.mode,
    };
  }

  async function pollSignature(requestId) {
    const doc = await model.findById(requestId);
    if (!doc) {
      throw Object.assign(new Error('طلب التوقيع غير موجود'), { code: 'NOT_FOUND' });
    }
    if (doc.isResolved()) {
      return _shape(doc);
    }
    if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) {
      doc.status = 'EXPIRED';
      await doc.save();
      return _shape(doc);
    }

    const result = await client.pollStatus({
      transactionId: doc.transactionId,
      signerNationalId: doc.signerNationalId,
      createdAtMs: doc.createdAt.getTime(),
      documentHash: doc.documentHash,
    });

    if (result.status === 'PENDING') return _shape(doc);

    doc.status = result.status;
    if (result.status === 'APPROVED') {
      // Verify the JWS before we trust it
      let verified;
      try {
        verified = verifier.verify(result.signatureJws, {
          secret: doc.mode === 'mock' ? client.MOCK_SECRET : undefined,
          expectedDocumentHash: doc.documentHash,
          expectedSignerNationalId: doc.signerNationalId,
        });
      } catch (err) {
        doc.status = 'ERROR';
        doc.errorMessage = `JWS verification failed: ${err.code || err.message}`;
        await doc.save();
        throw Object.assign(new Error('فشل التحقق من توقيع نفاذ'), {
          code: 'NAFATH_JWS_INVALID',
          cause: err,
        });
      }
      doc.approvedAt = now();
      doc.signatureJws = result.signatureJws;
      doc.signatureAlgo = result.signatureAlgo || verified.header.alg;
      doc.signerAttributes = result.signerAttributes || {
        fullName: verified.payload.fullName,
        dateOfBirth: verified.payload.dateOfBirth ? new Date(verified.payload.dateOfBirth) : null,
        nationality: verified.payload.nationality,
      };
    } else if (result.status === 'REJECTED') {
      doc.rejectedAt = now();
      doc.errorMessage = result.message || null;
    } else if (result.status === 'ERROR') {
      doc.errorMessage = result.message || null;
    }

    await doc.save();
    return _shape(doc);
  }

  async function cancelSignature(requestId) {
    const doc = await model.findById(requestId);
    if (!doc) throw Object.assign(new Error('طلب التوقيع غير موجود'), { code: 'NOT_FOUND' });
    if (doc.status === 'PENDING' || doc.status === 'REQUESTED') {
      doc.status = 'CANCELLED';
      doc.cancelledAt = now();
      await doc.save();
    }
    return _shape(doc);
  }

  async function verifySignature(requestId) {
    const doc = await model.findById(requestId);
    if (!doc) throw Object.assign(new Error('طلب التوقيع غير موجود'), { code: 'NOT_FOUND' });
    if (doc.status !== 'APPROVED' || !doc.signatureJws) {
      return { verified: false, reason: 'NOT_APPROVED', status: doc.status };
    }
    try {
      const verified = verifier.verify(doc.signatureJws, {
        secret: doc.mode === 'mock' ? client.MOCK_SECRET : undefined,
        expectedDocumentHash: doc.documentHash,
        expectedSignerNationalId: doc.signerNationalId,
      });
      return { verified: true, payload: verified.payload, header: verified.header };
    } catch (err) {
      return { verified: false, reason: err.code || err.message };
    }
  }

  async function buildEvidencePackage(requestId) {
    const doc = await model.findById(requestId).lean();
    if (!doc) throw Object.assign(new Error('طلب التوقيع غير موجود'), { code: 'NOT_FOUND' });
    const verification = await verifySignature(requestId);
    return {
      kind: 'nafath-signature-evidence',
      version: 1,
      generatedAt: now().toISOString(),
      request: {
        id: String(doc._id),
        documentType: doc.documentType,
        documentId: doc.documentId,
        documentHash: doc.documentHash,
        documentHashAlgo: doc.documentHashAlgo,
        purpose: doc.purpose,
        mode: doc.mode,
      },
      signer: {
        nationalId: doc.signerNationalId,
        role: doc.signerRole,
        attributes: doc.signerAttributes,
      },
      transaction: {
        transactionId: doc.transactionId,
        randomNumber: doc.randomNumber,
        createdAt: doc.createdAt,
        approvedAt: doc.approvedAt,
        rejectedAt: doc.rejectedAt,
        cancelledAt: doc.cancelledAt,
        status: doc.status,
      },
      signature: {
        jws: doc.signatureJws,
        algo: doc.signatureAlgo,
      },
      verification,
      auditContext: {
        initiatedBy: doc.initiatedBy ? String(doc.initiatedBy) : null,
        ipHash: doc.ipHash,
        userAgent: doc.userAgent,
      },
    };
  }

  function _shape(doc) {
    return {
      requestId: String(doc._id),
      status: doc.status,
      documentType: doc.documentType,
      documentId: doc.documentId,
      documentHash: doc.documentHash,
      transactionId: doc.transactionId,
      randomNumber: doc.randomNumber,
      expiresAt: doc.expiresAt,
      approvedAt: doc.approvedAt,
      rejectedAt: doc.rejectedAt,
      cancelledAt: doc.cancelledAt,
      signerNationalId: doc.signerNationalId,
      signerAttributes: doc.status === 'APPROVED' ? doc.signerAttributes : undefined,
      errorMessage: doc.errorMessage,
      mode: doc.mode,
    };
  }

  return {
    requestSignature,
    pollSignature,
    cancelSignature,
    verifySignature,
    buildEvidencePackage,
  };
}

module.exports = { createService };
// Default singleton — routes use this unless tests override.
module.exports.defaultService = createService();
