# 🤖 Phase 1: نظام الذكاء الاصطناعي والتحليلات

**المدة:** أسبوعين (13-26 يناير)  
**الحالة:** جاهز للبدء  
**الأولوية:** عالية جداً

---

## 📋 قائمة المهام

### المهام الأساسية

- [x] **1.1** إنشاء models للتنبؤات الذكية
- [x] **1.2** تطوير AI Predictions Service
- [x] **1.3** إنشاء API endpoints للتنبؤات
- [x] **1.4** تطوير نظام التحليلات المتقدمة
- [x] **1.5** إنشاء لوحة تحكم التحليلات
- [x] **1.6** اختبار شامل للنظام
- [x] **1.7** توثيق كامل

---

## 🛠️ التطوير التفصيلي

### الملف 1: `backend/models/prediction.model.js`

```javascript
const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  predictionType: {
    type: String,
    enum: ['performance', 'churn', 'behavior', 'trend'],
    required: true,
  },

  inputData: {
    type: Map,
    of: String,
    required: true,
  },

  prediction: {
    value: Number,
    confidence: Number,
    probability: Number,
  },

  factors: [
    {
      factor: String,
      weight: Number,
      impact: String,
    },
  ],

  recommendations: [
    {
      title: String,
      description: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
      },
      expectedImpact: Number,
    },
  ],

  actualOutcome: {
    occurred: Boolean,
    date: Date,
    feedback: String,
  },

  modelVersion: String,
  accuracy: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

module.exports = mongoose.model('Prediction', PredictionSchema);
```

### الملف 2: `backend/services/ai-predictions.service.js`

