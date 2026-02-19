/**
 * Customer Experience & Satisfaction Management Service
 * Phase 19: Survey Management, NPS Tracking, Sentiment Analysis
 */

class CustomerExperienceService {
  constructor() {
    this.surveys = new Map();
    this.responses = new Map();
    this.feedbacks = new Map();
    this.npsScores = [];
    this.feedbackResponses = new Map();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SURVEY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  createSurvey(surveyData) {
    const { title, questions, targetAudience } = surveyData;

    if (!title || !questions || !targetAudience) {
      throw new Error('Missing required fields: title, questions, targetAudience');
    }

    const survey = {
      id: `SRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      questions,
      targetAudience: [...targetAudience],
      status: 'active',
      responseCount: 0,
      completionRate: '0.00',
      createdBy: surveyData.createdBy || 'system',
      createdAt: new Date(),
      responses: new Map(),
      metadata: surveyData.metadata || {},
      type: surveyData.type || 'general',
    };

    this.surveys.set(survey.id, survey);
    return survey;
  }

  submitSurveyResponse(surveyId, responseData) {
    const { customerId, answers } = responseData;

    if (!surveyId || !customerId || !answers) {
      throw new Error('Missing required fields: surveyId, customerId, answers');
    }

    const survey = this.surveys.get(surveyId);
    if (!survey) {
      throw new Error(`Survey not found: ${surveyId}`);
    }

    const response = {
      id: `RESP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      surveyId,
      customerId,
      answers,
      deviceType: responseData.deviceType || 'desktop',
      completionTime: responseData.completionTime || null,
      sentiment: this._analyzeSentimentFromAnswers(answers),
      submittedAt: new Date(),
    };

    survey.responses.set(response.id, response);
    this.responses.set(response.id, response);

    // Update survey metrics
    survey.responseCount++;
    const completionPercentage = (survey.responseCount / survey.targetAudience.length) * 100;
    survey.completionRate = completionPercentage.toFixed(2);

    return response;
  }

  getSurveyResults(surveyId) {
    const survey = this.surveys.get(surveyId);
    if (!survey) {
      throw new Error(`Survey not found: ${surveyId}`);
    }

    const responses = Array.from(survey.responses.values());
    const questionAnalysis = this._analyzeQuestions(survey.questions, responses);
    const insights = this._generateSurveyInsights(responses, survey.questions);

    return {
      surveyId,
      title: survey.title,
      responseCount: survey.responseCount,
      completionRate: survey.completionRate,
      questionAnalysis,
      insights,
      responses,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NPS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  recordNPSScore(scoreData) {
    const { customerId, score, feedback } = scoreData;

    if (typeof score !== 'number' || score < 0 || score > 10) {
      throw new Error('NPS score must be between 0 and 10');
    }

    let category;
    if (score >= 9) {
      category = 'promoter';
    } else if (score >= 7) {
      category = 'passive';
    } else {
      category = 'detractor';
    }

    const npsRecord = {
      id: `NPS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      score,
      category,
      feedback: feedback || '',
      recordedAt: new Date(),
    };

    this.npsScores.push(npsRecord);
    return npsRecord;
  }

  calculateNPS(startDate = null, endDate = null) {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    const filteredScores = this.npsScores.filter(s => {
      const scoreDate = new Date(s.recordedAt);
      return scoreDate >= start && scoreDate <= end;
    });

    if (filteredScores.length === 0) {
      return {
        npsScore: '0.00',
        totalResponses: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        trend: 'stable',
      };
    }

    const promoters = filteredScores.filter(s => s.category === 'promoter').length;
    const detractors = filteredScores.filter(s => s.category === 'detractor').length;
    const passives = filteredScores.filter(s => s.category === 'passive').length;

    const npsScore = ((promoters - detractors) / filteredScores.length) * 100;

    // Determine trend
    const midPoint = Math.floor(filteredScores.length / 2);
    const firstHalf = filteredScores.slice(0, midPoint);
    const secondHalf = filteredScores.slice(midPoint);

    let trend = 'stable';
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfPromoters = firstHalf.filter(s => s.category === 'promoter').length;
      const firstHalfDetractors = firstHalf.filter(s => s.category === 'detractor').length;
      const secondHalfPromoters = secondHalf.filter(s => s.category === 'promoter').length;
      const secondHalfDetractors = secondHalf.filter(s => s.category === 'detractor').length;

      const firstHalfScore = ((firstHalfPromoters - firstHalfDetractors) / firstHalf.length) * 100;
      const secondHalfScore =
        ((secondHalfPromoters - secondHalfDetractors) / secondHalf.length) * 100;

      if (secondHalfScore > firstHalfScore) {
        trend = 'improving';
      } else if (secondHalfScore < firstHalfScore) {
        trend = 'declining';
      }
    }

    return {
      npsScore: npsScore.toFixed(2),
      totalResponses: filteredScores.length,
      promoters,
      passives,
      detractors,
      trend,
    };
  }

  getNPSBySegment(segment, startDate, endDate) {
    // TODO: Implement segment filtering
    return this.calculateNPS(startDate, endDate);
  }

  getNPSTrend(timeframe) {
    // TODO: Implement trend calculation
    const trend = this.calculateNPS();
    return trend;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDBACK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  submitFeedback(feedbackData) {
    const { customerId, content } = feedbackData;

    if (!customerId || !content) {
      throw new Error('Missing required fields: customerId, content');
    }

    const feedback = {
      id: `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      content,
      category: feedbackData.category || 'general',
      rating: feedbackData.rating || null,
      status: 'new',
      sentiment: this._analyzeSentiment(content),
      submittedAt: new Date(),
      responses: [],
    };

    this.feedbacks.set(feedback.id, feedback);
    return feedback;
  }

  respondToFeedback(feedbackId, responseData) {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }

    const { respondedBy, message, resolution, status } = responseData;

    const response = {
      id: `REP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      feedbackId,
      respondedBy,
      message,
      resolution,
      status,
      respondedAt: new Date(),
    };

    feedback.responses.push(response);
    if (status) {
      feedback.status = status;
    }

    this.feedbackResponses.set(response.id, response);
    return response;
  }

  getFeedbackAnalytics(startDate, endDate) {
    const feedbacks = Array.from(this.feedbacks.values()).filter(f => {
      const fDate = new Date(f.submittedAt);
      return fDate >= startDate && fDate <= endDate;
    });

    const byCategory = {};
    const bySentiment = { positive: 0, neutral: 0, negative: 0 };
    const byStatus = {};

    feedbacks.forEach(f => {
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
      byStatus[f.status] = (byStatus[f.status] || 0) + 1;
      if (bySentiment.hasOwnProperty(f.sentiment)) {
        bySentiment[f.sentiment]++;
      }
    });

    return {
      totalFeedback: feedbacks.length,
      byCategory,
      bySentiment,
      byStatus,
      averageRating: this._calculateAverageRating(feedbacks),
      topIssues: this._getTopIssues(feedbacks),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  _analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
      return 'neutral';
    }

    const text_lower = text.toLowerCase();

    const positiveWords = [
      'excellent',
      'great',
      'good',
      'amazing',
      'wonderful',
      'fantastic',
      'perfect',
      'love',
      'thank',
      'happy',
    ];
    const negativeWords = [
      'bad',
      'horrible',
      'terrible',
      'awful',
      'poor',
      'disappointed',
      'angry',
      'hate',
      'issue',
      'problem',
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (text_lower.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (text_lower.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    }

    return 'neutral';
  }

  _analyzeSentimentFromAnswers(answers) {
    let sentimentScore = 0;

    answers.forEach(answer => {
      if (typeof answer.value === 'number') {
        sentimentScore += answer.value;
      } else if (typeof answer.value === 'string') {
        const sentiment = this._analyzeSentiment(answer.value);
        if (sentiment === 'positive') sentimentScore += 1;
        if (sentiment === 'negative') sentimentScore -= 1;
      }
    });

    if (sentimentScore > 0) return 'positive';
    if (sentimentScore < 0) return 'negative';
    return 'neutral';
  }

  _analyzeQuestions(questions, responses) {
    return questions.map(q => {
      const answers = responses.flatMap(r => r.answers).filter(a => a.questionId === q.id);

      const analysis = {
        questionId: q.id,
        text: q.text,
        type: q.type,
        responseCount: answers.length,
        distribution: {},
      };

      if (q.type === 'rating') {
        const values = answers.map(a => Number(a.value)).filter(v => !isNaN(v));
        if (values.length > 0) {
          analysis.average = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
        }
      }

      return analysis;
    });
  }

  _generateSurveyInsights(responses, questions) {
    if (responses.length === 0) {
      return {
        sentiment: 'neutral',
        averageScore: '0.00',
        totalResponses: 0,
      };
    }

    const sentiments = responses.map(r => r.sentiment);
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;

    let sentiment = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    if (negativeCount > positiveCount) sentiment = 'negative';

    // Calculate average score from rating questions
    let totalScore = 0;
    let scoreCount = 0;

    responses.forEach(response => {
      response.answers.forEach(answer => {
        const question = questions.find(q => q.id === answer.questionId);
        if (question && question.type === 'rating' && typeof answer.value === 'number') {
          totalScore += answer.value;
          scoreCount++;
        }
      });
    });

    const averageScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : '0.00';

    return {
      sentiment,
      averageScore,
      totalResponses: responses.length,
      positiveResponsesPercent: ((positiveCount / responses.length) * 100).toFixed(2),
    };
  }

  _calculateAverageRating(feedbacks) {
    const rated = feedbacks.filter(f => f.rating !== null);
    if (rated.length === 0) return 0;
    return (rated.reduce((sum, f) => sum + f.rating, 0) / rated.length).toFixed(2);
  }

  _getTopIssues(feedbacks) {
    const categories = {};
    feedbacks.forEach(f => {
      if (f.category) {
        categories[f.category] = (categories[f.category] || 0) + 1;
      }
    });

    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
  }
}

module.exports = CustomerExperienceService;
