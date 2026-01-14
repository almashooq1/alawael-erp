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
    'application/pdf', // PDF
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'application/vnd.ms-word.document.macroEnabled.12', // DOCM
    'application/vnd.ms-excel.sheet.macroEnabled.12', // XLSM
    'image/jpeg', // JPEG
    'image/png', // PNG
    'image/jpg', // JPG
    'text/plain', // TXT
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    'application/zip', // ZIP
    'application/x-zip-compressed', // ZIP
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const validExts = ['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png', '.txt', '.pptx', '.zip', '.docm', '.xlsm'];

  if (allowedMimes.includes(file.mimetype) && validExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`نوع الملف غير مدعوم. الأنواع المقبولة: ${validExts.join(', ')}`));
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
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ message: 'حجم الملف كبير جداً. الحد الأقصى 50 MB' });
    }
    return res.status(400).json({ message: `خطأ في تحميل الملف: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

module.exports = {
  upload: upload.single('file'),
  handleUploadError,
};
