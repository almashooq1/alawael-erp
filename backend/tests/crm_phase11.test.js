const SmartCRMServiceClass = require('../services/smartCRM.service');
const SmartMarketingServiceClass = require('../services/smartMarketing.service');

// Create instances
const SmartCRMService = new SmartCRMServiceClass();
const SmartMarketingService = new SmartMarketingServiceClass();

describe('Phase 11: Smart CRM & Marketing Automation', () => {
  test('Initialization Check', () => {
    expect(SmartCRMService).toBeDefined();
    expect(SmartMarketingService).toBeDefined();
  });

  // --- CRM SERVICE TESTS ---
  describe('SmartCRMService (Customer Relationship Management)', () => {
    test('should retrieve seeded patient profiles', () => {
      const patients = SmartCRMService.getAllPatients();
      expect(patients.length).toBeGreaterThanOrEqual(1);
    });

    test('should update engagement score and log interaction', () => {
      // Pick the first patient
      const patients = SmartCRMService.getAllPatients();
      const p = patients[0];
      const initialScore = p.engagementScore || 0;
      const points = 50;

      const updatedProfile = SmartCRMService.updateEngagementScore(p.id, points, 'Attended Workshop');

      expect(updatedProfile.engagementScore).toBe(initialScore + points);
      expect(updatedProfile.history.length).toBeGreaterThan(0);
    });

    test('should create and run a marketing campaign', () => {
      const campaignName = 'Test Campaign 11';
      const campaign = SmartCRMService.createCampaign(campaignName, 'VIP', 'Hello VIPs');

      expect(campaign.id).toBeDefined();
      const result = SmartCRMService.runCampaign(campaign.id);
      expect(result.targets).toBeGreaterThanOrEqual(0);
    });
  });

  // --- MARKETING SERVICE TESTS ---
  describe('SmartMarketingService', () => {
    test('should score a lead', async () => {
      const hotLead = {
        phone: '05000000',
        email: 'test@test.com',
        source: 'DOCTOR_REFERRAL',
        childDiagnosis: 'ASD',
      };

      const result = await SmartMarketingService.scoreLead(hotLead);
      expect(result.score).toBeGreaterThan(0);
    });
  });
});
