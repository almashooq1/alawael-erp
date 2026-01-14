/**
 * Project Management Routes
 * مسارات إدارة المشاريع
 */

const express = require('express');
const router = express.Router();
const ProjectManagementService = require('../../services/projectManagementService');

const projectService = new ProjectManagementService();

// ===== Project CRUD =====

router.post('/projects', (req, res, next) => {
  try {
    const projectData = req.body;
    const result = projectService.createProject(projectData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/projects', (req, res, next) => {
  try {
    const filters = req.query;
    const result = projectService.getAllProjects(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/projects/:id', (req, res, next) => {
  try {
    const project = projectService.projects.get(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'المشروع غير موجود' });
    }
    res.json({ success: true, project });
  } catch (error) {
    next(error);
  }
});

// ===== Phases =====

router.post('/projects/:id/phases', (req, res, next) => {
  try {
    const phaseData = req.body;
    const result = projectService.addPhase(req.params.id, phaseData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// ===== Tasks =====

router.post('/projects/:id/tasks', (req, res, next) => {
  try {
    const { phaseId, ...taskData } = req.body;
    const result = projectService.createTask(req.params.id, phaseId, taskData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/projects/tasks/:taskId/status', (req, res, next) => {
  try {
    const { status, progress } = req.body;
    const result = projectService.updateTaskStatus(req.params.taskId, status, progress);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ===== Resources =====

router.post('/projects/:id/resources', (req, res, next) => {
  try {
    const resource = req.body;
    const result = projectService.allocateResource(req.params.id, resource);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// ===== Risks =====

router.post('/projects/:id/risks', (req, res, next) => {
  try {
    const riskData = req.body;
    const result = projectService.identifyRisk(req.params.id, riskData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// ===== Budget =====

router.post('/projects/:id/budget', (req, res, next) => {
  try {
    const budgetData = req.body;
    const result = projectService.manageBudget(req.params.id, budgetData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/projects/budget/:budgetId/expense', (req, res, next) => {
  try {
    const expense = req.body;
    const result = projectService.recordExpense(req.params.budgetId, expense);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ===== Analytics & Reports =====

router.get('/projects/:id/progress', (req, res, next) => {
  try {
    const result = projectService.calculateProjectProgress(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/projects/:id/schedule', (req, res, next) => {
  try {
    const result = projectService.getProjectSchedule(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/projects/:id/report', (req, res, next) => {
  try {
    const result = projectService.generateProjectReport(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ===== Close Project =====

router.post('/projects/:id/close', (req, res, next) => {
  try {
    const closeData = req.body;
    const result = projectService.closeProject(req.params.id, closeData);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
