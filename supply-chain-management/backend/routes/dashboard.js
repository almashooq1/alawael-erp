import express from 'express';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import Shipment from '../models/Shipment.js';

const router = express.Router();

// إحصائيات سريعة للنظام
router.get('/stats', async (req, res) => {
  try {
    const [suppliers, products, inventory, orders, shipments] = await Promise.all([
      Supplier.countDocuments(),
      Product.countDocuments(),
      Inventory.countDocuments(),
      Order.countDocuments(),
      Shipment.countDocuments(),
    ]);
    res.json({
      suppliers,
      products,
      inventory,
      orders,
      shipments,
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
});

// تقارير متقدمة
router.get('/advanced-reports', async (req, res) => {
  try {
    // الطلبات حسب الحالة
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    // الشحنات حسب الحالة
    const shipmentsByStatus = await Shipment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    // المنتجات حسب المورد
    const productsBySupplier = await Product.aggregate([
      { $group: { _id: '$supplier', count: { $sum: 1 } } },
    ]);
    // الموردون مع عدد المنتجات
    const suppliers = await Supplier.find({}, 'name');
    const productsPerSupplier = productsBySupplier.map(p => ({
      supplier: suppliers.find(s => s._id.equals(p._id))?.name || 'غير معروف',
      count: p.count,
    }));
    // الطلبات الشهرية (آخر 12 شهر)
    const ordersByMonth = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json({
      ordersByStatus,
      shipmentsByStatus,
      productsPerSupplier,
      ordersByMonth,
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب التقارير المتقدمة' });
  }
});

export default router;
