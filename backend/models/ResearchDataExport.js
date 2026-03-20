/**
 * Research Data Export Model — نموذج تصدير بيانات البحث
 *
 * Tracks data exports to external research platforms (REDCap, SPSS, Stata, R, etc.)
 * with full audit trail and access control.
 */
const mongoose = require('mongoose');

const researchDataExportSchema = new mongoose.Schema(
  {
    // ─── Core ──────────────────────────────────────────────────────────
    studyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchStudy',
      required: true,
      index: true,
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnonymizedDataset',
      index: true,
    },
    exportName: {
      type: String,
      required: [true, 'اسم التصدير مطلوب'],
      trim: true,
    },

    // ─── Target Platform ───────────────────────────────────────────────
    targetPlatform: {
      type: String,
      enum: [
        'redcap', // REDCap
        'spss', // IBM SPSS
        'stata', // Stata
        'r-studio', // R / RStudio
        'sas', // SAS
        'python-pandas', // Python pandas
        'excel', // Microsoft Excel
        'csv', // Generic CSV
        'json', // JSON
        'xml', // XML
        'fhir', // HL7 FHIR
        'cdisc-odm', // CDISC ODM (clinical data)
        'custom-api', // Custom API endpoint
      ],
      required: true,
    },

    // ─── Export Configuration ──────────────────────────────────────────
    configuration: {
      variables: [String], // selected variables to export
      filters: mongoose.Schema.Types.Mixed, // query filters applied
      dateRange: { from: Date, to: Date },
      includeMetadata: { type: Boolean, default: true },
      includeDataDictionary: { type: Boolean, default: true },
      encoding: { type: String, default: 'UTF-8' },
      delimiter: { type: String, default: ',' }, // for CSV
      missingValueCode: { type: String, default: 'NA' },
      variableLabels: { type: Boolean, default: true },
      valueLabels: { type: Boolean, default: true },
    },

    // ─── API Integration ───────────────────────────────────────────────
    apiIntegration: {
      endpointUrl: String,
      authMethod: { type: String, enum: ['api-key', 'oauth2', 'basic', 'token'] },
      lastSyncDate: Date,
      syncStatus: { type: String, enum: ['pending', 'syncing', 'completed', 'failed'] },
      syncErrors: [String],
    },

    // ─── File Output ───────────────────────────────────────────────────
    output: {
      fileUrl: String,
      fileName: String,
      fileSize: Number,
      checksum: String,
      format: String,
      recordCount: Number,
      variableCount: Number,
      generatedAt: Date,
      expiresAt: Date, // download link expiry
    },

    // ─── Compliance ────────────────────────────────────────────────────
    compliance: {
      ethicsApprovalRef: String,
      dataUseAgreement: {
        signed: Boolean,
        signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        signedDate: Date,
        agreementUrl: String,
      },
      anonymizationVerified: Boolean,
      exportApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      exportApprovalDate: Date,
    },

    // ─── Audit Trail ───────────────────────────────────────────────────
    auditTrail: [
      {
        action: {
          type: String,
          enum: [
            'created',
            'configured',
            'approved',
            'exported',
            'downloaded',
            'revoked',
            'expired',
          ],
        },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        details: String,
        ipAddress: String,
      },
    ],

    // ─── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'pending-approval',
        'approved',
        'processing',
        'completed',
        'failed',
        'expired',
        'revoked',
      ],
      default: 'pending-approval',
      index: true,
    },

    // ─── Metadata ──────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
researchDataExportSchema.index({ studyId: 1, status: 1 });
researchDataExportSchema.index({ targetPlatform: 1 });
researchDataExportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ResearchDataExport', researchDataExportSchema);
