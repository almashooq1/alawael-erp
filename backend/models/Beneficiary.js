/**
 * Beneficiary Model — النموذج الموحد للمستفيدين
 *
 * Consolidated from:
 *  - Beneficiary.js (stub), beneficiary.model.js, Beneficiary.enhanced.js, BeneficiaryPortal.js
 *
 * Covers: personal info (bilingual), contact, address, family, emergency contacts,
 * disability, medical, education, programs, portal auth, assessments, documents,
 * financial aid, accessibility, preferences, archival.
 *
 * @version 2.0.0
 * @date 2026-03-22
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  nationalAddressSubschema,
  attachNationalAddressGuard,
} = require('./_shared/nationalAddress.subschema');

// ─── Sub-Schemas ────────────────────────────────────────────────────────────

const familyMemberSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    relationship: {
      type: String,
      required: true,
      enum: [
        'father',
        'mother',
        'brother',
        'sister',
        'grandfather',
        'grandmother',
        'uncle',
        'aunt',
        'guardian',
        'spouse',
        'other',
      ],
    },
    dateOfBirth: Date,
    nationalId: String,
    occupation: String,
    education: String,
    phone: String,
    email: String,
    isEmergencyContact: { type: Boolean, default: false },
    isPrimaryCaregiver: { type: Boolean, default: false },
    hasLegalGuardianship: { type: Boolean, default: false },
    notes: String,
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    alternatePhone: String,
    email: String,
    address: String,
    priority: { type: Number, default: 1 },
    isAvailable24_7: { type: Boolean, default: true },
    notes: String,
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    street: String,
    district: String,
    city: { type: String, default: '' },
    state: String,
    country: { type: String, default: 'Saudi Arabia' },
    postalCode: String,
    buildingNumber: String,
    additionalInfo: String,
    coordinates: { latitude: Number, longitude: Number },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    title: String,
    category: {
      type: String,
      enum: ['identification', 'medical', 'legal', 'financial', 'educational', 'other'],
    },
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String,
    uploadDate: { type: Date, default: Date.now },
    expiryDate: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

const enrolledProgramSchema = new mongoose.Schema(
  {
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    programName: String,
    enrollmentDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'dropped'],
      default: 'active',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: true }
);

const assessmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['initial', 'periodic', 'final', 'behavioral', 'academic', 'medical'],
    },
    date: { type: Date, default: Date.now },
    assessor: String,
    score: Number,
    maxScore: Number,
    notes: String,
    recommendations: [String],
    nextAssessmentDate: Date,
  },
  { _id: true }
);

// ─── Main Beneficiary Schema ────────────────────────────────────────────────

const beneficiarySchema = new mongoose.Schema(
  {
    // ── Personal Info (bilingual) ──────────────────────────
    firstName: { type: String, required: [true, 'الاسم الأول مطلوب'], trim: true, index: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: [true, 'اسم العائلة مطلوب'], trim: true, index: true },
    firstName_ar: { type: String, trim: true },
    lastName_ar: { type: String, trim: true },
    firstName_en: { type: String, trim: true },
    lastName_en: { type: String, trim: true },
    fullNameArabic: { type: String, trim: true },
    fullNameEnglish: { type: String, trim: true },

    // Legacy field (backward compat with stub)
    name: { type: String, trim: true },

    dateOfBirth: { type: Date, index: true },
    gender: { type: String, enum: ['male', 'female'], index: true },
    nationalId: { type: String, unique: true, sparse: true, trim: true },
    passportNumber: { type: String, sparse: true, trim: true },
    mrn: { type: String, unique: true, sparse: true, trim: true },
    nationality: { type: String, default: 'Saudi' },
    religion: {
      type: String,
      enum: ['Muslim', 'Christian', 'Jewish', 'Other', 'Prefer not to say'],
      default: 'Muslim',
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    profilePhoto: { url: String, filename: String, uploadDate: Date },

    // ── Contact Info ───────────────────────────────────────
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    contactInfo: {
      primaryPhone: { type: String, trim: true },
      alternatePhone: String,
      email: { type: String, lowercase: true, trim: true },
      preferredContactMethod: {
        type: String,
        enum: ['phone', 'email', 'sms', 'whatsapp'],
        default: 'phone',
      },
    },

    // ── Address ────────────────────────────────────────────
    address: addressSchema,
    // ── Saudi National Address (SPL / Wasel) ───────────────
    // The authoritative postal address. When provided it must be
    // verified via وَصِل (see services/nationalAddressService.js).
    nationalAddress: nationalAddressSubschema,

    // ── Family & Emergency ─────────────────────────────────
    familyMembers: [familyMemberSchema],
    emergencyContacts: [emergencyContactSchema],
    guardians: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' }],
    familySize: Number,
    familyIncome: Number,

    // ── Housing & Social ───────────────────────────────────
    housingInfo: {
      type: {
        type: String,
        enum: ['own', 'rent', 'family_owned', 'government_housing', 'other'],
        default: 'own',
      },
      hasSpecialAccommodations: { type: Boolean, default: false },
      accommodationDetails: String,
      transportationMethod: {
        type: String,
        enum: ['private_car', 'public_transport', 'special_needs_transport', 'walking', 'other'],
        default: 'private_car',
      },
      needsTransportationAssistance: { type: Boolean, default: false },
    },
    socialEconomicInfo: {
      familyIncome: {
        type: String,
        enum: ['very_low', 'low', 'medium', 'high', 'prefer_not_to_say'],
        default: 'prefer_not_to_say',
      },
      numberOfFamilyMembers: Number,
      numberOfDependents: Number,
      primaryCaregiverEmploymentStatus: {
        type: String,
        enum: ['employed', 'unemployed', 'self_employed', 'retired', 'homemaker', 'student'],
        default: 'employed',
      },
      receivesGovernmentAssistance: { type: Boolean, default: false },
      assistanceDetails: String,
    },

    // ── Disability Info ────────────────────────────────────
    disability: {
      type: {
        type: String,
        enum: ['physical', 'mental', 'sensory', 'multiple', 'learning', 'speech', 'other'],
      },
      severity: { type: String, enum: ['mild', 'moderate', 'severe', 'profound'] },
      description: String,
      // W926 — precise (often Arabic) disability label(s) as captured by the
      // web-admin form. `type`/`severity` above stay the coarse English enum
      // for filtering + labels; these preserve the exact clinical value so the
      // UI round-trips. Optional + no enum → no break to existing docs.
      primaryType: String,
      types: [String],
      level: String,
      diagnosisDate: Date,
      diagnosedBy: String,
      certificationNumber: String,
      // Saudi Disability Authority card dates — optional for backward
      // compatibility with records predating the red-flag module.
      cardIssueDate: Date,
      cardExpiryDate: Date,
    },
    // W926 — top-level disability level mirror the web-admin form sends/reads
    // ('MILD'|'MODERATE'|'SEVERE'|'PROFOUND'). Optional, no enum.
    disabilityLevel: String,

    // Consent-program opt-in gate. Default false so beneficiaries
    // admitted before the consent digitization rollout don't
    // retroactively trip the blocking flags (CBAHI 4.3 / PDPL):
    //   clinical.consent.treatment.missing_pre_session
    //   compliance.consent.required.missing
    // Flip to true once the center has captured the required
    // consents for the beneficiary via the new Consent collection.
    consentTrackingEnabled: { type: Boolean, default: false },
    // Legacy field alias
    category: {
      type: String,
      enum: ['physical', 'mental', 'sensory', 'multiple', 'learning', 'speech', 'other'],
    },

    // ── Medical Info ───────────────────────────────────────
    medicalInfo: {
      conditions: [String],
      medications: [{ name: String, dosage: String, frequency: String }],
      allergies: [String],
      dietaryRestrictions: [String],
      physicianName: String,
      physicianPhone: String,
      hospitalName: String,
      lastCheckupDate: Date,
    },
    insuranceInfo: {
      hasInsurance: { type: Boolean, default: false },
      provider: String,
      policyNumber: String,
      groupNumber: String,
      policyHolderName: String,
      policyHolderRelationship: String,
      coverageStartDate: Date,
      coverageEndDate: Date,
      coverageType: { type: String, enum: ['full', 'partial', 'basic'], default: 'basic' },
      copayAmount: Number,
      deductible: Number,
      notes: String,
    },

    // ── Education & Academic ───────────────────────────────
    educationInfo: {
      currentLevel: String,
      gradeLevel: String,
      school: String,
      specialEducationPlan: { type: Boolean, default: false },
      iepDetails: String,
    },
    academicScore: { type: Number, min: 0, max: 100 },
    attendanceRate: { type: Number, min: 0, max: 100 },
    behaviorRating: { type: Number, min: 1, max: 10 },
    currentLevel: String,

    // ── Programs ───────────────────────────────────────────
    programs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Program' }],
    enrolledPrograms: [enrolledProgramSchema],

    // ── Assessments ────────────────────────────────────────
    assessments: [assessmentSchema],

    // ── Documents ──────────────────────────────────────────
    documents: [documentSchema],

    // ── Financial Aid ──────────────────────────────────────
    financialAid: {
      receivesAid: { type: Boolean, default: false },
      aidType: { type: String, enum: ['full', 'partial', 'scholarship', 'none'], default: 'none' },
      aidAmount: Number,
      aidSource: String,
      startDate: Date,
      endDate: Date,
    },

    // ── Accessibility ──────────────────────────────────────
    accessibility: {
      needsWheelchair: { type: Boolean, default: false },
      needsSignInterpreter: { type: Boolean, default: false },
      needsBraille: { type: Boolean, default: false },
      needsAssistiveDevice: { type: Boolean, default: false },
      assistiveDeviceDetails: String,
      specialInstructions: String,
    },

    // ── Portal Auth ────────────────────────────────────────
    password: { type: String, select: false },
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'],
      default: 'active',
    },
    lastLoginDate: Date,
    loginAttempts: { type: Number, default: 0 },
    // W1450: select:false to match the sibling BeneficiaryPortal — keeps the reset
    // token out of default query/response projections (defense-in-depth; PDPL).
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    twoFactorSecret: { type: String, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    accountVerified: { type: Boolean, default: false },
    accountVerificationCode: { type: String, select: false },

    // ── Status & Lifecycle ─────────────────────────────────
    // الحالة — lowercase فقط (ACTIVE/INACTIVE أُزيلت لتجنب التعارض)
    // W581: 'waitlisted' / 'deceased' أُضيفا.
    // W0-LifecycleAlign: جميع حالات LIFECYCLE_STATES مدعومة، مع الحفاظ على
    // الحالات القديمة (inactive/pending/graduated) للتوافق مع البيانات
    // التاريخية إلى حين تشغيل migration script.
    status: {
      type: String,
      enum: [
        // Canonical lifecycle states (beneficiary-lifecycle.registry.js)
        'draft',
        'waitlisted',
        'active',
        'suspended',
        'transferred-pending',
        'transferred',
        'discharged',
        'deceased',
        'archived',
        'deletion-pending',
        'deleted',
        // Legacy aliases — kept for backward compatibility until migration
        'inactive',
        'pending',
        'graduated',
      ],
      default: 'active',
    },
    // W0-LifecycleAlign: تواريخ/أسباب رئيسية لدورة الحياة
    lastLifecycleAt: { type: Date },
    statusReason: { type: String },
    statusReasonCode: { type: String },
    registrationDate: { type: Date, default: Date.now, index: true },
    joinDate: { type: Date },

    // ── Preferences ────────────────────────────────────────
    language: { type: String, enum: ['ar', 'en', 'both'], default: 'ar' },
    notificationPreference: { type: String, enum: ['email', 'sms', 'push', 'all'], default: 'all' },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
    },

    // ── Tags & Custom Fields ───────────────────────────────
    tags: [String],
    customFields: { type: Map, of: mongoose.Schema.Types.Mixed },

    // ── Tracking ───────────────────────────────────────────
    progress: { type: Number, default: 0, min: 0, max: 100 },
    sessions: { type: Number, default: 0 },
    documentUploadCount: { type: Number, default: 0 },
    satisfactionScore: { type: Number, min: 1, max: 5 },
    lastActivityDate: Date,

    // ── Branch (Multi-tenant) — الحقل الرسمي: branchId ──────────────
    // branch_id محتفظ به للتوافق مع السجلات القديمة فقط (deprecated alias)
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    generalNotes: String,
    casesCount: { type: Number, default: 0 },
    // W0-LifecycleAlign: isArchived أصبح virtual مشتق من status === 'archived' أو
    // الحالة القديمة 'inactive'. الحقل المادي يُحتفظ به للتوافق مع الفهارس
    // والاستعلامات القديمة ويُحدّث تلقائيًا عبر pre-save hook.
    isArchived: { type: Boolean, default: false, index: true },
    archivedDate: Date,
    archivedReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

beneficiarySchema.index({ status: 1, firstName: 1 });
beneficiarySchema.index({ status: 1, name: 1 });
beneficiarySchema.index({ 'contactInfo.primaryPhone': 1 });
// registrationDate: removed — index:true creates implicit index
beneficiarySchema.index({ email: 1 }, { sparse: true });
beneficiarySchema.index({ phone: 1 }, { sparse: true });
beneficiarySchema.index({ category: 1, status: 1 });
beneficiarySchema.index({ 'disability.type': 1 });
// فهرس مركّب للفرع — ضروري لعزل بيانات الفروع (multi-tenant)
beneficiarySchema.index({ branchId: 1, status: 1 });
beneficiarySchema.index({ branchId: 1, isArchived: 1 });

// ─── Lifecycle Alignment Helpers (W0-LifecycleAlign) ───────────────────────

/**
 * تعيين الحالات القديمة إلى الحالة الرسمية في state machine.
 * يستخدم للقراءة الموحدة في التقارير والواجهات إلى حين migration.
 */
