import { useState, useEffect } from 'react';




import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

const PLATFORMS = [
  { value: 'zoom', label: 'Zoom', icon: '📹' },
  { value: 'teams', label: 'Microsoft Teams', icon: '💼' },
  { value: 'internal', label: 'النظام الداخلي', icon: '🏥' },
  { value: 'google-meet', label: 'Google Meet', icon: '🟢' },
];

const SESSION_TYPES = [
  { value: 'video', label: 'فيديو', icon: <VideoIcon />, color: '#3b82f6' },
  { value: 'audio', label: 'صوتي', icon: <AudioIcon />, color: '#8b5cf6' },
  { value: 'chat', label: 'محادثة', icon: <ChatIcon />, color: '#10b981' },
  { value: 'hybrid', label: 'مختلط', icon: <VideoIcon />, color: '#f59e0b' },
];

const TherapistTelehealth = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    title: '',
    patientName: '',
    therapistName: '',
    sessionType: 'video',
    platform: 'zoom',
    scheduledDate: '',
    duration: 45,
    roomUrl: '',
    notes: '',
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getTelehealthSessions();
      setSessions(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchTelehealth error:', err);
      showSnackbar('خطأ في تحميل الجلسات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.patientName) {
      showSnackbar('يرجى إدخال عنوان الجلسة واسم المريض', 'warning');
      return;
    }
    try {
      if (editData) {
        await therapistService.updateTelehealthSession(editData.id, form);
        showSnackbar('تم تحديث الجلسة', 'success');
      } else {
        await therapistService.createTelehealthSession(form);
        showSnackbar('تم إنشاء الجلسة', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchSessions();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await therapistService.updateTelehealthStatus(id, status);
      showSnackbar('تم تحديث الحالة', 'success');
      fetchSessions();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteTelehealthSession(id);
      showSnackbar('تم حذف الجلسة', 'success');
      fetchSessions();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      patientName: '',
      therapistName: '',
      sessionType: 'video',
      platform: 'zoom',
      scheduledDate: '',
      duration: 45,
      roomUrl: '',
      notes: '',
    });
    setEditData(null);
  };

  const openEdit = item => {
    setEditData(item);
    setForm({
      title: item.title,
      patientName: item.patientName,
      therapistName: item.therapistName || '',
      sessionType: item.sessionType,
      platform: item.platform,
      duration: item.duration || 45,
      scheduledDate: item.scheduledDate
        ? new Date(item.scheduledDate).toISOString().slice(0, 16)
        : '',
      roomUrl: item.roomUrl || '',
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const filtered = sessions.filter(s => {
    const matchSearch = !search || s.title?.includes(search) || s.patientName?.includes(search);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getSessionType = v => SESSION_TYPES.find(t => t.value === v) || SESSION_TYPES[0];
  const getPlatform = v => PLATFORMS.find(p => p.value === v) || PLATFORMS[0];
  const statusMap = {
    scheduled: { label: 'مجدولة', color: '#3b82f6' },
    'in-progress': { label: 'جارية', color: '#f59e0b' },
    completed: { label: 'مكتملة', color: '#22c55e' },
    cancelled: { label: 'ملغية', color: '#ef4444' },
  };
  const getStatus = v => statusMap[v] || { label: v, color: '#6b7280' };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0d9488 0%, #5eead4 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <VideoIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              العلاج عن بُعد
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة جلسات العلاج الافتراضية والتواصل المرئي
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الجلسات', value: stats.total || 0, color: '#0d9488' },
          { label: 'مجدولة', value: stats.scheduled || 0, color: '#3b82f6' },
          { label: 'مكتملة', value: stats.completed || 0, color: '#22c55e' },
          { label: 'ملغية', value: stats.cancelled || 0, color: '#ef4444' },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Paper
              sx={{ p: 2, textAlign: 'center', borderRadius: 2, border: `2px solid ${s.color}20` }}
            >
              <Typography variant="h4" fontWeight={800} color={s.color}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          size="small"
          placeholder="بحث..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            label="الحالة"
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="scheduled">مجدولة</MenuItem>
            <MenuItem value="in-progress">جارية</MenuItem>
            <MenuItem value="completed">مكتملة</MenuItem>
            <MenuItem value="cancelled">ملغية</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          sx={{ bgcolor: '#0d9488', '&:hover': { bgcolor: '#0f766e' } }}
        >
          جلسة جديدة
        </Button>
      </Paper>

      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <VideoIcon sx={{ fontSize: 48, color: '#0d9488', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا توجد جلسات</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(s => {
            const type = getSessionType(s.sessionType);
            const platform = getPlatform(s.platform);
            const status = getStatus(s.status);
            return (
              <Grid item xs={12} md={6} lg={4} key={s.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${type.color}25`,
                    '&:hover': { boxShadow: 4 },
                    transition: '0.2s',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: `${type.color}12`, width: 40, height: 40 }}>
                          {type.icon}
                        </Avatar>
                        <Typography fontWeight={700} sx={{ fontSize: '0.95rem' }}>
                          {s.title}
                        </Typography>
                      </Box>
                      <Chip
                        label={status.label}
                        size="small"
                        sx={{ bgcolor: `${status.color}12`, color: status.color, fontWeight: 600 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PatientIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">{s.patientName}</Typography>
                    </Box>
                    {s.scheduledDate && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {new Date(s.scheduledDate).toLocaleString('ar-SA')}
                        </Typography>
                        <Chip
                          label={`${s.duration} دقيقة`}
                          size="small"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                      <Chip
                        label={`${platform.icon} ${platform.label}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                      <Chip
                        label={type.label}
                        size="small"
                        sx={{ bgcolor: `${type.color}10`, color: type.color, fontSize: '0.7rem' }}
                      />
                    </Box>
                    {s.roomUrl && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <LinkIcon sx={{ fontSize: 14, color: '#0d9488' }} />
                        <Typography
                          variant="caption"
                          color="#0d9488"
                          sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => window.open(s.roomUrl, '_blank')}
                        >
                          رابط الجلسة
                        </Typography>
                      </Box>
                    )}
                    {s.rating && (
                      <Rating
                        value={s.rating}
                        readOnly
                        size="small"
                        precision={0.5}
                        sx={{ mb: 1 }}
                      />
                    )}
                    {s.notes && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1 }}
                      >
                        {s.notes}
                      </Typography>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        {s.status === 'scheduled' && (
                          <>
                            <Tooltip title="بدء الجلسة">
                              <IconButton
                                size="small"
                                sx={{ color: '#0d9488' }}
                                onClick={() => handleStatusChange(s.id, 'in-progress')}
                              >
                                <StartIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="إلغاء">
                              <IconButton
                                size="small"
                                sx={{ color: '#ef4444' }}
                                onClick={() => handleStatusChange(s.id, 'cancelled')}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {s.status === 'in-progress' && (
                          <Tooltip title="إكمال">
                            <IconButton
                              size="small"
                              sx={{ color: '#22c55e' }}
                              onClick={() => handleStatusChange(s.id, 'completed')}
                            >
                              <CompleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      <Box>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(s)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {editData ? 'تعديل الجلسة' : 'جلسة جديدة عن بُعد'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان الجلسة"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم المريض"
                value={form.patientName}
                onChange={e => setForm({ ...form, patientName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم المعالج"
                value={form.therapistName}
                onChange={e => setForm({ ...form, therapistName: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>نوع الجلسة</InputLabel>
                <Select
                  value={form.sessionType}
                  onChange={e => setForm({ ...form, sessionType: e.target.value })}
                  label="نوع الجلسة"
                >
                  {SESSION_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>المنصة</InputLabel>
                <Select
                  value={form.platform}
                  onChange={e => setForm({ ...form, platform: e.target.value })}
                  label="المنصة"
                >
                  {PLATFORMS.map(p => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.icon} {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="المدة (دقيقة)"
                value={form.duration}
                onChange={e => setForm({ ...form, duration: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="الموعد"
                value={form.scheduledDate}
                onChange={e => setForm({ ...form, scheduledDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="رابط الجلسة"
                value={form.roomUrl}
                onChange={e => setForm({ ...form, roomUrl: e.target.value })}
                placeholder="https://..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#0d9488', '&:hover': { bgcolor: '#0f766e' } }}
          >
            {editData ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistTelehealth;
