/**
 * 📊 نظام رضا المستفيدين — Satisfaction & Feedback System
 * الإصدار 6.0.0
 * يشمل: استبيانات ما بعد الجلسة، تقييم الخدمات، تحليلات الرضا، مقترحات التحسين
 */

class SatisfactionFeedbackService {
  constructor() {
    this.surveys = new Map();
    this.responses = new Map();
    this.complaints = new Map();
    this.suggestions = new Map();
    this.templates = new Map();
    this._initDefaultTemplates();
  }

  _initDefaultTemplates() {
    const templates = [
      {
        id: 'tmpl-post-session',
        name: 'استبيان ما بعد الجلسة',
        type: 'post_session',
        questions: [
          { id: 'q1', text: 'ما مدى رضاك عن جودة الجلسة؟', type: 'rating', scale: 5 },
          { id: 'q2', text: 'هل شعرت بتحسن بعد الجلسة؟', type: 'rating', scale: 5 },
          { id: 'q3', text: 'كيف تقيّم تعامل المعالج؟', type: 'rating', scale: 5 },
          { id: 'q4', text: 'هل كانت مدة الجلسة مناسبة؟', type: 'yes_no' },
          { id: 'q5', text: 'ملاحظات إضافية', type: 'text' },
        ],
      },
      {
        id: 'tmpl-service-eval',
        name: 'تقييم الخدمة الشامل',
        type: 'service_evaluation',
        questions: [
          { id: 'q1', text: 'تقييم جودة الخدمة العلاجية', type: 'rating', scale: 10 },
          { id: 'q2', text: 'سهولة حجز المواعيد', type: 'rating', scale: 10 },
          { id: 'q3', text: 'جودة المرافق والمعدات', type: 'rating', scale: 10 },
          { id: 'q4', text: 'تعامل الموظفين', type: 'rating', scale: 10 },
          { id: 'q5', text: 'النظافة والبيئة', type: 'rating', scale: 10 },
          { id: 'q6', text: 'التواصل والمتابعة', type: 'rating', scale: 10 },
          { id: 'q7', text: 'هل توصي بالخدمة للآخرين؟', type: 'nps', scale: 10 },
          { id: 'q8', text: 'ما الذي يمكن تحسينه؟', type: 'text' },
        ],
      },
      {
        id: 'tmpl-family',
        name: 'استبيان رضا الأسرة',
        type: 'family_satisfaction',
        questions: [
          { id: 'q1', text: 'هل تلاحظ تحسناً في حالة ابنكم/ابنتكم؟', type: 'rating', scale: 5 },
          { id: 'q2', text: 'مدى إشراككم في الخطة العلاجية', type: 'rating', scale: 5 },
          { id: 'q3', text: 'وضوح المعلومات المقدمة لكم', type: 'rating', scale: 5 },
          { id: 'q4', text: 'استجابة الفريق لاستفساراتكم', type: 'rating', scale: 5 },
          { id: 'q5', text: 'اقتراحاتكم لتحسين الخدمة', type: 'text' },
        ],
      },
    ];
    templates.forEach(t => this.templates.set(t.id, t));
  }

