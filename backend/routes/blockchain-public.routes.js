/**
 * Blockchain Public Verification — تحقق عام (بدون مصادقة)
 *
 * QR-friendly endpoints anyone can hit to verify a certificate without logging in.
 * Rate-limited (apiLimiter) to deter scraping/DoS, and the verification log records
 * IP + UserAgent for forensics.
 *
 * Mounts at: /api/v1/blockchain/public
 *   GET /verify/:hash               — JSON verdict (full integrity check)
 *   GET /verify/number/:certNumber  — Lookup by cert number → redirect to hash
 *
 * Sensitive fields (signer userIds, recipient nationalId/email, raw `data`) are
 * stripped — public verifiers see only what's needed to confirm authenticity.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { apiLimiter } = require('../middleware/rateLimiter');
const { BlockchainCertificate } = require('../models/blockchain.model');
const certService = require('../services/blockchainCertService');
const safeError = require('../utils/safeError');

router.use(apiLimiter);

function publicView(out) {
  if (!out || !out.certificate) return out;
  // Strip PII — public verifier only needs proof of authenticity, not contact info.
  const c = out.certificate;
  return {
    ...out,
    certificate: {
      certificateNumber: c.certificateNumber,
      title: c.title,
      recipient: c.recipient ? { name: c.recipient.name } : null,
      issueDate: c.issueDate,
      expiryDate: c.expiryDate,
      status: c.status,
      category: c.category,
      signatures: c.signatures,
      merkleRoot: c.merkleRoot,
      network: c.network,
      transactionHash: c.transactionHash,
      blockNumber: c.blockNumber,
      contractAddress: c.contractAddress,
    },
  };
}

router.get('/verify/:hash', async (req, res) => {
  try {
    const safeHash = /^[a-fA-F0-9]{64}$/.test(req.params.hash) ? req.params.hash : '';
    if (!safeHash) {
      return res.status(400).json({ success: false, verified: false, result: 'invalid_hash' });
    }
    const out = await certService.verifyByHash(safeHash, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: 'qr_scan',
    });
    if (out.result === 'not_found') {
      return res.status(404).json({ success: false, ...publicView(out) });
    }
    res.json({ success: true, ...publicView(out) });
  } catch (error) {
    safeError(res, error, 'blockchain.public-verify');
  }
});

router.get('/verify/number/:certNumber', async (req, res) => {
  try {
    const certNumber = String(req.params.certNumber || '').trim();
    if (!/^[A-Z0-9-]{4,40}$/i.test(certNumber)) {
      return res.status(400).json({ success: false, error: 'invalid_certificate_number' });
    }
    const cert = await BlockchainCertificate.findOne({ certificateNumber: certNumber })
      .select('hash')
      .lean();
    if (!cert) {
      return res.status(404).json({ success: false, verified: false, result: 'not_found' });
    }
    const safeHash = /^[a-fA-F0-9]{64}$/.test(cert.hash) ? cert.hash : '';
    if (!safeHash) {
      return res.status(400).json({ success: false, error: 'invalid_certificate_hash' });
    }
    res.redirect(`/api/v1/blockchain/public/verify/${safeHash}`);
  } catch (error) {
    safeError(res, error, 'blockchain.public-verify-number');
  }
});

module.exports = router;
