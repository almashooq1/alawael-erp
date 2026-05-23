/**
 * GovMetricsPage — Wave 314
 *
 * Operator dashboard for the W302/W309/W312 government-adapter counter family:
 *   - gov.adapter.consent       (provider × result)
 *   - gov.report.submission     (provider × result × [reason])
 *
 * Backend endpoint consumed:
 *   GET /api/risk-sweep/metrics   (W297) — returns { counters: snapshotGrouped() }
 *
 * Why this page exists:
 *   The raw `/metrics` JSON is intended for Prometheus + ops. This view is for
 *   compliance / operations supervisors who need to see, per provider:
 *     • how many consent checks were granted vs blocked (and which block reason)
 *     • how many monthly report submissions succeeded vs failed (and which reason)
 *   without spinning up Grafana.
 *
 * Counters are in-memory and reset on each backend boot, so this page is
 * intentionally a "since last restart" view; use Prometheus / OTel for history.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AssignmentIcon from '@mui/icons-material/Assignment';
import apiClient from '../../services/api.client';

const CONSENT_METRIC = 'gov.adapter.consent';
const SUBMISSION_METRIC = 'gov.report.submission';

const PROVIDER_LABEL_AR = {
  sehhaty: 'صحتي',
  mudad: 'مدد',
  disability_authority: 'هيئة رعاية الأشخاص ذوي الإعاقة',
};

const CONSENT_RESULT_COLOR = {
  granted: 'success',
  missing: 'warning',
  expired: 'error',
  revoked: 'error',
  invalid: 'error',
  failed: 'error',
};

const SUBMISSION_RESULT_COLOR = {
  ok: 'success',
  partial: 'warning',
  skipped: 'default',
  failed: 'error',
};

/**
 * Parses a composite label key produced by registry._labelsKey():
 *   "provider=mudad|reason=NO_PAYROLL|result=skipped"
 * into a plain object. Returns {} on malformed input.
 */
function parseLabelsKey(key) {
  if (!key || typeof key !== 'string') return {};
  const out = {};
  key.split('|').forEach(seg => {
    const eq = seg.indexOf('=');
    if (eq > 0) out[seg.slice(0, eq)] = seg.slice(eq + 1);
  });
  return out;
}

/**
 * Folds the registry snapshot into a per-provider summary structure:
 *   {
 *     [provider]: {
 *       consent:    { granted, missing, expired, ..., total },
 *       submission: { ok, partial, failed, skipped, total, reasons: { FAILED: { VALIDATION: 3 } } }
 *     }
 *   }
 */
function summarize(counters) {
  const out = {};
  const consentMap = counters?.[CONSENT_METRIC] || {};
  const subMap = counters?.[SUBMISSION_METRIC] || {};

  for (const [labelsKey, count] of Object.entries(consentMap)) {
    const labels = parseLabelsKey(labelsKey);
    const provider = labels.provider || 'unknown';
    const result = labels.result || 'unknown';
    out[provider] = out[provider] || {
      consent: { total: 0 },
      submission: { total: 0, reasons: {} },
    };
    out[provider].consent[result] = (out[provider].consent[result] || 0) + count;
    out[provider].consent.total += count;
  }

  for (const [labelsKey, count] of Object.entries(subMap)) {
    const labels = parseLabelsKey(labelsKey);
    const provider = labels.provider || 'unknown';
    const result = labels.result || 'unknown';
    const reason = labels.reason || null;
    out[provider] = out[provider] || {
      consent: { total: 0 },
      submission: { total: 0, reasons: {} },
    };
    out[provider].submission[result] = (out[provider].submission[result] || 0) + count;
    out[provider].submission.total += count;
    if (reason) {
      out[provider].submission.reasons[result] =
        out[provider].submission.reasons[result] || {};
      out[provider].submission.reasons[result][reason] =
        (out[provider].submission.reasons[result][reason] || 0) + count;
    }
  }

  return out;
}

export default function GovMetricsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [counters, setCounters] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/risk-sweep/metrics');
      setCounters(data?.counters || {});
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'تعذّر تحميل المؤشرات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => summarize(counters), [counters]);
  const providers = Object.keys(summary).sort();

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <VerifiedUserIcon color="primary" />
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
          مؤشرات تكاملات الجهات الحكومية
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

      <Alert severity="info" sx={{ mb: 2 }}>
        العدّادات داخل ذاكرة الخادم وتُصفَّر عند كل إعادة تشغيل. للحصول على تاريخ تراكمي
        استخدم Prometheus / Grafana على نفس المسار <code>/api/risk-sweep/metrics</code>.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && providers.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : providers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            لا توجد عدّادات مسجّلة بعد. يتم تسجيل العدّاد عند أول استدعاء حقيقي للمزوّد
            (W312).
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {providers.map(provider => {
            const { consent, submission } = summary[provider];
            return (
              <Grid item xs={12} md={6} key={provider}>
                <Card>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="h6">
                        {PROVIDER_LABEL_AR[provider] || provider}
                      </Typography>
                      <Chip
                        size="small"
                        label={provider}
                        sx={{ fontFamily: 'monospace' }}
                      />
                    </Stack>

                    {/* Consent block */}
                    <Box sx={{ mb: 2 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mb: 1 }}
                      >
                        <VerifiedUserIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          فحوصات الموافقة (Consent)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          الإجمالي: {consent.total}
                        </Typography>
                      </Stack>
                      {consent.total === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          لا توجد فحوصات مسجّلة.
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {Object.entries(consent)
                            .filter(([k]) => k !== 'total')
                            .map(([result, n]) => (
                              <Chip
                                key={result}
                                label={`${result}: ${n}`}
                                color={CONSENT_RESULT_COLOR[result] || 'default'}
                                size="small"
                              />
                            ))}
                        </Stack>
                      )}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Submission block */}
                    <Box>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mb: 1 }}
                      >
                        <AssignmentIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          إرسال التقارير الدورية
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          الإجمالي: {submission.total}
                        </Typography>
                      </Stack>
                      {submission.total === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          لم تُرسَل تقارير بعد.
                        </Typography>
                      ) : (
                        <>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mb: 1 }}
                          >
                            {Object.entries(submission)
                              .filter(([k]) => k !== 'total' && k !== 'reasons')
                              .map(([result, n]) => (
                                <Chip
                                  key={result}
                                  label={`${result}: ${n}`}
                                  color={SUBMISSION_RESULT_COLOR[result] || 'default'}
                                  size="small"
                                />
                              ))}
                          </Stack>
                          {Object.keys(submission.reasons).length > 0 && (
                            <TableContainer
                              component={Paper}
                              variant="outlined"
                              sx={{ mt: 1 }}
                            >
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>النتيجة</TableCell>
                                    <TableCell>السبب</TableCell>
                                    <TableCell align="right">العدد</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {Object.entries(submission.reasons).flatMap(
                                    ([result, reasonMap]) =>
                                      Object.entries(reasonMap).map(([reason, n]) => (
                                        <TableRow key={`${result}-${reason}`}>
                                          <TableCell>
                                            <Chip
                                              size="small"
                                              label={result}
                                              color={
                                                SUBMISSION_RESULT_COLOR[result] || 'default'
                                              }
                                            />
                                          </TableCell>
                                          <TableCell
                                            sx={{ fontFamily: 'monospace', fontSize: 12 }}
                                          >
                                            {reason}
                                          </TableCell>
                                          <TableCell align="right">{n}</TableCell>
                                        </TableRow>
                                      ))
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
