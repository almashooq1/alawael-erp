/**
 * clinical-scales-items.seed.js
 * ═══════════════════════════════════════════════════════════════
 * بذور بيانات الاختبارات والمقاييس السريرية الحقيقية
 * Real Clinical Assessment Items Seed Data
 *
 * يحتوي على البنود الفعلية لكل مقياس (بالعربية والإنجليزية)
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

// ╔══════════════════════════════════════════════════════════════╗
// ║  M-CHAT-R/F — 20 بند حقيقي (قائمة التوحد للأطفال الصغار)    ║
// ╚══════════════════════════════════════════════════════════════╝

const MCHAT_ITEMS = [
  {
    item_number: 1,
    question_ar: 'إذا أشرت إلى شيء في الغرفة، هل ينظر طفلك إليه؟',
    question_en: 'If you point at something, does your child look at it?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 2,
    question_ar: 'هل تساءلت يوماً ما إذا كان طفلك أصم؟',
    question_en: 'Have you ever wondered if your child might be deaf?',
    is_critical: true,
    at_risk_answer: true,
  },
  {
    item_number: 3,
    question_ar: 'هل يلعب طفلك ألعاب التخيل أو التظاهر؟ (مثلاً يتظاهر بالشرب من كوب فارغ)',
    question_en: 'Does your child play pretend or make-believe?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 4,
    question_ar: 'هل يحب طفلك التسلق على الأشياء؟ (مثلاً الأثاث، ألعاب الملعب)',
    question_en: 'Does your child like climbing on things?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 5,
    question_ar: 'هل يقوم طفلك بحركات غير اعتيادية بأصابعه قرب عينيه؟',
    question_en: 'Does your child make unusual finger movements near his/her eyes?',
    is_critical: true,
    at_risk_answer: true,
  },
  {
    item_number: 6,
    question_ar: 'هل يشير طفلك بإصبعه ليطلب شيئاً أو ليحصل على مساعدة؟',
    question_en: 'Does your child point with one finger to ask for something or get help?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 7,
    question_ar: 'هل يشير طفلك بإصبعه ليريك شيئاً مثيراً للاهتمام؟',
    question_en: 'Does your child point to show you something interesting?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 8,
    question_ar: 'هل يهتم طفلك بالأطفال الآخرين؟',
    question_en: 'Is your child interested in other children?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 9,
    question_ar: 'هل يحضر طفلك أشياء ليريكها؟ (مثلاً لعبة أو صورة)',
    question_en: 'Does your child bring objects to show you?',
    is_critical: true,
    at_risk_answer: false,
  },
  {
    item_number: 10,
    question_ar: 'هل يستجيب طفلك عند مناداته باسمه؟',
    question_en: 'Does your child respond when you call his/her name?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 11,
    question_ar: 'عندما تبتسم لطفلك، هل يبتسم لك؟',
    question_en: 'When you smile at your child, does he/she smile back?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 12,
    question_ar: 'هل ينزعج طفلك من الأصوات اليومية العادية؟',
    question_en: 'Does your child get upset by everyday noises?',
    is_critical: true,
    at_risk_answer: true,
  },
  {
    item_number: 13,
    question_ar: 'هل يستطيع طفلك المشي؟',
    question_en: 'Does your child walk?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 14,
    question_ar: 'هل ينظر طفلك في عينيك عندما تتحدث إليه أو تلعب معه أو تلبسه ملابسه؟',
    question_en: 'Does your child look you in the eye when you are talking, playing, or dressing?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 15,
    question_ar: 'هل يحاول طفلك تقليد ما تفعله؟ (مثلاً التلويح بيده أو التصفيق)',
    question_en: 'Does your child try to copy what you do?',
    is_critical: true,
    at_risk_answer: false,
  },
  {
    item_number: 16,
    question_ar: 'إذا أدرت رأسك لتنظر إلى شيء، هل ينظر طفلك حوله ليرى ما تنظر إليه؟',
    question_en:
      'If you turn your head to look at something, does your child look to see what you are looking at?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 17,
    question_ar: 'هل يحاول طفلك أن يجعلك تنظر إليه؟',
    question_en: 'Does your child try to get you to look at him/her?',
    is_critical: true,
    at_risk_answer: false,
  },
  {
    item_number: 18,
    question_ar: 'هل يفهم طفلك عندما تطلب منه فعل شيء؟ (مثلاً: ضع الكتاب على الكرسي)',
    question_en: 'Does your child understand when you tell him/her to do something?',
    is_critical: true,
    at_risk_answer: false,
  },
  {
    item_number: 19,
    question_ar: 'إذا حدث شيء جديد، هل ينظر طفلك إلى وجهك ليرى شعورك تجاهه؟',
    question_en:
      'If something new happens, does your child look at your face to see how you feel about it?',
    is_critical: false,
    at_risk_answer: false,
  },
  {
    item_number: 20,
    question_ar: 'هل يحب طفلك الأنشطة الحركية؟ (مثلاً التأرجح أو الارتداد على ركبتيك)',
    question_en: 'Does your child like movement activities?',
    is_critical: true,
    at_risk_answer: false,
  },
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  CARS-2 — 15 بند (مقياس تقييم التوحد في الطفولة)            ║
// ╚══════════════════════════════════════════════════════════════╝

const CARS2_ITEMS = [
  {
    item_number: 1,
    item_name_ar: 'العلاقة بالناس',
    item_name_en: 'Relating to People',
    domain: 'social',
    scoring_guide_ar: '1=لا صعوبة, 2=شذوذ خفيف, 3=شذوذ متوسط, 4=شذوذ شديد',
  },
  {
    item_number: 2,
    item_name_ar: 'التقليد',
    item_name_en: 'Imitation',
    domain: 'social',
    scoring_guide_ar: '1=تقليد مناسب, 2=تقليد بتأخر بسيط, 3=تقليد جزئي, 4=نادراً يقلد',
  },
  {
    item_number: 3,
    item_name_ar: 'الاستجابة الانفعالية',
    item_name_en: 'Emotional Response',
    domain: 'social',
    scoring_guide_ar: '1=مناسبة للموقف, 2=خفيفة الشذوذ, 3=متوسطة, 4=شديدة أو غير مرتبطة',
  },
  {
    item_number: 4,
    item_name_ar: 'استخدام الجسم',
    item_name_en: 'Body Use',
    domain: 'behavioral',
    scoring_guide_ar: '1=مناسب للعمر, 2=شذوذ طفيف, 3=شذوذ متوسط (رفرفة/دوران), 4=حركات نمطية شديدة',
  },
  {
    item_number: 5,
    item_name_ar: 'استخدام الأشياء',
    item_name_en: 'Object Use',
    domain: 'behavioral',
    scoring_guide_ar:
      '1=اهتمام مناسب, 2=اهتمام قليل الشذوذ, 3=استخدام غير وظيفي, 4=انشغال نمطي شديد',
  },
  {
    item_number: 6,
    item_name_ar: 'التكيف مع التغيير',
    item_name_en: 'Adaptation to Change',
    domain: 'behavioral',
    scoring_guide_ar: '1=مناسب, 2=صعوبة خفيفة, 3=مقاومة واضحة, 4=ردود فعل شديدة للتغيير',
  },
  {
    item_number: 7,
    item_name_ar: 'الاستجابة البصرية',
    item_name_en: 'Visual Response',
    domain: 'sensory',
    scoring_guide_ar: '1=مناسبة, 2=خفيفة الشذوذ, 3=تحديق/تجنب, 4=شذوذ بصري شديد',
  },
  {
    item_number: 8,
    item_name_ar: 'الاستجابة السمعية',
    item_name_en: 'Listening Response',
    domain: 'sensory',
    scoring_guide_ar:
      '1=مناسبة للعمر, 2=حساسية/تجاهل خفيف, 3=استجابة غير ثابتة, 4=فرط/نقص حساسية شديد',
  },
  {
    item_number: 9,
    item_name_ar: 'الذوق والشم واللمس',
    item_name_en: 'Taste, Smell, Touch Response',
    domain: 'sensory',
    scoring_guide_ar: '1=طبيعي, 2=فحص خفيف, 3=انشغال متوسط, 4=انشغال شديد بشم/لمس/تذوق',
  },
  {
    item_number: 10,
    item_name_ar: 'الخوف والعصبية',
    item_name_en: 'Fear or Nervousness',
    domain: 'behavioral',
    scoring_guide_ar: '1=مناسب للعمر, 2=خفيف الشذوذ, 3=خوف زائد/ناقص, 4=خوف شديد أو انعدام تام',
  },
  {
    item_number: 11,
    item_name_ar: 'التواصل اللفظي',
    item_name_en: 'Verbal Communication',
    domain: 'communication',
    scoring_guide_ar: '1=طبيعي للعمر, 2=تأخر خفيف, 3=غياب/إيكولاليا, 4=لا كلام وظيفي',
  },
  {
    item_number: 12,
    item_name_ar: 'التواصل غير اللفظي',
    item_name_en: 'Nonverbal Communication',
    domain: 'communication',
    scoring_guide_ar: '1=مناسب, 2=استخدام محدود, 3=نادر أو غير مفهوم, 4=لا تواصل غير لفظي',
  },
  {
    item_number: 13,
    item_name_ar: 'مستوى النشاط',
    item_name_en: 'Activity Level',
    domain: 'behavioral',
    scoring_guide_ar:
      '1=طبيعي, 2=قليل الزيادة/النقص, 3=نشاط زائد/خمول واضح, 4=فرط شديد أو خمول تام',
  },
  {
    item_number: 14,
    item_name_ar: 'مستوى واتساق الاستجابة الذهنية',
    item_name_en: 'Level and Consistency of Intellectual Response',
    domain: 'communication',
    scoring_guide_ar:
      '1=متساوية ومناسبة, 2=تفاوت خفيف, 3=تفاوت واضح بين المجالات, 4=أداء أدنى من المتوقع بكثير',
  },
  {
    item_number: 15,
    item_name_ar: 'الانطباعات العامة',
    item_name_en: 'General Impressions',
    domain: 'general',
    scoring_guide_ar: '1=لا توحد, 2=توحد خفيف, 3=توحد متوسط, 4=توحد شديد',
  },
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  Zarit Burden Interview — 22 بند (عبء مقدم الرعاية)        ║
// ╚══════════════════════════════════════════════════════════════╝

const ZARIT_ITEMS = [
  {
    item_number: 1,
    question_ar: 'هل تشعر أن قريبك يطلب أكثر مما يحتاجه فعلاً من المساعدة؟',
    dimension: 'role_strain',
  },
  {
    item_number: 2,
    question_ar: 'هل تشعر أنه بسبب الوقت المخصص لقريبك لا يتبقى لديك وقت كافٍ لنفسك؟',
    dimension: 'personal_strain',
  },
  {
    item_number: 3,
    question_ar: 'هل تشعر بالضغط بين رعاية قريبك ومحاولة الوفاء بمسؤولياتك الأخرى (العمل/الأسرة)؟',
    dimension: 'role_strain',
  },
  { item_number: 4, question_ar: 'هل تشعر بالحرج من سلوك قريبك؟', dimension: 'personal_strain' },
  {
    item_number: 5,
    question_ar: 'هل تشعر بالغضب عندما تكون بالقرب من قريبك؟',
    dimension: 'personal_strain',
  },
  {
    item_number: 6,
    question_ar: 'هل تشعر أن قريبك يؤثر سلبياً على علاقتك بأفراد الأسرة الآخرين أو الأصدقاء؟',
    dimension: 'role_strain',
  },
  {
    item_number: 7,
    question_ar: 'هل تخشى مما يخبئه المستقبل لقريبك؟',
    dimension: 'personal_strain',
  },
  { item_number: 8, question_ar: 'هل تشعر أن قريبك يعتمد عليك؟', dimension: 'role_strain' },
  {
    item_number: 9,
    question_ar: 'هل تشعر بالإنهاك عندما تكون بالقرب من قريبك؟',
    dimension: 'personal_strain',
  },
  {
    item_number: 10,
    question_ar: 'هل تشعر أن صحتك قد تأثرت بسبب مشاركتك في رعاية قريبك؟',
    dimension: 'impact_on_health',
  },
  {
    item_number: 11,
    question_ar: 'هل تشعر أنه ليس لديك خصوصية كافية بسبب رعاية قريبك؟',
    dimension: 'personal_strain',
  },
  {
    item_number: 12,
    question_ar: 'هل تشعر أن حياتك الاجتماعية قد تأثرت بسبب رعاية قريبك؟',
    dimension: 'role_strain',
  },
  {
    item_number: 13,
    question_ar: 'هل تشعر بعدم الراحة في استضافة الأصدقاء بسبب قريبك؟',
    dimension: 'role_strain',
  },
  {
    item_number: 14,
    question_ar:
      'هل تشعر أن قريبك يبدو أنه يتوقع منك الرعاية كما لو كنت الشخص الوحيد الذي يعتمد عليه؟',
    dimension: 'role_strain',
  },
  {
    item_number: 15,
    question_ar: 'هل تشعر أنه ليس لديك ما يكفي من المال لرعاية قريبك بالإضافة إلى نفقاتك الأخرى؟',
    dimension: 'financial_impact',
  },
  {
    item_number: 16,
    question_ar: 'هل تشعر أنك لن تكون قادراً على رعاية قريبك لفترة أطول بكثير؟',
    dimension: 'personal_strain',
  },
  {
    item_number: 17,
    question_ar: 'هل تشعر أنك فقدت السيطرة على حياتك منذ بدء مرض/إعاقة قريبك؟',
    dimension: 'personal_strain',
  },
  {
    item_number: 18,
    question_ar: 'هل تتمنى لو تستطيع ترك رعاية قريبك لشخص آخر؟',
    dimension: 'personal_strain',
  },
  {
    item_number: 19,
    question_ar: 'هل تشعر بعدم اليقين حول ما يجب فعله مع قريبك؟',
    dimension: 'role_strain',
  },
  {
    item_number: 20,
    question_ar: 'هل تشعر أنه يجب عليك أن تفعل المزيد لقريبك؟',
    dimension: 'guilt',
  },
  { item_number: 21, question_ar: 'هل تشعر أنك قد تقدم رعاية أفضل لقريبك؟', dimension: 'guilt' },
  {
    item_number: 22,
    question_ar: 'بشكل عام، ما مدى شعورك بالعبء نتيجة رعاية قريبك؟',
    dimension: 'personal_strain',
  },
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  Family Needs Survey — 35 بند (استبيان احتياجات الأسرة)     ║
// ╚══════════════════════════════════════════════════════════════╝

const FAMILY_NEEDS_ITEMS = {
  information_needs: [
    { item_ar: 'أحتاج معلومات أكثر عن حالة طفلي وإعاقته' },
    { item_ar: 'أحتاج معلومات عن كيفية تعليم طفلي في المنزل' },
    { item_ar: 'أحتاج معلومات عن الخدمات المتاحة لطفلي حالياً' },
    { item_ar: 'أحتاج معلومات عن الخدمات المتاحة لطفلي في المستقبل' },
    { item_ar: 'أحتاج معلومات عن كيفية التعامل مع سلوك طفلي' },
    { item_ar: 'أحتاج معلومات عن النمو الطبيعي للأطفال للمقارنة' },
  ],
  family_support: [
    { item_ar: 'أحتاج للحديث مع شخص في عائلتي عن مشاكلي' },
    { item_ar: 'أحتاج أصدقاء أتحدث معهم' },
    { item_ar: 'أحتاج لقاء عائلات أخرى لديها أطفال من ذوي الإعاقة' },
    { item_ar: 'أحتاج مزيداً من الوقت لنفسي' },
    { item_ar: 'أحتاج لشخص يساعدني عند الشعور بالإحباط' },
  ],
  financial_needs: [
    { item_ar: 'أحتاج مساعدة في دفع نفقات (علاج، أجهزة، تعليم خاص)' },
    { item_ar: 'أحتاج مساعدة في الحصول على تأمين طبي أو ضمان اجتماعي' },
    { item_ar: 'أحتاج مزيداً من المال لتلبية احتياجات أسرتي' },
    { item_ar: 'أحتاج مساعدة في الحصول على معدات أو أجهزة لطفلي' },
  ],
  explaining_to_others: [
    { item_ar: 'أحتاج مساعدة في شرح حالة طفلي لأصدقائي وجيراني' },
    { item_ar: 'أحتاج مساعدة في شرح حالة طفلي لأطفالي الآخرين' },
    { item_ar: 'أحتاج مساعدة في كيفية الرد على أسئلة الغرباء عن طفلي' },
    { item_ar: 'أحتاج مساعدة في شرح حالة طفلي للمعلمين والمدرسة' },
    { item_ar: 'أحتاج مساعدة في شرح الحالة لأقاربي البعيدين' },
  ],
  childcare: [
    { item_ar: 'أحتاج لمن يراعي طفلي حتى أستطيع الذهاب للعمل' },
    { item_ar: 'أحتاج لمن يراعي طفلي لأحصل على وقت للراحة' },
    { item_ar: 'أحتاج شخصاً مدرباً لرعاية طفلي ذي الإعاقة' },
    { item_ar: 'أحتاج مساعدة في إيجاد حضانة أو مدرسة مناسبة' },
  ],
  professional_support: [
    { item_ar: 'أحتاج مستشاراً نفسياً للتعامل مع ضغوطي' },
    { item_ar: 'أحتاج مساعدة في التواصل مع الأخصائيين والأطباء' },
    { item_ar: 'أحتاج تدريباً على كيفية المشاركة في اجتماعات فريق التأهيل' },
    { item_ar: 'أحتاج مساعدة في فهم التقارير والنتائج الطبية' },
    { item_ar: 'أحتاج مساعدة في الدفاع عن حقوق طفلي (مناصرة)' },
    { item_ar: 'أحتاج معلومات عن الدعم القانوني والحقوق المتاحة' },
  ],
};

// ╔══════════════════════════════════════════════════════════════╗
// ║  Quality of Life (WHOQOL-BREF adapted) — 26 بند              ║
// ╚══════════════════════════════════════════════════════════════╝

const QOL_ITEMS = {
  physical_health: [
    {
      item_ar: 'إلى أي مدى تعيقك الآلام الجسدية عن القيام بأعمالك؟',
      item_en: 'To what extent do physical pain prevent you from what you need to do?',
    },
    {
      item_ar: 'ما مدى حاجتك للعلاج الطبي للقيام بوظائفك اليومية؟',
      item_en: 'How much do you need medical treatment to function?',
    },
    {
      item_ar: 'هل لديك طاقة كافية للحياة اليومية؟',
      item_en: 'Do you have enough energy for everyday life?',
    },
    {
      item_ar: 'ما مدى قدرتك على التنقل والحركة؟',
      item_en: 'How well are you able to get around?',
    },
    { item_ar: 'ما مدى رضاك عن نومك؟', item_en: 'How satisfied are you with your sleep?' },
    {
      item_ar: 'ما مدى رضاك عن قدرتك على أداء أنشطتك اليومية؟',
      item_en: 'How satisfied are you with your ability to perform daily activities?',
    },
    {
      item_ar: 'ما مدى رضاك عن قدرتك على العمل؟',
      item_en: 'How satisfied are you with your capacity for work?',
    },
  ],
  psychological: [
    { item_ar: 'ما مدى استمتاعك بالحياة؟', item_en: 'How much do you enjoy life?' },
    {
      item_ar: 'إلى أي مدى تشعر أن حياتك ذات معنى؟',
      item_en: 'To what extent do you feel your life to be meaningful?',
    },
    { item_ar: 'ما مدى قدرتك على التركيز؟', item_en: 'How well are you able to concentrate?' },
    {
      item_ar: 'ما مدى تقبلك لمظهرك الجسدي؟',
      item_en: 'Are you able to accept your bodily appearance?',
    },
    { item_ar: 'ما مدى رضاك عن نفسك؟', item_en: 'How satisfied are you with yourself?' },
    {
      item_ar: 'كم مرة تشعر بمشاعر سلبية مثل الحزن أو القلق أو الاكتئاب؟',
      item_en: 'How often do you have negative feelings?',
    },
  ],
  social_relationships: [
    {
      item_ar: 'ما مدى رضاك عن علاقاتك الشخصية؟',
      item_en: 'How satisfied are you with your personal relationships?',
    },
    {
      item_ar: 'ما مدى رضاك عن حياتك الجنسية/الزوجية؟',
      item_en: 'How satisfied are you with your sex life?',
    },
    {
      item_ar: 'ما مدى رضاك عن الدعم الذي تحصل عليه من أصدقائك؟',
      item_en: 'How satisfied are you with the support you get from friends?',
    },
  ],
  environment: [
    {
      item_ar: 'ما مدى شعورك بالأمان في حياتك اليومية؟',
      item_en: 'How safe do you feel in your daily life?',
    },
    {
      item_ar: 'ما مدى صحة بيئتك المادية (تلوث، ضوضاء، مرور)؟',
      item_en: 'How healthy is your physical environment?',
    },
    {
      item_ar: 'هل لديك ما يكفي من المال لتلبية احتياجاتك؟',
      item_en: 'Have you enough money to meet your needs?',
    },
    {
      item_ar: 'ما مدى توفر المعلومات التي تحتاجها في حياتك اليومية؟',
      item_en: 'How available is information that you need?',
    },
    {
      item_ar: 'إلى أي مدى تتاح لك فرصة الأنشطة الترفيهية؟',
      item_en: 'To what extent do you have the opportunity for leisure activities?',
    },
    {
      item_ar: 'ما مدى رضاك عن ظروفك المعيشية؟',
      item_en: 'How satisfied are you with the conditions of your living place?',
    },
    {
      item_ar: 'ما مدى رضاك عن وصولك للخدمات الصحية؟',
      item_en: 'How satisfied are you with your access to health services?',
    },
    {
      item_ar: 'ما مدى رضاك عن وسائل نقلك؟',
      item_en: 'How satisfied are you with your transport?',
    },
  ],
  disability_specific: [
    {
      item_ar: 'ما مدى تأثير إعاقة طفلك/قريبك على حياتك اليومية؟',
      item_en: 'How much does the disability affect your daily life?',
    },
    {
      item_ar: 'ما مدى رضاك عن خدمات التأهيل المقدمة؟',
      item_en: 'How satisfied are you with rehabilitation services?',
    },
    {
      item_ar: 'ما مدى شعورك بالدعم من المجتمع تجاه إعاقة قريبك؟',
      item_en: 'How supported do you feel by your community?',
    },
    {
      item_ar: 'ما مدى تفاؤلك بتحسن حالة طفلك/قريبك؟',
      item_en: 'How optimistic are you about improvement?',
    },
  ],
};

// ╔══════════════════════════════════════════════════════════════╗
// ║  Portage Guide — عينة من المهارات (مجال اللغة 0-3 سنوات)    ║
// ╚══════════════════════════════════════════════════════════════╝

const PORTAGE_LANGUAGE_SAMPLE = [
  {
    domain: 'language',
    age_range: '0-1',
    item_number: 1,
    skill_ar: 'ينظر إلى الشخص الذي يتكلم',
    skill_en: 'Looks at person who talks',
    teaching_strategy_ar: 'تحدث مع الطفل مباشرة من مسافة قريبة',
  },
  {
    domain: 'language',
    age_range: '0-1',
    item_number: 2,
    skill_ar: 'يبتسم استجابة لحديث الآخرين',
    skill_en: 'Smiles in response to speech',
    teaching_strategy_ar: 'تحدث بنبرة مرحة وابتسم أثناء الحديث',
  },
  {
    domain: 'language',
    age_range: '0-1',
    item_number: 3,
    skill_ar: 'يصدر أصوات مناغاة',
    skill_en: 'Vocalizes (coos, babbles)',
    teaching_strategy_ar: 'قلّد أصوات الطفل وانتظر استجابته',
  },
  {
    domain: 'language',
    age_range: '0-1',
    item_number: 4,
    skill_ar: 'يتتبع الصوت بعينيه',
    skill_en: 'Turns eyes towards sound',
    teaching_strategy_ar: 'أصدر أصواتاً من جهات مختلفة',
  },
  {
    domain: 'language',
    age_range: '0-1',
    item_number: 5,
    skill_ar: 'يستجيب لاسمه بالالتفات',
    skill_en: 'Responds to name by turning',
    teaching_strategy_ar: 'نادِ الطفل باسمه بشكل متكرر مع لمسه',
  },
  {
    domain: 'language',
    age_range: '1-2',
    item_number: 6,
    skill_ar: 'يقلد المقاطع الصوتية المألوفة',
    skill_en: 'Imitates familiar syllables',
    teaching_strategy_ar: 'كرر "ماما، بابا" وشجع التقليد',
  },
  {
    domain: 'language',
    age_range: '1-2',
    item_number: 7,
    skill_ar: 'يتبع تعليمات بسيطة مصحوبة بإشارة',
    skill_en: 'Follows simple directions with gesture',
    teaching_strategy_ar: 'قل "أعطني" مع مد يدك',
  },
  {
    domain: 'language',
    age_range: '1-2',
    item_number: 8,
    skill_ar: 'يشير للأشياء المرغوبة',
    skill_en: 'Points to desired objects',
    teaching_strategy_ar: 'ضع أشياء مرغوبة بعيدة وانتظر الإشارة',
  },
  {
    domain: 'language',
    age_range: '1-2',
    item_number: 9,
    skill_ar: 'يستخدم كلمة واحدة على الأقل بمعنى',
    skill_en: 'Uses at least one word meaningfully',
    teaching_strategy_ar: 'قدم النموذج اللفظي في سياق طبيعي',
  },
  {
    domain: 'language',
    age_range: '1-2',
    item_number: 10,
    skill_ar: 'يفهم "لا"',
    skill_en: 'Understands "no"',
    teaching_strategy_ar: 'استخدم "لا" بثبات مع تعبير وجه واضح',
  },
  {
    domain: 'language',
    age_range: '2-3',
    item_number: 11,
    skill_ar: 'يستخدم 10 كلمات أو أكثر',
    skill_en: 'Uses 10+ words',
    teaching_strategy_ar: 'وسّع على كلمات الطفل وأضف كلمات جديدة',
  },
  {
    domain: 'language',
    age_range: '2-3',
    item_number: 12,
    skill_ar: 'يجمع كلمتين معاً',
    skill_en: 'Combines two words',
    teaching_strategy_ar: 'نمذج جمل قصيرة: "أريد حليب"، "بابا راح"',
  },
  {
    domain: 'language',
    age_range: '2-3',
    item_number: 13,
    skill_ar: 'يشير لأجزاء جسمه عند الطلب',
    skill_en: 'Points to body parts on request',
    teaching_strategy_ar: 'العب لعبة "وين عينك؟ وين أنفك؟"',
  },
  {
    domain: 'language',
    age_range: '2-3',
    item_number: 14,
    skill_ar: 'يفهم أسئلة "ما هذا؟"',
    skill_en: 'Understands "what is this?" questions',
    teaching_strategy_ar: 'اسأل عن أشياء مألوفة خلال اللعب',
  },
  {
    domain: 'language',
    age_range: '2-3',
    item_number: 15,
    skill_ar: 'يستجيب لتعليمات من خطوتين',
    skill_en: 'Follows 2-step directions',
    teaching_strategy_ar: 'أعطِ تعليمات بسيطة: "خذ الكرة وضعها في السلة"',
  },
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  MAS — Motivation Assessment Scale (16 بند)                 ║
// ║  مقياس تقييم الدافعية السلوكية                              ║
// ╚══════════════════════════════════════════════════════════════╝

const MAS_ITEMS = [
  {
    item_number: 1,
    question_ar: 'هل يحدث السلوك بشكل مستمر وبطريقة متكررة عندما يكون الشخص بمفرده؟',
    function_category: 'sensory',
  },
  {
    item_number: 2,
    question_ar: 'هل يحدث السلوك بعد طلب أداء مهمة صعبة؟',
    function_category: 'escape',
  },
  {
    item_number: 3,
    question_ar: 'هل يحدث السلوك عندما تتحدث لشخص آخر في الغرفة؟',
    function_category: 'attention',
  },
  {
    item_number: 4,
    question_ar: 'هل يحدث السلوك عندما لا يحصل على لعبة أو طعام أو نشاط يريده؟',
    function_category: 'tangible',
  },
  {
    item_number: 5,
    question_ar: 'هل يستمر السلوك لفترة طويلة حتى لو لم يكن هناك أحد حوله؟',
    function_category: 'sensory',
  },
  {
    item_number: 6,
    question_ar: 'هل يحدث السلوك عند تقديم نشاط تعليمي/علاجي؟',
    function_category: 'escape',
  },
  {
    item_number: 7,
    question_ar: 'هل يحدث السلوك عندما تتوقف عن الانتباه لهذا الشخص؟',
    function_category: 'attention',
  },
  {
    item_number: 8,
    question_ar: 'هل يحدث السلوك عندما ينزع منه طعام أو لعبة مفضلة؟',
    function_category: 'tangible',
  },
  {
    item_number: 9,
    question_ar: 'هل يبدو أن الشخص يستمتع بالسلوك حتى لو لم يكن هناك أحد يراقبه؟',
    function_category: 'sensory',
  },
  {
    item_number: 10,
    question_ar: 'هل يتوقف السلوك عندما يتوقف المطلب أو يُزال؟',
    function_category: 'escape',
  },
  {
    item_number: 11,
    question_ar: 'هل يتوقف السلوك عندما تعطي الشخص انتباهاً (مثلاً: "لا تفعل ذلك")؟',
    function_category: 'attention',
  },
  {
    item_number: 12,
    question_ar: 'هل يتوقف السلوك عندما يحصل على الشيء الذي يريده؟',
    function_category: 'tangible',
  },
  {
    item_number: 13,
    question_ar: 'هل يحدث السلوك بنمط ثابت ومتكرر بطريقة تبدو كأنها تحفيز ذاتي؟',
    function_category: 'sensory',
  },
  {
    item_number: 14,
    question_ar: 'هل يحدث السلوك أثناء المهام الصعبة أو غير المرغوبة؟',
    function_category: 'escape',
  },
  {
    item_number: 15,
    question_ar: 'هل يبدو أن السلوك هو محاولة لجذب ردة فعل من الآخرين؟',
    function_category: 'attention',
  },
  {
    item_number: 16,
    question_ar: 'هل يبدو أن السلوك هو محاولة للحصول على شيء ملموس؟',
    function_category: 'tangible',
  },
];

// ╔══════════════════════════════════════════════════════════════╗
// ║  Transition Readiness — مهارات الجاهزية للانتقال              ║
// ╚══════════════════════════════════════════════════════════════╝

const TRANSITION_SKILLS = {
  self_care: [
    { skill_ar: 'يرتدي ملابسه باستقلالية' },
    { skill_ar: 'يستخدم المرحاض باستقلالية' },
    { skill_ar: 'يأكل ويشرب باستقلالية' },
    { skill_ar: 'يحافظ على نظافته الشخصية' },
    { skill_ar: 'يعتني بممتلكاته الشخصية' },
  ],
  communication: [
    { skill_ar: 'يعبر عن احتياجاته الأساسية لفظياً أو بوسيلة بديلة' },
    { skill_ar: 'يتبع التعليمات الجماعية' },
    { skill_ar: 'يطلب المساعدة عند الحاجة' },
    { skill_ar: 'يشارك في محادثة بسيطة' },
    { skill_ar: 'يفهم ويتبع جدولاً بصرياً' },
  ],
  social_skills: [
    { skill_ar: 'يتفاعل مع أقرانه بشكل مناسب' },
    { skill_ar: 'ينتظر دوره' },
    { skill_ar: 'يشارك المواد والألعاب' },
    { skill_ar: 'يحل خلافات بسيطة مع الأقران' },
    { skill_ar: 'يتبع القواعد الجماعية' },
  ],
  academic_cognitive: [
    { skill_ar: 'يجلس لمهمة أكاديمية 15 دقيقة على الأقل' },
    { skill_ar: 'يتبع تعليمات المعلم في مجموعة' },
    { skill_ar: 'يكمل مهمة باستقلالية' },
    { skill_ar: 'ينتقل بين الأنشطة بسلاسة' },
    { skill_ar: 'يعمل بشكل مستقل لمدة 10 دقائق' },
  ],
  behavioral: [
    { skill_ar: 'لا يظهر سلوكيات تخريبية في الفصل' },
    { skill_ar: 'يستجيب للتوجيه اللفظي' },
    { skill_ar: 'ينظم انفعالاته في المواقف الصعبة' },
    { skill_ar: 'يتحمل تغيير الروتين' },
    { skill_ar: 'يقبل التصحيح دون سلوك مشكل' },
  ],
  mobility_safety: [
    { skill_ar: 'يتنقل في البيئة الجديدة بأمان' },
    { skill_ar: 'يتعرف على مخارج الطوارئ' },
    { skill_ar: 'يعبر الشارع بأمان (بمساعدة إن لزم)' },
    { skill_ar: 'يستجيب لإنذار الحريق' },
  ],
  family_support: [
    { skill_ar: 'الأسرة مستعدة لدعم الانتقال' },
    { skill_ar: 'الأسرة مدربة على استراتيجيات الدعم' },
    { skill_ar: 'خطة تواصل بين الأسرة والجهة المنتقل إليها' },
    { skill_ar: 'الأسرة تدعم استقلالية الطفل' },
  ],
  environmental_readiness: [
    { skill_ar: 'البيئة المستقبلة مهيأة لاستقبال ذوي الإعاقة' },
    { skill_ar: 'الكوادر المستقبلة مدربة' },
    { skill_ar: 'التعديلات البيئية المطلوبة متوفرة' },
    { skill_ar: 'جدول دعم واضح في البيئة الجديدة' },
  ],
};

// ╔══════════════════════════════════════════════════════════════╗
// ║  Saudi Developmental Screening Milestones                    ║
// ╚══════════════════════════════════════════════════════════════╝

const SAUDI_MILESTONES = {
  gross_motor: [
    { age_band: '0-3m', milestone_ar: 'يرفع رأسه وهو على بطنه' },
    { age_band: '3-6m', milestone_ar: 'يتدحرج من بطنه لظهره' },
    { age_band: '6-9m', milestone_ar: 'يجلس بدون مساعدة' },
    { age_band: '9-12m', milestone_ar: 'يقف ممسكاً بالأثاث' },
    { age_band: '12-18m', milestone_ar: 'يمشي باستقلالية' },
    { age_band: '18-24m', milestone_ar: 'يركل الكرة' },
    { age_band: '24-36m', milestone_ar: 'يقفز بالقدمين معاً' },
    { age_band: '36-48m', milestone_ar: 'يصعد الدرج بالتناوب' },
    { age_band: '48-60m', milestone_ar: 'يقف على قدم واحدة 5 ثوانٍ' },
    { age_band: '60-72m', milestone_ar: 'يركب دراجة بعجلات مساعدة' },
  ],
  fine_motor: [
    { age_band: '0-3m', milestone_ar: 'يتبع الأشياء بعينيه' },
    { age_band: '3-6m', milestone_ar: 'يمسك الأشياء بيده ويفحصها' },
    { age_band: '6-9m', milestone_ar: 'ينقل الأشياء من يد لأخرى' },
    { age_band: '9-12m', milestone_ar: 'يستخدم الإبهام والسبابة لالتقاط أشياء صغيرة' },
    { age_band: '12-18m', milestone_ar: 'يخربش بالقلم' },
    { age_band: '18-24m', milestone_ar: 'يبني برجاً من 4 مكعبات' },
    { age_band: '24-36m', milestone_ar: 'يقص بالمقص' },
    { age_band: '36-48m', milestone_ar: 'يرسم خطوطاً ودوائر' },
    { age_band: '48-60m', milestone_ar: 'يرسم شخصاً من 3 أجزاء' },
    { age_band: '60-72m', milestone_ar: 'يكتب بعض الحروف' },
  ],
  language_communication: [
    { age_band: '0-3m', milestone_ar: 'يصدر أصوات مناغاة' },
    { age_band: '3-6m', milestone_ar: 'يضحك ويصدر أصواتاً متنوعة' },
    { age_band: '6-9m', milestone_ar: 'يصدر مقاطع صوتية (بابابا، مامام)' },
    { age_band: '9-12m', milestone_ar: 'يقول كلمته الأولى ذات المعنى' },
    { age_band: '12-18m', milestone_ar: 'يستخدم 3-5 كلمات ذات معنى' },
    { age_band: '18-24m', milestone_ar: 'يجمع كلمتين معاً' },
    { age_band: '24-36m', milestone_ar: 'يستخدم جمل من 3 كلمات' },
    { age_band: '36-48m', milestone_ar: 'يروي قصة بسيطة' },
    { age_band: '48-60m', milestone_ar: 'يستخدم جمل مكتملة ومفهومة' },
    { age_band: '60-72m', milestone_ar: 'يتحدث بطلاقة ويعبر عن أفكاره' },
  ],
  cognitive: [
    { age_band: '0-3m', milestone_ar: 'يتعرف على وجه الأم' },
    { age_band: '3-6m', milestone_ar: 'يبحث عن لعبة مخفية جزئياً' },
    { age_band: '6-9m', milestone_ar: 'يفهم ديمومة الأشياء' },
    { age_band: '9-12m', milestone_ar: 'يقلد الأفعال البسيطة' },
    { age_band: '12-18m', milestone_ar: 'يشير للصور في كتاب' },
    { age_band: '18-24m', milestone_ar: 'يطابق الأشياء المتشابهة' },
    { age_band: '24-36m', milestone_ar: 'يصنف الألوان والأشكال' },
    { age_band: '36-48m', milestone_ar: 'يعد حتى 10' },
    { age_band: '48-60m', milestone_ar: 'يفهم مفهوم الوقت (صباح/مساء)' },
    { age_band: '60-72m', milestone_ar: 'يتعرف على الحروف والأرقام' },
  ],
  social_emotional: [
    { age_band: '0-3m', milestone_ar: 'يبتسم اجتماعياً' },
    { age_band: '3-6m', milestone_ar: 'يضحك ويتفاعل مع اللعب' },
    { age_band: '6-9m', milestone_ar: 'يظهر قلق الغرباء' },
    { age_band: '9-12m', milestone_ar: 'يلوح ويقول "باي"' },
    { age_band: '12-18m', milestone_ar: 'يلعب بجانب أطفال آخرين' },
    { age_band: '18-24m', milestone_ar: 'يظهر العناد والاستقلالية' },
    { age_band: '24-36m', milestone_ar: 'يشارك في اللعب التخيلي' },
    { age_band: '36-48m', milestone_ar: 'يكوّن صداقات' },
    { age_band: '48-60m', milestone_ar: 'يفهم مشاعر الآخرين' },
    { age_band: '60-72m', milestone_ar: 'يتعاون في ألعاب جماعية ذات قواعد' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// SEEDER FUNCTION
// ═══════════════════════════════════════════════════════════════

async function seedClinicalScales(db) {
  const mongoose = db || require('mongoose');

  // Check if collection exists, skip if already seeded
  const collections = await mongoose.connection.db.listCollections().toArray();
  const existingNames = collections.map(c => c.name);

  if (existingNames.includes('clinical_scale_items')) {
    const count = await mongoose.connection.db.collection('clinical_scale_items').countDocuments();
    if (count > 0) {
      console.log(`[Seed] clinical_scale_items already has ${count} documents. Skipping.`);
      return;
    }
  }

  const ClinicalScaleItem =
    mongoose.models.ClinicalScaleItem ||
    mongoose.model(
      'ClinicalScaleItem',
      new mongoose.Schema(
        {
          scale_id: { type: String, required: true, index: true },
          scale_name_ar: String,
          scale_name_en: String,
          category: String,
          items: mongoose.Schema.Types.Mixed,
          metadata: mongoose.Schema.Types.Mixed,
        },
        { timestamps: true, collection: 'clinical_scale_items' }
      )
    );

  const seeds = [
    {
      scale_id: 'MCHAT_RF',
      scale_name_ar: 'قائمة التحقق المعدلة للتوحد (M-CHAT-R/F)',
      scale_name_en: 'M-CHAT-R/F',
      category: 'screening',
      items: MCHAT_ITEMS,
      metadata: {
        age_range: '16-30 months',
        items_count: 20,
        time_minutes: 5,
        respondent: 'parent',
      },
    },
    {
      scale_id: 'CARS2',
      scale_name_ar: 'مقياس تقييم التوحد في الطفولة (CARS-2)',
      scale_name_en: 'CARS-2',
      category: 'diagnostic',
      items: CARS2_ITEMS,
      metadata: {
        age_range: '2+ years',
        items_count: 15,
        time_minutes: 15,
        respondent: 'clinician',
      },
    },
    {
      scale_id: 'ZARIT_BURDEN',
      scale_name_ar: 'مقياس عبء مقدم الرعاية (زاريت)',
      scale_name_en: 'Zarit Burden Interview',
      category: 'family',
      items: ZARIT_ITEMS,
      metadata: { items_count: 22, time_minutes: 10, respondent: 'caregiver' },
    },
    {
      scale_id: 'FAMILY_NEEDS',
      scale_name_ar: 'استبيان احتياجات الأسرة',
      scale_name_en: 'Family Needs Survey',
      category: 'family',
      items: FAMILY_NEEDS_ITEMS,
      metadata: { domains: 6, items_count: 35, time_minutes: 15, respondent: 'parent' },
    },
    {
      scale_id: 'QOL_DISABILITY',
      scale_name_ar: 'مقياس جودة الحياة (WHOQOL-BREF معدل)',
      scale_name_en: 'Quality of Life (WHOQOL-BREF adapted)',
      category: 'outcome',
      items: QOL_ITEMS,
      metadata: { domains: 5, items_count: 30, time_minutes: 10, respondent: 'parent/self' },
    },
    {
      scale_id: 'PORTAGE_LANGUAGE',
      scale_name_ar: 'دليل بورتاج — مجال اللغة (عينة)',
      scale_name_en: 'Portage Guide — Language Sample',
      category: 'developmental',
      items: PORTAGE_LANGUAGE_SAMPLE,
      metadata: { age_range: '0-3 years', domain: 'language', items_count: 15 },
    },
    {
      scale_id: 'MAS',
      scale_name_ar: 'مقياس تقييم الدافعية (MAS)',
      scale_name_en: 'Motivation Assessment Scale',
      category: 'behavioral',
      items: MAS_ITEMS,
      metadata: {
        items_count: 16,
        time_minutes: 10,
        respondent: 'therapist/parent',
        functions: ['sensory', 'escape', 'attention', 'tangible'],
      },
    },
    {
      scale_id: 'TRANSITION_READINESS',
      scale_name_ar: 'مقياس الجاهزية للانتقال',
      scale_name_en: 'Transition Readiness Assessment',
      category: 'transition',
      items: TRANSITION_SKILLS,
      metadata: { domains: 8, respondent: 'team' },
    },
    {
      scale_id: 'SAUDI_DEVELOPMENTAL',
      scale_name_ar: 'الفحص النمائي السعودي',
      scale_name_en: 'Saudi Developmental Screening',
      category: 'screening',
      items: SAUDI_MILESTONES,
      metadata: { age_range: '0-6 years', domains: 5, culturally_adapted: true },
    },
  ];

  await ClinicalScaleItem.insertMany(seeds);
  console.log(`[Seed] ✅ Inserted ${seeds.length} clinical scale definitions with real items`);
}

module.exports = {
  seedClinicalScales,
  MCHAT_ITEMS,
  CARS2_ITEMS,
  ZARIT_ITEMS,
  FAMILY_NEEDS_ITEMS,
  QOL_ITEMS,
  PORTAGE_LANGUAGE_SAMPLE,
  MAS_ITEMS,
  TRANSITION_SKILLS,
  SAUDI_MILESTONES,
};
