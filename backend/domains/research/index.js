/**
 * Clinical Research Domain — مجال البحث السريري
 *
 * يدير الدراسات البحثية السريرية: البروتوكولات، المشاركين،
 * الموافقات الأخلاقية، جمع البيانات، النتائج والنشر
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { researchService } = require('./services/ResearchService');

require('./models/ResearchStudy');

class ResearchDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'research',
      version: '1.0.0',
      prefix: 'research',
      description: 'Clinical Research — إدارة البحث السريري',
      dependencies: ['core', 'episodes'],
    });
    this.researchService = researchService;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const routes = require('./routes/research.routes');
    router.use('/', routes);
  }
}

module.exports = new ResearchDomain();
