# 💻 دليل البدء السريع - Quick Start Implementation Guide

**التاريخ:** 14 يناير 2026  
**المستوى:** للمطورين الفوريين  
**الحالة:** جاهز للنسخ واللصق

---

## 🚀 الميزات جاهزة للتطبيق الفوري

### الميزة #1: لوحة بيانات محسنة (Enhanced Dashboard)

#### الخطوة 1: إنشاء الملف الأساسي

**File: `frontend/src/components/Dashboard/EnhancedDashboard.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
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
import styles from './styles/EnhancedDashboard.module.css';

export const EnhancedDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/dashboard/enhanced?period=${selectedPeriod}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setData(response.data.data);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className={styles.dashboardContainer}>
      {/* الرأس */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>📊 لوحة التحكم الرئيسية</h1>
          <p>مرحباً بك في نظام إدارة التأهيل</p>
        </div>

        <div className={styles.controls}>
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className={styles.periodSelector}>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="quarter">هذا الربع</option>
            <option value="year">هذه السنة</option>
          </select>
          <button className={styles.refreshBtn} onClick={fetchDashboardData}>
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* بطاقات الإحصائيات الرئيسية */}
      <div className={styles.statsGrid}>
        <StatCard title="المستفيدون النشطون" value={data.activeClients} icon="👥" trend="+12%" />
        <StatCard title="الجلسات هذا الأسبوع" value={data.sessionsThisWeek} icon="📅" trend="+8%" />
        <StatCard title="معدل التحسن" value={`${data.improvementRate}%`} icon="📈" trend="+5%" />
        <StatCard title="الالتزام بالبرامج" value={`${data.complianceRate}%`} icon="✅" trend="+3%" />
      </div>

      {/* الرسوم البيانية */}
      <div className={styles.chartsSection}>
        {/* مخطط الخطوط: التقدم الشهري */}
        <div className={styles.chartContainer}>
          <h2>📈 تقدم المستفيدين الشهري</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthlyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="improvement" stroke="#8884d8" strokeWidth={2} name="معدل التحسن" />
              <Line type="monotone" dataKey="expected" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" name="المتوقع" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* مخطط الأعمدة: أنواع الإعاقة */}
        <div className={styles.chartContainer}>
          <h2>🏥 توزيع أنواع الإعاقة</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.disabilityTypes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="العدد" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* الجدول الثاني من الرسوم البيانية */}
      <div className={styles.chartsSection}>
        {/* مخطط الفطيرة: توزيع البرامج */}
        <div className={styles.chartContainer}>
          <h2>🎯 توزيع البرامج العلاجية</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.programTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.programTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* الأنشطة الأخيرة */}
        <div className={styles.recentActivity}>
          <h2>🕐 النشاطات الأخيرة</h2>
          <div className={styles.activityList}>
            {data.recentActivities.map((activity, index) => (
              <div key={index} className={styles.activityItem}>
                <div className={styles.activityIcon}>{activity.icon}</div>
                <div className={styles.activityContent}>
                  <p className={styles.activityTitle}>{activity.title}</p>
                  <p className={styles.activityTime}>{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* الإجراءات السريعة */}
      <div className={styles.quickActions}>
        <h2>⚡ إجراءات سريعة</h2>
        <div className={styles.actionsGrid}>
          <QuickActionButton
            icon="➕"
            label="إضافة مستفيد جديد"
            onClick={() => {
              /* Navigate */
            }}
          />
          <QuickActionButton
            icon="📋"
            label="إنشاء برنامج جديد"
            onClick={() => {
              /* Navigate */
            }}
          />
          <QuickActionButton
            icon="📊"
            label="عرض التقارير"
            onClick={() => {
              /* Navigate */
            }}
          />
          <QuickActionButton
            icon="👥"
            label="إدارة الموظفين"
            onClick={() => {
              /* Navigate */
            }}
          />
        </div>
      </div>
    </div>
  );
};

// مكونات مساعدة
const StatCard = ({ title, value, icon, trend }) => (
  <div className={styles.statCard}>
    <div className={styles.statIcon}>{icon}</div>
    <div className={styles.statContent}>
      <h3>{title}</h3>
      <p className={styles.statValue}>{value}</p>
      <span className={styles.statTrend}>{trend}</span>
    </div>
  </div>
);

const QuickActionButton = ({ icon, label, onClick }) => (
  <button className={styles.actionBtn} onClick={onClick}>
    <div className={styles.actionIcon}>{icon}</div>
    <p>{label}</p>
  </button>
);

const DashboardSkeleton = () => (
  <div className={styles.skeleton}>
    <div className={styles.skeletonBar}></div>
  </div>
);

const renderCustomLabel = ({ name, value }) => `${name}: ${value}`;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default EnhancedDashboard;
```

