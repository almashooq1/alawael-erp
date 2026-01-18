/**
 * PHASE 115: Smart CRM & Patient Engagement Unit
 * Manages patient relationships, engagement scores, and automated communication campaigns.
 */

class SmartCRMService {
  constructor() {
    console.log('System: Smart CRM & Engagement Unit - Initialized');
    this.patients = new Map();
    this.interactions = new Map();
    this.campaigns = new Map();

    this._seedData();
  }

  // --- Patient CRM ---

  getPatientProfile(id) {
    return this.patients.get(id) || null;
  }

  getAllPatients() {
    return Array.from(this.patients.values());
  }

  updateEngagementScore(patientId, points, activity) {
    const patient = this.patients.get(patientId);
    if (!patient) throw new Error('Patient not found');

    patient.engagementScore += points;
    patient.lastInteraction = new Date();

    // Log Interaction
    this.logInteraction(patientId, 'ENGAGEMENT_UPDATE', `Gained ${points} for ${activity}`);

    // Check for VIP upgrade
    if (patient.engagementScore > 1000 && patient.segment !== 'VIP') {
      patient.segment = 'VIP';
      this.logInteraction(patientId, 'SEGMENT_CHANGE', 'Upgraded to VIP status');
    }

    return patient;
  }

  logInteraction(patientId, type, notes) {
    const id = `INT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const interaction = {
      id,
      patientId,
      type, // CALL, VISIT, APP_USAGE, FEEDBACK
      notes,
      date: new Date(),
    };
    this.interactions.set(id, interaction);

    // Add to patient history
    const p = this.patients.get(patientId);
    if (p) p.history.push(interaction);

    return interaction;
  }

  // --- Campaigns ---

  createCampaign(name, targetSegment, messageTemplate) {
    const id = `CMP-${Math.floor(Math.random() * 1000)}`;
    const campaign = {
      id,
      name,
      targetSegment, // NEW, VIP, AT_RISK
      messageTemplate,
      status: 'ACTIVE',
      sentCount: 0,
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  getAllCampaigns() {
    return Array.from(this.campaigns.values());
  }

  runCampaign(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    // Find targets
    const targets = Array.from(this.patients.values()).filter(p => p.segment === campaign.targetSegment);

    // Simulate Sending
    targets.forEach(p => {
      this.logInteraction(p.id, 'CAMPAIGN_SENT', `Received: ${campaign.name}`);
    });

    campaign.sentCount = targets.length;
    campaign.lastRun = new Date();
    return { ...campaign, targets: targets.length };
  }

  // --- Helpers ---

  _seedData() {
    this.patients.set('PT-1001', {
      id: 'PT-1001',
      name: 'Khalid Al-Saud',
      segment: 'NEW',
      engagementScore: 50,
      email: 'khalid@example.com',
      history: [],
    });
    this.patients.set('PT-1002', {
      id: 'PT-1002',
      name: 'Noura Ahmed',
      segment: 'VIP',
      engagementScore: 1200,
      email: 'noura@example.com',
      history: [],
    });
    this.patients.set('PT-1003', {
      id: 'PT-1003',
      name: 'Fahad test',
      segment: 'AT_RISK', // Low engagement
      engagementScore: 10,
      email: 'fahad@example.com',
      history: [],
    });

    this.createCampaign('Welcome Series', 'NEW', 'Welcome to ScaleHealth! Complete your profile.');
    this.createCampaign('VIP Exclusive', 'VIP', 'Special discount on Neuro-Feedback sessions.');
    this.createCampaign('We Miss You', 'AT_RISK', 'Come back for a free checkup.');
  }
}

module.exports = SmartCRMService;
module.exports.instance = new SmartCRMService();
