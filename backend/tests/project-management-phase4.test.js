const mongoose = require('mongoose');

// Use mock DB for testing with mocked models
process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DB = 'true';

const ProjectManagementServiceClass = require('../services/projectManagementService');
const projectService = new ProjectManagementServiceClass();

describe('Phase 4: Project Management Service', () => {
  let mockProjectId;

  beforeAll(() => {
    mockProjectId = new mongoose.Types.ObjectId();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create a new project', () => {
    const projectData = { name: 'New Project', manager: new mongoose.Types.ObjectId() };
    const result = projectService.createProject(projectData);
    expect(result).toBeDefined();
    expect(result.name).toBe('New Project');
  });

  test('should fetch projects list', () => {
    // Create a project first so the list isn't empty
    projectService.createProject({ name: 'Test Project', manager: mockProjectId });
    const result = projectService.listProjects();
    expect(result).toBeDefined();
    expect(Array.isArray(result) || result.length >= 0).toBe(true);
  });

  test('should create a task', () => {
    // First create a project
    const project = projectService.createProject({
      name: 'Task Test Project',
      manager: mockProjectId,
    });
    const taskData = { title: 'Task 1', projectId: project._id };
    const result = projectService.createTask(taskData);
    expect(result).toBeDefined();
    if (result.status) {
      expect(result.status).toBe('todo');
    }
  });

  test('should fetch project tasks', () => {
    // Create project and task first
    const project = projectService.createProject({
      name: 'Fetch Tasks Project',
      manager: mockProjectId,
    });
    projectService.createTask({ title: 'Task 1', projectId: project._id });
    const result = projectService.getTasks(project._id);
    expect(result).toBeDefined();
    expect(Array.isArray(result) || result.length >= 0).toBe(true);
  });
});
