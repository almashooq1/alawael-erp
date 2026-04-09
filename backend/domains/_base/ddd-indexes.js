/**
 * DDD Domain Performance Indexes — فهارس الأداء للدومينات العلاجية
 *
 * Ensures all 34 DDD models have optimal compound indexes for:
 *  - Beneficiary lookups (beneficiary + date range)
 *  - Episode-scoped queries (episode + status)
 *  - Therapist/assignee views (therapist + date)
 *  - Phase filtering (phase + status + date)
 *  - Dashboard aggregations (domain + period)
 *  - Soft-delete filtering (isDeleted)
 *
 * Usage:
 *   node domains/_base/ddd-indexes.js           # Create all indexes
 *   require('...').ensureDDDIndexes()            # Programmatic
 *
 * @module domains/_base/ddd-indexes
 */

'use strict';

const mongoose = require('mongoose');

/** Index definitions per model */
const DDD_INDEX_CATALOG = {
  // ── Core ──────────────────────────────────────────────────────────────
  Beneficiary: [
    { fields: { mrn: 1 }, options: { unique: true, sparse: true, name: 'ddd_mrn_unique' } },
    {
      fields: { nationalId: 1 },
      options: { unique: true, sparse: true, name: 'ddd_nationalId_unique' },
    },
    { fields: { status: 1, isDeleted: 1 }, options: { name: 'ddd_status_active' } },
    {
      fields: { disabilityType: 1, disabilityLevel: 1 },
      options: { name: 'ddd_disability_filter' },
    },
    {
      fields: { firstName: 'text', lastName: 'text', mrn: 'text' },
      options: { name: 'ddd_beneficiary_search', weights: { mrn: 10, firstName: 5, lastName: 5 } },
    },
    { fields: { createdAt: -1 }, options: { name: 'ddd_recent_beneficiaries' } },
  ],

  // ── Episodes ──────────────────────────────────────────────────────────
  EpisodeOfCare: [
    { fields: { beneficiary: 1, status: 1 }, options: { name: 'ddd_episode_beneficiary_status' } },
    { fields: { phase: 1, status: 1 }, options: { name: 'ddd_episode_phase_status' } },
    {
      fields: { beneficiary: 1, createdAt: -1 },
      options: { name: 'ddd_episode_beneficiary_date' },
    },
    { fields: { isDeleted: 1, phase: 1 }, options: { name: 'ddd_episode_active_phase' } },
  ],

  // ── Timeline ──────────────────────────────────────────────────────────
  CareTimeline: [
    {
      fields: { beneficiary: 1, createdAt: -1 },
      options: { name: 'ddd_timeline_beneficiary_date' },
    },
    { fields: { episode: 1, createdAt: -1 }, options: { name: 'ddd_timeline_episode_date' } },
    { fields: { eventType: 1, createdAt: -1 }, options: { name: 'ddd_timeline_type_date' } },
    { fields: { source: 1, importance: 1 }, options: { name: 'ddd_timeline_source' } },
  ],

  // ── Assessments ───────────────────────────────────────────────────────
  ClinicalAssessment: [
    { fields: { beneficiary: 1, status: 1 }, options: { name: 'ddd_assessment_beneficiary' } },
    { fields: { episode: 1, type: 1 }, options: { name: 'ddd_assessment_episode_type' } },
    { fields: { status: 1, dueDate: 1 }, options: { name: 'ddd_assessment_overdue' } },
    { fields: { assessor: 1, createdAt: -1 }, options: { name: 'ddd_assessment_assessor' } },
  ],

  // ── Care Plans ────────────────────────────────────────────────────────
  UnifiedCarePlan: [
    { fields: { beneficiary: 1, status: 1 }, options: { name: 'ddd_careplan_beneficiary' } },
    { fields: { episode: 1, status: 1 }, options: { name: 'ddd_careplan_episode' } },
    { fields: { status: 1, isDeleted: 1 }, options: { name: 'ddd_careplan_active' } },
  ],

  // ── Sessions ──────────────────────────────────────────────────────────
  ClinicalSession: [
    {
      fields: { beneficiary: 1, scheduledDate: -1 },
      options: { name: 'ddd_session_beneficiary_date' },
    },
    {
      fields: { therapist: 1, scheduledDate: -1 },
      options: { name: 'ddd_session_therapist_date' },
    },
    { fields: { episode: 1, status: 1 }, options: { name: 'ddd_session_episode' } },
    { fields: { status: 1, scheduledDate: 1 }, options: { name: 'ddd_session_status_date' } },
    { fields: { sessionType: 1, status: 1 }, options: { name: 'ddd_session_type' } },
  ],

  // ── Goals ─────────────────────────────────────────────────────────────
  TherapeuticGoal: [
    { fields: { beneficiary: 1, status: 1 }, options: { name: 'ddd_goal_beneficiary' } },
    { fields: { episode: 1, status: 1 }, options: { name: 'ddd_goal_episode' } },
    { fields: { targetDate: 1, status: 1 }, options: { name: 'ddd_goal_deadline' } },
  ],

  Measure: [
    { fields: { code: 1 }, options: { unique: true, sparse: true, name: 'ddd_measure_code' } },
    { fields: { category: 1, isDeleted: 1 }, options: { name: 'ddd_measure_category' } },
  ],

  MeasureApplication: [
    { fields: { beneficiary: 1, measure: 1 }, options: { name: 'ddd_measureapp_beneficiary' } },
    { fields: { beneficiary: 1, appliedAt: -1 }, options: { name: 'ddd_measureapp_date' } },
  ],

  // ── Workflow ──────────────────────────────────────────────────────────
  WorkflowTask: [
    {
      fields: { assignee: 1, status: 1, dueDate: 1 },
      options: { name: 'ddd_task_assignee_queue' },
    },
    { fields: { beneficiary: 1, status: 1 }, options: { name: 'ddd_task_beneficiary' } },
    { fields: { phase: 1, status: 1 }, options: { name: 'ddd_task_phase' } },
    { fields: { status: 1, dueDate: 1 }, options: { name: 'ddd_task_overdue' } },
    { fields: { taskType: 1, priority: 1 }, options: { name: 'ddd_task_type_priority' } },
  ],

  WorkflowTransitionLog: [
    { fields: { task: 1, createdAt: -1 }, options: { name: 'ddd_transition_task' } },
    { fields: { performedBy: 1, createdAt: -1 }, options: { name: 'ddd_transition_user' } },
  ],

  // ── Programs ──────────────────────────────────────────────────────────
  Program: [{ fields: { status: 1, isDeleted: 1 }, options: { name: 'ddd_program_active' } }],

  ProgramEnrollment: [
    { fields: { beneficiary: 1, program: 1 }, options: { name: 'ddd_enrollment_beneficiary' } },
    { fields: { program: 1, status: 1 }, options: { name: 'ddd_enrollment_program' } },
  ],

  // ── AI Recommendations ────────────────────────────────────────────────
  ClinicalRiskScore: [
    { fields: { beneficiary: 1, calculatedAt: -1 }, options: { name: 'ddd_risk_beneficiary' } },
    { fields: { overallRisk: -1 }, options: { name: 'ddd_risk_top' } },
  ],

  Recommendation: [
    { fields: { beneficiary: 1, status: 1 }, options: { name: 'ddd_rec_beneficiary' } },
    { fields: { ruleId: 1, status: 1 }, options: { name: 'ddd_rec_rule' } },
    { fields: { priority: 1, status: 1 }, options: { name: 'ddd_rec_priority' } },
  ],

  // ── Quality ───────────────────────────────────────────────────────────
  QualityAudit: [
    { fields: { auditType: 1, status: 1 }, options: { name: 'ddd_audit_type' } },
    { fields: { auditor: 1, createdAt: -1 }, options: { name: 'ddd_audit_auditor' } },
    { fields: { score: 1 }, options: { name: 'ddd_audit_score' } },
  ],

  CorrectiveAction: [
    { fields: { audit: 1, status: 1 }, options: { name: 'ddd_ca_audit' } },
    { fields: { assignee: 1, status: 1 }, options: { name: 'ddd_ca_assignee' } },
    { fields: { dueDate: 1, status: 1 }, options: { name: 'ddd_ca_due' } },
  ],

  // ── Family ────────────────────────────────────────────────────────────
  FamilyMember: [
    { fields: { beneficiary: 1, isDeleted: 1 }, options: { name: 'ddd_family_beneficiary' } },
    { fields: { userId: 1 }, options: { sparse: true, name: 'ddd_family_user' } },
  ],

  FamilyCommunication: [
    { fields: { beneficiary: 1, createdAt: -1 }, options: { name: 'ddd_fcomm_beneficiary' } },
    { fields: { familyMember: 1, createdAt: -1 }, options: { name: 'ddd_fcomm_member' } },
  ],

  // ── Reports ───────────────────────────────────────────────────────────
  ReportTemplate: [
    { fields: { code: 1 }, options: { unique: true, sparse: true, name: 'ddd_template_code' } },
    { fields: { category: 1, isDeleted: 1 }, options: { name: 'ddd_template_category' } },
  ],

  GeneratedReport: [
    { fields: { template: 1, createdAt: -1 }, options: { name: 'ddd_report_template' } },
    { fields: { requestedBy: 1, createdAt: -1 }, options: { name: 'ddd_report_user' } },
    { fields: { status: 1, createdAt: -1 }, options: { name: 'ddd_report_status' } },
  ],

  // ── Group Therapy ─────────────────────────────────────────────────────
  TherapyGroup: [
    { fields: { status: 1, isDeleted: 1 }, options: { name: 'ddd_group_active' } },
    { fields: { therapist: 1 }, options: { name: 'ddd_group_therapist' } },
  ],

  GroupSession: [
    { fields: { group: 1, scheduledDate: -1 }, options: { name: 'ddd_gsession_group' } },
    { fields: { status: 1, scheduledDate: 1 }, options: { name: 'ddd_gsession_status' } },
  ],

  // ── Tele-Rehab ────────────────────────────────────────────────────────
  TeleSession: [
    { fields: { beneficiary: 1, scheduledDate: -1 }, options: { name: 'ddd_tele_beneficiary' } },
    { fields: { therapist: 1, scheduledDate: -1 }, options: { name: 'ddd_tele_therapist' } },
    { fields: { status: 1, scheduledDate: 1 }, options: { name: 'ddd_tele_status' } },
  ],

  // ── AR/VR ─────────────────────────────────────────────────────────────
  ARVRSession: [
    { fields: { beneficiary: 1, createdAt: -1 }, options: { name: 'ddd_arvr_beneficiary' } },
    { fields: { status: 1 }, options: { name: 'ddd_arvr_status' } },
    { fields: { therapist: 1, createdAt: -1 }, options: { name: 'ddd_arvr_therapist' } },
  ],

  // ── Behavior ──────────────────────────────────────────────────────────
  BehaviorRecord: [
    { fields: { beneficiary: 1, recordedAt: -1 }, options: { name: 'ddd_behavior_beneficiary' } },
    { fields: { behaviorType: 1, severity: 1 }, options: { name: 'ddd_behavior_type' } },
  ],

  BehaviorPlan: [
    { fields: { beneficiary: 1, status: 1 }, options: { name: 'ddd_bplan_beneficiary' } },
  ],

  // ── Research ──────────────────────────────────────────────────────────
  ResearchStudy: [
    { fields: { status: 1, isDeleted: 1 }, options: { name: 'ddd_study_active' } },
    { fields: { principalInvestigator: 1 }, options: { name: 'ddd_study_pi' } },
  ],

  // ── Field Training ────────────────────────────────────────────────────
  TrainingProgram: [
    { fields: { status: 1, isDeleted: 1 }, options: { name: 'ddd_training_active' } },
  ],

  TraineeRecord: [
    { fields: { trainee: 1, program: 1 }, options: { name: 'ddd_trainee_program' } },
    { fields: { status: 1 }, options: { name: 'ddd_trainee_status' } },
  ],

  // ── Dashboards ────────────────────────────────────────────────────────
  DashboardConfig: [
    { fields: { owner: 1, isDeleted: 1 }, options: { name: 'ddd_dash_owner' } },
    { fields: { role: 1 }, options: { name: 'ddd_dash_role' } },
  ],

  KPIDefinition: [
    { fields: { kpiId: 1 }, options: { unique: true, name: 'ddd_kpi_id' } },
    { fields: { domain: 1 }, options: { name: 'ddd_kpi_domain' } },
  ],

  KPISnapshot: [
    { fields: { kpiId: 1, periodStart: -1 }, options: { name: 'ddd_kpis_kpi_date' } },
    { fields: { period: 1, periodStart: -1 }, options: { name: 'ddd_kpis_period' } },
  ],

  DecisionAlert: [
    { fields: { level: 1, acknowledged: 1 }, options: { name: 'ddd_alert_level' } },
    { fields: { rule: 1, createdAt: -1 }, options: { name: 'ddd_alert_rule' } },
    { fields: { domain: 1, createdAt: -1 }, options: { name: 'ddd_alert_domain' } },
  ],
};

