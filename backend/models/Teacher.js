/**
 * نموذج المعلم / المدرب
 * Teacher / Instructor Model
 */
const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, unique: true, sparse: true },
    fullName: {
      type: String,
      required: [true, 'اسم المعلم مطلوب'],
      trim: true,
    },
    fullNameEn: { type: String, trim: true },
    nationalId: { type: String, trim: true },
    phone: { type: String },
    email: { type: String, lowercase: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    dateOfBirth: { type: Date },
    nationality: { type: String, default: 'سعودي' },
    photo: { type: String },

    // ── Qualifications ──
    qualifications: [
      {
        degree: {
          type: String,
          enum: ['diploma', 'bachelor', 'master', 'doctorate', 'certificate', 'other'],
        },
        field: { type: String },
        institution: { type: String },
        year: { type: Number },
        grade: { type: String },
      },
    ],
    specializations: [{ type: String }],
    certifications: [
      {
        name: { type: String },
        issuer: { type: String },
        issueDate: { type: Date },
        expiryDate: { type: Date },
        certificateNumber: { type: String },
      },
    ],

    // ── Teaching Info ──
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    department: {
      type: String,
      enum: [
        'islamic_studies',
        'arabic',
        'english',
        'math',
        'science',
        'social_studies',
        'computer_science',
        'physical_education',
        'art',
        'life_skills',
        'special_education',
        'rehabilitation',
        'vocational',
        'montessori',
        'other',
      ],
    },
    role: {
      type: String,
      enum: [
        'teacher',
        'head_teacher',
        'supervisor',
        'coordinator',
        'specialist',
        'therapist',
        'trainer',
      ],
      default: 'teacher',
    },
    contractType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'volunteer'],
      default: 'full_time',
    },
    joinDate: { type: Date },
    yearsOfExperience: { type: Number, default: 0 },

    // ── Workload ──
    workload: {
      maxPeriodsPerWeek: { type: Number, default: 24 },
      currentPeriodsPerWeek: { type: Number, default: 0 },
      maxStudents: { type: Number, default: 100 },
      currentStudents: { type: Number, default: 0 },
      offDays: [{ type: String, enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'] }],
      availableSlots: [
        {
          day: { type: String, enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'] },
          startTime: { type: String },
          endTime: { type: String },
        },
      ],
    },

    // ── Special Education Skills ──
    specialEdSkills: {
      disabilityExpertise: [
        {
          type: String,
          enum: [
            'intellectual',
            'autism',
            'down_syndrome',
            'cerebral_palsy',
            'learning_disability',
            'speech_impairment',
            'hearing_impairment',
            'visual_impairment',
            'physical_disability',
            'multiple_disabilities',
          ],
        },
      ],
      signLanguage: { type: Boolean, default: false },
      braille: { type: Boolean, default: false },
      behaviorManagement: { type: Boolean, default: false },
      assistiveTechnology: { type: Boolean, default: false },
      iepDevelopment: { type: Boolean, default: false },
    },

    // ── Performance ──
    performanceRatings: [
      {
        period: { type: String },
        academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
        rating: { type: Number, min: 1, max: 5 },
        evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comments: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: ['active', 'on_leave', 'suspended', 'terminated', 'retired'],
      default: 'active',
    },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

TeacherSchema.index({ fullName: 'text', fullNameEn: 'text', specializations: 'text' });
TeacherSchema.index({ department: 1, status: 1 });
TeacherSchema.index({ 'specialEdSkills.disabilityExpertise': 1 });
TeacherSchema.index({ subjects: 1 });

module.exports = mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
