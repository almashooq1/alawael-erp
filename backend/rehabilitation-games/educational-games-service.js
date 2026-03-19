/* eslint-disable no-unused-vars */
/**
 * Educational Games Service for Disability Rehabilitation
 * خدمة الألعاب التعليمية التفاعلية لتأهيل ذوي الإعاقة
 */

class EducationalGamesService {
  constructor() {
    this.games = new Map();
    this.gameSessions = new Map();
    this.playerProgress = new Map();
    this.leaderboard = new Map();
  }

  // ==========================================
  // ألعاب النطق والتخاطب
  // ==========================================
  getSpeechGames() {
    return {
      // لعبة نطق الحروف
      letterPronunciation: {
        id: 'letter_pronunciation',
        name: 'لعبة نطق الحروف',
        nameEn: 'Letter Pronunciation Game',
        type: 'speech',
        difficulty: ['easy', 'medium', 'hard'],
        description: 'التعرف على الحروف ونطقها بشكل صحيح',
        targetSkills: ['articulation', 'sound_recognition'],
        ageGroup: ['3-6', '7-12'],
        duration: '10-15 دقيقة',

        levels: [
          {
            level: 1,
            name: 'الحروف الأساسية',
            letters: ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
            instructions: 'استمع للحرف وكرره',
            pointsPerCorrect: 10,
            attempts: 3,
          },
          {
            level: 2,
            name: 'الحركات',
            letters: ['بَ', 'بُ', 'بِ', 'تَ', 'تُ', 'تِ'],
            instructions: 'استمع للحرف مع الحركة وكرره',
            pointsPerCorrect: 15,
            attempts: 3,
          },
          {
            level: 3,
            name: 'المقاطع',
            letters: ['با', 'بو', 'بي', 'تا', 'تو', 'تي'],
            instructions: 'استمع للمقطع وكرره',
            pointsPerCorrect: 20,
            attempts: 2,
          },
        ],
      },

      // لعبة مطابقة الصوت بالصورة
      soundImageMatching: {
        id: 'sound_image_matching',
        name: 'مطابقة الصوت بالصورة',
        nameEn: 'Sound-Image Matching',
        type: 'speech',
        difficulty: ['easy', 'medium'],
        description: 'ربط الصوت بالصورة المناسبة',
        targetSkills: ['listening', 'vocabulary', 'association'],

        categories: {
          animals: {
            name: 'الحيوانات',
            items: [
              { word: 'قطة', image: 'cat.png', sound: 'cat.mp3' },
              { word: 'كلب', image: 'dog.png', sound: 'dog.mp3' },
              { word: 'حصان', image: 'horse.png', sound: 'horse.mp3' },
              { word: 'بقرة', image: 'cow.png', sound: 'cow.mp3' },
              { word: 'أسد', image: 'lion.png', sound: 'lion.mp3' },
            ],
          },
          fruits: {
            name: 'الفواكه',
            items: [
              { word: 'تفاحة', image: 'apple.png', sound: 'apple.mp3' },
              { word: 'موزة', image: 'banana.png', sound: 'banana.mp3' },
              { word: 'برتقالة', image: 'orange.png', sound: 'orange.mp3' },
            ],
          },
          objects: {
            name: 'الأشياء',
            items: [
              { word: 'كرة', image: 'ball.png', sound: 'ball.mp3' },
              { word: 'كتاب', image: 'book.png', sound: 'book.mp3' },
              { word: 'قلم', image: 'pen.png', sound: 'pen.mp3' },
            ],
          },
        },
      },

      // لعبة تكملة الكلمة
      wordCompletion: {
        id: 'word_completion',
        name: 'تكملة الكلمة',
        nameEn: 'Word Completion',
        type: 'speech',
        difficulty: ['easy', 'medium', 'hard'],
        description: 'تكملة الحرف الناقص في الكلمة',
        targetSkills: ['phonemic_awareness', 'spelling'],

        exercises: [
          { word: '_اب', missing: 'ب', options: ['ب', 'م', 'ت'], hint: 'نستخدمه للفتح' },
          { word: '_ماء', missing: 'م', options: ['ب', 'م', 'ت'], hint: 'نشربه' },
          { word: '_فاحة', missing: 'ت', options: ['ب', 'م', 'ت'], hint: 'فاكهة حمراء' },
          { word: '_وز', missing: 'م', options: ['ب', 'م', 'ت'], hint: 'فاكهة صفراء' },
        ],
      },
    };
  }

