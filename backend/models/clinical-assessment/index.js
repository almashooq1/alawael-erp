'use strict';

/**
 * Clinical Assessment Battery Models — barrel export
 * بطارية التقييم السريري الشاملة
 *
 * Split from backend/models/clinical-assessment-battery.model.js (10 individual model files).
 * @module models/clinical-assessment
 */

const MChatAssessment = require('./mchat-assessment.model');
const SensoryProfileAssessment = require('./sensory-profile-assessment.model');
const BRIEF2Assessment = require('./brief2-assessment.model');
const SRS2Assessment = require('./srs2-assessment.model');
const PortageAssessment = require('./portage-assessment.model');
const ABCDataCollection = require('./abc-data-collection.model');
const FamilyNeedsSurvey = require('./family-needs-survey.model');
const QualityOfLifeAssessment = require('./quality-of-life-assessment.model');
const TransitionReadinessAssessment = require('./transition-readiness-assessment.model');
const SaudiDevelopmentalScreening = require('./saudi-developmental-screening.model');
const BehavioralFunctionAssessment = require('./behavioral-function-assessment.model');
const CaregiverBurdenAssessment = require('./caregiver-burden-assessment.model');

module.exports = {
  // فحص التوحد المبكر
  MChatAssessment,

  // الملف الحسي
  SensoryProfileAssessment,

  // الوظائف التنفيذية
  BRIEF2Assessment,

  // الاستجابة الاجتماعية
  SRS2Assessment,

  // النمو المبكر
  PortageAssessment,

  // جمع بيانات السلوك (ABA)
  ABCDataCollection,

  // استبيان احتياجات الأسرة
  FamilyNeedsSurvey,

  // جودة الحياة
  QualityOfLifeAssessment,

  // الجاهزية للانتقال
  TransitionReadinessAssessment,

  // الفحص النمائي السعودي
  SaudiDevelopmentalScreening,

  // تقييم وظيفة السلوك (FBA + BIP)
  BehavioralFunctionAssessment,

  // مقياس عبء مقدم الرعاية
  CaregiverBurdenAssessment,
};
