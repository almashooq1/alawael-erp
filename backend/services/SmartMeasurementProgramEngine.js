/**
 * محرك الربط الذكي بين المقاييس والبرامج
 * Smart Measurement-Program Linkage Engine
 * ========================================
 * يقوم بـ:
 * - تحليل نتائج المقاييس
 * - تفعيل البرامج الملائمة تلقائياً
 * - توليد توصيات شاملة
 * - تتبع التطابق والفاعلية
 */

const mongoose = require('mongoose');
const { MeasurementResult } = require('./MeasurementModels');
const { RehabilitationProgram, ProgramProgress } = require('./RehabilitationProgramModels');

class SmartMeasurementProgramEngine {
  /**
   * تحليل نتيجة قياس وتفعيل البرامج الملائمة
   */
  async analyzeMeasurementAndActivatePrograms(measurementResultId) {
    try {
      // 1. جلب نتيجة القياس
      const result = await MeasurementResult.findById(measurementResultId)
        .populate('measurementId')
        .populate('typeId');
      
      if (!result) {
        throw new Error('نتيجة القياس غير موجودة');
      }

      // 2. جلب المقاييس والنتائج السابقة للمستفيد
      const previousResults = await MeasurementResult.find({
        beneficiaryId: result.beneficiaryId,
        typeId: result.typeId,
        _id: { $ne: measurementResultId }
      }).sort({ dateAdministrated: -1 }).limit(5);

      // 3. تحديد البرامج المناسبة
      const suitablePrograms = await this.findSuitablePrograms(
        result,
        previousResults
      );

      // 4. تقييم درجة التطابق
      const programsWithScores = await Promise.all(
        suitablePrograms.map(prog => this.calculateMatchScore(result, prog))
      );

      // 5. ترتيب البرامج حسب الأهمية
      const rankedPrograms = programsWithScores
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5); // أفضل 5 برامج

      // 6. تفعيل البرامج
      const activatedPrograms = await this.activateProgramsForBeneficiary(
        result.beneficiaryId,
        rankedPrograms,
        measurementResultId
      );

      // 7. توليد التقرير والتوصيات
      const recommendations = await this.generateComprehensiveRecommendations(
        result,
        activatedPrograms,
        previousResults
      );

      return {
        success: true,
        measurementResultId,
        analyzedPrograms: activatedPrograms,
        recommendations,
        timestamp: new Date(),
        totalProgramsActivated: activatedPrograms.length
      };
    } catch (error) {
      console.error('خطأ في محرك الربط الذكي:', error);
      throw error;
    }
  }

  /**
   * البحث عن البرامج المناسبة بناءً على نتيجة القياس
   */
  async findSuitablePrograms(measurementResult, previousResults) {
    const measurement = measurementResult.measurementId;
    const measurementType = measurementResult.typeId;

    // البحث عن البرامج المرتبطة بهذا النوع من المقاييس
    const programs = await RehabilitationProgram.find({
      'linkedMeasurements.measurementTypeId': measurementType._id,
      isActive: true,
      status: 'APPROVED'
    });

    // تصفية البرامج حسب:
    // 1. نطاق العمر
    // 2. نوع الإعاقة
    // 3. مستوى الشدة
    // 4. معايير التفعيل

    const filteredPrograms = programs.filter(program => {
      // التحقق من معايير التفعيل
      const activationRule = program.linkedMeasurements.find(
        m => m.measurementTypeId.toString() === measurementType._id.toString()
      );

      if (!activationRule) return false;

      // التحقق من نطاق الدرجات
      const scoreInRange = 
        ((activationRule.activationRules.minScore === undefined || 
          measurementResult.rawScore >= activationRule.activationRules.minScore) &&
        (activationRule.activationRules.maxScore === undefined || 
          measurementResult.rawScore <= activationRule.activationRules.maxScore));

      // التحقق من المستوى
      const levelMatches = 
        !activationRule.activationRules.levels.length ||
        activationRule.activationRules.levels.includes(measurementResult.overallLevel);

      return scoreInRange && levelMatches;
    });

    return filteredPrograms;
  }

  /**
   * حساب درجة التطابق بين المستفيد والبرنامج
   */
  async calculateMatchScore(measurementResult, program) {
    let score = 0;
    let weights = {
      measurementCriteria: 40,
      severity: 30,
      demographics: 20,
      evidence: 10
    };

    // 1. معايير القياس
    const activationRule = program.linkedMeasurements[0]?.activationRules;
    if (activationRule) {
      const scopeInRange = 
        (activationRule.minScore === undefined || 
         measurementResult.rawScore >= activationRule.minScore * 0.9) &&
        (activationRule.maxScore === undefined || 
         measurementResult.rawScore <= activationRule.maxScore * 1.1);
      
      if (scopeInRange) {
        score += weights.measurementCriteria;
      } else {
        score += weights.measurementCriteria * 0.5;
      }
    }

    // 2. مستوى الشدة
    const severityMatch = program.suitableSeverityLevels.includes(
      measurementResult.overallLevel
    );
    if (severityMatch) {
      score += weights.severity;
    } else if (program.suitableSeverityLevels.includes('ALL')) {
      score += weights.severity * 0.8;
    }

    // 3. البيانات السكانية (العمر)
    const ageMatch = this.checkAgeMatch(
      measurementResult.beneficiaryId,
      program.targetAgeGroup
    );
    if (ageMatch) {
      score += weights.demographics;
    } else {
      score += weights.demographics * 0.3;
    }

    // 4. الأساس العلمي والفعالية
    if (program.evidenceBase?.researchBased) {
      score += weights.evidence;
    } else {
      score += weights.evidence * 0.5;
    }

    return {
      programId: program._id,
      programName: program.nameAr,
      matchScore: score,
      reasoning: this.generateMatchReasoning(program, measurementResult)
    };
  }

  /**
   * تفعيل البرامج للمستفيد
   */
  async activateProgramsForBeneficiary(beneficiaryId, rankedPrograms, measurementResultId) {
    const activatedPrograms = [];

    for (const programData of rankedPrograms) {
      try {
        // التحقق من عدم وجود برنامج نشط من نفس النوع
        const existingProgress = await ProgramProgress.findOne({
          beneficiaryId,
          programId: programData.programId,
          overallStatus: 'ACTIVE'
        });

        if (!existingProgress) {
          // إنشاء سجل تقدم جديد
          const programProgress = new ProgramProgress({
            beneficiaryId,
            programId: programData.programId,
            enrollmentDate: new Date(),
            expectedCompletionDate: this.calculateExpectedCompletionDate(),
            overallStatus: 'ENROLLING'
          });

          await programProgress.save();

          activatedPrograms.push({
            programId: programData.programId,
            programName: programData.programName,
            matchScore: programData.matchScore,
            progressId: programProgress._id,
            activationDate: new Date(),
            linkedMeasurementResult: measurementResultId
          });
        }
      } catch (error) {
        console.error(`خطأ في تفعيل البرنامج ${programData.programId}:`, error);
      }
    }

    return activatedPrograms;
  }

  /**
   * توليد توصيات شاملة
   */
  async generateComprehensiveRecommendations(
    measurementResult,
    activatedPrograms,
    previousResults
  ) {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      familyGuidance: [],
      educationalSupport: [],
      precautions: []
    };

    // 1. التوصيات الفورية بناءً على النتيجة
    if (measurementResult.overallLevel === 'PROFOUND' || 
        measurementResult.overallLevel === 'SEVERE') {
      recommendations.immediate.push(
        'يوصى ببدء التدخل الفوري والمركز',
        'تقييم شامل من قبل الفريق متعدد التخصصات',
        'تطوير خطة تأهيلية فردية مفصلة'
      );
    }

    // 2. التوصيات البرنامجية
    if (activatedPrograms.length > 0) {
      recommendations.shortTerm.push(
        `تفعيل ${activatedPrograms.length} برامج تأهيلية`,
        `البدء بأولويات عالية: ${activatedPrograms
          .slice(0, 3)
          .map(p => p.programName)
          .join(', ')}`
      );
    }

    // 3. التوصيات الأسرية
    const measurementType = measurementResult.typeId;
    if (measurementType.recommendedFollowUp) {
      recommendations.familyGuidance.push(
        'تدريب الأسرة على استراتيجيات التعزيز في البيت',
        'إعداد برنامج بيتي يومي متخصص',
        'توفير استشارات دورية للوالدين'
      );
    }

    // 4. التقدم المقارن (إن وجد)
    if (previousResults.length > 0) {
      const improvement = this.calculateProgressTrend(
        previousResults,
        measurementResult
      );
      recommendations.longTerm.push(
        `اتجاه التطور: ${improvement.trend}`,
        `معدل التحسن: ${improvement.rate}%`,
        `الإجراءات المستقبلية: ${improvement.recommendations.join(', ')}`
      );
    }

    // 5. التحذيرات والاحتياطات
    if (measurementResult.interpretation?.specialNotes) {
      recommendations.precautions.push(
        measurementResult.interpretation.specialNotes
      );
    }

    return recommendations;
  }

  /**
   * حساب اتجاه التقدم
   */
  calculateProgressTrend(previousResults, currentResult) {
    if (previousResults.length === 0) {
      return { trend: 'بداية جديدة', rate: 0, recommendations: [] };
    }

    const scores = previousResults.map(r => r.rawScore).reverse();
    scores.push(currentResult.rawScore);

    const initialScore = scores[0];
    const latestScore = scores[scores.length - 1];
    const improvement = ((latestScore - initialScore) / initialScore) * 100;

    let trend = 'مستقر';
    if (improvement > 10) trend = 'تحسن ملحوظ';
    if (improvement > 20) trend = 'تحسن قوي';
    if (improvement < -10) trend = 'انخفاض ملحوظ';
    if (improvement < -20) trend = 'انخفاض حاد';

    return {
      trend,
      rate: Math.round(improvement),
      recommendations: this.generateProgressRecommendations(trend, improvement)
    };
  }

  /**
   * توليد توصيات بناءً على التقدم
   */
  generateProgressRecommendations(trend, improvement) {
    const recommendations = [];

    if (improvement > 20) {
      recommendations.push(
        'الاستمرار في البرنامج الحالي',
        'الترقي لمستوى أعلى من الصعوبة'
      );
    } else if (improvement > 10) {
      recommendations.push(
        'الاستمرار مع تعزيز البرنامج قليلاً'
      );
    } else if (improvement > 0) {
      recommendations.push(
        'مراجعة الاستراتيجيات المستخدمة',
        'تكثيف التدخل'
      );
    } else if (improvement >= -10) {
      recommendations.push(
        'تعديل جذري على البرنامج',
        'اجتماع فريق متعدد التخصصات'
      );
    } else {
      recommendations.push(
        'إعادة تقييم شامل',
        'مراجعة التشخيص الأساسي',
        'استشارة متخصصين إضافيين'
      );
    }

    return recommendations;
  }

  /**
   * التحقق من تطابق العمر
   */
  async checkAgeMatch(beneficiaryId, ageTarget) {
    // يتم جلب عمر المستفيد من قاعدة البيانات
    // هذا تطبيق بسيط
    return true;
  }

  /**
   * حساب تاريخ الانتهاء المتوقع
   */
  calculateExpectedCompletionDate(durationWeeks = 12) {
    const date = new Date();
    date.setDate(date.getDate() + (durationWeeks * 7));
    return date;
  }

  /**
   * توليد تفسير التطابق
   */
  generateMatchReasoning(program, measurementResult) {
    return [
      `يطابق نوع الإعاقة: ${program.targetDisabilities.join(', ')}`,
      `مستوى الشدة المناسب: ${measurementResult.overallLevel}`,
      `البرنامج يوفر: ${program.objectives.slice(0, 2).map(o => o.description).join(', ')}`
    ].join(' | ');
  }

  /**
   * إنشاء تقرير شامل للمستفيد
   */
  async generateBeneficiaryReport(beneficiaryId) {
    try {
      // جلب آخر نتائج القياسات
      const latestResults = await MeasurementResult.find({
        beneficiaryId,
        status: 'APPROVED'
      })
        .sort({ dateAdministrated: -1 })
        .limit(10)
        .populate('typeId')
        .populate('measurementId');

      // جلب البرامج النشطة
      const activePrograms = await ProgramProgress.find({
        beneficiaryId,
        overallStatus: 'ACTIVE'
      })
        .populate('programId');

      // جلب الخطة التأهيلية الفردية
      const { IndividualRehabPlan } = require('./MeasurementModels');
      const irp = await IndividualRehabPlan.findOne({
        beneficiaryId,
        status: { $in: ['ACTIVE', 'UNDER_REVIEW'] }
      });

      return {
        beneficiaryId,
        latestMeasurements: latestResults,
        activePrograms: activePrograms,
        individualPlan: irp,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('خطأ في إنشاء التقرير:', error);
      throw error;
    }
  }

  /**
   * تتبع فعالية البرنامج
   */
  async trackProgramEffectiveness(programProgressId) {
    const progress = await ProgramProgress.findById(programProgressId);
    
    if (!progress) {
      throw new Error('سجل تقدم البرنامج غير موجود');
    }

    // حساب مؤشرات الفعالية
    const effectiveness = {
      attendanceRate: (progress.completedSessions / progress.totalPlannedSessions) * 100,
      objectivesMet: progress.objectiveProgress.filter(
        obj => obj.status === 'MET' || obj.status === 'EXCEEDED'
      ).length,
      totalObjectives: progress.objectiveProgress.length,
      skillAcquisitionRate: progress.statistics?.skillAcquisitionRate || 0,
      engagement: progress.statistics?.engagementScore || 0,
      overallEffectiveness: this.calculateOverallEffectiveness(progress)
    };

    return effectiveness;
  }

  /**
   * حساب الفعالية الإجمالية
   */
  calculateOverallEffectiveness(progress) {
    const weights = {
      attendance: 0.25,
      objectiveAchievement: 0.40,
      skillAcquisition: 0.20,
      engagement: 0.15
    };

    const attendanceRate = (progress.completedSessions / progress.totalPlannedSessions) * 100;
    const objectiveRate = (progress.objectiveProgress.filter(
      obj => obj.status === 'MET' || obj.status === 'EXCEEDED'
    ).length / progress.objectiveProgress.length) * 100;
    const skillRate = progress.statistics?.skillAcquisitionRate || 0;
    const engagementRate = progress.statistics?.engagementScore || 0;

    return (
      (attendanceRate * weights.attendance +
       objectiveRate * weights.objectiveAchievement +
       skillRate * weights.skillAcquisition +
       engagementRate * weights.engagement) / 100
    ).toFixed(2);
  }
}

module.exports = SmartMeasurementProgramEngine;
