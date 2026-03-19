/**
 * 🤖 نظام التقييم بالذكاء الاصطناعي — AI-Powered Assessment & Prediction Engine
 * الإصدار 6.0.0
 * يشمل: تسجيل تقييم ذكي، توقع النتائج، درجة الخطر، توصيات تدخل شخصية
 */

class AIAssessmentService {
  constructor() {
    this.assessments = new Map();
    this.predictions = new Map();
    this.riskProfiles = new Map();
    this.outcomes = new Map();
  }

  /* ─── تقييم شامل بالذكاء الاصطناعي ─── */
  async conductAIAssessment(beneficiaryId, assessmentData) {
    const assessment = {
      id: `aia-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      age: assessmentData.age,
      diagnosis: assessmentData.diagnosis || '',
      // البيانات السريرية
      clinical: {
        motorFunction: assessmentData.motorFunction || 5,
        cognitiveFunction: assessmentData.cognitiveFunction || 5,
        communicationAbility: assessmentData.communicationAbility || 5,
        socialSkills: assessmentData.socialSkills || 5,
        dailyLiving: assessmentData.dailyLiving || 5,
        behavioralHealth: assessmentData.behavioralHealth || 5,
        sensoryProcessing: assessmentData.sensoryProcessing || 5,
        emotionalRegulation: assessmentData.emotionalRegulation || 5,
      },
      // العوامل البيئية
      environmental: {
        familySupport: assessmentData.familySupport || 5,
        schoolSupport: assessmentData.schoolSupport || 5,
        communityAccess: assessmentData.communityAccess || 5,
        financialResources: assessmentData.financialResources || 5,
        homeAccessibility: assessmentData.homeAccessibility || 5,
      },
      // التاريخ العلاجي
      history: {
        previousTherapyDuration: assessmentData.previousTherapyDuration || 0,
        previousServicesCount: assessmentData.previousServicesCount || 0,
        complianceRate: assessmentData.complianceRate || 50,
        previousProgress: assessmentData.previousProgress || 'unknown',
      },
      // نتائج الذكاء الاصطناعي
      aiResults: null,
      status: 'processing',
    };

    // محاكاة تحليل الذكاء الاصطناعي
    assessment.aiResults = this._runAIAnalysis(assessment);
    assessment.status = 'completed';

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /* ─── توقع النتائج ─── */
  async predictOutcomes(beneficiaryId, serviceType, durationWeeks) {
    const assessments = this._getBeneficiaryAssessments(beneficiaryId);
    const latest = assessments[assessments.length - 1];
    if (!latest) return { success: false, error: 'لا يوجد تقييم سابق — يرجى إجراء تقييم أولاً' };

    const prediction = {
      id: `prd-${Date.now()}`,
      beneficiaryId,
      serviceType,
      durationWeeks,
      basedOnAssessment: latest.id,
      date: new Date(),
      // التوقعات
      expectedImprovement: this._predictImprovement(latest, serviceType, durationWeeks),
      confidenceLevel: this._calcConfidence(latest),
      milestones: this._predictMilestones(latest, serviceType, durationWeeks),
      risks: this._identifyRisks(latest, serviceType),
      // توصيات
      recommendedServices: this._recommendServices(latest),
      recommendedIntensity: this._recommendIntensity(latest, serviceType),
      targetGoals: this._generateAIGoals(latest, serviceType, durationWeeks),
    };

    this.predictions.set(prediction.id, prediction);
    return prediction;
  }

  /* ─── تقييم المخاطر ─── */
  async assessRisk(beneficiaryId) {
    const assessments = this._getBeneficiaryAssessments(beneficiaryId);
    const latest = assessments[assessments.length - 1];
    if (!latest) return { success: false, error: 'لا يوجد تقييم ─ يرجى إجراء تقييم أولاً' };

    const riskProfile = {
      id: `rsk-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      overallRiskScore: this._calcOverallRisk(latest),
      riskLevel: null,
      domains: {
        regressionRisk: this._calcRegressionRisk(assessments),
        dropoutRisk: this._calcDropoutRisk(latest),
        complicationRisk: this._calcComplicationRisk(latest),
        socialIsolationRisk: this._calcSocialIsolationRisk(latest),
        mentalHealthRisk: this._calcMentalHealthRisk(latest),
      },
      protectiveFactors: this._identifyProtectiveFactors(latest),
      riskFactors: this._identifyRiskFactors(latest),
      interventions: this._suggestRiskInterventions(latest),
      monitoringPlan: this._createMonitoringPlan(latest),
    };

    const score = riskProfile.overallRiskScore;
    riskProfile.riskLevel =
      score >= 80 ? 'حرج' : score >= 60 ? 'مرتفع' : score >= 40 ? 'متوسط' : 'منخفض';

    this.riskProfiles.set(riskProfile.id, riskProfile);
    return riskProfile;
  }

