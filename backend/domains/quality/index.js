/**
 * Quality Domain Module — مركز الجودة والامتثال
 *
 * Dependencies: core, episodes, sessions, goals, assessments, care-plans, timeline
 *
 * @module domains/quality
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { qualityEngine } = require('./services/QualityEngine');

// ─── Ensure models are registered ───────────────────────────────────────────
require('./models/QualityAudit');
require('./models/CorrectiveAction');

class QualityDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'quality',
      version: '1.0.0',
      prefix: 'quality',
      description: 'مركز الجودة والامتثال — تدقيق آلي، KPIs، إجراءات تصحيحية',
      dependencies: [
        'core',
        'episodes',
        'sessions',
        'goals',
        'assessments',
        'care-plans',
        'timeline',
      ],
    });

    this.qualityEngine = qualityEngine;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const qualityRoutes = require('./routes/quality.routes');
    router.use('/', qualityRoutes);
  }
}

module.exports = new QualityDomain();