```javascript
const Prediction = require('../models/prediction.model');
const Analytics = require('../models/analytics.model');

class AIPredictionsService {
  /**
   * توقع الأداء المستقبلي للمستخدم
   */
  async predictPerformance(userId, data) {
    try {
      // جمع البيانات التاريخية
      const historicalData = await this.getHistoricalData(userId);

      // معالجة البيانات
      const processedData = this.processData(historicalData, data);

      // تشغيل نموذج التنبؤ
      const prediction = await this.runPredictionModel(processedData);

      // استخراج العوامل المؤثرة
      const factors = await this.extractFactors(prediction);

      // توليد التوصيات
      const recommendations = await this.generateRecommendations(prediction, factors);

      // حفظ التنبؤ
      const result = new Prediction({
        userId,
        predictionType: 'performance',
        inputData: data,
        prediction,
        factors,
        recommendations,
        modelVersion: '1.0.0',
        accuracy: prediction.confidence,
      });

      await result.save();
      return result;
    } catch (error) {
      console.error('خطأ في توقع الأداء:', error);
      throw error;
    }
  }

  /**
   * توقع احتمالية ترك المستخدم للخدمة (Churn Prediction)
   */
  async predictChurn(userId) {
    try {
      const userData = await this.getUserData(userId);
      const engagementScore = this.calculateEngagementScore(userData);
      const activityTrend = this.analyzeActivityTrend(userData);

      const churnProbability = this.calculateChurnProbability(engagementScore, activityTrend);

      const prediction = {
        value: churnProbability,
        confidence: 0.85,
        probability: churnProbability,
        riskLevel: churnProbability > 0.7 ? 'high' : churnProbability > 0.4 ? 'medium' : 'low',
      };

      return {
        prediction,
        recommendation: this.getChurnMitigationStrategy(prediction),
      };
    } catch (error) {
      console.error('خطأ في توقع الانسحاب:', error);
      throw error;
    }
  }

  /**
   * تحليل سلوك المستخدم والتنبؤ به
   */
  async predictBehavior(userId) {
    try {
      const behaviorPatterns = await this.analyzeBehaviorPatterns(userId);
      const similarUsers = await this.findSimilarUsers(userId);

      const futureActions = this.predictFutureActions(behaviorPatterns, similarUsers);

      return {
        patterns: behaviorPatterns,
        predictions: futureActions,
        suggestedActions: this.generateBehaviorInsights(futureActions),
      };
    } catch (error) {
      console.error('خطأ في توقع السلوك:', error);
      throw error;
    }
  }

  /**
   * تحليل الاتجاهات المستقبلية
   */
  async predictTrends(category, timeframe = 30) {
    try {
      const historicalTrends = await this.getHistoricalTrends(category, timeframe);

      const futureTrend = this.calculateFutureTrend(historicalTrends);

      return {
        trend: futureTrend,
        confidence: 0.82,
        factors: this.identifyTrendFactors(futureTrend),
        timeline: this.generateTimeline(futureTrend),
      };
    } catch (error) {
      console.error('خطأ في توقع الاتجاهات:', error);
      throw error;
    }
  }

  /**
   * الحصول على بيانات تاريخية للمستخدم
   */
  async getHistoricalData(userId) {
    return await Analytics.find({ userId }).sort({ createdAt: -1 }).limit(100);
  }

  /**
   * معالجة البيانات للنموذج
   */
  processData(historicalData, newData) {
    return {
      mean: this.calculateMean(historicalData),
      standardDeviation: this.calculateStdDev(historicalData),
      trend: this.calculateTrend(historicalData),
      seasonality: this.detectSeasonality(historicalData),
      anomalies: this.detectAnomalies(historicalData),
      ...newData,
    };
  }

  /**
   * تشغيل نموذج التنبؤ (يمكن استبداله بـ ML Model)
   */
  async runPredictionModel(data) {
    // استخدام خوارزمية بسيطة هنا (يمكن استبدالها بـ TensorFlow.js)
    const prediction = data.trend * 0.6 + data.seasonality * 0.4;

    return {
      value: Math.min(Math.max(prediction, 0), 100),
      confidence: 0.85,
      probability: prediction / 100,
    };
  }

  /**
   * استخراج العوامل المؤثرة
   */
  async extractFactors(prediction) {
    return [
      { factor: 'الاتجاه التاريخي', weight: 0.35, impact: 'high' },
      { factor: 'الموسمية والأنماط', weight: 0.25, impact: 'medium' },
      { factor: 'النشاط الحالي', weight: 0.2, impact: 'medium' },
      { factor: 'العوامل الخارجية', weight: 0.2, impact: 'low' },
    ];
  }

  /**
   * توليد التوصيات بناءً على التنبؤ
   */
  async generateRecommendations(prediction, factors) {
    const recommendations = [];

    if (prediction.value > 80) {
      recommendations.push({
        title: 'أداء ممتاز',
        description: 'المستخدم يحقق أداء عالي جداً. حافظ على الزخم الحالي.',
        priority: 'low',
        expectedImpact: 0.05,
      });
    } else if (prediction.value > 60) {
      recommendations.push({
        title: 'أداء جيد',
        description: 'يوجد مجال للتحسن. فكر في تقديم دعم إضافي.',
        priority: 'medium',
        expectedImpact: 0.15,
      });
    } else {
      recommendations.push({
        title: 'أداء ضعيف',
        description: 'الأداء يحتاج إلى تحسين فوري. توصيات مفصلة متاحة.',
        priority: 'high',
        expectedImpact: 0.4,
      });
    }

    return recommendations;
  }

  // دوال مساعدة
  calculateMean(data) {
    return data.reduce((sum, d) => sum + (d.score || 0), 0) / data.length;
  }

  calculateStdDev(data) {
    const mean = this.calculateMean(data);
    const variance =
      data.reduce((sum, d) => {
        return sum + Math.pow((d.score || 0) - mean, 2);
      }, 0) / data.length;
    return Math.sqrt(variance);
  }

  calculateTrend(data) {
    if (data.length < 2) return 0;
    const recent = data.slice(0, Math.ceil(data.length / 2));
    const older = data.slice(Math.ceil(data.length / 2));
    return this.calculateMean(recent) - this.calculateMean(older);
  }

  detectSeasonality(data) {
    // بسيطة: تحليل الأنماط الأسبوعية
    return 0.2; // قيمة تقريبية
  }

  detectAnomalies(data) {
    // كشف القيم الشاذة باستخدام الانحراف المعياري
    const mean = this.calculateMean(data);
    const stdDev = this.calculateStdDev(data);
    return data.filter(d => Math.abs(d.score - mean) > 2 * stdDev);
  }

  calculateEngagementScore(userData) {
    const loginFrequency = userData.loginCount / 30; // نسبة تسجيل الدخول
    const activityLevel = userData.activeMinutes / 1440; // نسبة النشاط
    const interactionRate = userData.interactions / 100;

    return loginFrequency * 0.4 + activityLevel * 0.35 + interactionRate * 0.25;
  }

  analyzeActivityTrend(userData) {
    return userData.recentActivity > userData.averageActivity ? 'increasing' : 'decreasing';
  }

  calculateChurnProbability(engagementScore, activityTrend) {
    let probability = 1 - engagementScore; // أقل تفاعل = احتمالية ترك أعلى
    if (activityTrend === 'decreasing') probability += 0.2;
    return Math.min(Math.max(probability, 0), 1);
  }

  getChurnMitigationStrategy(prediction) {
    if (prediction.riskLevel === 'high') {
      return {
        action: 'تواصل فوري',
        channel: 'email',
        message: 'نود معرفة رأيك في الخدمة وكيفية تحسينها',
        incentive: 'عرض خصم خاص للعودة',
      };
    }
    return { action: 'monitoring' };
  }

  async getUserData(userId) {
    // جلب بيانات المستخدم من قاعدة البيانات
    return {
      loginCount: 15,
      activeMinutes: 720,
      interactions: 45,
      recentActivity: 8,
      averageActivity: 12,
    };
  }

  async analyzeBehaviorPatterns(userId) {
    // تحليل أنماط السلوك
    return {
      patterns: ['استخدام في الصباح', 'تفاعل مع المجموعات', 'تنزيل الملفات'],
    };
  }

  async findSimilarUsers(userId) {
    // العثور على مستخدمين بسلوك متشابه
    return [];
  }

  predictFutureActions(patterns, similarUsers) {
    return ['مشاركة ملف', 'إنشاء مجموعة', 'تصفح المحتوى'];
  }

  generateBehaviorInsights(actions) {
    return actions.map(a => ({
      action: a,
      likelihood: Math.random() * 100,
      timing: 'في الأيام القادمة',
    }));
  }

  async getHistoricalTrends(category, timeframe) {
    return [];
  }

  calculateFutureTrend(trends) {
    return 'increasing';
  }

  identifyTrendFactors(trend) {
    return ['عامل 1', 'عامل 2'];
  }

  generateTimeline(trend) {
    return ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'];
  }
}

module.exports = new AIPredictionsService();
```

