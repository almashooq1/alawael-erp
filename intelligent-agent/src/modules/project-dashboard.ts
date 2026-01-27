// Project Dashboard & Reporting Module
// Aggregates project metrics for dashboards and reporting
import { Project, ProjectTask, ProjectMilestone } from './smart-project-manager';
import { ProjectEvent, ProjectResource } from './project-calendar';

export interface ProjectDashboardReport {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  milestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  events: number;
  resources: number;
  lastUpdate: string;
}

export class ProjectDashboard {
  getReport(
    project: Project,
    tasks: ProjectTask[],
    milestones: ProjectMilestone[],
    events: ProjectEvent[],
    resources: ProjectResource[]
  ): ProjectDashboardReport {
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
