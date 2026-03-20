import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3600';

/**
 * لوحة التقارير الذكية — Smart Reports Dashboard
 */
export default function ReportsDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [definitions, setDefinitions] = useState([]);
  const [generated, setGenerated] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, defRes, genRes, kpiRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/dashboard`),
        fetch(`${API_BASE}/api/reports/definitions`),
        fetch(`${API_BASE}/api/reports/generated?limit=10`),
        fetch(`${API_BASE}/api/reports/kpi`)
      ]);
      const [dashData, defData, genData, kpiData] = await Promise.all([dashRes.json(), defRes.json(), genRes.json(), kpiRes.json()]);
      setDashboard(dashData);
      setDefinitions(Array.isArray(defData) ? defData : []);
      setGenerated(genData.data || []);
      setKpi(kpiData);
    } catch (err) { console.error('Fetch error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateReport = async (reportId, format) => {
    setGenerating(reportId);
    try {
      const res = await fetch(`${API_BASE}/api/reports/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, format })
      });
      const data = await res.json();
      if (data.genId) { setTimeout(fetchData, 3000); }
    } catch (err) { console.error(err); }
    finally { setGenerating(null); }
  };

  const downloadReport = (genId) => { window.open(`${API_BASE}/api/reports/download/${genId}`, '_blank'); };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', direction: 'rtl' }}>⏳ جاري تحميل التقارير...</div>;

  const categoryLabels = { student: '🎓 الطلاب', financial: '💰 المالية', attendance: '📋 الحضور', hr: '👥 الموارد البشرية', academic: '📚 الأكاديمي', health: '🏥 الصحة', operational: '⚙️ التشغيل', compliance: '📜 الامتثال', custom: '🔧 مخصص' };
  const statusLabels = { pending: '⏳ قيد الانتظار', processing: '🔄 جاري الإنشاء', completed: '✅ مكتمل', failed: '❌ فشل' };

  const tabs = [
    { id: 'overview', label: '📊 نظرة عامة' },
    { id: 'definitions', label: '📋 تعريفات التقارير' },
    { id: 'generated', label: '📄 التقارير المولدة' },
    { id: 'kpi', label: '📈 مؤشرات الأداء' },
    { id: 'quick', label: '⚡ تقارير سريعة' }
  ];

  return (
    <div style={{ padding: 24, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h1 style={{ marginBottom: 24 }}>📊 التقارير والتحليلات الذكية</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, background: activeTab === tab.id ? '#1976d2' : '#e0e0e0', color: activeTab === tab.id ? '#fff' : '#333', fontWeight: activeTab === tab.id ? 'bold' : 'normal' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'تعريفات التقارير', value: dashboard?.reportDefinitions, color: '#1976d2', icon: '📋' },
              { label: 'إجمالي المولدة', value: dashboard?.totalGenerated, color: '#388e3c', icon: '📄' },
              { label: 'قيد الانتظار', value: dashboard?.pending, color: '#f57c00', icon: '⏳' },
              { label: 'مكتملة', value: dashboard?.completed, color: '#4caf50', icon: '✅' },
              { label: 'فاشلة', value: dashboard?.failed, color: '#d32f2f', icon: '❌' },
              { label: 'جداول نشطة', value: dashboard?.activeSchedules, color: '#7b1fa2', icon: '📅' }
            ].map((card, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRight: `4px solid ${card.color}` }}>
                <div style={{ fontSize: 28 }}>{card.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: card.color }}>{card.value ?? 0}</div>
                <div style={{ color: '#666', fontSize: 14 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Categories breakdown */}
          {dashboard?.categories?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3>التقارير حسب الفئة</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {dashboard.categories.map(cat => (
                  <div key={cat._id} style={{ background: '#f5f5f5', borderRadius: 8, padding: '8px 16px' }}>
                    {categoryLabels[cat._id] || cat._id}: <strong>{cat.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Definitions Tab */}
      {activeTab === 'definitions' && (
        <div>
          <h2>📋 تعريفات التقارير المتاحة</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {definitions.map(def => (
              <div key={def.reportId} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 16 }}>{def.nameAr}</div>
                  <div style={{ color: '#666', fontSize: 13 }}>{categoryLabels[def.category] || def.category} | {def.code}</div>
                  {def.description && <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>{def.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => generateReport(def.reportId, 'pdf')} disabled={generating === def.reportId} style={{ padding: '8px 16px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                    {generating === def.reportId ? '⏳' : '📕 PDF'}
                  </button>
                  <button onClick={() => generateReport(def.reportId, 'excel')} disabled={generating === def.reportId} style={{ padding: '8px 16px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                    {generating === def.reportId ? '⏳' : '📗 Excel'}
                  </button>
                </div>
              </div>
            ))}
            {definitions.length === 0 && <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>لا توجد تعريفات تقارير بعد</div>}
          </div>
        </div>
      )}

      {/* Generated Tab */}
      {activeTab === 'generated' && (
        <div>
          <h2>📄 التقارير المولدة</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {generated.map(gen => (
              <div key={gen.genId} style={{ background: '#fff', borderRadius: 8, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{gen.nameAr}</div>
                  <div style={{ color: '#666', fontSize: 12 }}>
                    {statusLabels[gen.status] || gen.status} | {gen.format?.toUpperCase()} | {gen.rowCount ? `${gen.rowCount} سجل` : ''}
                  </div>
                  <div style={{ color: '#999', fontSize: 11 }}>{new Date(gen.createdAt).toLocaleString('ar-SA')}</div>
                </div>
                {gen.status === 'completed' && (
                  <button onClick={() => downloadReport(gen.genId)} style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    ⬇️ تحميل
                  </button>
                )}
              </div>
            ))}
            {generated.length === 0 && <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>لم يتم إنشاء تقارير بعد</div>}
          </div>
        </div>
      )}

      {/* KPI Tab */}
      {activeTab === 'kpi' && kpi && (
        <div>
          <h2>📈 مؤشرات الأداء الرئيسية</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {kpi.metrics && Object.entries({
              totalStudents: { label: 'إجمالي الطلاب', icon: '🎓' },
              activeStudents: { label: 'الطلاب النشطين', icon: '✅' },
              totalStaff: { label: 'إجمالي الموظفين', icon: '👥' },
              attendanceRate: { label: 'نسبة الحضور', icon: '📋', suffix: '%' },
              feeCollectionRate: { label: 'نسبة تحصيل الرسوم', icon: '💰', suffix: '%' },
              outstandingFees: { label: 'رسوم مستحقة', icon: '💳', prefix: 'ر.س ' },
              totalRevenue: { label: 'إجمالي الإيرادات', icon: '📈', prefix: 'ر.س ' },
              occupancyRate: { label: 'نسبة الإشغال', icon: '🏢', suffix: '%' },
              incidentCount: { label: 'الحوادث', icon: '🚨' },
              maintenanceRequests: { label: 'طلبات الصيانة', icon: '🔧' }
            }).map(([key, meta]) => (
              <div key={key} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: 24 }}>{meta.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
                  {meta.prefix || ''}{kpi.metrics[key] !== undefined ? kpi.metrics[key].toLocaleString('ar-SA') : '—'}{meta.suffix || ''}
                </div>
                <div style={{ color: '#666', fontSize: 13 }}>{meta.label}</div>
              </div>
            ))}
          </div>
          {kpi.date && <div style={{ textAlign: 'center', color: '#999', marginTop: 16 }}>آخر تحديث: {new Date(kpi.date).toLocaleString('ar-SA')}</div>}
        </div>
      )}

      {/* Quick Reports Tab */}
      {activeTab === 'quick' && <QuickReportsTab />}
    </div>
  );
}

function QuickReportsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const API = process.env.REACT_APP_API_URL || 'http://localhost:3600';

  const quickReports = [
    { id: 'attendance-summary', label: '📋 ملخص الحضور', endpoint: '/api/reports/quick/attendance-summary' },
    { id: 'financial-summary', label: '💰 الملخص المالي', endpoint: '/api/reports/quick/financial-summary' },
    { id: 'student-overview', label: '🎓 نظرة عامة على الطلاب', endpoint: '/api/reports/quick/student-overview' },
    { id: 'operational', label: '⚙️ التقرير التشغيلي', endpoint: '/api/reports/quick/operational' }
  ];

  const loadReport = async (report) => {
    setSelected(report.id);
    setLoading(true);
    try {
      const res = await fetch(`${API}${report.endpoint}`);
      setData(await res.json());
    } catch (err) { setData({ error: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2>⚡ تقارير سريعة</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {quickReports.map(r => (
          <button key={r.id} onClick={() => loadReport(r)} style={{ padding: '12px 24px', background: selected === r.id ? '#1976d2' : '#fff', color: selected === r.id ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            {r.label}
          </button>
        ))}
      </div>
      {loading && <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري التحميل...</div>}
      {data && !loading && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <pre style={{ direction: 'ltr', overflow: 'auto', maxHeight: 500, fontSize: 13 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
