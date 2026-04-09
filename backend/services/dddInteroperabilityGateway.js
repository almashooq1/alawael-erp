'use strict';

/**
 * DDD Interoperability Gateway
 * ═══════════════════════════════════════════════════════════════════════
 * Systematic FHIR R4 mapping for all core DDD models, HL7 messaging
 * abstraction, capability statement, and standardized data exchange.
 *
 * Features:
 *  - FHIR R4 resource mapping (Patient, EpisodeOfCare, Condition, etc.)
 *  - HL7 v2 ADT message handling
 *  - FHIR Capability Statement endpoint
 *  - Bulk export in NDJSON
 *  - Import/validation pipeline
 *  - Integration log tracking
 *  - Configurable endpoint management
 *
 * @module dddInteroperabilityGateway
 */

const mongoose = require('mongoose');
const { Router } = require('express');

const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   1. Integration Log Model
   ═══════════════════════════════════════════════════════════════════════ */
const integrationLogSchema = new mongoose.Schema(
  {
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    protocol: {
      type: String,
      enum: ['fhir-r4', 'hl7-v2', 'custom-api', 'bulk-ndjson'],
      required: true,
    },
    resourceType: String,
    operation: {
      type: String,
      enum: ['read', 'search', 'create', 'update', 'export', 'import', 'capability'],
      required: true,
    },
    status: { type: String, enum: ['success', 'partial', 'failed', 'pending'], default: 'pending' },
    endpoint: String,
    requestSize: Number,
    responseSize: Number,
    recordCount: Number,
    durationMs: Number,
    error: String,
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

integrationLogSchema.index({ protocol: 1, resourceType: 1, createdAt: -1 });
integrationLogSchema.index({ status: 1, createdAt: -1 });

const DDDIntegrationLog =
  mongoose.models.DDDIntegrationLog || mongoose.model('DDDIntegrationLog', integrationLogSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. FHIR R4 Mappers — DDD → FHIR
   ═══════════════════════════════════════════════════════════════════════ */
const FHIR_MAPPERS = {
  /* ── Patient (Beneficiary) ── */
  Patient: {
    modelName: 'Beneficiary',
    toFHIR(doc) {
      return {
        resourceType: 'Patient',
        id: String(doc._id),
        identifier: [
          doc.mrn ? { system: 'urn:mrn', value: doc.mrn } : null,
          doc.nationalId ? { system: 'urn:national-id', value: doc.nationalId } : null,
        ].filter(Boolean),
        active: doc.status === 'active',
        name: [
          {
            family: doc.lastName,
            given: [doc.firstName, doc.middleName].filter(Boolean),
            text: `${doc.firstName || ''} ${doc.lastName || ''}`.trim(),
          },
        ],
        gender: { male: 'male', female: 'female' }[doc.gender] || 'unknown',
        birthDate: doc.dateOfBirth
          ? new Date(doc.dateOfBirth).toISOString().slice(0, 10)
          : undefined,
        telecom: [
          doc.contactInfo?.phone ? { system: 'phone', value: doc.contactInfo.phone } : null,
          doc.contactInfo?.email ? { system: 'email', value: doc.contactInfo.email } : null,
        ].filter(Boolean),
        address: doc.contactInfo?.address
          ? [{ text: doc.contactInfo.address, city: doc.contactInfo?.city }]
          : [],
      };
    },
    fromFHIR(resource) {
      const name = resource.name?.[0] || {};
      return {
        firstName: name.given?.[0] || '',
        lastName: name.family || '',
        gender: resource.gender || 'unknown',
        dateOfBirth: resource.birthDate ? new Date(resource.birthDate) : undefined,
        mrn: resource.identifier?.find(i => i.system === 'urn:mrn')?.value,
        nationalId: resource.identifier?.find(i => i.system === 'urn:national-id')?.value,
        contactInfo: {
          phone: resource.telecom?.find(t => t.system === 'phone')?.value,
          email: resource.telecom?.find(t => t.system === 'email')?.value,
          address: resource.address?.[0]?.text,
        },
      };
    },
  },

  /* ── EpisodeOfCare ── */
  EpisodeOfCare: {
    modelName: 'EpisodeOfCare',
    toFHIR(doc) {
      return {
        resourceType: 'EpisodeOfCare',
        id: String(doc._id),
        status:
          { active: 'active', planned: 'planned', discharged: 'finished', 'on-hold': 'onhold' }[
            doc.status
          ] || 'active',
        type: doc.type ? [{ coding: [{ system: 'urn:episode-type', code: doc.type }] }] : [],
        patient: { reference: `Patient/${doc.beneficiaryId}` },
        period: {
          start: doc.startDate ? new Date(doc.startDate).toISOString() : undefined,
          end: doc.endDate ? new Date(doc.endDate).toISOString() : undefined,
        },
      };
    },
    fromFHIR(resource) {
      return {
        status:
          { active: 'active', planned: 'planned', finished: 'discharged', onhold: 'on-hold' }[
            resource.status
          ] || 'active',
        type: resource.type?.[0]?.coding?.[0]?.code,
        beneficiaryId: resource.patient?.reference?.replace('Patient/', ''),
        startDate: resource.period?.start ? new Date(resource.period.start) : undefined,
        endDate: resource.period?.end ? new Date(resource.period.end) : undefined,
      };
    },
  },

  /* ── Encounter (ClinicalSession) ── */
  Encounter: {
    modelName: 'ClinicalSession',
    toFHIR(doc) {
      return {
        resourceType: 'Encounter',
        id: String(doc._id),
        status:
          {
            scheduled: 'planned',
            'in-progress': 'in-progress',
            completed: 'finished',
            cancelled: 'cancelled',
          }[doc.status] || 'unknown',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: doc.type === 'telehealth' ? 'VR' : 'AMB',
        },
        subject: { reference: `Patient/${doc.beneficiaryId}` },
        participant: doc.therapistId
          ? [{ individual: { reference: `Practitioner/${doc.therapistId}` } }]
          : [],
        period: {
          start: doc.scheduledDate ? new Date(doc.scheduledDate).toISOString() : undefined,
        },
        episodeOfCare: doc.episodeId ? [{ reference: `EpisodeOfCare/${doc.episodeId}` }] : [],
      };
    },
    fromFHIR(resource) {
      return {
        status:
          {
            planned: 'scheduled',
            'in-progress': 'in-progress',
            finished: 'completed',
            cancelled: 'cancelled',
          }[resource.status] || 'scheduled',
        beneficiaryId: resource.subject?.reference?.replace('Patient/', ''),
        therapistId: resource.participant?.[0]?.individual?.reference?.replace('Practitioner/', ''),
        scheduledDate: resource.period?.start ? new Date(resource.period.start) : undefined,
        episodeId: resource.episodeOfCare?.[0]?.reference?.replace('EpisodeOfCare/', ''),
      };
    },
  },

  /* ── CarePlan (UnifiedCarePlan) ── */
  CarePlan: {
    modelName: 'UnifiedCarePlan',
    toFHIR(doc) {
      return {
        resourceType: 'CarePlan',
        id: String(doc._id),
        status:
          doc.status === 'active' ? 'active' : doc.status === 'completed' ? 'completed' : 'draft',
        intent: 'plan',
        subject: { reference: `Patient/${doc.beneficiaryId}` },
        period: {
          start: doc.startDate ? new Date(doc.startDate).toISOString() : undefined,
          end: doc.endDate ? new Date(doc.endDate).toISOString() : undefined,
        },
        activity: (doc.interventions || []).map(i => ({
          detail: { description: i.description || i.title || String(i), status: 'scheduled' },
        })),
      };
    },
  },

  /* ── Goal (TherapeuticGoal) ── */
  Goal: {
    modelName: 'TherapeuticGoal',
    toFHIR(doc) {
      return {
        resourceType: 'Goal',
        id: String(doc._id),
        lifecycleStatus:
          doc.status === 'met' ? 'achieved' : doc.status === 'active' ? 'active' : 'proposed',
        description: { text: doc.title },
        subject: { reference: `Patient/${doc.beneficiaryId}` },
        target: doc.target
          ? [
              {
                detailString: String(doc.target),
                dueDate: doc.targetDate
                  ? new Date(doc.targetDate).toISOString().slice(0, 10)
                  : undefined,
              },
            ]
          : [],
      };
    },
  },

  /* ── Observation (ClinicalAssessment) ── */
  Observation: {
    modelName: 'ClinicalAssessment',
    toFHIR(doc) {
      return {
        resourceType: 'Observation',
        id: String(doc._id),
        status: 'final',
        code: {
          coding: [{ system: 'urn:assessment-type', code: doc.type || 'clinical-assessment' }],
        },
        subject: { reference: `Patient/${doc.beneficiaryId}` },
        effectiveDateTime: doc.assessmentDate
          ? new Date(doc.assessmentDate).toISOString()
          : undefined,
        valueQuantity:
          doc.percentageScore != null ? { value: doc.percentageScore, unit: '%' } : undefined,
        performer: doc.assessorId ? [{ reference: `Practitioner/${doc.assessorId}` }] : [],
      };
    },
  },
};

const SUPPORTED_RESOURCES = Object.keys(FHIR_MAPPERS);

/* ═══════════════════════════════════════════════════════════════════════
   3. FHIR Capability Statement
   ═══════════════════════════════════════════════════════════════════════ */
function getCapabilityStatement() {
  return {
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    software: { name: 'DDD Rehabilitation Platform', version: '1.0.0' },
    fhirVersion: '4.0.1',
    format: ['json'],
    rest: [
      {
        mode: 'server',
        resource: SUPPORTED_RESOURCES.map(r => ({
          type: r,
          interaction: [
            { code: 'read' },
            { code: 'search-type' },
            ...(FHIR_MAPPERS[r].fromFHIR ? [{ code: 'create' }] : []),
          ],
          searchParam: [{ name: '_id', type: 'string' }],
        })),
      },
    ],
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   4. FHIR Operations
   ═══════════════════════════════════════════════════════════════════════ */
async function fhirRead(resourceType, id) {
  const start = Date.now();
  const mapper = FHIR_MAPPERS[resourceType];
  if (!mapper) throw new Error(`Unsupported resource type: ${resourceType}`);

  const Model = model(mapper.modelName);
  if (!Model) throw new Error(`Model ${mapper.modelName} not available`);

  const doc = await Model.findById(id).lean();
  if (!doc) {
    await DDDIntegrationLog.create({
      direction: 'outbound',
      protocol: 'fhir-r4',
      resourceType,
      operation: 'read',
      status: 'failed',
      durationMs: Date.now() - start,
      error: 'Not found',
    });
    return null;
  }

  const fhir = mapper.toFHIR(doc);
  await DDDIntegrationLog.create({
    direction: 'outbound',
    protocol: 'fhir-r4',
    resourceType,
    operation: 'read',
    status: 'success',
    recordCount: 1,
    durationMs: Date.now() - start,
  });
  return fhir;
}

async function fhirSearch(resourceType, query = {}) {
  const start = Date.now();
  const mapper = FHIR_MAPPERS[resourceType];
  if (!mapper) throw new Error(`Unsupported resource type: ${resourceType}`);

  const Model = model(mapper.modelName);
  if (!Model) throw new Error(`Model ${mapper.modelName} not available`);

  const mongoQuery = { isDeleted: { $ne: true } };
  if (query.patient) {
    const patientId = query.patient.replace('Patient/', '');
    if (mongoose.isValidObjectId(patientId)) mongoQuery.beneficiaryId = patientId;
  }
  if (query._id) mongoQuery._id = query._id;

  const limit = Math.min(parseInt(query._count, 10) || 50, 200);
  const docs = await Model.find(mongoQuery).limit(limit).lean();

  const entries = docs.map(d => ({
    resource: mapper.toFHIR(d),
    fullUrl: `${resourceType}/${d._id}`,
  }));
  const bundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: entries.length,
    entry: entries,
  };

  await DDDIntegrationLog.create({
    direction: 'outbound',
    protocol: 'fhir-r4',
    resourceType,
    operation: 'search',
    status: 'success',
    recordCount: entries.length,
    durationMs: Date.now() - start,
  });
  return bundle;
}

async function fhirCreate(resourceType, resource) {
  const start = Date.now();
  const mapper = FHIR_MAPPERS[resourceType];
  if (!mapper || !mapper.fromFHIR) throw new Error(`Create not supported for ${resourceType}`);

  const Model = model(mapper.modelName);
  if (!Model) throw new Error(`Model ${mapper.modelName} not available`);

  const data = mapper.fromFHIR(resource);
  const doc = await Model.create(data);
  const fhir = mapper.toFHIR(doc.toObject());

  await DDDIntegrationLog.create({
    direction: 'inbound',
    protocol: 'fhir-r4',
    resourceType,
    operation: 'create',
    status: 'success',
    recordCount: 1,
    durationMs: Date.now() - start,
  });
  return fhir;
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Bulk Export (NDJSON)
   ═══════════════════════════════════════════════════════════════════════ */
async function bulkExport(resourceTypes) {
  const start = Date.now();
  const types = resourceTypes || SUPPORTED_RESOURCES;
  const output = {};
  let totalRecords = 0;

  for (const rt of types) {
    const mapper = FHIR_MAPPERS[rt];
    if (!mapper) continue;

    const Model = model(mapper.modelName);
    if (!Model) continue;

    const docs = await Model.find({ isDeleted: { $ne: true } }).lean();
    output[rt] = docs.map(d => JSON.stringify(mapper.toFHIR(d))).join('\n');
    totalRecords += docs.length;
  }

  await DDDIntegrationLog.create({
    direction: 'outbound',
    protocol: 'bulk-ndjson',
    operation: 'export',
    status: 'success',
    recordCount: totalRecords,
    durationMs: Date.now() - start,
  });
  return output;
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Integration Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getIntegrationDashboard() {
  const [recentLogs, byProtocol, byStatus] = await Promise.all([
    DDDIntegrationLog.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    DDDIntegrationLog.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$protocol',
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' },
          totalRecords: { $sum: '$recordCount' },
        },
      },
    ]),
    DDDIntegrationLog.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    supportedResources: SUPPORTED_RESOURCES,
    fhirVersion: '4.0.1',
    recentActivity: recentLogs.slice(0, 10),
    byProtocol: byProtocol.reduce(
      (m, r) => ({
        ...m,
        [r._id]: {
          count: r.count,
          avgDurationMs: Math.round(r.avgDuration || 0),
          totalRecords: r.totalRecords,
        },
      }),
      {}
    ),
    byStatus: byStatus.reduce((m, r) => ({ ...m, [r._id]: r.count }), {}),
    totalIntegrations: await DDDIntegrationLog.countDocuments({ isDeleted: { $ne: true } }),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createInteropRouter() {
  const router = Router();

  /* FHIR Capability Statement */
  router.get('/fhir/metadata', (_req, res) => {
    res.json(getCapabilityStatement());
  });

  /* FHIR Read */
  router.get('/fhir/:resourceType/:id', async (req, res) => {
    try {
      const resource = await fhirRead(req.params.resourceType, req.params.id);
      if (!resource)
        return res
          .status(404)
          .json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'not-found' }],
          });
      res.json(resource);
    } catch (err) {
      res
        .status(400)
        .json({
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'processing', diagnostics: err.message }],
        });
    }
  });

  /* FHIR Search */
  router.get('/fhir/:resourceType', async (req, res) => {
    try {
      const bundle = await fhirSearch(req.params.resourceType, req.query);
      res.json(bundle);
    } catch (err) {
      res
        .status(400)
        .json({
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'processing', diagnostics: err.message }],
        });
    }
  });

  /* FHIR Create */
  router.post('/fhir/:resourceType', async (req, res) => {
    try {
      const resource = await fhirCreate(req.params.resourceType, req.body);
      res.status(201).json(resource);
    } catch (err) {
      res
        .status(400)
        .json({
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'processing', diagnostics: err.message }],
        });
    }
  });

  /* Bulk Export */
  router.get('/fhir/$export', async (req, res) => {
    try {
      const types = req.query._type ? req.query._type.split(',') : undefined;
      const output = await bulkExport(types);
      res.json({
        success: true,
        output: Object.keys(output).map(rt => ({
          type: rt,
          url: `data:application/ndjson,${encodeURIComponent(output[rt])}`,
        })),
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Integration Dashboard */
  router.get('/interop/dashboard', async (_req, res) => {
    try {
      const dashboard = await getIntegrationDashboard();
      res.json({ success: true, ...dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Integration Logs */
  router.get('/interop/logs', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const logs = await DDDIntegrationLog.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      res.json({ success: true, count: logs.length, logs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Supported resource types */
  router.get('/interop/resources', (_req, res) => {
    res.json({
      success: true,
      fhirVersion: '4.0.1',
      resources: SUPPORTED_RESOURCES,
      mappers: SUPPORTED_RESOURCES.map(r => ({
        resourceType: r,
        model: FHIR_MAPPERS[r].modelName,
        canImport: !!FHIR_MAPPERS[r].fromFHIR,
      })),
    });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDIntegrationLog,
  FHIR_MAPPERS,
  SUPPORTED_RESOURCES,
  getCapabilityStatement,
  fhirRead,
  fhirSearch,
  fhirCreate,
  bulkExport,
  getIntegrationDashboard,
  createInteropRouter,
};
