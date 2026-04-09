/**
 * Workflow Domain Module — وحدة سير العمل ورحلة المستفيد
 *
 * تجمع بين:
 *  - محرك Workflow (State Machine) لإدارة المراحل
 *  - خدمة الرحلة (JourneyService) لتنسيق العمليات
 *  - نماذج المهام وسجلات التدقيق
 *  - مسارات API
 *
 * Dependencies: core, episodes, timeline
 *
 * @module domains/workflow
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { workflowEngine } = require('./WorkflowEngine');
const { journeyService } = require('./services/JourneyService');

// ─── Ensure models are registered ───────────────────────────────────────────
require('./models/WorkflowTask');
require('./models/WorkflowTransitionLog');

class WorkflowDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'workflow',
      version: '1.0.0',
      description: 'محرك سير العمل ورحلة المستفيد — من الإحالة إلى الخروج',
      dependencies: ['core', 'episodes', 'timeline'],
    });

    this.engine = workflowEngine;
    this.journeyService = journeyService;
  }

  registerRoutes(router) {
    // Health endpoint
    super.registerRoutes(router);

    // Mount all workflow & journey routes
    const workflowRoutes = require('./routes/workflow.routes');
    router.use('/', workflowRoutes);
  }

  registerMiddleware(router) {
    // Request logging for workflow operations
    router.use((req, _res, next) => {
      if (req.method !== 'GET') {
        const logger = require('../../utils/logger');
        logger.info(
          `[Workflow] ${req.method} ${req.originalUrl} by ${req.user?.id || 'anonymous'}`
        );
      }
      next();
    });
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

const workflowDomain = new WorkflowDomain();

module.exports = workflowDomain;
