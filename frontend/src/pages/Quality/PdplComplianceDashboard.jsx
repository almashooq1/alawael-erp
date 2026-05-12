/**
 * PdplComplianceDashboard.jsx — single-pane PDPL compliance overview.
 *
 * Backend: /api/pdpl/dashboard + /api/pdpl/retention-periods
 *
 * What this page is for:
 *   • At-a-glance compliance score (0-100, penalised by overdue
 *     requests + open breaches)
 *   • 5 metric cards with cross-links to the underlying admin pages
 *   • Retention policies reference table — what we keep + how long
 *   • Single page the DPO opens first thing in the morning
 *
 * The score is the same one the backend calculates:
 *   100
 *   – 5 per overdue subject request (>30 days)
 *   – 10 per open breach incident
 *   floor at 0
 *
 * Cross-links use react-router so the DPO can click directly through
 * to the relevant admin page (subject-requests / breaches / consents /
 * processing-records).
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Grid,
  Alert,
  Button,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Gavel as PdplIcon,
  AssignmentLate as PendingIcon,
  Warning as OverdueIcon,
  ReportProblem as BreachIcon,
  CheckCircle as ConsentIcon,
  ListAlt as RecordsIcon,
  TrendingUp as ScoreIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

/**
 * Attempt to extract a numeric "months" value from a period string like
 * "5 سنوات", "10 سنة", "6 أشهر", "25 years", "2y", "24m".
 * Returns null if unparseable.
 */
function parsePeriodMonths(period) {
  if (!period) return null;
  const s = String(period).trim();
  // Arabic years: "5 سنوات" / "10 سنة" / "عشر سنوات"
  const arYear = s.match(/^(\d+(?:\.\d+)?)\s*سن/);
  if (arYear) return Math.round(parseFloat(arYear[1]) * 12);
  // Arabic months
  const arMonth = s.match(/^(\d+(?:\.\d+)?)\s*شهر/);
  if (arMonth) return Math.round(parseFloat(arMonth[1]));
  // English: "10 years", "25y", "6 months", "24m"
  const enYear = s.match(/^(\d+(?:\.\d+)?)\s*(y|year)/i);
  if (enYear) return Math.round(parseFloat(enYear[1]) * 12);
  const enMonth = s.match(/^(\d+(?:\.\d+)?)\s*(m|month)/i);
  if (enMonth) return Math.round(parseFloat(enMonth[1]));
  // Plain number — assume years
  const plain = s.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) return Math.round(parseFloat(plain[1]) * 12);
  return null;
}

// Colour scale by duration
function durationColor(months) {
  if (months === null) return '#94a3b8';
  if (months <= 12) return '#22c55e';
  if (months <= 36) return '#3b82f6';
  if (months <= 84) return '#f59e0b';
  return '#ef4444';
}