  /* ─── مقارنة التقييمات عبر الزمن ─── */
  async getAssessmentTrends(beneficiaryId) {
    const assessments = this._getBeneficiaryAssessments(beneficiaryId);
    if (assessments.length < 2)
      return { beneficiaryId, message: 'يلزم تقييمان على الأقل للمقارنة' };

    const clinicalFields = [
      'motorFunction',
      'cognitiveFunction',
      'communicationAbility',
      'socialSkills',
      'dailyLiving',
      'behavioralHealth',
    ];
    const trends = {};
    clinicalFields.forEach(f => {
      const vals = assessments.map(a => a.clinical[f]).filter(v => v != null);
      trends[f] = {
        values: vals,
        current: vals[vals.length - 1],
        initial: vals[0],
        change: vals[vals.length - 1] - vals[0],
        trend: this._calcTrend(vals),
      };
    });

    return {
      beneficiaryId,
      totalAssessments: assessments.length,
      timespan: {
        first: assessments[0].date,
        last: assessments[assessments.length - 1].date,
      },
      clinicalTrends: trends,
      overallProgress: this._calcOverallProgress(assessments),
      riskTrend: this._calcTrend(assessments.map(a => a.aiResults?.riskScore || 50)),
      recommendations: this._generateTrendRecommendations(trends),
    };
  }

  /* ─── تقرير AI شامل ─── */
  async getAIReport(beneficiaryId) {
    const assessments = this._getBeneficiaryAssessments(beneficiaryId);
    const predictions = Array.from(this.predictions.values()).filter(
      p => p.beneficiaryId === beneficiaryId
    );
    const risks = Array.from(this.riskProfiles.values()).filter(
      r => r.beneficiaryId === beneficiaryId
    );

    return {
      beneficiaryId,
      assessments: assessments.length,
      latestAssessment: assessments[assessments.length - 1] || null,
      predictions: predictions.slice(-5),
      riskProfile: risks[risks.length - 1] || null,
      aiInsights: this._generateInsights(assessments, predictions, risks),
    };
  }

  /* ─── التحليل الداخلي (AI) ─── */
  _runAIAnalysis(assessment) {
    const c = assessment.clinical;
    const e = assessment.environmental;
    const clinicalScore = this._avg(Object.values(c));
    const envScore = this._avg(Object.values(e));

    // درجة الأهلية للتأهيل
    const rehabilitationReadiness = Math.round(clinicalScore * 0.6 + envScore * 0.4);

    // النطاقات المحتاجة للتدخل (أقل من 5)
    const priorityAreas = Object.entries(c)
      .filter(([, v]) => v < 5)
      .sort((a, b) => a[1] - b[1])
      .map(([k, v]) => ({
        area: k,
        score: v,
        priority: v <= 2 ? 'عاجل' : v <= 3 ? 'مرتفع' : 'متوسط',
      }));

    return {
      clinicalScore,
      environmentalScore: envScore,
      rehabilitationReadiness,
      priorityAreas,
      riskScore: this._calcOverallRisk(assessment),
      recommendedPath:
        rehabilitationReadiness >= 7
          ? 'مسار مكثف'
          : rehabilitationReadiness >= 4
            ? 'مسار معتدل'
            : 'مسار تأسيسي',
      estimatedDuration:
        rehabilitationReadiness >= 7
          ? '12-16 أسبوع'
          : rehabilitationReadiness >= 4
            ? '20-28 أسبوع'
            : '30-40 أسبوع',
      suggestedServices: this._recommendServices(assessment),
    };
  }

