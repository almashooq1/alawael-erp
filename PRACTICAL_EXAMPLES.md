# 💡 أمثلة عملية - استخدام نظام التحليلات المتقدم

## 📚 جدول المحتويات

1. [أمثلة الخدمات](#أمثلة-الخدمات)
2. [أمثلة API](#أمثلة-api)
3. [أمثلة React](#أمثلة-react)
4. [حالات استخدام واقعية](#حالات-استخدام-واقعية)
5. [أفضل الممارسات](#أفضل-الممارسات)

---

## أمثلة الخدمات

### 1. تحليل الأداء

```javascript
// استخدام WorkflowEnhancementService مباشرة

const enhancementService = require('./services/workflowEnhancementService');

// الحصول على جميع سير العمل
const workflows = [
  {
    id: '1',
    name: 'Approval Request',
    status: 'completed',
    createdAt: new Date('2026-01-01'),
    completedAt: new Date('2026-01-03'),
    rejections: 0,
    revisions: 0,
    slaBreached: false,
    priority: 'normal',
  },
  {
    id: '2',
    name: 'Leave Request',
    status: 'completed',
    createdAt: new Date('2026-01-02'),
    completedAt: new Date('2026-01-05'),
    rejections: 1,
    revisions: 2,
    slaBreached: true,
    priority: 'high',
  },
];

// تحليل الأداء
const metrics = enhancementService.analyzeWorkflowPerformance(workflows);

console.log('=== تحليل الأداء ===');
console.log('عدد سير العمل:', metrics.totalWorkflows);
console.log('متوسط وقت الإنجاز:', Math.round(metrics.averageCompletionTime / 3600000), 'ساعة');
console.log('درجة الأداء:', metrics.performanceScore + '/100');
console.log('الاختناقات المكتشفة:', metrics.bottlenecks.length);
console.log('\nالتوصيات:');
metrics.recommendations.forEach((rec, idx) => {
  console.log(`${idx + 1}. ${rec.title} (أولوية: ${rec.priority})`);
});

/* النتيجة المتوقعة:
=== تحليل الأداء ===
عدد سير العمل: 2
متوسط وقت الإنجاز: 48 ساعة
درجة الأداء: 65/100
الاختناقات المكتشفة: 0

التوصيات:
1. تحسين معدل الرفض (أولوية: high)
2. تقليل عدد المراجعات (أولوية: medium)
*/
```

### 2. تقييم المخاطر

```javascript
// تقييم مخاطر سير عمل محدد

const workflow = {
  id: '123',
  name: 'Budget Approval',
  status: 'inProgress',
  currentStage: 'final-approval',
  createdAt: new Date('2026-01-10'),
  dueDate: new Date('2026-01-15'),
  revisions: 3,
  overdueStages: 1,
  approvalComplexity: 'high',
  priority: 'urgent',
};

const risk = enhancementService.assessWorkflowRisk(workflow);

console.log('=== تقييم المخاطر ===');
console.log('مستوى المخاطر:', risk.riskLevel);
console.log('درجة المخاطر:', risk.riskScore + '/100');
console.log('\nعوامل المخاطر:');
risk.factors.forEach(factor => {
  console.log(`- ${factor.name}: ${factor.impact}% (الوزن: ${factor.weight})`);
});
console.log('\nالإجراءات الموصى بها:');
risk.recommendations.forEach(rec => {
  console.log(`- ${rec.action} (أولوية: ${rec.priority})`);
});

/* النتيجة المتوقعة:
=== تقييم المخاطر ===
مستوى المخاطر: high
درجة المخاطر: 68/100

عوامل المخاطر:
- مراحل متأخرة: 25% (الوزن: 25)
- عدد المراجعات: 60% (الوزن: 20)
- وقت الانتظار الطويل: 40% (الوزن: 20)
- تعقيد الموافقة: 50% (الوزن: 15)
- الأولوية العالية: 100% (الوزن: 10)

الإجراءات الموصى بها:
- تسريع الموافقات (أولوية: critical)
- مراجعة متطلبات الموافقة (أولوية: high)
*/
```

### 3. توليد التقارير

```javascript
// استخدام WorkflowAnalyticsService

const analyticsService = require('./services/workflowAnalyticsService');

const allWorkflows = [
  // قائمة بجميع سير العمل خلال الفترة
];

const report = analyticsService.generateExecutiveReport(allWorkflows);

console.log('=== التقرير التنفيذي ===\n');

console.log('الفترة الزمنية:', `من ${report.period.start} إلى ${report.period.end}`);
console.log('عدد الأيام:', report.period.days);

console.log('\n--- الملخص ---');
console.log('إجمالي سير العمل:', report.summary.totalWorkflows);
console.log('المكتملة:', report.summary.completed);
console.log('المرفوضة:', report.summary.rejected);
console.log('قيد التقدم:', report.summary.inProgress);

console.log('\n--- المؤشرات الرئيسية ---');
console.log('معدل الإنجاز:', report.keyMetrics.completionRate + '%');
console.log('معدل الرفض:', report.keyMetrics.rejectionRate + '%');
console.log('امتثال SLA:', report.keyMetrics.slaComplianceRate + '%');
console.log('الإنتاجية:', report.keyMetrics.throughput + ' طلب/يوم');

console.log('\n--- الرؤى والتحليلات ---');
report.insights.forEach((insight, idx) => {
  console.log(`\n${idx + 1}. [${insight.type.toUpperCase()}] ${insight.title}`);
  console.log(`   ${insight.description}`);
});

console.log('\n--- التوصيات ---');
report.recommendations.forEach((rec, idx) => {
  console.log(`\n${idx + 1}. ${rec.title} [${rec.priority}]`);
  console.log(`   الخطوات:`);
  rec.actions.forEach(action => {
    console.log(`   • ${action}`);
  });
  console.log(`   التأثير المتوقع: ${rec.expectedImpact}`);
});

/* النتيجة المتوقعة:
=== التقرير التنفيذي ===

الفترة الزمنية: من 2026-01-01 إلى 2026-01-14
عدد الأيام: 14

--- الملخص ---
إجمالي سير العمل: 50
المكتملة: 45
المرفوضة: 2
قيد التقدم: 3

--- المؤشرات الرئيسية ---
معدل الإنجاز: 90%
معدل الرفض: 4%
امتثال SLA: 94%
الإنتاجية: 3.57 طلب/يوم

--- الرؤى والتحليلات ---

1. [POSITIVE] معدل إنجاز عالي جداً
   معدل الإنجاز 90% يشير إلى أداء ممتازة

2. [WARNING] معدل رفض معقول
   معدل الرفض 4% يشير إلى جودة جيدة

--- التوصيات ---

1. الحفاظ على مستوى الأداء [medium]
   الخطوات:
   • مراقبة الاتجاهات
   • توفير التدريب المستمر
   التأثير المتوقع: الحفاظ على معدل إنجاز 90%+

2. تحسين جودة الطلبات [high]
   الخطوات:
   • توفير قوالب موحدة
   • تدريب المستخدمين
   التأثير المتوقع: تقليل معدل الرفض إلى < 2%
*/
```

---

## أمثلة API

### 1. استدعاء API الأداء

```bash
# استدعاء جلب مؤشرات الأداء
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/workflows/analytics/performance

# الاستجابة:
{
  "success": true,
  "data": {
    "averageCompletionTime": 172800000,
    "totalWorkflows": 50,
    "averageApprovals": 3.2,
    "performanceScore": 78.5,
    "bottlenecks": [
      {
        "stageName": "Final Approval",
        "avgDuration": 86400000,
        "breachRate": 15
      }
    ],
    "recommendations": [
      {
        "title": "تسريع المرحلة النهائية",
        "priority": "high",
        "actions": ["زيادة المحققين", "تقليل الشروط"]
      }
    ]
  },
  "timestamp": "2026-01-14T10:30:00Z"
}
```

### 2. استدعاء API التقرير التنفيذي

```javascript
// JavaScript
fetch('/api/workflows/analytics/executive-report', {
  method: 'GET',
  headers: {
    Authorization: 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
  },
})
  .then(response => response.json())
  .then(data => {
    console.log('التقرير التنفيذي:', data.data);

    // استخراج البيانات المهمة
    const metrics = data.data.keyMetrics;

    if (metrics.completionRate < 80) {
      console.warn('⚠️ معدل الإنجاز منخفض!');
    }

    if (metrics.slaComplianceRate < 90) {
      console.warn('⚠️ امتثال SLA منخفض!');
    }
  })
  .catch(error => console.error('خطأ:', error));
```

### 3. تقييم مخاطر سير عمل

```javascript
// حصول على تقييم المخاطر لسير عمل محدد
async function getWorkflowRisk(workflowId) {
  try {
    const response = await fetch(`/api/workflows/${workflowId}/risk-assessment`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      const risk = result.data;

      // عرض مستوى المخاطر
      const riskColor = {
        critical: 'red',
        high: 'orange',
        medium: 'yellow',
        low: 'green',
      };

      console.log(`مستوى المخاطر: ${risk.riskLevel}`);
      console.log(`اللون: ${riskColor[risk.riskLevel]}`);
      console.log(`الدرجة: ${risk.riskScore}/100`);

      return risk;
    }
  } catch (error) {
    console.error('خطأ في جلب تقييم المخاطر:', error);
  }
}
```

### 4. المقارنة بين فترتين

```javascript
// مقارنة الأداء بين شهرين
async function comparePerformance() {
  const response = await fetch('/api/workflows/analytics/compare-periods', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate1: '2025-12-01',
      endDate1: '2025-12-31',
      startDate2: '2026-01-01',
      endDate2: '2026-01-31',
      label1: 'ديسمبر 2025',
      label2: 'يناير 2026',
    }),
  });

  const result = await response.json();
  const comparison = result.data;

  console.log('=== مقارنة الأداء ===\n');
  console.log(`${comparison.label1} → ${comparison.label2}\n`);

  // عرض التغييرات
  Object.entries(comparison.metrics).forEach(([key, metric]) => {
    const change = metric.change;
    const trend = change > 0 ? '📈' : change < 0 ? '📉' : '→';
    console.log(`${key}: ${metric.value1} → ${metric.value2} (${trend} ${change}%)`);
  });
}
```

---

## أمثلة React

### 1. استخدام لوحة التحكم المحسّنة

```jsx
import React, { useState, useEffect } from 'react';
import EnhancedWorkflowDashboard from './EnhancedWorkflowDashboard';
import workflowService from '../services/advancedWorkflowService';

function AnalyticsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWorkflows();
    // تحديث كل دقيقة
    const interval = setInterval(loadWorkflows, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await workflowService.getWorkflows();
      if (response.success) {
        setWorkflows(response.data);
      } else {
        setError('فشل تحميل سير العمل');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>جاري التحميل...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="analytics-page">
      <h1>لوحة التحكم المتقدمة</h1>
      <EnhancedWorkflowDashboard workflows={workflows} />
    </div>
  );
}

export default AnalyticsPage;
```

### 2. إنشاء مكون للتوصيات

```jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Typography, List, ListItem, ListItemText, Chip, Box } from '@mui/material';
import workflowService from '../services/advancedWorkflowService';

function RecommendationsCard() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const response = await workflowService.getRecommendations();
      if (response.success) {
        setRecommendations(response.data);
      }
    } catch (error) {
      console.error('خطأ:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = priority => {
    const colors = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'success',
    };
    return colors[priority] || 'default';
  };

  return (
    <Card>
      <CardHeader title="التوصيات المهمة" subheader={`${recommendations.length} توصية`} />
      <CardContent>
        {loading ? (
          <Typography>جاري التحميل...</Typography>
        ) : recommendations.length > 0 ? (
          <List>
            {recommendations.map((rec, idx) => (
              <ListItem key={idx}>
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Typography variant="h6" sx={{ flex: 1 }}>
                      {rec.title}
                    </Typography>
                    <Chip label={rec.priority} color={getPriorityColor(rec.priority)} size="small" />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {rec.description}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>لا توجد توصيات حالياً</Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default RecommendationsCard;
```

### 3. مراقب الأداء في الوقت الفعلي

```jsx
import React, { useState, useEffect } from 'react';
import { Box, LinearProgress, Typography, Alert, Grid } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import workflowService from '../services/advancedWorkflowService';

function PerformanceMonitor() {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const interval = setInterval(checkPerformance, 30000); // كل 30 ثانية
    checkPerformance(); // الفحص الأول
    return () => clearInterval(interval);
  }, []);

  const checkPerformance = async () => {
    try {
      const response = await workflowService.getPerformanceMetrics();
      if (response.success) {
        const newMetrics = response.data;
        setMetrics(newMetrics);

        // توليد التنبيهات
        generateAlerts(newMetrics);
      }
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  const generateAlerts = metrics => {
    const newAlerts = [];

    if (metrics.performanceScore < 70) {
      newAlerts.push({
        severity: 'warning',
        message: `⚠️ درجة الأداء منخفضة: ${metrics.performanceScore}/100`,
      });
    }

    if (metrics.bottlenecks.length > 0) {
      newAlerts.push({
        severity: 'error',
        message: `🚨 تم اكتشاف ${metrics.bottlenecks.length} اختناق`,
      });
    }

    setAlerts(newAlerts);
  };

  return (
    <Box>
      {alerts.map((alert, idx) => (
        <Alert key={idx} severity={alert.severity} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      ))}

      {metrics && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2">درجة الأداء</Typography>
              <Typography variant="h4" color="primary">
                {metrics.performanceScore}/100
              </Typography>
              <LinearProgress variant="determinate" value={metrics.performanceScore} />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2">متوسط وقت الإنجاز</Typography>
              <Typography variant="h4">{(metrics.averageCompletionTime / 3600000).toFixed(1)}</Typography>
              <Typography variant="caption">ساعة</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2">الاختناقات</Typography>
              <Typography variant="h4" color="error">
                {metrics.bottlenecks.length}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="subtitle2">التوصيات</Typography>
              <Typography variant="h4" color="warning.main">
                {metrics.recommendations.length}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default PerformanceMonitor;
```

---

## حالات استخدام واقعية

### حالة 1: مدير يريد معرفة حالة الأداء

```javascript
// التدفق:
// 1. المدير يفتح لوحة التحكم
// 2. النظام يحسب جميع المؤشرات تلقائياً
// 3. يرى المدير:
//    - درجة الأداء (78/100)
//    - الاختناقات (3 مراحل)
//    - التوصيات (5 اقتراحات)
//    - التقارير والرسوم البيانية

// يمكن للمدير:
// - عرض التقرير التنفيذي
// - مقارنة الأداء بين فترات
// - تحليل الاتجاهات المستقبلية
// - تنزيل التقارير بصيغ مختلفة
```

### حالة 2: مشرف يريد تحسين سير عمل معين

```javascript
// التدفق:
// 1. المشرف يختار سير عمل من القائمة
// 2. النظام يحسب:
//    - تقييم المخاطر (High: 68/100)
//    - الاختناقات في هذا السير
//    - الاقتراحات لتحسينها
// 3. يرى المشرف:
//    - ما هي المراحل التي تأخذ وقت طويل
//    - كم نسبة الرفض والمراجعات
//    - ما هي الخطوات المقترحة

// يمكن للمشرف:
// - دمج المراحل البطيئة
// - إعادة تعيين الموارد
// - إضافة تنبيهات للمتأخرات
// - تتبع التحسن بمرور الوقت
```

### حالة 3: محلل يريد فهم السلوك

```javascript
// التدفق:
// 1. المحلل يطلب تحليل المسارات
// 2. النظام يرسم:
//    - المسارات المختلفة لسير العمل
//    - نسبة استخدام كل مسار
//    - متوسط الوقت لكل مسار
// 3. يرى المحلل:
//    - أي المسارات الأكثر استخداماً
//    - أي المسارات الأسرع والأبطأ
//    - أين يقضي الوقت الأكثر

// يمكن للمحلل:
// - تحسين المسارات الشائعة
// - حذف المسارات غير المستخدمة
// - اقتراح مسارات جديدة
```

---

## أفضل الممارسات

### 1. الاستخدام الفعّال للـ Caching

```javascript
class OptimizedWorkflowService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 دقائق
  }

  async getPerformanceMetrics() {
    const cacheKey = 'performance-metrics';

    // تحقق من الذاكرة المؤقتة
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('من الذاكرة المؤقتة ✓');
        return cached.data;
      }
    }

    // اجلب البيانات الجديدة
    const response = await fetch('/api/workflows/analytics/performance', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    const data = await response.json();

    // احفظ في الذاكرة المؤقتة
    this.cache.set(cacheKey, {
      data: data.data,
      timestamp: Date.now(),
    });

    return data.data;
  }
}
```

### 2. التعامل مع الأخطاء بشكل احترافي

```javascript
async function safeAnalyticsCall(apiFunction, fallbackValue) {
  try {
    const startTime = performance.now();
    const result = await apiFunction();
    const duration = performance.now() - startTime;

    // تحذير إذا كانت العملية بطيئة
    if (duration > 3000) {
      console.warn(`⚠️ العملية بطيئة: ${duration.toFixed(0)}ms`);
    }

    return result;
  } catch (error) {
    console.error('❌ خطأ في استدعاء API:', error);

    // إظهار القيمة الافتراضية
    return fallbackValue;
  }
}
```

### 3. المراقبة والتسجيل

```javascript
function createPerformanceLogger() {
  const logs = [];

  return {
    log: (action, details, level = 'info') => {
      const entry = {
        timestamp: new Date().toISOString(),
        action,
        details,
        level,
      };
      logs.push(entry);

      // احذف السجلات القديمة (أكثر من ساعة)
      const oneHourAgo = Date.now() - 3600000;
      const filtered = logs.filter(l => new Date(l.timestamp).getTime() > oneHourAgo);

      console.log(`[${level.toUpperCase()}] ${action}:`, details);
      return filtered;
    },

    getLogs: () => logs,
    clear: () => (logs.length = 0),
  };
}

const logger = createPerformanceLogger();

// الاستخدام
logger.log('getMetrics', { duration: 250, itemsCount: 50 }, 'info');
logger.log('slaBreachDetected', { workflowId: 123 }, 'warning');
```

---

**آخر تحديث:** يناير 2026
**الإصدار:** 2.0
**الحالة:** جاهز للاستخدام الفوري ✅
