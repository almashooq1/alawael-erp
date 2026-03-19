/* eslint-disable no-unused-vars */
/**
 * نظام التأهيل الافتراضي المتقدم
 * Advanced Telehealth/Tele-rehabilitation Service
 *
 * يتضمن:
 * - جلسات العلاج عن بُعد
 * - التقييم البصري الذكي
 * - المراقبة عن بعد
 * - التمارين المنزلية التفاعلية
 * - التواصل المرئي والصوتي
 * - التكامل مع الأجهزة القابلة للارتداء
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================================
// النماذج (Models)
// ============================================

// نموذج جلسة التأهيل عن بعد
const teleRehabSessionSchema = new Schema(
  {
    sessionCode: { type: String, unique: true, required: true },

    // معلومات الجلسة
    sessionInfo: {
      beneficiaryId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      therapistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      sessionType: {
        type: String,
        enum: ['assessment', 'therapy', 'follow_up', 'training', 'consultation'],
      },
      serviceType: {
        type: String,
        enum: [
          'physical_therapy',
          'occupational_therapy',
          'speech_therapy',
          'psychological',
          'special_education',
          'vocational',
        ],
      },
      title: String,
      description: String,
    },

    // الجدولة
    scheduling: {
      scheduledStart: Date,
      scheduledEnd: Date,
      actualStart: Date,
      actualEnd: Date,
      duration: Number, // بالدقائق
      timezone: { type: String, default: 'Asia/Riyadh' },
      recurring: {
        isRecurring: { type: Boolean, default: false },
        frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly'] },
        endDate: Date,
        sessionsCount: Number,
      },
    },

    // التقنية
    technology: {
      platform: { type: String, enum: ['video_call', 'vr', 'ar', 'hybrid'], default: 'video_call' },
      videoProvider: { type: String, enum: ['agora', 'zoom', 'twilio', 'custom'] },
      roomId: String,
      roomUrl: String,
      recordingEnabled: { type: Boolean, default: false },
      recordingUrl: String,
      quality: { type: String, enum: ['hd', 'sd', 'auto'] },
    },

    // حالة الجلسة
    status: {
      current: {
        type: String,
        enum: [
          'scheduled',
          'waiting',
          'in_progress',
          'completed',
          'cancelled',
          'no_show',
          'rescheduled',
        ],
        default: 'scheduled',
      },
      waitingRoomJoined: { type: Boolean, default: false },
      participantReady: { type: Boolean, default: false },
    },

    // الخطة
    plan: {
      objectives: [String],
      exercises: [
        {
          name: String,
          description: String,
          duration: Number,
          repetitions: Number,
          sets: Number,
          videoUrl: String,
          instructions: [String],
        },
      ],
      materials: [String],
      notes: String,
    },

    // التقييم والنتائج
    results: {
      objectivesAchieved: [Boolean],
      exercisesCompleted: [
        {
          exercise: String,
          completed: Boolean,
          quality: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
          notes: String,
        },
      ],
      painLevel: { before: Number, after: Number }, // 0-10
      rangeOfMotion: { before: Number, after: Number },
      functionalScore: Number,
      therapistNotes: String,
      beneficiaryFeedback: String,
      overallProgress: { type: String, enum: ['excellent', 'good', 'moderate', 'poor'] },
    },

    // التمارين المنزلية المخصصة
    homeExercises: [
      {
        exerciseId: String,
        name: String,
        description: String,
        videoUrl: String,
        frequency: String, // يومياً، 3 مرات أسبوعياً، إلخ
        sets: Number,
        reps: Number,
        duration: Number,
        startDate: Date,
        endDate: Date,
        compliance: {
          completedSessions: Number,
          totalSessions: Number,
          rate: Number,
        },
      },
    ],

    // الحضور
    attendance: {
      beneficiaryJoinedAt: Date,
      therapistJoinedAt: Date,
      connectionQuality: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      interruptions: [
        {
          time: Date,
          duration: Number,
          reason: String,
        },
      ],
    },

    // المتابعة
    followUp: {
      required: { type: Boolean, default: true },
      nextSessionDate: Date,
      instructions: [String],
      warnings: [String],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج المراقبة عن بعد
const remoteMonitoringSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // معلومات المراقبة
    monitoring: {
      type: {
        type: String,
        enum: ['vital_signs', 'activity', 'medication', 'symptoms', 'exercises', 'all'],
      },
      startDate: { type: Date, default: Date.now },
      endDate: Date,
      frequency: { type: String, enum: ['continuous', 'hourly', 'daily', 'weekly'] },
      active: { type: Boolean, default: true },
    },

    // البيانات الحيوية
    vitalSigns: [
      {
        timestamp: { type: Date, default: Date.now },
        heartRate: Number,
        bloodPressure: {
          systolic: Number,
          diastolic: Number,
        },
        temperature: Number,
        oxygenSaturation: Number,
        respiratoryRate: Number,
        weight: Number,
        glucose: Number,
        source: { type: String, enum: ['manual', 'wearable', 'device', 'sensor'] },
      },
    ],

    // النشاط البدني
    physicalActivity: [
      {
        timestamp: { type: Date, default: Date.now },
        steps: Number,
        distance: Number, // بالأمتار
        calories: Number,
        activeMinutes: Number,
        exerciseType: String,
        intensity: { type: String, enum: ['low', 'moderate', 'high'] },
        duration: Number,
        source: { type: String, enum: ['manual', 'wearable', 'app'] },
      },
    ],

    // التمارين
    exerciseCompliance: [
      {
        date: Date,
        exercises: [
          {
            name: String,
            scheduled: Boolean,
            completed: Boolean,
            duration: Number,
            quality: Number, // 0-100
            notes: String,
          },
        ],
        overallCompliance: Number, // نسبة
      },
    ],

    // الأعراض
    symptoms: [
      {
        timestamp: { type: Date, default: Date.now },
        symptom: String,
        severity: { type: Number, min: 0, max: 10 },
        duration: Number, // بالدقائق
        triggers: [String],
        relief: [String],
        notes: String,
      },
    ],

    // الأدوية
    medicationAdherence: [
      {
        date: Date,
        medications: [
          {
            name: String,
            dosage: String,
            scheduledTime: String,
            taken: Boolean,
            takenAt: Date,
            skipped: Boolean,
            skipReason: String,
          },
        ],
        adherenceRate: Number,
      },
    ],

    // التنبيهات
    alerts: [
      {
        timestamp: { type: Date, default: Date.now },
        type: {
          type: String,
          enum: ['vital_signs', 'medication', 'symptom', 'exercise', 'fall', 'emergency'],
        },
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        message: String,
        data: Schema.Types.Mixed,
        acknowledged: { type: Boolean, default: false },
        acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        acknowledgedAt: Date,
        action: String,
      },
    ],

    // لوحة القيادة
    dashboard: {
      lastUpdated: Date,
      vitalsTrend: {
        heartRateTrend: String, // increasing, decreasing, stable
        bloodPressureTrend: String,
        weightTrend: String,
      },
      activityScore: Number,
      complianceScore: Number,
      overallHealthScore: Number,
      riskLevel: { type: String, enum: ['low', 'moderate', 'high', 'critical'] },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج التمارين التفاعلية
const interactiveExerciseSchema = new Schema(
  {
    exerciseCode: { type: String, unique: true, required: true },

    // معلومات التمرين
    exerciseInfo: {
      name: { type: String, required: true },
      nameAr: { type: String, required: true },
      category: {
        type: String,
        enum: [
          'mobility',
          'strength',
          'balance',
          'coordination',
          'endurance',
          'flexibility',
          'cognitive',
        ],
      },
      type: { type: String, enum: ['physical', 'cognitive', 'speech', 'occupational'] },
      description: String,
      descriptionAr: String,
      difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'adaptive'] },
    },

    // التعليمات
    instructions: {
      text: [String],
      textAr: [String],
      videoUrl: String,
      audioUrl: String,
      images: [String],
      duration: Number, // بالثواني
      restBetweenSets: Number,
    },

    // المعلمات
    parameters: {
      sets: { min: Number, max: Number, default: Number },
      reps: { min: Number, max: Number, default: Number },
      holdTime: Number, // بالثواني
      sides: { type: String, enum: ['both', 'left', 'right', 'none'], default: 'both' },
    },

    // التكيف
    adaptations: {
      forWheelchair: { type: Boolean, default: false },
      wheelchairInstructions: [String],
      forVisualImpairment: { type: Boolean, default: false },
      audioGuidance: { type: Boolean, default: false },
      forHearingImpairment: { type: Boolean, default: false },
      visualCues: { type: Boolean, default: false },
      forCognitiveImpairment: { type: Boolean, default: false },
      simplifiedInstructions: [String],
    },

    // التتبع
    tracking: {
      motionDetection: { type: Boolean, default: false },
      requiredJoints: [String], // للكشف عن الحركة
      targetAngles: [
        {
          joint: String,
          minAngle: Number,
          maxAngle: Number,
        },
      ],
      feedbackPoints: [String],
    },

    // السلامة
    safety: {
      contraindications: [String],
      warnings: [String],
      modifications: [
        {
          condition: String,
          modification: String,
        },
      ],
      supervision: { type: String, enum: ['required', 'recommended', 'optional', 'none'] },
    },

    // الأهداف
    targets: {
      primaryGoals: [String],
      secondaryGoals: [String],
      bodyParts: [String],
      conditions: [String],
    },

    // التقييم
    assessment: {
      measurable: { type: Boolean, default: true },
      metrics: [
        {
          name: String,
          unit: String,
          baseline: Number,
          target: Number,
        },
      ],
    },

    // الواقع الافتراضي/المعزز
    vrAr: {
      enabled: { type: Boolean, default: false },
      type: { type: String, enum: ['vr', 'ar', 'mixed'] },
      environment: String,
      gamification: {
        enabled: { type: Boolean, default: false },
        points: Number,
        levels: Number,
        achievements: [String],
      },
    },

    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج جلسة التمرين
const exerciseSessionSchema = new Schema(
  {
    sessionId: { type: String, unique: true, required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // معلومات الجلسة
    session: {
      date: { type: Date, default: Date.now },
      type: { type: String, enum: ['scheduled', 'ad_hoc', 'makeup'] },
      location: { type: String, enum: ['home', 'center', 'outdoor'] },
      supervised: { type: Boolean, default: false },
      supervisor: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    // التمارين المنفذة
    exercises: [
      {
        exerciseId: { type: Schema.Types.ObjectId, ref: 'InteractiveExercise' },
        order: Number,
        scheduled: {
          sets: Number,
          reps: Number,
          duration: Number,
        },
        actual: {
          sets: Number,
          reps: Number,
          duration: Number,
          completed: { type: Boolean, default: false },
        },
        performance: {
          accuracy: Number, // 0-100
          form: Number, // 0-100
          pace: { type: String, enum: ['too_slow', 'correct', 'too_fast'] },
          rangeOfMotion: Number,
        },
        feedback: {
          automated: [String],
          therapist: String,
        },
        skipped: { type: Boolean, default: false },
        skipReason: String,
        restTaken: Number,
      },
    ],

    // الإحصائيات
    statistics: {
      totalDuration: Number,
      activeTime: Number,
      restTime: Number,
      caloriesBurned: Number,
      exercisesCompleted: Number,
      exercisesSkipped: Number,
      completionRate: Number,
      averageAccuracy: Number,
      averageForm: Number,
    },

    // التقييم الذاتي
    selfAssessment: {
      difficulty: { type: String, enum: ['too_easy', 'easy', 'appropriate', 'hard', 'too_hard'] },
      fatigue: { type: Number, min: 0, max: 10 },
      pain: { type: Number, min: 0, max: 10 },
      enjoyment: { type: Number, min: 0, max: 10 },
      motivation: { type: Number, min: 0, max: 10 },
      comments: String,
    },

    // المراقبة الحيوية
    vitalMonitoring: {
      heartRate: {
        before: Number,
        during: { min: Number, max: Number, avg: Number },
        after: Number,
        recovery: Number, // وقت التعافي بالثواني
      },
      oxygenSaturation: {
        before: Number,
        during: { min: Number, max: Number },
        after: Number,
      },
    },

    // المكافآت (للعناصر)
    rewards: {
      points: Number,
      streak: Number,
      achievements: [String],
      badges: [String],
    },

    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned', 'paused'],
      default: 'in_progress',
    },
  },
  { timestamps: true }
);

// نموذج الأجهزة القابلة للارتداء
const wearableDeviceSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // معلومات الجهاز
    device: {
      type: {
        type: String,
        enum: [
          'smartwatch',
          'fitness_band',
          'heart_monitor',
          'glucose_monitor',
          'fall_detector',
          'smart_insole',
          'motion_sensor',
        ],
      },
      brand: String,
      model: String,
      serialNumber: String,
      firmware: String,
    },

    // التكامل
    integration: {
      platform: {
        type: String,
        enum: ['apple_health', 'google_fit', 'samsung_health', 'fitbit', 'garmin', 'custom'],
      },
      connected: { type: Boolean, default: false },
      lastSync: Date,
      syncFrequency: { type: String, enum: ['realtime', 'hourly', 'daily'] },
      apiCredentials: {
        accessToken: String,
        refreshToken: String,
        expiresAt: Date,
      },
    },

    // البيانات المتتبعة
    trackedData: {
      heartRate: { type: Boolean, default: true },
      steps: { type: Boolean, default: true },
      sleep: { type: Boolean, default: true },
      calories: { type: Boolean, default: true },
      distance: { type: Boolean, default: true },
      floors: { type: Boolean, default: false },
      oxygenSaturation: { type: Boolean, default: false },
      stress: { type: Boolean, default: false },
      fallDetection: { type: Boolean, default: false },
      location: { type: Boolean, default: false },
    },

    // التنبيهات
    alerts: {
      heartRateHigh: { enabled: Boolean, threshold: Number },
      heartRateLow: { enabled: Boolean, threshold: Number },
      oxygenLow: { enabled: Boolean, threshold: Number },
      fall: { enabled: Boolean, autoCall: Boolean },
      inactivity: { enabled: Boolean, threshold: Number },
    },

    // حالة الجهاز
    status: {
      batteryLevel: Number,
      charging: { type: Boolean, default: false },
      lastSeen: Date,
      active: { type: Boolean, default: true },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// إنشاء النماذج
const TeleRehabSession = mongoose.model('TeleRehabSession', teleRehabSessionSchema);
const RemoteMonitoring = mongoose.model('RemoteMonitoring', remoteMonitoringSchema);
const InteractiveExercise = mongoose.model('InteractiveExercise', interactiveExerciseSchema);
const ExerciseSession = mongoose.model('ExerciseSession', exerciseSessionSchema);
const WearableDevice = mongoose.model('WearableDevice', wearableDeviceSchema);

// ============================================
// خدمة التأهيل الافتراضي
// ============================================

class AdvancedTelehealthService {
  // ====================
  // جلسات التأهيل عن بعد
  // ====================

  /**
   * إنشاء جلسة تأهيل عن بعد
   */
  async createTeleRehabSession(sessionData) {
    try {
      const sessionCode = await this.generateSessionCode();

      const session = new TeleRehabSession({
        ...sessionData,
        sessionCode,
        status: { current: 'scheduled' },
      });

      // إنشاء غرفة الفيديو
      const roomInfo = await this.createVideoRoom(sessionCode, sessionData.sessionInfo.sessionType);
      session.technology = {
        ...session.technology,
        roomId: roomInfo.roomId,
        roomUrl: roomInfo.roomUrl,
      };

      await session.save();
      return session;
    } catch (error) {
      throw new Error(`خطأ في إنشاء جلسة التأهيل: ${error.message}`);
    }
  }

  /**
   * توليد كود الجلسة
   */
  async generateSessionCode() {
    const date = new Date();
    const year = date.getFullYear();
    const count = await TeleRehabSession.countDocuments({
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
    });

    return `TRS-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * إنشاء غرفة فيديو
   */
  async createVideoRoom(sessionCode, _sessionType) {
    // هذا يرتبط بـ Agora أو Zoom أو Twilio
    return {
      roomId: `room-${sessionCode}`,
      roomUrl: `https://telehealth.example.com/room/${sessionCode}`,
      provider: 'agora',
    };
  }

  /**
   * بدء الجلسة
   */
  async startSession(sessionId, userId) {
    const session = await TeleRehabSession.findById(sessionId);
    if (!session) {
      throw new Error('الجلسة غير موجودة');
    }

    // التحقق من المستخدم (معالج أو مستفيد)
    const isTherapist = session.sessionInfo.therapistId.equals(userId);
    const isBeneficiary = session.sessionInfo.beneficiaryId.equals(userId);

    if (isTherapist) {
      session.attendance.therapistJoinedAt = new Date();
    } else if (isBeneficiary) {
      session.attendance.beneficiaryJoinedAt = new Date();
      session.status.waitingRoomJoined = true;
    }

    // إذا انضم كلاهما، تبدأ الجلسة
    if (session.attendance.therapistJoinedAt && session.attendance.beneficiaryJoinedAt) {
      session.status.current = 'in_progress';
      session.scheduling.actualStart = new Date();
    } else {
      session.status.current = 'waiting';
    }

    await session.save();
    return session;
  }

  /**
   * إنهاء الجلسة
   */
  async endSession(sessionId, results) {
    const session = await TeleRehabSession.findById(sessionId);
    if (!session) {
      throw new Error('الجلسة غير موجودة');
    }

    session.status.current = 'completed';
    session.scheduling.actualEnd = new Date();
    session.scheduling.duration = Math.round(
      (session.scheduling.actualEnd - session.scheduling.actualStart) / 60000
    );

    session.results = {
      ...results,
      objectivesAchieved: results.objectivesAchieved || [],
    };

    // تحديث حالة التمارين المنزلية
    if (results.homeExercises) {
      session.homeExercises = results.homeExercises;
    }

    await session.save();
    return session;
  }

  /**
   * تقييم الجلسة
   */
  async rateSession(sessionId, ratingData, userType) {
    const session = await TeleRehabSession.findById(sessionId);
    if (!session) {
      throw new Error('الجلسة غير موجودة');
    }

    if (userType === 'beneficiary') {
      session.results.beneficiaryFeedback = ratingData.feedback;
    } else {
      session.results.therapistNotes = ratingData.notes;
    }

    await session.save();
    return session;
  }

  // ====================
  // المراقبة عن بعد
  // ====================

  /**
   * بدء المراقبة
   */
  async startMonitoring(monitoringData) {
    const monitoring = new RemoteMonitoring({
      beneficiaryId: monitoringData.beneficiaryId,
      monitoring: {
        ...monitoringData.monitoring,
        startDate: new Date(),
        active: true,
      },
    });

    await monitoring.save();
    return monitoring;
  }

  /**
   * تسجيل علامات حيوية
   */
  async recordVitalSigns(beneficiaryId, vitalData) {
    let monitoring = await RemoteMonitoring.findOne({
      beneficiaryId,
      'monitoring.active': true,
    });

    if (!monitoring) {
      monitoring = await this.startMonitoring({
        beneficiaryId,
        monitoring: { type: 'vital_signs' },
      });
    }

    monitoring.vitalSigns.push({
      ...vitalData,
      timestamp: new Date(),
    });

    // فحص التنبيهات
    await this.checkVitalAlerts(monitoring, vitalData);

    // تحديث لوحة القيادة
    await this.updateMonitoringDashboard(monitoring);

    await monitoring.save();
    return monitoring;
  }

  /**
   * فحص تنبيهات العلامات الحيوية
   */
  async checkVitalAlerts(monitoring, vitalData) {
    const alerts = [];

    // فحص معدل ضربات القلب
    if (vitalData.heartRate) {
      if (vitalData.heartRate > 120) {
        alerts.push({
          type: 'vital_signs',
          severity: 'high',
          message: `معدل ضربات القلب مرتفع: ${vitalData.heartRate} نبضة/دقيقة`,
        });
      } else if (vitalData.heartRate < 50) {
        alerts.push({
          type: 'vital_signs',
          severity: 'high',
          message: `معدل ضربات القلب منخفض: ${vitalData.heartRate} نبضة/دقيقة`,
        });
      }
    }

    // فحص الأكسجين
    if (vitalData.oxygenSaturation && vitalData.oxygenSaturation < 90) {
      alerts.push({
        type: 'vital_signs',
        severity: 'critical',
        message: `تشبع الأكسجين منخفض: ${vitalData.oxygenSaturation}%`,
      });
    }

    // إضافة التنبيهات
    alerts.forEach(alert => {
      monitoring.alerts.push({
        ...alert,
        timestamp: new Date(),
        data: vitalData,
      });
    });

    return alerts;
  }

  /**
   * تسجيل النشاط البدني
   */
  async recordPhysicalActivity(beneficiaryId, activityData) {
    let monitoring = await RemoteMonitoring.findOne({
      beneficiaryId,
      'monitoring.active': true,
    });

    if (!monitoring) {
      monitoring = await this.startMonitoring({
        beneficiaryId,
        monitoring: { type: 'activity' },
      });
    }

    monitoring.physicalActivity.push({
      ...activityData,
      timestamp: new Date(),
    });

    await monitoring.save();
    return monitoring;
  }

  /**
   * تسجيل الأعراض
   */
  async recordSymptom(beneficiaryId, symptomData) {
    let monitoring = await RemoteMonitoring.findOne({
      beneficiaryId,
      'monitoring.active': true,
    });

    if (!monitoring) {
      monitoring = await this.startMonitoring({
        beneficiaryId,
        monitoring: { type: 'symptoms' },
      });
    }

    monitoring.symptoms.push({
      ...symptomData,
      timestamp: new Date(),
    });

    // فحص الأعراض الحرجة
    if (symptomData.severity >= 7) {
      monitoring.alerts.push({
        type: 'symptom',
        severity: 'high',
        message: `عرض شديد: ${symptomData.symptom} - شدة: ${symptomData.severity}/10`,
        timestamp: new Date(),
        data: symptomData,
      });
    }

    await monitoring.save();
    return monitoring;
  }

  /**
   * تحديث لوحة قيادة المراقبة
   */
  async updateMonitoringDashboard(monitoring) {
    const vitals = monitoring.vitalSigns;
    const _activities = monitoring.physicalActivity;

    // حساب الاتجاهات
    if (vitals.length >= 2) {
      const recent = vitals.slice(-5);
      const older = vitals.slice(-10, -5);

      const recentAvgHR = recent.reduce((sum, v) => sum + (v.heartRate || 0), 0) / recent.length;
      const olderAvgHR = older.reduce((sum, v) => sum + (v.heartRate || 0), 0) / older.length;

      monitoring.dashboard.vitalsTrend.heartRateTrend =
        recentAvgHR > olderAvgHR * 1.1
          ? 'increasing'
          : recentAvgHR < olderAvgHR * 0.9
            ? 'decreasing'
            : 'stable';
    }

    // حساب نقاط الامتثال
    const exerciseCompliance = monitoring.exerciseCompliance;
    if (exerciseCompliance.length > 0) {
      const avgCompliance =
        exerciseCompliance.reduce((sum, e) => sum + e.overallCompliance, 0) /
        exerciseCompliance.length;
      monitoring.dashboard.complianceScore = Math.round(avgCompliance);
    }

    // حساب مستوى المخاطر
    const criticalAlerts = monitoring.alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = monitoring.alerts.filter(a => a.severity === 'high').length;

    monitoring.dashboard.riskLevel =
      criticalAlerts > 0
        ? 'critical'
        : highAlerts > 2
          ? 'high'
          : highAlerts > 0
            ? 'moderate'
            : 'low';

    monitoring.dashboard.lastUpdated = new Date();
  }

  // ====================
  // التمارين التفاعلية
  // ====================

  /**
   * إنشاء تمرين تفاعلي
   */
  async createInteractiveExercise(exerciseData) {
    try {
      const exerciseCode = await this.generateExerciseCode(exerciseData.exerciseInfo.category);

      const exercise = new InteractiveExercise({
        ...exerciseData,
        exerciseCode,
      });

      await exercise.save();
      return exercise;
    } catch (error) {
      throw new Error(`خطأ في إنشاء التمرين: ${error.message}`);
    }
  }

  /**
   * توليد كود التمرين
   */
  async generateExerciseCode(category) {
    const prefixes = {
      mobility: 'MOB',
      strength: 'STR',
      balance: 'BAL',
      coordination: 'COO',
      endurance: 'END',
      flexibility: 'FLX',
      cognitive: 'COG',
    };

    const count = await InteractiveExercise.countDocuments({ 'exerciseInfo.category': category });
    return `EX-${prefixes[category]}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * بدء جلسة تمرين
   */
  async startExerciseSession(beneficiaryId, exercises) {
    const sessionId = `EXS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session = new ExerciseSession({
      sessionId,
      beneficiaryId,
      session: {
        date: new Date(),
        type: 'ad_hoc',
        location: 'home',
        supervised: false,
      },
      exercises: exercises.map((ex, index) => ({
        exerciseId: ex.exerciseId,
        order: index + 1,
        scheduled: {
          sets: ex.sets || 3,
          reps: ex.reps || 10,
          duration: ex.duration || 300,
        },
        actual: {
          completed: false,
        },
      })),
      status: 'in_progress',
    });

    await session.save();
    return session;
  }

  /**
   * تسجيل تمرين مكتمل
   */
  async recordExerciseCompletion(sessionId, exerciseIndex, completionData) {
    const session = await ExerciseSession.findOne({ sessionId });
    if (!session) {
      throw new Error('جلسة التمرين غير موجودة');
    }

    const exercise = session.exercises[exerciseIndex];
    exercise.actual = {
      ...completionData.actual,
      completed: true,
    };
    exercise.performance = completionData.performance || {};
    exercise.feedback = completionData.feedback || {};

    // تحديث الإحصائيات
    await this.updateSessionStatistics(session);

    await session.save();
    return session;
  }

  /**
   * تحديث إحصائيات الجلسة
   */
  async updateSessionStatistics(session) {
    const completed = session.exercises.filter(e => e.actual.completed);

    session.statistics = {
      totalDuration: session.exercises.reduce((sum, e) => sum + (e.actual.duration || 0), 0),
      exercisesCompleted: completed.length,
      exercisesSkipped: session.exercises.filter(e => e.skipped).length,
      completionRate: (completed.length / session.exercises.length) * 100,
      averageAccuracy:
        completed.reduce((sum, e) => sum + (e.performance.accuracy || 0), 0) / completed.length ||
        0,
      averageForm:
        completed.reduce((sum, e) => sum + (e.performance.form || 0), 0) / completed.length || 0,
    };
  }

  /**
   * إنهاء جلسة التمرين
   */
  async endExerciseSession(sessionId, selfAssessment) {
    const session = await ExerciseSession.findOne({ sessionId });
    if (!session) {
      throw new Error('جلسة التمرين غير موجودة');
    }

    session.status = 'completed';
    session.selfAssessment = selfAssessment;

    // حساب المكافآت
    session.rewards = {
      points: Math.round(session.statistics.completionRate * 10),
      streak: await this.calculateStreak(session.beneficiaryId),
      achievements: [],
    };

    await session.save();
    return session;
  }

  /**
   * حساب سلسلة التمارين
   */
  async calculateStreak(beneficiaryId) {
    const sessions = await ExerciseSession.find({
      beneficiaryId,
      status: 'completed',
    }).sort({ 'session.date': -1 });

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sessions) {
      const sessionDate = new Date(session.session.date);
      sessionDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  }

  // ====================
  // الأجهزة القابلة للارتداء
  // ====================

  /**
   * تسجيل جهاز قابل للارتداء
   */
  async registerWearableDevice(deviceData) {
    const device = new WearableDevice({
      ...deviceData,
      integration: {
        ...deviceData.integration,
        connected: false,
      },
      status: {
        active: true,
      },
    });

    await device.save();
    return device;
  }

  /**
   * ربط الجهاز
   */
  async connectDevice(deviceId, credentials) {
    const device = await WearableDevice.findById(deviceId);
    if (!device) {
      throw new Error('الجهاز غير موجود');
    }

    device.integration = {
      ...device.integration,
      ...credentials,
      connected: true,
      lastSync: new Date(),
    };

    await device.save();
    return device;
  }

  /**
   * مزامنة بيانات الجهاز
   */
  async syncDeviceData(deviceId) {
    const device = await WearableDevice.findById(deviceId);
    if (!device || !device.integration.connected) {
      throw new Error('الجهاز غير متصل');
    }

    // الحصول على البيانات من المنصة
    // هذا يرتبط بـ API المنصة

    device.status.lastSeen = new Date();
    device.integration.lastSync = new Date();

    await device.save();
    return device;
  }

  // ====================
  // التقارير
  // ====================

  /**
   * تقرير جلسات التأهيل
   */
  async getTeleRehabReport(beneficiaryId, period = 'month') {
    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const sessions = await TeleRehabSession.find({
      'sessionInfo.beneficiaryId': beneficiaryId,
      createdAt: { $gte: startDate },
    });

    const report = {
      totalSessions: sessions.length,
      completed: sessions.filter(s => s.status.current === 'completed').length,
      cancelled: sessions.filter(s => s.status.current === 'cancelled').length,
      noShow: sessions.filter(s => s.status.current === 'no_show').length,
      averageDuration: 0,
      progressTrend: 'stable',
      serviceBreakdown: {},
      overallSatisfaction: 0,
    };

    // حساب المعدلات
    const completedSessions = sessions.filter(s => s.status.current === 'completed');
    if (completedSessions.length > 0) {
      report.averageDuration =
        completedSessions.reduce((sum, s) => sum + s.scheduling.duration, 0) /
        completedSessions.length;
    }

    return report;
  }

  /**
   * تقرير المراقبة
   */
  async getMonitoringReport(beneficiaryId) {
    const monitoring = await RemoteMonitoring.findOne({
      beneficiaryId,
      'monitoring.active': true,
    });

    if (!monitoring) {
      return { message: 'لا توجد بيانات مراقبة نشطة' };
    }

    return {
      dashboard: monitoring.dashboard,
      recentVitals: monitoring.vitalSigns.slice(-10),
      recentActivity: monitoring.physicalActivity.slice(-10),
      activeAlerts: monitoring.alerts.filter(a => !a.acknowledged),
      complianceRate: monitoring.dashboard.complianceScore,
    };
  }
}

// تصدير
module.exports = {
  AdvancedTelehealthService,
  TeleRehabSession,
  RemoteMonitoring,
  InteractiveExercise,
  ExerciseSession,
  WearableDevice,
};