  // ==========================================
  // ألعاب اللغة والتواصل
  // ==========================================
  getLanguageGames() {
    return {
      // لعبة تصنيف الكلمات
      wordClassification: {
        id: 'word_classification',
        name: 'تصنيف الكلمات',
        nameEn: 'Word Classification',
        type: 'language',
        difficulty: ['easy', 'medium'],
        description: 'تصنيف الكلمات حسب الفئة',
        targetSkills: ['categorization', 'vocabulary'],

        categories: [
          {
            name: 'حيوانات',
            color: '#FF6B6B',
            words: ['قطة', 'كلب', 'أسد', 'فيل', 'زرافة'],
          },
          {
            name: 'فواكه',
            color: '#4ECDC4',
            words: ['تفاح', 'موز', 'برتقال', 'عنب', 'فراولة'],
          },
          {
            name: 'خضروات',
            color: '#45B7D1',
            words: ['جزر', 'طماطم', 'خيار', 'بطاطس', 'بصل'],
          },
          {
            name: 'ألوان',
            color: '#96CEB4',
            words: ['أحمر', 'أزرق', 'أخضر', 'أصفر', 'برتقالي'],
          },
        ],
      },

      // لعبة ترتيب الكلمات
      wordOrdering: {
        id: 'word_ordering',
        name: 'ترتيب الكلمات',
        nameEn: 'Word Ordering',
        type: 'language',
        difficulty: ['medium', 'hard'],
        description: 'ترتيب الكلمات لتكوين جملة صحيحة',
        targetSkills: ['sentence_construction', 'grammar'],

        sentences: [
          {
            correct: ['الولد', 'يلعب', 'بالكرّة'],
            shuffled: ['بالكرّة', 'الولد', 'يلعب'],
            hint: 'فعل + فاعل + مفعول به',
          },
          {
            correct: ['البنت', 'تأكل', 'تفاحة'],
            shuffled: ['تفاحة', 'البنت', 'تأكل'],
            hint: 'من يأكل؟ وماذا يأكل؟',
          },
          {
            correct: ['أنا', 'أحب', 'المدرسة'],
            shuffled: ['المدرسة', 'أحب', 'أنا'],
            hint: 'التعبير عن المشاعر',
          },
        ],
      },

      // لعبة الأضداد
      antonyms: {
        id: 'antonyms',
        name: 'لعبة الأضداد',
        nameEn: 'Antonyms Game',
        type: 'language',
        difficulty: ['easy', 'medium'],
        description: 'التعرف على الكلمات المتضادة',
        targetSkills: ['vocabulary', 'critical_thinking'],

        pairs: [
          { word: 'كبير', opposite: 'صغير', options: ['صغير', 'طويل', 'عريض'] },
          { word: 'طويل', opposite: 'قصير', options: ['قصير', 'كبير', 'سمين'] },
          { word: 'سعيد', opposite: 'حزين', options: ['حزين', 'غاضب', 'خائف'] },
          { word: 'ساخن', opposite: 'بارد', options: ['بارد', 'دافئ', 'مثلج'] },
          { word: 'نهار', opposite: 'ليل', options: ['ليل', 'صباح', 'مساء'] },
          { word: 'أبيض', opposite: 'أسود', options: ['أسود', 'أحمر', 'أزرق'] },
        ],
      },

      // لعبة المرادفات
      synonyms: {
        id: 'synonyms',
        name: 'لعبة المرادفات',
        nameEn: 'Synonyms Game',
        type: 'language',
        difficulty: ['medium', 'hard'],
        description: 'التعرف على الكلمات المتشابهة في المعنى',
        targetSkills: ['vocabulary', 'language_comprehension'],

        pairs: [
          { word: 'فرح', synonym: 'سعيد', options: ['سعيد', 'حزين', 'غاضب'] },
          { word: 'جلس', synonym: 'قعد', options: ['قعد', 'وقف', 'نام'] },
          { word: 'نظر', synonym: 'أبصر', options: ['أبصر', 'سمع', 'لمس'] },
          { word: 'قوي', synonym: 'شديد', options: ['شديد', 'ضعيف', 'ناعم'] },
        ],
      },
    };
  }

