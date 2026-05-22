'use strict';

/**
 * student-schema.js — extracted from students/student-service.js.
 *
 * Mongoose schema definition + index declarations. No virtuals, no
 * instance methods, no statics, no pre/post hooks — pure schema. The
 * model itself is registered lazily inside StudentService.constructor
 * via mongoose.model('Student', StudentSchema), so this file just
 * exports the schema for the service to consume.
 *
 * Depends on student-config.js for enum values (disabilityTypes,
 * severityLevels, programs, shifts, weekDays, studentStatuses).
 */

const mongoose = require('mongoose');
const { studentConfig } = require('./student-config');

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

module.exports = { StudentSchema };
