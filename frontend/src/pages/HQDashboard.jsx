/**
 * HQDashboard.jsx — لوحة تحكم المقر الرئيسي (الرياض)
 * HQ Executive Dashboard for 12-branch rehabilitation network
 *
 * Access: hq_super_admin, hq_admin only
 * API:    GET /api/branch-management/hq/dashboard
 *         GET /api/branch-management/hq/comparison
 *         GET /api/branch-management/hq/alerts
 *         GET /api/branch-management/hq/financials
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = '/api/branch-management';

const BRANCH_REGIONS = {
  الرياض: ['HQ', 'RY-MAIN', 'RY-NORTH'],
  جدة: ['JD-MAIN', 'JD-SOUTH'],
  'المنطقة الشرقية': ['DM', 'KH'],
  'الغرب والوسط': ['TF', 'TB', 'MD', 'QS', 'HL', 'AB'],
};

const STATUS_COLOR = {
  active: '#10b981',
  inactive: '#6b7280',
  maintenance: '#f59e0b',
};

const ALERT_COLOR = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

// ─── API Helpers ──────────────────────────────────────────────────────────────
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const apiFetch = async (url) => {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** KPI Card */
const KPICard = ({ title, value, unit = '', change, color = '#3b82f6', icon }) => (
  <div style={{
    background: '#fff',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    borderTop: `4px solid ${color}`,
    minWidth: 180,
    flex: 1,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{title}</p>
        <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700, color: '#111827' }}>
          {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
          {unit && <span style={{ fontSize: 14, color: '#6b7280', marginRight: 4 }}>{unit}</span>}
        </p>
        {change !== undefined && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: change >= 0 ? '#10b981' : '#ef4444' }}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% مقارنة بالشهر الماضي
          </p>
        )}
      </div>
      {icon && <span style={{ fontSize: 28 }}>{icon}</span>}
    </div>
  </div>
);

/** Branch Status Badge */
const StatusBadge = ({ status }) => (
  <span style={{
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: `${STATUS_COLOR[status] || '#6b7280'}20`,
    color: STATUS_COLOR[status] || '#6b7280',
  }}>
    {status === 'active' ? 'نشط' : status === 'maintenance' ? 'صيانة' : 'غير نشط'}
  </span>
);

/** Alert Item */
const AlertItem = ({ alert }) => (
  <div style={{
    display: 'flex',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'flex-start',
  }}>
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: ALERT_COLOR[alert.type] || '#6b7280',
      marginTop: 6, flexShrink: 0,
    }} />
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{alert.message}</p>
      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>
        {alert.branch_code} · {new Date(alert.created_at || Date.now()).toLocaleDateString('ar-SA')}
      </p>
    </div>
  </div>
);

/** Branch Row in table */
const BranchRow = ({ branch, onSelect }) => (
  <tr
    onClick={() => onSelect(branch.code)}
    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <td style={tdStyle}><strong>{branch.code}</strong></td>
    <td style={tdStyle}>{branch.name_ar}</td>
    <td style={tdStyle}><StatusBadge status={branch.status} /></td>
    <td style={tdStyle}>{branch.stats?.patients_today ?? '—'}</td>
    <td style={tdStyle}>{branch.stats?.sessions_today ?? '—'}</td>
    <td style={tdStyle}>
      <div style={{
        background: '#e5e7eb', borderRadius: 4, height: 8, width: 100, overflow: 'hidden',
      }}>
        <div style={{
          width: `${branch.stats?.capacity_utilization ?? 0}%`,
          height: '100%',
          background: (branch.stats?.capacity_utilization ?? 0) > 85 ? '#ef4444' : '#10b981',
          borderRadius: 4,
        }} />
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', marginRight: 4 }}>
        {branch.stats?.capacity_utilization ?? 0}%
      </span>
    </td>
    <td style={tdStyle}>
      {branch.stats?.monthly_revenue
        ? `${(branch.stats.monthly_revenue / 1000).toFixed(0)}K ر.س`
        : '—'}
    </td>
  </tr>
);

const tdStyle = {
  padding: '12px 16px',
  fontSize: 13,
  color: '#374151',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
};

const thStyle = {
  ...tdStyle,
  fontWeight: 600,
  color: '#6b7280',
  background: '#f9fafb',
  fontSize: 12,
  textTransform: 'uppercase',
};

