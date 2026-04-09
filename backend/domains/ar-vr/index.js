/**
 * AR/VR Rehabilitation Domain — مجال تأهيل الواقع الافتراضي / المعزز
 *
 * يدير جلسات التأهيل باستخدام تقنيات VR/AR/MR/XR
 * مع تتبع الأداء، بيانات الحركة، السلامة، التقدم
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { arvrService } = require('./services/ARVRService');

require('./models/ARVRSession');

class ARVRDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'ar-vr',
      version: '1.0.0',
      prefix: 'ar-vr',
      description: 'AR/VR Rehabilitation — تأهيل الواقع الافتراضي والمعزز',
      dependencies: ['core', 'episodes', 'sessions', 'goals'],
    });
    this.arvrService = arvrService;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const routes = require('./routes/ar-vr.routes');
    router.use('/', routes);
  }
}

module.exports = new ARVRDomain();
