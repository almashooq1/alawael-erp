/**
 * Domain Registry — سجل النطاقات الرئيسي
 * ══════════════════════════════════════════════════════════════════════════
 * Central entry point for all domain modules.
 *
 * Usage:
 *   const domains = require('./domains');
 *   await domains.notifications.send({ ... });
 *   await domains.hr.employee.create({ ... });
 *   await domains.security.roles.getAll();
 *
 * @module domains
 */

const notifications = require('./notifications');
const hr = require('./hr');
const security = require('./security');

module.exports = {
  notifications,
  hr,
  security,
  // Add more domains as they are consolidated:
  // auth: require('./auth'),
  // beneficiary: require('./beneficiary'),
  // rehabilitation: require('./rehabilitation'),
  // assessment: require('./assessment'),
  // finance: require('./finance'),
  // fleet: require('./fleet'),
  // dashboard: require('./dashboard'),
  // documents: require('./documents'),
  // supplyChain: require('./supply-chain'),
  // aiMl: require('./ai-ml'),
  // integration: require('./integration'),
  // quality: require('./quality'),
  // telehealth: require('./telehealth'),
  // scheduling: require('./scheduling'),
  // reporting: require('./reporting'),
  // system: require('./system'),
};
