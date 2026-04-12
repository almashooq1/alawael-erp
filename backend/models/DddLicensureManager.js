'use strict';
/**
 * DddLicensureManager — Mongoose Models & Constants
 * Auto-extracted from services/dddLicensureManager.js
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
};
