/**
 * 🏢 HQDashboard v5 — Premium Executive Command Center
 * لوحة تحكم المقر الرئيسي — تصميم بريميوم احترافي شامل
 *
 * Features:
 *   • LiveMetricsTicker  — شريط مؤشرات مباشرة متحرك
 *   • AICommandBar       — CMD+K شريط أوامر ذكي
 *   • SmartInsightsPanel — رؤى ذكاء اصطناعي
 *   • PerformanceRings   — حلقات أداء SVG
 *   • Premium branch table بتصميم glass
 *   • Floating action button
 *
 * Access: hq_super_admin, hq_admin
 * API:    GET /api/branch-management/hq/dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import { getToken } from '../utils/tokenStorage';

/* ── New Premium Components ───────────────────────────── */

/* ── Icons ────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────── */
const API_BASE = '/api/branch-management';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken() || ''}`,
});

const apiFetch = async (url) => {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const BRANCH_REGIONS = {
  الرياض:            ['HQ', 'RY-MAIN', 'RY-NORTH'],
  جدة:               ['JD-MAIN', 'JD-SOUTH'],
  'المنطقة الشرقية': ['DM', 'KH'],
  'الغرب والوسط':    ['TF', 'TB', 'MD', 'QS', 'HL', 'AB'],
};

/* ─────────────────────────────────────────────────────── */
/*  Glass KPI Card                                         */
/* ─────────────────────────────────────────────────────── */
const KPICard = ({ title, value, unit = '', change, gradient, glow, icon, delay = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isUp = change > 0;
  const isDown = change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.34, 1.1, 0.64, 1] }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Paper elevation={0} sx={{
        borderRadius: '18px',
        p: 2.5,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: isDark
          ? 'linear-gradient(145deg,rgba(15,20,40,0.97),rgba(20,15,45,0.97))'
          : 'linear-gradient(145deg,rgba(255,255,255,0.97),rgba(250,248,255,0.97))',
        backdropFilter: 'blur(20px)',
        border: '1px solid',
        borderColor: isDark ? `${glow}22` : `${glow}18`,
        boxShadow: isDark
          ? `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 ${glow}18`
          : `0 8px 32px ${glow}14, inset 0 1px 0 rgba(255,255,255,1)`,
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        '&:hover': { borderColor: `${glow}40`, boxShadow: `0 16px 48px ${glow}20` },
      }}>
        {/* Top bar */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: gradient, borderRadius: '18px 18px 0 0',
        }} />

        {/* BG orb */}
        <Box sx={{
          position: 'absolute', top: -30, insetInlineEnd: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: gradient, opacity: isDark ? 0.07 : 0.05,
          filter: 'blur(20px)', pointerEvents: 'none',
        }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 500, mb: 0.8 }}>
              {title}
            </Typography>
            <Typography sx={{
              fontSize: '1.7rem', fontWeight: 900, lineHeight: 1.1,
              background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
              {unit && <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 600 }}> {unit}</Box>}
            </Typography>

            {change !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.6 }}>
                {isUp   ? <TrendingUpIcon   sx={{ fontSize: 14, color: '#4caf50' }} />
                : isDown ? <TrendingDownIcon sx={{ fontSize: 14, color: '#f44336' }} />
                : null}
                <Typography sx={{
                  fontSize: '0.7rem', fontWeight: 700,
                  color: isUp ? '#4caf50' : isDown ? '#f44336' : 'text.secondary',
                }}>
                  {change > 0 ? '+' : ''}{change}%
                  <Box component="span" sx={{ fontWeight: 400, color: 'text.disabled', mr: 0.5 }}>
                    {' '}vs الشهر الماضي
                  </Box>
                </Typography>
              </Box>
            )}
          </Box>

          {/* Icon circle */}
          <Box sx={{
            width: 48, height: 48, borderRadius: '14px',
            background: gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 20px ${glow}40`,
            flexShrink: 0,
            '& svg': { fontSize: 22, color: 'white' },
          }}>
            {icon}
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────── */
/*  Branch Table Row                                       */
/* ─────────────────────────────────────────────────────── */
const BranchRow = ({ branch, index, onSelect, isDark }) => {
  const util = branch.stats?.capacity_utilization ?? 0;
  const statusColor = branch.status === 'active' ? '#4caf50' : branch.status === 'maintenance' ? '#ff9800' : '#9e9e9e';

  return (
    <motion.tr
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => onSelect(branch.code)}
      style={{ cursor: 'pointer' }}
    >
      <TableCell sx={{ py: 1.4, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: '9px',
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            '& svg': { fontSize: 16, color: 'white' },
          }}>
            <BusinessRoundedIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.8rem' }}>{branch.code}</Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>{branch.name_ar}</Typography>
          </Box>
        </Box>
      </TableCell>

      <TableCell sx={{ py: 1.4 }}>
        <Chip
          label={branch.status === 'active' ? 'نشط' : branch.status === 'maintenance' ? 'صيانة' : 'متوقف'}
          size="small"
          sx={{
            height: 20, fontSize: '0.6rem', fontWeight: 800,
            background: `${statusColor}14`,
            color: statusColor,
            border: `1px solid ${statusColor}30`,
          }}
        />
      </TableCell>

      <TableCell sx={{ py: 1.4 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
          {branch.stats?.patients_today ?? '—'}
        </Typography>
      </TableCell>

      <TableCell sx={{ py: 1.4 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
          {branch.stats?.sessions_today ?? '—'}
        </Typography>
      </TableCell>

      <TableCell sx={{ py: 1.4, minWidth: 120 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(util, 100)}
              sx={{
                height: 5, borderRadius: 3,
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: util > 85 ? 'linear-gradient(90deg,#f44336,#ff5722)'
                    : util > 65 ? 'linear-gradient(90deg,#ff9800,#ffd200)'
                    : 'linear-gradient(90deg,#43cea2,#185a9d)',
                },
              }}
            />
          </Box>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: util > 85 ? '#f44336' : 'text.secondary', minWidth: 28 }}>
            {util}%
          </Typography>
        </Box>
      </TableCell>

      <TableCell sx={{ py: 1.4 }}>
        <Typography sx={{
          fontWeight: 800, fontSize: '0.8rem',
          background: 'linear-gradient(135deg,#43cea2,#185a9d)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {branch.stats?.monthly_revenue
            ? `${(branch.stats.monthly_revenue / 1000).toFixed(0)}K`
            : '—'}
        </Typography>
      </TableCell>

      <TableCell sx={{ py: 1.4 }}>
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onSelect(branch.code); }}
          sx={{
            width: 28, height: 28, borderRadius: '8px',
            border: '1px solid rgba(102,126,234,0.2)',
            background: 'rgba(102,126,234,0.06)',
            '&:hover': { background: 'rgba(102,126,234,0.15)' },
          }}
        >
          <OpenInNewRoundedIcon sx={{ fontSize: 14, color: '#667eea' }} />
        </IconButton>
      </TableCell>
    </motion.tr>
  );
};

