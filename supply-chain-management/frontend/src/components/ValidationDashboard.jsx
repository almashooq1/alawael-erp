/**
 * ValidationDashboard Component
 * لوحة تحقق القواعد المالية والامتثال
 *
 * Features:
 * - عرض الانتهاكات والأخطاء
 * - تصفية حسب الخطورة والنوع
 * - إحصائيات فورية
 * - رسوم بيانية متقدمة
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
  Badge,
  Empty,
  Loading,
  Modal,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ExclamationOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';

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
    complianceRate: 0,
  });

  // ===== API Calls =====
  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const params = new URLSearchParams({
        severity: filter.severity !== 'all' ? filter.severity : '',
        type: filter.type !== 'all' ? filter.type : '',
        from: filter.dateRange?.[0]?.format('YYYY-MM-DD') || '',
        to: filter.dateRange?.[1]?.format('YYYY-MM-DD') || '',
      });

      const response = await fetch(`/api/finance/validation/violations-report?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch violations');

      const data = await response.json();
      setViolations(data.data || []);
      calculateStats(data.data || []);
    } catch (error) {
      console.error('Error fetching violations:', error);
      message.error('خطأ في تحميل بيانات الانتهاكات');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const calculateStats = data => {
    const stats = {
      total: data.length,
      critical: data.filter(v => v.severity === 'critical').length,
      high: data.filter(v => v.severity === 'high').length,
      medium: data.filter(v => v.severity === 'medium').length,
      low: data.filter(v => v.severity === 'low').length,
      resolved: data.filter(v => v.status === 'resolved').length,
      pending: data.filter(v => v.status === 'pending').length,
      complianceRate:
        data.length > 0
          ? (
              ((data.length - data.filter(v => v.severity === 'critical').length) / data.length) *
              100
            ).toFixed(2)
          : 100,
    };
    setStats(stats);
  };

  const resolveViolation = async violationId => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`/api/finance/validation/${violationId}/resolve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'resolved' }),
      });

      if (!response.ok) throw new Error('Failed to resolve violation');

      message.success('تم حل الانتهاك بنجاح');
      fetchViolations();
      setModalVisible(false);
    } catch (error) {
      console.error('Error resolving violation:', error);
      message.error('خطأ في حل الانتهاك');
    }
  };

  const exportReport = async format => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`/api/finance/validation/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation-report.${format}`;
      a.click();
      message.success(`تم تصدير التقرير بصيغة ${format}`);
    } catch (error) {
      console.error('Export error:', error);
      message.error('خطأ في تصدير التقرير');
    }
  };

  // ===== Effects =====
  useEffect(() => {
    fetchViolations();
  }, [filter]);

  // ===== Data Preparation =====
  const violationsByType = violations.reduce((acc, v) => {
    const existing = acc.find(item => item.name === v.type);
    if (existing) existing.count += 1;
    else acc.push({ name: v.type, count: 1 });
    return acc;
  }, []);

  const severityDistribution = [
    { name: 'حرج', value: stats.critical, fill: '#ff4d4f' },
    { name: 'عالي', value: stats.high, fill: '#fa8c16' },
    { name: 'متوسط', value: stats.medium, fill: '#faad14' },
    { name: 'منخفض', value: stats.low, fill: '#52c41a' },
  ];

  const trendData = violations
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-30)
    .map(v => ({
      date: dayjs(v.createdAt).format('DD/MM'),
      count: 1,
    }))
    .reduce((acc, item) => {
      const existing = acc.find(a => a.date === item.date);
      if (existing) existing.count += 1;
      else acc.push(item);
      return acc;
    }, []);

  // ===== Table Columns =====
  const columns = [
    {
      title: 'الرقم',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'النوع',
      dataIndex: 'type',
      key: 'type',
      render: text => <span>{text}</span>,
    },
    {
      title: 'الخطورة',
      dataIndex: 'severity',
      key: 'severity',
      render: severity => {
        let color = 'default';
        let icon = null;
        if (severity === 'critical') {
          color = 'red';
          icon = <CloseCircleOutlined />;
        } else if (severity === 'high') {
          color = 'orange';
          icon = <ExclamationOutlined />;
        } else if (severity === 'medium') {
          color = 'gold';
          icon = <WarningOutlined />;
        } else {
          color = 'green';
          icon = <CheckCircleOutlined />;
        }
        return <Badge icon={icon} color={color} text={severity} />;
      },
    },
    {
      title: 'التاريخ',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Badge
          status={status === 'resolved' ? 'success' : 'processing'}
          text={status === 'resolved' ? 'مَحلول' : 'معلق'}
        />
      ),
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <>
          <Button
            type="primary"
            size="small"
            onClick={() => {
              setSelectedViolation(record);
              setModalVisible(true);
            }}
          >
            تفاصيل
          </Button>
          {record.status === 'pending' && (
            <Button
              size="small"
              onClick={() => resolveViolation(record.id)}
              style={{ marginLeft: 8 }}
            >
              حل
            </Button>
          )}
        </>
      ),
    },
  ];

  // ===== Render =====
  return (
    <div style={{ padding: '24px' }}>
      <h1>📊 لوحة تحقق القواعد المالية</h1>

      {/* Header Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="إجمالي الانتهاكات"
              value={stats.total}
              prefix={<ExclamationOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="الانتهاكات الحرجة"
              value={stats.critical}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="نسبة الامتثال"
              value={stats.complianceRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="الانتهاكات المحلولة"
              value={stats.resolved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select
              value={filter.severity}
              onChange={value => setFilter({ ...filter, severity: value })}
              style={{ width: '100%' }}
              placeholder="اختر درجة الخطورة"
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
              value={filter.type}
              onChange={value => setFilter({ ...filter, type: value })}
              style={{ width: '100%' }}
              placeholder="اختر نوع الانتهاك"
              options={[
                { label: 'الكل', value: 'all' },
                { label: 'قاعدة مفقودة', value: 'missing_rule' },
                { label: 'قيمة خاطئة', value: 'invalid_value' },
                { label: 'رصيد سالب', value: 'negative_balance' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <DatePicker.RangePicker
              value={filter.dateRange}
              onChange={dates => setFilter({ ...filter, dateRange: dates })}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button type="primary" block onClick={fetchViolations}>
              تحديث البيانات
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="الانتهاكات حسب النوع">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={violationsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="توزيع درجة الخطورة">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Violations Table */}
      <Card
        title="تفاصيل الانتهاكات"
        extra={
          <div>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => exportReport('pdf')}
              style={{ marginRight: 8 }}
            >
              PDF
            </Button>
            <Button icon={<FileExcelOutlined />} onClick={() => exportReport('excel')}>
              Excel
            </Button>
          </div>
        }
      >
        {violations.length === 0 && !loading ? (
          <Empty description="لا توجد انتهاكات" />
        ) : (
          <Table
            columns={columns}
            dataSource={violations}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: total => `إجمالي: ${total} انتهاك`,
            }}
          />
        )}
      </Card>

      {/* Detail Modal */}
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
              onClick={() => resolveViolation(selectedViolation.id)}
            >
              حل الانتهاك
            </Button>
          ),
        ]}
      >
        {selectedViolation && (
          <div>
            <p>
              <strong>النوع:</strong> {selectedViolation.type}
            </p>
            <p>
              <strong>الخطورة:</strong> {selectedViolation.severity}
            </p>
            <p>
              <strong>الوصف:</strong> {selectedViolation.description}
            </p>
            <p>
              <strong>التاريخ:</strong>{' '}
              {dayjs(selectedViolation.createdAt).format('DD/MM/YYYY HH:mm')}
            </p>
            <p>
              <strong>التوصيات:</strong> {selectedViolation.recommendations}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ValidationDashboard;
