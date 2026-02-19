/**
 * AchievementService.js - Beneficiary Achievement & Recognition Service
 * Handles achievement recognition, certifications, and skill development tracking
 *
 * @module services/AchievementService
 * @requires mongoose
 */

const EventEmitter = require('events');

class AchievementService extends EventEmitter {
  /**
   * Initialize AchievementService
   * @param {Object} db - Database connection
   */
  constructor(db) {
    super();
    this.db = db;
    this.achievementCollection = 'achievements';
    this.skillsCollection = 'skillsDevelopment';
    this.activitiesCollection = 'studentActivities';
  }

  /**
   * Record an achievement/certification
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} achievementData - Achievement details
   * @param {string} achievementData.title - Achievement title
   * @param {string} achievementData.description - Description
   * @param {string} achievementData.type - Type: 'academic', 'certification', 'award', 'special'
   * @param {Date} achievementData.achievedDate - Date achieved
   * @param {string} achievementData.issuer - Issuing organization
   * @param {string} achievementData.certificateNumber - Certificate number
   * @returns {Promise<Object>} Achievement record
   */
  async recordAchievement(beneficiaryId, achievementData) {
    try {
      if (!beneficiaryId || !achievementData) {
        throw new Error('beneficiaryId and achievementData are required');
      }

      const validTypes = ['academic', 'certification', 'award', 'special'];
      if (!validTypes.includes(achievementData.type)) {
        throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Create achievement record
      const achievement = {
        beneficiaryId,
        title: achievementData.title,
        description: achievementData.description,
        type: achievementData.type,
        achievedDate: new Date(achievementData.achievedDate),
        issuer: achievementData.issuer,
        certificateNumber: achievementData.certificateNumber || null,
        points: this.calculateAchievementPoints(achievementData.type),
        status: 'VERIFIED', // PENDING, VERIFIED, ARCHIVED
        recordedBy: achievementData.recordedBy || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        auditLog: [{
          action: 'ACHIEVEMENT_RECORDED',
          user: achievementData.recordedBy || 'system',
          timestamp: new Date()
        }]
      };

      // Save
      const saved = await this.db.collection(this.achievementCollection).insertOne(achievement);

      // Update beneficiary points
      await this.updateBeneficiaryPoints(beneficiaryId, achievement.points, 'add');

      this.emit('achievement:recorded', {
        beneficiaryId,
        title: achievementData.title,
        type: achievementData.type,
        points: achievement.points
      });

      return {
        status: 'success',
        message: 'Achievement recorded successfully',
        data: {
          achievementId: saved.insertedId,
          title: achievementData.title,
          points: achievement.points,
          type: achievementData.type
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Track skills development
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} skillData - Skill data
   * @param {string} skillData.skillName - Skill name
   * @param {number} skillData.level - Level 1-5
   * @param {string} skillData.category - Category: 'technical', 'soft', 'academic', 'behavioral'
   * @param {string} skillData.evidence - Evidence of skill
   * @returns {Promise<Object>} Skill record
   */
  async trackSkillsDevelopment(beneficiaryId, skillData) {
    try {
      if (!beneficiaryId || !skillData) {
        throw new Error('beneficiaryId and skillData are required');
      }

      if (skillData.level < 1 || skillData.level > 5) {
        throw new Error('Skill level must be between 1 and 5');
      }

      // Check existing skill
      const existing = await this.db.collection(this.skillsCollection)
        .findOne({
          beneficiaryId,
          skillName: skillData.skillName
        });

      if (existing) {
        // Update existing skill
        const newLevel = Math.max(existing.level, skillData.level);

        await this.db.collection(this.skillsCollection).updateOne(
          { _id: existing._id },
          {
            $set: {
              level: newLevel,
              updatedAt: new Date()
            },
            $push: {
              levelHistory: {
                level: skillData.level,
                date: new Date(),
                evidence: skillData.evidence
              }
            }
          }
        );

        return {
          status: 'success',
          message: 'Skill updated successfully',
          data: {
            skillName: skillData.skillName,
            newLevel
          },
          timestamp: new Date()
        };
      }

      // Create new skill record
      const skill = {
        beneficiaryId,
        skillName: skillData.skillName,
        level: skillData.level,
        category: skillData.category,
        evidence: skillData.evidence,
        levelHistory: [{
          level: skillData.level,
          date: new Date(),
          evidence: skillData.evidence
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.db.collection(this.skillsCollection).insertOne(skill);

      this.emit('skill:tracked', {
        beneficiaryId,
        skillName: skillData.skillName,
        level: skillData.level
      });

      return {
        status: 'success',
        message: 'Skill recorded successfully',
        data: {
          skillId: saved.insertedId,
          skillName: skillData.skillName,
          level: skillData.level,
          category: skillData.category
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Track student involvement in activities/clubs
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} activityData - Activity data
   * @param {string} activityData.activityName - Activity name
   * @param {string} activityData.role - Role/position
   * @param {Date} activityData.startDate - Start date
   * @param {Date} activityData.endDate - Optional end date
   * @param {string} activityData.description - Description
   * @returns {Promise<Object>} Activity record
   */
  async trackStudentInvolvement(beneficiaryId, activityData) {
    try {
      if (!beneficiaryId || !activityData) {
        throw new Error('beneficiaryId and activityData are required');
      }

      const activity = {
        beneficiaryId,
        activityName: activityData.activityName,
        role: activityData.role,
        startDate: new Date(activityData.startDate),
        endDate: activityData.endDate ? new Date(activityData.endDate) : null,
        description: activityData.description,
        status: activityData.endDate ? 'COMPLETED' : 'ACTIVE',
        points: this.calculateActivityPoints(activityData.role),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.db.collection(this.activitiesCollection).insertOne(activity);

      // Update beneficiary points
      await this.updateBeneficiaryPoints(beneficiaryId, activity.points, 'add');

      this.emit('activity:tracked', {
        beneficiaryId,
        activityName: activityData.activityName,
        role: activityData.role,
        points: activity.points
      });

      return {
        status: 'success',
        message: 'Activity recorded successfully',
        data: {
          activityId: saved.insertedId,
          activityName: activityData.activityName,
          role: activityData.role,
          status: activity.status
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Manage achievement points/gamification
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Points information
   */
  async manageAchievementPoints(beneficiaryId, options = {}) {
    try {
      if (!beneficiaryId) {
        throw new Error('beneficiaryId is required');
      }

      // Get all achievements
      const achievements = await this.db.collection(this.achievementCollection)
        .find({ beneficiaryId })
        .toArray();

      // Get all activities
      const activities = await this.db.collection(this.activitiesCollection)
        .find({ beneficiaryId })
        .toArray();

      // Calculate total points
      const achievementPoints = achievements.reduce((sum, a) => sum + (a.points || 0), 0);
      const activityPoints = activities.reduce((sum, a) => sum + (a.points || 0), 0);
      const totalPoints = achievementPoints + activityPoints;

      // Determine level/badge
      const level = this.calculateLevel(totalPoints);
      const badge = this.getBadge(level);

      // Next level points
      const currentLevelPoints = this.getLevelPoints(level);
      const nextLevelPoints = this.getLevelPoints(level + 1);
      const pointsToNextLevel = nextLevelPoints - totalPoints;

      return {
        status: 'success',
        message: 'Achievement points calculated',
        data: {
          beneficiaryId,
          totalPoints,
          achievementPoints,
          activityPoints,
          currentLevel: level,
          badge,
          pointsToNextLevel: Math.max(0, pointsToNextLevel),
          achievements: {
            count: achievements.length,
            byType: this.groupByType(achievements)
          },
          activities: {
            count: activities.length,
            active: activities.filter(a => a.status === 'ACTIVE').length
          },
          progress: {
            currentLevelPoints: currentLevelPoints,
            nextLevelPoints: nextLevelPoints,
            percentage: ((totalPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints) * 100).toFixed(2) + '%'
          }
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Calculate achievement points based on type
   * @private
   * @param {string} type - Achievement type
   * @returns {number} Points
   */
  calculateAchievementPoints(type) {
    const points = {
      'academic': 50,
      'certification': 100,
      'award': 75,
      'special': 150
    };
    return points[type] || 50;
  }

  /**
   * Calculate activity points based on role
   * @private
   * @param {string} role - Role/position
   * @returns {number} Points
   */
  calculateActivityPoints(role) {
    const rolePoints = {
      'leader': 100,
      'president': 150,
      'vice_president': 120,
      'treasurer': 100,
      'member': 50,
      'volunteer': 75
    };
    return rolePoints[role.toLowerCase()] || 50;
  }

  /**
   * Calculate level based on total points
   * @private
   * @param {number} totalPoints - Total points
   * @returns {number} Level
   */
  calculateLevel(totalPoints) {
    if (totalPoints < 100) return 1;
    if (totalPoints < 300) return 2;
    if (totalPoints < 600) return 3;
    if (totalPoints < 1000) return 4;
    if (totalPoints < 1500) return 5;
    return 6;
  }

  /**
   * Get badge for level
   * @private
   * @param {number} level - Level
   * @returns {string} Badge name
   */
  getBadge(level) {
    const badges = {
      1: 'Beginner',
      2: 'Participant',
      3: 'Contributor',
      4: 'Leader',
      5: 'Achiever',
      6: 'Champion'
    };
    return badges[level] || 'Beginner';
  }

  /**
   * Get points required for level
   * @private
   * @param {number} level - Level
   * @returns {number} Points
   */
  getLevelPoints(level) {
    const levelPoints = {
      1: 0,
      2: 100,
      3: 300,
      4: 600,
      5: 1000,
      6: 1500
    };
    return levelPoints[level] || 0;
  }

  /**
   * Group achievements by type
   * @private
   * @param {Array<Object>} achievements - Achievements
   * @returns {Object} Grouped achievements
   */
  groupByType(achievements) {
    return achievements.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Update beneficiary points
   * @private
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {number} points - Points to add/remove
   * @param {string} operation - 'add' or 'subtract'
   */
  async updateBeneficiaryPoints(beneficiaryId, points, operation) {
    try {
      const { ObjectId } = require('mongodb');
      const increment = operation === 'add' ? points : -points;

      await this.db.collection('beneficiaries').updateOne(
        { _id: new ObjectId(beneficiaryId) },
        {
          $inc: { totalPoints: increment },
          $set: { updatedAt: new Date() }
        }
      );
    } catch (error) {
      // Log error but don't throw
      console.error('Error updating beneficiary points:', error);
    }
  }

  /**
   * Get beneficiary achievement summary
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @returns {Promise<Object>} Summary
   */
  async getBeneficiaryAchievementSummary(beneficiaryId) {
    try {
      const achievements = await this.db.collection(this.achievementCollection)
        .find({ beneficiaryId })
        .toArray();

      const skills = await this.db.collection(this.skillsCollection)
        .find({ beneficiaryId })
        .toArray();

      const activities = await this.db.collection(this.activitiesCollection)
        .find({ beneficiaryId })
        .toArray();

      return {
        status: 'success',
        message: 'Achievement summary retrieved',
        data: {
          beneficiaryId,
          achievements: {
            total: achievements.length,
            byType: this.groupByType(achievements),
            recent: achievements.slice(-5)
          },
          skills: {
            total: skills.length,
            byLevel: skills.reduce((acc, s) => {
              acc[s.level] = (acc[s.level] || 0) + 1;
              return acc;
            }, {}),
            topSkills: skills.sort((a, b) => b.level - a.level).slice(0, 5)
          },
          activities: {
            total: activities.length,
            active: activities.filter(a => a.status === 'ACTIVE').length,
            completed: activities.filter(a => a.status === 'COMPLETED').length
          }
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }
}

module.exports = AchievementService;