  /* ─── إرسال استبيان ─── */
  async sendSurvey(beneficiaryId, templateId, context) {
    const template = this.templates.get(templateId);
    if (!template) return { success: false, error: 'القالب غير موجود' };

    const survey = {
      id: `srv-${Date.now()}`,
      beneficiaryId,
      templateId,
      templateName: template.name,
      questions: template.questions,
      context: {
        serviceType: context?.serviceType || '',
        therapistId: context?.therapistId || '',
        sessionId: context?.sessionId || '',
        date: context?.date || new Date().toISOString().slice(0, 10),
      },
      status: 'sent',
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    this.surveys.set(survey.id, survey);
    return { success: true, survey };
  }

  /* ─── تسجيل استجابة ─── */
  async submitResponse(surveyId, answers) {
    const survey = this.surveys.get(surveyId);
    if (!survey) return { success: false, error: 'الاستبيان غير موجود' };

    const response = {
      id: `rsp-${Date.now()}`,
      surveyId,
      beneficiaryId: survey.beneficiaryId,
      templateId: survey.templateId,
      context: survey.context,
      answers: answers.map(a => ({
        questionId: a.questionId,
        value: a.value,
        text: a.text || '',
      })),
      overallSatisfaction: this._calcOverallSatisfaction(survey, answers),
      submittedAt: new Date(),
    };

    survey.status = 'completed';
    this.surveys.set(surveyId, survey);

    const key = `${survey.beneficiaryId}_responses`;
    const existing = this.responses.get(key) || [];
    existing.push(response);
    this.responses.set(key, existing);

    // تحليل المشاعر للردود النصية
    response.sentimentAnalysis = this._analyzeSentiment(answers);

    return { success: true, response };
  }

  /* ─── تقديم شكوى ─── */
  async submitComplaint(beneficiaryId, complaintData) {
    const complaint = {
      id: `cmp-${Date.now()}`,
      beneficiaryId,
      category: complaintData.category || 'general',
      severity: complaintData.severity || 'medium',
      serviceType: complaintData.serviceType || '',
      therapistId: complaintData.therapistId || '',
      description: complaintData.description,
      status: 'received',
      createdAt: new Date(),
      history: [{ status: 'received', date: new Date(), note: 'تم استلام الشكوى' }],
    };
    this.complaints.set(complaint.id, complaint);
    return { success: true, complaint };
  }

  /* ─── تحديث حالة الشكوى ─── */
  async updateComplaintStatus(complaintId, status, note) {
    const complaint = this.complaints.get(complaintId);
    if (!complaint) return { success: false, error: 'الشكوى غير موجودة' };

    complaint.status = status;
    complaint.history.push({ status, date: new Date(), note: note || '' });
    if (status === 'resolved') complaint.resolvedAt = new Date();
    this.complaints.set(complaintId, complaint);
    return { success: true, complaint };
  }

  /* ─── تقديم مقترح ─── */
  async submitSuggestion(beneficiaryId, suggestionData) {
    const suggestion = {
      id: `sug-${Date.now()}`,
      beneficiaryId,
      category: suggestionData.category || 'general',
      title: suggestionData.title,
      description: suggestionData.description,
      status: 'submitted',
      votes: 0,
      createdAt: new Date(),
    };
    this.suggestions.set(suggestion.id, suggestion);
    return { success: true, suggestion };
  }

  /* ─── تقرير الرضا ─── */
  async getSatisfactionReport(filters) {
    const allResponses = [];
    for (const [, responses] of this.responses) {
      allResponses.push(...responses);
    }

    const filtered = filters?.serviceType
      ? allResponses.filter(r => r.context.serviceType === filters.serviceType)
      : allResponses;

    if (filtered.length === 0) return { totalResponses: 0, message: 'لا توجد استجابات' };

    const scores = filtered.map(r => r.overallSatisfaction);
    const npsScores = filtered
      .map(r => r.answers.find(a => a.questionId === 'q7'))
      .filter(Boolean)
      .map(a => a.value);

    return {
      totalResponses: filtered.length,
      overallSatisfaction: {
        average: this._avg(scores),
        trend: this._calcTrend(scores),
        distribution: this._calcDistribution(scores),
      },
      nps: this._calculateNPS(npsScores),
      byService: this._groupByService(filtered),
      byTherapist: this._groupByTherapist(filtered),
      complaints: {
        total: this.complaints.size,
        open: Array.from(this.complaints.values()).filter(c => c.status !== 'resolved').length,
        avgResolutionTime: this._avgResolutionTime(),
      },
      suggestions: {
        total: this.suggestions.size,
        topCategories: this._topSuggestionCategories(),
      },
      recentFeedback: filtered.slice(-10).map(r => ({
        date: r.submittedAt,
        satisfaction: r.overallSatisfaction,
        service: r.context.serviceType,
      })),
      recommendations: this._generateSatisfactionRecommendations(filtered),
    };
  }

  /* ─── لوحة معلومات سريعة ─── */
  async getDashboardStats() {
    const responses = [];
    for (const [, r] of this.responses) responses.push(...r);

    return {
      totalSurveysSent: this.surveys.size,
      totalResponses: responses.length,
      responseRate: this.surveys.size
        ? Math.round((responses.length / this.surveys.size) * 100)
        : 0,
      avgSatisfaction: this._avg(responses.map(r => r.overallSatisfaction)),
      openComplaints: Array.from(this.complaints.values()).filter(c => c.status !== 'resolved')
        .length,
      pendingSurveys: Array.from(this.surveys.values()).filter(s => s.status === 'sent').length,
      totalSuggestions: this.suggestions.size,
    };
  }

  /* ─── مساعدات ─── */
  _calcOverallSatisfaction(survey, answers) {
    const ratingAnswers = answers.filter(a => {
      const q = survey.questions.find(q => q.id === a.questionId);
      return q && (q.type === 'rating' || q.type === 'nps');
    });
    if (ratingAnswers.length === 0) return 0;
    const maxScale = Math.max(
      ...survey.questions
        .filter(q => q.type === 'rating' || q.type === 'nps')
        .map(q => q.scale || 5)
    );
    return Math.round((this._avg(ratingAnswers.map(a => a.value)) / maxScale) * 100);
  }

  _analyzeSentiment(answers) {
    const textAnswers = answers.filter(a => typeof a.text === 'string' && a.text.length > 0);
    if (textAnswers.length === 0) return { overall: 'neutral' };

    const positiveWords = ['ممتاز', 'رائع', 'شكر', 'تحسن', 'جيد', 'سعيد', 'راضي', 'أعجبني'];
    const negativeWords = ['سيئ', 'ضعيف', 'انتظار', 'مشكلة', 'تأخر', 'غير راض', 'إهمال'];

    let posCount = 0,
      negCount = 0;
    textAnswers.forEach(a => {
      positiveWords.forEach(w => {
        if (a.text.includes(w)) posCount++;
      });
      negativeWords.forEach(w => {
        if (a.text.includes(w)) negCount++;
      });
    });

    return {
      overall: posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral',
      positiveCount: posCount,
      negativeCount: negCount,
    };
  }

  _calculateNPS(scores) {
    if (scores.length === 0) return { score: 0, promoters: 0, passives: 0, detractors: 0 };
    const promoters = scores.filter(s => s >= 9).length;
    const detractors = scores.filter(s => s <= 6).length;
    const passives = scores.length - promoters - detractors;
    return {
      score: Math.round(((promoters - detractors) / scores.length) * 100),
      promoters,
      passives,
      detractors,
    };
  }

  _groupByService(responses) {
    const groups = {};
    responses.forEach(r => {
      const svc = r.context.serviceType || 'unknown';
      if (!groups[svc]) groups[svc] = [];
      groups[svc].push(r.overallSatisfaction);
    });
    return Object.entries(groups).reduce((acc, [svc, scores]) => {
      acc[svc] = { count: scores.length, avgSatisfaction: this._avg(scores) };
      return acc;
    }, {});
  }

  _groupByTherapist(responses) {
    const groups = {};
    responses.forEach(r => {
      const tid = r.context.therapistId || 'unknown';
      if (!groups[tid]) groups[tid] = [];
      groups[tid].push(r.overallSatisfaction);
    });
    return Object.entries(groups).reduce((acc, [tid, scores]) => {
      acc[tid] = { count: scores.length, avgSatisfaction: this._avg(scores) };
      return acc;
    }, {});
  }

  _avgResolutionTime() {
    const resolved = Array.from(this.complaints.values()).filter(c => c.resolvedAt);
    if (resolved.length === 0) return 0;
    const times = resolved.map(
      c => (new Date(c.resolvedAt) - new Date(c.createdAt)) / (1000 * 60 * 60)
    );
    return Math.round(this._avg(times));
  }

  _topSuggestionCategories() {
    const cats = {};
    for (const [, s] of this.suggestions) {
      cats[s.category] = (cats[s.category] || 0) + 1;
    }
    return cats;
  }

  _calcDistribution(scores) {
    return {
      excellent: scores.filter(s => s >= 80).length,
      good: scores.filter(s => s >= 60 && s < 80).length,
      average: scores.filter(s => s >= 40 && s < 60).length,
      poor: scores.filter(s => s < 40).length,
    };
  }

  _generateSatisfactionRecommendations(responses) {
    const recs = [];
    const avg = this._avg(responses.map(r => r.overallSatisfaction));
    if (avg < 50) recs.push('رضا المستفيدين منخفض — يُوصى بمراجعة شاملة لجودة الخدمات');
    if (avg < 70) recs.push('تعزيز التواصل مع الأسر وإشراكهم في العملية العلاجية');
    const complaints = Array.from(this.complaints.values()).filter(c => c.status !== 'resolved');
    if (complaints.length > 5)
      recs.push('يوجد ' + complaints.length + ' شكوى مفتوحة تحتاج معالجة عاجلة');
    return recs;
  }

  _avg(arr) {
    const v = arr.filter(x => x != null && !isNaN(x));
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
  }
  _calcTrend(arr) {
    if (arr.length < 3) return 'insufficient_data';
    const f = this._avg(arr.slice(0, 3));
    const l = this._avg(arr.slice(-3));
    return l - f > 3 ? 'improving' : l - f < -3 ? 'declining' : 'stable';
  }
}

module.exports = { SatisfactionFeedbackService };
