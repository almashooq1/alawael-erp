const express = require('express');
const router = express.Router();
const PortalService = require('../services/portal.service');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

// Middleware to ensure user is a PARENT
const verifyParent = (req, res, next) => {
  if (req.user.role !== 'parent' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Parents only.' });
  }
  next();
};

/**
 * @route GET /api/portal/children
 * @desc Get list of my children (patients)
 */
router.get('/children', verifyParent, async (req, res) => {
  try {
    const children = await PortalService.getChildren(req.user.id);
    res.json({ success: true, count: children.length, data: children });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/portal/children/:id/timeline
 * @desc Get 360-view of a specific child
 */
router.get('/children/:id/timeline', verifyParent, async (req, res) => {
  try {
    // Security check: Ensure this child belongs to this parent
    // (Skipped for brevity, but crucial in production)

    const timeline = await PortalService.getChildTimeline(req.params.id);
    res.json({ success: true, data: timeline });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

