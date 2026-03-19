/* eslint-disable no-unused-vars */
/**
 * Models Index - Central Export Point
 * تصدير جميع نماذج Mongoose من قاعدة البيانات
 */

// Phase 3 - MongoDB Models
const Asset = require('./Asset');
const Schedule = require('./Schedule');
const Analytics = require('./Analytics');
const Report = require('./Report');
const DisabilityProgram = require('./DisabilityProgram');
const DisabilitySession = require('./DisabilitySession');
const Goal = require('./Goal');
const Assessment = require('./Assessment');
const Maintenance = require('./Maintenance');
const MaintenancePrediction = require('./MaintenancePrediction');
const Webhook = require('./Webhook');
const WebhookDelivery = require('./WebhookDelivery');

// Existing Models
const User = require('./User');
const Document = require('./Document');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');

// Financial Models
const FinancialJournalEntry = require('./FinancialJournalEntry');
const CashFlow = require('./CashFlow');
const RiskAssessment = require('./RiskAssessment');
const FinancialReport = require('./FinancialReport');
const ValidationRule = require('./ValidationRule');
const ComplianceMetric = require('./ComplianceMetric');
const ForecastModel = require('./ForecastModel');

module.exports = {
  // Phase 3 - MongoDB Models
  Asset,
  Schedule,
  Analytics,
  Report,
  DisabilityProgram,
  DisabilitySession,
  Goal,
  Assessment,
  Maintenance,
  MaintenancePrediction,
  Webhook,
  WebhookDelivery,

  // Existing Models
  User,
  Document,
  Notification,
  AuditLog,

  // Financial Models
  FinancialJournalEntry,
  CashFlow,
  RiskAssessment,
  FinancialReport,
  ValidationRule,
  ComplianceMetric,
  ForecastModel,
};
