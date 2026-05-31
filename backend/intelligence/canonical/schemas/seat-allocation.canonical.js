'use strict';
/**
 * Canonical SeatAllocation — module: Capacity & Occupancy.
 *
 * One standing seat/place allocation of a day-rehab center to a
 * beneficiary. Occupancy = count(active) vs Branch.capacity.max_patients.
 * See `backend/models/SeatAllocation.js` (W681).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const Status = z.enum(['active', 'on_hold', 'released']);
const Period = z.enum(['morning', 'afternoon', 'full_day']);

const SeatAllocation = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike,
  sectionId: ObjectIdLike.optional(),

  seatLabel: z.string().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  period: Period.optional(),

  effectiveFrom: IsoDateLoose,
  effectiveTo: IsoDateLoose.optional(),

  status: Status,
  holdReason: z.string().optional(),
  releasedAt: IsoDateLoose.optional(),
  releaseReason: z.string().optional(),

  waitlistEntryId: ObjectIdLike.optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'SeatAllocation',
  modulePath: 'Capacity & Occupancy',
  mongooseModelName: 'SeatAllocation',
  schema: SeatAllocation,
};
