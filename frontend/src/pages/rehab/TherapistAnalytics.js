import { useState, useEffect } from 'react';

import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors, surfaceColors } from '../../theme/palette';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Typography
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckIcon from '@mui/icons-material/Check';
import SpeedIcon from '@mui/icons-material/Speed';
import StarIcon from '@mui/icons-material/Star';
import PeopleIcon from '@mui/icons-material/People';
import CancelIcon from '@mui/icons-material/Cancel';
import TimelineIcon from '@mui/icons-material/Timeline';
import PieChartIcon from '@mui/icons-material/PieChart';
import FlagIcon from '@mui/icons-material/Flag';
import BarChartIcon from '@mui/icons-material/BarChart';
import { DocIcon } from 'utils/iconAliases';

const TherapistAnalytics = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [data, setData] = useState(null);
  const [productivity, setProductivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('90');

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [analytics, prod] = await Promise.all([
        therapistService.getAdvancedAnalytics({ period }),
        therapistService.getProductivityReport(),
      ]);
      setData(analytics);
      setProductivity(prod);
      setLoading(false);
    } catch (error) {
      logger.error('Error loading analytics:', error);
      setLoading(false);
      showSnackbar('حدث خطأ في تحميل التحليلات', 'error');
    }
  };

  if (loading || !data) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل التحليلات المتقدمة...</Typography>
      </Container>
    );
  }

  const {
    summary = {},
    sessionsByType = {},
    sessionsByStatus = {},
    weeklyTrend = [],
    ratingDistribution = {},
    goalStats = {},
    docQuality = {},
  } = data;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AnalyticsIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                التحليلات المتقدمة
              </Typography>
              <Typography variant="body2">رؤى تفصيلية وتحليلات أداء شاملة</Typography>
            </Box>
          </Box>
          <FormControl
            size="small"
            sx={{
              minWidth: 120,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
              },
            }}
          >
            <Select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              sx={{ color: 'white' }}
            >
              <MenuItem value="30">30 يوم</MenuItem>
              <MenuItem value="60">60 يوم</MenuItem>
              <MenuItem value="90">90 يوم</MenuItem>
              <MenuItem value="180">180 يوم</MenuItem>
              <MenuItem value="365">سنة</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* ملخص عام */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الجلسات',
            value: summary.totalSessions || 0,
            color: statusColors.info,
            icon: <ScheduleIcon />,
          },
          {
            label: 'جلسات مكتملة',
            value: summary.completedSessions || 0,
            color: statusColors.success,
            icon: <CheckIcon />,
          },
          {
            label: 'معدل الإكمال',
            value: `${summary.completionRate || 0}%`,
            color: statusColors.warning,
            icon: <SpeedIcon />,
          },
          {
            label: 'متوسط التقييم',
            value: summary.averageRating || 0,
            color: '#f59e0b',
            icon: <StarIcon />,
          },
          {
            label: 'عدد المرضى',
            value: summary.totalPatients || 0,
            color: statusColors.purple,
            icon: <PeopleIcon />,
          },
          {
            label: 'الجلسات الملغاة',
            value: summary.cancelledSessions || 0,
            color: statusColors.error,
            icon: <CancelIcon />,
          },
        ].map((stat, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: stat.color, mb: 0.5 }}>{stat.icon}</Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: stat.color }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* الاتجاه الأسبوعي */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                <TimelineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                الاتجاه الأسبوعي
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {weeklyTrend.map((week, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{ minWidth: 80, color: neutralColors.textMuted }}
                    >
                      {new Date(week.week).toLocaleDateString('ar', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Typography>
                    <Box sx={{ flex: 1, display: 'flex', gap: 0.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={
                          week.total
                            ? (week.completed / Math.max(...weeklyTrend.map(w => w.total), 1)) * 100
                            : 0
                        }
                        color="success"
                        sx={{ flex: week.completed || 1, height: 8, borderRadius: 4 }}
                      />
                      {week.cancelled > 0 && (
                        <LinearProgress
                          variant="determinate"
                          value={100}
                          color="error"
                          sx={{
                            flex: week.cancelled,
                            height: 8,
                            borderRadius: 4,
                            maxWidth: `${(week.cancelled / (week.total || 1)) * 100}%`,
                          }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ minWidth: 30, textAlign: 'right' }}>
                      {week.total}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 3, mt: 2, justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }}
                  />
                  <Typography variant="caption">مكتملة</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main' }} />
                  <Typography variant="caption">ملغاة</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* تقرير الإنتاجية */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                <SpeedIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                تقرير الإنتاجية
              </Typography>
              {productivity && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { label: 'اليوم', value: productivity.today },
                    { label: 'هذا الأسبوع', value: productivity.thisWeek },
                    { label: 'هذا الشهر', value: productivity.thisMonth },
                    { label: 'آخر 30 يوم', value: productivity.last30Days },
                    { label: 'آخر 90 يوم', value: productivity.last90Days },
                  ].map((item, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2">{item.label}</Typography>
                      <Chip
                        label={`${item.value || 0} جلسة`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  ))}
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">المعدل اليومي</Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 'bold', color: statusColors.info }}
                    >
                      {productivity.dailyAverage || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">المعدل الأسبوعي</Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 'bold', color: statusColors.success }}
                    >
                      {productivity.weeklyAverage || 0}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* توزيع الجلسات حسب النوع */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                <PieChartIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                توزيع حسب النوع
              </Typography>
              {Object.entries(sessionsByType).map(([type, count]) => (
                <Box
                  key={type}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography variant="body2">{type}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(count / (summary.totalSessions || 1)) * 100}
                      sx={{ width: 80, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" sx={{ minWidth: 25, textAlign: 'right' }}>
                      {count}
                    </Typography>
                  </Box>
                </Box>
              ))}
              {Object.keys(sessionsByType).length === 0 && (
                <Typography color="textSecondary" variant="body2">
                  لا توجد بيانات
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* توزيع التقييمات */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                <StarIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#f59e0b' }} />
                توزيع التقييمات
              </Typography>
              {[5, 4, 3, 2, 1].map(rating => (
                <Box key={rating} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 25 }}>
                    {rating} ★
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={
                      Object.values(ratingDistribution).reduce((a, b) => a + b, 0) > 0
                        ? ((ratingDistribution[rating] || 0) /
                            Object.values(ratingDistribution).reduce((a, b) => a + b, 0)) *
                          100
                        : 0
                    }
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    color={rating >= 4 ? 'success' : rating >= 3 ? 'warning' : 'error'}
                  />
                  <Typography variant="caption" sx={{ minWidth: 20, textAlign: 'right' }}>
                    {ratingDistribution[rating] || 0}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* الأهداف العلاجية */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                <FlagIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                الأهداف العلاجية
              </Typography>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: statusColors.success }}>
                  {goalStats.achievementRate || 0}%
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  معدل تحقيق الأهداف
                </Typography>
              </Box>
              <Grid container spacing={1}>
                {[
                  { label: 'إجمالي', value: goalStats.total || 0, color: statusColors.info },
                  { label: 'محققة', value: goalStats.achieved || 0, color: statusColors.success },
                  { label: 'جارية', value: goalStats.inProgress || 0, color: statusColors.warning },
                  {
                    label: 'لم تبدأ',
                    value: goalStats.notStarted || 0,
                    color: neutralColors.textMuted,
                  },
                ].map((g, i) => (
                  <Grid item xs={6} key={i}>
                    <Paper sx={{ p: 1, textAlign: 'center', bgcolor: surfaceColors.paperAlt }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: g.color }}>
                        {g.value}
                      </Typography>
                      <Typography variant="caption">{g.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* جودة التوثيق */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                <DocIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                جودة التوثيق السريري
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: surfaceColors.paperAlt,
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: statusColors.info }}>
                      {docQuality.totalNotes || 0}
                    </Typography>
                    <Typography variant="caption">إجمالي الملاحظات</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: surfaceColors.paperAlt,
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold', color: statusColors.success }}
                    >
                      {docQuality.withOutcomes || 0}
                    </Typography>
                    <Typography variant="caption">مع نتائج قياسية</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: surfaceColors.paperAlt,
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold', color: statusColors.warning }}
                    >
                      {docQuality.completenessRate || 0}%
                    </Typography>
                    <Typography variant="caption">الاكتمال (SOAP)</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* توزيع حسب الحالة */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                <BarChartIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                توزيع الجلسات حسب الحالة
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(sessionsByStatus).map(([status, count]) => {
                  const statusLabels = {
                    COMPLETED: { label: 'مكتملة', color: 'success' },
                    SCHEDULED: { label: 'مجدولة', color: 'info' },
                    CONFIRMED: { label: 'مؤكدة', color: 'primary' },
                    CANCELLED_BY_PATIENT: { label: 'ألغاها المريض', color: 'error' },
                    CANCELLED_BY_CENTER: { label: 'ألغاها المركز', color: 'warning' },
                    NO_SHOW: { label: 'لم يحضر', color: 'default' },
                    IN_PROGRESS: { label: 'جارية', color: 'secondary' },
                  };
                  const config = statusLabels[status] || { label: status, color: 'default' };
                  return (
                    <Chip
                      key={status}
                      label={`${config.label}: ${count}`}
                      color={config.color}
                      variant="outlined"
                      sx={{ fontWeight: 'bold' }}
                    />
                  );
                })}
              </Box>
              {Object.keys(sessionsByStatus).length === 0 && (
                <Typography color="textSecondary" variant="body2">
                  لا توجد بيانات
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TherapistAnalytics;
