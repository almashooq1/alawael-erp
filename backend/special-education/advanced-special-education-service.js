/* eslint-disable no-unused-vars */
/**
 * Advanced Special Education Service for Disability Rehabilitation
 * خدمة التربية الخاصة المتقدمة لتأهيل ذوي الإعاقة
 */

class AdvancedSpecialEducationService {
  constructor() {
    this.students = new Map();
    this.programs = new Map();
    this.ieps = new Map(); // Individualized Education Programs
    this.assessments = new Map();
    this.classrooms = new Map();
    this.resources = new Map();
    this._initializePrograms();
  }

  // ==========================================
  // برامج التربية الخاصة
  // ==========================================
  _initializePrograms() {
    const programs = [
      {
        id: 'autism_program',
        name: 'برنامج التوحد',
        targetDisability: 'autism',
        description: 'برنامج تعليمي متخصص للأطفال ذوي اضطراب طيف التوحد',
        methods: ['ABA', 'TEACCH', 'PECS', 'VBA'],
        ageRange: { min: 2, max: 18 },
        duration: 'سنوي',
        objectives: [
          'تحسين التواصل',
          'تطوير المهارات الاجتماعية',
          'تقليل السلوكيات غير المرغوبة',
          'تعزيز الاستقلالية',
        ],
      },
      {
        id: 'learning_disabilities',
        name: 'برنامج صعوبات التعلم',
        targetDisability: 'learning_disability',
        description: 'برنامج لعلاج صعوبات القراءة والكتابة والحساب',
        methods: ['متعدد الحواس', 'أورتن جيلينغهام', ' montessori المعدلة'],
        ageRange: { min: 5, max: 15 },
        duration: 'سنوي',
        objectives: [
          'تحسين مهارات القراءة',
          'تطوير مهارات الكتابة',
          'تعزيز المهارات الحسابية',
          'بناء الثقة بالنفس',
        ],
      },
      {
        id: 'intellectual_disability',
        name: 'برنامج الإعاقة الذهنية',
        targetDisability: 'intellectual_disability',
        description: 'برنامج تعليمي للإعاقة الذهنية بدرجاتها المختلفة',
        methods: ['التعليم المباشر', 'التعلم التجريبي', 'التعليم باللعب'],
        ageRange: { min: 3, max: 21 },
        duration: 'مستمر',
        objectives: [
          'تنمية المهارات المعرفية',
          'تطوير مهارات الحياة اليومية',
          'تعزيز المهارات الاجتماعية',
          'التأهيل المهني',
        ],
      },
      {
        id: 'adhd_program',
        name: 'برنامج اضطراب فرط الحركة',
        targetDisability: 'adhd',
        description: 'برنامج تعليمي متخصص لذوي اضطراب فرط الحركة وتشتت الانتباه',
        methods: ['التعليم المتمايز', 'إدارة السلوك', 'العلاج المعرفي السلوكي'],
        ageRange: { min: 5, max: 18 },
        duration: 'سنوي',
        objectives: [
          'تحسين التركيز والانتباه',
          'تنظيم السلوك',
          'تطوير المهارات التنفيذية',
          'تحسين الأداء الأكاديمي',
        ],
      },
      {
        id: 'hearing_impairment',
        name: 'برنامج الإعاقة السمعية',
        targetDisability: 'hearing_impairment',
        description: 'برنامج تعليمي للصم وضعاف السمع',
        methods: ['لغة الإشارة', 'القراءة الشفوية', 'التواصل الكلي'],
        ageRange: { min: 0, max: 21 },
        duration: 'مستمر',
        objectives: [
          'تنمية مهارات التواصل',
          'تعلم لغة الإشارة',
          'تطوير المهارات اللغوية',
          'الدمج التعليمي',
        ],
      },
      {
        id: 'visual_impairment',
        name: 'برنامج الإعاقة البصرية',
        targetDisability: 'visual_impairment',
        description: 'برنامج تعليمي للمكفوفين وضعاف البصر',
        methods: ['برايل', 'الصوتيات', 'اللمسية', 'المساعدات البصرية'],
        ageRange: { min: 0, max: 21 },
        duration: 'مستمر',
        objectives: [
          'تعلم طريقة برايل',
          'تطوير المهارات الحركية',
          'استخدام التقنيات المساعدة',
          'توجيه وحركة',
        ],
      },
      {
        id: 'multiple_disabilities',
        name: 'برنامج الإعاقة المتعددة',
        targetDisability: 'multiple_disabilities',
        description: 'برنامج متكامل للإعاقات المتعددة',
        methods: ['التعليم الفردي', 'التدخل المتكامل', 'التقنيات المساعدة'],
        ageRange: { min: 0, max: 21 },
        duration: 'مستمر',
        objectives: [
          'تنمية القدرات الكامنة',
          'تطوير التواصل البديل',
          'تحسين جودة الحياة',
          'دعم الأسرة',
        ],
      },
    ];

    programs.forEach(p => this.programs.set(p.id, p));
  }

