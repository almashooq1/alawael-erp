const express = require('express');
const router = express.Router();
const SmartKnowledgeGraphService = require('../services/smartKnowledgeGraph.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/knowledge-smart/explore/:type/:id
 * @desc Get the visual graph data for a specific entity
 */
router.get('/explore/:type/:id', authorizeRole(['ADMIN', 'CLINICAL_DIRECTOR', 'RESEARCHER']), async (req, res) => {
  try {
    const result = await SmartKnowledgeGraphService.buildEntityGraph(req.params.id, req.params.type);
    res.json({ success: true, graph: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/knowledge-smart/connect
 * @desc Find hidden paths between two entities
 */
router.post('/connect', authorizeRole(['ADMIN', 'SECURITY']), async (req, res) => {
  try {
    const result = await SmartKnowledgeGraphService.discoverConnections(req.body.entityA, req.body.entityB);
    res.json({ success: true, connection: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

