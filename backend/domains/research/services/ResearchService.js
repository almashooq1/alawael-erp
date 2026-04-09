/**
 * ResearchService — خدمة البحث السريري
 *
 * إدارة الدراسات البحثية، المشاركين، جمع البيانات، النتائج
 */

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

class ResearchService extends BaseService {
  constructor() {
    super({ serviceName: 'ResearchService', cachePrefix: 'research' });
  }

  /* ── Create study ── */
  async createStudy(data) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    // Auto-generate code
    const count = await ResearchStudy.countDocuments();
    data.code = data.code || `RS-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const study = await ResearchStudy.create(data);
    this.emit('research:study:created', { studyId: study._id });
    return study;
  }

  /* ── List studies ── */
  async listStudies({ status, type, piId, keyword, page = 1, limit = 20 } = {}) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    const q = { isDeleted: { $ne: true } };
    if (status) q.status = status;
    if (type) q.type = type;
    if (piId) q.principalInvestigator = piId;
    if (keyword)
      q.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { keywords: keyword },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    const total = await ResearchStudy.countDocuments(q);
    const data = await ResearchStudy.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('principalInvestigator', 'name email')
      .lean();
    return { data, total, page: +page, pages: Math.ceil(total / limit) };
  }

  /* ── Get study ── */
  async getStudy(id) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    return ResearchStudy.findById(id)
      .populate('principalInvestigator', 'name email')
      .populate('coInvestigators.userId', 'name email')
      .populate('researchTeam.userId', 'name email')
      .populate('participants.beneficiaryId', 'firstName lastName fileNumber')
      .lean();
  }

  /* ── Update study ── */
  async updateStudy(id, data) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    return ResearchStudy.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Transition status ── */
  async transitionStatus(id, newStatus, userId, reason) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    const study = await ResearchStudy.findById(id);
    if (!study) throw new Error('Study not found');
    const oldStatus = study.status;
    study.status = newStatus;
    study.statusHistory.push({ from: oldStatus, to: newStatus, changedBy: userId, reason });
    await study.save();
    this.emit('research:status:changed', { studyId: id, from: oldStatus, to: newStatus });
    return study;
  }

  /* ── Enroll participant ── */
  async enrollParticipant(studyId, participantData) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    const study = await ResearchStudy.findById(studyId);
    if (!study) throw new Error('Study not found');

    const count = study.participants.length;
    study.participants.push({
      ...participantData,
      participantCode: participantData.participantCode || `P${String(count + 1).padStart(3, '0')}`,
      enrolledAt: new Date(),
      status: 'enrolled',
    });
    study.design.sampleSize.current = study.participants.filter(p =>
      ['enrolled', 'active', 'completed'].includes(p.status)
    ).length;
    await study.save();
    this.emit('research:participant:enrolled', {
      studyId,
      beneficiaryId: participantData.beneficiaryId,
    });
    return study;
  }

  /* ── Withdraw participant ── */
  async withdrawParticipant(studyId, beneficiaryId, reason) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    const study = await ResearchStudy.findById(studyId);
    const p = study.participants.find(pp => pp.beneficiaryId?.toString() === beneficiaryId);
    if (p) {
      p.status = 'withdrawn';
      p.withdrawnAt = new Date();
      p.withdrawalReason = reason;
      p.consentStatus = 'withdrawn';
    }
    study.design.sampleSize.current = study.participants.filter(pp =>
      ['enrolled', 'active', 'completed'].includes(pp.status)
    ).length;
    await study.save();
    return study;
  }

  /* ── Record consent ── */
  async recordConsent(studyId, beneficiaryId, consentStatus) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    return ResearchStudy.findOneAndUpdate(
      { _id: studyId, 'participants.beneficiaryId': beneficiaryId },
      {
        $set: {
          'participants.$.consentStatus': consentStatus,
          'participants.$.consentDate': new Date(),
        },
      },
      { new: true }
    );
  }

  /* ── Add milestone ── */
  async addMilestone(studyId, milestone) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    return ResearchStudy.findByIdAndUpdate(
      studyId,
      { $push: { milestones: milestone } },
      { new: true }
    );
  }

  /* ── Add publication ── */
  async addPublication(studyId, publication) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    return ResearchStudy.findByIdAndUpdate(
      studyId,
      { $push: { publications: publication } },
      { new: true }
    );
  }

  /* ── Dashboard ── */
  async getDashboard(branchId) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

    const [statusStats, typeStats, totalParticipants] = await Promise.all([
      ResearchStudy.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ResearchStudy.aggregate([
        { $match: match },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      ResearchStudy.aggregate([
        { $match: match },
        { $unwind: '$participants' },
        { $match: { 'participants.status': { $in: ['enrolled', 'active'] } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      byStatus: Object.fromEntries(statusStats.map(s => [s._id, s.count])),
      byType: Object.fromEntries(typeStats.map(s => [s._id, s.count])),
      totalStudies: statusStats.reduce((s, r) => s + r.count, 0),
      activeParticipants: totalParticipants[0]?.count || 0,
    };
  }
}

const researchService = new ResearchService();
module.exports = { researchService };
