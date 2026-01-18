/**
 * Project Management Service Tests
 * اختبارات خدمة إدارة المشاريع
 *
 * 45+ اختبار شامل
 */

const ProjectManagementService = require('../../services/projectManagementService');
const assert = require('assert');

describe('ProjectManagementService Tests', () => {
  let projectService;
  let sampleProject;

  beforeEach(() => {
    projectService = new ProjectManagementService();
    sampleProject = {
      name: 'Test Project',
      description: 'Test description',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      budget: 100000,
    };
  });

  // ============================================
  // PROJECT CRUD TESTS
  // ============================================
  describe('Project CRUD Operations', () => {
    test('should create project', () => {
      const result = projectService.createProject(sampleProject);
      assert(result.id, 'Should have project ID');
      assert(result.name === sampleProject.name);
      assert(result.status === 'active');
    });

    test('should retrieve project by ID', () => {
      const created = projectService.createProject(sampleProject);
      const retrieved = projectService.getProject(created.id);
      assert(retrieved.name === sampleProject.name);
    });

    test('should update project', () => {
      const created = projectService.createProject(sampleProject);
      const updated = projectService.updateProject(created.id, {
        status: 'completed',
      });
      assert(updated.status === 'completed');
    });

    test('should list all projects', () => {
      projectService.createProject(sampleProject);
      projectService.createProject({ ...sampleProject, name: 'Project 2' });

      const projects = projectService.listProjects();
      assert(projects.length >= 2);
    });

    test('should delete project', () => {
      const created = projectService.createProject(sampleProject);
      const deleted = projectService.deleteProject(created.id);
      assert(deleted, 'Should delete project');
    });

    test('should validate project data', () => {
      const invalid = { name: '', description: 'test' };
      const result = projectService.validateProject(invalid);
      assert(!result.valid, 'Should identify invalid project');
    });
  });

  // ============================================
  // PHASE MANAGEMENT TESTS
  // ============================================
  describe('Phase Management', () => {
    test('should add phase to project', () => {
      const project = projectService.createProject(sampleProject);
      const phase = projectService.addPhase(project.id, {
        name: 'Phase 1',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      });

      assert(phase.id, 'Should have phase ID');
      assert(phase.name === 'Phase 1');
    });

    test('should list project phases', () => {
      const project = projectService.createProject(sampleProject);
      projectService.addPhase(project.id, {
        name: 'Phase 1',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      });

      const phases = projectService.getPhases(project.id);
      assert(phases.length > 0);
    });

    test('should update phase', () => {
      const project = projectService.createProject(sampleProject);
      const phase = projectService.addPhase(project.id, {
        name: 'Phase 1',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      });

      const updated = projectService.updatePhase(project.id, phase.id, {
        status: 'completed',
      });

      assert(updated.status === 'completed');
    });

    test('should delete phase', () => {
      const project = projectService.createProject(sampleProject);
      const phase = projectService.addPhase(project.id, {
        name: 'Phase 1',
      });

      const deleted = projectService.deletePhase(project.id, phase.id);
      assert(deleted);
    });

    test('should calculate phase progress', () => {
      const project = projectService.createProject(sampleProject);
      const phase = projectService.addPhase(project.id, {
        name: 'Phase 1',
      });

      const progress = projectService.getPhaseProgress(project.id, phase.id);
      assert(progress.percentage >= 0 && progress.percentage <= 100);
    });
  });

  // ============================================
  // TASK MANAGEMENT TESTS
  // ============================================
  describe('Task Management', () => {
    test('should create task in project', () => {
      const project = projectService.createProject(sampleProject);
      const task = projectService.addTask(project.id, {
        title: 'Task 1',
        description: 'Task description',
        assignee: 'user@example.com',
        dueDate: '2024-01-15',
        priority: 'high',
      });

      assert(task.id, 'Should have task ID');
      assert(task.status === 'todo');
    });

    test('should update task status', () => {
      const project = projectService.createProject(sampleProject);
      const task = projectService.addTask(project.id, {
        title: 'Task 1',
      });

      const updated = projectService.updateTaskStatus(project.id, task.id, 'in_progress');

      assert(updated.status === 'in_progress');
    });

    test('should list project tasks', () => {
      const project = projectService.createProject(sampleProject);
      projectService.addTask(project.id, { title: 'Task 1' });
      projectService.addTask(project.id, { title: 'Task 2' });

      const tasks = projectService.getTasks(project.id);
      assert(tasks.length >= 2);
    });

    test('should filter tasks by status', () => {
      const project = projectService.createProject(sampleProject);
      const task1 = projectService.addTask(project.id, { title: 'Task 1' });
      projectService.updateTaskStatus(project.id, task1.id, 'completed');
      projectService.addTask(project.id, { title: 'Task 2' });

      const openTasks = projectService.getTasks(project.id, { status: 'todo' });
      assert(openTasks.length >= 1);
    });

    test('should assign tasks', () => {
      const project = projectService.createProject(sampleProject);
      const task = projectService.addTask(project.id, {
        title: 'Task 1',
      });

      const assigned = projectService.assignTask(project.id, task.id, 'user@example.com');

      assert(assigned.assignee === 'user@example.com');
    });

    test('should set task dependencies', () => {
      const project = projectService.createProject(sampleProject);
      const task1 = projectService.addTask(project.id, { title: 'Task 1' });
      const task2 = projectService.addTask(project.id, { title: 'Task 2' });

      const result = projectService.addTaskDependency(project.id, task2.id, task1.id);

      assert(result.dependencies.includes(task1.id));
    });

    test('should calculate task progress', () => {
      const project = projectService.createProject(sampleProject);
      const task = projectService.addTask(project.id, {
        title: 'Task 1',
        subtasks: [
          { title: 'Subtask 1', status: 'completed' },
          { title: 'Subtask 2', status: 'open' },
        ],
      });

      const progress = projectService.getTaskProgress(project.id, task.id);
      assert(progress.percentage === 50);
    });

    test('should delete task', () => {
      const project = projectService.createProject(sampleProject);
      const task = projectService.addTask(project.id, { title: 'Task 1' });

      const deleted = projectService.deleteTask(project.id, task.id);
      assert(deleted);
    });
  });

  // ============================================
  // RESOURCE ALLOCATION TESTS
  // ============================================
  describe('Resource Allocation', () => {
    test('should allocate resource to project', () => {
      const project = projectService.createProject(sampleProject);
      const resource = projectService.allocateResource(project.id, {
        name: 'Developer',
        email: 'dev@example.com',
        allocation: 80,
        role: 'backend',
      });

      assert(resource.id, 'Should have resource ID');
    });

    test('should get project resources', () => {
      const project = projectService.createProject(sampleProject);
      projectService.allocateResource(project.id, {
        name: 'Developer',
        allocation: 80,
      });

      const resources = projectService.getResources(project.id);
      assert(resources.length > 0);
    });

    test('should update resource allocation', () => {
      const project = projectService.createProject(sampleProject);
      const resource = projectService.allocateResource(project.id, {
        name: 'Developer',
        allocation: 80,
      });

      const updated = projectService.updateResourceAllocation(project.id, resource.id, 100);

      assert(updated.allocation === 100);
    });

    test('should check resource availability', () => {
      const project = projectService.createProject(sampleProject);
      projectService.allocateResource(project.id, {
        name: 'Developer',
        allocation: 80,
      });

      const available = projectService.checkResourceAvailability(project.id);
      assert(available.totalAllocation <= 100);
    });

    test('should remove resource from project', () => {
      const project = projectService.createProject(sampleProject);
      const resource = projectService.allocateResource(project.id, {
        name: 'Developer',
      });

      const removed = projectService.removeResource(project.id, resource.id);
      assert(removed);
    });
  });

  // ============================================
  // RISK MANAGEMENT TESTS
  // ============================================
  describe('Risk Management', () => {
    test('should identify project risks', () => {
      const project = projectService.createProject(sampleProject);
      const risk = projectService.addRisk(project.id, {
        title: 'Budget Risk',
        description: 'Potential budget overrun',
        probability: 'high',
        impact: 'high',
        mitigation: 'Monitor spending',
      });

      assert(risk.id, 'Should have risk ID');
    });

    test('should get risk severity', () => {
      const project = projectService.createProject(sampleProject);
      const risk = projectService.addRisk(project.id, {
        title: 'Risk',
        probability: 'high',
        impact: 'high',
      });

      const severity = projectService.getRiskSeverity(project.id, risk.id);
      assert(severity === 'critical' || severity === 'high');
    });

    test('should update risk status', () => {
      const project = projectService.createProject(sampleProject);
      const risk = projectService.addRisk(project.id, {
        title: 'Risk',
      });

      const updated = projectService.updateRiskStatus(project.id, risk.id, 'mitigated');

      assert(updated.status === 'mitigated');
    });

    test('should list project risks', () => {
      const project = projectService.createProject(sampleProject);
      projectService.addRisk(project.id, { title: 'Risk 1' });
      projectService.addRisk(project.id, { title: 'Risk 2' });

      const risks = projectService.getRisks(project.id);
      assert(risks.length >= 2);
    });

    test('should delete risk', () => {
      const project = projectService.createProject(sampleProject);
      const risk = projectService.addRisk(project.id, { title: 'Risk' });

      const deleted = projectService.deleteRisk(project.id, risk.id);
      assert(deleted);
    });
  });

  // ============================================
  // BUDGET MANAGEMENT TESTS
  // ============================================
  describe('Budget Management', () => {
    test('should create project budget', () => {
      const project = projectService.createProject(sampleProject);
      const budget = projectService.createBudget(project.id, {
        totalAmount: 100000,
        currency: 'USD',
      });

      assert(budget.id, 'Should have budget ID');
      assert(budget.totalAmount === 100000);
    });

    test('should record budget expense', () => {
      const project = projectService.createProject(sampleProject);
      const budget = projectService.createBudget(project.id, {
        totalAmount: 100000,
      });

      const expense = projectService.recordExpense(project.id, budget.id, {
        category: 'development',
        amount: 5000,
        description: 'Development costs',
      });

      assert(expense.id, 'Should have expense ID');
    });

    test('should calculate budget usage', () => {
      const project = projectService.createProject(sampleProject);
      const budget = projectService.createBudget(project.id, {
        totalAmount: 100000,
      });

      projectService.recordExpense(project.id, budget.id, {
        amount: 25000,
      });

      const usage = projectService.getBudgetUsage(project.id, budget.id);
      assert(usage.percentage === 25);
      assert(usage.remaining === 75000);
    });

    test('should get budget report', () => {
      const project = projectService.createProject(sampleProject);
      const budget = projectService.createBudget(project.id, {
        totalAmount: 100000,
      });

      projectService.recordExpense(project.id, budget.id, {
        category: 'dev',
        amount: 30000,
      });

      const report = projectService.getBudgetReport(project.id, budget.id);
      assert(report.totalExpenses === 30000);
      assert(report.byCategory.dev === 30000);
    });

    test('should warn on budget overrun', () => {
      const project = projectService.createProject(sampleProject);
      const budget = projectService.createBudget(project.id, {
        totalAmount: 100000,
      });

      projectService.recordExpense(project.id, budget.id, {
        amount: 100000,
      });

      projectService.recordExpense(project.id, budget.id, {
        amount: 5000,
      });

      const usage = projectService.getBudgetUsage(project.id, budget.id);
      assert(usage.overBudget === true);
    });
  });

  // ============================================
  // PROJECT PROGRESS & ANALYTICS
  // ============================================
  describe('Project Progress & Analytics', () => {
    test('should calculate project progress', () => {
      const project = projectService.createProject(sampleProject);
      const task1 = projectService.addTask(project.id, { title: 'Task 1' });
      const task2 = projectService.addTask(project.id, { title: 'Task 2' });

      projectService.updateTaskStatus(project.id, task1.id, 'completed');

      const progress = projectService.getProjectProgress(project.id);
      assert(progress.percentage === 50);
    });

    test('should get project timeline', () => {
      const project = projectService.createProject(sampleProject);
      projectService.addPhase(project.id, {
        name: 'Phase 1',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      });

      const timeline = projectService.getProjectTimeline(project.id);
      assert(timeline.phases.length > 0);
    });

    test('should generate project report', () => {
      const project = projectService.createProject(sampleProject);
      projectService.addTask(project.id, { title: 'Task 1' });

      const report = projectService.generateProjectReport(project.id);
      assert(report.summary, 'Should have summary');
      assert(report.metrics, 'Should have metrics');
    });

    test('should get project health status', () => {
      const project = projectService.createProject(sampleProject);

      const health = projectService.getProjectHealth(project.id);
      assert(['green', 'yellow', 'red'].includes(health.status));
    });
  });

  // ============================================
  // PROJECT CLOSURE
  // ============================================
  describe('Project Closure', () => {
    test('should close completed project', () => {
      const project = projectService.createProject(sampleProject);

      const closed = projectService.closeProject(project.id, {
        closureDate: new Date(),
        reason: 'Completed successfully',
      });

      assert(closed.status === 'closed');
    });

    test('should generate closure report', () => {
      const project = projectService.createProject(sampleProject);
      projectService.addTask(project.id, { title: 'Task 1' });

      const report = projectService.getClosureReport(project.id);
      assert(report.completionPercentage >= 0);
      assert(report.lessons, 'Should have lessons learned');
    });

    test('should archive closed project', () => {
      const project = projectService.createProject(sampleProject);
      projectService.closeProject(project.id, {});

      const archived = projectService.archiveProject(project.id);
      assert(archived.status === 'archived');
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================
  describe('Error Handling', () => {
    test('should handle invalid project data', () => {
      const result = projectService.createProject(null);
      assert(result.error || !result.id, 'Should handle invalid data');
    });

    test('should handle missing required fields', () => {
      const result = projectService.createProject({
        name: 'Test',
        // Missing other required fields
      });
      assert(result.error || result.id, 'Should handle missing fields');
    });

    test('should prevent tasks without project', () => {
      const result = projectService.addTask('invalid-id', { title: 'Task' });
      assert(result.error, 'Should prevent invalid project');
    });
  });

  // ============================================
  // PERFORMANCE TESTS
  // ============================================
  describe('Performance', () => {
    test('should handle large number of tasks', () => {
      const project = projectService.createProject(sampleProject);

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        projectService.addTask(project.id, { title: `Task ${i}` });
      }
      const duration = Date.now() - start;

      const tasks = projectService.getTasks(project.id);
      assert(tasks.length === 1000);
      assert(duration < 10000, 'Should handle 1000 tasks within 10 seconds');
    });

    test('should generate report efficiently', () => {
      const project = projectService.createProject(sampleProject);
      for (let i = 0; i < 100; i++) {
        projectService.addTask(project.id, { title: `Task ${i}` });
      }

      const start = Date.now();
      const report = projectService.generateProjectReport(project.id);
      const duration = Date.now() - start;

      assert(report, 'Should generate report');
      assert(duration < 1000, 'Should generate within 1 second');
    });
  });
});
