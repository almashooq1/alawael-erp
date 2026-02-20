/**
 * Violation List Component - قائمة الانتهاكات
 */

import React, { useState, useEffect } from 'react';
import { List, Card, Spin, message, Empty, Tag, Row, Col, Statistic, Button, Modal, Table } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

const ViolationList = ({ driverId }) => {
  const [violations, setViolations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addViolationModal, setAddViolationModal] = useState(false);
  const [selectedType, setSelectedType] = useState('speeding');

  useEffect(() => {
    fetchViolations();
  }, [driverId]);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/drivers/${driverId}/violations`);
      setViolations(response.data.data.violations);
    } catch (error) {
      message.error('فشل في تحميل الانتهاكات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const violationTypes = [
    {
      key: 'speedingIncidents',
      label: 'تجاوز السرعة',
      description: 'القيادة بسرعة أعلى من الحد المسموح',
      color: 'red',
    },
    {
      key: 'harshBraking',
      label: 'كبح حاد',
      description: 'الضغط الحاد على الفرامل',
      color: 'orange',
    },
    {
      key: 'harshAcceleration',
      label: 'تسارع حاد',
      description: 'التسارع الحاد غير الضروري',
      color: 'orange',
    },
    {
      key: 'distraction',
      label: 'تشتيت الانتباه',
      description: 'الانشغال والتشتيت أثناء القيادة',
      color: 'volcano',
    },
    {
      key: 'seatbeltViolations',
      label: 'عدم ربط حزام الأمان',
      description: 'عدم ارتداء حزام الأمان',
      color: 'red',
    },
    {
      key: 'trafficViolations',
      label: 'انتهاكات مرورية',
      description: 'عدم الامتثال لقوانين المرور',
      color: 'red',
    },
    {
      key: 'accidents',
      label: 'حوادث',
      description: 'حوادث أثناء القيادة',
      color: 'red',
    },
  ];

  const handleAddViolation = async (type) => {
    try {
      await axios.post(`/api/drivers/${driverId}/violations`, {
        violationType: type,
        description: 'تم تسجيل من قبل المسؤول',
        severity: 'medium',
      });
      message.success('تم تسجيل الانتهاك');
      fetchViolations();
      setAddViolationModal(false);
    } catch (error) {
      message.error('فشل في تسجيل الانتهاك');
      console.error(error);
    }
  };

  if (!violations) {
    return <Spin spinning={loading} />;
  }

  return (
    <div className="violation-list">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="إجمالي الانتهاكات"
              value={violations.totalViolations}
              valueStyle={{
                color: violations.totalViolations > 0 ? '#ff4d4f' : '#52c41a',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="تجاوز السرعة"
              value={violations.speedingIncidents}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="الحوادث"
              value={violations.accidents}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="آخر انتهاك"
              value={
                violations.lastViolationDate
                  ? new Date(violations.lastViolationDate).toLocaleDateString('ar-SA')
                  : '—'
              }
            />
          </Card>
        </Col>
      </Row>

      <Card title="تفاصيل الانتهاكات" style={{ marginBottom: 16 }}>
        {violations.totalViolations === 0 ? (
          <Empty description="لا توجد انتهاكات سجلة" />
        ) : (
          <Table
            columns={[
              {
                title: 'نوع الانتهاك',
                dataIndex: 'key',
                key: 'key',
                render: (key) => {
                  const type = violationTypes.find((t) => t.key === key);
                  return <Tag color={type?.color}>{type?.label}</Tag>;
                },
              },
              {
                title: 'الوصف',
                dataIndex: 'key',
                key: 'description',
                render: (key) => {
                  const type = violationTypes.find((t) => t.key === key);
                  return type?.description;
                },
              },
              {
                title: 'العدد',
                dataIndex: 'count',
                key: 'count',
                render: (text, record) => violations[record.key] || 0,
              },
            ]}
            dataSource={violationTypes.map((t) => ({ key: t.key }))}
            pagination={false}
            rowKey="key"
          />
        )}
      </Card>

      <Card title="إضافة انتهاك جديد">
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {violationTypes.map((type) => (
            <Button
              key={type.key}
              block
              style={{ marginBottom: 8 }}
              onClick={() => handleAddViolation(type.key)}
            >
              <span style={{ textAlign: 'left' }}>
                <Tag color={type.color}>{type.label}</Tag>
                <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
                  {type.description}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ViolationList;
