// متابعة تلقائية: جدولة وإرسال تقارير شاملة عبر البريد وSlack وTeams
import { Scheduler } from './scheduler';
import { InteractionLogger } from './interaction-logger';
import { EmailService } from './email-service';
import { sendSlackMessage } from './slack-notifier';
import { sendTeamsMessage } from './teams-notifier';
import config from './config';

const scheduler = new Scheduler();

async function sendFollowupReport() {
  const logs = InteractionLogger.getAll();
  const total = logs.length;
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
  const errorCount = weekLogs.filter(l => l.output && (l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'))).length;
  const topQuestions = Object.entries(
    weekLogs.reduce((acc, l) => {
      const q = (l.input || '').trim();
      if (q) acc[q] = (acc[q] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const feedbacks = weekLogs.map(l => l.feedback).filter(f => typeof f === 'number');
  const summary =
    `متابعة أسبوعية للنظام:\n` +
    `إجمالي التفاعلات: ${total}\n` +
    `تفاعلات الأسبوع: ${weekLogs.length}\n` +
    `عدد الأخطاء: ${errorCount}\n` +
    `أكثر الأسئلة تكراراً: ${topQuestions.map(([q, c]) => `${q} (${c})`).join(', ')}\n` +
    (feedbacks.length ? `أعلى تقييم: ${Math.max(...feedbacks)}, أقل تقييم: ${Math.min(...feedbacks)}` : '');

  // إرسال عبر البريد
  try {
    const email = new EmailService(
      config.get('SMTP_HOST', 'localhost'),
      Number(config.get('SMTP_PORT', 587)),
      config.get('SMTP_USER', ''),
      config.get('SMTP_PASS', '')
    );
    await email.send(config.get('ADMIN_EMAIL', 'admin@system.com'), 'متابعة أسبوعية للنظام', summary);
  } catch (e) { /* ignore */ }

  // إرسال عبر Slack
  try { await sendSlackMessage(summary); } catch (e) { /* ignore */ }
  // إرسال عبر Teams
  try { await sendTeamsMessage(summary); } catch (e) { /* ignore */ }
}

// جدولة أسبوعية (كل 7 أيام)
scheduler.repeat(7 * 24 * 60 * 60 * 1000, sendFollowupReport);

// للتجربة: يمكن استدعاء sendFollowupReport() يدوياً
export { sendFollowupReport };