  // ==========================================
  // ألعاب الذاكرة والانتباه
  // ==========================================
  getCognitiveGames() {
    return {
      // لعبة الذاكرة
      memoryGame: {
        id: 'memory_game',
        name: 'لعبة الذاكرة',
        nameEn: 'Memory Game',
        type: 'cognitive',
        difficulty: ['easy', 'medium', 'hard'],
        description: 'البحث عن الصور المتطابقة',
        targetSkills: ['memory', 'concentration', 'visual_processing'],

        configurations: {
          easy: { pairs: 4, gridSize: '2x4', timeLimit: 120 },
          medium: { pairs: 8, gridSize: '4x4', timeLimit: 180 },
          hard: { pairs: 12, gridSize: '4x6', timeLimit: 240 },
        },

        themes: {
          animals: ['🐱', '🐶', '🦁', '🐘', '🦒', '🐻', '🦊', '🐰'],
          fruits: ['🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🥝', '🍑'],
          shapes: ['⭐', '❤️', '🔵', '🟢', '🟡', '🟣', '🔶', '🔷'],
          letters: ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د'],
        },
      },

      // لعبة التسلسل
      sequenceGame: {
        id: 'sequence_game',
        name: 'لعبة التسلسل',
        nameEn: 'Sequence Game',
        type: 'cognitive',
        difficulty: ['easy', 'medium', 'hard'],
        description: 'تذكر التسلسل الصحيح',
        targetSkills: ['sequential_memory', 'attention'],

        levels: [
          { sequence: [1, 2, 3], length: 3, speed: 'slow' },
          { sequence: [1, 2, 3, 4], length: 4, speed: 'slow' },
          { sequence: [1, 2, 3, 4, 5], length: 5, speed: 'medium' },
          { sequence: [1, 2, 3, 4, 5, 6], length: 6, speed: 'medium' },
        ],
      },

      // لعبة البحث عن الفروقات
      spotDifference: {
        id: 'spot_difference',
        name: 'البحث عن الفروقات',
        nameEn: 'Spot the Difference',
        type: 'cognitive',
        difficulty: ['easy', 'medium', 'hard'],
        description: 'إيجاد الفروقات بين الصورتين',
        targetSkills: ['visual_discrimination', 'attention_to_detail'],

        scenes: [
          { id: 1, name: 'في الحديقة', differences: 3, difficulty: 'easy' },
          { id: 2, name: 'في المدرسة', differences: 5, difficulty: 'medium' },
          { id: 3, name: 'في المنزل', differences: 7, difficulty: 'hard' },
        ],
      },
    };
  }

  // ==========================================
  // ألعاب الحركة والتنسيق
  // ==========================================
  getMotorGames() {
    return {
      // لعبة التتبع
      tracingGame: {
        id: 'tracing_game',
        name: 'لعبة التتبع',
        nameEn: 'Tracing Game',
        type: 'motor',
        difficulty: ['easy', 'medium', 'hard'],
        description: 'تتبع المسار بالشكل الصحيح',
        targetSkills: ['fine_motor', 'hand_eye_coordination'],

        patterns: {
          shapes: ['دائرة', 'مربع', 'مثلث', 'مستطيل'],
          letters: ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
          numbers: ['١', '٢', '٣', '٤', '٥'],
        },
      },

      // لعبة الرسم
      drawingGame: {
        id: 'drawing_game',
        name: 'لعبة الرسم',
        nameEn: 'Drawing Game',
        type: 'motor',
        difficulty: ['easy', 'medium'],
        description: 'رسم الأشكال والرسومات البسيطة',
        targetSkills: ['fine_motor', 'creativity', 'visual_motor'],

        categories: {
          basic: ['خط مستقيم', 'خط منحني', 'دائرة', 'مربع'],
          intermediate: ['وجه سعيد', 'شجرة', 'منزل', 'شمس'],
          advanced: ['إنسان', 'حيوان', 'منظر طبيعي'],
        },
      },
    };
  }

