/**
 * careersContent.js — open positions shown on /careers.
 *
 * Each role mirrors the hiring priorities for a multi-branch rehab center:
 * clinical specialists (speech, OT, behavior), education, and support.
 * When an HR-side CMS is introduced, swap this export for an API fetch.
 */

export const DEPARTMENTS = [
  { id: 'all', label: 'الكل' },
  { id: 'clinical', label: 'إكلينيكي' },
  { id: 'education', label: 'تربية خاصة' },
  { id: 'administrative', label: 'إداري' },
  { id: 'support', label: 'دعم' },
];

export const LEVELS = {
  senior: 'خبرة +7 سنوات',
  mid: 'خبرة 3-7 سنوات',
  junior: 'خبرة 1-3 سنوات',
  entry: 'حديث التخرج',
};

export const EMPLOYMENT_TYPES = {
  fulltime: 'دوام كامل',
  parttime: 'دوام جزئي',
  contract: 'عقد محدد',
};

const jobs = [
  {
    id: 'aba-bcba',
    title: 'محلّل سلوك معتمد (BCBA)',
    department: 'clinical',
    level: 'senior',
    type: 'fulltime',
    branches: ['فرع غرناطة', 'فرع الأندلس'],
    icon: '🧠',
    gradient: 'from-blue-500 to-indigo-600',
    featured: true,
    summary:
      'قيادة برامج تحليل السلوك التطبيقي (ABA) لأطفال اضطراب طيف التوحد، الإشراف على أخصائيي التدخّل، ومراجعة خطط IEP.',
    requirements: [
      'شهادة BCBA سارية المفعول',
      'ترخيص SCFHS للممارسة في المملكة',
      'خبرة +7 سنوات مع أطفال التوحد',
      'إجادة اللغتين العربية والإنجليزية',
    ],
    responsibilities: [
      'تقييم حالات جديدة وبناء خطط IEP',
      'الإشراف على 3-5 أخصائيي تدخّل مباشر (RBT)',
      'تدريب الأهل على تطبيق المهارات في البيت',
      'متابعة مؤشرات التقدّم وتعديل الخطط ربع سنوياً',
    ],
  },
  {
    id: 'speech-therapist',
    title: 'أخصائية نطق ولغة',
    department: 'clinical',
    level: 'mid',
    type: 'fulltime',
    branches: ['فرع المغرزات'],
    icon: '🗣️',
    gradient: 'from-teal-500 to-cyan-600',
    featured: true,
    summary: 'تقييم وتأهيل اضطرابات النطق واللغة، وتطبيق برامج PECS و AAC للحالات غير الناطقة.',
    requirements: [
      'بكالوريوس في علوم النطق واللغة',
      'ترخيص SCFHS',
      'خبرة 3-7 سنوات (أطفال التوحد ميزة إضافية)',
      'شهادة PECS من مستوى 1 على الأقل (ميزة)',
    ],
    responsibilities: [
      'جلسات فردية يومية (5-6 جلسات)',
      'إعداد تقارير أسبوعية لولي الأمر',
      'بناء خطط علاجية بأهداف SMART',
      'التنسيق مع فريق التأهيل متعدد التخصصات',
    ],
  },
  {
    id: 'occupational-therapist',
    title: 'أخصائي علاج وظيفي — أطفال',
    department: 'clinical',
    level: 'mid',
    type: 'fulltime',
    branches: ['فرع الأندلس', 'فرع الشفاء'],
    icon: '🖐️',
    gradient: 'from-rose-500 to-pink-600',
    summary:
      'تنمية المهارات الحركية الدقيقة وتطبيق برامج التكامل الحسّي للأطفال من ذوي الإعاقات النمائية.',
    requirements: [
      'بكالوريوس في العلاج الوظيفي',
      'ترخيص SCFHS',
      'خبرة 3+ سنوات مع أطفال',
      'تدريب في التكامل الحسّي (ميزة)',
    ],
    responsibilities: [
      'تقييم المهارات الحركية وأنشطة الحياة اليومية (ADL)',
      'تصميم غرف التكامل الحسّي حسب الحالة',
      'جلسات علاجية فردية وجماعية',
      'تدريب الأهل على استراتيجيات التنظيم الحسّي',
    ],
  },
  {
    id: 'special-educator',
    title: 'معلّم/ة تربية خاصة',
    department: 'education',
    level: 'mid',
    type: 'fulltime',
    branches: ['فرع غرناطة', 'فرع المغرزات'],
    icon: '📚',
    gradient: 'from-amber-500 to-orange-500',
    featured: true,
    summary:
      'تطبيق برامج تعليمية فردية (IEP) لأطفال من ذوي الإعاقة الذهنية والتوحد وصعوبات التعلّم.',
    requirements: [
      'بكالوريوس في التربية الخاصة',
      'خبرة 2+ سنوات (ميزة)',
      'إجادة استخدام الوسائل التعليمية الرقمية',
    ],
    responsibilities: [
      'تطبيق الخطط التعليمية الفردية',
      'إعداد الوسائل التعليمية الحسّية',
      'متابعة التقدّم الأكاديمي والسلوكي',
      'التنسيق مع المدارس الدامجة عند الانتقال',
    ],
  },
  {
    id: 'clinical-psychologist',
    title: 'أخصائي/ة علم نفس إكلينيكي',
    department: 'clinical',
    level: 'senior',
    type: 'fulltime',
    branches: ['المقر الرئيسي'],
    icon: '💙',
    gradient: 'from-purple-500 to-violet-600',
    summary: 'تقييم الحالات النفسية للأطفال، الإشراف على برامج تعديل السلوك، ودعم الأسر.',
    requirements: [
      'ماجستير/دكتوراه في علم النفس الإكلينيكي',
      'ترخيص SCFHS',
      'خبرة +5 سنوات مع أطفال من ذوي الاحتياجات الخاصة',
    ],
    responsibilities: [
      'تقييم نفسي شامل (WISC, Vineland-3, ADOS-2)',
      'جلسات علاج فردي وأسري',
      'الإشراف على برامج تعديل السلوك',
      'إعداد تقارير رسمية للجهات التعليمية',
    ],
  },
  {
    id: 'receptionist',
    title: 'موظف/ة استقبال',
    department: 'administrative',
    level: 'junior',
    type: 'fulltime',
    branches: ['فرع المغرزات', 'فرع غرناطة'],
    icon: '📞',
    gradient: 'from-emerald-500 to-teal-500',
    summary:
      'أول نقطة تواصل للأهل — استقبال المكالمات، جدولة الزيارات، ومتابعة طلبات الحجز الواردة.',
    requirements: [
      'شهادة ثانوية/دبلوم',
      'إتقان الكمبيوتر والأنظمة الإدارية',
      'مهارات تواصل ممتازة',
      'إجادة اللغة الإنجليزية (ميزة)',
    ],
    responsibilities: [
      'استقبال الأهل والرد على استفساراتهم',
      'جدولة زيارات التقييم والجلسات',
      'متابعة طلبات الحجز من الموقع',
      'تحديث بيانات المستفيدين في النظام',
    ],
  },
  {
    id: 'bus-driver',
    title: 'سائق حافلة نقل مدرسي',
    department: 'support',
    level: 'entry',
    type: 'fulltime',
    branches: ['المقر الرئيسي'],
    icon: '🚌',
    gradient: 'from-yellow-500 to-amber-500',
    summary:
      'توصيل المستفيدين من منازلهم إلى المركز والعكس، بمرافقة أخصائية تربوية على متن كل حافلة.',
    requirements: [
      'رخصة قيادة حافلات عمومي سارية',
      'نظافة السجل المروري (آخر 5 سنوات)',
      'خبرة سابقة في النقل المدرسي (ميزة)',
    ],
    responsibilities: [
      'اتباع خط السير المحدد بدقة',
      'الحفاظ على سلامة المستفيدين',
      'صيانة يومية روتينية للحافلة',
      'التواصل مع الإدارة عبر نظام GPS',
    ],
  },
  {
    id: 'physiotherapist',
    title: 'أخصائي علاج طبيعي — أطفال',
    department: 'clinical',
    level: 'mid',
    type: 'parttime',
    branches: ['فرع الشفاء'],
    icon: '🏃',
    gradient: 'from-cyan-500 to-blue-500',
    summary:
      'جلسات علاج طبيعي للأطفال من ذوي الشلل الدماغي ومتلازمة داون لتطوير المهارات الحركية الكبرى.',
    requirements: ['بكالوريوس في العلاج الطبيعي', 'ترخيص SCFHS', 'خبرة 3+ سنوات في علاج أطفال'],
    responsibilities: [
      'تقييم الحالة الحركية',
      'تصميم برامج تمارين فردية',
      'جلسات علاجية 3-4 أيام أسبوعياً',
      'تدريب الأهل على تمارين البيت',
    ],
  },
];

export default jobs;
