// performanceEvaluationAI.js
// خدمة توصيات ذكية لتقييم الأداء

function generateAIRecommendation(evaluation) {
  if (!evaluation || !evaluation.summary) return '';
  const { overallScore, overallRating } = evaluation.summary;
  if (overallScore >= 4.5) {
    return 'الموظف متميز ويستحق التقدير وربما الترقية.';
  } else if (overallScore >= 4) {
    return 'الأداء جيد جداً. يوصى بمكافأة الموظف وتحفيزه.';
  } else if (overallScore >= 3.5) {
    return 'الأداء جيد. يوصى بمتابعة التطوير المهني.';
  } else if (overallScore >= 2.5) {
    return 'الأداء مقبول. يوصى ببرنامج تدريبي لتحسين بعض الجوانب.';
  } else {
    return 'الأداء ضعيف. يوصى بخطة تصحيحية عاجلة.';
  }
}

module.exports = { generateAIRecommendation };
