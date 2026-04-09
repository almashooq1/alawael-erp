'use strict';
/**
 * DDD Patient Portal Service
 * ──────────────────────────
 * Phase 31 – Patient Engagement & Digital Health (Module 1/4)
 *
 * Manages patient portal accounts, secure messaging, appointment self-service,
 * document sharing, and patient preferences.
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
class PatientPortal {
  async createAccount(data) {
    return DDDPortalAccount.create(data);
  }
  async listAccounts(filter = {}, page = 1, limit = 20) {
    return DDDPortalAccount.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getAccountById(id) {
    return DDDPortalAccount.findById(id).lean();
  }
  async updateAccount(id, data) {
    return DDDPortalAccount.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async sendMessage(data) {
    return DDDSecureMessage.create(data);
  }
  async listMessages(filter = {}, page = 1, limit = 20) {
    return DDDSecureMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async shareDocument(data) {
    return DDDSharedDocument.create(data);
  }
  async listDocuments(filter = {}, page = 1, limit = 20) {
    return DDDSharedDocument.find(filter)
      .sort({ sharedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async setPreference(data) {
    return DDDPatientPreference.findOneAndUpdate(
      { portalAccountId: data.portalAccountId, category: data.category, key: data.key },
      data,
      { upsert: true, new: true }
    ).lean();
  }
  async getPreferences(portalAccountId) {
    return DDDPatientPreference.find({ portalAccountId }).lean();
  }

  async getPortalStats() {
    const [total, active, messages, documents] = await Promise.all([
      DDDPortalAccount.countDocuments(),
      DDDPortalAccount.countDocuments({ status: 'active' }),
      DDDSecureMessage.countDocuments(),
      DDDSharedDocument.countDocuments(),
    ]);
    return { total, active, messages, documents };
  }

  async healthCheck() {
    const [accounts, messages, documents, preferences] = await Promise.all([
      DDDPortalAccount.countDocuments(),
      DDDSecureMessage.countDocuments(),
      DDDSharedDocument.countDocuments(),
      DDDPatientPreference.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'PatientPortal',
      counts: { accounts, messages, documents, preferences },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createPatientPortalRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new PatientPortal();

  router.get('/patient-portal/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/patient-portal/accounts', async (req, res) => {
    try {
      res.status(201).json(await svc.createAccount(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/patient-portal/accounts', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listAccounts(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/patient-portal/accounts/:id', async (req, res) => {
    try {
      res.json(await svc.getAccountById(req.params.id));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/patient-portal/accounts/:id', async (req, res) => {
    try {
      res.json(await svc.updateAccount(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/patient-portal/messages', async (req, res) => {
    try {
      res.status(201).json(await svc.sendMessage(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/patient-portal/messages', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listMessages(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/patient-portal/documents', async (req, res) => {
    try {
      res.status(201).json(await svc.shareDocument(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/patient-portal/documents', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listDocuments(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/patient-portal/preferences', async (req, res) => {
    try {
      res.json(await svc.setPreference(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/patient-portal/preferences/:accountId', async (req, res) => {
    try {
      res.json(await svc.getPreferences(req.params.accountId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/patient-portal/stats', async (_req, res) => {
    try {
      res.json(await svc.getPortalStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

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
  PatientPortal,
  createPatientPortalRouter,
};
