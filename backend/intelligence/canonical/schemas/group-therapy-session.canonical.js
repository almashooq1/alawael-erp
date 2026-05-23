'use strict';
/**
 * Canonical GroupTherapySession — module: Group Therapy.
 *
 * Specialised session with multiple beneficiaries. Inherits the Session
 * cardinality but adds the participant set.
 */

const { z, ObjectIdLike, IsoDateLoose, SessionStatus, AuditEnvelope } = require('../_primitives');

const GroupTherapySession = z.object({
  _id: ObjectIdLike.optional(),

  groupId: ObjectIdLike,
  therapistId: ObjectIdLike,
  coTherapistId: ObjectIdLike.optional(),

  status: SessionStatus,

  scheduledStart: IsoDateLoose,
  scheduledEnd: IsoDateLoose.optional(),
  actualStart: IsoDateLoose.optional(),
  actualEnd: IsoDateLoose.optional(),

  // Participants — each links a beneficiary to their attendance state.
  participants: z
    .array(
      z.object({
        beneficiaryId: ObjectIdLike,
        episodeId: ObjectIdLike.optional(),
        attendance: z.enum(['present', 'absent', 'late', 'left_early', 'excused']).optional(),
      })
    )
    .min(1),

  topic: z.string().optional(),
  topic_ar: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'GroupTherapySession',
  modulePath: 'Group Therapy',
  mongooseModelName: 'GroupSession',
  schema: GroupTherapySession,
};
