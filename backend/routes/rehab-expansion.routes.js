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

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard — لوحة القيادة الشاملة
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard/overview', auth, dashboard.getOverview);
router.get('/dashboard/alerts', auth, dashboard.getAlerts);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. الأجهزة التعويضية والمساعدة — /assistive-devices
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/assistive-devices', auth, assistiveDevices.getAll);
router.post('/assistive-devices', auth, assistiveDevices.create);
router.get('/assistive-devices/statistics', auth, assistiveDevices.getStatistics);
router.get('/assistive-devices/warranty-expiring', auth, assistiveDevices.getWarrantyExpiring);
router.get('/assistive-devices/maintenance-due', auth, assistiveDevices.getMaintenanceDue);
router.get(
  '/assistive-devices/beneficiary/:beneficiaryId',
  auth,
  assistiveDevices.getByBeneficiary
);
router.get('/assistive-devices/:id', auth, assistiveDevices.getById);
router.put('/assistive-devices/:id', auth, assistiveDevices.update);
router.delete('/assistive-devices/:id', auth, assistiveDevices.delete);
router.post('/assistive-devices/:id/maintenance', auth, assistiveDevices.addMaintenance);
router.post('/assistive-devices/:id/training', auth, assistiveDevices.addTrainingSession);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. التأهيل المهني والتوظيف — /vocational-rehab
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/vocational-rehab', auth, vocationalRehab.getAll);
router.post('/vocational-rehab', auth, vocationalRehab.create);
router.get('/vocational-rehab/statistics', auth, vocationalRehab.getStatistics);
router.get('/vocational-rehab/employed', auth, vocationalRehab.getEmployedBeneficiaries);
router.get('/vocational-rehab/:id', auth, vocationalRehab.getById);
router.put('/vocational-rehab/:id', auth, vocationalRehab.update);
router.delete('/vocational-rehab/:id', auth, vocationalRehab.delete);
router.post('/vocational-rehab/:id/skills-training', auth, vocationalRehab.addSkillTraining);
router.post('/vocational-rehab/:id/job-application', auth, vocationalRehab.addJobApplication);
router.put('/vocational-rehab/:id/employment', auth, vocationalRehab.updateEmployment);
router.post(
  '/vocational-rehab/:id/accommodations',
  auth,
  vocationalRehab.addWorkplaceAccommodation
);
router.post('/vocational-rehab/:id/follow-ups', auth, vocationalRehab.addFollowUp);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. حقوق ذوي الإعاقة — /disability-rights
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/disability-rights', auth, disabilityRights.getAll);
router.post('/disability-rights', auth, disabilityRights.create);
router.get('/disability-rights/statistics', auth, disabilityRights.getStatistics);
router.get('/disability-rights/:id', auth, disabilityRights.getById);
router.put('/disability-rights/:id', auth, disabilityRights.update);
router.delete('/disability-rights/:id', auth, disabilityRights.delete);
router.post('/disability-rights/:id/timeline', auth, disabilityRights.addTimelineEntry);
router.post('/disability-rights/:id/evidence', auth, disabilityRights.addEvidence);
router.put('/disability-rights/:id/resolve', auth, disabilityRights.resolveCase);
router.put('/disability-rights/:id/escalate', auth, disabilityRights.escalateCase);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. الرعاية الصحية التكاملية — /integrative-healthcare
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/integrative-healthcare', auth, integrativeHealthcare.getAll);
router.post('/integrative-healthcare', auth, integrativeHealthcare.create);
router.get('/integrative-healthcare/statistics', auth, integrativeHealthcare.getStatistics);
router.get(
  '/integrative-healthcare/overdue-immunizations',
  auth,
  integrativeHealthcare.getOverdueImmunizations
);
router.get(
  '/integrative-healthcare/beneficiary/:beneficiaryId',
  auth,
  integrativeHealthcare.getByBeneficiary
);
router.get('/integrative-healthcare/:id', auth, integrativeHealthcare.getById);
router.put('/integrative-healthcare/:id', auth, integrativeHealthcare.update);
router.delete('/integrative-healthcare/:id', auth, integrativeHealthcare.delete);
router.post('/integrative-healthcare/:id/dental', auth, integrativeHealthcare.addDentalVisit);
router.put(
  '/integrative-healthcare/:id/nutrition',
  auth,
  integrativeHealthcare.updateNutritionPlan
);
router.post(
  '/integrative-healthcare/:id/immunizations',
  auth,
  integrativeHealthcare.addImmunization
);
router.post('/integrative-healthcare/:id/medications', auth, integrativeHealthcare.addMedication);
router.post(
  '/integrative-healthcare/:id/specialist-visits',
  auth,
  integrativeHealthcare.addSpecialistVisit
);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. الدمج المجتمعي — /community-integration
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/community-integration', auth, communityIntegration.getAll);
router.post('/community-integration', auth, communityIntegration.create);
router.get('/community-integration/statistics', auth, communityIntegration.getStatistics);
router.get('/community-integration/:id', auth, communityIntegration.getById);
router.put('/community-integration/:id', auth, communityIntegration.update);
router.delete('/community-integration/:id', auth, communityIntegration.delete);
router.post('/community-integration/:id/life-skills', auth, communityIntegration.addLifeSkill);
router.post('/community-integration/:id/activities', auth, communityIntegration.addActivity);
router.put(
  '/community-integration/:id/social-network',
  auth,
  communityIntegration.updateSocialNetwork
);
router.post(
  '/community-integration/:id/travel-training',
  auth,
  communityIntegration.addTravelTraining
);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. دعم مقدمي الرعاية — /caregiver-support
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/caregiver-support', auth, caregiverSupport.getAll);
router.post('/caregiver-support', auth, caregiverSupport.create);
router.get('/caregiver-support/statistics', auth, caregiverSupport.getStatistics);
router.get('/caregiver-support/high-burden', auth, caregiverSupport.getHighBurden);
router.get('/caregiver-support/:id', auth, caregiverSupport.getById);
router.put('/caregiver-support/:id', auth, caregiverSupport.update);
router.delete('/caregiver-support/:id', auth, caregiverSupport.delete);
router.post('/caregiver-support/:id/training', auth, caregiverSupport.addTraining);
router.post('/caregiver-support/:id/respite', auth, caregiverSupport.addRespiteCare);
router.post('/caregiver-support/:id/counseling', auth, caregiverSupport.addCounseling);

