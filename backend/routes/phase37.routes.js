'use strict';
/**
 * Phase 37 Routes — Advanced Platform Enhancement
 * مسارات المرحلة 37 — التطوير المتقدم للمنصة
 *
 * 8 أنظمة × متوسط 10 نقاط وصول = 80+ endpoint
 */

const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const {
  accreditationStandards,
  accreditationSurveys,
  familyTraining,
  clinicalDecisionSupport,
  staffCompetency,
  communityOutreach,
  digitalTherapeutics,
  outcomeContracting,
  contentManagement,
} = require('../controllers/phase37.controller');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ACCREDITATION STANDARDS — معايير الاعتماد (CARF / CBAHI / JCI)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/accreditation/standards', auth, requireBranchAccess, accreditationStandards.getAll);
router.post('/accreditation/standards', auth, requireBranchAccess, accreditationStandards.create);
router.get(
  '/accreditation/standards/dashboard',
  auth, requireBranchAccess, requireBranchAccess,
  accreditationStandards.getComplianceDashboard
);
router.get('/accreditation/standards/body/:body', auth, requireBranchAccess, accreditationStandards.getByBody);
router.get('/accreditation/standards/:id', auth, requireBranchAccess, accreditationStandards.getById);
router.put('/accreditation/standards/:id', auth, requireBranchAccess, accreditationStandards.update);
router.delete('/accreditation/standards/:id', auth, requireBranchAccess, accreditationStandards.remove);
router.patch(
  '/accreditation/standards/:id/compliance',
  auth, requireBranchAccess, requireBranchAccess,
  accreditationStandards.updateCompliance
);
router.post('/accreditation/standards/:id/evidence', auth, requireBranchAccess, accreditationStandards.addEvidence);

// ─── Accreditation Surveys ────────────────────────────────────────────────
router.get('/accreditation/surveys', auth, requireBranchAccess, accreditationSurveys.getAll);
router.post('/accreditation/surveys', auth, requireBranchAccess, accreditationSurveys.create);
router.get('/accreditation/surveys/upcoming', auth, requireBranchAccess, accreditationSurveys.getUpcoming);
router.get('/accreditation/surveys/:id', auth, requireBranchAccess, accreditationSurveys.getById);
router.put('/accreditation/surveys/:id', auth, requireBranchAccess, accreditationSurveys.update);
router.delete('/accreditation/surveys/:id', auth, requireBranchAccess, accreditationSurveys.remove);
router.patch('/accreditation/surveys/:id/outcome', auth, requireBranchAccess, accreditationSurveys.recordOutcome);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. FAMILY TRAINING — تدريب وتثقيف الأسرة
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/family-training/programs', auth, requireBranchAccess, familyTraining.programs.getAll);
router.post('/family-training/programs', auth, requireBranchAccess, familyTraining.programs.create);
router.get('/family-training/programs/statistics', auth, requireBranchAccess, familyTraining.programs.getStatistics);
router.get(
  '/family-training/programs/category/:category',
  auth, requireBranchAccess, requireBranchAccess,
  familyTraining.programs.getByCategory
);
router.get('/family-training/programs/:id', auth, requireBranchAccess, familyTraining.programs.getById);
router.put('/family-training/programs/:id', auth, requireBranchAccess, familyTraining.programs.update);
router.delete('/family-training/programs/:id', auth, requireBranchAccess, familyTraining.programs.remove);

