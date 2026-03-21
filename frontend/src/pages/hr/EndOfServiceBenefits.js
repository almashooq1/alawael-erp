import { useState, useEffect, useCallback } from 'react';

import payrollService from 'services/payrollService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';

const reasonLabels = {
  resignation: 'استقالة',
  'end-of-contract': 'انتهاء عقد',
  retirement: 'تقاعد',
  termination: 'إنهاء خدمة',
  death: 'وفاة',
};
const statusLabels = { calculated: 'محسوبة', approved: 'معتمدة', paid: 'مدفوعة' };
const statusColorMap = { calculated: 'info', approved: 'warning', paid: 'success' };

const EndOfServiceBenefits = () => {
  const showSnackbar = useSnackbar();
  const [eosHistory, setEosHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calcDialog, setCalcDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  const [selectedEOS, setSelectedEOS] = useState(null);
  const [formData, setFormData] = useState({
    employeeName: '',
    joinDate: '',
    endDate: '',
    lastSalary: '',
    totalAllowances: '',
    reason: 'resignation',
  });

  const loadData = useCallback(async () => {
    try {
      const data = await payrollService.getEOSHistory();
      setEosHistory(Array.isArray(data) ? data : payrollService.getMockEOS());
    } catch (err) {
      logger.error('EOS error:', err);
      setEosHistory(payrollService.getMockEOS());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateEOS = () => {
    const salary = Number(formData.lastSalary) || 0;
    const allowances = Number(formData.totalAllowances) || 0;
    const totalComp = salary + allowances;
    const joinDate = new Date(formData.joinDate);
    const endDate = new Date(formData.endDate);
    const diffMs = endDate - joinDate;
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);

    if (years <= 0 || totalComp <= 0) {
      showSnackbar('يرجى ملء البيانات بشكل صحيح', 'error');
      return;
    }

    // Saudi labor law EOS calculation
    let eosAmount = 0;
    const reason = formData.reason;

    if (years <= 5) {
      eosAmount = totalComp * 0.5 * years; // نصف راتب لكل سنة
    } else {
      const first5 = totalComp * 0.5 * 5; // أول 5 سنوات: نصف راتب
      const remaining = totalComp * 1.0 * (years - 5); // بعد 5 سنوات: راتب كامل
      eosAmount = first5 + remaining;
    }

    // Apply resignation reduction
    if (reason === 'resignation') {
      if (years < 2) {
        eosAmount = 0; // لا مكافأة
      } else if (years < 5) {
        eosAmount *= 1 / 3; // ثلث المكافأة
      } else if (years < 10) {
        eosAmount *= 2 / 3; // ثلثين المكافأة
      }
      // 10+ سنوات: كامل المكافأة
    }

    const result = {
      employeeName: formData.employeeName,
      joinDate: formData.joinDate,
      endDate: formData.endDate,
      yearsOfService: Math.round(years * 10) / 10,
      lastSalary: salary,
      totalAllowances: allowances,
      totalComp,
      eosAmount: Math.round(eosAmount),
      reason,
      status: 'calculated',
    };

    setCalcResult(result);
    showSnackbar('تم حساب مكافأة نهاية الخدمة', 'success');
  };

  const saveResult = () => {
    if (calcResult) {
      setEosHistory(prev => [{ ...calcResult, _id: Date.now().toString() }, ...prev]);
      setCalcDialog(false);
      setCalcResult(null);
      setFormData({
        employeeName: '',
        joinDate: '',
        endDate: '',
        lastSalary: '',
        totalAllowances: '',
        reason: 'resignation',
      });
      showSnackbar('تم حفظ الحساب بنجاح', 'success');
    }
  };

  const totalEOS = eosHistory.reduce((s, e) => s + (e.eosAmount || 0), 0);
  const totalPaid = eosHistory
    .filter(e => e.status === 'paid')
    .reduce((s, e) => s + (e.eosAmount || 0), 0);

  if (loading)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري التحميل...
        </Typography>
      </Container>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <EOSIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  مكافأة نهاية الخدمة
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  حساب وإدارة مكافآت نهاية الخدمة حسب نظام العمل السعودي
                </Typography>
              </Box>
            </Box>
            <Button
              startIcon={<CalcIcon />}
              variant="contained"
              onClick={() => setCalcDialog(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              حساب جديد
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الحالات', value: eosHistory.length, color: brandColors.primary },
          {
            label: 'إجمالي المكافآت',
            value: `${totalEOS.toLocaleString()} ر.س`,
            color: statusColors.info,
          },
          {
            label: 'المدفوع',
            value: `${totalPaid.toLocaleString()} ر.س`,
            color: statusColors.success,
          },
          {
            label: 'المعلق',
            value: `${(totalEOS - totalPaid).toLocaleString()} ر.س`,
            color: statusColors.warning,
          },
        ].map((s, i) => (
          <Grid item xs={3} key={i}>
            <Card
              sx={{
                borderRadius: 2.5,
                border: `1px solid ${surfaceColors.border}`,
                textAlign: 'center',
              }}
            >
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Saudi Labor Law Reference */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${statusColors.info}40`,
          bgcolor: `${statusColors.info}05`,
        }}
      >
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: statusColors.info }}>
            📋 قواعد نظام العمل السعودي (المادة 84-86)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>أول 5 سنوات:</strong> نصف راتب شهري لكل سنة
              </Typography>
              <Typography variant="body2">
                <strong>بعد 5 سنوات:</strong> راتب شهري كامل لكل سنة
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>استقالة أقل من سنتين:</strong> لا مكافأة
              </Typography>
              <Typography variant="body2">
                <strong>استقالة 2-5 سنوات:</strong> ثلث المكافأة
              </Typography>
              <Typography variant="body2">
                <strong>استقالة 5-10 سنوات:</strong> ثلثين المكافأة
              </Typography>
              <Typography variant="body2">
                <strong>استقالة 10+ سنوات:</strong> كامل المكافأة
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ الالتحاق</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ الانتهاء</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>سنوات الخدمة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>السبب</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  المكافأة
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eosHistory.map(eos => (
                <TableRow
                  key={eos._id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedEOS(eos);
                    setViewDialog(true);
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {eos.employeeName}
                    </Typography>
                  </TableCell>
                  <TableCell>{eos.joinDate}</TableCell>
                  <TableCell>{eos.endDate}</TableCell>
                  <TableCell>
                    <Chip label={`${eos.yearsOfService} سنة`} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{reasonLabels[eos.reason] || eos.reason}</TableCell>
                  <TableCell align="left">
                    <Typography fontWeight={700} sx={{ color: brandColors.primary }}>
                      {eos.eosAmount?.toLocaleString()} ر.س
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabels[eos.status]}
                      color={statusColorMap[eos.status]}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {eosHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>
                      لا توجد حالات مسجلة
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Calculate Dialog */}
      <Dialog
        open={calcDialog}
        onClose={() => setCalcDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalcIcon /> حاسبة مكافأة نهاية الخدمة
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم الموظف *"
                value={formData.employeeName}
                onChange={e => setFormData(p => ({ ...p, employeeName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="تاريخ الالتحاق *"
                type="date"
                value={formData.joinDate}
                onChange={e => setFormData(p => ({ ...p, joinDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="تاريخ الانتهاء *"
                type="date"
                value={formData.endDate}
                onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الراتب الأساسي *"
                type="number"
                value={formData.lastSalary}
                onChange={e => setFormData(p => ({ ...p, lastSalary: e.target.value }))}
                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="إجمالي البدلات"
                type="number"
                value={formData.totalAllowances}
                onChange={e => setFormData(p => ({ ...p, totalAllowances: e.target.value }))}
                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>سبب انتهاء الخدمة</InputLabel>
                <Select
                  value={formData.reason}
                  label="سبب انتهاء الخدمة"
                  onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                >
                  {Object.entries(reasonLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {calcResult && (
            <Card
              sx={{
                mt: 3,
                borderRadius: 2,
                border: `2px solid ${brandColors.primary}`,
                bgcolor: `${brandColors.primary}05`,
              }}
            >
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  نتيجة الحساب
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      سنوات الخدمة
                    </Typography>
                    <Typography fontWeight={700}>{calcResult.yearsOfService} سنة</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      إجمالي التعويض الشهري
                    </Typography>
                    <Typography fontWeight={700}>
                      {calcResult.totalComp?.toLocaleString()} ر.س
                    </Typography>
                  </Grid>
                </Grid>
                <Box
                  sx={{
                    mt: 2,
                    textAlign: 'center',
                    p: 2,
                    borderRadius: 2,
                    bgcolor: `${brandColors.primary}10`,
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    مكافأة نهاية الخدمة المستحقة
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: brandColors.primary }}>
                    {calcResult.eosAmount?.toLocaleString()} ر.س
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCalcDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          {!calcResult ? (
            <Button
              variant="contained"
              onClick={calculateEOS}
              disabled={
                !formData.employeeName ||
                !formData.joinDate ||
                !formData.endDate ||
                !formData.lastSalary
              }
              sx={{ borderRadius: 2 }}
            >
              حساب المكافأة
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={saveResult}
              sx={{ borderRadius: 2 }}
            >
              حفظ النتيجة
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EOSIcon /> تفاصيل مكافأة نهاية الخدمة
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {selectedEOS && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الموظف
                </Typography>
                <Typography fontWeight={700}>{selectedEOS.employeeName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  سنوات الخدمة
                </Typography>
                <Typography fontWeight={700}>{selectedEOS.yearsOfService} سنة</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  تاريخ الالتحاق
                </Typography>
                <Typography fontWeight={600}>{selectedEOS.joinDate}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  تاريخ الانتهاء
                </Typography>
                <Typography fontWeight={600}>{selectedEOS.endDate}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  آخر راتب
                </Typography>
                <Typography fontWeight={600}>
                  {selectedEOS.lastSalary?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  إجمالي التعويض
                </Typography>
                <Typography fontWeight={600}>
                  {selectedEOS.totalComp?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  السبب
                </Typography>
                <Typography fontWeight={600}>{reasonLabels[selectedEOS.reason]}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الحالة
                </Typography>
                <Chip
                  label={statusLabels[selectedEOS.status]}
                  color={statusColorMap[selectedEOS.status]}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    borderRadius: 2,
                    bgcolor: `${brandColors.primary}10`,
                    mt: 1,
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    المكافأة المستحقة
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: brandColors.primary }}>
                    {selectedEOS.eosAmount?.toLocaleString()} ر.س
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewDialog(false)} variant="contained" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EndOfServiceBenefits;
