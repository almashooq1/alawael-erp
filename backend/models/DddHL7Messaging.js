'use strict';
/**
 * DddHL7Messaging — Mongoose Models & Constants
 * Auto-extracted from services/dddHL7Messaging.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const MESSAGE_TYPES = [
  'ADT',
  'ORM',
  'ORU',
  'SIU',
  'MDM',
  'DFT',
  'BAR',
  'RDE',
  'MFN',
  'ACK',
  'QRY',
  'RSP',
];

const MESSAGE_EVENTS = ['A01', 'A02', 'A03', 'A04', 'A08', 'O01', 'R01', 'S12', 'T02', 'P03'];

const PROCESSING_STATUSES = [
  'received',
  'parsing',
  'parsed',
  'validated',
  'routed',
  'delivered',
  'acknowledged',
  'failed',
  'retrying',
  'dead_letter',
];

const ACK_CODES = [
  'AA',
  'AE',
  'AR',
  'CA',
  'CE',
  'CR',
  'CommitAccept',
  'CommitError',
  'CommitReject',
  'ApplicationAccept',
];

const SEGMENT_TYPES = ['MSH', 'PID', 'PV1', 'OBR', 'OBX', 'NK1', 'IN1', 'DG1', 'EVN', 'AL1'];

const ENCODING_TYPES = [
  'ER7',
  'XML',
  'JSON',
  'MLLP',
  'HTTP',
  'HTTPS',
  'TCP',
  'FILE',
  'KAFKA',
  'AMQP',
];

const BUILTIN_MESSAGE_TEMPLATES = [
  {
    code: 'ADT_A01',
    name: 'Patient Admit',
    type: 'ADT',
    event: 'A01',
    segments: ['MSH', 'EVN', 'PID', 'PV1'],
  },
  {
    code: 'ADT_A03',
    name: 'Patient Discharge',
    type: 'ADT',
    event: 'A03',
    segments: ['MSH', 'EVN', 'PID', 'PV1'],
  },
  {
    code: 'ADT_A08',
    name: 'Patient Update',
    type: 'ADT',
    event: 'A08',
    segments: ['MSH', 'EVN', 'PID', 'PV1'],
  },
  {
    code: 'ORM_O01',
    name: 'General Order',
    type: 'ORM',
    event: 'O01',
    segments: ['MSH', 'PID', 'PV1', 'OBR'],
  },
  {
    code: 'ORU_R01',
    name: 'Observation Result',
    type: 'ORU',
    event: 'R01',
    segments: ['MSH', 'PID', 'OBR', 'OBX'],
  },
  {
    code: 'SIU_S12',
    name: 'Schedule Notification',
    type: 'SIU',
    event: 'S12',
    segments: ['MSH', 'PID', 'PV1'],
  },
  {
    code: 'MDM_T02',
    name: 'Document Status',
    type: 'MDM',
    event: 'T02',
    segments: ['MSH', 'PID', 'PV1', 'OBX'],
  },
  {
    code: 'DFT_P03',
    name: 'Charge Detail',
    type: 'DFT',
    event: 'P03',
    segments: ['MSH', 'PID', 'PV1'],
  },
  { code: 'ACK_GENERIC', name: 'Generic ACK', type: 'ACK', event: 'A01', segments: ['MSH', 'MSA'] },
  {
    code: 'ADT_A04',
    name: 'Patient Registration',
    type: 'ADT',
    event: 'A04',
    segments: ['MSH', 'EVN', 'PID', 'PV1', 'NK1'],
  },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const hl7MessageSchema = new Schema(
  {
    messageType: { type: String, enum: MESSAGE_TYPES, required: true },
    triggerEvent: { type: String },
    messageControlId: { type: String, required: true },
    rawMessage: { type: String },
    parsedSegments: [{ segmentType: String, fields: Schema.Types.Mixed }],
    status: { type: String, enum: PROCESSING_STATUSES, default: 'received' },
    encoding: { type: String, enum: ENCODING_TYPES, default: 'ER7' },
    sendingApp: { type: String },
    sendingFacility: { type: String },
    receivingApp: { type: String },
    receivingFacility: { type: String },
    processedAt: { type: Date },
    errors: [{ segment: String, field: String, message: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
hl7MessageSchema.index({ messageType: 1, status: 1 });
hl7MessageSchema.index({ messageControlId: 1 }, { unique: true });

const messageRouteSchema = new Schema(
  {
    name: { type: String, required: true },
    sourceSystem: { type: String, required: true },
    destinationSystem: { type: String, required: true },
    messageTypes: [{ type: String, enum: MESSAGE_TYPES }],
    isActive: { type: Boolean, default: true },
    encoding: { type: String, enum: ENCODING_TYPES, default: 'MLLP' },
    host: { type: String },
    port: { type: Number },
    transformRules: [{ field: String, action: String, value: String }],
    retryPolicy: {
      maxRetries: { type: Number, default: 3 },
      delayMs: { type: Number, default: 5000 },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
messageRouteSchema.index({ sourceSystem: 1, destinationSystem: 1 });
messageRouteSchema.index({ isActive: 1 });

const messageAckSchema = new Schema(
  {
    originalMessageId: { type: Schema.Types.ObjectId, ref: 'DDDHL7Message', required: true },
    ackCode: { type: String, enum: ACK_CODES, required: true },
    ackMessage: { type: String },
    errorCondition: { type: String },
    respondingSystem: { type: String },
    respondedAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
messageAckSchema.index({ originalMessageId: 1 });
messageAckSchema.index({ ackCode: 1 });

const transmissionLogSchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'DDDHL7Message' },
    routeId: { type: Schema.Types.ObjectId, ref: 'DDDMessageRoute' },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    status: { type: String, enum: ['success', 'failure', 'timeout', 'retry'], required: true },
    bytesSent: { type: Number },
    bytesReceived: { type: Number },
    durationMs: { type: Number },
    errorMessage: { type: String },
    remoteAddress: { type: String },
    attemptNumber: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
transmissionLogSchema.index({ messageId: 1, createdAt: -1 });
transmissionLogSchema.index({ status: 1, direction: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDHL7Message =
  mongoose.models.DDDHL7Message || mongoose.model('DDDHL7Message', hl7MessageSchema);
const DDDMessageRoute =
  mongoose.models.DDDMessageRoute || mongoose.model('DDDMessageRoute', messageRouteSchema);
const DDDMessageAck =
  mongoose.models.DDDMessageAck || mongoose.model('DDDMessageAck', messageAckSchema);
const DDDTransmissionLog =
  mongoose.models.DDDTransmissionLog || mongoose.model('DDDTransmissionLog', transmissionLogSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  MESSAGE_TYPES,
  MESSAGE_EVENTS,
  PROCESSING_STATUSES,
  ACK_CODES,
  SEGMENT_TYPES,
  ENCODING_TYPES,
  BUILTIN_MESSAGE_TEMPLATES,
  DDDHL7Message,
  DDDMessageRoute,
  DDDMessageAck,
  DDDTransmissionLog,
};
