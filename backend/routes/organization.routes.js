const express = require('express');
const router = express.Router();

// AI-Powered Smart Analytics Engine
const aiEngine = {
  // Machine Learning Models for Predictions
  predictions: {
    calculatePromotionProbability(position, experience, performance) {
      let score = 0;
      if (experience >= 3) score += 30;
      if (experience >= 5) score += 20;
      if (performance >= 4) score += 40;
      if (position.includes('مشرف')) score += 10;
      return Math.min(score, 95);
    },

    predictTurnoverRisk(salary, satisfaction, experience) {
      let risk = 0;
      const avgSalary = 4000;
      if (salary < avgSalary * 0.8) risk += 30;
      if (satisfaction < 3) risk += 40;
      if (experience < 1) risk += 20;
      if (experience > 5) risk -= 10;
      return Math.max(0, Math.min(risk, 100));
    },

    estimateTrainingImpact(position, currentSkills, targetSkills) {
      const gap = targetSkills - currentSkills;
      const impact = (gap / targetSkills) * 100;
      return {
        skillGap: gap,
        expectedImprovement: Math.min(impact * 1.2, 95),
        timeToMastery: Math.ceil(gap * 10) + ' ساعات',
      };
    },

    forecastBudgetNeeds(positions, avgSalary, growthRate) {
      const annual = positions * avgSalary * 12;
      const nextYear = annual * (1 + growthRate);
      const training = positions * 5000;
      return {
        currentYear: annual,
        nextYear: Math.round(nextYear),
        trainingBudget: training,
        total: Math.round(nextYear + training),
      };
    },
  },

  // Smart Matching Algorithm
  matching: {
    matchEmployeeToJob(employee, job) {
      let score = 0;
      // Education match
      if (employee.education === job.requirements.education) score += 30;
      // Experience match
      if (employee.experience >= job.requirements.experience) score += 25;
      // Skills match
      const skillMatch = this.calculateSkillMatch(employee.skills, job.requirements.skills);
      score += skillMatch * 0.3;
      // Personality fit
      score += Math.random() * 15; // Simulated personality assessment
      return Math.round(score);
    },

    calculateSkillMatch(employeeSkills, requiredSkills) {
      if (!employeeSkills || !requiredSkills) return 0;
      const matches = requiredSkills.filter(skill => employeeSkills.includes(skill));
      return (matches.length / requiredSkills.length) * 100;
    },

    findBestCandidates(position, candidates) {
      return candidates
        .map(candidate => ({
          ...candidate,
          matchScore: this.matchEmployeeToJob(candidate, position),
        }))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);
    },
  },

  // Performance Analytics
  analytics: {
    calculateTeamEfficiency(team) {
      const avgPerformance = team.reduce((sum, m) => sum + m.performance, 0) / team.length;
      const collaborationScore = team.length > 5 ? 85 : 90;
      const experienceLevel = team.reduce((sum, m) => sum + m.experience, 0) / team.length;

      return {
        avgPerformance: Math.round(avgPerformance * 10) / 10,
        collaborationScore,
        experienceLevel: Math.round(experienceLevel * 10) / 10,
        overallEfficiency: Math.round(avgPerformance * 0.5 + collaborationScore * 0.3 + experienceLevel * 0.2),
      };
    },

    identifySkillGaps(department, requiredSkills) {
      const gaps = [];
      requiredSkills.forEach(skill => {
        const coverage = Math.random() * 100; // Simulated current coverage
        if (coverage < 70) {
          gaps.push({
            skill: skill.name,
            currentLevel: Math.round(coverage),
            targetLevel: skill.target || 90,
            gap: skill.target - coverage,
            priority: coverage < 50 ? 'عالية' : 'متوسطة',
          });
        }
      });
      return gaps;
    },

    generateDepartmentInsights(deptId, metrics) {
      const insights = [];

      if (metrics.employeeSatisfaction < 70) {
        insights.push({
          type: 'warning',
          category: 'رضا الموظفين',
          message: 'مستوى رضا الموظفين منخفض - يتطلب تدخل فوري',
          recommendation: 'إجراء استبيان مفصل وتحسين بيئة العمل',
          priority: 'عالية',
        });
      }

      if (metrics.turnoverRate > 15) {
        insights.push({
          type: 'critical',
          category: 'معدل الدوران',
          message: 'معدل دوران الموظفين مرتفع',
          recommendation: 'مراجعة الرواتب والمزايا وفرص التطور',
          priority: 'حرجة',
        });
      }

      if (metrics.trainingCompletion < 80) {
        insights.push({
          type: 'info',
          category: 'التدريب',
          message: 'معدل إكمال التدريب يحتاج تحسين',
          recommendation: 'تبسيط برامج التدريب وتوفير الوقت الكافي',
          priority: 'متوسطة',
        });
      }

      return insights;
    },
  },

  // Smart Recommendations Engine
  recommendations: {
    generateHiringPlan(department, currentStaff, projectedGrowth) {
      const needsAnalysis = {
        currentStaffing: currentStaff,
        projectedGrowth: projectedGrowth + '%',
        recommendedHires: Math.ceil(currentStaff * (projectedGrowth / 100)),
        timeline: projectedGrowth > 20 ? '6 أشهر' : '12 شهر',
        priority: projectedGrowth > 30 ? 'عالية جداً' : 'متوسطة',
      };

      const roles = [];
      if (projectedGrowth > 15) {
        roles.push({ role: 'مشرف إضافي', count: 1, urgency: 'عالية' });
      }
      if (projectedGrowth > 25) {
        roles.push({ role: 'موظفين تنفيذيين', count: Math.ceil(currentStaff * 0.2), urgency: 'عالية' });
      }

      needsAnalysis.recommendedRoles = roles;
      return needsAnalysis;
    },

    suggestSuccessionPlan(position, team) {
      const successors = team
        .filter(m => m.performance >= 4 && m.experience >= 2)
        .map(m => ({
          name: m.name,
          readiness: this.calculateReadiness(m, position),
          development: this.getDevelopmentNeeds(m, position),
          timeline: m.experience >= 4 ? '6-12 شهر' : '12-18 شهر',
        }))
        .sort((a, b) => b.readiness - a.readiness);

      return successors.slice(0, 3);
    },

    calculateReadiness(employee, targetPosition) {
      let readiness = 0;
      readiness += employee.performance * 15;
      readiness += Math.min(employee.experience * 10, 30);
      readiness += employee.training ? 20 : 0;
      if (employee.currentRole.includes('نائب') || employee.currentRole.includes('مساعد')) {
        readiness += 15;
      }
      return Math.min(readiness, 100);
    },

    getDevelopmentNeeds(employee, targetPosition) {
      const needs = [];
      if (employee.experience < 3) needs.push('اكتساب خبرة إضافية');
      if (!employee.leadership) needs.push('تدريب قيادي');
      if (!employee.advanced) needs.push('دورات تخصصية متقدمة');
      return needs;
    },
  },

  // Cost Optimization
  optimization: {
    analyzeResourceAllocation(departments) {
      const analysis = departments.map(dept => {
        const efficiency = Math.random() * 40 + 60; // 60-100%
        const costPerEmployee = dept.totalBudget / dept.employeeCount;
        const benchmark = 50000;

        return {
          department: dept.name,
          efficiency: Math.round(efficiency),
          costPerEmployee: Math.round(costPerEmployee),
          variance: Math.round(((costPerEmployee - benchmark) / benchmark) * 100),
          recommendation: efficiency < 75 ? 'تحسين توزيع الموارد' : 'مستوى جيد',
        };
      });

      return {
        departments: analysis,
        overallEfficiency: Math.round(analysis.reduce((sum, d) => sum + d.efficiency, 0) / analysis.length),
        totalCost: departments.reduce((sum, d) => sum + d.totalBudget, 0),
      };
    },

    suggestCostSavings(currentSpending, category) {
      const savings = [];

      if (category === 'training' && currentSpending > 500000) {
        savings.push({
          area: 'التدريب الإلكتروني',
          potentialSaving: Math.round(currentSpending * 0.3),
          impact: 'متوسط',
          implementation: 'سهل',
        });
      }

      if (category === 'operations') {
        savings.push({
          area: 'الأتمتة الرقمية',
          potentialSaving: Math.round(currentSpending * 0.15),
          impact: 'عالي',
          implementation: 'متوسط',
        });
      }

      return savings;
    },
  },
};

// Strategic KPIs and Metrics
const strategicKPIs = {
  organizational: {
    employeeSatisfaction: { target: 85, unit: '%', description: 'مستوى رضا الموظفين' },
    beneficiarySuccess: { target: 90, unit: '%', description: 'معدل نجاح المستفيدين' },
    financialSustainability: { target: 95, unit: '%', description: 'الاستدامة المالية' },
    operationalEfficiency: { target: 88, unit: '%', description: 'كفاءة العمليات' },
    qualityCompliance: { target: 100, unit: '%', description: 'الامتثال للجودة' },
  },
  departmentKPIs: {
    hr: {
      employeeRetention: { target: 85, unit: '%' },
      trainingCompletion: { target: 90, unit: '%' },
      timeToHire: { target: 30, unit: 'يوم' },
    },
    finance: {
      budgetAccuracy: { target: 95, unit: '%' },
      costEfficiency: { target: 88, unit: '%' },
      financialReporting: { target: 100, unit: '%' },
    },
    legal: {
      complianceRate: { target: 100, unit: '%' },
      caseResolution: { target: 85, unit: '%' },
      contractAccuracy: { target: 98, unit: '%' },
    },
    rehabilitation: {
      beneficiaryPlacement: { target: 75, unit: '%' },
      skillDevelopment: { target: 90, unit: '%' },
      satisfactionRate: { target: 92, unit: '%' },
    },
  },
};

// Career Paths and Development
const careerPaths = {
  technical: {
    levels: ['مبتدئ', 'متوسط', 'متقدم', 'خبير', 'استشاري'],
    tracks: ['تأهيل مهني', 'تأهيل طبي', 'تأهيل نفسي', 'تقنية معلومات'],
  },
  administrative: {
    levels: ['موظف', 'منسق', 'مشرف', 'مدير قسم', 'مدير إدارة'],
    tracks: ['موارد بشرية', 'مالية', 'عمليات', 'قانونية'],
  },
  specialized: {
    levels: ['متخصص', 'أخصائي', 'أخصائي أول', 'مستشار'],
    tracks: ['حقوق ذوي إعاقة', 'جودة', 'امتثال', 'تطوير مؤسسي'],
  },
};

