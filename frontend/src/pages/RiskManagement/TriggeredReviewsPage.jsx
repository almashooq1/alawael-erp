/**
 * TriggeredReviewsPage — Wave 301
 *
 * Operational dashboard for CRITICAL PlanReviews opened automatically by
 * the W290 risk auto-trigger. Tier-1 read; tier-2 acknowledgement.
 *
 * Backend endpoints consumed (mounted under /api/v1):
 *   GET  /risk-sweep/triggered-reviews                (W291)
 *   POST /risk-sweep/triggered-reviews/:id/acknowledge (W292)
 *   GET  /risk-sweep/triggered-reviews/:id/audit       (W295) — via dialog
 *   GET  /risk-sweep/metrics                           (W297)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import apiClient from '../../services/api.client';
import AuditTrailDialog from '../../components/risk/AuditTrailDialog';

const SLA_LEVEL_AR = {
  0: { label: 'ضمن الزمن', color: 'success' },
  1: { label: 'تنبيه 24س', color: 'warning' },
  2: { label: 'حرج 48س', color: 'error' },
};

function relativeAge(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'منذ أقل من ساعة';
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

export default function TriggeredReviewsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [days, setDays] = useState(7);
  const [auditOpen, setAuditOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [ackBusy, setAckBusy] = useState(null); // id currently being acked
  const [metrics, setMetrics] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/risk-sweep/triggered-reviews', {
        params: { days },
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total || 0);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 503) setError('الخدمة غير مهيأة على الخادم.');
      else if (status === 403) setError('تحتاج صلاحية للوصول.');
      else setError('تعذّر تحميل المراجعات.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  const loadMetrics = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/risk-sweep/metrics');
      setMetrics(data?.counters || null);
    } catch {
      setMetrics(null);
    }
  }, []);

  useEffect(() => {
    load();
    loadMetrics();
  }, [load, loadMetrics]);

  const onAck = async id => {
    setAckBusy(id);
    try {
      await apiClient.post(`/risk-sweep/triggered-reviews/${id}/acknowledge`);
      await load();
      await loadMetrics();
    } catch (err) {
      const code = err?.response?.data?.code;
      setError(`تعذّر تأكيد المراجعة${code ? ` (${code})` : ''}.`);
    } finally {
      setAckBusy(null);
    }
  };

  const openAudit = id => {
    setSelectedId(id);
    setAuditOpen(true);
  };

  const renderMetricsCard = () => {
    if (!metrics) return null;
    const get = (name, label) => {
      const series = metrics[name] || {};
      const sum = Object.values(series).reduce((a, b) => a + (b || 0), 0);
      return { label, sum };
    };
    const tiles = [
      get('risk.plan_review.audit.appended', 'قيود سلسلة التدقيق'),
      get('risk.alert.backlink.attempted', 'محاولات ربط التنبيهات'),
      get('risk.plan_review.audit.verified', 'عمليات تحقق السلسلة'),
    ];
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            مؤشرات تشغيلية (W297)
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            {tiles.map(t => (
              <Box key={t.label} sx={{ minWidth: 140 }}>
                <Typography variant="h5">{t.sum}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5">المراجعات الحرجة المُنشأة تلقائياً</Typography>
          <Typography variant="body2" color="text.secondary">
            مراجعات خطة العلاج التي أُنشئت من قبل ماسح المخاطر — المجموع:{' '}
            <strong>{total}</strong>
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            label="النطاق"
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value={1}>آخر يوم</MenuItem>
            <MenuItem value={7}>آخر 7 أيام</MenuItem>
            <MenuItem value={30}>آخر 30 يوم</MenuItem>
            <MenuItem value={90}>آخر 90 يوم</MenuItem>
          </TextField>
          <Tooltip title="تحديث">
            <IconButton onClick={load} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {renderMetricsCard()}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>المستفيد</TableCell>
              <TableCell>الفرع</TableCell>
              <TableCell>أُنشئت</TableCell>
              <TableCell>SLA</TableCell>
              <TableCell>التنبيه المصدر</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد مراجعات في هذا النطاق.</Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              items.map(it => {
                const sla = SLA_LEVEL_AR[it.slaEscalationLevel ?? 0] || SLA_LEVEL_AR[0];
                const acked = !!it.acknowledgedAt;
                return (
                  <TableRow key={it._id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {it.beneficiary?.fullName || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {it.beneficiary?.mrn || ''}
                      </Typography>
                    </TableCell>
                    <TableCell>{it.beneficiary?.branchId || '—'}</TableCell>
                    <TableCell>
                      <Tooltip title={new Date(it.createdAt).toLocaleString('ar-SA')}>
                        <span>{relativeAge(it.createdAt)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={sla.label} color={sla.color} />
                    </TableCell>
                    <TableCell>
                      {it.linkedAlert?.data?.code ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={it.linkedAlert.data.code}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {acked ? (
                        <Chip
                          size="small"
                          color="success"
                          icon={<CheckCircleIcon />}
                          label="مؤكَّدة"
                        />
                      ) : (
                        <Chip size="small" color="default" label="بانتظار التأكيد" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="عرض سلسلة التدقيق">
                          <IconButton size="small" onClick={() => openAudit(it._id)}>
                            <VerifiedUserIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!acked && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => onAck(it._id)}
                            disabled={ackBusy === it._id}
                          >
                            {ackBusy === it._id ? '...' : 'تأكيد'}
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      <AuditTrailDialog
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        planReviewId={selectedId}
      />
    </Box>
  );
}
