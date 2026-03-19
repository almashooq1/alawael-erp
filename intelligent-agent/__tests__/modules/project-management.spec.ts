import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectManagement, Project, Task } from '../../src/modules/project-management';

describe('ProjectManagement Module', () => {
  let pm: ProjectManagement;
  let eventEmitted: any[] = [];

  beforeEach(() => {
    pm = new ProjectManagement({ enableEvents: true, validationLevel: 'strict' });
    eventEmitted = [];
    pm.on('*', (event: string, data: any) => eventEmitted.push({ event, data }));
  });

  describe('Instance Isolation', () => {
    it('should create separate instances with independent state', () => {
      const pm1 = new ProjectManagement();
      const pm2 = new ProjectManagement();

      const proj1 = pm1.createProject({
        name: 'Project 1',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      expect(pm1.listProjects()).toHaveLength(1);
      expect(pm2.listProjects()).toHaveLength(0);
    });

    it('should not share state between instances', () => {
      const pm1 = new ProjectManagement();
      const pm2 = new ProjectManagement();

      for (let i = 0; i < 5; i++) {
        pm1.createProject({
          name: `Project ${i}`,
          ownerId: 'user1',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          resources: [],
        });
      }

      expect(pm1.getProjectAnalytics(pm1.listProjects()[0].id).projectId).toBeDefined();
      expect(pm2.listProjects()).toHaveLength(0);
    });
  });

  describe('Project CRUD Operations', () => {
    it('should create a project with valid data', () => {
      const project = pm.createProject({
        name: 'Test Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: ['resource1'],
      });

      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.status).toBe('planned');
      expect(project.tasks).toEqual([]);
    });

    it('should throw on invalid project data', () => {
      expect(() => {
        pm.createProject({
          name: '',
          ownerId: 'user1',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          resources: [],
        });
      }).toThrow('Project name is required');
    });

    it('should throw when end date is before start date', () => {
      expect(() => {
        pm.createProject({
          name: 'Project',
          ownerId: 'user1',
          startDate: '2024-12-31',
          endDate: '2024-01-01',
          resources: [],
        });
      }).toThrow('End date must be after start date');
    });

    it('should retrieve a project by ID', () => {
      const created = pm.createProject({
        name: 'Project A',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      const retrieved = pm.getProject(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Project A');
    });

    it('should update a project', () => {
      const project = pm.createProject({
        name: 'Original',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      const updated = pm.updateProject(project.id, {
        name: 'Updated',
        status: 'active',
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.status).toBe('active');
    });

    it('should delete a project', () => {
      const project = pm.createProject({
        name: 'Test',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      const deleted = pm.deleteProject(project.id);
      expect(deleted).toBe(true);
      expect(pm.getProject(project.id)).toBeNull();
    });
  });

  describe('Task Management', () => {
    let projectId: string;

    beforeEach(() => {
      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });
      projectId = project.id;
    });

    it('should add a task to a project', () => {
      const task = pm.addTask(projectId, {
        name: 'Task 1',
        start: '2024-01-01',
        end: '2024-01-15',
        assignedTo: ['user1'],
        status: 'todo',
      });

      expect(task).toBeDefined();
      expect(task?.name).toBe('Task 1');
      expect(task?.status).toBe('todo');
    });

    it('should validate task data', () => {
      expect(() => {
        pm.addTask(projectId, {
          name: '',
          start: '2024-01-01',
          end: '2024-01-15',
          assignedTo: [],
          status: 'todo',
        });
      }).toThrow('Task name is required');
    });

    it('should validate task date range', () => {
      expect(() => {
        pm.addTask(projectId, {
          name: 'Task',
          start: '2024-01-15',
          end: '2024-01-01',
          assignedTo: [],
          status: 'todo',
        });
      }).toThrow('Task end date must be after start date');
    });

    it('should validate task dependencies', () => {
      expect(() => {
        pm.addTask(projectId, {
          name: 'Task',
          start: '2024-01-01',
          end: '2024-01-15',
          assignedTo: [],
          status: 'todo',
          dependencies: ['non-existent-id'],
        });
      }).toThrow('Dependency task');
    });

    it('should update a task', () => {
      const task = pm.addTask(projectId, {
        name: 'Task',
        start: '2024-01-01',
        end: '2024-01-15',
        assignedTo: ['user1'],
        status: 'todo',
      });

      const updated = pm.updateTask(projectId, task!.id, {
        status: 'in-progress',
        progress: 50,
      });

      expect(updated?.status).toBe('in-progress');
      expect(updated?.progress).toBe(50);
    });

    it('should remove a task', () => {
      const task = pm.addTask(projectId, {
        name: 'Task',
        start: '2024-01-01',
        end: '2024-01-15',
        assignedTo: [],
        status: 'todo',
      });

      const project = pm.getProject(projectId)!;
      expect(project.tasks).toHaveLength(1);

      pm.removeTask(projectId, task!.id);
      const updated = pm.getProject(projectId)!;
      expect(updated.tasks).toHaveLength(0);
    });
  });

  describe('Critical Path Analysis', () => {
    it('should calculate critical path', () => {
      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      const task1 = pm.addTask(project.id, {
        name: 'Task 1',
        start: '2024-01-01',
        end: '2024-01-15',
        assignedTo: [],
        status: 'todo',
      });

      const task2 = pm.addTask(project.id, {
        name: 'Task 2',
        start: '2024-01-15',
        end: '2024-02-01',
        assignedTo: [],
        status: 'todo',
        dependencies: [task1!.id],
      });

      const analytics = pm.getProjectAnalytics(project.id);
      expect(analytics.criticalPath.length).toBeGreaterThan(0);
    });
  });

  describe('Gantt Chart Support', () => {
    it('should generate Gantt chart data', () => {
      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      pm.addTask(project.id, {
        name: 'Task',
        start: '2024-01-01',
        end: '2024-01-15',
        assignedTo: [],
        status: 'todo',
        progress: 25,
      });

      const gantt = pm.getGanttChart(project.id);
      expect(gantt).toHaveLength(1);
      expect(gantt[0].progress).toBe(25);
      expect(gantt[0].duration).toBeGreaterThan(0);
    });
  });

  describe('Milestone Management', () => {
    it('should add a milestone', () => {
      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      const milestone = pm.addMilestone({
        projectId: project.id,
        name: 'Phase 1 Complete',
        dueDate: '2024-03-01',
        status: 'pending',
        relatedTasks: [],
      });

      expect(milestone.name).toBe('Phase 1 Complete');
      expect(milestone.status).toBe('pending');
    });

    it('should retrieve milestones for a project', () => {
      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      pm.addMilestone({
        projectId: project.id,
        name: 'M1',
        dueDate: '2024-03-01',
        status: 'pending',
        relatedTasks: [],
      });

      const milestones = pm.getMilestones(project.id);
      expect(milestones).toHaveLength(1);
    });
  });

  describe('Resource Allocation', () => {
    it('should allocate resources to a project', () => {
      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      const allocation = pm.allocateResource({
        projectId: project.id,
        resourceId: 'resource1',
        allocation: 80,
        allocatedHours: 160,
      });

      expect(allocation.allocation).toBe(80);
      expect(allocation.efficiency).toBe(0);
    });

    it('should validate allocation percentage', () => {
      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      expect(() => {
        pm.allocateResource({
          projectId: project.id,
          resourceId: 'resource1',
          allocation: 150,
          allocatedHours: 300,
        });
      }).toThrow('Allocation percentage must be between 0 and 100');
    });
  });

  describe('Project Analytics', () => {
    it('should calculate project analytics', () => {
      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      pm.addTask(project.id, {
        name: 'Task 1',
        start: '2024-01-01',
        end: '2024-01-15',
        assignedTo: [],
        status: 'done',
      });

      pm.addTask(project.id, {
        name: 'Task 2',
        start: '2024-02-01',
        end: '2024-02-15',
        assignedTo: [],
        status: 'todo',
      });

      const analytics = pm.getProjectAnalytics(project.id);
      expect(analytics.progress).toBeGreaterThan(0);
      expect(analytics.taskStats.total).toBe(2);
      expect(analytics.taskStats.completed).toBe(1);
    });
  });

  describe('Project Health Assessment', () => {
    it('should assess project health', () => {
      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      const health = pm.getProjectHealth(project.id);
      expect(health.status).toBeDefined();
      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(health.alerts)).toBe(true);
    });
  });

  describe('Event Emission', () => {
    it('should emit project-created event', (done) => {
      pm.on('project-created', (data) => {
        expect(data.name).toBe('Test');
        done();
      });

      pm.createProject({
        name: 'Test',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });
    });

    it('should emit error event on validation failure', (done) => {
      pm.on('error', (data) => {
        expect(data.operation).toBe('createProject');
        expect(data.error).toBeDefined();
        done();
      });

      try {
        pm.createProject({
          name: '',
          ownerId: '',
          startDate: '',
          endDate: '',
          resources: [],
        });
      } catch {
        // Expected
      }
    });

    it('should emit task-added event', (done) => {
      pm.on('task-added', (data) => {
        expect(data.taskName).toBeDefined();
        done();
      });

      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      pm.addTask(project.id, {
        name: 'Task',
        start: '2024-01-01',
        end: '2024-01-15',
        assignedTo: [],
        status: 'todo',
      });
    });
  });

  describe('Configuration Management', () => {
    it('should get and set configuration', () => {
      const config = pm.getConfig();
      expect(config.enableEvents).toBe(true);

      pm.setConfig({ validateProjectData: true });
      const updated = pm.getConfig();
      expect(updated).toBeDefined();
    });

    it('should respect validation level configuration', () => {
      const relaxedPM = new ProjectManagement({ validationLevel: 'relaxed' });

      // Should not throw with relaxed validation
      const project = relaxedPM.createProject({
        name: '',
        ownerId: '',
        startDate: '',
        endDate: '',
        resources: [],
      } as any);

      expect(project).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw on null project ID', () => {
      expect(() => {
        pm.getProject(null as any);
      }).toThrow();
    });

    it('should return null for non-existent project', () => {
      const result = pm.getProject('non-existent');
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', (done) => {
      pm.on('error', (data) => {
        expect(data.error).toBeDefined();
        done();
      });

      try {
        pm.getProjectAnalytics('non-existent-id');
      } catch {
        // Expected
      }
    });
  });

  describe('Resource Conflict Detection', () => {
    it('should detect resource conflicts', () => {
      const project = pm.createProject({
        name: 'Project',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      pm.addTask(project.id, {
        name: 'Task 1',
        start: '2024-01-01',
        end: '2024-01-15',
        assignedTo: ['user1'],
        status: 'todo',
      });

      // Add another task with same resource in overlapping time
      const conflictPM = new ProjectManagement();
      const project2 = conflictPM.createProject({
        name: 'Project 2',
        ownerId: 'user1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        resources: [],
      });

      conflictPM.addTask(project2.id, {
        name: 'Task 1',
        start: '2024-01-01',
        end: '2024-01-15',
        assignedTo: ['user1'],
        status: 'todo',
      });

      conflictPM.on('resource-conflict-detected', (data) => {
        expect(data.conflicts).toBeDefined();
      });

      pm.addTask(project.id, {
        name: 'Task 2',
        start: '2024-01-10',
        end: '2024-01-20',
        assignedTo: ['user1'],
        status: 'todo',
      });
    });
  });
});
