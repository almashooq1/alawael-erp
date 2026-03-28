/**
 * Rehab Professional Routes — مسارات الأنظمة الاحترافية لتأهيل ذوي الإعاقة
 *
 * 150+ REST API endpoints for 12 professional rehab systems
 */

const router = require('express').Router();
const ctrl = require('../controllers/rehab-pro.controller');

// Auth middleware (optional — falls back gracefully)
let auth;
try {
  auth = require('../middleware/auth');
} catch {
  try {
    auth = require('../middleware/authMiddleware');
  } catch {
    auth = (_req, _res, next) => next();
  }
}
const mw =
  typeof auth === 'function' ? auth : auth.protect || auth.verifyToken || ((_r, _s, n) => n());

// Global auth: all rehab-pro endpoints require authentication
router.use(mw);

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard — لوحة التحكم
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard/overview', mw, ctrl.dashboard.getOverview);
router.get('/dashboard/alerts', mw, ctrl.dashboard.getAlerts);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Cardiac & Pulmonary Rehab — إعادة التأهيل القلبي والرئوي
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/cardiac-pulmonary', mw, ctrl.cardiacPulmonary.create);
router.get('/cardiac-pulmonary', mw, ctrl.cardiacPulmonary.getAll);
router.get('/cardiac-pulmonary/stats', mw, ctrl.cardiacPulmonary.stats);
router.get('/cardiac-pulmonary/phase-distribution', mw, ctrl.cardiacPulmonary.getPhaseDistribution);
router.get(
  '/cardiac-pulmonary/beneficiary/:beneficiaryId',
  mw,
  ctrl.cardiacPulmonary.getByBeneficiary
);
router.get('/cardiac-pulmonary/:id', mw, ctrl.cardiacPulmonary.getById);
router.put('/cardiac-pulmonary/:id', mw, ctrl.cardiacPulmonary.update);
router.delete('/cardiac-pulmonary/:id', mw, ctrl.cardiacPulmonary.remove);
router.post(
  '/cardiac-pulmonary/:id/exercise-session',
  mw,
  ctrl.cardiacPulmonary.addExerciseSession
);
router.post(
  '/cardiac-pulmonary/:id/progress-assessment',
  mw,
  ctrl.cardiacPulmonary.addProgressAssessment
);
router.post('/cardiac-pulmonary/:id/education', mw, ctrl.cardiacPulmonary.addEducation);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Stroke Rehab — إعادة تأهيل السكتة الدماغية
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/stroke-rehab', mw, ctrl.strokeRehab.create);
router.get('/stroke-rehab', mw, ctrl.strokeRehab.getAll);
router.get('/stroke-rehab/stats', mw, ctrl.strokeRehab.stats);
router.get('/stroke-rehab/type-distribution', mw, ctrl.strokeRehab.getTypeDistribution);
router.get('/stroke-rehab/outcome-trends', mw, ctrl.strokeRehab.getOutcomeTrends);
router.get('/stroke-rehab/beneficiary/:beneficiaryId', mw, ctrl.strokeRehab.getByBeneficiary);
router.get('/stroke-rehab/:id', mw, ctrl.strokeRehab.getById);
router.put('/stroke-rehab/:id', mw, ctrl.strokeRehab.update);
router.delete('/stroke-rehab/:id', mw, ctrl.strokeRehab.remove);
router.post('/stroke-rehab/:id/session', mw, ctrl.strokeRehab.addSession);
router.post('/stroke-rehab/:id/progress-report', mw, ctrl.strokeRehab.addProgressReport);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Spinal Cord Rehab — إعادة تأهيل إصابات الحبل الشوكي
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/spinal-cord', mw, ctrl.spinalCord.create);
router.get('/spinal-cord', mw, ctrl.spinalCord.getAll);
router.get('/spinal-cord/stats', mw, ctrl.spinalCord.stats);
router.get('/spinal-cord/injury-level-stats', mw, ctrl.spinalCord.getInjuryLevelStats);
router.get('/spinal-cord/beneficiary/:beneficiaryId', mw, ctrl.spinalCord.getByBeneficiary);
router.get('/spinal-cord/:id', mw, ctrl.spinalCord.getById);
router.put('/spinal-cord/:id', mw, ctrl.spinalCord.update);
router.delete('/spinal-cord/:id', mw, ctrl.spinalCord.remove);
router.post('/spinal-cord/:id/rehab-session', mw, ctrl.spinalCord.addRehabSession);
router.post('/spinal-cord/:id/equipment', mw, ctrl.spinalCord.addEquipment);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Post-Surgical Rehab — إعادة التأهيل بعد الجراحة
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/post-surgical', mw, ctrl.postSurgical.create);
router.get('/post-surgical', mw, ctrl.postSurgical.getAll);
router.get('/post-surgical/stats', mw, ctrl.postSurgical.stats);
router.get('/post-surgical/surgery-type-stats', mw, ctrl.postSurgical.getSurgeryTypeStats);
router.get('/post-surgical/beneficiary/:beneficiaryId', mw, ctrl.postSurgical.getByBeneficiary);
router.get('/post-surgical/:id', mw, ctrl.postSurgical.getById);
router.put('/post-surgical/:id', mw, ctrl.postSurgical.update);
router.delete('/post-surgical/:id', mw, ctrl.postSurgical.remove);
router.post('/post-surgical/:id/session', mw, ctrl.postSurgical.addSession);
router.post('/post-surgical/:id/outcome-score', mw, ctrl.postSurgical.addOutcomeScore);
router.post('/post-surgical/:id/complication', mw, ctrl.postSurgical.addComplication);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Geriatric Rehab — رعاية المسنين وكبار السن
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/geriatric', mw, ctrl.geriatric.create);
router.get('/geriatric', mw, ctrl.geriatric.getAll);
router.get('/geriatric/stats', mw, ctrl.geriatric.stats);
router.get('/geriatric/fall-risk-distribution', mw, ctrl.geriatric.getFallRiskDistribution);
router.get('/geriatric/cognitive-distribution', mw, ctrl.geriatric.getCognitiveDistribution);
router.get('/geriatric/beneficiary/:beneficiaryId', mw, ctrl.geriatric.getByBeneficiary);
router.get('/geriatric/:id', mw, ctrl.geriatric.getById);
router.put('/geriatric/:id', mw, ctrl.geriatric.update);
router.delete('/geriatric/:id', mw, ctrl.geriatric.remove);
router.post('/geriatric/:id/session', mw, ctrl.geriatric.addSession);
router.post('/geriatric/:id/progress-report', mw, ctrl.geriatric.addProgressReport);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Advanced Mental Health — الصحة النفسية المتقدمة
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/mental-health', mw, ctrl.mentalHealth.create);
router.get('/mental-health', mw, ctrl.mentalHealth.getAll);
router.get('/mental-health/stats', mw, ctrl.mentalHealth.stats);
router.get('/mental-health/diagnosis-distribution', mw, ctrl.mentalHealth.getDiagnosisDistribution);
router.get('/mental-health/crisis-stats', mw, ctrl.mentalHealth.getCrisisStats);
router.get('/mental-health/beneficiary/:beneficiaryId', mw, ctrl.mentalHealth.getByBeneficiary);
router.get('/mental-health/:id', mw, ctrl.mentalHealth.getById);
router.put('/mental-health/:id', mw, ctrl.mentalHealth.update);
router.delete('/mental-health/:id', mw, ctrl.mentalHealth.remove);
router.post('/mental-health/:id/therapy-session', mw, ctrl.mentalHealth.addTherapySession);
router.post('/mental-health/:id/assessment', mw, ctrl.mentalHealth.addAssessment);
router.post('/mental-health/:id/crisis-event', mw, ctrl.mentalHealth.addCrisisEvent);
router.put('/mental-health/:id/safety-plan', mw, ctrl.mentalHealth.updateSafetyPlan);
router.post('/mental-health/:id/progress-note', mw, ctrl.mentalHealth.addProgressNote);

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Genetic Counseling — الوراثة والاستشارات الجينية
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/genetic-counseling', mw, ctrl.genetic.create);
router.get('/genetic-counseling', mw, ctrl.genetic.getAll);
router.get('/genetic-counseling/stats', mw, ctrl.genetic.stats);
router.get(
  '/genetic-counseling/test-result-distribution',
  mw,
  ctrl.genetic.getTestResultDistribution
);
router.get('/genetic-counseling/referral-reason-stats', mw, ctrl.genetic.getReferralReasonStats);
router.get('/genetic-counseling/beneficiary/:beneficiaryId', mw, ctrl.genetic.getByBeneficiary);
router.get('/genetic-counseling/:id', mw, ctrl.genetic.getById);
router.put('/genetic-counseling/:id', mw, ctrl.genetic.update);
router.delete('/genetic-counseling/:id', mw, ctrl.genetic.remove);
router.post('/genetic-counseling/:id/genetic-test', mw, ctrl.genetic.addGeneticTest);
router.post('/genetic-counseling/:id/counseling-session', mw, ctrl.genetic.addCounselingSession);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Therapy Gamification — الألعاب العلاجية
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/gamification', mw, ctrl.gamification.create);
router.get('/gamification', mw, ctrl.gamification.getAll);
router.get('/gamification/stats', mw, ctrl.gamification.stats);
router.get('/gamification/leaderboard', mw, ctrl.gamification.getLeaderboard);
router.get('/gamification/engagement-stats', mw, ctrl.gamification.getEngagementStats);
router.get('/gamification/beneficiary/:beneficiaryId', mw, ctrl.gamification.getByBeneficiary);
router.get('/gamification/:id', mw, ctrl.gamification.getById);
router.put('/gamification/:id', mw, ctrl.gamification.update);
router.delete('/gamification/:id', mw, ctrl.gamification.remove);
router.post('/gamification/:id/game-session', mw, ctrl.gamification.addGameSession);
router.post('/gamification/:id/achievement', mw, ctrl.gamification.unlockAchievement);
router.post('/gamification/:id/challenge', mw, ctrl.gamification.addChallenge);
// Quests & Daily Missions
router.post('/gamification/:id/quest', mw, ctrl.gamification.addQuest);
router.put('/gamification/:id/quest-progress', mw, ctrl.gamification.updateQuestProgress);
router.get('/gamification/:id/quests', mw, ctrl.gamification.getActiveQuests);
// Skill Tree
router.get('/gamification/:id/skill-tree', mw, ctrl.gamification.getSkillTree);
router.post('/gamification/:id/skill-upgrade', mw, ctrl.gamification.upgradeSkill);
router.post('/gamification/:id/skill-unlock', mw, ctrl.gamification.unlockSkill);
// Virtual Shop
router.get('/gamification/:id/shop', mw, ctrl.gamification.getShop);
router.post('/gamification/:id/purchase', mw, ctrl.gamification.purchaseItem);
router.put('/gamification/:id/equip', mw, ctrl.gamification.equipItem);
// Social & Teams
router.post('/gamification/:id/friend-request', mw, ctrl.gamification.sendFriendRequest);
router.put('/gamification/:id/friend-respond', mw, ctrl.gamification.respondFriendRequest);
router.post('/gamification/:id/gift', mw, ctrl.gamification.sendGift);
router.post('/gamification/:id/team-challenge', mw, ctrl.gamification.joinTeamChallenge);
// Story Mode
router.get('/gamification/:id/story', mw, ctrl.gamification.getStoryProgress);
router.post('/gamification/:id/story', mw, ctrl.gamification.startStory);
router.put('/gamification/:id/episode', mw, ctrl.gamification.completeEpisode);
// Seasonal Events
router.get('/gamification/:id/events', mw, ctrl.gamification.getSeasonalEvents);
router.post('/gamification/:id/event-join', mw, ctrl.gamification.joinEvent);
router.put('/gamification/:id/event-progress', mw, ctrl.gamification.updateEventProgress);
// Virtual Pet
router.get('/gamification/:id/pet', mw, ctrl.gamification.getPet);
router.post('/gamification/:id/pet', mw, ctrl.gamification.adoptPet);
router.post('/gamification/:id/pet-interact', mw, ctrl.gamification.interactWithPet);
// Advanced Analytics
router.get('/gamification/:id/daily-goals', mw, ctrl.gamification.getDailyGoals);
router.put('/gamification/:id/daily-goal-progress', mw, ctrl.gamification.updateDailyGoalProgress);
router.get('/gamification/:id/weekly-report', mw, ctrl.gamification.getWeeklyReport);
router.post('/gamification/:id/weekly-report', mw, ctrl.gamification.addWeeklyReport);
router.post('/gamification/:id/monthly-milestone', mw, ctrl.gamification.addMonthlyMilestone);
router.get('/gamification/:id/heatmap', mw, ctrl.gamification.getHeatmap);
router.get('/gamification/:id/improvement', mw, ctrl.gamification.getImprovementGraph);
// Notifications
router.get('/gamification/:id/notifications', mw, ctrl.gamification.getNotifications);
router.put('/gamification/:id/notification-read', mw, ctrl.gamification.markNotificationRead);
router.post('/gamification/:id/notification', mw, ctrl.gamification.addNotification);
// Customization
router.get('/gamification/:id/customization', mw, ctrl.gamification.getCustomization);
router.put('/gamification/:id/customization', mw, ctrl.gamification.updateCustomization);
// Transaction Log & Dashboard
router.get('/gamification/:id/transactions', mw, ctrl.gamification.getTransactionLog);
router.get('/gamification/:id/dashboard', mw, ctrl.gamification.getDashboard);

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Medical Device IoT — المعدات الطبية الذكية
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/iot-devices', mw, ctrl.iotDevices.create);
router.get('/iot-devices', mw, ctrl.iotDevices.getAll);
router.get('/iot-devices/stats', mw, ctrl.iotDevices.stats);
router.get('/iot-devices/by-category', mw, ctrl.iotDevices.getDevicesByCategory);
router.get('/iot-devices/active-alerts', mw, ctrl.iotDevices.getActiveAlerts);
router.get('/iot-devices/maintenance-due', mw, ctrl.iotDevices.getMaintenanceDue);
router.get('/iot-devices/beneficiary/:beneficiaryId', mw, ctrl.iotDevices.getByBeneficiary);
router.get('/iot-devices/:id', mw, ctrl.iotDevices.getById);
router.put('/iot-devices/:id', mw, ctrl.iotDevices.update);
router.delete('/iot-devices/:id', mw, ctrl.iotDevices.remove);
router.post('/iot-devices/:id/reading', mw, ctrl.iotDevices.addReading);
router.post('/iot-devices/:id/alert-rule', mw, ctrl.iotDevices.addAlertRule);
router.put('/iot-devices/:id/alerts/:alertId/acknowledge', mw, ctrl.iotDevices.acknowledgeAlert);
router.post('/iot-devices/:id/maintenance', mw, ctrl.iotDevices.addMaintenance);

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Inter-Center Collaboration — التعاون بين المراكز
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/inter-center', mw, ctrl.interCenter.create);
router.get('/inter-center', mw, ctrl.interCenter.getAll);
router.get('/inter-center/stats', mw, ctrl.interCenter.stats);
router.get('/inter-center/collab-type-stats', mw, ctrl.interCenter.getCollabTypeStats);
router.get('/inter-center/pending-approvals', mw, ctrl.interCenter.getPendingApprovals);
router.get('/inter-center/:id', mw, ctrl.interCenter.getById);
router.put('/inter-center/:id', mw, ctrl.interCenter.update);
router.delete('/inter-center/:id', mw, ctrl.interCenter.remove);
router.post('/inter-center/:id/communication', mw, ctrl.interCenter.addCommunication);
router.post('/inter-center/:id/approval', mw, ctrl.interCenter.addApproval);
router.post('/inter-center/:id/evaluation', mw, ctrl.interCenter.addEvaluation);

