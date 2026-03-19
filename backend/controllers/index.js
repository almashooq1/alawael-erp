/* eslint-disable no-unused-vars */
/**
 * تجميع وحدات التحكم
 * نظام الأصول ERP - الإصدار 2.0.0
 */

const authController = require('./auth.controller');
const usersController = require('./users.controller');
const branchesController = require('./branches.controller');
const projectsController = require('./projects.controller');

module.exports = {
  auth: authController,
  users: usersController,
  branches: branchesController,
  projects: projectsController,
};
