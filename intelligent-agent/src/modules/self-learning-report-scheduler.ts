// Weekly Self-Learning Report Scheduler
import { SelfEvaluator } from './self-evaluator';
import { InteractionLogger } from './interaction-logger';
import schedule from 'node-schedule';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { sendMailSMTP } from './smtp-mailer';
// إرسال التقرير إلى البريد أو Slack/Teams
// إرسال التقرير عبر SMTP فعلي
async function sendReportByEmail(subject: string, body: string) {
  const to = process.env.REPORT_EMAIL_TO;
  if (!to) {
    console.log('[EmailReport] لم يتم ضبط البريد المستلم (REPORT_EMAIL_TO)');
    return;
  }
  try {
    await sendMailSMTP({
      to,
      subject,
      html: `<pre style="font-family:Tahoma,Arial,sans-serif">${body}</pre>`
    });
    console.log('[EmailReport] تم إرسال التقرير بنجاح إلى', to);
  } catch (e) {
    if (e instanceof Error) {
      console.error('[EmailReport] فشل إرسال التقرير:', e.message);
    } else {
      console.error('[EmailReport] فشل إرسال التقرير:', e);
    }
  }
}
async function sendReportToWebhook(webhookUrl: string, body: string, type: 'slack' | 'teams' | 'google' = 'slack') {
  if (!webhookUrl) return;
  try {
    let payload;
    if (type === 'teams') {
      payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: 'Self-Learning Report',
        themeColor: '0076D7',
        title: 'تقرير التعلم الذاتي الأسبوعي',
        text: body
      };
    } else if (type === 'google') {
      payload = { text: body };
    } else {
      payload = { text: body };
    }
    await axios.post(webhookUrl, payload);
  } catch (e) {
    if (e instanceof Error) {
      console.error('[ReportWebhook]', e.message);
    } else {
      console.error('[ReportWebhook]', e);
    }
  }
}

export function scheduleWeeklySelfLearningReport(
  slackWebhook?: string,
  teamsWebhook?: string,
  googleWebhook?: string
) {
  schedule.scheduleJob('0 7 * * 0', async () => {
    const avg = SelfEvaluator.averageScore();
    const logs = InteractionLogger.getAll();
    const total = logs.length;
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
    const weekAvg = weekLogs.length ? weekLogs.reduce((s, l) => s + (l.feedback || 0), 0) / weekLogs.length : 0;
    // أكثر الأسئلة تكراراً
    const questionCounts: Record<string, number> = {};
    for (const l of weekLogs) {
      const q = (l.input || '').trim();
      if (q) questionCounts[q] = (questionCounts[q] || 0) + 1;
    }
    const topQuestions = Object.entries(questionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([q, c]) => `• ${q} (${c} مرات)`)
      .join('\n');
    // مصادر الأخطاء
    const errorOutputs = weekLogs.filter(l => l.output && l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'));
    const errorStats = errorOutputs.length ? `عدد الأخطاء: ${errorOutputs.length}` : 'لا توجد أخطاء مسجلة';
    // إحصائيات التقييم
    const feedbacks = weekLogs.map(l => l.feedback).filter(f => typeof f === 'number');
    const feedbackStats = feedbacks.length ? `أعلى تقييم: ${Math.max(...feedbacks)}, أقل تقييم: ${Math.min(...feedbacks)}, التقييمات: ${feedbacks.join(', ')}` : 'لا توجد تقييمات';
    // ملخص ذكي
    const summary = `- عدد التفاعلات: ${total}\n- متوسط التقييم الكلي: ${avg.toFixed(2)}\n- متوسط تقييم الأسبوع: ${weekAvg.toFixed(2)}\n- أكثر الأسئلة تكراراً:\n${topQuestions || 'لا يوجد'}\n- ${errorStats}\n- ${feedbackStats}`;
    const report = `تقرير التعلم الذاتي الأسبوعي:\n${summary}`;
    // حفظ التقرير في ملف
    const reportPath = path.join(__dirname, '../../data/self-learning-report-' + new Date().toISOString().slice(0,10) + '.txt');
    fs.writeFileSync(reportPath, report, 'utf8');
    // إرسال عبر البريد (اختياري)
    await sendReportByEmail('تقرير التعلم الذاتي الأسبوعي', report);
    // إرسال إلى Slack/Teams/Google Chat إذا تم تزويد روابط Webhook
    if (slackWebhook) await sendReportToWebhook(slackWebhook, report, 'slack');
    if (teamsWebhook) await sendReportToWebhook(teamsWebhook, report, 'teams');
    if (googleWebhook) await sendReportToWebhook(googleWebhook, report, 'google');
  });
}
