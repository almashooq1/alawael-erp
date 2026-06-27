/**
 * ICF Calculator - Utility functions for ICF score calculations
 * آلة حاسبة ICF - دوال مساعدة لحساب درجات ICF
 */

/**
 * Calculate domain score from individual code scores
 * حساب درجة المجال من درجات الأكواد الفردية
 */
export const calculateDomainScore = (scores, domain) => {
  const domainScores = Object.entries(scores)
    .filter(([code, _]) => {
      const prefix = code.charAt(0);
      const domainMap = {
        'b': 'bodyFunctions',
        's': 'bodyStructures',
        'd': 'activitiesAndParticipation',
        'e': 'environmentalFactors',
        'p': 'personalFactors',
      };
      return domainMap[prefix] === domain;
    })
    .map(([_, score]) => score.performance)
    .filter(val => val !== undefined && val !== 8 && val !== 9);
  
  if (domainScores.length === 0) return 0;
  
  const sum = domainScores.reduce((a, b) => a + b, 0);
  return sum / domainScores.length;
};

/**
 * Calculate overall ICF score
 * حساب درجة ICF الإجمالية
 */
export const calculateOverallScore = (scores) => {
  const domains = [
    'bodyFunctions',
    'bodyStructures',
    'activitiesAndParticipation',
    'environmentalFactors',
    'personalFactors',
  ];
  
  const domainScores = domains.map(domain => calculateDomainScore(scores, domain));
  const validScores = domainScores.filter(score => score > 0);
  
  if (validScores.length === 0) return 0;
  
  const sum = validScores.reduce((a, b) => a + b, 0);
  return sum / validScores.length;
};

/**
 * Calculate weighted domain score with custom weights
 * حساب درجة المجال المرجحة مع أوزان مخصصة
 */
