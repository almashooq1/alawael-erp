/**
 * SessionsSeeder — إنشاء 120+ جلسة تجريبية للشهر الأخير
 * يشمل: جلسات مكتملة، مُلغاة، تقييمات الأداء، ملاحظات الجلسة
 */
'use strict';

const mongoose = require('mongoose');
const Beneficiary = require('../../models/Beneficiary');
const User = require('../../models/User');

// نماذج مؤقتة إن لم تكن موجودة
const sessionSchema = new mongoose.Schema(
  {
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    sessionDate: { type: Date, required: true },
    startTime: String,
    endTime: String,
    durationMinutes: { type: Number, default: 45 },
    sessionType: {
      type: String,
      enum: [
        'speech_therapy',
        'occupational_therapy',
        'physical_therapy',
        'behavior_therapy',
        'special_education',
        'psychology',
      ],
      default: 'speech_therapy',
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
    attendanceStatus: {
      type: String,
      enum: ['present', 'absent_excused', 'absent_unexcused', 'late'],
      default: 'present',
    },
    notesAr: String,
    notesEn: String,
    homeExerciseAr: String,
    homeExerciseEn: String,
    performanceRating: { type: Number, min: 1, max: 5 },
    goals: [String],
    achievements: [String],
  },
  { timestamps: true, collection: 'rehab_sessions' }
);

const Session = mongoose.models.RehabSession || mongoose.model('RehabSession', sessionSchema);

// ─── ملاحظات الجلسات حسب نوع العلاج ────────────────────────────────────────
const SESSION_NOTES = {
  speech_therapy: {
    ar: [
      'تم العمل على تحسين نطق الأصوات الساكنة. أظهر المستفيد تقدماً ملحوظاً في نطق حرف الراء.',
      'جلسة تركيز على بناء المفردات. تم تقديم 15 كلمة جديدة من فئة الحيوانات والمستفيد تعلم 10 منها.',
      'تدريب على التواصل الوظيفي باستخدام الصور (PECS). المستفيد بدأ يطلب الأشياء بالإشارة.',
      'العمل على فهم الأوامر المكونة من خطوتين. تحسن ملحوظ في الفهم.',
      'جلسة تدريب على المحادثة. المستفيد يستطيع الآن تكوين جملة من 3 كلمات.',
    ],
    en: [
      'Worked on consonant production. Notable progress with /r/ sound.',
      'Vocabulary building session. Introduced 15 animal words, learned 10.',
      'Functional communication training using PECS. Beneficiary started pointing.',
      'Two-step command comprehension improved significantly.',
      'Conversation training. Can now form 3-word sentences.',
    ],
  },
  occupational_therapy: {
    ar: [
      'تدريب على المهارات الحركية الدقيقة: قص بالمقص وتلوين داخل الإطار. تحسن ملحوظ.',
      'العمل على مهارات الحياة اليومية: ارتداء الجاكيت وإغلاق السحاب.',
      'جلسة تكامل حسي: أنشطة لمسية وحركية. المستفيد أكثر تقبلاً للأنسجة.',
      'تدريب على مسك القلم بالطريقة الصحيحة. بدأ يرسم خطوطاً مستقيمة.',
      'تدريب على ترتيب الأشياء وتنظيمها. تحسن في المهارات الإدراكية.',
    ],
    en: [
      'Fine motor training: scissor cutting, coloring. Notable improvement.',
      'Daily living skills: putting on jacket. Minimal assistance needed.',
      'Sensory integration session. Better texture acceptance.',
      'Proper pencil grip training. Started drawing straight lines.',
      'Object organization training. Cognitive skills improving.',
    ],
  },
  physical_therapy: {
    ar: [
      'تمارين تقوية عضلات الجذع والأطراف السفلية. المستفيد يستطيع الوقوف لمدة 30 ثانية.',
      'تدريب على المشي باستخدام المشاية. المستفيد مشى 5 أمتار بمساعدة بسيطة.',
      'تمارين التوازن على الكرة العلاجية. تحسن في الثبات والتحكم.',
      'تمارين الإطالة والمرونة. تقليل التيبس في الأطراف.',
      'تدريب على الجلوس الصحيح والوضعية السليمة.',
    ],
    en: [
      'Core and lower limb strengthening. Can now stand for 30 seconds.',
      'Gait training with walker. Walked 5 meters with minimal assistance.',
      'Balance exercises on therapy ball. Improved stability.',
      'Stretching exercises. Reduced limb spasticity.',
      'Proper sitting posture training.',
    ],
  },
  behavior_therapy: {
    ar: [
      'العمل على تقليل سلوك الصراخ باستخدام التعزيز التفاضلي. انخفض بنسبة 40%.',
      'تدريب على المهارات الاجتماعية: التبادل مع الأقران. شارك لعبة لأول مرة.',
      'جلسة تدريب على الانتباه: زاد وقت الجلوس إلى 12 دقيقة.',
      'العمل على اتباع الروتين اليومي بالجدول المرئي. التزام 80%.',
      'تدريب على طلب المساعدة بطريقة مناسبة.',
    ],
    en: [
      'Working on reducing screaming. Behavior reduced by 40%.',
      'Social skills training: sharing with peers. Shared a toy for first time.',
      'Attention training: sitting time increased to 12 minutes.',
      'Daily routine following with visual schedule. 80% compliance.',
      'Training appropriate help-seeking behavior.',
    ],
  },
};

// ─── تحديد نوع العلاج حسب نوع الإعاقة ────────────────────────────────────
function getTherapyType(disabilityCategory) {
  const map = {
    mental: ['speech_therapy', 'behavior_therapy', 'occupational_therapy'],
    speech: ['speech_therapy'],
    physical: ['physical_therapy', 'occupational_therapy'],
    sensory: ['speech_therapy', 'occupational_therapy'],
    learning: ['behavior_therapy', 'special_education'],
    multiple: ['speech_therapy', 'occupational_therapy', 'physical_therapy'],
    other: ['behavior_therapy'],
  };
  const types = map[disabilityCategory] || map.other;
  return types[Math.floor(Math.random() * types.length)];
}

// ─── إنشاء الجلسات ───────────────────────────────────────────────────────────
async function run() {
  console.log('📅 إنشاء الجلسات (120+ جلسة للشهر الأخير)...');

  // جلب المستفيدين النشطين
  const activeBeneficiaries = await Beneficiary.find({ status: 'active' }).limit(30);
  if (activeBeneficiaries.length === 0) {
    console.log('   ⚠️ لا يوجد مستفيدون نشطون. تخطي إنشاء الجلسات.');
    return { created: 0 };
  }

  // جلب الأخصائيين
  const therapists = await User.find({
    role: { $in: ['therapist', 'doctor', 'teacher', 'supervisor'] },
  });
  if (therapists.length === 0) {
    console.log('   ⚠️ لا يوجد أخصائيون. تخطي إنشاء الجلسات.');
    return { created: 0 };
  }

  // مسح الجلسات القديمة
  await Session.deleteMany({});

  const sessions = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 1);

  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

  // إنشاء جلسات للمستفيدين النشطين
  for (const beneficiary of activeBeneficiaries) {
    // تحديد الأخصائي المناسب للفرع
    const branchTherapists = therapists.filter(
      t => t.branch && beneficiary.branch && t.branch.toString() === beneficiary.branch.toString()
    );
    const availableTherapists = branchTherapists.length > 0 ? branchTherapists : therapists;
    const therapist = availableTherapists[Math.floor(Math.random() * availableTherapists.length)];

    const sessionType = getTherapyType(beneficiary.category || 'mental');
    const notes = SESSION_NOTES[sessionType] || SESSION_NOTES.behavior_therapy;

    // جلستين إلى 4 في الأسبوع
    const sessionsPerWeek = Math.floor(Math.random() * 3) + 2;
    const sessionDays =
      sessionsPerWeek === 2 ? [0, 2] : sessionsPerWeek === 3 ? [0, 2, 4] : [0, 1, 2, 3];

    const currentDate = new Date(startDate);

    while (currentDate <= now) {
      // تخطي الجمعة (5) والسبت (6)
      if (currentDate.getDay() === 5 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const dayOfWeek = currentDate.getDay();

      if (sessionDays.includes(dayOfWeek)) {
        const startTime = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        const [h, m] = startTime.split(':').map(Number);
        const endHour = h + 1;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        // 85% حضور، 10% غياب بعذر، 5% غياب بدون عذر
        const rand = Math.random() * 100;
        let status, attendanceStatus;
        if (rand <= 85) {
          status = 'completed';
          attendanceStatus = 'present';
        } else if (rand <= 95) {
          status = 'cancelled';
          attendanceStatus = 'absent_excused';
        } else {
          status = 'cancelled';
          attendanceStatus = 'absent_unexcused';
        }

        const noteIndex = Math.floor(Math.random() * notes.ar.length);

        sessions.push({
          beneficiaryId: beneficiary._id,
          therapistId: therapist._id,
          branchId: beneficiary.branch || null,
          sessionDate: new Date(currentDate),
          startTime,
          endTime,
          durationMinutes: 45,
          sessionType,
          status,
          attendanceStatus,
          notesAr: status === 'completed' ? notes.ar[noteIndex] : null,
          notesEn: status === 'completed' ? notes.en[noteIndex] : null,
          homeExerciseAr:
            status === 'completed' ? 'يرجى ممارسة التمرين المرفق يومياً لمدة 15 دقيقة' : null,
          homeExerciseEn:
            status === 'completed'
              ? 'Please practice the attached exercise daily for 15 min'
              : null,
          performanceRating: status === 'completed' ? Math.floor(Math.random() * 2) + 3 : null,
          createdAt: new Date(currentDate),
          updatedAt: new Date(currentDate),
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // إدخال الجلسات على دفعات
  let created = 0;
  const batchSize = 50;
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);
    await Session.insertMany(batch, { ordered: false });
    created += batch.length;
  }

  const completed = sessions.filter(s => s.status === 'completed').length;
  const cancelled = sessions.filter(s => s.status === 'cancelled').length;

  console.log(`   ✅ الجلسات: ${created} جلسة (${completed} مكتملة، ${cancelled} ملغاة)`);
  return { created, completed, cancelled };
}

module.exports = { run };
