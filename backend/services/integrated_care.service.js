const CarePlan = require('../models/CarePlan');
const GroupProgram = require('../models/GroupProgram');
const DailySession = require('../models/DailySession');

class IntegratedCareService {
  // --- PLANS ---

  async createPlan(data) {
    // Generate simple ID
    data.planNumber = `CP-${Date.now()}`;
    return await CarePlan.create(data);
  }

  async getPlanByStudent(studentId) {
    return await CarePlan.findOne({ beneficiary: studentId }).sort({ createdAt: -1 });
  }

  async updatePlan(id, updateData) {
    return await CarePlan.findByIdAndUpdate(id, updateData, { new: true });
  }

  // --- GROUPS ---

  async createGroup(data) {
    return await GroupProgram.create(data);
  }

  async addStudentToGroup(groupId, studentId) {
    return await GroupProgram.findByIdAndUpdate(groupId, { $addToSet: { students: studentId } }, { new: true });
  }

  async logGroupSession(groupId, sessionData) {
    const group = await GroupProgram.findById(groupId);
    group.sessions.push(sessionData);
    return await group.save();
  }

  // --- SESSIONS ---

  async recordSession(data) {
    const session = await DailySession.create(data);

    // Auto-update Goal Progress inside the CarePlan
    // Concept: If we know the goalId, we find the plan, trigger updates.
    // Assuming data.student and data.goalsWorkedOn contains { goalId, score }

    if (data.student && data.goalsWorkedOn && data.goalsWorkedOn.length > 0) {
      this.calculateGoalProgress(data.student, data.goalsWorkedOn);
    }

    return session;
  }

  // Helper to calculate progress based on sessions (Moving Average or Last N sessions)
  async calculateGoalProgress(studentId, sessionGoals) {
    try {
      const plan = await this.getPlanByStudent(studentId);
      if (!plan) return;

      // This is a simplified "last score * 20" logic to map 1-5 rating to 0-100%
      // A more complex logic would average the last 5 sessions.

      let modified = false;

      // We need to iterate over all sections to find the goals.
      // This is expensive but necessary with the nested structure.
      const sections = ['educational', 'therapeutic', 'lifeSkills'];

      for (const section of sections) {
        if (!plan[section] || !plan[section].enabled) continue;

        for (const [domainKey, domainData] of Object.entries(plan[section].domains)) {
          if (!domainData.goals) continue;

          domainData.goals.forEach(goal => {
            const sessionGoal = sessionGoals.find(sg => sg.goalId === goal._id.toString());
            if (sessionGoal) {
              const newProgress = (sessionGoal.score / 5) * 100; // Convert 5-star to percentage
              goal.progress = newProgress;

              if (newProgress === 100) {
                goal.status = 'ACHIEVED';
              } else if (newProgress > 0) {
                goal.status = 'IN_PROGRESS';
              }
              modified = true;
            }
          });
        }
      }

      if (modified) {
        await plan.save();
      }
    } catch (err) {
      console.error('Error updating goal progress:', err);
    }
  }

  async getStudentHistory(studentId) {
    return await DailySession.find({ student: studentId }).sort({ date: -1 });
  }

  // --- REPORTS ---

  async generateProgressReport(studentId) {
    const plan = await this.getPlanByStudent(studentId);
    if (!plan) return { message: 'No active plan found' };

    const sessions = await DailySession.find({ student: studentId }).sort({ date: -1 });

    // 1. Calculate Goal Statistics
    let totalGoals = 0;
    let goalsAchieved = 0;
    let goalsInProgress = 0;
    const domainProgress = {};

    const sections = ['educational', 'therapeutic', 'lifeSkills'];
    sections.forEach(section => {
      if (plan[section] && plan[section].enabled) {
        Object.entries(plan[section].domains).forEach(([domain, data]) => {
          if (data.goals) {
            data.goals.forEach(g => {
              totalGoals++;
              if (g.status === 'ACHIEVED') goalsAchieved++;
              if (g.status === 'IN_PROGRESS') goalsInProgress++;
            });
            // Aggregate per domain
            domainProgress[domain] = {
              total: data.goals.length,
              achieved: data.goals.filter(g => g.status === 'ACHIEVED').length,
              avgProgress: data.goals.reduce((acc, curr) => acc + curr.progress, 0) / (data.goals.length || 1),
            };
          }
        });
      }
    });

    return {
      studentId,
      planNumber: plan.planNumber,
      startDate: plan.startDate,
      overview: {
        totalSessions: sessions.length,
        totalGoals,
        goalsAchieved,
        goalsInProgress,
        completionRate: totalGoals ? Math.round((goalsAchieved / totalGoals) * 100) : 0,
      },
      domainDetails: domainProgress,
      recentSessions: sessions.slice(0, 5),
    };
  }
}

module.exports = IntegratedCareService;
