/**
 * TelehealthSessionsPage — إدارة جلسات الطب عن بُعد
 *
 * Full CRUD: list, filter, search, create, edit, delete, change status, start session.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, Button, TextField, MenuItem, Select,
  FormControl, InputLabel, Chip, IconButton, Tooltip, Alert, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination,
  InputAdornment, Card, CardContent, Avatar,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, VideoCall as VideoCallIcon,
  PlayArrow as PlayIcon, Stop as StopIcon, Cancel as CancelIcon,
  Refresh as RefreshIcon, FilterList as FilterIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import telehealthService from '../../services/telehealthService';

const statusOptions = [
  { value: '', label: 'الكل' },
  { value: 'scheduled', label: 'مجدولة' },
  { value: 'in-progress', label: 'قيد التنفيذ' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'cancelled', label: 'ملغاة' },
];
const platformOptions = ['jitsi', 'zoom', 'teams', 'google_meet'];
const priorityOptions = [
  { value: 'normal', label: 'عادي', color: 'default' },
  { value: 'high', label: 'مرتفع', color: 'warning' },
  { value: 'urgent', label: 'عاجل', color: 'error' },
];
const statusColors = { scheduled: 'info', 'in-progress': 'warning', completed: 'success', cancelled: 'error' };
const statusLabels = { scheduled: 'مجدولة', 'in-progress': 'قيد التنفيذ', completed: 'مكتملة', cancelled: 'ملغاة' };

const emptyForm = {
  title: '', patientName: '', therapistName: '', scheduledDate: '',
  duration: 30, sessionType: 'video', platform: 'jitsi', priority: 'normal',
  department: '', notes: '',
};

export default function TelehealthSessionsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      };
      const { data } = await telehealthService.getSessions(params);
      if (data.success) {
        setSessions(data.data);
        setPagination((p) => ({ ...p, total: data.pagination?.total || 0 }));
      }
    } catch {
      setError('فشل تحميل الجلسات');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await telehealthService.getStats();
      if (data.success) setStats(data.data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleCreate = async () => {
    try {
      setError('');
      const payload = { ...form, duration: parseInt(form.duration) };
      if (editId) {
        await telehealthService.updateSession(editId, payload);
        setSuccess('تم تحديث الجلسة بنجاح');
      } else {
        await telehealthService.createSession(payload);
        setSuccess('تم إنشاء الجلسة بنجاح');
      }
      setFormOpen(false);
      setEditId(null);
      setForm(emptyForm);
      fetchSessions();
      fetchStats();
    } catch {
      setError('فشل حفظ الجلسة');
    }
  };

  const handleDelete = async () => {
    try {
      await telehealthService.deleteSession(deleteConfirm);
      setDeleteConfirm(null);
      setSuccess('تم حذف الجلسة');
      fetchSessions();
      fetchStats();
    } catch {
      setError('فشل حذف الجلسة');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await telehealthService.updateSessionStatus(id, status);
      setSuccess(`تم تغيير حالة الجلسة إلى ${statusLabels[status]}`);
      fetchSessions();
      fetchStats();
    } catch {
      setError('فشل تغيير الحالة');
    }
  };

  const handleStartSession = async (id) => {
    try {
      const { data } = await telehealthService.startSession(id);
      if (data.success && data.data?.room?.joinUrl) {
        window.open(data.data.room.joinUrl, '_blank');
      }
      setSuccess('تم بدء الجلسة — جارٍ فتح غرفة الفيديو');
      fetchSessions();
      fetchStats();
    } catch {
      setError('فشل بدء الجلسة');
    }
  };

  const openEdit = (session) => {
    setEditId(session.id);
    setForm({
      title: session.title || '',
      patientName: session.patientName || '',
      therapistName: session.therapistName || '',
      scheduledDate: session.scheduledDate ? session.scheduledDate.slice(0, 16) : '',
      duration: session.duration || 30,
      sessionType: session.sessionType || 'video',
      platform: session.platform || 'jitsi',
      priority: session.priority || 'normal',
      department: session.department || '',
      notes: session.notes || '',
    });
    setFormOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">📋 إدارة الجلسات</Typography>
        <Box>
          <Tooltip title="تحديث"><IconButton onClick={() => { fetchSessions(); fetchStats(); }}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(null); setForm(emptyForm); setFormOpen(true); }}>
            جلسة جديدة
          </Button>
        </Box>
      </Box>

      {/* Quick Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'الكل', value: stats.total, color: '#1976d2' },
            { label: 'مجدولة', value: stats.scheduled, color: '#0288d1' },
            { label: 'قيد التنفيذ', value: stats.inProgress, color: '#ed6c02' },
            { label: 'مكتملة', value: stats.completed, color: '#2e7d32' },
            { label: 'ملغاة', value: stats.cancelled, color: '#d32f2f' },
          ].map((s, i) => (
            <Grid item xs={6} sm={4} md={2.4} key={i}>
              <Card sx={{ textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="h5" fontWeight="bold">{s.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterIcon color="action" />
        <TextField
          size="small" placeholder="بحث بالعنوان أو الاسم..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 250 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>الحالة</InputLabel>
          <Select value={filters.status} label="الحالة" onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {/* Table */}
      {loading ? <LinearProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>العنوان</TableCell>
                <TableCell>المريض</TableCell>
                <TableCell>المعالج</TableCell>
                <TableCell>الموعد</TableCell>
                <TableCell>المدة</TableCell>
                <TableCell>المنصة</TableCell>
                <TableCell>الأولوية</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.title}</TableCell>
                  <TableCell>{s.patientName}</TableCell>
                  <TableCell>{s.therapistName}</TableCell>
                  <TableCell dir="ltr">
                    {new Date(s.scheduledDate).toLocaleDateString('ar-SA')}<br />
                    <Typography variant="caption">{new Date(s.scheduledDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</Typography>
                  </TableCell>
                  <TableCell>{s.duration} د</TableCell>
                  <TableCell><Chip label={s.platform} size="small" variant="outlined" /></TableCell>
                  <TableCell>
                    <Chip
                      label={priorityOptions.find((p) => p.value === s.priority)?.label || s.priority}
                      color={priorityOptions.find((p) => p.value === s.priority)?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={statusLabels[s.status]} color={statusColors[s.status]} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {s.status === 'scheduled' && (
                        <Tooltip title="بدء الجلسة">
                          <IconButton size="small" color="success" onClick={() => handleStartSession(s.id)}>
                            <PlayIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {s.status === 'in-progress' && (
                        <>
                          <Tooltip title="انضمام">
                            <IconButton size="small" color="primary" onClick={() => s.roomUrl && window.open(s.roomUrl, '_blank')}>
                              <VideoCallIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="إنهاء">
                            <IconButton size="small" color="error" onClick={() => handleStatusChange(s.id, 'completed')}>
                              <StopIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {s.status === 'scheduled' && (
                        <Tooltip title="إلغاء">
                          <IconButton size="small" color="warning" onClick={() => handleStatusChange(s.id, 'cancelled')}>
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => openEdit(s)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(s.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">لا توجد جلسات</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page - 1}
            rowsPerPage={pagination.limit}
            onPageChange={(_, p) => setPagination((prev) => ({ ...prev, page: p + 1 }))}
            onRowsPerPageChange={(e) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
            labelRowsPerPage="عدد الصفوف:"
            rowsPerPageOptions={[5, 10, 20, 50]}
          />
        </TableContainer>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'تعديل الجلسة' : 'جلسة جديدة'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="عنوان الجلسة" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="اسم المريض" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="اسم المعالج" value={form.therapistName} onChange={(e) => setForm({ ...form, therapistName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="القسم" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="الموعد" type="datetime-local" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="المدة (دقائق)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} inputProps={{ min: 5 }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth>
                <InputLabel>المنصة</InputLabel>
                <Select value={form.platform} label="المنصة" onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  {platformOptions.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth>
                <InputLabel>الأولوية</InputLabel>
                <Select value={form.priority} label="الأولوية" onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {priorityOptions.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select value={form.sessionType} label="النوع" onChange={(e) => setForm({ ...form, sessionType: e.target.value })}>
                  <MenuItem value="video">فيديو</MenuItem>
                  <MenuItem value="audio">صوتي</MenuItem>
                  <MenuItem value="chat">محادثة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.title || !form.patientName || !form.scheduledDate}>
            {editId ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف هذه الجلسة؟</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
