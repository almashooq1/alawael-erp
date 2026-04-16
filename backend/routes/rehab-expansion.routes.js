/**
 * Rehabilitation Expansion Routes — مسارات التوسعة في خدمات تأهيل ذوي الإعاقة
 *
 * 10 أنظمة جديدة مع أكثر من 120 نقطة وصول
 */

const express = require('express');
const router = express.Router();

const {
  assistiveDevices,
  vocationalRehab,
  disabilityRights,
  integrativeHealthcare,
  communityIntegration,
  caregiverSupport,
  accessibilityAudit,
  earlyDetection,
  outcomeMeasurement,
  adaptiveHousing,
  dashboard,
} = require('../controllers/rehab-expansion.controller');

const { authenticateToken: auth } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard — لوحة القيادة الشاملة
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard/overview', auth, requireBranchAccess, dashboard.getOverview);
router.get('/dashboard/alerts', auth, requireBranchAccess, dashboard.getAlerts);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. الأجهزة التعويضية والمساعدة — /assistive-devices
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/assistive-devices', auth, requireBranchAccess, assistiveDevices.getAll);
router.post('/assistive-devices', auth, requireBranchAccess, assistiveDevices.create);
router.get('/assistive-devices/statistics', auth, requireBranchAccess, assistiveDevices.getStatistics);
router.get('/assistive-devices/warranty-expiring', auth, requireBranchAccess, assistiveDevices.getWarrantyExpiring);
router.get('/assistive-devices/maintenance-due', auth, requireBranchAccess, assistiveDevices.getMaintenanceDue);
router.get(
  '/assistive-devices/beneficiary/:beneficiaryId',
  auth, requireBranchAccess, requireBranchAccess,
  assistiveDevices.getByBeneficiary
);
router.get('/assistive-devices/:id', auth, requireBranchAccess, assistiveDevices.getById);
router.put('/assistive-devices/:id', auth, requireBranchAccess, assistiveDevices.update);
router.delete('/assistive-devices/:id', auth, requireBranchAccess, assistiveDevices.delete);
router.post('/assistive-devices/:id/maintenance', auth, requireBranchAccess, assistiveDevices.addMaintenance);
router.post('/assistive-devices/:id/training', auth, requireBranchAccess, assistiveDevices.addTrainingSession);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. التأهيل المهني والتوظيف — /vocational-rehab
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/vocational-rehab', auth, requireBranchAccess, vocationalRehab.getAll);
router.post('/vocational-rehab', auth, requireBranchAccess, vocationalRehab.create);
router.get('/vocational-rehab/statistics', auth, requireBranchAccess, vocationalRehab.getStatistics);
router.get('/vocational-rehab/employed', auth, requireBranchAccess, vocationalRehab.getEmployedBeneficiaries);
router.get('/vocational-rehab/:id', auth, requireBranchAccess, vocationalRehab.getById);
router.put('/vocational-rehab/:id', auth, requireBranchAccess, vocationalRehab.update);
router.delete('/vocational-rehab/:id', auth, requireBranchAccess, vocationalRehab.delete);
router.post('/vocational-rehab/:id/skills-training', auth, requireBranchAccess, vocationalRehab.addSkillTraining);
router.post('/vocational-rehab/:id/job-application', auth, requireBranchAccess, vocationalRehab.addJobApplication);
router.put('/vocational-rehab/:id/employment', auth, requireBranchAccess, vocationalRehab.updateEmployment);
router.post(
  '/vocational-rehab/:id/accommodations',
  auth, requireBranchAccess, requireBranchAccess,
  vocationalRehab.addWorkplaceAccommodation
);
router.post('/vocational-rehab/:id/follow-ups', auth, requireBranchAccess, vocationalRehab.addFollowUp);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. حقوق ذوي الإعاقة — /disability-rights
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/disability-rights', auth, requireBranchAccess, disabilityRights.getAll);
router.post('/disability-rights', auth, requireBranchAccess, disabilityRights.create);
router.get('/disability-rights/statistics', auth, requireBranchAccess, disabilityRights.getStatistics);
router.get('/disability-rights/:id', auth, requireBranchAccess, disabilityRights.getById);
router.put('/disability-rights/:id', auth, requireBranchAccess, disabilityRights.update);
router.delete('/disability-rights/:id', auth, requireBranchAccess, disabilityRights.delete);
router.post('/disability-rights/:id/timeline', auth, requireBranchAccess, disabilityRights.addTimelineEntry);
router.post('/disability-rights/:id/evidence', auth, requireBranchAccess, disabilityRights.addEvidence);
router.put('/disability-rights/:id/resolve', auth, requireBranchAccess, disabilityRights.resolveCase);
router.put('/disability-rights/:id/escalate', auth, requireBranchAccess, disabilityRights.escalateCase);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. الرعاية الصحية التكاملية — /integrative-healthcare
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/integrative-healthcare', auth, requireBranchAccess, integrativeHealthcare.getAll);
router.post('/integrative-healthcare', auth, requireBranchAccess, integrativeHealthcare.create);
router.get('/integrative-healthcare/statistics', auth, requireBranchAccess, integrativeHealthcare.getStatistics);
router.get(
  '/integrative-healthcare/overdue-immunizations',
  auth, requireBranchAccess, requireBranchAccess,
  integrativeHealthcare.getOverdueImmunizations
);
router.get(
  '/integrative-healthcare/beneficiary/:beneficiaryId',
  auth, requireBranchAccess, requireBranchAccess,
  integrativeHealthcare.getByBeneficiary
);
router.get('/integrative-healthcare/:id', auth, requireBranchAccess, integrativeHealthcare.getById);
router.put('/integrative-healthcare/:id', auth, requireBranchAccess, integrativeHealthcare.update);
router.delete('/integrative-healthcare/:id', auth, requireBranchAccess, integrativeHealthcare.delete);
router.post('/integrative-healthcare/:id/dental', auth, requireBranchAccess, integrativeHealthcare.addDentalVisit);
router.put(
  '/integrative-healthcare/:id/nutrition',
  auth, requireBranchAccess, requireBranchAccess,
  integrativeHealthcare.updateNutritionPlan
);
router.post(
  '/integrative-healthcare/:id/immunizations',
  auth, requireBranchAccess, requireBranchAccess,
  integrativeHealthcare.addImmunization
);
router.post('/integrative-healthcare/:id/medications', auth, requireBranchAccess, integrativeHealthcare.addMedication);
router.post(
  '/integrative-healthcare/:id/specialist-visits',
  auth, requireBranchAccess, requireBranchAccess,
  integrativeHealthcare.addSpecialistVisit
);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. الدمج المجتمعي — /community-integration
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/community-integration', auth, requireBranchAccess, communityIntegration.getAll);
router.post('/community-integration', auth, requireBranchAccess, communityIntegration.create);
router.get('/community-integration/statistics', auth, requireBranchAccess, communityIntegration.getStatistics);
router.get('/community-integration/:id', auth, requireBranchAccess, communityIntegration.getById);
router.put('/community-integration/:id', auth, requireBranchAccess, communityIntegration.update);
router.delete('/community-integration/:id', auth, requireBranchAccess, communityIntegration.delete);
router.post('/community-integration/:id/life-skills', auth, requireBranchAccess, communityIntegration.addLifeSkill);
router.post('/community-integration/:id/activities', auth, requireBranchAccess, communityIntegration.addActivity);
router.put(
  '/community-integration/:id/social-network',
  auth, requireBranchAccess, requireBranchAccess,
  communityIntegration.updateSocialNetwork
);
router.post(
  '/community-integration/:id/travel-training',
  auth, requireBranchAccess, requireBranchAccess,
  communityIntegration.addTravelTraining
);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. دعم مقدمي الرعاية — /caregiver-support
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/caregiver-support', auth, requireBranchAccess, caregiverSupport.getAll);
router.post('/caregiver-support', auth, requireBranchAccess, caregiverSupport.create);
router.get('/caregiver-support/statistics', auth, requireBranchAccess, caregiverSupport.getStatistics);
router.get('/caregiver-support/high-burden', auth, requireBranchAccess, caregiverSupport.getHighBurden);
router.get('/caregiver-support/:id', auth, requireBranchAccess, caregiverSupport.getById);
router.put('/caregiver-support/:id', auth, requireBranchAccess, caregiverSupport.update);
router.delete('/caregiver-support/:id', auth, requireBranchAccess, caregiverSupport.delete);
router.post('/caregiver-support/:id/training', auth, requireBranchAccess, caregiverSupport.addTraining);
router.post('/caregiver-support/:id/respite', auth, requireBranchAccess, caregiverSupport.addRespiteCare);
router.post('/caregiver-support/:id/counseling', auth, requireBranchAccess, caregiverSupport.addCounseling);

