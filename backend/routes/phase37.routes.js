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
router.get('/accreditation/standards', auth, accreditationStandards.getAll);
router.post('/accreditation/standards', auth, accreditationStandards.create);
router.get(
  '/accreditation/standards/dashboard',
  auth,
  accreditationStandards.getComplianceDashboard
);
router.get('/accreditation/standards/body/:body', auth, accreditationStandards.getByBody);
router.get('/accreditation/standards/:id', auth, accreditationStandards.getById);
router.put('/accreditation/standards/:id', auth, accreditationStandards.update);
router.delete('/accreditation/standards/:id', auth, accreditationStandards.remove);
router.patch(
  '/accreditation/standards/:id/compliance',
  auth,
  accreditationStandards.updateCompliance
);
router.post('/accreditation/standards/:id/evidence', auth, accreditationStandards.addEvidence);

// ─── Accreditation Surveys ────────────────────────────────────────────────
router.get('/accreditation/surveys', auth, accreditationSurveys.getAll);
router.post('/accreditation/surveys', auth, accreditationSurveys.create);
router.get('/accreditation/surveys/upcoming', auth, accreditationSurveys.getUpcoming);
router.get('/accreditation/surveys/:id', auth, accreditationSurveys.getById);
router.put('/accreditation/surveys/:id', auth, accreditationSurveys.update);
router.delete('/accreditation/surveys/:id', auth, accreditationSurveys.remove);
router.patch('/accreditation/surveys/:id/outcome', auth, accreditationSurveys.recordOutcome);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. FAMILY TRAINING — تدريب وتثقيف الأسرة
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/family-training/programs', auth, familyTraining.programs.getAll);
router.post('/family-training/programs', auth, familyTraining.programs.create);
router.get('/family-training/programs/statistics', auth, familyTraining.programs.getStatistics);
router.get(
  '/family-training/programs/category/:category',
  auth,
  familyTraining.programs.getByCategory
);
router.get('/family-training/programs/:id', auth, familyTraining.programs.getById);
router.put('/family-training/programs/:id', auth, familyTraining.programs.update);
router.delete('/family-training/programs/:id', auth, familyTraining.programs.remove);

router.get('/family-training/enrollments', auth, familyTraining.enrollments.getAll);
router.post('/family-training/enrollments', auth, familyTraining.enrollments.create);
router.get(
  '/family-training/enrollments/beneficiary/:beneficiaryId',
  auth,
  familyTraining.enrollments.getByBeneficiary
);
router.get('/family-training/enrollments/:id', auth, familyTraining.enrollments.getById);
router.put('/family-training/enrollments/:id', auth, familyTraining.enrollments.update);
router.delete('/family-training/enrollments/:id', auth, familyTraining.enrollments.remove);
router.patch(
  '/family-training/enrollments/:id/progress',
  auth,
  familyTraining.enrollments.updateProgress
);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CLINICAL DECISION SUPPORT — دعم القرار السريري الذكي
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/cdss/rules', auth, clinicalDecisionSupport.rules.getAll);
router.post('/cdss/rules', auth, clinicalDecisionSupport.rules.create);
router.get('/cdss/rules/active', auth, clinicalDecisionSupport.rules.getActive);
router.get('/cdss/rules/:id', auth, clinicalDecisionSupport.rules.getById);
router.put('/cdss/rules/:id', auth, clinicalDecisionSupport.rules.update);
router.delete('/cdss/rules/:id', auth, clinicalDecisionSupport.rules.remove);
router.patch('/cdss/rules/:id/toggle', auth, clinicalDecisionSupport.rules.toggleStatus);

router.get('/cdss/alerts', auth, clinicalDecisionSupport.alerts.getAll);
router.post('/cdss/alerts', auth, clinicalDecisionSupport.alerts.create);
router.get('/cdss/alerts/active', auth, clinicalDecisionSupport.alerts.getActiveAlerts);
router.get('/cdss/alerts/summary', auth, clinicalDecisionSupport.alerts.getAlertSummary);
router.get('/cdss/alerts/:id', auth, clinicalDecisionSupport.alerts.getById);
router.patch('/cdss/alerts/:id/acknowledge', auth, clinicalDecisionSupport.alerts.acknowledge);
router.patch('/cdss/alerts/:id/resolve', auth, clinicalDecisionSupport.alerts.resolve);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. STAFF COMPETENCY & CPD — كفاءة الموظفين والتطوير المهني
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/competency/frameworks', auth, staffCompetency.frameworks.getAll);
router.post('/competency/frameworks', auth, staffCompetency.frameworks.create);
router.get('/competency/frameworks/role/:role', auth, staffCompetency.frameworks.getByRole);
router.get('/competency/frameworks/:id', auth, staffCompetency.frameworks.getById);
router.put('/competency/frameworks/:id', auth, staffCompetency.frameworks.update);
router.delete('/competency/frameworks/:id', auth, staffCompetency.frameworks.remove);

