/**
 * AdminSaudization — /admin/saudization page.
 * Nitaqat live dashboard: current band + runway + HR actions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import api from '../../services/api.client';

const BAND_COLORS = {
  red: '#d32f2f',
  low_green: '#c8e6c9',
  mid_green: '#81c784',
  high_green: '#4caf50',
  platinum: '#7e57c2',
};
const BAND_LABELS_AR = {
  red: 'الأحمر',
  low_green: 'الأخضر المنخفض',
  mid_green: 'الأخضر المتوسط',
  high_green: 'الأخضر المرتفع',
  platinum: 'البلاتيني',
};
const BAND_ORDER = ['red', 'low_green', 'mid_green', 'high_green', 'platinum'];

function directionIcon(direction) {
  if (direction === 'improved') return <TrendingUpIcon fontSize="small" color="success" />;
  if (direction === 'declined') return <TrendingDownIcon fontSize="small" color="error" />;
  return <TrendingFlatIcon fontSize="small" color="action" />;
}

function BandSpectrum({ status }) {
  if (!status?.hasData) return null;
  const currentRank = BAND_ORDER.indexOf(status.currentBand);
  return (
    <Box>
      <Stack direction="row" spacing={0} height={32} borderRadius={1} overflow="hidden">
        {BAND_ORDER.map((b, i) => (
          <Box
            key={b}
            flex={1}
            sx={{
              backgroundColor: BAND_COLORS[b],
              position: 'relative',
              opacity: i === currentRank ? 1 : 0.35,
              borderRight: i < BAND_ORDER.length - 1 ? '1px solid #fff' : 'none',
            }}
            title={BAND_LABELS_AR[b]}
          >
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: i === currentRank ? '#fff' : 'inherit',
                fontWeight: i === currentRank ? 700 : 400,
                fontSize: '0.7rem',
              }}
            >
              {BAND_LABELS_AR[b]}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function TrendChart({ months }) {
  if (!months || months.length === 0) {
    return (
      <Typography color="text.secondary" py={4} textAlign="center">
        لا توجد بيانات
      </Typography>
    );
  }
  const max = Math.max(...months.map(m => m.saudizationPercentage), 100);
  const width = 600;
  const height = 180;
  const pts = months.map((m, i) => {
    const x = 40 + (i / Math.max(1, months.length - 1)) * (width - 60);
    const y = height - (m.saudizationPercentage / max) * height;
    return { x, y, m };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 30}`} preserveAspectRatio="xMidYMid meet">
      <path d={path} stroke="#1976d2" strokeWidth="2" fill="none" />
      {pts.map(p => (
        <g key={p.m.month}>
          <circle cx={p.x} cy={p.y} r="4" fill={BAND_COLORS[p.m.band] || '#1976d2'}>
            <title>{`${p.m.month}: ${p.m.saudizationPercentage}% (${BAND_LABELS_AR[p.m.band] || p.m.band})`}</title>
          </circle>
          <text x={p.x} y={height + 15} fontSize="10" textAnchor="middle" fill="#666">
            {p.m.month.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function AdminSaudization() {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, tr, hi] = await Promise.all([
        api.get('/admin/saudization/overview'),
        api.get('/admin/saudization/trend?months=12'),
        api.get('/admin/saudization/history'),
      ]);
      setOverview(ov.data || null);
      setTrend(tr.data?.months || []);
      setHistory(hi.data?.events || []);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const status = overview?.status || { hasData: false };
  const runway = overview?.runway || {};
  const alarm = overview?.alarm || {};
  const thresholds = overview?.thresholds || {};

  const gapText = useMemo(() => {
    if (!status.hasData) return null;
    if (status.currentBand === 'platinum') return 'وصلت لأعلى نطاق — استمرار تحقيق السعودة';
    if (status.saudisNeededForNextBand > 0) {
      return `تحتاج ${status.saudisNeededForNextBand} سعودي إضافي للوصول للنطاق ${status.nextBandLabel}`;
    }
    return null;
  }, [status]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            نطاقات — لوحة التوطين المباشرة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            النطاق الحالي + توقّع فقدان النطاق الأخضر + أفعال HR الموصى بها — امتثال وزارة الموارد
            البشرية.
          </Typography>
        </Box>
        <IconButton onClick={load}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!status.hasData && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          لا توجد حسابات نطاقات مسجّلة بعد — شغّل حاسبة النطاقات أولاً
        </Alert>
      )}

      {alarm.active && alarm.reason === 'already_red' && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
          تحذير: المنشأة في النطاق الأحمر حالياً — تجميد التأشيرات + حظر التوظيف. يجب توظيف{' '}
          {alarm.saudisNeededForNextBand} سعودي للخروج من النطاق.
        </Alert>
      )}

      {alarm.active && alarm.reason === 'runway_short' && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          تحذير: بالمسار الحالي ({alarm.slopePctPerMonth}%/شهر)، ستصل المنشأة للنطاق الأحمر خلال{' '}
          <strong>{alarm.runwayMonths} شهر</strong> — أقل من العتبة ({alarm.threshold} شهر). ابدأ
          توظيف {alarm.saudisNeededForNextBand} سعودي الآن.
        </Alert>
      )}

      {status.hasData && (
        <Paper sx={{ p: 3, mb: 3, borderRight: 8, borderColor: BAND_COLORS[status.currentBand] }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">
                النطاق الحالي
              </Typography>
              <Typography
                variant="h3"
                fontWeight="bold"
                sx={{ color: BAND_COLORS[status.currentBand] }}
              >
                {status.currentBandLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                نسبة التوطين: <strong>{status.saudizationPercentage?.toFixed(1)}%</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <BandSpectrum status={status} />
              <Stack direction="row" justifyContent="space-between" mt={1.5}>
                <Typography variant="caption" color="text.secondary">
                  {status.totalEmployees} موظف · {status.saudiEmployees} سعودي ·{' '}
                  {status.expatEmployees} وافد
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  وزن السعوديين: {status.weightedSaudiCount}
                </Typography>
              </Stack>
              {gapText && (
                <Typography variant="body2" color="primary.main" mt={1.5} fontWeight={500}>
                  {gapText}
                </Typography>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                المدى المتبقي للنطاق الأحمر
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={
                  runway.runwayMonths == null
                    ? 'success.main'
                    : runway.runwayMonths <= thresholds.alarmMonths
                      ? 'error.main'
                      : 'warning.main'
                }
              >
                {runway.runwayMonths == null
                  ? runway.reason === 'stable_or_improving'
                    ? 'مستقر'
                    : '—'
                  : `${runway.runwayMonths} شهر`}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {runway.reason === 'stable_or_improving' && 'الاتجاه مستقر أو محسّن'}
                {runway.reason === 'declining' && `ميل: ${runway.slopePctPerMonth}%/شهر`}
                {runway.reason === 'insufficient_history' &&
                  `يحتاج ${runway.required} شهر على الأقل`}
                {runway.reason === 'already_red' && 'في النطاق الأحمر'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                سعوديون للنطاق التالي
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={
                  status.saudisNeededForNextBand > 10
                    ? 'error.main'
                    : status.saudisNeededForNextBand > 0
                      ? 'warning.main'
                      : 'success.main'
                }
              >
                {status.saudisNeededForNextBand || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {status.nextBandLabel ? `للوصول: ${status.nextBandLabel}` : 'أعلى نطاق'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                الحد الأقصى للوافدين
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {status.maxExpatsAllowed || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                حالياً: {status.expatEmployees || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                حد النطاق الأحمر
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {status.thresholds?.redMax != null ? `${status.thresholds.redMax}%` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                أخضر منخفض حتى: {status.thresholds?.lowGreenMax}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          مسار نسبة التوطين — 12 شهر
        </Typography>
        <TrendChart months={trend} />
      </Paper>

      <Paper>
        <Box sx={{ p: 2, pb: 0 }}>
          <Typography variant="h6" fontWeight="bold">
            أحداث تغيير النطاق
          </Typography>
          <Typography variant="caption" color="text.secondary">
            فقط اللحظات التي تغيّر فيها النطاق
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell>النطاق</TableCell>
                <TableCell>السابق</TableCell>
                <TableCell align="center">الاتجاه</TableCell>
                <TableCell align="right">نسبة التوطين</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" py={2}>
                      لا توجد أحداث مسجّلة
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {history
                .slice()
                .reverse()
                .map((ev, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{new Date(ev.date).toISOString().slice(0, 10)}</TableCell>
                    <TableCell>
                      <Chip
                        label={ev.bandLabel}
                        size="small"
                        sx={{
                          backgroundColor: BAND_COLORS[ev.band],
                          color: ev.band === 'red' || ev.band === 'platinum' ? '#fff' : 'inherit',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {ev.previousBand ? (
                        <Typography variant="caption">
                          {BAND_LABELS_AR[ev.previousBand] || ev.previousBand}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{directionIcon(ev.direction)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      {ev.saudizationPercentage?.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}
