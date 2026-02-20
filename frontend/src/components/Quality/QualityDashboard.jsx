import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Paper
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  VerifiedUser as VerifiedUserIcon,
  Checklist as ChecklistIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

const QualityDashboard = () => {
  const { get } = useApi();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await get('/quality/dashboard');
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (err) {
      setError('فشل تحميل بيانات لوحة معايير الجودة');
      console.error('Error fetching quality dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderStatCard = (title, value, icon, color, subtitle) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.lighter`,
              borderRadius: 2,
              p: 1.5
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const getStandardCategoryLabel = (category) => {
    const labels = {
      saudi_health_commission: 'الهيئة السعودية',
      local_quality: 'معايير محلية',
      carf: 'CARF',
      jci: 'JCI',
      iso: 'ISO',
      national_accreditation: 'اعتماد وطني'
    };
    return labels[category] || category;
  };

  const getComplianceColor = (level) => {
    const colors = {
      fully_compliant: 'success',
      partially_compliant: 'warning',
      non_compliant: 'error',
      not_applicable: 'default',
      under_review: 'info'
    };
    return colors[level] || 'default';
  };

  const getComplianceLabel = (level) => {
    const labels = {
      fully_compliant: 'ملتزم بالكامل',
      partially_compliant: 'ملتزم جزئياً',
      non_compliant: 'غير ملتزم',
      not_applicable: 'غير قابل للتطبيق',
      under_review: 'قيد المراجعة'
    };
    return labels[level] || level;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          إدارة معايير الجودة والاعتمادات
        </Typography>
        <Box>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            color="primary"
            sx={{ mr: 1 }}
          >
            إضافة معيار
          </Button>
          <IconButton onClick={fetchDashboardData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatCard(
            'معايير الجودة النشطة',
            dashboardData?.standardsByCategory?.reduce((sum, item) => sum + item.count, 0) || 0,
            <AssessmentIcon color="primary" />,
            'primary',
            'المعايير المطبقة حالياً'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatCard(
            'الاعتمادات السارية',
            dashboardData?.accreditationsByStatus?.find(item => item._id === 'active')?.count || 0,
            <VerifiedUserIcon color="success" />,
            'success',
            'الشهادات الفعالة'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatCard(
            'اعتمادات تنتهي قريباً',
            dashboardData?.expiringAccreditations || 0,
            <WarningIcon color="warning" />,
            'warning',
            'خلال 90 يوماً'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatCard(
            'النتائج المفتوحة',
            dashboardData?.openFindings || 0,
            <ChecklistIcon color="error" />,
            'error',
            'تحتاج إجراءات تصحيحية'
          )}
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable">
          <Tab label="نظرة عامة" />
          <Tab label="المعايير" />
          <Tab label="الاعتمادات" />
          <Tab label="المراجعات" />
          <Tab label="الامتثال" />
          <Tab label="المؤشرات" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Standards by Category */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  المعايير حسب الفئة
                </Typography>
                {dashboardData?.standardsByCategory?.map((item) => (
                  <Box key={item._id} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="body1">
                      {getStandardCategoryLabel(item._id)}
                    </Typography>
                    <Chip label={item.count} color="primary" />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Accreditations Status */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  حالة الاعتمادات
                </Typography>
                {dashboardData?.accreditationsByStatus?.map((item) => (
                  <Box key={item._id} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="body1">
                      {item._id === 'active' && 'فعال'}
                      {item._id === 'expired' && 'منتهي'}
                      {item._id === 'pending_renewal' && 'قيد التجديد'}
                      {item._id === 'suspended' && 'معلق'}
                    </Typography>
                    <Chip
                      label={item.count}
                      color={item._id === 'active' ? 'success' : 'default'}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Audits */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  المراجعات الأخيرة
                </Typography>
                {dashboardData?.recentAudits?.map((audit) => (
                  <Paper key={audit._id} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {audit.titleAr || audit.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(audit.auditDate).toLocaleDateString('ar-SA')}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        {audit.overallScore && (
                          <Chip
                            label={`${audit.overallScore}%`}
                            color={audit.overallScore >= 80 ? 'success' : audit.overallScore >= 60 ? 'warning' : 'error'}
                          />
                        )}
                        <Chip
                          label={audit.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                          size="small"
                          color={audit.status === 'completed' ? 'success' : 'info'}
                        />
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Compliance Overview */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  نظرة عامة على الامتثال
                </Typography>
                {dashboardData?.complianceOverview?.map((item) => (
                  <Box key={item._id} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        {getComplianceLabel(item._id)}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.count}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(item.count / dashboardData.complianceOverview.reduce((sum, i) => sum + i.count, 0)) * 100}
                      color={getComplianceColor(item._id)}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Quality Indicators */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  أداء مؤشرات الجودة
                </Typography>
                {dashboardData?.indicatorsSummary?.slice(0, 5).map((indicator) => (
                  <Paper key={indicator.indicatorId} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {indicator.nameAr || indicator.name}
                      </Typography>
                      {indicator.achieving ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <WarningIcon color="warning" />
                      )}
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="textSecondary">
                        الهدف: {indicator.targetValue}
                      </Typography>
                      <Typography variant="caption" fontWeight="bold" color={indicator.achieving ? 'success.main' : 'warning.main'}>
                        الحالي: {indicator.currentValue}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              إدارة المعايير
            </Typography>
            <Alert severity="info">
              سيتم إضافة واجهة إدارة المعايير التفصيلية قريباً
            </Alert>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              إدارة الاعتمادات
            </Typography>
            <Alert severity="info">
              سيتم إضافة واجهة إدارة الاعتمادات التفصيلية قريباً
            </Alert>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              مراجعات الجودة
            </Typography>
            <Alert severity="info">
              سيتم إضافة واجهة المراجعات التفصيلية قريباً
            </Alert>
          </CardContent>
        </Card>
      )}

      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              تتبع الامتثال
            </Typography>
            <Alert severity="info">
              سيتم إضافة واجهة تتبع الامتثال التفصيلية قريباً
            </Alert>
          </CardContent>
        </Card>
      )}

      {activeTab === 5 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom">
              مؤشرات الجودة
            </Typography>
            <Alert severity="info">
              سيتم إضافة واجهة مؤشرات الجودة التفصيلية قريباً
            </Alert>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default QualityDashboard;
