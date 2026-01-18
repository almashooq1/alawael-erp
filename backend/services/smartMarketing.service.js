class SmartMarketingService {
  /**
   * Lead Scoring Engine
   * Predicts likelihood of a lead converting to a paid patient (0-100)
   */
  async scoreLead(lead) {
    let score = 0;
    const factors = [];

    // 1. Completeness
    if (lead.phone && lead.email) score += 10;
    if (lead.childDiagnosis) score += 20;

    // 2. Source Quality
    const highIntentSources = ['REFERRAL', 'WEBSITE_BOOKING', 'DOCTOR_REFERRAL'];
    if (highIntentSources.includes(lead.source)) {
      score += 30;
      factors.push('High Intent Channel');
    } else if (lead.source === 'FACEBOOK_ADS') {
      score += 10; // Lower intent typically
    }

    // 3. Engagement
    // Mock: lead.interactions (calls answered, emails opened)
    const interactions = lead.interactions || 0;
    if (interactions > 2) {
      score += 25;
      factors.push('Engaged with Reception');
    }

    // 4. Urgency
    if (lead.note && (lead.note.includes('urgent') || lead.note.includes('asap'))) {
      score += 15;
      factors.push('Urgency Detected');
    }

    // Cap at 100
    score = Math.min(score, 100);

    let segment = 'COLD';
    if (score > 80) segment = 'HOT';
    else if (score > 50) segment = 'WARM';

    return { score, segment, factors };
  }

  /**
   * Campaign ROI Calculator
   * Analyzes Marketing Spend vs Actual Revenue Generated
   */
  async calculateROI(campaignId, spendAmount) {
    // Mock finding patients attributed to this campaign
    // const patients = await Patient.find({ admissionSource: campaignId });

    // Mock data
    const attributedPatients = 12; // 12 patients came from "Summer Promo"
    const totalLifetimeRevenue = 45000; // Total revenue from these 12 patients

    const costPerAcquisition = spendAmount / attributedPatients; // e.g. 5000 / 12 = 416
    const roi = ((totalLifetimeRevenue - spendAmount) / spendAmount) * 100;

    return {
      campaignId,
      metrics: {
        spend: spendAmount,
        conversions: attributedPatients,
        generatedRevenue: totalLifetimeRevenue,
        costPerAcquisition: costPerAcquisition.toFixed(0),
        roiPercent: roi.toFixed(1) + '%',
      },
      status: roi > 0 ? 'PROFITABLE' : 'LOSS',
    };
  }
}

module.exports = SmartMarketingService;
module.exports.instance = new SmartMarketingService();
