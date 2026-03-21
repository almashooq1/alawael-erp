/**
 * ChartsRow – Attendance pie + Department bar chart.
 */
import React from 'react';


import { statusColors } from '../../theme/palette';
import {
  Box,
  Grid,
  Paper,
  Typography
} from '@mui/material';

const ChartsRow = ({ attendanceChartData, departmentChartData }) => (
  <Grid container spacing={3} sx={{ mb: 3 }}>
    {/* Attendance Pie */}
    <Grid item xs={12} md={4}>
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}
      >
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          توزيع الحضور اليوم
        </Typography>
        {attendanceChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={attendanceChartData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {attendanceChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <RTooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
            <Typography color="text.secondary">لا توجد بيانات حضور</Typography>
          </Box>
        )}
      </Paper>
    </Grid>

    {/* Department Attendance Bar */}
    <Grid item xs={12} md={8}>
      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}
      >
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          حضور الأقسام
        </Typography>
        {departmentChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={departmentChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <RTooltip />
              <Legend />
              <Bar
                dataKey="present"
                fill={statusColors.success}
                name="حاضر"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="absent"
                fill={statusColors.error}
                name="غائب"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
            <Typography color="text.secondary">لا توجد بيانات</Typography>
          </Box>
        )}
      </Paper>
    </Grid>
  </Grid>
);

export default React.memo(ChartsRow);
