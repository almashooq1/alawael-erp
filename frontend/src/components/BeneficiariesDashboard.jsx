import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Alert as AlertIcon
} from '@mui/icons-material';
import { fetchBeneficiaries } from '../store/slices/beneficiariesSlice';

function BeneficiariesDashboard() {
  const dispatch = useDispatch();
  const { beneficiaries, loading, pagination } = useSelector(state => state.beneficiaries);

  useEffect(() => {
    dispatch(fetchBeneficiaries({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Calculate statistics
  const totalBeneficiaries = pagination?.total || 0;
  const activeBeneficiaries = beneficiaries?.filter(b => b.status !== 'inactive').length || 0;
  const newThisMonth = beneficiaries?.filter(b => {
    const createdDate = new Date(b.createdAt);
    const today = new Date();
    return createdDate.getMonth() === today.getMonth() &&
           createdDate.getFullYear() === today.getFullYear();
  }).length || 0;
  const withMedicalRecords = beneficiaries?.filter(b => b.medicalRecords?.length > 0).length || 0;

  const StatCard = ({ icon: Icon, title, value, subtitle, color, progress }) => (
    <Card sx={{ height: '100%', bgcolor: `${color}10`, borderLeft: `4px solid ${color}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Icon sx={{ fontSize: 32, color }} />
          <Typography variant="h6" sx={{ color, fontWeight: 'bold' }}>
            {value}
          </Typography>
        </Box>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="textSecondary">
            {subtitle}
          </Typography>
        )}
        {progress !== undefined && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                bgcolor: `${color}20`,
                '& .MuiLinearProgress-bar': { bgcolor: color }
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={PeopleIcon}
          title="إجمالي المستفيدين"
          value={totalBeneficiaries}
          color="#1976d2"
          progress={(totalBeneficiaries / 1000) * 100}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={CheckCircleIcon}
          title="مستفيدين نشطين"
          value={activeBeneficiaries}
          subtitle={`${((activeBeneficiaries / totalBeneficiaries) * 100).toFixed(1)}% من الإجمالي`}
          color="#4caf50"
          progress={(activeBeneficiaries / totalBeneficiaries) * 100}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={TrendingUpIcon}
          title="مضاف هذا الشهر"
          value={newThisMonth}
          subtitle="مستفيد جديد"
          color="#ff9800"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={AlertIcon}
          title="مع سجلات طبية"
          value={withMedicalRecords}
          subtitle={`${((withMedicalRecords / totalBeneficiaries) * 100).toFixed(1)}% لديهم ملفات`}
          color="#f44336"
          progress={(withMedicalRecords / totalBeneficiaries) * 100}
        />
      </Grid>

      {/* Chart or detailed stats could go here */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              معلومات سريعة
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography color="textSecondary" gutterBottom>
                    متوسط المستفيدين النشطين يومياً
                  </Typography>
                  <Typography variant="h6">
                    {totalBeneficiaries > 0 ? Math.round(activeBeneficiaries / 30) : 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography color="textSecondary" gutterBottom>
                    نسبة الملفات الطبية المكتملة
                  </Typography>
                  <Typography variant="h6">
                    {totalBeneficiaries > 0 ? `${((withMedicalRecords / totalBeneficiaries) * 100).toFixed(1)}%` : '0%'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default BeneficiariesDashboard;
