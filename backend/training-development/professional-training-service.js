/* eslint-disable no-unused-vars */
/**
 * نظام التدريب والتطوير المهني
 * Professional Training & Development Service
 *
 * يتضمن:
 * - إدارة برامج التدريب
 * - تتبع الكفاءات والمهارات
 * - إدارة الشهادات والاعتمادات
 * - التطوير المهني للموظفين
 * - التدريب المستمر للمستفيدين
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================================
// النماذج (Models)
// ============================================

// نموذج البرنامج التدريبي
const trainingProgramSchema = new Schema(
  {
    programCode: { type: String, unique: true, required: true },

    // معلومات البرنامج
    programInfo: {
      name: { type: String, required: true },
      nameAr: { type: String, required: true },
      description: String,
      descriptionAr: String,
      type: {
        type: String,
        enum: ['initial', 'continuing', 'specialized', 'leadership', 'technical'],
      },
      category: String,
      level: { type: String, enum: ['basic', 'intermediate', 'advanced', 'expert'] },
    },

    // المحتوى
    curriculum: {
      objectives: [String],
      modules: [
        {
          order: Number,
          title: String,
          titleAr: String,
          duration: Number, // بالساعات
          topics: [String],
          deliveryMethod: {
            type: String,
            enum: ['classroom', 'online', 'blended', 'on_job', 'workshop'],
          },
          resources: [String],
          assessment: {
            type: { type: String, enum: ['quiz', 'project', 'practical', 'oral', 'written'] },
            passingScore: Number,
          },
        },
      ],
      totalHours: Number,
      practicalHours: Number,
      theoreticalHours: Number,
    },

    // المتطلبات
    prerequisites: {
      programs: [{ type: Schema.Types.ObjectId, ref: 'TrainingProgram' }],
      skills: [String],
      qualifications: [String],
      experience: Number, // بالسنوات
    },

    // الفئة المستهدفة
    targetAudience: {
      roles: [String],
      departments: [String],
      experienceLevel: { type: String, enum: ['entry', 'junior', 'mid', 'senior', 'all'] },
      maxParticipants: Number,
      minParticipants: Number,
    },

    // الجدول
    schedule: {
      duration: Number, // بالأيام
      sessions: [
        {
          day: Number,
          startTime: String,
          endTime: String,
          topics: [String],
          instructor: { type: Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      frequency: { type: String, enum: ['daily', 'weekly', 'weekend', 'custom'] },
    },

    // المدرّبون
    instructors: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['primary', 'assistant', 'guest'] },
        expertise: [String],
        certification: String,
      },
    ],

    // التكلفة
    cost: {
      internal: Number,
      external: Number,
      materials: Number,
      certification: Number,
      currency: { type: String, default: 'SAR' },
    },

    // الاعتماد
    accreditation: {
      isAccredited: { type: Boolean, default: false },
      accreditingBody: String,
      creditHours: Number,
      cmePoints: Number,
      validUntil: Date,
    },

    // التقييم
    evaluation: {
      preAssessment: { type: Boolean, default: false },
      postAssessment: { type: Boolean, default: true },
      followUpDays: Number,
      evaluationCriteria: [
        {
          criterion: String,
          weight: Number,
          passingScore: Number,
        },
      ],
    },

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'approved', 'active', 'archived', 'under_review'],
      default: 'draft',
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج الدورة التدريبية
const trainingCourseSchema = new Schema(
  {
    courseCode: { type: String, unique: true, required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'TrainingProgram', required: true },

    // معلومات الدورة
    courseInfo: {
      name: String,
      batch: Number,
      venue: String,
      format: { type: String, enum: ['in_person', 'virtual', 'hybrid'] },
    },

    // التواريخ
    dates: {
      registrationStart: Date,
      registrationEnd: Date,
      startDate: Date,
      endDate: Date,
      actualEndDate: Date,
    },

    // المشاركون
    participants: {
      registered: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      confirmed: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      attended: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      completed: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      waitlist: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },

    // المدرّبون المعيّنون
    assignedInstructors: [
      {
        instructor: { type: Schema.Types.ObjectId, ref: 'User' },
        modules: [Number],
        status: { type: String, enum: ['assigned', 'confirmed', 'declined'] },
      },
    ],

    // الجدول الفعلي
    actualSchedule: [
      {
        date: Date,
        startTime: String,
        endTime: String,
        module: Number,
        instructor: { type: Schema.Types.ObjectId, ref: 'User' },
        venue: String,
        status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'] },
        attendanceCount: Number,
      },
    ],

    // المواد
    materials: [
      {
        name: String,
        type: {
          type: String,
          enum: ['document', 'video', 'presentation', 'exercise', 'reference'],
        },
        url: String,
        distributedAt: Date,
      },
    ],

    // الحالة
    status: {
      type: String,
      enum: ['planning', 'registration', 'in_progress', 'completed', 'cancelled'],
      default: 'planning',
    },

    // التقييم
    feedback: {
      responseRate: Number,
      averageRating: Number,
      comments: [String],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج التسجيل التدريبي
const trainingEnrollmentSchema = new Schema(
  {
    enrollmentCode: { type: String, unique: true, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'TrainingCourse', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // معلومات التسجيل
    registration: {
      registeredAt: { type: Date, default: Date.now },
      registeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'waitlisted', 'cancelled'],
        default: 'pending',
      },
      approvalDate: Date,
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      rejectionReason: String,
    },

    // الحضور
    attendance: {
      sessionsAttended: Number,
      sessionsMissed: Number,
      totalSessions: Number,
      attendanceRate: Number,
      details: [
        {
          date: Date,
          session: Number,
          status: { type: String, enum: ['present', 'absent', 'late', 'excused'] },
          checkInTime: String,
          checkOutTime: String,
          notes: String,
        },
      ],
    },

    // التقييمات
    assessments: [
      {
        type: { type: String, enum: ['pre', 'post', 'quiz', 'project', 'practical', 'final'] },
        name: String,
        date: Date,
        score: Number,
        maxScore: Number,
        percentage: Number,
        passed: Boolean,
        feedback: String,
        gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // النتائج
    results: {
      preTestScore: Number,
      postTestScore: Number,
      improvement: Number,
      practicalScore: Number,
      finalScore: Number,
      grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F', 'pass', 'fail'] },
      passed: Boolean,
      completionDate: Date,
      certificateIssued: { type: Boolean, default: false },
      certificateNumber: String,
    },

    // التغذية الراجعة
    feedback: {
      submittedAt: Date,
      ratings: {
        content: Number,
        instructor: Number,
        materials: Number,
        venue: Number,
        overall: Number,
      },
      strengths: [String],
      improvements: [String],
      wouldRecommend: Boolean,
      additionalComments: String,
    },

    // المهارات المكتسبة
    skillsAcquired: [
      {
        skill: String,
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
        verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: Date,
      },
    ],

    notes: String,

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج الكفاءة
const competencySchema = new Schema(
  {
    code: { type: String, unique: true, required: true },

    // معلومات الكفاءة
    competencyInfo: {
      name: { type: String, required: true },
      nameAr: { type: String, required: true },
      description: String,
      category: {
        type: String,
        enum: ['clinical', 'technical', 'behavioral', 'leadership', 'administrative'],
      },
      domain: String,
    },

    // المستويات
    levels: [
      {
        level: { type: String, enum: ['novice', 'beginner', 'intermediate', 'advanced', 'expert'] },
        description: String,
        behaviors: [String],
        knowledge: [String],
        skills: [String],
      },
    ],

    // التقييم
    assessment: {
      methods: [
        {
          type: String,
          enum: ['observation', 'test', 'portfolio', 'interview', 'simulation', 'peer_review'],
        },
      ],
      criteria: [
        {
          criterion: String,
          indicators: [String],
          weight: Number,
        },
      ],
      requiredEvidence: [String],
    },

    // الربط بالوظائف
    jobMapping: [
      {
        role: String,
        requiredLevel: String,
        importance: { type: String, enum: ['essential', 'important', 'desirable'] },
      },
    ],

    // التطوير
    development: {
      trainingPrograms: [{ type: Schema.Types.ObjectId, ref: 'TrainingProgram' }],
      resources: [String],
      typicalDuration: Number, // بالأيام
    },

    // التجديد
    renewal: {
      required: { type: Boolean, default: false },
      validityPeriod: Number, // بالأشهر
      renewalRequirements: [String],
    },

    status: { type: String, enum: ['active', 'inactive', 'under_review'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج شهادة الموظف
const employeeCertificationSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    competencyId: { type: Schema.Types.ObjectId, ref: 'Competency' },

    // معلومات الشهادة
    certification: {
      name: { type: String, required: true },
      issuingBody: String,
      type: { type: String, enum: ['internal', 'external', 'professional', 'academic'] },
      level: String,
      certificateNumber: String,
    },

    // التواريخ
    dates: {
      issued: { type: Date, default: Date.now },
      validFrom: Date,
      validUntil: Date,
      lastRenewed: Date,
    },

    // التفاصيل
    details: {
      score: Number,
      grade: String,
      expiryType: { type: String, enum: ['permanent', 'time_limited', 'renewable'] },
      renewalRequirements: [String],
      attachmentUrl: String,
    },

    // التحقق
    verification: {
      verified: { type: Boolean, default: false },
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: Date,
      status: { type: String, enum: ['pending', 'verified', 'rejected', 'expired'] },
    },

    // التجديد
    renewal: {
      isRenewable: { type: Boolean, default: true },
      renewalDue: Date,
      renewalReminder: Date,
      renewalStatus: { type: String, enum: ['not_due', 'due_soon', 'overdue', 'renewed'] },
    },

    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// إنشاء النماذج
const TrainingProgram = mongoose.model('TrainingProgram', trainingProgramSchema);
const TrainingCourse = mongoose.model('TrainingCourse', trainingCourseSchema);
const TrainingEnrollment = mongoose.model('TrainingEnrollment', trainingEnrollmentSchema);
const Competency = mongoose.model('Competency', competencySchema);
const EmployeeCertification = mongoose.model('EmployeeCertification', employeeCertificationSchema);

// ============================================
// خدمة التدريب والتطوير
// ============================================

class ProfessionalTrainingService {
  // ====================
  // البرامج التدريبية
  // ====================

  /**
   * إنشاء برنامج تدريبي
   */
  async createTrainingProgram(programData) {
    try {
      const programCode = await this.generateProgramCode(programData.programInfo.type);

      const program = new TrainingProgram({
        ...programData,
        programCode,
      });

      await program.save();
      return program;
    } catch (error) {
      throw new Error(`خطأ في إنشاء البرنامج التدريبي: ${error.message}`);
    }
  }

  /**
   * توليد كود البرنامج
   */
  async generateProgramCode(type) {
    const prefixes = {
      initial: 'TRN-INI',
      continuing: 'TRN-CON',
      specialized: 'TRN-SPE',
      leadership: 'TRN-LED',
      technical: 'TRN-TEC',
    };

    const year = new Date().getFullYear();
    const count = await TrainingProgram.countDocuments({
      'programInfo.type': type,
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
    });

    return `${prefixes[type]}-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  /**
   * الحصول على البرامج المتاحة
   */
  async getAvailablePrograms(filters = {}) {
    const programs = await TrainingProgram.find({
      status: 'active',
      ...filters,
    });

    return programs;
  }

  // ====================
  // الدورات التدريبية
  // ====================

  /**
   * إنشاء دورة تدريبية
   */
  async createTrainingCourse(courseData) {
    try {
      const courseCode = await this.generateCourseCode(courseData.programId);

      const course = new TrainingCourse({
        ...courseData,
        courseCode,
        status: 'planning',
      });

      await course.save();
      return course;
    } catch (error) {
      throw new Error(`خطأ في إنشاء الدورة التدريبية: ${error.message}`);
    }
  }

  /**
   * توليد كود الدورة
   */
  async generateCourseCode(programId) {
    const program = await TrainingProgram.findById(programId);
    const count = await TrainingCourse.countDocuments({ programId });

    return `${program.programCode}-B${String(count + 1).padStart(2, '0')}`;
  }

  /**
   * تسجيل مشارك
   */
  async enrollParticipant(courseId, userId, registeredBy) {
    try {
      const course = await TrainingCourse.findById(courseId);
      if (!course) {
        throw new Error('الدورة غير موجودة');
      }

      // التحقق من السعة
      if (course.participants.registered.length >= course.maxParticipants) {
        // إضافة لقائمة الانتظار
        course.participants.waitlist.push(userId);
        await course.save();

        return { waitlisted: true, message: 'تم الإضافة لقائمة الانتظار' };
      }

      // إنشاء تسجيل
      const enrollmentCode = await this.generateEnrollmentCode();

      const enrollment = new TrainingEnrollment({
        enrollmentCode,
        courseId,
        userId,
        registration: {
          registeredAt: new Date(),
          registeredBy,
          status: 'pending',
        },
        attendance: {
          totalSessions: course.actualSchedule.length,
        },
      });

      await enrollment.save();

      // تحديث قائمة المشاركين
      course.participants.registered.push(userId);
      await course.save();

      return { enrollment, course };
    } catch (error) {
      throw new Error(`خطأ في تسجيل المشارك: ${error.message}`);
    }
  }

  /**
   * توليد كود التسجيل
   */
  async generateEnrollmentCode() {
    const date = new Date();
    const year = date.getFullYear();
    const count = await TrainingEnrollment.countDocuments({
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
    });

    return `ENR-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * تسجيل الحضور
   */
  async recordAttendance(enrollmentId, sessionId, status, notes = '') {
    try {
      const enrollment = await TrainingEnrollment.findById(enrollmentId);
      if (!enrollment) {
        throw new Error('التسجيل غير موجود');
      }

      const course = await TrainingCourse.findById(enrollment.courseId);
      const session = course.actualSchedule[sessionId];

      // إضافة سجل الحضور
      enrollment.attendance.details.push({
        date: session.date,
        session: sessionId,
        status,
        notes,
        checkInTime: new Date().toLocaleTimeString(),
      });

      // تحديث الإحصائيات
      enrollment.attendance.sessionsAttended = enrollment.attendance.details.filter(
        d => d.status === 'present' || d.status === 'late'
      ).length;
      enrollment.attendance.sessionsMissed = enrollment.attendance.details.filter(
        d => d.status === 'absent'
      ).length;
      enrollment.attendance.attendanceRate =
        (enrollment.attendance.sessionsAttended / enrollment.attendance.totalSessions) * 100;

      await enrollment.save();
      return enrollment;
    } catch (error) {
      throw new Error(`خطأ في تسجيل الحضور: ${error.message}`);
    }
  }

  /**
   * إضافة نتيجة تقييم
   */
  async addAssessmentResult(enrollmentId, assessmentData) {
    try {
      const enrollment = await TrainingEnrollment.findById(enrollmentId);
      if (!enrollment) {
        throw new Error('التسجيل غير موجود');
      }

      const assessment = {
        ...assessmentData,
        gradedBy: assessmentData.gradedBy,
        percentage: (assessmentData.score / assessmentData.maxScore) * 100,
        passed: (assessmentData.score / assessmentData.maxScore) * 100 >= 60,
      };

      enrollment.assessments.push(assessment);

      // تحديث النتائج
      await this.updateResults(enrollment);

      await enrollment.save();
      return enrollment;
    } catch (error) {
      throw new Error(`خطأ في إضافة نتيجة التقييم: ${error.message}`);
    }
  }

  /**
   * تحديث النتائج
   */
  async updateResults(enrollment) {
    const assessments = enrollment.assessments;

    const preTest = assessments.find(a => a.type === 'pre');
    const postTest = assessments.find(a => a.type === 'post');
    const final = assessments.find(a => a.type === 'final');
    const practical = assessments.find(a => a.type === 'practical');

    if (preTest) enrollment.results.preTestScore = preTest.percentage;
    if (postTest) enrollment.results.postTestScore = postTest.percentage;
    if (preTest && postTest) {
      enrollment.results.improvement = postTest.percentage - preTest.percentage;
    }
    if (practical) enrollment.results.practicalScore = practical.percentage;
    if (final) enrollment.results.finalScore = final.percentage;

    // تحديد الدرجة
    if (enrollment.results.finalScore) {
      const score = enrollment.results.finalScore;
      enrollment.results.grade =
        score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
      enrollment.results.passed = score >= 60;
    }
  }

  /**
   * إصدار شهادة
   */
  async issueCertificate(enrollmentId) {
    try {
      const enrollment = await TrainingEnrollment.findById(enrollmentId);
      if (!enrollment) {
        throw new Error('التسجيل غير موجود');
      }

      if (!enrollment.results.passed) {
        throw new Error('لم يتم اجتياز الدورة');
      }

      const certificateNumber = await this.generateCertificateNumber(enrollment);

      enrollment.results.certificateIssued = true;
      enrollment.results.certificateNumber = certificateNumber;
      enrollment.results.completionDate = new Date();

      await enrollment.save();
      return enrollment;
    } catch (error) {
      throw new Error(`خطأ في إصدار الشهادة: ${error.message}`);
    }
  }

  /**
   * توليد رقم الشهادة
   */
  async generateCertificateNumber(enrollment) {
    const course = await TrainingCourse.findById(enrollment.courseId);
    const year = new Date().getFullYear();

    return `CERT-${course.courseCode}-${year}-${String(enrollment._id).slice(-6).toUpperCase()}`;
  }

  // ====================
  // الكفاءات
  // ====================

  /**
   * إنشاء كفاءة
   */
  async createCompetency(competencyData) {
    try {
      const code = await this.generateCompetencyCode(competencyData.competencyInfo.category);

      const competency = new Competency({
        ...competencyData,
        code,
      });

      await competency.save();
      return competency;
    } catch (error) {
      throw new Error(`خطأ في إنشاء الكفاءة: ${error.message}`);
    }
  }

  /**
   * توليد كود الكفاءة
   */
  async generateCompetencyCode(category) {
    const prefixes = {
      clinical: 'COMP-CL',
      technical: 'COMP-TE',
      behavioral: 'COMP-BE',
      leadership: 'COMP-LE',
      administrative: 'COMP-AD',
    };

    const count = await Competency.countDocuments({ 'competencyInfo.category': category });
    return `${prefixes[category]}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * تقييم كفاءة موظف
   */
  async assessEmployeeCompetency(employeeId, competencyId, assessmentData) {
    try {
      const existingCert = await EmployeeCertification.findOne({
        employeeId,
        competencyId,
      });

      if (existingCert) {
        // تحديث التقييم
        existingCert.details.score = assessmentData.score;
        existingCert.details.grade = assessmentData.grade;
        existingCert.verification.verified = true;
        existingCert.verification.verifiedAt = new Date();
        existingCert.verification.verifiedBy = assessmentData.assessedBy;
        existingCert.dates.lastRenewed = new Date();

        await existingCert.save();
        return existingCert;
      }

      // إنشاء شهادة جديدة
      const competency = await Competency.findById(competencyId);

      const certification = new EmployeeCertification({
        employeeId,
        competencyId,
        certification: {
          name: competency.competencyInfo.nameAr,
          issuingBody: 'مركز التأهيل',
          type: 'internal',
          level: assessmentData.level,
        },
        dates: {
          issued: new Date(),
          validFrom: new Date(),
          validUntil: competency.renewal.required
            ? new Date(Date.now() + competency.renewal.validityPeriod * 30 * 24 * 60 * 60 * 1000)
            : null,
        },
        details: {
          score: assessmentData.score,
          grade: assessmentData.grade,
          expiryType: competency.renewal.required ? 'renewable' : 'permanent',
        },
        verification: {
          verified: true,
          verifiedBy: assessmentData.assessedBy,
          verifiedAt: new Date(),
        },
        renewal: {
          isRenewable: competency.renewal.required,
          renewalDue: competency.renewal.required
            ? new Date(Date.now() + competency.renewal.validityPeriod * 30 * 24 * 60 * 60 * 1000)
            : null,
        },
      });

      await certification.save();
      return certification;
    } catch (error) {
      throw new Error(`خطأ في تقييم الكفاءة: ${error.message}`);
    }
  }

  /**
   * الحصول على كفاءات الموظف
   */
  async getEmployeeCompetencies(employeeId) {
    const certifications = await EmployeeCertification.find({ employeeId }).populate(
      'competencyId'
    );

    return certifications;
  }

  /**
   * تقرير التدريب
   */
  async getTrainingReport(filters = {}) {
    const courses = await TrainingCourse.find(filters).populate('programId');

    const report = {
      totalCourses: courses.length,
      byStatus: {},
      totalParticipants: 0,
      averageAttendance: 0,
      completionRate: 0,
    };

    courses.forEach(course => {
      report.byStatus[course.status] = (report.byStatus[course.status] || 0) + 1;
      report.totalParticipants += course.participants.completed.length;
    });

    return report;
  }

  /**
   * تقرير احتياجات التدريب
   */
  async getTrainingNeedsAnalysis(_departmentId = null) {
    // تحليل الفجوات في الكفاءات
    const report = {
      competencyGaps: [],
      recommendedPrograms: [],
      priorityAreas: [],
      estimatedBudget: 0,
    };

    return report;
  }

  /**
   * فحص الشهادات المنتهية
   */
  async checkExpiringCertifications() {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const expiring = await EmployeeCertification.find({
      'renewal.renewalDue': { $lte: thirtyDaysFromNow },
      'renewal.renewalStatus': { $ne: 'renewed' },
    })
      .populate('employeeId')
      .populate('competencyId');

    return expiring;
  }
}

// تصدير
module.exports = {
  ProfessionalTrainingService,
  TrainingProgram,
  TrainingCourse,
  TrainingEnrollment,
  Competency,
  EmployeeCertification,
};
