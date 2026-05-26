/**
 * Blockchain Certificate Service — خدمة شهادات البلوكتشين
 *
 * The single place that knows how a certificate is hashed, anchored, and verified.
 * Routes are thin wrappers over this — keeps logic testable without HTTP, and
 * lets schedulers/auto-issue hooks reuse the same primitives.
 *
 * Lifecycle:
 *   draft  ──issue()──▶  issued  ──[batch anchor]──▶  has merkleRoot/proof + tx
 *                            │
 *                            ├──sign()──▶ signed (multi-signature)
 *                            └──revoke()─▶ revoked
 *
 * Why a service: previously routes computed hashes inline, which made the chain
 * format implicit and untestable. Centralizing here also lets us add idempotency
 * (same idempotencyKey ⇒ same cert returned, never a duplicate).
 */

'use strict';

const crypto = require('crypto');
const { BlockchainCertificate, VerificationLog } = require('../models/blockchain.model');
const { getAdapter } = require('./blockchain/adapters');
const merkle = require('./blockchain/merkleTree');
const metrics = require('./blockchain/metrics');
const logger = require('../utils/logger');

// qualityEventBus is loaded lazily — the quality module isn't required to
// boot the platform, and tests that mock the bus shouldn't pay the import.
let _qualityBus = null;
function qualityBus() {
  if (_qualityBus !== null) return _qualityBus;
  try {
    _qualityBus = require('./quality/qualityEventBus.service').getDefault();
  } catch {
    _qualityBus = false; // not available in this environment
  }
  return _qualityBus;
}
function emitQuality(name, payload) {
  const bus = qualityBus();
  if (!bus || typeof bus.emit !== 'function') return;
  try {
    // Fire-and-forget — listeners run via Promise.allSettled in the bus.
    Promise.resolve(bus.emit(name, payload)).catch(() => {});
  } catch {
    /* never let emission break the cert lifecycle */
  }
}

const CERT_ALLOWED_FIELDS = [
  'recipient',
  'title',
  'data',
  'issueDate',
  'expiryDate',
  'category',
  'template',
];

