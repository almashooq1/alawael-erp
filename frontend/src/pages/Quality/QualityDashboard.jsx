/**
 * QualityDashboard.jsx — Executive Compliance Health Dashboard
 * Phase 13 Commit 11
 *
 * Primary: GET /api/quality/health-score  → gauge + 10 pillars + hotspots
 * Secondary: GET /api/quality/dashboard/:branchId → legacy KPI + dept breakdown
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Chip,
  Fade,
  Grow,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  LinearProgress,
  Stack,
  IconButton,
  Tooltip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  VerifiedUser as QualityIcon,
  Assessment as AuditIcon,
  Gavel as ComplianceIcon,
  TrendingUp as IndicatorIcon,
  Warning as HotspotIcon,
  CheckCircle as OkIcon,
  ArrowForward as GoIcon,
  Assignment as ReviewIcon,
  Shield as CapaIcon,
  CalendarMonth as CalendarIcon,
  Inventory as VaultIcon,
  Policy as PolicyIcon,
  Security as PdplIcon,
  Group as SatisfactionIcon,
  School as TrainingIcon,
  Description as DocIcon,
  BugReport as IncidentIcon,
  SentimentSatisfied as ComplaintsIcon,
  HourglassEmpty as MissingIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import apiClient from '../../services/api.client';
import { formatDate as _fmtDate } from 'utils/dateUtils';

// ── constants ─────────────────────────────────────────────────────

const GRADE_COLORS = {
  green: '#10b981',
  light_green: '#22c55e',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
};

const PILLAR_ICONS = {
  controls: <QualityIcon />,
  management_review: <ReviewIcon />,
  evidence: <VaultIcon />,
  calendar: <CalendarIcon />,
  incidents: <IncidentIcon />,
  complaints: <ComplaintsIcon />,
  capa: <CapaIcon />,
  satisfaction: <SatisfactionIcon />,
  training: <TrainingIcon />,
  documents: <DocIcon />,
};

const HOTSPOT_COLORS = {
  critical: { bg: '#fef2f2', border: '#fca5a5', icon: '#ef4444' },
  high: { bg: '#fff7ed', border: '#fdba74', icon: '#f97316' },
  medium: { bg: '#fffbeb', border: '#fde68a', icon: '#f59e0b' },
  low: { bg: '#eff6ff', border: '#93c5fd', icon: '#3b82f6' },
};

const WINDOW_OPTIONS = [
  { label: '30 يوماً', value: 30 },
  { label: '60 يوماً', value: 60 },
  { label: '90 يوماً', value: 90 },
  { label: '180 يوماً', value: 180 },
  { label: 'سنة', value: 365 },
];

const QUICK_LINKS = [
  { label: 'مراجعات الإدارة', path: 'management-review', icon: <ReviewIcon />, color: '#8b5cf6' },
  { label: 'الإجراءات التصحيحية', path: 'capa', icon: <CapaIcon />, color: '#ef4444' },
  {
    label: 'تقويم الامتثال',
    path: 'compliance-calendar',
    icon: <CalendarIcon />,
    color: '#3b82f6',
  },
  { label: 'خزينة الأدلة', path: 'evidence-vault', icon: <VaultIcon />, color: '#10b981' },
  { label: 'مكتبة السياسات', path: 'policies', icon: <PolicyIcon />, color: '#f59e0b' },
  { label: 'PDPL الحماية', path: 'pdpl', icon: <PdplIcon />, color: '#6366f1' },
];

// ── helpers ────────────────────────────────────────────────────────

function gradeColor(g) {
  if (!g) return '#9ca3af';
  return GRADE_COLORS[g.color] || '#9ca3af';
}

function pillarScore2Color(s) {
  if (s == null) return '#9ca3af';
  if (s >= 80) return '#10b981';
  if (s >= 60) return '#f59e0b';
  return '#ef4444';
}

function fmtDate(v) {
  if (!v) return '—';
  try {
    return _fmtDate(v, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(v);
  }
}

// ── SVG Score Gauge ───────────────────────────────────────────────
//  270° speedometer arc, start = 135° (lower-left), end = 45° (lower-right)

function ScoreGauge({ score, grade, size = 200 }) {
  const cx = size / 2,
    cy = size / 2;
  const R = size * 0.37;
  const strokeW = size * 0.07;
  const START = 135,
    TOTAL = 270;

  function xy(deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }

  function arc(fromDeg, toDeg) {
    const s = xy(fromDeg);
    const eDeg = fromDeg + toDeg;
    const e = xy(eDeg % 360 === 0 && toDeg > 0 ? 360 : eDeg % 360);
    const large = toDeg > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  const filled = score != null ? Math.min((score / 100) * TOTAL, TOTAL) : 0;
  const gColor = gradeColor(grade);
  const gradId = 'gauge-grad';

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-label={`Score: ${score ?? 'N/A'}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gColor} stopOpacity="0.7" />
          <stop offset="100%" stopColor={gColor} />
        </linearGradient>
      </defs>
      {/* Track */}
      <path
        d={arc(START, TOTAL)}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
      {/* Fill */}
      {filled > 0.5 && (
        <path
          d={arc(START, filled)}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeW}
          strokeLinecap="round"
          style={{ transition: 'all 1s cubic-bezier(.4,0,.2,1)' }}
        />
      )}
      {/* Center score */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize={size * 0.18}
        fontWeight="800"
        fill={gColor}
        fontFamily="sans-serif"
      >
        {score != null ? score : '—'}
      </text>
      {/* Grade badge */}
      {grade && (
        <>
          <rect
            x={cx - 22}
            y={cy + 10}
            width={44}
            height={20}
            rx={10}
            fill={gColor}
            fillOpacity="0.15"
          />
          <text
            x={cx}
            y={cy + 24}
            textAnchor="middle"
            fontSize={size * 0.07}
            fill={gColor}
            fontWeight="700"
            fontFamily="sans-serif"
          >
            {grade.grade} · {grade.label}
          </text>
        </>
      )}
    </svg>
  );
}

