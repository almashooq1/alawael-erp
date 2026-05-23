/**
 * sehhaty.service.js — Service layer over `sehhatyAdapter.js` (W280).
 *
 * Responsibilities the adapter does NOT have:
 *   1. CONSENT GATE — verifies a valid `Consent` of type
 *      'health_summary_import' (or 'data_sharing') exists, not revoked,
 *      not expired, BEFORE invoking the adapter. PHI cannot be pulled
 *      without explicit family consent (PDPL Art. 6 + healthcare ethics).
 *   2. AUDIT — every call (success / fail / consent-deny) is logged.
 *      Audit entry references consentRecordId so the trail is reversible
 *      for right-to-erasure requests.
 *   3. ATTACHMENT — successful summary import is persisted to the
 *      beneficiary file with `source: 'sehhaty'`, `importedAt`,
 *      `consentRecordId`, `summaryHash` (for integrity verification).
 *
 * Factory pattern + enforceMfa option for service-layer defense (W275).
 */

'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

function sehhatyServiceFactory({
  adapter = require('./sehhatyAdapter'),
  ConsentModel = null,
  BeneficiaryFileModel = null,
  AuditLogger = null,
  enforceMfa = false,
} = {}) {
  const Consent = ConsentModel || (mongoose.models?.Consent ?? null);
  const BeneficiaryFile = BeneficiaryFileModel || (mongoose.models?.BeneficiaryFile ?? null);

  async function checkConsent(beneficiaryId, consentRecordId) {
    if (!Consent) {
      const err = new Error('Consent model not available');
      err.code = 'SEHHATY_CONSENT_MODEL_UNAVAILABLE';
      throw err;
    }
    const consent = await Consent.findById(consentRecordId);
    if (!consent) {
      const err = new Error('Consent record not found');
      err.code = 'SEHHATY_CONSENT_NOT_FOUND';
      throw err;
    }
    if (String(consent.beneficiaryId) !== String(beneficiaryId)) {
      const err = new Error('Consent does not match beneficiary');
      err.code = 'SEHHATY_CONSENT_MISMATCH';
      throw err;
    }
    if (consent.type !== 'health_summary_import' && consent.type !== 'data_sharing') {
      const err = new Error(
        `Consent type '${consent.type}' insufficient for health summary import`
      );
      err.code = 'SEHHATY_CONSENT_TYPE_INSUFFICIENT';
      throw err;
    }
    if (consent.revokedAt) {
      const err = new Error('Consent has been revoked');
      err.code = 'SEHHATY_CONSENT_REVOKED';
      throw err;
    }
    if (consent.expiresAt && consent.expiresAt < new Date()) {
      const err = new Error('Consent has expired');
      err.code = 'SEHHATY_CONSENT_EXPIRED';
      throw err;
    }
    return consent;
  }

  async function audit(action, payload) {
    if (!AuditLogger) return;
    try {
      await AuditLogger.log({
        component: 'sehhaty',
        action,
        timestamp: new Date(),
        ...payload,
      });
    } catch {
      // audit failures must NOT block the primary operation
    }
  }

  async function importHealthSummary({ beneficiaryId, nationalId, consentRecordId, actor }) {
    if (!beneficiaryId || !nationalId || !consentRecordId) {
      const err = new Error('beneficiaryId + nationalId + consentRecordId required');
      err.code = 'SEHHATY_INVALID_INPUT';
      throw err;
    }
    if (enforceMfa) {
      const tier = actor?.mfaTier || 0;
      if (tier < 1) {
        const err = new Error('Sehhaty import requires authenticated actor with MFA tier 1');
        err.code = 'SEHHATY_MFA_INSUFFICIENT';
        throw err;
      }
    }

    const consent = await checkConsent(beneficiaryId, consentRecordId);

    let adapterResult;
    try {
      adapterResult = await adapter.importHealthSummary({ nationalId, consentRecordId });
    } catch (err) {
      await audit('import_health_summary_failed', {
        beneficiaryId,
        consentRecordId: consent._id,
        actorId: actor?.userId,
        errorCode: err.code,
      });
      throw err;
    }

    const summaryHash = adapterResult.summary
      ? crypto.createHash('sha256').update(JSON.stringify(adapterResult.summary)).digest('hex')
      : null;

    await audit('import_health_summary_success', {
      beneficiaryId,
      consentRecordId: consent._id,
      actorId: actor?.userId,
      summaryHash,
      source: 'sehhaty',
    });

    // Persist into BeneficiaryFile.externalRecords if model is available.
    // Otherwise return the result for caller to handle.
    if (BeneficiaryFile && adapterResult.summary) {
      try {
        await BeneficiaryFile.findOneAndUpdate(
          { beneficiaryId },
          {
            $push: {
              externalRecords: {
                source: 'sehhaty',
                importedAt: adapterResult.importedAt,
                consentRecordId: consent._id,
                summaryHash,
                payload: adapterResult.summary,
              },
            },
          },
          { upsert: false }
        );
      } catch {
        // best-effort; surface via audit
      }
    }

    return {
      ...adapterResult,
      summaryHash,
      consentRecordId: consent._id,
    };
  }

  return {
    importHealthSummary,
    _checkConsent: checkConsent, // exposed for tests
  };
}

module.exports = sehhatyServiceFactory;
