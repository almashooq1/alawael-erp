/**
 * Maintenance Inventory Routes — مسارات مخزون قطع الغيار
 * CRUD for spare parts and materials inventory management
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const MaintenanceInventory = require('../models/MaintenanceInventory');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');

/** GET /api/maintenance-inventory — list inventory items */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, status, search, lowStock, needsReorder, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search)
      filter.$or = [
        { partName: { $regex: escapeRegex(String(search)), $options: 'i' } },
        { partNumber: { $regex: escapeRegex(String(search)), $options: 'i' } },
        { inventoryId: { $regex: escapeRegex(String(search)), $options: 'i' } },
      ];
    if (lowStock === 'true') filter.$expr = { $lt: ['$currentStock', '$minimumStock'] };
    if (needsReorder === 'true') filter.$expr = { $lte: ['$currentStock', '$reorderLevel'] };

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      MaintenanceInventory.find(filter)
        .populate('preferredSupplier', 'providerName contactInfo.phone')
        .sort({ category: 1, partName: 1 })
        .skip(skip)
        .limit(Number(limit)),
      MaintenanceInventory.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('maintenanceInventory list error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/maintenance-inventory/stats — inventory statistics */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await MaintenanceInventory.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: { $multiply: ['$currentStock', '$pricing.unitCost'] } },
          lowStockCount: { $sum: { $cond: [{ $lt: ['$currentStock', '$minimumStock'] }, 1, 0] } },
          reorderCount: { $sum: { $cond: [{ $lte: ['$currentStock', '$reorderLevel'] }, 1, 0] } },
          expiredCount: { $sum: { $cond: [{ $eq: ['$lifecycle.isExpired', true] }, 1, 0] } },
        },
      },
    ]);
    const categoryBreakdown = await MaintenanceInventory.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, totalStock: { $sum: '$currentStock' } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: { summary: stats[0] || {}, categoryBreakdown } });
  } catch (err) {
    logger.error('maintenanceInventory stats error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/maintenance-inventory/low-stock — items below minimum stock */
router.get('/low-stock', requireAuth, async (req, res) => {
  try {
    const data = await MaintenanceInventory.find({
      $expr: { $lt: ['$currentStock', '$minimumStock'] },
    })
      .populate('preferredSupplier', 'providerName')
      .sort({ currentStock: 1 });
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('maintenanceInventory lowStock error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/maintenance-inventory/:id — get single item */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const item = await MaintenanceInventory.findById(req.params.id)
      .populate('preferredSupplier')
      .populate('suppliers.supplierId', 'providerName')
      .populate('createdBy', 'name')
      .populate('lastUpdatedBy', 'name');
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error('maintenanceInventory get error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/maintenance-inventory — create item */
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'supervisor', 'fleet_manager']),
  async (req, res) => {
    try {
      const data = { ...req.body, createdBy: req.user?._id || req.user?.id };
      const item = await MaintenanceInventory.create(data);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      logger.error('maintenanceInventory create error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** PUT /api/maintenance-inventory/:id — update item */
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin', 'supervisor', 'fleet_manager']),
  async (req, res) => {
    try {
      req.body.lastUpdatedBy = req.user?._id || req.user?.id;
      const item = await MaintenanceInventory.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
        new: true,
        runValidators: true,
      });
      if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
      res.json({ success: true, data: item });
    } catch (err) {
      logger.error('maintenanceInventory update error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** DELETE /api/maintenance-inventory/:id — delete item (admin) */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const item = await MaintenanceInventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    logger.error('maintenanceInventory delete error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/maintenance-inventory/:id/stock-movement — record stock movement */
router.post('/:id/stock-movement', requireAuth, async (req, res) => {
  try {
    const { type, quantity, reference, reason, notes } = req.body;
    const item = await MaintenanceInventory.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const movement = {
      date: new Date(),
      type,
      quantity,
      reference,
      reason,
      notes,
      performedBy: req.user?.name || 'System',
    };

    // Update stock based on movement type
    if (type === 'ورود' || type === 'تسوية') {
      item.currentStock += quantity;
    } else if (type === 'صرف' || type === 'تلف') {
      if (item.currentStock < quantity) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }
      item.currentStock -= quantity;
    }

    item.stockMovements.push(movement);
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error('maintenanceInventory stockMovement error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
