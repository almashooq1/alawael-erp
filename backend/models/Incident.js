// backend/models/Incident.js
// نموذج الحوادث الشامل
// Comprehensive Incident Management Model

const mongoose = require('mongoose');

// نموذج تقييم الأثر
const impactAssessmentSchema = new mongoose.Schema({
  businessImpact: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'],
    default: 'MEDIUM'
  },
  affectedServices: [{
    serviceName: String,
    severity: {
      type: String,
      enum: ['DOWN', 'DEGRADED', 'MINOR', 'NONE']
    },
    estimatedUsers: Number
  }],
  financialImpact: {
    estimatedLoss: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'SAR'
    },
    justification: String
  },
  reputationalImpact: {
    type: Boolean,
    default: false
  },
  reguatoryImpact: {
    type: Boolean,
    default: false
  },
  regulatoryBody: String,
  assessmentDate: {
    type: Date,
    default: Date.now
  },
  assessedBy: mongoose.Schema.Types.ObjectId,
  notes: String
});

// نموذج المستجيب
const responderSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  name: String,
  role: {
    type: String,
    enum: ['PRIMARY', 'SECONDARY', 'SUPPORT', 'OBSERVER']
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  assignedBy: mongoose.Schema.Types.ObjectId,
  status: {
    type: String,
    enum: ['ASSIGNED', 'ACKNOWLEDGED', 'WORKING', 'COMPLETED', 'REPLACED'],
    default: 'ASSIGNED'
  },
  timeSpent: {
    type: Number,
    default: 0 // في الدقائق
  },
  actions: [{
    description: String,
    timestamp: Date,
    status: String
  }],
  contactInfo: {
    phone: String,
    email: String
  },
  notes: String
});

// نموذج التصعيد
const escalationSchema = new mongoose.Schema({
  escalationLevel: {
    type: Number,
    enum: [1, 2, 3, 4],
    default: 1
  },
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  escalatedBy: mongoose.Schema.Types.ObjectId,
  escalationReason: String,
  escalatedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  escalationNotes: String,
  status: {
    type: String,
    enum: ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'],
    default: 'PENDING'
  }
});

// نموذج الحل
const resolutionSchema = new mongoose.Schema({
  resolutionTime: {
    type: Number,
    default: 0 // في الدقائق
  },
  rootCause: String,
  rootCauseAnalysis: String,
  solution: String,
  permanentFix: Boolean,
  temporaryWorkaround: String,
  resolvedBy: mongoose.Schema.Types.ObjectId,
  resolvedAt: Date,
  verificationMethod: String,
  verifiedBy: mongoose.Schema.Types.ObjectId,
  verifiedAt: Date
});

// نموذج المرفقات
const attachmentSchema = new mongoose.Schema({
  fileName: String,
  fileUrl: String,
  fileType: String,
  fileSize: Number,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: mongoose.Schema.Types.ObjectId,
  description: String,
  attachmentType: {
    type: String,
    enum: ['LOG', 'SCREENSHOT', 'DOCUMENT', 'EMAIL', 'OTHER']
  }
});

// نموذج الحدث التاريخي
const timelineEventSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  eventType: String,
  description: String,
  performedBy: mongoose.Schema.Types.ObjectId,
  status: String,
  details: mongoose.Schema.Types.Mixed
});

