/**
 * 📚 بيانات تجريبية لنظام التعلم المؤسسي
 * Sample E-Learning Data Seeds
 *
 * يحتوي على:
 * - 5 دورات تدريبية
 * - 15 درس
 * - 5 اختبارات
 * - بيانات لمكتبة الوسائط
 */

const mongoose = require('mongoose');
const {
  Course,
  Lesson,
  Quiz,
  Enrollment,
  Certificate,
  MediaLibrary,
} = require('../models/ELearning');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system';

// ============================================
// Sample Courses - دورات تجريبية
// ============================================
const sampleCourses = [
  {
    title: 'تأهيل ذوي الإعاقة الحركية - المستوى الأول',
    description:
      'دورة شاملة لتأهيل الأشخاص ذوي الإعاقة الحركية وتطوير مهاراتهم المهنية والحياتية. تشمل الدورة تمارين عملية، نصائح طبية، وأساليب التكيف.',
    instructor: null, // سيتم تعيينه لاحقاً
    category: 'rehabilitation',
    level: 'beginner',
    duration: { hours: 20, minutes: 0 },
    accessibility: {
      hasSubtitles: true,
      hasSignLanguage: true,
      hasAudioDescription: true,
      hasScreenReaderSupport: true,
      hasHighContrast: true,
    },
    thumbnail: 'https://example.com/courses/rehabilitation-1.jpg',
    price: 0,
    isPremium: false,
    isPublished: true,
    tags: ['تأهيل', 'إعاقة حركية', 'مبتدئ'],
    settings: {
      allowComments: true,
      requireQuizPass: true,
      passingScore: 70,
      allowDownload: true,
      maxAttempts: 3,
    },
  },
  {
    title: 'تطوير المهارات الرقمية لذوي الإعاقة البصرية',
    description:
      'تعلم استخدام التقنيات المساعدة وبرامج قراءة الشاشة والتطبيقات الرقمية المصممة للمكفوفين وضعاف البصر.',
    category: 'accessibility',
    level: 'intermediate',
    duration: { hours: 15, minutes: 30 },
    accessibility: {
      hasSubtitles: true,
      hasSignLanguage: false,
      hasAudioDescription: true,
      hasScreenReaderSupport: true,
      hasHighContrast: true,
    },
    thumbnail: 'https://example.com/courses/digital-skills.jpg',
    price: 0,
    isPremium: false,
    isPublished: true,
    tags: ['إعاقة بصرية', 'تقنية', 'مهارات رقمية'],
    settings: {
      allowComments: true,
      requireQuizPass: true,
      passingScore: 75,
      allowDownload: true,
      maxAttempts: 3,
    },
  },
  {
    title: 'لغة الإشارة - المستوى الأساسي',
    description:
      'تعلم أساسيات لغة الإشارة للتواصل مع الأشخاص الصم وضعاف السمع. دورة تفاعلية مع فيديوهات تعليمية.',
    category: 'accessibility',
    level: 'beginner',
    duration: { hours: 12, minutes: 0 },
    accessibility: {
      hasSubtitles: true,
      hasSignLanguage: true,
      hasAudioDescription: false,
      hasScreenReaderSupport: true,
      hasHighContrast: false,
    },
    thumbnail: 'https://example.com/courses/sign-language.jpg',
    price: 0,
    isPremium: false,
    isPublished: true,
    tags: ['لغة الإشارة', 'صم', 'تواصل'],
    settings: {
      allowComments: true,
      requireQuizPass: true,
      passingScore: 70,
      allowDownload: false,
      maxAttempts: 5,
    },
  },
  {
    title: 'مهارات التوظيف والإعداد للمقابلات الشخصية',
    description:
      'دورة متخصصة لإعداد ذوي الإعاقة لسوق العمل، كتابة السيرة الذاتية، والاستعداد للمقابلات الشخصية.',
    category: 'management',
    level: 'intermediate',
    duration: { hours: 10, minutes: 0 },
    accessibility: {
      hasSubtitles: true,
      hasSignLanguage: true,
      hasAudioDescription: true,
      hasScreenReaderSupport: true,
      hasHighContrast: false,
    },
    thumbnail: 'https://example.com/courses/employment-skills.jpg',
    price: 0,
    isPremium: false,
    isPublished: true,
    tags: ['توظيف', 'مقابلات', 'مهارات'],
    settings: {
      allowComments: true,
      requireQuizPass: true,
      passingScore: 80,
      allowDownload: true,
      maxAttempts: 3,
    },
  },
  {
    title: 'الامتثال لمعايير إمكانية الوصول الدولية (WCAG)',
    description:
      'دورة تقنية متقدمة حول معايير W3C لإمكانية الوصول الرقمي وتطبيقها في المواقع والتطبيقات.',
    category: 'compliance',
    level: 'advanced',
    duration: { hours: 25, minutes: 0 },
    accessibility: {
      hasSubtitles: true,
      hasSignLanguage: false,
      hasAudioDescription: true,
      hasScreenReaderSupport: true,
      hasHighContrast: true,
    },
    thumbnail: 'https://example.com/courses/wcag-compliance.jpg',
    price: 0,
    isPremium: true,
    isPublished: true,
    tags: ['WCAG', 'معايير', 'إمكانية الوصول', 'تقنية'],
    settings: {
      allowComments: true,
      requireQuizPass: true,
      passingScore: 85,
      allowDownload: true,
      maxAttempts: 2,
    },
  },
];

