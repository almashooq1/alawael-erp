/**
 * خدمات المقاييس والتقييمات الشاملة
 * Comprehensive Measurement Services
 * ==================================
 */

const {
  MeasurementType,
  MeasurementMaster,
  MeasurementResult,
  IndividualRehabPlan,
  QuickAssessment
} = require('../models/MeasurementModels');

const {
  RehabilitationProgram,
  ProgramProgress,
  ProgramSession
} = require('../models/RehabilitationProgramModels');

const SmartEngine = require('./SmartMeasurementProgramEngine');

class MeasurementService {
  /**
   * إنشاء نوع مقياس جديد
   */
  async createMeasurementType(data) {
    try {
      const measurementType = new MeasurementType({
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        category: data.category,
        description: data.description,
        targetDisabilities: data.targetDisabilities,
        ageRange: data.ageRange,
        estimatedTime: data.estimatedTime,
        isStandardized: data.isStandardized,
        normSource: data.normSource,
        scoringMethod: data.scoringMethod,
        scoreRange: data.scoreRange,
        interpretationLevels: data.interpretationLevels,
        domains: data.domains,
        administratedBy: data.administratedBy
      });

      return await measurementType.save();
    } catch (error) {
      throw new Error(`خطأ في إنشاء نوع المقياس: ${error.message}`);
    }
  }

  /**
   * إنشاء مقياس رئيسي
   */
  async createMeasurementMaster(data) {
    try {
      const measurementMaster = new MeasurementMaster({
        code: data.code,
        typeId: data.typeId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        description: data.description,
        version: data.version,
        targetDisabilities: data.targetDisabilities,
        ageRange: data.ageRange,
        administrationGuide: data.administrationGuide,
        items: data.items,
        totalItems: data.totalItems,
        estimatedDuration: data.estimatedDuration,
        scoringMethod: data.scoringMethod,
        scoringGuide: data.scoringGuide,
        normTables: data.normTables,
        reliabilityCoefficients: data.reliabilityCoefficients,
        validityInfo: data.validityInfo,
        interpretationGuide: data.interpretationGuide,
        requiredCertifications: data.requiredCertifications,
        culturalAdaptations: data.culturalAdaptations
      });

      return await measurementMaster.save();
    } catch (error) {
      throw new Error(`خطأ في إنشاء المقياس الرئيسي: ${error.message}`);
    }
  }

