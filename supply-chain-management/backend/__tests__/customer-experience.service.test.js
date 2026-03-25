/**
 * Customer Experience Service — Unit Tests
 * Covers: Survey CRUD, NPS scoring/segmentation/trends, Feedback, Sentiment
 */

const CustomerExperienceService = require('../services/customer-experience.service');

describe('CustomerExperienceService', () => {
  let svc;

  beforeEach(() => {
    svc = new CustomerExperienceService();
  });

  // ═══════════════════════════════════════════
  // SURVEY MANAGEMENT
  // ═══════════════════════════════════════════

  describe('Survey Management', () => {
    const validSurvey = {
      title: 'Q4 Satisfaction',
      questions: [{ text: 'Rate service', type: 'rating' }],
      targetAudience: ['cust-1', 'cust-2', 'cust-3'],
    };

    test('createSurvey — creates with required fields', () => {
      const survey = svc.createSurvey(validSurvey);
      expect(survey.id).toMatch(/^SRV-/);
      expect(survey.title).toBe('Q4 Satisfaction');
      expect(survey.status).toBe('active');
      expect(survey.responseCount).toBe(0);
    });

    test('createSurvey — throws on missing fields', () => {
      expect(() => svc.createSurvey({ title: 'X' })).toThrow('Missing required fields');
    });

    test('submitSurveyResponse — records response and updates metrics', () => {
      const survey = svc.createSurvey(validSurvey);
      const resp = svc.submitSurveyResponse(survey.id, {
        customerId: 'cust-1',
        answers: [{ questionIndex: 0, value: 5 }],
      });

      expect(resp.id).toMatch(/^RESP-/);
      expect(resp.surveyId).toBe(survey.id);

      // Metrics updated
      const updated = svc.surveys.get(survey.id);
      expect(updated.responseCount).toBe(1);
      expect(Number(updated.completionRate)).toBeGreaterThan(0);
    });

    test('submitSurveyResponse — throws for unknown survey', () => {
      expect(() => svc.submitSurveyResponse('bad-id', { customerId: 'c', answers: [] })).toThrow('Survey not found');
    });

    test('getSurveyResults — returns aggregated results', () => {
      const survey = svc.createSurvey(validSurvey);
      svc.submitSurveyResponse(survey.id, {
        customerId: 'cust-1',
        answers: [{ questionIndex: 0, value: 4 }],
      });
      const results = svc.getSurveyResults(survey.id);
      expect(results).toBeDefined();
      expect(results.surveyId).toBe(survey.id);
      expect(results.responseCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════
  // NPS SCORING
  // ═══════════════════════════════════════════

  describe('NPS Scoring', () => {
    test('recordNPSScore — stores score with correct category', () => {
      const promoter = svc.recordNPSScore({ customerId: 'c1', score: 9, segment: 'enterprise' });
      expect(promoter.category).toBe('promoter');

      const passive = svc.recordNPSScore({ customerId: 'c2', score: 8, segment: 'enterprise' });
      expect(passive.category).toBe('passive');

      const detractor = svc.recordNPSScore({ customerId: 'c3', score: 4, segment: 'enterprise' });
      expect(detractor.category).toBe('detractor');
    });

    test('recordNPSScore — throws on invalid score', () => {
      expect(() => svc.recordNPSScore({ customerId: 'c', score: 'bad' })).toThrow();
    });

    test('recordNPSScore — throws for out-of-range score', () => {
      expect(() => svc.recordNPSScore({ customerId: 'c', score: 15, segment: 'sme' })).toThrow();
      expect(() => svc.recordNPSScore({ customerId: 'c', score: -1, segment: 'sme' })).toThrow();
    });

    test('getNPSBySegment — filters by segment', () => {
      svc.recordNPSScore({ customerId: 'c1', score: 10, segment: 'enterprise' });
      svc.recordNPSScore({ customerId: 'c2', score: 3, segment: 'sme' });
      svc.recordNPSScore({ customerId: 'c3', score: 9, segment: 'enterprise' });

      const result = svc.getNPSBySegment('enterprise');
      expect(result.totalResponses).toBe(2);
      expect(result.segment).toBe('enterprise');
    });

    test('getNPSTrend — returns trend data', () => {
      // Seed a few scores with spread timestamps
      for (let i = 0; i < 5; i++) {
        svc.recordNPSScore({ customerId: `c${i}`, score: 8 + (i % 3), segment: 'all' });
      }
      const trend = svc.getNPSTrend('30d');
      expect(trend).toBeDefined();
      expect(trend.timeframe).toBe('30d');
      expect(Array.isArray(trend.buckets)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // FEEDBACK
  // ═══════════════════════════════════════════

  describe('Feedback', () => {
    test('submitFeedback — stores feedback with sentiment', () => {
      const fb = svc.submitFeedback({
        customerId: 'c1',
        content: 'Great service, very happy!',
        category: 'praise',
      });
      expect(fb.id).toMatch(/^FB-/);
      expect(fb.sentiment).toBeDefined();
    });

    test('submitFeedback — throws on missing fields', () => {
      expect(() => svc.submitFeedback({ content: 'hi' })).toThrow();
    });

    test('respondToFeedback — links response to feedback', () => {
      const fb = svc.submitFeedback({
        customerId: 'c1',
        content: 'Issues with delivery',
        category: 'complaint',
      });
      const resp = svc.respondToFeedback(fb.id, {
        respondedBy: 'agent-1',
        message: 'We are looking into this',
      });
      expect(resp).toBeDefined();
    });

    test('getFeedbackAnalytics — returns analytics summary', () => {
      const past = new Date(Date.now() - 86400000);
      const future = new Date(Date.now() + 86400000);
      svc.submitFeedback({
        customerId: 'c1',
        content: 'Excellent!',
        category: 'praise',
      });
      svc.submitFeedback({
        customerId: 'c2',
        content: 'Terrible experience',
        category: 'complaint',
      });
      const analytics = svc.getFeedbackAnalytics(past, future);
      expect(analytics).toBeDefined();
      expect(analytics.totalFeedback).toBe(2);
    });
  });

  // ═══════════════════════════════════════════
  // SENTIMENT ANALYSIS (private helpers)
  // ═══════════════════════════════════════════

  describe('Sentiment Analysis', () => {
    test('_analyzeSentiment — positive text', () => {
      const s = svc._analyzeSentiment('great excellent happy wonderful');
      expect(s).toBe('positive');
    });

    test('_analyzeSentiment — negative text', () => {
      const s = svc._analyzeSentiment('terrible awful bad horrible');
      expect(s).toBe('negative');
    });

    test('_analyzeSentiment — neutral text', () => {
      const s = svc._analyzeSentiment('the order was delivered today');
      expect(s).toBe('neutral');
    });
  });
});
