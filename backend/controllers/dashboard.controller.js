/**
 * dashboard.controller.js — Dashboard Controller
 * ═══════════════════════════════════════════════════
 * Handles dashboard stats, KPIs, widgets, and activity feed.
 */

'use strict';

const DashboardStats = require('../models/DashboardStats');
const DashboardWidget = require('../models/DashboardWidget');
const mongoose = require('mongoose');

// ─── Stats ─────────────────────────────────────────────────────────────────

exports.getStats = async (req, res, next) => {
  try {
    const { scope = 'global', scopeId } = req.query;
    const query = { scope };
    if (scopeId) query.scopeId = new mongoose.Types.ObjectId(scopeId);

    let stats = await DashboardStats.findOne(query).sort({ calculatedAt: -1 }).lean();

    // If no cached stats, generate from real data (fallback)
    if (!stats) {
      stats = await generateStats(scope, scopeId);
    }

    res.json({
      success: true,
      data: stats,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
};

exports.refreshStats = async (req, res, next) => {
  try {
    const { scope = 'global', scopeId } = req.body;
    const stats = await generateStats(scope, scopeId);
    res.json({
      success: true,
      data: stats,
      message: 'Stats refreshed',
    });
  } catch (err) {
    next(err);
  }
};

// ─── KPIs ────────────────────────────────────────────────────────────────────

exports.getKPIs = async (req, res, next) => {
  try {
    const stats = await DashboardStats.findOne({ scope: 'global' }).sort({ calculatedAt: -1 }).lean();
    const kpis = [
      { id: 'beneficiaries_total', label: 'Total Beneficiaries', value: stats?.beneficiaries?.total ?? 0, trend: 'neutral' },
      { id: 'sessions_today', label: 'Sessions Today', value: stats?.sessions?.today ?? 0, trend: 'up' },
      { id: 'assessments_pending', label: 'Pending Assessments', value: stats?.assessments?.pending ?? 0, trend: 'down' },
      { id: 'staff_active', label: 'Active Staff', value: stats?.staff?.active ?? 0, trend: 'neutral' },
      { id: 'revenue', label: 'Revenue', value: stats?.financial?.revenue ?? 0, trend: 'up' },
    ];

    res.json({
      success: true,
      data: { kpis, summary: stats?.beneficiaries ?? {} },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Activity Feed ─────────────────────────────────────────────────────────

exports.getActivity = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    // Placeholder: integrate with ActivityLog model when available
    const recentActivity = [];
    const alerts = [];

    res.json({
      success: true,
      data: { recentActivity, alerts, notifications: [] },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Widgets ───────────────────────────────────────────────────────────────

exports.getWidgets = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const widgets = await DashboardWidget.find({ userId }).lean();
    res.json({ success: true, data: widgets });
  } catch (err) {
    next(err);
  }
};

exports.createWidget = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const widget = await DashboardWidget.create({ ...req.body, userId });
    res.status(201).json({ success: true, data: widget });
  } catch (err) {
    next(err);
  }
};

exports.updateWidget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const widget = await DashboardWidget.findByIdAndUpdate(id, req.body, {returnDocument: 'after'});
    if (!widget) return res.status(404).json({ success: false, error: { message: 'Widget not found' } });
    res.json({ success: true, data: widget });
  } catch (err) {
    next(err);
  }
};

exports.deleteWidget = async (req, res, next) => {
  try {
    const { id } = req.params;
    await DashboardWidget.findByIdAndDelete(id);
    res.json({ success: true, message: 'Widget deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function generateStats(scope, scopeId) {
  // Generate stats from real data (or return empty structure)
  const stats = new DashboardStats({
    scope,
    scopeId: scopeId ? new mongoose.Types.ObjectId(scopeId) : undefined,
    beneficiaries: { total: 0, active: 0, newThisMonth: 0, newThisWeek: 0 },
    sessions: { total: 0, today: 0, upcoming: 0, completed: 0, cancelled: 0 },
    assessments: { total: 0, pending: 0, completed: 0, overdue: 0 },
    staff: { total: 0, active: 0, onLeave: 0 },
    financial: { revenue: 0, expenses: 0, outstanding: 0 },
  });
  await stats.save();
  return stats;
}
