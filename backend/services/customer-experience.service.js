/**
 * ALAWAEL ERP - PHASE 19: CUSTOMER EXPERIENCE & SATISFACTION MANAGEMENT SERVICE
 * Customer feedback, NPS tracking, complaint resolution, experience metrics
 */

class CustomerExperienceService {
  constructor() {
    // Data stores
    this.customers = [];
    this.surveys = [];
    this.npsScores = [];
    this.feedback = [];
    this.complaints = [];
    this.experienceMetrics = [];
    this.journeyMaps = [];
    this.dashboards = [];
    this.sentimentAnalysis = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER SURVEY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  createSurvey(surveyData) {
    if (!surveyData.title || !surveyData.questions || !surveyData.targetAudience) {
      throw new Error('Missing required fields: title, questions, targetAudience');
    }

    const survey = {
      id: `SRV-${Date.now()}`,
      title: surveyData.title,
      description: surveyData.description || '',
      questions: surveyData.questions,
      targetAudience: surveyData.targetAudience,
      createdBy: surveyData.createdBy || 'system',
      createdAt: new Date(),
      status: 'active',
      responses: [],
      responseCount: 0,
      completionRate: 0,
      metadata: {
        type: surveyData.type || 'general', // satisfaction, nps, product, service
        duration: surveyData.duration || null,
        incentive: surveyData.incentive || null,
      },
    };

    this.surveys.push(survey);
    return survey;
  }

  submitSurveyResponse(surveyId, responseData) {
    if (!surveyId || !responseData.customerId || !responseData.answers) {
      throw new Error('Missing required fields: surveyId, customerId, answers');
    }

    const survey = this.surveys.find(s => s.id === surveyId);
    if (!survey) throw new Error('Survey not found');

    const response = {
      id: `RESP-${Date.now()}`,
      surveyId,
      customerId: responseData.customerId,
      answers: responseData.answers,
      submittedAt: new Date(),
      completionTime: responseData.completionTime || null,
      deviceType: responseData.deviceType || 'web',
      location: responseData.location || null,
    };

    survey.responses.push(response);
    survey.responseCount = survey.responses.length;
    survey.completionRate = ((survey.responseCount / survey.targetAudience.length) * 100).toFixed(
      2
    );

    return response;
  }

  getSurveyResults(surveyId) {
    const survey = this.surveys.find(s => s.id === surveyId);
    if (!survey) throw new Error('Survey not found');

    const analysis = {
      surveyId,
      title: survey.title,
      responseCount: survey.responseCount,
      completionRate: survey.completionRate,
      questionAnalysis: survey.questions.map(q => ({
        questionId: q.id,
        question: q.text,
        responses: survey.responses.map(r => r.answers.find(a => a.questionId === q.id)),
      })),
      insights: this._analyzeSurveyInsights(survey),
    };

    return analysis;
  }

  _analyzeSurveyInsights(survey) {
    if (survey.responses.length === 0) return { averageScore: 0, sentiment: 'neutral' };

    const numericAnswers = survey.responses
      .flatMap(r => r.answers)
      .filter(a => typeof a.value === 'number')
      .map(a => a.value);

    const avgScore =
      numericAnswers.length > 0
        ? (numericAnswers.reduce((a, b) => a + b, 0) / numericAnswers.length).toFixed(2)
        : 0;

    let sentiment = 'neutral';
    if (avgScore >= 4) sentiment = 'positive';
    else if (avgScore <= 2) sentiment = 'negative';

    return { averageScore: avgScore, sentiment, responseCount: survey.responses.length };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NPS (NET PROMOTER SCORE) TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  recordNPSScore(npsData) {
    if (!npsData.customerId || npsData.score === undefined) {
      throw new Error('Missing required fields: customerId, score');
    }

    if (npsData.score < 0 || npsData.score > 10) {
      throw new Error('NPS score must be between 0 and 10');
    }

    let category = 'detractor';
    if (npsData.score >= 9) category = 'promoter';
    else if (npsData.score >= 7) category = 'passive';

    const npsScore = {
      id: `NPS-${Date.now()}`,
      customerId: npsData.customerId,
      score: npsData.score,
      category,
      feedback: npsData.feedback || '',
      recordedAt: new Date(),
      touchpoint: npsData.touchpoint || 'general', // email, survey, chat, call
      metadata: {
        deviceType: npsData.deviceType || 'web',
        location: npsData.location || null,
        source: npsData.source || 'direct',
      },
    };

    this.npsScores.push(npsScore);
    return npsScore;
  }

  calculateNPS(timeframeStart, timeframeEnd) {
    const scores = this.npsScores.filter(s => {
      const date = new Date(s.recordedAt);
      return date >= timeframeStart && date <= timeframeEnd;
    });

    if (scores.length === 0) {
      return {
        npsScore: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        totalResponses: 0,
      };
    }

    const promoters = scores.filter(s => s.category === 'promoter').length;
    const detractors = scores.filter(s => s.category === 'detractor').length;

    const nps = ((promoters - detractors) / scores.length) * 100;

    return {
      npsScore: nps.toFixed(2),
      promoters,
      passives: scores.filter(s => s.category === 'passive').length,
      detractors,
      totalResponses: scores.length,
      trend: this._calculateNPSTrend(scores),
    };
  }

  _calculateNPSTrend(scores) {
    if (scores.length < 2) return 'insufficient-data';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstNPS =
      ((firstHalf.filter(s => s.category === 'promoter').length -
        firstHalf.filter(s => s.category === 'detractor').length) /
        firstHalf.length) *
      100;
    const secondNPS =
      ((secondHalf.filter(s => s.category === 'promoter').length -
        secondHalf.filter(s => s.category === 'detractor').length) /
        secondHalf.length) *
      100;

    if (secondNPS > firstNPS) return 'improving';
    if (secondNPS < firstNPS) return 'declining';
    return 'stable';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDBACK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  submitFeedback(feedbackData) {
    if (!feedbackData.customerId || !feedbackData.content) {
      throw new Error('Missing required fields: customerId, content');
    }

    const feedback = {
      id: `FB-${Date.now()}`,
      customerId: feedbackData.customerId,
      content: feedbackData.content,
      category: feedbackData.category || 'general', // product, service, website, staff, other
      rating: feedbackData.rating || null, // 1-5
      submittedAt: new Date(),
      status: 'new',
      responses: [],
      metadata: {
        source: feedbackData.source || 'direct',
        sentiment: feedbackData.sentiment || 'neutral',
        keywords: feedbackData.keywords || [],
      },
    };

    this.feedback.push(feedback);
    return feedback;
  }

  respondToFeedback(feedbackId, response) {
    const fb = this.feedback.find(f => f.id === feedbackId);
    if (!fb) throw new Error('Feedback not found');

    const reply = {
      id: `REP-${Date.now()}`,
      respondedBy: response.respondedBy,
      message: response.message,
      respondedAt: new Date(),
      resolution: response.resolution || null,
    };

    fb.responses.push(reply);
    fb.status = response.status || 'responded';

    return reply;
  }

  getFeedbackAnalytics(filters = {}) {
    let feedbackList = this.feedback;

    if (filters.category) {
      feedbackList = feedbackList.filter(f => f.category === filters.category);
    }

    if (filters.status) {
      feedbackList = feedbackList.filter(f => f.status === filters.status);
    }

    const analytics = {
      totalFeedback: feedbackList.length,
      byCategory: {},
      byStatus: {},
      averageRating: 0,
      sentimentDistribution: {},
      topIssues: [],
    };

    feedbackList.forEach(f => {
      analytics.byCategory[f.category] = (analytics.byCategory[f.category] || 0) + 1;
      analytics.byStatus[f.status] = (analytics.byStatus[f.status] || 0) + 1;
      analytics.sentimentDistribution[f.metadata.sentiment] =
        (analytics.sentimentDistribution[f.metadata.sentiment] || 0) + 1;
    });

    const ratingsCount = feedbackList.filter(f => f.rating).length;
    if (ratingsCount > 0) {
      const avgRating =
        feedbackList.filter(f => f.rating).reduce((a, b) => a + b.rating, 0) / ratingsCount;
      analytics.averageRating = avgRating.toFixed(2);
    }

    return analytics;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLAINT MANAGEMENT & RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════════

  registerComplaint(complaintData) {
    if (!complaintData.customerId || !complaintData.description || !complaintData.severity) {
      throw new Error('Missing required fields: customerId, description, severity');
    }

    const complaint = {
      id: `CMP-${Date.now()}`,
      customerId: complaintData.customerId,
      description: complaintData.description,
      severity: complaintData.severity, // low, medium, high, critical
      category: complaintData.category || 'general',
      registeredAt: new Date(),
      status: 'open',
      priority: this._calculateComplaintPriority(complaintData.severity),
      timeline: {
        registeredAt: new Date(),
        assignedAt: null,
        resolvedAt: null,
      },
      assignedTo: complaintData.assignedTo || null,
      resolution: null,
      escalations: [],
    };

    this.complaints.push(complaint);
    return complaint;
  }

  updateComplaintStatus(complaintId, statusUpdate) {
    const complaint = this.complaints.find(c => c.id === complaintId);
    if (!complaint) throw new Error('Complaint not found');

    complaint.status = statusUpdate.status;
    complaint.assignedTo = statusUpdate.assignedTo || complaint.assignedTo;

    if (statusUpdate.status === 'resolved') {
      complaint.timeline.resolvedAt = new Date();
      complaint.resolution = statusUpdate.resolution;
    } else if (statusUpdate.status === 'assigned') {
      complaint.timeline.assignedAt = new Date();
    }

    return complaint;
  }

  _calculateComplaintPriority(severity) {
    const priorityMap = { critical: 1, high: 2, medium: 3, low: 4 };
    return priorityMap[severity] || 4;
  }

  getComplaintAnalytics(filters = {}) {
    let complaintsList = this.complaints;

    if (filters.status) {
      complaintsList = complaintsList.filter(c => c.status === filters.status);
    }

    if (filters.severity) {
      complaintsList = complaintsList.filter(c => c.severity === filters.severity);
    }

    const analytics = {
      total: complaintsList.length,
      bySeverity: {},
      byStatus: {},
      averageResolutionTime: 0,
      openCount: this.complaints.filter(c => c.status === 'open').length,
      escalations: this.complaints.reduce((sum, c) => sum + c.escalations.length, 0),
    };

    complaintsList.forEach(c => {
      analytics.bySeverity[c.severity] = (analytics.bySeverity[c.severity] || 0) + 1;
      analytics.byStatus[c.status] = (analytics.byStatus[c.status] || 0) + 1;
    });

    const resolvedComplaints = this.complaints.filter(
      c => c.status === 'resolved' && c.timeline.resolvedAt && c.timeline.registeredAt
    );

    if (resolvedComplaints.length > 0) {
      const totalTime = resolvedComplaints.reduce(
        (sum, c) => sum + (new Date(c.timeline.resolvedAt) - new Date(c.timeline.registeredAt)),
        0
      );
      const avgHours = totalTime / resolvedComplaints.length / (1000 * 60 * 60);
      analytics.averageResolutionTime = avgHours.toFixed(2);
    }

    return analytics;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERIENCE METRICS & TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  trackExperienceMetric(metricData) {
    if (!metricData.name || !metricData.value === undefined || !metricData.dimension) {
      throw new Error('Missing required fields: name, value, dimension');
    }

    const metric = {
      id: `EXP-${Date.now()}`,
      name: metricData.name,
      value: metricData.value,
      dimension: metricData.dimension, // feature, journey, channel, product
      recordedAt: new Date(),
      threshold: metricData.threshold || null,
      status: metricData.value >= (metricData.threshold || 0) ? 'healthy' : 'at-risk',
      metadata: metricData.metadata || {},
    };

    this.experienceMetrics.push(metric);
    return metric;
  }

  getExperienceMetricsByDimension(dimension, timeframe = 30) {
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
    const metrics = this.experienceMetrics.filter(
      m => m.dimension === dimension && new Date(m.recordedAt) >= startDate
    );

    return {
      dimension,
      metrics,
      average:
        metrics.length > 0
          ? (metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length).toFixed(2)
          : 0,
      trend: metrics.length > 1 ? this._calculateTrend(metrics) : 'insufficient-data',
    };
  }

  _calculateTrend(metrics) {
    if (metrics.length < 2) return 'insufficient-data';
    const recent = metrics.slice(-5);
    const older = metrics.slice(0, Math.max(1, metrics.length - 5));

    const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;

    if (recentAvg > olderAvg) return 'improving';
    if (recentAvg < olderAvg) return 'declining';
    return 'stable';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER JOURNEY MAPPING
  // ═══════════════════════════════════════════════════════════════════════════

  createJourneyMap(journeyData) {
    if (!journeyData.name || !journeyData.stages || !journeyData.customerId) {
      throw new Error('Missing required fields: name, stages, customerId');
    }

    const journey = {
      id: `JRN-${Date.now()}`,
      name: journeyData.name,
      customerId: journeyData.customerId,
      stages: journeyData.stages.map(s => ({
        stageId: s.id || `STG-${Date.now()}`,
        name: s.name,
        touchpoints: s.touchpoints || [],
        painPoints: s.painPoints || [],
        opportunities: s.opportunities || [],
        duration: s.duration || null,
      })),
      createdAt: new Date(),
      lastUpdated: new Date(),
      status: 'active',
      metrics: {
        satisfactionByStage: {},
        dropoffRate: null,
      },
    };

    this.journeyMaps.push(journey);
    return journey;
  }

  logJourneyTouchpoint(journeyId, touchpointData) {
    const journey = this.journeyMaps.find(j => j.id === journeyId);
    if (!journey) throw new Error('Journey not found');

    const stage = journey.stages.find(s => s.stageId === touchpointData.stageId);
    if (!stage) throw new Error('Stage not found');

    const touchpoint = {
      id: `TP-${Date.now()}`,
      name: touchpointData.name,
      channel: touchpointData.channel, // web, mobile, email, phone, chat
      timestamp: new Date(),
      sentiment: touchpointData.sentiment || 'neutral',
      duration: touchpointData.duration || null,
      outcome: touchpointData.outcome || 'neutral', // positive, neutral, negative
    };

    stage.touchpoints.push(touchpoint);
    journey.lastUpdated = new Date();

    return touchpoint;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERIENCE DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  createExperienceDashboard(dashboardData) {
    if (!dashboardData.name) {
      throw new Error('Missing required field: name');
    }

    const dashboard = {
      id: `DASH-${Date.now()}`,
      name: dashboardData.name,
      createdBy: dashboardData.createdBy || 'system',
      createdAt: new Date(),
      status: 'active',
      widgets: [
        {
          type: 'nps-gauge',
          title: 'Net Promoter Score',
          metric: 'nps',
          refreshInterval: 3600,
        },
        {
          type: 'feedback-summary',
          title: 'Recent Feedback',
          metric: 'feedback_count',
          refreshInterval: 1800,
        },
        {
          type: 'complaint-status',
          title: 'Open Complaints',
          metric: 'open_complaints',
          refreshInterval: 600,
        },
        {
          type: 'satisfaction-trend',
          title: 'Satisfaction Trend',
          metric: 'satisfaction',
          refreshInterval: 3600,
        },
        {
          type: 'channel-performance',
          title: 'Channel Performance',
          metric: 'channel_satisfaction',
          refreshInterval: 1800,
        },
      ],
      customizations: dashboardData.customizations || {},
      targetAudience: dashboardData.targetAudience || [],
    };

    this.dashboards.push(dashboard);
    return dashboard;
  }

  getExperienceDashboardData(dashboardId) {
    const dashboard = this.dashboards.find(d => d.id === dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const npsData = this.calculateNPS(thirtyDaysAgo, now);
    const feedbackData = this.getFeedbackAnalytics();
    const complaintData = this.getComplaintAnalytics();

    return {
      dashboard: dashboard.name,
      timestamp: new Date(),
      widgets: [
        {
          type: 'nps-gauge',
          title: 'Net Promoter Score',
          value: npsData.npsScore,
          status: npsData.npsScore >= 50 ? 'excellent' : npsData.npsScore >= 0 ? 'good' : 'poor',
          trend: npsData.trend,
        },
        {
          type: 'feedback-summary',
          title: 'Recent Feedback',
          totalFeedback: feedbackData.totalFeedback,
          averageRating: feedbackData.averageRating,
          sentiment: feedbackData.sentimentDistribution,
        },
        {
          type: 'complaint-status',
          title: 'Open Complaints',
          openCount: complaintData.openCount,
          averageResolutionTime: complaintData.averageResolutionTime,
          bySeverity: complaintData.bySeverity,
        },
        {
          type: 'satisfaction-trend',
          title: 'Satisfaction Trend',
          records: npsData.totalResponses,
          promoters: npsData.promoters,
          passives: npsData.passives,
          detractors: npsData.detractors,
        },
      ],
      summary: {
        totalNPS: npsData.npsScore,
        totalFeedback: feedbackData.totalFeedback,
        openComplaints: complaintData.openCount,
        averageSatisfaction: feedbackData.averageRating,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  analyzeSentiment(textContent) {
    if (!textContent) throw new Error('Missing required field: textContent');

    const sentiment = {
      id: `SENT-${Date.now()}`,
      content: textContent,
      analyzedAt: new Date(),
      sentiment: this._determineSentiment(textContent),
      score: this._calculateSentimentScore(textContent),
      keywords: this._extractKeywords(textContent),
      emotionalDrivers: this._identifyEmotionalDrivers(textContent),
    };

    this.sentimentAnalysis.push(sentiment);
    return sentiment;
  }

  _determineSentiment(text) {
    const positiveKeywords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'love',
      'fantastic',
      'perfect',
      'happy',
      'satisfied',
    ];
    const negativeKeywords = [
      'bad',
      'poor',
      'terrible',
      'awful',
      'hate',
      'disappointed',
      'angry',
      'unhappy',
      'frustrated',
    ];

    const textLower = text.toLowerCase();
    let positiveCount = positiveKeywords.filter(k => textLower.includes(k)).length;
    let negativeCount = negativeKeywords.filter(k => textLower.includes(k)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  _calculateSentimentScore(text) {
    const positiveKeywords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'love',
      'fantastic',
      'perfect',
      'happy',
      'satisfied',
    ];
    const negativeKeywords = [
      'bad',
      'poor',
      'terrible',
      'awful',
      'hate',
      'disappointed',
      'angry',
      'unhappy',
      'frustrated',
    ];

    const textLower = text.toLowerCase();
    let positiveCount = positiveKeywords.filter(k => textLower.includes(k)).length;
    let negativeCount = negativeKeywords.filter(k => textLower.includes(k)).length;

    const score = ((positiveCount - negativeCount) / (positiveCount + negativeCount || 1)) * 100;
    return Math.max(-100, Math.min(100, score)).toFixed(2);
  }

  _extractKeywords(text) {
    const commonWords = [
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'is',
      'was',
    ];
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(w => w.length > 3 && !commonWords.includes(w)).slice(0, 5);
  }

  _identifyEmotionalDrivers(text) {
    const emotionalPatterns = {
      frustration: ['wait', 'delay', 'slow', 'stuck', 'issue', 'problem'],
      joy: ['love', 'amazing', 'wonderful', 'fantastic', 'perfect'],
      disappointment: ['expected', 'hoped', 'promised', 'let down'],
      trust: ['reliable', 'secure', 'confident', 'dependable'],
    };

    const textLower = text.toLowerCase();
    const drivers = [];

    Object.entries(emotionalPatterns).forEach(([emotion, keywords]) => {
      if (keywords.some(k => textLower.includes(k))) {
        drivers.push(emotion);
      }
    });

    return drivers;
  }
}

module.exports = CustomerExperienceService;