router.get('/family-training/enrollments', auth, requireBranchAccess, familyTraining.enrollments.getAll);
router.post('/family-training/enrollments', auth, requireBranchAccess, familyTraining.enrollments.create);
router.get(
  '/family-training/enrollments/beneficiary/:beneficiaryId',
  auth, requireBranchAccess, requireBranchAccess,
  familyTraining.enrollments.getByBeneficiary
);
router.get('/family-training/enrollments/:id', auth, requireBranchAccess, familyTraining.enrollments.getById);
router.put('/family-training/enrollments/:id', auth, requireBranchAccess, familyTraining.enrollments.update);
router.delete('/family-training/enrollments/:id', auth, requireBranchAccess, familyTraining.enrollments.remove);
router.patch(
  '/family-training/enrollments/:id/progress',
  auth, requireBranchAccess, requireBranchAccess,
  familyTraining.enrollments.updateProgress
);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CLINICAL DECISION SUPPORT — دعم القرار السريري الذكي
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/cdss/rules', auth, requireBranchAccess, clinicalDecisionSupport.rules.getAll);
router.post('/cdss/rules', auth, requireBranchAccess, clinicalDecisionSupport.rules.create);
router.get('/cdss/rules/active', auth, requireBranchAccess, clinicalDecisionSupport.rules.getActive);
router.get('/cdss/rules/:id', auth, requireBranchAccess, clinicalDecisionSupport.rules.getById);
router.put('/cdss/rules/:id', auth, requireBranchAccess, clinicalDecisionSupport.rules.update);
router.delete('/cdss/rules/:id', auth, requireBranchAccess, clinicalDecisionSupport.rules.remove);
router.patch('/cdss/rules/:id/toggle', auth, requireBranchAccess, clinicalDecisionSupport.rules.toggleStatus);

router.get('/cdss/alerts', auth, requireBranchAccess, clinicalDecisionSupport.alerts.getAll);
router.post('/cdss/alerts', auth, requireBranchAccess, clinicalDecisionSupport.alerts.create);
router.get('/cdss/alerts/active', auth, requireBranchAccess, clinicalDecisionSupport.alerts.getActiveAlerts);
router.get('/cdss/alerts/summary', auth, requireBranchAccess, clinicalDecisionSupport.alerts.getAlertSummary);
router.get('/cdss/alerts/:id', auth, requireBranchAccess, clinicalDecisionSupport.alerts.getById);
router.patch('/cdss/alerts/:id/acknowledge', auth, requireBranchAccess, clinicalDecisionSupport.alerts.acknowledge);
router.patch('/cdss/alerts/:id/resolve', auth, requireBranchAccess, clinicalDecisionSupport.alerts.resolve);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. STAFF COMPETENCY & CPD — كفاءة الموظفين والتطوير المهني
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/competency/frameworks', auth, requireBranchAccess, staffCompetency.frameworks.getAll);
router.post('/competency/frameworks', auth, requireBranchAccess, staffCompetency.frameworks.create);
router.get('/competency/frameworks/role/:role', auth, requireBranchAccess, staffCompetency.frameworks.getByRole);
router.get('/competency/frameworks/:id', auth, requireBranchAccess, staffCompetency.frameworks.getById);
router.put('/competency/frameworks/:id', auth, requireBranchAccess, staffCompetency.frameworks.update);
router.delete('/competency/frameworks/:id', auth, requireBranchAccess, staffCompetency.frameworks.remove);

router.get('/competency/assessments', auth, requireBranchAccess, staffCompetency.assessments.getAll);
router.post('/competency/assessments', auth, requireBranchAccess, staffCompetency.assessments.create);
router.get('/competency/assessments/overdue', auth, requireBranchAccess, staffCompetency.assessments.getOverdueSummary);
router.get(
  '/competency/assessments/employee/:employeeId',
  auth, requireBranchAccess, requireBranchAccess,
  staffCompetency.assessments.getByEmployee
);
router.get('/competency/assessments/:id', auth, requireBranchAccess, staffCompetency.assessments.getById);
router.put('/competency/assessments/:id', auth, requireBranchAccess, staffCompetency.assessments.update);
router.patch('/competency/assessments/:id/sign', auth, requireBranchAccess, staffCompetency.assessments.sign);

