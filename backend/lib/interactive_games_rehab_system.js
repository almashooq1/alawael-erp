/**
 * ═══════════════════════════════════════════════════════════════════════
 *
 *   نظام الألعاب التفاعلية لتأهيل ذوي الإعاقة
 *   Interactive Games Rehabilitation System
 *
 *   نظام شامل لإدارة برامج التأهيل من خلال الألعاب التفاعلية
 *   Comprehensive system for managing rehabilitation programs through interactive games
 *
 *   الإصدار: 1.0.0
 *   التاريخ: 22 يناير 2026
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

class InteractiveGamesRehabSystem {
  constructor() {
    // البيانات الأساسية - Core Data Collections
    this.patients = new Map(); // المرضى/المستخدمون
    this.therapists = new Map(); // المعالجون/المشرفون
    this.games = new Map(); // الألعاب المتاحة
    this.sessions = new Map(); // جلسات العلاج/التدريب
    this.progress = new Map(); // سجل التقدم
    this.achievements = new Map(); // الإنجازات والشارات
    this.assessments = new Map(); // التقييمات
    this.exercises = new Map(); // التمارين المخصصة
    this.schedules = new Map(); // جداول التأهيل
    this.reports = new Map(); // التقارير

    // العدادات - Counters
    this.patientCounter = 1;
    this.therapistCounter = 1;
    this.gameCounter = 1;
    this.sessionCounter = 1;
    this.achievementCounter = 1;
    this.assessmentCounter = 1;
    this.exerciseCounter = 1;
    this.scheduleCounter = 1;
    this.reportCounter = 1;

    // تهيئة البيانات الأولية
    this.initializeDefaultData();
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * إدارة المرضى - Patient Management
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * إضافة مريض جديد
   * Add new patient
   */
  addPatient(data) {
    const patientId = `P${String(this.patientCounter++).padStart(4, '0')}`;

    const patient = {
      id: patientId,
      name: data.name,
      age: data.age,
      gender: data.gender,
      disabilityType: data.disabilityType, // physical, cognitive, sensory, multiple
      disabilityLevel: data.disabilityLevel, // mild, moderate, severe
      medicalHistory: data.medicalHistory || [],
      currentCondition: data.currentCondition,
      goals: data.goals || [],
      assignedTherapist: data.assignedTherapist,
      registrationDate: new Date().toISOString(),
      status: 'active', // active, inactive, completed
      contactInfo: {
        email: data.email,
        phone: data.phone,
        address: data.address,
        emergencyContact: data.emergencyContact,
      },
      settings: {
        difficultyLevel: data.difficultyLevel || 'beginner',
        preferredLanguage: data.preferredLanguage || 'ar',
        accessibility: data.accessibility || {},
        notifications: data.notifications !== false,
      },
      statistics: {
        totalSessions: 0,
        completedGames: 0,
        totalPoints: 0,
        achievements: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActive: null,
      },
    };

    this.patients.set(patientId, patient);
    return patient;
  }

  /**
   * الحصول على بيانات مريض
   * Get patient data
   */
  getPatient(patientId) {
    const patient = this.patients.get(patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }
    return patient;
  }

  /**
   * تحديث بيانات مريض
   * Update patient data
   */
  updatePatient(patientId, updates) {
    const patient = this.getPatient(patientId);
    Object.assign(patient, updates);
    this.patients.set(patientId, patient);
    return patient;
  }

  /**
   * الحصول على قائمة المرضى
   * Get list of patients
   */
  getAllPatients(filters = {}) {
    let patients = Array.from(this.patients.values());

    // تطبيق الفلاتر
    if (filters.therapistId) {
      patients = patients.filter(p => p.assignedTherapist === filters.therapistId);
    }
    if (filters.disabilityType) {
      patients = patients.filter(p => p.disabilityType === filters.disabilityType);
    }
    if (filters.status) {
      patients = patients.filter(p => p.status === filters.status);
    }

    return patients;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * إدارة المعالجين - Therapist Management
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * إضافة معالج جديد
   * Add new therapist
   */
  addTherapist(data) {
    const therapistId = `T${String(this.therapistCounter++).padStart(4, '0')}`;

    const therapist = {
      id: therapistId,
      name: data.name,
      specialization: data.specialization, // physical, occupational, speech, cognitive
      credentials: data.credentials || [],
      experience: data.experience,
      email: data.email,
      phone: data.phone,
      joinDate: new Date().toISOString(),
      status: 'active',
      assignedPatients: [],
      statistics: {
        totalPatients: 0,
        activeSessions: 0,
        completedSessions: 0,
        averageRating: 0,
        reviews: [],
      },
    };

    this.therapists.set(therapistId, therapist);
    return therapist;
  }

  /**
   * الحصول على بيانات معالج
   * Get therapist data
   */
  getTherapist(therapistId) {
    const therapist = this.therapists.get(therapistId);
    if (!therapist) {
      throw new Error(`Therapist not found: ${therapistId}`);
    }
    return therapist;
  }

  /**
   * الحصول على إحصائيات المعالج
   * Get therapist statistics
   */
  getTherapistStats(therapistId) {
    const therapist = this.getTherapist(therapistId);
    const patients = this.getAllPatients({ therapistId });
    const sessions = Array.from(this.sessions.values()).filter(s => s.therapistId === therapistId);

    return {
      therapist: {
        id: therapist.id,
        name: therapist.name,
        specialization: therapist.specialization,
      },
      patients: {
        total: patients.length,
        active: patients.filter(p => p.status === 'active').length,
        completed: patients.filter(p => p.status === 'completed').length,
      },
      sessions: {
        total: sessions.length,
        completed: sessions.filter(s => s.status === 'completed').length,
        scheduled: sessions.filter(s => s.status === 'scheduled').length,
      },
      performance: {
        averageProgress: this.calculateAverageProgress(patients),
        successRate: this.calculateSuccessRate(sessions),
        patientSatisfaction: therapist.statistics.averageRating,
      },
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * إدارة الألعاب - Games Management
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * إضافة لعبة جديدة
   * Add new game
   */
  addGame(data) {
    const gameId = `G${String(this.gameCounter++).padStart(4, '0')}`;

    const game = {
      id: gameId,
      title: data.title,
      titleEn: data.titleEn,
      description: data.description,
      category: data.category, // cognitive, motor, sensory, speech, memory, coordination
      targetDisability: data.targetDisability, // physical, cognitive, sensory, multiple
      difficulty: data.difficulty, // beginner, intermediate, advanced
      duration: data.duration, // in minutes
      minAge: data.minAge,
      maxAge: data.maxAge,
      objectives: data.objectives || [],
      instructions: data.instructions,
      equipment: data.equipment || [],
      accessibility: {
        supportsVoice: data.supportsVoice || false,
        supportsTouch: data.supportsTouch || false,
        supportsKeyboard: data.supportsKeyboard || false,
        supportsMouse: data.supportsMouse || false,
        supportsEyeTracking: data.supportsEyeTracking || false,
        colorBlindSafe: data.colorBlindSafe || false,
      },
      scoring: {
        maxScore: data.maxScore || 100,
        passingScore: data.passingScore || 60,
        bonusPoints: data.bonusPoints || [],
      },
      levels: data.levels || [],
      createdAt: new Date().toISOString(),
      status: 'active',
      statistics: {
        totalPlays: 0,
        averageScore: 0,
        completionRate: 0,
        averageTime: 0,
        ratings: [],
      },
    };

    this.games.set(gameId, game);
    return game;
  }

  /**
   * الحصول على بيانات لعبة
   * Get game data
   */
  getGame(gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }
    return game;
  }

  /**
   * البحث عن الألعاب
   * Search games
   */
  searchGames(criteria) {
    let games = Array.from(this.games.values());

    if (criteria.category) {
      games = games.filter(g => g.category === criteria.category);
    }
    if (criteria.targetDisability) {
      games = games.filter(g => g.targetDisability === criteria.targetDisability);
    }
    if (criteria.difficulty) {
      games = games.filter(g => g.difficulty === criteria.difficulty);
    }
    if (criteria.ageRange) {
      games = games.filter(
        g => g.minAge <= criteria.ageRange.max && g.maxAge >= criteria.ageRange.min
      );
    }
    if (criteria.searchText) {
      const searchLower = criteria.searchText.toLowerCase();
      games = games.filter(
        g =>
          g.title.toLowerCase().includes(searchLower) ||
          (g.titleEn && g.titleEn.toLowerCase().includes(searchLower)) ||
          g.description.toLowerCase().includes(searchLower)
      );
    }

    return games;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * إدارة الجلسات - Session Management
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء جلسة جديدة
   * Create new session
   */
  createSession(data) {
    const sessionId = `S${String(this.sessionCounter++).padStart(6, '0')}`;

    const session = {
      id: sessionId,
      patientId: data.patientId,
      therapistId: data.therapistId,
      gameId: data.gameId,
      type: data.type, // assessment, training, therapy, practice
      scheduledDate: data.scheduledDate,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      duration: data.duration,
      status: 'scheduled', // scheduled, in-progress, completed, cancelled
      goals: data.goals || [],
      notes: data.notes || '',
      settings: {
        difficulty: data.difficulty || 'auto',
        adaptiveMode: data.adaptiveMode !== false,
        assistanceLevel: data.assistanceLevel || 'moderate',
        breakInterval: data.breakInterval || 5,
      },
      results: {
        score: null,
        accuracy: null,
        completionTime: null,
        attempts: 0,
        errors: [],
        achievements: [],
        feedback: '',
      },
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);

    // تحديث إحصائيات المريض
    const patient = this.getPatient(data.patientId);
    patient.statistics.totalSessions++;
    this.patients.set(data.patientId, patient);

    return session;
  }

  /**
   * بدء جلسة
   * Start session
   */
  startSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'in-progress';
    session.startTime = new Date().toISOString();
    this.sessions.set(sessionId, session);

    // تحديث آخر نشاط للمريض
    const patient = this.getPatient(session.patientId);
    patient.statistics.lastActive = new Date().toISOString();
    this.patients.set(session.patientId, patient);

    return session;
  }

  /**
   * إنهاء جلسة وتسجيل النتائج
   * Complete session and record results
   */
  completeSession(sessionId, results) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'completed';
    session.endTime = new Date().toISOString();
    session.results = {
      ...session.results,
      ...results,
      completionTime: this.calculateDuration(session.startTime, session.endTime),
    };

    this.sessions.set(sessionId, session);

    // تحديث إحصائيات المريض
    const patient = this.getPatient(session.patientId);
    patient.statistics.completedGames++;
    patient.statistics.totalPoints += results.score || 0;
    this.patients.set(session.patientId, patient);

    // تسجيل التقدم
    this.recordProgress(sessionId, results);

    // التحقق من الإنجازات
    this.checkAchievements(session.patientId, results);

    return session;
  }

  /**
   * الحصول على جلسات المريض
   * Get patient sessions
   */
  getPatientSessions(patientId, filters = {}) {
    let sessions = Array.from(this.sessions.values()).filter(s => s.patientId === patientId);

    if (filters.status) {
      sessions = sessions.filter(s => s.status === filters.status);
    }
    if (filters.gameId) {
      sessions = sessions.filter(s => s.gameId === filters.gameId);
    }
    if (filters.dateFrom) {
      sessions = sessions.filter(s => new Date(s.scheduledDate) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      sessions = sessions.filter(s => new Date(s.scheduledDate) <= new Date(filters.dateTo));
    }

    return sessions.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * إدارة التقدم - Progress Management
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * تسجيل التقدم
   * Record progress
   */
  recordProgress(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const progressId = `${session.patientId}_${sessionId}`;
    const progress = {
      id: progressId,
      patientId: session.patientId,
      sessionId: sessionId,
      gameId: session.gameId,
      date: new Date().toISOString(),
      metrics: {
        score: data.score,
        accuracy: data.accuracy,
        speed: data.speed,
        consistency: data.consistency,
        independence: data.independence,
        engagement: data.engagement,
      },
      improvements: this.calculateImprovements(session.patientId, session.gameId, data),
      notes: data.notes || '',
      therapistComments: data.therapistComments || '',
    };

    this.progress.set(progressId, progress);
    return progress;
  }

  /**
   * الحصول على تقدم المريض
   * Get patient progress
   */
  getPatientProgress(patientId, options = {}) {
    const progressRecords = Array.from(this.progress.values()).filter(
      p => p.patientId === patientId
    );

    if (options.gameId) {
      return progressRecords.filter(p => p.gameId === options.gameId);
    }

    if (options.dateRange) {
      const { from, to } = options.dateRange;
      return progressRecords.filter(p => {
        const date = new Date(p.date);
        return date >= new Date(from) && date <= new Date(to);
      });
    }

    return progressRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * حساب التحسينات
   * Calculate improvements
   */
  calculateImprovements(patientId, gameId, currentData) {
    const previousProgress = Array.from(this.progress.values())
      .filter(p => p.patientId === patientId && p.gameId === gameId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (previousProgress.length === 0) {
      return {
        score: 0,
        accuracy: 0,
        speed: 0,
        overall: 'first_attempt',
      };
    }

    const lastProgress = previousProgress[0];
    return {
      score: currentData.score - lastProgress.metrics.score,
      accuracy: currentData.accuracy - lastProgress.metrics.accuracy,
      speed: currentData.speed - lastProgress.metrics.speed,
      overall: this.determineOverallImprovement(currentData, lastProgress.metrics),
    };
  }

  /**
   * تحديد التحسين العام
   * Determine overall improvement
   */
  determineOverallImprovement(current, previous) {
    const improvements = [
      current.score > previous.score,
      current.accuracy > previous.accuracy,
      current.speed > previous.speed,
    ];

    const improvementCount = improvements.filter(i => i).length;

    if (improvementCount >= 2) return 'significant';
    if (improvementCount === 1) return 'moderate';
    return 'minimal';
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * إدارة الإنجازات - Achievements Management
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * التحقق من الإنجازات
   * Check achievements
   */
  checkAchievements(patientId, sessionResults) {
    const patient = this.getPatient(patientId);
    const newAchievements = [];

    // إنجاز الجلسة الأولى
    if (patient.statistics.completedGames === 1) {
      newAchievements.push(
        this.awardAchievement(patientId, 'first_game', {
          title: 'البداية الأولى',
          titleEn: 'First Steps',
          description: 'أكملت جلستك الأولى بنجاح',
          icon: '🎯',
          points: 10,
        })
      );
    }

    // إنجاز النقاط العالية
    if (sessionResults.score >= 90) {
      newAchievements.push(
        this.awardAchievement(patientId, 'high_score', {
          title: 'نقاط عالية',
          titleEn: 'High Score',
          description: 'حصلت على 90 نقطة أو أكثر',
          icon: '⭐',
          points: 20,
        })
      );
    }

    // إنجاز الاستمرارية
    if (patient.statistics.currentStreak >= 7) {
      newAchievements.push(
        this.awardAchievement(patientId, 'weekly_streak', {
          title: 'الاستمرارية الأسبوعية',
          titleEn: 'Weekly Streak',
          description: 'لعبت لمدة 7 أيام متتالية',
          icon: '🔥',
          points: 30,
        })
      );
    }

    // إنجاز الدقة
    if (sessionResults.accuracy >= 95) {
      newAchievements.push(
        this.awardAchievement(patientId, 'perfect_accuracy', {
          title: 'دقة مثالية',
          titleEn: 'Perfect Accuracy',
          description: 'حققت دقة 95% أو أكثر',
          icon: '🎯',
          points: 25,
        })
      );
    }

    return newAchievements;
  }

  /**
   * منح إنجاز
   * Award achievement
   */
  awardAchievement(patientId, type, achievement) {
    const achievementId = `A${String(this.achievementCounter++).padStart(5, '0')}`;

    const awardedAchievement = {
      id: achievementId,
      patientId: patientId,
      type: type,
      title: achievement.title,
      titleEn: achievement.titleEn,
      description: achievement.description,
      icon: achievement.icon,
      points: achievement.points,
      awardedAt: new Date().toISOString(),
    };

    this.achievements.set(achievementId, awardedAchievement);

    // تحديث إحصائيات المريض
    const patient = this.getPatient(patientId);
    patient.statistics.achievements++;
    patient.statistics.totalPoints += achievement.points;
    this.patients.set(patientId, patient);

    return awardedAchievement;
  }

  /**
   * الحصول على إنجازات المريض
   * Get patient achievements
   */
  getPatientAchievements(patientId) {
    return Array.from(this.achievements.values())
      .filter(a => a.patientId === patientId)
      .sort((a, b) => new Date(b.awardedAt) - new Date(a.awardedAt));
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * إدارة التقييمات - Assessment Management
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء تقييم
   * Create assessment
   */
  createAssessment(data) {
    const assessmentId = `AS${String(this.assessmentCounter++).padStart(5, '0')}`;

    const assessment = {
      id: assessmentId,
      patientId: data.patientId,
      therapistId: data.therapistId,
      type: data.type, // initial, progress, final
      date: new Date().toISOString(),
      areas: {
        cognitive: data.cognitive || {},
        motor: data.motor || {},
        sensory: data.sensory || {},
        social: data.social || {},
        emotional: data.emotional || {},
      },
      scores: data.scores || {},
      observations: data.observations || '',
      recommendations: data.recommendations || [],
      nextAssessmentDate: data.nextAssessmentDate || null,
      status: 'completed',
    };

    this.assessments.set(assessmentId, assessment);
    return assessment;
  }

  /**
   * الحصول على تقييمات المريض
   * Get patient assessments
   */
  getPatientAssessments(patientId) {
    return Array.from(this.assessments.values())
      .filter(a => a.patientId === patientId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * إدارة التمارين - Exercise Management
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء تمرين مخصص
   * Create custom exercise
   */
  createExercise(data) {
    const exerciseId = `EX${String(this.exerciseCounter++).padStart(5, '0')}`;

    const exercise = {
      id: exerciseId,
      patientId: data.patientId,
      therapistId: data.therapistId,
      title: data.title,
      description: data.description,
      category: data.category,
      difficulty: data.difficulty,
      duration: data.duration,
      frequency: data.frequency, // daily, weekly, etc.
      instructions: data.instructions || [],
      equipment: data.equipment || [],
      targetAreas: data.targetAreas || [],
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    this.exercises.set(exerciseId, exercise);
    return exercise;
  }

  /**
   * الحصول على تمارين المريض
   * Get patient exercises
   */
  getPatientExercises(patientId) {
    return Array.from(this.exercises.values()).filter(
      e => e.patientId === patientId && e.status === 'active'
    );
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * التقارير والإحصائيات - Reports & Analytics
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء تقرير شامل
   * Generate comprehensive report
   */
  generateReport(patientId, options = {}) {
    const patient = this.getPatient(patientId);
    const sessions = this.getPatientSessions(patientId);
    const progress = this.getPatientProgress(patientId);
    const achievements = this.getPatientAchievements(patientId);
    const assessments = this.getPatientAssessments(patientId);

    const reportId = `R${String(this.reportCounter++).padStart(6, '0')}`;

    const report = {
      id: reportId,
      patientId: patientId,
      patient: {
        name: patient.name,
        age: patient.age,
        disabilityType: patient.disabilityType,
        disabilityLevel: patient.disabilityLevel,
      },
      period: {
        from: options.dateFrom || patient.registrationDate,
        to: options.dateTo || new Date().toISOString(),
      },
      summary: {
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        averageScore: this.calculateAverageScore(sessions),
        totalPoints: patient.statistics.totalPoints,
        achievementsEarned: achievements.length,
      },
      performance: {
        progressTrend: this.analyzeProgressTrend(progress),
        strongAreas: this.identifyStrongAreas(sessions),
        improvementAreas: this.identifyImprovementAreas(sessions),
        consistency: this.calculateConsistency(sessions),
      },
      recommendations: this.generateRecommendations(patient, sessions, progress),
      generatedAt: new Date().toISOString(),
      generatedBy: options.therapistId || 'system',
    };

    this.reports.set(reportId, report);
    return report;
  }

  /**
   * لوحة المعلومات للمريض
   * Patient dashboard
   */
  getPatientDashboard(patientId) {
    const patient = this.getPatient(patientId);
    const recentSessions = this.getPatientSessions(patientId, {}).slice(0, 5);
    const achievements = this.getPatientAchievements(patientId);
    const upcomingSessions = recentSessions.filter(s => s.status === 'scheduled');

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        avatar: patient.avatar || '👤',
      },
      statistics: patient.statistics,
      recentActivity: recentSessions.map(s => ({
        date: s.scheduledDate,
        game: this.getGame(s.gameId).title,
        score: s.results.score,
        status: s.status,
      })),
      achievements: achievements.slice(0, 10),
      upcomingSessions: upcomingSessions,
      progressChart: this.generateProgressChart(patientId),
      motivationalMessage: this.getMotivationalMessage(patient),
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * دوال مساعدة - Helper Functions
   * ═══════════════════════════════════════════════════════════════════
   */

  /**
   * حساب المدة الزمنية
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end - start) / 1000 / 60); // in minutes
  }

  /**
   * حساب متوسط النتيجة
   */
  calculateAverageScore(sessions) {
    const completedSessions = sessions.filter(s => s.status === 'completed' && s.results.score);
    if (completedSessions.length === 0) return 0;

    const totalScore = completedSessions.reduce((sum, s) => sum + s.results.score, 0);
    return Math.round(totalScore / completedSessions.length);
  }

  /**
   * حساب متوسط التقدم
   */
  calculateAverageProgress(patients) {
    if (patients.length === 0) return 0;
    const totalProgress = patients.reduce((sum, p) => {
      const progress = this.getPatientProgress(p.id);
      return sum + (progress.length > 0 ? progress[0].metrics.score : 0);
    }, 0);
    return Math.round(totalProgress / patients.length);
  }

  /**
   * حساب معدل النجاح
   */
  calculateSuccessRate(sessions) {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    if (completedSessions.length === 0) return 0;

    const successfulSessions = completedSessions.filter(
      s => s.results.score >= (s.game?.scoring?.passingScore || 60)
    );
    return Math.round((successfulSessions.length / completedSessions.length) * 100);
  }

  /**
   * تحليل اتجاه التقدم
   */
  analyzeProgressTrend(progressRecords) {
    if (progressRecords.length < 2) return 'insufficient_data';

    const recent = progressRecords.slice(0, 5);
    const older = progressRecords.slice(5, 10);

    const recentAvg = recent.reduce((sum, p) => sum + p.metrics.score, 0) / recent.length;
    const olderAvg =
      older.length > 0
        ? older.reduce((sum, p) => sum + p.metrics.score, 0) / older.length
        : recentAvg;

    const improvement = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (improvement > 10) return 'improving';
    if (improvement < -10) return 'declining';
    return 'stable';
  }

  /**
   * تحديد المجالات القوية
   */
  identifyStrongAreas(sessions) {
    const categoryScores = {};

    sessions
      .filter(s => s.status === 'completed')
      .forEach(session => {
        const game = this.getGame(session.gameId);
        if (!categoryScores[game.category]) {
          categoryScores[game.category] = [];
        }
        categoryScores[game.category].push(session.results.score);
      });

    const averages = Object.entries(categoryScores).map(([category, scores]) => ({
      category,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    return averages
      .filter(a => a.average >= 75)
      .sort((a, b) => b.average - a.average)
      .map(a => a.category);
  }

  /**
   * تحديد مجالات التحسين
   */
  identifyImprovementAreas(sessions) {
    const categoryScores = {};

    sessions
      .filter(s => s.status === 'completed')
      .forEach(session => {
        const game = this.getGame(session.gameId);
        if (!categoryScores[game.category]) {
          categoryScores[game.category] = [];
        }
        categoryScores[game.category].push(session.results.score);
      });

    const averages = Object.entries(categoryScores).map(([category, scores]) => ({
      category,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    return averages
      .filter(a => a.average < 60)
      .sort((a, b) => a.average - b.average)
      .map(a => a.category);
  }

  /**
   * حساب الاستمرارية
   */
  calculateConsistency(sessions) {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    if (completedSessions.length < 5) return 'insufficient_data';

    const dates = completedSessions.map(s => new Date(s.scheduledDate).toDateString());
    const uniqueDates = new Set(dates);
    const totalDays = completedSessions.length;
    const activeDays = uniqueDates.size;

    const consistency = (activeDays / totalDays) * 100;

    if (consistency >= 80) return 'excellent';
    if (consistency >= 60) return 'good';
    if (consistency >= 40) return 'moderate';
    return 'needs_improvement';
  }

  /**
   * توليد التوصيات
   */
  generateRecommendations(patient, sessions, progress) {
    const recommendations = [];

    // توصيات بناءً على التقدم
    const trend = this.analyzeProgressTrend(progress);
    if (trend === 'declining') {
      recommendations.push({
        type: 'concern',
        title: 'ملاحظة تراجع في الأداء',
        description: 'يُنصح بمراجعة خطة العلاج وتعديل مستوى الصعوبة',
        priority: 'high',
      });
    }

    // توصيات بناءً على المجالات الضعيفة
    const improvementAreas = this.identifyImprovementAreas(sessions);
    if (improvementAreas.length > 0) {
      recommendations.push({
        type: 'improvement',
        title: 'مجالات تحتاج لتركيز إضافي',
        description: `التركيز على: ${improvementAreas.join(', ')}`,
        priority: 'medium',
      });
    }

    // توصيات بناءً على الاستمرارية
    const consistency = this.calculateConsistency(sessions);
    if (consistency === 'needs_improvement') {
      recommendations.push({
        type: 'engagement',
        title: 'تحسين الاستمرارية',
        description: 'زيادة عدد الجلسات الأسبوعية للحصول على نتائج أفضل',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * توليد رسم بياني للتقدم
   */
  generateProgressChart(patientId) {
    const progress = this.getPatientProgress(patientId);
    return progress
      .slice(0, 10)
      .reverse()
      .map(p => ({
        date: new Date(p.date).toLocaleDateString('ar-EG'),
        score: p.metrics.score,
        accuracy: p.metrics.accuracy,
      }));
  }

  /**
   * الحصول على رسالة تحفيزية
   */
  getMotivationalMessage(patient) {
    const messages = [
      {
        ar: 'أنت تحرز تقدماً رائعاً! استمر في العمل الجيد',
        en: 'Great progress! Keep up the good work',
      },
      { ar: 'كل جلسة تقربك خطوة من هدفك', en: 'Each session brings you closer to your goal' },
      {
        ar: 'التحسن يحتاج وقتاً، وأنت في الطريق الصحيح',
        en: "Improvement takes time, and you're on the right track",
      },
      {
        ar: 'إنجازاتك تثبت قدرتك على التقدم',
        en: 'Your achievements prove your ability to progress',
      },
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * إحصائيات النظام الكاملة
   */
  getSystemStats() {
    return {
      patients: {
        total: this.patients.size,
        active: Array.from(this.patients.values()).filter(p => p.status === 'active').length,
        byDisability: this.groupByDisability(),
      },
      therapists: {
        total: this.therapists.size,
        active: Array.from(this.therapists.values()).filter(t => t.status === 'active').length,
      },
      games: {
        total: this.games.size,
        byCategory: this.groupGamesByCategory(),
      },
      sessions: {
        total: this.sessions.size,
        completed: Array.from(this.sessions.values()).filter(s => s.status === 'completed').length,
        scheduled: Array.from(this.sessions.values()).filter(s => s.status === 'scheduled').length,
      },
      achievements: {
        total: this.achievements.size,
        totalPointsAwarded: Array.from(this.achievements.values()).reduce(
          (sum, a) => sum + a.points,
          0
        ),
      },
    };
  }

  /**
   * تجميع حسب نوع الإعاقة
   */
  groupByDisability() {
    const groups = {};
    Array.from(this.patients.values()).forEach(p => {
      groups[p.disabilityType] = (groups[p.disabilityType] || 0) + 1;
    });
    return groups;
  }

  /**
   * تجميع الألعاب حسب الفئة
   */
  groupGamesByCategory() {
    const groups = {};
    Array.from(this.games.values()).forEach(g => {
      groups[g.category] = (groups[g.category] || 0) + 1;
    });
    return groups;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════
   * تهيئة البيانات الأولية - Initialize Default Data
   * ═══════════════════════════════════════════════════════════════════
   */

  initializeDefaultData() {
    // إضافة معالج افتراضي
    const therapist1 = this.addTherapist({
      name: 'د. سارة أحمد',
      specialization: 'physical',
      credentials: ['بكالوريوس علاج طبيعي', 'ماجستير تأهيل حركي'],
      experience: 8,
      email: 'dr.sarah@rehab.com',
      phone: '+201234567890',
    });

    const therapist2 = this.addTherapist({
      name: 'د. محمد حسن',
      specialization: 'cognitive',
      credentials: ['دكتوراه علم النفس', 'خبير تأهيل معرفي'],
      experience: 12,
      email: 'dr.mohamed@rehab.com',
      phone: '+201234567891',
    });

    // إضافة مرضى للتجربة
    const patient1 = this.addPatient({
      name: 'أحمد علي',
      age: 28,
      gender: 'male',
      disabilityType: 'physical',
      disabilityLevel: 'moderate',
      currentCondition: 'إصابة في الحبل الشوكي - يعمل على تحسين التنسيق الحركي',
      goals: ['تحسين قوة العضلات', 'زيادة مدى الحركة', 'تحسين التوازن'],
      assignedTherapist: therapist1.id,
      email: 'ahmed.ali@email.com',
      phone: '+201111111111',
      address: 'القاهرة، مصر',
      emergencyContact: '+201222222222',
      difficultyLevel: 'beginner',
    });

    const patient2 = this.addPatient({
      name: 'فاطمة محمود',
      age: 35,
      gender: 'female',
      disabilityType: 'cognitive',
      disabilityLevel: 'mild',
      currentCondition: 'إصابة دماغية - تعمل على تحسين الذاكرة والتركيز',
      goals: ['تحسين الذاكرة قصيرة المدى', 'زيادة مدة التركيز', 'تطوير مهارات حل المشكلات'],
      assignedTherapist: therapist2.id,
      email: 'fatma.mahmoud@email.com',
      phone: '+201333333333',
      address: 'الإسكندرية، مصر',
      emergencyContact: '+201444444444',
      difficultyLevel: 'intermediate',
    });

    // إضافة ألعاب تأهيلية
    const game1 = this.addGame({
      title: 'لعبة التوازن الذكي',
      titleEn: 'Smart Balance Game',
      description: 'لعبة تفاعلية لتحسين التوازن والتنسيق الحركي من خلال تحديات ممتعة',
      category: 'motor',
      targetDisability: 'physical',
      difficulty: 'beginner',
      duration: 15,
      minAge: 18,
      maxAge: 65,
      objectives: ['تحسين التوازن', 'تقوية العضلات', 'زيادة التنسيق'],
      instructions: 'اتبع التعليمات على الشاشة وحاول الحفاظ على توازنك',
      equipment: ['وسادة توازن', 'حصيرة'],
      supportsTouch: true,
      supportsMouse: true,
      maxScore: 100,
      passingScore: 60,
      levels: [
        { level: 1, description: 'مستوى مبتدئ', duration: 5 },
        { level: 2, description: 'مستوى متوسط', duration: 7 },
        { level: 3, description: 'مستوى متقدم', duration: 10 },
      ],
    });

    const game2 = this.addGame({
      title: 'تحدي الذاكرة',
      titleEn: 'Memory Challenge',
      description: 'لعبة تفاعلية لتقوية الذاكرة والتركيز من خلال أنماط وصور',
      category: 'cognitive',
      targetDisability: 'cognitive',
      difficulty: 'beginner',
      duration: 10,
      minAge: 20,
      maxAge: 70,
      objectives: ['تحسين الذاكرة قصيرة المدى', 'زيادة التركيز', 'تطوير الانتباه البصري'],
      instructions: 'تذكر الأنماط والصور ثم قم بإعادة ترتيبها بشكل صحيح',
      equipment: [],
      supportsTouch: true,
      supportsMouse: true,
      supportsKeyboard: true,
      colorBlindSafe: true,
      maxScore: 100,
      passingScore: 70,
      levels: [
        { level: 1, description: '4 عناصر', duration: 3 },
        { level: 2, description: '6 عناصر', duration: 5 },
        { level: 3, description: '8 عناصر', duration: 7 },
      ],
    });

    const game3 = this.addGame({
      title: 'لعبة التنسيق البصري الحركي',
      titleEn: 'Hand-Eye Coordination Game',
      description: 'تحسين التنسيق بين العين واليد من خلال أنشطة تفاعلية',
      category: 'coordination',
      targetDisability: 'physical',
      difficulty: 'intermediate',
      duration: 12,
      minAge: 15,
      maxAge: 60,
      objectives: ['تحسين التنسيق', 'زيادة سرعة الاستجابة', 'تطوير الدقة'],
      instructions: 'اضغط على الأهداف المتحركة بأسرع وقت ممكن',
      equipment: ['شاشة لمس أو ماوس'],
      supportsTouch: true,
      supportsMouse: true,
      maxScore: 100,
      passingScore: 65,
      levels: [
        { level: 1, description: 'سرعة بطيئة', duration: 4 },
        { level: 2, description: 'سرعة متوسطة', duration: 6 },
        { level: 3, description: 'سرعة سريعة', duration: 8 },
      ],
    });

    // إنشاء جلسة تجريبية
    const session1 = this.createSession({
      patientId: patient1.id,
      therapistId: therapist1.id,
      gameId: game1.id,
      type: 'training',
      scheduledDate: new Date().toISOString(),
      duration: 15,
      difficulty: 'beginner',
      goals: ['تحسين التوازن الأساسي', 'زيادة الثقة في الحركة'],
    });

    // بدء وإنهاء الجلسة كمثال
    this.startSession(session1.id);
    this.completeSession(session1.id, {
      score: 75,
      accuracy: 82,
      speed: 70,
      consistency: 78,
      independence: 85,
      engagement: 90,
      attempts: 3,
      errors: [],
      feedback: 'أداء جيد جداً للجلسة الأولى',
    });

    console.log('✅ تم تهيئة نظام الألعاب التفاعلية لتأهيل ذوي الإعاقة');
    console.log(`📊 المعالجون: ${this.therapists.size}`);
    console.log(`👥 المرضى: ${this.patients.size}`);
    console.log(`🎮 الألعاب: ${this.games.size}`);
    console.log(`📅 الجلسات: ${this.sessions.size}`);
  }
}

// تصدير الفئة
module.exports = InteractiveGamesRehabSystem;
