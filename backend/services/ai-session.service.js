/**
 * AI Session Analysis Service
 * خدمة تحليل الجلسات بالذكاء الاصطناعي
 *
 * ML-powered analysis for session documentation, patient progress, and predictive alerts
 */

const axios = require('axios');
const EventEmitter = require('events');

class AISessionService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.modelEndpoint = process.env.ML_MODEL_ENDPOINT || 'http://localhost:8000';
    this.initialize();
  }

  /**
   * Initialize AI service with health check
   */
  async initialize() {
    try {
      const response = await axios.get(`${this.modelEndpoint}/health`);
      if (response.status === 200) {
        this.initialized = true;
        console.log('✅ AI Service initialized successfully');
        this.emit('ai:ready');
      }
    } catch (error) {
      console.log('⚠️ AI Service unavailable - continuing with fallback mode');
      this.initialized = false;
    }
  }

  /**
   * Analyze session documentation for quality and insights
   * تحليل توثيق الجلسة للجودة والرؤى
   */
  async analyzeSessionDocumentation(documentation, therapistId) {
    try {
      if (!this.initialized) {
        return this.fallbackDocumentationAnalysis(documentation);
      }

      const response = await axios.post(
        `${this.modelEndpoint}/analyze/documentation`,
        {
          content: documentation.content,
          soap: documentation.soap,
          therapistId,
          patientId: documentation.beneficiaryId,
          sessionDate: documentation.createdAt
        }
      );

      return {
        qualityScore: response.data.qualityScore,
        completeness: response.data.completeness,
        clinicalInsights: response.data.clinicalInsights,
        suggestedImprovements: response.data.suggestedImprovements,
        redFlags: response.data.redFlags,
        recommendedInterventions: response.data.recommendedInterventions,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Documentation analysis error:', error);
      return this.fallbackDocumentationAnalysis(documentation);
    }
  }

  /**
   * Analyze patient progress and predict goal achievement
   * تحليل تقدم المريض والتنبؤ بتحقيق الأهداف
   */
  async analyzePatientProgress(patientId, sessions, goals) {
    try {
      if (!this.initialized) {
        return this.fallbackProgressAnalysis(sessions, goals);
      }

      const response = await axios.post(
        `${this.modelEndpoint}/analyze/progress`,
        {
          patientId,
          sessions: sessions.map(s => ({
            date: s.completedAt,
            duration: s.duration,
            therapist: s.therapistId,
            documentation: s.documentation?.soap
          })),
          goals: goals.map(g => ({
            id: g._id,
            name: g.name,
            targetDate: g.targetDate,
            metrics: g.metrics
          }))
        }
      );

      return {
        overallProgress: response.data.overallProgress,
        goalPredictions: response.data.goalPredictions, // [{ goalId, achievementProbability, estimatedDate }]
        progressTrendline: response.data.progressTrendline,
        motivationLevel: response.data.motivationLevel,
        complianceScore: response.data.complianceScore,
        recommendations: response.data.recommendations,
        riskFactors: response.data.riskFactors,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Progress analysis error:', error);
      return this.fallbackProgressAnalysis(sessions, goals);
    }
  }

  /**
   * Generate predictive alerts based on patient history
   * توليد تنبيهات تنبؤية بناءً على السجل
   */
  async generatePredictiveAlerts(patientId, therapistData, clinicalHistory) {
    try {
      if (!this.initialized) {
        return this.fallbackPredictiveAlerts(therapistData);
      }

      const response = await axios.post(
        `${this.modelEndpoint}/predict/alerts`,
        {
          patientId,
          recentSessions: therapistData.recentSessions,
          noShowHistory: therapistData.noShowCount,
          satisfactionTrend: therapistData.satisfactionTrend,
          engagementPattern: therapistData.engagementPattern,
          clinicalHistory: clinicalHistory
        }
      );

      return {
        alerts: response.data.alerts.map(alert => ({
          type: alert.type, // dropout_risk, no_show_risk, regression_risk, intervention_needed
          severity: alert.severity, // low, medium, high, critical
          probability: alert.probability,
          description: alert.description,
          recommendedAction: alert.recommendedAction,
          referralSuggestion: alert.referralSuggestion
        })),
        riskScore: response.data.riskScore,
        interventionSuggestions: response.data.interventionSuggestions,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Predictive alerts error:', error);
      return this.fallbackPredictiveAlerts(therapistData);
    }
  }

  /**
   * Predict optimal therapist assignment for new patient
   * التنبؤ بأفضل طبيب معالج للمريض الجديد
   */
  async recommendTherapist(patientProfile, availableTherapists) {
    try {
      if (!this.initialized) {
        return this.fallbackTherapistRecommendation(availableTherapists);
      }

      const response = await axios.post(
        `${this.modelEndpoint}/recommend/therapist`,
        {
          patient: {
            age: patientProfile.age,
            condition: patientProfile.diagnosis,
            language: patientProfile.language,
            preferences: patientProfile.preferences,
            previousTherapists: patientProfile.previousTherapistIds
          },
          therapists: availableTherapists.map(t => ({
            id: t._id,
            specializations: t.specializations,
            experience: t.yearsExperience,
            successRate: t.successRate,
            patientSatisfaction: t.avgRating,
            caseload: t.activePatients.length,
            previousPatients: t.previousPatientCount
          }))
        }
      );

      return {
        recommendations: response.data.recommendations.map(rec => ({
          therapistId: rec.therapistId,
          compatibilityScore: rec.compatibilityScore,
          reasoning: rec.reasoning,
          expectedOutcomes: rec.expectedOutcomes,
          riskFactors: rec.riskFactors
        })),
        alternativeMatches: response.data.alternativeMatches,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Therapist recommendation error:', error);
      return this.fallbackTherapistRecommendation(availableTherapists);
    }
  }

  /**
   * Analyze therapy effectiveness and ROI
   * تحليل فعالية العلاج والعائد على الاستثمار
   */
  async analyzeTherapyEffectiveness(therapistId, timeframe = '6months') {
    try {
      if (!this.initialized) {
        return this.fallbackTherapyAnalysis();
      }

      const response = await axios.post(
        `${this.modelEndpoint}/analyze/effectiveness`,
        {
          therapistId,
          timeframe
        }
      );

      return {
        effectivenessScore: response.data.effectivenessScore,
        successRate: response.data.successRate,
        patientImprovement: response.data.patientImprovement,
        averageTimeToGoals: response.data.averageTimeToGoals,
        financialROI: response.data.financialROI,
        patientSatisfactionCorrelation: response.data.patientSatisfactionCorrelation,
        areasOfExcellence: response.data.areasOfExcellence,
        areasForImprovement: response.data.areasForImprovement,
        benchmarkComparison: response.data.benchmarkComparison,
        recommendations: response.data.recommendations,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Effectiveness analysis error:', error);
      return this.fallbackTherapyAnalysis();
    }
  }

  /**
   * Detect anomalies in therapy patterns
   * الكشف عن الحالات الشاذة في أنماط العلاج
   */
  async detectAnomalies(clinicData) {
    try {
      if (!this.initialized) {
        return { anomalies: [], normalPatterns: [] };
      }

      const response = await axios.post(
        `${this.modelEndpoint}/detect/anomalies`,
        {
          noShowPatterns: clinicData.noShowPatterns,
          documentationQuality: clinicData.documentationQuality,
          patientSatisfaction: clinicData.patientSatisfaction,
          therapistPerformance: clinicData.therapistPerformance,
          revenueTrends: clinicData.revenueTrends
        }
      );

      return {
        anomalies: response.data.anomalies.map(a => ({
          type: a.type,
          severity: a.severity,
          affectedMetric: a.affectedMetric,
          description: a.description,
          recommendation: a.recommendation
        })),
        normalPatterns: response.data.normalPatterns,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Anomaly detection error:', error);
      return { anomalies: [], normalPatterns: [] };
    }
  }

  /**
   * Generate personalized therapy recommendations
   * توليد توصيات العلاج المخصصة
   */
  async generateTherapyRecommendations(patientId, condition, currentProgress) {
    try {
      if (!this.initialized) {
        return this.fallbackRecommendations();
      }

      const response = await axios.post(
        `${this.modelEndpoint}/generate/recommendations`,
        {
          patientId,
          condition,
          progress: currentProgress,
          baselineMetrics: currentProgress.baseline
        }
      );

      return {
        recommendedTechniques: response.data.recommendedTechniques,
        sessionFrequency: response.data.sessionFrequency,
        expectedDuration: response.data.expectedDuration,
        milestones: response.data.milestones,
        alternatives: response.data.alternatives,
        contraindications: response.data.contraindications,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Recommendation generation error:', error);
      return this.fallbackRecommendations();
    }
  }

  /**
   * FALLBACK METHODS (when AI service unavailable)
   */

  fallbackDocumentationAnalysis(documentation) {
    // Basic heuristic analysis
    const content = documentation.content || '';
    const lengthScore = Math.min(100, (content.length / 1000) * 50);

    return {
      qualityScore: lengthScore,
      completeness: documentation.soap?.subjective && documentation.soap?.objective ? 80 : 50,
      clinicalInsights: [],
      suggestedImprovements: ['Add more specific patient observations', 'Include measurable outcomes'],
      redFlags: [],
      recommendedInterventions: [],
      timestamp: new Date()
    };
  }

  fallbackProgressAnalysis(sessions, goals) {
    const completionRate = (sessions.length / (goals.length * 12)) * 100;

    return {
      overallProgress: Math.min(100, completionRate),
      goalPredictions: goals.map(g => ({
        goalId: g._id,
        achievementProbability: 0.65 + Math.random() * 0.3,
        estimatedDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      })),
      progressTrendline: [],
      motivationLevel: 'medium',
      complianceScore: 75,
      recommendations: ['Continue current therapy plan'],
      riskFactors: [],
      timestamp: new Date()
    };
  }

  fallbackPredictiveAlerts(therapistData) {
    return {
      alerts: [],
      riskScore: therapistData.noShowCount > 2 ? 'medium' : 'low',
      interventionSuggestions: [],
      timestamp: new Date()
    };
  }

  fallbackTherapistRecommendation(availableTherapists) {
    const sorted = availableTherapists.sort(
      (a, b) => (b.avgRating || 0) - (a.avgRating || 0)
    );

    return {
      recommendations: sorted.slice(0, 3).map(t => ({
        therapistId: t._id,
        compatibilityScore: 0.7 + Math.random() * 0.2,
        reasoning: 'Top rated therapist',
        expectedOutcomes: [],
        riskFactors: []
      })),
      alternativeMatches: sorted.slice(3, 6),
      timestamp: new Date()
    };
  }

  fallbackTherapyAnalysis() {
    return {
      effectivenessScore: 75,
      successRate: 0.75,
      patientImprovement: 'good',
      averageTimeToGoals: 90,
      financialROI: 1.5,
      patientSatisfactionCorrelation: 0.82,
      areasOfExcellence: [],
      areasForImprovement: ['Session efficiency'],
      benchmarkComparison: 'above average',
      recommendations: [],
      timestamp: new Date()
    };
  }

  fallbackRecommendations() {
    return {
      recommendedTechniques: ['Cognitive Behavioral Therapy', 'Motivational Interviewing'],
      sessionFrequency: 'twice weekly',
      expectedDuration: '6-8 weeks',
      milestones: [],
      alternatives: [],
      contraindications: [],
      timestamp: new Date()
    };
  }
}

// Export singleton instance
module.exports = new AISessionService();
