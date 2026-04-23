'use strict';

/**
 * evidenceVault.service.js — Phase 13 Commit 2 (4.0.56).
 *
 * The central compliance-evidence vault. Single chokepoint for
 * ingesting, verifying, superseding, signing, revoking, and
 * querying EvidenceItem records so the integrity + supersession +
 * retention invariants never drift.
 *
 * DI contract:
 *
 *   const svc = createEvidenceVaultService({
 *     model,            // EvidenceItem mongoose model (required)
 *     dispatcher,       // optional { emit(event, payload) }
 *     logger,           // optional
 *     hasher,           // optional async (buffer, algo) => hex
 *     now,              // optional () => Date — injectable clock
 *   });
 *
 * Events emitted:
 *
 *   compliance.evidence.ingested
 *   compliance.evidence.verified
 *   compliance.evidence.superseded
 *   compliance.evidence.revoked
 *   compliance.evidence.signed
 *   compliance.evidence.expiring     (dispatched by a future sweeper)
 */

const crypto = require('crypto');
const {
  DEFAULT_HASH_ALGORITHM,
  EXPIRY_WARNING_DAYS,
  resolveRetentionPolicy,
  computeDestroyAfter,
  effectiveStatus,
  isValidHash,
} = require('../../config/evidence.registry');

function defaultHasher(buffer, algorithm = DEFAULT_HASH_ALGORITHM) {
  return crypto.createHash(algorithm).update(buffer).digest('hex');
}

class EvidenceVaultService {
  constructor({
    model,
    dispatcher = null,
    logger = console,
    hasher = defaultHasher,
    now = () => new Date(),
  } = {}) {
    if (!model) throw new Error('EvidenceVaultService: model is required');
    this.model = model;
    this.dispatcher = dispatcher;
    this.logger = logger;
    this.hasher = hasher;
    this.now = now;
  }

  async _emit(eventName, payload) {
    if (!this.dispatcher || typeof this.dispatcher.emit !== 'function') return;
    try {
      await this.dispatcher.emit(eventName, payload);
    } catch (err) {
      this.logger.warn(`[EvidenceVault] dispatch ${eventName} failed: ${err.message}`);
    }
  }

  // ── ingest ──────────────────────────────────────────────────────

  /**
   * Register a new evidence item.
   *
   * Accepts either a raw buffer (for content the vault will hash) or
   * a pre-computed hash from an upstream uploader. If neither is
   * provided, the evidence is "inline metadata only" — legal for
   * attestations and metric snapshots that have no binary body.
   *
   * @param {object} input
   *   title, type, sourceModule, sourceRef?, controlIds?, regulationRefs?,
   *   file?: { storageClass, storageKey, filename, mimeType, sizeBytes, hash?, hashAlgorithm? },
   *   buffer?: Buffer,           // if present, hash is computed here
   *   validFrom?, validUntil?,
   *   retentionPolicy?,          // override of default
   *   branchId?, tenantId?, tags?, notes?, description?
   * @param {string|ObjectId} userId
   */
  async ingest(input, userId) {
    if (!input) throw new Error('input is required');
    if (!userId) throw new Error('userId is required');
    if (!input.title) throw new Error('title is required');
    if (!input.type) throw new Error('type is required');
    if (!input.sourceModule) throw new Error('sourceModule is required');

    const collectedAt = input.collectedAt ? new Date(input.collectedAt) : this.now();

    // Resolve file + hash
    const file = { ...(input.file || {}) };
    const algorithm = file.hashAlgorithm || DEFAULT_HASH_ALGORITHM;
    if (input.buffer) {
      file.hash = await this.hasher(input.buffer, algorithm);
      file.hashAlgorithm = algorithm;
      if (file.sizeBytes == null) file.sizeBytes = input.buffer.length;
    } else if (file.hash && !isValidHash(file.hash, algorithm)) {
      throw Object.assign(new Error('invalid hash format'), { code: 'BAD_HASH' });
    }
    if (!file.storageClass) file.storageClass = 'inline';

    // Resolve retention
    const policyKey = resolveRetentionPolicy(input.type, input.retentionPolicy);
    const destroyAfter = computeDestroyAfter(policyKey, collectedAt);

    const doc = await this.model.create({
      title: input.title,
      description: input.description || null,
      type: input.type,
      status: 'valid',
      controlIds: input.controlIds || [],
      regulationRefs: input.regulationRefs || [],
      sourceModule: input.sourceModule,
      sourceRef: input.sourceRef || { collection: null, docId: null },
      file,
      collectedAt,
      collectedBy: userId,
      validFrom: input.validFrom ? new Date(input.validFrom) : collectedAt,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      retention: {
        policy: policyKey,
        destroyAfter,
        legalHold: false,
      },
      branchId: input.branchId || null,
      tenantId: input.tenantId || null,
      tags: input.tags || [],
      notes: input.notes || null,
    });

    await this._emit('compliance.evidence.ingested', {
      evidenceId: String(doc._id),
      code: doc.code,
      type: doc.type,
      sourceModule: doc.sourceModule,
      controlCount: doc.controlIds.length,
      regulationCount: doc.regulationRefs.length,
      by: String(userId),
    });
    return doc;
  }

