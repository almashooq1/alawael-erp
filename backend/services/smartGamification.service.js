const { Badge, BeneficiaryWallet } = require('../models/Gamification');
const SmartNotificationService = require('./smartNotificationService');

class SmartGamificationService {
  /**
   * Seed Default Badges
   */
  static async seedBadges() {
    const count = await Badge.countDocuments();
    if (count === 0) {
      await Badge.insertMany([
        {
          name: 'First Step',
          description: 'Attended your first session!',
          actionType: 'SESSION_ATTENDANCE',
          threshold: 1,
          pointsValue: 50,
        },
        {
          name: 'Consistency King',
          description: 'Attended 10 sessions.',
          actionType: 'SESSION_ATTENDANCE',
          threshold: 10,
          pointsValue: 200,
        },
        {
          name: 'Homework Hero',
          description: 'Completed 5 Home Exercises.',
          actionType: 'HOMEWORK_SUBMISSION',
          threshold: 5,
          pointsValue: 150,
        },
      ]);
      console.log('Gamification Badges Seeded');
    }
  }

  /**
   * Award Points & Check for Badges
   */
  static async awardAction(beneficiaryId, actionType, points = 10) {
    let wallet = await BeneficiaryWallet.findOne({ beneficiary: beneficiaryId });
    if (!wallet) {
      wallet = new BeneficiaryWallet({ beneficiary: beneficiaryId });
    }

    // Add Points
    wallet.totalPoints += points;
    wallet.history.push({ action: actionType, points: points });

    // Calculate Level (Simple logic: Level = Points / 100)
    const newLevel = Math.floor(wallet.totalPoints / 100) + 1;
    if (newLevel > wallet.currentLevel) {
      // Level Up Event!
      wallet.currentLevel = newLevel;
      // Could trigger a special notification
    }

    // Check for new Badges
    const badges = await Badge.find({ actionType: actionType });

    // Count total occurrences of this action in history
    const actionCount = wallet.history.filter(h => h.action === actionType).length;

    for (const badge of badges) {
      // Check if already earned
      const alreadyEarned = wallet.badges.some(b => b.badgeId.toString() === badge._id.toString());
      if (alreadyEarned) continue;

      if (actionCount >= badge.threshold) {
        // Award Badge
        wallet.badges.push({ badgeId: badge._id });
        wallet.totalPoints += badge.pointsValue; // Bonus points
        wallet.history.push({ action: `Badge Earned: ${badge.name}`, points: badge.pointsValue });

        // Notify
        // Logic to find User from Beneficiary would be needed here, simplified for now
        // await SmartNotificationService.send(...)
      }
    }

    await wallet.save();
    return wallet;
  }
}

module.exports = SmartGamificationService;
module.exports.instance = new SmartGamificationService();
