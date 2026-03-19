/**
 * مسارات إدارة المرافق
 * Facilities Management Routes — Rooms, Bookings, Maintenance, Dashboard
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const Room = require('../models/Room');
const RoomBooking = require('../models/RoomBooking');
const MaintenanceRequest = require('../models/MaintenanceRequest');

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
//  ROOMS (الغرف والمرافق)
// ═══════════════════════════════════════════════════════════════

// GET /rooms
router.get('/rooms', async (req, res) => {
  try {
    const { type, status, building, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (building) filter.building = building;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Room.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
      Room.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error('Rooms list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الغرف' });
  }
});

// GET /rooms/:id
router.get('/rooms/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).lean();
    if (!room) return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
    res.json({ success: true, data: room });
  } catch (err) {
    logger.error('Room detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الغرفة' });
  }
});

// POST /rooms
router.post(
  '/rooms',
  authorize(['admin', 'super_admin', 'manager']),
  validate([body('name').trim().notEmpty().withMessage('اسم الغرفة مطلوب')]),
  async (req, res) => {
    try {
      const room = new Room({ ...req.body, createdBy: req.user._id || req.userId });
      await room.save();
      res.status(201).json({ success: true, data: room, message: 'تم إنشاء الغرفة بنجاح' });
    } catch (err) {
      logger.error('Room create error:', err);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء الغرفة' });
    }
  }
);

// PUT /rooms/:id
router.put(
  '/rooms/:id',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الغرفة غير صالح'),
    body('status')
      .optional()
      .isIn(['available', 'occupied', 'under_maintenance', 'reserved', 'closed'])
      .withMessage('حالة الغرفة غير صالحة'),
    body('capacity').optional().isInt({ min: 1 }).withMessage('السعة يجب أن تكون رقم صحيح موجب'),
  ]),
  async (req, res) => {
    try {
      const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!room) return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
      res.json({ success: true, data: room, message: 'تم تحديث الغرفة بنجاح' });
    } catch (err) {
      logger.error('Room update error:', err);
      res.status(500).json({ success: false, message: 'خطأ في تحديث الغرفة' });
    }
  }
);

// DELETE /rooms/:id
router.delete('/rooms/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
    res.json({ success: true, message: 'تم حذف الغرفة بنجاح' });
  } catch (err) {
    logger.error('Room delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف الغرفة' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  BOOKINGS (حجوزات الغرف)
// ═══════════════════════════════════════════════════════════════

// GET /bookings
router.get('/bookings', async (req, res) => {
  try {
    const { room, status, date, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (room) filter.room = room;
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      filter.bookingDate = {
        $gte: new Date(d.setHours(0, 0, 0, 0)),
        $lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      RoomBooking.find(filter)
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('room', 'name type')
        .populate('bookedBy', 'name email')
        .lean(),
      RoomBooking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error('Bookings list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحجوزات' });
  }
});

// POST /bookings
router.post(
  '/bookings',
  validate([
    body('room').notEmpty().withMessage('الغرفة مطلوبة'),
    body('title').trim().notEmpty().withMessage('عنوان الحجز مطلوب'),
    body('bookingDate').isISO8601().withMessage('تاريخ الحجز غير صالح'),
    body('startTime').notEmpty().withMessage('وقت البداية مطلوب'),
    body('endTime').notEmpty().withMessage('وقت النهاية مطلوب'),
  ]),
  async (req, res) => {
    try {
      // Check for conflicts
      const conflict = await RoomBooking.findOne({
        room: req.body.room,
        bookingDate: req.body.bookingDate,
        status: { $in: ['confirmed', 'pending'] },
        $or: [{ startTime: { $lt: req.body.endTime }, endTime: { $gt: req.body.startTime } }],
      });
      if (conflict) {
        return res.status(409).json({ success: false, message: 'يوجد تعارض في الحجز' });
      }

      const booking = new RoomBooking({
        ...req.body,
        bookedBy: req.user._id || req.userId,
        createdBy: req.user._id || req.userId,
      });
      await booking.save();
      res.status(201).json({ success: true, data: booking, message: 'تم الحجز بنجاح' });
    } catch (err) {
      logger.error('Booking create error:', err);
      res.status(500).json({ success: false, message: 'خطأ في الحجز' });
    }
  }
);

// PUT /bookings/:id — Update booking
router.put(
  '/bookings/:id',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف الحجز غير صالح'),
    body('room').optional().isMongoId().withMessage('معرف الغرفة غير صالح'),
    body('status')
      .optional()
      .isIn(['confirmed', 'pending', 'cancelled', 'completed'])
      .withMessage('حالة الحجز غير صالحة'),
  ]),
  async (req, res) => {
    try {
      const updates = req.body;
      // If time changed, re-check conflicts
      if (updates.startTime || updates.endTime || updates.bookingDate) {
        const existing = await RoomBooking.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
        const conflict = await RoomBooking.findOne({
          _id: { $ne: req.params.id },
          room: updates.room || existing.room,
          bookingDate: updates.bookingDate || existing.bookingDate,
          status: { $in: ['confirmed', 'pending'] },
          $or: [
            {
              startTime: { $lt: updates.endTime || existing.endTime },
              endTime: { $gt: updates.startTime || existing.startTime },
            },
          ],
        });
        if (conflict) {
          return res.status(409).json({ success: false, message: 'يوجد تعارض في الحجز' });
        }
      }
      const booking = await RoomBooking.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });
      if (!booking) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, data: booking, message: 'تم تحديث الحجز بنجاح' });
    } catch (err) {
      logger.error('Booking update error:', err);
      res.status(500).json({ success: false, message: 'خطأ في تحديث الحجز' });
    }
  }
);

// DELETE /bookings/:id — Cancel booking
router.delete('/bookings/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    const booking = await RoomBooking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    res.json({ success: true, data: booking, message: 'تم إلغاء الحجز بنجاح' });
  } catch (err) {
    logger.error('Booking cancel error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إلغاء الحجز' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  MAINTENANCE (طلبات الصيانة)
// ═══════════════════════════════════════════════════════════════

// GET /maintenance
router.get('/maintenance', async (req, res) => {
  try {
    const { room, status, priority, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (room) filter.room = room;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      MaintenanceRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('room', 'name building')
        .lean(),
      MaintenanceRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    logger.error('Maintenance list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب طلبات الصيانة' });
  }
});

// POST /maintenance
router.post(
  '/maintenance',
  validate([
    body('title').trim().notEmpty().withMessage('عنوان طلب الصيانة مطلوب'),
    body('description').trim().notEmpty().withMessage('وصف المشكلة مطلوب'),
  ]),
  async (req, res) => {
    try {
      const mr = new MaintenanceRequest({
        ...req.body,
        requestedBy: req.user._id || req.userId,
        createdBy: req.user._id || req.userId,
      });
      await mr.save();
      res.status(201).json({ success: true, data: mr, message: 'تم رفع طلب الصيانة بنجاح' });
    } catch (err) {
      logger.error('Maintenance create error:', err);
      res.status(500).json({ success: false, message: 'خطأ في رفع طلب الصيانة' });
    }
  }
);

// PUT /maintenance/:id
router.put(
  '/maintenance/:id',
  authorize(['admin', 'super_admin', 'manager']),
  validate([
    param('id').isMongoId().withMessage('معرف طلب الصيانة غير صالح'),
    body('status')
      .optional()
      .isIn(['open', 'in_progress', 'scheduled', 'completed', 'cancelled'])
      .withMessage('حالة طلب الصيانة غير صالحة'),
  ]),
  async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.status === 'completed' && !updates.completedDate) {
        updates.completedDate = new Date();
      }
      const mr = await MaintenanceRequest.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });
      if (!mr) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
      res.json({ success: true, data: mr, message: 'تم تحديث طلب الصيانة بنجاح' });
    } catch (err) {
      logger.error('Maintenance update error:', err);
      res.status(500).json({ success: false, message: 'خطأ في تحديث طلب الصيانة' });
    }
  }
);

// DELETE /maintenance/:id — حذف طلب صيانة
router.delete(
  '/maintenance/:id',
  authorize(['admin', 'super_admin', 'manager']),
  async (req, res) => {
    try {
      const mr = await MaintenanceRequest.findByIdAndDelete(req.params.id);
      if (!mr) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
      res.json({ success: true, data: mr, message: 'تم حذف طلب الصيانة بنجاح' });
    } catch (err) {
      logger.error('Maintenance delete error:', err);
      res.status(500).json({ success: false, message: 'خطأ في حذف طلب الصيانة' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD (لوحة المعلومات)
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalRooms,
      availableRooms,
      occupiedRooms,
      underMaintenance,
      todayBookings,
      pendingMaintenance,
      roomsByType,
    ] = await Promise.all([
      Room.countDocuments(),
      Room.countDocuments({ status: 'available' }),
      Room.countDocuments({ status: 'occupied' }),
      Room.countDocuments({ status: 'under_maintenance' }),
      RoomBooking.countDocuments({
        bookingDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: { $in: ['confirmed', 'pending'] },
      }),
      MaintenanceRequest.countDocuments({ status: { $in: ['new', 'assigned', 'in_progress'] } }),
      Room.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      data: {
        totalRooms,
        availableRooms,
        occupiedRooms,
        underMaintenance,
        todayBookings,
        pendingMaintenance,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
        roomsByType,
      },
    });
  } catch (err) {
    logger.error('Facility dashboard error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب لوحة المعلومات' });
  }
});

module.exports = router;
