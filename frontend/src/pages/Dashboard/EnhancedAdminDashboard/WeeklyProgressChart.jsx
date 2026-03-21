

import { statusColors } from 'theme/palette';

/** Weekly progress bar chart (scheduled vs completed) */
const WeeklyProgressChart = ({ weeklyProgress }) => (
  <Card elevation={3}>
    <CardContent>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        التقدم الأسبوعي
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={weeklyProgress}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <ChartTooltip />
          <Legend />
          <Bar dataKey="sessions" fill={statusColors.info} name="المجدولة" />
          <Bar dataKey="completed" fill={statusColors.success} name="المنجزة" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default WeeklyProgressChart;
