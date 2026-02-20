/**
 * Driver Form Component - نموذج السائق
 */

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  DatePicker,
  Select,
  Upload,
  Button,
  Row,
  Col,
  Card,
  Divider,
  Space,
  message,
  Tabs,
} from 'antd';
import { UploadOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const DriverForm = ({ driver, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (driver) {
      form.setFieldsValue({
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        personalPhone: driver.personalPhone,
        alternatePhone: driver.alternatePhone,
        employeeId: driver.employeeId,
        hireDate: dayjs(driver.hireDate),
        dateOfBirth: driver.dateOfBirth ? dayjs(driver.dateOfBirth) : null,
        gender: driver.gender,
        nationality: driver.nationality,
        licenseNumber: driver.licenseDetails?.licenseNumber,
        licenseType: driver.licenseDetails?.licenseType,
        licenseExpiryDate: driver.licenseDetails?.expiryDate
          ? dayjs(driver.licenseDetails.expiryDate)
          : null,
      });
    }
  }, [driver, form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const formData = {
        ...values,
        hireDate: values.hireDate?.format('YYYY-MM-DD'),
        dateOfBirth: values.dateOfBirth?.format('YYYY-MM-DD'),
        licenseExpiryDate: values.licenseExpiryDate?.format('YYYY-MM-DD'),
      };

      await onSave(formData);
    } catch (error) {
      message.error('حدث خطأ في حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'personal',
      label: 'المعلومات الشخصية',
      children: (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstName"
                label="الاسم الأول"
                rules={[{ required: true, message: 'الاسم الأول مطلوب' }]}
              >
                <Input placeholder="أدخل الاسم الأول" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="lastName"
                label="الاسم الأخير"
                rules={[{ required: true, message: 'الاسم الأخير مطلوب' }]}
              >
                <Input placeholder="أدخل الاسم الأخير" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="البريد الإلكتروني"
                rules={[
                  { required: true, message: 'البريد الإلكتروني مطلوب' },
                  { type: 'email', message: 'بريد إلكتروني غير صحيح' },
                ]}
              >
                <Input type="email" placeholder="example@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="personalPhone"
                label="رقم الهاتف الشخصي"
                rules={[{ required: true, message: 'رقم الهاتف مطلوب' }]}
              >
                <Input placeholder="+966501234567" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="alternatePhone" label="هاتف بديل">
                <Input placeholder="+966501234567" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="dateOfBirth" label="تاريخ الميلاد">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="gender" label="الجنس">
                <Select
                  placeholder="اختر الجنس"
                  options={[
                    { label: 'ذكر', value: 'male' },
                    { label: 'أنثى', value: 'female' },
                    { label: 'آخر', value: 'other' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="nationality" label="الجنسية">
                <Input placeholder="السعودية" />
              </Form.Item>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'employment',
      label: 'بيانات العمل',
      children: (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="employeeId"
                label="رقم الموظف"
                rules={[{ required: true, message: 'رقم الموظف مطلوب' }]}
              >
                <Input placeholder="EMP-12345" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="hireDate"
                label="تاريخ التوظيف"
                rules={[{ required: true, message: 'تاريخ التوظيف مطلوب' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'license',
      label: 'بيانات الرخصة',
      children: (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="licenseNumber"
                label="رقم الرخصة"
                rules={[{ required: true, message: 'رقم الرخصة مطلوب' }]}
              >
                <Input placeholder="رقم الرخصة" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="licenseType"
                label="نوع الرخصة"
                rules={[{ required: true, message: 'نوع الرخصة مطلوب' }]}
              >
                <Select
                  placeholder="اختر نوع الرخصة"
                  options={[
                    { label: 'B - سيارات خاصة', value: 'B' },
                    { label: 'C - شاحنات', value: 'C' },
                    { label: 'D - حافلات', value: 'D' },
                    { label: 'E - مركبات ثقيلة', value: 'E' },
                    { label: 'BE - مركبات وعربات', value: 'BE' },
                    { label: 'CE - شاحنات مع عربات', value: 'CE' },
                    { label: 'DE - حافلات مع عربات', value: 'DE' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="licenseExpiryDate"
                label="تاريخ انتهاء الرخصة"
                rules={[{ required: true, message: 'تاريخ الانتهاء مطلوب' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </>
      ),
    },
  ];

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      autoComplete="off"
      className="driver-form"
    >
      <Tabs items={tabItems} />

      <Divider />

      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button onClick={onCancel} icon={<CloseOutlined />}>
          إلغاء
        </Button>
        <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
          حفظ
        </Button>
      </Space>
    </Form>
  );
};

export default DriverForm;
