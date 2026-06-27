/**
 * ICF Report Generator - Utility for generating comprehensive ICF assessment reports
 * مولد تقارير ICF - أداة لإنشاء تقارير تقييم ICF الشاملة
 */

import { calculateDomainScore, calculateOverallScore, calculateImprovement } from './icfCalculator';

/**
 * Generate comprehensive ICF assessment report
 * إنشاء تقرير تقييم ICF شامل
 */
export const generateReport = (assessment, previousAssessment = null, patientContext = {}) => {
  const { scores, date, assessor, coreSetType, linkedGoals } = assessment;
  
  const report = {
    metadata: {
      title: 'تقرير تقييم ICF-CY',
      generatedAt: new Date().toISOString(),
      assessmentDate: date,
      assessor,
      coreSetType,
      patientName: patientContext.name || '',
      patientId: patientContext.id || '',
      age: patientContext.age || '',
      diagnosis: patientContext.diagnosis || '',
    },
    summary: generateSummary(scores, previousAssessment),
    domainAnalysis: generateDomainAnalysis(scores, previousAssessment),
    codeDetails: generateCodeDetails(scores, linkedGoals),
    recommendations: generateRecommendations(scores, patientContext),
    goals: generateGoalsReport(linkedGoals),
    progress: generateProgressReport(assessment, previousAssessment),
    environmentalAnalysis: generateEnvironmentalAnalysis(scores),
    appendices: generateAppendices(scores),
  };
  
  return report;
};

/**
 * Generate executive summary
 * إنشاء ملخص تنفيذي
 */
const generateSummary = (scores, previousAssessment) => {
  const overallScore = calculateOverallScore(scores);
  const previousScore = previousAssessment ? calculateOverallScore(previousAssessment.scores) : null;
  
  const improvement = previousScore !== null ? previousScore - overallScore : 0;
  const improvementPercentage = previousScore !== null ? ((improvement / previousScore) * 100) : 0;
  
  const domains = [
    'bodyFunctions',
    'bodyStructures',
    'activitiesAndParticipation',
    'environmentalFactors',
    'personalFactors',
  ];
  
  const domainScores = {};
  domains.forEach(domain => {
    domainScores[domain] = calculateDomainScore(scores, domain);
  });
  
  const highestDomain = Object.entries(domainScores).sort((a, b) => b[1] - a[1])[0];
  const lowestDomain = Object.entries(domainScores).sort((a, b) => a[1] - b[1])[0];
  
  return {
    overallScore: overallScore.toFixed(2),
    previousScore: previousScore?.toFixed(2) || null,
    improvement: improvement.toFixed(2),
    improvementPercentage: improvementPercentage.toFixed(1),
    interpretation: getOverallInterpretation(overallScore),
    highestDomain: {
      name: highestDomain[0],
      score: highestDomain[1].toFixed(2),
      label: getDomainLabel(highestDomain[0]),
    },
    lowestDomain: {
      name: lowestDomain[0],
      score: lowestDomain[1].toFixed(2),
      label: getDomainLabel(lowestDomain[0]),
    },
    domainScores: Object.entries(domainScores).map(([domain, score]) => ({
      domain,
      label: getDomainLabel(domain),
      score: score.toFixed(2),
      status: getScoreStatus(score),
    })),
  };
};

/**
 * Generate detailed domain analysis
 * إنشاء تحليل مفصل للمجالات
 */
const generateDomainAnalysis = (scores, previousAssessment) => {
  const domains = [
    'bodyFunctions',
    'bodyStructures',
    'activitiesAndParticipation',
    'environmentalFactors',
    'personalFactors',
  ];
  
  return domains.map(domain => {
    const currentScore = calculateDomainScore(scores, domain);
    const previousScore = previousAssessment ? calculateDomainScore(previousAssessment.scores, domain) : null;
    
    const domainCodes = Object.entries(scores)
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
      });
    
    const codeDetails = domainCodes.map(([code, score]) => ({
      code,
      performance: score.performance,
      capacity: score.capacity,
      environmental: score.environmental,
      status: getScoreStatus(score.performance),
      interpretation: getCodeInterpretation(code, score.performance),
    }));
    
    const improvement = previousScore !== null ? previousScore - currentScore : 0;
    
    return {
      domain,
      label: getDomainLabel(domain),
      currentScore: currentScore.toFixed(2),
      previousScore: previousScore?.toFixed(2) || null,
      improvement: improvement.toFixed(2),
      status: getScoreStatus(currentScore),
      interpretation: getDomainInterpretation(domain, currentScore),
      codeDetails,
      priorityCodes: codeDetails.filter(c => c.performance > 2).sort((a, b) => b.performance - a.performance),
    };
  });
};

/**
 * Generate detailed code analysis
 * إنشاء تحليل مفصل للأكواد
 */
