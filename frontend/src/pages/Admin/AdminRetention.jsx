/**
 * AdminRetention — /admin/retention page.
 * Beneficiary retention dashboard: active/at-risk/churned + watchlist +
 * cohort curve + per-service churn + monthly trend.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import api from '../../services/api.client';

function retentionColor(rate) {
  if (rate == null) return 'text.secondary';
  if (rate >= 85) return 'success.main';
  if (rate < 65) return 'error.main';
  return 'warning.main';
}

function classificationChip(cls) {
  if (cls === 'at_risk') return { label: 'مُعرّض', color: 'error' };
  if (cls === 'active') return { label: 'نشط (متراجع)', color: 'warning' };
  return { label: cls, color: 'default' };
}

function CohortTable({ cohorts }) {
  if (!cohorts || cohorts.length === 0) {
    return (
      <Typography color="text.secondary" py={3} textAlign="center">
        لا توجد بيانات أفواج
      </Typography>
    );
  }
  // Show only cohorts old enough to have at least m3 signal.
  const rows = cohorts.slice(-12);
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>الشهر</TableCell>
            <TableCell align="right">المُسجَّلون</TableCell>
            <TableCell align="right">1 شهر</TableCell>
            <TableCell align="right">3 شهور</TableCell>
            <TableCell align="right">6 شهور</TableCell>
            <TableCell align="right">12 شهر</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(c => (
            <TableRow key={c.cohort} hover>
              <TableCell>{c.cohort}</TableCell>
              <TableCell align="right">{c.enrolled}</TableCell>
              <TableCell align="right" sx={{ color: retentionColor(c.m1Pct) }}>
                {c.m1Pct != null ? `${c.m1Pct}%` : '—'}
              </TableCell>
              <TableCell align="right" sx={{ color: retentionColor(c.m3Pct) }}>
                {c.m3Pct != null ? `${c.m3Pct}%` : '—'}
              </TableCell>
              <TableCell align="right" sx={{ color: retentionColor(c.m6Pct) }}>
                {c.m6Pct != null ? `${c.m6Pct}%` : '—'}
              </TableCell>
              <TableCell align="right" sx={{ color: retentionColor(c.m12Pct), fontWeight: 600 }}>
                {c.m12Pct != null ? `${c.m12Pct}%` : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ChurnTrendChart({ months }) {
  if (!months || months.length === 0) {
    return (
      <Typography color="success.main" py={4} textAlign="center">
        لا توجد حالات تسرّب مسجّلة — ممتاز
      </Typography>
    );
  }
  const max = Math.max(...months.map(m => m.churned), 1);
  const width = 600;
  const height = 150;
  const barW = Math.min(40, (width - 40) / months.length - 4);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 30}`} preserveAspectRatio="xMidYMid meet">
      {months.map((m, i) => {
        const x = 30 + i * ((width - 40) / months.length);
        const h = (m.churned / max) * height;
        return (
          <g key={m.month}>
            <rect x={x} y={height - h} width={barW} height={h} fill="#ef5350">
              <title>{`${m.month}: ${m.churned} تسرّب`}</title>
            </rect>
            <text x={x + barW / 2} y={height + 12} fontSize="10" textAnchor="middle" fill="#666">
              {m.month.slice(5)}
            </text>
            <text
              x={x + barW / 2}
              y={height - h - 4}
              fontSize="10"
              textAnchor="middle"
              fill="#c62828"
              fontWeight={600}
            >
              {m.churned}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminRetention() {
  const [overview, setOverview] = useState(null);
  const [atRisk, setAtRisk] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [byService, setByService] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, ar, co, bs, tr] = await Promise.all([
        api.get('/admin/retention/overview'),
        api.get('/admin/retention/at-risk?limit=25'),
        api.get('/admin/retention/cohorts'),
        api.get('/admin/retention/by-service'),
        api.get('/admin/retention/trend'),
      ]);
      setOverview(ov.data || null);
      setAtRisk(ar.data?.items || []);
      setCohorts(co.data?.cohorts || []);
      setByService(bs.data?.items || []);
      setTrend(tr.data?.months || []);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = overview?.summary || {};
  const spike = overview?.spike || {};

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            الاحتفاظ بالمستفيدين
          </Typography>
          <Typography variant="body2" color="text.secondary">
            من ينشط، من يتراجع، من غادر — مع قائمة مراقبة للمستفيدين المعرّضين للتسرّب قبل أن
            يختفوا. يستند إلى نشاط الجلسات الفعلي، لا إلى حقل الحالة فقط.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            component="a"
            href="/api/admin/retention/export.csv"
            target="_blank"
            rel="noopener"
          >
            تصدير قائمة المراقبة
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {spike.active && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          تحذير: معدل التسرّب الشهري {spike.churnPct}% تجاوز العتبة {spike.threshold}% (
          {spike.churnedInMonth}
          مستفيد تسرّب خلال {spike.latestMonth} من أصل {spike.activeBase} نشط) — يحتاج مراجعة فورية
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                نشط
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {summary.active || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                خلال آخر {overview?.thresholds?.activeDays || 30} يوم
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                مُعرّض للتسرّب
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {summary.atRisk || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                فجوة {overview?.thresholds?.activeDays}–{overview?.thresholds?.churnDays} يوم
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                مُتسرّب
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {summary.churned || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                لا جلسة منذ &gt; {overview?.thresholds?.churnDays || 60} يوم
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                نسبة الاحتفاظ
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={retentionColor(summary.retentionRate)}
              >
                {summary.retentionRate != null ? `${summary.retentionRate}%` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                متوسط المدة{' '}
                {summary.avgTenureDays != null ? `${Math.round(summary.avgTenureDays)} يوم` : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={7}>
          <Paper>
            <Box sx={{ p: 2, pb: 0 }}>
              <Typography variant="h6" fontWeight="bold">
                قائمة المراقبة — المعرّضون للتسرّب
              </Typography>
              <Typography variant="caption" color="text.secondary">
                أقدم أولاً + المُتراجعون (جلسات 30 يوم الماضية أقل من نصف الـ30 قبلها)
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المستفيد</TableCell>
                    <TableCell align="center">التصنيف</TableCell>
                    <TableCell align="right">أيام بلا جلسة</TableCell>
                    <TableCell align="right">آخر 30ي</TableCell>
                    <TableCell align="right">الـ30 قبلها</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {atRisk.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="success.main" py={2}>
                          لا يوجد مستفيدون معرّضون — ممتاز
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {atRisk.slice(0, 15).map(r => {
                    const ch = classificationChip(r.classification);
                    return (
                      <TableRow key={r._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {r.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.status}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={ch.label}
                            color={ch.color}
                            size="small"
                            variant="outlined"
                            icon={r.declining ? <TrendingDownIcon fontSize="small" /> : undefined}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                          {r.daysSinceLastSession ?? '—'}
                        </TableCell>
                        <TableCell align="right">{r.sessionsLast30d}</TableCell>
                        <TableCell align="right">{r.sessionsPrior30d}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold" mb={1}>
              اتجاه التسرّب الشهري
            </Typography>
            <ChurnTrendChart months={trend} />
          </Paper>

          <Paper sx={{ mt: 2 }}>
            <Box sx={{ p: 2, pb: 0 }}>
              <Typography variant="h6" fontWeight="bold">
                التسرّب حسب نوع البرنامج
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>البرنامج</TableCell>
                    <TableCell align="right">إجمالي</TableCell>
                    <TableCell align="right">الاحتفاظ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {byService.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography color="text.secondary" py={2}>
                          لا توجد بيانات
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {byService.slice(0, 8).map(r => (
                    <TableRow key={r.service} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {r.service}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          نشط {r.active} · منسحب {r.dropped}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{r.total}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 600, color: retentionColor(r.retentionRate) }}
                      >
                        {r.retentionRate != null ? `${r.retentionRate}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2, pb: 0 }}>
          <Typography variant="h6" fontWeight="bold">
            منحنى الأفواج — الاحتفاظ بعد 1 / 3 / 6 / 12 شهر
          </Typography>
          <Typography variant="caption" color="text.secondary">
            أخضر ≥ 85% · أصفر 65–84% · أحمر &lt; 65%
          </Typography>
        </Box>
        <CohortTable cohorts={cohorts} />
      </Paper>
    </Container>
  );
}
