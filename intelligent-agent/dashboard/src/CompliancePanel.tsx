import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useI18n, I18nProvider } from './i18n';

// Debounce utility
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

const statusColors: any = { fail: '#f5222d', warning: '#faad14', success: '#52c41a' };

  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState<any>({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const { t, lang, setLang } = useI18n();
  // Debounced filter values
  const debouncedStatus = useDebouncedValue(filterStatus, 300);
  const debouncedDate = useDebouncedValue(filterDate, 300);

  useEffect(() => {
    fetch('/v1/compliance/events').then(r=>r.json()).then(setEvents);
    fetch('/v1/compliance/alerts').then(r=>r.json()).then(setAlerts);
    fetch('/v1/compliance/stats').then(r=>r.json()).then(setStats);
  }, []);

  // Memoized filtered events with debounced filters
  const filteredEvents = useMemo(() =>
    events.filter((e:any) =>
      (debouncedStatus==='all' || e.status===debouncedStatus) &&
      (!debouncedDate || new Date(e.timestamp).toISOString().slice(0,10) === debouncedDate)
    ),
    [events, debouncedStatus, debouncedDate]
  );

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const pagedEvents = useMemo(() => {
    const start = (page-1)*pageSize;
    return filteredEvents.slice(start, start+pageSize);
  }, [filteredEvents, page]);

  useEffect(() => { setPage(1); }, [debouncedStatus, debouncedDate]);

  return (
    <div style={{fontFamily:'Tahoma,Arial',maxWidth:950,margin:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>{t('complianceMonitoring') || 'مراقبة الامتثال'}</h2>
        <div>
          <a href="/dashboard/analytics" target="_blank" style={{fontSize:16,color:'#1890ff',textDecoration:'underline',marginLeft:16}}>{t('advancedAnalytics') || 'لوحة التحليل المتقدم'}</a>
          <a href="/dashboard/policy" target="_blank" style={{fontSize:16,color:'#722ed1',textDecoration:'underline',marginLeft:8}}>{t('policyManagement') || 'إدارة السياسات'}</a>
          <label htmlFor="lang-switcher" style={{marginLeft:8,fontWeight:500}}>🌐</label>
          <select
            id="lang-switcher"
            aria-label="Language selector"
            value={lang}
            onChange={e=>setLang(e.target.value)}
            style={{padding:'2px 8px',fontSize:14,borderRadius:4,border:'1px solid #ccc',marginLeft:4}}
          >
            <option value="ar">🇸🇦 العربية</option>
            <option value="en">🇬🇧 English</option>
            <option value="fr">🇫🇷 Français</option>
          </select>
        </div>
      </div>
      <div style={{margin:'16px 0',display:'flex',alignItems:'center',gap:24}}>
        <span><b>{t('totalEvents') || 'إجمالي الأحداث'}:</b> {stats.total || 0}</span>
        <span><b>{t('byStatus') || 'حسب الحالة'}:</b> {stats.byStatus && stats.byStatus.map((s:any) => `${s._id}: ${s.count}`).join(' | ')}</span>
        <span>
          <label>{t('filterStatus') || 'تصفية الحالة'}: </label>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="all">{t('all') || 'الكل'}</option>
            <option value="fail">{t('fail') || 'فشل'}</option>
            <option value="warning">{t('warning') || 'تحذير'}</option>
            <option value="success">{t('success') || 'نجاح'}</option>
          </select>
        </span>
        <span>
          <label>{t('filterDate') || 'تصفية التاريخ'}: </label>
          <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} />
        </span>
      </div>
      <h3 style={{marginTop:24}}>{t('complianceAlerts') || 'تنبيهات الامتثال (فشل/تحذير)'}</h3>
      <ul style={{listStyle:'none',padding:0}}>
        {alerts.map(React.useMemo(
          () => (a:any) => (
            <li key={a._id} style={{
              background:a.status==='fail'?'#fff1f0':'#fffbe6',
              color:statusColors[a.status]||'#333',
              border:`1px solid ${statusColors[a.status]||'#d9d9d9'}`,
              borderRadius:6,
              margin:'8px 0',
              padding:'8px 12px',
              fontWeight:a.status==='fail'?'bold':'normal',
              fontSize:15
            }}>
              <span style={{fontWeight:'bold'}}>[{a.status==='fail'?t('fail'):t('warning')}]</span> {a.action} {t('onResource')} <b>{a.resource}</b> {a.resourceId && <span>({a.resourceId})</span>}<br/>
              <span style={{fontSize:13}}>{a.details} - {new Date(a.timestamp).toLocaleString()}</span>
            </li>
          ),
          []
        ))}
        {alerts.length===0 && <li style={{color:'#888'}}>{t('noCriticalAlerts')}</li>}
      </ul>
      <h3 style={{marginTop:32}}>{t('latestComplianceEvents') || 'أحدث أحداث الامتثال'}</h3>
      <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',fontSize:15,borderCollapse:'collapse',background:'#fff',boxShadow:'0 2px 8px #eee'}}>
        <thead style={{background:'#fafafa'}}>
          <tr>
            <th style={{padding:'8px 4px',borderBottom:'2px solid #eee'}}>{t('time')||'الوقت'}</th>
            <th style={{padding:'8px 4px',borderBottom:'2px solid #eee'}}>{t('user')||'المستخدم'}</th>
            <th style={{padding:'8px 4px',borderBottom:'2px solid #eee'}}>{t('action')||'الإجراء'}</th>
            <th style={{padding:'8px 4px',borderBottom:'2px solid #eee'}}>{t('resource')||'المورد'}</th>
            <th style={{padding:'8px 4px',borderBottom:'2px solid #eee'}}>{t('status')||'الحالة'}</th>
            <th style={{padding:'8px 4px',borderBottom:'2px solid #eee'}}>{t('policy')||'السياسة'}</th>
            <th style={{padding:'8px 4px',borderBottom:'2px solid #eee'}}>{t('details')||'تفاصيل'}</th>
          </tr>
        </thead>
        <tbody>
          {pagedEvents.map(React.useMemo(
            () => (e:any) => (
              <tr key={e._id} style={{background:e.status==='fail'?'#fff1f0':e.status==='warning'?'#fffbe6':'#fff'}}>
                <td style={{padding:'6px 4px'}}>{new Date(e.timestamp).toLocaleString()}</td>
                <td style={{padding:'6px 4px'}}>{e.userId||'-'}</td>
                <td style={{padding:'6px 4px'}}>{e.action}</td>
                <td style={{padding:'6px 4px'}}>{e.resource} {e.resourceId ? `(${e.resourceId})` : ''}</td>
                <td style={{padding:'6px 4px',color:statusColors[e.status]||'#333',fontWeight:'bold'}}>{t(e.status)||e.status}</td>
                <td style={{padding:'6px 4px'}}>{e.policy||'-'}</td>
                <td style={{padding:'6px 4px'}}>{e.details||'-'}</td>
              </tr>
            ),
            []
          ))}
          {filteredEvents.length===0 && <tr><td colSpan={7} style={{textAlign:'center',color:'#888'}}>{t('noEventsMatch')||'لا توجد أحداث مطابقة للفلاتر.'}</td></tr>}
        </tbody>
      </table>
      {/* Pagination controls */}
      {filteredEvents.length > pageSize && (
        <div style={{margin:'12px 0',textAlign:'center'}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>{t('prev')||'السابق'}</button>
          <span style={{margin:'0 12px'}}>{t('page')||'صفحة'} {page} {t('of')||'من'} {Math.ceil(filteredEvents.length/pageSize)}</span>
          <button onClick={()=>setPage(p=>Math.min(Math.ceil(filteredEvents.length/pageSize),p+1))} disabled={page===Math.ceil(filteredEvents.length/pageSize)}>{t('next')||'التالي'}</button>
        </div>
      )}
      </div>
    </div>
  );
}

export function CompliancePanelWithI18n() {
  return (
    <I18nProvider>
      <CompliancePanel />
    </I18nProvider>
  );
}
