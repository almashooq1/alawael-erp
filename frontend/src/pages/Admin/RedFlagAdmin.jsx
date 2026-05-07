/**
 * RedFlagAdmin.jsx — لوحة إدارة العلامات الحمراء (مستوى المنشأة)
 *
 * Backend: GET /api/v1/admin/red-flags/dashboard
 *          (red-flag-admin.routes.js → redFlagAggregateService)
 *
 * الوظائف:
 *   • ملخص إجمالي: العلامات النشطة + المانعة للجلسات + تجاوزات 7/30 يوم
 *   • توزيع حسب الخطورة: حرجة / تحذير / معلوماتية
 *   • توزيع حسب النطاق: سريري / سلوكي / تشغيلي / حضور / امتثال / أمان / عائلي / مالي
 *   • أعلى المستفيدين من حيث العلامات النشطة (Top 20)
 *
 * الأدوار المسموح بها: admin, super_admin, manager, quality_coordinator, compliance_officer
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Block as BlockIcon,
  Refresh as RefreshIcon,
  Flag as FlagIcon,
  CheckCircle as OkIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 16).replace('T', ' ');
  } catch {
    return String(v);
  }
}

const SEVERITY_LABELS = {
  critical: { label: 'حرجة', color: 'error' },
  warning: { label: 'تحذير', color: 'warning' },
  info: { label: 'معلوماتية', color: 'info' },
};

const DOMAIN_LABELS = {
  clinical: 'سريري',
  behavioral: 'سلوكي',
  operational: 'تشغيلي',
  attendance: 'حضور',
  compliance: 'امتثال',
  safety: 'أمان',
  family: 'عائلي',
  financial: 'مالي',
};

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color = 'text.primary', subtitle }) {
  return (
    <Paper elevation={1} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
      <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
      <Typography variant="h4" fontWeight={700} color={color}>
        {value ?? '—'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function RedFlagAdmin() {
  const { showSnackbar } = useSnackbar();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/admin/red-flags/dashboard');
      setData(res.data?.data ?? res.data);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'تعذّر تحميل البيانات';
      setError(msg);
      showSnackbar(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }} dir="rtl">
      {/* header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
        flexWrap="wrap"
        gap={1}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <FlagIcon color="error" sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={700}>
            لوحة العلامات الحمراء — مستوى المنشأة
          </Typography>
        </Stack>
        <Stack direction="row" gap={1} alignItems="center">
          {data?.generatedAt && (
            <Typography variant="caption" color="text.secondary">
              آخر تحديث: {fmtDate(data.generatedAt)}
            </Typography>
          )}
          <Tooltip title="تحديث البيانات">
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={load}
              disabled={loading}
            >
              تحديث
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {/* loading */}
      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {/* error */}
      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* content */}
      {!loading && data && (
        <Stack gap={3}>
          {/* ── KPI row ──────────────────────────────────────────────────── */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="علامات نشطة"
                value={data.totals?.active}
                icon={<FlagIcon />}
                color={data.totals?.active > 0 ? 'warning.main' : 'success.main'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="مانعة للجلسات"
                value={data.totals?.blocking}
                icon={<BlockIcon />}
                color={data.totals?.blocking > 0 ? 'error.main' : 'success.main'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="تجاوزات (7 أيام)"
                value={data.overrides?.last7d}
                icon={<WarningIcon />}
                subtitle="عمليات تجاوز يدوي"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="تجاوزات (30 يوماً)"
                value={data.overrides?.last30d}
                icon={<WarningIcon />}
                subtitle="عمليات تجاوز يدوي"
              />
            </Grid>
          </Grid>

          {/* ── zero-state ───────────────────────────────────────────────── */}
          {data.totals?.active === 0 && (
            <Paper
              elevation={0}
              sx={{ p: 3, textAlign: 'center', bgcolor: 'success.light', borderRadius: 2 }}
            >
              <OkIcon sx={{ fontSize: 40, color: 'success.dark', mb: 1 }} />
              <Typography color="success.dark" fontWeight={600}>
                لا توجد علامات حمراء نشطة في الوقت الحالي
              </Typography>
            </Paper>
          )}

          {data.totals?.active > 0 && (
            <>
              {/* ── by severity ──────────────────────────────────────────── */}
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  التوزيع حسب الخطورة
                </Typography>
                <Stack direction="row" gap={2} flexWrap="wrap">
                  {Object.entries(data.bySeverity ?? {}).map(([key, count]) => {
                    const meta = SEVERITY_LABELS[key] ?? { label: key, color: 'default' };
                    return (
                      <Chip
                        key={key}
                        label={`${meta.label}: ${count}`}
                        color={meta.color}
                        variant={count > 0 ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: '0.9rem', px: 1 }}
                      />
                    );
                  })}
                </Stack>
              </Paper>

              {/* ── by domain ────────────────────────────────────────────── */}
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  التوزيع حسب النطاق
                </Typography>
                <Grid container spacing={1}>
                  {Object.entries(data.byDomain ?? {}).map(([key, count]) => (
                    <Grid item key={key} xs={6} sm={4} md={3}>
                      <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          textAlign: 'center',
                          bgcolor: count > 0 ? 'warning.light' : 'background.default',
                        }}
                      >
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          color={count > 0 ? 'warning.dark' : 'text.disabled'}
                        >
                          {count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {DOMAIN_LABELS[key] ?? key}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              {/* ── top beneficiaries ────────────────────────────────────── */}
              {data.topBeneficiaries?.length > 0 && (
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    أعلى المستفيدين من حيث العلامات النشطة
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell align="right">
                            <strong>#</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>رقم المستفيد</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>إجمالي العلامات</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>حرجة</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>مانعة</strong>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.topBeneficiaries.map((row, idx) => (
                          <TableRow
                            key={row.beneficiaryId ?? idx}
                            hover
                            sx={{ bgcolor: row.blocking > 0 ? 'error.light' : undefined }}
                          >
                            <TableCell align="right">{idx + 1}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontFamily="monospace">
                                {row.beneficiaryId ?? '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip size="small" label={row.totalFlags} color="default" />
                            </TableCell>
                            <TableCell align="right">
                              {row.critical > 0 ? (
                                <Chip size="small" label={row.critical} color="error" />
                              ) : (
                                <Typography variant="body2" color="text.disabled">
                                  0
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {row.blocking > 0 ? (
                                <Chip
                                  size="small"
                                  label={row.blocking}
                                  color="error"
                                  variant="outlined"
                                  icon={<BlockIcon />}
                                />
                              ) : (
                                <Typography variant="body2" color="text.disabled">
                                  0
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </>
          )}
        </Stack>
      )}
    </Box>
  );
}
