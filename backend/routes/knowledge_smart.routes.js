const express = require('express');
const router = express.Router();
const SmartKnowledgeService = require('../services/smartKnowledge.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/knowledge-smart/search
 * @desc Ask the "Organizational Brain" for clinical advice
 */
router.get('/search', authorizeRole(['THERAPIST', 'MEDICAL_DIRECTOR']), async (req, res) => {
  try {
    const result = await SmartKnowledgeService.searchClinicalWisdom(req.query.q);
    res.json({ success: true, wisdom: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/knowledge-smart/index-case
 * @desc Feed a success story into the brain
 */
router.post('/index-case', authorizeRole(['ADMIN', 'MEDICAL_DIRECTOR']), async (req, res) => {
  try {
    const result = await SmartKnowledgeService.indexSuccessStory(req.body.caseId, req.body.summary);
    res.json({ success: true, indexing: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

