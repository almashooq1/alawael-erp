/**
 * File Upload Validation Middleware
 *
 * Post-upload magic-bytes validation to verify actual file content
 * matches declared MIME type. Prevents MIME-spoofing attacks.
 *
 * Usage (after multer):
 *   const { validateUploadedFile } = require('../utils/uploadValidator');
 *   router.post('/upload', upload.single('file'), validateUploadedFile, handler);
 */

const fs = require('fs');
const logger = require('./logger');

/**
 * Magic bytes signatures for common file types.
 * Each entry: { mime: string[], magic: Buffer, offset?: number }
 */
const SIGNATURES = [
  // Images
  { magic: Buffer.from([0xff, 0xd8, 0xff]), mimes: ['image/jpeg'] },
  { magic: Buffer.from([0x89, 0x50, 0x4e, 0x47]), mimes: ['image/png'] },
  { magic: Buffer.from('GIF87a'), mimes: ['image/gif'] },
  { magic: Buffer.from('GIF89a'), mimes: ['image/gif'] },
  { magic: Buffer.from('RIFF'), mimes: ['image/webp', 'audio/wav'] },
  { magic: Buffer.from('BM'), mimes: ['image/bmp'] },
  // PDF
  { magic: Buffer.from('%PDF'), mimes: ['application/pdf'] },
  // Video
  { magic: Buffer.from([0x00, 0x00, 0x00]), mimes: ['video/mp4', 'video/quicktime'] }, // ftyp box
  { magic: Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), mimes: ['video/webm', 'video/x-matroska'] },
  // Audio
  { magic: Buffer.from('ID3'), mimes: ['audio/mpeg'] },
  { magic: Buffer.from([0xff, 0xfb]), mimes: ['audio/mpeg'] },
  { magic: Buffer.from('fLaC'), mimes: ['audio/flac'] },
  { magic: Buffer.from('OggS'), mimes: ['audio/ogg', 'video/ogg'] },
  // Archives
  {
    magic: Buffer.from('PK'),
    mimes: [
      'application/zip',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  { magic: Buffer.from('Rar!'), mimes: ['application/x-rar-compressed'] },
  { magic: Buffer.from([0x37, 0x7a, 0xbc, 0xaf]), mimes: ['application/x-7z-compressed'] },
];

/**
 * Read the first N bytes of a file to detect its type
 */
const readMagicBytes = (filePath, bytes = 16) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { start: 0, end: bytes - 1 });
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

/**
 * Check if file content matches a known signature
 */
const detectMimeFromMagic = buffer => {
  for (const sig of SIGNATURES) {
    const offset = sig.offset || 0;
    if (buffer.length >= offset + sig.magic.length) {
      const slice = buffer.slice(offset, offset + sig.magic.length);
      if (slice.equals(sig.magic)) {
        return sig.mimes;
      }
    }
  }
  return null;
};

/**
 * MIME types that are safe to skip magic-bytes check for
 * (text-based files don't have reliable magic bytes)
 */
const TEXT_MIMES = [
  'text/plain',
  'text/csv',
  'text/html',
  'application/json',
  'application/xml',
  'application/msword', // .doc — complex OLE format
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
];

/**
 * Dangerous MIME types that should always be blocked
 */
const BLOCKED_MIMES = [
  'image/svg+xml', // SVG can contain JavaScript — stored XSS risk
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
];

/**
 * Express middleware: validates uploaded file(s) after multer processes them.
 * Use AFTER multer middleware in the chain.
 */
const validateUploadedFile = async (req, res, next) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files && Array.isArray(req.files)) files.push(...req.files);

  for (const file of files) {
    // Block dangerous MIME types
    if (BLOCKED_MIMES.includes(file.mimetype)) {
      // Delete the uploaded file
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      return res.status(400).json({
        success: false,
        message: `نوع الملف ${file.mimetype} غير مسموح به لأسباب أمنية`,
      });
    }

    // Skip magic-bytes check for text-based files
    if (TEXT_MIMES.includes(file.mimetype)) continue;

    try {
      const buffer = await readMagicBytes(file.path);
      const detectedMimes = detectMimeFromMagic(buffer);

      // If we can detect the type, verify it's compatible
      if (
        detectedMimes &&
        !detectedMimes.some(m => {
          // Allow cross-matching for zip-based Office formats
          if (m === 'application/zip' && file.mimetype.includes('openxmlformats')) return true;
          return m === file.mimetype;
        })
      ) {
        logger.warn('MIME mismatch detected', {
          declared: file.mimetype,
          detected: detectedMimes,
          filename: file.originalname,
        });
        // Delete the suspicious file
        try {
          fs.unlinkSync(file.path);
        } catch {
          /* ignore */
        }
        return res.status(400).json({
          success: false,
          message: 'محتوى الملف لا يتطابق مع نوعه المُعلن',
        });
      }
    } catch (err) {
      logger.error('Upload validation error:', { error: err.message });
      // Don't block on validation errors — just log and continue
    }
  }

  next();
};

module.exports = {
  validateUploadedFile,
  BLOCKED_MIMES,
  detectMimeFromMagic,
  readMagicBytes,
};
