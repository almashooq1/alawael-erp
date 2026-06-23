'use strict';

/**
 * Unified Document Upload Service
 * ═════════════════════════════════
 * خدمة رفع المستندات الموحدة مع التحقق من الأمان وتخزين مركزي.
 */

const path = require('path');
const crypto = require('crypto');
const Document = require('../../models/Document');
const storageService = require('../storage/storage.service');
const { detectMimeFromMagic } = require('../../utils/uploadValidator');
const logger = require('../../utils/logger');

// Allowed MIME types (aligned with Document.fileType enum)
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-word.document.macroenabled.12',
  'application/vnd.oasis.opendocument.text',
  'application/rtf',
  'text/rtf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint.presentation.macroenabled.12',
  'application/vnd.oasis.opendocument.presentation',
  'text/plain',
  'text/csv',
  'application/json',
  'text/xml',
  'application/xml',
  'text/html',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/flac',
  'audio/aac',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/x-msvideo',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
]);

const BLOCKED_MIMES = [
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
];

// Text-based MIMEs that skip magic-bytes check
const TEXT_MIMES = [
  'text/plain',
  'text/csv',
  'application/json',
  'text/xml',
  'application/xml',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
];

const SIZE_LIMITS = {
  default: 50 * 1024 * 1024, // 50MB
  medical: 100 * 1024 * 1024, // 100MB
  clinical: 100 * 1024 * 1024,
  finance: 20 * 1024 * 1024,
  hr: 20 * 1024 * 1024,
};

function getSizeLimit(sourceModule) {
  return SIZE_LIMITS[sourceModule] || SIZE_LIMITS.default;
}

function extFor(mime, originalName) {
  const mimeMap = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.oasis.opendocument.text': '.odt',
    'text/rtf': '.rtf',
    'application/rtf': '.rtf',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.oasis.opendocument.spreadsheet': '.ods',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.oasis.opendocument.presentation': '.odp',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/json': '.json',
    'text/xml': '.xml',
    'application/xml': '.xml',
    'text/html': '.html',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'audio/flac': '.flac',
    'audio/aac': '.aac',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogv',
    'video/x-msvideo': '.avi',
    'application/zip': '.zip',
    'application/x-7z-compressed': '.7z',
    'application/gzip': '.gz',
    'application/x-tar': '.tar',
  };
  if (mimeMap[mime]) return mimeMap[mime];
  return path.extname(originalName || '').toLowerCase() || '.bin';
}

function mimeToFileType(mime, originalName) {
  const ext = path
    .extname(originalName || '')
    .toLowerCase()
    .slice(1);
  const validExts = new Set([
    'pdf',
    'doc',
    'docx',
    'docm',
    'xls',
    'xlsx',
    'xlsm',
    'ppt',
    'pptx',
    'pptm',
    'odt',
    'ods',
    'odp',
    'txt',
    'csv',
    'rtf',
    'html',
    'htm',
    'xml',
    'json',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'webp',
    'tiff',
    'tif',
    'svg',
    'zip',
    'rar',
    '7z',
    'gz',
    'tar',
    'mp3',
    'wav',
    'ogg',
    'mp4',
    'webm',
    'ogv',
  ]);
  if (validExts.has(ext)) return ext;
  if (mime.startsWith('image/')) return 'jpg';
  if (mime.startsWith('audio/')) return 'mp3';
  if (mime.startsWith('video/')) return 'mp4';
  if (mime === 'application/pdf') return 'pdf';
  return 'other';
}

