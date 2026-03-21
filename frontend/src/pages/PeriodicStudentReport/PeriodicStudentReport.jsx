/**
 * PeriodicStudentReport — التقرير الدوري للمركز
 *
 * Center-level periodic report with attendance, programs,
 * disability distribution, progress, IEP, behavior, and risk analysis.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';





import { gradients, brandColors } from 'theme/palette';
import studentManagementService from 'services/studentManagementService';
import { useAuth } from 'contexts/AuthContext';
import logger from 'utils/logger';

const COLORS = ['#4facfe', '#43e97b', '#fa709a', '#fee140', '#a18cd1', '#f093fb', '#4158D0', '#ff6b6b'];

const SummaryCard = ({ icon, title, value, subtitle, gradient: bg }) => (
  <Card
    sx={{
      borderRadius: 3,
      color: '#fff',
      background: bg,
      boxShadow: 4,
      transition: 'transform 0.2s',
      '&:hover': { transform: 'translateY(-3px)' },
      '@media print': { boxShadow: 'none', border: '1px solid #ccc' },
    }}
  >
    <CardContent sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ fontSize: 28, opacity: 0.85 }}>{icon}</Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ opacity: 0.92 }}>{title}</Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ opacity: 0.8 }}>{subtitle}</Typography>
      )}
    </CardContent>
  </Card>
);

const DistributionBar = ({ label, value, total, color = 'primary' }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">{value} ({percentage}%)</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={color}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
};

const periodOptions = [
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'monthly', label: 'شهري' },
  { value: 'quarterly', label: 'ربع سنوي' },
  { value: 'semester', label: 'فصلي' },
  { value: 'yearly', label: 'سنوي' },
];

const PeriodicStudentReport = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const centerId = currentUser?.centerId || currentUser?.center?.centerId || 'default';

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('monthly');
  // Dynamic academic year dates: Sep 1 of current/previous year to current date
  const now = new Date();
  const academicYearStart = now.getMonth() >= 8 // Sep+
    ? `${now.getFullYear()}-09-01`
    : `${now.getFullYear() - 1}-09-01`;
  const todayStr = now.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(academicYearStart);
  const [dateTo, setDateTo] = useState(todayStr);

  // Refs to read latest filter values in loadReport without re-creating callback
  const filtersRef = useRef({ period, dateFrom: academicYearStart, dateTo: todayStr });
  useEffect(() => {
    filtersRef.current = { period, dateFrom, dateTo };
  }, [period, dateFrom, dateTo]);

  const loadReport = useCallback(async () => {
    const { period: p, dateFrom: df, dateTo: dt } = filtersRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await studentManagementService.getPeriodicReport(centerId, {
        period: p,
        startDate: df,
        endDate: dt,
      });
      setReport(res?.data || res);
    } catch (err) {
      logger.error('Error loading periodic report:', err);
      setError('تعذر تحميل التقرير الدوري. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  }, [centerId]);

  // Load only on initial mount
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = () => window.print();

  const handleApplyFilter = () => {
    // Validate dates
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      setError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }
    loadReport();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error && !report) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <Alert severity="error">{error}</Alert>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={loadReport}>إعادة المحاولة</Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>رجوع</Button>
        </Stack>
      </Box>
    );
  }

  if (!report) return null;

  const {
    totalStudents = 0,
    attendance = {},
    programs = {},
    disability = {},
    progress: progressData = {},
    iep = {},
    behavior = {},
    risk = {},
    topPerformers = [],
    needsAttention = [],
  } = report;

  // Prepare chart data
  const attendanceDistData = [
    { name: 'ممتاز (95%+)', value: attendance.distribution?.excellent || 0 },
    { name: 'جيد (85-95%)', value: attendance.distribution?.good || 0 },
    { name: 'مقبول (70-85%)', value: attendance.distribution?.average || 0 },
    { name: 'ضعيف (<70%)', value: attendance.distribution?.poor || 0 },
  ].filter(d => d.value > 0);

  const progressDistData = [
    { name: 'ممتاز (80%+)', value: progressData.distribution?.excellent || 0 },
    { name: 'جيد (60-80%)', value: progressData.distribution?.good || 0 },
    { name: 'مقبول (40-60%)', value: progressData.distribution?.average || 0 },
    { name: 'ضعيف (<40%)', value: progressData.distribution?.poor || 0 },
  ].filter(d => d.value > 0);

  const programsBarData = Object.entries(programs.byType || {}).map(([key, val]) => ({
    name: key,
    enrolled: val.enrolled || 0,
    active: val.active || 0,
    completed: val.completed || 0,
    avgProgress: val.avgProgress || 0,
  }));

  const disabilityPieData = Object.entries(disability.byType || {}).map(([key, val]) => ({
    name: key,
    value: val,
  }));

  const riskBarData = [
    { name: 'منخفض', value: risk.low || 0, fill: '#43e97b' },
    { name: 'متوسط', value: risk.medium || 0, fill: '#fee140' },
    { name: 'مرتفع', value: risk.high || 0, fill: '#f5576c' },
  ];

  const periodLabel = periodOptions.find(p => p.value === period)?.label || period;

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 1400,
        mx: 'auto',
        '@media print': {
          p: 1,
          '& .no-print': { display: 'none !important' },
        },
      }}
    >
      {/* ═══ Toolbar ═══ */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
        className="no-print"
      >
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/student-reports-center')}>
          رجوع لمركز التقارير
        </Button>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
            طباعة
          </Button>
          <Button variant="contained" onClick={loadReport}>
            تحديث التقرير
          </Button>
        </Stack>
      </Stack>

      {/* ═══ Title ═══ */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 4,
          background: gradients.ocean,
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          التقرير الدوري للمركز
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          {periodLabel} | {totalStudents} طالب | {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('ar-EG') : '—'}
        </Typography>
      </Paper>

      {/* ═══ Filters ═══ */}
      <Card sx={{ mb: 3, borderRadius: 3 }} className="no-print">
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                label="الفترة"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                size="small"
              >
                {periodOptions.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="من"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="إلى"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button fullWidth variant="contained" onClick={handleApplyFilter}>
                تطبيق الفلتر
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ═══ Summary Cards ═══ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard
            icon={<GroupIcon />}
            title="إجمالي الطلاب"
            value={totalStudents}
            gradient={gradients.primary}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard
            icon={<EventAvailableIcon />}
            title="متوسط الحضور"
            value={`${attendance.averageRate || 0}%`}
            gradient={gradients.ocean}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard
            icon={<TrendingUpIcon />}
            title="متوسط التقدم"
            value={`${progressData.averageProgress || 0}%`}
            gradient={gradients.success}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard
            icon={<SchoolIcon />}
            title="البرامج النشطة"
            value={programs.totalActive || 0}
            gradient={gradients.info}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard
            icon={<AssessmentIcon />}
            title="تحقيق الأهداف"
            value={`${iep.achievementRate || 0}%`}
            gradient={gradients.warning}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard
            icon={<WarningIcon />}
            title="مخاطر مرتفعة"
            value={risk.high || 0}
            gradient={gradients.orange}
          />
        </Grid>
      </Grid>

      {/* ═══ Attendance & Progress Charts ═══ */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                توزيع مستويات الحضور
              </Typography>
              {attendanceDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={attendanceDistData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) => `${name}: ${value}`}
                      dataKey="value"
                    >
                      {attendanceDistData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد بيانات حضور</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                توزيع مستويات التقدم
              </Typography>
              {progressDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={progressDistData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) => `${name}: ${value}`}
                      dataKey="value"
                    >
                      {progressDistData.map((_, index) => (
                        <Cell key={index} fill={COLORS[(index + 4) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد بيانات تقدم</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ═══ Programs Chart ═══ */}
      {programsBarData.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              البرامج العلاجية حسب النوع
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={programsBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="enrolled" name="مسجلون" fill="#4facfe" radius={[4, 4, 0, 0]} />
                <Bar dataKey="active" name="نشطون" fill="#43e97b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="مكتملون" fill="#a18cd1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ═══ Disability Distribution & Risk ═══ */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                <AccessibleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                توزيع أنواع الإعاقة
              </Typography>
              {disabilityPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={disabilityPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) => `${name}: ${value}`}
                      dataKey="value"
                    >
                      {disabilityPieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد بيانات إعاقة</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                <WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                توزيع مستويات المخاطر
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" name="عدد الطلاب" radius={[0, 8, 8, 0]}>
                    {riskBarData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                السلوك والتحفيز
              </Typography>
              <Stack spacing={1}>
                <DistributionBar
                  label="نسبة السلوكيات الإيجابية"
                  value={behavior.positiveEvents || 0}
                  total={(behavior.positiveEvents || 0) + (behavior.negativeEvents || 0)}
                  color="success"
                />
                <Typography variant="body2" color="text.secondary">
                  متوسط نقاط السلوك: {behavior.averagePoints || 0} نقطة
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ═══ IEP Summary ═══ */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            <AssessmentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            ملخص خطط التدخل الفردي (IEP)
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: brandColors.primaryStart }}>
                  {iep.studentsWithIEP || 0}
                </Typography>
                <Typography variant="caption">طالب لديه خطة</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#4facfe' }}>
                  {iep.totalGoals || 0}
                </Typography>
                <Typography variant="caption">إجمالي الأهداف</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#43e97b' }}>
                  {iep.achievedGoals || 0}
                </Typography>
                <Typography variant="caption">أهداف محققة</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#fee140' }}>
                  {iep.achievementRate || 0}%
                </Typography>
                <Typography variant="caption">نسبة التحقيق</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ═══ Top Performers & Needs Attention ═══ */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#43e97b' }}>
                <EmojiEventsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                أفضل الطلاب أداءً
              </Typography>
              {topPerformers.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الطالب</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>التقدم</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الحضور</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topPerformers.map((s, i) => (
                        <TableRow key={s.studentId}>
                          <TableCell>
                            <Avatar sx={{ width: 28, height: 28, bgcolor: '#43e97b', fontSize: 14 }}>
                              {i + 1}
                            </Avatar>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                              onClick={() => navigate(`/student-report/${s.studentId}`)}
                            >
                              {s.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={`${s.progress}%`} size="small" color="success" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip label={`${s.attendanceRate}%`} size="small" color="primary" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد بيانات</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#f5576c' }}>
                <WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                طلاب بحاجة لمتابعة
              </Typography>
              {needsAttention.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>الطالب</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>التقدم</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الحضور</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الأسباب</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {needsAttention.map(s => (
                        <TableRow key={s.studentId}>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                              onClick={() => navigate(`/student-report/${s.studentId}`)}
                            >
                              {s.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={`${s.progress}%`} size="small" color="error" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip label={`${s.attendanceRate}%`} size="small" color="warning" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {(s.reasons || []).map((r, i) => (
                                <Chip key={i} label={r} size="small" color="error" variant="outlined" />
                              ))}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد بيانات</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ═══ Footer ═══ */}
      <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3, bgcolor: '#f8f9fc' }}>
        <Typography variant="caption" color="text.secondary">
          تم إنشاء هذا التقرير آلياً بواسطة نظام الأوائل — {new Date().toLocaleDateString('ar-EG')} |
          التقرير سري ومخصص للاستخدام الرسمي فقط
        </Typography>
      </Paper>
    </Box>
  );
};

export default PeriodicStudentReport;
