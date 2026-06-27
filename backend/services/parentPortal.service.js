const ICFAssessment = require('../models/assessment/ICFAssessment');
const CarePlanVersion = require('../models/CarePlanVersion');
const ClinicalSession = require('../domains/sessions/models/ClinicalSession');
const TherapySession = require('../models/TherapySession');
const TherapeuticGoal = require('../domains/goals/models/TherapeuticGoal');
const Goal = require('../models/Goal');
const Document = require('../models/Document');
const Beneficiary = require('../models/Beneficiary');
const ParentPortal = require('../models/ParentPortal/ParentPortal');

/**
 * Parent Portal Service
 * خدمة بوابة أولياء الأمور
 */

async function getBeneficiaryOverview(beneficiaryId) {
  try {
    console.log(`[ParentPortal] Getting overview for beneficiary: ${beneficiaryId}`);

    const beneficiary = await Beneficiary.findById(beneficiaryId)
      .select('firstName lastName firstName_ar lastName_ar dateOfBirth disability medicalInfo')
      .lean();

    if (!beneficiary) {
      return { success: false, message: 'Beneficiary not found' };
    }

    const name = beneficiary.firstName_ar && beneficiary.lastName_ar
      ? `${beneficiary.firstName_ar} ${beneficiary.lastName_ar}`
      : `${beneficiary.firstName || ''} ${beneficiary.lastName || ''}`.trim();

    const latestICF = await ICFAssessment.findLatestByPatient(beneficiaryId);

    const carePlan = await CarePlanVersion.findOne({
      beneficiaryId,
      status: { $nin: ['superseded', 'archived'] },
    }).sort({ createdAt: -1 }).lean();

    const SessionModel = ClinicalSession || TherapySession;
    const upcomingSessions = SessionModel
      ? await SessionModel.find({
          beneficiaryId,
          scheduledDate: { $gte: new Date() },
          status: 'scheduled',
        }).sort({ scheduledDate: 1 }).limit(3).lean()
      : [];

    const recentNotes = SessionModel
      ? await SessionModel.find({
          beneficiaryId,
          status: 'completed',
          notes: { $exists: true, $ne: '' },
        }).sort({ scheduledDate: -1 }).limit(3).select('notes scheduledDate').lean()
      : [];

    return {
      success: true,
      beneficiary: {
        id: beneficiaryId,
        name: name || 'Unknown',
        age: calculateAge(beneficiary.dateOfBirth),
        diagnosis: beneficiary.disability?.description || beneficiary.disability?.primaryType || null,
      },
      icf: latestICF
        ? {
            overallScore: latestICF.overallScore,
            domainScores: latestICF.domainScores,
            assessmentDate: latestICF.assessmentDate,
            coreSetType: latestICF.coreSetType,
          }
        : null,
      carePlan: carePlan
        ? {
            planId: carePlan.planId,
            status: carePlan.status,
            versionNumber: carePlan.versionNumber,
            goalCount: (carePlan.goals || []).length,
            achievedGoals: (carePlan.goals || []).filter(g => g.status === 'achieved').length,
          }
        : null,
      upcomingSessions: upcomingSessions.map(s => ({
        id: s._id,
        date: s.scheduledDate || s.date,
        type: s.type || s.sessionType || 'unknown',
        therapist: s.therapistName || s.therapist?.name || 'TBD',
      })),
      recentActivities: recentNotes.map(n => ({
        date: n.scheduledDate || n.date,
        note: n.notes?.substring(0, 100) || '',
      })),
    };
  } catch (error) {
    console.error('[ParentPortal] getBeneficiaryOverview error:', error);
    return { success: false, message: error.message };
  }
}

async function getProgressTimeline(beneficiaryId, months = 6) {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const icfHistory = await ICFAssessment.find({
      beneficiary: beneficiaryId,
      status: 'completed',
      assessmentDate: { $gte: since },
    }).sort({ assessmentDate: 1 }).select('assessmentDate overallScore domainScores').lean();

    const SessionModel = ClinicalSession || TherapySession;
    const sessions = SessionModel
      ? await SessionModel.find({
          beneficiaryId,
          status: 'completed',
          scheduledDate: { $gte: since },
        }).sort({ scheduledDate: 1 }).select('scheduledDate status').lean()
      : [];

    const GoalModel = TherapeuticGoal || Goal;
    const idField = TherapeuticGoal ? 'beneficiaryId' : 'participantId';
    const goals = GoalModel
      ? await GoalModel.find({
          [idField]: beneficiaryId,
          createdAt: { $gte: since },
        }).sort({ createdAt: 1 }).select('createdAt progressPercentage status').lean()
      : [];

    const timeline = [];
    const monthlyData = {};

    for (const icf of icfHistory) {
      const month = formatMonth(icf.assessmentDate);
      if (!monthlyData[month]) monthlyData[month] = { month, icfScore: null, sessions: 0, goalsUpdated: 0 };
      monthlyData[month].icfScore = icf.overallScore;
    }

    for (const s of sessions) {
      const month = formatMonth(s.scheduledDate);
      if (!monthlyData[month]) monthlyData[month] = { month, icfScore: null, sessions: 0, goalsUpdated: 0 };
      monthlyData[month].sessions += 1;
    }

    for (const g of goals) {
      const month = formatMonth(g.createdAt);
      if (!monthlyData[month]) monthlyData[month] = { month, icfScore: null, sessions: 0, goalsUpdated: 0 };
      monthlyData[month].goalsUpdated += 1;
    }

    return {
      success: true,
      timeline: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
      icfHistory: icfHistory.map(i => ({ date: i.assessmentDate, score: i.overallScore })),
      totalSessions: sessions.length,
      goalsTracked: goals.length,
    };
  } catch (error) {
    console.error('[ParentPortal] getProgressTimeline error:', error);
    return { success: false, message: error.message };
  }
}

