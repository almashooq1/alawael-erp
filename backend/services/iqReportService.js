'use strict';

/**
 * iqReportService.js — W714
 *
 * Generates clinical reports and recommendations from IQ assessment data.
 * Reports are diagnosis-aids; they do NOT replace formal psychometric reports
 * issued by licensed psychologists.
 */

const registry = require('../measures/scoring');
const { getLicensing } = require('../measures/governance/licensing.registry');

async function generateAssessmentReport(assessment) {
  if (!assessment) throw new Error('IQReport: assessment required');

  const mod = registry.resolve(assessment.instrumentType);
  if (!mod) throw new Error(`unknown instrument: ${assessment.instrumentType}`);

  const derived = mod.computeDerived({
    fsiq: assessment.fullScaleIQ,
    edition: assessment.edition === 'N/A' ? undefined : assessment.edition,
    indices:
      assessment.indices && assessment.indices.size > 0
        ? Object.fromEntries(assessment.indices)
        : undefined,
  });

  const interp = mod.interpret(derived.value);
  const lic = getLicensing(assessment.instrumentType);

  const report = {
    assessmentId: assessment._id,
    beneficiaryId: assessment.beneficiaryId,
    episodeId: assessment.episodeId,
    branchId: assessment.branchId,
    instrument: {
      type: assessment.instrumentType,
      edition: assessment.edition,
    },
    examinationDate: assessment.assessmentDate,
    examiner: assessment.examinerName,
    scores: {
      fullScaleIQ: assessment.fullScaleIQ,
      indices: Object.fromEntries(assessment.indices || []),
    },
    classification: {
      band: interp.band,
      label_ar: interp.label_ar,
      label_en: interp.label_en,
      severity: interp.severity,
      tier: interp.tier,
    },
    interpretation: {
      ar: generateInterpretation_AR(assessment, interp),
      en: generateInterpretation_EN(assessment, interp),
    },
    recommendations: {
      ar: assessment.recommendations?.ar || generateRecommendations_AR(assessment, interp),
      en: assessment.recommendations?.en || generateRecommendations_EN(assessment, interp),
    },
    supervisorNotes: assessment.supervisorNotes || { ar: '', en: '' },
    governance: {
      licenseType: lic?.licenseType,
      requiresAttribution: lic?.requiresAttribution,
      attributionText_ar: lic?.notes_ar,
      disclaimer_ar:
        'هذا التقرير يمثل ملخص نتائج الاختبار المعياري. لا يحل محل التقرير النفسي الرسمي من الأخصائي المرخّص.',
      disclaimer_en:
        'This report summarises the standard-score results. It does not replace the formal psychometric report issued by the licensed psychologist.',
    },
    generatedAt: new Date(),
  };

  return report;
}

function generateInterpretation_AR(assessment, interp) {
  const score = assessment.fullScaleIQ;
  let text = `نتيجة الاختبار المعيارية: ${score}\n`;
  text += `التصنيف: ${interp.label_ar} (${interp.severity})\n`;

  if (score < 70) {
    text +=
      'تحذير: النتيجة تقع في نطاق الإعاقة الفكرية (أقل من -2 انحراف معياري عن المتوسط). ينبغي إجراء تقييم متعدد التخصصات شامل.';
  } else if (score < 80) {
    text += 'النتيجة منخفضة الأداء. ينصح بمراجعة شاملة لتقييم احتياجات الدعم التربوي.';
  } else if (score < 90) {
    text += 'النتيجة دون المتوسط. قد تستفيد من دعم تربوي موجه.';
  } else if (score >= 110) {
    text += 'النتيجة فوق المتوسط. قدرات معرفية عادية أو متفوقة.';
  }

  return text;
}

function generateInterpretation_EN(assessment, interp) {
  const score = assessment.fullScaleIQ;
  let text = `Standard score result: ${score}\n`;
  text += `Classification: ${interp.label_en} (${interp.severity})\n`;

  if (score < 70) {
    text +=
      'WARNING: This score falls within the intellectual-disability range (below -2 SD from mean). Comprehensive multidisciplinary assessment is recommended.';
  } else if (score < 80) {
    text +=
      'Score indicates low performance. Comprehensive review is recommended to assess educational support needs.';
  } else if (score < 90) {
    text += 'Score is below average. Targeted educational support may be beneficial.';
  } else if (score >= 110) {
    text += 'Score is above average. Cognitive abilities are typical or superior.';
  }

  return text;
}

function generateRecommendations_AR(assessment, _interp) {
  const score = assessment.fullScaleIQ;
  const recs = [];

  if (score < 70) {
    recs.push('• إحالة فورية لتقييم متعدد التخصصات مع الخدمات الاجتماعية والطبية');
    recs.push('• خطة دعم فردية شاملة (تعليمي + سلوكي + تدريب مهارات حياتية)');
    recs.push('• متابعة دورية كل 3 أشهر لتقييم التقدم');
  } else if (score < 80) {
    recs.push('• تقييم تربوي شامل من قبل أخصائي تربوي');
    recs.push('• برنامج تدخل مركز مع محاور محددة (حسب الحاجة)');
    recs.push('• دعم أسري والتشاور مع الوالدين/المسؤولين');
  } else if (score < 90) {
    recs.push('• مراقبة تربوية دورية');
    recs.push('• دعم تعليمي عند الحاجة (قراءة، رياضيات)');
    recs.push('• تقييم دوري سنوي');
  } else {
    recs.push('• البرنامج الحالي مناسب');
    recs.push('• متابعة دورية كل 12 شهرًا');
  }

  return recs.join('\n');
}

function generateRecommendations_EN(assessment, _interp) {
  const score = assessment.fullScaleIQ;
  const recs = [];

  if (score < 70) {
    recs.push('• Immediate referral for comprehensive multidisciplinary assessment');
    recs.push('• Individualised support plan: educational + behavioural + life-skills training');
    recs.push('• Quarterly monitoring for progress');
  } else if (score < 80) {
    recs.push('• Comprehensive educational assessment');
    recs.push('• Targeted intervention programme (subject to need)');
    recs.push('• Family engagement and parental consultation');
  } else if (score < 90) {
    recs.push('• Ongoing educational monitoring');
    recs.push('• Subject-specific academic support as needed');
    recs.push('• Annual review');
  } else {
    recs.push('• Current programme is appropriate');
    recs.push('• 12-month monitoring cycle');
  }

  return recs.join('\n');
}

module.exports = {
  generateAssessmentReport,
};
