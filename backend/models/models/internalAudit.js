const mongoose = require('mongoose');

// ==========================================
// نموذج نظام التدقيق الداخلي الشامل
// Internal Audit Management System
// ==========================================

// 1. نموذج خطة التدقيق السنوية
// Annual Audit Plan Schema
const AnnualAuditPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  titleAr: {
    type: String,
    required: true
  },
  description: String,
  descriptionAr: String,
  
  // الأقسام والعمليات المدرجة
  departments: [{
    departmentId: String,
    departmentName: String,
    departmentNameAr: String,
    auditFrequency: {
      type: String,
      enum: ['quarterly', 'semi-annual', 'annual'],
      default: 'annual'
    },
    estimatedAuditors: Number,
    riskLevel: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    priorities: [String]
  }],
  
  // الأهداف والنطاق
  objectives: [{
    objectiveId: String,
    title: String,
    titleAr: String,
    description: String,
    measurementCriteria: String
  }],
  
  // الموارد المخصصة
  resources: {
    totalBudget: Number,
    allocatedAuditors: Number,
    auditDays: Number,
    supportTools: [String]
  },
  
  // المعايير المراد تطبيقها
  standards: [{
    standardId: String,
    standardName: String,
    applicableGuidelines: [String]
  }],
  
  // جدول التنفيذ
  schedule: [{
    phase: Number,
    quarter: String,
    startDate: Date,
    endDate: Date,
    departments: [String],
    auditors: [String],
    status: {
      type: String,
      enum: ['planned', 'in-progress', 'completed', 'postponed'],
      default: 'planned'
    }
  }],
  
  // الموارد البشرية المسؤولة
  auditTeam: [{
    auditorId: String,
    auditorName: String,
    role: {
      type: String,
      enum: ['lead-auditor', 'auditor', 'observer'],
      default: 'auditor'
    },
    specialization: [String],
    certifications: [String]
  }],
  
  // الحالة
  status: {
    type: String,
    enum: ['draft', 'approved', 'active', 'completed', 'archived'],
    default: 'draft'
  },
  
  approvalInfo: {
    approvedBy: String,
    approvalDate: Date,
    approverRole: String,
    comments: String
  },
  
  createdBy: String,
  createdDate: { type: Date, default: Date.now },
  lastModifiedBy: String,
  lastModifiedDate: Date,
  
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadDate: Date,
    uploadedBy: String
  }]
}, { timestamps: true });

// 2. نموذج عمليات التدقيق المفاجئة
// Surprise Audit Operations Schema
const SurpriseAuditSchema = new mongoose.Schema({
  auditId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['surprise', 'planned', 'follow-up']
  },
  
  // معلومات التدقيق الأساسية
  auditInfo: {
    title: String,
    titleAr: String,
    description: String,
    reason: String,
    reasonAr: String,
    triggeringFactor: String, // سبب التدقيق المفاجئ
    initiatedBy: String,
    initiationDate: Date
  },
  
  // القسم المراد تدقيقه
  auditScope: {
    departmentId: String,
    departmentName: String,
    departmentNameAr: String,
    processArea: String,
    processAreaAr: String,
    scopeDescription: String,
    riskAssessment: String
  },
  
  // فريق التدقيق
  auditTeam: [{
    auditorsId: String,
    auditorName: String,
    role: {
      type: String,
      enum: ['lead', 'member', 'observer'],
      default: 'member'
    },
    responsibility: String
  }],
  
  // جدول التدقيق
  schedule: {
    scheduledDate: Date,
    actualStartDate: Date,
    actualEndDate: Date,
    duration: Number, // بالساعات
    location: String,
    notificationDate: Date,
    notificationMethod: String
  },
  
  // المعايير المراد الفحص عليها
  auditCriteria: [{
    criteriaId: String,
    criteriaTitle: String,
    criteriaType: {
      type: String,
      enum: ['compliance', 'performance', 'process', 'control'],
      default: 'compliance'
    },
    description: String,
    expectedResults: String
  }],
  
  // الأدلة والمستندات
  evidence: [{
    evidenceId: String,
    category: {
      type: String,
      enum: ['document', 'interview', 'observation', 'record', 'sample'],
      default: 'document'
    },
    description: String,
    location: String,
    collectionDate: Date,
    collectedBy: String,
    fileUrl: String,
    findings: String
  }],
  
  // الملاحظات المبدئية
  observations: [{
    observationId: String,
    category: {
      type: String,
      enum: ['strength', 'weakness', 'risk', 'opportunity'],
      default: 'weakness'
    },
    description: String,
    severity: {
      type: String,
      enum: ['critical', 'major', 'minor'],
      default: 'minor'
    },
    relatedCriteria: [String],
    evidenceReferences: [String]
  }],
  
  // الحالة والتقدم
  status: {
    type: String,
    enum: ['planned', 'in-progress', 'fieldwork-complete', 'reporting', 'completed', 'closed'],
    default: 'planned'
  },
  
  progressPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // النتائج الأولية
  preliminaryResults: {
    totalFindingsCount: Number,
    criticalFindingsCount: Number,
    majorFindingsCount: Number,
    minorFindingsCount: Number,
    overallComplianceScore: Number,
    riskRating: String
  },
  
  managementNotification: {
    notificationSent: Boolean,
    notificationDate: Date,
    notificationMethod: String,
    recipientList: [String]
  },
  
  createdBy: String,
  createdDate: { type: Date, default: Date.now },
  lastModifiedBy: String,
  lastModifiedDate: Date
}, { timestamps: true });

