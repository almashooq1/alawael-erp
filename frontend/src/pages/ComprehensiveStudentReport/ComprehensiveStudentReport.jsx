/**
 * ComprehensiveStudentReport — التقرير الشامل للطالب
 *
 * Full-page report showing all student data:
 * personal info, disability, programs, assessments, IEP,
 * attendance, behavior, medical, AI insights — with print support.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Stack,
  Button,
  Avatar,
  Divider,
  LinearProgress,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from '@mui/material';
import {
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Accessible as AccessibleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  EventNote as EventNoteIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as EmojiEventsIcon,
  LocalHospital as MedicalIcon,
  Psychology as PsychologyIcon,
  Description as DescriptionIcon,
  Phone as PhoneIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  FamilyRestroom as FamilyIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import { gradients, brandColors } from 'theme/palette';
import studentManagementService from 'services/studentManagementService';
import logger from 'utils/logger';

// ─── Section Header Component ────────────────────
const SectionHeader = ({ icon, title, subtitle, gradient = gradients.primary }) => (
  <Paper
    sx={{
      p: 2,
      mb: 2,
      borderRadius: 3,
      background: gradient,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      '@media print': { breakInside: 'avoid', mb: 1, p: 1.5 },
    }}
  >
    {icon}
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  </Paper>
);

// ─── Info Row Component ──────────────────────────
const InfoRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
      {label}:
    </Typography>
    <Typography variant="body2">{value || '—'}</Typography>
  </Box>
);

// ─── Summary Card ────────────────────────────────
const SummaryCard = ({ icon, title, value, gradient: bg, subtitle }) => (
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
      <Typography variant="body2" sx={{ opacity: 0.92 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// ─── Progress Bar with Label ─────────────────────
const ProgressWithLabel = ({ value, label, color = 'primary' }) => (
  <Box sx={{ mb: 1.5 }}>
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {value}%
      </Typography>
    </Stack>
    <LinearProgress
      variant="determinate"
      value={Math.min(value, 100)}
      color={color}
      sx={{ height: 8, borderRadius: 4 }}
    />
  </Box>
);

// ─── Risk Chip ───────────────────────────────────
const RiskChip = ({ level, label }) => {
  const colorMap = { low: 'success', medium: 'warning', high: 'error' };
  return <Chip label={label} color={colorMap[level] || 'default'} size="small" variant="outlined" />;
};

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════
const ComprehensiveStudentReport = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    if (!studentId) {
      setError('لم يتم تحديد رقم الطالب');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await studentManagementService.getComprehensiveReport(studentId);
      const data = res?.data || res;
      setReport(data);
    } catch (err) {
      logger.error('Error loading comprehensive report:', err);
      setError('تعذر تحميل التقرير الشامل. تأكد من أن رقم الطالب صحيح.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = () => window.print();

  // ─── Loading State ─────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // ─── Error State ───────────────────────────────
  if (error || !report) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2, p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 520 }}>{error || 'لا توجد بيانات'}</Alert>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={loadReport}>إعادة المحاولة</Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>رجوع</Button>
        </Stack>
      </Box>
    );
  }

  const {
    student = {},
    disability = {},
    guardian = {},
    summary = {},
    programs = [],
    assessments = [],
    iep = {},
    attendance = {},
    behavior = {},
    medical = {},
    progress = {},
    riskSignals = [],
    recommendations = [],
    aiInsights = {},
    documents = [],
    recentCommunications = [],
    recentNotes = [],
    generatedAt,
  } = report;

  const attStats = attendance.statistics || {};
  const severityMap = {
    mild: 'بسيطة',
    moderate: 'متوسطة',
    severe: 'شديدة',
    profound: 'عميقة',
  };
  const genderMap = { male: 'ذكر', female: 'أنثى' };
  const statusMap = { active: 'نشط', inactive: 'غير نشط', graduated: 'متخرج', transferred: 'منقول', suspended: 'موقوف' };
  const formatDate = d => d ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  return (
    <Box
      ref={printRef}
      sx={{
        p: 3,
        maxWidth: 1200,
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
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
          رجوع
        </Button>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
            طباعة التقرير
          </Button>
          <Button variant="contained" onClick={loadReport}>
            تحديث
          </Button>
        </Stack>
      </Stack>

      {/* ═══ Report Title ═══ */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 4,
          background: gradients.indigo,
          color: '#fff',
          textAlign: 'center',
          '@media print': { borderRadius: 0, p: 2 },
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          التقرير الشامل للطالب
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 0.5 }}>
          {student.name || '—'}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.75 }}>
          رقم الطالب: {student.studentId || '—'} | المركز: {student.centerName || '—'} | تاريخ التقرير:{' '}
          {generatedAt ? formatDate(generatedAt) : new Date().toLocaleDateString('ar-EG')}
        </Typography>
      </Paper>

      {/* ═══ Summary Cards ═══ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            icon={<EventNoteIcon />}
            title="نسبة الحضور"
            value={`${summary.attendanceRate || 0}%`}
            gradient={gradients.ocean}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            icon={<TrendingUpIcon />}
            title="التقدم العام"
            value={`${summary.overallProgress || 0}%`}
            gradient={gradients.primary}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            icon={<SchoolIcon />}
            title="البرامج النشطة"
            value={`${summary.activePrograms || 0}/${summary.totalPrograms || 0}`}
            gradient={gradients.info}
            subtitle="من إجمالي البرامج"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            icon={summary.riskLevel === 'low' ? <CheckCircleIcon /> : <WarningIcon />}
            title="مستوى المخاطر"
            value={summary.riskLevelLabel || '—'}
            gradient={
              summary.riskLevel === 'low'
                ? gradients.success
                : summary.riskLevel === 'high'
                  ? gradients.redStatus
                  : gradients.orangeStatus
            }
          />
        </Grid>
      </Grid>

      {/* ═══ 1. Personal Info ═══ */}
      <SectionHeader icon={<PersonIcon />} title="البيانات الشخصية" gradient={gradients.primary} />
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
              <Avatar
                src={student.photo}
                sx={{
                  width: 100,
                  height: 100,
                  mx: 'auto',
                  mb: 1,
                  bgcolor: brandColors.primaryStart,
                  fontSize: 40,
                }}
              >
                {(student.name || '?').charAt(0)}
              </Avatar>
              <Chip
                label={statusMap[student.status] || student.status || '—'}
                color={student.status === 'active' ? 'success' : 'default'}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4.5}>
              <InfoRow label="الاسم الكامل" value={student.name} />
              <InfoRow label="الاسم بالإنجليزية" value={student.nameEn} />
              <InfoRow label="رقم الهوية" value={student.nationalId} />
              <InfoRow label="تاريخ الميلاد" value={formatDate(student.dateOfBirth)} />
              <InfoRow label="الجنس" value={genderMap[student.gender] || student.gender} />
            </Grid>
            <Grid item xs={12} md={4.5}>
              <InfoRow label="فصيلة الدم" value={student.bloodType} />
              <InfoRow label="رقم الطالب" value={student.studentId} />
              <InfoRow label="المركز" value={student.centerName} />
              <InfoRow label="تاريخ التسجيل" value={formatDate(student.enrollmentDate)} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ═══ 2. Disability ═══ */}
      <SectionHeader
        icon={<AccessibleIcon />}
        title="بيانات الإعاقة"
        subtitle="التشخيص والأجهزة المساعدة"
        gradient={gradients.assessmentPurple}
      />
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <InfoRow label="نوع الإعاقة الأساسي" value={disability.primaryType} />
              <InfoRow label="النوع الفرعي" value={disability.primarySubtype} />
              <InfoRow label="نوع الإعاقة الثانوي" value={disability.secondaryType || 'لا يوجد'} />
              <InfoRow
                label="الشدة"
                value={severityMap[disability.severity] || disability.severity}
              />
              <InfoRow label="نسبة الإعاقة" value={disability.disabilityPercentage ? `${disability.disabilityPercentage}%` : '—'} />
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoRow label="تاريخ التشخيص" value={formatDate(disability.diagnosisDate)} />
              <InfoRow label="مصدر التشخيص" value={disability.diagnosisSource} />
              <InfoRow label="رقم التقرير الطبي" value={disability.medicalReportNumber} />
              <InfoRow label="الأسباب" value={disability.causes} />
              {disability.assistiveDevices?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    الأجهزة المساعدة:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {disability.assistiveDevices.map((d, i) => (
                      <Chip key={i} label={d} size="small" variant="outlined" color="secondary" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ═══ 3. Guardian ═══ */}
      <SectionHeader
        icon={<FamilyIcon />}
        title="بيانات ولي الأمر"
        gradient={gradients.assessmentBlue}
      />
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            {guardian.father && Object.keys(guardian.father).length > 0 && (
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: brandColors.primaryStart }}>
                  الأب
                </Typography>
                <InfoRow label="الاسم" value={guardian.father.name} />
                <InfoRow label="الهاتف" value={guardian.father.phone} />
                <InfoRow label="المهنة" value={guardian.father.occupation} />
                <InfoRow label="البريد" value={guardian.father.email} />
              </Grid>
            )}
            {guardian.mother && Object.keys(guardian.mother).length > 0 && (
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: brandColors.accentPink }}>
                  الأم
                </Typography>
                <InfoRow label="الاسم" value={guardian.mother.name} />
                <InfoRow label="الهاتف" value={guardian.mother.phone} />
                <InfoRow label="المهنة" value={guardian.mother.occupation} />
                <InfoRow label="البريد" value={guardian.mother.email} />
              </Grid>
            )}
            {guardian.emergencyContact && Object.keys(guardian.emergencyContact).length > 0 && (
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: brandColors.accentCoral }}>
                  جهة الاتصال الطارئة
                </Typography>
                <InfoRow label="الاسم" value={guardian.emergencyContact.name} />
                <InfoRow label="الهاتف" value={guardian.emergencyContact.phone} />
                <InfoRow label="العلاقة" value={guardian.emergencyContact.relationship} />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* ═══ 4. Attendance ═══ */}
      <SectionHeader
        icon={<EventNoteIcon />}
        title="الحضور والانضباط"
        subtitle={`سلسلة الحضور المتتالية: ${attendance.streak || 0} يوم`}
        gradient={gradients.ocean}
      />
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={6} sm={2.4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: brandColors.primaryStart }}>
                  {attStats.totalDays || 0}
                </Typography>
                <Typography variant="caption">إجمالي الأيام</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#43e97b' }}>
                  {attStats.present || 0}
                </Typography>
                <Typography variant="caption">حاضر</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#f5576c' }}>
                  {attStats.absent || 0}
                </Typography>
                <Typography variant="caption">غائب</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ff9800' }}>
                  {attStats.late || 0}
                </Typography>
                <Typography variant="caption">متأخر</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#4facfe' }}>
                  {attStats.excused || 0}
                </Typography>
                <Typography variant="caption">بإذن</Typography>
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <ProgressWithLabel
            value={attStats.attendanceRate || 0}
            label="نسبة الحضور الكلية"
            color={attStats.attendanceRate >= 90 ? 'success' : attStats.attendanceRate >= 75 ? 'warning' : 'error'}
          />
        </CardContent>
      </Card>

      {/* ═══ 5. Programs ═══ */}
      <SectionHeader
        icon={<SchoolIcon />}
        title="البرامج العلاجية"
        subtitle={`${summary.activePrograms || 0} برنامج نشط من أصل ${programs.length}`}
        gradient={gradients.assessmentGreen}
      />
      {programs.length > 0 ? (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                  <TableCell sx={{ fontWeight: 700 }}>البرنامج</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المعالج</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الجلسات/أسبوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المدة (دقيقة)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التقدم</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {programs.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{p.programType}</TableCell>
                    <TableCell>{p.therapist}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{p.sessionsPerWeek}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{p.sessionDuration}</TableCell>
                    <TableCell>
                      <Chip
                        label={p.status === 'active' ? 'نشط' : p.status === 'completed' ? 'مكتمل' : p.status}
                        color={p.status === 'active' ? 'success' : p.status === 'completed' ? 'info' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <ProgressWithLabel value={p.progress || 0} label="" color="primary" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Program Goals */}
          {programs.some(p => p.goals.length > 0) && (
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                أهداف البرامج:
              </Typography>
              {programs
                .filter(p => p.goals.length > 0)
                .map((p, i) => (
                  <Box key={i} sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.programType}:
                    </Typography>
                    {p.goals.map((g, j) => (
                      <Typography key={j} variant="body2" sx={{ pr: 2 }}>
                        • {typeof g === 'string' ? g : g.description || g.goal || JSON.stringify(g)}
                      </Typography>
                    ))}
                  </Box>
                ))}
            </Box>
          )}
        </Card>
      ) : (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
          لا توجد برامج علاجية مسجلة حالياً
        </Alert>
      )}

      {/* ═══ 6. Assessments ═══ */}
      <SectionHeader
        icon={<AssignmentIcon />}
        title="التقييمات"
        subtitle={`عدد التقييمات: ${assessments.length}`}
        gradient={gradients.assessmentOrange}
      />
      {assessments.length > 0 ? (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المقيّم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المجالات</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التوصيات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.type}</TableCell>
                    <TableCell>{formatDate(a.date)}</TableCell>
                    <TableCell>{a.assessor}</TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        {a.areas.map((area, j) => (
                          <Typography key={j} variant="caption">
                            {area.domain}: {area.score}/{area.maxScore} ({area.level})
                          </Typography>
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.3}>
                        {a.recommendations.map((r, j) => (
                          <Typography key={j} variant="caption">
                            • {r}
                          </Typography>
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
          لا توجد تقييمات مسجلة بعد
        </Alert>
      )}

      {/* ═══ 7. IEP ═══ */}
      <SectionHeader
        icon={<TimelineIcon />}
        title="خطة التدخل الفردي (IEP)"
        subtitle={`${iep.achievedGoals || 0}/${iep.totalGoals || 0} هدف محقق | تقدم: ${iep.goalProgress || 0}%`}
        gradient={gradients.assessmentPurple}
      />
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <ProgressWithLabel
            value={iep.goalProgress || 0}
            label="نسبة تحقيق الأهداف"
            color={iep.goalProgress >= 70 ? 'success' : iep.goalProgress >= 40 ? 'warning' : 'error'}
          />
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                الأهداف طويلة المدى ({(iep.longTermGoals || []).length})
              </Typography>
              {(iep.longTermGoals || []).length > 0 ? (
                <Stack spacing={1}>
                  {iep.longTermGoals.map((g, i) => (
                    <Paper key={i} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8f9fc' }}>
                      <Typography variant="body2">
                        {typeof g === 'string' ? g : g.description || g.goal || JSON.stringify(g)}
                      </Typography>
                      {g.status && (
                        <Chip label={g.status} size="small" sx={{ mt: 0.5 }} color={g.status === 'achieved' ? 'success' : 'default'} />
                      )}
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد أهداف</Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                الأهداف قصيرة المدى ({(iep.shortTermGoals || []).length})
              </Typography>
              {(iep.shortTermGoals || []).length > 0 ? (
                <Stack spacing={1}>
                  {iep.shortTermGoals.map((g, i) => (
                    <Paper key={i} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8f9fc' }}>
                      <Typography variant="body2">
                        {typeof g === 'string' ? g : g.description || g.goal || JSON.stringify(g)}
                      </Typography>
                      {g.status && (
                        <Chip label={g.status} size="small" sx={{ mt: 0.5 }} color={g.status === 'achieved' ? 'success' : 'default'} />
                      )}
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد أهداف</Typography>
              )}
            </Grid>
          </Grid>
          {(iep.accommodations || []).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                التسهيلات والتعديلات:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {iep.accommodations.map((a, i) => (
                  <Chip key={i} label={typeof a === 'string' ? a : a.description || JSON.stringify(a)} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
          <Box sx={{ mt: 2 }}>
            <InfoRow label="موافقة ولي الأمر" value={iep.parentConsent ? 'نعم ✓' : 'لا ✗'} />
          </Box>
        </CardContent>
      </Card>

      {/* ═══ 8. Behavior ═══ */}
      <SectionHeader
        icon={<EmojiEventsIcon />}
        title="السلوك والتحفيز"
        subtitle={`النقاط: ${behavior.points || 0} | الشارات: ${(behavior.badges || []).length}`}
        gradient={gradients.warning}
      />
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: brandColors.primaryStart }}>
                  {behavior.points || 0}
                </Typography>
                <Typography variant="body2">نقاط السلوك</Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" justifyContent="space-around">
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#43e97b' }}>
                    {behavior.positiveBehaviors || 0}
                  </Typography>
                  <Typography variant="caption">إيجابي</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#f5576c' }}>
                    {behavior.negativeBehaviors || 0}
                  </Typography>
                  <Typography variant="caption">سلبي</Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                الشارات:
              </Typography>
              {(behavior.badges || []).length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {behavior.badges.map((b, i) => (
                    <Chip
                      key={i}
                      icon={<EmojiEventsIcon />}
                      label={typeof b === 'string' ? b : b.name || b.title || JSON.stringify(b)}
                      color="warning"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد شارات بعد</Typography>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                آخر السلوكيات:
              </Typography>
              {(behavior.recentLog || []).length > 0 ? (
                <Stack spacing={0.5}>
                  {behavior.recentLog.slice(0, 5).map((log, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={log.type === 'positive' ? '+' : '−'}
                        size="small"
                        color={log.type === 'positive' ? 'success' : 'error'}
                        sx={{ minWidth: 28 }}
                      />
                      <Typography variant="caption">
                        {log.behavior || '—'} ({log.points || 0} نقطة)
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">لا يوجد سجل سلوك</Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ═══ 9. Medical ═══ */}
      <SectionHeader
        icon={<MedicalIcon />}
        title="الملف الطبي"
        gradient={gradients.redStatus}
      />
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                الحساسية ({(medical.allergies || []).length})
              </Typography>
              {(medical.allergies || []).length > 0 ? (
                <Stack spacing={0.5}>
                  {medical.allergies.map((a, i) => (
                    <Chip
                      key={i}
                      label={typeof a === 'string' ? a : a.name || JSON.stringify(a)}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد حساسية مسجلة</Typography>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                الأدوية ({(medical.medications || []).length})
              </Typography>
              {(medical.medications || []).length > 0 ? (
                <Stack spacing={0.5}>
                  {medical.medications.map((m, i) => (
                    <Chip
                      key={i}
                      label={typeof m === 'string' ? m : m.name || JSON.stringify(m)}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد أدوية</Typography>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                الأمراض المزمنة ({(medical.chronicConditions || []).length})
              </Typography>
              {(medical.chronicConditions || []).length > 0 ? (
                <Stack spacing={0.5}>
                  {medical.chronicConditions.map((c, i) => (
                    <Chip
                      key={i}
                      label={typeof c === 'string' ? c : c.name || JSON.stringify(c)}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">لا توجد أمراض مزمنة</Typography>
              )}
            </Grid>
          </Grid>
          {(medical.vision || medical.hearing) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={3}>
                {medical.vision && Object.keys(medical.vision).length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      البصر:
                    </Typography>
                    {Object.entries(medical.vision).map(([k, v]) => (
                      <InfoRow key={k} label={k} value={String(v)} />
                    ))}
                  </Grid>
                )}
                {medical.hearing && Object.keys(medical.hearing).length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      السمع:
                    </Typography>
                    {Object.entries(medical.hearing).map(([k, v]) => (
                      <InfoRow key={k} label={k} value={String(v)} />
                    ))}
                  </Grid>
                )}
              </Grid>
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══ 10. Progress & Skills ═══ */}
      <SectionHeader
        icon={<TrendingUpIcon />}
        title="التقدم والمهارات"
        subtitle={`التقدم العام: ${progress.overallProgress || 0}%`}
        gradient={gradients.assessmentGreen}
      />
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <ProgressWithLabel
            value={progress.overallProgress || 0}
            label="التقدم العام"
            color={progress.overallProgress >= 70 ? 'success' : progress.overallProgress >= 40 ? 'warning' : 'error'}
          />
          {(progress.skills || []).length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                المهارات:
              </Typography>
              <Grid container spacing={1}>
                {progress.skills.map((s, i) => (
                  <Grid item xs={12} sm={6} key={i}>
                    <ProgressWithLabel value={s.level || 0} label={s.skill} color="info" />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
          {(progress.milestones || []).length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                الإنجازات المهمة:
              </Typography>
              <Stack spacing={0.5}>
                {progress.milestones.map((m, i) => (
                  <Typography key={i} variant="body2">
                    ✓ {typeof m === 'string' ? m : m.description || m.title || JSON.stringify(m)}
                  </Typography>
                ))}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══ 11. Risk Signals ═══ */}
      {riskSignals.length > 0 && (
        <>
          <SectionHeader
            icon={<WarningIcon />}
            title="مؤشرات المخاطر"
            gradient={gradients.orangeStatus}
          />
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                {riskSignals.map((r, i) => (
                  <Box key={i}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.label}</Typography>
                      <RiskChip level={r.level} label={r.levelLabel} />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={r.score}
                      color={r.level === 'low' ? 'success' : r.level === 'medium' ? 'warning' : 'error'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══ 12. Recommendations ═══ */}
      {recommendations.length > 0 && (
        <>
          <SectionHeader
            icon={<LightbulbIcon />}
            title="التوصيات وخطة التحسين"
            gradient={gradients.assessmentBlue}
          />
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {recommendations.map((rec, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Card sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {rec.title}
                      </Typography>
                      <Chip label={rec.priority} size="small" color={rec.priority === 'عالية' ? 'error' : 'warning'} />
                    </Stack>
                    <Divider sx={{ mb: 1 }} />
                    <Stack spacing={0.5}>
                      {(rec.actions || []).map((action, j) => (
                        <Typography key={j} variant="body2">
                          • {action}
                        </Typography>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* ═══ 13. AI Insights ═══ */}
      {aiInsights.learningStyle && (
        <>
          <SectionHeader
            icon={<PsychologyIcon />}
            title="الرؤى الذكية (AI)"
            subtitle={`آخر تحليل: ${aiInsights.lastAnalysis ? formatDate(aiInsights.lastAnalysis) : '—'}`}
            gradient={gradients.settings}
          />
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <InfoRow label="أسلوب التعلم" value={aiInsights.learningStyle} />
                  <InfoRow label="التقدم المتوقع" value={aiInsights.predictedProgress !== null ? `${aiInsights.predictedProgress}%` : '—'} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    البرامج الموصى بها:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {(aiInsights.recommendedPrograms || []).map((p, i) => (
                      <Chip key={i} label={p} size="small" color="primary" variant="outlined" />
                    ))}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    اقتراحات:
                  </Typography>
                  <Stack spacing={0.3}>
                    {(aiInsights.suggestions || []).map((s, i) => (
                      <Typography key={i} variant="body2">• {s}</Typography>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
              {(aiInsights.riskFactors || []).length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    عوامل الخطر:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {aiInsights.riskFactors.map((r, i) => (
                      <Chip key={i} label={r} size="small" color="error" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══ 14. Documents ═══ */}
      {documents.length > 0 && (
        <>
          <SectionHeader
            icon={<DescriptionIcon />}
            title="الوثائق"
            subtitle={`${documents.length} وثيقة`}
            gradient={gradients.infoDeep}
          />
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                    <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>تاريخ الرفع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>تاريخ الانتهاء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.type}</TableCell>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>{formatDate(d.uploadDate)}</TableCell>
                      <TableCell>{formatDate(d.expiryDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      {/* ═══ 15. Recent Communications ═══ */}
      {recentCommunications.length > 0 && (
        <>
          <SectionHeader
            icon={<PhoneIcon />}
            title="آخر الاتصالات"
            gradient={gradients.greenStatus}
          />
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                    <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الاتجاه</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الموضوع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الملخص</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentCommunications.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.type}</TableCell>
                      <TableCell>{c.direction}</TableCell>
                      <TableCell>{c.subject}</TableCell>
                      <TableCell>{c.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      {/* ═══ 16. Notes ═══ */}
      {recentNotes.length > 0 && (
        <>
          <SectionHeader
            icon={<DescriptionIcon />}
            title="آخر الملاحظات"
            gradient={gradients.subtle}
          />
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Stack spacing={1.5}>
                {recentNotes.map((n, i) => (
                  <Paper key={i} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8f9fc' }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Chip label={n.category} size="small" variant="outlined" />
                      <Typography variant="caption" color="text.secondary">{n.author}</Typography>
                    </Stack>
                    <Typography variant="body2">{n.content}</Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══ Footer ═══ */}
      <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3, bgcolor: '#f8f9fc', mt: 4 }}>
        <Typography variant="caption" color="text.secondary">
          تم إنشاء هذا التقرير آلياً بواسطة نظام الأوائل — {new Date().toLocaleDateString('ar-EG')} |
          التقرير سري ومخصص للاستخدام الرسمي فقط
        </Typography>
      </Paper>
    </Box>
  );
};

export default ComprehensiveStudentReport;
