/**
 * Project Model
 * Represents a project with team, tasks, budget, and timeline management
 */

module.exports = class Project {
  constructor(data = {}) {
    this.id = data.id || `PRJ-${Date.now()}`;
    this.name = data.name;
    this.description = data.description;
    this.status = data.status || 'planning'; // planning, active, on-hold, completed, cancelled
    this.owner = data.owner;
    this.team = data.team || [];
    this.budget = data.budget || 0;
    this.expenses = data.expenses || 0;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.tasks = data.tasks || [];
    this.milestones = data.milestones || [];
  }

  // Helper methods
  getProjectStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      completionPercentage: this.calculateCompletion(),
      tasksCompleted: this.tasks.filter(t => t.status === 'completed').length,
      totalTasks: this.tasks.length,
    };
  }

  calculateCompletion() {
    if (this.tasks.length === 0) return 0;
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / this.tasks.length) * 100);
  }

  getRemainingBudget() {
    return this.budget - this.expenses;
  }

  addTeamMember(member) {
    this.team.push(member);
  }

  addTask(task) {
    this.tasks.push(task);
  }

  addMilestone(milestone) {
    this.milestones.push(milestone);
  }

  updateStatus(newStatus) {
    this.status = newStatus;
    this.updatedAt = new Date();
  }
};
