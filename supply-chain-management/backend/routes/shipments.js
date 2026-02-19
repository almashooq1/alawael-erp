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
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  },
});
const upload = multer({ storage });

const router = express.Router();

// Get all shipments
router.get('/', authMiddleware, async (req, res) => {
  const shipments = await Shipment.find().populate('order');
  res.json(shipments);
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
    } catch (e) {
      /* تجاهل فشل البريد */
    }
    res.status(201).json(shipment);
  } catch (err) {
    res.status(500).json({ error: 'فشل رفع الشحنة' });
  }
});

// Update shipment
router.put('/:id', authMiddleware, async (req, res) => {
  const before = await Shipment.findById(req.params.id);
  const shipment = await Shipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
});

// Delete shipment
router.delete('/:id', authMiddleware, async (req, res) => {
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
});

export default router;