#### الخطوة 2: إنشاء ملف الأنماط

**File: `frontend/src/components/Dashboard/styles/EnhancedDashboard.module.css`**

```css
.dashboardContainer {
  direction: rtl;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.titleSection h1 {
  font-size: 2rem;
  color: #2d3748;
  margin: 0;
}

.titleSection p {
  color: #718096;
  margin: 0.5rem 0 0 0;
}

.controls {
  display: flex;
  gap: 1rem;
}

.periodSelector {
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.periodSelector:hover {
  border-color: #667eea;
}

.refreshBtn {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.refreshBtn:hover {
  background: #5568d3;
  transform: scale(1.05);
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.statCard {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.statCard:hover {
  transform: translateY(-5px);
}

.statIcon {
  font-size: 2.5rem;
}

.statContent h3 {
  color: #718096;
  font-size: 0.875rem;
  margin: 0;
  text-transform: uppercase;
}

.statValue {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0.5rem 0 0 0;
}

.statTrend {
  color: #48bb78;
  font-weight: 600;
  font-size: 0.875rem;
}

.chartsSection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chartContainer {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.chartContainer h2 {
  margin: 0 0 1rem 0;
  color: #2d3748;
  font-size: 1.25rem;
}

.recentActivity {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.activityList {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activityItem {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 8px;
  border-right: 4px solid #667eea;
}

.activityIcon {
  font-size: 1.5rem;
}

.activityContent {
  flex: 1;
}

.activityTitle {
  margin: 0;
  color: #2d3748;
  font-weight: 500;
}

.activityTime {
  margin: 0.25rem 0 0 0;
  color: #a0aec0;
  font-size: 0.875rem;
}

.quickActions {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.quickActions h2 {
  margin: 0 0 1.5rem 0;
  color: #2d3748;
}

.actionsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.actionBtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.3s ease;
  font-weight: 600;
}

.actionBtn:hover {
  transform: scale(1.05);
}

.actionIcon {
  font-size: 1.75rem;
}

.skeleton {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  height: 400px;
}

.skeletonBar {
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  margin: 1rem 0;
  border-radius: 4px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 768px) {
  .statsGrid {
    grid-template-columns: 1fr;
  }

  .chartsSection {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
```

#### الخطوة 3: إنشاء الخدمة في الـ Backend

**File: `backend/services/dashboard.service.js`**

