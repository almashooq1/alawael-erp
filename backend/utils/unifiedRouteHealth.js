/**
 * unifiedRouteHealth.js — Unified Route Health & Audit System
 * ══════════════════════════════════════════════════════════════
 * A centralized route health monitoring system that:
 *   1. Tracks every mounted route
 *   2. Identifies empty routers (archived/missing modules)
 *   3. Identifies stub controllers (functions that return empty data)
 *   4. Reports route health at boot time
 *   5. Exposes /api/health/routes for runtime monitoring
 *
 * Usage:
 *   const { routeHealthMonitor, createRouteHealthRouter } = require('./utils/unifiedRouteHealth');
 *   routeHealthMonitor.register(app, { path: '/api/users', router: usersRouter, source: 'app.js:137' });
 *   app.use('/api/health/routes', createRouteHealthRouter());
 */

'use strict';

const express = require('express');

class RouteHealthMonitor {
  constructor() {
    this.routes = [];
    this.emptyRouters = [];
    this.stubs = [];
    this.warnings = [];
  }

  /**
   * Register a route for health tracking
   * @param {Object} info - Route registration info
   * @param {string} info.path - The mount path
   * @param {Object} info.router - The Express router
   * @param {string} info.source - File and line where mounted
   * @param {boolean} info.auth - Whether auth is required
   * @param {string} info.phase - Phase/Wave identifier (e.g., 'Phase 29', 'Wave 4')
   */
  register({ path, router, source, auth = false, phase = 'unknown' }) {
    const isEmpty = router && typeof router === 'function' && Array.isArray(router.stack) && router.stack.length === 0;
    
    const entry = {
      path,
      source,
      auth,
      phase,
      registeredAt: new Date().toISOString(),
      isEmpty,
      layerCount: router?.stack?.length || 0,
    };

    this.routes.push(entry);

    if (isEmpty) {
      this.emptyRouters.push(entry);
      this.warnings.push(`[EMPTY ROUTER] ${path} mounted from ${source} — router has 0 layers`);
    }
  }

  /**
   * Register a warning about a route
   */
  warn(message) {
    this.warnings.push(message);
  }

  /**
   * Get the current health summary
   */
  getSummary() {
    const total = this.routes.length;
    const empty = this.emptyRouters.length;
    const stubs = this.stubs.length;
    const warnings = this.warnings.length;
    const healthy = total - empty - stubs;

    return {
      total,
      healthy,
      empty,
      stubs,
      warnings,
      healthPercent: total > 0 ? Math.round((healthy / total) * 100) : 0,
      emptyRouters: this.emptyRouters,
      stubRoutes: this.stubs,
      warningMessages: this.warnings,
    };
  }

  /**
   * Get all routes registered for a specific phase
   */
  getRoutesByPhase(phase) {
    return this.routes.filter(r => r.phase === phase);
  }

  /**
   * Print a health report to the console/logger
   */
  printReport(logger = console) {
    const summary = this.getSummary();
    
    logger.info('═'.repeat(70));
    logger.info('  UNIFIED ROUTE HEALTH REPORT');
    logger.info('═'.repeat(70));
    logger.info(`  Total routes mounted:    ${summary.total}`);
    logger.info(`  Healthy routes:          ${summary.healthy} (${summary.healthPercent}%)`);
    logger.info(`  Empty routers:           ${summary.empty}`);
    logger.info(`  Stub controllers:        ${summary.stubs}`);
    logger.info(`  Warnings:                ${summary.warnings}`);
    logger.info('─'.repeat(70));

    if (summary.emptyRouters.length > 0) {
      logger.warn('  ⚠️  EMPTY ROUTERS (will return 404 for all paths):');
      for (const r of summary.emptyRouters) {
        logger.warn(`     • ${r.path} ← ${r.source}`);
      }
    }

    if (summary.stubRoutes.length > 0) {
      logger.warn('  ⚠️  STUB CONTROLLERS (return empty data):');
      for (const r of summary.stubRoutes) {
        logger.warn(`     • ${r.path} ← ${r.source}`);
      }
    }

    if (summary.warningMessages.length > 0) {
      logger.warn('  ⚠️  WARNINGS:');
      for (const w of summary.warningMessages) {
        logger.warn(`     • ${w}`);
      }
    }

    logger.info('═'.repeat(70));
  }
}

// Global singleton instance
const routeHealthMonitor = new RouteHealthMonitor();

/**
 * Create an Express router that exposes route health data
 */
function createRouteHealthRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    const summary = routeHealthMonitor.getSummary();
    res.json({
      success: true,
      data: summary,
    });
  });

  router.get('/empty', (req, res) => {
    res.json({
      success: true,
      data: routeHealthMonitor.emptyRouters,
    });
  });

  router.get('/stubs', (req, res) => {
    res.json({
      success: true,
      data: routeHealthMonitor.stubs,
    });
  });

  router.get('/warnings', (req, res) => {
    res.json({
      success: true,
      data: routeHealthMonitor.warnings,
    });
  });

  router.get('/by-phase/:phase', (req, res) => {
    const routes = routeHealthMonitor.getRoutesByPhase(req.params.phase);
    res.json({
      success: true,
      count: routes.length,
      data: routes,
    });
  });

  return router;
}

module.exports = {
  RouteHealthMonitor,
  routeHealthMonitor,
  createRouteHealthRouter,
};