/* ── RetentionChart ─────────────────────────────────────────────── */
function RetentionChart({ rows }) {
  const parsed = useMemo(
    () =>
      rows
        .map(r => ({ ...r, months: parsePeriodMonths(r.period) }))
        .sort((a, b) => (b.months ?? 0) - (a.months ?? 0)),
    [rows]
  );
  const maxMonths = Math.max(...parsed.map(r => r.months ?? 0), 1);

  return (
    <Stack spacing={1.2}>
      {parsed.map(r => {
        const pct = r.months !== null ? Math.round((r.months / maxMonths) * 100) : 0;
        const color = durationColor(r.months);
        return (
          <Box key={r.category}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.3 }}>
              <Typography variant="body2" noWrap sx={{ maxWidth: '60%' }}>
                {r.category}
              </Typography>
              <Tooltip title={r.months !== null ? `${r.months} شهراً` : 'غير محدد'} placement="top">
                <Chip
                  label={r.period}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Tooltip>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: `${color}22`,
                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
              }}
              aria-label={`${r.category}: ${r.period}`}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

function scoreColor(score) {
  if (score >= 90) return 'success';
  if (score >= 70) return 'info';
  if (score >= 50) return 'warning';
  return 'error';
}

function scoreLabel(score) {
  if (score >= 90) return 'ممتاز';
  if (score >= 70) return 'جيد';
  if (score >= 50) return 'يحتاج تحسين';
  return 'حرج — تدخّل فوري';
}

function MetricCard({ icon, label, value, color = 'default', onClick, alert }) {
  return (
    <Paper
      sx={{
        p: 2,
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: alert ? '4px solid' : undefined,
        borderColor: alert ? `${color}.main` : undefined,
        '&:hover': onClick ? { boxShadow: 4 } : undefined,
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={onClick ? `فتح ${label}` : undefined}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={700} color={alert ? color : undefined}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function PdplComplianceDashboard() {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [dashboard, setDashboard] = useState(null);
  const [retention, setRetention] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        apiClient.get('/pdpl/dashboard'),
        apiClient.get('/pdpl/retention-periods').catch(() => ({ data: { data: {} } })),
      ]);
      setDashboard(d?.data?.data || d?.data || null);
      const periods = r?.data?.data || {};
      setRetention(Object.entries(periods).map(([category, period]) => ({ category, period })));
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر تحميل اللوحة', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const score = dashboard?.complianceScore ?? 0;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <PdplIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          لوحة امتثال PDPL
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        نظرة شاملة على وضع امتثال نظام حماية البيانات الشخصية. يبدأ مسؤول البيانات (DPO) يومه من
        هنا. اضغط أي بطاقة للانتقال إلى الصفحة المرتبطة.
      </Typography>

      {loading && (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <CircularProgress aria-label="جاري التحميل" />
        </Box>
      )}

      {!loading && dashboard && (
        <Stack spacing={3}>
          {/* Compliance score hero */}
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <ScoreIcon sx={{ fontSize: 48 }} color={scoreColor(score)} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  درجة الامتثال
                </Typography>
                <Stack direction="row" spacing={2} alignItems="baseline">
                  <Typography variant="h2" fontWeight={700} color={`${scoreColor(score)}.main`}>
                    {score}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    / 100
                  </Typography>
                  <Chip label={scoreLabel(score)} color={scoreColor(score)} />
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={score}
                  color={scoreColor(score)}
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  aria-label={`درجة الامتثال ${score} من 100`}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1 }}
                >
                  الحساب: 100 − (5 × طلبات متأخرة) − (10 × خروقات مفتوحة)
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Critical alerts */}
          {dashboard.overdueRequests > 0 && (
            <Alert severity="error" icon={<OverdueIcon />}>
              <strong>تحذير حرج:</strong> {dashboard.overdueRequests} طلب من أصحاب البيانات تجاوز
              مهلة 30 يوم — تعرّض قانوني فوري.
              <Button
                size="small"
                sx={{ mr: 2 }}
                onClick={() => navigate('/quality/pdpl/subject-requests')}
              >
                عرض الطلبات
              </Button>
            </Alert>
          )}
          {dashboard.openBreaches > 0 && (
            <Alert severity="warning" icon={<BreachIcon />}>
              {dashboard.openBreaches} حادثة خرق بيانات مفتوحة — راجع المهلة الـ 72 ساعة لإبلاغ
              SDAIA.
              <Button
                size="small"
                sx={{ mr: 2 }}
                onClick={() => navigate('/quality/pdpl/breaches')}
              >
                عرض الحوادث
              </Button>
            </Alert>
          )}

          {/* Metric cards grid */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6} lg={3}>
              <MetricCard
                icon={<RecordsIcon />}
                label="سجل أنشطة المعالجة (مادة 32)"
                value={dashboard.processingRecords}
                onClick={() => navigate('/quality/pdpl/processing-records')}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <MetricCard
                icon={<ConsentIcon />}
                label="الموافقات النشطة (مادة 6)"
                value={dashboard.activeConsents}
                color="success"
                onClick={() => navigate('/quality/pdpl/consents')}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <MetricCard
                icon={<PendingIcon />}
                label="طلبات قيد المعالجة (مادة 4)"
                value={dashboard.pendingRequests}
                color={dashboard.pendingRequests > 0 ? 'warning' : 'default'}
                alert={dashboard.pendingRequests > 0}
                onClick={() => navigate('/quality/pdpl/subject-requests')}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <MetricCard
                icon={<OverdueIcon />}
                label="طلبات متأخرة (>30 يوم)"
                value={dashboard.overdueRequests}
                color={dashboard.overdueRequests > 0 ? 'error' : 'default'}
                alert={dashboard.overdueRequests > 0}
                onClick={() => navigate('/quality/pdpl/subject-requests')}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <MetricCard
                icon={<BreachIcon />}
                label="خروقات مفتوحة (مادة 20)"
                value={dashboard.openBreaches}
                color={dashboard.openBreaches > 0 ? 'error' : 'default'}
                alert={dashboard.openBreaches > 0}
                onClick={() => navigate('/quality/pdpl/breaches')}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <MetricCard
                icon={<RecordsIcon />}
                label="سياسات الاحتفاظ"
                value={dashboard.retentionPolicies}
              />
            </Grid>
          </Grid>

          {/* Retention reference — visual bar chart */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
              سياسات الاحتفاظ بالبيانات (PDPL مادة 31)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              فترات الاحتفاظ المعتمدة لكل فئة. الشريط يعكس المدة النسبية (الحد الأقصى = قيمة الفئة
              الأطول).
            </Typography>

            {retention.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                لا توجد سياسات احتفاظ مسجّلة
              </Typography>
            ) : (
              <RetentionChart rows={retention} />
            )}
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
