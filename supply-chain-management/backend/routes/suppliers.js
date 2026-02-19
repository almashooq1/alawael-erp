const express = require('express');
const ChangeLog = require('../models/ChangeLog');
const { sendMail } = require('../utils/mailer');
const { authMiddleware } = require('../middleware/auth');
const Supplier = require('../models/Supplier');

const router = express.Router();

// إضافة مراجعة وتقييم لمورد
router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'التقييم يجب أن يكون بين 1 و 5' });
    }
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'المورد غير موجود' });
    // منع تكرار التقييم من نفس المستخدم
    if (supplier.reviews.some(r => r.user?.toString() === req.user._id.toString())) {
      return res.status(400).json({ error: 'لقد قمت بتقييم هذا المورد مسبقاً' });
    }
    supplier.reviews.push({ user: req.user._id, rating, comment });
    // تحديث متوسط التقييم
    supplier.rating =
      supplier.reviews.reduce((acc, r) => acc + r.rating, 0) / supplier.reviews.length;
    await supplier.save();
    await logAction({
      user: req.user,
      action: 'review',
      entity: 'Supplier',
      entityId: supplier._id,
      details: { rating, comment },
    });
    // إرسال إشعار بريد إلكتروني للمسؤول
    try {
      await sendMail({
        to: process.env.ADMIN_EMAIL,
        subject: `تقييم جديد للمورد: ${supplier.name}`,
        text: `تم إضافة تقييم جديد للمورد ${supplier.name}\nالتقييم: ${rating}\nالتعليق: ${comment || '-'}\nمن المستخدم: ${req.user.email || req.user._id}`,
      });
    } catch (e) {
      /* تجاهل فشل البريد */
    }
    res.json({ rating: supplier.rating, reviews: supplier.reviews });
  } catch (err) {
    res.status(500).json({ error: 'فشل إضافة التقييم' });
  }
});
import express from 'express';
import Supplier from '../models/Supplier.js';
import { logAction } from '../utils/auditLogger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all suppliers
router.get('/', authMiddleware, async (req, res) => {
  const suppliers = await Supplier.find();
  res.json(suppliers);
});

// Create supplier
router.post('/', authMiddleware, async (req, res) => {
  const supplier = new Supplier(req.body);
  await supplier.save();
  await logAction({
    user: req.user,
    action: 'create',
    entity: 'Supplier',
    entityId: supplier._id,
    details: { data: req.body },
  });
  res.status(201).json(supplier);
});

// Update supplier
router.put('/:id', authMiddleware, async (req, res) => {
  const before = await Supplier.findById(req.params.id);
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await logAction({
    user: req.user,
    action: 'update',
    entity: 'Supplier',
    entityId: supplier._id,
    details: { before, after: supplier },
  });
  await ChangeLog.create({
    entity: 'Supplier',
    entityId: supplier._id,
    action: 'update',
    user: req.user._id,
    before,
    after: supplier,
  });
  res.json(supplier);
});

// Delete supplier
router.delete('/:id', authMiddleware, async (req, res) => {
  const before = await Supplier.findById(req.params.id);
  await Supplier.findByIdAndDelete(req.params.id);
  await logAction({
    user: req.user,
    action: 'delete',
    entity: 'Supplier',
    entityId: req.params.id,
    details: { before },
  });
  await ChangeLog.create({
    entity: 'Supplier',
    entityId: req.params.id,
    action: 'delete',
    user: req.user._id,
    before,
    after: null,
  });
  res.status(204).end();
});

module.exports = router;