// ── Glass Card ────────────────────────────────────────────────────

const Glass = ({ children, sx, ...p }) => (
  <Box
    sx={{
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.4)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
      transition: 'box-shadow .3s, transform .3s',
      '&:hover': { boxShadow: '0 12px 40px rgba(0,0,0,0.12)', transform: 'translateY(-2px)' },
      ...sx,
    }}
    {...p}
  >
    {children}
  </Box>
);

// ── PillarCard ────────────────────────────────────────────────────

function PillarCard({ pillar, delay = 0 }) {
  const s = pillar.score;
  const col = pillarScore2Color(s);
  return (
    <Grow in timeout={400 + delay}>
      <Glass sx={{ p: 2, height: '100%' }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '12px',
              flexShrink: 0,
              background: `${col}20`,
              color: col,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {PILLAR_ICONS[pillar.id] || <QualityIcon />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" noWrap>
              {pillar.nameAr}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.3 }}>
              <Typography variant="h6" fontWeight={800} color={col} lineHeight={1}>
                {s != null ? s : '—'}
              </Typography>
              {s != null && (
                <Typography variant="caption" color="text.disabled">
                  /100
                </Typography>
              )}
              <Box sx={{ flex: 1 }} />
              <Chip
                size="small"
                label={`${pillar.weight}%`}
                variant="outlined"
                sx={{ fontSize: 10, height: 18, borderRadius: '6px' }}
              />
            </Stack>
            <LinearProgress
              variant={s != null ? 'determinate' : 'indeterminate'}
              value={s ?? 0}
              aria-label={`${pillar.nameAr}: ${s != null ? `${s} من 100` : 'لا توجد بيانات'}`}
              sx={{
                mt: 0.8,
                height: 4,
                borderRadius: 2,
                bgcolor: `${col}20`,
                '& .MuiLinearProgress-bar': { bgcolor: col, borderRadius: 2 },
              }}
            />
          </Box>
        </Stack>
      </Glass>
    </Grow>
  );
}

// ── HotspotRow ────────────────────────────────────────────────────

