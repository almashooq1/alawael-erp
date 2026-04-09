'use strict';
/**
 * DDD Licensure Manager Service
 * ──────────────────────────────
 * Phase 30 – Regulatory Compliance & Accreditation (Module 4/4)
 *
 * Manages institutional licenses, facility permits, operational certifications,
 * renewal tracking, and regulatory reporting requirements.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const LICENSE_TYPES = [
  'facility_license',
  'operating_permit',
  'medical_license',
  'pharmacy_license',
  'laboratory_license',
  'radiation_license',
  'food_service_permit',
  'fire_safety_certificate',
  'building_occupancy',
  'environmental_permit',
  'waste_disposal_license',
  'telehealth_license',
];

const LICENSE_STATUSES = [
  'active',
  'pending_renewal',
  'expired',
  'suspended',
  'revoked',
  'under_review',
  'provisional',
  'approved',
  'denied',
  'cancelled',
];

const REGULATORY_BODIES = [
  'ministry_of_health',
  'civil_defense',
  'municipality',
  'environmental_authority',
  'food_drug_authority',
  'labor_ministry',
  'communications_authority',
  'cybersecurity_authority',
  'nuclear_authority',
  'medical_cities',
  'health_cluster',
  'regional_health',
];

const RENEWAL_STATUSES = [
  'not_due',
  'upcoming',
  'application_submitted',
  'under_review',
  'approved',
  'payment_pending',
  'renewed',
  'rejected',
  'appeal_filed',
  'expired',
];

const REPORTING_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'biennial',
  'upon_request',
  'event_driven',
  'continuous',
];

const DOCUMENT_CATEGORIES = [
  'license_certificate',
  'renewal_application',
  'inspection_report',
  'compliance_letter',
  'corrective_action_plan',
  'fee_receipt',
  'correspondence',
  'regulatory_notice',
  'appeal_document',
  'supporting_evidence',
];

const BUILTIN_LICENSE_TEMPLATES = [
  {
    code: 'FAC_LIC',
    name: 'Facility Operating License',
    renewalMonths: 12,
    body: 'ministry_of_health',
  },
  { code: 'FIRE_CERT', name: 'Fire Safety Certificate', renewalMonths: 12, body: 'civil_defense' },
  { code: 'PHARM_LIC', name: 'Pharmacy License', renewalMonths: 12, body: 'ministry_of_health' },
  { code: 'LAB_LIC', name: 'Laboratory License', renewalMonths: 24, body: 'ministry_of_health' },
  { code: 'FOOD_PERM', name: 'Food Service Permit', renewalMonths: 12, body: 'municipality' },
  { code: 'RAD_LIC', name: 'Radiation License', renewalMonths: 12, body: 'nuclear_authority' },
  {
    code: 'WASTE_LIC',
    name: 'Medical Waste Disposal License',
    renewalMonths: 12,
    body: 'environmental_authority',
  },
  {
    code: 'BLDG_OCC',
    name: 'Building Occupancy Certificate',
    renewalMonths: 60,
    body: 'municipality',
  },
  {
    code: 'TELE_LIC',
    name: 'Telehealth Service License',
    renewalMonths: 24,
    body: 'ministry_of_health',
  },
  {
    code: 'ENV_PERM',
    name: 'Environmental Compliance Permit',
    renewalMonths: 12,
    body: 'environmental_authority',
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const institutionalLicenseSchema = new Schema(
  {
    type: { type: String, enum: LICENSE_TYPES, required: true },
    status: { type: String, enum: LICENSE_STATUSES, default: 'pending_renewal' },
    licenseNumber: { type: String },
    name: { type: String, required: true },
    issuingBody: { type: String, enum: REGULATORY_BODIES, required: true },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    renewalDate: { type: Date },
    facilityName: { type: String },
    facilityAddress: { type: String },
    conditions: [{ type: String }],
    fees: { amount: Number, currency: { type: String, default: 'SAR' }, paidDate: Date },
    documentUrl: { type: String },
    contactPerson: { name: String, phone: String, email: String },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
institutionalLicenseSchema.index({ type: 1, status: 1 });
institutionalLicenseSchema.index({ expiryDate: 1 });

const renewalTrackingSchema = new Schema(
  {
    licenseId: { type: Schema.Types.ObjectId, ref: 'DDDInstitutionalLicense', required: true },
    renewalStatus: { type: String, enum: RENEWAL_STATUSES, default: 'not_due' },
    applicationDate: { type: Date },
    submittedDate: { type: Date },
    approvedDate: { type: Date },
    newExpiryDate: { type: Date },
    fees: { amount: Number, currency: { type: String, default: 'SAR' } },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    documents: [
      { category: { type: String, enum: DOCUMENT_CATEGORIES }, url: String, uploadDate: Date },
    ],
    timeline: [{ date: Date, action: String, notes: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
renewalTrackingSchema.index({ licenseId: 1, renewalStatus: 1 });

const regulatoryReportSchema = new Schema(
  {
    title: { type: String, required: true },
    regulatoryBody: { type: String, enum: REGULATORY_BODIES, required: true },
    frequency: { type: String, enum: REPORTING_FREQUENCIES },
    dueDate: { type: Date, required: true },
    submittedDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'accepted', 'rejected', 'overdue', 'draft'],
      default: 'pending',
    },
    preparedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reportUrl: { type: String },
    dataPoints: { type: Schema.Types.Mixed },
    feedback: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
regulatoryReportSchema.index({ regulatoryBody: 1, dueDate: -1 });

const licenseAlertSchema = new Schema(
  {
    licenseId: { type: Schema.Types.ObjectId, ref: 'DDDInstitutionalLicense', required: true },
    alertType: {
      type: String,
      enum: [
        'expiry_warning',
        'renewal_due',
        'document_required',
        'inspection_scheduled',
        'compliance_issue',
      ],
    },
    severity: { type: String, enum: ['info', 'warning', 'critical'] },
    message: { type: String, required: true },
    triggerDate: { type: Date, default: Date.now },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    isResolved: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
licenseAlertSchema.index({ licenseId: 1, isResolved: 1 });
licenseAlertSchema.index({ severity: 1, isResolved: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDInstitutionalLicense =
  mongoose.models.DDDInstitutionalLicense ||
  mongoose.model('DDDInstitutionalLicense', institutionalLicenseSchema);
const DDDRenewalTracking =
  mongoose.models.DDDRenewalTracking || mongoose.model('DDDRenewalTracking', renewalTrackingSchema);
const DDDRegulatoryReport =
  mongoose.models.DDDRegulatoryReport ||
  mongoose.model('DDDRegulatoryReport', regulatoryReportSchema);
const DDDLicenseAlert =
  mongoose.models.DDDLicenseAlert || mongoose.model('DDDLicenseAlert', licenseAlertSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class LicensureManager {
  /* ── Licenses ── */
  async createLicense(data) {
    return DDDInstitutionalLicense.create(data);
  }
  async listLicenses(filter = {}, page = 1, limit = 20) {
    return DDDInstitutionalLicense.find(filter)
      .sort({ expiryDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getLicenseById(id) {
    return DDDInstitutionalLicense.findById(id).lean();
  }
  async updateLicense(id, data) {
    return DDDInstitutionalLicense.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── Renewals ── */
  async createRenewal(data) {
    return DDDRenewalTracking.create(data);
  }
  async listRenewals(filter = {}, page = 1, limit = 20) {
    return DDDRenewalTracking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateRenewal(id, data) {
    return DDDRenewalTracking.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── Reports ── */
  async createReport(data) {
    return DDDRegulatoryReport.create(data);
  }
  async listReports(filter = {}, page = 1, limit = 20) {
    return DDDRegulatoryReport.find(filter)
      .sort({ dueDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateReport(id, data) {
    return DDDRegulatoryReport.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── Alerts ── */
  async createAlert(data) {
    return DDDLicenseAlert.create(data);
  }
  async listAlerts(filter = {}) {
    return DDDLicenseAlert.find(filter).sort({ triggerDate: -1 }).lean();
  }
  async acknowledgeAlert(id, userId) {
    return DDDLicenseAlert.findByIdAndUpdate(
      id,
      { acknowledgedBy: userId, acknowledgedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Expiring Licenses ── */
  async getExpiringLicenses(daysAhead = 60) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return DDDInstitutionalLicense.find({ expiryDate: { $lte: cutoff }, status: 'active' })
      .sort({ expiryDate: 1 })
      .lean();
  }

  /* ── Analytics ── */
  async getLicenseSummary() {
    const [total, active, expired, pending] = await Promise.all([
      DDDInstitutionalLicense.countDocuments(),
      DDDInstitutionalLicense.countDocuments({ status: 'active' }),
      DDDInstitutionalLicense.countDocuments({ status: 'expired' }),
      DDDInstitutionalLicense.countDocuments({ status: 'pending_renewal' }),
    ]);
    return { total, active, expired, pendingRenewal: pending };
  }

  /* ── Health ── */
  async healthCheck() {
    const [licenses, renewals, reports, alerts] = await Promise.all([
      DDDInstitutionalLicense.countDocuments(),
      DDDRenewalTracking.countDocuments(),
      DDDRegulatoryReport.countDocuments(),
      DDDLicenseAlert.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'LicensureManager',
      counts: { licenses, renewals, reports, alerts },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createLicensureManagerRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new LicensureManager();

  router.get('/licensure-manager/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/licensure-manager/licenses', async (req, res) => {
    try {
      res.status(201).json(await svc.createLicense(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/licensure-manager/licenses', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listLicenses(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/licensure-manager/licenses/expiring', async (req, res) => {
    try {
      res.json(await svc.getExpiringLicenses(+(req.query.days || 60)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/licensure-manager/licenses/:id', async (req, res) => {
    try {
      res.json(await svc.getLicenseById(req.params.id));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/licensure-manager/licenses/:id', async (req, res) => {
    try {
      res.json(await svc.updateLicense(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/licensure-manager/renewals', async (req, res) => {
    try {
      res.status(201).json(await svc.createRenewal(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/licensure-manager/renewals', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listRenewals(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/licensure-manager/renewals/:id', async (req, res) => {
    try {
      res.json(await svc.updateRenewal(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/licensure-manager/reports', async (req, res) => {
    try {
      res.status(201).json(await svc.createReport(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/licensure-manager/reports', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listReports(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/licensure-manager/reports/:id', async (req, res) => {
    try {
      res.json(await svc.updateReport(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/licensure-manager/alerts', async (req, res) => {
    try {
      res.json(await svc.listAlerts(req.query));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/licensure-manager/stats', async (_req, res) => {
    try {
      res.json(await svc.getLicenseSummary());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  LICENSE_TYPES,
  LICENSE_STATUSES,
  REGULATORY_BODIES,
  RENEWAL_STATUSES,
  REPORTING_FREQUENCIES,
  DOCUMENT_CATEGORIES,
  BUILTIN_LICENSE_TEMPLATES,
  DDDInstitutionalLicense,
  DDDRenewalTracking,
  DDDRegulatoryReport,
  DDDLicenseAlert,
  LicensureManager,
  createLicensureManagerRouter,
};
