/**
 * Muqeem Dashboard — مقيم (إدارة الإقامات)
 *
 * Ministry of Interior - Muqeem integration: residence queries,
 * renewals, exit/re-entry visas, final exit visas, expiry alerts.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Tabs, Tab, Badge, Tooltip, IconButton,
} from '@mui/material';
import {
  CreditCard as IqamaIcon,
  FlightTakeoff as ExitIcon,
  FlightLand as ReturnIcon,
  Warning as WarnIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  People as WorkersIcon,
  CheckCircle as CheckIcon,
  Work as OccupationIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API = axios.create({ baseURL: '/api/muqeem', withCredentials: true });

export default function MuqeemPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // بحث الإقامة
  const [iqamaNumber, setIqamaNumber] = useState('');
  const [residenceInfo, setResidenceInfo] = useState(null);

  // قائمة العمال
  const [workers, setWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(false);

  // الإقامات المنتهية قريباً
  const [expiring, setExpiring] = useState([]);
  const [expiringLoading, setExpiringLoading] = useState(false);

  // تأشيرة الخروج والعودة
  const [visaDialog, setVisaDialog] = useState(false);
  const [visaType, setVisaType] = useState('exit_reentry'); // exit_reentry | final_exit
  const [visaForm, setVisaForm] = useState({ iqamaNumber: '', duration: '90', reason: '' });
  const [visaResult, setVisaResult] = useState(null);

  // تجديد الإقامة
  const [renewDialog, setRenewDialog] = useState(false);
  const [renewForm, setRenewForm] = useState({ iqamaNumber: '', years: '1' });

  // تغيير المهنة
  const [occupationDialog, setOccupationDialog] = useState(false);
  const [occupationForm, setOccupationForm] = useState({ iqamaNumber: '', newOccupation: '', reason: '' });

  const loadWorkers = useCallback(async () => {
    setWorkersLoading(true);
    try {
      const res = await API.get('/workers');
      setWorkers(res?.data?.data || res?.data?.workers || []);
    } catch {
      setError('فشل تحميل قائمة العمال');
    } finally {
      setWorkersLoading(false);
    }
  }, []);

  const loadExpiring = useCallback(async () => {
    setExpiringLoading(true);
    try {
      const res = await API.get('/expiring');
      setExpiring(res?.data?.data || res?.data?.expiring || []);
    } catch {
      setError('فشل تحميل الإقامات المنتهية');
    } finally {
      setExpiringLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 1) loadWorkers();
    if (tab === 2) loadExpiring();
  }, [tab, loadWorkers, loadExpiring]);

  const handleSearch = async () => {
    if (!iqamaNumber.trim()) return;
    setLoading(true);
    setError(null);
    setResidenceInfo(null);
    try {
      const res = await API.get(`/residence/${iqamaNumber.trim()}`);
      setResidenceInfo(res?.data?.data || res?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل الاستعلام عن الإقامة');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    try {
      const res = await API.post('/residence/renew', renewForm);
      setSuccess(`تم تجديد الإقامة بنجاح — رقم الطلب: ${res?.data?.data?.requestNumber || '—'}`);
      setRenewDialog(false);
      setRenewForm({ iqamaNumber: '', years: '1' });
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل تجديد الإقامة');
    }
  };

  const handleIssueVisa = async () => {
    try {
      const endpoint = visaType === 'final_exit' ? '/visa/final-exit' : '/visa/exit-reentry';
      const res = await API.post(endpoint, visaForm);
      setVisaResult(res?.data?.data || res?.data || null);
      setSuccess('تم إصدار التأشيرة بنجاح');
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل إصدار التأشيرة');
    }
  };

  const handleChangeOccupation = async () => {
    try {
      await API.post('/worker/change-occupation', occupationForm);
      setSuccess('تم تغيير المهنة بنجاح');
      setOccupationDialog(false);
      setOccupationForm({ iqamaNumber: '', newOccupation: '', reason: '' });
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل تغيير المهنة');
    }
  };

  const getExpiryColor = (days) => {
    if (days <= 30) return 'error';
    if (days <= 90) return 'warning';
    return 'success';
  };

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            <IqamaIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            مقيم — إدارة الإقامات
          </Typography>
          <Typography color="text.secondary">
            وزارة الداخلية — استعلام وتجديد الإقامات وإصدار التأشيرات
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<ExitIcon />}
            onClick={() => { setVisaType('exit_reentry'); setVisaDialog(true); }}
          >
            تأشيرة خروج وعودة
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ExitIcon />}
            onClick={() => { setVisaType('final_exit'); setVisaDialog(true); }}
          >
            خروج نهائي
          </Button>
          <Button
            variant="contained"
            startIcon={<IqamaIcon />}
            onClick={() => setRenewDialog(true)}
          >
            تجديد إقامة
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="استعلام إقامة" />
        <Tab label={
          <Badge badgeContent={workers.length || 0} color="primary" max={999}>
            قائمة العمال
          </Badge>
        } />
        <Tab label={
          <Badge badgeContent={expiring.length || 0} color="error">
            إقامات منتهية قريباً
          </Badge>
        } />
      </Tabs>

      {/* Tab 0: Residence Query */}
      {tab === 0 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>الاستعلام عن إقامة</Typography>
              <Box display="flex" gap={2} alignItems="center">
                <TextField
                  label="رقم الإقامة (Iqama Number)"
                  value={iqamaNumber}
                  onChange={(e) => setIqamaNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  size="small"
                  sx={{ flex: 1, maxWidth: 350 }}
                  inputProps={{ maxLength: 10 }}
                  helperText="10 أرقام"
                />
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
                  onClick={handleSearch}
                  disabled={loading || !iqamaNumber.trim()}
                >
                  استعلام
                </Button>
              </Box>
            </CardContent>
          </Card>

          {residenceInfo && (
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2} color="primary">نتيجة الاستعلام</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="caption" color="text.secondary">الاسم</Typography>
                    <Typography fontWeight="bold">{residenceInfo.name || residenceInfo.fullName || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="caption" color="text.secondary">رقم الإقامة</Typography>
                    <Typography fontWeight="bold">{residenceInfo.iqamaNumber || iqamaNumber}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="caption" color="text.secondary">الجنسية</Typography>
                    <Typography>{residenceInfo.nationality || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="caption" color="text.secondary">المهنة</Typography>
                    <Typography>{residenceInfo.occupation || residenceInfo.jobTitle || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="caption" color="text.secondary">تاريخ الانتهاء</Typography>
                    <Typography color={residenceInfo.daysToExpiry <= 90 ? 'error.main' : 'text.primary'}>
                      {residenceInfo.expiryDate
                        ? new Date(residenceInfo.expiryDate).toLocaleDateString('ar-SA')
                        : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="caption" color="text.secondary">الحالة</Typography>
                    <Box mt={0.5}>
                      <Chip
                        label={residenceInfo.status === 'active' ? 'نشط' : residenceInfo.status || '—'}
                        color={residenceInfo.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Grid>
                  {residenceInfo.daysToExpiry !== undefined && (
                    <Grid item xs={12}>
                      <Alert
                        severity={getExpiryColor(residenceInfo.daysToExpiry) === 'error' ? 'error' : getExpiryColor(residenceInfo.daysToExpiry) === 'warning' ? 'warning' : 'success'}
                      >
                        متبقي على الانتهاء: <strong>{residenceInfo.daysToExpiry} يوم</strong>
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Tab 1: Workers List */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">قائمة العمال الأجانب ({workers.length})</Typography>
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<OccupationIcon />}
                  onClick={() => setOccupationDialog(true)}
                >
                  تغيير مهنة
                </Button>
                <Tooltip title="تحديث">
                  <IconButton onClick={loadWorkers} disabled={workersLoading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            {workersLoading ? (
              <Box textAlign="center" p={3}><CircularProgress /></Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>الاسم</TableCell>
                      <TableCell>رقم الإقامة</TableCell>
                      <TableCell>الجنسية</TableCell>
                      <TableCell>المهنة</TableCell>
                      <TableCell>تاريخ الانتهاء</TableCell>
                      <TableCell>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {workers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          لا توجد بيانات
                        </TableCell>
                      </TableRow>
                    ) : workers.map((w, i) => (
                      <TableRow key={w.iqamaNumber || i} hover>
                        <TableCell>{w.name || w.fullName || '—'}</TableCell>
                        <TableCell dir="ltr">{w.iqamaNumber || '—'}</TableCell>
                        <TableCell>{w.nationality || '—'}</TableCell>
                        <TableCell>{w.occupation || w.jobTitle || '—'}</TableCell>
                        <TableCell>
                          {w.expiryDate
                            ? new Date(w.expiryDate).toLocaleDateString('ar-SA')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={w.status === 'active' ? 'نشط' : w.status || '—'}
                            color={w.status === 'active' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Expiring Residencies */}
      {tab === 2 && (
        <Box>
          {expiring.filter(e => (e.daysToExpiry || 999) <= 30).length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>{expiring.filter(e => (e.daysToExpiry || 999) <= 30).length}</strong> إقامة ستنتهي خلال 30 يوماً — يجب التجديد فوراً
            </Alert>
          )}
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6">
                  <WarnIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
                  الإقامات المنتهية قريباً ({expiring.length})
                </Typography>
                <Tooltip title="تحديث">
                  <IconButton onClick={loadExpiring} disabled={expiringLoading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              {expiringLoading ? (
                <Box textAlign="center" p={3}><CircularProgress /></Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>الاسم</TableCell>
                        <TableCell>رقم الإقامة</TableCell>
                        <TableCell>تاريخ الانتهاء</TableCell>
                        <TableCell>الأيام المتبقية</TableCell>
                        <TableCell>الإجراء</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {expiring.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            <CheckIcon color="success" sx={{ mr: 1 }} />
                            لا توجد إقامات منتهية قريباً
                          </TableCell>
                        </TableRow>
                      ) : expiring.map((e, i) => (
                        <TableRow key={e.iqamaNumber || i} hover>
                          <TableCell>{e.name || e.fullName || '—'}</TableCell>
                          <TableCell dir="ltr">{e.iqamaNumber || '—'}</TableCell>
                          <TableCell>
                            {e.expiryDate
                              ? new Date(e.expiryDate).toLocaleDateString('ar-SA')
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${e.daysToExpiry || '—'} يوم`}
                              color={getExpiryColor(e.daysToExpiry || 999)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setRenewForm({ iqamaNumber: e.iqamaNumber || '', years: '1' });
                                setRenewDialog(true);
                              }}
                            >
                              تجديد
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ─── Renew Residence Dialog ─── */}
      <Dialog open={renewDialog} onClose={() => setRenewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <IqamaIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          تجديد إقامة
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رقم الإقامة"
                value={renewForm.iqamaNumber}
                onChange={(e) => setRenewForm({ ...renewForm, iqamaNumber: e.target.value })}
                inputProps={{ maxLength: 10 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="مدة التجديد (سنوات)"
                type="number"
                value={renewForm.years}
                onChange={(e) => setRenewForm({ ...renewForm, years: e.target.value })}
                inputProps={{ min: 1, max: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleRenew} disabled={!renewForm.iqamaNumber}>
            تجديد
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Visa Dialog ─── */}
      <Dialog open={visaDialog} onClose={() => { setVisaDialog(false); setVisaResult(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {visaType === 'final_exit' ? (
            <><ExitIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'error.main' }} />إصدار تأشيرة خروج نهائي</>
          ) : (
            <><ReturnIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />إصدار تأشيرة خروج وعودة</>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رقم الإقامة"
                value={visaForm.iqamaNumber}
                onChange={(e) => setVisaForm({ ...visaForm, iqamaNumber: e.target.value })}
                inputProps={{ maxLength: 10 }}
              />
            </Grid>
            {visaType === 'exit_reentry' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="المدة (أيام)"
                  type="number"
                  value={visaForm.duration}
                  onChange={(e) => setVisaForm({ ...visaForm, duration: e.target.value })}
                  inputProps={{ min: 30, max: 180 }}
                  helperText="من 30 إلى 180 يوم"
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="السبب"
                multiline
                rows={2}
                value={visaForm.reason}
                onChange={(e) => setVisaForm({ ...visaForm, reason: e.target.value })}
              />
            </Grid>
          </Grid>
          {visaResult && (
            <Box mt={2} p={2} bgcolor="success.light" borderRadius={1}>
              <Typography variant="subtitle2" fontWeight="bold">تم إصدار التأشيرة</Typography>
              {visaResult.visaNumber && <Typography>رقم التأشيرة: {visaResult.visaNumber}</Typography>}
              {visaResult.expiryDate && <Typography>تنتهي في: {new Date(visaResult.expiryDate).toLocaleDateString('ar-SA')}</Typography>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setVisaDialog(false); setVisaResult(null); }}>إغلاق</Button>
          {!visaResult && (
            <Button
              variant="contained"
              color={visaType === 'final_exit' ? 'error' : 'primary'}
              onClick={handleIssueVisa}
              disabled={!visaForm.iqamaNumber}
            >
              إصدار التأشيرة
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ─── Change Occupation Dialog ─── */}
      <Dialog open={occupationDialog} onClose={() => setOccupationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <OccupationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          تغيير المهنة
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رقم الإقامة"
                value={occupationForm.iqamaNumber}
                onChange={(e) => setOccupationForm({ ...occupationForm, iqamaNumber: e.target.value })}
                inputProps={{ maxLength: 10 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المهنة الجديدة"
                value={occupationForm.newOccupation}
                onChange={(e) => setOccupationForm({ ...occupationForm, newOccupation: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="سبب التغيير"
                multiline
                rows={2}
                value={occupationForm.reason}
                onChange={(e) => setOccupationForm({ ...occupationForm, reason: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOccupationDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleChangeOccupation}
            disabled={!occupationForm.iqamaNumber || !occupationForm.newOccupation}
          >
            تغيير المهنة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
