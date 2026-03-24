/**
 * Enterprise Pro Models — نماذج الميزات المؤسسية الاحترافية
 *
 * 6 pro modules × multiple schemas = comprehensive enterprise features
 *
 * Modules covered:
 *  1. Audit Trail & Compliance Hub   — مركز التدقيق والامتثال
 *  2. Advanced Report Builder         — مولد التقارير المتقدم
 *  3. Unified Calendar Hub            — التقويم الموحد
 *  4. CRM Pro                         — إدارة العلاقات المتقدمة
 *  5. Warehouse Intelligence          — المستودعات الذكية
 *  6. Project Management Pro          — إدارة المشاريع الاحترافية
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const logger = require('../utils/logger');

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  1. AUDIT TRAIL & COMPLIANCE HUB — مركز التدقيق والامتثال                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const AuditTrailEntrySchema = new Schema(
  {
    entityType: { type: String, required: true, index: true }, // 'Employee', 'Document', 'Invoice', etc.
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    action: {
      type: String,
      enum: [
        'create',
        'update',
        'delete',
        'view',
        'export',
        'approve',
        'reject',
        'archive',
        'restore',
        'share',
        'sign',
        'login',
        'logout',
        'custom',
      ],
      required: true,
    },
    module: { type: String, required: true, index: true }, // 'hr', 'finance', 'fleet', etc.
    changeDetails: {
      fieldName: String,
      oldValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
      changeType: {
        type: String,
        enum: [
          'field_update',
          'status_change',
          'permission_change',
          'bulk_operation',
          'system_event',
        ],
      },
    },
    changes: [{ field: String, from: Schema.Types.Mixed, to: Schema.Types.Mixed }],
    metadata: {
      ipAddress: String,
      userAgent: String,
      deviceType: String,
      sessionId: String,
      geoLocation: { lat: Number, lng: Number, city: String },
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    tags: [String],
    notes: String,
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

AuditTrailEntrySchema.index({ createdAt: -1 });
AuditTrailEntrySchema.index({ module: 1, createdAt: -1 });
AuditTrailEntrySchema.index({ performedBy: 1, createdAt: -1 });

const ComplianceChecklistSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    category: {
      type: String,
      enum: [
        'labor_law',
        'civil_defense',
        'mhrsd',
        'gosi',
        'zakat',
        'data_protection',
        'quality',
        'health_safety',
        'environmental',
        'custom',
      ],
      required: true,
    },
    description: String,
    items: [
      {
        title: { type: String, required: true },
        titleAr: String,
        requirement: String,
        status: {
          type: String,
          enum: ['compliant', 'non_compliant', 'partial', 'not_applicable', 'pending_review'],
          default: 'pending_review',
        },
        evidence: [String], // URLs or document IDs
        dueDate: Date,
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
        lastChecked: Date,
        checkedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    overallScore: { type: Number, default: 0 }, // 0–100
    nextReviewDate: Date,
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

const ComplianceAlertSchema = new Schema(
  {
    checklist: { type: Schema.Types.ObjectId, ref: 'ComplianceChecklist' },
    itemIndex: Number,
    alertType: {
      type: String,
      enum: ['deadline_approaching', 'overdue', 'non_compliant', 'review_needed', 'score_dropped'],
      required: true,
    },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
    message: String,
    messageAr: String,
    isResolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  2. ADVANCED REPORT BUILDER — مولد التقارير المتقدم                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const ReportFieldSchema = new Schema(
  {
    fieldKey: { type: String, required: true },
    label: String,
    labelAr: String,
    dataType: {
      type: String,
      enum: ['text', 'number', 'date', 'currency', 'percentage', 'boolean', 'list'],
    },
    aggregation: { type: String, enum: ['none', 'sum', 'avg', 'min', 'max', 'count', 'distinct'] },
    format: String,
    sortOrder: { type: String, enum: ['asc', 'desc', 'none'], default: 'none' },
    width: Number,
    isVisible: { type: Boolean, default: true },
  },
  { _id: false }
);

const ReportFilterSchema = new Schema(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: [
        'eq',
        'ne',
        'gt',
        'gte',
        'lt',
        'lte',
        'in',
        'nin',
        'contains',
        'starts_with',
        'ends_with',
        'between',
        'is_null',
        'not_null',
      ],
      required: true,
    },
    value: Schema.Types.Mixed,
    valueTo: Schema.Types.Mixed, // for 'between' operator
  },
  { _id: false }
);

const ReportTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    module: { type: String, required: true }, // 'hr', 'finance', 'fleet', 'workflow', etc.
    reportType: {
      type: String,
      enum: ['table', 'chart', 'summary', 'pivot', 'matrix', 'cross_tab'],
      default: 'table',
    },
    dataSource: { type: String, required: true }, // collection or API endpoint
    fields: [ReportFieldSchema],
    filters: [ReportFilterSchema],
    groupBy: [String],
    chartConfig: {
      type: { type: String, enum: ['bar', 'line', 'pie', 'donut', 'area', 'scatter', 'radar'] },
      xAxis: String,
      yAxis: String,
      series: [String],
      colors: [String],
    },
    schedule: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly'] },
      dayOfWeek: Number,
      dayOfMonth: Number,
      time: String,
      recipients: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      format: { type: String, enum: ['pdf', 'excel', 'csv'], default: 'pdf' },
      lastRun: Date,
      nextRun: Date,
    },
    isPublic: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    tags: [String],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

const ReportExecutionSchema = new Schema(
  {
    template: { type: Schema.Types.ObjectId, ref: 'ReportTemplate', required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    filters: [ReportFilterSchema],
    resultCount: Number,
    fileUrl: String,
    fileFormat: { type: String, enum: ['pdf', 'excel', 'csv', 'json'] },
    fileSize: Number,
    executionTime: Number, // ms
    error: String,
    executedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isScheduled: { type: Boolean, default: false },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  3. UNIFIED CALENDAR HUB — التقويم الموحد                                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const CalendarEventSchema = new Schema(
  {
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    eventType: {
      type: String,
      enum: [
        'meeting',
        'appointment',
        'deadline',
        'leave',
        'holiday',
        'maintenance',
        'training',
        'therapy_session',
        'dispatch',
        'academic',
        'exam',
        'task',
        'reminder',
        'custom',
      ],
      required: true,
    },
    module: { type: String }, // source module: 'hr', 'fleet', 'education', etc.
    referenceId: { type: Schema.Types.ObjectId }, // linked entity
    referenceType: String, // 'Meeting', 'Leave', 'Trip', etc.
    start: { type: Date, required: true },
    end: Date,
    allDay: { type: Boolean, default: false },
    recurrence: {
      enabled: { type: Boolean, default: false },
      pattern: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] },
      endDate: Date,
      endAfter: Number, // occurrences
      daysOfWeek: [Number], // 0=Sun..6=Sat
      exceptions: [Date], // skip dates
    },
    location: String,
    room: String,
    color: String,
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    attendees: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'declined', 'tentative'],
          default: 'pending',
        },
      },
    ],
    reminders: [
      {
        minutes: Number,
        method: { type: String, enum: ['notification', 'email', 'sms'], default: 'notification' },
      },
    ],
    calendarType: { type: String, enum: ['gregorian', 'hijri', 'both'], default: 'both' },
    hijriDate: String,
    isPrivate: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

CalendarEventSchema.index({ start: 1, end: 1 });
CalendarEventSchema.index({ createdBy: 1, start: 1 });
CalendarEventSchema.index({ eventType: 1, start: 1 });

const RoomBookingSchema = new Schema(
  {
    room: { type: String, required: true },
    roomName: String,
    roomNameAr: String,
    capacity: Number,
    facilities: [String], // 'projector', 'whiteboard', 'video_conf'
    event: { type: Schema.Types.ObjectId, ref: 'CalendarEvent' },
    bookedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: {
      type: String,
      enum: ['reserved', 'confirmed', 'cancelled', 'in_use'],
      default: 'reserved',
    },
    notes: String,
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  4. CRM PRO — إدارة العلاقات المتقدمة                                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const CRMContactSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: String,
    nameAr: String,
    email: String,
    phone: String,
    mobile: String,
    company: String,
    jobTitle: String,
    source: {
      type: String,
      enum: [
        'website',
        'referral',
        'social_media',
        'cold_call',
        'event',
        'advertisement',
        'partner',
        'walk_in',
        'other',
      ],
      default: 'other',
    },
    tags: [String],
    address: {
      street: String,
      city: String,
      region: String,
      country: { type: String, default: 'SA' },
      postalCode: String,
    },
    socialMedia: { linkedin: String, twitter: String, website: String },
    notes: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    lastContactDate: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

CRMContactSchema.index({ email: 1 });
CRMContactSchema.index({ assignedTo: 1 });
CRMContactSchema.index({ company: 1 });

const CRMPipelineStageSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    order: { type: Number, required: true },
    color: String,
    probability: { type: Number, min: 0, max: 100 }, // win probability %
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const CRMPipelineSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    stages: [CRMPipelineStageSchema],
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

const CRMDealSchema = new Schema(
  {
    title: { type: String, required: true },
    titleAr: String,
    contact: { type: Schema.Types.ObjectId, ref: 'CRMContact' },
    pipeline: { type: Schema.Types.ObjectId, ref: 'CRMPipeline' },
    stage: { type: Schema.Types.ObjectId }, // stage _id within pipeline
    stageName: String,
    value: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    probability: { type: Number, min: 0, max: 100 },
    expectedCloseDate: Date,
    actualCloseDate: Date,
    status: { type: String, enum: ['open', 'won', 'lost', 'stalled'], default: 'open' },
    lostReason: String,
    tags: [String],
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

CRMDealSchema.index({ pipeline: 1, stage: 1 });
CRMDealSchema.index({ status: 1 });
CRMDealSchema.index({ assignedTo: 1 });

const CRMActivitySchema = new Schema(
  {
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'note', 'task', 'follow_up', 'presentation', 'proposal'],
      required: true,
    },
    subject: { type: String, required: true },
    description: String,
    contact: { type: Schema.Types.ObjectId, ref: 'CRMContact' },
    deal: { type: Schema.Types.ObjectId, ref: 'CRMDeal' },
    dueDate: Date,
    completedAt: Date,
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    outcome: String,
    duration: Number, // minutes
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  5. WAREHOUSE INTELLIGENCE — المستودعات الذكية                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const WarehouseSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    code: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['main', 'branch', 'transit', 'returns', 'quarantine', 'cold_storage'],
      default: 'main',
    },
    address: {
      street: String,
      city: String,
      region: String,
      country: { type: String, default: 'SA' },
    },
    manager: { type: Schema.Types.ObjectId, ref: 'User' },
    capacity: { totalArea: Number, usedArea: Number, unit: { type: String, default: 'sqm' } },
    zones: [
      {
        code: String,
        name: String,
        nameAr: String,
        type: { type: String, enum: ['storage', 'receiving', 'shipping', 'staging', 'cold'] },
      },
    ],
    isActive: { type: Boolean, default: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

const WarehouseBinSchema = new Schema(
  {
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    zone: String,
    aisle: String,
    rack: String,
    shelf: String,
    bin: String,
    barcode: String,
    fullPath: String, // 'WH001-A-R1-S2-B3'
    capacity: Number,
    currentStock: { type: Number, default: 0 },
    itemType: String, // preferred item type for this bin
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WarehouseBinSchema.index({ warehouse: 1, fullPath: 1 });

const StockLevelSchema = new Schema(
  {
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    bin: { type: Schema.Types.ObjectId, ref: 'WarehouseBin' },
    quantity: { type: Number, default: 0 },
    reservedQty: { type: Number, default: 0 },
    availableQty: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    maxLevel: Number,
    unitCost: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    lotNumber: String,
    serialNumber: String,
    expiryDate: Date,
    lastRestocked: Date,
    valuationMethod: {
      type: String,
      enum: ['FIFO', 'LIFO', 'weighted_average', 'specific'],
      default: 'weighted_average',
    },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

StockLevelSchema.index({ warehouse: 1, item: 1 });
StockLevelSchema.index({ availableQty: 1 });

const StockAlertSchema = new Schema(
  {
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    alertType: {
      type: String,
      enum: [
        'low_stock',
        'out_of_stock',
        'overstock',
        'expiring_soon',
        'expired',
        'slow_moving',
        'reorder_needed',
      ],
      required: true,
    },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
    message: String,
    messageAr: String,
    currentQty: Number,
    threshold: Number,
    isResolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

const StockTransferOrderSchema = new Schema(
  {
    transferNumber: { type: String, required: true, unique: true },
    fromWarehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    toWarehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    items: [
      {
        item: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
        quantity: { type: Number, required: true },
        fromBin: { type: Schema.Types.ObjectId, ref: 'WarehouseBin' },
        toBin: { type: Schema.Types.ObjectId, ref: 'WarehouseBin' },
        received: { type: Number, default: 0 },
        notes: String,
      },
    ],
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'approved',
        'in_transit',
        'partially_received',
        'received',
        'cancelled',
      ],
      default: 'draft',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    shippedDate: Date,
    receivedDate: Date,
    notes: String,
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  6. PROJECT MANAGEMENT PRO — إدارة المشاريع الاحترافية                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const ProjectProSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    code: { type: String, unique: true },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived'],
      default: 'planning',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    category: String,
    startDate: Date,
    endDate: Date,
    actualStart: Date,
    actualEnd: Date,
    budget: { planned: Number, actual: Number, currency: { type: String, default: 'SAR' } },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    manager: { type: Schema.Types.ObjectId, ref: 'User' },
    team: [
      { user: { type: Schema.Types.ObjectId, ref: 'User' }, role: String, allocation: Number },
    ],
    milestones: [
      {
        name: { type: String, required: true },
        nameAr: String,
        dueDate: Date,
        completedDate: Date,
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'overdue'],
          default: 'pending',
        },
        deliverables: [String],
      },
    ],
    tags: [String],
    isTemplate: { type: Boolean, default: false },
    templateId: { type: Schema.Types.ObjectId, ref: 'ProjectPro' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

const ProjectTaskSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'ProjectPro', required: true },
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    status: {
      type: String,
      enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked'],
      default: 'todo',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    reporter: { type: Schema.Types.ObjectId, ref: 'User' },
    parentTask: { type: Schema.Types.ObjectId, ref: 'ProjectTask' }, // subtask support
    dependencies: [{ type: Schema.Types.ObjectId, ref: 'ProjectTask' }], // blocked by
    milestone: Number, // milestone index in project.milestones
    dueDate: Date,
    startDate: Date,
    estimatedHours: Number,
    actualHours: Number,
    tags: [String],
    attachments: [{ name: String, url: String, size: Number }],
    comments: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    order: { type: Number, default: 0 }, // ordering within Kanban column
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

ProjectTaskSchema.index({ project: 1, status: 1 });
ProjectTaskSchema.index({ assignee: 1, status: 1 });

const ProjectTimeLogSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'ProjectPro', required: true },
    task: { type: Schema.Types.ObjectId, ref: 'ProjectTask' },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hours: { type: Number, required: true },
    date: { type: Date, required: true },
    description: String,
    billable: { type: Boolean, default: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

// ── Helper: register model only if not already compiled ──────────────────────
const reg = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

// ── Export all models ────────────────────────────────────────────────────────
module.exports = {
  // Audit Trail & Compliance
  AuditTrailEntry: reg('AuditTrailEntry', AuditTrailEntrySchema),
  ComplianceChecklist: reg('ComplianceChecklist', ComplianceChecklistSchema),
  ComplianceAlert: reg('ComplianceAlert', ComplianceAlertSchema),

  // Report Builder
  ReportTemplate: reg('ReportTemplate', ReportTemplateSchema),
  ReportExecution: reg('ReportExecution', ReportExecutionSchema),

  // Unified Calendar
  CalendarEvent: reg('CalendarEvent', CalendarEventSchema),
  RoomBooking: reg('RoomBooking', RoomBookingSchema),

  // CRM Pro
  CRMContact: reg('CRMContact', CRMContactSchema),
  CRMPipeline: reg('CRMPipeline', CRMPipelineSchema),
  CRMDeal: reg('CRMDeal', CRMDealSchema),
  CRMActivity: reg('CRMActivity', CRMActivitySchema),

  // Warehouse Intelligence
  Warehouse: reg('Warehouse', WarehouseSchema),
  WarehouseBin: reg('WarehouseBin', WarehouseBinSchema),
  StockLevel: reg('StockLevel', StockLevelSchema),
  StockAlert: reg('StockAlert', StockAlertSchema),
  StockTransferOrder: reg('StockTransferOrder', StockTransferOrderSchema),

  // Project Management Pro
  ProjectPro: reg('ProjectPro', ProjectProSchema),
  ProjectTask: reg('ProjectTask', ProjectTaskSchema),
  ProjectTimeLog: reg('ProjectTimeLog', ProjectTimeLogSchema),
};

logger.info('EnterprisePro models loaded OK — 18 schemas across 6 modules');
