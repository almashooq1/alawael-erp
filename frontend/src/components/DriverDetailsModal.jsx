/**
 * Driver Details Modal - نموذج تفاصيل السائق
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Descriptions,
  Card,
  Row,
  Col,
  Progress,
  Tag,
  Divider,
  Spin,
  Badge,
  Button,
  Space,
  message,
} from 'antd';
import { FileTextOutlined, DownloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const DriverDetailsModal = ({ visible, driver, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (visible && driver) {
      fetchReport();
    }
  }, [visible, driver]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/drivers/${driver._id}/performance`);
      setReportData(response.data.data);
    } catch (error) {
      message.error('فشل في تحميل التقرير');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      // في التطبيق الفعلي، يمكن تحميل التقرير كـ PDF
      const dataStr = JSON.stringify(reportData, null, 2);
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(dataStr));
      element.setAttribute('download', `driver-report-${driver._id}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      message.success('تم تحميل التقرير');
    } catch (error) {
      message.error('فشل في تحميل التقرير');
    }
  };

  return (
    <Modal
      title={`تفاصيل السائق: ${driver?.fullName}`}
      visible={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="back" onClick={onClose}>
          إغلاق
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={downloadReport}
          disabled={!reportData}
        >
          تحميل التقرير
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        {driver && (
          <div className="driver-details">
            {/* المعلومات الأساسية */}
            <Card title="المعلومات الأساسية" size="small" className="mb-16">
              <Descriptions
                column={{ xs: 1, sm: 2, md: 4 }}
                bordered
                size="small"
              >
                <Descriptions.Item label="الاسم الكامل">
                  {driver.fullName}
                </Descriptions.Item>
                <Descriptions.Item label="رقم الموظف">
                  {driver.employeeId}
                </Descriptions.Item>
                <Descriptions.Item label="البريد الإلكتروني">
                  {driver.email}
                </Descriptions.Item>
                <Descriptions.Item label="الهاتف">
                  {driver.personalPhone}
                </Descriptions.Item>
                <Descriptions.Item label="العمر">
                  {driver.age || '—'} سنة
                </Descriptions.Item>
                <Descriptions.Item label="سنوات الخبرة">
                  {driver.experienceInYears} سنة
                </Descriptions.Item>
                <Descriptions.Item label="الحالة">
                  <Tag color={driver.status === 'active' ? 'green' : 'red'}>
                    {driver.status === 'active' ? 'نشط' : 'غير نشط'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="تاريخ التوظيف">
                  {dayjs(driver.hireDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* معلومات الرخصة */}
            <Card title="معلومات الرخصة" size="small" className="mb-16">
              <Descriptions
                column={{ xs: 1, sm: 2 }}
                bordered
                size="small"
              >
                <Descriptions.Item label="رقم الرخصة">
                  {driver.licenseDetails?.licenseNumber}
                </Descriptions.Item>
                <Descriptions.Item label="نوع الرخصة">
                  {driver.licenseDetails?.licenseType}
                </Descriptions.Item>
                <Descriptions.Item label="تاريخ الصدور">
                  {dayjs(driver.licenseDetails?.issueDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
                <Descriptions.Item label="تاريخ الانتهاء">
                  <Badge
                    status={
                      driver.daysUntilLicenseExpiry > 30
                        ? 'success'
                        : driver.daysUntilLicenseExpiry > 0
                        ? 'warning'
                        : 'error'
                    }
                    text={dayjs(driver.licenseDetails?.expiryDate).format('YYYY-MM-DD')}
                  />
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* درجات الأداء */}
            {reportData && (
              <Card title="درجات الأداء" size="small" className="mb-16">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <div className="performance-score">
                      <div className="label">درجة الأمان</div>
                      <Progress
                        type="circle"
                        percent={reportData.performance.safetyScore}
                        width={80}
                        strokeColor={
                          reportData.performance.safetyScore >= 80
                            ? '#52c41a'
                            : '#faad14'
                        }
                      />
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div className="performance-score">
                      <div className="label">درجة الموثوقية</div>
                      <Progress
                        type="circle"
                        percent={reportData.performance.reliabilityScore}
                        width={80}
                        strokeColor="#1890ff"
                      />
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div className="performance-score">
                      <div className="label">خدمة العملاء</div>
                      <Progress
                        type="circle"
                        percent={reportData.performance.customerServiceScore}
                        width={80}
                        strokeColor="#722ed1"
                      />
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div className="performance-score">
                      <div className="label">كفاءة الوقود</div>
                      <Progress
                        type="circle"
                        percent={reportData.performance.fuelEfficiencyScore}
                        width={80}
                        strokeColor="#eb2f96"
                      />
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div className="performance-score">
                      <div className="label">الصيانة</div>
                      <Progress
                        type="circle"
                        percent={reportData.performance.maintenanceScore}
                        width={80}
                        strokeColor="#13c2c2"
                      />
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div className="performance-score">
                      <div className="label">الحضور</div>
                      <Progress
                        type="circle"
                        percent={reportData.performance.attendanceScore}
                        width={80}
                        strokeColor="#fa8c16"
                      />
                    </div>
                  </Col>
                </Row>

                <Divider />

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <div className="overall-rating">
                      <span className="label">الدرجة الكلية:</span>
                      <span className="value">{reportData.performance.overallRating}/5</span>
                      <Progress
                        percent={reportData.performance.overallRating * 20}
                        status={
                          reportData.performance.overallRating >= 4
                            ? 'success'
                            : reportData.performance.overallRating >= 3
                            ? 'normal'
                            : 'exception'
                        }
                      />
                    </div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="overall-rating">
                      <span className="label">توجه الأداء:</span>
                      <Tag
                        color={
                          reportData.predictions.performanceTrend === 'improving'
                            ? 'green'
                            : reportData.predictions.performanceTrend === 'declining'
                            ? 'red'
                            : 'blue'
                        }
                      >
                        {reportData.predictions.performanceTrend === 'improving'
                          ? 'تحسن'
                          : reportData.predictions.performanceTrend === 'declining'
                          ? 'تدهور'
                          : 'مستقر'}
                      </Tag>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}

            {/* الإحصائيات */}
            {reportData && (
              <Card title="الإحصائيات" size="small" className="mb-16">
                <Descriptions
                  column={{ xs: 1, sm: 2 }}
                  bordered
                  size="small"
                >
                  <Descriptions.Item label="إجمالي الرحلات">
                    {reportData.statistics.totalTrips}
                  </Descriptions.Item>
                  <Descriptions.Item label="الرحلات المكتملة">
                    {reportData.statistics.completedTrips}
                  </Descriptions.Item>
                  <Descriptions.Item label="الرحلات الملغاة">
                    {reportData.statistics.cancelledTrips}
                  </Descriptions.Item>
                  <Descriptions.Item label="ساعات العمل">
                    {reportData.statistics.totalHoursWorked.toFixed(1)}
                  </Descriptions.Item>
                  <Descriptions.Item label="إجمالي المسافة">
                    {reportData.statistics.totalKilometersDriven.toFixed(1)} كم
                  </Descriptions.Item>
                  <Descriptions.Item label="متوسط تقييم الركاب">
                    {reportData.statistics.averagePassengerRating.toFixed(1)}/5
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {/* التوصيات والتنبيهات */}
            {reportData && reportData.predictions.trainingRecommendations.length > 0 && (
              <Card
                title="التوصيات"
                size="small"
                style={{ borderColor: '#faad14' }}
                className="mb-16"
              >
                <ul>
                  {reportData.predictions.trainingRecommendations.map(
                    (recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    )
                  )}
                </ul>
              </Card>
            )}
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default DriverDetailsModal;
