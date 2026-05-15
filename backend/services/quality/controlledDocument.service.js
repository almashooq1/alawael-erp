'use strict';

/**
 * controlledDocument.service.js — World-Class QMS Phase 29 Commit 7.
 *
 * Owns the lifecycle of controlled documents + their 21 CFR Part 11
 * compliant electronic signatures.
 *
 * Events:
 *   quality.doc.created
 *   quality.doc.version_drafted
 *   quality.doc.version_signed
 *   quality.doc.version_effective
 *   quality.doc.version_superseded
 *   quality.doc.acknowledged
 *   quality.doc.retired
 *   quality.doc.signature_revoked
 */

const ControlledDocument = require('../../models/quality/ControlledDocument.model');
const {
  ALLOWED_TRANSITIONS,
  SIGNATURE_MEANINGS,
  REQUIRED_SIGNATURES_FOR_EFFECTIVE,
} = require('../../config/controlled-document.registry');

class ControlledDocumentService {
  constructor({ model, dispatcher = null, logger = console, now = () => new Date() } = {}) {
    if (!model) throw new Error('ControlledDocumentService: model is required');
    this.model = model;
    this.dispatcher = dispatcher;
    this.logger = logger;
    this.now = now;
  }

  async _emit(name, payload) {
    if (!this.dispatcher || typeof this.dispatcher.emit !== 'function') return;
    try {
      await this.dispatcher.emit(name, payload);
    } catch (err) {
      this.logger.warn(`[ControlledDoc] dispatch ${name} failed: ${err.message}`);
    }
  }

