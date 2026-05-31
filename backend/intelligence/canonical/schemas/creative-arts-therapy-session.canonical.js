'use strict';
/**
 * Canonical CreativeArtsTherapySession — module: Therapy Sessions.
 *
 * One creative-arts therapy session (music/art/drama/dance/play) with
 * engagement + mood-shift outcome. See
 * `backend/models/CreativeArtsTherapySession.js` (W685).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const Modality = z.enum(['music', 'art', 'drama', 'dance_movement', 'play']);
const Status = z.enum(['scheduled', 'completed', 'cancelled', 'no_show']);
const Format = z.enum(['individual', 'group']);
const Engagement = z.enum(['none', 'low', 'moderate', 'high']);
const Mood = z.enum(['distressed', 'anxious', 'sad', 'neutral', 'content', 'happy']);

const CreativeArtsTherapySession = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),
  carePlanVersionId: ObjectIdLike.optional(),
  therapistId: ObjectIdLike.optional(),

  modality: Modality,
  sessionDate: IsoDateLoose,
  durationMinutes: z.number().int().min(0).max(480).optional(),

  format: Format.optional(),
  groupSize: z.number().int().min(1).max(50).optional(),

  materialsUsed: z.array(z.string()).optional(),
  interventions: z.array(z.string()).optional(),
  goalsAddressed: z.array(z.string()).optional(),

  engagementLevel: Engagement.optional(),
  moodBefore: Mood.optional(),
  moodAfter: Mood.optional(),

  artifactType: z.enum(['image', 'audio', 'video', 'none']).optional(),
  artifactRef: z.string().optional(),

  status: Status,
  cancelReason: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'CreativeArtsTherapySession',
  modulePath: 'Therapy Sessions',
  mongooseModelName: 'CreativeArtsTherapySession',
  schema: CreativeArtsTherapySession,
};
