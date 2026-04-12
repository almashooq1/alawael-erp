'use strict';
/**
 * DddInteroperabilityGateway Model
 * Auto-extracted from services/dddInteroperabilityGateway.js
 */
const mongoose = require('mongoose');

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

module.exports = {
  DDDIntegrationLog,
};