  // ==========================================
  // ألعاب اجتماعية وعاطفية
  // ==========================================
  getSocialEmotionalGames() {
    return {
      // لعبة التعرف على المشاعر
      emotionRecognition: {
        id: 'emotion_recognition',
        name: 'التعرف على المشاعر',
        nameEn: 'Emotion Recognition',
        type: 'social_emotional',
        difficulty: ['easy', 'medium'],
        description: 'التعرف على المشاعر من تعابير الوجه',
        targetSkills: ['emotion_recognition', 'social_awareness'],

        emotions: [
          { name: 'سعيد', emoji: '😊', description: 'الابتسامة والسرور' },
          { name: 'حزين', emoji: '😢', description: 'الدموع والحزن' },
          { name: 'غاضب', emoji: '😠', description: 'الغضب والانزعاج' },
          { name: 'خائف', emoji: '😨', description: 'الخوف والقلق' },
          { name: 'متفاجئ', emoji: '😲', description: 'المفاجأة والدهشة' },
          { name: 'متحمس', emoji: '🤩', description: 'الحماس والسعادة' },
        ],

        scenarios: [
          { situation: 'حصلت على هدية', emotion: 'سعيد' },
          { situation: 'فقدت لعبتي', emotion: 'حزين' },
          { situation: 'كسر أحمد كأسي', emotion: 'غاضب' },
          { situation: 'سمعت صوتاً غريباً في الليل', emotion: 'خائف' },
        ],
      },

      // لعبة المواقف الاجتماعية
      socialScenarios: {
        id: 'social_scenarios',
        name: 'المواقف الاجتماعية',
        nameEn: 'Social Scenarios',
        type: 'social_emotional',
        difficulty: ['medium', 'hard'],
        description: 'التعامل مع المواقف الاجتماعية',
        targetSkills: ['social_skills', 'problem_solving', 'empathy'],

        situations: [
          {
            scenario: 'صديقك يبكي في الفصل',
            correctResponse: 'أسأله ماذا حدث وأواسيه',
            options: ['أسأله ماذا حدث وأواسيه', 'أتجاهله', 'أضحك عليه'],
            explanation: 'مساعدة الآخرين واجب',
          },
          {
            scenario: 'أراد صديقي لعبتي',
            correctResponse: 'أعيره إياها',
            options: ['أعيره إياها', 'أرفض بشدة', 'أخذ لعبته بدلاً منها'],
            explanation: 'المشاركة صفة حميدة',
          },
        ],
      },
    };
  }

