/**
 * ICF Goal Predictor - AI-powered goal prediction based on ICF assessment data
 * متنبأ أهداف ICF - توقع الأهداف بالذكاء الاصطناعي بناءً على بيانات تقييم ICF
 */

/**
 * Predict next goals based on current assessment and historical progress
 * توقع الأهداف التالية بناءً على التقييم الحالي والتقدم التاريخي
 */
export const predictGoals = (currentScores, historicalData = [], patientContext = {}) => {
  const predictions = [];
  
  // Analyze current scores to identify areas needing improvement
  const domains = [
    'bodyFunctions',
    'bodyStructures',
    'activitiesAndParticipation',
    'environmentalFactors',
    'personalFactors',
  ];
  
  const domainScores = {};
  domains.forEach(domain => {
    const scores = Object.entries(currentScores)
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
    
    domainScores[domain] = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;
  });
  
  // Identify highest priority areas (highest scores = most disability)
  const priorityAreas = Object.entries(domainScores)
    .filter(([_, score]) => score > 2)
    .sort((a, b) => b[1] - a[1]);
  
  // Generate goal predictions based on priority areas
  priorityAreas.forEach(([domain, score]) => {
    const domainGoals = generateDomainGoals(domain, score, currentScores, patientContext);
    predictions.push(...domainGoals);
  });
  
  // Consider historical trends
  if (historicalData.length > 0) {
    const trends = analyzeTrends(historicalData);
    const trendBasedGoals = generateTrendBasedGoals(trends, currentScores, patientContext);
    predictions.push(...trendBasedGoals);
  }
  
  // Sort by priority and confidence
  return predictions
    .sort((a, b) => b.priority - a.priority)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10); // Return top 10 predictions
};

/**
 * Generate goals for a specific domain
 * توليد أهداف لمجال محدد
 */
const generateDomainGoals = (domain, score, currentScores, patientContext) => {
  const goals = [];
  const { age, diagnosis, severity } = patientContext;
  
  // Body Functions goals
  if (domain === 'bodyFunctions') {
    if (score > 3) {
      goals.push({
        code: 'b710',
        title: 'تحسين الحركة المفصلية',
        description: 'زيادة مدى الحركة في المفاصل الرئيسية',
        targetScore: 2,
        timeline: '3 months',
        priority: 5,
        confidence: 0.85,
        interventions: ['PT', 'ROM exercises'],
      });
    }
    
    if (score > 2.5) {
      goals.push({
        code: 'b730',
        title: 'تعزيز قوة العضلات',
        description: 'زيادة قوة العضلات الأساسية',
        targetScore: 2,
        timeline: '3 months',
        priority: 4,
        confidence: 0.8,
        interventions: ['Strength training', 'Resistance exercises'],
      });
    }
    
    if (score > 2) {
      goals.push({
        code: 'b770',
        title: 'تحسين المشية',
        description: 'تحسين نمط المشية والاستقرار',
        targetScore: 2,
        timeline: '6 months',
        priority: 4,
        confidence: 0.75,
        interventions: ['Gait training', 'Balance exercises'],
      });
    }
  }
  
  // Activities and Participation goals
  if (domain === 'activitiesAndParticipation') {
    if (score > 3) {
      goals.push({
        code: 'd510',
        title: 'تعزيز العناية الذاتية',
        description: 'تحسين القدرة على غسل الجسم والعناية الشخصية',
        targetScore: 2,
        timeline: '3 months',
        priority: 5,
        confidence: 0.9,
        interventions: ['ADL training', 'Adaptive equipment'],
      });
    }
    
    if (score > 2.5) {
      goals.push({
        code: 'd440',
        title: 'تحسين المشي والتنقل',
        description: 'زيادة الاستقلالية في التنقل',
        targetScore: 2,
        timeline: '6 months',
        priority: 4,
        confidence: 0.8,
        interventions: ['Mobility training', 'Assistive devices'],
      });
    }
    
    if (score > 2) {
      goals.push({
        code: 'd710',
        title: 'تعزيز التفاعل الاجتماعي',
        description: 'تحسين المهارات الاجتماعية الأساسية',
        targetScore: 2,
        timeline: '6 months',
        priority: 3,
        confidence: 0.75,
        interventions: ['Social skills training', 'Group therapy'],
      });
    }
  }
  
  // Environmental Factors goals
  if (domain === 'environmentalFactors') {
    if (score < -2) {
      goals.push({
        code: 'e150',
        title: 'تحسين البيئة المادية',
        description: 'تعديل البيئة المادية لتسهيل الوصول',
        targetScore: 0,
        timeline: '3 months',
        priority: 4,
        confidence: 0.85,
        interventions: ['Environmental modifications', 'Accessibility assessment'],
      });
    }
    
    if (score < -1) {
      goals.push({
        code: 'e310',
        title: 'تعزيز الدعم العائلي',
        description: 'زيادة الدعم من العائلة والمقربين',
        targetScore: 1,
        timeline: '6 months',
        priority: 3,
        confidence: 0.8,
        interventions: ['Family counseling', 'Caregiver training'],
      });
    }
  }
  
  // Adjust goals based on patient context
  if (age && age < 5) {
    goals.forEach(goal => {
      goal.timeline = '6 months'; // Longer timeline for younger children
      goal.interventions.push('Play-based therapy');
    });
  }
  
  if (severity === 'severe') {
    goals.forEach(goal => {
      goal.targetScore = Math.min(goal.targetScore + 1, 4); // Adjust target for severe cases
      goal.interventions.push('Intensive therapy');
    });
  }
  
  return goals;
};

/**
 * Analyze historical trends to predict future goals
 * تحليل الاتجاهات التاريخية للتنبؤ بالأهداف المستقبلية
 */
