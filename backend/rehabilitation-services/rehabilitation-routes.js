/* eslint-disable no-unused-vars */
/**
 * Rehabilitation Services Routes - Complete
 * مسارات خدمات التأهيل الشاملة
 * الإصدار 7.0.0 - ربط جميع الخدمات المتبقية (44 خدمة شاملة)
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Import all rehabilitation services — Core (Phase 1-4)
const { PhysicalTherapyService } = require('./physical-therapy-service');
const { OccupationalTherapyService } = require('./occupational-therapy-service');
const { SpeechTherapyService } = require('./speech-therapy-service');
const { PsychologicalSupportService } = require('./psychological-support-service');
const { VocationalRehabilitationService } = require('./vocational-rehabilitation-service');

// Import rehabilitation services — Phase 5
const { ArtTherapyService } = require('./art-therapy-service');
const { MusicTherapyService } = require('./music-therapy-service');
const { HydrotherapyService } = require('./hydrotherapy-service');
const { ABATherapyService } = require('./aba-therapy-service');
const { CognitiveRehabilitationService } = require('./cognitive-rehabilitation-service');
const { SensoryIntegrationService } = require('./sensory-integration-service');
const { AnimalAssistedTherapyService } = require('./animal-assisted-therapy-service');
const { TherapeuticNutritionService } = require('./therapeutic-nutrition-service');

// Import new therapy services — Phase 6
const { VRTherapyService } = require('./vr-therapy-service');
const { PlayTherapyService } = require('./play-therapy-service');
const { RoboticTherapyService } = require('./robotic-therapy-service');
const { AdaptiveSportsService } = require('./adaptive-sports-service');
const { LearningDisabilitiesService } = require('./learning-disabilities-service');

// Import existing but unwired services — Phase 6 wiring
const { TeleRehabilitationService } = require('./tele-rehabilitation-service');
const { EarlyInterventionService } = require('./early-intervention-service');
const { FamilySupportService } = require('./family-support-service');
const { CommunityIntegrationService } = require('./community-integration-service');
const { AssistiveTechnologyService } = require('./assistive-technology-service');
const { CaseManagementService } = require('./case-management-service');
const { SpecialEducationService } = require('./special-education-service');
const { ResidentialRehabilitationService } = require('./residential-rehabilitation-service');

// Import advanced feature services — Phase 6
const { SmartSchedulingService } = require('./smart-scheduling-service');
const { SatisfactionFeedbackService } = require('./satisfaction-feedback-service');
const { AIAssessmentService } = require('./ai-assessment-service');
const { AlertsNotificationsService } = require('./alerts-notifications-service');
const safeError = require('../utils/safeError');
const { TherapistDashboardService } = require('./therapist-dashboard-service');

// Import remaining services — Phase 7 complete wiring
const { AdvancedEarlyInterventionService } = require('./advanced-early-intervention-service');
const { AdvancedFamilySupportService } = require('./advanced-family-support-service');
const { AdvancedPhysicalTherapyService } = require('./advanced-physical-therapy-service');
const { AdvancedPsychologicalSupportService } = require('./advanced-psychological-support-service');
const { AdvancedSpeechTherapyService } = require('./advanced-speech-therapy-service');
const {
  AdvancedVocationalRehabilitationService,
} = require('./advanced-vocational-rehabilitation-service');
const { DisabilityCertificationService } = require('./disability-certification-service');
const {
  IndividualizedRehabilitationPlanService,
} = require('./individualized-rehabilitation-plan-service');
const { RehabilitationMetricsService } = require('./rehabilitation-metrics-service');
const { RehabilitationReportsService } = require('./rehabilitation-reports-service');
const { SaudiSocialBenefitsService } = require('./saudi-social-benefits-service');
const { SpeechTherapyActivitiesService } = require('./speech-therapy-activities-service');
const { UnifiedAssessmentService } = require('./unified-assessment-service');

// Import new services — Phase 8
const { BehavioralTherapyService } = require('./behavioral-therapy-service');
const { PainManagementService } = require('./pain-management-service');
const { SleepTherapyService } = require('./sleep-therapy-service');
const { SocialSkillsTrainingService } = require('./social-skills-training-service');
const { ParentalTrainingService } = require('./parental-training-service');
const { TransitionPlanningService } = require('./transition-planning-service');
const { QualityAssuranceService } = require('./quality-assurance-service');
const { BeneficiaryPortalService } = require('./beneficiary-portal-service');

// Import new services — Phase 9
const { WheelchairMobilityService } = require('./wheelchair-mobility-service');
const { HearingRehabilitationService } = require('./hearing-rehabilitation-service');
const { VisualRehabilitationService } = require('./visual-rehabilitation-service');
const { ChronicDiseaseRehabService } = require('./chronic-disease-rehab-service');
const { GroupTherapyManagementService } = require('./group-therapy-management-service');
const { HomeBasedRehabService } = require('./home-based-rehab-service');
const { EmergencyRehabService } = require('./emergency-rehab-service');
const { VolunteerManagementService } = require('./volunteer-management-service');
const { ResearchStudiesService } = require('./research-studies-service');

// Initialize services — Core
const physicalTherapy = new PhysicalTherapyService();
const occupationalTherapy = new OccupationalTherapyService();
const speechTherapy = new SpeechTherapyService();
const psychologicalSupport = new PsychologicalSupportService();
const vocationalRehabilitation = new VocationalRehabilitationService();

// Initialize services — Phase 5
const artTherapy = new ArtTherapyService();
const musicTherapy = new MusicTherapyService();
const hydrotherapy = new HydrotherapyService();
const abaTherapy = new ABATherapyService();
const cognitiveRehab = new CognitiveRehabilitationService();
const sensoryIntegration = new SensoryIntegrationService();
const animalTherapy = new AnimalAssistedTherapyService();
const therapeuticNutrition = new TherapeuticNutritionService();

// Initialize new therapy services — Phase 6
const vrTherapy = new VRTherapyService();
const playTherapy = new PlayTherapyService();
const roboticTherapy = new RoboticTherapyService();
const adaptiveSports = new AdaptiveSportsService();
const learningDisabilities = new LearningDisabilitiesService();

// Initialize existing services — Phase 6 wiring
const teleRehab = new TeleRehabilitationService();
const earlyIntervention = new EarlyInterventionService();
const familySupport = new FamilySupportService();
const communityIntegration = new CommunityIntegrationService();
const assistiveTech = new AssistiveTechnologyService();
const caseManagement = new CaseManagementService();
const specialEducation = new SpecialEducationService();
const residentialRehab = new ResidentialRehabilitationService();

// Initialize advanced feature services — Phase 6
const smartScheduling = new SmartSchedulingService();
const satisfactionFeedback = new SatisfactionFeedbackService();
const aiAssessment = new AIAssessmentService();
const alertsNotifications = new AlertsNotificationsService();
const therapistDashboard = new TherapistDashboardService();

// Initialize remaining services — Phase 7 complete wiring
const advancedEarlyIntervention = new AdvancedEarlyInterventionService();
const advancedFamilySupport = new AdvancedFamilySupportService();
const advancedPhysicalTherapy = new AdvancedPhysicalTherapyService();
const advancedPsychologicalSupport = new AdvancedPsychologicalSupportService();
const advancedSpeechTherapy = new AdvancedSpeechTherapyService();
const advancedVocationalRehab = new AdvancedVocationalRehabilitationService();
const disabilityCertification = new DisabilityCertificationService();
const individualizedPlan = new IndividualizedRehabilitationPlanService();
const rehabMetrics = new RehabilitationMetricsService();
const rehabReports = new RehabilitationReportsService();
const saudiBenefits = new SaudiSocialBenefitsService();
const speechActivities = new SpeechTherapyActivitiesService();
const unifiedAssessment = new UnifiedAssessmentService();

// Initialize new services — Phase 8
const behavioralTherapy = new BehavioralTherapyService();
const painManagement = new PainManagementService();
const sleepTherapy = new SleepTherapyService();
const socialSkillsTraining = new SocialSkillsTrainingService();
const parentalTraining = new ParentalTrainingService();
const transitionPlanning = new TransitionPlanningService();
const qualityAssurance = new QualityAssuranceService();
const beneficiaryPortal = new BeneficiaryPortalService();

// Initialize new services — Phase 9
const wheelchairMobility = new WheelchairMobilityService();
const hearingRehab = new HearingRehabilitationService();
const visualRehab = new VisualRehabilitationService();
const chronicDiseaseRehab = new ChronicDiseaseRehabService();
const groupTherapy = new GroupTherapyManagementService();
const homeBasedRehab = new HomeBasedRehabService();
const emergencyRehab = new EmergencyRehabService();
const volunteerManagement = new VolunteerManagementService();
const researchStudies = new ResearchStudiesService();

// ==================== العلاج الطبيعي ====================

router.post('/physical-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessment } = req.body;
    const plan = await physicalTherapy.createTreatmentPlan(beneficiaryId, assessment);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/physical-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await physicalTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/physical-therapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await physicalTherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== العلاج الوظيفي ====================

router.post('/occupational-therapy/assess', async (req, res) => {
  try {
    const { beneficiaryId } = req.body;
    const assessment = await occupationalTherapy.assessFunctionalSkills(beneficiaryId);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/occupational-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await occupationalTherapy.createOccupationalPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/occupational-therapy/activity', async (req, res) => {
  try {
    const { beneficiaryId, activityData } = req.body;
    const activity = await occupationalTherapy.recordActivity(beneficiaryId, activityData);
    res.json({ success: true, data: activity });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/occupational-therapy/performance/:beneficiaryId', async (req, res) => {
  try {
    const report = await occupationalTherapy.getPerformanceReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التخاطب والنطق ====================

router.post('/speech-therapy/assess', async (req, res) => {
  try {
    const { beneficiaryId } = req.body;
    const assessment = await speechTherapy.assessCommunication(beneficiaryId);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/speech-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await speechTherapy.createSpeechTherapyPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/speech-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await speechTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/speech-therapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await speechTherapy.getSpeechProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== الدعم النفسي ====================

router.post('/psychological/assess', async (req, res) => {
  try {
    const { beneficiaryId } = req.body;
    const assessment = await psychologicalSupport.performPsychologicalAssessment(beneficiaryId);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/psychological/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await psychologicalSupport.createSupportPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/psychological/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await psychologicalSupport.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/psychological/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await psychologicalSupport.getPsychologicalProgressReport(
      req.params.beneficiaryId
    );
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التأهيل المهني ====================

router.post('/vocational/assess', async (req, res) => {
  try {
    const { beneficiaryId } = req.body;
    const assessment = await vocationalRehabilitation.assessVocationalSkills(beneficiaryId);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/vocational/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await vocationalRehabilitation.createVocationalPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/vocational/training', async (req, res) => {
  try {
    const { beneficiaryId, progressData } = req.body;
    const progress = await vocationalRehabilitation.recordTrainingProgress(
      beneficiaryId,
      progressData
    );
    res.json({ success: true, data: progress });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/vocational/placement', async (req, res) => {
  try {
    const { beneficiaryId, placementData } = req.body;
    const placement = await vocationalRehabilitation.recordPlacement(beneficiaryId, placementData);
    res.json({ success: true, data: placement });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/vocational/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await vocationalRehabilitation.getVocationalProgressReport(
      req.params.beneficiaryId
    );
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== العلاج بالفنون ====================

router.post('/art-therapy/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await artTherapy.assessArtisticAbilities(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/art-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await artTherapy.createArtTherapyPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/art-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await artTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/art-therapy/artwork', async (req, res) => {
  try {
    const { beneficiaryId, artworkData } = req.body;
    const artwork = await artTherapy.recordArtwork(beneficiaryId, artworkData);
    res.json({ success: true, data: artwork });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/art-therapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await artTherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== العلاج بالموسيقى ====================

router.post('/music-therapy/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await musicTherapy.assessMusicalResponse(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/music-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await musicTherapy.createMusicTherapyPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/music-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await musicTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/music-therapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await musicTherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== العلاج المائي ====================

router.post('/hydrotherapy/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await hydrotherapy.assessAquaticReadiness(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/hydrotherapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await hydrotherapy.createHydrotherapyPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/hydrotherapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await hydrotherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/hydrotherapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await hydrotherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== تحليل السلوك التطبيقي (ABA) ====================

router.post('/aba-therapy/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await abaTherapy.conductFunctionalAssessment(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/aba-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await abaTherapy.createBehaviorInterventionPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/aba-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await abaTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/aba-therapy/daily-behavior', async (req, res) => {
  try {
    const { beneficiaryId, data } = req.body;
    const record = await abaTherapy.recordDailyBehavior(beneficiaryId, data);
    res.json({ success: true, data: record });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/aba-therapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await abaTherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== إعادة التأهيل المعرفي ====================

router.post('/cognitive-rehab/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await cognitiveRehab.assessCognitiveFunction(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/cognitive-rehab/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await cognitiveRehab.createCognitiveRehabPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/cognitive-rehab/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await cognitiveRehab.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/cognitive-rehab/home-exercise', async (req, res) => {
  try {
    const { beneficiaryId, exerciseData } = req.body;
    const result = await cognitiveRehab.recordHomeExercise(beneficiaryId, exerciseData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/cognitive-rehab/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await cognitiveRehab.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== العلاج الحسي التكاملي ====================

router.post('/sensory-integration/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await sensoryIntegration.assessSensoryProfile(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/sensory-integration/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await sensoryIntegration.createSensoryIntegrationPlan(
      beneficiaryId,
      assessmentData
    );
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/sensory-integration/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await sensoryIntegration.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/sensory-integration/sensory-diet', async (req, res) => {
  try {
    const { beneficiaryId, dietData } = req.body;
    const diet = await sensoryIntegration.updateSensoryDiet(beneficiaryId, dietData);
    res.json({ success: true, data: diet });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/sensory-integration/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await sensoryIntegration.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== العلاج بمساعدة الحيوانات ====================

router.post('/animal-therapy/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await animalTherapy.assessReadiness(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/animal-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await animalTherapy.createAnimalTherapyPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/animal-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await animalTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/animal-therapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await animalTherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التغذية العلاجية ====================

router.post('/therapeutic-nutrition/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await therapeuticNutrition.assessNutritionalStatus(
      beneficiaryId,
      assessmentData
    );
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/therapeutic-nutrition/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await therapeuticNutrition.createNutritionPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/therapeutic-nutrition/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await therapeuticNutrition.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/therapeutic-nutrition/daily-feeding', async (req, res) => {
  try {
    const { beneficiaryId, data } = req.body;
    const record = await therapeuticNutrition.recordDailyFeeding(beneficiaryId, data);
    res.json({ success: true, data: record });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/therapeutic-nutrition/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await therapeuticNutrition.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== العلاج بالواقع الافتراضي (Phase 6) ====================

router.post('/vr-therapy/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await vrTherapy.assessVRReadiness(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/vr-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await vrTherapy.createVRTherapyPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/vr-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await vrTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/vr-therapy/environment', async (req, res) => {
  try {
    const { beneficiaryId, environmentData } = req.body;
    const env = await vrTherapy.createCustomEnvironment(beneficiaryId, environmentData);
    res.json({ success: true, data: env });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/vr-therapy/environments/:beneficiaryId', async (req, res) => {
  try {
    const envs = await vrTherapy.getEnvironments(req.params.beneficiaryId);
    res.json({ success: true, data: envs });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/vr-therapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await vrTherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== العلاج باللعب (Phase 6) ====================

router.post('/play-therapy/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await playTherapy.assessPlaySkills(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/play-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await playTherapy.createPlayTherapyPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/play-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await playTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/play-therapy/profile', async (req, res) => {
  try {
    const { beneficiaryId, profileData } = req.body;
    const profile = await playTherapy.updatePlayProfile(beneficiaryId, profileData);
    res.json({ success: true, data: profile });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/play-therapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await playTherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== العلاج بالروبوتات (Phase 6) ====================

router.post('/robotic-therapy/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await roboticTherapy.assessRoboticFitness(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/robotic-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await roboticTherapy.createRoboticTherapyPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/robotic-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await roboticTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/robotic-therapy/devices', async (req, res) => {
  try {
    const catalog = await roboticTherapy.getDeviceCatalog();
    res.json({ success: true, data: catalog });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/robotic-therapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await roboticTherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== الرياضة التكيفية (Phase 6) ====================

router.post('/adaptive-sports/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await adaptiveSports.assessSportsFitness(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/adaptive-sports/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await adaptiveSports.createSportsPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/adaptive-sports/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await adaptiveSports.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/adaptive-sports/achievement', async (req, res) => {
  try {
    const { beneficiaryId, achievementData } = req.body;
    const achievement = await adaptiveSports.recordAchievement(beneficiaryId, achievementData);
    res.json({ success: true, data: achievement });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/adaptive-sports/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await adaptiveSports.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== علاج صعوبات التعلم (Phase 6) ====================

router.post('/learning-disabilities/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await learningDisabilities.assessLearningAbilities(
      beneficiaryId,
      assessmentData
    );
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/learning-disabilities/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await learningDisabilities.createLearningPlan(beneficiaryId, assessmentData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/learning-disabilities/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await learningDisabilities.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/learning-disabilities/quick-assessment', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const qa = await learningDisabilities.recordQuickAssessment(beneficiaryId, assessmentData);
    res.json({ success: true, data: qa });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/learning-disabilities/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await learningDisabilities.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التأهيل عن بُعد (Phase 6 wiring) ====================

router.post('/tele-rehab/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await teleRehab.createSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/tele-rehab/start/:sessionId', async (req, res) => {
  try {
    const result = await teleRehab.startSession(req.params.sessionId);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/tele-rehab/end/:sessionId', async (req, res) => {
  try {
    const { notes } = req.body;
    const result = await teleRehab.endSession(req.params.sessionId, notes);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/tele-rehab/prescription', async (req, res) => {
  try {
    const { beneficiaryId, prescriptionData } = req.body;
    const rx = await teleRehab.createRemotePrescription(beneficiaryId, prescriptionData);
    res.json({ success: true, data: rx });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/tele-rehab/exercise-progress', async (req, res) => {
  try {
    const { beneficiaryId, progressData } = req.body;
    const result = await teleRehab.logExerciseProgress(beneficiaryId, progressData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/tele-rehab/report/:beneficiaryId', async (req, res) => {
  try {
    const report = await teleRehab.generateTeleRehabReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التدخل المبكر (Phase 6 wiring) ====================

router.post('/early-intervention/register', async (req, res) => {
  try {
    const { caseData } = req.body;
    const result = await earlyIntervention.registerCase(caseData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/early-intervention/screening', async (req, res) => {
  try {
    const { caseId, screeningData } = req.body;
    const result = await earlyIntervention.conductScreening(caseId, screeningData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/early-intervention/plan', async (req, res) => {
  try {
    const { caseId, planData } = req.body;
    const plan = await earlyIntervention.createInterventionPlan(caseId, planData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/early-intervention/session', async (req, res) => {
  try {
    const { caseId, sessionData } = req.body;
    const session = await earlyIntervention.recordSession(caseId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/early-intervention/report/:caseId', async (req, res) => {
  try {
    const report = await earlyIntervention.generateProgressReport(req.params.caseId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== دعم الأسرة (Phase 6 wiring) ====================

router.post('/family-support/register', async (req, res) => {
  try {
    const { familyData } = req.body;
    const family = await familySupport.registerFamily(familyData);
    res.json({ success: true, data: family });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/family-support/assess', async (req, res) => {
  try {
    const { familyId, assessmentData } = req.body;
    const assessment = await familySupport.assessFamilyNeeds(familyId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/family-support/counseling', async (req, res) => {
  try {
    const { familyId, counselingData } = req.body;
    const session = await familySupport.scheduleCounseling(familyId, counselingData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/family-support/training', async (req, res) => {
  try {
    const { familyId, trainingData } = req.body;
    const program = await familySupport.createFamilyTrainingProgram(familyId, trainingData);
    res.json({ success: true, data: program });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/family-support/resources', async (req, res) => {
  try {
    const resources = await familySupport.getSupportResources();
    res.json({ success: true, data: resources });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== الدمج المجتمعي (Phase 6 wiring) ====================

router.post('/community-integration/program', async (req, res) => {
  try {
    const { programData } = req.body;
    const program = await communityIntegration.createIntegrationProgram(programData);
    res.json({ success: true, data: program });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/community-integration/enroll', async (req, res) => {
  try {
    const { programId, beneficiaryId } = req.body;
    const result = await communityIntegration.enrollBeneficiary(programId, beneficiaryId);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/community-integration/attendance', async (req, res) => {
  try {
    const { programId, attendanceData } = req.body;
    const record = await communityIntegration.recordAttendance(programId, attendanceData);
    res.json({ success: true, data: record });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/community-integration/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await communityIntegration.assessIntegrationLevel(
      beneficiaryId,
      assessmentData
    );
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/community-integration/report/:beneficiaryId', async (req, res) => {
  try {
    const report = await communityIntegration.generateIntegrationReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التقنيات المساعدة (Phase 6 wiring) ====================

router.post('/assistive-tech/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await assistiveTech.assessNeeds(beneficiaryId, assessmentData);
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/assistive-tech/allocate', async (req, res) => {
  try {
    const { beneficiaryId, deviceId, allocationData } = req.body;
    const result = await assistiveTech.allocateDevice(beneficiaryId, deviceId, allocationData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/assistive-tech/training', async (req, res) => {
  try {
    const { beneficiaryId, trainingData } = req.body;
    const program = await assistiveTech.createTrainingProgram(beneficiaryId, trainingData);
    res.json({ success: true, data: program });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/assistive-tech/maintenance', async (req, res) => {
  try {
    const { deviceId, maintenanceData } = req.body;
    const request = await assistiveTech.requestMaintenance(deviceId, maintenanceData);
    res.json({ success: true, data: request });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/assistive-tech/devices', async (req, res) => {
  try {
    const devices = await assistiveTech.searchDevices(req.query);
    res.json({ success: true, data: devices });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/assistive-tech/report/:beneficiaryId', async (req, res) => {
  try {
    const report = await assistiveTech.generateUsageReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== إدارة الحالات (Phase 6 wiring) ====================

router.post('/case-management/create', async (req, res) => {
  try {
    const { caseData } = req.body;
    const result = await caseManagement.createCase(caseData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/case-management/assign-team', async (req, res) => {
  try {
    const { caseId, teamData } = req.body;
    const result = await caseManagement.assignTeam(caseId, teamData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/case-management/update-status', async (req, res) => {
  try {
    const { caseId, status, notes } = req.body;
    const result = await caseManagement.updateStatus(caseId, status, notes);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/case-management/note', async (req, res) => {
  try {
    const { caseId, noteData } = req.body;
    const result = await caseManagement.addNote(caseId, noteData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/case-management/report/:caseId', async (req, res) => {
  try {
    const report = await caseManagement.generateCaseReport(req.params.caseId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/case-management/dashboard', async (req, res) => {
  try {
    const stats = await caseManagement.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التربية الخاصة (Phase 6 wiring) ====================

router.post('/special-education/enroll', async (req, res) => {
  try {
    const { studentData } = req.body;
    const result = await specialEducation.enrollStudent(studentData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/special-education/iep', async (req, res) => {
  try {
    const { studentId, iepData } = req.body;
    const iep = await specialEducation.createIEP(studentId, iepData);
    res.json({ success: true, data: iep });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/special-education/goal', async (req, res) => {
  try {
    const { iepId, goalData } = req.body;
    const goal = await specialEducation.addAnnualGoal(iepId, goalData);
    res.json({ success: true, data: goal });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/special-education/progress', async (req, res) => {
  try {
    const { studentId, progressData } = req.body;
    const result = await specialEducation.recordProgress(studentId, progressData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/special-education/transition-plan', async (req, res) => {
  try {
    const { studentId, transitionData } = req.body;
    const plan = await specialEducation.createTransitionPlan(studentId, transitionData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/special-education/iep-report/:studentId', async (req, res) => {
  try {
    const report = await specialEducation.generateIEPProgressReport(req.params.studentId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التأهيل السكني (Phase 6 wiring) ====================

router.post('/residential-rehab/admission', async (req, res) => {
  try {
    const { beneficiaryId, admissionData } = req.body;
    const request = await residentialRehab.requestAdmission(beneficiaryId, admissionData);
    res.json({ success: true, data: request });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/residential-rehab/assess', async (req, res) => {
  try {
    const { admissionId, assessmentData } = req.body;
    const result = await residentialRehab.conductAdmissionAssessment(admissionId, assessmentData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/residential-rehab/care-plan', async (req, res) => {
  try {
    const { beneficiaryId, planData } = req.body;
    const plan = await residentialRehab.createCarePlan(beneficiaryId, planData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/residential-rehab/daily-activity', async (req, res) => {
  try {
    const { beneficiaryId, activityData } = req.body;
    const record = await residentialRehab.recordDailyActivity(beneficiaryId, activityData);
    res.json({ success: true, data: record });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/residential-rehab/incident', async (req, res) => {
  try {
    const { beneficiaryId, incidentData } = req.body;
    const record = await residentialRehab.recordIncident(beneficiaryId, incidentData);
    res.json({ success: true, data: record });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/residential-rehab/family-visit', async (req, res) => {
  try {
    const { beneficiaryId, visitData } = req.body;
    const record = await residentialRehab.recordFamilyVisit(beneficiaryId, visitData);
    res.json({ success: true, data: record });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/residential-rehab/report/:beneficiaryId', async (req, res) => {
  try {
    const report = await residentialRehab.generateResidenceReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== المواعيد الذكية (Phase 6 Feature) ====================

router.post('/scheduling/appointment', async (req, res) => {
  try {
    const { appointmentData } = req.body;
    const result = await smartScheduling.createAppointment(appointmentData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.put('/scheduling/appointment/:appointmentId', async (req, res) => {
  try {
    const result = await smartScheduling.updateAppointment(req.params.appointmentId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/scheduling/cancel/:appointmentId', async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await smartScheduling.cancelAppointment(req.params.appointmentId, reason);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/scheduling/therapist/:therapistId', async (req, res) => {
  try {
    const schedule = await smartScheduling.getTherapistSchedule(req.params.therapistId, req.query);
    res.json({ success: true, data: schedule });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/scheduling/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const schedule = await smartScheduling.getBeneficiarySchedule(
      req.params.beneficiaryId,
      req.query
    );
    res.json({ success: true, data: schedule });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/scheduling/waitlist', async (req, res) => {
  try {
    const { beneficiaryId, serviceType, preferences } = req.body;
    const result = await smartScheduling.addToWaitlist(beneficiaryId, serviceType, preferences);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/scheduling/stats', async (req, res) => {
  try {
    const stats = await smartScheduling.getSchedulingStats(req.query);
    res.json({ success: true, data: stats });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== رضا المستفيدين (Phase 6 Feature) ====================

router.post('/satisfaction/survey', async (req, res) => {
  try {
    const { beneficiaryId, templateId, context } = req.body;
    const result = await satisfactionFeedback.sendSurvey(beneficiaryId, templateId, context);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/satisfaction/response/:surveyId', async (req, res) => {
  try {
    const { answers } = req.body;
    const result = await satisfactionFeedback.submitResponse(req.params.surveyId, answers);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/satisfaction/complaint', async (req, res) => {
  try {
    const { beneficiaryId, complaintData } = req.body;
    const result = await satisfactionFeedback.submitComplaint(beneficiaryId, complaintData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/satisfaction/suggestion', async (req, res) => {
  try {
    const { beneficiaryId, suggestionData } = req.body;
    const result = await satisfactionFeedback.submitSuggestion(beneficiaryId, suggestionData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/satisfaction/report', async (req, res) => {
  try {
    const report = await satisfactionFeedback.getSatisfactionReport(req.query);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/satisfaction/dashboard', async (req, res) => {
  try {
    const stats = await satisfactionFeedback.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التقييم بالذكاء الاصطناعي (Phase 6 Feature) ====================

router.post('/ai-assessment/conduct', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const result = await aiAssessment.conductAIAssessment(beneficiaryId, assessmentData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/ai-assessment/predict', async (req, res) => {
  try {
    const { beneficiaryId, serviceType, durationWeeks } = req.body;
    const result = await aiAssessment.predictOutcomes(beneficiaryId, serviceType, durationWeeks);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/ai-assessment/risk/:beneficiaryId', async (req, res) => {
  try {
    const risk = await aiAssessment.assessRisk(req.params.beneficiaryId);
    res.json({ success: true, data: risk });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/ai-assessment/trends/:beneficiaryId', async (req, res) => {
  try {
    const trends = await aiAssessment.getAssessmentTrends(req.params.beneficiaryId);
    res.json({ success: true, data: trends });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/ai-assessment/report/:beneficiaryId', async (req, res) => {
  try {
    const report = await aiAssessment.getAIReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التنبيهات والإشعارات (Phase 6 Feature) ====================

router.post('/alerts/create', async (req, res) => {
  try {
    const { alertData } = req.body;
    const alert = await alertsNotifications.createAlert(alertData);
    res.json({ success: true, data: alert });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/alerts/analyze-session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData, historicalSessions } = req.body;
    const alerts = await alertsNotifications.analyzeSessionForAlerts(
      beneficiaryId,
      sessionData,
      historicalSessions
    );
    res.json({ success: true, data: alerts });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const alerts = await alertsNotifications.getAlerts(req.query);
    res.json({ success: true, data: alerts });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.put('/alerts/read/:alertId', async (req, res) => {
  try {
    const result = await alertsNotifications.markAlertRead(req.params.alertId);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.put('/alerts/resolve/:alertId', async (req, res) => {
  try {
    const { resolution } = req.body;
    const result = await alertsNotifications.resolveAlert(req.params.alertId, resolution);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/alerts/report', async (req, res) => {
  try {
    const report = await alertsNotifications.getAlertsReport(req.query);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/alerts/preferences', async (req, res) => {
  try {
    const { userId, preferences } = req.body;
    const result = await alertsNotifications.setNotificationPreferences(userId, preferences);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== لوحة تحكم المعالج (Phase 6 Feature) ====================

router.post('/therapist-dashboard/register', async (req, res) => {
  try {
    const { therapistData } = req.body;
    const therapist = await therapistDashboard.registerTherapist(therapistData);
    res.json({ success: true, data: therapist });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/therapist-dashboard/assign', async (req, res) => {
  try {
    const { therapistId, beneficiaryId, serviceType } = req.body;
    const result = await therapistDashboard.assignBeneficiary(
      therapistId,
      beneficiaryId,
      serviceType
    );
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/therapist-dashboard/performance', async (req, res) => {
  try {
    const { therapistId, performanceData } = req.body;
    const record = await therapistDashboard.recordPerformance(therapistId, performanceData);
    res.json({ success: true, data: record });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/therapist-dashboard/:therapistId', async (req, res) => {
  try {
    const dashboard = await therapistDashboard.getDashboard(req.params.therapistId);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/therapist-dashboard/team/report', async (req, res) => {
  try {
    const report = await therapistDashboard.getTeamReport();
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/therapist-dashboard/goal', async (req, res) => {
  try {
    const { therapistId, goalData } = req.body;
    const goal = await therapistDashboard.setTherapistGoal(therapistId, goalData);
    res.json({ success: true, data: goal });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== العلاج الطبيعي المتقدم ====================

router.post('/advanced-physical-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const plan = await advancedPhysicalTherapy.createComprehensiveTreatmentPlan(
      beneficiaryId,
      assessmentData
    );
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-physical-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await advancedPhysicalTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/advanced-physical-therapy/plan/:beneficiaryId', async (req, res) => {
  try {
    const plan = await advancedPhysicalTherapy.getTreatmentPlan(req.params.beneficiaryId);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.put('/advanced-physical-therapy/plan/:planId', async (req, res) => {
  try {
    const updated = await advancedPhysicalTherapy.updateTreatmentPlan(req.params.planId, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/advanced-physical-therapy/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await advancedPhysicalTherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== الدعم النفسي المتقدم ====================

router.post('/advanced-psychological/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await advancedPsychologicalSupport.createPsychologicalAssessment(
      beneficiaryId,
      assessmentData
    );
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-psychological/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await advancedPsychologicalSupport.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-psychological/group-session', async (req, res) => {
  try {
    const session = await advancedPsychologicalSupport.createGroupSession(req.body);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-psychological/crisis', async (req, res) => {
  try {
    const { beneficiaryId, crisisData } = req.body;
    const result = await advancedPsychologicalSupport.handleCrisisIntervention(
      beneficiaryId,
      crisisData
    );
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/advanced-psychological/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await advancedPsychologicalSupport.getPsychologicalProgressReport(
      req.params.beneficiaryId
    );
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التخاطب المتقدم ====================

router.post('/advanced-speech/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const assessment = await advancedSpeechTherapy.createSpeechAssessment(
      beneficiaryId,
      assessmentData
    );
    res.json({ success: true, data: assessment });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-speech/session', async (req, res) => {
  try {
    const { beneficiaryId, sessionData } = req.body;
    const session = await advancedSpeechTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-speech/aac', async (req, res) => {
  try {
    const { beneficiaryId, aacData } = req.body;
    const result = await advancedSpeechTherapy.setupAACSystem(beneficiaryId, aacData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/advanced-speech/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await advancedSpeechTherapy.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التأهيل المهني المتقدم ====================

router.post('/advanced-vocational/assess', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const result = await advancedVocationalRehab.assessVocationalAbilities(
      beneficiaryId,
      assessmentData
    );
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-vocational/plan', async (req, res) => {
  try {
    const { beneficiaryId, careerGoal } = req.body;
    const plan = await advancedVocationalRehab.createTrainingPlan(beneficiaryId, careerGoal);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-vocational/accommodations', async (req, res) => {
  try {
    const { beneficiaryId, disabilityType, jobRequirements } = req.body;
    const result = await advancedVocationalRehab.recommendWorkplaceAccommodations(
      beneficiaryId,
      disabilityType,
      jobRequirements
    );
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-vocational/progress', async (req, res) => {
  try {
    const { planId, progressData } = req.body;
    const result = await advancedVocationalRehab.trackTrainingProgress(planId, progressData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التدخل المبكر المتقدم ====================

router.post('/advanced-early-intervention/screening', async (req, res) => {
  try {
    const { beneficiaryId, screeningData } = req.body;
    const result = await advancedEarlyIntervention.createDevelopmentalScreening(
      beneficiaryId,
      screeningData
    );
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-early-intervention/family-training', async (req, res) => {
  try {
    const { beneficiaryId, planData } = req.body;
    const plan = await advancedEarlyIntervention.createFamilyTrainingPlan(beneficiaryId, planData);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-early-intervention/progress', async (req, res) => {
  try {
    const { beneficiaryId, progressData } = req.body;
    const result = await advancedEarlyIntervention.recordProgress(beneficiaryId, progressData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/advanced-early-intervention/report/:beneficiaryId', async (req, res) => {
  try {
    const report = await advancedEarlyIntervention.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== دعم الأسرة المتقدم ====================

router.post('/advanced-family-support/profile', async (req, res) => {
  try {
    const { beneficiaryId, familyData } = req.body;
    const profile = await advancedFamilySupport.createFamilyProfile(beneficiaryId, familyData);
    res.json({ success: true, data: profile });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-family-support/counseling', async (req, res) => {
  try {
    const { familyId, sessionData } = req.body;
    const session = await advancedFamilySupport.createCounselingSession(familyId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-family-support/caregiver-training', async (req, res) => {
  try {
    const { familyId, trainingData } = req.body;
    const result = await advancedFamilySupport.createCaregiverTraining(familyId, trainingData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-family-support/respite-care', async (req, res) => {
  try {
    const { familyId, requestData } = req.body;
    const result = await advancedFamilySupport.createRespiteCareRequest(familyId, requestData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-family-support/support-group', async (req, res) => {
  try {
    const group = await advancedFamilySupport.createSupportGroup(req.body);
    res.json({ success: true, data: group });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/advanced-family-support/caregiver-burden', async (req, res) => {
  try {
    const { familyId, assessmentData } = req.body;
    const result = await advancedFamilySupport.assessCaregiverBurden(familyId, assessmentData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/advanced-family-support/report/:familyId', async (req, res) => {
  try {
    const report = await advancedFamilySupport.getFamilySupportReport(req.params.familyId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== شهادة الإعاقة ====================

router.post('/disability-certification/request', async (req, res) => {
  try {
    const result = await disabilityCertification.requestCertification(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/disability-certification/assess', async (req, res) => {
  try {
    const { certificationId, assessmentData } = req.body;
    const result = await disabilityCertification.conductAssessment(certificationId, assessmentData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/disability-certification/issue', async (req, res) => {
  try {
    const { certificationId, certificateData } = req.body;
    const result = await disabilityCertification.issueCertificate(certificationId, certificateData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/disability-certification/renew', async (req, res) => {
  try {
    const { certificateId, renewalData } = req.body;
    const result = await disabilityCertification.renewCertificate(certificateId, renewalData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/disability-certification/verify/:certificateNumber', async (req, res) => {
  try {
    const result = await disabilityCertification.verifyCertificate(req.params.certificateNumber);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== خطة التأهيل الفردية ====================

router.post('/rehabilitation-plan/create', async (req, res) => {
  try {
    const plan = await individualizedPlan.createPlan(req.body);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehabilitation-plan/goal', async (req, res) => {
  try {
    const { planId, goalData } = req.body;
    const goal = await individualizedPlan.addGoal(planId, goalData);
    res.json({ success: true, data: goal });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehabilitation-plan/goal-progress', async (req, res) => {
  try {
    const { planId, goalId, progressData } = req.body;
    const result = await individualizedPlan.updateGoalProgress(planId, goalId, progressData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehabilitation-plan/service', async (req, res) => {
  try {
    const { planId, serviceData } = req.body;
    const service = await individualizedPlan.addService(planId, serviceData);
    res.json({ success: true, data: service });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehabilitation-plan/service-session', async (req, res) => {
  try {
    const { planId, serviceId, sessionData } = req.body;
    const session = await individualizedPlan.recordServiceSession(planId, serviceId, sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehabilitation-plan/report', async (req, res) => {
  try {
    const { planId, reportOptions } = req.body;
    const report = await individualizedPlan.generateProgressReport(planId, reportOptions);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehabilitation-plan/review', async (req, res) => {
  try {
    const { planId, reviewData } = req.body;
    const review = await individualizedPlan.reviewPlan(planId, reviewData);
    res.json({ success: true, data: review });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/rehabilitation-plan/:planId', async (req, res) => {
  try {
    const plan = await individualizedPlan.getPlan(req.params.planId);
    res.json({ success: true, data: plan });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/rehabilitation-plan/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const plans = await individualizedPlan.getBeneficiaryPlans(req.params.beneficiaryId);
    res.json({ success: true, data: plans });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/rehabilitation-plan/templates/list', async (req, res) => {
  try {
    const templates = await individualizedPlan.getAvailableTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/rehabilitation-plan/goals-bank', async (req, res) => {
  try {
    const { domain, area } = req.query;
    const goals = await individualizedPlan.getGoalsFromBank(domain, area);
    res.json({ success: true, data: goals });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehabilitation-plan/customize-goal', async (req, res) => {
  try {
    const { planId, goalCode, customizations } = req.body;
    const goal = await individualizedPlan.customizeGoalFromBank(planId, goalCode, customizations);
    res.json({ success: true, data: goal });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== المقاييس المعيارية ====================

router.post('/rehab-metrics/administer', async (req, res) => {
  try {
    const { metricId, beneficiaryData, responses } = req.body;
    const result = await rehabMetrics.administerMetric(metricId, beneficiaryData, responses);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/rehab-metrics/available', async (req, res) => {
  try {
    const { category } = req.query;
    const metrics = await rehabMetrics.getAvailableMetrics(category);
    res.json({ success: true, data: metrics });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehab-metrics/compare', async (req, res) => {
  try {
    const { assessment1, assessment2 } = req.body;
    const comparison = await rehabMetrics.compareAssessments(assessment1, assessment2);
    res.json({ success: true, data: comparison });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehab-metrics/profile', async (req, res) => {
  try {
    const { beneficiaryId, assessments } = req.body;
    const profile = await rehabMetrics.createAssessmentProfile(beneficiaryId, assessments);
    res.json({ success: true, data: profile });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التقارير المتقدمة ====================

router.get('/rehab-reports/individual/:beneficiaryId', async (req, res) => {
  try {
    const report = await rehabReports.generateIndividualProgressReport(
      req.params.beneficiaryId,
      req.query
    );
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/rehab-reports/center/:centerId', async (req, res) => {
  try {
    const { period } = req.query;
    const report = await rehabReports.generateCenterStatisticsReport(req.params.centerId, period);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/rehab-reports/outcomes', async (req, res) => {
  try {
    const { period } = req.query;
    const report = await rehabReports.generateOutcomesReport(period);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/rehab-reports/compliance', async (req, res) => {
  try {
    const { standardType } = req.query;
    const report = await rehabReports.generateComplianceReport(standardType);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehab-reports/custom', async (req, res) => {
  try {
    const report = await rehabReports.generateCustomReport(req.body);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/rehab-reports/export', async (req, res) => {
  try {
    const { reportId, format } = req.body;
    const result = await rehabReports.exportReport(reportId, format);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/rehab-reports/list', async (req, res) => {
  try {
    const reports = await rehabReports.listReports(req.query);
    res.json({ success: true, data: reports });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== الضمان الاجتماعي السعودي ====================

router.post('/saudi-benefits/eligibility', async (req, res) => {
  try {
    const { beneficiaryId, beneficiaryData } = req.body;
    const result = await saudiBenefits.checkEligibility(beneficiaryId, beneficiaryData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/saudi-benefits/apply', async (req, res) => {
  try {
    const { beneficiaryId, applicationData } = req.body;
    const result = await saudiBenefits.submitBenefitApplication(beneficiaryId, applicationData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/saudi-benefits/review', async (req, res) => {
  try {
    const { applicationId, reviewData } = req.body;
    const result = await saudiBenefits.reviewApplication(applicationId, reviewData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/saudi-benefits/payment', async (req, res) => {
  try {
    const { benefitId, paymentData } = req.body;
    const result = await saudiBenefits.processPayment(benefitId, paymentData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/saudi-benefits/active/:beneficiaryId', async (req, res) => {
  try {
    const benefits = await saudiBenefits.getActiveBenefits(req.params.beneficiaryId);
    res.json({ success: true, data: benefits });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/saudi-benefits/renew', async (req, res) => {
  try {
    const { benefitId, renewalData } = req.body;
    const result = await saudiBenefits.renewBenefit(benefitId, renewalData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/saudi-benefits/monthly-report', async (req, res) => {
  try {
    const { month, year } = req.query;
    const report = await saudiBenefits.generateMonthlyReport(parseInt(month), parseInt(year));
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== أنشطة النطق العربي ====================

router.get('/speech-activities/consonants', async (req, res) => {
  try {
    const consonants = speechActivities.getArabicConsonants();
    res.json({ success: true, data: consonants });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/speech-activities/vowels', async (req, res) => {
  try {
    const vowels = speechActivities.getArabicVowels();
    res.json({ success: true, data: vowels });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/speech-activities/articulation', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const result = await speechActivities.createArticulationAssessment(
      beneficiaryId,
      assessmentData
    );
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/speech-activities/activity', async (req, res) => {
  try {
    const { beneficiaryId, activityData } = req.body;
    const result = await speechActivities.createTherapeuticActivity(beneficiaryId, activityData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/speech-activities/performance', async (req, res) => {
  try {
    const { beneficiaryId, exerciseId, performanceData } = req.body;
    const result = await speechActivities.recordExercisePerformance(
      beneficiaryId,
      exerciseId,
      performanceData
    );
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/speech-activities/recommended/:beneficiaryId', async (req, res) => {
  try {
    const activities = await speechActivities.getRecommendedActivities(
      req.params.beneficiaryId,
      req.query
    );
    res.json({ success: true, data: activities });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/speech-activities/progress/:beneficiaryId', async (req, res) => {
  try {
    const report = await speechActivities.getProgressReport(req.params.beneficiaryId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== التقييم الموحد ====================

router.post('/unified-assessment/initial', async (req, res) => {
  try {
    const { beneficiaryId, assessmentData } = req.body;
    const result = await unifiedAssessment.performInitialAssessment(beneficiaryId, assessmentData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/unified-assessment/follow-up', async (req, res) => {
  try {
    const { beneficiaryId, previousAssessmentId, newData } = req.body;
    const result = await unifiedAssessment.performFollowUpAssessment(
      beneficiaryId,
      previousAssessmentId,
      newData
    );
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/unified-assessment/report/:assessmentId', async (req, res) => {
  try {
    const report = await unifiedAssessment.getAssessmentReport(req.params.assessmentId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ══════════════════════════════════════════════════════════════════
//  Phase 8 — خدمات ومميزات جديدة (45–52)
// ══════════════════════════════════════════════════════════════════

// ==================== 45. العلاج السلوكي ====================

router.post('/behavioral-therapy/fba', async (req, res) => {
  try {
    const { beneficiaryId, ...assessmentData } = req.body;
    const result = await behavioralTherapy.conductFBA(beneficiaryId, assessmentData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/behavioral-therapy/bip', async (req, res) => {
  try {
    const { beneficiaryId, ...planData } = req.body;
    const result = await behavioralTherapy.createBIP(beneficiaryId, planData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/behavioral-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, ...sessionData } = req.body;
    const result = await behavioralTherapy.recordSession(beneficiaryId, sessionData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/behavioral-therapy/incident', async (req, res) => {
  try {
    const { beneficiaryId, ...incidentData } = req.body;
    const result = await behavioralTherapy.recordIncident(beneficiaryId, incidentData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/behavioral-therapy/reward', async (req, res) => {
  try {
    const { beneficiaryId, ...rewardData } = req.body;
    const result = await behavioralTherapy.manageRewards(beneficiaryId, rewardData);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/behavioral-therapy/progress/:id', async (req, res) => {
  try {
    const report = await behavioralTherapy.getProgressReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 46. إدارة الألم ====================

router.post('/pain-management/assess', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await painManagement.assessPain(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/pain-management/plan', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await painManagement.createPainPlan(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/pain-management/session', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await painManagement.recordSession(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/pain-management/diary', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await painManagement.logPainDiary(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/pain-management/report/:id', async (req, res) => {
  try {
    const report = await painManagement.getPainReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 47. علاج اضطرابات النوم ====================

router.post('/sleep-therapy/assess', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await sleepTherapy.assessSleep(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/sleep-therapy/plan', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await sleepTherapy.createSleepPlan(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/sleep-therapy/diary', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await sleepTherapy.logSleepDiary(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/sleep-therapy/session', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await sleepTherapy.recordSession(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/sleep-therapy/report/:id', async (req, res) => {
  try {
    const report = await sleepTherapy.getSleepReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 48. تدريب المهارات الاجتماعية ====================

router.post('/social-skills/assess', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await socialSkillsTraining.assessSocialSkills(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/social-skills/program', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await socialSkillsTraining.createProgram(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/social-skills/session', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await socialSkillsTraining.recordSession(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/social-skills/group', async (req, res) => {
  try {
    const result = await socialSkillsTraining.createGroup(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/social-skills/progress/:id', async (req, res) => {
  try {
    const report = await socialSkillsTraining.getProgressReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 49. تدريب الوالدين ====================

router.post('/parental-training/enroll', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await parentalTraining.enrollParent(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/parental-training/session', async (req, res) => {
  try {
    const { enrollmentId, ...data } = req.body;
    const result = await parentalTraining.recordSession(enrollmentId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/parental-training/assess', async (req, res) => {
  try {
    const { enrollmentId, ...data } = req.body;
    const result = await parentalTraining.assessParent(enrollmentId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/parental-training/certificate', async (req, res) => {
  try {
    const result = await parentalTraining.issueCertificate(req.body.enrollmentId);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/parental-training/modules', async (req, res) => {
  try {
    const result = await parentalTraining.getModules(req.query.category);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/parental-training/report/:enrollmentId', async (req, res) => {
  try {
    const report = await parentalTraining.getProgressReport(req.params.enrollmentId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 50. التخطيط الانتقالي ====================

router.post('/transition-planning/assess', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await transitionPlanning.assessReadiness(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/transition-planning/plan', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await transitionPlanning.createTransitionPlan(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/transition-planning/milestone', async (req, res) => {
  try {
    const { planId, ...data } = req.body;
    const result = await transitionPlanning.recordMilestone(planId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/transition-planning/review', async (req, res) => {
  try {
    const { planId, ...data } = req.body;
    const result = await transitionPlanning.reviewPlan(planId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/transition-planning/report/:id', async (req, res) => {
  try {
    const report = await transitionPlanning.getTransitionReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 51. ضمان الجودة ====================

router.post('/quality-assurance/audit', async (req, res) => {
  try {
    const result = await qualityAssurance.conductAudit(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/quality-assurance/incident', async (req, res) => {
  try {
    const result = await qualityAssurance.reportIncident(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/quality-assurance/improvement', async (req, res) => {
  try {
    const result = await qualityAssurance.createImprovement(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/quality-assurance/kpi', async (req, res) => {
  try {
    const result = await qualityAssurance.recordKPI(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/quality-assurance/standards', async (req, res) => {
  try {
    const result = await qualityAssurance.getStandards();
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/quality-assurance/report', async (req, res) => {
  try {
    const report = await qualityAssurance.getQualityReport(req.query);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 52. بوابة المستفيد ====================

router.post('/beneficiary-portal/profile', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await beneficiaryPortal.manageProfile(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/beneficiary-portal/dashboard/:id', async (req, res) => {
  try {
    const result = await beneficiaryPortal.getDashboard(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/beneficiary-portal/appointment', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await beneficiaryPortal.requestAppointment(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/beneficiary-portal/message', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await beneficiaryPortal.sendMessage(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/beneficiary-portal/document', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await beneficiaryPortal.uploadDocument(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/beneficiary-portal/goal', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await beneficiaryPortal.trackGoal(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/beneficiary-portal/feedback', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await beneficiaryPortal.submitFeedback(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/beneficiary-portal/documents/:id', async (req, res) => {
  try {
    const result = await beneficiaryPortal.getDocuments(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ══════════════════════════════════════════════════════════════════
//  Phase 9 — خدمات ومميزات جديدة (53–61)
// ══════════════════════════════════════════════════════════════════

// ==================== 53. الكراسي المتحركة والتنقل ====================

router.post('/wheelchair-mobility/assess', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await wheelchairMobility.assessMobilityNeeds(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/wheelchair-mobility/prescribe', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await wheelchairMobility.prescribeDevice(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/wheelchair-mobility/training', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await wheelchairMobility.recordTrainingSession(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/wheelchair-mobility/maintenance', async (req, res) => {
  try {
    const { deviceId, ...data } = req.body;
    const result = await wheelchairMobility.logMaintenance(deviceId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/wheelchair-mobility/report/:id', async (req, res) => {
  try {
    const report = await wheelchairMobility.getMobilityReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 54. التأهيل السمعي ====================

router.post('/hearing-rehab/assess', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await hearingRehab.assessHearing(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/hearing-rehab/prescribe', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await hearingRehab.prescribeHearingAid(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/hearing-rehab/session', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await hearingRehab.recordSession(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/hearing-rehab/communication-plan', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await hearingRehab.createCommunicationPlan(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/hearing-rehab/report/:id', async (req, res) => {
  try {
    const report = await hearingRehab.getHearingReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 55. التأهيل البصري ====================

router.post('/visual-rehab/assess', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await visualRehab.assessVision(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/visual-rehab/prescribe', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await visualRehab.prescribeVisualAid(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/visual-rehab/orientation', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await visualRehab.recordOrientationSession(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/visual-rehab/daily-living', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await visualRehab.recordDailyLivingSession(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/visual-rehab/report/:id', async (req, res) => {
  try {
    const report = await visualRehab.getVisionReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 56. تأهيل الأمراض المزمنة ====================

router.post('/chronic-disease/assess', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await chronicDiseaseRehab.assessChronic(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/chronic-disease/program', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await chronicDiseaseRehab.createProgram(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/chronic-disease/session', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await chronicDiseaseRehab.recordSession(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/chronic-disease/vitals', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await chronicDiseaseRehab.recordVitals(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/chronic-disease/report/:id', async (req, res) => {
  try {
    const report = await chronicDiseaseRehab.getChronicReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 57. إدارة العلاج الجماعي ====================

router.post('/group-therapy/create', async (req, res) => {
  try {
    const result = await groupTherapy.createGroup(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/group-therapy/enroll', async (req, res) => {
  try {
    const { groupId, ...data } = req.body;
    const result = await groupTherapy.enrollMember(groupId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/group-therapy/session', async (req, res) => {
  try {
    const { groupId, ...data } = req.body;
    const result = await groupTherapy.recordGroupSession(groupId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/group-therapy/interaction', async (req, res) => {
  try {
    const { groupId, ...data } = req.body;
    const result = await groupTherapy.recordInteraction(groupId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/group-therapy/report/:groupId', async (req, res) => {
  try {
    const report = await groupTherapy.getGroupReport(req.params.groupId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 58. التأهيل المنزلي ====================

router.post('/home-rehab/assess', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await homeBasedRehab.assessHomeEnvironment(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/home-rehab/visit', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await homeBasedRehab.scheduleVisit(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/home-rehab/visit-results', async (req, res) => {
  try {
    const { visitId, ...data } = req.body;
    const result = await homeBasedRehab.recordVisitResults(visitId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: error.message || 'حدث خطأ في تسجيل نتائج الزيارة' });
  }
});

router.post('/home-rehab/modification', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await homeBasedRehab.requestModification(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/home-rehab/program', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await homeBasedRehab.createHomeProgram(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/home-rehab/report/:id', async (req, res) => {
  try {
    const report = await homeBasedRehab.getHomeRehabReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 59. التأهيل الطارئ ====================

router.post('/emergency-rehab/triage', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await emergencyRehab.triageEmergency(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/emergency-rehab/session', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await emergencyRehab.recordEmergencySession(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/emergency-rehab/protocols', async (req, res) => {
  try {
    const result = await emergencyRehab.getProtocols(req.query.type);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/emergency-rehab/referral', async (req, res) => {
  try {
    const { beneficiaryId, ...data } = req.body;
    const result = await emergencyRehab.createReferral(beneficiaryId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/emergency-rehab/report/:id', async (req, res) => {
  try {
    const report = await emergencyRehab.getEmergencyReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 60. إدارة المتطوعين ====================

router.post('/volunteers/register', async (req, res) => {
  try {
    const result = await volunteerManagement.registerVolunteer(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/volunteers/assign', async (req, res) => {
  try {
    const { volunteerId, ...data } = req.body;
    const result = await volunteerManagement.assignTask(volunteerId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/volunteers/hours', async (req, res) => {
  try {
    const { volunteerId, ...data } = req.body;
    const result = await volunteerManagement.logHours(volunteerId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/volunteers/evaluate', async (req, res) => {
  try {
    const { volunteerId, ...data } = req.body;
    const result = await volunteerManagement.evaluateVolunteer(volunteerId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/volunteers/certificate', async (req, res) => {
  try {
    const result = await volunteerManagement.issueCertificate(req.body.volunteerId);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/volunteers/report/:volunteerId', async (req, res) => {
  try {
    const report = await volunteerManagement.getVolunteerReport(req.params.volunteerId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== 61. الأبحاث والدراسات ====================

router.post('/research/study', async (req, res) => {
  try {
    const result = await researchStudies.createStudy(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/research/participant', async (req, res) => {
  try {
    const { studyId, ...data } = req.body;
    const result = await researchStudies.enrollParticipant(studyId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/research/data', async (req, res) => {
  try {
    const { studyId, ...data } = req.body;
    const result = await researchStudies.recordData(studyId, data);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/research/analyze/:studyId', async (req, res) => {
  try {
    const result = await researchStudies.analyzeStudy(req.params.studyId);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.post('/research/publication', async (req, res) => {
  try {
    const result = await researchStudies.createPublication(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

router.get('/research/report/:studyId', async (req, res) => {
  try {
    const report = await researchStudies.getResearchReport(req.params.studyId);
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== معلومات الخدمات المتاحة ====================

router.get('/services-catalog', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        version: '9.0.0',
        totalServices: 61,
        categories: {
          coreTherapy: 5,
          specializedTherapy: 13,
          supportServices: 8,
          advancedFeatures: 5,
          advancedTherapy: 4,
          planningAndMetrics: 4,
          governmentAndCertification: 2,
          speechActivitiesAndAssessment: 3,
          behavioralAndPain: 2,
          sleepAndSocial: 2,
          parentalAndTransition: 2,
          qualityAndPortal: 2,
          mobilityAndSensory: 3,
          chronicAndGroup: 2,
          homeAndEmergency: 2,
          volunteerAndResearch: 2,
        },
        services: [
          {
            id: 'physical-therapy',
            nameAr: 'العلاج الطبيعي',
            nameEn: 'Physical Therapy',
            category: 'core',
            description: 'تمارين علاجية لتحسين الحركة والقوة العضلية والتوازن',
            endpoints: [
              '/physical-therapy/plan',
              '/physical-therapy/session',
              '/physical-therapy/progress/:id',
            ],
          },
          {
            id: 'occupational-therapy',
            nameAr: 'العلاج الوظيفي',
            nameEn: 'Occupational Therapy',
            category: 'core',
            description: 'تحسين مهارات الحياة اليومية والاستقلالية',
            endpoints: [
              '/occupational-therapy/assess',
              '/occupational-therapy/plan',
              '/occupational-therapy/activity',
              '/occupational-therapy/performance/:id',
            ],
          },
          {
            id: 'speech-therapy',
            nameAr: 'علاج التخاطب والنطق',
            nameEn: 'Speech Therapy',
            category: 'core',
            description: 'تحسين مهارات التواصل والنطق واللغة',
            endpoints: [
              '/speech-therapy/assess',
              '/speech-therapy/plan',
              '/speech-therapy/session',
              '/speech-therapy/progress/:id',
            ],
          },
          {
            id: 'psychological-support',
            nameAr: 'الدعم النفسي',
            nameEn: 'Psychological Support',
            category: 'core',
            description: 'الدعم النفسي والعلاج النفسي',
            endpoints: [
              '/psychological/assess',
              '/psychological/plan',
              '/psychological/session',
              '/psychological/progress/:id',
            ],
          },
          {
            id: 'vocational-rehabilitation',
            nameAr: 'التأهيل المهني',
            nameEn: 'Vocational Rehabilitation',
            category: 'core',
            description: 'إعداد وتدريب مهني للدمج في سوق العمل',
            endpoints: [
              '/vocational/assess',
              '/vocational/plan',
              '/vocational/training',
              '/vocational/placement',
              '/vocational/progress/:id',
            ],
          },
          {
            id: 'art-therapy',
            nameAr: 'العلاج بالفنون',
            nameEn: 'Art Therapy',
            category: 'specialized',
            description: 'العلاج بالرسم والنحت والأشغال اليدوية لتحسين الصحة النفسية والحركية',
            endpoints: [
              '/art-therapy/assess',
              '/art-therapy/plan',
              '/art-therapy/session',
              '/art-therapy/artwork',
              '/art-therapy/progress/:id',
            ],
          },
          {
            id: 'music-therapy',
            nameAr: 'العلاج بالموسيقى',
            nameEn: 'Music Therapy',
            category: 'specialized',
            description: 'العلاج بالإيقاع والغناء والعزف لتحسين التواصل والمهارات الحركية',
            endpoints: [
              '/music-therapy/assess',
              '/music-therapy/plan',
              '/music-therapy/session',
              '/music-therapy/progress/:id',
            ],
          },
          {
            id: 'hydrotherapy',
            nameAr: 'العلاج المائي',
            nameEn: 'Hydrotherapy',
            category: 'specialized',
            description: 'تمارين مائية وسباحة علاجية لتحسين الحركة وتقليل الألم',
            endpoints: [
              '/hydrotherapy/assess',
              '/hydrotherapy/plan',
              '/hydrotherapy/session',
              '/hydrotherapy/progress/:id',
            ],
          },
          {
            id: 'aba-therapy',
            nameAr: 'تحليل السلوك التطبيقي (ABA)',
            nameEn: 'Applied Behavior Analysis',
            category: 'specialized',
            description: 'تعديل السلوك واكتساب المهارات بأساليب علمية مبنية على الأدلة',
            endpoints: [
              '/aba-therapy/assess',
              '/aba-therapy/plan',
              '/aba-therapy/session',
              '/aba-therapy/daily-behavior',
              '/aba-therapy/progress/:id',
            ],
          },
          {
            id: 'cognitive-rehabilitation',
            nameAr: 'إعادة التأهيل المعرفي',
            nameEn: 'Cognitive Rehabilitation',
            category: 'specialized',
            description: 'تدريبات الذاكرة والانتباه والوظائف التنفيذية',
            endpoints: [
              '/cognitive-rehab/assess',
              '/cognitive-rehab/plan',
              '/cognitive-rehab/session',
              '/cognitive-rehab/home-exercise',
              '/cognitive-rehab/progress/:id',
            ],
          },
          {
            id: 'sensory-integration',
            nameAr: 'العلاج الحسي التكاملي',
            nameEn: 'Sensory Integration Therapy',
            category: 'specialized',
            description: 'علاج اضطرابات المعالجة الحسية والتكامل الحسي',
            endpoints: [
              '/sensory-integration/assess',
              '/sensory-integration/plan',
              '/sensory-integration/session',
              '/sensory-integration/sensory-diet',
              '/sensory-integration/progress/:id',
            ],
          },
          {
            id: 'animal-assisted-therapy',
            nameAr: 'العلاج بمساعدة الحيوانات',
            nameEn: 'Animal-Assisted Therapy',
            category: 'specialized',
            description: 'العلاج بالخيول والكلاب المدربة لتحسين المهارات الحركية والاجتماعية',
            endpoints: [
              '/animal-therapy/assess',
              '/animal-therapy/plan',
              '/animal-therapy/session',
              '/animal-therapy/progress/:id',
            ],
          },
          {
            id: 'therapeutic-nutrition',
            nameAr: 'التغذية العلاجية',
            nameEn: 'Therapeutic Nutrition',
            category: 'specialized',
            description: 'التقييم والتخطيط الغذائي وعلاج صعوبات التغذية والبلع',
            endpoints: [
              '/therapeutic-nutrition/assess',
              '/therapeutic-nutrition/plan',
              '/therapeutic-nutrition/session',
              '/therapeutic-nutrition/daily-feeding',
              '/therapeutic-nutrition/progress/:id',
            ],
          },
          // ── New Phase 6 Services ──
          {
            id: 'vr-therapy',
            nameAr: 'العلاج بالواقع الافتراضي',
            nameEn: 'Virtual Reality Therapy',
            category: 'specialized',
            description: 'بيئات افتراضية ثلاثية الأبعاد للتأهيل الحركي والمعرفي',
            endpoints: [
              '/vr-therapy/assess',
              '/vr-therapy/plan',
              '/vr-therapy/session',
              '/vr-therapy/environment',
              '/vr-therapy/environments/:id',
              '/vr-therapy/progress/:id',
            ],
          },
          {
            id: 'play-therapy',
            nameAr: 'العلاج باللعب',
            nameEn: 'Play Therapy',
            category: 'specialized',
            description: 'اللعب الموجّه لتحسين المهارات الاجتماعية والعاطفية والنمائية للأطفال',
            endpoints: [
              '/play-therapy/assess',
              '/play-therapy/plan',
              '/play-therapy/session',
              '/play-therapy/profile',
              '/play-therapy/progress/:id',
            ],
          },
          {
            id: 'robotic-therapy',
            nameAr: 'العلاج بالروبوتات',
            nameEn: 'Robotic-Assisted Therapy',
            category: 'specialized',
            description: 'أجهزة روبوتية لإعادة التأهيل الحركي والتفاعل الاجتماعي',
            endpoints: [
              '/robotic-therapy/assess',
              '/robotic-therapy/plan',
              '/robotic-therapy/session',
              '/robotic-therapy/devices',
              '/robotic-therapy/progress/:id',
            ],
          },
          {
            id: 'adaptive-sports',
            nameAr: 'الرياضة التكيفية',
            nameEn: 'Adaptive Sports Therapy',
            category: 'specialized',
            description: 'رياضات بارا-أولمبية وأنشطة بدنية مكيّفة للقدرات الخاصة',
            endpoints: [
              '/adaptive-sports/assess',
              '/adaptive-sports/plan',
              '/adaptive-sports/session',
              '/adaptive-sports/achievement',
              '/adaptive-sports/progress/:id',
            ],
          },
          {
            id: 'learning-disabilities',
            nameAr: 'علاج صعوبات التعلم',
            nameEn: 'Learning Disabilities Therapy',
            category: 'specialized',
            description: 'علاج عسر القراءة والكتابة والحساب واضطرابات المعالجة',
            endpoints: [
              '/learning-disabilities/assess',
              '/learning-disabilities/plan',
              '/learning-disabilities/session',
              '/learning-disabilities/quick-assessment',
              '/learning-disabilities/progress/:id',
            ],
          },
          // ── Wired existing support services ──
          {
            id: 'tele-rehabilitation',
            nameAr: 'التأهيل عن بُعد',
            nameEn: 'Tele-Rehabilitation',
            category: 'support',
            description: 'جلسات تأهيل عن بُعد بالفيديو ومتابعة التمارين المنزلية',
            endpoints: [
              '/tele-rehab/session',
              '/tele-rehab/start/:id',
              '/tele-rehab/end/:id',
              '/tele-rehab/prescription',
              '/tele-rehab/exercise-progress',
              '/tele-rehab/report/:id',
            ],
          },
          {
            id: 'early-intervention',
            nameAr: 'التدخل المبكر',
            nameEn: 'Early Intervention',
            category: 'support',
            description: 'كشف وتدخل مبكر للأطفال دون سن السادسة',
            endpoints: [
              '/early-intervention/register',
              '/early-intervention/screening',
              '/early-intervention/plan',
              '/early-intervention/session',
              '/early-intervention/report/:id',
            ],
          },
          {
            id: 'family-support',
            nameAr: 'دعم الأسرة',
            nameEn: 'Family Support',
            category: 'support',
            description: 'إرشاد أسري وبرامج تدريب الأسر ودعم نفسي لأسر المستفيدين',
            endpoints: [
              '/family-support/register',
              '/family-support/assess',
              '/family-support/counseling',
              '/family-support/training',
              '/family-support/resources',
            ],
          },
          {
            id: 'community-integration',
            nameAr: 'الدمج المجتمعي',
            nameEn: 'Community Integration',
            category: 'support',
            description: 'برامج دمج المستفيدين في المجتمع وبناء شراكات مجتمعية',
            endpoints: [
              '/community-integration/program',
              '/community-integration/enroll',
              '/community-integration/attendance',
              '/community-integration/assess',
              '/community-integration/report/:id',
            ],
          },
          {
            id: 'assistive-technology',
            nameAr: 'التقنيات المساعدة',
            nameEn: 'Assistive Technology',
            category: 'support',
            description: 'تقييم وتوزيع وصيانة الأجهزة والتقنيات المساعدة',
            endpoints: [
              '/assistive-tech/assess',
              '/assistive-tech/allocate',
              '/assistive-tech/training',
              '/assistive-tech/maintenance',
              '/assistive-tech/devices',
              '/assistive-tech/report/:id',
            ],
          },
          {
            id: 'case-management',
            nameAr: 'إدارة الحالات',
            nameEn: 'Case Management',
            category: 'support',
            description: 'تنسيق خدمات المستفيدين وإدارة الملفات ومتابعة الأهداف',
            endpoints: [
              '/case-management/create',
              '/case-management/assign-team',
              '/case-management/update-status',
              '/case-management/note',
              '/case-management/report/:id',
              '/case-management/dashboard',
            ],
          },
          {
            id: 'special-education',
            nameAr: 'التربية الخاصة',
            nameEn: 'Special Education',
            category: 'support',
            description: 'خطط تعليمية فردية (IEP) وفصول تربية خاصة وخطط انتقال',
            endpoints: [
              '/special-education/enroll',
              '/special-education/iep',
              '/special-education/goal',
              '/special-education/progress',
              '/special-education/transition-plan',
              '/special-education/iep-report/:id',
            ],
          },
          {
            id: 'residential-rehabilitation',
            nameAr: 'التأهيل السكني',
            nameEn: 'Residential Rehabilitation',
            category: 'support',
            description: 'خدمات إقامة داخلية وخطط رعاية وإدارة الأنشطة اليومية',
            endpoints: [
              '/residential-rehab/admission',
              '/residential-rehab/assess',
              '/residential-rehab/care-plan',
              '/residential-rehab/daily-activity',
              '/residential-rehab/incident',
              '/residential-rehab/family-visit',
              '/residential-rehab/report/:id',
            ],
          },
        ],
        features: [
          {
            id: 'smart-scheduling',
            nameAr: 'المواعيد الذكية',
            nameEn: 'Smart Scheduling',
            description: 'جدولة ذكية مع كشف التعارضات وقوائم الانتظار والتذكيرات',
            endpoints: [
              '/scheduling/appointment',
              '/scheduling/cancel/:id',
              '/scheduling/therapist/:id',
              '/scheduling/beneficiary/:id',
              '/scheduling/waitlist',
              '/scheduling/stats',
            ],
          },
          {
            id: 'satisfaction-feedback',
            nameAr: 'رضا المستفيدين',
            nameEn: 'Satisfaction & Feedback',
            description: 'استبيانات رضا وشكاوى ومقترحات وتحليلات NPS',
            endpoints: [
              '/satisfaction/survey',
              '/satisfaction/response/:id',
              '/satisfaction/complaint',
              '/satisfaction/suggestion',
              '/satisfaction/report',
              '/satisfaction/dashboard',
            ],
          },
          {
            id: 'ai-assessment',
            nameAr: 'التقييم بالذكاء الاصطناعي',
            nameEn: 'AI-Powered Assessment',
            description: 'تقييم ذكي وتوقع النتائج وتحليل المخاطر وتوصيات شخصية',
            endpoints: [
              '/ai-assessment/conduct',
              '/ai-assessment/predict',
              '/ai-assessment/risk/:id',
              '/ai-assessment/trends/:id',
              '/ai-assessment/report/:id',
            ],
          },
          {
            id: 'alerts-notifications',
            nameAr: 'التنبيهات والإشعارات',
            nameEn: 'Alerts & Notifications',
            description: 'تنبيهات تراجع ومعالم مهمة وغياب وطوارئ وتفضيلات إشعارات',
            endpoints: [
              '/alerts/create',
              '/alerts/analyze-session',
              '/alerts',
              '/alerts/read/:id',
              '/alerts/resolve/:id',
              '/alerts/report',
              '/alerts/preferences',
            ],
          },
          {
            id: 'therapist-dashboard',
            nameAr: 'لوحة تحكم المعالج',
            nameEn: 'Therapist Dashboard',
            description: 'لوحة مراقبة أداء المعالجين وعبء العمل وأهداف الأداء',
            endpoints: [
              '/therapist-dashboard/register',
              '/therapist-dashboard/assign',
              '/therapist-dashboard/performance',
              '/therapist-dashboard/:id',
              '/therapist-dashboard/team/report',
              '/therapist-dashboard/goal',
            ],
          },
        ],
        phase7Services: [
          {
            id: 'advanced-physical-therapy',
            nameAr: 'العلاج الطبيعي المتقدم',
            nameEn: 'Advanced Physical Therapy',
            category: 'advancedTherapy',
            description: 'خطط علاجية متقدمة للشلل الدماغي والسكتة وإصابات الحبل الشوكي',
            endpoints: [
              '/advanced-physical-therapy/plan',
              '/advanced-physical-therapy/session',
              '/advanced-physical-therapy/plan/:id',
              '/advanced-physical-therapy/progress/:id',
            ],
          },
          {
            id: 'advanced-psychological',
            nameAr: 'الدعم النفسي المتقدم',
            nameEn: 'Advanced Psychological Support',
            category: 'advancedTherapy',
            description: 'علاج سلوكي معرفي وجلسات جماعية وتدخل في الأزمات',
            endpoints: [
              '/advanced-psychological/assess',
              '/advanced-psychological/session',
              '/advanced-psychological/group-session',
              '/advanced-psychological/crisis',
              '/advanced-psychological/progress/:id',
            ],
          },
          {
            id: 'advanced-speech',
            nameAr: 'التخاطب المتقدم',
            nameEn: 'Advanced Speech Therapy',
            category: 'advancedTherapy',
            description: 'تقييم نطق متقدم وإعداد أنظمة التواصل البديل (AAC)',
            endpoints: [
              '/advanced-speech/assess',
              '/advanced-speech/session',
              '/advanced-speech/aac',
              '/advanced-speech/progress/:id',
            ],
          },
          {
            id: 'advanced-vocational',
            nameAr: 'التأهيل المهني المتقدم',
            nameEn: 'Advanced Vocational Rehabilitation',
            category: 'advancedTherapy',
            description: 'تقييم قدرات مهنية وتعديلات مكان العمل ومتابعة تدريب',
            endpoints: [
              '/advanced-vocational/assess',
              '/advanced-vocational/plan',
              '/advanced-vocational/accommodations',
              '/advanced-vocational/progress',
            ],
          },
          {
            id: 'advanced-early-intervention',
            nameAr: 'التدخل المبكر المتقدم',
            nameEn: 'Advanced Early Intervention',
            category: 'advancedTherapy',
            description: 'فحص نمائي وتدريب أسري متقدم ومتابعة تطورية',
            endpoints: [
              '/advanced-early-intervention/screening',
              '/advanced-early-intervention/family-training',
              '/advanced-early-intervention/progress',
              '/advanced-early-intervention/report/:id',
            ],
          },
          {
            id: 'advanced-family-support',
            nameAr: 'دعم الأسرة المتقدم',
            nameEn: 'Advanced Family Support',
            category: 'advancedTherapy',
            description: 'إرشاد أسري متقدم وتدريب مقدمي الرعاية ورعاية مؤقتة ومجموعات دعم',
            endpoints: [
              '/advanced-family-support/profile',
              '/advanced-family-support/counseling',
              '/advanced-family-support/caregiver-training',
              '/advanced-family-support/respite-care',
              '/advanced-family-support/support-group',
              '/advanced-family-support/caregiver-burden',
              '/advanced-family-support/report/:id',
            ],
          },
          {
            id: 'disability-certification',
            nameAr: 'شهادة الإعاقة',
            nameEn: 'Disability Certification',
            category: 'governmentAndCertification',
            description: 'تصنيف وتوثيق الإعاقة وإصدار الشهادات والتجديد والتحقق',
            endpoints: [
              '/disability-certification/request',
              '/disability-certification/assess',
              '/disability-certification/issue',
              '/disability-certification/renew',
              '/disability-certification/verify/:id',
            ],
          },
          {
            id: 'saudi-benefits',
            nameAr: 'الضمان الاجتماعي السعودي',
            nameEn: 'Saudi Social Benefits',
            category: 'governmentAndCertification',
            description: 'التحقق من الأهلية وتقديم طلبات الضمان والدفعات والتقارير الشهرية',
            endpoints: [
              '/saudi-benefits/eligibility',
              '/saudi-benefits/apply',
              '/saudi-benefits/review',
              '/saudi-benefits/payment',
              '/saudi-benefits/active/:id',
              '/saudi-benefits/renew',
              '/saudi-benefits/monthly-report',
            ],
          },
          {
            id: 'rehabilitation-plan',
            nameAr: 'خطة التأهيل الفردية',
            nameEn: 'Individualized Rehabilitation Plan',
            category: 'planningAndMetrics',
            description: 'خطط تأهيل شاملة وأهداف وخدمات ومراجعات وبنك أهداف',
            endpoints: [
              '/rehabilitation-plan/create',
              '/rehabilitation-plan/goal',
              '/rehabilitation-plan/service',
              '/rehabilitation-plan/review',
              '/rehabilitation-plan/:id',
              '/rehabilitation-plan/templates/list',
              '/rehabilitation-plan/goals-bank',
            ],
          },
          {
            id: 'rehab-metrics',
            nameAr: 'المقاييس المعيارية',
            nameEn: 'Rehabilitation Metrics',
            category: 'planningAndMetrics',
            description: 'مقاييس نفسية وحركية واجتماعية معتمدة مع تحليل ومقارنة',
            endpoints: [
              '/rehab-metrics/administer',
              '/rehab-metrics/available',
              '/rehab-metrics/compare',
              '/rehab-metrics/profile',
            ],
          },
          {
            id: 'rehab-reports',
            nameAr: 'التقارير المتقدمة',
            nameEn: 'Advanced Reports',
            category: 'planningAndMetrics',
            description: 'تقارير تقدم فردية وإحصائيات المركز ونتائج وامتثال وتقارير مخصصة',
            endpoints: [
              '/rehab-reports/individual/:id',
              '/rehab-reports/center/:id',
              '/rehab-reports/outcomes',
              '/rehab-reports/compliance',
              '/rehab-reports/custom',
              '/rehab-reports/export',
              '/rehab-reports/list',
            ],
          },
          {
            id: 'speech-activities',
            nameAr: 'أنشطة النطق العربي',
            nameEn: 'Speech Therapy Activities',
            category: 'speechActivitiesAndAssessment',
            description: 'تقييم مخارج الحروف العربية وأنشطة علاجية وتسجيل أداء',
            endpoints: [
              '/speech-activities/consonants',
              '/speech-activities/vowels',
              '/speech-activities/articulation',
              '/speech-activities/activity',
              '/speech-activities/performance',
              '/speech-activities/recommended/:id',
              '/speech-activities/progress/:id',
            ],
          },
          {
            id: 'unified-assessment',
            nameAr: 'التقييم الموحد',
            nameEn: 'Unified Assessment',
            category: 'speechActivitiesAndAssessment',
            description: 'تقييم أولي شامل متعدد المجالات وتقييم متابعة',
            endpoints: [
              '/unified-assessment/initial',
              '/unified-assessment/follow-up',
              '/unified-assessment/report/:id',
            ],
          },
        ],
        phase8Services: [
          {
            id: 'behavioral-therapy',
            nameAr: 'العلاج السلوكي',
            nameEn: 'Behavioral Therapy',
            category: 'behavioralAndPain',
            description: 'تحليل السلوك الوظيفي وخطط التدخل السلوكي وإدارة المكافآت',
            endpoints: [
              '/behavioral-therapy/fba',
              '/behavioral-therapy/bip',
              '/behavioral-therapy/session',
              '/behavioral-therapy/incident',
              '/behavioral-therapy/reward',
              '/behavioral-therapy/progress/:id',
            ],
          },
          {
            id: 'pain-management',
            nameAr: 'إدارة الألم',
            nameEn: 'Pain Management',
            category: 'behavioralAndPain',
            description: 'تقييم الألم وخطط العلاج ويوميات الألم والتقارير',
            endpoints: [
              '/pain-management/assess',
              '/pain-management/plan',
              '/pain-management/session',
              '/pain-management/diary',
              '/pain-management/report/:id',
            ],
          },
          {
            id: 'sleep-therapy',
            nameAr: 'علاج اضطرابات النوم',
            nameEn: 'Sleep Therapy',
            category: 'sleepAndSocial',
            description: 'تقييم النوم وخطط العلاج ويوميات النوم',
            endpoints: [
              '/sleep-therapy/assess',
              '/sleep-therapy/plan',
              '/sleep-therapy/diary',
              '/sleep-therapy/session',
              '/sleep-therapy/report/:id',
            ],
          },
          {
            id: 'social-skills-training',
            nameAr: 'تدريب المهارات الاجتماعية',
            nameEn: 'Social Skills Training',
            category: 'sleepAndSocial',
            description: 'تقييم وتدريب المهارات الاجتماعية والمجموعات العلاجية',
            endpoints: [
              '/social-skills/assess',
              '/social-skills/program',
              '/social-skills/session',
              '/social-skills/group',
              '/social-skills/progress/:id',
            ],
          },
          {
            id: 'parental-training',
            nameAr: 'تدريب الوالدين',
            nameEn: 'Parental Training',
            category: 'parentalAndTransition',
            description: 'تسجيل ولي الأمر وجلسات تدريبية وشهادات إتمام',
            endpoints: [
              '/parental-training/enroll',
              '/parental-training/session',
              '/parental-training/assess',
              '/parental-training/certificate',
              '/parental-training/modules',
              '/parental-training/report/:enrollmentId',
            ],
          },
          {
            id: 'transition-planning',
            nameAr: 'التخطيط الانتقالي',
            nameEn: 'Transition Planning',
            category: 'parentalAndTransition',
            description: 'تقييم الجاهزية وخطط الانتقال والإنجازات والمراجعات',
            endpoints: [
              '/transition-planning/assess',
              '/transition-planning/plan',
              '/transition-planning/milestone',
              '/transition-planning/review',
              '/transition-planning/report/:id',
            ],
          },
          {
            id: 'quality-assurance',
            nameAr: 'ضمان الجودة',
            nameEn: 'Quality Assurance',
            category: 'qualityAndPortal',
            description: 'التدقيق والحوادث وخطط التحسين ومؤشرات الأداء',
            endpoints: [
              '/quality-assurance/audit',
              '/quality-assurance/incident',
              '/quality-assurance/improvement',
              '/quality-assurance/kpi',
              '/quality-assurance/standards',
              '/quality-assurance/report',
            ],
          },
          {
            id: 'beneficiary-portal',
            nameAr: 'بوابة المستفيد',
            nameEn: 'Beneficiary Portal',
            category: 'qualityAndPortal',
            description: 'إدارة ملف شخصي ومواعيد ورسائل ومستندات وأهداف',
            endpoints: [
              '/beneficiary-portal/profile',
              '/beneficiary-portal/dashboard/:id',
              '/beneficiary-portal/appointment',
              '/beneficiary-portal/message',
              '/beneficiary-portal/document',
              '/beneficiary-portal/goal',
              '/beneficiary-portal/feedback',
              '/beneficiary-portal/documents/:id',
            ],
          },
        ],
        phase9Services: [
          {
            id: 'wheelchair-mobility',
            nameAr: 'خدمات الكراسي المتحركة والتنقل',
            nameEn: 'Wheelchair & Mobility Services',
            category: 'mobilityAndSensory',
            description: 'تقييم احتياجات التنقل ووصف الأجهزة وتدريب الاستخدام والصيانة',
            endpoints: [
              '/wheelchair-mobility/assess',
              '/wheelchair-mobility/prescribe',
              '/wheelchair-mobility/training',
              '/wheelchair-mobility/maintenance',
              '/wheelchair-mobility/report/:id',
            ],
          },
          {
            id: 'hearing-rehabilitation',
            nameAr: 'التأهيل السمعي',
            nameEn: 'Hearing Rehabilitation',
            category: 'mobilityAndSensory',
            description: 'تقييم السمع ووصف السماعات وجلسات التأهيل وخطط التواصل',
            endpoints: [
              '/hearing-rehab/assess',
              '/hearing-rehab/prescribe',
              '/hearing-rehab/session',
              '/hearing-rehab/communication-plan',
              '/hearing-rehab/report/:id',
            ],
          },
          {
            id: 'visual-rehabilitation',
            nameAr: 'التأهيل البصري',
            nameEn: 'Visual Rehabilitation',
            category: 'mobilityAndSensory',
            description: 'تقييم البصر ووصف المعينات البصرية وتدريب التوجه والحياة اليومية',
            endpoints: [
              '/visual-rehab/assess',
              '/visual-rehab/prescribe',
              '/visual-rehab/orientation',
              '/visual-rehab/daily-living',
              '/visual-rehab/report/:id',
            ],
          },
          {
            id: 'chronic-disease-rehabilitation',
            nameAr: 'تأهيل الأمراض المزمنة',
            nameEn: 'Chronic Disease Rehabilitation',
            category: 'chronicAndGroup',
            description: 'تقييم الحالات المزمنة وبرامج التأهيل وتسجيل العلامات الحيوية',
            endpoints: [
              '/chronic-disease/assess',
              '/chronic-disease/program',
              '/chronic-disease/session',
              '/chronic-disease/vitals',
              '/chronic-disease/report/:id',
            ],
          },
          {
            id: 'group-therapy',
            nameAr: 'إدارة العلاج الجماعي',
            nameEn: 'Group Therapy Management',
            category: 'chronicAndGroup',
            description: 'إنشاء المجموعات العلاجية وتسجيل الأعضاء والجلسات والتفاعلات',
            endpoints: [
              '/group-therapy/create',
              '/group-therapy/enroll',
              '/group-therapy/session',
              '/group-therapy/interaction',
              '/group-therapy/report/:groupId',
            ],
          },
          {
            id: 'home-based-rehabilitation',
            nameAr: 'التأهيل المنزلي',
            nameEn: 'Home-Based Rehabilitation',
            category: 'homeAndEmergency',
            description: 'تقييم البيئة المنزلية وجدولة الزيارات وطلب التعديلات وبرامج التأهيل',
            endpoints: [
              '/home-rehab/assess',
              '/home-rehab/visit',
              '/home-rehab/visit-results',
              '/home-rehab/modification',
              '/home-rehab/program',
              '/home-rehab/report/:id',
            ],
          },
          {
            id: 'emergency-rehabilitation',
            nameAr: 'التأهيل الطارئ',
            nameEn: 'Emergency Rehabilitation',
            category: 'homeAndEmergency',
            description: 'فرز الحالات الطارئة والجلسات العاجلة والبروتوكولات والإحالات',
            endpoints: [
              '/emergency-rehab/triage',
              '/emergency-rehab/session',
              '/emergency-rehab/protocols',
              '/emergency-rehab/referral',
              '/emergency-rehab/report/:id',
            ],
          },
          {
            id: 'volunteer-management',
            nameAr: 'إدارة المتطوعين',
            nameEn: 'Volunteer Management',
            category: 'volunteerAndResearch',
            description: 'تسجيل المتطوعين وتوزيع المهام وتسجيل الساعات والتقييم والشهادات',
            endpoints: [
              '/volunteers/register',
              '/volunteers/assign',
              '/volunteers/hours',
              '/volunteers/evaluate',
              '/volunteers/certificate',
              '/volunteers/report/:volunteerId',
            ],
          },
          {
            id: 'research-studies',
            nameAr: 'الدراسات والأبحاث',
            nameEn: 'Research Studies',
            category: 'volunteerAndResearch',
            description: 'إنشاء الدراسات وتسجيل المشاركين وجمع البيانات والتحليل والنشر',
            endpoints: [
              '/research/study',
              '/research/participant',
              '/research/data',
              '/research/analyze/:studyId',
              '/research/publication',
              '/research/report/:studyId',
            ],
          },
        ],
      },
    });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

// ==================== تقرير شامل ====================

router.get('/comprehensive-report/:beneficiaryId', async (req, res) => {
  try {
    const beneficiaryId = req.params.beneficiaryId;

    const [
      physical,
      occupational,
      speech,
      psychological,
      vocational,
      art,
      music,
      hydro,
      aba,
      cognitive,
      sensory,
      animal,
      nutrition,
      vr,
      play,
      robotic,
      adaptiveSport,
      learningDisab,
      teleRehab,
      earlyIntv,
      familySup,
      communityIntg,
      assistiveTech,
      caseMgmt,
      specialEd,
      residentialRehab,
      aiReport,
      alertsReport,
      therapistTeam,
      advPhysical,
      advPsychological,
      advSpeech,
      advEarlyIntv,
      advFamilySup,
      speechAct,
      unifiedAssess,
      behavioralReport,
      painReport,
      sleepReport,
      socialSkillsReport,
      parentalReport,
      transitionReport,
      qaReport,
      portalReport,
      wheelchairReport,
      hearingReport,
      visualReport,
      chronicReport,
      groupReport,
      homeReport,
      emergencyReport,
      volunteerReport,
      researchReport,
    ] = await Promise.all([
      physicalTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Physical therapy report failed:', err.message);
        return null;
      }),
      occupationalTherapy.getPerformanceReport(beneficiaryId).catch(err => {
        logger.warn('Occupational therapy report failed:', err.message);
        return null;
      }),
      speechTherapy.getSpeechProgressReport(beneficiaryId).catch(err => {
        logger.warn('Speech therapy report failed:', err.message);
        return null;
      }),
      psychologicalSupport.getPsychologicalProgressReport(beneficiaryId).catch(err => {
        logger.warn('Psychological support report failed:', err.message);
        return null;
      }),
      vocationalRehabilitation.getVocationalProgressReport(beneficiaryId).catch(err => {
        logger.warn('Vocational rehab report failed:', err.message);
        return null;
      }),
      artTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Art therapy report failed:', err.message);
        return null;
      }),
      musicTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Music therapy report failed:', err.message);
        return null;
      }),
      hydrotherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Hydrotherapy report failed:', err.message);
        return null;
      }),
      abaTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('ABA therapy report failed:', err.message);
        return null;
      }),
      cognitiveRehab.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Cognitive rehab report failed:', err.message);
        return null;
      }),
      sensoryIntegration.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Sensory integration report failed:', err.message);
        return null;
      }),
      animalTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Animal therapy report failed:', err.message);
        return null;
      }),
      therapeuticNutrition.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Nutrition report failed:', err.message);
        return null;
      }),
      vrTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('VR therapy report failed:', err.message);
        return null;
      }),
      playTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Play therapy report failed:', err.message);
        return null;
      }),
      roboticTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Robotic therapy report failed:', err.message);
        return null;
      }),
      adaptiveSports.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Adaptive sports report failed:', err.message);
        return null;
      }),
      learningDisabilities.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Learning disabilities report failed:', err.message);
        return null;
      }),
      teleRehab.getReport(beneficiaryId).catch(err => {
        logger.warn('Tele-rehabilitation report failed:', err.message);
        return null;
      }),
      earlyIntervention.getReport(beneficiaryId).catch(err => {
        logger.warn('Early intervention report failed:', err.message);
        return null;
      }),
      familySupport.getResources(beneficiaryId).catch(err => {
        logger.warn('Family support report failed:', err.message);
        return null;
      }),
      communityIntegration.getReport(beneficiaryId).catch(err => {
        logger.warn('Community integration report failed:', err.message);
        return null;
      }),
      assistiveTech.getReport(beneficiaryId).catch(err => {
        logger.warn('Assistive technology report failed:', err.message);
        return null;
      }),
      caseManagement.getReport(beneficiaryId).catch(err => {
        logger.warn('Case management report failed:', err.message);
        return null;
      }),
      specialEducation.getIEPReport(beneficiaryId).catch(err => {
        logger.warn('Special education report failed:', err.message);
        return null;
      }),
      residentialRehab.getReport(beneficiaryId).catch(err => {
        logger.warn('Residential rehab report failed:', err.message);
        return null;
      }),
      aiAssessment.getAIReport(beneficiaryId).catch(err => {
        logger.warn('AI assessment report failed:', err.message);
        return null;
      }),
      alertsNotifications.getAlertsReport({ beneficiaryId }).catch(err => {
        logger.warn('Alerts report failed:', err.message);
        return null;
      }),
      therapistDashboard.getTeamReport().catch(err => {
        logger.warn('Therapist team report failed:', err.message);
        return null;
      }),
      advancedPhysicalTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Advanced physical therapy report failed:', err.message);
        return null;
      }),
      advancedPsychologicalSupport.getPsychologicalProgressReport(beneficiaryId).catch(err => {
        logger.warn('Advanced psychological report failed:', err.message);
        return null;
      }),
      advancedSpeechTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Advanced speech therapy report failed:', err.message);
        return null;
      }),
      advancedEarlyIntervention.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Advanced early intervention report failed:', err.message);
        return null;
      }),
      advancedFamilySupport.getFamilySupportReport(beneficiaryId).catch(err => {
        logger.warn('Advanced family support report failed:', err.message);
        return null;
      }),
      speechActivities.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Speech activities report failed:', err.message);
        return null;
      }),
      unifiedAssessment.getAssessmentReport(beneficiaryId).catch(err => {
        logger.warn('Unified assessment report failed:', err.message);
        return null;
      }),
      behavioralTherapy.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Behavioral therapy report failed:', err.message);
        return null;
      }),
      painManagement.getPainReport(beneficiaryId).catch(err => {
        logger.warn('Pain management report failed:', err.message);
        return null;
      }),
      sleepTherapy.getSleepReport(beneficiaryId).catch(err => {
        logger.warn('Sleep therapy report failed:', err.message);
        return null;
      }),
      socialSkillsTraining.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Social skills report failed:', err.message);
        return null;
      }),
      parentalTraining.getProgressReport(beneficiaryId).catch(err => {
        logger.warn('Parental training report failed:', err.message);
        return null;
      }),
      transitionPlanning.getTransitionReport(beneficiaryId).catch(err => {
        logger.warn('Transition planning report failed:', err.message);
        return null;
      }),
      qualityAssurance.getQualityReport({ beneficiaryId }).catch(err => {
        logger.warn('Quality assurance report failed:', err.message);
        return null;
      }),
      beneficiaryPortal.getDashboard(beneficiaryId).catch(err => {
        logger.warn('Beneficiary portal report failed:', err.message);
        return null;
      }),
      wheelchairMobility.getMobilityReport(beneficiaryId).catch(err => {
        logger.warn('Wheelchair mobility report failed:', err.message);
        return null;
      }),
      hearingRehab.getHearingReport(beneficiaryId).catch(err => {
        logger.warn('Hearing rehabilitation report failed:', err.message);
        return null;
      }),
      visualRehab.getVisionReport(beneficiaryId).catch(err => {
        logger.warn('Visual rehabilitation report failed:', err.message);
        return null;
      }),
      chronicDiseaseRehab.getChronicReport(beneficiaryId).catch(err => {
        logger.warn('Chronic disease rehab report failed:', err.message);
        return null;
      }),
      groupTherapy.getGroupReport(beneficiaryId).catch(err => {
        logger.warn('Group therapy report failed:', err.message);
        return null;
      }),
      homeBasedRehab.getHomeRehabReport(beneficiaryId).catch(err => {
        logger.warn('Home-based rehab report failed:', err.message);
        return null;
      }),
      emergencyRehab.getEmergencyReport(beneficiaryId).catch(err => {
        logger.warn('Emergency rehab report failed:', err.message);
        return null;
      }),
      volunteerManagement.getVolunteerReport(beneficiaryId).catch(err => {
        logger.warn('Volunteer management report failed:', err.message);
        return null;
      }),
      researchStudies.getResearchReport(beneficiaryId).catch(err => {
        logger.warn('Research studies report failed:', err.message);
        return null;
      }),
    ]);

    res.json({
      success: true,
      data: {
        beneficiaryId,
        reportDate: new Date(),
        version: '9.0.0',
        coreTherapy: {
          physicalTherapy: physical,
          occupationalTherapy: occupational,
          speechTherapy: speech,
          psychologicalSupport: psychological,
          vocationalRehabilitation: vocational,
        },
        specializedTherapy: {
          artTherapy: art,
          musicTherapy: music,
          hydrotherapy: hydro,
          abaTherapy: aba,
          cognitiveRehabilitation: cognitive,
          sensoryIntegration: sensory,
          animalAssistedTherapy: animal,
          therapeuticNutrition: nutrition,
          vrTherapy: vr,
          playTherapy: play,
          roboticTherapy: robotic,
          adaptiveSports: adaptiveSport,
          learningDisabilities: learningDisab,
        },
        supportServices: {
          teleRehabilitation: teleRehab,
          earlyIntervention: earlyIntv,
          familySupport: familySup,
          communityIntegration: communityIntg,
          assistiveTechnology: assistiveTech,
          caseManagement: caseMgmt,
          specialEducation: specialEd,
          residentialRehabilitation: residentialRehab,
        },
        advancedTherapy: {
          advancedPhysicalTherapy: advPhysical,
          advancedPsychologicalSupport: advPsychological,
          advancedSpeechTherapy: advSpeech,
          advancedEarlyIntervention: advEarlyIntv,
          advancedFamilySupport: advFamilySup,
        },
        assessmentAndActivities: {
          speechActivities: speechAct,
          unifiedAssessment: unifiedAssess,
        },
        advancedFeatures: {
          aiAssessment: aiReport,
          alertsNotifications: alertsReport,
          therapistTeam: therapistTeam,
        },
        phase8Services: {
          behavioralTherapy: behavioralReport,
          painManagement: painReport,
          sleepTherapy: sleepReport,
          socialSkillsTraining: socialSkillsReport,
          parentalTraining: parentalReport,
          transitionPlanning: transitionReport,
          qualityAssurance: qaReport,
          beneficiaryPortal: portalReport,
        },
        phase9Services: {
          wheelchairMobility: wheelchairReport,
          hearingRehabilitation: hearingReport,
          visualRehabilitation: visualReport,
          chronicDiseaseRehab: chronicReport,
          groupTherapy: groupReport,
          homeBasedRehab: homeReport,
          emergencyRehab: emergencyReport,
          volunteerManagement: volunteerReport,
          researchStudies: researchReport,
        },
        overallProgress: {
          physical: physical?.overallProgress || 0,
          functional: occupational?.overallPerformance || 0,
          communication: speech?.averagePerformance || 0,
          psychological: psychological?.overallWellbeing?.score || 0,
          vocational: vocational?.employmentStatus?.employed ? 100 : 0,
          artTherapy: art?.overallProgress || 0,
          musicTherapy: music?.overallProgress || 0,
          hydrotherapy: hydro?.overallProgress || 0,
          abaTherapy: aba?.overallProgress || 0,
          cognitive: cognitive?.overallProgress || 0,
          sensory: sensory?.overallProgress || 0,
          animalTherapy: animal?.overallProgress || 0,
          nutrition: nutrition?.overallProgress || 0,
          vrTherapy: vr?.overallProgress || 0,
          playTherapy: play?.overallProgress || 0,
          roboticTherapy: robotic?.overallProgress || 0,
          adaptiveSports: adaptiveSport?.overallProgress || 0,
          learningDisabilities: learningDisab?.overallProgress || 0,
          behavioralTherapy: behavioralReport?.overallProgress || 0,
          painManagement: painReport?.overallProgress || 0,
          sleepTherapy: sleepReport?.overallProgress || 0,
          socialSkills: socialSkillsReport?.overallProgress || 0,
          parentalTraining: parentalReport?.overallProgress || 0,
          transitionPlanning: transitionReport?.overallProgress || 0,
          wheelchairMobility: wheelchairReport?.overallProgress || 0,
          hearingRehab: hearingReport?.overallProgress || 0,
          visualRehab: visualReport?.overallProgress || 0,
          chronicDisease: chronicReport?.overallProgress || 0,
          groupTherapy: groupReport?.overallProgress || 0,
          homeRehab: homeReport?.overallProgress || 0,
          emergencyRehab: emergencyReport?.overallProgress || 0,
          volunteerMgmt: volunteerReport?.overallProgress || 0,
          research: researchReport?.overallProgress || 0,
        },
      },
    });
  } catch (error) {
    safeError(res, error, 'rehabilitation');
  }
});

module.exports = router;
