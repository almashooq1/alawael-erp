/**
 * DashboardStats.js — Dashboard Statistics Model
 * ═════════════════════════════════════════════════
 * Stores cached dashboard KPIs and statistics.
 */

'use strict';

const mongoose = require('mongoose');

const dashboardStatsSchema = new mongoose.Schema(
  {
    // Scope
    scope: {
      type: String,
      enum: ['global', 'branch', 'user'],
      default: 'global',
    },
    scopeId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    // Beneficiary metrics
    beneficiaries: {
      total: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      newThisMonth: { type: Number, default: 0 },
      newThisWeek: { type: Number, default: 0 },
      byGender: {
        male: { type: Number, default: 0 },
        female: { type: Number, default: 0 },
      },
      byAgeGroup: {
        children: { type: Number, default: 0 },
        youth: { type: Number, default: 0 },
        adults: { type: Number, default: 0 },
        seniors: { type: Number, default: 0 },
      },
    },

    // Session metrics
    sessions: {
      total: { type: Number, default: 0 },
      today: { type: Number, default: 0 },
      upcoming: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      byType: { type: Map, of: Number, default: new Map() },
    },

    // Assessment metrics
    assessments: {
      total: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
    },

    // Staff metrics
    staff: {
      total: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      onLeave: { type: Number, default: 0 },
      byDepartment: { type: Map, of: Number, default: new Map() },
    },

    // Financial metrics
    financial: {
      revenue: { type: Number, default: 0 },
      expenses: { type: Number, default: 0 },
      outstanding: { type: Number, default: 0 },
    },

    // Timestamp
    calculatedAt: {
      type: Date,
      default: Date.now,
    },

    // TTL index for auto-expiry (refresh every 15 min)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

// Compound index for fast lookups
dashboardStatsSchema.index({ scope: 1, scopeId: 1, calculatedAt: -1 });

module.exports = mongoose.model('DashboardStats', dashboardStatsSchema);
