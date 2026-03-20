/**
 * Post-Rehabilitation Follow-Up Service
 * خدمة المتابعة ما بعد التأهيل
 *
 * Business logic for:
 *  - Case management after program graduation
 *  - Periodic follow-up visits (home / remote)
 *  - Long-term impact measurement (6mo, 1yr, 2yr)
 *  - Satisfaction & outcome surveys
 *  - Automatic re-enrollment when regression detected
 */

const {
  PostRehabCase,
  FollowUpVisit,
  ImpactMeasurement,
  PostRehabSurvey,
  ReEnrollmentRequest,
} = require('../models/PostRehabFollowUp');
const { escapeRegex } = require('../utils/sanitize');

class PostRehabFollowUpService {
  // ══════════════════════════════════════════════════════════════════════════
  // POST-REHAB CASES — إدارة حالات ما بعد التأهيل
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new post-rehab follow-up case
   * إنشاء حالة متابعة جديدة بعد التخرج من البرنامج
   */
  async createCase(data) {
    const postRehabCase = new PostRehabCase(data);

    // Auto-generate impact milestones
    if (data.dischargeDate) {
      const discharge = new Date(data.dischargeDate);
      postRehabCase.impactMilestones = [
        {
          milestone: '6_MONTHS',
          dueDate: new Date(discharge.getTime() + 6 * 30.44 * 24 * 60 * 60 * 1000),
          isCompleted: false,
        },
        {
          milestone: '1_YEAR',
          dueDate: new Date(discharge.getTime() + 12 * 30.44 * 24 * 60 * 60 * 1000),
          isCompleted: false,
        },
        {
          milestone: '2_YEARS',
          dueDate: new Date(discharge.getTime() + 24 * 30.44 * 24 * 60 * 60 * 1000),
          isCompleted: false,
        },
      ];

      // Set follow-up plan dates
      if (!postRehabCase.followUpPlan.startDate) {
        postRehabCase.followUpPlan.startDate = discharge;
      }
      if (!postRehabCase.followUpPlan.endDate) {
        const durationMap = {
          '3_MONTHS': 3,
          '6_MONTHS': 6,
          '1_YEAR': 12,
          '2_YEARS': 24,
          '3_YEARS': 36,
          INDEFINITE: 60,
        };
        const months = durationMap[postRehabCase.followUpPlan.duration] || 24;
        postRehabCase.followUpPlan.endDate = new Date(
          discharge.getTime() + months * 30.44 * 24 * 60 * 60 * 1000
        );
      }
    }

    await postRehabCase.save();
    return {
      success: true,
      message: 'تم إنشاء حالة المتابعة ما بعد التأهيل بنجاح',
      data: postRehabCase,
    };
  }

  /**
   * Get case by ID
   */
  async getCaseById(caseId) {
    const postRehabCase = await PostRehabCase.findById(caseId)
      .populate('beneficiary', 'name nameAr nationalId phone email')
      .populate('assignedSpecialist', 'name nameAr email role')
      .populate('assignedTeam', 'name nameAr email role')
      .populate('createdBy', 'name nameAr');
    if (!postRehabCase) {
      throw new Error('حالة المتابعة غير موجودة');
    }
    return { success: true, data: postRehabCase };
  }

