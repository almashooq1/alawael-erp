/**
 * LeaveManagement — Custom Hook (state, data, actions)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import hrService from 'services/hrService';
import { neutralColors } from '../../theme/palette';
import { LEAVE_TYPE_MAP, LEAVE_BALANCES, STATUS_CONFIG, EMPTY_FORM } from './constants';
import { LeaveIcon } from 'utils/iconAliases';

export const useLeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tab, setTab] = useState(0);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // View detail
  const [viewItem, setViewItem] = useState(null);

  // Approve / Reject
  const [actionDialog, setActionDialog] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Snackbar
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  /* ─── Load ─── */
  const loadLeaves = useCallback(async () => {
    setLoading(true);
    const res = await hrService.getLeaves();
    setLeaves(Array.isArray(res.data) ? res.data : []);
    setIsDemo(res.isDemo);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  /* ─── Tab → Status mapping ─── */
  const tabStatus = ['all', 'pending', 'approved', 'rejected'][tab] || 'all';

  /* ─── Filtering ─── */
  const filtered = useMemo(
    () =>
      leaves.filter(l => {
        const name = `${l.employeeName || ''} ${l.employeeId || ''}`.toLowerCase();
        if (search && !name.includes(search.toLowerCase())) return false;
        if (tabStatus !== 'all' && l.status !== tabStatus) return false;
        if (typeFilter && l.leaveType !== typeFilter) return false;
        return true;
      }),
    [leaves, search, tabStatus, typeFilter]
  );

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const totalDays = leaves.reduce((sum, l) => sum + (l.days || 0), 0);
    return {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      totalDays,
    };
  }, [leaves]);

  /* ─── Balances ─── */
  const balances = useMemo(() => {
    const used = {};
    leaves
      .filter(l => l.status === 'approved')
      .forEach(l => {
        if (!used[l.leaveType]) used[l.leaveType] = 0;
        used[l.leaveType] += l.days || 0;
      });
    return Object.entries(LEAVE_BALANCES).map(([type, conf]) => ({
      type,
      label: conf.label,
      total: conf.total,
      used: used[type] || 0,
      remaining: conf.total - (used[type] || 0),
      color: LEAVE_TYPE_MAP[type]?.color || neutralColors.fallback,
    }));
  }, [leaves]);

  /* ─── Helpers ─── */
  const getLeaveTypeLabel = type => LEAVE_TYPE_MAP[type]?.label || type || '—';
  const getLeaveTypeColor = type => LEAVE_TYPE_MAP[type]?.color || neutralColors.fallback;
  const getLeaveTypeIcon = type =>
    LEAVE_TYPE_MAP[type]?.icon || <LeaveIcon sx={{ fontSize: 16 }} />;

  const getDaysDiff = (start, end) => {
    if (!start || !end) return 0;
    const diff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };
  const formatDays = (start, end) => {
    const d = getDaysDiff(start, end);
    return d > 0 ? `${d} يوم` : '—';
  };

  /* ─── Actions ─── */
  const openActionDialog = (leave, action) => {
    setActionDialog({ leave, action });
    setActionNote('');
  };

  const handleAction = async () => {
    if (!actionDialog) return;
    const { leave, action } = actionDialog;
    setActionLoading(leave._id);
    try {
      if (action === 'approve') {
        await hrService.approveLeave(leave._id);
        setLeaves(prev =>
          prev.map(l =>
            l._id === leave._id ? { ...l, status: 'approved', managerNote: actionNote } : l
          )
        );
        setSnack({
          open: true,
          message: `تمت الموافقة على إجازة ${leave.employeeName}`,
          severity: 'success',
        });
      } else {
        await hrService.rejectLeave(leave._id);
        setLeaves(prev =>
          prev.map(l =>
            l._id === leave._id ? { ...l, status: 'rejected', managerNote: actionNote } : l
          )
        );
        setSnack({ open: true, message: `تم رفض إجازة ${leave.employeeName}`, severity: 'info' });
      }
    } catch {
      setSnack({
        open: true,
        message: `فشل في ${action === 'approve' ? 'الموافقة' : 'الرفض'}`,
        severity: 'error',
      });
    } finally {
      setActionLoading(null);
      setActionDialog(null);
    }
  };

  const handleCreateLeave = async () => {
    if (!form.employeeName || !form.startDate || !form.endDate) {
      setSnack({
        open: true,
        message: 'يرجى تعبئة اسم الموظف وتاريخ البدء والنهاية',
        severity: 'warning',
      });
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setSnack({
        open: true,
        message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البدء',
        severity: 'warning',
      });
      return;
    }
    setSaving(true);
    try {
      const days = getDaysDiff(form.startDate, form.endDate);
      await hrService.createLeaveRequest({ ...form, days, status: 'pending' });
      setSnack({ open: true, message: 'تم تقديم طلب الإجازة بنجاح', severity: 'success' });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      loadLeaves();
    } catch {
      setSnack({ open: true, message: 'فشل في تقديم طلب الإجازة', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const header = 'الموظف,نوع الإجازة,من,إلى,المدة (أيام),الحالة,السبب';
    const rows = filtered.map(l =>
      [
        l.employeeName,
        getLeaveTypeLabel(l.leaveType),
        l.startDate,
        l.endDate,
        l.days || getDaysDiff(l.startDate, l.endDate),
        (STATUS_CONFIG[l.status] || {}).label || l.status,
        l.reason,
      ]
        .map(v => `"${v || ''}"`)
        .join(',')
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaves-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    // state
    leaves,
    loading,
    isDemo,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    tab,
    setTab,
    dialogOpen,
    setDialogOpen,
    form,
    setForm,
    saving,
    viewItem,
    setViewItem,
    actionDialog,
    setActionDialog,
    actionNote,
    setActionNote,
    actionLoading,
    snack,
    setSnack,
    // computed
    filtered,
    stats,
    balances,
    // helpers
    getLeaveTypeLabel,
    getLeaveTypeColor,
    getLeaveTypeIcon,
    getDaysDiff,
    formatDays,
    // actions
    loadLeaves,
    openActionDialog,
    handleAction,
    handleCreateLeave,
    handleExport,
  };
};
