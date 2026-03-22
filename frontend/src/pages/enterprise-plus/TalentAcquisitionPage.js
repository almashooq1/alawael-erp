/**
 * Talent Acquisition & ATS — التوظيف واستقطاب المواهب
 * Full ATS: Job Postings, Candidates, Applications Pipeline, Interviews
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  IconButton,
  Chip,
  Avatar,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Tab,
  Tabs,
  Card,
  CardContent,
  LinearProgress,
  InputAdornment,
  Tooltip,
  Badge,
  Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Business as BusinessIcon,
  ArrowForward as ArrowIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Cancel as RejectIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import * as svc from '../../services/enterpriseProPlus.service';

const JOB_TYPES = {
  full_time: 'دوام كامل',
  part_time: 'دوام جزئي',
  contract: 'عقد',
  internship: 'تدريب',
  remote: 'عن بعد',
};
const JOB_LEVELS = {
  entry: 'مبتدئ',
  mid: 'متوسط',
  senior: 'كبير',
  lead: 'قائد',
  manager: 'مدير',
  director: 'مدير عام',
  executive: 'تنفيذي',
};
const JOB_STATUSES = {
  draft: 'مسودة',
  open: 'مفتوح',
  paused: 'متوقف',
  closed: 'مغلق',
  filled: 'تم التعيين',
};
const APP_STAGES = {
  applied: 'تقديم',
  screening: 'فرز',
  phone_interview: 'مقابلة هاتفية',
  technical_test: 'اختبار فني',
  interview: 'مقابلة',
  final_interview: 'مقابلة نهائية',
  offer: 'عرض',
  hired: 'تم التعيين',
  rejected: 'مرفوض',
  withdrawn: 'منسحب',
};
const STAGE_COLORS = {
  applied: '#9e9e9e',
  screening: '#ff9800',
  phone_interview: '#2196f3',
  technical_test: '#9c27b0',
  interview: '#00bcd4',
  final_interview: '#3f51b5',
  offer: '#4caf50',
  hired: '#2e7d32',
  rejected: '#f44336',
  withdrawn: '#795548',
};
const SOURCES = {
  website: 'الموقع',
  linkedin: 'لينكد إن',
  referral: 'إحالة',
  agency: 'وكالة',
  job_board: 'منصة توظيف',
  walk_in: 'حضور مباشر',
  other: 'أخرى',
};

export default function TalentAcquisitionPage() {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [jobDialog, setJobDialog] = useState(false);
  const [candidateDialog, setCandidateDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [j, c, a, s] = await Promise.all([
        svc.getJobPostings().then(r => r.data?.data || []),
        svc.getCandidates().then(r => r.data?.data || []),
        svc.getApplications().then(r => r.data?.data || []),
        svc.getJobStatistics().then(r => r.data?.data || {}),
      ]);
      setJobs(j);
      setCandidates(c);
      setApplications(a);
      setStats(s);
    } catch {
      showSnackbar('خطأ في تحميل البيانات', 'error');
    }
    setLoading(false);
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Job CRUD ───
  const handleSaveJob = async formData => {
    try {
      if (editItem?._id) {
        await svc.updateJobPosting(editItem._id, formData);
        showSnackbar('تم تحديث الوظيفة بنجاح', 'success');
      } else {
        await svc.createJobPosting(formData);
        showSnackbar('تم إنشاء الوظيفة بنجاح', 'success');
      }
      setJobDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ في حفظ الوظيفة', 'error');
    }
  };

  const handleDeleteJob = async id => {
    try {
      await svc.deleteJobPosting(id);
      showSnackbar('تم حذف الوظيفة', 'success');
      fetchData();
    } catch {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  // ─── Candidate CRUD ───
  const handleSaveCandidate = async formData => {
    try {
      if (editItem?._id) {
        await svc.updateCandidate(editItem._id, formData);
        showSnackbar('تم تحديث المرشح بنجاح', 'success');
      } else {
        await svc.createCandidate(formData);
        showSnackbar('تم إضافة المرشح بنجاح', 'success');
      }
      setCandidateDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ في الحفظ', 'error');
    }
  };

  // ─── Stage move ───
  const handleMoveStage = async (appId, newStage) => {
    try {
      await svc.updateApplicationStage(appId, newStage);
      showSnackbar('تم تحديث المرحلة', 'success');
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const statCards = [
    { label: 'إجمالي الوظائف', value: stats.totalJobs || 0, color: '#1976d2', icon: <WorkIcon /> },
    { label: 'وظائف مفتوحة', value: stats.openJobs || 0, color: '#2e7d32', icon: <BusinessIcon /> },
    { label: 'تم التعيين', value: stats.filledJobs || 0, color: '#9c27b0', icon: <CheckIcon /> },
    {
      label: 'إجمالي الطلبات',
      value: stats.totalApplications || 0,
      color: '#ed6c02',
      icon: <AssessmentIcon />,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        التوظيف واستقطاب المواهب
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        نظام تتبع المتقدمين — إدارة الوظائف والمرشحين والمقابلات
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRight: `4px solid ${s.color}`,
              }}
            >
              <Avatar sx={{ bgcolor: alpha(s.color, 0.12), color: s.color }}>{s.icon}</Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="الوظائف" icon={<WorkIcon />} iconPosition="start" />
        <Tab label="المرشحون" icon={<PersonIcon />} iconPosition="start" />
        <Tab
          label={
            <Badge badgeContent={applications.length} color="primary">
              مسار التوظيف
            </Badge>
          }
          icon={<ArrowIcon />}
          iconPosition="start"
        />
        <Tab label="المقابلات" icon={<ScheduleIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Job Postings */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <TextField
              size="small"
              placeholder="بحث في الوظائف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setJobDialog(true);
              }}
            >
              وظيفة جديدة
            </Button>
          </Box>
          <Grid container spacing={2}>
            {jobs
              .filter(j => !search || j.title?.includes(search) || j.department?.includes(search))
              .map(job => (
                <Grid item xs={12} md={6} lg={4} key={job._id}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderTop: `3px solid ${job.status === 'open' ? '#4caf50' : job.status === 'filled' ? '#9c27b0' : '#9e9e9e'}`,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6" fontWeight={600}>
                          {job.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={JOB_STATUSES[job.status] || job.status}
                          color={job.status === 'open' ? 'success' : 'default'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {job.department}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={JOB_TYPES[job.type] || job.type}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={JOB_LEVELS[job.level] || job.level}
                        />
                      </Stack>
                      {job.salaryRange?.min && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {job.salaryRange.min.toLocaleString()} -{' '}
                          {job.salaryRange.max?.toLocaleString()} {job.salaryRange.currency}
                        </Typography>
                      )}
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditItem(job);
                            setJobDialog(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteJob(job._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Box>
      )}

      {/* Tab 1: Candidates */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <TextField
              size="small"
              placeholder="بحث بالاسم أو البريد..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setCandidateDialog(true);
              }}
            >
              مرشح جديد
            </Button>
          </Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>الاسم</TableCell>
                  <TableCell>البريد</TableCell>
                  <TableCell>الهاتف</TableCell>
                  <TableCell>المصدر</TableCell>
                  <TableCell>الخبرة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {candidates
                  .filter(
                    c =>
                      !search ||
                      `${c.firstName} ${c.lastName}`.includes(search) ||
                      c.email?.includes(search)
                  )
                  .map(c => (
                    <TableRow key={c._id} hover>
                      <TableCell>
                        {c.firstName} {c.lastName}
                      </TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell>
                        <Chip size="small" label={SOURCES[c.source] || c.source} />
                      </TableCell>
                      <TableCell>
                        {c.yearsOfExperience ? `${c.yearsOfExperience} سنة` : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            c.status === 'active'
                              ? 'نشط'
                              : c.status === 'hired'
                                ? 'تم التعيين'
                                : c.status
                          }
                          color={c.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditItem(c);
                            setCandidateDialog(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                {candidates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      لا توجد بيانات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Tab 2: Pipeline */}
      {tab === 2 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 2, minWidth: 1200, pb: 2 }}>
            {Object.entries(APP_STAGES)
              .slice(0, 8)
              .map(([stageKey, stageLabel]) => {
                const stageApps = applications.filter(a => a.stage === stageKey);
                return (
                  <Paper
                    key={stageKey}
                    variant="outlined"
                    sx={{
                      flex: 1,
                      minWidth: 220,
                      p: 1.5,
                      bgcolor: alpha(STAGE_COLORS[stageKey] || '#999', 0.04),
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1.5,
                        pb: 1,
                        borderBottom: `2px solid ${STAGE_COLORS[stageKey]}`,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>
                        {stageLabel}
                      </Typography>
                      <Chip
                        size="small"
                        label={stageApps.length}
                        sx={{
                          bgcolor: STAGE_COLORS[stageKey],
                          color: '#fff',
                          fontWeight: 700,
                          height: 22,
                        }}
                      />
                    </Box>
                    {stageApps.map(app => (
                      <Card key={app._id} variant="outlined" sx={{ mb: 1, p: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {app.candidate?.firstName} {app.candidate?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {app.jobPosting?.title}
                        </Typography>
                        <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {stageKey !== 'hired' && stageKey !== 'rejected' && (
                            <>
                              <Tooltip title="المرحلة التالية">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    const stages = Object.keys(APP_STAGES);
                                    const next = stages[stages.indexOf(stageKey) + 1];
                                    if (next) handleMoveStage(app._id, next);
                                  }}
                                >
                                  <ArrowIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="رفض">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleMoveStage(app._id, 'rejected')}
                                >
                                  <RejectIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </Card>
                    ))}
                    {stageApps.length === 0 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', textAlign: 'center', py: 2 }}
                      >
                        فارغ
                      </Typography>
                    )}
                  </Paper>
                );
              })}
          </Box>
        </Box>
      )}

      {/* Tab 3: Interviews */}
      {tab === 3 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            جدول المقابلات
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            جدولة وإدارة المقابلات مع المرشحين خلال مراحل التوظيف المختلفة
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} sx={{ mb: 2 }}>
            جدولة مقابلة جديدة
          </Button>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>المرشح</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    لا توجد مقابلات مجدولة حالياً
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* ─── Job Dialog ─── */}
      <JobFormDialog
        open={jobDialog}
        onClose={() => {
          setJobDialog(false);
          setEditItem(null);
        }}
        onSave={handleSaveJob}
        initial={editItem}
      />

      {/* ─── Candidate Dialog ─── */}
      <CandidateFormDialog
        open={candidateDialog}
        onClose={() => {
          setCandidateDialog(false);
          setEditItem(null);
        }}
        onSave={handleSaveCandidate}
        initial={editItem}
      />
    </Box>
  );
}

// ─── Job Form Dialog ───
function JobFormDialog({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({
    title: '',
    department: '',
    type: 'full_time',
    level: 'mid',
    description: '',
    status: 'draft',
    location: '',
  });
  useEffect(() => {
    if (initial)
      setForm({
        title: initial.title || '',
        department: initial.department || '',
        type: initial.type || 'full_time',
        level: initial.level || 'mid',
        description: initial.description || '',
        status: initial.status || 'draft',
        location: initial.location || '',
      });
    else
      setForm({
        title: '',
        department: '',
        type: 'full_time',
        level: 'mid',
        description: '',
        status: 'draft',
        location: '',
      });
  }, [initial, open]);
  const handleChange = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initial ? 'تعديل الوظيفة' : 'وظيفة جديدة'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', left: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="عنوان الوظيفة"
              value={form.title}
              onChange={handleChange('title')}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="القسم"
              value={form.department}
              onChange={handleChange('department')}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الموقع"
              value={form.location}
              onChange={handleChange('location')}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              select
              fullWidth
              label="النوع"
              value={form.type}
              onChange={handleChange('type')}
            >
              {Object.entries(JOB_TYPES).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={4}>
            <TextField
              select
              fullWidth
              label="المستوى"
              value={form.level}
              onChange={handleChange('level')}
            >
              {Object.entries(JOB_LEVELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={4}>
            <TextField
              select
              fullWidth
              label="الحالة"
              value={form.status}
              onChange={handleChange('status')}
            >
              {Object.entries(JOB_STATUSES).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="الوصف"
              value={form.description}
              onChange={handleChange('description')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => onSave(form)}>
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Candidate Form Dialog ───
function CandidateFormDialog({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'website',
    yearsOfExperience: '',
    currentCompany: '',
    currentTitle: '',
  });
  useEffect(() => {
    if (initial)
      setForm({
        firstName: initial.firstName || '',
        lastName: initial.lastName || '',
        email: initial.email || '',
        phone: initial.phone || '',
        source: initial.source || 'website',
        yearsOfExperience: initial.yearsOfExperience || '',
        currentCompany: initial.currentCompany || '',
        currentTitle: initial.currentTitle || '',
      });
    else
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        source: 'website',
        yearsOfExperience: '',
        currentCompany: '',
        currentTitle: '',
      });
  }, [initial, open]);
  const handleChange = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initial ? 'تعديل المرشح' : 'مرشح جديد'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', left: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الاسم الأول"
              value={form.firstName}
              onChange={handleChange('firstName')}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="اسم العائلة"
              value={form.lastName}
              onChange={handleChange('lastName')}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              value={form.email}
              onChange={handleChange('email')}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="الهاتف"
              value={form.phone}
              onChange={handleChange('phone')}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              select
              fullWidth
              label="المصدر"
              value={form.source}
              onChange={handleChange('source')}
            >
              {Object.entries(SOURCES).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              type="number"
              label="سنوات الخبرة"
              value={form.yearsOfExperience}
              onChange={handleChange('yearsOfExperience')}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              label="الشركة الحالية"
              value={form.currentCompany}
              onChange={handleChange('currentCompany')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => onSave(form)}>
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
