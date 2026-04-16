/**
 * SoD REST routes — read-only registry surface.
 *
 *   app.use('/api/sod', authenticateToken, buildRouter());
 */

'use strict';

const express = require('express');
const { allRules, rulesInvolving, assess } = require('./index');

function buildRouter() {
  const router = express.Router();

  router.get('/rules', (req, res) => {
    const { action } = req.query || {};
    const rules = action ? rulesInvolving(action) : allRules();
    res.json({ count: rules.length, rules });
  });

  // POST /api/sod/assess — preview if a planned action would conflict
  router.post('/assess', (req, res) => {
    const { action, priorActions = [] } = req.body || {};
    if (!action) return res.status(400).json({ error: 'action_required' });
    const result = assess(action, priorActions);
    res.json(result);
  });

  return router;
}

module.exports = { buildRouter };
