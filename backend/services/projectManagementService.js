const Project = require('../models/project.model');
const Task = require('../models/task.model');
const User = require('../models/User');

// Force in-memory logic for tests/dev unless explicitly disabled
const useMock = process.env.USE_MOCK_DB !== 'false';

class ProjectManagementService {
  constructor() {
    this.projects = new Map();
    this.tasks = new Map();
    this.phases = new Map();
    this.resources = new Map();
    this.risks = new Map();
    this.budgets = new Map();
    this.nextProjectId = 1;
    this.nextTaskId = 1;
    this.nextPhaseId = 1;
    this.nextResourceId = 1;
    this.nextRiskId = 1;
    this.nextBudgetId = 1;
    this.nextExpenseId = 1;
  }

  // --- Project CRUD ---
  createProject(data) {
    if (!data) return { error: true, message: 'Invalid project data' };
    if (useMock) {
      const id = this.nextProjectId++;
      const project = {
        ...data,
        id,
        _id: 'proj_' + id,
        phases: [],
        tasks: [],
        risks: [],
        resources: [],
        budgets: [],
        status: data.status || 'active',
      };
      this.projects.set(id, project);
      return project;
    }
    return Project.create(data);
  }

  getProject(id) {
    if (useMock) return this.projects.get(id) || { error: true, message: 'Project not found' };
    return this.getProjectById(id);
  }

  getProjectById(id) {
    if (useMock) return this.projects.get(id) || { _id: id, name: 'Mock Project' };
    return Project.findById(id).populate('manager', 'fullName').populate('team', 'fullName');
  }

  updateProject(id, data) {
    if (useMock) {
      const project = this.projects.get(id);
      if (!project) return { error: true, message: 'Project not found' };
      const updated = { ...project, ...data };
      this.projects.set(id, updated);
      return updated;
    }
    return Project.findByIdAndUpdate(id, data, { new: true });
  }

  listProjects() {
    if (useMock) return Array.from(this.projects.values());
    return Project.find({});
  }

  deleteProject(id) {
    if (useMock) {
      this.projects.delete(id);
      return true;
    }
    return Project.findByIdAndDelete(id);
  }

  validateProject(project) {
    if (!project || !project.name) {
      return { valid: false, errors: ['Missing name'] };
    }
    return { valid: true };
  }

  // --- Phases ---
  addPhase(projectId, phaseData) {
    const project = this.projects.get(projectId);
    if (!project) return { error: true, message: 'Project not found' };
    const id = this.nextPhaseId++;
    const phase = { id, _id: 'phase_' + id, projectId, status: 'planned', ...phaseData };
    this.phases.set(id, phase);
    project.phases.push(phase);
    return phase;
  }

  getPhases(projectId) {
    return Array.from(this.phases.values()).filter(p => p.projectId === projectId);
  }

  updatePhase(projectId, phaseId, data) {
    const phase = this.phases.get(phaseId);
    if (!phase || phase.projectId !== projectId) return { error: true, message: 'Phase not found' };
    const updated = { ...phase, ...data };
    this.phases.set(phaseId, updated);
    const project = this.projects.get(projectId);
    if (project) {
      project.phases = project.phases.map(p => (p.id === phaseId ? updated : p));
    }
    return updated;
  }

  deletePhase(projectId, phaseId) {
    const phase = this.phases.get(phaseId);
    if (!phase || phase.projectId !== projectId) return false;
    this.phases.delete(phaseId);
    const project = this.projects.get(projectId);
    if (project) project.phases = project.phases.filter(p => p.id !== phaseId);
    return true;
  }

  getPhaseProgress(projectId, phaseId) {
    const phaseTasks = Array.from(this.tasks.values()).filter(t => t.projectId === projectId && t.phaseId === phaseId);
    if (!phaseTasks.length) return { percentage: 0 };
    const completed = phaseTasks.filter(t => t.status === 'completed').length;
    return { percentage: Math.round((completed / phaseTasks.length) * 100) };
  }

  // --- Tasks ---
  addTask(projectId, taskData) {
    const project = this.projects.get(projectId);
    if (!project) return { error: true, message: 'Project not found' };
    const id = this.nextTaskId++;
    const task = { id, _id: 'task_' + id, projectId, status: taskData?.status || 'todo', dependencies: [], ...taskData };
    this.tasks.set(id, task);
    project.tasks.push(task);
    return task;
  }

  getTasks(projectId, filter = {}) {
    const tasks = Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
    if (filter.status) return tasks.filter(t => t.status === filter.status);
    return tasks;
  }

  updateTaskStatus(projectId, taskId, status) {
    const task = this.tasks.get(taskId);
    if (!task || task.projectId !== projectId) return { error: true, message: 'Task not found' };
    task.status = status;
    return task;
  }

