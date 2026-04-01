/**
 * SmartReportGeneratorService — خدمة التقارير الذكية بالذكاء الاصطناعي
 * Prompt 20: AI & Predictive Analytics Module
 */

const axios = require('axios');
const AiGeneratedReport = require('../../models/AiGeneratedReport');
const logger = require('../../utils/logger');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4';

/**
 * الحصول على بداية ونهاية شهر
 */
function getMonthBounds(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}

/**
 * جمع بيانات الشهر
 */
async function gatherMonthlyData(beneficiary, periodStart, periodEnd) {
  const DailySession = (() => {
    try {
      return require('../../models/DailySession');
    } catch (_) {
      return null;
    }
  })();

  const Goal = (() => {
    try {
      return require('../../models/Goal');
    } catch (_) {
      return null;
    }
  })();

  const Assessment = (() => {
    try {
      return require('../../models/Assessment');
    } catch (_) {
      return null;
    }
  })();

  let sessions = [];
  let goals = [];
  let assessments = [];

  if (DailySession) {
    sessions = await DailySession.find({
      beneficiary_id: beneficiary._id,
      $or: [
        { session_date: { $gte: periodStart, $lte: periodEnd } },
        { date: { $gte: periodStart, $lte: periodEnd } },
      ],
    }).lean();
  }

  if (Goal) {
    goals = await Goal.find({ beneficiary_id: beneficiary._id }).lean();
  }

  if (Assessment) {
    assessments = await Assessment.find({
      beneficiary_id: beneficiary._id,
      $or: [
        { assessment_date: { $gte: periodStart, $lte: periodEnd } },
        { date: { $gte: periodStart, $lte: periodEnd } },
      ],
    }).lean();
  }

  const attendedSessions = sessions.filter(
    s => s.attendance_status === 'attended' || s.status === 'completed'
  );
  const absentSessions = sessions.filter(s => s.attendance_status === 'absent');
  const cancelledSessions = sessions.filter(s => s.attendance_status === 'cancelled');

  const avgPerformance =
    attendedSessions.length > 0
      ? attendedSessions.reduce((sum, s) => sum + (s.performance_score || 0), 0) /
        attendedSessions.length
      : 0;

  return {
    beneficiary: {
      name_ar: beneficiary.full_name || beneficiary.name_ar || '',
      name_en: beneficiary.name_en || '',
      disability_type: beneficiary.disability_type,
      age: beneficiary.date_of_birth
        ? Math.floor(
            (new Date() - new Date(beneficiary.date_of_birth)) / (365.25 * 24 * 3600 * 1000)
          )
        : null,
    },
    sessions: sessions.map(s => ({
      date: s.session_date || s.date,
      attendance: s.attendance_status || s.status,
      duration: s.duration_minutes || s.duration || 45,
      performance_score: s.performance_score,
      notes: s.notes || s.session_notes,
      activities: s.activities,
      home_recommendations: s.home_recommendations,
    })),
    session_stats: {
      total: sessions.length,
      attended: attendedSessions.length,
      absent: absentSessions.length,
      cancelled: cancelledSessions.length,
      avg_performance: Math.round(avgPerformance * 10) / 10,
    },
    goals: goals.map(g => ({
      title_ar: g.title_ar || g.goal_statement,
      title_en: g.title_en,
      domain: g.domain,
      progress_percentage: g.progress_percentage || 0,
      target_value: g.target_value || g.target_performance,
      status: g.status,
    })),
    assessments: assessments.map(a => ({
      type: a.assessment_type || a.type,
      date: a.assessment_date || a.date,
      total_score: a.total_score,
    })),
    period: {
      month_ar: periodStart.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
      month_en: periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      start: periodStart.toISOString().split('T')[0],
      end: periodEnd.toISOString().split('T')[0],
    },
  };
}

/**
 * مولّد التقرير البديل عند عدم توفر OpenAI
 */
