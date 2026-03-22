import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import apiClient from 'services/api.client';
import logger from 'utils/logger';
import { getUserId } from 'utils/storageService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { Psychology as PsychologyIcon } from '@mui/icons-material';
import { gradients, statusColors, chartColors } from '../../theme/palette';

const AIAnalyticsDashboard = () => {
  const showSnackbar = useSnackbar();
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run once on mount
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      // Determine userId - in a real app, this comes from auth context.
      // We will try to get it from localStorage or fallback to a demo ID if testing.
      // const userId = localStorage.getItem('userId') || 'demo-user-id';

      // For now, let's just use the current user from session or a hardcoded one for the concept
      // In production, endpoints should use req.user from token.
      // The endpoints use req.user.id from token, so apiClient interceptors handle auth.
      // apiClient is configured with interceptors (services/api.client.js).

      const userId = getUserId();
      if (!userId) {
        // If no user, mock data for display purposes
        setPredictions({
          prediction: { value: 78.5, confidence: 0.92 },
          factors: [
            { factor: 'الاتجاه التاريخي', weight: 0.35 },
            { factor: 'مستوى النشاط', weight: 0.25 },
            { factor: 'التفاعل', weight: 0.2 },
            { factor: 'عوامل خارجية', weight: 0.2 },
          ],
        });
        setRecommendations([
          {
            title: 'أداء جيد',
            description: 'استمر في الأداء المتميز!',
            priority: 'low',
            expectedImpact: 0.1,
          },
          {
            title: 'زيادة النشاط',
            description: 'حاول تسجيل الدخول بشكل أكثر تكراراً.',
            priority: 'medium',
            expectedImpact: 0.2,
          },
        ]);
        setLoading(false);
        return;
      }

      const [predData, recData] = await Promise.all([
        apiClient.get(`/ai-predictions/predictions/${userId}`),
        apiClient.get(`/ai-predictions/recommendations/${userId}`),
      ]);

      setPredictions(predData.data[0]); // Latest prediction
      setRecommendations(recData.data);

      // Try to load trend data from API
      try {
        const tData = await apiClient.get(`/ai-predictions/trends/${userId}`);
        if (Array.isArray(tData?.data) && tData.data.length > 0) {
          setTrendData(tData.data);
        }
      } catch {
        // Trend endpoint may not exist — will use computed fallback
      }
    } catch (err) {
      logger.error(err);
      showSnackbar('حدث خطأ أثناء تحميل بيانات التحليلات، يتم عرض بيانات تجريبية', 'error');
      // استخدام بيانات تجريبية عند فشل الاتصال
      setPredictions({
        prediction: { value: 78.5, confidence: 0.92 },
        factors: [
          { factor: 'الاتجاه التاريخي', weight: 0.35 },
          { factor: 'مستوى النشاط', weight: 0.25 },
          { factor: 'التفاعل', weight: 0.2 },
          { factor: 'عوامل خارجية', weight: 0.2 },
        ],
      });
      setRecommendations([
        {
          title: 'أداء جيد',
          description: 'استمر في الأداء المتميز!',
          priority: 'low',
          expectedImpact: 0.1,
        },
        {
          title: 'زيادة النشاط',
          description: 'حاول تسجيل الدخول بشكل أكثر تكراراً',
          priority: 'medium',
          expectedImpact: 0.2,
        },
        {
          title: 'تحسين التفاعل',
          description: 'شارك في المزيد من الأنشطة لتحسين نتائجك',
          priority: 'high',
          expectedImpact: 0.35,
        },
      ]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PsychologyIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              تحليلات الذكاء الاصطناعي
            </Typography>
            <Typography variant="body2">رؤى وتحليلات ذكية لتحسين الأداء</Typography>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          جاري استخدام بيانات تجريبية: {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Main Prediction Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="توقعات الأداء" />
            <CardContent>
              {predictions && predictions.prediction && (
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={predictions.prediction.value}
                      size={150}
                      thickness={4}
                      color={predictions.prediction.value > 70 ? 'success' : 'primary'}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="h4">
                        {predictions.prediction.value.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="subtitle1" display="block" sx={{ mt: 2 }}>
                    الثقة: {(predictions.prediction.confidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Factors Card */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="العوامل المؤثرة" />
            <CardContent>
              {predictions?.factors?.map(factor => (
                <Box key={factor.factor} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body1">{factor.factor}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(factor.weight * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={factor.weight * 100}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="التوصيات المخصصة" />
            <CardContent>
              {recommendations.length > 0 ? (
                recommendations.map((rec, idx) => (
                  <Alert
                    key={rec.id || `rec-${idx}`}
                    severity={
                      rec.priority === 'critical'
                        ? 'error'
                        : rec.priority === 'high'
                          ? 'warning'
                          : 'info'
                    }
                    sx={{ mb: 2 }}
                    action={
                      <Chip
                        label={`التأثير: ${(rec.expectedImpact * 100).toFixed(0)}%`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    }
                  >
                    <Typography variant="subtitle1" fontWeight="bold">
                      {rec.title}
                    </Typography>
                    <Typography variant="body2">{rec.description}</Typography>
                  </Alert>
                ))
              ) : (
                <Typography>لا توجد توصيات متاحة.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="اتجاه الأداء" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData.length ? trendData : generateTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="performance"
                    stroke={chartColors.purple}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="أولويات التوصيات" />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={generatePriorityData(recommendations)}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      <Cell fill={statusColors.errorSoft} />
                      <Cell fill={statusColors.warning} />
                      <Cell fill={statusColors.success} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Button variant="contained" onClick={loadAnalytics} sx={{ mt: 3 }} size="large">
        تحديث البيانات
      </Button>
    </Container>
  );
};

const generateTrendData = () => {
  return [
    { name: 'الأسبوع 1', performance: 65 },
    { name: 'الأسبوع 2', performance: 72 },
    { name: 'الأسبوع 3', performance: 78 },
    { name: 'الأسبوع 4', performance: 82 },
  ];
};

const generatePriorityData = (recs = []) => {
  if (recs.length === 0) {
    return [
      { name: 'عالية', value: 25 },
      { name: 'متوسطة', value: 35 },
      { name: 'منخفضة', value: 40 },
    ];
  }
  const high = recs.filter(r => r.priority === 'high' || r.priority === 'critical').length;
  const medium = recs.filter(r => r.priority === 'medium').length;
  const low = recs.filter(r => r.priority === 'low').length;
  return [
    { name: 'عالية', value: high || 1 },
    { name: 'متوسطة', value: medium || 1 },
    { name: 'منخفضة', value: low || 1 },
  ];
};

export default AIAnalyticsDashboard;
