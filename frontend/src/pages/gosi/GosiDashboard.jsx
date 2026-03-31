/**
 * GOSI Dashboard — التأمينات الاجتماعية
 *
 * Saudi social insurance (GOSI) integration: employee registration,
 * contribution calculations, compliance reporting, certificates.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
} from '@mui/material';
import {
  Security as GosiIcon, Calculate as CalcIcon,
  Assessment as ReportIcon, Refresh as RefreshIcon, CheckCircle as CheckIcon, Warning as WarnIcon,
} from '@mui/icons-material';
import gosiApi from '../../services/gosi.service';

export default function GosiDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [calcDialog, setCalcDialog] = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  const [calcForm, setCalcForm] = useState({ basicSalary: '', housingAllowance: '', employeeCount: '' });
  const [_statusDialog, _setStatusDialog] = useState(false);
  const [statusEmpId, setStatusEmpId] = useState('');
  const [empStatus, setEmpStatus] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gosiApi.getComplianceReport().catch(() => ({ data: { data: null } }));
      setCompliance(res?.data?.data || null);
    } catch (err) {
      setError(err.message || 'خطأ في تحميل بيانات التأمينات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCalculate = async () => {
    try {
      const res = await gosiApi.calculateContributions({
        basicSalary: Number(calcForm.basicSalary),
        housingAllowance: Number(calcForm.housingAllowance),
        employeeCount: Number(calcForm.employeeCount) || 1,
      });
      setCalcResult(res?.data?.data || res?.data || null);
    } catch (err) {
      setError('فشل حساب الاشتراكات');
    }
  };

  const handleCheckStatus = async () => {
    try {
      const res = await gosiApi.getEmployeeStatus(statusEmpId);
      setEmpStatus(res?.data?.data || null);
    } catch {
      setError('فشل استرجاع حالة الموظف');
    }
  };

  const StatCard = ({ title, value, icon, color = 'primary.main', sub }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">{value ?? '—'}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <CircularProgress />
        <Typography mt={2}>جاري تحميل بيانات التأمينات الاجتماعية...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3} dir="rtl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            <GosiIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            التأمينات الاجتماعية (GOSI)
          </Typography>
          <Typography color="text.secondary">إدارة اشتراكات وتسجيل الموظفين في التأمينات</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<CalcIcon />} onClick={() => setCalcDialog(true)}>حساب الاشتراكات</Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>تحديث</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="الموظفون المسجلون" value={compliance?.registeredEmployees || '—'} icon={<CheckIcon />} color="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="نسبة الامتثال" value={compliance?.complianceRate !== null ? `${compliance.complianceRate}%` : '—'} icon={<ReportIcon />} color="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="إجمالي الاشتراكات الشهرية" value={compliance?.monthlyContributions !== null ? `${compliance.monthlyContributions.toLocaleString()} ر.س` : '—'} icon={<CalcIcon />} color="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="المخالفات" value={compliance?.violations || 0} icon={<WarnIcon />} color={compliance?.violations > 0 ? 'error.main' : 'success.main'} />
        </Grid>
      </Grid>

      {/* Employee Status Check */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>استعلام حالة موظف</Typography>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              label="رقم الموظف / الهوية"
              value={statusEmpId}
              onChange={(e) => setStatusEmpId(e.target.value)}
              size="small"
              sx={{ flex: 1, maxWidth: 300 }}
            />
            <Button variant="contained" onClick={handleCheckStatus} disabled={!statusEmpId}>استعلام</Button>
          </Box>
          {empStatus && (
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Grid container spacing={2}>
                <Grid item xs={4}><Typography variant="caption">الاسم</Typography><Typography fontWeight="bold">{empStatus.name || '—'}</Typography></Grid>
                <Grid item xs={4}><Typography variant="caption">الحالة</Typography><Chip label={empStatus.status === 'active' ? 'مسجل' : empStatus.status || '—'} color={empStatus.status === 'active' ? 'success' : 'default'} size="small" /></Grid>
                <Grid item xs={4}><Typography variant="caption">تاريخ التسجيل</Typography><Typography>{empStatus.registrationDate ? new Date(empStatus.registrationDate).toLocaleDateString('ar-SA') : '—'}</Typography></Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Compliance Details */}
      {compliance?.details && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>تفاصيل تقرير الامتثال</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>البند</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(Array.isArray(compliance.details) ? compliance.details : []).map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.item || d.name || '—'}</TableCell>
                      <TableCell>
                        <Chip label={d.compliant ? 'مطابق' : 'غير مطابق'} color={d.compliant ? 'success' : 'error'} size="small" />
                      </TableCell>
                      <TableCell>{d.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Calculate Dialog */}
      <Dialog open={calcDialog} onClose={() => setCalcDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>حساب اشتراكات التأمينات</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="الراتب الأساسي" type="number" value={calcForm.basicSalary} onChange={(e) => setCalcForm({ ...calcForm, basicSalary: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="بدل السكن" type="number" value={calcForm.housingAllowance} onChange={(e) => setCalcForm({ ...calcForm, housingAllowance: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="عدد الموظفين" type="number" value={calcForm.employeeCount} onChange={(e) => setCalcForm({ ...calcForm, employeeCount: e.target.value })} />
            </Grid>
          </Grid>
          {calcResult && (
            <Box mt={2} p={2} bgcolor="success.light" borderRadius={1}>
              <Typography variant="subtitle2">نتيجة الحساب:</Typography>
              <Typography>حصة الموظف: {calcResult.employeeShare?.toLocaleString() || '—'} ر.س</Typography>
              <Typography>حصة صاحب العمل: {calcResult.employerShare?.toLocaleString() || '—'} ر.س</Typography>
              <Typography fontWeight="bold">الإجمالي: {calcResult.totalContribution?.toLocaleString() || '—'} ر.س</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalcDialog(false)}>إغلاق</Button>
          <Button variant="contained" onClick={handleCalculate}>حساب</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
