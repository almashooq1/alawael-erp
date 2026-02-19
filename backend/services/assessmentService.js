/**
 * Assessment Management Service
 *
 * خدمة إدارة التقييمات والتشخيصات
 * تتضمن: إنشاء، تحديث، البحث، والموافقة على التقييمات
 */

const Assessment = require('../models/assessment.model');
const Case = require('../models/case.model');
const Beneficiary = require('../models/beneficiary.model');

class AssessmentService {
  /**
   * إنشاء تقييم جديد
   */
  static async createAssessment(assessmentData, userId) {
    try {
      // التحقق من وجود الحالة
      const caseExists = await Case.findById(assessmentData.caseId);
      if (!caseExists) {
        throw new Error('الحالة غير موجودة');
      }

      const assessment = new Assessment({
        ...assessmentData,
        assessor: userId,
        createdBy: userId,
      });

      await assessment.save();
      return assessment;
    } catch (err) {
      throw new Error('خطأ في إنشاء التقييم: ' + err.message);
    }
  }

  /**
   * جلب التقييمات مع التصفية
   */
  static async getAssessments(filters = {}, pagination = {}) {
    try {
      const query = { isArchived: false };

      if (filters.caseId) query.caseId = filters.caseId;
      if (filters.beneficiaryId) query.beneficiaryId = filters.beneficiaryId;
      if (filters.assessmentType) query.assessmentType = filters.assessmentType;
      if (filters.status) query.status = filters.status;
      if (filters.assessor) query.assessor = filters.assessor;

      // تصفية حسب التاريخ
      if (filters.startDate || filters.endDate) {
        query.assessmentDate = {};
        if (filters.startDate) {
          query.assessmentDate.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.assessmentDate.$lte = new Date(filters.endDate);
        }
      }

      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const assessments = await Assessment.find(query)
        .populate('caseId')
        .populate('beneficiaryId')
        .populate('assessor', 'name email')
        .populate('reviewedBy', 'name email')
        .sort({ assessmentDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Assessment.countDocuments(query);

      return {
        assessments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      throw new Error('خطأ في جلب التقييمات: ' + err.message);
    }
  }

  /**
   * جلب تقييم واحد
   */
  static async getAssessmentById(assessmentId) {
    try {
      const assessment = await Assessment.findById(assessmentId)
        .populate('caseId')
        .populate('beneficiaryId')
        .populate('assessor', 'name email')
        .populate('reviewedBy', 'name email')
        .populate('createdBy', 'name email');

      if (!assessment) {
        throw new Error('التقييم غير موجود');
      }

      return assessment;
    } catch (err) {
      throw new Error('خطأ في جلب التقييم: ' + err.message);
    }
  }

  /**
   * تحديث التقييم
   */
  static async updateAssessment(assessmentId, updateData, userId) {
    try {
      const assessment = await Assessment.findByIdAndUpdate(
        assessmentId,
        { ...updateData, lastModifiedBy: userId, updatedAt: new Date() },
        { new: true }
      );

      if (!assessment) {
        throw new Error('التقييم غير موجود');
      }

      return assessment;
    } catch (err) {
      throw new Error('خطأ في تحديث التقييم: ' + err.message);
    }
  }

  /**
   * الموافقة على التقييم
   */
  static async approveAssessment(assessmentId, userId, notes = '') {
    try {
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        throw new Error('التقييم غير موجود');
      }

      return await assessment.approve(userId, notes);
    } catch (err) {
      throw new Error('خطأ في الموافقة على التقييم: ' + err.message);
    }
  }

  /**
   * رفض التقييم
   */
  static async rejectAssessment(assessmentId, userId, reason = '') {
    try {
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        throw new Error('التقييم غير موجود');
      }

      return await assessment.reject(userId, reason);
    } catch (err) {
      throw new Error('خطأ في رفض التقييم: ' + err.message);
    }
  }

  /**
   * أرشفة التقييم
   */
  static async archiveAssessment(assessmentId) {
    try {
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        throw new Error('التقييم غير موجود');
      }

      return await assessment.archive();
    } catch (err) {
      throw new Error('خطأ في أرشفة التقييم: ' + err.message);
    }
  }

  /**
   * حذف التقييم
   */
  static async deleteAssessment(assessmentId) {
    try {
      const assessment = await Assessment.findByIdAndRemove(assessmentId);
      if (!assessment) {
        throw new Error('التقييم غير موجود');
      }

      return assessment;
    } catch (err) {
      throw new Error('خطأ في حذف التقييم: ' + err.message);
    }
  }

  /**
   * الحصول على إحصائيات التقييمات
   */
  static async getStatistics(filters = {}) {
    try {
      const query = { isArchived: false };
      if (filters.caseId) query.caseId = filters.caseId;

      const total = await Assessment.countDocuments(query);
      const completed = await Assessment.countDocuments({ ...query, status: 'approved' });
      const pending = await Assessment.countDocuments({
        ...query,
        status: { $in: ['draft', 'under_review'] },
      });
      const rejected = await Assessment.countDocuments({ ...query, status: 'rejected' });

      const byType = await Assessment.aggregate([
        { $match: query },
        { $group: { _id: '$assessmentType', count: { $sum: 1 } } },
      ]);

      const byStatus = await Assessment.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      return {
        summary: {
          total,
          completed,
          pending,
          rejected,
        },
        byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
      };
    } catch (err) {
      throw new Error('خطأ في حساب الإحصائيات: ' + err.message);
    }
  }

  /**
   * البحث المتقدم
   */
  static async advancedSearch(searchParams) {
    try {
      const query = { isArchived: false };

      if (searchParams.text) {
        query.$or = [
          { title: { $regex: searchParams.text, $options: 'i' } },
          { description: { $regex: searchParams.text, $options: 'i' } },
          { 'observations.strengths': { $regex: searchParams.text, $options: 'i' } },
          { 'observations.challenges': { $regex: searchParams.text, $options: 'i' } },
        ];
      }

      if (searchParams.performanceLevel) {
        query['results.performanceLevel'] = searchParams.performanceLevel;
      }

      if (searchParams.minScore) {
        query['results.percentageScore'] = { $gte: searchParams.minScore };
      }

      const assessments = await Assessment.find(query)
        .populate('caseId')
        .populate('beneficiaryId')
        .limit(50);

      return assessments;
    } catch (err) {
      throw new Error('خطأ في البحث: ' + err.message);
    }
  }

  /**
   * الحصول على التقييمات المعلقة
   */
  static async getPendingAssessments() {
    try {
      const assessments = await Assessment.find({
        status: { $in: ['draft', 'under_review'] },
        isArchived: false,
      })
        .populate('caseId')
        .populate('beneficiaryId')
        .populate('assessor', 'name')
        .sort({ assessmentDate: -1 })
        .limit(50);

      return assessments;
    } catch (err) {
      throw new Error('خطأ في جلب التقييمات المعلقة: ' + err.message);
    }
  }

  /**
   * الحصول على التقييمات حسب النوع
   */
  static async getAssessmentsByType(type) {
    try {
      return await Assessment.searchByType(type).populate('caseId').populate('beneficiaryId');
    } catch (err) {
      throw new Error('خطأ في جلب التقييمات حسب النوع: ' + err.message);
    }
  }
}

module.exports = AssessmentService;
