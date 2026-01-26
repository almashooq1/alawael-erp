const SmartIRP = require('../models/SmartIRP');
const mongoose = require('mongoose');

/**
 * Smart IRP Service
 * Handles business logic for Smart Individual Rehabilitation Plans
 */
class SmartIRPService {
  /**
   * Create a new Smart IRP
   */
  static async createIRP(data, userId) {
    try {
      // Generate unique IRP number
      const irpNumber = await this.generateIRPNumber();
      
      const irp = new SmartIRP({
        ...data,
        irpNumber,
        createdBy: userId
      });
      
      // Add initial history entry
      irp.addHistory('created', userId, { initialData: data });
      
      await irp.save();
      return irp;
    } catch (error) {
      throw new Error(`Failed to create IRP: ${error.message}`);
    }
  }
  
  /**
   * Generate unique IRP number
   */
  static async generateIRPNumber() {
    const year = new Date().getFullYear();
    const count = await SmartIRP.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    
    return `IRP-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  
  /**
   * Add SMART goal to IRP
   */
  static async addGoal(irpId, goalData, userId) {
    try {
      const irp = await SmartIRP.findById(irpId);
      if (!irp) throw new Error('IRP not found');
      
      // Validate SMART criteria
      this.validateSMARTGoal(goalData);
      
      // Initialize measurable fields
      goalData.measurable.current = goalData.measurable.baseline || 0;
      goalData.achievementPercentage = 0;
      goalData.status = 'active';
      
      irp.goals.push(goalData);
      irp.updateKPIs();
      irp.addHistory('goal_added', userId, { goalTitle: goalData.title });
      
      await irp.save();
      
      // Schedule alerts check
      await this.checkAndSendAlerts(irp);
      
      return irp;
    } catch (error) {
      throw new Error(`Failed to add goal: ${error.message}`);
    }
  }
  
  /**
   * Validate SMART goal criteria
   */
  static validateSMARTGoal(goal) {
    const errors = [];
    
    // Specific
    if (!goal.specific || !goal.specific.what) {
      errors.push('Goal must specify WHAT will be accomplished');
    }
    
    // Measurable
    if (!goal.measurable || goal.measurable.target === undefined) {
      errors.push('Goal must have a measurable target');
    }
    if (!goal.measurable.metric) {
      errors.push('Goal must specify HOW it will be measured');
    }
    
    // Time-bound
    if (!goal.timeBound || !goal.timeBound.startDate || !goal.timeBound.targetDate) {
      errors.push('Goal must have start and target dates');
    }
    if (goal.timeBound && new Date(goal.timeBound.targetDate) <= new Date(goal.timeBound.startDate)) {
      errors.push('Target date must be after start date');
    }
    
    if (errors.length > 0) {
      throw new Error(`SMART goal validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  }
  
