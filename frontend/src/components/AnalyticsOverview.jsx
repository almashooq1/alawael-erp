/**
 * Analytics Overview Component
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, message, Statistic, Chart } from 'antd';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const AnalyticsOverview = ({ driverId }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [driverId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/drivers/${driverId}/performance`);
      setData(response.data.data);
    } catch (error) {
      message.error('فشل في تحميل التحليلات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const performanceData = [
    {
      name: 'الأمان',
      value: data?.performance.safetyScore || 0,
    },
    {
      name: 'الموثوقية',
      value: data?.performance.reliabilityScore || 0,
    },
    {
      name: 'خدمة العملاء',
      value: data?.performance.customerServiceScore || 0,
    },
    {
      name: 'الوقود',
      value: data?.performance.fuelEfficiencyScore || 0,
    },
    {
      name: 'الصيانة',
      value: data?.performance.maintenanceScore || 0,
    },
    {
      name: 'الحضور',
      value: data?.performance.attendanceScore || 0,
    },
  ];

  return (
    <Spin spinning={loading}>
      {data && (
        <div className="analytics-overview">
          <Row gutter={[16, 16]}>
            {/* مخطط الأداء */}
            <Col xs={24} sm={24} md={12}>
              <Card title="درجات الأداء">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* الإحصائيات الأساسية */}
            <Col xs={24} sm={24} md={12}>
              <Card title="الملخص">
                <Row gutter={[16, 16]}>
                  <Col xs={12}>
                    <Statistic
                      title="نسبة الإكمال"
                      value={data.statistics.totalTrips > 0 ? ((data.statistics.completedTrips / data.statistics.totalTrips) * 100).toFixed(1) : 0}
                      suffix="%"
                    />
                  </Col>
                  <Col xs={12}>
                    <Statistic
                      title="معدل الانتهاكات"
                      value={data.violations.total}
                      valueStyle={{ color: data.violations.total > 0 ? '#ff4d4f' : '#52c41a' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* الإحصائيات التفصيلية */}
          <Card title="الإحصائيات التفصيلية" style={{ marginTop: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="متوسط التقييم"
                  value={data.statistics.averagePassengerRating.toFixed(1)}
                  suffix="/5"
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="الرحلات المكتملة"
                  value={data.statistics.completedTrips}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="إجمالي ساعات العمل"
                  value={Math.round(data.statistics.totalHoursWorked)}
                />
              </Col>
            </Row>
          </Card>
        </div>
      )}
    </Spin>
  );
};

export default AnalyticsOverview;
