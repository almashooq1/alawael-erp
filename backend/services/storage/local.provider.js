'use strict';

/**
 * Local Storage Provider
 * ═══════════════════════
 * تخزين الملفات محليًا على القرص مع فحوصات أمنية للمسارات.
 * يخزن المسارات النسبية داخل UPLOAD_ROOT.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const logger = require('../../utils/logger');

const UPLOAD_ROOT = path.resolve(process.env.UPLOADS_ROOT || path.join(process.cwd(), 'uploads'));

// Ensure root exists
fs.mkdirSync(UPLOAD_ROOT, { recursive: true, mode: 0o755 });

function isAbsoluteLocalPath(storagePath) {
  return path.isAbsolute(storagePath) && storagePath.startsWith(UPLOAD_ROOT + path.sep);
}

function resolveWithinRoot(storagePath) {
  if (!storagePath) {
    throw new Error('Storage path is required');
  }
  // If an absolute path inside UPLOAD_ROOT is passed (legacy), use it directly
  if (isAbsoluteLocalPath(storagePath)) {
    return storagePath;
  }
  const resolved = path.resolve(UPLOAD_ROOT, storagePath);
  const rootPrefix = path.resolve(UPLOAD_ROOT) + path.sep;
  if (!resolved.startsWith(rootPrefix)) {
    throw new Error('Path traversal detected: path is outside upload root');
  }
  return resolved;
}

async function upload(buffer, fileName, mimeType, options = {}) {
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
  const ext = path.extname(fileName || '').toLowerCase() || '.bin';
  const now = new Date();
  const folder =
    options.folder || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const subFolder = options.subFolder || options.purpose || 'documents';
  const storedName = options.storedName || `${crypto.randomBytes(16).toString('hex')}${ext}`;

  // Store relative path for portability
  const relativePath = path.posix.join(subFolder, folder, storedName);
  const fullPath = resolveWithinRoot(relativePath);

  await fsp.mkdir(path.dirname(fullPath), { recursive: true, mode: 0o755 });
  await fsp.writeFile(fullPath, buffer, { mode: 0o644 });

  logger.info(`[Storage:local] Uploaded ${relativePath} (${buffer.length} bytes)`);

  return {
    storagePath: relativePath,
    storageProvider: 'local',
    size: buffer.length,
    checksum,
  };
}

async function download(storagePath) {
  const fullPath = resolveWithinRoot(storagePath);
  if (!(await exists(fullPath))) {
    throw new Error('File not found');
  }
  return fsp.readFile(fullPath);
}

async function remove(storagePath) {
  const fullPath = resolveWithinRoot(storagePath);
  if (!(await exists(fullPath))) {
    return false;
  }
  await fsp.unlink(fullPath);
  logger.info(`[Storage:local] Deleted ${storagePath}`);
  return true;
}

async function exists(storagePath) {
  try {
    const fullPath = resolveWithinRoot(storagePath);
    await fsp.access(fullPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function getUrl(storagePath) {
  // Local files are served by the documents API, not via direct public URL
  return null;
}

module.exports = {
  upload,
  download,
  delete: remove,
  exists,
  getUrl,
  UPLOAD_ROOT,
};
