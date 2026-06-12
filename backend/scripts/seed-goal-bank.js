#!/usr/bin/env node
/**
 * seed-goal-bank.js — bootstrap the standardized goal library (W1223).
 *
 * Blueprint-43 §7.2 (مكتبة أهداف معيارية) + the R4 pathway-bundles data
 * prerequisite: `pathwayBundle.service.suggestForBeneficiary` resolves goal
 * templates from the GoalBank collection — which ships EMPTY, so every
 * suggestion shows "لا أهداف مطابقة" until a clinician hand-enters a library.
 * This seeder loads a curated bilingual starter catalog (72 SMART goals across
 * the 6 GoalBank domains × age bands — W1246 added LIFE_SKILLS + deepened all
 * five original domains) so the bundles flow is plug-and-play.
 * Clinicians refine/extend via the existing /api/goal-bank CRUD.
 *
 * Idempotent: an item is keyed by (domain, category, description) — re-runs
 * skip existing rows. Starter rows carry tags:['starter-catalog','w1223'] so
 * they can be listed/reset as a group without touching hand-entered goals.
 *
 * Usage:
 *   node scripts/seed-goal-bank.js                 seed (skip existing)
 *   node scripts/seed-goal-bank.js --dry-run       preview, no DB write
 *   node scripts/seed-goal-bank.js --list          print catalog + exit
 *   node scripts/seed-goal-bank.js --reset         delete ONLY starter-catalog rows, then seed
 *   node scripts/seed-goal-bank.js --json          machine-readable output
 *
 * Env: MONGODB_URI (required unless --dry-run / --list)
 */

'use strict';

const args = process.argv.slice(2);
const flag = name => args.includes(name);

const DRY_RUN = flag('--dry-run');
const LIST = flag('--list');
const RESET = flag('--reset');
const JSON_OUT = flag('--json');

if (flag('--help') || flag('-h')) {
  console.log('seed-goal-bank.js [--dry-run|--list|--reset|--json]');
  process.exit(0);
}

const STARTER_TAGS = ['starter-catalog', 'w1223'];

/**
 * 72 starter SMART goals (W1223 base + W1246 expansion). Fields mirror
 * models/GoalBank.js exactly:
 * domain ∈ SPEECH|OCCUPATIONAL|PHYSICAL|BEHAVIORAL|SPECIAL_EDU|LIFE_SKILLS,
 * category (English key the routes filter on), description (Arabic SMART
 * text), targetAgeMin/Max (years), difficulty, measurementCriteria.
 */
