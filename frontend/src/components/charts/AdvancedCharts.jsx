/**
 * Advanced Charts Library - مكتبة رسوم بيانية متقدمة
 * مكونات قابلة لإعادة الاستخدام للرسوم البيانية المعقدة
 */

import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          bgcolor: 'white',
          p: 2,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #e0e0e0',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Typography
            key={`item-${index}`}
            variant="body2"
            sx={{ color: entry.color }}
          >
            {entry.name}: {entry.value}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

// 1. Performance Trend Chart - رسم اتجاه الأداء
export const PerformanceTrendChart = ({ data, title, height = 300 }) => {
  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#667eea" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="label" stroke="#9e9e9e" />
            <YAxis stroke="#9e9e9e" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#667eea"
              strokeWidth={3}
              fill="url(#colorPerformance)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 2. Comparison Bar Chart - رسم المقارنة
export const ComparisonBarChart = ({ data, title, height = 300 }) => {
  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="name" stroke="#9e9e9e" />
            <YAxis stroke="#9e9e9e" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="current" fill="#667eea" radius={[8, 8, 0, 0]} />
            <Bar dataKey="previous" fill="#43cea2" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 3. Skills Radar Chart - رسم المهارات
export const SkillsRadarChart = ({ data, title, height = 400 }) => {
  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={data}>
            <PolarGrid stroke="#e0e0e0" />
            <PolarAngleAxis dataKey="skill" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="المستوى الحالي"
              dataKey="value"
              stroke="#667eea"
              fill="#667eea"
              fillOpacity={0.6}
              strokeWidth={2}
            />
            <Radar
              name="الهدف المطلوب"
              dataKey="target"
              stroke="#43cea2"
              fill="#43cea2"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Legend />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 4. Multi-Line Chart - رسم متعدد الخطوط
export const MultiLineChart = ({ data, title, lines, height = 300 }) => {
  const colors = ['#667eea', '#43cea2', '#f093fb', '#ffb347'];
  
  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" stroke="#9e9e9e" />
            <YAxis stroke="#9e9e9e" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {lines.map((line, index) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name={line.name}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 5. Donut Chart - رسم دائري
export const DonutChart = ({ data, title, height = 300 }) => {
  const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9e9e9e'];
  
  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 6. Composed Chart - رسم مركب
export const ComposedPerformanceChart = ({ data, title, height = 350 }) => {
  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="month" stroke="#9e9e9e" />
            <YAxis stroke="#9e9e9e" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="average"
              fill="#667eea"
              fillOpacity={0.3}
              stroke="#667eea"
              name="المتوسط"
            />
            <Bar dataKey="attendance" fill="#43cea2" radius={[8, 8, 0, 0]} name="الحضور" />
            <Line
              type="monotone"
              dataKey="grade"
              stroke="#f093fb"
              strokeWidth={3}
              dot={{ r: 5 }}
              name="الدرجة"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 7. Heatmap-style Bar Chart - رسم شريطي بأسلوب خريطة حرارية
export const HeatmapBarChart = ({ data, title, height = 300 }) => {
  const getColor = (value) => {
    if (value >= 90) return '#4caf50';
    if (value >= 80) return '#8bc34a';
    if (value >= 70) return '#ff9800';
    if (value >= 60) return '#ff5722';
    return '#f44336';
  };
  
  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis type="number" domain={[0, 100]} stroke="#9e9e9e" />
            <YAxis type="category" dataKey="subject" stroke="#9e9e9e" width={100} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="score" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 8. Stacked Area Chart - رسم مساحي متراكم
export const StackedAreaChart = ({ data, title, height = 300 }) => {
  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorGrade1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#667eea" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="colorGrade2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#43cea2" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#43cea2" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="colorGrade3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f093fb" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f093fb" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="month" stroke="#9e9e9e" />
            <YAxis stroke="#9e9e9e" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="excellent"
              stackId="1"
              stroke="#667eea"
              fill="url(#colorGrade1)"
              name="ممتاز"
            />
            <Area
              type="monotone"
              dataKey="good"
              stackId="1"
              stroke="#43cea2"
              fill="url(#colorGrade2)"
              name="جيد"
            />
            <Area
              type="monotone"
              dataKey="average"
              stackId="1"
              stroke="#f093fb"
              fill="url(#colorGrade3)"
              name="متوسط"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const advancedCharts = {
  PerformanceTrendChart,
  ComparisonBarChart,
  SkillsRadarChart,
  MultiLineChart,
  DonutChart,
  ComposedPerformanceChart,
  HeatmapBarChart,
  StackedAreaChart,
};

export default advancedCharts;
