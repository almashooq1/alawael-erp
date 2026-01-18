const mongoose = require('mongoose');

// Force mock mode for this test
process.env.USE_MOCK_DB = 'true';

const ProjectManagementServiceClass = require('../services/projectManagementService');
const Project = require('../models/project.model');
const Task = require('../models/task.model');

// Mock Mongoose Models
jest.mock('../models/project.model');
jest.mock('../models/task.model');

describe('Project Management Service', () => {
  let projectManagementService;
  let saveMock;

  beforeEach(() => {
    projectManagementService = new ProjectManagementServiceClass();
    saveMock = jest.fn().mockResolvedValue({ _id: 'mockId' });

    // Setup Mocks
    Project.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      }),
    });

    Task.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      }),
    });

    Task.findByIdAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'taskId', status: 'done' }),
    });

    Project.mockImplementation(() => ({ save: saveMock }));
    Task.mockImplementation(() => ({ save: saveMock }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const data = { name: 'New Project', manager: 'user1' };
      const result = await projectManagementService.createProject(data);
      expect(result).toBeDefined();
      expect(result.name).toBe('New Project');
      expect(result.manager).toBe('user1');
    });
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const projectId = 'proj1';
      const project = projectManagementService.createProject({ name: 'Test' });
      const data = { title: 'New Task' };
      const result = await projectManagementService.createTask(project.id, data);
      expect(result).toBeDefined();
      expect(result.title).toBe('New Task');
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      const projectId = 'proj1';
      const project = projectManagementService.createProject({ name: 'Test' });
      const task = projectManagementService.addTask(project.id, { title: 'Task' });
      const newStatus = 'completed';

      const result = projectManagementService.updateTaskStatus(project.id, task.id, newStatus);

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });
  });
});
