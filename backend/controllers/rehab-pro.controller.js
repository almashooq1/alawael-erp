/**
 * Rehab Professional Controller — وحدة التحكم الاحترافية لتأهيل ذوي الإعاقة
 *
 * Full CRUD + Statistics + Specialized endpoints for all 12 models
 */

const {
  CardiacPulmonaryRehab,
  StrokeRehab,
  SpinalCordRehab,
  PostSurgicalRehab,
  GeriatricRehab,
  AdvancedMentalHealth,
  GeneticCounseling,
  TherapyGamification,
  MedicalDeviceIoT,
  InterCenterCollab,
  PostDischargeTracking,
  ARTherapy,
} = require('../models/rehab-pro.model');

// ─── Helpers ────────────────────────────────────────────────────────────────────

function ok(res, data, msg = 'Success') {
  return res.json({ success: true, message: msg, data });
}
function fail(res, err, code = 500) {
  console.error('[rehab-pro]', err);
  return res.status(code).json({ success: false, message: err.message || err });
}

/**
 * Returns a standard CRUD set for any Mongoose model
 */
function buildCRUD(Model, label) {
  return {
    create: async (req, res) => {
      try {
        const doc = await Model.create({ ...req.body, createdBy: req.user?._id });
        ok(res, doc, `${label} created`);
      } catch (e) {
        fail(res, e);
      }
    },

    getAll: async (req, res) => {
      try {
        const { page = 1, limit = 25, status, beneficiary, sort = '-createdAt' } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (beneficiary) filter.beneficiary = beneficiary;
        const [docs, total] = await Promise.all([
          Model.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(+limit)
            .lean(),
          Model.countDocuments(filter),
        ]);
        ok(res, { docs, total, page: +page, pages: Math.ceil(total / limit) });
      } catch (e) {
        fail(res, e);
      }
    },

    getById: async (req, res) => {
      try {
        const doc = await Model.findById(req.params.id).lean();
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
        ok(res, doc);
      } catch (e) {
        fail(res, e);
      }
    },

    update: async (req, res) => {
      try {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
          new: true,
          runValidators: true,
        });
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
        ok(res, doc, `${label} updated`);
      } catch (e) {
        fail(res, e);
      }
    },

    remove: async (req, res) => {
      try {
        const doc = await Model.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
        ok(res, doc, `${label} deleted`);
      } catch (e) {
        fail(res, e);
      }
    },

    stats: async (req, res) => {
      try {
        const total = await Model.countDocuments();
        const byStatus = await Model.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        ok(res, { total, byStatus });
      } catch (e) {
        fail(res, e);
      }
    },

    getByBeneficiary: async (req, res) => {
      try {
        const docs = await Model.find({ beneficiary: req.params.beneficiaryId })
          .sort('-createdAt')
          .lean();
        ok(res, docs);
      } catch (e) {
        fail(res, e);
      }
    },
  };
}

// ─── Build CRUD sets ────────────────────────────────────────────────────────────

const cardiacPulmonary = buildCRUD(CardiacPulmonaryRehab, 'CardiacPulmonaryRehab');
const strokeRehab = buildCRUD(StrokeRehab, 'StrokeRehab');
const spinalCord = buildCRUD(SpinalCordRehab, 'SpinalCordRehab');
const postSurgical = buildCRUD(PostSurgicalRehab, 'PostSurgicalRehab');
const geriatric = buildCRUD(GeriatricRehab, 'GeriatricRehab');
const mentalHealth = buildCRUD(AdvancedMentalHealth, 'AdvancedMentalHealth');
const genetic = buildCRUD(GeneticCounseling, 'GeneticCounseling');
const gamification = buildCRUD(TherapyGamification, 'TherapyGamification');
const iotDevices = buildCRUD(MedicalDeviceIoT, 'MedicalDeviceIoT');
const interCenter = buildCRUD(InterCenterCollab, 'InterCenterCollab');
const postDischarge = buildCRUD(PostDischargeTracking, 'PostDischargeTracking');
const arTherapy = buildCRUD(ARTherapy, 'ARTherapy');

