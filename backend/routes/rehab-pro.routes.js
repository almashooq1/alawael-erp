/**
 * Rehab Professional Routes — مسارات الأنظمة الاحترافية لتأهيل ذوي الإعاقة
 *
 * 150+ REST API endpoints for 12 professional rehab systems
 */

const router = require('express').Router();
const ctrl = require('../controllers/rehab-pro.controller');

const { authenticateToken } = require('../middleware/auth');

// Global auth: all rehab-pro endpoints require authentication
router.use(authenticateToken);

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard — لوحة التحكم
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard/overview', authenticateToken, ctrl.dashboard.getOverview);
router.get('/dashboard/alerts', authenticateToken, ctrl.dashboard.getAlerts);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Cardiac & Pulmonary Rehab — إعادة التأهيل القلبي والرئوي
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/cardiac-pulmonary', authenticateToken, ctrl.cardiacPulmonary.create);
router.get('/cardiac-pulmonary', authenticateToken, ctrl.cardiacPulmonary.getAll);
router.get('/cardiac-pulmonary/stats', authenticateToken, ctrl.cardiacPulmonary.stats);
router.get(
  '/cardiac-pulmonary/phase-distribution',
  authenticateToken,
  ctrl.cardiacPulmonary.getPhaseDistribution
);
router.get(
  '/cardiac-pulmonary/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.cardiacPulmonary.getByBeneficiary
);
router.get('/cardiac-pulmonary/:id', authenticateToken, ctrl.cardiacPulmonary.getById);
router.put('/cardiac-pulmonary/:id', authenticateToken, ctrl.cardiacPulmonary.update);
router.delete('/cardiac-pulmonary/:id', authenticateToken, ctrl.cardiacPulmonary.remove);
router.post(
  '/cardiac-pulmonary/:id/exercise-session',
  authenticateToken,
  ctrl.cardiacPulmonary.addExerciseSession
);
router.post(
  '/cardiac-pulmonary/:id/progress-assessment',
  authenticateToken,
  ctrl.cardiacPulmonary.addProgressAssessment
);
router.post(
  '/cardiac-pulmonary/:id/education',
  authenticateToken,
  ctrl.cardiacPulmonary.addEducation
);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Stroke Rehab — إعادة تأهيل السكتة الدماغية
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/stroke-rehab', authenticateToken, ctrl.strokeRehab.create);
router.get('/stroke-rehab', authenticateToken, ctrl.strokeRehab.getAll);
router.get('/stroke-rehab/stats', authenticateToken, ctrl.strokeRehab.stats);
router.get(
  '/stroke-rehab/type-distribution',
  authenticateToken,
  ctrl.strokeRehab.getTypeDistribution
);
router.get('/stroke-rehab/outcome-trends', authenticateToken, ctrl.strokeRehab.getOutcomeTrends);
router.get(
  '/stroke-rehab/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.strokeRehab.getByBeneficiary
);
router.get('/stroke-rehab/:id', authenticateToken, ctrl.strokeRehab.getById);
router.put('/stroke-rehab/:id', authenticateToken, ctrl.strokeRehab.update);
router.delete('/stroke-rehab/:id', authenticateToken, ctrl.strokeRehab.remove);
router.post('/stroke-rehab/:id/session', authenticateToken, ctrl.strokeRehab.addSession);
router.post(
  '/stroke-rehab/:id/progress-report',
  authenticateToken,
  ctrl.strokeRehab.addProgressReport
);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Spinal Cord Rehab — إعادة تأهيل إصابات الحبل الشوكي
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/spinal-cord', authenticateToken, ctrl.spinalCord.create);
router.get('/spinal-cord', authenticateToken, ctrl.spinalCord.getAll);
router.get('/spinal-cord/stats', authenticateToken, ctrl.spinalCord.stats);
router.get(
  '/spinal-cord/injury-level-stats',
  authenticateToken,
  ctrl.spinalCord.getInjuryLevelStats
);
router.get(
  '/spinal-cord/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.spinalCord.getByBeneficiary
);
router.get('/spinal-cord/:id', authenticateToken, ctrl.spinalCord.getById);
router.put('/spinal-cord/:id', authenticateToken, ctrl.spinalCord.update);
router.delete('/spinal-cord/:id', authenticateToken, ctrl.spinalCord.remove);
router.post('/spinal-cord/:id/rehab-session', authenticateToken, ctrl.spinalCord.addRehabSession);
router.post('/spinal-cord/:id/equipment', authenticateToken, ctrl.spinalCord.addEquipment);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Post-Surgical Rehab — إعادة التأهيل بعد الجراحة
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/post-surgical', authenticateToken, ctrl.postSurgical.create);
router.get('/post-surgical', authenticateToken, ctrl.postSurgical.getAll);
router.get('/post-surgical/stats', authenticateToken, ctrl.postSurgical.stats);
router.get(
  '/post-surgical/surgery-type-stats',
  authenticateToken,
  ctrl.postSurgical.getSurgeryTypeStats
);
router.get(
  '/post-surgical/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.postSurgical.getByBeneficiary
);
router.get('/post-surgical/:id', authenticateToken, ctrl.postSurgical.getById);
router.put('/post-surgical/:id', authenticateToken, ctrl.postSurgical.update);
router.delete('/post-surgical/:id', authenticateToken, ctrl.postSurgical.remove);
router.post('/post-surgical/:id/session', authenticateToken, ctrl.postSurgical.addSession);
router.post(
  '/post-surgical/:id/outcome-score',
  authenticateToken,
  ctrl.postSurgical.addOutcomeScore
);
router.post(
  '/post-surgical/:id/complication',
  authenticateToken,
  ctrl.postSurgical.addComplication
);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Geriatric Rehab — رعاية المسنين وكبار السن
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/geriatric', authenticateToken, ctrl.geriatric.create);
router.get('/geriatric', authenticateToken, ctrl.geriatric.getAll);
router.get('/geriatric/stats', authenticateToken, ctrl.geriatric.stats);
router.get(
  '/geriatric/fall-risk-distribution',
  authenticateToken,
  ctrl.geriatric.getFallRiskDistribution
);
router.get(
  '/geriatric/cognitive-distribution',
  authenticateToken,
  ctrl.geriatric.getCognitiveDistribution
);
router.get(
  '/geriatric/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.geriatric.getByBeneficiary
);
router.get('/geriatric/:id', authenticateToken, ctrl.geriatric.getById);
router.put('/geriatric/:id', authenticateToken, ctrl.geriatric.update);
router.delete('/geriatric/:id', authenticateToken, ctrl.geriatric.remove);
router.post('/geriatric/:id/session', authenticateToken, ctrl.geriatric.addSession);
router.post('/geriatric/:id/progress-report', authenticateToken, ctrl.geriatric.addProgressReport);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Advanced Mental Health — الصحة النفسية المتقدمة
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/mental-health', authenticateToken, ctrl.mentalHealth.create);
router.get('/mental-health', authenticateToken, ctrl.mentalHealth.getAll);
router.get('/mental-health/stats', authenticateToken, ctrl.mentalHealth.stats);
router.get(
  '/mental-health/diagnosis-distribution',
  authenticateToken,
  ctrl.mentalHealth.getDiagnosisDistribution
);
router.get('/mental-health/crisis-stats', authenticateToken, ctrl.mentalHealth.getCrisisStats);
router.get(
  '/mental-health/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.mentalHealth.getByBeneficiary
);
router.get('/mental-health/:id', authenticateToken, ctrl.mentalHealth.getById);
router.put('/mental-health/:id', authenticateToken, ctrl.mentalHealth.update);
router.delete('/mental-health/:id', authenticateToken, ctrl.mentalHealth.remove);
router.post(
  '/mental-health/:id/therapy-session',
  authenticateToken,
  ctrl.mentalHealth.addTherapySession
);
router.post('/mental-health/:id/assessment', authenticateToken, ctrl.mentalHealth.addAssessment);
router.post('/mental-health/:id/crisis-event', authenticateToken, ctrl.mentalHealth.addCrisisEvent);
router.put('/mental-health/:id/safety-plan', authenticateToken, ctrl.mentalHealth.updateSafetyPlan);
router.post(
  '/mental-health/:id/progress-note',
  authenticateToken,
  ctrl.mentalHealth.addProgressNote
);

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Genetic Counseling — الوراثة والاستشارات الجينية
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/genetic-counseling', authenticateToken, ctrl.genetic.create);
router.get('/genetic-counseling', authenticateToken, ctrl.genetic.getAll);
router.get('/genetic-counseling/stats', authenticateToken, ctrl.genetic.stats);
router.get(
  '/genetic-counseling/test-result-distribution',
  authenticateToken,
  ctrl.genetic.getTestResultDistribution
);
router.get(
  '/genetic-counseling/referral-reason-stats',
  authenticateToken,
  ctrl.genetic.getReferralReasonStats
);
router.get(
  '/genetic-counseling/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.genetic.getByBeneficiary
);
router.get('/genetic-counseling/:id', authenticateToken, ctrl.genetic.getById);
router.put('/genetic-counseling/:id', authenticateToken, ctrl.genetic.update);
router.delete('/genetic-counseling/:id', authenticateToken, ctrl.genetic.remove);
router.post('/genetic-counseling/:id/genetic-test', authenticateToken, ctrl.genetic.addGeneticTest);
router.post(
  '/genetic-counseling/:id/counseling-session',
  authenticateToken,
  ctrl.genetic.addCounselingSession
);

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Therapy Gamification — الألعاب العلاجية
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/gamification', authenticateToken, ctrl.gamification.create);
router.get('/gamification', authenticateToken, ctrl.gamification.getAll);
router.get('/gamification/stats', authenticateToken, ctrl.gamification.stats);
router.get('/gamification/leaderboard', authenticateToken, ctrl.gamification.getLeaderboard);
router.get(
  '/gamification/engagement-stats',
  authenticateToken,
  ctrl.gamification.getEngagementStats
);
router.get(
  '/gamification/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.gamification.getByBeneficiary
);
router.get('/gamification/:id', authenticateToken, ctrl.gamification.getById);
router.put('/gamification/:id', authenticateToken, ctrl.gamification.update);
router.delete('/gamification/:id', authenticateToken, ctrl.gamification.remove);
router.post('/gamification/:id/game-session', authenticateToken, ctrl.gamification.addGameSession);
router.post(
  '/gamification/:id/achievement',
  authenticateToken,
  ctrl.gamification.unlockAchievement
);
router.post('/gamification/:id/challenge', authenticateToken, ctrl.gamification.addChallenge);
// Quests & Daily Missions
router.post('/gamification/:id/quest', authenticateToken, ctrl.gamification.addQuest);
router.put(
  '/gamification/:id/quest-progress',
  authenticateToken,
  ctrl.gamification.updateQuestProgress
);
router.get('/gamification/:id/quests', authenticateToken, ctrl.gamification.getActiveQuests);
// Skill Tree
router.get('/gamification/:id/skill-tree', authenticateToken, ctrl.gamification.getSkillTree);
router.post('/gamification/:id/skill-upgrade', authenticateToken, ctrl.gamification.upgradeSkill);
router.post('/gamification/:id/skill-unlock', authenticateToken, ctrl.gamification.unlockSkill);
// Virtual Shop
router.get('/gamification/:id/shop', authenticateToken, ctrl.gamification.getShop);
router.post('/gamification/:id/purchase', authenticateToken, ctrl.gamification.purchaseItem);
router.put('/gamification/:id/equip', authenticateToken, ctrl.gamification.equipItem);
// Social & Teams
router.post(
  '/gamification/:id/friend-request',
  authenticateToken,
  ctrl.gamification.sendFriendRequest
);
router.put(
  '/gamification/:id/friend-respond',
  authenticateToken,
  ctrl.gamification.respondFriendRequest
);
router.post('/gamification/:id/gift', authenticateToken, ctrl.gamification.sendGift);
router.post(
  '/gamification/:id/team-challenge',
  authenticateToken,
  ctrl.gamification.joinTeamChallenge
);
// Story Mode
router.get('/gamification/:id/story', authenticateToken, ctrl.gamification.getStoryProgress);
router.post('/gamification/:id/story', authenticateToken, ctrl.gamification.startStory);
router.put('/gamification/:id/episode', authenticateToken, ctrl.gamification.completeEpisode);
// Seasonal Events
router.get('/gamification/:id/events', authenticateToken, ctrl.gamification.getSeasonalEvents);
router.post('/gamification/:id/event-join', authenticateToken, ctrl.gamification.joinEvent);
router.put(
  '/gamification/:id/event-progress',
  authenticateToken,
  ctrl.gamification.updateEventProgress
);
// Virtual Pet
router.get('/gamification/:id/pet', authenticateToken, ctrl.gamification.getPet);
router.post('/gamification/:id/pet', authenticateToken, ctrl.gamification.adoptPet);
router.post('/gamification/:id/pet-interact', authenticateToken, ctrl.gamification.interactWithPet);
// Advanced Analytics
router.get('/gamification/:id/daily-goals', authenticateToken, ctrl.gamification.getDailyGoals);
router.put(
  '/gamification/:id/daily-goal-progress',
  authenticateToken,
  ctrl.gamification.updateDailyGoalProgress
);
router.get('/gamification/:id/weekly-report', authenticateToken, ctrl.gamification.getWeeklyReport);
router.post(
  '/gamification/:id/weekly-report',
  authenticateToken,
  ctrl.gamification.addWeeklyReport
);
router.post(
  '/gamification/:id/monthly-milestone',
  authenticateToken,
  ctrl.gamification.addMonthlyMilestone
);
router.get('/gamification/:id/heatmap', authenticateToken, ctrl.gamification.getHeatmap);
router.get(
  '/gamification/:id/improvement',
  authenticateToken,
  ctrl.gamification.getImprovementGraph
);
// Notifications
router.get(
  '/gamification/:id/notifications',
  authenticateToken,
  ctrl.gamification.getNotifications
);
router.put(
  '/gamification/:id/notification-read',
  authenticateToken,
  ctrl.gamification.markNotificationRead
);
router.post('/gamification/:id/notification', authenticateToken, ctrl.gamification.addNotification);
// Customization
router.get(
  '/gamification/:id/customization',
  authenticateToken,
  ctrl.gamification.getCustomization
);
router.put(
  '/gamification/:id/customization',
  authenticateToken,
  ctrl.gamification.updateCustomization
);
// Transaction Log & Dashboard
router.get(
  '/gamification/:id/transactions',
  authenticateToken,
  ctrl.gamification.getTransactionLog
);
router.get('/gamification/:id/dashboard', authenticateToken, ctrl.gamification.getDashboard);

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Medical Device IoT — المعدات الطبية الذكية
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/iot-devices', authenticateToken, ctrl.iotDevices.create);
router.get('/iot-devices', authenticateToken, ctrl.iotDevices.getAll);
router.get('/iot-devices/stats', authenticateToken, ctrl.iotDevices.stats);
router.get('/iot-devices/by-category', authenticateToken, ctrl.iotDevices.getDevicesByCategory);
router.get('/iot-devices/active-alerts', authenticateToken, ctrl.iotDevices.getActiveAlerts);
router.get('/iot-devices/maintenance-due', authenticateToken, ctrl.iotDevices.getMaintenanceDue);
router.get(
  '/iot-devices/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.iotDevices.getByBeneficiary
);
router.get('/iot-devices/:id', authenticateToken, ctrl.iotDevices.getById);
router.put('/iot-devices/:id', authenticateToken, ctrl.iotDevices.update);
router.delete('/iot-devices/:id', authenticateToken, ctrl.iotDevices.remove);
router.post('/iot-devices/:id/reading', authenticateToken, ctrl.iotDevices.addReading);
router.post('/iot-devices/:id/alert-rule', authenticateToken, ctrl.iotDevices.addAlertRule);
router.put(
  '/iot-devices/:id/alerts/:alertId/acknowledge',
  authenticateToken,
  ctrl.iotDevices.acknowledgeAlert
);
router.post('/iot-devices/:id/maintenance', authenticateToken, ctrl.iotDevices.addMaintenance);

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Inter-Center Collaboration — التعاون بين المراكز
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/inter-center', authenticateToken, ctrl.interCenter.create);
router.get('/inter-center', authenticateToken, ctrl.interCenter.getAll);
router.get('/inter-center/stats', authenticateToken, ctrl.interCenter.stats);
router.get(
  '/inter-center/collab-type-stats',
  authenticateToken,
  ctrl.interCenter.getCollabTypeStats
);
router.get(
  '/inter-center/pending-approvals',
  authenticateToken,
  ctrl.interCenter.getPendingApprovals
);
router.get('/inter-center/:id', authenticateToken, ctrl.interCenter.getById);
router.put('/inter-center/:id', authenticateToken, ctrl.interCenter.update);
router.delete('/inter-center/:id', authenticateToken, ctrl.interCenter.remove);
router.post(
  '/inter-center/:id/communication',
  authenticateToken,
  ctrl.interCenter.addCommunication
);
router.post('/inter-center/:id/approval', authenticateToken, ctrl.interCenter.addApproval);
router.post('/inter-center/:id/evaluation', authenticateToken, ctrl.interCenter.addEvaluation);

