'use strict';
/**
 * Canonical ARVRSession — module: AR/VR Rehabilitation.
 *
 * Immersive session using AR/VR hardware. Tracks scenario, headset, and
 * safety metrics in addition to the Session cardinality.
 */

const { z, ObjectIdLike, IsoDateLoose, SessionStatus, AuditEnvelope } = require('../_primitives');

const ARVRSession = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  episodeId: ObjectIdLike.optional(),
  therapistId: ObjectIdLike,

  status: SessionStatus,

  scheduledStart: IsoDateLoose,
  scheduledEnd: IsoDateLoose.optional(),
  actualStart: IsoDateLoose.optional(),
  actualEnd: IsoDateLoose.optional(),

  // Hardware + content identifiers.
  device: z.enum(['quest', 'pico', 'hololens', 'vive', 'cardboard', 'other']).optional(),
  scenarioId: z.string().min(1),
  scenarioVersion: z.string().optional(),
  immersionType: z.enum(['vr', 'ar', 'mr']).optional(),

  // Safety — cybersickness must be captured at session close.
  cybersicknessReported: z.boolean().optional(),
  cybersicknessSeverity: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),

  // Performance summary (detailed metrics in extension).
  completionPercent: z.number().min(0).max(100).optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'ARVRSession',
  modulePath: 'AR/VR Rehabilitation',
  mongooseModelName: 'ImmersiveSession',
  schema: ARVRSession,
};