const LEGACY_STATUS_MAP = Object.freeze({
  inactive: 'archived',
  pending: 'draft',
  graduated: 'discharged',
});

function normalizeLifecycleState(status) {
  if (!status) return 'active';
  return LEGACY_STATUS_MAP[status] || status;
}

// ─── Virtuals ───────────────────────────────────────────────────────────────

beneficiarySchema.virtual('fullName').get(function () {
  // Prefer Arabic bilingual names, fallback to generic name
  if (this.firstName_ar && this.lastName_ar) {
    return `${this.firstName_ar} ${this.lastName_ar}`;
  }
  if (this.firstName && this.lastName) {
    const parts = [this.firstName];
    if (this.middleName) parts.push(this.middleName);
    parts.push(this.lastName);
    return parts.join(' ');
  }
  return this.name || '';
});

beneficiarySchema.virtual('fullNameEn').get(function () {
  if (this.firstName_en && this.lastName_en) {
    return `${this.firstName_en} ${this.lastName_en}`;
  }
  return this.fullNameEnglish || this.fullName;
});

beneficiarySchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
});

beneficiarySchema.virtual('ageInMonths').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const bd = new Date(this.dateOfBirth);
  return (today.getFullYear() - bd.getFullYear()) * 12 + (today.getMonth() - bd.getMonth());
});

