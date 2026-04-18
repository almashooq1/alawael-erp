/**
 * AdminGovIntegrations — /admin/gov-integrations page.
 *
 * Control panel for Saudi government adapters: GOSI, SCFHS, Absher, Qiwa, Nafath.
 * Shows mode (mock/live), config status, allows test-connection + sample verify.
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Divider,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CableIcon from '@mui/icons-material/Cable';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SecurityIcon from '@mui/icons-material/Security';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../../services/api.client';

const PROVIDERS = [
  {
    key: 'gosi',
    name: 'GOSI — التأمينات الاجتماعية',
    desc: 'التحقق من حالة اشتراك الموظف في التأمينات',
    icon: <SecurityIcon />,
    color: '#1976d2',
    sampleInput: { kind: 'nationalId', label: 'رقم هوية تجريبي', hint: 'مثال: 1234567890' },
  },
  {
    key: 'scfhs',
    name: 'SCFHS — الهيئة السعودية للتخصصات الصحية',
    desc: 'التحقق من ترخيص المعالج / المختص الصحي',
    icon: <MedicalServicesIcon />,
    color: '#9c27b0',
    sampleInput: {
      kind: 'licenseNumber',
      label: 'رقم ترخيص تجريبي',
      hint: '12345 = نشط، 12340 = منتهٍ، 12349 = موقوف، 12999 = غير موجود',
    },
  },
  {
    key: 'absher',
    name: 'Absher / Yakeen — الأحوال المدنية',
    desc: 'مطابقة بيانات ولي الأمر مع السجل المدني',
    icon: <BadgeIcon />,
    color: '#2e7d32',
    sampleInput: {
      kind: 'nationalId',
      label: 'رقم هوية',
      hint: 'ينتهي بـ 00 = غير موجود، 77 = عدم تطابق',
    },
  },
  {
    key: 'qiwa',
    name: 'Qiwa — قوى (وزارة الموارد البشرية)',
    desc: 'حالة العقد + الامتثال لحماية الأجور (WPS)',
    icon: <WorkIcon />,
    color: '#ed6c02',
    sampleInput: {
      kind: 'nationalId',
      label: 'رقم هوية',
      hint: 'ينتهي بـ 55 = لا عقد، 66 = مخالفة WPS',
    },
  },
  {
    key: 'nafath',
    name: 'Nafath — الهوية الرقمية',
    desc: 'تسجيل الدخول الموحد للمواطنين والمقيمين',
    icon: <FingerprintIcon />,
    color: '#d32f2f',
    sampleInput: null,
  },
];

export default function AdminGovIntegrations() {
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});

  const [sampleDialog, setSampleDialog] = useState({
    open: false,
    provider: null,
    input: '',
    running: false,
    result: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const { data } = await api.get('/admin/gov-integrations/status');
      setStatus(data?.providers || {});
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runTest = async key => {
    setTesting(t => ({ ...t, [key]: true }));
    setTestResults(r => ({ ...r, [key]: null }));
    try {
      const { data } = await api.post(`/admin/gov-integrations/${key}/test-connection`);
      setTestResults(r => ({ ...r, [key]: data }));
    } catch (err) {
      setTestResults(r => ({
        ...r,
        [key]: { ok: false, error: err?.response?.data?.message || err?.message },
      }));
    } finally {
      setTesting(t => ({ ...t, [key]: false }));
    }
  };

  const openSample = provider => {
    setSampleDialog({
      open: true,
      provider,
      input: '',
      running: false,
      result: null,
    });
  };

  const runSample = async () => {
    const { provider, input } = sampleDialog;
    if (!provider || !input) return;
    setSampleDialog(d => ({ ...d, running: true, result: null }));
    try {
      const payload =
        provider.sampleInput?.kind === 'licenseNumber'
          ? { licenseNumber: input }
          : { nationalId: input };
      const { data } = await api.post(
        `/admin/gov-integrations/${provider.key}/verify-sample`,
        payload
      );
      setSampleDialog(d => ({ ...d, running: false, result: data.result }));
    } catch (err) {
      setSampleDialog(d => ({
        ...d,
        running: false,
        result: { error: err?.response?.data?.message || 'فشل' },
      }));
    }
  };

  const overall = useMemo(() => {
    const vals = Object.values(status);
    const total = vals.length;
    const live = vals.filter(v => v.mode === 'live').length;
    const configured = vals.filter(v => v.configured).length;
    const unconfigured = total - configured;
    return { total, live, configured, unconfigured };
  }, [status]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            التكاملات الحكومية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            GOSI · SCFHS · Absher · Qiwa · Nafath — الوضع الحالي، اختبار الاتصال، ومعاينة
            الاستجابات.
          </Typography>
        </Box>
        <IconButton onClick={load}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي المزودين', value: overall.total, color: 'primary.main' },
          { label: 'وضع Live', value: overall.live, color: 'success.main' },
          { label: 'مُكوَّنون', value: overall.configured, color: 'info.main' },
          { label: 'غير مُكوَّنين', value: overall.unconfigured, color: 'warning.main' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Stack spacing={2}>
        {PROVIDERS.map(p => {
          const cfg = status[p.key] || {};
          const test = testResults[p.key];
          const running = testing[p.key];
          return (
            <Paper key={p.key} sx={{ p: 2, borderRight: `4px solid ${p.color}` }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ color: p.color, fontSize: 36 }}>{p.icon}</Box>
                    <Box>
                      <Typography fontWeight={600}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.desc}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">
                    الوضع
                  </Typography>
                  <Box>
                    <Chip
                      size="small"
                      label={cfg.mode || '—'}
                      color={cfg.mode === 'live' ? 'success' : 'default'}
                      variant={cfg.mode === 'live' ? 'filled' : 'outlined'}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">
                    الإعدادات
                  </Typography>
                  <Box>
                    {cfg.configured ? (
                      <Chip
                        size="small"
                        icon={<CheckCircleIcon fontSize="small" />}
                        label="مُكوَّن"
                        color="success"
                      />
                    ) : (
                      <Chip
                        size="small"
                        icon={<ErrorOutlineIcon fontSize="small" />}
                        label="ناقص"
                        color="warning"
                      />
                    )}
                  </Box>
                  {cfg.missing?.length > 0 && (
                    <Typography
                      variant="caption"
                      color="warning.main"
                      sx={{ fontFamily: 'monospace', fontSize: 10, display: 'block', mt: 0.3 }}
                    >
                      {cfg.missing.join(', ')}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={3}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={running ? <CircularProgress size={14} /> : <CableIcon />}
                      onClick={() => runTest(p.key)}
                      disabled={running}
                    >
                      اختبار الاتصال
                    </Button>
                    {p.sampleInput && (
                      <Tooltip title="تشغيل تحقق تجريبي">
                        <span>
                          <IconButton size="small" color="primary" onClick={() => openSample(p)}>
                            <PlayArrowIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </Grid>
              </Grid>

              {test && (
                <Alert
                  severity={test.ok ? 'success' : 'warning'}
                  sx={{ mt: 2 }}
                  icon={test.ok ? <CheckCircleIcon /> : <WarningAmberIcon />}
                >
                  {test.ok
                    ? `اتصال ناجح · وضع ${test.mode}${test.latencyMs ? ` · ${test.latencyMs}ms` : ''}${
                        test.tokenLifetimeSec ? ` · token: ${test.tokenLifetimeSec}s` : ''
                      }${test.message ? ` · ${test.message}` : ''}`
                    : test.error || 'فشل الاتصال'}
                </Alert>
              )}

              {p.key === 'gosi' && cfg.circuit && cfg.circuit.open && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  دائرة الحماية (circuit breaker) مفتوحة — فشل متكرر. سيُعاد المحاولة بعد{' '}
                  {Math.ceil((cfg.circuit.cooldownRemainingMs || 0) / 1000)}s.
                </Alert>
              )}
            </Paper>
          );
        })}
      </Stack>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">دليل المتغيرات البيئية للإنتاج</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 2 }}>
            لتفعيل وضع Live لأي مزود: اضبط <code>{'{PROVIDER}_MODE=live'}</code> بالإضافة لبقية
            المتغيرات المُدرجة أدناه في ملف .env وأعد تشغيل الخادم.
          </Alert>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" fontWeight={600}>
                GOSI
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}
              >
                {`GOSI_MODE=live
GOSI_BASE_URL=https://api.gosi.gov.sa
GOSI_CLIENT_ID=...
GOSI_CLIENT_SECRET=...
GOSI_TIMEOUT_MS=8000
GOSI_MAX_FAILURES=5
GOSI_COOLDOWN_MS=120000`}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600}>
                SCFHS
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}
              >
                {`SCFHS_MODE=live
SCFHS_BASE_URL=...
SCFHS_API_KEY=...`}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600}>
                Absher / Yakeen
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}
              >
                {`ABSHER_MODE=live
ABSHER_BASE_URL=https://api.absher.sa
ABSHER_CLIENT_ID=...
ABSHER_CLIENT_SECRET=...`}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600}>
                Qiwa
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}
              >
                {`QIWA_MODE=live
QIWA_BASE_URL=https://api.qiwa.sa
QIWA_CLIENT_ID=...
QIWA_CLIENT_SECRET=...
QIWA_ESTABLISHMENT_ID=...`}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600}>
                Nafath
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}
              >
                {`NAFATH_MODE=live
NAFATH_BASE_URL=https://api.nafath.sa
NAFATH_APP_ID=...
NAFATH_SERVICE_ID=...
NAFATH_PRIVATE_KEY=<PEM>`}
              </Typography>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Sample verification dialog */}
      <Dialog
        open={sampleDialog.open}
        onClose={() =>
          !sampleDialog.running &&
          setSampleDialog({ open: false, provider: null, input: '', running: false, result: null })
        }
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>تحقق تجريبي — {sampleDialog.provider?.name}</DialogTitle>
        <DialogContent dividers>
          {sampleDialog.provider?.sampleInput && (
            <Stack spacing={2}>
              <TextField
                fullWidth
                autoFocus
                label={sampleDialog.provider.sampleInput.label}
                value={sampleDialog.input}
                onChange={e => setSampleDialog(d => ({ ...d, input: e.target.value }))}
                helperText={sampleDialog.provider.sampleInput.hint}
              />
              {sampleDialog.result && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  {sampleDialog.result.error ? (
                    <Alert severity="error">{sampleDialog.result.error}</Alert>
                  ) : (
                    <Box>
                      <Stack direction="row" spacing={1} mb={1}>
                        <Chip
                          size="small"
                          label={sampleDialog.result.status}
                          color={
                            sampleDialog.result.status === 'active' ||
                            sampleDialog.result.status === 'compliant' ||
                            sampleDialog.result.status === 'match'
                              ? 'success'
                              : sampleDialog.result.status === 'unknown'
                                ? 'warning'
                                : 'error'
                          }
                        />
                        <Chip
                          size="small"
                          label={`وضع: ${sampleDialog.result.mode}`}
                          variant="outlined"
                        />
                        {sampleDialog.result.latencyMs != null && (
                          <Chip
                            size="small"
                            label={`${sampleDialog.result.latencyMs}ms`}
                            variant="outlined"
                          />
                        )}
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap' }}
                      >
                        {JSON.stringify(sampleDialog.result, null, 2)}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setSampleDialog({
                open: false,
                provider: null,
                input: '',
                running: false,
                result: null,
              })
            }
            disabled={sampleDialog.running}
          >
            إغلاق
          </Button>
          <Button
            variant="contained"
            onClick={runSample}
            disabled={sampleDialog.running || !sampleDialog.input}
          >
            {sampleDialog.running ? <CircularProgress size={20} /> : 'تشغيل'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