  _predictImprovement(assessment, serviceType, weeks) {
    const baseline = assessment.clinical;
    const complianceMultiplier = (assessment.history.complianceRate || 50) / 100;
    const supportMultiplier = ((assessment.environmental.familySupport || 5) / 10) * 0.5 + 0.5;
    const baseRate = 0.3; // 30% base improvement potential

    const improvementRate =
      baseRate * complianceMultiplier * supportMultiplier * Math.min(weeks / 24, 1.5);
    return {
      expectedPercentage: Math.round(improvementRate * 100),
      byDomain: Object.entries(baseline).reduce((acc, [k, v]) => {
        const gap = 10 - v;
        acc[k] = { current: v, expected: Math.round((v + gap * improvementRate) * 10) / 10 };
        return acc;
      }, {}),
    };
  }

  _calcConfidence(assessment) {
    let confidence = 60; // baseline
    if (assessment.history.previousTherapyDuration > 0) confidence += 10;
    if (assessment.history.complianceRate > 70) confidence += 10;
    if ((assessment.environmental.familySupport || 0) >= 7) confidence += 10;
    return Math.min(confidence, 95);
  }

  _predictMilestones(assessment, serviceType, weeks) {
    const milestones = [];
    milestones.push({
      week: Math.round(weeks * 0.1),
      milestone: 'تكيّف مع البرنامج وبداية الاستجابة',
    });
    milestones.push({
      week: Math.round(weeks * 0.25),
      milestone: 'تحسن ملحوظ في المهارات الأساسية',
    });
    milestones.push({ week: Math.round(weeks * 0.5), milestone: 'بلوغ 50% من الأهداف المحددة' });
    milestones.push({
      week: Math.round(weeks * 0.75),
      milestone: 'تعميم المهارات في البيئة الطبيعية',
    });
    milestones.push({ week: weeks, milestone: 'تقييم شامل وتحديد الخطوات التالية' });
    return milestones;
  }

  _identifyRisks(assessment, serviceType) {
    const risks = [];
    if ((assessment.history.complianceRate || 50) < 40)
      risks.push({ risk: 'عدم الانتظام في الحضور', level: 'high' });
    if ((assessment.environmental.familySupport || 5) < 3)
      risks.push({ risk: 'ضعف الدعم الأسري', level: 'high' });
    if ((assessment.clinical.behavioralHealth || 5) < 3)
      risks.push({ risk: 'تحديات سلوكية قد تعيق التقدم', level: 'medium' });
    if ((assessment.clinical.emotionalRegulation || 5) < 3)
      risks.push({ risk: 'صعوبات في التنظيم الانفعالي', level: 'medium' });
    return risks;
  }

  _recommendServices(assessment) {
    const services = [];
    const c = assessment.clinical || assessment;
    if ((c.motorFunction || 5) < 5) services.push('العلاج الطبيعي');
    if ((c.communicationAbility || 5) < 5) services.push('علاج النطق والتخاطب');
    if ((c.dailyLiving || 5) < 5) services.push('العلاج الوظيفي');
    if ((c.socialSkills || 5) < 5) services.push('التأهيل النفسي الاجتماعي');
    if ((c.cognitiveFunction || 5) < 5) services.push('التأهيل المعرفي');
    if ((c.sensoryProcessing || 5) < 5) services.push('التكامل الحسي');
    if ((c.behavioralHealth || 5) < 4) services.push('العلاج السلوكي (ABA)');
    if ((c.emotionalRegulation || 5) < 4) services.push('العلاج بالفن أو الموسيقى');
    return services;
  }

