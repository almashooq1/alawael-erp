/**
 * Early Intervention Service — خدمة نظام التدخل المبكر
 *
 * Business logic for:
 *  - Child enrollment & management
 *  - Developmental screenings
 *  - Milestone tracking
 *  - IFSP plans
 *  - Referrals & hospital coordination
 *  - Dashboard analytics
 */

const {
  EarlyInterventionChild,
  DevelopmentalScreening,
  DevelopmentalMilestone,
  IFSP,
  EarlyReferral,
} = require('../models/EarlyIntervention');
const logger = require('../utils/logger');

class EarlyInterventionService {
  // ═══════════════════════════════════════════════════════════════════════════
  // CHILDREN — إدارة ملفات الأطفال
  // ═══════════════════════════════════════════════════════════════════════════

  async createChild(data, userId) {
    data.createdBy = userId;
    const child = new EarlyInterventionChild(data);
    await child.save();
    logger.info(`[EIS] Child created: ${child.childNumber} by user ${userId}`);
    return child;
  }

  async getChildren(filters = {}, pagination = {}) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = -1 } = pagination;
    const query = this._buildChildQuery(filters);

    const [data, total] = await Promise.all([
      EarlyInterventionChild.find(query)
        .populate('primaryCoordinator', 'name email')
        .populate('careTeam.member', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EarlyInterventionChild.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getChildById(id) {
    const child = await EarlyInterventionChild.findById(id)
      .populate('primaryCoordinator', 'name email')
      .populate('careTeam.member', 'name email')
      .populate('pediatricianRef', 'name email')
      .populate('createdBy', 'name email')
      .lean();
    if (!child) throw new Error('ملف الطفل غير موجود');
    return child;
  }

  async updateChild(id, data, userId) {
    data.updatedBy = userId;
    const child = await EarlyInterventionChild.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!child) throw new Error('ملف الطفل غير موجود');
    logger.info(`[EIS] Child updated: ${child.childNumber} by user ${userId}`);
    return child;
  }

  async deleteChild(id) {
    const child = await EarlyInterventionChild.findByIdAndDelete(id);
    if (!child) throw new Error('ملف الطفل غير موجود');
    // Cascade: remove related records
    await Promise.all([
      DevelopmentalScreening.deleteMany({ child: id }),
      DevelopmentalMilestone.deleteMany({ child: id }),
      IFSP.deleteMany({ child: id }),
      EarlyReferral.deleteMany({ child: id }),
    ]);
    logger.info(`[EIS] Child deleted: ${child.childNumber}`);
    return child;
  }

  async getChildFullProfile(childId) {
    const [child, screenings, milestones, ifsps, referrals] = await Promise.all([
      this.getChildById(childId),
      DevelopmentalScreening.find({ child: childId }).sort({ screeningDate: -1 }).lean(),
      DevelopmentalMilestone.find({ child: childId }).sort({ expectedAgeMonths: 1 }).lean(),
      IFSP.find({ child: childId }).sort({ startDate: -1 }).lean(),
      EarlyReferral.find({ child: childId }).sort({ referralDate: -1 }).lean(),
    ]);

    return { child, screenings, milestones, ifsps, referrals };
  }

  _buildChildQuery(filters) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.eligibilityStatus) query.eligibilityStatus = filters.eligibilityStatus;
    if (filters.disabilityType) query.disabilityType = filters.disabilityType;
    if (filters.gender) query.gender = filters.gender;
    if (filters.primaryCoordinator) query.primaryCoordinator = filters.primaryCoordinator;
    if (filters.organization) query.organization = filters.organization;
    if (filters.referralSource) query.referralSource = filters.referralSource;
    if (filters.search) {
      const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { firstNameAr: regex },
        { lastNameAr: regex },
        { childNumber: regex },
        { nationalId: regex },
      ];
    }
    if (filters.ageMinMonths || filters.ageMaxMonths) {
      const now = new Date();
      if (filters.ageMaxMonths) {
        query['birthInfo.birthDate'] = query['birthInfo.birthDate'] || {};
        query['birthInfo.birthDate'].$gte = new Date(
          now.getFullYear(),
          now.getMonth() - filters.ageMaxMonths,
          now.getDate()
        );
      }
      if (filters.ageMinMonths) {
        query['birthInfo.birthDate'] = query['birthInfo.birthDate'] || {};
        query['birthInfo.birthDate'].$lte = new Date(
          now.getFullYear(),
          now.getMonth() - filters.ageMinMonths,
          now.getDate()
        );
      }
    }
    return query;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVELOPMENTAL SCREENINGS — الفحص والكشف المبكر
  // ═══════════════════════════════════════════════════════════════════════════

  async createScreening(data, userId) {
    // Verify child exists
    const child = await EarlyInterventionChild.findById(data.child);
    if (!child) throw new Error('ملف الطفل غير موجود');

    data.createdBy = userId;
    const screening = new DevelopmentalScreening(data);
    await screening.save();
    logger.info(
      `[EIS] Screening created: ${screening.screeningNumber} for child ${child.childNumber}`
    );
    return screening;
  }

  async getScreenings(filters = {}, pagination = {}) {
    const { page = 1, limit = 20, sortBy = 'screeningDate', sortOrder = -1 } = pagination;
    const query = this._buildScreeningQuery(filters);

    const [data, total] = await Promise.all([
      DevelopmentalScreening.find(query)
        .populate('child', 'childNumber firstName lastName firstNameAr lastNameAr')
        .populate('screener', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DevelopmentalScreening.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getScreeningById(id) {
    const screening = await DevelopmentalScreening.findById(id)
      .populate('child', 'childNumber firstName lastName firstNameAr lastNameAr birthInfo')
      .populate('screener', 'name email')
      .populate('referralId')
      .lean();
    if (!screening) throw new Error('سجل الفحص غير موجود');
    return screening;
  }

  async updateScreening(id, data, userId) {
    data.updatedBy = userId;
    const screening = await DevelopmentalScreening.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!screening) throw new Error('سجل الفحص غير موجود');
    logger.info(`[EIS] Screening updated: ${screening.screeningNumber} by user ${userId}`);
    return screening;
  }

  async deleteScreening(id) {
    const screening = await DevelopmentalScreening.findByIdAndDelete(id);
    if (!screening) throw new Error('سجل الفحص غير موجود');
    return screening;
  }

  async getScreeningsByChild(childId, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const query = { child: childId };

    const [data, total] = await Promise.all([
      DevelopmentalScreening.find(query)
        .populate('screener', 'name email')
        .sort({ screeningDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DevelopmentalScreening.countDocuments(query),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  _buildScreeningQuery(filters) {
    const query = {};
    if (filters.child) query.child = filters.child;
    if (filters.status) query.status = filters.status;
    if (filters.overallResult) query.overallResult = filters.overallResult;
    if (filters.screener) query.screener = filters.screener;
    if (filters.screeningType) query.screeningType = filters.screeningType;
    if (filters.organization) query.organization = filters.organization;
    if (filters.dateFrom || filters.dateTo) {
      query.screeningDate = {};
      if (filters.dateFrom) query.screeningDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.screeningDate.$lte = new Date(filters.dateTo);
    }
    return query;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVELOPMENTAL MILESTONES — المعالم التنموية
  // ═══════════════════════════════════════════════════════════════════════════

  async createMilestone(data, userId) {
    const child = await EarlyInterventionChild.findById(data.child);
    if (!child) throw new Error('ملف الطفل غير موجود');

    // Calculate delay
    if (data.actualAgeMonths && data.expectedAgeMonths) {
      data.delayMonths = data.actualAgeMonths - data.expectedAgeMonths;
      data.isDelayed = data.delayMonths > 0;
      if (data.delayMonths <= 0) data.delaySeverity = 'NONE';
      else if (data.delayMonths <= 3) data.delaySeverity = 'MILD';
      else if (data.delayMonths <= 6) data.delaySeverity = 'MODERATE';
      else if (data.delayMonths <= 12) data.delaySeverity = 'SEVERE';
      else data.delaySeverity = 'PROFOUND';
    }

    data.createdBy = userId;
    const milestone = new DevelopmentalMilestone(data);
    await milestone.save();
    logger.info(`[EIS] Milestone created for child ${child.childNumber}: ${data.milestone}`);
    return milestone;
  }

  async getMilestones(filters = {}, pagination = {}) {
    const { page = 1, limit = 50, sortBy = 'expectedAgeMonths', sortOrder = 1 } = pagination;
    const query = this._buildMilestoneQuery(filters);

    const [data, total] = await Promise.all([
      DevelopmentalMilestone.find(query)
        .populate('child', 'childNumber firstName lastName firstNameAr lastNameAr')
        .populate('assessedBy', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DevelopmentalMilestone.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getMilestoneById(id) {
    const milestone = await DevelopmentalMilestone.findById(id)
      .populate('child', 'childNumber firstName lastName birthInfo')
      .populate('assessedBy', 'name email')
      .lean();
    if (!milestone) throw new Error('المعلم التنموي غير موجود');
    return milestone;
  }

  async updateMilestone(id, data, _userId) {
    // Recalculate delay if ages changed
    if (data.actualAgeMonths !== undefined || data.expectedAgeMonths !== undefined) {
      const existing = await DevelopmentalMilestone.findById(id);
      if (!existing) throw new Error('المعلم التنموي غير موجود');
      const actualAge = data.actualAgeMonths ?? existing.actualAgeMonths;
      const expectedAge = data.expectedAgeMonths ?? existing.expectedAgeMonths;
      if (actualAge && expectedAge) {
        data.delayMonths = actualAge - expectedAge;
        data.isDelayed = data.delayMonths > 0;
        if (data.delayMonths <= 0) data.delaySeverity = 'NONE';
        else if (data.delayMonths <= 3) data.delaySeverity = 'MILD';
        else if (data.delayMonths <= 6) data.delaySeverity = 'MODERATE';
        else if (data.delayMonths <= 12) data.delaySeverity = 'SEVERE';
        else data.delaySeverity = 'PROFOUND';
      }
    }

    const milestone = await DevelopmentalMilestone.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!milestone) throw new Error('المعلم التنموي غير موجود');
    return milestone;
  }

  async deleteMilestone(id) {
    const milestone = await DevelopmentalMilestone.findByIdAndDelete(id);
    if (!milestone) throw new Error('المعلم التنموي غير موجود');
    return milestone;
  }

  async getMilestonesByChild(childId) {
    return DevelopmentalMilestone.find({ child: childId })
      .populate('assessedBy', 'name email')
      .sort({ domain: 1, expectedAgeMonths: 1 })
      .lean();
  }

  async getMilestoneReport(childId) {
    const milestones = await DevelopmentalMilestone.find({ child: childId }).lean();
    const domains = [
      'COGNITIVE',
      'COMMUNICATION',
      'GROSS_MOTOR',
      'FINE_MOTOR',
      'SOCIAL_EMOTIONAL',
      'ADAPTIVE',
      'SENSORY',
    ];

    const report = {};
    for (const domain of domains) {
      const domainMilestones = milestones.filter(m => m.domain === domain);
      const achieved = domainMilestones.filter(m => m.status === 'ACHIEVED').length;
      const delayed = domainMilestones.filter(m => m.isDelayed).length;
      const total = domainMilestones.length;

      report[domain] = {
        total,
        achieved,
        delayed,
        emerging: domainMilestones.filter(m => m.status === 'EMERGING').length,
        notYet: domainMilestones.filter(m => m.status === 'NOT_YET').length,
        achievementRate: total > 0 ? Math.round((achieved / total) * 100) : 0,
        averageDelay:
          delayed > 0
            ? Math.round(
                domainMilestones
                  .filter(m => m.isDelayed)
                  .reduce((sum, m) => sum + (m.delayMonths || 0), 0) / delayed
              )
            : 0,
      };
    }

    return report;
  }

  _buildMilestoneQuery(filters) {
    const query = {};
    if (filters.child) query.child = filters.child;
    if (filters.domain) query.domain = filters.domain;
    if (filters.status) query.status = filters.status;
    if (filters.isDelayed !== undefined) query.isDelayed = filters.isDelayed;
    if (filters.delaySeverity) query.delaySeverity = filters.delaySeverity;
    return query;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IFSP — خطط الخدمات الأسرية الفردية
  // ═══════════════════════════════════════════════════════════════════════════

  async createIFSP(data, userId) {
    const child = await EarlyInterventionChild.findById(data.child);
    if (!child) throw new Error('ملف الطفل غير موجود');

    data.createdBy = userId;
    const ifsp = new IFSP(data);
    await ifsp.save();
    logger.info(`[EIS] IFSP created: ${ifsp.planNumber} for child ${child.childNumber}`);
    return ifsp;
  }

  async getIFSPs(filters = {}, pagination = {}) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = -1 } = pagination;
    const query = this._buildIFSPQuery(filters);

    const [data, total] = await Promise.all([
      IFSP.find(query)
        .populate('child', 'childNumber firstName lastName firstNameAr lastNameAr')
        .populate('serviceCoordinator', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      IFSP.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getIFSPById(id) {
    const ifsp = await IFSP.findById(id)
      .populate('child', 'childNumber firstName lastName firstNameAr lastNameAr birthInfo')
      .populate('serviceCoordinator', 'name email')
      .populate('teamMembers.member', 'name email')
      .populate('services.provider', 'name email')
      .populate('createdBy', 'name email')
      .lean();
    if (!ifsp) throw new Error('خطة IFSP غير موجودة');
    return ifsp;
  }

  async updateIFSP(id, data, userId) {
    data.updatedBy = userId;
    const ifsp = await IFSP.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!ifsp) throw new Error('خطة IFSP غير موجودة');
    logger.info(`[EIS] IFSP updated: ${ifsp.planNumber} by user ${userId}`);
    return ifsp;
  }

  async deleteIFSP(id) {
    const ifsp = await IFSP.findByIdAndDelete(id);
    if (!ifsp) throw new Error('خطة IFSP غير موجودة');
    return ifsp;
  }

  async getIFSPsByChild(childId) {
    return IFSP.find({ child: childId })
      .populate('serviceCoordinator', 'name email')
      .sort({ startDate: -1 })
      .lean();
  }

  async addIFSPReview(ifspId, reviewData, userId) {
    const ifsp = await IFSP.findById(ifspId);
    if (!ifsp) throw new Error('خطة IFSP غير موجودة');

    reviewData.reviewer = userId;
    ifsp.reviews.push(reviewData);
    if (reviewData.nextReviewDate) {
      ifsp.nextReviewDate = reviewData.nextReviewDate;
    }
    ifsp.status = 'IN_REVIEW';
    await ifsp.save();
    logger.info(`[EIS] IFSP review added: ${ifsp.planNumber}`);
    return ifsp;
  }

  async updateIFSPGoalProgress(ifspId, goalId, progressData, userId) {
    const ifsp = await IFSP.findById(ifspId);
    if (!ifsp) throw new Error('خطة IFSP غير موجودة');

    const goal = ifsp.goals.id(goalId);
    if (!goal) throw new Error('الهدف غير موجود');

    if (progressData.progress !== undefined) goal.progress = progressData.progress;
    if (progressData.status) goal.status = progressData.status;
    goal.progressNotes.push({
      date: new Date(),
      note: progressData.note,
      progressPercent: progressData.progress,
      recordedBy: userId,
    });
    await ifsp.save();
    return ifsp;
  }

  _buildIFSPQuery(filters) {
    const query = {};
    if (filters.child) query.child = filters.child;
    if (filters.status) query.status = filters.status;
    if (filters.planType) query.planType = filters.planType;
    if (filters.serviceCoordinator) query.serviceCoordinator = filters.serviceCoordinator;
    if (filters.organization) query.organization = filters.organization;
    if (filters.dateFrom || filters.dateTo) {
      query.startDate = {};
      if (filters.dateFrom) query.startDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.startDate.$lte = new Date(filters.dateTo);
    }
    return query;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERRALS — الإحالات المبكرة
  // ═══════════════════════════════════════════════════════════════════════════

  async createReferral(data, userId) {
    if (data.child) {
      const child = await EarlyInterventionChild.findById(data.child);
      if (!child) throw new Error('ملف الطفل غير موجود');
    }

    data.createdBy = userId;
    const referral = new EarlyReferral(data);
    await referral.save();
    logger.info(`[EIS] Referral created: ${referral.referralNumber}`);
    return referral;
  }

  async getReferrals(filters = {}, pagination = {}) {
    const { page = 1, limit = 20, sortBy = 'referralDate', sortOrder = -1 } = pagination;
    const query = this._buildReferralQuery(filters);

    const [data, total] = await Promise.all([
      EarlyReferral.find(query)
        .populate('child', 'childNumber firstName lastName firstNameAr lastNameAr')
        .populate('referringPhysicianId', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EarlyReferral.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getReferralById(id) {
    const referral = await EarlyReferral.findById(id)
      .populate('child', 'childNumber firstName lastName firstNameAr lastNameAr birthInfo')
      .populate('referringPhysicianId', 'name email')
      .populate('createdBy', 'name email')
      .lean();
    if (!referral) throw new Error('الإحالة غير موجودة');
    return referral;
  }

  async updateReferral(id, data, userId) {
    data.updatedBy = userId;
    const referral = await EarlyReferral.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!referral) throw new Error('الإحالة غير موجودة');
    logger.info(`[EIS] Referral updated: ${referral.referralNumber} by user ${userId}`);
    return referral;
  }

  async deleteReferral(id) {
    const referral = await EarlyReferral.findByIdAndDelete(id);
    if (!referral) throw new Error('الإحالة غير موجودة');
    return referral;
  }

  async getReferralsByChild(childId) {
    return EarlyReferral.find({ child: childId })
      .populate('referringPhysicianId', 'name email')
      .sort({ referralDate: -1 })
      .lean();
  }

  async addReferralCommunication(referralId, commData, userId) {
    const referral = await EarlyReferral.findById(referralId);
    if (!referral) throw new Error('الإحالة غير موجودة');

    commData.recordedBy = userId;
    referral.communications.push(commData);
    await referral.save();
    return referral;
  }

  async updateReferralStatus(referralId, status, userId) {
    const referral = await EarlyReferral.findById(referralId);
    if (!referral) throw new Error('الإحالة غير موجودة');

    referral.status = status;
    referral.updatedBy = userId;

    // Auto-set dates based on status
    if (status === 'ACCEPTED') referral.acceptedDate = new Date();
    if (status === 'COMPLETED') referral.completedDate = new Date();

    await referral.save();
    logger.info(`[EIS] Referral ${referral.referralNumber} status → ${status}`);
    return referral;
  }

  _buildReferralQuery(filters) {
    const query = {};
    if (filters.child) query.child = filters.child;
    if (filters.status) query.status = filters.status;
    if (filters.referralDirection) query.referralDirection = filters.referralDirection;
    if (filters.sourceType) query.sourceType = filters.sourceType;
    if (filters.urgency) query.urgency = filters.urgency;
    if (filters.organization) query.organization = filters.organization;
    if (filters.search) {
      const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { referralNumber: regex },
        { reason: regex },
        { reasonAr: regex },
        { sourceFacility: regex },
        { destinationFacility: regex },
      ];
    }
    if (filters.dateFrom || filters.dateTo) {
      query.referralDate = {};
      if (filters.dateFrom) query.referralDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.referralDate.$lte = new Date(filters.dateTo);
    }
    return query;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD & ANALYTICS — لوحة المعلومات والتحليلات
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboardStats(organizationId) {
    const orgFilter = organizationId ? { organization: organizationId } : {};

    const [
      totalChildren,
      activeChildren,
      waitlistedChildren,
      totalScreenings,
      atRiskScreenings,
      totalIFSPs,
      activeIFSPs,
      totalReferrals,
      pendingReferrals,
      childrenByDisabilityType,
      childrenByStatus,
      screeningsByResult,
      referralsBySource,
      referralsByUrgency,
      recentScreenings,
      recentReferrals,
      delayedMilestones,
    ] = await Promise.all([
      EarlyInterventionChild.countDocuments(orgFilter),
      EarlyInterventionChild.countDocuments({ ...orgFilter, status: 'ACTIVE' }),
      EarlyInterventionChild.countDocuments({ ...orgFilter, status: 'WAITLISTED' }),
      DevelopmentalScreening.countDocuments(orgFilter),
      DevelopmentalScreening.countDocuments({
        ...orgFilter,
        overallResult: { $in: ['AT_RISK', 'DELAYED', 'SIGNIFICANT_DELAY'] },
      }),
      IFSP.countDocuments(orgFilter),
      IFSP.countDocuments({ ...orgFilter, status: 'ACTIVE' }),
      EarlyReferral.countDocuments(orgFilter),
      EarlyReferral.countDocuments({
        ...orgFilter,
        status: { $in: ['SUBMITTED', 'RECEIVED'] },
      }),
      EarlyInterventionChild.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$disabilityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      EarlyInterventionChild.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      DevelopmentalScreening.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$overallResult', count: { $sum: 1 } } },
      ]),
      EarlyReferral.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$sourceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      EarlyReferral.aggregate([
        { $match: orgFilter },
        { $group: { _id: '$urgency', count: { $sum: 1 } } },
      ]),
      DevelopmentalScreening.find(orgFilter).sort({ screeningDate: -1 }).limit(5).lean(),
      EarlyReferral.find(orgFilter).sort({ referralDate: -1 }).limit(5).lean(),
      DevelopmentalMilestone.countDocuments({ isDelayed: true }),
    ]);

    return {
      summary: {
        totalChildren,
        activeChildren,
        waitlistedChildren,
        totalScreenings,
        atRiskScreenings,
        totalIFSPs,
        activeIFSPs,
        totalReferrals,
        pendingReferrals,
        delayedMilestones,
      },
      charts: {
        childrenByDisabilityType,
        childrenByStatus,
        screeningsByResult,
        referralsBySource,
        referralsByUrgency,
      },
      recent: {
        screenings: recentScreenings,
        referrals: recentReferrals,
      },
    };
  }

  // ── Bulk milestone initialization for a child based on age ──
  async initializeMilestonesForChild(childId, userId) {
    const child = await EarlyInterventionChild.findById(childId);
    if (!child) throw new Error('ملف الطفل غير موجود');

    const standardMilestones = this._getStandardMilestones();
    const milestones = standardMilestones.map(m => ({
      child: childId,
      domain: m.domain,
      milestone: m.milestone,
      milestoneAr: m.milestoneAr,
      expectedAgeMonths: m.expectedAgeMonths,
      status: 'NOT_YET',
      createdBy: userId,
      organization: child.organization,
    }));

    const created = await DevelopmentalMilestone.insertMany(milestones);
    logger.info(`[EIS] Initialized ${created.length} milestones for child ${child.childNumber}`);
    return created;
  }

  _getStandardMilestones() {
    return [
      // GROSS_MOTOR
      {
        domain: 'GROSS_MOTOR',
        expectedAgeMonths: 2,
        milestone: 'Holds head up',
        milestoneAr: 'يرفع رأسه',
      },
      {
        domain: 'GROSS_MOTOR',
        expectedAgeMonths: 4,
        milestone: 'Pushes up on arms',
        milestoneAr: 'يدفع بذراعيه',
      },
      {
        domain: 'GROSS_MOTOR',
        expectedAgeMonths: 6,
        milestone: 'Sits with support',
        milestoneAr: 'يجلس بمساعدة',
      },
      { domain: 'GROSS_MOTOR', expectedAgeMonths: 9, milestone: 'Crawls', milestoneAr: 'يزحف' },
      {
        domain: 'GROSS_MOTOR',
        expectedAgeMonths: 12,
        milestone: 'Pulls to stand',
        milestoneAr: 'يقف بالاستناد',
      },
      {
        domain: 'GROSS_MOTOR',
        expectedAgeMonths: 15,
        milestone: 'Walks independently',
        milestoneAr: 'يمشي بشكل مستقل',
      },
      {
        domain: 'GROSS_MOTOR',
        expectedAgeMonths: 18,
        milestone: 'Walks up stairs with help',
        milestoneAr: 'يصعد الدرج بمساعدة',
      },
      {
        domain: 'GROSS_MOTOR',
        expectedAgeMonths: 24,
        milestone: 'Kicks a ball',
        milestoneAr: 'يركل الكرة',
      },
      {
        domain: 'GROSS_MOTOR',
        expectedAgeMonths: 36,
        milestone: 'Rides a tricycle',
        milestoneAr: 'يركب دراجة ثلاثية العجلات',
      },

      // FINE_MOTOR
      {
        domain: 'FINE_MOTOR',
        expectedAgeMonths: 3,
        milestone: 'Grasps objects briefly',
        milestoneAr: 'يمسك الأشياء لفترة قصيرة',
      },
      {
        domain: 'FINE_MOTOR',
        expectedAgeMonths: 6,
        milestone: 'Transfers objects hand to hand',
        milestoneAr: 'ينقل الأشياء من يد لأخرى',
      },
      {
        domain: 'FINE_MOTOR',
        expectedAgeMonths: 9,
        milestone: 'Pincer grasp developing',
        milestoneAr: 'يبدأ القبض بالإصبعين',
      },
      {
        domain: 'FINE_MOTOR',
        expectedAgeMonths: 12,
        milestone: 'Picks up small objects',
        milestoneAr: 'يلتقط أشياء صغيرة',
      },
      {
        domain: 'FINE_MOTOR',
        expectedAgeMonths: 18,
        milestone: 'Scribbles with crayon',
        milestoneAr: 'يخربش بالقلم',
      },
      {
        domain: 'FINE_MOTOR',
        expectedAgeMonths: 24,
        milestone: 'Stacks 4-6 blocks',
        milestoneAr: 'يرص 4-6 مكعبات',
      },
      {
        domain: 'FINE_MOTOR',
        expectedAgeMonths: 36,
        milestone: 'Draws a circle',
        milestoneAr: 'يرسم دائرة',
      },

      // COMMUNICATION
      {
        domain: 'COMMUNICATION',
        expectedAgeMonths: 2,
        milestone: 'Coos and makes sounds',
        milestoneAr: 'يصدر أصوات مناغاة',
      },
      { domain: 'COMMUNICATION', expectedAgeMonths: 6, milestone: 'Babbles', milestoneAr: 'يثرثر' },
      {
        domain: 'COMMUNICATION',
        expectedAgeMonths: 9,
        milestone: 'Says mama/dada',
        milestoneAr: 'يقول ماما/بابا',
      },
      {
        domain: 'COMMUNICATION',
        expectedAgeMonths: 12,
        milestone: 'Uses 1-2 words',
        milestoneAr: 'يستخدم 1-2 كلمة',
      },
      {
        domain: 'COMMUNICATION',
        expectedAgeMonths: 18,
        milestone: 'Uses 10-15 words',
        milestoneAr: 'يستخدم 10-15 كلمة',
      },
      {
        domain: 'COMMUNICATION',
        expectedAgeMonths: 24,
        milestone: 'Puts 2 words together',
        milestoneAr: 'يجمع كلمتين',
      },
      {
        domain: 'COMMUNICATION',
        expectedAgeMonths: 36,
        milestone: 'Uses 3-word sentences',
        milestoneAr: 'يستخدم جمل من 3 كلمات',
      },

      // COGNITIVE
      {
        domain: 'COGNITIVE',
        expectedAgeMonths: 4,
        milestone: 'Follows objects with eyes',
        milestoneAr: 'يتتبع الأشياء بعينيه',
      },
      {
        domain: 'COGNITIVE',
        expectedAgeMonths: 8,
        milestone: 'Object permanence emerging',
        milestoneAr: 'يبدأ إدراك ديمومة الأشياء',
      },
      {
        domain: 'COGNITIVE',
        expectedAgeMonths: 12,
        milestone: 'Explores cause and effect',
        milestoneAr: 'يستكشف السبب والنتيجة',
      },
      {
        domain: 'COGNITIVE',
        expectedAgeMonths: 18,
        milestone: 'Points to named objects',
        milestoneAr: 'يشير للأشياء المسماة',
      },
      {
        domain: 'COGNITIVE',
        expectedAgeMonths: 24,
        milestone: 'Sorts shapes and colors',
        milestoneAr: 'يصنف الأشكال والألوان',
      },
      {
        domain: 'COGNITIVE',
        expectedAgeMonths: 36,
        milestone: 'Understands concept of two',
        milestoneAr: 'يفهم مفهوم الاثنين',
      },

      // SOCIAL_EMOTIONAL
      {
        domain: 'SOCIAL_EMOTIONAL',
        expectedAgeMonths: 2,
        milestone: 'Social smile',
        milestoneAr: 'ابتسامة اجتماعية',
      },
      {
        domain: 'SOCIAL_EMOTIONAL',
        expectedAgeMonths: 6,
        milestone: 'Laughs and squeals',
        milestoneAr: 'يضحك ويصرخ فرحاً',
      },
      {
        domain: 'SOCIAL_EMOTIONAL',
        expectedAgeMonths: 9,
        milestone: 'Stranger anxiety appears',
        milestoneAr: 'يظهر قلق الغرباء',
      },
      {
        domain: 'SOCIAL_EMOTIONAL',
        expectedAgeMonths: 12,
        milestone: 'Shows attachment to caregivers',
        milestoneAr: 'يظهر تعلقاً بمقدمي الرعاية',
      },
      {
        domain: 'SOCIAL_EMOTIONAL',
        expectedAgeMonths: 18,
        milestone: 'Parallel play',
        milestoneAr: 'اللعب المتوازي',
      },
      {
        domain: 'SOCIAL_EMOTIONAL',
        expectedAgeMonths: 24,
        milestone: 'Shows empathy',
        milestoneAr: 'يظهر التعاطف',
      },
      {
        domain: 'SOCIAL_EMOTIONAL',
        expectedAgeMonths: 36,
        milestone: 'Cooperative play begins',
        milestoneAr: 'يبدأ اللعب التعاوني',
      },

      // ADAPTIVE
      {
        domain: 'ADAPTIVE',
        expectedAgeMonths: 6,
        milestone: 'Opens mouth for spoon',
        milestoneAr: 'يفتح فمه للملعقة',
      },
      {
        domain: 'ADAPTIVE',
        expectedAgeMonths: 12,
        milestone: 'Finger feeds self',
        milestoneAr: 'يأكل بأصابعه',
      },
      {
        domain: 'ADAPTIVE',
        expectedAgeMonths: 18,
        milestone: 'Uses spoon with spilling',
        milestoneAr: 'يستخدم الملعقة مع انسكاب',
      },
      {
        domain: 'ADAPTIVE',
        expectedAgeMonths: 24,
        milestone: 'Drinks from cup independently',
        milestoneAr: 'يشرب من الكوب باستقلالية',
      },
      {
        domain: 'ADAPTIVE',
        expectedAgeMonths: 30,
        milestone: 'Begins toilet awareness',
        milestoneAr: 'يبدأ الوعي بالحمام',
      },
      {
        domain: 'ADAPTIVE',
        expectedAgeMonths: 36,
        milestone: 'Puts on some clothes',
        milestoneAr: 'يلبس بعض الملابس',
      },
    ];
  }
}

module.exports = new EarlyInterventionService();
