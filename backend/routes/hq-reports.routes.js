/**
 * HQ Reports — executive-only aggregates.
 *
 * Lightweight reports used by the HQ portal dashboard widgets. The generic
 * reports.js file is backed by a ReportService that returns high-level
 * aggregates; this file provides time-series shapes the dashboard charts need.
 *
 * Mounted at /api/v1/hq-reports (see routes/_registry.js).
 * Auth: HQ portal users only (admin/super_admin/executive roles).
 */

'use strict';

const express = require('express');
const router = express.Router();

let _authenticate, _Appointment;
function authenticate(req, res, next) {
  if (!_authenticate) _authenticate = require('../middleware/auth').authenticate;
  return _authenticate(req, res, next);
}
function Appointment() {
  if (!_Appointment) _Appointment = require('../models/Appointment');
  return _Appointment;
}

/**
 * GET /sessions/daily
 *
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&branchId=ObjectId
 * Response: [{ date: 'YYYY-MM-DD', scheduled, completed, cancelled, noShow, total }]
 *
 * Defaults: from = today - 30d, to = today.
 * branchId is optional; omitting returns consolidated across all branches.
 */
router.get('/sessions/daily', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    const from = req.query.from ? new Date(String(req.query.from)) : defaultFrom;
    const to = req.query.to ? new Date(String(req.query.to)) : now;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res
        .status(400)
        .json({ error: 'InvalidQuery', message: 'from/to must be valid ISO dates' });
    }
    // Normalise to inclusive full-day range.
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);

    const match = { date: { $gte: start, $lt: end } };
    if (req.query.branchId) {
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(String(req.query.branchId))) {
        return res
          .status(400)
          .json({ error: 'InvalidQuery', message: 'branchId is not a valid ObjectId' });
      }
      // Appointment doesn't carry branchId directly; join via beneficiary.
      // Deferring the branch filter to the aggregation pipeline below.
      match.__branchId = new mongoose.Types.ObjectId(String(req.query.branchId));
    }

    const pipeline = [];
    if (match.__branchId) {
      pipeline.push(
        {
          $lookup: {
            from: 'beneficiaries',
            localField: 'beneficiary',
            foreignField: '_id',
            as: 'benef',
            pipeline: [{ $project: { branchId: 1 } }],
          },
        },
        { $match: { 'benef.branchId': match.__branchId, date: match.date } }
      );
      delete match.__branchId;
    } else {
      pipeline.push({ $match: match });
    }

    pipeline.push(
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          scheduled: {
            $sum: { $cond: [{ $in: ['$status', ['PENDING', 'CONFIRMED', 'CHECKED_IN']] }, 1, 0] },
          },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ['$status', 'NO_SHOW'] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }
    );

    const rows = await Appointment().aggregate(pipeline);

    // Fill missing days with zeros so the chart x-axis is continuous.
    const byKey = new Map(rows.map(r => [r._id, r]));
    const out = [];
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const r = byKey.get(key) || {};
      out.push({
        date: key,
        scheduled: r.scheduled || 0,
        inProgress: r.inProgress || 0,
        completed: r.completed || 0,
        cancelled: r.cancelled || 0,
        noShow: r.noShow || 0,
        total: r.total || 0,
      });
    }

    return res.json(out);
  } catch (err) {
    return res.status(500).json({
      error: 'InternalError',
      message: err instanceof Error ? err.message : 'failed to aggregate daily sessions',
    });
  }
});

module.exports = router;
