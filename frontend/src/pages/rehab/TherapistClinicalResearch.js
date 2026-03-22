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
  ListItemIcon,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Science as ResearchIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Publish as PublishIcon,
  People as TeamIcon,
  CalendarToday as DateIcon,
  CheckCircle as CompletedIcon,
  HourglassTop as InProgressIcon,
  PlayArrow as PlanningIcon,
  Description as AbstractIcon,
  Label as TagIcon,
  MenuBook as JournalIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const FIELDS = [
  { id: 'physical-rehab', label: 'التأهيل البدني', color: '#3b82f6', icon: '🏃' },
  { id: 'neuro-rehab', label: 'التأهيل العصبي', color: '#8b5cf6', icon: '🧠' },
  { id: 'speech-lang', label: 'النطق واللغة', color: '#10b981', icon: '🗣️' },
  { id: 'occupational', label: 'العلاج الوظيفي', color: '#f59e0b', icon: '🤲' },
  { id: 'behavioral', label: 'العلاج السلوكي', color: '#ef4444', icon: '💡' },
  { id: 'pediatric', label: 'تأهيل الأطفال', color: '#ec4899', icon: '👶' },
];

const STATUSES = [
  { value: 'planning', label: 'تخطيط', color: '#6b7280', icon: <PlanningIcon /> },
  { value: 'in-progress', label: 'قيد التنفيذ', color: '#3b82f6', icon: <InProgressIcon /> },
  { value: 'data-collection', label: 'جمع البيانات', color: '#f59e0b', icon: <AbstractIcon /> },
  { value: 'analysis', label: 'تحليل', color: '#8b5cf6', icon: <ResearchIcon /> },
  { value: 'completed', label: 'مكتمل', color: '#22c55e', icon: <CompletedIcon /> },
  { value: 'published', label: 'منشور', color: '#059669', icon: <PublishIcon /> },
];

