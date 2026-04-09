/**
 * Group Therapy Domain — مجال العلاج الجماعي
 *
 * يدير المجموعات العلاجية وجلسات العلاج الجماعي
 * وتتبع حضور ومشاركة وتقدم الأعضاء
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { groupTherapyService } = require('./services/GroupTherapyService');

require('./models/TherapyGroup');
require('./models/GroupSession');

class GroupTherapyDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'group-therapy',
      version: '1.0.0',
      prefix: 'group-therapy',
      description: 'Group Therapy — إدارة العلاج الجماعي',
      dependencies: ['core', 'episodes', 'sessions', 'goals'],
    });
    this.groupTherapyService = groupTherapyService;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const routes = require('./routes/group-therapy.routes');
    router.use('/', routes);
  }
}

module.exports = new GroupTherapyDomain();
