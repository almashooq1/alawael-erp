/* eslint-disable no-unused-vars */
/**
 * Assistive Technology Service for Disability Rehabilitation
 * خدمة التكنولوجيا المساعدة لتأهيل ذوي الإعاقة
 */

class AssistiveTechnologyService {
  constructor() {
    this.devices = new Map();
    this.allocations = new Map();
    this.training = new Map();
    this.maintenance = new Map();
  }

  /**
   * إضافة جهاز مساعد للكتالوج
   */
  async addDevice(deviceData) {
    const device = {
      id: Date.now().toString(),
      name: deviceData.name,
      nameAr: deviceData.nameAr,
      category: deviceData.category, // mobility, communication, vision, hearing, dailyLiving, computer
      subCategory: deviceData.subCategory,
      description: deviceData.description,
      manufacturer: deviceData.manufacturer,
      model: deviceData.model,
      specifications: deviceData.specifications || {},
      suitableDisabilities: deviceData.suitableDisabilities || [],
      features: deviceData.features || [],
      accessibilityFeatures: deviceData.accessibilityFeatures || [],
      price: deviceData.price,
      fundingOptions: deviceData.fundingOptions || ['government', 'insurance', 'self'],
      availability: 'in_stock',
      stock: deviceData.stock || 0,
      images: deviceData.images || [],
      documents: deviceData.documents || [],
      rating: 0,
      reviews: [],
      createdAt: new Date(),
    };

    this.devices.set(device.id, device);
    return device;
  }