  getPrograms() {
    return Array.from(this.programs.values());
  }

  // ==========================================
  // إدارة الطلاب
  // ==========================================
  async enrollStudent(studentData) {
    const student = {
      id: Date.now().toString(),
      enrolledAt: new Date(),
      status: 'active', // active, suspended, graduated, withdrawn

      personalInfo: {
        name: studentData.name,
        dateOfBirth: studentData.dateOfBirth,
        gender: studentData.gender,
        nationalId: studentData.nationalId,
        photo: studentData.photo,
      },

      contact: {
        phone: studentData.phone,
        email: studentData.email,
        address: studentData.address,
        city: studentData.city,
      },

      guardian: {
        name: studentData.guardianName,
        relationship: studentData.guardianRelationship,
        phone: studentData.guardianPhone,
        email: studentData.guardianEmail,
        workPhone: studentData.guardianWorkPhone,
      },

      disability: {
        type: studentData.disabilityType,
        degree: studentData.disabilityDegree, // mild, moderate, severe, profound
        diagnosis: studentData.diagnosis,
        diagnosisDate: studentData.diagnosisDate,
        diagnosingCenter: studentData.diagnosingCenter,
        secondaryDisabilities: studentData.secondaryDisabilities || [],
        medicalConditions: studentData.medicalConditions || [],
        medications: studentData.medications || [],
      },

      education: {
        previousSchools: studentData.previousSchools || [],
        currentGrade: studentData.currentGrade,
        enrollmentType: studentData.enrollmentType, // full_inclusion, partial_inclusion, resource_room, self_contained
        assignedProgram: null,
        classroom: null,
      },

      services: {
        transportation: studentData.needsTransportation || false,
        speechTherapy: studentData.needsSpeechTherapy || false,
        occupationalTherapy: studentData.needsOccupationalTherapy || false,
        physicalTherapy: studentData.needsPhysicalTherapy || false,
        psychologicalSupport: studentData.needsPsychologicalSupport || false,
        assistiveTechnology: studentData.needsAssistiveTechnology || [],
      },

      iep: null,
      progressReports: [],
      attendance: { present: 0, absent: 0, late: 0 },
      behaviorRecords: [],
    };

    this.students.set(student.id, student);
    return student;
  }

  async assignProgram(studentId, programId) {
    const student = this.students.get(studentId);
    const program = this.programs.get(programId);

    if (!student || !program) throw new Error('Student or Program not found');

    student.education.assignedProgram = programId;

    return student;
  }