  assignTask(projectId, taskId, assignee) {
    const task = this.tasks.get(taskId);
    if (!task || task.projectId !== projectId) return { error: true, message: 'Task not found' };
    task.assignee = assignee;
    return task;
  }

  deleteTask(projectId, taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.projectId !== projectId) return false;
    this.tasks.delete(taskId);
    const project = this.projects.get(projectId);
    if (project) project.tasks = project.tasks.filter(t => t.id !== taskId);
    return true;
  }

  addTaskDependency(projectId, taskId, dependsOnId) {
    const task = this.tasks.get(taskId);
    if (!task || task.projectId !== projectId) return { error: true, message: 'Task not found' };
    task.dependencies = task.dependencies || [];
    if (!task.dependencies.includes(dependsOnId)) task.dependencies.push(dependsOnId);
    return task;
  }

  getTaskProgress(projectId, taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.projectId !== projectId) return { percentage: 0 };
    if (Array.isArray(task.subtasks) && task.subtasks.length) {
      const completed = task.subtasks.filter(st => st.status === 'completed').length;
      return { percentage: Math.round((completed / task.subtasks.length) * 100) };
    }
    return { percentage: task.status === 'completed' ? 100 : 0 };
  }

  // --- Resources ---
  allocateResource(projectId, data) {
    const project = this.projects.get(projectId);
    if (!project) return { error: true };
    const id = this.nextResourceId++;
    const resource = { id, _id: 'res_' + id, projectId, allocation: data.allocation || 0, ...data };
    this.resources.set(id, resource);
    project.resources.push(resource);
    return resource;
  }

  getResources(projectId) {
    return Array.from(this.resources.values()).filter(r => r.projectId === projectId);
  }

  updateResourceAllocation(projectId, resourceId, allocation) {
    const resource = this.resources.get(resourceId);
    if (!resource || resource.projectId !== projectId) return { error: true };
    resource.allocation = allocation;
    return resource;
  }

  checkResourceAvailability(projectId) {
    const resources = this.getResources(projectId);
    const totalAllocation = resources.reduce((sum, r) => sum + (r.allocation || 0), 0);
    return { totalAllocation, available: totalAllocation <= 100 };
  }

  removeResource(projectId, resourceId) {
    const resource = this.resources.get(resourceId);
    if (!resource || resource.projectId !== projectId) return false;
    this.resources.delete(resourceId);
    const project = this.projects.get(projectId);
    if (project) project.resources = project.resources.filter(r => r.id !== resourceId);
    return true;
  }

  // --- Risks ---
  addRisk(projectId, data) {
    const project = this.projects.get(projectId);
    if (!project) return { error: true };
    const id = this.nextRiskId++;
    const risk = {
      id,
      _id: 'risk_' + id,
      projectId,
      status: 'open',
      probability: data.probability || 'medium',
      impact: data.impact || 'medium',
      ...data,
    };
    this.risks.set(id, risk);
    project.risks.push(risk);
    return risk;
  }

  getRisks(projectId) {
    return Array.from(this.risks.values()).filter(r => r.projectId === projectId);
  }

  getRiskSeverity(projectId, riskId) {
    const risk = this.risks.get(riskId);
    if (!risk || risk.projectId !== projectId) return 'low';
    const probabilityScore = { low: 1, medium: 2, high: 3 }[risk.probability] || 1;
    const impactScore = { low: 1, medium: 2, high: 3 }[risk.impact] || 1;
    const score = probabilityScore + impactScore;
    if (score >= 5) return 'critical';
    if (score >= 4) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  updateRiskStatus(projectId, riskId, status) {
    const risk = this.risks.get(riskId);
    if (!risk || risk.projectId !== projectId) return { error: true };
    risk.status = status;
    return risk;
  }

  deleteRisk(projectId, riskId) {
    const risk = this.risks.get(riskId);
    if (!risk || risk.projectId !== projectId) return false;
    this.risks.delete(riskId);
    const project = this.projects.get(projectId);
    if (project) project.risks = project.risks.filter(r => r.id !== riskId);
    return true;
  }

  // --- Budget ---
  createBudget(projectId, data) {
    const project = this.projects.get(projectId);
    if (!project) return { error: true };
    const id = this.nextBudgetId++;
    const budget = {
      id,
      _id: 'budget_' + id,
      projectId,
      totalAmount: data.totalAmount || 0,
      currency: data.currency || 'USD',
      expenses: [],
    };
    this.budgets.set(id, budget);
    project.budgets.push(budget);
    return budget;
  }

  recordExpense(projectId, budgetId, expenseData) {
    const budget = this.budgets.get(budgetId);
    if (!budget || budget.projectId !== projectId) return { error: true };
    const expense = { id: this.nextExpenseId++, ...expenseData, amount: expenseData.amount || 0 };
    budget.expenses.push(expense);
    return expense;
  }

  getBudgetUsage(projectId, budgetId) {
    const budget = this.budgets.get(budgetId);
    if (!budget || budget.projectId !== projectId) return { error: true };
    const total = budget.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const percentage = budget.totalAmount ? Math.round((total / budget.totalAmount) * 100) : 0;
    return {
      spent: total,
      remaining: budget.totalAmount - total,
      percentage,
      overBudget: total > budget.totalAmount,
    };
  }

  getBudgetReport(projectId, budgetId) {
    const budget = this.budgets.get(budgetId);
    if (!budget || budget.projectId !== projectId) return { error: true };
    const totalExpenses = budget.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const byCategory = {};
    budget.expenses.forEach(e => {
      const key = e.category || 'uncategorized';
      byCategory[key] = (byCategory[key] || 0) + (e.amount || 0);
    });
    return { totalExpenses, byCategory };
  }

  getProjectProgress(projectId) {
    const tasks = this.getTasks(projectId);
    if (!tasks.length) return { percentage: 0 };
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { percentage: Math.round((completed / tasks.length) * 100) };
  }

  getProjectTimeline(projectId) {
    return { phases: this.getPhases(projectId) };
  }

  generateProjectReport(projectId) {
    const project = this.projects.get(projectId) || {};
    const progress = this.getProjectProgress(projectId);
    return {
      summary: `Report for project ${project.name || projectId}`,
      metrics: {
        tasks: this.getTasks(projectId).length,
        risks: this.getRisks(projectId).length,
        progress: progress.percentage,
      },
    };
  }

  getProjectHealth(projectId) {
    const progress = this.getProjectProgress(projectId).percentage;
    let status = 'yellow';
    if (progress >= 80) status = 'green';
    if (progress < 30) status = 'red';
    return { status };
  }

  warnOnBudgetOverrun(projectId, budgetId) {
    const usage = this.getBudgetUsage(projectId, budgetId);
    if (usage.error) return usage;
    return { overBudget: usage.overBudget };
  }

  // --- Closure ---
  closeProject(projectId, details = {}) {
    const project = this.projects.get(projectId);
    if (!project) return { error: true };
    project.status = 'closed';
    project.closure = { ...details, closedAt: details.closureDate || new Date() };
    return project;
  }

  getClosureReport(projectId) {
    const project = this.projects.get(projectId);
    if (!project) return { error: true };
    const progress = this.getProjectProgress(projectId);
    return {
      completionPercentage: progress.percentage,
      lessons: 'N/A',
    };
  }

  archiveProject(projectId) {
    const project = this.projects.get(projectId);
    if (!project) return { error: true };
    project.status = 'archived';
    return project;
  }

  // --- Compatibility methods (API route mappings) ---
  getAllProjects(filters = {}) {
    return this.listProjects();
  }

  createTask(projectId, phaseId, taskData) {
    // Handle both (projectId, phaseId, taskData) and (taskData) signatures
    if (typeof projectId === 'object' && phaseId === undefined) {
      // Only 1 argument: it's the taskData
      taskData = projectId;
      projectId = taskData.projectId;
      phaseId = null;
    } else if (typeof phaseId === 'object' && !taskData) {
      // 2 arguments: (projectId, taskData)
      taskData = phaseId;
      phaseId = null;
    }
    const task = this.addTask(projectId, { ...taskData, phaseId, status: taskData.status || 'todo' });
    return task;
  }

  identifyRisk(projectId, riskData) {
    return this.addRisk(projectId, riskData);
  }

  manageBudget(projectId, budgetData) {
    if (budgetData.id) {
      return this.budgets.get(budgetData.id) || { error: true };
    }
    return this.createBudget(projectId, budgetData);
  }

  calculateProjectProgress(projectId) {
    return this.getProjectProgress(projectId);
  }

  getProjectSchedule(projectId) {
    return this.getProjectTimeline(projectId);
  }

  // --- Additional DB-friendly methods ---
  async getProjects() {
    if (useMock) return this.listProjects();
    return await Project.find({}).populate('manager', 'fullName').populate('team', 'fullName');
  }

  async getProjectTasks(projectId) {
    if (useMock) return this.getTasks(projectId);
    return await Task.find({ projectId }).populate('assignee', 'fullName');
  }
}

// Export both the class and an instance for flexibility
module.exports = ProjectManagementService;
module.exports.instance = new ProjectManagementService();
