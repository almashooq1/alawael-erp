'use strict';
/**
 * DddDataWarehouse Model
 * Auto-extracted from services/dddDataWarehouse.js
 */
const mongoose = require('mongoose');

const dddETLPipelineSchema = new mongoose.Schema(
  {
    pipelineId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    sourceDomain: { type: String, required: true },
    sourceCollection: { type: String, required: true },
    targetCollection: { type: String, required: true },
    extractStage: {
      query: { type: mongoose.Schema.Types.Mixed, default: {} },
      fields: [String],
      dateField: { type: String, default: 'createdAt' },
    },
    transformStage: {
      pipeline: [mongoose.Schema.Types.Mixed],
      mappings: [{ from: String, to: String, transform: String }],
    },
    loadStage: {
      mode: { type: String, enum: ['upsert', 'append', 'replace'], default: 'upsert' },
      keyFields: [String],
    },
    schedule: { type: String },
    lastRun: { type: Date },
    lastRunStatus: {
      type: String,
      enum: ['success', 'failed', 'partial', 'running'],
      default: 'success',
    },
    lastRunDuration: { type: Number },
    recordsProcessed: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dddETLPipelineSchema.index({ sourceDomain: 1, isActive: 1 });
dddETLPipelineSchema.index({ lastRunStatus: 1 });

const DDDETLPipeline =
  mongoose.models.DDDETLPipeline || mongoose.model('DDDETLPipeline', dddETLPipelineSchema);

const dddMaterializedViewSchema = new mongoose.Schema(
  {
    viewId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    sourceCollection: { type: String, required: true },
    targetCollection: { type: String, required: true },
    pipeline: [mongoose.Schema.Types.Mixed],
    dimensions: [{ field: String, label: String, type: String }],
    measures: [{ field: String, label: String, aggregation: String }],
    refreshSchedule: { type: String, default: '0 2 * * *' },
    lastRefresh: { type: Date },
    nextRefresh: { type: Date },
    documentCount: { type: Number, default: 0 },
    sizeBytes: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'refreshing', 'stale', 'error'], default: 'active' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dddMaterializedViewSchema.index({ status: 1, isActive: 1 });

const DDDMaterializedView =
  mongoose.models.DDDMaterializedView ||
  mongoose.model('DDDMaterializedView', dddMaterializedViewSchema);

const dddOLAPCubeSchema = new mongoose.Schema(
  {
    cubeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    domain: { type: String, required: true },
    factTable: { type: String, required: true },
    dimensions: [
      {
        name: String,
        field: String,
        hierarchy: [{ level: String, field: String }],
      },
    ],
    measures: [
      {
        name: String,
        field: String,
        aggregation: { type: String, enum: ['sum', 'avg', 'count', 'min', 'max', 'distinct'] },
      },
    ],
    preAggregations: [
      {
        key: String,
        dimensions: [String],
        measures: [String],
        schedule: String,
        lastBuild: Date,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dddOLAPCubeSchema.index({ domain: 1, isActive: 1 });

const DDDOLAPCube = mongoose.models.DDDOLAPCube || mongoose.model('DDDOLAPCube', dddOLAPCubeSchema);

/* ═══════════════════════════════════════════════════════════════
   Builtin ETL Pipelines (≥10)
   ═══════════════════════════════════════════════════════════════ */

const BUILTIN_PIPELINES = [
  {
    pipelineId: 'etl-sessions-daily',
    name: 'Daily Sessions Aggregation',
    nameAr: 'تجميع الجلسات اليومية',
    sourceDomain: 'sessions',
    sourceCollection: 'clinicalsessions',
    targetCollection: 'dw_sessions_daily',
    extractStage: { dateField: 'createdAt' },
    transformStage: {
      pipeline: [
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              therapist: '$therapist',
              domain: '$domain',
            },
            count: { $sum: 1 },
            avgDuration: { $avg: '$duration' },
            noShows: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
          },
        },
      ],
    },
    loadStage: { mode: 'upsert', keyFields: ['_id'] },
    schedule: '0 1 * * *',
  },
  {
    pipelineId: 'etl-assessments-weekly',
    name: 'Weekly Assessment Scores',
    nameAr: 'درجات التقييم الأسبوعية',
    sourceDomain: 'assessments',
    sourceCollection: 'clinicalassessments',
    targetCollection: 'dw_assessments_weekly',
    extractStage: { dateField: 'createdAt' },
    transformStage: {
      pipeline: [
        {
          $group: {
            _id: {
              week: { $isoWeek: '$createdAt' },
              year: { $isoWeekYear: '$createdAt' },
              domain: '$domain',
            },
            count: { $sum: 1 },
            avgScore: { $avg: '$totalScore' },
          },
        },
      ],
    },
    loadStage: { mode: 'upsert', keyFields: ['_id'] },
    schedule: '0 3 * * 0',
  },
  {
    pipelineId: 'etl-goals-monthly',
    name: 'Monthly Goal Achievement',
    nameAr: 'إنجاز الأهداف الشهرية',
    sourceDomain: 'goals',
    sourceCollection: 'therapeuticgoals',
    targetCollection: 'dw_goals_monthly',
    extractStage: { dateField: 'createdAt' },
    transformStage: {
      pipeline: [
        {
          $group: {
            _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
            total: { $sum: 1 },
            achieved: { $sum: { $cond: [{ $eq: ['$status', 'achieved'] }, 1, 0] } },
          },
        },
      ],
    },
    loadStage: { mode: 'upsert', keyFields: ['_id'] },
    schedule: '0 4 1 * *',
  },
  {
    pipelineId: 'etl-episodes-summary',
    name: 'Episode Summary ETL',
    nameAr: 'تلخيص الحلقات العلاجية',
    sourceDomain: 'episodes',
    sourceCollection: 'episodesofcares',
    targetCollection: 'dw_episodes_summary',
    extractStage: { dateField: 'createdAt' },
    transformStage: {
      pipeline: [
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgDuration: {
              $avg: { $subtract: [{ $ifNull: ['$endDate', '$$NOW'] }, '$startDate'] },
            },
          },
        },
      ],
    },
    loadStage: { mode: 'replace', keyFields: ['_id'] },
    schedule: '0 2 * * *',
  },
  {
    pipelineId: 'etl-beneficiary-demographics',
    name: 'Beneficiary Demographics',
    nameAr: 'ديموغرافيا المستفيدين',
    sourceDomain: 'core',
    sourceCollection: 'beneficiaries',
    targetCollection: 'dw_demographics',
    extractStage: { dateField: 'createdAt' },
    transformStage: {
      pipeline: [
        { $group: { _id: { gender: '$gender', region: '$address.region' }, count: { $sum: 1 } } },
      ],
    },
    loadStage: { mode: 'replace', keyFields: ['_id'] },
    schedule: '0 5 * * 0',
  },
  {
    pipelineId: 'etl-workflow-metrics',
    name: 'Workflow Task Metrics',
    nameAr: 'مقاييس المهام',
    sourceDomain: 'workflow',
    sourceCollection: 'workflowtasks',
    targetCollection: 'dw_workflow_metrics',
    extractStage: { dateField: 'createdAt' },
    transformStage: {
      pipeline: [
        { $group: { _id: { status: '$status', priority: '$priority' }, count: { $sum: 1 } } },
      ],
    },
    loadStage: { mode: 'replace', keyFields: ['_id'] },
    schedule: '0 6 * * *',
  },
  {
    pipelineId: 'etl-quality-audits',
    name: 'Quality Audit Rollup',
    nameAr: 'تلخيص مراجعات الجودة',
    sourceDomain: 'quality',
    sourceCollection: 'qualityaudits',
    targetCollection: 'dw_quality_rollup',
    extractStage: { dateField: 'createdAt' },
    transformStage: {
      pipeline: [
        {
          $group: {
            _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
            avgScore: { $avg: '$score' },
            total: { $sum: 1 },
          },
        },
      ],
    },
    loadStage: { mode: 'upsert', keyFields: ['_id'] },
    schedule: '0 3 1 * *',
  },
  {
    pipelineId: 'etl-family-engagement',
    name: 'Family Engagement Metrics',
    nameAr: 'مقاييس مشاركة الأسرة',
    sourceDomain: 'family',
    sourceCollection: 'familycommunications',
    targetCollection: 'dw_family_engagement',
    extractStage: { dateField: 'createdAt' },
    transformStage: {
      pipeline: [
        { $group: { _id: { type: '$type', month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ],
    },
    loadStage: { mode: 'upsert', keyFields: ['_id'] },
    schedule: '0 4 * * 0',
  },
  {
    pipelineId: 'etl-telerehab-usage',
    name: 'Tele-Rehab Usage Metrics',
    nameAr: 'مقاييس إعادة التأهيل عن بُعد',
    sourceDomain: 'tele-rehab',
    sourceCollection: 'telesessions',
    targetCollection: 'dw_telerehab',
    extractStage: { dateField: 'createdAt' },
    transformStage: {
      pipeline: [
        {
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
            count: { $sum: 1 },
            avgDuration: { $avg: '$duration' },
          },
        },
      ],
    },
    loadStage: { mode: 'upsert', keyFields: ['_id'] },
    schedule: '0 2 * * *',
  },
  {
    pipelineId: 'etl-behavior-trends',
    name: 'Behavior Trend Analysis',
    nameAr: 'تحليل اتجاهات السلوك',
    sourceDomain: 'behavior',
    sourceCollection: 'behaviorrecords',
    targetCollection: 'dw_behavior_trends',
    extractStage: { dateField: 'createdAt' },
    transformStage: {
      pipeline: [
        {
          $group: {
            _id: { type: '$behaviorType', month: { $month: '$createdAt' } },
            count: { $sum: 1 },
            avgSeverity: { $avg: '$severity' },
          },
        },
      ],
    },
    loadStage: { mode: 'upsert', keyFields: ['_id'] },
    schedule: '0 5 1 * *',
  },
];

/* ═══════════════════════════════════════════════════════════════
   Builtin Materialized Views (≥6)
   ═══════════════════════════════════════════════════════════════ */

const BUILTIN_VIEWS = [
  {
    viewId: 'mv-beneficiary-360',
    name: 'Beneficiary 360° View',
    nameAr: 'عرض المستفيد 360°',
    sourceCollection: 'beneficiaries',
    targetCollection: 'mv_beneficiary_360',
    dimensions: [
      { field: 'gender', label: 'Gender', type: 'string' },
      { field: 'disability.type', label: 'Disability', type: 'string' },
    ],
    measures: [{ field: '_id', label: 'Count', aggregation: 'count' }],
  },
  {
    viewId: 'mv-session-summary',
    name: 'Session Summary View',
    nameAr: 'ملخص الجلسات',
    sourceCollection: 'clinicalsessions',
    targetCollection: 'mv_session_summary',
    dimensions: [
      { field: 'domain', label: 'Domain', type: 'string' },
      { field: 'status', label: 'Status', type: 'string' },
    ],
    measures: [
      { field: 'duration', label: 'Avg Duration', aggregation: 'avg' },
      { field: '_id', label: 'Count', aggregation: 'count' },
    ],
  },
  {
    viewId: 'mv-outcome-tracker',
    name: 'Outcome Tracking View',
    nameAr: 'تتبع النتائج',
    sourceCollection: 'therapeuticgoals',
    targetCollection: 'mv_outcome_tracker',
    dimensions: [{ field: 'status', label: 'Status', type: 'string' }],
    measures: [{ field: '_id', label: 'Count', aggregation: 'count' }],
  },
  {
    viewId: 'mv-risk-matrix',
    name: 'Risk Matrix View',
    nameAr: 'مصفوفة المخاطر',
    sourceCollection: 'clinicalriskscores',
    targetCollection: 'mv_risk_matrix',
    dimensions: [
      { field: 'tier', label: 'Tier', type: 'string' },
      { field: 'domain', label: 'Domain', type: 'string' },
    ],
    measures: [{ field: 'score', label: 'Avg Score', aggregation: 'avg' }],
  },
  {
    viewId: 'mv-resource-util',
    name: 'Resource Utilization View',
    nameAr: 'استخدام الموارد',
    sourceCollection: 'workflowtasks',
    targetCollection: 'mv_resource_util',
    dimensions: [{ field: 'assignee', label: 'Assignee', type: 'objectId' }],
    measures: [{ field: '_id', label: 'Task Count', aggregation: 'count' }],
  },
  {
    viewId: 'mv-quality-trends',
    name: 'Quality Trends View',
    nameAr: 'اتجاهات الجودة',
    sourceCollection: 'qualityaudits',
    targetCollection: 'mv_quality_trends',
    dimensions: [{ field: 'auditType', label: 'Audit Type', type: 'string' }],
    measures: [
      { field: 'score', label: 'Avg Score', aggregation: 'avg' },
      { field: '_id', label: 'Count', aggregation: 'count' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   Builtin OLAP Cubes (≥5)
   ═══════════════════════════════════════════════════════════════ */

const BUILTIN_CUBES = [
  {
    cubeId: 'cube-clinical',
    name: 'Clinical Operations Cube',
    nameAr: 'مكعب العمليات السريرية',
    domain: 'sessions',
    factTable: 'clinicalsessions',
    dimensions: [
      {
        name: 'time',
        field: 'createdAt',
        hierarchy: [
          { level: 'year', field: 'year' },
          { level: 'quarter', field: 'quarter' },
          { level: 'month', field: 'month' },
          { level: 'day', field: 'day' },
        ],
      },
      { name: 'domain', field: 'domain', hierarchy: [] },
      { name: 'therapist', field: 'therapist', hierarchy: [] },
    ],
    measures: [
      { name: 'sessionCount', field: '_id', aggregation: 'count' },
      { name: 'avgDuration', field: 'duration', aggregation: 'avg' },
    ],
  },
  {
    cubeId: 'cube-outcomes',
    name: 'Outcomes Cube',
    nameAr: 'مكعب النتائج',
    domain: 'goals',
    factTable: 'therapeuticgoals',
    dimensions: [
      {
        name: 'time',
        field: 'createdAt',
        hierarchy: [
          { level: 'year', field: 'year' },
          { level: 'month', field: 'month' },
        ],
      },
      { name: 'status', field: 'status', hierarchy: [] },
    ],
    measures: [{ name: 'goalCount', field: '_id', aggregation: 'count' }],
  },
  {
    cubeId: 'cube-population',
    name: 'Population Health Cube',
    nameAr: 'مكعب صحة السكان',
    domain: 'core',
    factTable: 'beneficiaries',
    dimensions: [
      { name: 'demographics', field: 'gender', hierarchy: [] },
      { name: 'region', field: 'address.region', hierarchy: [] },
    ],
    measures: [{ name: 'patientCount', field: '_id', aggregation: 'count' }],
  },
  {
    cubeId: 'cube-quality',
    name: 'Quality Metrics Cube',
    nameAr: 'مكعب مقاييس الجودة',
    domain: 'quality',
    factTable: 'qualityaudits',
    dimensions: [
      {
        name: 'time',
        field: 'createdAt',
        hierarchy: [
          { level: 'year', field: 'year' },
          { level: 'month', field: 'month' },
        ],
      },
      { name: 'type', field: 'auditType', hierarchy: [] },
    ],
    measures: [
      { name: 'avgScore', field: 'score', aggregation: 'avg' },
      { name: 'auditCount', field: '_id', aggregation: 'count' },
    ],
  },
  {
    cubeId: 'cube-workflow',
    name: 'Workflow Analytics Cube',
    nameAr: 'مكعب تحليلات سير العمل',
    domain: 'workflow',
    factTable: 'workflowtasks',
    dimensions: [
      { name: 'status', field: 'status', hierarchy: [] },
      { name: 'priority', field: 'priority', hierarchy: [] },
    ],
    measures: [{ name: 'taskCount', field: '_id', aggregation: 'count' }],
  },
];

/* ═══════════════════════════════════════════════════════════════
   Core Functions
   ═══════════════════════════════════════════════════════════════ */

/**
 * Execute an ETL pipeline
 */
async function runETLPipeline(pipelineId) {
  const pipeline =
    BUILTIN_PIPELINES.find(p => p.pipelineId === pipelineId) ||
    (await DDDETLPipeline.findOne({ pipelineId }).lean());
  if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);

  const db = mongoose.connection;
  const startTime = Date.now();

  try {
    // Extract
    const extractPipeline = pipeline.transformStage?.pipeline || [];

    // Transform & Load
    const results = await db
      .collection(pipeline.sourceCollection)
      .aggregate(extractPipeline, { allowDiskUse: true })
      .toArray();

    // Load based on mode
    if (pipeline.loadStage?.mode === 'replace') {
      await db.collection(pipeline.targetCollection).deleteMany({});
    }

    let processed = 0;
    for (const doc of results) {
      if (pipeline.loadStage?.mode === 'upsert' && pipeline.loadStage?.keyFields?.length) {
        const key = {};
        for (const k of pipeline.loadStage.keyFields) key[k] = doc[k];
        await db
          .collection(pipeline.targetCollection)
          .updateOne(key, { $set: doc }, { upsert: true });
      } else {
        await db.collection(pipeline.targetCollection).insertOne(doc);
      }
      processed++;
    }

    const duration = Date.now() - startTime;

    // Update pipeline record
    await DDDETLPipeline.findOneAndUpdate(
      { pipelineId },
      {
        $set: {
          lastRun: new Date(),
          lastRunStatus: 'success',
          lastRunDuration: duration,
          recordsProcessed: processed,
        },
      },
      { upsert: true }
    );

    return { pipelineId, status: 'success', processed, duration };
  } catch (err) {
    await DDDETLPipeline.findOneAndUpdate(
      { pipelineId },
      { $set: { lastRun: new Date(), lastRunStatus: 'failed' } },
      { upsert: true }
    );
    throw err;
  }
}

/**
 * Refresh a materialized view
 */
async function refreshMaterializedView(viewId) {
  const view =
    BUILTIN_VIEWS.find(v => v.viewId === viewId) ||
    (await DDDMaterializedView.findOne({ viewId }).lean());
  if (!view) throw new Error(`View not found: ${viewId}`);

  const db = mongoose.connection;
  const pipeline = view.pipeline || [{ $group: { _id: null, count: { $sum: 1 } } }];

  const results = await db
    .collection(view.sourceCollection)
    .aggregate(pipeline, { allowDiskUse: true })
    .toArray();

  // Replace target collection
  await db.collection(view.targetCollection).deleteMany({});
  if (results.length) {
    await db.collection(view.targetCollection).insertMany(results);
  }

  await DDDMaterializedView.findOneAndUpdate(
    { viewId },
    { $set: { lastRefresh: new Date(), documentCount: results.length, status: 'active' } },
    { upsert: true }
  );

  return { viewId, refreshed: results.length, timestamp: new Date() };
}

/**
 * Query an OLAP cube
 */
async function queryCube(cubeId, query = {}) {
  const cube =
    BUILTIN_CUBES.find(c => c.cubeId === cubeId) || (await DDDOLAPCube.findOne({ cubeId }).lean());
  if (!cube) throw new Error(`Cube not found: ${cubeId}`);

  const db = mongoose.connection;
  const pipeline = [];

  // Apply filters
  if (query.filters && Object.keys(query.filters).length) {
    pipeline.push({ $match: query.filters });
  }

  // Group by dimensions
  const groupId = {};
  const groupFields = {};
  for (const dim of query.dimensions || cube.dimensions.map(d => d.name)) {
    const dimDef = cube.dimensions.find(d => d.name === dim);
    if (dimDef) groupId[dim] = `$${dimDef.field}`;
  }

  for (const measure of cube.measures) {
    const agg = `$${measure.aggregation}`;
    groupFields[measure.name] =
      measure.aggregation === 'count' ? { $sum: 1 } : { [agg]: `$${measure.field}` };
  }

  pipeline.push({ $group: { _id: groupId, ...groupFields } });
  pipeline.push({ $sort: { _id: 1 } });

  if (query.limit) pipeline.push({ $limit: query.limit });

  const data = await db
    .collection(cube.factTable)
    .aggregate(pipeline, { allowDiskUse: true })
    .toArray();
  return {
    cubeId,
    dimensions: Object.keys(groupId),
    measures: cube.measures.map(m => m.name),
    data,
  };
}

/**
 * Seed ETL pipelines
 */
async function seedPipelines() {
  let seeded = 0;
  for (const p of BUILTIN_PIPELINES) {
    const exists = await DDDETLPipeline.findOne({ pipelineId: p.pipelineId }).lean();
    if (!exists) {
      await DDDETLPipeline.create(p);
      seeded++;
    }
  }
  return { seeded, total: BUILTIN_PIPELINES.length };
}

/**
 * Get Data Warehouse dashboard
 */
async function getDataWarehouseDashboard() {
  const [pipelineCount, viewCount, cubeCount] = await Promise.all([
    DDDETLPipeline.countDocuments(),
    DDDMaterializedView.countDocuments(),
    DDDOLAPCube.countDocuments(),
  ]);

  return {
    service: 'DataWarehouse',
    pipelines: { total: pipelineCount, builtin: BUILTIN_PIPELINES.length },
    views: { total: viewCount, builtin: BUILTIN_VIEWS.length },
    cubes: { total: cubeCount, builtin: BUILTIN_CUBES.length },
  };
}

/* ═══════════════════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDETLPipeline,
  DDDMaterializedView,
  DDDOLAPCube,
};