// ═══════════════════════════════════════════════════════════════════════════════
// 11. Post-Discharge Tracking — متابعة ما بعد التخرج
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/post-discharge', authenticateToken, ctrl.postDischarge.create);
router.get('/post-discharge', authenticateToken, ctrl.postDischarge.getAll);
router.get('/post-discharge/stats', authenticateToken, ctrl.postDischarge.stats);
router.get(
  '/post-discharge/outcome-summary',
  authenticateToken,
  ctrl.postDischarge.getOutcomeSummary
);
router.get(
  '/post-discharge/missed-followups',
  authenticateToken,
  ctrl.postDischarge.getMissedFollowUps
);
router.get(
  '/post-discharge/readmission-rate',
  authenticateToken,
  ctrl.postDischarge.getReadmissionRate
);
router.get(
  '/post-discharge/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.postDischarge.getByBeneficiary
);
router.get('/post-discharge/:id', authenticateToken, ctrl.postDischarge.getById);
router.put('/post-discharge/:id', authenticateToken, ctrl.postDischarge.update);
router.delete('/post-discharge/:id', authenticateToken, ctrl.postDischarge.remove);
router.post('/post-discharge/:id/contact-log', authenticateToken, ctrl.postDischarge.addContactLog);
router.post('/post-discharge/:id/outcome', authenticateToken, ctrl.postDischarge.addOutcome);
router.post('/post-discharge/:id/alert', authenticateToken, ctrl.postDischarge.addAlert);
router.post(
  '/post-discharge/:id/readmission',
  authenticateToken,
  ctrl.postDischarge.addReadmission
);