function validateBuffer(buffer, mimeType, originalName, sourceModule) {
  // Size check
  const limit = getSizeLimit(sourceModule);
  if (buffer.length > limit) {
    throw new Error(`الملف أكبر من الحد المسموح (${(limit / 1024 / 1024).toFixed(0)}MB)`);
  }

  // MIME allowlist
  if (!ALLOWED_MIMES.has(mimeType)) {
    throw new Error(`نوع الملف غير مدعوم: ${mimeType}`);
  }

  // Block dangerous MIMEs
  if (BLOCKED_MIMES.includes(mimeType)) {
    throw new Error(`نوع الملف ${mimeType} غير مسموح به لأسباب أمنية`);
  }

  // Extension check
  const ext = extFor(mimeType, originalName);
  if (!ext || ext === '.bin') {
    throw new Error('امتداد الملف غير معروف أو غير مدعوم');
  }

  // Magic bytes check (skip for text-based files)
  if (!TEXT_MIMES.includes(mimeType)) {
    const detectedMimes = detectMimeFromMagic(buffer);
    if (detectedMimes) {
      const isCompatible = detectedMimes.some(m => {
        if (m === 'application/zip' && mimeType.includes('openxmlformats')) return true;
        return m === mimeType;
      });
      if (!isCompatible) {
        logger.warn('[Upload] MIME mismatch', {
          declared: mimeType,
          detected: detectedMimes,
          filename: originalName,
        });
        throw new Error('محتوى الملف لا يتطابق مع نوعه المُعلن');
      }
    }
  }

  return true;
}

async function scanForVirus(buffer) {
  // Stub: integrate ClamAV in production via CLAMAV_HOST
  if (!process.env.CLAMAV_HOST) {
    return { clean: true, skipped: true };
  }
  // TODO: implement ClamAV scanning
  return { clean: true, skipped: true };
}

async function createDocumentRecord(file, user, metadata = {}) {
  const buffer = file.buffer;
  const originalName = file.originalname || metadata.originalName || 'unnamed';
  const mimeType = file.mimetype || metadata.mimeType || 'application/octet-stream';
  const sourceModule = metadata.sourceModule || 'core';

  // Validate
  validateBuffer(buffer, mimeType, originalName, sourceModule);

  // Virus scan
  const scanResult = await scanForVirus(buffer);
  if (!scanResult.clean) {
    throw new Error('تم رفض الملف: يحتوي على برمجية خبيثة');
  }

  // Compute checksum and fingerprint
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
  const contentFingerprint = crypto
    .createHash('sha256')
    .update(buffer.slice(0, 8192))
    .digest('hex');

  // Store file
  const storageResult = await storageService.upload(buffer, originalName, mimeType, {
    purpose: sourceModule,
    folder: metadata.folder,
    storedName: metadata.storedName,
  });

  // Build Document record
  const title = metadata.title || originalName;
  const docData = {
    fileName: storageResult.storedName || path.basename(storageResult.storagePath),
    originalFileName: originalName,
    fileType: mimeToFileType(mimeType, originalName),
    mimeType,
    fileSize: storageResult.size,
    filePath: storageResult.storagePath,
    storageProvider: storageResult.storageProvider || 'local',
    title,
    description: metadata.description || '',
    category: metadata.category || 'أخرى',
    tags: metadata.tags || [],
    uploadedBy: user?.id || user?._id,
    uploadedByName: user?.name || '',
    uploadedByEmail: user?.email || '',
    sourceModule,
    entityType: metadata.entityType || null,
    entityId: metadata.entityId || null,
    isConfidential: metadata.isConfidential || false,
    folder: metadata.folder || 'root',
    parentFolderId: metadata.parentFolderId || null,
    checksum,
    contentFingerprint,
    status: 'نشط',
    isArchived: false,
    workflowStatus: 'draft',
  };

  const document = await Document.create(docData);

  logger.info(`[Upload] Document created: ${document._id} (${originalName})`);

  // Publish event
  try {
    const eventPublisher = require('./documentEventPublisher.service');
    await eventPublisher.publish('uploaded', {
      documentId: document._id,
      sourceModule,
      entityType: metadata.entityType,
      entityId: metadata.entityId,
      fileName: originalName,
      fileSize: storageResult.size,
      mimeType,
      uploadedBy: docData.uploadedBy,
    });
  } catch (err) {
    logger.warn(`[Upload] Event publish failed: ${err.message}`);
  }

  return document;
}

async function deleteDocumentFile(document) {
  try {
    await storageService.remove(document.filePath, document.storageProvider || 'local');
    return true;
  } catch (err) {
    logger.warn(`[Upload] Failed to delete storage file for ${document._id}: ${err.message}`);
    return false;
  }
}

module.exports = {
  createDocumentRecord,
  deleteDocumentFile,
  validateBuffer,
  getSizeLimit,
  ALLOWED_MIMES,
  BLOCKED_MIMES,
};
