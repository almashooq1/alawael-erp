/* eslint-disable no-unused-vars */
/**
 * Speech Therapy Activities Service
 * خدمة أنشطة وتمارين النطق والتخاطب الشاملة
 *
 * Comprehensive Arabic speech therapy activities and exercises
 */

class SpeechTherapyActivitiesService {
  constructor() {
    this.activities = new Map();
    this.exercises = new Map();
    this.progress = new Map();
    this.sessions = new Map();
  }

  // ==========================================
  // الحروف العربية وتصنيفاتها
  // ==========================================
  getArabicConsonants() {
    return {
      // الحروف الشفوية
      labial: {
        name: 'الحروف الشفوية',
        sounds: ['ب', 'م', 'ف', 'و'],
        description: 'حروف تُنطق باستخدام الشفتين',
        exercises: [
          { id: 'labial_1', name: 'ضم الشفتين', instructions: 'ضم الشفتين معاً ثم إرخائهما' },
          { id: 'labial_2', name: 'نطق الباء', instructions: 'نطق "با" مع ضغط الشفتين' },
          { id: 'labial_3', name: 'نطق الميم', instructions: 'نطق "ما" مع إغلاق الشفتين' },
          {
            id: 'labial_4',
            name: 'نطق الفاء',
            instructions: 'نطق "فا" مع ملامسة الأسنان للشفة السفلى',
          },
        ],
      },

      // الحروف الأسنانية الشفوية
      labiodental: {
        name: 'الحروف الأسنانية الشفوية',
        sounds: ['ف'],
        description: 'حروف تُنطق بملامسة الأسنان للشفة',
        exercises: [
          {
            id: 'labiodental_1',
            name: 'تمرين الفاء',
            instructions: 'وضع الأسنان العليا على الشفة السفلى ونطق "ف"',
          },
        ],
      },

      // الحروف الأسنانية
      dental: {
        name: 'الحروف الأسنانية',
        sounds: ['ث', 'ذ', 'ظ'],
        description: 'حروف تُنطق بملامسة طرف اللسان للأسنان',
        exercises: [
          {
            id: 'dental_1',
            name: 'تمرين الثاء',
            instructions: 'وضع طرف اللسان بين الأسنان ونطق "ث"',
          },
          {
            id: 'dental_2',
            name: 'تمرين الذال',
            instructions: 'وضع طرف اللسان بين الأسنان ونطق "ذ"',
          },
          {
            id: 'dental_3',
            name: 'تمرين الظاء',
            instructions: 'وضع طرف اللسان بين الأسنان ونطق "ظ"',
          },
        ],
      },

      // الحروف النطعية
      alveolar: {
        name: 'الحروف النطعية',
        sounds: ['ت', 'د', 'ن', 'ل', 'ر', 'س', 'ز', 'ص', 'ض', 'ط', 'ظ'],
        description: 'حروف تُنطق بملامسة طرف اللسان للنطع',
        exercises: [
          {
            id: 'alveolar_1',
            name: 'تمرين التاء',
            instructions: 'وضع طرف اللسان خلف الأسنان العليا ونطق "ت"',
          },
          {
            id: 'alveolar_2',
            name: 'تمرين الدال',
            instructions: 'وضع طرف اللسان خلف الأسنان العليا ونطق "د"',
          },
          {
            id: 'alveolar_3',
            name: 'تمرين النون',
            instructions: 'وضع طرف اللسان خلف الأسنان العليا ونطق "ن"',
          },
          {
            id: 'alveolar_4',
            name: 'تمرين الراء',
            instructions: 'اهتزاز طرف اللسان خلف الأسنان العليا',
          },
          {
            id: 'alveolar_5',
            name: 'تمرين السين',
            instructions: 'وضع طرف اللسان خلف الأسنان وإصدار صوت "س"',
          },
        ],
      },

      // الحروف الغاربة
      palatal: {
        name: 'الحروف الغاربة',
        sounds: ['ج', 'ش', 'ي'],
        description: 'حروف تُنطق بملامسة وسط اللسان للغار',
        exercises: [
          { id: 'palatal_1', name: 'تمرين الجيم', instructions: 'رفع وسط اللسان للغار ونطق "ج"' },
          { id: 'palatal_2', name: 'تمرين الشين', instructions: 'رفع وسط اللسان وإصدار صوت "ش"' },
        ],
      },

      // الحروف الطبقية
      velar: {
        name: 'الحروف الطبقية',
        sounds: ['ك', 'ق', 'غ', 'خ'],
        description: 'حروف تُنطق بملامسة مؤخرة اللسان للطبق',
        exercises: [
          { id: 'velar_1', name: 'تمرين الكاف', instructions: 'رفع مؤخرة اللسان للطبق ونطق "ك"' },
          { id: 'velar_2', name: 'تمرين القاف', instructions: 'رفع مؤخرة اللسال للطبق ونطق "ق"' },
        ],
      },

      // الحروف الحلقية
      pharyngeal: {
        name: 'الحروف الحلقية',
        sounds: ['ع', 'ح', 'هـ'],
        description: 'حروف تُنطق من الحلق',
        exercises: [
          { id: 'pharyngeal_1', name: 'تمرين العين', instructions: 'تضييق الحلق ونطق "ع"' },
          {
            id: 'pharyngeal_2',
            name: 'تمرين الحاء',
            instructions: 'إخراج الهواء من الحلق ونطق "ح"',
          },
        ],
      },

      // الحروف اللهوية
      laryngeal: {
        name: 'الحروف اللهوية',
        sounds: ['أ', 'ء', 'هـ'],
        description: 'حروف تُنطق من الحنجرة',
        exercises: [
          {
            id: 'laryngeal_1',
            name: 'تمرين الهمزة',
            instructions: 'إغلاق الأحبال الصوتية ثم فتحها',
          },
        ],
      },
    };
  }

