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
import api from '../utils/api';
import SmartNotificationService from '../services/smartNotificationService';

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
    const uid = localStorage.getItem('userId') || '123';
    setUserId(uid);
    loadAnalytics(uid);
  }, []);

  const loadAnalytics = async (uid) => {
    try {
      setLoading(true);
      setError(null);
      setUsingDemo(false);

      // جلب بيانات توقع الغياب بالذكاء الاصطناعي من backend الجديد
      const aiRes = await api.post('/ai/predict-absence', {
        studentId: uid,
        absencesLast30Days: 2, // يمكن استبدالها بقيم حقيقية
        attendanceRate: 0.92,
        behaviorScore: 0.85,
        performanceScore: 0.8,
      });
      const aiData = aiRes.data || {};

      // تحويل النتيجة إلى نفس بنية العرض
      setPredictions({
        prediction: { value: aiData.attendanceProbability || (aiData.probability ? aiData.probability * 100 : 0), confidence: (aiData.confidence || 0.9) },
        factors: [
          { factor: 'نسبة الحضور', weight: aiData.attendanceRate || 0.92 },
          { factor: 'السلوك', weight: aiData.behaviorScore || 0.85 },
          { factor: 'الأداء', weight: aiData.performanceScore || 0.8 },
        ],
        predictionType: aiData.risk || 'غياب',
        modelVersion: aiData.algorithm || '1.0.0',
        accuracy: aiData.confidence || 0.9,
      });
      setRecommendations([
        {
          title: aiData.risk === 'high' ? 'احتمال غياب مرتفع' : aiData.risk === 'medium' ? 'احتمال غياب متوسط' : 'احتمال غياب منخفض',
          description: aiData.recommendedAction || 'يرجى متابعة الطالب عن كثب.',
          priority: aiData.risk === 'high' ? 'critical' : aiData.risk === 'medium' ? 'high' : 'info',
          expectedImpact: aiData.probability || 0.1,
        },
      ]);

      // إرسال إشعار ذكي تلقائي عند توقع غياب مرتفع
      if (aiData.risk === 'high') {
        try {
          await SmartNotificationService.sendSmartNotification({
            userId: uid,
            type: 'ai_absence_alert',
            title: '🚨 تنبيه ذكاء اصطناعي: احتمال غياب مرتفع',
            message: `توقع النظام احتمال غياب مرتفع للطالب رقم ${uid} (النسبة: ${(aiData.probability * 100).toFixed(1)}%)`,
            priority: 5,
            icon: '🚨',
            color: '#f44336',
            tags: ['ai', 'absence', 'alert'],
            createdAt: new Date(),
            isRead: false,
          });
        } catch (e) {
          // تجاهل الخطأ في الإشعار الذكي
        }
      }
    } catch (err) {
      console.warn('Backend connection failed, using demo data.', err);
      setUsingDemo(true);
      setPredictions(DEMO_PREDICTIONS);
      setRecommendations(DEMO_RECOMMENDATIONS);
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