// 3. نموذج تقارير عدم المطابقة
// Non-Conformance Reports Schema
const NonConformanceReportSchema = new mongoose.Schema({
  ncrId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // معلومات عدم المطابقة
  reportInfo: {
    title: String,
    titleAr: String,
    description: String,
    descriptionAr: String,
    reportDate: { type: Date, default: Date.now },
    reportedBy: String,
    reporterRole: String
  },
  
  // تصنيف عدم المطابقة
  classification: {
    type: {
      type: String,
      enum: ['external-audit', 'internal-audit', 'management-review', 'customer-complaint', 'process-monitoring', 'other'],
      default: 'internal-audit'
    },
    category: {
      type: String,
      enum: ['critical', 'major', 'minor'],
      default: 'major'
    },
    severity: {
      type: String,
      enum: ['1-Critical', '2-High', '3-Medium', '4-Low'],
      default: '3-Medium'
    },
    immediateImpact: Boolean
  },
  
  // تفاصيل عدم المطابقة
  details: {
    affectedProcessArea: String,
    affectedDepartment: String,
    affectedDepartmentAr: String,
    statementOfNonconformity: String,
    statementAr: String,
    relatedStandard: String,
    requirementNotMet: String,
    rootCause: String,
    potentialImpact: String
  },
  
  // الأدلة
  evidence: [{
    evidenceType: String,
    description: String,
    documentUrl: String,
    attachmentDate: Date
  }],
  
  // التأثير المحدث
  impact: {
    customerImpact: Boolean,
    safetyImpact: Boolean,
    complianceImpact: Boolean,
    financialImpact: Boolean,
    estimatedLoss: Number,
    numberOfAffectedItems: Number,
    impactDescription: String
  },
  
  // الحالة
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'under-investigation', 'action-plan-defined', 'action-in-progress', 'verification-pending', 'closed', 'rejected'],
    default: 'open'
  },
  
  // المالك ومعلومات المتابعة
  ownership: {
    ownerId: String,
    ownerName: String,
    ownerDepartment: String,
    ownerEmail: String,
    assignmentDate: Date
  },
  
  // التعليقات والإجراءات المؤقتة
  temporaryActions: [{
    actionId: String,
    description: String,
    implementedDate: Date,
    implementedBy: String,
    effectiveness: String
  }],
  
  // الأولويات والتواريخ
  priorities: {
    initialResponse: Date,
    investigationDeadline: Date,
    correctionDeadline: Date,
    verificationDeadline: Date
  },
  
  // متابعة الإغلاق
  closingInfo: {
    closedDate: Date,
    closedBy: String,
    verificationMethod: String,
    verificationEvidence: [String],
    closingComments: String,
    preventiveMeasures: String
  },
  
  // التصعيد
  escalation: {
    escalated: Boolean,
    escalationDate: Date,
    escalationReason: String,
    escalatedTo: String
  },
  
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadDate: Date,
    uploadedBy: String
  }],
  
  createdBy: String,
  createdDate: { type: Date, default: Date.now },
  lastModifiedBy: String,
  lastModifiedDate: Date
}, { timestamps: true });