// ============================================
// Sample Lessons - دروس تجريبية
// ============================================
const createSampleLessons = (courseId, courseIndex) => {
  const lessons = [
    // دروس الدورة 1: تأهيل ذوي الإعاقة الحركية
    [
      {
        course: courseId,
        title: 'مقدمة في التأهيل المهني',
        description: 'نظرة عامة على أهمية التأهيل المهني وأهدافه',
        order: 1,
        type: 'video',
        content: {
          videoUrl: 'https://example.com/videos/intro-rehabilitation.mp4',
        },
        accessibilityMaterials: {
          subtitlesUrl: 'https://example.com/subtitles/intro-rehabilitation-ar.vtt',
          signLanguageVideoUrl: 'https://example.com/sign-language/intro-rehabilitation.mp4',
          audioDescriptionUrl: 'https://example.com/audio-desc/intro-rehabilitation.mp3',
          transcriptUrl: 'https://example.com/transcripts/intro-rehabilitation.pdf',
        },
        duration: { minutes: 15 },
        isPreview: true,
        isMandatory: true,
      },
      {
        course: courseId,
        title: 'تمارين الحركة الأساسية',
        description: 'تمارين يومية لتحسين الحركة والقوة',
        order: 2,
        type: 'video',
        content: {
          videoUrl: 'https://example.com/videos/basic-exercises.mp4',
        },
        accessibilityMaterials: {
          subtitlesUrl: 'https://example.com/subtitles/basic-exercises-ar.vtt',
          signLanguageVideoUrl: 'https://example.com/sign-language/basic-exercises.mp4',
          transcriptUrl: 'https://example.com/transcripts/basic-exercises.pdf',
        },
        duration: { minutes: 25 },
        resources: [
          {
            title: 'دليل التمارين PDF',
            url: 'https://example.com/resources/exercises.pdf',
            type: 'pdf',
          },
        ],
        isPreview: false,
        isMandatory: true,
      },
      {
        course: courseId,
        title: 'استخدام الأدوات المساعدة',
        description: 'التعرف على الأدوات المساعدة وكيفية استخدامها',
        order: 3,
        type: 'video',
        content: {
          videoUrl: 'https://example.com/videos/assistive-devices.mp4',
        },
        accessibilityMaterials: {
          subtitlesUrl: 'https://example.com/subtitles/assistive-devices-ar.vtt',
          audioDescriptionUrl: 'https://example.com/audio-desc/assistive-devices.mp3',
          transcriptUrl: 'https://example.com/transcripts/assistive-devices.pdf',
        },
        duration: { minutes: 20 },
        isPreview: false,
        isMandatory: true,
      },
    ],
    // دروس الدورة 2: المهارات الرقمية
    [
      {
        course: courseId,
        title: 'مقدمة في برامج قراءة الشاشة',
        description: 'التعرف على JAWS و NVDA وكيفية استخدامها',
        order: 1,
        type: 'video',
        content: {
          videoUrl: 'https://example.com/videos/screen-readers-intro.mp4',
        },
        accessibilityMaterials: {
          subtitlesUrl: 'https://example.com/subtitles/screen-readers-ar.vtt',
          audioDescriptionUrl: 'https://example.com/audio-desc/screen-readers.mp3',
          transcriptUrl: 'https://example.com/transcripts/screen-readers.pdf',
        },
        duration: { minutes: 30 },
        isPreview: true,
        isMandatory: true,
      },
      {
        course: courseId,
        title: 'التنقل باستخدام لوحة المفاتيح',
        description: 'اختصارات لوحة المفاتيح والتنقل الفعال',
        order: 2,
        type: 'interactive',
        content: {
          interactiveContent: {
            type: 'keyboard-tutorial',
            url: 'https://example.com/interactive/keyboard.html',
          },
        },
        accessibilityMaterials: {
          subtitlesUrl: 'https://example.com/subtitles/keyboard-nav-ar.vtt',
          transcriptUrl: 'https://example.com/transcripts/keyboard-nav.pdf',
        },
        duration: { minutes: 20 },
        isPreview: false,
        isMandatory: true,
      },
      {
        course: courseId,
        title: 'تطبيقات الهاتف المحمول الميسرة',
        description: 'أفضل التطبيقات لذوي الإعاقة البصرية',
        order: 3,
        type: 'text',
        content: {
          textContent:
            '# تطبيقات الهاتف الميسرة\n\n## 1. Be My Eyes\nتطبيق يربطك بمتطوعين لمساعدتك بصرياً...',
        },
        duration: { minutes: 15 },
        resources: [
          {
            title: 'قائمة التطبيقات',
            url: 'https://example.com/resources/apps-list.pdf',
            type: 'pdf',
          },
        ],
        isPreview: false,
        isMandatory: false,
      },
    ],
    // دروس الدورة 3: لغة الإشارة
    [
      {
        course: courseId,
        title: 'الأبجدية في لغة الإشارة',
        description: 'تعلم الأحرف الأبجدية بلغة الإشارة',
        order: 1,
        type: 'video',
        content: {
          videoUrl: 'https://example.com/videos/sign-alphabet.mp4',
        },
        accessibilityMaterials: {
          subtitlesUrl: 'https://example.com/subtitles/sign-alphabet-ar.vtt',
          transcriptUrl: 'https://example.com/transcripts/sign-alphabet.pdf',
        },
        duration: { minutes: 20 },
        isPreview: true,
        isMandatory: true,
      },
      {
        course: courseId,
        title: 'الكلمات الشائعة',
        description: 'إشارات الكلمات اليومية الأكثر استخداماً',
        order: 2,
        type: 'video',
        content: {
          videoUrl: 'https://example.com/videos/common-words.mp4',
        },
        accessibilityMaterials: {
          subtitlesUrl: 'https://example.com/subtitles/common-words-ar.vtt',
          transcriptUrl: 'https://example.com/transcripts/common-words.pdf',
        },
        duration: { minutes: 30 },
        isPreview: false,
        isMandatory: true,
      },
      {
        course: courseId,
        title: 'محادثات بسيطة',
        description: 'كيفية إجراء محادثات قصيرة بلغة الإشارة',
        order: 3,
        type: 'video',
        content: {
          videoUrl: 'https://example.com/videos/simple-conversations.mp4',
        },
        accessibilityMaterials: {
          subtitlesUrl: 'https://example.com/subtitles/conversations-ar.vtt',
          transcriptUrl: 'https://example.com/transcripts/conversations.pdf',
        },
        duration: { minutes: 25 },
        isPreview: false,
        isMandatory: true,
      },
    ],
  ];

  return lessons[courseIndex] || [];
};