  // ==========================================
  // الحركات العربية
  // ==========================================
  getArabicVowels() {
    return {
      short: {
        name: 'الحركات القصيرة',
        vowels: [
          { symbol: 'َ', name: 'الفتحة', sound: 'a', examples: ['كَتَبَ', 'ذَهَبَ', 'قَرَأَ'] },
          { symbol: 'ُ', name: 'الضمة', sound: 'u', examples: ['كُتُب', 'يَكْتُب', 'يَذْهَب'] },
          { symbol: 'ِ', name: 'الكسرة', sound: 'i', examples: ['كِتَاب', 'قَلَمِ', 'مَدْرَسَة'] },
        ],
        exercises: [
          {
            id: 'vowel_short_1',
            name: 'تمرين الفتحة',
            instructions: 'نطق الحروف مع الفتحة: بَ، تَ، ثَ',
          },
          {
            id: 'vowel_short_2',
            name: 'تمرين الضمة',
            instructions: 'نطق الحروف مع الضمة: بُ، تُ، ثُ',
          },
          {
            id: 'vowel_short_3',
            name: 'تمرين الكسرة',
            instructions: 'نطق الحروف مع الكسرة: بِ، تِ، ثِ',
          },
        ],
      },
      long: {
        name: 'الحركات الطويلة',
        vowels: [
          { letter: 'ا', name: 'الألف', sound: 'aa', examples: ['باب', 'كتاب', 'بيان'] },
          { letter: 'و', name: 'الواو', sound: 'uu', examples: ['قوّة', 'سور', 'يوم'] },
          { letter: 'ي', name: 'الياء', sound: 'ii', examples: ['قيل', 'ميل', 'سير'] },
        ],
        exercises: [
          { id: 'vowel_long_1', name: 'تمرين الألف', instructions: 'نطق كلمات بالألف: با، تا، ثا' },
          { id: 'vowel_long_2', name: 'تمرين الواو', instructions: 'نطق كلمات بالواو: بو، تو، ثو' },
          { id: 'vowel_long_3', name: 'تمرين الياء', instructions: 'نطق كلمات بالياء: بي، تي، ثي' },
        ],
      },
      tanween: {
        name: 'التنوين',
        types: [
          { symbol: 'ً', name: 'تنوين الفتح', examples: ['كتاباً', 'قلمًا'] },
          { symbol: 'ٌ', name: 'تنوين الضم', examples: ['كتابٌ', 'قلمٌ'] },
          { symbol: 'ٍ', name: 'تنوين الكسر', examples: ['كتابٍ', 'قلمٍ'] },
        ],
      },
    };
  }