  _recommendIntensity(assessment, serviceType) {
    const riskScore = this._calcOverallRisk(assessment);
    if (riskScore >= 70) return { sessionsPerWeek: 5, sessionDuration: 60, label: 'مكثف جداً' };
    if (riskScore >= 50) return { sessionsPerWeek: 3, sessionDuration: 45, label: 'مكثف' };
    if (riskScore >= 30) return { sessionsPerWeek: 2, sessionDuration: 45, label: 'معتدل' };
    return { sessionsPerWeek: 1, sessionDuration: 30, label: 'صيانة' };
  }

  _generateAIGoals(assessment, serviceType, weeks) {
    return [
      {
        goal: 'تحقيق تحسن بنسبة 20% في المهارات المستهدفة',
        timeframe: `${Math.round(weeks / 2)} أسبوع`,
        measurable: true,
      },
      {
        goal: 'تقليل مستوى الاعتماد على المساعدة بدرجة واحدة',
        timeframe: `${weeks} أسبوع`,
        measurable: true,
      },
      {
        goal: 'اكتساب 3 مهارات وظيفية جديدة على الأقل',
        timeframe: `${weeks} أسبوع`,
        measurable: true,
      },
    ];
  }

  _calcOverallRisk(assessment) {
    const c = assessment.clinical || {};
    const e = assessment.environmental || {};
    const h = assessment.history || {};

    let risk = 50;
    const clinicalAvg = this._avg(Object.values(c).filter(v => typeof v === 'number'));
    risk += (5 - clinicalAvg) * 5;
    const envAvg = this._avg(Object.values(e).filter(v => typeof v === 'number'));
    risk += (5 - envAvg) * 3;
    if ((h.complianceRate || 50) < 40) risk += 10;
    return Math.max(0, Math.min(100, Math.round(risk)));
  }

  _calcRegressionRisk(assessments) {
    if (assessments.length < 2) return 30;
    const last = assessments[assessments.length - 1];
    const prev = assessments[assessments.length - 2];
    const lastAvg = this._avg(Object.values(last.clinical));
    const prevAvg = this._avg(Object.values(prev.clinical));
    return lastAvg < prevAvg ? Math.min(80, 50 + (prevAvg - lastAvg) * 10) : 20;
  }

  _calcDropoutRisk(assessment) {
    let risk = 20;
    if ((assessment.history?.complianceRate || 50) < 40) risk += 30;
    if ((assessment.environmental?.familySupport || 5) < 3) risk += 20;
    if ((assessment.environmental?.financialResources || 5) < 3) risk += 15;
    return Math.min(100, risk);
  }

  _calcComplicationRisk(assessment) {
    let risk = 15;
    if ((assessment.clinical?.behavioralHealth || 5) < 3) risk += 25;
    if ((assessment.clinical?.emotionalRegulation || 5) < 3) risk += 20;
    return Math.min(100, risk);
  }

  _calcSocialIsolationRisk(assessment) {
    let risk = 15;
    if ((assessment.clinical?.socialSkills || 5) < 3) risk += 30;
    if ((assessment.environmental?.communityAccess || 5) < 3) risk += 25;
    return Math.min(100, risk);
  }

  _calcMentalHealthRisk(assessment) {
    let risk = 15;
    if ((assessment.clinical?.behavioralHealth || 5) < 3) risk += 20;
    if ((assessment.clinical?.emotionalRegulation || 5) < 3) risk += 20;
    if ((assessment.environmental?.familySupport || 5) < 3) risk += 15;
    return Math.min(100, risk);
  }

  _identifyProtectiveFactors(assessment) {
    const factors = [];
    const e = assessment.environmental || {};
    if ((e.familySupport || 0) >= 7) factors.push('دعم أسري قوي');
    if ((e.schoolSupport || 0) >= 7) factors.push('دعم مدرسي فعّال');
    if ((e.communityAccess || 0) >= 7) factors.push('تكامل مجتمعي جيد');
    if ((assessment.history?.complianceRate || 0) >= 80) factors.push('التزام عالٍ بالبرنامج');
    return factors;
  }

