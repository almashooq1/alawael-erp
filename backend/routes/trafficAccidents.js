'use strict';
/**
 * Traffic Accidents Routes — حوادث المرور (عام)
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const TrafficAccident = require('../models/Traffic/TrafficAccident');
    const { page = 1, limit = 20, status, severity, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (from || to) {
      filter.accidentDate = {};
      if (from) filter.accidentDate.$gte = new Date(from);
      if (to) filter.accidentDate.$lte = new Date(to);
    }
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      TrafficAccident.find(filter).sort({ accidentDate: -1 }).skip(skip).limit(+limit).lean(),
      TrafficAccident.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'trafficAccidents');
  }
});

router.post('/', async (req, res) => {
  try {
    const TrafficAccident = require('../models/Traffic/TrafficAccident');
    const accident = await TrafficAccident.create({
      ...req.body,
      status: 'open',
      reportedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: accident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const TrafficAccident = require('../models/Traffic/TrafficAccident');
    const accident = await TrafficAccident.findById(req.params.id).lean();
    if (!accident)
      return res.status(404).json({ success: false, message: 'Accident record not found' });
    res.json({ success: true, data: accident });
  } catch (err) {
    return safeError(res, err, 'trafficAccidents');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const TrafficAccident = require('../models/Traffic/TrafficAccident');
    const accident = await TrafficAccident.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { returnDocument: 'after', runValidators: true }
    );
    if (!accident)
      return res.status(404).json({ success: false, message: 'Accident record not found' });
    res.json({ success: true, data: accident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const TrafficAccident = require('../models/Traffic/TrafficAccident');
    await TrafficAccident.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Accident record deleted' });
  } catch (err) {
    return safeError(res, err, 'trafficAccidents');
  }
});

router.patch('/:id/close', authorize('admin', 'manager'), async (req, res) => {
  try {
    const TrafficAccident = require('../models/Traffic/TrafficAccident');
    const { resolution, totalCost, liabilityNotes } = req.body;
    const accident = await TrafficAccident.findByIdAndUpdate(
      req.params.id,
      {
        status: 'closed',
        resolution,
        totalCost,
        liabilityNotes,
        closedAt: new Date(),
        closedBy: req.user._id,
      },
      { returnDocument: 'after' }
    );
    if (!accident)
      return res.status(404).json({ success: false, message: 'Accident record not found' });
    res.json({ success: true, data: accident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/overview', async (req, res) => {
  try {
    const TrafficAccident = require('../models/Traffic/TrafficAccident');
    // W1481 fix: previously `open` counted status:'open' (NOT in the enum
    // [pending,investigating,resolved,disputed] → always 0) and `bySeverity`
    // grouped by a non-existent top-level `severity` (severity only exists nested
    // in vehicles[].damage + injuries[]) → meaningless [{_id:null,...}]. Now `open`
    // = non-terminal statuses, and we group by the real top-level `status` field.
    const [total, open, byStatus, byMonth] = await Promise.all([
      TrafficAccident.countDocuments({}),
      TrafficAccident.countDocuments({ status: { $in: ['pending', 'investigating'] } }),
      TrafficAccident.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      TrafficAccident.aggregate([
        {
          $group: {
            _id: { year: { $year: '$accidentDate' }, month: { $month: '$accidentDate' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
    ]);
    res.json({ success: true, data: { total, open, byStatus, byMonth } });
  } catch (err) {
    return safeError(res, err, 'trafficAccidents');
  }
});

module.exports = router;
