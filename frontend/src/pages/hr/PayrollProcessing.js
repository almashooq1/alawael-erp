import { useState, useCallback } from 'react';

import payrollService from 'services/payrollService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';

const STEPS = ['اختيار الفترة', 'المراجعة والتحقق', 'الاعتماد', 'التحويل', 'التأكيد'];

const statusConfig = {
  draft: { label: 'مسودة', color: 'default' },
  'pending-approval': { label: 'بانتظار الاعتماد', color: 'warning' },
  approved: { label: 'معتمد', color: 'info' },
  processed: { label: 'مُعالج', color: 'primary' },
  transferred: { label: 'محوّل', color: 'secondary' },
  paid: { label: 'مدفوع', color: 'success' },
};

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ][i],
}));

const PayrollProcessing = () => {
  const showSnackbar = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payrollData, setPayrollData] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchResult, setBatchResult] = useState(null);

  const handleGenerate = useCallback(async () => {
    setProcessing(true);
    setProgress(0);
    try {
      // Simulate progress
      const iv = setInterval(() => setProgress(p => Math.min(p + 15, 90)), 300);
      const result = await payrollService.processMonthlyBatch(month, year);
      clearInterval(iv);
      setProgress(100);
      setBatchResult(result);
      // Load generated data
      const data = await payrollService.getMonthlyPayroll(month, year);
      setPayrollData(Array.isArray(data) ? data : payrollService.getMockPayroll());
      setSelectedIds(
        (Array.isArray(data) ? data : payrollService.getMockPayroll()).map(p => p._id)
      );
      showSnackbar(`تم توليد رواتب ${result?.processed || 0} موظف بنجاح`, 'success');
      setActiveStep(1);
    } catch (err) {
      logger.error('Payroll generation error:', err);
      showSnackbar('فشل في توليد الرواتب', 'error');
    } finally {
      setProcessing(false);
    }
  }, [month, year, showSnackbar]);

  const handleBulkAction = useCallback(
    async (action, nextStep, label) => {
      setProcessing(true);
      try {
        for (const id of selectedIds) {
          await action(id);
        }
        showSnackbar(`تم ${label} ${selectedIds.length} كشف راتب`, 'success');
        setActiveStep(nextStep);
      } catch (err) {
        showSnackbar(`فشل في ${label}`, 'error');
      } finally {
        setProcessing(false);
      }
    },
    [selectedIds, showSnackbar]
  );

  const toggleSelect = id => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };
  const toggleAll = () => {
    setSelectedIds(prev => (prev.length === payrollData.length ? [] : payrollData.map(p => p._id)));
  };

  const totalNet = payrollData.reduce((s, p) => s + (p.netPayable || 0), 0);
  const totalGross = payrollData.reduce(
    (s, p) => s + (p.baseSalary || 0) + (p.totalAllowances || 0) + (p.totalIncentives || 0),
    0
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
              <ProcessIcon sx={{ fontSize: 30 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                معالجة الرواتب الشهرية
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                توليد واعتماد وتحويل الرواتب على مراحل
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stepper */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label, i) => (
              <Step key={i} completed={activeStep > i}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Step 0: Select Period */}
      {activeStep === 0 && (
        <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <SheetIcon sx={{ fontSize: 60, color: brandColors.primary, mb: 2 }} />
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
              اختر الفترة لتوليد الرواتب
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>الشهر</InputLabel>
                <Select value={month} label="الشهر" onChange={e => setMonth(e.target.value)}>
                  {months.map(m => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>السنة</InputLabel>
                <Select value={year} label="السنة" onChange={e => setYear(e.target.value)}>
                  {[2025, 2026, 2027].map(y => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {processing && (
              <Box sx={{ mb: 2, maxWidth: 400, mx: 'auto' }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  جاري التوليد... {progress}%
                </Typography>
              </Box>
            )}
            <Button
              variant="contained"
              size="large"
              startIcon={<RunIcon />}
              onClick={handleGenerate}
              disabled={processing}
              sx={{ borderRadius: 2, px: 4 }}
            >
              توليد رواتب الشهر
            </Button>
            {batchResult && (
              <Alert severity="success" sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
                تم توليد {batchResult.processed} كشف راتب بنجاح
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1-4: Review / Approve / Transfer / Confirm */}
      {activeStep >= 1 && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'عدد الموظفين', value: payrollData.length, color: brandColors.primary },
              {
                label: 'إجمالي المستحقات',
                value: `${totalGross.toLocaleString()} ر.س`,
                color: statusColors.info,
              },
              {
                label: 'صافي الرواتب',
                value: `${totalNet.toLocaleString()} ر.س`,
                color: statusColors.success,
              },
              {
                label: 'المحدد',
                value: `${selectedIds.length} / ${payrollData.length}`,
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

          {/* Payroll Table */}
          <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}`, mb: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors.background }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.length === payrollData.length}
                        indeterminate={
                          selectedIds.length > 0 && selectedIds.length < payrollData.length
                        }
                        onChange={toggleAll}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      الأساسي
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      البدلات
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      الخصومات
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="left">
                      الصافي
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payrollData.map(p => (
                    <TableRow key={p._id} hover selected={selectedIds.includes(p._id)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(p._id)}
                          onChange={() => toggleSelect(p._id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {p.employeeName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{p.departmentName}</Typography>
                      </TableCell>
                      <TableCell align="left">{p.baseSalary?.toLocaleString()}</TableCell>
                      <TableCell align="left" sx={{ color: statusColors.success }}>
                        {p.totalAllowances?.toLocaleString()}
                      </TableCell>
                      <TableCell align="left" sx={{ color: statusColors.error }}>
                        {p.totalDeductions?.toLocaleString()}
                      </TableCell>
                      <TableCell align="left">
                        <Typography fontWeight={700} sx={{ color: brandColors.primary }}>
                          {p.netPayable?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusConfig[p.status]?.label || p.status}
                          color={statusConfig[p.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Action Buttons based on step */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            {activeStep === 1 && (
              <Button
                variant="contained"
                size="large"
                startIcon={<DoneIcon />}
                disabled={processing || selectedIds.length === 0}
                onClick={() =>
                  handleBulkAction(payrollService.submitForApproval, 2, 'تقديم للاعتماد')
                }
                sx={{ borderRadius: 2 }}
              >
                تقديم للاعتماد ({selectedIds.length})
              </Button>
            )}
            {activeStep === 2 && (
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<DoneIcon />}
                disabled={processing || selectedIds.length === 0}
                onClick={() => handleBulkAction(payrollService.approvePayroll, 3, 'الاعتماد')}
                sx={{ borderRadius: 2 }}
              >
                اعتماد الرواتب ({selectedIds.length})
              </Button>
            )}
            {activeStep === 3 && (
              <Button
                variant="contained"
                color="warning"
                size="large"
                startIcon={<TransferIcon />}
                disabled={processing || selectedIds.length === 0}
                onClick={() => handleBulkAction(payrollService.transferPayroll, 4, 'التحويل')}
                sx={{ borderRadius: 2 }}
              >
                تحويل للبنك ({selectedIds.length})
              </Button>
            )}
            {activeStep === 4 && (
              <Button
                variant="contained"
                color="info"
                size="large"
                startIcon={<PayIcon />}
                disabled={processing || selectedIds.length === 0}
                onClick={() => handleBulkAction(payrollService.confirmPayment, 5, 'تأكيد الدفع')}
                sx={{ borderRadius: 2 }}
              >
                تأكيد الدفع ({selectedIds.length})
              </Button>
            )}
            {activeStep >= 5 && (
              <Alert severity="success" sx={{ px: 4 }}>
                <Typography fontWeight={700}>
                  تم إنهاء معالجة رواتب شهر {months[month - 1]?.label} {year} بنجاح!
                </Typography>
              </Alert>
            )}
          </Box>
        </>
      )}
    </Container>
  );
};

export default PayrollProcessing;
