'use strict';
/**
 * Canonical AssistiveDevice — module: Assistive Devices.
 *
 * Per-unit asset with loan + maintenance lifecycle. See
 * `backend/models/AssistiveDevice.js` (W359).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const DeviceCategory = z.enum([
  'wheelchair',
  'walker',
  'hearing_aid',
  'prosthetic',
  'orthotic',
  'aac_device',
  'standing_frame',
  'communication_board',
  'feeding_aid',
  'visual_aid',
  'sensory_tool',
  'other',
]);

const DeviceAvailability = z.enum(['available', 'loaned', 'maintenance', 'retired']);
const ConditionGrade = z.enum(['new', 'excellent', 'good', 'fair', 'poor', 'broken']);
const LoanStatus = z.enum([
  'requested',
  'approved',
  'checked_out',
  'returned',
  'lost',
  'damaged',
  'cancelled',
]);
const MaintenanceKind = z.enum([
  'preventive',
  'corrective',
  'cleaning',
  'calibration',
  'fitting',
  'battery_replacement',
  'inspection',
]);

const DeviceLoan = z.object({
  beneficiaryId: ObjectIdLike,
  startedAt: IsoDateLoose,
  expectedReturnAt: IsoDateLoose.optional(),
  returnedAt: IsoDateLoose.optional(),
  status: LoanStatus,
  conditionOnCheckout: ConditionGrade.optional(),
  conditionOnReturn: ConditionGrade.optional(),
});

const MaintenanceEntry = z.object({
  kind: MaintenanceKind,
  performedAt: IsoDateLoose,
  cost: z.number().nonnegative().optional(),
  nextDueAt: IsoDateLoose.optional(),
});

const AssistiveDevice = z.object({
  _id: ObjectIdLike.optional(),

  assetTag: z.string().min(1),
  serialNumber: z.string().optional(),
  name: z.string().min(1),
  category: DeviceCategory,

  branchId: ObjectIdLike.optional(),

  acquisitionCost: z.number().nonnegative().optional(),
  warrantyExpiresAt: IsoDateLoose.optional(),

  availability: DeviceAvailability,
  currentCondition: ConditionGrade.optional(),
  currentLoaneeId: ObjectIdLike.optional(),
  currentLoanStartedAt: IsoDateLoose.optional(),
  currentLoanExpectedReturnAt: IsoDateLoose.optional(),

  nextMaintenanceDue: IsoDateLoose.optional(),
  loans: z.array(DeviceLoan).optional(),
  maintenance: z.array(MaintenanceEntry).optional(),

  retiredAt: IsoDateLoose.optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'AssistiveDevice',
  modulePath: 'Assistive Devices',
  mongooseModelName: 'AssistiveDevice',
  schema: AssistiveDevice,
};