  // ==========================================
  // إدارة جلسات اللعب
  // ==========================================
  async startGameSession(beneficiaryId, gameId, config) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      gameId,
      startTime: new Date(),
      config: {
        difficulty: config.difficulty || 'easy',
        duration: config.duration,
        assistiveTech: config.assistiveTech || [],
      },
      progress: {
        currentLevel: 1,
        score: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        hintsUsed: 0,
        timeSpent: 0,
      },
      events: [],
      status: 'active',
    };

    this.gameSessions.set(session.id, session);
    return session;
  }

  async recordGameEvent(sessionId, eventData) {
    const session = this.gameSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const event = {
      timestamp: new Date(),
      type: eventData.type, // answer, hint, pause, resume, complete
      data: eventData.data,
      result: eventData.result, // correct, incorrect, skipped
    };

    session.events.push(event);

    // تحديث التقدم
    if (eventData.type === 'answer') {
      if (eventData.result === 'correct') {
        session.progress.correctAnswers++;
        session.progress.score += eventData.points || 10;
      } else {
        session.progress.incorrectAnswers++;
      }
    } else if (eventData.type === 'hint') {
      session.progress.hintsUsed++;
    }

    return session;
  }

  async endGameSession(sessionId) {
    const session = this.gameSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.endTime = new Date();
    session.status = 'completed';
    session.progress.timeSpent = Math.round((session.endTime - session.startTime) / 1000);

    // حساب الإحصائيات
    session.statistics = this._calculateSessionStatistics(session);

    // تحديث تقدم اللاعب
    this._updatePlayerProgress(session);

    // تحديث لوحة المتصدرين
    this._updateLeaderboard(session);

    return session;
  }

  _calculateSessionStatistics(session) {
    const total = session.progress.correctAnswers + session.progress.incorrectAnswers;
    const accuracy = total > 0 ? Math.round((session.progress.correctAnswers / total) * 100) : 0;

    return {
      accuracy,
      averageTimePerQuestion: Math.round(session.progress.timeSpent / total) || 0,
      hintsPerGame: session.progress.hintsUsed,
      finalScore: session.progress.score,
      stars: this._calculateStars(accuracy),
      badge: this._calculateBadge(accuracy, session.progress.timeSpent),
    };
  }

  _calculateStars(accuracy) {
    if (accuracy >= 90) return 3;
    if (accuracy >= 70) return 2;
    if (accuracy >= 50) return 1;
    return 0;
  }

  _calculateBadge(accuracy, timeSpent) {
    if (accuracy >= 95 && timeSpent < 60) return 'gold';
    if (accuracy >= 85) return 'silver';
    if (accuracy >= 70) return 'bronze';
    return null;
  }

  _updatePlayerProgress(session) {
    const progress = this.playerProgress.get(session.beneficiaryId) || {
      totalGames: 0,
      totalScore: 0,
      gamesByType: {},
      achievements: [],
      streakDays: 0,
      lastPlayDate: null,
    };

    progress.totalGames++;
    progress.totalScore += session.progress.score;

    const gameType = session.gameId.split('_')[0];
    progress.gamesByType[gameType] = (progress.gamesByType[gameType] || 0) + 1;

    // تحقق من الإنجازات
    const newAchievements = this._checkAchievements(session, progress);
    progress.achievements.push(...newAchievements);

    this.playerProgress.set(session.beneficiaryId, progress);
  }

  _checkAchievements(session, progress) {
    const achievements = [];

    // إنجاز أول لعبة
    if (progress.totalGames === 1) {
      achievements.push({
        id: 'first_game',
        name: 'أول لعبة',
        icon: '🎮',
        date: new Date(),
      });
    }

    // إنجاز 10 ألعاب
    if (progress.totalGames === 10) {
      achievements.push({
        id: 'ten_games',
        name: 'لاعب نشيط',
        icon: '⭐',
        date: new Date(),
      });
    }

    // إنجاز درجة كاملة
    if (session.statistics.accuracy === 100) {
      achievements.push({
        id: 'perfect_score',
        name: 'درجة كاملة',
        icon: '💯',
        date: new Date(),
      });
    }

    return achievements;
  }

  _updateLeaderboard(session) {
    const gameLeaderboard = this.leaderboard.get(session.gameId) || [];

    gameLeaderboard.push({
      beneficiaryId: session.beneficiaryId,
      score: session.progress.score,
      accuracy: session.statistics.accuracy,
      date: session.endTime,
    });

    // ترتيب حسب النقاط
    gameLeaderboard.sort((a, b) => b.score - a.score);

    // الاحتفاظ بأفضل 10 فقط
    this.leaderboard.set(session.gameId, gameLeaderboard.slice(0, 10));
  }

  // ==========================================
  // الحصول على التوصيات
  // ==========================================
  async getRecommendedGames(beneficiaryId, assessmentData) {
    const recommendations = [];

    // بناءً على مجالات التحسين
    if (assessmentData.speech?.needsImprovement) {
      recommendations.push({
        gameId: 'letter_pronunciation',
        priority: 'high',
        reason: 'تحسين مهارات النطق',
      });
      recommendations.push({
        gameId: 'sound_image_matching',
        priority: 'high',
        reason: 'تقوية الربط الصوتي البصري',
      });
    }

    if (assessmentData.language?.needsImprovement) {
      recommendations.push({
        gameId: 'word_classification',
        priority: 'medium',
        reason: 'تطوير المفردات والتصنيف',
      });
      recommendations.push({
        gameId: 'word_ordering',
        priority: 'medium',
        reason: 'تحسين بناء الجمل',
      });
    }

    if (assessmentData.memory?.needsImprovement) {
      recommendations.push({
        gameId: 'memory_game',
        priority: 'high',
        reason: 'تقوية الذاكرة',
      });
      recommendations.push({
        gameId: 'sequence_game',
        priority: 'medium',
        reason: 'تحسين الذاكرة التسلسلية',
      });
    }

    if (assessmentData.social?.needsImprovement) {
      recommendations.push({
        gameId: 'emotion_recognition',
        priority: 'medium',
        reason: 'تحسين التعرف على المشاعر',
      });
      recommendations.push({
        gameId: 'social_scenarios',
        priority: 'medium',
        reason: 'تطوير المهارات الاجتماعية',
      });
    }

    return recommendations;
  }

  // ==========================================
  // تقارير الأداء
  // ==========================================
  async getPlayerReport(beneficiaryId) {
    const progress = this.playerProgress.get(beneficiaryId);

    if (!progress) {
      return {
        beneficiaryId,
        message: 'لا توجد بيانات لعب متاحة',
      };
    }

    return {
      beneficiaryId,
      summary: {
        totalGames: progress.totalGames,
        totalScore: progress.totalScore,
        achievements: progress.achievements.length,
        favoriteType: this._getFavoriteGameType(progress.gamesByType),
      },
      achievements: progress.achievements,
      gamesByType: progress.gamesByType,
      recommendations: await this.getRecommendedGames(beneficiaryId, {
        speech: { needsImprovement: !progress.gamesByType.speech },
        language: { needsImprovement: !progress.gamesByType.language },
        memory: { needsImprovement: !progress.gamesByType.cognitive },
      }),
    };
  }

  _getFavoriteGameType(gamesByType) {
    let maxType = null;
    let maxCount = 0;

    for (const [type, count] of Object.entries(gamesByType)) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }

    return maxType;
  }
}

module.exports = { EducationalGamesService };
