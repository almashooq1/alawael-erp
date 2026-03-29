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
  LinearProgress,  Divider,} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  TrackChanges as GoalIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Flag as FlagIcon,
  EmojiEvents as TrophyIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendIcon,
  Category as DomainIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors } from '../../theme/palette';

const DOMAINS = [
  { value: 'motor', label: 'حركي', color: '#3b82f6', icon: '🏃' },
  { value: 'communication', label: 'تواصل', color: '#10b981', icon: '🗣️' },
  { value: 'cognitive', label: 'إدراكي', color: '#f59e0b', icon: '🧠' },
  { value: 'social', label: 'اجتماعي', color: '#8b5cf6', icon: '👥' },
  { value: 'self-care', label: 'رعاية ذاتية', color: '#ec4899', icon: '🧹' },
  { value: 'behavioral', label: 'سلوكي', color: '#ef4444', icon: '💡' },
  { value: 'academic', label: 'أكاديمي', color: '#06b6d4', icon: '📚' },
  { value: 'functional', label: 'وظيفي', color: '#84cc16', icon: '🔧' },
];

const STATUSES = [
  { value: 'active', label: 'نشط', color: '#3b82f6' },
  { value: 'on-track', label: 'على المسار', color: '#10b981' },
  { value: 'at-risk', label: 'معرض للخطر', color: '#f59e0b' },
  { value: 'completed', label: 'مكتمل', color: '#22c55e' },
  { value: 'paused', label: 'متوقف', color: '#6b7280' },
];