const CATALOG = [
  // ── SPEECH (نطق ولغة وتواصل) ────────────────────────────────────────────
  {
    domain: 'SPEECH',
    category: 'Requesting',
    targetAgeMin: 2,
    targetAgeMax: 6,
    difficulty: 'BEGINNER',
    description:
      'يطلب الطفل غرضاً مفضلاً باستخدام كلمة واحدة واضحة (أو رمز/إشارة بديلة) في 4 من 5 فرص منظمة عبر 3 جلسات متتالية',
    measurementCriteria: '4 من 5 فرص × 3 جلسات',
  },
  {
    domain: 'SPEECH',
    category: 'Vocabulary',
    targetAgeMin: 2,
    targetAgeMax: 7,
    difficulty: 'BEGINNER',
    description: 'يسمّي 20 صورة مألوفة (أغراض البيت، طعام، حيوانات) بدقة 80% دون نموذج لفظي مسبق',
    measurementCriteria: '16 من 20 صورة دون نموذج',
  },
  {
    domain: 'SPEECH',
    category: 'Articulation',
    targetAgeMin: 4,
    targetAgeMax: 9,
    difficulty: 'INTERMEDIATE',
    description:
      'ينطق الصوت المستهدف في بداية الكلمة بدقة 80% على مستوى الكلمة المفردة في 3 جلسات متتالية',
    measurementCriteria: 'دقة 80% × 3 جلسات',
  },
  {
    domain: 'SPEECH',
    category: 'Sentence Building',
    targetAgeMin: 3,
    targetAgeMax: 8,
    difficulty: 'INTERMEDIATE',
    description: 'يكوّن جملة من 3-4 كلمات للتعبير عن حاجة أو وصف صورة في 8 من 10 محاولات',
    measurementCriteria: '8 من 10 محاولات',
  },
  {
    domain: 'SPEECH',
    category: 'Following Directions',
    targetAgeMin: 2,
    targetAgeMax: 6,
    difficulty: 'BEGINNER',
    description:
      'ينفّذ تعليمات لفظية من خطوتين غير مترابطتين (مثل: هات الكوب وافتح الباب) في 4 من 5 محاولات',
    measurementCriteria: '4 من 5 تعليمات ثنائية الخطوة',
  },
  {
    domain: 'SPEECH',
    category: 'Social Communication',
    targetAgeMin: 4,
    targetAgeMax: 10,
    difficulty: 'INTERMEDIATE',
    description:
      'يبادر بتبادل تحية مناسبة ويجيب على سؤالين اجتماعيين بسيطين في 4 من 5 مواقف تفاعلية',
    measurementCriteria: '4 من 5 مواقف',
  },
  {
    domain: 'SPEECH',
    category: 'AAC Use',
    targetAgeMin: 3,
    targetAgeMax: 12,
    difficulty: 'INTERMEDIATE',
    description:
      'يستخدم جهاز/لوحة التواصل البديل لتكوين رسالة من رمزين (فعل + غرض) في 70% من الفرص اليومية المرصودة',
    measurementCriteria: '70% من الفرص عبر أسبوع',
  },
  {
    domain: 'SPEECH',
    category: 'Fluency',
    targetAgeMin: 6,
    targetAgeMax: 14,
    difficulty: 'ADVANCED',
    description:
      'يطبّق تقنية البداية السهلة عند القراءة الجهرية لفقرة قصيرة بنسبة تلعثم أقل من 5% في 3 جلسات',
    measurementCriteria: 'تلعثم <5% × 3 جلسات',
  },
  {
    domain: 'SPEECH',
    category: 'WH Questions',
    targetAgeMin: 3,
    targetAgeMax: 8,
    difficulty: 'BEGINNER',
    description:
      'يجيب على أسئلة (من؟ ماذا؟ أين؟) حول صورة أو قصة قصيرة بإجابة صحيحة في 8 من 10 محاولات',
    measurementCriteria: '8 من 10 إجابات صحيحة',
  },
  {
    domain: 'SPEECH',
    category: 'Phonological Awareness',
    targetAgeMin: 4,
    targetAgeMax: 9,
    difficulty: 'INTERMEDIATE',
    description:
      'يحدّد الصوت الأول في كلمات مسموعة مألوفة ويصنّف الصور حسب صوتها الأول بدقة 80% في 3 جلسات متتالية',
    measurementCriteria: 'دقة 80% × 3 جلسات',
  },
  {
    domain: 'SPEECH',
    category: 'Narrative Skills',
    targetAgeMin: 5,
    targetAgeMax: 12,
    difficulty: 'ADVANCED',
    description:
      'يعيد سرد قصة قصيرة مسموعة متضمناً الشخصية والمشكلة والحل بترتيب صحيح في 4 من 5 محاولات',
    measurementCriteria: '4 من 5 سردات مكتملة العناصر',
  },
  {
    domain: 'SPEECH',
    category: 'Grammar Morphology',
    targetAgeMin: 4,
    targetAgeMax: 10,
    difficulty: 'INTERMEDIATE',
    description:
      'يستخدم صيغ الجمع والضمائر المتصلة الشائعة بشكل صحيح أثناء وصف الصور في 80% من الفرص المنظمة عبر جلستين',
    measurementCriteria: '80% من الفرص × جلستين',
  },
  {
    domain: 'SPEECH',
    category: 'Conversation Repair',
    targetAgeMin: 6,
    targetAgeMax: 14,
    difficulty: 'ADVANCED',
    description:
      'يطلب التوضيح بطريقة مناسبة (ماذا تقصد؟ / أعد من فضلك) عند عدم فهم الرسالة في 4 من 5 مواقف محاكاة',
    measurementCriteria: '4 من 5 مواقف',
  },

  // ── OCCUPATIONAL (وظيفي — مهارات دقيقة وعناية ذاتية وحسية) ──────────────
  {
    domain: 'OCCUPATIONAL',
    category: 'Fine Motor',
    targetAgeMin: 2,
    targetAgeMax: 6,
    difficulty: 'BEGINNER',
    description:
      'يلتقط أغراضاً صغيرة بقبضة الإصبعين (الإبهام والسبابة) ويضعها في وعاء، 8 من 10 محاولات',
    measurementCriteria: '8 من 10 التقاطات صحيحة',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'Pre-Writing',
    targetAgeMin: 3,
    targetAgeMax: 7,
    difficulty: 'BEGINNER',
    description: 'ينسخ الأشكال التحضيرية للكتابة (خط عمودي، أفقي، دائرة) بوضوح في 4 من 5 محاولات',
    measurementCriteria: '4 من 5 أشكال مقروءة',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'Handwriting',
    targetAgeMin: 5,
    targetAgeMax: 10,
    difficulty: 'INTERMEDIATE',
    description:
      'يكتب اسمه الأول بحروف مقروءة وبمسكة قلم وظيفية دون مساعدة جسدية في 3 جلسات متتالية',
    measurementCriteria: 'اسم مقروء × 3 جلسات',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'Self-Care Feeding',
    targetAgeMin: 2,
    targetAgeMax: 8,
    difficulty: 'BEGINNER',
    description:
      'يستخدم الملعقة لتناول وجبة كاملة بسكب لا يتجاوز مرتين وبدون مساعدة جسدية، في 4 من 5 وجبات',
    measurementCriteria: '4 من 5 وجبات مستقلة',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'Self-Care Dressing',
    targetAgeMin: 3,
    targetAgeMax: 9,
    difficulty: 'INTERMEDIATE',
    description: 'يلبس قميصاً ذا أزرار كبيرة ويغلق 3 أزرار باستقلالية في 4 من 5 محاولات',
    measurementCriteria: '4 من 5 محاولات مستقلة',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'Sensory Regulation',
    targetAgeMin: 3,
    targetAgeMax: 12,
    difficulty: 'INTERMEDIATE',
    description:
      'يستخدم استراتيجية تنظيم حسي متفق عليها (ركن الهدوء/أداة ضغط) عند الإشارة إليها، في 70% من مواقف الإثارة المرصودة',
    measurementCriteria: '70% من المواقف عبر أسبوعين',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'Bilateral Coordination',
    targetAgeMin: 3,
    targetAgeMax: 8,
    difficulty: 'INTERMEDIATE',
    description:
      'يقصّ على خط مستقيم بطول 10 سم مستخدماً المقص بيد والورقة بالأخرى، في 4 من 5 محاولات',
    measurementCriteria: '4 من 5 قصّات ضمن 5مم من الخط',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'Visual Motor Integration',
    targetAgeMin: 4,
    targetAgeMax: 9,
    difficulty: 'INTERMEDIATE',
    description:
      'ينسخ أشكالاً هندسية مركبة (مربع، مثلث، تقاطع) ضمن الحدود المقبولة للنموذج في 4 من 5 محاولات',
    measurementCriteria: '4 من 5 أشكال صحيحة',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'Scissor Skills Advanced',
    targetAgeMin: 4,
    targetAgeMax: 9,
    difficulty: 'INTERMEDIATE',
    description: 'يقصّ على خط منحنٍ وعلى محيط دائرة قطرها 10 سم ملتزماً بالخط في 4 من 5 محاولات',
    measurementCriteria: '4 من 5 قصّات ملتزمة بالخط',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'Keyboard & Tablet Use',
    targetAgeMin: 6,
    targetAgeMax: 14,
    difficulty: 'INTERMEDIATE',
    description:
      'يكتب جملة قصيرة على لوحة المفاتيح أو الجهاز اللوحي خلال دقيقتين بدقة 80% في 3 جلسات متتالية',
    measurementCriteria: 'دقة 80% خلال دقيقتين × 3 جلسات',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'Utensil Use Knife',
    targetAgeMin: 6,
    targetAgeMax: 14,
    difficulty: 'INTERMEDIATE',
    description:
      'يستخدم السكين غير الحادة لدهن وتقطيع طعام لين بإشراف لفظي فقط في 4 من 5 وجبات تدريبية',
    measurementCriteria: '4 من 5 وجبات بإشراف لفظي فقط',
  },
  {
    domain: 'OCCUPATIONAL',
    category: 'School Tools Organization',
    targetAgeMin: 6,
    targetAgeMax: 12,
    difficulty: 'BEGINNER',
    description:
      'يجهّز أدواته المدرسية للنشاط ويعيدها إلى مكانها باتباع قائمة مصورة في 80% من الجلسات عبر أسبوعين',
    measurementCriteria: '80% من الجلسات × أسبوعين',
  },

  // ── PHYSICAL (حركي كبير) ─────────────────────────────────────────────────
  {
    domain: 'PHYSICAL',
    category: 'Gross Motor Balance',
    targetAgeMin: 2,
    targetAgeMax: 7,
    difficulty: 'BEGINNER',
    description: 'يقف على قدم واحدة لمدة 5 ثوانٍ دون سند في 3 من 4 محاولات',
    measurementCriteria: '5 ثوانٍ × 3 من 4',
  },
  {
    domain: 'PHYSICAL',
    category: 'Ambulation',
    targetAgeMin: 1,
    targetAgeMax: 6,
    difficulty: 'BEGINNER',
    description:
      'يمشي مسافة 10 أمتار باستقلالية (أو بالمعين الحركي الموصوف) دون سقوط في 4 من 5 محاولات',
    measurementCriteria: '10م × 4 من 5',
  },
  {
    domain: 'PHYSICAL',
    category: 'Stairs',
    targetAgeMin: 2,
    targetAgeMax: 8,
    difficulty: 'INTERMEDIATE',
    description: 'يصعد وينزل 4 درجات بقدمين متبادلتين ممسكاً بالدرابزين في 4 من 5 محاولات',
    measurementCriteria: '4 درجات صعوداً ونزولاً × 4 من 5',
  },
  {
    domain: 'PHYSICAL',
    category: 'Ball Skills',
    targetAgeMin: 3,
    targetAgeMax: 9,
    difficulty: 'BEGINNER',
    description: 'يلتقط كرة متوسطة مرمية من مسافة مترين بكلتا اليدين في 6 من 10 محاولات',
    measurementCriteria: '6 من 10 التقاطات',
  },
  {
    domain: 'PHYSICAL',
    category: 'Postural Control',
    targetAgeMin: 1,
    targetAgeMax: 10,
    difficulty: 'INTERMEDIATE',
    description:
      'يحافظ على جلسة منتصبة على مقعد دون سند خلفي لمدة 10 دقائق أثناء نشاط طاولة، في 3 جلسات متتالية',
    measurementCriteria: '10 دقائق × 3 جلسات',
  },
  {
    domain: 'PHYSICAL',
    category: 'Transfers',
    targetAgeMin: 3,
    targetAgeMax: 14,
    difficulty: 'INTERMEDIATE',
    description:
      'ينتقل من الكرسي المتحرك إلى مقعد الدراسة وبالعكس بإشراف لفظي فقط (دون مساعدة جسدية) في 4 من 5 انتقالات',
    measurementCriteria: '4 من 5 انتقالات بأمان',
  },
  {
    domain: 'PHYSICAL',
    category: 'Endurance',
    targetAgeMin: 5,
    targetAgeMax: 14,
    difficulty: 'ADVANCED',
    description:
      'يشارك في نشاط حركي متواصل (مشي سريع/دراجة ثابتة) لمدة 15 دقيقة دون طلب توقف، مرتين أسبوعياً لمدة 3 أسابيع',
    measurementCriteria: '15 دقيقة × مرتين أسبوعياً × 3 أسابيع',
  },
  {
    domain: 'PHYSICAL',
    category: 'Jumping',
    targetAgeMin: 3,
    targetAgeMax: 8,
    difficulty: 'BEGINNER',
    description:
      'يقفز بالقدمين معاً للأمام مسافة 30 سم مع هبوط متزن دون فقدان التوازن في 4 من 5 محاولات',
    measurementCriteria: '4 من 5 قفزات متزنة',
  },
  {
    domain: 'PHYSICAL',
    category: 'Running Coordination',
    targetAgeMin: 4,
    targetAgeMax: 10,
    difficulty: 'INTERMEDIATE',
    description: 'يجري مسافة 20 متراً بنمط متناسق مع تفادي عوائق بسيطة دون سقوط في 4 من 5 محاولات',
    measurementCriteria: '20م مع تفادي عوائق × 4 من 5',
  },
  {
    domain: 'PHYSICAL',
    category: 'Wheelchair Mobility',
    targetAgeMin: 4,
    targetAgeMax: 16,
    difficulty: 'INTERMEDIATE',
    description:
      'يدفع كرسيه المتحرك مسافة 20 متراً متضمنة منعطفاً وعبور بوابة باستقلالية وأمان في 4 من 5 محاولات',
    measurementCriteria: '20م بمنعطف وبوابة × 4 من 5',
  },
  {
    domain: 'PHYSICAL',
    category: 'Core Strength',
    targetAgeMin: 3,
    targetAgeMax: 12,
    difficulty: 'BEGINNER',
    description:
      'يحافظ على وضعية الجلوس المنتصب على كرة العلاج مع رفع الذراعين جانباً لمدة 30 ثانية في 3 من 4 محاولات',
    measurementCriteria: '30 ثانية × 3 من 4',
  },
  {
    domain: 'PHYSICAL',
    category: 'Motor Planning',
    targetAgeMin: 4,
    targetAgeMax: 12,
    difficulty: 'INTERMEDIATE',
    description:
      'ينفّذ مساراً حركياً من 4 محطات (زحف، تخطٍّ، توازن، رمي) بالترتيب الصحيح دون نموذج في 3 من 4 محاولات',
    measurementCriteria: '4 محطات بالترتيب × 3 من 4',
  },

  // ── BEHAVIORAL (سلوكي واجتماعي) ─────────────────────────────────────────
  {
    domain: 'BEHAVIORAL',
    category: 'Attending',
    targetAgeMin: 2,
    targetAgeMax: 8,
    difficulty: 'BEGINNER',
    description:
      'يجلس ويشارك في نشاط طاولة موجَّه لمدة 10 دقائق بما لا يزيد عن تنبيهين لفظيين، في 4 من 5 جلسات',
    measurementCriteria: '10 دقائق بتنبيهين كحد أقصى × 4 من 5',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Transitions',
    targetAgeMin: 2,
    targetAgeMax: 9,
    difficulty: 'BEGINNER',
    description:
      'ينتقل بين نشاطين باستخدام جدول مصوّر دون سلوك اعتراضي في 80% من الانتقالات اليومية المرصودة',
    measurementCriteria: '80% من الانتقالات عبر أسبوع',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Requesting Break',
    targetAgeMin: 3,
    targetAgeMax: 12,
    difficulty: 'INTERMEDIATE',
    description:
      'يطلب استراحة بطريقة مقبولة (بطاقة/كلمة) بدلاً من السلوك الانسحابي في 4 من 5 مواقف ضغط مرصودة',
    measurementCriteria: '4 من 5 مواقف',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Turn Taking',
    targetAgeMin: 3,
    targetAgeMax: 9,
    difficulty: 'BEGINNER',
    description: 'يتبادل الأدوار في لعبة منظمة مع قرين واحد لثلاث جولات دون مقاطعة، في 4 من 5 فرص',
    measurementCriteria: '3 جولات × 4 من 5 فرص',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Emotional Regulation',
    targetAgeMin: 4,
    targetAgeMax: 12,
    difficulty: 'INTERMEDIATE',
    description:
      'يسمّي مشاعره (غاضب/حزين/متضايق) ويختار استراتيجية تهدئة من لوحة الخيارات في 70% من المواقف الانفعالية المرصودة',
    measurementCriteria: '70% من المواقف عبر أسبوعين',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Compliance',
    targetAgeMin: 2,
    targetAgeMax: 10,
    difficulty: 'BEGINNER',
    description: 'يستجيب لتعليمة توقف/انتظار خلال 5 ثوانٍ دون تكرار التعليمة في 8 من 10 فرص',
    measurementCriteria: '8 من 10 استجابات خلال 5 ثوانٍ',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Reducing Interfering Behavior',
    targetAgeMin: 3,
    targetAgeMax: 14,
    difficulty: 'ADVANCED',
    description:
      'ينخفض معدل السلوك المستهدف (المحدد في الخطة السلوكية) بنسبة 50% عن خط الأساس عبر أسبوعين متتاليين من القياس اليومي',
    measurementCriteria: 'انخفاض 50% عن خط الأساس × أسبوعين',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Waiting',
    targetAgeMin: 3,
    targetAgeMax: 10,
    difficulty: 'BEGINNER',
    description:
      'ينتظر دوره أو الغرض المطلوب لمدة دقيقتين باستخدام أداة انتظار مرئية دون سلوك اعتراضي في 4 من 5 فرص',
    measurementCriteria: 'دقيقتان × 4 من 5 فرص',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Flexibility',
    targetAgeMin: 4,
    targetAgeMax: 12,
    difficulty: 'INTERMEDIATE',
    description:
      'يتقبّل تغييراً مفاجئاً في الجدول بعد تنبيه مسبق دون نوبة انفعالية في 70% من المواقف المرصودة عبر أسبوعين',
    measurementCriteria: '70% من المواقف × أسبوعين',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Peer Initiation',
    targetAgeMin: 4,
    targetAgeMax: 12,
    difficulty: 'INTERMEDIATE',
    description:
      'يبادر بدعوة قرين للعب مستخدماً عبارة أو بطاقة مناسبة مرة واحدة على الأقل في كل فترة لعب حر عبر أسبوع',
    measurementCriteria: 'مبادرة واحدة لكل فترة لعب × أسبوع',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Self-Monitoring',
    targetAgeMin: 7,
    targetAgeMax: 16,
    difficulty: 'ADVANCED',
    description:
      'يقيّم سلوكه ذاتياً على بطاقة نقاط بعد كل حصة بحيث تتطابق تقييماته مع تقييم المعلم في 80% من الحصص عبر أسبوعين',
    measurementCriteria: 'تطابق 80% × أسبوعين',
  },
  {
    domain: 'BEHAVIORAL',
    category: 'Accepting Feedback',
    targetAgeMin: 6,
    targetAgeMax: 14,
    difficulty: 'INTERMEDIATE',
    description:
      'يستجيب للتصحيح أو التوجيه بتعديل سلوكه دون جدال أو انسحاب في 4 من 5 مواقف تعليمية مرصودة',
    measurementCriteria: '4 من 5 مواقف',
  },

  // ── SPECIAL_EDU (تربية خاصة وأكاديمي ومهارات حياتية) ────────────────────
  {
    domain: 'SPECIAL_EDU',
    category: 'Pre-Academic Matching',
    targetAgeMin: 2,
    targetAgeMax: 6,
    difficulty: 'BEGINNER',
    description: 'يطابق 10 أزواج من الصور/الأشكال المتماثلة باستقلالية في 4 من 5 محاولات',
    measurementCriteria: '10 أزواج × 4 من 5',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Letter Recognition',
    targetAgeMin: 4,
    targetAgeMax: 9,
    difficulty: 'BEGINNER',
    description: 'يتعرّف على 14 حرفاً عربياً (يسمّيها أو يشير إليها عند سماعها) بدقة 80%',
    measurementCriteria: '14 حرفاً بدقة 80%',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Number Concepts',
    targetAgeMin: 4,
    targetAgeMax: 9,
    difficulty: 'BEGINNER',
    description:
      'يعدّ مجموعة أغراض حتى 10 بمطابقة واحد-لواحد ويعطي الكمية المطلوبة في 8 من 10 محاولات',
    measurementCriteria: '8 من 10 محاولات',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Reading Comprehension',
    targetAgeMin: 7,
    targetAgeMax: 14,
    difficulty: 'INTERMEDIATE',
    description: 'يقرأ فقرة من 3 جمل ويجيب على سؤالين مباشرين (من؟ ماذا؟) بدقة 80% في 3 جلسات',
    measurementCriteria: 'سؤالان × دقة 80% × 3 جلسات',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Functional Money',
    targetAgeMin: 8,
    targetAgeMax: 16,
    difficulty: 'INTERMEDIATE',
    description:
      'يتعرّف على فئات العملة الشائعة ويجمع مبلغاً بسيطاً لشراء غرض محدد في 4 من 5 تدريبات محاكاة',
    measurementCriteria: '4 من 5 عمليات شراء محاكاة',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Time & Schedule',
    targetAgeMin: 6,
    targetAgeMax: 14,
    difficulty: 'INTERMEDIATE',
    description:
      'يتبع جدوله اليومي المصوّر وينتقل للنشاط الصحيح في موعده باستقلالية في 80% من الفرص عبر أسبوع',
    measurementCriteria: '80% من الفرص عبر أسبوع',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Community Safety',
    targetAgeMin: 6,
    targetAgeMax: 16,
    difficulty: 'ADVANCED',
    description:
      'يتوقف عند الرصيف وينظر للجانبين ويعبر عند الإشارة بإشراف لفظي فقط في 4 من 5 تدريبات ميدانية',
    measurementCriteria: '4 من 5 عبور آمن',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Vocational Readiness',
    targetAgeMin: 12,
    targetAgeMax: 18,
    difficulty: 'ADVANCED',
    description:
      'ينجز مهمة عمل من 3 خطوات (فرز/تغليف/ترتيب) باستقلالية ولمدة 20 دقيقة متواصلة في 3 جلسات تدريب مهني',
    measurementCriteria: '3 خطوات × 20 دقيقة × 3 جلسات',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Phonics Decoding',
    targetAgeMin: 6,
    targetAgeMax: 12,
    difficulty: 'INTERMEDIATE',
    description:
      'يقرأ كلمات من ثلاثة أحرف بحركات قصيرة عن طريق الدمج الصوتي بدقة 80% في 3 جلسات متتالية',
    measurementCriteria: 'دقة 80% × 3 جلسات',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Addition Skills',
    targetAgeMin: 6,
    targetAgeMax: 12,
    difficulty: 'INTERMEDIATE',
    description:
      'يحل 10 مسائل جمع ضمن العدد 20 باستخدام المعينات البصرية عند الحاجة بدقة 80% في 3 جلسات',
    measurementCriteria: '8 من 10 مسائل × 3 جلسات',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Sentence Writing',
    targetAgeMin: 7,
    targetAgeMax: 14,
    difficulty: 'ADVANCED',
    description:
      'يكتب جملة مكتملة من 4 كلمات على الأقل تصف صورة معروضة ببنية لغوية صحيحة في 4 من 5 محاولات',
    measurementCriteria: '4 من 5 جمل مكتملة',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Classroom Routines',
    targetAgeMin: 4,
    targetAgeMax: 10,
    difficulty: 'BEGINNER',
    description:
      'يتبع روتين الصف (الجلوس، إخراج الأدوات، رفع اليد) عند الإشارة الجماعية دون تنبيه فردي في 80% من الحصص عبر أسبوع',
    measurementCriteria: '80% من الحصص × أسبوع',
  },
  {
    domain: 'SPECIAL_EDU',
    category: 'Task Completion',
    targetAgeMin: 5,
    targetAgeMax: 12,
    difficulty: 'BEGINNER',
    description:
      'ينهي مهمة أكاديمية مناسبة لمستواه خلال الوقت المحدد مع طلب المساعدة بطريقة مناسبة عند الحاجة في 4 من 5 مهام',
    measurementCriteria: '4 من 5 مهام منجزة',
  },

  // ── LIFE_SKILLS (مهارات حياتية واستقلالية يومية) ─────────────────────────
  {
    domain: 'LIFE_SKILLS',
    category: 'Hand Washing',
    targetAgeMin: 3,
    targetAgeMax: 9,
    difficulty: 'BEGINNER',
    description:
      'يغسل يديه متبعاً الخطوات الخمس (بلل، صابون، فرك 20 ثانية، شطف، تجفيف) باستقلالية في 4 من 5 مرات مرصودة',
    measurementCriteria: '4 من 5 مرات مستقلة',
  },
  {
    domain: 'LIFE_SKILLS',
    category: 'Toileting',
    targetAgeMin: 3,
    targetAgeMax: 10,
    difficulty: 'BEGINNER',
    description:
      'يستخدم دورة المياه بسلسلة كاملة (دخول، قضاء حاجة، تنظيف، غسل يدين) بمساعدة لفظية لا تتجاوز تنبيهاً واحداً في 80% من المرات عبر أسبوعين',
    measurementCriteria: '80% من المرات × أسبوعين',
  },
  {
    domain: 'LIFE_SKILLS',
    category: 'Toothbrushing',
    targetAgeMin: 4,
    targetAgeMax: 12,
    difficulty: 'BEGINNER',
    description:
      'ينظف أسنانه بالفرشاة شاملاً الأسطح الأمامية والخلفية لمدة دقيقتين باستخدام مؤقت بصري في 4 من 5 مرات',
    measurementCriteria: 'دقيقتان × 4 من 5 مرات',
  },
  {
    domain: 'LIFE_SKILLS',
    category: 'Meal Preparation',
    targetAgeMin: 8,
    targetAgeMax: 18,
    difficulty: 'INTERMEDIATE',
    description:
      'يجهّز وجبة خفيفة باردة من 3 خطوات (مثل ساندويتش) متبعاً بطاقات الخطوات المصورة وبأمان في 4 من 5 تدريبات',
    measurementCriteria: '4 من 5 تدريبات آمنة',
  },
  {
    domain: 'LIFE_SKILLS',
    category: 'Household Chores',
    targetAgeMin: 6,
    targetAgeMax: 16,
    difficulty: 'BEGINNER',
    description:
      'ينجز مهمتين منزليتين يوميتين (ترتيب السرير، وضع الملابس في السلة) باستقلالية عبر 5 أيام متتالية',
    measurementCriteria: 'مهمتان يومياً × 5 أيام',
  },
  {
    domain: 'LIFE_SKILLS',
    category: 'Shopping Skills',
    targetAgeMin: 10,
    targetAgeMax: 18,
    difficulty: 'INTERMEDIATE',
    description:
      'يختار 3 أصناف من قائمة مصورة ويدفع المبلغ ويستلم الباقي في متجر حقيقي بإشراف لفظي فقط في 3 من 4 رحلات تدريبية',
    measurementCriteria: '3 من 4 رحلات شراء',
  },
  {
    domain: 'LIFE_SKILLS',
    category: 'Personal Safety',
    targetAgeMin: 5,
    targetAgeMax: 14,
    difficulty: 'INTERMEDIATE',
    description:
      'يذكر اسمه الكامل واسم ولي أمره ورقم هاتف للطوارئ عند سؤاله في 5 من 5 محاولات عبر 3 جلسات',
    measurementCriteria: '5 من 5 × 3 جلسات',
  },
  {
    domain: 'LIFE_SKILLS',
    category: 'Using Phone for Help',
    targetAgeMin: 7,
    targetAgeMax: 16,
    difficulty: 'INTERMEDIATE',
    description:
      'يجري اتصالاً هاتفياً تدريبياً بجهة محددة ويوصل رسالة من جملتين بوضوح في 4 من 5 محاكاة',
    measurementCriteria: '4 من 5 محاكاة ناجحة',
  },
  {
    domain: 'LIFE_SKILLS',
    category: 'Public Transport',
    targetAgeMin: 12,
    targetAgeMax: 18,
    difficulty: 'ADVANCED',
    description:
      'يستقل وسيلة نقل متفق عليها بمرافقة ثم بإشراف عن بعد ملتزماً بقواعد السلامة في 3 رحلات تدريبية متتالية',
    measurementCriteria: '3 رحلات آمنة متتالية',
  },
  {
    domain: 'LIFE_SKILLS',
    category: 'Laundry',
    targetAgeMin: 10,
    targetAgeMax: 18,
    difficulty: 'ADVANCED',
    description:
      'يفرز الملابس حسب اللون ويشغّل الغسالة على البرنامج المحدد باتباع قائمة مصورة في 3 من 4 تدريبات',
    measurementCriteria: '3 من 4 تدريبات مستقلة',
  },
];