  _identifyRiskFactors(assessment) {
    const factors = [];
    const c = assessment.clinical || {};
    const e = assessment.environmental || {};
    if ((e.familySupport || 5) < 3) factors.push('ضعف الدعم الأسري');
    if ((e.financialResources || 5) < 3) factors.push('محدودية الموارد المالية');
    if ((c.behavioralHealth || 5) < 3) factors.push('تحديات سلوكية');
    if ((assessment.history?.complianceRate || 50) < 40) factors.push('تاريخ ضعيف في الانتظام');
    return factors;
  }

  _suggestRiskInterventions(assessment) {
    const interventions = [];
    const e = assessment.environmental || {};
    if ((e.familySupport || 5) < 4) interventions.push({ type: 'إرشاد أسري', urgency: 'high' });
    if ((assessment.history?.complianceRate || 50) < 50)
      interventions.push({ type: 'برنامج تحفيزي', urgency: 'medium' });
    if ((assessment.clinical?.behavioralHealth || 5) < 3)
      interventions.push({ type: 'تدخل سلوكي', urgency: 'high' });
    return interventions;
  }

  _createMonitoringPlan(assessment) {
    const risk = this._calcOverallRisk(assessment);
    if (risk >= 70)
      return { frequency: 'أسبوعي', alerts: ['تراجع في الحضور', 'تدهور سلوكي', 'فقدان مهارات'] };
    if (risk >= 40) return { frequency: 'كل أسبوعين', alerts: ['غياب متكرر', 'عدم تقدم'] };
    return { frequency: 'شهري', alerts: ['تغيرات ملحوظة'] };
  }

  _calcOverallProgress(assessments) {
    if (assessments.length < 2) return 'N/A';
    const first = this._avg(Object.values(assessments[0].clinical));
    const last = this._avg(Object.values(assessments[assessments.length - 1].clinical));
    const diff = last - first;
    return diff > 1 ? 'تحسن كبير' : diff > 0.3 ? 'تحسن طفيف' : diff < -0.3 ? 'تراجع' : 'مستقر';
  }

  _generateInsights(assessments, predictions, risks) {
    const insights = [];
    if (assessments.length > 0) {
      const latest = assessments[assessments.length - 1];
      if (latest.aiResults?.priorityAreas?.length > 0) {
        insights.push(
          'النطاقات ذات الأولوية: ' + latest.aiResults.priorityAreas.map(a => a.area).join(', ')
        );
      }
      insights.push('المسار المقترح: ' + (latest.aiResults?.recommendedPath || 'غير محدد'));
    }
    if (risks.length > 0) {
      insights.push('مستوى الخطر الحالي: ' + (risks[risks.length - 1].riskLevel || 'غير محدد'));
    }
    return insights;
  }

  _generateTrendRecommendations(trends) {
    const recs = [];
    Object.entries(trends).forEach(([field, data]) => {
      if (data.trend === 'declining') recs.push(`تراجع في ${field} — يلزم مراجعة خطة التدخل`);
      if (data.trend === 'improving' && data.current >= 8)
        recs.push(`تقدم ممتاز في ${field} — يمكن تقليل التكثيف`);
    });
    return recs;
  }

  _getBeneficiaryAssessments(beneficiaryId) {
    return Array.from(this.assessments.values())
      .filter(a => a.beneficiaryId === beneficiaryId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  _avg(arr) {
    const v = arr.filter(x => x != null && !isNaN(x));
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
  }
  _calcTrend(arr) {
    if (arr.length < 3) return 'insufficient_data';
    const f = this._avg(arr.slice(0, 3));
    const l = this._avg(arr.slice(-3));
    return l - f > 0.5 ? 'improving' : l - f < -0.5 ? 'declining' : 'stable';
  }
}

module.exports = { AIAssessmentService };
