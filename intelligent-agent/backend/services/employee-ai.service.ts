/**
 * ============================================
 * EMPLOYEE AI INTELLIGENCE MODULE
 * وحدة ذكاء الموظفين الاصطناعي
 * ============================================
 */

import { Employee, IEmployee } from '../models/employee.model';
import { globalLogger } from '../utils/advanced.logger';
import { performanceMonitor } from '../utils/performance.monitor';

/**
 * Employee AI Intelligence Service
 */
export class EmployeeAIService {
  /**
   * Calculate retention risk
   */
  async calculateRetentionRisk(employee: IEmployee): Promise<number> {
    return performanceMonitor.measure('calculateRetentionRisk', async () => {
      let riskScore = 0;

      // Factor 1: Performance rating (lower rating = higher risk)
      if (employee.performanceRating < 3) {
        riskScore += 0.2;
      } else if (employee.performanceRating < 2) {
        riskScore += 0.35;
      }

      // Factor 2: Tenure (early tenure = higher risk)
      const tenure = employee.getTenure();
      if (tenure.years < 1) {
        riskScore += 0.25;
      } else if (tenure.years < 2) {
        riskScore += 0.15;
      }

      // Factor 3: Leave usage (high leave = possible dissatisfaction)
      const leaveUsagePercent = (employee.usedLeaveDays / employee.totalLeaveDays) * 100;
      if (leaveUsagePercent > 80) {
        riskScore += 0.15;
      } else if (leaveUsagePercent > 60) {
        riskScore += 0.05;
      }

      // Factor 4: Absence rate
      if (employee.attendanceRecord.length > 0) {
        const absences = employee.attendanceRecord.filter(a => a.status === 'Absent').length;
        const absenceRate = absences / employee.attendanceRecord.length;
        if (absenceRate > 0.1) {
          riskScore += 0.2;
        }
      }

      // Factor 5: Last evaluation recency
      if (employee.lastEvaluationDate) {
        const daysSinceEvaluation =
          (new Date().getTime() - employee.lastEvaluationDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceEvaluation > 180) {
          riskScore += 0.1;
        }
      }

      // Normalize to 0-1 range
      return Math.min(riskScore, 1);
    });
  }

  /**
   * Predict performance
   */
  async predictPerformance(employee: IEmployee): Promise<number> {
    return performanceMonitor.measure('predictPerformance', async () => {
      let prediction = 3; // baseline

      // Historical performance
      if (employee.evaluationHistory.length > 0) {
        const avgHistorical =
          employee.evaluationHistory.reduce((sum, e) => sum + e.rating, 0) /
          employee.evaluationHistory.length;
        prediction = (prediction + avgHistorical) / 2;
      }

      // Skills and certifications
      if (employee.skills.length > 3) {
        prediction += 0.2;
      }
      if (employee.certifications.length > 0) {
        prediction += 0.1;
      }

      // Attendance
      if (employee.attendanceRecord.length > 0) {
        const presentDays = employee.attendanceRecord.filter(a => a.status === 'Present').length;
        const presentPercent = presentDays / employee.attendanceRecord.length;
        if (presentPercent > 0.95) {
          prediction += 0.15;
        } else if (presentPercent < 0.85) {
          prediction -= 0.15;
        }
      }

      // Cap at 5
      return Math.min(prediction, 5);
    });
  }

  /**
   * Identify development areas
   */
  async identifyDevelopmentAreas(employee: IEmployee): Promise<string[]> {
    return performanceMonitor.measure('identifyDevelopmentAreas', async () => {
      const areas: string[] = [];

      // Based on performance rating
      if (employee.performanceRating < 3) {
        areas.push('Performance improvement needed');
        areas.push('Professional development program required');
      }

      // Based on skills
      if (employee.skills.length < 3) {
        areas.push('Expand technical skills');
      }

      // Based on certifications
      if (employee.certifications.length === 0) {
        areas.push('Pursue relevant certifications');
      }

      // Based on evaluation comments
      if (employee.evaluationHistory.length > 0) {
        const lastEval = employee.evaluationHistory[employee.evaluationHistory.length - 1];
        if (lastEval.comments && lastEval.comments.toLowerCase().includes('communication')) {
          areas.push('Improve communication skills');
        }
        if (lastEval.comments && lastEval.comments.toLowerCase().includes('leadership')) {
          areas.push('Develop leadership capabilities');
        }
      }

      return areas.length > 0 ? areas : ['Continue excellence', 'Mentor junior team members'];
    });
  }

  /**
   * Recommend trainings
   */
  async recommendTrainings(employee: IEmployee): Promise<string[]> {
    return performanceMonitor.measure('recommendTrainings', async () => {
      const trainings: string[] = [];

      // Based on position
      if (employee.position.toLowerCase().includes('manager')) {
        trainings.push('Advanced Management Skills');
        trainings.push('Team Leadership Development');
      }

      // Based on development areas
      const devAreas = await this.identifyDevelopmentAreas(employee);
      if (devAreas.includes('Communication')) {
        trainings.push('Business Communication Essentials');
      }
      if (devAreas.includes('Leadership')) {
        trainings.push('Leadership Fundamentals');
      }

      // Based on skills gap
      if (employee.skills.length < 5) {
        trainings.push('Technical Skills Enhancement');
      }

      // General trainings for all employees
      if (!employee.certifications.some(c => c.name.includes('Compliance'))) {
        trainings.push('Compliance Training');
      }

      return trainings;
    });
  }