// ============================================
// Sample Quizzes - اختبارات تجريبية
// ============================================
const createSampleQuiz = (courseId, lessonId) => {
  return {
    course: courseId,
    lesson: lessonId,
    title: 'اختبار الوحدة',
    description: 'اختبار لقياس فهمك للمحتوى',
    type: 'assessment',
    duration: { minutes: 20 },
    passingScore: 70,
    maxAttempts: 3,
    questions: [
      {
        question: 'ما هي أهمية التأهيل المهني لذوي الإعاقة؟',
        type: 'multiple-choice',
        options: [
          { text: 'زيادة فرص العمل والاستقلالية', isCorrect: true },
          { text: 'توفير المال فقط', isCorrect: false },
          { text: 'الترفيه والتسلية', isCorrect: false },
          { text: 'لا فائدة منه', isCorrect: false },
        ],
        points: 10,
        explanation: 'التأهيل المهني يساعد على تعزيز الاستقلالية وزيادة فرص العمل المناسبة',
        audioUrl: 'https://example.com/audio/question1.mp3',
      },
      {
        question: 'التكنولوجيا المساعدة مهمة لجميع ذوي الإعاقة',
        type: 'true-false',
        correctAnswer: 'true',
        points: 5,
        explanation: 'التكنولوجيا المساعدة توفر حلولاً متنوعة لجميع أنواع الإعاقة',
      },
      {
        question: 'اذكر ثلاثة أنواع من الأدوات المساعدة للإعاقة الحركية',
        type: 'short-answer',
        correctAnswer: 'كرسي متحرك، عكاز، أجهزة تقويم العظام',
        points: 15,
        explanation: 'الأدوات المساعدة متنوعة وتشمل الكراسي المتحركة، العكازات، والأجهزة التقويمية',
      },
      {
        question: 'صل بين نوع الإعاقة والأداة المناسبة',
        type: 'matching',
        options: [
          { text: 'إعاقة بصرية - قارئ الشاشة', isCorrect: true },
          { text: 'إعاقة سمعية - المعينات السمعية', isCorrect: true },
          { text: 'إعاقة حركية - كرسي متحرك', isCorrect: true },
        ],
        points: 10,
        explanation: 'كل نوع إعاقة له أدوات مساعدة مخصصة',
      },
    ],
    settings: {
      shuffleQuestions: true,
      shuffleOptions: true,
      showCorrectAnswers: true,
      allowReview: true,
      showResults: true,
    },
  };
};

