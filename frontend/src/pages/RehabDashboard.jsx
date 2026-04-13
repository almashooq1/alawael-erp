/**
 * RehabDashboard.jsx — لوحة تحكم خطط التأهيل الذكية | Premium v2
 */

import { useState, useEffect, useCallback, Component, memo } from 'react';
import { useTheme, alpha,
} from '@mui/material';

import { getToken } from '../utils/tokenStorage';

// ─── API ──────────────────────────────────────────────────────────────────────
const API_BASE = '/api/rehab-plans';
const apiCall = async (path, options = {}) => {
  const token = getToken() || sessionStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({ message: res.statusText })); throw new Error(e.message || 'خطأ'); }
  return res.json();
};

const STATUS_MAP = {
  draft:      { label: 'مسودة',  color: '#6b7280', bg: '#f3f4f6' },
  active:     { label: 'نشط',    color: '#3b82f6', bg: '#eff6ff' },
  on_hold:    { label: 'متوقف',  color: '#f59e0b', bg: '#fffbeb' },
  completed:  { label: 'مكتمل', color: '#10b981', bg: '#d1fae5' },
  discharged: { label: 'أُنهي',  color: '#06b6d4', bg: '#cffafe' },
  cancelled:  { label: 'ملغي',   color: '#ef4444', bg: '#fef2f2' },
};
const RISK_MAP = {
  low:      { label: 'منخفض', color: '#10b981', icon: '✅' },
  moderate: { label: 'متوسط', color: '#f59e0b', icon: '⚠️' },
  high:     { label: 'مرتفع', color: '#ef4444', icon: '🔴' },
  critical: { label: 'حرج',   color: '#dc2626', icon: '🚨' },
};

// ─── Glass ────────────────────────────────────────────────────────────────────
const Glass = ({ children, sx = {}, ...props }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{
      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)'}`,
      borderRadius: 3, ...sx,
    }} {...props}>{children}</Box>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }} style={{ height: '100%' }}>
    <Glass sx={{
      p: 2.5, height: '100%', position: 'relative', overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 48px ${alpha(gradient?.[0] || '#3b82f6', 0.3)}` },
    }}>
      <Box sx={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 3, background: `linear-gradient(90deg, ${gradient?.[0] || '#3b82f6'}, ${gradient?.[1] || '#60a5fa'})` }} />
      <Box sx={{ position: 'absolute', top: -30, insetInlineEnd: -30, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(gradient?.[0] || '#3b82f6', 0.18)}, transparent 70%)`, pointerEvents: 'none' }} />
      <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: `linear-gradient(135deg, ${gradient?.[0] || '#3b82f6'}, ${gradient?.[1] || '#60a5fa'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', mb: 1.5 }}>{icon}</Box>
      <Typography sx={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, background: `linear-gradient(135deg, ${gradient?.[0] || '#3b82f6'}, ${gradient?.[1] || '#60a5fa'})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value ?? '—'}</Typography>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, mt: 0.5 }}>{title}</Typography>
      {subtitle && <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.3 }}>{subtitle}</Typography>}
      {trend !== null && trend !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <TrendingUp sx={{ fontSize: 13, color: trend > 0 ? '#10b981' : '#ef4444' }} />
          <Typography sx={{ fontSize: '0.68rem', color: trend > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{trend > 0 ? `+${trend}%` : `${trend}%`} مقارنة بالشهر الماضي</Typography>
        </Box>
      )}
    </Glass>
  </motion.div>
));

// ─── Progress Row ─────────────────────────────────────────────────────────────
const ProgressRow = memo(({ label, value = 0, gradient }) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, background: `linear-gradient(135deg, ${gradient?.[0] || '#3b82f6'}, ${gradient?.[1] || '#60a5fa'})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}%</Typography>
    </Box>
    <Box sx={{ height: 7, borderRadius: 4, bgcolor: alpha(gradient?.[0] || '#3b82f6', 0.12), overflow: 'hidden' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${gradient?.[0] || '#3b82f6'}, ${gradient?.[1] || '#60a5fa'})` }} />
    </Box>
  </Box>
));

