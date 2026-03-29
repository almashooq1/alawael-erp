/**
 * BranchDashboard.jsx — لوحة تحكم مدير الفرع
 * Branch Manager Dashboard — Real-time branch operations
 *
 * Access: branch_manager (own branch), hq_admin, hq_super_admin (any branch)
 * API:    GET /api/branch-management/:branch_code/dashboard
 *         GET /api/branch-management/:branch_code/patients
 *         GET /api/branch-management/:branch_code/schedule
 *         GET /api/branch-management/:branch_code/kpis
 *         GET /api/branch-management/:branch_code/transport
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = '/api/branch-management';

const MODULES = [
  { key: 'overview',   label: '📊 نظرة عامة',    roles: ['all'] },
  { key: 'patients',   label: '👥 المرضى',        roles: ['branch_manager', 'therapist', 'receptionist'] },
  { key: 'schedule',   label: '📅 الجدول',        roles: ['branch_manager', 'therapist'] },
  { key: 'transport',  label: '🚌 النقل',          roles: ['branch_manager', 'driver'] },
  { key: 'kpis',       label: '📈 مؤشرات الأداء', roles: ['branch_manager'] },
];

const SESSION_STATUS_COLOR = {
  scheduled: '#3b82f6',
  in_progress: '#10b981',
  completed: '#6b7280',
  cancelled: '#ef4444',
  no_show: '#f59e0b',
};

const SESSION_STATUS_LABEL = {
  scheduled: 'مجدولة',
  in_progress: 'جارية',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  no_show: 'غياب',
};

// ─── API Helpers ──────────────────────────────────────────────────────────────
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const apiFetch = async (url) => {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Mini KPI Card */
const MiniKPI = ({ label, value, unit = '', color = '#3b82f6', icon, note }) => (
  <div style={{
    background: '#fff',
    borderRadius: 10,
    padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    borderRight: `4px solid ${color}`,
    flex: 1,
    minWidth: 140,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{label}</p>
    </div>
    <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>
      {typeof value === 'number' ? value.toLocaleString('ar-SA') : (value ?? '—')}
      {unit && <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 4 }}>{unit}</span>}
    </p>
    {note && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>{note}</p>}
  </div>
);

/** Patient Row */
const PatientRow = ({ patient }) => (
  <tr>
    <td style={tdStyle}>{patient.patient_id || patient._id?.slice(-6)}</td>
    <td style={tdStyle}>
      <strong>{patient.full_name || patient.name_ar}</strong>
      {patient.disability_type && (
        <span style={{ marginRight: 8, fontSize: 11, color: '#9ca3af' }}>· {patient.disability_type}</span>
      )}
    </td>
    <td style={tdStyle}>{patient.therapist_name || patient.therapist || '—'}</td>
    <td style={tdStyle}>
      <span style={{
        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
        background: patient.status === 'active' ? '#d1fae5' : '#f3f4f6',
        color: patient.status === 'active' ? '#065f46' : '#6b7280',
      }}>
        {patient.status === 'active' ? 'نشط' : 'غير نشط'}
      </span>
    </td>
    <td style={tdStyle}>{patient.next_session || '—'}</td>
  </tr>
);

/** Session Row */
const SessionRow = ({ session }) => (
  <tr>
    <td style={tdStyle}>{session.time || '—'}</td>
    <td style={tdStyle}><strong>{session.patient_name || '—'}</strong></td>
    <td style={tdStyle}>{session.therapist_name || '—'}</td>
    <td style={tdStyle}>{session.session_type || '—'}</td>
    <td style={tdStyle}>{session.room || '—'}</td>
    <td style={tdStyle}>
      <span style={{
        padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
        background: `${SESSION_STATUS_COLOR[session.status] || '#6b7280'}20`,
        color: SESSION_STATUS_COLOR[session.status] || '#6b7280',
      }}>
        {SESSION_STATUS_LABEL[session.status] || session.status}
      </span>
    </td>
  </tr>
);

