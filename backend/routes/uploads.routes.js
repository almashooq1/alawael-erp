const express = require('express');
const path = require('path');
const { upload } = require('../middleware/upload');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/uploads/file
// Form-Data: file (binary)
router.post('/file', requireAuth, requireRole('admin'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم تحميل أي ملف' });
  }
  const publicUrl = `/public/uploads/${path.basename(req.file.path)}`;
  res.json({
    success: true,
    message: 'تم رفع الملف بنجاح',
    file: {
      name: req.file.originalname,
      size: req.file.size,
      mime: req.file.mimetype,
      path: publicUrl,
    },
  });
});

// Health endpoint for uploads service
router.get('/health', (req, res) => {
  res.json({ success: true, service: 'uploads', status: 'ok' });
});

module.exports = router;

