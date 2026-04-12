'use strict';
/**
 * DddMentorshipProgram — Mongoose Models & Constants
 * Auto-extracted from services/dddMentorshipProgram.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const MENTORSHIP_TYPES = [
  'clinical',
  'peer',
  'leadership',
  'onboarding',
  'research',
  'career_development',
  'cross_functional',
  'reverse_mentoring',
  'group_mentoring',
  'virtual',
  'skill_based',
  'project_based',
];

const MENTORSHIP_STATUSES = [
  'proposed',
  'matched',
  'active',
  'paused',
  'completed',
  'cancelled',
  'extended',
  'under_review',
  'graduated',
  'terminated',
];

const GOAL_STATUSES = [
  'not_started',
  'in_progress',
  'on_track',
  'at_risk',
  'behind',
  'completed',
  'deferred',
  'exceeded',
  'cancelled',
  'modified',
];

const MEETING_FORMATS = [
  'in_person',
  'video_call',
  'phone',
  'hybrid',
  'shadowing',
  'observation',
  'co_treatment',
  'case_review',
  'workshop',
  'informal',
];

const FEEDBACK_TYPES = [
  'mentor_to_mentee',
  'mentee_to_mentor',
  'self_assessment',
  'peer_feedback',
  'supervisor_feedback',
  'program_feedback',
  'mid_term_review',
  'final_evaluation',
  'anonymous',
  'structured',
];

const COMPETENCY_DOMAINS = [
  'clinical_skills',
  'communication',
  'professionalism',
  'critical_thinking',
  'leadership',
  'teamwork',
  'evidence_based_practice',
  'patient_education',
  'documentation',
  'time_management',
  'cultural_sensitivity',
  'technology',
];

const BUILTIN_PROGRAM_TEMPLATES = [
  { code: 'NEW_HIRE_90D', name: '90-Day New Hire Mentorship', durationMonths: 3 },
  { code: 'CLINICAL_ADV', name: 'Clinical Advancement Program', durationMonths: 12 },
  { code: 'LEADERSHIP_DEV', name: 'Leadership Development Track', durationMonths: 6 },
  { code: 'RESEARCH_MENTR', name: 'Research Mentorship Program', durationMonths: 12 },
  { code: 'PEER_SUPPORT', name: 'Peer Support Network', durationMonths: 6 },
  { code: 'SPECIALIST_TRK', name: 'Specialist Training Track', durationMonths: 18 },
  { code: 'CROSS_DEPT', name: 'Cross-Department Mentoring', durationMonths: 4 },
  { code: 'INTERN_PROG', name: 'Internship Mentorship', durationMonths: 3 },
  { code: 'SUCCESSION_PLN', name: 'Succession Planning Mentorship', durationMonths: 12 },
  { code: 'WELLNESS_MENTR', name: 'Staff Wellness Mentoring', durationMonths: 6 },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const mentorshipPairSchema = new Schema(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    menteeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: MENTORSHIP_TYPES, required: true },
    status: { type: String, enum: MENTORSHIP_STATUSES, default: 'proposed' },
    programName: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    goals: [
      {
        title: String,
        description: String,
        status: { type: String, enum: GOAL_STATUSES, default: 'not_started' },
        targetDate: Date,
        completedDate: Date,
      },
    ],
    competencyFocus: [{ type: String, enum: COMPETENCY_DOMAINS }],
    meetingFrequency: { type: String, default: 'biweekly' },
    totalMeetings: { type: Number, default: 0 },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
mentorshipPairSchema.index({ mentorId: 1, status: 1 });
mentorshipPairSchema.index({ menteeId: 1, status: 1 });

const mentorMeetingSchema = new Schema(
  {
    pairId: { type: Schema.Types.ObjectId, ref: 'DDDMentorshipPair', required: true },
    date: { type: Date, required: true },
    format: { type: String, enum: MEETING_FORMATS, default: 'in_person' },
    durationMinutes: { type: Number, default: 60 },
    agendaTopics: [{ type: String }],
    keyDiscussions: { type: String },
    actionItems: [{ item: String, assignedTo: String, dueDate: Date, completed: Boolean }],
    menteeProgress: { type: String },
    competenciesAddressed: [{ type: String, enum: COMPETENCY_DOMAINS }],
    nextMeetingDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
mentorMeetingSchema.index({ pairId: 1, date: -1 });

const mentorFeedbackSchema = new Schema(
  {
    pairId: { type: Schema.Types.ObjectId, ref: 'DDDMentorshipPair', required: true },
    type: { type: String, enum: FEEDBACK_TYPES, required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    ratings: [
      {
        domain: { type: String, enum: COMPETENCY_DOMAINS },
        score: { type: Number, min: 1, max: 5 },
      },
    ],
    overallRating: { type: Number, min: 1, max: 5 },
    strengths: { type: String },
    areasForGrowth: { type: String },
    comments: { type: String },
    isAnonymous: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
mentorFeedbackSchema.index({ pairId: 1, type: 1 });

const mentorshipProgramSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true },
    description: { type: String },
    type: { type: String, enum: MENTORSHIP_TYPES },
    durationMonths: { type: Number },
    maxPairs: { type: Number, default: 20 },
    activePairs: { type: Number, default: 0 },
    coordinatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    eligibilityCriteria: { type: String },
    objectives: [{ type: String }],
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
mentorshipProgramSchema.index({ isActive: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDMentorshipPair =
  mongoose.models.DDDMentorshipPair || mongoose.model('DDDMentorshipPair', mentorshipPairSchema);
const DDDMentorMeeting =
  mongoose.models.DDDMentorMeeting || mongoose.model('DDDMentorMeeting', mentorMeetingSchema);
const DDDMentorFeedback =
  mongoose.models.DDDMentorFeedback || mongoose.model('DDDMentorFeedback', mentorFeedbackSchema);
const DDDMentorshipProgram =
  mongoose.models.DDDMentorshipProgram ||
  mongoose.model('DDDMentorshipProgram', mentorshipProgramSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  MENTORSHIP_TYPES,
  MENTORSHIP_STATUSES,
  GOAL_STATUSES,
  MEETING_FORMATS,
  FEEDBACK_TYPES,
  COMPETENCY_DOMAINS,
  BUILTIN_PROGRAM_TEMPLATES,
  DDDMentorshipPair,
  DDDMentorMeeting,
  DDDMentorFeedback,
  DDDMentorshipProgram,
};
