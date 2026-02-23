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
};
