import React from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

interface MetricsChartProps {
  title: string;
  data: any[];
  type?: 'area' | 'bar' | 'line' | 'pie';
  dataKey?: string;
  height?: number;
}

const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  data,
  type = 'area',
  dataKey = 'value',
  height = 300,
}) => {
  const { theme } = useTheme();

  const colors = [
    theme.colors.primary[600],
    theme.colors.success.main,
    theme.colors.warning.main,
    theme.colors.error.main,
    theme.colors.info.main,
  ];

  const chartConfig = {
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
    style: {
      backgroundColor: theme.colors.surface.primary,
      borderRadius: '8px',
      padding: '16px',
    },
  };

  return (
    <div style={chartConfig}>
      <h3 style={{ color: theme.colors.text.primary, marginBottom: '16px' }}>
        {title}
      </h3>

      <ResponsiveContainer width="100%" height={height}>
        {type === 'area' && (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={theme.colors.primary[600]}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={theme.colors.primary[600]}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.main} />
            <XAxis stroke={theme.colors.text.secondary} />
            <YAxis stroke={theme.colors.text.secondary} />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.colors.background.paper,
                border: `1px solid ${theme.colors.border.main}`,
                color: theme.colors.text.primary,
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={theme.colors.primary[600]}
              fillOpacity={1}
              fill="url(#colorArea)"
            />
          </AreaChart>
        )}

        {type === 'bar' && (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.main} />
            <XAxis stroke={theme.colors.text.secondary} />
            <YAxis stroke={theme.colors.text.secondary} />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.colors.background.paper,
                border: `1px solid ${theme.colors.border.main}`,
                color: theme.colors.text.primary,
              }}
            />
            <Legend />
            <Bar dataKey={dataKey} fill={theme.colors.primary[600]} radius={[8, 8, 0, 0]} />
          </BarChart>
        )}

        {type === 'line' && (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.main} />
            <XAxis stroke={theme.colors.text.secondary} />
            <YAxis stroke={theme.colors.text.secondary} />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.colors.background.paper,
                border: `1px solid ${theme.colors.border.main}`,
                color: theme.colors.text.primary,
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={theme.colors.primary[600]}
              dot={{ fill: theme.colors.primary[600] }}
            />
          </LineChart>
        )}

        {type === 'pie' && (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={100}
              fill={theme.colors.primary[600]}
              dataKey={dataKey}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: theme.colors.background.paper,
                border: `1px solid ${theme.colors.border.main}`,
                color: theme.colors.text.primary,
              }}
            />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default MetricsChart;
