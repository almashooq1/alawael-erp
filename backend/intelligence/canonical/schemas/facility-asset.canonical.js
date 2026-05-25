'use strict';
/**
 * Canonical FacilityAsset — module: Facility Management.
 *
 * Building infrastructure with PPM + inspection + regulatory certificate
 * lifecycle. See `backend/models/FacilityAsset.js` (W369).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const FacilityCategory = z.enum([
  'elevator',
  'wheelchair_lift',
  'ramp',
  'accessible_restroom',
  'accessible_door',
  'hvac_unit',
  'air_handler',
  'fire_alarm_panel',
  'fire_sprinkler',
  'fire_extinguisher',
  'smoke_detector',
  'emergency_exit',
  'water_heater',
  'water_tank',
  'water_treatment',
  'generator',
  'ups_battery',
  'medical_oxygen_plant',
  'medical_gas_outlet',
  'hydrotherapy_pool',
  'sensory_room',
  'snoezelen',
  'therapy_swing',
  'cctv_camera',
  'access_control_door',
  'pa_system',
  'other',
]);

const FacilityStatus = z.enum([
  'in_service',
  'inspection_failed',
  'maintenance',
  'out_of_service',
  'retired',
]);

const Criticality = z.enum(['low', 'medium', 'high', 'life_safety']);

const InspectionKind = z.enum([
  'regulatory_annual',
  'preventive_maintenance',
  'corrective_repair',
  'calibration',
  'load_test',
  'safety_check',
  'cleaning_sanitization',
]);

const InspectionOutcome = z.enum(['pass', 'pass_with_observations', 'fail', 'deferred']);

const Inspection = z.object({
  kind: InspectionKind,
  performedAt: IsoDateLoose,
  outcome: InspectionOutcome,
  vendorName: z.string().optional(),
  defectsFound: z.array(z.string()).optional(),
  correctiveActionsRequired: z.array(z.string()).optional(),
  cost: z.number().nonnegative().optional(),
  nextDueAt: IsoDateLoose.optional(),
});

const RegulatoryCertificate = z.object({
  name: z.string().optional(),
  number: z.string(),
  issuingAuthority: z.string(),
  issuedAt: IsoDateLoose.optional(),
  expiresAt: IsoDateLoose,
  fileUrl: z.string().optional(),
});

const FacilityAsset = z.object({
  _id: ObjectIdLike.optional(),

  assetTag: z.string().min(1),
  name: z.string().min(1),
  category: FacilityCategory,

  branchId: ObjectIdLike,
  building: z.string().optional(),
  floor: z.string().optional(),
  room: z.string().optional(),

  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),

  installedAt: IsoDateLoose.optional(),
  installationCost: z.number().nonnegative().optional(),
  warrantyExpiresAt: IsoDateLoose.optional(),

  criticality: Criticality,
  status: FacilityStatus,
  outOfServiceReason: z.string().optional(),
  outOfServiceSince: IsoDateLoose.optional(),

  inspectionIntervalDays: z.number().int().positive().optional(),
  maintenanceIntervalDays: z.number().int().positive().optional(),
  nextInspectionDue: IsoDateLoose.optional(),
  nextMaintenanceDue: IsoDateLoose.optional(),

  inspections: z.array(Inspection).optional(),
  certificates: z.array(RegulatoryCertificate).optional(),

  linkedIncidentId: ObjectIdLike.optional(),

  retiredAt: IsoDateLoose.optional(),
  retirementReason: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'FacilityAsset',
  modulePath: 'Facility Management',
  mongooseModelName: 'FacilityAsset',
  schema: FacilityAsset,
};