async function getHomePrograms(beneficiaryId) {
  try {
    const GoalModel = TherapeuticGoal || Goal;
    const idField = TherapeuticGoal ? 'beneficiaryId' : 'participantId';

    const goals = GoalModel
      ? await GoalModel.find({
          [idField]: beneficiaryId,
          status: 'active',
        }).select('statement description progressPercentage targetDate').lean()
      : [];

    const programs = goals.map(g => ({
      id: g._id,
      title: g.statement || g.title || 'Program',
      description: g.description || '',
      progress: g.progressPercentage || 0,
      dueDate: g.targetDate || null,
      instructions: g.description || 'Follow therapist instructions',
      completed: (g.progressPercentage || 0) >= 100,
    }));

    return { success: true, programs };
  } catch (error) {
    console.error('[ParentPortal] getHomePrograms error:', error);
    return { success: false, message: error.message };
  }
}

async function sendMessageToTeam(beneficiaryId, senderId, message) {
  try {
    console.log(`[ParentPortal] Message from ${senderId} about beneficiary ${beneficiaryId}: ${message.substring(0, 50)}...`);
    return {
      success: true,
      message: 'Message sent to care team',
      data: { beneficiaryId, senderId, sentAt: new Date() },
    };
  } catch (error) {
    console.error('[ParentPortal] sendMessageToTeam error:', error);
    return { success: false, message: error.message };
  }
}

async function getNotifications(beneficiaryId) {
  try {
    const now = new Date();
    const notifications = [];

    const latestICF = await ICFAssessment.findLatestByPatient(beneficiaryId);
    if (latestICF?.assessmentDate) {
      const monthsSince = (now - new Date(latestICF.assessmentDate)) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince > 6) {
        notifications.push({
          type: 'icf_reassessment_due',
          title: 'تقييم ICF متأخر',
          message: 'تقييم ICF الأخير كان قبل أكثر من 6 أشهر. يرجى مراجعة الفريق.',
          severity: 'medium',
          createdAt: new Date(),
          read: false,
        });
      }
    }

    const SessionModel = ClinicalSession || TherapySession;
    const upcoming = SessionModel
      ? await SessionModel.find({
          beneficiaryId,
          scheduledDate: { $gte: now },
          status: 'scheduled',
        }).sort({ scheduledDate: 1 }).limit(1).lean()
      : [];

    if (upcoming.length > 0) {
      const session = upcoming[0];
      const sessionDate = new Date(session.scheduledDate || session.date);
      const hoursUntil = (sessionDate - now) / (1000 * 60 * 60);
      if (hoursUntil > 0 && hoursUntil <= 24) {
        notifications.push({
          type: 'upcoming_session',
          title: 'جلسة قادمة',
          message: `لديك جلسة مجدولة خلال ${Math.ceil(hoursUntil)} ساعة.`,
          severity: 'low',
          createdAt: new Date(),
          read: false,
        });
      }
    }

    const GoalModel = TherapeuticGoal || Goal;
    const idField = TherapeuticGoal ? 'beneficiaryId' : 'participantId';
    const achievedGoals = GoalModel
      ? await GoalModel.countDocuments({
          [idField]: beneficiaryId,
          status: 'achieved',
          updatedAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        })
      : 0;

    if (achievedGoals > 0) {
      notifications.push({
        type: 'goal_achieved',
        title: 'تهانينا!',
        message: `${achievedGoals} أهداف جديدة تم تحقيقها هذا الأسبوع.`,
        severity: 'success',
        createdAt: new Date(),
        read: false,
      });
    }

    return { success: true, notifications, unreadCount: notifications.filter(n => !n.read).length };
  } catch (error) {
    console.error('[ParentPortal] getNotifications error:', error);
    return { success: false, message: error.message };
  }
}

async function getAvailableReports(beneficiaryId) {
  try {
    const reports = await Document.find({
      entityType: 'Beneficiary',
      entityId: beneficiaryId.toString(),
      sourceModule: 'clinical',
      folder: 'icf-reports',
    }).sort({ createdAt: -1 }).select('title createdAt fileType').lean();

    return {
      success: true,
      reports: reports.map(r => ({
        id: r._id,
        title: r.title,
        date: r.createdAt,
        type: r.fileType,
      })),
    };
  } catch (error) {
    console.error('[ParentPortal] getAvailableReports error:', error);
    return { success: false, message: error.message };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function formatMonth(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = {
  getBeneficiaryOverview,
  getProgressTimeline,
  getHomePrograms,
  sendMessageToTeam,
  getNotifications,
  getAvailableReports,
};
