/**
 * AdminDocumentExpiry — /admin/document-expiry page.
 * Consolidated expiry radar across documents + employment contracts.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import ErrorIcon from '@mui/icons-material/Error';
import api from '../../services/api.client';

const WINDOW_LABELS = {
  expired: 'منتهٍ',
  critical: 'حرج',
  warning: 'تحذير',
  ok: 'سليم',
};

const WINDOW_COLORS = {
  expired: 'error',
  critical: 'error',
  warning: 'warning',
  ok: 'success',
  unknown: 'default',
};

const SOURCE_LABELS = {
  document: 'وثيقة',
  employment: 'عقد موظف',
  contract: 'عقد مورّد',
};

function daysText(days) {
  if (days == null) return '—';
  if (days < 0) return `منذ ${Math.abs(days)} يوم`;
  if (days === 0) return 'اليوم';
  return `بعد ${days} يوم`;
}

export default function AdminDocumentExpiry() {
  const [overview, setOverview] = useState(null);
  const [radar, setRadar] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, rd, bc, up] = await Promise.all([
        api.get('/admin/document-expiry/overview'),
        api.get('/admin/document-expiry/radar?limit=100'),
        api.get('/admin/document-expiry/by-category'),
        api.get('/admin/document-expiry/upcoming?days=30'),
      ]);
      setOverview(ov.data || null);
      setRadar(rd.data?.items || []);
      setByCategory(bc.data?.items || []);
      setUpcoming(up.data?.items || []);
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
  const surge = overview?.surge || {};
  const thresholds = overview?.thresholds || {};

  const urgent = useMemo(() => (summary.expired || 0) + (summary.critical || 0), [summary]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            رادار انتهاء الوثائق
          </Typography>
          <Typography variant="body2" color="text.secondary">
            وثائق تنتهي صلاحيتها، رخص، عقود موظفين — قبل أن تتسبّب في إغلاق عمليات أو مخالفات
            نظامية. يعرض كل المصادر في نافذة واحدة.
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
            href="/api/admin/document-expiry/export.csv"
            target="_blank"
            rel="noopener"
          >
            تصدير الرادار
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {summary.expired > 0 && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
          {summary.expired} وثيقة/عقد انتهت صلاحيتها فعلياً — إجراء فوري مطلوب لتجنّب تعطّل العمليات
        </Alert>
      )}

      {surge.active && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          تحذير: {surge.current} وثيقة ستنتهي خلال الـ30 يوماً القادمة — أعلى بنسبة {surge.jumpPct}%
          من المتوسط الشهري ({surge.baselineAvg}). خطّط للتجديدات مبكراً
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                منتهية
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {summary.expired || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                تحتاج تجديد عاجل
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                حرجة
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {summary.critical || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                ≤ {thresholds.criticalDays || 30} يوم
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                تحذير
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {summary.warning || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                ≤ {thresholds.warningDays || 90} يوم
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                سليم
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {summary.ok || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                من إجمالي {summary.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper>
            <Box sx={{ p: 2, pb: 0 }}>
              <Typography variant="h6" fontWeight="bold">
                قائمة الرادار ({radar.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                الأسرع انتهاءً أولاً — يستثني السليمة
              </Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 540 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>العنوان</TableCell>
                    <TableCell align="center">المصدر</TableCell>
                    <TableCell align="center">الفئة</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                    <TableCell align="right">الانتهاء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {radar.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="success.main" py={2}>
                          لا توجد وثائق قرب الانتهاء — ممتاز
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {radar.map(r => (
                    <TableRow key={`${r.source}-${r._id}`} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 260 }}>
                          {r.title || '(بلا عنوان)'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={SOURCE_LABELS[r.source] || r.source}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption">{r.category}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={WINDOW_LABELS[r.window] || r.window}
                          color={WINDOW_COLORS[r.window] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          color:
                            r.window === 'expired'
                              ? 'error.main'
                              : r.window === 'critical'
                                ? 'warning.main'
                                : 'text.primary',
                        }}
                      >
                        {daysText(r.daysUntilExpiry)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ mb: 2 }}>
            <Box sx={{ p: 2, pb: 0 }}>
              <Typography variant="h6" fontWeight="bold">
                انتهاءات قريبة (30 يوم)
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>العنوان</TableCell>
                    <TableCell align="right">الأيام</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcoming.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography color="success.main" py={2}>
                          لا انتهاءات في الـ30 يوم القادمة
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {upcoming.slice(0, 10).map(u => (
                    <TableRow key={`${u.source}-${u._id}`} hover>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 240 }}>
                          {u.title || '(بلا عنوان)'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {SOURCE_LABELS[u.source] || u.source} · {u.category}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          color: u.daysUntilExpiry <= 7 ? 'error.main' : 'warning.main',
                        }}
                      >
                        {u.daysUntilExpiry} يوم
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper>
            <Box sx={{ p: 2, pb: 0 }}>
              <Typography variant="h6" fontWeight="bold">
                حسب الفئة
              </Typography>
              <Typography variant="caption" color="text.secondary">
                الأكثر إلحاحاً أولاً
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الفئة</TableCell>
                    <TableCell align="right">منتهٍ</TableCell>
                    <TableCell align="right">حرج</TableCell>
                    <TableCell align="right">تحذير</TableCell>
                    <TableCell align="right">إجمالي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {byCategory.slice(0, 10).map(c => (
                    <TableRow key={c.category} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {c.category}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>
                        {c.expired || 0}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        {c.critical || 0}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'info.main' }}>
                        {c.warning || 0}
                      </TableCell>
                      <TableCell align="right">{c.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {urgent > 0 && (
        <Box mt={3} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            مجموع الوثائق المعرّضة (منتهية + حرجة): <strong>{urgent}</strong> — تحتاج تخطيط تجديد
          </Typography>
        </Box>
      )}
    </Container>
  );
}