// 4. نموذج الخطط التصحيحية والوقائية
// Corrective and Preventive Actions Schema
const CorrectivePreventiveActionSchema = new mongoose.Schema({
  actionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  type: {
    type: String,
    required: true,
    enum: ['corrective', 'preventive'],
    default: 'corrective'
  },
  
  // الارتباط بعدم المطابقة
  linkedNcr: {
    ncrId: String,
    ncrTitle: String,
    relationshipType: String
  },
  
  // معلومات الإجراء
  actionInfo: {
    title: String,
    titleAr: String,
    description: String,
    descriptionAr: String,
    createdDate: { type: Date, default: Date.now },
    createdBy: String
  },
  
  // تحليل الأسباب الجذرية
  rootCauseAnalysis: {
    method: {
      type: String,
      enum: ['5-why', 'fishbone', 'fault-tree', 'pareto', 'other'],
      default: '5-why'
    },
    analysis: String,
    analysisAr: String,
    identifiedRootCauses: [{
      causeId: String,
      cause: String,
      causeAr: String,
      probability: String,
      contributionPercentage: Number
    }],
    analysisDate: Date,
    analyzedBy: String
  },
  
  // الإجراءات المقترحة
  proposedActions: [{
    actionSequence: Number,
    description: String,
    objective: String,
    expectedOutcome: String,
    implementationMethod: String,
    resourcesRequired: String,
    estimatedCost: Number
  }],
  
  // تفاصيل التنفيذ
  implementation: {
    ownerName: String,
    ownerDepartment: String,
    ownerEmail: String,
    responsibleTeam: [String],
    startDate: Date,
    targetCompletionDate: Date,
    actualCompletionDate: Date,
    status: {
      type: String,
      enum: ['planning', 'approved', 'in-progress', 'completed', 'delayed', 'on-hold'],
      default: 'planning'
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // المراحل والتقدم
  phases: [{
    phaseNumber: Number,
    phaseName: String,
    description: String,
    startDate: Date,
    endDate: Date,
    status: String,
    progress: Number,
    leadPerson: String,
    notes: String
  }],
  
  // الموارد المخصصة
  resources: {
    budget: Number,
    humanResources: [String],
    equipment: [String],
    materials: [String],
    budget_ar: String
  },
  
  // المخاطر والعقبات
  risks: [{
    riskId: String,
    description: String,
    probability: String,
    impact: String,
    mitigationPlan: String,
    mitigationOwner: String
  }],
  
  // المراقبة والتحقق
  monitoring: {
    indicators: [{
      indicatorId: String,
      indicatorName: String,
      targetValue: String,
      currentValue: String,
      measurementFrequency: String,
      dataSource: String
    }],
    reviewSchedule: String,
    monitoringFrequency: String,
    lastReviewDate: Date,
    nextReviewDate: Date
  },
  
  // التحقق من الفعالية
  effectiveness: {
    verificationMethod: {
      type: String,
      enum: ['audit', 'measurement', 'observation', 'review', 'testing'],
      default: 'audit'
    },
    verificationDate: Date,
    verificationResults: String,
    isEffective: Boolean,
    effectivenessScore: Number,
    verificationEvidence: [String],
    verificationBy: String,
    performanceAfterAction: String
  },
  
  // الإغلاق
  closure: {
    closureDate: Date,
    closedBy: String,
    closureComment: String,
    lessonsLearned: String,
    relatedDocumentation: [String],
    applicableToOtherAreas: Boolean,
    recommendations: String
  },
  
  // الحالة الكلية
  overallStatus: {
    type: String,
    enum: ['new', 'assigned', 'in-progress', 'awaiting-verification', 'effective', 'ineffective', 'closed'],
    default: 'new'
  },
  
  attachments: [{
    fileName: String,
    fileUrl: String,
    category: String,
    uploadDate: Date,
    uploadedBy: String
  }],
  
  createdBy: String,
  createdDate: { type: Date, default: Date.now },
  lastModifiedBy: String,
  lastModifiedDate: Date
}, { timestamps: true });

// 5. نموذج متابعة الإغلاق
// Closure Follow-up Schema
const ClosureFollowUpSchema = new mongoose.Schema({
  followUpId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // الارتباط بالمشكلة الأصلية
  linkedTo: {
    type: {
      type: String,
      enum: ['ncr', 'audit-finding', 'corrective-action', 'preventive-action'],
      required: true
    },
    linkedId: String,
    linkedTitle: String
  },
  
  // معلومات المتابعة
  followUpInfo: {
    description: String,
    descriptionAr: String,
    initiatedDate: { type: Date, default: Date.now },
    initiatedBy: String,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'awaiting-evidence', 'completed', 'failed', 'escalated'],
      default: 'pending'
    }
  },
  
  // معايير الإغلاق
  closureCriteria: [{
    criteriaId: String,
    description: String,
    descriptionAr: String,
    measurable: Boolean,
    targetMetrics: String,
    acceptanceCriteria: String,
    verificationMethod: String
  }],
  
  // التحقق من الإغلاق
  closureVerification: {
    verificationDate: Date,
    verifiedBy: String,
    verificationMethod: String,
    allCriteriaMet: Boolean,
    evidenceProvided: [{
      evidenceType: String,
      description: String,
      documentUrl: String,
      attachmentDate: Date
    }],
    verificationNotes: String
  },
  
  // الاختبارات والعينات
  samplingAndTesting: {
    testingRequired: Boolean,
    testType: String,
    sampleSize: Number,
    testingMethod: String,
    testingDate: Date,
    testResults: String,
    testPassed: Boolean,
    testingPerformedBy: String
  },
  
  // عمليات التحقق الإضافية
  additionalVerification: [{
    verificationId: String,
    verificationType: String,
    description: String,
    date: Date,
    performedBy: String,
    results: String,
    passed: Boolean
  }],
  
  // المتابعة الميدانية
  fieldFollowUp: {
    visitRequired: Boolean,
    visitDate: Date,
    visitedBy: String,
    visitDuration: Number,
    departmentVisited: String,
    observations: String,
    photographsAttached: Boolean,
    conclusionOfVisit: String
  },
  
  // المراجعات الفترية
  periodicReviews: [{
    reviewNumber: Number,
    reviewDate: Date,
    reviewedBy: String,
    statusAtReview: String,
    findings: String,
    additionalActionsNeeded: Boolean
  }],
  
  // الموافقة النهائية
  finalApproval: {
    approvalRequired: Boolean,
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'conditional'],
      default: 'pending'
    },
    approvedBy: String,
    approvalDate: Date,
    rejectionReason: String,
    conditionalRequirements: String,
    conditionsMet: Boolean
  },
  
  // الإغلاق النهائي
  finalClosure: {
    closureDate: Date,
    closedBy: String,
    closureReason: {
      type: String,
      enum: ['criteria-met', 'time-expired', 'superseded', 'waived', 'other'],
      default: 'criteria-met'
    },
    closureComments: String,
    lessonsLearned: String,
    preventiveMeasuresImplemented: String,
    documentation: [String]
  },
  
  // إعادة الفتح
  reopening: {
    reopened: Boolean,
    reopeningDate: Date,
    reopeningReason: String,
    reopenedBy: String,
    numberOfReopenings: Number
  },
  
  // الجدول الزمني
  timeline: {
    originalDeadline: Date,
    extensionsRequested: Number,
    finalDeadline: Date,
    daysToClose: Number,
    daysOverdue: Number
  },
  
  // المسؤولية والمحاسبية
  accountability: {
    responsibleParty: String,
    responsibleDepartment: String,
    escalationPerformed: Boolean,
    escalationDetails: String,
    managementReviewRequired: Boolean,
    managementReviewDate: Date
  },
  
  statusOverall: {
    type: String,
    enum: ['not-started', 'in-progress', 'monitoring', 'closed', 'suspended'],
    default: 'not-started'
  },
  
  attachments: [{
    fileName: String,
    fileUrl: String,
    category: String,
    uploadDate: Date,
    uploadedBy: String
  }],
  
  createdBy: String,
  createdDate: { type: Date, default: Date.now },
  lastModifiedBy: String,
  lastModifiedDate: Date
}, { timestamps: true });

// إنشاء الفهارس للبحث السريع
AnnualAuditPlanSchema.index({ year: 1, status: 1 });

// إنشاء النماذج
const AnnualAuditPlan = mongoose.model('AnnualAuditPlan', AnnualAuditPlanSchema);
const SurpriseAudit = mongoose.model('SurpriseAudit', SurpriseAuditSchema);
const NonConformanceReport = mongoose.model('NonConformanceReport', NonConformanceReportSchema);
const CorrectivePreventiveAction = mongoose.model('CorrectivePreventiveAction', CorrectivePreventiveActionSchema);
const ClosureFollowUp = mongoose.model('ClosureFollowUp', ClosureFollowUpSchema);

module.exports = {
  AnnualAuditPlan,
  SurpriseAudit,
  NonConformanceReport,
  CorrectivePreventiveAction,
  ClosureFollowUp
};
