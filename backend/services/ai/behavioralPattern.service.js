/**
 * BehavioralPatternService — خدمة تحليل الأنماط السلوكية
 * Prompt 20: AI & Predictive Analytics Module
 */

const AiAlert = require('../../models/AiAlert');
const logger = require('../../utils/logger');

/**
 * تحليل الأنماط السلوكية لمستفيد
 */
async function analyzeBeneficiary(beneficiary, sessions = []) {
  const patterns = [];

  // 1. كشف التراجع المفاجئ في الأداء
  const performanceDrop = detectPerformanceDrop(sessions);
  if (performanceDrop) patterns.push(performanceDrop);

  // 2. تحليل أنماط الغياب
  const attendancePattern = analyzeAttendancePattern(sessions);
  if (attendancePattern) patterns.push(attendancePattern);

  // 3. تحليل العلاقة بين التوقيت والأداء
  const timePerf = analyzeTimePerformanceCorrelation(sessions);
  if (timePerf) patterns.push(timePerf);

  // 4. تحليل ملاحظات الجلسات
  const notesPatterns = analyzeSessionNotes(sessions);
  patterns.push(...notesPatterns);

  // إنشاء تنبيهات للأنماط الخطيرة
  for (const pattern of patterns) {
    if (pattern.severity !== 'info') {
      try {
        await createPatternAlert(beneficiary, pattern);
      } catch (err) {
        logger.error('Failed to create pattern alert', { error: err.message });
      }
    }
  }

  return patterns;
}

/**
 * كشف التراجع المفاجئ في الأداء
 * مقارنة آخر 4 أسابيع بالـ 4 أسابيع السابقة
 */
function detectPerformanceDrop(sessions) {
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const eightWeeksAgo = new Date(now);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const recent = sessions.filter(s => {
    const d = new Date(s.session_date || s.date);
    return d >= fourWeeksAgo && (s.attendance_status === 'attended' || s.status === 'completed');
  });

  const previous = sessions.filter(s => {
    const d = new Date(s.session_date || s.date);
    return (
      d >= eightWeeksAgo &&
      d < fourWeeksAgo &&
      (s.attendance_status === 'attended' || s.status === 'completed')
    );
  });

  if (!recent.length || !previous.length) return null;

  const recentAvg = recent.reduce((sum, s) => sum + (s.performance_score || 0), 0) / recent.length;
  const prevAvg =
    previous.reduce((sum, s) => sum + (s.performance_score || 0), 0) / previous.length;

  if (prevAvg === 0) return null;

  const dropPct = ((prevAvg - recentAvg) / prevAvg) * 100;

  if (dropPct < 20) return null;

  return {
    type: 'performance_drop',
    severity: dropPct >= 40 ? 'critical' : 'warning',
    message_ar: `تراجع في الأداء بنسبة ${Math.round(dropPct)}% خلال آخر 4 أسابيع`,
    message_en: `Performance dropped by ${Math.round(dropPct)}% in the last 4 weeks`,
    data: {
      recent_avg: Math.round(recentAvg * 100) / 100,
      previous_avg: Math.round(prevAvg * 100) / 100,
      drop_percentage: Math.round(dropPct * 10) / 10,
    },
  };
}

/**
 * تحليل أنماط الغياب
 */
function analyzeAttendancePattern(sessions) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recent = sessions.filter(s => new Date(s.session_date || s.date) >= threeMonthsAgo);
  if (recent.length < 10) return null;

  const absences = recent.filter(s => s.attendance_status === 'absent');
  const absenceRate = absences.length / recent.length;

  if (absenceRate < 0.2) return null;

  // تحليل أيام الغياب
  const dayCount = {};
  absences.forEach(s => {
    const day = new Date(s.session_date || s.date).getDay();
    dayCount[day] = (dayCount[day] || 0) + 1;
  });

  const topDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const dayNamesAr = {
    0: 'الأحد',
    1: 'الإثنين',
    2: 'الثلاثاء',
    3: 'الأربعاء',
    4: 'الخميس',
    5: 'الجمعة',
    6: 'السبت',
  };
  const dayNamesEn = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };

  const maxConsecutive = findMaxConsecutiveAbsences(recent);

  return {
    type: 'high_absence',
    severity: absenceRate >= 0.4 ? 'critical' : 'warning',
    message_ar: `نسبة غياب مرتفعة: ${Math.round(absenceRate * 100)}%${topDay ? ` - الغياب أكثر في ${dayNamesAr[topDay]}` : ''}`,
    message_en: `High absence rate: ${Math.round(absenceRate * 100)}%${topDay ? ` - Most absences on ${dayNamesEn[topDay]}` : ''}`,
    data: {
      absence_rate: Math.round(absenceRate * 1000) / 1000,
      absences_by_day: dayCount,
      most_absent_day: topDay,
      max_consecutive_absences: maxConsecutive,
      total_sessions: recent.length,
      total_absences: absences.length,
    },
  };
}

/**
 * إيجاد أطول سلسلة غياب متتالي
 */
