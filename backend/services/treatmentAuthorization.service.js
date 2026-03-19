/**
 * خدمة إذن العلاج / الموافقة المسبقة
 * Treatment Authorization Service
 */

const { TreatmentAuthorization } = require('../models/treatmentAuthorization.model');

class TreatmentAuthorizationService {
  /**
   * إنشاء طلب إذن علاج جديد
   */
  static async createRequest(data, userId) {
    const authorizationNumber = await this._generateAuthNumber();

    // حساب التكاليف
    const totalEstimatedCost = (data.services || []).reduce(
      (sum, s) => sum + (s.estimatedCost || 0),
      0
    );

    const request = new TreatmentAuthorization({
      ...data,
      authorizationNumber,
      financials: {
        totalEstimatedCost,
        totalApprovedCost: 0,
        patientResponsibility: 0,
        insurerResponsibility: 0,
      },
      createdBy: userId,
      auditLog: [
        {
          action: 'created',
          newStatus: 'draft',
          by: userId,
          details: 'تم إنشاء طلب إذن العلاج',
        },
      ],
    });

    return request.save();
  }

  /**
   * جلب الطلبات مع التصفية
   */
  static async getRequests(filters = {}) {
    const query = { isDeleted: false };
    if (filters.status) query.status = filters.status;
    if (filters.beneficiary) query.beneficiary = filters.beneficiary;
    if (filters.branch) query.branch = filters.branch;
    if (filters.priority) query.priority = filters.priority;
    if (filters.requestType) query.requestType = filters.requestType;
    if (filters.insuranceProvider) query['insurance.provider'] = filters.insuranceProvider;

    // بحث بالنص
    if (filters.search) {
      const rx = new RegExp(filters.search, 'i');
      query.$or = [
        { authorizationNumber: rx },
        { beneficiaryName: rx },
        { nationalId: rx },
        { 'insurance.policyNumber': rx },
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [requests, total] = await Promise.all([
      TreatmentAuthorization.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('beneficiary', 'name nationalId')
        .populate('createdBy', 'name')
        .select('-auditLog -followUps'),
      TreatmentAuthorization.countDocuments(query),
    ]);

    return { requests, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * جلب طلب واحد بالتفاصيل الكاملة
   */
  static async getRequestById(id) {
    return TreatmentAuthorization.findOne({ _id: id, isDeleted: false })
      .populate('beneficiary', 'name nationalId dateOfBirth gender')
      .populate('createdBy workflow.submittedBy workflow.reviewedBy', 'name email')
      .populate('attachments.uploadedBy', 'name')
      .populate('followUps.by', 'name')
      .populate('auditLog.by', 'name');
  }

  /**
   * تحديث طلب (مسودة فقط)
   */
  static async updateRequest(id, data, userId) {
    const request = await TreatmentAuthorization.findById(id);
    if (!request) throw new Error('الطلب غير موجود');
    if (!['draft', 'info_requested'].includes(request.status)) {
      throw new Error('لا يمكن تعديل الطلب في هذه المرحلة');
    }

    const prevStatus = request.status;
    Object.assign(request, data);

    // إعادة حساب التكاليف
    if (data.services) {
      request.financials.totalEstimatedCost = data.services.reduce(
        (sum, s) => sum + (s.estimatedCost || 0),
        0
      );
    }

    request.auditLog.push({
      action: 'updated',
      previousStatus: prevStatus,
      newStatus: request.status,
      by: userId,
      details: 'تم تحديث بيانات الطلب',
    });

    return request.save();
  }

  /**
   * تقديم الطلب للمراجعة الداخلية
   */
  static async submitForReview(id, userId) {
    const request = await TreatmentAuthorization.findById(id);
    if (!request) throw new Error('الطلب غير موجود');
    if (request.status !== 'draft') {
      throw new Error('يجب أن يكون الطلب في حالة مسودة');
    }

    // التحقق من اكتمال البيانات
    this._validateRequest(request);

    request.status = 'pending_review';
    request.auditLog.push({
      action: 'submitted_for_review',
      previousStatus: 'draft',
      newStatus: 'pending_review',
      by: userId,
      details: 'تم تقديم الطلب للمراجعة الداخلية',
    });

    return request.save();
  }

  /**
   * مراجعة داخلية وتقديم لشركة التأمين
   */
  static async submitToInsurer(id, userId) {
    const request = await TreatmentAuthorization.findById(id);
    if (!request) throw new Error('الطلب غير موجود');
    if (request.status !== 'pending_review') {
      throw new Error('الطلب غير جاهز للتقديم');
    }

    request.status = 'submitted';
    request.workflow.submittedAt = new Date();
    request.workflow.submittedBy = userId;
    request.workflow.reviewedBy = userId;
    request.workflow.reviewedAt = new Date();

    request.auditLog.push({
      action: 'submitted_to_insurer',
      previousStatus: 'pending_review',
      newStatus: 'submitted',
      by: userId,
      details: 'تم تقديم الطلب لشركة التأمين',
    });

    return request.save();
  }

  /**
   * تسجيل رد شركة التأمين
   */
  static async recordInsurerResponse(id, responseData, userId) {
    const request = await TreatmentAuthorization.findById(id);
    if (!request) throw new Error('الطلب غير موجود');
    if (!['submitted', 'under_review'].includes(request.status)) {
      throw new Error('الطلب ليس في مرحلة انتظار الرد');
    }

    const prevStatus = request.status;
    request.insurerResponse = responseData;

    // تحديث الحالة بناءً على القرار
    if (responseData.decision === 'approved') {
      request.status = 'approved';
      request.workflow.approvedAt = new Date();
      request.workflow.expiresAt = responseData.validTo;

      // تحديث الجلسات والتكاليف الموافق عليها لكل خدمة
      if (responseData.serviceApprovals) {
        responseData.serviceApprovals.forEach(sa => {
          const svc = request.services.find(s => s.serviceCode === sa.serviceCode);
          if (svc) {
            svc.status = 'approved';
            svc.approvedSessions = sa.approvedSessions;
            svc.approvedCost = sa.approvedCost;
          }
        });
      }

      request.financials.totalApprovedCost = responseData.approvedAmount || 0;
      request.financials.insurerResponsibility =
        responseData.approvedAmount * ((100 - (request.insurance.copayPercentage || 0)) / 100);
      request.financials.patientResponsibility =
        responseData.approvedAmount * ((request.insurance.copayPercentage || 0) / 100);
    } else if (responseData.decision === 'partially_approved') {
      request.status = 'partially_approved';
      request.workflow.approvedAt = new Date();
      request.workflow.expiresAt = responseData.validTo;
      request.financials.totalApprovedCost = responseData.approvedAmount || 0;
    } else if (responseData.decision === 'denied') {
      request.status = 'denied';
      request.workflow.deniedAt = new Date();
    } else if (responseData.decision === 'info_requested') {
      request.status = 'info_requested';
    }

    request.auditLog.push({
      action: 'insurer_responded',
      previousStatus: prevStatus,
      newStatus: request.status,
      by: userId,
      details: `رد شركة التأمين: ${responseData.decision} - ${responseData.notes || ''}`,
    });

    return request.save();
  }

  /**
   * تقديم استئناف
   */
  static async submitAppeal(id, appealData, userId) {
    const request = await TreatmentAuthorization.findById(id);
    if (!request) throw new Error('الطلب غير موجود');
    if (!['denied', 'partially_approved'].includes(request.status)) {
      throw new Error('لا يمكن الاستئناف إلا على الطلبات المرفوضة أو الموافق عليها جزئياً');
    }

    request.appeal = {
      ...appealData,
      submittedAt: new Date(),
      submittedBy: userId,
    };
    request.status = 'appealed';
    request.workflow.appealedAt = new Date();

    request.auditLog.push({
      action: 'appeal_submitted',
      previousStatus: request.status,
      newStatus: 'appealed',
      by: userId,
      details: `تم تقديم استئناف: ${appealData.reason}`,
    });

    return request.save();
  }

  /**
   * تسجيل نتيجة الاستئناف
   */
  static async recordAppealDecision(id, decision, notes, userId) {
    const request = await TreatmentAuthorization.findById(id);
    if (!request) throw new Error('الطلب غير موجود');
    if (request.status !== 'appealed') throw new Error('لا يوجد استئناف قائم');

    request.appeal.decision = decision;
    request.appeal.decisionDate = new Date();
    request.appeal.notes = notes;
    request.status = decision === 'approved' ? 'appeal_approved' : 'appeal_denied';
    request.workflow.appealDecisionAt = new Date();

    if (decision === 'approved') {
      request.workflow.approvedAt = new Date();
    }

    request.auditLog.push({
      action: 'appeal_decided',
      previousStatus: 'appealed',
      newStatus: request.status,
      by: userId,
      details: `نتيجة الاستئناف: ${decision} - ${notes}`,
    });

    return request.save();
  }

  /**
   * تسجيل استخدام جلسة
   */
  static async recordSessionUsage(id, serviceCode, sessionData, userId) {
    const request = await TreatmentAuthorization.findById(id);
    if (!request) throw new Error('الطلب غير موجود');
    if (!['approved', 'partially_approved', 'appeal_approved'].includes(request.status)) {
      throw new Error('الطلب غير موافق عليه');
    }

    const svc = request.services.find(s => s.serviceCode === serviceCode);
    if (!svc) throw new Error('الخدمة غير موجودة في الطلب');

    svc.usedSessions = (svc.usedSessions || 0) + 1;

    request.followUps.push({
      action: 'session_recorded',
      by: userId,
      notes: `جلسة ${svc.serviceName} - ${sessionData.notes || ''}`,
      result: `${svc.usedSessions}/${svc.approvedSessions || svc.requestedSessions}`,
    });

    return request.save();
  }

  /**
   * إضافة متابعة
   */
  static async addFollowUp(id, followUpData, userId) {
    const request = await TreatmentAuthorization.findById(id);
    if (!request) throw new Error('الطلب غير موجود');

    request.followUps.push({
      ...followUpData,
      by: userId,
    });

    return request.save();
  }

  /**
   * فحص الطلبات المنتهية
   */
  static async checkExpiring() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return TreatmentAuthorization.find({
      status: { $in: ['approved', 'partially_approved', 'appeal_approved'] },
      'workflow.expiresAt': { $lte: thirtyDaysFromNow, $gte: new Date() },
      isDeleted: false,
    })
      .populate('beneficiary', 'name nationalId')
      .sort({ 'workflow.expiresAt': 1 })
      .lean();
  }

  /**
   * لوحة المعلومات
   */
  static async getDashboard(branch) {
    const query = { isDeleted: false };
    if (branch) query.branch = branch;

    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      deniedRequests,
      expiringRequests,
      recentRequests,
    ] = await Promise.all([
      TreatmentAuthorization.countDocuments(query),
      TreatmentAuthorization.countDocuments({
        ...query,
        status: { $in: ['draft', 'pending_review', 'submitted', 'under_review', 'info_requested'] },
      }),
      TreatmentAuthorization.countDocuments({
        ...query,
        status: { $in: ['approved', 'partially_approved', 'appeal_approved'] },
      }),
      TreatmentAuthorization.countDocuments({
        ...query,
        status: { $in: ['denied', 'appeal_denied'] },
      }),
      this.checkExpiring(),
      TreatmentAuthorization.find(query)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('beneficiary', 'name')
        .select('authorizationNumber beneficiaryName status priority requestType createdAt')
        .lean(),
    ]);

    // معدل الموافقة
    const totalDecided = approvedRequests + deniedRequests;
    const approvalRate = totalDecided > 0 ? Math.round((approvedRequests / totalDecided) * 100) : 0;

    // متوسط وقت الاستجابة
    const avgResponseTime = await this._calculateAvgResponseTime(query);

    // توزيع حسب الخدمة
    const byServiceCategory = await TreatmentAuthorization.aggregate([
      { $match: query },
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.serviceCategory',
          count: { $sum: 1 },
          totalRequested: { $sum: '$services.requestedSessions' },
          totalApproved: { $sum: '$services.approvedSessions' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return {
      summary: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        deniedRequests,
        approvalRate,
        avgResponseTimeDays: avgResponseTime,
      },
      expiringCount: expiringRequests.length,
      expiringRequests: expiringRequests.slice(0, 5),
      recentRequests,
      byServiceCategory,
    };
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  static async _generateAuthNumber() {
    const year = new Date().getFullYear();
    const count = await TreatmentAuthorization.countDocuments({
      createdAt: { $gte: new Date(`${year}-01-01`) },
    });
    return `TA-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  static _validateRequest(request) {
    const errors = [];
    if (!request.beneficiary) errors.push('المستفيد مطلوب');
    if (!request.insurance || !request.insurance.provider) errors.push('معلومات التأمين مطلوبة');
    if (!request.services || request.services.length === 0)
      errors.push('يجب تحديد خدمة واحدة على الأقل');
    if (!request.clinicalInfo || !request.clinicalInfo.medicalJustification) {
      errors.push('المبررات الطبية مطلوبة');
    }
    if (!request.requestingProvider || !request.requestingProvider.name) {
      errors.push('معلومات الطبيب / المعالج مطلوبة');
    }
    if (errors.length > 0) throw new Error(errors.join(' | '));
  }

  static async _calculateAvgResponseTime(query) {
    const decided = await TreatmentAuthorization.find({
      ...query,
      status: { $in: ['approved', 'partially_approved', 'denied'] },
      'workflow.submittedAt': { $exists: true },
      'workflow.approvedAt': { $exists: true },
    })
      .select('workflow.submittedAt workflow.approvedAt workflow.deniedAt')
      .lean();

    if (decided.length === 0) return 0;

    const totalDays = decided.reduce((sum, r) => {
      const submitted = r.workflow.submittedAt;
      const decided = r.workflow.approvedAt || r.workflow.deniedAt;
      if (submitted && decided) {
        return sum + (decided - submitted) / (1000 * 60 * 60 * 24);
      }
      return sum;
    }, 0);

    return Math.round((totalDays / decided.length) * 10) / 10;
  }
}

module.exports = TreatmentAuthorizationService;