// ─── Main Component ───────────────────────────────────────────────────────────
const HQDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview | financials | comparison
  const [filterRegion, setFilterRegion] = useState('all');

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, alertsRes, finRes] = await Promise.all([
        apiFetch(`${API_BASE}/hq/dashboard`),
        apiFetch(`${API_BASE}/hq/alerts`),
        apiFetch(`${API_BASE}/hq/financials`),
      ]);
      setDashboard(dashRes.data || dashRes);
      setAlerts(alertsRes.data?.alerts || alertsRes.alerts || []);
      setFinancials(finRes.data || finRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const timer = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadData]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const branches = dashboard?.branches || [];
  const summary = dashboard?.summary || {};
  const kpis = dashboard?.kpis || {};

  const filteredBranches = filterRegion === 'all'
    ? branches
    : branches.filter(b => BRANCH_REGIONS[filterRegion]?.includes(b.code));

  const criticalAlerts = alerts.filter(a => a.type === 'critical');
  const warningAlerts = alerts.filter(a => a.type === 'warning');

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, border: '4px solid #e5e7eb',
          borderTopColor: '#3b82f6', borderRadius: '50%',
          animation: 'spin 1s linear infinite', margin: '0 auto 16px',
        }} />
        <p style={{ color: '#6b7280', margin: 0 }}>جارٍ تحميل لوحة التحكم…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>
      <p style={{ fontSize: 18, marginBottom: 8 }}>⚠️ خطأ في تحميل البيانات</p>
      <p style={{ color: '#6b7280', fontSize: 14 }}>{error}</p>
      <button
        onClick={loadData}
        style={{
          marginTop: 16, padding: '8px 24px', background: '#3b82f6',
          color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
        }}
      >
        إعادة المحاولة
      </button>
    </div>
  );

  return (
    <div dir="rtl" style={{ fontFamily: "'Segoe UI', 'Arial', sans-serif", background: '#f8fafc', minHeight: '100vh', padding: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>
            🏢 لوحة تحكم المقر الرئيسي — الرياض
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            شبكة مراكز الأوائل للتأهيل · {branches.length} فرع · آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {criticalAlerts.length > 0 && (
            <span style={{
              background: '#fef2f2', color: '#ef4444', padding: '6px 14px',
              borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid #fee2e2',
            }}>
              🔴 {criticalAlerts.length} تنبيه حرج
            </span>
          )}
          <button
            onClick={loadData}
            style={{
              padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#374151',
            }}
          >
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <KPICard
          title="إجمالي المرضى اليوم"
          value={summary.total_patients_today ?? 0}
          change={summary.patients_change}
          color="#3b82f6"
          icon="👥"
        />
        <KPICard
          title="الجلسات اليوم"
          value={summary.total_sessions_today ?? 0}
          change={summary.sessions_change}
          color="#10b981"
          icon="📋"
        />
        <KPICard
          title="الإيرادات هذا الشهر"
          value={summary.monthly_revenue ?? 0}
          unit="ر.س"
          change={summary.revenue_change}
          color="#f59e0b"
          icon="💰"
        />
        <KPICard
          title="الفروع النشطة"
          value={`${summary.active_branches ?? 0} / ${branches.length}`}
          color="#8b5cf6"
          icon="🏥"
        />
        <KPICard
          title="متوسط نسبة الإشغال"
          value={summary.avg_capacity_utilization ?? 0}
          unit="%"
          color="#06b6d4"
          icon="📊"
        />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#fff', borderRadius: 10, padding: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', width: 'fit-content' }}>
        {[
          { key: 'overview', label: '🗺️ نظرة عامة' },
          { key: 'financials', label: '💵 الماليات الموحدة' },
          { key: 'comparison', label: '📊 المقارنة بين الفروع' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 20px', border: 'none', cursor: 'pointer', borderRadius: 8,
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: activeTab === tab.key ? '#3b82f6' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#6b7280',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Left Column — Main content */}
        <div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  جميع الفروع — لحظة حقيقية
                </h2>
                <select
                  value={filterRegion}
                  onChange={e => setFilterRegion(e.target.value)}
                  style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
                >
                  <option value="all">جميع المناطق</option>
                  {Object.keys(BRANCH_REGIONS).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>الرمز</th>
                      <th style={thStyle}>الفرع</th>
                      <th style={thStyle}>الحالة</th>
                      <th style={thStyle}>مرضى اليوم</th>
                      <th style={thStyle}>جلسات اليوم</th>
                      <th style={thStyle}>نسبة الإشغال</th>
                      <th style={thStyle}>الإيراد (شهري)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBranches.length > 0
                      ? filteredBranches.map(b => (
                          <BranchRow
                            key={b.code}
                            branch={b}
                            onSelect={(code) => window.location.href = `/branch/${code}`}
                          />
                        ))
                      : (
                        <tr>
                          <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: 32 }}>
                            لا توجد فروع في هذه المنطقة
                          </td>
                        </tr>
                      )
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financials Tab */}
          {activeTab === 'financials' && financials && (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 24 }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>الماليات الموحدة لجميع الفروع</h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <KPICard title="إجمالي الإيرادات" value={financials.total_revenue ?? 0} unit="ر.س" color="#10b981" icon="📈" />
                <KPICard title="إجمالي المصروفات" value={financials.total_expenses ?? 0} unit="ر.س" color="#ef4444" icon="📉" />
                <KPICard title="صافي الربح" value={financials.net_profit ?? 0} unit="ر.س" color="#3b82f6" icon="💎" />
                <KPICard title="نسبة الربحية" value={financials.profit_margin ?? 0} unit="%" color="#8b5cf6" icon="%" />
              </div>
              {/* Branch-by-branch breakdown */}
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#374151' }}>تفصيل حسب الفرع</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>الفرع</th>
                    <th style={thStyle}>الإيرادات</th>
                    <th style={thStyle}>المصروفات</th>
                    <th style={thStyle}>صافي الربح</th>
                    <th style={thStyle}>تحقيق الهدف</th>
                  </tr>
                </thead>
                <tbody>
                  {(financials.by_branch || []).map(b => (
                    <tr key={b.branch_code}>
                      <td style={tdStyle}><strong>{b.branch_code}</strong> — {b.name_ar}</td>
                      <td style={tdStyle}>{(b.revenue || 0).toLocaleString('ar-SA')} ر.س</td>
                      <td style={tdStyle}>{(b.expenses || 0).toLocaleString('ar-SA')} ر.س</td>
                      <td style={{ ...tdStyle, color: b.net_profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {(b.net_profit || 0).toLocaleString('ar-SA')} ر.س
                      </td>
                      <td style={tdStyle}>
                        <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, width: 120, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(b.target_achievement || 0, 100)}%`,
                            height: '100%',
                            background: (b.target_achievement || 0) >= 90 ? '#10b981' : (b.target_achievement || 0) >= 70 ? '#f59e0b' : '#ef4444',
                            borderRadius: 4,
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>{b.target_achievement ?? 0}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Comparison Tab */}
          {activeTab === 'comparison' && (
            <ComparisonTab branches={branches} />
          )}
        </div>

        {/* Right Column — Alerts & Quick Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Alerts Panel */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>🔔 التنبيهات</h3>
              <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                {alerts.length}
              </span>
            </div>
            {alerts.length === 0
              ? <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 16 }}>✅ لا توجد تنبيهات نشطة</p>
              : alerts.slice(0, 8).map((a, i) => <AlertItem key={i} alert={a} />)
            }
          </div>

          {/* Top Performers */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>🏆 أفضل الفروع أداءً</h3>
            {(dashboard?.top_performers || []).slice(0, 5).map((b, i) => (
              <div key={b.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : '#cd7c2f',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{b.name_ar || b.code}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>مؤشر الأداء: {b.performance_score ?? 0}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Access */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>⚡ وصول سريع</h3>
            {[
              { label: '📋 سجل المراجعة', href: '/audit-log' },
              { label: '⚠️ التجاوز الطارئ', href: '/emergency-override' },
              { label: '👥 محسّن الكوادر', href: '/staff-optimizer' },
              { label: '🔐 مصفوفة الصلاحيات', href: '/permissions-matrix' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  display: 'block', padding: '10px 12px', marginBottom: 8,
                  background: '#f8fafc', borderRadius: 8, color: '#374151',
                  textDecoration: 'none', fontSize: 13, fontWeight: 500,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                {link.label}
              </a>
            ))}
          </div>

        </div>
      </div>

      {/* CSS for spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// ─── Comparison Tab ───────────────────────────────────────────────────────────
const ComparisonTab = ({ branches }) => {
  const [metric, setMetric] = useState('capacity_utilization');
  const [compData, setCompData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const codes = branches.map(b => b.code).join(',');
        const res = await apiFetch(`${API_BASE}/hq/comparison?branches=${codes}&metric=${metric}`);
        setCompData(res.data || res);
      } catch {
        setCompData(null);
      } finally {
        setLoading(false);
      }
    };
    if (branches.length > 0) load();
  }, [metric, branches]);

  const rows = compData?.comparison || branches.map(b => ({
    code: b.code,
    name_ar: b.name_ar,
    value: b.stats?.[metric] ?? 0,
  }));

  const maxVal = Math.max(...rows.map(r => r.value || 0), 1);

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>مقارنة الفروع</h2>
        <select
          value={metric}
          onChange={e => setMetric(e.target.value)}
          style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
        >
          <option value="capacity_utilization">نسبة الإشغال</option>
          <option value="patients_today">مرضى اليوم</option>
          <option value="sessions_today">الجلسات</option>
          <option value="monthly_revenue">الإيرادات الشهرية</option>
          <option value="satisfaction_score">رضا الأسر</option>
        </select>
      </div>

      {loading
        ? <p style={{ textAlign: 'center', color: '#9ca3af' }}>جارٍ التحميل…</p>
        : rows.sort((a, b) => (b.value || 0) - (a.value || 0)).map(row => (
          <div key={row.code} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                {row.code} — {row.name_ar}
              </span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {typeof row.value === 'number' ? row.value.toLocaleString('ar-SA') : row.value}
              </span>
            </div>
            <div style={{ background: '#e5e7eb', borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{
                width: `${((row.value || 0) / maxVal) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                borderRadius: 6,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        ))
      }
    </div>
  );
};

export default HQDashboard;
