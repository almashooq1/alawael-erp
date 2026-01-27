// خدمة إرسال ملخص أسبوعي تلقائي لحالة الامتثال عبر البريد وSlack
import { getComplianceStats } from './compliance-stats';
import { analyzeComplianceAI } from './compliance-ai';
import config from './config';
import { EmailService } from './email-service';
import axios from 'axios';

export async function sendWeeklyComplianceSummary() {
  // احصل على إحصائيات الأسبوع الأخير
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7*24*60*60*1000);
  const stats = await getComplianceStats({ from: weekAgo, to: now });
  const ai = await analyzeComplianceAI();

  // بناء نص الملخص
  let summary = `ملخص الامتثال للأسبوع الأخير (من ${weekAgo.toLocaleDateString()} إلى ${now.toLocaleDateString()}):\n`;
  summary += `- إجمالي الأحداث: ${ai.total}\n`;
  summary += `- فشل: ${ai.failCount}, تحذير: ${ai.warningCount}, نجاح: ${ai.successCount}\n`;
  summary += `- أعلى السياسات اختراقًا: ${stats.byPolicy.map(p=>`${p._id||'-'} (${p.count})`).join(', ')}\n`;
  summary += `- أعلى الموارد تعرضًا للخرق: ${stats.byResource.map(r=>`${r._id||'-'} (${r.count})`).join(', ')}\n`;
  summary += `- توصية ذكية: ${ai.aiAdvice}\n`;
  if (ai.openaiSummary) summary += `- تحليل AI: ${ai.openaiSummary}\n`;

  // إرسال عبر البريد
  try {
    const emailHost = config.get('EMAIL_HOST');
    const emailPort = Number(config.get('EMAIL_PORT', 587));
    const emailUser = config.get('EMAIL_USER');
    const emailPass = config.get('EMAIL_PASS');
    const emailTo = config.get('COMPLIANCE_SUMMARY_EMAIL', 'admin@system.com');
    if (emailHost && emailUser && emailPass) {
      const emailService = new EmailService(emailHost, emailPort, emailUser, emailPass);
      await emailService.send(emailTo, 'ملخص الامتثال الأسبوعي', summary);
    }
  } catch {}

  // إرسال عبر Slack
  try {
    const slackUrl = config.get('SLACK_WEBHOOK_URL');
    if (slackUrl) {
      await axios.post(slackUrl, { text: `📊 *ملخص الامتثال الأسبوعي*\n${summary}` });
    }
  } catch {}
}

// ملاحظة: أضف مهمة مجدولة (cron) في السيرفر لاستدعاء sendWeeklyComplianceSummary كل أسبوع.
