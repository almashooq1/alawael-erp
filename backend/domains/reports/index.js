/**
 * Reports Domain Module — محرك التقارير الموحد
 *
 * Dependencies: جميع الوحدات (يقرأ من كل النماذج)
 *
 * @module domains/reports
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { reportsEngine } = require('./services/ReportsEngine');

// ─── Ensure models are registered ───────────────────────────────────────────
require('./models/ReportTemplate');
require('./models/GeneratedReport');

class ReportsDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'reports',
      version: '1.0.0',
      prefix: 'reports',
      description: 'محرك التقارير الموحد — قوالب، توليد آلي، ملخصات سردية، تصدير',
      dependencies: [
        'core',
        'episodes',
        'sessions',
        'goals',
        'assessments',
        'care-plans',
        'programs',
        'ai-recommendations',
        'quality',
        'family',
      ],
    });

    this.reportsEngine = reportsEngine;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const reportsRoutes = require('./routes/reports.routes');
    router.use('/', reportsRoutes);
  }
}

module.exports = new ReportsDomain();