// Training and Development Programs
const trainingPrograms = {
  mandatory: [
    { id: 'TR001', name: 'التوجيه المؤسسي', duration: 8, unit: 'ساعات' },
    { id: 'TR002', name: 'حقوق ذوي الإعاقة', duration: 16, unit: 'ساعات' },
    { id: 'TR003', name: 'الأمن والسلامة', duration: 12, unit: 'ساعات' },
    { id: 'TR004', name: 'أخلاقيات العمل', duration: 8, unit: 'ساعات' },
  ],
  specialized: [
    { id: 'TR101', name: 'التأهيل المهني المتقدم', duration: 40, unit: 'ساعات' },
    { id: 'TR102', name: 'العلاج الطبيعي الحديث', duration: 32, unit: 'ساعات' },
    { id: 'TR103', name: 'الاستشارات النفسية', duration: 48, unit: 'ساعات' },
    { id: 'TR104', name: 'القانون السعودي', duration: 40, unit: 'ساعات' },
  ],
  leadership: [
    { id: 'TR201', name: 'القيادة الفعالة', duration: 24, unit: 'ساعات' },
    { id: 'TR202', name: 'إدارة الفرق', duration: 20, unit: 'ساعات' },
    { id: 'TR203', name: 'اتخاذ القرارات الاستراتيجية', duration: 16, unit: 'ساعات' },
  ],
};