// ═══════════════════════════════════════════════════════════════════════════════
// 12. AR Therapy — العلاج بالواقع المعزز
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/ar-therapy', authenticateToken, ctrl.arTherapy.create);
router.get('/ar-therapy', authenticateToken, ctrl.arTherapy.getAll);
router.get('/ar-therapy/stats', authenticateToken, ctrl.arTherapy.stats);
router.get('/ar-therapy/therapy-goal-stats', authenticateToken, ctrl.arTherapy.getTherapyGoalStats);
router.get(
  '/ar-therapy/performance-analytics',
  authenticateToken,
  ctrl.arTherapy.getPerformanceAnalytics
);
router.get('/ar-therapy/side-effect-stats', authenticateToken, ctrl.arTherapy.getSideEffectStats);
router.get(
  '/ar-therapy/beneficiary/:beneficiaryId',
  authenticateToken,
  ctrl.arTherapy.getByBeneficiary
);
router.get('/ar-therapy/:id', authenticateToken, ctrl.arTherapy.getById);
router.put('/ar-therapy/:id', authenticateToken, ctrl.arTherapy.update);
router.delete('/ar-therapy/:id', authenticateToken, ctrl.arTherapy.remove);
router.post('/ar-therapy/:id/session', authenticateToken, ctrl.arTherapy.addSession);
router.post(
  '/ar-therapy/:id/progress-assessment',
  authenticateToken,
  ctrl.arTherapy.addProgressAssessment
);

module.exports = router;
