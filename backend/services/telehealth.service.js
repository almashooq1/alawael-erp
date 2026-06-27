/**
 * Telehealth Remote Rehabilitation Service
 * خدمة التأهيل عن بُعد
 * @version 1.0.0
 */

const { v4: uuidv4 } = require('uuid');
const { RehabTelehealthSession } = require('../models/Telehealth');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateRoomId() {
  return `rehab-${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}

function generateMeetingLink(platform, roomId) {
  switch (platform) {
    case 'zoom':
      return `https://zoom.us/j/${roomId}`;
    case 'google_meet':
      return `https://meet.google.com/${roomId}`;
    case 'teams':
      return `https://teams.microsoft.com/l/meetup-join/${roomId}`;
    case 'custom':
      return `${process.env.CUSTOM_MEET_URL || ''}/${roomId}`;
    default:
      return `https://zoom.us/j/${roomId}`;
  }
}

// ─── 1. Schedule Telehealth Session ──────────────────────────────────────────

async function scheduleTelehealthSession(data) {
  const roomId = generateRoomId();
  const meetingLink = data.meetingLink || generateMeetingLink(data.platform || 'zoom', roomId);

  const session = await RehabTelehealthSession.create({
    sessionId: data.sessionId,
    beneficiaryId: data.beneficiaryId,
    therapistId: data.therapistId,
    scheduledAt: data.scheduledAt,
    duration: data.duration || 45,
    status: 'scheduled',
    meetingLink,
    roomId,
    platform: data.platform || 'zoom',
    notes: data.notes || '',
    parentAttended: false,
    consentSigned: data.consentSigned || false,
    consentDate: data.consentDate || null,
    sessionGoals: data.sessionGoals || [],
    materials: data.materials || [],
    recordings: [],
    technicalIssues: [],
  });

  return session;
}

// ─── 2. Get Upcoming Sessions ───────────────────────────────────────────────

async function getUpcomingSessions(therapistId, beneficiaryId) {
  const now = new Date();
  const filter = {
    scheduledAt: { $gte: now },
    status: { $in: ['scheduled', 'in_progress'] },
  };

  if (therapistId) filter.therapistId = therapistId;
  if (beneficiaryId) filter.beneficiaryId = beneficiaryId;

  return RehabTelehealthSession.find(filter)
    .populate('beneficiaryId', 'name nationalId')
    .populate('therapistId', 'name email')
    .populate('sessionId', 'sessionNumber type')
    .sort({ scheduledAt: 1 })
    .lean();
}

// ─── 3. Start Session ─────────────────────────────────────────────────────────

async function startSession(sessionId) {
  const session = await RehabTelehealthSession.findById(sessionId);
  if (!session) throw new Error('الجلسة غير موجودة');

  if (!['scheduled', 'no_show'].includes(session.status)) {
    throw new Error(`لا يمكن بدء الجلسة في وضعها الحالي: ${session.status}`);
  }

  session.status = 'in_progress';
  await session.save();

  return session;
}

// ─── 4. Complete Session ────────────────────────────────────────────────────

async function completeSession(sessionId, notes, goalsProgress) {
  const session = await RehabTelehealthSession.findById(sessionId);
  if (!session) throw new Error('الجلسة غير موجودة');

  if (session.status !== 'in_progress') {
    throw new Error('الجلسة ليست جارية حالياً');
  }

  session.status = 'completed';
  if (notes !== undefined) session.notes = notes;

  if (Array.isArray(goalsProgress) && goalsProgress.length > 0) {
    goalsProgress.forEach(gp => {
      const existing = session.sessionGoals.find(
        g => String(g.goalId) === String(gp.goalId)
      );
      if (existing) {
        existing.progressNotes = gp.progressNotes || existing.progressNotes;
        existing.progressPercentage = gp.progressPercentage ?? existing.progressPercentage;
      } else {
        session.sessionGoals.push(gp);
      }
    });
  }

  await session.save();
  return session;
}

// ─── 5. Get Session Materials ───────────────────────────────────────────────

async function getSessionMaterials(sessionId) {
  const session = await RehabTelehealthSession.findById(sessionId).select('materials').lean();
  if (!session) throw new Error('الجلسة غير موجودة');
  return session.materials || [];
}

// ─── 6. Add Session Material ──────────────────────────────────────────────────

async function addSessionMaterial(sessionId, material) {
  const session = await RehabTelehealthSession.findById(sessionId);
  if (!session) throw new Error('الجلسة غير موجودة');

  session.materials.push({
    title: material.title,
    url: material.url,
    type: material.type || 'pdf',
  });

  await session.save();
  return session.materials;
}

// ─── 7. Record Technical Issue ────────────────────────────────────────────────

async function recordTechnicalIssue(sessionId, issue) {
  const session = await RehabTelehealthSession.findById(sessionId);
  if (!session) throw new Error('الجلسة غير موجودة');

  session.technicalIssues.push({
    description: issue.description,
    resolved: issue.resolved || false,
    timestamp: new Date(),
  });

  await session.save();
  return session.technicalIssues;
}

// ─── Statistics ───────────────────────────────────────────────────────────────

async function getTelehealthStatistics(therapistId, beneficiaryId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const match = {};
  if (therapistId) match.therapistId = therapistId;
  if (beneficiaryId) match.beneficiaryId = beneficiaryId;

  const [totalSessions, completedThisMonth, cancelledCount, avgDuration, totalIssues] = await Promise.all([
    RehabTelehealthSession.countDocuments(match),
    RehabTelehealthSession.countDocuments({
      ...match,
      status: 'completed',
      updatedAt: { $gte: startOfMonth },
    }),
    RehabTelehealthSession.countDocuments({ ...match, status: 'cancelled' }),
    RehabTelehealthSession.aggregate([
      { $match: { ...match, status: 'completed' } },
      { $group: { _id: null, avg: { $avg: '$duration' } } },
    ]),
    RehabTelehealthSession.aggregate([
      { $match: match },
      { $project: { issueCount: { $size: { $ifNull: ['$technicalIssues', []] } } } },
      { $group: { _id: null, total: { $sum: '$issueCount' } } },
    ]),
  ]);

  const completedAllTime = await RehabTelehealthSession.countDocuments({
    ...match,
    status: 'completed',
  });

  const completionRate = totalSessions > 0 ? ((completedAllTime / totalSessions) * 100).toFixed(1) : 0;

  return {
    totalSessions,
    completedThisMonth,
    cancelledCount,
    avgDuration: avgDuration[0]?.avg ? Math.round(avgDuration[0].avg) : 0,
    totalIssues: totalIssues[0]?.total || 0,
    completionRate: Number(completionRate),
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  scheduleTelehealthSession,
  getUpcomingSessions,
  startSession,
  completeSession,
  getSessionMaterials,
  addSessionMaterial,
  recordTechnicalIssue,
  getTelehealthStatistics,
};
