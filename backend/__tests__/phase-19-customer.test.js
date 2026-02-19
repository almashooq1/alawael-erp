/**
 * ALAWAEL ERP - PHASE 19 TEST SUITE
 * Customer Experience & Satisfaction Management
 * 52 comprehensive tests covering all functionality
 */

const CustomerExperienceService = require('../services/customer-experience.service');

describe('Phase 19: Customer Experience & Satisfaction Management', () => {
  let service;

  beforeEach(() => {
    service = new CustomerExperienceService();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SURVEY MANAGEMENT TESTS (8 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SURVEY MANAGEMENT', () => {
    test('Should create survey with required fields', () => {
      const survey = service.createSurvey({
        title: 'Customer Satisfaction Survey',
        questions: [
          { id: 'q1', text: 'How satisfied are you?', type: 'rating' },
          { id: 'q2', text: 'Would you recommend us?', type: 'yesno' },
        ],
        targetAudience: ['cust1', 'cust2', 'cust3'],
        createdBy: 'admin',
      });

      expect(survey.id).toMatch(/^SRV-/);
      expect(survey.title).toBe('Customer Satisfaction Survey');
      expect(survey.status).toBe('active');
      expect(survey.responseCount).toBe(0);
    });

    test('Should throw error for missing required fields', () => {
      expect(() => {
        service.createSurvey({
          title: 'Test Survey',
          // missing questions and targetAudience
        });
      }).toThrow('Missing required fields: title, questions, targetAudience');
    });

    test('Should submit survey response and update completion rate', () => {
      const survey = service.createSurvey({
        title: 'Test Survey',
        questions: [{ id: 'q1', text: 'Test?' }],
        targetAudience: ['c1', 'c2'],
      });

      const response = service.submitSurveyResponse(survey.id, {
        customerId: 'c1',
        answers: [{ questionId: 'q1', value: 'Yes' }],
      });

      expect(response.id).toMatch(/^RESP-/);
      expect(survey.responseCount).toBe(1);
      expect(survey.completionRate).toBe('50.00');
    });

    test('Should throw error for missing survey response fields', () => {
      const survey = service.createSurvey({
        title: 'Test',
        questions: [{ id: 'q1' }],
        targetAudience: ['c1'],
      });

      expect(() => {
        service.submitSurveyResponse(survey.id, {
          customerId: 'c1',
          // missing answers
        });
      }).toThrow('Missing required fields: surveyId, customerId, answers');
    });

    test('Should get survey results with analysis', () => {
      const survey = service.createSurvey({
        title: 'Test Survey',
        questions: [
          { id: 'q1', text: 'Rate us (1-5):', type: 'rating' },
          { id: 'q2', text: 'Would recommend?', type: 'yesno' },
        ],
        targetAudience: ['c1', 'c2'],
      });

      service.submitSurveyResponse(survey.id, {
        customerId: 'c1',
        answers: [
          { questionId: 'q1', value: 5 },
          { questionId: 'q2', value: 'Yes' },
        ],
      });

      const results = service.getSurveyResults(survey.id);
      expect(results.responseCount).toBe(1);
      expect(results.questionAnalysis).toHaveLength(2);
      expect(results.insights.sentiment).toBe('positive');
    });

    test('Should calculate average score in survey insights', () => {
      const survey = service.createSurvey({
        title: 'Rating Survey',
        questions: [{ id: 'q1', text: 'Rate it' }],
        targetAudience: ['c1', 'c2', 'c3'],
      });

      service.submitSurveyResponse(survey.id, {
        customerId: 'c1',
        answers: [{ questionId: 'q1', value: 5 }],
      });

      service.submitSurveyResponse(survey.id, {
        customerId: 'c2',
        answers: [{ questionId: 'q1', value: 3 }],
      });

      const results = service.getSurveyResults(survey.id);
      expect(results.insights.averageScore).toBe('4.00');
    });

    test('Should store survey metadata correctly', () => {
      const survey = service.createSurvey({
        title: 'NPS Survey',
        questions: [{ id: 'nps', text: 'Rate 0-10' }],
        targetAudience: ['c1'],
        type: 'nps',
        duration: 300,
      });

      expect(survey.metadata.type).toBe('nps');
      expect(survey.metadata.duration).toBe(300);
    });

    test('Should support different device types in survey responses', () => {
      const survey = service.createSurvey({
        title: 'Multi-device Survey',
        questions: [{ id: 'q1' }],
        targetAudience: ['c1', 'c2'],
      });

      const response1 = service.submitSurveyResponse(survey.id, {
        customerId: 'c1',
        answers: [{ questionId: 'q1', value: 'ok' }],
        deviceType: 'mobile',
      });

      const response2 = service.submitSurveyResponse(survey.id, {
        customerId: 'c2',
        answers: [{ questionId: 'q1', value: 'ok' }],
        deviceType: 'web',
      });

      expect(response1.deviceType).toBe('mobile');
      expect(response2.deviceType).toBe('web');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NPS (NET PROMOTER SCORE) TESTS (7 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('NPS TRACKING', () => {
    test('Should record NPS score correctly', () => {
      const npsScore = service.recordNPSScore({
        customerId: 'cust1',
        score: 9,
        feedback: 'Great service!',
      });

      expect(npsScore.id).toMatch(/^NPS-/);
      expect(npsScore.score).toBe(9);
      expect(npsScore.category).toBe('promoter');
    });

    test('Should categorize NPS correctly - promoter (9-10)', () => {
      const nps9 = service.recordNPSScore({ customerId: 'c1', score: 9 });
      const nps10 = service.recordNPSScore({ customerId: 'c2', score: 10 });

      expect(nps9.category).toBe('promoter');
      expect(nps10.category).toBe('promoter');
    });

    test('Should categorize NPS correctly - passive (7-8)', () => {
      const nps7 = service.recordNPSScore({ customerId: 'c1', score: 7 });
      const nps8 = service.recordNPSScore({ customerId: 'c2', score: 8 });

      expect(nps7.category).toBe('passive');
      expect(nps8.category).toBe('passive');
    });

    test('Should categorize NPS correctly - detractor (0-6)', () => {
      const nps0 = service.recordNPSScore({ customerId: 'c1', score: 0 });
      const nps6 = service.recordNPSScore({ customerId: 'c2', score: 6 });

      expect(nps0.category).toBe('detractor');
      expect(nps6.category).toBe('detractor');
    });

    test('Should validate NPS score range (0-10)', () => {
      expect(() => {
        service.recordNPSScore({ customerId: 'c1', score: 11 });
      }).toThrow('NPS score must be between 0 and 10');

      expect(() => {
        service.recordNPSScore({ customerId: 'c1', score: -1 });
      }).toThrow('NPS score must be between 0 and 10');
    });

    test('Should calculate NPS correctly', () => {
      // Use a very wide date range to avoid any timezone or timing issues
      const pastDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const now = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days in future

      const score1 = service.recordNPSScore({ customerId: 'c1', score: 10 }); // promoter
      const score2 = service.recordNPSScore({ customerId: 'c2', score: 8 }); // passive
      const score3 = service.recordNPSScore({ customerId: 'c3', score: 5 }); // detractor

      // Debug: log what got recorded
      const debugNps = service.calculateNPS(pastDate, now);
      if (debugNps.totalResponses === 0) {
        // If filter failed, try without date filtering
        console.log('Date filter returned 0 results. Scores recorded:', service.npsScores.length);
        console.log(
          'Recorded timestamps:',
          service.npsScores.map(s => s.recordedAt)
        );
        console.log('Date range:', { pastDate, now });
      }

      const nps = service.calculateNPS(pastDate, now);

      expect(nps.totalResponses).toBe(3);
      expect(nps.promoters).toBe(1);
      expect(nps.passives).toBe(1);
      expect(nps.detractors).toBe(1);
      expect(nps.npsScore).toBe('0.00'); // (1-1)/3 * 100 = 0
    });

    test('Should track NPS trend - improving', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // First half: mostly detractors
      service.recordNPSScore({ customerId: 'c1', score: 3 });
      service.recordNPSScore({ customerId: 'c2', score: 4 });

      // Second half: mostly promoters
      service.recordNPSScore({ customerId: 'c3', score: 9 });
      service.recordNPSScore({ customerId: 'c4', score: 10 });

      const nps = service.calculateNPS(pastDate, now);
      expect(nps.trend).toBe('improving');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDBACK MANAGEMENT TESTS (7 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('FEEDBACK MANAGEMENT', () => {
    test('Should submit feedback successfully', () => {
      const feedback = service.submitFeedback({
        customerId: 'cust1',
        content: 'Great experience with your service',
        category: 'product',
        rating: 5,
      });

      expect(feedback.id).toMatch(/^FB-/);
      expect(feedback.customerId).toBe('cust1');
      expect(feedback.status).toBe('new');
      expect(feedback.rating).toBe(5);
    });

    test('Should throw error for missing feedback fields', () => {
      expect(() => {
        service.submitFeedback({
          customerId: 'c1',
          // missing content
        });
      }).toThrow('Missing required fields: customerId, content');
    });

    test('Should respond to feedback', () => {
      const feedback = service.submitFeedback({
        customerId: 'c1',
        content: 'Issue with product',
      });

      const response = service.respondToFeedback(feedback.id, {
        respondedBy: 'support@company.com',
        message: 'Thank you for your feedback, we will fix this',
        resolution: 'Escalated to engineering team',
        status: 'resolved',
      });

      expect(response.id).toMatch(/^REP-/);
      expect(feedback.status).toBe('resolved');
      expect(feedback.responses).toHaveLength(1);
    });

    test('Should get feedback analytics by category', () => {
      service.submitFeedback({ customerId: 'c1', content: 'Good', category: 'product', rating: 5 });
      service.submitFeedback({ customerId: 'c2', content: 'Ok', category: 'service', rating: 3 });
      service.submitFeedback({ customerId: 'c3', content: 'Bad', category: 'product', rating: 1 });

      const analytics = service.getFeedbackAnalytics({ category: 'product' });

      expect(analytics.totalFeedback).toBe(2);
      expect(analytics.byCategory.product).toBe(2);
    });

    test('Should calculate average feedback rating', () => {
      service.submitFeedback({ customerId: 'c1', content: 'Test', rating: 5 });
      service.submitFeedback({ customerId: 'c2', content: 'Test', rating: 3 });
      service.submitFeedback({ customerId: 'c3', content: 'Test', rating: 4 });

      const analytics = service.getFeedbackAnalytics({});

      expect(analytics.averageRating).toBe('4.00');
    });

    test('Should track feedback sentiment distribution', () => {
      service.submitFeedback({
        customerId: 'c1',
        content: 'Excellent service',
        sentiment: 'positive',
      });
      service.submitFeedback({
        customerId: 'c2',
        content: 'Poor experience',
        sentiment: 'negative',
      });

      const analytics = service.getFeedbackAnalytics({});

      expect(analytics.sentimentDistribution.positive).toBe(1);
      expect(analytics.sentimentDistribution.negative).toBe(1);
    });

    test('Should support feedback metadata and keywords', () => {
      const feedback = service.submitFeedback({
        customerId: 'c1',
        content: 'Quick delivery and great quality',
        keywords: ['delivery', 'quality'],
        source: 'email',
      });

      expect(feedback.metadata.keywords).toEqual(['delivery', 'quality']);
      expect(feedback.metadata.source).toBe('email');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLAINT MANAGEMENT TESTS (7 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('COMPLAINT MANAGEMENT', () => {
    test('Should register complaint with all fields', () => {
      const complaint = service.registerComplaint({
        customerId: 'cust1',
        description: 'Product arrived damaged',
        severity: 'high',
        category: 'product',
      });

      expect(complaint.id).toMatch(/^CMP-/);
      expect(complaint.status).toBe('open');
      expect(complaint.priority).toBe(2); // high severity = priority 2
    });

    test('Should throw error for missing complaint required fields', () => {
      expect(() => {
        service.registerComplaint({
          customerId: 'c1',
          description: 'Issue',
          // missing severity
        });
      }).toThrow('Missing required fields: customerId, description, severity');
    });

    test('Should calculate complaint priority based on severity', () => {
      const critical = service.registerComplaint({
        customerId: 'c1',
        description: 'System down',
        severity: 'critical',
      });

      const low = service.registerComplaint({
        customerId: 'c2',
        description: 'Minor issue',
        severity: 'low',
      });

      expect(critical.priority).toBe(1);
      expect(low.priority).toBe(4);
    });

    test('Should update complaint status and assign owner', () => {
      const complaint = service.registerComplaint({
        customerId: 'c1',
        description: 'Issue',
        severity: 'medium',
      });

      const updated = service.updateComplaintStatus(complaint.id, {
        status: 'assigned',
        assignedTo: 'agent@company.com',
      });

      expect(updated.status).toBe('assigned');
      expect(updated.assignedTo).toBe('agent@company.com');
      expect(updated.timeline.assignedAt).toBeTruthy();
    });

    test('Should track complaint resolution timeline', () => {
      const complaint = service.registerComplaint({
        customerId: 'c1',
        description: 'Issue',
        severity: 'high',
      });

      service.updateComplaintStatus(complaint.id, {
        status: 'resolved',
        resolution: 'Issue fixed',
      });

      expect(complaint.timeline.resolvedAt).toBeTruthy();
      expect(complaint.resolution).toBe('Issue fixed');
    });

    test('Should get complaint analytics', () => {
      service.registerComplaint({
        customerId: 'c1',
        description: 'Issue 1',
        severity: 'critical',
      });
      service.registerComplaint({
        customerId: 'c2',
        description: 'Issue 2',
        severity: 'high',
      });
      service.registerComplaint({
        customerId: 'c3',
        description: 'Issue 3',
        severity: 'critical',
      });

      const analytics = service.getComplaintAnalytics({});

      expect(analytics.total).toBe(3);
      expect(analytics.bySeverity.critical).toBe(2);
      expect(analytics.openCount).toBe(3);
    });

    test('Should calculate average complaint resolution time', () => {
      const complaint = service.registerComplaint({
        customerId: 'c1',
        description: 'Issue',
        severity: 'medium',
      });

      // Simulate time passing
      service.updateComplaintStatus(complaint.id, {
        status: 'resolved',
        resolution: 'Fixed',
      });

      const analytics = service.getComplaintAnalytics({});
      // Should have a resolution time calculated
      expect(analytics.averageResolutionTime).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERIENCE METRICS TESTS (6 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('EXPERIENCE METRICS', () => {
    test('Should track experience metric', () => {
      const metric = service.trackExperienceMetric({
        name: 'Customer Response Time',
        value: 2.5,
        dimension: 'channel',
        threshold: 5.0,
      });

      expect(metric.id).toMatch(/^EXP-/);
      expect(metric.value).toBe(2.5);
      expect(metric.status).toBe('at-risk'); // 2.5 < 5.0 threshold
    });

    test('Should mark metric as at-risk when below threshold', () => {
      const metric = service.trackExperienceMetric({
        name: 'Uptime',
        value: 95.5,
        dimension: 'feature',
        threshold: 99.0,
      });

      expect(metric.status).toBe('at-risk'); // 95.5 < 99.0
    });

    test('Should get metrics by dimension with trend', () => {
      const now = new Date();

      service.trackExperienceMetric({
        name: 'Satisfaction Score',
        value: 4.0,
        dimension: 'feature',
      });

      service.trackExperienceMetric({
        name: 'Satisfaction Score',
        value: 4.3,
        dimension: 'feature',
      });

      const result = service.getExperienceMetricsByDimension('feature', 30);

      expect(result.dimension).toBe('feature');
      expect(result.metrics).toHaveLength(2);
      expect(result.average).toBe('4.15');
    });

    test('Should calculate metric trend - improving', () => {
      service.trackExperienceMetric({
        name: 'Score',
        value: 2,
        dimension: 'feature',
      });

      service.trackExperienceMetric({
        name: 'Score',
        value: 3,
        dimension: 'feature',
      });

      service.trackExperienceMetric({
        name: 'Score',
        value: 4,
        dimension: 'feature',
      });

      service.trackExperienceMetric({
        name: 'Score',
        value: 5,
        dimension: 'feature',
      });

      service.trackExperienceMetric({
        name: 'Score',
        value: 4.8,
        dimension: 'feature',
      });

      service.trackExperienceMetric({
        name: 'Score',
        value: 4.9,
        dimension: 'feature',
      });

      const result = service.getExperienceMetricsByDimension('feature', 30);
      expect(result.trend).toBe('improving');
    });

    test('Should return insufficient data trend for single metric', () => {
      service.trackExperienceMetric({
        name: 'Score',
        value: 4.0,
        dimension: 'product',
      });

      const result = service.getExperienceMetricsByDimension('product', 30);
      expect(result.trend).toBe('insufficient-data');
    });

    test('Should filter metrics by dimension and timeframe', () => {
      service.trackExperienceMetric({
        name: 'Metric A',
        value: 5,
        dimension: 'feature',
      });

      service.trackExperienceMetric({
        name: 'Metric B',
        value: 3,
        dimension: 'journey',
      });

      service.trackExperienceMetric({
        name: 'Metric C',
        value: 4,
        dimension: 'feature',
      });

      const feature = service.getExperienceMetricsByDimension('feature');
      const journey = service.getExperienceMetricsByDimension('journey');

      expect(feature.metrics).toHaveLength(2);
      expect(journey.metrics).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER JOURNEY TESTS (5 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CUSTOMER JOURNEY MAPPING', () => {
    test('Should create customer journey map', () => {
      const journey = service.createJourneyMap({
        name: 'Purchase Journey',
        customerId: 'cust1',
        stages: [
          { id: 'awareness', name: 'Awareness' },
          { id: 'consideration', name: 'Consideration' },
          { id: 'purchase', name: 'Purchase' },
        ],
      });

      expect(journey.id).toMatch(/^JRN-/);
      expect(journey.stages).toHaveLength(3);
      expect(journey.status).toBe('active');
    });

    test('Should throw error for missing journey fields', () => {
      expect(() => {
        service.createJourneyMap({
          name: 'Journey',
          // missing customerId and stages
        });
      }).toThrow('Missing required fields: name, stages, customerId');
    });

    test('Should log touchpoint in journey stage', () => {
      const journey = service.createJourneyMap({
        name: 'Journey',
        customerId: 'c1',
        stages: [{ id: 'stage1', name: 'Stage 1' }],
      });

      const touchpoint = service.logJourneyTouchpoint(journey.id, {
        stageId: 'stage1',
        name: 'Website Visit',
        channel: 'web',
        sentiment: 'positive',
      });

      expect(touchpoint.id).toMatch(/^TP-/);
      expect(journey.stages[0].touchpoints).toHaveLength(1);
    });

    test('Should track touchpoint by channel', () => {
      const journey = service.createJourneyMap({
        name: 'Journey',
        customerId: 'c1',
        stages: [{ id: 's1', name: 'Stage' }],
      });

      service.logJourneyTouchpoint(journey.id, {
        stageId: 's1',
        name: 'Email',
        channel: 'email',
      });

      service.logJourneyTouchpoint(journey.id, {
        stageId: 's1',
        name: 'Chat',
        channel: 'chat',
      });

      expect(journey.stages[0].touchpoints[0].channel).toBe('email');
      expect(journey.stages[0].touchpoints[1].channel).toBe('chat');
    });

    test('Should support multiple stages with touchpoints', () => {
      const journey = service.createJourneyMap({
        name: 'Full Journey',
        customerId: 'c1',
        stages: [
          { id: 's1', name: 'Awareness' },
          { id: 's2', name: 'Purchase' },
        ],
      });

      service.logJourneyTouchpoint(journey.id, {
        stageId: 's1',
        name: 'Ad',
        channel: 'web',
      });

      service.logJourneyTouchpoint(journey.id, {
        stageId: 's2',
        name: 'Checkout',
        channel: 'web',
      });

      expect(journey.stages[0].touchpoints).toHaveLength(1);
      expect(journey.stages[1].touchpoints).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERIENCE DASHBOARD TESTS (5 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('EXPERIENCE DASHBOARDS', () => {
    test('Should create experience dashboard', () => {
      const dashboard = service.createExperienceDashboard({
        name: 'Customer Experience Dashboard',
        createdBy: 'admin',
      });

      expect(dashboard.id).toMatch(/^DASH-/);
      expect(dashboard.name).toBe('Customer Experience Dashboard');
      expect(dashboard.status).toBe('active');
      expect(dashboard.widgets).toHaveLength(5); // Auto-generated widgets
    });

    test('Should throw error for missing dashboard name', () => {
      expect(() => {
        service.createExperienceDashboard({
          // missing name
        });
      }).toThrow('Missing required field: name');
    });

    test('Should generate dashboard with auto-widgets', () => {
      const dashboard = service.createExperienceDashboard({
        name: 'Test Dashboard',
      });

      const widgetTypes = dashboard.widgets.map(w => w.type);
      expect(widgetTypes).toContain('nps-gauge');
      expect(widgetTypes).toContain('feedback-summary');
      expect(widgetTypes).toContain('complaint-status');
    });

    test('Should get dashboard data with populated widgets', () => {
      service.recordNPSScore({ customerId: 'c1', score: 10 });
      service.submitFeedback({ customerId: 'c2', content: 'Good', rating: 5 });
      service.registerComplaint({
        customerId: 'c3',
        description: 'Issue',
        severity: 'high',
      });

      const dashboard = service.createExperienceDashboard({ name: 'Test' });
      const dashboardData = service.getExperienceDashboardData(dashboard.id);

      expect(dashboardData.widgets).toHaveLength(4);
      expect(dashboardData.summary.totalNPS).toBeDefined();
      expect(dashboardData.summary.totalFeedback).toBeGreaterThan(0);
      expect(dashboardData.summary.openComplaints).toBeGreaterThan(0);
    });

    test('Should calculate summary metrics on dashboard', () => {
      service.recordNPSScore({ customerId: 'c1', score: 10 });
      service.submitFeedback({ customerId: 'c2', content: 'Excellent', rating: 5 });

      const dashboard = service.createExperienceDashboard({ name: 'Test' });
      const data = service.getExperienceDashboardData(dashboard.id);

      expect(data.summary.totalNPS).toBe('100.00');
      expect(data.summary.averageSatisfaction).toBe('5.00');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT ANALYSIS TESTS (4 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SENTIMENT ANALYSIS', () => {
    test('Should analyze positive sentiment', () => {
      const analysis = service.analyzeSentiment('I love this product, it is amazing and perfect!');

      expect(analysis.id).toMatch(/^SENT-/);
      expect(analysis.sentiment).toBe('positive');
      expect(parseInt(analysis.score)).toBeGreaterThan(0);
    });

    test('Should analyze negative sentiment', () => {
      const analysis = service.analyzeSentiment(
        'This is terrible and awful, very disappointed with the service'
      );

      expect(analysis.sentiment).toBe('negative');
      expect(parseInt(analysis.score)).toBeLessThan(0);
    });

    test('Should extract keywords from text', () => {
      const analysis = service.analyzeSentiment(
        'The product quality and delivery speed are excellent'
      );

      expect(analysis.keywords).toHaveLength(5);
      expect(analysis.keywords.includes('product')).toBeTruthy();
    });

    test('Should identify emotional drivers', () => {
      const analysis = service.analyzeSentiment(
        'I love this amazing product and feel very secure using it'
      );

      expect(analysis.emotionalDrivers.includes('joy')).toBeTruthy();
      expect(analysis.emotionalDrivers.includes('trust')).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION TESTS (7 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INTEGRATION TESTS', () => {
    test('Should complete end-to-end customer experience workflow', () => {
      // Customer takes survey
      const survey = service.createSurvey({
        title: 'Post-Purchase Survey',
        questions: [{ id: 'q1' }],
        targetAudience: ['cust1'],
      });

      service.submitSurveyResponse(survey.id, {
        customerId: 'cust1',
        answers: [{ questionId: 'q1', value: 'Excellent' }],
      });

      // Customer provides NPS
      const nps = service.recordNPSScore({
        customerId: 'cust1',
        score: 9,
        feedback: 'Really satisfied',
      });

      // Check dashboard
      const dashboard = service.createExperienceDashboard({ name: 'CX Dashboard' });
      const data = service.getExperienceDashboardData(dashboard.id);

      expect(data.summary.totalNPS).toBe('100.00');
      expect(nps.category).toBe('promoter');
    });

    test('Should handle complaint and feedback together', () => {
      // Complaint logged
      const complaint = service.registerComplaint({
        customerId: 'c1',
        description: 'Product issue',
        severity: 'high',
      });

      // But customer gives positive feedback
      const feedback = service.submitFeedback({
        customerId: 'c1',
        content: 'Support team resolved quickly',
        rating: 5,
      });

      const analytics = service.getFeedbackAnalytics({});
      const complaintAnalytics = service.getComplaintAnalytics({});

      expect(analytics.totalFeedback).toBe(1);
      expect(complaintAnalytics.total).toBe(1);
    });

    test('Should track customer journey through experience', () => {
      const journey = service.createJourneyMap({
        name: 'Purchase Flow',
        customerId: 'c1',
        stages: [
          { id: 'awareness', name: 'Awareness' },
          { id: 'decision', name: 'Decision' },
        ],
      });

      service.logJourneyTouchpoint(journey.id, {
        stageId: 'awareness',
        name: 'Website',
        channel: 'web',
        sentiment: 'neutral',
      });

      service.logJourneyTouchpoint(journey.id, {
        stageId: 'decision',
        name: 'Chat Support',
        channel: 'chat',
        sentiment: 'positive',
      });

      expect(journey.stages[0].touchpoints).toHaveLength(1);
      expect(journey.stages[1].touchpoints[0].sentiment).toBe('positive');
    });

    test('Should aggregate metrics for comprehensive view', () => {
      // Record multiple NPS scores
      service.recordNPSScore({ customerId: 'c1', score: 10 });
      service.recordNPSScore({ customerId: 'c2', score: 8 });
      service.recordNPSScore({ customerId: 'c3', score: 6 });

      // Record feedback
      service.submitFeedback({ customerId: 'c1', content: 'Great', rating: 5 });
      service.submitFeedback({ customerId: 'c2', content: 'Good', rating: 4 });

      // Record complaint
      service.registerComplaint({
        customerId: 'c3',
        description: 'Issue',
        severity: 'medium',
      });

      const dashboard = service.createExperienceDashboard({ name: 'Analytics' });
      const data = service.getExperienceDashboardData(dashboard.id);

      expect(data.summary.totalNPS).toBeDefined();
      expect(data.summary.totalFeedback).toBe(2);
      expect(data.summary.openComplaints).toBe(1);
    });

    test('Should maintain data isolation across customers', () => {
      // Customer 1 data
      service.createSurvey({
        title: 'Survey C1',
        questions: [{ id: 'q1' }],
        targetAudience: ['c1'],
      });

      service.recordNPSScore({ customerId: 'c1', score: 9 });
      service.submitFeedback({ customerId: 'c1', content: 'Feedback C1' });

      // Customer 2 data
      service.createSurvey({
        title: 'Survey C2',
        questions: [{ id: 'q2' }],
        targetAudience: ['c2'],
      });

      service.recordNPSScore({ customerId: 'c2', score: 5 });
      service.submitFeedback({ customerId: 'c2', content: 'Feedback C2' });

      // Verify isolation
      expect(service.surveys).toHaveLength(2);
      expect(service.npsScores).toHaveLength(2);
      expect(service.feedback).toHaveLength(2);
    });

    test('Should support concurrent entries without data loss', () => {
      const startTime = Date.now();

      // Simulate near-concurrent submissions
      for (let i = 0; i < 10; i++) {
        service.recordNPSScore({ customerId: `c${i}`, score: Math.floor(Math.random() * 11) });
        service.submitFeedback({
          customerId: `c${i}`,
          content: `Feedback ${i}`,
        });
        service.registerComplaint({
          customerId: `c${i}`,
          description: `Issue ${i}`,
          severity: 'low',
        });
      }

      const endTime = Date.now();

      expect(service.npsScores).toHaveLength(10);
      expect(service.feedback).toHaveLength(10);
      expect(service.complaints).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA VALIDATION TESTS (3 tests)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DATA VALIDATION & ISOLATION', () => {
    test('Should validate required fields on all operations', () => {
      // Feedback validation
      expect(() => {
        service.submitFeedback({ customerId: 'c1' });
      }).toThrow();

      // NPS validation
      expect(() => {
        service.recordNPSScore({ score: 5 });
      }).toThrow();

      // Complaint validation
      expect(() => {
        service.registerComplaint({ customerId: 'c1', description: 'Issue' });
      }).toThrow();
    });

    test('Should prevent cross-contamination of data', () => {
      const survey1 = service.createSurvey({
        title: 'S1',
        questions: [{ id: 'q1' }],
        targetAudience: ['c1'],
      });

      const survey2 = service.createSurvey({
        title: 'S2',
        questions: [{ id: 'q2' }],
        targetAudience: ['c2'],
      });

      service.submitSurveyResponse(survey1.id, {
        customerId: 'c1',
        answers: [{ questionId: 'q1', value: 'A' }],
      });

      // Survey 2 should not have response from Survey 1
      expect(survey2.responses).toHaveLength(0);
    });

    test('Should isolate experience by dimension', () => {
      service.trackExperienceMetric({
        name: 'Feature Score',
        value: 4.5,
        dimension: 'feature',
      });

      service.trackExperienceMetric({
        name: 'Channel Score',
        value: 3.8,
        dimension: 'channel',
      });

      const featureMetrics = service.getExperienceMetricsByDimension('feature');
      const channelMetrics = service.getExperienceMetricsByDimension('channel');

      expect(featureMetrics.metrics).toHaveLength(1);
      expect(channelMetrics.metrics).toHaveLength(1);
      expect(featureMetrics.metrics[0].dimension).toBe('feature');
      expect(channelMetrics.metrics[0].dimension).toBe('channel');
    });
  });
});
