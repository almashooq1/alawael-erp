/**
 * useSessionsManagement — Custom hook for session state & logic
 * Wired to therapySessionsService (backend /api/therapy-sessions)
 */
import { useState, useEffect, useCallback } from 'react';
import therapySessionsService from '../../services/therapySessions.service';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { INITIAL_FORM, generateDemoSessions, getSessionType } from './constants';

const useSessionsManagement = () => {
  const showSnackbar = useSnackbar();

  // ─── State ───
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
  });

  // ─── Fetch Sessions ───
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page: page + 1, limit: rowsPerPage };
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;

      const res = await therapySessionsService.getSessions(params);
      const items = res?.sessions || res?.data || [];
      setSessions(items);
      setTotalCount(res?.pagination?.total || items.length);

      // Use server stats if provided, otherwise compute from items
      if (res?.stats) {
        setStats({
          total: res.stats.total ?? items.length,
          scheduled: res.stats.scheduled ?? 0,
          confirmed: res.stats.confirmed ?? 0,
          completed: res.stats.completed ?? 0,
          cancelled: (res.stats.cancelledByPatient ?? 0) + (res.stats.cancelledByCenter ?? 0),
          noShow: res.stats.noShow ?? 0,
        });
      } else {
        setStats({
          total: items.length,
          scheduled: items.filter(s => s.status === 'SCHEDULED').length,
          confirmed: items.filter(s => s.status === 'CONFIRMED').length,
          completed: items.filter(s => s.status === 'COMPLETED').length,
          cancelled: items.filter(
            s => s.status === 'CANCELLED_BY_PATIENT' || s.status === 'CANCELLED_BY_CENTER'
          ).length,
          noShow: items.filter(s => s.status === 'NO_SHOW').length,
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'فشل تحميل الجلسات');
      showSnackbar('فشل تحميل الجلسات — يتم عرض بيانات تجريبية', 'warning');
      const demo = generateDemoSessions();
      setSessions(demo);
      setTotalCount(demo.length);
      setStats({
        total: demo.length,
        scheduled: demo.filter(s => s.status === 'SCHEDULED').length,
        confirmed: demo.filter(s => s.status === 'CONFIRMED').length,
        completed: demo.filter(s => s.status === 'COMPLETED').length,
        cancelled: demo.filter(
          s => s.status === 'CANCELLED_BY_PATIENT' || s.status === 'CANCELLED_BY_CENTER'
        ).length,
        noShow: demo.filter(s => s.status === 'NO_SHOW').length,
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterType, filterStatus, showSnackbar]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ─── Handlers ───
  const handleOpenCreate = () => {
    setEditingSession(null);
    setForm(INITIAL_FORM);
    setFormError('');
    setOpenDialog(true);
  };

  const handleOpenEdit = session => {
    setEditingSession(session);
    setForm({
      title: session.title || '',
      type: getSessionType(session),
      date: session.date ? session.date.slice(0, 10) : '',
      startTime: session.startTime || '',
      endTime: session.endTime || '',
      participants: Array.isArray(session.participants)
        ? session.participants.map(p => p.name || p).join(', ')
        : '',
      recurrence: session.recurrence || 'none',
      notes: typeof session.notes === 'string' ? session.notes : session.notes?.subjective || '',
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('عنوان الجلسة مطلوب');
      return;
    }
    if (!form.date) {
      setFormError('تاريخ الجلسة مطلوب');
      return;
    }
    if (!form.startTime) {
      setFormError('وقت البداية مطلوب');
      return;
    }

    try {
      setSaving(true);
      setFormError('');
      const payload = {
        title: form.title,
        sessionType: form.type,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime || undefined,
        participants: form.participants
          ? form.participants
              .split(',')
              .map(p => ({ name: p.trim() }))
              .filter(p => p.name)
          : [],
        recurrence: form.recurrence,
        notes: form.notes || undefined,
      };

      if (editingSession) {
        await therapySessionsService.updateSession(
          editingSession._id || editingSession.id,
          payload
        );
      } else {
        await therapySessionsService.createSession(payload);
      }
      setOpenDialog(false);
      showSnackbar(editingSession ? 'تم تحديث الجلسة بنجاح' : 'تم إنشاء الجلسة بنجاح', 'success');
      fetchSessions();
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'فشل حفظ الجلسة');
      showSnackbar('فشل حفظ الجلسة', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await therapySessionsService.deleteSession(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      showSnackbar('تم حذف الجلسة بنجاح', 'success');
      fetchSessions();
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل حذف الجلسة');
      showSnackbar('فشل حذف الجلسة', 'error');
      setDeleteTarget(null);
    }
  };

  /** Cancel a session with reason */
  const handleCancel = async (sessionId, reason = '') => {
    try {
      await therapySessionsService.cancelSession(sessionId, reason, 'center');
      showSnackbar('تم إلغاء الجلسة', 'success');
      fetchSessions();
    } catch (err) {
      showSnackbar('فشل إلغاء الجلسة', 'error');
    }
  };

  /** Mark attendance */
  const handleMarkAttendance = async sessionId => {
    try {
      await therapySessionsService.markAttendance(sessionId, { attended: true });
      showSnackbar('تم تسجيل الحضور', 'success');
      fetchSessions();
    } catch (err) {
      showSnackbar('فشل تسجيل الحضور', 'error');
    }
  };

  /** Mark no-show */
  const handleMarkNoShow = async (sessionId, reason = '') => {
    try {
      await therapySessionsService.markNoShow(sessionId, reason);
      showSnackbar('تم تسجيل عدم الحضور', 'success');
      fetchSessions();
    } catch (err) {
      showSnackbar('فشل تسجيل عدم الحضور', 'error');
    }
  };

  /** Update status (generic) */
  const handleUpdateStatus = async (sessionId, status) => {
    try {
      await therapySessionsService.updateStatus(sessionId, status);
      showSnackbar('تم تحديث الحالة', 'success');
      fetchSessions();
    } catch (err) {
      showSnackbar('فشل تحديث الحالة', 'error');
    }
  };

  // ─── Client-side search on top of server filter ───
  const filtered = sessions.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      const title = (s.title || '').toLowerCase();
      const sType = getSessionType(s).toLowerCase();
      const participants = Array.isArray(s.participants)
        ? s.participants
            .map(p => p.name || p)
            .join(' ')
            .toLowerCase()
        : '';
      if (!title.includes(q) && !sType.includes(q) && !participants.includes(q)) return false;
    }
    return true;
  });

  return {
    // Data
    sessions,
    filtered,
    stats,
    totalCount,
    loading,
    error,
    // Search & filter
    search,
    setSearch,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    showFilters,
    setShowFilters,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    // Dialog
    openDialog,
    setOpenDialog,
    editingSession,
    form,
    setForm,
    saving,
    formError,
    // Delete
    deleteTarget,
    setDeleteTarget,
    // Actions
    fetchSessions,
    handleOpenCreate,
    handleOpenEdit,
    handleSave,
    handleDelete,
    handleCancel,
    handleMarkAttendance,
    handleMarkNoShow,
    handleUpdateStatus,
    setError,
  };
};

export default useSessionsManagement;
