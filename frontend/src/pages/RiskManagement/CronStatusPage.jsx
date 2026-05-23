/**
 * CronStatusPage — Wave 310
 *
 * Operator overview of registered schedulers + their ENABLE_* env-gate state.
 *
 * Backend endpoint consumed:
 *   GET /api/ops/schedulers  (W310)
 *
 * Status semantics:
 *   • enabled=true  → green chip "مُفعّل"  (env flag is on)
 *   • enabled=false → grey chip "موقوف"    (env flag is off / unset)
 *
 * The "نشط مؤخراً" indicator is reserved for a follow-up that cross-references
 * the W302 Prometheus counters; this wave ships the read-only static view.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
import ScheduleIcon from '@mui/icons-material/Schedule';
import apiClient from '../../services/api.client';

export default function CronStatusPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, enabled: 0 });
  const [generatedAt, setGeneratedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/ops/schedulers');
      setItems(Array.isArray(data.items) ? data.items : []);
      setSummary({ total: data.total || 0, enabled: data.enabled || 0 });
      setGeneratedAt(data.generatedAt || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'تعذّر تحميل حالة المجدولات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <ScheduleIcon color="primary" />
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
          حالة المجدولات (Cron)
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={load}
          disabled={loading}
        >
          تحديث
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Card sx={{ minWidth: 160 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              إجمالي المجدولات
            </Typography>
            <Typography variant="h4">{summary.total}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 160 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              المُفعّل حالياً
            </Typography>
            <Typography variant="h4" color="success.main">
              {summary.enabled}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 160 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              الموقوف
            </Typography>
            <Typography variant="h4" color="text.disabled">
              {summary.total - summary.enabled}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && items.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>المُجدوِل</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>آخر تنفيذ</TableCell>
                <TableCell>متغير البيئة</TableCell>
                <TableCell>الجدول</TableCell>
                <TableCell>ملاحظات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.key} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {item.nameAr}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.nameEn}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {item.enabled ? (
                      <Chip label="مُفعّل" color="success" size="small" />
                    ) : (
                      <Chip label="موقوف" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {item.liveStatus ? (
                      <Stack spacing={0.5}>
                        <Chip
                          size="small"
                          label={
                            item.liveStatus.lastStatus === 'ok'
                              ? `نجح (${item.liveStatus.lastDurationMs ?? '?'}ms)`
                              : item.liveStatus.lastStatus === 'failed'
                              ? 'فشل'
                              : 'لم يُنفّذ بعد'
                          }
                          color={
                            item.liveStatus.lastStatus === 'ok'
                              ? 'success'
                              : item.liveStatus.lastStatus === 'failed'
                              ? 'error'
                              : 'default'
                          }
                        />
                        {item.liveStatus.lastRunAt && (
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.liveStatus.lastRunAt).toLocaleString('ar-SA')}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          مرّات: {item.liveStatus.runs} | إخفاقات: {item.liveStatus.failures}
                        </Typography>
                        {item.liveStatus.lastError && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ fontFamily: 'monospace', maxWidth: 240, display: 'block' }}
                          >
                            {item.liveStatus.lastError}
                          </Typography>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        غير مُسجّل
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {item.envFlag}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {item.defaults?.schedule || '—'}
                    </Typography>
                    {Array.isArray(item.defaults?.branches) &&
                      item.defaults.branches.length > 0 && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          الفروع: {item.defaults.branches.join(', ')}
                        </Typography>
                      )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {item.notes}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      لا توجد مجدولات مسجّلة
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {generatedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          آخر تحديث: {new Date(generatedAt).toLocaleString('ar-SA')}
        </Typography>
      )}
    </Box>
  );
}
