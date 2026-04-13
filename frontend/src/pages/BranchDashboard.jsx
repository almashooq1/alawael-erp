/**
 * BranchDashboard.jsx — لوحة تحكم مدير الفرع | Premium v2
 * Branch Manager Dashboard — Real-time branch operations
 *
 * Access: branch_manager (own branch), hq_admin, hq_super_admin (any branch)
 * API:    GET /api/branch-management/:branch_code/dashboard
 *         GET /api/branch-management/:branch_code/patients
 *         GET /api/branch-management/:branch_code/schedule
 *         GET /api/branch-management/:branch_code/kpis
 *         GET /api/branch-management/:branch_code/transport
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { useTheme, alpha,
} from '@mui/material';

import { getToken } from '../utils/tokenStorage';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = '/api/branch-management';

const MODULES = [
  { key: 'overview',  label: 'نظرة عامة',    icon: <BarChart sx={{ fontSize: 16 }} />,     roles: ['all'] },
  { key: 'patients',  label: 'المرضى',        icon: <Groups sx={{ fontSize: 16 }} />,       roles: ['branch_manager','therapist','receptionist'] },
  { key: 'schedule',  label: 'الجدول',        icon: <Schedule sx={{ fontSize: 16 }} />,     roles: ['branch_manager','therapist'] },
  { key: 'transport', label: 'النقل',         icon: <DirectionsBus sx={{ fontSize: 16 }} />,roles: ['branch_manager','driver'] },
  { key: 'kpis',      label: 'مؤشرات الأداء', icon: <TrendingUp sx={{ fontSize: 16 }} />,   roles: ['branch_manager'] },
];

const SESSION_COLORS = {
  scheduled:   { bg: '#3b82f6', light: '#eff6ff', text: '#1d4ed8' },
  in_progress: { bg: '#10b981', light: '#d1fae5', text: '#065f46' },
  completed:   { bg: '#6b7280', light: '#f3f4f6', text: '#374151' },
  cancelled:   { bg: '#ef4444', light: '#fef2f2', text: '#991b1b' },
  no_show:     { bg: '#f59e0b', light: '#fffbeb', text: '#92400e' },
};
const SESSION_LABELS = {
  scheduled: 'مجدولة', in_progress: 'جارية', completed: 'مكتملة',
  cancelled: 'ملغاة', no_show: 'غياب',
};

// ─── API ──────────────────────────────────────────────────────────────────────
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken() || ''}`,
});
const apiFetch = async (url) => {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ─── Glass Box ────────────────────────────────────────────────────────────────
const Glass = ({ children, sx = {}, ...props }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        background: isDark
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
        borderRadius: 3,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = memo(({ label, value, unit = '', icon, gradient, note, delay = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      style={{ flex: 1, minWidth: 150 }}
    >
      <Glass
        sx={{
          p: 2.5,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: `0 12px 40px ${alpha(gradient?.[0] || '#3b82f6', 0.25)}`,
          },
        }}
      >
        {/* Top gradient bar */}
        <Box sx={{
          position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0,
          height: 3, borderRadius: '12px 12px 0 0',
          background: `linear-gradient(90deg, ${gradient?.[0] || '#3b82f6'}, ${gradient?.[1] || '#60a5fa'})`,
        }} />
        {/* Glow blob */}
        <Box sx={{
          position: 'absolute', top: -20, insetInlineEnd: -20,
          width: 80, height: 80, borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(gradient?.[0] || '#3b82f6', 0.15)}, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '10px',
            background: `linear-gradient(135deg, ${gradient?.[0] || '#3b82f6'}, ${gradient?.[1] || '#60a5fa'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16,
          }}>
            {icon}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5 }}>
            {label}
          </Typography>
        </Box>

        <Typography sx={{
          fontSize: '1.8rem', fontWeight: 800, lineHeight: 1,
          background: `linear-gradient(135deg, ${gradient?.[0] || '#3b82f6'}, ${gradient?.[1] || '#60a5fa'})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {typeof value === 'number' ? value.toLocaleString('ar-SA') : (value ?? '—')}
          {unit && (
            <Typography component="span" sx={{ fontSize: '0.75rem', WebkitTextFillColor: 'unset', color: 'text.secondary', mr: 0.5 }}>
              {unit}
            </Typography>
          )}
        </Typography>

        {note && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontSize: '0.68rem' }}>
            {note}
          </Typography>
        )}
      </Glass>
    </motion.div>
  );
});

