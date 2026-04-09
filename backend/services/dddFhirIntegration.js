'use strict';
/**
 * DDD FHIR Integration Service
 * ─────────────────────────────
 * Phase 32 – Integration & Interoperability (Module 1/4)
 *
 * Manages FHIR R4 resources, resource mappings, capability statements,
 * bundle operations, search parameter registration, and conformance.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const FHIR_RESOURCE_TYPES = [
  'Patient',
  'Practitioner',
  'Organization',
  'Encounter',
  'Condition',
  'Observation',
  'Procedure',
  'MedicationRequest',
  'AllergyIntolerance',
  'DiagnosticReport',
  'CarePlan',
  'Goal',
];

const FHIR_VERSIONS = [
  'DSTU2',
  'STU3',
  'R4',
  'R4B',
  'R5',
  'DSTU2_HL7ORG',
  'STU3_HL7ORG',
  'R4_HL7ORG',
  'R4B_HL7ORG',
  'R5_HL7ORG',
];

const BUNDLE_TYPES = [
  'document',
  'message',
  'transaction',
  'transaction-response',
  'batch',
  'batch-response',
  'history',
  'searchset',
  'collection',
  'subscription-notification',
];

const INTERACTION_TYPES = [
  'read',
  'vread',
  'update',
  'patch',
  'delete',
  'history-instance',
  'history-type',
  'create',
  'search-type',
  'capabilities',
];

const MAPPING_STATUSES = [
  'draft',
  'active',
  'retired',
  'review',
  'approved',
  'rejected',
  'deprecated',
  'experimental',
  'pending_validation',
  'validated',
];

const CONFORMANCE_LEVELS = [
  'SHALL',
  'SHOULD',
  'MAY',
  'SHALL_NOT',
  'SHOULD_NOT',
  'full_support',
  'partial_support',
  'read_only',
  'write_only',
  'not_supported',
];

const BUILTIN_FHIR_PROFILES = [
  { code: 'US_CORE_PATIENT', name: 'US Core Patient', resourceType: 'Patient', version: 'R4' },
  {
    code: 'US_CORE_CONDITION',
    name: 'US Core Condition',
    resourceType: 'Condition',
    version: 'R4',
  },
  {
    code: 'US_CORE_OBS_VITALS',
    name: 'US Core Vital Signs',
    resourceType: 'Observation',
    version: 'R4',
  },
  {
    code: 'US_CORE_ENCOUNTER',
    name: 'US Core Encounter',
    resourceType: 'Encounter',
    version: 'R4',
  },
  { code: 'US_CORE_CAREPLAN', name: 'US Core CarePlan', resourceType: 'CarePlan', version: 'R4' },
  { code: 'SA_REHAB_PATIENT', name: 'SA Rehab Patient', resourceType: 'Patient', version: 'R4' },
  {
    code: 'SA_REHAB_OBS',
    name: 'SA Rehab Observation',
    resourceType: 'Observation',
    version: 'R4',
  },
  { code: 'SA_REHAB_PLAN', name: 'SA Rehab CarePlan', resourceType: 'CarePlan', version: 'R4' },
  { code: 'SA_REHAB_GOAL', name: 'SA Rehab Goal', resourceType: 'Goal', version: 'R4' },
  {
    code: 'SA_REHAB_ENCOUNTER',
    name: 'SA Rehab Encounter',
    resourceType: 'Encounter',
    version: 'R4',
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const fhirResourceSchema = new Schema(
  {
    resourceType: { type: String, enum: FHIR_RESOURCE_TYPES, required: true },
    resourceId: { type: String, required: true },
    fhirVersion: { type: String, enum: FHIR_VERSIONS, default: 'R4' },
    content: { type: Schema.Types.Mixed, required: true },
    versionId: { type: Number, default: 1 },
    lastUpdated: { type: Date, default: Date.now },
    sourceSystem: { type: String },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    profileUrl: { type: String },
    tags: [{ system: String, code: String, display: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
fhirResourceSchema.index({ resourceType: 1, resourceId: 1 }, { unique: true });
fhirResourceSchema.index({ beneficiaryId: 1, resourceType: 1 });

const resourceMappingSchema = new Schema(
  {
    sourceSystem: { type: String, required: true },
    sourceField: { type: String, required: true },
    targetResourceType: { type: String, enum: FHIR_RESOURCE_TYPES, required: true },
    targetField: { type: String, required: true },
    transformRule: { type: String },
    status: { type: String, enum: MAPPING_STATUSES, default: 'draft' },
    fhirVersion: { type: String, enum: FHIR_VERSIONS, default: 'R4' },
    description: { type: String },
    exampleInput: { type: Schema.Types.Mixed },
    exampleOutput: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
resourceMappingSchema.index({ sourceSystem: 1, targetResourceType: 1 });
resourceMappingSchema.index({ status: 1 });

const fhirBundleSchema = new Schema(
  {
    bundleType: { type: String, enum: BUNDLE_TYPES, required: true },
    fhirVersion: { type: String, enum: FHIR_VERSIONS, default: 'R4' },
    totalEntries: { type: Number, default: 0 },
    entries: [{ resourceType: String, resourceId: String, method: String, url: String }],
    content: { type: Schema.Types.Mixed },
    processedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    errors: [{ index: Number, message: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
fhirBundleSchema.index({ bundleType: 1, status: 1 });

const capabilityStatementSchema = new Schema(
  {
    name: { type: String, required: true },
    fhirVersion: { type: String, enum: FHIR_VERSIONS, default: 'R4' },
    status: { type: String, enum: ['draft', 'active', 'retired'], default: 'draft' },
    kind: { type: String, enum: ['instance', 'capability', 'requirements'], default: 'instance' },
    restResources: [
      {
        type: String,
        interactions: [{ type: String, enum: INTERACTION_TYPES }],
        conformance: { type: String, enum: CONFORMANCE_LEVELS },
        searchParams: [{ name: String, type: String }],
      },
    ],
    publisher: { type: String },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
capabilityStatementSchema.index({ name: 1, fhirVersion: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDFhirResource =
  mongoose.models.DDDFhirResource || mongoose.model('DDDFhirResource', fhirResourceSchema);
const DDDResourceMapping =
  mongoose.models.DDDResourceMapping || mongoose.model('DDDResourceMapping', resourceMappingSchema);
const DDDFhirBundle =
  mongoose.models.DDDFhirBundle || mongoose.model('DDDFhirBundle', fhirBundleSchema);
const DDDCapabilityStatement =
  mongoose.models.DDDCapabilityStatement ||
  mongoose.model('DDDCapabilityStatement', capabilityStatementSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class FhirIntegration {
  async createResource(data) {
    return DDDFhirResource.create(data);
  }
  async listResources(filter = {}, page = 1, limit = 20) {
    return DDDFhirResource.find(filter)
      .sort({ lastUpdated: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getResource(resourceType, resourceId) {
    return DDDFhirResource.findOne({ resourceType, resourceId }).lean();
  }
  async updateResource(id, data) {
    return DDDFhirResource.findByIdAndUpdate(
      id,
      { ...data, versionId: (data.versionId || 1) + 1, lastUpdated: new Date() },
      { new: true }
    ).lean();
  }

  async createMapping(data) {
    return DDDResourceMapping.create(data);
  }
  async listMappings(filter = {}, page = 1, limit = 20) {
    return DDDResourceMapping.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createBundle(data) {
    return DDDFhirBundle.create(data);
  }
  async listBundles(filter = {}, page = 1, limit = 20) {
    return DDDFhirBundle.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createCapabilityStatement(data) {
    return DDDCapabilityStatement.create(data);
  }
  async listCapabilityStatements(filter = {}) {
    return DDDCapabilityStatement.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getFhirStats() {
    const [resources, mappings, bundles, stmts] = await Promise.all([
      DDDFhirResource.countDocuments(),
      DDDResourceMapping.countDocuments({ status: 'active' }),
      DDDFhirBundle.countDocuments(),
      DDDCapabilityStatement.countDocuments(),
    ]);
    return {
      totalResources: resources,
      activeMappings: mappings,
      totalBundles: bundles,
      capabilityStatements: stmts,
    };
  }

  async healthCheck() {
    const [resources, mappings, bundles, stmts] = await Promise.all([
      DDDFhirResource.countDocuments(),
      DDDResourceMapping.countDocuments(),
      DDDFhirBundle.countDocuments(),
      DDDCapabilityStatement.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'FhirIntegration',
      counts: { resources, mappings, bundles, capabilityStatements: stmts },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createFhirIntegrationRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new FhirIntegration();

  router.get('/fhir-integration/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/fhir-integration/resources', async (req, res) => {
    try {
      res.status(201).json(await svc.createResource(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/fhir-integration/resources', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listResources(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/fhir-integration/resources/:type/:id', async (req, res) => {
    try {
      res.json(await svc.getResource(req.params.type, req.params.id));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/fhir-integration/mappings', async (req, res) => {
    try {
      res.status(201).json(await svc.createMapping(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/fhir-integration/mappings', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listMappings(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/fhir-integration/bundles', async (req, res) => {
    try {
      res.status(201).json(await svc.createBundle(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/fhir-integration/bundles', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listBundles(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/fhir-integration/capability-statements', async (req, res) => {
    try {
      res.status(201).json(await svc.createCapabilityStatement(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/fhir-integration/capability-statements', async (req, res) => {
    try {
      res.json(await svc.listCapabilityStatements(req.query));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/fhir-integration/stats', async (_req, res) => {
    try {
      res.json(await svc.getFhirStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  FHIR_RESOURCE_TYPES,
  FHIR_VERSIONS,
  BUNDLE_TYPES,
  INTERACTION_TYPES,
  MAPPING_STATUSES,
  CONFORMANCE_LEVELS,
  BUILTIN_FHIR_PROFILES,
  DDDFhirResource,
  DDDResourceMapping,
  DDDFhirBundle,
  DDDCapabilityStatement,
  FhirIntegration,
  createFhirIntegrationRouter,
};