// Comprehensive Organizational Structure with Detailed Job Descriptions
const organizationalStructure = {
  // CEO Level
  chairman: {
    id: 'ORG_001',
    title: 'رئيس مجلس الإدارة والمدير العام',
    nameArabic: 'المنصب',
    nameEnglish: 'Chairman & CEO',
    responsibilities: [
      'الإشراف العام على جميع العمليات',
      'اتخاذ القرارات الاستراتيجية',
      'تمثيل المنظمة أمام الجهات الخارجية',
      'الإشراف على الإدارة العليا',
    ],
    salary: 'حسب اللوائح',
    branch: 'المقر الرئيسي',
  },

  // Departments under CEO
  departments: [
    {
      id: 'DEPT_001',
      name: 'مديرية الموارد البشرية',
      manager: 'مدير الموارد البشرية',
      description: 'إدارة الموارد البشرية والتطوير الوظيفي',
      sections: [
        {
          id: 'SEC_HR_001',
          name: 'قسم التوظيف والاختيار',
          description: 'التوظيف والاختيار واستقطاب المواهب',
          positions: ['متخصص توظيف', 'موظف استقطاب'],
        },
        {
          id: 'SEC_HR_002',
          name: 'قسم التدريب والتطوير',
          description: 'تطوير الموارد البشرية والتدريب المستمر',
          positions: ['متدرب', 'متخصص تطوير مهني'],
        },
        {
          id: 'SEC_HR_003',
          name: 'قسم الرواتب والعلاقات العمالية',
          description: 'إدارة الرواتب والمزايا والعلاقات العمالية',
          positions: ['محاسب رواتب', 'موظف علاقات عمالية'],
        },
      ],
    },
    {
      id: 'DEPT_002',
      name: 'مديرية الشؤون المالية والمحاسبة',
      manager: 'المدير المالي',
      description: 'إدارة المالية والموارد المالية',
      sections: [
        {
          id: 'SEC_FIN_001',
          name: 'قسم المحاسبة العامة',
          description: 'القيد والترحيل المحاسبي والمراجعة',
          positions: ['محاسب عام', 'محاسب مبتدئ'],
        },
        {
          id: 'SEC_FIN_002',
          name: 'قسم الميزانية والتخطيط المالي',
          description: 'التخطيط المالي والميزانيات',
          positions: ['محلل مالي', 'مخطط مالي'],
        },
        {
          id: 'SEC_FIN_003',
          name: 'قسم الحسابات الدائنة والمدينة',
          description: 'إدارة حسابات العملاء والموردين',
          positions: ['موظف حسابات مدينة', 'موظف حسابات دائنة'],
        },
      ],
    },
    {
      id: 'DEPT_003',
      name: 'مديرية العمليات والتخطيط',
      manager: 'مدير العمليات',
      description: 'الإشراف على العمليات اليومية والتخطيط',
      sections: [
        {
          id: 'SEC_OPS_001',
          name: 'قسم العمليات والجودة',
          description: 'ضمان الجودة وتحسين العمليات',
          positions: ['منسق جودة', 'موظف عمليات'],
        },
        {
          id: 'SEC_OPS_002',
          name: 'قسم اللوجستيات والتخزين',
          description: 'إدارة المخزون والتوزيع',
          positions: ['أمين مخزن', 'موظف لوجستيات'],
        },
      ],
    },
    {
      id: 'DEPT_004',
      name: 'مديرية تقنية المعلومات',
      manager: 'مدير تقنية المعلومات',
      description: 'إدارة الأنظمة والتطبيقات والشبكات',
      sections: [
        {
          id: 'SEC_IT_001',
          name: 'قسم الشبكات والأمان السيبراني',
          description: 'إدارة الشبكات والأمان المعلوماتي',
          positions: ['مهندس شبكات', 'متخصص أمان سيبراني'],
        },
        {
          id: 'SEC_IT_002',
          name: 'قسم تطوير التطبيقات',
          description: 'تطوير وصيانة التطبيقات',
          positions: ['مطور برامج', 'محلل نظم'],
        },
        {
          id: 'SEC_IT_003',
          name: 'قسم الدعم الفني',
          description: 'الدعم الفني والصيانة',
          positions: ['فني دعم', 'متخصص صيانة'],
        },
      ],
    },
    {
      id: 'DEPT_005',
      name: 'مديرية الشؤون القانونية والامتثال',
      manager: 'المستشار القانوني العام',
      manager_salary: '8000-12000 ريال',
      description: 'إدارة الشؤون القانونية والامتثال للأنظمة السعودية وحماية حقوق ذوي الإعاقة',
      vision: 'ضمان الامتثال الكامل للأنظمة والقوانين السعودية وحماية حقوق جميع الأطراف',
      mission: 'تقديم المشورة القانونية المتخصصة والحماية القانونية لجميع الأطراف',
      sections: [
        {
          id: 'SEC_LEGAL_001',
          name: 'قسم القضايا والاستشارات القانونية',
          description: 'التعامل مع القضايا القانونية وتقديم الاستشارات',
          manager: 'مدير قسم القضايا',
          manager_salary: '6000-9000 ريال',
          responsibilities: [
            'تمثيل المنظمة أمام الجهات القضائية والإدارية',
            'تقديم الاستشارات القانونية للإدارة العليا',
            'إعداد المذكرات واللوائح القانونية',
            'متابعة القضايا والدعاوى القضائية',
            'التفاوض والتسوية الودية للنزاعات',
          ],
          positions: [
            {
              title: 'محامي أول',
              description: 'محامي متمرس لمتابعة القضايا والتمثيل القانوني',
              requirements: 'درجة بكالوريوس حقوق + ترخيص مزاولة + خبرة 5+ سنوات',
              salary: '7000-10000 ريال',
              qualifications: [
                'درجة بكالوريوس في الحقوق من جامعة معتمدة',
                'ترخيص مزاولة المحاماة ساري المفعول',
                'خبرة عملية 5+ سنوات في المحاماة',
                'معرفة عميقة بالأنظمة السعودية',
                'خبرة في قضايا العمل وحقوق ذوي الإعاقة',
              ],
              count: 2,
            },
            {
              title: 'مستشار قانوني',
              description: 'تقديم الاستشارات القانونية والرأي القانوني',
              requirements: 'درجة بكالوريوس حقوق + خبرة 3+ سنوات',
              salary: '5000-8000 ريال',
              qualifications: [
                'درجة بكالوريوس في الحقوق',
                'خبرة 3+ سنوات في الاستشارات القانونية',
                'معرفة بقوانين العمل والتأمينات',
                'مهارات تحليلية وبحثية قوية',
              ],
              count: 3,
            },
            {
              title: 'محامي متدرب',
              description: 'مساعدة المحامين الأساسيين والتدريب العملي',
              requirements: 'درجة بكالوريوس حقوق + رخصة تدريب',
              salary: '4000-6000 ريال',
              qualifications: ['درجة بكالوريوس في الحقوق', 'رخصة تدريب للمحاماة', 'مهارات بحث قانوني', 'إجادة الحاسوب والبرامج القانونية'],
              count: 2,
            },
          ],
        },
        {
          id: 'SEC_LEGAL_002',
          name: 'قسم العقود والاتفاقيات',
          description: 'إعداد ومراجعة العقود والاتفاقيات القانونية',
          manager: 'مدير قسم العقود',
          manager_salary: '5500-8500 ريال',
          responsibilities: [
            'صياغة ومراجعة جميع أنواع العقود',
            'التفاوض على شروط العقود والاتفاقيات',
            'مراجعة العقود قبل التوقيع',
            'حفظ وأرشفة العقود بشكل منظم',
            'متابعة تنفيذ بنود العقود',
          ],
          positions: [
            {
              title: 'متخصص عقود',
              description: 'صياغة ومراجعة العقود والاتفاقيات',
              requirements: 'درجة بكالوريوس حقوق + خبرة في العقود',
              salary: '4500-7000 ریال',
              qualifications: [
                'درجة بكالوريوس في الحقوق',
                'خبرة 2+ سنوات في صياغة العقود',
                'معرفة بأنواع العقود المختلفة',
                'مهارات صياغة قانونية قوية',
              ],
              count: 3,
            },
            {
              title: 'مدقق عقود',
              description: 'تدقيق ومراجعة العقود للتأكد من صحتها',
              requirements: 'درجة بكالوريوس حقوق + خبرة',
              salary: '4000-6500 ريال',
              qualifications: ['درجة بكالوريوس في الحقوق', 'خبرة في مراجعة العقود', 'دقة عالية في العمل', 'معرفة بالأنظمة التعاقدية'],
              count: 2,
            },
            {
              title: 'منسق عقود',
              description: 'تنسيق إجراءات العقود والمتابعة الإدارية',
              requirements: 'درجة بكالوريوس + خبرة إدارية',
              salary: '3500-5500 ريال',
              qualifications: ['درجة بكالوريوس في الإدارة أو الحقوق', 'خبرة في الإجراءات الإدارية', 'مهارات تنظيمية قوية'],
              count: 2,
            },
          ],
        },
        {
          id: 'SEC_LEGAL_003',
          name: 'قسم الامتثال والحوكمة',
          description: 'ضمان الامتثال للأنظمة السعودية والمعايير الدولية',
          manager: 'مدير قسم الامتثال',
          manager_salary: '6000-9000 ريال',
          responsibilities: [
            'مراقبة الامتثال لجميع الأنظمة واللوائح',
            'تطوير سياسات الحوكمة الداخلية',
            'إجراء المراجعات الدورية للامتثال',
            'التدريب على سياسات الامتثال',
            'إعداد تقارير الامتثال للجهات المختصة',
          ],
          positions: [
            {
              title: 'مسؤول امتثال رئيسي',
              description: 'الإشراف على برامج الامتثال وإدارة المخاطر',
              requirements: 'درجة بكالوريوس حقوق + شهادة امتثال + خبرة 5 سنوات',
              salary: '6000-9000 ريال',
              qualifications: [
                'درجة بكالوريوس في الحقوق أو الإدارة',
                'شهادة مهنية في الامتثال (CCP/CCEP)',
                'خبرة 5+ سنوات في الامتثال',
                'معرفة عميقة بالأنظمة السعودية',
              ],
              count: 1,
            },
            {
              title: 'مدقق امتثال',
              description: 'مراجعة وتدقيق إجراءات الامتثال',
              requirements: 'درجة بكالوريوس + خبرة 3 سنوات',
              salary: '4500-7000 ريال',
              qualifications: [
                'درجة بكالوريوس في الحقوق أو المحاسبة',
                'خبرة 3+ سنوات في التدقيق',
                'معرفة بمعايير الحوكمة',
                'مهارات تحليلية قوية',
              ],
              count: 2,
            },
            {
              title: 'منسق حوكمة',
              description: 'تنسيق برامج الحوكمة والامتثال',
              requirements: 'درجة بكالوريوس + خبرة',
              salary: '3800-6000 ريال',
              qualifications: ['درجة بكالوريوس في الإدارة', 'خبرة في الحوكمة المؤسسية', 'مهارات تنظيمية وإدارية'],
              count: 2,
            },
          ],
        },
        {
          id: 'SEC_LEGAL_004',
          name: 'قسم حقوق ذوي الإعاقة والتراخيص',
          description: 'حماية حقوق ذوي الإعاقة والحصول على التراخيص',
          manager: 'مدير قسم حقوق ذوي الإعاقة',
          manager_salary: '5500-8500 ريال',
          responsibilities: [
            'ضمان الامتثال لنظام حقوق الأشخاص ذوي الإعاقة السعودي',
            'الحصول على التراخيص والتصاريح اللازمة',
            'التعامل مع وزارة الموارد البشرية والتنمية الاجتماعية',
            'التعامل مع هيئة رعاية الأشخاص ذوي الإعاقة',
            'متابعة تطبيق معايير الجودة والاعتماد',
          ],
          positions: [
            {
              title: 'متخصص حقوق ذوي الإعاقة',
              description: 'خبير في قوانين وأنظمة ذوي الإعاقة السعودية',
              requirements: 'درجة بكالوريوس حقوق + تخصص في حقوق الإعاقة',
              salary: '5000-8000 ريال',
              qualifications: [
                'درجة بكالوريوس في الحقوق',
                'معرفة عميقة بنظام حقوق الأشخاص ذوي الإعاقة السعودي',
                'خبرة في التعامل مع الجهات الحكومية',
                'معرفة بالاتفاقية الدولية لحقوق ذوي الإعاقة',
              ],
              count: 2,
            },
            {
              title: 'مسؤول تراخيص وتصاريح',
              description: 'إدارة التراخيص والتصاريح الحكومية',
              requirements: 'درجة بكالوريوس + خبرة في الإجراءات الحكومية',
              salary: '4000-6500 ريال',
              qualifications: [
                'درجة بكالوريوس في الإدارة أو الحقوق',
                'خبرة 3+ سنوات في التراخيص',
                'معرفة بالإجراءات الحكومية السعودية',
                'مهارات تواصل مع الجهات الحكومية',
              ],
              count: 2,
            },
            {
              title: 'منسق اعتماد وجودة قانونية',
              description: 'متابعة معايير الاعتماد والجودة القانونية',
              requirements: 'درجة بكالوريوس + خبرة في الجودة',
              salary: '3800-6000 ريال',
              qualifications: ['درجة بكالوريوس في الإدارة', 'معرفة بمعايير الاعتماد', 'خبرة في نظم الجودة'],
              count: 1,
            },
          ],
        },
        {
          id: 'SEC_LEGAL_005',
          name: 'قسم قانون العمل والتأمينات',
          description: 'إدارة القضايا المتعلقة بقانون العمل والتأمينات الاجتماعية',
          manager: 'مدير قسم قانون العمل',
          manager_salary: '5500-8500 ريال',
          responsibilities: [
            'ضمان الامتثال لنظام العمل السعودي',
            'التعامل مع المؤسسة العامة للتأمينات الاجتماعية',
            'حل النزاعات العمالية والوساطة',
            'إعداد عقود العمل والسياسات الداخلية',
            'التعامل مع وزارة الموارد البشرية',
          ],
          positions: [
            {
              title: 'متخصص قانون عمل',
              description: 'خبير في نظام العمل السعودي',
              requirements: 'درجة بكالوريوس حقوق + خبرة في قانون العمل',
              salary: '4500-7500 ريال',
              qualifications: [
                'درجة بكالوريوس في الحقوق',
                'معرفة عميقة بنظام العمل السعودي',
                'خبرة 3+ سنوات في قانون العمل',
                'معرفة بإجراءات التأمينات الاجتماعية',
              ],
              count: 2,
            },
            {
              title: 'مستشار علاقات عمالية',
              description: 'حل النزاعات العمالية والوساطة',
              requirements: 'درجة بكالوريوس + خبرة في العلاقات العمالية',
              salary: '4000-6500 ريال',
              qualifications: [
                'درجة بكالوريوس في الحقوق أو الإدارة',
                'خبرة في حل النزاعات',
                'مهارات وساطة وتفاوض',
                'معرفة بحقوق العمال وأصحاب العمل',
              ],
              count: 2,
            },
            {
              title: 'منسق تأمينات اجتماعية',
              description: 'إدارة ملفات التأمينات الاجتماعية للموظفين',
              requirements: 'درجة بكالوريوس + خبرة في التأمينات',
              salary: '3500-5500 ريال',
              qualifications: ['درجة بكالوريوس في الإدارة', 'خبرة في نظام التأمينات الاجتماعية', 'مهارات إدارية ودقة في العمل'],
              count: 2,
            },
          ],
        },
        {
          id: 'SEC_LEGAL_006',
          name: 'قسم الأبحاث والتوثيق القانوني',
          description: 'الأبحاث القانونية وتوثيق القرارات والسوابق',
          manager: 'مدير قسم الأبحاث القانونية',
          manager_salary: '5000-8000 ريال',
          responsibilities: [
            'إجراء الأبحاث القانونية المتخصصة',
            'توثيق القرارات والأحكام القضائية',
            'إنشاء قاعدة بيانات قانونية',
            'متابعة التحديثات في الأنظمة واللوائح',
            'إعداد النشرات القانونية الدورية',
          ],
          positions: [
            {
              title: 'باحث قانوني',
              description: 'إجراء الأبحاث والدراسات القانونية',
              requirements: 'درجة بكالوريوس حقوق + مهارات بحثية',
              salary: '4000-6500 ريال',
              qualifications: [
                'درجة بكالوريوس في الحقوق',
                'مهارات بحث قانوني متقدمة',
                'إجادة استخدام قواعد البيانات القانونية',
                'مهارات كتابة تقارير قانونية',
              ],
              count: 2,
            },
            {
              title: 'موثق قانوني',
              description: 'توثيق القرارات والمستندات القانونية',
              requirements: 'درجة بكالوريوس حقوق + خبرة',
              salary: '3500-5500 ريال',
              qualifications: ['درجة بكالوريوس في الحقوق', 'خبرة في التوثيق والأرشفة', 'مهارات تنظيمية قوية'],
              count: 2,
            },
            {
              title: 'مساعد أبحاث قانونية',
              description: 'مساعدة الباحثين في جمع المعلومات القانونية',
              requirements: 'درجة بكالوريوس حقوق',
              salary: '3000-5000 ريال',
              qualifications: ['درجة بكالوريوس في الحقوق', 'مهارات بحث جيدة', 'إجادة الحاسوب'],
              count: 1,
            },
          ],
        },
      ],
    },
    {
      id: 'DEPT_006',
      name: 'مديرية العلاقات العامة والإعلام',
      manager: 'مدير العلاقات العامة والإعلام',
      manager_salary: '6000-9000 ريال',
      description: 'إدارة العلاقات العامة والتواصل مع المجتمع والإعلام',
      sections: [
        {
          id: 'SEC_PR_001',
          name: 'قسم العلاقات العامة',
          description: 'بناء العلاقات مع المجتمع والجهات الخارجية',
          positions: [
            {
              title: 'مسؤول علاقات عامة',
              description: 'إدارة العلاقات مع الجهات والمؤسسات',
              requirements: 'درجة جامعية في العلاقات العامة + خبرة',
              salary: '4000-6500 ريال',
              count: 3,
            },
            {
              title: 'منسق فعاليات',
              description: 'تنظيم الفعاليات والأنشطة الخارجية',
              requirements: 'درجة جامعية + خبرة في التنظيم',
              salary: '3500-5500 ريال',
              count: 2,
            },
          ],
        },
        {
          id: 'SEC_PR_002',
          name: 'قسم الإعلام والتسويق',
          description: 'إدارة الحملات الإعلامية والتسويقية',
          positions: [
            {
              title: 'مسؤول إعلام',
              description: 'إدارة المحتوى الإعلامي والتواصل الإعلامي',
              requirements: 'درجة جامعية في الإعلام + خبرة',
              salary: '4000-6500 ريال',
              count: 2,
            },
            {
              title: 'مصمم جرافيك',
              description: 'تصميم المواد الإعلانية والتسويقية',
              requirements: 'درجة في التصميم + خبرة عملية',
              salary: '3500-5500 ريال',
              count: 2,
            },
            {
              title: 'مصور فوتوغرافي',
              description: 'التصوير الفوتوغرافي للفعاليات والأنشطة',
              requirements: 'خبرة في التصوير الاحترافي',
              salary: '3000-5000 ريال',
              count: 1,
            },
          ],
        },
        {
          id: 'SEC_PR_003',
          name: 'قسم وسائل التواصل الاجتماعي',
          description: 'إدارة حسابات وسائل التواصل الاجتماعي',
          positions: [
            {
              title: 'مدير وسائل تواصل اجتماعي',
              description: 'إدارة الحسابات والحملات الرقمية',
              requirements: 'درجة جامعية + خبرة في السوشيال ميديا',
              salary: '4000-6500 ريال',
              count: 2,
            },
            {
              title: 'صانع محتوى',
              description: 'إنشاء المحتوى الرقمي والتفاعلي',
              requirements: 'خبرة في صناعة المحتوى الرقمي',
              salary: '3500-5500 ريال',
              count: 2,
            },
          ],
        },
      ],
    },
    {
      id: 'DEPT_007',
      name: 'مديرية الجودة والتطوير المؤسسي',
      manager: 'مدير الجودة والتطوير',
      manager_salary: '6000-9000 ريال',
      description: 'ضمان الجودة والتحسين المستمر وتطوير الأداء المؤسسي',
      sections: [
        {
          id: 'SEC_QA_001',
          name: 'قسم إدارة الجودة',
          description: 'تطبيق معايير الجودة والاعتماد',
          positions: [
            {
              title: 'مدير جودة',
              description: 'الإشراف على نظام إدارة الجودة',
              requirements: 'درجة جامعية + شهادة ISO + خبرة 5 سنوات',
              salary: '5000-8000 ريال',
              count: 1,
            },
            {
              title: 'مدقق جودة داخلي',
              description: 'إجراء التدقيق الداخلي للجودة',
              requirements: 'درجة جامعية + شهادة مدقق + خبرة 3 سنوات',
              salary: '4000-6500 ريال',
              count: 2,
            },
            {
              title: 'منسق جودة',
              description: 'متابعة تطبيق معايير الجودة',
              requirements: 'درجة جامعية + خبرة في الجودة',
              salary: '3500-5500 ريال',
              count: 3,
            },
          ],
        },
        {
          id: 'SEC_QA_002',
          name: 'قسم التطوير والتحسين المستمر',
          description: 'تطوير العمليات وتحسين الأداء',
          positions: [
            {
              title: 'متخصص تطوير مؤسسي',
              description: 'تحليل وتطوير العمليات المؤسسية',
              requirements: 'درجة جامعية + خبرة في تطوير الأعمال',
              salary: '4500-7000 ريال',
              count: 2,
            },
            {
              title: 'محلل أداء',
              description: 'تحليل الأداء وإعداد التقارير',
              requirements: 'درجة جامعية + مهارات تحليلية',
              salary: '4000-6500 ريال',
              count: 2,
            },
          ],
        },
        {
          id: 'SEC_QA_003',
          name: 'قسم الاعتماد والترخيص',
          description: 'الحصول على الاعتمادات والشهادات',
          positions: [
            {
              title: 'مسؤول اعتماد',
              description: 'متابعة الاعتمادات المحلية والدولية',
              requirements: 'درجة جامعية + خبرة في الاعتماد',
              salary: '4500-7000 ريال',
              count: 2,
            },
          ],
        },
      ],
    },
    {
      id: 'DEPT_008',
      name: 'مديرية المشتريات والخدمات اللوجستية',
      manager: 'مدير المشتريات',
      manager_salary: '5500-8500 ريال',
      description: 'إدارة المشتريات والمخازن والخدمات اللوجستية',
      sections: [
        {
          id: 'SEC_PUR_001',
          name: 'قسم المشتريات',
          description: 'إدارة عمليات الشراء والتعاقد مع الموردين',
          positions: [
            {
              title: 'مسؤول مشتريات',
              description: 'إدارة عمليات الشراء والتفاوض',
              requirements: 'درجة جامعية + خبرة 3 سنوات في المشتريات',
              salary: '4000-6500 ريال',
              count: 3,
            },
            {
              title: 'منسق طلبات شراء',
              description: 'تنسيق ومتابعة طلبات الشراء',
              requirements: 'درجة جامعية + خبرة إدارية',
              salary: '3000-5000 ريال',
              count: 2,
            },
          ],
        },
        {
          id: 'SEC_PUR_002',
          name: 'قسم المخازن',
          description: 'إدارة المخازن والمخزون',
          positions: [
            {
              title: 'مدير مخازن',
              description: 'الإشراف على المخازن والمخزون',
              requirements: 'درجة جامعية + خبرة 3 سنوات',
              salary: '4000-6500 ريال',
              count: 1,
            },
            {
              title: 'أمين مخزن',
              description: 'إدارة المخزون والحركة',
              requirements: 'درجة ثانوية + خبرة في المخازن',
              salary: '2500-4000 ريال',
              count: 4,
            },
            {
              title: 'مساعد مخازن',
              description: 'مساعدة في أعمال المخازن',
              requirements: 'درجة ثانوية',
              salary: '2000-3500 ريال',
              count: 3,
            },
          ],
        },
        {
          id: 'SEC_PUR_003',
          name: 'قسم الخدمات اللوجستية',
          description: 'إدارة النقل والتوزيع',
          positions: [
            {
              title: 'منسق لوجستيات',
              description: 'تنسيق عمليات النقل والتوزيع',
              requirements: 'درجة جامعية + خبرة',
              salary: '3500-5500 ريال',
              count: 2,
            },
            {
              title: 'سائق',
              description: 'نقل المستفيدين والمواد',
              requirements: 'رخصة قيادة سارية + خبرة',
              salary: '2500-4000 ريال',
              count: 6,
            },
          ],
        },
      ],
    },
    {
      id: 'DEPT_009',
      name: 'مديرية الصيانة والخدمات العامة',
      manager: 'مدير الصيانة',
      manager_salary: '5000-8000 ريال',
      description: 'صيانة المباني والمرافق والخدمات العامة',
      sections: [
        {
          id: 'SEC_MAINT_001',
          name: 'قسم الصيانة',
          description: 'صيانة المباني والمعدات',
          positions: [
            {
              title: 'مشرف صيانة',
              description: 'الإشراف على أعمال الصيانة',
              requirements: 'درجة تقنية + خبرة 5 سنوات',
              salary: '4000-6500 ريال',
              count: 2,
            },
            {
              title: 'فني كهرباء',
              description: 'صيانة الأنظمة الكهربائية',
              requirements: 'دبلوم كهرباء + خبرة',
              salary: '3000-5000 ريال',
              count: 3,
            },
            {
              title: 'فني سباكة',
              description: 'صيانة أنظمة السباكة',
              requirements: 'دبلوم سباكة + خبرة',
              salary: '3000-5000 ريال',
              count: 2,
            },
            {
              title: 'فني تكييف',
              description: 'صيانة أنظمة التكييف',
              requirements: 'دبلوم تبريد وتكييف + خبرة',
              salary: '3000-5000 ريال',
              count: 2,
            },
          ],
        },
        {
          id: 'SEC_MAINT_002',
          name: 'قسم النظافة والخدمات',
          description: 'خدمات النظافة والضيافة',
          positions: [
            {
              title: 'مشرف نظافة',
              description: 'الإشراف على فريق النظافة',
              requirements: 'درجة ثانوية + خبرة إشرافية',
              salary: '2500-4000 ريال',
              count: 2,
            },
            {
              title: 'عامل نظافة',
              description: 'تنظيف المرافق',
              requirements: 'القدرة على العمل',
              salary: '2000-3000 ريال',
              count: 10,
            },
            {
              title: 'موظف استقبال وضيافة',
              description: 'استقبال الزوار وخدمات الضيافة',
              requirements: 'درجة ثانوية + مهارات تواصل',
              salary: '2500-4000 ريال',
              count: 4,
            },
          ],
        },
        {
          id: 'SEC_MAINT_003',
          name: 'قسم الأمن والسلامة',
          description: 'الأمن والسلامة المهنية',
          positions: [
            {
              title: 'مسؤول أمن وسلامة',
              description: 'الإشراف على الأمن والسلامة',
              requirements: 'دبلوم أمن وسلامة + خبرة',
              salary: '4000-6000 ريال',
              count: 1,
            },
            {
              title: 'حارس أمن',
              description: 'حراسة المرافق والمباني',
              requirements: 'شهادة ثانوية + تدريب أمني',
              salary: '2500-4000 ريال',
              count: 8,
            },
          ],
        },
      ],
    },
  ],

  // Branches (4 Branches)
  branches: [
    {
      id: 'BRANCH_001',
      name: 'الفرع الأول - مركز التأهيل الشامل',
      nameArabic: 'مركز التأهيل الشامل',
      location: 'المدينة - المركز الرئيسي',
      manager: 'مدير الفرع',
      departments: [
        {
          id: 'DEPT_B1_001',
          name: 'قسم التأهيل المهني',
          description: 'تدريب وتأهيل الأفراد ذوي الإعاقة للعمل',
          manager: 'مدير القسم',
          responsibilities: ['تقييم القدرات والمهارات', 'تصميم برامج تأهيل مخصصة', 'التدريب على المهارات المهنية', 'التوظيف المدعوم'],
          positions: [
            {
              title: 'متخصص تأهيل مهني',
              description: 'تقييم وتدريب الأفراد على مهارات مهنية',
              requirements: 'درجة جامعية + خبرة في مجال التأهيل',
              salary: '3000-4500 ريال',
              count: 5,
            },
            {
              title: 'مشرف حرف ومهن',
              description: 'الإشراف على ورش التدريب والحرف',
              requirements: 'درجة جامعية + خبرة عملية',
              salary: '2800-4200 ريال',
              count: 4,
            },
            {
              title: 'معلم حرفة',
              description: 'تدريس الحرف والمهن',
              requirements: 'درجة ثانوية + خبرة عملية',
              salary: '2000-3500 ريال',
              count: 6,
            },
            {
              title: 'مدرب مهارات حاسوبية',
              description: 'تدريب على برامج الحاسوب والتطبيقات',
              requirements: 'درجة جامعية في الحاسوب',
              salary: '2500-4000 ريال',
              count: 3,
            },
            {
              title: 'متخصص توظيف مدعوم',
              description: 'البحث عن فرص توظيفية ودعم التوظيف',
              requirements: 'درجة جامعية + خبرة في التوظيف',
              salary: '2500-3800 ريال',
              count: 3,
            },
            {
              title: 'مدرب مهارات حياتية',
              description: 'تدريب على المهارات الحياتية والاستقلالية',
              requirements: 'درجة جامعية في التربية الخاصة',
              salary: '2300-3800 ريال',
              count: 3,
            },
            {
              title: 'مستشار مهني',
              description: 'تقديم الاستشارات المهنية والتوجيه',
              requirements: 'درجة جامعية + خبرة في الإرشاد',
              salary: '2800-4200 ريال',
              count: 2,
            },
          ],
        },
        {
          id: 'DEPT_B1_002',
          name: 'قسم التأهيل الاجتماعي والنفسي',
          description: 'الدعم النفسي والاجتماعي للأفراد ذوي الإعاقة',
          manager: 'مدير القسم',
          responsibilities: ['تقديم الاستشارات النفسية', 'دعم التكيف الاجتماعي', 'تقوية المهارات الاجتماعية', 'دعم الأسرة والمحيط'],
          positions: [
            {
              title: 'أخصائي نفسي إكلينيكي',
              description: 'تقديم الدعم النفسي والاستشارات',
              requirements: 'درجة جامعية في علم النفس',
              salary: '3500-5000 ريال',
              count: 4,
            },
            {
              title: 'أخصائي اجتماعي',
              description: 'الدعم الاجتماعي والتكيف الاجتماعي',
              requirements: 'درجة جامعية في الخدمة الاجتماعية',
              salary: '3000-4500 ريال',
              count: 4,
            },
            {
              title: 'معالج نطق وتخاطب',
              description: 'علاج مشاكل النطق والتخاطب',
              requirements: 'درجة جامعية متخصصة',
              salary: '3500-5000 ريال',
              count: 3,
            },
            {
              title: 'معالج وظيفي',
              description: 'تحسين القدرات الوظيفية والاستقلالية',
              requirements: 'درجة جامعية في العلاج الوظيفي',
              salary: '3200-4800 ريال',
              count: 3,
            },
            {
              title: 'منسق برامج اجتماعية',
              description: 'تنظيم البرامج والفعاليات الاجتماعية',
              requirements: 'درجة جامعية + خبرة',
              salary: '2200-3500 ريال',
              count: 3,
            },
            {
              title: 'مدرب سلوكي',
              description: 'تعديل السلوك والتدريب السلوكي',
              requirements: 'درجة جامعية في علم النفس',
              salary: '2800-4200 ريال',
              count: 2,
            },
            {
              title: 'أخصائي تربية خاصة',
              description: 'تقديم الدعم التربوي للحالات الخاصة',
              requirements: 'درجة جامعية في التربية الخاصة',
              salary: '2800-4300 ريال',
              count: 3,
            },
          ],
        },
        {
          id: 'DEPT_B1_003',
          name: 'قسم التأهيل الطبي والعلاجي',
          description: 'الخدمات الطبية والعلاجية',
          manager: 'مدير القسم',
          responsibilities: ['التقييم الطبي والتشخيصي', 'العلاج الطبيعي والحركي', 'المتابعة الطبية المستمرة', 'الرعاية الصحية الوقائية'],
          positions: [
            {
              title: 'طبيب متخصص',
              description: 'التقييم الطبي والتشخيص',
              requirements: 'درجة طبية + تخصص',
              salary: '5000-8000 ريال',
              count: 2,
            },
            {
              title: 'معالج طبيعي',
              description: 'العلاج الطبيعي والحركي',
              requirements: 'درجة جامعية في العلاج الطبيعي',
              salary: '3200-4800 ريال',
              count: 5,
            },
            {
              title: 'ممرضة متخصصة',
              description: 'الرعاية التمريضية',
              requirements: 'درجة جامعية في التمريض',
              salary: '2500-4000 ريال',
              count: 6,
            },
            {
              title: 'فني أجهزة طبية',
              description: 'صيانة وتشغيل الأجهزة الطبية',
              requirements: 'درجة تقنية في الهندسة الطبية',
              salary: '2000-3500 ريال',
              count: 2,
            },
            {
              title: 'أخصائي تغذية',
              description: 'الاستشارات الغذائية والبرامج الصحية',
              requirements: 'درجة جامعية في التغذية',
              salary: '2800-4200 ريال',
              count: 2,
            },
            {
              title: 'صيدلي',
              description: 'إدارة الأدوية والاستشارات الدوائية',
              requirements: 'درجة صيدلة + ترخيص مهني',
              salary: '3500-5500 ريال',
              count: 2,
            },
            {
              title: 'فني مختبر',
              description: 'إجراء التحاليل والفحوصات المخبرية',
              requirements: 'درجة تقنية في المختبرات',
              salary: '2200-3800 ريال',
              count: 2,
            },
            {
              title: 'فني أشعة',
              description: 'إجراء الأشعة التشخيصية',
              requirements: 'درجة تقنية في الأشعة',
              salary: '2500-4000 ريال',
              count: 1,
            },
          ],
        },
      ],
    },
    {
      id: 'BRANCH_002',
      name: 'الفرع الثاني - مركز التعليم والتدريب',
      nameArabic: 'مركز التعليم والتدريب',
      location: 'المدينة - الحي الشرقي',
      manager: 'مدير الفرع',
      departments: [
        {
          id: 'DEPT_B2_001',
          name: 'قسم التعليم الأساسي',
          description: 'برامج التعليم الأساسي والمحو',
          manager: 'مدير القسم',
          responsibilities: ['تعليم القراءة والكتابة والحساب', 'تطوير المهارات الأساسية', 'الدعم الأكاديمي', 'متابعة الدراسة'],
          positions: [
            {
              title: 'معلم فصل',
              description: 'تعليم المواد الأساسية',
              requirements: 'درجة جامعية في التعليم',
              salary: '3000-4500 ريال',
              count: 5,
            },
            {
              title: 'معلم دعم تربوي',
              description: 'الدعم الأكاديمي والتقوية',
              requirements: 'درجة جامعية في التربية',
              salary: '2800-4200 ريال',
              count: 4,
            },
            {
              title: 'معلم تربية خاصة',
              description: 'تعليم الطلاب ذوي الاحتياجات الخاصة',
              requirements: 'درجة جامعية في التربية الخاصة',
              salary: '3200-4800 ريال',
              count: 4,
            },
            {
              title: 'معلم قرآن كريم',
              description: 'تعليم القرآن الكريم والتجويد',
              requirements: 'إجازة في القرآن + خبرة تعليمية',
              salary: '2500-3800 ريال',
              count: 2,
            },
            {
              title: 'مشرف تربوي',
              description: 'الإشراف على العملية التعليمية',
              requirements: 'درجة جامعية + خبرة 5 سنوات',
              salary: '3500-5000 ريال',
              count: 2,
            },
          ],
        },
        {
          id: 'DEPT_B2_002',
          name: 'قسم التدريب المهني المتقدم',
          description: 'برامج تدريب متقدمة في المهن',
          manager: 'مدير القسم',
          responsibilities: [
            'التدريب في مجالات متعددة',
            'التدريب على الحاسوب والتكنولوجيا',
            'إدارة المشاريع الصغيرة',
            'الدعم في بدء مشاريع خاصة',
          ],
          positions: [
            {
              title: 'متدرب تقني',
              description: 'التدريب التقني والتكنولوجي',
              requirements: 'درجة تقنية متوسطة',
              salary: '2800-4200 ريال',
              count: 4,
            },
            {
              title: 'مستشار مشاريع صغيرة',
              description: 'استشارات ودعم المشاريع',
              requirements: 'خبرة في المشاريع الصغيرة',
              salary: '3000-4500 ريال',
              count: 2,
            },
            {
              title: 'مدرب تصميم جرافيك',
              description: 'تدريب على برامج التصميم الجرافيكي',
              requirements: 'درجة جامعية في التصميم',
              salary: '2500-4000 ريال',
              count: 2,
            },
            {
              title: 'مدرب برمجة',
              description: 'تدريب على البرمجة ولغات البرمجة',
              requirements: 'درجة جامعية في علوم الحاسوب',
              salary: '3000-5000 ريال',
              count: 2,
            },
            {
              title: 'مدرب تجارة إلكترونية',
              description: 'تدريب على التجارة الإلكترونية والتسويق',
              requirements: 'درجة جامعية + خبرة عملية',
              salary: '2800-4200 ريال',
              count: 2,
            },
          ],
        },
      ],
    },
    {
      id: 'BRANCH_003',
      name: 'الفرع الثالث - مركز التأهيل المهني المكثف',
      nameArabic: 'مركز التأهيل المهني',
      location: 'المدينة - الحي الغربي',
      manager: 'مدير الفرع',
      departments: [
        {
          id: 'DEPT_B3_001',
          name: 'قسم الحرف والصناعات اليدوية',
          description: 'تدريب على الحرف والصناعات اليدوية',
          manager: 'مدير القسم',
          responsibilities: ['تدريب على الحرف التقليدية', 'صناعة المنتجات اليدوية', 'التسويق والبيع', 'تطوير منتجات جديدة'],
          positions: [
            {
              title: 'حرفي متخصص',
              description: 'تدريس وممارسة الحرف',
              requirements: 'خبرة عملية في الحرفة',
              salary: '2200-3800 ريال',
              count: 6,
            },
            {
              title: 'منسق إنتاج',
              description: 'تنسيق الإنتاج والجودة',
              requirements: 'درجة تقنية + خبرة',
              salary: '2500-4000 ريال',
              count: 2,
            },
            {
              title: 'معلم نجارة',
              description: 'تعليم أعمال النجارة والخشب',
              requirements: 'خبرة عملية 5+ سنوات',
              salary: '2000-3500 ريال',
              count: 2,
            },
            {
              title: 'معلم خياطة',
              description: 'تعليم أعمال الخياطة والتفصيل',
              requirements: 'خبرة عملية 5+ سنوات',
              salary: '2000-3500 ريال',
              count: 3,
            },
            {
              title: 'معلم صناعات غذائية',
              description: 'تعليم صناعة المنتجات الغذائية',
              requirements: 'خبرة عملية + شهادة صحية',
              salary: '2000-3500 ريال',
              count: 2,
            },
            {
              title: 'منسق تسويق منتجات',
              description: 'تسويق وبيع المنتجات اليدوية',
              requirements: 'درجة جامعية في التسويق',
              salary: '2300-3800 ريال',
              count: 2,
            },
          ],
        },
        {
          id: 'DEPT_B3_002',
          name: 'قسم التدريب على المهن الحديثة',
          description: 'تدريب على مهن حديثة ومستقبلية',
          manager: 'مدير القسم',
          responsibilities: ['تدريب على مهن التكنولوجيا', 'الخدمات والضيافة', 'إدارة الأعمال الصغيرة', 'ريادة الأعمال'],
          positions: [
            {
              title: 'متخصص تدريب تقني',
              description: 'تدريب على المهن الحديثة',
              requirements: 'درجة جامعية + خبرة',
              salary: '3000-4500 ريال',
              count: 3,
            },
            {
              title: 'مدرب ريادة أعمال',
              description: 'تدريب على ريادة الأعمال',
              requirements: 'خبرة في رجال أعمال',
              salary: '3200-4800 ريال',
              count: 2,
            },
            {
              title: 'مدرب خدمة عملاء',
              description: 'تدريب على مهارات خدمة العملاء',
              requirements: 'درجة جامعية + خبرة',
              salary: '2500-3800 ريال',
              count: 2,
            },
            {
              title: 'مدرب مهارات البيع',
              description: 'تدريب على مهارات البيع والتسويق',
              requirements: 'خبرة في المبيعات والتسويق',
              salary: '2800-4200 ريال',
              count: 2,
            },
            {
              title: 'مدرب ضيافة وفندقة',
              description: 'تدريب على مهارات الضيافة والفندقة',
              requirements: 'درجة جامعية + خبرة عملية',
              salary: '2500-4000 ريال',
              count: 2,
            },
          ],
        },
      ],
    },
    {
      id: 'BRANCH_004',
      name: 'الفرع الرابع - مركز التوظيف والدمج الاجتماعي',
      nameArabic: 'مركز التوظيف والدمج',
      location: 'المدينة - الحي الجنوبي',
      manager: 'مدير الفرع',
      departments: [
        {
          id: 'DEPT_B4_001',
          name: 'قسم التوظيف المدعوم',
          description: 'توظيف ودعم الأفراد ذوي الإعاقة',
          manager: 'مدير القسم',
          responsibilities: [
            'توظيف في الجهات الحكومية والخاصة',
            'التوظيف المدعوم المباشر',
            'المتابعة والدعم بعد التوظيف',
            'علاقات مع جهات التوظيف',
          ],
          positions: [
            {
              title: 'متخصص توظيف',
              description: 'البحث عن فرص توظيفية',
              requirements: 'درجة جامعية + خبرة في التوظيف',
              salary: '2800-4200 ريال',
              count: 4,
            },
            {
              title: 'منسق متابعة توظيف',
              description: 'متابعة الموظفين بعد التوظيف',
              requirements: 'درجة جامعية + خبرة',
              salary: '2500-3800 ريال',
              count: 3,
            },
            {
              title: 'مستشار توظيف',
              description: 'تقديم الاستشارات والإرشاد المهني',
              requirements: 'درجة جامعية + خبرة في الإرشاد',
              salary: '3000-4500 ريال',
              count: 2,
            },
            {
              title: 'منسق علاقات أصحاب عمل',
              description: 'بناء علاقات مع جهات التوظيف',
              requirements: 'درجة جامعية + مهارات تواصل',
              salary: '2800-4200 ريال',
              count: 2,
            },
          ],
        },
        {
          id: 'DEPT_B4_002',
          name: 'قسم الدمج الاجتماعي',
          description: 'دمج الأفراد ذوي الإعاقة في المجتمع',
          manager: 'مدير القسم',
          responsibilities: ['برامج الدمج الاجتماعي', 'الأنشطة الترفيهية والثقافية', 'بناء العلاقات الاجتماعية', 'برامج التطوع'],
          positions: [
            {
              title: 'منسق أنشطة اجتماعية',
              description: 'تنظيم الأنشطة والفعاليات',
              requirements: 'درجة جامعية + حماس اجتماعي',
              salary: '2300-3800 ريال',
              count: 3,
            },
            {
              title: 'منسق متطوعين',
              description: 'تنسيق برامج التطوع',
              requirements: 'درجة جامعية + خبرة مجتمعية',
              salary: '2200-3500 ريال',
              count: 2,
            },
            {
              title: 'مدرب رياضي',
              description: 'تدريب الأنشطة الرياضية والترفيهية',
              requirements: 'درجة في التربية البدنية',
              salary: '2500-4000 ريال',
              count: 3,
            },
            {
              title: 'منسق فعاليات ثقافية',
              description: 'تنظيم الفعاليات الثقافية والترفيهية',
              requirements: 'درجة جامعية + خبرة',
              salary: '2300-3800 ريال',
              count: 2,
            },
            {
              title: 'مدرب فنون',
              description: 'تدريب الفنون والموسيقى والرسم',
              requirements: 'خبرة عملية في الفنون',
              salary: '2000-3500 ريال',
              count: 2,
            },
          ],
        },
        {
          id: 'DEPT_B4_003',
          name: 'قسم دعم الأسر والمجتمع',
          description: 'دعم الأسر والتوعية المجتمعية',
          manager: 'مدير القسم',
          responsibilities: ['دعم الأسر والاستشارات', 'برامج التوعية المجتمعية', 'العلاقات العامة والتسويق', 'جمع التبرعات والموارد'],
          positions: [
            {
              title: 'أخصائي دعم أسري',
              description: 'دعم الأسر والاستشارات',
              requirements: 'درجة جامعية في الخدمة الاجتماعية',
              salary: '2800-4200 ريال',
              count: 3,
            },
            {
              title: 'منسق علاقات عامة',
              description: 'العلاقات العامة والتسويق',
              requirements: 'درجة جامعية + خبرة',
              salary: '2500-4000 ريال',
              count: 2,
            },
            {
              title: 'مسؤول إعلام اجتماعي',
              description: 'إدارة وسائل التواصل الاجتماعي',
              requirements: 'درجة جامعية في الإعلام',
              salary: '2500-3800 ريال',
              count: 2,
            },
            {
              title: 'منسق جمع تبرعات',
              description: 'تنظيم حملات جمع التبرعات',
              requirements: 'درجة جامعية + خبرة',
              salary: '2300-3800 ريال',
              count: 2,
            },
            {
              title: 'منسق شراكات مجتمعية',
              description: 'بناء الشراكات مع المؤسسات',
              requirements: 'درجة جامعية + خبرة',
              salary: '2800-4200 ريال',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
};

// Routes

// GET all organizational structure
router.get('/structure', (req, res) => {
  try {
    res.json({
      success: true,
      data: organizationalStructure,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET specific branch
router.get('/branches/:branchId', (req, res) => {
  try {
    const branch = organizationalStructure.branches.find(b => b.id === req.params.branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود',
      });
    }
    res.json({
      success: true,
      data: branch,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET all branches
router.get('/branches', (req, res) => {
  try {
    res.json({
      success: true,
      data: organizationalStructure.branches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET all departments
router.get('/departments', (req, res) => {
  try {
    res.json({
      success: true,
      data: organizationalStructure.departments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET CEO/Chairman info
router.get('/chairman', (req, res) => {
  try {
    res.json({
      success: true,
      data: organizationalStructure.chairman,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET Strategic KPIs
router.get('/kpis', (req, res) => {
  try {
    res.json({
      success: true,
      data: strategicKPIs,
      description: 'مؤشرات الأداء الرئيسية للمنظمة',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET Career Paths
router.get('/career-paths', (req, res) => {
  try {
    res.json({
      success: true,
      data: careerPaths,
      description: 'المسارات الوظيفية المتاحة',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET Training Programs
router.get('/training-programs', (req, res) => {
  try {
    res.json({
      success: true,
      data: trainingPrograms,
      description: 'برامج التدريب والتطوير',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET Organization Statistics
router.get('/statistics', (req, res) => {
  try {
    let totalPositions = 0;
    let totalDepartments = organizationalStructure.departments.length;
    let totalBranches = organizationalStructure.branches.length;
    let totalSections = 0;

    // Count positions in departments
    organizationalStructure.departments.forEach(dept => {
      if (dept.sections) {
        totalSections += dept.sections.length;
        dept.sections.forEach(section => {
          if (section.positions) {
            if (Array.isArray(section.positions)) {
              section.positions.forEach(pos => {
                if (typeof pos === 'object' && pos.count) {
                  totalPositions += pos.count;
                }
              });
            }
          }
        });
      }
    });

    // Count positions in branches
    organizationalStructure.branches.forEach(branch => {
      if (branch.departments) {
        branch.departments.forEach(dept => {
          totalSections += 1;
          if (dept.positions) {
            dept.positions.forEach(pos => {
              if (pos.count) {
                totalPositions += pos.count;
              }
            });
          }
        });
      }
    });

    res.json({
      success: true,
      data: {
        totalDepartments,
        totalBranches,
        totalSections,
        totalPositions,
        organizationLevel: 'كبيرة',
        structureType: 'هيكل وظيفي - مصفوفي',
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET Salary Analysis
router.get('/salary-analysis', (req, res) => {
  try {
    const salaryRanges = {
      executive: { min: 8000, max: 12000, positions: [] },
      senior: { min: 5000, max: 8000, positions: [] },
      mid: { min: 3000, max: 5000, positions: [] },
      junior: { min: 2000, max: 3000, positions: [] },
      entry: { min: 1500, max: 2000, positions: [] },
    };

    const analyzeSalary = position => {
      if (!position.salary) return;
      const match = position.salary.match(/(\d+)-(\d+)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        const avg = (min + max) / 2;

        if (avg >= 8000) salaryRanges.executive.positions.push(position.title);
        else if (avg >= 5000) salaryRanges.senior.positions.push(position.title);
        else if (avg >= 3000) salaryRanges.mid.positions.push(position.title);
        else if (avg >= 2000) salaryRanges.junior.positions.push(position.title);
        else salaryRanges.entry.positions.push(position.title);
      }
    };

    // Analyze branches
    organizationalStructure.branches.forEach(branch => {
      if (branch.departments) {
        branch.departments.forEach(dept => {
          if (dept.positions) {
            dept.positions.forEach(analyzeSalary);
          }
        });
      }
    });

    res.json({
      success: true,
      data: salaryRanges,
      description: 'تحليل نطاقات الرواتب',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET Department by ID with enhanced data
router.get('/departments/:deptId', (req, res) => {
  try {
    const dept = organizationalStructure.departments.find(d => d.id === req.params.deptId);
    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'القسم غير موجود',
      });
    }

    // Add KPIs if available
    let kpis = null;
    if (dept.id === 'DEPT_001') kpis = strategicKPIs.departmentKPIs.hr;
    if (dept.id === 'DEPT_002') kpis = strategicKPIs.departmentKPIs.finance;
    if (dept.id === 'DEPT_005') kpis = strategicKPIs.departmentKPIs.legal;

    res.json({
      success: true,
      data: {
        ...dept,
        kpis,
        careerPaths: careerPaths.administrative,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET Recommended training for position
router.get('/training/recommendations/:positionTitle', (req, res) => {
  try {
    const title = decodeURIComponent(req.params.positionTitle);
    let recommendations = [...trainingPrograms.mandatory];

    // Add specialized based on position
    if (title.includes('محامي') || title.includes('قانوني')) {
      recommendations.push(trainingPrograms.specialized.find(t => t.id === 'TR104'));
    }
    if (title.includes('معالج') || title.includes('طبيعي')) {
      recommendations.push(trainingPrograms.specialized.find(t => t.id === 'TR102'));
    }
    if (title.includes('نفسي') || title.includes('اجتماعي')) {
      recommendations.push(trainingPrograms.specialized.find(t => t.id === 'TR103'));
    }
    if (title.includes('تأهيل') || title.includes('مهني')) {
      recommendations.push(trainingPrograms.specialized.find(t => t.id === 'TR101'));
    }
    if (title.includes('مدير') || title.includes('مشرف')) {
      recommendations = recommendations.concat(trainingPrograms.leadership);
    }

    res.json({
      success: true,
      data: {
        position: title,
        recommendedPrograms: recommendations.filter(r => r),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET Career progression for position
router.get('/career-progression/:positionTitle', (req, res) => {
  try {
    const title = decodeURIComponent(req.params.positionTitle);
    let progression = {
      current: title,
      nextLevel: null,
      track: null,
      requirementsForNext: [],
    };

    // Determine track and progression
    if (title.includes('مساعد')) {
      progression.nextLevel = title.replace('مساعد', 'موظف');
      progression.track = 'administrative';
      progression.requirementsForNext = ['خبرة سنة', 'تدريب أساسي'];
    } else if (title.includes('موظف') || title.includes('منسق')) {
      progression.nextLevel = title.replace('موظف', 'مشرف').replace('منسق', 'مشرف');
      progression.track = 'administrative';
      progression.requirementsForNext = ['خبرة 2-3 سنوات', 'تدريب قيادي', 'تقييم أداء ممتاز'];
    } else if (title.includes('مشرف')) {
      progression.nextLevel = 'مدير قسم';
      progression.track = 'administrative';
      progression.requirementsForNext = ['خبرة 3-5 سنوات', 'دورات إدارية متقدمة', 'إنجازات متميزة'];
    }

    res.json({
      success: true,
      data: progression,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== AI-POWERED SMART ENDPOINTS ====================

// AI: Predict Promotion Probability
router.post('/ai/predict-promotion', (req, res) => {
  try {
    const { position, experience, performance } = req.body;

    if (!position || experience === undefined || performance === undefined) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم: position, experience, performance',
      });
    }

    const probability = aiEngine.predictions.calculatePromotionProbability(position, experience, performance);

    let recommendation = '';
    if (probability >= 80) recommendation = 'جاهز للترقية - مرشح قوي';
    else if (probability >= 60) recommendation = 'يحتاج تطوير بسيط قبل الترقية';
    else if (probability >= 40) recommendation = 'يحتاج تطوير متوسط - خطة 6-12 شهر';
    else recommendation = 'يحتاج تطوير كبير - خطة 12-18 شهر';

    res.json({
      success: true,
      data: {
        position,
        experience: experience + ' سنوات',
        performance: performance + '/5',
        promotionProbability: probability + '%',
        status: probability >= 70 ? 'عالية' : probability >= 50 ? 'متوسطة' : 'منخفضة',
        recommendation,
        nextSteps: probability < 70 ? ['تحسين الأداء', 'دورات تدريبية', 'مشاريع قيادية'] : ['جاهز للترقية'],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Predict Turnover Risk
router.post('/ai/predict-turnover', (req, res) => {
  try {
    const { salary, satisfaction, experience } = req.body;

    const risk = aiEngine.predictions.predictTurnoverRisk(salary, satisfaction, experience);

    let actions = [];
    if (risk > 60) {
      actions = ['مراجعة الراتب فوراً', 'جلسة واحد لواحد', 'تحسين بيئة العمل', 'فرص تطوير'];
    } else if (risk > 30) {
      actions = ['تقييم الرضا الوظيفي', 'مناقشة المسار الوظيفي', 'تحسينات تدريجية'];
    } else {
      actions = ['استمرار المتابعة الدورية', 'تعزيز الرضا الحالي'];
    }

    res.json({
      success: true,
      data: {
        riskLevel: risk + '%',
        status: risk > 60 ? 'خطر عالي' : risk > 30 ? 'خطر متوسط' : 'خطر منخفض',
        urgency: risk > 60 ? 'عاجل' : risk > 30 ? 'متوسط' : 'عادي',
        recommendedActions: actions,
        timeframe: risk > 60 ? 'خلال شهر' : risk > 30 ? 'خلال 3 أشهر' : 'مراجعة دورية',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Training Impact Analysis
router.post('/ai/training-impact', (req, res) => {
  try {
    const { position, currentSkills, targetSkills } = req.body;

    const impact = aiEngine.predictions.estimateTrainingImpact(position, currentSkills, targetSkills);

    res.json({
      success: true,
      data: {
        position,
        currentLevel: currentSkills + '%',
        targetLevel: targetSkills + '%',
        ...impact,
        roi: impact.expectedImprovement > 70 ? 'عالي' : 'متوسط',
        recommendation: impact.skillGap > 30 ? 'تدريب مكثف مطلوب' : 'تدريب منتظم كافٍ',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Budget Forecasting
router.post('/ai/forecast-budget', (req, res) => {
  try {
    const { positions, avgSalary, growthRate } = req.body;

    const forecast = aiEngine.predictions.forecastBudgetNeeds(positions || 100, avgSalary || 4000, growthRate || 0.1);

    res.json({
      success: true,
      data: {
        ...forecast,
        insights: ['يشمل رواتب + تأمينات + مزايا', 'نمو متوقع ' + growthRate * 100 + '%', 'ميزانية التدريب حسب 5000 ريال/موظف سنوياً'],
        savings: forecast.total > 50000000 ? ['إمكانية توفير 15% بالأتمتة', 'تقليل التكاليف الإدارية'] : [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Smart Job Matching
router.post('/ai/match-candidate', (req, res) => {
  try {
    const { employee, job } = req.body;

    if (!employee || !job) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم بيانات الموظف والوظيفة',
      });
    }

    const matchScore = aiEngine.matching.matchEmployeeToJob(employee, job);

    let decision = '';
    if (matchScore >= 80) decision = 'مرشح ممتاز - توظيف فوري';
    else if (matchScore >= 65) decision = 'مرشح جيد - مقابلة تفصيلية';
    else if (matchScore >= 50) decision = 'مرشح محتمل - تقييم إضافي';
    else decision = 'غير مناسب للوظيفة الحالية';

    res.json({
      success: true,
      data: {
        candidateName: employee.name,
        jobTitle: job.title,
        matchScore: matchScore + '%',
        matchLevel: matchScore >= 80 ? 'ممتاز' : matchScore >= 65 ? 'جيد جداً' : matchScore >= 50 ? 'جيد' : 'ضعيف',
        decision,
        strengths: matchScore >= 65 ? ['مطابقة الخبرة', 'مهارات متوافقة'] : [],
        gaps: matchScore < 65 ? ['يحتاج تدريب إضافي', 'خبرة أقل من المطلوب'] : [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Team Efficiency Analysis
router.post('/ai/team-efficiency', (req, res) => {
  try {
    const { team } = req.body;

    if (!team || !Array.isArray(team)) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم بيانات الفريق (array)',
      });
    }

    const efficiency = aiEngine.analytics.calculateTeamEfficiency(team);

    res.json({
      success: true,
      data: {
        teamSize: team.length,
        ...efficiency,
        status: efficiency.overallEfficiency >= 85 ? 'ممتاز' : efficiency.overallEfficiency >= 70 ? 'جيد' : 'يحتاج تحسين',
        recommendations:
          efficiency.overallEfficiency < 75
            ? ['تحسين التعاون', 'تدريب إضافي', 'إعادة توزيع المهام']
            : ['الحفاظ على المستوى الحالي', 'تحديات جديدة'],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Skill Gap Analysis
router.post('/ai/skill-gaps', (req, res) => {
  try {
    const { department, requiredSkills } = req.body;

    if (!requiredSkills || !Array.isArray(requiredSkills)) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم المهارات المطلوبة (array)',
      });
    }

    const gaps = aiEngine.analytics.identifySkillGaps(department, requiredSkills);

    res.json({
      success: true,
      data: {
        department: department || 'القسم',
        totalSkillsAnalyzed: requiredSkills.length,
        gapsIdentified: gaps.length,
        gaps,
        overallReadiness: gaps.length === 0 ? 100 : Math.round(((requiredSkills.length - gaps.length) / requiredSkills.length) * 100),
        criticalGaps: gaps.filter(g => g.priority === 'عالية'),
        recommendation: gaps.length > 3 ? 'برنامج تدريب شامل مطلوب' : gaps.length > 0 ? 'تدريب مستهدف' : 'مستوى المهارات ممتاز',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Department Insights
router.post('/ai/department-insights', (req, res) => {
  try {
    const { deptId, metrics } = req.body;

    if (!metrics) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم مقاييس الأداء',
      });
    }

    const insights = aiEngine.analytics.generateDepartmentInsights(deptId, metrics);

    const summary = {
      totalInsights: insights.length,
      critical: insights.filter(i => i.priority === 'حرجة').length,
      warnings: insights.filter(i => i.priority === 'عالية').length,
      info: insights.filter(i => i.priority === 'متوسطة').length,
    };

    res.json({
      success: true,
      data: {
        department: deptId,
        summary,
        insights,
        overallHealth: summary.critical > 0 ? 'يحتاج تدخل فوري' : summary.warnings > 2 ? 'يحتاج انتباه' : 'صحي',
        actionRequired: summary.critical > 0 || summary.warnings > 2,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Hiring Plan Generator
router.post('/ai/hiring-plan', (req, res) => {
  try {
    const { department, currentStaff, projectedGrowth } = req.body;

    const plan = aiEngine.recommendations.generateHiringPlan(department || 'القسم', currentStaff || 10, projectedGrowth || 20);

    res.json({
      success: true,
      data: {
        ...plan,
        estimatedCost: plan.recommendedHires * 4000 * 12,
        recruitmentStrategy: plan.priority === 'عالية جداً' ? 'توظيف سريع - وكالات توظيف' : 'توظيف منتظم',
        onboardingPlan: plan.recommendedHires > 5 ? 'برنامج تهيئة مكثف' : 'تهيئة قياسية',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Succession Planning
router.post('/ai/succession-plan', (req, res) => {
  try {
    const { position, team } = req.body;

    if (!team || !Array.isArray(team)) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم بيانات الفريق',
      });
    }

    const successors = aiEngine.recommendations.suggestSuccessionPlan(position, team);

    res.json({
      success: true,
      data: {
        position: position?.title || 'الوظيفة',
        successorsIdentified: successors.length,
        successors,
        riskLevel:
          successors.length === 0 ? 'عالي - لا يوجد خلفاء' : successors.length === 1 ? 'متوسط - خليفة واحد فقط' : 'منخفض - خيارات متعددة',
        recommendation: successors.length < 2 ? 'تطوير خلفاء إضافيين' : 'خطة تعاقب جيدة',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Resource Allocation Analysis
router.post('/ai/resource-allocation', (req, res) => {
  try {
    const { departments } = req.body;

    if (!departments || !Array.isArray(departments)) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم بيانات الإدارات',
      });
    }

    const analysis = aiEngine.optimization.analyzeResourceAllocation(departments);

    res.json({
      success: true,
      data: {
        ...analysis,
        inefficientDepts: analysis.departments.filter(d => d.efficiency < 75),
        topPerformers: analysis.departments.filter(d => d.efficiency >= 85).slice(0, 3),
        totalSavingsPotential: Math.round(analysis.totalCost * 0.1),
        recommendations: [
          'إعادة توزيع الموارد من الأقسام الأقل كفاءة',
          'تطبيق أفضل الممارسات من الأقسام الفعالة',
          'استثمار في التدريب والتكنولوجيا',
        ],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Cost Savings Suggestions
router.post('/ai/cost-savings', (req, res) => {
  try {
    const { currentSpending, category } = req.body;

    const savings = aiEngine.optimization.suggestCostSavings(currentSpending || 1000000, category || 'operations');

    const totalPotentialSaving = savings.reduce((sum, s) => sum + s.potentialSaving, 0);

    res.json({
      success: true,
      data: {
        currentSpending,
        category,
        savingOpportunities: savings,
        totalPotentialSaving,
        savingPercentage: Math.round((totalPotentialSaving / currentSpending) * 100),
        roi: totalPotentialSaving > 200000 ? 'عالي جداً' : 'متوسط',
        implementation: 'خطة 6-12 شهر',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Comprehensive Dashboard
router.get('/ai/dashboard', (req, res) => {
  try {
    // Simulated real-time data
    const dashboard = {
      timestamp: new Date().toISOString(),
      organizationHealth: {
        overall: 85,
        trend: 'تحسن',
        status: 'جيد جداً',
      },
      keyMetrics: {
        employeeSatisfaction: 82,
        productivity: 88,
        turnoverRate: 8,
        trainingCompletion: 75,
      },
      alerts: [
        { type: 'info', message: '3 موظفين جاهزين للترقية', priority: 'متوسطة' },
        { type: 'warning', message: 'معدل التدريب في قسم المالية منخفض', priority: 'عالية' },
      ],
      predictions: {
        nextQuarterGrowth: '12%',
        budgetNeeds: '5.2 مليون ريال',
        hiringNeeds: '15 موظف',
      },
      topPerformers: ['قسم التأهيل', 'قسم تقنية المعلومات', 'القسم القانوني'],
      needsAttention: ['قسم المشتريات - كفاءة منخفضة'],
    };

    res.json({
      success: true,
      data: dashboard,
      aiPowered: true,
      description: 'لوحة معلومات ذكية شاملة بالوقت الفعلي',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Performance Scoring System
router.post('/ai/performance-score', (req, res) => {
  try {
    const { employee } = req.body;

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم بيانات الموظف',
      });
    }

    // حساب نقاط الأداء بناءً على عوامل متعددة
    let score = 0;
    const factors = {};

    // عامل الإنتاجية
    if (employee.tasksCompleted >= 20) {
      score += 25;
      factors.productivity = 25;
    } else if (employee.tasksCompleted >= 15) {
      score += 20;
      factors.productivity = 20;
    } else {
      score += 10;
      factors.productivity = 10;
    }

    // عامل الجودة
    if (employee.qualityRating >= 4.5) {
      score += 25;
      factors.quality = 25;
    } else if (employee.qualityRating >= 4) {
      score += 20;
      factors.quality = 20;
    } else {
      score += 10;
      factors.quality = 10;
    }

    // عامل العمل الجماعي
    if (employee.teamworkRating >= 4) {
      score += 20;
      factors.teamwork = 20;
    } else {
      score += 10;
      factors.teamwork = 10;
    }

    // عامل الالتزام والحضور
    if (employee.attendance >= 95) {
      score += 15;
      factors.attendance = 15;
    } else if (employee.attendance >= 90) {
      score += 10;
      factors.attendance = 10;
    } else {
      score += 5;
      factors.attendance = 5;
    }

    // عامل التطوير والتعلم
    if (employee.trainingsCompleted >= 3) {
      score += 15;
      factors.development = 15;
    } else if (employee.trainingsCompleted >= 1) {
      score += 8;
      factors.development = 8;
    } else {
      score += 3;
      factors.development = 3;
    }

    res.json({
      success: true,
      data: {
        employeeName: employee.name,
        overallScore: score,
        grade: score >= 90 ? 'ممتاز' : score >= 80 ? 'جيد جداً' : score >= 70 ? 'جيد' : 'يحتاج تحسين',
        factors,
        ranking: score >= 90 ? 'أفضل 10%' : score >= 80 ? 'أفضل 30%' : 'متوسط',
        recommendations: score < 80 ? ['تحسين الإنتاجية', 'التركيز على الجودة', 'تطوير المهارات'] : ['الحفاظ على المستوى', 'تحديات جديدة'],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Salary Benchmarking & Optimization
router.post('/ai/salary-analysis', (req, res) => {
  try {
    const { position, currentSalary, experience, performance } = req.body;

    if (!position || !currentSalary) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم position و currentSalary',
      });
    }

    // حساب الراتب المثالي
    const marketRate = currentSalary * 1.15; // معدل السوق
    const experienceBonus = (experience || 0) * 200;
    const performanceBonus = (performance || 3) * 500;
    const recommendedSalary = Math.round(marketRate + experienceBonus + performanceBonus);

    res.json({
      success: true,
      data: {
        position,
        currentSalary,
        marketRate: Math.round(marketRate),
        recommendedSalary,
        adjustment: recommendedSalary - currentSalary,
        percentageChange: Math.round(((recommendedSalary - currentSalary) / currentSalary) * 100),
        justification: recommendedSalary > currentSalary ? ['تحسين معدل السوق', 'خبرة المرشح', 'أداء قوي'] : ['الراتب الحالي مناسب'],
        implementationPlan: recommendedSalary > currentSalary ? 'زيادة تدريجية + مراجعة سنوية' : 'مراجعة في نهاية السنة',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Employee Development Path
router.post('/ai/development-plan', (req, res) => {
  try {
    const { employee, currentPosition, targetPosition, timeline } = req.body;

    if (!employee || !currentPosition) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تقديم بيانات الموظف والموقع الحالي',
      });
    }

    const months = timeline || 12;
    const phases = Math.ceil(months / 3); // تقسيم الخطة إلى مراحل ربع سنوية

    const developmentPlan = {
      employee,
      currentPosition,
      targetPosition: targetPosition || 'الترقية التالية',
      timeline: months + ' شهر',
      phases: [],
    };

    for (let i = 1; i <= phases; i++) {
      developmentPlan.phases.push({
        phase: i,
        month: (i - 1) * 3 + 1 + '-' + i * 3,
        focus: i === 1 ? 'بناء المهارات الأساسية' : i === 2 ? 'تطبيق عملي وتطوير' : 'قيادة والتدريب',
        actions:
          i === 1
            ? ['دورات تدريبية', 'مشاريع صغيرة']
            : i === 2
              ? ['مشاريع متوسطة', 'تدريب على القيادة']
              : ['مشاريع رئيسية', 'تدريب الآخرين'],
        expectedOutcome: i === phases ? 'جاهز للترقية' : 'تقدم في المهارات',
      });
    }

    res.json({
      success: true,
      data: developmentPlan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Organization Health Assessment
router.get('/ai/organization-health', (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      overallHealth: 82,
      healthStatus: 'جيد جداً',
      dimensions: {
        culturalHealth: {
          score: 80,
          status: 'جيد جداً',
          metrics: ['التعاون 85%', 'الشفافية 75%', 'المساءلة 80%'],
          concerns: [],
        },
        operationalHealth: {
          score: 85,
          status: 'جيد جداً',
          metrics: ['الكفاءة 85%', 'الالتزام بالمواعيد 88%', 'جودة العمل 82%'],
          concerns: ['تأخر في بعض المشاريع'],
        },
        financialHealth: {
          score: 78,
          status: 'جيد',
          metrics: ['الميزانية 80%', 'العائد 75%', 'التكاليف 78%'],
          concerns: ['ارتفاع تكاليف التشغيل', 'تأخر في المدفوعات'],
        },
        talentHealth: {
          score: 88,
          status: 'ممتاز',
          metrics: ['الاحتفاظ 90%', 'التطوير 85%', 'الكفاءة 88%'],
          concerns: [],
        },
        strategicHealth: {
          score: 79,
          status: 'جيد',
          metrics: ['الوضوح الاستراتيجي 75%', 'المحاذاة 80%', 'المرونة 82%'],
          concerns: ['تأخر في تنفيذ الاستراتيجية'],
        },
      },
      strengths: ['فريق قوي', 'ثقافة صحية', 'كفاءة عالية'],
      weaknesses: ['تكاليف التشغيل', 'سرعة التطبيق'],
      opportunities: ['التحول الرقمي', 'التوسع', 'الابتكار'],
      threats: ['المنافسة', 'تغيير السوق', 'العوامل الخارجية'],
      recommendations: [
        'تحسين كفاءة التكاليف - توفير 20%',
        'تسريع تنفيذ المشاريع - تقليل الوقت 30%',
        'تعزيز الابتكار - 2 مشروع جديد في الربع القادم',
      ],
    };

    res.json({
      success: true,
      data: health,
      aiPowered: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// AI: Real-time Analytics Events Stream
router.get('/ai/events-stream', (req, res) => {
  try {
    // محاكاة تدفق الأحداث في الوقت الفعلي
    const events = [
      {
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'promotion',
        message: 'أحمد علي ترقي إلى مدير',
        priority: 'عالية',
        icon: '🎉',
      },
      {
        timestamp: new Date(Date.now() - 180000).toISOString(),
        type: 'training',
        message: 'انتهاء دورة القيادة بنجاح',
        priority: 'متوسطة',
        icon: '📚',
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        type: 'milestone',
        message: 'وصلنا إلى 100% التزام المشروع',
        priority: 'متوسطة',
        icon: '🎯',
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        type: 'warning',
        message: 'معدل الغياب في قسم المشتريات 15%',
        priority: 'عالية',
        icon: '⚠️',
      },
      { timestamp: new Date().toISOString(), type: 'success', message: 'نسبة رضا الموظفين 85%', priority: 'منخفضة', icon: '✅' },
    ];

    res.json({
      success: true,
      data: {
        eventsCount: events.length,
        events: events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
        realTime: true,
        description: 'تدفق الأحداث الحية للمنظمة',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

