/**
 * PayrollDashboard.jsx — لوحة تحكم الرواتب
 * MUI-based payroll management with hrService integration & demo fallback
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { hrService } from '../services/hrService';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
  Paper,
} from '@mui/material';


import { DEPT_COLORS } from '../constants/departmentColors';
import { statusColors, neutralColors, surfaceColors } from '../theme/palette';

/* ─── Constants ─── */

const STATUS_CONFIG = {
  'مُعالج': { label: 'مُعالج', color: 'success', icon: <ApprovedIcon fontSize="small" /> },
  معلق: { label: 'معلق', color: 'warning', icon: <PendingIcon fontSize="small" /> },
  مسودة: { label: 'مسودة', color: 'default', icon: <PendingIcon fontSize="small" /> },
  processed: { label: 'مُعالج', color: 'success', icon: <ApprovedIcon fontSize="small" /> },
  pending: { label: 'معلق', color: 'warning', icon: <PendingIcon fontSize="small" /> },
  draft: { label: 'مسودة', color: 'default', icon: <PendingIcon fontSize="small" /> },
};

const fmt = n => (n || 0).toLocaleString('ar-SA');

/* ─── Enhanced Demo Data ─── */
const DEMO_PAYROLL_ENHANCED = [
  { _id: 'p1', employeeId: 'EMP-2501', employeeName: 'أحمد محمد العتيبي', department: 'تقنية المعلومات', basicSalary: 12000, housingAllowance: 3000, transportAllowance: 1500, otherAllowance: 0, gosi: 1080, deductions: 200, netSalary: 15220, status: 'مُعالج' },
  { _id: 'p2', employeeId: 'EMP-2502', employeeName: 'سارة أحمد الغامدي', department: 'الموارد البشرية', basicSalary: 10000, housingAllowance: 2500, transportAllowance: 1000, otherAllowance: 500, gosi: 900, deductions: 150, netSalary: 12950, status: 'مُعالج' },
  { _id: 'p3', employeeId: 'EMP-2503', employeeName: 'خالد العلي الشهري', department: 'المالية', basicSalary: 11000, housingAllowance: 2750, transportAllowance: 1200, otherAllowance: 0, gosi: 990, deductions: 100, netSalary: 13860, status: 'معلق' },
  { _id: 'p4', employeeId: 'EMP-2504', employeeName: 'نورة السالم المطيري', department: 'التعليم', basicSalary: 9500, housingAllowance: 2500, transportAllowance: 1000, otherAllowance: 0, gosi: 855, deductions: 0, netSalary: 12145, status: 'مُعالج' },
  { _id: 'p5', employeeId: 'EMP-2505', employeeName: 'فهد الحربي', department: 'العلاج الطبيعي', basicSalary: 13000, housingAllowance: 3500, transportAllowance: 1500, otherAllowance: 800, gosi: 1170, deductions: 300, netSalary: 17330, status: 'مُعالج' },
  { _id: 'p6', employeeId: 'EMP-2506', employeeName: 'منى القحطاني', department: 'الإدارة', basicSalary: 14000, housingAllowance: 4000, transportAllowance: 2000, otherAllowance: 1000, gosi: 1260, deductions: 500, netSalary: 19240, status: 'مُعالج' },
  { _id: 'p7', employeeId: 'EMP-2507', employeeName: 'عبدالله الشمري', department: 'العلاج الوظيفي', basicSalary: 12500, housingAllowance: 3000, transportAllowance: 1500, otherAllowance: 0, gosi: 1125, deductions: 0, netSalary: 15875, status: 'معلق' },
  { _id: 'p8', employeeId: 'EMP-2508', employeeName: 'ريم الدوسري', department: 'علاج النطق', basicSalary: 11500, housingAllowance: 2800, transportAllowance: 1200, otherAllowance: 0, gosi: 1035, deductions: 200, netSalary: 14265, status: 'مُعالج' },
  { _id: 'p9', employeeId: 'EMP-2509', employeeName: 'محمد الغامدي', department: 'الخدمات المساندة', basicSalary: 8500, housingAllowance: 2000, transportAllowance: 800, otherAllowance: 0, gosi: 765, deductions: 0, netSalary: 10535, status: 'مُعالج' },
  { _id: 'p10', employeeId: 'EMP-2510', employeeName: 'لمياء العتيبي', department: 'التمريض', basicSalary: 10500, housingAllowance: 2500, transportAllowance: 1000, otherAllowance: 0, gosi: 945, deductions: 0, netSalary: 13055, status: 'مُعالج' },
];

