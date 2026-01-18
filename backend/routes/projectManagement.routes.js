const express = require('express');
const router = express.Router();
const projectService = require('../services/projectManagementService');
const { authenticateToken } = require('../middleware/auth'); // Keep auth consistent

// Middleware to mock user if not authenticated (for testing/dev ease if auth is strict)
const ensureAuth = (req, res, next) => {
  // In actual specific implementation we use authenticateToken
  // For now we assume authenticateToken is globally available or passed
  next();
};

router.use(authenticateToken); // Apply auth to all routes

// Projects
router.post('/projects', async (req, res) => {
  try {
    const project = await projectService.createProject(req.body);
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/projects', async (req, res) => {
  try {
    const projects = await projectService.getProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.put('/projects/:id', async (req, res) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/projects/:id', async (req, res) => {
  try {
    await projectService.deleteProject(req.params.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Tasks
router.post('/tasks', async (req, res) => {
  try {
    const task = await projectService.createTask(req.body);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/projects/:id/tasks', async (req, res) => {
  try {
    const tasks = await projectService.getProjectTasks(req.params.id);
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/tasks/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const task = await projectService.updateTaskStatus(req.params.id, status);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/projects/:id/stats', async (req, res) => {
  try {
    const stats = await projectService.getProjectStats(req.params.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Tasks

router.get('/projects/:id/tasks', async (req, res) => {
  try {
    const tasks = await projectService.getProjectTasks(req.params.id);
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const task = await projectService.createTask(req.body);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    // General update, including status
    const task = await projectService.updateTask(req.params.id, req.body);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    await projectService.deleteTask(req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