/** Transport Vehicle Card */
const VehicleCard = ({ vehicle }) => (
  <div style={{
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}>
    <div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{vehicle.plate_number || vehicle.plate}</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
        السائق: {vehicle.driver_name || '—'} · المسافة: {vehicle.route || '—'}
      </p>
    </div>
    <div style={{ textAlign: 'center' }}>
      <span style={{
        display: 'block',
        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
        background: vehicle.status === 'on_route' ? '#d1fae5' : vehicle.status === 'idle' ? '#fef3c7' : '#f3f4f6',
        color: vehicle.status === 'on_route' ? '#065f46' : vehicle.status === 'idle' ? '#92400e' : '#6b7280',
      }}>
        {vehicle.status === 'on_route' ? '🚌 في الطريق' : vehicle.status === 'idle' ? '⏸️ في الانتظار' : vehicle.status}
      </span>
      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
        {vehicle.passengers_count ?? 0} راكب
      </p>
    </div>
  </div>
);

const tdStyle = {
  padding: '10px 14px',
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
  fontSize: 11,
  textTransform: 'uppercase',
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BranchDashboard = ({ branchCode, userRole = 'branch_manager' }) => {
  // Get branch code from URL if not passed as prop
  const code = branchCode || window.location.pathname.split('/').pop()?.toUpperCase() || 'RY-MAIN';

  const [activeModule, setActiveModule] = useState('overview');
  const [data, setData] = useState({
    dashboard: null,
    patients: [],
    schedule: [],
    transport: [],
    kpis: null,
  });
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [searchPatient, setSearchPatient] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('all');

  // ── Permission check ──────────────────────────────────────────────────────
  const canAccess = useCallback((moduleKey) => {
    const mod = MODULES.find(m => m.key === moduleKey);
    if (!mod) return false;
    if (mod.roles.includes('all')) return true;
    return mod.roles.includes(userRole) ||
      ['hq_super_admin', 'hq_admin'].includes(userRole);
  }, [userRole]);

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    setLoading(l => ({ ...l, dashboard: true }));
    try {
      const res = await apiFetch(`${API_BASE}/${code}/dashboard`);
      setData(d => ({ ...d, dashboard: res.data || res }));
    } catch (err) {
      setErrors(e => ({ ...e, dashboard: err.message }));
    } finally {
      setLoading(l => ({ ...l, dashboard: false }));
    }
  }, [code]);

  const loadPatients = useCallback(async () => {
    if (!canAccess('patients')) return;
    setLoading(l => ({ ...l, patients: true }));
    try {
      const res = await apiFetch(`${API_BASE}/${code}/patients`);
      setData(d => ({ ...d, patients: res.data?.patients || res.patients || [] }));
    } catch (err) {
      setErrors(e => ({ ...e, patients: err.message }));
    } finally {
      setLoading(l => ({ ...l, patients: false }));
    }
  }, [code, canAccess]);

  const loadSchedule = useCallback(async () => {
    if (!canAccess('schedule')) return;
    setLoading(l => ({ ...l, schedule: true }));
    try {
      const res = await apiFetch(`${API_BASE}/${code}/schedule`);
      setData(d => ({ ...d, schedule: res.data?.sessions || res.sessions || [] }));
    } catch (err) {
      setErrors(e => ({ ...e, schedule: err.message }));
    } finally {
      setLoading(l => ({ ...l, schedule: false }));
    }
  }, [code, canAccess]);

  const loadTransport = useCallback(async () => {
    if (!canAccess('transport')) return;
    setLoading(l => ({ ...l, transport: true }));
    try {
      const res = await apiFetch(`${API_BASE}/${code}/transport`);
      setData(d => ({ ...d, transport: res.data?.vehicles || res.vehicles || [] }));
    } catch (err) {
      setErrors(e => ({ ...e, transport: err.message }));
    } finally {
      setLoading(l => ({ ...l, transport: false }));
    }
  }, [code, canAccess]);

  const loadKPIs = useCallback(async () => {
    if (!canAccess('kpis')) return;
    setLoading(l => ({ ...l, kpis: true }));
    try {
      const res = await apiFetch(`${API_BASE}/${code}/kpis`);
      setData(d => ({ ...d, kpis: res.data || res }));
    } catch (err) {
      setErrors(e => ({ ...e, kpis: err.message }));
    } finally {
      setLoading(l => ({ ...l, kpis: false }));
    }
  }, [code, canAccess]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    if (activeModule === 'patients') loadPatients();
    if (activeModule === 'schedule') loadSchedule();
    if (activeModule === 'transport') loadTransport();
    if (activeModule === 'kpis') loadKPIs();
  }, [activeModule, loadPatients, loadSchedule, loadTransport, loadKPIs]);

  // Auto-refresh every 3 minutes
  useEffect(() => {
    const timer = setInterval(loadDashboard, 3 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadDashboard]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const dash = data.dashboard;
  const todayKPIs = dash?.today_kpis || {};
  const monthStats = dash?.month_stats || {};
  const branchInfo = dash?.branch || {};
  const branchAlerts = dash?.alerts || [];

  const filteredPatients = data.patients.filter(p =>
    !searchPatient || (p.full_name || p.name_ar || '').includes(searchPatient)
  );

  const filteredSchedule = scheduleFilter === 'all'
    ? data.schedule
    : data.schedule.filter(s => s.status === scheduleFilter);

  const isLoading = loading[activeModule === 'overview' ? 'dashboard' : activeModule];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ fontFamily: "'Segoe UI', 'Arial', sans-serif", background: '#f8fafc', minHeight: '100vh', padding: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/hq-dashboard" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 13 }}>
              ← الرئيسية
            </a>
            <span style={{ color: '#d1d5db' }}>/</span>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
              🏥 {branchInfo.name_ar || code}
            </h1>
            <span style={{
              background: '#d1fae5', color: '#065f46',
              padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            }}>
              {branchInfo.status === 'active' ? '● نشط' : branchInfo.status}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 13 }}>
            {branchInfo.location?.city || ''} · {branchInfo.type || ''} ·
            آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {branchAlerts.filter(a => a.type === 'critical').length > 0 && (
            <span style={{
              background: '#fef2f2', color: '#ef4444',
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: '1px solid #fee2e2',
            }}>
              🔴 {branchAlerts.filter(a => a.type === 'critical').length} تنبيه
            </span>
          )}
          <button
            onClick={loadDashboard}
            style={{
              padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#374151',
            }}
          >
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* ── Today KPIs Strip ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <MiniKPI label="الحضور اليوم" value={todayKPIs.patients_present} icon="✅" color="#10b981" note={`من إجمالي ${todayKPIs.patients_total ?? 0}`} />
        <MiniKPI label="جلسات مكتملة" value={todayKPIs.sessions_completed} icon="📋" color="#3b82f6" note={`من ${todayKPIs.sessions_total ?? 0} جلسة`} />
        <MiniKPI label="الغياب اليوم" value={todayKPIs.absent_today} icon="❌" color="#ef4444" />
        <MiniKPI label="المعالجون النشطون" value={todayKPIs.therapists_active} icon="👨‍⚕️" color="#8b5cf6" />
        <MiniKPI label="إشغال الغرف" value={todayKPIs.rooms_occupied} unit={`/ ${todayKPIs.rooms_total ?? 0}`} icon="🚪" color="#f59e0b" />
      </div>

      {/* ── Month Stats ── */}
      <div style={{
        background: '#fff', borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        padding: '16px 20px', marginBottom: 20,
        display: 'flex', gap: 32, flexWrap: 'wrap',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
            {(monthStats.revenue || 0).toLocaleString('ar-SA')}
            <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 4 }}>ر.س</span>
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>إيراد الشهر</p>
        </div>
        <div style={{ width: 1, background: '#f3f4f6' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
            {monthStats.total_sessions ?? 0}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>جلسات الشهر</p>
        </div>
        <div style={{ width: 1, background: '#f3f4f6' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
            {monthStats.satisfaction_score ?? '—'}
            <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 4 }}>/ 5</span>
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>رضا الأسر</p>
        </div>
        <div style={{ width: 1, background: '#f3f4f6' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
            {monthStats.new_patients ?? 0}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>مرضى جدد</p>
        </div>
        <div style={{ width: 1, background: '#f3f4f6' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: monthStats.target_achievement >= 90 ? '#10b981' : '#f59e0b' }}>
            {monthStats.target_achievement ?? 0}%
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>تحقيق الهدف</p>
        </div>
      </div>

      {/* ── Module Navigation ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: '#fff', borderRadius: 10, padding: 4,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', width: 'fit-content',
      }}>
        {MODULES.filter(m => canAccess(m.key)).map(mod => (
          <button
            key={mod.key}
            onClick={() => setActiveModule(mod.key)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', borderRadius: 8,
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: activeModule === mod.key ? '#3b82f6' : 'transparent',
              color: activeModule === mod.key ? '#fff' : '#6b7280',
            }}
          >
            {mod.label}
          </button>
        ))}
      </div>

      {/* ── Module Content ── */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
          جارٍ التحميل…
        </div>
      )}

      {!isLoading && (
        <>
          {/* Overview */}
          {activeModule === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
              <div>
                {/* Today Schedule Preview */}
                <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 20, marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>📅 جدول اليوم (أول 10 جلسات)</h3>
                  {(dash?.schedule_preview || []).length === 0
                    ? <p style={{ color: '#9ca3af', fontSize: 13 }}>لا توجد جلسات مجدولة اليوم</p>
                    : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={thStyle}>الوقت</th>
                            <th style={thStyle}>المريض</th>
                            <th style={thStyle}>المعالج</th>
                            <th style={thStyle}>النوع</th>
                            <th style={thStyle}>الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dash?.schedule_preview || []).slice(0, 10).map((s, i) => (
                            <SessionRow key={i} session={s} />
                          ))}
                        </tbody>
                      </table>
                    )
                  }
                </div>
              </div>

              {/* Right: Alerts */}
              <div>
                <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', padding: 20 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>🔔 تنبيهات الفرع</h3>
                  {branchAlerts.length === 0
                    ? <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>✅ لا توجد تنبيهات</p>
                    : branchAlerts.map((alert, i) => (
                      <div key={i} style={{
                        padding: '10px 12px', marginBottom: 8, borderRadius: 8,
                        background: alert.type === 'critical' ? '#fef2f2' : alert.type === 'warning' ? '#fffbeb' : '#eff6ff',
                        borderRight: `3px solid ${alert.type === 'critical' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                      }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{alert.message}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{alert.time || ''}</p>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* Patients Module */}
          {activeModule === 'patients' && (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 12, alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  مرضى الفرع ({filteredPatients.length})
                </h2>
                <input
                  type="text"
                  placeholder="ابحث عن مريض…"
                  value={searchPatient}
                  onChange={e => setSearchPatient(e.target.value)}
                  style={{
                    padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6,
                    fontSize: 13, outline: 'none', minWidth: 200,
                  }}
                />
              </div>
              {errors.patients && (
                <div style={{ padding: 20, color: '#ef4444', fontSize: 13 }}>⚠️ {errors.patients}</div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>المعرف</th>
                      <th style={thStyle}>الاسم</th>
                      <th style={thStyle}>المعالج</th>
                      <th style={thStyle}>الحالة</th>
                      <th style={thStyle}>الجلسة القادمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.length > 0
                      ? filteredPatients.map((p, i) => <PatientRow key={i} patient={p} />)
                      : (
                        <tr>
                          <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: 32 }}>
                            {searchPatient ? 'لا توجد نتائج مطابقة' : 'لا يوجد مرضى مسجلون'}
                          </td>
                        </tr>
                      )
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Schedule Module */}
          {activeModule === 'schedule' && (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 12, alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  جدول الجلسات ({filteredSchedule.length})
                </h2>
                <select
                  value={scheduleFilter}
                  onChange={e => setScheduleFilter(e.target.value)}
                  style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
                >
                  <option value="all">جميع الحالات</option>
                  <option value="scheduled">مجدولة</option>
                  <option value="in_progress">جارية</option>
                  <option value="completed">مكتملة</option>
                  <option value="cancelled">ملغاة</option>
                </select>
              </div>
              {errors.schedule && (
                <div style={{ padding: 20, color: '#ef4444', fontSize: 13 }}>⚠️ {errors.schedule}</div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>الوقت</th>
                    <th style={thStyle}>المريض</th>
                    <th style={thStyle}>المعالج</th>
                    <th style={thStyle}>النوع</th>
                    <th style={thStyle}>الغرفة</th>
                    <th style={thStyle}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedule.length > 0
                    ? filteredSchedule.map((s, i) => <SessionRow key={i} session={s} />)
                    : (
                      <tr>
                        <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: 32 }}>
                          لا توجد جلسات
                        </td>
                      </tr>
                    )
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* Transport Module */}
          {activeModule === 'transport' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  🚌 أسطول النقل — الفرع ({data.transport.length} مركبة)
                </h2>
              </div>
              {errors.transport && (
                <div style={{ padding: 20, color: '#ef4444', fontSize: 13 }}>⚠️ {errors.transport}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {data.transport.length > 0
                  ? data.transport.map((v, i) => <VehicleCard key={i} vehicle={v} />)
                  : (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                      لا توجد مركبات مسجلة لهذا الفرع
                    </div>
                  )
                }
              </div>
            </div>
          )}

          {/* KPIs Module */}
          {activeModule === 'kpis' && data.kpis && (
            <div>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>📈 مؤشرات الأداء مقارنةً بـ HQ</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {(data.kpis.kpis || []).map((kpi, i) => (
                  <div key={i} style={{
                    background: '#fff', borderRadius: 12, padding: 20,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    borderTop: `4px solid ${kpi.status === 'above' ? '#10b981' : kpi.status === 'below' ? '#ef4444' : '#f59e0b'}`,
                  }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>{kpi.name}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 700, color: '#111827' }}>
                      {kpi.branch_value}{kpi.unit}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
                      المتوسط العام: {kpi.hq_average}{kpi.unit}
                    </p>
                    <div style={{
                      marginTop: 8, display: 'inline-block',
                      padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: kpi.status === 'above' ? '#d1fae5' : kpi.status === 'below' ? '#fef2f2' : '#fef3c7',
                      color: kpi.status === 'above' ? '#065f46' : kpi.status === 'below' ? '#991b1b' : '#92400e',
                    }}>
                      {kpi.status === 'above' ? '▲ أعلى من المتوسط' : kpi.status === 'below' ? '▼ أدنى من المتوسط' : '● عند المتوسط'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BranchDashboard;
