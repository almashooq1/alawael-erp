'use strict';

/**
 * Document Upload Middleware
 * ═══════════════════════════
 * Wrapper حول Multer لرفع الملفات مع التحقق من الأمان.
 */

const multer = require('multer');
const { validateUploadedFile } = require('../utils/uploadValidator');
const documentUploadService = require('../services/documents/documentUpload.service');

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

function createUploadMiddleware(options = {}) {
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
  const fieldName = options.fieldName || 'file';
  const multiple = options.multiple || false;
  const maxCount = options.maxCount || 10;

  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: { fileSize: maxBytes },
  });

  return [
    multiple ? upload.array(fieldName, maxCount) : upload.single(fieldName),
    validateUploadedFile,
    (err, req, res, next) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: `الملف أكبر من الحد المسموح (${(maxBytes / 1024 / 1024).toFixed(0)}MB)`,
          });
        }
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    },
    (req, res, next) => {
      // Attach validation helper to req for route handlers
      req.validateDocumentBuffer = (buffer, fileName, mimeType, sourceModule) => {
        return documentUploadService.validateBuffer(buffer, mimeType, fileName, sourceModule);
      };
      next();
    },
  ];
}

module.exports = {
  createUploadMiddleware,
  single: (fieldName, maxBytes) => createUploadMiddleware({ fieldName, maxBytes }),
  array: (fieldName, maxCount, maxBytes) =>
    createUploadMiddleware({ fieldName, multiple: true, maxCount, maxBytes }),
};
