import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Alert, AlertDescription } from './components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import './EmployeePerformanceDashboard.css';

/**
 * لوحة معلومات أداء الموظفين الذكية
 * Smart Employee Performance Dashboard
 */
export const EmployeePerformanceDashboard = ({ employeeId }) => {
    const [performanceData, setPerformanceData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [predictions, setPredictions] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [employeeId]);

    const fetchDashboardData = async () => {
        try {
            const [perf, alts, pred, recs] = await Promise.all([
                fetch(`/api/hr/smart/performance/analysis/${employeeId}`),
                fetch(`/api/hr/smart/performance/alerts/${employeeId}`),
                fetch(`/api/hr/smart/predictions/performance/${employeeId}`),
                fetch(`/api/hr/smart/recommendations/${employeeId}`)
            ]);

            const perfData = await perf.json();
            const alertsData = await alts.json();
            const predData = await pred.json();
            const recsData = await recs.json();

            setPerformanceData(perfData.data);
            setAlerts(alertsData.alerts);
            setPredictions(predData.data);
            setRecommendations(recsData.data.recommendations);

            if (perfData.data?.trends?.months_data) {
                setTrendData(perfData.data.trends.months_data.map((score, idx) => ({
                    month: idx + 1,
                    score
                })));
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">جاري التحميل...</div>;
    }

    return (
        <div className="dashboard-container">
            <h1>لوحة معلومات الأداء الذكية</h1>

            {/* الملخص التنفيذي */}
            <div className="executive-summary">
                <Card>
                    <CardHeader>
                        <CardTitle>الملخص التنفيذي</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <h3>درجة الأداء</h3>
                                <div className="score-display">
                                    <span className="score">{performanceData?.performance_score?.overall_score}</span>
                                    <span className="level">{performanceData?.performance_score?.performance_level}</span>
                                </div>
                            </div>
                            <div className="summary-item">
                                <h3>مستوى الأداء</h3>
                                <p className={`level-${performanceData?.performance_score?.performance_level}`}>
                                    {getLevelLabel(performanceData?.performance_score?.performance_level)}
                                </p>
                            </div>
                            <div className="summary-item">
                                <h3>الاتجاه</h3>
                                <p className="trend-up">
                                    {performanceData?.trends?.trend_percentage}
                                </p>
                            </div>
                            <div className="summary-item">
                                <h3>KPIs المحققة</h3>
                                <p className="kpi-rate">
                                    {performanceData?.kpi_achievements?.achievement_rate}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* التنبيهات الذكية */}
            {alerts.length > 0 && (
                <div className="alerts-section">
                    <h2>التنبيهات والإشعارات</h2>
                    {alerts.map((alert, idx) => (
                        <Alert key={idx} severity={alert.severity}>
                            <AlertDescription>
                                <strong>{alert.title}</strong>: {alert.message}
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            {/* مؤشرات الأداء الرئيسية */}
            <div className="metrics-section">
                <Card>
                    <CardHeader>
                        <CardTitle>مؤشرات الأداء الرئيسية (KPIs)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="metrics-grid">
                            {Object.entries(performanceData?.performance_score?.metrics || {}).map(([key, value]) => (
                                <div key={key} className="metric-card">
                                    <h4>{getMetricLabel(key)}</h4>
                                    <div className="metric-bar">
                                        <div 
                                            className="metric-fill" 
                                            style={{ width: `${value}%` }}
                                        ></div>
                                    </div>
                                    <p className="metric-value">{value}/100</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* الاتجاهات */}
            <div className="trends-section">
                <Card>
                    <CardHeader>
                        <CardTitle>اتجاهات الأداء</CardTitle>
                        <CardDescription>خلال آخر 6 أشهر</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="score" 
                                    stroke="#8884d8" 
                                    name="درجة الأداء"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* توقعات الأداء */}
            {predictions && (
                <div className="forecast-section">
                    <Card>
                        <CardHeader>
                            <CardTitle>توقعات الأداء المستقبلية</CardTitle>
                            <CardDescription>للـ 6 أشهر القادمة</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={predictions.forecast_data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar 
                                        dataKey="predicted_score" 
                                        fill="#82ca9d" 
                                        name="درجة الأداء المتوقعة"
                                    />
                                    <Bar 
                                        dataKey="confidence" 
                                        fill="#ffc658" 
                                        name="درجة الثقة %"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* التوصيات المخصصة */}
            {recommendations.length > 0 && (
                <div className="recommendations-section">
                    <h2>التوصيات المخصصة</h2>
                    <div className="recommendations-grid">
                        {recommendations.map((rec, idx) => (
                            <Card key={idx} className="recommendation-card">
                                <CardHeader>
                                    <CardTitle>{rec.title}</CardTitle>
                                    <CardDescription>{rec.type}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p>{rec.description}</p>
                                    <div className="rec-meta">
                                        <span className={`priority-${rec.priority}`}>
                                            الأولوية: {getPriorityLabel(rec.priority)}
                                        </span>
                                        <span className="duration">
                                            المدة: {rec.duration}
                                        </span>
                                    </div>
                                    {rec.expected_benefits && (
                                        <div className="benefits">
                                            <h4>الفوائد المتوقعة:</h4>
                                            <ul>
                                                {rec.expected_benefits.map((benefit, i) => (
                                                    <li key={i}>{benefit}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* الخطوات التالية */}
            <div className="next-steps-section">
                <Card>
                    <CardHeader>
                        <CardTitle>الخطوات التالية الموصى بها</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="steps-list">
                            <li>جدولة اجتماع مع المدير لمناقشة النتائج</li>
                            <li>تحديد الأولويات التطويرية للربع القادم</li>
                            <li>تسجيل في الدورات التدريبية الموصى بها</li>
                            <li>إعداد خطة عمل لتحقيق الأهداف</li>
                            <li>متابعة منتظمة مع المدير</li>
                        </ol>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

/**
 * لوحة معلومات المدير
 * Manager Dashboard
 */
export const ManagerDashboard = ({ managerId }) => {
    const [teamData, setTeamData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchManagerDashboard();
    }, [managerId]);

    const fetchManagerDashboard = async () => {
        try {
            const response = await fetch(`/api/hr/smart/dashboard/manager/${managerId}`);
            const data = await response.json();
            setTeamData(data.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching manager dashboard:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">جاري التحميل...</div>;
    }

    return (
        <div className="dashboard-container manager-dashboard">
            <h1>لوحة معلومات المدير</h1>

            {/* نظرة عامة على الفريق */}
            <div className="team-overview">
                <Card>
                    <CardHeader>
                        <CardTitle>نظرة عامة على الفريق</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overview-metrics">
                            <div className="metric">
                                <span className="label">إجمالي الموظفين</span>
                                <span className="value">{teamData?.team_overview?.total_employees}</span>
                            </div>
                            <div className="metric">
                                <span className="label">الأداء العالي</span>
                                <span className="value highlight">
                                    {teamData?.team_overview?.high_performers}
                                </span>
                            </div>
                            <div className="metric">
                                <span className="label">متوسط الأداء</span>
                                <span className="value">{teamData?.team_overview?.average_score}</span>
                            </div>
                            <div className="metric">
                                <span className="label">في خطر</span>
                                <span className="value warning">{teamData?.team_overview?.at_risk}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* توزيع الأداء */}
            <div className="performance-distribution">
                <Card>
                    <CardHeader>
                        <CardTitle>توزيع مستويات الأداء</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'متميز', value: 20 },
                                        { name: 'جيد', value: 50 },
                                        { name: 'متوسط', value: 20 },
                                        { name': 'يحتاج تحسن', value: 10 }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => `${name}: ${value}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* الإجراءات المطلوبة */}
            <div className="action-items">
                <Card>
                    <CardHeader>
                        <CardTitle>الإجراءات المطلوبة</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="actions-list">
                            <div className="action-item priority-high">
                                <h4>أداء منخفض - موظف 1</h4>
                                <p>يتطلب اجتماع وضع خطة تحسن</p>
                                <button className="action-button">جدولة</button>
                            </div>
                            <div className="action-item priority-medium">
                                <h4>جاهز للترقية - موظف 2</h4>
                                <p>مرشح للتطور الوظيفي</p>
                                <button className="action-button">مناقشة</button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

/**
 * مكون التنبيهات الذكية
 * Smart Alerts Component
 */
export const SmartAlerts = ({ employeeId }) => {
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchAlerts();
    }, [employeeId, filter]);

    const fetchAlerts = async () => {
        try {
            const response = await fetch(
                `/api/hr/smart/performance/alerts/${employeeId}?status=${filter}`
            );
            const data = await response.json();
            setAlerts(data.alerts || []);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    const dismissAlert = async (alertId) => {
        // تنفيذ إغلاق التنبيه
        setAlerts(alerts.filter(a => a.id !== alertId));
    };

    return (
        <div className="smart-alerts">
            <h3>التنبيهات الذكية</h3>
            <div className="filter-buttons">
                <button 
                    className={filter === 'all' ? 'active' : ''} 
                    onClick={() => setFilter('all')}
                >
                    الكل
                </button>
                <button 
                    className={filter === 'active' ? 'active' : ''} 
                    onClick={() => setFilter('active')}
                >
                    نشط
                </button>
                <button 
                    className={filter === 'critical' ? 'active' : ''} 
                    onClick={() => setFilter('critical')}
                >
                    حرج
                </button>
            </div>
            <div className="alerts-list">
                {alerts.map(alert => (
                    <div key={alert.id} className={`alert-item severity-${alert.severity}`}>
                        <div className="alert-header">
                            <h4>{alert.title}</h4>
                            <button 
                                className="close-btn"
                                onClick={() => dismissAlert(alert.id)}
                            >
                                ×
                            </button>
                        </div>
                        <p>{alert.message}</p>
                        {alert.action_items && alert.action_items.length > 0 && (
                            <div className="action-items">
                                {alert.action_items.map((item, idx) => (
                                    <div key={idx} className="action-item">• {item}</div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// دوال مساعدة
const getLevelLabel = (level) => {
    const labels = {
        'critical': 'حرج',
        'poor': 'ضعيف',
        'average': 'متوسط',   
        'good': 'جيد',
        'excellent': 'ممتاز',
        'outstanding': 'متميز'
    };
    return labels[level] || level;
};

const getMetricLabel = (key) => {
    const labels = {
        'productivity': 'الإنتاجية',
        'quality': 'جودة العمل',
        'compliance': 'الالتزام',
        'collaboration': 'التعاون',
        'innovation': 'الابتكار'
    };
    return labels[key] || key;
};

const getPriorityLabel = (priority) => {
    const labels = {
        'high': 'عالية',
        'medium': 'متوسطة',
        'low': 'منخفضة'
    };
    return labels[priority] || priority;
};

export default EmployeePerformanceDashboard;
