/**
 * GroupTherapyService — خدمة إدارة العلاج الجماعي
 *
 * @module domains/group-therapy/services/GroupTherapyService
 */

const mongoose = require('mongoose');

class GroupTherapyService {
  // ═══════════════════════════════════════════════════════════════════════════
  // Group CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async createGroup(data) {
    const TherapyGroup = mongoose.model('TherapyGroup');
    return TherapyGroup.create(data);
  }

  async getGroup(groupId) {
    const TherapyGroup = mongoose.model('TherapyGroup');
    return TherapyGroup.findById(groupId)
      .populate('members.beneficiaryId', 'personalInfo.firstName personalInfo.lastName fileNumber')
      .lean();
  }

  async listGroups({ status, type, branchId, therapistId, page = 1, limit = 20 } = {}) {
    const TherapyGroup = mongoose.model('TherapyGroup');
    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (branchId) filter.branchId = branchId;
    if (therapistId) filter.leadTherapistId = therapistId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      TherapyGroup.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      TherapyGroup.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async updateGroup(groupId, data) {
    const TherapyGroup = mongoose.model('TherapyGroup');
    return TherapyGroup.findByIdAndUpdate(groupId, data, { new: true }).lean();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Membership
  // ═══════════════════════════════════════════════════════════════════════════

  async addMember(groupId, { beneficiaryId, role, individualGoals }) {
    const TherapyGroup = mongoose.model('TherapyGroup');
    const group = await TherapyGroup.findById(groupId);
    if (!group) throw new Error('المجموعة غير موجودة');
    if (
      group.members.some(
        m => m.beneficiaryId?.toString() === beneficiaryId && m.status === 'active'
      )
    ) {
      throw new Error('المستفيد مسجل بالفعل في هذه المجموعة');
    }
    if (group.currentSize >= group.maxSize) throw new Error('المجموعة مكتملة العدد');

    group.members.push({
      beneficiaryId,
      role: role || 'member',
      individualGoals,
      status: 'active',
    });
    group.currentSize = group.members.filter(m => m.status === 'active').length;
    await group.save();
    return group;
  }

  async removeMember(groupId, beneficiaryId, reason) {
    const TherapyGroup = mongoose.model('TherapyGroup');
    const group = await TherapyGroup.findById(groupId);
    if (!group) throw new Error('المجموعة غير موجودة');

    const member = group.members.find(
      m => m.beneficiaryId?.toString() === beneficiaryId && m.status === 'active'
    );
    if (!member) throw new Error('المستفيد غير مسجل في المجموعة');

    member.status = 'withdrawn';
    member.withdrawnAt = new Date();
    member.withdrawalReason = reason;
    group.currentSize = group.members.filter(m => m.status === 'active').length;
    await group.save();
    return group;
  }

  async getBeneficiaryGroups(beneficiaryId) {
    const TherapyGroup = mongoose.model('TherapyGroup');
    return TherapyGroup.find({
      'members.beneficiaryId': beneficiaryId,
      'members.status': 'active',
      isDeleted: false,
    }).lean();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Group Sessions
  // ═══════════════════════════════════════════════════════════════════════════

  async createGroupSession(data) {
    const GroupSession = mongoose.model('GroupSession');
    return GroupSession.create(data);
  }

  async getGroupSessions(groupId, limit = 20) {
    const GroupSession = mongoose.model('GroupSession');
    return GroupSession.find({ groupId, isDeleted: false })
      .sort({ sessionDate: -1 })
      .limit(limit)
      .lean();
  }

  async completeGroupSession(sessionId, data) {
    const GroupSession = mongoose.model('GroupSession');
    return GroupSession.findByIdAndUpdate(
      sessionId,
      { ...data, status: 'completed' },
      { new: true }
    ).lean();
  }

  async getSessionDetails(sessionId) {
    const GroupSession = mongoose.model('GroupSession');
    return GroupSession.findById(sessionId)
      .populate('memberAttendance.beneficiaryId', 'personalInfo.firstName personalInfo.lastName')
      .lean();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboard(branchId) {
    const TherapyGroup = mongoose.model('TherapyGroup');
    const GroupSession = mongoose.model('GroupSession');
    const branchFilter = branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};

    const [groupsByStatus, groupsByType, recentSessions] = await Promise.all([
      TherapyGroup.aggregate([
        { $match: { isDeleted: false, ...branchFilter } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      TherapyGroup.aggregate([
        { $match: { isDeleted: false, status: 'active', ...branchFilter } },
        { $group: { _id: '$type', count: { $sum: 1 }, totalMembers: { $sum: '$currentSize' } } },
      ]),
      GroupSession.find({ isDeleted: false, ...branchFilter })
        .sort({ sessionDate: -1 })
        .limit(10)
        .populate('groupId', 'name type')
        .select('groupId sessionDate sessionNumber status')
        .lean(),
    ]);

    return {
      groupsByStatus: Object.fromEntries(groupsByStatus.map(g => [g._id, g.count])),
      groupsByType: groupsByType,
      recentSessions,
    };
  }
}

const groupTherapyService = new GroupTherapyService();
module.exports = { groupTherapyService, GroupTherapyService };
