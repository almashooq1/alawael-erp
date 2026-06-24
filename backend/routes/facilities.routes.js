/**
 * مسارات إدارة المرافق
 * Facilities Management Routes — Rooms, Bookings, Maintenance, Dashboard
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const _logger = require('../utils/logger');
const Room = require('../models/Room');
const RoomBooking = require('../models/RoomBooking');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

const scopedById = (req, id) => ({ _id: id, ...branchFilter(req) });

const aggregateScope = scope => {
  if (!scope?.branchId) return scope || {};
  if (scope.branchId?.$in && Array.isArray(scope.branchId.$in)) {
    return {
      ...scope,
      branchId: {
        $in: scope.branchId.$in
          .filter(id => mongoose.isValidObjectId(id))
          .map(id => new mongoose.Types.ObjectId(id)),
      },
    };
  }
  if (mongoose.isValidObjectId(scope.branchId)) {
    return { ...scope, branchId: new mongoose.Types.ObjectId(scope.branchId) };
  }
  return scope;
};

async function getScopedRoomIds(req) {
  if (req.branchScope?.allBranches) return null;
  if (Array.isArray(req._facilitiesScopedRoomIds)) return req._facilitiesScopedRoomIds;
  const rooms = await Room.find(branchFilter(req)).select('_id').lean();
  req._facilitiesScopedRoomIds = rooms.map(r => r._id);
  return req._facilitiesScopedRoomIds;
}

async function mergeBookingFilter(req, filter = {}) {
  const roomIds = await getScopedRoomIds(req);
  if (roomIds === null) return filter;
  if (filter.room) {
    const inScope = roomIds.some(id => String(id) === String(filter.room));
    if (!inScope) return { ...filter, room: { $in: [] } };
    return filter;
  }
  return { ...filter, room: { $in: roomIds } };
}

async function ensureRoomInScope(req, roomId) {
  if (!mongoose.isValidObjectId(roomId)) return null;
  return Room.findOne({ _id: roomId, ...branchFilter(req) })
    .select('_id')
    .lean();
}

async function mergeMaintenanceFilter(req, filter = {}) {
  const scope = branchFilter(req);
  if (!scope.branchId) return filter;
  const roomIds = await getScopedRoomIds(req);
  return {
    ...filter,
    $or: [{ ...scope }, { branchId: { $exists: false }, room: { $in: roomIds } }],
  };
}
// ═══════════════════════════════════════════════════════════════
//  ROOMS (الغرف والمرافق)
// ═══════════════════════════════════════════════════════════════

// GET /rooms
router.get('/rooms', async (req, res) => {
  try {
    const { type, status, building, page = 1, limit = 50 } = req.query;
    const filter = { ...branchFilter(req) };
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
    safeError(res, err, 'Rooms list error');
  }
});

// GET /rooms/:id
router.get('/rooms/:id', async (req, res) => {
  try {
    const room = await Room.findOne(scopedById(req, req.params.id)).lean();
    if (!room) return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
    res.json({ success: true, data: room });
  } catch (err) {
    safeError(res, err, 'Room detail error');
  }
});

// POST /rooms
router.post(
  '/rooms',
  authorize(['admin', 'super_admin', 'manager']),
  validate([body('name').trim().notEmpty().withMessage('اسم الغرفة مطلوب')]),
  async (req, res) => {
    try {
      const payload = stripUpdateMeta(req.body);
      if (req.branchScope?.branchId) {
        payload.branchId = req.branchScope.branchId;
      } else if (!payload.branchId) {
        return res.status(400).json({ success: false, message: 'معرف الفرع مطلوب' });
      }
      const room = new Room({ ...payload, createdBy: req.user._id || req.userId });
      await room.save();
      res.status(201).json({ success: true, data: room, message: 'تم إنشاء الغرفة بنجاح' });
    } catch (err) {
      safeError(res, err, 'Room create error');
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
      const updates = stripUpdateMeta(req.body);
      delete updates.branchId;
      const room = await Room.findOneAndUpdate(scopedById(req, req.params.id), updates, {
        returnDocument: 'after',
        runValidators: true,
      });
      if (!room) return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
      res.json({ success: true, data: room, message: 'تم تحديث الغرفة بنجاح' });
    } catch (err) {
      safeError(res, err, 'Room update error');
    }
  }
);

// DELETE /rooms/:id
router.delete('/rooms/:id', authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const room = await Room.findOneAndDelete(scopedById(req, req.params.id));
    if (!room) return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
    res.json({ success: true, message: 'تم حذف الغرفة بنجاح' });
  } catch (err) {
    safeError(res, err, 'Room delete error');
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

    const scopedFilter = await mergeBookingFilter(req, filter);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      RoomBooking.find(scopedFilter)
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('room', 'name type')
        .populate('bookedBy', 'name email')
        .lean(),
      RoomBooking.countDocuments(scopedFilter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    safeError(res, err, 'Bookings list error');
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
      const scopedRoom = await ensureRoomInScope(req, req.body.room);
      if (!scopedRoom) {
        return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
      }

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
        ...stripUpdateMeta(req.body),
        bookedBy: req.user._id || req.userId,
        createdBy: req.user._id || req.userId,
      });
      await booking.save();
      res.status(201).json({ success: true, data: booking, message: 'تم الحجز بنجاح' });
    } catch (err) {
      safeError(res, err, 'Booking create error');
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
      const updates = stripUpdateMeta(req.body);
      if (updates.room) {
        const scopedRoom = await ensureRoomInScope(req, updates.room);
        if (!scopedRoom) {
          return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
        }
      }
      // If time changed, re-check conflicts
      const scopedCurrentFilter = await mergeBookingFilter(req, { _id: req.params.id });
      const existing = await RoomBooking.findOne(scopedCurrentFilter);
      if (!existing) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      if (updates.startTime || updates.endTime || updates.bookingDate) {
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
      const scopedUpdateFilter = await mergeBookingFilter(req, { _id: req.params.id });
      const booking = await RoomBooking.findOneAndUpdate(scopedUpdateFilter, updates, {
        returnDocument: 'after',
        runValidators: true,
      });
      if (!booking) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, data: booking, message: 'تم تحديث الحجز بنجاح' });
    } catch (err) {
      safeError(res, err, 'Booking update error');
    }
  }
);

// DELETE /bookings/:id — Cancel booking
router.delete('/bookings/:id', authorize(['admin', 'super_admin', 'manager']), async (req, res) => {
  try {
    const scopedFilter = await mergeBookingFilter(req, { _id: req.params.id });
    const booking = await RoomBooking.findOneAndUpdate(
      scopedFilter,
      { status: 'cancelled' },
      { returnDocument: 'after' }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    res.json({ success: true, data: booking, message: 'تم إلغاء الحجز بنجاح' });
  } catch (err) {
    safeError(res, err, 'Booking cancel error');
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

    const scopedFilter = await mergeMaintenanceFilter(req, filter);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      MaintenanceRequest.find(scopedFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('room', 'name building')
        .lean(),
      MaintenanceRequest.countDocuments(scopedFilter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    safeError(res, err, 'Maintenance list error');
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
      if (req.body.room) {
        const scopedRoom = await ensureRoomInScope(req, req.body.room);
        if (!scopedRoom) {
          return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
        }
      }
      const payload = stripUpdateMeta(req.body);
      if (req.branchScope?.branchId) payload.branchId = req.branchScope.branchId;
      const mr = new MaintenanceRequest({
        ...payload,
        requestedBy: req.user._id || req.userId,
        createdBy: req.user._id || req.userId,
      });
      await mr.save();
      res.status(201).json({ success: true, data: mr, message: 'تم رفع طلب الصيانة بنجاح' });
    } catch (err) {
      safeError(res, err, 'Maintenance create error');
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
      const updates = stripUpdateMeta(req.body);
      delete updates.branchId;
      if (updates.room) {
        const scopedRoom = await ensureRoomInScope(req, updates.room);
        if (!scopedRoom) {
          return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
        }
      }
      if (updates.status === 'completed' && !updates.completedDate) {
        updates.completedDate = new Date();
      }
      const scopedFilter = await mergeMaintenanceFilter(req, { _id: req.params.id });
      const mr = await MaintenanceRequest.findOneAndUpdate(scopedFilter, updates, {
        returnDocument: 'after',
        runValidators: true,
      });
      if (!mr) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
      res.json({ success: true, data: mr, message: 'تم تحديث طلب الصيانة بنجاح' });
    } catch (err) {
      safeError(res, err, 'Maintenance update error');
    }
  }
);

// DELETE /maintenance/:id — حذف طلب صيانة
router.delete(
  '/maintenance/:id',
  authorize(['admin', 'super_admin', 'manager']),
  async (req, res) => {
    try {
      const scopedFilter = await mergeMaintenanceFilter(req, { _id: req.params.id });
      const mr = await MaintenanceRequest.findOneAndDelete(scopedFilter);
      if (!mr) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
      res.json({ success: true, data: mr, message: 'تم حذف طلب الصيانة بنجاح' });
    } catch (err) {
      safeError(res, err, 'Maintenance delete error');
    }
  }
);

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD (لوحة المعلومات)
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const roomScope = branchFilter(req);
    const roomsAggregateScope = aggregateScope(roomScope);
    const bookingsScope = await mergeBookingFilter(req, {
      bookingDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      status: { $in: ['confirmed', 'pending'] },
    });
    const maintenanceScope = await mergeMaintenanceFilter(req, {
      status: { $in: ['new', 'assigned', 'in_progress'] },
    });

    const [
      totalRooms,
      availableRooms,
      occupiedRooms,
      underMaintenance,
      todayBookings,
      pendingMaintenance,
      roomsByType,
    ] = await Promise.all([
      Room.countDocuments(roomScope),
      Room.countDocuments({ ...roomScope, status: 'available' }),
      Room.countDocuments({ ...roomScope, status: 'occupied' }),
      Room.countDocuments({ ...roomScope, status: 'maintenance' }), // W1486: was 'under_maintenance' (not in Room enum → always 0)
      RoomBooking.countDocuments(bookingsScope),
      MaintenanceRequest.countDocuments(maintenanceScope),
      Room.aggregate([
        { $match: roomsAggregateScope },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
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
    safeError(res, err, 'Facility dashboard error');
  }
});

module.exports = router;
