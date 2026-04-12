'use strict';
/**
 * DddEmergencyResponse — Mongoose Models & Constants
 * Auto-extracted from services/dddEmergencyResponse.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const EMERGENCY_TYPES = [
  'fire',
  'medical_emergency',
  'natural_disaster',
  'active_threat',
  'hazmat_spill',
  'power_outage',
  'water_leak',
  'gas_leak',
  'bomb_threat',
  'pandemic',
  'structural_damage',
  'severe_weather',
];

const EMERGENCY_STATUSES = [
  'standby',
  'activated',
  'responding',
  'contained',
  'resolved',
  'all_clear',
  'deactivated',
  'post_incident_review',
  'archived',
  'drill_active',
];

const RESPONSE_LEVELS = [
  'level_1_minor',
  'level_2_moderate',
  'level_3_major',
  'level_4_severe',
  'level_5_catastrophic',
  'code_blue',
  'code_red',
  'code_silver',
  'code_orange',
  'code_green',
  'lockdown',
  'evacuation',
];

const TEAM_ROLES = [
  'incident_commander',
  'operations_chief',
  'planning_chief',
  'logistics_chief',
  'safety_officer',
  'public_information_officer',
  'medical_lead',
  'evacuation_coordinator',
  'communications_lead',
  'security_lead',
  'facilities_lead',
  'triage_officer',
];

const DRILL_TYPES = [
  'tabletop_exercise',
  'walkthrough',
  'full_scale_drill',
  'functional_exercise',
  'evacuation_drill',
  'fire_drill',
  'lockdown_drill',
  'medical_emergency_drill',
  'hazmat_drill',
  'communication_test',
];

const DRILL_STATUSES = [
  'planned',
  'scheduled',
  'in_progress',
  'completed',
  'evaluated',
  'cancelled',
  'postponed',
  'remediation',
];

/* ── Built-in emergency plans ───────────────────────────────────────────── */
const BUILTIN_EMERGENCY_PLANS = [
  {
    code: 'EPLAN-FIRE',
    name: 'Fire Emergency Plan',
    nameAr: 'خطة طوارئ الحريق',
    type: 'fire',
    responseLevel: 'code_red',
  },
  {
    code: 'EPLAN-MED',
    name: 'Medical Emergency Plan',
    nameAr: 'خطة الطوارئ الطبية',
    type: 'medical_emergency',
    responseLevel: 'code_blue',
  },
  {
    code: 'EPLAN-EVAC',
    name: 'Building Evacuation Plan',
    nameAr: 'خطة إخلاء المبنى',
    type: 'natural_disaster',
    responseLevel: 'evacuation',
  },
  {
    code: 'EPLAN-THREAT',
    name: 'Active Threat Plan',
    nameAr: 'خطة التهديد النشط',
    type: 'active_threat',
    responseLevel: 'code_silver',
  },
  {
    code: 'EPLAN-HAZMAT',
    name: 'Hazmat Response Plan',
    nameAr: 'خطة استجابة المواد الخطرة',
    type: 'hazmat_spill',
    responseLevel: 'code_orange',
  },
  {
    code: 'EPLAN-POWER',
    name: 'Power Failure Plan',
    nameAr: 'خطة انقطاع الكهرباء',
    type: 'power_outage',
    responseLevel: 'level_2_moderate',
  },
  {
    code: 'EPLAN-PANDEMIC',
    name: 'Pandemic Response Plan',
    nameAr: 'خطة استجابة الجائحة',
    type: 'pandemic',
    responseLevel: 'level_3_major',
  },
  {
    code: 'EPLAN-WEATHER',
    name: 'Severe Weather Plan',
    nameAr: 'خطة الطقس القاسي',
    type: 'severe_weather',
    responseLevel: 'level_2_moderate',
  },
  {
    code: 'EPLAN-BOMB',
    name: 'Bomb Threat Plan',
    nameAr: 'خطة تهديد القنابل',
    type: 'bomb_threat',
    responseLevel: 'lockdown',
  },
  {
    code: 'EPLAN-STRUCT',
    name: 'Structural Damage Plan',
    nameAr: 'خطة الأضرار الإنشائية',
    type: 'structural_damage',
    responseLevel: 'level_3_major',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Emergency Plan ────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const emergencyPlanSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    type: { type: String, enum: EMERGENCY_TYPES, required: true },
    responseLevel: { type: String, enum: RESPONSE_LEVELS },
    procedures: [{ step: Number, title: String, description: String, responsible: String }],
    evacuationRoutes: [{ routeId: String, description: String, assemblyPoint: String }],
    contactList: [{ name: String, role: String, phone: String, email: String }],
    resources: [{ name: String, quantity: Number, location: String }],
    version: { type: Number, default: 1 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    nextReviewDate: { type: Date },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDEmergencyPlan =
  mongoose.models.DDDEmergencyPlan || mongoose.model('DDDEmergencyPlan', emergencyPlanSchema);

/* ── Emergency Event ───────────────────────────────────────────────────── */
const emergencyEventSchema = new Schema(
  {
    eventCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: EMERGENCY_TYPES, required: true },
    status: { type: String, enum: EMERGENCY_STATUSES, default: 'activated' },
    responseLevel: { type: String, enum: RESPONSE_LEVELS },
    planId: { type: Schema.Types.ObjectId, ref: 'DDDEmergencyPlan' },
    activatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    activatedAt: { type: Date, default: Date.now },
    locationId: { type: Schema.Types.ObjectId },
    locationDescription: { type: String },
    affectedAreas: [{ type: String }],
    affectedPersons: { type: Number, default: 0 },
    timeline: [
      { timestamp: Date, action: String, performedBy: Schema.Types.ObjectId, notes: String },
    ],
    resolvedAt: { type: Date },
    deactivatedAt: { type: Date },
    deactivatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    afterActionReport: { type: String },
    lessonsLearned: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

emergencyEventSchema.index({ type: 1, status: 1 });
emergencyEventSchema.index({ activatedAt: -1 });

const DDDEmergencyEvent =
  mongoose.models.DDDEmergencyEvent || mongoose.model('DDDEmergencyEvent', emergencyEventSchema);

/* ── Response Team ─────────────────────────────────────────────────────── */
const responseTeamSchema = new Schema(
  {
    teamCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    emergencyTypes: [{ type: String, enum: EMERGENCY_TYPES }],
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: TEAM_ROLES },
        name: { type: String },
        phone: { type: String },
        isLeader: { type: Boolean, default: false },
        isBackup: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
    lastDrillDate: { type: Date },
    certifications: [{ name: String, expiresAt: Date }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDResponseTeam =
  mongoose.models.DDDResponseTeam || mongoose.model('DDDResponseTeam', responseTeamSchema);

/* ── Emergency Drill ───────────────────────────────────────────────────── */
const emergencyDrillSchema = new Schema(
  {
    drillCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: DRILL_TYPES, required: true },
    status: { type: String, enum: DRILL_STATUSES, default: 'planned' },
    planId: { type: Schema.Types.ObjectId, ref: 'DDDEmergencyPlan' },
    teamId: { type: Schema.Types.ObjectId, ref: 'DDDResponseTeam' },
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number },
    participants: { type: Number, default: 0 },
    scenario: { type: String },
    objectives: [{ type: String }],
    results: { type: String },
    score: { type: Number, min: 0, max: 100 },
    findings: [{ area: String, observation: String, recommendation: String }],
    conductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

emergencyDrillSchema.index({ type: 1, status: 1 });
emergencyDrillSchema.index({ scheduledDate: 1 });

const DDDEmergencyDrill =
  mongoose.models.DDDEmergencyDrill || mongoose.model('DDDEmergencyDrill', emergencyDrillSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  EMERGENCY_TYPES,
  EMERGENCY_STATUSES,
  RESPONSE_LEVELS,
  TEAM_ROLES,
  DRILL_TYPES,
  DRILL_STATUSES,
  BUILTIN_EMERGENCY_PLANS,
  DDDEmergencyPlan,
  DDDEmergencyEvent,
  DDDResponseTeam,
  DDDEmergencyDrill,
};
