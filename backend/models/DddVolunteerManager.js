'use strict';
/**
 * DddVolunteerManager — Mongoose Models & Constants
 * Auto-extracted from services/dddVolunteerManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const VOLUNTEER_STATUSES = [
  'applicant',
  'screening',
  'approved',
  'active',
  'on_leave',
  'inactive',
  'suspended',
  'alumni',
  'pending_training',
  'retired',
];

const VOLUNTEER_CATEGORIES = [
  'clinical_support',
  'administrative',
  'therapy_assistant',
  'transport_escort',
  'event_support',
  'fundraising',
  'community_outreach',
  'mentoring',
  'translation',
  'recreational',
  'educational',
  'technical',
];

const SHIFT_STATUSES = [
  'scheduled',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
  'pending_approval',
  'swapped',
];

const SKILL_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
  'certified',
  'master',
  'in_training',
  'refresher_needed',
  'expired',
  'pending_verification',
];

const RECOGNITION_TYPES = [
  'hours_milestone',
  'excellence_award',
  'innovation_award',
  'service_anniversary',
  'leadership_award',
  'community_impact',
  'patient_appreciation',
  'team_player',
  'mentor_award',
  'outstanding_commitment',
  'special_recognition',
  'certificate',
];

const AVAILABILITY_PATTERNS = [
  'weekday_morning',
  'weekday_afternoon',
  'weekday_evening',
  'weekend_morning',
  'weekend_afternoon',
  'weekend_evening',
  'flexible',
  'on_call',
  'seasonal',
  'event_based',
];

/* ── Built-in volunteer roles ───────────────────────────────────────────── */
const BUILTIN_VOLUNTEER_ROLES = [
  {
    code: 'VROL-THER',
    name: 'Therapy Assistant',
    nameAr: 'مساعد علاج',
    category: 'clinical_support',
    minHoursWeek: 4,
  },
  {
    code: 'VROL-ADMIN',
    name: 'Administrative Helper',
    nameAr: 'مساعد إداري',
    category: 'administrative',
    minHoursWeek: 3,
  },
  {
    code: 'VROL-ESCORT',
    name: 'Patient Escort',
    nameAr: 'مرافق مريض',
    category: 'transport_escort',
    minHoursWeek: 4,
  },
  {
    code: 'VROL-EVENT',
    name: 'Event Coordinator',
    nameAr: 'منسق فعاليات',
    category: 'event_support',
    minHoursWeek: 2,
  },
  {
    code: 'VROL-FUND',
    name: 'Fundraiser',
    nameAr: 'جامع تبرعات',
    category: 'fundraising',
    minHoursWeek: 2,
  },
  {
    code: 'VROL-OUTREACH',
    name: 'Community Ambassador',
    nameAr: 'سفير مجتمع',
    category: 'community_outreach',
    minHoursWeek: 3,
  },
  {
    code: 'VROL-MENTOR',
    name: 'Peer Mentor',
    nameAr: 'مرشد أقران',
    category: 'mentoring',
    minHoursWeek: 2,
  },
  {
    code: 'VROL-TRANS',
    name: 'Translator',
    nameAr: 'مترجم',
    category: 'translation',
    minHoursWeek: 2,
  },
  {
    code: 'VROL-REC',
    name: 'Recreation Leader',
    nameAr: 'قائد ترفيه',
    category: 'recreational',
    minHoursWeek: 4,
  },
  {
    code: 'VROL-TECH',
    name: 'Tech Support',
    nameAr: 'دعم تقني',
    category: 'technical',
    minHoursWeek: 3,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Volunteer ─────────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const volunteerSchema = new Schema(
  {
    volunteerCode: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    nameAr: { type: String },
    email: { type: String },
    phone: { type: String },
    status: { type: String, enum: VOLUNTEER_STATUSES, default: 'applicant' },
    category: { type: String, enum: VOLUNTEER_CATEGORIES },
    dateOfBirth: { type: Date },
    address: { type: String },
    availability: [{ type: String, enum: AVAILABILITY_PATTERNS }],
    startDate: { type: Date },
    totalHours: { type: Number, default: 0 },
    backgroundCheckDate: { type: Date },
    backgroundCheckStatus: { type: String, enum: ['pending', 'cleared', 'flagged', 'expired'] },
    emergencyContact: { name: String, phone: String, relation: String },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

volunteerSchema.index({ status: 1, category: 1 });

const DDDVolunteer =
  mongoose.models.DDDVolunteer || mongoose.model('DDDVolunteer', volunteerSchema);

/* ── Volunteer Shift ───────────────────────────────────────────────────── */
const volunteerShiftSchema = new Schema(
  {
    shiftCode: { type: String, required: true, unique: true },
    volunteerId: { type: Schema.Types.ObjectId, ref: 'DDDVolunteer', required: true },
    title: { type: String, required: true },
    status: { type: String, enum: SHIFT_STATUSES, default: 'scheduled' },
    department: { type: String },
    location: { type: String },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    actualStartTime: { type: Date },
    actualEndTime: { type: Date },
    hoursWorked: { type: Number, default: 0 },
    supervisor: { type: Schema.Types.ObjectId, ref: 'User' },
    tasks: [{ task: String, completed: Boolean, notes: String }],
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

volunteerShiftSchema.index({ volunteerId: 1, scheduledDate: -1 });
volunteerShiftSchema.index({ status: 1, scheduledDate: 1 });

const DDDVolunteerShift =
  mongoose.models.DDDVolunteerShift || mongoose.model('DDDVolunteerShift', volunteerShiftSchema);

/* ── Volunteer Skill ───────────────────────────────────────────────────── */
const volunteerSkillSchema = new Schema(
  {
    volunteerId: { type: Schema.Types.ObjectId, ref: 'DDDVolunteer', required: true },
    skillName: { type: String, required: true },
    category: { type: String },
    level: { type: String, enum: SKILL_LEVELS, default: 'beginner' },
    certifiedDate: { type: Date },
    expiryDate: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    trainingHours: { type: Number, default: 0 },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

volunteerSkillSchema.index({ volunteerId: 1 });

const DDDVolunteerSkill =
  mongoose.models.DDDVolunteerSkill || mongoose.model('DDDVolunteerSkill', volunteerSkillSchema);

/* ── Volunteer Recognition ─────────────────────────────────────────────── */
const volunteerRecognitionSchema = new Schema(
  {
    recognitionCode: { type: String, required: true, unique: true },
    volunteerId: { type: Schema.Types.ObjectId, ref: 'DDDVolunteer', required: true },
    type: { type: String, enum: RECOGNITION_TYPES, required: true },
    title: { type: String, required: true },
    description: { type: String },
    awardedDate: { type: Date, default: Date.now },
    awardedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    hoursAtAward: { type: Number },
    certificateUrl: { type: String },
    isPublic: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

volunteerRecognitionSchema.index({ volunteerId: 1, awardedDate: -1 });

const DDDVolunteerRecognition =
  mongoose.models.DDDVolunteerRecognition ||
  mongoose.model('DDDVolunteerRecognition', volunteerRecognitionSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  VOLUNTEER_STATUSES,
  VOLUNTEER_CATEGORIES,
  SHIFT_STATUSES,
  SKILL_LEVELS,
  RECOGNITION_TYPES,
  AVAILABILITY_PATTERNS,
  BUILTIN_VOLUNTEER_ROLES,
  DDDVolunteer,
  DDDVolunteerShift,
  DDDVolunteerSkill,
  DDDVolunteerRecognition,
};
