/**
 * AdminReferrals — /admin/referrals page.
 * Referral-network analytics: funnel + top referrers + close-loop gaps.
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

export default function AdminReferrals() {
  const [overview, setOverview] = useState(null);
  const [topList, setTopList] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [thresholdDays, setThresholdDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, tr, gp] = await Promise.all([
        api.get('/admin/referrals/overview'),
        api.get('/admin/referrals/top-referrers?limit=10'),
        api.get('/admin/referrals/close-loop-gaps'),
      ]);
      setOverview(ov.data || null);
      setTopList(tr.data?.items || []);
      setGaps(gp.data?.items || []);
      setThresholdDays(gp.data?.thresholdDays || 30);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const both = overview?.both || {};
  const incoming = overview?.incoming || {};
  const outgoing = overview?.outgoing || {};

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            الإحالات — تحليل الشبكة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            من يرسل لنا عائلات، نسبة التحوّل إلى تسجيل، والإحالات الصادرة العالقة بانتظار إغلاق
            الحلقة.
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
            href="/api/admin/referrals/export.csv"
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

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                إجمالي الإحالات
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {both.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                واردة
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {incoming.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                نسبة التحوّل (كلية)
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={
                  both.conversionRate == null
                    ? 'text.secondary'
                    : both.conversionRate >= 70
                      ? 'success.main'
                      : both.conversionRate < 40
                        ? 'warning.main'
                        : 'inherit'
                }
              >
                {both.conversionRate != null ? `${both.conversionRate}%` : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                صادرة عالقة
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={(overview?.staleGapCount || 0) > 0 ? 'error.main' : 'success.main'}
              >
                {overview?.staleGapCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={1}>
                واردة — {incoming.total || 0}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                <Chip label={`قيد المراجعة: ${incoming.pending || 0}`} size="small" />
                <Chip label={`مقبولة: ${incoming.accepted || 0}`} color="info" size="small" />
                <Chip label={`مسجّلة: ${incoming.converted || 0}`} color="success" size="small" />
                <Chip label={`مرفوضة: ${incoming.declined || 0}`} color="default" size="small" />
              </Stack>
              <Typography variant="caption" color="text.secondary" mt={2} display="block">
                نسبة التحوّل:{' '}
                {incoming.conversionRate != null ? `${incoming.conversionRate}%` : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={1}>
                صادرة — {outgoing.total || 0}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                <Chip label={`قيد المتابعة: ${outgoing.pending || 0}`} size="small" />
                <Chip label={`مقبولة: ${outgoing.accepted || 0}`} color="info" size="small" />
                <Chip label={`مكتملة: ${outgoing.converted || 0}`} color="success" size="small" />
                <Chip label={`مرفوضة: ${outgoing.declined || 0}`} color="default" size="small" />
              </Stack>
              <Typography variant="caption" color="text.secondary" mt={2} display="block">
                نسبة التحوّل:{' '}
                {outgoing.conversionRate != null ? `${outgoing.conversionRate}%` : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {gaps.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          {gaps.length} إحالة صادرة بدون إغلاق حلقة منذ أكثر من {thresholdDays} يوم — تحتاج متابعة
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight="bold" mb={1}>
            أعلى المُحيلين (لأعلى 10)
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المُحيل</TableCell>
                  <TableCell align="right">إجمالي</TableCell>
                  <TableCell align="right">محوّلون</TableCell>
                  <TableCell align="right">نسبة التحوّل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topList.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary" py={2}>
                        لا توجد بيانات
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {topList.map((r, i) => (
                  <TableRow key={r.sourceOrgSlug} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        #{i + 1} — {r.displayName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{r.total}</TableCell>
                    <TableCell align="right">{r.wins}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color:
                          r.conversionRate == null
                            ? 'text.secondary'
                            : r.conversionRate >= 70
                              ? 'success.main'
                              : r.conversionRate < 40
                                ? 'warning.main'
                                : 'inherit',
                        fontWeight: 500,
                      }}
                    >
                      {r.conversionRate != null ? `${r.conversionRate}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight="bold" mb={1}>
            إحالات صادرة عالقة
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الجهة</TableCell>
                  <TableCell>المستفيد</TableCell>
                  <TableCell align="right">أيام الانتظار</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gaps.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography color="success.main" py={2}>
                        لا توجد إحالات عالقة
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {gaps.slice(0, 20).map(g => (
                  <TableRow key={g._id} hover>
                    <TableCell>{g.destinationOrg || '—'}</TableCell>
                    <TableCell>{g.prospectName || '(مستفيد حالي)'}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>
                      {g.daysOpen} يوم
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Container>
  );
}