// النموذج الرئيسي للحادثة
const incidentSchema = new mongoose.Schema({
  // معرّف وتصنيف الحادثة
  incidentNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  title: {
    type: String,
    required: [true, 'عنوان الحادثة مطلوب'],
    minlength: 5,
    maxlength: 200,
    text: true
  },
  description: {
    type: String,
    required: [true, 'وصف الحادثة مطلوب'],
    maxlength: 2000
  },
  category: {
    type: String,
    enum: [
      'SECURITY_BREACH',      // انتهاك أمني
      'SYSTEM_OUTAGE',        // عطل نظام
      'NETWORK_ISSUE',        // مشكلة شبكة
      'DATABASE_FAILURE',     // فشل قاعدة بيانات
      'APPLICATION_ERROR',    // خطأ تطبيق
      'HARDWARE_FAILURE',     // فشل أجهزة
      'PERFORMANCE_ISSUE',    // مشكلة أداء
      'DATA_LOSS',           // فقدان بيانات
      'COMPLIANCE_ISSUE',     // مشكلة التوافقية
      'COMMUNICATION_ISSUE',  // مشكلة اتصالات
      'HUMAN_ERROR',         // خطأ بشري
      'THIRD_PARTY_ISSUE',   // مشكلة جهة خارجية
      'ENVIRONMENTAL',       // مشاكل بيئية
      'OTHER'                // أخرى
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM',
    required: true
  },
  priority: {
    type: String,
    enum: ['P1', 'P2', 'P3', 'P4', 'P5'],
    default: 'P3'
  },

  // معلومات اكتشاف الحادثة
  discoveryInfo: {
    discoveredAt: {
      type: Date,
      default: Date.now
    },
    discoveredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedAt: Date,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    detectionMethod: {
      type: String,
      enum: ['AUTOMATED', 'MANUAL_REPORT', 'MONITORING', 'CUSTOMER_COMPLAINT', 'OTHER']
    }
  },

  // تفاصيل المنظمة
  organizationInfo: {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    affectedDepartments: [mongoose.Schema.Types.ObjectId],
    location: String,
    environment: {
      type: String,
      enum: ['PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST'],
      default: 'PRODUCTION'
    }
  },

  // معلومات الحالة
  status: {
    type: String,
    enum: [
      'REPORTED',        // تم الإبلاغ عن الحادثة
      'ACKNOWLEDGED',    // تم تأكيد الاستقبال
      'INVESTIGATING',   // قيد التحقيق
      'IDENTIFIED',      // تم تحديد السبب
      'IN_RESOLUTION',   // قيد الحل
      'RESOLVED',        // تم الحل
      'CLOSED',          // مغلقة
      'REOPENED'         // أعيد فتحها
    ],
    default: 'REPORTED'
  },

  // معالجات وفريق الاستجابة
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  responders: [responderSchema],
  teamLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // معلومات التصعيد
  escalations: [escalationSchema],
  isEscalated: {
    type: Boolean,
    default: false
  },
  currentEscalationLevel: {
    type: Number,
    default: 1
  },
  escalationThreshold: Number, // بالدقائق

  // تقييم الأثر
  impactAssessment: impactAssessmentSchema,

  // معلومات الحل
  resolution: resolutionSchema,

  // الجدول الزمني
  timeline: [timelineEventSchema],

  // الاتصالات والإشعارات
  communications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Communication'
  }],
  notificationsSent: [{
    recipientGroup: String,
    sentAt: Date,
    channel: String,
    status: String,
    subject: String
  }],

  // المرفقات والوثائق
  attachments: [attachmentSchema],

  // معلومات الفحص أثناء الحل
  diagnosticInfo: {
    logs: [{
      logFile: String,
      uploadedAt: Date,
      severity: String
    }],
    metrics: [{
      metricName: String,
      metricValue: Number,
      unit: String,
      timestamp: Date
    }],
    systemStates: [{
      componentName: String,
      state: String,
      timestamp: Date
    }]
  },

  // الاختبار والتحقق
  testing: {
    testPlan: String,
    testCases: [{
      testCase: String,
      status: String,
      result: String,
      testedAt: Date,
      testedBy: mongoose.Schema.Types.ObjectId
    }],
    allTestsPass: Boolean,
    testCompletedAt: Date
  },

  // التعليقات والملاحظات
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    comment: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    attachments: [String],
    isInternal: {
      type: Boolean,
      default: true
    }
  }],

  // المتطلبات والمتابعة
  followUp: {
    requiresFollowUp: {
      type: Boolean,
      default: false
    },
    followUpDate: Date,
    followUpTask: String,
    followUpStatus: String
  },

  // تحليل الأسباب الجذرية (Post-Mortem)
  postMortem: {
    required: Boolean,
    scheduledDate: Date,
    completedDate: Date,
    findings: String,
    preventiveMeasures: [{
      measure: String,
      priority: String,
      owner: mongoose.Schema.Types.ObjectId,
      dueDate: Date,
      status: String
    }],
    lessonsLearned: String
  },

  // معايير الأداء (SLA)
  sla: {
    responseTimeTarget: Number,      // بالدقائق
    resolutionTimeTarget: Number,    // بالدقائق
    responseTimeActual: Number,      // بالدقائق
    resolutionTimeActual: Number,    // بالدقائق
    slaStatus: {
      type: String,
      enum: ['MET', 'AT_RISK', 'BREACHED'],
      default: 'MET'
    },
    breachNotificationSent: Boolean
  },

  // معلومات الإغلاق
  closure: {
    closureReason: {
      type: String,
      enum: ['RESOLVED', 'DUPLICATE', 'CANNOT_REPRODUCE', 'INVALID', 'DEFERRED', 'OTHER']
    },
    closureNotes: String,
    closedAt: Date,
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // معلومات تدقيق
  auditInfo: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedAt: Date,
    ipAddress: String,
    userAgent: String
  },

  // البيانات الوصفية
  tags: [String],
  relatedIncidents: [mongoose.Schema.Types.ObjectId],
  knowledgeBaseArticles: [String],
  externalReferences: [String],

  // الإحصائيات
  metrics: {
    timeToDetection: Number,
    timeToAcknowledge: Number,
    timeToIdentify: Number,
    timeToResolve: Number,
    numberOfEscalations: Number,
    numberOfResponders: Number,
    numberOfComments: Number,
    numberOfAttachments: Number
  },

  // حالة الأرشفة
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: mongoose.Schema.Types.ObjectId

}, {
  timestamps: true,
  collection: 'incidents'
});

