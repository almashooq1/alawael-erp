import express from 'express';
import multer from 'multer';
import path from 'path';
import Risk from '../models/risk.model';
import { requireRole } from './rbac.middleware';

const router = express.Router();

// إعداد التخزين المحلي للملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// رفع مرفق وربطه بمخاطرة
router.post('/risks/:id/attachments', requireRole(['admin', 'risk_manager']), upload.single('file'), async (req: any, res) => {
  const risk = await Risk.findById(req.params.id);
  if (!risk) return res.status(404).json({ error: 'Risk not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  const attachment = {
    filename: req.file.originalname,
    url: fileUrl,
    uploadedAt: new Date(),
    uploadedBy: (req.user && req.user.username) || 'unknown',
  };
  risk.attachments = risk.attachments || [];
  risk.attachments.push(attachment);
  await risk.save();
  res.status(201).json(attachment);
});

export default router;
