const express = require('express');
const router = express.Router();
const SmartFamilyHoloPortService = require('../services/smartFamilyHoloPort.service');

// Mock Auth
const mockAuth = (req, res, next) => {
  next();
};

/**
 * @route POST /api/holo-port-smart/create-room
 * @desc Create a new family meeting space
 */
router.post('/create-room', mockAuth, async (req, res) => {
  try {
    const { patientId, familyMemberIds } = req.body;
    const config = await SmartFamilyHoloPortService.createFamilyRoom(patientId, familyMemberIds);
    res.json({ success: true, config });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * @route POST /api/holo-port-smart/join
 * @desc Join an existing room
 */
router.post('/join', mockAuth, async (req, res) => {
  try {
    const { roomId, userId, role } = req.body;
    const result = await SmartFamilyHoloPortService.joinRoom(roomId, userId, role);
    res.json({ success: true, result });
  } catch (e) {
    res.status(404).json({ success: false, message: e.message });
  }
});

/**
 * @route POST /api/holo-port-smart/activity
 * @desc Start a shared activity (Photo Album, Game, etc.)
 */
router.post('/activity', mockAuth, async (req, res) => {
  try {
    const { roomId, type } = req.body;
    const event = await SmartFamilyHoloPortService.startSharedActivity(roomId, type);
    res.json({ success: true, event });
  } catch (e) {
    res.status(404).json({ success: false, message: e.message });
  }
});

module.exports = router;

