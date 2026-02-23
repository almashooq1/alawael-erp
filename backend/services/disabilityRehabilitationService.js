const DisabilityProgram = require('../models/DisabilityProgram');
const DisabilitySession = require('../models/DisabilitySession');
const Goal = require('../models/Goal');
const Assessment = require('../models/Assessment');
const logger = require('../utils/logger');

/**
 * DisabilityRehabilitationService
 * Manages all disability rehabilitation programs, sessions, goals, and assessments
 */
class DisabilityRehabilitationService {

  // ============ PROGRAM MANAGEMENT ============

  /**
   * Get all rehabilitation programs
   */
  async getAllPrograms(query = {}) {
    try {
      let mongoQuery = {};

      if (query.category) {
        mongoQuery.category = query.category;
      }
      if (query.status) {
        mongoQuery.status = query.status;
      }
      if (query.search) {
        mongoQuery.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } }
        ];
      }

      const programs = await DisabilityProgram.find(mongoQuery)
        .populate('createdBy', 'firstName lastName email')
        .populate('therapists', 'firstName lastName email')
        .sort({ createdAt: -1 });

      return programs;
    } catch (error) {
      logger.error('Error getting programs:', error);
      throw error;
    }
  }

  /**
   * Create new rehabilitation program
   */
  async createProgram(data) {
    try {
      const program = new DisabilityProgram({
        name: data.name,
        description: data.description,
        category: data.category,
        duration: data.duration,
        targetParticipants: data.targetParticipants,
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: data.createdBy,
        therapists: data.therapists || [],
        status: 'active'
      });

      const saved = await program.save();
      logger.info(`Program created: ${saved._id}`);
      return saved;
    } catch (error) {
      logger.error('Error creating program:', error);
      throw error;
    }
  }

  /**
   * Get specific program by ID
   */
  async getProgramById(programId) {
    try {
      const program = await DisabilityProgram.findById(programId)
        .populate('createdBy', 'firstName lastName email')
        .populate('therapists', 'firstName lastName email');
      return program || null;
    } catch (error) {
      logger.error('Error getting program:', error);
      throw error;
    }
  }

  /**
   * Update rehabilitation program
   */
  async updateProgram(programId, data) {
    try {
      const program = await DisabilityProgram.findByIdAndUpdate(
        programId,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('createdBy', 'firstName lastName email')
       .populate('therapists', 'firstName lastName email');

      if (!program) return null;

      logger.info(`Program updated: ${programId}`);
      return program;
    } catch (error) {
      logger.error('Error updating program:', error);
      throw error;
    }
  }

  /**
   * Delete rehabilitation program
   */
  async deleteProgram(programId) {
    try {
      const deleted = await DisabilityProgram.findByIdAndDelete(programId);

      if (!deleted) return null;

      logger.info(`Program deleted: ${programId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting program:', error);
      throw error;
    }
  }

  /**
   * Create rehabilitation session
   */
  async createSession(data) {
    try {
      const session = new DisabilitySession({
        programId: data.programId,
        participantId: data.beneficiaryId || data.participantId,
        sessionNumber: data.sessionNumber,
        date: data.sessionDate || data.date,
        duration: data.duration,
        therapist: data.therapistId || data.therapist,
        location: data.location,
        objectives: data.objectives || [],
        activities: data.activities || [],
        notes: data.notes || '',
        status: 'scheduled'
      });

      const saved = await session.save();
      logger.info(`Session created: ${saved._id}`);
      return saved;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get all rehabilitation sessions
   */
  async getAllSessions(query = {}) {
    try {
      let mongoQuery = {};

      if (query.programId) {
        mongoQuery.programId = query.programId;
      }
      if (query.beneficiaryId || query.participantId) {
        mongoQuery.participantId = query.beneficiaryId || query.participantId;
      }
      if (query.status) {
        mongoQuery.status = query.status;
      }
      if (query.therapistId) {
        mongoQuery.therapist = query.therapistId;
      }

      const sessions = await DisabilitySession.find(mongoQuery)
        .populate('therapist', 'firstName lastName email')
        .populate('participantId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort({ date: -1 });

      return sessions;
    } catch (error) {
      logger.error('Error getting sessions:', error);
      throw error;
    }
  }

  /**
   * Get specific session by ID
   */
  async getSessionById(sessionId) {
    try {
      const session = await DisabilitySession.findById(sessionId)
        .populate('therapist', 'firstName lastName email')
        .populate('participantId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');
      return session || null;
    } catch (error) {
      logger.error('Error getting session:', error);
      throw error;
    }
  }

  /**
   * Update rehabilitation session
   */
  async updateSession(sessionId, data) {
    try {
      const session = await DisabilitySession.findByIdAndUpdate(
        sessionId,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('therapist', 'firstName lastName email')
       .populate('participantId', 'firstName lastName email')
       .populate('createdBy', 'firstName lastName email');

      if (!session) return null;

      logger.info(`Session updated: ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Error updating session:', error);
      throw error;
    }
  }

  // ============ GOAL MANAGEMENT ============

  /**
   * Create rehabilitation goal
   */
  async createGoal(data) {
    try {
      const goal = new Goal({
        title: data.title,
        description: data.description,
        category: data.category,
        programId: data.programId,
        participantId: data.beneficiaryId || data.participantId,
        createdBy: data.createdBy,
        targetValue: data.targetValue,
        baselineValue: data.baselineValue,
        unit: data.unit,
        targetDate: data.targetDate,
        status: 'not-started'
      });

      const saved = await goal.save();
      logger.info(`Goal created: ${saved._id}`);
      return saved;
    } catch (error) {
      logger.error('Error creating goal:', error);
      throw error;
    }
  }

  /**
   * Get specific goal by ID
   */
  async getGoalById(goalId) {
    try {
      const goal = await Goal.findById(goalId)
        .populate('createdBy', 'firstName lastName email')
        .populate('participantId', 'firstName lastName email');
      return goal || null;
    } catch (error) {
      logger.error('Error getting goal:', error);
      throw error;
    }
  }

  /**
   * Get goals for a beneficiary
   */
  async getGoalsByBeneficiary(beneficiaryId) {
    try {
      const goals = await Goal.find({ participantId: beneficiaryId })
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 });
      return goals;
    } catch (error) {
      logger.error('Error getting goals:', error);
      throw error;
    }
  }

  /**
   * Update rehabilitation goal
   */
  async updateGoal(goalId, data) {
    try {
      const goal = await Goal.findByIdAndUpdate(
        goalId,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('createdBy', 'firstName lastName email')
       .populate('participantId', 'firstName lastName email');

      if (!goal) return null;

      logger.info(`Goal updated: ${goalId}`);
      return goal;
    } catch (error) {
      logger.error('Error updating goal:', error);
      throw error;
    }
  }

  // ============ ASSESSMENT MANAGEMENT ============

  /**
   * Create rehabilitation assessment
   */
  async createAssessment(data) {
    try {
      const assessment = new Assessment({
        title: data.title,
        description: data.description,
        type: data.type || 'progress',
        programId: data.programId,
        beneficiaryId: data.beneficiaryId,
        therapistId: data.therapistId,
        assessmentDate: data.assessmentDate || new Date(),
        results: data.results,
        observations: data.observations,
        recommendations: data.recommendations || [],
        status: 'completed'
      });

      // Calculate score from results
      assessment.score = this._calculateScore(data.results);

      const saved = await assessment.save();
      logger.info(`Assessment created: ${saved._id}`);
      return saved;
    } catch (error) {
      logger.error('Error creating assessment:', error);
      throw error;
    }
  }


  /**
   * Get specific assessment by ID
   */
  async getAssessmentById(assessmentId) {
    try {
      const assessment = await Assessment.findById(assessmentId)
        .populate('therapistId', 'firstName lastName email')
        .populate('beneficiaryId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email');
      return assessment || null;
    } catch (error) {
      logger.error('Error getting assessment:', error);
      throw error;
    }
  }

  /**
   * Get assessments for a beneficiary
   */
  async getAssessmentsByBeneficiary(beneficiaryId) {
    try {
      const assessments = await Assessment.find({ beneficiaryId })
        .populate('therapistId', 'firstName lastName email')
        .sort({ assessmentDate: -1 });
      return assessments;
    } catch (error) {
      logger.error('Error getting assessments:', error);
      throw error;
    }
  }

  /**
   * Get beneficiary performance and progress
   */
  async getBeneficiaryPerformance(beneficiaryId) {
    try {
      const [goals, assessments, sessions] = await Promise.all([
        this.getGoalsByBeneficiary(beneficiaryId),
        this.getAssessmentsByBeneficiary(beneficiaryId),
        DisabilitySession.find({ participantId: beneficiaryId })
      ]);

      if (goals.length === 0 && assessments.length === 0 && sessions.length === 0) {
        return null;
      }

      // Calculate metrics
      const completedGoals = goals.filter(g => g.status === 'achieved').length;
      const totalSessions = sessions.length;
      const attendedSessions = sessions.filter(s => s.attendance === 'present').length;
      const averageScore = assessments.length > 0
        ? (assessments.reduce((sum, a) => sum + (a.score || 0), 0) / assessments.length).toFixed(2)
        : 0;

      return {
        beneficiaryId,
        totalGoals: goals.length,
        completedGoals,
        progressPercentage: goals.length > 0
          ? ((completedGoals / goals.length) * 100).toFixed(2)
          : 0,
        totalSessions,
        attendedSessions,
        attendanceRate: totalSessions > 0
          ? ((attendedSessions / totalSessions) * 100).toFixed(2)
          : 0,
        assessmentCount: assessments.length,
        averageScore,
        latestAssessment: assessments[0] || null,
        goals: goals.slice(0, 5),
        recentSessions: sessions.slice(0, 3)
      };
    } catch (error) {
      logger.error('Error getting performance:', error);
      throw error;
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Calculate score from assessment results
   */
  _calculateScore(results) {
    if (!results || typeof results !== 'object') return 0;

    const scores = Object.values(results)
      .filter(v => typeof v === 'number')
      .map(v => Math.min(v, 100));

    if (scores.length === 0) return 0;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      const [programsCount, sessionsCount, goalsCount, assessmentsCount] = await Promise.all([
        DisabilityProgram.countDocuments(),
        DisabilitySession.countDocuments(),
        Goal.countDocuments(),
        Assessment.countDocuments()
      ]);

      return {
        service: 'DisabilityRehabilitationService',
        status: 'operational',
        programsCount,
        sessionsCount,
        goalsCount,
        assessmentsCount
      };
    } catch (error) {
      logger.error('Error getting health status:', error);
      return {
        service: 'DisabilityRehabilitationService',
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export service and singleton instance
const disabilityRehabilitationService = new DisabilityRehabilitationService();

module.exports = {
  DisabilityRehabilitationService,
  disabilityRehabilitationService
};
