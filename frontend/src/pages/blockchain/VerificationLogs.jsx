/**
 * Verification Logs — سجل عمليات التحقق
 *
 * Audit-trail UI on top of /api/blockchain/logs. Admins can:
 *   • Filter by result (valid/revoked/expired/invalid/not_found)
 *   • Filter by method (qr_scan/manual_lookup/api_call/blockchain_verify)
 *   • Filter by date range + cert number
 *   • See aggregated counts in the header
 *
 * The /verify endpoint records IP + UserAgent for every public scan, so this
 * page is also where you'd spot scraping/abuse on a public cert.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  History as HistoryIcon,
  Refresh as RefreshIcon,
  FilterAlt as FilterIcon,
} from '@mui/icons-material';
import { verificationService } from '../../services/blockchainService';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import logger from '../../utils/logger';

const RESULT_LABELS = {
  valid: { ar: 'صحيحة', color: 'success' },
  revoked: { ar: 'ملغاة', color: 'error' },
  expired: { ar: 'منتهية', color: 'warning' },
  invalid: { ar: 'غير صالحة', color: 'error' },
  not_found: { ar: 'غير موجودة', color: 'default' },
};

const METHOD_LABELS = {
  qr_scan: 'مسح QR',
  manual_lookup: 'بحث يدوي',
  api_call: 'API',
  blockchain_verify: 'بلوكتشين',
};

function fmtDateTime(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('ar-SA-u-ca-gregory', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return String(d);
  }
}

export default function VerificationLogs() {
  const [filters, setFilters] = useState({
    result: '',
    method: '',
    certificateNumber: '',
    from: '',
    to: '',
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], pagination: {}, stats: {} });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const r = await verificationService.getAllLogs(params);
      setData({
        data: Array.isArray(r.data) ? r.data : [],
        pagination: r.pagination || {},
        stats: r.stats || {},
      });
    } catch (err) {
      logger.error('VerificationLogs load', err);
      setData({ data: [], pagination: {}, stats: {} });
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const onFilter = (k, v) => {
    setPage(1);
    setFilters(f => ({ ...f, [k]: v }));
  };

  const resultBuckets = useMemo(() => {
    const map = new Map((data.stats?.byResult || []).map(b => [b._id, b.count]));
    return Object.keys(RESULT_LABELS).map(k => ({
      key: k,
      label: RESULT_LABELS[k].ar,
      color: RESULT_LABELS[k].color,
      count: map.get(k) || 0,
    }));
  }, [data.stats]);

  return (
    <Box sx={{ p: 3, maxWidth: 1280, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <HistoryIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              سجل التحقق
            </Typography>
            <Typography variant="body2" color="text.secondary">
              كل عملية تحقق من شهادة (QR · يدوي · API)
            </Typography>
          </Box>
        </Stack>
        <Tooltip title="تحديث">
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Stats strip */}
      <Grid container spacing={1.5} mb={2}>
        {resultBuckets.map(b => (
          <Grid item xs={6} sm={2.4} key={b.key}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                bgcolor: filters.result === b.key ? 'action.selected' : undefined,
              }}
              onClick={() => onFilter('result', filters.result === b.key ? '' : b.key)}
            >
              <Typography variant="caption" color="text.secondary">
                {b.label}
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {b.count}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
      >
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <FilterIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={700}>
            تصفية
          </Typography>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="رقم الشهادة"
              value={filters.certificateNumber}
              onChange={e => onFilter('certificateNumber', e.target.value)}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="الطريقة"
              value={filters.method}
              onChange={e => onFilter('method', e.target.value)}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              type="date"
              fullWidth
              size="small"
              label="من"
              InputLabelProps={{ shrink: true }}
              value={filters.from}
              onChange={e => onFilter('from', e.target.value)}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              type="date"
              fullWidth
              size="small"
              label="إلى"
              InputLabelProps={{ shrink: true }}
              value={filters.to}
              onChange={e => onFilter('to', e.target.value)}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <Chip
              label={`${data.pagination.total ?? 0} سجل`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
      >
        {loading ? (
          <Box display="flex" justifyContent="center" p={6}>
            <CircularProgress />
          </Box>
        ) : data.data.length === 0 ? (
          <EmptyState title="لا توجد سجلات مطابقة" height={200} />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  {['التاريخ', 'الشهادة', 'الطريقة', 'النتيجة', 'تطابق الهاش', 'IP', 'المتصفح'].map(
                    h => (
                      <TableCell
                        key={h}
                        sx={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                      >
                        {h}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map(log => (
                  <TableRow key={log._id} hover>
                    <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {fmtDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {log.certificateNumber || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={METHOD_LABELS[log.method] || log.method} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={RESULT_LABELS[log.result]?.ar || log.result}
                        color={RESULT_LABELS[log.result]?.color || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {log.hashMatch === true && <Chip size="small" color="success" label="✓" />}
                      {log.hashMatch === false && <Chip size="small" color="error" label="✕" />}
                      {log.hashMatch === undefined && '—'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {log.verifiedBy?.ip || '—'}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: 11,
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.verifiedBy?.userAgent?.slice(0, 50) || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {data.pagination.pages > 1 && (
          <Box display="flex" justifyContent="center" py={2}>
            <Pagination
              count={data.pagination.pages}
              page={page}
              onChange={(_, p) => setPage(p)}
              size="small"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