function printCatalog(asJson) {
  if (asJson) {
    console.log(JSON.stringify({ count: CATALOG.length, items: CATALOG }, null, 2));
    return;
  }
  const byDomain = {};
  for (const g of CATALOG) (byDomain[g.domain] = byDomain[g.domain] || []).push(g);
  for (const [d, items] of Object.entries(byDomain)) {
    console.log(`\n${d} (${items.length})`);
    for (const g of items)
      console.log(
        `  [${g.targetAgeMin}-${g.targetAgeMax}y ${g.difficulty}] ${g.category}: ${g.description.slice(0, 70)}…`
      );
  }
  console.log(`\nTotal: ${CATALOG.length} starter goals`);
}

async function main() {
  if (LIST) {
    printCatalog(JSON_OUT);
    process.exit(0);
  }
  await (async () => {
    const out = {
      dryRun: DRY_RUN,
      reset: RESET,
      total: CATALOG.length,
      inserted: 0,
      skipped: 0,
      deleted: 0,
    };

    if (DRY_RUN) {
      out.inserted = CATALOG.length;
      if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
      else
        console.log(
          `[dry-run] would seed up to ${CATALOG.length} starter goals (existing rows are skipped on a real run).`
        );
      process.exit(0);
    }

    // W1225 — load backend/.env like the app does, so `npm run seed:goal-bank`
    // works on the VPS without a `-r dotenv/config` preload (the gap the first
    // prod run hit). Lazy + best-effort: an exported MONGODB_URI still wins.
    try {
      require('dotenv').config();
    } catch (_e) {
      /* dotenv optional in stripped environments */
    }
    const mongoose = require('mongoose');
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error('MONGODB_URI is required (or use --dry-run / --list).');
      process.exit(1);
    }
    await mongoose.connect(uri);
    const GoalBank = require('../models/GoalBank');

    if (RESET) {
      const res = await GoalBank.deleteMany({ tags: { $all: STARTER_TAGS } });
      out.deleted = res.deletedCount || 0;
    }

    for (const item of CATALOG) {
      const exists = await GoalBank.findOne({
        domain: item.domain,
        category: item.category,
        description: item.description,
      })
        .select('_id')
        .lean();
      if (exists) {
        out.skipped += 1;
        continue;
      }
      await GoalBank.create({ ...item, tags: STARTER_TAGS });
      out.inserted += 1;
    }

    await mongoose.disconnect();

    if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
    else
      console.log(
        `seed-goal-bank: inserted ${out.inserted}, skipped ${out.skipped} (already present)` +
          (RESET ? `, deleted ${out.deleted} starter rows first` : '')
      );
    process.exit(0);
  })();
}

if (require.main === module) {
  main().catch(err => {
    console.error('seed-goal-bank failed:', err.message);
    process.exit(1);
  });
}

module.exports = { CATALOG, STARTER_TAGS };
