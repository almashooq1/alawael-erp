/**
 * ComplianceDashboard Component
 * لوحة الامتثال والحوكمة
 * 
 * Features:
 * - متابعة الامتثال
 * - مؤشرات الحوكمة
 * - المخالفات والتصحيحات
 * - التدقيق والمراجعة
 * - التقارير الدورية
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
  Timeline,
  Progress,
  Tag,
  message,
  Empty,
  Modal,
  List,
  Badge,
  Alert,
  Collapse,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  CheckOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import dayjs from 'dayjs';

const ComplianceDashboard = () => {
  // ===== State Management =====
  const [complianceData, setComplianceData] = useState([]);
  const [violations, setViolations] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(12, 'months'),
    dayjs(),
  ]);
  const [stats, setStats] = useState({
    complianceRate: 0,
    totalRules: 0,
    compliantRules: 0,
    violatingRules: 0,
    criticalViolations: 0,
    avgResolutionTime: 0,
    lastAuditDate: null,
    nextAuditDate: null,
  });

  // ===== API Calls =====
  const fetchComplianceData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        from: dateRange[0].format('YYYY-MM-DD'),
        to: dateRange[1].format('YYYY-MM-DD'),
      });

      const response = await fetch(
        `/api/finance/compliance/summary?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch compliance data');

      const data = await response.json();
      setComplianceData(data.data.compliance || []);
      setViolations(data.data.violations || []);
      setAuditEvents(data.data.auditTrail || []);
      calculateStats(data.data);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
      message.error('خطأ في تحميل بيانات الامتثال');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const calculateStats = (data) => {
    const compliant = data.compliance.filter(c => c.status === 'compliant').length;
    const total = data.compliance.length || 1;
    const stats = {
      complianceRate: ((compliant / total) * 100).toFixed(2),
      totalRules: total,
      compliantRules: compliant,
      violatingRules: total - compliant,
      criticalViolations: data.violations.filter(v => v.severity === 'critical').length,
      avgResolutionTime: calculateAvgResolution(data.violations),
      lastAuditDate: data.lastAuditDate || null,
      nextAuditDate: data.nextAuditDate || null,
    };
    setStats(stats);
  };

  const calculateAvgResolution = (violations) => {
    if (!violations || violations.length === 0) return 0;
    const resolved = violations.filter(v => v.resolvedDate);
    if (resolved.length === 0) return 0;
    const totalDays = resolved.reduce((sum, v) => {
      const days = dayjs(v.resolvedDate).diff(dayjs(v.createdAt), 'days');
      return sum + days;
    }, 0);
    return (totalDays / resolved.length).toFixed(1);
  };

  const resolveViolation = async (violationId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/finance/compliance/${violationId}/resolve`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'resolved',
            resolutionNotes: selectedViolation.resolutionNotes,
          }),
        }
      );

      if (!response.ok) throw new Error('Resolution failed');

      message.success('تم حل المخالفة بنجاح');
      fetchComplianceData();
      setModalVisible(false);
    } catch (error) {
      console.error('Resolution error:', error);
      message.error('خطأ في حل المخالفة');
    }
  };

  const scheduleAudit = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/finance/compliance/schedule-audit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auditType: 'full',
          scheduledDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
        }),
      });

      if (!response.ok) throw new Error('Scheduling failed');

      message.success('تم جدولة التدقيق بنجاح');
      fetchComplianceData();
    } catch (error) {
      console.error('Audit scheduling error:', error);
      message.error('خطأ في جدولة التدقيق');
    }
  };

  // ===== Effects =====
  useEffect(() => {
    fetchComplianceData();
  }, [dateRange]);

  // ===== Data Preparation =====
  const complianceTrend = complianceData.map((item) => ({
    date: dayjs(item.date).format('DD/MM'),
    compliant: item.compliant,
    violating: item.violating,
    complianceRate: item.complianceRate,
  }));

  const violationsByCategory = violations.reduce((acc, v) => {
    const existing = acc.find(item => item.name === v.category);
    if (existing) existing.count += 1;
    else acc.push({ name: v.category, count: 1 });
    return acc;
  }, []);

  // ===== Table Columns =====
  const violationColumns = [
    {
      title: 'الوصف',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'القانون/المعيار',
      dataIndex: 'regulation',
      key: 'regulation',
    },
    {
      title: 'الخطورة',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => {
        let color = 'default';
        if (severity === 'critical') color = 'red';
        else if (severity === 'high') color = 'orange';
        else if (severity === 'medium') color = 'gold';
        else color = 'green';
        return <Tag color={color}>{severity}</Tag>;
      },
    },
    {
      title: 'تاريخ الاكتشاف',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge
          status={status === 'resolved' ? 'success' : 'processing'}
          text={status === 'resolved' ? 'محلول' : 'قيد المعالجة'}
        />
      ),
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      width: 100,
      render: (_, record) => (
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
      ),
    },
  ];

  const auditColumns = [
    {
      title: 'التاريخ والوقت',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (time) => dayjs(time).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'النوع',
      dataIndex: 'eventType',
      key: 'eventType',
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: 'المستخدم',
      dataIndex: 'userId',
      key: 'userId',
    },
    {
      title: 'الوصف',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'النتيجة',
      dataIndex: 'result',
      key: 'result',
      render: (result) => (
        <Badge
          status={result === 'success' ? 'success' : 'error'}
          text={result}
        />
      ),
    },
  ];

  // ===== Render =====
  return (
    <div style={{ padding: '24px', direction: 'rtl' }}>
      <h1>✅ لوحة الامتثال والحوكمة</h1>

      {/* Alert */}
      {stats.criticalViolations > 0 && (
        <Alert
          message="تنبيه حرج"
          description={`${stats.criticalViolations} مخالفات حرجة تتطلب معالجة فوريّة`}
          type="error"
          showIcon
          icon={<ExclamationOutlined />}
          style={{ marginBottom: 24 }}
          closable
        />
      )}

      {/* Header Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="معدل الامتثال"
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
              title="إجمالي القواعس"
              value={stats.totalRules}
              prefix={<CheckOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="المخالفات الحرجة"
              value={stats.criticalViolations}
              prefix={<ExclamationOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="متوسط إجمالي الحل"
              value={stats.avgResolutionTime}
              suffix="يوم"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Stats Card */}
      <Card style={{ marginBottom: 24, background: '#f0f5ff' }}>
        <Row gutter={24}>
          <Col xs={24} md={8}>
            <Progress
              type="circle"
              percent={parseFloat(stats.complianceRate)}
              format={() => `${stats.complianceRate}%`}
            />
          </Col>
          <Col xs={24} md={16}>
            <Row gutter={16}>
              <Col xs={12} sm={8}>
                <Statistic
                  title="قواعد متوافقة"
                  value={stats.compliantRules}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="قواعس منتهكة"
                  value={stats.violatingRules}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="آخر تدقيق"
                  value={stats.lastAuditDate ? dayjs(stats.lastAuditDate).fromNow() : 'لم يتم'}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Controls */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button
              type="primary"
              block
              onClick={fetchComplianceData}
              loading={loading}
              icon={<ReloadOutlined />}
            >
              تحديث البيانات
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button
              block
              onClick={scheduleAudit}
              icon={<CheckCircleOutlined />}
            >
              جدولة تدقيق
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="اتجاه الامتثال">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={complianceTrend}>
                <defs>
                  <linearGradient id="colorCompliant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorViolating" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="compliant"
                  stroke="#52c41a"
                  fillOpacity={1}
                  fill="url(#colorCompliant)"
                  name="متوافقة"
                />
                <Area
                  type="monotone"
                  dataKey="violating"
                  stroke="#ff4d4f"
                  fillOpacity={1}
                  fill="url(#colorViolating)"
                  name="منتهكة"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="المخالفات حسب الفئة">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={violationsByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card
            title="المخالفات والمشاكل"
            extra={
              <div>
                <Button
                  icon={<FileExcelOutlined />}
                  size="small"
                  style={{ marginRight: 8 }}
                >
                  Excel
                </Button>
                <Button icon={<FilePdfOutlined />} size="small">
                  PDF
                </Button>
              </div>
            }
          >
            {violations.length === 0 && !loading ? (
              <Empty description="لا توجد مخالفات" />
            ) : (
              <Table
                columns={violationColumns}
                dataSource={violations}
                loading={loading}
                rowKey="id"
                pagination={{
                  pageSize: 5,
                  showTotal: (total) => `إجمالي: ${total} مخالفة`,
                }}
                size="small"
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="سجل التدقيق">
            {auditEvents.length === 0 && !loading ? (
              <Empty description="لا توجد أحداث" />
            ) : (
              <Timeline
                items={auditEvents.slice(0, 10).map(event => ({
                  children: (
                    <div>
                      <p>
                        <strong>{event.eventType}</strong> -{' '}
                        {dayjs(event.timestamp).format('HH:mm DD/MM')}
                      </p>
                      <p>{event.description}</p>
                      <small>{event.userId}</small>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Violation Detail Modal */}
      <Modal
        title="تفاصيل المخالفة"
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
              حل المخالفة
            </Button>
          ),
        ]}
        width={700}
      >
        {selectedViolation && (
          <Collapse
            items={[
              {
                key: '1',
                label: 'التفاصيل الأساسية',
                children: (
                  <div>
                    <p>
                      <strong>الوصف:</strong> {selectedViolation.description}
                    </p>
                    <p>
                      <strong>القانون/المعيار:</strong>{' '}
                      {selectedViolation.regulation}
                    </p>
                    <p>
                      <strong>الفئة:</strong> {selectedViolation.category}
                    </p>
                    <p>
                      <strong>تاريخ الاكتشاف:</strong>{' '}
                      {dayjs(selectedViolation.createdAt).format(
                        'DD/MM/YYYY HH:mm'
                      )}
                    </p>
                  </div>
                ),
              },
              {
                key: '2',
                label: 'الإجراءات المطلوبة',
                children: (
                  <List
                    dataSource={selectedViolation.requiredActions || []}
                    renderItem={(action, idx) => (
                      <List.Item key={idx}>
                        <span>{action}</span>
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default ComplianceDashboard;
