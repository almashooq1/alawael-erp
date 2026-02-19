/**
 * Case Management Service
 * خدمات إدارة الحالات لمراكز تأهيل ذوي الإعاقة
 *
 * @description منطق الأعمال والعمليات المعقدة لإدارة الحالات
 * @version 1.0.0
 * @date 2026-01-30
 */

const Case = require('../models/case.model');
const Beneficiary = require('../models/beneficiary.model');

class CaseManagementService {
  /**
   * إنشاء حالة جديدة
   */
  async createCase(caseData, userId) {
    try {
      // التحقق من وجود المستفيد
      const beneficiary = await Beneficiary.findById(caseData.beneficiaryId);
      if (!beneficiary) {
        throw new Error('المستفيد غير موجود');
      }

      // التحقق من عدم وجود حالة نشطة مسبقاً
      const existingActiveCase = await Case.findOne({
        beneficiaryId: caseData.beneficiaryId,
        isActive: true,
        'admissionInfo.status': { $in: ['active', 'pending_review', 'under_assessment'] },
      });

      if (existingActiveCase) {
        throw new Error('يوجد حالة نشطة بالفعل لهذا المستفيد');
      }

      // إنشاء الحالة
      const newCase = new Case({
        ...caseData,
        createdBy: userId,
        'admissionInfo.applicationDate': new Date(),
      });

      await newCase.save();

      // تحديث عدد الحالات للمستفيد
      await Beneficiary.findByIdAndUpdate(caseData.beneficiaryId, { $inc: { casesCount: 1 } });

      return newCase;
    } catch (error) {
      throw error;
    }
  }

