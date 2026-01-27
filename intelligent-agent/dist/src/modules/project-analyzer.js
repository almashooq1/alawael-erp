"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectAnalyzer = void 0;
class ProjectAnalyzer {
    analyze(project, tasks, milestones) {
        const now = Date.now();
        const overdueTasks = tasks.filter(t => t.projectId === project.id && t.dueDate && t.status !== 'done' && new Date(t.dueDate).getTime() < now).length;
        const blockedTasks = tasks.filter(t => t.projectId === project.id && t.status === 'blocked').length;
        const completedMilestones = milestones.filter(m => m.projectId === project.id && m.completed).length;
        const overdueMilestones = milestones.filter(m => m.projectId === project.id && !m.completed && new Date(m.dueDate).getTime() < now).length;
        // Simple risk score: more overdue/blocked = higher risk
        let riskScore = 0;
        const risks = [];
        if (overdueTasks > 0) {
            riskScore += 30;
            risks.push('Overdue tasks');
        }
        if (blockedTasks > 0) {
            riskScore += 30;
            risks.push('Blocked tasks');
        }
        if (overdueMilestones > 0) {
            riskScore += 30;
            risks.push('Overdue milestones');
        }
        if (riskScore === 0)
            risks.push('No major risks detected');
        return { overdueTasks, blockedTasks, completedMilestones, overdueMilestones, riskScore: Math.min(riskScore, 100), risks };
    }
}
exports.ProjectAnalyzer = ProjectAnalyzer;
