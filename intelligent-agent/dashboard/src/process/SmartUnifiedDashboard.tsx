import React, { useMemo } from 'react';
import ProcessAnalytics from './ProcessAnalytics';
import { useI18n } from '../i18n';


// بيانات عمليات تجريبية لتحليل الأداء
const processes = [
  { id: 1, name: 'توظيف', duration: 5, overdue: false, failed: false },
  { id: 2, name: 'مراجعة الامتثال', duration: 12, overdue: true, failed: false },
  { id: 3, name: 'إعداد موظف', duration: 3, overdue: false, failed: false },
  { id: 4, name: 'تدقيق داخلي', duration: 15, overdue: true, failed: true },
  { id: 5, name: 'صرف مستحقات', duration: 2, overdue: false, failed: false },
];
const notifications = [
  { id: 1, type: 'info', message: 'تمت معالجة العملية رقم 123 بنجاح.' },
  { id: 2, type: 'warning', message: 'تأخر في تنفيذ مهمة مراجعة الامتثال.' },
];

const statusSummary = {
  totalProcesses: processes.length,
  running: 2,
  completed: 2,
  failed: processes.filter(p=>p.failed).length,
};


// منطق توصيات ذكية تلقائية بناءً على الأداء
export function getSmartRecommendations(processes: typeof processes) {
  const recs = [];
  if (processes.some(p => p.overdue)) {
    recs.push('هناك عمليات متأخرة. يوصى بمراجعة أسباب التأخير وتفعيل التنبيهات الفورية.');
  }
  if (processes.filter(p => p.failed).length > 0) {
    recs.push('تم رصد عمليات فاشلة. يوصى بمراجعة السياسات وتفعيل مراجعة تلقائية للأخطاء.');
  }
  const avgDuration = processes.reduce((a, p) => a + p.duration, 0) / processes.length;
  if (avgDuration > 8) {
    recs.push('متوسط مدة العمليات مرتفع. يوصى بتحسين سير العمل وتقسيم المهام.');
  }
  if (recs.length === 0) recs.push('لا توجد توصيات ذكية حالياً. الأداء جيد.');
  return recs;
}

const recommendations = getSmartRecommendations(processes);

export default function SmartUnifiedDashboard() {
  const { t } = useI18n();
  return (
    <div className="smart-unified-dashboard" style={{padding:24}}>
      <h2>{t('smartDashboard') || 'لوحة التحكم الذكية'}</h2>
      <section style={{marginBottom:24}}>
        <h3>{t('statusSummary') || 'ملخص الحالة'}</h3>
        <ul style={{display:'flex',gap:24,listStyle:'none',padding:0}}>
          <li>📋 {t('totalProcesses') || 'إجمالي العمليات'}: {statusSummary.totalProcesses}</li>
          <li>⏳ {t('running') || 'قيد التنفيذ'}: {statusSummary.running}</li>
          <li>✅ {t('completed') || 'مكتملة'}: {statusSummary.completed}</li>
          <li>❌ {t('failed') || 'فشلت'}: {statusSummary.failed}</li>
        </ul>
      </section>
      <section style={{marginBottom:24}}>
        <h3>{t('notifications') || 'التنبيهات'}</h3>
        <ul style={{listStyle:'none',padding:0}}>
          {notifications.map(n => (
            <li key={n.id} style={{marginBottom:8,color:n.type==='warning'?'#faad14':'#1890ff'}}>
              {n.type==='warning'?'⚠️':'ℹ️'} {n.message}
            </li>
          ))}
        </ul>
      </section>
      <section style={{marginBottom:24}}>
        <h3>{t('recommendations') || 'توصيات ذكية'}</h3>
        <ul style={{listStyle:'none',padding:0}}>
          {recommendations.map((rec,i) => (
            <li key={i} style={{marginBottom:8}}>💡 {rec}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>{t('analytics') || 'تحليلات العمليات'}</h3>
        <ProcessAnalytics stats={{}} delays={[]} recommendations={[]} />
      </section>
    </div>
  );
}