beneficiarySchema.virtual('primaryEmergencyContact').get(function () {
  if (!this.emergencyContacts || this.emergencyContacts.length === 0) return null;
  return this.emergencyContacts.sort((a, b) => a.priority - b.priority)[0];
});

beneficiarySchema.virtual('primaryGuardian').get(function () {
  if (!this.familyMembers || this.familyMembers.length === 0) return null;
  return (
    this.familyMembers.find(m => m.hasLegalGuardianship) ||
    this.familyMembers.find(m => m.isPrimaryCaregiver)
  );
});

// W0-LifecycleAlign: الحالة الرسمية الموحدة للمستفيد (بدون aliasات قديمة)
beneficiarySchema.virtual('lifecycleState').get(function () {
  return normalizeLifecycleState(this.status);
});

// W0-LifecycleAlign: هل المستفيد في حالة أرشفة فعلية؟
beneficiarySchema.virtual('isArchivedComputed').get(function () {
  return this.lifecycleState === 'archived' || this.lifecycleState === 'deleted';
});

// ─── Pre-save Middleware ────────────────────────────────────────────────────

beneficiarySchema.pre('save', async function () {
  // Auto-populate legacy "name" field for backward compatibility
  if (!this.name && (this.firstName || this.firstName_ar)) {
    this.name =
      this.firstName_ar && this.lastName_ar
        ? `${this.firstName_ar} ${this.lastName_ar}`
        : `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }

  // Auto-populate fullNameArabic
  if (!this.fullNameArabic && this.firstName) {
    this.fullNameArabic = this.name;
  }

  // W0-LifecycleAlign: keep legacy isArchived flag in sync with lifecycle state
  const archivedStates = new Set(['archived', 'inactive', 'deleted', 'deletion-pending']);
  this.isArchived = archivedStates.has(this.status);

  // Auto-populate category from disability.type
  if (this.disability && this.disability.type && !this.category) {
    this.category = this.disability.type;
  }

  // Sort emergency contacts by priority
  if (this.emergencyContacts && this.emergencyContacts.length > 1) {
    this.emergencyContacts.sort((a, b) => a.priority - b.priority);
  }

  // Hash password if modified
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// ─── Instance Methods ───────────────────────────────────────────────────────

beneficiarySchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

beneficiarySchema.methods.getSummary = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    name: this.name || this.fullName,
    age: this.age,
    gender: this.gender,
    nationalId: this.nationalId,
    status: this.status,
    category: this.category || this.disability?.type,
    primaryPhone: this.contactInfo?.primaryPhone || this.phone,
    email: this.email,
    city: this.address?.city,
    registrationDate: this.registrationDate,
    progress: this.progress,
    sessions: this.sessions,
    casesCount: this.casesCount,
  };
};

beneficiarySchema.methods.isInsuranceValid = function () {
  if (!this.insuranceInfo?.hasInsurance) return false;
  if (!this.insuranceInfo.coverageEndDate) return true;
  return new Date(this.insuranceInfo.coverageEndDate) > new Date();
};

beneficiarySchema.methods.archive = function (reason, userId = null) {
  this.isArchived = true;
  this.archivedDate = new Date();
  this.archivedReason = reason;
  this.status = 'archived';
  this.lastLifecycleAt = new Date();
  if (userId) this.lastModifiedBy = userId;
  return this.save();
};

beneficiarySchema.methods.unarchive = function (userId = null) {
  this.isArchived = false;
  this.archivedDate = null;
  this.archivedReason = null;
  this.status = 'active';
  this.lastLifecycleAt = new Date();
  if (userId) this.lastModifiedBy = userId;
  return this.save();
};

// ─── Static Methods ─────────────────────────────────────────────────────────

beneficiarySchema.statics.advancedSearch = function (filters) {
  const query = {};

  if (filters.search) {
    query.$or = [
      { firstName: new RegExp(filters.search, 'i') },
      { lastName: new RegExp(filters.search, 'i') },
      { firstName_ar: new RegExp(filters.search, 'i') },
      { lastName_ar: new RegExp(filters.search, 'i') },
      { name: new RegExp(filters.search, 'i') },
      { fullNameArabic: new RegExp(filters.search, 'i') },
      { nationalId: new RegExp(filters.search, 'i') },
      { email: new RegExp(filters.search, 'i') },
    ];
  }

  if (filters.status) query.status = filters.status;
  if (filters.gender) query.gender = filters.gender;
  if (filters.category) query.category = filters.category;
  if (filters.city) query['address.city'] = new RegExp(filters.city, 'i');
  if (filters.disabilityType) query['disability.type'] = filters.disabilityType;
  if (filters.isArchived !== undefined) query.isArchived = filters.isArchived;
  else query.isArchived = { $ne: true };

  if (filters.minAge || filters.maxAge) {
    const now = new Date();
    if (filters.maxAge) {
      const minDate = new Date(
        now.getFullYear() - filters.maxAge - 1,
        now.getMonth(),
        now.getDate()
      );
      query.dateOfBirth = { $gte: minDate };
    }
    if (filters.minAge) {
      const maxDate = new Date(now.getFullYear() - filters.minAge, now.getMonth(), now.getDate());
      query.dateOfBirth = { ...query.dateOfBirth, $lte: maxDate };
    }
  }

  const sort = filters.sort || { createdAt: -1 };
  const limit = filters.limit || 50;
  const skip = filters.skip || 0;

  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select('-password -twoFactorSecret -accountVerificationCode');
};

beneficiarySchema.statics.getStatistics = async function () {
  // W0-LifecycleAlign: دعم الحالات الجديدة + الحالات القديمة (legacy aliases).
  const isArchivedMatch = {
    $or: [
      { isArchived: { $ne: true } },
      { status: { $nin: ['archived', 'inactive', 'deleted', 'deletion-pending'] } },
    ],
  };
  const [counts, byCategory, byStatus] = await Promise.all([
    this.aggregate([
      { $match: isArchivedMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'draft']] }, 1, 0],
            },
          },
          waitlisted: { $sum: { $cond: [{ $eq: ['$status', 'waitlisted'] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          discharged: {
            $sum: {
              $cond: [{ $in: ['$status', ['discharged', 'graduated']] }, 1, 0],
            },
          },
          transferred: { $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] } },
          deceased: { $sum: { $cond: [{ $eq: ['$status', 'deceased'] }, 1, 0] } },
          archived: {
            $sum: {
              $cond: [{ $in: ['$status', ['archived', 'inactive']] }, 1, 0],
            },
          },
          avgProgress: { $avg: '$progress' },
          avgSessions: { $avg: '$sessions' },
        },
      },
    ]),
    this.aggregate([
      { $match: { isArchived: { $ne: true }, category: { $exists: true, $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { isArchived: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const stats = counts[0] || {
    total: 0,
    active: 0,
    pending: 0,
    waitlisted: 0,
    suspended: 0,
    discharged: 0,
    transferred: 0,
    deceased: 0,
    archived: 0,
    avgProgress: 0,
    avgSessions: 0,
  };

  // New this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = await this.countDocuments({
    status: { $nin: ['archived', 'inactive', 'deleted', 'deletion-pending'] },
    createdAt: { $gte: monthStart },
  });

  return {
    ...stats,
    _id: undefined,
    newThisMonth,
    avgProgress: Math.round(stats.avgProgress || 0),
    avgSessions: parseFloat((stats.avgSessions || 0).toFixed(1)),
    completionRate:
      stats.total > 0
        ? Math.round(
            ((await this.countDocuments({
              status: { $nin: ['archived', 'inactive', 'deleted', 'deletion-pending'] },
              progress: { $gte: 80 },
            })) /
              stats.total) *
              100
          )
        : 0,
    byCategory: byCategory.map(c => ({ category: c._id, count: c.count })),
    byStatus: byStatus.map(s => ({ status: s._id, count: s.count })),
  };
};

// Saudi National Address — strict guard. If `nationalAddress` is
// provided it must include a valid Wasel shortCode AND have already
// passed verification (verification.verified === true).
// Old records without any nationalAddress are accepted as-is so this
// rollout doesn't retro-invalidate the existing dataset.
attachNationalAddressGuard(beneficiarySchema, { path: 'nationalAddress', strict: true });

// Auto-issue a UniversalCode (`RH-BNF-XXXXXX`) for every beneficiary —
// powers QR badges, attendance scanning, parent-pickup verification.
try {
  const universalCodePlugin = require('../services/universalCode/plugin');
  beneficiarySchema.plugin(universalCodePlugin, {
    entityType: 'BNF',
    labelFrom: doc =>
      [doc.firstName, doc.middleName, doc.lastName].filter(Boolean).join(' ') ||
      doc.fullName ||
      doc.nameAr ||
      null,
  });
} catch (_e) {
  // Plugin module may be loaded BEFORE service deps are installed in
  // CI bootstrap — silently skip so the model still registers.
}

// W982 — surface beneficiary lifecycle status changes (active → completed /
// paused / dropped) on the unified-core timeline. This is the ONLY path that
// records a status change on the CareTimeline: the env-gated modelEventBridge
// emits `beneficiary.beneficiary.status_changed` to the LIVE-registry
// subscribers (notification/re-publish), which do NOT write the timeline. Here
// we publish the canonical `core.beneficiary.status_changed` consumed by
// dddCrossModuleSubscribers → CareTimeline. Native pre-compile hooks per the
// proven W970 pattern; update-only (a status change, not creation); guarded,
// fire-and-forget. The contract already exists (BENEFICIARY_DDD_EVENTS.STATUS_CHANGED).
beneficiarySchema.pre('save', function () {
  this.$__wasNew = this.isNew;
});
beneficiarySchema.post('init', function () {
  this.$__prevStatus = this.status;
});
beneficiarySchema.post('save', function (doc) {
  try {
    if (this.$__wasNew) return; // creation handled by core.beneficiary.registered
    if (!doc.status || doc.status === this.$__prevStatus) return; // no status change
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    Promise.resolve(
      integrationBus.publish('core', 'beneficiary.status_changed', {
        beneficiaryId: String(doc._id),
        oldStatus: this.$__prevStatus || 'unknown',
        newStatus: doc.status,
        reason: doc.statusReason || doc.statusChangeReason || '',
      })
    ).catch(() => {});
  } catch (_) {
    /* bus not wired — never block persistence */
  }
});

module.exports = mongoose.models.Beneficiary || mongoose.model('Beneficiary', beneficiarySchema);
