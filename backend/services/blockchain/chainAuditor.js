/**
 * Chain Auditor — مراجع سلامة سلسلة الشهادات
 *
 * Walks every BlockchainCertificate (or a subset) and reports for each:
 *   • hashMatch     — does the recomputed cert hash equal the stored hash?
 *   • merkleMatch   — does the stored proof verify against the stored root?
 *   • anchorMatch   — does the AnchorLedger contain the cert's tx hash with
 *                     the same merkle root?
 *
 * Exposed as a pure function so the CLI (`scripts/blockchain-verify-chain.js`)
 * and any future admin endpoint share the same logic. Counts go through the
 * same Prom counter family — a CI run of the auditor doubles as a chain-wide
 * tamper sweep visible to the dashboard.
 *
 * Returns a structured report:
 *   {
 *     scanned, ok, tampered, items: [{ certificateNumber, _id, ...checks, reasons }]
 *   }
 */

'use strict';

const { BlockchainCertificate } = require('../../models/blockchain.model');
const { AnchorLedger } = require('./adapters/internalAdapter');
const certService = require('../blockchainCertService');
const merkle = require('./merkleTree');
const metrics = require('./metrics');

function parseProof(stored) {
  if (!Array.isArray(stored)) return [];
  return stored.map(s => {
    const [position, sibling] = String(s).split(':');
    return { position, sibling };
  });
}

/**
 * Audit the cert. Returns a verdict object — never throws on per-cert errors
 * so a single bad doc can't abort the whole sweep.
 */
async function auditCertificate(cert) {
  const reasons = [];
  let hashMatch = false;
  let merkleMatch = null;
  let anchorMatch = null;

  try {
    const recomputed = certService.computeCertHash({
      recipient: cert.recipient,
      title: cert.title,
      data: cert.data,
      issueDate: cert.issueDate,
      previousHash: cert.previousHash,
    });
    hashMatch = recomputed === cert.hash;
    if (!hashMatch) reasons.push('hash_mismatch');
  } catch (err) {
    reasons.push(`hash_error:${err.message}`);
  }

  if (cert.merkleRoot) {
    if (Array.isArray(cert.merkleProof) && cert.merkleProof.length > 0) {
      merkleMatch = merkle.verifyProof(cert.hash, parseProof(cert.merkleProof), cert.merkleRoot);
    } else {
      // Single-leaf batch: the cert hash IS the root.
      merkleMatch = cert.hash === cert.merkleRoot;
    }
    if (merkleMatch === false) reasons.push('merkle_mismatch');
  }

  if (cert.blockchain?.transactionHash) {
    try {
      const anchor = await AnchorLedger.findOne({
        transactionHash: cert.blockchain.transactionHash,
      }).lean();
      anchorMatch = !!anchor && anchor.merkleRoot === cert.merkleRoot;
      if (!anchorMatch) reasons.push(anchor ? 'anchor_root_mismatch' : 'anchor_missing');
    } catch (err) {
      reasons.push(`anchor_error:${err.message}`);
    }
  }

  const ok = hashMatch && merkleMatch !== false && anchorMatch !== false;
  return {
    _id: String(cert._id),
    certificateNumber: cert.certificateNumber,
    status: cert.status,
    hashMatch,
    merkleMatch,
    anchorMatch,
    ok,
    reasons,
  };
}

/**
 * Audit a slice of certs.
 *
 * @param {Object} [opts]
 * @param {Object} [opts.filter]      mongo filter, default `{ isDeleted: { $ne: true } }`
 * @param {number} [opts.limit]       cap the scan
 * @param {boolean} [opts.skipDraft]  exclude draft certs (which legitimately have no anchor)
 * @param {Function} [opts.onProgress] called with each verdict so a CLI can stream output
 */
async function auditAll(opts = {}) {
  const { filter = {}, limit, skipDraft = true, onProgress } = opts;
  const finalFilter = { isDeleted: { $ne: true }, ...filter };
  if (skipDraft) finalFilter.status = finalFilter.status || { $ne: 'draft' };

  const cursor = BlockchainCertificate.find(finalFilter).lean().cursor();
  const items = [];
  let scanned = 0;
  let ok = 0;
  let tampered = 0;

  for (let cert = await cursor.next(); cert; cert = await cursor.next()) {
    if (limit && scanned >= limit) break;
    scanned += 1;
    const verdict = await auditCertificate(cert);
    items.push(verdict);
    if (verdict.ok) ok += 1;
    else tampered += 1;

    if (verdict.ok) metrics.bumpVerification('valid', verdict.hashMatch);
    else metrics.bumpVerification('invalid', verdict.hashMatch);

    if (typeof onProgress === 'function') {
      try {
        onProgress(verdict);
      } catch {
        /* progress reporter must never abort the sweep */
      }
    }
  }

  return { scanned, ok, tampered, items };
}

module.exports = { auditCertificate, auditAll, parseProof };