router.get('/competency/cpd', auth, requireBranchAccess, staffCompetency.cpd.getAll);
router.post('/competency/cpd', auth, requireBranchAccess, staffCompetency.cpd.create);
router.get('/competency/cpd/non-compliant', auth, requireBranchAccess, staffCompetency.cpd.getNonCompliant);
router.get('/competency/cpd/employee/:employeeId', auth, requireBranchAccess, staffCompetency.cpd.getByEmployee);
router.get('/competency/cpd/:id', auth, requireBranchAccess, staffCompetency.cpd.getById);
router.put('/competency/cpd/:id', auth, requireBranchAccess, staffCompetency.cpd.update);
router.post('/competency/cpd/:id/activity', auth, requireBranchAccess, staffCompetency.cpd.addActivity);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. COMMUNITY OUTREACH — برامج التواصل المجتمعي
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/outreach', auth, requireBranchAccess, communityOutreach.getAll);
router.post('/outreach', auth, requireBranchAccess, communityOutreach.create);
router.get('/outreach/upcoming', auth, requireBranchAccess, communityOutreach.getUpcoming);
router.get('/outreach/impact', auth, requireBranchAccess, communityOutreach.getImpactSummary);
router.get('/outreach/:id', auth, requireBranchAccess, communityOutreach.getById);
router.put('/outreach/:id', auth, requireBranchAccess, communityOutreach.update);
router.delete('/outreach/:id', auth, requireBranchAccess, communityOutreach.remove);
router.patch('/outreach/:id/outcome', auth, requireBranchAccess, communityOutreach.recordOutcome);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DIGITAL THERAPEUTICS — العلاجات الرقمية
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/digital-therapeutics', auth, requireBranchAccess, digitalTherapeutics.getAll);
router.post('/digital-therapeutics', auth, requireBranchAccess, digitalTherapeutics.create);
router.get('/digital-therapeutics/adherence-report', auth, requireBranchAccess, digitalTherapeutics.getAdherenceReport);
router.get(
  '/digital-therapeutics/beneficiary/:beneficiaryId',
  auth, requireBranchAccess, requireBranchAccess,
  digitalTherapeutics.getByBeneficiary
);
router.get('/digital-therapeutics/:id', auth, requireBranchAccess, digitalTherapeutics.getById);
router.put('/digital-therapeutics/:id', auth, requireBranchAccess, digitalTherapeutics.update);
router.delete('/digital-therapeutics/:id', auth, requireBranchAccess, digitalTherapeutics.remove);
router.post('/digital-therapeutics/:id/session', auth, requireBranchAccess, digitalTherapeutics.logSession);
router.post('/digital-therapeutics/:id/metric', auth, requireBranchAccess, digitalTherapeutics.addProgressMetric);

// ═══════════════════════════════════════════════════════════════════════════════
// 7. OUTCOME-BASED CONTRACTING — التعاقد القائم على النتائج
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/outcome-contracts', auth, requireBranchAccess, outcomeContracting.getAll);
router.post('/outcome-contracts', auth, requireBranchAccess, outcomeContracting.create);
router.get('/outcome-contracts/active', auth, requireBranchAccess, outcomeContracting.getActive);
router.get('/outcome-contracts/:id', auth, requireBranchAccess, outcomeContracting.getById);
router.put('/outcome-contracts/:id', auth, requireBranchAccess, outcomeContracting.update);
router.delete('/outcome-contracts/:id', auth, requireBranchAccess, outcomeContracting.remove);
router.post(
  '/outcome-contracts/:id/performance-report',
  auth, requireBranchAccess, requireBranchAccess,
  outcomeContracting.submitPerformanceReport
);
router.patch('/outcome-contracts/:id/metric', auth, requireBranchAccess, outcomeContracting.updateMetricValue);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. CONTENT MANAGEMENT — إدارة المحتوى متعدد اللغات
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/content', auth, requireBranchAccess, contentManagement.getAll);
router.post('/content', auth, requireBranchAccess, contentManagement.create);
router.get('/content/published', contentManagement.getPublished); // public — no auth
router.get('/content/search', contentManagement.search); // public — no auth
router.get('/content/:id', auth, requireBranchAccess, contentManagement.getById);
router.put('/content/:id', auth, requireBranchAccess, contentManagement.update);
router.delete('/content/:id', auth, requireBranchAccess, contentManagement.remove);
router.post('/content/:id/version', auth, requireBranchAccess, contentManagement.addVersion);
router.post('/content/:id/view', contentManagement.recordView); // public analytics

module.exports = router;
