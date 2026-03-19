/**
 * نموذج ملف الموظف المتقدم
 * Advanced Employee Profile Model
 */

const mongoose = require('mongoose');

// Schema للمؤهلات العلمية
const QualificationSchema = new mongoose.Schema({
  degree: {
    type: String,
    enum: ['ثانوية', 'دبلوم', 'بكالوريوس', 'ماجستير', 'دكتوراه'],
    required: true,
  },
  field: String,
  institution: String,
  graduationDate: Date,
  gpa: Number,
  documents: [String], // مسارات الملفات
  verificationStatus: {
    type: String,
    enum: ['verified', 'pending', 'rejected'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

// Schema للشهادات المهنية
const CertificationSchema = new mongoose.Schema({
  name: String,
  issuingOrganization: String,
  issueDate: Date,
  expiryDate: Date,
  credentialId: String,
  documents: [String],
  renewalReminder: {
    type: Boolean,
    default: false,
  },
  renewalDate: Date,
  status: {
    type: String,
    enum: ['active', 'expired', 'pending_renewal'],
    default: 'active',
  },
  createdAt: { type: Date, default: Date.now },
});

// Schema للتراخيص المهنية
const LicenseSchema = new mongoose.Schema({
  type: String,
  licenseNumber: String,
  issuingAuthority: String,
  issueDate: Date,
  expiryDate: Date,
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'revoked'],
    default: 'active',
  },
  documents: [String],
  renewalHistory: [
    {
      renewalDate: Date,
      certificateNumber: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Schema للدورات التدريبية
const TrainingCourseSchema = new mongoose.Schema({
  courseTitle: String,
  provider: String,
  category: {
    type: String,
    enum: ['تقني', 'إداري', 'قانوني', 'تطوير_مهارات', 'أخرى'],
  },
  startDate: Date,
  endDate: Date,
  duration: Number, // بالساعات
  certificateReceived: Boolean,
  certificateNumber: String,
  documents: [String],
  relevanceToRole: String,
  skillsGained: [String],
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  trainer: String,
  cost: Number,
  createdAt: { type: Date, default: Date.now },
});

// Schema للتخصصات الدقيقة
const SpecializationSchema = new mongoose.Schema({
  field: String,
  proficiencyLevel: {
    type: String,
    enum: ['مبتدئ', 'متوسط', 'متقدم', 'خبير'],
    default: 'متوسط',
  },
  yearsOfExperience: Number,
  certifications: [String],
  projects: [String],
  tools: [String],
  description: String,
  endorsements: {
    count: { type: Number, default: 0 },
    by: [String], // معرّفات الموظفين الذين أيدوا
  },
  createdAt: { type: Date, default: Date.now },
});

// Schema للخبرة السابقة
const WorkExperienceSchema = new mongoose.Schema({
  company: String,
  position: String,
  startDate: Date,
  endDate: Date,
  currentlyWorking: Boolean,
  responsibilities: String,
  achievements: [String],
  reasonForLeaving: String,
  referenceName: String,
  referenceContact: String,
  createdAt: { type: Date, default: Date.now },
});

// Schema الرئيسي لملف الموظف
const EmployeeProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // المعلومات الشخصية
  personalInfo: {
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    nationality: String,
    nationalId: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
  },

  // المعلومات الوظيفية
  jobInfo: {
    department: String,
    position: String,
    employmentType: {
      type: String,
      enum: ['دائم', 'عقد', 'متدرب', 'جزئي'],
    },
    joinDate: Date,
    reportingTo: String, // معرّف المدير المباشر
    salary: Number,
    salaryGrade: String,
    workLocation: String,
  },

  // السجل المهني الشامل
  professionalRecord: {
    qualifications: [QualificationSchema],
    certifications: [CertificationSchema],
    licenses: [LicenseSchema],
    trainingCourses: [TrainingCourseSchema],
    specializations: [SpecializationSchema],
    workExperience: [WorkExperienceSchema],
  },

  // المهارات الأساسية
  skills: {
    technical: [
      {
        name: String,
        proficiencyLevel: {
          type: String,
          enum: ['مبتدئ', 'متوسط', 'متقدم', 'خبير'],
        },
        yearsOfExperience: Number,
      },
    ],
    softSkills: [
      {
        name: String,
        level: {
          type: String,
          enum: ['ضعيف', 'متوسط', 'قوي', 'ممتاز'],
        },
      },
    ],
    languages: [
      {
        language: String,
        proficiencyLevel: {
          type: String,
          enum: ['مبتدئ', 'متوسط', 'متقدم', 'إتقان'],
        },
        certification: String,
      },
    ],
  },

  // الملفات والوثائق
  documents: {
    profilePhoto: String,
    resume: String,
    nationalIdCopy: String,
    contractDocuments: [String],
    otherDocuments: [String],
  },

  // الحالة والأرشيف
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'terminated'],
    default: 'active',
  },
  terminationReason: String,
  terminationDate: Date,

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId,
  updatedBy: mongoose.Schema.Types.ObjectId,
});

// Indexes للبحث السريع
EmployeeProfileSchema.index({ userId: 1 });
EmployeeProfileSchema.index({ 'personalInfo.email': 1 });
EmployeeProfileSchema.index({ 'jobInfo.department': 1 });
EmployeeProfileSchema.index({ 'jobInfo.position': 1 });
EmployeeProfileSchema.index({ status: 1 });

module.exports = mongoose.model('EmployeeProfile', EmployeeProfileSchema);
