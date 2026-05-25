'use strict';
/**
 * Canonical CaregiverSupportProgram — module: Family Support.
 *
 * Caregiver enrollment in counseling / training / support-group cycles.
 * See `backend/models/CaregiverSupportProgram.js` (W384). Distinct from
 * RespiteBooking (one-off respite hours, W363) and CaregiverBurdenAssessment
 * (the Zarit-22 score instrument).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const ProgramType = z.enum([
  'caregiver_counseling',
  'caregiver_training',
  'parent_support_group',
  'sibling_support_group',
  'caregiver_peer_support',
]);

const ProgramStatus = z.enum(['enrolled', 'in_progress', 'paused', 'completed', 'discontinued']);

const SessionFormat = z.enum(['individual', 'family', 'group', 'phone', 'video']);

const AttendanceStatus = z.enum(['attended', 'absent', 'cancelled', 'late', 'partial']);

const Session = z.object({
  sessionDate: IsoDateLoose,
  durationMinutes: z.number().int().min(5).max(480).optional(),
  format: SessionFormat,
  topic: z.string().optional(),
  facilitatorId: ObjectIdLike.optional(),
  attendanceStatus: AttendanceStatus.optional(),
  progressNotes: z.string().optional(),
  nextSessionDate: IsoDateLoose.optional(),
});

const ModuleProgress = z.object({
  moduleNumber: z.number().int().min(1),
  title: z.string().min(1),
  targetHours: z.number().nonnegative().optional(),
  hoursCompleted: z.number().nonnegative().optional(),
  completedAt: IsoDateLoose.optional(),
});

const Outcomes = z.object({
  preProgramBurdenScore: z.number().min(0).max(88).optional(),
  postProgramBurdenScore: z.number().min(0).max(88).optional(),
  satisfactionScore: z.number().min(1).max(10).optional(),
  selfReportedImpact: z.string().optional(),
});

const SiblingAgeRange = z.object({
  min: z.number().int().min(0).max(30).optional(),
  max: z.number().int().min(0).max(30).optional(),
});

const CaregiverSupportProgram = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),

  programType: ProgramType,
  status: ProgramStatus,

  caregiverGuardianId: ObjectIdLike.optional(),
  caregiverName: z.string().optional(),
  caregiverRelationship: z.string().optional(),
  caregiverPhone: z.string().optional(),

  enrolledAt: IsoDateLoose.optional(),
  targetCompletionDate: IsoDateLoose.optional(),
  completedAt: IsoDateLoose.optional(),
  pausedAt: IsoDateLoose.optional(),
  discontinuedAt: IsoDateLoose.optional(),
  discontinuationReason: z.string().optional(),

  assignedCounselorId: ObjectIdLike.optional(),
  assignedCounselorName: z.string().optional(),

  totalModules: z.number().int().min(0).max(50).optional(),
  totalTargetHours: z.number().min(0).max(500).optional(),
  modulesProgress: z.array(ModuleProgress).optional(),

  siblingAgeRange: SiblingAgeRange.optional(),

  groupName: z.string().optional(),
  groupFrequency: z.string().optional(),

  sessions: z.array(Session).optional(),

  outcomes: Outcomes.optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'CaregiverSupportProgram',
  modulePath: 'Family Support',
  mongooseModelName: 'CaregiverSupportProgram',
  schema: CaregiverSupportProgram,
};