/* ─────────────────────────────────────────────────────── */
/*  Floating CMD+K Button                                  */
/* ─────────────────────────────────────────────────────── */
const FloatingCMD = ({ onClick }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0, y: 40 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay: 1.2, type: 'spring', stiffness: 300, damping: 20 }}
    style={{ position: 'fixed', bottom: 32, insetInlineEnd: 32, zIndex: 1200 }}
  >
    <Tooltip title="شريط الأوامر الذكي (Ctrl+K)" placement="right" arrow>
      <Box
        onClick={onClick}
        component={motion.div}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        sx={{
          width: 56, height: 56, borderRadius: '16px',
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(102,126,234,0.5)',
          animation: 'fabGlow 3s ease-in-out infinite',
          '@keyframes fabGlow': {
            '0%,100%': { boxShadow: '0 8px 32px rgba(102,126,234,0.5)' },
            '50%': { boxShadow: '0 12px 48px rgba(102,126,234,0.8)' },
          },
        }}
      >
        <FlashOnRoundedIcon sx={{ color: 'white', fontSize: 26 }} />
      </Box>
    </Tooltip>
  </motion.div>
);

/* ─────────────────────────────────────────────────────── */
/*  Top Performers Card                                    */
/* ─────────────────────────────────────────────────────── */
const TopPerformers = ({ performers, isDark }) => {
  const MEDALS = [
    { bg: 'linear-gradient(135deg,#f7971e,#ffd200)', shadow: '#f7971e' },
    { bg: 'linear-gradient(135deg,#b0bec5,#78909c)', shadow: '#b0bec5' },
    { bg: 'linear-gradient(135deg,#a0522d,#cd7c2f)', shadow: '#a0522d' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {(performers || []).slice(0, 5).map((b, i) => (
        <motion.div
          key={b.code}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
        >
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.2,
            p: 1.2, borderRadius: '12px',
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            transition: 'all 0.2s',
            '&:hover': {
              background: isDark ? 'rgba(102,126,234,0.08)' : 'rgba(102,126,234,0.05)',
              borderColor: 'rgba(102,126,234,0.2)',
            },
          }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: '8px',
              background: MEDALS[i]?.bg || 'linear-gradient(135deg,#667eea,#764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: MEDALS[i] ? `0 3px 8px ${MEDALS[i].shadow}40` : 'none',
              flexShrink: 0,
            }}>
              {i < 3
                ? <EmojiEventsRoundedIcon sx={{ fontSize: 14, color: 'white' }} />
                : <Typography sx={{ fontSize: '0.62rem', fontWeight: 900, color: 'white' }}>{i + 1}</Typography>
              }
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', lineHeight: 1.2 }} noWrap>
                {b.name_ar || b.code}
              </Typography>
              <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                النقاط: {b.performance_score ?? 0}
              </Typography>
            </Box>
            <Box sx={{
              px: 0.8, py: 0.2, borderRadius: '8px',
              background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.2)',
            }}>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: '#4caf50' }}>
                {b.performance_score ?? 0}
              </Typography>
            </Box>
          </Box>
        </motion.div>
      ))}
    </Box>
  );
};