  // ==========================================
  // أنشطة تقييم النطق
  // ==========================================
  async createArticulationAssessment(beneficiaryId, assessmentData) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      type: 'articulation',

      // تقييم كل صوت
      soundAssessment: {},

      // نتائج التقييم
      results: {
        correctSounds: [],
        distortedSounds: [],
        substitutedSounds: [],
        omittedSounds: [],
        additionSounds: [],
      },

      // مستوى الوضوح الكلامي
      intelligibility: {
        singleWords: 0,
        sentences: 0,
        conversation: 0,
        overall: 0,
      },

      status: 'completed',
    };

    // تقييم كل حرف
    const consonants = this.getArabicConsonants();
    for (const [category, data] of Object.entries(consonants)) {
      for (const sound of data.sounds) {
        assessment.soundAssessment[sound] = {
          category: category,
          status: assessmentData.sounds?.[sound] || 'not_tested',
          accuracy: assessmentData.accuracy?.[sound] || 0,
          notes: assessmentData.notes?.[sound] || '',
        };
      }
    }

    // حساب النتائج
    this._calculateAssessmentResults(assessment);

    this.activities.set(assessment.id, assessment);
    return assessment;
  }

  // ==========================================
  // حساب نتائج التقييم
  // ==========================================
  _calculateAssessmentResults(assessment) {
    const sounds = Object.entries(assessment.soundAssessment);

    assessment.results.correctSounds = sounds
      .filter(([_, data]) => data.status === 'correct')
      .map(([sound, _]) => sound);

    assessment.results.distortedSounds = sounds
      .filter(([_, data]) => data.status === 'distorted')
      .map(([sound, _]) => sound);

    assessment.results.substitutedSounds = sounds
      .filter(([_, data]) => data.status === 'substituted')
      .map(([sound, _]) => sound);

    assessment.results.omittedSounds = sounds
      .filter(([_, data]) => data.status === 'omitted')
      .map(([sound, _]) => sound);

    // حساب الوضوح الإجمالي
    const correctCount = assessment.results.correctSounds.length;
    const totalCount = sounds.filter(([_, data]) => data.status !== 'not_tested').length;

    if (totalCount > 0) {
      assessment.intelligibility.overall = Math.round((correctCount / totalCount) * 100);
    }
  }

  // ==========================================
  // إنشاء نشاط علاجي
  // ==========================================
  async createTherapeuticActivity(beneficiaryId, activityData) {
    const activity = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),

      // معلومات النشاط
      type: activityData.type, // articulation, language, voice, fluency, swallowing
      subtype: activityData.subtype,
      name: activityData.name,
      description: activityData.description,

      // الأهداف
      goals: {
        primary: activityData.primaryGoal,
        secondary: activityData.secondaryGoals || [],
      },

      // المستوى
      level: activityData.level || 'beginner', // beginner, intermediate, advanced

      // التمارين
      exercises: [],

      // المعايير
      criteria: {
        masteryLevel: activityData.masteryLevel || 90,
        minSessions: activityData.minSessions || 5,
        frequency: activityData.frequency || 'daily',
      },

      // المواد المطلوبة
      materials: activityData.materials || [],

      // التعليمات
      instructions: {
        therapist: activityData.therapistInstructions || '',
        client: activityData.clientInstructions || '',
        caregiver: activityData.caregiverInstructions || '',
      },

      // التقدم
      progress: {
        sessionsCompleted: 0,
        averageAccuracy: 0,
        lastSessionDate: null,
        status: 'not_started',
      },

      status: 'active',
    };

    // إضافة التمارين بناءً على النوع
    activity.exercises = this._generateExercises(activity);

    this.activities.set(activity.id, activity);
    return activity;
  }

  // ==========================================
  // توليد التمارين
  // ==========================================
  _generateExercises(activity) {
    const exercises = [];

    switch (activity.type) {
      case 'articulation':
        return this._generateArticulationExercises(activity);
      case 'language':
        return this._generateLanguageExercises(activity);
      case 'voice':
        return this._generateVoiceExercises(activity);
      case 'fluency':
        return this._generateFluencyExercises(activity);
      case 'swallowing':
        return this._generateSwallowingExercises(activity);
      default:
        return exercises;
    }
  }

  // ==========================================
  // تمارين النطق
  // ==========================================
  _generateArticulationExercises(activity) {
    const exercises = [];
    const targetSound = activity.subtype; // الحرف المستهدف

    // مستوى 1: نطق الصوت بمفرده
    exercises.push({
      id: `${activity.id}_ex_1`,
      level: 1,
      name: 'نطق الصوت بمفرده',
      type: 'sound_isolation',
      items: [{ target: targetSound, instruction: `انطق صوت "${targetSound}" بمفرده` }],
      repetitions: 10,
      criteria: 80,
    });

    // مستوى 2: نطق الصوت مع حركات قصيرة
    exercises.push({
      id: `${activity.id}_ex_2`,
      level: 2,
      name: 'نطق الصوت مع الحركات',
      type: 'syllable_level',
      items: [
        { target: `${targetSound}َ`, instruction: `انطق "${targetSound}َ"` },
        { target: `${targetSound}ُ`, instruction: `انطق "${targetSound}ُ"` },
        { target: `${targetSound}ِ`, instruction: `انطق "${targetSound}ِ"` },
      ],
      repetitions: 5,
      criteria: 80,
    });

    // مستوى 3: نطق مقاطع
    exercises.push({
      id: `${activity.id}_ex_3`,
      level: 3,
      name: 'نطق المقاطع',
      type: 'syllable_combination',
      items: this._generateSyllables(targetSound),
      repetitions: 5,
      criteria: 75,
    });

    // مستوى 4: نطق كلمات
    exercises.push({
      id: `${activity.id}_ex_4`,
      level: 4,
      name: 'نطق الكلمات',
      type: 'word_level',
      items: this._generateWordsWithSound(targetSound, activity.level),
      repetitions: 3,
      criteria: 70,
    });

    // مستوى 5: نطق جمل
    exercises.push({
      id: `${activity.id}_ex_5`,
      level: 5,
      name: 'نطق الجمل',
      type: 'sentence_level',
      items: this._generateSentencesWithSound(targetSound, activity.level),
      repetitions: 3,
      criteria: 65,
    });

    return exercises;
  }

  // ==========================================
  // توليد المقاطع
  // ==========================================
  _generateSyllables(sound) {
    const vowels = ['ا', 'و', 'ي'];
    const syllables = [];

    // مقاطع CV
    vowels.forEach(vowel => {
      syllables.push({
        target: `${sound}${vowel}`,
        instruction: `انطق "${sound}${vowel}"`,
        position: 'initial',
      });
    });

    // مقاطع VC
    vowels.forEach(vowel => {
      syllables.push({
        target: `${vowel}${sound}`,
        instruction: `انطق "${vowel}${sound}"`,
        position: 'final',
      });
    });

    // مقاطع CVC
    const consonants = ['ب', 'م', 'ت', 'ن', 'ل'];
    consonants.forEach(c => {
      syllables.push({
        target: `${sound}ا${c}`,
        instruction: `انطق "${sound}ا${c}"`,
        position: 'initial',
      });
      syllables.push({
        target: `${c}ا${sound}`,
        instruction: `انطق "${c}ا${sound}"`,
        position: 'final',
      });
    });

    return syllables;
  }

  // ==========================================
  // كلمات لكل حرف
  // ==========================================
  _getWordDatabase() {
    return {
      // كلمات الحروف
      ب: {
        initial: ['باب', 'بيت', 'بحر', 'برتقال', 'بطيخ', 'بطة', 'بقرة', 'بلبل'],
        medial: ['صبي', 'كتاب', 'دبابة', 'عنب', 'حبل', 'ثعلب', 'قلب', 'ذئب'],
        final: ['كلب', 'ذنب', 'سلب', 'حب', 'طب', 'كعب', 'صعب', 'لعب'],
      },
      م: {
        initial: ['ماء', 'موز', 'مدرسة', 'مسجد', 'محمد', 'ماما', 'مفتاح', 'مطر'],
        medial: ['جمل', 'قلم', 'نملة', 'حمراء', 'يمامة', 'حليم', 'كريم', 'رحيم'],
        final: ['علم', 'اسم', 'حلم', 'كلم', 'رضم', 'حزم', 'لزم', 'رزم'],
      },
      ت: {
        initial: ['تفاح', 'تمر', 'تين', 'تفاحة', 'تلميذ', 'تاجر', 'تابع', 'تاج'],
        medial: ['فتاة', 'بتول', 'ستارة', 'كتان', 'بطاطا', 'عنان', 'أمان', 'جمان'],
        final: ['بيت', 'موت', 'ميت', 'نوت', 'فوت', 'لوت', 'صوت', 'سوت'],
      },
      ث: {
        initial: ['ثعلب', 'ثوم', 'ثعلب', 'ثلاجة', 'ثوب', 'ثمرة', 'ثقيل', 'ثمن'],
        medial: ['مثل', 'فثة', 'تثبيت', 'مثال', 'عثمان', 'تثبيت'],
        final: ['ثلث', 'نث', 'حث', 'لث', 'رث'],
      },
      ن: {
        initial: ['نمر', 'نجمة', 'نحلة', 'نملة', 'نخلة', 'نقود', 'نار', 'نور'],
        medial: ['عنب', 'جند', 'عند', 'فندق', 'مندوب', 'سند'],
        final: ['عين', 'سين', 'كين', 'نين', 'زين', 'دين', 'لين', 'حين'],
      },
      ر: {
        initial: ['رمان', 'رمانة', 'رقم', 'ريحان', 'رئيس', 'رسم', 'رطب', 'روضة'],
        medial: ['فراش', 'جرس', 'مركب', 'زرة', 'حورية', 'بوران', 'سرور', 'جبور'],
        final: ['بحر', 'شجر', 'قمر', 'نهر', 'جمر', 'عمر', 'صبر', 'أجر'],
      },
      ل: {
        initial: ['ليمون', 'لوز', 'لوحة', 'لعبة', 'لسان', 'لون', 'ليل', 'لحم'],
        medial: ['جمل', 'فيل', 'حليب', 'طلع', 'ولد', 'بلد', 'قلب', 'كلم'],
        final: ['مل', 'شل', 'حل', 'دل', 'صل', 'قل', 'طل', 'زل'],
      },
      س: {
        initial: ['سمك', 'سيارة', 'سماء', 'سكر', 'شمس', 'سؤال', 'سورة', 'سيف'],
        medial: ['رسالة', 'مسجد', 'حسام', 'جاسر', 'ياسمين', 'قسطاس'],
        final: ['شمس', 'نمس', 'رأس', 'أمس', 'لمس', 'حس', 'نس', 'يس'],
      },
      ع: {
        initial: ['عنب', 'عين', 'علم', 'عصفور', 'عربي', 'عجل', 'عسل', 'عنبور'],
        medial: ['رعد', 'بعل', 'سعد', 'معين', 'سعيد', 'عبيد'],
        final: ['سمع', 'قرع', 'بدع', 'رفع', 'لصع', 'ودع', 'خضع', 'طبع'],
      },
      ك: {
        initial: ['كتاب', 'كرة', 'كعك', 'كرسي', 'كبريت', 'كبد', 'كلم', 'كوكب'],
        medial: ['سكر', 'بكر', 'عكر', 'ذكر', 'صقر', 'فكر'],
        final: ['ملك', 'فلك', 'سلك', 'شك', 'دك', 'هك', 'لك', 'بك'],
      },
      ق: {
        initial: ['قلم', 'قمر', 'قدح', 'قراءة', 'قبلة', 'قلب', 'قطة', 'قنفذ'],
        medial: ['عقيق', 'باقي', 'سائق', 'ناقور', 'راقي', 'شقيق'],
        final: ['خلق', 'طرق', 'برق', 'حق', 'رق', 'زق', 'سق', 'عق'],
      },
    };
  }

  // ==========================================
  // توليد كلمات بحرف معين
  // ==========================================
  _generateWordsWithSound(sound, level) {
    const wordDb = this._getWordDatabase();
    const words = [];

    if (wordDb[sound]) {
      // كلمات بالحرف في البداية
      words.push(
        ...wordDb[sound].initial.map(w => ({
          target: w,
          position: 'initial',
          level: 'easy',
        }))
      );

      // كلمات بالحرف في الوسط
      words.push(
        ...wordDb[sound].medial.map(w => ({
          target: w,
          position: 'medial',
          level: 'medium',
        }))
      );

      // كلمات بالحرف في النهاية
      words.push(
        ...wordDb[sound].final.map(w => ({
          target: w,
          position: 'final',
          level: 'medium',
        }))
      );
    }

    // تصفية حسب المستوى
    if (level === 'beginner') {
      return words.filter(w => w.level === 'easy').slice(0, 10);
    } else if (level === 'intermediate') {
      return words.filter(w => w.level !== 'hard').slice(0, 15);
    }
    return words.slice(0, 20);
  }

  // ==========================================
  // توليد جمل بحرف معين
  // ==========================================
  _generateSentencesWithSound(sound, level) {
    const sentences = {
      ب: [
        { sentence: 'بابا يلعب بالكرة', words: 4 },
        { sentence: 'البحر أزرق كبير', words: 3 },
        { sentence: 'أحب البرتقال كثيراً', words: 3 },
      ],
      م: [
        { sentence: 'ماما تحب الموز', words: 3 },
        { sentence: 'المدرسة جميلة جداً', words: 3 },
        { sentence: 'معي قلم أخضر', words: 3 },
      ],
      ت: [
        { sentence: 'التلميذ يكتب الدرس', words: 4 },
        { sentence: 'التوت حلو ولذيذ', words: 3 },
        { sentence: 'ذهبت إلى البيت', words: 4 },
      ],
    };

    return sentences[sound] || [{ sentence: `هذه جملة تحتوي على حرف ${sound}`, words: 6 }];
  }

  // ==========================================
  // تمارين اللغة
  // ==========================================
  _generateLanguageExercises(activity) {
    const exercises = [];

    switch (activity.subtype) {
      case 'receptive':
        exercises.push({
          id: `${activity.id}_lang_1`,
          name: 'فهم التعليمات',
          type: 'following_instructions',
          items: [
            { instruction: 'أشر إلى الصورة', complexity: 'simple' },
            { instruction: 'ضع الكرة على الطاولة', complexity: 'medium' },
            { instruction: 'أعطني الكتاب الأحمر', complexity: 'complex' },
          ],
        });
        break;

      case 'expressive':
        exercises.push({
          id: `${activity.id}_lang_2`,
          name: 'تكوين الجمل',
          type: 'sentence_formation',
          items: [
            { task: 'صف الصورة', words: ['ولد', 'يلعب', 'كرة'] },
            { task: 'أكمل الجملة', prompt: 'الولد ... في الحديقة' },
            { task: 'كون جملة', words: ['أنا', 'أحب', 'الفواكه'] },
          ],
        });
        break;

      case 'vocabulary':
        exercises.push({
          id: `${activity.id}_lang_3`,
          name: 'تطوير المفردات',
          type: 'vocabulary_building',
          items: [
            { category: 'فواكه', words: ['تفاح', 'موز', 'برتقال'] },
            { category: 'حيوانات', words: ['قطة', 'كلب', 'حصان'] },
            { category: 'ألوان', words: ['أحمر', 'أزرق', 'أخضر'] },
          ],
        });
        break;
    }

    return exercises;
  }

  // ==========================================
  // تمارين الصوت
  // ==========================================
  _generateVoiceExercises(activity) {
    return [
      {
        id: `${activity.id}_voice_1`,
        name: 'تمارين التنفس',
        type: 'breathing',
        items: [
          { instruction: 'شهيق عميق من الأنف', duration: '4 ثوان' },
          { instruction: 'حبس النفس', duration: '4 ثوان' },
          { instruction: 'زفير بطيء من الفم', duration: '6 ثوان' },
        ],
        repetitions: 10,
      },
      {
        id: `${activity.id}_voice_2`,
        name: 'تمارين الأحبال الصوتية',
        type: 'vocal_cords',
        items: [
          { instruction: 'نطق "أ" لفترة طويلة', duration: '10 ثوان' },
          { instruction: 'نطق "م" مع الاهتزاز', duration: '10 ثوان' },
        ],
        repetitions: 5,
      },
      {
        id: `${activity.id}_voice_3`,
        name: 'تمارين الرنين',
        type: 'resonance',
        items: [
          { instruction: 'نطق "ممم" مع الشعور بالاهتزاز', target: 'الرنين الأنفي' },
          { instruction: 'نطق "نانا" بوضوح', target: 'الرنين الفموي' },
        ],
        repetitions: 10,
      },
    ];
  }

  // ==========================================
  // تمارين الطلاقة
  // ==========================================
  _generateFluencyExercises(activity) {
    return [
      {
        id: `${activity.id}_fluency_1`,
        name: 'تقنيات التنفس',
        type: 'breathing_technique',
        items: [
          { technique: 'التنفس المتباعد', instruction: 'شهيق... توقف... زفير' },
          { technique: 'الكلام مع الزفير', instruction: 'ابدأ الكلام مع بداية الزفير' },
        ],
      },
      {
        id: `${activity.id}_fluency_2`,
        name: 'الكلمات البطيئة',
        type: 'easy_onset',
        items: [
          { instruction: 'نطق الكلمة الأولى بلطف' },
          { instruction: 'البطء في بداية الجملة' },
        ],
      },
      {
        id: `${activity.id}_fluency_3`,
        name: 'الإيقاع',
        type: 'rhythm',
        items: [
          { technique: 'النقر', instruction: 'انقر مع كل مقطع' },
          { technique: 'التلحين', instruction: 'غني الكلمات بلحن بسيط' },
        ],
      },
    ];
  }

  // ==========================================
  // تمارين البلع
  // ==========================================
  _generateSwallowingExercises(activity) {
    return [
      {
        id: `${activity.id}_swallow_1`,
        name: 'تمارين اللسان',
        type: 'tongue_exercises',
        items: [
          { name: 'رفع اللسان', instruction: 'ارفع طرف اللسان للفوق', repetitions: 10 },
          { name: 'تحريك اللسان', instruction: 'حرك اللسان يميناً ويساراً', repetitions: 10 },
        ],
      },
      {
        id: `${activity.id}_swallow_2`,
        name: 'تمارين الفك',
        type: 'jaw_exercises',
        items: [
          { name: 'فتح الفك', instruction: 'افتح فمك ببطء', repetitions: 10 },
          { name: 'إغلاق الفك', instruction: 'أغلق فمك بلطف', repetitions: 10 },
        ],
      },
      {
        id: `${activity.id}_swallow_3`,
        name: 'تمارين الشفاه',
        type: 'lip_exercises',
        items: [
          {
            name: 'ضم الشفاه',
            instruction: 'ضم الشفتين بقوة',
            holdTime: '5 ثوان',
            repetitions: 10,
          },
          { name: 'الابتسام', instruction: 'ابتسم مع إظهار الأسنان', repetitions: 10 },
        ],
      },
    ];
  }

  // ==========================================
  // تسجيل أداء تمرين
  // ==========================================
  async recordExercisePerformance(beneficiaryId, exerciseId, performanceData) {
    const performance = {
      id: Date.now().toString(),
      beneficiaryId,
      exerciseId,
      date: new Date(),

      // الأداء
      attempts: performanceData.attempts || 1,
      correct: performanceData.correct || 0,
      incorrect: performanceData.incorrect || 0,
      accuracy: performanceData.accuracy || 0,

      // الملاحظات
      notes: performanceData.notes || '',
      errors: performanceData.errors || [],

      // مستوى المساعدة
      assistanceLevel: performanceData.assistanceLevel || 'independent',
      // independent, verbal_cue, visual_cue, physical_prompt, full_assistance

      // وقت الأداء
      duration: performanceData.duration || 0,

      status: 'completed',
    };

    this.exercises.set(performance.id, performance);
    this._updateActivityProgress(beneficiaryId, exerciseId, performance);

    return performance;
  }

  // ==========================================
  // تحديث تقدم النشاط
  // ==========================================
  _updateActivityProgress(beneficiaryId, exerciseId, performance) {
    const progress = this.progress.get(beneficiaryId) || {
      exercises: [],
      totalAttempts: 0,
      totalCorrect: 0,
      averageAccuracy: 0,
      lastActivityDate: null,
    };

    progress.exercises.push({
      exerciseId,
      date: performance.date,
      accuracy: performance.accuracy,
    });

    progress.totalAttempts += performance.attempts;
    progress.totalCorrect += performance.correct;
    progress.averageAccuracy = Math.round((progress.totalCorrect / progress.totalAttempts) * 100);
    progress.lastActivityDate = performance.date;

    this.progress.set(beneficiaryId, progress);
  }

  // ==========================================
  // الحصول على الأنشطة الموصى بها
  // ==========================================
  async getRecommendedActivities(beneficiaryId, assessmentData) {
    const recommendations = [];

    // بناءً على نتائج التقييم
    if (assessmentData.articulation) {
      for (const [sound, status] of Object.entries(assessmentData.articulation)) {
        if (status === 'distorted' || status === 'substituted') {
          recommendations.push({
            type: 'articulation',
            subtype: sound,
            priority: 'high',
            reason: `صوت "${sound}" يحتاج تدريب`,
          });
        }
      }
    }

    if (assessmentData.fluency?.frequency > 5) {
      recommendations.push({
        type: 'fluency',
        subtype: 'stuttering',
        priority: 'high',
        reason: 'تردد التلعثم يتطلب تدخل',
      });
    }

    if (assessmentData.voice?.quality !== 'normal') {
      recommendations.push({
        type: 'voice',
        subtype: assessmentData.voice.quality,
        priority: 'medium',
        reason: 'جودة الصوت تحتاج تحسين',
      });
    }

    return recommendations;
  }

  // ==========================================
  // تقرير التقدم
  // ==========================================
  async getProgressReport(beneficiaryId) {
    const progress = this.progress.get(beneficiaryId);

    if (!progress) {
      return {
        beneficiaryId,
        message: 'لا توجد بيانات تقدم متاحة',
      };
    }

    return {
      beneficiaryId,
      summary: {
        totalExercises: progress.exercises.length,
        totalAttempts: progress.totalAttempts,
        averageAccuracy: progress.averageAccuracy,
        lastActivity: progress.lastActivityDate,
      },
      recentProgress: progress.exercises.slice(-10),
      trend: this._calculateTrend(progress.exercises),
      recommendations: this._generateProgressRecommendations(progress),
    };
  }

  _calculateTrend(exercises) {
    if (exercises.length < 3) return 'insufficient_data';

    const recent = exercises.slice(-5);
    const earlier = exercises.slice(-10, -5);

    const recentAvg = recent.reduce((sum, e) => sum + e.accuracy, 0) / recent.length;
    const earlierAvg =
      earlier.length > 0 ? earlier.reduce((sum, e) => sum + e.accuracy, 0) / earlier.length : 0;

    if (recentAvg > earlierAvg + 10) return 'improving';
    if (recentAvg < earlierAvg - 10) return 'declining';
    return 'stable';
  }

  _generateProgressRecommendations(progress) {
    const recommendations = [];

    if (progress.averageAccuracy >= 90) {
      recommendations.push('مستوى أداء ممتاز - يمكن الانتقال لمهارات أعلى');
    } else if (progress.averageAccuracy >= 70) {
      recommendations.push('تقدم جيد - استمر في التدريب');
    } else {
      recommendations.push('يحتاج مزيد من التدريب والممارسة');
      recommendations.push('يُنصح بتقليل مستوى الصعوبة');
    }

    return recommendations;
  }
}

module.exports = { SpeechTherapyActivitiesService };
