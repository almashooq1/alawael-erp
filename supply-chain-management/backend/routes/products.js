import ChangeLog from '../models/ChangeLog.js';
import express from 'express';
import Product from '../models/Product.js';
import { logAction } from '../utils/auditLogger.js';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'backend', 'uploads', 'products'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  },
});
const upload = multer({ storage });

const router = express.Router();

// Get all products
router.get('/', authMiddleware, async (req, res) => {
  const products = await Product.find().populate('supplier');
  res.json(products);
});

// Create product (with image upload)
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const data = req.body;
    if (req.file) {
      data.imagePath = `/uploads/products/${req.file.filename}`;
    }
    const product = new Product(data);
    await product.save();
    await logAction({
      user: req.user,
      action: 'create',
      entity: 'Product',
      entityId: product._id,
      details: { data },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'فشل رفع المنتج' });
  }
});

// Update product
router.put('/:id', authMiddleware, async (req, res) => {
  const before = await Product.findById(req.params.id);
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await logAction({
    user: req.user,
    action: 'update',
    entity: 'Product',
    entityId: product._id,
    details: { before, after: product },
  });
  // سجل التعديلات
  await ChangeLog.create({
    entity: 'Product',
    entityId: product._id,
    action: 'update',
    user: req.user._id,
    before,
    after: product,
  });
  res.json(product);
});

// Delete product
router.delete('/:id', authMiddleware, async (req, res) => {
  const before = await Product.findById(req.params.id);
  await Product.findByIdAndDelete(req.params.id);
  await logAction({
    user: req.user,
    action: 'delete',
    entity: 'Product',
    entityId: req.params.id,
    details: { before },
  });
  // سجل التعديلات
  await ChangeLog.create({
    entity: 'Product',
    entityId: req.params.id,
    action: 'delete',
    user: req.user._id,
    before,
    after: null,
  });
  res.status(204).end();
});

export default router;
