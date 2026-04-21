/**
 * AdminOnboarding — /admin/onboarding page.
 * HR dashboard: checklist status + bottleneck tasks + stalled hires.
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import api from '../../services/api.client';

const STATUS_COLORS = {
  pending: 'default',
  in_progress: 'primary',
  completed: 'success',
};
const STATUS_LABELS = {
  pending: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
};
const RESPONSIBLE_LABELS = {
  hr: 'الموارد البشرية',
  it: 'تقنية المعلومات',
  manager: 'المدير المباشر',
  payroll: 'الرواتب',
  employee: 'الموظف',
};

function completionColor(rate) {
  if (rate == null) return 'text.secondary';
  if (rate >= 85) return 'success.main';
  if (rate < 50) return 'error.main';
  return 'warning.main';
}

export default function AdminOnboarding() {
  const [overview, setOverview] = useState(null);
  const [byStatus, setByStatus] = useState([]);
  const [taskCompletion, setTaskCompletion] = useState([]);
  const [byResponsible, setByResponsible] = useState([]);
  const [stalled, setStalled] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, bs, tc, br, st] = await Promise.all([
        api.get('/admin/onboarding/overview'),
        api.get('/admin/onboarding/by-status'),
        api.get('/admin/onboarding/task-completion'),
        api.get('/admin/onboarding/by-responsible'),
        api.get('/admin/onboarding/stalled?limit=25'),
      ]);
      setOverview(ov.data || null);
      setByStatus(bs.data?.items || []);
      setTaskCompletion(tc.data?.items || []);
      setByResponsible(br.data?.items || []);
      setStalled(st.data?.items || []);
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
  const alarm = overview?.alarm || {};
  const thresholds = overview?.thresholds || {};

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            إعداد الموظفين الجدد
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تتبّع قوائم إعداد الموظفين الجدد، اكتشاف المهام المُعطِّلة، ومعرفة من يعرقل العملية (HR
            / IT / مدير / رواتب).
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
            href="/api/admin/onboarding/export.csv"
            target="_blank"
            rel="noopener"
          >
            تصدير المتعثّرين
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {alarm.active && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          تحذير: {alarm.stalledCount} قائمة إعداد متعثّرة (تجاوزت موعد الإكمال + {alarm.graceDays}{' '}
          يوم مهلة). تجاوزت العتبة {alarm.threshold}.
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                إجمالي
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {summary.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                قيد التنفيذ
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {summary.byStatus?.in_progress || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                متعثّر
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={summary.stalledCount > 0 ? 'error.main' : 'success.main'}
              >
                {summary.stalledCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                بعد مهلة {thresholds.graceDays} يوم
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                متوسط أيام الإكمال
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {summary.avgCompletionDays != null ? `${summary.avgCompletionDays} يوم` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                من {summary.byStatus?.completed || 0} قائمة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label={`المتعثّرة (${stalled.length})`} />
          <Tab label={`المهام المُعطِّلة (${taskCompletion.length})`} />
          <Tab label={`حسب المسؤول (${byResponsible.length})`} />
        </Tabs>

        {tab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>معرّف</TableCell>
                  <TableCell>تاريخ البدء</TableCell>
                  <TableCell>موعد الإكمال</TableCell>
                  <TableCell align="right">أيام التأخير</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell align="right">الإنجاز</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stalled.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="success.main" py={2}>
                        لا توجد قوائم متعثّرة — ممتاز
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {stalled.map(r => (
                  <TableRow key={r._id} hover>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {r.uuid?.slice(0, 8) || r._id?.toString().slice(-6)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell>
                      {r.targetCompletionDate
                        ? new Date(r.targetCompletionDate).toISOString().slice(0, 10)
                        : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                      +{r.daysLate}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={STATUS_LABELS[r.status] || r.status}
                        color={STATUS_COLORS[r.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {r.completedTasks}/{r.totalTasks} ({r.completionPercentage}%)
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 1 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المهمة</TableCell>
                  <TableCell align="right">إجمالي</TableCell>
                  <TableCell align="right">مكتمل</TableCell>
                  <TableCell align="right">قيد الانتظار</TableCell>
                  <TableCell align="right">نسبة الإكمال</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {taskCompletion.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" py={2}>
                        لا توجد مهام بعد
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {taskCompletion.slice(0, 25).map(r => (
                  <TableRow key={r.title} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {r.title}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{r.total}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {r.completed}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'warning.main' }}>
                      {r.pending}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, color: completionColor(r.completionRate) }}
                    >
                      {r.completionRate != null ? `${r.completionRate}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 2 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المسؤول</TableCell>
                  <TableCell align="right">إجمالي المهام</TableCell>
                  <TableCell align="right">مكتمل</TableCell>
                  <TableCell align="right">قيد الانتظار</TableCell>
                  <TableCell align="right">نسبة الإكمال</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {byResponsible.map(r => (
                  <TableRow key={r.responsible} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {RESPONSIBLE_LABELS[r.responsible] || r.responsible}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{r.total}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {r.completed}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'warning.main' }}>
                      {r.pending}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, color: completionColor(r.completionRate) }}
                    >
                      {r.completionRate != null ? `${r.completionRate}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}