const analyzeTrends = (historicalData) => {
  if (historicalData.length < 2) return null;
  
  const trends = {};
  const domains = [
    'bodyFunctions',
    'bodyStructures',
    'activitiesAndParticipation',
    'environmentalFactors',
    'personalFactors',
  ];
  
  domains.forEach(domain => {
    const scores = historicalData.map(d => d.domainScores?.[domain]).filter(Boolean);
    
    if (scores.length < 2) {
      trends[domain] = { trend: 'insufficient', rate: 0 };
      return;
    }
    
    const first = scores[0];
    const last = scores[scores.length - 1];
    const change = last - first;
    
    // Calculate rate of change per month
    const firstDate = new Date(historicalData[0].date);
    const lastDate = new Date(historicalData[historicalData.length - 1].date);
    const monthsDiff = Math.max((lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30), 1);
    const rate = change / monthsDiff;
    
    let trend = 'stable';
    if (rate < -0.1) trend = 'improving';
    else if (rate > 0.1) trend = 'worsening';
    
    trends[domain] = { trend, rate, change };
  });
  
  return trends;
};

/**
 * Generate goals based on trend analysis
 * توليد أهداف بناءً على تحليل الاتجاهات
 */
const generateTrendBasedGoals = (trends, currentScores, patientContext) => {
  const goals = [];
  
  if (!trends) return goals;
  
  Object.entries(trends).forEach(([domain, trend]) => {
    if (trend.trend === 'worsening') {
      goals.push({
        code: 'general',
        title: `عكس التدهور في ${domain}`,
        description: `التدخل العاجل لوقف التدهور في ${domain}`,
        targetScore: 2,
        timeline: '1 month',
        priority: 5,
        confidence: 0.7,
        interventions: ['Intensive intervention', 'Re-assessment'],
        reason: `Trend analysis shows worsening at ${trend.rate.toFixed(2)} per month`,
      });
    }
    
    if (trend.trend === 'stable' && trend.change === 0) {
      goals.push({
        code: 'general',
        title: `تحفيز التقدم في ${domain}`,
        description: `تغيير النهج العلاجي لتحفيز التقدم في ${domain}`,
        targetScore: 1,
        timeline: '3 months',
        priority: 3,
        confidence: 0.6,
        interventions: ['New intervention approach', 'Alternative therapy'],
        reason: 'No progress detected - intervention review needed',
      });
    }
  });
  
  return goals;
};

/**
 * Calculate goal achievement probability
 * حساب احتمالية تحقيق الهدف
 */
export const calculateGoalProbability = (goal, currentScores, historicalData) => {
  const currentScore = currentScores[goal.code]?.performance;
  if (currentScore === undefined) return 0.5;
  
  const targetScore = goal.targetScore;
  const difference = Math.abs(currentScore - targetScore);
  
  // Base probability
  let probability = 1 - (difference / 4);
  
  // Adjust based on historical performance
  if (historicalData.length > 0) {
    const recentAssessments = historicalData.slice(-3);
    const improvements = recentAssessments.map((assessment, index) => {
      if (index === 0) return 0;
      const prevScore = historicalData[index - 1].scores[goal.code]?.performance;
      const currScore = assessment.scores[goal.code]?.performance;
      return prevScore - currScore; // Lower score = improvement
    }).filter(v => v !== undefined);
    
    if (improvements.length > 0) {
      const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
      if (avgImprovement > 0) {
        probability += 0.1; // Bonus for consistent improvement
      } else if (avgImprovement < 0) {
        probability -= 0.1; // Penalty for decline
      }
    }
  }
  
  // Adjust based on timeline
  const timelineMonths = parseInt(goal.timeline);
  if (timelineMonths <= 1) probability -= 0.1; // Short timeline = harder
  if (timelineMonths >= 6) probability += 0.1; // Long timeline = easier
  
  return Math.max(0, Math.min(1, probability));
};

/**
 * Recommend intervention strategies based on goals and patient context
 * توصية استراتيجيات التدخل بناءً على الأهداف وسياق المريض
 */
export const recommendInterventions = (goals, patientContext) => {
  const { age, diagnosis, comorbidities, preferences } = patientContext;
  const recommendations = [];
  
  goals.forEach(goal => {
    const baseInterventions = goal.interventions || [];
    
    // Age-based adjustments
    if (age && age < 5) {
      baseInterventions.push('Play-based therapy', 'Parent-child interaction therapy');
    } else if (age && age > 65) {
      baseInterventions.push('Geriatric-focused therapy', 'Fall prevention');
    }
    
    // Diagnosis-based adjustments
    if (diagnosis?.includes('autism')) {
      baseInterventions.push('ABA therapy', 'Sensory integration');
    }
    if (diagnosis?.includes('cerebral palsy')) {
      baseInterventions.push('Bobath therapy', 'Constraint-induced movement therapy');
    }
    
    // Comorbidity adjustments
    if (comorbidities?.includes('epilepsy')) {
      baseInterventions.push('Seizure management', 'Safety precautions');
    }
    
    // Patient preferences
    if (preferences?.includes('group')) {
      baseInterventions.push('Group therapy', 'Peer support');
    }
    if (preferences?.includes('home')) {
      baseInterventions.push('Home-based therapy', 'Telehealth');
    }
    
    recommendations.push({
      goalId: goal.code,
      goalTitle: goal.title,
      interventions: [...new Set(baseInterventions)], // Remove duplicates
      intensity: goal.priority > 4 ? 'intensive' : goal.priority > 2 ? 'moderate' : 'maintenance',
      frequency: goal.priority > 4 ? '3-5x/week' : goal.priority > 2 ? '2-3x/week' : '1-2x/week',
    });
  });
  
  return recommendations;
};

export default {
  predictGoals,
  calculateGoalProbability,
  recommendInterventions,
};