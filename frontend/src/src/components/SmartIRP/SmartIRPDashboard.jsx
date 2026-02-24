import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule,
  Add,
  Assessment,
  Notifications,
  NotificationsActive
} from '@mui/icons-material';
import { Line, Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import AddGoalDialog from './AddGoalDialog';
import ProgressUpdateDialog from './ProgressUpdateDialog';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

/**
 * Smart IRP Dashboard Component
 * Interactive dashboard for Individual Rehabilitation Plans
 */
const SmartIRPDashboard = ({ irpId }) => {
  const [irp, setIrp] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addGoalDialogOpen, setAddGoalDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  useEffect(() => {
    if (irpId) {
      fetchIRPData();
      fetchAnalytics();
    }
  }, [irpId]);

  const fetchIRPData = async () => {
    try {
      const response = await fetch(`/api/smart-irp/${irpId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setIrp(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch IRP data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/smart-irp/${irpId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'on_track': 'success',
      'at_risk': 'warning',
      'delayed': 'error',
      'achieved': 'info',
      'active': 'primary'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'on_track': <TrendingUp />,
      'at_risk': <Warning />,
      'delayed': <Warning />,
      'achieved': <CheckCircle />,
      'active': <Schedule />
    };
    return icons[status] || null;
  };

  const acknowledgeAlert = async (goalId, alertIndex) => {
    try {
      const response = await fetch(
        `/api/smart-irp/${irpId}/goals/${goalId}/alerts/${alertIndex}/acknowledge`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        fetchIRPData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Progress Timeline Chart
  const getProgressTimelineData = () => {
    if (!analytics?.progressTimeline) return null;

    const timeline = analytics.progressTimeline;
    
    return {
      labels: timeline.map(t => new Date(t.date).toLocaleDateString('ar-SA')),
      datasets: [{
        label: 'التقدم الإجمالي (%)',
        data: timeline.map(t => t.percentage),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4
      }]
    };
  };

  // Domain Progress Chart
  const getDomainProgressData = () => {
    if (!analytics?.domainProgress) return null;

    const domains = Object.keys(analytics.domainProgress);
    const domainNames = {
      motor: 'المهارات الحركية',
      cognitive: 'المهارات المعرفية',
      social: 'المهارات الاجتماعية',
      communication: 'التواصل',
      self_care: 'العناية الذاتية',
      behavioral: 'السلوكية',
      academic: 'الأكاديمية'
    };

    return {
      labels: domains.map(d => domainNames[d] || d),
      datasets: [{
        label: 'متوسط التقدم (%)',
        data: domains.map(d => analytics.domainProgress[d].averageProgress),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(199, 199, 199, 0.6)'
        ],
        borderWidth: 2
      }]
    };
  };

  // Radar Chart for Domain Comparison
  const getDomainRadarData = () => {
    if (!analytics?.domainProgress) return null;

    const domains = Object.keys(analytics.domainProgress);
    const domainNames = {
      motor: 'حركي',
      cognitive: 'معرفي',
      social: 'اجتماعي',
      communication: 'تواصل',
      self_care: 'عناية ذاتية',
      behavioral: 'سلوكي',
      academic: 'أكاديمي'
    };

    return {
      labels: domains.map(d => domainNames[d] || d),
      datasets: [{
        label: 'التقدم الحالي',
        data: domains.map(d => analytics.domainProgress[d].averageProgress),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 2
      }]
    };
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>جاري تحميل البيانات...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!irp) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">لا توجد بيانات</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom>
              خطة التأهيل الفردية الذكية
            </Typography>
            <Typography variant="subtitle1">
              {irp.beneficiaryName} - {irp.irpNumber}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: { md: 'left' } }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Add />}
              onClick={() => setAddGoalDialogOpen(true)}
              sx={{ mr: 1 }}
            >
              إضافة هدف SMART
            </Button>
            <Button
              variant="outlined"
              sx={{ color: 'white', borderColor: 'white' }}
              startIcon={<Assessment />}
            >
              إنشاء تقرير
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* KPIs Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                التقدم الإجمالي
              </Typography>
              <Typography variant="h3" color="primary">
                {irp.kpis.overallProgress}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={irp.kpis.overallProgress}
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الأهداف المحققة
              </Typography>
              <Typography variant="h3" color="success.main">
                {irp.kpis.goalsAchieved}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                من {irp.goals.length} هدف
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                أهداف على المسار الصحيح
              </Typography>
              <Typography variant="h3" color="info.main">
                {irp.kpis.goalsOnTrack}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                أهداف تحتاج انتباه
              </Typography>
              <Typography variant="h3" color="warning.main">
                {irp.kpis.goalsAtRisk + irp.kpis.goalsDelayed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Benchmarks Comparison */}
      {irp.kpis.benchmarks && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              مقارنة مع المعايير المرجعية
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    المتوسط الوطني
                  </Typography>
                  <Typography variant="h4">
                    {irp.kpis.benchmarks.nationalAverage}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="body2">
                    متوسط البرنامج
                  </Typography>
                  <Typography variant="h4">
                    {irp.kpis.benchmarks.programAverage}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    متوسط الفئة العمرية
                  </Typography>
                  <Typography variant="h4">
                    {irp.kpis.benchmarks.ageGroupAverage}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Chip
                label={
                  irp.kpis.benchmarks.comparisonStatus === 'above_average'
                    ? 'أعلى من المتوسط'
                    : irp.kpis.benchmarks.comparisonStatus === 'below_average'
                    ? 'أقل من المتوسط'
                    : 'ضمن المتوسط'
                }
                color={
                  irp.kpis.benchmarks.comparisonStatus === 'above_average'
                    ? 'success'
                    : irp.kpis.benchmarks.comparisonStatus === 'below_average'
                    ? 'warning'
                    : 'default'
                }
                size="large"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {analytics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  مخطط التقدم عبر الزمن
                </Typography>
                {getProgressTimelineData() && (
                  <Line
                    data={getProgressTimelineData()}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top'
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100
                        }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  التقدم حسب المجال
                </Typography>
                {getDomainRadarData() && (
                  <Radar
                    data={getDomainRadarData()}
                    options={{
                      responsive: true,
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 100
                        }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  مقارنة المجالات
                </Typography>
                {getDomainProgressData() && (
                  <Bar
                    data={getDomainProgressData()}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100
                        }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Alerts Section */}
      {analytics?.recentAlerts && analytics.recentAlerts.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <NotificationsActive sx={{ mr: 1 }} />
              التنبيهات الأخيرة ({analytics.recentAlerts.length})
            </Typography>
            {analytics.recentAlerts.map((alert, index) => (
              <Alert
                key={index}
                severity={alert.severity}
                sx={{ mb: 1 }}
                action={
                  !alert.acknowledged && (
                    <Button
                      size="small"
                      onClick={() => acknowledgeAlert(alert.goalId, index)}
                    >
                      تأكيد القراءة
                    </Button>
                  )
                }
              >
                {alert.message}
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            الأهداف الذكية (SMART Goals)
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {irp.goals.map((goal, index) => (
            <Card key={index} sx={{ mb: 2, bgcolor: 'background.default' }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip
                        icon={getStatusIcon(goal.status)}
                        label={goal.status}
                        color={getStatusColor(goal.status)}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={goal.category}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="h6">{goal.title}</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {goal.description}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      الهدف: {goal.measurable.target} {goal.measurable.unit} |
                      الحالي: {goal.measurable.current} {goal.measurable.unit}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: { md: 'left' } }}>
                      <Typography variant="h4" color="primary" gutterBottom>
                        {goal.achievementPercentage}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={goal.achievementPercentage}
                        color={getStatusColor(goal.status)}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        تاريخ الهدف: {new Date(goal.timeBound.targetDate).toLocaleDateString('ar-SA')}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          startIcon={<Add />}
                          onClick={() => {
                            setSelectedGoal(goal);
                            setProgressDialogOpen(true);
                          }}
                        >
                          تحديث التقدم
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                {/* Goal Alerts */}
                {goal.alerts && goal.alerts.filter(a => !a.acknowledged).length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {goal.alerts.filter(a => !a.acknowledged).map((alert, aIndex) => (
                      <Alert
                        key={aIndex}
                        severity={alert.severity}
                        sx={{ mb: 1 }}
                        action={
                          <Button
                            size="small"
                            onClick={() => acknowledgeAlert(goal._id, aIndex)}
                          >
                            تأكيد
                          </Button>
                        }
                      >
                        {alert.message}
                      </Alert>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Add Goal Dialog */}
      <AddGoalDialog
        open={addGoalDialogOpen}
        onClose={() => setAddGoalDialogOpen(false)}
        irpId={irpId}
        onSuccess={(updatedIRP) => {
          setIrp(updatedIRP);
          fetchAnalytics();
        }}
      />
      
      {/* Progress Update Dialog */}
      <ProgressUpdateDialog
        open={progressDialogOpen}
        onClose={() => {
          setProgressDialogOpen(false);
          setSelectedGoal(null);
        }}
        irpId={irpId}
        goal={selectedGoal}
        onSuccess={() => {
          fetchIRPData();
          fetchAnalytics();
        }}
      />
    </Box>
  );
};

export default SmartIRPDashboard;
