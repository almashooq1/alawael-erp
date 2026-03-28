/**
 * Maintenance Provider Routes — مسارات مزودي خدمات الصيانة
 * CRUD for maintenance centers and service providers
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const MaintenanceProvider = require('../models/MaintenanceProvider');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');

/** GET /api/maintenance-providers — list providers */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, providerType, preferredProvider, search, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (providerType) filter.providerType = providerType;
    if (preferredProvider !== undefined) filter.preferredProvider = preferredProvider === 'true';
    if (search)
      filter.$or = [
        { providerName: { $regex: search, $options: 'i' } },
        { providerId: { $regex: search, $options: 'i' } },
      ];

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      MaintenanceProvider.find(filter)
        .sort({ 'performance.averageRating': -1, providerName: 1 })
        .skip(skip)
        .limit(Number(limit)),
      MaintenanceProvider.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('maintenanceProvider list error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/maintenance-providers/stats — providers overview */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await MaintenanceProvider.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'نشط'] }, 1, 0] } },
          preferred: { $sum: { $cond: [{ $eq: ['$preferredProvider', true] }, 1, 0] } },
          avgRating: { $avg: '$performance.averageRating' },
        },
      },
    ]);
    const byType = await MaintenanceProvider.aggregate([
      { $group: { _id: '$providerType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: { summary: stats[0] || {}, byType } });
  } catch (err) {
    logger.error('maintenanceProvider stats error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/maintenance-providers/:id — get single provider */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const provider = await MaintenanceProvider.findById(req.params.id)
      .populate('verifiedBy', 'name')
      .populate('lastModifiedBy', 'name');
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
    res.json({ success: true, data: provider });
  } catch (err) {
    logger.error('maintenanceProvider get error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/maintenance-providers — create provider */
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'supervisor', 'fleet_manager']),
  async (req, res) => {
    try {
      const provider = await MaintenanceProvider.create(req.body);
      res.status(201).json({ success: true, data: provider });
    } catch (err) {
      logger.error('maintenanceProvider create error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** PUT /api/maintenance-providers/:id — update provider */
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin', 'supervisor', 'fleet_manager']),
  async (req, res) => {
    try {
      req.body.lastModifiedBy = req.user?._id || req.user?.id;
      const provider = await MaintenanceProvider.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
      res.json({ success: true, data: provider });
    } catch (err) {
      logger.error('maintenanceProvider update error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** DELETE /api/maintenance-providers/:id — delete provider (admin) */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const provider = await MaintenanceProvider.findByIdAndDelete(req.params.id);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
    res.json({ success: true, message: 'Provider deleted' });
  } catch (err) {
    logger.error('maintenanceProvider delete error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/maintenance-providers/:id/reviews — add a review */
router.post('/:id/reviews', requireAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const provider = await MaintenanceProvider.findById(req.params.id);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

    provider.performance.reviews.push({
      reviewer: req.user?.name || req.body.reviewer,
      rating,
      comment,
      date: new Date(),
    });

    // Recalculate average rating
    const reviews = provider.performance.reviews;
    provider.performance.averageRating =
      reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
    provider.performance.totalServices = (provider.performance.totalServices || 0) + 1;

    await provider.save();
    res.json({ success: true, data: provider.performance });
  } catch (err) {
    logger.error('maintenanceProvider review error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PATCH /api/maintenance-providers/:id/verify — verify provider */
router.patch('/:id/verify', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const provider = await MaintenanceProvider.findByIdAndUpdate(
      req.params.id,
      { verifiedAt: new Date(), verifiedBy: req.user?._id || req.user?.id },
      { new: true }
    );
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
    res.json({ success: true, data: provider });
  } catch (err) {
    logger.error('maintenanceProvider verify error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
