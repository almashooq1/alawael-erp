/* eslint-disable no-unused-vars */
/**
 * File Upload Middleware
 * معالج تحميل الملفات مع التحقق من الأمان والنوع والحجم
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { safeError } = require('../utils/safeError');
// ── Magic-byte signatures for common file types ──────────────────────────────
const MAGIC_BYTES = {
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])], // GIF8
  'image/bmp': [Buffer.from([0x42, 0x4d])], // BM
  'image/webp': [Buffer.from('RIFF'), Buffer.from('WEBP')], // at offset 0 and 8
  'application/zip': [Buffer.from([0x50, 0x4b, 0x03, 0x04])], // also covers docx/xlsx/pptx/odt/ods
  'application/x-rar-compressed': [Buffer.from([0x52, 0x61, 0x72, 0x21])], // Rar!
  'application/gzip': [Buffer.from([0x1f, 0x8b])],
  'application/x-7z-compressed': [Buffer.from([0x37, 0x7a, 0xbc, 0xaf])],
  'video/mp4': [null], // ftyp box at offset 4 — checked separately
  'audio/mpeg': [Buffer.from([0xff, 0xfb]), Buffer.from([0x49, 0x44, 0x33])], // MP3 frame or ID3
};

// Extensions that are ZIP-based (magic bytes = PK\x03\x04)
const ZIP_BASED_EXTS = new Set(['.zip', '.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp']);

/**
 * Validate the first bytes of an uploaded file against known magic-byte signatures.
 * Returns true if the bytes match the expected type, or if no signature is on file
 * (text files, csv, json, xml, rtf are always allowed — they have no reliable magic bytes).
 */
function validateMagicBytes(filePath, mimeType, ext) {
  // Text-based formats have no reliable magic bytes — skip check
  const textExts = new Set([
    '.txt',
    '.csv',
    '.json',
    '.xml',
    '.rtf',
    '.doc',
    '.xls',
    '.ppt',
    '.ogg',
    '.ogv',
    '.wav',
    '.tar',
  ]);
  if (textExts.has(ext)) return true;

  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    // ZIP-based (Office Open XML, ODF, plain ZIP)
    if (
      ZIP_BASED_EXTS.has(ext) ||
      mimeType === 'application/zip' ||
      mimeType === 'application/x-zip-compressed'
    ) {
      return buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
    }

    // MP4 — "ftyp" at offset 4
    if (ext === '.mp4' || mimeType === 'video/mp4') {
      return buf.slice(4, 8).toString('ascii') === 'ftyp';
    }

    // WEBP — "RIFF" at 0 and "WEBP" at 8
    if (ext === '.webp' || mimeType === 'image/webp') {
      return (
        buf.slice(0, 4).toString('ascii') === 'RIFF' &&
        buf.slice(8, 12).toString('ascii') === 'WEBP'
      );
    }

    // General lookup
    const sigs = MAGIC_BYTES[mimeType];
    if (!sigs) return true; // unknown type — allow (MIME+ext already validated)
    return sigs.some(sig => sig && buf.slice(0, sig.length).equals(sig));
  } catch {
    return false; // if we can't read the file, reject
  }
}

// إنشاء مجلد التحميل
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// إعدادات التخزين
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  },
});

// التحقق من نوع الملف
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // PDF
    'application/pdf',
    // Microsoft Office (modern)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    // Microsoft Office (legacy)
    'application/msword', // DOC
    'application/vnd.ms-excel', // XLS
    'application/vnd.ms-powerpoint', // PPT
    // NOTE: Macro-enabled Office files (.docm, .xlsm, .pptm) intentionally excluded — security risk
    // OpenDocument
    'application/vnd.oasis.opendocument.text', // ODT
    'application/vnd.oasis.opendocument.spreadsheet', // ODS
    'application/vnd.oasis.opendocument.presentation', // ODP
    // Images
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/tiff',
    // NOTE: image/svg+xml intentionally excluded — stored XSS vector
    // Text & Data
    'text/plain', // TXT
    'text/csv', // CSV
    // NOTE: text/html intentionally excluded — stored XSS vector
    'text/xml', // XML
    'application/xml', // XML
    'application/json', // JSON
    'application/rtf', // RTF
    'text/rtf', // RTF
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
    // Audio
    'audio/mpeg', // MP3
    'audio/wav',
    'audio/ogg',
    // Video
    'video/mp4',
    'video/webm',
    'video/ogg',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const validExts = [
    // Documents
    '.pdf',
    '.doc',
    '.docx',
    // NOTE: .docm, .xlsm, .pptm intentionally excluded — macro execution risk
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.odt',
    '.ods',
    '.odp',
    '.txt',
    '.csv',
    '.rtf',
    // NOTE: .html, .htm, .svg intentionally excluded — stored XSS risk
    '.xml',
    '.json',
    // Images
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.tiff',
    '.tif',
    // NOTE: .svg excluded — stored XSS risk
    // Archives
    '.zip',
    '.rar',
    '.7z',
    '.gz',
    '.tar',
    // Audio
    '.mp3',
    '.wav',
    '.ogg',
    // Video
    '.mp4',
    '.webm',
    '.ogv',
  ];

  if (allowedMimes.includes(file.mimetype) && validExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(`نوع الملف غير مدعوم (${ext}). الأنواع المقبولة: مستندات، صور، أرشيف، صوت، فيديو`)
    );
  }
};

// إعدادات multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

// معالج الأخطاء
const handleUploadError = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'حجم الملف كبير جداً. الحد الأقصى 50 MB' });
    }
    return res.status(400).json({ message: `خطأ في تحميل الملف: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: safeError(err) || 'حدث خطأ أثناء تحميل الملف' });
  }
  next();
};

/**
 * Post-upload middleware: validates magic bytes of the uploaded file.
 * If the file's actual bytes don't match its declared MIME/extension, delete the file and reject.
 */
const validateUploadedFile = (req, res, next) => {
  if (!req.file) return next();

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!validateMagicBytes(req.file.path, req.file.mimetype, ext)) {
    // Delete the suspicious file
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      /* ignore */
    }
    return res.status(400).json({
      message: 'محتوى الملف لا يتطابق مع نوعه المعلن. تم رفض الملف لأسباب أمنية.',
    });
  }
  next();
};

module.exports = {
  upload: upload.single('file'),
  handleUploadError,
  validateUploadedFile,
  fileFilter,
};
