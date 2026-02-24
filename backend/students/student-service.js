/**
 * Comprehensive Student Management Service
 * خدمة إدارة الطلاب الشاملة والمتكاملة لمراكز التأهيل
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

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
      subtypes: ['شلل سفلي', 'شلل رباعي', 'بتر', 'ضمور عضلي', 'شلل دماغي']
    },
    visual: { 
      label: 'إعاقة بصرية', 
      code: 'VI',
      subtypes: ['كفيف', 'ضعف بصر شديد', 'ضعف بصر متوسط']
    },
    hearing: { 
      label: 'إعاقة سمعية', 
      code: 'HI',
      subtypes: ['صمم كامل', 'ضعف سمع شديد', 'ضعف سمع متوسط']
    },
    intellectual: { 
      label: 'إعاقة ذهنية', 
      code: 'ID',
      subtypes: ['بسيطة', 'متوسطة', 'شديدة', 'شديدة جداً']
    },
    autism: { 
      label: 'اضطراب طيف التوحد', 
      code: 'ASD',
      subtypes: ['مستوى 1', 'مستوى 2', 'مستوى 3']
    },
    learning: { 
      label: 'صعوبات تعلم', 
      code: 'LD',
      subtypes: ['ديسليكسيا', 'ديسكالكوليا', 'ديسجرافيا', 'ADHD']
    },
    speech: { 
      label: 'اضطرابات نطق ولغة', 
      code: 'SL',
      subtypes: ['تأخر لغوي', 'لثغة', 'تلعثم', 'حبسة']
    },
    multiple: { 
      label: 'إعاقات متعددة', 
      code: 'MD',
      subtypes: ['متعددة']
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
const StudentSchema = new mongoose.Schema({
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
    assistiveDevices: [{
      type: String,
      brand: String,
      serialNumber: String,
      providedBy: String,
      providedDate: Date,
    }],
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
  programs: [{
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
  }],
  
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
    authorizedPickup: [{
      name: String,
      relation: String,
      nationalId: String,
      mobile: String,
      photo: String,
      authorized: { type: Boolean, default: true },
    }],
  },
  
  // التاريخ الطبي
  medicalHistory: {
    allergies: [{
      type: { type: String, enum: ['food', 'medication', 'environmental'] },
      name: String,
      severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
      reaction: String,
    }],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      prescribedBy: String,
      startDate: Date,
      endDate: Date,
      active: Boolean,
    }],
    chronicConditions: [String],
    surgeries: [{
      name: String,
      date: Date,
      hospital: String,
      notes: String,
    }],
    hospitalizations: [{
      reason: String,
      date: Date,
      duration: Number,
      hospital: String,
    }],
    immunizations: [{
      vaccine: String,
      date: Date,
      nextDue: Date,
    }],
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
  assessments: [{
    assessmentId: String,
    type: { type: String, enum: ['initial', 'periodic', 'final', 'special'] },
    date: Date,
    assessor: {
      id: String,
      name: String,
      specialization: String,
    },
    areas: [{
      domain: String,
      score: Number,
      maxScore: Number,
      level: String,
      notes: String,
    }],
    recommendations: [String],
    nextAssessmentDate: Date,
    reportFile: String,
  }],
  
  // خطة التدخل الفردي (IEP)
  iep: {
    iepId: String,
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ['draft', 'active', 'review', 'completed'] },
    team: [{
      memberId: String,
      name: String,
      role: String,
    }],
    longTermGoals: [{
      goalId: String,
      description: String,
      targetDate: Date,
      status: { type: String, enum: ['not_started', 'in_progress', 'achieved', 'modified'] },
      progress: Number,
    }],
    shortTermGoals: [{
      goalId: String,
      longTermGoalId: String,
      description: String,
      targetDate: Date,
      status: String,
      progress: Number,
      strategies: [String],
    }],
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
    milestones: [{
      milestoneId: String,
      title: String,
      description: String,
      date: Date,
      category: String,
    }],
    skills: [{
      skill: String,
      level: { type: String, enum: ['beginner', 'developing', 'proficient', 'advanced'] },
      lastAssessed: Date,
    }],
    behavior: {
      rating: { type: Number, min: 1, max: 5 },
      notes: String,
      incidents: [{
        date: Date,
        type: String,
        description: String,
        action: String,
      }],
    },
  },
  
  // الوثائق
  documents: [{
    documentId: String,
    type: { type: String, enum: ['medical_report', 'assessment', 'iep', 'certificate', 'photo', 'consent', 'other'] },
    name: String,
    description: String,
    fileUrl: String,
    uploadDate: Date,
    uploadedBy: String,
    expiryDate: Date,
  }],
  
  // الملاحظات
  notes: [{
    noteId: String,
    date: Date,
    author: { id: String, name: String, role: String },
    category: String,
    content: String,
    isPrivate: { type: Boolean, default: false },
    attachments: [String],
  }],
  
  // السلوك والمكافآت
  behaviorTracking: {
    points: { type: Number, default: 0 },
    badges: [{
      badgeId: String,
      name: String,
      description: String,
      earnedDate: Date,
      icon: String,
    }],
    rewards: [{
      rewardId: String,
      name: String,
      pointsCost: Number,
      redeemedDate: Date,
    }],
    behaviorLog: [{
      date: Date,
      behavior: String,
      points: Number,
      type: { type: String, enum: ['positive', 'negative'] },
      notes: String,
      recordedBy: String,
    }],
  },
  
  // الاتصالات
  communications: [{
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
  }],
  
  // الحالة
  status: {
    type: String,
    enum: Object.keys(studentConfig.studentStatuses),
    default: 'active',
  },
  
  // الإحالات
  referrals: [{
    referralId: String,
    fromCenter: String,
    toCenter: String,
    reason: String,
    date: Date,
    status: String,
    notes: String,
  }],
  
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
}, {
  collection: 'students',
});

// Indexes
StudentSchema.index({ studentId: 1 });
StudentSchema.index({ 'personal.nationalId': 1 }, { sparse: true });
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
    console.log('✅ Student Service initialized');
  }
  
  // ============ CRUD Operations ============
  
  async createStudent(data) {
    const studentId = `STU-${Date.now()}`;
    const enrollmentNumber = await this.generateEnrollmentNumber(data.center?.centerId);
    const barcode = await this.generateBarcode();
    
    const student = await this.Student.create({
      ...data,
      studentId,
      enrollmentNumber,
      barcode,
    });
    
    this.emit('student:created', student);
    return student;
  }
  
  async generateEnrollmentNumber(centerId) {
    const year = new Date().getFullYear();
    const count = await this.Student.countDocuments({ 'center.centerId': centerId });
    return `${centerId}-${year}-${(count + 1).toString().padStart(4, '0')}`;
  }
  
  async generateBarcode() {
    return `BC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  
  async getStudent(studentId) {
    return this.Student.findOne({ studentId });
  }
  
  async getStudentByNationalId(nationalId) {
    return this.Student.findOne({ 'personal.nationalId': nationalId });
  }
  
  async getStudentsByCenter(centerId, options = {}) {
    const filter = { 'center.centerId': centerId };
    if (options.status) filter.status = options.status;
    if (options.disabilityType) filter['disability.primaryType'] = options.disabilityType;
    
    return this.Student.find(filter)
      .sort({ createdAt: -1 })
      .limit(options.limit || 100)
      .skip(options.skip || 0);
  }
  
  async getStudentsByBranch(branchId) {
    return this.Student.find({ 'center.branchId': branchId, status: 'active' });
  }
  
  async updateStudent(studentId, updateData) {
    const student = await this.Student.findOneAndUpdate(
      { studentId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    
    if (student) this.emit('student:updated', student);
    return student;
  }
  
  async deleteStudent(studentId) {
    const student = await this.Student.findOneAndDelete({ studentId });
    if (student) this.emit('student:deleted', student);
    return student;
  }
  
  // ============ Attendance ============
  
  async recordAttendance(studentId, status, notes = '') {
    const student = await this.Student.findOne({ studentId });
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
    student.attendance.statistics.attendanceRate = 
      Math.round(((present + late) / totalDays) * 100);
    
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
        results.push({ studentId, success: false, error: error.message });
      }
    }
    return results;
  }
  
  // ============ Programs ============
  
  async enrollProgram(studentId, programData) {
    const programId = `PRG-${Date.now()}`;
    const student = await this.Student.findOne({ studentId });
    if (!student) throw new Error('Student not found');
    
    student.programs.push({ ...programData, programId, status: 'active' });
    await student.save();
    
    this.emit('program:enrolled', { studentId, programId });
    return student;
  }
  
  async updateProgramProgress(studentId, programId, progress) {
    const student = await this.Student.findOne({ studentId });
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
    const student = await this.Student.findOne({ studentId });
    if (!student) throw new Error('Student not found');
    
    student.assessments.push({ ...assessmentData, assessmentId });
    await student.save();
    
    this.emit('assessment:added', { studentId, assessmentId });
    return student;
  }
  
  // ============ IEP ============
  
  async createIEP(studentId, iepData) {
    const iepId = `IEP-${Date.now()}`;
    const student = await this.Student.findOne({ studentId });
    if (!student) throw new Error('Student not found');
    
    student.iep = { ...iepData, iepId, status: 'draft' };
    await student.save();
    
    this.emit('iep:created', { studentId, iepId });
    return student;
  }
  
  async updateIEPGoal(studentId, goalId, progress, status) {
    const student = await this.Student.findOne({ studentId });
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
    const student = await this.Student.findOne({ studentId });
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
    const student = await this.Student.findOne({ studentId });
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
    const student = await this.Student.findOne({ studentId });
    if (!student) throw new Error('Student not found');
    
    student.documents.push({ ...documentData, documentId, uploadDate: new Date() });
    await student.save();
    
    return student;
  }
  
  // ============ Notes ============
  
  async addNote(studentId, noteData) {
    const noteId = `NOTE-${Date.now()}`;
    const student = await this.Student.findOne({ studentId });
    if (!student) throw new Error('Student not found');
    
    student.notes.push({ ...noteData, noteId, date: new Date() });
    await student.save();
    
    return student;
  }
  
  // ============ Communications ============
  
  async addCommunication(studentId, commData) {
    const communicationId = `COMM-${Date.now()}`;
    const student = await this.Student.findOne({ studentId });
    if (!student) throw new Error('Student not found');
    
    student.communications.push({ ...commData, communicationId, date: new Date() });
    await student.save();
    
    return student;
  }
  
  // ============ AI Insights ============
  
  async generateAIInsights(studentId) {
    const student = await this.Student.findOne({ studentId });
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
  
  // ============ Statistics ============
  
  async getStatistics(centerId) {
    const [total, byStatus, byDisability, byGender] = await Promise.all([
      this.Student.countDocuments({ 'center.centerId': centerId }),
      this.Student.aggregate([
        { $match: { 'center.centerId': centerId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.Student.aggregate([
        { $match: { 'center.centerId': centerId } },
        { $group: { _id: '$disability.primaryType', count: { $sum: 1 } } },
      ]),
      this.Student.aggregate([
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
    return this.Student.aggregate([
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
    return this.Student.aggregate([
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
}

// Singleton
const studentService = new StudentService();

module.exports = {
  StudentService,
  studentService,
  studentConfig,
};