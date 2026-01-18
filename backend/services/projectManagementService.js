/**
 * Project Management Service
 * خدمة إدارة المشاريع
 *
 * الميزات:
 * - إنشاء وإدارة المشاريع
 * - إدارة المهام والمراحل
 * - تتبع التقدم والموارد
 * - إدارة المخاطر والميزانيات
 * - التقارير والتحليلات
 */

class ProjectManagementService {
  constructor() {
    this.projects = new Map();
    this.tasks = new Map();
    this.phases = new Map(); // Add phases Map
    this.resources = new Map();
    this.risks = new Map();
    this.budgets = new Map();
  }

  /**
   * إنشاء مشروع جديد
   */
  createProject(projectData) {
    try {
      // Validate input
      if (!projectData || typeof projectData !== 'object') {
        return { error: 'Invalid project data' };
      }

      if (!projectData.name) {
        return { error: 'Project name is required' };
      }

      const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const project = {
        id: projectId,
        name: projectData.name,
        description: projectData.description || '',
        manager: projectData.manager,
        startDate: projectData.startDate ? new Date(projectData.startDate) : new Date(),
        endDate: projectData.endDate ? new Date(projectData.endDate) : new Date(),
        status: projectData.status || 'active', // Use provided status or default to 'active'
        priority: projectData.priority || 'medium', // low, medium, high, critical
        scope: projectData.scope || 'general',
        budget: projectData.budget || 0,
        team: projectData.team || [],
        phases: [],
        tasks: [],
        risks: [],
        documents: [],
        milestones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.projects.set(projectId, project);

      return project; // Return the project directly, not wrapped
    } catch (error) {
      return {
        error: error.message,
        success: false,
      };
    }
  }

  /**
   * إضافة مرحلة للمشروع
   */
  addPhase(projectId, phaseData) {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود');
      }

      const phaseId = `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const phase = {
        id: phaseId,
        name: phaseData.name,
        description: phaseData.description || '',
        startDate: new Date(phaseData.startDate),
        endDate: new Date(phaseData.endDate),
        owner: phaseData.owner,
        status: 'not-started', // not-started, in-progress, on-hold, completed
        progress: 0,
        tasks: [],
        deliverables: phaseData.deliverables || [],
      };

      project.phases.push(phase);
      project.updatedAt = new Date();

      return {
        success: true,
        message: 'تم إضافة المرحلة بنجاح',
        phase,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * إنشاء مهمة في المشروع
   */
  createTask(projectId, phaseId, taskData) {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود');
      }

      const phase = project.phases.find(p => p.id === phaseId);
      if (!phase) {
        throw new Error('المرحلة غير موجودة');
      }

      const taskId = `task_${Date.now()}`;
      const task = {
        id: taskId,
        phaseId,
        name: taskData.name,
        description: taskData.description || '',
        assignee: taskData.assignee,
        startDate: new Date(taskData.startDate),
        dueDate: new Date(taskData.dueDate),
        estimatedHours: taskData.estimatedHours || 0,
        actualHours: 0,
        status: 'not-started', // not-started, in-progress, on-hold, completed
        priority: taskData.priority || 'medium',
        progress: 0,
        dependencies: taskData.dependencies || [],
        subtasks: [],
        attachments: [],
        comments: [],
        createdAt: new Date(),
      };

      this.tasks.set(taskId, task);
      phase.tasks.push(taskId);
      project.tasks.push(taskId);
      project.updatedAt = new Date();

      return {
        success: true,
        message: 'تم إنشاء المهمة بنجاح',
        task,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * تحديث حالة المهمة
   */
  updateTaskStatus(projectIdOrTaskId, taskIdOrStatus, statusOrProgress) {
    // Support two call signatures:
    // 1. (projectId, taskId, status) - from tests
    // 2. (taskId, status, progress) - legacy
    let taskId, newStatus, progress;

    if (typeof taskIdOrStatus === 'string' && taskIdOrStatus.startsWith('task_')) {
      // Signature 1: (projectId, taskId, status)
      taskId = taskIdOrStatus;
      newStatus = statusOrProgress;
      progress = 0;
    } else {
      // Signature 2: (taskId, status, progress)
      taskId = projectIdOrTaskId;
      newStatus = taskIdOrStatus;
      progress = statusOrProgress || 0;
    }

    try {
      const task = this.tasks.get(taskId);
      if (!task) {
        return { error: 'Task not found' };
      }

      task.status = newStatus;
      task.progress = progress;

      if (newStatus === 'completed') {
        task.progress = 100;
        task.completedAt = new Date();
      }

      return task; // Return task directly
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  /**
   * إضافة الموارد للمشروع
   */
  allocateResource(projectId, resource) {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود');
      }

      const resourceId = `resource_${Date.now()}`;
      const allocatedResource = {
        id: resourceId,
        projectId,
        name: resource.name,
        type: resource.type, // human, equipment, budget
        quantity: resource.quantity || 1,
        costPerUnit: resource.costPerUnit || 0,
        totalCost: (resource.quantity || 1) * (resource.costPerUnit || 0),
        allocatedDate: new Date(),
        releaseDate: new Date(resource.releaseDate),
        status: 'allocated',
      };

      this.resources.set(resourceId, allocatedResource);
      project.team.push(allocatedResource);

      return {
        success: true,
        message: 'تم تخصيص الموارد بنجاح',
        resource: allocatedResource,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * إضافة مخطر للمشروع
   */
  identifyRisk(projectId, riskData) {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود');
      }

      const riskId = `risk_${Date.now()}`;
      const risk = {
        id: riskId,
        projectId,
        title: riskData.title,
        description: riskData.description,
        category: riskData.category, // technical, resource, schedule, cost
        probability: riskData.probability || 'medium', // low, medium, high
        impact: riskData.impact || 'medium',
        severity: this.calculateSeverity(riskData.probability, riskData.impact),
        owner: riskData.owner,
        mitigation: riskData.mitigation || '',
        status: 'identified', // identified, monitoring, mitigated, closed
        identifiedDate: new Date(),
      };

      this.risks.set(riskId, risk);
      project.risks.push(riskId);

      return {
        success: true,
        message: 'تم تحديد المخطر بنجاح',
        risk,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * حساب مستوى خطورة المخطر
   */
  calculateSeverity(probability, impact) {
    const probabilityScore = { low: 1, medium: 2, high: 3 }[probability] || 2;
    const impactScore = { low: 1, medium: 2, high: 3 }[impact] || 2;
    const score = probabilityScore * impactScore;

    if (score >= 7) return 'critical';
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * إدارة الميزانية
   */
  manageBudget(projectId, budgetData) {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود');
      }

      const budgetId = `budget_${Date.now()}`;
      const budget = {
        id: budgetId,
        projectId,
        totalBudget: budgetData.totalBudget,
        allocated: 0,
        spent: 0,
        contingency: budgetData.contingency || budgetData.totalBudget * 0.1,
        categories: budgetData.categories || {},
        expenses: [],
        approved: budgetData.approved || false,
        createdAt: new Date(),
      };

      this.budgets.set(budgetId, budget);
      project.budget = budgetData.totalBudget;

      return {
        success: true,
        message: 'تم إنشاء الميزانية بنجاح',
        budget,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * تسجيل مصروف
   */
  recordExpense(budgetId, expense) {
    try {
      const budget = this.budgets.get(budgetId);
      if (!budget) {
        throw new Error('الميزانية غير موجودة');
      }

      const expenseRecord = {
        id: `expense_${Date.now()}`,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: new Date(),
        approvedBy: expense.approvedBy,
        receipt: expense.receipt,
      };

      budget.expenses.push(expenseRecord);
      budget.spent += expense.amount;

      return {
        success: true,
        message: 'تم تسجيل المصروف',
        expense: expenseRecord,
        remainingBudget: budget.totalBudget - budget.spent,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * حساب تقدم المشروع
   */
  calculateProjectProgress(projectId) {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود');
      }

      if (project.tasks.length === 0) {
        return { success: true, progress: 0 };
      }

      const allTasks = project.tasks.map(tId => this.tasks.get(tId));
      const completedTasks = allTasks.filter(t => t.status === 'completed').length;
      const totalProgress = allTasks.reduce((sum, t) => sum + t.progress, 0);

      const progress = Math.round(totalProgress / allTasks.length);

      return {
        success: true,
        progress,
        tasksCompleted: completedTasks,
        totalTasks: allTasks.length,
        completionPercentage: Math.round((completedTasks / allTasks.length) * 100),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * توليد تقرير المشروع
   */
  generateProjectReport(projectId) {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود');
      }

      const progress = this.calculateProjectProgress(projectId);
      const budget = Array.from(this.budgets.values()).find(b => b.projectId === projectId);
      const risks = Array.from(this.risks.values()).filter(r => r.projectId === projectId);

      const report = {
        projectId,
        projectName: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        progress: progress.progress,
        tasksCompleted: progress.tasksCompleted,
        totalTasks: progress.totalTasks,
        timeline: {
          planned: {
            start: project.startDate,
            end: project.endDate,
            duration: this.calculateDuration(project.startDate, project.endDate),
          },
          actual: {
            start: project.createdAt,
            end: null,
            duration: this.calculateDuration(project.createdAt, new Date()),
          },
        },
        budget: budget
          ? {
              total: budget.totalBudget,
              spent: budget.spent,
              remaining: budget.totalBudget - budget.spent,
              utilization: Math.round((budget.spent / budget.totalBudget) * 100),
            }
          : null,
        risks: {
          total: risks.length,
          critical: risks.filter(r => r.severity === 'critical').length,
          high: risks.filter(r => r.severity === 'high').length,
          identified: risks.filter(r => r.status === 'identified').length,
        },
        team: {
          size: project.team.length,
          manager: project.manager,
        },
        phases: project.phases.length,
        generatedAt: new Date(),
      };

      return {
        success: true,
        report,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * جدولة المشروع
   */
  getProjectSchedule(projectId) {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود');
      }

      const schedule = {
        projectId,
        name: project.name,
        phases: project.phases.map(phase => ({
          id: phase.id,
          name: phase.name,
          startDate: phase.startDate,
          endDate: phase.endDate,
          duration: this.calculateDuration(phase.startDate, phase.endDate),
          tasks: phase.tasks.length,
        })),
        milestones: project.milestones || [],
        criticalPath: this.calculateCriticalPath(projectId),
      };

      return {
        success: true,
        schedule,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * حساب مسار حرج
   */
  calculateCriticalPath(projectId) {
    const project = this.projects.get(projectId);
    if (!project) return [];

    // محاكاة حساب المسار الحرج
    const criticalTasks = project.tasks
      .map(tId => this.tasks.get(tId))
      .filter(t => t.dependencies.length === 0 || t.priority === 'high')
      .slice(0, 5);

    return criticalTasks.map(t => ({
      taskId: t.id,
      name: t.name,
      duration: this.calculateDuration(t.startDate, t.dueDate),
    }));
  }

  /**
   * حساب المدة
   */
  calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  /**
   * الحصول على جميع المشاريع
   */
  getAllProjects(filters = {}) {
    let projects = Array.from(this.projects.values());

    if (filters.status) {
      projects = projects.filter(p => p.status === filters.status);
    }

    if (filters.priority) {
      projects = projects.filter(p => p.priority === filters.priority);
    }

    if (filters.manager) {
      projects = projects.filter(p => p.manager === filters.manager);
    }

    return {
      success: true,
      total: projects.length,
      projects,
    };
  }

  /**
   * إغلاق المشروع
   */
  closeProject(projectId, closeData) {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود');
      }

      project.status = 'completed';
      project.closedAt = new Date();
      project.closureNotes = closeData.notes || '';
      project.lessons = closeData.lessons || [];
      project.deliverables = closeData.deliverables || [];
      project.updatedAt = new Date();

      return {
        success: true,
        message: 'تم إغلاق المشروع بنجاح',
        project,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================
  // WRAPPER METHODS FOR TEST COMPATIBILITY
  // ============================================

  getProject(projectId) {
    const projects = Array.from(this.projects.values());
    return projects.find(p => p.id === projectId);
  }

  updateProject(projectId, updates) {
    const project = this.getProject(projectId);
    if (!project) return null;
    const updated = { ...project, ...updates };
    this.projects.set(projectId, updated);
    return updated;
  }

  listProjects(filters = {}) {
    return Array.from(this.projects.values());
  }

  deleteProject(projectId) {
    return this.projects.delete(projectId);
  }

  validateProject(project) {
    const required = ['name', 'description', 'startDate'];
    const missing = required.filter(field => !project[field]);
    return {
      valid: missing.length === 0,
      errors: missing,
    };
  }

  getPhases(projectId) {
    const phases = Array.from(this.phases.values());
    return phases.filter(p => p.projectId === projectId);
  }

  addPhase(projectId, phase) {
    const phaseId = `phase_${Date.now()}`;
    const newPhase = { ...phase, id: phaseId, projectId };
    this.phases.set(phaseId, newPhase);
    return newPhase;
  }

  updatePhase(projectIdOrPhaseId, phaseIdOrUpdates, updatesOrNull) {
    // Support two signatures: (projectId, phaseId, updates) and (phaseId, updates)
    let phaseId, updates;
    if (updatesOrNull !== undefined) {
      // Signature 1: (projectId, phaseId, updates)
      phaseId = phaseIdOrUpdates;
      updates = updatesOrNull;
    } else {
      // Signature 2: (phaseId, updates)
      phaseId = projectIdOrPhaseId;
      updates = phaseIdOrUpdates;
    }

    const phase = this.phases.get(phaseId);
    if (!phase) return null;
    const updated = { ...phase, ...updates };
    this.phases.set(phaseId, updated);
    return updated;
  }

  deletePhase(projectIdOrPhaseId, phaseIdOrNull) {
    // Support two signatures: (projectId, phaseId) and (phaseId)
    const phaseId = phaseIdOrNull !== undefined ? phaseIdOrNull : projectIdOrPhaseId;
    return this.phases.delete(phaseId);
  }

  getPhaseProgress(projectIdOrPhaseId, phaseIdOrNull) {
    // Support two signatures: (projectId, phaseId) and (phaseId)
    const phaseId = phaseIdOrNull !== undefined ? phaseIdOrNull : projectIdOrPhaseId;
    const phase = this.phases.get(phaseId);
    if (!phase) return { percentage: 0, progress: 0 };
    return {
      percentage: phase.progress || 0,
      progress: phase.progress || 0,
      completed: (phase.progress || 0) >= 100,
      phaseId,
    };
  }

  addTask(projectId, task) {
    // Validate that project exists
    const project = this.getProject(projectId);
    if (!project) {
      return { error: 'Project not found' };
    }

    // Validate task has required fields
    if (!task || !task.title) {
      return { error: 'Task must have a title' };
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTask = {
      ...task,
      id: taskId,
      projectId,
      status: task.status || 'open', // Default to 'open' instead of 'pending'
      title: task.title,
      description: task.description || '',
      assignee: task.assignee || null,
      dueDate: task.dueDate || null,
      priority: task.priority || 'medium',
    };
    this.tasks.set(taskId, newTask);
    return newTask; // Return task directly without wrapping
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    const updated = { ...task, ...updates };
    this.tasks.set(taskId, updated);
    return updated;
  }

  listTasks(projectId) {
    const tasks = Array.from(this.tasks.values());
    return projectId ? tasks.filter(t => t.projectId === projectId) : tasks;
  }

  getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);
    return task ? { status: task.status, progress: task.progress || 0 } : null;
  }

  assignTask(projectIdOrTaskId, taskIdOrUserId, userIdOrNull) {
    // Support two signatures: (projectId, taskId, userId) and (taskId, userId)
    let taskId, userId;
    if (userIdOrNull !== undefined) {
      taskId = taskIdOrUserId;
      userId = userIdOrNull;
    } else {
      taskId = projectIdOrTaskId;
      userId = taskIdOrUserId;
    }

    const task = this.tasks.get(taskId);
    if (task) {
      task.assignedTo = userId;
      task.assignee = userId;
      return task;
    }
    return null;
  }

  addTaskDependency(projectId, taskId, dependencyTaskId) {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (!task.dependencies) {
      task.dependencies = [];
    }

    if (!task.dependencies.includes(dependencyTaskId)) {
      task.dependencies.push(dependencyTaskId);
    }

    this.tasks.set(taskId, task);
    return task;
  }

  getTaskProgress(projectId, taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return { percentage: 0 };

    if (task.subtasks && task.subtasks.length > 0) {
      const completed = task.subtasks.filter(st => st.status === 'completed').length;
      const percentage = Math.round((completed / task.subtasks.length) * 100);
      return { percentage, completed, total: task.subtasks.length };
    }

    return { percentage: task.progress || 0 };
  }

  deleteTask(projectId, taskId) {
    return this.tasks.delete(taskId);
  }

  getProjectStatus(projectId) {
    const project = this.getProject(projectId);
    const phases = this.getPhases(projectId);
    const avgProgress = phases.reduce((sum, p) => sum + (p.progress || 0), 0) / (phases.length || 1);

    return {
      projectId,
      name: project?.name || '',
      progress: Math.round(avgProgress),
      status: avgProgress >= 100 ? 'completed' : avgProgress > 0 ? 'in-progress' : 'pending',
      phases: phases.length,
    };
  }

  getTasks(projectId, filters = {}) {
    if (!projectId) {
      return Array.from(this.tasks.values());
    }
    let tasks = Array.from(this.tasks.values()).filter(task => task.projectId === projectId);

    // Apply status filter if provided
    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status);
    }

    return tasks;
  }

  // Resource Allocation Methods
  allocateResource(projectIdOrResource, resourceOrNull) {
    // Support two signatures: (projectId, resource) and (resource)
    let projectId, resource;
    if (resourceOrNull !== undefined) {
      projectId = projectIdOrResource;
      resource = resourceOrNull;
    } else {
      projectId = projectIdOrResource.projectId;
      resource = projectIdOrResource;
    }

    const resourceId = `resource_${Date.now()}`;
    const allocated = { ...resource, id: resourceId, projectId, allocatedAt: new Date() };
    if (!this.resources) this.resources = new Map();
    this.resources.set(resourceId, allocated);
    return allocated;
  }

  getProjectResources(projectId) {
    if (!this.resources) return [];
    return Array.from(this.resources.values()).filter(r => r.projectId === projectId);
  }

  getResources(projectId) {
    return this.getProjectResources(projectId);
  }

  updateResourceAllocation(projectIdOrResourceId, resourceIdOrUpdates, updatesOrAllocation) {
    // Support signatures: (projectId, resourceId, allocation) or (resourceId, updates)
    if (!this.resources) this.resources = new Map();

    let resource, updated;

    if (typeof resourceIdOrUpdates === 'object') {
      // (resourceId, updates) signature
      const resourceId = projectIdOrResourceId;
      resource = this.resources.get(resourceId);
      if (!resource) return null;
      updated = { ...resource, ...resourceIdOrUpdates };
    } else {
      // (projectId, resourceId, allocation) signature
      const resourceId = resourceIdOrUpdates;
      resource = this.resources.get(resourceId);
      if (!resource) return null;
      updated = { ...resource, allocation: updatesOrAllocation };
    }

    this.resources.set(updated.id, updated);
    return updated;
  }

  checkResourceAvailability(projectId) {
    if (!this.resources) return { totalAllocation: 0 };
    const resources = Array.from(this.resources.values()).filter(r => r.projectId === projectId);
    const totalAllocation = resources.reduce((sum, r) => sum + (r.allocation || 0), 0);
    return {
      totalAllocation,
      available: totalAllocation < 100,
      resources: resources.length,
      utilizationRate: (totalAllocation / 100) * 100,
    };
  }

  removeResourceFromProject(resourceId) {
    if (!this.resources) return false;
    return this.resources.delete(resourceId);
  }

  removeResource(projectId, resourceId) {
    // Wrapper that accepts projectId and resourceId
    return this.removeResourceFromProject(resourceId);
  }

  // Risk Management Methods
  addRisk(projectId, risk) {
    if (!this.risks) this.risks = new Map();
    const riskId = `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate severity based on probability and impact
    let severity = 'low';
    if (risk.probability === 'high' && risk.impact === 'high') {
      severity = 'critical';
    } else if (risk.probability === 'high' || risk.impact === 'high') {
      severity = 'high';
    } else if (risk.probability === 'medium' || risk.impact === 'medium') {
      severity = 'medium';
    }

    const newRisk = {
      ...risk,
      id: riskId,
      projectId,
      status: 'active',
      severity: risk.severity || severity,
      createdAt: new Date(),
    };
    this.risks.set(riskId, newRisk);
    return newRisk;
  }