// ============================================
// Sample Media Library - مكتبة الوسائط
// ============================================
const sampleMedia = [
  {
    title: 'دليل إمكانية الوصول الشامل',
    description: 'دليل PDF شامل لمعايير إمكانية الوصول',
    type: 'document',
    fileUrl: 'https://example.com/media/accessibility-guide.pdf',
    fileSize: 2500000,
    thumbnail: 'https://example.com/thumbnails/guide.jpg',
    category: 'accessibility',
    accessibilityFeatures: {
      hasSubtitles: false,
      hasTranscript: true,
      hasAudioDescription: false,
      hasSignLanguage: false,
      isAccessible: true,
    },
    tags: ['دليل', 'إمكانية الوصول', 'معايير'],
    isPublic: true,
  },
  {
    title: 'تمارين الإطالة اليومية',
    description: 'فيديو تعليمي لتمارين الإطالة لذوي الإعاقة الحركية',
    type: 'video',
    fileUrl: 'https://example.com/media/stretching-exercises.mp4',
    fileSize: 45000000,
    duration: 900, // 15 دقيقة
    thumbnail: 'https://example.com/thumbnails/stretching.jpg',
    category: 'rehabilitation',
    accessibilityFeatures: {
      hasSubtitles: true,
      hasTranscript: true,
      hasAudioDescription: true,
      hasSignLanguage: true,
      isAccessible: true,
    },
    tags: ['تمارين', 'إطالة', 'فيديو'],
    isPublic: true,
  },
  {
    title: 'كتاب صوتي: قصص النجاح',
    description: 'قصص ملهمة لأشخاص ذوي إعاقة حققوا النجاح',
    type: 'audio',
    fileUrl: 'https://example.com/media/success-stories.mp3',
    fileSize: 15000000,
    duration: 1800, // 30 دقيقة
    thumbnail: 'https://example.com/thumbnails/audiobook.jpg',
    category: 'educational',
    accessibilityFeatures: {
      hasSubtitles: false,
      hasTranscript: true,
      hasAudioDescription: false,
      hasSignLanguage: false,
      isAccessible: true,
    },
    tags: ['كتاب صوتي', 'قصص', 'نجاح'],
    isPublic: true,
  },
  {
    title: 'عرض تقديمي: حقوق ذوي الإعاقة',
    description: 'عرض تقديمي شامل عن حقوق الأشخاص ذوي الإعاقة',
    type: 'presentation',
    fileUrl: 'https://example.com/media/disability-rights.pptx',
    fileSize: 8000000,
    thumbnail: 'https://example.com/thumbnails/presentation.jpg',
    category: 'educational',
    accessibilityFeatures: {
      hasSubtitles: false,
      hasTranscript: true,
      hasAudioDescription: false,
      hasSignLanguage: false,
      isAccessible: true,
    },
    tags: ['حقوق', 'عرض تقديمي', 'قانون'],
    isPublic: true,
  },
  {
    title: 'صور توضيحية: وضعيات الجلوس الصحيحة',
    description: 'مجموعة صور توضيحية للوضعيات الصحيحة',
    type: 'image',
    fileUrl: 'https://example.com/media/sitting-positions.jpg',
    fileSize: 500000,
    thumbnail: 'https://example.com/thumbnails/sitting.jpg',
    category: 'rehabilitation',
    accessibilityFeatures: {
      hasSubtitles: false,
      hasTranscript: false,
      hasAudioDescription: true,
      hasSignLanguage: false,
      isAccessible: true,
    },
    tags: ['صور', 'وضعيات', 'صحة'],
    isPublic: true,
  },
];

