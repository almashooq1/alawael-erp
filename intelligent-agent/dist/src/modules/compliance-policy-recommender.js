"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendCompliancePolicies = recommendCompliancePolicies;
// خدمة توصيات سياسات الامتثال الذكية
const compliance_event_1 = __importDefault(require("../models/compliance-event"));
const compliance_policy_1 = __importDefault(require("../models/compliance-policy"));
const axios_1 = __importDefault(require("axios"));
async function recommendCompliancePolicies() {
    // تحليل السياسات الحالية والخروقات
    const policies = await compliance_policy_1.default.find({ enabled: true }).lean();
    const events = await compliance_event_1.default.find({ status: { $in: ['fail', 'warning'] } }).lean();
    // تجميع أكثر السياسات تعرضًا للخرق
    const policyCounts = {};
    events.forEach(e => { if (e.policy)
        policyCounts[e.policy] = (policyCounts[e.policy] || 0) + 1; });
    const mostViolated = Object.entries(policyCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    // توصية ذكية (OpenAI)
    let aiRecommendation = '';
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey && mostViolated.length > 0) {
            const prompt = `سياسات الامتثال الحالية: ${policies.map(p => p.name + ':' + (p.description || '')).join('; ')}.\nأكثر السياسات تعرضًا للخرق: ${mostViolated.map(([name, count]) => name + ` (${count})`).join(', ')}.\nاقترح سياسات جديدة أو تعديلات للحد من الخروقات.`;
            const resp = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }]
            }, { headers: { Authorization: `Bearer ${apiKey}` } });
            aiRecommendation = resp.data.choices[0].message.content;
        }
    }
    catch { }
    return {
        mostViolated: mostViolated.map(([name, count]) => ({ policy: name, count })),
        aiRecommendation
    };
}
