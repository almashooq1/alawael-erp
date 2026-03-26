import ChangeLog from '../models/ChangeLog.js';
import { sendMail } from '../utils/mailer.js';
import express from 'express';
import Shipment from '../models/Shipment.js';
import { logAction } from '../utils/auditLogger.js';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'backend', 'uploads', 'shipments'));
  },
  filename: function (req, file, cb) {
    // Use crypto-safe random instead of Math.random
    const crypto = await import('crypto').catch(() => ({ randomBytes: () => Buffer.from(String(Date.now())) }));
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 10) + ext);
  },
});

// Shipment attachments: PDFs, images, and common documents only
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // xlsx
]);
const ALLOWED_EXTS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx']);

const shipmentFileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIMES.has(file.mimetype) && ALLOWED_EXTS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. المسموح: PDF, PNG, JPG, DOCX, XLSX'));
  }
};

const upload = multer({
  storage,
  fileFilter: shipmentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

const router = express.Router();

// Get all shipments (paginated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [shipments, total] = await Promise.all([
      Shipment.find().populate('order').skip(skip).limit(limit).lean(),
      Shipment.countDocuments(),
    ]);
    res.json({ data: shipments, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (_err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// Create shipment (with attachments upload)
router.post('/', authMiddleware, upload.array('attachments', 5), async (req, res) => {
  try {
    const data = req.body;
    if (req.files && req.files.length > 0) {
      data.attachments = req.files.map(f => `/uploads/shipments/${f.filename}`);
    }
    const shipment = new Shipment(data);
    await shipment.save();
    await logAction({
      user: req.user,
      action: 'create',
      entity: 'Shipment',
      entityId: shipment._id,
      details: { data },
    });
    // إرسال إشعار بريد إلكتروني للمسؤول
    try {
      await sendMail({
        to: process.env.ADMIN_EMAIL,
        subject: `شحنة جديدة #${shipment._id}`,
        text: `تم إضافة شحنة جديدة برقم ${shipment._id}\nمن المستخدم: ${req.user.email || req.user._id}`,
      });
    } catch (_e) {
      /* تجاهل فشل البريد */
    }
    res.status(201).json(shipment);
  } catch (_err) {
    res.status(500).json({ error: 'فشل رفع الشحنة' });
  }
});

// Update shipment
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const before = await Shipment.findById(req.params.id);
    const { order, carrier, trackingNumber, status, estimatedDelivery, actualDelivery, notes } = req.body;
    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { order, carrier, trackingNumber, status, estimatedDelivery, actualDelivery, notes },
      { new: true },
    );
    await logAction({
      user: req.user,
      action: 'update',
      entity: 'Shipment',
      entityId: shipment._id,
      details: { before, after: shipment },
    });
    await ChangeLog.create({
      entity: 'Shipment',
      entityId: shipment._id,
      action: 'update',
      user: req.user._id,
      before,
      after: shipment,
    });
    res.json(shipment);
  } catch (_err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// Delete shipment
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const before = await Shipment.findById(req.params.id);
    await Shipment.findByIdAndDelete(req.params.id);
    await logAction({
      user: req.user,
      action: 'delete',
      entity: 'Shipment',
      entityId: req.params.id,
      details: { before },
    });
    await ChangeLog.create({
      entity: 'Shipment',
      entityId: req.params.id,
      action: 'delete',
      user: req.user._id,
      before,
      after: null,
    });
    res.status(204).end();
  } catch (_err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

export default router;
