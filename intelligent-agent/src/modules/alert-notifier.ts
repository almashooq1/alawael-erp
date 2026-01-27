import { InteractionLogger } from './interaction-logger';
import { sendMailSMTP } from './smtp-mailer';
import { sendReportToSlack, sendReportToTeams } from './report-notifiers';

// إعدادات التنبيه
const ERROR_THRESHOLD = 5; // عدد الأخطاء الأسبوعية المسموح بها
const FEEDBACK_MIN = 2; // أقل تقييم مسموح به

export async function checkAndNotifyAlerts() {
  const logs = InteractionLogger.getAll();
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekLogs = logs.filter(l => l.timestamp >= lastWeek);
  const errorCount = weekLogs.filter(l => l.output && (l.output.toLowerCase().includes('خطأ') || l.output.toLowerCase().includes('error'))).length;
  const lowFeedbacks = weekLogs.filter(l => typeof l.feedback === 'number' && l.feedback <= FEEDBACK_MIN);

  let alerts = [];
  if (errorCount > ERROR_THRESHOLD) {
    alerts.push(`تنبيه: عدد الأخطاء هذا الأسبوع مرتفع (${errorCount})`);
  }
  if (lowFeedbacks.length > 0) {
    alerts.push(`تنبيه: هناك تقييمات منخفضة (${lowFeedbacks.length}) أقل من ${FEEDBACK_MIN}`);
  }
  if (alerts.length) {
    // Email
    if (process.env.ALERT_EMAIL_TO) {
      await sendMailSMTP({
        to: process.env.ALERT_EMAIL_TO,
        subject: 'تنبيه ذكي من النظام',
        html: alerts.map(a => `<div>${a}</div>`).join('')
      });
    }
    // Slack
    if (process.env.ALERT_SLACK_WEBHOOK) {
      await sendReportToSlack(alerts.join('\n'), process.env.ALERT_SLACK_WEBHOOK);
    }
    // Teams
    if (process.env.ALERT_TEAMS_WEBHOOK) {
      await sendReportToTeams(alerts.join('\n'), process.env.ALERT_TEAMS_WEBHOOK);
    }
  }
  return alerts;
}
