"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeComplianceAI = analyzeComplianceAI;
// خدمة التحليل الذكي للامتثال (تجميع الأنماط والتنبؤ بالخروقات)
const compliance_event_1 = __importDefault(require("../models/compliance-event"));
const axios_1 = __importDefault(require("axios"));
async function analyzeComplianceAI() {
    // تجميع بيانات آخر 90 يومًا
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const events = await compliance_event_1.default.find({ timestamp: { $gte: since } }).lean();
    // إحصائيات أساسية
    const total = events.length;
    const failCount = events.filter(e => e.status === 'fail').length;
    const warningCount = events.filter(e => e.status === 'warning').length;
    const successCount = events.filter(e => e.status === 'success').length;
    // توزيع حسب اليوم
    const byDay = {};
    events.forEach(e => {
        const d = new Date(e.timestamp).toISOString().slice(0, 10);
        byDay[d] = (byDay[d] || 0) + 1;
    });
    // توقع بسيط: إذا زادت الخروقات في آخر 7 أيام عن المتوسط، توقع تصعيد
    const last7 = Object.entries(byDay).slice(-7).map(e => e[1]);
    const avg = total / 90;
    const last7avg = last7.reduce((a, b) => a + b, 0) / 7;
    const escalationRisk = last7avg > avg * 1.5 ? 'مرتفع' : last7avg > avg ? 'متوسط' : 'منخفض';
    // توصية ذكية (يمكن ربطها مع OpenAI لاحقًا)
    let aiAdvice = 'النظام مستقر.';
    if (escalationRisk === 'مرتفع')
        aiAdvice = 'يوصى بمراجعة السياسات وتكثيف الرقابة.';
    else if (escalationRisk === 'متوسط')
        aiAdvice = 'يرجى مراقبة الخروقات عن كثب.';
    // (اختياري) تكامل مع OpenAI لتحليل نصي أعمق
    let openaiSummary = '';
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey && events.length > 0) {
            const prompt = `لديك بيانات امتثال لآخر 90 يومًا: عدد الأحداث ${total}، فشل ${failCount}، تحذير ${warningCount}، نجاح ${successCount}. ما هي أهم المخاطر والتوصيات؟`;
            const resp = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }]
            }, { headers: { Authorization: `Bearer ${apiKey}` } });
            openaiSummary = resp.data.choices[0].message.content;
        }
    }
    catch { }
    return {
        total, failCount, warningCount, successCount, escalationRisk, aiAdvice, openaiSummary
    };
}
