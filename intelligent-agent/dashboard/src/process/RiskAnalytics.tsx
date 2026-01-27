import React from 'react';
import { Card, Row, Col } from 'antd';
import { Pie, Bar } from '@ant-design/charts';

interface RiskAnalyticsProps {
  risks: any[];
}

const RiskAnalytics: React.FC<RiskAnalyticsProps> = ({ risks }) => {
  // توزيع حسب التصنيف
  const categoryData = Object.entries(
    risks.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, value]) => ({ type, value }));

  // توزيع حسب الحالة
  const statusData = Object.entries(
    risks.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, value]) => ({ type, value }));

  // توزيع حسب درجة المخاطر
  const scoreData = [
    { type: 'منخفضة', value: risks.filter(r => r.riskScore < 8).length },
    { type: 'متوسطة', value: risks.filter(r => r.riskScore >= 8 && r.riskScore < 15).length },
    { type: 'مرتفعة', value: risks.filter(r => r.riskScore >= 15).length },
  ];

  return (
    <Card title="تحليلات المخاطر" style={{marginBottom:24}}>
      <Row gutter={24}>
        <Col span={8}>
          <Pie data={categoryData} angleField="value" colorField="type" legend={{position:'bottom'}} title={{visible:true,text:'حسب التصنيف'}} />
        </Col>
        <Col span={8}>
          <Pie data={statusData} angleField="value" colorField="type" legend={{position:'bottom'}} title={{visible:true,text:'حسب الحالة'}} />
        </Col>
        <Col span={8}>
          <Bar data={scoreData} xField="value" yField="type" seriesField="type" legend={{position:'bottom'}} title={{visible:true,text:'حسب درجة المخاطر'}} />
        </Col>
      </Row>
    </Card>
  );
};

export default RiskAnalytics;
