'use strict';

/**
 * Rehabilitation Center Models — barrel export
 * Split from backend/models/rehabilitation-center.model.js (13 individual model files).
 */

const AssessmentTool = require('./assessment-tool.model');
const BeneficiaryAssessment = require('./beneficiary-assessment.model');
const IndividualizedPlan = require('./individualized-plan.model');
const GroupSession = require('./group-session.model');
const SatisfactionSurvey = require('./satisfaction-survey.model');
const SurveyResponse = require('./survey-response.model');
const Referral = require('./referral.model');
const Schedule = require('./schedule.model');
const AssistiveEquipment = require('./assistive-equipment.model');
const FamilyCommunication = require('./family-communication.model');
const Waitlist = require('./waitlist.model');
const ReportTemplate = require('./report-template.model');
const GeneratedReport = require('./generated-report.model');

module.exports = {
  AssessmentTool,
  BeneficiaryAssessment,
  IndividualizedPlan,
  GroupSession,
  SatisfactionSurvey,
  SurveyResponse,
  Referral,
  Schedule,
  AssistiveEquipment,
  FamilyCommunication,
  Waitlist,
  ReportTemplate,
  GeneratedReport,
};
