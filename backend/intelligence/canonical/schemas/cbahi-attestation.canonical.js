'use strict';
/**
 * Canonical CbahiAttestation — module: CBAHI Accreditation.
 *
 * Per-branch, per-standard meeting-status attestation. Pairs with
 * `intelligence/cbahi-standards.registry.js` (W360). See
 * `backend/models/CbahiAttestation.js` (W360).
 */

const { z, ObjectIdLike, IsoDateLoose, AuditEnvelope } = require('../_primitives');

const AttestationStatus = z.enum(['draft', 'met', 'partially_met', 'not_met', 'not_applicable']);

const EvidenceEntry = z.object({
  type: z.string(),
  summary: z.string().min(1),
  artifactId: z.string().optional(),
  artifactKind: z.string().optional(),
  capturedAt: IsoDateLoose.optional(),
  capturedBy: ObjectIdLike.optional(),
});

const CbahiAttestation = z.object({
  _id: ObjectIdLike.optional(),

  branchId: ObjectIdLike,
  standardKey: z.string().min(1),
  standardChapter: z.string().optional(),
  standardCode: z.string().optional(),

  status: AttestationStatus,
  score: z.number().min(0).max(100).optional(),

  evidence: z.array(EvidenceEntry).optional(),
  gapNotes: z.string().optional(),
  naJustification: z.string().optional(),

  linkedCapaItemId: ObjectIdLike.optional(),

  assessedBy: ObjectIdLike.optional(),
  assessedByRole: z.string().optional(),
  assessedAt: IsoDateLoose.optional(),
  nextReassessmentDue: IsoDateLoose.optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'CbahiAttestation',
  modulePath: 'CBAHI Accreditation',
  mongooseModelName: 'CbahiAttestation',
  schema: CbahiAttestation,
};