  /**
   * Update goal progress
   */
  static async updateGoalProgress(irpId, goalId, progressData, userId) {
    try {
      const irp = await SmartIRP.findById(irpId);
      if (!irp) throw new Error('IRP not found');
      
      const goal = irp.goals.id(goalId);
      if (!goal) throw new Error('Goal not found');
      
      // Add progress update
      const progressUpdate = {
        date: progressData.date || new Date(),
        value: progressData.value,
        notes: progressData.notes,
        recordedBy: userId,
        attachments: progressData.attachments || []
      };
      
      // Calculate percentage
      const { baseline, target } = goal.measurable;
      const progress = progressData.value - baseline;
      const totalRequired = target - baseline;
      const percentage = Math.min(100, Math.max(0, Math.round((progress / totalRequired) * 100)));
      
      progressUpdate.percentage = percentage;
      goal.progressUpdates.push(progressUpdate);
      
      // Update current value and achievement percentage
      goal.measurable.current = progressData.value;
      goal.achievementPercentage = percentage;
      
      // Auto-update status based on progress
      if (percentage >= 100) {
        goal.status = 'achieved';
      } else {
        const elapsed = new Date() - new Date(goal.timeBound.startDate);
        const total = new Date(goal.timeBound.targetDate) - new Date(goal.timeBound.startDate);
        const expectedProgress = (elapsed / total) * 100;
        
        if (percentage >= expectedProgress - 10) {
          goal.status = 'on_track';
        } else if (percentage >= expectedProgress - 20) {
          goal.status = 'at_risk';
        } else {
          goal.status = 'delayed';
        }
      }
      
      // Check milestones
      goal.measurable.milestones.forEach(milestone => {
        if (!milestone.achieved && progressData.value >= milestone.value) {
          milestone.achieved = true;
          milestone.achievedDate = new Date();
        }
      });
      
      irp.updateKPIs();
      irp.addHistory('progress_updated', userId, {
        goalTitle: goal.title,
        value: progressData.value,
        percentage
      });
      
      await irp.save();
      
      // Check for alerts
      await this.checkAndSendAlerts(irp);
      
      return { irp, goal, percentage };
    } catch (error) {
      throw new Error(`Failed to update progress: ${error.message}`);
    }
  }
  
  /**
   * Perform periodic assessment
   */
  static async performAssessment(irpId, assessmentData, userId) {
    try {
      const irp = await SmartIRP.findById(irpId);
      if (!irp) throw new Error('IRP not found');
      
      const assessment = {
        ...assessmentData,
        date: assessmentData.date || new Date(),
        assessor: userId
      };
      
      // Calculate next assessment date
      const nextDate = new Date(assessment.date);
      switch (assessment.type) {
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'semi_annual':
          nextDate.setMonth(nextDate.getMonth() + 6);
          break;
        case 'annual':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          nextDate.setMonth(nextDate.getMonth() + 3); // Default quarterly
      }
      assessment.nextAssessmentDate = nextDate;
      
      irp.assessments.push(assessment);
      
      // Apply goal modifications from assessment
      if (assessment.goalsToModify) {
        assessment.goalsToModify.forEach(mod => {
          const goal = irp.goals.id(mod.goalId);
          if (goal) {
            switch (mod.action) {
              case 'achieve':
                goal.status = 'achieved';
                goal.achievementPercentage = 100;
                break;
              case 'discontinue':
                goal.status = 'cancelled';
                break;
              case 'revise':
                goal.status = 'revised';
                break;
            }
          }
        });
      }
      
      irp.updateKPIs();
      irp.addHistory('assessment_completed', userId, {
        type: assessment.type,
        overallProgress: assessment.overallProgress
      });
      
      await irp.save();
      
      // Generate and send report to family
      await this.generateFamilyReport(irp, assessment);
      
      return irp;
    } catch (error) {
      throw new Error(`Failed to perform assessment: ${error.message}`);
    }
  }
  
  /**
   * Check for alerts and send notifications
   */
  static async checkAndSendAlerts(irp) {
    try {
      const alerts = irp.checkForAlerts();
      
      if (alerts.length === 0) return;
      
      // Add alerts to goals
      alerts.forEach(alert => {
        const goal = irp.goals[alert.goalIndex];
        if (goal) {
          goal.alerts.push({
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            date: alert.date,
            acknowledged: false
          });
        }
      });
      
      await irp.save();
      
      // Send notifications to team members and alert recipients
      const recipients = [
        ...irp.team.map(t => t.member),
        ...irp.autoReview.alertRecipients
      ];
      
      // TODO: Integrate with notification system
      // await NotificationService.sendBulk(recipients, alerts);
      
      return alerts;
    } catch (error) {
      console.error('Error checking alerts:', error);
      return [];
    }
  }
  
