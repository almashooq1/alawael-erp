'use strict';
/**
 * DddPatientPortal — Mongoose Models & Constants
 * Auto-extracted from services/dddPatientPortal.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const PORTAL_ACCOUNT_STATUSES = [
  'active',
  'inactive',
  'pending_verification',
  'suspended',
  'locked',
  'deactivated',
  'expired',
  'awaiting_consent',
  'restricted',
  'archived',
];

const MESSAGE_CATEGORIES = [
  'appointment',
  'prescription',
  'lab_results',
  'referral',
  'billing',
  'general_inquiry',
  'clinical_question',
  'feedback',
  'emergency',
  'follow_up',
  'care_coordination',
  'administrative',
];

const NOTIFICATION_CHANNELS = [
  'email',
  'sms',
  'push_notification',
  'in_app',
  'whatsapp',
  'voice_call',
  'portal_inbox',
  'patient_app',
  'family_app',
  'broadcast',
];

const DOCUMENT_TYPES = [
  'lab_report',
  'imaging_report',
  'discharge_summary',
  'prescription',
  'referral_letter',
  'consent_form',
  'care_plan',
  'progress_note',
  'invoice',
  'insurance_claim',
];

const PREFERENCE_CATEGORIES = [
  'communication',
  'language',
  'accessibility',
  'appointment',
  'privacy',
  'notification',
  'dietary',
  'cultural',
  'religious',
  'transport',
];

const ACCESS_FEATURES = [
  'view_appointments',
  'book_appointments',
  'cancel_appointments',
  'view_results',
  'message_provider',
  'view_medications',
  'request_refill',
  'view_bills',
  'update_profile',
  'proxy_access',
];

const BUILTIN_PORTAL_CONFIGS = [
  { code: 'ADULT_STD', name: 'Adult Standard Portal', features: 10 },
  { code: 'PEDS_PARENT', name: 'Pediatric Parent Portal', features: 8 },
  { code: 'ELDER_SIMPLE', name: 'Elderly Simplified Portal', features: 6 },
  { code: 'REHAB_PT', name: 'Rehabilitation Patient Portal', features: 9 },
  { code: 'MENTAL_HLTH', name: 'Mental Health Portal', features: 7 },
  { code: 'CHRONIC_MGT', name: 'Chronic Disease Management Portal', features: 10 },
  { code: 'POST_SURG', name: 'Post-Surgery Recovery Portal', features: 8 },
  { code: 'FAMILY_CARE', name: 'Family Caregiver Portal', features: 9 },
  { code: 'TELE_PORTAL', name: 'Telehealth Patient Portal', features: 8 },
  { code: 'VIP_PORTAL', name: 'VIP Patient Portal', features: 10 },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const portalAccountSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    status: { type: String, enum: PORTAL_ACCOUNT_STATUSES, default: 'pending_verification' },
    username: { type: String },
    email: { type: String },
    phone: { type: String },
    preferredLanguage: { type: String, default: 'ar' },
    enabledFeatures: [{ type: String, enum: ACCESS_FEATURES }],
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 },
    notificationPrefs: {
      channels: [{ type: String, enum: NOTIFICATION_CHANNELS }],
      quietHoursStart: String,
      quietHoursEnd: String,
    },
    proxyAccess: [{ userId: Schema.Types.ObjectId, relationship: String, permissions: [String] }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
portalAccountSchema.index({ beneficiaryId: 1 }, { unique: true });
portalAccountSchema.index({ status: 1 });

const secureMessageSchema = new Schema(
  {
    portalAccountId: { type: Schema.Types.ObjectId, ref: 'DDDPortalAccount', required: true },
    category: { type: String, enum: MESSAGE_CATEGORIES, default: 'general_inquiry' },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
    isFromPatient: { type: Boolean, default: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    attachments: [{ name: String, url: String, mimeType: String }],
    parentMessageId: { type: Schema.Types.ObjectId, ref: 'DDDSecureMessage' },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
secureMessageSchema.index({ portalAccountId: 1, createdAt: -1 });
secureMessageSchema.index({ recipientId: 1, isRead: 1 });

const sharedDocumentSchema = new Schema(
  {
    portalAccountId: { type: Schema.Types.ObjectId, ref: 'DDDPortalAccount', required: true },
    documentType: { type: String, enum: DOCUMENT_TYPES, required: true },
    title: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String, required: true },
    mimeType: { type: String },
    fileSize: { type: Number },
    sharedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sharedAt: { type: Date, default: Date.now },
    viewedAt: { type: Date },
    expiresAt: { type: Date },
    isConfidential: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
sharedDocumentSchema.index({ portalAccountId: 1, documentType: 1 });

const patientPreferenceSchema = new Schema(
  {
    portalAccountId: { type: Schema.Types.ObjectId, ref: 'DDDPortalAccount', required: true },
    category: { type: String, enum: PREFERENCE_CATEGORIES, required: true },
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
    updatedBy: { type: String, enum: ['patient', 'provider', 'system'], default: 'patient' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
patientPreferenceSchema.index({ portalAccountId: 1, category: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDPortalAccount =
  mongoose.models.DDDPortalAccount || mongoose.model('DDDPortalAccount', portalAccountSchema);
const DDDSecureMessage =
  mongoose.models.DDDSecureMessage || mongoose.model('DDDSecureMessage', secureMessageSchema);
const DDDSharedDocument =
  mongoose.models.DDDSharedDocument || mongoose.model('DDDSharedDocument', sharedDocumentSchema);
const DDDPatientPreference =
  mongoose.models.DDDPatientPreference ||
  mongoose.model('DDDPatientPreference', patientPreferenceSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  PORTAL_ACCOUNT_STATUSES,
  MESSAGE_CATEGORIES,
  NOTIFICATION_CHANNELS,
  DOCUMENT_TYPES,
  PREFERENCE_CATEGORIES,
  ACCESS_FEATURES,
  BUILTIN_PORTAL_CONFIGS,
  DDDPortalAccount,
  DDDSecureMessage,
  DDDSharedDocument,
  DDDPatientPreference,
};
