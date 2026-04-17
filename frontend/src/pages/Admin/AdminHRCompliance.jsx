/**
 * AdminHRCompliance — /admin/hr/compliance page.
 *
 * Unified view of employee compliance: GOSI (social insurance)
 * + SCFHS (health professional license). Per-row verify + batch verify.
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Divider,
  TextField,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SecurityIcon from '@mui/icons-material/Security';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PeopleIcon from '@mui/icons-material/People';
import CachedIcon from '@mui/icons-material/Cached';
import api from '../../services/api.client';

const GOSI_COLORS = {
  active: 'success',
  inactive: 'error',
  not_found: 'default',
  unknown: 'warning',
};
const GOSI_LABELS = {
  active: 'مسجَّل نشط',
  inactive: 'اشتراك موقوف',
  not_found: 'غير مسجَّل',
  unknown: 'غير محدّد',
};
const SCFHS_COLORS = {
  active: 'success',
  expired: 'error',
  suspended: 'error',
  not_found: 'default',
  unknown: 'warning',
};
const SCFHS_LABELS = {
  active: 'ترخيص نشط',
  expired: 'منتهٍ',
  suspended: 'موقوف',
  not_found: 'غير موجود',
  unknown: 'غير محدّد',
};

function fullName(x) {
  if (!x) return '';
  return x.firstName_ar || x.fullName || `${x.firstName || ''} ${x.lastName || ''}`.trim() || '';
}
function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

export default function AdminHRCompliance() {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [q, setQ] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [verifyingMap, setVerifyingMap] = useState({});
  const [detailEmp, setDetailEmp] = useState(null);
  const [batchDialog, setBatchDialog] = useState({ open: false, scope: 'both', running: false });
  const [batchResult, setBatchResult] = useState(null);

  const loadOverview = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/hr/compliance/overview');
      setOverview(data);
    } catch {
      setOverview(null);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const { data } = await api.get('/employees?limit=200');
      setEmployees(data?.items || data?.data || []);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحميل الموظفين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadEmployees();
  }, [loadOverview, loadEmployees]);

  const setVerifying = (id, kind, v) => setVerifyingMap(m => ({ ...m, [`${id}:${kind}`]: v }));

  const verifyOne = async (emp, kind) => {
    setVerifying(emp._id, kind, true);
    try {
      const path = kind === 'gosi' ? 'verify-gosi' : 'verify-scfhs';
      const { data } = await api.post(`/admin/hr/compliance/${emp._id}/${path}`, {});
      setEmployees(list =>
        list.map(x => (x._id === emp._id ? { ...x, [`${kind}_verification`]: data.data } : x))
      );
      loadOverview();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحقق');
    } finally {
      setVerifying(emp._id, kind, false);
    }
  };

  const runBatch = async () => {
    setBatchDialog(d => ({ ...d, running: true }));
    setBatchResult(null);
    try {
      const { data } = await api.post('/admin/hr/compliance/verify-batch', {
        scope: batchDialog.scope,
      });
      setBatchResult(data);
      loadOverview();
      loadEmployees();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحقق الجماعي');
    } finally {
      setBatchDialog(d => ({ ...d, running: false }));
    }
  };

  const filtered = useMemo(() => {
    const list = employees || [];
    if (!q.trim()) return list;
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return list.filter(
      e =>
        rx.test(fullName(e)) ||
        rx.test(e.email || '') ||
        rx.test(e.national_id || '') ||
        rx.test(e.scfhs_number || '')
    );
  }, [employees, q]);

  const statCards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        label: 'إجمالي الموظفين النشطين',
        value: overview.total || 0,
        icon: <PeopleIcon />,
        color: 'primary.main',
      },
      {
        label: 'GOSI نشط',
        value: overview.gosi?.active || 0,
        icon: <SecurityIcon />,
        color: 'success.main',
      },
      {
        label: 'GOSI غير مُتحقَّق',
        value: overview.gosi?.unverified || 0,
        icon: <WarningIcon />,
        color: 'warning.main',
      },
      {
        label: 'SCFHS منتهٍ/موقوف',
        value: overview.scfhs?.expiredOrSuspended || 0,
        icon: <ErrorOutlineIcon />,
        color: 'error.main',
      },
    ];
  }, [overview]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            الامتثال والتراخيص
          </Typography>
          <Typography variant="body2" color="text.secondary">
            التحقق من حالة GOSI (التأمينات) وSCFHS (الهيئة السعودية للتخصصات الصحية) للموظفين.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={() => {
              loadOverview();
              loadEmployees();
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<CachedIcon />}
            onClick={() => setBatchDialog({ open: true, scope: 'both', running: false })}
          >
            تحقق جماعي
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                      {s.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: s.color, fontSize: 36 }}>{s.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {overview?.expiringSoon?.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>{overview.expiringSoon.length} ترخيص SCFHS سينتهي خلال 90 يوماً</strong> — ابدأ
          التجديد مبكراً.
        </Alert>
      )}

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="بحث بالاسم / البريد / الهوية / رقم الترخيص..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الموظف</TableCell>
              <TableCell>الهوية</TableCell>
              <TableCell>رقم SCFHS</TableCell>
              <TableCell>حالة GOSI</TableCell>
              <TableCell>حالة SCFHS</TableCell>
              <TableCell>انتهاء الترخيص</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا يوجد موظفون مطابقون
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {filtered.map(e => {
              const g = e.gosi_verification;
              const s = e.scfhs_verification;
              const gKey = `${e._id}:gosi`;
              const sKey = `${e._id}:scfhs`;
              return (
                <TableRow key={e._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {fullName(e) || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {e.email || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{e.national_id || '—'}</TableCell>
                  <TableCell>{e.scfhs_number || '—'}</TableCell>
                  <TableCell>
                    {g?.verified ? (
                      <Stack spacing={0.3}>
                        <Chip
                          size="small"
                          label={GOSI_LABELS[g.status] || g.status}
                          color={GOSI_COLORS[g.status] || 'default'}
                          icon={
                            g.status === 'active' ? <VerifiedIcon fontSize="small" /> : undefined
                          }
                        />
                        {g.lastVerifiedAt && (
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(g.lastVerifiedAt)}
                          </Typography>
                        )}
                      </Stack>
                    ) : (
                      <Chip size="small" label="لم يتم التحقق" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    {s?.verified ? (
                      <Stack spacing={0.3}>
                        <Chip
                          size="small"
                          label={SCFHS_LABELS[s.status] || s.status}
                          color={SCFHS_COLORS[s.status] || 'default'}
                          icon={
                            s.status === 'active' ? <VerifiedIcon fontSize="small" /> : undefined
                          }
                        />
                        {s.classification && (
                          <Typography variant="caption" color="text.secondary">
                            {s.classification} {s.specialty ? `· ${s.specialty}` : ''}
                          </Typography>
                        )}
                      </Stack>
                    ) : e.scfhs_number ? (
                      <Chip size="small" label="لم يتم التحقق" variant="outlined" />
                    ) : (
                      <Chip size="small" label="لا ينطبق" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(s?.expiryDate || e.scfhs_expiry)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="تحقق من GOSI">
                      <span>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => verifyOne(e, 'gosi')}
                          disabled={verifyingMap[gKey] || !e.national_id}
                        >
                          {verifyingMap[gKey] ? (
                            <CircularProgress size={16} />
                          ) : (
                            <SecurityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="تحقق من SCFHS">
                      <span>
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => verifyOne(e, 'scfhs')}
                          disabled={verifyingMap[sKey] || !e.scfhs_number}
                        >
                          {verifyingMap[sKey] ? (
                            <CircularProgress size={16} />
                          ) : (
                            <MedicalServicesIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="التفاصيل">
                      <IconButton size="small" onClick={() => setDetailEmp(e)}>
                        <VerifiedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detail dialog */}
      <Dialog
        open={Boolean(detailEmp)}
        onClose={() => setDetailEmp(null)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>{fullName(detailEmp)}</DialogTitle>
        <DialogContent dividers>
          {detailEmp && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  <SecurityIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                  GOSI — التأمينات الاجتماعية
                </Typography>
                {detailEmp.gosi_verification?.verified ? (
                  <Stack spacing={0.5}>
                    <Chip
                      size="small"
                      label={GOSI_LABELS[detailEmp.gosi_verification.status]}
                      color={GOSI_COLORS[detailEmp.gosi_verification.status] || 'default'}
                      sx={{ alignSelf: 'flex-start' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      الوضع: {detailEmp.gosi_verification.employerName || '—'}
                    </Typography>
                    {detailEmp.gosi_verification.monthlyWage != null && (
                      <Typography variant="caption">
                        الراتب الشهري المسجَّل: {detailEmp.gosi_verification.monthlyWage} ر.س
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      آخر تحقق: {formatDate(detailEmp.gosi_verification.lastVerifiedAt)} · وضع:{' '}
                      {detailEmp.gosi_verification.mode}
                    </Typography>
                    {detailEmp.gosi_verification.message && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        {detailEmp.gosi_verification.message}
                      </Alert>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    لم يتم التحقق بعد.
                  </Typography>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  <MedicalServicesIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                  SCFHS — الهيئة السعودية للتخصصات الصحية
                </Typography>
                {detailEmp.scfhs_verification?.verified ? (
                  <Stack spacing={0.5}>
                    <Chip
                      size="small"
                      label={SCFHS_LABELS[detailEmp.scfhs_verification.status]}
                      color={SCFHS_COLORS[detailEmp.scfhs_verification.status] || 'default'}
                      sx={{ alignSelf: 'flex-start' }}
                    />
                    <Typography variant="caption">
                      التصنيف: {detailEmp.scfhs_verification.classification || '—'}
                    </Typography>
                    <Typography variant="caption">
                      التخصص: {detailEmp.scfhs_verification.specialty || '—'}
                    </Typography>
                    <Typography variant="caption">
                      رقم الترخيص: {detailEmp.scfhs_verification.licenseNumber || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      تاريخ الانتهاء: {formatDate(detailEmp.scfhs_verification.expiryDate)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      آخر تحقق: {formatDate(detailEmp.scfhs_verification.lastVerifiedAt)} · وضع:{' '}
                      {detailEmp.scfhs_verification.mode}
                    </Typography>
                    {detailEmp.scfhs_verification.message && (
                      <Alert
                        severity={
                          detailEmp.scfhs_verification.status === 'active' ? 'success' : 'warning'
                        }
                        sx={{ mt: 1 }}
                      >
                        {detailEmp.scfhs_verification.message}
                      </Alert>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {detailEmp.scfhs_number ? 'لم يتم التحقق بعد.' : 'لا يوجد رقم ترخيص مُدخَل.'}
                  </Typography>
                )}
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailEmp(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Batch dialog */}
      <Dialog
        open={batchDialog.open}
        onClose={() =>
          !batchDialog.running && setBatchDialog({ open: false, scope: 'both', running: false })
        }
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>تحقق جماعي</DialogTitle>
        <DialogContent dividers>
          {!batchResult ? (
            <Stack spacing={2}>
              <Alert severity="info">
                ستُفحَص حالة GOSI و/أو SCFHS لكل الموظفين النشطين. قد يستغرق هذا وقتاً.
              </Alert>
              <Stack direction="row" spacing={1}>
                {[
                  { value: 'both', label: 'GOSI + SCFHS' },
                  { value: 'gosi', label: 'GOSI فقط' },
                  { value: 'scfhs', label: 'SCFHS فقط' },
                ].map(opt => (
                  <Button
                    key={opt.value}
                    variant={batchDialog.scope === opt.value ? 'contained' : 'outlined'}
                    onClick={() => setBatchDialog(d => ({ ...d, scope: opt.value }))}
                    disabled={batchDialog.running}
                  >
                    {opt.label}
                  </Button>
                ))}
              </Stack>
              {batchDialog.running && (
                <>
                  <LinearProgress />
                  <Typography variant="caption" color="text.secondary">
                    جاري الفحص…
                  </Typography>
                </>
              )}
            </Stack>
          ) : (
            <Stack spacing={1}>
              <Alert severity="success">{batchResult.message}</Alert>
              <Typography variant="caption">
                إجمالي الموظفين: <strong>{batchResult.totalEmployees}</strong>
              </Typography>
              <Typography variant="caption">
                GOSI تم فحصه: <strong>{batchResult.gosiDone}</strong>
              </Typography>
              <Typography variant="caption">
                SCFHS تم فحصه: <strong>{batchResult.scfhsDone}</strong>
              </Typography>
              {batchResult.errors?.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="caption" color="error.main">
                    أخطاء: {batchResult.errors.length}
                  </Typography>
                  {batchResult.errors.slice(0, 5).map((e, i) => (
                    <Typography key={i} variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {e.kind}: {e.message}
                    </Typography>
                  ))}
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setBatchDialog({ open: false, scope: 'both', running: false });
              setBatchResult(null);
            }}
            disabled={batchDialog.running}
          >
            {batchResult ? 'إغلاق' : 'إلغاء'}
          </Button>
          {!batchResult && (
            <Button variant="contained" onClick={runBatch} disabled={batchDialog.running}>
              {batchDialog.running ? <CircularProgress size={20} /> : 'بدء الفحص'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
