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
  async listStudies({ status, type, piId, keyword, page = 1, limit = 20, branchFilter = {} } = {}) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    // W1602 — branchFilter = {branchId} for a restricted caller (own branch only), {} for
    // cross-branch/HQ. Was unscoped → cross-branch read of every study.
    const q = { isDeleted: { $ne: true }, ...branchFilter };
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
  async getStudy(id, branchFilter = {}) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    // W1602 — only `principalInvestigator` exists on the canonical ResearchStudy schema.
    // The former coInvestigators.userId / researchTeam.userId / participants.beneficiaryId
    // populates targeted paths the canonical schema does NOT declare → Mongoose strictPopulate
    // threw on EVERY getStudy call (500, pre-existing model↔service divergence). Reduced to the
    // real path so the branch-scoped read actually returns the study.
    return ResearchStudy.findOne({ _id: id, ...branchFilter })
      .populate('principalInvestigator', 'name email')
      .lean();
  }

  /* ── Update study ── */
  async updateStudy(id, data, branchFilter = {}) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    return ResearchStudy.findOneAndUpdate({ _id: id, ...branchFilter }, data, {
      returnDocument: 'after',
    });
  }

  /* ── Transition status ── */
  async transitionStatus(id, newStatus, userId, reason, branchFilter = {}) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    const study = await ResearchStudy.findOne({ _id: id, ...branchFilter });
    if (!study) throw new Error('Study not found');
    const oldStatus = study.status;
    study.status = newStatus;
    study.statusHistory.push({ from: oldStatus, to: newStatus, changedBy: userId, reason });
    await study.save();
    this.emit('research:status:changed', { studyId: id, from: oldStatus, to: newStatus });
    return study;
  }

  /* ── Enroll participant ── */
  async enrollParticipant(studyId, participantData, branchFilter = {}) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    const study = await ResearchStudy.findOne({ _id: studyId, ...branchFilter });
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
  async withdrawParticipant(studyId, beneficiaryId, reason, branchFilter = {}) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    const study = await ResearchStudy.findOne({ _id: studyId, ...branchFilter });
    if (!study) throw new Error('Study not found');
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
  async recordConsent(studyId, beneficiaryId, consentStatus, branchFilter = {}) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    return ResearchStudy.findOneAndUpdate(
      { _id: studyId, ...branchFilter, 'participants.beneficiaryId': beneficiaryId },
      {
        $set: {
          'participants.$.consentStatus': consentStatus,
          'participants.$.consentDate': new Date(),
        },
      },
      { returnDocument: 'after' }
    );
  }

  /* ── Add milestone ── */
  async addMilestone(studyId, milestone, branchFilter = {}) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    return ResearchStudy.findOneAndUpdate(
      { _id: studyId, ...branchFilter },
      { $push: { milestones: milestone } },
      { returnDocument: 'after' }
    );
  }

  /* ── Add publication ── */
  async addPublication(studyId, publication, branchFilter = {}) {
    const ResearchStudy = mongoose.model('ResearchStudy');
    return ResearchStudy.findOneAndUpdate(
      { _id: studyId, ...branchFilter },
      { $push: { publications: publication } },
      { returnDocument: 'after' }
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