  async _load(id) {
    const doc = await this.model.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      const err = new Error('Document not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }

  _audit(doc, action, actorUserId, detail, targetVersion) {
    doc.auditTrail.push({
      action,
      actorUserId,
      occurredAt: this.now(),
      detail: detail || null,
      targetVersion: targetVersion || null,
    });
  }

  // ── creation ─────────────────────────────────────────────────────

  async createDocument(data, userId) {
    if (!data || !data.title || !data.type) {
      throw new Error('title and type are required');
    }
    const doc = await this.model.create({
      title: data.title,
      type: data.type,
      description: data.description || null,
      department: data.department || null,
      tags: data.tags || [],
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      ownerUserId: data.ownerUserId || userId,
      requiredAcknowledgersByRole: data.requiredAcknowledgersByRole || [],
      versions: [],
      auditTrail: [],
      createdBy: userId,
    });
    this._audit(doc, 'document_created', userId);
    await doc.save();
    await this._emit('quality.doc.created', {
      docId: String(doc._id),
      documentNumber: doc.documentNumber,
      by: String(userId),
    });
    return doc;
  }

  // ── draft a new version ──────────────────────────────────────────

  async draftNewVersion(id, payload, userId) {
    const doc = await this._load(id);

    const nextVersionNumber = doc.versions.length
      ? Math.max(...doc.versions.map(v => v.versionNumber)) + 1
      : 1;

    const contentHash = ControlledDocument.computeContentHash({
      bodyHtml: payload.bodyHtml || '',
      bodyMarkdown: payload.bodyMarkdown || '',
      attachmentUrl: payload.attachmentUrl || '',
    });

    doc.versions.push({
      versionNumber: nextVersionNumber,
      bodyHtml: payload.bodyHtml || null,
      bodyMarkdown: payload.bodyMarkdown || null,
      attachmentUrl: payload.attachmentUrl || null,
      contentHash,
      status: 'draft',
      changeSummary: payload.changeSummary || null,
      signatures: [],
      readAcknowledgements: [],
    });

    this._audit(doc, 'version_drafted', userId, payload.changeSummary || null, nextVersionNumber);
    doc.updatedBy = userId;
    await doc.save();

    await this._emit('quality.doc.version_drafted', {
      docId: String(doc._id),
      versionNumber: nextVersionNumber,
      by: String(userId),
    });
    return doc;
  }

  // ── status transitions on a version ──────────────────────────────

  _assertTransition(from, to) {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      const err = new Error(`Illegal document version transition ${from} → ${to}`);
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }
  }

  async transitionVersion(id, versionNumber, to, userId) {
    const doc = await this._load(id);
    const version = doc.versions.find(v => v.versionNumber === versionNumber);
    if (!version) throw Object.assign(new Error('Version not found'), { code: 'NOT_FOUND' });
    this._assertTransition(version.status, to);

    // Gate effective on required signatures.
    if (to === 'effective') {
      const sigMeanings = new Set(
        version.signatures.filter(s => !s.revokedByEntryId).map(s => s.meaning)
      );
      const missing = REQUIRED_SIGNATURES_FOR_EFFECTIVE.filter(m => !sigMeanings.has(m));
      if (missing.length > 0) {
        const err = new Error(`Cannot activate without signatures: ${missing.join(', ')}`);
        err.code = 'INCOMPLETE';
        err.missing = missing;
        throw err;
      }
    }

    const previousStatus = version.status;
    version.status = to;

    if (to === 'effective') {
      version.effectiveDate = this.now();
      // Supersede any other effective versions.
      for (const v of doc.versions) {
        if (v.versionNumber !== versionNumber && v.status === 'effective') {
          v.status = 'superseded';
          v.supersededByVersionNumber = versionNumber;
          this._audit(doc, 'version_superseded', userId, null, v.versionNumber);
          await this._emit('quality.doc.version_superseded', {
            docId: String(doc._id),
            versionNumber: v.versionNumber,
            supersededBy: versionNumber,
          });
        }
      }
      doc.activeVersionNumber = versionNumber;
      this._audit(doc, 'version_effective', userId, null, versionNumber);
      await this._emit('quality.doc.version_effective', {
        docId: String(doc._id),
        documentNumber: doc.documentNumber,
        versionNumber,
        by: String(userId),
      });
    }
    if (to === 'retired') {
      this._audit(doc, 'version_retired', userId, null, versionNumber);
      await this._emit('quality.doc.retired', {
        docId: String(doc._id),
        versionNumber,
        by: String(userId),
      });
    }

    this._audit(doc, `version_${previousStatus}_to_${to}`, userId, null, versionNumber);
    doc.updatedBy = userId;
    await doc.save();
    return doc;
  }

  // ── 21 CFR Part 11 e-signature ───────────────────────────────────

  async signVersion(id, versionNumber, payload, signer) {
    if (!signer || !signer._id) {
      throw Object.assign(new Error('signer is required'), { code: 'VALIDATION' });
    }
    if (!payload || !payload.meaning) {
      throw Object.assign(new Error('meaning is required (Part 11 §11.50(a)(3))'), {
        code: 'VALIDATION',
      });
    }
    if (payload.reAuthConfirmed !== true) {
      throw Object.assign(
        new Error('re-authentication required for Part 11 e-signatures (§11.200)'),
        { code: 'FORBIDDEN' }
      );
    }
    const meaningSpec = SIGNATURE_MEANINGS.find(m => m.code === payload.meaning);
    if (!meaningSpec) {
      throw Object.assign(new Error(`unknown signature meaning: ${payload.meaning}`), {
        code: 'VALIDATION',
      });
    }
    if (meaningSpec.requiredRoles[0] !== '*' && !meaningSpec.requiredRoles.includes(signer.role)) {
      throw Object.assign(
        new Error(`role ${signer.role} cannot sign with meaning ${payload.meaning}`),
        { code: 'FORBIDDEN' }
      );
    }

    const doc = await this._load(id);
    const version = doc.versions.find(v => v.versionNumber === versionNumber);
    if (!version) throw Object.assign(new Error('Version not found'), { code: 'NOT_FOUND' });
    if (['superseded', 'retired', 'cancelled'].includes(version.status)) {
      throw Object.assign(new Error('cannot sign a terminal version'), { code: 'INVALID_PHASE' });
    }

    const printedName = payload.printedName || signer.name || signer.email || String(signer._id);
    const signedAt = this.now();

    const lastSignature = version.signatures[version.signatures.length - 1];
    const prevHash = lastSignature ? lastSignature.currentHash : version.contentHash;
    const currentHash = ControlledDocument.computeSignatureHash({
      prevHash,
      userId: signer._id,
      printedName,
      meaning: payload.meaning,
      signedAt,
      contentHash: version.contentHash,
    });

    version.signatures.push({
      userId: signer._id,
      printedName,
      role: signer.role || 'unknown',
      meaning: payload.meaning,
      signedAt,
      ipAddress: payload.ipAddress || null,
      userAgent: payload.userAgent || null,
      reAuthConfirmed: true,
      prevHash,
      currentHash,
      notes: payload.notes || null,
    });

    this._audit(doc, 'version_signed', signer._id, payload.meaning, versionNumber);
    doc.updatedBy = signer._id;
    await doc.save();

    // Auto-advance from draft → in_review on the first non-acknowledgement signature.
    if (version.status === 'draft' && !['acknowledged', 'witnessed'].includes(payload.meaning)) {
      version.status = 'in_review';
      await doc.save();
    }
    // Auto-advance from in_review → approved when all required meanings are present.
    if (version.status === 'in_review') {
      const sigMeanings = new Set(
        version.signatures.filter(s => !s.revokedByEntryId).map(s => s.meaning)
      );
      const allRequired = REQUIRED_SIGNATURES_FOR_EFFECTIVE.every(m => sigMeanings.has(m));
      if (allRequired) {
        version.status = 'approved';
        await doc.save();
      }
    }

    await this._emit('quality.doc.version_signed', {
      docId: String(doc._id),
      documentNumber: doc.documentNumber,
      versionNumber,
      meaning: payload.meaning,
      signerUserId: String(signer._id),
      currentHash,
    });
    return doc;
  }

  /**
   * Revoke an earlier signature. Per Part 11, the original record is
   * not deleted — instead we leave a forward-pointing revocation.
   */
  async revokeSignature(id, versionNumber, signatureId, reason, userId) {
    if (!reason) throw Object.assign(new Error('reason required'), { code: 'VALIDATION' });
    const doc = await this._load(id);
    const version = doc.versions.find(v => v.versionNumber === versionNumber);
    if (!version) throw Object.assign(new Error('Version not found'), { code: 'NOT_FOUND' });
    const sig = version.signatures.id(signatureId);
    if (!sig) throw Object.assign(new Error('Signature not found'), { code: 'NOT_FOUND' });
    if (sig.revokedByEntryId) {
      throw Object.assign(new Error('Already revoked'), { code: 'INVALID_PHASE' });
    }

    // Append a revocation entry (acts as the forward pointer).
    const printedName = `Revoked by user ${userId}`;
    const signedAt = this.now();
    const lastSignature = version.signatures[version.signatures.length - 1];
    const prevHash = lastSignature ? lastSignature.currentHash : version.contentHash;
    const currentHash = ControlledDocument.computeSignatureHash({
      prevHash,
      userId,
      printedName,
      meaning: 'witnessed',
      signedAt,
      contentHash: version.contentHash,
    });
    version.signatures.push({
      userId,
      printedName,
      role: 'admin',
      meaning: 'witnessed',
      signedAt,
      reAuthConfirmed: true,
      prevHash,
      currentHash,
      notes: `revocation of ${signatureId}: ${reason}`,
    });
    const newEntry = version.signatures[version.signatures.length - 1];
    sig.revokedByEntryId = newEntry._id;
    sig.revocationReason = reason;

    this._audit(doc, 'signature_revoked', userId, reason, versionNumber);
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.doc.signature_revoked', {
      docId: String(doc._id),
      versionNumber,
      signatureId: String(signatureId),
      reason,
    });
    return doc;
  }

  // ── read acknowledgement ─────────────────────────────────────────

  async acknowledgeRead(id, versionNumber, userId) {
    const doc = await this._load(id);
    const version = doc.versions.find(v => v.versionNumber === versionNumber);
    if (!version) throw Object.assign(new Error('Version not found'), { code: 'NOT_FOUND' });
    if (version.status !== 'effective') {
      throw Object.assign(new Error('only the effective version can be acknowledged'), {
        code: 'INVALID_PHASE',
      });
    }
    const already = version.readAcknowledgements.find(a => String(a.userId) === String(userId));
    if (already) return doc;
    version.readAcknowledgements.push({
      userId,
      acknowledgedAt: this.now(),
      versionNumber,
    });
    this._audit(doc, 'read_acknowledged', userId, null, versionNumber);
    doc.updatedBy = userId;
    await doc.save();
    await this._emit('quality.doc.acknowledged', {
      docId: String(doc._id),
      versionNumber,
      userId: String(userId),
    });
    return doc;
  }

  // ── integrity verification ───────────────────────────────────────

  /**
   * Walk the signature chain on every version and verify each hash.
   * Returns { ok: boolean, breaks: [...] }.
   */
  verifyIntegrity(doc) {
    const breaks = [];
    for (const v of doc.versions) {
      let prev = v.contentHash;
      for (const sig of v.signatures) {
        const expected = ControlledDocument.computeSignatureHash({
          prevHash: prev,
          userId: sig.userId,
          printedName: sig.printedName,
          meaning: sig.meaning,
          signedAt: sig.signedAt,
          contentHash: v.contentHash,
        });
        if (sig.prevHash !== prev) {
          breaks.push({
            versionNumber: v.versionNumber,
            signatureId: String(sig._id),
            reason: 'prevHash mismatch',
          });
        }
        if (sig.currentHash !== expected) {
          breaks.push({
            versionNumber: v.versionNumber,
            signatureId: String(sig._id),
            reason: 'currentHash tampered',
          });
        }
        prev = sig.currentHash;
      }
    }
    return { ok: breaks.length === 0, breaks };
  }

  // ── queries ──────────────────────────────────────────────────────

  async findById(id) {
    return this.model.findOne({ _id: id, deleted_at: null });
  }

  async list({ branchId, type, q, limit = 50, skip = 0 } = {}) {
    const filter = { deleted_at: null };
    if (branchId) filter.branchId = branchId;
    if (type) filter.type = type;
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { documentNumber: { $regex: q, $options: 'i' } },
      ];
    }
    return this.model
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 50, 200));
  }

  async getDashboard({ branchId } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    const all = await this.model.find(q).select('versions').lean();
    let totalDocs = 0;
    let effective = 0;
    let drafts = 0;
    let signaturesTotal = 0;
    for (const d of all) {
      totalDocs++;
      const hasEffective = (d.versions || []).some(v => v.status === 'effective');
      if (hasEffective) effective++;
      const hasDraft = (d.versions || []).some(v => v.status === 'draft');
      if (hasDraft) drafts++;
      for (const v of d.versions || []) signaturesTotal += (v.signatures || []).length;
    }
    return { totalDocs, effective, drafts, signaturesTotal };
  }
}

function createControlledDocumentService(deps) {
  return new ControlledDocumentService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    let dispatcher = null;
    try {
      const bus = require('./qualityEventBus.service');
      if (typeof bus.getDefault === 'function') dispatcher = bus.getDefault();
    } catch (_) {
      /* optional */
    }
    _defaultInstance = new ControlledDocumentService({ model: ControlledDocument, dispatcher });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  ControlledDocumentService,
  createControlledDocumentService,
  getDefault,
  _replaceDefault,
};