  /**
   * تقييم احتياج المستفيد من التكنولوجيا المساعدة
   */
  async assessNeeds(beneficiaryId, assessmentData) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      assessmentDate: new Date(),
      assessor: assessmentData.assessor,
      currentAbilities: {
        mobility: assessmentData.mobility || { level: 0, challenges: [] },
        vision: assessmentData.vision || { level: 0, challenges: [] },
        hearing: assessmentData.hearing || { level: 0, challenges: [] },
        communication: assessmentData.communication || { level: 0, challenges: [] },
        cognition: assessmentData.cognition || { level: 0, challenges: [] },
        dailyLiving: assessmentData.dailyLiving || { level: 0, challenges: [] },
      },
      environment: {
        home: assessmentData.homeEnvironment || {},
        work: assessmentData.workEnvironment || {},
        community: assessmentData.communityEnvironment || {},
      },
      goals: assessmentData.goals || [],
      recommendedDevices: [],
      priorityLevel: 'moderate',
      notes: assessmentData.notes || '',
    };

    // تحليل وتقديم توصيات
    assessment.recommendedDevices = this._generateRecommendations(assessment);

    return assessment;
  }

  /**
   * توليد توصيات الأجهزة
   */
  _generateRecommendations(assessment) {
    const recommendations = [];
    const devices = Array.from(this.devices.values());

    // توصيات بناءً على التحديات الحركية
    if (assessment.currentAbilities.mobility.level < 50) {
      const mobilityDevices = devices.filter(d => d.category === 'mobility');
      mobilityDevices.forEach(device => {
        recommendations.push({
          deviceId: device.id,
          deviceName: device.name,
          priority: 'high',
          rationale: 'لتحسين الحركة والتنقل',
          expectedBenefit: 'تعزيز الاستقلالية في التنقل',
        });
      });
    }

    // توصيات بناءً على التحديات البصرية
    if (assessment.currentAbilities.vision.level < 50) {
      const visionDevices = devices.filter(d => d.category === 'vision');
      visionDevices.forEach(device => {
        recommendations.push({
          deviceId: device.id,
          deviceName: device.name,
          priority: 'high',
          rationale: 'لدعم الإعاقة البصرية',
          expectedBenefit: 'تحسين القدرة على الوصول للمعلومات',
        });
      });
    }

    return recommendations;
  }

  /**
   * تخصيص جهاز لمستفيد
   */
  async allocateDevice(allocationData) {
    const device = this.devices.get(allocationData.deviceId);
    if (!device) throw new Error('الجهاز غير موجود');

    if (device.stock <= 0) {
      throw new Error('الجهاز غير متوفر حالياً');
    }

    const allocation = {
      id: Date.now().toString(),
      deviceId: allocationData.deviceId,
      deviceName: device.name,
      beneficiaryId: allocationData.beneficiaryId,
      allocationDate: new Date(),
      fundingSource: allocationData.fundingSource, // government, insurance, self, donation
      cost: allocationData.cost || device.price,
      status: 'allocated',
      customization: allocationData.customization || {},
      accessories: allocationData.accessories || [],
      warranty: {
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        provider: device.manufacturer,
        terms: 'ضمان شامل',
      },
      training: {
        required: true,
        completed: false,
        sessions: [],
      },
      followUp: {
        scheduled: true,
        dates: [],
      },
    };

    device.stock--;
    this.allocations.set(allocation.id, allocation);
    return allocation;
  }

  /**
   * إرجاع جهاز
   */
  async returnDevice(allocationId, returnData) {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) throw new Error('التخصيص غير موجود');

    allocation.status = 'returned';
    allocation.returnDetails = {
      date: new Date(),
      reason: returnData.reason,
      condition: returnData.condition,
      notes: returnData.notes,
    };

    const device = this.devices.get(allocation.deviceId);
    if (device && returnData.condition === 'good') {
      device.stock++;
    }

    return allocation;
  }

  /**
   * إنشاء برنامج تدريب على الجهاز
   */
  async createTrainingProgram(allocationId, trainingData) {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) throw new Error('التخصيص غير موجود');

    const program = {
      id: Date.now().toString(),
      allocationId,
      beneficiaryId: allocation.beneficiaryId,
      deviceName: allocation.deviceName,
      trainer: trainingData.trainer,
      startDate: trainingData.startDate || new Date(),
      sessions: [
        {
          id: 1,
          title: 'مقدمة عن الجهاز',
          objectives: ['التعرف على مكونات الجهاز', 'طريقة التشغيل الأساسية'],
          duration: 60,
          completed: false,
        },
        {
          id: 2,
          title: 'الاستخدام الأساسي',
          objectives: ['التدريب على الاستخدام اليومي', 'التعامل مع المواقف الشائعة'],
          duration: 90,
          completed: false,
        },
        {
          id: 3,
          title: 'الاستخدام المتقدم',
          objectives: ['الاستفادة من جميع الميزات', 'التخصيص المتقدم'],
          duration: 90,
          completed: false,
        },
        {
          id: 4,
          title: 'الصيانة والسلامة',
          objectives: ['الصيانة اليومية', 'إجراءات السلامة', 'حل المشاكل البسيطة'],
          duration: 60,
          completed: false,
        },
      ],
      progress: 0,
      status: 'active',
      notes: [],
    };

    this.training.set(program.id, program);
    return program;
  }

  /**
   * تسجيل جلسة تدريب
   */
  async recordTrainingSession(programId, sessionData) {
    const program = this.training.get(programId);
    if (!program) throw new Error('البرنامج غير موجود');

    const session = {
      sessionId: sessionData.sessionId,
      date: sessionData.date || new Date(),
      duration: sessionData.actualDuration,
      objectivesAchieved: sessionData.objectivesAchieved || [],
      beneficiaryUnderstanding: sessionData.understanding, // excellent, good, fair, poor
      difficulties: sessionData.difficulties || [],
      recommendations: sessionData.recommendations || [],
      nextSessionPlan: sessionData.nextSessionPlan,
      completed: true,
    };

    const sessionIndex = program.sessions.findIndex(s => s.id === sessionData.sessionId);
    if (sessionIndex !== -1) {
      program.sessions[sessionIndex] = { ...program.sessions[sessionIndex], ...session };
    }

    // تحديث التقدم
    const completedSessions = program.sessions.filter(s => s.completed).length;
    program.progress = (completedSessions / program.sessions.length) * 100;

    if (program.progress === 100) {
      program.status = 'completed';
    }

    return program;
  }

  /**
   * طلب صيانة
   */
  async requestMaintenance(allocationId, maintenanceData) {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) throw new Error('التخصيص غير موجود');

    const request = {
      id: Date.now().toString(),
      allocationId,
      deviceId: allocation.deviceId,
      deviceName: allocation.deviceName,
      beneficiaryId: allocation.beneficiaryId,
      requestDate: new Date(),
      type: maintenanceData.type, // routine, repair, emergency, upgrade
      priority: maintenanceData.priority || 'normal', // low, normal, high, urgent
      issue: maintenanceData.issue,
      description: maintenanceData.description,
      status: 'requested',
      assignedTo: null,
      estimatedCompletion: null,
      actualCost: 0,
      notes: [],
      timeline: [
        {
          status: 'requested',
          date: new Date(),
          note: 'تم استلام طلب الصيانة',
        },
      ],
    };

    this.maintenance.set(request.id, request);
    return request;
  }

  /**
   * تحديث حالة الصيانة
   */
  async updateMaintenanceStatus(maintenanceId, statusData) {
    const request = this.maintenance.get(maintenanceId);
    if (!request) throw new Error('طلب الصيانة غير موجود');

    request.status = statusData.status;
    request.timeline.push({
      status: statusData.status,
      date: new Date(),
      note: statusData.note,
    });

    if (statusData.assignedTo) {
      request.assignedTo = statusData.assignedTo;
    }

    if (statusData.estimatedCompletion) {
      request.estimatedCompletion = statusData.estimatedCompletion;
    }

    if (statusData.actualCost) {
      request.actualCost = statusData.actualCost;
    }

    return request;
  }

  /**
   * البحث عن أجهزة
   */
  async searchDevices(criteria) {
    const devices = Array.from(this.devices.values());

    return devices.filter(device => {
      if (criteria.category && device.category !== criteria.category) return false;
      if (criteria.disabilityType && !device.suitableDisabilities.includes(criteria.disabilityType))
        return false;
      if (criteria.maxPrice && device.price > criteria.maxPrice) return false;
      if (criteria.searchTerm) {
        const term = criteria.searchTerm.toLowerCase();
        if (
          !device.name.toLowerCase().includes(term) &&
          !device.nameAr?.includes(term) &&
          !device.description?.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * تقرير استخدام التكنولوجيا المساعدة
   */
  async generateUsageReport(period = 'monthly') {
    const allocations = Array.from(this.allocations.values());
    const trainings = Array.from(this.training.values());
    const maintenances = Array.from(this.maintenance.values());

    const report = {
      period,
      generatedAt: new Date(),
      summary: {
        totalAllocations: allocations.length,
        activeAllocations: allocations.filter(a => a.status === 'allocated').length,
        returnedDevices: allocations.filter(a => a.status === 'returned').length,
        trainingPrograms: trainings.length,
        completedTrainings: trainings.filter(t => t.status === 'completed').length,
        maintenanceRequests: maintenances.length,
        pendingMaintenance: maintenances.filter(m => m.status === 'requested').length,
      },
      categoryBreakdown: {},
      fundingBreakdown: {},
      maintenanceStats: {
        routine: maintenances.filter(m => m.type === 'routine').length,
        repair: maintenances.filter(m => m.type === 'repair').length,
        emergency: maintenances.filter(m => m.type === 'emergency').length,
      },
      recommendations: [],
    };

    // تحليل الفئات
    const categories = [
      'mobility',
      'vision',
      'hearing',
      'communication',
      'dailyLiving',
      'computer',
    ];
    categories.forEach(cat => {
      report.categoryBreakdown[cat] = allocations.filter(a => {
        const device = this.devices.get(a.deviceId);
        return device && device.category === cat;
      }).length;
    });

    // تحليل مصادر التمويل
    const fundingSources = ['government', 'insurance', 'self', 'donation'];
    fundingSources.forEach(source => {
      report.fundingBreakdown[source] = allocations.filter(a => a.fundingSource === source).length;
    });

    return report;
  }
}

module.exports = { AssistiveTechnologyService };