  identifyProjectRisks(projectId) {
    // Analyze project and identify potential risks
    const project = this.getProject(projectId);
    if (!project) return [];

    const risks = [];

    // Check budget risk
    if (project.budget < 50000) {
      risks.push({
        type: 'budget',
        severity: 'medium',
        description: 'Low budget may impact project delivery',
      });
    }

    // Check timeline risk
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const duration = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (duration < 30) {
      risks.push({
        type: 'timeline',
        severity: 'high',
        description: 'Short timeline may lead to rushed delivery',
      });
    }

    return risks;
  }

  getRiskSeverity(projectIdOrRiskId, riskIdOrNull) {
    // Support two signatures: (projectId, riskId) and (riskId)
    const riskId = riskIdOrNull !== undefined ? riskIdOrNull : projectIdOrRiskId;

    if (!this.risks) return 'unknown';
    const risk = this.risks.get(riskId);
    if (!risk) return 'unknown';

    // Return severity string directly
    return risk.severity || 'medium';
  }

  updateRiskStatus(projectIdOrRiskId, riskIdOrStatus, statusOrNull) {
    // Support two signatures: (projectId, riskId, status) and (riskId, status)
    let riskId, status;
    if (statusOrNull !== undefined) {
      riskId = riskIdOrStatus;
      status = statusOrNull;
    } else {
      riskId = projectIdOrRiskId;
      status = riskIdOrStatus;
    }

    if (!this.risks) this.risks = new Map();
    const risk = this.risks.get(riskId);
    if (!risk) return null;
    risk.status = status;
    this.risks.set(riskId, risk);
    return risk;
  }

