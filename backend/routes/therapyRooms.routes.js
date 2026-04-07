/**
 * Therapy Room Routes — مسارات غرف العلاج
 * CRUD for therapy rooms (Individual, Group, Sensory, Gym)
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const TherapyRoom = require('../models/TherapyRoom');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

/** GET /api/therapy-rooms — list rooms */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { type, isMaintenance } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isMaintenance !== undefined) filter.isMaintenance = isMaintenance === 'true';

    const data = await TherapyRoom.find(filter).sort({ type: 1, name: 1 });
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('therapyRoom list error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/therapy-rooms/available — rooms not under maintenance */
router.get('/available', requireAuth, async (req, res) => {
  try {
    const { type, minCapacity } = req.query;
    const filter = { isMaintenance: false };
    if (type) filter.type = type;
    if (minCapacity) filter.capacity = { $gte: Number(minCapacity) };

    const data = await TherapyRoom.find(filter).sort({ type: 1, name: 1 });
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('therapyRoom available error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/therapy-rooms/:id — get single room */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const room = await TherapyRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) {
    logger.error('therapyRoom get error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/therapy-rooms — create room (admin) */
router.post('/', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const room = await TherapyRoom.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    logger.error('therapyRoom create error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/therapy-rooms/:id — update room */
router.put('/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const room = await TherapyRoom.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) {
    logger.error('therapyRoom update error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** DELETE /api/therapy-rooms/:id — delete room (admin) */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const room = await TherapyRoom.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    logger.error('therapyRoom delete error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** PATCH /api/therapy-rooms/:id/maintenance — toggle maintenance */
router.patch(
  '/:id/maintenance',
  requireAuth,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const room = await TherapyRoom.findById(req.params.id);
      if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
      room.isMaintenance = !room.isMaintenance;
      await room.save();
      res.json({ success: true, data: room });
    } catch (err) {
      logger.error('therapyRoom maintenance toggle error:', err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

module.exports = router;
