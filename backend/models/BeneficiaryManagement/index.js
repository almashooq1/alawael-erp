/**
 * index.js - Unified Model Exports
 * Central export point for all Beneficiary Management models
 *
 * @module models/BeneficiaryManagement/index
 */

const Beneficiary = require('./Beneficiary');
const AcademicRecord = require('./AcademicRecord');
const AttendanceRecord = require('./AttendanceRecord');
const Scholarship = require('./Scholarship');
const Achievement = require('./Achievement');
const SkillsDevelopment = require('./SkillsDevelopment');
const SupportPlan = require('./SupportPlan');
const CounselingSession = require('./CounselingSession');
const FinancialSupport = require('./FinancialSupport');

module.exports = {
  // Core Models
  Beneficiary,
  AcademicRecord,
  AttendanceRecord,

  // Financial Models
  Scholarship,
  FinancialSupport,

  // Achievement & Development Models
  Achievement,
  SkillsDevelopment,

  // Support & Wellness Models
  SupportPlan,
  CounselingSession,

  /**
   * Initialize all models with database connection
   * @param {Object} mongoose - Mongoose instance
   * @returns {Object} All models
   */
  initializeModels: function(mongoose) {
    return {
      Beneficiary,
      AcademicRecord,
      AttendanceRecord,
      Scholarship,
      Achievement,
      SkillsDevelopment,
      SupportPlan,
      CounselingSession,
      FinancialSupport
    };
  },

  /**
   * Get all models
   * @returns {Array} Array of all models
   */
  getAllModels: function() {
    return [
      Beneficiary,
      AcademicRecord,
      AttendanceRecord,
      Scholarship,
      Achievement,
      SkillsDevelopment,
      SupportPlan,
      CounselingSession,
      FinancialSupport
    ];
  },

  /**
   * Get models by category
   * @param {string} category - 'academic', 'financial', 'achievements', 'support'
   * @returns {Array} Models in specified category
   */
  getModelsByCategory: function(category) {
    const categories = {
      academic: [Beneficiary, AcademicRecord, AttendanceRecord],
      financial: [Scholarship, FinancialSupport],
      achievements: [Achievement, SkillsDevelopment],
      support: [SupportPlan, CounselingSession]
    };
    return categories[category] || [];
  }
};
