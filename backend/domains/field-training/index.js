/**
 * Field Training Domain — مجال التدريب الميداني
 *
 * يدير برامج التدريب الميداني للمتدربين والأخصائيين الجدد
 * مع تتبع الكفاءات، الإشراف، ساعات التدريب، التقييمات
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { fieldTrainingService } = require('./services/FieldTrainingService');

require('./models/TrainingProgram');
require('./models/TraineeRecord');

class FieldTrainingDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'field-training',
      version: '1.0.0',
      prefix: 'field-training',
      description: 'Field Training — إدارة التدريب الميداني',
      dependencies: ['core'],
    });
    this.fieldTrainingService = fieldTrainingService;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const routes = require('./routes/field-training.routes');
    router.use('/', routes);
  }
}

module.exports = new FieldTrainingDomain();