// ============================================
// Seeding Function - دالة الإدخال
// ============================================
async function seedELearningData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // حذف البيانات القديمة
    console.log('\n🗑️  Clearing old data...');
    await Course.deleteMany({});
    await Lesson.deleteMany({});
    await Quiz.deleteMany({});
    await Enrollment.deleteMany({});
    await Certificate.deleteMany({});
    await MediaLibrary.deleteMany({});
    console.log('✅ Old data cleared');

    // إنشاء المستخدم التجريبي (مدرب)
    console.log('\n👨‍🏫 Creating instructor...');
    const User = mongoose.model('User');
    let instructor = await User.findOne({ email: 'instructor@alawael.com' });

    if (!instructor) {
      instructor = await User.create({
        name: 'د. أحمد المدرب',
        email: 'instructor@alawael.com',
        password: 'Instructor@123',
        role: 'instructor',
      });
    }
    console.log(`✅ Instructor created: ${instructor.name}`);

    // إنشاء الدورات
    console.log('\n📚 Creating courses...');
    const createdCourses = [];

    for (const courseData of sampleCourses) {
      courseData.instructor = instructor._id;
      const course = await Course.create(courseData);
      createdCourses.push(course);
      console.log(`  ✅ Course created: ${course.title}`);

      // إنشاء الدروس لكل دورة
      const courseIndex = createdCourses.length - 1;
      const lessons = createSampleLessons(course._id, courseIndex);

      if (lessons.length > 0) {
        console.log(`  📖 Creating ${lessons.length} lessons for: ${course.title}`);
        const createdLessons = [];

        for (const lessonData of lessons) {
          const lesson = await Lesson.create(lessonData);
          createdLessons.push(lesson);

          // إنشاء اختبار للدرس الأخير
          if (lesson.order === lessons.length) {
            const quiz = await Quiz.create(createSampleQuiz(course._id, lesson._id));
            lesson.quiz = quiz._id;
            await lesson.save();
            console.log(`    ✅ Quiz created for lesson: ${lesson.title}`);
          }
        }

        // تحديث الدورة بالدروس
        course.lessons = createdLessons.map(l => l._id);
        await course.save();
        console.log(`  ✅ ${lessons.length} lessons added to course`);
      }
    }

    // إنشاء مكتبة الوسائط
    console.log('\n🎬 Creating media library...');
    for (const mediaData of sampleMedia) {
      mediaData.uploadedBy = instructor._id;
      const media = await MediaLibrary.create(mediaData);
      console.log(`  ✅ Media created: ${media.title}`);
    }

    // إحصائيات النهائية
    console.log('\n📊 Final Statistics:');
    console.log(`  ✅ Courses: ${await Course.countDocuments()}`);
    console.log(`  ✅ Lessons: ${await Lesson.countDocuments()}`);
    console.log(`  ✅ Quizzes: ${await Quiz.countDocuments()}`);
    console.log(`  ✅ Media: ${await MediaLibrary.countDocuments()}`);

    console.log('\n🎉 E-Learning data seeded successfully!');
    console.log('\n🔗 Test URLs:');
    console.log('   GET  http://localhost:3001/api/elearning/courses');
    console.log('   GET  http://localhost:3001/api/elearning/media');
    console.log('   POST http://localhost:3001/api/elearning/enroll/COURSE_ID');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// تشغيل السكريبت
if (require.main === module) {
  seedELearningData();
}

module.exports = { seedELearningData };