// ─── Session Status Badge ─────────────────────────────────────────────────────
const StatusBadge = memo(({ status }) => {
  const c = SESSION_COLORS[status] || SESSION_COLORS.completed;
  return (
    <Box component="span" sx={{
      px: 1.2, py: 0.3, borderRadius: 5, fontSize: '0.68rem', fontWeight: 700,
      background: c.light, color: c.text,
      border: `1px solid ${alpha(c.bg, 0.3)}`,
    }}>
      {SESSION_LABELS[status] || status}
    </Box>
  );
});

// ─── Session Row (Table) ──────────────────────────────────────────────────────
const SessionRow = memo(({ session, idx }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      style={{
        background: idx % 2 === 0
          ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(249,250,251,0.8)')
          : 'transparent',
      }}
    >
      <Box component="td" sx={{ px: 2, py: 1.2, fontSize: '0.8rem', color: 'text.primary', borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{session.time || '—'}</Typography>
      </Box>
      <Box component="td" sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{session.patient_name || '—'}</Typography>
      </Box>
      <Box component="td" sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{session.therapist_name || '—'}</Typography>
      </Box>
      <Box component="td" sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{session.session_type || '—'}</Typography>
      </Box>
      <Box component="td" sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: '0.78rem' }}>{session.room || '—'}</Typography>
      </Box>
      <Box component="td" sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <StatusBadge status={session.status} />
      </Box>
    </motion.tr>
  );
});

// ─── Patient Row ──────────────────────────────────────────────────────────────
const PatientRow = memo(({ patient, idx }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const initials = (patient.full_name || patient.name_ar || '?').slice(0, 2);
  const colors = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4'];
  const color = colors[idx % colors.length];

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
    >
      <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontFamily: 'monospace' }}>
          {patient.patient_id || patient._id?.slice(-6)}
        </Typography>
      </Box>
      <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{
            width: 32, height: 32, fontSize: '0.72rem', fontWeight: 700,
            background: `linear-gradient(135deg, ${color}, ${color}aa)`,
          }}>
            {initials}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
              {patient.full_name || patient.name_ar}
            </Typography>
            {patient.disability_type && (
              <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                {patient.disability_type}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
      <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          {patient.therapist_name || patient.therapist || '—'}
        </Typography>
      </Box>
      <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{
          display: 'inline-flex', px: 1.2, py: 0.3, borderRadius: 5,
          background: patient.status === 'active' ? '#d1fae5' : alpha('#6b7280', 0.1),
          color: patient.status === 'active' ? '#065f46' : '#6b7280',
          fontSize: '0.68rem', fontWeight: 700,
        }}>
          {patient.status === 'active' ? '● نشط' : '○ غير نشط'}
        </Box>
      </Box>
      <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
          {patient.next_session || '—'}
        </Typography>
      </Box>
    </motion.tr>
  );
});

// ─── Vehicle Card ─────────────────────────────────────────────────────────────
const VehicleCard = memo(({ vehicle, idx }) => {
  const theme = useTheme();
  const statusMap = {
    on_route: { label: 'في الطريق', color: '#10b981', bg: '#d1fae5', icon: '🚌' },
    idle:     { label: 'في الانتظار', color: '#f59e0b', bg: '#fffbeb', icon: '⏸️' },
  };
  const s = statusMap[vehicle.status] || { label: vehicle.status, color: '#6b7280', bg: '#f3f4f6', icon: '🚗' };
  const pct = Math.round(((vehicle.passengers_count || 0) / (vehicle.capacity || 10)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.06, type: 'spring', stiffness: 200 }}
    >
      <Glass sx={{
        p: 2.5,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 32px ${alpha(s.color, 0.2)}` },
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 800 }}>{vehicle.plate_number || vehicle.plate}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.3 }}>
              السائق: {vehicle.driver_name || '—'}
            </Typography>
          </Box>
          <Box sx={{
            px: 1.5, py: 0.5, borderRadius: 5, fontSize: '0.72rem', fontWeight: 700,
            background: s.bg, color: s.color,
          }}>
            {s.icon} {s.label}
          </Box>
        </Box>

        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
          المسار: {vehicle.route || '—'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>الركاب</Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, ml: 'auto' }}>
            {vehicle.passengers_count ?? 0} / {vehicle.capacity || 10}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(pct, 100)}
          sx={{
            height: 6, borderRadius: 3,
            bgcolor: alpha(s.color, 0.15),
            '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)`, borderRadius: 3 },
          }}
        />
      </Glass>
    </motion.div>
  );
});

