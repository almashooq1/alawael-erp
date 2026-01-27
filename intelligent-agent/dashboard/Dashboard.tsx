
import ContractDashboardCharts from './ContractDashboardCharts';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    fetch('/dashboard/api/stats').then(r => r.json()).then(setStats);
  }, []);
  if (!stats) return <div>تحميل...</div>;
  return (
    <div style={{fontFamily:'Tahoma,Arial',maxWidth:900,margin:'auto'}}>
      <h2>لوحة تحكم الذكاء الذاتي</h2>
      <div style={{margin:'10px 0'}}>
        <button onClick={()=>window.open('/dashboard/api/export/pdf','_blank')}>تصدير PDF</button>
        <button onClick={()=>window.open('/dashboard/api/export/excel','_blank')} style={{marginRight:8}}>تصدير Excel</button>
      </div>
      <div>إجمالي التفاعلات: <b>{stats.total}</b></div>
      <div>تفاعلات هذا الأسبوع: <b>{stats.weekCount}</b></div>
      <div>عدد الأخطاء هذا الأسبوع: <b>{stats.errorCount}</b></div>
      <div>أكثر الأسئلة تكراراً:</div>
      <ul>
        {stats.topQuestions.map(([q, c]: [string, number]) => <li key={q}>{q} <b>({c})</b></li>)}
      </ul>
      {stats.feedbackStats && (
        <div>
          <div>أعلى تقييم: {stats.feedbackStats.max}</div>
          <div>أقل تقييم: {stats.feedbackStats.min}</div>
          <div>كل التقييمات: {stats.feedbackStats.all.join(', ')}</div>
        </div>
      )}
      <hr style={{margin:'32px 0'}} />
      <ContractDashboardCharts />
    </div>
  );
}
