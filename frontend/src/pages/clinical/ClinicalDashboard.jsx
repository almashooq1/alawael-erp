import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Chip, Stack, Divider, Alert, CircularProgress,
  Avatar, LinearProgress, Card, CardContent, Badge, Tooltip, IconButton
} from '@mui/material';
import {
  MonitorHeart as MonitorIcon, TrendingUp, TrendingDown, TrendingFlat,
  CalendarMonth, Person, Assessment, CheckCircle, Warning, Info
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';

// ============================================================================
// بيانات وهمية للتطوير — تُستخدم عندما لا يكون الـ API متاحاً
// ============================================================================
const mockData = {
  success: true,
  beneficiary: {
    id: '1',
    name: 'أحمد محمد العلي',
    age: 8,
    diagnosis: 'شلل cerebral palsy'
  },
  icf: {
    latestAssessment: {
      overallScore: 2.3,
      domainScores: {
        bodyFunctions: 2.5,
        bodyStructures: 1.8,
        activitiesAndParticipation: 2.7,
        environmentalFactors: 1.2,
        personalFactors: 2.0
      },
      assessmentDate: new Date().toISOString(),
      coreSetType: 'rehab'
    },
    trend: { direction: 'improving', change: -0.4 },
    history: [
      { date: '2024-01-01', overallScore: 2.7 },
      { date: '2024-03-01', overallScore: 2.5 },
      { date: '2024-06-01', overallScore: 2.3 }
    ]
  },
  carePlan: {
    planId: 'CP-001',
    status: 'active',
    versionNumber: 2,
    goals: [
      {
        goalId: 'g1',
        statement: 'تحسين المشي المستقل',
        domain: 'PHYSICAL',
        progressPercentage: 65,
        status: 'active',
        icfMapping: [{ icfCode: 'b760' }]
      },
      {
        goalId: 'g2',
        statement: 'تطوير التواصل اللفظي',
        domain: 'SPEECH',
        progressPercentage: 40,
        status: 'active',
        icfMapping: [{ icfCode: 'b167' }]
      }
    ],
    overallGoalProgress: 52.5
  },
  sessions: {
    upcoming: [
      {
        id: 's1',
        date: new Date(Date.now() + 86400000),
        therapist: 'د. سارة',
        type: 'physical'
      },
      {
        id: 's2',
        date: new Date(Date.now() + 172800000),
        therapist: 'د. علي',
        type: 'occupational'
      }
    ],
    recent: [
      {
        id: 's3',
        date: new Date(Date.now() - 86400000),
        therapist: 'د. سارة',
        type: 'physical',
        summary: 'تحسن في المشي'
      }
    ],
    stats: { completedThisMonth: 8, totalThisMonth: 10, attendanceRate: 80 }
  },
  mdt: {
    meetings: [
      {
        id: 'm1',
        date: '2024-06-15',
        attendees: ['د. سارة', 'د. علي'],
        decisions: [{ title: 'زيادة جلسات العلاج الطبيعي' }]
      }
    ],
    hasOpenReferrals: false
  },
  alerts: [
    { type: 'icf_reassessment_due', message: 'تقييم ICF متأخر', severity: 'medium' }
  ]
};

// ============================================================================
// خدمة الـ API — مؤقتة حتى يتم إنشاء الملف المنفصل
// ============================================================================
const clinicalDashboardService = {
  getDashboard: async (beneficiaryId) => {
    // في بيئة الإنتاج: استدعاء الـ API الحقيقي
    // const response = await apiClient.get(`/api/v1/clinical/dashboard/${beneficiaryId}`);
    // return response.data;

    // للتطوير: إرجاع البيانات الوهمية بعد تأخير بسيط لمحاكاة الشبكة
    return new Promise((resolve) => {
      setTimeout(() => resolve({ data: mockData }), 600);
    });
  }
};

// ============================================================================
// دوال مساعدة
// ============================================================================

/**
 * تحديد لون درجة ICF الإجمالية
 * أخضر < 2 | أصفر 2–3 | أحمر > 3
 */
const getIcfScoreColor = (score) => {
  if (score < 2) return '#4caf50';      // أخضر
  if (score <= 3) return '#ff9800';     // برتقالي/أصفر
  return '#f44336';                     // أحمر
};

/**
 * تحديد لون حالة الهدف
 */
const getGoalStatusColor = (status) => {
  switch (status) {
    case 'achieved': return 'success';
    case 'active': return 'primary';
    case 'plateau': return 'warning';
    default: return 'default';
  }
};

/**
 * ترجمة حالة الهدف
 */
const getGoalStatusLabel = (status) => {
  switch (status) {
    case 'achieved': return 'مُنجز';
    case 'active': return 'نشط';
    case 'plateau': return 'ركود';
    default: return status;
  }
};

/**
 * ترجمة نوع الجلسة
 */
const getSessionTypeLabel = (type) => {
  const map = {
    physical: 'علاج طبيعي',
    occupational: 'علاج وظيفي',
    speech: 'نطق وتخاطب',
    psychological: 'نفسي',
    mdt: 'اجتماع فريق متعدد التخصصات'
  };
  return map[type] || type;
};

/**
 * تحديد لون شدة التنبيه
 */
const getAlertSeverity = (severity) => {
  switch (severity) {
    case 'high': return 'error';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'info';
  }
};

/**
 * تحديد أيقونة التوجه (improving / stable / worsening)
 */
const TrendIcon = ({ direction, change }) => {
  if (direction === 'improving') {
    return <TrendingDown sx={{ color: '#4caf50', fontSize: 28 }} />;
  }
  if (direction === 'worsening') {
    return <TrendingUp sx={{ color: '#f44336', fontSize: 28 }} />;
  }
  return <TrendingFlat sx={{ color: '#ff9800', fontSize: 28 }} />;
};

// ============================================================================
// مكونات فرعية
// ============================================================================

/**
 * بطاقة المريض — معلومات أساسية
 */
const PatientCard = ({ beneficiary }) => {
  const initials = beneficiary.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
        mb: 2,
        direction: 'rtl'
      }}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: 'primary.main',
            fontSize: 24,
            fontWeight: 700
          }}
        >
          {initials}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {beneficiary.name}
          </Typography>
          <Stack direction="row" spacing={1} mt={0.5}>
            <Chip
              size="small"
              icon={<Person fontSize="small" />}
              label={`العمر: ${beneficiary.age} سنوات`}
              variant="outlined"
            />
            <Chip
              size="small"
              icon={<MonitorIcon fontSize="small" />}
              label={beneficiary.diagnosis}
              color="secondary"
              variant="outlined"
            />
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

