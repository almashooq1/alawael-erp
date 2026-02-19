import express from 'express';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import { logAction } from '../utils/auditLogger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all inventory records
router.get('/', authMiddleware, async (req, res) => {
  const inventory = await Inventory.find().populate('product');
  res.json(inventory);
});

// Create inventory record
router.post('/', authMiddleware, async (req, res) => {
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
});

// Update inventory record
router.put('/:id', authMiddleware, async (req, res) => {
  const before = await Inventory.findById(req.params.id);
  const inventory = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await logAction({
    user: req.user,
    action: 'update',
    entity: 'Inventory',
    entityId: inventory._id,
    details: { before, after: inventory },
  });
  res.json(inventory);
});

// Delete inventory record
router.delete('/:id', authMiddleware, async (req, res) => {
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
});

export default router;