// الفهارس
incidentSchema.index({ incidentNumber: 1 });
incidentSchema.index({ status: 1, severity: 1 });
incidentSchema.index({ 'discoveryInfo.discoveredAt': -1 });
incidentSchema.index({ category: 1, status: 1 });
incidentSchema.index({ severity: 1, priority: 1 });
incidentSchema.index({ 'organizationInfo.departmentId': 1 });
incidentSchema.index({ 'auditInfo.createdAt': -1 });
incidentSchema.index({ tags: 1 });
incidentSchema.index({ relatedIncidents: 1 });
incidentSchema.index({ title: 'text', description: 'text' });
incidentSchema.index({ 'sla.slaStatus': 1, status: 1 });

// الطرق المساعدة
incidentSchema.methods.generateIncidentNumber = function() {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-6);
  this.incidentNumber = `INC-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${timestamp}`;
  return this.incidentNumber;
};

incidentSchema.methods.updateStatus = function(newStatus, updatedBy) {
  const oldStatus = this.status;
  this.status = newStatus;

  this.timeline.push({
    timestamp: new Date(),
    eventType: 'STATUS_CHANGE',
    description: `تغيير الحالة من ${oldStatus} إلى ${newStatus}`,
    performedBy: updatedBy,
    status: newStatus,
    details: { oldStatus, newStatus }
  });

  return this;
};

incidentSchema.methods.addResponder = function(responderData) {
  this.responders.push(responderData);
  return this;
};

incidentSchema.methods.calculateMetrics = function() {
  const createdAt = this.discoveryInfo.discoveredAt;
  const acknowledgedAt = this.timeline.find(e => e.eventType === 'ACKNOWLEDGED')?.timestamp;
  const resolvedAt = this.resolution?.resolvedAt;

  if (acknowledgedAt) {
    this.metrics.timeToAcknowledge = Math.floor((acknowledgedAt - createdAt) / 1000 / 60);
  }

  if (resolvedAt) {
    this.metrics.timeToResolve = Math.floor((resolvedAt - createdAt) / 1000 / 60);
  }

  this.metrics.numberOfEscalations = this.escalations.length;
  this.metrics.numberOfResponders = this.responders.length;
  this.metrics.numberOfComments = this.comments.length;
  this.metrics.numberOfAttachments = this.attachments.length;

  return this;
};

incidentSchema.methods.checkSLABreach = function() {
  if (this.metrics.timeToResolve && this.sla.resolutionTimeTarget) {
    if (this.metrics.timeToResolve > this.sla.resolutionTimeTarget) {
      this.sla.slaStatus = 'BREACHED';
    }
  }
  return this;
};

incidentSchema.methods.addComment = function(commentData) {
  this.comments.push({
    ...commentData,
    timestamp: new Date()
  });
  return this;
};

incidentSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push({
    ...attachmentData,
    uploadedAt: new Date()
  });
  return this;
};

// تحديث الطوابع الزمنية
incidentSchema.pre('save', function(next) {
  this.auditInfo.lastModifiedAt = new Date();
  next();
});

const Incident = mongoose.model('Incident', incidentSchema);

module.exports = Incident;
