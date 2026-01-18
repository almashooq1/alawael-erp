const express = require('express');
const router = express.Router();
const SmartSchedulingService = require('../services/smartScheduling.service');
const Waitlist = require('../models/Waitlist');
const TherapySession = require('../models/TherapySession');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/scheduling-smart/slots/available
 * @desc Find next empty slots for a department
 * @query department (e.g., SPEECH)
 */
router.get('/slots/available', async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) return res.status(400).json({ message: 'Department required' });

    const slots = await SmartSchedulingService.findNextAvailableSlots(department);
    res.json({ success: true, count: slots.length, data: slots });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/scheduling-smart/waitlist
 * @desc Add child to waitlist
 */
router.post('/waitlist', async (req, res) => {
  try {
    const entry = new Waitlist(req.body);
    await entry.save();
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route POST /api/scheduling-smart/cancel-session
 * @desc Smart Cancellation that triggers Gap Filling logic
 */
router.post('/cancel-session', async (req, res) => {
  try {
    const { sessionId, reason } = req.body;

    // 1. Perform cancellation
    const session = await TherapySession.findByIdAndUpdate(sessionId, { status: 'CANCELLED_BY_PATIENT', notes: reason }, { new: true });

    if (!session) return res.status(404).json({ message: 'Session not found' });

    // 2. Trigger Smart Logic
    const gapResult = await SmartSchedulingService.processCancellation(session._id, req.user.id);

    res.json({
      success: true,
      message: 'Session cancelled.',
      gapFill: gapResult,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
