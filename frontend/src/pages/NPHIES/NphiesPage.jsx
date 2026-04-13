/**
 * NPHIES Dashboard — المنصة الوطنية لتبادل المعلومات الصحية والتأمينية
 *
 * HL7 FHIR R4 Integration:
 * - التحقق من أهلية التأمين (Eligibility)
 * - تقديم المطالبات (Claims)
 * - الموافقة المسبقة (Prior Authorization)
 * - متابعة حالة المطالبات (Claim Status)
 */
import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Tabs, Tab, Chip, Divider, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, MenuItem,
} from '@mui/material';
import {
  HealthAndSafety as NphiesIcon,
  Verified as EligibilityIcon,
  RequestPage as ClaimIcon,
  Assignment as AuthIcon,
  Search as SearchIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API = axios.create({ baseURL: '/api/nphies', withCredentials: true });

const CLAIM_TEMPLATE = {
  patientId: '',
  patientName: '',
  patientDob: '',
  payerId: '',
  payerName: '',
  providerId: '',
  diagnosisCodes: [''],
  serviceDate: new Date().toISOString().split('T')[0],
  services: [{ code: '', description: '', quantity: 1, unitPrice: 0 }],
  claimType: 'professional',
};

const ClaimStatusChip = ({ status: s }) => {
  const map = {
    queued: { label: 'في الانتظار', color: 'default' },
    active: { label: 'نشط', color: 'primary' },
    cancelled: { label: 'ملغي', color: 'error' },
    'entered-in-error': { label: 'خطأ في الإدخال', color: 'error' },
    complete: { label: 'مكتمل', color: 'success' },
    approved: { label: 'مقبول', color: 'success' },
    rejected: { label: 'مرفوض', color: 'error' },
    partial: { label: 'موافقة جزئية', color: 'warning' },
  };
  const cfg = map[s] || { label: s || '—', color: 'default' };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
};

export default function NphiesPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ── أهلية التأمين ──
  const [eligibilityForm, setEligibilityForm] = useState({
    patientId: '', patientName: '', patientDob: '',
    memberId: '', payerId: '', payerName: '',
    serviceDate: new Date().toISOString().split('T')[0],
  });
  const [eligibilityResult, setEligibilityResult] = useState(null);

  // ── تقديم مطالبة ──
  const [claim, setClaim] = useState(CLAIM_TEMPLATE);
  const [claimResult, setClaimResult] = useState(null);

  // ── موافقة مسبقة ──
  const [authForm, setAuthForm] = useState({
    patientId: '', patientName: '',
    payerId: '', payerName: '',
    diagnosisCodes: [''],
    requestedServices: [{ code: '', description: '', quantity: 1 }],
    clinicalInfo: '',
    urgency: 'routine',
  });
  const [authResult, setAuthResult] = useState(null);

  // ── استعلام حالة ──
  const [statusClaimId, setStatusClaimId] = useState('');
  const [statusPayerId, setStatusPayerId] = useState('');
  const [statusResult, setStatusResult] = useState(null);

  // ── إلغاء مطالبة ──
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelClaimId, setCancelClaimId] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // ── حالة الاتصال ──
  const [connStatus, setConnStatus] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await API.get('/status');
      setConnStatus(res?.data?.data || res?.data || null);
    } catch {
      setError('فشل تحميل حالة NPHIES');
    }
  }, []);

  // ─── Eligibility Check ───
  const handleEligibility = async () => {
    setLoading(true);
    setError(null);
    setEligibilityResult(null);
    try {
      const res = await API.post('/eligibility/check', eligibilityForm);
      setEligibilityResult(res?.data?.data || res?.data || null);
      setSuccess('تم التحقق من الأهلية بنجاح');
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل التحقق من الأهلية');
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit Claim ───
  const handleSubmitClaim = async () => {
    setLoading(true);
    setError(null);
    setClaimResult(null);
    try {
      const totalAmount = claim.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
      const res = await API.post('/claims/submit', { ...claim, totalAmount });
      setClaimResult(res?.data?.data || res?.data || null);
      setSuccess('تم تقديم المطالبة بنجاح');
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل تقديم المطالبة');
    } finally {
      setLoading(false);
    }
  };

  // ─── Prior Authorization ───
  const handlePriorAuth = async () => {
    setLoading(true);
    setError(null);
    setAuthResult(null);
    try {
      const res = await API.post('/prior-auth/request', authForm);
      setAuthResult(res?.data?.data || res?.data || null);
      setSuccess('تم تقديم طلب الموافقة المسبقة');
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل تقديم طلب الموافقة المسبقة');
    } finally {
      setLoading(false);
    }
  };

  // ─── Claim Status ───
  const handleCheckStatus = async () => {
    if (!statusClaimId) return;
    setLoading(true);
    setError(null);
    setStatusResult(null);
    try {
      const res = await API.get(`/claims/${statusClaimId}/status`, {
        params: { payerId: statusPayerId },
      });
      setStatusResult(res?.data?.data || res?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل استعلام حالة المطالبة');
    } finally {
      setLoading(false);
    }
  };

  // ─── Cancel Claim ───
  const handleCancel = async () => {
    if (!cancelClaimId) return;
    try {
      await API.delete(`/claims/${cancelClaimId}`, { data: { reason: cancelReason } });
      setSuccess(`تم إلغاء المطالبة ${cancelClaimId}`);
      setCancelDialog(false);
      setCancelClaimId('');
      setCancelReason('');
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل إلغاء المطالبة');
    }
  };

  const updateClaimService = (i, field, value) => {
    const services = [...claim.services];
    services[i] = { ...services[i], [field]: field === 'description' ? value : field === 'code' ? value : Number(value) };
    setClaim({ ...claim, services });
  };

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            <NphiesIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            NPHIES — التأمين الصحي
          </Typography>
          <Typography color="text.secondary">
            المنصة الوطنية لتبادل المعلومات الصحية — HL7 FHIR R4
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadStatus}>
            حالة الاتصال
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => setCancelDialog(true)}
          >
            إلغاء مطالبة
          </Button>
        </Box>
      </Box>

      {connStatus && (
        <Alert severity={connStatus.connected ? 'success' : 'warning'} sx={{ mb: 2 }} onClose={() => setConnStatus(null)}>
          {connStatus.connected
            ? `متصل بـ NPHIES — البيئة: ${connStatus.environment || '—'} — المزود: ${connStatus.providerId || '—'}`
            : 'غير متصل — تحقق من إعدادات NPHIES'}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<EligibilityIcon />} iconPosition="start" label="أهلية التأمين" />
        <Tab icon={<ClaimIcon />} iconPosition="start" label="تقديم مطالبة" />
        <Tab icon={<AuthIcon />} iconPosition="start" label="موافقة مسبقة" />
        <Tab icon={<SearchIcon />} iconPosition="start" label="حالة المطالبة" />
      </Tabs>

      {/* ─── Tab 0: Eligibility ─── */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>التحقق من أهلية التأمين</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="رقم هوية المريض"
                      value={eligibilityForm.patientId}
                      onChange={(e) => setEligibilityForm({ ...eligibilityForm, patientId: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="اسم المريض"
                      value={eligibilityForm.patientName}
                      onChange={(e) => setEligibilityForm({ ...eligibilityForm, patientName: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="تاريخ الميلاد" type="date"
                      value={eligibilityForm.patientDob}
                      onChange={(e) => setEligibilityForm({ ...eligibilityForm, patientDob: e.target.value })}
                      InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="رقم العضوية / الوثيقة"
                      value={eligibilityForm.memberId}
                      onChange={(e) => setEligibilityForm({ ...eligibilityForm, memberId: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="كود شركة التأمين (Payer ID)"
                      value={eligibilityForm.payerId}
                      onChange={(e) => setEligibilityForm({ ...eligibilityForm, payerId: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="اسم شركة التأمين"
                      value={eligibilityForm.payerName}
                      onChange={(e) => setEligibilityForm({ ...eligibilityForm, payerName: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="تاريخ الخدمة" type="date"
                      value={eligibilityForm.serviceDate}
                      onChange={(e) => setEligibilityForm({ ...eligibilityForm, serviceDate: e.target.value })}
                      InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" fullWidth
                      startIcon={loading ? <CircularProgress size={16} /> : <EligibilityIcon />}
                      onClick={handleEligibility}
                      disabled={loading || !eligibilityForm.patientId || !eligibilityForm.payerId}>
                      التحقق من الأهلية
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            {eligibilityResult ? (
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2} color="primary">نتيجة التحقق</Typography>
                  <Box mb={2}>
                    <ClaimStatusChip status={eligibilityResult.eligible ? 'approved' : 'rejected'} />
                  </Box>
                  {eligibilityResult.coverage && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" mb={1}>تفاصيل التغطية</Typography>
                      {[
                        ['نوع التغطية', eligibilityResult.coverage.type],
                        ['تاريخ البدء', eligibilityResult.coverage.startDate && new Date(eligibilityResult.coverage.startDate).toLocaleDateString('ar-SA')],
                        ['تاريخ الانتهاء', eligibilityResult.coverage.endDate && new Date(eligibilityResult.coverage.endDate).toLocaleDateString('ar-SA')],
                        ['نسبة التحمل', eligibilityResult.coverage.copay ? `${eligibilityResult.coverage.copay}%` : '—'],
                        ['الحد الأقصى', eligibilityResult.coverage.maxBenefit ? `${eligibilityResult.coverage.maxBenefit?.toLocaleString()} ر.س` : '—'],
                      ].map(([label, val]) => val && (
                        <Box key={label} display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">{label}</Typography>
                          <Typography variant="body2" fontWeight="medium">{val}</Typography>
                        </Box>
                      ))}
                    </>
                  )}
                  {eligibilityResult.message && (
                    <Alert severity="info" sx={{ mt: 1 }} icon={false}>
                      {eligibilityResult.message}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CardContent sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  <EligibilityIcon sx={{ fontSize: 64, mb: 1, opacity: 0.3 }} />
                  <Typography>أدخل بيانات المريض وشركة التأمين للتحقق من الأهلية</Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* ─── Tab 1: Submit Claim ─── */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" mb={2}>بيانات المطالبة</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="هوية المريض"
                      value={claim.patientId} onChange={(e) => setClaim({ ...claim, patientId: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="اسم المريض"
                      value={claim.patientName} onChange={(e) => setClaim({ ...claim, patientName: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="كود شركة التأمين"
                      value={claim.payerId} onChange={(e) => setClaim({ ...claim, payerId: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="اسم شركة التأمين"
                      value={claim.payerName} onChange={(e) => setClaim({ ...claim, payerName: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="تاريخ الخدمة" type="date"
                      value={claim.serviceDate} onChange={(e) => setClaim({ ...claim, serviceDate: e.target.value })}
                      InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="نوع المطالبة" select
                      value={claim.claimType} onChange={(e) => setClaim({ ...claim, claimType: e.target.value })}>
                      <MenuItem value="professional">مهنية (Professional)</MenuItem>
                      <MenuItem value="institutional">مؤسسية (Institutional)</MenuItem>
                      <MenuItem value="pharmacy">صيدلانية (Pharmacy)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="أكواد التشخيص (ICD-10) — مفصولة بفاصلة"
                      value={claim.diagnosisCodes.join(', ')}
                      onChange={(e) => setClaim({ ...claim, diagnosisCodes: e.target.value.split(',').map(c => c.trim()) })}
                      placeholder="مثال: F84.0, Z99.9" />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>الخدمات المُطالب بها</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>كود الخدمة</TableCell>
                        <TableCell>الوصف</TableCell>
                        <TableCell align="center">الكمية</TableCell>
                        <TableCell align="center">سعر الوحدة</TableCell>
                        <TableCell align="center">الإجمالي</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {claim.services.map((sv, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <TextField size="small" variant="standard" value={sv.code}
                              onChange={(e) => updateClaimService(i, 'code', e.target.value)}
                              sx={{ width: 90 }} placeholder="CPT/HCPCS" />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" variant="standard" value={sv.description}
                              onChange={(e) => updateClaimService(i, 'description', e.target.value)}
                              fullWidth placeholder="وصف الخدمة" />
                          </TableCell>
                          <TableCell align="center">
                            <TextField size="small" type="number" variant="standard" value={sv.quantity}
                              onChange={(e) => updateClaimService(i, 'quantity', e.target.value)}
                              sx={{ width: 60 }} inputProps={{ min: 1 }} />
                          </TableCell>
                          <TableCell align="center">
                            <TextField size="small" type="number" variant="standard" value={sv.unitPrice}
                              onChange={(e) => updateClaimService(i, 'unitPrice', e.target.value)}
                              sx={{ width: 90 }} inputProps={{ min: 0, step: 0.01 }} />
                          </TableCell>
                          <TableCell align="center">
                            {(sv.quantity * sv.unitPrice).toFixed(2)} ر.س
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button size="small" sx={{ mt: 1 }}
                  onClick={() => setClaim({ ...claim, services: [...claim.services, { code: '', description: '', quantity: 1, unitPrice: 0 }] })}>
                  + إضافة خدمة
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" mb={1}>إجمالي المطالبة</Typography>
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  {claim.services.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0).toFixed(2)} ر.س
                </Typography>
              </CardContent>
            </Card>
            <Button variant="contained" fullWidth size="large"
              startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
              onClick={handleSubmitClaim}
              disabled={loading || !claim.patientId || !claim.payerId}>
              تقديم المطالبة
            </Button>

            {claimResult && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" mb={1}>نتيجة التقديم</Typography>
                  <ClaimStatusChip status={claimResult.status} />
                  {claimResult.claimId && (
                    <Typography variant="body2" mt={1}>رقم المطالبة: <strong>{claimResult.claimId}</strong></Typography>
                  )}
                  {claimResult.responseId && (
                    <Typography variant="body2">Response ID: {claimResult.responseId}</Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* ─── Tab 2: Prior Authorization ─── */}
      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>طلب الموافقة المسبقة</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="هوية المريض"
                      value={authForm.patientId} onChange={(e) => setAuthForm({ ...authForm, patientId: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="اسم المريض"
                      value={authForm.patientName} onChange={(e) => setAuthForm({ ...authForm, patientName: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="كود شركة التأمين"
                      value={authForm.payerId} onChange={(e) => setAuthForm({ ...authForm, payerId: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="درجة الإلحاح" select
                      value={authForm.urgency} onChange={(e) => setAuthForm({ ...authForm, urgency: e.target.value })}>
                      <MenuItem value="routine">عادي (Routine)</MenuItem>
                      <MenuItem value="urgent">عاجل (Urgent)</MenuItem>
                      <MenuItem value="stat">طارئ (Stat)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="أكواد التشخيص (ICD-10)"
                      value={authForm.diagnosisCodes.join(', ')}
                      onChange={(e) => setAuthForm({ ...authForm, diagnosisCodes: e.target.value.split(',').map(c => c.trim()) })}
                      placeholder="مثال: F84.0, G40.0" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="المبرر السريري" multiline rows={3}
                      value={authForm.clinicalInfo}
                      onChange={(e) => setAuthForm({ ...authForm, clinicalInfo: e.target.value })}
                      placeholder="وصف الحالة السريرية ومبرر الطلب..." />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" fullWidth
                      startIcon={loading ? <CircularProgress size={16} /> : <AuthIcon />}
                      onClick={handlePriorAuth}
                      disabled={loading || !authForm.patientId || !authForm.payerId}>
                      تقديم طلب الموافقة المسبقة
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            {authResult ? (
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2} color="primary">نتيجة الطلب</Typography>
                  <ClaimStatusChip status={authResult.status} />
                  {authResult.authorizationId && (
                    <Box mt={2}>
                      <Typography variant="body2" color="text.secondary">رقم الموافقة</Typography>
                      <Typography fontWeight="bold">{authResult.authorizationId}</Typography>
                    </Box>
                  )}
                  {authResult.expiryDate && (
                    <Box mt={1}>
                      <Typography variant="body2" color="text.secondary">صالحة حتى</Typography>
                      <Typography>{new Date(authResult.expiryDate).toLocaleDateString('ar-SA')}</Typography>
                    </Box>
                  )}
                  {authResult.approvedServices?.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="subtitle2" mb={1}>الخدمات الموافق عليها</Typography>
                      {authResult.approvedServices.map((s, i) => (
                        <Chip key={i} label={s} size="small" color="success" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CardContent sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  <AuthIcon sx={{ fontSize: 64, mb: 1, opacity: 0.3 }} />
                  <Typography>أدخل بيانات الطلب للحصول على الموافقة المسبقة</Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* ─── Tab 3: Claim Status ─── */}
      {tab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>استعلام حالة المطالبة</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="رقم المطالبة (Claim ID)"
                      value={statusClaimId} onChange={(e) => setStatusClaimId(e.target.value)} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="كود شركة التأمين (Payer ID) — اختياري"
                      value={statusPayerId} onChange={(e) => setStatusPayerId(e.target.value)} />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" fullWidth
                      startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
                      onClick={handleCheckStatus}
                      disabled={loading || !statusClaimId}>
                      استعلام الحالة
                    </Button>
                  </Grid>
                </Grid>

                {statusResult && (
                  <Box mt={3}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle1" mb={2}>نتيجة الاستعلام</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableBody>
                          {[
                            ['رقم المطالبة', statusResult.claimId],
                            ['الحالة', <ClaimStatusChip key="s" status={statusResult.status} />],
                            ['تاريخ التقديم', statusResult.submittedAt && new Date(statusResult.submittedAt).toLocaleDateString('ar-SA')],
                            ['آخر تحديث', statusResult.updatedAt && new Date(statusResult.updatedAt).toLocaleDateString('ar-SA')],
                            ['المبلغ الموافق عليه', statusResult.approvedAmount ? `${statusResult.approvedAmount?.toLocaleString()} ر.س` : null],
                            ['المبلغ المرفوض', statusResult.rejectedAmount ? `${statusResult.rejectedAmount?.toLocaleString()} ر.س` : null],
                          ].filter(([_, v]) => v).map(([label, val]) => (
                            <TableRow key={label}>
                              <TableCell sx={{ color: 'text.secondary', width: '40%' }}>{label}</TableCell>
                              <TableCell>{val}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {statusResult.remarks && (
                      <Alert severity="info" sx={{ mt: 1 }}>{statusResult.remarks}</Alert>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ─── Cancel Dialog ─── */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <CancelIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'error.main' }} />
          إلغاء مطالبة
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="رقم المطالبة المراد إلغاؤها"
                value={cancelClaimId} onChange={(e) => setCancelClaimId(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="سبب الإلغاء" multiline rows={3}
                value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>إغلاق</Button>
          <Button variant="contained" color="error" onClick={handleCancel} disabled={!cancelClaimId}>
            إلغاء المطالبة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
