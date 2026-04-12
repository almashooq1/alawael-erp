'use strict';
/**
 * DddDataQualityMonitor Model
 * Auto-extracted from services/dddDataQualityMonitor.js
 */
const mongoose = require('mongoose');

const dqReportSchema = new mongoose.Schema(
  {
    /* Scope */
    scope: {
      type: String,
      enum: ['model', 'domain', 'beneficiary', 'global'],
      required: true,
      index: true,
    },
    modelName: String,
    domain: String,
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /* Overall quality */
    qualityScore: { type: Number, min: 0, max: 100, required: true },
    grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },

    /* Dimension scores */
    dimensions: {
      completeness: { type: Number, min: 0, max: 100, default: 100 },
      accuracy: { type: Number, min: 0, max: 100, default: 100 },
      consistency: { type: Number, min: 0, max: 100, default: 100 },
      timeliness: { type: Number, min: 0, max: 100, default: 100 },
      uniqueness: { type: Number, min: 0, max: 100, default: 100 },
    },

    /* Issues found */
    issues: [
      {
        issueType: {
          type: String,
          enum: [
            'missing_required',
            'orphan_reference',
            'duplicate_record',
            'stale_data',
            'invalid_enum',
            'referential_integrity',
            'data_conflict',
            'outlier_value',
            'schema_violation',
            'missing_relationship',
            'incomplete_workflow',
          ],
        },
        severity: { type: String, enum: ['info', 'low', 'medium', 'high', 'critical'] },
        model: String,
        field: String,
        description: String,
        affectedCount: Number,
        sampleIds: [{ type: mongoose.Schema.Types.ObjectId }],
        suggestedFix: String,
      },
    ],

    /* Statistics */
    stats: {
      totalRecords: Number,
      completeRecords: Number,
      incompleteRecords: Number,
      orphanRecords: Number,
      duplicateRecords: Number,
      staleRecords: Number,
    },

    evaluatedAt: { type: Date, default: Date.now },
    processingTimeMs: Number,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dqReportSchema.index({ scope: 1, modelName: 1, evaluatedAt: -1 });

const DDDDataQualityReport =
  mongoose.models.DDDDataQualityReport || mongoose.model('DDDDataQualityReport', dqReportSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Model Quality Definitions — required fields + relationships
   ═══════════════════════════════════════════════════════════════════════ */
const MODEL_QUALITY_DEFS = {
  Beneficiary: {
    domain: 'core',
    requiredFields: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'nationalId', 'mrn'],
    importantFields: ['contactInfo.phone', 'disability.type', 'branchId'],
    references: [],
    stalenessThresholdDays: null, // master data, no staleness
  },
  EpisodeOfCare: {
    domain: 'episodes',
    requiredFields: ['beneficiaryId', 'type', 'status', 'startDate'],
    importantFields: ['currentPhase', 'careTeam', 'branchId'],
    references: [{ field: 'beneficiaryId', model: 'Beneficiary' }],
    stalenessThresholdDays: 90,
  },
  ClinicalAssessment: {
    domain: 'assessments',
    requiredFields: ['beneficiaryId', 'assessmentDate', 'assessorId'],
    importantFields: ['type', 'percentageScore', 'domainScores'],
    references: [
      { field: 'beneficiaryId', model: 'Beneficiary' },
      { field: 'episodeId', model: 'EpisodeOfCare' },
    ],
    stalenessThresholdDays: 90,
  },
  ClinicalSession: {
    domain: 'sessions',
    requiredFields: ['beneficiaryId', 'therapistId', 'scheduledDate', 'type'],
    importantFields: ['status', 'soapNotes'],
    references: [
      { field: 'beneficiaryId', model: 'Beneficiary' },
      { field: 'episodeId', model: 'EpisodeOfCare' },
    ],
    stalenessThresholdDays: 14,
  },
  UnifiedCarePlan: {
    domain: 'care-plans',
    requiredFields: ['beneficiaryId', 'status'],
    importantFields: ['goals', 'interventions'],
    references: [
      { field: 'beneficiaryId', model: 'Beneficiary' },
      { field: 'episodeId', model: 'EpisodeOfCare' },
    ],
    stalenessThresholdDays: 60,
  },
  TherapeuticGoal: {
    domain: 'goals',
    requiredFields: ['beneficiaryId', 'title', 'status'],
    importantFields: ['currentProgress', 'target'],
    references: [{ field: 'beneficiaryId', model: 'Beneficiary' }],
    stalenessThresholdDays: 21,
  },
  BehaviorRecord: {
    domain: 'behavior',
    requiredFields: ['beneficiaryId', 'incidentDate'],
    importantFields: ['severity', 'type', 'description'],
    references: [{ field: 'beneficiaryId', model: 'Beneficiary' }],
    stalenessThresholdDays: null,
  },
  FamilyCommunication: {
    domain: 'family',
    requiredFields: ['beneficiaryId', 'communicationType'],
    importantFields: ['communicationDate', 'outcome'],
    references: [{ field: 'beneficiaryId', model: 'Beneficiary' }],
    stalenessThresholdDays: 30,
  },
  TeleSession: {
    domain: 'tele-rehab',
    requiredFields: ['beneficiaryId', 'scheduledDate', 'platform'],
    importantFields: ['status', 'duration'],
    references: [{ field: 'beneficiaryId', model: 'Beneficiary' }],
    stalenessThresholdDays: 14,
  },
  QualityAudit: {
    domain: 'quality',
    requiredFields: ['scope', 'auditType', 'overallScore'],
    importantFields: ['findings', 'complianceLevel'],
    references: [],
    stalenessThresholdDays: null,
  },
  WorkflowTask: {
    domain: 'workflow',
    requiredFields: ['beneficiaryId', 'taskType', 'status'],
    importantFields: ['priority', 'assignedTo', 'dueDate'],
    references: [{ field: 'beneficiaryId', model: 'Beneficiary' }],
    stalenessThresholdDays: 7,
  },
  TherapyGroup: {
    domain: 'group-therapy',
    requiredFields: ['name', 'therapistId'],
    importantFields: ['members', 'status', 'capacity'],
    references: [],
    stalenessThresholdDays: null,
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   3. Completeness Check
   ═══════════════════════════════════════════════════════════════════════ */
async function checkCompleteness(modelName, def) {
  const Model = mongoose.model(modelName);
  if (!Model) return { score: 100, issues: [], total: 0 };

  const total = await Model.countDocuments({ isDeleted: { $ne: true } });
  if (total === 0) return { score: 100, issues: [], total: 0 };

  const issues = [];
  let incompleteCount = 0;

  for (const field of def.requiredFields) {
    const missingQuery = { isDeleted: { $ne: true } };
    if (field.includes('.')) {
      missingQuery[field] = { $exists: false };
    } else {
      missingQuery[field] = { $in: [null, '', undefined] };
    }

    try {
      const missing = await Model.countDocuments(missingQuery);
      if (missing > 0) {
        const samples = await Model.find(missingQuery).select('_id').limit(5).lean();
        issues.push({
          issueType: 'missing_required',
          severity: 'high',
          model: modelName,
          field,
          description: `${missing} records missing required field: ${field}`,
          affectedCount: missing,
          sampleIds: samples.map(s => s._id),
          suggestedFix: `Populate ${field} for ${missing} ${modelName} records`,
        });
        incompleteCount = Math.max(incompleteCount, missing);
      }
    } catch {
      /* field query failure */
    }
  }

  const score = total > 0 ? Math.round(((total - incompleteCount) / total) * 100) : 100;
  return { score, issues, total, incomplete: incompleteCount };
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Referential Integrity Check
   ═══════════════════════════════════════════════════════════════════════ */
async function checkReferentialIntegrity(modelName, def) {
  const Model = mongoose.model(modelName);
  if (!Model || !def.references?.length) return { score: 100, issues: [] };

  const issues = [];
  let totalOrphans = 0;

  for (const ref of def.references) {
    const RefModel = mongoose.model(ref.model);
    if (!RefModel) continue;

    try {
      /* Find records with a reference that doesn't exist in target collection */
      const pipeline = [
        { $match: { isDeleted: { $ne: true }, [ref.field]: { $ne: null, $exists: true } } },
        {
          $lookup: {
            from: RefModel.collection.name,
            localField: ref.field,
            foreignField: '_id',
            as: '_refCheck',
          },
        },
        { $match: { _refCheck: { $size: 0 } } },
        { $limit: 100 },
        { $project: { _id: 1 } },
      ];

      const orphans = await Model.aggregate(pipeline);
      if (orphans.length > 0) {
        issues.push({
          issueType: 'orphan_reference',
          severity: 'medium',
          model: modelName,
          field: ref.field,
          description: `${orphans.length} ${modelName} records reference non-existent ${ref.model}`,
          affectedCount: orphans.length,
          sampleIds: orphans.slice(0, 5).map(o => o._id),
          suggestedFix: `Fix or remove orphan ${ref.field} references in ${modelName}`,
        });
        totalOrphans += orphans.length;
      }
    } catch {
      /* aggregation failure */
    }
  }

  const total = await Model.countDocuments({ isDeleted: { $ne: true } }).catch(() => 0);
  const score = total > 0 ? Math.round(((total - totalOrphans) / total) * 100) : 100;
  return { score, issues };
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Freshness/Staleness Check
   ═══════════════════════════════════════════════════════════════════════ */
async function checkFreshness(modelName, def) {
  if (!def.stalenessThresholdDays) return { score: 100, issues: [] };

  const Model = mongoose.model(modelName);
  if (!Model) return { score: 100, issues: [] };

  const threshold = new Date(Date.now() - def.stalenessThresholdDays * 86400000);
  const dateField =
    modelName === 'ClinicalSession'
      ? 'scheduledDate'
      : modelName === 'ClinicalAssessment'
        ? 'assessmentDate'
        : 'updatedAt';

  try {
    const total = await Model.countDocuments({ isDeleted: { $ne: true } });
    if (total === 0) return { score: 100, issues: [] };

    const stale = await Model.countDocuments({
      isDeleted: { $ne: true },
      [dateField]: { $lt: threshold },
    });

    const issues = [];
    if (stale > total * 0.2) {
      issues.push({
        issueType: 'stale_data',
        severity: stale > total * 0.5 ? 'high' : 'medium',
        model: modelName,
        field: dateField,
        description: `${stale}/${total} ${modelName} records are stale (>${def.stalenessThresholdDays} days)`,
        affectedCount: stale,
        suggestedFix: `Review and update stale ${modelName} records`,
      });
    }

    const score = total > 0 ? Math.round(((total - stale) / total) * 100) : 100;
    return { score, issues };
  } catch {
    return { score: 100, issues: [] };
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Duplicate Detection
   ═══════════════════════════════════════════════════════════════════════ */
async function checkDuplicates(modelName) {
  const Model = mongoose.model(modelName);
  if (!Model) return { score: 100, issues: [] };

  /* Only check for duplicates in models with natural keys */
  const dupFields = {
    Beneficiary: ['nationalId'],
    EpisodeOfCare: ['beneficiaryId', 'type', 'startDate'],
  };

  const fields = dupFields[modelName];
  if (!fields) return { score: 100, issues: [] };

  try {
    const groupFields = {};
    for (const f of fields) groupFields[f] = `$${f}`;

    const dups = await Model.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: groupFields, count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 20 },
    ]);

    const issues = [];
    const totalDup = dups.reduce((s, d) => s + d.count - 1, 0);
    if (dups.length > 0) {
      issues.push({
        issueType: 'duplicate_record',
        severity: 'high',
        model: modelName,
        field: fields.join('+'),
        description: `${dups.length} duplicate groups found (${totalDup} extra records) on ${fields.join('+')}`,
        affectedCount: totalDup,
        sampleIds: dups.slice(0, 3).flatMap(d => d.ids.slice(0, 2)),
        suggestedFix: `Merge or remove duplicate ${modelName} records`,
      });
    }

    const total = await Model.countDocuments({ isDeleted: { $ne: true } });
    const score = total > 0 ? Math.round(((total - totalDup) / total) * 100) : 100;
    return { score, issues };
  } catch {
    return { score: 100, issues: [] };
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Model-level Quality Assessment
   ═══════════════════════════════════════════════════════════════════════ */
async function assessModelQuality(modelName) {
  const start = Date.now();
  const def = MODEL_QUALITY_DEFS[modelName];
  if (!def) throw new Error(`No quality definition for model: ${modelName}`);

  const [completeness, integrity, freshness, uniqueness] = await Promise.all([
    checkCompleteness(modelName, def),
    checkReferentialIntegrity(modelName, def),
    checkFreshness(modelName, def),
    checkDuplicates(modelName),
  ]);

  const allIssues = [
    ...completeness.issues,
    ...integrity.issues,
    ...freshness.issues,
    ...uniqueness.issues,
  ];

  const dimensions = {
    completeness: completeness.score,
    accuracy: 100, // would need domain-specific rules
    consistency: integrity.score,
    timeliness: freshness.score,
    uniqueness: uniqueness.score,
  };

  const qualityScore = Math.round(
    dimensions.completeness * 0.3 +
      dimensions.consistency * 0.25 +
      dimensions.timeliness * 0.2 +
      dimensions.uniqueness * 0.15 +
      dimensions.accuracy * 0.1
  );

  const grade =
    qualityScore >= 90
      ? 'A'
      : qualityScore >= 80
        ? 'B'
        : qualityScore >= 70
          ? 'C'
          : qualityScore >= 60
            ? 'D'
            : 'F';

  const report = await DDDDataQualityReport.create({
    scope: 'model',
    modelName,
    domain: def.domain,
    qualityScore,
    grade,
    dimensions,
    issues: allIssues,
    stats: {
      totalRecords: completeness.total,
      completeRecords: completeness.total - (completeness.incomplete || 0),
      incompleteRecords: completeness.incomplete || 0,
      orphanRecords: integrity.issues.reduce((s, i) => s + (i.affectedCount || 0), 0),
      duplicateRecords: uniqueness.issues.reduce((s, i) => s + (i.affectedCount || 0), 0),
      staleRecords: freshness.issues.reduce((s, i) => s + (i.affectedCount || 0), 0),
    },
    processingTimeMs: Date.now() - start,
  });

  return report.toObject();
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Global Quality Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function assessGlobalQuality() {
  const start = Date.now();
  const results = {};
  let totalScore = 0;
  let count = 0;
  const allIssues = [];

  for (const modelName of Object.keys(MODEL_QUALITY_DEFS)) {
    try {
      const report = await assessModelQuality(modelName);
      results[modelName] = {
        score: report.qualityScore,
        grade: report.grade,
        dimensions: report.dimensions,
        issueCount: report.issues.length,
        recordCount: report.stats.totalRecords,
      };
      totalScore += report.qualityScore;
      count++;
      allIssues.push(...report.issues);
    } catch {
      /* skip failed models */
    }
  }

  const globalScore = count > 0 ? Math.round(totalScore / count) : 0;

  const globalReport = await DDDDataQualityReport.create({
    scope: 'global',
    qualityScore: globalScore,
    grade:
      globalScore >= 90
        ? 'A'
        : globalScore >= 80
          ? 'B'
          : globalScore >= 70
            ? 'C'
            : globalScore >= 60
              ? 'D'
              : 'F',
    dimensions: {
      completeness:
        count > 0
          ? Math.round(
              Object.values(results).reduce((s, r) => s + (r.dimensions?.completeness || 100), 0) /
                count
            )
          : 100,
      accuracy: 100,
      consistency:
        count > 0
          ? Math.round(
              Object.values(results).reduce((s, r) => s + (r.dimensions?.consistency || 100), 0) /
                count
            )
          : 100,
      timeliness:
        count > 0
          ? Math.round(
              Object.values(results).reduce((s, r) => s + (r.dimensions?.timeliness || 100), 0) /
                count
            )
          : 100,
      uniqueness:
        count > 0
          ? Math.round(
              Object.values(results).reduce((s, r) => s + (r.dimensions?.uniqueness || 100), 0) /
                count
            )
          : 100,
    },
    issues: allIssues.filter(i => i.severity === 'high' || i.severity === 'critical').slice(0, 50),
    stats: {
      totalRecords: Object.values(results).reduce((s, r) => s + (r.recordCount || 0), 0),
    },
    processingTimeMs: Date.now() - start,
  });

  return { global: globalReport.toObject(), models: results };
}

/* ═══════════════════════════════════════════════════════════════════════
   9. Quality Trend
   ═══════════════════════════════════════════════════════════════════════ */
async function getQualityTrend(modelName, days = 30) {
  const match = {
    isDeleted: { $ne: true },
    scope: modelName ? 'model' : 'global',
    evaluatedAt: { $gte: new Date(Date.now() - days * 86400000) },
  };
  if (modelName) match.modelName = modelName;

  return DDDDataQualityReport.find(match)
    .sort({ evaluatedAt: -1 })
    .select('qualityScore grade dimensions evaluatedAt modelName')
    .limit(50)
    .lean();
}

/* ═══════════════════════════════════════════════════════════════════════
   10. Express Router
   ═══════════════════════════════════════════════════════════════════════ */

module.exports = {
  DDDDataQualityReport,
};