// ─── Plan Card ────────────────────────────────────────────────────────────────
const PlanCard = memo(({ plan, onView, onEdit, idx }) => {
  const _theme = useTheme();
  const progress = plan.progressMetrics?.overallProgress ?? 0;
  const st = STATUS_MAP[plan.status] || STATUS_MAP.active;
  const risk = RISK_MAP[plan.latestRiskLevel];
  const pc = progress >= 75 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06, type: 'spring', stiffness: 180 }}>
      <Glass sx={{ p: 2, mb: 1.5, position: 'relative', overflow: 'hidden', transition: 'transform 0.2s', '&:hover': { transform: 'translateX(-3px)' } }}>
        <Box sx={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 3, background: st.color }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography sx={{ fontSize: '0.88rem', fontWeight: 800 }}>{plan.planCode}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{plan.beneficiaryName} · {plan.primaryDiagnosis}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Box sx={{ px: 1.2, py: 0.3, borderRadius: 5, fontSize: '0.68rem', fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</Box>
            {risk && <Box sx={{ px: 1.2, py: 0.3, borderRadius: 5, fontSize: '0.68rem', fontWeight: 700, background: alpha(risk.color, 0.12), color: risk.color }}>{risk.icon} {risk.label}</Box>}
          </Box>
        </Box>
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>التقدم الإجمالي</Typography>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: pc }}>{progress}%</Typography>
          </Box>
          <Box sx={{ height: 5, borderRadius: 3, bgcolor: alpha(pc, 0.15), overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }}
              style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${pc}, ${pc}aa)` }} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{plan.goals?.length ?? 0} هدف · {plan.totalWeeks ?? 12} أسبوع</Typography>
          <Box>
            <Tooltip title="عرض"><IconButton size="small" onClick={() => onView(plan)}><Visibility sx={{ fontSize: 16, color: '#3b82f6' }} /></IconButton></Tooltip>
            <Tooltip title="تعديل"><IconButton size="small" onClick={() => onEdit(plan)}><Edit sx={{ fontSize: 16, color: '#8b5cf6' }} /></IconButton></Tooltip>
          </Box>
        </Box>
      </Glass>
    </motion.div>
  );
});

// ─── Tab Button ───────────────────────────────────────────────────────────────
const TabBtn = memo(({ active, label, icon, onClick }) => (
  <Box component="button" onClick={onClick} sx={{
    display: 'flex', alignItems: 'center', gap: 0.8, px: 2, py: 1.2, border: 'none', cursor: 'pointer', borderRadius: 2.5,
    fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.2s',
    background: active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
    color: active ? '#fff' : 'text.secondary',
    boxShadow: active ? '0 4px 15px rgba(59,130,246,0.35)' : 'none',
  }}>{icon}{label}</Box>
));

// ─── Alert Card ───────────────────────────────────────────────────────────────
const AlertCard = memo(({ alert, idx }) => {
  const cm = { warning: { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', icon: '⚠️' }, error: { border: '#ef4444', bg: '#fef2f2', text: '#991b1b', icon: '🚨' }, info: { border: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', icon: '💡' }, success: { border: '#10b981', bg: '#d1fae5', text: '#065f46', icon: '✅' } };
  const c = cm[alert.severity] || cm.info;
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.07 }}>
      <Box sx={{ p: 2, mb: 1.5, borderRadius: 2.5, background: c.bg, borderInlineStart: `3px solid ${c.border}` }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: c.text }}>{c.icon} {alert.title || `تنبيه ${idx + 1}`}</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.3 }}>{alert.message || alert}</Typography>
        {alert.planCode && <Box sx={{ mt: 0.8, display: 'inline-flex', px: 1, py: 0.2, borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, background: alpha(c.border, 0.15), color: c.border }}>{alert.planCode}</Box>}
      </Box>
    </motion.div>
  );
});

// ─── Error Boundary ───────────────────────────────────────────────────────────
class RehabErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Warning sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>حدث خطأ غير متوقع</Typography>
        <Button variant="contained" onClick={() => this.setState({ hasError: false })}>إعادة المحاولة</Button>
      </Box>
    );
    return this.props.children;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function RehabDashboardInner() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [plans, setPlans] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'info' });
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ beneficiary: '', primaryDiagnosis: '', disabilityCategory: 'physical', templateUsed: 'comprehensive', startDate: '', endDate: '', sessionsPerWeek: 3 });
  const [newGoal, setNewGoal] = useState({ domain: 'motorSkills', goalText: '', measurableTarget: '', measurementTool: '', targetWeek: 6, priority: 'medium' });
  const [newSession, setNewSession] = useState({ date: '', sessionType: 'in_person', duration: 60, clinicalNotes: '', painLevelPre: 5, painLevelPost: 3 });

  const therapistId = getToken('userId') || localStorage.getItem('userId') || 'demo-therapist';
  const show = (msg, severity = 'info') => setSnack({ open: true, msg, severity });

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiCall(`/dashboard/${therapistId}`);
      setDashboard(res.data || res);
      setPlans(res.data?.plans || res.plans || []);
    } catch {
      setDashboard(DEMO_DASHBOARD); setPlans(DEMO_PLANS);
      setError('وضع العرض التجريبي — الاتصال بالخادم غير متاح');
    } finally { setLoading(false); }
  }, [therapistId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleCreatePlan = async () => {
    if (!newPlan.beneficiary?.trim()) return show('رقم/اسم المستفيد مطلوب', 'error');
    if (!newPlan.primaryDiagnosis?.trim()) return show('التشخيص الأساسي مطلوب', 'error');
    if (!newPlan.startDate) return show('تاريخ البدء مطلوب', 'error');
    try { await apiCall('/', { method: 'POST', body: JSON.stringify(newPlan) }); show('تم إنشاء الخطة بنجاح', 'success'); setNewPlanOpen(false); fetchDashboard(); }
    catch (e) { show(e.message, 'error'); }
  };
  const handleAddGoal = async () => {
    if (!selectedPlan || !newGoal.goalText?.trim()) return show('نص الهدف مطلوب', 'error');
    try { await apiCall(`/${selectedPlan._id}/goals`, { method: 'POST', body: JSON.stringify(newGoal) }); show('تمت إضافة الهدف', 'success'); setGoalDialogOpen(false); }
    catch (e) { show(e.message, 'error'); }
  };
  const handleRecordSession = async () => {
    if (!selectedPlan || !newSession.date) return show('تاريخ الجلسة مطلوب', 'error');
    const sid = selectedPlan.services?.[0]?._id;
    if (!sid) return show('لا توجد خدمة مرتبطة', 'error');
    try { await apiCall(`/${selectedPlan._id}/services/${sid}/sessions`, { method: 'POST', body: JSON.stringify(newSession) }); show('تم تسجيل الجلسة', 'success'); setSessionDialogOpen(false); }
    catch (e) { show(e.message, 'error'); }
  };
  const handleAI = async (plan) => {
    setAiLoading(true);
    try { const r = await apiCall(`/beneficiary/${plan.beneficiary}/ai-assessment`, { method: 'POST' }); show(`تقييم AI مكتمل — مستوى الخطر: ${r.data?.riskLevel || 'moderate'}`, 'info'); fetchDashboard(); }
    catch (e) { show(e.message, 'error'); }
    finally { setAiLoading(false); }
  };

  const stats = dashboard?.stats || DEMO_DASHBOARD.stats;
  const alerts = dashboard?.alerts || [];
  const upcomingTele = dashboard?.upcomingTeleSessions || [];

  const TABS = [
    { label: 'الخطط',           icon: <FitnessCenter sx={{ fontSize: 15 }} /> },
    { label: 'التقدم والأهداف', icon: <Assessment sx={{ fontSize: 15 }} /> },
    { label: 'تقييم AI',        icon: <SmartToy sx={{ fontSize: 15 }} /> },
    { label: 'Tele-Rehab',      icon: <VideoCall sx={{ fontSize: 15 }} /> },
    { label: 'التنبيهات',       icon: <NotificationsActive sx={{ fontSize: 15 }} />, badge: alerts.length },
  ];

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 2 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid transparent', borderTopColor: '#3b82f6', borderRightColor: '#8b5cf6' }} />
      </motion.div>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>جارٍ تحميل بيانات التأهيل…</Typography>
    </Box>
  );

  return (
    <Box dir="rtl" sx={{
      minHeight: '100vh',
      background: isDark ? 'linear-gradient(135deg, #0a0f1e, #0f172a, #0a1628)' : 'linear-gradient(135deg, #f0f9ff, #f8fafc, #faf5ff)',
      p: 3, fontFamily: "'Tajawal', 'Segoe UI', sans-serif",
    }}>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 2.5, background: alpha('#f59e0b', 0.1), border: `1px solid ${alpha('#f59e0b', 0.3)}`, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning sx={{ color: '#f59e0b', fontSize: 18 }} />
              <Typography sx={{ fontSize: '0.8rem', color: '#92400e', flex: 1 }}>{error}</Typography>
              <IconButton size="small" onClick={() => setError(null)}>✕</IconButton>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.8, borderRadius: 3, background: 'linear-gradient(135deg, #10b981, #3b82f6)', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}>
                <MedicalServices sx={{ color: '#fff', fontSize: 20 }} />
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>لوحة التأهيل الذكية</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.4, borderRadius: 5, background: alpha('#10b981', 0.12), border: `1px solid ${alpha('#10b981', 0.3)}` }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', animation: 'pulse 2s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981' }}>AI مفعّل</Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>خطط التأهيل الفردية · 12 أسبوعًا · مدعومة بالذكاء الاصطناعي</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="تحديث">
              <IconButton onClick={fetchDashboard} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)', border: `1px solid ${theme.palette.divider}`, backdropFilter: 'blur(10px)' }}>
                <Refresh sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Box component="button" onClick={() => setNewPlanOpen(true)} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 2, py: 1, border: 'none', cursor: 'pointer', borderRadius: 2.5, background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 700, boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
              <Add sx={{ fontSize: 18 }} />خطة جديدة
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <StatCard title="الخطط النشطة"  value={stats.activePlans}              subtitle={`من ${stats.totalPlans} إجمالي`}        icon={<FitnessCenter sx={{ fontSize: 18 }} />} gradient={['#3b82f6','#60a5fa']} trend={12}                           delay={0}    />
        <StatCard title="جلسات الأسبوع" value={stats.sessionsThisWeek}         subtitle={`${stats.attendanceRate ?? 0}% حضور`}   icon={<Schedule sx={{ fontSize: 18 }} />}      gradient={['#8b5cf6','#a78bfa']}                                       delay={0.05} />
        <StatCard title="متوسط التقدم"  value={`${stats.avgProgress ?? 0}%`}   subtitle="عبر جميع الخطط"                        icon={<TrendingUp sx={{ fontSize: 18 }} />}    gradient={['#10b981','#34d399']} trend={stats.progressTrend ?? 8}       delay={0.1}  />
        <StatCard title="تنبيهات AI"    value={stats.aiAlerts ?? alerts.length} subtitle="تحتاج متابعة"                         icon={<SmartToy sx={{ fontSize: 18 }} />}      gradient={alerts.length > 0 ? ['#ef4444','#f87171'] : ['#06b6d4','#22d3ee']} delay={0.15} />
      </Box>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Glass sx={{ mb: 2.5, p: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap', borderRadius: 3 }}>
          {TABS.map((t, i) => (
            <Box key={i} sx={{ position: 'relative' }}>
              <TabBtn active={tab === i} label={t.label} icon={t.icon} onClick={() => setTab(i)} />
              {t.badge > 0 && <Box sx={{ position: 'absolute', top: 2, insetInlineEnd: 2, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: 800 }}>{t.badge}</Box>}
            </Box>
          ))}
        </Glass>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>

          {/* TAB 0 — الخطط */}
          {tab === 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, gap: 2 }}>
              <Glass sx={{ overflow: 'hidden' }}>
                <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>قائمة خطط التأهيل ({plans.length})</Typography>
                  <Box component="button" onClick={() => setNewPlanOpen(true)} sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.7, border: 'none', cursor: 'pointer', borderRadius: 2, background: alpha('#10b981', 0.1), color: '#10b981', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700 }}>
                    <Add sx={{ fontSize: 15 }} /> إضافة
                  </Box>
                </Box>
                <Box sx={{ p: 2, maxHeight: 520, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: alpha('#3b82f6', 0.3) } }}>
                  {plans.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      <FitnessCenter sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                      <Typography>لا توجد خطط بعد. أنشئ خطة جديدة.</Typography>
                    </Box>
                  ) : plans.map((p, i) => (
                    <PlanCard key={p._id || p.planCode} plan={p} idx={i}
                      onView={pl => { setSelectedPlan(pl); setTab(1); }}
                      onEdit={pl => setSelectedPlan(pl)}
                    />
                  ))}
                </Box>
              </Glass>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Tele Sessions */}
                <Glass sx={{ overflow: 'hidden' }}>
                  <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><VideoCall sx={{ color: '#fff', fontSize: 16 }} /></Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>جلسات Tele-Rehab القادمة</Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    {upcomingTele.length === 0 ? (
                      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', textAlign: 'center', py: 2 }}>لا جلسات مجدولة</Typography>
                    ) : upcomingTele.slice(0, 4).map((s, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2.5, mb: 1, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(249,250,251,0.8)', border: `1px solid ${theme.palette.divider}` }}>
                          <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', fontSize: '0.7rem', fontWeight: 700 }}>{(s.beneficiaryName || '?').slice(0, 2)}</Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.beneficiaryName || `جلسة ${i + 1}`}</Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString('ar-SA') : 'قيد الجدولة'}</Typography>
                          </Box>
                          <Box sx={{ px: 1, py: 0.2, borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, background: alpha('#8b5cf6', 0.12), color: '#8b5cf6' }}>{s.platform || 'Zoom'}</Box>
                        </Box>
                      </motion.div>
                    ))}
                  </Box>
                </Glass>

                {/* AI Alerts */}
                <Glass sx={{ overflow: 'hidden' }}>
                  <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '10px', background: 'linear-gradient(135deg, #ef4444, #f87171)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SmartToy sx={{ color: '#fff', fontSize: 16 }} /></Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>تنبيهات AI</Typography>
                    {alerts.length > 0 && <Box sx={{ ml: 'auto', px: 1, py: 0.2, borderRadius: 5, background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>{alerts.length}</Box>}
                  </Box>
                  <Box sx={{ p: 2 }}>
                    {alerts.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <CheckCircle sx={{ fontSize: 32, color: '#10b981', opacity: 0.6, mb: 0.5 }} />
                        <Typography sx={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>جميع المرضى في المسار الصحيح</Typography>
                      </Box>
                    ) : alerts.slice(0, 3).map((a, i) => <AlertCard key={i} alert={a} idx={i} />)}
                  </Box>
                </Glass>
              </Box>
            </Box>
          )}

          {/* TAB 1 — التقدم */}
          {tab === 1 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Glass sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                  <TrendingUp sx={{ color: '#3b82f6' }} />
                  <Typography sx={{ fontWeight: 700 }}>مؤشرات التقدم</Typography>
                  {selectedPlan && <Box sx={{ ml: 'auto', px: 1.5, py: 0.3, borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, background: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>{selectedPlan.planCode}</Box>}
                </Box>
                {selectedPlan ? (
                  <>
                    {[
                      { label: '🦵 التحرك والمشي',      value: selectedPlan.progressMetrics?.mobility ?? 65,       gradient: ['#3b82f6','#60a5fa'] },
                      { label: '💪 القوة العضلية',      value: selectedPlan.progressMetrics?.strength ?? 50,       gradient: ['#8b5cf6','#a78bfa'] },
                      { label: '🎯 نطاق الحركة (ROM)', value: selectedPlan.progressMetrics?.ROM ?? 75,            gradient: ['#10b981','#34d399'] },
                      { label: '😌 انخفاض الألم',       value: selectedPlan.progressMetrics?.painReduction ?? 80, gradient: ['#f59e0b','#fbbf24'] },
                      { label: '🏠 أنشطة يومية (ADL)', value: selectedPlan.progressMetrics?.ADL ?? 55,            gradient: ['#06b6d4','#22d3ee'] },
                      { label: '🧠 التوازن والتنسيق',  value: selectedPlan.progressMetrics?.balance ?? 70,        gradient: ['#ec4899','#f472b6'] },
                    ].map((r, i) => <ProgressRow key={i} {...r} />)}
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.05)' : alpha('#3b82f6', 0.06) }}>
                      <Typography sx={{ fontWeight: 700 }}>التقدم الإجمالي</Typography>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {selectedPlan.progressMetrics?.overallProgress ?? 0}%
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    <Assessment sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                    <Typography sx={{ fontSize: '0.85rem' }}>اختر خطة من تبويب "الخطط" لعرض التقدم</Typography>
                  </Box>
                )}
              </Glass>

              <Glass sx={{ overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>أهداف SMART</Typography>
                  {selectedPlan && (
                    <Box component="button" onClick={() => setGoalDialogOpen(true)} sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.7, border: 'none', cursor: 'pointer', borderRadius: 2, background: alpha('#10b981', 0.1), color: '#10b981', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700 }}>
                      <Add sx={{ fontSize: 14 }} /> هدف جديد
                    </Box>
                  )}
                </Box>
                <Box sx={{ p: 2 }}>
                  {selectedPlan?.goals?.length > 0 ? selectedPlan.goals.map((g, i) => {
                    const gs = g.status === 'achieved' ? { label: 'محقق', color: '#10b981', icon: '✅' } : g.status === 'in_progress' ? { label: 'جاري', color: '#3b82f6', icon: '🔄' } : { label: 'لم يبدأ', color: '#6b7280', icon: '⭕' };
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <Box sx={{ p: 1.8, mb: 1.2, borderRadius: 2.5, background: isDark ? 'rgba(255,255,255,0.03)' : alpha(gs.color, 0.04), border: `1px solid ${alpha(gs.color, 0.2)}` }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{g.goalText}</Typography>
                            <Box sx={{ px: 1, py: 0.2, borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, background: alpha(gs.color, 0.12), color: gs.color }}>{gs.icon} {gs.label}</Box>
                          </Box>
                          {g.measurableTarget && <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>🎯 {g.measurableTarget}</Typography>}
                          <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.3 }}>الأسبوع: {g.targetWeek}</Typography>
                        </Box>
                      </motion.div>
                    );
                  }) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      <Typography sx={{ fontSize: '0.85rem' }}>{selectedPlan ? 'لا أهداف مُضافة بعد' : 'اختر خطة أولاً'}</Typography>
                    </Box>
                  )}
                </Box>
              </Glass>

              {selectedPlan && (
                <Glass sx={{ gridColumn: { md: '1 / -1' }, overflow: 'hidden' }}>
                  <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ fontWeight: 700 }}>سجل الجلسات</Typography>
                    <Box component="button" onClick={() => setSessionDialogOpen(true)} sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.7, border: 'none', cursor: 'pointer', borderRadius: 2, background: alpha('#3b82f6', 0.1), color: '#3b82f6', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700 }}>
                      <Add sx={{ fontSize: 14 }} /> تسجيل جلسة
                    </Box>
                  </Box>
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['#','التاريخ','النوع','ألم قبل','ألم بعد','الحضور'].map(h => (
                        <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'start', fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderBottom: `1px solid ${theme.palette.divider}`, textTransform: 'uppercase' }}>{h}</Box>
                      ))}</tr></thead>
                      <tbody>
                        {(selectedPlan.services || []).flatMap(s => s.sessions || []).slice(-10).map((sess, i) => (
                          <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                            <Box component="td" sx={{ px: 2, py: 1.3, fontSize: '0.78rem', borderBottom: `1px solid ${theme.palette.divider}` }}>{sess.sessionNumber || i + 1}</Box>
                            <Box component="td" sx={{ px: 2, py: 1.3, fontSize: '0.78rem', borderBottom: `1px solid ${theme.palette.divider}` }}>{sess.date ? new Date(sess.date).toLocaleDateString('ar-SA') : '—'}</Box>
                            <Box component="td" sx={{ px: 2, py: 1.3, borderBottom: `1px solid ${theme.palette.divider}` }}>
                              <Box sx={{ px: 1.2, py: 0.3, borderRadius: 5, fontSize: '0.68rem', fontWeight: 700, display: 'inline-flex', background: alpha('#3b82f6', 0.12), color: '#3b82f6' }}>
                                {sess.sessionType === 'tele' ? 'عن بُعد' : sess.sessionType === 'in_person' ? 'حضوري' : sess.sessionType === 'home' ? 'منزلي' : sess.sessionType || '—'}
                              </Box>
                            </Box>
                            <Box component="td" sx={{ px: 2, py: 1.3, fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', borderBottom: `1px solid ${theme.palette.divider}` }}>{sess.painLevelPre ?? '—'}</Box>
                            <Box component="td" sx={{ px: 2, py: 1.3, fontSize: '0.8rem', fontWeight: 700, color: '#10b981', borderBottom: `1px solid ${theme.palette.divider}` }}>{sess.painLevelPost ?? '—'}</Box>
                            <Box component="td" sx={{ px: 2, py: 1.3, borderBottom: `1px solid ${theme.palette.divider}` }}>
                              {sess.attendanceStatus === 'present' ? <CheckCircle sx={{ fontSize: 18, color: '#10b981' }} /> : <Warning sx={{ fontSize: 18, color: '#f59e0b' }} />}
                            </Box>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Glass>
              )}
            </Box>
          )}

          {/* TAB 2 — AI */}
          {tab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Box sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #0d1b2a, #1a3a5c, #0d2a1f)', color: '#e8f4fd', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: '14px', background: 'rgba(91,200,245,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(91,200,245,0.3)' }}>
                      <Psychology sx={{ color: '#5bc8f5', fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#5bc8f5', fontWeight: 800, fontSize: '1.1rem' }}>نظام تقييم الذكاء الاصطناعي — الإصدار 6.0</Typography>
                      <Typography sx={{ color: 'rgba(232,244,253,0.7)', fontSize: '0.78rem' }}>خوارزميات ML لتقييم المخاطر، توقع النتائج، والتوصيات الشخصية</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5 }}>
                    {[
                      { title: 'تحليل الحركة', desc: 'كاميرات ثلاثية الأبعاد لتحليل أنماط المشي', icon: '📹' },
                      { title: 'تنبؤ بالنتائج', desc: 'توقع الوصول إلى الأهداف بناءً على معدل التحسن', icon: '🔮' },
                      { title: 'تقييم المخاطر', desc: 'اكتشاف مبكر للمرضى الذين ينحرفون عن المسار', icon: '⚠️' },
                      { title: 'تعلم تكيفي', desc: 'تعديل صعوبة التمارين تلقائيًا', icon: '🧠' },
                    ].map((f, i) => (
                      <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}>
                        <Box sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(91,200,245,0.2)', '&:hover': { background: 'rgba(255,255,255,0.1)' }, transition: '0.2s' }}>
                          <Typography sx={{ fontSize: '1.3rem', mb: 0.5 }}>{f.icon}</Typography>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#5bc8f5', mb: 0.5 }}>{f.title}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(232,244,253,0.8)' }}>{f.desc}</Typography>
                        </Box>
                      </motion.div>
                    ))}
                  </Box>
                </Box>
              </motion.div>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
                {plans.map((plan, i) => {
                  const risk = RISK_MAP[plan.latestRiskLevel] || RISK_MAP.moderate;
                  return (
                    <motion.div key={plan._id || plan.planCode} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                      <Glass sx={{ overflow: 'hidden' }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 36, height: 36, background: `linear-gradient(135deg, ${risk.color}, ${risk.color}aa)`, fontSize: '0.75rem', fontWeight: 700 }}>{(plan.beneficiaryName || '?').slice(0, 2)}</Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{plan.planCode}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{plan.beneficiaryName} · {plan.primaryDiagnosis}</Typography>
                          </Box>
                          <Box component="button" onClick={() => handleAI(plan)} disabled={aiLoading} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.8, border: 'none', cursor: 'pointer', borderRadius: 2, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 700 }}>
                            {aiLoading ? <CircularProgress size={12} color="inherit" /> : <Psychology sx={{ fontSize: 14 }} />} تقييم AI
                          </Box>
                        </Box>
                        <Box sx={{ p: 2 }}>
                          {plan.latestRiskLevel && (
                            <Box sx={{ p: 1.5, borderRadius: 2, mb: 1.5, background: alpha(risk.color, 0.08), border: `1px solid ${alpha(risk.color, 0.25)}` }}>
                              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: risk.color }}>
                                {risk.icon} مستوى الخطر: {risk.label}
                                {plan.latestPredictedOutcome !== null && plan.latestPredictedOutcome !== undefined && ` · التحسن المتوقع: ${plan.latestPredictedOutcome}%`}
                              </Typography>
                            </Box>
                          )}
                          {plan.aiAssessments?.slice(-1).map((a, j) => (
                            <Box key={j}>{a.recommendations?.map((r, ri) => (
                              <Typography key={ri} sx={{ fontSize: '0.78rem', mb: 0.6, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                                <Box component="span" sx={{ color: '#3b82f6', fontWeight: 800, flexShrink: 0 }}>›</Box> {r}
                              </Typography>
                            ))}</Box>
                          ))}
                        </Box>
                      </Glass>
                    </motion.div>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* TAB 3 — Tele */}
          {tab === 3 && (
            <Glass sx={{ overflow: 'hidden' }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><VideoCall sx={{ color: '#fff', fontSize: 20 }} /></Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>جلسات التأهيل عن بُعد</Typography>
              </Box>
              {upcomingTele.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <VideoCall sx={{ fontSize: 64, opacity: 0.25, mb: 2 }} />
                  <Typography>لا توجد جلسات مجدولة</Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['المريض','التاريخ والوقت','المنصة','الحالة','الإجراء'].map(h => (
                      <Box key={h} component="th" sx={{ px: 2.5, py: 1.5, textAlign: 'start', fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderBottom: `1px solid ${theme.palette.divider}`, textTransform: 'uppercase' }}>{h}</Box>
                    ))}</tr></thead>
                    <tbody>
                      {upcomingTele.map((s, i) => (
                        <motion.tr key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                          <Box component="td" sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', fontSize: '0.7rem' }}>{(s.beneficiaryName || '?').slice(0, 2)}</Avatar>
                              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.beneficiaryName || `مريض ${i + 1}`}</Typography>
                            </Box>
                          </Box>
                          <Box component="td" sx={{ px: 2.5, py: 1.8, fontSize: '0.8rem', borderBottom: `1px solid ${theme.palette.divider}` }}>{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString('ar-SA') : '—'}</Box>
                          <Box component="td" sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${theme.palette.divider}` }}><Box sx={{ px: 1.2, py: 0.3, borderRadius: 5, fontSize: '0.68rem', fontWeight: 700, display: 'inline-flex', background: alpha('#8b5cf6', 0.12), color: '#8b5cf6' }}>{s.platform || 'Zoom'}</Box></Box>
                          <Box component="td" sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${theme.palette.divider}` }}><Box sx={{ px: 1.2, py: 0.3, borderRadius: 5, fontSize: '0.68rem', fontWeight: 700, display: 'inline-flex', background: alpha('#3b82f6', 0.12), color: '#3b82f6' }}>{s.status === 'scheduled' ? 'مجدولة' : s.status}</Box></Box>
                          <Box component="td" sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <Box component="a" href={s.meetingLink || '#'} target="_blank" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.7, borderRadius: 2, textDecoration: 'none', background: s.meetingLink ? 'linear-gradient(135deg, #10b981, #34d399)' : alpha('#6b7280', 0.1), color: s.meetingLink ? '#fff' : '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>
                              <PlayArrow sx={{ fontSize: 14 }} /> انضم
                            </Box>
                          </Box>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Glass>
          )}

          {/* TAB 4 — التنبيهات */}
          {tab === 4 && (
            <Box>
              {alerts.length === 0 ? (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <Glass sx={{ p: 4, textAlign: 'center' }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', background: alpha('#10b981', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <CheckCircle sx={{ fontSize: 40, color: '#10b981' }} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#10b981', mb: 0.5 }}>لا توجد تنبيهات حرجة</Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>جميع مرضاك في المسار الصحيح للوصول إلى أهدافهم</Typography>
                  </Glass>
                </motion.div>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 1.5 }}>
                  {alerts.map((a, i) => <AlertCard key={i} alert={a} idx={i} />)}
                </Box>
              )}
            </Box>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dialogs */}
      <Dialog open={newPlanOpen} onClose={() => setNewPlanOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>➕ إنشاء خطة تأهيل جديدة</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <TextField fullWidth label="رقم المستفيد / الاسم *" size="small" sx={{ gridColumn: '1/-1' }} value={newPlan.beneficiary} onChange={e => setNewPlan({ ...newPlan, beneficiary: e.target.value })} />
            <TextField fullWidth label="التشخيص الأساسي *" size="small" sx={{ gridColumn: '1/-1' }} value={newPlan.primaryDiagnosis} onChange={e => setNewPlan({ ...newPlan, primaryDiagnosis: e.target.value })} />
            <FormControl fullWidth size="small"><InputLabel>فئة الإعاقة</InputLabel>
              <Select value={newPlan.disabilityCategory} label="فئة الإعاقة" onChange={e => setNewPlan({ ...newPlan, disabilityCategory: e.target.value })}>
                {[['physical','جسمية'],['sensory_visual','بصرية'],['sensory_hearing','سمعية'],['intellectual','ذهنية'],['autism','توحد'],['multiple','مركبة']].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small"><InputLabel>القالب</InputLabel>
              <Select value={newPlan.templateUsed} label="القالب" onChange={e => setNewPlan({ ...newPlan, templateUsed: e.target.value })}>
                {[['comprehensive','شامل'],['vocational','مهني'],['educational','تعليمي'],['earlyIntervention','تدخل مبكر'],['independentLiving','استقلالية']].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="تاريخ البدء" type="date" size="small" InputLabelProps={{ shrink: true }} value={newPlan.startDate} onChange={e => setNewPlan({ ...newPlan, startDate: e.target.value })} />
            <TextField fullWidth label="تاريخ الانتهاء" type="date" size="small" InputLabelProps={{ shrink: true }} value={newPlan.endDate} onChange={e => setNewPlan({ ...newPlan, endDate: e.target.value })} />
            <TextField fullWidth label="جلسات أسبوعيًا" type="number" size="small" sx={{ gridColumn: '1/-1' }} value={newPlan.sessionsPerWeek} onChange={e => setNewPlan({ ...newPlan, sessionsPerWeek: +e.target.value })} inputProps={{ min: 1, max: 7 }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setNewPlanOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreatePlan} sx={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', px: 3 }}>إنشاء الخطة</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>🎯 إضافة هدف SMART</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <TextField fullWidth label="نص الهدف *" multiline rows={2} size="small" sx={{ gridColumn: '1/-1' }} value={newGoal.goalText} onChange={e => setNewGoal({ ...newGoal, goalText: e.target.value })} />
            <TextField fullWidth label="المعيار القابل للقياس" size="small" sx={{ gridColumn: '1/-1' }} value={newGoal.measurableTarget} onChange={e => setNewGoal({ ...newGoal, measurableTarget: e.target.value })} />
            <FormControl fullWidth size="small"><InputLabel>المجال</InputLabel>
              <Select value={newGoal.domain} label="المجال" onChange={e => setNewGoal({ ...newGoal, domain: e.target.value })}>
                {[['motorSkills','حركي'],['communication','تواصل'],['dailyLiving','حياة يومية'],['cognitive','معرفي'],['pain','الألم'],['vocational','مهني']].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="أداة القياس" size="small" placeholder="FIM, NRS…" value={newGoal.measurementTool} onChange={e => setNewGoal({ ...newGoal, measurementTool: e.target.value })} />
            <TextField fullWidth label="الأسبوع المستهدف" type="number" size="small" value={newGoal.targetWeek} onChange={e => setNewGoal({ ...newGoal, targetWeek: +e.target.value })} inputProps={{ min: 1, max: 12 }} />
            <FormControl fullWidth size="small"><InputLabel>الأولوية</InputLabel>
              <Select value={newGoal.priority} label="الأولوية" onChange={e => setNewGoal({ ...newGoal, priority: e.target.value })}>
                {[['critical','حرجة'],['high','عالية'],['medium','متوسطة'],['low','منخفضة']].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setGoalDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddGoal} sx={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', px: 3 }}>إضافة الهدف</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>📋 تسجيل جلسة علاجية</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <TextField fullWidth label="تاريخ الجلسة *" type="date" size="small" InputLabelProps={{ shrink: true }} value={newSession.date} onChange={e => setNewSession({ ...newSession, date: e.target.value })} />
            <FormControl fullWidth size="small"><InputLabel>نوع الجلسة</InputLabel>
              <Select value={newSession.sessionType} label="نوع الجلسة" onChange={e => setNewSession({ ...newSession, sessionType: e.target.value })}>
                {[['in_person','حضوري'],['tele','عن بُعد'],['home','منزلي'],['group','جماعي']].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="المدة (دقيقة)" type="number" size="small" value={newSession.duration} onChange={e => setNewSession({ ...newSession, duration: +e.target.value })} />
            <Box />
            <TextField fullWidth label="ألم قبل (0-10)" type="number" size="small" value={newSession.painLevelPre} onChange={e => setNewSession({ ...newSession, painLevelPre: +e.target.value })} inputProps={{ min: 0, max: 10 }} />
            <TextField fullWidth label="ألم بعد (0-10)" type="number" size="small" value={newSession.painLevelPost} onChange={e => setNewSession({ ...newSession, painLevelPost: +e.target.value })} inputProps={{ min: 0, max: 10 }} />
            <TextField fullWidth label="ملاحظات سريرية" multiline rows={3} size="small" sx={{ gridColumn: '1/-1' }} value={newSession.clinicalNotes} onChange={e => setNewSession({ ...newSession, clinicalNotes: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setSessionDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleRecordSession} sx={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', px: 3 }}>حفظ الجلسة</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2.5, fontFamily: 'Tajawal, sans-serif' }}>{snack.msg}</Alert>
      </Snackbar>

      {/* FAB */}
      <motion.div style={{ position: 'fixed', bottom: 28, insetInlineStart: 28, zIndex: 1000 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
        <Box component="button" onClick={() => setNewPlanOpen(true)} sx={{ width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 6px 24px rgba(16,185,129,0.5)' }}>
          <Add sx={{ fontSize: 24 }} />
        </Box>
      </motion.div>
    </Box>
  );
}

export default function RehabDashboard() {
  return <RehabErrorBoundary><RehabDashboardInner /></RehabErrorBoundary>;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_DASHBOARD = {
  stats: { activePlans: 8, totalPlans: 12, sessionsThisWeek: 24, attendanceRate: 92, avgProgress: 63, progressTrend: 8, aiAlerts: 2 },
  alerts: [
    { severity: 'warning', title: 'احتمال تأخر في تحقيق الهدف', message: 'المريض أحمد عبدالله لم يحضر 3 جلسات متتالية', planCode: 'RHP-2026-00001' },
    { severity: 'info', title: 'توصية AI', message: 'يُنصح بزيادة تكرار تمارين التوازن لمريضة سارة محمد بنسبة 20%', planCode: 'RHP-2026-00003' },
  ],
  upcomingTeleSessions: [
    { beneficiaryName: 'أحمد عبدالله', scheduledAt: new Date(Date.now() + 86400000).toISOString(), platform: 'Zoom', status: 'scheduled', meetingLink: '#' },
    { beneficiaryName: 'سارة محمد', scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(), platform: 'Teams', status: 'scheduled', meetingLink: '#' },
  ],
};
const DEMO_PLANS = [
  { _id: 'plan1', planCode: 'RHP-2026-00001', beneficiaryName: 'أحمد عبدالله', primaryDiagnosis: 'إصابة نخاع شوكي T10', status: 'active', totalWeeks: 12, latestRiskLevel: 'moderate', latestPredictedOutcome: 72, progressMetrics: { mobility: 65, strength: 55, ROM: 70, painReduction: 75, ADL: 60, balance: 68, overallProgress: 64 }, goals: [{ goalText: 'المشي 50 مترًا بعصا واحدة', measurableTarget: '50م', targetWeek: 6, status: 'in_progress' }, { goalText: 'تقليل الألم إلى NRS ≤ 3', measurableTarget: 'NRS ≤ 3', targetWeek: 4, status: 'achieved' }], services: [{ _id: 'svc1', sessions: [] }], aiAssessments: [{ riskLevel: 'moderate', predictedOutcome: 72, recommendations: ['زيادة تمارين التوازن', 'مراجعة برنامج الألم', 'تحفيز حضور الجلسات'] }], beneficiary: 'ben1' },
  { _id: 'plan2', planCode: 'RHP-2026-00002', beneficiaryName: 'يوسف عمر', primaryDiagnosis: 'متلازمة داون — تأخر حركي', status: 'active', totalWeeks: 12, latestRiskLevel: 'low', latestPredictedOutcome: 85, progressMetrics: { mobility: 75, strength: 60, ROM: 80, painReduction: 90, ADL: 70, balance: 72, overallProgress: 75 }, goals: [{ goalText: 'الركض 20 مترًا دون سقوط', measurableTarget: '20م', targetWeek: 4, status: 'achieved' }, { goalText: 'قطع المقص وتلوين داخل الخطوط', measurableTarget: 'دقة 80%', targetWeek: 6, status: 'in_progress' }], services: [{ _id: 'svc2', sessions: [] }], aiAssessments: [{ riskLevel: 'low', predictedOutcome: 85, recommendations: ['الاستمرار في برنامج NDT', 'إضافة سباحة أسبوعية'] }], beneficiary: 'ben2' },
];
