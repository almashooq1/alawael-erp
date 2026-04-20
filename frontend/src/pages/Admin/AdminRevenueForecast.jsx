/**
 * AdminRevenueForecast — /admin/revenue-forecast page.
 * CEO-level view: 3-month projection + DSO + velocity + cohort curve.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
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
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import api from '../../services/api.client';

const SAR = n =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(n || 0);

function dsoColor(d) {
  if (d == null) return 'text.secondary';
  if (d <= 45) return 'success.main';
  if (d > 90) return 'error.main';
  return 'warning.main';
}

function HistoryVsProjectionChart({ history, projection }) {
  const projMonths = projection?.projections || [];
  if ((!history || history.length === 0) && projMonths.length === 0) {
    return (
      <Typography color="text.secondary" py={4} textAlign="center">
        لا توجد بيانات كافية للعرض
      </Typography>
    );
  }
  const all = [
    ...history.map(h => ({ ...h, projected: false })),
    ...projMonths.map(p => ({
      month: p.month,
      issued: p.projectedIssued,
      paid: p.projectedCollected,
      projected: true,
      confidence: p.confidence,
    })),
  ];
  const max = Math.max(...all.map(m => m.issued), 1);
  const width = 700;
  const height = 200;
  const barW = Math.min(30, (width - 60) / all.length / 2 - 2);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 40}`} preserveAspectRatio="xMidYMid meet">
      {all.map((m, i) => {
        const x = 40 + i * ((width - 60) / all.length);
        const issuedH = (m.issued / max) * height;
        const paidH = (m.paid / max) * height;
        const opacity = m.projected ? m.confidence || 0.5 : 1;
        return (
          <g key={m.month} opacity={opacity}>
            <rect
              x={x}
              y={height - issuedH}
              width={barW}
              height={issuedH}
              fill={m.projected ? '#90caf9' : '#1976d2'}
              stroke={m.projected ? '#1976d2' : 'none'}
              strokeDasharray={m.projected ? '2,2' : '0'}
            >
              <title>{`${m.projected ? 'متوقع' : 'فعلي'} مُصدر: ${SAR(m.issued)}`}</title>
            </rect>
            <rect
              x={x + barW + 2}
              y={height - paidH}
              width={barW}
              height={paidH}
              fill={m.projected ? '#a5d6a7' : '#388e3c'}
              stroke={m.projected ? '#388e3c' : 'none'}
              strokeDasharray={m.projected ? '2,2' : '0'}
            >
              <title>{`${m.projected ? 'متوقع' : 'فعلي'} مُحصّل: ${SAR(m.paid)}`}</title>
            </rect>
            <text
              x={x + barW}
              y={height + 15}
              fontSize="10"
              textAnchor="middle"
              fill={m.projected ? '#1976d2' : '#666'}
              fontWeight={m.projected ? 600 : 400}
            >
              {m.month.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminRevenueForecast() {
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [velocity, setVelocity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, hi, co, ve] = await Promise.all([
        api.get('/admin/revenue-forecast/overview?months=3'),
        api.get('/admin/revenue-forecast/history'),
        api.get('/admin/revenue-forecast/cohorts'),
        api.get('/admin/revenue-forecast/velocity'),
      ]);
      setOverview(ov.data || null);
      setHistory(hi.data?.history || []);
      setCohorts(co.data?.cohorts || []);
      setVelocity(ve.data?.items || []);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const projection = overview?.projection || {};
  const trailing = projection?.trailing || {};
  const projections = projection?.projections || [];
  const risk = overview?.risk || {};
  const dso = overview?.dso;
  const insufficient = projection?.insufficient === true;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            تنبؤ الإيرادات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            توقعات التدفق النقدي للأشهر الثلاثة القادمة بناءً على متوسط آخر 6 أشهر، مع معدل DSO
            وسرعة التحصيل حسب شركة التأمين.
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

      {insufficient && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          عدد أشهر البيانات التاريخية ({projection.monthsObserved || 0}) أقل من الحد الأدنى المطلوب
          ({projection.required || 3}) — تعذّر إصدار توقعات موثوقة
        </Alert>
      )}

      {risk.active && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          تحذير: تراجع الإيرادات في {risk.latestMonth} بنسبة {risk.dropPct}% مقارنة بالمتوسط
          التاريخي — تجاوز العتبة {risk.threshold}% (المتوسط: {SAR(risk.trailingAvg)}، الحالي:{' '}
          {SAR(risk.latestIssued)})
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                متوسط الإصدار الشهري
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {SAR(trailing.issuedAvg)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                آخر {trailing.monthsObserved || 0} شهر
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                متوسط التحصيل الشهري
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {SAR(trailing.paidAvg)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                معدل التحصيل {trailing.collectionRate != null ? `${trailing.collectionRate}%` : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                DSO (أيام تحصيل مرجّحة)
              </Typography>
              <Typography variant="h5" fontWeight="bold" color={dsoColor(dso)}>
                {dso != null ? `${dso} يوم` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                المعيار الصناعي &lt; 45 يوم
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                حالة الاتجاه
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                {risk.active ? (
                  <TrendingDownIcon color="error" />
                ) : (
                  <TrendingUpIcon color="success" />
                )}
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={risk.active ? 'error.main' : 'success.main'}
                >
                  {risk.active ? 'تراجع' : 'مستقر'}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {risk.active && risk.dropPct != null
                  ? `انخفاض ${risk.dropPct}%`
                  : 'ضمن النطاق الطبيعي'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          التاريخ والتوقّع — الأعمدة المنقّطة = متوقعة
        </Typography>
        <HistoryVsProjectionChart history={history} projection={projection} />
        {projections.length > 0 && (
          <Stack direction="row" spacing={2} mt={2} flexWrap="wrap">
            {projections.map(p => (
              <Box key={p.month} px={1.5} py={0.5} bgcolor="primary.50" borderRadius={1}>
                <Typography variant="caption" color="text.secondary">
                  {p.month}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  متوقع: {SAR(p.projectedCollected)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ثقة {Math.round(p.confidence * 100)}%
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper>
            <Box sx={{ p: 2, pb: 0 }}>
              <Typography variant="h6" fontWeight="bold">
                سرعة التحصيل حسب شركة التأمين
              </Typography>
              <Typography variant="caption" color="text.secondary">
                متوسط الأيام من الإصدار حتى الدفع الفعلي
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الشركة</TableCell>
                    <TableCell align="right">فواتير مدفوعة</TableCell>
                    <TableCell align="right">متوسط الأيام</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {velocity.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography color="text.secondary" py={2}>
                          لا توجد فواتير مدفوعة
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {velocity.slice(0, 10).map(v => (
                    <TableRow key={v.insurer} hover>
                      <TableCell>{v.name || v.insurer}</TableCell>
                      <TableCell align="right">{v.paidCount}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          color: dsoColor(v.avgDaysToPaid),
                        }}
                      >
                        {v.avgDaysToPaid} يوم
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper>
            <Box sx={{ p: 2, pb: 0 }}>
              <Typography variant="h6" fontWeight="bold">
                منحنى التحصيل حسب الأفواج
              </Typography>
              <Typography variant="caption" color="text.secondary">
                % مُحصّل من كل شهر إصدار بعد 30 / 60 / 90 / 180 يوم
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الشهر</TableCell>
                    <TableCell align="right">30 يوم</TableCell>
                    <TableCell align="right">60 يوم</TableCell>
                    <TableCell align="right">90 يوم</TableCell>
                    <TableCell align="right">180 يوم</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cohorts.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary" py={2}>
                          لا توجد أفواج
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {cohorts.slice(-6).map(c => (
                    <TableRow key={c.cohort} hover>
                      <TableCell>{c.cohort}</TableCell>
                      <TableCell align="right">{c.pct30d != null ? `${c.pct30d}%` : '—'}</TableCell>
                      <TableCell align="right">{c.pct60d != null ? `${c.pct60d}%` : '—'}</TableCell>
                      <TableCell align="right">{c.pct90d != null ? `${c.pct90d}%` : '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {c.pct180d != null ? `${c.pct180d}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