/**
 * Create all DDD performance indexes
 * @returns {Promise<{created: number, skipped: number, errors: number}>}
 */
async function ensureDDDIndexes() {
  const results = { created: 0, skipped: 0, errors: 0, details: [] };

  for (const [modelName, indexes] of Object.entries(DDD_INDEX_CATALOG)) {
    const Model = mongoose.models[modelName];
    if (!Model) {
      results.skipped += indexes.length;
      results.details.push({ model: modelName, status: 'model-not-found' });
      continue;
    }

    for (const idx of indexes) {
      try {
        await Model.collection.createIndex(idx.fields, { background: true, ...idx.options });
        results.created++;
      } catch (err) {
        if (err.code === 85 || err.code === 86) {
          // Index already exists (possibly with different options)
          results.skipped++;
        } else {
          results.errors++;
          results.details.push({ model: modelName, index: idx.options.name, error: err.message });
        }
      }
    }
  }

  return results;
}

/**
 * Drop all DDD-prefixed indexes
 */
async function dropDDDIndexes() {
  let dropped = 0;
  for (const [modelName] of Object.entries(DDD_INDEX_CATALOG)) {
    const Model = mongoose.models[modelName];
    if (!Model) continue;
    try {
      const indexes = await Model.collection.indexes();
      for (const idx of indexes) {
        if (idx.name && idx.name.startsWith('ddd_')) {
          await Model.collection.dropIndex(idx.name);
          dropped++;
        }
      }
    } catch {
      /* collection may not exist */
    }
  }
  return dropped;
}

// Standalone execution
if (require.main === module) {
  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

  (async () => {
    await mongoose.connect(mongoUri);
    console.log('[DDD-Indexes] Connected to MongoDB');

    // Load all domain models
    require('../index');

    const results = await ensureDDDIndexes();
    console.log(
      `[DDD-Indexes] Created: ${results.created} | Skipped: ${results.skipped} | Errors: ${results.errors}`
    );
    if (results.details.length) {
      console.log('[DDD-Indexes] Details:', JSON.stringify(results.details, null, 2));
    }

    await mongoose.disconnect();
    process.exit(results.errors > 0 ? 1 : 0);
  })();
}

module.exports = {
  DDD_INDEX_CATALOG,
  ensureDDDIndexes,
  dropDDDIndexes,
};