/**
 * مخطط رادار ICF — 5 مجالات
 */
const IcfRadarChart = ({ domainScores }) => {
  const data = [
    { domain: 'وظائف الجسم', score: domainScores.bodyFunctions, fullMark: 5 },
    { domain: 'هياكل الجسم', score: domainScores.bodyStructures, fullMark: 5 },
    { domain: 'الأنشطة والمشاركة', score: domainScores.activitiesAndParticipation, fullMark: 5 },
    { domain: 'العوامل البيئية', score: domainScores.environmentalFactors, fullMark: 5 },
    { domain: 'العوامل الشخصية', score: domainScores.personalFactors, fullMark: 5 }
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 2,
        mb: 2,
        direction: 'rtl'
      }}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Typography variant="subtitle1" fontWeight={700} mb={1} textAlign="center">
        <Assessment sx={{ verticalAlign: 'middle', mr: 0.5 }} />
        نظرة عامة على ICF
      </Typography>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e0e0e0" />
          <PolarAngleAxis
            dataKey="domain"
            tick={{ fontSize: 12, fill: '#666' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fontSize: 10, fill: '#999' }}
          />
          <Radar
            name="الدرجة"
            dataKey="score"
            stroke="#1976d2"
            fill="#1976d2"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

/**
 * درجة ICF الإجمالية + الاتجاه
 */
