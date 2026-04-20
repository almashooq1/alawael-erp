/**
 * AdminRevenue — /admin/revenue page.
 * Finance dashboard: revenue KPIs + AR aging + top debtors + monthly trend.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import api from '../../services/api.client';

const SAR = n =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(n || 0);

const BUCKET_LABELS = {
  current: 'قيد السداد',
  d0to30: 'متأخر 0-30 يوم',
  d31to60: 'متأخر 31-60 يوم',
  d61to90: 'متأخر 61-90 يوم',
  over90: 'متأخر أكثر من 90 يوم',
};

const BUCKET_COLORS = {
  current: '#81c784',
  d0to30: '#ffd54f',
  d31to60: '#ffb74d',
  d61to90: '#ff8a65',
  over90: '#e57373',
};

function AgingBar({ aging }) {
  const total = aging?.totalOutstanding || 0;
  if (total === 0) {
    return (
      <Typography color="success.main" py={2} textAlign="center">
        لا توجد مستحقات قائمة
      </Typography>
    );
  }
  const keys = ['current', 'd0to30', 'd31to60', 'd61to90', 'over90'];
  return (
    <Box>
      <Box display="flex" width="100%" height={24} borderRadius={1} overflow="hidden">
        {keys.map(k => {
          const amt = aging[k]?.amount || 0;
          const pct = total > 0 ? (amt / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <Box
              key={k}
              sx={{
                width: `${pct}%`,
                backgroundColor: BUCKET_COLORS[k],
                transition: 'width 0.3s',
              }}
              title={`${BUCKET_LABELS[k]}: ${SAR(amt)}`}
            />
          );
        })}
      </Box>
      <Stack direction="row" spacing={2} mt={2} flexWrap="wrap" gap={1}>
        {keys.map(k => (
          <Box key={k} display="flex" alignItems="center" gap={0.5}>
            <Box width={12} height={12} borderRadius="50%" bgcolor={BUCKET_COLORS[k]} />
            <Typography variant="caption">
              {BUCKET_LABELS[k]} — {SAR(aging[k]?.amount || 0)} ({aging[k]?.count || 0})
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
        لا توجد بيانات للفترة المحددة
      </Typography>
    );
  }
  const max = Math.max(...months.map(m => m.issued), 1);
  const width = 600;
  const height = 200;
  const barW = Math.min(50, (width - 40) / months.length / 2 - 4);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 40}`} preserveAspectRatio="xMidYMid meet">
      {months.map((m, i) => {
        const x = 30 + i * ((width - 40) / months.length);
        const issuedH = (m.issued / max) * height;
        const paidH = (m.paid / max) * height;
        return (
          <g key={m.month}>
            <rect x={x} y={height - issuedH} width={barW} height={issuedH} fill="#90caf9">
              <title>{`مُصدر: ${SAR(m.issued)}`}</title>
            </rect>
            <rect x={x + barW + 2} y={height - paidH} width={barW} height={paidH} fill="#66bb6a">
              <title>{`مدفوع: ${SAR(m.paid)}`}</title>
            </rect>
            <text x={x + barW} y={height + 15} fontSize="10" textAnchor="middle" fill="#666">
              {m.month.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminRevenue() {
  const [overview, setOverview] = useState(null);
  const [debtors, setDebtors] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, td, tr] = await Promise.all([
        api.get('/admin/revenue/overview'),
        api.get('/admin/revenue/top-debtors?limit=10'),
        api.get('/admin/revenue/trend?months=12'),
      ]);
      setOverview(ov.data || null);
      setDebtors(td.data?.items || []);
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
  const aging = overview?.aging || null;
  const alarmActive = overview?.overdueAlarm === true;
  const alarmPct = overview?.thresholds?.overdueAlarmPct ?? 15;

  const over90Pct = useMemo(() => {
    if (!aging || !aging.totalOutstanding) return null;
    return Math.round(((aging.over90?.amount || 0) / aging.totalOutstanding) * 1000) / 10;
  }, [aging]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            الإيرادات والذمم المدينة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تحصيل الفواتير، أعمار الذمم المدينة، وأكبر المدينين — لمتابعة فريق المالية.
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
            href="/api/admin/revenue/export.csv"
            target="_blank"
            rel="noopener"
          >
            تصدير CSV
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {alarmActive && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          تحذير: ذمم متأخرة أكثر من 90 يوماً تتجاوز {alarmPct}% من إجمالي المستحقات ({over90Pct}%
          حالياً) — يحتاج متابعة فورية من فريق المالية
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                إجمالي الإيرادات
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {SAR(summary.grossRevenue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                المُحصّل
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {SAR(summary.paidRevenue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                المستحق غير المدفوع
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={alarmActive ? 'error.main' : 'warning.main'}
              >
                {SAR(summary.outstandingAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                نسبة التحصيل
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={
                  summary.collectionRate == null
                    ? 'text.secondary'
                    : summary.collectionRate >= 80
                      ? 'success.main'
                      : summary.collectionRate < 50
                        ? 'error.main'
                        : 'warning.main'
                }
              >
                {summary.collectionRate != null ? `${summary.collectionRate}%` : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              أعمار الذمم المدينة
            </Typography>
            {aging ? <AgingBar aging={aging} /> : <LinearProgress />}
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              الاتجاه الشهري — مُصدر مقابل مُحصّل
            </Typography>
            <TrendChart months={trend} />
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              الأعمدة الزرقاء = الفواتير المُصدرة، الخضراء = المُحصّل — آخر 12 شهراً
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                أكبر المدينين
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>المستفيد</TableCell>
                    <TableCell align="right">الفواتير</TableCell>
                    <TableCell align="right">المبلغ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {debtors.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary" py={2}>
                          لا توجد ذمم مدينة
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {debtors.map((d, i) => (
                    <TableRow key={d.beneficiary} hover>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {d.name || '—'}
                        </Typography>
                        {d.phone && (
                          <Typography variant="caption" color="text.secondary">
                            {d.phone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{d.invoiceCount}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                        {SAR(d.outstandingAmount)}
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
