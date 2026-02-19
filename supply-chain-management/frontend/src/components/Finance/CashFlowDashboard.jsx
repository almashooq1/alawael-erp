/**
 * CashFlowDashboard Component
 * لوحة التدفق النقدي والسيولة المتقدمة
 * 
 * Features:
 * - عرض موضع النقد الفعلي والمتوقع
 * - رسوم بيانية متعددة (منطقة، أعمدة، شلال)
 * - توقعات السيولة 3 أشهر
 * - إدارة الاحتياطيات
 * - تحليلات متقدمة (أنماط، شذوذ، مصادر، أغراض، اتجاهات)
 * - بيانات فورية عبر WebSocket
 * - محاكاة الحالات الافتراضية
 * - تحليل متعمق
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Statistic,
  Button,
  Select,
  DatePicker,
  Tabs,
  message,
  Empty,
  Modal,
  Tooltip,
  Space,
  Progress,
  Collapse,
  Form,
  InputNumber,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  ReloadOutlined,
  FilterOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { api } from '../services/api';

const CashFlowDashboard = () => {
  // ===== State Management =====
  const [cashData, setCashData] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(6, 'months'),
    dayjs(),
  ]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [stats, setStats] = useState({
    totalInflow: 0,
    totalOutflow: 0,
    netCashFlow: 0,
    endingBalance: 0,
    beginningBalance: 0,
    averageDailyFlow: 0,
    minimumThreshold: 0,
    accounts: [],
  });
  const [analysis, setAnalysis] = useState({
    patterns: [],
    anomalies: [],
    sources: [],
    purposes: [],
    trends: [],
  });
  const [reserves, setReserves] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('standard');
  const wsRef = useRef(null);

  // ===== WebSocket Connection =====
  const setupWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/cash-flow`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // تحديث البيانات الفعلية الجديدة
        setCashData((prev) => [...prev.slice(-89), data]); // احتفظ بآخر 90 يوم
      } catch (error) {
        console.error('WebSocket parse error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      message.error('فقدان الاتصال بالبيانات الفعلية');
    };

    wsRef.current = ws;
  }, []);

  // ===== API Calls =====
  const fetchCashFlowData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/finance/cash-flow/detailed-report', {
        params: {
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD'),
          account: selectedAccount,
        },
      });

      const data = response.data.data || {};
      setCashData(data.dailyFlows || []);
      setForecasts(data.forecasts || []);
      setReserves(data.reserves || []);
      calculateStats(data.dailyFlows || []);
      performAnalysis(data.dailyFlows || []);
      message.success('تم تحميل بيانات التدفق النقدي');
    } catch (error) {
      message.error('فشل تحميل بيانات التدفق النقدي');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedAccount]);

  const calculateStats = (data) => {
    if (!data || data.length === 0) return;

    const totalInflow = data.reduce((sum, d) => sum + (d.inflows || 0), 0);
    const totalOutflow = data.reduce((sum, d) => sum + (d.outflows || 0), 0);
    const netCashFlow = totalInflow - totalOutflow;
    const endingBalance = (data[data.length - 1]?.balance || 0);
    const beginningBalance = (data[0]?.balance || 0);
    const averageDailyFlow = netCashFlow / data.length;

    // الحد الأدنى للرصيد
    const minimumBalance = Math.min(...data.map(d => d.balance || 0));

    setStats({
      totalInflow,
      totalOutflow,
      netCashFlow,
      endingBalance,
      beginningBalance,
      averageDailyFlow,
      minimumThreshold: minimumBalance,
      accounts: [...new Set(data.map(d => d.account))],
    });
  };

  const performAnalysis = (data) => {
    if (!data || data.length === 0) return;

    // تحليل الأنماط
    const patterns = detectPatterns(data);

    // اكتشاف الشذوذ
    const anomalies = detectAnomalies(data);

    // تحليل المصادر والأغراض
    const sources = analyzeInflowSources(data);
    const purposes = analyzeOutflowPurposes(data);

    // تحليل الاتجاهات
    const trends = analyzeTrends(data);

    setAnalysis({
      patterns,
      anomalies,
      sources,
      purposes,
      trends,
    });
  };

  const detectPatterns = (data) => {
    // اكتشاف الأنماط الدورية والموسمية
    const patterns = [];
    const weeklyAvg = {};

    data.forEach((d) => {
      const dayOfWeek = dayjs(d.date).day();
      if (!weeklyAvg[dayOfWeek]) {
        weeklyAvg[dayOfWeek] = { count: 0, total: 0 };
      }
      weeklyAvg[dayOfWeek].count++;
      weeklyAvg[dayOfWeek].total += d.netFlow || 0;
    });

    Object.entries(weeklyAvg).forEach(([day, data]) => {
      patterns.push({
        day,
        average: (data.total / data.count).toFixed(2),
        frequency: data.count,
      });
    });

    return patterns;
  };

  const detectAnomalies = (data) => {
    // اكتشاف القيم الشاذة باستخدام الانحراف المعياري
    const flows = data.map(d => d.netFlow || 0);
    const mean = flows.reduce((a, b) => a + b, 0) / flows.length;
    const variance = flows.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / flows.length;
    const stdDev = Math.sqrt(variance);

    return data
      .filter(d => Math.abs((d.netFlow || 0) - mean) > 2 * stdDev)
      .map(d => ({
        date: d.date,
        flow: d.netFlow,
        deviation: Math.abs((d.netFlow || 0) - mean),
      }));
  };

  const analyzeInflowSources = (data) => {
    const sources = {};
    data.forEach((d) => {
      if (d.inflowSources) {
        Object.entries(d.inflowSources).forEach(([source, amount]) => {
          sources[source] = (sources[source] || 0) + amount;
        });
      }
    });
    return Object.entries(sources).map(([name, value]) => ({ name, value }));
  };

  const analyzeOutflowPurposes = (data) => {
    const purposes = {};
    data.forEach((d) => {
      if (d.outflowPurposes) {
        Object.entries(d.outflowPurposes).forEach(([purpose, amount]) => {
          purposes[purpose] = (purposes[purpose] || 0) + amount;
        });
      }
    });
    return Object.entries(purposes).map(([name, value]) => ({ name, value }));
  };

  const analyzeTrends = (data) => {
    // تحليل الاتجاهات باستخدام المتوسط المتحرك
    const trends = [];
    const window = 7; // نافذة 7 أيام

    for (let i = window; i < data.length; i++) {
      const slice = data.slice(i - window, i);
      const average = slice.reduce((sum, d) => sum + (d.netFlow || 0), 0) / window;
      trends.push({
        date: data[i].date,
        movingAvg: average.toFixed(2),
        actual: data[i].netFlow || 0,
      });
    }

    return trends;
  };

  const handleSimulateWhatIf = async (scenario) => {
    try {
      const response = await api.post('/finance/cash-flow/simulate', {
        scenario,
        dateRange,
      });

      message.success('تم محاكاة السيناريو');
      // معالجة النتائج
      console.log('Simulation result:', response.data);
    } catch (error) {
      message.error('فشلت المحاكاة');
    }
  };

  const handleDrillDown = (dataPoint) => {
    // فتح تفاصيل نقطة البيانات
    console.log('Drill down:', dataPoint);
  };

  // ===== Effects =====
  useEffect(() => {
    fetchCashFlowData();
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchCashFlowData, setupWebSocket]);

  // ===== Tabs Content =====
  const tabItems = [
    {
      key: 'overview',
      label: 'نظرة عامة',
      children: (
        <Row gutter={[16, 16]}>
          {/* الرسوم البيانية الرئيسية */}
          <Col xs={24} md={12}>
            <Card title="تطور التدفق النقدي">
              {cashData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={cashData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="inflows"
                      stackId="1"
                      stroke="#52c41a"
                      fill="#95de64"
                    />
                    <Area
                      type="monotone"
                      dataKey="outflows"
                      stackId="1"
                      stroke="#ff7a45"
                      fill="#ffbb96"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="لا توجد بيانات" />
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="رصيد الحساب الجاري">
              {cashData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="#1890ff"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="لا توجد بيانات" />
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'forecasts',
      label: 'التنبؤات',
      children: (
        <Card title="توقعات التدفق النقدي 3 أشهر">
          {forecasts.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={forecasts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="predictedInflow" fill="#52c41a" />
                <Bar dataKey="predictedOutflow" fill="#ff7a45" />
                <Line type="monotone" dataKey="predictedBalance" stroke="#1890ff" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="لا توجد تنبؤات" />
          )}
        </Card>
      ),
    },
    {
      key: 'analysis',
      label: 'التحليلات المتقدمة',
      children: (
        <Row gutter={[16, 16]}>
          {/* الأنماط */}
          <Col xs={24} md={12}>
            <Card title="الأنماط الدورية">
              {analysis.patterns.length > 0 ? (
                <Table
                  columns={[
                    { title: 'اليوم', dataIndex: 'day', key: 'day' },
                    { title: 'المتوسط', dataIndex: 'average', key: 'average' },
                    { title: 'التكرار', dataIndex: 'frequency', key: 'frequency' },
                  ]}
                  dataSource={analysis.patterns}
                  pagination={false}
                />
              ) : (
                <Empty description="لا توجد أنماط" />
              )}
            </Card>
          </Col>

          {/* الشذوذ */}
          <Col xs={24} md={12}>
            <Card title="القيم الشاذة المكتشفة">
              {analysis.anomalies.length > 0 ? (
                <Table
                  columns={[
                    { title: 'التاريخ', dataIndex: 'date', key: 'date' },
                    { title: 'التدفق', dataIndex: 'flow', key: 'flow' },
                    { title: 'الانحراف', dataIndex: 'deviation', key: 'deviation' },
                  ]}
                  dataSource={analysis.anomalies}
                  pagination={false}
                />
              ) : (
                <Empty description="لا توجد قيم شاذة" />
              )}
            </Card>
          </Col>

          {/* المصادر والأغراض */}
          <Col xs={24} md={12}>
            <Card title="مصادر التدفق الداخل">
              {analysis.sources.length > 0 ? (
                <Table
                  columns={[
                    { title: 'المصدر', dataIndex: 'name', key: 'name' },
                    { title: 'المبلغ', dataIndex: 'value', key: 'value' },
                  ]}
                  dataSource={analysis.sources}
                  pagination={false}
                />
              ) : (
                <Empty description="لا توجد مصادر" />
              )}
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="أغراض التدفق الخارج">
              {analysis.purposes.length > 0 ? (
                <Table
                  columns={[
                    { title: 'الغرض', dataIndex: 'name', key: 'name' },
                    { title: 'المبلغ', dataIndex: 'value', key: 'value' },
                  ]}
                  dataSource={analysis.purposes}
                  pagination={false}
                />
              ) : (
                <Empty description="لا توجد أغراض" />
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'reserves',
      label: 'إدارة الاحتياطيات',
      children: (
        <Card title="الاحتياطيات النقدية">
          <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
            {reserves.map((reserve, index) => (
              <Col xs={24} sm={12} md={6} key={index}>
                <Card>
                  <p><strong>{reserve.name}</strong></p>
                  <Statistic
                    value={reserve.amount}
                    prefix="$"
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Progress
                    percent={Math.min(100, (reserve.amount / reserve.target) * 100)}
                    status={reserve.amount >= reserve.target ? 'success' : 'active'}
                  />
                  <p style={{ marginTop: '8px', fontSize: '12px' }}>
                    الهدف: ${reserve.target}
                  </p>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* ===== Page Title ===== */}
      <h1 style={{ marginBottom: '24px', color: '#1890ff' }}>
        لوحة التدفق النقدي والسيولة
      </h1>

      {/* ===== Statistics Cards ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="إجمالي الوارد"
              value={stats.totalInflow}
              prefix={<ArrowUpOutlined />}
              suffix="$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="إجمالي الصادر"
              value={stats.totalOutflow}
              prefix={<ArrowDownOutlined />}
              suffix="$"
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="الرصيد الختامي"
              value={stats.endingBalance}
              suffix="$"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="متوسط التدفق اليومي"
              value={stats.averageDailyFlow.toFixed(2)}
              suffix="$"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ===== Filters ===== */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="اختر الحساب"
              value={selectedAccount}
              onChange={setSelectedAccount}
              style={{ width: '100%' }}
              options={[
                { label: 'الكل', value: 'all' },
                ...stats.accounts.map(acc => ({ label: acc, value: acc })),
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              loading={loading}
              onClick={fetchCashFlowData}
              block
            >
              بحث
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchCashFlowData}
              block
            >
              تحديث
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ===== Tabs ===== */}
      <Card loading={loading}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default CashFlowDashboard;
