const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');

// Ensure uploads directory exists (use temp directory in tests)
const uploadsDir =
  process.env.NODE_ENV === 'test'
    ? path.join(os.tmpdir(), 'uploads_test')
    : path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Disk storage: save with timestamp prefix to avoid collisions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});

// Accept images and PDFs only by default
const fileFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  // Some test clients send application/octet-stream; allow based on filename extension
  const isOctet = file.mimetype === 'application/octet-stream';
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExt = ['.png', '.jpg', '.jpeg', '.pdf'];

  if (allowed.includes(file.mimetype) || (isOctet && allowedExt.includes(ext))) {
    cb(null, true);
  } else {
    cb(new Error('ملف غير مدعوم (يسمح بالصور و PDF فقط)'));
  }
};

// 10 MB size limit
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { upload, uploadsDir };
