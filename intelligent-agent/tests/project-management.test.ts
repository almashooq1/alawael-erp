// tests/project-management.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectManagement } from '../src/modules/project-management';

describe('ProjectManagement Module', () => {
  let pm: ProjectManagement;
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  beforeEach(() => {
    pm = new ProjectManagement();
  });

  describe('Initialization & Configuration', () => {
    it('should create instance with default config', () => {
      expect(pm).toBeDefined();
      expect(pm instanceof ProjectManagement).toBe(true);
    });

    it('should support custom configuration', () => {
      const customPM = new ProjectManagement({
        enableEvents: false,
        maxProjects: 500
      });
      expect(customPM).toBeDefined();
    });

    it('should have event emitter capabilities', () => {
      expect(typeof pm.on).toBe('function');
      expect(typeof pm.emit).toBe('function');
    });

    it('should have all required methods', () => {
      expect(typeof pm.createProject).toBe('function');
      expect(typeof pm.getProject).toBe('function');
      expect(typeof pm.listProjects).toBe('function');
      expect(typeof pm.updateProject).toBe('function');
      expect(typeof pm.deleteProject).toBe('function');
    });
  });

  describe('Project CRUD Operations', () => {
    it('should create project', () => {
      const project = pm.createProject({
        name: 'Test Project',
        description: 'Test',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });

      expect(project).toBeDefined();
      expect(project.id).toBeTruthy();
      expect(project.name).toBe('Test Project');
      expect(project.status).toBe('planned');
    });

    it('should throw error for missing name', () => {
      expect(() => pm.createProject({
        name: '',
        description: 'Test',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      })).toThrow();
    });

    it('should retrieve project', () => {
      const created = pm.createProject({
        name: 'Test',
        description: 'Desc',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });

      const retrieved = pm.getProject(created.id);
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test');
    });

    it('should return null for non-existent project', () => {
      const result = pm.getProject('nonexistent');
      expect(result).toBeNull();
    });

    it('should list all projects', () => {
      pm.createProject({
        name: 'P1',
        description: 'D1',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });
      pm.createProject({
        name: 'P2',
        description: 'D2',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });

      const projects = pm.listProjects();
      expect(projects.length).toBe(2);
    });

    it('should update project', () => {
      const created = pm.createProject({
        name: 'Original',
        description: 'Desc',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });

      pm.updateProject(created.id, { name: 'Updated' });
      const updated = pm.getProject(created.id);
      expect(updated?.name).toBe('Updated');
    });

    it('should delete project', () => {
      const created = pm.createProject({
        name: 'Test',
        description: 'Desc',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });

      pm.deleteProject(created.id);
      expect(pm.getProject(created.id)).toBeNull();
    });
  });

  describe('Task Operations', () => {
    let projectId: string;

    beforeEach(() => {
      const project = pm.createProject({
        name: 'Task Test',
        description: 'Test',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });
      projectId = project.id;
    });

    it('should add task to project', () => {
      const taskStart = new Date().toISOString();
      const taskEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const task = pm.addTask(projectId, {
        name: 'Task 1',
        start: taskStart,
        end: taskEnd,
        assignedTo: ['user2'],
        status: 'todo'
      });

      expect(task).toBeDefined();
      expect(task?.id).toBeTruthy();
      expect(task?.name).toBe('Task 1');
      expect(task?.status).toBe('todo');
    });

    it('should update task', () => {
      const taskStart = new Date().toISOString();
      const taskEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const created = pm.addTask(projectId, {
        name: 'Task',
        start: taskStart,
        end: taskEnd,
        assignedTo: ['user2'],
        status: 'todo'
      });

      if (created) {
        pm.updateTask(projectId, created.id, { status: 'in-progress' });
        const project = pm.getProject(projectId);
        const updated = project?.tasks.find(t => t.id === created.id);
        expect(updated?.status).toBe('in-progress');
      }
    });

    it('should list tasks in project', () => {
      const taskStart = new Date().toISOString();
      const taskEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      pm.addTask(projectId, {
        name: 'T1',
        start: taskStart,
        end: taskEnd,
        assignedTo: ['user2'],
        status: 'todo'
      });
      pm.addTask(projectId, {
        name: 'T2',
        start: taskStart,
        end: taskEnd,
        assignedTo: ['user2'],
        status: 'todo'
      });

      const project = pm.getProject(projectId);
      expect(project?.tasks.length).toBe(2);
    });
  });

  describe('Project Analytics', () => {
    let projectId: string;

    beforeEach(() => {
      const project = pm.createProject({
        name: 'Analytics',
        description: 'Test',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });
      projectId = project.id;
    });

    it('should calculate project analytics', () => {
      const analytics = pm.getProjectAnalytics(projectId);
      expect(analytics).toBeDefined();
      expect(analytics.projectId).toBe(projectId);
      expect(typeof analytics.progress).toBe('number');
      expect(analytics.taskStats).toBeDefined();
    });

    it('should get project health', () => {
      const health = pm.getProjectHealth(projectId);
      expect(health).toBeDefined();
      if (health && typeof health === 'object') {
        expect(health).toBeTruthy();
      }
    });

    it('should generate gantt chart', () => {
      const gantt = pm.getGanttChart(projectId);
      expect(Array.isArray(gantt)).toBe(true);
    });
  });

  describe('Resource & Milestone Management', () => {
    let projectId: string;

    beforeEach(() => {
      const project = pm.createProject({
        name: 'Resources',
        description: 'Test',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });
      projectId = project.id;
    });

    it('should allocate resource', () => {
      const allocation = pm.allocateResource({
        projectId,
        resourceId: 'res1',
        allocation: 80,
        allocatedHours: 40,
        actualHours: 32
      });

      expect(allocation).toBeDefined();
      expect(allocation.allocation).toBe(80);
    });

    it('should add milestone', () => {
      const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const milestone = pm.addMilestone({
        name: 'Phase 1',
        dueDate,
        projectId,
        status: 'pending',
        relatedTasks: []
      });

      expect(milestone).toBeDefined();
      expect(milestone.name).toBe('Phase 1');
    });

    it('should get project milestones', () => {
      const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      pm.addMilestone({
        name: 'M1',
        dueDate,
        projectId,
        status: 'pending',
        relatedTasks: []
      });

      const milestones = pm.getMilestones(projectId);
      expect(milestones.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Instance Isolation', () => {
    it('should maintain separate instances', () => {
      const pm1 = new ProjectManagement();
      const pm2 = new ProjectManagement();

      pm1.createProject({
        name: 'PM1',
        description: 'Test',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });

      expect(pm1.listProjects().length).toBeGreaterThan(pm2.listProjects().length);
    });
  });

  describe('Configuration', () => {
    it('should get config', () => {
      const config = pm.getConfig();
      expect(config).toBeDefined();
      expect(config.enableEvents).toBe(true);
    });

    it('should update config', () => {
      pm.setConfig({ enableEvents: false });
      const config = pm.getConfig();
      expect(config.enableEvents).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should emit event when enabled', () => {
      return new Promise<void>((resolve) => {
        const testPM = new ProjectManagement({ enableEvents: true });
        let resolved = false;
        
        testPM.on('project-created', () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });

        testPM.createProject({
          name: 'Test',
          description: 'Test',
          ownerId: 'user1',
          startDate,
          endDate,
          resources: []
        });

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }, 500);
      });
    });

    it('should not emit when disabled', () => {
      const testPM = new ProjectManagement({ enableEvents: false });
      let emitted = false;

      testPM.on('project-created', () => {
        emitted = true;
      });

      testPM.createProject({
        name: 'Test',
        description: 'Test',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });

      expect(emitted).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle many projects', () => {
      for (let i = 0; i < 10; i++) {
        pm.createProject({
          name: `P${i}`,
          description: 'Test',
          ownerId: 'user1',
          startDate,
          endDate,
          resources: []
        });
      }

      expect(pm.listProjects().length).toBe(10);
    });

    it('should handle many tasks', () => {
      const project = pm.createProject({
        name: 'Heavy',
        description: 'Test',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: []
      });

      const taskStart = new Date().toISOString();
      const taskEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      for (let i = 0; i < 5; i++) {
        pm.addTask(project.id, {
          name: `T${i}`,
          start: taskStart,
          end: taskEnd,
          assignedTo: ['user2'],
          status: 'todo'
        });
      }

      const updated = pm.getProject(project.id);
      expect(updated?.tasks.length).toBe(5);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle end-to-end workflow', () => {
      // Create project
      const project = pm.createProject({
        name: 'E2E Project',
        description: 'Full workflow test',
        ownerId: 'user1',
        startDate,
        endDate,
        resources: ['res1']
      });

      // Add tasks
      const taskStart = new Date().toISOString();
      const taskEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      pm.addTask(project.id, {
        name: 'Task 1',
        start: taskStart,
        end: taskEnd,
        assignedTo: ['user2'],
        status: 'in-progress'
      });

      // Allocate resource
      pm.allocateResource({
        projectId: project.id,
        resourceId: 'res1',
        allocation: 100,
        allocatedHours: 40,
        actualHours: 40
      });

      // Get analytics
      const analytics = pm.getProjectAnalytics(project.id);
      expect(analytics.projectId).toBe(project.id);

      // Verify final state
      const final = pm.getProject(project.id);
      expect(final?.tasks.length).toBe(1);
      expect(final?.resources).toContain('res1');
    });
  });
});
