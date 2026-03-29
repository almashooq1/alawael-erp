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
  LinearProgress,
  Tabs,
  Tab,
  Avatar,
  Divider,} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  TrendingUp as TrendIcon,
  Delete as DeleteIcon,
  Timeline as TimelineIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  CalendarToday as CalendarIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors } from '../../theme/palette';

const DOMAINS = [
  { value: 'motor', label: 'حركي', color: '#3b82f6' },
  { value: 'communication', label: 'تواصل', color: '#10b981' },
  { value: 'cognitive', label: 'إدراكي', color: '#f59e0b' },
  { value: 'social', label: 'اجتماعي', color: '#8b5cf6' },
  { value: 'self-care', label: 'رعاية ذاتية', color: '#ec4899' },
  { value: 'behavioral', label: 'سلوكي', color: '#ef4444' },
  { value: 'academic', label: 'أكاديمي', color: '#06b6d4' },
  { value: 'functional', label: 'وظيفي', color: '#84cc16' },
];

const TherapistProgressTracking = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    domain: 'motor',
    sessionDate: new Date().toISOString().split('T')[0],
    score: 5,
    maxScore: 10,
    notes: '',
    objectives: '',
    achievements: '',
  });

  useEffect(() => {
    loadRecords();
  }, []); // eslint-disable-line

  const loadRecords = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getProgressRecords();
      setRecords(res?.records || []);
      setSummary(res?.summary || {});
    } catch (err) {
      logger.error('Error loading progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await therapistService.addProgressRecord(form);
      showSnackbar('تم إضافة سجل التقدم بنجاح', 'success');
      setCreateOpen(false);
      setForm({
        patientId: '',
        patientName: '',
        domain: 'motor',
        sessionDate: new Date().toISOString().split('T')[0],
        score: 5,
        maxScore: 10,
        notes: '',
        objectives: '',
        achievements: '',
      });
      loadRecords();
    } catch {
      showSnackbar('خطأ في إضافة السجل', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteProgressRecord(id);
      showSnackbar('تم حذف السجل', 'success');
      loadRecords();
    } catch {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const filtered = records.filter(r => {
    const matchSearch = !search || r.patientName?.includes(search) || r.notes?.includes(search);
    const matchDomain = domainFilter === 'all' || r.domain === domainFilter;
    return matchSearch && matchDomain;
  });

  // Group by patient
  const patientGroups = filtered.reduce((acc, r) => {
    if (!acc[r.patientName]) acc[r.patientName] = [];
    acc[r.patientName].push(r);
    return acc;
  }, {});

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TrendIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                تتبع التقدم
              </Typography>
              <Typography variant="body2">رصد ومتابعة تقدم المرضى عبر الجلسات</Typography>
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
            سجل جديد
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي السجلات',
            value: summary.totalRecords || 0,
            color: statusColors.info,
            icon: <ChartIcon />,
          },
          {
            label: 'المرضى',
            value: summary.uniquePatients || 0,
            color: statusColors.success,
            icon: <PersonIcon />,
          },
          {
            label: 'متوسط النتيجة',
            value: summary.averageScore ? `${(summary.averageScore * 10).toFixed(0)}%` : '0%',
            color: '#8b5cf6',
            icon: <TrendIcon />,
          },
          {
            label: 'المجالات المغطاة',
            value: summary.domainsTracked || 0,
            color: '#f59e0b',
            icon: <AssessmentIcon />,
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
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
          placeholder="بحث بالاسم..."
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
                {d.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="عرض زمني" icon={<TimelineIcon />} iconPosition="start" />
        <Tab label="حسب المريض" icon={<PersonIcon />} iconPosition="start" />
      </Tabs>

      {loading ? (
        <Typography textAlign="center" color="textSecondary" sx={{ py: 4 }}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <TrendIcon sx={{ fontSize: 60, color: neutralColors.divider, mb: 2 }} />
          <Typography color="textSecondary">لا توجد سجلات تقدم</Typography>
        </Paper>
      ) : tabValue === 0 ? (
        /* Timeline View */
        filtered
          .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
          .map(record => {
            const dom = DOMAINS.find(d => d.value === record.domain) || DOMAINS[0];
            const pct = record.maxScore > 0 ? (record.score / record.maxScore) * 100 : 0;
            return (
              <Card
                key={record.id}
                sx={{ mb: 2, borderRadius: 2, borderRight: `4px solid ${dom.color}` }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Avatar sx={{ bgcolor: dom.color, width: 32, height: 32 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {record.patientName}
                        </Typography>
                        <Chip
                          label={dom.label}
                          size="small"
                          sx={{ bgcolor: dom.color + '20', color: dom.color, fontWeight: 'bold' }}
                        />
                        <Typography variant="caption" color="textSecondary">
                          <CalendarIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                          {new Date(record.sessionDate).toLocaleDateString('ar')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {record.score}/{record.maxScore}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: dom.color + '20',
                            '& .MuiLinearProgress-bar': { bgcolor: dom.color },
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: dom.color }}>
                          {pct.toFixed(0)}%
                        </Typography>
                      </Box>
                      {record.notes && (
                        <Typography variant="body2" color="textSecondary">
                          {record.notes}
                        </Typography>
                      )}
                      {record.achievements && (
                        <Typography variant="body2" sx={{ color: statusColors.success, mt: 0.5 }}>
                          🏆 {record.achievements}
                        </Typography>
                      )}
                    </Box>
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(record.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            );
          })
      ) : (
        /* Patient Group View */
        Object.entries(patientGroups).map(([name, recs]) => (
          <Card key={name} sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: '#3b82f6' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {recs.length} سجل تقدم
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {recs.map(r => {
                const dom = DOMAINS.find(d => d.value === r.domain) || DOMAINS[0];
                const pct = r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0;
                return (
                  <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <Chip
                      label={dom.label}
                      size="small"
                      sx={{ bgcolor: dom.color + '20', color: dom.color, minWidth: 60 }}
                    />
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ flex: 1, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 40 }}>
                      {pct.toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ minWidth: 80 }}>
                      {new Date(r.sessionDate).toLocaleDateString('ar')}
                    </Typography>
                    <IconButton size="small" color="error" onClick={() => handleDelete(r.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendIcon color="primary" />
            <Typography variant="h6">سجل تقدم جديد</Typography>
          </Box>
          <IconButton onClick={() => setCreateOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم المريض"
                value={form.patientName}
                onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>المجال</InputLabel>
                <Select
                  value={form.domain}
                  label="المجال"
                  onChange={e => setForm(p => ({ ...p, domain: e.target.value }))}
                >
                  {DOMAINS.map(d => (
                    <MenuItem value={d.value} key={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="النتيجة"
                value={form.score}
                onChange={e => setForm(p => ({ ...p, score: Number(e.target.value) }))}
                inputProps={{ min: 0, max: form.maxScore }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="الحد الأقصى"
                value={form.maxScore}
                onChange={e => setForm(p => ({ ...p, maxScore: Number(e.target.value) }))}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="تاريخ الجلسة"
                value={form.sessionDate}
                onChange={e => setForm(p => ({ ...p, sessionDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="الأهداف"
                value={form.objectives}
                onChange={e => setForm(p => ({ ...p, objectives: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="الإنجازات"
                value={form.achievements}
                onChange={e => setForm(p => ({ ...p, achievements: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="ملاحظات"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.patientName}>
            إضافة السجل
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistProgressTracking;
