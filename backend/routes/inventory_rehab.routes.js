const express = require('express');
const router = express.Router();
const RehabEquipment = require('../models/RehabEquipment');
const TherapyRoom = require('../models/TherapyRoom');
const { authenticateToken } = require('../middleware/auth.middleware');
const AuditService = require('../services/audit.service');

router.use(authenticateToken);

// ============ EQUIPMENT & INVENTORY ============

router.get('/equipment', async (req, res) => {
  try {
    const items = await RehabEquipment.find();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/equipment', async (req, res) => {
  try {
    const item = new RehabEquipment(req.body);
    await item.save();
    await AuditService.log(req, 'ADD_EQUIPMENT', 'INVENTORY', { id: item.id, name: item.name });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update Stock / Condition
router.put('/equipment/:id', async (req, res) => {
  try {
    const item = await RehabEquipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ ROOMS ============

router.get('/rooms', async (req, res) => {
  try {
    const rooms = await TherapyRoom.find();
    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/rooms', async (req, res) => {
  try {
    const room = new TherapyRoom(req.body);
    await room.save();
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