// ═══════════════════════════════════════════════════════════════════════════════
// 7. تدقيق الوصول الشامل — /accessibility-audit
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/accessibility-audit', auth, accessibilityAudit.getAll);
router.post('/accessibility-audit', auth, accessibilityAudit.create);
router.get('/accessibility-audit/statistics', auth, accessibilityAudit.getStatistics);
router.get('/accessibility-audit/non-compliant', auth, accessibilityAudit.getNonCompliant);
router.get('/accessibility-audit/:id', auth, accessibilityAudit.getById);
router.put('/accessibility-audit/:id', auth, accessibilityAudit.update);
router.delete('/accessibility-audit/:id', auth, accessibilityAudit.delete);
router.post('/accessibility-audit/:id/findings', auth, accessibilityAudit.addFinding);
router.put(
  '/accessibility-audit/:id/findings/:findingId/status',
  auth,
  accessibilityAudit.updateFindingStatus
);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. الكشف والتدخل المبكر — /early-detection
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/early-detection', auth, earlyDetection.getAll);
router.post('/early-detection', auth, earlyDetection.create);
router.get('/early-detection/statistics', auth, earlyDetection.getStatistics);
router.get('/early-detection/high-risk', auth, earlyDetection.getHighRisk);
router.get('/early-detection/overdue-screenings', auth, earlyDetection.getOverdueScreenings);
router.get('/early-detection/:id', auth, earlyDetection.getById);
router.put('/early-detection/:id', auth, earlyDetection.update);
router.delete('/early-detection/:id', auth, earlyDetection.delete);
router.post('/early-detection/:id/screenings', auth, earlyDetection.addScreening);
router.post('/early-detection/:id/milestones', auth, earlyDetection.addMilestone);
router.post('/early-detection/:id/diagnosis', auth, earlyDetection.addDiagnosis);
router.put('/early-detection/:id/intervention-plan', auth, earlyDetection.updateInterventionPlan);

// ═══════════════════════════════════════════════════════════════════════════════
// 9. قياس النتائج والأثر — /outcome-measurement
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/outcome-measurement', auth, outcomeMeasurement.getAll);
router.post('/outcome-measurement', auth, outcomeMeasurement.create);
router.get('/outcome-measurement/statistics', auth, outcomeMeasurement.getStatistics);
router.get('/outcome-measurement/benchmarks', auth, outcomeMeasurement.getBenchmarkComparison);
router.get(
  '/outcome-measurement/beneficiary/:beneficiaryId',
  auth,
  outcomeMeasurement.getByBeneficiary
);
router.get(
  '/outcome-measurement/beneficiary/:beneficiaryId/trend',
  auth,
  outcomeMeasurement.getProgressTrend
);
router.get('/outcome-measurement/:id', auth, outcomeMeasurement.getById);
router.put('/outcome-measurement/:id', auth, outcomeMeasurement.update);
router.delete('/outcome-measurement/:id', auth, outcomeMeasurement.delete);

// ═══════════════════════════════════════════════════════════════════════════════
// 10. الإسكان التكيفي — /adaptive-housing
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/adaptive-housing', auth, adaptiveHousing.getAll);
router.post('/adaptive-housing', auth, adaptiveHousing.create);
router.get('/adaptive-housing/statistics', auth, adaptiveHousing.getStatistics);
router.get(
  '/adaptive-housing/pending-modifications',
  auth,
  adaptiveHousing.getPendingModifications
);
router.get('/adaptive-housing/funding-gaps', auth, adaptiveHousing.getFundingGaps);
router.get('/adaptive-housing/:id', auth, adaptiveHousing.getById);
router.put('/adaptive-housing/:id', auth, adaptiveHousing.update);
router.delete('/adaptive-housing/:id', auth, adaptiveHousing.delete);
router.post('/adaptive-housing/:id/modifications', auth, adaptiveHousing.addModification);
router.put(
  '/adaptive-housing/:id/modifications/:modId',
  auth,
  adaptiveHousing.updateModificationStatus
);
router.put('/adaptive-housing/:id/smart-home', auth, adaptiveHousing.updateSmartHome);
router.post('/adaptive-housing/:id/funding', auth, adaptiveHousing.addFunding);

module.exports = router;
