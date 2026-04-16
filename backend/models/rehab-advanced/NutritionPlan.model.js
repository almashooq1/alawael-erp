'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const nutritionPlanSchema = new Schema(
  {
    plan_id: {
      type: String,
      unique: true,
      default: () => `NUT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // التقييم الغذائي
    nutritional_assessment: {
      assessment_date: Date,
      assessor: { type: Schema.Types.ObjectId, ref: 'User' },

      anthropometrics: {
        height: Number,
        weight: Number,
        bmi: Number,
        head_circumference: Number,
        growth_percentile: Number,
      },

      dietary_intake: {
        typical_meals: [String],
        food_preferences: [String],
        food_aversions: [String],
        texture_issues: [String],
        feeding_behaviors: [String],
      },

      feeding_ability: {
        self_feeding: { type: String, enum: ['independent', 'needs_assist', 'dependent'] },
        utensil_use: String,
        chewing: String,
        swallowing: String,
        aspiration_risk: { type: Boolean, default: false },
      },

      nutritional_deficiencies: [String],
      allergies: [String],
      intolerances: [String],
    },

    // الخطة الغذائية
    meal_plan: {
      meals_per_day: Number,
      snacks_per_day: Number,

      meals: [
        {
          meal_name: String,
          time: String,
          foods: [
            {
              food_item: String,
              portion: String,
              calories: Number,
              protein: Number,
              carbs: Number,
              fat: Number,
            },
          ],
          texture_modification: String,
          notes: String,
        },
      ],

      total_daily_nutrients: {
        calories: Number,
        protein: Number,
        carbohydrates: Number,
        fat: Number,
        fiber: Number,
        vitamins: Schema.Types.Mixed,
        minerals: Schema.Types.Mixed,
      },

      fluid_requirements: {
        daily_amount: Number,
        fluid_type: [String],
        thickening_required: { type: Boolean, default: false },
        thickening_level: String,
      },
    },

    // المكملات الغذائية
    supplements: [
      {
        supplement_name: String,
        dosage: String,
        frequency: String,
        purpose: String,
        start_date: Date,
      },
    ],

    // التعديلات الخاصة
    special_modifications: {
      diet_type: {
        type: String,
        enum: [
          'regular',
          'pureed',
          'mechanical_soft',
          'soft',
          'liquid',
          'gf_cf',
          'ketogenic',
          'other',
        ],
      },
      texture_modifications: [String],
      feeding_position: String,
      special_equipment: [String],
    },

    // متابعة الوزن
    weight_monitoring: [
      {
        date: Date,
        weight: Number,
        bmi: Number,
        notes: String,
      },
    ],

    // أهداف التغذية
    nutrition_goals: [
      {
        goal: String,
        target: String,
        timeline: Date,
        status: { type: String, enum: ['not_started', 'in_progress', 'achieved', 'not_achieved'] },
      },
    ],

    effective_date: { type: Date, default: Date.now },
    end_date: Date,

    dietitian: { type: Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

nutritionPlanSchema.index({ beneficiary_id: 1 });

const NutritionPlan =
  mongoose.models.NutritionPlan || mongoose.model('NutritionPlan', nutritionPlanSchema);

module.exports = NutritionPlan;
