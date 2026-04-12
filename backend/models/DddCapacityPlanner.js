'use strict';
/**
 * DddCapacityPlanner Model
 * Auto-extracted from services/dddCapacityPlanner.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

const PLANNING_HORIZONS = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];

const DEMAND_CATEGORIES = [
  'speech_therapy',
  'occupational_therapy',
  'physical_therapy',
  'behavioral_therapy',
  'psychology',
  'group_therapy',
  'telerehab',
  'assessment',
  'family_session',
  'consultation',
];

const BOTTLENECK_TYPES = [
  'resource_shortage',
  'room_unavailable',
  'skill_gap',
  'equipment_limit',
  'scheduling_conflict',
  'high_demand',
  'staff_overload',
  'waitlist_overflow',
];

const FORECAST_METHODS = [
  'moving_average',
  'weighted_average',
  'linear_regression',
  'seasonal_decomposition',
  'exponential_smoothing',
];

const BUILTIN_CAPACITY_RULES = [
  {
    code: 'CAP-MAX-DAILY-SESSIONS',
    name: 'Max Daily Sessions per Therapist',
    nameAr: 'الحد الأقصى للجلسات اليومية',
    threshold: 8,
    unit: 'sessions',
  },
  {
    code: 'CAP-MIN-BREAK',
    name: 'Minimum Break Between Sessions',
    nameAr: 'الحد الأدنى للاستراحة بين الجلسات',
    threshold: 15,
    unit: 'minutes',
  },
  {
    code: 'CAP-ROOM-TURNOVER',
    name: 'Room Turnover Time',
    nameAr: 'وقت تجهيز الغرفة',
    threshold: 10,
    unit: 'minutes',
  },
  {
    code: 'CAP-UTILIZATION-TARGET',
    name: 'Target Utilization Rate',
    nameAr: 'معدل الاستخدام المستهدف',
    threshold: 80,
    unit: 'percent',
  },
  {
    code: 'CAP-WAITLIST-MAX',
    name: 'Max Waitlist Size per Service',
    nameAr: 'الحد الأقصى لقائمة الانتظار',
    threshold: 50,
    unit: 'beneficiaries',
  },
  {
    code: 'CAP-OVERBOOKING-LIMIT',
    name: 'Overbooking Limit',
    nameAr: 'حد الحجز الزائد',
    threshold: 10,
    unit: 'percent',
  },
  {
    code: 'CAP-ADVANCE-BOOKING',
    name: 'Max Advance Booking Window',
    nameAr: 'نافذة الحجز المسبق',
    threshold: 90,
    unit: 'days',
  },
  {
    code: 'CAP-CANCELLATION-BUFFER',
    name: 'Cancellation Buffer',
    nameAr: 'فترة الإلغاء',
    threshold: 24,
    unit: 'hours',
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Capacity Plan Schema ── */

const capacityPlanSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    horizon: { type: String, enum: PLANNING_HORIZONS, required: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    department: String,
    serviceType: { type: String, enum: DEMAND_CATEGORIES },
    targets: {
      totalSlots: Number,
      targetUtilization: { type: Number, default: 80 },
      maxWaitDays: { type: Number, default: 14 },
      minStaffCount: Number,
    },
    currentMetrics: {
      actualUtilization: Number,
      averageWaitDays: Number,
      activeStaff: Number,
      totalBookings: Number,
      cancellationRate: Number,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'archived'],
      default: 'draft',
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDCapacityPlan =
  mongoose.models.DDDCapacityPlan || mongoose.model('DDDCapacityPlan', capacityPlanSchema);

/* ── Demand Forecast Schema ── */
const demandForecastSchema = new mongoose.Schema(
  {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDCapacityPlan', index: true },
    serviceType: { type: String, enum: DEMAND_CATEGORIES, required: true, index: true },
    period: { type: String, required: true }, // e.g., "2025-W03", "2025-01"
    method: { type: String, enum: FORECAST_METHODS, default: 'moving_average' },
    predictedDemand: { type: Number, required: true },
    actualDemand: Number,
    confidence: { type: Number, min: 0, max: 100 },
    variance: Number, // actual - predicted
    factors: [
      {
        name: String,
        impact: Number, // -100 to 100
        description: String,
      },
    ],
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

demandForecastSchema.index({ serviceType: 1, period: 1 });

const DDDDemandForecast =
  mongoose.models.DDDDemandForecast || mongoose.model('DDDDemandForecast', demandForecastSchema);

/* ── Bottleneck Schema ── */
const bottleneckSchema = new mongoose.Schema(
  {
    type: { type: String, enum: BOTTLENECK_TYPES, required: true, index: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    department: String,
    serviceType: { type: String, enum: DEMAND_CATEGORIES },
    resourceType: String,
    description: { type: String, required: true },
    descriptionAr: String,
    impact: {
      affectedBeneficiaries: Number,
      delayDays: Number,
      revenueImpact: Number,
    },
    recommendation: String,
    recommendationAr: String,
    detectedAt: { type: Date, default: Date.now, index: true },
    resolvedAt: Date,
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'in_progress', 'resolved'],
      default: 'open',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDBottleneck = mongoose.models.DDDBottleneck || mongoose.model('DDDBottleneck', bottleneckSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE — CapacityPlanner
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  PLANNING_HORIZONS,
  DEMAND_CATEGORIES,
  BOTTLENECK_TYPES,
  FORECAST_METHODS,
  BUILTIN_CAPACITY_RULES,
};