/* ─────────────────────────────────────────────────────── */
/*  Alert Item                                             */
/* ─────────────────────────────────────────────────────── */
const AlertRow = ({ alert, index }) => {
  const ALERT_COLORS = {
    critical: { color: '#f44336', bg: 'rgba(244,67,54,0.08)', border: 'rgba(244,67,54,0.2)', icon: <ErrorRoundedIcon sx={{ fontSize: 16 }} /> },
    warning:  { color: '#ff9800', bg: 'rgba(255,152,0,0.08)', border: 'rgba(255,152,0,0.2)', icon: <WarningAmberRoundedIcon sx={{ fontSize: 16 }} /> },
    info:     { color: '#2196f3', bg: 'rgba(33,150,243,0.08)', border: 'rgba(33,150,243,0.2)', icon: <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> },
  };
  const cfg = ALERT_COLORS[alert.type] || ALERT_COLORS.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
    >
      <Box sx={{
        display: 'flex', gap: 1.2, p: 1.2, borderRadius: '11px',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        mb: 0.8, borderInlineStart: `3px solid ${cfg.color}`,
      }}>
        <Box sx={{ color: cfg.color, flexShrink: 0, mt: 0.1 }}>{cfg.icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, lineHeight: 1.3 }} noWrap>
            {alert.message}
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
            {alert.branch_code} · {new Date(alert.created_at || Date.now()).toLocaleDateString('ar-SA')}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────── */
