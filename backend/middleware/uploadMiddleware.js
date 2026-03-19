/* eslint-disable no-unused-vars */
/**
 * File Upload Middleware
 * معالج تحميل الملفات مع التحقق من الأمان والنوع والحجم
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
    // Microsoft Office (macro-enabled)
    'application/vnd.ms-word.document.macroEnabled.12', // DOCM
    'application/vnd.ms-excel.sheet.macroEnabled.12', // XLSM
    'application/vnd.ms-powerpoint.presentation.macroEnabled.12', // PPTM
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
    'image/svg+xml',
    // Text & Data
    'text/plain', // TXT
    'text/csv', // CSV
    'text/html', // HTML
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
    '.docm',
    '.xls',
    '.xlsx',
    '.xlsm',
    '.ppt',
    '.pptx',
    '.pptm',
    '.odt',
    '.ods',
    '.odp',
    '.txt',
    '.csv',
    '.rtf',
    '.html',
    '.htm',
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
    '.svg',
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

  if (allowedMimes.includes(file.mimetype) || validExts.includes(ext)) {
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
    return res.status(400).json({ message: err.message || 'حدث خطأ أثناء تحميل الملف' });
  }
  next();
};

module.exports = {
  upload: upload.single('file'),
  handleUploadError,
  fileFilter,
};