function pickAllowed(body) {
  const out = {};
  for (const k of CERT_ALLOWED_FIELDS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Canonical, deterministic JSON serialization for hashing.
 * Keys are sorted recursively so the same logical payload always hashes
 * identically — critical for verification across machines.
 */
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

function computeCertHash({ recipient, title, data, issueDate, previousHash }) {
  return sha256(
    canonicalize({
      recipient,
      title,
      data: data ?? null,
      issueDate: issueDate ? new Date(issueDate).toISOString() : null,
      previousHash: previousHash || '0'.repeat(64),
    })
  );
}

async function getLastCertHash() {
  const last = await BlockchainCertificate.findOne({ status: { $ne: 'draft' } })
    .sort({ createdAt: -1 })
    .select('hash')
    .lean();
  return last ? last.hash : '0'.repeat(64);
}

function publicVerifyUrl(hash) {
  const base = (process.env.BLOCKCHAIN_VERIFY_PUBLIC_BASE || '').replace(/\/$/, '');
  return base ? `${base}/${hash}` : `/api/v1/blockchain/public/verify/${hash}`;
}

// ── Create (draft) ──────────────────────────────────────────────────────────
async function createCertificate(body, { userId, idempotencyKey } = {}) {
  if (idempotencyKey) {
    const existing = await BlockchainCertificate.findOne({ idempotencyKey }).lean();
    if (existing) {
      metrics.bumpCertificate('deduped');
      return { certificate: existing, deduped: true };
    }
  }

  const previousHash = await getLastCertHash();
  const picked = pickAllowed(body);
  const issueDate = picked.issueDate || new Date();
  const hash = computeCertHash({ ...picked, issueDate, previousHash });

  const doc = await BlockchainCertificate.create({
    ...picked,
    issueDate,
    previousHash,
    hash,
    verificationUrl: publicVerifyUrl(hash),
    idempotencyKey: idempotencyKey || undefined,
    createdBy: userId,
  });

  metrics.bumpCertificate('created');
  return { certificate: doc.toObject(), deduped: false };
}

// ── Issue (single cert, anchors immediately as batch-of-1) ─────────────────
async function issueCertificate(certId, { userId } = {}) {
  // W433: CAS-reserve before anchor. Pre-W433 did findById → check
  // status==='draft' → call adapter.anchor() (SLOW blockchain RPC) →
  // set status='issued' → save. Two concurrent issueCertificate(certId)
  // calls would both pass the status==='draft' check and BOTH call
  // adapter.anchor() — submitting TWO blockchain transactions for the
  // same certificate with different transactionHash values. Wasted
  // gas, divergent on-chain history, and the second save() silently
  // overwrites the first's transactionHash with no audit trail of the
  // dual submission.
  //
  // W433 fix: atomic CAS draft → issuing as a reservation. Only ONE
  // caller's update matches; the second caller errors out (400/404)
  // BEFORE the expensive adapter.anchor() call. After successful
  // anchor, the second save flips issuing → issued with the anchor
  // data. On anchor failure, we revert issuing → draft so a future
  // retry can succeed.
  const cert = await BlockchainCertificate.findOneAndUpdate(
    { _id: certId, status: 'draft' },
    { $set: { status: 'issuing' } },
    { new: true }
  );
  if (!cert) {
    const existing = await BlockchainCertificate.findById(certId).select('status').lean();
    if (!existing) throw Object.assign(new Error('الشهادة غير موجودة'), { status: 404 });
    throw Object.assign(new Error('لا يمكن إصدار شهادة ليست في حالة مسودة'), { status: 400 });
  }

  const { root, proofs } = merkle.buildTreeWithProofs([cert.hash]);
  const adapter = getAdapter();
  let anchor;
  try {
    anchor = await adapter.anchor({ merkleRoot: root, batchSize: 1 });
    metrics.bumpAnchor(adapter.name, 'success');
  } catch (err) {
    // W433: revert the reservation so the cert can be retried.
    await BlockchainCertificate.findByIdAndUpdate(certId, { $set: { status: 'draft' } });
    metrics.bumpAnchor(adapter.name, 'fail');
    throw err;
  }

  cert.status = 'issued';
  cert.issueDate = cert.issueDate || new Date();
  cert.issuer = cert.issuer || {};
  cert.issuer.issuedBy = userId;
  cert.merkleRoot = root;
  cert.merkleProof = proofs[0].map(p => `${p.position}:${p.sibling}`);
  cert.batchId = anchor.transactionHash;
  cert.blockchain = {
    network: anchor.network,
    transactionHash: anchor.transactionHash,
    blockNumber: anchor.blockNumber,
    contractAddress: anchor.contractAddress || undefined,
    timestamp: anchor.timestamp,
    gasUsed: anchor.gasUsed || 0,
  };

  await cert.save();
  metrics.bumpCertificate('issued');
  emitQuality('blockchain.certificate.issued', {
    certificateId: String(cert._id),
    certificateNumber: cert.certificateNumber,
    category: cert.category,
    recipient: cert.recipient,
    network: cert.blockchain?.network,
    transactionHash: cert.blockchain?.transactionHash,
    issuedAt: cert.issueDate,
  });
  return cert.toObject();
}

// ── Batch issue (atomic, single anchor for many certs) ─────────────────────
async function batchIssue(certIds, { userId } = {}) {
  if (!Array.isArray(certIds) || certIds.length === 0) {
    throw Object.assign(new Error('قائمة الشهادات فارغة'), { status: 400 });
  }
  const certs = await BlockchainCertificate.find({
    _id: { $in: certIds },
    status: 'draft',
  });
  if (certs.length === 0) {
    throw Object.assign(new Error('لا توجد شهادات في حالة مسودة'), { status: 400 });
  }

  const leaves = certs.map(c => c.hash);
  const { root, proofs } = merkle.buildTreeWithProofs(leaves);
  const adapter = getAdapter();
  let anchor;
  try {
    anchor = await adapter.anchor({ merkleRoot: root, batchSize: leaves.length });
    metrics.bumpAnchor(adapter.name, 'success');
  } catch (err) {
    metrics.bumpAnchor(adapter.name, 'fail');
    throw err;
  }

  const now = new Date();
  await Promise.all(
    certs.map((c, idx) => {
      c.status = 'issued';
      c.issueDate = c.issueDate || now;
      c.issuer = c.issuer || {};
      c.issuer.issuedBy = userId;
      c.merkleRoot = root;
      c.merkleProof = proofs[idx].map(p => `${p.position}:${p.sibling}`);
      c.batchId = anchor.transactionHash;
      c.blockchain = {
        network: anchor.network,
        transactionHash: anchor.transactionHash,
        blockNumber: anchor.blockNumber,
        contractAddress: anchor.contractAddress || undefined,
        timestamp: anchor.timestamp,
        gasUsed: Math.round((anchor.gasUsed || 0) / leaves.length),
      };
      return c.save();
    })
  );

  emitQuality('blockchain.certificate.batch_issued', {
    network: anchor.network,
    transactionHash: anchor.transactionHash,
    merkleRoot: root,
    count: certs.length,
    certificateIds: certs.map(c => String(c._id)),
  });

  return {
    anchor,
    merkleRoot: root,
    issued: certs.length,
    certificateIds: certs.map(c => c._id),
  };
}

async function signCertificate(certId, { userId, signerName, signerTitle }) {
  const cert = await BlockchainCertificate.findById(certId);
  if (!cert) throw Object.assign(new Error('الشهادة غير موجودة'), { status: 404 });

  const signature = sha256(
    canonicalize({ certHash: cert.hash, signer: userId || signerName, ts: Date.now() })
  );
  cert.signatures.push({ signer: userId, signerName, signerTitle, signature });
  await cert.save();
  metrics.bumpCertificate('signed');
  return cert.toObject();
}

async function revokeCertificate(certId, { userId, reason }) {
  const cert = await BlockchainCertificate.findById(certId);
  if (!cert) throw Object.assign(new Error('الشهادة غير موجودة'), { status: 404 });
  if (cert.status === 'revoked') {
    throw Object.assign(new Error('الشهادة مُلغاة بالفعل'), { status: 400 });
  }
  cert.status = 'revoked';
  cert.revocation = { revokedAt: new Date(), revokedBy: userId, reason: reason || 'غير محدد' };
  await cert.save();
  metrics.bumpCertificate('revoked');
  emitQuality('blockchain.certificate.revoked', {
    certificateId: String(cert._id),
    certificateNumber: cert.certificateNumber,
    category: cert.category,
    reason: cert.revocation.reason,
    revokedAt: cert.revocation.revokedAt,
    revokedBy: userId ? String(userId) : null,
  });
  return cert.toObject();
}

/**
 * Full integrity check — used by the public verify endpoint.
 * Returns a structured verdict, never throws on "not found".
 *
 *   verified ⇔  status is valid/issued AND
 *               recomputed cert hash matches AND
 *               (no merkle proof) OR (merkle proof verifies against stored root) AND
 *               (no anchor) OR (anchor exists in adapter ledger with same merkleRoot)
 */
async function verifyByHash(hash, { ip, userAgent, userId, method = 'manual_lookup' } = {}) {
  const cert = await BlockchainCertificate.findOne({ hash })
    .populate('template', 'name category')
    .lean();

  let result = 'not_found';
  let hashMatch = false;
  let merkleMatch = null;
  let blockchainMatch = null;
  let anchor = null;

  if (cert) {
    if (cert.status === 'revoked') result = 'revoked';
    else if (cert.expiryDate && new Date(cert.expiryDate) < new Date()) result = 'expired';
    else if (cert.status === 'draft') result = 'invalid';
    else result = 'valid';

    const recomputed = computeCertHash({
      recipient: cert.recipient,
      title: cert.title,
      data: cert.data,
      issueDate: cert.issueDate,
      previousHash: cert.previousHash,
    });
    hashMatch = recomputed === cert.hash;

    if (cert.merkleRoot && Array.isArray(cert.merkleProof) && cert.merkleProof.length > 0) {
      const proof = cert.merkleProof.map(s => {
        const [position, sibling] = s.split(':');
        return { position, sibling };
      });
      merkleMatch = merkle.verifyProof(cert.hash, proof, cert.merkleRoot);
    } else if (cert.merkleRoot) {
      // Single-leaf batch: the cert hash IS the root.
      merkleMatch = cert.hash === cert.merkleRoot;
    }

    if (cert.blockchain?.transactionHash) {
      try {
        const adapter = getAdapter();
        anchor = await adapter.getAnchor(cert.blockchain.transactionHash);
        blockchainMatch = !!anchor && anchor.merkleRoot === cert.merkleRoot;
      } catch (err) {
        logger?.warn?.('[blockchain] anchor lookup failed', { err: err.message });
      }
    }
  }

  const verified =
    !!cert &&
    result === 'valid' &&
    hashMatch === true &&
    merkleMatch !== false &&
    blockchainMatch !== false;

  metrics.bumpVerification(result, hashMatch);

  // Audit (best-effort; never block verification on log write)
  try {
    await VerificationLog.create({
      certificate: cert?._id,
      certificateNumber: cert?.certificateNumber,
      verifiedBy: { ip, userAgent, userId },
      method,
      result,
      hashMatch,
      blockchainMatch: blockchainMatch === null ? undefined : blockchainMatch,
    });
  } catch (err) {
    logger?.warn?.('[blockchain] verification log failed', { err: err.message });
  }

  return {
    verified,
    result,
    hashMatch,
    merkleMatch,
    blockchainMatch,
    anchor,
    certificate: cert
      ? {
          certificateNumber: cert.certificateNumber,
          title: cert.title,
          recipient: cert.recipient?.name,
          issueDate: cert.issueDate,
          expiryDate: cert.expiryDate,
          status: cert.status,
          category: cert.category,
          signatures: cert.signatures?.length || 0,
          merkleRoot: cert.merkleRoot,
          batchId: cert.batchId,
          network: cert.blockchain?.network,
          transactionHash: cert.blockchain?.transactionHash,
          blockNumber: cert.blockchain?.blockNumber,
          contractAddress: cert.blockchain?.contractAddress,
        }
      : null,
  };
}

module.exports = {
  // primitives (exported for tests + workers)
  computeCertHash,
  canonicalize,
  publicVerifyUrl,
  // lifecycle
  createCertificate,
  issueCertificate,
  batchIssue,
  signCertificate,
  revokeCertificate,
  verifyByHash,
};
