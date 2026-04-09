/**
 * FamilyService — خدمة التواصل مع الأسرة وبوابة أولياء الأمور
 *
 * @module domains/family/services/FamilyService
 */

const mongoose = require('mongoose');
const logger = require('../../../utils/logger');

class FamilyService {
  // ═══════════════════════════════════════════════════════════════════════════
  // Family Members CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async addFamilyMember(data) {
    const FamilyMember = mongoose.model('FamilyMember');
    return FamilyMember.create(data);
  }

  async getFamilyMembers(beneficiaryId) {
    const FamilyMember = mongoose.model('FamilyMember');
    return FamilyMember.find({ beneficiaryId, isDeleted: false })
      .sort({ isPrimaryContact: -1 })
      .lean();
  }

  async updateFamilyMember(memberId, data) {
    const FamilyMember = mongoose.model('FamilyMember');
    return FamilyMember.findByIdAndUpdate(memberId, data, { new: true }).lean();
  }

  async getPrimaryContact(beneficiaryId) {
    const FamilyMember = mongoose.model('FamilyMember');
    return FamilyMember.findOne({ beneficiaryId, isPrimaryContact: true, isDeleted: false }).lean();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Consents
  // ═══════════════════════════════════════════════════════════════════════════

  async addConsent(memberId, consent) {
    const FamilyMember = mongoose.model('FamilyMember');
    return FamilyMember.findByIdAndUpdate(
      memberId,
      { $push: { consents: { ...consent, grantedAt: new Date() } } },
      { new: true }
    ).lean();
  }

  async revokeConsent(memberId, consentId) {
    const FamilyMember = mongoose.model('FamilyMember');
    return FamilyMember.findOneAndUpdate(
      { _id: memberId, 'consents._id': consentId },
      { $set: { 'consents.$.status': 'revoked', 'consents.$.revokedAt': new Date() } },
      { new: true }
    ).lean();
  }

  async getActiveConsents(beneficiaryId) {
    const FamilyMember = mongoose.model('FamilyMember');
    const members = await FamilyMember.find({ beneficiaryId, isDeleted: false }).lean();
    const consents = [];
    for (const m of members) {
      for (const c of m.consents || []) {
        if (c.status === 'granted') {
          consents.push({ ...c, memberName: `${m.firstName} ${m.lastName}`, memberId: m._id });
        }
      }
    }
    return consents;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Communications
  // ═══════════════════════════════════════════════════════════════════════════

  async logCommunication(data) {
    const FamilyCommunication = mongoose.model('FamilyCommunication');
    const comm = await FamilyCommunication.create(data);

    // Update family member last contact
    if (data.familyMemberId) {
      const FamilyMember = mongoose.model('FamilyMember');
      await FamilyMember.findByIdAndUpdate(data.familyMemberId, {
        lastContactDate: new Date(),
        $inc: { totalInteractions: 1 },
      });
    }

    // Log to timeline
    try {
      const CareTimeline = mongoose.model('CareTimeline');
      await CareTimeline.create({
        beneficiaryId: data.beneficiaryId,
        episodeId: data.episodeId,
        eventType: data.type === 'home_visit' ? 'home_visit' : 'family_contact',
        title: data.subject || `تواصل أسري: ${data.type}`,
        description: data.summary,
        performedBy: data.staffId,
        linkedEntity: { model: 'FamilyCommunication', id: comm._id },
      });
    } catch (err) {
      logger.warn(`[FamilyService] Timeline log error: ${err.message}`);
    }

    return comm;
  }

  async getCommunicationHistory(beneficiaryId, { type, limit = 30 } = {}) {
    const FamilyCommunication = mongoose.model('FamilyCommunication');
    const filter = { beneficiaryId, isDeleted: false };
    if (type) filter.type = type;
    return FamilyCommunication.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('familyMemberId', 'firstName lastName relationship')
      .lean();
  }

  async getPendingFollowUps(filters = {}) {
    const FamilyCommunication = mongoose.model('FamilyCommunication');
    const query = {
      requiresFollowUp: true,
      followUpStatus: { $in: ['pending', 'overdue'] },
      isDeleted: false,
    };
    if (filters.staffId) query.followUpAssignedTo = filters.staffId;
    if (filters.branchId) query.branchId = filters.branchId;
    return FamilyCommunication.find(query)
      .sort({ followUpDate: 1 })
      .limit(filters.limit || 50)
      .populate('beneficiaryId', 'personalInfo.firstName personalInfo.lastName fileNumber')
      .populate('familyMemberId', 'firstName lastName')
      .lean();
  }

  async completeFollowUp(commId, userId, note) {
    const FamilyCommunication = mongoose.model('FamilyCommunication');
    return FamilyCommunication.findByIdAndUpdate(
      commId,
      { followUpStatus: 'completed', followUpNote: note },
      { new: true }
    ).lean();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Homework
  // ═══════════════════════════════════════════════════════════════════════════

  async assignHomework(commData) {
    // Create communication record of type homework_assignment
    return this.logCommunication({
      ...commData,
      type: 'homework_assignment',
    });
  }

  async updateHomeworkStatus(commId, homeworkId, status, feedback) {
    const FamilyCommunication = mongoose.model('FamilyCommunication');
    const update = { 'homework.$.status': status };
    if (feedback) update['homework.$.familyFeedback'] = feedback;
    if (status === 'completed') update['homework.$.completedAt'] = new Date();

    return FamilyCommunication.findOneAndUpdate(
      { _id: commId, 'homework._id': homeworkId },
      { $set: update },
      { new: true }
    ).lean();
  }

  async getPendingHomework(beneficiaryId) {
    const FamilyCommunication = mongoose.model('FamilyCommunication');
    const comms = await FamilyCommunication.find({
      beneficiaryId,
      type: 'homework_assignment',
      'homework.status': { $in: ['assigned', 'in_progress'] },
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Flatten homework items
    const pending = [];
    for (const c of comms) {
      for (const hw of c.homework || []) {
        if (hw.status === 'assigned' || hw.status === 'in_progress') {
          pending.push({ ...hw, communicationId: c._id, assignedAt: c.createdAt });
        }
      }
    }
    return pending;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Family Portal View (safe, filtered data)
  // ═══════════════════════════════════════════════════════════════════════════

  async getFamilyPortalData(beneficiaryId, familyMemberId) {
    const [Beneficiary, TherapeuticGoal, ClinicalSession] = [
      mongoose.model('Beneficiary'),
      mongoose.model('TherapeuticGoal'),
      mongoose.model('ClinicalSession'),
    ];

    const FamilyCommunication = mongoose.model('FamilyCommunication');

    const [beneficiary, goals, recentSessions, communications, homework] = await Promise.all([
      Beneficiary.findById(beneficiaryId)
        .select(
          'personalInfo.firstName personalInfo.lastName personalInfo.dateOfBirth disability.primaryDiagnosis'
        )
        .lean(),
      TherapeuticGoal.find({
        beneficiaryId,
        status: { $in: ['active', 'in_progress'] },
        isDeleted: false,
      })
        .select('title domain currentProgress targetValue unit status')
        .lean(),
      ClinicalSession.find({ beneficiaryId, status: 'completed', isDeleted: false })
        .sort({ sessionDate: -1 })
        .limit(10)
        .select('sessionDate type soapNote.plan goalsProgress')
        .lean(),
      FamilyCommunication.find({ beneficiaryId, visibleToFamily: true, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(15)
        .select('type subject summary createdAt homework')
        .lean(),
      this.getPendingHomework(beneficiaryId),
    ]);

    return {
      beneficiary: {
        name: beneficiary
          ? `${beneficiary.personalInfo?.firstName} ${beneficiary.personalInfo?.lastName}`
          : null,
        dateOfBirth: beneficiary?.personalInfo?.dateOfBirth,
        diagnosis: beneficiary?.disability?.primaryDiagnosis,
      },
      activeGoals: goals.map(g => ({
        title: g.title,
        domain: g.domain,
        progress: g.currentProgress,
        target: g.targetValue,
        unit: g.unit,
      })),
      recentSessions: recentSessions.map(s => ({
        date: s.sessionDate,
        type: s.type,
        plan: s.soapNote?.plan,
        goalsProgress: (s.goalsProgress || []).map(gp => ({
          goalTitle: gp.goalTitle,
          progressDelta: gp.progressDelta,
        })),
      })),
      communications: communications.map(c => ({
        type: c.type,
        subject: c.subject,
        summary: c.summary,
        date: c.createdAt,
      })),
      pendingHomework: homework,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Dashboard / Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboard(branchId) {
    const FamilyCommunication = mongoose.model('FamilyCommunication');
    const FamilyMember = mongoose.model('FamilyMember');

    const branchFilter = branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};

    const [commStats, pendingFollowUps, lowEngagement, recentComms] = await Promise.all([
      // Communication type distribution (last 30 days)
      FamilyCommunication.aggregate([
        {
          $match: {
            isDeleted: false,
            createdAt: { $gte: new Date(Date.now() - 30 * 86400000) },
            ...branchFilter,
          },
        },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Pending follow-ups count
      FamilyCommunication.countDocuments({
        requiresFollowUp: true,
        followUpStatus: { $in: ['pending', 'overdue'] },
        isDeleted: false,
        ...branchFilter,
      }),

      // Low engagement families
      FamilyMember.find({
        engagementScore: { $lt: 30 },
        isDeleted: false,
        ...branchFilter,
      })
        .select('firstName lastName beneficiaryId lastContactDate engagementScore')
        .populate('beneficiaryId', 'personalInfo.firstName personalInfo.lastName fileNumber')
        .sort({ engagementScore: 1 })
        .limit(20)
        .lean(),

      // Recent communications
      FamilyCommunication.find({ isDeleted: false, ...branchFilter })
        .sort({ createdAt: -1 })
        .limit(15)
        .select('type subject outcome beneficiaryId createdAt')
        .populate('beneficiaryId', 'personalInfo.firstName personalInfo.lastName')
        .lean(),
    ]);

    return {
      communicationsByType: Object.fromEntries(commStats.map(c => [c._id, c.count])),
      totalLast30Days: commStats.reduce((sum, c) => sum + c.count, 0),
      pendingFollowUps,
      lowEngagementFamilies: lowEngagement,
      recentCommunications: recentComms,
    };
  }
}

const familyService = new FamilyService();

module.exports = { familyService, FamilyService };