// ─── Alert Item ───────────────────────────────────────────────────────────────
const AlertItem = memo(({ alert, idx }) => {
  const colors = {
    critical: { border: '#ef4444', bg: '#fef2f2', text: '#991b1b', icon: '🔴' },
    warning:  { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', icon: '🟡' },
    info:     { border: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', icon: '🔵' },
  };
  const c = colors[alert.type] || colors.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.07 }}
    >
      <Box sx={{
        p: 1.5, mb: 1, borderRadius: 2,
        background: c.bg,
        borderInlineStart: `3px solid ${c.border}`,
      }}>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: c.text }}>
          {c.icon} {alert.message}
        </Typography>
        {alert.time && (
          <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.3 }}>{alert.time}</Typography>
        )}
      </Box>
    </motion.div>
  );
});

// ─── KPI Comparison Card ──────────────────────────────────────────────────────
const KPICompareCard = memo(({ kpi, idx }) => {
  const theme = useTheme();
  const isAbove = kpi.status === 'above';
  const isBelow = kpi.status === 'below';
  const color = isAbove ? '#10b981' : isBelow ? '#ef4444' : '#f59e0b';
  const pct = kpi.hq_average > 0
    ? Math.min(Math.round((kpi.branch_value / kpi.hq_average) * 100), 150)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06, type: 'spring', stiffness: 180 }}
    >
      <Glass sx={{
        p: 2.5,
        position: 'relative', overflow: 'hidden',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-3px)' },
      }}>
        <Box sx={{
          position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0,
          height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)`,
        }} />

        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 600, mb: 1 }}>
          {kpi.name}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
          <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, color }}>
            {kpi.branch_value}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{kpi.unit}</Typography>
        </Box>

        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 1.5 }}>
          متوسط HQ: {kpi.hq_average}{kpi.unit}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={Math.min(pct, 100)}
          sx={{
            height: 5, borderRadius: 3, mb: 1,
            bgcolor: alpha(color, 0.15),
            '& .MuiLinearProgress-bar': { background: color, borderRadius: 3 },
          }}
        />

        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          px: 1.2, py: 0.3, borderRadius: 5, fontSize: '0.68rem', fontWeight: 700,
          background: alpha(color, 0.12), color,
        }}>
          {isAbove ? <TrendingUp sx={{ fontSize: 12 }} /> : isBelow ? <TrendingDown sx={{ fontSize: 12 }} /> : <TrendingFlat sx={{ fontSize: 12 }} />}
          {isAbove ? 'أعلى من المتوسط' : isBelow ? 'أدنى من المتوسط' : 'عند المتوسط'}
        </Box>
      </Glass>
    </motion.div>
  );
});

// ─── Month Stat Item ──────────────────────────────────────────────────────────
const MonthStatItem = memo(({ label, value, suffix = '', color }) => (
  <Box sx={{ textAlign: 'center', px: 2 }}>
    <Typography sx={{
      fontSize: '1.5rem', fontWeight: 800,
      background: color ? `linear-gradient(135deg, ${color})` : 'inherit',
      WebkitBackgroundClip: color ? 'text' : 'unset',
      WebkitTextFillColor: color ? 'transparent' : 'inherit',
    }}>
      {typeof value === 'number' ? value.toLocaleString('ar-SA') : (value ?? '—')}
      {suffix && <Typography component="span" sx={{ fontSize: '0.75rem', WebkitTextFillColor: 'unset', color: 'text.secondary', mr: 0.5 }}>{suffix}</Typography>}
    </Typography>
    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.3 }}>{label}</Typography>
  </Box>
));

// ─── Main Component ───────────────────────────────────────────────────────────
const BranchDashboard = ({ branchCode, userRole = 'branch_manager' }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const code = branchCode || window.location.pathname.split('/').pop()?.toUpperCase() || 'RY-MAIN';

  const [activeModule, setActiveModule] = useState('overview');
  const [data, setData] = useState({ dashboard: null, patients: [], schedule: [], transport: [], kpis: null });
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [searchPatient, setSearchPatient] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // ── Access ────────────────────────────────────────────────────────────────
  const canAccess = useCallback((key) => {
    const mod = MODULES.find(m => m.key === key);
    if (!mod) return false;
    if (mod.roles.includes('all')) return true;
    return mod.roles.includes(userRole) || ['hq_super_admin','hq_admin'].includes(userRole);
  }, [userRole]);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    setLoading(l => ({ ...l, dashboard: true }));
    try {
      const res = await apiFetch(`${API_BASE}/${code}/dashboard`);
      setData(d => ({ ...d, dashboard: res.data || res }));
      setLastUpdate(new Date());
    } catch (err) { setErrors(e => ({ ...e, dashboard: err.message })); }
    finally { setLoading(l => ({ ...l, dashboard: false })); }
  }, [code]);

  const loadPatients = useCallback(async () => {
    if (!canAccess('patients')) return;
    setLoading(l => ({ ...l, patients: true }));
    try {
      const res = await apiFetch(`${API_BASE}/${code}/patients`);
      setData(d => ({ ...d, patients: res.data?.patients || res.patients || [] }));
    } catch (err) { setErrors(e => ({ ...e, patients: err.message })); }
    finally { setLoading(l => ({ ...l, patients: false })); }
  }, [code, canAccess]);

  const loadSchedule = useCallback(async () => {
    if (!canAccess('schedule')) return;
    setLoading(l => ({ ...l, schedule: true }));
    try {
      const res = await apiFetch(`${API_BASE}/${code}/schedule`);
      setData(d => ({ ...d, schedule: res.data?.sessions || res.sessions || [] }));
    } catch (err) { setErrors(e => ({ ...e, schedule: err.message })); }
    finally { setLoading(l => ({ ...l, schedule: false })); }
  }, [code, canAccess]);

  const loadTransport = useCallback(async () => {
    if (!canAccess('transport')) return;
    setLoading(l => ({ ...l, transport: true }));
    try {
      const res = await apiFetch(`${API_BASE}/${code}/transport`);
      setData(d => ({ ...d, transport: res.data?.vehicles || res.vehicles || [] }));
    } catch (err) { setErrors(e => ({ ...e, transport: err.message })); }
    finally { setLoading(l => ({ ...l, transport: false })); }
  }, [code, canAccess]);

  const loadKPIs = useCallback(async () => {
    if (!canAccess('kpis')) return;
    setLoading(l => ({ ...l, kpis: true }));
    try {
      const res = await apiFetch(`${API_BASE}/${code}/kpis`);
      setData(d => ({ ...d, kpis: res.data || res }));
    } catch (err) { setErrors(e => ({ ...e, kpis: err.message })); }
    finally { setLoading(l => ({ ...l, kpis: false })); }
  }, [code, canAccess]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    if (activeModule === 'patients') loadPatients();
    if (activeModule === 'schedule') loadSchedule();
    if (activeModule === 'transport') loadTransport();
    if (activeModule === 'kpis') loadKPIs();
  }, [activeModule, loadPatients, loadSchedule, loadTransport, loadKPIs]);

  // Auto-refresh every 3 min
  useEffect(() => {
    const t = setInterval(loadDashboard, 3 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadDashboard]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const dash = data.dashboard;
  const todayKPIs = dash?.today_kpis || {};
  const monthStats = dash?.month_stats || {};
  const branchInfo = dash?.branch || {};
  const alerts = dash?.alerts || [];
  const criticalCount = alerts.filter(a => a.type === 'critical').length;

  const filteredPatients = data.patients.filter(p =>
    !searchPatient || (p.full_name || p.name_ar || '').includes(searchPatient)
  );
  const filteredSchedule = scheduleFilter === 'all'
    ? data.schedule
    : data.schedule.filter(s => s.status === scheduleFilter);

  const isLoading = loading[activeModule === 'overview' ? 'dashboard' : activeModule];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: '100vh',
        background: isDark
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 50%, #eef2ff 100%)',
        p: 3,
        fontFamily: "'Tajawal', 'Segoe UI', sans-serif",
      }}
    >

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box
                component="a"
                href="/hq-dashboard"
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  color: 'text.secondary', textDecoration: 'none', fontSize: '0.8rem',
                  '&:hover': { color: 'primary.main' }, transition: 'color 0.2s',
                }}
              >
                <ArrowBack sx={{ fontSize: 14, transform: 'scaleX(-1)' }} />
                الرئيسية
              </Box>
              <Typography sx={{ color: 'text.disabled' }}>/</Typography>

              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 2, py: 0.8, borderRadius: 3,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
              }}>
                <LocalHospital sx={{ color: '#fff', fontSize: 18 }} />
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
                  {branchInfo.name_ar || code}
                </Typography>
              </Box>

              {branchInfo.status === 'active' && (
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: 1.5, py: 0.4, borderRadius: 5,
                  background: alpha('#10b981', 0.12), border: `1px solid ${alpha('#10b981', 0.3)}`,
                }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981',
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
                  }} />
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981' }}>نشط</Typography>
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              {branchInfo.location?.city || ''}{branchInfo.type ? ` · ${branchInfo.type}` : ''} · آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {criticalCount > 0 && (
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.8,
                  px: 1.8, py: 0.8, borderRadius: 5, cursor: 'pointer',
                  background: alpha('#ef4444', 0.1), border: `1px solid ${alpha('#ef4444', 0.3)}`,
                }}>
                  <NotificationsActive sx={{ color: '#ef4444', fontSize: 16 }} />
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444' }}>
                    {criticalCount} تنبيه عاجل
                  </Typography>
                </Box>
              </motion.div>
            )}
            <Tooltip title="تحديث البيانات">
              <IconButton
                onClick={loadDashboard}
                disabled={loading.dashboard}
                sx={{
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
                  border: `1px solid ${theme.palette.divider}`,
                  backdropFilter: 'blur(10px)',
                  '&:hover': { bgcolor: alpha('#3b82f6', 0.1) },
                }}
              >
                <Refresh sx={{ fontSize: 18, animation: loading.dashboard ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <KPICard label="الحضور اليوم"       value={todayKPIs.patients_present}  icon={<CheckCircle sx={{ fontSize: 16 }} />} gradient={['#10b981','#34d399']} note={`من ${todayKPIs.patients_total ?? 0} مريض`} delay={0}    />
        <KPICard label="جلسات مكتملة"       value={todayKPIs.sessions_completed} icon={<Schedule sx={{ fontSize: 16 }} />}    gradient={['#3b82f6','#60a5fa']} note={`من ${todayKPIs.sessions_total ?? 0} جلسة`}  delay={0.05} />
        <KPICard label="الغياب اليوم"       value={todayKPIs.absent_today}       icon={<Cancel sx={{ fontSize: 16 }} />}      gradient={['#ef4444','#f87171']}                                                    delay={0.1}  />
        <KPICard label="معالجون نشطون"      value={todayKPIs.therapists_active}  icon={<Person sx={{ fontSize: 16 }} />}      gradient={['#8b5cf6','#a78bfa']}                                                    delay={0.15} />
        <KPICard label="إشغال الغرف"        value={todayKPIs.rooms_occupied}     unit={`/ ${todayKPIs.rooms_total ?? 0}`} icon={<MeetingRoom sx={{ fontSize: 16 }} />} gradient={['#f59e0b','#fbbf24']}         delay={0.2}  />
      </Box>

      {/* ── Month Stats Bar ── */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Glass sx={{ p: 2, mb: 2.5, display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around' }}>
          <MonthStatItem label="إيراد الشهر"   value={monthStats.revenue}             suffix="ر.س" color="135deg, #10b981, #34d399" />
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <MonthStatItem label="جلسات الشهر"   value={monthStats.total_sessions}                                                   />
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <MonthStatItem label="رضا الأسر"     value={monthStats.satisfaction_score}  suffix="/ 5"                                  />
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <MonthStatItem label="مرضى جدد"      value={monthStats.new_patients}                                                     />
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <MonthStatItem
            label="تحقيق الهدف"
            value={`${monthStats.target_achievement ?? 0}%`}
            color={`135deg, ${monthStats.target_achievement >= 90 ? '#10b981, #34d399' : '#f59e0b, #fbbf24'}`}
          />
        </Glass>
      </motion.div>

      {/* ── Module Tabs ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <Glass sx={{ mb: 2.5, p: 0.5, display: 'flex', gap: 0.5, width: 'fit-content', borderRadius: 3 }}>
          {MODULES.filter(m => canAccess(m.key)).map(mod => {
            const active = activeModule === mod.key;
            return (
              <Box
                key={mod.key}
                component="button"
                onClick={() => setActiveModule(mod.key)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.8,
                  px: 2, py: 1, border: 'none', cursor: 'pointer', borderRadius: 2.5,
                  fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  background: active
                    ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                    : 'transparent',
                  color: active ? '#fff' : 'text.secondary',
                  boxShadow: active ? '0 4px 15px rgba(59,130,246,0.35)' : 'none',
                }}
              >
                {mod.icon}
                {mod.label}
              </Box>
            );
          })}
        </Glass>
      </motion.div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 2 }}>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3 }} />
              ))}
            </Box>
          </motion.div>
        ) : (
          <motion.div key={activeModule} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>

            {/* ── Overview ── */}
            {activeModule === 'overview' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' }, gap: 2 }}>

                {/* Schedule Preview */}
                <Glass sx={{ overflow: 'hidden' }}>
                  <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>📅 جدول اليوم</Typography>
                  </Box>
                  {(dash?.schedule_preview || []).length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                      <Schedule sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                      <Typography>لا توجد جلسات مجدولة اليوم</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['الوقت','المريض','المعالج','النوع','الحالة'].map(h => (
                              <Box key={h} component="th" sx={{
                                px: 2, py: 1.2, textAlign: 'start', fontSize: '0.7rem',
                                fontWeight: 700, color: 'text.secondary',
                                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(249,250,251,0.9)',
                                borderBottom: `1px solid ${theme.palette.divider}`,
                                textTransform: 'uppercase', letterSpacing: 0.5,
                              }}>
                                {h}
                              </Box>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(dash?.schedule_preview || []).slice(0, 10).map((s, i) => (
                            <SessionRow key={i} session={s} idx={i} />
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  )}
                </Glass>

                {/* Alerts */}
                <Glass sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <NotificationsActive sx={{ fontSize: 18, color: criticalCount > 0 ? '#ef4444' : 'text.secondary' }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>تنبيهات الفرع</Typography>
                    {criticalCount > 0 && (
                      <Box sx={{
                        ml: 'auto', px: 1, py: 0.2, borderRadius: 5,
                        background: '#ef4444', color: '#fff', fontSize: '0.68rem', fontWeight: 700,
                      }}>
                        {criticalCount}
                      </Box>
                    )}
                  </Box>
                  {alerts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      <CheckCircle sx={{ fontSize: 36, color: '#10b981', opacity: 0.6, mb: 1 }} />
                      <Typography sx={{ fontSize: '0.82rem' }}>لا توجد تنبيهات</Typography>
                    </Box>
                  ) : (
                    alerts.map((a, i) => <AlertItem key={i} alert={a} idx={i} />)
                  )}
                </Glass>
              </Box>
            )}

            {/* ── Patients ── */}
            {activeModule === 'patients' && (
              <Glass sx={{ overflow: 'hidden' }}>
                <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>مرضى الفرع ({filteredPatients.length})</Typography>
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 2, py: 0.8, borderRadius: 3,
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(249,250,251,0.9)',
                    border: `1px solid ${theme.palette.divider}`,
                    ml: 'auto',
                  }}>
                    <Search sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <InputBase
                      placeholder="ابحث عن مريض…"
                      value={searchPatient}
                      onChange={e => setSearchPatient(e.target.value)}
                      sx={{ fontSize: '0.82rem', minWidth: 180 }}
                    />
                  </Box>
                </Box>
                {errors.patients && (
                  <Box sx={{ p: 2, color: 'error.main', fontSize: '0.82rem' }}>⚠️ {errors.patients}</Box>
                )}
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['المعرف','الاسم','المعالج','الحالة','الجلسة القادمة'].map(h => (
                          <Box key={h} component="th" sx={{
                            px: 2, py: 1.5, textAlign: 'start', fontSize: '0.7rem',
                            fontWeight: 700, color: 'text.secondary',
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            textTransform: 'uppercase', letterSpacing: 0.5,
                          }}>
                            {h}
                          </Box>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.length > 0
                        ? filteredPatients.map((p, i) => <PatientRow key={i} patient={p} idx={i} />)
                        : (
                          <tr>
                            <Box component="td" colSpan={5} sx={{ textAlign: 'center', p: 5, color: 'text.secondary' }}>
                              <Groups sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                              <Typography>{searchPatient ? 'لا توجد نتائج مطابقة' : 'لا يوجد مرضى مسجلون'}</Typography>
                            </Box>
                          </tr>
                        )
                      }
                    </tbody>
                  </table>
                </Box>
              </Glass>
            )}

            {/* ── Schedule ── */}
            {activeModule === 'schedule' && (
              <Glass sx={{ overflow: 'hidden' }}>
                <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>جدول الجلسات ({filteredSchedule.length})</Typography>
                  <Box
                    component="select"
                    value={scheduleFilter}
                    onChange={e => setScheduleFilter(e.target.value)}
                    sx={{
                      ml: 'auto', px: 2, py: 0.8, borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                      color: 'text.primary', fontSize: '0.82rem',
                      fontFamily: 'inherit', cursor: 'pointer',
                    }}
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="scheduled">مجدولة</option>
                    <option value="in_progress">جارية</option>
                    <option value="completed">مكتملة</option>
                    <option value="cancelled">ملغاة</option>
                  </Box>
                </Box>
                {errors.schedule && <Box sx={{ p: 2, color: 'error.main', fontSize: '0.82rem' }}>⚠️ {errors.schedule}</Box>}
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['الوقت','المريض','المعالج','النوع','الغرفة','الحالة'].map(h => (
                          <Box key={h} component="th" sx={{
                            px: 2, py: 1.5, textAlign: 'start', fontSize: '0.7rem',
                            fontWeight: 700, color: 'text.secondary',
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            textTransform: 'uppercase', letterSpacing: 0.5,
                          }}>
                            {h}
                          </Box>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchedule.length > 0
                        ? filteredSchedule.map((s, i) => <SessionRow key={i} session={s} idx={i} />)
                        : (
                          <tr>
                            <Box component="td" colSpan={6} sx={{ textAlign: 'center', p: 5, color: 'text.secondary' }}>
                              <Schedule sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                              <Typography>لا توجد جلسات</Typography>
                            </Box>
                          </tr>
                        )
                      }
                    </tbody>
                  </table>
                </Box>
              </Glass>
            )}

            {/* ── Transport ── */}
            {activeModule === 'transport' && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <DirectionsBus sx={{ color: 'text.secondary' }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    أسطول النقل ({data.transport.length} مركبة)
                  </Typography>
                </Box>
                {errors.transport && <Box sx={{ p: 2, color: 'error.main', fontSize: '0.82rem', mb: 2 }}>⚠️ {errors.transport}</Box>}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
                  {data.transport.length > 0
                    ? data.transport.map((v, i) => <VehicleCard key={i} vehicle={v} idx={i} />)
                    : (
                      <Box sx={{ gridColumn: '1/-1', textAlign: 'center', py: 6, color: 'text.secondary' }}>
                        <DirectionsBus sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                        <Typography>لا توجد مركبات مسجلة لهذا الفرع</Typography>
                      </Box>
                    )
                  }
                </Box>
              </Box>
            )}

            {/* ── KPIs ── */}
            {activeModule === 'kpis' && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUp sx={{ color: 'text.secondary' }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    مؤشرات الأداء — مقارنة بـ HQ
                  </Typography>
                </Box>
                {errors.kpis && <Box sx={{ p: 2, color: 'error.main', fontSize: '0.82rem', mb: 2 }}>⚠️ {errors.kpis}</Box>}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
                  {(data.kpis?.kpis || []).map((kpi, i) => (
                    <KPICompareCard key={i} kpi={kpi} idx={i} />
                  ))}
                  {(!data.kpis || !(data.kpis?.kpis?.length)) && (
                    <Box sx={{ gridColumn: '1/-1', textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      <BarChart sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                      <Typography>لا توجد بيانات KPI متاحة</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default BranchDashboard;