```javascript
const axios = require('axios');
const Beneficiary = require('../models/beneficiary.model');
const RehabilitationProgram = require('../models/rehabilitation-program.model');
const TherapySession = require('../models/therapy-session.model');

class DashboardService {
  /**
   * الحصول على بيانات لوحة البيانات المحسنة
   */
  static async getEnhancedDashboardData(period = 'month') {
    try {
      const dateRange = this._getDateRange(period);

      // جلب الإحصائيات الأساسية
      const activeClients = await Beneficiary.countActive();
      const sessionsThisWeek = await TherapySession.countByDateRange(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date());

      // حساب معدلات التحسن
      const improvementRate = await this._calculateImprovementRate(dateRange);
      const complianceRate = await this._calculateComplianceRate(dateRange);

      // جلب بيانات الرسوم البيانية
      const monthlyProgress = await this._getMonthlyProgress(dateRange);
      const disabilityTypes = await this._getDisabilityTypeDistribution();
      const programTypes = await this._getProgramTypeDistribution();
      const recentActivities = await this._getRecentActivities(10);

      return {
        activeClients,
        sessionsThisWeek,
        improvementRate: Math.round(improvementRate),
        complianceRate: Math.round(complianceRate),
        monthlyProgress,
        disabilityTypes,
        programTypes,
        recentActivities,
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  /**
   * حساب معدل التحسن في الفترة المحددة
   */
  static async _calculateImprovementRate(dateRange) {
    const assessments = await Assessment.find({
      createdAt: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },
    });

    if (assessments.length === 0) return 0;

    const improvements = assessments.map(a => {
      const previousAssessment = Assessment.findOne({
        beneficiaryId: a.beneficiaryId,
        createdAt: { $lt: a.createdAt },
      }).sort({ createdAt: -1 });

      if (!previousAssessment) return 0;

      const improvement = ((a.totalScore - previousAssessment.totalScore) / previousAssessment.totalScore) * 100;

      return Math.max(0, improvement); // فقط تحسنات موجبة
    });

    return improvements.reduce((a, b) => a + b, 0) / improvements.length;
  }

  /**
   * حساب معدل الالتزام بالبرامج
   */
  static async _calculateComplianceRate(dateRange) {
    const programs = await RehabilitationProgram.find({
      createdAt: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },
    });

    if (programs.length === 0) return 0;

    const complianceRates = programs.map(p => {
      const plannedSessions = p.sessionFrequency * Math.ceil((new Date() - p.createdAt) / (7 * 24 * 60 * 60 * 1000));
      const actualSessions = p.sessions.length;
      return (actualSessions / plannedSessions) * 100;
    });

    return complianceRates.reduce((a, b) => a + b, 0) / complianceRates.length;
  }

  /**
   * الحصول على بيانات التقدم الشهري
   */
  static async _getMonthlyProgress(dateRange) {
    const months = [];
    let currentDate = new Date(dateRange.start);

    while (currentDate <= dateRange.end) {
      const month = currentDate.toLocaleString('ar', { month: 'long' });

      const assessments = await Assessment.find({
        createdAt: {
          $gte: currentDate,
          $lte: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const avgImprovement =
        assessments.length > 0 ? assessments.reduce((sum, a) => sum + (a.progressRate || 0), 0) / assessments.length : 0;

      months.push({
        month,
        improvement: Math.round(avgImprovement * 100),
        expected: 8 + Math.random() * 4,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return months;
  }

  /**
   * الحصول على توزيع أنواع الإعاقة
   */
  static async _getDisabilityTypeDistribution() {
    const distribution = await Beneficiary.aggregate([
      {
        $group: {
          _id: '$disabilityType',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return distribution.map(item => ({
      type: item._id,
      count: item.count,
    }));
  }

  /**
   * الحصول على توزيع أنواع البرامج
   */
  static async _getProgramTypeDistribution() {
    const distribution = await RehabilitationProgram.aggregate([
      {
        $group: {
          _id: '$programType',
          value: { $sum: 1 },
        },
      },
    ]);

    return distribution;
  }

  /**
   * الحصول على النشاطات الأخيرة
   */
  static async _getRecentActivities(limit = 10) {
    const sessions = await TherapySession.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('beneficiaryId', 'name')
      .populate('therapistId', 'name');

    return sessions.map(session => ({
      icon: '📋',
      title: `جلسة جديدة لـ ${session.beneficiaryId.name}`,
      time: session.createdAt.toLocaleString('ar'),
    }));
  }

  /**
   * حساب نطاق التاريخ بناءً على الفترة
   */
  static _getDateRange(period) {
    const today = new Date();
    let start = new Date();

    switch (period) {
      case 'week':
        start.setDate(today.getDate() - today.getDay());
        break;
      case 'month':
        start.setDate(1);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        start.setDate(today.getDate() - today.getDay());
    }

    return { start, end: today };
  }
}

module.exports = DashboardService;
```

#### الخطوة 4: إنشاء المسار (Route)

**File: `backend/routes/dashboard.routes.js`**

```javascript
const express = require('express');
const DashboardService = require('../services/dashboard.service');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/dashboard/enhanced
 * الحصول على بيانات لوحة البيانات المحسنة
 */
router.get('/enhanced', authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const data = await DashboardService.getEnhancedDashboardData(period);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching enhanced dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب بيانات لوحة البيانات',
    });
  }
});

module.exports = router;
```

---

### الميزة #2: نظام الإشعارات الذكية

**File: `backend/services/smart-notification.service.js`**