// ═══════════════════════════════════════════════════════════════════════════════
// Specialized Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Cardiac Pulmonary — Exercise Session ─────────────────────────────────
cardiacPulmonary.addExerciseSession = async (req, res) => {
  try {
    const doc = await CardiacPulmonaryRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { exerciseSessions: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Exercise session added');
  } catch (e) {
    fail(res, e);
  }
};

cardiacPulmonary.addProgressAssessment = async (req, res) => {
  try {
    const doc = await CardiacPulmonaryRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { progressAssessments: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Progress assessment added');
  } catch (e) {
    fail(res, e);
  }
};

cardiacPulmonary.addEducation = async (req, res) => {
  try {
    const doc = await CardiacPulmonaryRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { patientEducation: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Education session added');
  } catch (e) {
    fail(res, e);
  }
};

cardiacPulmonary.getPhaseDistribution = async (_req, res) => {
  try {
    const data = await CardiacPulmonaryRehab.aggregate([
      { $group: { _id: '$phase', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

// ── 2. Stroke Rehab — Session & Progress ────────────────────────────────────
strokeRehab.addSession = async (req, res) => {
  try {
    const doc = await StrokeRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { sessionLogs: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Session log added');
  } catch (e) {
    fail(res, e);
  }
};

strokeRehab.addProgressReport = async (req, res) => {
  try {
    const doc = await StrokeRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { progressReports: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Progress report added');
  } catch (e) {
    fail(res, e);
  }
};

strokeRehab.getTypeDistribution = async (_req, res) => {
  try {
    const data = await StrokeRehab.aggregate([
      { $group: { _id: '$strokeData.type', count: { $sum: 1 } } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

strokeRehab.getOutcomeTrends = async (_req, res) => {
  try {
    const data = await StrokeRehab.aggregate([
      { $unwind: '$progressReports' },
      {
        $group: {
          _id: null,
          avgBarthel: { $avg: '$progressReports.barthelIndex' },
          avgNIHSS: { $avg: '$progressReports.nihss' },
          avgBergBalance: { $avg: '$progressReports.bergBalance' },
          count: { $sum: 1 },
        },
      },
    ]);
    ok(res, data[0] || {});
  } catch (e) {
    fail(res, e);
  }
};

// ── 3. Spinal Cord — Sessions & Equipment ───────────────────────────────────
spinalCord.addRehabSession = async (req, res) => {
  try {
    const doc = await SpinalCordRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { rehabSessions: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Rehab session added');
  } catch (e) {
    fail(res, e);
  }
};

spinalCord.addEquipment = async (req, res) => {
  try {
    const doc = await SpinalCordRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { equipment: req.body } },
      { new: true }
    );
    ok(res, doc, 'Equipment record added');
  } catch (e) {
    fail(res, e);
  }
};

spinalCord.getInjuryLevelStats = async (_req, res) => {
  try {
    const data = await SpinalCordRehab.aggregate([
      {
        $group: {
          _id: { level: '$injuryProfile.level', asia: '$injuryProfile.asia' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

// ── 4. Post-Surgical — Sessions & Complications ────────────────────────────
postSurgical.addSession = async (req, res) => {
  try {
    const doc = await PostSurgicalRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { sessions: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Session added');
  } catch (e) {
    fail(res, e);
  }
};

postSurgical.addOutcomeScore = async (req, res) => {
  try {
    const doc = await PostSurgicalRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { outcomeScores: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Outcome score added');
  } catch (e) {
    fail(res, e);
  }
};

postSurgical.addComplication = async (req, res) => {
  try {
    const doc = await PostSurgicalRehab.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          complications: { ...req.body, dateDetected: req.body.dateDetected || new Date() },
        },
      },
      { new: true }
    );
    ok(res, doc, 'Complication recorded');
  } catch (e) {
    fail(res, e);
  }
};

postSurgical.getSurgeryTypeStats = async (_req, res) => {
  try {
    const data = await PostSurgicalRehab.aggregate([
      { $group: { _id: '$surgicalInfo.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

// ── 5. Geriatric — Sessions & Fall Prevention ───────────────────────────────
geriatric.addSession = async (req, res) => {
  try {
    const doc = await GeriatricRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { sessions: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Session added');
  } catch (e) {
    fail(res, e);
  }
};

geriatric.addProgressReport = async (req, res) => {
  try {
    const doc = await GeriatricRehab.findByIdAndUpdate(
      req.params.id,
      { $push: { progressReports: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Progress report added');
  } catch (e) {
    fail(res, e);
  }
};

geriatric.getFallRiskDistribution = async (_req, res) => {
  try {
    const data = await GeriatricRehab.aggregate([
      {
        $group: {
          _id: '$comprehensiveGeriatricAssessment.functional.fallRisk',
          count: { $sum: 1 },
        },
      },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

geriatric.getCognitiveDistribution = async (_req, res) => {
  try {
    const data = await GeriatricRehab.aggregate([
      {
        $group: {
          _id: '$comprehensiveGeriatricAssessment.cognitive.diagnosis',
          count: { $sum: 1 },
        },
      },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

// ── 6. Mental Health — Sessions, Crisis & Safety ────────────────────────────
mentalHealth.addTherapySession = async (req, res) => {
  try {
    const doc = await AdvancedMentalHealth.findByIdAndUpdate(
      req.params.id,
      { $push: { 'psychotherapy.sessions': { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Therapy session added');
  } catch (e) {
    fail(res, e);
  }
};

mentalHealth.addAssessment = async (req, res) => {
  try {
    const doc = await AdvancedMentalHealth.findByIdAndUpdate(
      req.params.id,
      { $push: { psychologicalAssessments: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Assessment added');
  } catch (e) {
    fail(res, e);
  }
};

mentalHealth.addCrisisEvent = async (req, res) => {
  try {
    const doc = await AdvancedMentalHealth.findByIdAndUpdate(
      req.params.id,
      { $push: { crisisHistory: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Crisis event recorded');
  } catch (e) {
    fail(res, e);
  }
};

mentalHealth.updateSafetyPlan = async (req, res) => {
  try {
    const doc = await AdvancedMentalHealth.findByIdAndUpdate(
      req.params.id,
      { $set: { safetyPlan: { ...req.body, lastUpdated: new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Safety plan updated');
  } catch (e) {
    fail(res, e);
  }
};

mentalHealth.addProgressNote = async (req, res) => {
  try {
    const doc = await AdvancedMentalHealth.findByIdAndUpdate(
      req.params.id,
      { $push: { progressNotes: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Progress note added');
  } catch (e) {
    fail(res, e);
  }
};

mentalHealth.getDiagnosisDistribution = async (_req, res) => {
  try {
    const data = await AdvancedMentalHealth.aggregate([
      { $group: { _id: '$psychiatricDiagnosis.dsmCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

mentalHealth.getCrisisStats = async (_req, res) => {
  try {
    const data = await AdvancedMentalHealth.aggregate([
      { $unwind: '$crisisHistory' },
      { $group: { _id: '$crisisHistory.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

// ── 7. Genetic Counseling — Tests & Sessions ────────────────────────────────
genetic.addGeneticTest = async (req, res) => {
  try {
    const doc = await GeneticCounseling.findByIdAndUpdate(
      req.params.id,
      { $push: { geneticTests: req.body } },
      { new: true }
    );
    ok(res, doc, 'Genetic test added');
  } catch (e) {
    fail(res, e);
  }
};

genetic.addCounselingSession = async (req, res) => {
  try {
    const doc = await GeneticCounseling.findByIdAndUpdate(
      req.params.id,
      { $push: { counselingSessions: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Counseling session added');
  } catch (e) {
    fail(res, e);
  }
};

genetic.getTestResultDistribution = async (_req, res) => {
  try {
    const data = await GeneticCounseling.aggregate([
      { $unwind: '$geneticTests' },
      { $group: { _id: '$geneticTests.result', count: { $sum: 1 } } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

genetic.getReferralReasonStats = async (_req, res) => {
  try {
    const data = await GeneticCounseling.aggregate([
      { $group: { _id: '$referralInfo.reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

// ── 8. Therapy Gamification — Sessions, Achievements, Challenges ────────────
gamification.addGameSession = async (req, res) => {
  try {
    const session = { ...req.body, date: req.body.date || new Date() };
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      {
        $push: { gameSessions: session },
        $inc: {
          'playerProfile.totalXP': req.body.xpEarned || 10,
          'engagementAnalytics.totalSessions': 1,
          'engagementAnalytics.totalPlayTime': req.body.duration || 0,
        },
        $set: { 'engagementAnalytics.lastActiveDate': new Date() },
      },
      { new: true }
    );
    ok(res, doc, 'Game session added');
  } catch (e) {
    fail(res, e);
  }
};

gamification.unlockAchievement = async (req, res) => {
  try {
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      {
        $push: { achievements: { ...req.body, unlockedDate: new Date() } },
        $inc: { 'playerProfile.totalXP': req.body.xpAwarded || 0 },
      },
      { new: true }
    );
    ok(res, doc, 'Achievement unlocked');
  } catch (e) {
    fail(res, e);
  }
};

gamification.addChallenge = async (req, res) => {
  try {
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      { $push: { challenges: { ...req.body, status: 'available' } } },
      { new: true }
    );
    ok(res, doc, 'Challenge added');
  } catch (e) {
    fail(res, e);
  }
};

gamification.getLeaderboard = async (_req, res) => {
  try {
    const data = await TherapyGamification.find({ status: 'active' })
      .sort({ 'playerProfile.totalXP': -1 })
      .limit(50)
      .select(
        'beneficiaryName playerProfile.displayName playerProfile.level playerProfile.totalXP playerProfile.rank'
      )
      .lean();
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

gamification.getEngagementStats = async (_req, res) => {
  try {
    const data = await TherapyGamification.aggregate([
      {
        $group: {
          _id: null,
          totalPlayers: { $sum: 1 },
          avgLevel: { $avg: '$playerProfile.level' },
          avgXP: { $avg: '$playerProfile.totalXP' },
          avgStreak: { $avg: '$playerProfile.currentStreak' },
          totalSessions: { $sum: '$engagementAnalytics.totalSessions' },
          avgCompliance: { $avg: '$engagementAnalytics.therapyCompliance' },
        },
      },
    ]);
    ok(res, data[0] || {});
  } catch (e) {
    fail(res, e);
  }
};

// ── 8b. Gamification — Quests & Daily Missions ──────────────────────────────
gamification.addQuest = async (req, res) => {
  try {
    const quest = { ...req.body, questId: `quest_${Date.now()}`, status: 'available' };
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      { $push: { quests: quest } },
      { new: true }
    );
    ok(res, doc, 'Quest added');
  } catch (e) {
    fail(res, e);
  }
};

gamification.updateQuestProgress = async (req, res) => {
  try {
    const { questId, requirementIndex, progress } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const quest = doc.quests.find(q => q.questId === questId);
    if (!quest) return res.status(404).json({ success: false, message: 'Quest not found' });
    if (quest.requirements[requirementIndex]) {
      quest.requirements[requirementIndex].current = progress;
    }
    const allMet = quest.requirements.every(r => r.current >= r.target);
    if (allMet) {
      quest.status = 'completed';
      quest.completedDate = new Date();
      quest.timesCompleted = (quest.timesCompleted || 0) + 1;
      doc.playerProfile.totalXP += quest.xpReward || 0;
      doc.virtualShop.coins += quest.pointsReward || 0;
      doc.transactionLog.push({
        transactionId: `txn_${Date.now()}`,
        type: 'quest_reward',
        amount: quest.xpReward || 0,
        currency: 'xp',
        source: `Quest: ${quest.name}`,
        description: `Completed quest: ${quest.name}`,
        date: new Date(),
      });
    } else if (quest.status === 'available') {
      quest.status = 'in_progress';
      quest.acceptedDate = new Date();
    }
    await doc.save();
    ok(res, doc, allMet ? 'Quest completed!' : 'Quest progress updated');
  } catch (e) {
    fail(res, e);
  }
};

gamification.getActiveQuests = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id).select('quests').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const active = doc.quests.filter(q =>
      ['available', 'accepted', 'in_progress'].includes(q.status)
    );
    ok(res, active);
  } catch (e) {
    fail(res, e);
  }
};

// ── 8c. Gamification — Skill Tree ───────────────────────────────────────────
gamification.getSkillTree = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id)
      .select('skillTree playerProfile.totalXP')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    ok(res, doc);
  } catch (e) {
    fail(res, e);
  }
};

gamification.upgradeSkill = async (req, res) => {
  try {
    const { skillId, xpCost } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const skill = doc.skillTree.find(s => s.skillId === skillId);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });
    if (!skill.isUnlocked)
      return res.status(400).json({ success: false, message: 'Skill is locked' });
    if (skill.currentLevel >= skill.maxLevel)
      return res.status(400).json({ success: false, message: 'Skill already at max level' });
    const cost = xpCost || skill.xpToNextLevel || 100;
    if (doc.playerProfile.totalXP < cost)
      return res.status(400).json({ success: false, message: 'Not enough XP' });
    skill.currentLevel += 1;
    skill.xpInvested += cost;
    doc.playerProfile.totalXP -= cost;
    if (skill.currentLevel >= skill.maxLevel) skill.isMastered = true;
    doc.transactionLog.push({
      transactionId: `txn_${Date.now()}`,
      type: 'xp_spent',
      amount: cost,
      currency: 'xp',
      source: `Skill: ${skill.name}`,
      description: `Upgraded ${skill.name} to level ${skill.currentLevel}`,
      date: new Date(),
    });
    await doc.save();
    ok(res, doc, `Skill upgraded to level ${skill.currentLevel}`);
  } catch (e) {
    fail(res, e);
  }
};

gamification.unlockSkill = async (req, res) => {
  try {
    const { skillId } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const skill = doc.skillTree.find(s => s.skillId === skillId);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });
    if (skill.isUnlocked)
      return res.status(400).json({ success: false, message: 'Already unlocked' });
    if (skill.prerequisites && skill.prerequisites.length > 0) {
      const allPrereqsMet = skill.prerequisites.every(preId => {
        const prereq = doc.skillTree.find(s => s.skillId === preId);
        return prereq && prereq.isUnlocked;
      });
      if (!allPrereqsMet)
        return res.status(400).json({ success: false, message: 'Prerequisites not met' });
    }
    skill.isUnlocked = true;
    skill.unlockedDate = new Date();
    await doc.save();
    ok(res, doc, 'Skill unlocked');
  } catch (e) {
    fail(res, e);
  }
};

// ── 8d. Gamification — Virtual Shop & Purchases ─────────────────────────────
gamification.getShop = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id)
      .select('virtualShop playerProfile.totalXP')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    ok(res, doc);
  } catch (e) {
    fail(res, e);
  }
};

gamification.purchaseItem = async (req, res) => {
  try {
    const { itemId, name, nameAr, type, rarity, currency, cost } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const shop = doc.virtualShop;
    if (currency === 'coins' && shop.coins < cost)
      return res.status(400).json({ success: false, message: 'Not enough coins' });
    if (currency === 'gems' && shop.gems < cost)
      return res.status(400).json({ success: false, message: 'Not enough gems' });
    if (currency === 'coins') shop.coins -= cost;
    else if (currency === 'gems') shop.gems -= cost;
    shop.inventory.push({
      itemId,
      name,
      nameAr,
      type,
      rarity,
      equipped: false,
      acquiredDate: new Date(),
      acquiredBy: 'purchase',
    });
    shop.purchaseHistory.push({ itemId, itemName: name, currency, amount: cost, date: new Date() });
    doc.transactionLog.push({
      transactionId: `txn_${Date.now()}`,
      type: `${currency}_spent`,
      amount: cost,
      currency,
      source: 'shop',
      description: `Purchased ${name}`,
      date: new Date(),
      balance: {
        xp: doc.playerProfile.totalXP,
        coins: shop.coins,
        gems: shop.gems,
        points: doc.rewards?.points || 0,
      },
    });
    await doc.save();
    ok(res, doc, `Item "${name}" purchased`);
  } catch (e) {
    fail(res, e);
  }
};

gamification.equipItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const item = doc.virtualShop.inventory.find(i => i.itemId === itemId);
    if (!item)
      return res.status(404).json({ success: false, message: 'Item not found in inventory' });
    // Unequip other items of the same type
    doc.virtualShop.inventory.forEach(i => {
      if (i.type === item.type && i.itemId !== itemId) i.equipped = false;
    });
    item.equipped = !item.equipped;
    await doc.save();
    ok(res, doc, item.equipped ? 'Item equipped' : 'Item unequipped');
  } catch (e) {
    fail(res, e);
  }
};

// ── 8e. Gamification — Social & Teams ───────────────────────────────────────
gamification.sendFriendRequest = async (req, res) => {
  try {
    const { targetId, displayName } = req.body;
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          'social.friendRequests': {
            from: targetId,
            displayName,
            date: new Date(),
            status: 'pending',
          },
        },
      },
      { new: true }
    );
    ok(res, doc, 'Friend request sent');
  } catch (e) {
    fail(res, e);
  }
};

gamification.respondFriendRequest = async (req, res) => {
  try {
    const { requestIndex, accept, fromId, displayName } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    if (doc.social.friendRequests[requestIndex]) {
      doc.social.friendRequests[requestIndex].status = accept ? 'accepted' : 'declined';
      if (accept) {
        doc.social.friends.push({ beneficiary: fromId, displayName, addedDate: new Date() });
        doc.social.socialXP += 20;
      }
    }
    await doc.save();
    ok(res, doc, accept ? 'Friend added' : 'Request declined');
  } catch (e) {
    fail(res, e);
  }
};

gamification.sendGift = async (req, res) => {
  try {
    const { targetId, item } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    doc.social.giftsGiven += 1;
    doc.social.giftHistory.push({ type: 'sent', otherUser: targetId, item, date: new Date() });
    doc.social.socialXP += 10;
    doc.transactionLog.push({
      transactionId: `txn_${Date.now()}`,
      type: 'item_gifted',
      amount: 1,
      currency: 'coins',
      source: 'gift',
      description: `Sent gift "${item}" to friend`,
      date: new Date(),
    });
    await doc.save();
    ok(res, doc, 'Gift sent');
  } catch (e) {
    fail(res, e);
  }
};

gamification.joinTeamChallenge = async (req, res) => {
  try {
    const challenge = { ...req.body, status: 'active', startDate: new Date() };
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      { $push: { 'social.teamChallenges': challenge } },
      { new: true }
    );
    ok(res, doc, 'Joined team challenge');
  } catch (e) {
    fail(res, e);
  }
};

// ── 8f. Gamification — Story Mode ───────────────────────────────────────────
gamification.getStoryProgress = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id).select('storyMode').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    ok(res, doc.storyMode);
  } catch (e) {
    fail(res, e);
  }
};

gamification.startStory = async (req, res) => {
  try {
    const story = {
      ...req.body,
      storyId: `story_${Date.now()}`,
      status: 'in_progress',
      startDate: new Date(),
      totalStars: 0,
    };
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      { $push: { 'storyMode.stories': story } },
      { new: true }
    );
    ok(res, doc, 'Story started');
  } catch (e) {
    fail(res, e);
  }
};

gamification.completeEpisode = async (req, res) => {
  try {
    const { storyId, chapterIndex, episodeIndex, score, stars } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const story = doc.storyMode.stories.find(s => s.storyId === storyId);
    if (
      !story ||
      !story.chapters[chapterIndex] ||
      !story.chapters[chapterIndex].episodes[episodeIndex]
    ) {
      return res.status(404).json({ success: false, message: 'Episode not found' });
    }
    const episode = story.chapters[chapterIndex].episodes[episodeIndex];
    episode.status = 'completed';
    episode.completedDate = new Date();
    episode.stars = Math.max(episode.stars || 0, stars || 0);
    episode.attempts = (episode.attempts || 0) + 1;
    episode.bestScore = Math.max(episode.bestScore || 0, score || 0);
    story.totalStars = story.chapters.reduce(
      (sum, ch) => sum + ch.episodes.reduce((eSum, ep) => eSum + (ep.stars || 0), 0),
      0
    );
    // Check chapter completion
    const chapter = story.chapters[chapterIndex];
    if (chapter.episodes.every(ep => ep.status === 'completed')) {
      chapter.status = 'completed';
      if (chapter.rewardOnComplete) {
        doc.playerProfile.totalXP += chapter.rewardOnComplete.xp || 0;
        doc.virtualShop.coins += chapter.rewardOnComplete.coins || 0;
      }
      // Unlock next chapter
      if (story.chapters[chapterIndex + 1]) story.chapters[chapterIndex + 1].status = 'available';
      doc.storyMode.totalChaptersCompleted = (doc.storyMode.totalChaptersCompleted || 0) + 1;
    }
    // Unlock next episode
    if (
      story.chapters[chapterIndex].episodes[episodeIndex + 1] &&
      story.chapters[chapterIndex].episodes[episodeIndex + 1].status === 'locked'
    ) {
      story.chapters[chapterIndex].episodes[episodeIndex + 1].status = 'available';
    }
    await doc.save();
    ok(res, doc, `Episode completed with ${stars} stars`);
  } catch (e) {
    fail(res, e);
  }
};

// ── 8g. Gamification — Seasonal Events ──────────────────────────────────────
gamification.getSeasonalEvents = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id).select('seasonalEvents').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const now = new Date();
    const active = doc.seasonalEvents.filter(e => new Date(e.endDate) >= now);
    ok(res, active);
  } catch (e) {
    fail(res, e);
  }
};

gamification.joinEvent = async (req, res) => {
  try {
    const event = {
      ...req.body,
      eventId: `event_${Date.now()}`,
      participationStatus: 'active',
      progress: 0,
      eventCurrency: 0,
    };
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      { $push: { seasonalEvents: event } },
      { new: true }
    );
    ok(res, doc, 'Joined seasonal event');
  } catch (e) {
    fail(res, e);
  }
};

gamification.updateEventProgress = async (req, res) => {
  try {
    const { eventId, progressIncrement, currencyEarned } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const event = doc.seasonalEvents.find(e => e.eventId === eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    event.progress += progressIncrement || 0;
    event.eventCurrency += currencyEarned || 0;
    // Check milestones
    const newlyClaimable = event.milestones.filter(
      m => event.progress >= m.threshold && !m.claimed
    );
    newlyClaimable.forEach(m => {
      m.claimed = true;
      doc.playerProfile.totalXP += m.reward?.xp || 0;
      doc.virtualShop.coins += m.reward?.coins || 0;
    });
    if (event.progress >= event.maxProgress) event.participationStatus = 'completed';
    await doc.save();
    ok(res, doc, `Event progress updated. ${newlyClaimable.length} milestone(s) claimed`);
  } catch (e) {
    fail(res, e);
  }
};

// ── 8h. Gamification — Virtual Pet ──────────────────────────────────────────
gamification.getPet = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id).select('virtualPet').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    ok(res, doc.virtualPet);
  } catch (e) {
    fail(res, e);
  }
};

gamification.adoptPet = async (req, res) => {
  try {
    const { species, name } = req.body;
    const petId = `pet_${Date.now()}`;
    const newPet = {
      petId,
      species,
      name,
      level: 1,
      xp: 0,
      happiness: 100,
      energy: 100,
      hunger: 0,
      adoptedDate: new Date(),
    };
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    doc.virtualPet.active = true;
    doc.virtualPet.pet = newPet;
    doc.virtualPet.petCollection.push({
      petId,
      species,
      name,
      level: 1,
      adoptedDate: new Date(),
      isActive: true,
    });
    await doc.save();
    ok(res, doc, `${name} the ${species} adopted!`);
  } catch (e) {
    fail(res, e);
  }
};

gamification.interactWithPet = async (req, res) => {
  try {
    const { action } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc || !doc.virtualPet.active)
      return res.status(400).json({ success: false, message: 'No active pet' });
    const pet = doc.virtualPet.pet;
    const effects = {
      feed: { hunger: -30, happiness: 10, energy: 5, xp: 5 },
      play: { hunger: 10, happiness: 25, energy: -20, xp: 15 },
      train: { hunger: 15, happiness: 5, energy: -25, xp: 25 },
      groom: { hunger: 0, happiness: 15, energy: -5, xp: 10 },
      rest: { hunger: 5, happiness: 5, energy: 40, xp: 5 },
      treat: { hunger: -15, happiness: 20, energy: 0, xp: 8 },
      adventure: { hunger: 20, happiness: 30, energy: -35, xp: 30 },
    };
    const fx = effects[action] || { hunger: 0, happiness: 0, energy: 0, xp: 0 };
    pet.hunger = Math.min(100, Math.max(0, (pet.hunger || 0) + fx.hunger));
    pet.happiness = Math.min(100, Math.max(0, (pet.happiness || 100) + fx.happiness));
    pet.energy = Math.min(100, Math.max(0, (pet.energy || 100) + fx.energy));
    pet.xp = (pet.xp || 0) + fx.xp;
    // Level up pet
    const xpNeeded = pet.level * 100;
    if (pet.xp >= xpNeeded) {
      pet.level += 1;
      pet.xp -= xpNeeded;
    }
    doc.virtualPet.interactionLog.push({
      action,
      date: new Date(),
      happinessChange: fx.happiness,
      xpEarned: fx.xp,
    });
    await doc.save();
    ok(res, doc.virtualPet, `${action} completed`);
  } catch (e) {
    fail(res, e);
  }
};

// ── 8i. Gamification — Advanced Analytics & Reports ─────────────────────────
gamification.getDailyGoals = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id)
      .select('advancedAnalytics.dailyGoals')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    ok(res, doc.advancedAnalytics?.dailyGoals || {});
  } catch (e) {
    fail(res, e);
  }
};

gamification.updateDailyGoalProgress = async (req, res) => {
  try {
    const { goalType, increment } = req.body;
    const field = `advancedAnalytics.dailyGoals.${goalType}.current`;
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      { $inc: { [field]: increment || 1 } },
      { new: true }
    );
    ok(res, doc, 'Daily goal progress updated');
  } catch (e) {
    fail(res, e);
  }
};

gamification.getWeeklyReport = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id)
      .select('advancedAnalytics.weeklyReport')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const reports = doc.advancedAnalytics?.weeklyReport || [];
    ok(res, reports.length > 0 ? reports[reports.length - 1] : {});
  } catch (e) {
    fail(res, e);
  }
};

gamification.getHeatmap = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id)
      .select('advancedAnalytics.heatmap')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    ok(res, doc.advancedAnalytics?.heatmap || []);
  } catch (e) {
    fail(res, e);
  }
};

gamification.getImprovementGraph = async (req, res) => {
  try {
    const { domain } = req.query;
    const doc = await TherapyGamification.findById(req.params.id)
      .select('advancedAnalytics.improvementGraph')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    let data = doc.advancedAnalytics?.improvementGraph || [];
    if (domain) data = data.filter(d => d.domain === domain);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

gamification.addWeeklyReport = async (req, res) => {
  try {
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      { $push: { 'advancedAnalytics.weeklyReport': req.body } },
      { new: true }
    );
    ok(res, doc, 'Weekly report added');
  } catch (e) {
    fail(res, e);
  }
};

gamification.addMonthlyMilestone = async (req, res) => {
  try {
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      { $push: { 'advancedAnalytics.monthlyMilestones': req.body } },
      { new: true }
    );
    ok(res, doc, 'Monthly milestone recorded');
  } catch (e) {
    fail(res, e);
  }
};

// ── 8j. Gamification — Notifications ────────────────────────────────────────
gamification.getNotifications = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id).select('notifications').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const unread =
      req.query.unreadOnly === 'true' ? doc.notifications.filter(n => !n.read) : doc.notifications;
    ok(res, unread);
  } catch (e) {
    fail(res, e);
  }
};

gamification.markNotificationRead = async (req, res) => {
  try {
    const { notifId } = req.body;
    const doc = await TherapyGamification.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    if (notifId === 'all') {
      doc.notifications.forEach(n => (n.read = true));
    } else {
      const notif = doc.notifications.find(n => n.notifId === notifId);
      if (notif) notif.read = true;
    }
    await doc.save();
    ok(res, doc, notifId === 'all' ? 'All notifications marked read' : 'Notification marked read');
  } catch (e) {
    fail(res, e);
  }
};

gamification.addNotification = async (req, res) => {
  try {
    const notif = { ...req.body, notifId: `notif_${Date.now()}`, date: new Date(), read: false };
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      { $push: { notifications: notif } },
      { new: true }
    );
    ok(res, doc, 'Notification added');
  } catch (e) {
    fail(res, e);
  }
};

// ── 8k. Gamification — Customization Settings ───────────────────────────────
gamification.getCustomization = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id).select('customization').lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    ok(res, doc.customization || {});
  } catch (e) {
    fail(res, e);
  }
};

gamification.updateCustomization = async (req, res) => {
  try {
    const updates = {};
    Object.keys(req.body).forEach(key => {
      updates[`customization.${key}`] = req.body[key];
    });
    const doc = await TherapyGamification.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    ok(res, doc, 'Customization updated');
  } catch (e) {
    fail(res, e);
  }
};

// ── 8l. Gamification — Transaction Log ──────────────────────────────────────
gamification.getTransactionLog = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id)
      .select(
        'transactionLog virtualShop.coins virtualShop.gems playerProfile.totalXP rewards.points'
      )
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    let log = doc.transactionLog || [];
    if (req.query.type) log = log.filter(t => t.type === req.query.type);
    if (req.query.currency) log = log.filter(t => t.currency === req.query.currency);
    const limit = parseInt(req.query.limit) || 50;
    log = log.slice(-limit);
    ok(res, {
      transactions: log,
      balances: {
        xp: doc.playerProfile?.totalXP,
        coins: doc.virtualShop?.coins,
        gems: doc.virtualShop?.gems,
        points: doc.rewards?.points,
      },
    });
  } catch (e) {
    fail(res, e);
  }
};

// ── 8m. Gamification — Comprehensive Dashboard ──────────────────────────────
gamification.getDashboard = async (req, res) => {
  try {
    const doc = await TherapyGamification.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const now = new Date();
    const dashboard = {
      profile: doc.playerProfile,
      stats: {
        totalAchievements: doc.achievements?.length || 0,
        activeChallenges: doc.challenges?.filter(c => c.status === 'active')?.length || 0,
        activeQuests:
          doc.quests?.filter(q => ['available', 'accepted', 'in_progress'].includes(q.status))
            ?.length || 0,
        completedQuests: doc.quests?.filter(q => q.status === 'completed')?.length || 0,
        totalGameSessions: doc.engagementAnalytics?.totalSessions || 0,
        totalPlayTime: doc.engagementAnalytics?.totalPlayTime || 0,
        storyChaptersCompleted: doc.storyMode?.totalChaptersCompleted || 0,
        skillsMastered: doc.skillTree?.filter(s => s.isMastered)?.length || 0,
        friendsCount: doc.social?.friends?.length || 0,
        petLevel: doc.virtualPet?.pet?.level || 0,
      },
      currency: {
        xp: doc.playerProfile?.totalXP || 0,
        coins: doc.virtualShop?.coins || 0,
        gems: doc.virtualShop?.gems || 0,
        points: doc.rewards?.points || 0,
      },
      dailyGoals: doc.advancedAnalytics?.dailyGoals || {},
      activeEvents:
        doc.seasonalEvents?.filter(
          e => new Date(e.endDate) >= now && e.participationStatus === 'active'
        ) || [],
      recentNotifications: (doc.notifications || []).filter(n => !n.read).slice(-5),
      streak: {
        current: doc.playerProfile?.currentStreak || 0,
        longest: doc.playerProfile?.longestStreak || 0,
      },
      petStatus: doc.virtualPet?.active
        ? {
            name: doc.virtualPet.pet.name,
            happiness: doc.virtualPet.pet.happiness,
            hunger: doc.virtualPet.pet.hunger,
          }
        : null,
    };
    ok(res, dashboard);
  } catch (e) {
    fail(res, e);
  }
};

// ── 9. Medical Device IoT — Alerts, Readings, Maintenance ──────────────────
iotDevices.addReading = async (req, res) => {
  try {
    const doc = await MedicalDeviceIoT.findByIdAndUpdate(
      req.params.id,
      { $set: { latestReadings: { ...req.body, timestamp: new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Reading recorded');
  } catch (e) {
    fail(res, e);
  }
};

iotDevices.addAlertRule = async (req, res) => {
  try {
    const doc = await MedicalDeviceIoT.findByIdAndUpdate(
      req.params.id,
      { $push: { alertRules: req.body } },
      { new: true }
    );
    ok(res, doc, 'Alert rule added');
  } catch (e) {
    fail(res, e);
  }
};

iotDevices.acknowledgeAlert = async (req, res) => {
  try {
    const doc = await MedicalDeviceIoT.findOneAndUpdate(
      { _id: req.params.id, 'alertHistory._id': req.params.alertId },
      {
        $set: {
          'alertHistory.$.acknowledged': true,
          'alertHistory.$.acknowledgedBy': req.user?._id,
          'alertHistory.$.acknowledgedAt': new Date(),
          'alertHistory.$.resolution': req.body.resolution,
        },
      },
      { new: true }
    );
    ok(res, doc, 'Alert acknowledged');
  } catch (e) {
    fail(res, e);
  }
};

iotDevices.addMaintenance = async (req, res) => {
  try {
    const doc = await MedicalDeviceIoT.findByIdAndUpdate(
      req.params.id,
      {
        $push: { 'maintenance.history': { ...req.body, date: req.body.date || new Date() } },
        $set: { 'maintenance.lastMaintenance': new Date() },
      },
      { new: true }
    );
    ok(res, doc, 'Maintenance record added');
  } catch (e) {
    fail(res, e);
  }
};

iotDevices.getDevicesByCategory = async (_req, res) => {
  try {
    const data = await MedicalDeviceIoT.aggregate([
      { $group: { _id: { category: '$category', status: '$status' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

iotDevices.getActiveAlerts = async (_req, res) => {
  try {
    const data = await MedicalDeviceIoT.find(
      { 'alertHistory.acknowledged': false },
      { deviceId: 1, deviceName: 1, category: 1, assignedTo: 1, 'alertHistory.$': 1 }
    ).lean();
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

iotDevices.getMaintenanceDue = async (_req, res) => {
  try {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const data = await MedicalDeviceIoT.find({
      'maintenance.nextMaintenance': { $lte: nextWeek },
      status: { $ne: 'decommissioned' },
    })
      .select('deviceId deviceName category maintenance.nextMaintenance maintenance.schedule')
      .lean();
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

// ── 10. Inter-Center Collaboration — Communications & Approvals ─────────────
interCenter.addCommunication = async (req, res) => {
  try {
    const doc = await InterCenterCollab.findByIdAndUpdate(
      req.params.id,
      { $push: { communications: { ...req.body, date: new Date(), from: req.user?._id } } },
      { new: true }
    );
    ok(res, doc, 'Communication added');
  } catch (e) {
    fail(res, e);
  }
};

interCenter.addApproval = async (req, res) => {
  try {
    const doc = await InterCenterCollab.findByIdAndUpdate(
      req.params.id,
      { $push: { approvals: { ...req.body, approver: req.user?._id, date: new Date() } } },
      { new: true }
    );
    // Auto-update status if approved
    if (req.body.status === 'approved') {
      await InterCenterCollab.findByIdAndUpdate(req.params.id, { status: 'approved' });
    }
    ok(res, doc, 'Approval recorded');
  } catch (e) {
    fail(res, e);
  }
};

interCenter.addEvaluation = async (req, res) => {
  try {
    const doc = await InterCenterCollab.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          evaluation: { ...req.body, evaluatedBy: req.user?._id, evaluationDate: new Date() },
        },
      },
      { new: true }
    );
    ok(res, doc, 'Evaluation added');
  } catch (e) {
    fail(res, e);
  }
};

interCenter.getCollabTypeStats = async (_req, res) => {
  try {
    const data = await InterCenterCollab.aggregate([
      { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

interCenter.getPendingApprovals = async (_req, res) => {
  try {
    const data = await InterCenterCollab.find({ status: 'pending_approval' })
      .sort('-createdAt')
      .limit(50)
      .lean();
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

// ── 11. Post-Discharge — Follow-up, Contacts, Outcomes ─────────────────────
postDischarge.addContactLog = async (req, res) => {
  try {
    const doc = await PostDischargeTracking.findByIdAndUpdate(
      req.params.id,
      { $push: { contactLogs: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Contact log added');
  } catch (e) {
    fail(res, e);
  }
};

postDischarge.addOutcome = async (req, res) => {
  try {
    const doc = await PostDischargeTracking.findByIdAndUpdate(
      req.params.id,
      { $push: { longitudinalOutcomes: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Outcome recorded');
  } catch (e) {
    fail(res, e);
  }
};

postDischarge.addAlert = async (req, res) => {
  try {
    const doc = await PostDischargeTracking.findByIdAndUpdate(
      req.params.id,
      { $push: { alerts: { ...req.body, date: new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Alert added');
  } catch (e) {
    fail(res, e);
  }
};

postDischarge.addReadmission = async (req, res) => {
  try {
    const doc = await PostDischargeTracking.findByIdAndUpdate(
      req.params.id,
      {
        $push: { readmissions: { ...req.body, date: req.body.date || new Date() } },
        $set: { status: 're_enrolled' },
      },
      { new: true }
    );
    ok(res, doc, 'Readmission recorded');
  } catch (e) {
    fail(res, e);
  }
};

postDischarge.getOutcomeSummary = async (_req, res) => {
  try {
    const data = await PostDischargeTracking.aggregate([
      { $unwind: '$longitudinalOutcomes' },
      {
        $group: {
          _id: '$longitudinalOutcomes.functionalStatus',
          count: { $sum: 1 },
          avgQoL: { $avg: '$longitudinalOutcomes.qualityOfLife' },
          avgSatisfaction: { $avg: '$longitudinalOutcomes.satisfaction' },
        },
      },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

postDischarge.getMissedFollowUps = async (_req, res) => {
  try {
    const data = await PostDischargeTracking.find({
      followUpSchedule: {
        $elemMatch: { status: 'scheduled', scheduledDate: { $lt: new Date() } },
      },
    })
      .select('beneficiary beneficiaryName followUpSchedule')
      .lean();
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

postDischarge.getReadmissionRate = async (_req, res) => {
  try {
    const total = await PostDischargeTracking.countDocuments();
    const readmitted = await PostDischargeTracking.countDocuments({
      'readmissions.0': { $exists: true },
    });
    ok(res, {
      total,
      readmitted,
      rate: total ? ((readmitted / total) * 100).toFixed(1) + '%' : '0%',
    });
  } catch (e) {
    fail(res, e);
  }
};

// ── 12. AR Therapy — Sessions & Analytics ───────────────────────────────────
arTherapy.addSession = async (req, res) => {
  try {
    const session = { ...req.body, date: req.body.date || new Date() };
    const doc = await ARTherapy.findByIdAndUpdate(
      req.params.id,
      {
        $push: { sessions: session },
        $inc: { 'analytics.totalSessions': 1, 'analytics.totalPlayTime': req.body.duration || 0 },
      },
      { new: true }
    );
    ok(res, doc, 'AR session added');
  } catch (e) {
    fail(res, e);
  }
};

arTherapy.addProgressAssessment = async (req, res) => {
  try {
    const doc = await ARTherapy.findByIdAndUpdate(
      req.params.id,
      { $push: { progressAssessments: { ...req.body, date: req.body.date || new Date() } } },
      { new: true }
    );
    ok(res, doc, 'Progress assessment added');
  } catch (e) {
    fail(res, e);
  }
};

arTherapy.getTherapyGoalStats = async (_req, res) => {
  try {
    const data = await ARTherapy.aggregate([
      { $group: { _id: '$protocol.therapyGoal', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

arTherapy.getPerformanceAnalytics = async (_req, res) => {
  try {
    const data = await ARTherapy.aggregate([
      { $match: { status: 'active' } },
      {
        $project: {
          beneficiaryName: 1,
          totalSessions: '$analytics.totalSessions',
          avgAccuracy: '$analytics.averageAccuracy',
          avgEngagement: '$analytics.averageEngagement',
          complianceRate: '$analytics.complianceRate',
          improvementRate: '$analytics.improvementRate',
        },
      },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

arTherapy.getSideEffectStats = async (_req, res) => {
  try {
    const data = await ARTherapy.aggregate([
      { $unwind: '$sessions' },
      { $unwind: '$sessions.sideEffects' },
      { $group: { _id: '$sessions.sideEffects', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    ok(res, data);
  } catch (e) {
    fail(res, e);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard — لوحة تحكم شاملة
// ═══════════════════════════════════════════════════════════════════════════════

const dashboard = {
  getOverview: async (_req, res) => {
    try {
      const [
        cardiac,
        stroke,
        spinal,
        postSurg,
        geriatricCount,
        mental,
        geneticCount,
        gamificationCount,
        iot,
        collab,
        postDisch,
        ar,
      ] = await Promise.all([
        CardiacPulmonaryRehab.countDocuments(),
        StrokeRehab.countDocuments(),
        SpinalCordRehab.countDocuments(),
        PostSurgicalRehab.countDocuments(),
        GeriatricRehab.countDocuments(),
        AdvancedMentalHealth.countDocuments(),
        GeneticCounseling.countDocuments(),
        TherapyGamification.countDocuments(),
        MedicalDeviceIoT.countDocuments(),
        InterCenterCollab.countDocuments(),
        PostDischargeTracking.countDocuments(),
        ARTherapy.countDocuments(),
      ]);

      const grandTotal =
        cardiac +
        stroke +
        spinal +
        postSurg +
        geriatricCount +
        mental +
        geneticCount +
        gamificationCount +
        iot +
        collab +
        postDisch +
        ar;

      ok(res, {
        grandTotal,
        systems: {
          cardiacPulmonary: cardiac,
          strokeRehab: stroke,
          spinalCordRehab: spinal,
          postSurgicalRehab: postSurg,
          geriatricRehab: geriatricCount,
          advancedMentalHealth: mental,
          geneticCounseling: geneticCount,
          therapyGamification: gamificationCount,
          medicalDeviceIoT: iot,
          interCenterCollab: collab,
          postDischargeTracking: postDisch,
          arTherapy: ar,
        },
      });
    } catch (e) {
      fail(res, e);
    }
  },

  getAlerts: async (_req, res) => {
    try {
      const [iotAlerts, mentalCrisis, missedFollowUps, maintenanceDue] = await Promise.all([
        MedicalDeviceIoT.countDocuments({
          alertHistory: {
            $elemMatch: { acknowledged: false, severity: { $in: ['critical', 'emergency'] } },
          },
        }),
        AdvancedMentalHealth.countDocuments({ status: 'crisis' }),
        PostDischargeTracking.countDocuments({
          followUpSchedule: {
            $elemMatch: { status: 'scheduled', scheduledDate: { $lt: new Date() } },
          },
        }),
        MedicalDeviceIoT.countDocuments({
          'maintenance.nextMaintenance': { $lte: new Date() },
          status: { $ne: 'decommissioned' },
        }),
      ]);
      ok(res, {
        iotAlerts,
        mentalCrisis,
        missedFollowUps,
        maintenanceDue,
        total: iotAlerts + mentalCrisis + missedFollowUps + maintenanceDue,
      });
    } catch (e) {
      fail(res, e);
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  cardiacPulmonary,
  strokeRehab,
  spinalCord,
  postSurgical,
  geriatric,
  mentalHealth,
  genetic,
  gamification,
  iotDevices,
  interCenter,
  postDischarge,
  arTherapy,
  dashboard,
};
