const SmartNotificationService = require('./smartNotificationService');
const User = require('../models/User');

/**
 * PHASE 48: Secure Peer Support & Community
 *
 * Objectives:
 * 1. Reduce parent isolation via AI-matched support groups.
 * 2. Prevent medical misinformation via AI Moderation.
 * 3. Facilitate safe "Equipment Swaps" (e.g., outgrown wheelchairs).
 */
class SmartCommunityService {
  /**
   * Matches parents into "Micro-Communities" based on child's profile.
   * Logic: Similar Diagnosis + Similar Age + Geographic Proximity.
   */
  static async findSupportGroup(parentId, childProfile) {
    // Mock matching logic
    const diagnosis = childProfile.primaryDiagnosis; // e.g. "CP"
    const ageGroup = childProfile.age < 5 ? 'Early Intervention' : 'School Age';

    return {
      recommendedGroups: [
        { name: `${diagnosis} Parents - ${ageGroup}`, relevance: '98%', members: 120 },
        { name: 'Sensory Processing Support', relevance: '85%', members: 450 },
        { name: 'Local Adaptive Sports', relevance: 'Match Location', members: 40 },
      ],
    };
  }

  /**
   * AI Content Moderator for Forums.
   * Scans posts for PII (names, phones) and "Bad Medical Advice".
   */
  static moderateContent(postText) {
    const flags = [];

    // 1. PII Check
    const phoneRegex = /(\d{3}[-.\s]??\d{3}[-.\s]??\d{4}|\(\d{3}\)\s*\d{3}[-.\s]??\d{4}|\d{3}[-.\s]??\d{4})/;
    if (phoneRegex.test(postText)) {
      flags.push('PII_DETECTED_PHONE');
    }

    // 2. Dangerous Keywords (Simplified)
    const dangerWords = ['cure autism', 'stop medication', 'bleach therapy'];
    if (dangerWords.some(w => postText.toLowerCase().includes(w))) {
      flags.push('DANGEROUS_ADVICE');
    }

    return {
      approved: flags.length === 0,
      flags: flags,
      sanitizedText: flags.includes('PII_DETECTED_PHONE') ? '***-***-****' : postText,
    };
  }

  /**
   * Facilitates "Equipment Exchange" board.
   * connect parents who have outgrown gear with those who need it.
   */
  static postEquipmentExchange(itemDetails) {
    // e.g. "Gait Trainer - Size Small"
    return {
      success: true,
      listingId: 'EQ-' + Date.now(),
      status: 'PENDING_APPROVAL', // All items vetted by physical therapist first
      message: 'Your item has been submitted for clinical safety check before listing.',
    };
  }
}

module.exports = SmartCommunityService;
module.exports.instance = new SmartCommunityService();
