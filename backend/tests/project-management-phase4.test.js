const mongoose = require('mongoose');

// Ensure we test the real logic, not the internal mock
process.env.NODE_ENV = 'development';
process.env.USE_MOCK_DB = 'false';

const ProjectManagementServiceClass = require('../services/projectManagementService');
const projectService = new ProjectManagementServiceClass();
const Project = require('../models/project.model');
const Task = require('../models/task.model');

jest.mock('../models/project.model');
jest.mock('../models/task.model');

describe('Phase 4: Project Management Service', () => {
  let mockProjectId;

  beforeAll(() => {
    mockProjectId = new mongoose.Types.ObjectId();

    Project.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({ _id: mockProjectId, name: 'New Project', status: 'active' }),
    }));

    // Mock the static create method
    Project.create = jest.fn().mockResolvedValue({ _id: mockProjectId, name: 'New Project', status: 'active' });

    Task.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({ title: 'Task 1', status: 'todo', projectId: mockProjectId }),
    }));

    // Mock the static create method for Task
    Task.create = jest.fn().mockResolvedValue({ _id: 'taskId', title: 'Task 1', status: 'todo', projectId: mockProjectId });

    Project.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([{ name: 'Project 1' }]),
      }),
    });

    Task.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([{ title: 'Task 1', status: 'todo' }]),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create a new project', async () => {
    const projectData = { name: 'New Project', manager: new mongoose.Types.ObjectId() };
    const result = await projectService.createProject(projectData);
    expect(result).toBeDefined();
    expect(result.name).toBe('New Project');
  });

  test('should fetch projects list', async () => {
    const result = await projectService.getProjects();
    expect(result.length).toBeGreaterThan(0);
    expect(Project.find).toHaveBeenCalled();
  });

  test('should create a task', async () => {
    const taskData = { title: 'Task 1', projectId: mockProjectId };
    const result = await projectService.createTask(taskData);
    expect(result).toBeDefined();
    if (result.status) {
      expect(result.status).toBe('todo');
    }
  });

  test('should fetch project tasks', async () => {
    const result = await projectService.getProjectTasks(mockProjectId);
    expect(result.length).toBeGreaterThan(0);
    expect(Task.find).toHaveBeenCalledWith({ projectId: mockProjectId });
  });
});