function HotspotRow({ h, i }) {
  const sev = (h.severity || 'medium').toLowerCase();
  const c = HOTSPOT_COLORS[sev] || HOTSPOT_COLORS.medium;
  return (
    <Grow in timeout={500 + i * 80}>
      <Box
        sx={{
          p: '10px 14px',
          borderRadius: '12px',
          mb: 1,
          background: c.bg,
          border: `1px solid ${c.border}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
        }}
      >
        <HotspotIcon sx={{ color: c.icon, fontSize: 18, mt: 0.2, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            color={c.icon}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.3 }}
          >
            {sev === 'critical'
              ? 'حرج'
              : sev === 'high'
                ? 'عالي'
                : sev === 'medium'
                  ? 'متوسط'
                  : 'منخفض'}
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ mt: 0.2, lineHeight: 1.4 }}>
            {h.detail || h.message || JSON.stringify(h)}
          </Typography>
          {h.kind && (
            <Chip
              size="small"
              label={h.kind}
              sx={{ mt: 0.5, fontSize: 10, height: 16, borderRadius: 4 }}
            />
          )}
        </Box>
      </Box>
    </Grow>
  );
}

// ── QuickLink ─────────────────────────────────────────────────────

function QuickLink({ item, navigate }) {
  return (
    <Box
      component={motion.div}
      whileHover={{ scale: 1.04 }}
      onClick={() => navigate(item.path)}
      sx={{
        p: '12px 16px',
        borderRadius: '14px',
        cursor: 'pointer',
        background: `${item.color}10`,
        border: `1px solid ${item.color}30`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        transition: 'background .2s',
        '&:hover': { background: `${item.color}20` },
      }}
    >
      <Box sx={{ color: item.color, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
      <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ flex: 1 }}>
        {item.label}
      </Typography>
      <GoIcon sx={{ color: item.color, fontSize: 16 }} />
    </Box>
  );
}

// ── KPI Cards (legacy) ────────────────────────────────────────────

function KpiCard({ label, value, gradient, icon, delay }) {
  return (
    <Grow in timeout={600 + delay * 150}>
      <Box
        component={motion.div}
        whileHover={{ y: -4 }}
        sx={{
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ height: 4, background: gradient }} />
        <Box
          sx={{
            p: '18px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              letterSpacing={0.4}
            >
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={800} mt={0.5} lineHeight={1.2}>
              {value ?? '—'}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '14px',
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </Box>
    </Grow>
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function QualityDashboard() {
  const navigate = useNavigate();
  const [hs, setHs] = useState(null); // health score result
  const [legacy, setLegacy] = useState(null); // legacy dashboard data
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(90);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hsRes, legacyRes] = await Promise.allSettled([
        apiClient.get('/quality/health-score', { params: { windowDays } }),
        apiClient
          .get('/quality/dashboard/all')
          .catch(() =>
            apiClient.get('/quality-enhanced/dashboard/all').catch(() => ({ data: null }))
          ),
      ]);
      if (hsRes.status === 'fulfilled') {
        setHs(hsRes.value.data?.data || hsRes.value.data);
      } else {
        setError('تعذّر تحميل النتيجة الصحية — تحقق من الخوادم');
      }
      if (legacyRes.status === 'fulfilled') {
        setLegacy(legacyRes.value?.data?.data || legacyRes.value?.data);
      }
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived ────────────────────────────────────────────────────

  const score = hs?.score ?? null;
  const grade = hs?.grade ?? null;
  const pillars = hs?.pillars ?? [];
  const hotspots = hs?.hotspots ?? [];
  const warnings = hs?.warnings ?? [];
  const summary = hs?.summary ?? {};
  const computedAt = hs?.computedAt;

  const legacyKpis = legacy
    ? [
        {
          label: 'المعايير المعتمدة',
          value: legacy.totalStandards,
          gradient: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
          icon: <QualityIcon sx={{ fontSize: 26, color: '#fff' }} />,
        },
        {
          label: 'تدقيقات نشطة',
          value: legacy.activeAudits,
          gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
          icon: <AuditIcon sx={{ fontSize: 26, color: '#fff' }} />,
        },
        {
          label: 'نسبة الامتثال',
          value: legacy.complianceRate != null ? `${legacy.complianceRate}%` : null,
          gradient: `linear-gradient(135deg,${legacy.complianceRate >= 85 ? '#10b981,#059669' : '#f97316,#ea580c'})`,
          icon: <ComplianceIcon sx={{ fontSize: 26, color: '#fff' }} />,
        },
        {
          label: 'ملاحظات مفتوحة',
          value: legacy.openFindings,
          gradient: 'linear-gradient(135deg,#ef4444,#dc2626)',
          icon: <IndicatorIcon sx={{ fontSize: 26, color: '#fff' }} />,
        },
      ]
    : [];

  const deptData = (legacy?.complianceByDept || []).map(d => ({
    name: d.department,
    rate: d.rate,
  }));
  const recentAudits = legacy?.recentAudits || [];

  // ── Render ────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        minHeight: '100vh',
        direction: 'rtl',
        background: 'linear-gradient(135deg,#faf5ff 0%,#f5f3ff 50%,#eef2ff 100%)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <Fade in timeout={400}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            mb: 4,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5,
              }}
            >
              لوحة التحكم التنفيذية — الجودة والامتثال
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ISO 9001:2015 · CBAHI · PDPL
              {computedAt && ` · آخر تحديث: ${fmtDate(computedAt)}`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>الفترة</InputLabel>
              <Select
                value={windowDays}
                label="الفترة"
                onChange={e => setWindowDays(Number(e.target.value))}
              >
                {WINDOW_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="تحديث">
              <IconButton
                onClick={load}
                disabled={loading}
                sx={{
                  bgcolor: 'rgba(139,92,246,0.08)',
                  '&:hover': { bgcolor: 'rgba(139,92,246,0.15)' },
                }}
              >
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <RefreshIcon sx={{ color: '#8b5cf6' }} />
                )}
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Fade>

      {error && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {/* ── Health Score Band ────────────────────────────────────── */}
      <Fade in={!loading} timeout={600}>
        <Glass sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            {/* Gauge */}
            <Grid item xs={12} sm={4} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
              {loading ? (
                <Box
                  sx={{
                    width: 180,
                    height: 180,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CircularProgress size={60} sx={{ color: '#8b5cf6' }} />
                </Box>
              ) : (
                <ScoreGauge score={score} grade={grade} size={180} />
              )}
            </Grid>

            {/* Summary */}
            <Grid item xs={12} sm={8} md={4}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                النتيجة الصحية التنفيذية
              </Typography>
              {score != null && (
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <Chip
                    label={`${score}/100`}
                    sx={{
                      bgcolor: `${gradeColor(grade)}20`,
                      color: gradeColor(grade),
                      fontWeight: 700,
                    }}
                  />
                  {grade && (
                    <Chip
                      label={grade.grade + ' — ' + grade.label}
                      sx={{
                        fontWeight: 600,
                        bgcolor: `${gradeColor(grade)}15`,
                        color: gradeColor(grade),
                      }}
                    />
                  )}
                </Stack>
              )}
              <Stack spacing={0.8}>
                <Typography variant="body2" color="text.secondary">
                  <strong>الأعمدة المتاحة:</strong> {summary.pillarsAvailable ?? '—'} من 10
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>الأوزان المستخدمة:</strong>{' '}
                  {summary.weightsUsed != null ? `${Math.round(summary.weightsUsed * 100)}%` : '—'}
                </Typography>
                {warnings.length > 0 && (
                  <Alert severity="info" sx={{ py: 0.3, px: 1.5, borderRadius: 2, mt: 0.5 }}>
                    {warnings.length} مصدر بيانات غير متاح
                  </Alert>
                )}
              </Stack>
            </Grid>

            {/* Quick scores summary */}
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom color="text.secondary">
                أبرز الأعمدة
              </Typography>
              <Stack spacing={0.6}>
                {pillars.slice(0, 5).map(p => (
                  <Stack key={p.id} direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ width: 130 }} noWrap>
                      {p.nameAr}
                    </Typography>
                    <LinearProgress
                      variant={p.score != null ? 'determinate' : 'indeterminate'}
                      value={p.score ?? 0}
                      aria-label={`${p.nameAr}: ${p.score != null ? `${p.score} من 100` : 'لا توجد بيانات'}`}
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#f1f5f9',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: pillarScore2Color(p.score),
                          borderRadius: 3,
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color={pillarScore2Color(p.score)}
                      sx={{ width: 28, textAlign: 'right' }}
                    >
                      {p.score ?? '—'}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Glass>
      </Fade>

      {/* ── Pillars Grid ─────────────────────────────────────────── */}
      {pillars.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            أعمدة الأداء — 10 محاور
          </Typography>
          <Grid container spacing={2}>
            {pillars.map((p, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
                <PillarCard pillar={p} delay={i * 60} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── Hotspots + Quick Links ────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Hotspots */}
        <Grid item xs={12} md={7}>
          <Glass sx={{ p: 3, height: '100%' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <HotspotIcon sx={{ color: '#ef4444' }} />
              <Typography variant="h6" fontWeight={700}>
                أبرز نقاط الخطر
              </Typography>
              {hotspots.length > 0 && (
                <Chip label={hotspots.length} size="small" color="error" sx={{ mr: 'auto' }} />
              )}
            </Stack>
            {loading && <LinearProgress sx={{ mb: 2 }} aria-label="جارٍ تحميل بيانات الجودة" />}
            {!loading && hotspots.length === 0 && (
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ py: 3, color: '#10b981' }}
              >
                <OkIcon />
                <Typography variant="body2" fontWeight={600}>
                  لا توجد نقاط خطر حالياً — الوضع جيد
                </Typography>
              </Stack>
            )}
            {hotspots.map((h, i) => (
              <HotspotRow key={i} h={h} i={i} />
            ))}
          </Glass>
        </Grid>

        {/* Quick Links */}
        <Grid item xs={12} md={5}>
          <Glass sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              الوحدات الفرعية
            </Typography>
            <Stack spacing={1}>
              {QUICK_LINKS.map(item => (
                <QuickLink key={item.path} item={item} navigate={navigate} />
              ))}
            </Stack>
          </Glass>
        </Grid>
      </Grid>

      {/* ── Legacy KPI Cards ──────────────────────────────────────── */}
      {legacyKpis.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            مؤشرات التدقيق والمعايير
          </Typography>
          <Grid container spacing={3}>
            {legacyKpis.map((k, i) => (
              <Grid item xs={12} sm={6} md={3} key={k.label}>
                <KpiCard {...k} delay={i} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── Department Compliance ─────────────────────────────────── */}
      {deptData.length > 0 && (
        <Glass sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            الامتثال حسب القسم
          </Typography>
          <Stack spacing={1.5}>
            {deptData.map(d => {
              const col = d.rate >= 85 ? '#10b981' : d.rate >= 70 ? '#f59e0b' : '#ef4444';
              return (
                <Stack key={d.name} direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2" color="text.secondary" sx={{ width: 120 }} noWrap>
                    {d.name}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={d.rate}
                    aria-label={`${d.name}: ${d.rate}٪`}
                    sx={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: `${col}15`,
                      '& .MuiLinearProgress-bar': { bgcolor: col, borderRadius: 4 },
                    }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={col}
                    sx={{ width: 42, textAlign: 'left' }}
                  >
                    {d.rate}%
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Glass>
      )}

      {/* ── Recent Audits ─────────────────────────────────────────── */}
      {recentAudits.length > 0 && (
        <Glass sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            آخر التدقيقات
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>رقم التدقيق</TableCell>
                  <TableCell>المجال</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الملاحظات</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentAudits.map((a, i) => (
                  <TableRow key={i} hover>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {a.auditNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>{a.area}</TableCell>
                    <TableCell>{fmtDate(a.date)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={a.findings}
                        color={a.findings > 3 ? 'error' : a.findings > 1 ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          a.status === 'completed'
                            ? 'مكتمل'
                            : a.status === 'in_progress'
                              ? 'جارٍ'
                              : a.status
                        }
                        color={a.status === 'completed' ? 'success' : 'info'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Glass>
      )}

      {/* Empty state */}
      {!loading && !hs && !legacy && !error && (
        <Fade in>
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <MissingIcon sx={{ fontSize: 64, mb: 2, opacity: 0.4 }} />
            <Typography variant="h6">لا توجد بيانات متاحة بعد</Typography>
            <Typography variant="body2">
              تأكد من تشغيل الخدمات وتكوين المصادر في HealthScoreAggregator
            </Typography>
          </Box>
        </Fade>
      )}
    </Box>
  );
}
