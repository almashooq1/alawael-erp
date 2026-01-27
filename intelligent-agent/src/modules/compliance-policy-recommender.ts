// خدمة توصيات سياسات الامتثال الذكية
import ComplianceEvent from '../models/compliance-event';
import CompliancePolicy from '../models/compliance-policy';
import axios from 'axios';

export async function recommendCompliancePolicies() {
  // تحليل السياسات الحالية والخروقات
  const policies = await CompliancePolicy.find({ enabled: true }).lean();
  const events = await ComplianceEvent.find({ status: { $in: ['fail', 'warning'] } }).lean();
  // تجميع أكثر السياسات تعرضًا للخرق
  const policyCounts: Record<string, number> = {};
  events.forEach(e => { if(e.policy) policyCounts[e.policy] = (policyCounts[e.policy]||0)+1; });
  const mostViolated = Object.entries(policyCounts).sort((a,b)=>b[1]-a[1]).slice(0,3);
  // توصية ذكية (OpenAI)
  let aiRecommendation = '';
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && mostViolated.length>0) {
      const prompt = `سياسات الامتثال الحالية: ${policies.map(p=>p.name+':'+(p.description||'')).join('; ')}.\nأكثر السياسات تعرضًا للخرق: ${mostViolated.map(([name,count])=>name+` (${count})`).join(', ')}.\nاقترح سياسات جديدة أو تعديلات للحد من الخروقات.`;
      const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{role:'user',content:prompt}]
      }, { headers: { Authorization: `Bearer ${apiKey}` } });
      aiRecommendation = resp.data.choices[0].message.content;
    }
  } catch {}
  return {
    mostViolated: mostViolated.map(([name,count])=>({policy:name,count})),
    aiRecommendation
  };
}
