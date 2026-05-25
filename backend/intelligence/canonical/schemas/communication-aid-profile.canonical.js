'use strict';
/**
 * Canonical CommunicationAidProfile — module: AAC (Augmentative &
 * Alternative Communication).
 *
 * One profile per beneficiary. ASHA-aligned modality tiers. See
 * `backend/models/CommunicationAidProfile.js` (W358).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const ModalityTier = z.enum(['unaided', 'low_tech_aided', 'high_tech_aided']);

const VocabularyLevel = z.enum([
  'pre_symbolic',
  'single_word',
  'multi_word',
  'sentence',
  'conversational',
]);

const IndependenceLevel = z.enum([
  'full_physical_prompt',
  'partial_physical_prompt',
  'gestural_prompt',
  'verbal_prompt',
  'independent',
]);

const ProfileLifecycle = z.enum(['draft', 'active', 'paused', 'retired']);

const AacTool = z.object({
  name: z.string().min(1),
  tier: ModalityTier,
  modalityKey: z.string(),
  symbolSet: z.string().optional(),
  introducedAt: IsoDateLoose,
  independenceLevel: IndependenceLevel.optional(),
  isActive: z.boolean().optional(),
});

const CommunicationAidProfile = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),
  carePlanVersionId: ObjectIdLike.optional(),

  primaryModality: z.string().optional(),
  activeModalities: z.array(z.string()).optional(),
  activeTools: z.array(AacTool).optional(),
  vocabularyLevel: VocabularyLevel,
  estimatedActiveVocabularyCount: z.number().int().nonnegative().optional(),

  trainedPartners: z.array(z.string()).optional(),
  usedAtHome: z.boolean().optional(),

  assessedBy: ObjectIdLike.optional(),
  assessedByDiscipline: z.string().optional(), // SLP/OT/BCBA
  assessedAt: IsoDateLoose.optional(),
  nextReassessmentDue: IsoDateLoose.optional(),

  lifecycleStatus: ProfileLifecycle,

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'CommunicationAidProfile',
  modulePath: 'AAC',
  mongooseModelName: 'CommunicationAidProfile',
  schema: CommunicationAidProfile,
};
