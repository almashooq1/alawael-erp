import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  Verified as VerifiedUserIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { therapistService } from '../services/therapistService';

const TherapistDashboard = () => {
  const [therapistData, setTherapistData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await therapistService.getTherapistDashboard('TH001');
        setTherapistData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading therapist dashboard:', error);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري التحميل...</Typography>
      </Container>
    );
  }

  if (!therapistData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="error">حدث خطأ في تحميل البيانات</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header مع معلومات المعالج */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
          animation: 'fadeIn 0.5s ease-in',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                fontSize: '2rem',
              }}
            >
              د.أ
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              أهلاً، دكتور {therapistData.therapist.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {therapistData.therapist.specialization} • {therapistData.therapist.clinic}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
              }}
            >
              تحديث الملف الشخصي
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* البطاقات الإحصائية الرئيسية */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* عدد المرضى */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 2,
              boxShadow: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6,
              },
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
              >
                <Box>
                  <Typography color="inherit" sx={{ opacity: 0.8, mb: 1 }}>
                    عدد المرضى
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {therapistData.stats.totalPatients}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    نشطين الآن: {therapistData.stats.activePatients}
                  </Typography>
                </Box>
                <Avatar sx={{ background: 'rgba(255,255,255,0.3)', width: 50, height: 50 }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* الجلسات الأسبوعية */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: 2,
              boxShadow: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6,
              },
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
              >
                <Box>
                  <Typography color="inherit" sx={{ opacity: 0.8, mb: 1 }}>
                    الجلسات الأسبوعية
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {therapistData.stats.weeklySessions}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    منفذة: {therapistData.stats.completedSessions}
                  </Typography>
                </Box>
                <Avatar sx={{ background: 'rgba(255,255,255,0.3)', width: 50, height: 50 }}>
                  <EventIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* معدل التحسن */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              borderRadius: 2,
              boxShadow: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6,
              },
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
              >
                <Box>
                  <Typography color="inherit" sx={{ opacity: 0.8, mb: 1 }}>
                    معدل التحسن
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {therapistData.stats.improvementRate}%
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    +{therapistData.stats.improvementTrend}% هذا الشهر
                  </Typography>
                </Box>
                <Avatar sx={{ background: 'rgba(255,255,255,0.3)', width: 50, height: 50 }}>
                  <TrendingUpIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* رضا المرضى */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              borderRadius: 2,
              boxShadow: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6,
              },
            }}
          >
            <CardContent>
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
              >
                <Box>
                  <Typography color="inherit" sx={{ opacity: 0.8, mb: 1 }}>
                    رضا المرضى
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {therapistData.stats.patientSatisfaction}%
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    من {therapistData.stats.totalRatings} تقييم
                  </Typography>
                </Box>
                <Avatar sx={{ background: 'rgba(255,255,255,0.3)', width: 50, height: 50 }}>
                  <VerifiedUserIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الإحصائيات التفصيلية */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* جدول الجلسات القادمة */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📅 الجلسات المجدولة اليوم
              </Typography>
              <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>الوقت</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>المريض/الطالب</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {therapistData.todaySessions.map(session => (
                      <TableRow key={session.id} hover>
                        <TableCell>{session.time}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {session.patient.name.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">{session.patient.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{session.type}</TableCell>
                        <TableCell>
                          <Chip
                            label={session.status}
                            color={
                              session.status === 'محدد'
                                ? 'primary'
                                : session.status === 'جاري'
                                  ? 'warning'
                                  : 'success'
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* الحالات الحرجة */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                ⚠️ حالات تحتاج متابعة
              </Typography>
              {therapistData.urgentCases.map(caseItem => (
                <Box
                  key={caseItem.id}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    backgroundColor: caseItem.priority === 'عاجل' ? '#ffebee' : '#fff3e0',
                    borderLeft: `4px solid ${caseItem.priority === 'عاجل' ? '#f44336' : '#ff9800'}`,
                    borderRadius: 1,
                  }}
                >
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {caseItem.patientName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666', mt: 0.5 }}>
                        {caseItem.issue}
                      </Typography>
                    </Box>
                    <Chip
                      label={caseItem.priority}
                      size="small"
                      color={caseItem.priority === 'عاجل' ? 'error' : 'warning'}
                    />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* التقدم الشهري */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📊 توزيع المرضى حسب الحالة
              </Typography>
              {[
                { label: 'تحسن ملحوظ', value: 45, color: '#4caf50' },
                { label: 'تحسن متوسط', value: 35, color: '#2196f3' },
                { label: 'بحاجة متابعة', value: 15, color: '#ff9800' },
                { label: 'حالات حرجة', value: 5, color: '#f44336' },
              ].map(item => (
                <Box key={item.label} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{item.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: item.color }}>
                      {item.value}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.value}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: item.color,
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📈 إحصائيات شهرية
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">إجمالي الجلسات</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {therapistData.monthlyStats.totalSessions}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">الجلسات المكتملة</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                    {therapistData.monthlyStats.completedSessions}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">الجلسات الملغاة</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                    {therapistData.monthlyStats.cancelledSessions}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">معدل الحضور</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                    {therapistData.monthlyStats.attendanceRate}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TherapistDashboard;
