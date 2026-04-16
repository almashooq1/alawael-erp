/**
 * Unit Tests — SmartMarketingService
 * P#70 - Batch 31
 *
 * Class + instance export. Pure async (no mongoose).
 * Covers: scoreLead (scoring logic + segmentation), calculateROI
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartMarketingService = require('../../services/smartMarketing.service');

describe('SmartMarketingService', () => {
  let svc;

  beforeEach(() => {
    svc = new SmartMarketingService();
  });

  /* ------------------------------------------------------------------ */
  /*  scoreLead                                                           */
  /* ------------------------------------------------------------------ */
  describe('scoreLead', () => {
    it('returns score, segment, factors', async () => {
      const res = await svc.scoreLead({ phone: '05x', email: 'a@b.com' });
      expect(typeof res.score).toBe('number');
      expect(typeof res.segment).toBe('string');
      expect(Array.isArray(res.factors)).toBe(true);
    });

    it('+10 for phone and email', async () => {
      const res = await svc.scoreLead({ phone: '05x', email: 'a@b.com' });
      expect(res.score).toBe(10);
      expect(res.factors).toEqual([]);
    });

    it('+20 for childDiagnosis', async () => {
      const res = await svc.scoreLead({ childDiagnosis: 'Autism' });
      expect(res.score).toBe(20);
      expect(res.factors).toEqual([]);
    });

    it('+30 for REFERRAL source', async () => {
      const res = await svc.scoreLead({ source: 'REFERRAL' });
      expect(res.score).toBe(30);
      expect(res.factors).toContain('High Intent Channel');
    });

    it('+30 for WEBSITE_BOOKING source', async () => {
      const res = await svc.scoreLead({ source: 'WEBSITE_BOOKING' });
      expect(res.score).toBe(30);
    });

    it('+30 for DOCTOR_REFERRAL source', async () => {
      const res = await svc.scoreLead({ source: 'DOCTOR_REFERRAL' });
      expect(res.score).toBe(30);
    });

    it('+10 for FACEBOOK_ADS source', async () => {
      const res = await svc.scoreLead({ source: 'FACEBOOK_ADS' });
      expect(res.score).toBe(10);
      expect(res.factors).toEqual([]);
    });

    it('+25 for interactions > 2', async () => {
      const res = await svc.scoreLead({ interactions: 5 });
      expect(res.score).toBe(25);
      expect(res.factors).toContain('Engaged with Reception');
    });

    it('no engagement bonus for interactions <= 2', async () => {
      const res = await svc.scoreLead({ interactions: 2 });
      expect(res.score).toBe(0);
    });

    it('+15 for note containing "urgent"', async () => {
      const res = await svc.scoreLead({ note: 'This is urgent' });
      expect(res.score).toBe(15);
      expect(res.factors).toContain('Urgency Detected');
    });

    it('+15 for note containing "asap"', async () => {
      const res = await svc.scoreLead({ note: 'Need appointment asap' });
      expect(res.score).toBe(15);
    });

    it('caps score at 100', async () => {
      const res = await svc.scoreLead({
        phone: '05x',
        email: 'a@b.com',
        childDiagnosis: 'ASD',
        source: 'REFERRAL',
        interactions: 5,
        note: 'urgent case',
      });
      // 10 + 20 + 30 + 25 + 15 = 100
      expect(res.score).toBe(100);
    });

    it('combined score stays ≤ 100 even if factors exceed', async () => {
      // If somehow all factors apply, still capped
      const res = await svc.scoreLead({
        phone: '05x',
        email: 'a@b.com',
        childDiagnosis: 'CP',
        source: 'DOCTOR_REFERRAL',
        interactions: 10,
        note: 'urgent asap',
      });
      expect(res.score).toBeLessThanOrEqual(100);
    });

    it('segment = HOT when score > 80', async () => {
      const res = await svc.scoreLead({
        phone: '05x',
        email: 'a@b.com',
        childDiagnosis: 'ASD',
        source: 'REFERRAL',
        interactions: 5,
      });
      // 10 + 20 + 30 + 25 = 85
      expect(res.segment).toBe('HOT');
    });

    it('segment = WARM when score 51-80', async () => {
      const res = await svc.scoreLead({
        phone: '05x',
        email: 'a@b.com',
        childDiagnosis: 'ASD',
        source: 'FACEBOOK_ADS',
      });
      // 10 + 20 + 10 = 40 → COLD
      // Need >50: use REFERRAL instead
      const res2 = await svc.scoreLead({
        childDiagnosis: 'ASD',
        source: 'REFERRAL',
        interactions: 1,
      });
      // 20 + 30 = 50 → COLD (>50 needed)
      // Add something else
      const res3 = await svc.scoreLead({
        childDiagnosis: 'ASD',
        source: 'REFERRAL',
        note: 'urgent',
      });
      // 20 + 30 + 15 = 65 → WARM
      expect(res3.segment).toBe('WARM');
    });

    it('segment = COLD when score ≤ 50', async () => {
      const res = await svc.scoreLead({ interactions: 1 });
      expect(res.score).toBe(0);
      expect(res.segment).toBe('COLD');
    });

    it('handles empty lead object', async () => {
      const res = await svc.scoreLead({});
      expect(res.score).toBe(0);
      expect(res.segment).toBe('COLD');
      expect(res.factors).toEqual([]);
    });

    it('handles lead with only phone (no email)', async () => {
      const res = await svc.scoreLead({ phone: '05x' });
      // phone exists but no email — check if both needed
      // Source says: if(lead.phone && lead.email) → +10
      expect(res.score).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  calculateROI                                                        */
  /* ------------------------------------------------------------------ */
  describe('calculateROI', () => {
    it('returns campaign metrics', async () => {
      const res = await svc.calculateROI('CMP-001', 10000);
      expect(res.campaignId).toBe('CMP-001');
      expect(res.metrics.spend).toBe(10000);
      expect(res.metrics.conversions).toBe(12);
      expect(res.metrics.generatedRevenue).toBe(45000);
    });

    it('cost per acquisition = spend / conversions', async () => {
      const res = await svc.calculateROI('C1', 12000);
      expect(res.metrics.costPerAcquisition).toBe('1000');
    });

    it('ROI percent calculated correctly', async () => {
      const res = await svc.calculateROI('C1', 10000);
      // (45000 - 10000) / 10000 * 100 = 350.0%
      expect(res.metrics.roiPercent).toBe('350.0%');
    });

    it('status = PROFITABLE when revenue > spend', async () => {
      const res = await svc.calculateROI('C1', 10000);
      expect(res.status).toBe('PROFITABLE');
    });

    it('status = LOSS when spend > revenue', async () => {
      const res = await svc.calculateROI('C1', 100000);
      expect(res.status).toBe('LOSS');
    });

    it('handles small spend', async () => {
      const res = await svc.calculateROI('C1', 1);
      expect(res.status).toBe('PROFITABLE');
      expect(parseFloat(res.metrics.roiPercent)).toBeGreaterThan(0);
    });

    it('handles very large spend', async () => {
      const res = await svc.calculateROI('C1', 999999999);
      expect(res.status).toBe('LOSS');
    });
  });
});