  /**
   * List cases with filters, pagination, and search
   */
  async listCases(query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      category,
      assignedSpecialist,
      branch,
      search,
      sortBy = 'createdAt',
      sortOrder = -1,
      dueSoon,
    } = query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedSpecialist) filter.assignedSpecialist = assignedSpecialist;
    if (branch) filter.branch = branch;
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { caseNumber: { $regex: escaped, $options: 'i' } },
        { originalProgramName: { $regex: escaped, $options: 'i' } },
        { originalProgramNameAr: { $regex: escaped, $options: 'i' } },
        { notes: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (dueSoon) {
      const daysAhead = parseInt(dueSoon, 10) || 7;
      const now = new Date();
      const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      filter['followUpPlan.nextScheduledVisit'] = { $gte: now, $lte: future };
    }

    const skip = (page - 1) * limit;
    const [cases, total] = await Promise.all([
      PostRehabCase.find(filter)
        .populate('beneficiary', 'name nameAr nationalId')
        .populate('assignedSpecialist', 'name nameAr')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      PostRehabCase.countDocuments(filter),
    ]);

    return {
      success: true,
      data: cases,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update case
   */
  async updateCase(caseId, data) {
    const postRehabCase = await PostRehabCase.findByIdAndUpdate(caseId, data, {
      new: true,
      runValidators: true,
    });
    if (!postRehabCase) {
      throw new Error('حالة المتابعة غير موجودة');
    }
    return {
      success: true,
      message: 'تم تحديث حالة المتابعة بنجاح',
      data: postRehabCase,
    };
  }

  /**
   * Add alert to case
   */
  async addAlert(caseId, alertData) {
    const postRehabCase = await PostRehabCase.findById(caseId);
    if (!postRehabCase) throw new Error('حالة المتابعة غير موجودة');

    if (!postRehabCase.alerts) postRehabCase.alerts = [];
    postRehabCase.alerts.push(alertData);

    // Auto-escalate priority if critical alert
    if (alertData.severity === 'CRITICAL' && postRehabCase.priority !== 'CRITICAL') {
      postRehabCase.priority = 'CRITICAL';
    }

    await postRehabCase.save();
    return { success: true, message: 'تم إضافة التنبيه بنجاح', data: postRehabCase };
  }

  /**
   * Resolve alert
   */
  async resolveAlert(caseId, alertId, userId) {
    const postRehabCase = await PostRehabCase.findById(caseId);
    if (!postRehabCase) throw new Error('حالة المتابعة غير موجودة');

    const alert = postRehabCase.alerts.id(alertId);
    if (!alert) throw new Error('التنبيه غير موجود');

    alert.isResolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;
    await postRehabCase.save();

    return { success: true, message: 'تم حل التنبيه بنجاح', data: postRehabCase };
  }

  /**
   * Get overdue cases (missed follow-up visits)
   */
  async getOverdueCases() {
    const now = new Date();
    const cases = await PostRehabCase.find({
      status: 'ACTIVE',
      'followUpPlan.nextScheduledVisit': { $lt: now },
    })
      .populate('beneficiary', 'name nameAr nationalId phone')
      .populate('assignedSpecialist', 'name nameAr email')
      .sort({ 'followUpPlan.nextScheduledVisit': 1 });

    return { success: true, count: cases.length, data: cases };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOLLOW-UP VISITS — زيارات المتابعة الدورية
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Schedule a follow-up visit
   */
  async scheduleVisit(data) {
    // Auto-set visit number
    if (!data.visitNumber) {
      const count = await FollowUpVisit.countDocuments({
        postRehabCase: data.postRehabCase,
      });
      data.visitNumber = count + 1;
    }

    const visit = new FollowUpVisit(data);
    await visit.save();

    // Update case next scheduled visit
    await PostRehabCase.findByIdAndUpdate(data.postRehabCase, {
      'followUpPlan.nextScheduledVisit': data.scheduledDate,
      $inc: { 'followUpPlan.totalPlannedVisits': 1 },
    });

    return {
      success: true,
      message: 'تم جدولة زيارة المتابعة بنجاح',
      data: visit,
    };
  }

  /**
   * Complete a follow-up visit with assessment data
   */
  async completeVisit(visitId, completionData) {
    const visit = await FollowUpVisit.findById(visitId);
    if (!visit) throw new Error('الزيارة غير موجودة');

    Object.assign(visit, completionData, {
      status: 'COMPLETED',
      actualDate: completionData.actualDate || new Date(),
    });
    await visit.save();

    // Update case statistics
    const caseUpdate = {
      $inc: { 'followUpPlan.completedVisits': 1 },
    };

    // Check if re-enrollment is needed
    if (visit.needsReEnrollment) {
      await this._autoTriggerReEnrollment(visit);
    }

    // Schedule next visit
    const postRehabCase = await PostRehabCase.findById(visit.postRehabCase);
    if (postRehabCase && postRehabCase.status === 'ACTIVE') {
      const nextDate = this._calculateNextVisitDate(
        visit.actualDate || new Date(),
        postRehabCase.followUpPlan.frequency
      );
      if (nextDate <= postRehabCase.followUpPlan.endDate) {
        caseUpdate['followUpPlan.nextScheduledVisit'] = nextDate;
      }
    }

    await PostRehabCase.findByIdAndUpdate(visit.postRehabCase, caseUpdate);

    // Check for regression alerts
    await this._checkForRegression(visit);

    return {
      success: true,
      message: 'تم إكمال الزيارة بنجاح',
      data: visit,
    };
  }

  /**
   * Get visit by ID
   */
  async getVisitById(visitId) {
    const visit = await FollowUpVisit.findById(visitId)
      .populate('postRehabCase', 'caseNumber status')
      .populate('beneficiary', 'name nameAr nationalId')
      .populate('conductedBy', 'name nameAr email');
    if (!visit) throw new Error('الزيارة غير موجودة');
    return { success: true, data: visit };
  }

  /**
   * List visits for a case
   */
  async listVisits(query = {}) {
    const {
      postRehabCase,
      beneficiary,
      conductedBy,
      status,
      visitType,
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = query;

    const filter = {};
    if (postRehabCase) filter.postRehabCase = postRehabCase;
    if (beneficiary) filter.beneficiary = beneficiary;
    if (conductedBy) filter.conductedBy = conductedBy;
    if (status) filter.status = status;
    if (visitType) filter.visitType = visitType;
    if (startDate || endDate) {
      filter.scheduledDate = {};
      if (startDate) filter.scheduledDate.$gte = new Date(startDate);
      if (endDate) filter.scheduledDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [visits, total] = await Promise.all([
      FollowUpVisit.find(filter)
        .populate('beneficiary', 'name nameAr')
        .populate('conductedBy', 'name nameAr')
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FollowUpVisit.countDocuments(filter),
    ]);

    return {
      success: true,
      data: visits,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark visit as missed
   */
  async markVisitMissed(visitId, reason) {
    const visit = await FollowUpVisit.findByIdAndUpdate(
      visitId,
      { status: 'MISSED', notes: reason },
      { new: true }
    );
    if (!visit) throw new Error('الزيارة غير موجودة');

    // Update case
    await PostRehabCase.findByIdAndUpdate(visit.postRehabCase, {
      $inc: { 'followUpPlan.missedVisits': 1 },
    });

    // Add alert if too many missed
    const postRehabCase = await PostRehabCase.findById(visit.postRehabCase);
    if (postRehabCase && postRehabCase.followUpPlan.missedVisits >= 3) {
      await this.addAlert(visit.postRehabCase, {
        type: 'MISSED_VISIT',
        severity: 'HIGH',
        message: `Beneficiary has missed ${postRehabCase.followUpPlan.missedVisits} follow-up visits`,
        messageAr: `تغيب المستفيد عن ${postRehabCase.followUpPlan.missedVisits} زيارات متابعة`,
      });
    }

    return { success: true, message: 'تم تسجيل الزيارة كمتغيب عنها', data: visit };
  }

  /**
   * Get upcoming visits (next N days)
   */
  async getUpcomingVisits(days = 7, specialistId = null) {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const filter = {
      status: 'SCHEDULED',
      scheduledDate: { $gte: now, $lte: future },
    };
    if (specialistId) filter.conductedBy = specialistId;

    const visits = await FollowUpVisit.find(filter)
      .populate('beneficiary', 'name nameAr phone')
      .populate('postRehabCase', 'caseNumber category')
      .sort({ scheduledDate: 1 });

    return { success: true, count: visits.length, data: visits };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IMPACT MEASUREMENT — قياس الأثر طويل المدى
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Create impact measurement (6 months / 1 year / 2 years)
   */
  async createImpactMeasurement(data) {
    // Calculate improvement percentage
    if (data.overallScore != null && data.overallScoreAtDischarge != null) {
      data.improvementPercentage =
        data.overallScoreAtDischarge > 0
          ? Math.round(
              ((data.overallScore - data.overallScoreAtDischarge) / data.overallScoreAtDischarge) *
                100
            )
          : 0;
    }

    // Determine overall trend
    if (data.improvementPercentage != null) {
      if (data.improvementPercentage >= 20) data.overallTrend = 'SIGNIFICANT_IMPROVEMENT';
      else if (data.improvementPercentage >= 5) data.overallTrend = 'MODERATE_IMPROVEMENT';
      else if (data.improvementPercentage >= -5) data.overallTrend = 'STABLE';
      else if (data.improvementPercentage >= -20) data.overallTrend = 'SLIGHT_DECLINE';
      else data.overallTrend = 'SIGNIFICANT_DECLINE';
    }

    // Set risk level
    if (data.overallTrend === 'SIGNIFICANT_DECLINE') {
      data.riskLevel = 'CRITICAL';
      data.needsIntervention = true;
    } else if (data.overallTrend === 'SLIGHT_DECLINE') {
      data.riskLevel = 'HIGH';
      data.needsIntervention = true;
    }

    const measurement = new ImpactMeasurement(data);
    await measurement.save();

    // Mark milestone as completed on the case
    await PostRehabCase.findOneAndUpdate(
      {
        _id: data.postRehabCase,
        'impactMilestones.milestone': data.milestone,
      },
      {
        $set: {
          'impactMilestones.$.isCompleted': true,
          'impactMilestones.$.completedDate': new Date(),
          'impactMilestones.$.measurementId': measurement._id,
        },
      }
    );

    // Trigger re-enrollment if needed
    if (data.needsIntervention) {
      await this._autoTriggerReEnrollment(null, measurement);
    }

    return {
      success: true,
      message: 'تم إنشاء قياس الأثر بنجاح',
      data: measurement,
    };
  }

  /**
   * Get impact measurement by ID
   */
  async getImpactMeasurementById(id) {
    const measurement = await ImpactMeasurement.findById(id)
      .populate('beneficiary', 'name nameAr nationalId')
      .populate('assessedBy', 'name nameAr')
      .populate('postRehabCase', 'caseNumber dischargeDate');
    if (!measurement) throw new Error('قياس الأثر غير موجود');
    return { success: true, data: measurement };
  }

  /**
   * List impact measurements
   */
  async listImpactMeasurements(query = {}) {
    const { postRehabCase, beneficiary, milestone, riskLevel, page = 1, limit = 20 } = query;
    const filter = {};
    if (postRehabCase) filter.postRehabCase = postRehabCase;
    if (beneficiary) filter.beneficiary = beneficiary;
    if (milestone) filter.milestone = milestone;
    if (riskLevel) filter.riskLevel = riskLevel;

    const skip = (page - 1) * limit;
    const [measurements, total] = await Promise.all([
      ImpactMeasurement.find(filter)
        .populate('beneficiary', 'name nameAr')
        .populate('assessedBy', 'name nameAr')
        .sort({ measurementDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ImpactMeasurement.countDocuments(filter),
    ]);

    return {
      success: true,
      data: measurements,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get impact comparison report (discharge vs current)
   */
  async getImpactComparisonReport(caseId) {
    const postRehabCase = await PostRehabCase.findById(caseId);
    if (!postRehabCase) throw new Error('حالة المتابعة غير موجودة');

    const measurements = await ImpactMeasurement.find({ postRehabCase: caseId }).sort({
      measurementDate: 1,
    });

    const dischargeScores = postRehabCase.dischargeScores || [];
    const report = {
      caseNumber: postRehabCase.caseNumber,
      dischargeDate: postRehabCase.dischargeDate,
      dischargeScores,
      measurements: measurements.map(m => ({
        milestone: m.milestone,
        date: m.measurementDate,
        monthsSinceDischarge: m.monthsSinceDischarge,
        overallScore: m.overallScore,
        improvementPercentage: m.improvementPercentage,
        overallTrend: m.overallTrend,
        riskLevel: m.riskLevel,
        domainScores: m.domainScores,
        qualityOfLife: m.qualityOfLife,
      })),
      timeline: this._buildImpactTimeline(dischargeScores, measurements),
    };

    return { success: true, data: report };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SURVEYS — الاستبيانات
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Create and send a survey
   */
  async createSurvey(data) {
    const survey = new PostRehabSurvey(data);
    await survey.save();
    return {
      success: true,
      message: 'تم إنشاء الاستبيان بنجاح',
      data: survey,
    };
  }

  /**
   * Submit survey responses
   */
  async submitSurveyResponses(surveyId, responseData) {
    const survey = await PostRehabSurvey.findById(surveyId);
    if (!survey) throw new Error('الاستبيان غير موجود');

    survey.responses = responseData.responses;
    survey.status = 'COMPLETED';
    survey.completedDate = new Date();
    survey.respondentName = responseData.respondentName || survey.respondentName;
    survey.respondentRelation = responseData.respondentRelation || survey.respondentRelation;

    // Calculate scores
    let totalScore = 0;
    let maxScore = 0;
    for (const resp of survey.responses) {
      if (resp.score != null) {
        totalScore += resp.score;
        maxScore += resp.questionType === 'SCALE_1_10' ? 10 : 5;
      }
    }
    survey.totalScore = totalScore;
    survey.maxScore = maxScore;
    survey.scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Determine satisfaction level
    const pct = survey.scorePercentage;
    if (pct >= 85) survey.satisfactionLevel = 'VERY_SATISFIED';
    else if (pct >= 70) survey.satisfactionLevel = 'SATISFIED';
    else if (pct >= 50) survey.satisfactionLevel = 'NEUTRAL';
    else if (pct >= 30) survey.satisfactionLevel = 'DISSATISFIED';
    else survey.satisfactionLevel = 'VERY_DISSATISFIED';

    await survey.save();

    // Trigger alert if low satisfaction
    if (pct < 40) {
      await this.addAlert(survey.postRehabCase, {
        type: 'LOW_SATISFACTION',
        severity: 'HIGH',
        message: `Low satisfaction score: ${pct}%`,
        messageAr: `درجة رضا منخفضة: ${pct}%`,
      });
    }

    return {
      success: true,
      message: 'تم تسجيل إجابات الاستبيان بنجاح',
      data: survey,
    };
  }

  /**
   * Get survey by ID
   */
  async getSurveyById(surveyId) {
    const survey = await PostRehabSurvey.findById(surveyId)
      .populate('beneficiary', 'name nameAr')
      .populate('postRehabCase', 'caseNumber')
      .populate('administeredBy', 'name nameAr');
    if (!survey) throw new Error('الاستبيان غير موجود');
    return { success: true, data: survey };
  }

  /**
   * List surveys
   */
  async listSurveys(query = {}) {
    const {
      postRehabCase,
      beneficiary,
      surveyType,
      status,
      milestone,
      page = 1,
      limit = 20,
    } = query;
    const filter = {};
    if (postRehabCase) filter.postRehabCase = postRehabCase;
    if (beneficiary) filter.beneficiary = beneficiary;
    if (surveyType) filter.surveyType = surveyType;
    if (status) filter.status = status;
    if (milestone) filter.milestone = milestone;

    const skip = (page - 1) * limit;
    const [surveys, total] = await Promise.all([
      PostRehabSurvey.find(filter)
        .populate('beneficiary', 'name nameAr')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PostRehabSurvey.countDocuments(filter),
    ]);

    return {
      success: true,
      data: surveys,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get default survey templates
   */
  getSurveyTemplates() {
    return {
      success: true,
      data: [
        {
          type: 'SATISFACTION',
          title: 'Post-Rehabilitation Satisfaction Survey',
          titleAr: 'استبيان الرضا ما بعد التأهيل',
          questions: [
            {
              questionId: 'SAT_01',
              question: 'How satisfied are you with the rehabilitation services received?',
              questionAr: 'ما مدى رضاك عن خدمات التأهيل التي حصلت عليها؟',
              questionType: 'LIKERT',
            },
            {
              questionId: 'SAT_02',
              question: 'Did the program meet your expectations?',
              questionAr: 'هل حقق البرنامج توقعاتك؟',
              questionType: 'LIKERT',
            },
            {
              questionId: 'SAT_03',
              question: 'How would you rate the quality of follow-up support?',
              questionAr: 'كيف تقيم جودة دعم المتابعة؟',
              questionType: 'SCALE_1_10',
            },
            {
              questionId: 'SAT_04',
              question: 'Would you recommend our services to others?',
              questionAr: 'هل توصي بخدماتنا للآخرين؟',
              questionType: 'YES_NO',
            },
            {
              questionId: 'SAT_05',
              question: 'What could we improve?',
              questionAr: 'ما الذي يمكننا تحسينه؟',
              questionType: 'TEXT',
            },
          ],
        },
        {
          type: 'OUTCOME',
          title: 'Post-Rehabilitation Outcome Survey',
          titleAr: 'استبيان نتائج ما بعد التأهيل',
          questions: [
            {
              questionId: 'OUT_01',
              question: 'How has your daily functioning improved since discharge?',
              questionAr: 'كيف تحسنت وظائفك اليومية منذ الخروج؟',
              questionType: 'LIKERT',
            },
            {
              questionId: 'OUT_02',
              question: 'Are you able to perform daily activities independently?',
              questionAr: 'هل تستطيع القيام بالأنشطة اليومية بشكل مستقل؟',
              questionType: 'LIKERT',
            },
            {
              questionId: 'OUT_03',
              question: 'How is your social participation?',
              questionAr: 'كيف هي مشاركتك الاجتماعية؟',
              questionType: 'LIKERT',
            },
            {
              questionId: 'OUT_04',
              question: 'Rate your overall quality of life',
              questionAr: 'قيّم جودة حياتك بشكل عام',
              questionType: 'SCALE_1_10',
            },
            {
              questionId: 'OUT_05',
              question: 'What challenges are you currently facing?',
              questionAr: 'ما التحديات التي تواجهها حالياً؟',
              questionType: 'TEXT',
            },
          ],
        },
        {
          type: 'FAMILY_FEEDBACK',
          title: 'Family Feedback Survey',
          titleAr: 'استبيان ملاحظات الأسرة',
          questions: [
            {
              questionId: 'FAM_01',
              question: 'How well has the beneficiary adapted after the program?',
              questionAr: 'كيف تكيف المستفيد بعد البرنامج؟',
              questionType: 'LIKERT',
            },
            {
              questionId: 'FAM_02',
              question: 'Have you noticed sustained improvements?',
              questionAr: 'هل لاحظت تحسنات مستمرة؟',
              questionType: 'YES_NO',
            },
            {
              questionId: 'FAM_03',
              question: 'How confident are you in managing ongoing needs?',
              questionAr: 'ما مدى ثقتك في إدارة الاحتياجات المستمرة؟',
              questionType: 'SCALE_1_10',
            },
            {
              questionId: 'FAM_04',
              question: 'Do you feel additional services are needed?',
              questionAr: 'هل تشعر بالحاجة إلى خدمات إضافية؟',
              questionType: 'YES_NO',
            },
            {
              questionId: 'FAM_05',
              question: 'Additional comments or concerns',
              questionAr: 'ملاحظات أو مخاوف إضافية',
              questionType: 'TEXT',
            },
          ],
        },
      ],
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RE-ENROLLMENT — إعادة التسجيل
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Create re-enrollment request
   */
  async createReEnrollmentRequest(data) {
    const request = new ReEnrollmentRequest(data);
    await request.save();

    // Update case status
    if (data.postRehabCase) {
      await this.addAlert(data.postRehabCase, {
        type: 'RE_ENROLLMENT_RECOMMENDED',
        severity: data.urgencyLevel === 'URGENT' ? 'CRITICAL' : 'HIGH',
        message: `Re-enrollment request created: ${request.requestNumber}`,
        messageAr: `تم إنشاء طلب إعادة تسجيل: ${request.requestNumber}`,
      });
    }

    return {
      success: true,
      message: 'تم إنشاء طلب إعادة التسجيل بنجاح',
      data: request,
    };
  }

  /**
   * Review re-enrollment request (approve/reject)
   */
  async reviewReEnrollmentRequest(requestId, reviewData) {
    const request = await ReEnrollmentRequest.findById(requestId);
    if (!request) throw new Error('طلب إعادة التسجيل غير موجود');

    request.status = reviewData.approved ? 'APPROVED' : 'REJECTED';
    request.reviewedBy = reviewData.reviewedBy;
    request.reviewDate = new Date();
    request.reviewNotes = reviewData.notes;
    request.reviewNotesAr = reviewData.notesAr;

    if (reviewData.approved) {
      request.approvedBy = reviewData.reviewedBy;
      request.approvalDate = new Date();
      request.recommendedProgram = reviewData.recommendedProgram || request.recommendedProgram;
    } else {
      request.rejectionReason = reviewData.rejectionReason;
    }

    await request.save();

    // Update case status if approved
    if (reviewData.approved && request.postRehabCase) {
      await PostRehabCase.findByIdAndUpdate(request.postRehabCase, {
        status: 'RE_ENROLLED',
      });
    }

    return {
      success: true,
      message: reviewData.approved
        ? 'تمت الموافقة على طلب إعادة التسجيل'
        : 'تم رفض طلب إعادة التسجيل',
      data: request,
    };
  }

  /**
   * Get re-enrollment request by ID
   */
  async getReEnrollmentRequestById(requestId) {
    const request = await ReEnrollmentRequest.findById(requestId)
      .populate('beneficiary', 'name nameAr nationalId')
      .populate('postRehabCase', 'caseNumber')
      .populate('recommendedProgram', 'name nameAr')
      .populate('requestedBy', 'name nameAr')
      .populate('reviewedBy', 'name nameAr');
    if (!request) throw new Error('طلب إعادة التسجيل غير موجود');
    return { success: true, data: request };
  }

  /**
   * List re-enrollment requests
   */
  async listReEnrollmentRequests(query = {}) {
    const {
      postRehabCase,
      beneficiary,
      status,
      requestType,
      urgencyLevel,
      page = 1,
      limit = 20,
    } = query;
    const filter = {};
    if (postRehabCase) filter.postRehabCase = postRehabCase;
    if (beneficiary) filter.beneficiary = beneficiary;
    if (status) filter.status = status;
    if (requestType) filter.requestType = requestType;
    if (urgencyLevel) filter.urgencyLevel = urgencyLevel;

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      ReEnrollmentRequest.find(filter)
        .populate('beneficiary', 'name nameAr')
        .populate('postRehabCase', 'caseNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ReEnrollmentRequest.countDocuments(filter),
    ]);

    return {
      success: true,
      data: requests,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD & STATISTICS — لوحة المعلومات والإحصائيات
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(branchId = null) {
    const branchFilter = branchId ? { branch: branchId } : {};

    const [
      totalCases,
      activeCases,
      completedCases,
      reEnrolledCases,
      lostCases,
      totalVisits,
      completedVisits,
      missedVisits,
      upcomingVisits,
      pendingSurveys,
      completedSurveys,
      pendingReEnrollments,
      criticalAlerts,
      impactMeasurements,
    ] = await Promise.all([
      PostRehabCase.countDocuments(branchFilter),
      PostRehabCase.countDocuments({ ...branchFilter, status: 'ACTIVE' }),
      PostRehabCase.countDocuments({ ...branchFilter, status: 'COMPLETED' }),
      PostRehabCase.countDocuments({ ...branchFilter, status: 'RE_ENROLLED' }),
      PostRehabCase.countDocuments({ ...branchFilter, status: 'LOST_TO_FOLLOW_UP' }),
      FollowUpVisit.countDocuments(),
      FollowUpVisit.countDocuments({ status: 'COMPLETED' }),
      FollowUpVisit.countDocuments({ status: 'MISSED' }),
      FollowUpVisit.countDocuments({
        status: 'SCHEDULED',
        scheduledDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }),
      PostRehabSurvey.countDocuments({ status: { $in: ['PENDING', 'SENT'] } }),
      PostRehabSurvey.countDocuments({ status: 'COMPLETED' }),
      ReEnrollmentRequest.countDocuments({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } }),
      PostRehabCase.countDocuments({
        ...branchFilter,
        'alerts.isResolved': false,
        'alerts.severity': 'CRITICAL',
      }),
      ImpactMeasurement.countDocuments(),
    ]);

    // Average satisfaction score
    const satisfactionAgg = await PostRehabSurvey.aggregate([
      { $match: { status: 'COMPLETED', scorePercentage: { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: '$scorePercentage' } } },
    ]);

    // Impact trend distribution
    const trendDistribution = await ImpactMeasurement.aggregate([
      { $group: { _id: '$overallTrend', count: { $sum: 1 } } },
    ]);

    // Category distribution
    const categoryDistribution = await PostRehabCase.aggregate([
      { $match: branchFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    return {
      success: true,
      data: {
        cases: {
          total: totalCases,
          active: activeCases,
          completed: completedCases,
          reEnrolled: reEnrolledCases,
          lostToFollowUp: lostCases,
        },
        visits: {
          total: totalVisits,
          completed: completedVisits,
          missed: missedVisits,
          upcoming: upcomingVisits,
          completionRate: totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0,
        },
        surveys: {
          pending: pendingSurveys,
          completed: completedSurveys,
          averageSatisfaction: satisfactionAgg[0]?.avgScore
            ? Math.round(satisfactionAgg[0].avgScore)
            : null,
        },
        reEnrollment: {
          pending: pendingReEnrollments,
        },
        alerts: {
          critical: criticalAlerts,
        },
        impact: {
          totalMeasurements: impactMeasurements,
          trendDistribution: trendDistribution.reduce((acc, t) => {
            acc[t._id] = t.count;
            return acc;
          }, {}),
        },
        categoryDistribution: categoryDistribution.reduce((acc, c) => {
          acc[c._id] = c.count;
          return acc;
        }, {}),
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate next visit date based on frequency
   */
  _calculateNextVisitDate(fromDate, frequency) {
    const date = new Date(fromDate);
    switch (frequency) {
      case 'WEEKLY':
        date.setDate(date.getDate() + 7);
        break;
      case 'BIWEEKLY':
        date.setDate(date.getDate() + 14);
        break;
      case 'MONTHLY':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'QUARTERLY':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'SEMI_ANNUAL':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'ANNUAL':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date;
  }

  /**
   * Check for regression and create alerts
   */
  async _checkForRegression(visit) {
    if (!visit.domainScores || visit.domainScores.length === 0) return;

    const decliningDomains = visit.domainScores.filter(
      ds =>
        ds.trend === 'DECLINING' ||
        (ds.currentScore != null &&
          ds.scoreAtDischarge != null &&
          ds.currentScore < ds.scoreAtDischarge * 0.8)
    );

    if (decliningDomains.length > 0) {
      const severity = decliningDomains.length >= 3 ? 'CRITICAL' : 'HIGH';
      await this.addAlert(visit.postRehabCase, {
        type: 'REGRESSION',
        severity,
        message: `Regression detected in ${decliningDomains.length} domain(s): ${decliningDomains.map(d => d.domain).join(', ')}`,
        messageAr: `تم رصد تراجع في ${decliningDomains.length} مجال(ات): ${decliningDomains.map(d => d.domainAr || d.domain).join('، ')}`,
      });
    }
  }

  /**
   * Auto-trigger re-enrollment when regression/decline detected
   */
  async _autoTriggerReEnrollment(visit = null, measurement = null) {
    const source = visit || measurement;
    if (!source) return;

    let triggerType = 'SPECIALIST_OBSERVATION';
    let triggerDetails = '';

    if (measurement) {
      triggerType =
        measurement.overallTrend === 'SIGNIFICANT_DECLINE'
          ? 'REGRESSION_DETECTED'
          : 'LOW_IMPACT_SCORE';
      triggerDetails = `Impact measurement shows ${measurement.overallTrend} at ${measurement.milestone} milestone. Overall score: ${measurement.overallScore}`;
    } else if (visit) {
      triggerType = 'SPECIALIST_OBSERVATION';
      triggerDetails =
        visit.reEnrollmentReason || 'Specialist recommended re-enrollment during follow-up visit';
    }

    const existingPending = await ReEnrollmentRequest.findOne({
      postRehabCase: source.postRehabCase,
      status: { $in: ['PENDING', 'UNDER_REVIEW'] },
    });

    if (existingPending) return; // Don't create duplicate

    await this.createReEnrollmentRequest({
      postRehabCase: source.postRehabCase,
      beneficiary: source.beneficiary,
      requestType: 'AUTOMATIC',
      triggerType,
      triggerDetails,
      triggerDetailsAr: triggerDetails,
      urgencyLevel: measurement?.riskLevel === 'CRITICAL' ? 'URGENT' : 'HIGH',
      supportingEvidence: {
        impactMeasurement: measurement?._id,
        followUpVisit: visit?._id,
        riskLevel: measurement?.riskLevel || 'HIGH',
      },
      createdBy: source.assessedBy || source.conductedBy,
    });
  }

  /**
   * Build impact timeline for visualization
   */
  _buildImpactTimeline(dischargeScores, measurements) {
    const timeline = [
      {
        label: 'Discharge',
        labelAr: 'الخروج',
        date: null,
        scores: dischargeScores,
      },
    ];

    for (const m of measurements) {
      timeline.push({
        label: m.milestone,
        labelAr: m.milestoneAr,
        date: m.measurementDate,
        overallScore: m.overallScore,
        trend: m.overallTrend,
        scores: m.domainScores,
      });
    }

    return timeline;
  }
}

module.exports = new PostRehabFollowUpService();
