'use strict';

/**
 * Advanced Rehabilitation Center Systems — barrel export
 * أنظمة متقدمة لمراكز تأهيل ذوي الإعاقة
 *
 * @module models/rehab-advanced
 */

const BehaviorIncident = require('./BehaviorIncident.model');
const BehaviorPlan = require('./BehaviorPlan.model');
const VocationalProfile = require('./VocationalProfile.model');
const JobCoachLog = require('./JobCoachLog.model');
const HomeProgram = require('./HomeProgram.model');
const MedicationRecord = require('./MedicationRecord.model');
const AutismProfile = require('./AutismProfile.model');
const TherapySession = require('./TherapySession.model');
const NutritionPlan = require('./NutritionPlan.model');
const ResourceRoom = require('./ResourceRoom.model');
const StaffCertification = require('./StaffCertification.model');
const DischargePlan = require('./DischargePlan.model');

module.exports = {
  // نظام السلوك
  BehaviorIncident,
  BehaviorPlan,

  // نظام التدريب المهني
  VocationalProfile,
  JobCoachLog,

  // نظام المتابعة المنزلية
  HomeProgram,

  // نظام الأدوية
  MedicationRecord,

  // نظام التوحد
  AutismProfile,

  // نظام العلاج
  TherapySession,

  // نظام التغذية
  NutritionPlan,

  // نظام غرف الموارد
  ResourceRoom,

  // نظام الشهادات
  StaffCertification,

  // نظام الخروج
  DischargePlan,
};
