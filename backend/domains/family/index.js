/**
 * Family Domain Module — وحدة التواصل الأسري وبوابة أولياء الأمور
 *
 * Dependencies: core, episodes, sessions, goals, care-plans, timeline
 *
 * @module domains/family
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { familyService } = require('./services/FamilyService');

// ─── Ensure models are registered ───────────────────────────────────────────
require('./models/FamilyMember');
require('./models/FamilyCommunication');

class FamilyDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'family',
      version: '1.0.0',
      prefix: 'family',
      description: 'التواصل الأسري — أولياء الأمور، الموافقات، الواجبات المنزلية، البوابة',
      dependencies: ['core', 'episodes', 'sessions', 'goals', 'care-plans', 'timeline'],
    });

    this.familyService = familyService;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const familyRoutes = require('./routes/family.routes');
    router.use('/', familyRoutes);
  }
}

module.exports = new FamilyDomain();
