'use strict';
/**
 * Search Routes — البحث الموحد في النظام
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/search?q=...&modules=beneficiaries,employees,...&limit=10
 * Global search across specified modules
 */
router.get('/', async (req, res) => {
  try {
    const { q, modules, limit = 10 } = req.query;
    if (!q || q.trim().length < 2) {
      return res
        .status(400)
        .json({ success: false, message: 'Query must be at least 2 characters' });
    }
    const lim = Math.min(+limit || 10, 50);
    const targetModules = modules
      ? modules.split(',').map(s => s.trim())
      : ['beneficiaries', 'employees'];
    const results = {};

    for (const mod of targetModules) {
      try {
        if (mod === 'beneficiaries') {
          const Beneficiary = require('../models/Beneficiary');
          results[mod] = await Beneficiary.find(
            { $text: { $search: q } },
            { score: { $meta: 'textScore' } }
          )
            .sort({ score: { $meta: 'textScore' } })
            .limit(lim)
            .lean();
        } else if (mod === 'employees') {
          const Employee = require('../models/HR/Employee');
          results[mod] = await Employee.find({
            $or: [
              { firstName: new RegExp(q, 'i') },
              { lastName: new RegExp(q, 'i') },
              { employeeCode: new RegExp(q, 'i') },
            ],
          })
            .limit(lim)
            .lean();
        } else if (mod === 'documents') {
          const Document = require('../models/Document');
          results[mod] = await Document.find(
            { $text: { $search: q } },
            { score: { $meta: 'textScore' } }
          )
            .sort({ score: { $meta: 'textScore' } })
            .limit(lim)
            .lean();
        } else {
          results[mod] = [];
        }
      } catch (_err) {
        results[mod] = [];
      }
    }

    const totalHits = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    res.json({ success: true, data: results, meta: { query: q, totalHits } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/search/suggest?q=...&module=beneficiaries
 * Quick autocomplete suggestions
 */
router.get('/suggest', async (req, res) => {
  try {
    const { q, module: mod = 'beneficiaries' } = req.query;
    if (!q || q.trim().length < 2) return res.json({ success: true, data: [] });
    let suggestions = [];
    if (mod === 'beneficiaries') {
      const Beneficiary = require('../models/Beneficiary');
      suggestions = await Beneficiary.find({
        $or: [{ firstName: new RegExp(q, 'i') }, { lastName: new RegExp(q, 'i') }],
      })
        .select('firstName lastName beneficiaryCode')
        .limit(10)
        .lean();
    } else if (mod === 'employees') {
      const Employee = require('../models/HR/Employee');
      suggestions = await Employee.find({
        $or: [{ firstName: new RegExp(q, 'i') }, { lastName: new RegExp(q, 'i') }],
      })
        .select('firstName lastName employeeCode')
        .limit(10)
        .lean();
    }
    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