  /**
   * تسجيل نتيجة قياس جديدة
   */
  async recordMeasurementResult(beneficiaryId, data) {
    try {
      const measurementResult = new MeasurementResult({
        beneficiaryId,
        measurementId: data.measurementId,
        typeId: data.typeId,
        administratedBy: data.administratedBy,
        dateAdministrated: data.dateAdministrated,
        rawScore: data.rawScore,
        standardScore: data.standardScore,
        percentileRank: data.percentileRank,
        ageEquivalent: data.ageEquivalent,
        gradeEquivalent: data.gradeEquivalent,
        domainScores: data.domainScores,
        overallLevel: data.overallLevel,
        interpretation: data.interpretation,
        behavioralObservations: data.behavioralObservations,
        testingLimitations: data.testingLimitations,
        recommendedFollowUp: data.recommendedFollowUp,
        status: 'PENDING_REVIEW'
      });

      const saved = await measurementResult.save();

      // تفعيل محرك الربط الذكي
      const smartEngine = new SmartEngine();
      const automatedPrograms = await smartEngine.analyzeMeasurementAndActivatePrograms(
        saved._id
      );

      return {
        measurementResult: saved,
        automatedPrograms
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل نتيجة القياس: ${error.message}`);
    }
  }

  /**
   * الحصول على آخر نتائج المستفيد
   */
  async getBeneficiaryLatestResults(beneficiaryId) {
    try {
      const results = await MeasurementResult.find({
        beneficiaryId,
        status: 'APPROVED'
      })
        .sort({ dateAdministrated: -1 })
        .populate('measurementId')
        .populate('typeId')
        .limit(10);

      return results;
    } catch (error) {
      throw new Error(`خطأ في جلب النتائج: ${error.message}`);
    }
  }

  /**
   * مقارنة نتائج القياس عبر الزمن
   */
  async compareMeasurementResults(beneficiaryId, measurementTypeId) {
    try {
      const results = await MeasurementResult.find({
        beneficiaryId,
        typeId: measurementTypeId,
        status: 'APPROVED'
      })
        .sort({ dateAdministrated: 1 })
        .populate('typeId');

      if (results.length < 2) {
        return {
          message: 'لا توجد نتائج كافية للمقارنة',
          results
        };
      }

      // حساب الفرق
      const trend = results.map(r => ({
        date: r.dateAdministrated,
        score: r.rawScore,
        level: r.overallLevel,
        progress: r.domainScores?.map(d => ({
          domain: d.domainName,
          score: d.standardScore
        }))
      }));

      const improvement = results[results.length - 1].rawScore - results[0].rawScore;
      const improvementPercentage = (improvement / results[0].rawScore) * 100;

      return {
        totalMeasurements: results.length,
        trend,
        totalImprovement: improvement,
        improvementPercentage: improvementPercentage.toFixed(2),
        direction: improvement > 0 ? 'تحسن' : improvement < 0 ? 'انخفاض' : 'مستقر'
      };
    } catch (error) {
      throw new Error(`خطأ في مقارنة النتائج: ${error.message}`);
    }
  }

  /**
   * إنشاء خطة تأهيلية فردية
   */
  async createIndividualRehabPlan(beneficiaryId, data) {
    try {
      const planCode = await this.generatePlanCode();

      const irp = new IndividualRehabPlan({
        beneficiaryId,
        planCode,
        beneficiaryInfo: data.beneficiaryInfo,
        planningTeam: data.planningTeam,
        baseMeasurements: data.baseMeasurements,
        vision: data.vision,
        mission: data.mission,
        rehabilitationAreas: data.rehabilitationAreas,
        activePrograms: data.activePrograms,
        milestones: data.milestones,
        recommendations: data.recommendations,
        familyInvolvement: data.familyInvolvement,
        externalCoordination: data.externalCoordination,
        planPeriod: data.planPeriod,
        status: 'DRAFT'
      });

      return await irp.save();
    } catch (error) {
      throw new Error(`خطأ في إنشاء خطة التأهيل: ${error.message}`);
    }
  }

  /**
   * تحديث خطة تأهيلية فردية
   */
  async updateIndividualRehabPlan(planId, updateData) {
    try {
      const updated = await IndividualRehabPlan.findByIdAndUpdate(
        planId,
        {
          ...updateData,
          updatedAt: new Date()
        },
        { new: true }
      );

      return updated;
    } catch (error) {
      throw new Error(`خطأ في تحديث خطة التأهيل: ${error.message}`);
    }
  }

  /**
   * الحصول على خطة التأهيل الفردية
   */
  async getIndividualRehabPlan(beneficiaryId) {
    try {
      const plan = await IndividualRehabPlan.findOne({
        beneficiaryId,
        status: { $in: ['DRAFT', 'ACTIVE', 'UNDER_REVIEW'] }
      })
        .populate('planningTeam.userId')
        .populate('baseMeasurements.resultId')
        .populate('activePrograms.programId');

      return plan;
    } catch (error) {
      throw new Error(`خطأ في جلب خطة التأهيل: ${error.message}`);
    }
  }

  /**
   * إنشاء تقرير شامل للمستفيد
   */
  async generateComprehensiveReport(beneficiaryId) {
    try {
      const smartEngine = new SmartEngine();
      
      // جلب البيانات الشاملة
      const measurements = await MeasurementResult.find({
        beneficiaryId,
        status: 'APPROVED'
      })
        .sort({ dateAdministrated: -1 })
        .populate('typeId')
        .populate('measurementId')
        .limit(15);

      const programs = await ProgramProgress.find({
        beneficiaryId,
        overallStatus: { $in: ['ACTIVE', 'COMPLETED'] }
      })
        .populate('programId');

      const irp = await IndividualRehabPlan.findOne({
        beneficiaryId,
        status: { $in: ['ACTIVE'] }
      });

      // توليد التقرير
      const report = {
        beneficiaryId,
        generationDate: new Date(),
        measurements: {
          total: measurements.length,
          latest: measurements[0],
          history: measurements
        },
        programs: {
          active: programs.filter(p => p.overallStatus === 'ACTIVE'),
          completed: programs.filter(p => p.overallStatus === 'COMPLETED')
        },
        individualPlan: irp,
        summary: {
          overallStatus: this.calculateOverallStatus(measurements, programs),
          strengths: this.identifyStrengths(measurements),
          areasForImprovement: this.identifyAreasForImprovement(measurements),
          recommendations: this.generateFinalRecommendations(measurements, programs)
        }
      };

      return report;
    } catch (error) {
      throw new Error(`خطأ في إنشاء التقرير الشامل: ${error.message}`);
    }
  }

  /**
   * تسجيل جلسة برنامج
   */
  async recordProgramSession(beneficiaryId, programId, data) {
    try {
      const session = new ProgramSession({
        beneficiaryId,
        programId,
        sessionNumber: data.sessionNumber,
        scheduledDate: data.scheduledDate,
        actualDate: data.actualDate || new Date(),
        sessionDuration: data.sessionDuration,
        sessionType: data.sessionType,
        facilitators: data.facilitators,
        participants: data.participants,
        content: data.content,
        performance: data.performance,
        education: data.education,
        nextSteps: data.nextSteps,
        sessionOutcome: data.sessionOutcome,
        status: 'COMPLETED'
      });

      const saved = await session.save();

      // تحديث تقدم البرنامج
      await this.updateProgramProgress(beneficiaryId, programId, data);

      return saved;
    } catch (error) {
      throw new Error(`خطأ في تسجيل جلسة البرنامج: ${error.message}`);
    }
  }

  /**
   * تحديث تقدم البرنامج
   */
  async updateProgramProgress(beneficiaryId, programId, sessionData) {
    try {
      const progress = await ProgramProgress.findOne({
        beneficiaryId,
        programId
      });

      if (!progress) return;

      progress.completedSessions = (progress.completedSessions || 0) + 1;

      // تحديث تقدم الأهداف
      if (sessionData.performance?.taskCompletion) {
        for (let i = 0; i < progress.objectiveProgress.length; i++) {
          progress.objectiveProgress[i].progress += 
            (sessionData.performance.taskCompletion / progress.totalPlannedSessions);
        }
      }

      return await progress.save();
    } catch (error) {
      throw new Error(`خطأ في تحديث تقدم البرنامج: ${error.message}`);
    }
  }

  /**
   * دوال مساعدة
   */
  async generatePlanCode() {
    const count = await IndividualRehabPlan.countDocuments();
    const year = new Date().getFullYear();
    return `IRP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  calculateOverallStatus(measurements, programs) {
    if (!measurements.length) return 'جديد';
    return measurements[0].overallLevel;
  }

  identifyStrengths(measurements) {
    if (!measurements.length) return [];
    
    const latest = measurements[0];
    return latest.interpretation?.strengths || [];
  }

  identifyAreasForImprovement(measurements) {
    if (!measurements.length) return [];
    
    const latest = measurements[0];
    return latest.interpretation?.weaknesses || [];
  }

  generateFinalRecommendations(measurements, programs) {
    const recommendations = [];

    if (measurements.length === 0) {
      recommendations.push('تقييم شامل مطلوب');
      return recommendations;
    }

    const latest = measurements[0];
    recommendations.push(...(latest.interpretation?.recommendations || []));

    if (programs.filter(p => p.overallStatus === 'ACTIVE').length === 0) {
      recommendations.push('تفعيل برامج تدخلية');
    }

    return recommendations;
  }
}

module.exports = MeasurementService;