function fallbackReport(data, language) {
  const stats = data.session_stats;
  const attendanceRate = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;
  const achieved = data.goals.filter(
    g => g.status === 'achieved' || g.status === 'completed'
  ).length;
  const avgProgress =
    data.goals.length > 0
      ? Math.round(
          data.goals.reduce((s, g) => s + (g.progress_percentage || 0), 0) / data.goals.length
        )
      : 0;

  if (language === 'ar') {
    return {
      sections: {
        summary: `خلال هذا الشهر حضر المستفيد ${stats.attended} جلسة من أصل ${stats.total} بنسبة حضور ${attendanceRate}%.`,
        sessions_summary: `تم تنفيذ ${stats.attended} جلسة علاجية بمتوسط أداء ${stats.avg_performance}%.`,
        progress_summary: `تم تحقيق ${achieved} من أصل ${data.goals.length} أهداف بمتوسط تقدم ${avgProgress}%.`,
        highlights: ['استمرار المستفيد في البرنامج العلاجي'],
        challenges: stats.absent > 0 ? [`غياب ${stats.absent} جلسات`] : [],
        home_recommendations: [
          'الاستمرار في التمارين المنزلية المقترحة',
          'الالتزام بمواعيد الجلسات',
        ],
        next_month_focus: 'التركيز على تحقيق الأهداف المحددة في الخطة العلاجية',
      },
    };
  }

  return {
    sections: {
      summary: `This month, the beneficiary attended ${stats.attended} out of ${stats.total} sessions (${attendanceRate}% attendance).`,
      sessions_summary: `${stats.attended} therapy sessions conducted with avg performance ${stats.avg_performance}%.`,
      progress_summary: `${achieved} out of ${data.goals.length} goals achieved with avg progress ${avgProgress}%.`,
      highlights: ['Continued participation in the therapy program'],
      challenges: stats.absent > 0 ? [`${stats.absent} missed sessions`] : [],
      home_recommendations: ['Continue suggested home exercises', 'Maintain session schedule'],
      next_month_focus: 'Focus on achieving the goals set in the treatment plan',
    },
  };
}

/**
 * توليد محتوى التقرير باستخدام OpenAI
 */
async function generateWithOpenAI(data, language) {
  if (!OPENAI_API_KEY) {
    logger.warn('OpenAI API key not configured, using fallback');
    return fallbackReport(data, language);
  }

  const systemPrompt =
    language === 'ar'
      ? `أنت مساعد متخصص في كتابة تقارير تأهيل الأطفال ذوي الإعاقة لأولياء الأمور.
اكتب بلغة بسيطة، إيجابية وواقعية. أرجع JSON بالأقسام: summary, sessions_summary, progress_summary, highlights (مصفوفة), challenges (مصفوفة), home_recommendations (مصفوفة), next_month_focus`
      : `You are a specialist in writing rehabilitation reports for parents. Use simple, positive language. Return JSON with: summary, sessions_summary, progress_summary, highlights (array), challenges (array), home_recommendations (array), next_month_focus`;

  const userPrompt =
    language === 'ar'
      ? `اكتب تقرير شهري لولي أمر بناءً على:\n${JSON.stringify(data, null, 2)}`
      : `Write a monthly parent report based on:\n${JSON.stringify(data, null, 2)}`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      sections: parsed,
      usage: response.data.usage,
    };
  } catch (err) {
    logger.error('OpenAI API error, using fallback', { error: err.message });
    return fallbackReport(data, language);
  }
}

/**
 * توليد بيانات الرسوم البيانية
 */
function prepareChartsData(data) {
  return {
    attendance_pie: {
      attended: data.session_stats.attended,
      absent: data.session_stats.absent,
      cancelled: data.session_stats.cancelled,
    },
    performance_trend: data.sessions
      .filter(s => s.attendance === 'attended' && s.performance_score)
      .map(s => ({
        date: s.date,
        score: s.performance_score,
      })),
    goals_progress: data.goals.map(g => ({
      title: g.title_ar || g.title_en,
      progress: g.progress_percentage,
      target: g.target_value,
    })),
  };
}

/**
 * توليد تقرير شهري لولي الأمر
 */
async function generateMonthlyParentReport(beneficiary, yearMonth, language = 'ar') {
  const { start, end } = getMonthBounds(yearMonth);
  const data = await gatherMonthlyData(beneficiary, start, end);
  const generated = await generateWithOpenAI(data, language);

  const report = new AiGeneratedReport({
    beneficiary_id: beneficiary._id,
    report_type: 'monthly_parent',
    language,
    period_type: 'monthly',
    period_start: start,
    period_end: end,
    content_ar:
      language === 'ar' || language === 'both' ? JSON.stringify(generated.sections) : null,
    content_en:
      language === 'en' || language === 'both' ? JSON.stringify(generated.sections) : null,
    sections: generated.sections,
    charts_data: prepareChartsData(data),
    status: 'generated',
    model_version: OPENAI_MODEL,
    generation_metadata: {
      tokens_used: generated.usage || null,
      generated_at: new Date().toISOString(),
      data_points: data.sessions.length,
    },
    branch_id: beneficiary.branch_id,
  });

  await report.save();
  return report;
}

module.exports = {
  generateMonthlyParentReport,
  gatherMonthlyData,
  prepareChartsData,
  fallbackReport,
};
