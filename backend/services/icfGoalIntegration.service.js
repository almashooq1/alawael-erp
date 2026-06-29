const ICFAssessment = require('../models/assessment/ICFAssessmentLegacy');
const CarePlanVersion = require('../models/CarePlanVersion');
const GoalBank = require('../models/GoalBank');
const Beneficiary = require('../models/Beneficiary');
const reg = require('../intelligence/care-planning.registry');

// ─── Domain mapping (ICF domain → GoalBank domain) ─────────────────
const domainToGoalType = {
  bodyFunctions: 'OCCUPATIONAL',
  bodyStructures: 'PHYSICAL',
  activitiesAndParticipation: 'LIFE_SKILLS',
  environmentalFactors: 'SPECIAL_EDU',
  personalFactors: 'BEHAVIORAL',
};

// ─── ICF code prefix per domain ────────────────────────────────────
const domainPrefixMap = {
  bodyFunctions: 'b',
  bodyStructures: 's',
  activitiesAndParticipation: 'd',
  environmentalFactors: 'e',
  personalFactors: 'p',
};

// ─── Goal priority logic ───────────────────────────────────────────
function scoreToPriority(score) {
  if (score >= 3) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

// ─── Find the most impaired ICF code for a domain ──────────────────
function getPrimaryCodeForDomain(assessment, domain) {
  const prefix = domainPrefixMap[domain];
  if (!prefix || !assessment.scores) {
    return `${prefix}001`;
  }

  let worstCode = null;
  let worstPerformance = -1;

  for (const [code, scoreData] of assessment.scores) {
    if (code && code.charAt(0) === prefix) {
      const perf = scoreData.performance;
      if (typeof perf === 'number' && perf !== 8 && perf !== 9 && perf > worstPerformance) {
        worstPerformance = perf;
        worstCode = code;
      }
    }
  }

  return worstCode || `${prefix}001`;
}

// ─── Default goal template (when no GoalBank entry found) ─────────
function createDefaultGoal(domain, score, primaryCode, assessmentId) {
  const domainLabels = {
    bodyFunctions: 'وظائف الجسم',
    bodyStructures: 'أجزاء الجسم',
    activitiesAndParticipation: 'الأنشطة والمشاركة',
    environmentalFactors: 'العوامل البيئية',
    personalFactors: 'العوامل الشخصية',
  };

  const priorityScore = Math.min(100, Math.round((score / 4) * 100)) / 100;

  return {
    domain: domainToGoalType[domain],
    statement: `تحسين ${domainLabels[domain]} — تقليل درجة الاعاقة من ${score.toFixed(1)} إلى 1.0 خلال 12 أسبوع`,
    priorityScore: Math.min(1, Math.max(0, priorityScore)),
    targetValue: '1.0',
    targetUnit: 'ICF qualifier',
    targetHorizonWeeks: 12,
    icfMapping: [
      { icfCode: primaryCode, isPrimary: true, baselineQualifier: score, targetQualifier: 1 },
    ],
    assessmentLink: assessmentId,
    status: 'proposed',
  };
}

// ─── Build a goal from a GoalBank template ─────────────────────────
function buildGoalFromBank(bankGoal, domain, score, primaryCode, assessmentId) {
  const priorityScore = Math.min(100, Math.round((score / 4) * 100)) / 100;

  return {
    domain: domainToGoalType[domain],
    statement: bankGoal.description || bankGoal.category,
    priorityScore: Math.min(1, Math.max(0, priorityScore)),
    targetValue: '1.0',
    targetUnit: 'ICF qualifier',
    targetHorizonWeeks: 12,
    icfMapping: [
      { icfCode: primaryCode, isPrimary: true, baselineQualifier: score, targetQualifier: 1 },
    ],
    assessmentLink: assessmentId,
    status: 'proposed',
  };
}

// ─── Wrap a goal with a required goalId for PlanGoalSchema ─────────
function wrapGoal(goal, index) {
  return {
    ...goal,
    goalId: `icf-goal-${Date.now()}-${index}`,
  };
}

// ─── 1. Generate goals from assessment and push to a care plan ─────
async function generateGoalsFromAssessment(assessmentId, carePlanVersionId = null) {
  try {
    console.log(
      `[icfGoalIntegration] generateGoalsFromAssessment called: assessmentId=${assessmentId}, carePlanVersionId=${carePlanVersionId}`
    );

    const assessment = await ICFAssessment.findById(assessmentId);
    if (!assessment) {
      return { success: false, goals: [], message: 'ICF assessment not found' };
    }

    let targetPlanId = carePlanVersionId;

    if (!targetPlanId) {
      const latestPlan = await CarePlanVersion.findOne({
        beneficiaryId: assessment.beneficiary,
        status: { $nin: [reg.STATUSES.SUPERSEDED, reg.STATUSES.ARCHIVED] },
      }).sort({ createdAt: -1 });

      if (!latestPlan) {
        return {
          success: false,
          goals: [],
          message: 'No active care plan found for this beneficiary',
        };
      }

      targetPlanId = latestPlan._id.toString();
    }

    const generatedGoals = [];
    const domainScores = assessment.domainScores || {};
    let index = 0;

    for (const [domain, score] of Object.entries(domainScores)) {
      if (typeof score !== 'number' || score <= 2) continue;

      const goalType = domainToGoalType[domain];
      if (!goalType) continue;

      const primaryCode = getPrimaryCodeForDomain(assessment, domain);
      const bankGoals = await GoalBank.find({ domain: goalType }).limit(5);

      if (bankGoals && bankGoals.length > 0) {
        for (const bankGoal of bankGoals) {
          const goal = buildGoalFromBank(bankGoal, domain, score, primaryCode, assessmentId.toString());
          const planGoal = wrapGoal(goal, index++);
          generatedGoals.push(planGoal);
        }
      } else {
        const goal = createDefaultGoal(domain, score, primaryCode, assessmentId.toString());
        const planGoal = wrapGoal(goal, index++);
        generatedGoals.push(planGoal);
      }
    }

    if (generatedGoals.length > 0) {
      await CarePlanVersion.findByIdAndUpdate(
        targetPlanId,
        { $push: { goals: { $each: generatedGoals } } },
        { new: true }
      );
    }

    console.log(
      `[icfGoalIntegration] Generated ${generatedGoals.length} goals for plan ${targetPlanId}`
    );

    return {
      success: true,
      goals: generatedGoals,
      message: `Generated ${generatedGoals.length} therapeutic goals from ICF assessment`,
    };
  } catch (error) {
    console.error('[icfGoalIntegration] Error in generateGoalsFromAssessment:', error);
    return { success: false, goals: [], message: error.message };
  }
}

// ─── 2. Create a new care plan draft from an ICF assessment ───────
async function createCarePlanFromICF(assessmentId, authorId) {
  try {
    console.log(
      `[icfGoalIntegration] createCarePlanFromICF called: assessmentId=${assessmentId}, authorId=${authorId}`
    );

    const assessment = await ICFAssessment.findById(assessmentId);
    if (!assessment) {
      return { success: false, carePlanVersionId: null, goals: [], message: 'ICF assessment not found' };
    }

    const beneficiary = await Beneficiary.findById(assessment.beneficiary);
    if (!beneficiary) {
      return { success: false, carePlanVersionId: null, goals: [], message: 'Beneficiary not found' };
    }

    if (!beneficiary.branchId) {
      return {
        success: false,
        carePlanVersionId: null,
        goals: [],
        message: 'Beneficiary has no branch assigned',
      };
    }

    const planId = `ICF-${assessment._id.toString()}-${Date.now()}`;

    const newPlan = new CarePlanVersion({
      planId,
      versionNumber: 1,
      planType: reg.PLAN_TYPES.MULTIDISCIPLINARY,
      beneficiaryId: assessment.beneficiary,
      branchId: beneficiary.branchId,
      authorId,
      reasonForPlan: 'initial',
      status: reg.STATUSES.DRAFT,
      goals: [],
      programs: [],
      measures: [],
      tests: [],
      supportServices: [],
    });

    await newPlan.save();

    const result = await generateGoalsFromAssessment(assessmentId, newPlan._id.toString());

    return {
      success: result.success,
      carePlanVersionId: newPlan._id.toString(),
      goals: result.goals,
      message: result.message,
    };
  } catch (error) {
    console.error('[icfGoalIntegration] Error in createCarePlanFromICF:', error);
    return { success: false, carePlanVersionId: null, goals: [], message: error.message };
  }
}

// ─── 3. Analyze and return recommendations without saving ─────────
async function getGoalRecommendations(assessmentId) {
  try {
    console.log(`[icfGoalIntegration] getGoalRecommendations called: assessmentId=${assessmentId}`);

    const assessment = await ICFAssessment.findById(assessmentId);
    if (!assessment) {
      return { success: false, recommendations: [], message: 'ICF assessment not found' };
    }

    const recommendations = [];
    const domainScores = assessment.domainScores || {};

    for (const [domain, score] of Object.entries(domainScores)) {
      if (typeof score !== 'number' || score <= 2) continue;

      const goalType = domainToGoalType[domain];
      if (!goalType) continue;

      const primaryCode = getPrimaryCodeForDomain(assessment, domain);
      const bankGoals = await GoalBank.find({ domain: goalType }).limit(5);
      const priority = scoreToPriority(score);
      const priorityScore = Math.min(1, Math.round((score / 4) * 100) / 100);
      const rationaleBase = `Domain ${domain} scored ${score.toFixed(1)} (${priority} priority). `;

      if (bankGoals && bankGoals.length > 0) {
        for (const bankGoal of bankGoals) {
          recommendations.push({
            domain: goalType,
            statement: bankGoal.description || bankGoal.category,
            priority,
            priorityScore,
            icfMapping: [
              { icfCode: primaryCode, isPrimary: true, baselineQualifier: score, targetQualifier: 1 },
            ],
            targetHorizonWeeks: 12,
            rationale: `${rationaleBase}Matched from GoalBank category: ${bankGoal.category}.`,
            source: 'goal_bank',
            assessmentLink: assessmentId.toString(),
          });
        }
      } else {
        const domainLabels = {
          bodyFunctions: 'وظائف الجسم',
          bodyStructures: 'أجزاء الجسم',
          activitiesAndParticipation: 'الأنشطة والمشاركة',
          environmentalFactors: 'العوامل البيئية',
          personalFactors: 'العوامل الشخصية',
        };

        recommendations.push({
          domain: goalType,
          statement: `تحسين ${domainLabels[domain]} — تقليل درجة الاعاقة من ${score.toFixed(1)} إلى 1.0 خلال 12 أسبوع`,
          priority,
          priorityScore,
          icfMapping: [
            { icfCode: primaryCode, isPrimary: true, baselineQualifier: score, targetQualifier: 1 },
          ],
          targetHorizonWeeks: 12,
          rationale: `${rationaleBase}No GoalBank entry found; default SMART goal generated.`,
          source: 'default_template',
          assessmentLink: assessmentId.toString(),
        });
      }
    }

    return {
      success: true,
      recommendations,
      message: `Generated ${recommendations.length} recommendations from ICF assessment`,
    };
  } catch (error) {
    console.error('[icfGoalIntegration] Error in getGoalRecommendations:', error);
    return { success: false, recommendations: [], message: error.message };
  }
}

module.exports = {
  generateGoalsFromAssessment,
  createCarePlanFromICF,
  getGoalRecommendations,
};
