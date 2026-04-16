/**
 * Unit Tests — SmartCRMService
 * P#69 - Batch 30
 *
 * Class + instance export. Pure in-memory Maps + logger.
 * Covers: getPatientProfile, getAllPatients, updateEngagementScore,
 *         logInteraction, createCampaign, getAllCampaigns, runCampaign,
 *         _seedData (via constructor)
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartCRMService = require('../../services/smartCRM.service');

describe('SmartCRMService', () => {
  let svc;

  beforeEach(() => {
    svc = new SmartCRMService();
  });

  /* ------------------------------------------------------------------ */
  /*  Seed Data / Initial State                                          */
  /* ------------------------------------------------------------------ */
  describe('initial state (seeded)', () => {
    it('seeds 3 patients', () => {
      expect(svc.patients.size).toBe(3);
    });

    it('seeds PT-1001 as NEW', () => {
      const p = svc.patients.get('PT-1001');
      expect(p.segment).toBe('NEW');
      expect(p.engagementScore).toBe(50);
    });

    it('seeds PT-1002 as VIP', () => {
      const p = svc.patients.get('PT-1002');
      expect(p.segment).toBe('VIP');
      expect(p.engagementScore).toBe(1200);
    });

    it('seeds PT-1003 as AT_RISK', () => {
      const p = svc.patients.get('PT-1003');
      expect(p.segment).toBe('AT_RISK');
      expect(p.engagementScore).toBe(10);
    });

    it('seeds 3 campaigns', () => {
      expect(svc.campaigns.size).toBe(3);
    });

    it('has interactions map', () => {
      expect(svc.interactions).toBeInstanceOf(Map);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getPatientProfile                                                   */
  /* ------------------------------------------------------------------ */
  describe('getPatientProfile', () => {
    it('returns patient by id', () => {
      const p = svc.getPatientProfile('PT-1001');
      expect(p.name).toBe('Khalid Al-Saud');
    });

    it('returns null for unknown id', () => {
      expect(svc.getPatientProfile('PT-9999')).toBeNull();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getAllPatients                                                       */
  /* ------------------------------------------------------------------ */
  describe('getAllPatients', () => {
    it('returns all 3 seeded patients', () => {
      expect(svc.getAllPatients()).toHaveLength(3);
    });

    it('returns array type', () => {
      expect(Array.isArray(svc.getAllPatients())).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  updateEngagementScore                                               */
  /* ------------------------------------------------------------------ */
  describe('updateEngagementScore', () => {
    it('adds points to patient', () => {
      const p = svc.updateEngagementScore('PT-1001', 100, 'test');
      expect(p.engagementScore).toBe(150); // 50 + 100
    });

    it('updates lastInteraction', () => {
      const p = svc.updateEngagementScore('PT-1001', 10, 'visit');
      expect(p.lastInteraction).toBeInstanceOf(Date);
    });

    it('logs an ENGAGEMENT_UPDATE interaction', () => {
      svc.updateEngagementScore('PT-1001', 10, 'app');
      expect(svc.interactions.size).toBeGreaterThan(0);
      const ints = Array.from(svc.interactions.values());
      const eng = ints.find(i => i.type === 'ENGAGEMENT_UPDATE');
      expect(eng).toBeDefined();
      expect(eng.notes).toContain('10');
      expect(eng.notes).toContain('app');
    });

    it('upgrades to VIP when score > 1000', () => {
      const p = svc.updateEngagementScore('PT-1001', 1000, 'bonus');
      // 50 + 1000 = 1050 > 1000
      expect(p.segment).toBe('VIP');
    });

    it('logs SEGMENT_CHANGE on VIP upgrade', () => {
      svc.updateEngagementScore('PT-1001', 1000, 'bonus');
      const ints = Array.from(svc.interactions.values());
      expect(ints.some(i => i.type === 'SEGMENT_CHANGE')).toBe(true);
    });

    it('does NOT upgrade if already VIP', () => {
      const p = svc.updateEngagementScore('PT-1002', 100, 'extra');
      expect(p.segment).toBe('VIP');
      // Should not log duplicate SEGMENT_CHANGE
      const changes = Array.from(svc.interactions.values()).filter(
        i => i.type === 'SEGMENT_CHANGE'
      );
      expect(changes).toHaveLength(0);
    });

    it('throws for unknown patient', () => {
      expect(() => svc.updateEngagementScore('PT-XYZ', 10, 'x')).toThrow('Patient not found');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  logInteraction                                                      */
  /* ------------------------------------------------------------------ */
  describe('logInteraction', () => {
    it('stores interaction with unique id', () => {
      const int = svc.logInteraction('PT-1001', 'CALL', 'Follow-up call');
      expect(int.id).toMatch(/^INT-/);
      expect(int.patientId).toBe('PT-1001');
      expect(int.type).toBe('CALL');
      expect(int.notes).toBe('Follow-up call');
      expect(int.date).toBeInstanceOf(Date);
    });

    it('stores in interactions map', () => {
      const int = svc.logInteraction('PT-1001', 'VISIT', 'Checkup');
      expect(svc.interactions.has(int.id)).toBe(true);
    });

    it('appends to patient history', () => {
      const before = svc.patients.get('PT-1001').history.length;
      svc.logInteraction('PT-1001', 'APP_USAGE', 'Used app');
      expect(svc.patients.get('PT-1001').history.length).toBe(before + 1);
    });

    it('handles unknown patient gracefully (no crash)', () => {
      const int = svc.logInteraction('PT-NONE', 'CALL', 'test');
      expect(int.id).toBeDefined();
      // Patient not found, so history not updated, but no error
    });
  });

  /* ------------------------------------------------------------------ */
  /*  createCampaign                                                      */
  /* ------------------------------------------------------------------ */
  describe('createCampaign', () => {
    it('creates campaign with id/name/target/template/status/sentCount', () => {
      const c = svc.createCampaign('Test', 'NEW', 'Hello {{name}}');
      expect(c.id).toMatch(/^CMP-/);
      expect(c.name).toBe('Test');
      expect(c.targetSegment).toBe('NEW');
      expect(c.messageTemplate).toBe('Hello {{name}}');
      expect(c.status).toBe('ACTIVE');
      expect(c.sentCount).toBe(0);
    });

    it('stores in campaigns map', () => {
      const c = svc.createCampaign('C2', 'VIP', 'msg');
      expect(svc.campaigns.has(c.id)).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getAllCampaigns                                                      */
  /* ------------------------------------------------------------------ */
  describe('getAllCampaigns', () => {
    it('returns all seeded + new campaigns', () => {
      svc.createCampaign('Extra', 'NEW', 'x');
      expect(svc.getAllCampaigns()).toHaveLength(4); // 3 seed + 1 new
    });

    it('returns array type', () => {
      expect(Array.isArray(svc.getAllCampaigns())).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  runCampaign                                                         */
  /* ------------------------------------------------------------------ */
  describe('runCampaign', () => {
    it('sends to patients matching targetSegment', () => {
      const campaigns = svc.getAllCampaigns();
      // Find the 'NEW' campaign
      const newCmp = campaigns.find(c => c.targetSegment === 'NEW');
      const res = svc.runCampaign(newCmp.id);
      expect(res.targets).toBe(1); // PT-1001 is NEW
      expect(res.sentCount).toBe(1);
    });

    it('logs CAMPAIGN_SENT interactions', () => {
      const campaigns = svc.getAllCampaigns();
      const vipCmp = campaigns.find(c => c.targetSegment === 'VIP');
      const initialInteractions = svc.interactions.size;
      svc.runCampaign(vipCmp.id);
      // PT-1002 is VIP → 1 interaction
      expect(svc.interactions.size).toBe(initialInteractions + 1);
    });

    it('sets lastRun date', () => {
      const campaigns = svc.getAllCampaigns();
      const cmp = campaigns[0];
      svc.runCampaign(cmp.id);
      const updated = svc.campaigns.get(cmp.id);
      expect(updated.lastRun).toBeInstanceOf(Date);
    });

    it('throws for unknown campaign', () => {
      expect(() => svc.runCampaign('CMP-FAKE')).toThrow('Campaign not found');
    });

    it('returns 0 targets when no patients match segment', () => {
      const c = svc.createCampaign('Empty', 'NONEXISTENT', 'msg');
      const res = svc.runCampaign(c.id);
      expect(res.targets).toBe(0);
    });
  });
});
