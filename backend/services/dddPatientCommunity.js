'use strict';
/**
 * PatientCommunity Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddPatientCommunity.js
 */

const {
  DDDCommunityGroup,
  DDDCommunityPost,
  DDDCommunityMember,
  DDDModerationLog,
  COMMUNITY_TYPES,
  COMMUNITY_STATUSES,
  POST_TYPES,
  MODERATION_ACTIONS,
  MEMBER_ROLES,
  ENGAGEMENT_LEVELS,
  BUILTIN_COMMUNITY_TEMPLATES,
} = require('../models/DddPatientCommunity');

const BaseCrudService = require('./base/BaseCrudService');

class PatientCommunity extends BaseCrudService {
  constructor() {
    super('PatientCommunity', {}, {
      communityGroups: DDDCommunityGroup,
      communityPosts: DDDCommunityPost,
      communityMembers: DDDCommunityMember,
      moderationLogs: DDDModerationLog,
    });
  }

  async createGroup(data) { return this._create(DDDCommunityGroup, data); }
  async listGroups(filter = {}, page = 1, limit = 20) { return this._list(DDDCommunityGroup, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateGroup(id, data) { return this._update(DDDCommunityGroup, id, data); }

  async createPost(data) { return this._create(DDDCommunityPost, data); }
  async listPosts(filter = {}, page = 1, limit = 20) { return this._list(DDDCommunityPost, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async getPost(id) { return this._getById(DDDCommunityPost, id); }

  async addMember(data) { return this._create(DDDCommunityMember, data); }
  async listMembers(filter = {}, page = 1, limit = 50) { return this._list(DDDCommunityMember, filter, { page: page, limit: limit, sort: { joinedAt: -1 } }); }
  async updateMember(communityId, userId, data) {
    return DDDCommunityMember.findOneAndUpdate({ communityId, userId }, data, { new: true }).lean();
  }

  async logModeration(data) { return this._create(DDDModerationLog, data); }
  async listModerationLogs(filter = {}, page = 1, limit = 20) { return this._list(DDDModerationLog, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async getCommunityStats() {
    const [groups, posts, members, actions] = await Promise.all([
      DDDCommunityGroup.countDocuments({ status: 'active' }),
      DDDCommunityPost.countDocuments(),
      DDDCommunityMember.countDocuments(),
      DDDModerationLog.countDocuments(),
    ]);
    return {
      activeGroups: groups,
      totalPosts: posts,
      totalMembers: members,
      moderationActions: actions,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new PatientCommunity();
