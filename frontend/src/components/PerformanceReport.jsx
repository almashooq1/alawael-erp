/**
 * Performance Report Component
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spin, message, Statistic, Progress, Tag, Divider } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const PerformanceReport = ({ driverId }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [driverId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/drivers/${driverId}/performance`);
      setReport(response.data.data);
    } catch (error) {
      message.error('فشل في تحميل التقرير');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!report) {
    return <Spin spinning={loading} />;
  }

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
    if (trend === 'declining') return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
    return <LineChartOutlined style={{ color: '#1890ff' }} />;
  };

  const getTrendLabel = (trend) => {
    const labels = {
      improving: 'تحسن',
      declining: 'تدهور',
      stable: 'مستقر',
    };
    return labels[trend] || '—';
  };

  const getTrendColor = (trend) => {
    const colors = {
      improving: 'green',
      declining: 'red',
      stable: 'blue',
    };
    return colors[trend] || 'default';
  };

  return (
    <Spin spinning={loading}>
      <div className="performance-report">
        {/* رأس التقرير */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="الدرجة الكلية"
                value={report.performance.overallRating}
                suffix="/5"
                valueStyle={{ fontSize: '32px', fontWeight: 'bold' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="عدد الرحلات"
                value={report.statistics.totalTrips}
                suffix="رحلة"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="متوسط التقييم"
                value={report.statistics.averagePassengerRating}
                suffix="/5"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="الاتجاه"
                value={getTrendLabel(report.predictions.performanceTrend)}
                prefix={getTrendIcon(report.predictions.performanceTrend)}
              />
            </Col>
          </Row>
        </Card>

        {/* درجات الأداء التفصيلية */}
        <Card title="درجات الأداء التفصيلية" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            {[
              { label: 'درجة الأمان', score: report.performance.safetyScore },
              { label: 'الموثوقية', score: report.performance.reliabilityScore },
              { label: 'خدمة العملاء', score: report.performance.customerServiceScore },
              { label: 'كفاءة الوقود', score: report.performance.fuelEfficiencyScore },
              { label: 'الصيانة', score: report.performance.maintenanceScore },
              { label: 'الحضور', score: report.performance.attendanceScore },
            ].map((item, index) => (
              <Col xs={24} sm={12} key={index}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>{item.label}</div>
                  <Progress
                    percent={item.score}
                    strokeColor={item.score >= 80 ? '#52c41a' : '#faad14'}
                    format={(percent) => `${percent}%`}
                  />
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        {/* الإحصائيات */}
        <Card title="الإحصائيات" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="الرحلات المكتملة"
                value={report.statistics.completedTrips}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="ساعات العمل"
                value={report.statistics.totalHoursWorked.toFixed(1)}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="إجمالي المسافة"
                value={report.statistics.totalKilometersDriven.toFixed(1)}
                suffix="كم"
              />
            </Col>
          </Row>
        </Card>

        {/* الانتهاكات */}
        <Card title="ملخص الانتهاكات" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="إجمالي الانتهاكات"
                value={report.violations.total}
                valueStyle={{ color: report.violations.total > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="تجاوز السرعة" value={report.violations.speeding} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="الحوادث" value={report.violations.accidents} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="انتهاكات أخرى" value={report.violations.other} />
            </Col>
          </Row>
        </Card>

        {/* التوصيات */}
        {report.predictions.trainingRecommendations.length > 0 && (
          <Card
            title={
              <>
                <span>التوصيات والتطويرات</span>
                <Tag
                  color={getTrendColor(report.predictions.performanceTrend)}
                  style={{ marginLeft: 8 }}
                >
                  {getTrendLabel(report.predictions.performanceTrend)}
                </Tag>
              </>
            }
            style={{ marginBottom: 16 }}
          >
            <ul style={{ paddingLeft: 20 }}>
              {report.predictions.trainingRecommendations.map((rec, index) => (
                <li key={index} style={{ marginBottom: 8 }}>
                  {rec}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* العوامل المخاطرة والقوات */}
        <Row gutter={[16, 16]}>
          {report.predictions.riskFactors.length > 0 && (
            <Col xs={24} sm={12}>
              <Card
                title="عوامل المخاطرة"
                style={{ borderLeftColor: '#ff4d4f', borderLeft: '4px solid #ff4d4f' }}
              >
                <ul style={{ paddingLeft: 20 }}>
                  {report.predictions.riskFactors.map((factor, index) => (
                    <li key={index} style={{ marginBottom: 8, color: 'ff4d4f' }}>
                      {factor}
                    </li>
                  ))}
                </ul>
              </Card>
            </Col>
          )}

          {report.predictions.strengths.length > 0 && (
            <Col xs={24} sm={12}>
              <Card
                title="نقاط القوة"
                style={{ borderLeftColor: '#52c41a', borderLeft: '4px solid #52c41a' }}
              >
                <ul style={{ paddingLeft: 20 }}>
                  {report.predictions.strengths.map((strength, index) => (
                    <li key={index} style={{ marginBottom: 8, color: '#52c41a' }}>
                      {strength}
                    </li>
                  ))}
                </ul>
              </Card>
            </Col>
          )}
        </Row>
      </div>
    </Spin>
  );
};

export default PerformanceReport;