function findMaxConsecutiveAbsences(sessions) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.session_date || a.date) - new Date(b.session_date || b.date)
  );
  let max = 0;
  let current = 0;
  for (const s of sorted) {
    if (s.attendance_status === 'absent') {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

/**
 * تحليل العلاقة بين وقت الجلسة والأداء
 */
function analyzeTimePerformanceCorrelation(sessions) {
  const attended = sessions.filter(
    s =>
      (s.attendance_status === 'attended' || s.status === 'completed') &&
      s.performance_score &&
      (s.start_time || s.time)
  );

  if (attended.length < 15) return null;

  const morning = attended.filter(s => {
    const t = s.start_time || s.time || '';
    const hour = parseInt(t.split(':')[0]);
    return hour < 12;
  });

  const afternoon = attended.filter(s => {
    const t = s.start_time || s.time || '';
    const hour = parseInt(t.split(':')[0]);
    return hour >= 12;
  });

  if (!morning.length || !afternoon.length) return null;

  const morningAvg = morning.reduce((sum, s) => sum + s.performance_score, 0) / morning.length;
  const afternoonAvg =
    afternoon.reduce((sum, s) => sum + s.performance_score, 0) / afternoon.length;

  const difference = Math.abs(morningAvg - afternoonAvg);
  if (difference < 10) return null;

  const betterTime = morningAvg > afternoonAvg ? 'morning' : 'afternoon';

  return {
    type: 'time_performance_correlation',
    severity: 'info',
    message_ar: `أداء أفضل في فترة ${betterTime === 'morning' ? 'الصباح' : 'بعد الظهر'} بفارق ${Math.round(difference)} نقطة`,
    message_en: `Better performance in the ${betterTime} by ${Math.round(difference)} points`,
    data: {
      morning_avg: Math.round(morningAvg * 10) / 10,
      afternoon_avg: Math.round(afternoonAvg * 10) / 10,
      better_time: betterTime,
      difference: Math.round(difference * 10) / 10,
    },
  };
}

/**
 * تحليل ملاحظات الجلسات (باستخدام كلمات مفتاحية)
 */
function analyzeSessionNotes(sessions) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const relevant = sessions.filter(
    s =>
      (s.attendance_status === 'attended' || s.status === 'completed') &&
      (s.notes || s.session_notes) &&
      new Date(s.session_date || s.date) >= threeMonthsAgo
  );

  if (relevant.length < 5) return [];

  const negativeKeywords = {
    رفض: 'refusal',
    بكاء: 'crying',
    عدوان: 'aggression',
    صراخ: 'screaming',
    انسحاب: 'withdrawal',
    'عدم تعاون': 'non_cooperation',
    تشتت: 'distraction',
    قلق: 'anxiety',
  };

  const behaviorNames = {
    refusal: { ar: 'الرفض', en: 'Refusal' },
    crying: { ar: 'البكاء', en: 'Crying' },
    aggression: { ar: 'العدوان', en: 'Aggression' },
    screaming: { ar: 'الصراخ', en: 'Screaming' },
    withdrawal: { ar: 'الانسحاب', en: 'Withdrawal' },
    non_cooperation: { ar: 'عدم التعاون', en: 'Non-cooperation' },
    distraction: { ar: 'التشتت', en: 'Distraction' },
    anxiety: { ar: 'القلق', en: 'Anxiety' },
  };

  const counts = {};
  for (const s of relevant) {
    const text = s.notes || s.session_notes || '';
    for (const [arWord, enKey] of Object.entries(negativeKeywords)) {
      if (text.includes(arWord)) {
        counts[enKey] = (counts[enKey] || 0) + 1;
      }
    }
  }

  const threshold = relevant.length * 0.4;
  const patterns = [];

  for (const [behavior, count] of Object.entries(counts)) {
    if (count < threshold) continue;
    const name = behaviorNames[behavior] || { ar: behavior, en: behavior };
    const pct = Math.round((count / relevant.length) * 100);

    patterns.push({
      type: 'pattern_detected',
      severity: 'warning',
      message_ar: `نمط متكرر: ${name.ar} في ${pct}% من الجلسات`,
      message_en: `Recurring pattern: ${name.en} in ${pct}% of sessions`,
      data: {
        behavior,
        occurrences: count,
        total_sessions: relevant.length,
        percentage: pct,
      },
    });
  }

  return patterns;
}

/**
 * إنشاء تنبيه لنمط سلوكي مكتشف
 */
async function createPatternAlert(beneficiary, pattern) {
  const suggestedActions = {
    performance_drop: [
      {
        action: 'review_plan',
        label_ar: 'مراجعة الخطة العلاجية',
        label_en: 'Review treatment plan',
      },
      {
        action: 'schedule_team_meeting',
        label_ar: 'اجتماع فريق علاجي',
        label_en: 'Schedule team meeting',
      },
      { action: 'contact_parent', label_ar: 'التواصل مع ولي الأمر', label_en: 'Contact parent' },
    ],
    high_absence: [
      { action: 'contact_parent', label_ar: 'التواصل مع ولي الأمر', label_en: 'Contact parent' },
      {
        action: 'reschedule_sessions',
        label_ar: 'إعادة جدولة الجلسات',
        label_en: 'Reschedule sessions',
      },
    ],
    pattern_detected: [
      { action: 'behavior_plan', label_ar: 'إعداد خطة سلوكية', label_en: 'Create behavior plan' },
      {
        action: 'specialist_consult',
        label_ar: 'استشارة أخصائي سلوكي',
        label_en: 'Consult behavior specialist',
      },
    ],
  };

  return AiAlert.create({
    alert_type: pattern.type,
    severity: pattern.severity,
    target_type: 'beneficiary',
    target_id: beneficiary._id,
    message_ar: pattern.message_ar,
    message_en: pattern.message_en,
    data: pattern.data,
    suggested_actions: suggestedActions[pattern.type] || [],
    branch_id: beneficiary.branch_id,
  });
}

module.exports = {
  analyzeBeneficiary,
  detectPerformanceDrop,
  analyzeAttendancePattern,
  analyzeTimePerformanceCorrelation,
  analyzeSessionNotes,
};
