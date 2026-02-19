/**
 * AL-AWAEL ERP - LEARNING & DEVELOPMENT SERVICE
 * Phase 23 - Learning & Development System
 * 
 * Features:
 * - Learning program management
 * - Training enrollment & tracking
 * - Learning analytics & reporting
 * - Certification management
 * - External platform integration
 * - ROI calculation
 * - Skill development tracking
 */

const crypto = require('crypto');

class LearningDevelopmentService {
  constructor() {
    this.learningPrograms = [];
    this.enrollments = [];
    this.assessments = [];
    this.certifications = [];
    this.skills = [];
    this.developmentPlans = [];
    this.learningContent = [];
    this.externalIntegrations = [];
  }

  /**
   * LEARNING PROGRAMS MANAGEMENT
   */

  createLearningProgram(programData) {
    try {
      const {
        name,
        description,
        category,
        level = 'intermediate',
        duration = 0,
        targetAudience = [],
        objectives = [],
        prerequisite = null,
        cost = 0,
        provider = 'internal',
        maxParticipants = 100,
        startDate,
        endDate,
      } = programData;

      if (!name || !category) {
        throw new Error('Program name and category are required');
      }

      const program = {
        id: crypto.randomUUID(),
        name,
        description,
        category,
        level,
        duration,
        targetAudience,
        objectives,
        prerequisite,
        cost,
        provider,
        maxParticipants,
        startDate,
        endDate,
        modules: [],
        status: 'draft',
        enrollmentCount: 0,
        completionRate: 0,
        averageRating: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.learningPrograms.push(program);
      return program;
    } catch (error) {
      throw new Error(`Failed to create learning program: ${error.message}`);
    }
  }

  updateProgram(programId, updates) {
    try {
      const program = this.learningPrograms.find(p => p.id === programId);
      if (!program) throw new Error('Program not found');

      Object.assign(program, updates, { updatedAt: new Date() });
      return program;
    } catch (error) {
      throw new Error(`Failed to update program: ${error.message}`);
    }
  }

  getProgram(programId) {
    try {
      const program = this.learningPrograms.find(p => p.id === programId);
      if (!program) throw new Error('Program not found');

      const enrollmentStats = this._getEnrollmentStats(programId);
      return {
        ...program,
        ...enrollmentStats,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve program: ${error.message}`);
    }
  }

  listPrograms(filters = {}) {
    try {
      const { category, level, provider, limit = 50, skip = 0 } = filters;
      let programs = [...this.learningPrograms];

      if (category) programs = programs.filter(p => p.category === category);
      if (level) programs = programs.filter(p => p.level === level);
      if (provider) programs = programs.filter(p => p.provider === provider);

      const total = programs.length;
      const list = programs.slice(skip, skip + limit);

      return {
        total,
        count: list.length,
        programs: list,
      };
    } catch (error) {
      throw new Error(`Failed to list programs: ${error.message}`);
    }
  }

  archiveProgram(programId) {
    try {
      const program = this.learningPrograms.find(p => p.id === programId);
      if (!program) throw new Error('Program not found');

      program.status = 'archived';
      program.updatedAt = new Date();
      return program;
    } catch (error) {
      throw new Error(`Failed to archive program: ${error.message}`);
    }
  }

  /**
   * TRAINING ENROLLMENT & TRACKING
   */

  enrollEmployee(enrollmentData) {
    try {
      const {
        employeeId,
        programId,
        enrollmentType = 'self', // self, manager, mandatory
        startDate = new Date(),
        dueDate,
        priority = 'normal',
      } = enrollmentData;

      if (!employeeId || !programId) {
        throw new Error('Employee ID and Program ID are required');
      }

      const program = this.learningPrograms.find(p => p.id === programId);
      if (!program) throw new Error('Program not found');

      if (program.enrollmentCount >= program.maxParticipants) {
        throw new Error('Program is at maximum capacity');
      }

      const enrollment = {
        id: crypto.randomUUID(),
        employeeId,
        programId,
        enrollmentType,
        startDate,
        dueDate,
        priority,
        status: 'enrolled',
        enrolledAt: new Date(),
        completedAt: null,
        progress: 0,
        assessmentScore: null,
        certificateIssued: false,
        feedback: null,
      };

      this.enrollments.push(enrollment);

      // Update program enrollment count
      program.enrollmentCount += 1;

      return enrollment;
    } catch (error) {
      throw new Error(`Failed to enroll employee: ${error.message}`);
    }
  }

  updateEnrollmentStatus(enrollmentId, status, additionalData = {}) {
    try {
      const enrollment = this.enrollments.find(e => e.id === enrollmentId);
      if (!enrollment) throw new Error('Enrollment not found');

      enrollment.status = status;

      if (status === 'completed') {
        enrollment.completedAt = new Date();
        enrollment.progress = 100;
      }

      if (additionalData.progress !== undefined) {
        enrollment.progress = Math.min(100, additionalData.progress);
      }

      if (additionalData.assessmentScore !== undefined) {
        enrollment.assessmentScore = additionalData.assessmentScore;
      }

      Object.assign(enrollment, additionalData);
      return enrollment;
    } catch (error) {
      throw new Error(`Failed to update enrollment: ${error.message}`);
    }
  }

  getEnrollment(enrollmentId) {
    try {
      const enrollment = this.enrollments.find(e => e.id === enrollmentId);
      if (!enrollment) throw new Error('Enrollment not found');

      return enrollment;
    } catch (error) {
      throw new Error(`Failed to retrieve enrollment: ${error.message}`);
    }
  }

  trackMandatoryTraining(employeeId) {
    try {
      const mandatoryTraining = this.enrollments.filter(
        e => e.employeeId === employeeId && 
        this.learningPrograms.find(p => p.id === e.programId)?.isMandatory
      );

      const tracking = mandatoryTraining.map(t => {
        const program = this.learningPrograms.find(p => p.id === t.programId);
        return {
          enrollment: t,
          program: program?.name,
          daysUntilDue: t.dueDate ? Math.ceil((new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
          compliance: t.status === 'completed' ? 'compliant' : 'pending',
        };
      });

      return tracking;
    } catch (error) {
      throw new Error(`Failed to track mandatory training: ${error.message}`);
    }
  }

  /**
   * LEARNING ANALYTICS
   */

  getCompletionRates(filters = {}) {
    try {
      const { programId, department, timeRange = 'all' } = filters;

      let enrollments = [...this.enrollments];

      if (programId) {
        enrollments = enrollments.filter(e => e.programId === programId);
      }

      const completionCount = enrollments.filter(e => e.status === 'completed').length;
      const completionRate = enrollments.length > 0 ? (completionCount / enrollments.length) * 100 : 0;

      const byProgram = {};
      this.learningPrograms.forEach(prog => {
        const progEnrollments = enrollments.filter(e => e.programId === prog.id);
        const completed = progEnrollments.filter(e => e.status === 'completed').length;
        byProgram[prog.name] = {
          total: progEnrollments.length,
          completed,
          rate: progEnrollments.length > 0 ? (completed / progEnrollments.length) * 100 : 0,
        };
      });

      return {
        overallCompletionRate: completionRate,
        totalEnrollments: enrollments.length,
        totalCompleted: completionCount,
        byProgram,
      };
    } catch (error) {
      throw new Error(`Failed to calculate completion rates: ${error.message}`);
    }
  }

  getAssessmentScores(employeeId) {
    try {
      const employeeEnrollments = this.enrollments.filter(e => e.employeeId === employeeId);

      const scores = employeeEnrollments.map(enrollment => {
        const program = this.learningPrograms.find(p => p.id === enrollment.programId);
        return {
          program: program?.name,
          enrollmentStatus: enrollment.status,
          score: enrollment.assessmentScore,
          scorePercentage: enrollment.assessmentScore ? (enrollment.assessmentScore / 100) * 100 : 0,
          grade: this._getGrade(enrollment.assessmentScore),
          completedAt: enrollment.completedAt,
        };
      });

      const averageScore = scores.filter(s => s.score).length > 0
        ? scores.filter(s => s.score).reduce((sum, s) => sum + s.score, 0) / scores.filter(s => s.score).length
        : 0;

      return {
        employeeId,
        scores,
        averageScore,
        totalAssessments: scores.length,
      };
    } catch (error) {
      throw new Error(`Failed to get assessment scores: ${error.message}`);
    }
  }

  trackSkillImprovement(employeeId) {
    try {
      const employeeSkills = this.skills.filter(s => s.employeeId === employeeId);

      const improvements = employeeSkills.map(skill => ({
        skill: skill.skillName,
        preAssessmentLevel: skill.initialLevel,
        postAssessmentLevel: skill.currentLevel,
        improvement: skill.currentLevel - skill.initialLevel,
        improvementPercentage: ((skill.currentLevel - skill.initialLevel) / skill.initialLevel) * 100,
        developmentPlanId: skill.developmentPlanId,
      }));

      const totalImprovement = improvements.reduce((sum, i) => sum + i.improvement, 0);
      const avgImprovement = improvements.length > 0 ? totalImprovement / improvements.length : 0;

      return {
        employeeId,
        improvements,
        totalSkillsImproved: improvements.filter(i => i.improvement > 0).length,
        averageImprovement: avgImprovement,
      };
    } catch (error) {
      throw new Error(`Failed to track skill improvement: ${error.message}`);
    }
  }

  measureLearningROI(programId) {
    try {
      const program = this.learningPrograms.find(p => p.id === programId);
      if (!program) throw new Error('Program not found');

      const programEnrollments = this.enrollments.filter(e => e.programId === programId);
      const completedEnrollments = programEnrollments.filter(e => e.status === 'completed');

      const totalCost = program.cost * programEnrollments.length;
      const completionRate = programEnrollments.length > 0 ? (completedEnrollments.length / programEnrollments.length) * 100 : 0;
      const avgAssessmentScore = completedEnrollments.length > 0
        ? completedEnrollments.reduce((sum, e) => sum + (e.assessmentScore || 0), 0) / completedEnrollments.length
        : 0;

      // Simplified ROI: (Average Score / 100) * Total Participants * 1000 (benefit factor)
      const estimatedBenefit = (avgAssessmentScore / 100) * programEnrollments.length * 1000;
      const roi = totalCost > 0 ? ((estimatedBenefit - totalCost) / totalCost) * 100 : 0;

      return {
        programId,
        programName: program.name,
        totalEnrollments: programEnrollments.length,
        completedEnrollments: completedEnrollments.length,
        completionRate,
        totalCost,
        estimatedBenefit,
        roi,
        roi_status: roi >= 50 ? 'excellent' : roi >= 0 ? 'positive' : 'negative',
      };
    } catch (error) {
      throw new Error(`Failed to measure learning ROI: ${error.message}`);
    }
  }

  generateLearningReport(filters = {}) {
    try {
      const { employeeId, programId, timeRange = 'all', format = 'detailed' } = filters;

      const report = {
        generatedAt: new Date(),
        period: timeRange,
      };

      if (employeeId) {
        report.employeeId = employeeId;
        report.completionRates = this.getCompletionRates({ programId });
        report.assessmentScores = this.getAssessmentScores(employeeId);
        report.skillImprovement = this.trackSkillImprovement(employeeId);
      } else if (programId) {
        report.programId = programId;
        report.roi = this.measureLearningROI(programId);
        report.completionRates = this.getCompletionRates({ programId });
      }

      return report;
    } catch (error) {
      throw new Error(`Failed to generate learning report: ${error.message}`);
    }
  }

  /**
   * CERTIFICATION MANAGEMENT
   */

  defineCertificationPath(certificationData) {
    try {
      const {
        name,
        description,
        level,
        requiredPrograms = [],
        passingScore = 70,
        validityPeriod = 365,
        exams = [],
      } = certificationData;

      if (!name || !level) {
        throw new Error('Certification name and level are required');
      }

      const certification = {
        id: crypto.randomUUID(),
        name,
        description,
        level,
        requiredPrograms,
        passingScore,
        validityPeriod,
        exams,
        createdAt: new Date(),
      };

      this.certifications.push(certification);
      return certification;
    } catch (error) {
      throw new Error(`Failed to define certification path: ${error.message}`);
    }
  }

  trackExamStatus(employeeId, certificationId, examData) {
    try {
      const { examDate, examScore, examStatus = 'pending', attempts = 1 } = examData;

      const examRecord = {
        id: crypto.randomUUID(),
        employeeId,
        certificationId,
        examDate,
        examScore,
        examStatus,
        attempts,
        recordedAt: new Date(),
      };

      this.assessments.push(examRecord);
      return examRecord;
    } catch (error) {
      throw new Error(`Failed to track exam status: ${error.message}`);
    }
  }

  manageLicenseRenewal(employeeId, certificationId, renewalData) {
    try {
      const { issueDate, expiryDate, renewalReminderDays = 30 } = renewalData;

      const license = {
        id: crypto.randomUUID(),
        employeeId,
        certificationId,
        issueDate,
        expiryDate,
        renewalReminderDays,
        status: 'valid',
        daysUntilExpiry: Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
        createdAt: new Date(),
      };

      return license;
    } catch (error) {
      throw new Error(`Failed to manage license renewal: ${error.message}`);
    }
  }

  /**
   * EXTERNAL INTEGRATION
   */

  integrateThirdPartyPlatform(integrationData) {
    try {
      const {
        platformName,
        apiKey,
        endpoint,
        syncFrequency = 'daily',
        contentTypes = [],
      } = integrationData;

      if (!platformName || !apiKey) {
        throw new Error('Platform name and API key are required');
      }

      const integration = {
        id: crypto.randomUUID(),
        platformName,
        apiKey,
        endpoint,
        syncFrequency,
        contentTypes,
        status: 'connected',
        lastSyncAt: null,
        syncCount: 0,
        createdAt: new Date(),
      };

      this.externalIntegrations.push(integration);
      return integration;
    } catch (error) {
      throw new Error(`Failed to integrate third-party platform: ${error.message}`);
    }
  }

  syncLearningContent(integrationId) {
    try {
      const integration = this.externalIntegrations.find(i => i.id === integrationId);
      if (!integration) throw new Error('Integration not found');

      // Simulate content sync
      const syncResult = {
        integrationId,
        syncedAt: new Date(),
        platformName: integration.platformName,
        contentSynced: {
          programs: Math.floor(Math.random() * 20),
          modules: Math.floor(Math.random() * 100),
          assessments: Math.floor(Math.random() * 50),
        },
        status: 'completed',
      };

      integration.lastSyncAt = new Date();
      integration.syncCount += 1;

      return syncResult;
    } catch (error) {
      throw new Error(`Failed to sync learning content: ${error.message}`);
    }
  }

  /**
   * HELPER METHODS
   */

  _getEnrollmentStats(programId) {
    const enrollments = this.enrollments.filter(e => e.programId === programId);
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const inProgress = enrollments.filter(e => e.status === 'in-progress').length;
    const pending = enrollments.filter(e => e.status === 'enrolled').length;

    return {
      stats: {
        totalEnrollments: enrollments.length,
        completedCount: completed,
        inProgressCount: inProgress,
        pendingCount: pending,
        completionRate: enrollments.length > 0 ? (completed / enrollments.length) * 100 : 0,
      },
    };
  }

  _getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
}

module.exports = LearningDevelopmentService;
