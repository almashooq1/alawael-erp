/**
 * خدمة استبيانات رضا الأسر
 * Family Satisfaction Survey Service
 */

const {
  SurveyTemplate,
  SurveyResponse,
  SurveyAnalytics,
} = require('../models/familySatisfaction.models');

class FamilySatisfactionService {
  // ============================================================
  // قوالب الاستبيانات
  // ============================================================

  /**
   * إنشاء قالب استبيان
   */
  static async createTemplate(data, userId) {
    const template = new SurveyTemplate({ ...data, createdBy: userId });
    return template.save();
  }

  /**
   * جلب القوالب
   */
  static async getTemplates(filters = {}) {
    const query = { isDeleted: false };
    if (filters.category) query.category = filters.category;
    if (filters.isActive !== undefined) query.isActive = filters.isActive === 'true';
    return SurveyTemplate.find(query).sort({ createdAt: -1 }).lean();
  }

  /**
   * جلب قالب واحد
   */
  static async getTemplateById(id) {
    return SurveyTemplate.findOne({ _id: id, isDeleted: false });
  }

  /**
   * تحديث قالب
   */
  static async updateTemplate(id, data) {
    const template = await SurveyTemplate.findOne({ _id: id, isDeleted: false });
    if (!template) throw new Error('القالب غير موجود');
    Object.assign(template, data);
    template.version += 1;
    return template.save();
  }

  /**
   * تهيئة القوالب الافتراضية
   */
  static async seedDefaultTemplates(userId) {
    const defaults = this._getDefaultTemplates();
    const ops = defaults.map(t => ({
      updateOne: {
        filter: { code: t.code },
        update: { $setOnInsert: { ...t, createdBy: userId } },
        upsert: true,
      },
    }));
    return SurveyTemplate.bulkWrite(ops);
  }

  // ============================================================
  // استجابات الاستبيان
  // ============================================================

  /**
   * إرسال استبيان لمستفيد / أسرة
   */
  static async sendSurvey(templateId, recipientData) {
    const template = await SurveyTemplate.findById(templateId);
    if (!template) throw new Error('القالب غير موجود');

    const response = new SurveyResponse({
      template: templateId,
      templateCode: template.code,
      respondent: recipientData.respondent,
      beneficiary: recipientData.beneficiary,
      relatedService: recipientData.relatedService,
      branch: recipientData.branch,
      status: 'sent',
      sentAt: new Date(),
      answers: [],
    });

    return response.save();
  }

  /**
   * تقديم إجابات الاستبيان
   */
  static async submitResponse(responseId, answers) {
    const response = await SurveyResponse.findById(responseId).populate('template');
    if (!response) throw new Error('الاستبيان غير موجود');
    if (response.status === 'completed') throw new Error('تم الإجابة على هذا الاستبيان مسبقاً');

    response.answers = answers.map(a => ({
      ...a,
      answeredAt: new Date(),
    }));
    response.status = 'completed';
    response.completedAt = new Date();

    if (response.openedAt) {
      response.completionTime = Math.round((response.completedAt - response.openedAt) / 1000);
    }

    // حساب الدرجات
    response.scores = this._calculateScores(response.answers, response.template);

    // تحليل المشاعر البسيط
    response.sentiment = this._analyzeSentiment(response.answers);

    // تحديد إذا تحتاج متابعة
    if (response.scores.overallSatisfaction < 40 || response.scores.npsCategory === 'detractor') {
      response.followUp = {
        required: true,
        reason:
          response.scores.overallSatisfaction < 40
            ? 'درجة رضا منخفضة'
            : 'مستفيد غير راضٍ (NPS Detractor)',
        status: 'pending',
      };
    }

    return response.save();
  }

  /**
   * إنشاء استجابة سريعة (بدون إرسال مسبق)
   */
  static async createDirectResponse(templateCode, data) {
    const template = await SurveyTemplate.findOne({ code: templateCode, isActive: true });
    if (!template) throw new Error('القالب غير موجود');

    const response = new SurveyResponse({
      template: template._id,
      templateCode,
      respondent: data.respondent,
      beneficiary: data.beneficiary,
      relatedService: data.relatedService,
      branch: data.branch,
      answers: (data.answers || []).map(a => ({ ...a, answeredAt: new Date() })),
      status: 'completed',
      completedAt: new Date(),
    });

    response.scores = this._calculateScores(response.answers, template);
    response.sentiment = this._analyzeSentiment(response.answers);

    if (response.scores.overallSatisfaction < 40 || response.scores.npsCategory === 'detractor') {
      response.followUp = {
        required: true,
        reason: 'درجة رضا منخفضة',
        status: 'pending',
      };
    }

    return response.save();
  }