  listProjectRisks(projectId) {
    if (!this.risks) return [];
    return Array.from(this.risks.values()).filter(r => r.projectId === projectId);
  }

  getRisks(projectId) {
    return this.listProjectRisks(projectId);
  }

  deleteRisk(projectIdOrRiskId, riskIdOrNull) {
    // Support two signatures: (projectId, riskId) and (riskId)
    const riskId = riskIdOrNull !== undefined ? riskIdOrNull : projectIdOrRiskId;

    if (!this.risks) return false;
    return this.risks.delete(riskId);
  }

  // Budget Management Methods
  createBudget(projectId, budgetData) {
    if (!this.budgets) this.budgets = new Map();
    const budgetId = `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalAmount = budgetData.totalAmount || budgetData.amount || 0;
    const budget = {
      id: budgetId,
      projectId,
      amount: totalAmount,
      totalAmount: totalAmount,
      currency: budgetData.currency || 'USD',
      expenses: [],
      allocations: budgetData.allocations || [],
      createdAt: new Date(),
    };
    this.budgets.set(budgetId, budget);
    return budget;
  }

  recordExpense(projectIdOrBudgetId, budgetIdOrExpense, expenseDataOrNull) {
    // Support signatures: (projectId, budgetId, expenseData) or (projectId, expenseData)
    if (!this.budgets) this.budgets = new Map();

    let projectId, budgetId, expenseData;

    if (expenseDataOrNull !== undefined) {
      // (projectId, budgetId, expenseData) signature
      projectId = projectIdOrBudgetId;
      budgetId = budgetIdOrExpense;
      expenseData = expenseDataOrNull;
    } else {
      // (projectId, expenseData) signature
      projectId = projectIdOrBudgetId;
      budgetId = null;
      expenseData = budgetIdOrExpense;
    }

    const budgets = Array.from(this.budgets.values());
    let budget = budgetId ? budgets.find(b => b.id === budgetId) : budgets.find(b => b.projectId === projectId);

    // Create budget if it doesn't exist
    if (!budget) {
      const newBudgetId = `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      budget = {
        id: newBudgetId,
        projectId,
        amount: 0,
        expenses: [],
        createdAt: new Date(),
      };
      this.budgets.set(newBudgetId, budget);
    }

