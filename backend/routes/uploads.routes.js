/**
 * Uploads — admin-only file upload to /home/alawael/app/uploads/<bucket>/.
 *
 * Phase 27 Commit 1. Stores uploaded files on local disk (the Docker volume
 * `alawael-uploads` is already mounted there). nginx serves them publicly
 * at https://alaweal.org/uploads/* (config update in this commit).
 *
 *   POST   /api/v1/uploads               admin — multipart 'file' field
 *                                        body field 'bucket' optional (default 'misc')
 *   GET    /api/v1/uploads               admin — list recent uploads
 *   DELETE /api/v1/uploads/:id           admin — remove one file
 *
 * Constraints:
 *   - 8 MB max per file
 *   - allowed mime: image/jpeg|png|gif|webp | application/pdf
 *     (image/svg+xml is intentionally NOT allowed — files are served publicly
 *      same-origin by nginx at /uploads/*, so an SVG carrying <script> would be
 *      a stored-XSS vector; W1370 closed this. Use PNG/WEBP for vector-like art.)
 *   - bucket must be a slug (no slashes)
 *   - filenames are content-hashed: <sha1>.<ext> so duplicates dedupe
 */

'use strict';

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const router = express.Router();

const ROOT = process.env.UPLOADS_ROOT || '/home/alawael/app/uploads';
const PUBLIC_PREFIX = process.env.UPLOADS_PUBLIC_PREFIX || '/uploads';
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // SVG (image/svg+xml) intentionally excluded — stored-XSS via same-origin
  // nginx static serving of /uploads/* (W1370). Do NOT re-add without a
  // serve-side Content-Disposition:attachment + sandbox-CSP mitigation.
  'application/pdf',
]);
const MAX_BYTES = 8 * 1024 * 1024;
const ADMIN_ROLES = ['admin', 'super_admin', 'site_admin', 'forms_admin'];

const memStorage = multer.memoryStorage();
const upload = multer({
  storage: memStorage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error(`MIME type not allowed: ${file.mimetype}`));
  },
});

function safeBucket(input) {
  const s = String(input || 'misc').toLowerCase();
  if (!/^[a-z0-9_-]{1,40}$/.test(s)) return 'misc';
  return s;
}

function extFor(mime, originalName) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };
  if (map[mime]) return map[mime];
  const fallback = path.extname(originalName || '').toLowerCase();
  return fallback || '.bin';
}

router.use(authenticate);
router.use(authorize(ADMIN_ROLES));

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'NO_FILE' });
    }
    const bucket = safeBucket(req.body?.bucket);
    const dir = path.join(ROOT, bucket);
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    const hash = crypto.createHash('sha1').update(req.file.buffer).digest('hex');
    const filename = `${hash}${extFor(req.file.mimetype, req.file.originalname)}`;
    const fullPath = path.join(dir, filename);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, req.file.buffer, { mode: 0o644 });
    }
    const url = `${PUBLIC_PREFIX}/${bucket}/${filename}`;
    res.status(201).json({
      ok: true,
      url,
      bucket,
      filename,
      size: req.file.size,
      mime: req.file.mimetype,
      originalName: req.file.originalname,
      hash,
    });
  } catch (err) {
    return safeError(res, err, 'uploads', { shape: 'ok' });
  }
});

router.get('/', (_req, res) => {
  try {
    const entries = [];
    if (!fs.existsSync(ROOT)) {
      return res.json({ ok: true, entries: [] });
    }
    for (const bucket of fs.readdirSync(ROOT)) {
      const dir = path.join(ROOT, bucket);
      const stat = fs.statSync(dir);
      if (!stat.isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        const s = fs.statSync(full);
        if (!s.isFile()) continue;
        entries.push({
          url: `${PUBLIC_PREFIX}/${bucket}/${f}`,
          bucket,
          filename: f,
          size: s.size,
          mtime: s.mtime,
        });
      }
    }
    entries.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    res.json({ ok: true, entries: entries.slice(0, 200) });
  } catch (err) {
    return safeError(res, err, 'uploads', { shape: 'ok' });
  }
});

router.delete('/:bucket/:filename', (req, res) => {
  try {
    const bucket = safeBucket(req.params.bucket);
    const filename = String(req.params.filename || '').replace(/[^a-zA-Z0-9._-]/g, '');
    if (!filename) return res.status(400).json({ ok: false, error: 'INVALID_FILENAME' });
    const fullPath = path.join(ROOT, bucket, filename);
    // W1389: path-boundary check — safeBucket + filename sanitisation already
    // prevent the most obvious traversal, but an unexpected ROOT configuration
    // (e.g. symlink, injected env) could still produce a path that escapes the
    // intended root.  Resolve + assert strictly inside ROOT before unlinking
    // (same `+ path.sep` pattern used by W453-W455/W1386-W1388 siblings).
    if (!path.resolve(fullPath).startsWith(path.resolve(ROOT) + path.sep)) {
      return res.status(400).json({ ok: false, error: 'INVALID_PATH' });
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    }
    fs.unlinkSync(fullPath);
    res.json({ ok: true, deleted: { bucket, filename } });
  } catch (err) {
    return safeError(res, err, 'uploads', { shape: 'ok' });
  }
});

module.exports = router;
