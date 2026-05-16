'use strict';

/**
 * EmployeeDocument.js — Phase 30 extension.
 *
 * Centralized vault for employee-bound documents (ID, iqama, contract,
 * certifications, training cert, payslips PDF, etc.). Per-doc expiry
 * tracking + RBAC (only HR + the employee themselves can read).
 *
 * Storage strategy: this model stores METADATA + a `fileUrl` pointing
 * to wherever the actual file lives (S3, MinIO, NAS). The model itself
 * is intentionally agnostic about storage so it survives swaps.
 *
 * The workflow engine's `certification-expiring-soon` rule already
 * reads from a separate Certification model — this vault is broader:
 * it covers EVERY document type with an expiry, plus non-expiring
 * documents (IDs, contracts).
 */

const mongoose = require('mongoose');

const DOC_TYPES = [
  'national_id',
  'iqama',
  'passport',
  'driving_license',
  'employment_contract',
  'amendment',
  'job_offer',
  'resignation',
  'termination',
  'cv',
  'medical_certificate',
  'training_certificate',
  'professional_certificate',
  'background_check',
  'reference_letter',
  'payslip',
  'tax_form',
  'visa',
  'other',
];

const EmployeeDocumentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    docType: { type: String, enum: DOC_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500 },
    fileUrl: { type: String, trim: true, maxlength: 1000 },
    fileMimeType: { type: String, trim: true, maxlength: 100 },
    fileSizeBytes: { type: Number, default: 0 },
    issueDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null, index: true },
    issuingAuthority: { type: String, trim: true, maxlength: 200 },
    documentNumber: { type: String, trim: true, maxlength: 100 },
    isConfidential: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'replaced', 'archived'],
      default: 'active',
      index: true,
    },
    tags: { type: [String], default: [] },
    uploadedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedByName: { type: String, default: null },
  },
  { timestamps: true, collection: 'hr_employee_documents' }
);

EmployeeDocumentSchema.index({ employeeId: 1, docType: 1, status: 1 });
EmployeeDocumentSchema.index({ expiryDate: 1, status: 1 });

EmployeeDocumentSchema.statics.DOC_TYPES = DOC_TYPES;

module.exports =
  mongoose.models.EmployeeDocument || mongoose.model('EmployeeDocument', EmployeeDocumentSchema);