    const expenseRecord = {
      id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: expenseData.amount || 0,
      description: expenseData.description || '',
      category: expenseData.category || 'general',
      date: new Date(),
    };

    budget.expenses.push(expenseRecord);
    this.budgets.set(budget.id, budget);
    return expenseRecord;
  }

  getBudgetUsage(projectIdOrBudgetId, budgetIdOrNull) {
    // Support signatures: (projectId, budgetId) or (projectId)
    let projectId, budgetId;

    if (budgetIdOrNull !== undefined) {
      // (projectId, budgetId) signature
      projectId = projectIdOrBudgetId;
      budgetId = budgetIdOrNull;
    } else {
      // (projectId) signature - use the first budget for project
      projectId = projectIdOrBudgetId;
      budgetId = null;
    }

    if (!this.budgets) return { usage: 0, percentage: 0, overBudget: false, remaining: 0 };
    const budgets = Array.from(this.budgets.values());
    const budget = budgetId ? budgets.find(b => b.id === budgetId) : budgets.find(b => b.projectId === projectId);

    if (!budget) return { usage: 0, percentage: 0, overBudget: false, remaining: 0 };

    const totalExpenses = budget.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const percentage = budget.amount > 0 ? (totalExpenses / budget.amount) * 100 : 0;

    return {
      total: budget.amount,
      spent: totalExpenses,
      remaining: budget.amount - totalExpenses,
      percentage: Math.round(percentage),
      usage: totalExpenses,
      overBudget: percentage > 100,
    };
  }

  getBudgetReport(projectId) {
    const usage = this.getBudgetUsage(projectId);
    const budgets = Array.from(this.budgets.values());
    const budget = budgets.find(b => b.projectId === projectId);

    // Calculate by category
    const byCategory = {};
    if (budget?.expenses) {
      budget.expenses.forEach(exp => {
        const category = exp.category || 'general';
        byCategory[category] = (byCategory[category] || 0) + (exp.amount || 0);
      });
    }

    return {
      projectId,
      budget: budget?.amount || 0,
      totalExpenses: usage.spent,
      spent: usage.spent,
      remaining: usage.remaining,
      percentage: usage.percentage,
      status: usage.percentage > 100 ? 'overbudget' : usage.percentage > 80 ? 'warning' : 'ok',
      expenses: budget?.expenses || [],
      byCategory,
    };
  }

  checkBudgetOverrun(projectId) {
    const usage = this.getBudgetUsage(projectId);
    return {
      isOverrun: usage.percentage > 100,
      percentage: usage.percentage,
      amount: usage.spent - usage.total,
      warning: usage.percentage > 80,
    };
  }

  // Project Progress & Analytics
  calculateProjectProgress(projectId) {
    const project = this.getProject(projectId);
    const phases = this.getPhases(projectId);
    const tasks = this.getTasks(projectId);

    const phaseProgress = phases.reduce((sum, p) => sum + (p.progress || 0), 0) / (phases.length || 1);
    const taskProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / (tasks.length || 1);

    const overallProgress = phases.length > 0 ? phaseProgress : taskProgress;

    return {
      projectId,
      overall: Math.round(overallProgress),
      phases: Math.round(phaseProgress),
      tasks: Math.round(taskProgress),
      completed: overallProgress >= 100,
    };
  }

  getProjectProgress(projectId) {
    const result = this.calculateProjectProgress(projectId);
    return {
      percentage: result.overall,
      ...result,
    };
  }

  getProjectTimeline(projectId) {
    const project = this.getProject(projectId);
    const phases = this.getPhases(projectId);

    return {
      projectId,
      start: project?.startDate,
      end: project?.endDate,
      phases: phases.map(p => ({
        name: p.name,
        start: p.startDate,
        end: p.endDate,
        progress: p.progress || 0,
      })),
    };
  }

  generateProjectReport(projectId) {
    const project = this.getProject(projectId);
    const progress = this.calculateProjectProgress(projectId);
    const budget = this.getBudgetReport(projectId);
    const risks = this.listProjectRisks(projectId);
    const tasks = this.getTasks(projectId);

    return {
      project: {
        id: projectId,
        name: project?.name,
        status: project?.status,
      },
      progress,
      budget,
      risks: risks.length,
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        pending: tasks.filter(t => t.status !== 'completed').length,
      },
      summary: {
        projectName: project?.name,
        overallProgress: progress.overall,
        budgetStatus: budget.status,
        riskCount: risks.length,
      },
      metrics: {
        progressPercentage: progress.overall,
        budgetUtilization: budget.percentage,
        taskCompletionRate: tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0,
      },
      generatedAt: new Date(),
    };
  }

  getProjectHealth(projectId) {
    const progress = this.calculateProjectProgress(projectId);
    const budget = this.checkBudgetOverrun(projectId);
    const risks = this.listProjectRisks(projectId);
    const activeRisks = risks.filter(r => r.status === 'active' && r.severity === 'high');

    let status = 'green'; // Changed from 'healthy' to 'green'
    if (budget.isOverrun || activeRisks.length > 2) {
      status = 'red'; // Changed from 'critical' to 'red'
    } else if (budget.warning || activeRisks.length > 0 || progress.overall < 30) {
      status = 'yellow'; // Changed from 'at-risk' to 'yellow'
    }

    return {
      projectId,
      status,
      health: status, // Keep both for compatibility
      score: budget.isOverrun ? 40 : budget.warning ? 70 : 90,
      factors: {
        budget: budget.warning ? 'warning' : 'ok',
        risks: activeRisks.length > 0 ? 'warning' : 'ok',
        progress: progress.overall >= 50 ? 'ok' : 'behind',
      },
    };
  }

  // Project Closure
  closeProject(projectId) {
    const project = this.getProject(projectId);
    if (!project) return null;

    project.status = 'closed'; // Changed from 'completed' to 'closed'
    project.completedAt = new Date();
    this.projects.set(projectId, project);

    return project;
  }

  generateClosureReport(projectId) {
    const project = this.getProject(projectId);
    const report = this.generateProjectReport(projectId);
    const progress = this.calculateProjectProgress(projectId);

    const closureReport = {
      ...report,
      closureDate: new Date(),
      finalStatus: project?.status,
      completionPercentage: progress.overall || 0,
      lessonsLearned: [],
      lessons: [], // Add lessons as alias
      achievements: [],
    };

    return closureReport;
  }

  getClosureReport(projectId) {
    return this.generateClosureReport(projectId);
  }

  archiveProject(projectId) {
    const project = this.getProject(projectId);
    if (!project) return false;

    project.status = 'archived'; // Set status to 'archived'
    project.archived = true;
    project.archivedAt = new Date();
    this.projects.set(projectId, project);

    return project; // Return the project instead of true
  }
}

module.exports = ProjectManagementService;