const TherapistClinicalResearch = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [research, setResearch] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState(null);
  const [pubDialog, setPubDialog] = useState(null);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    title: '',
    titleEn: '',
    field: 'physical-rehab',
    principal: '',
    team: '',
    startDate: '',
    endDate: '',
    abstract: '',
    methodology: '',
    sampleSize: '',
    tags: '',
  });
  const [pubName, setPubName] = useState('');

  useEffect(() => {
    fetchResearch();
  }, []);

  const fetchResearch = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getResearch();
      setResearch(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchResearch error:', err);
      showSnackbar('خطأ في تحميل الأبحاث', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title) {
      showSnackbar('يرجى إدخال عنوان البحث', 'warning');
      return;
    }
    try {
      const payload = {
        ...form,
        team: form.team ? form.team.split('،').map(t => t.trim()) : [],
        tags: form.tags ? form.tags.split('،').map(t => t.trim()) : [],
        sampleSize: form.sampleSize ? Number(form.sampleSize) : undefined,
      };
      if (editData) {
        await therapistService.updateResearch(editData.id, payload);
        showSnackbar('تم تحديث البحث', 'success');
      } else {
        await therapistService.createResearch(payload);
        showSnackbar('تم إنشاء البحث', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchResearch();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleAddPublication = async () => {
    if (!pubName) {
      showSnackbar('يرجى إدخال اسم المنشور', 'warning');
      return;
    }
    try {
      await therapistService.addResearchPublication(pubDialog.id, pubName);
      showSnackbar('تمت إضافة المنشور', 'success');
      setPubDialog(null);
      setPubName('');
      fetchResearch();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteResearch(id);
      showSnackbar('تم حذف البحث', 'success');
      fetchResearch();
    } catch (err) {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      titleEn: '',
      field: 'physical-rehab',
      principal: '',
      team: '',
      startDate: '',
      endDate: '',
      abstract: '',
      methodology: '',
      sampleSize: '',
      tags: '',
    });
    setEditData(null);
  };

  const openEdit = item => {
    setEditData(item);
    setForm({
      title: item.title,
      titleEn: item.titleEn || '',
      field: item.field,
      principal: item.principal || '',
      team: (item.team || []).join('، '),
      startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
      endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
      abstract: item.abstract || '',
      methodology: item.methodology || '',
      sampleSize: item.sampleSize || '',
      tags: (item.tags || []).join('، '),
    });
    setDialogOpen(true);
  };

  const filtered = research.filter(r => {
    const matchSearch =
      !search ||
      r.title?.includes(search) ||
      r.titleEn?.toLowerCase().includes(search.toLowerCase()) ||
      r.principal?.includes(search);
    const matchField = fieldFilter === 'all' || r.field === fieldFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchField && matchStatus;
  });

  const getField = v => FIELDS.find(f => f.id === v) || FIELDS[0];
  const getStatus = v => STATUSES.find(s => s.value === v) || STATUSES[0];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #4338ca 0%, #818cf8 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <ResearchIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              البحث السريري
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة الأبحاث والدراسات السريرية ومتابعة المنشورات
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الأبحاث', value: stats.total || 0, color: '#4338ca' },
          { label: 'قيد التنفيذ', value: stats.inProgress || 0, color: '#3b82f6' },
          { label: 'مكتملة', value: stats.completed || 0, color: '#22c55e' },
          { label: 'المنشورات', value: stats.published || 0, color: '#f59e0b' },
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
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>المجال</InputLabel>
          <Select value={fieldFilter} onChange={e => setFieldFilter(e.target.value)} label="المجال">
            <MenuItem value="all">الكل</MenuItem>
            {FIELDS.map(f => (
              <MenuItem key={f.id} value={f.id}>
                {f.icon} {f.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            label="الحالة"
          >
            <MenuItem value="all">الكل</MenuItem>
            {STATUSES.map(s => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
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
          sx={{ bgcolor: '#4338ca', '&:hover': { bgcolor: '#3730a3' } }}
        >
          بحث جديد
        </Button>
      </Paper>

      {/* List */}
      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <ResearchIcon sx={{ fontSize: 48, color: '#4338ca', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا توجد أبحاث</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(r => {
            const field = getField(r.field);
            const status = getStatus(r.status);
            const progress =
              r.status === 'completed' || r.status === 'published'
                ? 100
                : r.status === 'analysis'
                  ? 80
                  : r.status === 'data-collection'
                    ? 50
                    : r.status === 'in-progress'
                      ? 30
                      : 10;
            return (
              <Grid item xs={12} md={6} key={r.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${field.color}25`,
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
                          sx={{
                            bgcolor: `${field.color}12`,
                            fontSize: '1.3rem',
                            width: 44,
                            height: 44,
                          }}
                        >
                          {field.icon}
                        </Avatar>
                        <Box>
                          <Typography
                            fontWeight={700}
                            sx={{ lineClamp: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {r.title}
                          </Typography>
                          {r.titleEn && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontStyle: 'italic' }}
                            >
                              {r.titleEn}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Chip
                        label={status.label}
                        size="small"
                        icon={status.icon}
                        sx={{ bgcolor: `${status.color}12`, color: status.color, fontWeight: 600 }}
                      />
                    </Box>

                    {/* Principal & Team */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {r.principal}
                      </Typography>
                      {r.team?.length > 0 && (
                        <Chip
                          icon={<TeamIcon sx={{ fontSize: '14px !important' }} />}
                          label={`${r.team.length} باحث`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>

                    {r.abstract && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {r.abstract}
                      </Typography>
                    )}

                    {/* Progress */}
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" fontWeight={600}>
                          التقدم
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#f3f4f6',
                          '& .MuiLinearProgress-bar': { bgcolor: field.color, borderRadius: 3 },
                        }}
                      />
                    </Box>

                    {/* Dates */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      {r.startDate && (
                        <Chip
                          icon={<DateIcon sx={{ fontSize: '14px !important' }} />}
                          label={new Date(r.startDate).toLocaleDateString('ar-SA')}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      )}
                      {r.sampleSize && (
                        <Chip
                          label={`العينة: ${r.sampleSize}`}
                          size="small"
                          sx={{ bgcolor: '#f8fafc', fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>

                    {/* Tags */}
                    {r.tags?.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {r.tags.map((tag, i) => (
                          <Chip
                            key={i}
                            label={tag}
                            size="small"
                            sx={{
                              bgcolor: `${field.color}08`,
                              color: field.color,
                              fontSize: '0.65rem',
                            }}
                          />
                        ))}
                      </Box>
                    )}

                    {/* Publications */}
                    {r.publications?.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        {r.publications.map((pub, i) => (
                          <Chip
                            key={i}
                            icon={<JournalIcon sx={{ fontSize: '14px !important' }} />}
                            label={pub}
                            size="small"
                            sx={{
                              mr: 0.5,
                              mb: 0.5,
                              bgcolor: '#f0fdf4',
                              color: '#059669',
                              fontSize: '0.65rem',
                            }}
                          />
                        ))}
                      </Box>
                    )}

                    {r.findings && (
                      <Paper sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: 1, mb: 1 }}>
                        <Typography variant="caption" fontWeight={600} color="#059669">
                          النتائج:{' '}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.findings}
                        </Typography>
                      </Paper>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Tooltip title="إضافة منشور">
                        <IconButton
                          size="small"
                          sx={{ color: '#059669' }}
                          onClick={() => setPubDialog(r)}
                        >
                          <PublishIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Box>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(r)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => handleDelete(r.id)}>
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {editData ? 'تعديل البحث' : 'بحث سريري جديد'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="العنوان بالعربي"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="العنوان بالإنجليزي"
                value={form.titleEn}
                onChange={e => setForm({ ...form, titleEn: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>المجال البحثي</InputLabel>
                <Select
                  value={form.field}
                  onChange={e => setForm({ ...form, field: e.target.value })}
                  label="المجال البحثي"
                >
                  {FIELDS.map(f => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.icon} {f.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الباحث الرئيسي"
                value={form.principal}
                onChange={e => setForm({ ...form, principal: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="فريق البحث (مفصول بفواصل)"
                value={form.team}
                onChange={e => setForm({ ...form, team: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ البدء"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الانتهاء"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="حجم العينة"
                value={form.sampleSize}
                onChange={e => setForm({ ...form, sampleSize: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="الملخص"
                value={form.abstract}
                onChange={e => setForm({ ...form, abstract: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="المنهجية"
                value={form.methodology}
                onChange={e => setForm({ ...form, methodology: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الكلمات المفتاحية (مفصولة بفواصل)"
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#4338ca', '&:hover': { bgcolor: '#3730a3' } }}
          >
            {editData ? 'تحديث' : 'إنشاء البحث'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Publication Dialog */}
      <Dialog open={!!pubDialog} onClose={() => setPubDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>إضافة منشور</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="اسم المنشور / المجلة"
            value={pubName}
            onChange={e => setPubName(e.target.value)}
            sx={{ mt: 1 }}
            placeholder="مثال: مجلة التأهيل العربية - عدد مارس 2026"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPubDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddPublication} sx={{ bgcolor: '#059669' }}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistClinicalResearch;
