/**
 * CashFlowDashboard Component
 * لوحة التدفق النقدي ومراقبة السيولة
 *
 * Features:
 * - رسوم بيانية للتدفق النقدي
 * - توقعات السيولة
 * - إحصائيات الحسابات النقدية
 * - تحليل الاتجاهات
 * - تصدير البيانات
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Collapse,
  Tooltip,
  Progress,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  CalculatorOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  TrendingUpOutlined,
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import dayjs from 'dayjs';

const CashFlowDashboard = () => {
  // ===== State Management =====
  const [cashData, setCashData] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().subtract(6, 'months'), dayjs()]);
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

  // ===== API Calls =====
  const fetchCashFlowData = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const params = new URLSearchParams({
        from: dateRange[0].format('YYYY-MM-DD'),
        to: dateRange[1].format('YYYY-MM-DD'),
        account: selectedAccount,
      });

      const response = await fetch(`/api/finance/cash-flow/detailed-report?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch cash flow data');

      const data = await response.json();
      setCashData(data.data.dailyFlows || []);
      calculateStats(data.data.dailyFlows || []);

      // Fetch forecasts
      fetchForecasts();
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      message.error('خطأ في تحميل بيانات التدفق النقدي');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedAccount]);

  const fetchForecasts = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`/api/finance/cash-flow/forecast?days=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch forecasts');

      const data = await response.json();
      setForecasts(data.data.forecasts || []);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
    }
  };

  const calculateStats = data => {
    const stats = {
      totalInflow: data.reduce((sum, item) => sum + (item.inflow || 0), 0),
      totalOutflow: data.reduce((sum, item) => sum + (item.outflow || 0), 0),
      netCashFlow: 0,
      endingBalance: 0,
      beginningBalance: data[0]?.openingBalance || 0,
      averageDailyFlow: 0,
      minimumThreshold: 0,
      accounts: [],
    };

    stats.netCashFlow = stats.totalInflow - stats.totalOutflow;
    stats.endingBalance = stats.beginningBalance + stats.netCashFlow;
    stats.averageDailyFlow = data.length > 0 ? stats.netCashFlow / data.length : 0;
    stats.minimumThreshold = Math.min(...data.map(d => d.closingBalance));

    setStats(stats);
  };

  const exportData = async format => {
    try {
      const token = sessionStorage.getItem('authToken');
      const params = new URLSearchParams({
        from: dateRange[0].format('YYYY-MM-DD'),
        to: dateRange[1].format('YYYY-MM-DD'),
        account: selectedAccount,
        format,
      });

      const response = await fetch(`/api/finance/cash-flow/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cash-flow-report.${format}`;
      a.click();
      message.success(`تم التصدير بصيغة ${format}`);
    } catch (error) {
      console.error('Export error:', error);
      message.error('خطأ في التصدير');
    }
  };

  // ===== Effects =====
  useEffect(() => {
    fetchCashFlowData();
  }, [dateRange, selectedAccount]);

  // ===== Data Preparation =====
  const chartData = cashData.map(item => ({
    date: dayjs(item.date).format('DD/MM'),
    inflow: Math.round(item.inflow || 0),
    outflow: Math.round(item.outflow || 0),
    netFlow: Math.round((item.inflow || 0) - (item.outflow || 0)),
    balance: Math.round(item.closingBalance || 0),
  }));

  const forecastChartData = forecasts.map(item => ({
    date: dayjs(item.date).format('DD/MM'),
    forecast: Math.round(item.forecasted_balance || 0),
    confidence: item.confidence_level || 0,
  }));

  // ===== Table Columns =====
  const columns = [
    {
      title: 'التاريخ',
      dataIndex: 'date',
      key: 'date',
      render: date => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'الرصيد الافتتاحي',
      dataIndex: 'openingBalance',
      key: 'opening',
      render: value => `ر.س ${Number(value).toLocaleString('ar-SA')}`,
    },
    {
      title: 'التدفق الداخلي',
      dataIndex: 'inflow',
      key: 'inflow',
      render: value => (
        <span style={{ color: '#52c41a' }}>
          <ArrowUpOutlined /> ر.س {Number(value).toLocaleString('ar-SA')}
        </span>
      ),
    },
    {
      title: 'التدفق الخارجي',
      dataIndex: 'outflow',
      key: 'outflow',
      render: value => (
        <span style={{ color: '#ff4d4f' }}>
          <ArrowDownOutlined /> ر.س {Number(value).toLocaleString('ar-SA')}
        </span>
      ),
    },
    {
      title: 'الرصيد الختامي',
      dataIndex: 'closingBalance',
      key: 'closing',
      render: value => `ر.س ${Number(value).toLocaleString('ar-SA')}`,
    },
    {
      title: 'الفئة',
      dataIndex: 'category',
      key: 'category',
      render: text => <span>{text || 'عام'}</span>,
    },
  ];

  // ===== Render =====
  return (
    <div style={{ padding: '24px', direction: 'rtl' }}>
      <h1>💰 لوحة التدفق النقدي والسيولة</h1>

      {/* Header Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="إجمالي التدفق الداخلي"
              value={stats.totalInflow}
              prefix="ر.س"
              suffix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="إجمالي التدفق الخارجي"
              value={stats.totalOutflow}
              prefix="ر.س"
              suffix={<ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="صافي التدفق النقدي"
              value={stats.netCashFlow}
              prefix="ر.س"
              valueStyle={{ color: stats.netCashFlow >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="الرصيد الختامي"
              value={stats.endingBalance}
              prefix="ر.س"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={dates => setDateRange(dates)}
              style={{ width: '100%' }}
              className="rtl"
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              value={selectedAccount}
              onChange={setSelectedAccount}
              style={{ width: '100%' }}
              placeholder="اختر الحساب"
              options={[
                { label: 'الكل', value: 'all' },
                { label: 'حساب متحرك', value: 'current' },
                { label: 'حساب توفير', value: 'savings' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button type="primary" block onClick={fetchCashFlowData} loading={loading}>
              تحديث البيانات
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Charts */}
      <Tabs
        items={[
          {
            key: '1',
            label: '📈 الرسوم البيانية',
            children: (
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Card title="التدفق النقدي اليومي">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip />
                        <Area
                          type="monotone"
                          dataKey="inflow"
                          stroke="#52c41a"
                          fillOpacity={1}
                          fill="url(#colorInflow)"
                        />
                        <Area
                          type="monotone"
                          dataKey="outflow"
                          stroke="#ff4d4f"
                          fillOpacity={1}
                          fill="url(#colorOutflow)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="الرصيد والصافي">
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="netFlow" fill="#1890ff" />
                        <Line type="monotone" dataKey="balance" stroke="#faad14" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: '2',
            label: '🔮 التوقعات',
            children: (
              <Card title="توقعات التدفق النقدي (30 يوم)">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={forecastChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="#1890ff"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            ),
          },
          {
            key: '3',
            label: '📊 التفاصيل',
            children: (
              <Card
                title="بيانات التدفق النقدي اليومي"
                extra={
                  <div>
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={() => exportData('excel')}
                      style={{ marginRight: 8 }}
                    >
                      Excel
                    </Button>
                    <Button icon={<FilePdfOutlined />} onClick={() => exportData('pdf')}>
                      PDF
                    </Button>
                  </div>
                }
              >
                {cashData.length === 0 && !loading ? (
                  <Empty description="لا توجد بيانات" />
                ) : (
                  <Table
                    columns={columns}
                    dataSource={cashData}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                    }}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Analysis Section */}
      <Card title="📋 تحليل السيولة" style={{ marginTop: 24 }}>
        <Collapse
          items={[
            {
              key: '1',
              label: 'ملخص الأداء',
              children: (
                <div>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <p>
                        <strong>متوسط التدفق اليومي:</strong> ر.س{' '}
                        {Number(stats.averageDailyFlow).toLocaleString('ar-SA')}
                      </p>
                      <p>
                        <strong>أقل رصيد:</strong> ر.س{' '}
                        {Number(stats.minimumThreshold).toLocaleString('ar-SA')}
                      </p>
                    </Col>
                    <Col xs={24} md={12}>
                      <Progress
                        type="circle"
                        percent={Math.min(100, (stats.endingBalance / 100000) * 100)}
                        format={() => 'السيولة'}
                      />
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: '2',
              label: 'التوصيات',
              children: (
                <ul>
                  <li>الحفاظ على حد أدنى من السيولة 50,000 ر.س</li>
                  <li>مراقبة التدفقات الخارجة الكبيرة</li>
                  <li>تحسين جدولة التحصيلات</li>
                </ul>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default CashFlowDashboard;