/* ─── Component ─── */
const PayrollDashboard = () => {
  const showSnackbar = useSnackbar();
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [deptFilter, setDeptFilter] = useState('all');

  /* ─── Load Data ─── */
  const loadPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const [, year] = selectedMonth.split('-');
      const month = parseInt(selectedMonth.split('-')[1]);
      const { data, isDemo: demo } = await hrService.getPayroll(month, parseInt(year));
      if (data && data.length > 0) {
        setPayrollData(data);
        setIsDemo(demo);
      } else {
        setPayrollData(DEMO_PAYROLL_ENHANCED);
        setIsDemo(true);
      }
    } catch {
      setPayrollData(DEMO_PAYROLL_ENHANCED);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  /* ─── Computed Stats ─── */
  const filteredData = useMemo(() => {
    if (deptFilter === 'all') return payrollData;
    return payrollData.filter(p => p.department === deptFilter);
  }, [payrollData, deptFilter]);

  const stats = useMemo(() => {
    const totalGross = filteredData.reduce((s, p) => s + (p.basicSalary || 0) + (p.housingAllowance || 0) + (p.transportAllowance || 0) + (p.otherAllowance || 0), 0);
    const totalNet = filteredData.reduce((s, p) => s + (p.netSalary || 0), 0);
    const totalDeductions = filteredData.reduce((s, p) => s + (p.gosi || 0) + (p.deductions || 0), 0);
    const processed = filteredData.filter(p => p.status === 'مُعالج' || p.status === 'processed').length;
    const pending = filteredData.length - processed;
    const avgSalary = filteredData.length ? Math.round(totalNet / filteredData.length) : 0;
    return { totalGross, totalNet, totalDeductions, processed, pending, avgSalary, count: filteredData.length };
  }, [filteredData]);

  const departments = useMemo(() => {
    const set = new Set(payrollData.map(p => p.department).filter(Boolean));
    return Array.from(set).sort();
  }, [payrollData]);

  const deptBreakdown = useMemo(() => {
    const map = {};
    payrollData.forEach(p => {
      const dept = p.department || 'غير محدد';
      if (!map[dept]) map[dept] = { count: 0, totalNet: 0 };
      map[dept].count += 1;
      map[dept].totalNet += p.netSalary || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].totalNet - a[1].totalNet);
  }, [payrollData]);

  /* ─── Handlers ─── */
  const handleViewDetail = useCallback(emp => {
    setSelectedEmployee(emp);
    setDetailOpen(true);
  }, []);

  const handleProcessPayroll = useCallback(async () => {
    showSnackbar('جاري معالجة الرواتب...', 'info');
    setTimeout(() => {
      setPayrollData(prev => prev.map(p => ({ ...p, status: 'مُعالج' })));
      showSnackbar('تمت معالجة جميع الرواتب بنجاح', 'success');
    }, 1500);
  }, [showSnackbar]);

  const handleExportCSV = useCallback(() => {
    const headers = ['الموظف', 'القسم', 'الأساسي', 'البدلات', 'الخصومات', 'الصافي', 'الحالة'];
    const rows = filteredData.map(p => [
      p.employeeName,
      p.department || '',
      p.basicSalary,
      (p.housingAllowance || 0) + (p.transportAllowance || 0) + (p.otherAllowance || 0),
      (p.gosi || 0) + (p.deductions || 0),
      p.netSalary,
      p.status,
    ]);
    const bom = '\uFEFF';
    const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSnackbar('تم تصدير كشف الرواتب', 'success');
  }, [filteredData, selectedMonth, showSnackbar]);

  /* ─── Render ─── */
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }} dir="rtl">
      {/* Header */}
      <Paper
        sx={{
          p: 3, mb: 3, borderRadius: 3,
          background: `linear-gradient(135deg, ${statusColors.successDeep}ee, ${statusColors.success}99)`,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <MoneyIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">لوحة تحكم الرواتب</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                إدارة ومعالجة كشوف الرواتب الشهرية
                {isDemo && <Chip label="بيانات تجريبية" size="small" sx={{ ml: 1, bgcolor: 'rgba(255,255,255,0.25)', color: 'white', height: 20 }} />}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExportCSV}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white' } }}>
              تصدير CSV
            </Button>
            <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => window.print()}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white' } }}>
              طباعة
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الرواتب الصافية', val: `${fmt(stats.totalNet)} ر.س`, icon: <WalletIcon />, color: statusColors.successDeep, sub: `${stats.count} موظف` },
          { label: 'إجمالي الخصومات', val: `${fmt(stats.totalDeductions)} ر.س`, icon: <TrendIcon />, color: statusColors.errorDark, sub: 'تأمينات + خصومات' },
          { label: 'متوسط الراتب', val: `${fmt(stats.avgSalary)} ر.س`, icon: <ChartIcon />, color: statusColors.primaryBlue, sub: 'صافي الموظف' },
          { label: 'حالة المعالجة', val: `${stats.processed}/${stats.count}`, icon: <ApprovedIcon />, color: statusColors.warningDarker, sub: stats.pending > 0 ? `${stats.pending} معلق` : 'الكل مُعالج' },
        ].map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderRadius: 3, borderTop: `4px solid ${s.color}` }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: `${s.color}15`, color: s.color, width: 44, height: 44 }}>
                    {s.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    <Typography variant="h6" fontWeight="bold">{s.val}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.sub}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          type="month"
          label="الشهر"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          select
          label="القسم"
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">جميع الأقسام</MenuItem>
          {departments.map(d => (
            <MenuItem key={d} value={d}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: DEPT_COLORS[d] || neutralColors.textMuted }} />
                {d}
              </Box>
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="تحديث البيانات">
          <IconButton onClick={loadPayroll} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Button
          variant="contained"
          color="success"
          onClick={handleProcessPayroll}
          disabled={loading || stats.pending === 0}
          startIcon={<ApprovedIcon />}
          sx={{ borderRadius: 2 }}
        >
          معالجة الرواتب ({stats.pending})
        </Button>
      </Paper>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      {/* Payroll Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              {['الموظف', 'القسم', 'الراتب الأساسي', 'بدل السكن', 'بدل النقل', 'التأمينات', 'الخصومات', 'الصافي', 'الحالة', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography color="text.secondary" py={4}>لا توجد بيانات رواتب للشهر المحدد</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map(p => {
                const deptColor = DEPT_COLORS[p.department] || neutralColors.textMuted;
                const stConfig = STATUS_CONFIG[p.status] || STATUS_CONFIG['معلق'];
                return (
                  <TableRow key={p._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: `${deptColor}20`, color: deptColor, fontSize: 14 }}>
                          {p.employeeName?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{p.employeeName}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.employeeId}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.department} size="small" sx={{ bgcolor: `${deptColor}15`, color: deptColor, fontWeight: 'bold' }} />
                    </TableCell>
                    <TableCell>{fmt(p.basicSalary)}</TableCell>
                    <TableCell>{fmt(p.housingAllowance)}</TableCell>
                    <TableCell>{fmt(p.transportAllowance)}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{fmt(p.gosi || 0)}</TableCell>
                    <TableCell sx={{ color: 'error.main' }}>
                      {p.deductions ? `-${fmt(p.deductions)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold" color="success.main">{fmt(p.netSalary)} ر.س</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip icon={stConfig.icon} label={stConfig.label} size="small" color={stConfig.color} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton size="small" onClick={() => handleViewDetail(p)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Department Breakdown */}
      {deptBreakdown.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupsIcon color="primary" /> توزيع الرواتب حسب القسم
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {deptBreakdown.map(([dept, info]) => {
              const color = DEPT_COLORS[dept] || neutralColors.textMuted;
              const pct = stats.totalNet ? (info.totalNet / stats.totalNet) * 100 : 0;
              return (
                <Grid item xs={12} sm={6} md={4} key={dept}>
                  <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${color}30`, bgcolor: `${color}05` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold" sx={{ color }}>{dept}</Typography>
                      <Chip label={`${info.count} موظف`} size="small" sx={{ bgcolor: `${color}15`, color }} />
                    </Box>
                    <Typography variant="h6" fontWeight="bold">{fmt(info.totalNet)} ر.س</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(pct, 100)}
                      sx={{
                        mt: 1, height: 6, borderRadius: 3, bgcolor: `${color}15`,
                        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">{pct.toFixed(1)}% من الإجمالي</Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          تفاصيل راتب — {selectedEmployee?.employeeName}
        </DialogTitle>
        {selectedEmployee && (
          <DialogContent dividers>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={selectedEmployee.department}
                size="small"
                sx={{
                  bgcolor: `${DEPT_COLORS[selectedEmployee.department] || neutralColors.textMuted}15`,
                  color: DEPT_COLORS[selectedEmployee.department] || neutralColors.textMuted,
                  fontWeight: 'bold',
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {selectedEmployee.employeeId}
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {[
                { label: 'الراتب الأساسي', val: selectedEmployee.basicSalary, color: 'text.primary' },
                { label: 'بدل السكن', val: selectedEmployee.housingAllowance, color: 'info.main' },
                { label: 'بدل النقل', val: selectedEmployee.transportAllowance, color: 'info.main' },
                { label: 'بدلات أخرى', val: selectedEmployee.otherAllowance || 0, color: 'info.main' },
              ].map((item, i) => (
                <Grid item xs={6} key={i}>
                  <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: item.color }}>
                    {fmt(item.val)} ر.س
                  </Typography>
                </Grid>
              ))}
              <Grid item xs={12}><Divider /></Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">التأمينات (GOSI 9%)</Typography>
                <Typography variant="h6" color="warning.main">-{fmt(selectedEmployee.gosi || 0)} ر.س</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">خصومات أخرى</Typography>
                <Typography variant="h6" color="error.main">-{fmt(selectedEmployee.deductions || 0)} ر.س</Typography>
              </Grid>
              <Grid item xs={12}><Divider /></Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: surfaceColors.successLight, borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">الصافي المستحق</Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.dark">
                    {fmt(selectedEmployee.netSalary)} ر.س
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
        )}
        <DialogActions sx={{ p: 2 }}>
          <Button startIcon={<ReceiptIcon />}>إنشاء كشف</Button>
          <Button onClick={() => setDetailOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayrollDashboard;
