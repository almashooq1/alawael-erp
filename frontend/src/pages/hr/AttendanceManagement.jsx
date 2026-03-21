import { useState, useEffect, useCallback, useMemo } from 'react';



import hrService from 'services/hrService';
import zktecoService from 'services/zktecoService';
import { gradients, statusColors, neutralColors, surfaceColors, leaveColors } from '../../theme/palette';
import { DEPT_COLORS } from '../../constants/departmentColors';

/* ═══════════════════════════════════════════════
   Constants & Configuration
   ═══════════════════════════════════════════════ */

const DEPARTMENTS = [
  'تقنية المعلومات', 'الموارد البشرية', 'المالية', 'التعليم',
  'العلاج الطبيعي', 'العلاج الوظيفي', 'علاج النطق', 'الإدارة',
  'الخدمات المساندة', 'التأهيل', 'الإشراف', 'التمريض',
];

const STATUS_CONFIG = {
  present: { label: 'حاضر', color: 'success', icon: <PresentIcon sx={{ fontSize: 16 }} />, hex: statusColors.success },
  absent: { label: 'غائب', color: 'error', icon: <AbsentIcon sx={{ fontSize: 16 }} />, hex: statusColors.error },
  late: { label: 'متأخر', color: 'warning', icon: <LateIcon sx={{ fontSize: 16 }} />, hex: statusColors.warning },
  on_leave: { label: 'في إجازة', color: 'info', icon: <CalendarIcon sx={{ fontSize: 16 }} />, hex: statusColors.info },
  half_day: { label: 'نصف يوم', color: 'default', icon: <TimelapseIcon sx={{ fontSize: 16 }} />, hex: neutralColors.textDisabled },
};

const LEAVE_TYPE_CONFIG = {
  annual: { label: 'سنوية', color: leaveColors.annual, icon: '🏖️' },
  sick: { label: 'مرضية', color: leaveColors.sick, icon: '🏥' },
  emergency: { label: 'طارئة', color: leaveColors.emergency, icon: '🚨' },
  hajj: { label: 'حج', color: leaveColors.hajj, icon: '🕋' },
  maternity: { label: 'أمومة', color: leaveColors.maternity, icon: '👶' },
  unpaid: { label: 'بدون راتب', color: leaveColors.unpaid, icon: '📋' },
  bereavement: { label: 'عزاء', color: leaveColors.bereavement, icon: '🕊️' },
  study: { label: 'دراسية', color: leaveColors.study, icon: '📚' },
};

const LEAVE_STATUS_CONFIG = {
  pending: { label: 'قيد المراجعة', color: 'warning' },
  approved: { label: 'معتمد', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
  cancelled: { label: 'ملغي', color: 'default' },
};

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */

const getWorkHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return '—';
  try {
    const toMin = t => { const p = t.replace(/[^\d:]/g, '').split(':'); return parseInt(p[0]) * 60 + parseInt(p[1] || 0); };
    const diff = toMin(checkOut) - toMin(checkIn);
    if (diff <= 0) return '—';
    return `${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, '0')} ساعة`;
  } catch { return '—'; }
};

const getWorkHoursNumeric = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  try {
    const toMin = t => { const p = t.replace(/[^\d:]/g, '').split(':'); return parseInt(p[0]) * 60 + parseInt(p[1] || 0); };
    return Math.max(0, toMin(checkOut) - toMin(checkIn)) / 60;
  } catch { return 0; }
};

const getDeptColor = dept => DEPT_COLORS[dept] || neutralColors.fallback;

const formatArabicDate = dateStr => {
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
};

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */

