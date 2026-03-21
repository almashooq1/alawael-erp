

import { brandColors } from 'theme/palette';
import { Card, CardContent, Typography } from '@mui/material';

/** Sessions-by-category pie chart */
const SessionsPieChart = ({ sessionsByCategory }) => (
  <Card elevation={3}>
    <CardContent>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        توزيع الجلسات
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={sessionsByCategory}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={80}
            fill={brandColors.primaryStart}
            dataKey="value"
          >
            {sessionsByCategory.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <ChartTooltip />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default SessionsPieChart;
