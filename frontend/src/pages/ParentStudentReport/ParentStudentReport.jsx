/**
 * ParentStudentReport — تقرير ولي الأمر
 *
 * Clean, simplified, printable report for parents
 * with Arabic level messages and friendly design.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  School as SchoolIcon,
  EventAvailable as AttendanceIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as TrophyIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Favorite as FavoriteIcon,
  StarBorder as StarIcon,
} from '@mui/icons-material';
import { gradients, brandColors } from 'theme/palette';
import studentManagementService from 'services/studentManagementService';
import logger from 'utils/logger';

// Color for level badges
const levelColor = (level) => {
  if (level === 'ممتاز') return '#43e97b';
  if (level === 'جيد جداً') return '#4facfe';
  if (level === 'جيد') return '#fee140';
  if (level === 'مقبول') return '#ffa751';
  return '#f5576c';
};

const LevelBadge = ({ level }) => (
  <Chip
    label={level}
    size="medium"
    sx={{
      fontWeight: 800,
      bgcolor: `${levelColor(level)}22`,
      color: levelColor(level),
      border: `2px solid ${levelColor(level)}`,
      fontSize: 14,
      px: 1,
    }}
  />
);

const InfoCard = ({ icon, title, children, gradient: bg }) => (
  <Card sx={{ borderRadius: 3, height: '100%', overflow: 'visible' }}>
    <Box
      sx={{
        background: bg || gradients.primary,
        py: 1.5,
        px: 2,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        color: '#fff',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {icon}
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Stack>
    </Box>
    <CardContent sx={{ pt: 2 }}>{children}</CardContent>
  </Card>
);

const ProgressItem = ({ label, value, max = 100 }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">{pct}%</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 10,
          borderRadius: 5,
          bgcolor: '#e8eaf6',
          '& .MuiLinearProgress-bar': {
            borderRadius: 5,
            background: pct >= 80 ? gradients.success : pct >= 50 ? gradients.primary : gradients.orange,
          },
        }}
      />
    </Box>
  );
};

const ParentStudentReport = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await studentManagementService.getParentReport(studentId);
      setReport(res?.data || res);
    } catch (err) {
      logger.error('Error loading parent report:', err);
      setError('تعذر تحميل التقرير. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = () => window.print();

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
          <Button variant="outlined" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/student-reports-center')}>رجوع</Button>
        </Stack>
      </Box>
    );
  }

  if (!report) return null;

  const {
    student = {},
    attendance = {},
    progress = {},
    behavior = {},
    goals = {},
    programs = [],
    recommendations = [],
  } = report;

  return (
    <Box
      sx={{
        p: 3,
        maxWidth: 900,
        mx: 'auto',
        fontFamily: '"Cairo", "Tajawal", sans-serif',
        '@media print': {
          p: 2,
          maxWidth: '100%',
          '& .no-print': { display: 'none !important' },
        },
      }}
    >
      {/* ═══ Toolbar ═══ */}
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }} className="no-print">
        <Button startIcon={<ArrowBackIcon />} onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/student-reports-center')}>
          رجوع
        </Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
          طباعة التقرير
        </Button>
      </Stack>

      {/* ═══ Header ═══ */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 4,
          background: gradients.ocean,
          color: '#fff',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              mx: 'auto',
              mb: 2,
              bgcolor: 'rgba(255,255,255,0.2)',
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            {student.name?.charAt(0) || '؟'}
          </Avatar>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            تقرير ولي الأمر
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600, opacity: 0.95 }}>
            {student.name}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 1 }}>
            {student.studentId && (
              <Chip
                label={`رقم الطالب: ${student.studentId}`}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
                variant="outlined"
                size="small"
              />
            )}
            {student.disabilityType && (
              <Chip
                label={student.disabilityType}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
                variant="outlined"
                size="small"
              />
            )}
            {student.centerName && (
              <Chip
                label={student.centerName}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
                variant="outlined"
                size="small"
              />
            )}
          </Stack>
        </Box>
        {/* Decorative circle */}
        <Box
          sx={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            top: -40,
            right: -40,
          }}
        />
      </Paper>

      {/* ═══ Overall Summary ═══ */}
      {(attendance.message || progress.message) && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            bgcolor: '#f5f9ff',
            borderRight: '4px solid',
            borderRightColor: brandColors.primaryStart,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <FavoriteIcon sx={{ color: '#f5576c', fontSize: 32, mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                ملخص عام
              </Typography>
              {attendance.message && (
                <Typography variant="body1" sx={{ lineHeight: 1.9, color: '#333', mb: 1 }}>
                  الحضور: {attendance.message}
                </Typography>
              )}
              {progress.message && (
                <Typography variant="body1" sx={{ lineHeight: 1.9, color: '#333' }}>
                  التقدم: {progress.message}
                </Typography>
              )}
            </Box>
          </Stack>
        </Paper>
      )}

      {/* ═══ Key Levels ═══ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 2, borderRadius: 3 }}>
            <AttendanceIcon sx={{ fontSize: 36, color: '#4facfe', mb: 1 }} />
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>الحضور</Typography>
            <LevelBadge level={attendance.level || '—'} />
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
              {attendance.rate || 0}%
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 2, borderRadius: 3 }}>
            <TrendingUpIcon sx={{ fontSize: 36, color: '#43e97b', mb: 1 }} />
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>التقدم الأكاديمي</Typography>
            <LevelBadge level={progress.level || '—'} />
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
              {progress.overall || 0}%
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 2, borderRadius: 3 }}>
            <StarIcon sx={{ fontSize: 36, color: '#fee140', mb: 1 }} />
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>السلوك</Typography>
            <LevelBadge level={behavior.points >= 80 ? 'ممتاز' : behavior.points >= 60 ? 'جيد جداً' : behavior.points >= 40 ? 'جيد' : behavior.points >= 20 ? 'مقبول' : '—'} />
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
              {behavior.points || 0} نقطة
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ textAlign: 'center', p: 2, borderRadius: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 36, color: '#a18cd1', mb: 1 }} />
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>تحقيق الأهداف</Typography>
            <LevelBadge level={goals.total > 0 ? (goals.achieved / goals.total >= 0.8 ? 'ممتاز' : goals.achieved / goals.total >= 0.5 ? 'جيد جداً' : 'مقبول') : '—'} />
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
              {goals.achieved || 0}/{goals.total || 0}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* ═══ Attendance Details ═══ */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <InfoCard icon={<AttendanceIcon />} title="تفاصيل الحضور" gradient={gradients.ocean}>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              {attendance.message || 'لا تتوفر تفاصيل الحضور حالياً'}
            </Typography>
            {attendance.totalDays > 0 && (
              <>
                <ProgressItem label="أيام الحضور" value={attendance.present || 0} max={attendance.totalDays} />
                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    إجمالي الأيام: {attendance.totalDays}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    أيام الغياب: {attendance.absent || 0}
                  </Typography>
                </Stack>
                {attendance.streak > 0 && (
                  <Typography variant="body2" sx={{ mt: 1, color: '#43e97b', fontWeight: 600 }}>
                    🔥 سلسلة حضور متتالية: {attendance.streak} يوم
                  </Typography>
                )}
              </>
            )}
          </InfoCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <InfoCard icon={<TrendingUpIcon />} title="التقدم الأكاديمي" gradient={gradients.success}>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              {progress.message || 'لا تتوفر تفاصيل التقدم حالياً'}
            </Typography>
            {(goals.achievedList || []).length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: '#43e97b' }}>أهداف محققة:</Typography>
                {goals.achievedList.map((g, idx) => (
                  <Chip key={idx} label={g} size="small" sx={{ m: 0.3, bgcolor: '#e8f5e9' }} />
                ))}
              </Box>
            )}
            {(goals.inProgressList || []).length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: '#4facfe' }}>أهداف قيد العمل:</Typography>
                {goals.inProgressList.map((g, idx) => (
                  <Chip key={idx} label={g} size="small" sx={{ m: 0.3, bgcolor: '#e3f2fd' }} />
                ))}
              </Box>
            )}
          </InfoCard>
        </Grid>
      </Grid>

      {/* ═══ Behavior & IEP ═══ */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <InfoCard icon={<StarIcon />} title="السلوك والانضباط" gradient={gradients.warning}>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              النقاط: {behavior.points || 0} | الأوسمة: {behavior.badges || 0}
            </Typography>
            {(behavior.recentPositive || []).length > 0 && (
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>سلوكيات إيجابية حديثة:</Typography>
                {behavior.recentPositive.map((h, i) => (
                  <Chip
                    key={i}
                    label={typeof h === 'string' ? h : h.description || h.type}
                    icon={<TrophyIcon sx={{ fontSize: 18 }} />}
                    sx={{ justifyContent: 'flex-start' }}
                  />
                ))}
              </Stack>
            )}
          </InfoCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <InfoCard icon={<SchoolIcon />} title="الأهداف التعليمية" gradient={gradients.purple}>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
              إجمالي الأهداف: {goals.total || 0} — محققة: {goals.achieved || 0} — قيد التنفيذ: {goals.inProgress || 0}
            </Typography>
            {goals.total > 0 && (
              <ProgressItem label="الأهداف المحققة" value={goals.achieved || 0} max={goals.total} />
            )}
          </InfoCard>
        </Grid>
      </Grid>

      {/* ═══ Recommendations ═══ */}
      {recommendations.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <Box sx={{ background: gradients.info, py: 1.5, px: 2, borderTopLeftRadius: 12, borderTopRightRadius: 12, color: '#fff' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <InfoIcon />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                توصيات المتابعة الأسرية
              </Typography>
            </Stack>
          </Box>
          <CardContent>
            <Stack spacing={1.5}>
              {recommendations.map((rec, i) => (
                <Paper
                  key={i}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: '#f8f9fc',
                    borderRight: '3px solid',
                    borderRightColor: brandColors.primaryStart,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <CheckCircleIcon sx={{ color: brandColors.primaryStart, mt: 0.3 }} />
                    <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                      {typeof rec === 'string' ? rec : rec.text || rec.description}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ═══ Footer ═══ */}
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          borderRadius: 3,
          bgcolor: '#f8f9fc',
          mt: 3,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
          مركز الأوائل للتربية الخاصة
        </Typography>
        <Typography variant="caption" color="text.secondary">
          تم إنشاء هذا التقرير بتاريخ {new Date().toLocaleDateString('ar-EG')} — للتواصل مع المعلم المسؤول يرجى زيارة المركز
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          هذا التقرير سري ومخصص لولي الأمر فقط
        </Typography>
      </Paper>
    </Box>
  );
};

export default ParentStudentReport;
