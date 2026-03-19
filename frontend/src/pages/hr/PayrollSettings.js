import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Divider,
  LinearProgress,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Chip,
  Alert,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  AccountBalance as GOSIIcon,
  LocalHospital as InsuranceIcon,
  Receipt as TaxIcon,
  AccessTime as OTIcon,
  CalendarMonth as CalIcon,
  MonetizationOn as CurrIcon,
} from '@mui/icons-material';
import payrollService from 'services/payrollService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const PayrollSettings = () => {
  const showSnackbar = useSnackbar();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await payrollService.getPayrollSettings();
      setSettings(data);
    } catch (err) {
      logger.error('Settings error:', err);
      setSettings(payrollService.getMockSettings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateField = (path, value) => {
    setChanged(true);
    setSettings(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await payrollService.updatePayrollSettings(settings);
      showSnackbar('تم حفظ الإعدادات بنجاح', 'success');
      setChanged(false);
    } catch {
      showSnackbar('فشل حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings)
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل الإعدادات...
        </Typography>
      </Container>
    );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <SettingsIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إعدادات نظام الرواتب
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  ضبط معدلات التأمينات والضرائب والبدلات
                </Typography>
              </Box>
            </Box>
            <Button
              startIcon={<SaveIcon />}
              variant="contained"
              onClick={handleSave}
              disabled={!changed || saving}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {changed && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          يوجد تغييرات غير محفوظة
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* GOSI Settings */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}`, height: '100%' }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: `${statusColors.info}15`,
                    color: statusColors.info,
                    width: 40,
                    height: 40,
                  }}
                >
                  <GOSIIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={700}>
                  التأمينات الاجتماعية (GOSI)
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="نسبة الموظف %"
                    type="number"
                    value={settings.gosiRate?.employee || ''}
                    onChange={e => updateField('gosiRate.employee', Number(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="نسبة صاحب العمل %"
                    type="number"
                    value={settings.gosiRate?.employer || ''}
                    onChange={e => updateField('gosiRate.employer', Number(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  />
                </Grid>
              </Grid>
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 1.5, color: neutralColors.textSecondary }}
              >
                إجمالي الاشتراك:{' '}
                {(settings.gosiRate?.employee || 0) + (settings.gosiRate?.employer || 0)}% — (موظف{' '}
                {settings.gosiRate?.employee}% + صاحب عمل {settings.gosiRate?.employer}%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Health Insurance */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}`, height: '100%' }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: `${statusColors.success}15`,
                    color: statusColors.success,
                    width: 40,
                    height: 40,
                  }}
                >
                  <InsuranceIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={700}>
                  التأمين الطبي
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <TextField
                fullWidth
                label="مبلغ التأمين الثابت"
                type="number"
                value={settings.healthInsurance?.fixed || ''}
                onChange={e => updateField('healthInsurance.fixed', Number(e.target.value))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">ر.س / شهر</InputAdornment>,
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Tax Brackets */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: `${statusColors.warning}15`,
                    color: statusColors.warning,
                    width: 40,
                    height: 40,
                  }}
                >
                  <TaxIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={700}>
                  شرائح ضريبة الدخل
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Table size="small">
                <TableBody>
                  {settings.taxBrackets?.map((bracket, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {bracket.min?.toLocaleString()} —{' '}
                        {bracket.max === Infinity ? '∞' : bracket.max?.toLocaleString()} ر.س
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${bracket.rate}%`}
                          size="small"
                          color={
                            bracket.rate === 0
                              ? 'success'
                              : bracket.rate <= 5
                                ? 'info'
                                : bracket.rate <= 10
                                  ? 'warning'
                                  : 'error'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Overtime Rates */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: `${brandColors.primary}15`,
                    color: brandColors.primary,
                    width: 40,
                    height: 40,
                  }}
                >
                  <OTIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={700}>
                  معدلات العمل الإضافي
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="عادي"
                    type="number"
                    value={settings.overtimeRates?.regular || ''}
                    onChange={e => updateField('overtimeRates.regular', Number(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">×</InputAdornment> }}
                    inputProps={{ step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="نهاية أسبوع"
                    type="number"
                    value={settings.overtimeRates?.weekend || ''}
                    onChange={e => updateField('overtimeRates.weekend', Number(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">×</InputAdornment> }}
                    inputProps={{ step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="إجازة رسمية"
                    type="number"
                    value={settings.overtimeRates?.holiday || ''}
                    onChange={e => updateField('overtimeRates.holiday', Number(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">×</InputAdornment> }}
                    inputProps={{ step: 0.1 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Default Allowances */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: `${statusColors.info}15`,
                    color: statusColors.info,
                    width: 40,
                    height: 40,
                  }}
                >
                  <CurrIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={700}>
                  البدلات الافتراضية
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="بدل السكن %"
                    type="number"
                    value={settings.allowanceDefaults?.housing?.percentage || ''}
                    onChange={e =>
                      updateField('allowanceDefaults.housing.percentage', Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">% من الأساسي</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="بدل النقل"
                    type="number"
                    value={settings.allowanceDefaults?.transportation?.fixed || ''}
                    onChange={e =>
                      updateField('allowanceDefaults.transportation.fixed', Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ر.س</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="بدل الاتصالات"
                    type="number"
                    value={settings.allowanceDefaults?.communication?.fixed || ''}
                    onChange={e =>
                      updateField('allowanceDefaults.communication.fixed', Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ر.س</InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* General Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: `${neutralColors.textSecondary}15`,
                    color: neutralColors.textSecondary,
                    width: 40,
                    height: 40,
                  }}
                >
                  <CalIcon />
                </Avatar>
                <Typography variant="h6" fontWeight={700}>
                  إعدادات عامة
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="أيام العمل الشهرية"
                    type="number"
                    value={settings.workingDays || ''}
                    onChange={e => updateField('workingDays', Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="يوم صرف الراتب"
                    type="number"
                    value={settings.paymentDay || ''}
                    onChange={e => updateField('paymentDay', Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">من كل شهر</InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                مكافأة نهاية الخدمة
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="أول 5 سنوات"
                    type="number"
                    value={settings.endOfServiceRates?.first5Years || ''}
                    onChange={e =>
                      updateField('endOfServiceRates.first5Years', Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">× راتب شهري</InputAdornment>,
                    }}
                    inputProps={{ step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="بعد 5 سنوات"
                    type="number"
                    value={settings.endOfServiceRates?.after5Years || ''}
                    onChange={e =>
                      updateField('endOfServiceRates.after5Years', Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">× راتب شهري</InputAdornment>,
                    }}
                    inputProps={{ step: 0.1 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PayrollSettings;
