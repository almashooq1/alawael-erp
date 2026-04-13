/**
 * 🎯 إدارة التوظيف والاستقطاب — Recruitment & Hiring Dashboard
 * AlAwael ERP
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,  useTheme,
} from '@mui/material';




import {
  jobPostingsService,
  applicantsService,
  recruitmentReportsService,
  MOCK_JOB_POSTINGS,
  MOCK_APPLICANTS,
  MOCK_RECRUITMENT_DASHBOARD,
} from 'services/recruitmentService';
import { useSnackbar } from 'contexts/SnackbarContext';

const COLORS = ['#1565C0', '#00897B', '#F4511E', '#8E24AA', '#43A047', '#FF8F00', '#5C6BC0'];

const jobStatuses = ['مفتوح', 'قيد المراجعة', 'مغلق'];
const stageOrder = [
  'تقديم جديد',
  'فرز أولي',
  'مقابلة هاتفية',
  'مقابلة شخصية',
  'اختبار فني',
  'عرض وظيفي',
  'تعيين',
];
const stageColors = {
  'تقديم جديد': '#90CAF9',
  'فرز أولي': '#80CBC4',
  'مقابلة هاتفية': '#FFE082',
  'مقابلة شخصية': '#FFAB91',
  'اختبار فني': '#CE93D8',
  'عرض وظيفي': '#A5D6A7',
  تعيين: '#66BB6A',
};

const formatCurrency = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

const EMPTY_JOB = {
  title: '',
  department: '',
  location: '',
  type: 'دوام كامل',
  experience: '',
  salary: { min: 5000, max: 10000 },
  status: 'مفتوح',
  requirements: [''],
  description: '',
};

export default function RecruitmentDashboard() {
  const _theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(MOCK_RECRUITMENT_DASHBOARD);
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [jobForm, setJobForm] = useState(EMPTY_JOB);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicantDetailOpen, setApplicantDetailOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, j, a] = await Promise.all([
        recruitmentReportsService.getDashboardStats(),
        jobPostingsService.getAll(),
        applicantsService.getAll(),
      ]);
      setDashboard(d || MOCK_RECRUITMENT_DASHBOARD);
      setJobs(j || MOCK_JOB_POSTINGS);
      setApplicants(a || MOCK_APPLICANTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const departments = useMemo(() => [...new Set(jobs.map(j => j.department))], [jobs]);

  const filteredJobs = useMemo(() => {
    let list = [...jobs];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(j => j.title.toLowerCase().includes(s));
    }
    if (filterDept) list = list.filter(j => j.department === filterDept);
    if (filterStatus) list = list.filter(j => j.status === filterStatus);
    return list;
  }, [jobs, search, filterDept, filterStatus]);

  const filteredApplicants = useMemo(() => {
    let list = [...applicants];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        a => a.name.toLowerCase().includes(s) || a.jobTitle?.toLowerCase().includes(s)
      );
    }
    if (filterDept)
      list = list.filter(a => {
        const job = jobs.find(j => j._id === a.jobId);
        return job?.department === filterDept;
      });
    return list;
  }, [applicants, search, filterDept, jobs]);

  const openCreateJob = () => {
    setJobForm(EMPTY_JOB);
    setSelectedJob(null);
    setJobFormOpen(true);
  };
  const openEditJob = j => {
    setJobForm({ ...j, requirements: j.requirements || [''] });
    setSelectedJob(j);
    setJobFormOpen(true);
  };
  const openApplicantDetail = a => {
    setSelectedApplicant(a);
    setApplicantDetailOpen(true);
  };
  const openStageDialog = a => {
    setSelectedApplicant(a);
    setStageDialogOpen(true);
  };

  const handleSaveJob = async () => {
    if (!jobForm.title || !jobForm.department) {
      showSnackbar('يرجى إدخال المسمى الوظيفي والقسم', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (selectedJob?._id) {
        await jobPostingsService.update(selectedJob._id, jobForm);
        setJobs(prev => prev.map(j => (j._id === selectedJob._id ? { ...j, ...jobForm } : j)));
        showSnackbar('تم تحديث الوظيفة بنجاح', 'success');
      } else {
        const newJob = {
          ...jobForm,
          _id: `job-${Date.now()}`,
          applicantsCount: 0,
          publishDate: new Date().toISOString(),
        };
        const res = await jobPostingsService.create(jobForm);
        setJobs(prev => [res || newJob, ...prev]);
        showSnackbar('تم إضافة الوظيفة بنجاح', 'success');
      }
      setJobFormOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStage = async applicant => {
    const currentIdx = stageOrder.indexOf(applicant.stage);
    if (currentIdx >= stageOrder.length - 1) return;
    const nextStage = stageOrder[currentIdx + 1];
    await applicantsService.updateStage(applicant._id, nextStage);
    setApplicants(prev =>
      prev.map(a => (a._id === applicant._id ? { ...a, stage: nextStage } : a))
    );
    showSnackbar(`تم نقل المتقدم إلى مرحلة: ${nextStage}`, 'success');
    setStageDialogOpen(false);
  };

  const handleReject = async applicant => {
    await applicantsService.reject(applicant._id, 'لا يستوفي المتطلبات');
    setApplicants(prev =>
      prev.map(a => (a._id === applicant._id ? { ...a, status: 'مرفوض', stage: 'مرفوض' } : a))
    );
    showSnackbar('تم رفض المتقدم', 'info');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await jobPostingsService.remove(deleteTarget._id);
    setJobs(prev => prev.filter(j => j._id !== deleteTarget._id));
    showSnackbar('تم حذف الوظيفة', 'info');
    setDeleteOpen(false);
  };

  const kpis = [
    { label: 'الوظائف المفتوحة', value: dashboard.openPositions, color: '#1565C0' },
    { label: 'إجمالي المتقدمين', value: dashboard.totalApplicants, color: '#00897B' },
    { label: 'المقابلات هذا الأسبوع', value: dashboard.interviewsThisWeek, color: '#F4511E' },
    { label: 'التعيينات هذا الشهر', value: dashboard.hiredThisMonth, color: '#43A047' },
    { label: 'متوسط وقت التوظيف', value: `${dashboard.avgTimeToHire} يوم`, color: '#8E24AA' },
    {
      label: 'متوسط تكلفة التوظيف',
      value: formatCurrency(dashboard.avgCostPerHire),
      color: '#FF8F00',
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              🎯 إدارة التوظيف والاستقطاب
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              إدارة الوظائف الشاغرة وتتبع المتقدمين والمقابلات
            </Typography>
          </Box>
          <Box>
            <Tooltip title="تحديث">
              <IconButton onClick={load} sx={{ color: 'white', mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateJob}
              sx={{ bgcolor: 'white', color: '#0D47A1', '&:hover': { bgcolor: '#E3F2FD' } }}
            >
              إعلان وظيفي جديد
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={6} md={2} key={i}>
            <Card sx={{ borderRadius: 2, borderTop: `3px solid ${k.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                <Typography variant="h5" fontWeight={700} color={k.color}>
                  {k.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {k.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="نظرة عامة" />
          <Tab label="الوظائف الشاغرة" />
          <Tab label="المتقدمين" />
          <Tab label="خط التوظيف" />
        </Tabs>

        {/* Tab 0 — Overview */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  اتجاهات التوظيف الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dashboard.monthlyHiring}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Bar
                      dataKey="applications"
                      name="التقديمات"
                      fill="#42A5F5"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="interviews"
                      name="المقابلات"
                      fill="#FFA726"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar dataKey="hires" name="التعيينات" fill="#66BB6A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  مصادر التوظيف
                </Typography>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={dashboard.sourceDistribution}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={({ source, percentage }) => `${source} (${percentage}%)`}
                    >
                      {dashboard.sourceDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  التوظيف حسب الأقسام
                </Typography>
                <Grid container spacing={2}>
                  {dashboard.departmentHiring.map((d, i) => (
                    <Grid item xs={6} md={4} lg={2} key={i}>
                      <Card sx={{ borderRadius: 2, textAlign: 'center' }}>
                        <CardContent sx={{ py: 2 }}>
                          <Avatar
                            sx={{ bgcolor: `${COLORS[i]}22`, color: COLORS[i], mx: 'auto', mb: 1 }}
                          >
                            <DeptIcon />
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>
                            {d.department}
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color="primary">
                            {d.openings}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {d.applicants} متقدم
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Tab 1 — Job Postings */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 2 }}>
            <Paper
              sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <TextField
                size="small"
                placeholder="بحث..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                size="small"
                label="القسم"
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {departments.map(d => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="الحالة"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {jobStatuses.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <Chip label={`${filteredJobs.length} وظيفة`} variant="outlined" />
            </Paper>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>المسمى الوظيفي</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الموقع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المتقدمين</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الراتب</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredJobs
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map(j => (
                      <TableRow key={j._id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ bgcolor: '#1565C022', color: '#1565C0', width: 32, height: 32 }}
                            >
                              <WorkIcon fontSize="small" />
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {j.title}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{j.department}</TableCell>
                        <TableCell>{j.location}</TableCell>
                        <TableCell>
                          <Chip size="small" label={j.type} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={j.applicantsCount} color="primary" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {formatCurrency(j.salary?.min)} - {formatCurrency(j.salary?.max)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={j.status}
                            color={
                              j.status === 'مفتوح'
                                ? 'success'
                                : j.status === 'قيد المراجعة'
                                  ? 'warning'
                                  : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تعديل">
                            <IconButton size="small" onClick={() => openEditJob(j)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setDeleteTarget(j);
                                setDeleteOpen(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={filteredJobs.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => {
                  setRowsPerPage(+e.target.value);
                  setPage(0);
                }}
                labelRowsPerPage="صفوف:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
              />
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Tab 2 — Applicants */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>المتقدم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الوظيفة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الخبرة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التعليم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المرحلة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التقييم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredApplicants
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map(a => (
                      <TableRow key={a._id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ width: 32, height: 32, fontSize: 14, bgcolor: '#1565C0' }}
                            >
                              {a.name?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {a.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {a.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{a.jobTitle}</Typography>
                        </TableCell>
                        <TableCell>{a.experience}</TableCell>
                        <TableCell>
                          <Chip size="small" label={a.education} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={a.stage}
                            sx={{
                              bgcolor: stageColors[a.stage] || '#E0E0E0',
                              color: '#333',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Rating value={a.rating} precision={0.5} size="small" readOnly />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض">
                            <IconButton size="small" onClick={() => openApplicantDetail(a)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="نقل للمرحلة التالية">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openStageDialog(a)}
                            >
                              <NextStageIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="رفض">
                            <IconButton size="small" color="error" onClick={() => handleReject(a)}>
                              <RejectIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={filteredApplicants.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => {
                  setRowsPerPage(+e.target.value);
                  setPage(0);
                }}
                labelRowsPerPage="صفوف:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
              />
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Tab 3 — Pipeline */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              خط التوظيف (Pipeline)
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {dashboard.pipelineDistribution.map((s, i) => (
                <Grid item xs={6} sm={4} md key={i}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      textAlign: 'center',
                      borderTop: `3px solid ${COLORS[i]}`,
                    }}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="h4" fontWeight={700} color={COLORS[i]}>
                        {s.count}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.stage}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dashboard.pipelineDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={100} fontSize={11} />
                <RTooltip />
                <Bar dataKey="count" name="المتقدمين" radius={[0, 6, 6, 0]}>
                  {dashboard.pipelineDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </TabPanel>
      </Paper>

      {/* Job Create/Edit Dialog */}
      <Dialog open={jobFormOpen} onClose={() => setJobFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {selectedJob ? 'تعديل الوظيفة' : 'إعلان وظيفي جديد'}
          <IconButton onClick={() => setJobFormOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="المسمى الوظيفي"
                value={jobForm.title}
                onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="القسم"
                value={jobForm.department}
                onChange={e => setJobForm(p => ({ ...p, department: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="الموقع"
                value={jobForm.location}
                onChange={e => setJobForm(p => ({ ...p, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="نوع الدوام"
                value={jobForm.type}
                onChange={e => setJobForm(p => ({ ...p, type: e.target.value }))}
              >
                {['دوام كامل', 'دوام جزئي', 'عقد مؤقت', 'تدريب'].map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="الخبرة المطلوبة"
                value={jobForm.experience}
                onChange={e => setJobForm(p => ({ ...p, experience: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الحد الأدنى للراتب"
                type="number"
                value={jobForm.salary?.min}
                onChange={e =>
                  setJobForm(p => ({ ...p, salary: { ...p.salary, min: +e.target.value } }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الحد الأقصى للراتب"
                type="number"
                value={jobForm.salary?.max}
                onChange={e =>
                  setJobForm(p => ({ ...p, salary: { ...p.salary, max: +e.target.value } }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف الوظيفي"
                multiline
                rows={3}
                value={jobForm.description}
                onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJobFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveJob}>
            {selectedJob ? 'تحديث' : 'نشر'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Applicant Detail Dialog */}
      <Dialog
        open={applicantDetailOpen}
        onClose={() => setApplicantDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          تفاصيل المتقدم
          <IconButton onClick={() => setApplicantDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        {selectedApplicant && (
          <DialogContent dividers>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Avatar
                sx={{ width: 64, height: 64, mx: 'auto', mb: 1, bgcolor: '#1565C0', fontSize: 24 }}
              >
                {selectedApplicant.name?.charAt(0)}
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                {selectedApplicant.name}
              </Typography>
              <Chip
                label={selectedApplicant.stage}
                sx={{ bgcolor: stageColors[selectedApplicant.stage], mt: 0.5 }}
              />
            </Box>
            <Grid container spacing={2}>
              {[
                { icon: <WorkIcon />, label: 'الوظيفة', value: selectedApplicant.jobTitle },
                { icon: <EmailIcon />, label: 'البريد', value: selectedApplicant.email },
                { icon: <PhoneIcon />, label: 'الهاتف', value: selectedApplicant.phone },
                { label: 'الخبرة', value: selectedApplicant.experience },
                { label: 'التعليم', value: selectedApplicant.education },
                {
                  label: 'تاريخ التقديم',
                  value: new Date(selectedApplicant.appliedDate).toLocaleDateString('ar-SA'),
                },
              ].map((f, i) => (
                <Grid item xs={6} key={i}>
                  <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {f.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {f.value || '-'}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<NextStageIcon />}
                onClick={() => {
                  setApplicantDetailOpen(false);
                  openStageDialog(selectedApplicant);
                }}
              >
                نقل للمرحلة التالية
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => {
                  handleReject(selectedApplicant);
                  setApplicantDetailOpen(false);
                }}
              >
                رفض
              </Button>
            </Box>
          </DialogContent>
        )}
      </Dialog>

      {/* Stage Advance Dialog */}
      <Dialog open={stageDialogOpen} onClose={() => setStageDialogOpen(false)} maxWidth="xs">
        <DialogTitle>نقل المتقدم للمرحلة التالية</DialogTitle>
        {selectedApplicant && (
          <DialogContent>
            <Typography gutterBottom>
              المتقدم: <strong>{selectedApplicant.name}</strong>
            </Typography>
            <Typography gutterBottom>
              المرحلة الحالية:{' '}
              <Chip
                size="small"
                label={selectedApplicant.stage}
                sx={{ bgcolor: stageColors[selectedApplicant.stage] }}
              />
            </Typography>
            {stageOrder.indexOf(selectedApplicant.stage) < stageOrder.length - 1 && (
              <Typography>
                المرحلة التالية:{' '}
                <Chip
                  size="small"
                  label={stageOrder[stageOrder.indexOf(selectedApplicant.stage) + 1]}
                  color="primary"
                />
              </Typography>
            )}
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setStageDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => handleAdvanceStage(selectedApplicant)}>
            تأكيد النقل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف الوظيفة "{deleteTarget?.title}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
