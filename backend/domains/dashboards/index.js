/**
 * Dashboards & Decision Support Domain — مجال لوحات المعلومات ودعم القرار
 *
 * يدير لوحات معلومات مخصصة، مؤشرات أداء رئيسية (KPIs)،
 * تنبيهات ذكية، محرك دعم القرار، الملخصات التنفيذية
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { dashboardService } = require('./services/DashboardService');
const { decisionSupportEngine } = require('./services/DecisionSupportEngine');

require('./models/DashboardConfig');
require('./models/KPIDefinition');
require('./models/KPISnapshot');
require('./models/DecisionAlert');

class DashboardsDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'dashboards',
      version: '1.0.0',
      prefix: 'dashboards',
      description: 'Dashboards & Decision Support — لوحات المعلومات ودعم القرار',
      dependencies: ['core', 'episodes', 'sessions', 'goals', 'quality'],
    });
    this.dashboardService = dashboardService;
    this.decisionSupportEngine = decisionSupportEngine;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const routes = require('./routes/dashboards.routes');
    router.use('/', routes);
  }
}

module.exports = new DashboardsDomain();
