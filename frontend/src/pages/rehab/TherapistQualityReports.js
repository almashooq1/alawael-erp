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
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Assessment as QualityIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  CheckCircle as PassIcon,
  Warning as WarningIcon,
  Error as FailIcon,
  TrendingUp as ScoreIcon,
  Flag as FindingIcon,
  PlaylistAddCheck as AuditIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const QUALITY_CATEGORIES = [
  { value: 'clinical', label: 'سريري', icon: '🏥', color: '#3b82f6' },
  { value: 'documentation', label: 'توثيق', icon: '📑', color: '#8b5cf6' },
  { value: 'safety', label: 'سلامة', icon: '🛡️', color: '#ef4444' },
  { value: 'patient-satisfaction', label: 'رضا المرضى', icon: '😊', color: '#22c55e' },
  { value: 'process', label: 'عمليات', icon: '⚙️', color: '#f59e0b' },
  { value: 'compliance', label: 'امتثال', icon: '📜', color: '#0d9488' },
];

const TherapistQualityReports = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [findingDialog, setFindingDialog] = useState({ open: false, reportId: null });
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    title: '',
    category: 'clinical',
    auditor: '',
    auditDate: '',
    score: '',
    maxScore: '100',
    actionPlan: '',
    dueDate: '',
    recommendations: '',
  });
  const [findingForm, setFindingForm] = useState({
    description: '',
    severity: 'medium',
    recommendation: '',
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getQualityReports();
      setReports(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchQualityReports error:', err);
      showSnackbar('خطأ في تحميل التقارير', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.auditor) {
      showSnackbar('يرجى إدخال البيانات المطلوبة', 'warning');
      return;
    }
    try {
      const payload = {
        ...form,
        score: Number(form.score) || 0,
        maxScore: Number(form.maxScore) || 100,
        recommendations: form.recommendations
          ? form.recommendations.split('\n').filter(Boolean)
          : [],
      };
      if (editData) {
        await therapistService.updateQualityReport(editData.id, payload);
        showSnackbar('تم التحديث', 'success');
      } else {
        await therapistService.createQualityReport(payload);
        showSnackbar('تم الإنشاء', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchReports();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleAddFinding = async () => {
    if (!findingForm.description) {
      showSnackbar('يرجى إدخال وصف الملاحظة', 'warning');
      return;
    }
    try {
      await therapistService.addQualityFinding(findingDialog.reportId, findingForm);
      showSnackbar('تمت إضافة الملاحظة', 'success');
      setFindingDialog({ open: false, reportId: null });
      setFindingForm({ description: '', severity: 'medium', recommendation: '' });
      fetchReports();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteQualityReport(id);
      showSnackbar('تم الحذف', 'success');
      fetchReports();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      category: 'clinical',
      auditor: '',
      auditDate: '',
      score: '',
      maxScore: '100',
      actionPlan: '',
      dueDate: '',
      recommendations: '',
    });
    setEditData(null);
  };

  const openEdit = r => {
    setEditData(r);
    setForm({
      title: r.title,
      category: r.category,
      auditor: r.auditor,
      auditDate: r.auditDate ? new Date(r.auditDate).toISOString().split('T')[0] : '',
      score: String(r.score || ''),
      maxScore: String(r.maxScore || 100),
      actionPlan: r.actionPlan || '',
      dueDate: r.dueDate ? new Date(r.dueDate).toISOString().split('T')[0] : '',
      recommendations: Array.isArray(r.recommendations) ? r.recommendations.join('\n') : '',
    });
    setDialogOpen(true);
  };

  const filtered = reports.filter(r => {
    const matchSearch = !search || r.title?.includes(search) || r.auditor?.includes(search);
    const matchCat = categoryFilter === 'all' || r.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const getCat = v => QUALITY_CATEGORIES.find(c => c.value === v) || QUALITY_CATEGORIES[0];
  const pct = (s, m) => (m > 0 ? Math.round((s / m) * 100) : 0);
  const scoreColor = p => (p >= 80 ? '#22c55e' : p >= 60 ? '#f59e0b' : '#ef4444');
  const severityMap = {
    low: { label: 'منخفضة', color: '#22c55e' },
    medium: { label: 'متوسطة', color: '#f59e0b' },
    high: { label: 'عالية', color: '#ef4444' },
    critical: { label: 'حرجة', color: '#991b1b' },
  };
  const statusMap = {
    draft: { label: 'مسودة', color: '#94a3b8' },
    'in-review': { label: 'قيد المراجعة', color: '#6366f1' },
    completed: { label: 'مكتمل', color: '#22c55e' },
  };
  const getStatus = v => statusMap[v] || { label: v, color: '#94a3b8' };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #6366f1 0%, #a5b4fc 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <QualityIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              تقارير الجودة
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              تدقيق الجودة والامتثال وتحسين الأداء السريري
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي التقارير', value: stats.total || 0, color: '#6366f1' },
          { label: 'متوسط النتيجة', value: `${stats.avgScore || 0}%`, color: '#22c55e' },
          { label: 'تقارير مكتملة', value: stats.completed || 0, color: '#10b981' },
          { label: 'ملاحظات مفتوحة', value: stats.openFindings || 0, color: '#ef4444' },
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
          <InputLabel>التصنيف</InputLabel>
          <Select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            label="التصنيف"
          >
            <MenuItem value="all">الكل</MenuItem>
            {QUALITY_CATEGORIES.map(c => (
              <MenuItem key={c.value} value={c.value}>
                {c.icon} {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            label="الحالة"
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="draft">مسودة</MenuItem>
            <MenuItem value="in-review">قيد المراجعة</MenuItem>
            <MenuItem value="completed">مكتمل</MenuItem>
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
          sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
        >
          تقرير جديد
        </Button>
      </Paper>

      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <QualityIcon sx={{ fontSize: 48, color: '#6366f1', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا توجد تقارير</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(r => {
            const cat = getCat(r.category);
            const st = getStatus(r.status);
            const p = pct(r.score, r.maxScore);
            return (
              <Grid item xs={12} md={6} key={r.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${cat.color}25`,
                    '&:hover': { boxShadow: 4 },
                    transition: '0.2s',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            bgcolor: `${cat.color}12`,
                            fontSize: '1.4rem',
                            width: 44,
                            height: 44,
                          }}
                        >
                          {cat.icon}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700}>{r.title}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                            <Chip
                              label={cat.label}
                              size="small"
                              sx={{
                                bgcolor: `${cat.color}10`,
                                color: cat.color,
                                fontSize: '0.65rem',
                                height: 20,
                              }}
                            />
                            <Chip
                              label={st.label}
                              size="small"
                              sx={{
                                bgcolor: `${st.color}12`,
                                color: st.color,
                                fontSize: '0.65rem',
                                height: 20,
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'center', minWidth: 56 }}>
                        <Typography variant="h5" fontWeight={800} color={scoreColor(p)}>
                          {p}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.score}/{r.maxScore}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 1.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={p}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#f1f5f9',
                          '& .MuiLinearProgress-bar': { bgcolor: scoreColor(p), borderRadius: 4 },
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<AuditIcon sx={{ fontSize: '14px !important' }} />}
                        label={`المدقق: ${r.auditor}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem' }}
                      />
                      {r.auditDate && (
                        <Chip
                          label={`التدقيق: ${new Date(r.auditDate).toLocaleDateString('ar-SA')}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      )}
                      {r.dueDate && (
                        <Chip
                          label={`الموعد: ${new Date(r.dueDate).toLocaleDateString('ar-SA')}`}
                          size="small"
                          sx={{ bgcolor: '#fef2f2', fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>

                    {r.findings && r.findings.length > 0 && (
                      <Box sx={{ mb: 1, p: 1, bgcolor: '#fafafa', borderRadius: 1 }}>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          color="text.secondary"
                          sx={{ mb: 0.5, display: 'block' }}
                        >
                          <FindingIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />{' '}
                          ملاحظات ({r.findings.length})
                        </Typography>
                        {r.findings.slice(0, 2).map((f, i) => (
                          <Box
                            key={i}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}
                          >
                            <Chip
                              label={severityMap[f.severity]?.label || f.severity}
                              size="small"
                              sx={{
                                bgcolor: `${severityMap[f.severity]?.color || '#94a3b8'}15`,
                                color: severityMap[f.severity]?.color,
                                fontSize: '0.6rem',
                                height: 18,
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {f.description}
                            </Typography>
                          </Box>
                        ))}
                        {r.findings.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{r.findings.length - 2} المزيد
                          </Typography>
                        )}
                      </Box>
                    )}

                    {r.actionPlan && (
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
                        📋 {r.actionPlan}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Tooltip title="إضافة ملاحظة">
                        <IconButton
                          size="small"
                          sx={{ color: '#6366f1' }}
                          onClick={() => setFindingDialog({ open: true, reportId: r.id })}
                        >
                          <FindingIcon fontSize="small" />
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

      {/* Main Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {editData ? 'تعديل التقرير' : 'تقرير جديد'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان التقرير"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>التصنيف</InputLabel>
                <Select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  label="التصنيف"
                >
                  {QUALITY_CATEGORIES.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المدقق"
                value={form.auditor}
                onChange={e => setForm({ ...form, auditor: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ التدقيق"
                value={form.auditDate}
                onChange={e => setForm({ ...form, auditDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="النتيجة"
                value={form.score}
                onChange={e => setForm({ ...form, score: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="الحد الأقصى"
                value={form.maxScore}
                onChange={e => setForm({ ...form, maxScore: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الاستحقاق"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="خطة العمل"
                value={form.actionPlan}
                onChange={e => setForm({ ...form, actionPlan: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="التوصيات (سطر لكل توصية)"
                value={form.recommendations}
                onChange={e => setForm({ ...form, recommendations: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {editData ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Finding Dialog */}
      <Dialog
        open={findingDialog.open}
        onClose={() => setFindingDialog({ open: false, reportId: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة ملاحظة جودة</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف"
                value={findingForm.description}
                onChange={e => setFindingForm({ ...findingForm, description: e.target.value })}
                required
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الخطورة</InputLabel>
                <Select
                  value={findingForm.severity}
                  onChange={e => setFindingForm({ ...findingForm, severity: e.target.value })}
                  label="الخطورة"
                >
                  <MenuItem value="low">منخفضة</MenuItem>
                  <MenuItem value="medium">متوسطة</MenuItem>
                  <MenuItem value="high">عالية</MenuItem>
                  <MenuItem value="critical">حرجة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="التوصية"
                value={findingForm.recommendation}
                onChange={e => setFindingForm({ ...findingForm, recommendation: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFindingDialog({ open: false, reportId: null })}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleAddFinding}
            sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistQualityReports;