/*  Main Component                                         */
/* ─────────────────────────────────────────────────────── */
const HQDashboard = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  /* State */
  const [dashboard, setDashboard]   = useState(null);
  const [alerts, setAlerts]         = useState([]);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState(0);
  const [filterRegion, setFilterRegion] = useState('all');
  const [cmdOpen, setCmdOpen]       = useState(false);
  const [metric, setMetric]         = useState('capacity_utilization');

  /* ── Keyboard shortcut for CMD+K ──── */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ── Data loading ────────────────── */
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* Auto-refresh 5 min */
  useEffect(() => {
    const t = setInterval(() => loadData(true), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadData]);

  /* Derived */
  const branches   = dashboard?.branches   || [];
  const summary    = dashboard?.summary    || {};
  const performers = dashboard?.top_performers || [];

  const filteredBranches = filterRegion === 'all'
    ? branches
    : branches.filter(b => BRANCH_REGIONS[filterRegion]?.includes(b.code));

  const criticalAlerts = alerts.filter(a => a.type === 'critical');

  /* ── Loading skeleton ─────────────── */
  if (loading) return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} variant="rounded" height={130} sx={{ flex: 1, minWidth: 150, borderRadius: '18px' }} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={44} sx={{ mb: 2.5, borderRadius: '14px' }} />
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Skeleton variant="rounded" height={420} sx={{ borderRadius: '20px' }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rounded" height={420} sx={{ borderRadius: '20px' }} />
        </Grid>
      </Grid>
    </Box>
  );

  /* ── Error state ──────────────────── */
  if (error) return (
    <Box sx={{ p: 4, textAlign: 'center', direction: 'rtl' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <Box sx={{
          width: 72, height: 72, borderRadius: '20px',
          background: 'rgba(244,67,54,0.1)',
          border: '1px solid rgba(244,67,54,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mx: 'auto', mb: 2,
        }}>
          <ErrorRoundedIcon sx={{ fontSize: 36, color: '#f44336' }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.8 }}>خطأ في تحميل البيانات</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 2 }}>{error}</Typography>
        <Box
          component={motion.div}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => loadData()}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            px: 3, py: 1.2, borderRadius: '12px',
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            cursor: 'pointer', color: 'white',
            boxShadow: '0 6px 20px rgba(102,126,234,0.4)',
          }}
        >
          <RefreshRoundedIcon sx={{ fontSize: 18 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>إعادة المحاولة</Typography>
        </Box>
      </motion.div>
    </Box>
  );

  /* ── TAB CONTENT PANELS ──────────── */
  const TABS = [
    { label: 'نظرة عامة',        icon: <MapRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'الماليات الموحدة', icon: <AccountBalanceRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: 'مقارنة الفروع',   icon: <CompareArrowsRoundedIcon sx={{ fontSize: 16 }} /> },
  ];

  /* Comparison bar */
  const compRows = branches.map(b => ({
    code: b.code, name_ar: b.name_ar,
    value: b.stats?.[metric] ?? 0,
  })).sort((a, b2) => (b2.value || 0) - (a.value || 0));
  const maxVal = Math.max(...compRows.map(r => r.value || 0), 1);

  /* ─────────────────────────────────── */
  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh', p: { xs: 2, md: 3 } }}>

      {/* ══ AI Command Bar ═══════════════════ */}
      <AICommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* ══ Page Header ══════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 2, mb: 2.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: '16px',
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(102,126,234,0.45)',
              animation: 'headerOrb 4s ease-in-out infinite',
              '@keyframes headerOrb': {
                '0%,100%': { boxShadow: '0 8px 24px rgba(102,126,234,0.45)' },
                '50%': { boxShadow: '0 12px 36px rgba(102,126,234,0.7)' },
              },
            }}>
              <BusinessRoundedIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{
                fontWeight: 900, fontSize: 'clamp(1.2rem,2.5vw,1.6rem)',
                background: 'linear-gradient(135deg,#667eea,#764ba2,#f093fb)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.3px', lineHeight: 1.2,
              }}>
                مركز القيادة التنفيذي
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  شبكة الأوائل للتأهيل · {branches.length} فرع
                </Typography>
                <Box sx={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#4caf50',
                  boxShadow: '0 0 8px rgba(76,175,80,0.6)',
                  animation: 'onlinePulse 2s ease-in-out infinite',
                  '@keyframes onlinePulse': {
                    '0%,100%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                  },
                }} />
                <Typography sx={{ fontSize: '0.65rem', color: '#4caf50', fontWeight: 700 }}>مباشر</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {criticalAlerts.length > 0 && (
              <Chip
                icon={<ErrorRoundedIcon sx={{ fontSize: '14px !important' }} />}
                label={`${criticalAlerts.length} تنبيه حرج`}
                sx={{
                  height: 28, fontWeight: 700, fontSize: '0.7rem',
                  background: 'rgba(244,67,54,0.1)',
                  border: '1px solid rgba(244,67,54,0.3)',
                  color: '#f44336',
                  '& .MuiChip-icon': { color: '#f44336' },
                }}
              />
            )}

            {/* CMD+K trigger */}
            <Tooltip title="شريط الأوامر الذكي (Ctrl+K)" arrow>
              <Box
                onClick={() => setCmdOpen(true)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 1.5, py: 0.7, borderRadius: '10px',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(102,126,234,0.25)' : 'rgba(102,126,234,0.15)',
                  background: isDark ? 'rgba(102,126,234,0.08)' : 'rgba(102,126,234,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { background: 'rgba(102,126,234,0.15)', borderColor: 'rgba(102,126,234,0.4)' },
                }}
              >
                <FlashOnRoundedIcon sx={{ fontSize: 16, color: '#667eea' }} />
                <Typography sx={{ fontSize: '0.72rem', color: '#667eea', fontWeight: 600 }}>
                  أوامر ذكية
                </Typography>
                <Box sx={{
                  px: 0.7, py: 0.1, borderRadius: '5px',
                  background: 'rgba(102,126,234,0.15)',
                  border: '1px solid rgba(102,126,234,0.2)',
                  fontFamily: 'monospace',
                  fontSize: '0.58rem',
                  color: '#667eea', fontWeight: 700,
                }}>
                  Ctrl+K
                </Box>
              </Box>
            </Tooltip>

            <Tooltip title="تحديث البيانات">
              <IconButton
                onClick={() => loadData(true)}
                size="small"
                sx={{
                  width: 36, height: 36, borderRadius: '10px',
                  border: '1px solid rgba(102,126,234,0.2)',
                  background: 'rgba(102,126,234,0.06)',
                  animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                  '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
                  '&:hover': { background: 'rgba(102,126,234,0.15)' },
                }}
              >
                <RefreshRoundedIcon sx={{ fontSize: 18, color: '#667eea' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </motion.div>

      {/* ══ KPI Cards Row ════════════════════ */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {[
          { title: 'مرضى اليوم',      value: summary.total_patients_today ?? 0,      change: summary.patients_change,  gradient: 'linear-gradient(135deg,#667eea,#764ba2)', glow: '#667eea', icon: <GroupsRoundedIcon />        },
          { title: 'جلسات اليوم',     value: summary.total_sessions_today ?? 0,      change: summary.sessions_change,  gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', glow: '#4facfe', icon: <EventNoteRoundedIcon />     },
          { title: 'الإيراد الشهري',  value: summary.monthly_revenue ?? 0,           change: summary.revenue_change,   gradient: 'linear-gradient(135deg,#43cea2,#185a9d)', glow: '#43cea2', icon: <AttachMoneyRoundedIcon />, unit: 'ر.س' },
          { title: 'الفروع النشطة',   value: `${summary.active_branches ?? 0}/${branches.length}`, gradient: 'linear-gradient(135deg,#f7971e,#ffd200)', glow: '#f7971e', icon: <BusinessRoundedIcon />     },
          { title: 'متوسط الإشغال',   value: summary.avg_capacity_utilization ?? 0,                gradient: 'linear-gradient(135deg,#f093fb,#f5576c)', glow: '#f093fb', icon: <SpeedRoundedIcon />, unit: '%' },
        ].map((kpi, i) => (
          <Grid item xs={12} sm={6} md={2.4} key={kpi.title}>
            <KPICard {...kpi} delay={0.05 + i * 0.08} />
          </Grid>
        ))}
      </Grid>

      {/* ══ Live Ticker ══════════════════════ */}
      <LiveMetricsTicker />

      {/* ══ Main Grid ════════════════════════ */}
      <Grid container spacing={2.5}>

        {/* ── Left column (main) ── */}
        <Grid item xs={12} lg={8}>

          {/* Tabs */}
          <Paper elevation={0} sx={{
            borderRadius: '20px',
            overflow: 'hidden',
            mb: 2.5,
            background: isDark
              ? 'linear-gradient(145deg,rgba(15,20,40,0.97),rgba(20,15,45,0.97))'
              : 'linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,248,255,0.97))',
            backdropFilter: 'blur(20px)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(102,126,234,0.15)' : 'rgba(102,126,234,0.1)',
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(102,126,234,0.08)',
          }}>
            {/* Top accent */}
            <Box sx={{
              height: '3px',
              background: 'linear-gradient(90deg,#667eea,#764ba2,#4facfe)',
              backgroundSize: '200% auto',
              animation: 'tBar 4s linear infinite',
              '@keyframes tBar': { '0%': { backgroundPosition: '0% center' }, '100%': { backgroundPosition: '200% center' } },
            }} />

            {/* Tab headers */}
            <Box sx={{
              display: 'flex', gap: 0.5, p: 1.5, pb: 0,
              borderBottom: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            }}>
              {TABS.map((tab, i) => (
                <Box
                  key={tab.label}
                  onClick={() => setActiveTab(i)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.7,
                    px: 1.8, py: 0.9, borderRadius: '10px 10px 0 0',
                    cursor: 'pointer',
                    background: activeTab === i
                      ? (isDark ? 'rgba(102,126,234,0.15)' : 'rgba(102,126,234,0.08)')
                      : 'transparent',
                    borderBottom: activeTab === i ? '2px solid #667eea' : '2px solid transparent',
                    transition: 'all 0.2s',
                    '&:hover': { background: 'rgba(102,126,234,0.08)' },
                  }}
                >
                  <Box sx={{ color: activeTab === i ? '#667eea' : 'text.disabled' }}>
                    {tab.icon}
                  </Box>
                  <Typography sx={{
                    fontSize: '0.78rem', fontWeight: 700,
                    color: activeTab === i ? '#667eea' : 'text.secondary',
                  }}>
                    {tab.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Tab body */}
            <Box sx={{ p: 2 }}>
              <AnimatePresence mode="wait">
                {/* ── Overview Tab ── */}
                {activeTab === 0 && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Region filter */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.88rem' }}>
                        جميع الفروع — وقت حقيقي
                      </Typography>
                      <Select
                        value={filterRegion}
                        onChange={e => setFilterRegion(e.target.value)}
                        size="small"
                        sx={{
                          fontSize: '0.75rem', borderRadius: '10px', height: 32,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          },
                        }}
                      >
                        <MenuItem value="all">جميع المناطق</MenuItem>
                        {Object.keys(BRANCH_REGIONS).map(r => (
                          <MenuItem key={r} value={r}>{r}</MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <TableContainer sx={{
                      borderRadius: '14px',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{
                            background: isDark ? 'rgba(102,126,234,0.08)' : 'rgba(102,126,234,0.04)',
                          }}>
                            {['الفرع', 'الحالة', 'مرضى اليوم', 'جلسات', 'الإشغال', 'الإيراد', ''].map(h => (
                              <TableCell key={h} sx={{
                                py: 1.2, fontSize: '0.68rem',
                                fontWeight: 800, color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5, borderBottom: 'none',
                              }}>
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredBranches.length > 0
                            ? filteredBranches.map((b, i) => (
                                <BranchRow
                                  key={b.code}
                                  branch={b}
                                  index={i}
                                  isDark={isDark}
                                  onSelect={(code) => window.location.href = `/branch/${code}`}
                                />
                              ))
                            : (
                              <TableRow>
                                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                                  لا توجد فروع في هذه المنطقة
                                </TableCell>
                              </TableRow>
                            )
                          }
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </motion.div>
                )}

                {/* ── Financials Tab ── */}
                {activeTab === 1 && (
                  <motion.div
                    key="fin"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    {financials ? (
                      <>
                        <Grid container spacing={1.5} sx={{ mb: 2 }}>
                          {[
                            { t: 'إجمالي الإيرادات', v: financials.total_revenue ?? 0,  g: 'linear-gradient(135deg,#43cea2,#185a9d)', gw: '#43cea2', u: 'ر.س' },
                            { t: 'إجمالي المصروفات', v: financials.total_expenses ?? 0,  g: 'linear-gradient(135deg,#f5576c,#f093fb)', gw: '#f5576c', u: 'ر.س' },
                            { t: 'صافي الربح',       v: financials.net_profit ?? 0,      g: 'linear-gradient(135deg,#667eea,#764ba2)', gw: '#667eea', u: 'ر.س' },
                            { t: 'نسبة الربحية',     v: financials.profit_margin ?? 0,   g: 'linear-gradient(135deg,#f7971e,#ffd200)', gw: '#f7971e', u: '%'   },
                          ].map((f, i) => (
                            <Grid item xs={6} sm={3} key={f.t}>
                              <KPICard title={f.t} value={f.v} unit={f.u} gradient={f.g} glow={f.gw} icon={<AttachMoneyRoundedIcon />} delay={i * 0.07} />
                            </Grid>
                          ))}
                        </Grid>

                        <TableContainer sx={{ borderRadius: '14px', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ background: isDark ? 'rgba(102,126,234,0.08)' : 'rgba(102,126,234,0.04)' }}>
                                {['الفرع', 'الإيرادات', 'المصروفات', 'صافي الربح', 'تحقيق الهدف'].map(h => (
                                  <TableCell key={h} sx={{ py: 1.2, fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary', borderBottom: 'none' }}>{h}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(financials.by_branch || []).map((b) => (
                                <TableRow key={b.branch_code}
                                  sx={{ '&:hover': { background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' } }}
                                >
                                  <TableCell sx={{ py: 1.2, fontSize: '0.78rem' }}>
                                    <Typography sx={{ fontWeight: 700 }}>{b.branch_code}</Typography>
                                    <Typography sx={{ fontSize: '0.63rem', color: 'text.disabled' }}>{b.name_ar}</Typography>
                                  </TableCell>
                                  <TableCell sx={{ py: 1.2, fontSize: '0.78rem', fontWeight: 600 }}>
                                    {(b.revenue || 0).toLocaleString('ar-SA')}
                                  </TableCell>
                                  <TableCell sx={{ py: 1.2, fontSize: '0.78rem', fontWeight: 600 }}>
                                    {(b.expenses || 0).toLocaleString('ar-SA')}
                                  </TableCell>
                                  <TableCell sx={{ py: 1.2 }}>
                                    <Typography sx={{
                                      fontWeight: 800, fontSize: '0.78rem',
                                      color: b.net_profit >= 0 ? '#4caf50' : '#f44336',
                                    }}>
                                      {(b.net_profit || 0).toLocaleString('ar-SA')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ py: 1.2, minWidth: 120 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ flex: 1 }}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={Math.min(b.target_achievement || 0, 100)}
                                          sx={{
                                            height: 5, borderRadius: 3,
                                            background: 'rgba(128,128,128,0.15)',
                                            '& .MuiLinearProgress-bar': {
                                              borderRadius: 3,
                                              background: (b.target_achievement || 0) >= 90
                                                ? 'linear-gradient(90deg,#43cea2,#185a9d)'
                                                : (b.target_achievement || 0) >= 70
                                                  ? 'linear-gradient(90deg,#f7971e,#ffd200)'
                                                  : 'linear-gradient(90deg,#f5576c,#f093fb)',
                                            },
                                          }}
                                        />
                                      </Box>
                                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary', minWidth: 28 }}>
                                        {b.target_achievement ?? 0}%
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    ) : (
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Typography sx={{ color: 'text.disabled' }}>لا تتوفر بيانات مالية</Typography>
                      </Box>
                    )}
                  </motion.div>
                )}

                {/* ── Comparison Tab ── */}
                {activeTab === 2 && (
                  <motion.div
                    key="comp"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.88rem' }}>مقارنة الفروع</Typography>
                      <Select
                        value={metric}
                        onChange={e => setMetric(e.target.value)}
                        size="small"
                        sx={{ fontSize: '0.75rem', borderRadius: '10px', height: 32 }}
                      >
                        <MenuItem value="capacity_utilization">نسبة الإشغال</MenuItem>
                        <MenuItem value="patients_today">مرضى اليوم</MenuItem>
                        <MenuItem value="sessions_today">الجلسات</MenuItem>
                        <MenuItem value="monthly_revenue">الإيرادات الشهرية</MenuItem>
                        <MenuItem value="satisfaction_score">رضا الأسر</MenuItem>
                      </Select>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                      {compRows.map((row, i) => {
                        const pct = ((row.value || 0) / maxVal) * 100;
                        const GRADS = [
                          'linear-gradient(90deg,#667eea,#764ba2)',
                          'linear-gradient(90deg,#43cea2,#185a9d)',
                          'linear-gradient(90deg,#4facfe,#00f2fe)',
                          'linear-gradient(90deg,#f7971e,#ffd200)',
                          'linear-gradient(90deg,#f093fb,#f5576c)',
                        ];
                        const grad = GRADS[i % GRADS.length];
                        return (
                          <motion.div
                            key={row.code}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.3 }}
                          >
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography sx={{ fontSize: '0.76rem', fontWeight: 700 }}>
                                  {row.code}
                                  <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary', mr: 0.5 }}>
                                    {' '}{row.name_ar}
                                  </Box>
                                </Typography>
                                <Typography sx={{
                                  fontSize: '0.76rem', fontWeight: 800,
                                  background: grad,
                                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>
                                  {typeof row.value === 'number' ? row.value.toLocaleString('ar-SA') : row.value}
                                </Typography>
                              </Box>
                              <Box sx={{
                                height: 8, borderRadius: 6,
                                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                overflow: 'hidden',
                              }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ delay: 0.1 + i * 0.04, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                                  style={{ height: '100%', borderRadius: 6, background: grad }}
                                />
                              </Box>
                            </Box>
                          </motion.div>
                        );
                      })}
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </Paper>

          {/* Performance Rings */}
          <PerformanceRings delay={0.3} />
        </Grid>

        {/* ── Right column (sidebar) ── */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {/* Smart AI Insights */}
            <SmartInsightsPanel
              onRefresh={() => loadData(true)}
              loading={refreshing}
            />

            {/* Alerts Panel */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.55 }}
            >
              <Paper elevation={0} sx={{
                borderRadius: '20px', p: 2.5,
                background: isDark
                  ? 'linear-gradient(145deg,rgba(15,20,40,0.97),rgba(20,15,45,0.97))'
                  : 'linear-gradient(145deg,rgba(255,255,255,0.97),rgba(250,248,255,0.97))',
                backdropFilter: 'blur(20px)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(102,126,234,0.15)' : 'rgba(102,126,234,0.1)',
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(102,126,234,0.08)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '11px',
                      background: 'linear-gradient(135deg,#f5576c,#f093fb)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 5px 14px rgba(245,87,108,0.4)',
                    }}>
                      <WarningAmberRoundedIcon sx={{ color: 'white', fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>التنبيهات</Typography>
                  </Box>
                  <Chip
                    label={alerts.length}
                    size="small"
                    sx={{
                      height: 22, fontWeight: 800, fontSize: '0.68rem',
                      background: alerts.length > 0 ? 'linear-gradient(135deg,#f5576c,#f093fb)' : 'rgba(128,128,128,0.15)',
                      color: alerts.length > 0 ? 'white' : 'text.disabled',
                      border: 'none',
                    }}
                  />
                </Box>
                <Box sx={{ maxHeight: 280, overflowY: 'auto', '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { borderRadius: 4, background: 'rgba(102,126,234,0.25)' } }}>
                  {alerts.length === 0
                    ? <Box sx={{ py: 3, textAlign: 'center' }}>
                        <CheckCircleRoundedIcon sx={{ fontSize: 28, color: '#4caf50', mb: 0.8 }} />
                        <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', fontWeight: 600 }}>
                          لا توجد تنبيهات نشطة
                        </Typography>
                      </Box>
                    : alerts.slice(0, 8).map((a, i) => <AlertRow key={i} alert={a} index={i} isDark={isDark} />)
                  }
                </Box>
              </Paper>
            </motion.div>

            {/* Top Performers */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.55 }}
            >
              <Paper elevation={0} sx={{
                borderRadius: '20px', p: 2.5,
                background: isDark
                  ? 'linear-gradient(145deg,rgba(15,20,40,0.97),rgba(20,15,45,0.97))'
                  : 'linear-gradient(145deg,rgba(255,255,255,0.97),rgba(250,248,255,0.97))',
                backdropFilter: 'blur(20px)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(102,126,234,0.15)' : 'rgba(102,126,234,0.1)',
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(102,126,234,0.08)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '11px',
                    background: 'linear-gradient(135deg,#f7971e,#ffd200)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 5px 14px rgba(247,151,30,0.4)',
                  }}>
                    <EmojiEventsRoundedIcon sx={{ color: 'white', fontSize: 18 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>أفضل الفروع أداءً</Typography>
                </Box>
                <TopPerformers performers={performers} isDark={isDark} />
              </Paper>
            </motion.div>

          </Box>
        </Grid>
      </Grid>

      {/* ══ Floating CMD Button ═══════════════ */}
      <FloatingCMD onClick={() => setCmdOpen(true)} />

    </Box>
  );
};

export default HQDashboard;
