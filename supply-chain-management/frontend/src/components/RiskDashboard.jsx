/**
 * RiskDashboard Component
 * لوحة إدارة المخاطر المالية
 * 
 * Features:
 * - تقييم المخاطر
 * - مصفوفة المخاطر
 * - مؤشرات المخاطر
 * - التحذيرات والتنبيهات
 * - خطط التخفيف
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
  Progress,
  Alert,
  Tag,
  Modal,
  List,
  message,
  Empty,
  Tooltip,
  Badge,
} from 'antd';
import {
  AlertOutlined,
  WarningOutlined,
  ExclamationOutlined,
  CheckCircleOutlined,
  TrendingUpOutlined,
  Download,
  FileExcelOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import {
  ScatterChart,
  Scatter,
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
  Cell,
} from 'recharts';
import dayjs from 'dayjs';

const RiskDashboard = () => {
  // ===== State Management =====
  const [risks, setRisks] = useState([]);
  const [riskMetrics, setRiskMetrics] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');
  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    riskScore: 0,
    overallHealth: 'Good',
  });

  // ===== API Calls =====
  const fetchRisks = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/finance/risk/assessment`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch risk data');

      const data = await response.json();
      setRisks(data.data.risks || []);
      calculateStats(data.data.risks || []);
      setRiskMetrics(data.data.metrics || {});
    } catch (error) {
      console.error('Error fetching risks:', error);
      message.error('خطأ في تحميل بيانات المخاطر');
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateStats = (data) => {
    const stats = {
      critical: data.filter(r => r.severity === 'critical').length,
      high: data.filter(r => r.severity === 'high').length,
      medium: data.filter(r => r.severity === 'medium').length,
      low: data.filter(r => r.severity === 'low').length,
      riskScore: calculateRiskScore(data),
      overallHealth: determineHealth(calculateRiskScore(data)),
    };
    setStats(stats);
  };

  const calculateRiskScore = (data) => {
    let score = 0;
    data.forEach(risk => {
      const probability = risk.probability || 0;
      const impact = risk.impact || 0;
      const riskValue = (probability * impact) / 100;
      score += riskValue;
    });
    return Math.min(100, score / Math.max(1, data.length));
  };

  const determineHealth = (score) => {
    if (score >= 75) return 'Critical';
    if (score >= 50) return 'Poor';
    if (score >= 25) return 'Fair';
    return 'Good';
  };

  const mitigateRisk = async (riskId, action) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/finance/risk/${riskId}/mitigate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error('Mitigation failed');

      message.success('تم تطبيق إجراء التخفيف بنجاح');
      fetchRisks();
      setModalVisible(false);
    } catch (error) {
      console.error('Mitigation error:', error);
      message.error('خطأ في تطبيق الإجراء');
    }
  };

  const exportData = async (format) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/finance/risk/export?format=${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `risk-report.${format}`;
      a.click();
      message.success(`تم التصدير بصيغة ${format}`);
    } catch (error) {
      console.error('Export error:', error);
      message.error('خطأ في التصدير');
    }
  };

  // ===== Effects =====
  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  // ===== Data Preparation =====
  const severityData = [
    { name: 'حرج', value: stats.critical, fill: '#ff4d4f' },
    { name: 'عالي', value: stats.high, fill: '#fa8c16' },
    { name: 'متوسط', value: stats.medium, fill: '#faad14' },
    { name: 'منخفض', value: stats.low, fill: '#52c41a' },
  ];

  const riskMatrixData = risks.map(risk => ({
    ...risk,
    riskScore: (risk.probability * risk.impact) / 100,
  }));

  const trendData = risks
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-10)
    .map((r, idx) => ({
      month: dayjs(r.createdAt).format('MMM'),
      riskIndex: (r.probability * r.impact) / 100,
      id: r.id,
    }));

  const filteredRisks = riskFilter === 'all' 
    ? risks 
    : risks.filter(r => r.severity === riskFilter);

  // ===== Table Columns =====
  const columns = [
    {
      title: 'المخاطرة',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'الفئة',
      dataIndex: 'category',
      key: 'category',
      render: (category) => <Tag>{category}</Tag>,
    },
    {
      title: 'الاحتمالية',
      dataIndex: 'probability',
      key: 'probability',
      render: (prob) => (
        <Tooltip title={`${prob}%`}>
          <Progress type="circle" percent={prob} width={50} />
        </Tooltip>
      ),
    },
    {
      title: 'التأثير',
      dataIndex: 'impact',
      key: 'impact',
      render: (impact) => (
        <Tooltip title={`${impact}%`}>
          <Progress type="circle" percent={impact} width={50} />
        </Tooltip>
      ),
    },
    {
      title: 'الخطورة',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => {
        let color = 'default';
        let icon = null;
        if (severity === 'critical') {
          color = 'red';
          icon = <AlertOutlined />;
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
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          identified: { text: 'معروفة', color: 'blue' },
          assessed: { text: 'مقيمة', color: 'orange' },
          mitigating: { text: 'تحت التخفيف', color: 'gold' },
          controlled: { text: 'مراقبة', color: 'green' },
        };
        const config = statusConfig[status] || statusConfig.identified;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            setSelectedRisk(record);
            setModalVisible(true);
          }}
        >
          التفاصيل
        </Button>
      ),
    },
  ];

  // ===== Render =====
  return (
    <div style={{ padding: '24px', direction: 'rtl' }}>
      <h1>⚠️ لوحة إدارة المخاطر المالية</h1>

      {/* Alert Section */}
      {stats.critical > 0 && (
        <Alert
          message="تنبيه حرج"
          description={`هناك ${stats.critical} مخاطرة حرجة تتطلب انتباهاً فوريّاً`}
          type="error"
          icon={<AlertOutlined />}
          showIcon
          style={{ marginBottom: 24 }}
          closable
        />
      )}

      {/* Health Status */}
      <Card style={{ marginBottom: 24, background: '#f0f5ff' }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={6}>
            <Statistic
              title="صحة النظام"
              value={stats.overallHealth}
              valueStyle={{
                color:
                  stats.overallHealth === 'Good'
                    ? '#52c41a'
                    : stats.overallHealth === 'Fair'
                    ? '#faad14'
                    : stats.overallHealth === 'Poor'
                    ? '#fa8c16'
                    : '#ff4d4f',
              }}
            />
          </Col>
          <Col xs={24} md={18}>
            <Progress
              percent={100 - stats.riskScore}
              status={
                stats.overallHealth === 'Good'
                  ? 'success'
                  : stats.overallHealth === 'Fair'
                  ? 'normal'
                  : 'exception'
              }
              format={() => `درجة المخاطر: ${stats.riskScore.toFixed(1)}/100`}
              strokeColor={{
                '0%': '#52c41a',
                '50%': '#faad14',
                '100%': '#ff4d4f',
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="مخاطر حرجة"
              value={stats.critical}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="مخاطر عالية"
              value={stats.high}
              prefix={<ExclamationOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="مخاطر متوسطة"
              value={stats.medium}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="مخاطر منخفضة"
              value={stats.low}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="توزيع المخاطر">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#1890ff">
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="مصفوفة المخاطر">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="probability" name="الاحتمالية" />
                <YAxis type="number" dataKey="impact" name="التأثير" />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter
                  name="المخاطر"
                  data={risks}
                  fill="#1890ff"
                  onClick={(data) => {
                    setSelectedRisk(data.payload);
                    setModalVisible(true);
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Select
              value={riskFilter}
              onChange={setRiskFilter}
              style={{ width: '100%' }}
              placeholder="تصفية حسب الخطورة"
              options={[
                { label: 'الكل', value: 'all' },
                { label: 'حرج', value: 'critical' },
                { label: 'عالي', value: 'high' },
                { label: 'متوسط', value: 'medium' },
                { label: 'منخفض', value: 'low' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button
              type="primary"
              block
              onClick={fetchRisks}
              loading={loading}
            >
              تحديث البيانات
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button.Group>
              <Button
                icon={<FileExcelOutlined />}
                onClick={() => exportData('excel')}
              >
                Excel
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => exportData('pdf')}
              >
                PDF
              </Button>
            </Button.Group>
          </Col>
        </Row>
      </Card>

      {/* Risks Table */}
      <Card title="تفاصيل المخاطر">
        {filteredRisks.length === 0 && !loading ? (
          <Empty description="لا توجد مخاطر" />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredRisks}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `إجمالي: ${total} مخاطرة`,
            }}
          />
        )}
      </Card>

      {/* Risk Detail Modal */}
      <Modal
        title="تفاصيل المخاطرة"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            إغلاق
          </Button>,
          <Button
            key="mitigate"
            type="primary"
            onClick={() => mitigateRisk(selectedRisk?.id, 'apply_controls')}
          >
            تطبيق التحكم
          </Button>,
        ]}
        width={700}
      >
        {selectedRisk && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} md={12}>
                <p>
                  <strong>المخاطرة:</strong> {selectedRisk.name}
                </p>
                <p>
                  <strong>الفئة:</strong> <Tag>{selectedRisk.category}</Tag>
                </p>
                <p>
                  <strong>الوصف:</strong> {selectedRisk.description}
                </p>
              </Col>
              <Col xs={24} md={12}>
                <p>
                  <strong>الاحتمالية:</strong> {selectedRisk.probability}%
                </p>
                <p>
                  <strong>التأثير:</strong> {selectedRisk.impact}%
                </p>
                <p>
                  <strong>درجة المخاطرة:</strong>{' '}
                  {((selectedRisk.probability * selectedRisk.impact) / 100).toFixed(2)}
                </p>
              </Col>
            </Row>

            <h4>الإجراءات المقترحة</h4>
            <List
              dataSource={selectedRisk.mitigationActions || []}
              renderItem={(action) => (
                <List.Item>
                  <List.Item.Meta title={action.name} description={action.description} />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RiskDashboard;
