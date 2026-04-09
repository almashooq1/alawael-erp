/**
 * Beneficiary (Unified) Model — نموذج المستفيد الموحد
 *
 * ملف مستفيد طولي واحد يربط:
 *  - Episodes of Care (الحلقات العلاجية)
 *  - Assessments (التقييمات)
 *  - Care Plans (خطط الرعاية)
 *  - Sessions (الجلسات)
 *  - Goals (الأهداف)
 *  - Measures (المقاييس)
 *  - Family Interactions (التواصل الأسري)
 *  - Timeline (الخط الزمني الطولي)
 *
 * @module domains/core/models/Beneficiary
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Sub-Schemas ──────────────────────────────────────────────────────────────

const addressSchema = new mongoose.Schema(
  {
    street: String,
    district: String,
    city: String,
    region: String,
    country: { type: String, default: 'SA' },
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  { _id: false }
);

const contactInfoSchema = new mongoose.Schema(
  {
    primaryPhone: { type: String, required: true },
    alternatePhone: String,
    email: { type: String, lowercase: true },
    preferredContactMethod: {
      type: String,
      enum: ['phone', 'email', 'sms', 'whatsapp'],
      default: 'phone',
    },
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    relationship: String,
    phone: { type: String, required: true },
    alternatePhone: String,
    email: String,
    priority: { type: Number, default: 1 },
    isGuardian: { type: Boolean, default: false },
  },
  { _id: false }
);

const guardianSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    relationship: {
      type: String,
      enum: [
        'father',
        'mother',
        'sibling',
        'grandparent',
        'uncle',
        'aunt',
        'legal_guardian',
        'other',
      ],
    },
    phone: String,
    email: String,
    nationalId: String,
    hasLegalGuardianship: { type: Boolean, default: false },
    isPrimaryCaregiver: { type: Boolean, default: false },
    consentGiven: { type: Boolean, default: false },
    consentDate: Date,
  },
  { _id: false }
);

const disabilitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'physical',
        'intellectual',
        'visual',
        'hearing',
        'speech',
        'autism',
        'learning',
        'multiple',
        'developmental_delay',
        'cerebral_palsy',
        'down_syndrome',
        'adhd',
        'genetic',
        'neurological',
        'psychiatric',
        'other',
      ],
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'profound'],
    },
    description: String,
    diagnosisDate: Date,
    diagnosedBy: String,
    icdCode: String,
    icfCodes: [String],
    supportLevel: {
      type: String,
      enum: ['level_1', 'level_2', 'level_3', 'level_4', 'level_5'],
    },
  },
  { _id: false }
);

const medicalInfoSchema = new mongoose.Schema(
  {
    conditions: [String],
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String,
        prescribedBy: String,
        startDate: Date,
        endDate: Date,
      },
    ],
    allergies: [
      {
        allergen: String,
        severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
        reaction: String,
      },
    ],
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    surgicalHistory: [String],
    familyMedicalHistory: [String],
  },
  { _id: false }
);

const insuranceInfoSchema = new mongoose.Schema(
  {
    provider: String,
    policyNumber: String,
    coverageType: String,
    coverageStart: Date,
    coverageEnd: Date,
    maxCoverage: Number,
    usedCoverage: Number,
    coPayPercentage: Number,
    className: String,
    networkType: { type: String, enum: ['A', 'B', 'C', 'VIP'] },
    approvalRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    title: String,
    type: {
      type: String,
      enum: [
        'medical_report',
        'assessment',
        'care_plan',
        'progress_note',
        'consent_form',
        'referral',
        'prescription',
        'lab_result',
        'imaging',
        'discharge_summary',
        'certificate',
        'other',
      ],
    },
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    description: String,
    tags: [String],
    isConfidential: { type: Boolean, default: false },
  },
  { _id: true }
);

const riskFlagSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['clinical', 'behavioral', 'social', 'safeguarding', 'compliance', 'financial'],
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    description: String,
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    raisedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['active', 'monitoring', 'resolved'],
      default: 'active',
    },
  },
  { _id: true }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const beneficiarySchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────────
    mrn: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    nationalId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    firstName_ar: { type: String, trim: true },
    lastName_ar: { type: String, trim: true },
    firstName_en: { type: String, trim: true },
    lastName_en: { type: String, trim: true },
    fullNameArabic: { type: String, trim: true },
    fullNameEnglish: { type: String, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required: true,
    },
    profilePhoto: String,

    // ── Legacy Compatibility ───────────────────────────────────────────
    name: { type: String, trim: true },
    category: String,

    // ── Contact & Address ──────────────────────────────────────────────
    contactInfo: contactInfoSchema,
    address: addressSchema,
    email: { type: String, sparse: true, lowercase: true },
    phone: String,

    // ── Family & Guardians ─────────────────────────────────────────────
    guardians: [guardianSchema],
    emergencyContacts: [emergencyContactSchema],
    familyMembers: [
      {
        name: String,
        relationship: String,
        age: Number,
        phone: String,
        notes: String,
      },
    ],

    // ── Disability & Medical ───────────────────────────────────────────
    disability: disabilitySchema,
    medicalInfo: medicalInfoSchema,
    insuranceInfo: insuranceInfoSchema,

    // ── Lifecycle & Status ─────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'pending',
        'intake',
        'active',
        'on_hold',
        'discharged',
        'transferred',
        'archived',
        'waitlist',
      ],
      default: 'pending',
      index: true,
    },
    registrationDate: { type: Date, default: Date.now },
    admissionDate: Date,
    dischargeDate: Date,
    dischargeReason: String,

    // ── Referral ───────────────────────────────────────────────────────
    referral: {
      source: {
        type: String,
        enum: [
          'self',
          'physician',
          'hospital',
          'school',
          'social_services',
          'government',
          'ngo',
          'other',
        ],
      },
      referredBy: String,
      referralDate: Date,
      referralReason: String,
      referralDocument: String,
      priority: {
        type: String,
        enum: ['routine', 'urgent', 'emergency'],
        default: 'routine',
      },
    },

    // ── Current Episode Context ────────────────────────────────────────
    currentEpisodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      index: true,
    },
    totalEpisodes: { type: Number, default: 0 },

    // ── Risk Flags ─────────────────────────────────────────────────────
    riskFlags: [riskFlagSchema],
    overallRiskLevel: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical'],
      default: 'none',
    },

    // ── Documents ──────────────────────────────────────────────────────
    documents: [documentSchema],

    // ── Portal Authentication ──────────────────────────────────────────
    password: { type: String, select: false },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'locked', 'pending_verification'],
      default: 'pending_verification',
    },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    // ── Multi-Tenancy ──────────────────────────────────────────────────
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },

    // ── Audit ──────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: Date,
    archivedReason: String,

    // ── Tags & Notes ───────────────────────────────────────────────────
    tags: [String],
    internalNotes: String,
    preferences: {
      language: { type: String, default: 'ar' },
      communicationPreference: {
        type: String,
        enum: ['phone', 'email', 'sms', 'whatsapp'],
        default: 'phone',
      },
      sessionPreference: {
        type: String,
        enum: ['in_person', 'tele_rehab', 'home_visit', 'any'],
        default: 'any',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'beneficiaries',
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

beneficiarySchema.index({ status: 1, branchId: 1 });
beneficiarySchema.index({ 'disability.type': 1, status: 1 });
beneficiarySchema.index({ overallRiskLevel: 1, status: 1 });
beneficiarySchema.index({
  firstName: 'text',
  lastName: 'text',
  fullNameArabic: 'text',
  fullNameEnglish: 'text',
  mrn: 'text',
});
beneficiarySchema.index({ createdAt: -1 });
beneficiarySchema.index({ 'referral.source': 1, 'referral.priority': 1 });

// ─── Virtuals ───────────────────────────────────────────────────────────────

beneficiarySchema.virtual('fullName').get(function () {
  if (this.fullNameArabic) return this.fullNameArabic;
  if (this.firstName_ar && this.lastName_ar) return `${this.firstName_ar} ${this.lastName_ar}`;
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

beneficiarySchema.virtual('fullNameEn').get(function () {
  if (this.fullNameEnglish) return this.fullNameEnglish;
  if (this.firstName_en && this.lastName_en) return `${this.firstName_en} ${this.lastName_en}`;
  return '';
});

beneficiarySchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - this.dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())) {
    age--;
  }
  return age;
});

beneficiarySchema.virtual('ageInMonths').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  return (
    (today.getFullYear() - this.dateOfBirth.getFullYear()) * 12 +
    (today.getMonth() - this.dateOfBirth.getMonth())
  );
});

beneficiarySchema.virtual('primaryGuardian').get(function () {
  if (!this.guardians || this.guardians.length === 0) return null;
  return (
    this.guardians.find(g => g.hasLegalGuardianship || g.isPrimaryCaregiver) || this.guardians[0]
  );
});

beneficiarySchema.virtual('activeRiskFlags').get(function () {
  if (!this.riskFlags) return [];
  return this.riskFlags.filter(r => r.status === 'active');
});

// Virtual populate — الحلقات العلاجية
beneficiarySchema.virtual('episodes', {
  ref: 'EpisodeOfCare',
  localField: '_id',
  foreignField: 'beneficiaryId',
  options: { sort: { startDate: -1 } },
});

// Virtual populate — أحداث الخط الزمني
beneficiarySchema.virtual('timeline', {
  ref: 'CareTimeline',
  localField: '_id',
  foreignField: 'beneficiaryId',
  options: { sort: { occurredAt: -1 } },
});

// ─── Pre-save Middleware ─────────────────────────────────────────────────────

beneficiarySchema.pre('save', async function (next) {
  // Auto-populate legacy fields
  if (!this.name && (this.firstName || this.lastName)) {
    this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  if (!this.fullNameArabic && this.firstName_ar) {
    this.fullNameArabic = `${this.firstName_ar} ${this.lastName_ar || ''}`.trim();
  }
  if (!this.fullNameEnglish && this.firstName_en) {
    this.fullNameEnglish = `${this.firstName_en} ${this.lastName_en || ''}`.trim();
  }

  // Sync category from disability type
  if (this.disability?.type && !this.category) {
    this.category = this.disability.type;
  }

  // Sort emergency contacts by priority
  if (this.emergencyContacts?.length > 1) {
    this.emergencyContacts.sort((a, b) => (a.priority || 99) - (b.priority || 99));
  }

  // Compute overall risk level from active flags
  if (this.riskFlags?.length > 0) {
    const activeFlags = this.riskFlags.filter(r => r.status === 'active');
    if (activeFlags.length === 0) {
      this.overallRiskLevel = 'none';
    } else {
      const severityMap = { critical: 4, high: 3, medium: 2, low: 1 };
      const maxSeverity = Math.max(...activeFlags.map(f => severityMap[f.severity] || 0));
      this.overallRiskLevel =
        Object.keys(severityMap).find(k => severityMap[k] === maxSeverity) || 'low';
    }
  }

  // Hash password if modified
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  next();
});

// ─── Instance Methods ───────────────────────────────────────────────────────

beneficiarySchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

beneficiarySchema.methods.getSummary = function () {
  return {
    id: this._id,
    mrn: this.mrn,
    fullName: this.fullName,
    age: this.age,
    gender: this.gender,
    status: this.status,
    disability: this.disability?.type,
    severity: this.disability?.severity,
    overallRiskLevel: this.overallRiskLevel,
    currentEpisodeId: this.currentEpisodeId,
    branchId: this.branchId,
    activeRiskFlags: this.activeRiskFlags?.length || 0,
    registrationDate: this.registrationDate,
  };
};

beneficiarySchema.methods.isInsuranceValid = function () {
  if (!this.insuranceInfo?.coverageEnd) return false;
  return new Date(this.insuranceInfo.coverageEnd) > new Date();
};

beneficiarySchema.methods.archive = function (reason, userId) {
  this.isArchived = true;
  this.archivedAt = new Date();
  this.archivedReason = reason;
  this.lastModifiedBy = userId;
  this.status = 'archived';
  return this.save();
};

beneficiarySchema.methods.unarchive = function (userId) {
  this.isArchived = false;
  this.archivedAt = undefined;
  this.archivedReason = undefined;
  this.lastModifiedBy = userId;
  this.status = 'active';
  return this.save();
};

beneficiarySchema.methods.addRiskFlag = function (flag) {
  this.riskFlags.push(flag);
  return this.save();
};

beneficiarySchema.methods.resolveRiskFlag = function (flagId, userId) {
  const flag = this.riskFlags.id(flagId);
  if (flag) {
    flag.status = 'resolved';
    flag.resolvedAt = new Date();
    flag.resolvedBy = userId;
  }
  return this.save();
};

// ─── Static Methods ─────────────────────────────────────────────────────────

beneficiarySchema.statics.advancedSearch = async function (filters = {}) {
  const query = { isArchived: { $ne: true } };

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { fullNameArabic: searchRegex },
      { fullNameEnglish: searchRegex },
      { name: searchRegex },
      { mrn: searchRegex },
      { nationalId: searchRegex },
    ];
  }
  if (filters.status) query.status = filters.status;
  if (filters.disabilityType) query['disability.type'] = filters.disabilityType;
  if (filters.severity) query['disability.severity'] = filters.severity;
  if (filters.gender) query.gender = filters.gender;
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.riskLevel) query.overallRiskLevel = filters.riskLevel;
  if (filters.ageMin || filters.ageMax) {
    const now = new Date();
    if (filters.ageMax) {
      query.dateOfBirth = {
        ...query.dateOfBirth,
        $gte: new Date(now.getFullYear() - filters.ageMax, now.getMonth(), now.getDate()),
      };
    }
    if (filters.ageMin) {
      query.dateOfBirth = {
        ...query.dateOfBirth,
        $lte: new Date(now.getFullYear() - filters.ageMin, now.getMonth(), now.getDate()),
      };
    }
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;
  const sort = filters.sort || { createdAt: -1 };

  const [data, total] = await Promise.all([
    this.find(query).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(query),
  ]);

  return {
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

beneficiarySchema.statics.getStatistics = async function (branchId) {
  const match = { isArchived: { $ne: true } };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  const [stats] = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        onHold: { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
        discharged: { $sum: { $cond: [{ $eq: ['$status', 'discharged'] }, 1, 0] } },
        waitlist: { $sum: { $cond: [{ $eq: ['$status', 'waitlist'] }, 1, 0] } },
        highRisk: { $sum: { $cond: [{ $in: ['$overallRiskLevel', ['high', 'critical']] }, 1, 0] } },
        male: { $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] } },
        female: { $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] } },
      },
    },
  ]);

  const byDisability = await this.aggregate([
    { $match: match },
    { $group: { _id: '$disability.type', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const bySeverity = await this.aggregate([
    { $match: match },
    { $group: { _id: '$disability.severity', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // New registrations this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const newThisMonth = await this.countDocuments({
    ...match,
    createdAt: { $gte: startOfMonth },
  });

  return {
    ...(stats || {
      total: 0,
      active: 0,
      pending: 0,
      onHold: 0,
      discharged: 0,
      waitlist: 0,
      highRisk: 0,
      male: 0,
      female: 0,
    }),
    byDisability,
    bySeverity,
    newThisMonth,
  };
};

// ─── Export ──────────────────────────────────────────────────────────────────

const Beneficiary = mongoose.models.Beneficiary || mongoose.model('Beneficiary', beneficiarySchema);

module.exports = { Beneficiary, beneficiarySchema };
