/**
 * AI Recommendations Domain Module — محرك التوصيات والأولويات الذكية
 *
 * Dependencies: core, episodes, sessions, goals, assessments, care-plans, timeline
 *
 * @module domains/ai-recommendations
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { riskScoringService } = require('./services/RiskScoringService');
const { recommendationEngine } = require('./services/RecommendationEngine');

// ─── Ensure models are registered ───────────────────────────────────────────
require('./models/ClinicalRiskScore');
require('./models/Recommendation');

class AiRecommendationsDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'ai-recommendations',
      version: '1.0.0',
      prefix: 'ai-recommendations',
      description: 'محرك التوصيات الذكية وتسجيل المخاطر السريرية',
      dependencies: [
        'core',
        'episodes',
        'sessions',
        'goals',
        'assessments',
        'care-plans',
        'timeline',
      ],
    });

    this.riskScoringService = riskScoringService;
    this.recommendationEngine = recommendationEngine;
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const recoRoutes = require('./routes/recommendations.routes');
    router.use('/', recoRoutes);
  }
}

module.exports = new AiRecommendationsDomain();