  /**
   * Suggest career path
   */
  async suggestCareerPath(employee: IEmployee): Promise<string[]> {
    return performanceMonitor.measure('suggestCareerPath', async () => {
      const suggestions: string[] = [];
      const performance = await this.predictPerformance(employee);

      // High performers
      if (performance >= 4.2) {
        const tenure = employee.getTenure();
        if (tenure.years >= 2) {
          suggestions.push('Leadership Track: Team Lead position');
          suggestions.push('Specialist Track: Expert in current domain');
          suggestions.push('Management Track: Senior Manager role');
        } else {
          suggestions.push('Fast-track Development Program');
          suggestions.push('Mentorship opportunities');
        }
      }
      // Average performers
      else if (performance >= 3) {
        suggestions.push('Skill Development in core competencies');
        suggestions.push('Cross-functional project experience');
        suggestions.push('Professional certifications');
      }
      // Below average
      else {
        suggestions.push('Performance Improvement Plan (PIP)');
        suggestions.push('Intensive training and support');
        suggestions.push('Mentoring from experienced team members');
      }

      // Based on tenure
      const tenure = employee.getTenure();
      if (tenure.years >= 5) {
        suggestions.push('Consider senior technical or management roles');
      }

      return suggestions;
    });
  }

  /**
   * Generate comprehensive AI insights
   */
  async generateAIInsights(employee: IEmployee): Promise<void> {
    return performanceMonitor.measure('generateAIInsights', async () => {
      try {
        const [retentionRisk, performancePrediction, developmentAreas, trainings, careerPath] =
          await Promise.all([
            this.calculateRetentionRisk(employee),
            this.predictPerformance(employee),
            this.identifyDevelopmentAreas(employee),
            this.recommendTrainings(employee),
            this.suggestCareerPath(employee),
          ]);

        employee.updateAIInsights(
          performancePrediction,
          retentionRisk,
          developmentAreas,
          trainings,
          careerPath
        );

        await employee.save();

        globalLogger.info('AI insights generated', 'EmployeeAIService', {
          employeeId: employee.employeeId,
          retentionRisk: retentionRisk.toFixed(2),
          performancePrediction: performancePrediction.toFixed(2),
        });
      } catch (error) {
        globalLogger.error('Failed to generate AI insights', error as Error, 'EmployeeAIService');
        throw error;
      }
    });
  }

  /**
   * Bulk update AI insights
   */
  async bulkUpdateAIInsights(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    return performanceMonitor.measure('bulkUpdateAIInsights', async () => {
      try {
        const employees = await Employee.find({ status: 'Active', deletedAt: null });

        let successful = 0;
        let failed = 0;

        for (const employee of employees) {
          try {
            await this.generateAIInsights(employee);
            successful++;
          } catch (error) {
            failed++;
            globalLogger.error(
              `Failed to update AI insights for ${employee.employeeId}`,
              error as Error
            );
          }
        }

        globalLogger.info('Bulk AI update completed', 'EmployeeAIService', {
          processed: employees.length,
          successful,
          failed,
        });

        return {
          processed: employees.length,
          successful,
          failed,
        };
      } catch (error) {
        globalLogger.error('Bulk update failed', error as Error, 'EmployeeAIService');
        throw error;
      }
    });
  }

  /**
   * Get AI summary for employee
   */
  async getAISummary(employeeId: string): Promise<object | null> {
    return performanceMonitor.measure('getAISummary', async () => {
      const employee = await Employee.findOne({ employeeId, deletedAt: null });

      if (!employee) {
        return null;
      }

      return {
        employeeId: employee.employeeId,
        name: employee.fullName,
        department: employee.department,
        position: employee.position,
        aiInsights: {
          performancePrediction: employee.aiInsights.performancePrediction.toFixed(2),
          retentionRisk: employee.aiInsights.retentionRisk.toFixed(2),
          developmentAreas: employee.aiInsights.developmentAreas,
          recommendedTrainings: employee.aiInsights.recommendedTrainings,
          careerPathSuggestions: employee.aiInsights.careerPathSuggestions,
          lastUpdated: employee.aiInsights.lastUpdated,
        },
        metrics: {
          tenure: `${employee.getTenure().years}y ${employee.getTenure().months}m`,
          performance: employee.performanceRating,
          leaveBalance: employee.remainingLeaveDays,
          attendanceRate:
            employee.attendanceRecord.length > 0
              ? (
                  (employee.attendanceRecord.filter(a => a.status === 'Present').length /
                    employee.attendanceRecord.length) *
                  100
                ).toFixed(1) + '%'
              : 'N/A',
        },
      };
    });
  }
}

/**
 * Create singleton instance
 */
export const employeeAIService = new EmployeeAIService();

export default EmployeeAIService;
