/**
 * Therapy Sessions Model
 * نظام جدولة وإدارة الجلسات العلاجية
 */

const mongoose = require('mongoose');

const therapySessionSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // معلومات الجلسة
    sessionType: {
      enum: ['physical', 'occupational', 'speech', 'behavioral', 'psychological', 'group'],
      required: true,
    },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduledDate: { type: Date, required: true },
    duration: Number, // بالدقائق
    notes: String,

    // الحضور والنتائج
    attended: Boolean,
    attendanceDate: Date,
    behaviorDuringSession: String,
    progressNotes: String,
    objectives: [String],
    activitiesCompleted: [String],

    // الحالة
    status: {
      enum: ['scheduled', 'completed', 'canceled', 'rescheduled', 'no-show'],
      default: 'scheduled',
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'therapy_sessions' }
);

therapySessionSchema.index({ caseId: 1, scheduledDate: -1 });
therapySessionSchema.index({ beneficiaryId: 1 });
therapySessionSchema.index({ therapist: 1 });
therapySessionSchema.index({ status: 1 });

/**
 * Progress Tracking Model
 * نظام تتبع تقدم المستفيدين والأهداف
 */

const progressTrackingSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // الأهداف
    goals: [
      {
        goalId: String,
        title: String,
        domain: String, // cognitive, behavioral, physical, etc.
        targetDate: Date,
        status: {
          enum: ['not_started', 'in_progress', 'achieved', 'modified'],
          default: 'in_progress',
        },
        progressPercentage: { type: Number, min: 0, max: 100 },
        metrics: [
          {
            date: Date,
            value: Number,
            notes: String,
          },
        ],
      },
    ],

    // الإحصائيات
    statistics: {
      overallProgress: { type: Number, min: 0, max: 100 },
      goalsAchieved: Number,
      goalsInProgress: Number,
      goalsModified: Number,
      riskFactors: [String],
      strengthAreas: [String],
    },

    // التقارير
    monthlyReport: {
      month: Date,
      summary: String,
      achievements: [String],
      challenges: [String],
      nextSteps: [String],
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'progress_tracking' }
);

progressTrackingSchema.index({ caseId: 1 });
progressTrackingSchema.index({ beneficiaryId: 1 });
progressTrackingSchema.index({ 'goals.status': 1 });

/**
 * Family Communication Model
 * نظام التواصل مع العائلات
 */

const familyCommunicationSchema = new mongoose.Schema(
  {
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },

    // الرسائل والإشعارات
    messages: [
      {
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        subject: String,
        content: String,
        attachments: [String],
        sentDate: { type: Date, default: Date.now },
        readDate: Date,
        type: { enum: ['general', 'progress', 'alert', 'appointment', 'urgent'] },
      },
    ],

    // الاجتماعات
    meetings: [
      {
        date: Date,
        attendees: [String],
        topic: String,
        notes: String,
        decisions: [String],
      },
    ],

    // التقارير للعائلة
    familyReports: [
      {
        period: String,
        summary: String,
        generalInfo: String,
        achievements: [String],
        areasForImprovement: [String],
        recommendations: [String],
        createdDate: Date,
      },
    ],

    // معلومات الاتصال
    preferredContactMethod: { enum: ['email', 'phone', 'sms', 'whatsapp', 'in-person'] },
    lastContactDate: Date,
    contactFrequency: { enum: ['weekly', 'bi-weekly', 'monthly', 'quarterly'] },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'family_communication' }
);

familyCommunicationSchema.index({ beneficiaryId: 1 });
familyCommunicationSchema.index({ 'messages.sentDate': -1 });
familyCommunicationSchema.index({ 'meetings.date': -1 });

/**
 * Medical Records Model
 * نظام إدارة السجلات الطبية
 */

const medicalRecordsSchema = new mongoose.Schema(
  {
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },

    // الفحوصات الطبية
    medicalVisits: [
      {
        date: Date,
        doctor: String,
        clinic: String,
        diagnosis: String,
        treatment: String,
        medications: [String],
        followUpRequired: Boolean,
        followUpDate: Date,
      },
    ],

    // الوصفات الطبية
    prescriptions: [
      {
        medicationName: String,
        dosage: String,
        frequency: String,
        startDate: Date,
        endDate: Date,
        doctor: String,
        reason: String,
        sideEffects: [String],
      },
    ],

    // التقارير المختبرية
    labResults: [
      {
        testName: String,
        date: Date,
        results: mongoose.Schema.Types.Mixed,
        doctor: String,
        notes: String,
      },
    ],

    // الملفات والمرفقات
    documents: [
      {
        type: String, // تقرير، صورة شعاعية، إلخ
        fileName: String,
        fileUrl: String,
        uploadDate: Date,
      },
    ],

    // الحساسية والتفاعلات
    allergies: [
      {
        substance: String,
        reaction: String,
        severity: { enum: ['mild', 'moderate', 'severe'] },
      },
    ],

    // التطعيمات
    vaccinations: [
      {
        name: String,
        date: Date,
        nextDueDate: Date,
        batchNumber: String,
      },
    ],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'medical_records' }
);

medicalRecordsSchema.index({ beneficiaryId: 1 });
medicalRecordsSchema.index({ 'medicalVisits.date': -1 });
medicalRecordsSchema.index({ 'prescriptions.startDate': 1 });

/**
 * Attendance Model
 * نظام تتبع الحضور والسلوك
 */

const attendanceSchema = new mongoose.Schema(
  {
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },

    // السجل اليومي
    dailyRecords: [
      {
        date: { type: Date, required: true },
        status: {
          enum: ['present', 'absent', 'late', 'early_leave', 'medical_leave'],
          required: true,
        },
        timeIn: Date,
        timeOut: Date,
        behavior: {
          attention: { type: Number, min: 1, max: 5 },
          participation: { type: Number, min: 1, max: 5 },
          cooperation: { type: Number, min: 1, max: 5 },
          conduct: String,
          incidents: [String],
          notes: String,
        },
      },
    ],

    // الإحصائيات
    statistics: {
      totalDays: Number,
      presentDays: Number,
      absentDays: Number,
      lateDays: Number,
      attendancePercentage: { type: Number, min: 0, max: 100 },
      lastUpdated: Date,
    },

    // الإجازات والغياب
    leaves: [
      {
        startDate: Date,
        endDate: Date,
        reason: String,
        approvedBy: String,
        type: { enum: ['medical', 'personal', 'vacation', 'other'] },
      },
    ],

    // التقارير الشهرية
    monthlyReports: [
      {
        month: Date,
        attendanceRate: Number,
        behaviorSummary: String,
        positiveNotes: [String],
        areasForImprovement: [String],
      },
    ],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'attendance' }
);

attendanceSchema.index({ beneficiaryId: 1, 'dailyRecords.date': -1 });
attendanceSchema.index({ 'dailyRecords.status': 1 });

module.exports = {
  TherapySession: mongoose.model('TherapySession', therapySessionSchema),
  ProgressTracking: mongoose.model('ProgressTracking', progressTrackingSchema),
  FamilyCommunication: mongoose.model('FamilyCommunication', familyCommunicationSchema),
  MedicalRecords: mongoose.model('MedicalRecords', medicalRecordsSchema),
  Attendance: mongoose.model('Attendance', attendanceSchema),
};
