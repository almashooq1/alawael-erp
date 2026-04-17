/**
 * landingContent.js — Single source of truth for the public landing page.
 *
 * Edit this file to change hero text, branch details, statistics, services,
 * programs, team, FAQs, and footer content. No component code changes are
 * required; LandingPage.jsx reads everything from here at render time.
 *
 * Source of truth for content (April 2026): awael.sa + provided logo PDF.
 * When a backend CMS is introduced, this file will be replaced by an API
 * fetch — but the shape below is the contract the page expects.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * All public text is Arabic-first (RTL). English fallback where relevant.
 * ─────────────────────────────────────────────────────────────────────────
 */

const landingContent = {
  /* ── Brand ── */
  brand: {
    nameAr: 'مراكز الأوائل',
    nameArFull: 'مراكز الأوائل للرعاية والتأهيل',
    nameEn: 'Alawael',
    nameEnFull: 'Alawael Centers For Rehabilitation',
    tagline: 'عناية خاصة بقدرات خاصة',
    taglineEn: 'Special Care for Special Abilities',
    logoSrc: '/alawael-logo.svg', // public/alawael-logo.svg
    foundedHijri: 1419,
    foundedGregorian: 1998,
  },

  /* ── Navigation links ── */
  nav: [
    { id: 'hero', label: 'الرئيسية' },
    { id: 'about', label: 'من نحن' },
    { id: 'services', label: 'خدماتنا' },
    { id: 'programs', label: 'برامجنا' },
    { id: 'branches', label: 'فروعنا' },
    { id: 'why-us', label: 'لماذا الأوائل' },
    { id: 'stats', label: 'إنجازاتنا' },
    { id: 'testimonials', label: 'آراء أولياء الأمور' },
    { id: 'faq', label: 'الأسئلة الشائعة' },
    { id: 'contact', label: 'تواصل معنا' },
  ],

  /* ── Hero ── */
  hero: {
    badge: 'معتمد من وزارة الموارد البشرية والتنمية الاجتماعية',
    titleBefore: 'نرعى أبناءنا من ذوي',
    titleRotating: ['الإعاقة الذهنية', 'اضطراب التوحد', 'صعوبات التعلم', 'الاحتياجات الخاصة'],
    titleAfter: 'بإخلاص وخبرة منذ 1419هـ',
    subtitle:
      'مركز رائد في تأهيل الأطفال والشباب من ذوي الإعاقة الذهنية واضطراب التوحد في الرياض — بيئة آمنة، فريق مختص، وبرامج علمية معتمدة على مدار 25 سنة.',
    primaryCta: { label: 'سجّل مستفيداً', to: '/register' },
    secondaryCta: { label: 'تعرّف على برامجنا', anchor: '#programs' },
    keyPoints: [
      'فترتان يومياً — صباحية ومسائية',
      'خدمة نقل لجميع أحياء الرياض',
      'برامج تدخّل مبكر متخصصة',
    ],
  },

  /* ── About ── */
  about: {
    title: 'من نحن',
    eyebrow: 'مركز الأوائل للرعاية والتأهيل',
    lead: 'تأسّس مركز الأوائل عام 1419هـ ليكون من أوائل المراكز المتخصصة في تأهيل حالات الإعاقة الذهنية في مدينة الرياض، ونعمل بإخلاص منذ ذلك الحين على تقديم رعاية متكاملة تجمع بين المنهجية العلمية والبُعد الإنساني.',
    paragraphs: [
      'نُقدّم خدماتنا من خلال أربعة فروع موزّعة في الرياض — للذكور والإناث — بطاقم يزيد على 400 متخصصة ومتخصص من مختلف التخصصات الطبية والتأهيلية والتربوية.',
      'على مدار 25 عاماً من العمل خدمنا أكثر من 8,000 مستفيد، ونلتزم بأعلى المعايير الدولية في الرعاية وبرامج التأهيل الفردية.',
    ],
    vision: {
      title: 'رؤيتنا',
      text: 'أن نكون الخيار الأوّل والأفضل في تقديم خدمات الرعاية والتأهيل لذوي الاحتياجات الخاصة على مستوى المملكة العربية السعودية.',
    },
    mission: {
      title: 'رسالتنا',
      text: 'تقديم خدمات تأهيلية بمعايير عالمية ترتكز على خطط فردية مدروسة، وتُسهم في تحسين جودة حياة المستفيدين ودمجهم في المجتمع.',
    },
    values: [
      { icon: '🤝', title: 'الرحمة', desc: 'رعاية بقلب إنساني قبل أي شيء' },
      { icon: '🎯', title: 'التخصّص', desc: 'فريق مؤهل علمياً في كل مجال' },
      { icon: '🌟', title: 'التميّز', desc: 'معايير عالمية في جميع خدماتنا' },
      { icon: '🛡️', title: 'الأمان', desc: 'بيئة آمنة ومراقبة على مدار الساعة' },
    ],
  },

  /* ── Services (system/center capabilities) ── */
  services: [
    {
      id: 'early-intervention',
      iconKey: 'rehab',
      title: 'التدخّل المبكر',
      desc: 'برامج متخصصة للأطفال من سن عامين لتنمية المهارات الأساسية قبل دخول البيئة التعليمية، بمنهجية علمية محكمة.',
      color: 'from-emerald-500 to-green-600',
      ring: 'ring-emerald-500/20',
    },
    {
      id: 'autism-rehab',
      iconKey: 'education',
      title: 'تأهيل اضطراب التوحد',
      desc: 'برامج ABA، TEACCH، PECS، والتكامل الحسي — بإشراف أخصائيين معتمدين لكل حالة بخطة فردية (IEP).',
      color: 'from-blue-500 to-indigo-600',
      ring: 'ring-blue-500/20',
    },
    {
      id: 'psychological',
      iconKey: 'hr',
      title: 'العلاج النفسي والسلوكي',
      desc: 'جلسات علاج سلوكي معرفي وتعديل سلوك فردي وجماعي مع متابعة دقيقة للتقدّم ومؤشرات النتائج.',
      color: 'from-purple-500 to-violet-600',
      ring: 'ring-purple-500/20',
    },
    {
      id: 'speech-lang',
      iconKey: 'reports',
      title: 'تأهيل النطق واللغة',
      desc: 'تقييم وتأهيل اضطرابات النطق، اللغة التعبيرية والاستقبالية، والتواصل البديل (AAC) عند الحاجة.',
      color: 'from-teal-500 to-cyan-600',
      ring: 'ring-teal-500/20',
    },
    {
      id: 'occupational',
      iconKey: 'admin',
      title: 'العلاج الوظيفي والحسّي',
      desc: 'تنمية المهارات الحركية الدقيقة، الاعتماد على النفس في أنشطة الحياة اليومية، والتكامل الحسّي.',
      color: 'from-rose-500 to-pink-600',
      ring: 'ring-rose-500/20',
    },
    {
      id: 'recreational',
      iconKey: 'finance',
      title: 'الأنشطة الترفيهية والاجتماعية',
      desc: 'برامج ترفيهية مدروسة ورحلات تعليمية ومناسبات دورية تُعزّز التفاعل الاجتماعي وثقة الطفل بنفسه.',
      color: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-500/20',
    },
  ],

  /* ── Platform / ERP features (digital system showcase) ── */
  platformFeatures: {
    title: 'نظامنا الرقمي المتكامل',
    subtitle:
      'منصّة تقنية متطوّرة تربط الفريق التأهيلي وأولياء الأمور والإدارة في تجربة سلسة واحدة',
    items: [
      {
        title: 'خطط تأهيل فردية (IEP) ذكية',
        desc: 'إعداد ومتابعة خطة تأهيل لكل مستفيد مع أهداف قابلة للقياس وتحديث تلقائي للتقدم.',
        icon: '📋',
        badge: 'للفريق التأهيلي',
      },
      {
        title: 'بوابة ولي الأمر',
        desc: 'تطبيق جوّال يتابع من خلاله تقدّم ابنه، الحضور، التقارير الأسبوعية، والتواصل مع الأخصائيين.',
        icon: '📱',
        badge: 'لأولياء الأمور',
      },
      {
        title: 'الجلسات الرقمية',
        desc: 'تسجيل نتائج كل جلسة مع ملاحظات، درجات ABC، ومستوى الإنجاز بأدوات سهلة للأخصائي.',
        icon: '🎯',
        badge: 'للفريق التأهيلي',
      },
      {
        title: 'العلاج عن بُعد',
        desc: 'جلسات فيديو آمنة للعائلات البعيدة مع تسجيل الجلسة وتوثيق المتابعة.',
        icon: '📹',
        badge: 'مبتكر',
      },
      {
        title: 'بنك الأهداف',
        desc: '+200 هدف تأهيلي معتمد دولياً في 13 مجالاً — يبني خطة IEP في دقائق بدلاً من أيام.',
        icon: '🎯',
        badge: 'ذكاء صناعي',
      },
      {
        title: 'تقارير فصلية تلقائية',
        desc: 'تقارير تقدّم أنيقة تُنتَج تلقائياً من بيانات الجلسات، جاهزة للطباعة والمشاركة.',
        icon: '📊',
        badge: 'أتمتة',
      },
      {
        title: 'نظام الإنذار المبكر',
        desc: 'تنبيهات ذكية عند الهضبة (plateau)، التراجع، أو انخفاض الحضور — تدخل فوري قبل فوات الفرصة.',
        icon: '⚡',
        badge: 'تنبيهات ذكية',
      },
      {
        title: 'إدارة الفروع المتعدّدة',
        desc: 'عرض موحّد لكل الفروع، إدارة صلاحيات، ومشاركة آمنة للبيانات بين المقر الرئيسي والفروع.',
        icon: '🏢',
        badge: 'للإدارة',
      },
    ],
  },

  /* ── Team (specialist profiles) ── */
  team: {
    title: 'فريقنا المتخصص',
    subtitle: 'نخبة من المختصين الحاصلين على شهادات دولية في مجالات التأهيل والتربية الخاصة',
    items: [
      {
        name: 'د. سارة الأحمدي',
        role: 'استشارية تأهيل نطق ولغة',
        specialty: 'Speech-Language Pathology',
        badge: 'ASHA Certified',
        color: 'from-pink-500 to-rose-500',
        icon: '👩‍⚕️',
      },
      {
        name: 'أ. محمد الغامدي',
        role: 'أخصائي تحليل سلوك تطبيقي',
        specialty: 'Applied Behavior Analysis',
        badge: 'BCBA',
        color: 'from-blue-500 to-indigo-500',
        icon: '👨‍⚕️',
      },
      {
        name: 'د. نورة القحطاني',
        role: 'استشارية علاج وظيفي',
        specialty: 'Occupational Therapy',
        badge: '+15 سنة خبرة',
        color: 'from-emerald-500 to-teal-500',
        icon: '👩‍⚕️',
      },
      {
        name: 'أ. عبدالله الحربي',
        role: 'أخصائي تربية خاصة',
        specialty: 'Special Education (Autism)',
        badge: "Master's Degree",
        color: 'from-amber-500 to-orange-500',
        icon: '👨‍🏫',
      },
      {
        name: 'د. ريم السهلي',
        role: 'استشارية علم نفس إكلينيكي',
        specialty: 'Clinical Psychology',
        badge: 'PhD · SCFHS',
        color: 'from-purple-500 to-violet-500',
        icon: '👩‍⚕️',
      },
      {
        name: 'أ. فهد الدوسري',
        role: 'أخصائي علاج طبيعي أطفال',
        specialty: 'Pediatric Physical Therapy',
        badge: 'APTA Member',
        color: 'from-cyan-500 to-blue-500',
        icon: '👨‍⚕️',
      },
    ],
  },

  /* ── Appointment booking ── */
  appointment: {
    title: 'احجز زيارة تقييم مجانية',
    subtitle: 'خطوة واحدة تبدأ رحلة التغيير لابنك أو ابنتك — ردّ خلال 24 ساعة',
    whatsappNumber: '966535242200', // E.164 without +
    whatsappTemplate: 'السلام عليكم — أرغب في حجز زيارة تقييم في مراكز الأوائل. تفاصيل: ',
    formFields: {
      parentName: 'اسم ولي الأمر',
      parentPhone: 'رقم الجوال',
      childName: 'اسم الطفل',
      childAge: 'عمر الطفل (سنوات)',
      conditionType: 'نوع الحالة',
      branchPreference: 'الفرع المفضّل',
      preferredTime: 'الفترة المفضّلة',
      notes: 'ملاحظات إضافية (اختياري)',
    },
    conditions: [
      'إعاقة ذهنية',
      'اضطراب طيف التوحد',
      'متلازمة داون',
      'صعوبات تعلّم',
      'تأخّر نمو',
      'فرط حركة وتشتت انتباه',
      'تأخّر نطق ولغة',
      'غير متأكد — أحتاج تقييماً',
    ],
    timeSlots: ['صباحي (7:30 ص - 12:30 م)', 'مسائي (3:00 م - 8:00 م)', 'أي وقت يناسب'],
  },

  /* ── Self-assessment quiz ── */
  quiz: {
    title: 'ما البرنامج الأنسب لطفلك؟',
    subtitle:
      'أجب عن 6 أسئلة سريعة وسنرشّح لك البرنامج التأهيلي الأكثر ملاءمة — مجاناً وخلال دقيقتين',
    ctaStart: 'ابدأ التقييم',
    ctaRetake: 'أعد التقييم',
    ctaBook: 'احجز زيارة تقييم',
    ctaContinue: 'التالي',
    ctaBack: 'رجوع',
    questions: [
      {
        id: 'age',
        label: 'كم عمر طفلك الآن؟',
        options: [
          { value: '0-2', label: 'أقل من سنتين', score: { 'early-intervention': 5 } },
          {
            value: '2-6',
            label: '2 - 6 سنوات',
            score: { 'early-intervention': 5, 'autism-rehab': 3, 'speech-lang': 3 },
          },
          {
            value: '6-12',
            label: '6 - 12 سنة',
            score: { 'autism-rehab': 4, 'speech-lang': 3, occupational: 3, psychological: 3 },
          },
          { value: '12+', label: 'أكبر من 12 سنة', score: { psychological: 4, occupational: 3 } },
        ],
      },
      {
        id: 'primaryConcern',
        label: 'ما أهم ما يقلقك في تطور طفلك؟',
        options: [
          { value: 'speech', label: 'تأخّر في النطق واللغة', score: { 'speech-lang': 6 } },
          {
            value: 'social',
            label: 'ضعف التواصل الاجتماعي',
            score: { 'autism-rehab': 5, psychological: 2 },
          },
          {
            value: 'behavior',
            label: 'سلوكيات صعبة أو متكرّرة',
            score: { 'autism-rehab': 3, psychological: 5 },
          },
          {
            value: 'motor',
            label: 'تأخّر في المهارات الحركية',
            score: { occupational: 6, 'early-intervention': 2 },
          },
          {
            value: 'learning',
            label: 'صعوبات في التعلّم والفهم',
            score: { 'autism-rehab': 2, 'early-intervention': 3, occupational: 2 },
          },
          {
            value: 'multiple',
            label: 'أكثر من جانب — أحتاج تقييماً شاملاً',
            score: { 'early-intervention': 3, 'autism-rehab': 3, psychological: 2 },
          },
        ],
      },
      {
        id: 'diagnosis',
        label: 'هل حصل طفلك على تشخيص رسمي؟',
        options: [
          { value: 'autism', label: 'نعم — اضطراب طيف التوحد', score: { 'autism-rehab': 6 } },
          {
            value: 'intellectual',
            label: 'نعم — إعاقة ذهنية',
            score: { 'early-intervention': 4, psychological: 3 },
          },
          {
            value: 'down',
            label: 'نعم — متلازمة داون',
            score: { 'early-intervention': 4, 'speech-lang': 3, occupational: 3 },
          },
          {
            value: 'adhd',
            label: 'نعم — فرط حركة وتشتّت انتباه',
            score: { psychological: 5, occupational: 2 },
          },
          {
            value: 'none',
            label: 'لا — لم يُشخَّص بعد',
            score: { 'early-intervention': 3, psychological: 2 },
          },
        ],
      },
      {
        id: 'communication',
        label: 'كيف يتواصل طفلك مع من حوله؟',
        options: [
          {
            value: 'none',
            label: 'لا يتكلّم أو يستخدم كلمات محدودة جداً',
            score: { 'speech-lang': 5, 'autism-rehab': 3, 'early-intervention': 3 },
          },
          {
            value: 'limited',
            label: 'كلمات مفردة — لا يركّب جملاً',
            score: { 'speech-lang': 5, 'autism-rehab': 2 },
          },
          {
            value: 'sentences',
            label: 'جمل قصيرة — لكن يصعب فهمه أحياناً',
            score: { 'speech-lang': 3, psychological: 2 },
          },
          {
            value: 'full',
            label: 'يتكلّم جيداً — المشكلة ليست في اللغة',
            score: { psychological: 3, occupational: 3 },
          },
        ],
      },
      {
        id: 'selfCare',
        label: 'كيف هو استقلالية طفلك في الأنشطة اليومية؟',
        options: [
          {
            value: 'needs-help',
            label: 'يحتاج مساعدة في كل شيء (أكل/لبس/حمّام)',
            score: { occupational: 5, 'early-intervention': 3 },
          },
          { value: 'some', label: 'يعتمد على نفسه في بعض الأمور', score: { occupational: 3 } },
          { value: 'most', label: 'مستقل في أغلب المهارات اليومية', score: { psychological: 2 } },
        ],
      },
      {
        id: 'preferredAudience',
        label: 'جنس طفلك؟',
        options: [
          { value: 'female', label: 'بنت' },
          { value: 'male', label: 'ولد' },
        ],
      },
    ],
    // Human-readable recommendation per service id (from content.services).
    recommendations: {
      'early-intervention': {
        title: 'برنامج التدخّل المبكر',
        why: 'نوصي بهذا البرنامج لأنّ سن طفلك وظروفه تجعل التدخّل المبكر الأكثر تأثيراً في تسريع النمو قبل دخول البيئة المدرسية.',
        color: 'from-emerald-500 to-green-600',
        icon: '🌱',
      },
      'autism-rehab': {
        title: 'برنامج تأهيل اضطراب التوحد',
        why: 'ملامح إجاباتك تتوافق مع برامج ABA / PECS / TEACCH التي نقدّمها بفريق أخصائيين معتمدين.',
        color: 'from-blue-500 to-indigo-600',
        icon: '🧩',
      },
      psychological: {
        title: 'برنامج العلاج النفسي والسلوكي',
        why: 'يبدو أن الاحتياج الأكبر هو في الجانب السلوكي والعاطفي — جلسات تعديل السلوك والعلاج المعرفي ستكون أنسب نقطة بداية.',
        color: 'from-purple-500 to-violet-600',
        icon: '💙',
      },
      'speech-lang': {
        title: 'برنامج تأهيل النطق واللغة',
        why: 'إشارات إجاباتك تدل على أن محور التدخّل يجب أن يكون اللغة والتواصل — نوفّر أخصائيات نطق معتمدات ASHA.',
        color: 'from-teal-500 to-cyan-600',
        icon: '🗣️',
      },
      occupational: {
        title: 'برنامج العلاج الوظيفي والحسّي',
        why: 'الجانب الحركي والاستقلالية في الأنشطة اليومية هو محور الخطة التأهيلية المقترَحة.',
        color: 'from-rose-500 to-pink-600',
        icon: '🖐️',
      },
      recreational: {
        title: 'البرامج الترفيهية والاجتماعية',
        why: 'طفلك يمكن أن يستفيد من البرامج الاجتماعية والترفيهية المدروسة لبناء الثقة وتعزيز التفاعل.',
        color: 'from-amber-500 to-orange-600',
        icon: '🎨',
      },
    },
    // Fallback recommendation shown when no service score dominates.
    fallback: {
      title: 'تقييم شامل متعدّد التخصصات',
      why: 'بناءً على إجاباتك، نوصي بزيارة تقييم أولية مع فريق متعدد التخصصات لبناء خطة فردية دقيقة.',
      color: 'from-slate-600 to-slate-800',
      icon: '🔎',
    },
  },

  /* ── Photo gallery ── */
  gallery: {
    title: 'جولة داخل المركز',
    subtitle: 'بيئات مُصمّمة خصيصاً لراحة المستفيدين وتوفير تجربة تأهيلية فعّالة',
    categories: [
      { id: 'all', label: 'الكل' },
      { id: 'therapy', label: 'غرف العلاج' },
      { id: 'sensory', label: 'التكامل الحسّي' },
      { id: 'play', label: 'مناطق اللعب' },
      { id: 'outdoor', label: 'الأنشطة الخارجية' },
    ],
    // Each item uses a generated SVG placeholder so the gallery renders
    // before real photos arrive. When real photos land, swap `src` to
    // point at /images/gallery/<filename>.webp — no component changes needed.
    items: [
      {
        id: 1,
        category: 'therapy',
        caption: 'غرفة الجلسات الفردية',
        gradient: 'from-emerald-400 to-teal-600',
        icon: '🪑',
      },
      {
        id: 2,
        category: 'sensory',
        caption: 'غرفة التكامل الحسّي',
        gradient: 'from-purple-400 to-pink-500',
        icon: '🌟',
      },
      {
        id: 3,
        category: 'therapy',
        caption: 'قاعة النطق واللغة',
        gradient: 'from-blue-400 to-indigo-600',
        icon: '🗣️',
      },
      {
        id: 4,
        category: 'play',
        caption: 'منطقة اللعب الداخلية',
        gradient: 'from-amber-400 to-orange-500',
        icon: '🎈',
      },
      {
        id: 5,
        category: 'therapy',
        caption: 'قاعة العلاج الوظيفي',
        gradient: 'from-rose-400 to-pink-600',
        icon: '🖐️',
      },
      {
        id: 6,
        category: 'sensory',
        caption: 'غرفة الاستشعار المتعدّد',
        gradient: 'from-cyan-400 to-blue-500',
        icon: '✨',
      },
      {
        id: 7,
        category: 'outdoor',
        caption: 'الفناء الخارجي الآمن',
        gradient: 'from-green-400 to-emerald-600',
        icon: '🌳',
      },
      {
        id: 8,
        category: 'play',
        caption: 'مكتبة الأطفال التفاعلية',
        gradient: 'from-violet-400 to-purple-600',
        icon: '📚',
      },
      {
        id: 9,
        category: 'outdoor',
        caption: 'ملعب الألعاب الحركية',
        gradient: 'from-yellow-400 to-amber-500',
        icon: '⚽',
      },
    ],
  },

  /* ── Success stories ── */
  stories: {
    title: 'قصص نجاح حقيقية',
    subtitle:
      'قصص أطفال تحوّلت حياتهم بفضل خطط تأهيل فردية وفريق مختص — أسماء مُستعارة بطلب من ذويهم',
    items: [
      {
        name: 'مشاعل',
        age: 4,
        condition: 'اضطراب طيف التوحد',
        before: 'لم تكن تنطق أي كلمة، تتجنّب النظر، وتنعزل عن الأطفال.',
        after: 'تنطق +50 كلمة، تطلب احتياجاتها، وتشارك في اللعب الجماعي.',
        duration: '8 أشهر',
        program: 'ABA + تأهيل نطق',
        metric: { label: 'مفردات جديدة', value: 52 },
        color: 'from-pink-500 to-rose-500',
      },
      {
        name: 'عبدالرحمن',
        age: 7,
        condition: 'تأخّر حركي + ضعف تركيز',
        before: 'لا يستطيع ربط حذائه أو الإمساك بالقلم، تشتّت شديد في المدرسة.',
        after: 'يكتب الحروف، يربط حذاءه، ويلتزم بمهامه 25 دقيقة.',
        duration: '12 شهراً',
        program: 'علاج وظيفي + تعديل سلوك',
        metric: { label: 'مدة التركيز', value: '25د', isText: true },
        color: 'from-blue-500 to-indigo-500',
      },
      {
        name: 'ليلى',
        age: 3,
        condition: 'متلازمة داون',
        before: 'لا تمشي بثبات، تحتاج مساعدة في الأكل، لا تتواصل بصرياً.',
        after: 'تمشي وتجري، تأكل باستقلالية، وتقول جملاً من كلمتين.',
        duration: '10 أشهر',
        program: 'تدخّل مبكر شامل',
        metric: { label: 'مهارة جديدة', value: 18 },
        color: 'from-emerald-500 to-teal-500',
      },
    ],
  },

  /* ── Awards / certifications ── */
  awards: {
    title: 'اعتمادات وشراكات',
    subtitle: 'نفتخر بالتزامنا بأعلى معايير الجودة المحلية والعالمية',
    items: [
      { name: 'وزارة الموارد البشرية', detail: 'رخصة مركز تأهيل معتمد', icon: '🏛️' },
      { name: 'هيئة رعاية ذوي الإعاقة', detail: 'عضو مسجّل', icon: '💙' },
      { name: 'هيئة التخصصات الصحية (SCFHS)', detail: 'أخصائيون مرخّصون', icon: '⚕️' },
      { name: 'ASHA', detail: 'أخصائيات نطق معتمدات دولياً', icon: '🎓' },
      { name: 'BACB', detail: 'محلّلو سلوك تطبيقي (BCBA)', icon: '📜' },
      { name: 'CARF', detail: 'توافق معايير الجودة', icon: '🌍' },
    ],
  },

  /* ── Newsletter ── */
  newsletter: {
    title: 'ابقَ على اطلاع',
    subtitle:
      'اشترك لتصلك آخر الأخبار، فعاليات توعوية، ونصائح من خبرائنا — مرة واحدة في الشهر، بدون spam.',
    placeholderEmail: 'أدخل بريدك الإلكتروني',
    placeholderName: 'الاسم (اختياري)',
    ctaSubmit: 'اشترك',
    ctaSubmitting: 'جارٍ الاشتراك...',
    successMessage: 'تم اشتراكك بنجاح — ستصلك آخر المستجدات قريباً.',
    errorMessage: 'تعذّر إتمام الاشتراك — تحقق من البريد الإلكتروني.',
    perks: [
      'نصائح من أخصائيين في تأهيل ذوي الاحتياجات الخاصة',
      'دعوات لورش عمل لأولياء الأمور',
      'آخر أخبار المركز والفعاليات',
    ],
  },

  /* ── Comparison ── */
  comparison: {
    title: 'لماذا الأوائل دون غيرها؟',
    subtitle: 'مقارنة سريعة بين مراكز الأوائل والخيارات الأخرى في السوق',
    weLabel: 'مراكز الأوائل',
    otherLabel: 'مراكز أخرى',
    rows: [
      { feature: 'تجربة +25 سنة في المجال', us: true, other: 'غالباً أقل من 10 سنوات' },
      { feature: 'فريق +400 متخصص معتمد', us: true, other: 'فرق أصغر وعامة' },
      { feature: 'فترتان يومياً (صباحية + مسائية)', us: true, other: 'عادة فترة واحدة' },
      { feature: 'خدمة نقل لجميع أحياء الرياض', us: true, other: 'محدودة أو بتكلفة إضافية' },
      { feature: 'بوابة ولي الأمر الرقمية ومتابعة التقدم', us: true, other: 'تقارير ورقية شهرية' },
      { feature: 'بنك أهداف دولي (+200 هدف)', us: true, other: 'أهداف عامة غير مُعايَرة' },
      { feature: '4 فروع متخصصة (للذكور والإناث)', us: true, other: 'فرع واحد مختلط غالباً' },
      { feature: 'معايير ASHA / BCBA / SCFHS', us: true, other: 'شهادات محلية فقط' },
      { feature: 'نظام إنذار مبكر لرصد الانحدار', us: true, other: 'متابعة دورية عامة' },
      { feature: 'جلسات عن بُعد للعائلات البعيدة', us: true, other: 'غير متاح' },
    ],
  },

  /* ── SEO ── */
  seo: {
    description:
      'مراكز الأوائل للرعاية والتأهيل — الخيار الأول في الرياض لتأهيل ذوي الإعاقة الذهنية واضطراب التوحد. 4 فروع، 400+ متخصص، 25 سنة خبرة.',
    keywords: [
      'مراكز الأوائل',
      'Alawael',
      'تأهيل ذوي الإعاقة',
      'تأهيل التوحد',
      'تأهيل الإعاقة الذهنية',
      'الرياض',
      'تدخل مبكر',
      'ABA',
      'IEP',
      'متلازمة داون',
    ],
    organizationType: 'MedicalOrganization',
  },

  /* ── Programs (clinical depth details) ── */
  programs: {
    title: 'برامجنا المتخصصة',
    subtitle: 'خطط تأهيلية فردية مُصمّمة لكل مستفيد وفق المعايير الدولية',
    items: [
      {
        title: 'الإعاقة الذهنية',
        desc: 'تقييم متعدد التخصصات، خطة تأهيل فردية، ومتابعة تقدّم دورية.',
        icon: '🧠',
        tags: ['IQ Assessment', 'Vineland-III', 'IEP'],
      },
      {
        title: 'اضطراب طيف التوحد',
        desc: 'برامج ABA، PECS، TEACCH — بإشراف أخصائيين معتمدين دولياً.',
        icon: '🧩',
        tags: ['ABA', 'PECS', 'TEACCH', 'DIR'],
      },
      {
        title: 'متلازمة داون',
        desc: 'تطوير اللغة والمهارات الحركية والاستقلالية الوظيفية.',
        icon: '💛',
        tags: ['Speech Therapy', 'Motor Skills', 'Life Skills'],
      },
      {
        title: 'صعوبات التعلّم',
        desc: 'دعم أكاديمي فردي في القراءة والكتابة والرياضيات.',
        icon: '📚',
        tags: ['Reading', 'Writing', 'Math'],
      },
      {
        title: 'اضطراب فرط الحركة (ADHD)',
        desc: 'تنظيم السلوك، تحسين التركيز، واستراتيجيات إدارة الذات.',
        icon: '⚡',
        tags: ['Behavior', 'Focus', 'Self-Reg'],
      },
      {
        title: 'تأخّر النمو',
        desc: 'تدخّل مبكر شامل في الجوانب الحركية والمعرفية واللغوية.',
        icon: '🌱',
        tags: ['Early Intervention', 'Developmental Milestones'],
      },
    ],
  },

  /* ── Statistics ── */
  stats: [
    {
      value: 25,
      suffix: '+',
      label: 'سنة من الخبرة',
      icon: '📅',
      gradient: 'from-emerald-400/20 to-green-400/5',
    },
    {
      value: 4,
      suffix: '',
      label: 'فروع في الرياض',
      icon: '🏢',
      gradient: 'from-blue-400/20 to-indigo-400/5',
    },
    {
      value: 400,
      suffix: '+',
      label: 'أخصائي ومتخصص',
      icon: '👨‍⚕️',
      gradient: 'from-purple-400/20 to-violet-400/5',
    },
    {
      value: 8000,
      suffix: '+',
      label: 'مستفيد تم خدمته',
      icon: '👥',
      gradient: 'from-amber-400/20 to-orange-400/5',
    },
  ],

  /* ── Branches ── */
  branches: {
    title: 'فروعنا في الرياض',
    subtitle: 'أربعة فروع متخصصة — للذكور والإناث — موزّعة في مختلف أحياء الرياض',
    items: [
      {
        name: 'فرع المغرزات',
        audience: 'بنات',
        audienceEn: 'Girls',
        city: 'الرياض',
        district: 'حي المغرزات',
        address: 'حي المغرزات، الرياض',
        phone: '0112633172',
        phoneDisplay: '011-263-3172',
        accentColor: 'from-pink-500 to-rose-500',
        icon: '👧',
      },
      {
        name: 'فرع غرناطة',
        audience: 'أولاد',
        audienceEn: 'Boys',
        city: 'الرياض',
        district: 'حي غرناطة',
        address: 'حي غرناطة، الرياض',
        phone: '0114295515',
        phoneDisplay: '011-429-5515',
        accentColor: 'from-blue-500 to-indigo-500',
        icon: '👦',
      },
      {
        name: 'فرع الشفاء',
        audience: 'أولاد',
        audienceEn: 'Boys',
        city: 'الرياض',
        district: 'حي الشفاء',
        address: 'حي الشفاء، الرياض',
        phone: '0114220038',
        phoneDisplay: '011-422-0038',
        accentColor: 'from-emerald-500 to-green-500',
        icon: '👦',
      },
      {
        name: 'فرع الأندلس',
        audience: 'أولاد',
        audienceEn: 'Boys',
        city: 'الرياض',
        district: 'حي الأندلس',
        address: 'حي الأندلس، الرياض',
        phone: '0114414415',
        phoneSecondary: '0114414412',
        phoneDisplay: '011-441-4415',
        accentColor: 'from-purple-500 to-violet-500',
        icon: '👦',
      },
    ],
  },

  /* ── Testimonials ── */
  testimonials: [
    {
      name: 'أم عبدالله',
      role: 'ولية أمر — فرع المغرزات',
      text: 'بعد سنة واحدة من التحاق ابنتي ببرنامج التدخّل المبكر شاهدت تطوّراً ملموساً في مهارات التواصل واللغة. الفريق يتعامل بحبّ حقيقي.',
      avatar: '👩',
      rating: 5,
    },
    {
      name: 'أبو محمد',
      role: 'ولي أمر — فرع الأندلس',
      text: 'مركز الأوائل خدمنا لأكثر من 10 سنوات. الاستمرارية والمهنية والرعاية الإنسانية لا تُقدّر بثمن — نوصي به كل أهل تجربتهم مشابهة.',
      avatar: '👨',
      rating: 5,
    },
    {
      name: 'د. سارة المحمدي',
      role: 'استشارية طب الأطفال',
      text: 'أحيل إليهم حالات الإعاقة الذهنية واضطراب التوحد بثقة. نتائج التدخّل المبكر لديهم ملحوظة ومدعومة بتقارير دورية واضحة.',
      avatar: '👩‍⚕️',
      rating: 5,
    },
    {
      name: 'أم فيصل',
      role: 'ولية أمر — فرع الشفاء',
      text: 'خدمة النقل خلّصتنا من هاجس المواصلات يومياً. والفترتان الصباحية والمسائية تناسبان ظروف كل أسرة — شكراً للقائمين على المركز.',
      avatar: '👩',
      rating: 5,
    },
    {
      name: 'أبو ريان',
      role: 'ولي أمر — فرع غرناطة',
      text: 'ابني اليوم يقرأ ويكتب ويعتمد على نفسه في أمور كثيرة — بفضل الله ثم جهود الفريق التأهيلي في المركز.',
      avatar: '👨',
      rating: 5,
    },
  ],

  /* ── Why us ── */
  whyUs: [
    {
      icon: '🏆',
      title: '25 سنة خبرة مثبتة',
      desc: 'من أوائل المراكز المتخصصة في تأهيل ذوي الإعاقة الذهنية بالرياض',
    },
    {
      icon: '👨‍⚕️',
      title: 'فريق متعدد التخصصات',
      desc: 'أكثر من 400 متخصص ومتخصصة من مختلف المجالات الطبية والتأهيلية',
    },
    {
      icon: '📋',
      title: 'خطط فردية (IEP)',
      desc: 'خطة تأهيل مصممة خصيصاً لكل مستفيد وفق تقييم متعدد التخصصات',
    },
    {
      icon: '⏰',
      title: 'فترتان يومياً',
      desc: 'مرونة الاختيار بين الفترة الصباحية والمسائية حسب ظروف الأسرة',
    },
    {
      icon: '🚐',
      title: 'خدمة نقل شاملة',
      desc: 'توصيل من وإلى جميع أحياء مدينة الرياض بحافلات مجهّزة وآمنة',
    },
    {
      icon: '📊',
      title: 'متابعة رقمية للأهل',
      desc: 'منصّة إلكترونية لمتابعة تقدم المستفيد وتقارير دورية شفافة',
    },
  ],

  /* ── How it works ── */
  howItWorks: {
    title: 'رحلة المستفيد معنا',
    subtitle: 'من أول زيارة حتى تحقيق الأهداف التأهيلية — خطوات واضحة ومدروسة',
    steps: [
      {
        step: 1,
        title: 'التقييم الأوّلي',
        desc: 'جلسة تقييم شاملة من فريق متعدد التخصصات لتحديد الاحتياجات',
        icon: '🔎',
        color: 'from-emerald-500 to-green-500',
      },
      {
        step: 2,
        title: 'الخطة الفردية',
        desc: 'إعداد خطة تأهيل مخصّصة (IEP) بأهداف قابلة للقياس',
        icon: '📝',
        color: 'from-blue-500 to-indigo-500',
      },
      {
        step: 3,
        title: 'التنفيذ والمتابعة',
        desc: 'جلسات يومية وأسبوعية مع تقارير تقدّم منتظمة لولي الأمر',
        icon: '🎯',
        color: 'from-purple-500 to-violet-500',
      },
      {
        step: 4,
        title: 'التقييم الدوري',
        desc: 'مراجعة كل 3 أشهر وتعديل الخطة حسب التقدّم المُحقَّق',
        icon: '📈',
        color: 'from-amber-500 to-orange-500',
      },
    ],
  },

  /* ── FAQ ── */
  faq: [
    {
      q: 'ما سنّ القبول في المراكز؟',
      a: 'نستقبل الحالات من عمر سنتين فما فوق. برامج التدخّل المبكر متاحة للأعمار 2–6، والبرامج التأهيلية لجميع الأعمار بعد ذلك حسب نوع الإعاقة.',
    },
    {
      q: 'هل تتوفر خدمة النقل؟',
      a: 'نعم — خدمة النقل متوفرة إلى جميع أحياء الرياض بحافلات مخصّصة ومجهّزة، مع مرافِقة متخصصة على متن كل حافلة.',
    },
    {
      q: 'ما الفرق بين الفترة الصباحية والمسائية؟',
      a: 'البرامج في الفترتين متطابقة من حيث المحتوى التأهيلي والكادر المُشرف. الاختيار يعتمد على ظروف الأسرة وما يناسب المستفيد.',
    },
    {
      q: 'كيف يتم قبول حالة جديدة؟',
      a: 'تبدأ الرحلة بزيارة تقييم مبدئية (بموعد مسبق) — يتبعها اجتماع مع الفريق المتخصص لوضع خطة تأهيل فردية، ثم الانضمام للبرنامج المناسب.',
    },
    {
      q: 'هل هناك متابعة لولي الأمر؟',
      a: 'نعم — نوفّر تقارير دورية (أسبوعية وشهرية) عن تقدّم المستفيد، ولقاءات فصلية مع فريق التأهيل لمراجعة الأهداف والخطة.',
    },
    {
      q: 'ما أنواع الإعاقات التي يستقبلها المركز؟',
      a: 'الإعاقة الذهنية بدرجاتها، اضطراب طيف التوحد، متلازمة داون، صعوبات التعلّم، فرط الحركة وتشتّت الانتباه، وتأخّر النمو.',
    },
  ],

  /* ── Trusted by / partners ── */
  trustedBy: [
    'وزارة الموارد البشرية والتنمية الاجتماعية',
    'هيئة تقويم التعليم والتدريب',
    'وزارة الصحة',
    'هيئة رعاية الأشخاص ذوي الإعاقة',
    'هيئة الرعاية الصحية',
    'المؤسسة العامة للتأمينات الاجتماعية',
  ],

  /* ── Contact ── */
  contact: {
    title: 'تواصل معنا',
    subtitle: 'فريقنا جاهز للإجابة على استفساراتكم وتحديد موعد زيارة تقييمية',
    mainAddress: 'تقاطع طريق عثمان بن عفان مع طريق الملك عبدالله، الرياض',
    mainPhone: '+966535242200',
    mainPhoneDisplay: '0535242200',
    email: 'info@awael.sa',
    workingHours: 'الأحد – الخميس | صباحي: 7:30 ص – 12:30 م | مسائي: 3:00 م – 8:00 م',
    social: [
      { platform: 'twitter', label: 'تويتر', url: 'https://twitter.com/' },
      { platform: 'instagram', label: 'إنستقرام', url: 'https://instagram.com/' },
      { platform: 'facebook', label: 'فيسبوك', url: 'https://facebook.com/' },
    ],
    website: 'https://awael.sa',
  },

  /* ── CTA section ── */
  cta: {
    title: 'ابدأ رحلة التأهيل معنا اليوم',
    subtitle:
      'احجز زيارة تقييم مبدئية — خطوة واحدة تغيّر حياة من تُحبّ. فريقنا سيتواصل معك خلال 24 ساعة.',
    primary: { label: 'احجز زيارة تقييم', to: '/register' },
    secondary: { label: 'اتصل بنا الآن', tel: '+966535242200' },
  },

  /* ── Footer ── */
  footer: {
    description:
      'مراكز الأوائل للرعاية والتأهيل — من أوائل المراكز المتخصصة في تأهيل ذوي الإعاقة الذهنية واضطراب التوحد في المملكة العربية السعودية.',
    columns: [
      {
        title: 'المركز',
        links: [
          { label: 'من نحن', anchor: '#about' },
          { label: 'برامجنا', anchor: '#programs' },
          { label: 'فروعنا', anchor: '#branches' },
          { label: 'وظائف', href: '/careers' },
        ],
      },
      {
        title: 'روابط مفيدة',
        links: [
          { label: 'الأسئلة الشائعة', anchor: '#faq' },
          { label: 'سياسة الخصوصية', href: '/privacy' },
          { label: 'الشروط والأحكام', href: '/terms' },
          { label: 'اتصل بنا', anchor: '#contact' },
        ],
      },
    ],
    copyright:
      '© {year} مراكز الأوائل للرعاية والتأهيل — جميع الحقوق محفوظة — سجل تجاري مرخّص من وزارة الموارد البشرية والتنمية الاجتماعية',
  },
};

export default landingContent;