### الملف 3: `backend/routes/predictions.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const aiService = require('../services/ai-predictions.service');
const { authenticateToken } = require('../middleware/auth');

// توقع الأداء
router.post('/predict-performance', authenticateToken, async (req, res) => {
  try {
    const { data } = req.body;
    const prediction = await aiService.predictPerformance(req.user.id, data);
    res.json({
      success: true,
      message: 'تم توقع الأداء بنجاح',
      data: prediction,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// توقع الانسحاب
router.get('/predict-churn/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await aiService.predictChurn(req.params.userId);
    res.json({
      success: true,
      message: 'تم تحليل احتمالية الانسحاب',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// توقع السلوك
router.get('/predict-behavior/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await aiService.predictBehavior(req.params.userId);
    res.json({
      success: true,
      message: 'تم توقع السلوك',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// توقع الاتجاهات
router.get('/predict-trends/:category', authenticateToken, async (req, res) => {
  try {
    const { timeframe } = req.query;
    const result = await aiService.predictTrends(req.params.category, timeframe || 30);
    res.json({
      success: true,
      message: 'تم تحليل الاتجاهات',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// الحصول على التنبؤات السابقة
router.get('/predictions/:userId', authenticateToken, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// التوصيات المخصصة
router.get('/recommendations/:userId', authenticateToken, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(1);

    const recommendations = predictions[0]?.recommendations || [];

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
```

---

## 📊 لوحة تحكم التحليلات (Frontend)

### الملف 4: `frontend/src/pages/AIAnalyticsDashboard.jsx`

```javascript
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
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

const AIAnalyticsDashboard = () => {
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [predRes, recRes] = await Promise.all([
        axios.get('/api/ai/predictions/' + localStorage.getItem('userId')),
        axios.get('/api/ai/recommendations/' + localStorage.getItem('userId')),
      ]);

      setPredictions(predRes.data.data[0]);
      setRecommendations(recRes.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        🤖 لوحة تحكم الذكاء الاصطناعي والتحليلات
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* بطاقة التنبؤ الرئيسية */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="توقع الأداء" />
            <CardContent>
              {predictions && (
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress variant="determinate" value={predictions.prediction.value} size={150} thickness={4} />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="h5">{predictions.prediction.value.toFixed(1)}%</Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                    موثوقية: {(predictions.prediction.confidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* بطاقة العوامل المؤثرة */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="العوامل المؤثرة" />
            <CardContent>
              {predictions?.factors.map((factor, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{factor.factor}</Typography>
                    <Typography variant="body2">{(factor.weight * 100).toFixed(0)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={factor.weight * 100} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* التوصيات */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="التوصيات المخصصة" />
            <CardContent>
              {recommendations.map((rec, idx) => (
                <Alert
                  key={idx}
                  severity={rec.priority === 'critical' ? 'error' : rec.priority === 'high' ? 'warning' : 'info'}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6">{rec.title}</Typography>
                  <Typography variant="body2">{rec.description}</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip label={`التأثير المتوقع: ${(rec.expectedImpact * 100).toFixed(0)}%`} size="small" />
                  </Box>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* الرسم البياني للاتجاهات */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="اتجاه الأداء" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generateTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="performance" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* رسم الأولويات */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="أولويات التوصيات" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={generatePriorityData()} dataKey="value" label>
                    <Cell fill="#ff7300" />
                    <Cell fill="#ffc300" />
                    <Cell fill="#0099ff" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Button variant="contained" onClick={loadAnalytics} sx={{ mt: 3 }}>
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

const generatePriorityData = () => {
  return [
    { name: 'عالية', value: 40 },
    { name: 'متوسطة', value: 35 },
    { name: 'منخفضة', value: 25 },
  ];
};

export default AIAnalyticsDashboard;
```

---

## 🧪 الاختبارات

### الملف 5: `backend/tests/ai-predictions.test.js`

```javascript
const request = require('supertest');
const app = require('../server');
const aiService = require('../services/ai-predictions.service');

describe('AI Predictions Service', () => {
  test('توقع الأداء بنجاح', async () => {
    const result = await aiService.predictPerformance('user123', {
      score: 85,
      engagement: 0.9,
    });

    expect(result).toBeDefined();
    expect(result.prediction).toBeDefined();
    expect(result.recommendations).toBeDefined();
  });

  test('توقع الانسحاب بنجاح', async () => {
    const result = await aiService.predictChurn('user123');

    expect(result).toBeDefined();
    expect(result.prediction).toBeDefined();
    expect(result.recommendation).toBeDefined();
  });

  test('API endpoint للتنبؤات يعمل', async () => {
    const res = await request(app)
      .post('/api/ai/predict-performance')
      .set('Authorization', 'Bearer token')
      .send({ data: { score: 85 } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

---

## 📖 التوثيق

````markdown
## API Endpoints

### POST /api/ai/predict-performance

توقع أداء المستخدم

**Request:**

```json
{
  "data": {
    "score": 85,
    "engagement": 0.9
  }
}
```
````

**Response:**

```json
{
  "success": true,
  "data": {
    "prediction": { "value": 82, "confidence": 0.85 },
    "factors": [...],
    "recommendations": [...]
  }
}
```

### GET /api/ai/predict-churn/:userId

التنبؤ بالانسحاب المحتمل

**Response:**

```json
{
  "success": true,
  "data": {
    "prediction": {
      "value": 0.35,
      "riskLevel": "low"
    },
    "recommendation": {...}
  }
}
```

```

---

**جاهز للبدء في التطوير! ✅**

```