  /**
   * Perform automatic review
   */
  static async performAutoReview(irpId) {
    try {
      const irp = await SmartIRP.findById(irpId);
      if (!irp) throw new Error('IRP not found');
      
      // Check all goals for progress issues
      const alerts = irp.checkForAlerts();
      
      // Update KPIs
      irp.updateKPIs();
      
      // Schedule next review
      irp.scheduleNextReview();
      
      // Create review summary
      const reviewSummary = {
        date: new Date(),
        totalGoals: irp.goals.length,
        goalsOnTrack: irp.kpis.goalsOnTrack,
        goalsAtRisk: irp.kpis.goalsAtRisk,
        goalsDelayed: irp.kpis.goalsDelayed,
        goalsAchieved: irp.kpis.goalsAchieved,
        overallProgress: irp.kpis.overallProgress,
        alertsGenerated: alerts.length
      };
      
      irp.addHistory('auto_review_completed', null, reviewSummary);
      
      await irp.save();
      
      // Send alerts if any
      if (alerts.length > 0 && irp.autoReview.autoAlerts) {
        await this.checkAndSendAlerts(irp);
      }
      
      return { irp, reviewSummary, alerts };
    } catch (error) {
      throw new Error(`Auto review failed: ${error.message}`);
    }
  }
  
  /**
   * Generate family progress report
   */
  static async generateFamilyReport(irp, assessment = null) {
    try {
      const reportData = {
        type: assessment ? 'quarterly' : 'progress',
        generatedDate: new Date(),
        reportPeriod: {
          start: assessment ? assessment.date : irp.autoReview.lastReviewDate || irp.createdAt,
          end: new Date()
        },
        content: {
          beneficiaryName: irp.beneficiaryName,
          overallProgress: irp.kpis.overallProgress,
          goalsAchieved: irp.kpis.goalsAchieved,
          goalsOnTrack: irp.kpis.goalsOnTrack,
          goalsAtRisk: irp.kpis.goalsAtRisk,
          assessment: assessment ? {
            overallProgress: assessment.overallProgress,
            notes: assessment.overallNotes,
            recommendations: assessment.recommendations
          } : null,
          goalsSummary: irp.goals.map(g => ({
            title: g.title,
            category: g.category,
            status: g.status,
            achievement: g.achievementPercentage,
            targetDate: g.timeBound.targetDate
          }))
        }
      };
      
      // TODO: Generate PDF report
      // reportData.url = await PDFService.generateReport(reportData);
      reportData.url = `/reports/irp/${irp._id}/family-report-${Date.now()}.pdf`;
      
      irp.reports.push(reportData);
      await irp.save();
      
      // TODO: Send email to family
      // await EmailService.sendFamilyReport(irp, reportData);
      
      return reportData;
    } catch (error) {
      console.error('Error generating family report:', error);
      throw error;
    }
  }
  
