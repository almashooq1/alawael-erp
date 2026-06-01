'use strict';
/**
 * Canonical AudiologyScreening — module: Sensory Screening.
 *
 * One functional hearing-screen: per-ear level estimate + tympanometry +
 * JCIH risk cluster + outcome (pass/monitor/refer). See
 * `backend/models/AudiologyScreening.js` (W722). Sibling of VisionScreening.
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const Method = z.enum([
  'pure_tone_audiometry',
  'play_audiometry',
  'visual_reinforcement_audiometry',
  'otoacoustic_emissions',
  'auditory_brainstem_response',
  'tympanometry_only',
  'behavioral_observation',
  'otoscopy_only',
]);
const Level = z.enum([
  '',
  'normal_le_25',
  'mild_26_40',
  'moderate_41_55',
  'moderately_severe_56_70',
  'severe_71_90',
  'profound_gt_90',
  'unable_to_assess',
]);
const Tymp = z.enum(['', 'A', 'As', 'Ad', 'B', 'C']);
const LossType = z.enum(['none', 'conductive', 'sensorineural', 'mixed', 'unknown']);
const Outcome = z.enum(['pass', 'monitor', 'refer']);
const Status = z.enum(['draft', 'finalized']);

const AudiologyScreening = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),
  sectionId: ObjectIdLike.optional(),
  carePlanVersionId: ObjectIdLike.optional(),

  date: IsoDateLoose,
  reason: z.string().max(300).optional(),

  screeningMethod: Method,
  wearsAmplificationDuringScreen: z.boolean().optional(),

  levelRight: Level.optional(),
  levelLeft: Level.optional(),
  tympanometryRight: Tymp.optional(),
  tympanometryLeft: Tymp.optional(),
  hearingLossType: LossType,

  functionalDomainsIntact: z.array(z.string()).optional(),
  riskIndicatorsPresent: z.boolean().optional(),
  riskIndicators: z.array(z.string()).optional(),

  otoscopyAbnormal: z.boolean().optional(),
  otoscopyDetail: z.string().max(300).optional(),

  outcome: Outcome,
  referralReason: z.string().max(500).optional(),
  referralTo: z.string().max(120).optional(),

  amplificationRecommended: z.boolean().optional(),
  amplificationDetail: z.string().max(300).optional(),

  recommendations: z.string().max(1000).optional(),
  reassessmentDue: IsoDateLoose.optional(),
  notes: z.string().max(1000).optional(),

  screenedBy: ObjectIdLike.optional(),
  screenedByName: z.string().max(100).optional(),
  screenedAt: IsoDateLoose.optional(),

  status: Status,

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'AudiologyScreening',
  modulePath: 'Sensory Screening',
  mongooseModelName: 'AudiologyScreening',
  schema: AudiologyScreening,
};
