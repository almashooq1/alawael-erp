/* eslint-disable no-unused-vars */
import ChangeLog from '../models/ChangeLog.js';
import { sendMail } from '../utils/mailer.js';
import express from 'express';
import Order from '../models/Order.js';
import { logAction } from '../utils/auditLogger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().populate('supplier').populate('products.product');
    res.json(orders);
  } catch (_err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// Create order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    await logAction({
      user: req.user,
      action: 'create',
      entity: 'Order',
      entityId: order._id,
      details: { data: req.body },
    });
    // إرسال إشعار بريد إلكتروني للمسؤول
    try {
      await sendMail({
        to: process.env.ADMIN_EMAIL,
        subject: `طلب جديد #${order._id}`,
        text: `تم إضافة طلب جديد برقم ${order._id}\nمن المستخدم: ${req.user.email || req.user._id}`,
      });
    } catch (_e) {
      /* تجاهل فشل البريد */
    }
    res.status(201).json(order);
  } catch (_err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// Update order
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const before = await Order.findById(req.params.id);
    const { supplier, products, status, totalAmount, notes, orderDate, deliveryDate } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { supplier, products, status, totalAmount, notes, orderDate, deliveryDate },
      { new: true },
    );
    await logAction({
      user: req.user,
      action: 'update',
      entity: 'Order',
      entityId: order._id,
      details: { before, after: order },
    });
    await ChangeLog.create({
      entity: 'Order',
      entityId: order._id,
      action: 'update',
      user: req.user._id,
      before,
      after: order,
    });
    res.json(order);
  } catch (_err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// Delete order
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const before = await Order.findById(req.params.id);
    await Order.findByIdAndDelete(req.params.id);
    await logAction({
      user: req.user,
      action: 'delete',
      entity: 'Order',
      entityId: req.params.id,
      details: { before },
    });
    await ChangeLog.create({
      entity: 'Order',
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
