/**
 * Civil Defense Integration Models
 * نماذج قاعدة البيانات للدفاع المدني
 */

const mongoose = require('mongoose');

// ==================== Safety Certificate Schema ====================
const safetyCertificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    required: true,
    unique: true
  },
  referenceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  facilityId: {
    type: String,
    required: true
  },
  facilityName: String,
  buildingType: {
    type: String,
    enum: ['residential', 'commercial', 'industrial', 'healthcare', 'educational'],
    required: true,
  },
  address: {
    street: String,
    city: String,
    region: String,
    postalCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'expired', 'suspended'],
    default: 'pending',
  },
  submissionDate: {
    type: Date,
    default: Date.now,
  },
  issuanceDate: Date,
  expiryDate: Date,
  daysUntilExpiry: Number,
  completionPercentage: {
    type: Number,
    default: 0,
  },
  documentsFiled: [
    {
      documentName: String,
      documentType: String,
      uploadedDate: Date,
      fileSize: Number,
      fileUrl: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      notes: String,
    },
  ],
  requiredDocuments: [String],
  missingDocuments: [String],
  estimatedCompletionDate: Date,
  violations: [
    {
      violationId: String,
      description: String,
      severity: {
        type: String,
        enum: ['critical', 'warning', 'info'],
      },
      requiredAction: String,
    },
  ],
  notes: String,
  contactPerson: {
    name: String,
    phone: String,
    email: String,
  },
  createdBy: String,
  updatedBy: String,
  lastInspectionDate: Date,
  nextInspectionDue: Date,
  renewalHistory: [
    {
      renewalDate: Date,
      expiryDate: Date,
      certificateId: String,
    },
  ],
}, { timestamps: true });

// ==================== Safety Audit Schema ====================
const safetyAuditSchema = new mongoose.Schema({
  auditId: {
    type: String,
    required: true,
    unique: true
  },
  facilityId: {
    type: String,
    required: true
  },
  auditType: {
    type: String,
    enum: ['initial', 'renewal', 'complaint', 'periodic', 'follow-up'],
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'pending_review'],
    default: 'scheduled',
  },
  scheduledDate: {
    type: Date,
    required: true,
  },
  completionDate: Date,
  inspector: {
    name: String,
    id: String,
    phone: String,
    email: String,
  },
  estimatedDuration: String,
  actualDuration: String,
  checklist: [
    {
      checkpointId: String,
      checkpointName: String,
      category: String,
      status: {
        type: String,
        enum: ['pass', 'fail', 'need_improvement'],
      },
      findings: String,
      recommendations: String,
      photosUrl: [String],
    },
  ],
  findings: {
    totalCheckpoints: Number,
    passedCheckpoints: Number,
    failedCheckpoints: Number,
    compliancePercentage: Number,
    criticalIssues: [String],
    minorIssues: [String],
  },
  recommendations: [
    {
      recommendation: String,
      priority: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
      },
      deadline: Date,
    },
  ],
  attachments: [
    {
      fileName: String,
      fileType: String,
      fileUrl: String,
      uploadedDate: Date,
    },
  ],
  certificateRating: {
    type: String,
    enum: ['excellent', 'good', 'acceptable', 'needs_improvement', 'fail'],
  },
  notes: String,
  addendumNotes: String,
  scheduledBy: String,
  createdBy: String,
  updatedBy: String,
  location: String,
}, { timestamps: true });

