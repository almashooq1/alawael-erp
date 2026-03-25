/**
 * 📦 نظام المخزون الموحد - Inventory System
 * AlAwael ERP - Unified Inventory Routes
 * الأولوية: ⭐⭐⭐⭐
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { escapeRegex } = require('../utils/sanitize');
const { paginate } = require('../utils/paginate');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const invV = require('../middleware/validators/inventory.validators');
const validateObjectId = require('../middleware/validateObjectId');

// ============================================
// نماذج المخزون
// ============================================

// الأصناف
const ProductSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  barcode: String,
  name: { type: String, required: true },
  nameEn: String,
  description: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: String,
  unit: { type: String, default: 'piece' }, // piece, kg, liter, box
  unitsPerPackage: { type: Number, default: 1 },
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  minPrice: { type: Number, default: 0 },
  taxRate: { type: Number, default: 15 },
  minStock: { type: Number, default: 0 },
  maxStock: { type: Number, default: 1000 },
  currentStock: { type: Number, default: 0 },
  reservedStock: { type: Number, default: 0 },
  availableStock: { type: Number, default: 0 },
  reorderPoint: { type: Number, default: 10 },
  location: String,
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  images: [String],
  isActive: { type: Boolean, default: true },
  isTracked: { type: Boolean, default: true },
  hasExpiry: { type: Boolean, default: false },
  hasSerial: { type: Boolean, default: false },
  attributes: mongoose.Schema.Types.Mixed,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// الفئات
const CategorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  nameEn: String,
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  description: String,
  image: String,
  isActive: { type: Boolean, default: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdAt: { type: Date, default: Date.now },
});

// المستودعات
const WarehouseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['main', 'branch', 'transit'], default: 'main' },
  address: {
    street: String,
    city: String,
    region: String,
    country: String,
    postalCode: String,
  },
  phone: String,
  email: String,
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  capacity: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdAt: { type: Date, default: Date.now },
});

// حركة المخزون
const StockMovementSchema = new mongoose.Schema({
  movementNumber: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['in', 'out', 'transfer', 'adjustment', 'return', 'damage'],
    required: true,
  },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  quantity: { type: Number, required: true },
  unitCost: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  reference: String,
  referenceType: { type: String, enum: ['purchase', 'sale', 'transfer', 'adjustment'] },
  referenceId: mongoose.Schema.Types.ObjectId,
  batchNumber: String,
  expiryDate: Date,
  serialNumbers: [String],
  notes: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

// الجرد
const StockTakeSchema = new mongoose.Schema({
  stockTakeNumber: { type: String, required: true, unique: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'completed', 'cancelled'],
    default: 'draft',
  },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      systemQuantity: { type: Number, default: 0 },
      countedQuantity: { type: Number, default: 0 },
      variance: { type: Number, default: 0 },
      notes: String,
    },
  ],
  totalItems: { type: Number, default: 0 },
  totalVariance: { type: Number, default: 0 },
  startedAt: Date,
  completedAt: Date,
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

// التحويلات
const StockTransferSchema = new mongoose.Schema({
  transferNumber: { type: String, required: true, unique: true },
  fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'pending', 'shipped', 'received', 'cancelled'],
    default: 'draft',
  },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      requestedQuantity: { type: Number, required: true },
      shippedQuantity: { type: Number, default: 0 },
      receivedQuantity: { type: Number, default: 0 },
      notes: String,
    },
  ],
  notes: String,
  shippedAt: Date,
  receivedAt: Date,
  shippedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

// إنشاء النماذج
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', WarehouseSchema);
const StockMovement =
  mongoose.models.StockMovement || mongoose.model('StockMovement', StockMovementSchema);
const StockTake = mongoose.models.StockTake || mongoose.model('StockTake', StockTakeSchema);
const StockTransfer =
  mongoose.models.StockTransfer || mongoose.model('StockTransfer', StockTransferSchema);

// Authentication required for all inventory routes
router.use(authenticate);

// ============================================
// API: الأصناف
// ============================================

// قائمة الأصناف
router.get('/products', async (req, res) => {
  try {
    const { category, warehouse, isActive, lowStock, search } = req.query;
    const filter = { organization: req.user.organization };

    if (category) filter.category = category;
    if (warehouse) filter.warehouse = warehouse;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (lowStock === 'true') filter.currentStock = { $lte: '$minStock' };
    if (search) {
      filter.$or = [
        { sku: { $regex: escapeRegex(search), $options: 'i' } },
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { barcode: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const query = Product.find(filter)
      .populate('category', 'name')
      .populate('warehouse', 'name')
      .sort({ name: 1 });
    const { data, meta } = await paginate(query, req.query);

    res.json({ success: true, data, ...meta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// صنف بالباركود
router.get('/products/barcode/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({
      barcode: req.params.barcode,
      organization: req.user.organization,
    }).populate('category warehouse');

    if (!product) {
      return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// إنشاء صنف
router.post(
  '/products',
  authorize(['admin', 'manager']),
  validate(invV.createProduct),
  async (req, res) => {
    try {
      const lastProduct = await Product.findOne({
        organization: req.user.organization,
      }).sort({ createdAt: -1 });

      const sku = lastProduct
        ? `PRD-${String(parseInt(lastProduct.sku.split('-')[1]) + 1).padStart(6, '0')}`
        : 'PRD-000001';

      const product = new Product({
        ...req.body,
        sku,
        availableStock: req.body.currentStock || 0,
        organization: req.user.organization,
        createdBy: req.user._id,
      });

      await product.save();

      res.status(201).json({
        success: true,
        data: product,
        message: 'تم إنشاء الصنف بنجاح',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// تحديث صنف
router.put(
  '/products/:id',
  authorize(['admin', 'manager']),
  validate(invV.updateProduct),
  async (req, res) => {
    try {
      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, organization: req.user.organization },
        { ...req.body, updatedAt: Date.now() },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
      }

      res.json({ success: true, data: product, message: 'تم تحديث الصنف بنجاح' });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// الأصناف منخفضة المخزون
router.get('/products/low-stock', async (req, res) => {
  try {
    const query = Product.find({
      organization: req.user.organization,
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minStock'] },
    }).populate('category warehouse');
    const { data, meta } = await paginate(query, req.query);

    res.json({ success: true, data, ...meta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ============================================
// API: الفئات
// ============================================

router.get('/categories', async (req, res) => {
  try {
    const query = Category.find({
      organization: req.user.organization,
      isActive: true,
    })
      .populate('parent')
      .sort({ name: 1 });
    const { data, meta } = await paginate(query, req.query);

    res.json({ success: true, data, ...meta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post(
  '/categories',
  authorize(['admin', 'manager']),
  validate(invV.createCategory),
  async (req, res) => {
    try {
      const category = new Category({
        ...req.body,
        organization: req.user.organization,
      });
      await category.save();
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// ============================================
// API: المستودعات
// ============================================

router.get('/warehouses', async (req, res) => {
  try {
    const query = Warehouse.find({
      organization: req.user.organization,
      isActive: true,
    }).populate('manager', 'name');
    const { data, meta } = await paginate(query, req.query);

    res.json({ success: true, data, ...meta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post(
  '/warehouses',
  authorize(['admin', 'manager']),
  validate(invV.createWarehouse),
  async (req, res) => {
    try {
      const warehouse = new Warehouse({
        ...req.body,
        organization: req.user.organization,
      });
      await warehouse.save();
      res.status(201).json({ success: true, data: warehouse });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// مخزون المستودع
router.get('/warehouses/:id/stock', validateObjectId('id'), async (req, res) => {
  try {
    const query = Product.find({
      warehouse: req.params.id,
      organization: req.user.organization,
      currentStock: { $gt: 0 },
    }).populate('category');
    const { data: products, meta } = await paginate(query, req.query);

    const totalValue = products.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);

    res.json({
      success: true,
      data: {
        products,
        totalItems: meta.total,
        totalQuantity: products.reduce((sum, p) => sum + p.currentStock, 0),
        totalValue,
      },
      ...meta,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ============================================
// API: حركة المخزون
// ============================================

router.get('/movements', async (req, res) => {
  try {
    const { type, warehouse, product, startDate, endDate } = req.query;
    const filter = { organization: req.user.organization };

    if (type) filter.type = type;
    if (warehouse) filter.warehouse = warehouse;
    if (product) filter.product = product;
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const query = StockMovement.find(filter)
      .populate('product', 'sku name')
      .populate('warehouse toWarehouse', 'name')
      .sort({ createdAt: -1 });
    const { data, meta } = await paginate(query, req.query);

    res.json({ success: true, data, ...meta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// إضافة للمخزون
router.post(
  '/movements/in',
  authorize(['admin', 'manager']),
  validate(invV.movementIn),
  async (req, res) => {
    try {
      const { productId, warehouseId, quantity, unitCost, reference, batchNumber, expiryDate } =
        req.body;

      const product = await Product.findOne({
        _id: productId,
        organization: req.user.organization,
      });

      if (!product) {
        return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
      }

      // إنشاء رقم الحركة
      const lastMovement = await StockMovement.findOne({
        organization: req.user.organization,
      }).sort({ createdAt: -1 });
      const movementNumber = lastMovement
        ? `MOV-${String(parseInt(lastMovement.movementNumber.split('-')[1]) + 1).padStart(8, '0')}`
        : 'MOV-00000001';

      const movement = new StockMovement({
        movementNumber,
        type: 'in',
        product: productId,
        warehouse: warehouseId,
        quantity,
        unitCost: unitCost || product.costPrice,
        totalCost: quantity * (unitCost || product.costPrice),
        reference,
        batchNumber,
        expiryDate,
        organization: req.user.organization,
        createdBy: req.user._id,
      });

      await movement.save();

      // تحديث المخزون
      product.currentStock += quantity;
      product.availableStock = product.currentStock - product.reservedStock;
      product.costPrice = unitCost || product.costPrice;
      await product.save();

      res.status(201).json({
        success: true,
        data: { movement, product },
        message: 'تم إضافة المخزون بنجاح',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// صرف من المخزون
router.post(
  '/movements/out',
  authorize(['admin', 'manager']),
  validate(invV.movementOut),
  async (req, res) => {
    try {
      const { productId, warehouseId, quantity, reference, notes } = req.body;

      const product = await Product.findOne({
        _id: productId,
        organization: req.user.organization,
      });

      if (!product) {
        return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
      }

      if (product.availableStock < quantity) {
        return res.status(400).json({
          success: false,
          message: `الكمية المتاحة (${product.availableStock}) أقل من المطلوب (${quantity})`,
        });
      }

      const lastMovement = await StockMovement.findOne({
        organization: req.user.organization,
      }).sort({ createdAt: -1 });
      const movementNumber = lastMovement
        ? `MOV-${String(parseInt(lastMovement.movementNumber.split('-')[1]) + 1).padStart(8, '0')}`
        : 'MOV-00000001';

      const movement = new StockMovement({
        movementNumber,
        type: 'out',
        product: productId,
        warehouse: warehouseId,
        quantity,
        unitCost: product.costPrice,
        totalCost: quantity * product.costPrice,
        reference,
        notes,
        organization: req.user.organization,
        createdBy: req.user._id,
      });

      await movement.save();

      // تحديث المخزون
      product.currentStock -= quantity;
      product.availableStock = product.currentStock - product.reservedStock;
      await product.save();

      res.status(201).json({
        success: true,
        data: { movement, product },
        message: 'تم صرف المخزون بنجاح',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// تسوية المخزون
router.post(
  '/movements/adjustment',
  authorize(['admin', 'manager']),
  validate(invV.movementAdjustment),
  async (req, res) => {
    try {
      const { productId, warehouseId, newQuantity, notes } = req.body;

      const product = await Product.findOne({
        _id: productId,
        organization: req.user.organization,
      });

      if (!product) {
        return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
      }

      const variance = newQuantity - product.currentStock;

      const lastMovement = await StockMovement.findOne({
        organization: req.user.organization,
      }).sort({ createdAt: -1 });
      const movementNumber = lastMovement
        ? `MOV-${String(parseInt(lastMovement.movementNumber.split('-')[1]) + 1).padStart(8, '0')}`
        : 'MOV-00000001';

      const movement = new StockMovement({
        movementNumber,
        type: 'adjustment',
        product: productId,
        warehouse: warehouseId,
        quantity: Math.abs(variance),
        unitCost: product.costPrice,
        totalCost: Math.abs(variance) * product.costPrice,
        notes: `تسوية من ${product.currentStock} إلى ${newQuantity}. ${notes || ''}`,
        organization: req.user.organization,
        createdBy: req.user._id,
      });

      await movement.save();

      // تحديث المخزون
      product.currentStock = newQuantity;
      product.availableStock = product.currentStock - product.reservedStock;
      await product.save();

      res.status(201).json({
        success: true,
        data: { movement, product },
        message: 'تم تسوية المخزون بنجاح',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// ============================================
// API: الجرد
// ============================================

router.get('/stock-takes', async (req, res) => {
  try {
    const query = StockTake.find({
      organization: req.user.organization,
    })
      .populate('warehouse', 'name')
      .sort({ date: -1 });
    const { data, meta } = await paginate(query, req.query);

    res.json({ success: true, data, ...meta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post(
  '/stock-takes',
  authorize(['admin', 'manager']),
  validate(invV.createStockTake),
  async (req, res) => {
    try {
      const { warehouseId } = req.body;

      const products = await Product.find({
        warehouse: warehouseId,
        organization: req.user.organization,
        isActive: true,
      });

      const lastStockTake = await StockTake.findOne({
        organization: req.user.organization,
      }).sort({ createdAt: -1 });
      const stockTakeNumber = lastStockTake
        ? `STK-${String(parseInt(lastStockTake.stockTakeNumber.split('-')[1]) + 1).padStart(6, '0')}`
        : 'STK-000001';

      const items = products.map(p => ({
        product: p._id,
        systemQuantity: p.currentStock,
        countedQuantity: 0,
        variance: -p.currentStock,
      }));

      const stockTake = new StockTake({
        stockTakeNumber,
        warehouse: warehouseId,
        date: new Date(),
        items,
        totalItems: products.length,
        organization: req.user.organization,
        createdBy: req.user._id,
      });

      await stockTake.save();

      res.status(201).json({
        success: true,
        data: stockTake,
        message: 'تم إنشاء الجرد بنجاح',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// تسجيل العدد
router.put(
  '/stock-takes/:id/count',
  authorize(['admin', 'manager']),
  validate(invV.countStockTake),
  async (req, res) => {
    try {
      const { productId, countedQuantity, notes } = req.body;

      const stockTake = await StockTake.findOne({
        _id: req.params.id,
        organization: req.user.organization,
      });

      if (!stockTake) {
        return res.status(404).json({ success: false, message: 'الجرد غير موجود' });
      }

      const item = stockTake.items.find(i => String(i.product) === String(productId));
      if (!item) {
        return res.status(404).json({ success: false, message: 'الصنف غير موجود في الجرد' });
      }

      item.countedQuantity = countedQuantity;
      item.variance = countedQuantity - item.systemQuantity;
      if (notes) item.notes = notes;

      stockTake.totalVariance = stockTake.items.reduce((sum, i) => sum + i.variance, 0);
      await stockTake.save();

      res.json({ success: true, data: stockTake });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// إتمام الجرد
router.post(
  '/stock-takes/:id/complete',
  validateObjectId('id'),
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const stockTake = await StockTake.findOne({
        _id: req.params.id,
        organization: req.user.organization,
      }).populate('items.product');

      if (!stockTake) {
        return res.status(404).json({ success: false, message: 'الجرد غير موجود' });
      }

      // تحديث المخزون لكل صنف
      for (const item of stockTake.items) {
        if (item.variance !== 0) {
          const product = await Product.findById(item.product._id);
          product.currentStock = item.countedQuantity;
          product.availableStock = product.currentStock - product.reservedStock;
          await product.save();
        }
      }

      stockTake.status = 'completed';
      stockTake.completedAt = new Date();
      stockTake.completedBy = req.user._id;
      await stockTake.save();

      res.json({
        success: true,
        data: stockTake,
        message: 'تم إتمام الجرد وتحديث المخزون',
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
  }
);

// ============================================
// API: التحويلات
// ============================================

router.get('/transfers', async (req, res) => {
  try {
    const query = StockTransfer.find({
      organization: req.user.organization,
    })
      .populate('fromWarehouse toWarehouse', 'name')
      .sort({ date: -1 });
    const { data, meta } = await paginate(query, req.query);

    res.json({ success: true, data, ...meta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post(
  '/transfers',
  authorize(['admin', 'manager']),
  validate(invV.createTransfer),
  async (req, res) => {
    try {
      const { fromWarehouseId, toWarehouseId, items, notes } = req.body;

      const lastTransfer = await StockTransfer.findOne({
        organization: req.user.organization,
      }).sort({ createdAt: -1 });
      const transferNumber = lastTransfer
        ? `TRF-${String(parseInt(lastTransfer.transferNumber.split('-')[1]) + 1).padStart(6, '0')}`
        : 'TRF-000001';

      const transfer = new StockTransfer({
        transferNumber,
        fromWarehouse: fromWarehouseId,
        toWarehouse: toWarehouseId,
        date: new Date(),
        items: items.map(i => ({
          product: i.productId,
          requestedQuantity: i.quantity,
          shippedQuantity: 0,
          receivedQuantity: 0,
        })),
        notes,
        organization: req.user.organization,
        createdBy: req.user._id,
      });

      await transfer.save();

      res.status(201).json({
        success: true,
        data: transfer,
        message: 'تم إنشاء التحويل بنجاح',
      });
    } catch (error) {
      res.status(400).json({ success: false, message: 'خطأ في البيانات المدخلة' });
    }
  }
);

// شحن التحويل
router.post(
  '/transfers/:id/ship',
  validateObjectId('id'),
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const transfer = await StockTransfer.findOne({
        _id: req.params.id,
        organization: req.user.organization,
      }).populate('items.product');

      if (!transfer) {
        return res.status(404).json({ success: false, message: 'التحويل غير موجود' });
      }

      // خصم من المخزون المصدر
      for (const item of transfer.items) {
        const product = await Product.findById(item.product._id);
        if (product.availableStock < item.requestedQuantity) {
          return res.status(400).json({
            success: false,
            message: `الكمية المتاحة من ${product.name} غير كافية`,
          });
        }
        product.currentStock -= item.requestedQuantity;
        product.availableStock -= item.requestedQuantity;
        await product.save();
        item.shippedQuantity = item.requestedQuantity;
      }

      transfer.status = 'shipped';
      transfer.shippedAt = new Date();
      transfer.shippedBy = req.user._id;
      await transfer.save();

      res.json({ success: true, data: transfer, message: 'تم شحن التحويل' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
  }
);

// استلام التحويل
router.post(
  '/transfers/:id/receive',
  authorize(['admin', 'manager']),
  validate(invV.receiveTransfer),
  async (req, res) => {
    try {
      const { items } = req.body; // [{ productId, receivedQuantity }]

      const transfer = await StockTransfer.findOne({
        _id: req.params.id,
        organization: req.user.organization,
      }).populate('items.product');

      if (!transfer) {
        return res.status(404).json({ success: false, message: 'التحويل غير موجود' });
      }

      // إضافة للمخزون المستهدف
      for (const receivedItem of items) {
        const item = transfer.items.find(i => String(i.product._id) === receivedItem.productId);
        if (item) {
          item.receivedQuantity = receivedItem.receivedQuantity;
          const product = await Product.findById(item.product._id);
          product.currentStock += receivedItem.receivedQuantity;
          product.availableStock += receivedItem.receivedQuantity;
          await product.save();
        }
      }

      transfer.status = 'received';
      transfer.receivedAt = new Date();
      transfer.receivedBy = req.user._id;
      await transfer.save();

      res.json({ success: true, data: transfer, message: 'تم استلام التحويل' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
  }
);

// ============================================
// لوحة تحكم المخزون
// ============================================

router.get('/dashboard', async (req, res) => {
  try {
    const products = await Product.find({ organization: req.user.organization });
    const warehouses = await Warehouse.find({
      organization: req.user.organization,
      isActive: true,
    });

    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive).length;
    const totalStock = products.reduce((sum, p) => sum + p.currentStock, 0);
    const totalValue = products.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);
    const lowStockProducts = products.filter(
      p => p.currentStock <= p.minStock && p.isActive
    ).length;
    const outOfStockProducts = products.filter(p => p.currentStock === 0 && p.isActive).length;

    // الحركات الأخيرة
    const recentMovements = await StockMovement.find({ organization: req.user.organization })
      .populate('product', 'sku name')
      .sort({ createdAt: -1 })
      .limit(10);

    // أعلى الأصناف قيمة
    const topValueProducts = [...products]
      .sort((a, b) => b.currentStock * b.costPrice - a.currentStock * a.costPrice)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          activeProducts,
          totalStock,
          totalValue,
          lowStockProducts,
          outOfStockProducts,
          totalWarehouses: warehouses.length,
        },
        lowStock: products.filter(p => p.currentStock <= p.minStock && p.isActive).slice(0, 10),
        recentMovements,
        topValueProducts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ============================================
// تصدير
// ============================================

module.exports = {
  router,
  Product,
  Category,
  Warehouse,
  StockMovement,
  StockTake,
  StockTransfer,
};