export const calculateWeightedDomainScore = (scores, domain, weights = {}) => {
  const domainScores = Object.entries(scores)
    .filter(([code, _]) => {
      const prefix = code.charAt(0);
      const domainMap = {
        'b': 'bodyFunctions',
        's': 'bodyStructures',
        'd': 'activitiesAndParticipation',
        'e': 'environmentalFactors',
        'p': 'personalFactors',
      };
      return domainMap[prefix] === domain;
    })
    .map(([code, score]) => {
      const weight = weights[code] || 1;
      return {
        value: score.performance,
        weight,
      };
    })
    .filter(item => item.value !== undefined && item.value !== 8 && item.value !== 9);
  
  if (domainScores.length === 0) return 0;
  
  const weightedSum = domainScores.reduce((sum, item) => sum + (item.value * item.weight), 0);
  const totalWeight = domainScores.reduce((sum, item) => sum + item.weight, 0);
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

/**
 * Calculate improvement between two assessments
 * حساب التحسن بين تقييمين
 */
export const calculateImprovement = (currentScores, previousScores) => {
  const domains = [
    'bodyFunctions',
    'bodyStructures',
    'activitiesAndParticipation',
    'environmentalFactors',
    'personalFactors',
  ];
  
  const improvements = {};
  
  domains.forEach(domain => {
    const current = calculateDomainScore(currentScores, domain);
    const previous = calculateDomainScore(previousScores, domain);
    
    if (previous === 0) {
      improvements[domain] = { change: 0, percentage: 0 };
      return;
    }
    
    const change = previous - current; // Lower score = improvement
    const percentage = (change / previous) * 100;
    
    improvements[domain] = { change, percentage };
  });
  
  return improvements;
};

/**
 * Calculate percentile rank compared to reference population
 * حساب الرتبة المئوية مقارنة بالسكان المرجعين
 */
export const calculatePercentileRank = (score, referenceScores) => {
  if (!referenceScores || referenceScores.length === 0) return 0;
  
  const sortedScores = [...referenceScores].sort((a, b) => a - b);
  const index = sortedScores.findIndex(s => s >= score);
  
  if (index === -1) return 100;
  
  return (index / sortedScores.length) * 100;
};

/**
 * Calculate reliability coefficient (internal consistency)
 * حساب معامل الموثوقية (الاتساق الداخلي)
 */
export const calculateReliability = (scores) => {
  // Simplified Cronbach's alpha calculation
  const items = Object.values(scores).map(s => s.performance).filter(v => v !== undefined && v !== 8 && v !== 9);
  
  if (items.length < 2) return 0;
  
  const mean = items.reduce((a, b) => a + b, 0) / items.length;
  const variance = items.reduce((sum, item) => sum + Math.pow(item - mean, 2), 0) / items.length;
  
  if (variance === 0) return 0;
  
  const itemVariances = items.map(item => {
    const itemMean = item;
    return Math.pow(item - itemMean, 2);
  });
  
  const totalItemVariance = itemVariances.reduce((a, b) => a + b, 0) / items.length;
  const k = items.length;
  
  return (k / (k - 1)) * (1 - (totalItemVariance / variance));
};

/**
 * Calculate standard error of measurement
 * حساب الخطأ المعياري للقياس
 */
export const calculateStandardError = (scores, reliability) => {
  const items = Object.values(scores).map(s => s.performance).filter(v => v !== undefined && v !== 8 && v !== 9);
  
  if (items.length === 0) return 0;
  
  const mean = items.reduce((a, b) => a + b, 0) / items.length;
  const variance = items.reduce((sum, item) => sum + Math.pow(item - mean, 2), 0) / items.length;
  const stdDev = Math.sqrt(variance);
  
  if (reliability >= 1) return 0;
  
  return stdDev * Math.sqrt(1 - reliability);
};

/**
 * Calculate confidence interval for a score
 * حساب فترة الثقة لدرجة
 */
export const calculateConfidenceInterval = (score, standardError, confidence = 0.95) => {
  const zScores = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  
  const z = zScores[confidence] || 1.96;
  const margin = z * standardError;
  
  return {
    lower: Math.max(0, score - margin),
    upper: Math.min(4, score + margin),
    confidence,
  };
};

/**
 * Calculate composite score from multiple domains
 * حساب الدرجة المركبة من مجالات متعددة
 */
export const calculateCompositeScore = (scores, domainWeights = {}) => {
  const domains = [
    'bodyFunctions',
    'bodyStructures',
    'activitiesAndParticipation',
    'environmentalFactors',
    'personalFactors',
  ];
  
  const defaultWeights = {
    bodyFunctions: 0.2,
    bodyStructures: 0.15,
    activitiesAndParticipation: 0.25,
    environmentalFactors: 0.2,
    personalFactors: 0.2,
  };
  
  const weights = { ...defaultWeights, ...domainWeights };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  domains.forEach(domain => {
    const score = calculateDomainScore(scores, domain);
    if (score > 0) {
      weightedSum += score * weights[domain];
      totalWeight += weights[domain];
    }
  });
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

/**
 * Calculate GAS (Goal Attainment Scaling) score
 * حساب درجة تحقيق الأهداف (GAS)
 */
export const calculateGASScore = (goals, outcomes) => {
  const goalArray = Array.isArray(goals) ? goals : [goals];
  const outcomeArray = Array.isArray(outcomes) ? outcomes : [outcomes];
  
  if (goalArray.length !== outcomeArray.length) {
    throw new Error('Goals and outcomes arrays must have the same length');
  }
  
  const scores = goalArray.map((goal, index) => {
    const outcome = outcomeArray[index];
    const difference = outcome - goal;
    
    // GAS scoring: -2 to +2
    if (difference <= -2) return -2;
    if (difference >= 2) return 2;
    return difference;
  });
  
  const sum = scores.reduce((a, b) => a + b, 0);
  return sum / scores.length;
};

export default {
  calculateDomainScore,
  calculateOverallScore,
  calculateWeightedDomainScore,
  calculateImprovement,
  calculatePercentileRank,
  calculateReliability,
  calculateStandardError,
  calculateConfidenceInterval,
  calculateCompositeScore,
  calculateGASScore,
};