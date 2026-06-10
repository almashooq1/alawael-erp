/**
 * BaseDomainModule — الكلاس الأساسي لجميع وحدات الدومين
 *
 * يوفر بنية موحدة لتسجيل المسارات، الخدمات، والتحكم
 * في كل وحدة (Domain Module) في النظام.
 *
 * @module domains/_base/BaseDomainModule
 */

const express = require('express');
const logger = require('../../utils/logger');

class BaseDomainModule {
  /**
   * @param {Object} config
   * @param {string} config.name - اسم الدومين
   * @param {string} config.version - إصدار الدومين
   * @param {string} config.prefix - البادئة للمسارات
   * @param {string} config.description - وصف الدومين
   * @param {string[]} [config.dependencies] - الاعتماديات على دومينات أخرى
   */
  constructor(config) {
    this.name = config.name;
    this.version = config.version || '1.0.0';
    this.prefix = config.prefix || `/api/v1/${config.name}`;
    this.description = config.description || '';
    this.dependencies = config.dependencies || [];
    this.router = express.Router();
    this._initialized = false;
    this._healthChecks = [];
  }

  /**
   * تهيئة الدومين — يجب أن تُستدعى قبل التسجيل
   */
  async initialize() {
    if (this._initialized) return;

    try {
      // تسجيل المسارات
      this.registerRoutes(this.router);

      // تسجيل Middleware خاص بالدومين
      this.registerMiddleware(this.router);

      this._initialized = true;
      logger.info(`[Domain:${this.name}] Initialized successfully (v${this.version})`);
    } catch (error) {
      logger.error(`[Domain:${this.name}] Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * تسجيل المسارات — يجب أن يُعاد تعريفها في الكلاسات الفرعية
   * @param {import('express').Router} router
   */
  registerRoutes(router) {
    // Override in subclass
    router.get('/health', (_req, res) => {
      res.json({
        domain: this.name,
        version: this.version,
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * تسجيل Middleware خاص بالدومين
   * @param {import('express').Router} router
   */
  registerMiddleware(_router) {
    // Override in subclass if needed
  }

  /**
   * تثبيت الدومين على تطبيق Express
   * @param {import('express').Express} app
   */
  mount(app) {
    if (!this._initialized) {
      throw new Error(`[Domain:${this.name}] Must be initialized before mounting`);
    }

    // W1168 — SECURITY: domain mounts were the ONLY API surface with NO
    // `authenticate` (legacy registry mounts use dualMountAuth, app.js uses
    // per-mount authenticate). Legacy routers shadow /api/<name> and
    // /api/v1/<name> via first-match, but /api/v2/<name> was served SOLELY by
    // this bare mount — every domain route (incl. beneficiary/family/quality
    // data) was anonymous-reachable, and all branch-isolation guards
    // (assertBranchMatch family) silently no-op'd without req.user/branchScope.
    // Same `authenticate` (= authenticateToken) used by dualMountAuth for
    // behavioural consistency. Lazy require — circular-import safety at boot.
    const { authenticate } = require('../../middleware/auth');

    // Mount on /api/<name> and /api/v1/<name> and /api/v2/<name>
    const basePath = this.name;
    app.use(`/api/${basePath}`, authenticate, this.router);
    app.use(`/api/v1/${basePath}`, authenticate, this.router);
    app.use(`/api/v2/${basePath}`, authenticate, this.router);

    logger.info(
      `[Domain:${this.name}] Mounted on /api/${basePath}, /api/v1/${basePath}, /api/v2/${basePath}`
    );
  }

  /**
   * إضافة فحص صحة مخصص
   * @param {string} name
   * @param {Function} checkFn - async function returning { status, details }
   */
  addHealthCheck(name, checkFn) {
    this._healthChecks.push({ name, check: checkFn });
  }

  /**
   * تنفيذ جميع فحوصات الصحة
   */
  async runHealthChecks() {
    const results = {};
    for (const hc of this._healthChecks) {
      try {
        results[hc.name] = await hc.check();
      } catch (error) {
        results[hc.name] = { status: 'error', message: error.message };
      }
    }
    return {
      domain: this.name,
      version: this.version,
      healthy: Object.values(results).every(r => r.status === 'ok' || r.status === 'healthy'),
      checks: results,
    };
  }

  /**
   * الحصول على معلومات الدومين
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      prefix: this.prefix,
      description: this.description,
      dependencies: this.dependencies,
      initialized: this._initialized,
      healthChecks: this._healthChecks.map(hc => hc.name),
    };
  }
}

module.exports = { BaseDomainModule };