```javascript
const nodemailer = require('nodemailer');
const firebase = require('firebase-admin');

class SmartNotificationService {
  /**
   * إرسال إشعار ذكي
   */
  static async sendSmartNotification(userId, notificationData) {
    try {
      const user = await User.findById(userId);
      const priority = this._getPriority(notificationData.type);

      // تحديد القنوات
      const channels = this._determineChannels(user, priority);

      const results = {};

      for (const channel of channels) {
        if (channel === 'email') {
          results.email = await this._sendEmail(user, notificationData);
        } else if (channel === 'push') {
          results.push = await this._sendPushNotification(user, notificationData);
        } else if (channel === 'sms') {
          results.sms = await this._sendSMS(user, notificationData);
        }
      }

      // حفظ السجل
      await NotificationLog.create({
        userId,
        type: notificationData.type,
        priority: priority.name,
        channels: Array.from(channels),
        sentAt: new Date(),
      });

      return results;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * إرسال بريد إلكتروني
   */
  static async _sendEmail(user, data) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const templates = {
      decline_detected: {
        subject: '⚠️ تنبيه: تراجع محتمل في حالة المستفيد',
        html: `
          <h2>تنبيه هام</h2>
          <p>تم اكتشاف تراجع محتمل في حالة المستفيد ${data.beneficiaryName}</p>
          <p>يرجى مراجعة البرنامج العلاجي بالسرعة الممكنة.</p>
          <button><a href="${process.env.APP_URL}/beneficiary/${data.beneficiaryId}">عرض التفاصيل</a></button>
        `,
      },
      milestone_achieved: {
        subject: '🎉 تحية: تحقيق هدف جديد',
        html: `
          <h2>تهانينا!</h2>
          <p>حقق المستفيد ${data.beneficiaryName} الهدف: ${data.goalName}</p>
          <p>تاريخ: ${new Date().toLocaleDateString('ar')}</p>
        `,
      },
    };

    const template = templates[data.type] || templates.decline_detected;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: template.subject,
      html: template.html,
    });

    return { status: 'sent' };
  }

  /**
   * إرسال إشعار Push
   */
  static async _sendPushNotification(user, data) {
    if (!user.fcmToken) {
      return { status: 'no_token' };
    }

    const message = {
      notification: {
        title: data.title,
        body: data.body,
      },
      data: {
        type: data.type,
        beneficiaryId: data.beneficiaryId || '',
      },
      android: {
        priority: 'high',
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
      },
    };

    await firebase.messaging().send(message);
    return { status: 'sent' };
  }

  /**
   * تحديد الأولوية
   */
  static _getPriority(notificationType) {
    const priorities = {
      decline_detected: { level: 4, name: 'CRITICAL' },
      missed_session: { level: 3, name: 'HIGH' },
      report_ready: { level: 2, name: 'MEDIUM' },
      message_received: { level: 1, name: 'LOW' },
    };

    return priorities[notificationType] || priorities.message_received;
  }

  /**
   * تحديد القنوات
   */
  static _determineChannels(user, priority) {
    const channels = new Set();

    if (priority.level >= 4) {
      channels.add('push');
      channels.add('email');
      if (user.phone) channels.add('sms');
    } else if (priority.level >= 3) {
      channels.add('push');
      channels.add('email');
    } else {
      if (user.preferences.emailNotifications) channels.add('email');
      if (user.preferences.pushNotifications) channels.add('push');
    }

    return channels;
  }
}

module.exports = SmartNotificationService;
```

---

## 📱 تثبيت المكتبات المطلوبة

```bash
# Frontend
npm install recharts react-countup date-fns lodash axios

# Backend
npm install nodemailer firebase-admin

# Mobile
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install firebase react-native-firebase
npm install @react-native-community/async-storage
```

---

## 🧪 الاختبار السريع

### اختبار لوحة البيانات

```bash
# تشغيل التطبيق
npm start

# فتح المتصفح
http://localhost:3000/dashboard
```

### اختبار الإشعارات

```javascript
// في console المتصفح
const testNotification = {
  type: 'decline_detected',
  beneficiaryId: '123',
  beneficiaryName: 'أحمد',
  title: 'تنبيه هام',
  body: 'تم اكتشاف تراجع محتمل',
};

// إرسال الاختبار
fetch('/api/notifications/test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
  body: JSON.stringify(testNotification),
})
  .then(r => r.json())
  .then(console.log);
```

---

## ✅ قائمة التحقق

- [ ] استنساخ المستودع
- [ ] تثبيت المكتبات
- [ ] إنشاء ملفات Dashboard
- [ ] تحديث CSS
- [ ] إنشاء خدمة Dashboard
- [ ] إضافة المسار
- [ ] اختبار المكونات
- [ ] اختبار الإشعارات
- [ ] نشر التعديلات

---

**آخر تحديث:** 14 يناير 2026
