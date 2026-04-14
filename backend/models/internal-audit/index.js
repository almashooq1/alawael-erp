'use strict';
const AnnualAuditPlan = require('./AnnualAuditPlan.model');
const SurpriseAudit = require('./SurpriseAudit.model');
const NonConformanceReport = require('./NonConformanceReport.model');
const CorrectivePreventiveAction = require('./CorrectivePreventiveAction.model');
const ClosureFollowUp = require('./ClosureFollowUp.model');
module.exports = {
  AnnualAuditPlan,
  SurpriseAudit,
  NonConformanceReport,
  CorrectivePreventiveAction,
  ClosureFollowUp,
};
