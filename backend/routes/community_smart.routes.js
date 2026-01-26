const express = require('express');
const router = express.Router();
const SmartCommunityService = require('../services/smartCommunity.service');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/community-smart/match-group
 * @desc Get recommended support groups for a parent
 */
router.post('/match-group', async (req, res) => {
  try {
    const result = await SmartCommunityService.findSupportGroup(req.user.id, req.body.childProfile);
    res.json({ success: true, matches: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/community-smart/forum/post
 * @desc Post to community forum (Auto-Moderated)
 */
router.post('/forum/post', async (req, res) => {
  try {
    const moderation = SmartCommunityService.moderateContent(req.body.text);

    if (!moderation.approved) {
      return res.status(400).json({
        success: false,
        message: 'Post rejected by AI Safety Filter.',
        flags: moderation.flags,
      });
    }

    // Logic to save post to DB would go here...

    res.json({ success: true, message: 'Post published.', content: moderation.sanitizedText });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/community-smart/exchange/list
 * @desc List an item for donation/exchange
 */
router.post('/exchange/list', async (req, res) => {
  try {
    const result = SmartCommunityService.postEquipmentExchange(req.body);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

