const express = require('express');
const router = express.Router();
const SmartReferralService = require('../services/smartReferral.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');
const multer = require('multer');

const upload = multer({ dest: 'uploads/referrals/' });

router.use(authenticateToken);

/**
 * @route POST /api/referral-smart/analyze
 * @desc Upload a medical referral report and get AI extracted data
 */
router.post('/analyze', authorizeRole(['ADMIN', 'receptionist']), upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const analysis = await SmartReferralService.processReferralDocument(req.file);

    res.json({
      success: true,
      message: 'Document processed successfully',
      data: analysis,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
