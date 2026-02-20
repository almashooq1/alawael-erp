/**
 * Training Recommendations Component - توصيات التدريب
 */

import React, { useState, useEffect } from 'react';
import { Card, List, Button, Tag, Modal, Form, Input, DatePicker, Select, message, Spin, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const TrainingRecommendations = ({ driverId }) => {
  const [loading, setLoading] = useState(false);
  const [certifications, setCertifications] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const certificationOptions = [
    { label: 'Basic Driver Training', value: 'Basic Driver Training' },
    { label: 'Advanced Driving', value: 'Advanced Driving' },
    { label: 'Defensive Driving', value: 'Defensive Driving' },
    { label: 'Passenger Safety', value: 'Passenger Safety' },
    { label: 'Cargo Handling', value: 'Cargo Handling' },
    { label: 'Hazmat Transport', value: 'Hazmat Transport' },
    { label: 'CPR/First Aid', value: 'CPR/First Aid' },
    { label: 'Vehicle Maintenance', value: 'Vehicle Maintenance' },
    { label: 'GPS Navigation', value: 'GPS Navigation' },
    { label: 'Customer Service', value: 'Customer Service' },
  ];

  useEffect(() => {
    fetchCertifications();
  }, [driverId]);

  const fetchCertifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/drivers/${driverId}`);
      setCertifications(response.data.data.certifications || []);
    } catch (error) {
      message.error('فشل في تحميل الشهادات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCertification = async (values) => {
    try {
      await axios.post(`/api/drivers/${driverId}/certifications`, {
        name: values.name,
        issueDate: values.issueDate?.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate?.format('YYYY-MM-DD'),
        certificateNumber: values.certificateNumber,
        provider: values.provider,
      });
      message.success('تم إضافة الشهادة بنجاح');
      form.resetFields();
      setModalVisible(false);
      fetchCertifications();
    } catch (error) {
      message.error('فشل في إضافة الشهادة');
      console.error(error);
    }
  };

  const isCertificateActive = (cert) => {
    if (!cert.expiryDate) return true;
    return new Date(cert.expiryDate) > new Date();
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="training-recommendations">
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card
              title="الشهادات الحالية"
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setModalVisible(true)}
                >
                  إضافة شهادة
                </Button>
              }
            >
              {certifications.length === 0 ? (
                <p style={{ color: '#999' }}>لا توجد شهادات سجلة</p>
              ) : (
                <List
                  dataSource={certifications}
                  renderItem={(cert) => {
                    const isActive = isCertificateActive(cert);
                    const daysLeft = cert.expiryDate ? getDaysUntilExpiry(cert.expiryDate) : null;

                    return (
                      <List.Item>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                                {cert.name}
                                {isActive ? (
                                  <Tag color="green" style={{ marginLeft: 8 }}>
                                    نشطة
                                  </Tag>
                                ) : (
                                  <Tag color="red" style={{ marginLeft: 8 }}>
                                    منتهية
                                  </Tag>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: '#666' }}>
                                {cert.provider && <span>المزود: {cert.provider} | </span>}
                                {cert.certificateNumber && <span>التسلسل: {cert.certificateNumber}</span>}
                              </div>
                              {cert.expiryDate && (
                                <div style={{ fontSize: 12, color: daysLeft < 30 ? '#ff7a45' : '#666', marginTop: 4 }}>
                                  {daysLeft > 0
                                    ? `ينتهي في ${daysLeft} يوم`
                                    : 'منتهية الصلاحية'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          </Col>

          {/* التوصيات الموصى بها */}
          <Col xs={24}>
            <Card title="الشهادات الموصى بها">
              <List
                dataSource={certificationOptions}
                renderItem={(item) => {
                  const hasCert = certifications.some((c) => c.name === item.value);
                  return (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            {item.label}
                            {hasCert ? (
                              <Tag color="green" style={{ marginLeft: 8 }}>
                                مكتسبة
                              </Tag>
                            ) : (
                              <Tag color="blue" style={{ marginLeft: 8 }}>
                                موصى بها
                              </Tag>
                            )}
                          </span>
                          {!hasCert && (
                            <Button
                              size="small"
                              onClick={() => {
                                form.setFieldsValue({ name: item.value });
                                setModalVisible(true);
                              }}
                            >
                              إضافة
                            </Button>
                          )}
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* نموذج إضافة الشهادة */}
      <Modal
        title="إضافة شهادة جديدة"
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddCertification}
        >
          <Form.Item
            name="name"
            label="اسم الشهادة"
            rules={[{ required: true, message: 'أدخل اسم الشهادة' }]}
          >
            <Select
              placeholder="اختر الشهادة"
              options={certificationOptions}
            />
          </Form.Item>

          <Form.Item
            name="provider"
            label="جهة الإصدار"
            rules={[{ required: true, message: 'أدخل جهة الإصدار' }]}
          >
            <Input placeholder="اسم الجهة" />
          </Form.Item>

          <Form.Item
            name="certificateNumber"
            label="رقم الشهادة"
          >
            <Input placeholder="رقم الشهادة" />
          </Form.Item>

          <Form.Item
            name="issueDate"
            label="تاريخ الإصدار"
            rules={[{ required: true, message: 'اختر تاريخ الإصدار' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="expiryDate"
            label="تاريخ انتهاء الصلاحية"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
              إلغاء
            </Button>
            <Button type="primary" htmlType="submit">
              حفظ
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TrainingRecommendations;