router.get('/competency/assessments', auth, staffCompetency.assessments.getAll);
router.post('/competency/assessments', auth, staffCompetency.assessments.create);
router.get('/competency/assessments/overdue', auth, staffCompetency.assessments.getOverdueSummary);
router.get(
  '/competency/assessments/employee/:employeeId',
  auth,
  staffCompetency.assessments.getByEmployee
);
router.get('/competency/assessments/:id', auth, staffCompetency.assessments.getById);
router.put('/competency/assessments/:id', auth, staffCompetency.assessments.update);
router.patch('/competency/assessments/:id/sign', auth, staffCompetency.assessments.sign);

router.get('/competency/cpd', auth, staffCompetency.cpd.getAll);
router.post('/competency/cpd', auth, staffCompetency.cpd.create);
router.get('/competency/cpd/non-compliant', auth, staffCompetency.cpd.getNonCompliant);
router.get('/competency/cpd/employee/:employeeId', auth, staffCompetency.cpd.getByEmployee);
router.get('/competency/cpd/:id', auth, staffCompetency.cpd.getById);
router.put('/competency/cpd/:id', auth, staffCompetency.cpd.update);
router.post('/competency/cpd/:id/activity', auth, staffCompetency.cpd.addActivity);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. COMMUNITY OUTREACH — برامج التواصل المجتمعي
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/outreach', auth, communityOutreach.getAll);
router.post('/outreach', auth, communityOutreach.create);
router.get('/outreach/upcoming', auth, communityOutreach.getUpcoming);
router.get('/outreach/impact', auth, communityOutreach.getImpactSummary);
router.get('/outreach/:id', auth, communityOutreach.getById);
router.put('/outreach/:id', auth, communityOutreach.update);
router.delete('/outreach/:id', auth, communityOutreach.remove);
router.patch('/outreach/:id/outcome', auth, communityOutreach.recordOutcome);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DIGITAL THERAPEUTICS — العلاجات الرقمية
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/digital-therapeutics', auth, digitalTherapeutics.getAll);
router.post('/digital-therapeutics', auth, digitalTherapeutics.create);
router.get('/digital-therapeutics/adherence-report', auth, digitalTherapeutics.getAdherenceReport);
router.get(
  '/digital-therapeutics/beneficiary/:beneficiaryId',
  auth,
  digitalTherapeutics.getByBeneficiary
);
router.get('/digital-therapeutics/:id', auth, digitalTherapeutics.getById);
router.put('/digital-therapeutics/:id', auth, digitalTherapeutics.update);
router.delete('/digital-therapeutics/:id', auth, digitalTherapeutics.remove);
router.post('/digital-therapeutics/:id/session', auth, digitalTherapeutics.logSession);
router.post('/digital-therapeutics/:id/metric', auth, digitalTherapeutics.addProgressMetric);

// ═══════════════════════════════════════════════════════════════════════════════
// 7. OUTCOME-BASED CONTRACTING — التعاقد القائم على النتائج
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/outcome-contracts', auth, outcomeContracting.getAll);
router.post('/outcome-contracts', auth, outcomeContracting.create);
router.get('/outcome-contracts/active', auth, outcomeContracting.getActive);
router.get('/outcome-contracts/:id', auth, outcomeContracting.getById);
router.put('/outcome-contracts/:id', auth, outcomeContracting.update);
router.delete('/outcome-contracts/:id', auth, outcomeContracting.remove);
router.post(
  '/outcome-contracts/:id/performance-report',
  auth,
  outcomeContracting.submitPerformanceReport
);
router.patch('/outcome-contracts/:id/metric', auth, outcomeContracting.updateMetricValue);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. CONTENT MANAGEMENT — إدارة المحتوى متعدد اللغات
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/content', auth, contentManagement.getAll);
router.post('/content', auth, contentManagement.create);
router.get('/content/published', contentManagement.getPublished); // public — no auth
router.get('/content/search', contentManagement.search); // public — no auth
router.get('/content/:id', auth, contentManagement.getById);
router.put('/content/:id', auth, contentManagement.update);
router.delete('/content/:id', auth, contentManagement.remove);
router.post('/content/:id/version', auth, contentManagement.addVersion);
router.post('/content/:id/view', contentManagement.recordView); // public analytics

module.exports = router;