const TherapistSmartGoals = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [form, setForm] = useState({
    patientName: '',
    domain: 'motor',
    title: '',
    specific: '',
    measurable: '',
    achievable: '',
    relevant: '',
    timeBound: '',
    targetDate: '',
    milestones: '',
  });

  useEffect(() => {
    loadGoals();
  }, []); // eslint-disable-line

  const loadGoals = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getSmartGoals();
      setGoals(res?.goals || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const milestones = form.milestones
        .split('\n')
        .filter(Boolean)
        .map(m => ({ title: m.trim(), completed: false }));
      const payload = { ...form, milestones };
      await therapistService.createSmartGoal(payload);
      showSnackbar('تم إنشاء الهدف الذكي بنجاح', 'success');
      setCreateOpen(false);
      setForm({
        patientName: '',
        domain: 'motor',
        title: '',
        specific: '',
        measurable: '',
        achievable: '',
        relevant: '',
        timeBound: '',
        targetDate: '',
        milestones: '',
      });
      loadGoals();
    } catch {
      showSnackbar('خطأ في إنشاء الهدف', 'error');
    }
  };

  const handleEdit = goal => {
    setSelectedGoal(goal);
    setForm({
      patientName: goal.patientName,
      domain: goal.domain,
      title: goal.title,
      specific: goal.specific || '',
      measurable: goal.measurable || '',
      achievable: goal.achievable || '',
      relevant: goal.relevant || '',
      timeBound: goal.timeBound || '',
      targetDate: goal.targetDate?.split('T')[0] || '',
      milestones: goal.milestones?.map(m => m.title).join('\n') || '',
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    try {
      const milestones = form.milestones
        .split('\n')
        .filter(Boolean)
        .map(m => ({ title: m.trim(), completed: false }));
      await therapistService.updateSmartGoal(selectedGoal.id, { ...form, milestones });
      showSnackbar('تم تحديث الهدف بنجاح', 'success');
      setEditOpen(false);
      loadGoals();
    } catch {
      showSnackbar('خطأ في التحديث', 'error');
    }
  };

  const handleMilestoneToggle = async (goalId, milestoneId) => {
    try {
      await therapistService.updateMilestone(goalId, milestoneId);
      loadGoals();
    } catch {
      showSnackbar('خطأ في تحديث المعلم', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteSmartGoal(id);
      showSnackbar('تم حذف الهدف', 'success');
      loadGoals();
    } catch {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const filtered = goals.filter(g => {
    const matchSearch = !search || g.title?.includes(search) || g.patientName?.includes(search);
    const matchDomain = domainFilter === 'all' || g.domain === domainFilter;
    const matchStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchSearch && matchDomain && matchStatus;
  });

  const getProgress = goal => {
    if (!goal.milestones?.length) return 0;
    const completed = goal.milestones.filter(m => m.completed).length;
    return (completed / goal.milestones.length) * 100;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GoalIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                الأهداف الذكية (SMART)
              </Typography>
              <Typography variant="body2">تحديد وتتبع الأهداف العلاجية بمنهجية SMART</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            هدف جديد
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الأهداف',
            value: stats.totalGoals || 0,
            color: statusColors.info,
            icon: <GoalIcon />,
          },
          { label: 'نشطة', value: stats.active || 0, color: '#3b82f6', icon: <FlagIcon /> },
          { label: 'على المسار', value: stats.onTrack || 0, color: '#10b981', icon: <TrendIcon /> },
          { label: 'مكتملة', value: stats.completed || 0, color: '#22c55e', icon: <TrophyIcon /> },
          {
            label: 'معرضة للخطر',
            value: stats.atRisk || 0,
            color: '#f59e0b',
            icon: <TimelineIcon />,
          },
          {
            label: 'المرضى',
            value: stats.uniquePatients || 0,
            color: '#ec4899',
            icon: <DomainIcon />,
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="بحث..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>المجال</InputLabel>
          <Select
            value={domainFilter}
            label="المجال"
            onChange={e => setDomainFilter(e.target.value)}
          >
            <MenuItem value="all">الكل</MenuItem>
            {DOMAINS.map(d => (
              <MenuItem value={d.value} key={d.value}>
                {d.icon} {d.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            label="الحالة"
            onChange={e => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">الكل</MenuItem>
            {STATUSES.map(s => (
              <MenuItem value={s.value} key={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Goals List */}
      {loading ? (
        <Typography textAlign="center" color="textSecondary" sx={{ py: 4 }}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <GoalIcon sx={{ fontSize: 60, color: neutralColors.divider, mb: 2 }} />
          <Typography color="textSecondary">لا توجد أهداف</Typography>
        </Paper>
      ) : (
        filtered.map(goal => {
          const dom = DOMAINS.find(d => d.value === goal.domain) || DOMAINS[0];
          const st = STATUSES.find(s => s.value === goal.status) || STATUSES[0];
          const progress = getProgress(goal);
          const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
          const totalMilestones = goal.milestones?.length || 0;
          return (
            <Card
              key={goal.id}
              sx={{ mb: 2, borderRadius: 2, borderRight: `4px solid ${dom.color}` }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h5">{dom.icon}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {goal.title}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={dom.label}
                        size="small"
                        sx={{ bgcolor: dom.color + '20', color: dom.color, fontWeight: 'bold' }}
                      />
                      <Chip
                        label={st.label}
                        size="small"
                        sx={{ bgcolor: st.color + '20', color: st.color, fontWeight: 'bold' }}
                      />
                      <Chip
                        label={goal.patientName}
                        size="small"
                        variant="outlined"
                        icon={
                          <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>
                            {goal.patientName?.[0]}
                          </Avatar>
                        }
                      />
                      {goal.targetDate && (
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ alignSelf: 'center' }}
                        >
                          📅 {new Date(goal.targetDate).toLocaleDateString('ar')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => handleEdit(goal)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small" color="error" onClick={() => handleDelete(goal.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* SMART Breakdown */}
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  {[
                    { key: 'S', label: 'محدد', value: goal.specific, color: '#3b82f6' },
                    { key: 'M', label: 'قابل للقياس', value: goal.measurable, color: '#10b981' },
                    { key: 'A', label: 'قابل للتحقيق', value: goal.achievable, color: '#f59e0b' },
                    { key: 'R', label: 'ذو صلة', value: goal.relevant, color: '#8b5cf6' },
                    { key: 'T', label: 'محدد بزمن', value: goal.timeBound, color: '#ec4899' },
                  ]
                    .filter(item => item.value)
                    .map(item => (
                      <Grid item xs={12} sm={6} md key={item.key}>
                        <Paper
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: item.color + '08',
                            border: `1px solid ${item.color}30`,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 'bold', color: item.color }}
                          >
                            {item.key} - {item.label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {item.value}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                </Grid>

                {/* Progress Bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 80 }}>
                    التقدم
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      flex: 1,
                      height: 10,
                      borderRadius: 5,
                      bgcolor: dom.color + '20',
                      '& .MuiLinearProgress-bar': { bgcolor: dom.color, borderRadius: 5 },
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 'bold', color: dom.color, minWidth: 45 }}
                  >
                    {progress.toFixed(0)}%
                  </Typography>
                </Box>

                {/* Milestones */}
                {totalMilestones > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ mb: 0.5, display: 'block' }}
                    >
                      المعالم: {completedMilestones}/{totalMilestones}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {goal.milestones.map((ms, idx) => (
                        <Chip
                          key={ms.id || idx}
                          label={ms.title}
                          size="small"
                          icon={ms.completed ? <CheckIcon /> : <UncheckedIcon />}
                          onClick={() => handleMilestoneToggle(goal.id, ms.id)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: ms.completed ? '#10b98120' : 'transparent',
                            color: ms.completed ? '#10b981' : 'inherit',
                            textDecoration: ms.completed ? 'line-through' : 'none',
                            border: `1px solid ${ms.completed ? '#10b981' : '#e0e0e0'}`,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GoalIcon color="primary" />
            <Typography variant="h6">هدف ذكي جديد (SMART)</Typography>
          </Box>
          <IconButton onClick={() => setCreateOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="عنوان الهدف"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="اسم المريض"
                value={form.patientName}
                onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>المجال</InputLabel>
                <Select
                  value={form.domain}
                  label="المجال"
                  onChange={e => setForm(p => ({ ...p, domain: e.target.value }))}
                >
                  {DOMAINS.map(d => (
                    <MenuItem value={d.value} key={d.value}>
                      {d.icon} {d.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="التاريخ المستهدف"
                value={form.targetDate}
                onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider>
                <Chip label="عناصر SMART" size="small" color="primary" />
              </Divider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="S - محدد (Specific): ماذا تريد تحقيقه بالضبط؟"
                value={form.specific}
                onChange={e => setForm(p => ({ ...p, specific: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="M - قابل للقياس (Measurable): كيف ستقيس التقدم؟"
                value={form.measurable}
                onChange={e => setForm(p => ({ ...p, measurable: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="A - قابل للتحقيق (Achievable): هل الهدف واقعي؟"
                value={form.achievable}
                onChange={e => setForm(p => ({ ...p, achievable: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="R - ذو صلة (Relevant): لماذا هذا الهدف مهم؟"
                value={form.relevant}
                onChange={e => setForm(p => ({ ...p, relevant: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="T - محدد بزمن (Time-bound): متى يجب تحقيقه؟"
                value={form.timeBound}
                onChange={e => setForm(p => ({ ...p, timeBound: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider>
                <Chip label="المعالم" size="small" />
              </Divider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="المعالم (كل سطر = معلم)"
                value={form.milestones}
                onChange={e => setForm(p => ({ ...p, milestones: e.target.value }))}
                helperText="مثال: التقييم الأولي↵بدء التدريب↵مراجعة منتصف المدة↵التقييم النهائي"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.title || !form.patientName}
          >
            إنشاء الهدف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon color="primary" />
            <Typography variant="h6">تعديل الهدف</Typography>
          </Box>
          <IconButton onClick={() => setEditOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="عنوان الهدف"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="اسم المريض"
                value={form.patientName}
                onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>المجال</InputLabel>
                <Select
                  value={form.domain}
                  label="المجال"
                  onChange={e => setForm(p => ({ ...p, domain: e.target.value }))}
                >
                  {DOMAINS.map(d => (
                    <MenuItem value={d.value} key={d.value}>
                      {d.icon} {d.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="التاريخ المستهدف"
                value={form.targetDate}
                onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="S - محدد"
                value={form.specific}
                onChange={e => setForm(p => ({ ...p, specific: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="M - قابل للقياس"
                value={form.measurable}
                onChange={e => setForm(p => ({ ...p, measurable: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="A - قابل للتحقيق"
                value={form.achievable}
                onChange={e => setForm(p => ({ ...p, achievable: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="R - ذو صلة"
                value={form.relevant}
                onChange={e => setForm(p => ({ ...p, relevant: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="T - محدد بزمن"
                value={form.timeBound}
                onChange={e => setForm(p => ({ ...p, timeBound: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="المعالم (كل سطر = معلم)"
                value={form.milestones}
                onChange={e => setForm(p => ({ ...p, milestones: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={!form.title}>
            حفظ التعديلات
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistSmartGoals;