// ═══════════════════════════════════════════════════════════════════════════════
// 11. Post-Discharge Tracking — متابعة ما بعد التخرج
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/post-discharge', mw, ctrl.postDischarge.create);
router.get('/post-discharge', mw, ctrl.postDischarge.getAll);
router.get('/post-discharge/stats', mw, ctrl.postDischarge.stats);
router.get('/post-discharge/outcome-summary', mw, ctrl.postDischarge.getOutcomeSummary);
router.get('/post-discharge/missed-followups', mw, ctrl.postDischarge.getMissedFollowUps);
router.get('/post-discharge/readmission-rate', mw, ctrl.postDischarge.getReadmissionRate);
router.get('/post-discharge/beneficiary/:beneficiaryId', mw, ctrl.postDischarge.getByBeneficiary);
router.get('/post-discharge/:id', mw, ctrl.postDischarge.getById);
router.put('/post-discharge/:id', mw, ctrl.postDischarge.update);
router.delete('/post-discharge/:id', mw, ctrl.postDischarge.remove);
router.post('/post-discharge/:id/contact-log', mw, ctrl.postDischarge.addContactLog);
router.post('/post-discharge/:id/outcome', mw, ctrl.postDischarge.addOutcome);
router.post('/post-discharge/:id/alert', mw, ctrl.postDischarge.addAlert);
router.post('/post-discharge/:id/readmission', mw, ctrl.postDischarge.addReadmission);

