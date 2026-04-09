/**
 * Core Domain — النواة المركزية لمنصة التأهيل الموحدة
 *
 * يُدير كيان المستفيد الموحد (Beneficiary) كنقطة ارتكاز مركزية
 * يربط جميع التقييمات، الخطط، الجلسات، المقاييس، والتقارير.
 *
 * @module domains/core
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { BeneficiaryRepository } = require('./repositories/beneficiary.repository');
const { BeneficiaryService } = require('./services/beneficiary.service');
const { createBeneficiaryRoutes } = require('./routes/beneficiary.routes');
const beneficiary360Routes = require('./routes/beneficiary360.routes');

class CoreDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'core',
      version: '2.0.0',
      prefix: '/api/v2/core',
      description: 'النواة المركزية — المستفيد الموحد ونقطة الارتكاز لجميع الوحدات',
      dependencies: [],
    });

    this.beneficiaryRepository = null;
    this.beneficiaryService = null;
  }

  async initialize() {
    // Initialize repositories
    this.beneficiaryRepository = new BeneficiaryRepository();
    this.beneficiaryService = new BeneficiaryService(this.beneficiaryRepository);

    // Health checks
    this.addHealthCheck('beneficiary-collection', async () => {
      const count = await this.beneficiaryRepository.count();
      return { status: 'healthy', totalBeneficiaries: count };
    });

    await super.initialize();
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    createBeneficiaryRoutes(router, this.beneficiaryService);

    // 360° Dashboard routes
    router.use('/', beneficiary360Routes);
  }
}

module.exports = new CoreDomain();
