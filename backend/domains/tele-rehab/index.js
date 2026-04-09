/**
 * Tele-Rehabilitation Domain — مجال التأهيل عن بُعد
 *
 * يدير جلسات التأهيل عن بعد عبر الفيديو والصوت
 * مع تتبع جودة الاتصال والتسجيل ورضا المستفيد
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { teleRehabService } = require('./services/TeleRehabService');

require('./models/TeleSession');

class TeleRehabDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'tele-rehab',
      version: '1.0.0',
      prefix: 'tele-rehab',
      description: 'Tele-Rehabilitation — إدارة التأهيل عن بُعد',
      dependencies: ['core', 'episodes', 'sessions'],
    });
    this.teleRehabService = teleRehabService;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const routes = require('./routes/tele-rehab.routes');
    router.use('/', routes);
  }
}

module.exports = new TeleRehabDomain();
