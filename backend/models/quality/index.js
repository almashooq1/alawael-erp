'use strict';

const QualityStandard = require('./QualityStandard.model');
const Checklist = require('./Checklist.model');
const ChecklistSubmission = require('./ChecklistSubmission.model');
const Incident = require('./Incident.model');
const Complaint = require('./Complaint.model');
const SatisfactionSurvey = require('./SatisfactionSurvey.model');
const Audit = require('./Audit.model');
const ImprovementProject = require('./ImprovementProject.model');
const Risk = require('./Risk.model');

module.exports = {
  QualityStandard,
  Checklist,
  ChecklistSubmission,
  Incident,
  Complaint,
  SatisfactionSurvey,
  Audit,
  ImprovementProject,
  Risk,
};