const generateCodeDetails = (scores, linkedGoals) => {
  return Object.entries(scores).map(([code, score]) => ({
    code,
    performance: score.performance,
    capacity: score.capacity,
    environmental: score.environmental,
    gap: score.capacity !== undefined && score.performance !== undefined 
      ? score.capacity - score.performance 
      : null,
    status: getScoreStatus(score.performance),
    interpretation: getCodeInterpretation(code, score.performance),
    linkedGoals: linkedGoals?.[code] || [],
  }));
};

/**
 * Generate recommendations based on assessment
 * إنشاء توصيات بناءً على التقييم
 */
const generateRecommendations = (scores, patientContext) => {
  const recommendations = [];
  const domains = [
    'bodyFunctions',
    'bodyStructures',
    'activitiesAndParticipation',
    'environmentalFactors',
    'personalFactors',
  ];
  
  domains.forEach(domain => {
    const score = calculateDomainScore(scores, domain);
    
    if (score > 3) {
      recommendations.push({
        priority: 'high',
        domain,
        label: getDomainLabel(domain),
        recommendation: `تدخل مكثف في ${getDomainLabel(domain)} - درجة عالية تشير إلى إعاقة شديدة`,
        interventions: getDomainInterventions(domain, 'intensive'),
        timeline: '1-3 months',
      });
    } else if (score > 2) {
      recommendations.push({
        priority: 'medium',
        domain,
        label: getDomainLabel(domain),
        recommendation: `تدخل متوسط في ${getDomainLabel(domain)} - تحسين ممكن`,
        interventions: getDomainInterventions(domain, 'moderate'),
        timeline: '3-6 months',
      });
    } else if (score > 1) {
      recommendations.push({
        priority: 'low',
        domain,
        label: getDomainLabel(domain),
        recommendation: `صيانة ومراقبة في ${getDomainLabel(domain)} - الوضع مستقر`,
        interventions: getDomainInterventions(domain, 'maintenance'),
        timeline: '6-12 months',
      });
    }
  });
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

/**
 * Generate goals report
 * إنشاء تقرير الأهداف
 */
const generateGoalsReport = (linkedGoals) => {
  if (!linkedGoals) return null;
  
  const goals = Object.entries(linkedGoals).map(([code, goalIds]) => ({
    code,
    goalIds,
    count: goalIds.length,
  }));
  
  const totalGoals = goals.reduce((sum, g) => sum + g.count, 0);
  
  return {
    totalGoals,
    codesWithGoals: goals.length,
    goalsByCode: goals,
  };
};

/**
 * Generate progress report comparing with previous assessment
 * إنشاء تقرير التقدم مقارنة بالتقييم السابق
 */
const generateProgressReport = (assessment, previousAssessment) => {
  if (!previousAssessment) return null;
  
  const improvements = calculateImprovement(assessment.scores, previousAssessment.scores);
  
  return {
    previousDate: previousAssessment.date,
    timeDiff: calculateTimeDiff(previousAssessment.date, assessment.date),
    improvements,
    summary: {
      improving: Object.entries(improvements).filter(([_, v]) => v.change > 0).length,
      worsening: Object.entries(improvements).filter(([_, v]) => v.change < 0).length,
      stable: Object.entries(improvements).filter(([_, v]) => v.change === 0).length,
    },
  };
};

/**
 * Generate environmental factors analysis
 * إنشاء تحليل العوامل البيئية
 */
const generateEnvironmentalAnalysis = (scores) => {
  const environmentalCodes = Object.entries(scores)
    .filter(([code, _]) => code.startsWith('e'));
  
  const barriers = environmentalCodes.filter(([_, score]) => score.environmental < 0);
  const facilitators = environmentalCodes.filter(([_, score]) => score.environmental > 0);
  const neutral = environmentalCodes.filter(([_, score]) => score.environmental === 0);
  
  return {
    totalFactors: environmentalCodes.length,
    barriers: {
      count: barriers.length,
      codes: barriers.map(([code, score]) => ({ code, score: score.environmental })),
      summary: 'عوامل بيئية تعيق الأداء الوظيفي',
    },
    facilitators: {
      count: facilitators.length,
      codes: facilitators.map(([code, score]) => ({ code, score: score.environmental })),
      summary: 'عوامل بيئية تسهل الأداء الوظيفي',
    },
    neutral: {
      count: neutral.length,
      summary: 'عوامل بيئية محايدة',
    },
  };
};

/**
 * Generate appendices with additional information
 * إنشاء ملاحق بمعلومات إضافية
 */
const generateAppendices = (scores) => {
  return {
    scoringGuide: {
      performance: '0 = لا إعاقة، 1 = خفيف، 2 = متوسط، 3 = شديد، 4 = شديد جداً',
      capacity: '0 = لا إعاقة، 1 = خفيف، 2 = متوسط، 3 = شديد، 4 = شديد جداً',
      environmental: '-4 = حاجز شديد، 0 = محايد، +4 = مساعد شديد',
    },
    codeReference: Object.entries(scores).map(([code, score]) => ({
      code,
      performance: score.performance,
      capacity: score.capacity,
      environmental: score.environmental,
    })),
  };
};

// Helper functions
const getDomainLabel = (domain) => {
  const labels = {
    bodyFunctions: 'وظائف الجسم',
    bodyStructures: 'أجزاء الجسم',
    activitiesAndParticipation: 'الأنشطة والمشاركة',
    environmentalFactors: 'العوامل البيئية',
    personalFactors: 'العوامل الشخصية',
  };
  return labels[domain] || domain;
};

const getScoreStatus = (score) => {
  if (score === undefined || score === 8 || score === 9) return 'غير محدد';
  if (score === 0) return 'لا إعاقة';
  if (score === 1) return 'إعاقة خفيفة';
  if (score === 2) return 'إعاقة متوسطة';
  if (score === 3) return 'إعاقة شديدة';
  if (score === 4) return 'إعاقة شديدة جداً';
  return 'غير محدد';
};

const getOverallInterpretation = (score) => {
  if (score <= 1) return 'وظيفة طبيعية مع إعاقة خفيفة أو معدومة';
  if (score <= 2) return 'إعاقة متوسطة تتطلب تدخلاً علاجياً';
  if (score <= 3) return 'إعاقة شديدة تتطلب تدخلاً مكثفاً';
  return 'إعاقة شديدة جداً تتطلب رعاية شاملة';
};

const getDomainInterpretation = (domain, score) => {
  const interpretations = {
    bodyFunctions: score > 2 ? 'وظائف جسمية محدودة' : 'وظائف جسمية مقبولة',
    bodyStructures: score > 2 ? 'أجزاء جسمية متأثرة' : 'أجزاء جسمية سليمة',
    activitiesAndParticipation: score > 2 ? 'مشاركة محدودة' : 'مشاركة جيدة',
    environmentalFactors: score < -1 ? 'بيئة داعمة' : 'بيئة محددة',
    personalFactors: score > 2 ? 'عوامل شخصية محددة' : 'عوامل شخصية إيجابية',
  };
  return interpretations[domain] || '';
};

const getCodeInterpretation = (code, score) => {
  if (score === undefined || score === 8 || score === 9) return 'لم يتم التقييم';
  if (score === 0) return 'وظيفة طبيعية';
  if (score === 1) return 'وظيفة خفيفة';
  if (score === 2) return 'وظيفة متوسطة';
  if (score === 3) return 'وظيفة شديدة';
  if (score === 4) return 'وظيفة شديدة جداً';
  return '';
};

const getDomainInterventions = (domain, intensity) => {
  const interventions = {
    bodyFunctions: {
      intensive: ['Physiotherapy', 'Occupational therapy', 'Medical intervention'],
      moderate: ['Exercise program', 'Adaptive equipment', 'Home program'],
      maintenance: ['Monitoring', 'Periodic assessment', 'Prevention'],
    },
    bodyStructures: {
      intensive: ['Surgical intervention', 'Orthotics', 'Medical management'],
      moderate: ['Physical therapy', 'Postural management', 'Equipment'],
      maintenance: ['Regular check-ups', 'Posture monitoring', 'Prevention'],
    },
    activitiesAndParticipation: {
      intensive: ['Intensive therapy', 'ADL training', 'Social skills training'],
      moderate: ['Task-specific training', 'Environmental modifications', 'Assistive technology'],
      maintenance: ['Practice opportunities', 'Community participation', 'Support'],
    },
    environmentalFactors: {
      intensive: ['Major modifications', 'Equipment provision', 'Caregiver training'],
      moderate: ['Minor modifications', 'Support services', 'Education'],
      maintenance: ['Monitoring', 'Updates', 'Review'],
    },
    personalFactors: {
      intensive: ['Psychological support', 'Counseling', 'Behavioral intervention'],
      moderate: ['Education', 'Skills training', 'Self-management'],
      maintenance: ['Support groups', 'Community resources', 'Wellness'],
    },
  };
  
  return interventions[domain]?.[intensity] || ['General intervention'];
};

const calculateTimeDiff = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = d2 - d1;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffYears > 0) return `${diffYears} سنة`;
  if (diffMonths > 0) return `${diffMonths} شهر`;
  return `${diffDays} يوم`;
};

/**
 * Export report to PDF format
 * تصدير التقرير إلى PDF
 */
export const exportToPDF = (report) => {
  // This would integrate with a PDF generation library
  // For now, return the report structure
  return {
    ...report,
    exportFormat: 'PDF',
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Export report to Word format
 * تصدير التقرير إلى Word
 */
export const exportToWord = (report) => {
  // This would integrate with a Word generation library
  return {
    ...report,
    exportFormat: 'Word',
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Export report to JSON format
 * تصدير التقرير إلى JSON
 */
export const exportToJSON = (report) => {
  return JSON.stringify(report, null, 2);
};

export default {
  generateReport,
  exportToPDF,
  exportToWord,
  exportToJSON,
};