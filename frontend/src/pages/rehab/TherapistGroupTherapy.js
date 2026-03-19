import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Chip,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Paper,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Groups as GroupIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Schedule as ScheduleIcon,
  EmojiPeople as ActivityIcon,
  Info as InfoIcon,
  PlayArrow as ActiveIcon,
  Pause as PausedIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const GROUP_TYPES = [
  { value: 'social-skills', label: 'مهارات اجتماعية', color: '#8b5cf6', icon: '👥' },
  { value: 'motor-skills', label: 'مهارات حركية', color: '#3b82f6', icon: '🏃' },
  { value: 'speech', label: 'نطق ولغة', color: '#10b981', icon: '🗣️' },
  { value: 'cognitive', label: 'مهارات إدراكية', color: '#f59e0b', icon: '🧠' },
  { value: 'behavioral', label: 'سلوكي', color: '#ef4444', icon: '💡' },
  { value: 'sensory', label: 'تكامل حسي', color: '#ec4899', icon: '👁️' },
  { value: 'life-skills', label: 'مهارات حياتية', color: '#06b6d4', icon: '🏠' },
];

const TherapistGroupTherapy = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState(null);
  const [participantDialog, setParticipantDialog] = useState(null);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    name: '',
    type: 'social-skills',
    maxParticipants: 8,
    schedule: { day: 'الأحد', time: '10:00', duration: 60 },
    goals: '',
    activities: '',
  });
  const [participantForm, setParticipantForm] = useState({ id: '', name: '' });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getGroups();
      setGroups(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchGroups error:', err);
      showSnackbar('خطأ في تحميل المجموعات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name) {
      showSnackbar('يرجى إدخال اسم المجموعة', 'warning');
      return;
    }
    try {
      const payload = {
        ...form,
        activities: form.activities ? form.activities.split('،').map(a => a.trim()) : [],
      };
      if (editData) {
        await therapistService.updateGroup(editData.id, payload);
        showSnackbar('تم تحديث المجموعة', 'success');
      } else {
        await therapistService.createGroup(payload);
        showSnackbar('تم إنشاء المجموعة', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchGroups();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleAddParticipant = async () => {
    if (!participantForm.id || !participantForm.name) {
      showSnackbar('يرجى ملء بيانات المشارك', 'warning');
      return;
    }
    try {
      await therapistService.addGroupParticipant(participantDialog.id, participantForm);
      showSnackbar('تمت إضافة المشارك', 'success');
      setParticipantDialog(null);
      setParticipantForm({ id: '', name: '' });
      fetchGroups();
    } catch (err) {
      showSnackbar(err?.message || 'خطأ في الإضافة', 'error');
    }
  };

  const handleRemoveParticipant = async (groupId, participantId) => {
    try {
      await therapistService.removeGroupParticipant(groupId, participantId);
      showSnackbar('تمت إزالة المشارك', 'success');
      fetchGroups();
    } catch (err) {
      showSnackbar('خطأ في الإزالة', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteGroup(id);
      showSnackbar('تم حذف المجموعة', 'success');
      fetchGroups();
    } catch (err) {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      type: 'social-skills',
      maxParticipants: 8,
      schedule: { day: 'الأحد', time: '10:00', duration: 60 },
      goals: '',
      activities: '',
    });
    setEditData(null);
  };

  const openEdit = item => {
    setEditData(item);
    setForm({
      name: item.name,
      type: item.type,
      maxParticipants: item.maxParticipants,
      schedule: item.schedule || { day: '', time: '', duration: 60 },
      goals: item.goals || '',
      activities: (item.activities || []).join('، '),
    });
    setDialogOpen(true);
  };

  const filtered = groups.filter(g => {
    const matchSearch = !search || g.name?.includes(search) || g.therapistName?.includes(search);
    const matchType = typeFilter === 'all' || g.type === typeFilter;
    return matchSearch && matchType;
  });

  const getType = v => GROUP_TYPES.find(t => t.value === v) || GROUP_TYPES[0];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <GroupIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              العلاج الجماعي
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة مجموعات العلاج الجماعي والمشاركين
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي المجموعات', value: stats.total || 0, color: '#059669' },
          { label: 'مجموعات نشطة', value: stats.active || 0, color: '#3b82f6' },
          { label: 'إجمالي المشاركين', value: stats.totalParticipants || 0, color: '#8b5cf6' },
          { label: 'متوسط المشاركين', value: stats.avgParticipants || 0, color: '#f59e0b' },
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

      {/* Toolbar */}
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
          <InputLabel>النوع</InputLabel>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} label="النوع">
            <MenuItem value="all">الكل</MenuItem>
            {GROUP_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>
                {t.icon} {t.label}
              </MenuItem>
            ))}
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
          sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
        >
          مجموعة جديدة
        </Button>
      </Paper>

      {/* List */}
      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <GroupIcon sx={{ fontSize: 48, color: '#059669', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا توجد مجموعات</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(g => {
            const type = getType(g.type);
            const occupancy = g.maxParticipants
              ? Math.round(((g.participants?.length || 0) / g.maxParticipants) * 100)
              : 0;
            return (
              <Grid item xs={12} md={6} lg={4} key={g.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${type.color}30`,
                    '&:hover': { boxShadow: 4 },
                    transition: '0.2s',
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{ bgcolor: `${type.color}15`, color: type.color, fontSize: '1.5rem' }}
                        >
                          {type.icon}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700} variant="body1">
                            {g.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {type.label}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={g.status === 'active' ? 'نشطة' : 'متوقفة'}
                        size="small"
                        icon={g.status === 'active' ? <ActiveIcon /> : <PausedIcon />}
                        sx={{
                          bgcolor: g.status === 'active' ? '#dcfce7' : '#f3f4f6',
                          color: g.status === 'active' ? '#16a34a' : '#6b7280',
                        }}
                      />
                    </Box>

                    {g.schedule && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                        <Typography variant="caption" color="text.secondary">
                          {g.schedule.day} - {g.schedule.time} ({g.schedule.duration} دقيقة)
                        </Typography>
                      </Box>
                    )}

                    {g.goals && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ my: 1, lineClamp: 2, overflow: 'hidden' }}
                      >
                        {g.goals}
                      </Typography>
                    )}

                    {/* Occupancy */}
                    <Box sx={{ mt: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>
                          المشاركين
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {g.participants?.length || 0} / {g.maxParticipants}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={occupancy}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#f3f4f6',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: occupancy >= 90 ? '#ef4444' : type.color,
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>

                    {/* Activities chips */}
                    {g.activities?.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
                        {g.activities.slice(0, 3).map((a, i) => (
                          <Chip
                            key={i}
                            label={a}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {g.activities.length > 3 && (
                          <Chip
                            label={`+${g.activities.length - 3}`}
                            size="small"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    )}

                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="إضافة مشارك">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setParticipantDialog(g)}
                          >
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="التفاصيل">
                          <IconButton size="small" onClick={() => setDetailDialog(g)}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(g)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => handleDelete(g.id)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {editData ? 'تعديل المجموعة' : 'مجموعة جديدة'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم المجموعة"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>نوع العلاج</InputLabel>
                <Select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  label="نوع العلاج"
                >
                  {GROUP_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="الحد الأقصى"
                value={form.maxParticipants}
                onChange={e => setForm({ ...form, maxParticipants: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="اليوم"
                value={form.schedule.day}
                onChange={e =>
                  setForm({ ...form, schedule: { ...form.schedule, day: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="الوقت"
                value={form.schedule.time}
                onChange={e =>
                  setForm({ ...form, schedule: { ...form.schedule, time: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="المدة (دقيقة)"
                value={form.schedule.duration}
                onChange={e =>
                  setForm({
                    ...form,
                    schedule: { ...form.schedule, duration: Number(e.target.value) },
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الأهداف"
                value={form.goals}
                onChange={e => setForm({ ...form, goals: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الأنشطة (مفصولة بفواصل)"
                value={form.activities}
                onChange={e => setForm({ ...form, activities: e.target.value })}
                helperText="اكتب الأنشطة مفصولة بفاصلة (،)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            {editData ? 'تحديث' : 'إنشاء المجموعة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Participant Dialog */}
      <Dialog
        open={!!participantDialog}
        onClose={() => setParticipantDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>إضافة مشارك</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="رقم المريض"
            value={participantForm.id}
            onChange={e => setParticipantForm({ ...participantForm, id: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="اسم المريض"
            value={participantForm.name}
            onChange={e => setParticipantForm({ ...participantForm, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setParticipantDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddParticipant} sx={{ bgcolor: '#059669' }}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {detailDialog?.name}
          <IconButton onClick={() => setDetailDialog(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailDialog && (
            <>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                المشاركون ({detailDialog.participants?.length || 0})
              </Typography>
              <List dense>
                {(detailDialog.participants || []).map((p, i) => (
                  <ListItem
                    key={i}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        color="error"
                        onClick={() => handleRemoveParticipant(detailDialog.id, p.id)}
                      >
                        <PersonRemoveIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{ bgcolor: '#059669', width: 32, height: 32, fontSize: '0.8rem' }}
                      >
                        {p.name?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={p.name} secondary={p.id} />
                  </ListItem>
                ))}
              </List>
              {detailDialog.goals && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    الأهداف
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {detailDialog.goals}
                  </Typography>
                </>
              )}
              {detailDialog.activities?.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    الأنشطة
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {detailDialog.activities.map((a, i) => (
                      <Chip key={i} label={a} size="small" />
                    ))}
                  </Box>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default TherapistGroupTherapy;
