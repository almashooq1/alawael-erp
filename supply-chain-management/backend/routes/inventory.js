/* eslint-disable no-unused-vars */
import express from 'express';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import { logAction } from '../utils/auditLogger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all inventory records
router.get('/', authMiddleware, async (req, res) => {
  try {
    const inventory = await Inventory.find().populate('product');
    res.json(inventory);
  } catch (_err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// Create inventory record
router.post('/', authMiddleware, async (req, res) => {
  try {
    const inventory = new Inventory(req.body);
    await inventory.save();
    await logAction({
      user: req.user,
      action: 'create',
      entity: 'Inventory',
      entityId: inventory._id,
      details: { data: req.body },
    });
    res.status(201).json(inventory);
  } catch (_err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// Update inventory record
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const before = await Inventory.findById(req.params.id);
    const { product, quantity, location, status, notes, minQuantity, maxQuantity } = req.body;
    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { product, quantity, location, status, notes, minQuantity, maxQuantity },
      { new: true },
    );
    await logAction({
      user: req.user,
      action: 'update',
      entity: 'Inventory',
      entityId: inventory._id,
      details: { before, after: inventory },
    });
    res.json(inventory);
  } catch (_err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// Delete inventory record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const before = await Inventory.findById(req.params.id);
    await Inventory.findByIdAndDelete(req.params.id);
    await logAction({
      user: req.user,
      action: 'delete',
      entity: 'Inventory',
      entityId: req.params.id,
      details: { before },
    });
    res.status(204).end();
  } catch (_err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

export default router;