const AttendanceManagement = () => {
  /* ─── Global State ─── */
  const [activeTab, setActiveTab] = useState(0);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  /* ─── Daily Tab State ─── */
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [actionLoading, setActionLoading] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  /* ─── ZKTeco ─── */
  const [zktecoStats, setZktecoStats] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);

  /* ─── Edit Dialog ─── */
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '', status: '', reason: '' });
  const [editLoading, setEditLoading] = useState(false);

  /* ─── Reports Tab ─── */
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportDept, setReportDept] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  /* ─── Leaves Tab ─── */
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState('');
  const [leavePage, setLeavePage] = useState(0);

  /* ─── Employee History Dialog ─── */
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* ═══════════════════════════════════════
     Data Loading
     ═══════════════════════════════════════ */

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    const res = await hrService.getAttendance(selectedDate);
    setRecords(Array.isArray(res.data) ? res.data : []);
    setIsDemo(res.isDemo);
    setLoading(false);
  }, [selectedDate]);

  const loadZktecoStats = useCallback(async () => {
    try {
      const res = await zktecoService.getStats();
      if (res.data && !res.isDemo) setZktecoStats(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadLeaves = useCallback(async () => {
    setLeavesLoading(true);
    const res = await hrService.getLeaves(leaveFilter);
    setLeaves(Array.isArray(res.data) ? res.data : []);
    setLeavesLoading(false);
  }, [leaveFilter]);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await hrService.getComprehensiveReport(reportStartDate, reportEndDate, reportDept);
      if (res.data && !res.isDemo) {
        setReportData(res.data);
      } else {
        // Generate demo report from daily data
        const demoRes = await hrService.getAttendance(reportEndDate);
        const demoRecords = Array.isArray(demoRes.data) ? demoRes.data : [];
        const deptStats = {};
        demoRecords.forEach(r => {
          const d = r.department || 'غير محدد';
          if (!deptStats[d]) deptStats[d] = { total: 0, present: 0, late: 0, absent: 0 };
          deptStats[d].total++;
          if (r.status === 'present') deptStats[d].present++;
          if (r.status === 'late') deptStats[d].late++;
          if (r.status === 'absent') deptStats[d].absent++;
        });
        setReportData({
          summary: {
            totalRecords: demoRecords.length,
            presentCount: demoRecords.filter(r => r.status === 'present').length,
            lateCount: demoRecords.filter(r => r.status === 'late').length,
            absentCount: demoRecords.filter(r => r.status === 'absent').length,
            totalWorkHours: demoRecords.reduce((s, r) => s + getWorkHoursNumeric(r.checkIn, r.checkOut), 0),
            totalOvertimeHours: demoRecords.reduce((s, r) => s + (parseFloat(r.overtime) || 0), 0),
            departmentStats: deptStats,
          },
          records: demoRecords,
          isDemo: true,
        });
      }
    } catch {
      setSnack({ open: true, message: 'فشل في تحميل التقرير', severity: 'error' });
    }
    setReportLoading(false);
  }, [reportStartDate, reportEndDate, reportDept]);

  const loadEmployeeHistory = useCallback(async (employee) => {
    setHistoryEmployee(employee);
    setHistoryLoading(true);
    try {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const res = await hrService.getEmployeeAttendance(employee._id || employee.employeeId, month, year);
      if (res.data && !res.isDemo && Array.isArray(res.data) && res.data.length > 0) {
        setHistoryRecords(res.data);
      } else {
        // Demo: generate 7-day history from current data
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const statuses = ['present', 'present', 'present', 'late', 'absent', 'present', 'on_leave'];
          const checkIns = ['07:50', '08:05', '07:45', '09:10', null, '07:55', null];
          const checkOuts = ['16:10', '16:30', '15:50', '16:00', null, '16:20', null];
          days.push({
            _id: `hist-${i}`,
            date: dateStr,
            checkIn: checkIns[i],
            checkOut: checkOuts[i],
            status: statuses[i],
            overtime: i === 1 ? 0.5 : 0,
            employeeName: employee.employeeName,
            department: employee.department,
          });
        }
        setHistoryRecords(days);
      }
    } catch {
      setHistoryRecords([]);
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => { loadAttendance(); loadZktecoStats(); }, [loadAttendance, loadZktecoStats]);

  useEffect(() => {
    if (activeTab === 1) loadReport();
  }, [activeTab, loadReport]);

  useEffect(() => {
    if (activeTab === 2) loadLeaves();
  }, [activeTab, loadLeaves]);

  /* ═══════════════════════════════════════
     Actions
     ═══════════════════════════════════════ */

  const handleZktecoSync = async () => {
    setSyncLoading(true);
    try {
      await zktecoService.syncAllDevices();
      setSnack({ open: true, message: 'تمت مزامنة أجهزة البصمة بنجاح', severity: 'success' });
      loadAttendance(); loadZktecoStats();
    } catch { setSnack({ open: true, message: 'فشل في مزامنة أجهزة البصمة', severity: 'error' }); }
    setSyncLoading(false);
  };

  const handleCheckIn = async (record) => {
    setActionLoading(`in-${record._id}`);
    try {
      await hrService.checkIn();
      const now = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      setRecords(prev => prev.map(r => r._id === record._id ? { ...r, checkIn: now, status: 'present' } : r));
      setSnack({ open: true, message: `تم تسجيل حضور ${record.employeeName}`, severity: 'success' });
    } catch { setSnack({ open: true, message: 'فشل في تسجيل الحضور', severity: 'error' }); }
    finally { setActionLoading(null); }
  };

  const handleCheckOut = async (record) => {
    setActionLoading(`out-${record._id}`);
    try {
      await hrService.checkOut();
      const now = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      setRecords(prev => prev.map(r => r._id === record._id ? { ...r, checkOut: now } : r));
      setSnack({ open: true, message: `تم تسجيل انصراف ${record.employeeName}`, severity: 'success' });
    } catch { setSnack({ open: true, message: 'فشل في تسجيل الانصراف', severity: 'error' }); }
    finally { setActionLoading(null); }
  };

  const handleEditOpen = (record) => {
    setEditItem(record);
    setEditForm({
      checkIn: record.checkIn || '',
      checkOut: record.checkOut || '',
      status: record.status || 'present',
      reason: '',
    });
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    try {
      await hrService.updateAttendanceRecord(editItem._id, {
        checkIn: editForm.checkIn || undefined,
        checkOut: editForm.checkOut || undefined,
        attendanceStatus: editForm.status,
        reason: editForm.reason,
      });
      // Optimistic update
      setRecords(prev => prev.map(r =>
        r._id === editItem._id ? { ...r, checkIn: editForm.checkIn, checkOut: editForm.checkOut, status: editForm.status } : r
      ));
      setSnack({ open: true, message: 'تم تحديث السجل بنجاح', severity: 'success' });
      setEditItem(null);
    } catch { setSnack({ open: true, message: 'فشل في تحديث السجل', severity: 'error' }); }
    setEditLoading(false);
  };

  const handleLeaveAction = async (leaveId, action) => {
    try {
      if (action === 'approve') {
        await hrService.approveLeave(leaveId);
        setSnack({ open: true, message: 'تم اعتماد الطلب', severity: 'success' });
      } else {
        await hrService.rejectLeave(leaveId, 'مرفوض من قبل الإدارة');
        setSnack({ open: true, message: 'تم رفض الطلب', severity: 'info' });
      }
      loadLeaves();
    } catch { setSnack({ open: true, message: 'فشل في تنفيذ الإجراء', severity: 'error' }); }
  };

  const handleExport = () => {
    const header = 'الموظف,رقم الموظف,القسم,الحضور,الانصراف,ساعات العمل,الإضافي,الحالة';
    const rows = filtered.map(r =>
      [r.employeeName, r.employeeId, r.department, r.checkIn || '', r.checkOut || '',
       getWorkHoursNumeric(r.checkIn, r.checkOut).toFixed(1),
       r.overtime || '0', (STATUS_CONFIG[r.status] || {}).label || r.status
      ].map(v => `"${v}"`).join(',')
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  /* ═══════════════════════════════════════
     Computed
     ═══════════════════════════════════════ */

  const filtered = useMemo(() => records.filter(r => {
    const name = `${r.employeeName || ''} ${r.employeeId || ''}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (deptFilter && r.department !== deptFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  }), [records, search, deptFilter, statusFilter]);

  const stats = useMemo(() => {
    const s = {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      onLeave: records.filter(r => r.status === 'on_leave').length,
      halfDay: records.filter(r => r.status === 'half_day').length,
    };
    s.attendanceRate = s.total > 0 ? Math.round(((s.present + s.late + s.halfDay) / s.total) * 100) : 0;
    s.totalOvertime = records.reduce((sum, r) => sum + (parseFloat(r.overtime) || 0), 0);
    return s;
  }, [records]);

  const pendingLeavesCount = useMemo(() =>
    leaves.filter(l => l.status === 'pending').length
  , [leaves]);

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 3, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TimeIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>إدارة الحضور والانصراف</Typography>
            <Typography variant="body2">تسجيل ومتابعة حضور الموظفين • التقارير والإحصائيات • الإجازات</Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth"
          sx={{ '& .MuiTab-root': { fontWeight: 700, fontSize: '0.9rem', py: 1.5 } }}>
          <Tab icon={<TodayIcon />} iconPosition="start" label="الحضور اليومي" />
          <Tab icon={<ReportIcon />} iconPosition="start" label="التقارير" />
          <Tab icon={<Badge badgeContent={pendingLeavesCount} color="error"><LeaveIcon /></Badge>}
            iconPosition="start" label="الإجازات" />
        </Tabs>
      </Paper>

      {/* ══════════════════════════════════════════════════════════
          TAB 0: Daily Attendance
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <>
          {/* Action bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={700}>سجل الحضور اليومي</Typography>
              <Typography variant="body2" color="text.secondary">متابعة حضور وانصراف الموظفين وإدارة السجلات</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              {isDemo && <Chip icon={<WarningIcon />} label="بيانات تجريبية" color="warning" size="small" />}
              <Tooltip title="تحديث"><IconButton onClick={loadAttendance} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} size="small">تصدير CSV</Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} size="small">طباعة</Button>
            </Box>
          </Box>

          {isDemo && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              يتم عرض بيانات تجريبية. عند توفر API المتصل بقاعدة البيانات سيتم تحميل البيانات الحقيقية تلقائياً.
            </Alert>
          )}

          {/* ZKTeco Banner */}
          {zktecoStats && zktecoStats.totalDevices > 0 && (
            <Paper elevation={0} sx={{
              p: 2, mb: 3, borderRadius: 3, border: '1px solid',
              borderColor: zktecoStats.online > 0 ? 'success.light' : 'warning.light',
              background: zktecoStats.online > 0
                ? 'linear-gradient(135deg, rgba(17,153,142,0.06), rgba(56,239,125,0.06))'
                : 'linear-gradient(135deg, rgba(255,193,7,0.06), rgba(255,152,0,0.06))',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}><FingerprintIcon fontSize="small" /></Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">أجهزة البصمة ZKTeco</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {zktecoStats.online} متصل من {zktecoStats.totalDevices} جهاز • {zktecoStats.todayBiometricCheckIns || 0} بصمة اليوم • {zktecoStats.totalMappedUsers || 0} موظف مربوط
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined"
                    startIcon={syncLoading ? <CircularProgress size={16} /> : <SyncIcon />}
                    onClick={handleZktecoSync} disabled={syncLoading}>
                    مزامنة البصمات
                  </Button>
                  <Button size="small" variant="text" startIcon={<FingerprintIcon />}
                    onClick={() => { window.location.href = '/hr/zkteco-devices'; }}>
                    إدارة الأجهزة
                  </Button>
                </Box>
              </Box>
            </Paper>
          )}

          {/* Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'إجمالي الموظفين', value: stats.total, color: statusColors.primaryBlue, icon: <PeopleIcon />, sub: selectedDate },
              { label: 'حاضرون', value: stats.present, color: statusColors.success, icon: <PresentIcon />, sub: 'تسجيل حضور' },
              { label: 'غائبون', value: stats.absent, color: statusColors.error, icon: <AbsentIcon />, sub: 'بدون تسجيل' },
              { label: 'متأخرون', value: stats.late, color: statusColors.warning, icon: <LateIcon />, sub: 'وصول متأخر' },
              { label: 'في إجازة', value: stats.onLeave, color: statusColors.info, icon: <CalendarIcon />, sub: 'إجازة مسجلة' },
              { label: 'نسبة الحضور', value: `${stats.attendanceRate}%`, color: statusColors.purple, icon: <TrendUpIcon />, sub: 'معدل اليوم', progress: stats.attendanceRate },
            ].map((s, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 3 } }}>
                  <CardContent sx={{ py: 1.5, px: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: s.progress !== undefined ? 1 : 0 }}>
                      <Avatar sx={{ bgcolor: `${s.color}15`, color: s.color, width: 42, height: 42 }}>{s.icon}</Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight={700} sx={{ color: s.color, lineHeight: 1.1 }}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{s.label}</Typography>
                      </Box>
                    </Box>
                    {s.progress !== undefined && (
                      <LinearProgress variant="determinate" value={s.progress}
                        sx={{ height: 6, borderRadius: 3, bgcolor: `${s.color}15`,
                          '& .MuiLinearProgress-bar': { bgcolor: s.color, borderRadius: 3 } }} />
                    )}
                    <Typography variant="caption" display="block" color="text.disabled" sx={{ fontSize: '0.6rem', mt: 0.3 }}>{s.sub}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Overtime Summary */}
          {stats.totalOvertime > 0 && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: `${statusColors.warning}40`, bgcolor: surfaceColors.warningLighter, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${statusColors.warning}25`, color: statusColors.warning }}><OvertimeIcon /></Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color={statusColors.warning}>إجمالي الوقت الإضافي اليوم</Typography>
                  <Typography variant="body2" color="text.secondary">{stats.totalOvertime.toFixed(1)} ساعة إضافية مسجلة لجميع الموظفين</Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {/* Filters */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={2.5}>
                <TextField fullWidth size="small" type="date" label="التاريخ" value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)} InputLabelProps={{ shrink: true }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><CalendarIcon color="action" sx={{ fontSize: 18 }} /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" placeholder="بحث بالاسم أو الرقم..."
                  value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12} sm={2.5}>
                <TextField fullWidth size="small" select label="القسم" value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(0); }}>
                  <MenuItem value="">الكل</MenuItem>
                  {DEPARTMENTS.map(d => (
                    <MenuItem key={d} value={d}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: DEPT_COLORS[d] || neutralColors.fallback }} /> {d}</Box></MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={2.5}>
                <TextField fullWidth size="small" select label="الحالة" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <MenuItem key={key} value={key}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{cfg.icon} {cfg.label}</Box></MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={1.5}>
                <Button fullWidth size="small" startIcon={<FilterListIcon />}
                  onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); }}>تعيين</Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : (
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحضور</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الانصراف</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ساعات العمل</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الإضافي</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                          <ScheduleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                          <Typography color="text.secondary">لا توجد سجلات حضور مطابقة</Typography>
                          <Typography variant="caption" color="text.disabled">حاول تغيير التاريخ أو معايير البحث</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(rec => {
                        const st = STATUS_CONFIG[rec.status] || STATUS_CONFIG.present;
                        const dc = getDeptColor(rec.department);
                        const hrs = getWorkHoursNumeric(rec.checkIn, rec.checkOut);
                        return (
                          <TableRow key={rec._id} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                            <TableCell onClick={() => setViewItem(rec)}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ bgcolor: `${dc}18`, color: dc, width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                                  {(rec.employeeName || '?')[0]}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>{rec.employeeName || '—'}</Typography>
                                  {rec.employeeId && <Typography variant="caption" color="text.secondary">{rec.employeeId}</Typography>}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={rec.department || '—'} size="small"
                                sx={{ bgcolor: `${dc}12`, color: dc, fontWeight: 600, fontSize: '0.7rem', border: `1px solid ${dc}25` }} />
                            </TableCell>
                            <TableCell>
                              {rec.checkIn ? <Chip label={rec.checkIn} size="small" color="success" variant="outlined" icon={<CheckInIcon sx={{ fontSize: 14 }} />} />
                                : <Typography variant="caption" color="text.disabled">—</Typography>}
                            </TableCell>
                            <TableCell>
                              {rec.checkOut ? <Chip label={rec.checkOut} size="small" color="error" variant="outlined" icon={<CheckOutIcon sx={{ fontSize: 14 }} />} />
                                : <Typography variant="caption" color="text.disabled">—</Typography>}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight={hrs > 0 ? 600 : 400} color={hrs >= 8 ? 'success.main' : hrs > 0 ? 'text.primary' : 'text.disabled'}>
                                  {getWorkHours(rec.checkIn, rec.checkOut)}
                                </Typography>
                                {hrs > 0 && (
                                  <LinearProgress variant="determinate" value={Math.min(100, (hrs / 8) * 100)}
                                    sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'action.hover',
                                      '& .MuiLinearProgress-bar': { bgcolor: hrs >= 8 ? statusColors.success : statusColors.warning, borderRadius: 2 } }} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {rec.overtime && parseFloat(rec.overtime) > 0 ? (
                                <Chip label={`${rec.overtime} ساعة`} size="small"
                                  sx={{ bgcolor: `${statusColors.warning}15`, color: statusColors.warning, fontWeight: 600, fontSize: '0.7rem' }}
                                  icon={<OvertimeIcon sx={{ fontSize: 14, color: statusColors.warning }} />} />
                              ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                            </TableCell>
                            <TableCell><Chip label={st.label} color={st.color} size="small" icon={st.icon} /></TableCell>
                            <TableCell align="center" onClick={e => e.stopPropagation()}>
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Tooltip title="عرض التفاصيل">
                                  <IconButton size="small" onClick={() => setViewItem(rec)}><ViewIcon fontSize="small" /></IconButton>
                                </Tooltip>
                                <Tooltip title="تعديل السجل">
                                  <IconButton size="small" onClick={() => handleEditOpen(rec)} color="primary"><EditIcon fontSize="small" /></IconButton>
                                </Tooltip>
                                <Tooltip title="سجل الموظف">
                                  <IconButton size="small" onClick={() => loadEmployeeHistory(rec)} color="secondary"><HistoryIcon fontSize="small" /></IconButton>
                                </Tooltip>
                                {!rec.checkIn && rec.status !== 'on_leave' && (
                                  <Button size="small" variant="contained" color="success" startIcon={<CheckInIcon />}
                                    onClick={() => handleCheckIn(rec)} disabled={!!actionLoading} sx={{ minWidth: 'auto', px: 1.5 }}>
                                    {actionLoading === `in-${rec._id}` ? <CircularProgress size={18} /> : 'حضور'}
                                  </Button>
                                )}
                                {rec.checkIn && !rec.checkOut && rec.status !== 'on_leave' && (
                                  <Button size="small" variant="outlined" color="error" startIcon={<CheckOutIcon />}
                                    onClick={() => handleCheckOut(rec)} disabled={!!actionLoading} sx={{ minWidth: 'auto', px: 1.5 }}>
                                    {actionLoading === `out-${rec._id}` ? <CircularProgress size={18} /> : 'انصراف'}
                                  </Button>
                                )}
                                {rec.checkIn && rec.checkOut && (
                                  <Chip label="مكتمل" size="small" color="default" icon={<PresentIcon sx={{ fontSize: 14 }} />} />
                                )}
                                {rec.status === 'on_leave' && (
                                  <Chip label="في إجازة" size="small" color="info" variant="outlined" />
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination component="div" count={filtered.length} page={page} onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                labelRowsPerPage="صفوف لكل صفحة:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`} />
            </Paper>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 1: Reports
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={700}>التقارير والإحصائيات</Typography>
              <Typography variant="body2" color="text.secondary">تقارير الحضور الشاملة حسب الفترة والقسم</Typography>
            </Box>
            <Button variant="contained" startIcon={reportLoading ? <CircularProgress size={16} color="inherit" /> : <ReportIcon />}
              onClick={loadReport} disabled={reportLoading}>تحميل التقرير</Button>
          </Box>

          {/* Report Filters */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" type="date" label="من تاريخ" value={reportStartDate}
                  onChange={e => setReportStartDate(e.target.value)} InputLabelProps={{ shrink: true }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><DateRangeIcon color="action" sx={{ fontSize: 18 }} /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" type="date" label="إلى تاريخ" value={reportEndDate}
                  onChange={e => setReportEndDate(e.target.value)} InputLabelProps={{ shrink: true }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><DateRangeIcon color="action" sx={{ fontSize: 18 }} /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" select label="القسم" value={reportDept} onChange={e => setReportDept(e.target.value)}>
                  <MenuItem value="">جميع الأقسام</MenuItem>
                  {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} size="large"
                  onClick={() => {
                    if (!reportData) return;
                    const s = reportData.summary || {};
                    const txt = `تقرير الحضور\nمن: ${reportStartDate}\nإلى: ${reportEndDate}\n\nإجمالي السجلات: ${s.totalRecords || 0}\nالحاضرون: ${s.presentCount || 0}\nالمتأخرون: ${s.lateCount || 0}\nالغائبون: ${s.absentCount || 0}\nإجمالي ساعات العمل: ${(s.totalWorkHours || 0).toFixed(1)}\nساعات إضافية: ${(s.totalOvertimeHours || 0).toFixed(1)}`;
                    const blob = new Blob(['\uFEFF' + txt], { type: 'text/plain;charset=utf-8' });
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                    a.download = `report-${reportStartDate}-${reportEndDate}.txt`; a.click();
                  }}>
                  تصدير التقرير
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {reportLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : reportData ? (
            <>
              {reportData.isDemo && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>هذا تقرير تجريبي مبني على البيانات اليومية المتاحة</Alert>
              )}

              {/* Report Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'إجمالي السجلات', value: reportData.summary?.totalRecords || 0, icon: <PeopleIcon />, color: statusColors.primaryBlue },
                  { label: 'حاضرون', value: reportData.summary?.presentCount || 0, icon: <PresentIcon />, color: statusColors.success },
                  { label: 'متأخرون', value: reportData.summary?.lateCount || 0, icon: <LateIcon />, color: statusColors.warning },
                  { label: 'غائبون', value: reportData.summary?.absentCount || 0, icon: <AbsentIcon />, color: statusColors.error },
                  { label: 'ساعات العمل', value: `${(reportData.summary?.totalWorkHours || 0).toFixed(0)}h`, icon: <TimeIcon />, color: statusColors.teal },
                  { label: 'ساعات إضافية', value: `${(reportData.summary?.totalOvertimeHours || 0).toFixed(1)}h`, icon: <OvertimeIcon />, color: statusColors.purple },
                ].map((c, i) => (
                  <Grid item xs={6} sm={4} md={2} key={i}>
                    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                      <CardContent sx={{ py: 2, px: 2, textAlign: 'center' }}>
                        <Avatar sx={{ bgcolor: `${c.color}15`, color: c.color, mx: 'auto', mb: 1 }}>{c.icon}</Avatar>
                        <Typography variant="h5" fontWeight={700} color={c.color}>{c.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Department Stats */}
              {reportData.summary?.departmentStats && Object.keys(reportData.summary.departmentStats).length > 0 && (
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 3 }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ChartIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>إحصائيات الأقسام</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">الإجمالي</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">حاضرون</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">متأخرون</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">غائبون</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">نسبة الحضور</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(reportData.summary.departmentStats).map(([dept, dStats]) => {
                          const rate = dStats.total > 0 ? Math.round(((dStats.present + dStats.late) / dStats.total) * 100) : 0;
                          const dc = getDeptColor(dept);
                          return (
                            <TableRow key={dept} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dc }} />
                                  <Typography variant="body2" fontWeight={600}>{dept}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center"><Typography variant="body2" fontWeight={600}>{dStats.total}</Typography></TableCell>
                              <TableCell align="center"><Chip label={dStats.present} size="small" color="success" variant="outlined" /></TableCell>
                              <TableCell align="center"><Chip label={dStats.late} size="small" color="warning" variant="outlined" /></TableCell>
                              <TableCell align="center"><Chip label={dStats.absent} size="small" color="error" variant="outlined" /></TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                                  <Typography variant="body2" fontWeight={700} color={rate >= 80 ? 'success.main' : rate >= 60 ? 'warning.main' : 'error.main'}>
                                    {rate}%
                                  </Typography>
                                  <LinearProgress variant="determinate" value={rate}
                                    sx={{ width: 50, height: 6, borderRadius: 3, bgcolor: 'action.hover',
                                      '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: rate >= 80 ? statusColors.success : rate >= 60 ? statusColors.warning : statusColors.error } }} />
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {/* Attendance Rate Visual Bar */}
              {reportData.summary && (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>توزيع الحالات</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'حاضر', value: reportData.summary.presentCount || 0, color: statusColors.success },
                      { label: 'متأخر', value: reportData.summary.lateCount || 0, color: statusColors.warning },
                      { label: 'غائب', value: reportData.summary.absentCount || 0, color: statusColors.error },
                    ].map((bar, idx) => {
                      const total = reportData.summary.totalRecords || 1;
                      const pct = Math.round((bar.value / total) * 100);
                      return (
                        <Grid item xs={12} sm={4} key={idx}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={600}>{bar.label}</Typography>
                            <Typography variant="body2" fontWeight={700} color={bar.color}>{bar.value} ({pct}%)</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={pct}
                            sx={{ height: 10, borderRadius: 5, bgcolor: `${bar.color}15`,
                              '& .MuiLinearProgress-bar': { bgcolor: bar.color, borderRadius: 5 } }} />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
              )}
            </>
          ) : (
            <Paper elevation={0} sx={{ p: 6, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
              <ReportIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">اختر الفترة واضغط "تحميل التقرير"</Typography>
              <Typography variant="body2" color="text.disabled">سيتم عرض إحصائيات شاملة عن الحضور والانصراف</Typography>
            </Paper>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: Leaves
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 2 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={700}>إدارة الإجازات</Typography>
              <Typography variant="body2" color="text.secondary">عرض ومعالجة طلبات الإجازة</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField size="small" select label="حالة الطلب" value={leaveFilter}
                onChange={e => { setLeaveFilter(e.target.value); setLeavePage(0); }} sx={{ minWidth: 150 }}>
                <MenuItem value="">الكل</MenuItem>
                {Object.entries(LEAVE_STATUS_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </TextField>
              <Tooltip title="تحديث"><IconButton onClick={loadLeaves} disabled={leavesLoading}><RefreshIcon /></IconButton></Tooltip>
            </Box>
          </Box>

          {/* Leave Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'إجمالي الطلبات', value: leaves.length, color: statusColors.primaryBlue, icon: <LeaveIcon /> },
              { label: 'قيد المراجعة', value: leaves.filter(l => l.status === 'pending').length, color: statusColors.warning, icon: <ScheduleIcon /> },
              { label: 'معتمدة', value: leaves.filter(l => l.status === 'approved').length, color: statusColors.success, icon: <EventAvailableIcon /> },
              { label: 'مرفوضة', value: leaves.filter(l => l.status === 'rejected').length, color: statusColors.error, icon: <EventBusyIcon /> },
            ].map((c, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ py: 1.5, px: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: `${c.color}15`, color: c.color }}>{c.icon}</Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight={700} color={c.color}>{c.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {leavesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : (
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>نوع الإجازة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>من</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>إلى</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">الأيام</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>السبب</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaves.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                          <LeaveIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                          <Typography color="text.secondary">لا توجد طلبات إجازة</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaves.slice(leavePage * 10, leavePage * 10 + 10).map(lv => {
                        const lt = LEAVE_TYPE_CONFIG[lv.leaveType] || LEAVE_TYPE_CONFIG.annual;
                        const ls = LEAVE_STATUS_CONFIG[lv.status] || LEAVE_STATUS_CONFIG.pending;
                        return (
                          <TableRow key={lv._id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ bgcolor: `${lt.color}18`, color: lt.color, width: 36, height: 36, fontSize: 16 }}>
                                  {(lv.employeeName || '?')[0]}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>{lv.employeeName || '—'}</Typography>
                                  <Typography variant="caption" color="text.secondary">{lv.employeeId}</Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={`${lt.icon} ${lt.label}`} size="small"
                                sx={{ bgcolor: `${lt.color}15`, color: lt.color, fontWeight: 600 }} />
                            </TableCell>
                            <TableCell><Typography variant="body2">{formatArabicDate(lv.startDate)}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{formatArabicDate(lv.endDate)}</Typography></TableCell>
                            <TableCell align="center">
                              <Chip label={`${lv.days} يوم`} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={lv.reason || ''}>
                                <Typography variant="body2" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {lv.reason || '—'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell><Chip label={ls.label} color={ls.color} size="small" /></TableCell>
                            <TableCell align="center">
                              {lv.status === 'pending' ? (
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                  <Tooltip title="اعتماد">
                                    <IconButton size="small" color="success" onClick={() => handleLeaveAction(lv._id, 'approve')}>
                                      <ApproveIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="رفض">
                                    <IconButton size="small" color="error" onClick={() => handleLeaveAction(lv._id, 'reject')}>
                                      <RejectIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.disabled">
                                  {lv.managerNote || '—'}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {leaves.length > 10 && (
                <TablePagination component="div" count={leaves.length} page={leavePage} onPageChange={(_, p) => setLeavePage(p)}
                  rowsPerPage={10} rowsPerPageOptions={[10]}
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`} />
              )}
            </Paper>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          DIALOGS
          ══════════════════════════════════════════════════════════ */}

      {/* View Detail Dialog */}
      <Dialog open={!!viewItem} onClose={() => setViewItem(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {viewItem && (() => {
          const st = STATUS_CONFIG[viewItem.status] || STATUS_CONFIG.present;
          const dc = getDeptColor(viewItem.department);
          const hrs = getWorkHoursNumeric(viewItem.checkIn, viewItem.checkOut);
          return (
            <>
              <Box sx={{ bgcolor: `${dc}10`, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: `${dc}25`, color: dc, width: 52, height: 52, fontSize: 20, fontWeight: 700 }}>
                      {(viewItem.employeeName || '?')[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>{viewItem.employeeName}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        {viewItem.employeeId && <Chip label={viewItem.employeeId} size="small" variant="outlined" />}
                        <Chip label={viewItem.department || '—'} size="small" sx={{ bgcolor: `${dc}15`, color: dc, fontWeight: 600 }} />
                      </Box>
                    </Box>
                  </Box>
                  <IconButton onClick={() => setViewItem(null)}><CloseIcon /></IconButton>
                </Box>
              </Box>
              <DialogContent sx={{ py: 3 }}>
                <Grid container spacing={2.5}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}><CheckInIcon color="success" sx={{ fontSize: 18 }} /><Typography variant="caption" color="text.secondary">وقت الحضور</Typography></Box>
                    <Typography variant="body1" fontWeight={600}>{viewItem.checkIn || 'لم يسجل'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}><CheckOutIcon color="error" sx={{ fontSize: 18 }} /><Typography variant="caption" color="text.secondary">وقت الانصراف</Typography></Box>
                    <Typography variant="body1" fontWeight={600}>{viewItem.checkOut || 'لم يسجل'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}><TimeIcon color="action" sx={{ fontSize: 18 }} /><Typography variant="caption" color="text.secondary">ساعات العمل</Typography></Box>
                    <Typography variant="body1" fontWeight={600}>{getWorkHours(viewItem.checkIn, viewItem.checkOut)}</Typography>
                    {hrs > 0 && (
                      <LinearProgress variant="determinate" value={Math.min(100, (hrs / 8) * 100)}
                        sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': { bgcolor: hrs >= 8 ? statusColors.successDeep : statusColors.warningDarker, borderRadius: 3 } }} />
                    )}
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}><OvertimeIcon color="warning" sx={{ fontSize: 18 }} /><Typography variant="caption" color="text.secondary">الوقت الإضافي</Typography></Box>
                    <Typography variant="body1" fontWeight={600}>{viewItem.overtime && parseFloat(viewItem.overtime) > 0 ? `${viewItem.overtime} ساعة` : 'لا يوجد'}</Typography>
                  </Grid>
                  <Grid item xs={12}><Divider sx={{ my: 0.5 }} /></Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">الحالة</Typography>
                    <Box sx={{ mt: 0.5 }}><Chip label={st.label} color={st.color} icon={st.icon} /></Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">التاريخ</Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedDate}</Typography>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions sx={{ p: 2.5 }}>
                <Button size="small" startIcon={<HistoryIcon />} onClick={() => { setViewItem(null); loadEmployeeHistory(viewItem); }}>سجل الموظف</Button>
                <Button size="small" startIcon={<EditIcon />} onClick={() => { setViewItem(null); handleEditOpen(viewItem); }}>تعديل</Button>
                <Box sx={{ flex: 1 }} />
                <Button onClick={() => setViewItem(null)}>إغلاق</Button>
                {!viewItem.checkIn && viewItem.status !== 'on_leave' && (
                  <Button variant="contained" color="success" startIcon={<CheckInIcon />}
                    onClick={() => { handleCheckIn(viewItem); setViewItem(null); }}>تسجيل حضور</Button>
                )}
                {viewItem.checkIn && !viewItem.checkOut && viewItem.status !== 'on_leave' && (
                  <Button variant="outlined" color="error" startIcon={<CheckOutIcon />}
                    onClick={() => { handleCheckOut(viewItem); setViewItem(null); }}>تسجيل انصراف</Button>
                )}
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Edit Attendance Dialog */}
      <Dialog open={!!editItem} onClose={() => setEditItem(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon color="primary" /> تعديل سجل الحضور
          {editItem && <Chip label={editItem.employeeName} size="small" sx={{ ml: 1 }} />}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="وقت الحضور" type="time" value={editForm.checkIn}
                onChange={e => setEditForm(f => ({ ...f, checkIn: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: <InputAdornment position="start"><CheckInIcon color="success" sx={{ fontSize: 18 }} /></InputAdornment> }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="وقت الانصراف" type="time" value={editForm.checkOut}
                onChange={e => setEditForm(f => ({ ...f, checkOut: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: <InputAdornment position="start"><CheckOutIcon color="error" sx={{ fontSize: 18 }} /></InputAdornment> }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth select label="الحالة" value={editForm.status}
                onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <MenuItem key={key} value={key}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{cfg.icon} {cfg.label}</Box></MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="سبب التعديل" placeholder="اذكر سبب التعديل اليدوي..."
                value={editForm.reason} onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditItem(null)}>إلغاء</Button>
          <Button variant="contained" startIcon={editLoading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleEditSave} disabled={editLoading || !editForm.reason}>
            حفظ التعديل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee History Dialog */}
      <Dialog open={!!historyEmployee} onClose={() => setHistoryEmployee(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="secondary" /> سجل حضور الموظف
          {historyEmployee && (
            <Box sx={{ display: 'flex', gap: 1, ml: 1, alignItems: 'center' }}>
              <Chip label={historyEmployee.employeeName} size="small" />
              <Chip label={historyEmployee.department} size="small" variant="outlined" />
            </Box>
          )}
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={() => setHistoryEmployee(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : historyRecords.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">لا توجد سجلات سابقة</Typography>
            </Box>
          ) : (
            <>
              {/* History Summary */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {(() => {
                  const p = historyRecords.filter(r => r.status === 'present').length;
                  const l = historyRecords.filter(r => r.status === 'late').length;
                  const a = historyRecords.filter(r => r.status === 'absent').length;
                  const t = historyRecords.length;
                  const rate = t > 0 ? Math.round(((p + l) / t) * 100) : 0;
                  return [
                    { label: 'حضور', value: p, color: statusColors.success },
                    { label: 'تأخر', value: l, color: statusColors.warning },
                    { label: 'غياب', value: a, color: statusColors.error },
                    { label: 'نسبة الحضور', value: `${rate}%`, color: statusColors.primaryBlue },
                  ].map((s, i) => (
                    <Grid item xs={3} key={i}>
                      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography variant="h6" fontWeight={700} color={s.color}>{s.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ));
                })()}
              </Grid>
              {/* History Table */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحضور</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الانصراف</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ساعات العمل</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الإضافي</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyRecords.map(rec => {
                      const st = STATUS_CONFIG[rec.status] || STATUS_CONFIG.present;
                      return (
                        <TableRow key={rec._id} hover>
                          <TableCell><Typography variant="body2" fontWeight={600}>{formatArabicDate(rec.date)}</Typography></TableCell>
                          <TableCell>{rec.checkIn ? <Chip label={rec.checkIn} size="small" color="success" variant="outlined" /> : <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                          <TableCell>{rec.checkOut ? <Chip label={rec.checkOut} size="small" color="error" variant="outlined" /> : <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                          <TableCell><Typography variant="body2">{getWorkHours(rec.checkIn, rec.checkOut)}</Typography></TableCell>
                          <TableCell>{rec.overtime && parseFloat(rec.overtime) > 0 ? <Chip label={`${rec.overtime}h`} size="small" color="warning" variant="outlined" /> : <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                          <TableCell><Chip label={st.label} color={st.color} size="small" icon={st.icon} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHistoryEmployee(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AttendanceManagement;
