/**
 * AdminClaimsAnalytics — /admin/claims-analytics page.
 * NPHIES claims: approval funnel + rejection reasons + per-insurer + trend.
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
import api from '../../services/api.client';

const SAR = n =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(n || 0);

function approvalColor(rate) {
  if (rate == null) return 'text.secondary';
  if (rate >= 85) return 'success.main';
  if (rate < 60) return 'error.main';
  return 'warning.main';
}

function ReasonsBar({ items }) {
  if (!items || items.length === 0) {
    return (
      <Typography color="success.main" py={3} textAlign="center">
        لا توجد حالات رفض — ممتاز
      </Typography>
    );
  }
  const maxCount = Math.max(...items.map(r => r.count));
  return (
    <Stack spacing={1.5}>
      {items.map(r => (
        <Box key={r.reason}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: '70%' }}>
              {r.reason}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip size="small" label={`${r.count}`} color="error" variant="outlined" />
              <Typography variant="caption" color="text.secondary">
                {SAR(r.amount)}
              </Typography>
            </Stack>
          </Stack>
          <Box
            mt={0.5}
            bgcolor="grey.100"
            borderRadius={0.5}
            height={6}
            position="relative"
            overflow="hidden"
          >
            <Box
              position="absolute"
              top={0}
              right={0}
              height="100%"
              width={`${(r.count / maxCount) * 100}%`}
              bgcolor="error.light"
            />
          </Box>
        </Box>
      ))}
    </Stack>
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
  const max = Math.max(...months.map(m => m.submitted), 1);
  const width = 600;
  const height = 180;
  const barW = Math.min(40, (width - 40) / months.length / 3 - 2);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 40}`} preserveAspectRatio="xMidYMid meet">
      {months.map((m, i) => {
        const x = 30 + i * ((width - 40) / months.length);
        const approvedH = (m.approved / max) * height;
        const rejectedH = (m.rejected / max) * height;
        const pendingH = ((m.submitted - m.approved - m.rejected) / max) * height;
        return (
          <g key={m.month}>
            <rect x={x} y={height - approvedH} width={barW} height={approvedH} fill="#66bb6a">
              <title>{`موافقة: ${m.approved}`}</title>
            </rect>
            <rect
              x={x + barW + 2}
              y={height - rejectedH}
              width={barW}
              height={rejectedH}
              fill="#ef5350"
            >
              <title>{`رفض: ${m.rejected}`}</title>
            </rect>
            <rect
              x={x + (barW + 2) * 2}
              y={height - pendingH}
              width={barW}
              height={Math.max(0, pendingH)}
              fill="#ffb74d"
            >
              <title>{`معلّق: ${Math.max(0, m.submitted - m.approved - m.rejected)}`}</title>
            </rect>
            <text x={x + barW + 2} y={height + 15} fontSize="10" textAnchor="middle" fill="#666">
              {m.month.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminClaimsAnalytics() {
  const [overview, setOverview] = useState(null);
  const [reasons, setReasons] = useState([]);
  const [byInsurer, setByInsurer] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, rr, bi, tr] = await Promise.all([
        api.get('/admin/claims-analytics/overview'),
        api.get('/admin/claims-analytics/rejection-reasons?limit=8'),
        api.get('/admin/claims-analytics/by-insurer'),
        api.get('/admin/claims-analytics/trend?months=12'),
      ]);
      setOverview(ov.data || null);
      setReasons(rr.data?.items || []);
      setByInsurer(bi.data?.items || []);
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
  const thresholds = overview?.thresholds || {};

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            تحليلات مطالبات NPHIES
          </Typography>
          <Typography variant="body2" color="text.secondary">
            قمع القبول، أسباب الرفض، أداء شركات التأمين، والاتجاه الشهري — لتحسين دورة الإيراد.
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
            href="/api/admin/claims-analytics/export.csv"
            target="_blank"
            rel="noopener"
          >
            تصدير المرفوضة (CSV)
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
          تحذير: نسبة رفض المطالبات خلال آخر {spike.windowDays} يوم بلغت {spike.rejectionRate}% —
          تتجاوز العتبة {thresholds.rejectionAlarmPct}% (عيّنة {spike.settled} مطالبة) — يحتاج
          مراجعة مع فريق الترميز والتأمين
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                إجمالي المطالبات
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {summary.total || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {SAR(summary.totalAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                مُوافق عليها
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {summary.approvedCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {SAR(summary.approvedAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                مرفوضة
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {summary.rejectedCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {SAR(summary.rejectedAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                نسبة الموافقة
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={approvalColor(summary.approvalRate)}
              >
                {summary.approvalRate != null ? `${summary.approvalRate}%` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                معلّق: {summary.pendingCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              أهم أسباب الرفض
            </Typography>
            <ReasonsBar items={reasons} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper>
            <Box sx={{ p: 2, pb: 0 }}>
              <Typography variant="h6" fontWeight="bold">
                أداء شركات التأمين
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الشركة</TableCell>
                    <TableCell align="right">إجمالي</TableCell>
                    <TableCell align="right">موافقة</TableCell>
                    <TableCell align="right">رفض</TableCell>
                    <TableCell align="right">نسبة القبول</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {byInsurer.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary" py={2}>
                          لا توجد بيانات
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {byInsurer.slice(0, 10).map(r => (
                    <TableRow key={r.insurer} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {r.insurer}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{r.total}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {r.approved}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {r.rejected}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: approvalColor(r.approvalRate), fontWeight: 600 }}
                      >
                        {r.approvalRate != null ? `${r.approvalRate}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              الاتجاه الشهري — موافقة / رفض / معلّق
            </Typography>
            <TrendChart months={trend} />
            <Stack direction="row" spacing={3} mt={2} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box width={12} height={12} borderRadius="50%" bgcolor="#66bb6a" />
                <Typography variant="caption">موافقة</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box width={12} height={12} borderRadius="50%" bgcolor="#ef5350" />
                <Typography variant="caption">رفض</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box width={12} height={12} borderRadius="50%" bgcolor="#ffb74d" />
                <Typography variant="caption">معلّق</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
