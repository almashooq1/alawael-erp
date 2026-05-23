'use strict';
/**
 * Canonical TeleRehabSession — module: Tele-Rehabilitation.
 *
 * Remote session conducted over video. Inherits Session cardinality plus
 * connectivity / consent specifics.
 */

const {
  z,
  ObjectIdLike,
  IsoDateLoose,
  SessionStatus,
  ConsentState,
  AuditEnvelope,
} = require('../_primitives');

const TeleRehabSession = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  episodeId: ObjectIdLike.optional(),
  therapistId: ObjectIdLike,

  status: SessionStatus,

  scheduledStart: IsoDateLoose,
  scheduledEnd: IsoDateLoose.optional(),
  actualStart: IsoDateLoose.optional(),
  actualEnd: IsoDateLoose.optional(),

  // Platform identifier (Zoom / Teams / WebRTC room id).
  platform: z.enum(['zoom', 'teams', 'webex', 'webrtc', 'other']).optional(),
  sessionUrl: z.string().url().optional(),

  // Remote-care PDPL consent must be explicit per session.
  consentState: ConsentState.optional(),

  // Connection quality (canonical for QoS analytics).
  connectionQuality: z.enum(['excellent', 'good', 'fair', 'poor', 'lost']).optional(),

  recordingAllowed: z.boolean().optional(),
  recordingUrl: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'TeleRehabSession',
  modulePath: 'Tele-Rehabilitation',
  mongooseModelName: 'TeleSession',
  schema: TeleRehabSession,
};
