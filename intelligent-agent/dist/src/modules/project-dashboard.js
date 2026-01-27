"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDashboard = void 0;
class ProjectDashboard {
    getReport(project, tasks, milestones, events, resources) {
        const now = Date.now();
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const overdueTasks = tasks.filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate).getTime() < now).length;
        const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
        const completedMilestones = milestones.filter(m => m.completed).length;
        const overdueMilestones = milestones.filter(m => !m.completed && new Date(m.dueDate).getTime() < now).length;
        return {
            projectId: project.id,
            totalTasks,
            completedTasks,
            overdueTasks,
            blockedTasks,
            milestones: milestones.length,
            completedMilestones,
            overdueMilestones,
            events: events.length,
            resources: resources.length,
            lastUpdate: project.updatedAt,
        };
    }
}
exports.ProjectDashboard = ProjectDashboard;
