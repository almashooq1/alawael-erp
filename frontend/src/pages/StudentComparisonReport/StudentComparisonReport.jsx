/**
 * StudentComparisonReport — تقرير مقارنة الطلاب
 *
 * Compare 2-10 students side-by-side with radar chart,
 * metrics table, and rankings.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';






import { gradients, brandColors } from 'theme/palette';
import studentManagementService from 'services/studentManagementService';
import { useAuth } from 'contexts/AuthContext';
import logger from 'utils/logger';

const STUDENT_COLORS = ['#4facfe', '#43e97b', '#fa709a', '#fee140', '#a18cd1', '#f093fb', '#4158D0', '#ff6b6b', '#00d2ff', '#7F00FF'];

const METRIC_LABELS = {
  attendance: 'الحضور',
  progress: 'التقدم الأكاديمي',
  behavior: 'السلوك',
  iep: 'تحقيق الأهداف',
};

// Transform backend flat student data into metrics for UI
const buildStudentMetrics = (student) => ({
  attendance: student.attendance?.rate ?? 0,
  progress: student.progress?.overall ?? 0,
  behavior: student.behavior?.points ?? 0,
  iep: student.iep?.progress ?? 0,
});

// Normalize backend averages keys to match METRIC_LABELS keys
const normalizeAverages = (avg = {}) => ({
  attendance: avg.attendanceRate ?? 0,
  progress: avg.overallProgress ?? 0,
  behavior: avg.behaviorPoints ?? 0,
  iep: avg.iepProgress ?? 0,
});

// Flatten backend rankings from {byAttendance, byProgress, byBehavior} to sorted array
const flattenRankings = (rankings = {}, students = []) => {
  // Compute overall score per student by averaging metrics
  const scoreMap = {};
  students.forEach(s => {
    const m = buildStudentMetrics(s);
    const vals = Object.values(m).filter(v => typeof v === 'number');
    scoreMap[s.studentId] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  });
  return students
    .map(s => ({ studentId: s.studentId, name: s.name, overallScore: scoreMap[s.studentId] || 0 }))
    .sort((a, b) => b.overallScore - a.overallScore);
};

const rankIcons = ['🥇', '🥈', '🥉'];

const StudentComparisonReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const centerId = currentUser?.centerId || currentUser?.center?.centerId || 'default';

  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Load available students
  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await studentManagementService.getStudents({ centerId, limit: 500 });
        const list = res?.data?.students || res?.students || res?.data || [];
        setAllStudents(Array.isArray(list) ? list : []);
      } catch {
        setAllStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [centerId]);

  // Read studentIds from URL parameters
  useEffect(() => {
    const ids = searchParams.get('studentIds');
    if (ids) {
      setSelectedIds(ids.split(',').filter(Boolean));
    }
  }, [searchParams]);

  const loadComparison = useCallback(async () => {
    if (selectedIds.length < 2) {
      setError('يرجى اختيار طالبين على الأقل للمقارنة');
      return;
    }
    if (selectedIds.length > 10) {
      setError('الحد الأقصى 10 طلاب للمقارنة');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await studentManagementService.getComparisonReport(selectedIds);
      setReport(res?.data || res);
    } catch (err) {
      logger.error('Error loading comparison report:', err);
      setError('تعذر تحميل تقرير المقارنة. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  }, [selectedIds]);

  useEffect(() => {
    if (selectedIds.length >= 2) {
      loadComparison();
    }
  }, []); // Only on initial load with URL params

  const handlePrint = () => window.print();

  const handleAddStudent = (_, student) => {
    if (student && !selectedIds.includes(student._id)) {
      setSelectedIds(prev => [...prev, student._id]);
    }
  };

  const handleRemoveStudent = (id) => {
    setSelectedIds(prev => prev.filter(i => i !== id));
    setReport(null);
  };

  // Normalize report data from backend shape
  const normalizedStudents = (report?.students || []).map(s => ({
    ...s,
    metrics: buildStudentMetrics(s),
  }));
  const normalizedAverages = normalizeAverages(report?.averages);

  // Prepare radar data
  const radarData = normalizedStudents.length > 0
    ? Object.keys(METRIC_LABELS).map(key => {
        const entry = { metric: METRIC_LABELS[key] };
        normalizedStudents.forEach(s => {
          entry[s.name] = s.metrics?.[key] ?? 0;
        });
        return entry;
      })
    : [];

  // Rankings — flatten from backend object to sorted array
  const rankingsData = report ? flattenRankings(report.rankings, report.students || []) : [];

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
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} disabled={!report}>
            طباعة
          </Button>
        </Stack>
      </Stack>

      {/* ═══ Title ═══ */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 4,
          background: gradients.purple,
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <CompareIcon sx={{ fontSize: 44, mb: 1, opacity: 0.85 }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          تقرير مقارنة الطلاب
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
          قارن أداء عدة طلاب جنباً إلى جنب
        </Typography>
      </Paper>

      {/* ═══ Student Selection ═══ */}
      <Card sx={{ mb: 3, borderRadius: 3 }} className="no-print">
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            <PersonAddIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            اختيار الطلاب للمقارنة ({selectedIds.length}/10)
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Autocomplete
                options={allStudents.filter(s => !selectedIds.includes(s._id))}
                getOptionLabel={(opt) => opt.name || opt.studentName || `طالب ${opt._id?.slice(-4)}`}
                onChange={handleAddStudent}
                loading={loadingStudents}
                renderInput={(params) => (
                  <TextField {...params} label="ابحث واختر طالب..." size="small" fullWidth />
                )}
                noOptionsText="لا يوجد طلاب"
                value={null}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                onClick={loadComparison}
                disabled={selectedIds.length < 2 || loading}
                startIcon={<CompareIcon />}
              >
                {loading ? 'جاري المقارنة...' : 'مقارنة الآن'}
              </Button>
            </Grid>
          </Grid>

          {/* Selected chips */}
          {selectedIds.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
              {selectedIds.map((id, idx) => {
                const student = allStudents.find(s => s._id === id);
                const name = student?.name || student?.studentName || `طالب ${id.slice(-4)}`;
                return (
                  <Chip
                    key={id}
                    label={name}
                    onDelete={() => handleRemoveStudent(id)}
                    deleteIcon={<DeleteIcon />}
                    sx={{
                      fontWeight: 600,
                      borderColor: STUDENT_COLORS[idx % STUDENT_COLORS.length],
                      bgcolor: `${STUDENT_COLORS[idx % STUDENT_COLORS.length]}18`,
                    }}
                    variant="outlined"
                  />
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={60} />
        </Box>
      )}

      {report && !loading && (
        <>
          {/* ═══ Radar Comparison ═══ */}
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                المقارنة الشاملة — مخطط رادار
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  {normalizedStudents.map((s, idx) => (
                    <Radar
                      key={s.studentId}
                      name={s.name}
                      dataKey={s.name}
                      stroke={STUDENT_COLORS[idx % STUDENT_COLORS.length]}
                      fill={STUDENT_COLORS[idx % STUDENT_COLORS.length]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ═══ Metrics Detail Table ═══ */}
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                جدول المقارنة التفصيلي
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, width: 160 }}>المعيار</TableCell>
                      {normalizedStudents.map((s, idx) => (
                        <TableCell key={s.studentId} align="center" sx={{ fontWeight: 700 }}>
                          <Stack alignItems="center" spacing={0.5}>
                            <Avatar
                              sx={{
                                bgcolor: STUDENT_COLORS[idx % STUDENT_COLORS.length],
                                width: 32,
                                height: 32,
                                fontSize: 14,
                              }}
                            >
                              {s.name?.charAt(0)}
                            </Avatar>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                              {s.name}
                            </Typography>
                          </Stack>
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#f0f4ff' }}>
                        المتوسط
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.keys(METRIC_LABELS).map(key => {
                      const avg = normalizedAverages[key] ?? 0;
                      return (
                        <TableRow key={key}>
                          <TableCell sx={{ fontWeight: 600 }}>{METRIC_LABELS[key]}</TableCell>
                          {normalizedStudents.map(s => {
                            const val = s.metrics?.[key] ?? 0;
                            const isAbove = val >= avg;
                            return (
                              <TableCell key={s.studentId} align="center">
                                <Chip
                                  label={`${val}%`}
                                  size="small"
                                  color={isAbove ? 'success' : 'warning'}
                                  variant="outlined"
                                  sx={{ fontWeight: 700, minWidth: 60 }}
                                />
                              </TableCell>
                            );
                          })}
                          <TableCell align="center" sx={{ bgcolor: '#f0f4ff' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {avg}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* ═══ Rankings ═══ */}
          {rankingsData.length > 0 && (
            <Card sx={{ mb: 3, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  <TrophyIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#FFD700' }} />
                  الترتيب العام
                </Typography>
                <Grid container spacing={2}>
                  {rankingsData.map((r, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={r.studentId}>
                      <Paper
                        elevation={idx < 3 ? 4 : 1}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          textAlign: 'center',
                          border: idx === 0 ? '2px solid #FFD700' : idx === 1 ? '2px solid #C0C0C0' : idx === 2 ? '2px solid #CD7F32' : '1px solid #e0e0e0',
                          background: idx === 0 ? 'linear-gradient(135deg,#fff9e6,#fffdf5)' : '#fff',
                          cursor: 'pointer',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                          transition: 'all 0.2s',
                        }}
                        onClick={() => navigate(`/student-report/${r.studentId}`)}
                      >
                        <Typography variant="h4" sx={{ mb: 0.5 }}>
                          {rankIcons[idx] || `#${idx + 1}`}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {r.name}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: brandColors.primaryStart }}>
                          {r.overallScore}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          المعدل الإجمالي
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* ═══ Per-Metric Bar Charts ═══ */}
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                مقارنة بالأعمدة حسب المعيار
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={Object.keys(METRIC_LABELS).map(key => {
                    const entry = { metric: METRIC_LABELS[key] };
                    normalizedStudents.forEach(s => {
                      entry[s.name] = s.metrics?.[key] ?? 0;
                    });
                    return entry;
                  })}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip />
                  <Legend />
                  {normalizedStudents.map((s, idx) => (
                    <Bar
                      key={s.studentId}
                      dataKey={s.name}
                      fill={STUDENT_COLORS[idx % STUDENT_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══ Footer ═══ */}
      <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3, bgcolor: '#f8f9fc' }}>
        <Typography variant="caption" color="text.secondary">
          نظام الأوائل — تقرير المقارنة | {new Date().toLocaleDateString('ar-EG')} | سري
        </Typography>
      </Paper>
    </Box>
  );
};

export default StudentComparisonReport;
