'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const behaviorIncidentSchema = new Schema(
  {
    incident_id: {
      type: String,
      unique: true,
      default: () => `BHV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // معلومات الحادثة
    incident_info: {
      date: { type: Date, required: true },
      time: String,
      location: String,
      duration: Number, // بالدقائق
      intensity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'crisis'],
        required: true,
      },
    },

    // نوع السلوك
    behavior_type: {
      category: {
        type: String,
        enum: [
          'aggression', // عدوان
          'self_injury', // إيذاء ذاتي
          'property_destruction', // تخريب ممتلكات
          'disruption', // تعطيل
          'non_compliance', // عدم امتثال
          'elopement', // هروب
          'stereotypy', // نمطية
          'verbal_aggression', // عدوان لفظي
          'tantrum', // نوبة غضب
          'other',
        ],
      },
      description: String,
      antecedent: String, // ما حدث قبل السلوك
      consequence: String, // ما حدث بعد السلوك
    },

    // التدخلات المستخدمة
    interventions_used: [
      {
        intervention_type: String,
        description: String,
        effectiveness: {
          type: String,
          enum: ['very_effective', 'effective', 'somewhat_effective', 'not_effective'],
        },
        staff_involved: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      },
    ],

    // الإصابات أو الأضرار
    injuries_or_damages: [
      {
        type: { type: String, enum: ['injury', 'property_damage'] },
        description: String,
        severity: String,
        action_taken: String,
      },
    ],

    // إخطار ولي الأمر
    guardian_notification: {
      notified: { type: Boolean, default: false },
      notification_date: Date,
      method: { type: String, enum: ['phone', 'email', 'in_person', 'app'] },
      guardian_name: String,
      response: String,
    },

    // خطوات المتابعة
    follow_up_actions: [
      {
        action: String,
        responsible: { type: Schema.Types.ObjectId, ref: 'User' },
        due_date: Date,
        completed: { type: Boolean, default: false },
        completed_date: Date,
      },
    ],

    // المرفقات
    attachments: [
      {
        file_name: String,
        file_url: String,
        file_type: String,
      },
    ],

    reported_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
);

behaviorIncidentSchema.index({ beneficiary_id: 1, 'incident_info.date': -1 });

const BehaviorIncident =
  mongoose.models.BehaviorIncident || mongoose.model('BehaviorIncident', behaviorIncidentSchema);

module.exports = BehaviorIncident;