  // ==========================================
  // البرامج التعليمية الفردية (IEP)
  // ==========================================
  async createIEP(iepData) {
    const iep = {
      id: Date.now().toString(),
      createdAt: new Date(),
      status: 'draft', // draft, active, under_review, completed

      student: {
        id: iepData.studentId,
        name: iepData.studentName,
      },

      team: {
        caseManager: iepData.caseManager,
        specialEducationTeacher: iepData.specialEducationTeacher,
        generalEducationTeacher: iepData.generalEducationTeacher,
        parents: iepData.parents,
        specialists: iepData.specialists || [], // speech, occupational, psychological
        administrator: iepData.administrator,
      },

      timeline: {
        effectiveDate: iepData.effectiveDate,
        reviewDate: iepData.reviewDate,
        annualReviewDate: this._calculateAnnualReview(iepData.effectiveDate),
      },

      presentLevels: {
        academic: {
          reading: iepData.readingLevel,
          writing: iepData.writingLevel,
          math: iepData.mathLevel,
          otherSubjects: iepData.otherSubjects || {},
        },
        functional: {
          communication: iepData.communicationLevel,
          socialSkills: iepData.socialSkillsLevel,
          dailyLiving: iepData.dailyLivingLevel,
          motor: iepData.motorLevel,
        },
        behavioral: {
          attention: iepData.attentionLevel,
          behavior: iepData.behaviorLevel,
          emotional: iepData.emotionalLevel,
        },
      },

      goals: {
        annual: [],
        shortTerm: [],
      },

      accommodations: iepData.accommodations || [],
      modifications: iepData.modifications || [],
      relatedServices: iepData.relatedServices || [],
      assessmentModifications: iepData.assessmentModifications || [],

      placement: {
        setting: iepData.placementSetting,
        percentage: iepData.inclusionPercentage,
        supports: iepData.placementSupports || [],
      },

      transition: {
        needed: iepData.needsTransition,
        goals: iepData.transitionGoals || [],
        services: iepData.transitionServices || [],
      },

      progressMonitoring: {
        frequency: iepData.progressFrequency || 'quarterly',
        method: iepData.progressMethod,
        reports: [],
      },

      signatures: {
        parent: { signed: false, date: null },
        caseManager: { signed: false, date: null },
        administrator: { signed: false, date: null },
      },
    };

    this.ieps.set(iep.id, iep);

    // ربط IEP بالطالب
    const student = this.students.get(iepData.studentId);
    if (student) {
      student.iep = iep.id;
    }

    return iep;
  }

  _calculateAnnualReview(effectiveDate) {
    const date = new Date(effectiveDate);
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }

  async addIEPGoal(iepId, goalData) {
    const iep = this.ieps.get(iepId);
    if (!iep) throw new Error('IEP not found');

    const goal = {
      id: Date.now().toString(),
      createdAt: new Date(),

      domain: goalData.domain, // academic, functional, behavioral, transition
      area: goalData.area, // reading, writing, math, communication, etc.

      annualGoal: goalData.annualGoal,
      measurable: goalData.measurable,

      shortTermObjectives: goalData.shortTermObjectives || [],

      criteria: {
        accuracy: goalData.accuracy, // e.g., "80% accuracy"
        conditions: goalData.conditions,
        measurement: goalData.measurement,
      },

      schedule: {
        frequency: goalData.frequency, // daily, weekly, etc.
        duration: goalData.duration,
        sessionsPerWeek: goalData.sessionsPerWeek,
      },

      progress: {
        baseline: goalData.baseline,
        current: goalData.baseline,
        target: goalData.target,
        percentage: 0,
      },

      responsible: goalData.responsible,
      notes: [],
    };

    if (goalData.isAnnual) {
      iep.goals.annual.push(goal);
    } else {
      iep.goals.shortTerm.push(goal);
    }

    return iep;
  }

  async updateGoalProgress(iepId, goalId, progressData) {
    const iep = this.ieps.get(iepId);
    if (!iep) throw new Error('IEP not found');

    const allGoals = [...iep.goals.annual, ...iep.goals.shortTerm];
    const goal = allGoals.find(g => g.id === goalId);
    if (!goal) throw new Error('Goal not found');

    goal.progress.current = progressData.current;
    goal.progress.percentage = Math.round(
      ((progressData.current - goal.progress.baseline) /
        (goal.progress.target - goal.progress.baseline)) *
        100
    );

    goal.notes.push({
      date: new Date(),
      note: progressData.note,
      recordedBy: progressData.recordedBy,
    });

    return goal;
  }