const IcfScoreCard = ({ overallScore, trend }) => {
  const scoreColor = getIcfScoreColor(overallScore);
  const trendLabel =
    trend.direction === 'improving'
      ? 'تحسن'
      : trend.direction === 'worsening'
      ? 'تدهور'
      : 'مستقر';

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
        mb: 2,
        textAlign: 'center',
        direction: 'rtl'
      }}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Typography variant="body2" color="text.secondary" gutterBottom>
        الدرجة الإجمالية لـ ICF
      </Typography>
      <Typography
        variant="h2"
        fontWeight={800}
        sx={{ color: scoreColor, lineHeight: 1.2 }}
      >
        {overallScore.toFixed(1)}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        justifyContent="center"
        alignItems="center"
        mt={1}
      >
        <TrendIcon direction={trend.direction} change={trend.change} />
        <Chip
          size="small"
          label={`${trendLabel} (${trend.change > 0 ? '+' : ''}${trend.change})`}
          sx={{
            bgcolor:
              trend.direction === 'improving'
                ? '#e8f5e9'
                : trend.direction === 'worsening'
                ? '#ffebee'
                : '#fff3e0',
            color:
              trend.direction === 'improving'
                ? '#2e7d32'
                : trend.direction === 'worsening'
                ? '#c62828'
                : '#ef6c00',
            fontWeight: 600
          }}
        />
      </Stack>
    </Paper>
  );
};

/**
 * بطاقة الخطة العلاجية النشطة
 */
const CarePlanCard = ({ carePlan }) => {
  if (!carePlan) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          p: 3,
          mb: 2,
          direction: 'rtl'
        }}
      >
        <Alert severity="info" icon={<Info />}>
          لا توجد خطة علاجية نشطة لهذا المريض
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
        mb: 2,
        direction: 'rtl'
      }}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          <CalendarMonth sx={{ verticalAlign: 'middle', mr: 0.5 }} />
          الخطة العلاجية النشطة
        </Typography>
        <Chip
          size="small"
          label={carePlan.status === 'active' ? 'نشطة' : carePlan.status}
          color="success"
        />
      </Stack>

      <Stack spacing={1} mb={2}>
        <Typography variant="body2" color="text.secondary">
          رقم الخطة: <strong>{carePlan.planId}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          الإصدار: <strong>v{carePlan.versionNumber}</strong>
        </Typography>
      </Stack>

      <Box mb={1}>
        <Stack direction="row" justifyContent="space-between" mb={0.5}>
          <Typography variant="body2" fontWeight={600}>
            التقدم العام للأهداف
          </Typography>
          <Typography variant="body2" fontWeight={700} color="primary">
            {carePlan.overallGoalProgress}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={carePlan.overallGoalProgress}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: '#f5f5f5',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              bgcolor: 'primary.main'
            }
          }}
        />
      </Box>
    </Paper>
  );
};

/**
 * قائمة الأهداف
 */
