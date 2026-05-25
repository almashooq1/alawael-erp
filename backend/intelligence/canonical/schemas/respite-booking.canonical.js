'use strict';
/**
 * Canonical RespiteBooking — module: Respite Care.
 *
 * Temporary-care booking so the family/primary caregiver gets a break.
 * Saudi Disability Authority subsidy-eligible service category. See
 * `backend/models/RespiteBooking.js` (W363).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const RespiteType = z.enum(['day', 'overnight', 'extended']);

const RespiteStatus = z.enum([
  'requested',
  'approved',
  'rejected',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
]);

const FundingSource = z.enum([
  'self_pay',
  'disability_authority_subsidy',
  'insurance',
  'charity',
  'mixed',
]);

const RespiteBooking = z.object({
  _id: ObjectIdLike.optional(),

  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),

  bookingType: RespiteType,
  status: RespiteStatus,

  startAt: IsoDateLoose,
  endAt: IsoDateLoose,
  nightCount: z.number().int().min(0).max(90),

  requestedBy: ObjectIdLike.optional(),
  requestedByRelationship: z.string().optional(),
  requestedAt: IsoDateLoose.optional(),

  approvedBy: ObjectIdLike.optional(),
  approvedAt: IsoDateLoose.optional(),
  rejectionReason: z.string().optional(),

  // Care context — mandatory at intake
  emergencyContactName: z.string().min(1),
  emergencyContactPhone: z.string().min(1),

  checkedInAt: IsoDateLoose.optional(),
  checkedOutAt: IsoDateLoose.optional(),

  estimatedCost: z.number().nonnegative().optional(),
  actualCost: z.number().nonnegative().optional(),
  fundingSource: FundingSource.optional(),
  subsidyApprovalRef: z.string().optional(),

  cancellationReason: z.string().optional(),
  cancelledAt: IsoDateLoose.optional(),
  cancelledBy: ObjectIdLike.optional(),

  linkedCarePlanVersionId: ObjectIdLike.optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'RespiteBooking',
  modulePath: 'Respite Care',
  mongooseModelName: 'RespiteBooking',
  schema: RespiteBooking,
};