  /**
   * Get IRP statistics and analytics
   */
  static async getAnalytics(irpId) {
    try {
      const irp = await SmartIRP.findById(irpId);
      if (!irp) throw new Error('IRP not found');
      
      // Calculate progress over time
      const progressTimeline = [];
      irp.goals.forEach(goal => {
        goal.progressUpdates.forEach(update => {
          progressTimeline.push({
            date: update.date,
            goalTitle: goal.title,
            value: update.value,
            percentage: update.percentage
          });
        });
      });
      
      // Sort by date
      progressTimeline.sort((a, b) => a.date - b.date);
      
      // Calculate domain-specific progress
      const domainProgress = {};
      const domains = ['motor', 'cognitive', 'social', 'communication', 'self_care', 'behavioral', 'academic'];
      
      domains.forEach(domain => {
        const domainGoals = irp.goals.filter(g => g.category === domain);
        if (domainGoals.length > 0) {
          const totalProgress = domainGoals.reduce((sum, g) => sum + g.achievementPercentage, 0);
          domainProgress[domain] = {
            averageProgress: Math.round(totalProgress / domainGoals.length),
            totalGoals: domainGoals.length,
            achieved: domainGoals.filter(g => g.status === 'achieved').length,
            onTrack: domainGoals.filter(g => g.status === 'on_track').length,
            atRisk: domainGoals.filter(g => g.status === 'at_risk').length,
            delayed: domainGoals.filter(g => g.status === 'delayed').length
          };
        }
      });
      
      // Calculate velocity (progress per month)
      const startDate = new Date(irp.createdAt);
      const now = new Date();
      const monthsElapsed = (now - startDate) / (1000 * 60 * 60 * 24 * 30);
      const velocity = monthsElapsed > 0 ? irp.kpis.overallProgress / monthsElapsed : 0;
      
      return {
        overall: {
          progress: irp.kpis.overallProgress,
          goalsTotal: irp.goals.length,
          goalsAchieved: irp.kpis.goalsAchieved,
          goalsOnTrack: irp.kpis.goalsOnTrack,
          goalsAtRisk: irp.kpis.goalsAtRisk,
          goalsDelayed: irp.kpis.goalsDelayed,
          velocity: Math.round(velocity * 10) / 10
        },
        progressTimeline,
        domainProgress,
        benchmarks: irp.kpis.benchmarks,
        recentAlerts: irp.goals.reduce((alerts, goal) => {
          const unacknowledged = goal.alerts.filter(a => !a.acknowledged);
          return [...alerts, ...unacknowledged];
        }, []).slice(0, 10)
      };
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }
  
  /**
   * Compare with benchmarks
   */
  static async updateBenchmarks(irpId) {
    try {
      const irp = await SmartIRP.findById(irpId);
      if (!irp) throw new Error('IRP not found');
      
      // Calculate national average
      const allIRPs = await SmartIRP.find({ status: 'active' });
      const nationalAvg = allIRPs.reduce((sum, i) => sum + i.kpis.overallProgress, 0) / allIRPs.length;
      
      // Calculate program average
      const programIRPs = await SmartIRP.find({
        program: irp.program,
        status: 'active'
      });
      const programAvg = programIRPs.reduce((sum, i) => sum + i.kpis.overallProgress, 0) / programIRPs.length;
      
      // Calculate age group average
      const ageGroupIRPs = await SmartIRP.find({
        beneficiaryAge: { $gte: irp.beneficiaryAge - 2, $lte: irp.beneficiaryAge + 2 },
        status: 'active'
      });
      const ageGroupAvg = ageGroupIRPs.reduce((sum, i) => sum + i.kpis.overallProgress, 0) / ageGroupIRPs.length;
      
      // Update benchmarks
      irp.kpis.benchmarks = {
        nationalAverage: Math.round(nationalAvg),
        programAverage: Math.round(programAvg),
        ageGroupAverage: Math.round(ageGroupAvg),
        comparisonStatus: irp.kpis.overallProgress > programAvg ? 'above_average' :
                         irp.kpis.overallProgress < programAvg - 10 ? 'below_average' : 'average'
      };
      
      await irp.save();
      
      return irp.kpis.benchmarks;
    } catch (error) {
      throw new Error(`Failed to update benchmarks: ${error.message}`);
    }
  }
  
  /**
   * Run scheduled auto-reviews for all IRPs
   */
  static async runScheduledReviews() {
    try {
      const now = new Date();
      
      const irpsForReview = await SmartIRP.find({
        status: 'active',
        'autoReview.enabled': true,
        'autoReview.nextReviewDate': { $lte: now }
      });
      
      const results = [];
      
      for (const irp of irpsForReview) {
        try {
          const result = await this.performAutoReview(irp._id);
          results.push({
            irpId: irp._id,
            irpNumber: irp.irpNumber,
            success: true,
            ...result.reviewSummary
          });
        } catch (error) {
          results.push({
            irpId: irp._id,
            irpNumber: irp.irpNumber,
            success: false,
            error: error.message
          });
        }
      }
      
      return {
        totalReviewed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      throw new Error(`Scheduled reviews failed: ${error.message}`);
    }
  }
}

module.exports = SmartIRPService;
