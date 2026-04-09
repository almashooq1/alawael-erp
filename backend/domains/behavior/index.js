/**
 * Behavior Management Domain — مجال إدارة السلوك
 *
 * يدير تتبع الحوادث السلوكية وتحليل ABC
 * وخطط إدارة السلوك واستراتيجيات التدخل
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { behaviorService } = require('./services/BehaviorService');

require('./models/BehaviorRecord');
require('./models/BehaviorPlan');

class BehaviorDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'behavior',
      version: '1.0.0',
      prefix: 'behavior',
      description: 'Behavior Management — إدارة السلوك وتعديله',
      dependencies: ['core', 'episodes'],
    });
    this.behaviorService = behaviorService;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const routes = require('./routes/behavior.routes');
    router.use('/', routes);
  }
}

module.exports = new BehaviorDomain();
