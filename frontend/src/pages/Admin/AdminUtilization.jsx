/**
 * AdminUtilization — /admin/utilization page.
 * Therapist productivity leaderboard + per-therapist stats.
 */

import { useCallback, useEffect, useState } from 'react';
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
import api from '../../services/api.client';

export default function AdminUtilization() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/utilization');
      setItems(data?.items || []);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const aggregate = items.reduce(
    (a, r) => ({
      totalSessions: a.totalSessions + (r.sessionsScheduled || 0),
      totalBillable: a.totalBillable + (r.billableMinutes || 0),
      totalNoShows: a.totalNoShows + (r.noShowsOnCaseload || 0),
    }),
    { totalSessions: 0, totalBillable: 0, totalNoShows: 0 }
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            إنتاجية المعالجين
          </Typography>
          <Typography variant="body2" color="text.secondary">
            آخر 30 يوماً — جلسات مجدولة + دقائق قابلة للفوترة + نسبة الإنجاز + معدل الاستخدام.
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
            href="/api/admin/utilization/export.csv"
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
                إجمالي المعالجين
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {items.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                إجمالي الجلسات
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {aggregate.totalSessions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                ساعات قابلة للفوترة
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {Math.round(aggregate.totalBillable / 60)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                إجمالي No-shows
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {aggregate.totalNoShows}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>المعالج</TableCell>
              <TableCell align="right">جلسات مجدولة</TableCell>
              <TableCell align="right">مكتملة</TableCell>
              <TableCell align="right">دقائق للفوترة</TableCell>
              <TableCell align="right">No-shows</TableCell>
              <TableCell align="right">مستفيدون</TableCell>
              <TableCell align="right">نسبة الإنجاز</TableCell>
              <TableCell align="right">الاستخدام</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد بيانات
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map(r => (
              <TableRow key={r.therapistId} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {r.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.employeeCode || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">{r.sessionsScheduled}</TableCell>
                <TableCell align="right">{r.sessionsCompleted}</TableCell>
                <TableCell align="right">{r.billableMinutes}</TableCell>
                <TableCell
                  align="right"
                  sx={{ color: r.noShowsOnCaseload > 0 ? 'error.main' : 'inherit' }}
                >
                  {r.noShowsOnCaseload}
                </TableCell>
                <TableCell align="right">{r.uniqueBeneficiaries}</TableCell>
                <TableCell align="right">
                  {r.completionRate != null ? `${r.completionRate}%` : '—'}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color:
                      r.utilizationRate >= 80
                        ? 'success.main'
                        : r.utilizationRate < 50
                          ? 'warning.main'
                          : 'inherit',
                    fontWeight: 500,
                  }}
                >
                  {r.utilizationRate != null ? `${r.utilizationRate}%` : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
