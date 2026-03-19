/* eslint-disable no-unused-vars */
/**
 * Comprehensive Student Management Service
 * خدمة إدارة الطلاب الشاملة والمتكاملة لمراكز التأهيل
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * Student Configuration
 */
const studentConfig = {
  // حالات الطالب
  studentStatuses: {
    active: { label: 'نشط', color: 'green' },
    inactive: { label: 'غير نشط', color: 'gray' },
    suspended: { label: 'موقوف', color: 'yellow' },
    graduated: { label: 'تخرج', color: 'blue' },
    transferred: { label: 'منقول', color: 'purple' },
    waiting: { label: 'قائمة انتظار', color: 'orange' },
  },

  // أنواع الإعاقة
  disabilityTypes: {
    physical: {
      label: 'إعاقة حركية',
      code: 'PH',
      subtypes: ['شلل سفلي', 'شلل رباعي', 'بتر', 'ضمور عضلي', 'شلل دماغي'],
    },
    visual: {
      label: 'إعاقة بصرية',
      code: 'VI',
      subtypes: ['كفيف', 'ضعف بصر شديد', 'ضعف بصر متوسط'],
    },
    hearing: {
      label: 'إعاقة سمعية',
      code: 'HI',
      subtypes: ['صمم كامل', 'ضعف سمع شديد', 'ضعف سمع متوسط'],
    },
    intellectual: {
      label: 'إعاقة ذهنية',
      code: 'ID',
      subtypes: ['بسيطة', 'متوسطة', 'شديدة', 'شديدة جداً'],
    },
    autism: {
      label: 'اضطراب طيف التوحد',
      code: 'ASD',
      subtypes: ['مستوى 1', 'مستوى 2', 'مستوى 3'],
    },
    learning: {
      label: 'صعوبات تعلم',
      code: 'LD',
      subtypes: ['ديسليكسيا', 'ديسكالكوليا', 'ديسجرافيا', 'ADHD'],
    },
    speech: {
      label: 'اضطرابات نطق ولغة',
      code: 'SL',
      subtypes: ['تأخر لغوي', 'لثغة', 'تلعثم', 'حبسة'],
    },
    multiple: {
      label: 'إعاقات متعددة',
      code: 'MD',
      subtypes: ['متعددة'],
    },
  },

  // مستوى شدة الإعاقة
  severityLevels: {
    mild: { label: 'بسيط', percentage: 25 },
    moderate: { label: 'متوسط', percentage: 50 },
    severe: { label: 'شديد', percentage: 75 },
    profound: { label: 'شديد جداً', percentage: 100 },
  },

  // البرامج التأهيلية
  programs: {
    physical_therapy: { label: 'علاج طبيعي', code: 'PT' },
    occupational_therapy: { label: 'علاج وظيفي', code: 'OT' },
    speech_therapy: { label: 'علاج نطق', code: 'ST' },
    behavioral_therapy: { label: 'علاج سلوكي', code: 'BT' },
    special_education: { label: 'تربية خاصة', code: 'SE' },
    vocational_training: { label: 'تأهيل مهني', code: 'VT' },
    social_skills: { label: 'مهارات اجتماعية', code: 'SS' },
    daily_living: { label: 'مهارات حياتية', code: 'DL' },
    cognitive_training: { label: 'تدريب معرفي', code: 'CT' },
    sensory_integration: { label: 'تكامل حسي', code: 'SI' },
  },

  // أيام الأسبوع
  weekDays: {
    sun: { label: 'الأحد', index: 0 },
    mon: { label: 'الاثنين', index: 1 },
    tue: { label: 'الثلاثاء', index: 2 },
    wed: { label: 'الأربعاء', index: 3 },
    thu: { label: 'الخميس', index: 4 },
  },

  // فترات الدوام
  shifts: {
    morning: { label: 'صباحية', start: '07:00', end: '12:00' },
    evening: { label: 'مسائية', start: '13:00', end: '18:00' },
    full: { label: 'يوم كامل', start: '07:00', end: '18:00' },
  },
};

/**
 * Student Schema - الطالب
 */
const StudentSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    studentId: { type: String, unique: true },
    enrollmentNumber: String,
    barcode: String,

    // البيانات الشخصية
    personal: {
      firstNameAr: { type: String, required: true },
      lastNameAr: { type: String, required: true },
      firstNameEn: String,
      lastNameEn: String,
      nationalId: { type: String, unique: true, sparse: true },
      dateOfBirth: { type: Date, required: true },
      gender: { type: String, enum: ['male', 'female'], required: true },
      nationality: { type: String, default: 'سعودي' },
      placeOfBirth: String,
      religion: String,
      photo: String,
      bloodType: String,
    },

    // العنوان الوطني
    address: {
      region: String,
      city: String,
      district: String,
      streetName: String,
      buildingNumber: String,
      postalCode: String,
      additionalNumber: String,
      coordinates: { lat: Number, lng: Number },
      googleMapsUrl: String,
    },

    // معلومات الإعاقة
    disability: {
      primaryType: { type: String, enum: Object.keys(studentConfig.disabilityTypes) },
      primarySubtype: String,
      secondaryType: String,
      secondarySubtype: String,
      severity: { type: String, enum: Object.keys(studentConfig.severityLevels) },
      diagnosisDate: Date,
      diagnosisSource: String,
      diagnosisReport: String,
      disabilityPercentage: Number,
      medicalReportNumber: String,
      healthInsuranceNumber: String,
      causes: [String],
      notes: String,
      assistiveDevices: [
        {
          type: String,
          brand: String,
          serialNumber: String,
          providedBy: String,
          providedDate: Date,
        },
      ],
    },

    // المركز والفرع
    center: {
      centerId: String,
      centerName: String,
      branchId: String,
      branchName: String,
      department: String,
      enrollmentDate: Date,
      expectedGraduationDate: Date,
      actualGraduationDate: Date,
    },

    // البرامج والخدمات
    programs: [
      {
        programId: String,
        programName: String,
        programType: { type: String, enum: Object.keys(studentConfig.programs) },
        startDate: Date,
        endDate: Date,
        frequency: { type: String, enum: ['daily', 'twice_weekly', 'weekly', 'biweekly'] },
        sessionsPerWeek: Number,
        sessionDuration: Number, // minutes
        therapist: {
          therapistId: String,
          name: String,
          specialization: String,
        },
        status: { type: String, enum: ['active', 'completed', 'paused', 'cancelled'] },
        goals: [String],
        progress: { type: Number, default: 0 },
      },
    ],

    // الجدول الدراسي
    schedule: {
      shift: { type: String, enum: Object.keys(studentConfig.shifts) },
      days: [{ type: String, enum: Object.keys(studentConfig.weekDays) }],
      startTime: String,
      endTime: String,
      room: String,
      group: String,
    },

    // النقل
    transport: {
      required: { type: Boolean, default: false },
      vehicleId: String,
      routeId: String,
      pickupPoint: String,
      pickupTime: String,
      dropoffTime: String,
      distance: Number,
    },

    // ولي الأمر
    guardian: {
      father: {
        name: String,
        nationalId: String,
        dateOfBirth: Date,
        occupation: String,
        workplace: String,
        mobile: String,
        workPhone: String,
        email: String,
        education: String,
        photo: String,
      },
      mother: {
        name: String,
        nationalId: String,
        dateOfBirth: Date,
        occupation: String,
        workplace: String,
        mobile: String,
        email: String,
        education: String,
        photo: String,
      },
      emergencyContact: {
        name: String,
        relation: String,
        mobile: String,
        alternativeMobile: String,
      },
      authorizedPickup: [
        {
          name: String,
          relation: String,
          nationalId: String,
          mobile: String,
          photo: String,
          authorized: { type: Boolean, default: true },
        },
      ],
    },

    // التاريخ الطبي
    medicalHistory: {
      allergies: [
        {
          type: { type: String, enum: ['food', 'medication', 'environmental'] },
          name: String,
          severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
          reaction: String,
        },
      ],
      medications: [
        {
          name: String,
          dosage: String,
          frequency: String,
          prescribedBy: String,
          startDate: Date,
          endDate: Date,
          active: Boolean,
        },
      ],
      chronicConditions: [String],
      surgeries: [
        {
          name: String,
          date: Date,
          hospital: String,
          notes: String,
        },
      ],
      hospitalizations: [
        {
          reason: String,
          date: Date,
          duration: Number,
          hospital: String,
        },
      ],
      immunizations: [
        {
          vaccine: String,
          date: Date,
          nextDue: Date,
        },
      ],
      vision: {
        leftEye: String,
        rightEye: String,
        glasses: Boolean,
        lastCheckup: Date,
      },
      hearing: {
        leftEar: String,
        rightEar: String,
        hearingAid: Boolean,
        lastCheckup: Date,
      },
    },

    // التقييمات
    assessments: [
      {
        assessmentId: String,
        type: { type: String, enum: ['initial', 'periodic', 'final', 'special'] },
        date: Date,
        assessor: {
          id: String,
          name: String,
          specialization: String,
        },
        areas: [
          {
            domain: String,
            score: Number,
            maxScore: Number,
            level: String,
            notes: String,
          },
        ],
        recommendations: [String],
        nextAssessmentDate: Date,
        reportFile: String,
      },
    ],

    // خطة التدخل الفردي (IEP)
    iep: {
      iepId: String,
      startDate: Date,
      endDate: Date,
      status: { type: String, enum: ['draft', 'active', 'review', 'completed'] },
      team: [
        {
          memberId: String,
          name: String,
          role: String,
        },
      ],
      longTermGoals: [
        {
          goalId: String,
          description: String,
          targetDate: Date,
          status: { type: String, enum: ['not_started', 'in_progress', 'achieved', 'modified'] },
          progress: Number,
        },
      ],
      shortTermGoals: [
        {
          goalId: String,
          longTermGoalId: String,
          description: String,
          targetDate: Date,
          status: String,
          progress: Number,
          strategies: [String],
        },
      ],
      accommodations: [String],
      modifications: [String],
      reviewDates: [Date],
      parentConsent: { type: Boolean, default: false },
      consentDate: Date,
    },

    // الحضور
    attendance: {
      todayStatus: { type: String, enum: ['present', 'absent', 'late', 'excused', 'noshow'] },
      statistics: {
        totalDays: { type: Number, default: 0 },
        present: { type: Number, default: 0 },
        absent: { type: Number, default: 0 },
        late: { type: Number, default: 0 },
        excused: { type: Number, default: 0 },
        attendanceRate: { type: Number, default: 100 },
      },
      lastAttendance: Date,
      streak: { type: Number, default: 0 }, // أيام حضور متتالية
    },

    // التقدم والإنجازات
    progress: {
      overallProgress: { type: Number, default: 0 },
      milestones: [
        {
          milestoneId: String,
          title: String,
          description: String,
          date: Date,
          category: String,
        },
      ],
      skills: [
        {
          skill: String,
          level: { type: String, enum: ['beginner', 'developing', 'proficient', 'advanced'] },
          lastAssessed: Date,
        },
      ],
      behavior: {
        rating: { type: Number, min: 1, max: 5 },
        notes: String,
        incidents: [
          {
            date: Date,
            type: String,
            description: String,
            action: String,
          },
        ],
      },
    },

    // الوثائق
    documents: [
      {
        documentId: String,
        type: {
          type: String,
          enum: ['medical_report', 'assessment', 'iep', 'certificate', 'photo', 'consent', 'other'],
        },
        name: String,
        description: String,
        fileUrl: String,
        uploadDate: Date,
        uploadedBy: String,
        expiryDate: Date,
      },
    ],

    // الملاحظات
    notes: [
      {
        noteId: String,
        date: Date,
        author: { id: String, name: String, role: String },
        category: String,
        content: String,
        isPrivate: { type: Boolean, default: false },
        attachments: [String],
      },
    ],

    // السلوك والمكافآت
    behaviorTracking: {
      points: { type: Number, default: 0 },
      badges: [
        {
          badgeId: String,
          name: String,
          description: String,
          earnedDate: Date,
          icon: String,
        },
      ],
      rewards: [
        {
          rewardId: String,
          name: String,
          pointsCost: Number,
          redeemedDate: Date,
        },
      ],
      behaviorLog: [
        {
          date: Date,
          behavior: String,
          points: Number,
          type: { type: String, enum: ['positive', 'negative'] },
          notes: String,
          recordedBy: String,
        },
      ],
    },

    // الاتصالات
    communications: [
      {
        communicationId: String,
        date: Date,
        type: { type: String, enum: ['call', 'meeting', 'message', 'email'] },
        direction: { type: String, enum: ['incoming', 'outgoing'] },
        with: String,
        subject: String,
        summary: String,
        followUp: {
          required: Boolean,
          dueDate: Date,
          completed: Boolean,
        },
      },
    ],

    // الحالة
    status: {
      type: String,
      enum: Object.keys(studentConfig.studentStatuses),
      default: 'active',
    },

    // الإحالات
    referrals: [
      {
        referralId: String,
        fromCenter: String,
        toCenter: String,
        reason: String,
        date: Date,
        status: String,
        notes: String,
      },
    ],

    // التكامل مع نظام النقل
    transportIntegration: {
      routeOptimized: { type: Boolean, default: false },
      lastRouteUpdate: Date,
      pickupOrder: Number,
      distanceFromCenter: Number,
      estimatedPickupTime: String,
      estimatedDropoffTime: String,
    },

    // الذكاء الاصطناعي
    aiInsights: {
      learningStyle: String,
      recommendedPrograms: [String],
      predictedProgress: Number,
      riskFactors: [String],
      suggestions: [String],
      lastAnalysis: Date,
    },

    // Tenant
    tenantId: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  },
  {
    collection: 'students',
  }
);

// Indexes
// studentId already has unique:true, personal.nationalId already has unique:true+sparse:true → implicit indexes
StudentSchema.index({ 'center.centerId': 1 });
StudentSchema.index({ 'center.branchId': 1 });
StudentSchema.index({ 'disability.primaryType': 1 });
StudentSchema.index({ status: 1 });
StudentSchema.index({ 'address.coordinates': '2dsphere' });