  // ── verification ────────────────────────────────────────────────

  /**
   * Re-hash a provided buffer and compare to the stored hash. Pure
   * integrity check — does not mutate the record. Returns:
   *
   *   { ok: boolean, effectiveStatus, storedHash, recomputedHash }
   */
  async verify(evidenceId, buffer) {
    const doc = await this._load(evidenceId);
    const algorithm = (doc.file && doc.file.hashAlgorithm) || DEFAULT_HASH_ALGORITHM;
    const result = {
      id: String(doc._id),
      code: doc.code,
      effectiveStatus: effectiveStatus(doc, this.now(), EXPIRY_WARNING_DAYS),
      storedHash: doc.file ? doc.file.hash : null,
      recomputedHash: null,
      ok: false,
    };

    if (!buffer) {
      // Can't verify without a body. Report metadata freshness only.
      result.ok = result.effectiveStatus === 'valid' || result.effectiveStatus === 'expiring';
    } else if (!doc.file || !doc.file.hash) {
      const err = new Error('evidence has no stored hash to verify against');
      err.code = 'NO_HASH';
      throw err;
    } else {
      result.recomputedHash = await this.hasher(buffer, algorithm);
      result.ok =
        result.recomputedHash === result.storedHash &&
        (result.effectiveStatus === 'valid' || result.effectiveStatus === 'expiring');
    }

    await this._emit('compliance.evidence.verified', {
      evidenceId: result.id,
      ok: result.ok,
      effectiveStatus: result.effectiveStatus,
    });
    return result;
  }

  // ── supersession ────────────────────────────────────────────────

  /**
   * Replace an existing item with a freshly ingested one. The old
   * item flips to `superseded` and points forward; the new one
   * points back. All in a best-effort two-write sequence — we do
   * NOT span a transaction because Mongo transactions require a
   * replica set and this project boots under plain standalone mongo
   * in dev. The invariant check (old still exists and is not
   * already terminal) runs before writes.
   */
  async supersede(oldEvidenceId, newInput, userId) {
    const old = await this._load(oldEvidenceId);
    if (old.isTerminal) {
      throw Object.assign(new Error('evidence already terminal'), {
        code: 'ILLEGAL_TRANSITION',
      });
    }

    const newDoc = await this.ingest(
      {
        ...newInput,
        // Carry forward unless caller overrode
        type: newInput.type || old.type,
        sourceModule: newInput.sourceModule || old.sourceModule,
        controlIds: newInput.controlIds || old.controlIds,
        regulationRefs: newInput.regulationRefs || old.regulationRefs,
        branchId: newInput.branchId || old.branchId,
        tenantId: newInput.tenantId || old.tenantId,
      },
      userId
    );

    newDoc.supersedes = old._id;
    await newDoc.save();

    old.status = 'superseded';
    old.supersededBy = newDoc._id;
    old.supersededAt = this.now();
    await old.save();

    await this._emit('compliance.evidence.superseded', {
      oldEvidenceId: String(old._id),
      newEvidenceId: String(newDoc._id),
      by: String(userId),
    });
    return { old, new: newDoc };
  }

  // ── revocation ──────────────────────────────────────────────────

  async revoke(evidenceId, reason, userId) {
    if (!reason || !String(reason).trim()) {
      throw new Error('revocation reason is required');
    }
    const doc = await this._load(evidenceId);
    if (doc.status === 'revoked') return doc; // idempotent
    if (doc.isTerminal) {
      throw Object.assign(new Error('evidence already terminal'), {
        code: 'ILLEGAL_TRANSITION',
      });
    }
    doc.status = 'revoked';
    doc.revokedAt = this.now();
    doc.revokedBy = userId;
    doc.revokedReason = String(reason).trim();
    await doc.save();

    await this._emit('compliance.evidence.revoked', {
      evidenceId: String(doc._id),
      reason: doc.revokedReason,
      by: String(userId),
    });
    return doc;
  }

  // ── signatures ──────────────────────────────────────────────────

  async sign(evidenceId, { role, signatureHash, intent, nameSnapshot, notes }, userId) {
    if (!role) throw new Error('role is required');
    const doc = await this._load(evidenceId);
    if (doc.isTerminal) {
      throw Object.assign(new Error('cannot sign terminal evidence'), {
        code: 'ILLEGAL_TRANSITION',
      });
    }
    doc.signatures.push({
      userId,
      nameSnapshot: nameSnapshot || null,
      role,
      signatureHash: signatureHash || null,
      intent: intent || 'approval',
      signedAt: this.now(),
    });
    if (notes) doc.notes = (doc.notes ? doc.notes + '\n' : '') + notes;
    await doc.save();

    await this._emit('compliance.evidence.signed', {
      evidenceId: String(doc._id),
      role,
      by: String(userId),
    });
    return doc;
  }

