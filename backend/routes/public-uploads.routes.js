/**
 * Public uploads — visitor attachments for public-form submissions.
 *
 *   POST /api/v1/public/uploads   multipart 'file' field
 *
 * Hardening:
 *   - 2 MB cap (visitors don't need bigger; reduces abuse surface).
 *   - Strict MIME whitelist (jpeg / png / pdf only — visitors don't need
 *     SVG / webp / gif which carry XSS / animation risks).
 *   - Per-IP rate limit: 5 uploads / 10 min.
 *   - File saved with content hash → automatic dedupe.
 *   - Always served from a `public/` bucket so admin uploads stay isolated.
 */

'use strict';

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

const ROOT = process.env.UPLOADS_ROOT || '/home/alawael/app/uploads';
const PUBLIC_PREFIX = process.env.UPLOADS_PUBLIC_PREFIX || '/uploads';
const BUCKET = 'public';
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

// Per-IP rate limit
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const buckets = new Map();
function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.windowStart > RATE_WINDOW_MS) {
    b = { count: 0, windowStart: now };
    buckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > RATE_MAX) {
    return res.status(429).json({ ok: false, error: 'RATE_LIMITED' });
  }
  next();
}
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS * 2;
  for (const [ip, b] of buckets.entries()) {
    if (b.windowStart < cutoff) buckets.delete(ip);
  }
}, RATE_WINDOW_MS).unref?.();

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function extFromMime(mime) {
  return { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf' }[mime] || '';
}

router.post('/', rateLimit, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'NO_FILE' });
    if (!ALLOWED_MIMES.has(req.file.mimetype)) {
      return res.status(415).json({ ok: false, error: 'UNSUPPORTED_MIME' });
    }
    const bucketDir = path.join(ROOT, BUCKET);
    ensureDir(bucketDir);
    const sha1 = crypto.createHash('sha1').update(req.file.buffer).digest('hex');
    const ext = extFromMime(req.file.mimetype);
    const filename = `${sha1}${ext}`;
    const filePath = path.join(bucketDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, req.file.buffer);
    }
    res.status(201).json({
      ok: true,
      url: `${PUBLIC_PREFIX}/${BUCKET}/${filename}`,
      filename,
      size: req.file.size,
      mime: req.file.mimetype,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
