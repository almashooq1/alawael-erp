/**
 * ValidationDashboard Component
 * لوحة التحقق من الامتثال والانتهاكات المالية
 *
 * Features:
 * - تتبع انتهاكات الامتثال
 * - تصفية متقدمة (حسب الخطورة والنوع والتاريخ)
 * - إحصائيات وكاردات البيانات
 * - رسوم بيانية متعددة (أعمدة، خطوط، دائرية)
 * - جدول تفاصيل الانتهاكات
 * - نافذة تفاصيل الانتهاك
 * - تصدير PDF و Excel
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
  Badge,
  Empty,
  Modal,
  message,
  Space,
  Tooltip,
  Segmented,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ExclamationOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  FilterOutlined,
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
import { api } from '../services/api';

const ValidationDashboard = () => {
  // ===== State Management =====
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    severity: 'all',
    type: 'all',
    dateRange: [dayjs().subtract(30, 'days'), dayjs()],
  });
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolved: 0,
    pending: 0,
    averageResolutionTime: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [violationsByType, setViolationsByType] = useState([]);
  const [trendData, setTrendData] = useState([]);

  // ===== Dynamic Colors =====
  const severityColors = {
    critical: '#ff4d4f',
    high: '#ff7a45',
    medium: '#faad14',
    low: '#1890ff',
  };

  const statusColors = {
    resolved: '#52c41a',
    pending: '#faad14',
    overdue: '#ff4d4f',
  };

  // ===== API Calls =====
  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/finance/validation/violations-report', {
        params: {
          from: filter.dateRange[0].format('YYYY-MM-DD'),
          to: filter.dateRange[1].format('YYYY-MM-DD'),
          severity: filter.severity,
          type: filter.type,
        },
      });

      const data = response.data.data || [];
      setViolations(data);
      calculateStats(data);
      generateCharts(data);
      message.success('تم تحميل البيانات بنجاح');
    } catch (error) {
      message.error('فشل تحميل البيانات');
      console.error('Error fetching violations:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const calculateStats = (data) => {
    const newStats = {
      total: data.length,
      critical: data.filter(v => v.severity === 'critical').length,
      high: data.filter(v => v.severity === 'high').length,
      medium: data.filter(v => v.severity === 'medium').length,
      low: data.filter(v => v.severity === 'low').length,
      resolved: data.filter(v => v.status === 'resolved').length,
      pending: data.filter(v => v.status === 'pending').length,
    };

    // حساب متوسط وقت الحل
    const resolved = data.filter(v => v.status === 'resolved' && v.resolvedAt);
    const avgTime = resolved.length > 0
      ? resolved.reduce((sum, v) => sum + (new Date(v.resolvedAt) - new Date(v.createdAt)), 0) / resolved.length / (1000 * 60 * 60)
      : 0;
    newStats.averageResolutionTime = Math.round(avgTime);

    setStats(newStats);
  };

  const generateCharts = (data) => {
    // توزيع الانتهاكات حسب الخطورة
    const byType = data.reduce((acc, v) => {
      const existing = acc.find(item => item.name === v.type);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: v.type, value: 1 });
      }
      return acc;
    }, []);
    setChartData(byType);
    setViolationsByType(byType);

    // بيانات الاتجاه اليومي
    const daily = {};
    data.forEach(v => {
      const date = dayjs(v.createdAt).format('YYYY-MM-DD');
      daily[date] = (daily[date] || 0) + 1;
    });

    const trendArray = Object.entries(daily)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    setTrendData(trendArray);
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.get('/finance/validation/export-pdf', {
        params: {
          from: filter.dateRange[0].format('YYYY-MM-DD'),
          to: filter.dateRange[1].format('YYYY-MM-DD'),
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `violations_${dayjs().format('YYYY-MM-DD')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentChild.removeChild(link);
      message.success('تم تصدير PDF بنجاح');
    } catch (error) {
      message.error('فشل تصدير PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get('/finance/validation/export-excel', {
        params: {
          from: filter.dateRange[0].format('YYYY-MM-DD'),
          to: filter.dateRange[1].format('YYYY-MM-DD'),
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `violations_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentChild.removeChild(link);
      message.success('تم تصدير Excel بنجاح');
    } catch (error) {
      message.error('فشل تصدير Excel');
    }
  };

  const handleResolveViolation = async (violationId) => {
    try {
      await api.patch(`/finance/validation/violations/${violationId}`, {
        status: 'resolved',
      });
      message.success('تم حل الانتهاك');
      fetchViolations();
    } catch (error) {
      message.error('فشل حل الانتهاك');
    }
  };

  // ===== Effects =====
  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  // ===== Table Columns =====
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'النوع',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (text) => <span>{text}</span>,
    },
    {
      title: 'الخطورة',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity) => (
        <Badge
          color={severityColors[severity]}
          text={severity}
        />
      ),
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Badge
          color={statusColors[status]}
          text={status}
        />
      ),
    },
    {
      title: 'الوصف',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'التاريخ',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'الإجراء',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => {
              setSelectedViolation(record);
              setModalVisible(true);
            }}
          >
            عرض
          </Button>
          {record.status === 'pending' && (
            <Button
              type="success"
              size="small"
              onClick={() => handleResolveViolation(record.id)}
            >
              حل
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* ===== Page Title ===== */}
      <h1 style={{ marginBottom: '24px', color: '#1890ff' }}>
        لوحة التحقق من الامتثال المالي
      </h1>

      {/* ===== Statistics Cards ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="إجمالي الانتهاكات"
              value={stats.total}
              prefix={<ExclamationOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="انتهاكات حرجة"
              value={stats.critical}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="معلقة"
              value={stats.pending}
              suffix="انتهاك"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="محلولة"
              value={stats.resolved}
              suffix="انتهاك"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ===== Filters ===== */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="اختر مستوى الخطورة"
              value={filter.severity}
              onChange={(value) => setFilter({ ...filter, severity: value })}
              style={{ width: '100%' }}
              options={[
                { label: 'الكل', value: 'all' },
                { label: 'حرج', value: 'critical' },
                { label: 'عالي', value: 'high' },
                { label: 'متوسط', value: 'medium' },
                { label: 'منخفض', value: 'low' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="اختر النوع"
              value={filter.type}
              onChange={(value) => setFilter({ ...filter, type: value })}
              style={{ width: '100%' }}
              options={[
                { label: 'الكل', value: 'all' },
                { label: 'مخالفة مالية', value: 'financial' },
                { label: 'عدم امتثال', value: 'compliance' },
                { label: 'خطأ حسابي', value: 'calculation' },
                { label: 'فترة انقضاء', value: 'expiry' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <DatePicker.RangePicker
              value={filter.dateRange}
              onChange={(dates) => setFilter({ ...filter, dateRange: dates })}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Button
                type="primary"
                icon={<FilterOutlined />}
                loading={loading}
                onClick={fetchViolations}
              >
                بحث
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setFilter({
                    severity: 'all',
                    type: 'all',
                    dateRange: [dayjs().subtract(30, 'days'), dayjs()],
                  });
                }}
              >
                إعادة تعيين
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ===== Charts ===== */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={12}>
          <Card title="توزيع الانتهاكات حسب النوع">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(severityColors)[index % 4]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="لا توجد بيانات" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="اتجاه الانتهاكات اليومي">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#1890ff" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="لا توجد بيانات" />
            )}
          </Card>
        </Col>
      </Row>

      {/* ===== Export Buttons ===== */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              block
              onClick={handleExportPDF}
            >
              تصدير PDF
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              block
              onClick={handleExportExcel}
            >
              تصدير Excel
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ===== Violations Table ===== */}
      <Card
        title="جدول الانتهاكات"
        loading={loading}
      >
        {violations.length > 0 ? (
          <Table
            columns={columns}
            dataSource={violations.map((v, index) => ({ ...v, key: index }))}
            pagination={{ pageSize: 10, showTotal: (total) => `إجمالي: ${total}` }}
            scroll={{ x: 1200 }}
          />
        ) : (
          <Empty description="لا توجد انتهاكات" />
        )}
      </Card>

      {/* ===== Violation Detail Modal ===== */}
      <Modal
        title="تفاصيل الانتهاك"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            إغلاق
          </Button>,
          selectedViolation?.status === 'pending' && (
            <Button
              key="resolve"
              type="primary"
              onClick={() => {
                handleResolveViolation(selectedViolation.id);
                setModalVisible(false);
              }}
            >
              حل الانتهاك
            </Button>
          ),
        ]}
      >
        {selectedViolation && (
          <div>
            <p><strong>ID:</strong> {selectedViolation.id}</p>
            <p><strong>النوع:</strong> {selectedViolation.type}</p>
            <p>
              <strong>الخطورة:</strong>{' '}
              <Badge
                color={severityColors[selectedViolation.severity]}
                text={selectedViolation.severity}
              />
            </p>
            <p>
              <strong>الحالة:</strong>{' '}
              <Badge
                color={statusColors[selectedViolation.status]}
                text={selectedViolation.status}
              />
            </p>
            <p><strong>الوصف:</strong> {selectedViolation.description}</p>
            <p><strong>التاريخ:</strong> {dayjs(selectedViolation.createdAt).format('YYYY-MM-DD HH:mm')}</p>
            {selectedViolation.resolvedAt && (
              <p><strong>تاريخ الحل:</strong> {dayjs(selectedViolation.resolvedAt).format('YYYY-MM-DD HH:mm')}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ValidationDashboard;
