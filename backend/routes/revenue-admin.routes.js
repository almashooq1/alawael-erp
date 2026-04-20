/**
 * revenue-admin.routes.js — Revenue & AR aging analytics.
 *
 * Mount at /api/admin/revenue.
 *
 * Endpoints:
 *   GET /overview      summarize + aging buckets + alarm flag
 *   GET /aging         aging buckets breakdown (for the ops chart)
 *   GET /top-debtors   beneficiaries with highest outstanding
 *   GET /trend         monthly issued/paid/collectionRate series
 *   GET /export.csv    outstanding-invoice dump (admin only)
 *
 * Backed by revenueService (pure math); this file only does IO.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const Invoice = require('../models/Invoice');
const rev = require('../services/revenueService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'finance', 'accountant'];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'finance'];

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Invoice.find({}).lean();
    const summary = rev.summarize(all);
    const aging = rev.agingBuckets(all);
    const alarm = rev.detectOverdueAlarm(aging);
    res.json({
      success: true,
      summary,
      aging,
      overdueAlarm: alarm,
      thresholds: {
        overdueAlarmPct: rev.THRESHOLDS.overdueAlarmPct,
        overdueAlarmMinAmount: rev.THRESHOLDS.overdueAlarmMinAmount,
      },
    });
  } catch (err) {
    return safeError(res, err, 'revenue.overview');
  }
});

router.get('/aging', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Invoice.find({
      status: { $in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
    }).lean();
    res.json({ success: true, aging: rev.agingBuckets(all) });
  } catch (err) {
    return safeError(res, err, 'revenue.aging');
  }
});

router.get('/top-debtors', requireRole(READ_ROLES), async (req, res) => {
  try {
    const n = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const open = await Invoice.find({ status: { $in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } })
      .select('beneficiary totalAmount issueDate status')
      .populate('beneficiary', 'firstName_ar lastName_ar firstName_en lastName_en phone')
      .lean();
    const debtors = rev.topDebtors(open, n);
    // Re-hydrate beneficiary display names where available.
    const byId = new Map();
    for (const inv of open) {
      if (inv.beneficiary && typeof inv.beneficiary === 'object' && inv.beneficiary._id) {
        byId.set(String(inv.beneficiary._id), inv.beneficiary);
      }
    }
    const enriched = debtors.map(d => {
      const b = byId.get(d.beneficiary);
      return {
        ...d,
        name: b
          ? [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ') ||
            [b.firstName_en, b.lastName_en].filter(Boolean).join(' ') ||
            '—'
          : '—',
        phone: b?.phone || null,
      };
    });
    res.json({ success: true, items: enriched });
  } catch (err) {
    return safeError(res, err, 'revenue.topDebtors');
  }
});

router.get('/trend', requireRole(READ_ROLES), async (req, res) => {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 12));
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const all = await Invoice.find({ issueDate: { $gte: cutoff } })
      .select('issueDate status totalAmount')
      .lean();
    res.json({ success: true, months: rev.revenueByMonth(all) });
  } catch (err) {
    return safeError(res, err, 'revenue.trend');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const filter = { status: { $in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } };
    const total = await Invoice.countDocuments(filter);
    const items = await Invoice.find(filter)
      .sort({ issueDate: 1 })
      .limit(10_000)
      .populate('beneficiary', 'firstName_ar lastName_ar phone')
      .lean();
    res.set('X-Total-Count', String(total));
    if (total > 10_000) {
      res.set('X-Truncated', 'true');
      res.set('X-Truncated-At', '10000');
    }
    const esc = v =>
      v == null
        ? ''
        : /[",\n\r]/.test(String(v))
          ? '"' + String(v).replace(/"/g, '""') + '"'
          : String(v);
    const header = [
      'invoiceNumber',
      'issueDate',
      'dueDate',
      'status',
      'totalAmount',
      'beneficiaryName',
      'beneficiaryPhone',
    ];
    const rows = items.map(inv => {
      const b = inv.beneficiary;
      const name = b ? [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ') || '' : '';
      return [
        inv.invoiceNumber || '',
        inv.issueDate?.toISOString()?.slice(0, 10) || '',
        inv.dueDate?.toISOString()?.slice(0, 10) || '',
        inv.status || '',
        inv.totalAmount || 0,
        name,
        b?.phone || '',
      ]
        .map(esc)
        .join(',');
    });
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="revenue-ar-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'revenue.export');
  }
});

module.exports = router;