const GoalsList = ({ goals }) => {
  if (!goals || goals.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 3, direction: 'rtl' }}>
        لا توجد أهداف مسجلة في الخطة الحالية
      </Alert>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
        direction: 'rtl'
      }}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Typography variant="subtitle1" fontWeight={700} mb={2}>
        الأهداف العلاجية
      </Typography>
      <Stack spacing={2}>
        {goals.map((goal, index) => (
          <Box key={goal.goalId}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="body2" fontWeight={600}>
                {goal.statement}
              </Typography>
              <Chip
                size="small"
                label={getGoalStatusLabel(goal.status)}
                color={getGoalStatusColor(goal.status)}
                variant="outlined"
              />
            </Stack>
            <Stack direction="row" spacing={1} mb={0.5}>
              <Chip size="small" label={goal.domain} variant="filled" sx={{ fontSize: 11 }} />
              {goal.icfMapping?.map((map) => (
                <Chip
                  key={map.icfCode}
                  size="small"
                  label={map.icfCode}
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
              ))}
            </Stack>
            <Box>
              <LinearProgress
                variant="determinate"
                value={goal.progressPercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#f5f5f5',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor:
                      goal.status === 'achieved'
                        ? '#4caf50'
                        : goal.status === 'plateau'
                        ? '#ff9800'
                        : '#1976d2'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                {goal.progressPercentage}%
              </Typography>
            </Box>
            {index < goals.length - 1 && <Divider sx={{ mt: 1.5 }} />}
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

/**
 * الجلسات القادمة
 */
const UpcomingSessions = ({ sessions }) => {
  const upcoming = sessions?.upcoming?.slice(0, 5) || [];

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
        mb: 2,
        direction: 'rtl'
      }}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Typography variant="subtitle1" fontWeight={700} mb={2}>
        <CalendarMonth sx={{ verticalAlign: 'middle', mr: 0.5 }} />
        الجلسات القادمة
      </Typography>
      {upcoming.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          لا توجد جلسات قادمة
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {upcoming.map((session) => (
            <Card key={session.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {getSessionTypeLabel(session.type)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {session.therapist}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={new Date(session.date).toLocaleDateString('ar-SA')}
                    color="primary"
                    variant="outlined"
                  />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Paper>
  );
};

/**
 * الجلسات السابقة
 */
const RecentSessions = ({ sessions }) => {
  const recent = sessions?.recent?.slice(0, 5) || [];

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
        mb: 2,
        direction: 'rtl'
      }}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Typography variant="subtitle1" fontWeight={700} mb={2}>
        <CheckCircle sx={{ verticalAlign: 'middle', mr: 0.5 }} />
        الجلسات المنجزة
      </Typography>
      {recent.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          لا توجد جلسات منجزة مؤخراً
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {recent.map((session) => (
            <Card key={session.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {getSessionTypeLabel(session.type)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {session.therapist} — {session.summary}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(session.date).toLocaleDateString('ar-SA')}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Paper>
  );
};

/**
 * اجتماعات الفريق متعدد التخصصات (MDT)
 */
const MdtMeetings = ({ mdt }) => {
  const meetings = mdt?.meetings?.slice(0, 3) || [];

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
        mb: 2,
        direction: 'rtl'
      }}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Typography variant="subtitle1" fontWeight={700} mb={2}>
        <Assessment sx={{ verticalAlign: 'middle', mr: 0.5 }} />
        اجتماعات الفريق متعدد التخصصات
      </Typography>
      {meetings.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          لا توجد اجتماعات مسجلة
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {meetings.map((meeting) => (
            <Card key={meeting.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      اجتماع فريق علاجي
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      الحضور: {meeting.attendees.join('، ')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={`${meeting.decisions.length} قرار`}
                      color="secondary"
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(meeting.date).toLocaleDateString('ar-SA')}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      {mdt?.hasOpenReferrals && (
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
          <Warning sx={{ fontSize: 20, verticalAlign: 'middle', mr: 0.5 }} />
          يوجد إحالات مفتوحة تتطلب المتابعة
        </Alert>
      )}
    </Paper>
  );
};

/**
 * إحصائيات الجلسات
 */
const SessionStats = ({ stats }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
        direction: 'rtl'
      }}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Typography variant="subtitle1" fontWeight={700} mb={2}>
        إحصائيات الجلسات
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 1 }}>
            <Typography variant="h4" fontWeight={800} color="primary">
              {stats?.completedThisMonth || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              جلسة هذا الشهر
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 1 }}>
            <Typography variant="h4" fontWeight={800} color="success.main">
              {stats?.attendanceRate || 0}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              نسبة الحضور
            </Typography>
          </Card>
        </Grid>
      </Grid>
      <Box mt={2}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          إجمالي الجلسات المخططة: {stats?.totalThisMonth || 0}
        </Typography>
      </Box>
    </Paper>
  );
};

/**
 * قسم التنبيهات
 */
const AlertsSection = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      sx={{ mt: 3, direction: 'rtl' }}
    >
      <Typography variant="h6" fontWeight={700} mb={2}>
        <Warning sx={{ verticalAlign: 'middle', mr: 0.5, color: 'warning.main' }} />
        التنبيهات والتذكيرات
      </Typography>
      <Grid container spacing={2}>
        {alerts.map((alert, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Alert
              severity={getAlertSeverity(alert.severity)}
              variant="outlined"
              sx={{ borderRadius: 3, '& .MuiAlert-icon': { alignItems: 'center' } }}
            >
              <Typography variant="body2" fontWeight={600}>
                {alert.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {alert.type === 'goal_overdue'
                  ? 'هدف متأخر'
                  : alert.type === 'icf_reassessment_due'
                  ? 'تقييم ICF'
                  : alert.type === 'plan_review'
                  ? 'مراجعة الخطة'
                  : alert.type}
              </Typography>
            </Alert>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// ============================================================================
// المكون الرئيسي — لوحة التحكم السريرية
// ============================================================================

const ClinicalDashboard = () => {
  const { beneficiaryId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await clinicalDashboardService.getDashboard(beneficiaryId);
        if (response.data?.success) {
          setData(response.data);
        } else {
          setError('فشل في تحميل البيانات');
        }
      } catch (err) {
        console.error('Error fetching clinical dashboard:', err);
        setError('حدث خطأ أثناء جلب البيانات من الخادم');
      } finally {
        setLoading(false);
      }
    };

    if (beneficiaryId) {
      fetchData();
    } else {
      setError('لم يتم تحديد المريض');
      setLoading(false);
    }
  }, [beneficiaryId]);

  // ==========================================================================
  // حالات التحميل والخطأ
  // ==========================================================================
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress size={56} thickness={4} />
        <Typography variant="body1" sx={{ mt: 2 }} color="text.secondary">
          جاري تحميل الملف السريري...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          bgcolor: 'background.default'
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 500, width: '100%', borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            خطأ في التحميل
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          bgcolor: 'background.default'
        }}
      >
        <Alert severity="info" sx={{ maxWidth: 500, width: '100%', borderRadius: 3 }}>
          لا توجد بيانات متاحة
        </Alert>
      </Box>
    );
  }

  // ==========================================================================
  // عرض المحتوى الرئيسي
  // ==========================================================================
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: { xs: 2, md: 3 },
        direction: 'rtl'
      }}
      dir="rtl"
    >
      {/* العنوان الرئيسي */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        mb={3}
      >
        <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
          <MonitorIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          الملف السريري المتكامل
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {data.beneficiary?.name} — الملف الشامل للمتابعة السريرية والتقييم
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* الأعمدة الثلاثة */}
      <Grid container spacing={3}>
        {/* العمود الأول: معلومات المريض + ICF */}
        <Grid item xs={12} md={4}>
          <PatientCard beneficiary={data.beneficiary} />
          <IcfRadarChart domainScores={data.icf?.latestAssessment?.domainScores} />
          <IcfScoreCard
            overallScore={data.icf?.latestAssessment?.overallScore || 0}
            trend={data.icf?.trend || { direction: 'stable', change: 0 }}
          />
        </Grid>

        {/* العمود الثاني: الخطة العلاجية + الأهداف */}
        <Grid item xs={12} md={4}>
          <CarePlanCard carePlan={data.carePlan} />
          <GoalsList goals={data.carePlan?.goals} />
        </Grid>

        {/* العمود الثالث: الجلسات + MDT + الإحصائيات */}
        <Grid item xs={12} md={4}>
          <UpcomingSessions sessions={data.sessions} />
          <RecentSessions sessions={data.sessions} />
          <MdtMeetings mdt={data.mdt} />
          <SessionStats stats={data.sessions?.stats} />
        </Grid>
      </Grid>

      {/* قسم التنبيهات — عرض كامل */}
      <AlertsSection alerts={data.alerts} />

      {/* التذييل */}
      <Box mt={4} textAlign="center">
        <Typography variant="caption" color="text.disabled">
          نظام العوائل ERP — وحدة المتابعة السريرية © 2025
        </Typography>
      </Box>
    </Box>
  );
};

export default ClinicalDashboard;
