import React, { useEffect, useState } from 'react';
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
  Paper,
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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

const DEMO_PREDICTIONS = {
  prediction: { value: 85, confidence: 0.92 },
  factors: [
    { factor: 'الحضور المنتظم', weight: 0.4 },
    { factor: 'المشاركة الفعالة', weight: 0.3 },
    { factor: 'إنجاز المهام', weight: 0.3 },
  ],
  predictionType: 'performance_demo',
  modelVersion: '1.0.0-demo',
  accuracy: 0.89,
};

const DEMO_RECOMMENDATIONS = [
  {
    title: 'حافظ على الزخم',
    description: 'أداؤك ممتاز هذا الأسبوع، استمر في الحضور بنفس الوتيرة.',
    priority: 'low',
    expectedImpact: 0.05,
  },
  {
    title: 'تفاعل أكثر في الأنشطة الجماعية',
    description: 'زيادة المشاركة قد ترفع تقييمك بنسبة 10%.',
    priority: 'medium',
    expectedImpact: 0.1,
  },
];

const AIAnalyticsDashboard = () => {
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    // Get user ID from localStorage
    const uid = localStorage.getItem('userId');
    if (uid) {
      setUserId(uid);
      loadAnalytics(uid);
    } else {
      // If no user ID, try to load demo anyway for preview
      setUserId('demo-user');
      loadAnalytics('demo-user');
    }
  }, []);

  const loadAnalytics = async (uid) => {
    try {
      setLoading(true);
      setError(null);
      setUsingDemo(false);

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Attempt to fetch real data
      const [predRes, recRes] = await Promise.all([
        axios.get(`/api/ai-predictions/predictions/${uid}`, { headers }),
        axios.get(`/api/ai-predictions/recommendations/${uid}`, { headers }),
      ]);

      const predData = predRes.data?.data || [];
      const recData = recRes.data?.data || [];
      
      if (predData.length > 0) {
        setPredictions(predData[0]);
      } else {
         // Fallback to Demo if API returns empty
         setUsingDemo(true);
         setPredictions(DEMO_PREDICTIONS);
      }
      
      if (recData.length > 0) {
         setRecommendations(recData);
      } else {
         setRecommendations(DEMO_RECOMMENDATIONS);
      }

    } catch (err) {
      console.warn('Backend connection failed, using demo data.', err);
      // Fallback to Demo Data on Error
      setUsingDemo(true);
      setPredictions(DEMO_PREDICTIONS);
      setRecommendations(DEMO_RECOMMENDATIONS);
      // Don't set error here, just show demo mode warning
    } finally {
      setLoading(false);
    }
  };

  const generateTrendData = () => {
    return [
      { name: 'الأسبوع 1', performance: 65 },
      { name: 'الأسبوع 2', performance: 72 },
      { name: 'الأسبوع 3', performance: 78 },
      { name: 'الأسبوع 4', performance: 82 },
    ];
  };

  const generatePriorityData = () => {
    return [
      { name: 'عالية', value: 40 },
      { name: 'متوسطة', value: 35 },
      { name: 'منخفضة', value: 25 },
    ];
  };

  const COLORS = ['#ff7300', '#ffc300', '#0099ff'];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        🤖 لوحة تحكم الذكاء الاصطناعي والتحليلات
      </Typography>

      {usingDemo && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          ⚠️ يتم عرض بيانات تجريبية (Demo Mode) نظراً لعدم توفر اتصال بالخادم المباشر.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* بطاقة التنبؤ الرئيسية */}
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardHeader title="📊 توقع الأداء" />
            <CardContent>
              {predictions ? (
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                    <CircularProgress
                      variant="determinate"
                      value={predictions.prediction?.value || 0}
                      size={150}
                      thickness={4}
                      sx={{ color: 'primary.main' }}
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
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {(predictions.prediction?.value || 0).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                    موثوقية: {((predictions.prediction?.confidence || 0) * 100).toFixed(0)}%
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  لا توجد بيانات تنبؤ حالية
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* بطاقة العوامل المؤثرة */}
        <Grid item xs={12} md={8}>
          <Card elevation={3}>
            <CardHeader title="⚙️ العوامل المؤثرة" />
            <CardContent>
              {predictions?.factors && predictions.factors.length > 0 ? (
                predictions.factors.map((factor, idx) => (
                  <Box key={idx} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{factor.factor}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {((factor.weight || 0) * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={(factor.weight || 0) * 100} />
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  لا توجد عوامل مؤثرة حالية
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* التوصيات */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardHeader title="💡 التوصيات المخصصة" />
            <CardContent>
              {recommendations && recommendations.length > 0 ? (
                recommendations.map((rec, idx) => (
                  <Alert
                    key={idx}
                    severity={
                      rec.priority === 'critical' ? 'error' : rec.priority === 'high' ? 'warning' : 'info'
                    }
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {rec.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {rec.description}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={`التأثير المتوقع: ${((rec.expectedImpact || 0) * 100).toFixed(0)}%`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  </Alert>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  لا توجد توصيات حالية
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* الرسم البياني للاتجاهات */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader title="📈 اتجاه الأداء" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generateTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis />
                  <YAxis />
                  <Tooltip formatter={value => `${value}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="performance" stroke="#8884d8" name="الأداء %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* رسم الأولويات */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader title="🎯 أولويات التوصيات" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={generatePriorityData()} dataKey="value" label>
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={value => `${value}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* معلومات النظام */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, bgcolor: 'background.default' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              📋 معلومات النظام
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    نوع التنبؤ
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {predictions?.predictionType || 'غير محدد'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    إصدار النموذج
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {predictions?.modelVersion || '1.0.0'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    الدقة
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {((predictions?.accuracy || 0) * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    آخر تحديث
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    الآن
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={() => userId && loadAnalytics(userId)}>
          🔄 تحديث البيانات
        </Button>
        <Button variant="outlined">📥 تحميل التقرير</Button>
      </Box>
    </Container>
  );
};

export default AIAnalyticsDashboard;
