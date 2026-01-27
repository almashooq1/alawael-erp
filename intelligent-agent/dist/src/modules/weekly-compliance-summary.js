"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWeeklyComplianceSummary = sendWeeklyComplianceSummary;
// خدمة إرسال ملخص أسبوعي تلقائي لحالة الامتثال عبر البريد وSlack
const compliance_stats_1 = require("./compliance-stats");
const compliance_ai_1 = require("./compliance-ai");
const config_1 = __importDefault(require("./config"));
const email_service_1 = require("./email-service");
const axios_1 = __importDefault(require("axios"));
async function sendWeeklyComplianceSummary() {
    // احصل على إحصائيات الأسبوع الأخير
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const stats = await (0, compliance_stats_1.getComplianceStats)({ from: weekAgo, to: now });
    const ai = await (0, compliance_ai_1.analyzeComplianceAI)();
    // بناء نص الملخص
    let summary = `ملخص الامتثال للأسبوع الأخير (من ${weekAgo.toLocaleDateString()} إلى ${now.toLocaleDateString()}):\n`;
    summary += `- إجمالي الأحداث: ${ai.total}\n`;
    summary += `- فشل: ${ai.failCount}, تحذير: ${ai.warningCount}, نجاح: ${ai.successCount}\n`;
    summary += `- أعلى السياسات اختراقًا: ${stats.byPolicy.map(p => `${p._id || '-'} (${p.count})`).join(', ')}\n`;
    summary += `- أعلى الموارد تعرضًا للخرق: ${stats.byResource.map(r => `${r._id || '-'} (${r.count})`).join(', ')}\n`;
    summary += `- توصية ذكية: ${ai.aiAdvice}\n`;
    if (ai.openaiSummary)
        summary += `- تحليل AI: ${ai.openaiSummary}\n`;
    // إرسال عبر البريد
    try {
        const emailHost = config_1.default.get('EMAIL_HOST');
        const emailPort = Number(config_1.default.get('EMAIL_PORT', 587));
        const emailUser = config_1.default.get('EMAIL_USER');
        const emailPass = config_1.default.get('EMAIL_PASS');
        const emailTo = config_1.default.get('COMPLIANCE_SUMMARY_EMAIL', 'admin@system.com');
        if (emailHost && emailUser && emailPass) {
            const emailService = new email_service_1.EmailService(emailHost, emailPort, emailUser, emailPass);
            await emailService.send(emailTo, 'ملخص الامتثال الأسبوعي', summary);
        }
    }
    catch { }
    // إرسال عبر Slack
    try {
        const slackUrl = config_1.default.get('SLACK_WEBHOOK_URL');
        if (slackUrl) {
            await axios_1.default.post(slackUrl, { text: `📊 *ملخص الامتثال الأسبوعي*\n${summary}` });
        }
    }
    catch { }
}
// ملاحظة: أضف مهمة مجدولة (cron) في السيرفر لاستدعاء sendWeeklyComplianceSummary كل أسبوع.
