/**
 * Enterprise Pro Plus Models — نماذج الميزات المؤسسية الاحترافية المتقدمة
 *
 * 6 new enterprise modules × multiple schemas = comprehensive coverage
 *
 * Modules:
 *  1. Talent Acquisition & ATS        — التوظيف واستقطاب المواهب
 *  2. Facility & Real Estate Mgmt     — إدارة المرافق والعقارات
 *  3. Vendor & Supplier Management    — إدارة علاقات الموردين
 *  4. IT Service Management (ITSM)    — إدارة خدمات تقنية المعلومات
 *  5. EHS — Safety & Health           — السلامة والصحة المهنية والبيئة
 *  6. Strategic Planning & OKR        — التخطيط الاستراتيجي وإدارة الأهداف
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const logger = require('../utils/logger');

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  1. TALENT ACQUISITION & ATS — التوظيف واستقطاب المواهب                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const JobPostingSchema = new Schema(
  {
    title: { type: String, required: true },
    titleAr: { type: String },
    department: { type: String, required: true },
    location: { type: String },
    type: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'internship', 'remote'],
      default: 'full_time',
    },
    level: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'manager', 'director', 'executive'],
      default: 'mid',
    },
    description: { type: String },
    requirements: [String],
    benefits: [String],
    salaryRange: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'SAR' },
    },
    skills: [{ name: String, required: { type: Boolean, default: false } }],
    status: {
      type: String,
      enum: ['draft', 'open', 'paused', 'closed', 'filled'],
      default: 'draft',
    },
    publishedAt: Date,
    closingDate: Date,
    maxApplicants: { type: Number, default: 0 },
    hiringManager: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
JobPostingSchema.index({ status: 1, department: 1 });
JobPostingSchema.index({ closingDate: 1 });

const CandidateSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    resumeUrl: { type: String },
    linkedinUrl: { type: String },
    currentCompany: String,
    currentTitle: String,
    yearsOfExperience: Number,
    education: [{ degree: String, institution: String, year: Number }],
    skills: [String],
    source: {
      type: String,
      enum: ['website', 'linkedin', 'referral', 'agency', 'job_board', 'walk_in', 'other'],
      default: 'website',
    },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    tags: [String],
    status: {
      type: String,
      enum: ['active', 'blacklisted', 'hired', 'archived'],
      default: 'active',
    },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
CandidateSchema.index({ email: 1 });
CandidateSchema.index({ status: 1, source: 1 });

const JobApplicationSchema = new Schema(
  {
    jobPosting: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true },
    candidate: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    stage: {
      type: String,
      enum: [
        'applied',
        'screening',
        'phone_interview',
        'technical_test',
        'interview',
        'final_interview',
        'offer',
        'hired',
        'rejected',
        'withdrawn',
      ],
      default: 'applied',
    },
    rating: { type: Number, min: 1, max: 5 },
    interviewScores: [
      {
        interviewer: { type: Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, min: 1, max: 10 },
        feedback: String,
        date: Date,
      },
    ],
    offerDetails: {
      salary: Number,
      startDate: Date,
      expiryDate: Date,
      status: { type: String, enum: ['pending', 'accepted', 'rejected', 'expired'] },
    },
    rejectionReason: String,
    appliedAt: { type: Date, default: Date.now },
    stageHistory: [
      {
        stage: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    assignedRecruiter: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
JobApplicationSchema.index({ jobPosting: 1, stage: 1 });
JobApplicationSchema.index({ candidate: 1 });

const InterviewScheduleSchema = new Schema(
  {
    application: { type: Schema.Types.ObjectId, ref: 'JobApplication', required: true },
    type: {
      type: String,
      enum: ['phone', 'video', 'onsite', 'panel', 'technical'],
      required: true,
    },
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 60 },
    location: String,
    meetingLink: String,
    interviewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
    feedback: String,
    overallScore: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  2. FACILITY & REAL ESTATE MANAGEMENT — إدارة المرافق والعقارات            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const FacilitySchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    type: {
      type: String,
      enum: ['building', 'floor', 'wing', 'room', 'parking', 'outdoor', 'warehouse', 'lab'],
      required: true,
    },
    parentFacility: { type: Schema.Types.ObjectId, ref: 'Facility' },
    address: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: { type: String, default: 'SA' },
    },
    capacity: Number,
    area: { value: Number, unit: { type: String, default: 'sqm' } },
    status: {
      type: String,
      enum: ['active', 'under_maintenance', 'closed', 'planned'],
      default: 'active',
    },
    amenities: [String],
    contactPerson: { name: String, phone: String, email: String },
    operatingHours: { start: String, end: String, workDays: [Number] },
    photos: [String],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
FacilitySchema.index({ type: 1, status: 1 });

const SpaceBookingSchema = new Schema(
  {
    facility: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
    title: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['meeting', 'training', 'event', 'interview', 'workshop', 'other'],
      default: 'meeting',
    },
    bookedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isRecurring: { type: Boolean, default: false },
    recurrence: { pattern: { type: String, enum: ['daily', 'weekly', 'monthly'] }, endDate: Date },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    equipment: [String],
    notes: String,
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
SpaceBookingSchema.index({ facility: 1, startTime: 1, endTime: 1 });

const LeaseContractSchema = new Schema(
  {
    facility: { type: Schema.Types.ObjectId, ref: 'Facility' },
    propertyName: { type: String, required: true },
    type: { type: String, enum: ['lease', 'rent', 'own', 'sublease'], default: 'lease' },
    landlord: { name: String, phone: String, email: String, company: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    monthlyRent: { amount: Number, currency: { type: String, default: 'SAR' } },
    deposit: Number,
    paymentTerms: String,
    autoRenew: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'expired', 'terminated', 'pending_renewal'],
      default: 'active',
    },
    documents: [{ name: String, url: String, uploadedAt: Date }],
    renewalReminder: { type: Number, default: 90 },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
LeaseContractSchema.index({ endDate: 1, status: 1 });

const UtilityReadingSchema = new Schema(
  {
    facility: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
    type: {
      type: String,
      enum: ['electricity', 'water', 'gas', 'internet', 'hvac', 'sewage'],
      required: true,
    },
    readingDate: { type: Date, required: true },
    currentReading: { type: Number, required: true },
    previousReading: Number,
    consumption: Number,
    cost: { amount: Number, currency: { type: String, default: 'SAR' } },
    unit: String,
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
UtilityReadingSchema.index({ facility: 1, type: 1, readingDate: -1 });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  3. VENDOR & SUPPLIER MANAGEMENT — إدارة علاقات الموردين                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const VendorSchema = new Schema(
  {
    companyName: { type: String, required: true },
    companyNameAr: String,
    registrationNumber: String,
    vatNumber: String,
    category: {
      type: String,
      enum: [
        'supplier',
        'contractor',
        'consultant',
        'service_provider',
        'manufacturer',
        'distributor',
      ],
      default: 'supplier',
    },
    industry: String,
    contact: {
      primaryName: String,
      primaryEmail: String,
      primaryPhone: String,
      secondaryName: String,
      secondaryEmail: String,
    },
    address: {
      street: String,
      city: String,
      region: String,
      country: { type: String, default: 'SA' },
      postalCode: String,
    },
    bankDetails: { bankName: String, accountNumber: String, iban: String, swiftCode: String },
    qualificationStatus: {
      type: String,
      enum: [
        'pending',
        'qualified',
        'conditionally_qualified',
        'disqualified',
        'suspended',
        'blacklisted',
      ],
      default: 'pending',
    },
    rating: {
      overall: { type: Number, min: 0, max: 5, default: 0 },
      quality: Number,
      delivery: Number,
      pricing: Number,
      communication: Number,
    },
    certifications: [{ name: String, issuer: String, expiryDate: Date }],
    documents: [{ name: String, url: String, type: String }],
    tags: [String],
    preferredVendor: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
VendorSchema.index({ qualificationStatus: 1, category: 1 });
VendorSchema.index({ 'rating.overall': -1 });

const RFQSchema = new Schema(
  {
    rfqNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: String,
    category: String,
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: String,
        specifications: String,
        estimatedUnitPrice: Number,
      },
    ],
    invitedVendors: [{ type: Schema.Types.ObjectId, ref: 'Vendor' }],
    submissions: [
      {
        vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
        totalPrice: Number,
        deliveryDays: Number,
        notes: String,
        attachments: [String],
        submittedAt: Date,
        score: Number,
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'published', 'evaluation', 'awarded', 'cancelled'],
      default: 'draft',
    },
    publishDate: Date,
    deadline: Date,
    awardedTo: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    budget: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
RFQSchema.index({ status: 1, deadline: 1 });

const VendorEvaluationSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    period: { start: Date, end: Date },
    evaluator: { type: Schema.Types.ObjectId, ref: 'User' },
    scores: {
      quality: {
        score: { type: Number, min: 1, max: 10 },
        weight: { type: Number, default: 30 },
        comments: String,
      },
      delivery: {
        score: { type: Number, min: 1, max: 10 },
        weight: { type: Number, default: 25 },
        comments: String,
      },
      pricing: {
        score: { type: Number, min: 1, max: 10 },
        weight: { type: Number, default: 20 },
        comments: String,
      },
      communication: {
        score: { type: Number, min: 1, max: 10 },
        weight: { type: Number, default: 15 },
        comments: String,
      },
      compliance: {
        score: { type: Number, min: 1, max: 10 },
        weight: { type: Number, default: 10 },
        comments: String,
      },
    },
    weightedScore: Number,
    recommendation: {
      type: String,
      enum: ['continue', 'improve', 'probation', 'terminate'],
      default: 'continue',
    },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
VendorEvaluationSchema.index({ vendor: 1, createdAt: -1 });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  4. IT SERVICE MANAGEMENT (ITSM) — إدارة خدمات تقنية المعلومات              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const ITIncidentSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'hardware',
        'software',
        'network',
        'security',
        'email',
        'access',
        'printing',
        'phone',
        'other',
      ],
      required: true,
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    impact: {
      type: String,
      enum: ['organization', 'department', 'group', 'individual'],
      default: 'individual',
    },
    urgency: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    status: {
      type: String,
      enum: ['new', 'assigned', 'in_progress', 'pending', 'resolved', 'closed', 'reopened'],
      default: 'new',
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: String,
    affectedAsset: { type: Schema.Types.ObjectId, ref: 'ITAsset' },
    resolution: {
      description: String,
      resolvedAt: Date,
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    sla: {
      targetResponse: Number,
      targetResolution: Number,
      breached: { type: Boolean, default: false },
    },
    comments: [
      {
        author: { type: Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now },
        isInternal: { type: Boolean, default: false },
      },
    ],
    attachments: [{ name: String, url: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
ITIncidentSchema.index({ status: 1, priority: 1 });
ITIncidentSchema.index({ assignedTo: 1, status: 1 });

const ITAssetSchema = new Schema(
  {
    assetTag: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'laptop',
        'desktop',
        'monitor',
        'printer',
        'server',
        'switch',
        'router',
        'phone',
        'tablet',
        'projector',
        'ups',
        'software_license',
        'other',
      ],
      required: true,
    },
    manufacturer: String,
    model: String,
    serialNumber: String,
    status: {
      type: String,
      enum: ['in_use', 'available', 'maintenance', 'retired', 'disposed', 'missing'],
      default: 'available',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    department: String,
    location: String,
    purchaseInfo: {
      vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
      purchaseDate: Date,
      purchasePrice: Number,
      warrantyExpiry: Date,
      invoiceNumber: String,
    },
    specifications: mongoose.Schema.Types.Mixed,
    softwareLicenses: [{ name: String, key: String, expiryDate: Date }],
    maintenanceHistory: [{ date: Date, description: String, cost: Number, performedBy: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
ITAssetSchema.index({ type: 1, status: 1 });
ITAssetSchema.index({ assignedTo: 1 });

const ServiceCatalogItemSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    category: {
      type: String,
      enum: ['hardware', 'software', 'access', 'email', 'network', 'security', 'general'],
      default: 'general',
    },
    type: { type: String, enum: ['request', 'incident', 'change'], default: 'request' },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    sla: { responseHours: Number, resolutionHours: Number },
    approvalRequired: { type: Boolean, default: false },
    approver: { type: Schema.Types.ObjectId, ref: 'User' },
    formFields: [
      {
        label: String,
        type: { type: String, enum: ['text', 'number', 'select', 'date', 'file'] },
        required: { type: Boolean, default: false },
        options: [String],
      },
    ],
    isActive: { type: Boolean, default: true },
    icon: String,
    sortOrder: { type: Number, default: 0 },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

const ChangeRequestSchema = new Schema(
  {
    changeNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['standard', 'normal', 'emergency'], default: 'normal' },
    category: {
      type: String,
      enum: ['hardware', 'software', 'network', 'security', 'infrastructure', 'application'],
      default: 'software',
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    riskLevel: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'under_review',
        'approved',
        'scheduled',
        'implementing',
        'completed',
        'failed',
        'rolled_back',
        'cancelled',
      ],
      default: 'draft',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    approvals: [
      {
        approver: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'approved', 'rejected'] },
        date: Date,
        comments: String,
      },
    ],
    scheduledStart: Date,
    scheduledEnd: Date,
    implementationPlan: String,
    rollbackPlan: String,
    affectedSystems: [String],
    testPlan: String,
    actualStart: Date,
    actualEnd: Date,
    postImplementationReview: String,
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
ChangeRequestSchema.index({ status: 1, type: 1 });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  5. EHS — SAFETY & HEALTH — السلامة والصحة المهنية والبيئة                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const SafetyIncidentSchema = new Schema(
  {
    incidentNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'injury',
        'illness',
        'near_miss',
        'property_damage',
        'environmental',
        'fire',
        'chemical_spill',
        'electrical',
        'other',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'major', 'minor', 'insignificant'],
      default: 'minor',
    },
    date: { type: Date, required: true },
    time: String,
    location: { facility: String, area: String, specificLocation: String },
    description: { type: String, required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    involvedPersons: [{ name: String, role: String, injuryType: String, treatmentGiven: String }],
    witnesses: [{ name: String, statement: String }],
    rootCause: String,
    immediateActions: String,
    correctiveActions: [
      {
        description: String,
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        status: {
          type: String,
          enum: ['open', 'in_progress', 'completed', 'overdue'],
          default: 'open',
        },
      },
    ],
    status: {
      type: String,
      enum: ['reported', 'investigating', 'corrective_actions', 'closed', 'reopened'],
      default: 'reported',
    },
    investigator: { type: Schema.Types.ObjectId, ref: 'User' },
    photos: [String],
    lostWorkDays: { type: Number, default: 0 },
    estimatedCost: Number,
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
SafetyIncidentSchema.index({ status: 1, severity: 1 });
SafetyIncidentSchema.index({ date: -1 });

const SafetyInspectionSchema = new Schema(
  {
    inspectionNumber: { type: String, required: true },
    type: {
      type: String,
      enum: ['routine', 'special', 'follow_up', 'pre_operation', 'regulatory'],
      default: 'routine',
    },
    facility: String,
    area: String,
    scheduledDate: { type: Date, required: true },
    completedDate: Date,
    inspector: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    checklist: [
      {
        item: { type: String, required: true },
        category: String,
        status: { type: String, enum: ['pass', 'fail', 'na', 'needs_improvement'], default: 'na' },
        comments: String,
        photo: String,
      },
    ],
    overallScore: Number,
    findings: [
      {
        description: String,
        severity: { type: String, enum: ['critical', 'major', 'minor'] },
        corrective: String,
        dueDate: Date,
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    nextInspectionDate: Date,
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
SafetyInspectionSchema.index({ scheduledDate: 1, status: 1 });

const HazardRegisterSchema = new Schema(
  {
    hazardId: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    category: {
      type: String,
      enum: [
        'physical',
        'chemical',
        'biological',
        'ergonomic',
        'psychosocial',
        'electrical',
        'fire',
        'environmental',
      ],
      required: true,
    },
    location: { facility: String, area: String },
    riskAssessment: {
      likelihood: { type: Number, min: 1, max: 5 },
      consequence: { type: Number, min: 1, max: 5 },
      riskScore: Number,
      riskLevel: { type: String, enum: ['extreme', 'high', 'medium', 'low'] },
    },
    controlMeasures: [
      {
        type: {
          type: String,
          enum: ['elimination', 'substitution', 'engineering', 'administrative', 'ppe'],
        },
        description: String,
        effectiveness: { type: String, enum: ['effective', 'partially_effective', 'ineffective'] },
      },
    ],
    residualRisk: { likelihood: Number, consequence: Number, riskScore: Number, riskLevel: String },
    status: {
      type: String,
      enum: ['identified', 'assessed', 'controlled', 'monitoring', 'closed'],
      default: 'identified',
    },
    reviewDate: Date,
    responsiblePerson: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
HazardRegisterSchema.index({ 'riskAssessment.riskLevel': 1, status: 1 });

const PPERecordSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        type: {
          type: String,
          enum: [
            'helmet',
            'goggles',
            'gloves',
            'boots',
            'vest',
            'earplugs',
            'mask',
            'harness',
            'face_shield',
            'other',
          ],
          required: true,
        },
        issuedDate: { type: Date, default: Date.now },
        expiryDate: Date,
        size: String,
        quantity: { type: Number, default: 1 },
        condition: {
          type: String,
          enum: ['new', 'good', 'fair', 'poor', 'replaced'],
          default: 'new',
        },
        returnedDate: Date,
      },
    ],
    department: String,
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgement: { signed: { type: Boolean, default: false }, signedAt: Date },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
PPERecordSchema.index({ employee: 1 });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  6. STRATEGIC PLANNING & OKR — التخطيط الاستراتيجي وإدارة الأهداف           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const StrategicObjectiveSchema = new Schema(
  {
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    perspective: {
      type: String,
      enum: ['financial', 'customer', 'internal_process', 'learning_growth'],
      required: true,
    },
    level: {
      type: String,
      enum: ['organization', 'department', 'team', 'individual'],
      default: 'organization',
    },
    department: String,
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    parentObjective: { type: Schema.Types.ObjectId, ref: 'StrategicObjective' },
    keyResults: [
      {
        title: { type: String, required: true },
        description: String,
        metricType: {
          type: String,
          enum: ['number', 'percentage', 'currency', 'boolean'],
          default: 'number',
        },
        targetValue: { type: Number, required: true },
        currentValue: { type: Number, default: 0 },
        startValue: { type: Number, default: 0 },
        unit: String,
        progress: { type: Number, default: 0, min: 0, max: 100 },
        status: {
          type: String,
          enum: ['on_track', 'at_risk', 'behind', 'completed', 'cancelled'],
          default: 'on_track',
        },
        updates: [
          {
            value: Number,
            note: String,
            updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            updatedAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled'],
      default: 'draft',
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    period: {
      type: { type: String, enum: ['annual', 'quarterly', 'monthly'] },
      year: Number,
      quarter: Number,
    },
    startDate: Date,
    endDate: Date,
    weight: { type: Number, default: 1 },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
StrategicObjectiveSchema.index({ status: 1, 'period.year': 1 });
StrategicObjectiveSchema.index({ owner: 1 });

const StrategicInitiativeSchema = new Schema(
  {
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    objective: { type: Schema.Types.ObjectId, ref: 'StrategicObjective', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    team: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'on_hold', 'cancelled'],
      default: 'planned',
    },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    milestones: [
      {
        title: String,
        dueDate: Date,
        completedDate: Date,
        status: { type: String, enum: ['pending', 'completed', 'overdue'], default: 'pending' },
      },
    ],
    budget: { allocated: Number, spent: Number, currency: { type: String, default: 'SAR' } },
    startDate: Date,
    endDate: Date,
    risks: [
      {
        description: String,
        impact: { type: String, enum: ['high', 'medium', 'low'] },
        mitigation: String,
      },
    ],
    kpis: [{ name: String, target: Number, current: Number, unit: String }],
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);
StrategicInitiativeSchema.index({ objective: 1, status: 1 });

const SWOTAnalysisSchema = new Schema(
  {
    title: { type: String, required: true },
    context: String,
    period: { year: Number, quarter: Number },
    strengths: [{ item: String, impact: { type: String, enum: ['high', 'medium', 'low'] } }],
    weaknesses: [{ item: String, impact: { type: String, enum: ['high', 'medium', 'low'] } }],
    opportunities: [{ item: String, impact: { type: String, enum: ['high', 'medium', 'low'] } }],
    threats: [{ item: String, impact: { type: String, enum: ['high', 'medium', 'low'] } }],
    strategies: {
      so: [String],
      wo: [String],
      st: [String],
      wt: [String],
    },
    status: { type: String, enum: ['draft', 'reviewed', 'approved', 'archived'], default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  MODEL REGISTRATION                                                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function getOrCreate(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

// Module 1 — Talent Acquisition
const JobPosting = getOrCreate('JobPosting', JobPostingSchema);
const Candidate = getOrCreate('Candidate', CandidateSchema);
const JobApplication = getOrCreate('JobApplication', JobApplicationSchema);
const InterviewSchedule = getOrCreate('InterviewSchedule', InterviewScheduleSchema);

// Module 2 — Facility Management
const Facility = getOrCreate('Facility', FacilitySchema);
const SpaceBooking = getOrCreate('SpaceBooking', SpaceBookingSchema);
const LeaseContract = getOrCreate('LeaseContract', LeaseContractSchema);
const UtilityReading = getOrCreate('UtilityReading', UtilityReadingSchema);

// Module 3 — Vendor Management
const Vendor = getOrCreate('Vendor', VendorSchema);
const RFQ = getOrCreate('RFQ', RFQSchema);
const VendorEvaluation = getOrCreate('VendorEvaluation', VendorEvaluationSchema);

// Module 4 — ITSM
const ITIncident = getOrCreate('ITIncident', ITIncidentSchema);
const ITAsset = getOrCreate('ITAsset', ITAssetSchema);
const ServiceCatalogItem = getOrCreate('ServiceCatalogItem', ServiceCatalogItemSchema);
const ChangeRequest = getOrCreate('ChangeRequest', ChangeRequestSchema);

// Module 5 — EHS Safety
const SafetyIncident = getOrCreate('SafetyIncident', SafetyIncidentSchema);
const SafetyInspection = getOrCreate('SafetyInspection', SafetyInspectionSchema);
const HazardRegister = getOrCreate('HazardRegister', HazardRegisterSchema);
const PPERecord = getOrCreate('PPERecord', PPERecordSchema);

// Module 6 — Strategic Planning
const StrategicObjective = getOrCreate('StrategicObjective', StrategicObjectiveSchema);
const StrategicInitiative = getOrCreate('StrategicInitiative', StrategicInitiativeSchema);
const SWOTAnalysis = getOrCreate('SWOTAnalysis', SWOTAnalysisSchema);

module.exports = {
  // Talent Acquisition
  JobPosting,
  Candidate,
  JobApplication,
  InterviewSchedule,
  // Facility Management
  Facility,
  SpaceBooking,
  LeaseContract,
  UtilityReading,
  // Vendor Management
  Vendor,
  RFQ,
  VendorEvaluation,
  // ITSM
  ITIncident,
  ITAsset,
  ServiceCatalogItem,
  ChangeRequest,
  // EHS Safety
  SafetyIncident,
  SafetyInspection,
  HazardRegister,
  PPERecord,
  // Strategic Planning
  StrategicObjective,
  StrategicInitiative,
  SWOTAnalysis,
};

logger.info(`  ✅ EnterpriseProPlus: ${Object.keys(module.exports).length} models loaded`);
