/**
 * Mental Health & Psychosocial Support Service
 * خدمة الدعم النفسي والصحة النفسية
 */

const mongoose = require('mongoose');
const {
  CounselingSession,
  MentalHealthProgram,
  PsychologicalAssessment,
  CrisisIntervention,
  SupportGroup,
} = require('../models/MentalHealth');

class MHPSSService {
  // ─── Counseling Sessions ─────────────────────────────────────────────────

  async createSession(data) {
    try {
      const session = new CounselingSession(data);
      await session.save();
      return { success: true, message: 'تم إنشاء جلسة الإرشاد بنجاح', data: session };
    } catch (error) {
      return { success: false, message: 'خطأ في إنشاء الجلسة', error: error.message };
    }
  }

  async getSessions(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'scheduledDate', sortOrder = 'desc' } = options;
      const skip = (Number(page) - 1) * Number(limit);

      const [data, total] = await Promise.all([
        CounselingSession.find(filters)
          .populate('beneficiary', 'name nameAr')
          .populate('counselor', 'name email')
          .populate('participants', 'name nameAr')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        CounselingSession.countDocuments(filters),
      ]);

      return {
        success: true,
        data,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب الجلسات', error: error.message };
    }
  }

  async getSessionById(id) {
    try {
      const session = await CounselingSession.findById(id)
        .populate('beneficiary', 'name nameAr')
        .populate('counselor', 'name email')
        .populate('participants', 'name nameAr')
        .populate('createdBy', 'name');
      if (!session) return { success: false, message: 'الجلسة غير موجودة' };
      return { success: true, data: session };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب الجلسة', error: error.message };
    }
  }

  async updateSession(id, data) {
    try {
      const session = await CounselingSession.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
      if (!session) return { success: false, message: 'الجلسة غير موجودة' };
      return { success: true, message: 'تم تحديث الجلسة بنجاح', data: session };
    } catch (error) {
      return { success: false, message: 'خطأ في تحديث الجلسة', error: error.message };
    }
  }

  async deleteSession(id) {
    try {
      const session = await CounselingSession.findByIdAndDelete(id);
      if (!session) return { success: false, message: 'الجلسة غير موجودة' };
      return { success: true, message: 'تم حذف الجلسة بنجاح' };
    } catch (error) {
      return { success: false, message: 'خطأ في حذف الجلسة', error: error.message };
    }
  }

  async getSessionStats(filters = {}) {
    try {
      const [totalSessions, byType, byStatus, byRisk, avgMood] = await Promise.all([
        CounselingSession.countDocuments(filters),
        CounselingSession.aggregate([
          { $match: filters },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
        CounselingSession.aggregate([
          { $match: filters },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        CounselingSession.aggregate([
          { $match: filters },
          { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
        ]),
        CounselingSession.aggregate([
          { $match: { ...filters, moodRating: { $exists: true, $ne: null } } },
          {
            $group: {
              _id: null,
              avgMood: { $avg: '$moodRating' },
              avgProgress: { $avg: '$progressRating' },
            },
          },
        ]),
      ]);

      return {
        success: true,
        data: {
          totalSessions,
          byType,
          byStatus,
          byRisk,
          averageMoodRating: avgMood[0]?.avgMood || 0,
          averageProgressRating: avgMood[0]?.avgProgress || 0,
        },
      };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب الإحصائيات', error: error.message };
    }
  }

  // ─── Mental Health Programs ──────────────────────────────────────────────

  async createProgram(data) {
    try {
      const program = new MentalHealthProgram(data);
      await program.save();
      return { success: true, message: 'تم إنشاء البرنامج بنجاح', data: program };
    } catch (error) {
      return { success: false, message: 'خطأ في إنشاء البرنامج', error: error.message };
    }
  }

  async getPrograms(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (Number(page) - 1) * Number(limit);

      const [data, total] = await Promise.all([
        MentalHealthProgram.find(filters)
          .populate('programLead', 'name email')
          .populate('facilitators', 'name email')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        MentalHealthProgram.countDocuments(filters),
      ]);

      return {
        success: true,
        data,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب البرامج', error: error.message };
    }
  }

  async getProgramById(id) {
    try {
      const program = await MentalHealthProgram.findById(id)
        .populate('programLead', 'name email')
        .populate('facilitators', 'name email')
        .populate('enrolledParticipants', 'name nameAr');
      if (!program) return { success: false, message: 'البرنامج غير موجود' };
      return { success: true, data: program };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب البرنامج', error: error.message };
    }
  }

  async updateProgram(id, data) {
    try {
      const program = await MentalHealthProgram.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
      if (!program) return { success: false, message: 'البرنامج غير موجود' };
      return { success: true, message: 'تم تحديث البرنامج بنجاح', data: program };
    } catch (error) {
      return { success: false, message: 'خطأ في تحديث البرنامج', error: error.message };
    }
  }

  async deleteProgram(id) {
    try {
      const program = await MentalHealthProgram.findByIdAndDelete(id);
      if (!program) return { success: false, message: 'البرنامج غير موجود' };
      return { success: true, message: 'تم حذف البرنامج بنجاح' };
    } catch (error) {
      return { success: false, message: 'خطأ في حذف البرنامج', error: error.message };
    }
  }

  async enrollInProgram(programId, beneficiaryId) {
    try {
      const program = await MentalHealthProgram.findById(programId);
      if (!program) return { success: false, message: 'البرنامج غير موجود' };

      if (
        program.maxParticipants &&
        program.enrolledParticipants.length >= program.maxParticipants
      ) {
        return { success: false, message: 'البرنامج ممتلئ' };
      }

      const alreadyEnrolled = program.enrolledParticipants.some(
        p => p.toString() === beneficiaryId.toString()
      );
      if (alreadyEnrolled) {
        return { success: false, message: 'المستفيد مسجّل مسبقاً في البرنامج' };
      }

      program.enrolledParticipants.push(beneficiaryId);
      await program.save();
      return { success: true, message: 'تم التسجيل في البرنامج بنجاح', data: program };
    } catch (error) {
      return { success: false, message: 'خطأ في التسجيل بالبرنامج', error: error.message };
    }
  }

  async unenrollFromProgram(programId, beneficiaryId) {
    try {
      const program = await MentalHealthProgram.findById(programId);
      if (!program) return { success: false, message: 'البرنامج غير موجود' };

      program.enrolledParticipants = program.enrolledParticipants.filter(
        p => p.toString() !== beneficiaryId.toString()
      );
      await program.save();
      return { success: true, message: 'تم إلغاء التسجيل بنجاح', data: program };
    } catch (error) {
      return { success: false, message: 'خطأ في إلغاء التسجيل', error: error.message };
    }
  }

  // ─── Psychological Assessments ───────────────────────────────────────────

  async createAssessment(data) {
    try {
      const assessment = new PsychologicalAssessment(data);
      await assessment.save();
      return { success: true, message: 'تم إنشاء التقييم النفسي بنجاح', data: assessment };
    } catch (error) {
      return { success: false, message: 'خطأ في إنشاء التقييم', error: error.message };
    }
  }

  async getAssessments(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'assessmentDate', sortOrder = 'desc' } = options;
      const skip = (Number(page) - 1) * Number(limit);

      const [data, total] = await Promise.all([
        PsychologicalAssessment.find(filters)
          .populate('beneficiary', 'name nameAr')
          .populate('assessor', 'name email')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        PsychologicalAssessment.countDocuments(filters),
      ]);

      return {
        success: true,
        data,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب التقييمات', error: error.message };
    }
  }

  async getAssessmentById(id) {
    try {
      const assessment = await PsychologicalAssessment.findById(id)
        .populate('beneficiary', 'name nameAr')
        .populate('assessor', 'name email')
        .populate('previousAssessment');
      if (!assessment) return { success: false, message: 'التقييم غير موجود' };
      return { success: true, data: assessment };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب التقييم', error: error.message };
    }
  }

  async updateAssessment(id, data) {
    try {
      const assessment = await PsychologicalAssessment.findById(id);
      if (!assessment) return { success: false, message: 'التقييم غير موجود' };
      Object.assign(assessment, data);
      await assessment.save(); // triggers pre-save for auto-calc
      return { success: true, message: 'تم تحديث التقييم بنجاح', data: assessment };
    } catch (error) {
      return { success: false, message: 'خطأ في تحديث التقييم', error: error.message };
    }
  }

  async deleteAssessment(id) {
    try {
      const assessment = await PsychologicalAssessment.findByIdAndDelete(id);
      if (!assessment) return { success: false, message: 'التقييم غير موجود' };
      return { success: true, message: 'تم حذف التقييم بنجاح' };
    } catch (error) {
      return { success: false, message: 'خطأ في حذف التقييم', error: error.message };
    }
  }

  async getBeneficiaryAssessmentHistory(beneficiaryId) {
    try {
      const assessments = await PsychologicalAssessment.find({ beneficiary: beneficiaryId })
        .populate('assessor', 'name')
        .sort({ assessmentDate: -1 })
        .lean();
      return { success: true, data: assessments };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب سجل التقييمات', error: error.message };
    }
  }

  async getAssessmentStats(filters = {}) {
    try {
      const [total, bySeverity, byType, byTool] = await Promise.all([
        PsychologicalAssessment.countDocuments(filters),
        PsychologicalAssessment.aggregate([
          { $match: filters },
          { $group: { _id: '$severityLevel', count: { $sum: 1 } } },
        ]),
        PsychologicalAssessment.aggregate([
          { $match: filters },
          { $group: { _id: '$type', count: { $sum: 1 }, avgScore: { $avg: '$percentageScore' } } },
        ]),
        PsychologicalAssessment.aggregate([
          { $match: filters },
          { $group: { _id: '$toolUsed', count: { $sum: 1 } } },
        ]),
      ]);

      return {
        success: true,
        data: { total, bySeverity, byType, byTool },
      };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب إحصائيات التقييمات', error: error.message };
    }
  }

  // ─── Crisis Interventions ────────────────────────────────────────────────

  async createCrisis(data) {
    try {
      const crisis = new CrisisIntervention(data);
      await crisis.save();
      return { success: true, message: 'تم تسجيل حالة الأزمة بنجاح', data: crisis };
    } catch (error) {
      return { success: false, message: 'خطأ في تسجيل الأزمة', error: error.message };
    }
  }

  async getCrises(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'reportedDate', sortOrder = 'desc' } = options;
      const skip = (Number(page) - 1) * Number(limit);

      const [data, total] = await Promise.all([
        CrisisIntervention.find(filters)
          .populate('beneficiary', 'name nameAr')
          .populate('reportedBy', 'name email')
          .populate('assignedTo', 'name email')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        CrisisIntervention.countDocuments(filters),
      ]);

      return {
        success: true,
        data,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب حالات الأزمات', error: error.message };
    }
  }

  async getCrisisById(id) {
    try {
      const crisis = await CrisisIntervention.findById(id)
        .populate('beneficiary', 'name nameAr')
        .populate('reportedBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('timeline.performedBy', 'name')
        .populate('followUps.conductedBy', 'name');
      if (!crisis) return { success: false, message: 'حالة الأزمة غير موجودة' };
      return { success: true, data: crisis };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب حالة الأزمة', error: error.message };
    }
  }

  async updateCrisis(id, data) {
    try {
      const crisis = await CrisisIntervention.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
      if (!crisis) return { success: false, message: 'حالة الأزمة غير موجودة' };
      return { success: true, message: 'تم تحديث حالة الأزمة بنجاح', data: crisis };
    } catch (error) {
      return { success: false, message: 'خطأ في تحديث الأزمة', error: error.message };
    }
  }

  async addCrisisTimelineEvent(crisisId, eventData) {
    try {
      const crisis = await CrisisIntervention.findById(crisisId);
      if (!crisis) return { success: false, message: 'حالة الأزمة غير موجودة' };

      crisis.timeline.push(eventData);
      await crisis.save();
      return { success: true, message: 'تمت إضافة حدث للجدول الزمني', data: crisis };
    } catch (error) {
      return { success: false, message: 'خطأ في إضافة الحدث', error: error.message };
    }
  }

  async addCrisisFollowUp(crisisId, followUpData) {
    try {
      const crisis = await CrisisIntervention.findById(crisisId);
      if (!crisis) return { success: false, message: 'حالة الأزمة غير موجودة' };

      crisis.followUps.push(followUpData);
      await crisis.save();
      return { success: true, message: 'تمت إضافة متابعة', data: crisis };
    } catch (error) {
      return { success: false, message: 'خطأ في إضافة المتابعة', error: error.message };
    }
  }

  async deleteCrisis(id) {
    try {
      const crisis = await CrisisIntervention.findByIdAndDelete(id);
      if (!crisis) return { success: false, message: 'حالة الأزمة غير موجودة' };
      return { success: true, message: 'تم حذف حالة الأزمة بنجاح' };
    } catch (error) {
      return { success: false, message: 'خطأ في حذف حالة الأزمة', error: error.message };
    }
  }

  async getCrisisStats(filters = {}) {
    try {
      const [total, bySeverity, byType, byStatus, activeCritical] = await Promise.all([
        CrisisIntervention.countDocuments(filters),
        CrisisIntervention.aggregate([
          { $match: filters },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        CrisisIntervention.aggregate([
          { $match: filters },
          { $group: { _id: '$crisisType', count: { $sum: 1 } } },
        ]),
        CrisisIntervention.aggregate([
          { $match: filters },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        CrisisIntervention.countDocuments({
          ...filters,
          severity: { $in: ['حرج', 'critical', 'مرتفع', 'high'] },
          status: { $nin: ['تم الحل', 'resolved'] },
        }),
      ]);

      return {
        success: true,
        data: { total, bySeverity, byType, byStatus, activeCritical },
      };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب إحصائيات الأزمات', error: error.message };
    }
  }

  // ─── Support Groups ──────────────────────────────────────────────────────

  async createGroup(data) {
    try {
      const group = new SupportGroup(data);
      await group.save();
      return { success: true, message: 'تم إنشاء مجموعة الدعم بنجاح', data: group };
    } catch (error) {
      return { success: false, message: 'خطأ في إنشاء المجموعة', error: error.message };
    }
  }

  async getGroups(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (Number(page) - 1) * Number(limit);

      const [data, total] = await Promise.all([
        SupportGroup.find(filters)
          .populate('facilitator', 'name email')
          .populate('coFacilitator', 'name email')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        SupportGroup.countDocuments(filters),
      ]);

      return {
        success: true,
        data,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب المجموعات', error: error.message };
    }
  }

  async getGroupById(id) {
    try {
      const group = await SupportGroup.findById(id)
        .populate('facilitator', 'name email')
        .populate('coFacilitator', 'name email')
        .populate('members.beneficiary', 'name nameAr');
      if (!group) return { success: false, message: 'المجموعة غير موجودة' };
      return { success: true, data: group };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب المجموعة', error: error.message };
    }
  }

  async updateGroup(id, data) {
    try {
      const group = await SupportGroup.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
      if (!group) return { success: false, message: 'المجموعة غير موجودة' };
      return { success: true, message: 'تم تحديث المجموعة بنجاح', data: group };
    } catch (error) {
      return { success: false, message: 'خطأ في تحديث المجموعة', error: error.message };
    }
  }

  async deleteGroup(id) {
    try {
      const group = await SupportGroup.findByIdAndDelete(id);
      if (!group) return { success: false, message: 'المجموعة غير موجودة' };
      return { success: true, message: 'تم حذف المجموعة بنجاح' };
    } catch (error) {
      return { success: false, message: 'خطأ في حذف المجموعة', error: error.message };
    }
  }

  async addGroupMember(groupId, beneficiaryId) {
    try {
      const group = await SupportGroup.findById(groupId);
      if (!group) return { success: false, message: 'المجموعة غير موجودة' };

      const activeMembers = group.members.filter(m => m.status === 'active');
      if (group.maxMembers && activeMembers.length >= group.maxMembers) {
        return { success: false, message: 'المجموعة ممتلئة' };
      }

      const existing = group.members.find(
        m => m.beneficiary.toString() === beneficiaryId.toString() && m.status === 'active'
      );
      if (existing) {
        return { success: false, message: 'العضو موجود مسبقاً في المجموعة' };
      }

      group.members.push({ beneficiary: beneficiaryId, status: 'active' });
      await group.save();
      return { success: true, message: 'تمت إضافة العضو بنجاح', data: group };
    } catch (error) {
      return { success: false, message: 'خطأ في إضافة العضو', error: error.message };
    }
  }

  async removeGroupMember(groupId, beneficiaryId) {
    try {
      const group = await SupportGroup.findById(groupId);
      if (!group) return { success: false, message: 'المجموعة غير موجودة' };

      const member = group.members.find(m => m.beneficiary.toString() === beneficiaryId.toString());
      if (!member) return { success: false, message: 'العضو غير موجود في المجموعة' };

      member.status = 'withdrawn';
      await group.save();
      return { success: true, message: 'تم إزالة العضو بنجاح', data: group };
    } catch (error) {
      return { success: false, message: 'خطأ في إزالة العضو', error: error.message };
    }
  }

  async addGroupSession(groupId, sessionData) {
    try {
      const group = await SupportGroup.findById(groupId);
      if (!group) return { success: false, message: 'المجموعة غير موجودة' };

      const sessionNumber = (group.sessions?.length || 0) + 1;
      group.sessions.push({ ...sessionData, sessionNumber });
      await group.save();
      return { success: true, message: 'تمت إضافة جلسة المجموعة بنجاح', data: group };
    } catch (error) {
      return { success: false, message: 'خطأ في إضافة الجلسة', error: error.message };
    }
  }

  // ─── Dashboard / Overview ────────────────────────────────────────────────

  async getDashboardStats() {
    try {
      const [sessions, programs, assessments, crises, groups] = await Promise.all([
        this.getSessionStats(),
        MentalHealthProgram.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        this.getAssessmentStats(),
        this.getCrisisStats(),
        SupportGroup.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ]);

      return {
        success: true,
        data: {
          sessions: sessions.data,
          programs,
          assessments: assessments.data,
          crises: crises.data,
          groups,
        },
      };
    } catch (error) {
      return { success: false, message: 'خطأ في جلب لوحة المعلومات', error: error.message };
    }
  }
}

module.exports = new MHPSSService();
