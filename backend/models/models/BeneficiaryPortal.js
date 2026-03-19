/**
 * Beneficiary Portal Models
 * نماذج بوابة المستفيدين الذكية
 */

const mongoose = require('mongoose');

// ==================== Beneficiary Profile ====================
// نموذج ملف المستفيد
const beneficiarySchema = new mongoose.Schema(
  {
    // Personal Info
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    nationalId: { type: String, unique: true, sparse: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female'] },

    // Family Info
    familySize: Number,
    familyIncome: Number,
    familyMembers: [
      {
        name: String,
        relation: String,
        age: Number,
        status: { type: String, enum: ['student', 'working', 'unemployed', 'retired'] },
      },
    ],

    // Program Enrollment
    enrolledPrograms: [
      {
        programId: mongoose.Schema.Types.ObjectId,
        programName: String,
        enrollmentDate: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['active', 'completed', 'paused', 'dropped'],
          default: 'active',
        },
        progress: Number, // 0-100
      },
    ],

    // Security
    password: { type: String, required: true },
    accountStatus: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    lastLoginDate: Date,
    loginAttempts: { type: Number, default: 0 },
    passwordResetToken: String,
    passwordResetExpires: Date,
    twoFactorSecret: String,
    twoFactorEnabled: { type: Boolean, default: false },

    // Preferences
    preferredLanguage: { type: String, default: 'ar' },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastActivityDate: Date,
    documentUploadCount: { type: Number, default: 0 },
    satisfactionScore: Number, // 1-5
  },
  { timestamps: true }
);

// ==================== Schedule Management ====================
// نموذج الجدول الزمني
const scheduleSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Schedule Items
    items: [
      {
        title: { type: String, required: true },
        description: String,
        category: { type: String, enum: ['session', 'assessment', 'meeting', 'event', 'deadline'] },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        location: String,
        instructor: {
          name: String,
          email: String,
          phone: String,
        },
        isVirtual: { type: Boolean, default: false },
        meetingLink: String,
        attachments: [String], // URLs
        reminder: { type: Boolean, default: true },
        reminderTime: { type: String, default: '24h' }, // 1h, 24h, 1w
        status: {
          type: String,
          enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
          default: 'scheduled',
        },
        attended: { type: Boolean, default: false },
      },
    ],

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ==================== Progress Report ====================
// نموذج تقارير التقدم
const progressReportSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Metrics
    overallProgress: { type: Number, min: 0, max: 100 },
    attendanceRate: { type: Number, min: 0, max: 100 },
    assignmentCompletion: { type: Number, min: 0, max: 100 },
    assessmentScore: { type: Number, min: 0, max: 100 },

    // Details
    sessionsAttended: { type: Number, default: 0 },
    sessionsTotal: { type: Number, default: 0 },
    assignmentsCompleted: { type: Number, default: 0 },
    assignmentsTotal: { type: Number, default: 0 },
    averageGrade: Number,

    // Achievements
    achievements: [
      {
        title: String,
        description: String,
        earnedDate: Date,
        badgeUrl: String,
      },
    ],

    // Feedback
    instructorFeedback: {
      summary: String,
      strengths: [String],
      areasForImprovement: [String],
      recommendations: [String],
      updatedAt: Date,
    },

    // Status
    status: {
      type: String,
      enum: ['on_track', 'at_risk', 'needs_support', 'excellent'],
      default: 'on_track',
    },
    lastUpdated: { type: Date, default: Date.now },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ==================== Secure Messaging ====================
// نموذج النظام الآمن للرسائل
const messageSchema = new mongoose.Schema(
  {
    conversationId: mongoose.Schema.Types.ObjectId,

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    senderName: String,
    senderRole: String, // beneficiary, instructor, admin

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    recipientName: String,

    // Message Content
    subject: String,
    body: { type: String, required: true },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        fileType: String,
        uploadedAt: Date,
      },
    ],

    // Security & Privacy
    isEncrypted: { type: Boolean, default: true },
    encryptionType: { type: String, default: 'AES-256' },

    // Read Status
    readAt: Date,
    isRead: { type: Boolean, default: false },

    // Flags
    isPinned: { type: Boolean, default: false },
    isSpam: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isFlagged: { type: Boolean, default: false },

    // Priority
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: Date, // Message auto-delete
  },
  { timestamps: true }
);

