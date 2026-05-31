'use strict';
/**
 * Canonical Sponsorship — module: Charity & Kafala.
 *
 * One kafala (sponsorship) linking a Donor to a Beneficiary with a monthly
 * commitment + payment ledger. See `backend/models/Sponsorship.js` (W682).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const SponsorshipType = z.enum(['full', 'partial', 'one_time', 'in_kind']);
const SponsorshipStatus = z.enum(['pending', 'active', 'paused', 'completed', 'cancelled']);

const Sponsorship = z.object({
  _id: ObjectIdLike.optional(),

  donorId: ObjectIdLike,
  beneficiaryId: ObjectIdLike,
  branchId: ObjectIdLike.optional(),

  sponsorshipType: SponsorshipType,
  monthlyAmount: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  coverageItems: z.array(z.string()).optional(),
  isZakat: z.boolean().optional(),

  startDate: IsoDateLoose,
  endDate: IsoDateLoose.optional(),

  status: SponsorshipStatus,
  pauseReason: z.string().optional(),
  cancelReason: z.string().optional(),

  payments: z
    .array(
      z.object({
        date: IsoDateLoose,
        amount: z.number().nonnegative(),
        method: z.string().optional(),
        donationId: ObjectIdLike.optional(),
        reference: z.string().optional(),
      })
    )
    .optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'Sponsorship',
  modulePath: 'Charity & Kafala',
  mongooseModelName: 'Sponsorship',
  schema: Sponsorship,
};
