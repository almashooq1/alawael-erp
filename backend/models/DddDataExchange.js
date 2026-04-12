'use strict';
/**
 * DddDataExchange — Mongoose Models & Constants
 * Auto-extracted from services/dddDataExchange.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const EXCHANGE_FORMATS = [
  'JSON',
  'XML',
  'CSV',
  'HL7v2',
  'FHIR_JSON',
  'FHIR_XML',
  'CDA',
  'DICOM',
  'PDF',
  'XLSX',
  'CCDA',
  'X12',
];

const JOB_TYPES = [
  'import',
  'export',
  'transform',
  'sync',
  'migration',
  'backup',
  'restore',
  'validate',
  'enrich',
  'deduplicate',
];

const JOB_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'paused',
  'retrying',
  'partial',
  'scheduled',
  'expired',
];

const TRANSFORM_OPERATIONS = [
  'map_field',
  'rename_field',
  'convert_type',
  'split_field',
  'merge_fields',
  'lookup',
  'calculate',
  'filter',
  'aggregate',
  'normalize',
];

const VALIDATION_RULES = [
  'required',
  'format',
  'range',
  'enum',
  'regex',
  'unique',
  'reference',
  'conditional',
  'cross_field',
  'business_rule',
];

const EXCHANGE_PROTOCOLS = [
  'REST_API',
  'SFTP',
  'MLLP',
  'SOAP',
  'GraphQL',
  'gRPC',
  'WebSocket',
  'Email',
  'S3',
  'Azure_Blob',
];

const BUILTIN_EXCHANGE_CONFIGS = [
  {
    code: 'CSV_TO_FHIR',
    name: 'CSV to FHIR Patient',
    sourceFormat: 'CSV',
    targetFormat: 'FHIR_JSON',
  },
  { code: 'HL7_TO_JSON', name: 'HL7v2 to JSON', sourceFormat: 'HL7v2', targetFormat: 'JSON' },
  { code: 'FHIR_TO_CDA', name: 'FHIR to CDA', sourceFormat: 'FHIR_JSON', targetFormat: 'CDA' },
  { code: 'XML_TO_JSON', name: 'XML to JSON Convert', sourceFormat: 'XML', targetFormat: 'JSON' },
  {
    code: 'DICOM_META',
    name: 'DICOM Metadata Extract',
    sourceFormat: 'DICOM',
    targetFormat: 'JSON',
  },
  { code: 'CCDA_TO_FHIR', name: 'CCDA to FHIR', sourceFormat: 'CCDA', targetFormat: 'FHIR_JSON' },
  { code: 'XLSX_IMPORT', name: 'Excel Data Import', sourceFormat: 'XLSX', targetFormat: 'JSON' },
  {
    code: 'FHIR_BUNDLE',
    name: 'FHIR Bundle Export',
    sourceFormat: 'JSON',
    targetFormat: 'FHIR_JSON',
  },
  { code: 'PDF_EXTRACT', name: 'PDF Data Extraction', sourceFormat: 'PDF', targetFormat: 'JSON' },
  { code: 'X12_TO_JSON', name: 'X12 to JSON', sourceFormat: 'X12', targetFormat: 'JSON' },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const exchangeJobSchema = new Schema(
  {
    name: { type: String, required: true },
    jobType: { type: String, enum: JOB_TYPES, required: true },
    status: { type: String, enum: JOB_STATUSES, default: 'queued' },
    sourceFormat: { type: String, enum: EXCHANGE_FORMATS },
    targetFormat: { type: String, enum: EXCHANGE_FORMATS },
    protocol: { type: String, enum: EXCHANGE_PROTOCOLS },
    sourceConfig: { type: Schema.Types.Mixed },
    targetConfig: { type: Schema.Types.Mixed },
    recordsTotal: { type: Number, default: 0 },
    recordsProcessed: { type: Number, default: 0 },
    recordsFailed: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    errors: [{ record: Number, message: String, field: String }],
    scheduleCron: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
exchangeJobSchema.index({ jobType: 1, status: 1 });
exchangeJobSchema.index({ createdAt: -1 });

const transformPipelineSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    sourceFormat: { type: String, enum: EXCHANGE_FORMATS, required: true },
    targetFormat: { type: String, enum: EXCHANGE_FORMATS, required: true },
    steps: [
      {
        order: { type: Number, required: true },
        operation: { type: String, enum: TRANSFORM_OPERATIONS, required: true },
        config: { type: Schema.Types.Mixed },
        description: { type: String },
      },
    ],
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
transformPipelineSchema.index({ sourceFormat: 1, targetFormat: 1 });
transformPipelineSchema.index({ isActive: 1 });

const validationSchemaDoc = new Schema(
  {
    name: { type: String, required: true },
    format: { type: String, enum: EXCHANGE_FORMATS, required: true },
    rules: [
      {
        field: { type: String, required: true },
        rule: { type: String, enum: VALIDATION_RULES, required: true },
        params: { type: Schema.Types.Mixed },
        message: { type: String },
      },
    ],
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
validationSchemaDoc.index({ format: 1, isActive: 1 });

const exchangeAgreementSchema = new Schema(
  {
    name: { type: String, required: true },
    partnerName: { type: String, required: true },
    partnerSystem: { type: String },
    protocol: { type: String, enum: EXCHANGE_PROTOCOLS, required: true },
    dataFormats: [{ type: String, enum: EXCHANGE_FORMATS }],
    direction: { type: String, enum: ['inbound', 'outbound', 'bidirectional'], required: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'suspended', 'terminated'],
      default: 'draft',
    },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    slaResponseMs: { type: Number },
    contactEmail: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
exchangeAgreementSchema.index({ partnerName: 1, status: 1 });
exchangeAgreementSchema.index({ status: 1, direction: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDExchangeJob =
  mongoose.models.DDDExchangeJob || mongoose.model('DDDExchangeJob', exchangeJobSchema);
const DDDTransformPipeline =
  mongoose.models.DDDTransformPipeline ||
  mongoose.model('DDDTransformPipeline', transformPipelineSchema);
const DDDValidationSchema =
  mongoose.models.DDDValidationSchema || mongoose.model('DDDValidationSchema', validationSchemaDoc);
const DDDExchangeAgreement =
  mongoose.models.DDDExchangeAgreement ||
  mongoose.model('DDDExchangeAgreement', exchangeAgreementSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  EXCHANGE_FORMATS,
  JOB_TYPES,
  JOB_STATUSES,
  TRANSFORM_OPERATIONS,
  VALIDATION_RULES,
  EXCHANGE_PROTOCOLS,
  BUILTIN_EXCHANGE_CONFIGS,
  DDDExchangeJob,
  DDDTransformPipeline,
  DDDValidationSchema,
  DDDExchangeAgreement,
};
