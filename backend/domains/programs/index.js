/**
 * Programs Domain Module — مكتبة البرامج التأهيلية
 *
 * يدير دورة حياة البرامج والتسجيلات والتقدم
 *
 * @module domains/programs
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { programsService } = require('./services/ProgramsService');

// ─── Ensure models are registered ───────────────────────────────────────────
require('./models/Program');
require('./models/ProgramEnrollment');

class ProgramsDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'programs',
      version: '1.0.0',
      prefix: 'programs',
      description: 'Programs Library — مكتبة البرامج التأهيلية',
      dependencies: ['core', 'episodes', 'goals'],
    });

    this.programsService = programsService;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const programsRoutes = require('./routes/programs.routes');
    router.use('/', programsRoutes);
  }
}

module.exports = new ProgramsDomain();
