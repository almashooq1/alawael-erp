'use strict';

/**
 * FinancialNavigationPlan — W469.
 *
 * Per-family financial situation snapshot + benefits-navigation plan.
 * Per Phase C Innovation 4. Tracks current budget state + suggested
 * government/insurance pathways + caregiver employment situation +
 * feeds the financialStressInverse component of WBCI (W467).
 */

const mongoose = require('mongoose');

const SuggestedProgramSchema = new mongoose.Schema(
  {
    programCode: { type: String, required: true, maxlength: 100 },
    nameAr: { type: String, maxlength: 300 },
    nameEn: { type: String, maxlength: 300 },
    authority: {
      type: String,
      enum: ['disability_authority', 'hrsd', 'nphies', 'sehhaty', 'other'],
    },
    relevanceScore: { type: Number, min: 0, max: 10 },
    applicationStatus: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'approved', 'rejected', 'inactive'],
      default: 'not_started',
    },
    appliedAt: { type: Date },
    decisionAt: { type: Date },
    notes: { type: String, maxlength: 1000 },
  },
  { _id: false }
);

const FinancialNavigationPlanSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true, // one active plan per beneficiary
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    // Family financial profile (no PII; aggregate banding)
    profile: {
      hasDisabilityCard: { type: Boolean },
      isSaudiCitizen: { type: Boolean },
      lowIncomeHousehold: { type: Boolean },
      employedCaregiver: { type: Boolean },
      hasHealthInsurance: { type: Boolean },
      activeRehabProgram: { type: Boolean },
      workingAge: { type: Boolean },
      hasChronicCondition: { type: Boolean },
      hasSehhatyAccount: { type: Boolean },
    },

    // Budget snapshot — store BANDED values (privacy preserving)
    budget: {
      incomeBand: {
        type: String,
        enum: ['under_5k', '5_to_10k', '10_to_20k', '20_to_40k', 'over_40k', 'undisclosed'],
      },
      expenseRatio: { type: Number, min: 0, max: 5 }, // monthly expenses / income
      disabilityCostsRatio: { type: Number, min: 0, max: 2 }, // disability costs / income
      savingsMonths: { type: Number, min: 0, max: 24 },
    },

    // Computed via benefits-navigator.lib in pre-save
    financialStressLikert: { type: Number, min: 1, max: 5 }, // 5 = highest stress
    financialWellbeing: { type: Number, min: 0, max: 100 }, // feeds WBCI

    suggestedPrograms: { type: [SuggestedProgramSchema], default: () => [] },

    counsellingScheduledAt: { type: Date },
    counsellingCompletedAt: { type: Date },
    counsellorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    status: {
      type: String,
      enum: ['draft', 'active', 'on_hold', 'completed', 'archived'],
      default: 'active',
      index: true,
    },

    notes: { type: String, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    collection: 'financial_navigation_plans',
  }
);

FinancialNavigationPlanSchema.index({ branchId: 1, status: 1 });
FinancialNavigationPlanSchema.index({ beneficiaryId: 1, status: 1 });

// W469 Wave-18 — auto-compute financial stress + wellbeing + suggest programs
FinancialNavigationPlanSchema.pre('save', function (next) {
  const navLib = require('../intelligence/benefits-navigator.lib');
  const wbciLib = require('../intelligence/family-wbci.lib');

  // Translate banded budget snapshot to stress Likert via lib
  let stressInput = null;
  if (this.budget) {
    const incomeMidpoint = _incomeBandMidpoint(this.budget.incomeBand);
    if (incomeMidpoint && typeof this.budget.expenseRatio === 'number') {
      stressInput = {
        monthlyIncome: incomeMidpoint,
        monthlyExpenses: incomeMidpoint * this.budget.expenseRatio,
        monthlyDisabilityCosts:
          typeof this.budget.disabilityCostsRatio === 'number'
            ? incomeMidpoint * this.budget.disabilityCostsRatio
            : 0,
        savingsMonths: this.budget.savingsMonths,
      };
    }
  }
  if (stressInput) {
    this.financialStressLikert = navLib.computeFinancialStress(stressInput);
    this.financialWellbeing = wbciLib.inverseFinancialStress(this.financialStressLikert);
  }

  // Refresh suggested programs from current profile
  if (this.profile) {
    const profileObj = this.profile.toObject?.() || this.profile;
    const result = navLib.suggestPrograms(profileObj);
    // Preserve any existing applicationStatus on already-listed programs
    const existingByCode = new Map((this.suggestedPrograms || []).map(s => [s.programCode, s]));
    this.suggestedPrograms = result.programs.map(p => {
      const existing = existingByCode.get(p.code);
      return {
        programCode: p.code,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        authority: p.authority,
        relevanceScore: p.relevanceScore,
        applicationStatus: existing?.applicationStatus || 'not_started',
        appliedAt: existing?.appliedAt,
        decisionAt: existing?.decisionAt,
        notes: existing?.notes,
      };
    });
  }

  next();
});

function _incomeBandMidpoint(band) {
  switch (band) {
    case 'under_5k':
      return 3000;
    case '5_to_10k':
      return 7500;
    case '10_to_20k':
      return 15000;
    case '20_to_40k':
      return 30000;
    case 'over_40k':
      return 50000;
    default:
      return null;
  }
}

module.exports =
  mongoose.models.FinancialNavigationPlan ||
  mongoose.model('FinancialNavigationPlan', FinancialNavigationPlanSchema);