// ═══════════════════════════════════════════════════════════════════════════════
// 7. تدقيق الوصول الشامل — /accessibility-audit
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/accessibility-audit', auth, requireBranchAccess, accessibilityAudit.getAll);
router.post('/accessibility-audit', auth, requireBranchAccess, accessibilityAudit.create);
router.get('/accessibility-audit/statistics', auth, requireBranchAccess, accessibilityAudit.getStatistics);
router.get('/accessibility-audit/non-compliant', auth, requireBranchAccess, accessibilityAudit.getNonCompliant);
router.get('/accessibility-audit/:id', auth, requireBranchAccess, accessibilityAudit.getById);
router.put('/accessibility-audit/:id', auth, requireBranchAccess, accessibilityAudit.update);
router.delete('/accessibility-audit/:id', auth, requireBranchAccess, accessibilityAudit.delete);
router.post('/accessibility-audit/:id/findings', auth, requireBranchAccess, accessibilityAudit.addFinding);
router.put(
  '/accessibility-audit/:id/findings/:findingId/status',
  auth, requireBranchAccess, requireBranchAccess,
  accessibilityAudit.updateFindingStatus
);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. الكشف والتدخل المبكر — /early-detection
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/early-detection', auth, requireBranchAccess, earlyDetection.getAll);
router.post('/early-detection', auth, requireBranchAccess, earlyDetection.create);
router.get('/early-detection/statistics', auth, requireBranchAccess, earlyDetection.getStatistics);
router.get('/early-detection/high-risk', auth, requireBranchAccess, earlyDetection.getHighRisk);
router.get('/early-detection/overdue-screenings', auth, requireBranchAccess, earlyDetection.getOverdueScreenings);
router.get('/early-detection/:id', auth, requireBranchAccess, earlyDetection.getById);
router.put('/early-detection/:id', auth, requireBranchAccess, earlyDetection.update);
router.delete('/early-detection/:id', auth, requireBranchAccess, earlyDetection.delete);
router.post('/early-detection/:id/screenings', auth, requireBranchAccess, earlyDetection.addScreening);
router.post('/early-detection/:id/milestones', auth, requireBranchAccess, earlyDetection.addMilestone);
router.post('/early-detection/:id/diagnosis', auth, requireBranchAccess, earlyDetection.addDiagnosis);
router.put('/early-detection/:id/intervention-plan', auth, requireBranchAccess, earlyDetection.updateInterventionPlan);

