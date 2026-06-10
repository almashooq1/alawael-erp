'use strict';
/**
 * Canonical BiomedicalWasteRecord — module: Environmental Safety.
 *
 * Healthcare (clinical) waste cradle-to-grave: generate → store → collect →
 * dispose. CBAHI + Saudi GAMEP/MOH + WHO. See `backend/models/BiomedicalWasteRecord.js` (W1123).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const WasteCategory = z.enum([
  'infectious',
  'sharps',
  'pathological',
  'pharmaceutical',
  'cytotoxic',
  'chemical',
  'radioactive',
  'general',
]);

const ContainerColor = z.enum(['yellow', 'red', 'blue', 'black', 'white', 'other']);

const WasteStatus = z.enum(['generated', 'stored', 'collected', 'disposed', 'rejected']);

const DisposalMethod = z.enum([
  'incineration',
  'autoclave_steam',
  'chemical_disinfection',
  'microwave',
  'encapsulation',
  'sanitary_landfill',
  'return_to_supplier',
]);

const BiomedicalWasteRecord = z.object({
  branchId: ObjectIdLike,
  recordNumber: z.string().optional(),

  wasteCategory: WasteCategory,
  containerColor: ContainerColor.optional(),
  punctureProofContainer: z.boolean().optional(),

  quantityKg: z.number().positive(),
  containerCount: z.number().int().positive().optional(),

  generationDate: IsoDateLoose,
  generationDepartment: z.string().optional(),
  generationLocationNote: z.string().optional(),
  segregatedByName: z.string().optional(),
  segregatedBy: ObjectIdLike.optional(),

  status: WasteStatus,

  storageLocation: z.string().optional(),
  storedAt: IsoDateLoose.optional(),
  maxStorageHours: z.number().positive().optional(),

  collectionVendor: z.string().optional(),
  collectedByName: z.string().optional(),
  collectionDate: IsoDateLoose.optional(),
  manifestNumber: z.string().optional(),

  disposalMethod: z.union([DisposalMethod, z.literal('')]).optional(),
  disposalFacility: z.string().optional(),
  disposalDate: IsoDateLoose.optional(),
  treatmentCertificateRef: z.string().optional(),

  rejectedReason: z.string().optional(),
  handledBy: ObjectIdLike.optional(),
  notes: z.string().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'BiomedicalWasteRecord',
  modulePath: 'Environmental Safety',
  mongooseModelName: 'BiomedicalWasteRecord',
  schema: BiomedicalWasteRecord,
};