  // ==========================================
  // التقييمات
  // ==========================================
  async createAssessment(assessmentData) {
    const assessment = {
      id: Date.now().toString(),
      createdAt: new Date(),
      type: assessmentData.type, // initial, annual, triennial, progress

      student: {
        id: assessmentData.studentId,
        name: assessmentData.studentName,
      },

      assessor: {
        name: assessmentData.assessorName,
        title: assessmentData.assessorTitle,
        credentials: assessmentData.assessorCredentials,
      },

      domains: {
        cognitive: this._assessCognitive(assessmentData.cognitiveData),
        academic: this._assessAcademic(assessmentData.academicData),
        adaptive: this._assessAdaptive(assessmentData.adaptiveData),
        social: this._assessSocial(assessmentData.socialData),
        motor: this._assessMotor(assessmentData.motorData),
        communication: this._assessCommunication(assessmentData.communicationData),
      },

      overallScore: 0,
      recommendations: [],
      accommodations: [],
      eligibilityDetermination: null,

      report: {
        summary: '',
        strengths: [],
        needs: [],
        recommendations: [],
      },
    };

    // حساب النتيجة الإجمالية
    assessment.overallScore = this._calculateOverallScore(assessment.domains);

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  _assessCognitive(data) {
    if (!data) return { score: 0, level: 'not_assessed' };

    return {
      iqScore: data.iqScore,
      verbalComprehension: data.verbalComprehension,
      perceptualReasoning: data.perceptualReasoning,
      workingMemory: data.workingMemory,
      processingSpeed: data.processingSpeed,
      score: data.iqScore || 0,
      level: this._determineLevel(data.iqScore, 'cognitive'),
    };
  }

  _assessAcademic(data) {
    if (!data) return { score: 0, level: 'not_assessed' };

    return {
      reading: {
        score: data.readingScore || 0,
        gradeEquivalent: data.readingGrade,
        percentile: data.readingPercentile,
      },
      writing: {
        score: data.writingScore || 0,
        gradeEquivalent: data.writingGrade,
        percentile: data.writingPercentile,
      },
      math: {
        score: data.mathScore || 0,
        gradeEquivalent: data.mathGrade,
        percentile: data.mathPercentile,
      },
      score: Math.round((data.readingScore + data.writingScore + data.mathScore) / 3),
      level: this._determineLevel(data.readingScore, 'academic'),
    };
  }

  _assessAdaptive(data) {
    if (!data) return { score: 0, level: 'not_assessed' };

    return {
      conceptual: data.conceptual,
      social: data.social,
      practical: data.practical,
      composite: data.composite,
      score: data.composite || 0,
      level: this._determineLevel(data.composite, 'adaptive'),
    };
  }

  _assessSocial(data) {
    if (!data) return { score: 0, level: 'not_assessed' };

    return {
      socialSkills: data.socialSkills || 0,
      peerRelations: data.peerRelations || 0,
      selfRegulation: data.selfRegulation || 0,
      score: Math.round((data.socialSkills + data.peerRelations + data.selfRegulation) / 3),
      level: this._determineLevel(data.socialSkills, 'social'),
    };
  }

  _assessMotor(data) {
    if (!data) return { score: 0, level: 'not_assessed' };

    return {
      fineMotor: data.fineMotor || 0,
      grossMotor: data.grossMotor || 0,
      visualMotor: data.visualMotor || 0,
      score: Math.round((data.fineMotor + data.grossMotor + data.visualMotor) / 3),
      level: this._determineLevel(data.fineMotor, 'motor'),
    };
  }

  _assessCommunication(data) {
    if (!data) return { score: 0, level: 'not_assessed' };

    return {
      receptive: data.receptive || 0,
      expressive: data.expressive || 0,
      pragmatic: data.pragmatic || 0,
      score: Math.round((data.receptive + data.expressive + data.pragmatic) / 3),
      level: this._determineLevel(data.receptive, 'communication'),
    };
  }

  _determineLevel(score, domain) {
    if (!score) return 'not_assessed';

    const thresholds = {
      cognitive: {
        severe: 40,
        moderate: 55,
        mild: 70,
        below_average: 85,
        average: 115,
        above_average: 130,
      },
      academic: {
        severe: 25,
        moderate: 40,
        mild: 55,
        below_average: 70,
        average: 85,
        above_average: 95,
      },
      default: {
        severe: 25,
        moderate: 40,
        mild: 55,
        below_average: 70,
        average: 85,
        above_average: 95,
      },
    };

    const t = thresholds[domain] || thresholds.default;

    if (score < t.severe) return 'severe';
    if (score < t.moderate) return 'moderate';
    if (score < t.mild) return 'mild';
    if (score < t.below_average) return 'below_average';
    if (score < t.average) return 'average';
    return 'above_average';
  }

  _calculateOverallScore(domains) {
    const scores = Object.values(domains)
      .map(d => d.score)
      .filter(s => s > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // ==========================================
  // الفصول الدراسية
  // ==========================================
  async createClassroom(classroomData) {
    const classroom = {
      id: Date.now().toString(),
      createdAt: new Date(),
      status: 'active',

      name: classroomData.name,
      type: classroomData.type, // self_contained, resource_room, inclusion
      program: classroomData.programId,
      gradeLevel: classroomData.gradeLevel,

      capacity: {
        max: classroomData.maxCapacity,
        current: 0,
        available: classroomData.maxCapacity,
      },

      schedule: {
        startTime: classroomData.startTime,
        endTime: classroomData.endTime,
        days: classroomData.days || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      },

      staff: {
        leadTeacher: classroomData.leadTeacher,
        assistantTeachers: classroomData.assistantTeachers || [],
        specialists: classroomData.specialists || [],
      },

      students: [],
      resources: classroomData.resources || [],
      modifications: classroomData.modifications || [],
    };

    this.classrooms.set(classroom.id, classroom);
    return classroom;
  }

  async assignStudentToClassroom(classroomId, studentId) {
    const classroom = this.classrooms.get(classroomId);
    const student = this.students.get(studentId);

    if (!classroom || !student) throw new Error('Classroom or Student not found');
    if (classroom.capacity.current >= classroom.capacity.max) {
      throw new Error('Classroom is at full capacity');
    }

    classroom.students.push(studentId);
    classroom.capacity.current++;
    classroom.capacity.available--;

    student.education.classroom = classroomId;

    return classroom;
  }

  // ==========================================
  // الموارد التعليمية
  // ==========================================
  async createResource(resourceData) {
    const resource = {
      id: Date.now().toString(),
      createdAt: new Date(),

      title: resourceData.title,
      type: resourceData.type, // book, software, equipment, material, digital
      category: resourceData.category, // academic, sensory, motor, communication, behavior

      description: resourceData.description,
      targetDisabilities: resourceData.targetDisabilities || [],
      ageRange: resourceData.ageRange,

      quantity: {
        total: resourceData.totalQuantity,
        available: resourceData.totalQuantity,
        borrowed: 0,
      },

      location: resourceData.location,
      condition: 'new', // new, good, fair, needs_repair, damaged

      usage: {
        timesBorrowed: 0,
        lastBorrowed: null,
      },

      notes: [],
    };

    this.resources.set(resource.id, resource);
    return resource;
  }

  async borrowResource(resourceId, borrowerData) {
    const resource = this.resources.get(resourceId);
    if (!resource) throw new Error('Resource not found');
    if (resource.quantity.available < 1) throw new Error('Resource not available');

    resource.quantity.available--;
    resource.quantity.borrowed++;
    resource.usage.timesBorrowed++;
    resource.usage.lastBorrowed = new Date();

    resource.notes.push({
      date: new Date(),
      action: 'borrowed',
      borrower: borrowerData.borrowerName,
      borrowerType: borrowerData.borrowerType, // teacher, student, parent
      dueDate: borrowerData.dueDate,
      returned: false,
    });

    return resource;
  }

  // ==========================================
  // تقارير التربية الخاصة
  // ==========================================
  async generateSpecialEducationReport(reportType = 'comprehensive') {
    const students = Array.from(this.students.values());
    const ieps = Array.from(this.ieps.values());
    const assessments = Array.from(this.assessments.values());
    const classrooms = Array.from(this.classrooms.values());

    return {
      generatedAt: new Date(),
      type: reportType,

      enrollment: {
        total: students.length,
        active: students.filter(s => s.status === 'active').length,
        byDisability: this._groupStudentsByDisability(students),
        byGradeLevel: this._groupStudentsByGrade(students),
        byProgram: this._groupStudentsByProgram(students),
      },

      ieps: {
        total: ieps.length,
        active: ieps.filter(i => i.status === 'active').length,
        pendingReview: ieps.filter(i => new Date(i.timeline.annualReviewDate) <= new Date()).length,
        goalsProgress: this._calculateAverageGoalsProgress(ieps),
      },

      classrooms: {
        total: classrooms.length,
        totalCapacity: classrooms.reduce((sum, c) => sum + c.capacity.max, 0),
        currentEnrollment: classrooms.reduce((sum, c) => sum + c.capacity.current, 0),
        occupancyRate: this._calculateOccupancyRate(classrooms),
      },

      assessments: {
        total: assessments.length,
        byType: this._groupAssessmentsByType(assessments),
        averageScores: this._calculateAverageAssessmentScores(assessments),
      },

      recommendations: [
        'زيادة عدد الفصول المتخصصة',
        'توفير المزيد من الموارد التعليمية',
        'تعزيز برامج دمج الطلاب',
        'تطوير برامج تدريب المعلمين',
      ],
    };
  }

  _groupStudentsByDisability(students) {
    const groups = {};
    students.forEach(s => {
      groups[s.disability.type] = (groups[s.disability.type] || 0) + 1;
    });
    return groups;
  }

  _groupStudentsByGrade(students) {
    const groups = {};
    students.forEach(s => {
      const grade = s.education.currentGrade || 'unassigned';
      groups[grade] = (groups[grade] || 0) + 1;
    });
    return groups;
  }

  _groupStudentsByProgram(students) {
    const groups = {};
    students.forEach(s => {
      const program = s.education.assignedProgram || 'unassigned';
      groups[program] = (groups[program] || 0) + 1;
    });
    return groups;
  }

  _calculateAverageGoalsProgress(ieps) {
    const activeIeps = ieps.filter(i => i.status === 'active');
    if (activeIeps.length === 0) return 0;

    let totalGoals = 0;
    let totalProgress = 0;

    activeIeps.forEach(iep => {
      iep.goals.annual.forEach(goal => {
        totalGoals++;
        totalProgress += goal.progress.percentage;
      });
    });

    return totalGoals > 0 ? Math.round(totalProgress / totalGoals) : 0;
  }

  _calculateOccupancyRate(classrooms) {
    const totalCapacity = classrooms.reduce((sum, c) => sum + c.capacity.max, 0);
    const currentEnrollment = classrooms.reduce((sum, c) => sum + c.capacity.current, 0);
    return totalCapacity > 0 ? Math.round((currentEnrollment / totalCapacity) * 100) : 0;
  }

  _groupAssessmentsByType(assessments) {
    const groups = {};
    assessments.forEach(a => {
      groups[a.type] = (groups[a.type] || 0) + 1;
    });
    return groups;
  }

  _calculateAverageAssessmentScores(assessments) {
    if (assessments.length === 0) return {};

    const domains = ['cognitive', 'academic', 'adaptive', 'social', 'motor', 'communication'];
    const averages = {};

    domains.forEach(domain => {
      const scores = assessments.map(a => a.domains[domain]?.score).filter(s => s > 0);
      if (scores.length > 0) {
        averages[domain] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
    });

    return averages;
  }
}

module.exports = { AdvancedSpecialEducationService };