// ═══════════════════════════════════════════════════════════════════════════════
// 9. قياس النتائج والأثر — /outcome-measurement
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/outcome-measurement', auth, requireBranchAccess, outcomeMeasurement.getAll);
router.post('/outcome-measurement', auth, requireBranchAccess, outcomeMeasurement.create);
router.get('/outcome-measurement/statistics', auth, requireBranchAccess, outcomeMeasurement.getStatistics);
router.get('/outcome-measurement/benchmarks', auth, requireBranchAccess, outcomeMeasurement.getBenchmarkComparison);
router.get(
  '/outcome-measurement/beneficiary/:beneficiaryId',
  auth, requireBranchAccess, requireBranchAccess,
  outcomeMeasurement.getByBeneficiary
);
router.get(
  '/outcome-measurement/beneficiary/:beneficiaryId/trend',
  auth, requireBranchAccess, requireBranchAccess,
  outcomeMeasurement.getProgressTrend
);
router.get('/outcome-measurement/:id', auth, requireBranchAccess, outcomeMeasurement.getById);
router.put('/outcome-measurement/:id', auth, requireBranchAccess, outcomeMeasurement.update);
router.delete('/outcome-measurement/:id', auth, requireBranchAccess, outcomeMeasurement.delete);

// ═══════════════════════════════════════════════════════════════════════════════
// 10. الإسكان التكيفي — /adaptive-housing
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/adaptive-housing', auth, requireBranchAccess, adaptiveHousing.getAll);
router.post('/adaptive-housing', auth, requireBranchAccess, adaptiveHousing.create);
router.get('/adaptive-housing/statistics', auth, requireBranchAccess, adaptiveHousing.getStatistics);
router.get(
  '/adaptive-housing/pending-modifications',
  auth, requireBranchAccess, requireBranchAccess,
  adaptiveHousing.getPendingModifications
);
router.get('/adaptive-housing/funding-gaps', auth, requireBranchAccess, adaptiveHousing.getFundingGaps);
router.get('/adaptive-housing/:id', auth, requireBranchAccess, adaptiveHousing.getById);
router.put('/adaptive-housing/:id', auth, requireBranchAccess, adaptiveHousing.update);
router.delete('/adaptive-housing/:id', auth, requireBranchAccess, adaptiveHousing.delete);
router.post('/adaptive-housing/:id/modifications', auth, requireBranchAccess, adaptiveHousing.addModification);
router.put(
  '/adaptive-housing/:id/modifications/:modId',
  auth, requireBranchAccess, requireBranchAccess,
  adaptiveHousing.updateModificationStatus
);
router.put('/adaptive-housing/:id/smart-home', auth, requireBranchAccess, adaptiveHousing.updateSmartHome);
router.post('/adaptive-housing/:id/funding', auth, requireBranchAccess, adaptiveHousing.addFunding);

module.exports = router;