// ==================== Compliance Status Schema ====================
const complianceStatusSchema = new mongoose.Schema({
  facilityId: {
    type: String,
    required: true,
    unique: true
  },
  overallStatus: {
    type: String,
    enum: ['compliant', 'partial', 'non_compliant', 'unknown'],
    default: 'unknown',
  },
  compliancePercentage: {
    type: Number,
    default: 0,
  },
  lastAuditDate: Date,
  nextExpectedAudit: Date,
  certificateStatus: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'pending'],
  },
  certificateExpiryDate: Date,
  daysUntilExpiry: Number,
  categories: {
    fireSafety: { percentage: Number, status: String },
    electricalSafety: { percentage: Number, status: String },
    structuralIntegrity: { percentage: Number, status: String },
    exitSafety: { percentage: Number, status: String },
    equipmentMaintenance: { percentage: Number, status: String },
    staffTraining: { percentage: Number, status: String },
  },
  violations: [
    {
      violationId: String,
      category: String,
      severity: {
        type: String,
        enum: ['critical', 'warning', 'info'],
      },
      description: String,
      reportedDate: Date,
      status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved'],
      },
      deadline: Date,
      daysRemaining: Number,
      requiredActions: [String],
    },
  ],
  recommendations: [String],
  maintenanceItems: [
    {
      itemName: String,
      lastMaintenanceDate: Date,
      nextMaintenanceDue: Date,
      status: {
        type: String,
        enum: ['good', 'needs_maintenance', 'needs_replacement'],
      },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// ==================== Fire Safety Schema ====================
const fireSafetySchema = new mongoose.Schema({
  fireId: {
    type: String,
    required: true,
    unique: true
  },
  facilityId: {
    type: String,
    required: true
  },
  overallStatus: {
    type: String,
    enum: ['safe', 'unsafe', 'needs_improvement', 'unknown'],
  },
  rating: {
    type: Number,
    min: 0,
    max: 100,
  },
  lastInspectionDate: Date,
  nextInspectionDue: Date,
  fireExtinguishersStatus: {
    total: Number,
    functional: Number,
    needsMaintenance: Number,
    lastMaintenanceDate: Date,
    nextMaintenanceDue: Date,
  },
  fireAlarmsStatus: {
    total: Number,
    functional: Number,
    needsMaintenance: Number,
    testDate: Date,
    nextTestDue: Date,
  },
  emergencyLightsStatus: {
    total: Number,
    functional: Number,
    needsMaintenance: Number,
    testDate: Date,
  },
  exitSignsStatus: {
    total: Number,
    functional: Number,
    needsMaintenance: Number,
  },
  sprinklerSystemStatus: {
    installed: Boolean,
    functional: Boolean,
    lastInspection: Date,
    nextInspection: Date,
  },
  certificates: [
    {
      certType: String,
      issueDate: Date,
      expiryDate: Date,
      issuingAuthority: String,
      certificateUrl: String,
    },
  ],
  maintenanceRecords: [
    {
      maintenanceType: String,
      maintenanceDate: Date,
      completedBy: String,
      notes: String,
      nextScheduledMaintenance: Date,
    },
  ],
  issues: [
    {
      issueId: String,
      description: String,
      severity: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
      },
      reportedDate: Date,
      deadline: Date,
      status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved'],
      },
      resolutionDate: Date,
    },
  ],
  createdBy: String,
  updatedBy: String,
}, { timestamps: true });

// ==================== Emergency Drill Schema ====================
const emergencyDrillSchema = new mongoose.Schema({
  drillId: {
    type: String,
    required: true,
    unique: true
  },
  facilityId: {
    type: String,
    required: true
  },
  drillType: {
    type: String,
    enum: ['fire_evacuation', 'earthquake', 'medical_emergency', 'hazmat', 'other'],
    required: true,
  },
  scenario: String,
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  scheduledDate: {
    type: Date,
    required: true,
  },
  scheduledTime: String,
  completionDate: Date,
  durationMinutes: Number,
  expectedParticipants: Number,
  actualParticipants: Number,
  coordinator: {
    name: String,
    phone: String,
    email: String,
  },
  observers: [
    {
      name: String,
      role: String,
      contactInfo: String,
    },
  ],
  results: {
    totalParticipants: Number,
    averageEvacuationTime: String,
    fastestEvacuationTime: String,
    slowestEvacuationTime: String,
    issues: [
      {
        description: String,
        severity: String,
        suggestedSolution: String,
      },
    ],
    recommendations: [String],
    performanceRating: {
      type: String,
      enum: ['excellent', 'good', 'satisfactory', 'needs_improvement'],
    },
  },
  attachments: [
    {
      fileName: String,
      fileType: String,
      fileUrl: String,
    },
  ],
  notes: String,
  createdBy: String,
  updatedBy: String,
}, { timestamps: true });

// ==================== Civil Defense Documents Schema ====================
const civilDefenseDocumentsSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true
  },
  facilityId: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    enum: [
      'floor_plan',
      'fire_safety_plan',
      'evacuation_plan',
      'maintenance_record',
      'inspection_report',
      'certificate',
      'equipment_specification',
      'training_record',
      'incident_report',
      'other',
    ],
    required: true,
  },
  documentName: String,
  description: String,
  fileUrl: String,
  fileSize: Number,
  uploadedDate: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: String,
  expiryDate: Date,
  status: {
    type: String,
    enum: ['active', 'expired', 'archived'],
    default: 'active',
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'verified', 'rejected'],
    default: 'unverified',
  },
  verifiedBy: String,
  verificationDate: Date,
  tags: [String],
  category: String,
  version: Number,
  previousVersionId: String,
}, { timestamps: true });

// Create Models
const SafetyCertificate = mongoose.model('SafetyCertificate', safetyCertificateSchema);
const SafetyAudit = mongoose.model('SafetyAudit', safetyAuditSchema);
const ComplianceStatus = mongoose.model('ComplianceStatus', complianceStatusSchema);
const FireSafety = mongoose.model('FireSafety', fireSafetySchema);
const EmergencyDrill = mongoose.model('EmergencyDrill', emergencyDrillSchema);
const CivilDefenseDocuments = mongoose.model('CivilDefenseDocuments', civilDefenseDocumentsSchema);

module.exports = {
  SafetyCertificate,
  SafetyAudit,
  ComplianceStatus,
  FireSafety,
  EmergencyDrill,
  CivilDefenseDocuments,
};