  // ── legal hold ──────────────────────────────────────────────────

  async setLegalHold(evidenceId, reason, userId) {
    const doc = await this._load(evidenceId);
    doc.retention.legalHold = true;
    doc.retention.legalHoldReason = reason || null;
    await doc.save();
    await this._emit('compliance.evidence.legal_hold_set', {
      evidenceId: String(doc._id),
      by: String(userId),
    });
    return doc;
  }

  async clearLegalHold(evidenceId, userId) {
    const doc = await this._load(evidenceId);
    doc.retention.legalHold = false;
    doc.retention.legalHoldReason = null;
    await doc.save();
    await this._emit('compliance.evidence.legal_hold_cleared', {
      evidenceId: String(doc._id),
      by: String(userId),
    });
    return doc;
  }

  // ── queries ─────────────────────────────────────────────────────

  async findById(evidenceId) {
    return this.model.findOne({ _id: evidenceId, deleted_at: null });
  }

  async findByControl(controlId) {
    return this.model.find({ controlIds: controlId, deleted_at: null }).sort({ collectedAt: -1 });
  }

  async findByRegulation(standard, clause) {
    const q = { deleted_at: null, 'regulationRefs.standard': standard };
    if (clause) q['regulationRefs.clause'] = clause;
    return this.model.find(q).sort({ collectedAt: -1 });
  }

  async findBySource(sourceModule, sourceRef = {}) {
    const q = { sourceModule, deleted_at: null };
    if (sourceRef.collection) q['sourceRef.collection'] = sourceRef.collection;
    if (sourceRef.docId) q['sourceRef.docId'] = sourceRef.docId;
    return this.model.find(q).sort({ collectedAt: -1 });
  }

  /**
   * Items with `validUntil` within `days` from now and not terminal.
   * Used by the (upcoming) sweeper to emit `compliance.evidence.expiring`
   * and by the Compliance Calendar aggregator (Commit 3).
   */
  async findExpiring(days = EXPIRY_WARNING_DAYS) {
    const horizon = new Date(this.now().getTime() + days * 86400000);
    return this.model
      .find({
        deleted_at: null,
        status: { $in: ['valid', 'expiring'] },
        validUntil: { $ne: null, $lte: horizon },
      })
      .sort({ validUntil: 1 });
  }

  async list({ branchId, type, status, sourceModule, standard, tag, limit = 50, skip = 0 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (type) q.type = type;
    if (status) q.status = status;
    if (sourceModule) q.sourceModule = sourceModule;
    if (standard) q['regulationRefs.standard'] = standard;
    if (tag) q.tags = tag;
    return this.model
      .find(q)
      .sort({ collectedAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 50, 200));
  }

  /**
   * Vault-health snapshot for executive dashboards.
   */
  async getStats({ branchId } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    const now = this.now();
    const horizon = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 86400000);

    const [total, valid, expired, expiring, superseded, revoked, legalHold] = await Promise.all([
      this.model.countDocuments(q),
      this.model.countDocuments({
        ...q,
        status: 'valid',
        $or: [{ validUntil: null }, { validUntil: { $gt: horizon } }],
      }),
      this.model.countDocuments({ ...q, validUntil: { $ne: null, $lt: now } }),
      this.model.countDocuments({
        ...q,
        status: { $in: ['valid', 'expiring'] },
        validUntil: { $ne: null, $gte: now, $lte: horizon },
      }),
      this.model.countDocuments({ ...q, status: 'superseded' }),
      this.model.countDocuments({ ...q, status: 'revoked' }),
      this.model.countDocuments({ ...q, 'retention.legalHold': true }),
    ]);

    return { total, valid, expiring, expired, superseded, revoked, legalHold };
  }

  /**
   * Computed effective status (without mutating) for a single item.
   */
  effectiveStatus(doc) {
    return effectiveStatus(doc, this.now(), EXPIRY_WARNING_DAYS);
  }

  // ── internals ───────────────────────────────────────────────────

  async _load(evidenceId) {
    const doc = await this.model.findOne({ _id: evidenceId, deleted_at: null });
    if (!doc) {
      const err = new Error('EvidenceItem not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }
}

// ── factory + lazy singleton ───────────────────────────────────────

function createEvidenceVaultService(deps) {
  return new EvidenceVaultService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/EvidenceItem.model');
    _defaultInstance = new EvidenceVaultService({ model });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  EvidenceVaultService,
  createEvidenceVaultService,
  getDefault,
  _replaceDefault,
  defaultHasher,
};
