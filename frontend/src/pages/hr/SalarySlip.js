import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Button,
  Divider,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import {
  Receipt as SlipIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  ArrowBack as BackIcon,
  Person as PersonIcon,
  CalendarMonth as CalIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import payrollService from 'services/payrollService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';

const allowanceLabels = {
  housing: 'بدل سكن',
  transportation: 'بدل نقل',
  meal: 'بدل وجبات',
  communication: 'بدل اتصالات',
  performance: 'بدل أداء',
  'shift-differential': 'بدل ورديات',
  'language-bonus': 'بدل لغات',
  'certificate-bonus': 'بدل شهادات',
  other: 'أخرى',
};
const deductionLabels = {
  'social-security': 'التأمينات الاجتماعية',
  'health-insurance': 'تأمين طبي',
  'income-tax': 'ضريبة دخل',
  'life-insurance': 'تأمين حياة',
  'loan-deduction': 'خصم قرض',
  'employee-advance': 'سلفة موظف',
  'uniform-cost': 'زي موحد',
  'disciplinary-penalty': 'جزاء تأديبي',
  other: 'أخرى',
};
const statusLabels = {
  draft: 'مسودة',
  'pending-approval': 'بانتظار الموافقة',
  approved: 'معتمد',
  processed: 'مُعالج',
  transferred: 'محوّل',
  paid: 'مدفوع',
  cancelled: 'ملغي',
};
const statusColorMap = {
  draft: 'default',
  'pending-approval': 'warning',
  approved: 'info',
  processed: 'primary',
  transferred: 'secondary',
  paid: 'success',
  cancelled: 'error',
};

const SalarySlip = () => {
  const { payrollId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSlip = useCallback(async () => {
    try {
      const data = await payrollService.getSalarySlip(payrollId || 'p1');
      setSlip(data);
    } catch (err) {
      logger.error('SalarySlip error:', err);
      setSlip(payrollService.getMockSlip());
    } finally {
      setLoading(false);
    }
  }, [payrollId]);

  useEffect(() => {
    loadSlip();
  }, [loadSlip]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html dir="rtl"><head><title>كشف راتب - ${slip?.employeeName}</title>
      <style>body{font-family:'Segoe UI',Tahoma,sans-serif;padding:30px;direction:rtl}
      table{width:100%;border-collapse:collapse;margin:10px 0}
      td,th{border:1px solid #ddd;padding:8px;text-align:right}
      th{background:#f5f5f5}h1,h2,h3{color:#1565c0}
      .header{text-align:center;border-bottom:3px solid #1565c0;padding-bottom:15px;margin-bottom:20px}
      .total{font-weight:bold;font-size:1.1em;background:#e3f2fd}
      .net{font-size:1.3em;color:#1565c0;font-weight:bold;text-align:center;padding:15px;border:2px solid #1565c0;margin-top:20px}
      @media print{body{padding:10px}}</style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  if (loading)
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل كشف الراتب...
        </Typography>
      </Container>
    );

  if (!slip)
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="error">لم يتم العثور على كشف الراتب</Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/hr/payroll')} sx={{ mt: 2 }}>
          العودة
        </Button>
      </Container>
    );

  const calc = slip.calculations || {};
  const att = slip.attendance || {};
  const ot = att.overtime || {};
  const pay = slip.payment || {};
  const incent = slip.incentives || {};
  const penal = slip.penalties || {};

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(-1)}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          العودة
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<PrintIcon />}
            variant="contained"
            onClick={handlePrint}
            sx={{ borderRadius: 2 }}
          >
            طباعة
          </Button>
          <Button startIcon={<DownloadIcon />} variant="outlined" sx={{ borderRadius: 2 }}>
            تصدير PDF
          </Button>
        </Box>
      </Box>

      {/* Printable Content */}
      <Card
        sx={{ borderRadius: 3, border: `2px solid ${surfaceColors.border}`, overflow: 'hidden' }}
        ref={printRef}
      >
        {/* Header */}
        <Box sx={{ background: gradients.primary, color: '#fff', py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <SlipIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  كشف الراتب الشهري
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  مركز الأوائل — قسم الموارد البشرية
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'left' }}>
              <Chip
                label={statusLabels[pay.status] || pay.status}
                color={statusColorMap[pay.status] || 'default'}
                sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}
              />
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {slip.month}
              </Typography>
            </Box>
          </Box>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {/* Employee Info */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonIcon color="primary" fontSize="small" />
                <Typography variant="body2" color="textSecondary">
                  اسم الموظف
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={700}>
                {slip.employeeName}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CalIcon color="primary" fontSize="small" />
                <Typography variant="body2" color="textSecondary">
                  الفترة
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={700}>
                {slip.month} / {slip.year}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                القسم
              </Typography>
              <Typography fontWeight={600}>{slip.departmentName}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                البريد الإلكتروني
              </Typography>
              <Typography fontWeight={600}>{slip.employeeEmail}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* Earnings - Left | Deductions - Right */}
          <Grid container spacing={3}>
            {/* Earnings Side */}
            <Grid item xs={6}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ mb: 2, color: statusColors.success }}
              >
                الأرباح والمزايا
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>الراتب الأساسي</TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={700}>{slip.baseSalary?.toLocaleString()}</Typography>
                    </TableCell>
                  </TableRow>
                  {slip.allowances?.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>{allowanceLabels[a.name] || a.name}</TableCell>
                      <TableCell align="left">{a.amount?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {incent.performanceBonus > 0 && (
                    <TableRow>
                      <TableCell>مكافأة أداء</TableCell>
                      <TableCell align="left">
                        {incent.performanceBonus?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )}
                  {incent.attendanceBonus > 0 && (
                    <TableRow>
                      <TableCell>مكافأة حضور</TableCell>
                      <TableCell align="left">{incent.attendanceBonus?.toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                  {incent.loyaltyBonus > 0 && (
                    <TableRow>
                      <TableCell>مكافأة ولاء</TableCell>
                      <TableCell align="left">{incent.loyaltyBonus?.toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                  {incent.projectBonus > 0 && (
                    <TableRow>
                      <TableCell>مكافأة مشروع</TableCell>
                      <TableCell align="left">{incent.projectBonus?.toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                  <TableRow sx={{ bgcolor: 'rgba(46,125,50,0.06)' }}>
                    <TableCell sx={{ fontWeight: 800 }}>إجمالي الأرباح</TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={800} sx={{ color: statusColors.success }}>
                        {calc.totalGross?.toLocaleString()} ر.س
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Grid>

            {/* Deductions Side */}
            <Grid item xs={6}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ mb: 2, color: statusColors.error }}
              >
                الخصومات والاستقطاعات
              </Typography>
              <Table size="small">
                <TableBody>
                  {slip.deductions?.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {deductionLabels[d.name] || d.name}
                        {d.percentage ? ` (${d.percentage}%)` : ''}
                      </TableCell>
                      <TableCell align="left">{d.amount?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {penal.disciplinary > 0 && (
                    <TableRow>
                      <TableCell>جزاء تأديبي</TableCell>
                      <TableCell align="left">{penal.disciplinary?.toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                  {penal.attendance > 0 && (
                    <TableRow>
                      <TableCell>خصم حضور</TableCell>
                      <TableCell align="left">{penal.attendance?.toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                  <TableRow sx={{ bgcolor: 'rgba(211,47,47,0.06)' }}>
                    <TableCell sx={{ fontWeight: 800 }}>إجمالي الخصومات</TableCell>
                    <TableCell align="left">
                      <Typography fontWeight={800} sx={{ color: statusColors.error }}>
                        {calc.totalDeductions?.toLocaleString()} ر.س
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Attendance */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            بيانات الحضور
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'أيام العمل', value: att.workingDays || 22 },
              { label: 'أيام الحضور', value: att.presentDays || 0 },
              { label: 'أيام الغياب', value: att.absentDays || 0 },
              { label: 'أيام الإجازة', value: att.leaveDays || 0 },
              { label: 'ساعات إضافية (عادي)', value: ot.regularOvertime || 0 },
              {
                label: 'ساعات إضافية (عطلة)',
                value: (ot.weekendOvertime || 0) + (ot.holidayOvertime || 0),
              },
            ].map((item, i) => (
              <Grid item xs={2} key={i}>
                <Card variant="outlined" sx={{ textAlign: 'center', py: 1, borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: brandColors.primary }}>
                    {item.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                    {item.label}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Net Payable */}
          <Card
            sx={{
              background: `linear-gradient(135deg, ${brandColors.primary}10, ${brandColors.primary}20)`,
              border: `2px solid ${brandColors.primary}`,
              borderRadius: 3,
              p: 3,
              textAlign: 'center',
            }}
          >
            <Typography variant="body1" sx={{ color: neutralColors.textSecondary, mb: 1 }}>
              صافي الراتب المستحق
            </Typography>
            <Typography variant="h3" fontWeight={900} sx={{ color: brandColors.primary }}>
              {calc.netPayable?.toLocaleString()} ر.س
            </Typography>
          </Card>

          {/* Payment Info */}
          {pay.paymentDate && (
            <Box
              sx={{
                mt: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                justifyContent: 'center',
              }}
            >
              <BankIcon sx={{ color: neutralColors.textSecondary }} />
              <Typography variant="body2" color="textSecondary">
                طريقة الدفع:{' '}
                {pay.paymentMethod === 'bank-transfer' ? 'تحويل بنكي' : pay.paymentMethod} |
                التاريخ: {pay.paymentDate} | المرجع: {pay.transactionReference}
              </Typography>
            </Box>
          )}

          {/* Approvals */}
          {slip.approvals && (
            <Box
              sx={{
                mt: 2,
                display: 'flex',
                justifyContent: 'space-around',
                pt: 2,
                borderTop: `1px solid ${surfaceColors.border}`,
              }}
            >
              {slip.approvals.preparedBy && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="textSecondary">
                    أعده
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {slip.approvals.preparedBy.name}
                  </Typography>
                  <Typography variant="caption">{slip.approvals.preparedBy.date}</Typography>
                </Box>
              )}
              {slip.approvals.approvedBy && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="textSecondary">
                    اعتمده
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {slip.approvals.approvedBy.name}
                  </Typography>
                  <Typography variant="caption">{slip.approvals.approvedBy.date}</Typography>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default SalarySlip;