/**
 * Student Service Class
 */
class StudentService extends EventEmitter {
  constructor() {
    super();
    this.Student = null;
  }

  async initialize(connection) {
    this.Student = connection.model('Student', StudentSchema);
    logger.info('✅ Student Service initialized');
  }

  /**
   * Lazy fallback — if initialize() was never called, register on default connection.
   */
  _getModel() {
    if (!this.Student) {
      try {
        this.Student = mongoose.model('Student');
      } catch (_e) {
        this.Student = mongoose.model('Student', StudentSchema);
      }
      logger.info('Student model created via default mongoose connection (lazy)');
    }
    return this.Student;
  }

  // ============ CRUD Operations ============

  async createStudent(data) {
    const Model = this._getModel();
    const studentId = `STU-${Date.now()}`;
    const enrollmentNumber = await this.generateEnrollmentNumber(data.center?.centerId);
    const barcode = await this.generateBarcode();

    const student = await Model.create({
      ...data,
      studentId,
      enrollmentNumber,
      barcode,
    });

    this.emit('student:created', student);
    return student;
  }

  async generateEnrollmentNumber(centerId) {
    const Model = this._getModel();
    const year = new Date().getFullYear();
    const prefix = centerId || 'GEN';
    const count = await Model.countDocuments(centerId ? { 'center.centerId': centerId } : {});
    return `${prefix}-${year}-${(count + 1).toString().padStart(4, '0')}`;
  }