  /**
   * الحصول على قائمة الحالات مع فلترة متقدمة
   */
  async getCases(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // بناء query الفلترة
      const query = this._buildQuery(filters);

      // الحصول على الحالات
      const cases = await Case.find(query)
        .populate(
          'beneficiaryId',
          'firstName lastName dateOfBirth gender nationalId contactInfo.primaryPhone'
        )
        .populate('assignedTeam.userId', 'firstName lastName email role')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      // حساب إجمالي الحالات
      const total = await Case.countDocuments(query);

      return {
        cases,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * الحصول على تفاصيل حالة محددة
   */
  async getCaseById(caseId) {
    try {
      const caseData = await Case.findById(caseId)
        .populate('beneficiaryId')
        .populate('assignedTeam.userId', 'firstName lastName email role phone')
        .populate('createdBy', 'firstName lastName')
        .populate('lastModifiedBy', 'firstName lastName')
        .populate('currentIEP.createdBy', 'firstName lastName')
        .populate('currentIEP.approvedBy', 'firstName lastName')
        .populate('teamNotes.author', 'firstName lastName role');

      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      return caseData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * تحديث حالة
   */
  async updateCase(caseId, updateData, userId) {
    try {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      // تحديث البيانات
      Object.assign(caseData, updateData);
      caseData.lastModifiedBy = userId;

      await caseData.save();

      return caseData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * تغيير حالة القبول
   */
  async changeStatus(caseId, newStatus, userId, notes = '') {
    try {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      await caseData.updateStatus(newStatus, userId);

      // إضافة ملاحظة عن تغيير الحالة
      await caseData.addNote({
        author: userId,
        content: `تم تغيير الحالة إلى: ${newStatus}. ${notes}`,
        category: 'general',
        priority: 'normal',
      });

      return caseData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * تعيين فريق معالج للحالة
   */
  async assignTeam(caseId, teamMembers, userId) {
    try {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      // إضافة أعضاء الفريق
      for (const member of teamMembers) {
        await caseData.assignTeamMember({
          ...member,
          assignedDate: new Date(),
        });
      }

      // إضافة ملاحظة
      await caseData.addNote({
        author: userId,
        content: `تم تعيين ${teamMembers.length} من أعضاء الفريق المعالج`,
        category: 'general',
        priority: 'normal',
      });

      return caseData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * إزالة عضو من الفريق
   */
  async removeTeamMember(caseId, memberId, userId) {
    try {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      await caseData.removeTeamMember(memberId);

      await caseData.addNote({
        author: userId,
        content: `تم إزالة عضو من الفريق المعالج`,
        category: 'general',
        priority: 'normal',
      });

      return caseData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * إنشاء/تحديث الخطة التربوية الفردية (IEP)
   */
  async createOrUpdateIEP(caseId, iepData, userId) {
    try {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      // إذا كان هناك IEP حالي، نقله إلى السجل
      if (caseData.currentIEP) {
        caseData.previousIEPs.push(caseData.currentIEP);
      }

      // إنشاء IEP جديد
      caseData.currentIEP = {
        ...iepData,
        version: (caseData.previousIEPs.length || 0) + 1,
        createdBy: userId,
        status: 'draft',
      };

      await caseData.save();

      await caseData.addNote({
        author: userId,
        content: `تم إنشاء الخطة التربوية الفردية (IEP) - الإصدار ${caseData.currentIEP.version}`,
        category: 'general',
        priority: 'high',
      });

      return caseData.currentIEP;
    } catch (error) {
      throw error;
    }
  }

  /**
   * اعتماد الخطة التربوية الفردية
   */
  async approveIEP(caseId, userId) {
    try {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      if (!caseData.currentIEP) {
        throw new Error('لا توجد خطة تربوية فردية للاعتماد');
      }

      caseData.currentIEP.status = 'approved';
      caseData.currentIEP.approvedBy = userId;
      caseData.currentIEP.approvalDate = new Date();

      await caseData.save();

      await caseData.addNote({
        author: userId,
        content: `تم اعتماد الخطة التربوية الفردية (IEP) - الإصدار ${caseData.currentIEP.version}`,
        category: 'general',
        priority: 'high',
      });

      return caseData.currentIEP;
    } catch (error) {
      throw error;
    }
  }

  /**
   * إضافة ملاحظة للحالة
   */
  async addNote(caseId, noteData, userId) {
    try {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      await caseData.addNote({
        ...noteData,
        author: userId,
      });

      return caseData.teamNotes[caseData.teamNotes.length - 1];
    } catch (error) {
      throw error;
    }
  }

  /**
   * الحصول على تاريخ الحالة
   */
  async getCaseHistory(caseId) {
    try {
      const caseData = await Case.findById(caseId)
        .select('teamNotes previousIEPs')
        .populate('teamNotes.author', 'firstName lastName role')
        .populate('previousIEPs.createdBy', 'firstName lastName')
        .populate('previousIEPs.approvedBy', 'firstName lastName');

      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      return {
        notes: caseData.teamNotes,
        previousIEPs: caseData.previousIEPs,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الحالات
   */
  async getStatistics(filters = {}) {
    try {
      const query = this._buildQuery(filters);

      const [
        totalCases,
        activeCases,
        pendingCases,
        criticalCases,
        completedCases,
        statusBreakdown,
        disabilityBreakdown,
        severityBreakdown,
      ] = await Promise.all([
        Case.countDocuments(query),
        Case.countDocuments({ ...query, 'admissionInfo.status': 'active' }),
        Case.countDocuments({ ...query, 'admissionInfo.status': 'pending_review' }),
        Case.countDocuments({ ...query, 'admissionInfo.priority': 'critical' }),
        Case.countDocuments({ ...query, 'admissionInfo.status': 'completed' }),

        Case.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$admissionInfo.status',
              count: { $sum: 1 },
            },
          },
        ]),

        Case.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$disabilityInfo.primaryDisability',
              count: { $sum: 1 },
            },
          },
        ]),

        Case.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$disabilityInfo.severity',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      return {
        summary: {
          total: totalCases,
          active: activeCases,
          pending: pendingCases,
          critical: criticalCases,
          completed: completedCases,
        },
        breakdown: {
          byStatus: statusBreakdown,
          byDisability: disabilityBreakdown,
          bySeverity: severityBreakdown,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * البحث المتقدم عن الحالات
   */
  async advancedSearch(searchParams) {
    try {
      const cases = await Case.advancedSearch(searchParams);
      return cases;
    } catch (error) {
      throw error;
    }
  }

  /**
   * الحالات الحرجة التي تحتاج اهتمام فوري
   */
  async getCriticalCases() {
    try {
      const cases = await Case.find({
        $or: [
          { 'admissionInfo.priority': { $in: ['urgent', 'critical'] } },
          { 'statistics.riskLevel': { $in: ['high', 'critical'] } },
          { 'sessionsSummary.attendanceRate': { $lt: 50 } },
          { 'statistics.overallProgress': { $lt: 20 } },
        ],
        isActive: true,
        isArchived: false,
      })
        .populate('beneficiaryId', 'firstName lastName contactInfo.primaryPhone')
        .populate('assignedTeam.userId', 'firstName lastName role')
        .sort({ 'admissionInfo.priority': -1, 'statistics.riskLevel': -1 })
        .limit(50);

      return cases;
    } catch (error) {
      throw error;
    }
  }

  /**
   * الحالات المعلقة التي تحتاج مراجعة
   */
  async getPendingCases() {
    try {
      const cases = await Case.find({
        'admissionInfo.status': { $in: ['pending_review', 'under_assessment', 'waitlist'] },
        isActive: true,
        isArchived: false,
      })
        .populate('beneficiaryId', 'firstName lastName dateOfBirth')
        .populate('createdBy', 'firstName lastName')
        .sort({ 'admissionInfo.applicationDate': 1 })
        .limit(100);

      return cases;
    } catch (error) {
      throw error;
    }
  }

  /**
   * تقرير التقدم الشامل
   */
  async getProgressReport(caseId) {
    try {
      const caseData = await this.getCaseById(caseId);

      const report = {
        caseInfo: {
          caseNumber: caseData.caseNumber,
          beneficiary: caseData.beneficiaryId,
          status: caseData.admissionInfo.status,
          admissionDate: caseData.admissionInfo.admissionDate,
          duration: caseData.treatmentDuration,
        },
        progress: {
          overall: caseData.statistics.overallProgress,
          byGoal: caseData.currentIEP?.goals.map(goal => ({
            domain: goal.domain,
            description: goal.description,
            progress: goal.progress,
            status: goal.status,
          })),
        },
        attendance: {
          total: caseData.sessionsSummary.totalScheduled,
          attended: caseData.sessionsSummary.totalAttended,
          missed: caseData.sessionsSummary.totalMissed,
          rate: caseData.sessionsSummary.attendanceRate,
        },
        team: caseData.assignedTeam.map(member => ({
          name: member.userId.firstName + ' ' + member.userId.lastName,
          role: member.role,
          isPrimary: member.isPrimary,
        })),
        recentNotes: caseData.teamNotes.slice(-5),
        riskAssessment: {
          level: caseData.statistics.riskLevel,
          factors: this._identifyRiskFactors(caseData),
        },
      };

      return report;
    } catch (error) {
      throw error;
    }
  }

  /**
   * أرشفة حالة
   */
  async archiveCase(caseId, userId, reason) {
    try {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      await caseData.archive(userId, reason);

      return caseData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * استعادة حالة من الأرشيف
   */
  async unarchiveCase(caseId) {
    try {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        throw new Error('الحالة غير موجودة');
      }

      await caseData.unarchive();

      return caseData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * دالة مساعدة لبناء query الفلترة
   */
  _buildQuery(filters) {
    const query = {};

    if (filters.status) {
      query['admissionInfo.status'] = filters.status;
    }

    if (filters.priority) {
      query['admissionInfo.priority'] = filters.priority;
    }

    if (filters.disabilityType) {
      query['disabilityInfo.primaryDisability'] = filters.disabilityType;
    }

    if (filters.severity) {
      query['disabilityInfo.severity'] = filters.severity;
    }

    if (filters.riskLevel) {
      query['statistics.riskLevel'] = filters.riskLevel;
    }

    if (filters.teamMember) {
      query['assignedTeam.userId'] = filters.teamMember;
    }

    if (filters.beneficiaryId) {
      query.beneficiaryId = filters.beneficiaryId;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    } else {
      query.isArchived = false; // افتراضياً، لا نعرض الحالات المؤرشفة
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    return query;
  }

  /**
   * دالة مساعدة لتحديد عوامل الخطر
   */
  _identifyRiskFactors(caseData) {
    const factors = [];

    if (caseData.sessionsSummary.attendanceRate < 50) {
      factors.push({
        type: 'low_attendance',
        severity: 'high',
        description: 'معدل حضور منخفض جداً',
      });
    }

    if (caseData.statistics.overallProgress < 20) {
      factors.push({
        type: 'slow_progress',
        severity: 'high',
        description: 'تقدم بطيء جداً',
      });
    }

    if (caseData.assignedTeam.length === 0) {
      factors.push({
        type: 'no_team',
        severity: 'critical',
        description: 'لا يوجد فريق معالج معين',
      });
    }

    if (!caseData.currentIEP || caseData.currentIEP.status !== 'approved') {
      factors.push({
        type: 'no_iep',
        severity: 'high',
        description: 'لا توجد خطة تربوية فردية معتمدة',
      });
    }

    const lastNote = caseData.teamNotes[caseData.teamNotes.length - 1];
    if (!lastNote || new Date() - lastNote.createdAt > 7 * 24 * 60 * 60 * 1000) {
      factors.push({
        type: 'no_recent_notes',
        severity: 'medium',
        description: 'لا توجد ملاحظات حديثة من الفريق',
      });
    }

    return factors;
  }
}

module.exports = new CaseManagementService();