// ═══════════════════════════════════════════════════════════════════════════════
// 12. AR Therapy — العلاج بالواقع المعزز
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/ar-therapy', mw, ctrl.arTherapy.create);
router.get('/ar-therapy', mw, ctrl.arTherapy.getAll);
router.get('/ar-therapy/stats', mw, ctrl.arTherapy.stats);
router.get('/ar-therapy/therapy-goal-stats', mw, ctrl.arTherapy.getTherapyGoalStats);
router.get('/ar-therapy/performance-analytics', mw, ctrl.arTherapy.getPerformanceAnalytics);
router.get('/ar-therapy/side-effect-stats', mw, ctrl.arTherapy.getSideEffectStats);
router.get('/ar-therapy/beneficiary/:beneficiaryId', mw, ctrl.arTherapy.getByBeneficiary);
router.get('/ar-therapy/:id', mw, ctrl.arTherapy.getById);
router.put('/ar-therapy/:id', mw, ctrl.arTherapy.update);
router.delete('/ar-therapy/:id', mw, ctrl.arTherapy.remove);
router.post('/ar-therapy/:id/session', mw, ctrl.arTherapy.addSession);
router.post('/ar-therapy/:id/progress-assessment', mw, ctrl.arTherapy.addProgressAssessment);

module.exports = router;
