'use strict';
/**
 * Canonical Session — module: Sessions.
 *
 * One therapy session occurrence. Cardinal anchor for attendance,
 * documentation, goals progress, family report.
 */

const { z, ObjectIdLike, IsoDateLoose, SessionStatus, AuditEnvelope } = require('../_primitives');

const SessionModality = z.enum(['individual', 'group', 'tele', 'home', 'community', 'arvr']);

const Session = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  episodeId: ObjectIdLike.optional(),
  planId: ObjectIdLike.optional(),

  therapistId: ObjectIdLike,
  modality: SessionModality.optional(),

  status: SessionStatus,

  scheduledStart: IsoDateLoose,
  scheduledEnd: IsoDateLoose.optional(),
  actualStart: IsoDateLoose.optional(),
  actualEnd: IsoDateLoose.optional(),

  // Linked discipline (canonical for cross-module reporting).
  discipline: z
    .enum([
      'speech',
      'occupational',
      'physical',
      'psychology',
      'behavioral',
      'special_education',
      'medical',
      'social_work',
    ])
    .optional(),

  cancellationReason: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'Session',
  modulePath: 'Sessions',
  mongooseModelName: 'Session',
  schema: Session,
};
