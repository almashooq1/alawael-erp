const express = require('express');
const router = express.Router();
const SmartIEPService = require('../services/smartIEP.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/iep-smart/schedule
 * @desc Organize an IEP meeting
 */
router.post('/schedule', authorizeRole(['ADMIN', 'CASE_MANAGER']), async (req, res) => {
  try {
    const result = await SmartIEPService.scheduleMeeting(req.body.studentId, req.body.date, req.body.method);
    res.json({ success: true, meeting: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/iep-smart/draft-goals
 * @desc AI suggests goals based on meeting notes
 */
router.post('/draft-goals', authorizeRole(['ADMIN', 'CASE_MANAGER', 'THERAPIST']), async (req, res) => {
  try {
    const result = await SmartIEPService.draftIEPGoals(req.body.meetingId, req.body.notes);
    res.json({ success: true, draft: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/iep-smart/sign
 * @desc Digital signature for parent/staff
 */
router.post('/sign', async (req, res) => {
  try {
    const result = await SmartIEPService.signOffPlan(req.body.meetingId, req.user.id, req.body.signature);
    res.json({ success: true, signature: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

