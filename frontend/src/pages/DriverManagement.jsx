/**
 * Driver Management Main Dashboard
 * لوحة تحكم إدارة السائقين الرئيسية
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Table,
  Tag,
  Statistic,
  Progress,
  Tabs,
  Spin,
  message,
  Segmented,
  Input,
  Space,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LineChartOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  TrophyOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import DriverForm from './DriverForm';
import DriverDetailsModal from './DriverDetailsModal';
import PerformanceReport from './PerformanceReport';
import ViolationList from './ViolationList';
import TrainingRecommendations from './TrainingRecommendations';
import AnalyticsOverview from './AnalyticsOverview';
import './DriverManagement.css';

const DriverManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [tabKey, setTabKey] = useState('overview');
  const [analytics, setAnalytics] = useState(null);

  // جلب السائقين
  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 50,
      };

      if (searchText) {
        params.search = searchText;
      }

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const response = await axios.get('/api/drivers', { params });

      setDrivers(response.data.data.drivers || []);
    } catch (error) {
      message.error('فشل في تحميل السائقين');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // جلب الإحصائيات
  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/api/drivers/analytics/overview');
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchAnalytics();
  }, [searchText, filterStatus]);

  // فتح نموذج الإنشاء
  const openCreateModal = () => {
    setSelectedDriver(null);
    setIsEditing(false);
    setModalVisible(true);
  };

  // فتح نموذج التعديل
  const openEditModal = (driver) => {
    setSelectedDriver(driver);
    setIsEditing(true);
    setModalVisible(true);
  };

  // حفظ السائق
  const handleSaveDriver = async (formData) => {
    try {
      if (isEditing) {
        await axios.put(`/api/drivers/${selectedDriver._id}`, formData);
        message.success('تم تحديث السائق بنجاح');
      } else {
        await axios.post('/api/drivers', formData);
        message.success('تم إنشاء السائق بنجاح');
      }

      setModalVisible(false);
      fetchDrivers();
    } catch (error) {
      message.error('فشل في حفظ السائق');
      console.error(error);
    }
  };

  // حذف السائق
  const handleDeleteDriver = async (id) => {
    Modal.confirm({
      title: 'تأكيد الحذف',
      content: 'هل أنت متأكد من حذف هذا السائق؟',
      okText: 'نعم',
      cancelText: 'إلغاء',
      danger: true,
      onOk: async () => {
        try {
          await axios.delete(`/api/drivers/${id}`, {
            data: { reason: 'Deactivated by admin' },
          });
          message.success('تم حذف السائق بنجاح');
          fetchDrivers();
        } catch (error) {
          message.error('فشل في حذف السائق');
          console.error(error);
        }
      },
    });
  };

  // عرض التفاصيل
  const handleViewDetails = (driver) => {
    setSelectedDriver(driver);
    setDetailsVisible(true);
  };

  // عرض التقرير الشامل
  const handleViewReport = (driver) => {
    setSelectedDriver(driver);
    setDrawerVisible(true);
    setTabKey('performance');
  };

  // جدول الأعمدة
  const columns = [
    {
      title: 'الاسم',
      dataIndex: 'firstName',
      key: 'name',
      render: (text, record) => `${record.firstName} ${record.lastName}`,
      width: 150,
    },
    {
      title: 'رقم الموظف',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 120,
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          active: 'green',
          on_leave: 'gold',
          suspended: 'red',
          inactive: 'gray',
        };
        const labels = {
          active: 'نشط',
          on_leave: 'في إجازة',
          suspended: 'موقوف',
          inactive: 'غير نشط',
        };
        return <Tag color={colors[status]}>{labels[status]}</Tag>;
      },
      width: 100,
    },
    {
      title: 'درجة الأداء',
      dataIndex: 'performance',
      key: 'rating',
      render: (performance) => {
        if (!performance) return '—';
        return (
          <div className="rating-display">
            <Progress
              type="circle"
              percent={Math.round(performance.overallRating * 20)}
              width={50}
              strokeColor={{
                '0%': '#ff4d4f',
                '100%': '#52c41a',
              }}
            />
            <span className="rating-text">{performance.overallRating.toFixed(1)}/5</span>
          </div>
        );
      },
      width: 120,
    },
    {
      title: 'درجة الأمان',
      dataIndex: 'performance',
      key: 'safety',
      render: (performance) => {
        if (!performance) return '—';
        return (
          <Progress
            percent={performance.safetyScore}
            size="small"
            strokeColor={performance.safetyScore >= 80 ? '#52c41a' : '#faad14'}
          />
        );
      },
      width: 120,
    },
    {
      title: 'عدد الرحلات',
      dataIndex: 'statistics',
      key: 'trips',
      render: (statistics) => statistics?.totalTrips || 0,
      width: 100,
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            عرض
          </Button>
          <Button
            icon={<LineChartOutlined />}
            size="small"
            onClick={() => handleViewReport(record)}
          >
            تقرير
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            تعديل
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteDriver(record._id)}
          >
            حذف
          </Button>
        </Space>
      ),
      width: 250,
    },
  ];

  return (
    <div className="driver-management-container">
      {/* رأس الصفحة */}
      <div className="page-header">
        <div className="header-content">
          <h1>
            <TeamOutlined /> إدارة السائقين
          </h1>
          <p>نظام شامل لإدارة وتقييم السائقين بذكاء اصطناعي متقدم</p>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openCreateModal}>
          إضافة سائق جديد
        </Button>
      </div>

      {/* الإحصائيات العامة */}
      {analytics && (
        <Row gutter={[16, 16]} className="statistics-row">
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="إجمالي السائقين"
                value={analytics.totalDrivers}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="السائقين النشطين"
                value={analytics.activeDrivers}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="في الإجازة"
                value={analytics.onLeaveDrivers}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="السائقين الموقوفين"
                value={analytics.suspendedDrivers}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<AlertOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* الفلاتر */}
      <Card className="filters-card">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={16}>
            <Input.Search
              placeholder="البحث عن السائق..."
              allowClear
              onSearch={(value) => setSearchText(value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Segmented
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { label: 'الكل', value: 'all' },
                { label: 'نشط', value: 'active' },
                { label: 'إجازة', value: 'on_leave' },
                { label: 'موقوف', value: 'suspended' },
              ]}
              block
            />
          </Col>
        </Row>
      </Card>

      {/* جدول السائقين */}
      <Card className="drivers-table-card">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={drivers}
            rowKey="_id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `إجمالي ${total} سائق`,
            }}
            scroll={{ x: 1200 }}
          />
        </Spin>
      </Card>

      {/* نموذج إنشاء/تعديل السائق */}
      <Modal
        title={isEditing ? 'تعديل السائق' : 'إضافة سائق جديد'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={900}
        footer={null}
      >
        <DriverForm
          driver={selectedDriver}
          onSave={handleSaveDriver}
          onCancel={() => setModalVisible(false)}
        />
      </Modal>

      {/* نموذج التفاصيل */}
      <DriverDetailsModal
        visible={detailsVisible}
        driver={selectedDriver}
        onClose={() => setDetailsVisible(false)}
      />

      {/* Drawer التقرير الشامل */}
      <Drawer
        title={`تقرير أداء ${selectedDriver?.fullName}`}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        width={800}
      >
        <Tabs
          activeKey={tabKey}
          onChange={setTabKey}
          items={[
            {
              key: 'performance',
              label: 'الأداء',
              children: selectedDriver && <PerformanceReport driverId={selectedDriver._id} />,
            },
            {
              key: 'violations',
              label: 'الانتهاكات',
              children: selectedDriver && <ViolationList driverId={selectedDriver._id} />,
            },
            {
              key: 'training',
              label: 'التدريب',
              children: selectedDriver && (
                <TrainingRecommendations driverId={selectedDriver._id} />
              ),
            },
            {
              key: 'analytics',
              label: 'التحليلات',
              children: selectedDriver && <AnalyticsOverview driverId={selectedDriver._id} />,
            },
          ]}
        />
      </Drawer>
    </div>
  );
};

export default DriverManagement;
