/**
 * @file treatment-plans-sessions.seed.js
 * @description بيانات خطط علاجية وجلسات شاملة - 100+ جلسة
 * Treatment plans and sessions seed - Al-Awael ERP
 * DEV/STAGING only
 */

'use strict';

const crypto = require('crypto');

function generateSessionToken(benNumber, therapistId, date, therapyType) {
  const raw = `${benNumber}-${therapistId}-${date.toISOString().split('T')[0]}-${therapyType}-${Date.now()}-${Math.random()}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

// ─────────────────────────────────────────────────────────────────────────────
// ملاحظات الجلسات حسب التخصص
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_NOTES = {
  speech_therapy: [
    {
      ar: 'تم العمل على تحسين نطق الأصوات الساكنة. أظهر المستفيد تقدماً ملحوظاً في نطق حرف الراء.',
      en: 'Worked on consonant sound production. Notable progress with /r/ sound.',
    },
    {
      ar: 'جلسة تركيز على بناء المفردات. تم تقديم 15 كلمة جديدة من فئة الحيوانات.',
      en: 'Vocabulary building session. Introduced 15 new animal words.',
    },
    {
      ar: 'تدريب على التواصل الوظيفي باستخدام الصور (PECS). بدأ يطلب الأشياء بالإشارة.',
      en: 'Functional communication training using PECS. Started pointing to request items.',
    },
    {
      ar: 'العمل على فهم الأوامر المكونة من خطوتين. يحتاج مزيد من التدريب على التسلسل.',
      en: 'Working on two-step command comprehension. Needs more sequencing practice.',
    },
    {
      ar: 'تدريب على تكوين الجمل القصيرة. المستفيد يكوّن جملاً من كلمتين بشكل مستقل.',
      en: 'Training on forming short sentences. Can form 2-word sentences independently.',
    },
  ],
  occupational_therapy: [
    {
      ar: 'تدريب على المهارات الحركية الدقيقة: قص بالمقص، تلوين داخل الإطار. تحسن ملحوظ.',
      en: 'Fine motor training: scissor cutting, coloring within lines. Notable improvement.',
    },
    {
      ar: 'العمل على مهارات الحياة اليومية: ارتداء الجاكيت وإغلاق السحاب. يحتاج مساعدة بسيطة.',
      en: 'Daily living skills: jacket and zipper. Needs minimal assistance.',
    },
    {
      ar: 'جلسة تكامل حسي: أنشطة لمسية وحركية. المستفيد أصبح أكثر تقبلاً للأنسجة المختلفة.',
      en: 'Sensory integration: tactile and vestibular activities. Better texture acceptance.',
    },
    {
      ar: 'تدريب على الكتابة: مسك القلم بالطريقة الصحيحة. بدأ يرسم خطوطاً مستقيمة.',
      en: 'Handwriting training: proper pencil grip. Started drawing straight lines.',
    },
    {
      ar: 'تدريب على الإطعام الذاتي باستخدام الملعقة. أتم 80% من الوجبة بشكل مستقل.',
      en: 'Self-feeding with spoon training. Completed 80% of meal independently.',
    },
  ],
  physical_therapy: [
    {
      ar: 'تمارين تقوية عضلات الجذع والأطراف السفلية. يستطيع الآن الوقوف لمدة 30 ثانية.',
      en: 'Core and lower limb strengthening. Can now stand for 30 seconds.',
    },
    {
      ar: 'تدريب على المشي باستخدام المشاية. المستفيد مشى 5 أمتار بمساعدة بسيطة.',
      en: 'Gait training with walker. Walked 5 meters with minimal assistance.',
    },
    {
      ar: 'تمارين التوازن على الكرة العلاجية. تحسن في الثبات والتحكم بالجذع.',
      en: 'Balance exercises on therapy ball. Improved stability and trunk control.',
    },
    {
      ar: 'تمارين الإطالة والمرونة. تقليل ملحوظ للتيبس في الأطراف العلوية.',
      en: 'Stretching and flexibility. Notable reduction in upper limb spasticity.',
    },
    {
      ar: 'تدريب على صعود الدرج. يصعد 5 درجات مع مسك الدرابزين بشكل مستقل.',
      en: 'Stair training. Climbs 5 steps holding railing independently.',
    },
  ],
  behavior_therapy: [
    {
      ar: 'العمل على تقليل سلوك الصراخ باستخدام التعزيز التفاضلي. انخفض السلوك بنسبة 40%.',
      en: 'Working on reducing screaming using differential reinforcement. 40% reduction.',
    },
    {
      ar: 'تدريب على المهارات الاجتماعية: التبادل مع الأقران. شارك لعبة لأول مرة.',
      en: 'Social skills: sharing with peers. Shared a toy for the first time.',
    },
    {
      ar: 'جلسة تدريب على الانتباه: زاد وقت الجلوس إلى 12 دقيقة (كان 5 دقائق).',
      en: 'Attention training: sitting time increased to 12 min (was 5 min).',
    },
    {
      ar: 'العمل على الروتين اليومي بالجدول المرئي. التزام 80% بالجدول اليومي.',
      en: 'Daily routine with visual schedule. 80% compliance.',
    },
    {
      ar: 'برنامج تدريب المهارات: تدريب على طلب الطعام والمشروب بالكلمة. نجح في 7/10 محاولات.',
      en: 'Skills training: requesting food/drink verbally. Succeeded 7/10 trials.',
    },
  ],
};

const ABSENCE_REASONS = [
  'مرض المستفيد',
  'ظروف طارئة للعائلة',
  'سفر قصير',
  'موعد طبي آخر',
  'إجازة العائلة',
];

// ─────────────────────────────────────────────────────────────────────────────
// الخطط العلاجية
// ─────────────────────────────────────────────────────────────────────────────
const THERAPY_BY_DISABILITY = {
  AUTISM: ['speech_therapy', 'behavior_therapy', 'occupational_therapy'],
  SPEECH_DELAY: ['speech_therapy'],
  PHYSICAL: ['physical_therapy', 'occupational_therapy'],
  INTELLECTUAL: ['behavior_therapy', 'occupational_therapy'],
  HEARING: ['speech_therapy'],
  DEVELOPMENTAL_DELAY: ['speech_therapy', 'occupational_therapy'],
  ADHD: ['behavior_therapy', 'occupational_therapy'],
  VISUAL: ['occupational_therapy'],
  LEARNING: ['speech_therapy'],
};

const THERAPIST_BY_SPECIALTY = {
  speech_therapy: ['THR-RUH-001', 'THR-JED-001', 'THR-DAM-001'],
  occupational_therapy: ['THR-RUH-002', 'THR-JED-003', 'THR-DAM-002'],
  physical_therapy: ['THR-RUH-003', 'THR-JED-002', 'THR-DAM-003'],
  behavior_therapy: ['THR-RUH-004', 'THR-JED-004'],
};

const BRANCH_THERAPISTS = {
  'RUH-MAIN': {
    speech_therapy: 'THR-RUH-001',
    occupational_therapy: 'THR-RUH-002',
    physical_therapy: 'THR-RUH-003',
    behavior_therapy: 'THR-RUH-004',
    special_education: 'THR-RUH-005',
    psychology: 'THR-RUH-006',
  },
  'JED-MAIN': {
    speech_therapy: 'THR-JED-001',
    occupational_therapy: 'THR-JED-003',
    physical_therapy: 'THR-JED-002',
    behavior_therapy: 'THR-JED-004',
  },
  'DAM-MAIN': {
    speech_therapy: 'THR-DAM-001',
    occupational_therapy: 'THR-DAM-002',
    physical_therapy: 'THR-DAM-003',
  },
};

function getTherapyNameAr(type) {
  const names = {
    speech_therapy: 'النطق واللغة',
    occupational_therapy: 'العلاج الوظيفي',
    physical_therapy: 'العلاج الطبيعي',
    behavior_therapy: 'تحليل السلوك التطبيقي',
    special_education: 'التربية الخاصة',
    psychology: 'العلاج النفسي',
  };
  return names[type] || 'التأهيل';
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed Function
// ─────────────────────────────────────────────────────────────────────────────
async function seed(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  if (!db) throw new Error('No database connection');

  const benefCol = db.collection('beneficiaries');
  const plansCol = db.collection('treatmentplans');
  const sessionsCol = db.collection('sessions');

  // جلب المستفيدين النشطين فقط
  const activeBeneficiaries = await benefCol
    .find({
      caseStatus: 'active',
      'metadata.isComprehensiveSeed': true,
    })
    .toArray();

  if (activeBeneficiaries.length === 0) {
    console.log(
      '  ⚠️  No comprehensive beneficiaries found - run comprehensive-beneficiaries seed first'
    );
    return;
  }

  let plansCreated = 0;
  let sessionsCreated = 0;
  const now = new Date();

  // تاريخ بدء الجلسات (الشهر الماضي)
  const sessionStartDate = addDays(now, -30);

  for (const ben of activeBeneficiaries) {
    const therapyTypes = THERAPY_BY_DISABILITY[ben.primaryDisability] || ['behavior_therapy'];
    const branchTherapists = BRANCH_THERAPISTS[ben.branchCode] || BRANCH_THERAPISTS['RUH-MAIN'];

    for (const therapyType of therapyTypes) {
      const therapistId = branchTherapists[therapyType];
      if (!therapistId) continue;

      // التحقق من وجود خطة مسبقاً
      const existingPlan = await plansCol.findOne({
        'beneficiary.beneficiaryNumber': ben.beneficiaryNumber,
        therapyType,
        'metadata.isComprehensiveSeed': true,
      });
      if (existingPlan) continue;

      // إنشاء الخطة العلاجية
      const startDate = addDays(ben.enrollmentDate || now, 7);
      const endDate = addDays(startDate, 270); // 9 أشهر
      const sessionsPerWeek =
        therapyType === 'behavior_therapy' ? 4 : therapyType === 'speech_therapy' ? 3 : 2;

      const plan = {
        beneficiary: {
          id: ben._id,
          beneficiaryNumber: ben.beneficiaryNumber,
          name: ben.name,
        },
        therapistId,
        branchCode: ben.branchCode,
        therapyType,
        titleAr: `خطة ${getTherapyNameAr(therapyType)} - ${ben.name.ar}`,
        titleEn: `${therapyType.replace('_', ' ')} Plan - ${ben.name.en}`,
        startDate,
        endDate,
        sessionsPerWeek,
        sessionDurationMinutes: 45,
        status: 'active',
        goals: generateGoals(therapyType),
        approvedBy: `MGR-${ben.branchCode.split('-')[0]}-001`,
        approvedAt: addDays(startDate, -7),
        metadata: { isComprehensiveSeed: true, seededAt: now },
        createdAt: startDate,
        updatedAt: now,
      };

      const planResult = await plansCol.insertOne(plan);
      plansCreated++;

      // إنشاء الجلسات للشهر الماضي
      const sessionDays = getSessionDays(sessionsPerWeek);
      let currentDate = new Date(sessionStartDate);

      while (currentDate <= now) {
        const dayOfWeek = currentDate.getDay();

        // تخطي الجمعة (5) والسبت (6)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          currentDate = addDays(currentDate, 1);
          continue;
        }

        if (!sessionDays.includes(dayOfWeek)) {
          currentDate = addDays(currentDate, 1);
          continue;
        }

        // تحديد حالة الجلسة: 85% حضور، 10% غياب بعذر، 5% غياب بدون عذر
        const rand = Math.random() * 100;
        let status, attendanceStatus, notesAr, notesEn;

        if (rand <= 85) {
          status = 'completed';
          attendanceStatus = 'present';
          const noteSet = SESSION_NOTES[therapyType] || SESSION_NOTES.behavior_therapy;
          const note = pickRandom(noteSet);
          notesAr = note.ar;
          notesEn = note.en;
        } else if (rand <= 95) {
          status = 'cancelled';
          attendanceStatus = 'absent_excused';
          notesAr = pickRandom(ABSENCE_REASONS);
          notesEn = 'Excused absence';
        } else {
          status = 'cancelled';
          attendanceStatus = 'absent_unexcused';
          notesAr = null;
          notesEn = null;
        }

        const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
        const startTime = pickRandom(timeSlots);
        const [sh, sm] = startTime.split(':').map(Number);
        const endMinutes = sh * 60 + sm + 45;
        const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

        await sessionsCol.insertOne({
          token: generateSessionToken(ben.beneficiaryNumber, therapistId, currentDate, therapyType),
          planId: planResult.insertedId,
          beneficiary: {
            id: ben._id,
            beneficiaryNumber: ben.beneficiaryNumber,
            name: ben.name,
          },
          therapistId,
          branchCode: ben.branchCode,
          sessionDate: new Date(currentDate),
          startTime,
          endTime,
          durationMinutes: 45,
          sessionType: therapyType,
          status,
          attendanceStatus,
          notesAr,
          notesEn,
          homeExerciseAr:
            status === 'completed' ? 'يرجى ممارسة التمرين المرفق يومياً لمدة 15 دقيقة' : null,
          homeExerciseEn:
            status === 'completed'
              ? 'Please practice the attached exercise daily for 15 minutes'
              : null,
          performanceRating: status === 'completed' ? 3 + Math.floor(Math.random() * 3) : null,
          metadata: { isComprehensiveSeed: true, seededAt: now },
          createdAt: new Date(currentDate),
          updatedAt: new Date(currentDate),
        });
        sessionsCreated++;

        currentDate = addDays(currentDate, 1);
      }
    }
  }

  console.log(
    `  ✅ treatment-plans-sessions: ${plansCreated} plans, ${sessionsCreated} sessions created`
  );
}

function generateGoals(therapyType) {
  const goalMap = {
    speech_therapy: [
      {
        ar: 'نطق الحروف الأبجدية بوضوح',
        en: 'Pronounce alphabet letters clearly',
        targetScore: 80,
        currentScore: 35,
      },
      {
        ar: 'تكوين جمل من 3-4 كلمات',
        en: 'Form 3-4 word sentences',
        targetScore: 75,
        currentScore: 25,
      },
      {
        ar: 'فهم التعليمات البسيطة من خطوتين',
        en: 'Understand two-step instructions',
        targetScore: 85,
        currentScore: 40,
      },
    ],
    occupational_therapy: [
      {
        ar: 'تحسين المهارات الحركية الدقيقة',
        en: 'Improve fine motor skills',
        targetScore: 80,
        currentScore: 30,
      },
      {
        ar: 'استخدام الملعقة بشكل مستقل',
        en: 'Use spoon independently',
        targetScore: 90,
        currentScore: 55,
      },
      {
        ar: 'ارتداء الملابس بمساعدة بسيطة',
        en: 'Dress with minimal assistance',
        targetScore: 75,
        currentScore: 20,
      },
    ],
    physical_therapy: [
      {
        ar: 'المشي بشكل مستقل لمسافة 10 أمتار',
        en: 'Walk 10 meters independently',
        targetScore: 80,
        currentScore: 45,
      },
      {
        ar: 'تحسين التوازن والثبات',
        en: 'Improve balance and stability',
        targetScore: 85,
        currentScore: 40,
      },
      { ar: 'تقوية عضلات الجذع', en: 'Strengthen core muscles', targetScore: 70, currentScore: 30 },
    ],
    behavior_therapy: [
      {
        ar: 'تقليل سلوكيات الإيذاء الذاتي',
        en: 'Reduce self-injurious behaviors',
        targetScore: 90,
        currentScore: 50,
      },
      {
        ar: 'الجلوس في النشاط لمدة 15 دقيقة',
        en: 'Sit in activity for 15 minutes',
        targetScore: 80,
        currentScore: 35,
      },
      {
        ar: 'التفاعل الاجتماعي مع الأقران',
        en: 'Social interaction with peers',
        targetScore: 70,
        currentScore: 20,
      },
    ],
  };
  return goalMap[therapyType] || goalMap.behavior_therapy;
}

function getSessionDays(perWeek) {
  // 0=الأحد, 1=الاثنين, 2=الثلاثاء, 3=الأربعاء, 4=الخميس
  const dayMaps = {
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 2, 3],
  };
  return dayMaps[perWeek] || [0, 3];
}

async function down(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  await db.collection('treatmentplans').deleteMany({ 'metadata.isComprehensiveSeed': true });
  await db.collection('sessions').deleteMany({ 'metadata.isComprehensiveSeed': true });
  console.log('  ✅ treatment-plans-sessions: removed all comprehensive seed plans & sessions');
}

module.exports = { seed, down };
