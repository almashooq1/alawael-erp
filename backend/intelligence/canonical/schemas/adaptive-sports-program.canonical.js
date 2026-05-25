'use strict';
/**
 * Canonical AdaptiveSportsProgram — module: Adaptive Sports.
 *
 * Per-(beneficiary, sport, period) participation record with session +
 * achievement logs. See `backend/models/AdaptiveSportsProgram.js` (W362).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const Sport = z.enum([
  'wheelchair_basketball',
  'wheelchair_tennis',
  'wheelchair_rugby',
  'wheelchair_racing',
  'boccia',
  'goalball',
  'sitting_volleyball',
  'adapted_swimming',
  'hippotherapy',
  'adapted_cycling',
  'adapted_skiing',
  'adapted_archery',
  'adapted_judo',
  'powerlifting',
  'sled_hockey',
  'unified_football',
  'sensory_movement',
  'water_polo_adapted',
  'other',
]);

const SportCategory = z.enum(['team', 'individual', 'therapy_adjacent']);
const PhysicalDemand = z.enum(['low', 'moderate', 'high']);
const ProgramStatus = z.enum(['draft', 'active', 'paused', 'completed', 'discontinued']);
const SessionType = z.enum(['training', 'competition', 'demo', 'social', 'assessment']);
const IndependenceLevel = z.enum([
  'full_support',
  'moderate_support',
  'minimal_support',
  'independent',
]);

const Session = z.object({
  date: IsoDateLoose,
  type: SessionType.optional(),
  durationMinutes: z.number().int().nonnegative(),
  independenceLevel: IndependenceLevel.optional(),
});

const Achievement = z.object({
  title: z.string().min(1),
  earnedAt: IsoDateLoose,
  competitionName: z.string().optional(),
  placement: z.string().optional(),
});

const AdaptiveSportsProgram = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),

  sport: Sport,
  category: SportCategory,
  physicalDemand: PhysicalDemand,

  startDate: IsoDateLoose.optional(),
  endDate: IsoDateLoose.optional(),
  frequencyPerWeek: z.number().int().min(0).max(14).optional(),

  primaryCoachId: ObjectIdLike.optional(),
  familyConsent: z.boolean().optional(),
  medicalClearance: z.boolean().optional(),

  sessions: z.array(Session).optional(),
  achievements: z.array(Achievement).optional(),

  status: ProgramStatus,
  discontinuationReason: z.string().optional(),

  linkedCarePlanVersionId: ObjectIdLike.optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'AdaptiveSportsProgram',
  modulePath: 'Adaptive Sports',
  mongooseModelName: 'AdaptiveSportsProgram',
  schema: AdaptiveSportsProgram,
};
