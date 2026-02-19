/**
 * ReportingDashboard Component
 * لوحة التقارير المالية المتقدمة
 * 
 * Features:
 * - تقارير مالية شاملة
 * - تحليل المقاييس المالية
 * - مقارنة الأداء
 * - الرسوم البيانية والإحصائيات
 * - تصدير التقارير
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
  Space,
  Tooltip,
  Badge,
  Segmented,
} from 'antd';
import {
  DollarOutlined,
  PercentageOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';

const ReportingDashboard = () => {
  // ===== State Management =====
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('income-statement');
  const [period, setPeriod] = useState('monthly');
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(1, 'year'),
    dayjs(),
  ]);
  const [metrics, setMetrics] = useState({});
  const [comparison, setComparison] = useState([]);

  // ===== API Calls =====
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        type: reportType,
        period,
        from: dateRange[0].format('YYYY-MM-DD'),
        to: dateRange[1].format('YYYY-MM-DD'),
      });

      const response = await fetch(
        `/api/finance/reporting/financial-report?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setReports(data.data.reports || []);
      setMetrics(data.data.metrics || {});
      setComparison(data.data.comparison || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      message.error('خطأ في تحميل التقارير');
    } finally {
      setLoading(false);
    }
  }, [reportType, period, dateRange]);

  const generateReport = async (format) => {
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        type: reportType,
        period,
        from: dateRange[0].format('YYYY-MM-DD'),
        to: dateRange[1].format('YYYY-MM-DD'),
        format,
      });

      setLoading(true);
      const response = await fetch(
        `/api/finance/reporting/generate-report?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.${format}`;
      a.click();
      message.success(`تم إنشاء التقرير بصيغة ${format}`);
    } catch (error) {
      console.error('Report generation error:', error);
      message.error('خطأ في إنشاء التقرير');
    } finally {
      setLoading(false);
    }
  };

  const scheduleReport = async (frequency) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/finance/reporting/schedule', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          frequency,
          recipients: [],
        }),
      });

      if (!response.ok) throw new Error('Scheduling failed');

      message.success('تم جدولة التقرير بنجاح');
    } catch (error) {
      console.error('Scheduling error:', error);
      message.error('خطأ في جدولة التقرير');
    }
  };

  // ===== Effects =====
  useEffect(() => {
    fetchReports();
  }, [reportType, period, dateRange]);

  // ===== Data Preparation =====
  const reportTitles = {
    'income-statement': 'بيان الدخل',
    'balance-sheet': 'الميزانية العمومية',
    'cash-flow': 'بيان التدفقات النقدية',
    'trial-balance': 'ميزان المراجعة',
    'profit-loss': 'قائمة الأرباح والخسائر',
  };

  const chartData = comparison.slice(0, 12).map(item => ({
    period: dayjs(item.date).format('MMM'),
    actual: Math.round(item.actual || 0),
    budget: Math.round(item.budget || 0),
    previous: Math.round(item.previous || 0),
  }));

  const ratioData = [
    { name: 'النسبة الحالية', value: (metrics.currentRatio || 0).toFixed(2) },
    { name: 'النسبة السريعة', value: (metrics.quickRatio || 0).toFixed(2) },
    { name: 'نسبة الدين', value: (metrics.debtRatio || 0).toFixed(2) },
    { name: 'العائد على الأصول', value: (metrics.roa || 0).toFixed(2) + '%' },
  ];

  // ===== Table Columns =====
  const reportColumns = [
    {
      title: 'البند',
      dataIndex: 'item',
      key: 'item',
      width: 200,
    },
    {
      title: 'الفترة الحالية',
      dataIndex: 'current',
      key: 'current',
      render: (value) => (
        <span>ر.س {Number(value || 0).toLocaleString('ar-SA')}</span>
      ),
    },
    {
      title: 'الفترة السابقة',
      dataIndex: 'previous',
      key: 'previous',
      render: (value) => (
        <span>ر.س {Number(value || 0).toLocaleString('ar-SA')}</span>
      ),
    },
    {
      title: 'التغيير',
      dataIndex: 'change',
      key: 'change',
      render: (_, record) => {
        const change = (record.current - record.previous) || 0;
        const percentage = record.previous ? ((change / record.previous) * 100).toFixed(2) : 0;
        return (
          <Space>
            <span style={{ color: change >= 0 ? '#52c41a' : '#ff4d4f' }}>
              {change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {Math.abs(change).toLocaleString('ar-SA')}
            </span>
            <span>({percentage}%)</span>
          </Space>
        );
      },
    },
  ];

  const ratioColumns = [
    {
      title: 'النسبة المالية',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'القيمة',
      dataIndex: 'value',
      key: 'value',
      render: (value) => <strong>{value}</strong>,
    },
    {
      title: 'التقييم',
      key: 'assessment',
      render: (_, record) => {
        let status = 'success';
        let text = 'جيد';
        if (parseFloat(record.value) < 1) {
          status = 'error';
          text = 'ضعيف';
        } else if (parseFloat(record.value) < 1.5) {
          status = 'warning';
          text = 'متوسط';
        }
        return <Badge status={status} text={text} />;
      },
    },
  ];

  // ===== Render =====
  return (
    <div style={{ padding: '24px', direction: 'rtl' }}>
      <h1>📊 لوحة التقارير المالية المتقدمة</h1>

      {/* Key Metrics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="إجمالي الإيرادات"
              value={metrics.totalRevenue}
              prefix="ر.س"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="إجمالي النفقات"
              value={metrics.totalExpenses}
              prefix="ر.س"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="صافي الدخل"
              value={metrics.netIncome}
              prefix="ر.س"
              valueStyle={{
                color: (metrics.netIncome || 0) >= 0 ? '#52c41a' : '#ff4d4f',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="الهامش الصافي"
              value={metrics.netMargin}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Controls */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select
              value={reportType}
              onChange={setReportType}
              style={{ width: '100%' }}
              placeholder="نوع التقرير"
              options={[
                { label: 'بيان الدخل', value: 'income-statement' },
                { label: 'الميزانية العمومية', value: 'balance-sheet' },
                { label: 'بيان التدفقات النقدية', value: 'cash-flow' },
                { label: 'ميزان المراجعة', value: 'trial-balance' },
                { label: 'الأرباح والخسائر', value: 'profit-loss' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              value={period}
              onChange={setPeriod}
              style={{ width: '100%' }}
              placeholder="الفترة"
              options={[
                { label: 'يومي', value: 'daily' },
                { label: 'أسبوعي', value: 'weekly' },
                { label: 'شهري', value: 'monthly' },
                { label: 'ربع سنوي', value: 'quarterly' },
                { label: 'سنوي', value: 'annual' },
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
            <Button type="primary" block onClick={fetchReports} loading={loading}>
              تحديث
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Export Actions */}
      <Card style={{ marginBottom: 24, background: '#f0f5ff' }}>
        <Row gutter={16} align="middle">
          <Col xs={12} sm={8} md={4}>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => generateReport('excel')}
              loading={loading}
              block
            >
              Excel
            </Button>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => generateReport('pdf')}
              loading={loading}
              block
            >
              PDF
            </Button>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Button icon={<PrinterOutlined />} block>
              طباعة
            </Button>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              placeholder="جدولة"
              options={[
                { label: 'يومي', value: 'daily' },
                { label: 'أسبوعي', value: 'weekly' },
                { label: 'شهري', value: 'monthly' },
              ]}
              onChange={(freq) => scheduleReport(freq)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={8} md={8}>
            <Input placeholder="البريد الإلكتروني للمستقبلين" />
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Tabs
        items={[
          {
            key: '1',
            label: '📈 البيانات والرسوم',
            children: (
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Card title="المقارنة بين الفترات">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="actual" fill="#1890ff" name="الفعلي" />
                        <Bar dataKey="budget" fill="#52c41a" name="الميزانية" />
                        <Bar dataKey="previous" fill="#faad14" name="السابق" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="الاتجاه عبر الزمن">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#1890ff"
                          name="الفعلي"
                        />
                        <Line
                          type="monotone"
                          dataKey="budget"
                          stroke="#52c41a"
                          name="الميزانية"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: '2',
            label: '📊 التفاصيل',
            children: (
              <Card title={reportTitles[reportType]}>
                {reports.length === 0 && !loading ? (
                  <Empty description="لا توجد بيانات" />
                ) : (
                  <Table
                    columns={reportColumns}
                    dataSource={reports}
                    loading={loading}
                    rowKey="id"
                    pagination={false}
                  />
                )}
              </Card>
            ),
          },
          {
            key: '3',
            label: '📍 النسب المالية',
            children: (
              <Card title="تحليل النسب المالية">
                <Table
                  columns={ratioColumns}
                  dataSource={ratioData.map((r, idx) => ({ ...r, id: idx }))}
                  loading={loading}
                  rowKey="id"
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: '4',
            label: '📋 التحليل',
            children: (
              <Card title="ملخص التحليل">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <h4>نقاط القوة:</h4>
                    <ul>
                      <li>نمو الإيرادات بنسبة 15% هذا الربع</li>
                      <li>انخفاض نسبة التكاليف المتغيرة</li>
                      <li>تحسن السيولة قصيرة الأجل</li>
                    </ul>
                  </Col>
                  <Col xs={24} md={12}>
                    <h4>مجالات التحسين:</h4>
                    <ul>
                      <li>تقليل نفقات التشغيل</li>
                      <li>تحسين دوران الأصول</li>
                      <li>إدارة الدين بشكل أفضل</li>
                    </ul>
                  </Col>
                </Row>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

const Input = ({ placeholder, style }) => (
  <input
    type="text"
    placeholder={placeholder}
    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d9d9d9', ...style }}
  />
);

export default ReportingDashboard;
