import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
} from 'recharts';
import { motion } from 'framer-motion';

/**
 * ICFProgressChart - Component for visualizing ICF assessment progress
 * مكون لعرض تقدم تقييم ICF
 */
const ICFProgressChart = ({ 
  data = [],
  domain,
  showTrend = true,
  showRadar = true,
  showBar = true,
}) => {
  const domainLabels = {
    bodyFunctions: 'وظائف الجسم',
    bodyStructures: 'أجزاء الجسم',
    activitiesAndParticipation: 'الأنشطة والمشاركة',
    environmentalFactors: 'العوامل البيئية',
    personalFactors: 'العوامل الشخصية',
  };

  const trendData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(assessment => ({
      date: new Date(assessment.date).toLocaleDateString('ar-SA'),
      overall: assessment.overallScore || 0,
      bodyFunctions: assessment.domainScores?.bodyFunctions || 0,
      bodyStructures: assessment.domainScores?.bodyStructures || 0,
      activitiesAndParticipation: assessment.domainScores?.activitiesAndParticipation || 0,
      environmentalFactors: assessment.domainScores?.environmentalFactors || 0,
      personalFactors: assessment.domainScores?.personalFactors || 0,
    }));
  }, [data]);

  const radarData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const latestAssessment = data[data.length - 1];
    const previousAssessment = data.length > 1 ? data[data.length - 2] : null;
    
    return [
      {
        domain: 'وظائف الجسم',
        current: latestAssessment.domainScores?.bodyFunctions || 0,
        previous: previousAssessment?.domainScores?.bodyFunctions || 0,
        fullMark: 4,
      },
      {
        domain: 'أجزاء الجسم',
        current: latestAssessment.domainScores?.bodyStructures || 0,
        previous: previousAssessment?.domainScores?.bodyStructures || 0,
        fullMark: 4,
      },
      {
        domain: 'الأنشطة والمشاركة',
        current: latestAssessment.domainScores?.activitiesAndParticipation || 0,
        previous: previousAssessment?.domainScores?.activitiesAndParticipation || 0,
        fullMark: 4,
      },
      {
        domain: 'العوامل البيئية',
        current: latestAssessment.domainScores?.environmentalFactors || 0,
        previous: previousAssessment?.domainScores?.environmentalFactors || 0,
        fullMark: 4,
      },
      {
        domain: 'العوامل الشخصية',
        current: latestAssessment.domainScores?.personalFactors || 0,
        previous: previousAssessment?.domainScores?.personalFactors || 0,
        fullMark: 4,
      },
    ];
  }, [data]);

  const barData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const latestAssessment = data[data.length - 1];
    const previousAssessment = data.length > 1 ? data[data.length - 2] : null;
    
    return [
      {
        name: 'وظائف الجسم',
        current: latestAssessment.domainScores?.bodyFunctions || 0,
        previous: previousAssessment?.domainScores?.bodyFunctions || 0,
      },
      {
        name: 'أجزاء الجسم',
        current: latestAssessment.domainScores?.bodyStructures || 0,
        previous: previousAssessment?.domainScores?.bodyStructures || 0,
      },
      {
        name: 'الأنشطة والمشاركة',
        current: latestAssessment.domainScores?.activitiesAndParticipation || 0,
        previous: previousAssessment?.domainScores?.activitiesAndParticipation || 0,
      },
      {
        name: 'العوامل البيئية',
        current: latestAssessment.domainScores?.environmentalFactors || 0,
        previous: previousAssessment?.domainScores?.environmentalFactors || 0,
      },
      {
        name: 'العوامل الشخصية',
        current: latestAssessment.domainScores?.personalFactors || 0,
        previous: previousAssessment?.domainScores?.personalFactors || 0,
      },
    ];
  }, [data]);

  const getTrend = (current, previous) => {
    if (previous === undefined || previous === null) return 'neutral';
    const diff = current - previous;
    if (diff < -0.5) return 'improving';
    if (diff > 0.5) return 'worsening';
    return 'stable';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <TrendingDownIcon color="success" />;
      case 'worsening':
        return <TrendingUpIcon color="error" />;
      default:
        return <TrendingFlatIcon color="info" />;
    }
  };

  const getTrendLabel = (trend) => {
    switch (trend) {
      case 'improving':
        return 'تحسن';
      case 'worsening':
        return 'تدهور';
      default:
        return 'مستقر';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving':
        return 'success';
      case 'worsening':
        return 'error';
      default:
        return 'info';
    }
  };

  const latestAssessment = data && data.length > 0 ? data[data.length - 1] : null;
  const previousAssessment = data && data.length > 1 ? data[data.length - 2] : null;

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold" display="flex" alignItems="center" gap={1}>
        <TrendingUpIcon />
        رسم بياني للتقدم
      </Typography>

      {/* Trend Summary */}
      {latestAssessment && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Object.entries(domainLabels).map(([key, label]) => {
            const current = latestAssessment.domainScores?.[key] || 0;
            const previous = previousAssessment?.domainScores?.[key];
            const trend = getTrend(current, previous);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        {label}
                      </Typography>
                      {getTrendIcon(trend)}
                    </Box>
                    <Box display="flex" alignItems="baseline" gap={1} mt={1}>
                      <Typography variant="h4" fontWeight="bold" color={current <= 1 ? 'success' : current <= 2 ? 'warning' : 'error'}>
                        {current.toFixed(1)}
                      </Typography>
                      <Chip 
                        label={getTrendLabel(trend)} 
                        color={getTrendColor(trend)} 
                        size="small" 
                      />
                    </Box>
                    {previous !== undefined && previous !== null && (
                      <Typography variant="caption" color="text.secondary">
                        السابق: {previous.toFixed(1)}
                      </Typography>
                    )}
                  </Paper>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Trend Line Chart */}
        {showTrend && trendData.length > 1 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                اتجاه التقييمات عبر الزمن
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 4]} />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="overall" name="إجمالي" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="bodyFunctions" name="وظائف الجسم" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="bodyStructures" name="أجزاء الجسم" stroke="#ffc658" />
                  <Line type="monotone" dataKey="activitiesAndParticipation" name="الأنشطة والمشاركة" stroke="#ff7300" />
                  <Line type="monotone" dataKey="environmentalFactors" name="العوامل البيئية" stroke="#00C49F" />
                  <Line type="monotone" dataKey="personalFactors" name="العوامل الشخصية" stroke="#FFBB28" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Radar Chart */}
        {showRadar && radarData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                مقارنة المجالات
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="domain" />
                  <PolarRadiusAxis domain={[0, 4]} />
                  <Radar
                    name="التقييم الحالي"
                    dataKey="current"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="التقييم السابق"
                    dataKey="previous"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.3}
                  />
                  <Legend />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Bar Chart */}
        {showBar && barData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                مقارنة التقييم الحالي بالسابق
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 4]} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="current" name="التقييم الحالي" fill="#8884d8" />
                  <Bar dataKey="previous" name="التقييم السابق" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ICFProgressChart;