  async generateBarcode() {
    return `BC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  async getStudent(studentId) {
    return this._getModel().findOne({ studentId });
  }

  async getStudentByNationalId(nationalId) {
    return this._getModel().findOne({ 'personal.nationalId': nationalId });
  }

  async getStudentsByCenter(centerId, options = {}) {
    const filter = { 'center.centerId': centerId };
    if (options.status) filter.status = options.status;
    if (options.disabilityType) filter['disability.primaryType'] = options.disabilityType;

    return this._getModel()
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(options.limit || 100)
      .skip(options.skip || 0);
  }

  async getStudentsByBranch(branchId) {
    return this._getModel().find({ 'center.branchId': branchId, status: 'active' });
  }

  async updateStudent(studentId, updateData) {
    const student = await this._getModel().findOneAndUpdate(
      { studentId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    if (student) this.emit('student:updated', student);
    return student;
  }

  async deleteStudent(studentId) {
    const student = await this._getModel().findOneAndDelete({ studentId });
    if (student) this.emit('student:deleted', student);
    return student;
  }

  // ============ Attendance ============

  async recordAttendance(studentId, status, notes = '') {
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    student.attendance.todayStatus = status;
    student.attendance.lastAttendance = new Date();

    // Update statistics
    student.attendance.statistics.totalDays += 1;
    if (status === 'present') {
      student.attendance.statistics.present += 1;
      student.attendance.streak += 1;
    } else if (status === 'absent') {
      student.attendance.statistics.absent += 1;
      student.attendance.streak = 0;
    } else if (status === 'late') {
      student.attendance.statistics.late += 1;
      student.attendance.statistics.present += 1;
    } else if (status === 'excused') {
      student.attendance.statistics.excused += 1;
    }

    // Calculate attendance rate
    const { totalDays, present, late } = student.attendance.statistics;
    student.attendance.statistics.attendanceRate = Math.round(((present + late) / totalDays) * 100);

    await student.save();
    this.emit('attendance:recorded', { studentId, status });

    return student;
  }

  async bulkAttendance(studentIds, status) {
    const results = [];
    for (const studentId of studentIds) {
      try {
        const student = await this.recordAttendance(studentId, status);
        results.push({ studentId, success: true });
      } catch (error) {
        results.push({ studentId, success: false, error: 'حدث خطأ داخلي' });
      }
    }
    return results;
  }

  // ============ Programs ============

  async enrollProgram(studentId, programData) {
    const programId = `PRG-${Date.now()}`;
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    student.programs.push({ ...programData, programId, status: 'active' });
    await student.save();

    this.emit('program:enrolled', { studentId, programId });
    return student;
  }

  async updateProgramProgress(studentId, programId, progress) {
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    const program = student.programs.find(p => p.programId === programId);
    if (!program) throw new Error('Program not found');

    program.progress = progress;
    if (progress >= 100) program.status = 'completed';

    await student.save();
    return student;
  }

  // ============ Assessments ============

  async addAssessment(studentId, assessmentData) {
    const assessmentId = `ASM-${Date.now()}`;
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    student.assessments.push({ ...assessmentData, assessmentId });
    await student.save();

    this.emit('assessment:added', { studentId, assessmentId });
    return student;
  }

  // ============ IEP ============

  async createIEP(studentId, iepData) {
    const iepId = `IEP-${Date.now()}`;
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    student.iep = { ...iepData, iepId, status: 'draft' };
    await student.save();

    this.emit('iep:created', { studentId, iepId });
    return student;
  }

  async updateIEPGoal(studentId, goalId, progress, status) {
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    // Update short-term goal
    const shortGoal = student.iep.shortTermGoals.find(g => g.goalId === goalId);
    if (shortGoal) {
      shortGoal.progress = progress;
      shortGoal.status = status;
    }

    // Update long-term goal
    const longGoal = student.iep.longTermGoals.find(g => g.goalId === goalId);
    if (longGoal) {
      longGoal.progress = progress;
      longGoal.status = status;
    }

    await student.save();
    return student;
  }

  // ============ Behavior Tracking ============

  async addBehaviorPoints(studentId, points, behavior, type, notes, recordedBy) {
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    student.behaviorTracking.points += points;
    student.behaviorTracking.behaviorLog.push({
      date: new Date(),
      behavior,
      points,
      type,
      notes,
      recordedBy,
    });

    await student.save();
    this.emit('behavior:recorded', { studentId, points, type });

    return student;
  }

  async awardBadge(studentId, badgeData) {
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    const badgeId = `BDG-${Date.now()}`;
    student.behaviorTracking.badges.push({
      ...badgeData,
      badgeId,
      earnedDate: new Date(),
    });

    await student.save();
    this.emit('badge:awarded', { studentId, badgeId });

    return student;
  }

  // ============ Documents ============

  async addDocument(studentId, documentData) {
    const documentId = `DOC-${Date.now()}`;
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    student.documents.push({ ...documentData, documentId, uploadDate: new Date() });
    await student.save();

    return student;
  }

  // ============ Notes ============

  async addNote(studentId, noteData) {
    const noteId = `NOTE-${Date.now()}`;
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    student.notes.push({ ...noteData, noteId, date: new Date() });
    await student.save();

    return student;
  }

  // ============ Communications ============

  async addCommunication(studentId, commData) {
    const communicationId = `COMM-${Date.now()}`;
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    student.communications.push({ ...commData, communicationId, date: new Date() });
    await student.save();

    return student;
  }

  // ============ AI Insights ============

  async generateAIInsights(studentId) {
    const student = await this._getModel().findOne({ studentId });
    if (!student) throw new Error('Student not found');

    // Simple AI logic (can be replaced with actual ML)
    const insights = {
      learningStyle: this.determineLearningStyle(student),
      recommendedPrograms: this.recommendPrograms(student),
      predictedProgress: this.predictProgress(student),
      riskFactors: this.identifyRiskFactors(student),
      suggestions: this.generateSuggestions(student),
      lastAnalysis: new Date(),
    };

    student.aiInsights = insights;
    await student.save();

    return insights;
  }

  determineLearningStyle(student) {
    // Placeholder for ML-based learning style detection
    const styles = ['visual', 'auditory', 'kinesthetic', 'reading'];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  recommendPrograms(student) {
    const recommendations = [];
    const disabilityType = student.disability?.primaryType;

    if (disabilityType === 'physical') {
      recommendations.push('physical_therapy', 'occupational_therapy');
    } else if (disabilityType === 'autism') {
      recommendations.push('behavioral_therapy', 'speech_therapy', 'sensory_integration');
    } else if (disabilityType === 'hearing') {
      recommendations.push('speech_therapy', 'special_education');
    }

    return recommendations;
  }

  predictProgress(student) {
    const currentProgress = student.progress?.overallProgress || 0;
    const attendanceRate = student.attendance?.statistics?.attendanceRate || 100;
    return Math.min(100, currentProgress + (attendanceRate / 100) * 10);
  }

  identifyRiskFactors(student) {
    const risks = [];

    if (student.attendance?.statistics?.attendanceRate < 75) {
      risks.push('low_attendance');
    }
    if (student.progress?.overallProgress < 30) {
      risks.push('slow_progress');
    }
    if (student.behaviorTracking?.behaviorLog.filter(b => b.type === 'negative').length > 5) {
      risks.push('behavioral_concerns');
    }

    return risks;
  }

  generateSuggestions(student) {
    const suggestions = [];

    if (student.attendance?.statistics?.attendanceRate < 75) {
      suggestions.push('مراجعة جدول الحضور مع ولي الأمر');
    }
    if (student.progress?.overallProgress < 50) {
      suggestions.push('تعديل خطة التدخل الفردي');
    }

    return suggestions;
  }

  // ============ Comprehensive Report ============

  /**
   * تقرير شامل للطالب — يجمع كل البيانات في تقرير واحد
   */
  async getComprehensiveReport(studentId) {
    const student = await this._getModel().findOne({ studentId }).lean();
    if (!student) throw new Error('Student not found');

    const personal = student.personal || {};
    const disability = student.disability || {};
    const guardian = student.guardian || {};
    const center = student.center || {};
    const attendance = student.attendance || {};
    const attStats = attendance.statistics || {};
    const progress = student.progress || {};
    const iep = student.iep || {};
    const medicalHistory = student.medicalHistory || {};
    const behaviorTracking = student.behaviorTracking || {};
    const aiInsights = student.aiInsights || {};

    // ─── Programs summary ────
    const programs = Array.isArray(student.programs) ? student.programs : [];
    const activePrograms = programs.filter(p => p.status === 'active');
    const programsSummary = programs.map(p => ({
      programType: p.programType || '—',
      therapist: p.therapist || '—',
      frequency: p.frequency || '—',
      sessionsPerWeek: p.sessionsPerWeek || 0,
      sessionDuration: p.sessionDuration || 0,
      status: p.status || 'unknown',
      progress: p.progress || 0,
      goals: Array.isArray(p.goals) ? p.goals : [],
    }));

    // ─── Assessments summary ────
    const assessments = Array.isArray(student.assessments) ? student.assessments : [];
    const assessmentsSummary = assessments.map(a => ({
      type: a.type || '—',
      date: a.date,
      assessor: a.assessor || '—',
      areas: Array.isArray(a.areas)
        ? a.areas.map(area => ({
            domain: area.domain || '—',
            score: area.score ?? 0,
            maxScore: area.maxScore ?? 100,
            level: area.level || '—',
          }))
        : [],
      recommendations: Array.isArray(a.recommendations) ? a.recommendations : [],
      nextAssessmentDate: a.nextAssessmentDate,
    }));
    const latestAssessment =
      assessments.length > 0
        ? assessments.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
        : null;

    // ─── IEP summary ────
    const longTermGoals = Array.isArray(iep.longTermGoals) ? iep.longTermGoals : [];
    const shortTermGoals = Array.isArray(iep.shortTermGoals) ? iep.shortTermGoals : [];
    const accommodations = Array.isArray(iep.accommodations) ? iep.accommodations : [];
    const totalGoals = longTermGoals.length + shortTermGoals.length;
    const achievedGoals = [...longTermGoals, ...shortTermGoals].filter(
      g => g.status === 'achieved' || g.status === 'completed'
    ).length;

    // ─── Behavior summary ────
    const behaviorLog = Array.isArray(behaviorTracking.behaviorLog)
      ? behaviorTracking.behaviorLog
      : [];
    const positiveBehaviors = behaviorLog.filter(b => b.type === 'positive').length;
    const negativeBehaviors = behaviorLog.filter(b => b.type === 'negative').length;
    const badges = Array.isArray(behaviorTracking.badges) ? behaviorTracking.badges : [];

    // ─── Documents ────
    const documents = Array.isArray(student.documents) ? student.documents : [];

    // ─── Communications ────
    const communications = Array.isArray(student.communications) ? student.communications : [];

    // ─── Notes ────
    const notes = Array.isArray(student.notes) ? student.notes : [];

    // ─── Medical quick summary ────
    const allergies = Array.isArray(medicalHistory.allergies) ? medicalHistory.allergies : [];
    const medications = Array.isArray(medicalHistory.medications) ? medicalHistory.medications : [];
    const chronicConditions = Array.isArray(medicalHistory.chronicConditions)
      ? medicalHistory.chronicConditions
      : [];

    // ─── Skills from progress ────
    const skills = Array.isArray(progress.skills) ? progress.skills : [];
    const milestones = Array.isArray(progress.milestones) ? progress.milestones : [];

    // ─── Risk indicators ────
    const riskSignals = [];
    const attendanceRate = attStats.attendanceRate || 0;
    if (attendanceRate < 75) {
      riskSignals.push({ label: 'مخاطر الحضور', level: 'high', levelLabel: 'مرتفع', score: 80 });
    } else if (attendanceRate < 90) {
      riskSignals.push({ label: 'مخاطر الحضور', level: 'medium', levelLabel: 'متوسط', score: 50 });
    } else {
      riskSignals.push({ label: 'مخاطر الحضور', level: 'low', levelLabel: 'منخفض', score: 15 });
    }

    const overallProgress = progress.overallProgress || 0;
    if (overallProgress < 30) {
      riskSignals.push({ label: 'مخاطر التقدم', level: 'high', levelLabel: 'مرتفع', score: 75 });
    } else if (overallProgress < 60) {
      riskSignals.push({ label: 'مخاطر التقدم', level: 'medium', levelLabel: 'متوسط', score: 45 });
    } else {
      riskSignals.push({ label: 'مخاطر التقدم', level: 'low', levelLabel: 'منخفض', score: 20 });
    }

    if (negativeBehaviors > positiveBehaviors) {
      riskSignals.push({ label: 'مخاطر السلوك', level: 'high', levelLabel: 'مرتفع', score: 70 });
    } else {
      riskSignals.push({ label: 'مخاطر السلوك', level: 'low', levelLabel: 'منخفض', score: 15 });
    }

    // ─── Recommendations ────
    const autoRecommendations = [];
    if (attendanceRate < 85) {
      autoRecommendations.push({
        title: 'تحسين الحضور',
        priority: 'عالية',
        actions: [
          'مراجعة جدول الطالب مع ولي الأمر',
          'تقديم حوافز الحضور المنتظم',
          'التواصل مع الأسرة لمعرفة أسباب الغياب',
        ],
      });
    }
    if (overallProgress < 50) {
      autoRecommendations.push({
        title: 'تعزيز خطة التدخل',
        priority: 'عالية',
        actions: [
          'مراجعة أهداف خطة التدخل الفردي IEP',
          'زيادة عدد الجلسات العلاجية',
          'تعديل الاستراتيجيات العلاجية المستخدمة',
        ],
      });
    }
    if (activePrograms.length === 0 && programs.length > 0) {
      autoRecommendations.push({
        title: 'إعادة تفعيل البرامج العلاجية',
        priority: 'متوسطة',
        actions: [
          'مراجعة حالة البرامج المتوقفة',
          'تقييم الحاجة لبرامج بديلة',
          'التنسيق مع الفريق العلاجي',
        ],
      });
    }

    // ─── Overall risk level ────
    const avgRiskScore =
      riskSignals.reduce((sum, r) => sum + r.score, 0) / (riskSignals.length || 1);
    let riskLevel = 'low';
    let riskLevelLabel = 'منخفض';
    if (avgRiskScore > 60) {
      riskLevel = 'high';
      riskLevelLabel = 'مرتفع';
    } else if (avgRiskScore > 35) {
      riskLevel = 'medium';
      riskLevelLabel = 'متوسط';
    }

    return {
      generatedAt: new Date().toISOString(),
      // ─── Student identity ────
      student: {
        id: student.studentId,
        name: `${personal.firstNameAr || ''} ${personal.lastNameAr || ''}`.trim() || '—',
        nameEn: `${personal.firstNameEn || ''} ${personal.lastNameEn || ''}`.trim() || '',
        studentId: student.studentId,
        nationalId: personal.nationalId || '—',
        dateOfBirth: personal.dateOfBirth,
        gender: personal.gender || '—',
        bloodType: personal.bloodType || '—',
        photo: personal.photo || null,
        status: student.status || 'active',
        enrollmentDate: center.enrollmentDate,
        centerName: center.centerName || '—',
      },
      // ─── Disability details ────
      disability: {
        primaryType: disability.primaryType || '—',
        primarySubtype: disability.primarySubtype || '',
        secondaryType: disability.secondaryType || '',
        severity: disability.severity || '—',
        diagnosisDate: disability.diagnosisDate,
        diagnosisSource: disability.diagnosisSource || '',
        disabilityPercentage: disability.disabilityPercentage || 0,
        medicalReportNumber: disability.medicalReportNumber || '',
        causes: disability.causes || '',
        assistiveDevices: Array.isArray(disability.assistiveDevices)
          ? disability.assistiveDevices
          : [],
      },
      // ─── Guardian info ────
      guardian: {
        father: guardian.father || {},
        mother: guardian.mother || {},
        emergencyContact: guardian.emergencyContact || {},
      },
      // ─── Summary cards ────
      summary: {
        attendanceRate,
        overallProgress,
        behaviorScore: behaviorTracking.points || 0,
        totalPrograms: programs.length,
        activePrograms: activePrograms.length,
        totalAssessments: assessments.length,
        totalGoals,
        achievedGoals,
        riskLevel,
        riskLevelLabel,
      },
      // ─── Programs ────
      programs: programsSummary,
      // ─── Assessments ────
      assessments: assessmentsSummary,
      latestAssessment: latestAssessment
        ? {
            type: latestAssessment.type,
            date: latestAssessment.date,
            areas: Array.isArray(latestAssessment.areas) ? latestAssessment.areas : [],
          }
        : null,
      // ─── IEP ────
      iep: {
        longTermGoals,
        shortTermGoals,
        accommodations,
        modifications: Array.isArray(iep.modifications) ? iep.modifications : [],
        reviewDates: Array.isArray(iep.reviewDates) ? iep.reviewDates : [],
        parentConsent: iep.parentConsent ?? false,
        totalGoals,
        achievedGoals,
        goalProgress: totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0,
      },
      // ─── Attendance ────
      attendance: {
        todayStatus: attendance.todayStatus || '—',
        statistics: attStats,
        streak: attendance.streak || 0,
      },
      // ─── Behavior ────
      behavior: {
        points: behaviorTracking.points || 0,
        badges,
        positiveBehaviors,
        negativeBehaviors,
        recentLog: behaviorLog.slice(-10).reverse(),
      },
      // ─── Medical ────
      medical: {
        allergies,
        medications,
        chronicConditions,
        vision: medicalHistory.vision || {},
        hearing: medicalHistory.hearing || {},
      },
      // ─── Progress & Skills ────
      progress: {
        overallProgress,
        skills: skills.map(s => ({ skill: s.skill || '—', level: s.level || 0 })),
        milestones,
      },
      // ─── Risk signals ────
      riskSignals,
      // ─── Recommendations ────
      recommendations: autoRecommendations,
      // ─── AI Insights ────
      aiInsights: {
        learningStyle: aiInsights.learningStyle || null,
        recommendedPrograms: Array.isArray(aiInsights.recommendedPrograms)
          ? aiInsights.recommendedPrograms
          : [],
        predictedProgress: aiInsights.predictedProgress ?? null,
        riskFactors: Array.isArray(aiInsights.riskFactors) ? aiInsights.riskFactors : [],
        suggestions: Array.isArray(aiInsights.suggestions) ? aiInsights.suggestions : [],
        lastAnalysis: aiInsights.lastAnalysis || null,
      },
      // ─── Documents ────
      documents: documents.map(d => ({
        type: d.type || '—',
        name: d.name || '—',
        uploadDate: d.uploadDate,
        expiryDate: d.expiryDate,
      })),
      // ─── Communications ────
      recentCommunications: communications
        .slice(-5)
        .reverse()
        .map(c => ({
          type: c.type || '—',
          direction: c.direction || '—',
          subject: c.subject || '—',
          summary: c.summary || '',
          date: c.date || c.createdAt,
        })),
      // ─── Notes ────
      recentNotes: notes
        .filter(n => !n.isPrivate)
        .slice(-5)
        .reverse()
        .map(n => ({
          category: n.category || 'عام',
          content: n.content || '',
          author: n.author?.name || '—',
          date: n.createdAt,
        })),
    };
  }

  // ============ Statistics ============

  async getStatistics(centerId) {
    const [total, byStatus, byDisability, byGender] = await Promise.all([
      this._getModel().countDocuments({ 'center.centerId': centerId }),
      this._getModel().aggregate([
        { $match: { 'center.centerId': centerId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this._getModel().aggregate([
        { $match: { 'center.centerId': centerId } },
        { $group: { _id: '$disability.primaryType', count: { $sum: 1 } } },
      ]),
      this._getModel().aggregate([
        { $match: { 'center.centerId': centerId } },
        { $group: { _id: '$personal.gender', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      byDisability: byDisability.reduce((acc, d) => ({ ...acc, [d._id]: d.count }), {}),
      byGender: byGender.reduce((acc, g) => ({ ...acc, [g._id]: g.count }), {}),
    };
  }

  async getAttendanceReport(centerId, startDate, endDate) {
    return this._getModel().aggregate([
      { $match: { 'center.centerId': centerId } },
      {
        $project: {
          studentId: 1,
          'personal.firstNameAr': 1,
          'personal.lastNameAr': 1,
          attendance: 1,
        },
      },
    ]);
  }

  async getProgressReport(centerId) {
    return this._getModel().aggregate([
      { $match: { 'center.centerId': centerId, status: 'active' } },
      {
        $project: {
          studentId: 1,
          'personal.firstNameAr': 1,
          'personal.lastNameAr': 1,
          'progress.overallProgress': 1,
          'iep.status': 1,
          programs: 1,
        },
      },
      { $sort: { 'progress.overallProgress': -1 } },
    ]);
  }

  // ============ Periodic Report (Center-Level) ============

  /**
   * تقرير دوري على مستوى المركز — يعرض ملخص شامل لفترة زمنية محددة
   */
  async getPeriodicReport(centerId, options = {}) {
    const { period = 'monthly', startDate, endDate } = options;
    const Model = this._getModel();

    const filter = { 'center.centerId': centerId, status: 'active' };
    const students = await Model.find(filter).lean();

    const totalStudents = students.length;
    if (totalStudents === 0) {
      return {
        generatedAt: new Date().toISOString(),
        period,
        centerId,
        totalStudents: 0,
        message: 'لا يوجد طلاب نشطون في هذا المركز',
      };
    }

    // ─── Attendance Summary ────
    const attendanceSummary = {
      averageRate: 0,
      highAttendance: 0,
      lowAttendance: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      distribution: { excellent: 0, good: 0, average: 0, poor: 0 },
    };
    let totalRate = 0;
    students.forEach(s => {
      const rate = s.attendance?.statistics?.attendanceRate || 0;
      totalRate += rate;
      attendanceSummary.totalPresent += s.attendance?.statistics?.present || 0;
      attendanceSummary.totalAbsent += s.attendance?.statistics?.absent || 0;
      attendanceSummary.totalLate += s.attendance?.statistics?.late || 0;
      if (rate >= 95) attendanceSummary.distribution.excellent++;
      else if (rate >= 85) attendanceSummary.distribution.good++;
      else if (rate >= 70) attendanceSummary.distribution.average++;
      else attendanceSummary.distribution.poor++;
      if (rate >= 90) attendanceSummary.highAttendance++;
      if (rate < 75) attendanceSummary.lowAttendance++;
    });
    attendanceSummary.averageRate = Math.round(totalRate / totalStudents);

    // ─── Programs Summary ────
    const programStats = {};
    let totalActivePrograms = 0;
    let totalCompletedPrograms = 0;
    let totalProgramProgress = 0;
    let programCount = 0;
    students.forEach(s => {
      (s.programs || []).forEach(p => {
        const type = p.programType || 'unknown';
        if (!programStats[type]) {
          programStats[type] = {
            enrolled: 0,
            active: 0,
            completed: 0,
            avgProgress: 0,
            totalProgress: 0,
          };
        }
        programStats[type].enrolled++;
        if (p.status === 'active') {
          programStats[type].active++;
          totalActivePrograms++;
        }
        if (p.status === 'completed') {
          programStats[type].completed++;
          totalCompletedPrograms++;
        }
        programStats[type].totalProgress += p.progress || 0;
        totalProgramProgress += p.progress || 0;
        programCount++;
      });
    });
    Object.values(programStats).forEach(ps => {
      ps.avgProgress = ps.enrolled > 0 ? Math.round(ps.totalProgress / ps.enrolled) : 0;
      delete ps.totalProgress;
    });

    // ─── Disability Distribution ────
    const disabilityDistribution = {};
    const severityDistribution = {};
    students.forEach(s => {
      const type = s.disability?.primaryType || 'غير محدد';
      const severity = s.disability?.severity || 'غير محدد';
      disabilityDistribution[type] = (disabilityDistribution[type] || 0) + 1;
      severityDistribution[severity] = (severityDistribution[severity] || 0) + 1;
    });

    // ─── Progress Summary ────
    let totalProgress = 0;
    const progressDistribution = { excellent: 0, good: 0, average: 0, poor: 0 };
    students.forEach(s => {
      const progress = s.progress?.overallProgress || 0;
      totalProgress += progress;
      if (progress >= 80) progressDistribution.excellent++;
      else if (progress >= 60) progressDistribution.good++;
      else if (progress >= 40) progressDistribution.average++;
      else progressDistribution.poor++;
    });

    // ─── IEP Summary ────
    let totalGoals = 0;
    let achievedGoals = 0;
    let studentsWithIEP = 0;
    students.forEach(s => {
      const iep = s.iep || {};
      const ltg = Array.isArray(iep.longTermGoals) ? iep.longTermGoals : [];
      const stg = Array.isArray(iep.shortTermGoals) ? iep.shortTermGoals : [];
      const allGoals = [...ltg, ...stg];
      if (allGoals.length > 0) studentsWithIEP++;
      totalGoals += allGoals.length;
      achievedGoals += allGoals.filter(
        g => g.status === 'achieved' || g.status === 'completed'
      ).length;
    });

    // ─── Behavior Summary ────
    let totalBehaviorPoints = 0;
    let totalPositive = 0;
    let totalNegative = 0;
    students.forEach(s => {
      const bt = s.behaviorTracking || {};
      totalBehaviorPoints += bt.points || 0;
      const log = Array.isArray(bt.behaviorLog) ? bt.behaviorLog : [];
      totalPositive += log.filter(b => b.type === 'positive').length;
      totalNegative += log.filter(b => b.type === 'negative').length;
    });

    // ─── Risk Overview ────
    let highRisk = 0;
    let mediumRisk = 0;
    let lowRisk = 0;
    students.forEach(s => {
      const attRate = s.attendance?.statistics?.attendanceRate || 0;
      const prog = s.progress?.overallProgress || 0;
      const avgScore = (100 - attRate + (100 - prog)) / 2;
      if (avgScore > 50) highRisk++;
      else if (avgScore > 25) mediumRisk++;
      else lowRisk++;
    });

    // ─── Top/Bottom performers ────
    const sorted = [...students].sort(
      (a, b) => (b.progress?.overallProgress || 0) - (a.progress?.overallProgress || 0)
    );
    const topPerformers = sorted.slice(0, 5).map(s => ({
      studentId: s.studentId,
      name: `${s.personal?.firstNameAr || ''} ${s.personal?.lastNameAr || ''}`.trim(),
      progress: s.progress?.overallProgress || 0,
      attendanceRate: s.attendance?.statistics?.attendanceRate || 0,
    }));
    const needsAttention = sorted
      .slice(-5)
      .reverse()
      .map(s => ({
        studentId: s.studentId,
        name: `${s.personal?.firstNameAr || ''} ${s.personal?.lastNameAr || ''}`.trim(),
        progress: s.progress?.overallProgress || 0,
        attendanceRate: s.attendance?.statistics?.attendanceRate || 0,
        reasons: [
          ...(s.attendance?.statistics?.attendanceRate < 75 ? ['حضور منخفض'] : []),
          ...(s.progress?.overallProgress < 30 ? ['تقدم بطيء'] : []),
        ],
      }));

    return {
      generatedAt: new Date().toISOString(),
      period,
      centerId,
      dateRange: { startDate, endDate },
      totalStudents,
      attendance: attendanceSummary,
      programs: {
        byType: programStats,
        totalActive: totalActivePrograms,
        totalCompleted: totalCompletedPrograms,
        averageProgress: programCount > 0 ? Math.round(totalProgramProgress / programCount) : 0,
      },
      disability: {
        byType: disabilityDistribution,
        bySeverity: severityDistribution,
      },
      progress: {
        averageProgress: Math.round(totalProgress / totalStudents),
        distribution: progressDistribution,
      },
      iep: {
        studentsWithIEP,
        totalGoals,
        achievedGoals,
        achievementRate: totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0,
      },
      behavior: {
        totalPoints: totalBehaviorPoints,
        averagePoints: Math.round(totalBehaviorPoints / totalStudents),
        positiveEvents: totalPositive,
        negativeEvents: totalNegative,
        positiveRatio:
          totalPositive + totalNegative > 0
            ? Math.round((totalPositive / (totalPositive + totalNegative)) * 100)
            : 0,
      },
      risk: { high: highRisk, medium: mediumRisk, low: lowRisk },
      topPerformers,
      needsAttention,
    };
  }

  // ============ Student Comparison Report ============

  /**
   * تقرير مقارنة بين طلاب — يقارن بيانات مجموعة من الطلاب
   */
  async getStudentComparisonReport(studentIds) {
    if (!Array.isArray(studentIds) || studentIds.length < 2) {
      throw new Error('يجب تحديد طالبين على الأقل للمقارنة');
    }
    if (studentIds.length > 10) {
      throw new Error('لا يمكن مقارنة أكثر من 10 طلاب');
    }

    const Model = this._getModel();
    const students = await Model.find({ studentId: { $in: studentIds } }).lean();

    const comparisonData = students.map(s => {
      const personal = s.personal || {};
      const programs = Array.isArray(s.programs) ? s.programs : [];
      const activePrograms = programs.filter(p => p.status === 'active');
      const iep = s.iep || {};
      const ltg = Array.isArray(iep.longTermGoals) ? iep.longTermGoals : [];
      const stg = Array.isArray(iep.shortTermGoals) ? iep.shortTermGoals : [];
      const allGoals = [...ltg, ...stg];
      const achievedGoals = allGoals.filter(
        g => g.status === 'achieved' || g.status === 'completed'
      ).length;
      const bt = s.behaviorTracking || {};
      const behaviorLog = Array.isArray(bt.behaviorLog) ? bt.behaviorLog : [];

      return {
        studentId: s.studentId,
        name: `${personal.firstNameAr || ''} ${personal.lastNameAr || ''}`.trim() || '—',
        gender: personal.gender || '—',
        disability: {
          type: s.disability?.primaryType || '—',
          severity: s.disability?.severity || '—',
        },
        attendance: {
          rate: s.attendance?.statistics?.attendanceRate || 0,
          totalDays: s.attendance?.statistics?.totalDays || 0,
          present: s.attendance?.statistics?.present || 0,
          absent: s.attendance?.statistics?.absent || 0,
          streak: s.attendance?.streak || 0,
        },
        progress: {
          overall: s.progress?.overallProgress || 0,
          skills: Array.isArray(s.progress?.skills) ? s.progress.skills.length : 0,
          milestones: Array.isArray(s.progress?.milestones) ? s.progress.milestones.length : 0,
        },
        programs: {
          total: programs.length,
          active: activePrograms.length,
          averageProgress:
            programs.length > 0
              ? Math.round(
                  programs.reduce((sum, p) => sum + (p.progress || 0), 0) / programs.length
                )
              : 0,
        },
        iep: {
          totalGoals: allGoals.length,
          achievedGoals,
          goalProgress:
            allGoals.length > 0 ? Math.round((achievedGoals / allGoals.length) * 100) : 0,
        },
        behavior: {
          points: bt.points || 0,
          badges: Array.isArray(bt.badges) ? bt.badges.length : 0,
          positive: behaviorLog.filter(b => b.type === 'positive').length,
          negative: behaviorLog.filter(b => b.type === 'negative').length,
        },
        assessments: {
          total: Array.isArray(s.assessments) ? s.assessments.length : 0,
        },
      };
    });

    // ─── Compute averages for comparison ────
    const count = comparisonData.length;
    const averages = {
      attendanceRate: Math.round(comparisonData.reduce((s, d) => s + d.attendance.rate, 0) / count),
      overallProgress: Math.round(
        comparisonData.reduce((s, d) => s + d.progress.overall, 0) / count
      ),
      programProgress: Math.round(
        comparisonData.reduce((s, d) => s + d.programs.averageProgress, 0) / count
      ),
      iepProgress: Math.round(comparisonData.reduce((s, d) => s + d.iep.goalProgress, 0) / count),
      behaviorPoints: Math.round(comparisonData.reduce((s, d) => s + d.behavior.points, 0) / count),
    };

    // ─── Rankings ────
    const rankings = {
      byAttendance: [...comparisonData]
        .sort((a, b) => b.attendance.rate - a.attendance.rate)
        .map((d, i) => ({
          rank: i + 1,
          studentId: d.studentId,
          name: d.name,
          value: d.attendance.rate,
        })),
      byProgress: [...comparisonData]
        .sort((a, b) => b.progress.overall - a.progress.overall)
        .map((d, i) => ({
          rank: i + 1,
          studentId: d.studentId,
          name: d.name,
          value: d.progress.overall,
        })),
      byBehavior: [...comparisonData]
        .sort((a, b) => b.behavior.points - a.behavior.points)
        .map((d, i) => ({
          rank: i + 1,
          studentId: d.studentId,
          name: d.name,
          value: d.behavior.points,
        })),
    };

    return {
      generatedAt: new Date().toISOString(),
      studentsCount: count,
      students: comparisonData,
      averages,
      rankings,
    };
  }

  // ============ Parent Report ============

  /**
   * تقرير ولي الأمر — نسخة مبسطة ومناسبة للأسرة
   */
  async getParentReport(studentId) {
    const student = await this._getModel().findOne({ studentId }).lean();
    if (!student) throw new Error('Student not found');

    const personal = student.personal || {};
    const center = student.center || {};
    const disability = student.disability || {};
    const attendance = student.attendance || {};
    const attStats = attendance.statistics || {};
    const progress = student.progress || {};
    const iep = student.iep || {};
    const programs = Array.isArray(student.programs) ? student.programs : [];
    const bt = student.behaviorTracking || {};

    // ─── Simplified attendance ────
    const attendanceRate = attStats.attendanceRate || 0;
    let attendanceLevel, attendanceMessage;
    if (attendanceRate >= 95) {
      attendanceLevel = 'ممتاز';
      attendanceMessage = 'حضور ابنكم/ابنتكم ممتاز! نشكركم على الالتزام.';
    } else if (attendanceRate >= 85) {
      attendanceLevel = 'جيد';
      attendanceMessage = 'حضور ابنكم/ابنتكم جيد. نأمل المحافظة على هذا المستوى.';
    } else if (attendanceRate >= 70) {
      attendanceLevel = 'مقبول';
      attendanceMessage = 'نسبة الحضور تحتاج لتحسين. نأمل التنسيق لتحسين الانتظام.';
    } else {
      attendanceLevel = 'يحتاج تحسين';
      attendanceMessage = 'نسبة الحضور منخفضة. نرجو التواصل مع المركز لمناقشة الأسباب.';
    }

    // ─── Simplified progress ────
    const overallProgress = progress.overallProgress || 0;
    let progressLevel, progressMessage;
    if (overallProgress >= 80) {
      progressLevel = 'ممتاز';
      progressMessage = 'تقدم ابنكم/ابنتكم رائع ويسير بخطى ثابتة نحو تحقيق الأهداف.';
    } else if (overallProgress >= 60) {
      progressLevel = 'جيد';
      progressMessage = 'التقدم جيد مع وجود فرص للتحسين في بعض المجالات.';
    } else if (overallProgress >= 40) {
      progressLevel = 'مقبول';
      progressMessage = 'التقدم بحاجة إلى دعم إضافي. نوصي بالتعاون مع الفريق العلاجي.';
    } else {
      progressLevel = 'يحتاج دعم';
      progressMessage = 'نحتاج لمراجعة الخطة العلاجية بالتعاون مع الأسرة.';
    }

    // ─── Programs summary for parents ────
    const activePrograms = programs.filter(p => p.status === 'active');
    const programsForParent = activePrograms.map(p => ({
      name: studentConfig.programs[p.programType]?.label || p.programType || '—',
      sessionsPerWeek: p.sessionsPerWeek || 0,
      progress: p.progress || 0,
      progressLabel: p.progress >= 80 ? 'ممتاز' : p.progress >= 50 ? 'جيد' : 'مستمر',
    }));

    // ─── IEP goals for parents ────
    const ltg = Array.isArray(iep.longTermGoals) ? iep.longTermGoals : [];
    const stg = Array.isArray(iep.shortTermGoals) ? iep.shortTermGoals : [];
    const allGoals = [...ltg, ...stg];
    const achievedGoals = allGoals.filter(g => g.status === 'achieved' || g.status === 'completed');
    const inProgressGoals = allGoals.filter(g => g.status === 'in_progress');

    // ─── Behavior for parents ────
    const badges = Array.isArray(bt.badges) ? bt.badges : [];
    const behaviorLog = Array.isArray(bt.behaviorLog) ? bt.behaviorLog : [];
    const recentPositive = behaviorLog
      .filter(b => b.type === 'positive')
      .slice(-5)
      .reverse()
      .map(b => b.behavior || '—');

    // ─── Recommendations for parents ────
    const parentRecommendations = [];
    if (attendanceRate < 85) {
      parentRecommendations.push({
        area: 'الحضور',
        suggestion: 'نأمل المحافظة على حضور منتظم لضمان استمرارية التقدم العلاجي.',
      });
    }
    if (overallProgress < 50) {
      parentRecommendations.push({
        area: 'التقدم',
        suggestion: 'نوصي بتخصيص وقت يومي للتدريب المنزلي وفق التمارين الموصى بها.',
      });
    }
    if (activePrograms.length > 0) {
      parentRecommendations.push({
        area: 'البرامج',
        suggestion: 'ننصح بالتواصل مع المعالجين للاطلاع على تمارين الدعم المنزلي.',
      });
    }
    parentRecommendations.push({
      area: 'التواصل',
      suggestion: 'نرحب بتواصلكم الدائم مع فريق المركز لمتابعة خطة ابنكم/ابنتكم.',
    });

    return {
      generatedAt: new Date().toISOString(),
      reportType: 'parent',
      student: {
        name: `${personal.firstNameAr || ''} ${personal.lastNameAr || ''}`.trim() || '—',
        studentId: student.studentId,
        centerName: center.centerName || '—',
        enrollmentDate: center.enrollmentDate,
        disabilityType:
          studentConfig.disabilityTypes[disability.primaryType]?.label ||
          disability.primaryType ||
          '—',
      },
      attendance: {
        rate: attendanceRate,
        level: attendanceLevel,
        message: attendanceMessage,
        present: attStats.present || 0,
        absent: attStats.absent || 0,
        totalDays: attStats.totalDays || 0,
        streak: attendance.streak || 0,
      },
      progress: {
        overall: overallProgress,
        level: progressLevel,
        message: progressMessage,
      },
      programs: programsForParent,
      goals: {
        total: allGoals.length,
        achieved: achievedGoals.length,
        inProgress: inProgressGoals.length,
        achievedList: achievedGoals.map(g => g.description || g.goal || '—'),
        inProgressList: inProgressGoals.map(g => g.description || g.goal || '—'),
      },
      behavior: {
        points: bt.points || 0,
        badges: badges.map(b => b.name || b.title || '—'),
        recentPositive,
      },
      recommendations: parentRecommendations,
    };
  }

  // ============ Student Progress Timeline ============

  /**
   * خط زمني لتقدم الطالب — بيانات للرسوم البيانية
   */
  async getStudentProgressTimeline(studentId) {
    const student = await this._getModel().findOne({ studentId }).lean();
    if (!student) throw new Error('Student not found');

    const programs = Array.isArray(student.programs) ? student.programs : [];
    const assessments = Array.isArray(student.assessments) ? student.assessments : [];
    const behaviorLog = Array.isArray(student.behaviorTracking?.behaviorLog)
      ? student.behaviorTracking.behaviorLog
      : [];
    const milestones = Array.isArray(student.progress?.milestones)
      ? student.progress.milestones
      : [];

    // ─── Assessment progress over time ────
    const assessmentTimeline = assessments
      .filter(a => a.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(a => {
        const areas = Array.isArray(a.areas) ? a.areas : [];
        const avgScore =
          areas.length > 0
            ? Math.round(
                areas.reduce((s, ar) => s + ((ar.score || 0) / (ar.maxScore || 100)) * 100, 0) /
                  areas.length
              )
            : 0;
        return {
          date: a.date,
          type: a.type || '—',
          averageScore: avgScore,
          areas: areas.map(ar => ({
            domain: ar.domain || '—',
            score: ar.score || 0,
            maxScore: ar.maxScore || 100,
            percentage: Math.round(((ar.score || 0) / (ar.maxScore || 100)) * 100),
          })),
        };
      });

    // ─── Program progress snapshot ────
    const programTimeline = programs.map(p => ({
      programType: p.programType || '—',
      programName: studentConfig.programs[p.programType]?.label || p.programType || '—',
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status || '—',
      progress: p.progress || 0,
    }));

    // ─── Behavior trend (last 30 events) ────
    const behaviorTrend = behaviorLog
      .filter(b => b.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30)
      .map(b => ({
        date: b.date,
        type: b.type,
        points: b.points || 0,
        behavior: b.behavior || '—',
      }));

    // ─── Cumulative behavior points ────
    let cumulativePoints = 0;
    const behaviorCumulative = behaviorLog
      .filter(b => b.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(b => {
        cumulativePoints += (b.type === 'positive' ? 1 : -1) * (b.points || 0);
        return { date: b.date, cumulativePoints };
      });

    // ─── Milestones timeline ────
    const milestonesTimeline = milestones
      .filter(m => m.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(m => ({
        date: m.date,
        title: m.title || m.description || '—',
        category: m.category || 'عام',
      }));

    return {
      generatedAt: new Date().toISOString(),
      studentId,
      assessmentTimeline,
      programTimeline,
      behaviorTrend,
      behaviorCumulative,
      milestonesTimeline,
      overallProgress: student.progress?.overallProgress || 0,
      attendanceRate: student.attendance?.statistics?.attendanceRate || 0,
    };
  }

  // ============ Center Reports Summary ============

  /**
   * ملخص مركز التقارير — نظرة عامة على جميع التقارير المتاحة
   */
  async getCenterReportsSummary(centerId) {
    const Model = this._getModel();
    const students = await Model.find({ 'center.centerId': centerId }).lean();
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;

    const avgAttendance =
      totalStudents > 0
        ? Math.round(
            students.reduce((s, st) => s + (st.attendance?.statistics?.attendanceRate || 0), 0) /
              totalStudents
          )
        : 0;
    const avgProgress =
      totalStudents > 0
        ? Math.round(
            students.reduce((s, st) => s + (st.progress?.overallProgress || 0), 0) / totalStudents
          )
        : 0;

    const recentAssessments = students.reduce((count, s) => {
      const assessments = Array.isArray(s.assessments) ? s.assessments : [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return count + assessments.filter(a => a.date && new Date(a.date) > thirtyDaysAgo).length;
    }, 0);

    const studentsAtRisk = students.filter(s => {
      const attRate = s.attendance?.statistics?.attendanceRate || 0;
      const prog = s.progress?.overallProgress || 0;
      return attRate < 75 || prog < 30;
    }).length;

    return {
      generatedAt: new Date().toISOString(),
      centerId,
      overview: {
        totalStudents,
        activeStudents,
        avgAttendance,
        avgProgress,
        recentAssessments,
        studentsAtRisk,
      },
      availableReports: [
        {
          id: 'comprehensive',
          title: 'التقرير الشامل للطالب',
          description: 'تقرير متكامل يشمل جميع بيانات الطالب والتقدم والتقييمات',
          type: 'individual',
          icon: 'description',
        },
        {
          id: 'academic-performance',
          title: 'تقرير الأداء الأكاديمي',
          description: 'تحليل شامل للتحصيل الدراسي والتقييمات والمعدل التراكمي ونقاط القوة والضعف',
          type: 'individual',
          icon: 'school',
          isNew: true,
        },
        {
          id: 'behavioral-analysis',
          title: 'تقرير التحليل السلوكي',
          description: 'تحليل عميق لأنماط السلوك الأسبوعية والشهرية والاتجاهات والتوصيات',
          type: 'individual',
          icon: 'psychology',
          isNew: true,
        },
        {
          id: 'health-wellness',
          title: 'تقرير الصحة والعافية',
          description: 'ملف صحي شامل يشمل الحساسية والأدوية والتطعيمات والفحوصات',
          type: 'individual',
          icon: 'health_and_safety',
          isNew: true,
        },
        {
          id: 'family-engagement',
          title: 'تقرير تفاعل الأسرة',
          description: 'تحليل مشاركة وتواصل أولياء الأمور ومستوى الانخراط',
          type: 'individual',
          icon: 'family_restroom',
          isNew: true,
        },
        {
          id: 'transition-readiness',
          title: 'تقرير الجاهزية للانتقال',
          description: 'تقييم استعداد الطالب للمرحلة التالية مع خطة انتقالية مقترحة',
          type: 'individual',
          icon: 'swap_horiz',
          isNew: true,
        },
        {
          id: 'periodic',
          title: 'التقرير الدوري للمركز',
          description: 'ملخص أداء جميع الطلاب لفترة زمنية محددة',
          type: 'center',
          icon: 'date_range',
        },
        {
          id: 'comparison',
          title: 'تقرير المقارنة',
          description: 'مقارنة أداء مجموعة من الطلاب جنباً إلى جنب',
          type: 'multi',
          icon: 'compare',
        },
        {
          id: 'parent',
          title: 'تقرير ولي الأمر',
          description: 'تقرير مبسط ومناسب لمشاركته مع أولياء الأمور',
          type: 'individual',
          icon: 'people',
        },
        {
          id: 'progress-timeline',
          title: 'الخط الزمني للتقدم',
          description: 'عرض بصري لتطور الطالب عبر الزمن',
          type: 'individual',
          icon: 'timeline',
        },
        {
          id: 'attendance',
          title: 'تقرير الحضور',
          description: 'تحليل مفصل لحضور وغياب طلاب المركز',
          type: 'center',
          icon: 'event_available',
        },
        {
          id: 'progress',
          title: 'تقرير التقدم',
          description: 'تحليل مفصل لمستوى تقدم الطلاب في البرامج',
          type: 'center',
          icon: 'trending_up',
        },
        {
          id: 'therapist-effectiveness',
          title: 'تقرير فاعلية المعالجين',
          description: 'تحليل أداء المعالجين من خلال تقدم طلابهم ونسب الإنجاز',
          type: 'center',
          icon: 'analytics',
          isNew: true,
        },
        {
          id: 'custom',
          title: 'تقرير مخصص',
          description: 'بناء تقرير مخصص باختيار الأقسام والبيانات المطلوبة',
          type: 'individual',
          icon: 'build',
          isNew: true,
        },
        {
          id: 'export',
          title: 'تصدير بيانات الطلاب',
          description: 'تصدير بيانات جميع الطلاب بصيغة JSON أو CSV',
          type: 'center',
          icon: 'file_download',
          isNew: true,
        },
      ],
    };
  }

  // ============ NEW: Academic Performance Report ============

  /**
   * تقرير الأداء الأكاديمي — تحليل شامل للتحصيل الدراسي والتقييمات
   */
  async getAcademicPerformanceReport(studentId) {
    const student = await this._getModel().findOne({ studentId }).lean();
    if (!student) throw new Error('Student not found');

    const personal = student.personal || {};
    const assessments = Array.isArray(student.assessments) ? student.assessments : [];
    const programs = Array.isArray(student.programs) ? student.programs : [];
    const skills = Array.isArray(student.progress?.skills) ? student.progress.skills : [];

    // Assessment analysis by domain
    const domainScores = {};
    assessments.forEach(a => {
      (a.areas || []).forEach(area => {
        const domain = area.domain || 'عام';
        if (!domainScores[domain]) {
          domainScores[domain] = { scores: [], maxScores: [], dates: [] };
        }
        domainScores[domain].scores.push(area.score || 0);
        domainScores[domain].maxScores.push(area.maxScore || 100);
        domainScores[domain].dates.push(a.date);
      });
    });

    const domainAnalysis = Object.entries(domainScores).map(([domain, data]) => {
      const avgScore = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
      const avgMax = data.maxScores.reduce((s, v) => s + v, 0) / data.maxScores.length;
      const percentage = avgMax > 0 ? Math.round((avgScore / avgMax) * 100) : 0;
      const trend =
        data.scores.length >= 2
          ? data.scores[data.scores.length - 1] - data.scores[data.scores.length - 2]
          : 0;
      return {
        domain,
        averageScore: Math.round(avgScore),
        maxScore: Math.round(avgMax),
        percentage,
        assessmentCount: data.scores.length,
        trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
        trendLabel: trend > 0 ? 'تحسن' : trend < 0 ? 'تراجع' : 'مستقر',
        trendValue: trend,
      };
    });

    // GPA Calculation (weighted by maxScore)
    let totalWeighted = 0;
    let totalMaxWeighted = 0;
    assessments.forEach(a => {
      (a.areas || []).forEach(area => {
        totalWeighted += area.score || 0;
        totalMaxWeighted += area.maxScore || 100;
      });
    });
    const gpa =
      totalMaxWeighted > 0 ? Math.round((totalWeighted / totalMaxWeighted) * 4 * 100) / 100 : 0;

    // Semester comparison
    const sortedAssessments = [...assessments].sort((a, b) => new Date(a.date) - new Date(b.date));
    const semesterComparison = [];
    if (sortedAssessments.length >= 2) {
      const midpoint = Math.floor(sortedAssessments.length / 2);
      const firstHalf = sortedAssessments.slice(0, midpoint);
      const secondHalf = sortedAssessments.slice(midpoint);

      const calcAvg = arr => {
        let total = 0,
          count = 0;
        arr.forEach(a =>
          (a.areas || []).forEach(area => {
            total += ((area.score || 0) / (area.maxScore || 100)) * 100;
            count++;
          })
        );
        return count > 0 ? Math.round(total / count) : 0;
      };

      semesterComparison.push(
        { period: 'الفترة الأولى', average: calcAvg(firstHalf), assessments: firstHalf.length },
        { period: 'الفترة الثانية', average: calcAvg(secondHalf), assessments: secondHalf.length }
      );
    }

    // Strengths and weaknesses
    const sortedDomains = [...domainAnalysis].sort((a, b) => b.percentage - a.percentage);
    const strengths = sortedDomains.slice(0, 3).filter(d => d.percentage >= 60);
    const weaknesses = sortedDomains
      .slice(-3)
      .filter(d => d.percentage < 60)
      .reverse();

    // Skills readiness matrix
    const skillsMatrix = skills.map(s => ({
      skill: s.skill || '—',
      level: s.level || 'beginner',
      levelLabel:
        { beginner: 'مبتدئ', developing: 'نامي', proficient: 'متمكن', advanced: 'متقدم' }[
          s.level
        ] || s.level,
      readinessScore: { beginner: 25, developing: 50, proficient: 75, advanced: 100 }[s.level] || 0,
    }));

    // Program effectiveness
    const programEffectiveness = programs.map(p => ({
      programType: p.programType || '—',
      programName: studentConfig.programs[p.programType]?.label || p.programType || '—',
      progress: p.progress || 0,
      status: p.status || 'unknown',
      sessionsPerWeek: p.sessionsPerWeek || 0,
      effectivenessScore: Math.min(100, (p.progress || 0) * 1.2),
      goals: Array.isArray(p.goals) ? p.goals : [],
      goalsAchieved: Array.isArray(p.goals)
        ? Math.round(((p.progress || 0) / 100) * p.goals.length)
        : 0,
    }));

    return {
      generatedAt: new Date().toISOString(),
      reportType: 'academic_performance',
      student: {
        id: student.studentId,
        name: `${personal.firstNameAr || ''} ${personal.lastNameAr || ''}`.trim() || '—',
        studentId: student.studentId,
      },
      gpa: {
        value: gpa,
        maxGpa: 4.0,
        percentage: Math.round((gpa / 4) * 100),
        grade:
          gpa >= 3.5
            ? 'ممتاز'
            : gpa >= 3.0
              ? 'جيد جداً'
              : gpa >= 2.5
                ? 'جيد'
                : gpa >= 2.0
                  ? 'مقبول'
                  : 'ضعيف',
      },
      domainAnalysis,
      semesterComparison,
      strengths: strengths.map(s => ({ domain: s.domain, score: s.percentage, label: 'نقطة قوة' })),
      weaknesses: weaknesses.map(w => ({
        domain: w.domain,
        score: w.percentage,
        label: 'يحتاج تحسين',
      })),
      skillsMatrix,
      programEffectiveness,
      totalAssessments: assessments.length,
      recommendations: [
        ...weaknesses.map(w => ({
          area: w.domain,
          priority: w.percentage < 40 ? 'عالية' : 'متوسطة',
          suggestion: `تحسين الأداء في مجال ${w.domain} - النسبة الحالية ${w.percentage}%`,
        })),
        ...(gpa < 2.5
          ? [
              {
                area: 'المعدل التراكمي',
                priority: 'عالية',
                suggestion: 'المعدل التراكمي يحتاج لتحسين عاجل - الحالي ' + gpa,
              },
            ]
          : []),
      ],
    };
  }

  // ============ NEW: Behavioral Deep Analysis Report ============

  /**
   * تقرير التحليل السلوكي العميق — تحليل أنماط السلوك والاتجاهات
   */
  async getBehavioralAnalysisReport(studentId) {
    const student = await this._getModel().findOne({ studentId }).lean();
    if (!student) throw new Error('Student not found');

    const personal = student.personal || {};
    const bt = student.behaviorTracking || {};
    const behaviorLog = Array.isArray(bt.behaviorLog) ? bt.behaviorLog : [];
    const badges = Array.isArray(bt.badges) ? bt.badges : [];

    // Weekly behavior pattern
    const weeklyPattern = {
      sun: { positive: 0, negative: 0 },
      mon: { positive: 0, negative: 0 },
      tue: { positive: 0, negative: 0 },
      wed: { positive: 0, negative: 0 },
      thu: { positive: 0, negative: 0 },
    };
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayLabels = {
      sun: 'الأحد',
      mon: 'الاثنين',
      tue: 'الثلاثاء',
      wed: 'الأربعاء',
      thu: 'الخميس',
    };

    behaviorLog.forEach(b => {
      if (!b.date) return;
      const day = dayNames[new Date(b.date).getDay()];
      if (weeklyPattern[day]) {
        weeklyPattern[day][b.type === 'positive' ? 'positive' : 'negative']++;
      }
    });

    const weeklyData = Object.entries(weeklyPattern).map(([day, data]) => ({
      day,
      dayLabel: dayLabels[day] || day,
      ...data,
      net: data.positive - data.negative,
    }));

    // Behavior categories breakdown
    const categoryBreakdown = {};
    behaviorLog.forEach(b => {
      const cat = b.behavior || 'أخرى';
      if (!categoryBreakdown[cat])
        categoryBreakdown[cat] = { count: 0, positive: 0, negative: 0, totalPoints: 0 };
      categoryBreakdown[cat].count++;
      categoryBreakdown[cat][b.type === 'positive' ? 'positive' : 'negative']++;
      categoryBreakdown[cat].totalPoints += b.points || 0;
    });

    const categories = Object.entries(categoryBreakdown)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    // Monthly trend
    const monthlyTrend = {};
    behaviorLog.forEach(b => {
      if (!b.date) return;
      const d = new Date(b.date);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthlyTrend[key]) monthlyTrend[key] = { positive: 0, negative: 0, totalPoints: 0 };
      monthlyTrend[key][b.type === 'positive' ? 'positive' : 'negative']++;
      monthlyTrend[key].totalPoints += (b.type === 'positive' ? 1 : -1) * (b.points || 0);
    });

    const monthlyData = Object.entries(monthlyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        ...data,
        ratio:
          data.positive + data.negative > 0
            ? Math.round((data.positive / (data.positive + data.negative)) * 100)
            : 0,
      }));

    // Streak analysis
    let currentPositiveStreak = 0;
    let maxPositiveStreak = 0;
    let currentNegativeStreak = 0;
    let maxNegativeStreak = 0;
    const sortedLog = [...behaviorLog].sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedLog.forEach(b => {
      if (b.type === 'positive') {
        currentPositiveStreak++;
        currentNegativeStreak = 0;
        maxPositiveStreak = Math.max(maxPositiveStreak, currentPositiveStreak);
      } else {
        currentNegativeStreak++;
        currentPositiveStreak = 0;
        maxNegativeStreak = Math.max(maxNegativeStreak, currentNegativeStreak);
      }
    });

    // Improvement areas
    const totalPositive = behaviorLog.filter(b => b.type === 'positive').length;
    const totalNegative = behaviorLog.filter(b => b.type === 'negative').length;
    const positiveRatio =
      totalPositive + totalNegative > 0
        ? Math.round((totalPositive / (totalPositive + totalNegative)) * 100)
        : 100;

    const improvementAreas = [];
    if (positiveRatio < 60) {
      improvementAreas.push({
        area: 'نسبة السلوك الإيجابي',
        severity: 'high',
        message: 'النسبة أقل من 60% - يحتاج خطة تدخل سلوكي',
      });
    }
    if (maxNegativeStreak > 3) {
      improvementAreas.push({
        area: 'تكرار السلوك السلبي',
        severity: 'medium',
        message: `أطول سلسلة سلوكيات سلبية متتالية: ${maxNegativeStreak}`,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      reportType: 'behavioral_analysis',
      student: {
        id: student.studentId,
        name: `${personal.firstNameAr || ''} ${personal.lastNameAr || ''}`.trim() || '—',
      },
      overview: {
        totalPoints: bt.points || 0,
        totalEvents: behaviorLog.length,
        positiveEvents: totalPositive,
        negativeEvents: totalNegative,
        positiveRatio,
        badges: badges.length,
        currentStreak: currentPositiveStreak,
        maxPositiveStreak,
        maxNegativeStreak,
      },
      weeklyPattern: weeklyData,
      categories,
      monthlyTrend: monthlyData,
      badges: badges.map(b => ({
        name: b.name || '—',
        description: b.description || '',
        earnedDate: b.earnedDate,
        icon: b.icon || '🏆',
      })),
      improvementAreas,
      recommendations: [
        ...(positiveRatio < 70
          ? [
              {
                title: 'تعزيز السلوك الإيجابي',
                actions: [
                  'إعداد جدول مكافآت يومي',
                  'التواصل مع المعالج السلوكي',
                  'زيادة فترات التعزيز الإيجابي',
                ],
              },
            ]
          : []),
        ...(totalNegative > 10
          ? [
              {
                title: 'معالجة السلوكيات السلبية',
                actions: [
                  'تحليل محفزات السلوك',
                  'تطبيق استراتيجيات بديلة',
                  'إشراك الأسرة في خطة التعديل',
                ],
              },
            ]
          : []),
        {
          title: 'المتابعة المستمرة',
          actions: [
            'توثيق السلوكيات بشكل يومي',
            'مراجعة التقدم أسبوعياً',
            'تحديث خطة التدخل السلوكي شهرياً',
          ],
        },
      ],
    };
  }

  // ============ NEW: Health & Wellness Report ============

  /**
   * تقرير الصحة والعافية — تحليل شامل للحالة الصحية وتوصيات
   */
  async getHealthWellnessReport(studentId) {
    const student = await this._getModel().findOne({ studentId }).lean();
    if (!student) throw new Error('Student not found');

    const personal = student.personal || {};
    const medicalHistory = student.medicalHistory || {};
    const disability = student.disability || {};
    const attendance = student.attendance?.statistics || {};

    const allergies = Array.isArray(medicalHistory.allergies) ? medicalHistory.allergies : [];
    const medications = Array.isArray(medicalHistory.medications) ? medicalHistory.medications : [];
    const chronicConditions = Array.isArray(medicalHistory.chronicConditions)
      ? medicalHistory.chronicConditions
      : [];
    const surgeries = Array.isArray(medicalHistory.surgeries) ? medicalHistory.surgeries : [];
    const hospitalizations = Array.isArray(medicalHistory.hospitalizations)
      ? medicalHistory.hospitalizations
      : [];
    const immunizations = Array.isArray(medicalHistory.immunizations)
      ? medicalHistory.immunizations
      : [];
    const assistiveDevices = Array.isArray(disability.assistiveDevices)
      ? disability.assistiveDevices
      : [];

    // Active medications
    const activeMeds = medications.filter(m => m.active !== false);

    // Overdue immunizations
    const now = new Date();
    const overdueVaccines = immunizations.filter(v => v.nextDue && new Date(v.nextDue) < now);
    const upcomingVaccines = immunizations.filter(v => {
      if (!v.nextDue) return false;
      const due = new Date(v.nextDue);
      return due >= now && due <= new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    });

    // Vision & hearing status
    const vision = medicalHistory.vision || {};
    const hearing = medicalHistory.hearing || {};

    // Health risk score
    let healthRiskScore = 0;
    if (allergies.filter(a => a.severity === 'severe').length > 0) healthRiskScore += 25;
    if (chronicConditions.length > 2) healthRiskScore += 20;
    if (activeMeds.length > 3) healthRiskScore += 15;
    if (overdueVaccines.length > 0) healthRiskScore += 15;
    if (surgeries.length > 2) healthRiskScore += 10;
    if (attendance.attendanceRate < 75) healthRiskScore += 15;

    const healthRiskLevel = healthRiskScore > 60 ? 'high' : healthRiskScore > 30 ? 'medium' : 'low';
    const healthRiskLabel =
      healthRiskScore > 60 ? 'مرتفع' : healthRiskScore > 30 ? 'متوسط' : 'منخفض';

    // Upcoming checkups
    const upcomingCheckups = [];
    if (vision.lastCheckup) {
      const lastVision = new Date(vision.lastCheckup);
      const nextVision = new Date(lastVision.getTime() + 180 * 24 * 60 * 60 * 1000);
      if (nextVision <= new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
        upcomingCheckups.push({
          type: 'فحص بصري',
          dueDate: nextVision.toISOString(),
          overdue: nextVision < now,
        });
      }
    }
    if (hearing.lastCheckup) {
      const lastHearing = new Date(hearing.lastCheckup);
      const nextHearing = new Date(lastHearing.getTime() + 180 * 24 * 60 * 60 * 1000);
      if (nextHearing <= new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
        upcomingCheckups.push({
          type: 'فحص سمعي',
          dueDate: nextHearing.toISOString(),
          overdue: nextHearing < now,
        });
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      reportType: 'health_wellness',
      student: {
        id: student.studentId,
        name: `${personal.firstNameAr || ''} ${personal.lastNameAr || ''}`.trim() || '—',
        bloodType: personal.bloodType || '—',
        dateOfBirth: personal.dateOfBirth,
        age: personal.dateOfBirth
          ? Math.floor((now - new Date(personal.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
      },
      healthRisk: { score: healthRiskScore, level: healthRiskLevel, label: healthRiskLabel },
      disability: {
        type: disability.primaryType || '—',
        typeLabel:
          studentConfig.disabilityTypes[disability.primaryType]?.label ||
          disability.primaryType ||
          '—',
        severity: disability.severity || '—',
        severityLabel:
          studentConfig.severityLevels[disability.severity]?.label || disability.severity || '—',
        disabilityPercentage: disability.disabilityPercentage || 0,
      },
      allergies: allergies.map(a => ({
        name: a.name || '—',
        type: a.type || '—',
        severity: a.severity || 'mild',
        reaction: a.reaction || '',
      })),
      activeMedications: activeMeds.map(m => ({
        name: m.name || '—',
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        prescribedBy: m.prescribedBy || '',
      })),
      chronicConditions,
      surgeries: surgeries.map(s => ({
        name: s.name || '—',
        date: s.date,
        hospital: s.hospital || '',
        notes: s.notes || '',
      })),
      hospitalizations: hospitalizations.map(h => ({
        reason: h.reason || '—',
        date: h.date,
        duration: h.duration || 0,
        hospital: h.hospital || '',
      })),
      immunizations: {
        total: immunizations.length,
        overdue: overdueVaccines.map(v => ({ vaccine: v.vaccine, dueDate: v.nextDue })),
        upcoming: upcomingVaccines.map(v => ({ vaccine: v.vaccine, dueDate: v.nextDue })),
      },
      vision: {
        leftEye: vision.leftEye || '—',
        rightEye: vision.rightEye || '—',
        glasses: vision.glasses || false,
        lastCheckup: vision.lastCheckup,
      },
      hearing: {
        leftEar: hearing.leftEar || '—',
        rightEar: hearing.rightEar || '—',
        hearingAid: hearing.hearingAid || false,
        lastCheckup: hearing.lastCheckup,
      },
      assistiveDevices: assistiveDevices.map(d => ({
        type: d.type || '—',
        brand: d.brand || '',
        serialNumber: d.serialNumber || '',
        providedDate: d.providedDate,
      })),
      upcomingCheckups,
      recommendations: [
        ...(overdueVaccines.length > 0
          ? [
              {
                area: 'التطعيمات',
                priority: 'عالية',
                message: `يوجد ${overdueVaccines.length} تطعيم متأخر`,
              },
            ]
          : []),
        ...(allergies.filter(a => a.severity === 'severe').length > 0
          ? [{ area: 'الحساسية', priority: 'عالية', message: 'يوجد حساسية شديدة — يجب الحذر' }]
          : []),
        ...(upcomingCheckups.filter(c => c.overdue).length > 0
          ? [{ area: 'الفحوصات', priority: 'متوسطة', message: 'يوجد فحوصات متأخرة عن موعدها' }]
          : []),
        { area: 'المتابعة', priority: 'عادية', message: 'مراجعة دورية للحالة الصحية كل 3 أشهر' },
      ],
    };
  }

  // ============ NEW: Family Engagement Report ============

  /**
   * تقرير تفاعل الأسرة — تحليل مشاركة وتواصل أولياء الأمور
   */
  async getFamilyEngagementReport(studentId) {
    const student = await this._getModel().findOne({ studentId }).lean();
    if (!student) throw new Error('Student not found');

    const personal = student.personal || {};
    const guardian = student.guardian || {};
    const communications = Array.isArray(student.communications) ? student.communications : [];
    const notes = Array.isArray(student.notes) ? student.notes : [];
    const iep = student.iep || {};

    // Communication analysis
    const commByType = { call: 0, meeting: 0, message: 0, email: 0 };
    const commByDirection = { incoming: 0, outgoing: 0 };
    const commByMonth = {};
    communications.forEach(c => {
      commByType[c.type || 'message']++;
      commByDirection[c.direction || 'outgoing']++;
      if (c.date) {
        const d = new Date(c.date);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        commByMonth[key] = (commByMonth[key] || 0) + 1;
      }
    });

    const commTrend = Object.entries(commByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    // Response rate
    const followUpRequired = communications.filter(c => c.followUp?.required);
    const followUpCompleted = followUpRequired.filter(c => c.followUp?.completed);
    const responseRate =
      followUpRequired.length > 0
        ? Math.round((followUpCompleted.length / followUpRequired.length) * 100)
        : 100;

    // Engagement score (0-100)
    let engagementScore = 0;
    const commFrequency = communications.length;
    if (commFrequency > 20) engagementScore += 30;
    else if (commFrequency > 10) engagementScore += 20;
    else if (commFrequency > 5) engagementScore += 15;
    else engagementScore += 5;

    if (commByDirection.incoming > 0) engagementScore += 20;
    if (commByType.meeting > 0) engagementScore += 15;
    if (responseRate >= 90) engagementScore += 20;
    else if (responseRate >= 70) engagementScore += 10;
    if (iep.parentConsent) engagementScore += 15;

    const engagementLevel =
      engagementScore >= 75
        ? 'ممتاز'
        : engagementScore >= 50
          ? 'جيد'
          : engagementScore >= 25
            ? 'متوسط'
            : 'ضعيف';

    // Pending follow-ups
    const pendingFollowUps = followUpRequired
      .filter(c => !c.followUp?.completed)
      .map(c => ({ subject: c.subject || '—', dueDate: c.followUp?.dueDate, type: c.type }));

    return {
      generatedAt: new Date().toISOString(),
      reportType: 'family_engagement',
      student: {
        id: student.studentId,
        name: `${personal.firstNameAr || ''} ${personal.lastNameAr || ''}`.trim() || '—',
      },
      guardian: {
        fatherName: guardian.father?.name || '—',
        fatherMobile: guardian.father?.mobile || '—',
        motherName: guardian.mother?.name || '—',
        motherMobile: guardian.mother?.mobile || '—',
        emergencyContact: guardian.emergencyContact || {},
      },
      engagement: {
        score: engagementScore,
        level: engagementLevel,
        totalCommunications: communications.length,
        byType: commByType,
        byDirection: commByDirection,
        responseRate,
        iepConsent: iep.parentConsent || false,
      },
      communicationTrend: commTrend,
      recentCommunications: communications
        .slice(-10)
        .reverse()
        .map(c => ({
          date: c.date,
          type: c.type || '—',
          direction: c.direction || '—',
          subject: c.subject || '—',
          summary: c.summary || '',
          hasFollowUp: c.followUp?.required || false,
          followUpCompleted: c.followUp?.completed || false,
        })),
      pendingFollowUps,
      recommendations: [
        ...(engagementScore < 50
          ? [
              {
                title: 'زيادة التواصل مع الأسرة',
                priority: 'عالية',
                actions: [
                  'جدولة اجتماع شهري مع ولي الأمر',
                  'إرسال تقارير أسبوعية عن تقدم الطالب',
                  'تفعيل قنوات تواصل إلكترونية',
                ],
              },
            ]
          : []),
        ...(commByType.meeting === 0
          ? [
              {
                title: 'تنظيم اجتماعات حضورية',
                priority: 'متوسطة',
                actions: ['تحديد موعد مناسب لولي الأمر', 'إعداد تقرير مفصل للمناقشة'],
              },
            ]
          : []),
        ...(pendingFollowUps.length > 0
          ? [
              {
                title: 'متابعات معلقة',
                priority: 'عالية',
                actions: pendingFollowUps.map(f => `متابعة: ${f.subject}`),
              },
            ]
          : []),
        {
          title: 'التحسين المستمر',
          priority: 'عادية',
          actions: ['إشراك ولي الأمر في تقييم الخطة', 'مشاركة إنجازات الطالب بشكل دوري'],
        },
      ],
    };
  }

  // ============ NEW: Transition Readiness Report ============

  /**
   * تقرير الجاهزية للانتقال — تقييم استعداد الطالب للمرحلة التالية
   */
  async getTransitionReadinessReport(studentId) {
    const student = await this._getModel().findOne({ studentId }).lean();
    if (!student) throw new Error('Student not found');

    const personal = student.personal || {};
    const disability = student.disability || {};
    const programs = Array.isArray(student.programs) ? student.programs : [];
    const skills = Array.isArray(student.progress?.skills) ? student.progress.skills : [];
    const iep = student.iep || {};
    const attendance = student.attendance?.statistics || {};
    const progress = student.progress || {};
    const bt = student.behaviorTracking || {};

    // Skills readiness assessment
    const skillCategories = {
      'مهارات أكاديمية': skills.filter(s =>
        ['reading', 'writing', 'math', 'academic', 'قراءة', 'كتابة', 'حساب'].some(k =>
          (s.skill || '').toLowerCase().includes(k)
        )
      ),
      'مهارات اجتماعية': skills.filter(s =>
        ['social', 'communication', 'اجتماعي', 'تواصل'].some(k =>
          (s.skill || '').toLowerCase().includes(k)
        )
      ),
      'مهارات حياتية': skills.filter(s =>
        ['daily', 'living', 'self-care', 'حياتي', 'رعاية ذاتية'].some(k =>
          (s.skill || '').toLowerCase().includes(k)
        )
      ),
      'مهارات مهنية': skills.filter(s =>
        ['vocational', 'work', 'مهني', 'عمل'].some(k => (s.skill || '').toLowerCase().includes(k))
      ),
    };

    const levelWeights = { beginner: 25, developing: 50, proficient: 75, advanced: 100 };
    const categoryScores = Object.entries(skillCategories).map(([category, categorySkills]) => {
      const avg =
        categorySkills.length > 0
          ? Math.round(
              categorySkills.reduce((s, sk) => s + (levelWeights[sk.level] || 0), 0) /
                categorySkills.length
            )
          : 0;
      return {
        category,
        skillCount: categorySkills.length,
        averageScore: avg,
        readinessLabel: avg >= 75 ? 'جاهز' : avg >= 50 ? 'قريب من الجاهزية' : 'يحتاج تطوير',
      };
    });

    // IEP Goals achievement
    const ltg = Array.isArray(iep.longTermGoals) ? iep.longTermGoals : [];
    const stg = Array.isArray(iep.shortTermGoals) ? iep.shortTermGoals : [];
    const allGoals = [...ltg, ...stg];
    const achievedGoals = allGoals.filter(g => g.status === 'achieved' || g.status === 'completed');
    const goalsAchievementRate =
      allGoals.length > 0 ? Math.round((achievedGoals.length / allGoals.length) * 100) : 0;

    // Program completion
    const completedPrograms = programs.filter(p => p.status === 'completed');
    const activePrograms = programs.filter(p => p.status === 'active');
    const avgProgramProgress =
      programs.length > 0
        ? Math.round(programs.reduce((s, p) => s + (p.progress || 0), 0) / programs.length)
        : 0;

    // Overall readiness score
    const attendanceScore = Math.min(100, attendance.attendanceRate || 0);
    const progressScore = progress.overallProgress || 0;
    const behaviorScore = Math.min(100, bt.points || 0);
    const skillsAvg =
      categoryScores.length > 0
        ? Math.round(categoryScores.reduce((s, c) => s + c.averageScore, 0) / categoryScores.length)
        : 0;

    const overallReadiness = Math.round(
      attendanceScore * 0.15 +
        progressScore * 0.25 +
        goalsAchievementRate * 0.25 +
        skillsAvg * 0.2 +
        Math.min(100, avgProgramProgress) * 0.15
    );

    const readinessLevel =
      overallReadiness >= 80
        ? 'جاهز'
        : overallReadiness >= 60
          ? 'قريب من الجاهزية'
          : overallReadiness >= 40
            ? 'يحتاج مزيد من التحضير'
            : 'غير جاهز';

    // Transition plan recommendations
    const transitionOptions = [];
    if (overallReadiness >= 70) {
      transitionOptions.push({
        option: 'الدمج في التعليم العام',
        suitability: 'عالية',
        requirements: ['دعم أكاديمي إضافي', 'متابعة من معلم الدمج'],
      });
    }
    if (skillsAvg >= 60 && (disability.severity === 'mild' || disability.severity === 'moderate')) {
      transitionOptions.push({
        option: 'التأهيل المهني',
        suitability: 'متوسطة-عالية',
        requirements: ['برنامج تدريب مهني', 'إشراف ميداني'],
      });
    }
    transitionOptions.push({
      option: 'الاستمرار بالخطة الحالية مع تعديلات',
      suitability: overallReadiness < 50 ? 'عالية' : 'متوسطة',
      requirements: ['مراجعة أهداف IEP', 'تكثيف الجلسات'],
    });

    return {
      generatedAt: new Date().toISOString(),
      reportType: 'transition_readiness',
      student: {
        id: student.studentId,
        name: `${personal.firstNameAr || ''} ${personal.lastNameAr || ''}`.trim() || '—',
        age: personal.dateOfBirth
          ? Math.floor(
              (new Date() - new Date(personal.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)
            )
          : null,
        disabilityType: studentConfig.disabilityTypes[disability.primaryType]?.label || '—',
        severity: studentConfig.severityLevels[disability.severity]?.label || '—',
      },
      readiness: {
        overallScore: overallReadiness,
        level: readinessLevel,
        components: {
          attendance: { score: attendanceScore, weight: '15%', label: 'الحضور' },
          progress: { score: progressScore, weight: '25%', label: 'التقدم العام' },
          goalsAchievement: { score: goalsAchievementRate, weight: '25%', label: 'تحقيق الأهداف' },
          skills: { score: skillsAvg, weight: '20%', label: 'المهارات' },
          programs: { score: avgProgramProgress, weight: '15%', label: 'البرامج' },
        },
      },
      skillsAssessment: categoryScores,
      iepStatus: {
        totalGoals: allGoals.length,
        achievedGoals: achievedGoals.length,
        achievementRate: goalsAchievementRate,
        remainingGoals: allGoals
          .filter(g => g.status !== 'achieved' && g.status !== 'completed')
          .map(g => ({
            description: g.description || '—',
            progress: g.progress || 0,
            status: g.status,
          })),
      },
      programStatus: {
        total: programs.length,
        completed: completedPrograms.length,
        active: activePrograms.length,
        averageProgress: avgProgramProgress,
      },
      transitionOptions,
      actionPlan: [
        ...(overallReadiness < 60
          ? [
              {
                phase: 'المرحلة 1 — التأسيس (0-3 أشهر)',
                actions: ['مراجعة وتحديث أهداف IEP', 'تكثيف البرامج العلاجية', 'تحسين نسبة الحضور'],
              },
            ]
          : []),
        {
          phase: `المرحلة ${overallReadiness < 60 ? '2' : '1'} — التطوير (${overallReadiness < 60 ? '3-6' : '0-3'} أشهر)`,
          actions: [
            'التركيز على المهارات الحياتية والاستقلالية',
            'تدريب على المهارات الاجتماعية',
            'تهيئة بيئة الانتقال',
          ],
        },
        {
          phase: `المرحلة ${overallReadiness < 60 ? '3' : '2'} — الانتقال (${overallReadiness < 60 ? '6-9' : '3-6'} أشهر)`,
          actions: [
            'زيارات ميدانية للبيئة الجديدة',
            'فترة تجريبية (دمج جزئي)',
            'المتابعة والتقييم المستمر',
          ],
        },
      ],
    };
  }

  // ============ NEW: Therapist Effectiveness Report ============

  /**
   * تقرير فاعلية المعالجين — تحليل أداء المعالجين من خلال تقدم الطلاب
   */
  async getTherapistEffectivenessReport(centerId) {
    const Model = this._getModel();
    const students = await Model.find({ 'center.centerId': centerId, status: 'active' }).lean();

    if (students.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        centerId,
        therapists: [],
        message: 'لا يوجد بيانات',
      };
    }

    // Aggregate therapist data
    const therapistMap = {};
    students.forEach(s => {
      (s.programs || []).forEach(p => {
        const therapist = p.therapist;
        if (!therapist?.name) return;
        const key = therapist.therapistId || therapist.name;
        if (!therapistMap[key]) {
          therapistMap[key] = {
            id: therapist.therapistId || key,
            name: therapist.name,
            specialization: therapist.specialization || '—',
            students: new Set(),
            programs: [],
            totalProgress: 0,
            completedPrograms: 0,
            activePrograms: 0,
          };
        }
        therapistMap[key].students.add(s.studentId);
        therapistMap[key].programs.push({
          studentId: s.studentId,
          studentName: `${s.personal?.firstNameAr || ''} ${s.personal?.lastNameAr || ''}`.trim(),
          programType: p.programType,
          progress: p.progress || 0,
          status: p.status,
        });
        therapistMap[key].totalProgress += p.progress || 0;
        if (p.status === 'completed') therapistMap[key].completedPrograms++;
        if (p.status === 'active') therapistMap[key].activePrograms++;
      });
    });

    const therapists = Object.values(therapistMap).map(t => {
      const avgProgress =
        t.programs.length > 0 ? Math.round(t.totalProgress / t.programs.length) : 0;
      const completionRate =
        t.programs.length > 0 ? Math.round((t.completedPrograms / t.programs.length) * 100) : 0;
      const effectivenessScore = Math.round(
        avgProgress * 0.5 + completionRate * 0.3 + Math.min(100, t.students.size * 10) * 0.2
      );

      return {
        id: t.id,
        name: t.name,
        specialization: t.specialization,
        studentCount: t.students.size,
        programCount: t.programs.length,
        activePrograms: t.activePrograms,
        completedPrograms: t.completedPrograms,
        averageProgress: avgProgress,
        completionRate,
        effectivenessScore,
        effectivenessLabel:
          effectivenessScore >= 80
            ? 'ممتاز'
            : effectivenessScore >= 60
              ? 'جيد'
              : effectivenessScore >= 40
                ? 'مقبول'
                : 'يحتاج تحسين',
        topStudents: t.programs
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 3)
          .map(p => ({ name: p.studentName, progress: p.progress })),
      };
    });

    // Rankings
    const byEffectiveness = [...therapists].sort(
      (a, b) => b.effectivenessScore - a.effectivenessScore
    );

    return {
      generatedAt: new Date().toISOString(),
      reportType: 'therapist_effectiveness',
      centerId,
      totalTherapists: therapists.length,
      therapists: byEffectiveness,
      averages: {
        avgProgress:
          therapists.length > 0
            ? Math.round(therapists.reduce((s, t) => s + t.averageProgress, 0) / therapists.length)
            : 0,
        avgCompletionRate:
          therapists.length > 0
            ? Math.round(therapists.reduce((s, t) => s + t.completionRate, 0) / therapists.length)
            : 0,
        avgEffectiveness:
          therapists.length > 0
            ? Math.round(
                therapists.reduce((s, t) => s + t.effectivenessScore, 0) / therapists.length
              )
            : 0,
      },
    };
  }

  // ============ NEW: Custom Report Builder ============

  /**
   * بناء تقرير مخصص — اختيار الأقسام المطلوبة في التقرير
   */
  async buildCustomReport(studentId, sections = []) {
    const student = await this._getModel().findOne({ studentId }).lean();
    if (!student) throw new Error('Student not found');

    const personal = student.personal || {};
    const report = {
      generatedAt: new Date().toISOString(),
      reportType: 'custom',
      student: {
        id: student.studentId,
        name: `${personal.firstNameAr || ''} ${personal.lastNameAr || ''}`.trim() || '—',
        studentId: student.studentId,
      },
      sections: {},
    };

    const allSections =
      sections.length === 0
        ? [
            'personal',
            'disability',
            'guardian',
            'attendance',
            'programs',
            'assessments',
            'iep',
            'behavior',
            'medical',
            'progress',
            'communications',
            'documents',
            'notes',
            'ai_insights',
            'risk',
          ]
        : sections;

    for (const section of allSections) {
      switch (section) {
        case 'personal':
          report.sections.personal = {
            firstNameAr: personal.firstNameAr || '—',
            lastNameAr: personal.lastNameAr || '—',
            firstNameEn: personal.firstNameEn || '',
            lastNameEn: personal.lastNameEn || '',
            nationalId: personal.nationalId || '—',
            dateOfBirth: personal.dateOfBirth,
            gender: personal.gender || '—',
            bloodType: personal.bloodType || '—',
            age: personal.dateOfBirth
              ? Math.floor(
                  (new Date() - new Date(personal.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)
                )
              : null,
          };
          break;
        case 'disability': {
          const d = student.disability || {};
          report.sections.disability = {
            primaryType: d.primaryType || '—',
            typeLabel: studentConfig.disabilityTypes[d.primaryType]?.label || '—',
            severity: d.severity || '—',
            severityLabel: studentConfig.severityLevels[d.severity]?.label || '—',
            diagnosisDate: d.diagnosisDate,
            disabilityPercentage: d.disabilityPercentage || 0,
            assistiveDevices: Array.isArray(d.assistiveDevices) ? d.assistiveDevices : [],
          };
          break;
        }
        case 'guardian':
          report.sections.guardian = student.guardian || {};
          break;
        case 'attendance': {
          const att = student.attendance || {};
          report.sections.attendance = {
            todayStatus: att.todayStatus || '—',
            statistics: att.statistics || {},
            streak: att.streak || 0,
          };
          break;
        }
        case 'programs':
          report.sections.programs = (student.programs || []).map(p => ({
            programType: p.programType || '—',
            programName: studentConfig.programs[p.programType]?.label || '—',
            status: p.status,
            progress: p.progress || 0,
            therapist: p.therapist?.name || '—',
            sessionsPerWeek: p.sessionsPerWeek || 0,
          }));
          break;
        case 'assessments':
          report.sections.assessments = (student.assessments || []).map(a => ({
            type: a.type,
            date: a.date,
            assessor: a.assessor?.name || '—',
            areas: (a.areas || []).map(ar => ({
              domain: ar.domain,
              score: ar.score,
              maxScore: ar.maxScore,
            })),
            recommendations: a.recommendations || [],
          }));
          break;
        case 'iep': {
          const iep = student.iep || {};
          report.sections.iep = {
            status: iep.status || '—',
            longTermGoals: iep.longTermGoals || [],
            shortTermGoals: iep.shortTermGoals || [],
            accommodations: iep.accommodations || [],
            parentConsent: iep.parentConsent || false,
          };
          break;
        }
        case 'behavior': {
          const bt = student.behaviorTracking || {};
          const log = Array.isArray(bt.behaviorLog) ? bt.behaviorLog : [];
          report.sections.behavior = {
            points: bt.points || 0,
            badges: (bt.badges || []).map(b => ({ name: b.name, earnedDate: b.earnedDate })),
            positiveCount: log.filter(b => b.type === 'positive').length,
            negativeCount: log.filter(b => b.type === 'negative').length,
            recentLog: log.slice(-10).reverse(),
          };
          break;
        }
        case 'medical': {
          const med = student.medicalHistory || {};
          report.sections.medical = {
            allergies: med.allergies || [],
            medications: (med.medications || []).filter(m => m.active !== false),
            chronicConditions: med.chronicConditions || [],
            vision: med.vision || {},
            hearing: med.hearing || {},
          };
          break;
        }
        case 'progress': {
          const prog = student.progress || {};
          report.sections.progress = {
            overall: prog.overallProgress || 0,
            skills: prog.skills || [],
            milestones: prog.milestones || [],
          };
          break;
        }
        case 'communications':
          report.sections.communications = (student.communications || [])
            .slice(-20)
            .reverse()
            .map(c => ({
              date: c.date,
              type: c.type,
              direction: c.direction,
              subject: c.subject,
              summary: c.summary,
            }));
          break;
        case 'documents':
          report.sections.documents = (student.documents || []).map(d => ({
            type: d.type,
            name: d.name,
            uploadDate: d.uploadDate,
            expiryDate: d.expiryDate,
          }));
          break;
        case 'notes':
          report.sections.notes = (student.notes || [])
            .filter(n => !n.isPrivate)
            .map(n => ({
              category: n.category,
              content: n.content,
              author: n.author?.name || '—',
              date: n.date,
            }));
          break;
        case 'ai_insights':
          report.sections.aiInsights = student.aiInsights || {};
          break;
        case 'risk': {
          const attRate = student.attendance?.statistics?.attendanceRate || 0;
          const overallProgress = student.progress?.overallProgress || 0;
          report.sections.risk = {
            attendanceRisk: attRate < 75 ? 'high' : attRate < 90 ? 'medium' : 'low',
            progressRisk: overallProgress < 30 ? 'high' : overallProgress < 60 ? 'medium' : 'low',
            overallRisk:
              attRate < 75 || overallProgress < 30
                ? 'high'
                : attRate < 90 || overallProgress < 60
                  ? 'medium'
                  : 'low',
          };
          break;
        }
      }
    }

    return report;
  }

  // ============ NEW: Report Scheduling ============

  /**
   * جدولة التقارير الآلية — إعداد تقارير دورية تلقائية
   */
  getAvailableReportSchedules() {
    return [
      {
        id: 'daily_attendance',
        name: 'تقرير الحضور اليومي',
        frequency: 'daily',
        description: 'إرسال ملخص الحضور اليومي للمركز',
      },
      {
        id: 'weekly_progress',
        name: 'تقرير التقدم الأسبوعي',
        frequency: 'weekly',
        description: 'ملخص أسبوعي لتقدم الطلاب في البرامج',
      },
      {
        id: 'monthly_comprehensive',
        name: 'التقرير الشهري الشامل',
        frequency: 'monthly',
        description: 'تقرير شامل لأداء المركز والطلاب',
      },
      {
        id: 'quarterly_parent',
        name: 'تقرير ولي الأمر الفصلي',
        frequency: 'quarterly',
        description: 'تقرير لأولياء الأمور كل 3 أشهر',
      },
      {
        id: 'semester_iep_review',
        name: 'مراجعة IEP نصف سنوية',
        frequency: 'semi-annual',
        description: 'مراجعة شاملة لخطط التدخل الفردي',
      },
      {
        id: 'annual_summary',
        name: 'التقرير السنوي',
        frequency: 'annual',
        description: 'ملخص شامل لأداء المركز والطلاب خلال العام',
      },
    ];
  }

  // ============ NEW: Dashboard Analytics ============

  /**
   * تحليلات متقدمة للوحة التحكم — بيانات إضافية للرسوم البيانية
   */
  async getDashboardAnalytics(centerId) {
    const Model = this._getModel();
    const students = await Model.find({ 'center.centerId': centerId }).lean();
    const activeStudents = students.filter(s => s.status === 'active');

    if (students.length === 0) {
      return { generatedAt: new Date().toISOString(), centerId, message: 'لا يوجد بيانات' };
    }

    // Age distribution
    const now = new Date();
    const ageDistribution = { '0-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '21+': 0 };
    students.forEach(s => {
      if (!s.personal?.dateOfBirth) return;
      const age = Math.floor(
        (now - new Date(s.personal.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (age <= 5) ageDistribution['0-5']++;
      else if (age <= 10) ageDistribution['6-10']++;
      else if (age <= 15) ageDistribution['11-15']++;
      else if (age <= 20) ageDistribution['16-20']++;
      else ageDistribution['21+']++;
    });

    // Program enrollment trends
    const programEnrollment = {};
    students.forEach(s => {
      (s.programs || []).forEach(p => {
        const type = studentConfig.programs[p.programType]?.label || p.programType || 'أخرى';
        if (!programEnrollment[type])
          programEnrollment[type] = { total: 0, active: 0, completed: 0, avgProgress: 0 };
        programEnrollment[type].total++;
        if (p.status === 'active') programEnrollment[type].active++;
        if (p.status === 'completed') programEnrollment[type].completed++;
        programEnrollment[type].avgProgress += p.progress || 0;
      });
    });
    Object.values(programEnrollment).forEach(p => {
      p.avgProgress = p.total > 0 ? Math.round(p.avgProgress / p.total) : 0;
    });

    // Achievement milestones this month
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let milestonesThisMonth = 0;
    let badgesThisMonth = 0;
    students.forEach(s => {
      (s.progress?.milestones || []).forEach(m => {
        if (m.date && new Date(m.date) >= thisMonth) milestonesThisMonth++;
      });
      (s.behaviorTracking?.badges || []).forEach(b => {
        if (b.earnedDate && new Date(b.earnedDate) >= thisMonth) badgesThisMonth++;
      });
    });

    // Attendance heatmap data (by day of week)
    const attendanceByDay = {
      الأحد: { present: 0, absent: 0, late: 0 },
      الاثنين: { present: 0, absent: 0, late: 0 },
      الثلاثاء: { present: 0, absent: 0, late: 0 },
      الأربعاء: { present: 0, absent: 0, late: 0 },
      الخميس: { present: 0, absent: 0, late: 0 },
    };
    const todayDay = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][
      now.getDay()
    ];
    if (attendanceByDay[todayDay]) {
      activeStudents.forEach(s => {
        const status = s.attendance?.todayStatus;
        if (status === 'present') attendanceByDay[todayDay].present++;
        else if (status === 'absent') attendanceByDay[todayDay].absent++;
        else if (status === 'late') attendanceByDay[todayDay].late++;
      });
    }

    // Risk distribution
    const riskDistribution = { high: 0, medium: 0, low: 0 };
    activeStudents.forEach(s => {
      const att = s.attendance?.statistics?.attendanceRate || 0;
      const prog = s.progress?.overallProgress || 0;
      if (att < 70 || prog < 25) riskDistribution.high++;
      else if (att < 85 || prog < 50) riskDistribution.medium++;
      else riskDistribution.low++;
    });

    // IEP coverage
    const studentsWithIEP = activeStudents.filter(
      s => s.iep && (s.iep.longTermGoals?.length > 0 || s.iep.shortTermGoals?.length > 0)
    ).length;
    const iepCoverage =
      activeStudents.length > 0 ? Math.round((studentsWithIEP / activeStudents.length) * 100) : 0;

    // Behavior summary
    let totalPositive = 0,
      totalNegative = 0;
    activeStudents.forEach(s => {
      const log = s.behaviorTracking?.behaviorLog || [];
      totalPositive += log.filter(b => b.type === 'positive').length;
      totalNegative += log.filter(b => b.type === 'negative').length;
    });

    return {
      generatedAt: new Date().toISOString(),
      centerId,
      totals: {
        students: students.length,
        active: activeStudents.length,
        graduated: students.filter(s => s.status === 'graduated').length,
        waiting: students.filter(s => s.status === 'waiting').length,
      },
      ageDistribution: Object.entries(ageDistribution).map(([range, count]) => ({ range, count })),
      programEnrollment: Object.entries(programEnrollment).map(([name, data]) => ({
        name,
        ...data,
      })),
      achievements: { milestonesThisMonth, badgesThisMonth },
      attendanceByDay: Object.entries(attendanceByDay).map(([day, data]) => ({ day, ...data })),
      riskDistribution,
      iep: { coverage: iepCoverage, studentsWithIEP, totalActive: activeStudents.length },
      behavior: {
        totalPositive,
        totalNegative,
        ratio:
          totalPositive + totalNegative > 0
            ? Math.round((totalPositive / (totalPositive + totalNegative)) * 100)
            : 100,
      },
    };
  }

  // ============ NEW: Export Report Data ============

  /**
   * تصدير بيانات التقرير — JSON/CSV compatible format
   */
  async exportReportData(centerId, format = 'json') {
    const Model = this._getModel();
    const students = await Model.find({ 'center.centerId': centerId, status: 'active' }).lean();

    const exportData = students.map(s => ({
      studentId: s.studentId,
      enrollmentNumber: s.enrollmentNumber || '',
      firstNameAr: s.personal?.firstNameAr || '',
      lastNameAr: s.personal?.lastNameAr || '',
      nationalId: s.personal?.nationalId || '',
      dateOfBirth: s.personal?.dateOfBirth
        ? new Date(s.personal.dateOfBirth).toISOString().split('T')[0]
        : '',
      gender: s.personal?.gender || '',
      disabilityType:
        studentConfig.disabilityTypes[s.disability?.primaryType]?.label ||
        s.disability?.primaryType ||
        '',
      severity:
        studentConfig.severityLevels[s.disability?.severity]?.label || s.disability?.severity || '',
      status: s.status || '',
      centerName: s.center?.centerName || '',
      enrollmentDate: s.center?.enrollmentDate
        ? new Date(s.center.enrollmentDate).toISOString().split('T')[0]
        : '',
      attendanceRate: s.attendance?.statistics?.attendanceRate || 0,
      overallProgress: s.progress?.overallProgress || 0,
      totalPrograms: (s.programs || []).length,
      activePrograms: (s.programs || []).filter(p => p.status === 'active').length,
      behaviorPoints: s.behaviorTracking?.points || 0,
      iepStatus: s.iep?.status || 'none',
      fatherMobile: s.guardian?.father?.mobile || '',
      motherMobile: s.guardian?.mother?.mobile || '',
    }));

    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [headers.join(',')];
      exportData.forEach(row => {
        csvRows.push(
          headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',')
        );
      });
      return { format: 'csv', data: csvRows.join('\n'), count: exportData.length };
    }

    return { format: 'json', data: exportData, count: exportData.length };
  }
}

// Singleton
const studentService = new StudentService();

module.exports = {
  StudentService,
  studentService,
  studentConfig,
};
