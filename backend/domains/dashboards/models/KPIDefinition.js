/**
 * KPIDefinition Model — نموذج تعريف مؤشرات الأداء الرئيسية
 *
 * يحدد مؤشرات KPI المؤسسية مع القواعد، الأهداف، التنبيهات،
 * والحدود التي تُطلق إشعارات أو إجراءات تصحيحية
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const kpiDefinitionSchema = new Schema(
  {
    // Identity
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    descriptionAr: String,

    // Classification
    category: {
      type: String,
      enum: [
        'clinical_outcomes',
        'operational_efficiency',
        'quality_safety',
        'patient_satisfaction',
        'financial',
        'workforce',
        'research',
        'compliance',
        'access',
        'technology',
      ],
      required: true,
      index: true,
    },
    domain: {
      type: String,
      enum: [
        'core',
        'episodes',
        'assessments',
        'care-plans',
        'sessions',
        'goals',
        'programs',
        'quality',
        'family',
        'group-therapy',
        'tele-rehab',
        'ar-vr',
        'behavior',
        'research',
        'field-training',
        'cross-domain',
      ],
      required: true,
    },

    // Measurement
    unit: { type: String, default: '%' },
    dataType: {
      type: String,
      enum: ['number', 'percentage', 'ratio', 'currency', 'duration', 'count'],
      default: 'number',
    },
    direction: {
      type: String,
      enum: ['higher_is_better', 'lower_is_better', 'target_range'],
      default: 'higher_is_better',
    },
    frequency: {
      type: String,
      enum: ['real_time', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },

    // Targets
    target: {
      value: { type: Number, required: true },
      warningThreshold: Number,
      criticalThreshold: Number,
      stretch: Number,
    },

    // Data source
    calculation: {
      formula: String,
      numeratorQuery: String,
      denominatorQuery: String,
      aggregationPipeline: Schema.Types.Mixed,
      sourceCollections: [String],
    },

    // Benchmarks
    benchmarks: [
      {
        source: {
          type: String,
          enum: ['national', 'international', 'internal', 'industry', 'historical'],
        },
        value: Number,
        year: Number,
        notes: String,
      },
    ],

    // Alerting
    alerts: {
      enabled: { type: Boolean, default: true },
      onWarning: { notify: [String], actions: [String] },
      onCritical: {
        notify: [String],
        actions: [String],
        escalateTo: { type: Schema.Types.ObjectId, ref: 'User' },
      },
      onTarget: { notify: [String] },
    },

    // Ownership
    responsibleRole: String,
    responsibleUser: { type: Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },

    // Status
    status: {
      type: String,
      enum: ['active', 'draft', 'deprecated', 'suspended'],
      default: 'active',
      index: true,
    },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'kpi_definitions',
  }
);

kpiDefinitionSchema.index({ category: 1, status: 1 });
kpiDefinitionSchema.index({ domain: 1, status: 1 });

module.exports =
  mongoose.models.KPIDefinition || mongoose.model('KPIDefinition', kpiDefinitionSchema);
