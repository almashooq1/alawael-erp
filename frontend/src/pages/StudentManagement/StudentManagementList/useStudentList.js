/**
 * useStudentList — all state, fetch, filter, sort, and handlers
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { gradients } from 'theme/palette';
import studentManagementService from 'services/studentManagementService';
import People from '@mui/icons-material/People';
import CheckCircle from '@mui/icons-material/CheckCircle';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Warning from '@mui/icons-material/Warning';

const useStudentList = () => {
  // ─── State ──────────────────────────────────
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [disabilityFilter, setDisabilityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('enrollmentDate');
  const [order, setOrder] = useState('desc');
  const [stats, setStats] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, student: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ─── Fetch ──────────────────────────────────
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [studentsRes, statsRes] = await Promise.allSettled([
        studentManagementService.getStudents(),
        studentManagementService.getStatistics(),
      ]);
      if (studentsRes.status === 'fulfilled') {
        const data = studentsRes.value?.data?.data || studentsRes.value?.data || [];
        setStudents(Array.isArray(data) ? data : []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value?.data?.data || statsRes.value?.data || null);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'فشل تحميل بيانات الطلاب');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ─── Sort & Filter ──────────────────────────
  const handleRequestSort = useCallback(
    property => {
      setOrder(prev => (orderBy === property && prev === 'asc' ? 'desc' : 'asc'));
      setOrderBy(property);
    },
    [orderBy]
  );

  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s => {
        const name =
          `${s.personalInfo?.firstName?.ar || ''} ${s.personalInfo?.lastName?.ar || ''}`.toLowerCase();
        const nid = (s.personalInfo?.nationalId || '').toLowerCase();
        const sid = (s.studentId || '').toLowerCase();
        return name.includes(q) || nid.includes(q) || sid.includes(q);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }

    // Disability filter
    if (disabilityFilter !== 'all') {
      result = result.filter(s => s.disabilityInfo?.primaryType === disabilityFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;
      switch (orderBy) {
        case 'name':
          aVal = `${a.personalInfo?.firstName?.ar || ''} ${a.personalInfo?.lastName?.ar || ''}`;
          bVal = `${b.personalInfo?.firstName?.ar || ''} ${b.personalInfo?.lastName?.ar || ''}`;
          break;
        case 'nationalId':
          aVal = a.personalInfo?.nationalId || '';
          bVal = b.personalInfo?.nationalId || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'enrollmentDate':
          aVal = a.center?.enrollmentDate || a.createdAt || '';
          bVal = b.center?.enrollmentDate || b.createdAt || '';
          break;
        default:
          aVal = '';
          bVal = '';
      }
      if (typeof aVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [students, searchQuery, statusFilter, disabilityFilter, orderBy, order]);

  const paginatedStudents = useMemo(
    () => filteredStudents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredStudents, page, rowsPerPage]
  );

  // ─── Handlers ───────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteDialog.student) return;
    try {
      await studentManagementService.deleteStudent(deleteDialog.student._id);
      setStudents(prev => prev.filter(s => s._id !== deleteDialog.student._id));
      setSnackbar({ open: true, message: 'تم حذف الطالب بنجاح', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'فشل حذف الطالب', severity: 'error' });
    } finally {
      setDeleteDialog({ open: false, student: null });
    }
  }, [deleteDialog.student]);

  const handleExport = useCallback(async () => {
    try {
      const res = await studentManagementService.exportStudents();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `students_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'تم التصدير بنجاح', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'فشل تصدير البيانات', severity: 'error' });
    }
  }, []);

  // ─── Stats Cards ────────────────────────────
  const statCards = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => s.status === 'active').length;
    const newThisMonth = students.filter(s => {
      const d = new Date(s.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return [
      {
        label: 'إجمالي الطلاب',
        value: stats?.totalStudents ?? total,
        icon: <People />,
        gradient: gradients.primary,
      },
      {
        label: 'الطلاب النشطون',
        value: stats?.activeStudents ?? active,
        icon: <CheckCircle />,
        gradient: gradients.success,
      },
      {
        label: 'تسجيل هذا الشهر',
        value: stats?.newThisMonth ?? newThisMonth,
        icon: <TrendingUp />,
        gradient: gradients.info,
      },
      {
        label: 'يحتاجون متابعة',
        value: stats?.needsAttention ?? 0,
        icon: <Warning />,
        gradient: gradients.warning,
      },
    ];
  }, [students, stats]);

  return {
    students,
    loading,
    error,
    stats,
    filteredStudents,
    paginatedStudents,
    statCards,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    disabilityFilter,
    setDisabilityFilter,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    orderBy,
    order,
    handleRequestSort,
    deleteDialog,
    setDeleteDialog,
    handleDelete,
    snackbar,
    setSnackbar,
    fetchStudents,
    handleExport,
  };
};

export default useStudentList;
