const express = require('express');
const router = express.Router();
const SmartEventManagerService = require('../services/smartEventManager.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/events-smart/create
 * @desc Publish new workshop or training
 */
router.post('/create', authorizeRole(['ADMIN', 'MARKETING', 'HR']), async (req, res) => {
  try {
    const result = await SmartEventManagerService.createEvent(req.body);
    res.json({ success: true, event: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/events-smart/register
 * @desc Book a seat
 */
router.post('/register', async (req, res) => {
  try {
    const result = await SmartEventManagerService.registerAttendee(req.body.eventId, req.user.id);
    res.json({ success: true, ticket: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/events-smart/certificate
 * @desc Download certificate after attending
 */
router.get('/certificate', async (req, res) => {
  try {
    const result = await SmartEventManagerService.generateCertificate(req.query.eventId, req.user.id);
    res.json({ success: true, certificate: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

