import React from 'react';

export default function CrmAIDashboard({ customers = [], opportunities = [], tickets = [] }) {
  // مثال: تحليل العملاء النشطين
  const activeCustomers = customers.filter(c => c.status === 'active');
  // مثال: تصنيف الفرص حسب المرحلة
  const stageCounts = opportunities.reduce((acc, o) => {
    acc[o.stage] = (acc[o.stage] || 0) + 1;
    return acc;
  }, {});
  // مثال: تنبيه ذكي
  const urgentTickets = tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved');

  return (
    <div style={{marginTop:32,background:'#f6ffed',border:'1px solid #b7eb8f',borderRadius:8,padding:24}}>
      <h3>🔎 CRM AI Insights</h3>
      <div>Active Customers: <b>{activeCustomers.length}</b></div>
      <div style={{margin:'8px 0'}}>Opportunities by Stage:</div>
      <ul>
        {Object.entries(stageCounts).map(([stage, count]) => (
          <li key={stage}>{stage}: <b>{count}</b></li>
        ))}
      </ul>
      {urgentTickets.length > 0 && (
        <div style={{color:'#cf1322',marginTop:12}}>
          ⚠️ Urgent tickets need attention: <b>{urgentTickets.length}</b>
        </div>
      )}
      {/* يمكن إضافة توصيات ذكية وتحليلات أعمق هنا */}
    </div>
  );
}