  /**
   * جلب الاستجابات
   */
  static async getResponses(filters = {}) {
    const query = { isDeleted: false };
    if (filters.template) query.template = filters.template;
    if (filters.templateCode) query.templateCode = filters.templateCode;
    if (filters.beneficiary) query.beneficiary = filters.beneficiary;
    if (filters.status) query.status = filters.status;
    if (filters.branch) query.branch = filters.branch;
    if (filters.followUpRequired) query['followUp.required'] = true;
    if (filters.startDate && filters.endDate) {
      query.completedAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [responses, total] = await Promise.all([
      SurveyResponse.find(query)
        .sort({ completedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('template', 'title category')
        .populate('beneficiary', 'name')
        .select('-answers'),
      SurveyResponse.countDocuments(query),
    ]);

    return { responses, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * جلب استجابة واحدة بالتفاصيل
   */
  static async getResponseById(id) {
    return SurveyResponse.findOne({ _id: id, isDeleted: false })
      .populate('template')
      .populate('beneficiary', 'name nationalId')
      .populate('followUp.assignedTo', 'name');
  }

  /**
   * تحديث حالة المتابعة
   */
  static async updateFollowUp(responseId, followUpData, userId) {
    const response = await SurveyResponse.findById(responseId);
    if (!response) throw new Error('الاستجابة غير موجودة');

    Object.assign(response.followUp, followUpData);
    if (followUpData.status === 'resolved') {
      response.followUp.resolvedAt = new Date();
    }
    if (!response.followUp.assignedTo && userId) {
      response.followUp.assignedTo = userId;
    }

    return response.save();
  }

  // ============================================================
  // التحليلات والتقارير
  // ============================================================

  /**
   * حساب NPS
   */
  static async calculateNPS(filters = {}) {
    const query = {
      isDeleted: false,
      status: 'completed',
      'scores.npsScore': { $exists: true },
    };
    if (filters.branch) query.branch = filters.branch;
    if (filters.startDate && filters.endDate) {
      query.completedAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const responses = await SurveyResponse.find(query)
      .select('scores.npsScore scores.npsCategory')
      .lean();

    if (responses.length === 0)
      return { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };

    let promoters = 0,
      passives = 0,
      detractors = 0;
    responses.forEach(r => {
      if (r.scores.npsCategory === 'promoter') promoters++;
      else if (r.scores.npsCategory === 'passive') passives++;
      else detractors++;
    });

    const total = responses.length;
    const nps = Math.round(((promoters - detractors) / total) * 100);

    return { score: nps, promoters, passives, detractors, total };
  }

  /**
   * توليد تقرير تحليلات
   */
  static async generateAnalyticsReport(startDate, endDate, branch, userId) {
    const query = {
      isDeleted: false,
      status: 'completed',
      completedAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };
    if (branch) query.branch = branch;

    const responses = await SurveyResponse.find(query).populate('template', 'category').lean();

    const totalSent = await SurveyResponse.countDocuments({
      isDeleted: false,
      sentAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      ...(branch ? { branch } : {}),
    });

    // NPS
    const npsData = await this.calculateNPS({ branch, startDate, endDate });

    // CSAT
    const csatScores = responses
      .filter(r => r.scores && r.scores.csatScore != null)
      .map(r => r.scores.csatScore);
    const csatAvg =
      csatScores.length > 0
        ? Math.round(csatScores.reduce((s, v) => s + v, 0) / csatScores.length)
        : 0;

    // Overall Satisfaction
    const satScores = responses
      .filter(r => r.scores && r.scores.overallSatisfaction != null)
      .map(r => r.scores.overallSatisfaction);
    const satAvg =
      satScores.length > 0
        ? Math.round(satScores.reduce((s, v) => s + v, 0) / satScores.length)
        : 0;

    const distribution = {
      veryDissatisfied: 0,
      dissatisfied: 0,
      neutral: 0,
      satisfied: 0,
      verySatisfied: 0,
    };
    satScores.forEach(s => {
      if (s <= 20) distribution.veryDissatisfied++;
      else if (s <= 40) distribution.dissatisfied++;
      else if (s <= 60) distribution.neutral++;
      else if (s <= 80) distribution.satisfied++;
      else distribution.verySatisfied++;
    });

    // بحسب فئة الخدمة
    const serviceMap = {};
    responses.forEach(r => {
      const cat = r.relatedService?.type || r.template?.category || 'general';
      if (!serviceMap[cat]) serviceMap[cat] = { scores: [], npsScores: [] };
      if (r.scores?.overallSatisfaction != null)
        serviceMap[cat].scores.push(r.scores.overallSatisfaction);
      if (r.scores?.npsScore != null) serviceMap[cat].npsScores.push(r.scores.npsScore);
    });

    const byServiceCategory = Object.entries(serviceMap).map(([cat, data]) => ({
      category: cat,
      categoryName: { ar: cat, en: cat },
      averageScore:
        data.scores.length > 0
          ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
          : 0,
      responseCount: data.scores.length,
      nps: this._computeNPSFromScores(data.npsScores),
    }));

    // حساب الفترة الزمنية
    const diffDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    let reportType = 'custom';
    if (diffDays <= 35) reportType = 'monthly';
    else if (diffDays <= 100) reportType = 'quarterly';
    else if (diffDays >= 350) reportType = 'annual';

    const analytics = new SurveyAnalytics({
      reportPeriod: { startDate, endDate },
      branch,
      reportType,
      nps: {
        score: npsData.score,
        promoters: npsData.promoters,
        passives: npsData.passives,
        detractors: npsData.detractors,
        totalResponses: npsData.total,
        trend: 'stable',
      },
      csat: { score: csatAvg, totalResponses: csatScores.length, trend: 'stable' },
      overallSatisfaction: { average: satAvg, distribution },
      byServiceCategory,
      responseRate: {
        sent: totalSent,
        completed: responses.length,
        rate: totalSent > 0 ? Math.round((responses.length / totalSent) * 100) : 0,
      },
      generatedBy: userId,
    });

    return analytics.save();
  }

  /**
   * لوحة المعلومات
   */
  static async getDashboard(branch) {
    const query = { isDeleted: false };
    if (branch) query.branch = branch;

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalResponses,
      completedThisMonth,
      pendingFollowUps,
      npsData,
      recentResponses,
      latestAnalytics,
    ] = await Promise.all([
      SurveyResponse.countDocuments({ ...query, status: 'completed' }),
      SurveyResponse.countDocuments({
        ...query,
        status: 'completed',
        completedAt: { $gte: thirtyDaysAgo },
      }),
      SurveyResponse.countDocuments({
        ...query,
        'followUp.required': true,
        'followUp.status': 'pending',
      }),
      this.calculateNPS({
        branch,
        startDate: thirtyDaysAgo.toISOString(),
        endDate: now.toISOString(),
      }),
      SurveyResponse.find({ ...query, status: 'completed' })
        .sort({ completedAt: -1 })
        .limit(5)
        .populate('beneficiary', 'name')
        .populate('template', 'title')
        .select('respondent.type scores.overallSatisfaction scores.npsCategory completedAt')
        .lean(),
      SurveyAnalytics.findOne(branch ? { branch } : {})
        .sort({ 'reportPeriod.endDate': -1 })
        .lean(),
    ]);

    // متوسط الرضا (آخر 30 يوم)
    const recentScores = await SurveyResponse.find({
      ...query,
      status: 'completed',
      completedAt: { $gte: thirtyDaysAgo },
      'scores.overallSatisfaction': { $exists: true },
    })
      .select('scores.overallSatisfaction')
      .lean();

    const avgSatisfaction =
      recentScores.length > 0
        ? Math.round(
            recentScores.reduce((s, r) => s + r.scores.overallSatisfaction, 0) / recentScores.length
          )
        : 0;

    return {
      summary: {
        totalResponses,
        completedThisMonth,
        pendingFollowUps,
        avgSatisfaction,
        nps: npsData.score,
      },
      recentResponses,
      latestAnalytics,
    };
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  static _calculateScores(answers, template) {
    const questions = template.questions || [];
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let npsScore = null;
    const categoryScores = {};

    answers.forEach(a => {
      const q = questions.find(qq => qq.questionId === a.questionId);
      if (!q) return;

      let normalizedScore = 0;
      if (q.type === 'rating_5') {
        normalizedScore = ((a.value || 0) / 5) * 100;
      } else if (q.type === 'rating_10' || q.type === 'nps') {
        normalizedScore = ((a.value || 0) / 10) * 100;
        if (q.type === 'nps') npsScore = a.value;
      } else if (q.type === 'yes_no') {
        normalizedScore = a.value === true || a.value === 'yes' ? 100 : 0;
      } else if (q.type === 'scale') {
        normalizedScore = ((a.value || 0) / 10) * 100;
      }

      const weight = q.weight || 1;
      totalWeightedScore += normalizedScore * weight;
      totalWeight += weight;

      // تجميع حسب الفئة
      const cat = q.category || 'general';
      if (!categoryScores[cat]) categoryScores[cat] = { sum: 0, weight: 0 };
      categoryScores[cat].sum += normalizedScore * weight;
      categoryScores[cat].weight += weight;
    });

    const overallSatisfaction = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    const csatScore = overallSatisfaction;

    let npsCategory = null;
    if (npsScore !== null) {
      if (npsScore >= 9) npsCategory = 'promoter';
      else if (npsScore >= 7) npsCategory = 'passive';
      else npsCategory = 'detractor';
    }

    const byCategory = Object.entries(categoryScores).map(([cat, d]) => ({
      category: cat,
      score: Math.round(d.sum / d.weight),
      maxScore: 100,
      percentage: Math.round(d.sum / d.weight),
    }));

    return { overallSatisfaction, npsScore, npsCategory, csatScore, byCategory };
  }

  static _analyzeSentiment(answers) {
    // تحليل مشاعر بسيط للنصوص العربية
    const positiveWords = [
      'ممتاز',
      'رائع',
      'جيد',
      'شكراً',
      'راضي',
      'سعيد',
      'مبدع',
      'متميز',
      'أحسنت',
      'مشكور',
    ];
    const negativeWords = [
      'سيء',
      'ضعيف',
      'غير راضي',
      'مشكلة',
      'تأخير',
      'إهمال',
      'سوء',
      'خطأ',
      'شكوى',
      'محبط',
    ];

    let positiveCount = 0;
    let negativeCount = 0;
    const keywords = [];

    answers.forEach(a => {
      const text = String(a.comment || a.value || '');
      positiveWords.forEach(w => {
        if (text.includes(w)) {
          positiveCount++;
          keywords.push(w);
        }
      });
      negativeWords.forEach(w => {
        if (text.includes(w)) {
          negativeCount++;
          keywords.push(w);
        }
      });
    });

    let overall = 'neutral';
    if (positiveCount > negativeCount) overall = 'positive';
    else if (negativeCount > positiveCount) overall = 'negative';

    return { overall, keywords: [...new Set(keywords)] };
  }

  static _computeNPSFromScores(scores) {
    if (scores.length === 0) return 0;
    let p = 0,
      d = 0;
    scores.forEach(s => {
      if (s >= 9) p++;
      else if (s <= 6) d++;
    });
    return Math.round(((p - d) / scores.length) * 100);
  }

  /**
   * القوالب الافتراضية
   */
  static _getDefaultTemplates() {
    return [
      {
        code: 'FAMILY-SAT-GENERAL',
        title: { ar: 'استبيان رضا الأسر العام', en: 'General Family Satisfaction Survey' },
        description: { ar: 'استبيان شامل لقياس رضا الأسر عن الخدمات المقدمة', en: '' },
        category: 'family_satisfaction',
        questions: [
          {
            questionId: 'q1',
            text: {
              ar: 'ما مدى رضاك العام عن خدمات المركز؟',
              en: 'Overall satisfaction with center services?',
            },
            type: 'rating_5',
            required: true,
            category: 'overall',
            weight: 2,
            order: 1,
          },
          {
            questionId: 'q2',
            text: {
              ar: 'كيف تقيّم جودة الخدمات التأهيلية المقدمة؟',
              en: 'How do you rate rehabilitation service quality?',
            },
            type: 'rating_5',
            required: true,
            category: 'service_quality',
            weight: 2,
            order: 2,
          },
          {
            questionId: 'q3',
            text: {
              ar: 'ما مدى رضاك عن تعامل الكادر الفني والإداري؟',
              en: 'Satisfaction with staff interaction?',
            },
            type: 'rating_5',
            required: true,
            category: 'staff',
            weight: 1.5,
            order: 3,
          },
          {
            questionId: 'q4',
            text: { ar: 'هل تلاحظ تحسناً في حالة ابنكم/ابنتكم؟', en: 'Do you notice improvement?' },
            type: 'rating_5',
            required: true,
            category: 'outcomes',
            weight: 2,
            order: 4,
          },
          {
            questionId: 'q5',
            text: {
              ar: 'ما مدى رضاك عن مرافق المركز وبيئته؟',
              en: 'Satisfaction with facilities?',
            },
            type: 'rating_5',
            required: true,
            category: 'facilities',
            weight: 1,
            order: 5,
          },
          {
            questionId: 'q6',
            text: {
              ar: 'هل يتم التواصل معكم بشكل كافٍ حول تقدم حالة المستفيد؟',
              en: 'Is communication about progress sufficient?',
            },
            type: 'rating_5',
            required: true,
            category: 'communication',
            weight: 1.5,
            order: 6,
          },
          {
            questionId: 'q7',
            text: {
              ar: 'ما مدى احتمال أن ترشّح المركز لعائلات أخرى؟',
              en: 'How likely to recommend? (NPS)',
            },
            type: 'nps',
            required: true,
            category: 'nps',
            weight: 1,
            order: 7,
          },
          {
            questionId: 'q8',
            text: { ar: 'ما هي اقتراحاتكم لتحسين الخدمات؟', en: 'Suggestions for improvement?' },
            type: 'text',
            required: false,
            category: 'feedback',
            weight: 0,
            order: 8,
          },
        ],
        settings: { isAnonymous: false, requireAllQuestions: false, showProgressBar: true },
      },
      {
        code: 'POST-SESSION',
        title: { ar: 'استبيان ما بعد الجلسة', en: 'Post-Session Survey' },
        description: { ar: 'تقييم سريع بعد الجلسة العلاجية', en: '' },
        category: 'post_session',
        questions: [
          {
            questionId: 'ps1',
            text: { ar: 'كيف تقيّم الجلسة اليوم؟', en: "How do you rate today's session?" },
            type: 'rating_5',
            required: true,
            category: 'session',
            weight: 2,
            order: 1,
          },
          {
            questionId: 'ps2',
            text: {
              ar: 'هل كان المعالج متعاوناً ومهنياً؟',
              en: 'Was the therapist cooperative and professional?',
            },
            type: 'rating_5',
            required: true,
            category: 'therapist',
            weight: 1.5,
            order: 2,
          },
          {
            questionId: 'ps3',
            text: {
              ar: 'هل شعرت بأن الجلسة مفيدة لحالة المستفيد؟',
              en: 'Was the session helpful?',
            },
            type: 'yes_no',
            required: true,
            category: 'effectiveness',
            weight: 1,
            order: 3,
          },
          {
            questionId: 'ps4',
            text: { ar: 'ملاحظات إضافية', en: 'Additional comments' },
            type: 'text',
            required: false,
            category: 'feedback',
            weight: 0,
            order: 4,
          },
        ],
        settings: { isAnonymous: false, autoSendAfterSession: true, maxCompletionDays: 3 },
      },
      {
        code: 'NPS-QUICK',
        title: { ar: 'استبيان NPS السريع', en: 'Quick NPS Survey' },
        description: { ar: 'قياس سريع لمؤشر صافي الترويج', en: '' },
        category: 'nps',
        questions: [
          {
            questionId: 'nps1',
            text: {
              ar: 'على مقياس 0-10، ما مدى احتمال أن توصي بمركزنا لآخرين؟',
              en: 'On a 0-10 scale, how likely are you to recommend us?',
            },
            type: 'nps',
            required: true,
            category: 'nps',
            weight: 1,
            order: 1,
          },
          {
            questionId: 'nps2',
            text: { ar: 'ما السبب الرئيسي لتقييمك؟', en: 'Main reason for your rating?' },
            type: 'text',
            required: false,
            category: 'feedback',
            weight: 0,
            order: 2,
          },
        ],
        settings: { isAnonymous: true, maxCompletionDays: 7 },
      },
    ];
  }
}

module.exports = FamilySatisfactionService;