// ==================== Conversation ====================
// نموذج المحادثات
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        role: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],

    title: String,
    type: { type: String, enum: ['direct', 'group'], default: 'direct' },

    // Last Message
    lastMessage: String,
    lastMessageDate: Date,
    lastMessageSenderId: mongoose.Schema.Types.ObjectId,

    // Settings
    isActive: { type: Boolean, default: true },
    muteNotifications: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },

    // Metadata
    messageCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ==================== Satisfaction Survey ====================
// نموذج استطلاعات الرضا
const surveySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    programId: mongoose.Schema.Types.ObjectId,

    // Survey Details
    questions: [
      {
        id: mongoose.Schema.Types.ObjectId,
        type: {
          type: String,
          enum: ['rating', 'multiple_choice', 'text', 'nps', 'likert'],
          required: true,
        },
        question: { type: String, required: true },
        required: { type: Boolean, default: true },
        options: [String], // for multiple_choice
        scale: { type: Number, enum: [5, 10] }, // for rating & NPS
        order: Number,
      },
    ],

    // Timing
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },

    // Settings
    isAnonymous: { type: Boolean, default: true },
    allowSkipQuestions: { type: Boolean, default: false },
    oneResponsePerBeneficiary: { type: Boolean, default: true },

    // Metadata
    createdBy: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ==================== Survey Response ====================
// نموذج إجابات الاستطلاع
const surveyResponseSchema = new mongoose.Schema(
  {
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Survey',
      required: true,
    },

    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      // null if anonymous survey
    },

    // Responses
    responses: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        answer: mongoose.Schema.Types.Mixed, // can be rating, text, or selected option
        value: Number, // numeric value for rating/NPS
      },
    ],

    // Metadata
    completionTime: Number, // in seconds
    completedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ==================== Notification ====================
// نموذج الإخطارات
const notificationSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },

    // Notification Content
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['message', 'schedule', 'progress', 'survey', 'announcement', 'system'],
    },

    // Reference
    relatedItemId: mongoose.Schema.Types.ObjectId,
    relatedItemType: String, // Message, Schedule, Survey, etc.

    // Read Status
    isRead: { type: Boolean, default: false },
    readAt: Date,

    // Delivery
    channels: [{ type: String, enum: ['email', 'sms', 'in_app'] }],
    deliveryStatus: {
      email: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
      sms: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
      inApp: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
    },

    // Priority
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    expiresAt: Date,

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ==================== Document Storage ====================
// نموذج تخزين الوثائق الآمن
const documentSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    programId: mongoose.Schema.Types.ObjectId,

    // Document Info
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: Number,
    fileType: String,
    category: {
      type: String,
      enum: ['assignment', 'certificate', 'transcript', 'resource', 'other'],
    },

    // Metadata
    uploadedBy: mongoose.Schema.Types.ObjectId,
    uploadedAt: { type: Date, default: Date.now },
    expiresAt: Date,

    // Security
    isPublic: { type: Boolean, default: false },
    accessLog: [
      {
        accessedBy: mongoose.Schema.Types.ObjectId,
        accessedAt: Date,
        ipAddress: String,
      },
    ],

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Create Models - Use try-catch to handle model recompilation in tests
const getOrCreateModel = (name, schema) => {
  try {
    return mongoose.model(name);
  } catch (err) {
    if (err.name === 'MissingSchemaError') {
      return mongoose.model(name, schema);
    }
    throw err;
  }
};

const Beneficiary = getOrCreateModel('Beneficiary', beneficiarySchema);
const Schedule = getOrCreateModel('Schedule', scheduleSchema);
const ProgressReport = getOrCreateModel('ProgressReport', progressReportSchema);
const Message = getOrCreateModel('Message', messageSchema);
const Conversation = getOrCreateModel('Conversation', conversationSchema);
const Survey = getOrCreateModel('Survey', surveySchema);
const SurveyResponse = getOrCreateModel('SurveyResponse', surveyResponseSchema);
const Notification = getOrCreateModel('Notification', notificationSchema);
const Document = getOrCreateModel('Document', documentSchema);

module.exports = {
  Beneficiary,
  Schedule,
  ProgressReport,
  Message,
  Conversation,
  Survey,
  SurveyResponse,
  Notification,
  Document,
};
