/**
 * AdminIntegrationsOps — /admin/integrations-ops page.
 *
 * The "check this in the morning" page. Pulls together three already-
 * shipped subsystems into one glance-able ops dashboard:
 *
 *   • /api/health/integrations        — configured + circuit state + mock/live
 *   • /api/admin/gov-integrations/rate-limits — token-bucket utilization
 *   • /api/admin/adapter-audit/stats  — 30-day success rate + volume
 *
 * Produces a single overall verdict (ok / warn / fail) + a per-provider
 * matrix so operators can spot a drifting provider without opening three
 * other tabs.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedIcon from '@mui/icons-material/Verified';
import api from '../../services/api.client';
import { Link as RouterLink } from 'react-router-dom';

const POLL_MS = 20_000;
const PROVIDERS = [
  'gosi',
  'scfhs',
  'absher',
  'qiwa',
  'nafath',
  'fatoora',
  'muqeem',
  'nphies',
  'wasel',
  'balady',
];

function deriveRow({ health, rl, auditStats }) {
  // Merge the three snapshots keyed by provider into a flat row.
  const byProvider = {};
  PROVIDERS.forEach(p => {
    byProvider[p] = {
      provider: p,
      mode: 'unknown',
      configured: false,
      ok: false,
      circuitOpen: false,
      cooldownMs: 0,
      util: 0,
      available: 0,
      capacity: 0,
      actors: 0,
      calls30d: 0,
      successRate: null,
      avgLatencyMs: null,
    };
  });

  // health map: { [provider]: { mode, configured, ok, circuit } }
  const healthMap = health?.providers || {};
  Object.entries(healthMap).forEach(([k, h]) => {
    if (!byProvider[k]) return;
    byProvider[k].mode = h.mode;
    byProvider[k].configured = !!h.configured;
    byProvider[k].ok = !!h.ok;
    byProvider[k].circuitOpen = !!h.circuit?.open;
    byProvider[k].cooldownMs = h.circuit?.cooldownRemainingMs || 0;
  });

  // rate-limits array
  (rl?.providers || []).forEach(s => {
    const row = byProvider[s.provider];
    if (!row) return;
    row.util = s.utilization ?? 0;
    row.available = s.available;
    row.capacity = s.capacity;
    row.actors = s.activeActors;
  });

  // audit byProvider array
  (auditStats?.byProvider || []).forEach(a => {
    const row = byProvider[a.provider];
    if (!row) return;
    row.calls30d = a.count;
    row.successRate = a.successRate;
    row.avgLatencyMs = a.avgLatencyMs;
  });

  return Object.values(byProvider);
}

function rowSeverity(row) {
  if (!row.configured) return 'error';
  if (row.circuitOpen) return 'error';
  if (row.util >= 90) return 'error';
  if (row.successRate != null && row.successRate < 80) return 'error';
  if (row.util >= 70) return 'warning';
  if (row.successRate != null && row.successRate < 95) return 'warning';
  return 'success';
}

function severityIcon(sev) {
  if (sev === 'error') return <ErrorIcon color="error" fontSize="small" />;
  if (sev === 'warning') return <WarningAmberIcon color="warning" fontSize="small" />;
  return <CheckCircleIcon color="success" fontSize="small" />;
}

function OverallBanner({ rows }) {
  const errors = rows.filter(r => rowSeverity(r) === 'error');
  const warns = rows.filter(r => rowSeverity(r) === 'warning');
  if (errors.length > 0) {
    return (
      <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
        <strong>{errors.length}</strong> مزوّد يحتاج انتباه فوري
        {warns.length > 0 ? ` · ${warns.length} آخر بحاجة مراقبة` : ''} — تحقق من الجدول أدناه.
      </Alert>
    );
  }
  if (warns.length > 0) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>{warns.length}</strong> مزوّد بحاجة مراقبة — لا توجد مشاكل حرجة.
      </Alert>
    );
  }
  return (
    <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
      جميع التكاملات الحكومية ({rows.length}) تعمل ضمن الحدود الطبيعية.
    </Alert>
  );
}

function KpiCard({ label, value, subtle, icon, color = 'primary', href }) {
  const card = (
    <Card sx={{ height: '100%', '&:hover': href ? { boxShadow: 4 } : {} }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
              {value}
            </Typography>
            {subtle && (
              <Typography variant="caption" color="text.secondary">
                {subtle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color: `${color}.main`, opacity: 0.8 }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
  return href ? (
    <Box component={RouterLink} to={href} sx={{ textDecoration: 'none', display: 'block' }}>
      {card}
    </Box>
  ) : (
    card
  );
}

export default function AdminIntegrationsOps() {
  const [health, setHealth] = useState(null);
  const [rl, setRl] = useState(null);
  const [auditStats, setAuditStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = useCallback(async () => {
    try {
      const [h, r, a] = await Promise.all([
        api.get('/health/integrations'),
        api.get('/admin/gov-integrations/rate-limits'),
        api.get('/admin/adapter-audit/stats'),
      ]);
      setHealth(h.data);
      setRl(r.data);
      setAuditStats(a.data);
      setError('');
      setLastUpdate(new Date());
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'فشل تحميل لوحة العمليات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const rows = useMemo(() => deriveRow({ health, rl, auditStats }), [health, rl, auditStats]);

  const totals = useMemo(() => {
    const live = rows.filter(r => r.mode === 'live').length;
    const misconfigured = rows.filter(r => !r.configured).length;
    const circuitOpen = rows.filter(r => r.circuitOpen).length;
    const calls30d = rows.reduce((s, r) => s + (r.calls30d || 0), 0);
    const avgUtil = rows.length
      ? Math.round(rows.reduce((s, r) => s + (r.util || 0), 0) / rows.length)
      : 0;
    const avgSuccess = (() => {
      const withData = rows.filter(r => r.successRate != null);
      if (!withData.length) return null;
      return Math.round(withData.reduce((s, r) => s + r.successRate, 0) / withData.length);
    })();
    return { live, misconfigured, circuitOpen, calls30d, avgUtil, avgSuccess };
  }, [rows]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ElectricBoltIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>
              لوحة عمليات التكاملات الحكومية
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            نظرة موحَّدة: الحالة · حدود الاستخدام · سجل التدقيق (PDPL). تتحدّث تلقائيًا كل 20 ثانية.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
            </Typography>
          )}
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
            تحديث
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !health && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {health && (
        <>
          <OverallBanner rows={rows} />

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="مزوّد مُهيَّأ"
                value={`${rows.length - totals.misconfigured}/${rows.length}`}
                subtle={`${totals.live} منها في الوضع المباشر`}
                icon={<VerifiedIcon />}
                color={totals.misconfigured ? 'warning' : 'success'}
                href="/admin/gov-integrations"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="متوسط الاستخدام (Rate Limit)"
                value={`${totals.avgUtil}%`}
                subtle={totals.avgUtil >= 70 ? 'ضغط مرتفع — راقب عن كثب' : 'ضمن الحدود الطبيعية'}
                icon={<SpeedIcon />}
                color={
                  totals.avgUtil >= 90 ? 'error' : totals.avgUtil >= 70 ? 'warning' : 'success'
                }
                href="/admin/rate-limits"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="نسبة النجاح (30 يومًا)"
                value={totals.avgSuccess != null ? `${totals.avgSuccess}%` : '—'}
                subtle={`${totals.calls30d.toLocaleString('ar-SA')} استدعاء إجمالي`}
                icon={<SecurityIcon />}
                color={
                  totals.avgSuccess == null
                    ? 'primary'
                    : totals.avgSuccess < 80
                      ? 'error'
                      : totals.avgSuccess < 95
                        ? 'warning'
                        : 'success'
                }
                href="/admin/adapter-audit"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard
                label="دوائر الحماية المفتوحة"
                value={totals.circuitOpen}
                subtle={
                  totals.circuitOpen === 0 ? 'لا توجد انقطاعات حاليًا' : 'مزوّدون خارج الخدمة'
                }
                icon={<ElectricBoltIcon />}
                color={totals.circuitOpen ? 'error' : 'success'}
              />
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                مصفوفة المزودين
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={40} />
                      <TableCell>المزوّد</TableCell>
                      <TableCell>الوضع</TableCell>
                      <TableCell>مُهيَّأ</TableCell>
                      <TableCell>
                        <Tooltip title="حالة دائرة الحماية (circuit breaker)">
                          <Box component="span">الدائرة</Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>استخدام الحد</TableCell>
                      <TableCell align="center">فاعلون</TableCell>
                      <TableCell align="center">30-يومًا</TableCell>
                      <TableCell align="center">النجاح</TableCell>
                      <TableCell align="center">زمن متوسط (ms)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map(r => {
                      const sev = rowSeverity(r);
                      return (
                        <TableRow key={r.provider} hover>
                          <TableCell>{severityIcon(sev)}</TableCell>
                          <TableCell>
                            <Typography fontWeight={600} textTransform="uppercase">
                              {r.provider}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.mode}
                              color={r.mode === 'live' ? 'error' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {r.configured ? (
                              <Chip size="small" label="نعم" color="success" variant="outlined" />
                            ) : (
                              <Chip size="small" label="ناقص" color="error" />
                            )}
                          </TableCell>
                          <TableCell>
                            {r.circuitOpen ? (
                              <Chip
                                size="small"
                                icon={<ErrorIcon />}
                                label={`مفتوحة · ${Math.ceil(r.cooldownMs / 1000)}s`}
                                color="error"
                              />
                            ) : (
                              <Chip size="small" label="سليمة" color="success" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell sx={{ minWidth: 150 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ flex: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(100, r.util)}
                                  color={
                                    r.util >= 90 ? 'error' : r.util >= 70 ? 'warning' : 'success'
                                  }
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Box>
                              <Typography variant="caption" fontWeight={600}>
                                {r.util}%
                              </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {r.available}/{r.capacity}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{r.actors}</TableCell>
                          <TableCell align="center">
                            {r.calls30d?.toLocaleString('ar-SA') || 0}
                          </TableCell>
                          <TableCell align="center">
                            {r.successRate != null ? (
                              <Chip
                                size="small"
                                label={`${r.successRate}%`}
                                color={
                                  r.successRate >= 95
                                    ? 'success'
                                    : r.successRate >= 80
                                      ? 'warning'
                                      : 'error'
                                }
                                variant="outlined"
                              />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell align="center">{r.avgLatencyMs ?? '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  component={RouterLink}
                  to="/admin/gov-integrations"
                  size="small"
                  variant="outlined"
                >
                  لوحة تحكم المزودين
                </Button>
                <Button
                  component={RouterLink}
                  to="/admin/rate-limits"
                  size="small"
                  variant="outlined"
                >
                  حدود الاستخدام
                </Button>
                <Button
                  component={RouterLink}
                  to="/admin/adapter-audit"
                  size="small"
                  variant="outlined"
                >
                  سجل التدقيق (PDPL)
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  );
}
