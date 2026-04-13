/**
 * BranchAnalytics.jsx — التحليلات الذكية للفرع | Premium v2
 *
 * Sections: Performance Score · Trends · 7-Day Forecast · Anomalies · AI Recommendations · Targets
 */

import { useState, useMemo, memo } from 'react';
import {
  useTheme, alpha,
} from '@mui/material';

import {
  useBranchAnalytics,
  useBranchKPIs,
  useBranchTargets,
} from '../hooks/useBranchData';

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

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
const LineChart = memo(({ data = [], color = '#3b82f6', height = 80, width = 300, label = '' }) => {
  if (!data || data.length < 2) return (
    <Box sx={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>لا توجد بيانات كافية</Typography>
    </Box>
  );
  const values = data.map(d => typeof d === 'object' ? (d.value ?? d.y ?? 0) : d);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const pad = 8;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * chartW;
    const y = pad + chartH - ((v - minVal) / range) * chartH;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `${pad},${pad + chartH} ` + points + ` ${pad + chartW},${pad + chartH}`;
  const lastX = pad + chartW;
  const lastY = pad + chartH - ((values[values.length - 1] - minVal) / range) * chartH;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(r => (
        <line key={r} x1={pad} y1={pad + chartH * r} x2={pad + chartW} y2={pad + chartH * r}
          stroke="rgba(107,114,128,0.15)" strokeWidth="1" strokeDasharray="4,4" />
      ))}
      <polygon points={areaPoints} fill={`url(#grad-${label})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="4.5" fill={color} stroke="#fff" strokeWidth="2.5"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
});

// ─── SVG Forecast Bar ─────────────────────────────────────────────────────────
const ForecastBar = memo(({ data = [], color = '#8b5cf6', height = 140, width = 340 }) => {
  if (!data?.length) return null;
  const values = data.map(d => d.predicted ?? d.value ?? 0);
  const maxVal = Math.max(...values) || 1;
  const barW = Math.floor((width - 20) / values.length) - 6;
  const pad = 10;
  const chartH = height - 30;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        {values.map((_, i) => (
          <linearGradient key={i} id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        ))}
      </defs>
      {values.map((v, i) => {
        const barH = Math.max(6, (v / maxVal) * chartH);
        const x = pad + i * (barW + 6);
        const y = pad + chartH - barH;
        const label = data[i].date_str || data[i].label || `${i + 1}`;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill={`url(#bar-${i})`}
              style={{ filter: `drop-shadow(0 2px 6px ${color}66)` }} />
            <text x={x + barW / 2} y={height - 4} textAnchor="middle" fontSize="9" fill="rgba(107,114,128,0.8)">
              {label.slice(-5)}
            </text>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9.5" fill={color} fontWeight="700">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
});

// ─── Score Gauge ──────────────────────────────────────────────────────────────
const ScoreGauge = memo(({ score = 0, grade = 'B', size = 110 }) => {
  const r = (size / 2) * 0.76;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * (score / 100);
  const gradeColor = { 'A+': '#10b981', A: '#22c55e', 'B+': '#84cc16', B: '#eab308', C: '#f97316', D: '#ef4444', F: '#991b1b' };
  const color = gradeColor[grade] || '#6b7280';
  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(107,114,128,0.15)" strokeWidth="10" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circumference - filled}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: '1.3rem', fontWeight: 900, color, lineHeight: 1 }}>{score}</Typography>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color, opacity: 0.7 }}>{grade}</Typography>
      </Box>
    </Box>
  );
});

// ─── Tab Button ───────────────────────────────────────────────────────────────
const TabBtn = memo(({ active, label, icon, onClick }) => (
  <Box component="button" onClick={onClick} sx={{
    flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8,
    px: 1.5, py: 1.2, border: 'none', cursor: 'pointer', borderRadius: 2.5,
    fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.2s',
    background: active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
    color: active ? '#fff' : 'text.secondary',
    boxShadow: active ? '0 4px 15px rgba(59,130,246,0.35)' : 'none',
  }}>{icon}{label}</Box>
));

// ─── Metric Pill ──────────────────────────────────────────────────────────────
const MetricPill = memo(({ label, value, active, onClick, color = '#3b82f6' }) => (
  <Box component="button" onClick={onClick} sx={{
    px: 1.5, py: 0.6, border: '2px solid', cursor: 'pointer', borderRadius: 5,
    borderColor: active ? color : 'divider',
    background: active ? alpha(color, 0.1) : 'transparent',
    color: active ? color : 'text.secondary',
    fontSize: '0.75rem', fontWeight: active ? 700 : 500, fontFamily: 'inherit',
    transition: 'all 0.2s',
    '&:hover': { borderColor: color, background: alpha(color, 0.06) },
  }}>
    {label}
    {value != null && <Typography component="span" sx={{ ml: 0.8, fontSize: '0.68rem', opacity: 0.7 }}>{value}</Typography>}
  </Box>
));

// ─── Stat Mini ────────────────────────────────────────────────────────────────
const StatMini = memo(({ label, value, color = '#3b82f6' }) => (
  <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2.5, background: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.2)}` }}>
    <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.4 }}>{label}</Typography>
    <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color }}>{value ?? '—'}</Typography>
  </Box>
));

// ─── Recommendation Card ──────────────────────────────────────────────────────
const RecCard = memo(({ rec, idx }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pMap = {
    critical: { border: '#ef4444', bg: isDark ? 'rgba(239,68,68,0.08)' : '#fef2f2', text: '#991b1b', badge: '#ef4444', label: 'عاجل جداً' },
    high:     { border: '#f97316', bg: isDark ? 'rgba(249,115,22,0.08)' : '#fff7ed', text: '#9a3412', badge: '#f97316', label: 'عاجل' },
    medium:   { border: '#eab308', bg: isDark ? 'rgba(234,179,8,0.08)'  : '#fffbeb', text: '#92400e', badge: '#eab308', label: 'متوسط' },
    low:      { border: '#10b981', bg: isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4', text: '#065f46', badge: '#10b981', label: 'منخفض' },
  };
  const s = pMap[rec.priority] || pMap.low;
  const catIcon = { revenue: '💰', sessions: '📋', attendance: '👥', satisfaction: '⭐', transport: '🚌', staff: '👨‍⚕️' };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}>
      <Box sx={{ p: 2, mb: 1.5, borderRadius: 2.5, background: s.bg, borderInlineStart: `3px solid ${s.border}` }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Typography sx={{ fontSize: '1.4rem' }}>{catIcon[rec.category] || '📌'}</Typography>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary' }}>
                {rec.title_ar || rec.title}
              </Typography>
              <Box sx={{ px: 1.2, py: 0.3, borderRadius: 5, background: s.badge, color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>
                {s.label}
              </Box>
            </Box>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 0.8 }}>
              {rec.message_ar || rec.message}
            </Typography>
            {rec.action_ar && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.2, py: 0.6, borderRadius: 1.5, background: alpha(s.border, 0.08), fontSize: '0.75rem', fontWeight: 600, color: 'text.primary' }}>
                <CheckCircle sx={{ fontSize: 14, color: s.border }} />
                {rec.action_ar}
              </Box>
            )}
            {rec.expected_impact && (
              <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.6 }}>
                التأثير المتوقع: <Box component="strong" sx={{ color: s.border }}>{rec.expected_impact}</Box>
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
});

// ─── Anomaly Row ──────────────────────────────────────────────────────────────
const AnomalyRow = memo(({ anomaly, idx }) => {
  const sc = anomaly.z_score > 3 ? '#ef4444' : anomaly.z_score > 2 ? '#f97316' : '#eab308';
  return (
    <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.8, borderRadius: 2.5, mb: 1, background: alpha('#f59e0b', 0.08), border: `1px solid ${alpha('#f59e0b', 0.25)}` }}>
        <Box>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>{anomaly.metric}</Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.2 }}>
            القيمة: {anomaly.value?.toFixed(1)} · المعتاد: {anomaly.mean?.toFixed(1)} ± {anomaly.std?.toFixed(1)}
          </Typography>
        </Box>
        <Box sx={{ px: 1.5, py: 0.5, borderRadius: 5, background: alpha(sc, 0.12), color: sc, fontSize: '0.72rem', fontWeight: 800 }}>
          Z = {anomaly.z_score?.toFixed(2)}
        </Box>
      </Box>
    </motion.div>
  );
});

// ─── Target Bar ───────────────────────────────────────────────────────────────
const TargetBar = memo(({ label, value, target, unit }) => {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const color = pct >= 90 ? '#10b981' : pct >= 70 ? '#3b82f6' : pct >= 50 ? '#f97316' : '#ef4444';
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
          {value} / {target} {unit}
        </Typography>
      </Box>
      <Box sx={{ height: 7, borderRadius: 4, bgcolor: alpha(color, 0.15), overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
        />
      </Box>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color, mt: 0.3 }}>
        {pct.toFixed(1)}% من الهدف
      </Typography>
    </Box>
  );
});

// ─── Metric Card (mini) ───────────────────────────────────────────────────────
const MetricMiniCard = memo(({ metric, trend, onClick, selected, idx }) => {
  const dirColor = trend?.direction === 'up' ? '#10b981' : trend?.direction === 'down' ? '#ef4444' : '#f59e0b';
  const dirIcon = trend?.direction === 'up' ? <ArrowUpward sx={{ fontSize: 12 }} /> : trend?.direction === 'down' ? <ArrowDownward sx={{ fontSize: 12 }} /> : <TrendingFlat sx={{ fontSize: 12 }} />;
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06, type: 'spring', stiffness: 180 }}
    >
      <Glass
        onClick={onClick}
        sx={{
          p: 1.8, cursor: 'pointer',
          border: selected ? `2px solid #3b82f6` : '1px solid rgba(255,255,255,0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.8 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.secondary' }}>{metric.label_ar}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: dirColor, fontSize: '0.7rem', fontWeight: 700 }}>
            {dirIcon}
          </Box>
        </Box>
        <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, background: `linear-gradient(135deg, #3b82f6, #8b5cf6)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {trend?.last_value?.toFixed(1) ?? '—'}
        </Typography>
        <Box sx={{ mt: 0.5, height: 28 }}>
          <LineChart data={trend?.history?.slice(-10) || []} color={dirColor} height={28} width={120} label={metric.value} />
        </Box>
      </Glass>
    </motion.div>
  );
});

// ─── Metric Options ───────────────────────────────────────────────────────────
const METRICS = [
  { value: 'sessions_count',          label_ar: 'الجلسات' },
  { value: 'patients_count',          label_ar: 'المرضى' },
  { value: 'monthly_revenue',         label_ar: 'الإيراد' },
  { value: 'session_completion_rate', label_ar: 'إتمام الجلسات' },
  { value: 'attendance_rate',         label_ar: 'الحضور' },
  { value: 'satisfaction_score',      label_ar: 'رضا المرضى' },
  { value: 'staff_utilization',       label_ar: 'استغلال الموظفين' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function BranchAnalytics({ branchCode }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [selectedMetric, setSelectedMetric] = useState('sessions_count');
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState('trends');

  const { trends, anomalies, forecast, recommendations, loading: analyticsLoading, error: analyticsError } = useBranchAnalytics(branchCode, { days, forecastMetric: selectedMetric, forecastDays: 7 });
  const { kpis, loading: kpisLoading } = useBranchKPIs(branchCode);
  const { targets, loading: targetsLoading } = useBranchTargets(branchCode, new Date().getFullYear(), new Date().getMonth() + 1);

  const metricHistory = useMemo(() => trends?.[selectedMetric]?.history || [], [trends, selectedMetric]);
  const metricTrend = useMemo(() => trends?.[selectedMetric] || null, [trends, selectedMetric]);
  const loading = analyticsLoading || kpisLoading;

  const TABS = [
    { id: 'trends',          label: 'الاتجاهات',  icon: <AutoGraph sx={{ fontSize: 14 }} /> },
    { id: 'forecast',        label: 'التوقعات',   icon: <BubbleChart sx={{ fontSize: 14 }} /> },
    { id: 'anomalies',       label: 'الشذوذات',   icon: <Bolt sx={{ fontSize: 14 }} />, badge: anomalies?.length },
    { id: 'recommendations', label: 'توصيات AI',  icon: <Psychology sx={{ fontSize: 14 }} />, badge: recommendations?.length },
    { id: 'targets',         label: 'الأهداف',    icon: <GpsFixed sx={{ fontSize: 14 }} /> },
  ];

  if (analyticsError) return (
    <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
      <Warning sx={{ fontSize: 64, color: '#ef4444', opacity: 0.6, mb: 2 }} />
      <Typography variant="h6" sx={{ mb: 1 }}>خطأ في تحميل البيانات</Typography>
      <Typography sx={{ fontSize: '0.85rem', color: '#ef4444' }}>{analyticsError}</Typography>
    </Box>
  );

  return (
    <Box dir="rtl" sx={{
      minHeight: '100vh',
      background: isDark
        ? 'linear-gradient(135deg, #060b1a 0%, #0f172a 50%, #050d1a 100%)'
        : 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 50%, #faf5ff 100%)',
      p: 3,
      fontFamily: "'Tajawal', 'Segoe UI', sans-serif",
    }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.8, borderRadius: 3, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}>
                <Analytics sx={{ color: '#fff', fontSize: 20 }} />
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>التحليلات الذكية</Typography>
              </Box>
              <Box sx={{ px: 1.5, py: 0.4, borderRadius: 5, background: alpha('#4f46e5', 0.12), border: `1px solid ${alpha('#4f46e5', 0.3)}` }}>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5' }}>
                  فرع: {branchCode}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              تحليل بيانات فرع شامل مدعوم بالذكاء الاصطناعي
            </Typography>
          </Box>

          {/* Days selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mr: 0.5 }}>نطاق:</Typography>
            {[7, 14, 30, 60, 90].map(d => (
              <Box
                key={d}
                component="button"
                onClick={() => setDays(d)}
                sx={{
                  px: 1.5, py: 0.5, borderRadius: 5, border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: days === d ? 800 : 500, fontFamily: 'inherit',
                  background: days === d ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                  color: days === d ? '#fff' : 'text.secondary',
                  boxShadow: days === d ? '0 3px 12px rgba(79,70,229,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {d}د
              </Box>
            ))}
          </Box>
        </Box>
      </motion.div>

      {/* ── Performance Overview Banner ── */}
      {!loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Box sx={{
            display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 3,
            p: 3, mb: 3, borderRadius: 3,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #4f46e5 100%)',
            boxShadow: '0 8px 40px rgba(59,130,246,0.4)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Glow blobs */}
            <Box sx={{ position: 'absolute', top: -30, insetInlineEnd: -30, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)', pointerEvents: 'none' }} />

            {/* Score */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <ScoreGauge
                score={metricTrend?.last_value ? Math.min(100, Math.round(metricTrend.last_value)) : 0}
                grade="B+" size={110}
              />
              <Box sx={{ color: '#fff' }}>
                <Typography sx={{ fontSize: '0.8rem', opacity: 0.75, mb: 0.5 }}>آخر قيمة</Typography>
                <Typography sx={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1 }}>
                  {metricTrend?.last_value?.toFixed(1) ?? '—'}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', opacity: 0.65 }}>
                  {METRICS.find(m => m.value === selectedMetric)?.label_ar}
                </Typography>
                {metricTrend?.slope != null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.8 }}>
                    {metricTrend.slope >= 0
                      ? <ArrowUpward sx={{ fontSize: 14, color: '#86efac' }} />
                      : <ArrowDownward sx={{ fontSize: 14, color: '#fca5a5' }} />
                    }
                    <Typography sx={{ fontSize: '0.72rem', color: metricTrend.slope >= 0 ? '#86efac' : '#fca5a5', fontWeight: 700 }}>
                      {metricTrend.slope >= 0 ? '+' : ''}{metricTrend.slope.toFixed(2)}/يوم
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Metric quick cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 1.2 }}>
              {METRICS.slice(0, 4).map(m => {
                const t = trends?.[m.value];
                const selected = selectedMetric === m.value;
                const dirColor = t?.direction === 'up' ? '#86efac' : t?.direction === 'down' ? '#fca5a5' : '#fde68a';
                return (
                  <Box key={m.value} onClick={() => setSelectedMetric(m.value)} sx={{
                    p: 1.5, borderRadius: 2.5, cursor: 'pointer', transition: 'all 0.2s',
                    background: selected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                    border: selected ? '2px solid rgba(255,255,255,0.7)' : '2px solid transparent',
                    '&:hover': { background: 'rgba(255,255,255,0.18)' },
                  }}>
                    <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)', mb: 0.3 }}>{m.label_ar}</Typography>
                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                      {t?.last_value?.toFixed(1) ?? '—'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: dirColor, fontWeight: 700 }}>
                      {t?.direction === 'up' ? '↑' : t?.direction === 'down' ? '↓' : '→'}
                      {t?.slope != null ? ` ${t.slope > 0 ? '+' : ''}${t.slope.toFixed(2)}/يوم` : ''}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </motion.div>
      )}

      {/* ── Tabs ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <Glass sx={{ mb: 2.5, p: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap', borderRadius: 3 }}>
          {TABS.map((t, i) => (
            <Box key={t.id} sx={{ position: 'relative', flex: '1 1 auto' }}>
              <TabBtn active={activeTab === t.id} label={t.label} icon={t.icon} onClick={() => setActiveTab(t.id)} />
              {t.badge > 0 && (
                <Box sx={{ position: 'absolute', top: 2, insetInlineEnd: 2, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: 800 }}>
                  {t.badge}
                </Box>
              )}
            </Box>
          ))}
        </Glass>
      </motion.div>

      {/* ── Loading ── */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2, py: 8 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', border: '4px solid transparent', borderTopColor: '#4f46e5', borderRightColor: '#7c3aed' }} />
          </motion.div>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem' }}>جارٍ تحليل البيانات بالذكاء الاصطناعي…</Typography>
        </Box>
      )}

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {!loading && (
          <motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>

            {/* ══ TRENDS ══ */}
            {activeTab === 'trends' && (
              <Box>
                {/* Metric pills */}
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 2 }}>
                  {METRICS.map(m => (
                    <MetricPill key={m.value} label={m.label_ar} value={trends?.[m.value]?.last_value?.toFixed(1)}
                      active={selectedMetric === m.value} onClick={() => setSelectedMetric(m.value)} color="#3b82f6" />
                  ))}
                </Box>

                {/* Main Trend Card */}
                <Glass sx={{ overflow: 'hidden', mb: 2.5 }}>
                  <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoGraph sx={{ color: '#3b82f6', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700 }}>
                      اتجاه: {METRICS.find(m => m.value === selectedMetric)?.label_ar}
                    </Typography>
                    {metricTrend?.direction && (
                      <Box sx={{ ml: 'auto', px: 1.5, py: 0.4, borderRadius: 5, fontSize: '0.72rem', fontWeight: 700,
                        background: metricTrend.direction === 'up' ? alpha('#10b981', 0.12) : metricTrend.direction === 'down' ? alpha('#ef4444', 0.12) : alpha('#f59e0b', 0.12),
                        color: metricTrend.direction === 'up' ? '#10b981' : metricTrend.direction === 'down' ? '#ef4444' : '#f59e0b',
                      }}>
                        {metricTrend.direction === 'up' ? '↑ تحسن' : metricTrend.direction === 'down' ? '↓ تراجع' : '→ مستقر'}
                      </Box>
                    )}
                  </Box>
                  {metricTrend ? (
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 1.5, mb: 3 }}>
                        <StatMini label="آخر قيمة"    value={metricTrend.last_value?.toFixed(2)} color="#3b82f6" />
                        <StatMini label="المتوسط"     value={metricTrend.avg?.toFixed(2)}         color="#8b5cf6" />
                        <StatMini label="الميل/يوم"   value={metricTrend.slope?.toFixed(3)}       color={metricTrend.slope >= 0 ? '#10b981' : '#ef4444'} />
                        <StatMini label="دقة R²"      value={metricTrend.r2?.toFixed(3)}          color="#f59e0b" />
                      </Box>
                      <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
                        <LineChart data={metricHistory} color="#3b82f6" height={150}
                          width={Math.max(400, metricHistory.length * 14)} label={selectedMetric} />
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                      <AutoGraph sx={{ fontSize: 40, opacity: 0.25, mb: 1 }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>لا توجد بيانات اتجاه لهذا المقياس</Typography>
                    </Box>
                  )}
                </Glass>

                {/* Mini cards for other metrics */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
                  {METRICS.filter(m => m.value !== selectedMetric).map((m, i) => (
                    <MetricMiniCard key={m.value} metric={m} trend={trends?.[m.value]} idx={i}
                      selected={selectedMetric === m.value}
                      onClick={() => setSelectedMetric(m.value)} />
                  ))}
                </Box>
              </Box>
            )}

            {/* ══ FORECAST ══ */}
            {activeTab === 'forecast' && (
              <Box>
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 2 }}>
                  {METRICS.map(m => (
                    <MetricPill key={m.value} label={m.label_ar} active={selectedMetric === m.value}
                      onClick={() => setSelectedMetric(m.value)} color="#8b5cf6" />
                  ))}
                </Box>

                <Glass sx={{ overflow: 'hidden' }}>
                  <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BubbleChart sx={{ color: '#8b5cf6', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700 }}>
                      توقعات 7 أيام — {METRICS.find(m => m.value === selectedMetric)?.label_ar}
                    </Typography>
                  </Box>

                  {forecast ? (
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5, mb: 3 }}>
                        <StatMini label="متوسط التوقع" color="#8b5cf6"
                          value={forecast.predictions ? (forecast.predictions.reduce((s, p) => s + (p.predicted ?? 0), 0) / forecast.predictions.length).toFixed(1) : '—'} />
                        <StatMini label="أعلى قيمة" color="#10b981"
                          value={forecast.predictions ? Math.max(...forecast.predictions.map(p => p.predicted ?? 0)).toFixed(1) : '—'} />
                        <StatMini label="الاتجاه المتوقع" color="#f59e0b"
                          value={forecast.trend === 'increasing' ? '↑ ارتفاع' : forecast.trend === 'decreasing' ? '↓ انخفاض' : '→ ثبات'} />
                      </Box>

                      <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
                        <ForecastBar data={forecast.predictions || []} color="#8b5cf6" height={170}
                          width={Math.max(380, (forecast.predictions?.length ?? 7) * 50)} />
                      </Box>

                      {forecast.model_quality && (
                        <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.04)' : alpha('#8b5cf6', 0.05), display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {[
                            { label: 'دقة النموذج', value: `${(forecast.model_quality?.r2 * 100)?.toFixed(1)}%` },
                            { label: 'بيانات التدريب', value: `${forecast.training_days} يوم` },
                            { label: 'المقياس', value: forecast.metric },
                          ].map(s => (
                            <Typography key={s.label} sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                              {s.label}: <Box component="strong" sx={{ color: 'text.primary' }}>{s.value}</Box>
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
                      <BubbleChart sx={{ fontSize: 48, opacity: 0.25, mb: 1.5 }} />
                      <Typography sx={{ fontWeight: 600, mb: 0.5 }}>لا تتوفر بيانات كافية للتوقع</Typography>
                      <Typography sx={{ fontSize: '0.8rem', opacity: 0.7 }}>يتطلب النموذج 14 يوم على الأقل من البيانات</Typography>
                    </Box>
                  )}
                </Glass>
              </Box>
            )}

            {/* ══ ANOMALIES ══ */}
            {activeTab === 'anomalies' && (
              <Glass sx={{ overflow: 'hidden' }}>
                <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Bolt sx={{ color: '#f59e0b', fontSize: 18 }} />
                  <Typography sx={{ fontWeight: 700 }}>كشف الشذوذات والانحرافات</Typography>
                  {anomalies?.length > 0 && (
                    <Box sx={{ ml: 'auto', px: 1, py: 0.2, borderRadius: 5, background: '#f59e0b', color: '#fff', fontSize: '0.68rem', fontWeight: 800 }}>
                      {anomalies.length}
                    </Box>
                  )}
                </Box>
                <Box sx={{ p: 3 }}>
                  {anomalies?.length > 0 ? (
                    <>
                      <Box sx={{ p: 2, mb: 2.5, borderRadius: 2.5, background: alpha('#f59e0b', 0.08), border: `1px solid ${alpha('#f59e0b', 0.3)}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Warning sx={{ color: '#f59e0b', fontSize: 20 }} />
                        <Typography sx={{ fontSize: '0.82rem', color: '#92400e', fontWeight: 600 }}>
                          تم رصد <Box component="strong">{anomalies.length} شذوذ</Box> في آخر 14 يوم.
                          Z &gt; 2 تحذير · Z &gt; 3 حالة حرجة
                        </Typography>
                      </Box>
                      {anomalies.map((a, i) => <AnomalyRow key={i} anomaly={a} idx={i} />)}
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: '50%', background: alpha('#10b981', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <CheckCircle sx={{ fontSize: 40, color: '#10b981' }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, color: '#10b981', fontSize: '1rem', mb: 0.5 }}>لم يُرصد أي شذوذ</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>جميع المقاييس ضمن النطاق الطبيعي خلال آخر 14 يوم</Typography>
                    </Box>
                  )}
                </Box>
              </Glass>
            )}

            {/* ══ RECOMMENDATIONS ══ */}
            {activeTab === 'recommendations' && (
              <Box>
                {/* AI Banner */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                  <Box sx={{ p: 2.5, mb: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Psychology sx={{ color: '#fff', fontSize: 26 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>توصيات الذكاء الاصطناعي</Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem' }}>
                        {recommendations?.length ?? 0} توصية مخصصة بناءً على تحليل بيانات آخر {days} يوم
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>

                {recommendations?.length > 0 ? (
                  recommendations.map((rec, i) => <RecCard key={i} rec={rec} idx={i} />)
                ) : (
                  <Glass sx={{ p: 4, textAlign: 'center' }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', background: alpha('#10b981', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <Star sx={{ fontSize: 40, color: '#10b981' }} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: '#10b981', fontSize: '1.05rem', mb: 0.5 }}>أداء ممتاز!</Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>لا توجد توصيات تحسين في الوقت الحالي</Typography>
                  </Glass>
                )}
              </Box>
            )}

            {/* ══ TARGETS ══ */}
            {activeTab === 'targets' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Target vs Actual */}
                <Glass sx={{ overflow: 'hidden' }}>
                  <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GpsFixed sx={{ color: '#10b981', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700 }}>الأهداف الشهرية مقابل الفعلي</Typography>
                  </Box>
                  <Box sx={{ p: 3 }}>
                    {targets && kpis ? (
                      [
                        { label: 'الإيراد الشهري',        value: kpis.revenue_target?.value ?? 0,        target: targets.kpis?.monthly_revenue?.value ?? 300000, unit: 'SAR' },
                        { label: 'عدد المرضى',             value: kpis.new_patients?.value ?? 0,          target: targets.kpis?.patients_count?.value ?? 100,      unit: 'مريض' },
                        { label: 'معدل إتمام الجلسات',    value: kpis.session_completion?.value ?? 0,    target: targets.kpis?.session_completion_rate?.value ?? 95, unit: '%' },
                        { label: 'رضا المرضى',             value: kpis.patient_satisfaction?.value ?? 0, target: targets.kpis?.satisfaction_score?.value ?? 4.8,  unit: '/5' },
                        { label: 'حضور الموظفين',          value: kpis.staff_attendance?.value ?? 0,     target: targets.kpis?.attendance_rate?.value ?? 98,      unit: '%' },
                        { label: 'نسبة السعودة',           value: kpis.saudization?.value ?? 0,          target: targets.kpis?.saudization?.value ?? 70,          unit: '%' },
                      ].map(kpi => <TargetBar key={kpi.label} {...kpi} />)
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        <GpsFixed sx={{ fontSize: 40, opacity: 0.25, mb: 1 }} />
                        <Typography sx={{ fontSize: '0.85rem' }}>لم يتم تعيين الأهداف بعد لهذا الشهر</Typography>
                        <Typography sx={{ fontSize: '0.75rem', opacity: 0.7, mt: 0.5 }}>
                          استخدم POST /{branchCode}/targets لإضافة أهداف الشهر
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Glass>

                {/* HQ Comparison */}
                <Glass sx={{ overflow: 'hidden' }}>
                  <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BarChart sx={{ color: '#3b82f6', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700 }}>مقارنة مع متوسط الشبكة</Typography>
                  </Box>
                  <Box sx={{ p: 3 }}>
                    {kpis ? (
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5 }}>
                        {Object.entries(kpis).map(([key, stat]) => {
                          if (!stat || typeof stat !== 'object') return null;
                          const diff = (stat.value ?? 0) - (stat.hq_avg ?? 0);
                          const color = diff >= 0 ? '#10b981' : '#ef4444';
                          return (
                            <motion.div key={key} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                              <Box sx={{ p: 2, borderRadius: 2.5, background: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.25)}`, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.5 }}>
                                  {key.replace(/_/g, ' ')}
                                </Typography>
                                <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color }}>
                                  {stat.value}
                                  <Typography component="span" sx={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.7 }}> {stat.unit}</Typography>
                                </Typography>
                                <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', mt: 0.3 }}>
                                  HQ: {stat.hq_avg}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3, mt: 0.3 }}>
                                  {diff >= 0 ? <ArrowUpward sx={{ fontSize: 12, color }} /> : <ArrowDownward sx={{ fontSize: 12, color }} />}
                                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color }}>
                                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                                  </Typography>
                                </Box>
                              </Box>
                            </motion.div>
                          );
                        })}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        <BarChart sx={{ fontSize: 40, opacity: 0.25, mb: 1 }} />
                        <Typography sx={{ fontSize: '0.85rem' }}>لا توجد بيانات KPI</Typography>
                      </Box>
                    )}
                  </Box>
                </Glass>
              </Box>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
